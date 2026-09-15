migrate(
  (app) => {
    // Remove os dados sintéticos usados na verificação automática da T1.12.
    const receipts = app.findRecordsByFilter(
      'backup_receipts',
      'created_by = "mdtr9si60g0y5w3" || created_by = "hwqmu37zjj3e496"',
      '',
      200,
      0,
    )
    for (const receipt of receipts) {
      app.delete(receipt)
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
