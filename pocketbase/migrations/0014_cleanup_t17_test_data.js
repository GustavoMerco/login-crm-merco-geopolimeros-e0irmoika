migrate(
  (app) => {
    // Remove os dados sintéticos usados na verificação automática da T1.7.
    try {
      const user = app.findRecordById('users', '0yz99aqcm5pqqn4')
      app.delete(user)
    } catch (_) {}
    // Snapshots órfãos do usuário de teste (created_by aponta para registro removido).
    const orphans = app.findRecordsByFilter(
      'baseline_snapshots',
      'created_by = "" || created_by = "0yz99aqcm5pqqn4"',
      '',
      100,
      0,
    )
    for (const snapshot of orphans) {
      app.delete(snapshot)
    }
  },
  (app) => {
    // Down intencionalmente vazio: dados de teste não devem ser recriados.
  },
)
