routerAdd(
  'POST',
  '/backend/v1/gates/resolve',
  (e) => {
    const body = e.requestInfo().body || {}
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')

    const writeRejectedAudit = (reason) => {
      const rejectedAudit = new Record(auditLogs)
      rejectedAudit.set('actor_id', e.auth.id)
      rejectedAudit.set('action', 'gate_resolve_rejected')
      rejectedAudit.set('resource', 'gates_ledger')
      rejectedAudit.set('outcome', 'failure')
      rejectedAudit.set('details', { reason, source: 'server_gate_resolve' })
      rejectedAudit.set('retention_days', 365)
      $app.save(rejectedAudit)
    }

    const reject = (reason, message) => {
      writeRejectedAudit(reason)
      return e.badRequestError(message)
    }

    const gateId = typeof body.id === 'string' ? body.id.trim() : ''
    if (!/^[a-z0-9]{15}$/.test(gateId)) {
      return reject('gate_id_required', 'Informe o gate a ser resolvido.')
    }

    const role = e.auth.getString('role')
    if (role !== 'engenharia' && role !== 'admin') {
      return e.forbiddenError('Somente Engenharia ou Administrador podem resolver gates.')
    }

    const resolution = typeof body.resolution === 'string' ? body.resolution.trim() : ''
    if (resolution.length < 10 || resolution.length > 1000) {
      return reject(
        'resolution_required',
        'A decisão de resolução é obrigatória (entre 10 e 1000 caracteres).',
      )
    }

    let gate
    try {
      gate = $app.findRecordById('gates_ledger', gateId)
    } catch (_) {
      return reject('gate_not_found', 'Gate não encontrado.')
    }

    if (gate.getString('status') === 'resolvido') {
      return reject('gate_already_resolved', 'Este gate já está resolvido.')
    }

    const resolvedAt = new Date().toISOString()

    $app.runInTransaction((txApp) => {
      const current = txApp.findRecordById('gates_ledger', gateId)
      current.set('status', 'resolvido')
      current.set('resolution', resolution)
      current.set('resolved_by', e.auth.id)
      current.set('resolved_at', resolvedAt)
      txApp.save(current)

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'gate_resolved')
      audit.set('resource', 'gates_ledger/' + gateId)
      audit.set('outcome', 'success')
      audit.set('details', { resolution, resolvedAt, source: 'server_gate_resolve' })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(200, { id: gateId, status: 'resolvido', resolvedAt })
  },
  $apis.requireAuth(),
)
