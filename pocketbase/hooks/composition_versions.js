routerAdd(
  'POST',
  '/backend/v1/compositions',
  (e) => {
    // Toda lógica inline no callback (JSVM não expõe top-level - T1.10).
    // Sem spread de objeto na resposta (T1.16). JSON via texto + parse (T1.5).
    const body = e.requestInfo().body || {}
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')

    const writeRejectedAudit = (reason) => {
      const rejectedAudit = new Record(auditLogs)
      rejectedAudit.set('actor_id', e.auth.id)
      rejectedAudit.set('action', 'composition_rejected')
      rejectedAudit.set('resource', 'composition_versions')
      rejectedAudit.set('outcome', 'failure')
      rejectedAudit.set('details', { reason, source: 'server_composition_create' })
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

    // CA-2-10: só Engenharia/Admin escreve; Comercial → 403.
    const role = e.auth.getString('role')
    if (role !== 'engenharia' && role !== 'admin') {
      return e.forbiddenError('Somente Engenharia ou Administrador podem criar composições.')
    }

    const catalogItemId =
      typeof body.catalog_item_id === 'string' ? body.catalog_item_id.trim() : ''
    if (!/^[a-z0-9]{15}$/.test(catalogItemId)) {
      return reject('catalog_item_required', 'Informe o item do catálogo da composição.')
    }

    let catalogItem
    try {
      catalogItem = $app.findRecordById('catalog_items', catalogItemId)
    } catch (_) {
      return reject('catalog_item_not_found', 'Item do catálogo não encontrado.')
    }

    const family = catalogItem.getString('family')

    const code = typeof body.code === 'string' ? body.code.trim() : ''
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(code)) {
      return reject(
        'code_invalid',
        'Código inválido; use 1–64 caracteres alfanuméricos, hífen ou underscore.',
      )
    }

    const outputUnit = text(body.output_unit, 40)
    if (!outputUnit)
      return reject('output_unit_required', 'Informe a unidade de saída (caminho: output_unit).')

    const source = text(body.source, 200)
    if (!source)
      return reject('source_required', 'Informe a fonte da composição (caminho: source).')

    const fixtureRef = text(body.fixture_ref, 500)
    if (!fixtureRef) {
      return reject(
        'fixture_ref_required',
        'Informe a referência da fixture de prova (caminho: fixture_ref).',
      )
    }

    const precision = text(body.precision, 40)
    if (!precision)
      return reject('precision_required', 'Informe a precisão do cálculo (caminho: precision).')

    const rounding = typeof body.rounding === 'string' ? body.rounding.trim() : ''
    if (!['normal', 'up', 'down'].includes(rounding)) {
      return reject('rounding_invalid', 'Arredondamento inválido; use normal, up ou down.')
    }

    const tolerance = text(body.tolerance, 40)
    if (!tolerance) return reject('tolerance_required', 'Informe a tolerância do cálculo.')

    if (!isIsoDate(body.valid_from) || !isIsoDate(body.valid_until)) {
      return reject(
        'validity_invalid',
        'Informe a vigência no formato válido (caminho: valid_from/valid_until).',
      )
    }
    if (body.valid_from > body.valid_until) {
      return reject('validity_invalid', 'O início da vigência não pode ser depois do fim.')
    }

    // owner_id explícito no corpo (dono registrado da composição).
    const ownerId = typeof body.owner_id === 'string' ? body.owner_id.trim() : ''
    if (!/^[a-z0-9]{15}$/.test(ownerId)) {
      return reject('owner_id_required', 'Informe o dono da composição (caminho: owner_id).')
    }
    try {
      $app.findRecordById('users', ownerId)
    } catch (_) {
      return reject('owner_not_found', 'Dono informado não encontrado.')
    }

    // inputs: lista de objetos {name, unit, required, min, max}
    const inputs = body.inputs
    if (!Array.isArray(inputs) || inputs.length === 0 || inputs.length > 50) {
      return reject('inputs_required', 'Informe de 1 a 50 insumos (caminho: inputs).')
    }
    for (let index = 0; index < inputs.length; index++) {
      const item = inputs[index]
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        return reject(
          'inputs_invalid',
          'Cada insumo deve ser um objeto (caminho: inputs[' + index + ']).',
        )
      }
      const inputName = typeof item.name === 'string' ? item.name.trim() : ''
      if (!inputName || inputName.length > 120) {
        return reject(
          'inputs_invalid',
          'Cada insumo precisa de nome de até 120 caracteres (caminho: inputs[' +
            index +
            '].name).',
        )
      }
      const inputUnit = typeof item.unit === 'string' ? item.unit.trim() : ''
      if (!inputUnit || inputUnit.length > 40) {
        return reject(
          'inputs_invalid',
          'Cada insumo precisa de unidade (caminho: inputs[' + index + '].unit).',
        )
      }
    }

    // resources: lista de objetos {id, unit, coefficient, source}
    const resources = body.resources
    if (!Array.isArray(resources) || resources.length === 0 || resources.length > 50) {
      return reject('resources_required', 'Informe de 1 a 50 recursos (caminho: resources).')
    }
    for (let index = 0; index < resources.length; index++) {
      const resource = resources[index]
      if (typeof resource !== 'object' || resource === null || Array.isArray(resource)) {
        return reject(
          'resources_invalid',
          'Cada recurso deve ser um objeto (caminho: resources[' + index + ']).',
        )
      }
      const resourceId = typeof resource.id === 'string' ? resource.id.trim() : ''
      if (!/^[a-z0-9]{15}$/.test(resourceId)) {
        return reject(
          'resources_invalid',
          'Cada recurso precisa de id válido (caminho: resources[' + index + '].id).',
        )
      }
      const resourceUnit = typeof resource.unit === 'string' ? resource.unit.trim() : ''
      if (!resourceUnit || resourceUnit.length > 40) {
        return reject(
          'resources_invalid',
          'Cada recurso precisa de unidade (caminho: resources[' + index + '].unit).',
        )
      }
      const coefficient =
        typeof resource.coefficient === 'string' ? resource.coefficient.trim() : ''
      if (!/^-?\d+(\.\d+)?$/.test(coefficient)) {
        return reject(
          'resources_coefficient_invalid',
          'Coeficiente deve ser decimal textual (caminho: resources[' + index + '].coefficient).',
        )
      }
      const resourceSource = typeof resource.source === 'string' ? resource.source.trim() : ''
      if (!resourceSource || resourceSource.length > 200) {
        return reject(
          'resources_source_invalid',
          'Cada recurso precisa de fonte/versão (caminho: resources[' + index + '].source).',
        )
      }
    }

    // formula_ast: objeto estrutural, nunca executado (sem eval/Function).
    const formulaAst = body.formula_ast
    if (typeof formulaAst !== 'object' || formulaAst === null || Array.isArray(formulaAst)) {
      return reject(
        'formula_ast_invalid',
        'Informe a fórmula como AST estruturado (caminho: formula_ast).',
      )
    }

    // Unicidade código+família na versão 1 (índice único cobre item+versão).
    const existing = $app.findRecordsByFilter(
      'composition_versions',
      'code = "' + code.replace(/"/g, '') + '" && family = "' + family.replace(/"/g, '') + '"',
      '-version',
      1,
      0,
    )
    if (existing.length > 0) {
      return e.json(409, {
        error: 'Código já existe para esta família; revisão cria nova versão via /revise.',
        reason: 'code_duplicated',
      })
    }

    let compositionId = ''
    $app.runInTransaction((txApp) => {
      const collection = txApp.findCollectionByNameOrId('composition_versions')
      const composition = new Record(collection)
      composition.set('catalog_item_id', catalogItemId)
      composition.set('code', code)
      composition.set('family', family)
      composition.set('version', 1)
      composition.set('status', 'rascunho')
      composition.set('output_unit', outputUnit)
      composition.set('inputs', JSON.stringify(inputs))
      composition.set('resources', JSON.stringify(resources))
      composition.set('formula_ast', JSON.stringify(formulaAst))
      composition.set('source', source)
      composition.set('valid_from', body.valid_from)
      composition.set('valid_until', body.valid_until)
      composition.set('owner_id', ownerId)
      composition.set('fixture_ref', fixtureRef)
      composition.set('precision', precision)
      composition.set('rounding', rounding)
      composition.set('tolerance', tolerance)
      composition.set('created_by', e.auth.id)
      txApp.save(composition)
      compositionId = composition.id

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'composition_created')
      audit.set('resource', 'composition_versions/' + composition.id)
      audit.set('outcome', 'success')
      audit.set('details', { code, family, version: 1, source: 'server_composition_create' })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(201, { id: compositionId, version: 1, status: 'rascunho' })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/compositions/revise',
  (e) => {
    const body = e.requestInfo().body || {}
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')

    const writeRejectedAudit = (reason) => {
      const rejectedAudit = new Record(auditLogs)
      rejectedAudit.set('actor_id', e.auth.id)
      rejectedAudit.set('action', 'composition_revise_rejected')
      rejectedAudit.set('resource', 'composition_versions')
      rejectedAudit.set('outcome', 'failure')
      rejectedAudit.set('details', { reason, source: 'server_composition_revise' })
      rejectedAudit.set('retention_days', 365)
      $app.save(rejectedAudit)
    }

    const reject = (reason, message) => {
      writeRejectedAudit(reason)
      return e.badRequestError(message)
    }

    const role = e.auth.getString('role')
    if (role !== 'engenharia' && role !== 'admin') {
      return e.forbiddenError('Somente Engenharia ou Administrador podem revisar composições.')
    }

    const compositionId = typeof body.id === 'string' ? body.id.trim() : ''
    if (!/^[a-z0-9]{15}$/.test(compositionId)) {
      return reject('composition_id_required', 'Informe a composição a ser revisada.')
    }

    let composition
    try {
      composition = $app.findRecordById('composition_versions', compositionId)
    } catch (_) {
      return reject('composition_not_found', 'Composição não encontrada.')
    }

    // Revisão parte de versão homologada (SPEC: revisar existente → nova versão).
    if (composition.getString('status') !== 'homologado') {
      return reject(
        'composition_not_homologado',
        'Somente versão homologada pode gerar nova versão.',
      )
    }

    const isIsoDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)

    const text = (value, max) =>
      typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max
        ? value.trim()
        : ''

    const outputUnit = text(body.output_unit, 40)
    if (!outputUnit) return reject('output_unit_required', 'Informe a unidade de saída.')

    const source = text(body.source, 200)
    if (!source) return reject('source_required', 'Informe a fonte da composição.')

    const fixtureRef = text(body.fixture_ref, 500)
    if (!fixtureRef) {
      return reject('fixture_ref_required', 'Informe a referência da fixture da nova versão.')
    }

    const precision = text(body.precision, 40)
    if (!precision) return reject('precision_required', 'Informe a precisão do cálculo.')

    const rounding = typeof body.rounding === 'string' ? body.rounding.trim() : ''
    if (!['normal', 'up', 'down'].includes(rounding)) {
      return reject('rounding_invalid', 'Arredondamento inválido; use normal, up ou down.')
    }

    const tolerance = typeof body.tolerance === 'string' ? body.tolerance.trim().slice(0, 40) : ''
    if (!tolerance) return reject('tolerance_required', 'Informe a tolerância do cálculo.')

    if (!isIsoDate(body.valid_from) || !isIsoDate(body.valid_until)) {
      return reject('validity_invalid', 'Informe a vigência no formato válido.')
    }
    if (body.valid_from > body.valid_until) {
      return reject('validity_invalid', 'O início da vigência não pode ser depois do fim.')
    }

    const inputs = body.inputs
    if (!Array.isArray(inputs) || inputs.length === 0 || inputs.length > 50) {
      return reject('inputs_required', 'Informe de 1 a 50 insumos.')
    }
    for (let index = 0; index < inputs.length; index++) {
      const input = inputs[index]
      if (typeof input !== 'object' || input === null || Array.isArray(input)) {
        return reject(
          'inputs_invalid',
          'Cada insumo deve ser um objeto (caminho: inputs[' + index + ']).',
        )
      }
      const name = typeof input.name === 'string' ? input.name.trim() : ''
      if (!name || name.length > 120) {
        return reject(
          'inputs_invalid',
          'Cada insumo precisa de nome de até 120 caracteres (caminho: inputs[' +
            index +
            '].name).',
        )
      }
      const unit = typeof input.unit === 'string' ? input.unit.trim() : ''
      if (!unit || unit.length > 40) {
        return reject(
          'inputs_unit_invalid',
          'Cada insumo precisa de unidade (caminho: inputs[' + index + '].unit).',
        )
      }
    }

    const resources = body.resources
    if (!Array.isArray(resources) || resources.length === 0 || resources.length > 50) {
      return reject('resources_required', 'Informe de 1 a 50 recursos.')
    }
    for (let index = 0; index < resources.length; index++) {
      const resource = resources[index]
      if (typeof resource !== 'object' || resource === null || Array.isArray(resource)) {
        return reject(
          'resources_invalid',
          'Cada recurso deve ser um objeto (caminho: resources[' + index + ']).',
        )
      }
      const resourceId = typeof resource.id === 'string' ? resource.id.trim() : ''
      if (!/^[a-z0-9]{15}$/.test(resourceId)) {
        return reject(
          'resources_id_invalid',
          'Cada recurso precisa de id válido (caminho: resources[' + index + '].id).',
        )
      }
      const resourceUnit = typeof resource.unit === 'string' ? resource.unit.trim() : ''
      if (!resourceUnit || resourceUnit.length > 40) {
        return reject(
          'resources_unit_invalid',
          'Cada recurso precisa de unidade (caminho: resources[' + index + '].unit).',
        )
      }
      const coefficient =
        typeof resource.coefficient === 'string' ? resource.coefficient.trim() : ''
      if (!/^-?\d+(\.\d+)?$/.test(coefficient)) {
        return reject(
          'resources_coefficient_invalid',
          'Coeficiente deve ser decimal textual (caminho: resources[' + index + '].coefficient).',
        )
      }
      const resourceSource = typeof resource.source === 'string' ? resource.source.trim() : ''
      if (!resourceSource || resourceSource.length > 200) {
        return reject(
          'resources_source_invalid',
          'Cada recurso precisa de fonte/versão (caminho: resources[' + index + '].source).',
        )
      }
    }

    const formulaAst = body.formula_ast
    if (typeof formulaAst !== 'object' || formulaAst === null || Array.isArray(formulaAst)) {
      return reject('formula_ast_invalid', 'A fórmula deve ser um AST estruturado (objeto).')
    }

    let newVersion = 1
    let newId = ''
    $app.runInTransaction((txApp) => {
      const current = txApp.findRecordById('composition_versions', compositionId)
      const itemFamily = current.getString('family')
      const itemLink = current.getString('catalog_item_id')
      const code = current.getString('code')

      const latestOfItem = txApp.findRecordsByFilter(
        'composition_versions',
        'catalog_item_id = "' + itemLink + '"',
        '-version',
        1,
        0,
      )
      newVersion = (latestOfItem.length > 0 ? latestOfItem[0].getInt('version') : 0) + 1

      const collection = txApp.findCollectionByNameOrId('composition_versions')
      const revision = new Record(collection)
      revision.set('catalog_item_id', itemLink)
      revision.set('code', code)
      revision.set('family', itemFamily)
      revision.set('version', newVersion)
      revision.set('status', 'rascunho')
      revision.set('output_unit', outputUnit)
      revision.set('inputs', JSON.stringify(inputs))
      revision.set('resources', JSON.stringify(resources))
      revision.set('formula_ast', JSON.stringify(formulaAst))
      revision.set('source', source)
      revision.set('valid_from', body.valid_from)
      revision.set('valid_until', body.valid_until)
      revision.set('owner_id', e.auth.id)
      revision.set('fixture_ref', fixtureRef)
      revision.set('precision', precision)
      revision.set('rounding', rounding)
      revision.set('tolerance', tolerance)
      revision.set('created_by', e.auth.id)
      txApp.save(revision)
      newId = revision.id

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'composition_revised')
      audit.set('resource', 'composition_versions/' + revision.id)
      audit.set('outcome', 'success')
      audit.set('details', {
        code,
        family: itemFamily,
        version: newVersion,
        source: 'server_composition_revise',
      })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(201, { id: newId, version: newVersion, status: 'rascunho' })
  },
  $apis.requireAuth(),
)
