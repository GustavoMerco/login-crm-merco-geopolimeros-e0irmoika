routerAdd(
  'POST',
  '/backend/v1/pilot-params',
  (e) => {
    const body = e.requestInfo().body || {}
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')

    const writeRejectedAudit = (reason) => {
      const rejectedAudit = new Record(auditLogs)
      rejectedAudit.set('actor_id', e.auth.id)
      rejectedAudit.set('action', 'pilot_param_rejected')
      rejectedAudit.set('resource', 'pilot_params')
      rejectedAudit.set('outcome', 'failure')
      rejectedAudit.set('details', { reason, source: 'server_pilot_param_create' })
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

    const paramType = typeof body.param_type === 'string' ? body.param_type.trim() : ''
    if (!['bdi', 'iss', 'margem', 'sla', 'alcada', 'arredondamento'].includes(paramType)) {
      return reject(
        'param_type_invalid',
        'Tipo inválido; use bdi, iss, margem, sla, alcada ou arredondamento.',
      )
    }

    const family = text(body.family, 120)
    if (!family) return reject('family_required', 'Informe a família do parâmetro.')

    const source = text(body.source, 200)
    if (!source) return reject('source_required', 'Informe a fonte da decisão.')

    const value = typeof body.value === 'string' ? body.value.trim().slice(0, 200) : ''
    const unit = typeof body.unit === 'string' ? body.unit.trim().slice(0, 40) : ''
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 1000) : ''

    const decision = typeof body.decision === 'string' ? body.decision.trim() : 'rascunho'
    if (!['rascunho', 'bloqueado'].includes(decision)) {
      return reject(
        'decision_invalid',
        'O registro nasce como rascunho ou bloqueado; homologação é feita por Engenharia/Admin.',
      )
    }

    let blockedReason = ''
    let blockedOwner = ''
    let blockedDeadline = ''

    if (decision === 'bloqueado') {
      blockedReason = text(body.blocked_reason, 1000)
      if (!blockedReason) {
        return reject('blocked_reason_required', 'O bloqueio exige motivo explícito.')
      }
      blockedOwner = text(body.blocked_owner, 200)
      if (!blockedOwner) {
        return reject('blocked_owner_required', 'O bloqueio exige dono registrado.')
      }
      if (!isIsoDate(body.blocked_deadline)) {
        return reject('blocked_deadline_required', 'O bloqueio exige data-limite.')
      }
      blockedDeadline = body.blocked_deadline
    }

    let paramId = ''
    $app.runInTransaction((txApp) => {
      const collection = txApp.findCollectionByNameOrId('pilot_params')
      const param = new Record(collection)
      param.set('param_type', paramType)
      param.set('family', family)
      param.set('value', value)
      param.set('unit', unit)
      param.set('source', source)
      param.set('decision', decision)
      param.set('blocked_reason', blockedReason)
      param.set('blocked_owner', blockedOwner)
      param.set('blocked_deadline', blockedDeadline)
      param.set('notes', notes)
      param.set('created_by', e.auth.id)
      txApp.save(param)
      paramId = param.id

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'pilot_param_created')
      audit.set('resource', 'pilot_params/' + param.id)
      audit.set('outcome', 'success')
      audit.set('details', { paramType, family, decision, source: 'server_pilot_param_create' })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(201, { id: paramId, decision })
  },
  $apis.requireAuth(),
)
