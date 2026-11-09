// Perfis e permissões administráveis (área de admin).
// - role_permissions: matriz perfil × módulo com ver/criar/editar/apagar,
//   lida e alterada SOMENTE pelas rotas /backend/v1/admin/* (CRUD direto negado).
// - users.disabled: desativar em vez de apagar (preserva autoria e auditoria).
// - Configuração inicial: matriz padrão por perfil e, se não houver nenhum
//   administrador, o usuário semeado do projeto (Paulo Romeiro) vira admin.
// Migration aditiva: não altera registros de negócio.
migrate(
  (app) => {
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
    // [ver, criar, editar, apagar]
    const NONE = [false, false, false, false]
    const VIEW = [true, false, false, false]
    const WRITE = [true, true, true, false]
    const FULL = [true, true, true, true]
    const DEFAULTS = {
      admin: {
        demandas: FULL,
        clientes: FULL,
        ficha: FULL,
        biblioteca: FULL,
        catalogo: FULL,
        unidades: FULL,
        parametros: FULL,
        modelos: FULL,
        painel: VIEW,
        evidencias: FULL,
        usuarios: FULL,
      },
      engenharia: {
        demandas: WRITE,
        clientes: WRITE,
        ficha: WRITE,
        biblioteca: WRITE,
        catalogo: WRITE,
        unidades: WRITE,
        parametros: WRITE,
        modelos: WRITE,
        painel: VIEW,
        evidencias: VIEW,
        usuarios: NONE,
      },
      comercial: {
        demandas: WRITE,
        clientes: WRITE,
        ficha: VIEW,
        biblioteca: VIEW,
        catalogo: NONE,
        unidades: NONE,
        parametros: NONE,
        modelos: NONE,
        painel: VIEW,
        evidencias: NONE,
        usuarios: NONE,
      },
      financeiro: {
        demandas: VIEW,
        clientes: VIEW,
        ficha: NONE,
        biblioteca: NONE,
        catalogo: VIEW,
        unidades: NONE,
        parametros: WRITE,
        modelos: VIEW,
        painel: VIEW,
        evidencias: NONE,
        usuarios: NONE,
      },
      aprovador: {
        demandas: VIEW,
        clientes: VIEW,
        ficha: VIEW,
        biblioteca: NONE,
        catalogo: NONE,
        unidades: NONE,
        parametros: VIEW,
        modelos: VIEW,
        painel: VIEW,
        evidencias: NONE,
        usuarios: NONE,
      },
      gestao: {
        demandas: VIEW,
        clientes: VIEW,
        ficha: VIEW,
        biblioteca: VIEW,
        catalogo: VIEW,
        unidades: VIEW,
        parametros: VIEW,
        modelos: VIEW,
        painel: VIEW,
        evidencias: VIEW,
        usuarios: NONE,
      },
    }

    const collection = new Collection({
      name: 'role_permissions',
      type: 'base',
      // CRUD direto negado: leitura e alteração só pelas rotas /backend/v1/admin/*
      // e /backend/v1/me/permissions, que validam o papel e auditam.
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
    })
    collection.fields.add(new TextField({ name: 'role', required: true, max: 40 }))
    collection.fields.add(new TextField({ name: 'module', required: true, max: 40 }))
    collection.fields.add(new BoolField({ name: 'can_view' }))
    collection.fields.add(new BoolField({ name: 'can_create' }))
    collection.fields.add(new BoolField({ name: 'can_edit' }))
    collection.fields.add(new BoolField({ name: 'can_delete' }))
    collection.fields.add(new TextField({ name: 'updated_by', max: 40 }))
    collection.fields.add(new AutodateField({ name: 'created', onCreate: true, onUpdate: false }))
    collection.fields.add(new AutodateField({ name: 'updated', onCreate: true, onUpdate: true }))
    collection.indexes = [
      'CREATE UNIQUE INDEX idx_role_permissions_role_module ON role_permissions (role, module)',
    ]
    app.save(collection)

    const saved = app.findCollectionByNameOrId('role_permissions')
    for (const role of Object.keys(DEFAULTS)) {
      for (const module of MODULES) {
        const flags = DEFAULTS[role][module] || NONE
        const record = new Record(saved)
        record.set('role', role)
        record.set('module', module)
        record.set('can_view', flags[0])
        record.set('can_create', flags[1])
        record.set('can_edit', flags[2])
        record.set('can_delete', flags[3])
        record.set('updated_by', 'migration_0051')
        app.save(record)
      }
    }

    // "disabled" (padrão falso) em vez de "active": usuário criado por qualquer
    // outro caminho continua com acesso; só quem for desativado perde.
    const users = app.findCollectionByNameOrId('users')
    if (!users.fields.getByName('disabled')) {
      users.fields.add(new BoolField({ name: 'disabled' }))
      app.save(users)
    }

    const admins = app.findRecordsByFilter('users', 'role = "admin"', '', 1, 0)
    if (admins.length === 0) {
      try {
        const owner = app.findFirstRecordByData('users', 'email', 'paulo.romeiro@mercogeo.com.br')
        if (owner) {
          owner.set('role', 'admin')
          app.save(owner)
        }
      } catch (_) {
        // Sem o usuário semeado: o primeiro admin é definido pelo painel do PocketBase.
      }
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('role_permissions'))
    } catch (_) {}
    const users = app.findCollectionByNameOrId('users')
    if (users.fields.getByName('disabled')) {
      users.fields.removeByName('disabled')
      app.save(users)
    }
  },
)
