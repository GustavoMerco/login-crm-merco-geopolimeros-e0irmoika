migrate(
  (app) => {
    const usersId = app.findCollectionByNameOrId('_pb_users_auth_').id

    const params = new Collection({
      name: 'pilot_params',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'param_type',
          type: 'select',
          required: true,
          values: ['bdi', 'iss', 'margem', 'sla', 'alcada', 'arredondamento'],
          maxSelect: 1,
        },
        { name: 'family', type: 'text', required: true, max: 120 },
        { name: 'value', type: 'text', max: 200 },
        { name: 'unit', type: 'text', max: 40 },
        { name: 'source', type: 'text', required: true, max: 200 },
        {
          name: 'decision',
          type: 'select',
          required: true,
          values: ['rascunho', 'homologado', 'bloqueado'],
          maxSelect: 1,
        },
        { name: 'blocked_reason', type: 'text', max: 1000 },
        { name: 'blocked_owner', type: 'text', max: 200 },
        { name: 'blocked_deadline', type: 'date' },
        { name: 'notes', type: 'text', max: 1000 },
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
        'CREATE INDEX idx_pilot_params_author ON pilot_params (created_by)',
        'CREATE INDEX idx_pilot_params_type_family ON pilot_params (param_type, family, decision)',
      ],
    })
    app.save(params)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('pilot_params'))
  },
)
