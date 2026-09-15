routerAdd(
  'POST',
  '/backend/v1/source-audits',
  (e) => {
    const body = e.requestInfo().body || {}
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')

    const writeRejectedAudit = (reason) => {
      const rejectedAudit = new Record(auditLogs)
      rejectedAudit.set('actor_id', e.auth.id)
      rejectedAudit.set('action', 'source_audit_rejected')
      rejectedAudit.set('resource', 'source_audits')
      rejectedAudit.set('outcome', 'failure')
      rejectedAudit.set('details', { reason, source: 'server_source_audit_create' })
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

    const system = typeof body.system === 'string' ? body.system.trim() : ''
    if (!['vobi', 'omie'].includes(system)) {
      return reject('system_invalid', 'Sistema inválido; use vobi ou omie.')
    }

    // RED-011: auditoria incompleta é negada
    const coverage = text(body.coverage, 1000)
    if (!coverage) return reject('coverage_required', 'Informe a cobertura do sistema.')

    const sourceOfTruth = text(body.source_of_truth, 500)
    if (!sourceOfTruth) {
      return reject('source_of_truth_required', 'Informe a fonte de verdade por tipo de dado.')
    }

    const accessMethod = typeof body.access_method === 'string' ? body.access_method.trim() : ''
    if (!['manual', 'exportacao', 'api'].includes(accessMethod)) {
      return reject(
        'access_method_invalid',
        'Forma de acesso inválida; use manual, exportacao ou api.',
      )
    }

    const decision = typeof body.decision === 'string' ? body.decision.trim() : ''
    if (!['integrar', 'importar', 'nao_usar'].includes(decision)) {
      return reject('decision_invalid', 'Decisão inválida; use integrar, importar ou nao_usar.')
    }

    const decisionReason = text(body.decision_reason, 1000)
    if (!decisionReason) {
      return reject('decision_reason_required', 'A decisão de fonte exige justificativa.')
    }

    const decisionOwner = text(body.decision_owner, 200)
    if (!decisionOwner) {
      return reject('decision_owner_required', 'A decisão de fonte exige dono.')
    }

    if (!isIsoDate(body.decision_date)) {
      return reject('decision_date_required', 'A decisão de fonte exige data.')
    }

    const fieldsAvailable =
      typeof body.fields_available === 'string' ? body.fields_available.trim().slice(0, 2000) : ''
    const gaps = typeof body.gaps === 'string' ? body.gaps.trim().slice(0, 2000) : ''

    let auditId = ''
    $app.runInTransaction((txApp) => {
      const collection = txApp.findCollectionByNameOrId('source_audits')
      const sourceAudit = new Record(collection)
      sourceAudit.set('system', system)
      sourceAudit.set('coverage', coverage)
      sourceAudit.set('source_of_truth', sourceOfTruth)
      sourceAudit.set('access_method', accessMethod)
      sourceAudit.set('fields_available', fieldsAvailable)
      sourceAudit.set('gaps', gaps)
      sourceAudit.set('decision', decision)
      sourceAudit.set('decision_reason', decisionReason)
      sourceAudit.set('decision_owner', decisionOwner)
      sourceAudit.set('decision_date', body.decision_date)
      sourceAudit.set('created_by', e.auth.id)
      txApp.save(sourceAudit)
      auditId = sourceAudit.id

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'source_audit_created')
      audit.set('resource', 'source_audits/' + sourceAudit.id)
      audit.set('outcome', 'success')
      audit.set('details', { system, decision, accessMethod, source: 'server_source_audit_create' })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(201, { id: auditId, system, decision })
  },
  $apis.requireAuth(),
)
