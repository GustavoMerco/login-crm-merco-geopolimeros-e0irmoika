migrate(
  (app) => {
    // Remove os dados sintéticos usados na verificação automática da T1.5.
    try {
      const opportunity = app.findRecordById('opportunities', '2a3esojs7kc2mho')
      app.delete(opportunity) // cascadeRemove apaga as tech_sheets vinculadas
    } catch (_) {}
    try {
      const user = app.findRecordById('users', 'o063hof2s79vn5j')
      app.delete(user)
    } catch (_) {}
  },
  (app) => {
    // Down intencionalmente vazio: dados de teste não devem ser recriados.
  },
)
