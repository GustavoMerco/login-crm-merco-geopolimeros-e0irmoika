routerAdd(
  'POST',
  '/backend/v1/catalog/update-draft',
  (e) => {
    const body = e.requestInfo().body || {}
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')

    const writeRejectedAudit = (reason) => {
      const rejectedAudit = new Record(auditLogs)
      rejectedAudit.set('actor_id', e.auth.id)
      rejectedAudit.set('action', 'catalog_update_rejected')
      rejectedAudit.set('resource', 'catalog_items')
      rejectedAudit.set('outcome', 'failure')
      rejectedAudit.set('details', { reason, source: 'server_catalog_update' })
      rejectedAudit.set('retention_days', 365)
      $app.save(rejectedAudit)
    }

    const reject = (reason, message) => {
      writeRejectedAudit(reason)
      return e.badRequestError(message)
    }

    const isIsoDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)

    const itemId = typeof body.id === 'string' ? body.id.trim() : ''
    if (!/^[a-z0-9]{15}$/.test(itemId)) {
      return reject('item_id_required', 'Informe o item a ser editado.')
    }

    let item
    try {
      item = $app.findRecordById('catalog_items', itemId)
    } catch (_) {
      return reject('item_not_found', 'Item do catálogo não encontrado.')
    }

    if (item.getString('created_by') !== e.auth.id) {
      return e.forbiddenError('Somente o autor pode editar o rascunho.')
    }

    if (item.getString('status') !== 'rascunho') {
      return reject('item_immutable', 'Itens homologados ou inativos são imutáveis.')
    }

    const text = (value, max) =>
      typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max
        ? value.trim()
        : ''

    const name = text(body.name, 200)
    if (!name) return reject('name_required', 'Informe o nome do item.')

    const unit = text(body.unit, 40)
    if (!unit) return reject('unit_required', 'Informe a unidade do item.')

    const source = text(body.source, 200)
    if (!source) return reject('source_required', 'Informe a fonte do item.')

    if (!isIsoDate(body.valid_from) || !isIsoDate(body.valid_until)) {
      return reject('validity_invalid', 'Informe a vigência no formato válido.')
    }
    if (body.valid_from > body.valid_until) {
      return reject('validity_invalid', 'O início da vigência não pode ser depois do fim.')
    }

    const description =
      typeof body.description === 'string' ? body.description.trim().slice(0, 1000) : ''
    const coefficient =
      typeof body.coefficient === 'string' ? body.coefficient.trim().slice(0, 100) : ''

    $app.runInTransaction((txApp) => {
      const current = txApp.findRecordById('catalog_items', itemId)
      current.set('name', name)
      current.set('description', description)
      current.set('unit', unit)
      current.set('coefficient', coefficient)
      current.set('source', source)
      current.set('valid_from', body.valid_from)
      current.set('valid_until', body.valid_until)
      txApp.save(current)

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'catalog_item_updated')
      audit.set('resource', 'catalog_items/' + itemId)
      audit.set('outcome', 'success')
      audit.set('details', { source: 'server_catalog_update' })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(200, { id: itemId, status: 'rascunho' })
  },
  $apis.requireAuth(),
)
