routerAdd(
  'POST',
  '/backend/v1/pilot-params/homologate',
  (e) => {
    const body = e.requestInfo().body || {}
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')

    const writeRejectedAudit = (reason) => {
      const rejectedAudit = new Record(auditLogs)
      rejectedAudit.set('actor_id', e.auth.id)
      rejectedAudit.set('action', 'pilot_param_homologate_rejected')
      rejectedAudit.set('resource', 'pilot_params')
      rejectedAudit.set('outcome', 'failure')
      rejectedAudit.set('details', { reason, source: 'server_pilot_param_homologate' })
      rejectedAudit.set('retention_days', 365)
      $app.save(rejectedAudit)
    }

    const reject = (reason, message) => {
      writeRejectedAudit(reason)
      return e.badRequestError(message)
    }

    const isIsoDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)

    const paramId = typeof body.id === 'string' ? body.id.trim() : ''
    if (!/^[a-z0-9]{15}$/.test(paramId)) {
      return reject('param_id_required', 'Informe o parâmetro a ser homologado.')
    }

    const role = e.auth.getString('role')
    if (role !== 'engenharia' && role !== 'admin') {
      return e.forbiddenError('Somente Engenharia ou Administrador podem homologar parâmetros.')
    }

    const value = typeof body.value === 'string' ? body.value.trim().slice(0, 200) : ''
    if (!value) {
      return reject('value_required', 'A homologação exige o valor decidido.')
    }

    const unit = typeof body.unit === 'string' ? body.unit.trim().slice(0, 40) : ''

    let param
    try {
      param = $app.findRecordById('pilot_params', paramId)
    } catch (_) {
      return reject('param_not_found', 'Parâmetro não encontrado.')
    }

    if (param.getString('decision') !== 'rascunho') {
      return reject('param_not_draft', 'Somente parâmetros em rascunho podem ser homologados.')
    }

    const homologatedAt = new Date().toISOString()

    $app.runInTransaction((txApp) => {
      const current = txApp.findRecordById('pilot_params', paramId)
      current.set('decision', 'homologado')
      current.set('value', value)
      current.set('unit', unit)
      current.set('homologated_by', e.auth.id)
      current.set('homologated_at', homologatedAt)
      txApp.save(current)

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'pilot_param_homologated')
      audit.set('resource', 'pilot_params/' + paramId)
      audit.set('outcome', 'success')
      audit.set('details', {
        paramType: current.getString('param_type'),
        family: current.getString('family'),
        value,
        homologatedAt,
        source: 'server_pilot_param_homologate',
      })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(200, { id: paramId, decision: 'homologado', homologatedAt })
  },
  $apis.requireAuth(),
)
