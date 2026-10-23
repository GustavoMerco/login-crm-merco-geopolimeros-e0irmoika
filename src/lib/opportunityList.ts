export type OpportunityListItem = {
  id: string
  customer_name: string
  contact_name: string
  contact_email?: string
  origin: string
  service_family: string
  location: string
  demand_date: string
  deadline_date?: string
  received_at: string
  status: string
  aptitude_status?: string
}

export type OpportunitySearchState = {
  items: readonly OpportunityListItem[]
  query: string
}

const SEARCH_FIELDS: readonly (keyof OpportunityListItem)[] = [
  'customer_name',
  'contact_name',
  'contact_email',
  'origin',
  'service_family',
  'location',
  'demand_date',
  'status',
]

/**
 * Busca local sobre as demandas já carregadas e autorizadas pelo servidor.
 * Filtro em memória: não cria consulta nova nem amplia acesso; o servidor
 * continua sendo a autoridade de listagem (listRule por responsável).
 */
export function filterOpportunities(
  items: readonly OpportunityListItem[],
  rawQuery: string,
): OpportunityListItem[] {
  const query = normalizeSearchTerm(rawQuery)
  if (!query) return [...items]
  const terms = query.split(' ').filter(Boolean)
  return items.filter((item) => {
    const haystack = SEARCH_FIELDS.map((field) => normalizeSearchTerm(item[field])).join(' ')
    return terms.every((term) => haystack.includes(term))
  })
}

export function normalizeSearchTerm(value: string | undefined | null): string {
  return (value ?? '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function resolveOpportunityId(
  items: readonly OpportunityListItem[],
  selectedId: string,
): string {
  return items.some((item) => item.id === selectedId && /^[a-z0-9]{15}$/.test(item.id))
    ? selectedId
    : ''
}

/**
 * Contexto preservado ao voltar do detalhe para a lista: a demanda consultada
 * e o termo de busca continuam visíveis e aplicados.
 */
export type OpportunityListContext = {
  query: string
  selectedId: string
}

export function describeOpportunityEmptyState(
  context: OpportunityListContext,
  items: readonly OpportunityListItem[],
  isLoading: boolean,
  error: string | null,
): 'loading' | 'error' | 'empty' | 'no-results' | 'ready' {
  if (isLoading) return 'loading'
  if (error) return 'error'
  if (items.length === 0) return 'empty'
  if (filterOpportunities(items, context.query).length === 0) return 'no-results'
  return 'ready'
}

export function opportunityOptionLabel(item: OpportunityListItem): string {
  return `${item.customer_name} · ${item.service_family} · ${item.location} · ${item.demand_date}`
}
