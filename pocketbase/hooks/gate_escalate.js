routerAdd(
  'POST',
  '/backend/v1/gates/escalate',
  (e) => {
    const body = e.requestInfo().body || {}
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')

    const writeRejectedAudit = (reason) => {
      const rejectedAudit = new Record(auditLogs)
      rejectedAudit.set('actor_id', e.auth.id)
      rejectedAudit.set('action', 'gate_escalate_rejected')
      rejectedAudit.set('resource', 'gates_ledger')
      rejectedAudit.set('outcome', 'failure')
      rejectedAudit.set('details', { reason, source: 'server_gate_escalate' })
      rejectedAudit.set('retention_days', 365)
      $app.save(rejectedAudit)
    }

    const reject = (reason, message) => {
      writeRejectedAudit(reason)
      return e.badRequestError(message)
    }

    const gateId = typeof body.id === 'string' ? body.id.trim() : ''
    if (!/^[a-z0-9]{15}$/.test(gateId)) {
      return reject('gate_id_required', 'Informe o gate a ser escalonado.')
    }

    const escalatedByName =
      typeof body.escalated_by_name === 'string' ? body.escalated_by_name.trim() : ''
    if (!escalatedByName || escalatedByName.length > 200) {
      return reject('escalated_by_required', 'Informe quem está escalando.')
    }

    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 1000) : ''

    let gate
    try {
      gate = $app.findRecordById('gates_ledger', gateId)
    } catch (_) {
      return reject('gate_not_found', 'Gate não encontrado.')
    }

    const status = gate.getString('status')
    if (status !== 'aberto') {
      return reject('gate_not_open', 'Somente gates abertos podem ser escalonados.')
    }

    // CA-1-17: atraso aciona escalonamento - só vencido pode ser escalonado
    const today = new Date().toISOString().slice(0, 10)
    const deadline = gate.getString('decision_deadline').slice(0, 10)
    if (deadline >= today) {
      return reject('gate_not_overdue', 'O gate só pode ser escalonado após a data-limite vencer.')
    }

    $app.runInTransaction((txApp) => {
      const current = txApp.findRecordById('gates_ledger', gateId)
      current.set('status', 'escalonado')
      txApp.save(current)

      const escalation = new Record(txApp.findCollectionByNameOrId('gate_escalations'))
      escalation.set('gate', gateId)
      escalation.set('escalated_by_name', escalatedByName)
      escalation.set('note', note)
      escalation.set('created_by', e.auth.id)
      txApp.save(escalation)

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'gate_escalated')
      audit.set('resource', 'gates_ledger/' + gateId)
      audit.set('outcome', 'success')
      audit.set('details', { escalatedByName, deadline, source: 'server_gate_escalate' })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(200, { id: gateId, status: 'escalonado' })
  },
  $apis.requireAuth(),
)
