routerAdd(
  'POST',
  '/backend/v1/auth/revoke-session',
  (e) => {
    const body = e.requestInfo().body || {}
    const reason = body.reason === undefined ? 'user_requested' : body.reason

    if (typeof reason !== 'string' || reason.length < 1 || reason.length > 120) {
      return e.badRequestError('O motivo da revogação deve ter entre 1 e 120 caracteres.')
    }

    $app.runInTransaction((txApp) => {
      const auditLogs = txApp.findCollectionByNameOrId('audit_logs')
      const audit = new Record(auditLogs)
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'session_revoked')
      audit.set('resource', 'users/' + e.auth.id)
      audit.set('outcome', 'success')
      audit.set('details', { reason, source: 'server_session_revoke' })
      audit.set('retention_days', 365)
      txApp.save(audit)

      const user = txApp.findRecordById('users', e.auth.id)
      user.set('tokenKey', $security.randomString(50))
      txApp.save(user)
    })

    return e.json(200, { revoked: true })
  },
  $apis.requireAuth(),
)
