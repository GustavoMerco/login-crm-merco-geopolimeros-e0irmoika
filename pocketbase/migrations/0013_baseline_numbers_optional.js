migrate(
  (app) => {
    // PocketBase trata número 0 como vazio em campos required; como os agregados
    // são sempre definidos pelo servidor (CRUD bloqueado) e 0 significa "sem
    // amostra", os campos numéricos passam a ser opcionais.
    const col = app.findCollectionByNameOrId('baseline_snapshots')
    const names = [
      'volume',
      'received_to_apt_ms',
      'apt_to_ready_ms',
      'ready_to_sent_ms',
      'active_time_ms',
    ]
    for (const name of names) {
      const field = col.fields.getByName(name)
      if (field) {
        field.required = false
      }
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('baseline_snapshots')
    const names = [
      'volume',
      'received_to_apt_ms',
      'apt_to_ready_ms',
      'ready_to_sent_ms',
      'active_time_ms',
    ]
    for (const name of names) {
      const field = col.fields.getByName(name)
      if (field) {
        field.required = true
      }
    }
    app.save(col)
  },
)
