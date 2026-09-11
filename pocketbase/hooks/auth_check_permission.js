routerAdd(
  'POST',
  '/backend/v1/auth/check-permission',
  (e) => {
    const body = e.requestInfo().body || {}
    const permission = body.permission
    const permissions = {
      viewDashboard: ['comercial', 'engenharia', 'financeiro', 'aprovador', 'gestao', 'admin'],
      homologateCatalog: ['engenharia', 'admin'],
    }

    if (
      typeof permission !== 'string' ||
      !Object.prototype.hasOwnProperty.call(permissions, permission)
    ) {
      return e.badRequestError('Permissão inválida.')
    }

    const role = e.auth.getString('role')
    const allowed = permissions[permission].includes(role)
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditLogs)
    audit.set('actor_id', e.auth.id)
    audit.set('action', 'permission_check')
    audit.set('resource', permission)
    audit.set('outcome', allowed ? 'allowed' : 'denied')
    audit.set('details', { role, source: 'server_permission_check' })
    audit.set('retention_days', 365)
    $app.save(audit)

    return e.json(200, { allowed, permission })
  },
  $apis.requireAuth(),
)
