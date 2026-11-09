import { describe, expect, it } from 'vitest'
import {
  STAGES,
  aptitudeLabel,
  buildCards,
  buildQueue,
  cardUrl,
  civilDate,
  computeMetrics,
  deadlineInfo,
  deriveStage,
  filterCards,
  groupByStage,
  resolveTab,
  statusLabel,
  summarizeCustomers,
  type PipelineEvent,
  type PipelineOpportunity,
} from './pipeline'

const base: PipelineOpportunity = {
  id: 'aaaaaaaaaaaaaaa',
  customer_name: 'Ambev Jacareí',
  contact_name: 'Ana',
  contact_email: 'ana@exemplo.com',
  origin: 'Indicação',
  service_family: 'Nivelamento de pisos',
  location: 'Jacareí/SP',
  responsible_user_id: 'u1',
  demand_date: '2026-11-01 00:00:00.000Z',
  deadline_date: '2026-11-20 00:00:00.000Z',
  received_at: '2026-11-01 13:00:00.000Z',
  status: 'received',
  aptitude_status: 'pending',
  pending_items: [],
}

const opp = (patch: Partial<PipelineOpportunity>): PipelineOpportunity => ({ ...base, ...patch })
const NOW = new Date('2026-11-10T15:00:00Z') // 10/11 em São Paulo

describe('etapa derivada só de dados do servidor', () => {
  it('recebida, em qualificação, apta, em engenharia, pronta e enviada', () => {
    expect(deriveStage(opp({}), new Set(), false)).toBe('recebida')
    expect(deriveStage(opp({ aptitude_status: 'blocked' }), new Set(), false)).toBe('qualificacao')
    expect(deriveStage(opp({ aptitude_status: 'apt' }), new Set(), false)).toBe('apta')
    expect(deriveStage(opp({ aptitude_status: 'exception_approved' }), new Set(), false)).toBe(
      'apta',
    )
    expect(deriveStage(opp({ aptitude_status: 'apt' }), new Set(), true)).toBe('engenharia')
    expect(deriveStage(opp({}), new Set(['apt']), false)).toBe('apta')
    expect(deriveStage(opp({ aptitude_status: 'apt' }), new Set(['ready']), true)).toBe('pronta')
    expect(deriveStage(opp({}), new Set(['ready', 'sent']), true)).toBe('enviada')
  })

  it('o funil tem exatamente as 8 etapas implementadas, na ordem da jornada', () => {
    expect(STAGES.map((s) => s.id)).toEqual([
      'recebida',
      'qualificacao',
      'apta',
      'engenharia',
      'pronta',
      'enviada',
      'ganha',
      'perdida',
    ])
  })

  it('desfecho vence o envio: ganha e perdida', () => {
    expect(deriveStage(opp({}), new Set(['sent', 'won']), true)).toBe('ganha')
    expect(deriveStage(opp({}), new Set(['sent', 'lost']), true)).toBe('perdida')
  })
})

describe('prazo no fuso de São Paulo', () => {
  it('data civil considera o fuso (00:30 UTC ainda é o dia anterior em SP)', () => {
    expect(civilDate('2026-11-10 02:30:00.000Z')).toBe('2026-11-09')
  })

  it.each([
    [undefined, 'sem_prazo'],
    ['2026-11-09', 'vencido'],
    ['2026-11-10', 'hoje'],
    ['2026-11-12', 'proximo'],
    ['2026-11-13', 'ok'],
  ])('prazo %s → %s', (deadline, state) => {
    expect(deadlineInfo(deadline, '2026-11-10').state).toBe(state)
  })

  it('enviada no prazo ou com atraso', () => {
    expect(deadlineInfo('2026-11-10', '2026-11-20', '2026-11-10').state).toBe('cumprido')
    expect(deadlineInfo('2026-11-10', '2026-11-20', '2026-11-12')).toMatchObject({
      state: 'atrasado',
      days: 2,
    })
  })
})

describe('cards, fila e indicadores', () => {
  const opportunities = [
    opp({ id: 'a00000000000001', customer_name: 'Ambev Jacareí', deadline_date: '2026-11-08' }),
    opp({
      id: 'a00000000000002',
      customer_name: 'AMBEV  jacarei',
      aptitude_status: 'blocked',
      pending_items: ['Planta', 'Área'],
      deadline_date: '2026-11-11',
    }),
    opp({
      id: 'a00000000000003',
      customer_name: 'Heineken',
      aptitude_status: 'apt',
      service_family: 'Estabilização de solo',
    }),
    opp({
      id: 'a00000000000004',
      customer_name: 'Cargill',
      aptitude_status: 'apt',
      deadline_date: '2026-11-05',
      received_at: '2026-11-01 13:00:00.000Z',
    }),
  ]
  const events: PipelineEvent[] = [
    {
      opportunity_id: 'a00000000000004',
      milestone: 'ready',
      occurred_at: '2026-11-03 12:00:00.000Z',
    },
    {
      opportunity_id: 'a00000000000004',
      milestone: 'sent',
      occurred_at: '2026-11-04 12:00:00.000Z',
    },
  ]
  const cards = buildCards(opportunities, events, new Set(['a00000000000003']), NOW)

  it('monta cada card com etapa, prazo e pendências', () => {
    expect(cards.map((c) => c.stage)).toEqual(['recebida', 'qualificacao', 'engenharia', 'enviada'])
    expect(cards[0].deadline.state).toBe('vencido')
    expect(cards[1].pendingCount).toBe(2)
    expect(cards[3].deadline.state).toBe('cumprido')
  })

  it('agrupa por etapa sem perder card', () => {
    const groups = groupByStage(cards)
    expect(Object.values(groups).flat()).toHaveLength(4)
    expect(groups.enviada).toHaveLength(1)
  })

  it('fila do dia: vencidos, vencendo, qualificar e avaliar; enviada vai para "aguardando resposta"', () => {
    const queue = Object.fromEntries(
      buildQueue(cards).map((g) => [g.id, g.cards.map((c) => c.opportunity.id)]),
    )
    expect(queue.vencidos).toEqual(['a00000000000001'])
    expect(queue.proximos).toEqual(['a00000000000002'])
    expect(queue.qualificar).toEqual(['a00000000000002'])
    expect(queue.avaliar).toEqual(['a00000000000001'])
    expect(queue.retorno).toEqual(['a00000000000004'])
    const work = ['vencidos', 'proximos', 'enviar', 'qualificar', 'avaliar'].flatMap(
      (id) => queue[id],
    )
    expect(work).not.toContain('a00000000000004')
  })

  it('clientes agrupam por nome normalizado (acento, caixa e espaços)', () => {
    const customers = summarizeCustomers(cards)
    const ambev = customers.find((c) => c.key === 'ambev jacarei')
    expect(ambev?.total).toBe(2)
    expect(ambev?.overdue).toBe(1)
    expect(customers).toHaveLength(3)
  })

  it('indicadores: tempo médio até envio e taxa no prazo', () => {
    const metrics = computeMetrics(cards)
    expect(metrics.total).toBe(4)
    expect(metrics.open).toBe(3)
    expect(metrics.overdue).toBe(1)
    expect(metrics.avgDaysToSend).toBe(3)
    expect(metrics.onTimeRate).toBe(1)
  })

  it('conversão e motivos de perda', () => {
    const extra: PipelineEvent[] = [
      ...events,
      {
        opportunity_id: 'a00000000000004',
        milestone: 'lost',
        occurred_at: '2026-11-06 12:00:00.000Z',
        note: 'Preço',
      },
    ]
    const metrics = computeMetrics(
      buildCards(opportunities, extra, new Set(['a00000000000003']), NOW),
    )
    expect(metrics.lost).toBe(1)
    expect(metrics.winRate).toBe(0)
    expect(metrics.lossReasons).toEqual([{ reason: 'Preço', count: 1 }])
    expect(metrics.avgDaysToSend).toBe(3)
  })

  it('sem envios, indicadores de tempo ficam nulos (nada inventado)', () => {
    const metrics = computeMetrics(cards.filter((c) => c.stage !== 'enviada'))
    expect(metrics.avgDaysToSend).toBeNull()
    expect(metrics.onTimeRate).toBeNull()
  })

  it('filtro por busca, família e cliente', () => {
    expect(filterCards(cards, { query: 'heinek', family: '', customerKey: '' })).toHaveLength(1)
    expect(
      filterCards(cards, { query: '', family: 'Estabilização de solo', customerKey: '' }),
    ).toHaveLength(1)
    expect(
      filterCards(cards, { query: '', family: '', customerKey: 'ambev jacarei' }),
    ).toHaveLength(2)
  })
})

describe('linguagem de negócio e endereço do card', () => {
  it('nunca mostra o valor interno em inglês', () => {
    expect(statusLabel('received')).toBe('Recebida')
    expect(aptitudeLabel('blocked')).toBe('Faltam dados obrigatórios')
    expect(aptitudeLabel(undefined)).toBe('Aptidão não avaliada')
  })

  it('url do card e aba válida', () => {
    expect(cardUrl('abc', 'ficha')).toBe('/oportunidade?oportunidade=abc&aba=ficha')
    expect(resolveTab('historico')).toBe('historico')
    expect(resolveTab('qualquer')).toBe('resumo')
  })
})
