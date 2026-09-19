migrate(
  (app) => {
    // Remove apenas os registros sintéticos criados durante a verificação da T1.13.
    const records = app.findRecordsByFilter(
      'proposal_templates',
      'created_by = "rc7xcl9sv3cmcum" || created_by = "epnom4gh79vy1dy"',
      '',
      100,
      0,
    )
    for (const record of records) {
      app.delete(record)
    }
    try {
      const commercial = app.findRecordById('users', 'rc7xcl9sv3cmcum')
      app.delete(commercial)
    } catch (_) {}
    try {
      const engineering = app.findRecordById('users', 'epnom4gh79vy1dy')
      app.delete(engineering)
    } catch (_) {}
  },
  (app) => {
    // Down intencionalmente vazio: dados de teste não devem ser recriados.
  },
)
