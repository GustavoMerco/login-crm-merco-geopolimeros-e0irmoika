/**
 * Lógica pura do cadastro de unidades (T2.16), espelhando os limites do hook
 * `units_create.js`. A validação daqui não substitui o servidor: antecipa, no
 * campo, a mesma regra, para o erro aparecer onde a Engenharia corrige.
 */
export const UNIT_DIMENSIONS = [
  'area',
  'massa',
  'comprimento',
  'volume',
  'massa/area',
  'tempo',
  'adimensional',
] as const

export type UnitDimension = (typeof UNIT_DIMENSIONS)[number]

export const DIMENSION_LABELS: Record<UnitDimension, string> = {
  area: 'Área',
  massa: 'Massa',
  comprimento: 'Comprimento',
  volume: 'Volume',
  'massa/area': 'Massa/área',
  tempo: 'Tempo',
  adimensional: 'Adimensional',
}

export const UNIT_FIELD_IDS = {
  code: 'unidade-codigo',
  name: 'unidade-nome',
  dimension: 'unidade-dimensao',
} as const

export const MAX_UNIT_CODE = 20
export const MAX_UNIT_NAME = 120

const CODE_PATTERN = /^[a-z0-9/]{1,20}$/

export type UnitFormError = {
  field: keyof typeof UNIT_FIELD_IDS
  targetId: string
  message: string
}

export type UnitValidation = {
  errors: UnitFormError[]
  firstTargetId: string | null
  valid: boolean
}

export function validateUnitForm(input: {
  code: string
  name: string
  dimension: string
}): UnitValidation {
  const errors: UnitFormError[] = []

  const code = input.code.trim()
  if (!code) {
    errors.push({
      field: 'code',
      targetId: UNIT_FIELD_IDS.code,
      message: 'Informe o código da unidade.',
    })
  } else if (code.length > MAX_UNIT_CODE) {
    errors.push({
      field: 'code',
      targetId: UNIT_FIELD_IDS.code,
      message: `Use no máximo ${MAX_UNIT_CODE} caracteres.`,
    })
  } else if (!CODE_PATTERN.test(code)) {
    errors.push({
      field: 'code',
      targetId: UNIT_FIELD_IDS.code,
      message:
        'Use 1–20 caracteres: minúsculas, números ou barra (ex.: m2, kg, kg/m2) — sem espaço, acento ou maiúscula.',
    })
  }

  const name = input.name.trim()
  if (!name) {
    errors.push({
      field: 'name',
      targetId: UNIT_FIELD_IDS.name,
      message: 'Informe o nome da unidade.',
    })
  } else if (name.length > MAX_UNIT_NAME) {
    errors.push({
      field: 'name',
      targetId: UNIT_FIELD_IDS.name,
      message: `Use no máximo ${MAX_UNIT_NAME} caracteres.`,
    })
  }

  if (!UNIT_DIMENSIONS.includes(input.dimension as UnitDimension)) {
    errors.push({
      field: 'dimension',
      targetId: UNIT_FIELD_IDS.dimension,
      message: 'Selecione a dimensão da unidade.',
    })
  }

  return {
    errors,
    firstTargetId: errors.length > 0 ? errors[0].targetId : null,
    valid: errors.length === 0,
  }
}

export function unitErrorFor(errors: readonly UnitFormError[], targetId: string): string | null {
  return errors.find((error) => error.targetId === targetId)?.message ?? null
}

/** Rótulo do estado com a mesma forma usada nas demais superfícies. */
export function unitStatusLabel(status: string): string {
  if (status === 'homologado') return 'HOMOLOGADO'
  if (status === 'inativo') return 'INATIVO'
  return 'RASCUNHO'
}

export function unitStatusTone(status: string): 'ok' | 'off' | 'draft' {
  if (status === 'homologado') return 'ok'
  if (status === 'inativo') return 'off'
  return 'draft'
}
