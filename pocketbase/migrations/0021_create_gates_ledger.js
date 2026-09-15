migrate(
  (app) => {
    const usersId = app.findCollectionByNameOrId('_pb_users_auth_').id

    const gates = new Collection({
      name: 'gates_ledger',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'title', type: 'text', required: true, max: 200 },
        { name: 'description', type: 'text', max: 1000 },
        { name: 'owner', type: 'text', required: true, max: 200 },
        { name: 'decision_deadline', type: 'date', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['aberto', 'resolvido', 'escalonado'],
          maxSelect: 1,
        },
        { name: 'resolution', type: 'text', max: 1000 },
        {
          name: 'created_by',
          type: 'relation',
          required: true,
          collectionId: usersId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'resolved_by',
          type: 'relation',
          required: false,
          collectionId: usersId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'resolved_at', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_gates_author ON gates_ledger (created_by)',
        'CREATE INDEX idx_gates_status ON gates_ledger (status)',
      ],
    })
    app.save(gates)

    const escalations = new Collection({
      name: 'gate_escalations',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'gate',
          type: 'relation',
          required: true,
          collectionId: gates.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'escalated_by_name', type: 'text', required: true, max: 200 },
        { name: 'note', type: 'text', max: 1000 },
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
      indexes: ['CREATE INDEX idx_gate_escalations_gate ON gate_escalations (gate)'],
    })
    app.save(escalations)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('gate_escalations'))
    app.delete(app.findCollectionByNameOrId('gates_ledger'))
  },
)
