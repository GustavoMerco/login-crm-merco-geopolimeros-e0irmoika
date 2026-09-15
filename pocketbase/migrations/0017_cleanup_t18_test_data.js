migrate(
  (app) => {
    // Remove os dados sintéticos usados na verificação automática da T1.8.
    const orphans = app.findRecordsByFilter(
      'catalog_items',
      'created_by = "by7a793s28hl3rj" || created_by = "bpzptnayo7kij1w"',
      '',
      100,
      0,
    )
    for (const item of orphans) {
      app.delete(item)
    }
    try {
      const userA = app.findRecordById('users', 'by7a793s28hl3rj')
      app.delete(userA)
    } catch (_) {}
    try {
      const userE = app.findRecordById('users', 'bpzptnayo7kij1w')
      app.delete(userE)
    } catch (_) {}
  },
  (app) => {
    // Down intencionalmente vazio: dados de teste não devem ser recriados.
  },
)
