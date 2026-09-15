routerAdd(
  'GET',
  '/backend/v1/gates/status',
  (e) => {
    // Ordem de corte do PRD (seção 11) - somente leitura, nunca editável pela API.
    // "Não se cortam: baseline, catálogo homologado, memória de cálculo, aprovação,
    // documento completo, segurança ou auditoria."
    // Inline no callback: o JSVM do PocketBase não expõe declarações top-level.
    const cutOrder = [
      { position: 1, item: 'RF-28 - Assistência por IA', cuttable: true },
      { position: 2, item: 'RF-15 - Múltiplos cenários além do cenário-base', cuttable: true },
      {
        position: 3,
        item: 'Integrações em tempo real (preservando importação controlada)',
        cuttable: true,
      },
      { position: 4, item: 'Motivo de perda analítico além do registro mínimo', cuttable: true },
      {
        position: 5,
        item: 'Baseline, catálogo homologado, memória de cálculo, aprovação, documento completo, segurança e auditoria',
        cuttable: false,
      },
    ]

    const gates = $app.findRecordsByFilter('gates_ledger', '', '-created', 200, 0)
    const today = new Date().toISOString().slice(0, 10)

    const items = []
    for (const gate of gates) {
      const deadline = gate.getString('decision_deadline').slice(0, 10)
      const status = gate.getString('status')
      const overdue = status === 'aberto' && deadline < today
      let escalations = 0
      try {
        escalations = $app.countRecordsByFilter('gate_escalations', 'gate = "' + gate.id + '"')
      } catch (_) {
        escalations = 0
      }
      items.push({
        id: gate.id,
        title: gate.getString('title'),
        description: gate.getString('description'),
        owner: gate.getString('owner'),
        decisionDeadline: deadline,
        status,
        overdue,
        escalations,
        resolution: gate.getString('resolution'),
        resolvedAt: gate.getString('resolved_at'),
      })
    }

    return e.json(200, { items, cutOrder, today })
  },
  $apis.requireAuth(),
)
