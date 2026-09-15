routerAdd(
  'POST',
  '/backend/v1/source-audits/decide',
  (e) => {
    const body = e.requestInfo().body || {}
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')

    const writeRejectedAudit = (reason) => {
      const rejectedAudit = new Record(auditLogs)
      rejectedAudit.set('actor_id', e.auth.id)
      rejectedAudit.set('action', 'source_audit_decide_rejected')
      rejectedAudit.set('resource', 'source_audits')
      rejectedAudit.set('outcome', 'failure')
      rejectedAudit.set('details', { reason, source: 'server_source_audit_decide' })
      rejectedAudit.set('retention_days', 365)
      $app.save(rejectedAudit)
    }

    const reject = (reason, message) => {
      writeRejectedAudit(reason)
      return e.badRequestError(message)
    }

    const isIsoDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)

    const auditId = typeof body.id === 'string' ? body.id.trim() : ''
    if (!/^[a-z0-9]{15}$/.test(auditId)) {
      return reject('audit_id_required', 'Informe a auditoria a ser atualizada.')
    }

    const role = e.auth.getString('role')
    if (role !== 'engenharia' && role !== 'admin') {
      return e.forbiddenError(
        'Somente Engenharia ou Administrador podem alterar a decisão de fonte.',
      )
    }

    const decision = typeof body.decision === 'string' ? body.decision.trim() : ''
    if (!['integrar', 'importar', 'nao_usar'].includes(decision)) {
      return reject('decision_invalid', 'Decisão inválida; use integrar, importar ou nao_usar.')
    }

    const decisionReason =
      typeof body.decision_reason === 'string' ? body.decision_reason.trim() : ''
    if (decisionReason.length < 10 || decisionReason.length > 1000) {
      return reject(
        'decision_reason_required',
        'A nova decisão exige justificativa (entre 10 e 1000 caracteres).',
      )
    }

    const decisionOwner = typeof body.decision_owner === 'string' ? body.decision_owner.trim() : ''
    if (!decisionOwner || decisionOwner.length > 200) {
      return reject('decision_owner_required', 'A nova decisão exige dono.')
    }

    if (!isIsoDate(body.decision_date)) {
      return reject('decision_date_required', 'A nova decisão exige data.')
    }

    let sourceAudit
    try {
      sourceAudit = $app.findRecordById('source_audits', auditId)
    } catch (_) {
      return reject('audit_not_found', 'Auditoria não encontrada.')
    }

    // Histórico preservado: a decisão anterior vai para o campo de lacunas/observações
    // como registro append-only (a coleção não permite update/delete via API).
    const previousDecision =
      'Decisão anterior (' +
      sourceAudit.getString('decision_date').slice(0, 10) +
      '): ' +
      sourceAudit.getString('decision') +
      ' - ' +
      sourceAudit.getString('decision_reason')

    $app.runInTransaction((txApp) => {
      const current = txApp.findRecordById('source_audits', auditId)
      const history = current.getString('gaps')
      current.set('decision', decision)
      current.set('decision_reason', decisionReason)
      current.set('decision_owner', decisionOwner)
      current.set('decision_date', body.decision_date)
      current.set('gaps', history ? history + '\n' + previousDecision : previousDecision)
      txApp.save(current)

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'source_audit_decision_updated')
      audit.set('resource', 'source_audits/' + auditId)
      audit.set('outcome', 'success')
      audit.set('details', { decision, decisionOwner, source: 'server_source_audit_decide' })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(200, { id: auditId, decision })
  },
  $apis.requireAuth(),
)
