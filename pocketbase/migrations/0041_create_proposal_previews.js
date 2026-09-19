migrate(
  (app) => {
    const usersId = app.findCollectionByNameOrId('_pb_users_auth_').id
    const opportunitiesId = app.findCollectionByNameOrId('opportunities').id
    const templatesId = app.findCollectionByNameOrId('proposal_templates').id

    const previews = new Collection({
      name: 'proposal_previews',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
    })

    previews.fields.add(
      new RelationField({
        name: 'opportunity_id',
        collectionId: opportunitiesId,
        maxSelect: 1,
        cascadeDelete: true,
        required: true,
      }),
    )
    previews.fields.add(
      new RelationField({
        name: 'template_id',
        collectionId: templatesId,
        maxSelect: 1,
        cascadeDelete: false,
        required: true,
      }),
    )
    previews.fields.add(new TextField({ name: 'family', max: 30 }))
    previews.fields.add(new TextField({ name: 'proposal_number', max: 60 }))
    previews.fields.add(new TextField({ name: 'revision', max: 20 }))
    previews.fields.add(new DateField({ name: 'proposal_date' }))
    previews.fields.add(new TextField({ name: 'city', max: 120 }))
    previews.fields.add(new TextField({ name: 'customer_name', max: 200 }))
    previews.fields.add(new TextField({ name: 'customer_cnpj', max: 40 }))
    previews.fields.add(new TextField({ name: 'customer_address', max: 500 }))
    previews.fields.add(new TextField({ name: 'contact_name', max: 200 }))
    previews.fields.add(new TextField({ name: 'contact_email', max: 200 }))
    previews.fields.add(new TextField({ name: 'local_obra', max: 300 }))
    previews.fields.add(new TextField({ name: 'surface_type', max: 120 }))
    previews.fields.add(new TextField({ name: 'solution_proposed', max: 5000 }))
    previews.fields.add(new TextField({ name: 'execution_start', max: 200 }))
    previews.fields.add(new TextField({ name: 'execution_deadline', max: 200 }))
    previews.fields.add(new JSONField({ name: 'areas', maxSize: 200000 }))
    previews.fields.add(new TextField({ name: 'template_name', max: 200 }))
    previews.fields.add(new TextField({ name: 'template_model_number', max: 60 }))
    previews.fields.add(new NumberField({ name: 'template_version', onlyInt: true, min: 1 }))
    previews.fields.add(new SelectField({ name: 'status', values: ['previa'], maxSelect: 1 }))
    previews.fields.add(
      new RelationField({
        name: 'created_by',
        collectionId: usersId,
        maxSelect: 1,
        cascadeDelete: false,
        required: true,
      }),
    )
    previews.fields.add(new AutodateField({ name: 'created', onCreate: true, onUpdate: false }))
    previews.fields.add(new AutodateField({ name: 'updated', onCreate: true, onUpdate: true }))

    previews.addIndex('idx_proposal_previews_opportunity', false, 'opportunity_id, created', '')
    previews.addIndex('idx_proposal_previews_author', false, 'created_by, created', '')
    app.save(previews)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('proposal_previews'))
  },
)
