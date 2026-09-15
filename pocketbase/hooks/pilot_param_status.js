routerAdd(
  'GET',
  '/backend/v1/pilot-params/status',
  (e) => {
    const params = $app.findRecordsByFilter('pilot_params', '', '-created', 500, 0)

    const byKey = {}
    for (const p of params) {
      const key = p.getString('param_type') + '::' + p.getString('family')
      // prioridade: homologado > bloqueado > rascunho
      const rank = { homologado: 3, bloqueado: 2, rascunho: 1 }
      const current = byKey[key]
      if (!current || rank[p.getString('decision')] > rank[current.getString('decision')]) {
        byKey[key] = p
      }
    }

    const REQUIRED = ['bdi', 'iss', 'margem', 'sla', 'alcada', 'arredondamento']
    const family = params.length > 0 ? params[0].getString('family') : ''

    const items = []
    for (const type of REQUIRED) {
      const param = byKey[type + '::' + family]
      if (!param) {
        items.push({ paramType: type, family, decision: 'ausente' })
      } else {
        items.push({
          id: param.id,
          paramType: param.getString('param_type'),
          family: param.getString('family'),
          value: param.getString('value'),
          unit: param.getString('unit'),
          source: param.getString('source'),
          decision: param.getString('decision'),
          blockedReason: param.getString('blocked_reason'),
          blockedOwner: param.getString('blocked_owner'),
          blockedDeadline: param.getString('blocked_deadline'),
          homologatedAt: param.getString('homologated_at'),
        })
      }
    }

    // Gate: SLA da família-piloto é obrigatório para liberar a Fase 2 (CA-1-09)
    const sla = byKey['sla::' + family]
    const gate = {
      family,
      open: !!(sla && sla.getString('decision') === 'homologado'),
      detail: sla
        ? sla.getString('decision') === 'homologado'
          ? 'SLA homologado; gate aberto.'
          : 'SLA ' + sla.getString('decision') + '; gate fechado até homologação.'
        : 'SLA ausente; gate fechado.',
    }

    return e.json(200, { items, gate })
  },
  $apis.requireAuth(),
)
