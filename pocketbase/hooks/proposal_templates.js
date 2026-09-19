// T1.13 - registro de modelo real de proposta via upload nativo PocketBase.
// Toda lógica inline no callback: JSVM não expõe declarações top-level.
onRecordCreateRequest(
  (e) => {
    const record = e.record
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')

    const reject = (reason, message) => {
      const rejectedAudit = new Record(auditLogs)
      rejectedAudit.set('actor_id', e.auth.id)
      rejectedAudit.set('action', 'proposal_template_rejected')
      rejectedAudit.set('resource', 'proposal_templates')
      rejectedAudit.set('outcome', 'failure')
      rejectedAudit.set('details', { reason, source: 'server_proposal_template_create' })
      rejectedAudit.set('retention_days', 365)
      $app.save(rejectedAudit)
      return e.badRequestError(message)
    }

    const family = (record.getString('family') || '').trim()
    if (!family) return reject('family_required', 'Informe a família do modelo.')

    const name = (record.getString('name') || '').trim()
    if (!name) return reject('name_required', 'Informe o nome do modelo.')

    // Nenhum modelo nasce aprovado: aprovação é decisão server-side de Engenharia/Admin.
    record.set('status', 'rascunho')
    record.set('version', 1)
    record.set('created_by', e.auth.id)

    const rawFields = record.getString('variable_fields') || ''
    if (rawFields) {
      try {
        JSON.parse(rawFields)
      } catch (_) {
        return reject('variable_fields_invalid', 'Campos variáveis devem ser JSON válido.')
      }
    }

    e.next()

    $app.runInTransaction((txApp) => {
      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'proposal_template_created')
      audit.set('resource', 'proposal_templates/' + record.id)
      audit.set('outcome', 'success')
      audit.set('details', {
        family,
        name,
        status: 'rascunho',
        source: 'server_proposal_template_create',
      })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })
  },
  'proposal_templates',
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/proposal-templates/approve',
  (e) => {
    const body = e.requestInfo().body || {}
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')

    const reject = (reason, message) => {
      const rejectedAudit = new Record(auditLogs)
      rejectedAudit.set('actor_id', e.auth.id)
      rejectedAudit.set('action', 'proposal_template_approve_rejected')
      rejectedAudit.set('resource', 'proposal_templates')
      rejectedAudit.set('outcome', 'failure')
      rejectedAudit.set('details', { reason, source: 'server_proposal_template_approve' })
      rejectedAudit.set('retention_days', 365)
      $app.save(rejectedAudit)
      return e.badRequestError(message)
    }

    const templateId = typeof body.id === 'string' ? body.id.trim() : ''
    if (!/^[a-z0-9]{15}$/.test(templateId))
      return reject('template_id_required', 'Informe o modelo a ser aprovado.')

    const role = e.auth.getString('role')
    if (role !== 'engenharia' && role !== 'admin') {
      return e.forbiddenError(
        'Somente Engenharia ou Administrador podem aprovar o modelo de proposta.',
      )
    }

    let template
    try {
      template = $app.findRecordById('proposal_templates', templateId)
    } catch (_) {
      return reject('template_not_found', 'Modelo não encontrado.')
    }

    if (template.getString('status') !== 'rascunho')
      return reject('template_not_draft', 'Somente modelos em rascunho podem ser aprovados.')

    const approvedAt = new Date().toISOString()
    $app.runInTransaction((txApp) => {
      const current = txApp.findRecordById('proposal_templates', templateId)
      current.set('status', 'aprovado')
      current.set('approved_by', e.auth.id)
      current.set('approved_at', approvedAt)
      txApp.save(current)

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'proposal_template_approved')
      audit.set('resource', 'proposal_templates/' + templateId)
      audit.set('outcome', 'success')
      audit.set('details', { approvedAt, source: 'server_proposal_template_approve' })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(200, { id: templateId, status: 'aprovado', approvedAt })
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/proposal-templates/approved',
  (e) => {
    const query = e.requestInfo().query || {}
    const family = typeof query.family === 'string' ? query.family.trim().replace(/"/g, '') : ''
    let filter = 'status = "aprovado"'
    if (family) filter += ' && family = "' + family + '"'

    const templates = $app.findRecordsByFilter('proposal_templates', filter, '-version', 50, 0)
    const items = []
    for (const t of templates) {
      const version = parseInt(t.getString('version') || '1', 10)
      items.push({
        id: t.id,
        family: t.getString('family'),
        name: t.getString('name'),
        modelNumber: t.getString('model_number'),
        version: Number.isFinite(version) ? version : 1,
        fileUrl: '/api/files/proposal_templates/' + t.id + '/' + t.getString('file'),
        approvedAt: t.getString('approved_at'),
      })
    }
    return e.json(200, { items })
  },
  $apis.requireAuth(),
)
