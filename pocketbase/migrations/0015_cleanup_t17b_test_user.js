migrate(
  (app) => {
    // Remove o usuário de teste da segunda rodada e seus snapshots.
    try {
      const userB = app.findAuthRecordByEmail('_pb_users_auth_', 'teste.t17b@mercogeo.com.br')
      app.delete(userB)
    } catch (_) {}
    const orphans = app.findRecordsByFilter(
      'baseline_snapshots',
      'created_by = "0yz99aqcm5pqqn4"',
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
