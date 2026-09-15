routerAdd(
  'POST',
  '/backend/v1/opportunities/milestone',
  (e) => {
    const body = e.requestInfo().body || {}
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')

    const writeRejectedAudit = (reason) => {
      const rejectedAudit = new Record(auditLogs)
      rejectedAudit.set('actor_id', e.auth.id)
      rejectedAudit.set('action', 'opportunity_milestone_rejected')
      rejectedAudit.set('resource', 'opportunities')
      rejectedAudit.set('outcome', 'failure')
      rejectedAudit.set('details', { reason, source: 'server_milestone' })
      rejectedAudit.set('retention_days', 365)
      $app.save(rejectedAudit)
    }

    const reject = (reason, message) => {
      writeRejectedAudit(reason)
      return e.badRequestError(message)
    }

    const opportunityId = typeof body.opportunity_id === 'string' ? body.opportunity_id.trim() : ''
    if (!/^[a-z0-9]{15}$/.test(opportunityId)) {
      return reject('opportunity_id_required', 'Informe a oportunidade do marco.')
    }

    const milestone = typeof body.milestone === 'string' ? body.milestone.trim() : ''
    if (milestone !== 'ready' && milestone !== 'sent') {
      return reject('milestone_invalid', 'Marco inválido; use ready ou sent.')
    }

    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : ''

    let opportunity
    try {
      opportunity = $app.findRecordById('opportunities', opportunityId)
    } catch (_) {
      return reject('opportunity_not_found', 'Oportunidade não encontrada.')
    }

    if (opportunity.getString('responsible_user_id') !== e.auth.id) {
      return e.forbiddenError('Somente o responsável pode registrar marcos desta oportunidade.')
    }

    const existing = $app.findRecordsByFilter(
      'opportunity_events',
      'opportunity_id = "' + opportunityId + '"',
      '',
      50,
      0,
    )
    const has = (target) => {
      for (const item of existing) {
        if (item.getString('milestone') === target) return true
      }
      return false
    }

    if (has(milestone)) {
      return reject('milestone_duplicated', 'O marco ' + milestone + ' já foi registrado.')
    }

    if (milestone === 'ready' && !has('received')) {
      return reject('milestone_sequence', 'A oportunidade ainda não foi recebida.')
    }
    if (milestone === 'sent' && !has('ready')) {
      return reject('milestone_sequence', 'O marco enviada exige o marco pronta registrado antes.')
    }

    if (milestone === 'ready') {
      const sheets = $app.findRecordsByFilter(
        'tech_sheets',
        'opportunity_id = "' + opportunityId + '"',
        '',
        1,
        0,
      )
      if (sheets.length === 0) {
        return reject(
          'tech_sheet_required',
          'Registre ao menos uma versão da ficha técnica antes de marcar pronta.',
        )
      }
    }

    const occurredAt = new Date().toISOString()
    let eventId = ''

    $app.runInTransaction((txApp) => {
      const events = txApp.findCollectionByNameOrId('opportunity_events')
      const event = new Record(events)
      event.set('opportunity_id', opportunityId)
      event.set('milestone', milestone)
      event.set('note', note)
      event.set('occurred_at', occurredAt)
      event.set('created_by', e.auth.id)
      txApp.save(event)
      eventId = event.id

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'opportunity_milestone_recorded')
      audit.set('resource', 'opportunities/' + opportunityId)
      audit.set('outcome', 'success')
      audit.set('details', { milestone, occurredAt, source: 'server_milestone' })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(201, { id: eventId, opportunityId, milestone, occurredAt })
  },
  $apis.requireAuth(),
)
