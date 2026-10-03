migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    // Fixtures sintéticas de prova (T2.2) — removidas pela migration 0046.
    const fixtures = [
      { email: 'qa.engenharia@mercogeo.com.br', name: 'QA Engenharia', role: 'engenharia' },
      { email: 'qa.comercial@mercogeo.com.br', name: 'QA Comercial', role: 'comercial' },
    ]

    for (const fixture of fixtures) {
      try {
        app.findFirstRecordByData('users', 'email', fixture.email)
        continue
      } catch (_) {}

      const record = new Record(users)
      record.setEmail(fixture.email)
      record.setPassword('Qa@Fixtura2026')
      record.setVerified(true)
      record.set('name', fixture.name)
      record.set('role', fixture.role)
      app.save(record)
    }
  },
  (app) => {
    for (const email of ['qa.engenharia@mercogeo.com.br', 'qa.comercial@mercogeo.com.br']) {
      try {
        const record = app.findFirstRecordByData('users', 'email', email)
        if (record) app.delete(record)
      } catch (_) {}
    }
  },
)
