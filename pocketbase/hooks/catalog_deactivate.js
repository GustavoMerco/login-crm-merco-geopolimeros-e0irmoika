routerAdd(
  'POST',
  '/backend/v1/catalog/deactivate',
  (e) => {
    const body = e.requestInfo().body || {}
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')

    const writeRejectedAudit = (reason) => {
      const rejectedAudit = new Record(auditLogs)
      rejectedAudit.set('actor_id', e.auth.id)
      rejectedAudit.set('action', 'catalog_deactivate_rejected')
      rejectedAudit.set('resource', 'catalog_items')
      rejectedAudit.set('outcome', 'failure')
      rejectedAudit.set('details', { reason, source: 'server_catalog_deactivate' })
      rejectedAudit.set('retention_days', 365)
      $app.save(rejectedAudit)
    }

    const reject = (reason, message) => {
      writeRejectedAudit(reason)
      return e.badRequestError(message)
    }

    const itemId = typeof body.id === 'string' ? body.id.trim() : ''
    if (!/^[a-z0-9]{15}$/.test(itemId)) {
      return reject('item_id_required', 'Informe o item a ser inativado.')
    }

    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    if (reason.length < 10 || reason.length > 1000) {
      return reject(
        'reason_required',
        'A justificativa da inativação é obrigatória (entre 10 e 1000 caracteres).',
      )
    }

    const role = e.auth.getString('role')
    if (role !== 'engenharia' && role !== 'admin') {
      return e.forbiddenError(
        'Somente Engenharia ou Administrador podem inativar itens do catálogo.',
      )
    }

    let item
    try {
      item = $app.findRecordById('catalog_items', itemId)
    } catch (_) {
      return reject('item_not_found', 'Item do catálogo não encontrado.')
    }

    if (item.getString('status') === 'inativo') {
      return reject('item_already_inactive', 'Este item já está inativo.')
    }

    $app.runInTransaction((txApp) => {
      const current = txApp.findRecordById('catalog_items', itemId)
      current.set('status', 'inativo')
      current.set('inactive_reason', reason)
      txApp.save(current)

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'catalog_item_deactivated')
      audit.set('resource', 'catalog_items/' + itemId)
      audit.set('outcome', 'success')
      audit.set('details', { reason, source: 'server_catalog_deactivate' })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(200, { id: itemId, status: 'inativo' })
  },
  $apis.requireAuth(),
)
