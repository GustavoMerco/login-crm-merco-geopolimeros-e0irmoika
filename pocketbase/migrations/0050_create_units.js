migrate(
  (app) => {
    const usersId = app.findCollectionByNameOrId('_pb_users_auth_').id

    const units = new Collection({
      name: 'units',
      type: 'base',
      // CRUD direto negado: toda mutação passa pelas rotas server-side
      // (/backend/v1/units*), que validam papel, contrato e auditam (SPEC-2-007).
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
    })

    units.fields.add(new TextField({ name: 'code', required: true, max: 20 }))
    units.fields.add(new TextField({ name: 'name', required: true, max: 120 }))
    units.fields.add(
      new SelectField({
        name: 'dimension',
        values: ['area', 'massa', 'comprimento', 'volume', 'massa/area', 'tempo', 'adimensional'],
        maxSelect: 1,
        required: true,
      }),
    )
    units.fields.add(
      new SelectField({
        name: 'status',
        values: ['rascunho', 'homologado', 'inativo'],
        maxSelect: 1,
        required: true,
      }),
    )
    units.fields.add(new TextField({ name: 'inactive_reason', max: 1000 }))
    units.fields.add(
      new RelationField({
        name: 'created_by',
        collectionId: usersId,
        maxSelect: 1,
        cascadeDelete: false,
        required: true,
      }),
    )
    units.fields.add(
      new RelationField({
        name: 'homologated_by',
        collectionId: usersId,
        maxSelect: 1,
        cascadeDelete: false,
        required: false,
      }),
    )
    units.fields.add(new DateField({ name: 'homologated_at' }))
    units.fields.add(new AutodateField({ name: 'created', onCreate: true, onUpdate: false }))
    units.fields.add(new AutodateField({ name: 'updated', onCreate: true, onUpdate: true }))

    // Código é a chave de referência nas composições (T2.17); único e estável.
    units.addIndex('idx_units_code', true, 'code', '')
    units.addIndex('idx_units_status', false, 'status', '')

    app.save(units)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('units'))
  },
)
