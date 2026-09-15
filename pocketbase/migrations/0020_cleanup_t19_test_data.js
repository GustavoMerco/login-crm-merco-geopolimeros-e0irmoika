migrate(
  (app) => {
    // Remove os dados sintéticos usados na verificação automática da T1.9.
    const orphans = app.findRecordsByFilter(
      'pilot_params',
      'created_by = "mdtr9si60g0y5w3" || created_by = "hwqmu37zjj3e496"',
      '',
      100,
      0,
    )
    for (const param of orphans) {
      app.delete(param)
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
