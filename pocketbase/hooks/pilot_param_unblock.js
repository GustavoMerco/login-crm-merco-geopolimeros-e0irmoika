routerAdd(
  'POST',
  '/backend/v1/pilot-params/unblock',
  (e) => {
    const body = e.requestInfo().body || {}
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')

    const writeRejectedAudit = (reason) => {
      const rejectedAudit = new Record(auditLogs)
      rejectedAudit.set('actor_id', e.auth.id)
      rejectedAudit.set('action', 'pilot_param_unblock_rejected')
      rejectedAudit.set('resource', 'pilot_params')
      rejectedAudit.set('outcome', 'failure')
      rejectedAudit.set('details', { reason, source: 'server_pilot_param_unblock' })
      rejectedAudit.set('retention_days', 365)
      $app.save(rejectedAudit)
    }

    const reject = (reason, message) => {
      writeRejectedAudit(reason)
      return e.badRequestError(message)
    }

    const paramId = typeof body.id === 'string' ? body.id.trim() : ''
    if (!/^[a-z0-9]{15}$/.test(paramId)) {
      return reject('param_id_required', 'Informe o parâmetro a ser desbloqueado.')
    }

    const role = e.auth.getString('role')
    if (role !== 'engenharia' && role !== 'admin') {
      return e.forbiddenError('Somente Engenharia ou Administrador podem desbloquear parâmetros.')
    }

    let param
    try {
      param = $app.findRecordById('pilot_params', paramId)
    } catch (_) {
      return reject('param_not_found', 'Parâmetro não encontrado.')
    }

    if (param.getString('decision') !== 'bloqueado') {
      return reject('param_not_blocked', 'Somente parâmetros bloqueados podem voltar a rascunho.')
    }

    $app.runInTransaction((txApp) => {
      const current = txApp.findRecordById('pilot_params', paramId)
      current.set('decision', 'rascunho')
      current.set('blocked_reason', '')
      current.set('blocked_owner', '')
      current.set('blocked_deadline', '')
      txApp.save(current)

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'pilot_param_unblocked')
      audit.set('resource', 'pilot_params/' + paramId)
      audit.set('outcome', 'success')
      audit.set('details', {
        paramType: current.getString('param_type'),
        family: current.getString('family'),
        source: 'server_pilot_param_unblock',
      })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(200, { id: paramId, decision: 'rascunho' })
  },
  $apis.requireAuth(),
)
