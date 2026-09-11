onRecordCreateRequest((e) => {
  const record = e.record

  const writeRejectedAudit = (reason) => {
    const rejectedAudit = new Record($app.findCollectionByNameOrId('audit_logs'))
    rejectedAudit.set('actor_id', e.auth.id)
    rejectedAudit.set('action', 'tech_sheet_create_rejected')
    rejectedAudit.set('resource', 'tech_sheets')
    rejectedAudit.set('outcome', 'failure')
    rejectedAudit.set('details', { reason, source: 'server_tech_sheet_create' })
    rejectedAudit.set('retention_days', 365)
    $app.save(rejectedAudit)
  }

  // Campos JSON chegam como bytes brutos via record.get; getString devolve o
  // texto JSON, que parseamos para o valor real (funciona em JSON e multipart).
  const parseJsonField = (fieldName) => {
    const text = record.getString(fieldName) || ''
    if (!text.trim()) return undefined
    try {
      return JSON.parse(text)
    } catch (_) {
      return { __parseFailed: true }
    }
  }

  const opportunityId = record.getString('opportunity_id') || ''
  if (!/^[a-z0-9]{15}$/.test(opportunityId)) {
    writeRejectedAudit('opportunity_id_required')
    throw new BadRequestError('Informe a oportunidade da ficha técnica.')
  }

  let opportunity
  try {
    opportunity = $app.findRecordById('opportunities', opportunityId)
  } catch (_) {
    writeRejectedAudit('opportunity_not_found')
    throw new BadRequestError('Oportunidade não encontrada.')
  }

  if (opportunity.getString('responsible_user_id') !== e.auth.id) {
    throw new ForbiddenError(
      'Somente o responsável pode registrar a ficha técnica desta oportunidade.',
    )
  }

  const rawParameters = parseJsonField('parameters')
  if (rawParameters && rawParameters.__parseFailed) {
    writeRejectedAudit('parameters_invalid_json')
    throw new BadRequestError('Os parâmetros devem ser uma lista válida.')
  }
  if (!Array.isArray(rawParameters) || rawParameters.length === 0) {
    writeRejectedAudit('parameters_required')
    throw new BadRequestError('Informe pelo menos um parâmetro técnico.')
  }
  if (rawParameters.length > 50) {
    writeRejectedAudit('parameters_too_many')
    throw new BadRequestError('Envie no máximo 50 parâmetros por versão.')
  }

  const parameters = []
  for (let index = 0; index < rawParameters.length; index++) {
    const item = rawParameters[index]
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      writeRejectedAudit('parameters_invalid')
      throw new BadRequestError(
        'Cada parâmetro deve ser um objeto com nome, valor, unidade e origem.',
      )
    }
    const name = typeof item.name === 'string' ? item.name.trim() : ''
    const value = typeof item.value === 'string' ? item.value.trim() : ''
    const unit = typeof item.unit === 'string' ? item.unit.trim() : ''
    const origin = typeof item.origin === 'string' ? item.origin.trim() : ''
    if (!name || name.length > 120) {
      writeRejectedAudit('parameter_name_invalid')
      throw new BadRequestError('Cada parâmetro precisa de um nome de até 120 caracteres.')
    }
    if (!value || value.length > 200) {
      writeRejectedAudit('parameter_value_invalid')
      throw new BadRequestError('Cada parâmetro precisa de um valor de até 200 caracteres.')
    }
    if (!unit || unit.length > 40) {
      writeRejectedAudit('parameter_unit_invalid')
      throw new BadRequestError('Cada parâmetro precisa de uma unidade de até 40 caracteres.')
    }
    if (!origin || origin.length > 120) {
      writeRejectedAudit('parameter_origin_invalid')
      throw new BadRequestError('Cada parâmetro precisa de uma origem de até 120 caracteres.')
    }
    parameters.push({ name, value, unit, origin })
  }

  const seenNames = {}
  for (const parameter of parameters) {
    const key = parameter.name.toLowerCase()
    if (seenNames[key]) {
      writeRejectedAudit('parameter_duplicated')
      throw new BadRequestError('Parâmetro repetido: ' + parameter.name)
    }
    seenNames[key] = true
  }

  const decodedPending = parseJsonField('pending_items')
  let pendingItems = []
  if (decodedPending && decodedPending.__parseFailed) {
    writeRejectedAudit('pending_items_invalid_json')
    throw new BadRequestError('As pendências devem ser uma lista válida.')
  }
  if (decodedPending !== undefined && decodedPending !== null) {
    if (!Array.isArray(decodedPending)) {
      writeRejectedAudit('pending_items_invalid')
      throw new BadRequestError('As pendências devem ser uma lista de textos.')
    }
    if (decodedPending.length > 50) {
      writeRejectedAudit('pending_items_too_many')
      throw new BadRequestError('Envie no máximo 50 pendências por versão.')
    }
    for (const item of decodedPending) {
      if (typeof item !== 'string') {
        writeRejectedAudit('pending_items_invalid')
        throw new BadRequestError('Cada pendência deve ser um texto.')
      }
      const trimmed = item.trim()
      if (!trimmed || trimmed.length > 300) {
        writeRejectedAudit('pending_item_invalid')
        throw new BadRequestError('Cada pendência deve ter entre 1 e 300 caracteres.')
      }
      pendingItems.push(trimmed)
    }
  }

  const notes = (record.getString('notes') || '').trim()
  if (notes.length > 2000) {
    writeRejectedAudit('notes_too_long')
    throw new BadRequestError('As observações devem ter no máximo 2000 caracteres.')
  }

  const existing = $app.findRecordsByFilter(
    'tech_sheets',
    'opportunity_id = "' + opportunityId + '"',
    '-version',
    1,
    0,
  )
  const nextVersion = existing.length > 0 ? existing[0].getInt('version') + 1 : 1

  record.set('parameters', parameters)
  record.set('pending_items', pendingItems)
  record.set('notes', notes)
  record.set('version', nextVersion)
  record.set('created_by', e.auth.id)

  return e.next()
}, 'tech_sheets')
