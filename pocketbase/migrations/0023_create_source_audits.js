migrate(
  (app) => {
    const usersId = app.findCollectionByNameOrId('_pb_users_auth_').id

    const audits = new Collection({
      name: 'source_audits',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'system',
          type: 'select',
          required: true,
          values: ['vobi', 'omie'],
          maxSelect: 1,
        },
        { name: 'coverage', type: 'text', required: true, max: 1000 },
        { name: 'source_of_truth', type: 'text', required: true, max: 500 },
        {
          name: 'access_method',
          type: 'select',
          required: true,
          values: ['manual', 'exportacao', 'api'],
          maxSelect: 1,
        },
        { name: 'fields_available', type: 'text', max: 2000 },
        { name: 'gaps', type: 'text', max: 2000 },
        {
          name: 'decision',
          type: 'select',
          required: true,
          values: ['integrar', 'importar', 'nao_usar'],
          maxSelect: 1,
        },
        { name: 'decision_reason', type: 'text', required: true, max: 1000 },
        { name: 'decision_owner', type: 'text', required: true, max: 200 },
        { name: 'decision_date', type: 'date', required: true },
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
        'CREATE INDEX idx_source_audits_author ON source_audits (created_by)',
        'CREATE INDEX idx_source_audits_system ON source_audits (system)',
      ],
    })
    app.save(audits)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('source_audits'))
  },
)
