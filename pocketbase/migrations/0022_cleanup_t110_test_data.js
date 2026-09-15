migrate(
  (app) => {
    // Remove os dados sintéticos usados na verificação automática da T1.10.
    const gates = app.findRecordsByFilter(
      'gates_ledger',
      'created_by = "mdtr9si60g0y5w3" || created_by = "hwqmu37zjj3e496"',
      '',
      100,
      0,
    )
    for (const gate of gates) {
      try {
        const escs = app.findRecordsByFilter(
          'gate_escalations',
          'gate = "' + gate.id + '"',
          '',
          100,
          0,
        )
        for (const esc of escs) {
          app.delete(esc)
        }
      } catch (_) {}
      app.delete(gate)
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
