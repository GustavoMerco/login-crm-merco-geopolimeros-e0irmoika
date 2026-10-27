routerAdd(
  'POST',
  '/backend/v1/units/homologate',
  (e) => {
    const body = e.requestInfo().body || {}
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')

    const writeRejectedAudit = (reason) => {
      const rejectedAudit = new Record(auditLogs)
      rejectedAudit.set('actor_id', e.auth.id)
      rejectedAudit.set('action', 'unit_homologate_rejected')
      rejectedAudit.set('resource', 'units')
      rejectedAudit.set('outcome', 'failure')
      rejectedAudit.set('details', { reason, source: 'server_units_homologate' })
      rejectedAudit.set('retention_days', 365)
      $app.save(rejectedAudit)
    }

    const reject = (reason, message) => {
      writeRejectedAudit(reason)
      return e.badRequestError(message)
    }

    const role = e.auth.getString('role')
    if (role !== 'engenharia' && role !== 'admin') {
      return e.forbiddenError('Somente Engenharia ou Administrador podem homologar unidades.')
    }

    const unitId = typeof body.id === 'string' ? body.id.trim() : ''
    if (!/^[a-z0-9]{15}$/.test(unitId)) {
      return reject('unit_id_required', 'Informe a unidade a ser homologada.')
    }

    let unit
    try {
      unit = $app.findRecordById('units', unitId)
    } catch (_) {
      return reject('unit_not_found', 'Unidade não encontrada.')
    }

    if (unit.getString('status') !== 'rascunho') {
      return reject(
        'unit_not_draft',
        'Somente unidade em rascunho pode ser homologada; unidade inativa exige nova unidade.',
      )
    }

    const homologatedAt = new Date().toISOString()

    $app.runInTransaction((txApp) => {
      const current = txApp.findRecordById('units', unitId)
      current.set('status', 'homologado')
      current.set('homologated_by', e.auth.id)
      current.set('homologated_at', homologatedAt)
      txApp.save(current)

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'unit_homologated')
      audit.set('resource', 'units/' + unitId)
      audit.set('outcome', 'success')
      audit.set('details', {
        code: current.getString('code'),
        dimension: current.getString('dimension'),
        homologatedAt: homologatedAt,
        source: 'server_units_homologate',
      })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(200, { id: unitId, status: 'homologado', homologatedAt: homologatedAt })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/units/deactivate',
  (e) => {
    const body = e.requestInfo().body || {}
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')

    const writeRejectedAudit = (reason) => {
      const rejectedAudit = new Record(auditLogs)
      rejectedAudit.set('actor_id', e.auth.id)
      rejectedAudit.set('action', 'unit_deactivate_rejected')
      rejectedAudit.set('resource', 'units')
      rejectedAudit.set('outcome', 'failure')
      rejectedAudit.set('details', { reason, source: 'server_units_deactivate' })
      rejectedAudit.set('retention_days', 365)
      $app.save(rejectedAudit)
    }

    const reject = (reason, message) => {
      writeRejectedAudit(reason)
      return e.badRequestError(message)
    }

    const role = e.auth.getString('role')
    if (role !== 'engenharia' && role !== 'admin') {
      return e.forbiddenError('Somente Engenharia ou Administrador podem inativar unidades.')
    }

    const unitId = typeof body.id === 'string' ? body.id.trim() : ''
    if (!/^[a-z0-9]{15}$/.test(unitId)) {
      return reject('unit_id_required', 'Informe a unidade a ser inativada.')
    }

    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 1000) : ''
    if (!reason) {
      return reject('reason_required', 'A inativação exige justificativa.')
    }

    let unit
    try {
      unit = $app.findRecordById('units', unitId)
    } catch (_) {
      return reject('unit_not_found', 'Unidade não encontrada.')
    }

    if (unit.getString('status') === 'inativo') {
      return reject('unit_already_inactive', 'Unidade já está inativa.')
    }

    $app.runInTransaction((txApp) => {
      const current = txApp.findRecordById('units', unitId)
      current.set('status', 'inativo')
      current.set('inactive_reason', reason)
      txApp.save(current)

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'unit_deactivated')
      audit.set('resource', 'units/' + unitId)
      audit.set('outcome', 'success')
      audit.set('details', {
        code: current.getString('code'),
        reason: reason,
        source: 'server_units_deactivate',
      })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(200, { id: unitId, status: 'inativo' })
  },
  $apis.requireAuth(),
)
