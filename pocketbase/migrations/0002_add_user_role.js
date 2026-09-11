migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const roleField = new Field({
      name: 'role',
      type: 'select',
      required: true,
      values: ['comercial', 'engenharia', 'financeiro', 'aprovador', 'gestao', 'admin'],
      maxSelect: 1,
    })
    users.fields.add(roleField)
    app.save(users)

    for (const user of app.findRecordsByFilter('users', 'role = ""', '', 200, 0)) {
      user.set('role', 'comercial')
      app.save(user)
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('role')
    app.save(users)
  },
)
