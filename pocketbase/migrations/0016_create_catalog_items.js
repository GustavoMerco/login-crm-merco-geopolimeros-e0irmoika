migrate(
  (app) => {
    const usersId = app.findCollectionByNameOrId('_pb_users_auth_').id

    const catalog = new Collection({
      name: 'catalog_items',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'family', type: 'text', required: true, max: 120 },
        {
          name: 'item_type',
          type: 'select',
          required: true,
          values: ['servico', 'composicao', 'recurso'],
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true, max: 200 },
        { name: 'description', type: 'text', max: 1000 },
        { name: 'unit', type: 'text', required: true, max: 40 },
        { name: 'coefficient', type: 'text', max: 100 },
        { name: 'source', type: 'text', required: true, max: 200 },
        { name: 'valid_from', type: 'date', required: true },
        { name: 'valid_until', type: 'date', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['rascunho', 'homologado', 'inativo'],
          maxSelect: 1,
        },
        { name: 'inactive_reason', type: 'text', max: 1000 },
        {
          name: 'created_by',
          type: 'relation',
          required: true,
          collectionId: usersId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'homologated_by',
          type: 'relation',
          required: false,
          collectionId: usersId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'homologated_at', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_catalog_author ON catalog_items (created_by)',
        'CREATE INDEX idx_catalog_family_status ON catalog_items (family, status)',
      ],
    })
    app.save(catalog)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('catalog_items'))
  },
)
