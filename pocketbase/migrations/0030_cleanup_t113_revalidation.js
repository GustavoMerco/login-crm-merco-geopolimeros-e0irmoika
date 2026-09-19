migrate(
  (app) => {
    const records = app.findRecordsByFilter(
      'proposal_templates',
      'created_by = "2p5e0qp84l36bfx" || created_by = "2wt0l8xc2a1vbj4"',
      '',
      100,
      0,
    )
    for (const record of records) {
      app.delete(record)
    }
    try {
      const commercial = app.findRecordById('users', '2p5e0qp84l36bfx')
      app.delete(commercial)
    } catch (_) {}
    try {
      const engineering = app.findRecordById('users', '2wt0l8xc2a1vbj4')
      app.delete(engineering)
    } catch (_) {}
  },
  (app) => {
    // Down intencionalmente vazio: dados de teste não devem ser recriados.
  },
)
