import pb from '@/lib/pocketbase/client'

export type CompositionInput = {
  name: string
  unit: string
  required?: boolean
  min?: string
  max?: string
}

export type CompositionResource = {
  id: string
  unit: string
  coefficient: string
  source: string
}

export type CompositionRecord = {
  id: string
  catalog_item_id: string
  code: string
  family: string
  version: number
  status: 'rascunho' | 'homologado' | 'inativo'
  output_unit: string
  inputs: string
  resources: string
  formula_ast: string
  source: string
  valid_from: string
  valid_until: string
  owner_id: string
  fixture_ref: string
  precision: string
  rounding: string
  tolerance: string
  created_by: string
  homologated_by: string
  homologated_at: string
  inactive_reason: string
  created: string
}

export type CompositionInputPayload = {
  name: string
  unit: string
  /** Opcionais homologados (o hook aceita e não exige). */
  required?: boolean
  min?: string
  max?: string
}

export type CompositionResourcePayload = {
  id: string
  unit: string
  coefficient: string
  source: string
}

export type CreateCompositionInput = {
  catalog_item_id: string
  code: string
  output_unit: string
  source: string
  fixture_ref: string
  precision: string
  rounding: 'normal' | 'up' | 'down'
  tolerance: string
  valid_from: string
  valid_until: string
  owner_id: string
  inputs: CompositionInputPayload[]
  resources: CompositionResourcePayload[]
  formula_ast: Record<string, unknown>
}

export type ReviseCompositionInput = Omit<
  CreateCompositionInput,
  'catalog_item_id' | 'owner_id'
> & {
  id: string
}

export type CompositionListItem = {
  id: string
  code: string
  family: string
  version: number
  status: 'rascunho' | 'homologado' | 'inativo'
  outputUnit: string
  inputsCount: number
  resourcesCount: number
  source: string
  validFrom: string
  validUntil: string
  fixtureRef: string
  created: string
}

export const getCompositions = () =>
  pb.send<{ items: CompositionListItem[] }>('/backend/v1/compositions', { method: 'GET' })

export const createComposition = (input: CreateCompositionInput) =>
  pb.send<{ id: string; version: number; status: string }>('/backend/v1/compositions', {
    method: 'POST',
    body: JSON.stringify(input),
    headers: { 'Content-Type': 'application/json' },
  })

export const reviseComposition = (input: ReviseCompositionInput) =>
  pb.send<{ id: string; version: number; status: string }>('/backend/v1/compositions/revise', {
    method: 'POST',
    body: JSON.stringify(input),
    headers: { 'Content-Type': 'application/json' },
  })
