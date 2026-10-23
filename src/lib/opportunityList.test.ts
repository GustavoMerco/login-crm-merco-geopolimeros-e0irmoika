import { describe, expect, it } from 'vitest'
import {
  describeOpportunityEmptyState,
  filterOpportunities,
  normalizeSearchTerm,
  opportunityOptionLabel,
  resolveOpportunityId,
  type OpportunityListItem,
} from './opportunityList'

const base = {
  id: 'aaaaaaaaaaaaaaa',
  customer_name: 'Cliente Geotecnia',
  contact_name: 'Maria Souza',
  contact_email: 'maria@exemplo.com',
  origin: 'Indicação',
  service_family: 'Geotecnia',
  location: 'Belo Horizonte',
  demand_date: '2026-10-01',
  received_at: '2026-10-01T12:00:00.000Z',
  status: 'received',
} as OpportunityListItem

const other = {
  ...base,
  id: 'bbbbbbbbbbbbbbb',
  customer_name: 'Indústria Poliureia',
  contact_name: 'João Lima',
  contact_email: 'joao@exemplo.com',
  service_family: 'Poliureia',
  location: 'São Paulo',
} as OpportunityListItem

const items = [base, other]

describe('opportunity list search (T2.31)', () => {
  it('returns every loaded record when the query is empty', () => {
    expect(filterOpportunities(items, '')).toHaveLength(2)
    expect(filterOpportunities(items, '   ')).toHaveLength(2)
  })

  it('matches by customer, family, contact, location and origin', () => {
    expect(filterOpportunities(items, 'geotecnia').map((i) => i.id)).toEqual([base.id])
    expect(filterOpportunities(items, 'maria').map((i) => i.id)).toEqual([base.id])
    expect(filterOpportunities(items, 'são paulo').map((i) => i.id)).toEqual([other.id])
    expect(filterOpportunities(items, 'indicação').map((i) => i.id)).toEqual([base.id])
  })

  it('is accent and case insensitive', () => {
    expect(normalizeSearchTerm('São Paulo')).toBe('sao paulo')
    expect(filterOpportunities(items, 'SAO PAULO')).toHaveLength(1)
    expect(filterOpportunities(items, 'poliureia')).toHaveLength(1)
  })

  it('requires all terms to match and returns no results for unknown terms', () => {
    expect(filterOpportunities(items, 'cliente geotecnia')).toHaveLength(1)
    expect(filterOpportunities(items, 'cliente poliureia')).toHaveLength(0)
    expect(filterOpportunities(items, 'inexistente')).toHaveLength(0)
  })

  it('does not mutate the loaded list', () => {
    const original = [...items]
    filterOpportunities(items, 'geotecnia')
    expect(items).toEqual(original)
  })
})

describe('opportunity selection and empty states (T2.31)', () => {
  it('accepts only an ID present in the authorized list', () => {
    expect(resolveOpportunityId(items, base.id)).toBe(base.id)
    expect(resolveOpportunityId(items, 'Cliente Geotecnia')).toBe('')
    expect(resolveOpportunityId(items, 'zzzzzzzzzzzzzzz')).toBe('')
    expect(resolveOpportunityId([], base.id)).toBe('')
    expect(resolveOpportunityId(items, 'ABCDEFGHIJKLMNO')).toBe('')
  })

  it('distinguishes loading, error, empty, no-results and ready', () => {
    const context = { query: '', selectedId: '' }
    expect(describeOpportunityEmptyState(context, [], true, null)).toBe('loading')
    expect(describeOpportunityEmptyState(context, [], false, 'offline')).toBe('error')
    expect(describeOpportunityEmptyState(context, [], false, null)).toBe('empty')
    expect(
      describeOpportunityEmptyState({ query: 'inexistente', selectedId: '' }, items, false, null),
    ).toBe('no-results')
    expect(describeOpportunityEmptyState(context, items, false, null)).toBe('ready')
  })

  it('keeps the search term when returning from the detail view', () => {
    const context = { query: 'geotecnia', selectedId: base.id }
    expect(describeOpportunityEmptyState(context, items, false, null)).toBe('ready')
    expect(filterOpportunities(items, context.query)).toHaveLength(1)
    expect(resolveOpportunityId(items, context.selectedId)).toBe(base.id)
  })

  it('labels an option with enough context to distinguish records', () => {
    const label = opportunityOptionLabel(base)
    expect(label).toContain('Cliente Geotecnia')
    expect(label).toContain('Geotecnia')
    expect(label).toContain('Belo Horizonte')
    expect(label).toContain('2026-10-01')
  })
})
