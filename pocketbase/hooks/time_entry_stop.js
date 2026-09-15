routerAdd(
  'POST',
  '/backend/v1/opportunities/time/stop',
  (e) => {
    const body = e.requestInfo().body || {}
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')

    const writeRejectedAudit = (reason) => {
      const rejectedAudit = new Record(auditLogs)
      rejectedAudit.set('actor_id', e.auth.id)
      rejectedAudit.set('action', 'time_entry_stop_rejected')
      rejectedAudit.set('resource', 'active_time_entries')
      rejectedAudit.set('outcome', 'failure')
      rejectedAudit.set('details', { reason, source: 'server_time_entry' })
      rejectedAudit.set('retention_days', 365)
      $app.save(rejectedAudit)
    }

    const reject = (reason, message) => {
      writeRejectedAudit(reason)
      return e.badRequestError(message)
    }

    const entryId = typeof body.id === 'string' ? body.id.trim() : ''
    if (!/^[a-z0-9]{15}$/.test(entryId)) {
      return reject('entry_id_required', 'Informe o registro de tempo a ser encerrado.')
    }

    const pauseReason = typeof body.pause_reason === 'string' ? body.pause_reason.trim() : ''
    if (pauseReason.length < 3 || pauseReason.length > 500) {
      return reject(
        'pause_reason_required',
        'A justificativa da pausa é obrigatória (entre 3 e 500 caracteres).',
      )
    }

    let entry
    try {
      entry = $app.findRecordById('active_time_entries', entryId)
    } catch (_) {
      return reject('entry_not_found', 'Registro de tempo não encontrado.')
    }

    if (entry.getString('user_id') !== e.auth.id) {
      return e.forbiddenError('Somente o dono do registro pode encerrá-lo.')
    }

    if (entry.getString('ended_at')) {
      return reject('entry_already_ended', 'Este registro de tempo já foi encerrado.')
    }

    const endedAt = new Date().toISOString()

    $app.runInTransaction((txApp) => {
      const current = txApp.findRecordById('active_time_entries', entryId)
      current.set('ended_at', endedAt)
      current.set('pause_reason', pauseReason)
      txApp.save(current)

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'time_entry_stopped')
      audit.set('resource', 'active_time_entries/' + entryId)
      audit.set('outcome', 'success')
      audit.set('details', { endedAt, source: 'server_time_entry' })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(200, { id: entryId, endedAt, pauseReason })
  },
  $apis.requireAuth(),
)
