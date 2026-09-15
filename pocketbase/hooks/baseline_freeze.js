routerAdd(
  'POST',
  '/backend/v1/baselines',
  (e) => {
    const body = e.requestInfo().body || {}
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')

    const writeRejectedAudit = (reason) => {
      const rejectedAudit = new Record(auditLogs)
      rejectedAudit.set('actor_id', e.auth.id)
      rejectedAudit.set('action', 'baseline_freeze_rejected')
      rejectedAudit.set('resource', 'baseline_snapshots')
      rejectedAudit.set('outcome', 'failure')
      rejectedAudit.set('details', { reason, source: 'server_baseline_freeze' })
      rejectedAudit.set('retention_days', 365)
      $app.save(rejectedAudit)
    }

    const reject = (reason, message) => {
      writeRejectedAudit(reason)
      return e.badRequestError(message)
    }

    const isIsoDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)

    const serviceFamily = typeof body.service_family === 'string' ? body.service_family.trim() : ''
    if (!serviceFamily || serviceFamily.length > 120) {
      return reject('service_family_required', 'Informe a família de serviço do baseline.')
    }

    const complexityClass =
      typeof body.complexity_class === 'string' ? body.complexity_class.trim() : ''
    if (!complexityClass || complexityClass.length > 120) {
      return reject('complexity_class_required', 'Informe a classe de complexidade do baseline.')
    }

    if (!isIsoDate(body.window_start) || !isIsoDate(body.window_end)) {
      return reject('window_invalid', 'Informe a janela do baseline no formato válido.')
    }
    if (body.window_start > body.window_end) {
      return reject('window_invalid', 'O início da janela não pode ser depois do fim.')
    }
    if (body.window_end > new Date().toISOString().slice(0, 10)) {
      return reject('window_future', 'A janela do baseline não pode terminar no futuro.')
    }

    const calendar = typeof body.calendar === 'string' ? body.calendar.trim() : ''
    if (!calendar || calendar.length > 120) {
      return reject(
        'calendar_required',
        'Informe o calendário usado na medição (ex.: dias úteis 8h).',
      )
    }

    const reliabilityCriteria =
      typeof body.reliability_criteria === 'string' ? body.reliability_criteria.trim() : ''
    if (reliabilityCriteria.length < 10 || reliabilityCriteria.length > 2000) {
      return reject(
        'reliability_criteria_required',
        'Os critérios de confiabilidade são obrigatórios (entre 10 e 2000 caracteres).',
      )
    }

    const freezeReason = typeof body.freeze_reason === 'string' ? body.freeze_reason.trim() : ''
    if (freezeReason.length < 10 || freezeReason.length > 1000) {
      return reject(
        'freeze_reason_required',
        'O motivo do congelamento é obrigatório (entre 10 e 1000 caracteres).',
      )
    }

    // Idempotência (RNF-11): mesma família + classe + janela retorna o snapshot existente.
    // Datas armazenadas incluem sufixo de tempo, então os limites usam formato completo.
    const existing = $app.findRecordsByFilter(
      'baseline_snapshots',
      'created_by = "' +
        e.auth.id +
        '" && service_family = "' +
        serviceFamily.replace(/"/g, '') +
        '" && complexity_class = "' +
        complexityClass.replace(/"/g, '') +
        '" && window_start >= "' +
        body.window_start +
        ' 00:00:00.000Z" && window_end <= "' +
        body.window_end +
        ' 23:59:59.999Z"',
      '',
      1,
      0,
    )
    if (existing.length > 0) {
      const found = existing[0]
      return e.json(200, {
        id: found.id,
        frozenAt: found.getString('frozen_at'),
        volume: found.getInt('volume'),
        receivedToAptMs: found.getInt('received_to_apt_ms'),
        aptToReadyMs: found.getInt('apt_to_ready_ms'),
        readyToSentMs: found.getInt('ready_to_sent_ms'),
        activeTimeMs: found.getInt('active_time_ms'),
        alreadyFrozen: true,
      })
    }

    // Agrega a timeline real das oportunidades do autor na janela informada.
    const opportunities = $app.findRecordsByFilter(
      'opportunities',
      'responsible_user_id = "' +
        e.auth.id +
        '" && received_at >= "' +
        body.window_start +
        '" && received_at <= "' +
        body.window_end +
        ' 23:59:59.999Z"',
      '-received_at',
      500,
      0,
    )

    const milestonesByOpportunity = {}
    const timeEntries = $app.findRecordsByFilter(
      'active_time_entries',
      'user_id = "' +
        e.auth.id +
        '" && started_at >= "' +
        body.window_start +
        '" && started_at <= "' +
        body.window_end +
        ' 23:59:59.999Z"',
      '',
      500,
      0,
    )

    let activeTimeMs = 0
    for (const entry of timeEntries) {
      const startedAt = new Date(entry.getString('started_at')).getTime()
      const endedRaw = entry.getString('ended_at')
      if (!endedRaw) continue
      const endedAt = new Date(endedRaw).getTime()
      if (!Number.isNaN(startedAt) && !Number.isNaN(endedAt) && endedAt > startedAt) {
        activeTimeMs += endedAt - startedAt
      }
    }

    const parseMs = (value) => {
      const time = new Date(value).getTime()
      return Number.isNaN(time) ? null : time
    }

    let receivedToAptTotal = 0
    let receivedToAptCount = 0
    let aptToReadyTotal = 0
    let aptToReadyCount = 0
    let readyToSentTotal = 0
    let readyToSentCount = 0

    for (const opportunity of opportunities) {
      const opportunityId = opportunity.id
      let events
      try {
        events = $app.findRecordsByFilter(
          'opportunity_events',
          'opportunity_id = "' + opportunityId + '"',
          'occurred_at',
          10,
          0,
        )
      } catch (_) {
        events = []
      }

      const byMilestone = {}
      for (const event of events) {
        const milestone = event.getString('milestone')
        if (!byMilestone[milestone]) {
          byMilestone[milestone] = parseMs(event.getString('occurred_at'))
        }
      }
      milestonesByOpportunity[opportunityId] = byMilestone

      if (byMilestone.received && byMilestone.apt && byMilestone.apt >= byMilestone.received) {
        receivedToAptTotal += byMilestone.apt - byMilestone.received
        receivedToAptCount++
      }
      if (byMilestone.apt && byMilestone.ready && byMilestone.ready >= byMilestone.apt) {
        aptToReadyTotal += byMilestone.ready - byMilestone.apt
        aptToReadyCount++
      }
      if (byMilestone.ready && byMilestone.sent && byMilestone.sent >= byMilestone.ready) {
        readyToSentTotal += byMilestone.sent - byMilestone.ready
        readyToSentCount++
      }
    }

    // Médias em ms; 0 quando não há amostra elegível na janela (RN-03: ausência não vira valor falso).
    const avg = (total, count) => (count > 0 ? Math.round(total / count) : 0)
    const frozenAt = new Date().toISOString()

    let snapshotId = ''
    $app.runInTransaction((txApp) => {
      const collection = txApp.findCollectionByNameOrId('baseline_snapshots')
      const snapshot = new Record(collection)
      snapshot.set('service_family', serviceFamily)
      snapshot.set('complexity_class', complexityClass)
      snapshot.set('window_start', body.window_start)
      snapshot.set('window_end', body.window_end)
      snapshot.set('frozen_at', frozenAt)
      snapshot.set('calendar', calendar)
      snapshot.set('volume', opportunities.length)
      snapshot.set('received_to_apt_ms', avg(receivedToAptTotal, receivedToAptCount))
      snapshot.set('apt_to_ready_ms', avg(aptToReadyTotal, aptToReadyCount))
      snapshot.set('ready_to_sent_ms', avg(readyToSentTotal, readyToSentCount))
      snapshot.set('active_time_ms', activeTimeMs)
      snapshot.set('reliability_criteria', reliabilityCriteria)
      snapshot.set('freeze_reason', freezeReason)
      snapshot.set('created_by', e.auth.id)
      txApp.save(snapshot)
      snapshotId = snapshot.id

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'baseline_frozen')
      audit.set('resource', 'baseline_snapshots/' + snapshot.id)
      audit.set('outcome', 'success')
      audit.set('details', {
        serviceFamily,
        complexityClass,
        windowStart: body.window_start,
        windowEnd: body.window_end,
        volume: opportunities.length,
        source: 'server_baseline_freeze',
      })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(201, {
      id: snapshotId,
      frozenAt,
      volume: opportunities.length,
      receivedToAptMs: avg(receivedToAptTotal, receivedToAptCount),
      aptToReadyMs: avg(aptToReadyTotal, aptToReadyCount),
      readyToSentMs: avg(readyToSentTotal, readyToSentCount),
      activeTimeMs,
      alreadyFrozen: false,
    })
  },
  $apis.requireAuth(),
)
