migrate(
  (app) => {
    const opportunitiesId = app.findCollectionByNameOrId('opportunities').id
    const usersId = app.findCollectionByNameOrId('_pb_users_auth_').id

    const events = new Collection({
      name: 'opportunity_events',
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
        {
          name: 'milestone',
          type: 'select',
          required: true,
          values: ['received', 'apt', 'ready', 'sent'],
          maxSelect: 1,
        },
        { name: 'note', type: 'text', max: 500 },
        { name: 'occurred_at', type: 'date', required: true },
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
        'CREATE UNIQUE INDEX idx_opportunity_events_unique ON opportunity_events (opportunity_id, milestone)',
        'CREATE INDEX idx_opportunity_events_opportunity ON opportunity_events (opportunity_id)',
      ],
    })
    app.save(events)

    const timeEntries = new Collection({
      name: 'active_time_entries',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (opportunity_id.responsible_user_id = @request.auth.id || user_id = @request.auth.id)",
      viewRule:
        "@request.auth.id != '' && (opportunity_id.responsible_user_id = @request.auth.id || user_id = @request.auth.id)",
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
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: usersId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'stage',
          type: 'select',
          required: true,
          values: ['qualificacao', 'portal', 'ficha_tecnica', 'revisao', 'outro'],
          maxSelect: 1,
        },
        { name: 'started_at', type: 'date', required: true },
        { name: 'ended_at', type: 'date' },
        { name: 'pause_reason', type: 'text', max: 500 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_time_entries_opportunity ON active_time_entries (opportunity_id)',
        'CREATE INDEX idx_time_entries_user ON active_time_entries (user_id)',
      ],
    })
    app.save(timeEntries)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('active_time_entries'))
    app.delete(app.findCollectionByNameOrId('opportunity_events'))
  },
)
