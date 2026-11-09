// Funil de propostas (reestruturação de UX — CRM de propostas). Lógica pura:
// deriva a etapa de cada oportunidade SOMENTE de dados que o servidor já
// registra (aptidão, ficha técnica e marcos received/apt/ready/sent). Nenhuma
// etapa é inventada: precificação, aprovação e desfecho (ganha/perdida) entram
// quando as fases correspondentes existirem no backend.

export type StageId = 'recebida' | 'qualificacao' | 'apta' | 'engenharia' | 'pronta' | 'enviada'

export type Stage = {
  id: StageId
  label: string
  description: string
}

export const STAGES: Stage[] = [
  { id: 'recebida', label: 'Recebida', description: 'Demanda registrada; aptidão ainda não avaliada.' },
  { id: 'qualificacao', label: 'Em qualificação', description: 'Faltam dados obrigatórios do checklist de aptidão.' },
  { id: 'apta', label: 'Apta', description: 'Pronta para a engenharia abrir a ficha técnica.' },
  { id: 'engenharia', label: 'Em engenharia', description: 'Ficha técnica aberta; composição e dimensionamento em andamento.' },
  { id: 'pronta', label: 'Pronta para envio', description: 'Proposta pronta; falta enviar ao cliente.' },
  { id: 'enviada', label: 'Enviada', description: 'Proposta enviada ao cliente.' },
]

// Etapas da jornada completa do PRD; as não implementadas aparecem como
// "em construção" no card, sem simular dado.
export type JourneyStep = { id: string; label: string; available: boolean; phase?: string }

export const JOURNEY: JourneyStep[] = [
  { id: 'recebida', label: 'Demanda', available: true },
  { id: 'qualificacao', label: 'Qualificação', available: true },
  { id: 'ficha', label: 'Ficha técnica', available: true },
  { id: 'dimensionamento', label: 'Dimensionamento', available: false, phase: 'Fase 2' },
  { id: 'preco', label: 'Custos e preço', available: false, phase: 'Fase 3' },
  { id: 'aprovacao', label: 'Aprovação', available: false, phase: 'Fase 4' },
  { id: 'proposta', label: 'Proposta', available: true },
  { id: 'enviada', label: 'Envio', available: true },
]

export type AptitudeStatus = 'pending' | 'blocked' | 'apt' | 'exception_approved'

export type PipelineOpportunity = {
  id: string
  customer_name: string
  contact_name: string
  contact_email?: string
  origin: string
  service_family: string
  location: string
  responsible_user_id: string
  demand_date: string
  deadline_date?: string
  received_at: string
  status: string
  aptitude_status?: AptitudeStatus
  pending_items?: string[]
}

export type PipelineEvent = {
  opportunity_id: string
  milestone: 'received' | 'apt' | 'ready' | 'sent'
  occurred_at: string
}

export type DeadlineState =
  | 'sem_prazo'
  | 'vencido'
  | 'hoje'
  | 'proximo'
  | 'ok'
  | 'cumprido'
  | 'atrasado'

export type DeadlineInfo = {
  state: DeadlineState
  label: string
  days: number | null
}

export type PipelineCard = {
  opportunity: PipelineOpportunity
  stage: StageId
  hasTechSheet: boolean
  sentAt: string
  readyAt: string
  deadline: DeadlineInfo
  pendingCount: number
}

export const NEAR_DEADLINE_DAYS = 2
const TIME_ZONE = 'America/Sao_Paulo'
const DAY_MS = 86_400_000

const APTITUDE_LABELS: Record<AptitudeStatus, string> = {
  pending: 'Aptidão não avaliada',
  blocked: 'Faltam dados obrigatórios',
  apt: 'Apta para orçamento',
  exception_approved: 'Apta por exceção autorizada',
}

const STATUS_LABELS: Record<string, string> = {
  received: 'Recebida',
  blocked: 'Em qualificação',
  apt: 'Apta',
}

export function aptitudeLabel(status: string | undefined): string {
  return status && status in APTITUDE_LABELS
    ? APTITUDE_LABELS[status as AptitudeStatus]
    : APTITUDE_LABELS.pending
}

export function statusLabel(status: string | undefined): string {
  if (!status) return '—'
  return STATUS_LABELS[status] ?? status
}

export function stageLabel(stage: StageId): string {
  return STAGES.find((item) => item.id === stage)?.label ?? stage
}

// Data civil (AAAA-MM-DD) de um instante no fuso de São Paulo.
export function civilDate(value: string | Date, timeZone = TIME_ZONE): string {
  const date = typeof value === 'string' ? new Date(value.replace(' ', 'T')) : value
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

// Campo de data do PocketBase ("2026-11-20 00:00:00.000Z" ou "2026-11-20").
export function dateOnly(value: string | undefined): string {
  if (!value) return ''
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim())
  return match ? match[1] : ''
}

export function daysBetween(fromCivil: string, toCivil: string): number {
  return Math.round((Date.parse(`${toCivil}T00:00:00Z`) - Date.parse(`${fromCivil}T00:00:00Z`)) / DAY_MS)
}

export function dias(n: number): string {
  return `${n} ${Math.abs(n) === 1 ? 'dia' : 'dias'}`
}

export function formatCivil(civil: string): string {
  if (!civil) return '—'
  const [year, month, day] = civil.split('-')
  return `${day}/${month}/${year}`
}

export function deriveStage(
  opportunity: PipelineOpportunity,
  milestones: ReadonlySet<string>,
  hasTechSheet: boolean,
): StageId {
  if (milestones.has('sent')) return 'enviada'
  if (milestones.has('ready')) return 'pronta'
  const aptitude = opportunity.aptitude_status
  const isApt = aptitude === 'apt' || aptitude === 'exception_approved' || milestones.has('apt')
  if (isApt) return hasTechSheet ? 'engenharia' : 'apta'
  if (aptitude === 'blocked') return 'qualificacao'
  return 'recebida'
}

export function deadlineInfo(
  deadlineDate: string | undefined,
  todayCivil: string,
  sentCivil?: string,
): DeadlineInfo {
  const deadline = dateOnly(deadlineDate)
  if (!deadline) return { state: 'sem_prazo', label: 'Sem prazo informado', days: null }
  if (sentCivil) {
    const late = daysBetween(deadline, sentCivil)
    return late > 0
      ? { state: 'atrasado', label: `Enviada ${dias(late)} após o prazo`, days: late }
      : { state: 'cumprido', label: 'Enviada no prazo', days: late }
  }
  const remaining = daysBetween(todayCivil, deadline)
  if (remaining < 0) return { state: 'vencido', label: `Vencido há ${dias(-remaining)}`, days: remaining }
  if (remaining === 0) return { state: 'hoje', label: 'Vence hoje', days: 0 }
  if (remaining <= NEAR_DEADLINE_DAYS) {
    return { state: 'proximo', label: `Vence em ${dias(remaining)}`, days: remaining }
  }
  return { state: 'ok', label: `Prazo ${formatCivil(deadline).slice(0, 5)}`, days: remaining }
}

export function buildCards(
  opportunities: PipelineOpportunity[],
  events: PipelineEvent[],
  techSheetOpportunityIds: ReadonlySet<string>,
  now: Date = new Date(),
): PipelineCard[] {
  const today = civilDate(now)
  const byOpportunity = new Map<string, PipelineEvent[]>()
  for (const event of events) {
    const list = byOpportunity.get(event.opportunity_id) ?? []
    byOpportunity.set(event.opportunity_id, [...list, event])
  }
  return opportunities.map((opportunity) => {
    const own = byOpportunity.get(opportunity.id) ?? []
    const milestones = new Set(own.map((event) => event.milestone))
    const sentAt = own.find((event) => event.milestone === 'sent')?.occurred_at ?? ''
    const readyAt = own.find((event) => event.milestone === 'ready')?.occurred_at ?? ''
    const hasTechSheet = techSheetOpportunityIds.has(opportunity.id)
    return {
      opportunity,
      stage: deriveStage(opportunity, milestones, hasTechSheet),
      hasTechSheet,
      sentAt,
      readyAt,
      deadline: deadlineInfo(opportunity.deadline_date, today, sentAt ? civilDate(sentAt) : undefined),
      pendingCount: opportunity.pending_items?.length ?? 0,
    }
  })
}

export function groupByStage(cards: PipelineCard[]): Record<StageId, PipelineCard[]> {
  const groups = Object.fromEntries(STAGES.map((stage) => [stage.id, [] as PipelineCard[]])) as Record<
    StageId,
    PipelineCard[]
  >
  for (const card of cards) groups[card.stage] = [...groups[card.stage], card]
  return groups
}

export type PipelineFilter = { query: string; family: string; customerKey: string }

export function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function filterCards(cards: PipelineCard[], filter: PipelineFilter): PipelineCard[] {
  const query = normalizeKey(filter.query)
  return cards.filter(({ opportunity }) => {
    if (filter.family && opportunity.service_family !== filter.family) return false
    if (filter.customerKey && normalizeKey(opportunity.customer_name) !== filter.customerKey) return false
    if (!query) return true
    const haystack = normalizeKey(
      [opportunity.customer_name, opportunity.contact_name, opportunity.service_family, opportunity.location, opportunity.origin].join(' '),
    )
    return haystack.includes(query)
  })
}

export function familiesOf(cards: PipelineCard[]): string[] {
  return [...new Set(cards.map((card) => card.opportunity.service_family).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  )
}

// ---------- fila do dia ----------
export type QueueGroupId = 'vencidos' | 'proximos' | 'enviar' | 'qualificar' | 'avaliar'

export type QueueGroup = { id: QueueGroupId; title: string; hint: string; cards: PipelineCard[] }

export function buildQueue(cards: PipelineCard[]): QueueGroup[] {
  const open = cards.filter((card) => card.stage !== 'enviada')
  const byDeadline = (a: PipelineCard, b: PipelineCard) => (a.deadline.days ?? 9_999) - (b.deadline.days ?? 9_999)
  const groups: QueueGroup[] = [
    {
      id: 'vencidos',
      title: 'Prazo vencido',
      hint: 'Propostas que já passaram do prazo informado pelo cliente.',
      cards: open.filter((card) => card.deadline.state === 'vencido').sort(byDeadline),
    },
    {
      id: 'proximos',
      title: `Vence em até ${NEAR_DEADLINE_DAYS} dias`,
      hint: 'Priorize estas antes de abrir novas demandas.',
      cards: open.filter((card) => card.deadline.state === 'hoje' || card.deadline.state === 'proximo').sort(byDeadline),
    },
    {
      id: 'enviar',
      title: 'Prontas para enviar',
      hint: 'Proposta pronta; registre o envio quando mandar ao cliente.',
      cards: open.filter((card) => card.stage === 'pronta'),
    },
    {
      id: 'qualificar',
      title: 'Faltam dados do cliente',
      hint: 'O checklist de aptidão bloqueou o orçamento; complete os itens pendentes.',
      cards: open.filter((card) => card.stage === 'qualificacao'),
    },
    {
      id: 'avaliar',
      title: 'Aptidão a avaliar',
      hint: 'Demandas novas que ainda não passaram pelo checklist.',
      cards: open.filter((card) => card.stage === 'recebida'),
    },
  ]
  return groups
}

// ---------- clientes (derivados das oportunidades; sem cadastro novo) ----------
export type CustomerSummary = {
  key: string
  name: string
  total: number
  open: number
  sent: number
  overdue: number
  families: string[]
  contacts: Array<{ name: string; email: string }>
  lastReceivedAt: string
}

export function summarizeCustomers(cards: PipelineCard[]): CustomerSummary[] {
  const map = new Map<string, PipelineCard[]>()
  for (const card of cards) {
    const key = normalizeKey(card.opportunity.customer_name)
    if (!key) continue
    map.set(key, [...(map.get(key) ?? []), card])
  }
  const summaries = [...map.entries()].map(([key, list]) => {
    const sorted = [...list].sort((a, b) => b.opportunity.received_at.localeCompare(a.opportunity.received_at))
    const contacts = new Map<string, { name: string; email: string }>()
    for (const { opportunity } of sorted) {
      const contactKey = normalizeKey(opportunity.contact_email || opportunity.contact_name)
      if (contactKey && !contacts.has(contactKey)) {
        contacts.set(contactKey, { name: opportunity.contact_name, email: opportunity.contact_email ?? '' })
      }
    }
    return {
      key,
      name: sorted[0].opportunity.customer_name.trim(),
      total: list.length,
      open: list.filter((card) => card.stage !== 'enviada').length,
      sent: list.filter((card) => card.stage === 'enviada').length,
      overdue: list.filter((card) => card.deadline.state === 'vencido').length,
      families: [...new Set(list.map((card) => card.opportunity.service_family).filter(Boolean))].sort(),
      contacts: [...contacts.values()],
      lastReceivedAt: sorted[0].opportunity.received_at,
    }
  })
  return summaries.sort((a, b) => b.lastReceivedAt.localeCompare(a.lastReceivedAt))
}

// ---------- indicadores (amostra do sistema; não substitui baseline) ----------
export type PipelineMetrics = {
  total: number
  open: number
  overdue: number
  byStage: Record<StageId, number>
  sentCount: number
  avgDaysToSend: number | null
  sentWithDeadline: number
  sentOnTime: number
  onTimeRate: number | null
}

export function computeMetrics(cards: PipelineCard[]): PipelineMetrics {
  const byStage = Object.fromEntries(STAGES.map((stage) => [stage.id, 0])) as Record<StageId, number>
  for (const card of cards) byStage[card.stage] += 1
  const sent = cards.filter((card) => card.stage === 'enviada' && card.sentAt)
  const durations = sent
    .map((card) => daysBetween(civilDate(card.opportunity.received_at), civilDate(card.sentAt)))
    .filter((days) => Number.isFinite(days) && days >= 0)
  const withDeadline = sent.filter((card) => card.deadline.state === 'cumprido' || card.deadline.state === 'atrasado')
  const onTime = withDeadline.filter((card) => card.deadline.state === 'cumprido').length
  return {
    total: cards.length,
    open: cards.length - byStage.enviada,
    overdue: cards.filter((card) => card.deadline.state === 'vencido').length,
    byStage,
    sentCount: sent.length,
    avgDaysToSend: durations.length > 0 ? durations.reduce((sum, days) => sum + days, 0) / durations.length : null,
    sentWithDeadline: withDeadline.length,
    sentOnTime: onTime,
    onTimeRate: withDeadline.length > 0 ? onTime / withDeadline.length : null,
  }
}

// ---------- endereço do card ----------
export const CARD_TABS = ['resumo', 'ficha', 'composicoes', 'proposta', 'historico'] as const
export type CardTab = (typeof CARD_TABS)[number]

export function cardUrl(opportunityId: string, tab: CardTab = 'resumo'): string {
  return `/oportunidade?oportunidade=${encodeURIComponent(opportunityId)}&aba=${tab}`
}

export function resolveTab(value: string | null): CardTab {
  return (CARD_TABS as readonly string[]).includes(value ?? '') ? (value as CardTab) : 'resumo'
}
