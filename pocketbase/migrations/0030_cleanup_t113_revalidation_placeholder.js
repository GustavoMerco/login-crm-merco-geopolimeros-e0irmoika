migrate(
  (app) => {
    const records = app.findRecordsByFilter(
      'proposal_templates',
      'created_by = "' +
        'REVAL_COMMERCIAL_ID' +
        '" || created_by = "' +
        'REVAL_ENGINEERING_ID' +
        '"',
      '',
      100,
      0,
    )
    for (const record of records) {
      app.delete(record)
    }
    try {
      const commercial = app.findRecordById('users', 'REVAL_COMMERCIAL_ID')
      app.delete(commercial)
    } catch (_) {}
    try {
      const engineering = app.findRecordById('users', 'REVAL_ENGINEERING_ID')
      app.delete(engineering)
    } catch (_) {}
  },
  (app) => {
    // Down intencionalmente vazio: dados de teste não devem ser recriados.
  },
)
