migrate(
  (app) => {
    const usersId = app.findCollectionByNameOrId('_pb_users_auth_').id

    const reviews = new Collection({
      name: 'time_quality_reviews',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
    })

    reviews.fields.add(new DateField({ name: 'week_start', required: true }))
    reviews.fields.add(new DateField({ name: 'week_end', required: true }))
    reviews.fields.add(
      new SelectField({
        name: 'status',
        values: ['aprovado', 'pendente', 'sem_amostra'],
        maxSelect: 1,
        required: true,
      }),
    )
    reviews.fields.add(new NumberField({ name: 'reviewed_opportunities', onlyInt: true, min: 0 }))
    reviews.fields.add(
      new NumberField({ name: 'eligible_baseline_opportunities', onlyInt: true, min: 0 }),
    )
    reviews.fields.add(
      new NumberField({ name: 'non_comparable_opportunities', onlyInt: true, min: 0 }),
    )
    reviews.fields.add(new NumberField({ name: 'open_time_entries', onlyInt: true, min: 0 }))
    reviews.fields.add(new NumberField({ name: 'invalid_time_entries', onlyInt: true, min: 0 }))
    reviews.fields.add(new NumberField({ name: 'missing_received_events', onlyInt: true, min: 0 }))
    reviews.fields.add(new NumberField({ name: 'retrodated_events', onlyInt: true, min: 0 }))
    reviews.fields.add(new NumberField({ name: 'out_of_order_timelines', onlyInt: true, min: 0 }))
    reviews.fields.add(new NumberField({ name: 'incomplete_timelines', onlyInt: true, min: 0 }))
    reviews.fields.add(new JSONField({ name: 'findings', maxSize: 200000 }))
    reviews.fields.add(new TextField({ name: 'criteria', required: true, max: 4000 }))
    reviews.fields.add(new TextField({ name: 'decision', required: true, max: 500 }))
    reviews.fields.add(new TextField({ name: 'signature', required: true, max: 128 }))
    reviews.fields.add(new DateField({ name: 'signed_at', required: true }))
    reviews.fields.add(
      new RelationField({
        name: 'created_by',
        collectionId: usersId,
        maxSelect: 1,
        cascadeDelete: false,
        required: true,
      }),
    )
    reviews.fields.add(new AutodateField({ name: 'created', onCreate: true, onUpdate: false }))
    reviews.fields.add(new AutodateField({ name: 'updated', onCreate: true, onUpdate: true }))
    reviews.listRule = "@request.auth.id != '' && created_by = @request.auth.id"
    reviews.viewRule = "@request.auth.id != '' && created_by = @request.auth.id"

    reviews.addIndex('idx_time_quality_reviews_author', false, 'created_by, signed_at', '')
    reviews.addIndex('idx_time_quality_reviews_window', false, 'week_start, week_end', '')
    app.save(reviews)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('time_quality_reviews'))
  },
)
