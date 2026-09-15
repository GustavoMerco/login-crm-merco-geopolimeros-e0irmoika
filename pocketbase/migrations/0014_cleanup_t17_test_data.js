migrate(
  (app) => {
    // Remove os dados sintéticos da segunda rodada de verificação da T1.7.
    try {
      const user = app.findRecordById('users', '0yz99aqcm5pqqn4')
      app.delete(user)
    } catch (_) {}
    try {
      const userB = app.findRecordById('users', '0yz99aqcm5pqqn4')
      app.delete(userB)
    } catch (_) {}
    try {
      const userB = app.findAuthRecordByEmail('_pb_users_auth_', 'teste.t17b@mercogeo.com.br')
      app.delete(userB)
    } catch (_) {}
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
