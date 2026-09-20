// T1.16 - revisão semanal server-side da qualidade dos registros de tempo e da comparabilidade da timeline.
routerAdd(
  'POST',
  '/backend/v1/time-quality/reviews',
  (e) => {
    const body = e.requestInfo().body || {}
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')

    const writeAudit = (action, outcome, details) => {
      const audit = new Record(auditLogs)
      audit.set('actor_id', e.auth.id)
      audit.set('action', action)
      audit.set('resource', 'time_quality_reviews')
      audit.set('outcome', outcome)
      audit.set('details', details)
      audit.set('retention_days', 365)
      $app.save(audit)
    }

    const reject = (reason, message) => {
      writeAudit('time_quality_review_rejected', 'failure', {
        reason,
        source: 'server_time_quality_review',
      })
      return e.badRequestError(message)
    }

    const isIsoDate = (value) => {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
      const parsed = new Date(value + 'T00:00:00.000Z')
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    }
    const parseMs = (value) => {
      const parsed = new Date(value).getTime()
      return Number.isNaN(parsed) ? null : parsed
    }
    const pushFinding = (findings, code, severity, count, description, sampleIds) => {
      if (count > 0) {
        findings.push({
          code,
          severity,
          count,
          description,
          sampleIds: sampleIds.slice(0, 20),
        })
      }
    }

    const weekStart = typeof body.week_start === 'string' ? body.week_start.trim() : ''
    const weekEnd = typeof body.week_end === 'string' ? body.week_end.trim() : ''
    const criteria = typeof body.criteria === 'string' ? body.criteria.trim() : ''

    if (!isIsoDate(weekStart) || !isIsoDate(weekEnd)) {
      return reject('window_invalid', 'Informe uma semana válida no formato AAAA-MM-DD.')
    }
    if (weekStart > weekEnd) {
      return reject('window_invalid', 'O início da semana não pode ser depois do fim.')
    }
    if (weekEnd > new Date().toISOString().slice(0, 10)) {
      return reject('window_future', 'A revisão não pode terminar no futuro.')
    }
    if (criteria.length < 10 || criteria.length > 4000) {
      return reject(
        'criteria_required',
        'Informe os critérios usados na revisão (entre 10 e 4000 caracteres).',
      )
    }

    const startIso = weekStart + 'T00:00:00.000Z'
    const endIso = weekEnd + 'T23:59:59.999Z'
    const startMs = parseMs(startIso)
    const endMs = parseMs(endIso)
    const findings = []
    const missingReceivedIds = []
    const retrodatedIds = []
    const outOfOrderIds = []
    const incompleteTimelineIds = []
    const nonComparableIds = []
    const openEntryIds = []
    const invalidEntryIds = []
    const invalidEntryOpportunityIds = []

    let opportunities = []
    try {
      opportunities = $app.findRecordsByFilter(
        'opportunities',
        'responsible_user_id = "' +
          e.auth.id +
          '" && received_at >= "' +
          startIso +
          '" && received_at <= "' +
          endIso +
          '"',
        '-received_at',
        500,
        0,
      )
    } catch (_) {
      opportunities = []
    }

    let allTimeEntries = []
    try {
      // Busca todos os registros do usuário e filtra em memória para incluir
      // intervalos iniciados antes da semana e encerrados dentro dela.
      allTimeEntries = $app.findRecordsByFilter(
        'active_time_entries',
        'user_id = "' + e.auth.id + '"',
        'started_at',
        5000,
        0,
      )
    } catch (_) {
      allTimeEntries = []
    }

    let openTimeEntries = 0
    let invalidTimeEntries = 0
    for (const entry of allTimeEntries) {
      const startedAt = parseMs(entry.getString('started_at'))
      const endedRaw = entry.getString('ended_at')
      const endedAt = endedRaw ? parseMs(endedRaw) : null
      const overlapsWindow =
        startedAt !== null &&
        startMs !== null &&
        endMs !== null &&
        startedAt <= endMs &&
        (endedAt === null || endedAt >= startMs)

      if (!overlapsWindow) continue

      const pauseReason = entry.getString('pause_reason').trim()
      if (!endedRaw) {
        openTimeEntries++
        openEntryIds.push(entry.id)
        continue
      }

      if (
        startedAt === null ||
        endedAt === null ||
        endedAt <= startedAt ||
        pauseReason.length < 3
      ) {
        invalidTimeEntries++
        invalidEntryIds.push(entry.id)
        invalidEntryOpportunityIds.push(entry.getString('opportunity_id'))
      }
    }

    let missingReceivedEvents = 0
    let retrodatedEvents = 0
    let outOfOrderTimelines = 0
    let incompleteTimelines = 0
    let nonComparableOpportunities = 0
    let eligibleBaselineOpportunities = 0

    const milestoneOrder = { received: 1, apt: 2, ready: 3, sent: 4 }
    for (const opportunity of opportunities) {
      let events = []
      try {
        events = $app.findRecordsByFilter(
          'opportunity_events',
          'opportunity_id = "' + opportunity.id + '"',
          'occurred_at',
          20,
          0,
        )
      } catch (_) {
        events = []
      }

      const byMilestone = {}
      let orderInvalid = false
      let previousOccurredAt = null
      let previousOrder = 0
      for (const event of events) {
        const occurredAt = parseMs(event.getString('occurred_at'))
        const milestone = event.getString('milestone')
        const currentOrder = milestoneOrder[milestone] || 0
        if (
          occurredAt === null ||
          (previousOccurredAt !== null && occurredAt < previousOccurredAt) ||
          (currentOrder > 0 && previousOrder > 0 && currentOrder < previousOrder)
        ) {
          orderInvalid = true
        }
        if (occurredAt !== null) previousOccurredAt = occurredAt
        if (currentOrder > 0) previousOrder = currentOrder
        if (occurredAt !== null && !byMilestone[milestone]) byMilestone[milestone] = occurredAt
      }

      if (!byMilestone.received) {
        missingReceivedEvents++
        missingReceivedIds.push(opportunity.id)
      }

      const opportunityCreatedAt = parseMs(opportunity.getString('created'))
      if (
        byMilestone.received !== undefined &&
        opportunityCreatedAt !== null &&
        byMilestone.received < opportunityCreatedAt
      ) {
        retrodatedEvents++
        retrodatedIds.push(opportunity.id)
      }

      if (orderInvalid) {
        outOfOrderTimelines++
        outOfOrderIds.push(opportunity.id)
      }

      if (!byMilestone.apt || !byMilestone.ready || !byMilestone.sent) {
        incompleteTimelines++
        incompleteTimelineIds.push(opportunity.id)
      }

      const serviceFamily = opportunity.getString('service_family').trim()
      const complexityClass = opportunity.getString('complexity_class').trim()
      let hasInvalidTime = false
      for (const invalidOpportunityId of invalidEntryOpportunityIds) {
        if (invalidOpportunityId === opportunity.id) {
          hasInvalidTime = true
          break
        }
      }
      // complexity_class ainda não existe na demanda: a revisão sinaliza a
      // lacuna e não inventa uma classe para liberar comparação.
      if (!serviceFamily || !complexityClass) {
        nonComparableOpportunities++
        nonComparableIds.push(opportunity.id)
      } else if (!orderInvalid && !hasInvalidTime && byMilestone.received && byMilestone.apt) {
        eligibleBaselineOpportunities++
      }
    }

    pushFinding(
      findings,
      'received_event_missing',
      'bloqueante',
      missingReceivedEvents,
      'Demanda dentro da janela sem marco recebida server-side.',
      missingReceivedIds,
    )
    pushFinding(
      findings,
      'timeline_not_ordered',
      'bloqueante',
      outOfOrderTimelines,
      'A timeline tem timestamp inválido ou ordem temporal inconsistente.',
      outOfOrderIds,
    )
    pushFinding(
      findings,
      'event_retrodated',
      'bloqueante',
      retrodatedEvents,
      'O marco recebida ocorreu antes da criação server-side da demanda.',
      retrodatedIds,
    )
    pushFinding(
      findings,
      'open_time_entry',
      'pendente',
      openTimeEntries,
      'Registro de tempo permaneceu aberto no fim da revisão e não entra em duração comparável.',
      openEntryIds,
    )
    pushFinding(
      findings,
      'invalid_time_entry',
      'bloqueante',
      invalidTimeEntries,
      'Registro de tempo tem intervalo inválido ou justificativa de pausa ausente.',
      invalidEntryIds,
    )
    pushFinding(
      findings,
      'incomplete_timeline',
      'pendente',
      incompleteTimelines,
      'A demanda ainda não possui todos os marcos recebida, apta, pronta e enviada.',
      incompleteTimelineIds,
    )
    pushFinding(
      findings,
      'complexity_not_persisted',
      'bloqueante',
      nonComparableOpportunities,
      'A demanda não possui classe de complexidade persistida; não foi classificada automaticamente.',
      nonComparableIds,
    )

    const reviewedOpportunities = opportunities.length
    const blockingFindings =
      missingReceivedEvents +
      outOfOrderTimelines +
      retrodatedEvents +
      invalidTimeEntries +
      nonComparableOpportunities
    const pendingFindings = openTimeEntries + incompleteTimelines
    const status =
      reviewedOpportunities === 0
        ? 'sem_amostra'
        : blockingFindings > 0 || pendingFindings > 0
          ? 'pendente'
          : 'aprovado'
    const decision =
      status === 'aprovado'
        ? 'Revisão aprovada para uso comparável na janela informada.'
        : status === 'sem_amostra'
          ? 'Sem amostra na janela; não liberar comparação.'
          : 'Não liberar comparação até tratar ou justificar os achados registrados.'
    const signedAt = new Date().toISOString()
    const summary = {
      weekStart,
      weekEnd,
      status,
      reviewedOpportunities,
      eligibleBaselineOpportunities,
      nonComparableOpportunities,
      openTimeEntries,
      invalidTimeEntries,
      missingReceivedEvents,
      retrodatedEvents,
      outOfOrderTimelines,
      incompleteTimelines,
      findings,
      criteria,
      decision,
      signedAt,
      reviewedBy: e.auth.id,
    }
    const signature = $security.sha256(JSON.stringify(summary))
    let reviewId = ''

    $app.runInTransaction((txApp) => {
      const review = new Record(txApp.findCollectionByNameOrId('time_quality_reviews'))
      review.set('week_start', weekStart)
      review.set('week_end', weekEnd)
      review.set('status', status)
      review.set('reviewed_opportunities', reviewedOpportunities)
      review.set('eligible_baseline_opportunities', eligibleBaselineOpportunities)
      review.set('non_comparable_opportunities', nonComparableOpportunities)
      review.set('open_time_entries', openTimeEntries)
      review.set('invalid_time_entries', invalidTimeEntries)
      review.set('missing_received_events', missingReceivedEvents)
      review.set('retrodated_events', retrodatedEvents)
      review.set('out_of_order_timelines', outOfOrderTimelines)
      review.set('incomplete_timelines', incompleteTimelines)
      review.set('findings', findings)
      review.set('criteria', criteria)
      review.set('decision', decision)
      review.set('signature', signature)
      review.set('signed_at', signedAt)
      review.set('created_by', e.auth.id)
      txApp.save(review)
      reviewId = review.id

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'time_quality_review_signed')
      audit.set('resource', 'time_quality_reviews/' + review.id)
      audit.set('outcome', status === 'aprovado' ? 'success' : 'failure')
      audit.set('details', {
        weekStart,
        weekEnd,
        status,
        reviewedOpportunities,
        eligibleBaselineOpportunities,
        findings: findings.map((item) => ({ code: item.code, count: item.count })),
        signature,
        source: 'server_time_quality_review',
      })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(201, {
      id: reviewId,
      weekStart,
      weekEnd,
      status,
      reviewedOpportunities,
      eligibleBaselineOpportunities,
      nonComparableOpportunities,
      openTimeEntries,
      invalidTimeEntries,
      missingReceivedEvents,
      retrodatedEvents,
      outOfOrderTimelines,
      incompleteTimelines,
      findings,
      criteria,
      decision,
      signedAt,
      reviewedBy: e.auth.id,
      signature,
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/time-quality/reviews',
  (e) => {
    const records = $app.findRecordsByFilter(
      'time_quality_reviews',
      'created_by = "' + e.auth.id + '"',
      '-signed_at',
      100,
      0,
    )
    const items = []
    for (const record of records) {
      let findings = []
      try {
        findings = JSON.parse(record.getString('findings') || '[]')
      } catch (_) {
        findings = []
      }
      items.push({
        id: record.id,
        weekStart: record.getString('week_start').slice(0, 10),
        weekEnd: record.getString('week_end').slice(0, 10),
        status: record.getString('status'),
        reviewedOpportunities: record.getInt('reviewed_opportunities'),
        eligibleBaselineOpportunities: record.getInt('eligible_baseline_opportunities'),
        nonComparableOpportunities: record.getInt('non_comparable_opportunities'),
        openTimeEntries: record.getInt('open_time_entries'),
        invalidTimeEntries: record.getInt('invalid_time_entries'),
        missingReceivedEvents: record.getInt('missing_received_events'),
        retrodatedEvents: record.getInt('retrodated_events'),
        outOfOrderTimelines: record.getInt('out_of_order_timelines'),
        incompleteTimelines: record.getInt('incomplete_timelines'),
        findings,
        criteria: record.getString('criteria'),
        decision: record.getString('decision'),
        signature: record.getString('signature'),
        signedAt: record.getString('signed_at'),
        createdBy: record.getString('created_by'),
      })
    }
    return e.json(200, { items })
  },
  $apis.requireAuth(),
)
