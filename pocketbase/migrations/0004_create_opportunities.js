migrate(
  (app) => {
    const opportunities = new Collection({
      name: 'opportunities',
      type: 'base',
      listRule: '@request.auth.id != "" && responsible_user_id = @request.auth.id',
      viewRule: '@request.auth.id != "" && responsible_user_id = @request.auth.id',
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'customer_name', type: 'text', required: true, max: 200 },
        { name: 'contact_name', type: 'text', required: true, max: 200 },
        { name: 'contact_email', type: 'email', required: false },
        { name: 'origin', type: 'text', required: true, max: 120 },
        { name: 'service_family', type: 'text', required: true, max: 120 },
        { name: 'location', type: 'text', required: true, max: 300 },
        {
          name: 'responsible_user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'demand_date', type: 'date', required: true },
        { name: 'deadline_date', type: 'date', required: false },
        { name: 'received_at', type: 'date', required: true },
        { name: 'status', type: 'text', required: true, max: 40 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_opportunities_responsible ON opportunities (responsible_user_id)',
        'CREATE INDEX idx_opportunities_received_at ON opportunities (received_at)',
        'CREATE INDEX idx_opportunities_status ON opportunities (status)',
      ],
    })
    app.save(opportunities)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('opportunities'))
  },
)
