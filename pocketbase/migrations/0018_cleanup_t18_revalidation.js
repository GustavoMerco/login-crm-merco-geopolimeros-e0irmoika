migrate(
  (app) => {
    // Remove os dados sintéticos usados na revalidação independente da T1.8.
    const orphans = app.findRecordsByFilter(
      'catalog_items',
      'created_by = "l2itfj2yduxt50f" || created_by = "03ow7g70s1suan7"',
      '',
      100,
      0,
    )
    for (const item of orphans) {
      app.delete(item)
    }
    try {
      const userC = app.findRecordById('users', 'l2itfj2yduxt50f')
      app.delete(userC)
    } catch (_) {}
    try {
      const userE = app.findRecordById('users', '03ow7g70s1suan7')
      app.delete(userE)
    } catch (_) {}
  },
  (app) => {
    // Down intencionalmente vazio: dados de teste não devem ser recriados.
  },
)
