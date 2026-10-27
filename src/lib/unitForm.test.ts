import { describe, expect, it } from 'vitest'
import {
  DIMENSION_LABELS,
  UNIT_DIMENSIONS,
  UNIT_FIELD_IDS,
  MAX_UNIT_CODE,
  MAX_UNIT_NAME,
  unitErrorFor,
  unitStatusLabel,
  unitStatusTone,
  validateUnitForm,
} from './unitForm'

describe('unit dimensions (T2.16)', () => {
  it('exposes exactly the synthetic dimensions provided by the SPEC', () => {
    expect(UNIT_DIMENSIONS).toEqual([
      'area',
      'massa',
      'comprimento',
      'volume',
      'massa/area',
      'tempo',
      'adimensional',
    ])
  })

  it('labels every dimension without exposing internal values', () => {
    for (const dimension of UNIT_DIMENSIONS) {
      expect(DIMENSION_LABELS[dimension].length).toBeGreaterThan(0)
    }
    expect(DIMENSION_LABELS['massa/area']).toBe('Massa/área')
  })
})

describe('unit form validation mirroring the server hook (T2.16)', () => {
  const valid = { code: 'm2', name: 'Metro quadrado', dimension: 'area' }

  it('accepts a complete synthetic unit', () => {
    const result = validateUnitForm(valid)
    expect(result.errors).toEqual([])
    expect(result.valid).toBe(true)
    expect(result.firstTargetId).toBeNull()
  })

  it.each(['m2', 'kg', 'kg/m2', 'a', 'm3', 'un', 'kg/m3'])('accepts the code %s', (code) => {
    const dimension = code === 'kg/m2' ? 'massa/area' : 'massa'
    expect(validateUnitForm({ ...valid, code, dimension }).valid).toBe(true)
  })

  it('requires the code', () => {
    const result = validateUnitForm({ ...valid, code: '  ' })
    expect(unitErrorFor(result.errors, UNIT_FIELD_IDS.code)).toContain(
      'Informe o código da unidade.',
    )
    expect(result.firstTargetId).toBe(UNIT_FIELD_IDS.code)
  })

  it.each(['M2', 'm 2', 'm²', 'm-2', 'm_2'])('rejects the malformed code %s', (code) => {
    const message = unitErrorFor(validateUnitForm({ ...valid, code }).errors, UNIT_FIELD_IDS.code)
    expect(message).toContain('minúsculas, números ou barra')
  })

  it('rejects a code longer than 20 characters', () => {
    const message = unitErrorFor(
      validateUnitForm({ ...valid, code: 'a'.repeat(MAX_UNIT_CODE + 1) }).errors,
      UNIT_FIELD_IDS.code,
    )
    expect(message).toContain('no máximo 20')
  })

  it('requires the name', () => {
    const message = unitErrorFor(
      validateUnitForm({ ...valid, name: '' }).errors,
      UNIT_FIELD_IDS.name,
    )
    expect(message).toContain('Informe o nome da unidade.')
  })

  it('rejects a name longer than 120 characters', () => {
    const message = unitErrorFor(
      validateUnitForm({ ...valid, name: 'n'.repeat(MAX_UNIT_NAME + 1) }).errors,
      UNIT_FIELD_IDS.name,
    )
    expect(message).toContain('no máximo 120')
  })

  it('requires a dimension from the homologated list', () => {
    const missing = validateUnitForm({ ...valid, dimension: '' })
    expect(unitErrorFor(missing.errors, UNIT_FIELD_IDS.dimension)).toContain('Selecione a dimensão')

    const invented = validateUnitForm({ ...valid, dimension: 'forca' })
    expect(unitErrorFor(invented.errors, UNIT_FIELD_IDS.dimension)).toContain(
      'Selecione a dimensão',
    )
  })

  it('points the first focus target at the first problem in reading order', () => {
    const result = validateUnitForm({ code: '', name: '', dimension: '' })
    expect(result.firstTargetId).toBe(UNIT_FIELD_IDS.code)
  })

  it('gives every control a stable, unique id', () => {
    const ids = Object.values(UNIT_FIELD_IDS)
    expect(new Set(ids).size).toBe(ids.length)
    expect(UNIT_FIELD_IDS.code).toBe('unidade-codigo')
  })
})

describe('unit status presentation (T2.16)', () => {
  it('labels the three states distinctly', () => {
    expect(unitStatusLabel('rascunho')).toBe('RASCUNHO')
    expect(unitStatusLabel('homologado')).toBe('HOMOLOGADO')
    expect(unitStatusLabel('inativo')).toBe('INATIVO')
  })

  it('tones the states differently', () => {
    expect(unitStatusTone('homologado')).toBe('ok')
    expect(unitStatusTone('inativo')).toBe('off')
    expect(unitStatusTone('rascunho')).toBe('draft')
  })
})
