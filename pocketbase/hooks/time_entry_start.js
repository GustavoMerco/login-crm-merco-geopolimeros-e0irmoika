routerAdd(
  'POST',
  '/backend/v1/opportunities/time/start',
  (e) => {
    const body = e.requestInfo().body || {}
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')

    const writeRejectedAudit = (reason) => {
      const rejectedAudit = new Record(auditLogs)
      rejectedAudit.set('actor_id', e.auth.id)
      rejectedAudit.set('action', 'time_entry_start_rejected')
      rejectedAudit.set('resource', 'opportunities')
      rejectedAudit.set('outcome', 'failure')
      rejectedAudit.set('details', { reason, source: 'server_time_entry' })
      rejectedAudit.set('retention_days', 365)
      $app.save(rejectedAudit)
    }

    const reject = (reason, message) => {
      writeRejectedAudit(reason)
      return e.badRequestError(message)
    }

    const opportunityId = typeof body.opportunity_id === 'string' ? body.opportunity_id.trim() : ''
    if (!/^[a-z0-9]{15}$/.test(opportunityId)) {
      return reject('opportunity_id_required', 'Informe a oportunidade do registro de tempo.')
    }

    const stage = typeof body.stage === 'string' ? body.stage.trim() : ''
    const validStages = ['qualificacao', 'portal', 'ficha_tecnica', 'revisao', 'outro']
    if (!validStages.includes(stage)) {
      return reject('stage_invalid', 'Etapa inválida.')
    }

    let opportunity
    try {
      opportunity = $app.findRecordById('opportunities', opportunityId)
    } catch (_) {
      return reject('opportunity_not_found', 'Oportunidade não encontrada.')
    }

    if (opportunity.getString('responsible_user_id') !== e.auth.id) {
      return e.forbiddenError('Somente o responsável pode registrar tempo nesta oportunidade.')
    }

    const open = $app.findRecordsByFilter(
      'active_time_entries',
      'user_id = "' + e.auth.id + '" && ended_at = ""',
      '',
      1,
      0,
    )
    if (open.length > 0) {
      return reject(
        'time_entry_open',
        'Você já possui um registro de tempo em andamento; encerre-o antes de iniciar outro.',
      )
    }

    const startedAt = new Date().toISOString()
    let entryId = ''

    $app.runInTransaction((txApp) => {
      const entries = txApp.findCollectionByNameOrId('active_time_entries')
      const entry = new Record(entries)
      entry.set('opportunity_id', opportunityId)
      entry.set('user_id', e.auth.id)
      entry.set('stage', stage)
      entry.set('started_at', startedAt)
      txApp.save(entry)
      entryId = entry.id

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'time_entry_started')
      audit.set('resource', 'opportunities/' + opportunityId)
      audit.set('outcome', 'success')
      audit.set('details', { stage, startedAt, source: 'server_time_entry' })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(201, { id: entryId, opportunityId, stage, startedAt })
  },
  $apis.requireAuth(),
)
