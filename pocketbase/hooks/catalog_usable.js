routerAdd(
  'GET',
  '/backend/v1/catalog/usable',
  (e) => {
    const query = e.requestInfo().query || {}
    const family = typeof query.family === 'string' ? query.family.trim() : ''

    if (family && family.length > 120) {
      return e.badRequestError('Família inválida.')
    }

    const today = new Date().toISOString().slice(0, 10)

    let filter =
      'status = "homologado" && valid_from <= "' + today + '" && valid_until >= "' + today + '"'
    if (family) {
      filter += ' && family = "' + family.replace(/"/g, '') + '"'
    }

    const items = $app.findRecordsByFilter('catalog_items', filter, '-created', 200, 0)

    const result = []
    for (const item of items) {
      result.push({
        id: item.id,
        family: item.getString('family'),
        itemType: item.getString('item_type'),
        name: item.getString('name'),
        description: item.getString('description'),
        unit: item.getString('unit'),
        coefficient: item.getString('coefficient'),
        source: item.getString('source'),
        validFrom: item.getString('valid_from'),
        validUntil: item.getString('valid_until'),
      })
    }

    return e.json(200, { items: result })
  },
  $apis.requireAuth(),
)
