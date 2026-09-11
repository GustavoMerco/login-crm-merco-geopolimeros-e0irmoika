migrate(
  (app) => {
    const opportunities = app.findCollectionByNameOrId('opportunities')

    if (!opportunities.fields.getByName('aptitude_status')) {
      opportunities.fields.add(
        new SelectField({
          name: 'aptitude_status',
          values: ['pending', 'blocked', 'apt', 'exception_approved'],
          maxSelect: 1,
        }),
      )
    }
    if (!opportunities.fields.getByName('checklist')) {
      opportunities.fields.add(
        new JSONField({
          name: 'checklist',
          maxSize: 20000,
        }),
      )
    }
    if (!opportunities.fields.getByName('pending_items')) {
      opportunities.fields.add(
        new JSONField({
          name: 'pending_items',
          maxSize: 10000,
        }),
      )
    }
    if (!opportunities.fields.getByName('exception_justification')) {
      opportunities.fields.add(
        new TextField({
          name: 'exception_justification',
          max: 1000,
        }),
      )
    }
    if (!opportunities.fields.getByName('exception_authorized_by')) {
      opportunities.fields.add(
        new RelationField({
          name: 'exception_authorized_by',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
    }
    if (!opportunities.fields.getByName('aptitude_evaluated_at')) {
      opportunities.fields.add(
        new DateField({
          name: 'aptitude_evaluated_at',
        }),
      )
    }

    app.save(opportunities)
  },
  (app) => {
    const opportunities = app.findCollectionByNameOrId('opportunities')
    opportunities.fields.removeByName('aptitude_status')
    opportunities.fields.removeByName('checklist')
    opportunities.fields.removeByName('pending_items')
    opportunities.fields.removeByName('exception_justification')
    opportunities.fields.removeByName('exception_authorized_by')
    opportunities.fields.removeByName('aptitude_evaluated_at')
    app.save(opportunities)
  },
)
