import { describe, expect, it } from 'vitest'
import {
  canSubmitCompositionForCatalog,
  catalogItemOptionLabel,
  resolveCatalogItemId,
} from './compositionCatalog'
import type { CatalogItemRecord } from '@/services/catalog'

const catalogItem = {
  id: 'krkue1xg6fiwlfe',
  name: 'Serviço sintético',
  item_type: 'servico',
  family: 'Geotecnia',
  status: 'rascunho',
} as CatalogItemRecord

describe('catalog selection for composition creation (T2.15 debug)', () => {
  it('returns an ID only when it matches an item loaded from the catalog', () => {
    expect(resolveCatalogItemId([catalogItem], catalogItem.id)).toBe(catalogItem.id)
    expect(resolveCatalogItemId([catalogItem], 'Serviço sintético')).toBe('')
    expect(resolveCatalogItemId([catalogItem], 'fakefakefakefak')).toBe('')
    expect(resolveCatalogItemId([], catalogItem.id)).toBe('')
  })

  it('blocks empty, loading, failed, or unselected catalog states', () => {
    expect(
      canSubmitCompositionForCatalog(
        { items: [catalogItem], loading: false, error: null },
        catalogItem.id,
      ),
    ).toBe(true)
    expect(canSubmitCompositionForCatalog({ items: [], loading: false, error: null }, '')).toBe(
      false,
    )
    expect(
      canSubmitCompositionForCatalog(
        { items: [catalogItem], loading: true, error: null },
        catalogItem.id,
      ),
    ).toBe(false)
    expect(
      canSubmitCompositionForCatalog(
        { items: [catalogItem], loading: false, error: 'offline' },
        catalogItem.id,
      ),
    ).toBe(false)
    expect(
      canSubmitCompositionForCatalog(
        { items: [catalogItem], loading: false, error: null },
        'fakefakefakefak',
      ),
    ).toBe(false)
  })

  it.each(['', 'Serviço sintético', 'KRKUE1XG6FIWLFE', '12345678901234', '1234567890123456'])(
    'rejects an absent or malformed ID: %s',
    (value) => {
      expect(resolveCatalogItemId([catalogItem], value)).toBe('')
    },
  )

  it('shows enough identifying context and the actual server ID in the option', () => {
    const label = catalogItemOptionLabel(catalogItem)
    expect(label).toContain('Serviço sintético')
    expect(label).toContain('Geotecnia')
    expect(label).toContain('servico')
    expect(label).toContain(catalogItem.id)
  })
})
