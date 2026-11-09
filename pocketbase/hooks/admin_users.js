// Usuários administráveis: listar, criar, alterar perfil/nome e desativar.
// Não há exclusão física: "apagar" um usuário = desativar (preserva autoria e
// auditoria). Cada rota confere a matriz role_permissions no módulo "usuarios";
// o Administrador sempre pode. Guardas: ninguém altera o próprio perfil nem se
// desativa, e o sistema nunca fica sem um administrador ativo.

routerAdd(
  'GET',
  '/backend/v1/admin/users',
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
      return e.forbiddenError('Somente quem administra usuários pode ver a lista.')
    }
    const records = $app.findRecordsByFilter('users', 'id != ""', 'name', 500, 0)
    const items = []
    for (const r of records) {
      items.push({
        id: r.id,
        name: r.getString('name'),
        email: r.email(),
        role: r.getString('role'),
        disabled: r.getBool('disabled'),
        created: r.getString('created'),
      })
    }
    return e.json(200, { items: items })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/admin/users',
  (e) => {
    const ROLES = ['comercial', 'engenharia', 'financeiro', 'aprovador', 'gestao', 'admin']
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
      return rows.length > 0 && rows[0].getBool('can_create')
    })()
    if (!allowed || e.auth.getBool('disabled')) {
      return e.forbiddenError('Somente quem administra usuários pode criar usuários.')
    }
    const body = e.requestInfo().body || {}
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const newRole = typeof body.role === 'string' ? body.role.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (name.length < 2 || name.length > 120)
      return e.badRequestError('Informe o nome (2 a 120 caracteres).')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200)
      return e.badRequestError('Informe um e-mail válido.')
    if (ROLES.indexOf(newRole) < 0) return e.badRequestError('Escolha um perfil válido.')
    if (password.length < 10 || password.length > 72)
      return e.badRequestError('A senha inicial precisa ter de 10 a 72 caracteres.')
    if (role !== 'admin' && newRole === 'admin')
      return e.forbiddenError('Somente um Administrador pode criar outro Administrador.')

    const existing = $app.findRecordsByFilter('users', 'email = {:email}', '', 1, 0, {
      email: email,
    })
    if (existing.length > 0) {
      return e.json(409, {
        error: 'Já existe um usuário com este e-mail.',
        reason: 'email_taken',
        field: 'email',
      })
    }

    const record = new Record($app.findCollectionByNameOrId('users'))
    record.setEmail(email)
    record.setPassword(password)
    record.setVerified(true)
    record.set('name', name)
    record.set('role', newRole)
    record.set('disabled', false)
    $app.save(record)

    const audit = new Record($app.findCollectionByNameOrId('audit_logs'))
    audit.set('actor_id', e.auth.id)
    audit.set('action', 'user_created')
    audit.set('resource', 'users')
    audit.set('outcome', 'success')
    audit.set('details', { user_id: record.id, role: newRole })
    audit.set('retention_days', 365)
    $app.save(audit)

    return e.json(201, { id: record.id, name: name, email: email, role: newRole, disabled: false })
  },
  $apis.requireAuth(),
)

routerAdd(
  'PATCH',
  '/backend/v1/admin/users/{id}',
  (e) => {
    const ROLES = ['comercial', 'engenharia', 'financeiro', 'aprovador', 'gestao', 'admin']
    const role = e.auth.getString('role')
    const flag = (name) => {
      if (role === 'admin') return true
      const rows = $app.findRecordsByFilter(
        'role_permissions',
        'role = {:role} && module = "usuarios"',
        '',
        1,
        0,
        { role: role },
      )
      return rows.length > 0 && rows[0].getBool(name)
    }
    if (e.auth.getBool('disabled') || !flag('can_edit')) {
      return e.forbiddenError('Somente quem administra usuários pode alterar usuários.')
    }

    const id = e.request.pathValue('id')
    if (!/^[a-z0-9]{15}$/.test(id)) return e.badRequestError('Usuário inválido.')
    let user
    try {
      user = $app.findRecordById('users', id)
    } catch (_) {
      return e.notFoundError('Usuário não encontrado.')
    }

    const body = e.requestInfo().body || {}
    const isSelf = id === e.auth.id
    const changes = {}

    if (typeof body.name === 'string') {
      const name = body.name.trim()
      if (name.length < 2 || name.length > 120)
        return e.badRequestError('Informe o nome (2 a 120 caracteres).')
      changes.name = name
    }
    if (typeof body.role === 'string') {
      const newRole = body.role.trim()
      if (ROLES.indexOf(newRole) < 0) return e.badRequestError('Escolha um perfil válido.')
      if (isSelf && newRole !== user.getString('role'))
        return e.badRequestError('Você não pode alterar o seu próprio perfil.')
      if (role !== 'admin' && (newRole === 'admin' || user.getString('role') === 'admin')) {
        return e.forbiddenError('Somente um Administrador altera o perfil de Administrador.')
      }
      changes.role = newRole
    }
    if (typeof body.disabled === 'boolean') {
      if (isSelf && body.disabled)
        return e.badRequestError('Você não pode desativar o seu próprio acesso.')
      if (body.disabled && !flag('can_delete'))
        return e.forbiddenError('Seu perfil não pode desativar usuários.')
      changes.disabled = body.disabled
    }
    if (Object.keys(changes).length === 0) return e.badRequestError('Nada para alterar.')

    const losesAdmin =
      user.getString('role') === 'admin' &&
      !user.getBool('disabled') &&
      ((changes.role !== undefined && changes.role !== 'admin') || changes.disabled === true)
    if (losesAdmin) {
      const activeAdmins = $app.findRecordsByFilter(
        'users',
        'role = "admin" && disabled != true',
        '',
        2,
        0,
      )
      if (activeAdmins.length <= 1) {
        return e.badRequestError('O sistema precisa de pelo menos um Administrador ativo.')
      }
    }

    const before = {
      name: user.getString('name'),
      role: user.getString('role'),
      disabled: user.getBool('disabled'),
    }
    if (changes.name !== undefined) user.set('name', changes.name)
    if (changes.role !== undefined) user.set('role', changes.role)
    if (changes.disabled !== undefined) {
      user.set('disabled', changes.disabled)
      // Desativar derruba as sessões abertas (tokens antigos deixam de valer).
      if (changes.disabled) user.refreshTokenKey()
    }
    $app.save(user)

    const audit = new Record($app.findCollectionByNameOrId('audit_logs'))
    audit.set('actor_id', e.auth.id)
    audit.set('action', changes.disabled === true ? 'user_disabled' : 'user_updated')
    audit.set('resource', 'users')
    audit.set('outcome', 'success')
    audit.set('details', { user_id: id, before: before, after: changes })
    audit.set('retention_days', 365)
    $app.save(audit)

    return e.json(200, {
      id: user.id,
      name: user.getString('name'),
      email: user.email(),
      role: user.getString('role'),
      disabled: user.getBool('disabled'),
    })
  },
  $apis.requireAuth(),
)
