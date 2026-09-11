routerAdd(
  'GET',
  '/backend/v1/opportunities/tech-sheet',
  (e) => {
    const query = e.requestInfo().query || {}
    const opportunityId =
      typeof query.opportunity_id === 'string' ? query.opportunity_id.trim() : ''

    if (!/^[a-z0-9]{15}$/.test(opportunityId)) {
      return e.badRequestError('Informe uma oportunidade válida para consultar a ficha técnica.')
    }

    let opportunity
    try {
      opportunity = $app.findRecordById('opportunities', opportunityId)
    } catch (_) {
      return e.notFoundError('Oportunidade não encontrada.')
    }

    if (opportunity.getString('responsible_user_id') !== e.auth.id) {
      return e.forbiddenError('Somente o responsável pode consultar esta ficha técnica.')
    }

    const techSheetsId = $app.findCollectionByNameOrId('tech_sheets').id
    const sheets = $app.findRecordsByFilter(
      'tech_sheets',
      'opportunity_id = "' + opportunityId + '"',
      '-version',
      100,
      0,
    )

    const items = []
    for (const sheet of sheets) {
      items.push({
        id: sheet.id,
        version: sheet.getInt('version'),
        parameters: sheet.get('parameters') || [],
        pendingItems: sheet.get('pending_items') || [],
        notes: sheet.getString('notes'),
        attachments: sheet.get('attachments') || [],
        createdBy: sheet.getString('created_by'),
        createdAt: sheet.getString('created'),
        collectionId: techSheetsId,
      })
    }

    return e.json(200, { items })
  },
  $apis.requireAuth(),
)
