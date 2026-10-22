import type { CatalogItemRecord } from '@/services/catalog'

type CatalogItemOption = Pick<CatalogItemRecord, 'id' | 'name' | 'family' | 'item_type' | 'status'>

export type CatalogItemsState = {
  items: readonly CatalogItemOption[]
  loading: boolean
  error: string | null
}

export function resolveCatalogItemId(
  items: readonly CatalogItemOption[],
  selectedId: string,
): string {
  return items.some((item) => item.id === selectedId && /^[a-z0-9]{15}$/.test(item.id))
    ? selectedId
    : ''
}

export function canSubmitCompositionForCatalog(
  state: CatalogItemsState,
  selectedId: string,
): boolean {
  return !state.loading && !state.error && resolveCatalogItemId(state.items, selectedId).length > 0
}

export function catalogItemOptionLabel(item: CatalogItemOption): string {
  return `${item.name} · ${item.family} · ${item.item_type} · ${item.status} · ID: ${item.id}`
}
