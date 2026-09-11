migrate(
  (app) => {
    const auditLogs = new Collection({
      name: 'audit_logs',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'actor_id',
          type: 'relation',
          required: false,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'action', type: 'text', required: true, max: 80 },
        { name: 'resource', type: 'text', required: false, max: 120 },
        {
          name: 'outcome',
          type: 'select',
          required: true,
          values: ['allowed', 'denied', 'success', 'failure'],
          maxSelect: 1,
        },
        { name: 'details', type: 'json', required: false, maxSize: 20000 },
        {
          name: 'retention_days',
          type: 'number',
          required: true,
          onlyInt: true,
          min: 365,
          max: 365,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_audit_logs_created ON audit_logs (created)',
        'CREATE INDEX idx_audit_logs_actor_created ON audit_logs (actor_id, created)',
      ],
    })
    app.save(auditLogs)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('audit_logs'))
  },
)
