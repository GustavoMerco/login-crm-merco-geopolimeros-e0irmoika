migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('proposal_templates')
    const usersId = app.findCollectionByNameOrId('_pb_users_auth_').id
    const docxMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

    if (!col.fields.getByName('family')) col.fields.add(new TextField({ name: 'family', max: 120 }))
    if (!col.fields.getByName('name')) col.fields.add(new TextField({ name: 'name', max: 200 }))
    if (!col.fields.getByName('model_number'))
      col.fields.add(new TextField({ name: 'model_number', max: 60 }))
    if (!col.fields.getByName('version'))
      col.fields.add(new NumberField({ name: 'version', onlyInt: true, min: 1 }))
    if (!col.fields.getByName('file'))
      col.fields.add(
        new FileField({ name: 'file', maxSelect: 1, maxSize: 20971520, mimeTypes: [docxMime] }),
      )
    if (!col.fields.getByName('variable_fields'))
      col.fields.add(new JSONField({ name: 'variable_fields', maxSize: 100000 }))
    if (!col.fields.getByName('status'))
      col.fields.add(
        new SelectField({
          name: 'status',
          values: ['rascunho', 'aprovado', 'inativo'],
          maxSelect: 1,
        }),
      )
    if (!col.fields.getByName('approved_by'))
      col.fields.add(
        new RelationField({
          name: 'approved_by',
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
    if (!col.fields.getByName('approved_at')) col.fields.add(new DateField({ name: 'approved_at' }))
    if (!col.fields.getByName('created_by'))
      col.fields.add(
        new RelationField({
          name: 'created_by',
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
    if (!col.fields.getByName('created'))
      col.fields.add(new AutodateField({ name: 'created', onCreate: true, onUpdate: false }))
    if (!col.fields.getByName('updated'))
      col.fields.add(new AutodateField({ name: 'updated', onCreate: true, onUpdate: true }))

    col.listRule = "@request.auth.id != ''"
    col.viewRule = "@request.auth.id != ''"
    col.createRule = "@request.auth.id != ''"
    col.updateRule = null
    col.deleteRule = null
    col.addIndex('idx_proposal_templates_family_status', false, 'family, status', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('proposal_templates')
    const names = [
      'family',
      'name',
      'model_number',
      'version',
      'file',
      'variable_fields',
      'status',
      'approved_by',
      'approved_at',
      'created_by',
      'created',
      'updated',
    ]
    for (const name of names) {
      if (col.fields.getByName(name)) col.fields.removeByName(name)
    }
    app.save(col)
  },
)
