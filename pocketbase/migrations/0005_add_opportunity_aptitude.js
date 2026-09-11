migrate(
  (app) => {
    const opportunities = app.findCollectionByNameOrId('opportunities')

    opportunities.fields.add(
      new SelectField({
        name: 'aptitude_status',
        values: ['pending', 'blocked', 'apt', 'exception_approved'],
        maxSelect: 1,
      }),
    )
    opportunities.fields.add(
      new JSONField({
        name: 'checklist',
        maxSize: 20000,
      }),
    )
    opportunities.fields.add(
      new JSONField({
        name: 'pending_items',
        maxSize: 10000,
      }),
    )
    opportunities.fields.add(
      new TextField({
        name: 'exception_justification',
        max: 1000,
      }),
    )
    opportunities.fields.add(
      new RelationField({
        name: 'exception_authorized_by',
        collectionId: '_pb_users_auth_',
        cascadeDelete: false,
        maxSelect: 1,
      }),
    )
    opportunities.fields.add(
      new AutodateField({
        name: 'aptitude_evaluated_at',
        onCreate: false,
        onUpdate: false,
      }),
    )

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
