import pb from '@/lib/pocketbase/client'

export type CatalogItemRecord = {
  id: string
  family: string
  item_type: 'servico' | 'composicao' | 'recurso'
  name: string
  description: string
  unit: string
  coefficient: string
  source: string
  valid_from: string
  valid_until: string
  status: 'rascunho' | 'homologado' | 'inativo'
  inactive_reason: string
  created_by: string
  homologated_by: string
  homologated_at: string
  created: string
}

export type CreateCatalogItemInput = {
  family: string
  item_type: 'servico' | 'composicao' | 'recurso'
  name: string
  description?: string
  unit: string
  coefficient?: string
  source: string
  valid_from: string
  valid_until: string
}

export type UsableCatalogItem = {
  id: string
  family: string
  itemType: string
  name: string
  description: string
  unit: string
  coefficient: string
  source: string
  validFrom: string
  validUntil: string
}

export const getCatalogItems = async () => {
  const result = await pb.collection('catalog_items').getList<CatalogItemRecord>(1, 100, {
    sort: '-created',
  })
  return result.items
}

export const getUsableCatalogItems = (family?: string) => {
  const query = family ? `?family=${encodeURIComponent(family)}` : ''
  return pb.send<{ items: UsableCatalogItem[] }>(`/backend/v1/catalog/usable${query}`, {
    method: 'GET',
  })
}

export const createCatalogItem = (input: CreateCatalogItemInput) =>
  pb.send<{ id: string; status: string }>('/backend/v1/catalog/items', {
    method: 'POST',
    body: JSON.stringify(input),
    headers: { 'Content-Type': 'application/json' },
  })

export const updateCatalogDraft = (
  id: string,
  input: Omit<CreateCatalogItemInput, 'family' | 'item_type'>,
) =>
  pb.send<{ id: string; status: string }>('/backend/v1/catalog/update-draft', {
    method: 'POST',
    body: JSON.stringify({ id, ...input }),
    headers: { 'Content-Type': 'application/json' },
  })

export const homologateCatalogItem = (id: string) =>
  pb.send<{ id: string; status: string; homologatedAt: string }>('/backend/v1/catalog/homologate', {
    method: 'POST',
    body: JSON.stringify({ id }),
    headers: { 'Content-Type': 'application/json' },
  })

export const deactivateCatalogItem = (id: string, reason: string) =>
  pb.send<{ id: string; status: string }>('/backend/v1/catalog/deactivate', {
    method: 'POST',
    body: JSON.stringify({ id, reason }),
    headers: { 'Content-Type': 'application/json' },
  })
