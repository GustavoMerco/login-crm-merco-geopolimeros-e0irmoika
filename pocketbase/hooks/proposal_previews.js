// T1.14 - prévia sem preço baseada em modelo real aprovado.
routerAdd(
  'POST',
  '/backend/v1/proposal-previews',
  (e) => {
    const body = e.requestInfo().body || {}
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')

    const reject = (reason, message) => {
      const audit = new Record(auditLogs)
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'proposal_preview_create_rejected')
      audit.set('resource', 'proposal_previews')
      audit.set('outcome', 'failure')
      audit.set('details', { reason, source: 'server_proposal_preview_create' })
      audit.set('retention_days', 365)
      $app.save(audit)
      return e.badRequestError(message)
    }

    const isId = (value) => typeof value === 'string' && /^[a-z0-9]{15}$/.test(value.trim())
    const requiredText = (field, max) =>
      typeof body[field] === 'string' &&
      body[field].trim().length > 0 &&
      body[field].trim().length <= max
    const isIsoDate = (value) => {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
      const parsed = new Date(value + 'T00:00:00.000Z')
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    }
    const hasCommercialData = (value) =>
      typeof value === 'string' &&
      /(?:R\$|\bpre[cç]o\b|\bfaturamento\b|\bpagamento\b|\bvalor\s+(?:total|do\s+investimento|da\s+obra)\b)/i.test(
        value,
      )

    if (!body || typeof body !== 'object' || Array.isArray(body))
      return reject('invalid_body', 'Informe os dados da prévia em formato válido.')
    if (!isId(body.opportunity_id))
      return reject('opportunity_id_invalid', 'Informe a demanda da prévia.')
    if (!isId(body.template_id)) return reject('template_id_invalid', 'Informe o modelo aprovado.')
    if (!['poliureia', 'geotecnia'].includes(body.family))
      return reject('family_invalid', 'Selecione uma família válida.')

    let opportunity
    try {
      opportunity = $app.findRecordById('opportunities', body.opportunity_id.trim())
    } catch (_) {
      return reject('opportunity_not_found', 'Demanda não encontrada.')
    }
    if (opportunity.getString('responsible_user_id') !== e.auth.id)
      return e.forbiddenError('Somente o responsável pela demanda pode gerar a prévia.')

    let template
    try {
      template = $app.findRecordById('proposal_templates', body.template_id.trim())
    } catch (_) {
      return reject('template_not_found', 'Modelo de proposta não encontrado.')
    }
    if (template.getString('status') !== 'aprovado')
      return reject('template_not_approved', 'A prévia exige um modelo aprovado.')
    if (template.getString('family') !== body.family)
      return reject(
        'template_family_mismatch',
        'O modelo aprovado não corresponde à família selecionada.',
      )

    if (!requiredText('proposal_number', 60))
      return reject('proposal_number_required', 'Informe o número da proposta.')
    if (!requiredText('revision', 20))
      return reject('revision_required', 'Informe a revisão da proposta.')
    if (!isIsoDate(body.proposal_date))
      return reject('proposal_date_invalid', 'Informe uma data válida para a proposta.')
    if (!requiredText('city', 120)) return reject('city_required', 'Informe a cidade da proposta.')
    if (!requiredText('customer_cnpj', 40))
      return reject('customer_cnpj_required', 'Informe o CNPJ do cliente.')
    if (!requiredText('customer_address', 500))
      return reject('customer_address_required', 'Informe o endereço do cliente.')
    if (!requiredText('local_obra', 300))
      return reject('local_obra_required', 'Informe o local da obra.')
    if (!requiredText('surface_type', 120))
      return reject('surface_type_required', 'Informe o tipo de superfície.')
    if (!requiredText('solution_proposed', 5000))
      return reject('solution_required', 'Informe a solução proposta.')
    if (!requiredText('execution_start', 200))
      return reject('execution_start_required', 'Informe o início da execução.')
    if (!requiredText('execution_deadline', 200))
      return reject('execution_deadline_required', 'Informe o prazo de execução.')

    const opportunityCustomer = opportunity.getString('customer_name').trim()
    const opportunityContact = opportunity.getString('contact_name').trim()
    const opportunityEmail = opportunity.getString('contact_email').trim()
    if (!requiredText('customer_name', 200) || body.customer_name.trim() !== opportunityCustomer)
      return reject('customer_mismatch', 'O cliente deve corresponder à demanda selecionada.')
    if (!requiredText('contact_name', 200) || body.contact_name.trim() !== opportunityContact)
      return reject('contact_mismatch', 'O contato deve corresponder à demanda selecionada.')
    if (opportunityEmail && body.contact_email && body.contact_email.trim() !== opportunityEmail)
      return reject('contact_email_mismatch', 'O e-mail deve corresponder à demanda selecionada.')
    if (body.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.contact_email.trim()))
      return reject('contact_email_invalid', 'Informe um e-mail de contato válido.')

    let areas
    try {
      areas = typeof body.areas === 'string' ? JSON.parse(body.areas) : body.areas
    } catch (_) {
      return reject('areas_invalid_json', 'A tabela de áreas deve ser válida.')
    }
    if (!Array.isArray(areas) || areas.length === 0 || areas.length > 50)
      return reject('areas_required', 'Informe entre 1 e 50 áreas para a prévia.')

    const normalizedAreas = []
    for (let index = 0; index < areas.length; index++) {
      const item = areas[index]
      if (!item || typeof item !== 'object' || Array.isArray(item))
        return reject('area_invalid', 'Cada linha de área deve ser um objeto válido.')
      const row = {
        item: typeof item.item === 'string' ? item.item.trim() : '',
        local: typeof item.local === 'string' ? item.local.trim() : '',
        area: typeof item.area === 'string' ? item.area.trim() : '',
        pathology: typeof item.pathology === 'string' ? item.pathology.trim() : '',
        solution: typeof item.solution === 'string' ? item.solution.trim() : '',
      }
      if (
        !row.item ||
        row.item.length > 30 ||
        !row.local ||
        row.local.length > 300 ||
        !row.area ||
        row.area.length > 80 ||
        !row.pathology ||
        row.pathology.length > 1000 ||
        !row.solution ||
        row.solution.length > 1000
      )
        return reject(
          'area_field_invalid',
          'Cada área precisa de item, local, área, patologia e solução válidos.',
        )
      if ([row.local, row.area, row.pathology, row.solution].some(hasCommercialData))
        return reject(
          'commercial_data_not_allowed',
          'A prévia é sem preço e não aceita dados de faturamento ou valores comerciais.',
        )
      normalizedAreas.push(row)
    }

    if (
      [
        body.proposal_number,
        body.revision,
        body.city,
        body.customer_cnpj,
        body.customer_address,
        body.local_obra,
        body.surface_type,
        body.solution_proposed,
        body.execution_start,
        body.execution_deadline,
      ].some(hasCommercialData)
    )
      return reject(
        'commercial_data_not_allowed',
        'A prévia é sem preço e não aceita dados de faturamento ou valores comerciais.',
      )

    let previewId = ''
    const templateVersion = Number.parseInt(template.getString('version') || '1', 10) || 1
    $app.runInTransaction((txApp) => {
      const record = new Record(txApp.findCollectionByNameOrId('proposal_previews'))
      record.set('opportunity_id', opportunity.id)
      record.set('template_id', template.id)
      record.set('family', body.family)
      record.set('proposal_number', body.proposal_number.trim())
      record.set('revision', body.revision.trim())
      record.set('proposal_date', body.proposal_date)
      record.set('city', body.city.trim())
      record.set('customer_name', opportunityCustomer)
      record.set('customer_cnpj', body.customer_cnpj.trim())
      record.set('customer_address', body.customer_address.trim())
      record.set('contact_name', opportunityContact)
      record.set('contact_email', opportunityEmail || (body.contact_email || '').trim())
      record.set('local_obra', body.local_obra.trim())
      record.set('surface_type', body.surface_type.trim())
      record.set('solution_proposed', body.solution_proposed.trim())
      record.set('execution_start', body.execution_start.trim())
      record.set('execution_deadline', body.execution_deadline.trim())
      record.set('areas', normalizedAreas)
      record.set('template_name', template.getString('name'))
      record.set('template_model_number', template.getString('model_number'))
      record.set('template_version', templateVersion)
      record.set('status', 'previa')
      record.set('created_by', e.auth.id)
      txApp.save(record)
      previewId = record.id

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'proposal_preview_created')
      audit.set('resource', 'proposal_previews/' + previewId)
      audit.set('outcome', 'success')
      audit.set('details', {
        opportunityId: opportunity.id,
        templateId: template.id,
        family: body.family,
        status: 'previa',
        priceFields: false,
        source: 'server_proposal_preview_create',
      })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(201, {
      id: previewId,
      opportunityId: opportunity.id,
      templateId: template.id,
      family: body.family,
      proposalNumber: body.proposal_number.trim(),
      revision: body.revision.trim(),
      proposalDate: body.proposal_date,
      city: body.city.trim(),
      customerName: opportunityCustomer,
      customerCnpj: body.customer_cnpj.trim(),
      customerAddress: body.customer_address.trim(),
      contactName: opportunityContact,
      contactEmail: opportunityEmail || (body.contact_email || '').trim(),
      localObra: body.local_obra.trim(),
      surfaceType: body.surface_type.trim(),
      solutionProposed: body.solution_proposed.trim(),
      executionStart: body.execution_start.trim(),
      executionDeadline: body.execution_deadline.trim(),
      areas: normalizedAreas,
      templateName: template.getString('name'),
      templateModelNumber: template.getString('model_number'),
      templateVersion,
      status: 'previa',
      createdAt: new Date().toISOString(),
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/proposal-previews',
  (e) => {
    const query = e.requestInfo().query || {}
    const opportunityId = typeof query.opportunityId === 'string' ? query.opportunityId.trim() : ''
    if (opportunityId && !/^[a-z0-9]{15}$/.test(opportunityId))
      return e.badRequestError('Informe uma demanda válida.')

    const filter = opportunityId
      ? 'opportunity_id = "' + opportunityId + '" && created_by = "' + e.auth.id + '"'
      : 'created_by = "' + e.auth.id + '"'
    const records = $app.findRecordsByFilter('proposal_previews', filter, '-created', 100, 0)
    const items = []
    for (const record of records) {
      let areas = []
      try {
        areas = JSON.parse(record.getString('areas') || '[]')
      } catch (_) {
        areas = []
      }
      items.push({
        id: record.id,
        opportunityId: record.getString('opportunity_id'),
        templateId: record.getString('template_id'),
        family: record.getString('family'),
        proposalNumber: record.getString('proposal_number'),
        revision: record.getString('revision'),
        proposalDate: record.getString('proposal_date'),
        city: record.getString('city'),
        customerName: record.getString('customer_name'),
        customerCnpj: record.getString('customer_cnpj'),
        customerAddress: record.getString('customer_address'),
        contactName: record.getString('contact_name'),
        contactEmail: record.getString('contact_email'),
        localObra: record.getString('local_obra'),
        surfaceType: record.getString('surface_type'),
        solutionProposed: record.getString('solution_proposed'),
        executionStart: record.getString('execution_start'),
        executionDeadline: record.getString('execution_deadline'),
        areas,
        templateName: record.getString('template_name'),
        templateModelNumber: record.getString('template_model_number'),
        templateVersion: Number.parseInt(record.getString('template_version') || '1', 10) || 1,
        status: record.getString('status'),
        createdAt: record.getString('created'),
      })
    }
    return e.json(200, { items })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/proposal-previews/send',
  (e) => {
    const body = e.requestInfo().body || {}
    const previewId = typeof body.id === 'string' ? body.id.trim() : ''
    if (!/^[a-z0-9]{15}$/.test(previewId)) return e.badRequestError('Informe a prévia a enviar.')

    let preview
    try {
      preview = $app.findRecordById('proposal_previews', previewId)
    } catch (_) {
      return e.badRequestError('Prévia não encontrada.')
    }
    if (preview.getString('created_by') !== e.auth.id)
      return e.forbiddenError('Acesso negado à prévia.')

    const receiptId = preview.id
    $app.runInTransaction((txApp) => {
      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'proposal_preview_send_blocked')
      audit.set('resource', 'proposal_previews/' + receiptId)
      audit.set('outcome', 'failure')
      audit.set('details', {
        reason: 'T1.14_preview_only',
        message: 'Prévia sem preço não pode ser enviada.',
        source: 'server_proposal_preview_send',
      })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(409, {
      result: 'bloqueado',
      previewId,
      errorDetail: 'Envio bloqueado: esta é uma prévia SEM PREÇO — NÃO ENVIAR.',
    })
  },
  $apis.requireAuth(),
)
