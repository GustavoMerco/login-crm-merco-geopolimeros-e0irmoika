migrate(
  (app) => {
    const usersId = app.findCollectionByNameOrId('_pb_users_auth_').id

    const compositions = new Collection({
      name: 'composition_versions',
      type: 'base',
      // CRUD direto negado: toda mutação passa pelas rotas server-side
      // (/backend/v1/compositions*), que validam papel, vínculo e contrato.
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
    })

    compositions.fields.add(
      new RelationField({
        name: 'catalog_item_id',
        collectionId: app.findCollectionByNameOrId('catalog_items').id,
        maxSelect: 1,
        cascadeDelete: false,
        required: true,
      }),
    )
    compositions.fields.add(new TextField({ name: 'code', required: true, max: 64 }))
    compositions.fields.add(new TextField({ name: 'family', required: true, max: 120 }))
    compositions.fields.add(new NumberField({ name: 'version', onlyInt: true, min: 1 }))
    compositions.fields.add(
      new SelectField({
        name: 'status',
        values: ['rascunho', 'homologado', 'inativo'],
        maxSelect: 1,
        required: true,
      }),
    )
    compositions.fields.add(new TextField({ name: 'output_unit', required: true, max: 40 }))
    compositions.fields.add(new JSONField({ name: 'inputs', maxSize: 200000 }))
    compositions.fields.add(new JSONField({ name: 'resources', maxSize: 200000 }))
    compositions.fields.add(new JSONField({ name: 'formula_ast', maxSize: 100000 }))
    compositions.fields.add(new TextField({ name: 'source', required: true, max: 200 }))
    compositions.fields.add(new DateField({ name: 'valid_from', required: true }))
    compositions.fields.add(new DateField({ name: 'valid_until', required: true }))
    compositions.fields.add(
      new RelationField({
        name: 'owner_id',
        collectionId: usersId,
        maxSelect: 1,
        cascadeDelete: false,
        required: true,
      }),
    )
    compositions.fields.add(new TextField({ name: 'fixture_ref', required: true, max: 500 }))
    compositions.fields.add(new TextField({ name: 'precision', required: true, max: 40 }))
    compositions.fields.add(new TextField({ name: 'rounding', required: true, max: 40 }))
    compositions.fields.add(new TextField({ name: 'tolerance', required: true, max: 40 }))
    compositions.fields.add(
      new RelationField({
        name: 'created_by',
        collectionId: usersId,
        maxSelect: 1,
        cascadeDelete: false,
        required: true,
      }),
    )
    compositions.fields.add(
      new RelationField({
        name: 'homologated_by',
        collectionId: usersId,
        maxSelect: 1,
        cascadeDelete: false,
        required: false,
      }),
    )
    compositions.fields.add(new DateField({ name: 'homologated_at' }))
    compositions.fields.add(new TextField({ name: 'inactive_reason', max: 1000 }))
    compositions.fields.add(new AutodateField({ name: 'created', onCreate: true, onUpdate: false }))
    compositions.fields.add(new AutodateField({ name: 'updated', onCreate: true, onUpdate: true }))

    // Unicidade por item+versão e por código+família+versão (SPEC-2-002).
    compositions.addIndex('idx_composition_item_version', true, 'catalog_item_id, version', '')
    compositions.addIndex('idx_composition_code_family_version', true, 'code, family, version', '')
    compositions.addIndex('idx_composition_family_status', false, 'family, status', '')

    app.save(compositions)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('composition_versions'))
  },
)
