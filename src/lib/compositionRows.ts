import type { CatalogItemRecord } from '@/services/catalog'

/**
 * Limites espelhados do servidor (pocketbase/hooks/composition_versions.js).
 * A validação daqui não substitui o servidor: apenas antecipa, no campo, a
 * mesma regra, para o erro aparecer onde a Engenharia consegue corrigir sem
 * perder o que já preencheu.
 */
export const MAX_COMPOSITION_ROWS = 50
export const MAX_CODE = 64
export const MAX_OUTPUT_UNIT = 40
export const MAX_SOURCE = 200
export const MAX_FIXTURE_REF = 500
export const MAX_PRECISION = 40
export const MAX_TOLERANCE = 40
export const MAX_INPUT_NAME = 120
export const MAX_INPUT_UNIT = 40
export const MAX_INPUT_BOUND = 40
export const MAX_RESOURCE_UNIT = 40
export const MAX_RESOURCE_SOURCE = 200

const CODE_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Identificadores estáveis de controle, para foco e mensagem por campo. */
export const COMPOSITION_FIELD_IDS = {
  catalogItem: 'composicao-item-catalogo',
  code: 'composicao-codigo',
  outputUnit: 'composicao-unidade-saida',
  precision: 'composicao-precisao',
  tolerance: 'composicao-tolerancia',
  source: 'composicao-fonte',
  validFrom: 'composicao-vigencia-inicio',
  validUntil: 'composicao-vigencia-fim',
  fixtureRef: 'composicao-referencia-caso',
  inputs: 'composicao-insumos',
  resources: 'composicao-recursos',
} as const

export type CompositionInputColumn = 'name' | 'unit' | 'required' | 'min' | 'max' | 'sheet_param'
export type CompositionResourceColumn = 'catalog_item_id' | 'unit' | 'coefficient' | 'source'

export type CompositionRowGroup = 'inputs' | 'resources'

const ROW_PREFIX: Record<CompositionRowGroup, string> = {
  inputs: 'composicao-insumo',
  resources: 'composicao-recurso',
}

export function compositionFieldId(
  group: CompositionRowGroup,
  index: number,
  column: CompositionInputColumn | CompositionResourceColumn,
): string {
  return `${ROW_PREFIX[group]}-${index}-${column}`
}

/**
 * Identificadores estáveis dos campos do vínculo com a ficha (T2.17),
 * derivados do id da linha de insumo para foco e mensagem por campo.
 */
export function sheetParamFieldId(
  index: number,
  column: 'name' | 'unit' | 'origin' | 'min' | 'max',
): string {
  return `composicao-insumo-${index}-param-${column}`
}

/** Chave local de renderização; não vai para a API. */
let rowKeySeed = 0
function nextRowKey(prefix: string): string {
  rowKeySeed += 1
  return `${prefix}-${rowKeySeed}`
}

/** Vínculo com o parâmetro da ficha técnica (T2.17), nos limites do hook. */
export type SheetParamLink = {
  name: string
  unit: string
  origin: string
  min: string
  max: string
}

export type CompositionInputRow = {
  key: string
  name: string
  unit: string
  required: boolean
  min: string
  max: string
  /** Opcional: vínculo com o parâmetro da ficha técnica. */
  sheet_param?: SheetParamLink
}

export type CompositionResourceRow = {
  key: string
  catalog_item_id: string
  unit: string
  coefficient: string
  source: string
}

export function createInputRow(
  values: Partial<Omit<CompositionInputRow, 'key'>> = {},
): CompositionInputRow {
  return {
    key: nextRowKey('input'),
    name: values.name ?? '',
    unit: values.unit ?? '',
    required: values.required ?? false,
    min: values.min ?? '',
    max: values.max ?? '',
    sheet_param: values.sheet_param,
  }
}

export function createSheetParamLink(values: Partial<SheetParamLink> = {}): SheetParamLink {
  return {
    name: values.name ?? '',
    unit: values.unit ?? '',
    origin: values.origin ?? '',
    min: values.min ?? '',
    max: values.max ?? '',
  }
}

/** O vínculo só entra no payload quando algo foi preenchido nele. */
export function isFilledSheetParam(link: SheetParamLink | undefined): boolean {
  if (!link) return false
  return (
    link.name.trim().length > 0 ||
    link.unit.trim().length > 0 ||
    link.origin.trim().length > 0 ||
    link.min.trim().length > 0 ||
    link.max.trim().length > 0
  )
}

export function createResourceRow(
  values: Partial<Omit<CompositionResourceRow, 'key'>> = {},
): CompositionResourceRow {
  return {
    key: nextRowKey('resource'),
    catalog_item_id: values.catalog_item_id ?? '',
    unit: values.unit ?? '',
    coefficient: values.coefficient ?? '',
    source: values.source ?? '',
  }
}

/** Uma linha só é descartada quando nada foi preenchido nela. */
export function isFilledInputRow(row: CompositionInputRow): boolean {
  return (
    row.name.trim().length > 0 ||
    row.unit.trim().length > 0 ||
    row.min.trim().length > 0 ||
    row.max.trim().length > 0 ||
    isFilledSheetParam(row.sheet_param)
  )
}

export function isFilledResourceRow(row: CompositionResourceRow): boolean {
  return (
    row.catalog_item_id.trim().length > 0 ||
    row.unit.trim().length > 0 ||
    row.coefficient.trim().length > 0 ||
    row.source.trim().length > 0
  )
}

export function countFilledInputRows(rows: readonly CompositionInputRow[]): number {
  return rows.filter(isFilledInputRow).length
}

export function countFilledResourceRows(rows: readonly CompositionResourceRow[]): number {
  return rows.filter(isFilledResourceRow).length
}

export type CompositionInputPayload = {
  name: string
  unit: string
  required?: boolean
  min?: string
  max?: string
  /** Vínculo com o parâmetro da ficha técnica (T2.17). */
  sheet_param?: {
    name: string
    unit: string
    origin: string
    min?: string
    max?: string
  }
}

export type CompositionResourcePayload = {
  id: string
  unit: string
  coefficient: string
  source: string
}

/**
 * Converte as linhas da tabela no corpo que o servidor já aceita. Campos
 * opcionais não preenchidos ficam fora do payload: nada é inventado.
 */
export function toInputPayloads(rows: readonly CompositionInputRow[]): CompositionInputPayload[] {
  return rows.filter(isFilledInputRow).map((row) => {
    const payload: CompositionInputPayload = {
      name: row.name.trim(),
      unit: row.unit.trim(),
    }
    if (row.required) payload.required = true
    if (row.min.trim()) payload.min = row.min.trim()
    if (row.max.trim()) payload.max = row.max.trim()
    if (isFilledSheetParam(row.sheet_param)) {
      const link = row.sheet_param as SheetParamLink
      const sheetPayload: NonNullable<CompositionInputPayload['sheet_param']> = {
        name: link.name.trim(),
        unit: link.unit.trim(),
        origin: link.origin.trim(),
      }
      if (link.min.trim()) sheetPayload.min = link.min.trim()
      if (link.max.trim()) sheetPayload.max = link.max.trim()
      payload.sheet_param = sheetPayload
    }
    return payload
  })
}

export function toResourcePayloads(
  rows: readonly CompositionResourceRow[],
): CompositionResourcePayload[] {
  return rows.filter(isFilledResourceRow).map((row) => ({
    id: row.catalog_item_id.trim(),
    unit: row.unit.trim(),
    coefficient: row.coefficient.trim(),
    source: row.source.trim(),
  }))
}

type ResourceOption = Pick<
  CatalogItemRecord,
  'id' | 'name' | 'family' | 'unit' | 'coefficient' | 'source' | 'status' | 'item_type'
>

/** Um recurso só existe como escolha se veio da lista carregada do catálogo. */
export function resolveResourceId(items: readonly ResourceOption[], selectedId: string): string {
  return items.some((item) => item.id === selectedId && /^[a-z0-9]{15}$/.test(item.id))
    ? selectedId
    : ''
}

/** Rótulo do seletor: identifica o recurso sem expor o ID interno. */
export function resourceOptionLabel(item: ResourceOption): string {
  const parts = [item.name, item.family, item.unit, item.status].filter(
    (part) => typeof part === 'string' && part.trim().length > 0,
  )
  return parts.join(' · ')
}

export type CompositionFieldError = {
  /** Linha da tabela; -1 quando o erro é do formulário, não de uma linha. */
  index: number
  group: CompositionRowGroup | 'form'
  column: CompositionInputColumn | CompositionResourceColumn | 'form'
  targetId: string
  message: string
}

export type CompositionDraftInput = {
  catalog_item_id: string
  code: string
  output_unit: string
  source: string
  fixture_ref: string
  precision: string
  rounding: string
  tolerance: string
  valid_from: string
  valid_until: string
  inputs: readonly CompositionInputRow[]
  resources: readonly CompositionResourceRow[]
}

export type CompositionValidation = {
  errors: CompositionFieldError[]
  /** Alvo que deve receber foco: o primeiro problema na ordem de leitura. */
  firstTargetId: string | null
  valid: boolean
}

function formError(
  targetId: string,
  column: CompositionFieldError['column'],
  message: string,
): CompositionFieldError {
  return { index: -1, group: 'form', column, targetId, message }
}

export function validateCompositionDraft(
  draft: CompositionDraftInput,
  catalogItems: readonly ResourceOption[],
): CompositionValidation {
  const errors: CompositionFieldError[] = []
  const add = (error: CompositionFieldError) => errors.push(error)

  // 1. Item do catálogo: precisa existir na lista carregada.
  if (!resolveResourceId(catalogItems, draft.catalog_item_id)) {
    add(
      formError(
        COMPOSITION_FIELD_IDS.catalogItem,
        'form',
        'Selecione um item existente do catálogo. Não é possível criar a composição sem vínculo.',
      ),
    )
  }

  // 2. Código.
  const code = draft.code.trim()
  if (!code) {
    add(formError(COMPOSITION_FIELD_IDS.code, 'form', 'Informe o código da composição.'))
  } else if (code.length > MAX_CODE) {
    add(formError(COMPOSITION_FIELD_IDS.code, 'form', `Use no máximo ${MAX_CODE} caracteres.`))
  } else if (!CODE_PATTERN.test(code)) {
    add(
      formError(
        COMPOSITION_FIELD_IDS.code,
        'form',
        'Use 1–64 caracteres: letras, números, hífen ou underscore (sem espaço nem acento).',
      ),
    )
  }

  // 3. Campos de texto obrigatórios do contrato.
  const requiredText: {
    value: string
    max: number
    targetId: string
    label: string
  }[] = [
    {
      value: draft.output_unit,
      max: MAX_OUTPUT_UNIT,
      targetId: COMPOSITION_FIELD_IDS.outputUnit,
      label: 'Informe a unidade de saída.',
    },
    {
      value: draft.precision,
      max: MAX_PRECISION,
      targetId: COMPOSITION_FIELD_IDS.precision,
      label: 'Informe a precisão do cálculo.',
    },
    {
      value: draft.tolerance,
      max: MAX_TOLERANCE,
      targetId: COMPOSITION_FIELD_IDS.tolerance,
      label: 'Informe a tolerância do cálculo.',
    },
    {
      value: draft.source,
      max: MAX_SOURCE,
      targetId: COMPOSITION_FIELD_IDS.source,
      label: 'Informe a fonte da composição.',
    },
  ]
  for (const field of requiredText) {
    const value = field.value.trim()
    if (!value) {
      add(formError(field.targetId, 'form', field.label))
    } else if (value.length > field.max) {
      add(formError(field.targetId, 'form', `Use no máximo ${field.max} caracteres.`))
    }
  }

  // 4. Vigência: datas civis ISO, início não posterior ao fim (regra do servidor).
  const from = draft.valid_from.trim()
  const until = draft.valid_until.trim()
  if (!ISO_DATE_PATTERN.test(from)) {
    add(
      formError(
        COMPOSITION_FIELD_IDS.validFrom,
        'form',
        'Informe o início da vigência em uma data válida.',
      ),
    )
  }
  if (!ISO_DATE_PATTERN.test(until)) {
    add(
      formError(
        COMPOSITION_FIELD_IDS.validUntil,
        'form',
        'Informe o fim da vigência em uma data válida.',
      ),
    )
  }
  if (ISO_DATE_PATTERN.test(from) && ISO_DATE_PATTERN.test(until) && from > until) {
    add(
      formError(
        COMPOSITION_FIELD_IDS.validUntil,
        'form',
        'O início da vigência não pode ser depois do fim.',
      ),
    )
  }

  // 5. Caso de referência: obrigatório, e nunca preenchido por conta própria.
  const fixtureRef = draft.fixture_ref.trim()
  if (!fixtureRef) {
    add(
      formError(
        COMPOSITION_FIELD_IDS.fixtureRef,
        'form',
        'Informe a referência documental assinada do caso de referência. Sem ela o rascunho não é salvo.',
      ),
    )
  } else if (fixtureRef.length > MAX_FIXTURE_REF) {
    add(
      formError(
        COMPOSITION_FIELD_IDS.fixtureRef,
        'form',
        `Use no máximo ${MAX_FIXTURE_REF} caracteres.`,
      ),
    )
  }

  // 6. Insumos: pelo menos um; cada linha completa e dentro dos limites.
  const filledInputs = draft.inputs.filter(isFilledInputRow)
  if (filledInputs.length === 0) {
    add(formError(compositionFieldId('inputs', 0, 'name'), 'name', 'Informe pelo menos um insumo.'))
  } else if (draft.inputs.length > MAX_COMPOSITION_ROWS) {
    add(
      formError(
        compositionFieldId('inputs', 0, 'name'),
        'name',
        `Envie no máximo ${MAX_COMPOSITION_ROWS} insumos por composição.`,
      ),
    )
  } else {
    draft.inputs.forEach((row, index) => {
      if (!isFilledInputRow(row)) return
      const name = row.name.trim()
      if (!name) {
        add({
          index,
          group: 'inputs',
          column: 'name',
          targetId: compositionFieldId('inputs', index, 'name'),
          message: 'Informe o nome do insumo.',
        })
      } else if (name.length > MAX_INPUT_NAME) {
        add({
          index,
          group: 'inputs',
          column: 'name',
          targetId: compositionFieldId('inputs', index, 'name'),
          message: `Use no máximo ${MAX_INPUT_NAME} caracteres.`,
        })
      }

      const unit = row.unit.trim()
      if (!unit) {
        add({
          index,
          group: 'inputs',
          column: 'unit',
          targetId: compositionFieldId('inputs', index, 'unit'),
          message: 'Informe a unidade do insumo.',
        })
      } else if (unit.length > MAX_INPUT_UNIT) {
        add({
          index,
          group: 'inputs',
          column: 'unit',
          targetId: compositionFieldId('inputs', index, 'unit'),
          message: `Use no máximo ${MAX_INPUT_UNIT} caracteres.`,
        })
      }

      for (const column of ['min', 'max'] as const) {
        const value = row[column].trim()
        if (!value) continue
        if (!DECIMAL_PATTERN.test(value)) {
          add({
            index,
            group: 'inputs',
            column,
            targetId: compositionFieldId('inputs', index, column),
            message:
              column === 'min'
                ? 'Use um decimal textual para o mínimo (ex.: 0 ou 1.5).'
                : 'Use um decimal textual para o máximo (ex.: 10 ou 2.75).',
          })
        } else if (value.length > MAX_INPUT_BOUND) {
          add({
            index,
            group: 'inputs',
            column,
            targetId: compositionFieldId('inputs', index, column),
            message: `Use no máximo ${MAX_INPUT_BOUND} caracteres.`,
          })
        }
      }

      const min = row.min.trim()
      const max = row.max.trim()
      if (DECIMAL_PATTERN.test(min) && DECIMAL_PATTERN.test(max) && Number(min) > Number(max)) {
        add({
          index,
          group: 'inputs',
          column: 'max',
          targetId: compositionFieldId('inputs', index, 'max'),
          message: 'O mínimo não pode ser maior que o máximo.',
        })
      }

      // T2.17: vínculo com o parâmetro da ficha — mesmo contrato do servidor.
      if (isFilledSheetParam(row.sheet_param)) {
        const link = row.sheet_param as SheetParamLink
        const linkName = link.name.trim()
        if (!linkName) {
          add({
            index,
            group: 'inputs',
            column: 'sheet_param',
            targetId: sheetParamFieldId(index, 'name'),
            message: 'Informe o nome do parâmetro da ficha.',
          })
        } else if (linkName.length > MAX_INPUT_NAME) {
          add({
            index,
            group: 'inputs',
            column: 'sheet_param',
            targetId: sheetParamFieldId(index, 'name'),
            message: `Use no máximo ${MAX_INPUT_NAME} caracteres.`,
          })
        }

        const linkUnit = link.unit.trim()
        if (!linkUnit) {
          add({
            index,
            group: 'inputs',
            column: 'sheet_param',
            targetId: sheetParamFieldId(index, 'unit'),
            message: 'Informe a unidade do parâmetro da ficha.',
          })
        } else if (linkUnit.length > MAX_INPUT_UNIT) {
          add({
            index,
            group: 'inputs',
            column: 'sheet_param',
            targetId: sheetParamFieldId(index, 'unit'),
            message: `Use no máximo ${MAX_INPUT_UNIT} caracteres.`,
          })
        } else if (linkUnit !== unit) {
          add({
            index,
            group: 'inputs',
            column: 'sheet_param',
            targetId: sheetParamFieldId(index, 'unit'),
            message: `A unidade do parâmetro (${linkUnit}) diverge da unidade do insumo (${unit}).`,
          })
        }

        const linkOrigin = link.origin.trim()
        if (!linkOrigin) {
          add({
            index,
            group: 'inputs',
            column: 'sheet_param',
            targetId: sheetParamFieldId(index, 'origin'),
            message: 'Informe a origem do parâmetro da ficha.',
          })
        } else if (linkOrigin.length > MAX_INPUT_NAME) {
          add({
            index,
            group: 'inputs',
            column: 'sheet_param',
            targetId: sheetParamFieldId(index, 'origin'),
            message: `Use no máximo ${MAX_INPUT_NAME} caracteres.`,
          })
        }

        const linkMin = link.min.trim()
        const linkMax = link.max.trim()
        if (linkMin && !DECIMAL_PATTERN.test(linkMin)) {
          add({
            index,
            group: 'inputs',
            column: 'sheet_param',
            targetId: sheetParamFieldId(index, 'min'),
            message: 'Use um decimal textual para o mínimo do vínculo (ex.: 0 ou 1.5).',
          })
        }
        if (linkMax && !DECIMAL_PATTERN.test(linkMax)) {
          add({
            index,
            group: 'inputs',
            column: 'sheet_param',
            targetId: sheetParamFieldId(index, 'max'),
            message: 'Use um decimal textual para o máximo do vínculo (ex.: 10 ou 2.75).',
          })
        }
        if (
          DECIMAL_PATTERN.test(linkMin) &&
          DECIMAL_PATTERN.test(linkMax) &&
          Number(linkMin) > Number(linkMax)
        ) {
          add({
            index,
            group: 'inputs',
            column: 'sheet_param',
            targetId: sheetParamFieldId(index, 'max'),
            message: 'O mínimo do vínculo não pode ser maior que o máximo.',
          })
        }
      }
    })
  }

  // 7. Recursos: pelo menos um; cada linha com recurso escolhido no catálogo.
  const filledResources = draft.resources.filter(isFilledResourceRow)
  if (filledResources.length === 0) {
    add(
      formError(
        compositionFieldId('resources', 0, 'catalog_item_id'),
        'catalog_item_id',
        'Informe pelo menos um recurso.',
      ),
    )
  } else if (draft.resources.length > MAX_COMPOSITION_ROWS) {
    add(
      formError(
        compositionFieldId('resources', 0, 'catalog_item_id'),
        'catalog_item_id',
        `Envie no máximo ${MAX_COMPOSITION_ROWS} recursos por composição.`,
      ),
    )
  } else {
    draft.resources.forEach((row, index) => {
      if (!isFilledResourceRow(row)) return

      if (!resolveResourceId(catalogItems, row.catalog_item_id.trim())) {
        add({
          index,
          group: 'resources',
          column: 'catalog_item_id',
          targetId: compositionFieldId('resources', index, 'catalog_item_id'),
          message: 'Selecione o recurso na lista do catálogo. O identificador não é digitado.',
        })
      }

      const unit = row.unit.trim()
      if (!unit) {
        add({
          index,
          group: 'resources',
          column: 'unit',
          targetId: compositionFieldId('resources', index, 'unit'),
          message: 'Informe a unidade do recurso.',
        })
      } else if (unit.length > MAX_RESOURCE_UNIT) {
        add({
          index,
          group: 'resources',
          column: 'unit',
          targetId: compositionFieldId('resources', index, 'unit'),
          message: `Use no máximo ${MAX_RESOURCE_UNIT} caracteres.`,
        })
      }

      const coefficient = row.coefficient.trim()
      if (!coefficient) {
        add({
          index,
          group: 'resources',
          column: 'coefficient',
          targetId: compositionFieldId('resources', index, 'coefficient'),
          message: 'Informe o coeficiente do recurso.',
        })
      } else if (!DECIMAL_PATTERN.test(coefficient)) {
        add({
          index,
          group: 'resources',
          column: 'coefficient',
          targetId: compositionFieldId('resources', index, 'coefficient'),
          message: 'Use decimal textual, sem vírgula nem expoente (ex.: 1 ou 1.5).',
        })
      }

      const source = row.source.trim()
      if (!source) {
        add({
          index,
          group: 'resources',
          column: 'source',
          targetId: compositionFieldId('resources', index, 'source'),
          message: 'Informe a fonte/versão do recurso.',
        })
      } else if (source.length > MAX_RESOURCE_SOURCE) {
        add({
          index,
          group: 'resources',
          column: 'source',
          targetId: compositionFieldId('resources', index, 'source'),
          message: `Use no máximo ${MAX_RESOURCE_SOURCE} caracteres.`,
        })
      }
    })
  }

  return {
    errors,
    firstTargetId: errors.length > 0 ? errors[0].targetId : null,
    valid: errors.length === 0,
  }
}

export function errorForTarget(
  errors: readonly CompositionFieldError[],
  targetId: string,
): string | null {
  return errors.find((error) => error.targetId === targetId)?.message ?? null
}
