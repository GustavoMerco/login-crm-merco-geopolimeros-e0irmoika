migrate(
  (app) => {
    // Remove os dados sintéticos usados na verificação automática da T1.11.
    const audits = app.findRecordsByFilter(
      'source_audits',
      'created_by = "mdtr9si60g0y5w3" || created_by = "hwqmu37zjj3e496"',
      '',
      100,
      0,
    )
    for (const audit of audits) {
      app.delete(audit)
    }
    try {
      const userC = app.findRecordById('users', 'mdtr9si60g0y5w3')
      app.delete(userC)
    } catch (_) {}
    try {
      const userE = app.findRecordById('users', 'hwqmu37zjj3e496')
      app.delete(userE)
    } catch (_) {}
  },
  (app) => {
    // Down intencionalmente vazio: dados de teste não devem ser recriados.
  },
)
