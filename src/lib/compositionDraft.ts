import {
  createInputRow,
  createResourceRow,
  type CompositionInputRow,
  type CompositionResourceRow,
} from './compositionRows'

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
  inputs: CompositionInputRow[]
  resources: CompositionResourceRow[]
}

export function createInitialCompositionDraft(): CompositionDraftForm {
  return {
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
    // Uma linha vazia em cada tabela: o formulário abre pronto para digitar,
    // sem parecer que já existe conteúdo.
    inputs: [createInputRow()],
    resources: [createResourceRow()],
  }
}

/**
 * A chave de renderização é local e não representa conteúdo: comparar rascunhos
 * precisa ignorá-la, ou toda troca de linha viraria "alteração não salva".
 */
function signature(form: CompositionDraftForm): string {
  return JSON.stringify({
    catalog_item_id: form.catalog_item_id,
    code: form.code,
    output_unit: form.output_unit,
    source: form.source,
    fixture_ref: form.fixture_ref,
    precision: form.precision,
    rounding: form.rounding,
    tolerance: form.tolerance,
    valid_from: form.valid_from,
    valid_until: form.valid_until,
    // T2.17: o vínculo com a ficha entra na assinatura — trocá-lo é alteração
    // não salva, igual a qualquer outro campo.
    inputs: form.inputs.map((row) => [
      row.name,
      row.unit,
      row.required,
      row.min,
      row.max,
      row.sheet_param
        ? [
            row.sheet_param.name,
            row.sheet_param.unit,
            row.sheet_param.origin,
            row.sheet_param.min,
            row.sheet_param.max,
          ]
        : null,
    ]),
    resources: form.resources.map((row) => [
      row.catalog_item_id,
      row.unit,
      row.coefficient,
      row.source,
    ]),
  })
}

export function hasUnsavedCompositionChanges(
  current: CompositionDraftForm,
  saved: CompositionDraftForm,
): boolean {
  return signature(current) !== signature(saved)
}

/**
 * Depois de um salvamento confirmado pelo servidor, o formulário volta ao
 * estado limpo sem apagar os valores de referência já preenchidos.
 */
export function afterCompositionSaved(form: CompositionDraftForm): CompositionDraftForm {
  return {
    ...form,
    code: '',
    inputs: [createInputRow()],
    resources: [createResourceRow()],
  }
}
