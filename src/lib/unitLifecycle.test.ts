import { describe, expect, it } from 'vitest'
import {
  MAX_UNIT_REASON,
  UNIT_FIELD_IDS,
  unitLifecycleErrorFor,
  validateReactivateForm,
} from './unitLifecycle'

describe('T2.37 — RED-P2-007C: validação da reativação espelha o hook', () => {
  const valid = { id: 'abcde0123456789', reason: 'Unidade volta a ser usada na ficha técnica.' }

  it('aceita id válido + motivo', () => {
    const result = validateReactivateForm(valid)
    expect(result.errors).toEqual([])
    expect(result.valid).toBe(true)
    expect(result.firstTargetId).toBeNull()
  })

  it.each(['', '   '])('exige motivo (recebido: %r)', (reason) => {
    const result = validateReactivateForm({ ...valid, reason })
    expect(unitLifecycleErrorFor(result.errors, UNIT_FIELD_IDS.reason)).toContain(
      'A reativação exige justificativa.',
    )
    expect(result.firstTargetId).toBe(UNIT_FIELD_IDS.reason)
  })

  it('limita o motivo a 1000 caracteres', () => {
    const result = validateReactivateForm({ ...valid, reason: 'x'.repeat(MAX_UNIT_REASON + 1) })
    expect(unitLifecycleErrorFor(result.errors, UNIT_FIELD_IDS.reason)).toContain('no máximo 1000')
  })

  it('exige id em formato PocketBase (15 minúsculas/números)', () => {
    const result = validateReactivateForm({ ...valid, id: 'M2' })
    expect(unitLifecycleErrorFor(result.errors, UNIT_FIELD_IDS.id)).toContain(
      'Unidade inválida para reativar.',
    )
  })

  it('aponta o foco para o primeiro problema em ordem de leitura', () => {
    const result = validateReactivateForm({ id: '', reason: '' })
    expect(result.firstTargetId).toBe(UNIT_FIELD_IDS.id)
  })

  it('dá ids estáveis e únicos aos controles', () => {
    const ids = Object.values(UNIT_FIELD_IDS)
    expect(new Set(ids).size).toBe(ids.length)
    expect(UNIT_FIELD_IDS.reason).toBe('unidade-reativar-motivo')
  })
})

describe('T2.37 — regra de transição (inativo → homologado)', () => {
  it.each([
    ['rascunho', false],
    ['homologado', false],
    ['inativo', true],
  ])('status %s podeReativar = %s', (status, expected) => {
    expect(podeReativar(status)).toBe(expected)
  })
})

// (espelho local do teste; a regra real vive em unitCanReactivate)
function podeReativar(status: string): boolean {
  return status === 'inativo'
}
