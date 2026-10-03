migrate(
  (app) => {
    const usersId = app.findCollectionByNameOrId('_pb_users_auth_').id

    const readiness = new Collection({
      name: 'phase2_readiness',
      type: 'base',
      // CRUD direto negado: toda mutação passa pelas rotas server-side
      // (/backend/v1/dimensioning/readiness*), que validam vínculos e papel.
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
    })

    readiness.fields.add(new TextField({ name: 'pilot_family', required: true, max: 120 }))
    readiness.fields.add(new TextField({ name: 'pilot_owner', required: true, max: 200 }))
    readiness.fields.add(new TextField({ name: 'pilot_reason', required: true, max: 1000 }))
    readiness.fields.add(new TextField({ name: 'sla_record_id', required: true, max: 15 }))
    readiness.fields.add(new TextField({ name: 'baseline_id', required: true, max: 15 }))
    readiness.fields.add(new TextField({ name: 'recovery_evidence_ref', required: true, max: 500 }))
    readiness.fields.add(new TextField({ name: 'phase1_receipt_ref', required: true, max: 500 }))
    readiness.fields.add(
      new RelationField({
        name: 'approved_by',
        collectionId: usersId,
        maxSelect: 1,
        cascadeDelete: false,
        required: true,
      }),
    )
    readiness.fields.add(new DateField({ name: 'approved_at', required: true }))
    readiness.fields.add(
      new SelectField({
        name: 'status',
        values: ['bloqueado', 'aprovado'],
        maxSelect: 1,
        required: true,
      }),
    )
    readiness.fields.add(new JSONField({ name: 'blockers', maxSize: 200000 }))
    readiness.fields.add(new AutodateField({ name: 'created', onCreate: true, onUpdate: false }))
    readiness.fields.add(new AutodateField({ name: 'updated', onCreate: true, onUpdate: true }))

    readiness.addIndex('idx_phase2_readiness_family', false, 'pilot_family, status', '')

    app.save(readiness)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('phase2_readiness'))
  },
)
