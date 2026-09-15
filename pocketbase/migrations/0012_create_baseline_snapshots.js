migrate(
  (app) => {
    const usersId = app.findCollectionByNameOrId('_pb_users_auth_').id

    const baselines = new Collection({
      name: 'baseline_snapshots',
      type: 'base',
      listRule: "@request.auth.id != '' && created_by = @request.auth.id",
      viewRule: "@request.auth.id != '' && created_by = @request.auth.id",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'service_family', type: 'text', required: true, max: 120 },
        { name: 'complexity_class', type: 'text', required: true, max: 120 },
        { name: 'window_start', type: 'date', required: true },
        { name: 'window_end', type: 'date', required: true },
        { name: 'frozen_at', type: 'date', required: true },
        { name: 'calendar', type: 'text', required: true, max: 120 },
        { name: 'volume', type: 'number', required: true, onlyInt: true, min: 0 },
        { name: 'received_to_apt_ms', type: 'number', required: true, onlyInt: true, min: 0 },
        { name: 'apt_to_ready_ms', type: 'number', required: true, onlyInt: true, min: 0 },
        { name: 'ready_to_sent_ms', type: 'number', required: true, onlyInt: true, min: 0 },
        { name: 'active_time_ms', type: 'number', required: true, onlyInt: true, min: 0 },
        { name: 'reliability_criteria', type: 'text', required: true, max: 2000 },
        { name: 'freeze_reason', type: 'text', required: true, max: 1000 },
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
        'CREATE INDEX idx_baselines_author ON baseline_snapshots (created_by)',
        'CREATE INDEX idx_baselines_window ON baseline_snapshots (window_start, window_end)',
      ],
    })
    app.save(baselines)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('baseline_snapshots'))
  },
)
