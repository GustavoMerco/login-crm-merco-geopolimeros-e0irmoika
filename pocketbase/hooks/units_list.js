routerAdd(
  'GET',
  '/backend/v1/units',
  (e) => {
    // Leitura autenticada; estados expostos por rótulo na UI (UX-007-UN).
    // A consulta é a fonte autorizada para seletores futuros (T2.17).
    const query = e.requestInfo().query || {}
    const status = typeof query.status === 'string' ? query.status.trim() : ''

    const VALID_STATUS = ['rascunho', 'homologado', 'inativo']
    let filter = ''
    if (status) {
      if (!VALID_STATUS.includes(status)) {
        return e.badRequestError('Estado inválido; use rascunho, homologado ou inativo.')
      }
      filter = 'status = "' + status + '"'
    }

    const records = $app.findRecordsByFilter('units', filter, '-created', 200, 0)

    const items = []
    for (const r of records) {
      items.push({
        id: r.id,
        code: r.getString('code'),
        name: r.getString('name'),
        dimension: r.getString('dimension'),
        status: r.getString('status'),
        inactiveReason: r.getString('inactive_reason'),
        homologatedAt: r.getString('homologated_at'),
        created: r.getString('created'),
      })
    }

    return e.json(200, { items: items })
  },
  $apis.requireAuth(),
)
