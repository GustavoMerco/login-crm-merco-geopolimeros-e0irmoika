migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    try {
      const existing = app.findFirstRecordByData('users', 'email', 'paulo.romeiro@mercogeo.com.br')
      if (existing) return
    } catch (_) {}

    const record = new Record(users)
    record.setEmail('paulo.romeiro@mercogeo.com.br')
    record.setPassword('Skip@Pass')
    record.setVerified(true)
    record.set('name', 'Paulo Romeiro')
    app.save(record)
  },
  (app) => {
    try {
      const record = app.findFirstRecordByData('users', 'email', 'paulo.romeiro@mercogeo.com.br')
      if (record) {
        app.delete(record)
      }
    } catch (_) {}
  },
)
