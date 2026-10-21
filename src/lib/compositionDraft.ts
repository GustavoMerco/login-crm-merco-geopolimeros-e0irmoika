export type CompositionDraftForm = {
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
  inputs_text: string
  resources_text: string
}

export const INITIAL_COMPOSITION_DRAFT: CompositionDraftForm = {
  catalog_item_id: '',
  code: '',
  output_unit: '',
  source: '',
  fixture_ref: '',
  precision: '2 casas decimais',
  rounding: 'normal',
  tolerance: '5%',
  valid_from: '',
  valid_until: '',
  inputs_text: '',
  resources_text: '',
}

export function hasUnsavedCompositionChanges(
  current: CompositionDraftForm,
  saved: CompositionDraftForm,
): boolean {
  return (Object.keys(current) as (keyof CompositionDraftForm)[]).some(
    (field) => current[field] !== saved[field],
  )
}
