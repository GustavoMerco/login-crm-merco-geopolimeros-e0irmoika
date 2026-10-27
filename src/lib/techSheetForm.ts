import type { TechSheetParameter } from '@/services/techSheets'

/** Limites espelhados do servidor (hook tech_sheet_create.js). */
export const MAX_PARAMETERS = 50
export const MAX_PARAMETER_NAME = 120
export const MAX_PARAMETER_VALUE = 200
export const MAX_PARAMETER_UNIT = 40
export const MAX_PARAMETER_ORIGIN = 120
export const MAX_PENDING_ITEMS = 50
export const MAX_PENDING_ITEM_LENGTH = 300
export const MAX_NOTES = 2000
export const MAX_ATTACHMENTS = 10

export type TechSheetParameterField = keyof TechSheetParameter

export type TechSheetFieldError = {
  /** Índice do parâmetro; -1 quando o erro é do formulário, não de uma linha. */
  index: number
  field: TechSheetParameterField | 'pending_items' | 'notes' | 'attachments'
  targetId: string
  message: string
}

export function techSheetFieldId(
  index: number,
  field: TechSheetParameterField | 'pending_items' | 'notes' | 'attachments',
): string {
  return `ficha-${field}-${index}`
}

const FIELD_STEPS: {
  field: TechSheetParameterField
  max: number
  label: string
}[] = [
  { field: 'name', max: MAX_PARAMETER_NAME, label: 'Informe o nome do parâmetro.' },
  { field: 'value', max: MAX_PARAMETER_VALUE, label: 'Informe o valor do parâmetro.' },
  { field: 'unit', max: MAX_PARAMETER_UNIT, label: 'Informe a unidade do parâmetro.' },
  { field: 'origin', max: MAX_PARAMETER_ORIGIN, label: 'Informe a origem do parâmetro.' },
]

/**
 * Validação de apresentação. Não substitui o servidor: apenas antecipa, no
 * campo, as mesmas regras, para que o erro apareça onde o usuário pode
 * corrigir sem perder o que já digitou.
 */
export function validateTechSheetParameters(
  parameters: readonly TechSheetParameter[],
): TechSheetFieldError[] {
  const errors: TechSheetFieldError[] = []

  if (parameters.length === 0) {
    errors.push({
      index: -1,
      field: 'name',
      targetId: techSheetFieldId(0, 'name'),
      message: 'Informe pelo menos um parâmetro técnico.',
    })
    return errors
  }

  if (parameters.length > MAX_PARAMETERS) {
    errors.push({
      index: -1,
      field: 'name',
      targetId: techSheetFieldId(0, 'name'),
      message: `Envie no máximo ${MAX_PARAMETERS} parâmetros por versão.`,
    })
  }

  const seen = new Map<string, number>()

  parameters.forEach((parameter, index) => {
    for (const step of FIELD_STEPS) {
      const raw = (parameter[step.field] ?? '').toString().trim()
      if (!raw) {
        errors.push({
          index,
          field: step.field,
          targetId: techSheetFieldId(index, step.field),
          message: step.label,
        })
        continue
      }
      if (raw.length > step.max) {
        errors.push({
          index,
          field: step.field,
          targetId: techSheetFieldId(index, step.field),
          message: `Use no máximo ${step.max} caracteres.`,
        })
      }
    }

    const name = (parameter.name ?? '').toString().trim().toLowerCase()
    if (name) {
      const previous = seen.get(name)
      if (previous !== undefined) {
        errors.push({
          index,
          field: 'name',
          targetId: techSheetFieldId(index, 'name'),
          message: `Parâmetro repetido: ${parameter.name.trim()} (já informado no item ${previous + 1}).`,
        })
      } else {
        seen.set(name, index)
      }
    }
  })

  return errors
}

export function parsePendingItems(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

export function validateTechSheetExtras(input: {
  pendingText: string
  notes: string
  attachmentCount: number
}): TechSheetFieldError[] {
  const errors: TechSheetFieldError[] = []
  const pending = parsePendingItems(input.pendingText)

  if (pending.length > MAX_PENDING_ITEMS) {
    errors.push({
      index: -1,
      field: 'pending_items',
      targetId: techSheetFieldId(-1, 'pending_items'),
      message: `Envie no máximo ${MAX_PENDING_ITEMS} pendências por versão.`,
    })
  }
  if (pending.some((item) => item.length > MAX_PENDING_ITEM_LENGTH)) {
    errors.push({
      index: -1,
      field: 'pending_items',
      targetId: techSheetFieldId(-1, 'pending_items'),
      message: `Cada pendência deve ter no máximo ${MAX_PENDING_ITEM_LENGTH} caracteres.`,
    })
  }
  if (input.notes.trim().length > MAX_NOTES) {
    errors.push({
      index: -1,
      field: 'notes',
      targetId: techSheetFieldId(-1, 'notes'),
      message: `As observações devem ter no máximo ${MAX_NOTES} caracteres.`,
    })
  }
  if (input.attachmentCount > MAX_ATTACHMENTS) {
    errors.push({
      index: -1,
      field: 'attachments',
      targetId: techSheetFieldId(-1, 'attachments'),
      message: `Anexe no máximo ${MAX_ATTACHMENTS} arquivos por versão.`,
    })
  }

  return errors
}

export type TechSheetValidation = {
  errors: TechSheetFieldError[]
  /** Alvo que deve receber foco: o primeiro erro na ordem de leitura. */
  firstTargetId: string | null
  valid: boolean
}

export function validateTechSheet(input: {
  parameters: readonly TechSheetParameter[]
  pendingText: string
  notes: string
  attachmentCount: number
}): TechSheetValidation {
  const errors = [
    ...validateTechSheetParameters(input.parameters),
    ...validateTechSheetExtras(input),
  ]
  return {
    errors,
    firstTargetId: errors.length > 0 ? errors[0].targetId : null,
    valid: errors.length === 0,
  }
}

export function errorForField(
  errors: readonly TechSheetFieldError[],
  index: number,
  field: TechSheetFieldError['field'],
): string | null {
  return errors.find((error) => error.index === index && error.field === field)?.message ?? null
}

export type TechSheetErrorKind = 'forbidden' | 'not-found' | 'unauthorized' | 'other'

export function classifyTechSheetError(status: number | undefined): TechSheetErrorKind {
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not-found'
  if (status === 401) return 'unauthorized'
  return 'other'
}

export function techSheetAccessMessage(kind: TechSheetErrorKind): string | null {
  if (kind === 'forbidden') {
    return 'Somente o responsável pela demanda pode consultar ou registrar a ficha técnica.'
  }
  if (kind === 'not-found') {
    return 'Esta demanda não está disponível para o seu usuário. A ficha técnica é restrita ao responsável pela demanda.'
  }
  if (kind === 'unauthorized') {
    return 'Sua sessão expirou. Entre novamente para continuar.'
  }
  return null
}

export type TechSheetScreenState =
  | 'loading'
  | 'error'
  | 'forbidden'
  | 'unavailable'
  | 'no-context'
  | 'empty'
  | 'ready'

/**
 * Negação de leitura precisa de estado próprio. O PocketBase aplica `viewRule`
 * como checagem binária e responde 404 (não 403) quando o registro não é
 * acessível — por isso "não encontrado" aqui é acesso negado, não erro de rede.
 */
export function describeTechSheetState(input: {
  loadingOpportunity: boolean
  loadingHistory: boolean
  opportunityError: TechSheetErrorKind | null
  historyError: TechSheetErrorKind | null
  hasOpportunity: boolean
  versionCount: number
}): TechSheetScreenState {
  if (input.loadingOpportunity) return 'loading'
  if (input.opportunityError === 'forbidden' || input.historyError === 'forbidden')
    return 'forbidden'
  if (
    input.opportunityError === 'not-found' ||
    input.opportunityError === 'unauthorized' ||
    input.historyError === 'not-found' ||
    input.historyError === 'unauthorized'
  ) {
    return 'unavailable'
  }
  if (input.opportunityError || input.historyError) return 'error'
  if (!input.hasOpportunity) return 'no-context'
  if (input.loadingHistory) return 'loading'
  if (input.versionCount === 0) return 'empty'
  return 'ready'
}

export function techSheetUrl(opportunityId: string): string {
  return `/ficha?oportunidade=${encodeURIComponent(opportunityId)}`
}

export function resolveOpportunityContext(rawId: string | null | undefined): string {
  return typeof rawId === 'string' && /^[a-z0-9]{15}$/.test(rawId) ? rawId : ''
}
