migrate(
  (app) => {
    // Cleanup das fixtures sintéticas de prova T2.3 (padrão das tasks anteriores).
    // IDs capturados nas provas RED/GREEN-P2-002A (tmp/t23-ids.json).
    for (const id of ['mmwckr81n8x3f0h']) {
      try {
        const rec = app.findRecordById('composition_versions', id)
        app.delete(rec)
      } catch (_) {}
    }
    for (const id of ['x57hgm3od7s7xbs', 'ba8vlwqjestkb0x']) {
      try {
        const rec = app.findRecordById('catalog_items', id)
        app.delete(rec)
      } catch (_) {}
    }
  },
  (app) => {},
)
