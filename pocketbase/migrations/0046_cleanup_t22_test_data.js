migrate(
  (app) => {
    // Cleanup das fixtures sintéticas de prova T2.2 (padrão das tasks anteriores).
    // A deleção do SLA referenciado prova a invalidação real do gate aprovado:
    // o vínculo deixa de existir e o GET deve reportar 'invalidado' com o
    // registro anterior preservado.
    for (const id of ['7c8ltot0ap1l09w', '3h3932llpz752hk']) {
      try {
        const rec = app.findRecordById('pilot_params', id)
        app.delete(rec)
      } catch (_) {}
    }
    try {
      const rec = app.findRecordById('baseline_snapshots', '59ydhv6g2amtq0l')
      app.delete(rec)
    } catch (_) {}
  },
  (app) => {},
)
