routerAdd(
  'POST',
  '/backend/v1/catalog/items',
  (e) => {
    const body = e.requestInfo().body || {}
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')

    const writeRejectedAudit = (reason) => {
      const rejectedAudit = new Record(auditLogs)
      rejectedAudit.set('actor_id', e.auth.id)
      rejectedAudit.set('action', 'catalog_item_rejected')
      rejectedAudit.set('resource', 'catalog_items')
      rejectedAudit.set('outcome', 'failure')
      rejectedAudit.set('details', { reason, source: 'server_catalog_create' })
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

    const family = text(body.family, 120)
    if (!family) return reject('family_required', 'Informe a família de serviço do item.')

    const itemType = typeof body.item_type === 'string' ? body.item_type.trim() : ''
    if (!['servico', 'composicao', 'recurso'].includes(itemType)) {
      return reject('item_type_invalid', 'Tipo inválido; use servico, composicao ou recurso.')
    }

    const name = text(body.name, 200)
    if (!name) return reject('name_required', 'Informe o nome do item.')

    const unit = text(body.unit, 40)
    if (!unit) return reject('unit_required', 'Informe a unidade do item.')

    const source = text(body.source, 200)
    if (!source) return reject('source_required', 'Informe a fonte do item.')

    const description =
      typeof body.description === 'string' ? body.description.trim().slice(0, 1000) : ''
    const coefficient =
      typeof body.coefficient === 'string' ? body.coefficient.trim().slice(0, 100) : ''

    if (!isIsoDate(body.valid_from) || !isIsoDate(body.valid_until)) {
      return reject('validity_invalid', 'Informe a vigência no formato válido.')
    }
    if (body.valid_from > body.valid_until) {
      return reject('validity_invalid', 'O início da vigência não pode ser depois do fim.')
    }

    let itemId = ''
    $app.runInTransaction((txApp) => {
      const collection = txApp.findCollectionByNameOrId('catalog_items')
      const item = new Record(collection)
      item.set('family', family)
      item.set('item_type', itemType)
      item.set('name', name)
      item.set('description', description)
      item.set('unit', unit)
      item.set('coefficient', coefficient)
      item.set('source', source)
      item.set('valid_from', body.valid_from)
      item.set('valid_until', body.valid_until)
      item.set('status', 'rascunho')
      item.set('created_by', e.auth.id)
      txApp.save(item)
      itemId = item.id

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'catalog_item_created')
      audit.set('resource', 'catalog_items/' + item.id)
      audit.set('outcome', 'success')
      audit.set('details', {
        family,
        itemType,
        name,
        status: 'rascunho',
        source: 'server_catalog_create',
      })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(201, { id: itemId, status: 'rascunho' })
  },
  $apis.requireAuth(),
)
