routerAdd(
  'POST',
  '/backend/v1/catalog/homologate',
  (e) => {
    const body = e.requestInfo().body || {}
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')

    const writeRejectedAudit = (reason) => {
      const rejectedAudit = new Record(auditLogs)
      rejectedAudit.set('actor_id', e.auth.id)
      rejectedAudit.set('action', 'catalog_homologate_rejected')
      rejectedAudit.set('resource', 'catalog_items')
      rejectedAudit.set('outcome', 'failure')
      rejectedAudit.set('details', { reason, source: 'server_catalog_homologate' })
      rejectedAudit.set('retention_days', 365)
      $app.save(rejectedAudit)
    }

    const reject = (reason, message) => {
      writeRejectedAudit(reason)
      return e.badRequestError(message)
    }

    const itemId = typeof body.id === 'string' ? body.id.trim() : ''
    if (!/^[a-z0-9]{15}$/.test(itemId)) {
      return reject('item_id_required', 'Informe o item a ser homologado.')
    }

    const role = e.auth.getString('role')
    if (role !== 'engenharia' && role !== 'admin') {
      return e.forbiddenError(
        'Somente Engenharia ou Administrador podem homologar itens do catálogo.',
      )
    }

    let item
    try {
      item = $app.findRecordById('catalog_items', itemId)
    } catch (_) {
      return reject('item_not_found', 'Item do catálogo não encontrado.')
    }

    if (item.getString('status') !== 'rascunho') {
      return reject('item_not_draft', 'Somente itens em rascunho podem ser homologados.')
    }

    const homologatedAt = new Date().toISOString()

    $app.runInTransaction((txApp) => {
      const current = txApp.findRecordById('catalog_items', itemId)
      current.set('status', 'homologado')
      current.set('homologated_by', e.auth.id)
      current.set('homologated_at', homologatedAt)
      txApp.save(current)

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'catalog_item_homologated')
      audit.set('resource', 'catalog_items/' + itemId)
      audit.set('outcome', 'success')
      audit.set('details', { homologatedAt, source: 'server_catalog_homologate' })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(200, { id: itemId, status: 'homologado', homologatedAt })
  },
  $apis.requireAuth(),
)
