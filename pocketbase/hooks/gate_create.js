routerAdd(
  'POST',
  '/backend/v1/gates',
  (e) => {
    const body = e.requestInfo().body || {}
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')

    const writeRejectedAudit = (reason) => {
      const rejectedAudit = new Record(auditLogs)
      rejectedAudit.set('actor_id', e.auth.id)
      rejectedAudit.set('action', 'gate_rejected')
      rejectedAudit.set('resource', 'gates_ledger')
      rejectedAudit.set('outcome', 'failure')
      rejectedAudit.set('details', { reason, source: 'server_gate_create' })
      rejectedAudit.set('retention_days', 365)
      $app.save(rejectedAudit)
    }

    const reject = (reason, message) => {
      writeRejectedAudit(reason)
      return e.badRequestError(message)
    }

    const isIsoDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)

    const text = (value, max) =>
      typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max
        ? value.trim()
        : ''

    const title = text(body.title, 200)
    if (!title) return reject('title_required', 'Informe o título do bloqueio.')

    // RED-010: bloqueio sem dono é negado
    const owner = text(body.owner, 200)
    if (!owner) return reject('owner_required', 'O bloqueio exige dono registrado.')

    if (!isIsoDate(body.decision_deadline)) {
      return reject('deadline_required', 'O bloqueio exige data-limite de decisão.')
    }

    const description =
      typeof body.description === 'string' ? body.description.trim().slice(0, 1000) : ''

    let gateId = ''
    $app.runInTransaction((txApp) => {
      const collection = txApp.findCollectionByNameOrId('gates_ledger')
      const gate = new Record(collection)
      gate.set('title', title)
      gate.set('description', description)
      gate.set('owner', owner)
      gate.set('decision_deadline', body.decision_deadline)
      gate.set('status', 'aberto')
      gate.set('created_by', e.auth.id)
      txApp.save(gate)
      gateId = gate.id

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'gate_created')
      audit.set('resource', 'gates_ledger/' + gate.id)
      audit.set('outcome', 'success')
      audit.set('details', {
        title,
        owner,
        deadline: body.decision_deadline,
        source: 'server_gate_create',
      })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(201, { id: gateId, status: 'aberto' })
  },
  $apis.requireAuth(),
)
