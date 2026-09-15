migrate(
  (app) => {
    // Remove os dados sintéticos usados na verificação automática da T1.6.
    try {
      const opportunity = app.findRecordById('opportunities', 'j25knibrfu4ji3g')
      app.delete(opportunity) // cascata remove eventos e registros de tempo
    } catch (_) {}
    try {
      const user = app.findRecordById('users', 'mao8l7vpc1i9m2x')
      app.delete(user)
    } catch (_) {}
  },
  (app) => {
    // Down intencionalmente vazio: dados de teste não devem ser recriados.
  },
)
