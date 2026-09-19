migrate(
  (app) => {
    const usersId = app.findCollectionByNameOrId('_pb_users_auth_').id

    const templates = new Collection({
      name: 'proposal_templates',
      type: 'base',
      // Comercial pode cadastrar o modelo real como rascunho; o hook força status/autor.
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'family', type: 'text', required: true, max: 120 },
        { name: 'name', type: 'text', required: true, max: 200 },
        { name: 'model_number', type: 'text', max: 60 },
        { name: 'version', type: 'numeric', required: true, onlyInt: true, min: 1 },
        {
          name: 'file',
          type: 'file',
          required: true,
          maxSelect: 1,
          maxSize: 20971520,
          mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        },
        { name: 'variable_fields', type: 'json', required: false, maxSize: 100000 },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['rascunho', 'aprovado', 'inativo'],
          maxSelect: 1,
        },
        {
          name: 'approved_by',
          type: 'relation',
          required: false,
          collectionId: usersId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'approved_at', type: 'date' },
        {
          name: 'created_by',
          type: 'relation',
          required: true,
          collectionId: usersId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_proposal_templates_family ON proposal_templates (family, status)',
      ],
    })
    app.save(templates)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('proposal_templates'))
  },
)
