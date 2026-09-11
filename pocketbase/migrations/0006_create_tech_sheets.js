migrate(
  (app) => {
    const opportunitiesId = app.findCollectionByNameOrId('opportunities').id
    const usersId = app.findCollectionByNameOrId('_pb_users_auth_').id

    const techSheets = new Collection({
      name: 'tech_sheets',
      type: 'base',
      listRule: "@request.auth.id != '' && opportunity_id.responsible_user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && opportunity_id.responsible_user_id = @request.auth.id",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'opportunity_id',
          type: 'relation',
          required: true,
          collectionId: opportunitiesId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'version', type: 'number', required: true, onlyInt: true, min: 1 },
        { name: 'parameters', type: 'json', required: true, maxSize: 50000 },
        { name: 'pending_items', type: 'json', maxSize: 10000 },
        { name: 'notes', type: 'text', max: 2000 },
        {
          name: 'attachments',
          type: 'file',
          maxSelect: 10,
          maxSize: 26214400,
          protected: true,
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
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_tech_sheets_opportunity_version ON tech_sheets (opportunity_id, version)',
        'CREATE INDEX idx_tech_sheets_opportunity ON tech_sheets (opportunity_id)',
      ],
    })
    app.save(techSheets)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('tech_sheets'))
  },
)
