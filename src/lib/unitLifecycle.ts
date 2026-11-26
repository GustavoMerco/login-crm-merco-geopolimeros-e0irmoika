/**
 * Lógica pura da reativação de unidades (T2.37), espelhando o hook
 * `units_reactivate.js`. A validação daqui não substitui o servidor: antecipa,
 * no campo, a mesma regra, para o erro aparecer onde a Engenharia corrige.
 * A transição válida é `inativo → homologado` (D-T2.16), com motivo obrigatório
 * que vai para a auditoria; o código permanece único e imutável.
 */
export const UNIT_FIELD_IDS = {
  id: 'unidade-reativar-id',
  reason: 'unidade-reativar-motivo',
} as const

export const MAX_UNIT_REASON = 1000

const ID_PATTERN = /^[a-z0-9]{15}$/

export type UnitLifecycleError = {
  field: keyof typeof UNIT_FIELD_IDS
  targetId: string
  message: string
}

export type UnitReactivateValidation = {
  errors: UnitLifecycleError[]
  firstTargetId: string | null
  valid: boolean
}

export function validateReactivateForm(input: { id: string; reason: string }): UnitReactivateValidation {
  const errors: UnitLifecycleError[] = []

  const id = input.id.trim()
  if (!ID_PATTERN.test(id)) {
    errors.push({
      field: 'id',
      targetId: UNIT_FIELD_IDS.id,
      message: 'Unidade inválida para reativar.',
    })
  }

  const reason = input.reason.trim()
  if (!reason) {
    errors.push({
      field: 'reason',
      targetId: UNIT_FIELD_IDS.reason,
      message: 'A reativação exige justificativa.',
    })
  } else if (reason.length > MAX_UNIT_REASON) {
    errors.push({
      field: 'reason',
      targetId: UNIT_FIELD_IDS.reason,
      message: `Use no máximo ${MAX_UNIT_REASON} caracteres.`,
    })
  }

  return {
    errors,
    firstTargetId: errors.length > 0 ? errors[0].targetId : null,
    valid: errors.length === 0,
  }
}

export function unitLifecycleErrorFor(
  errors: readonly UnitLifecycleError[],
  targetId: string,
): string | null {
  return errors.find((error) => error.targetId === targetId)?.message ?? null
}

/** Só unidade inativa pode ser reativada (transição inativo → homologado, D-T2.16). */
export function unitCanReactivate(status: string): boolean {
  return status === 'inativo'
}
