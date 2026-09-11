routerAdd(
  'POST',
  '/backend/v1/opportunities/{id}/aptitude',
  (e) => {
    const id = e.request.pathValue('id')
    const body = e.requestInfo().body || {}
    const opportunity = $app.findRecordById('opportunities', id)

    if (opportunity.getString('responsible_user_id') !== e.auth.id) {
      return e.forbiddenError('Somente o responsável pode avaliar esta oportunidade.')
    }

    const checklist = {
      customer_name: opportunity.getString('customer_name').trim().length > 0,
      contact_name: opportunity.getString('contact_name').trim().length > 0,
      origin: opportunity.getString('origin').trim().length > 0,
      service_family: opportunity.getString('service_family').trim().length > 0,
      location: opportunity.getString('location').trim().length > 0,
      demand_date: opportunity.getString('demand_date').trim().length > 0,
    }
    const pendingItems = Object.entries(checklist)
      .filter(([, complete]) => !complete)
      .map(([field]) => field)

    const wantsException = body.allow_exception === true
    const role = e.auth.getString('role')
    const canAuthorizeException = role === 'engenharia' || role === 'admin'
    const justification =
      typeof body.exception_justification === 'string' ? body.exception_justification.trim() : ''

    if (wantsException && !canAuthorizeException) {
      return e.forbiddenError('Somente Engenharia ou Administrador podem autorizar exceções.')
    }

    if (wantsException && justification.length < 10) {
      return e.badRequestError('A justificativa da exceção deve ter pelo menos 10 caracteres.')
    }

    const aptitudeStatus =
      pendingItems.length === 0 ? 'apt' : wantsException ? 'exception_approved' : 'blocked'
    const opportunityStatus = aptitudeStatus === 'blocked' ? 'blocked' : 'apt'
    const evaluatedAt = new Date().toISOString()

    $app.runInTransaction((txApp) => {
      const current = txApp.findRecordById('opportunities', id)
      current.set('checklist', checklist)
      current.set('pending_items', pendingItems)
      current.set('aptitude_status', aptitudeStatus)
      current.set('status', opportunityStatus)
      current.set('aptitude_evaluated_at', evaluatedAt)

      if (wantsException) {
        current.set('exception_justification', justification)
        current.set('exception_authorized_by', e.auth.id)
      } else {
        current.set('exception_justification', '')
        current.set('exception_authorized_by', '')
      }
      txApp.save(current)

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'opportunity_aptitude_evaluated')
      audit.set('resource', 'opportunities/' + id)
      audit.set('outcome', aptitudeStatus === 'blocked' ? 'denied' : 'success')
      audit.set('details', {
        aptitudeStatus,
        pendingItems,
        exception: wantsException,
        source: 'server_aptitude_evaluation',
      })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(200, {
      id,
      aptitudeStatus,
      status: opportunityStatus,
      checklist,
      pendingItems,
      evaluatedAt,
    })
  },
  $apis.requireAuth(),
)
