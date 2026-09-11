routerAdd(
  'POST',
  '/backend/v1/opportunities/tech-sheet',
  (e) => {
    const body = e.requestInfo().body || {}
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')

    const writeRejectedAudit = (reason) => {
      const rejectedAudit = new Record(auditLogs)
      rejectedAudit.set('actor_id', e.auth.id)
      rejectedAudit.set('action', 'tech_sheet_create_rejected')
      rejectedAudit.set('resource', 'opportunities')
      rejectedAudit.set('outcome', 'failure')
      rejectedAudit.set('details', { reason, source: 'server_tech_sheet_create' })
      rejectedAudit.set('retention_days', 365)
      $app.save(rejectedAudit)
    }

    const reject = (reason, message) => {
      writeRejectedAudit(reason)
      return e.badRequestError(message)
    }

    const opportunityId = typeof body.opportunity_id === 'string' ? body.opportunity_id.trim() : ''
    if (!/^[a-z0-9]{15}$/.test(opportunityId)) {
      return reject('opportunity_id_required', 'Informe a oportunidade da ficha técnica.')
    }

    let opportunity
    try {
      opportunity = $app.findRecordById('opportunities', opportunityId)
    } catch (_) {
      return reject('opportunity_not_found', 'Oportunidade não encontrada.')
    }

    if (opportunity.getString('responsible_user_id') !== e.auth.id) {
      return e.forbiddenError(
        'Somente o responsável pode registrar a ficha técnica desta oportunidade.',
      )
    }

    let rawParameters = body.parameters
    if (typeof rawParameters === 'string') {
      try {
        rawParameters = JSON.parse(rawParameters)
      } catch (_) {
        return reject('parameters_invalid_json', 'Os parâmetros devem ser uma lista válida.')
      }
    }
    if (!Array.isArray(rawParameters) || rawParameters.length === 0) {
      return reject('parameters_required', 'Informe pelo menos um parâmetro técnico.')
    }
    if (rawParameters.length > 50) {
      return reject('parameters_too_many', 'Envie no máximo 50 parâmetros por versão.')
    }

    const parameters = []
    for (let index = 0; index < rawParameters.length; index++) {
      const item = rawParameters[index]
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        return reject(
          'parameters_invalid',
          'Cada parâmetro deve ser um objeto com nome, valor, unidade e origem.',
        )
      }
      const name = typeof item.name === 'string' ? item.name.trim() : ''
      const value = typeof item.value === 'string' ? item.value.trim() : ''
      const unit = typeof item.unit === 'string' ? item.unit.trim() : ''
      const origin = typeof item.origin === 'string' ? item.origin.trim() : ''
      if (!name || name.length > 120) {
        return reject(
          'parameter_name_invalid',
          'Cada parâmetro precisa de um nome de até 120 caracteres.',
        )
      }
      if (!value || value.length > 200) {
        return reject(
          'parameter_value_invalid',
          'Cada parâmetro precisa de um valor de até 200 caracteres.',
        )
      }
      if (!unit || unit.length > 40) {
        return reject(
          'parameter_unit_invalid',
          'Cada parâmetro precisa de uma unidade de até 40 caracteres.',
        )
      }
      if (!origin || origin.length > 120) {
        return reject(
          'parameter_origin_invalid',
          'Cada parâmetro precisa de uma origem de até 120 caracteres.',
        )
      }
      parameters.push({ name, value, unit, origin })
    }

    const seenNames = {}
    for (const parameter of parameters) {
      const key = parameter.name.toLowerCase()
      if (seenNames[key]) {
        return reject('parameter_duplicated', 'Parâmetro repetido: ' + parameter.name)
      }
      seenNames[key] = true
    }

    let pendingItems = []
    if (
      body.pending_items !== undefined &&
      body.pending_items !== null &&
      body.pending_items !== ''
    ) {
      let rawPending = body.pending_items
      if (typeof rawPending === 'string') {
        try {
          rawPending = JSON.parse(rawPending)
        } catch (_) {
          return reject('pending_items_invalid_json', 'As pendências devem ser uma lista válida.')
        }
      }
      if (!Array.isArray(rawPending)) {
        return reject('pending_items_invalid', 'As pendências devem ser uma lista de textos.')
      }
      if (rawPending.length > 50) {
        return reject('pending_items_too_many', 'Envie no máximo 50 pendências por versão.')
      }
      for (const item of rawPending) {
        if (typeof item !== 'string') {
          return reject('pending_items_invalid', 'Cada pendência deve ser um texto.')
        }
        const trimmed = item.trim()
        if (!trimmed || trimmed.length > 300) {
          return reject('pending_item_invalid', 'Cada pendência deve ter entre 1 e 300 caracteres.')
        }
        pendingItems.push(trimmed)
      }
    }

    let notes = ''
    if (body.notes !== undefined && body.notes !== null) {
      if (typeof body.notes !== 'string') {
        return reject('notes_invalid', 'As observações devem ser um texto.')
      }
      notes = body.notes.trim()
      if (notes.length > 2000) {
        return reject('notes_too_long', 'As observações devem ter no máximo 2000 caracteres.')
      }
    }

    const uploaded = e.findUploadedFiles('attachments') || []
    if (uploaded.length > 10) {
      return reject('too_many_attachments', 'Envie no máximo 10 anexos por versão.')
    }
    const files = []
    for (const fileHeader of uploaded) {
      files.push($filesystem.fileFromMultipart(fileHeader))
    }

    const existing = $app.findRecordsByFilter(
      'tech_sheets',
      'opportunity_id = "' + opportunityId + '"',
      '-version',
      1,
      0,
    )
    const nextVersion = existing.length > 0 ? existing[0].getInt('version') + 1 : 1
    const createdAt = new Date().toISOString()

    let sheetId = ''
    $app.runInTransaction((txApp) => {
      const techSheets = txApp.findCollectionByNameOrId('tech_sheets')
      const sheet = new Record(techSheets)
      sheet.set('opportunity_id', opportunityId)
      sheet.set('version', nextVersion)
      sheet.set('parameters', parameters)
      sheet.set('pending_items', pendingItems)
      sheet.set('notes', notes)
      if (files.length > 0) {
        sheet.set('attachments', files)
      }
      sheet.set('created_by', e.auth.id)
      txApp.save(sheet)
      sheetId = sheet.id

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'tech_sheet_created')
      audit.set('resource', 'tech_sheets/' + sheet.id)
      audit.set('outcome', 'success')
      audit.set('details', {
        opportunityId,
        version: nextVersion,
        parameterCount: parameters.length,
        pendingCount: pendingItems.length,
        attachmentCount: files.length,
        source: 'server_tech_sheet_create',
      })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(201, {
      id: sheetId,
      opportunityId,
      version: nextVersion,
      parameters,
      pendingItems,
      notes,
      attachmentCount: files.length,
      createdBy: e.auth.id,
      createdAt,
    })
  },
  $apis.requireAuth(),
)
