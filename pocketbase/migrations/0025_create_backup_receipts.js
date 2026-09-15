migrate(
  (app) => {
    const usersId = app.findCollectionByNameOrId('_pb_users_auth_').id

    const receipts = new Collection({
      name: 'backup_receipts',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'kind',
          type: 'select',
          required: true,
          values: ['backup', 'restauracao', 'exportacao'],
          maxSelect: 1,
        },
        {
          name: 'result',
          type: 'select',
          required: true,
          values: ['sucesso', 'falha'],
          maxSelect: 1,
        },
        { name: 'payload_hash', type: 'text', max: 64 },
        { name: 'expected_hash', type: 'text', max: 64 },
        { name: 'counts', type: 'json', required: false, maxSize: 2000000 },
        { name: 'error_detail', type: 'text', max: 1000 },
        {
          name: 'origin',
          type: 'select',
          required: true,
          values: ['manual', 'agendado'],
          maxSelect: 1,
        },
        {
          name: 'created_by',
          type: 'relation',
          required: true,
          collectionId: usersId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      ],
      indexes: [
        'CREATE INDEX idx_backup_receipts_author ON backup_receipts (created_by)',
        'CREATE INDEX idx_backup_receipts_kind ON backup_receipts (kind, result)',
      ],
    })
    app.save(receipts)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('backup_receipts'))
  },
)
