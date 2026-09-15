routerAdd(
  'POST',
  '/backend/v1/opportunities',
  (e) => {
    const body = e.requestInfo().body || {}
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')

    const writeRejectedAudit = (reason) => {
      const rejectedAudit = new Record(auditLogs)
      rejectedAudit.set('actor_id', e.auth.id)
      rejectedAudit.set('action', 'opportunity_create_rejected')
      rejectedAudit.set('resource', 'opportunities')
      rejectedAudit.set('outcome', 'failure')
      rejectedAudit.set('details', { reason, source: 'server_opportunity_create' })
      rejectedAudit.set('retention_days', 365)
      $app.save(rejectedAudit)
    }

    const reject = (reason, message) => {
      writeRejectedAudit(reason)
      return e.badRequestError(message)
    }

    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return reject('invalid_body', 'Informe os dados da demanda em formato válido.')
    }

    if (
      Object.prototype.hasOwnProperty.call(body, 'received_at') ||
      Object.prototype.hasOwnProperty.call(body, 'receivedAt')
    ) {
      return reject(
        'client_supplied_received_at',
        'A data de recebimento é definida pelo servidor e não pode ser informada pelo cliente.',
      )
    }

    if (Object.prototype.hasOwnProperty.call(body, 'responsible_user_id')) {
      return reject(
        'client_supplied_responsible_user',
        'O responsável é definido pela sessão autenticada.',
      )
    }

    const requiredText = (field, max) =>
      typeof body[field] === 'string' &&
      body[field].trim().length > 0 &&
      body[field].trim().length <= max

    if (!requiredText('customer_name', 200)) {
      return reject('customer_name_required', 'Informe o cliente.')
    }
    if (!requiredText('contact_name', 200)) {
      return reject('contact_name_required', 'Informe o contato.')
    }
    if (!requiredText('origin', 120)) {
      return reject('origin_required', 'Informe a origem da demanda.')
    }
    if (!requiredText('service_family', 120)) {
      return reject('service_family_required', 'Informe a família de serviço.')
    }
    if (!requiredText('location', 300)) {
      return reject('location_required', 'Informe o local do serviço.')
    }

    if (
      body.contact_email !== undefined &&
      body.contact_email !== null &&
      body.contact_email !== '' &&
      (typeof body.contact_email !== 'string' ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.contact_email.trim()))
    ) {
      return reject('contact_email_invalid', 'Informe um e-mail de contato válido.')
    }

    const isIsoDate = (value) => {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
      const parsed = new Date(value + 'T00:00:00.000Z')
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    }

    if (!isIsoDate(body.demand_date)) {
      return reject('demand_date_invalid', 'Informe a data da demanda no formato válido.')
    }

    const today = new Date().toISOString().slice(0, 10)
    if (body.demand_date > today) {
      return reject('demand_date_future', 'A data da demanda não pode estar no futuro.')
    }

    if (
      body.deadline_date !== undefined &&
      body.deadline_date !== null &&
      body.deadline_date !== '' &&
      !isIsoDate(body.deadline_date)
    ) {
      return reject('deadline_date_invalid', 'Informe um prazo válido.')
    }

    const receivedAt = new Date().toISOString()
    let opportunityId = ''

    $app.runInTransaction((txApp) => {
      const opportunities = txApp.findCollectionByNameOrId('opportunities')
      const opportunity = new Record(opportunities)
      opportunity.set('customer_name', body.customer_name.trim())
      opportunity.set('contact_name', body.contact_name.trim())
      opportunity.set(
        'contact_email',
        typeof body.contact_email === 'string' ? body.contact_email.trim() : '',
      )
      opportunity.set('origin', body.origin.trim())
      opportunity.set('service_family', body.service_family.trim())
      opportunity.set('location', body.location.trim())
      opportunity.set('responsible_user_id', e.auth.id)
      opportunity.set('demand_date', body.demand_date)
      if (body.deadline_date) opportunity.set('deadline_date', body.deadline_date)
      opportunity.set('received_at', receivedAt)
      opportunity.set('status', 'received')
      txApp.save(opportunity)
      opportunityId = opportunity.id

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'opportunity_created')
      audit.set('resource', 'opportunities/' + opportunity.id)
      audit.set('outcome', 'success')
      audit.set('details', {
        source: 'server_opportunity_create',
        receivedAt,
        demandDate: body.demand_date,
      })
      audit.set('retention_days', 365)
      txApp.save(audit)

      const event = new Record(txApp.findCollectionByNameOrId('opportunity_events'))
      event.set('opportunity_id', opportunity.id)
      event.set('milestone', 'received')
      event.set('occurred_at', receivedAt)
      event.set('created_by', e.auth.id)
      txApp.save(event)
    })

    return e.json(201, {
      id: opportunityId,
      receivedAt,
      status: 'received',
    })
  },
  $apis.requireAuth(),
)
