migrate(
  (app) => {
    // Cleanup final das fixtures de repetibilidade pós-cleanup T2.3.
    for (const id of ['gyasj9314mheghq']) {
      try {
        const rec = app.findRecordById('catalog_items', id)
        app.delete(rec)
      } catch (_) {}
    }
    // composição criada na prova de repetibilidade
    try {
      const recs = app.findRecordsByFilter(
        'composition_versions',
        'code = "COMP-POS-CLEANUP"',
        '',
        10,
        0,
      )
      for (const rec of recs) app.delete(rec)
    } catch (_) {}
    // recurso já foi removido pela 0048; referência órfã não existe
  },
  (app) => {},
)
