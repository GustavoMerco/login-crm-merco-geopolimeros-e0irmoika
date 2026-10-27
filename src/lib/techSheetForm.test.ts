import { describe, expect, it } from 'vitest'
import {
  MAX_ATTACHMENTS,
  MAX_NOTES,
  MAX_PENDING_ITEM_LENGTH,
  classifyTechSheetError,
  describeTechSheetState,
  errorForField,
  parsePendingItems,
  resolveOpportunityContext,
  techSheetAccessMessage,
  techSheetFieldId,
  techSheetUrl,
  validateTechSheet,
  validateTechSheetExtras,
  validateTechSheetParameters,
} from './techSheetForm'
import type { TechSheetParameter } from '@/services/techSheets'

const valid: TechSheetParameter = {
  name: 'Espessura da camada',
  value: '3,0',
  unit: 'mm',
  origin: 'Visita técnica',
}

const baseInput = {
  parameters: [valid],
  pendingText: '',
  notes: '',
  attachmentCount: 0,
}

describe('validação da ficha técnica no campo (T2.32)', () => {
  it('aceita um parâmetro completo', () => {
    expect(validateTechSheetParameters([valid])).toEqual([])
    expect(validateTechSheet(baseInput).valid).toBe(true)
    expect(validateTechSheet(baseInput).firstTargetId).toBeNull()
  })

  it('exige pelo menos um parâmetro', () => {
    const errors = validateTechSheetParameters([])
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toContain('pelo menos um parâmetro')
  })

  it('aponta cada campo obrigatório vazio na própria linha', () => {
    const errors = validateTechSheetParameters([{ name: '', value: '', unit: '', origin: '' }])
    expect(errors.filter((e) => e.index === 0).map((e) => e.field)).toEqual([
      'name',
      'value',
      'unit',
      'origin',
    ])
  })

  it('aponta o segundo parâmetro incompleto sem acusar o primeiro', () => {
    const errors = validateTechSheetParameters([
      valid,
      { name: 'Granulometria', value: '', unit: 'mm', origin: '' },
    ])
    expect(errors.map((e) => `${e.index}:${e.field}`)).toEqual(['1:value', '1:origin'])
  })

  it('rejeita nome repetido ignorando caixa e espaços', () => {
    const errors = validateTechSheetParameters([
      valid,
      { ...valid, name: '  espessura da CAMADA  ' },
    ])
    expect(errors).toHaveLength(1)
    expect(errors[0].index).toBe(1)
    expect(errors[0].field).toBe('name')
    expect(errors[0].message).toContain('repetido')
  })

  it('respeita os limites de tamanho do servidor por campo', () => {
    const errors = validateTechSheetParameters([
      {
        name: 'n'.repeat(121),
        value: 'v'.repeat(201),
        unit: 'u'.repeat(41),
        origin: 'o'.repeat(121),
      },
    ])
    expect(errors.map((e) => e.field)).toEqual(['name', 'value', 'unit', 'origin'])
  })

  it('valida pendências, observações e anexos', () => {
    expect(
      validateTechSheetExtras({
        pendingText: 'a\nb',
        notes: '',
        attachmentCount: 0,
      }),
    ).toEqual([])

    const errors = validateTechSheetExtras({
      pendingText: 'x'.repeat(MAX_PENDING_ITEM_LENGTH + 1),
      notes: 'n'.repeat(MAX_NOTES + 1),
      attachmentCount: MAX_ATTACHMENTS + 1,
    })
    expect(errors.map((e) => e.field)).toEqual(['pending_items', 'notes', 'attachments'])
  })

  it('preserva a ordem de leitura para o foco no primeiro erro', () => {
    const result = validateTechSheet({
      parameters: [{ name: '', value: '1', unit: 'mm', origin: 'obra' }],
      pendingText: '',
      notes: 'n'.repeat(MAX_NOTES + 1),
      attachmentCount: 0,
    })
    expect(result.valid).toBe(false)
    expect(result.firstTargetId).toBe(techSheetFieldId(0, 'name'))
  })

  it('recupera a mensagem de um campo específico', () => {
    const errors = validateTechSheetParameters([{ ...valid, unit: '' }])
    expect(errorForField(errors, 0, 'unit')).toContain('unidade')
    expect(errorForField(errors, 0, 'name')).toBeNull()
  })

  it('quebra pendências por linha descartando vazios', () => {
    expect(parsePendingItems('  uma \n\n duas  \n')).toEqual(['uma', 'duas'])
    expect(parsePendingItems('')).toEqual([])
  })
})

describe('contexto e estados da ficha (T2.32)', () => {
  it('aceita somente ID com formato de registro', () => {
    expect(resolveOpportunityContext('abcdefghijklmno')).toBe('abcdefghijklmno')
    expect(resolveOpportunityContext('Cliente X')).toBe('')
    expect(resolveOpportunityContext('')).toBe('')
    expect(resolveOpportunityContext(null)).toBe('')
    expect(resolveOpportunityContext('ABCDEFGHIJKLMNO')).toBe('')
  })

  it('monta a URL da ficha preservando o contexto', () => {
    expect(techSheetUrl('abcdefghijklmno')).toBe('/ficha?oportunidade=abcdefghijklmno')
  })

  it('distingue carregando, sem contexto, vazio, pronto e negado', () => {
    const base = {
      loadingOpportunity: false,
      loadingHistory: false,
      opportunityError: null,
      historyError: null,
      hasOpportunity: true,
      versionCount: 1,
    }
    expect(describeTechSheetState({ ...base, loadingOpportunity: true })).toBe('loading')
    expect(describeTechSheetState({ ...base, hasOpportunity: false })).toBe('no-context')
    expect(describeTechSheetState({ ...base, versionCount: 0, loadingHistory: true })).toBe(
      'loading',
    )
    expect(describeTechSheetState({ ...base, versionCount: 0 })).toBe('empty')
    expect(describeTechSheetState(base)).toBe('ready')
    expect(describeTechSheetState({ ...base, opportunityError: 'forbidden' })).toBe('forbidden')
    expect(describeTechSheetState({ ...base, historyError: 'forbidden' })).toBe('forbidden')
    expect(describeTechSheetState({ ...base, opportunityError: 'other' })).toBe('error')
  })

  // Regressão do item 9 do roteiro (2026-10-27): o PocketBase responde 404, não
  // 403, quando a viewRule barra o registro. Sem estado próprio, a negação caía
  // no erro genérico e a mensagem de permissão nunca aparecia.
  it('trata negacao de leitura (404 do PocketBase) como indisponivel, nao como erro generico', () => {
    const base = {
      loadingOpportunity: false,
      loadingHistory: false,
      opportunityError: null,
      historyError: null,
      hasOpportunity: false,
      versionCount: 0,
    }
    expect(describeTechSheetState({ ...base, opportunityError: 'not-found' })).toBe('unavailable')
    expect(describeTechSheetState({ ...base, opportunityError: 'unauthorized' })).toBe(
      'unavailable',
    )
    expect(
      describeTechSheetState({ ...base, hasOpportunity: true, historyError: 'not-found' }),
    ).toBe('unavailable')
    // um 500 continua sendo erro, não acesso negado
    expect(describeTechSheetState({ ...base, opportunityError: 'other' })).toBe('error')
  })

  it('a mensagem de acesso negado explica a restricao ao responsavel', () => {
    const message = techSheetAccessMessage('not-found')
    expect(message).toContain('não está disponível')
    expect(message).toContain('responsável'.slice(0, 5))
  })

  it('explica o 403 sem revelar dados do registro', () => {
    const kind = classifyTechSheetError(403)
    expect(kind).toBe('forbidden')
    const message = techSheetAccessMessage(kind)
    expect(message).toContain('responsável')
    expect(message).not.toContain('Cliente')
  })

  it('classifica os demais status', () => {
    expect(classifyTechSheetError(404)).toBe('not-found')
    expect(classifyTechSheetError(401)).toBe('unauthorized')
    expect(classifyTechSheetError(500)).toBe('other')
    expect(classifyTechSheetError(undefined)).toBe('other')
    expect(techSheetAccessMessage('other')).toBeNull()
  })
})
