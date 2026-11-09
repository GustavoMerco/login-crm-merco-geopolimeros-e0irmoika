// Perfis e permissões administráveis (matriz perfil × módulo: ver/criar/editar/apagar).
// Tabela role_permissions (migration 0051), sem CRUD direto. Regras fixas:
// - Administrador sempre mantém acesso total a "usuarios" (evita trancar o sistema).
// - Criar, editar ou apagar implica ver.
// - Esta matriz controla menu/telas e a própria área de admin; as regras já
//   escritas em cada rota do servidor continuam valendo como piso (a matriz não
//   concede o que a rota nega).

routerAdd(
  'GET',
  '/backend/v1/me/permissions',
  (e) => {
    if (e.auth.getBool('disabled')) {
      return e.forbiddenError('Usuário desativado.')
    }
    const role = e.auth.getString('role')
    const rows = $app.findRecordsByFilter('role_permissions', 'role = {:role}', 'module', 100, 0, {
      role: role,
    })
    const modules = {}
    for (const row of rows) {
      modules[row.getString('module')] = {
        view: row.getBool('can_view'),
        create: row.getBool('can_create'),
        edit: row.getBool('can_edit'),
        delete: row.getBool('can_delete'),
      }
    }
    return e.json(200, { role: role, modules: modules })
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/admin/permissions',
  (e) => {
    const role = e.auth.getString('role')
    const allowed = (() => {
      if (role === 'admin') return true
      const rows = $app.findRecordsByFilter(
        'role_permissions',
        'role = {:role} && module = "usuarios"',
        '',
        1,
        0,
        { role: role },
      )
      return rows.length > 0 && rows[0].getBool('can_view')
    })()
    if (!allowed || e.auth.getBool('disabled')) {
      return e.forbiddenError('Somente quem administra usuários pode ver os perfis e permissões.')
    }
    const rows = $app.findRecordsByFilter('role_permissions', 'id != ""', 'role,module', 500, 0)
    const items = []
    for (const row of rows) {
      items.push({
        role: row.getString('role'),
        module: row.getString('module'),
        can_view: row.getBool('can_view'),
        can_create: row.getBool('can_create'),
        can_edit: row.getBool('can_edit'),
        can_delete: row.getBool('can_delete'),
        updated: row.getString('updated'),
        updated_by: row.getString('updated_by'),
      })
    }
    return e.json(200, { items: items })
  },
  $apis.requireAuth(),
)

routerAdd(
  'PUT',
  '/backend/v1/admin/permissions',
  (e) => {
    const ROLES = ['comercial', 'engenharia', 'financeiro', 'aprovador', 'gestao', 'admin']
    const MODULES = [
      'demandas',
      'clientes',
      'ficha',
      'biblioteca',
      'catalogo',
      'unidades',
      'parametros',
      'modelos',
      'painel',
      'evidencias',
      'usuarios',
    ]
    const role = e.auth.getString('role')
    const allowed = (() => {
      if (role === 'admin') return true
      const rows = $app.findRecordsByFilter(
        'role_permissions',
        'role = {:role} && module = "usuarios"',
        '',
        1,
        0,
        { role: role },
      )
      return rows.length > 0 && rows[0].getBool('can_edit')
    })()
    if (!allowed || e.auth.getBool('disabled')) {
      return e.forbiddenError('Somente quem administra usuários pode alterar permissões.')
    }

    const body = e.requestInfo().body || {}
    const input = Array.isArray(body.items) ? body.items : null
    if (!input || input.length === 0 || input.length > ROLES.length * MODULES.length) {
      return e.badRequestError('Envie a lista de permissões (items).')
    }

    const auditLogs = $app.findCollectionByNameOrId('audit_logs')
    let changed = 0
    $app.runInTransaction((txApp) => {
      for (const item of input) {
        if (!item || ROLES.indexOf(item.role) < 0 || MODULES.indexOf(item.module) < 0) {
          throw new BadRequestError('Perfil ou módulo inválido na matriz de permissões.')
        }
        const flags = {
          can_view: item.can_view === true,
          can_create: item.can_create === true,
          can_edit: item.can_edit === true,
          can_delete: item.can_delete === true,
        }
        if (flags.can_create || flags.can_edit || flags.can_delete) flags.can_view = true
        if (item.role === 'admin' && item.module === 'usuarios') {
          flags.can_view = true
          flags.can_create = true
          flags.can_edit = true
          flags.can_delete = true
        }
        const found = txApp.findRecordsByFilter(
          'role_permissions',
          'role = {:role} && module = {:module}',
          '',
          1,
          0,
          {
            role: item.role,
            module: item.module,
          },
        )
        let record = found.length > 0 ? found[0] : null
        if (!record) {
          record = new Record(txApp.findCollectionByNameOrId('role_permissions'))
          record.set('role', item.role)
          record.set('module', item.module)
        }
        const before = {
          can_view: record.getBool('can_view'),
          can_create: record.getBool('can_create'),
          can_edit: record.getBool('can_edit'),
          can_delete: record.getBool('can_delete'),
        }
        const same =
          found.length > 0 &&
          before.can_view === flags.can_view &&
          before.can_create === flags.can_create &&
          before.can_edit === flags.can_edit &&
          before.can_delete === flags.can_delete
        if (same) continue
        record.set('can_view', flags.can_view)
        record.set('can_create', flags.can_create)
        record.set('can_edit', flags.can_edit)
        record.set('can_delete', flags.can_delete)
        record.set('updated_by', e.auth.id)
        txApp.save(record)
        const audit = new Record(auditLogs)
        audit.set('actor_id', e.auth.id)
        audit.set('action', 'role_permission_updated')
        audit.set('resource', 'role_permissions')
        audit.set('outcome', 'success')
        audit.set('details', { role: item.role, module: item.module, before: before, after: flags })
        audit.set('retention_days', 365)
        txApp.save(audit)
        changed++
      }
    })
    return e.json(200, { changed: changed })
  },
  $apis.requireAuth(),
)
