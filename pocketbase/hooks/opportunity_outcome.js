// Desfecho mínimo da proposta (RF-22; RN-17; emenda D-UX-01 de 09/11/2026).
// Registra "won" (ganha) ou "lost" (perdida) depois do envio. Perda exige motivo.
// Quem registra: o responsável pela oportunidade ou o Administrador.
// Um desfecho por oportunidade; não sobrescreve (append-only, como os marcos).
routerAdd(
  'POST',
  '/backend/v1/opportunities/outcome',
  (e) => {
    const body = e.requestInfo().body || {}
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')

    const reject = (reason, message) => {
      const audit = new Record(auditLogs)
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'opportunity_outcome_rejected')
      audit.set('resource', 'opportunities')
      audit.set('outcome', 'failure')
      audit.set('details', { reason: reason, source: 'server_outcome' })
      audit.set('retention_days', 365)
      $app.save(audit)
      return e.badRequestError(message)
    }

    if (e.auth.getBool('disabled')) return e.forbiddenError('Usuário desativado.')

    const opportunityId = typeof body.opportunity_id === 'string' ? body.opportunity_id.trim() : ''
    if (!/^[a-z0-9]{15}$/.test(opportunityId)) return reject('opportunity_id_required', 'Informe a oportunidade.')

    const outcome = typeof body.outcome === 'string' ? body.outcome.trim() : ''
    if (outcome !== 'won' && outcome !== 'lost') return reject('outcome_invalid', 'Desfecho inválido; use ganha ou perdida.')

    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    if (outcome === 'lost' && reason.length < 3) {
      return reject('loss_reason_required', 'Informe o motivo da perda (obrigatório).')
    }
    if (reason.length > 500) return reject('reason_too_long', 'O motivo pode ter até 500 caracteres.')

    let opportunity
    try {
      opportunity = $app.findRecordById('opportunities', opportunityId)
    } catch (_) {
      return reject('opportunity_not_found', 'Oportunidade não encontrada.')
    }
    const isOwner = opportunity.getString('responsible_user_id') === e.auth.id
    if (!isOwner && e.auth.getString('role') !== 'admin') {
      return e.forbiddenError('Somente o responsável ou o Administrador registram o desfecho.')
    }

    const existing = $app.findRecordsByFilter('opportunity_events', 'opportunity_id = {:id}', '', 50, 0, { id: opportunityId })
    const has = (target) => {
      for (const item of existing) {
        if (item.getString('milestone') === target) return true
      }
      return false
    }
    if (!has('sent')) return reject('outcome_requires_sent', 'Registre o envio da proposta antes do desfecho.')
    if (has('won') || has('lost')) return reject('outcome_duplicated', 'O desfecho desta oportunidade já foi registrado.')

    const occurredAt = new Date().toISOString()
    let eventId = ''
    $app.runInTransaction((txApp) => {
      const event = new Record(txApp.findCollectionByNameOrId('opportunity_events'))
      event.set('opportunity_id', opportunityId)
      event.set('milestone', outcome)
      event.set('note', reason)
      event.set('occurred_at', occurredAt)
      event.set('created_by', e.auth.id)
      txApp.save(event)
      eventId = event.id

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'opportunity_outcome_recorded')
      audit.set('resource', 'opportunities/' + opportunityId)
      audit.set('outcome', 'success')
      audit.set('details', { outcome: outcome, occurredAt: occurredAt, source: 'server_outcome' })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(201, { id: eventId, opportunityId: opportunityId, outcome: outcome, occurredAt: occurredAt })
  },
  $apis.requireAuth(),
)
