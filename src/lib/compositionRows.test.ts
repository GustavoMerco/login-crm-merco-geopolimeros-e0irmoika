import { describe, expect, it } from 'vitest'
import {
  COMPOSITION_FIELD_IDS,
  MAX_COMPOSITION_ROWS,
  compositionFieldId,
  countFilledInputRows,
  countFilledResourceRows,
  createInputRow,
  createResourceRow,
  errorForTarget,
  resolveResourceId,
  resourceOptionLabel,
  toInputPayloads,
  toResourcePayloads,
  validateCompositionDraft,
} from './compositionRows'
import type { CatalogItemRecord } from '@/services/catalog'

const recurso = {
  id: 'krkue1xg6fiwlfe',
  name: 'Areia média lavada',
  family: 'Geotecnia',
  item_type: 'recurso',
  unit: 'm3',
  coefficient: '1',
  source: 'SINAPI 2026-01',
  status: 'homologado',
} as unknown as CatalogItemRecord

const servico = {
  id: 'zzzue1xg6fiwlfe',
  name: 'Sondagem sintética',
  family: 'Geotecnia',
  item_type: 'servico',
  unit: 'm',
  coefficient: '',
  source: 'sintética',
  status: 'homologado',
} as unknown as CatalogItemRecord

const catalog = [recurso, servico]

function draft(overrides: Record<string, unknown> = {}) {
  return {
    catalog_item_id: recurso.id,
    code: 'COMP-GEO-001',
    output_unit: 'm3',
    source: 'Contrato sintético 2026',
    fixture_ref: 'docs/fixtures/COMP-GEO-001.v1.assinada.pdf',
    precision: '2 casas decimais',
    rounding: 'normal' as const,
    tolerance: '5%',
    valid_from: '2026-01-01',
    valid_until: '2026-12-31',
    inputs: [createInputRow({ name: 'Área', unit: 'm2' })],
    resources: [
      createResourceRow({
        catalog_item_id: recurso.id,
        unit: 'm3',
        coefficient: '1.5',
        source: 'SINAPI 2026-01',
      }),
    ],
    ...overrides,
  }
}

describe('row payloads (T2.33)', () => {
  it('trims and drops only completely empty rows', () => {
    const rows = [
      createInputRow({ name: '  Área  ', unit: ' m2 ' }),
      createInputRow(),
      createInputRow({ name: 'Só o nome' }),
    ]
    expect(toInputPayloads(rows)).toEqual([
      { name: 'Área', unit: 'm2' },
      { name: 'Só o nome', unit: '' },
    ])
  })

  it('keeps optional input columns out of the payload when blank', () => {
    const payloads = toInputPayloads([createInputRow({ name: 'Área', unit: 'm2' })])
    expect(payloads).toHaveLength(1)
    expect(payloads[0]).not.toHaveProperty('required')
    expect(payloads[0]).not.toHaveProperty('min')
    expect(payloads[0]).not.toHaveProperty('max')
  })

  it('carries the optional input columns when they are filled', () => {
    const payloads = toInputPayloads([
      createInputRow({ name: 'Área', unit: 'm2', required: true, min: '0', max: '250' }),
    ])
    expect(payloads[0]).toEqual({
      name: 'Área',
      unit: 'm2',
      required: true,
      min: '0',
      max: '250',
    })
  })

  it('maps the selected catalog item to the resource id the API expects', () => {
    const rows = [
      createResourceRow({
        catalog_item_id: recurso.id,
        unit: 'm3',
        coefficient: '2.25',
        source: 'SINAPI 2026-01',
      }),
    ]
    expect(toResourcePayloads(rows)).toEqual([
      { id: recurso.id, unit: 'm3', coefficient: '2.25', source: 'SINAPI 2026-01' },
    ])
  })

  it('never emits a typed id: an unselected resource has no id', () => {
    const payloads = toResourcePayloads([createResourceRow({ coefficient: '1' })])
    expect(payloads[0].id).toBe('')
  })

  it('counts filled rows for display purposes', () => {
    expect(countFilledInputRows([createInputRow(), createInputRow({ name: 'a' })])).toBe(1)
    expect(countFilledResourceRows([createResourceRow()])).toBe(0)
  })
})

describe('resource selector (T2.33)', () => {
  it('resolves an id only for a catalog item actually loaded', () => {
    expect(resolveResourceId(catalog, recurso.id)).toBe(recurso.id)
    expect(resolveResourceId(catalog, 'Areia média lavada')).toBe('')
    expect(resolveResourceId(catalog, 'aaaaaaaaaaaaaaa')).toBe('')
    expect(resolveResourceId([], recurso.id)).toBe('')
  })

  it('labels a resource by name, family, unit and state without exposing the internal id', () => {
    const label = resourceOptionLabel(recurso)
    expect(label).toContain('Areia média lavada')
    expect(label).toContain('Geotecnia')
    expect(label).toContain('m3')
    expect(label).toContain('homologado')
    expect(label).not.toContain(recurso.id)
  })
})

describe('field-level validation mirroring the server hook (T2.33)', () => {
  it('accepts a complete synthetic draft', () => {
    const result = validateCompositionDraft(draft(), catalog)
    expect(result.errors).toEqual([])
    expect(result.valid).toBe(true)
    expect(result.firstTargetId).toBeNull()
  })

  it('requires a catalog item chosen from the loaded list', () => {
    const missing = validateCompositionDraft(draft({ catalog_item_id: '' }), catalog)
    expect(missing.valid).toBe(false)
    expect(missing.firstTargetId).toBe(COMPOSITION_FIELD_IDS.catalogItem)
    const fake = validateCompositionDraft(draft({ catalog_item_id: 'aaaaaaaaaaaaaaa' }), catalog)
    expect(fake.errors.map((error) => error.targetId)).toContain(COMPOSITION_FIELD_IDS.catalogItem)
  })

  it('rejects an empty code', () => {
    const result = validateCompositionDraft(draft({ code: '' }), catalog)
    expect(errorForTarget(result.errors, COMPOSITION_FIELD_IDS.code)).toContain(
      'Informe o código da composição.',
    )
  })

  it.each(['COMP GEO', 'COMP@GEO', 'COMP.GEO', 'COMP/001'])(
    'rejects the malformed code %s',
    (code) => {
      const message = errorForTarget(
        validateCompositionDraft(draft({ code }), catalog).errors,
        COMPOSITION_FIELD_IDS.code,
      )
      expect(message).toContain('1–64 caracteres')
    },
  )

  it('rejects a code longer than 64 characters', () => {
    const message = errorForTarget(
      validateCompositionDraft(draft({ code: 'A'.repeat(65) }), catalog).errors,
      COMPOSITION_FIELD_IDS.code,
    )
    expect(message).toContain('no máximo 64')
  })

  it('accepts codes using hyphen and underscore', () => {
    expect(validateCompositionDraft(draft({ code: 'COMP_GEO-001' }), catalog).valid).toBe(true)
  })

  it('requires unit, source, precision and tolerance', () => {
    const result = validateCompositionDraft(
      draft({ output_unit: '', source: '', precision: '', tolerance: '' }),
      catalog,
    )
    const targets = result.errors.map((error) => error.targetId)
    expect(targets).toContain(COMPOSITION_FIELD_IDS.outputUnit)
    expect(targets).toContain(COMPOSITION_FIELD_IDS.source)
    expect(targets).toContain(COMPOSITION_FIELD_IDS.precision)
    expect(targets).toContain(COMPOSITION_FIELD_IDS.tolerance)
  })

  it('rejects an inverted or malformed validity window', () => {
    const inverted = validateCompositionDraft(
      draft({ valid_from: '2026-12-31', valid_until: '2026-01-01' }),
      catalog,
    )
    expect(inverted.errors.map((error) => error.targetId)).toContain(
      COMPOSITION_FIELD_IDS.validUntil,
    )

    const malformed = validateCompositionDraft(draft({ valid_from: '01/01/2026' }), catalog)
    expect(malformed.errors.map((error) => error.targetId)).toContain(
      COMPOSITION_FIELD_IDS.validFrom,
    )
  })

  it('requires at least one input and caps the list at 50 rows', () => {
    const empty = validateCompositionDraft(draft({ inputs: [] }), catalog)
    expect(errorForTarget(empty.errors, compositionFieldId('inputs', 0, 'name'))).toContain(
      'pelo menos um insumo',
    )

    const many = validateCompositionDraft(
      draft({
        inputs: Array.from({ length: MAX_COMPOSITION_ROWS + 1 }, (_, index) =>
          createInputRow({ name: `Insumo ${index}`, unit: 'm2' }),
        ),
      }),
      catalog,
    )
    expect(errorForTarget(many.errors, compositionFieldId('inputs', 0, 'name'))).toContain(
      '50 insumos',
    )
  })

  it('reports the exact input row and column that needs fixing', () => {
    const result = validateCompositionDraft(
      draft({
        inputs: [
          createInputRow({ name: 'Área', unit: 'm2' }),
          createInputRow({ name: '', unit: 'kg' }),
          createInputRow({ name: 'Peso', unit: '' }),
        ],
      }),
      catalog,
    )
    const targets = result.errors.map((error) => error.targetId)
    expect(targets).toContain(compositionFieldId('inputs', 1, 'name'))
    expect(targets).toContain(compositionFieldId('inputs', 2, 'unit'))
    expect(targets).not.toContain(compositionFieldId('inputs', 0, 'name'))
  })

  it('enforces the server length limits on input columns', () => {
    const longName = validateCompositionDraft(
      draft({ inputs: [createInputRow({ name: 'x'.repeat(121), unit: 'm2' })] }),
      catalog,
    )
    expect(longName.errors.map((error) => error.targetId)).toContain(
      compositionFieldId('inputs', 0, 'name'),
    )

    const longUnit = validateCompositionDraft(
      draft({ inputs: [createInputRow({ name: 'Área', unit: 'u'.repeat(41) })] }),
      catalog,
    )
    expect(longUnit.errors.map((error) => error.targetId)).toContain(
      compositionFieldId('inputs', 0, 'unit'),
    )
  })

  it('rejects a non-decimal minimum and an inverted range', () => {
    const badMin = validateCompositionDraft(
      draft({ inputs: [createInputRow({ name: 'Área', unit: 'm2', min: 'um' })] }),
      catalog,
    )
    expect(badMin.errors.map((error) => error.targetId)).toContain(
      compositionFieldId('inputs', 0, 'min'),
    )

    const inverted = validateCompositionDraft(
      draft({ inputs: [createInputRow({ name: 'Área', unit: 'm2', min: '10', max: '1' })] }),
      catalog,
    )
    expect(errorForTarget(inverted.errors, compositionFieldId('inputs', 0, 'max'))).toContain(
      'mínimo não pode ser maior',
    )
  })

  it('requires the resource to be selected from the catalog, never typed', () => {
    const unselected = validateCompositionDraft(
      draft({
        resources: [createResourceRow({ unit: 'm3', coefficient: '1', source: 'SINAPI' })],
      }),
      catalog,
    )
    expect(
      errorForTarget(unselected.errors, compositionFieldId('resources', 0, 'catalog_item_id')),
    ).toContain('não é digitado')

    const foreign = validateCompositionDraft(
      draft({
        resources: [
          createResourceRow({
            catalog_item_id: 'aaaaaaaaaaaaaaa',
            unit: 'm3',
            coefficient: '1',
            source: 'SINAPI',
          }),
        ],
      }),
      catalog,
    )
    expect(foreign.errors.map((error) => error.targetId)).toContain(
      compositionFieldId('resources', 0, 'catalog_item_id'),
    )
  })

  it.each(['1', '1.5', '2.25', '-1.5', '0', '10.001'])(
    'accepts the decimal coefficient %s',
    (coefficient) => {
      const result = validateCompositionDraft(
        draft({
          resources: [
            createResourceRow({
              catalog_item_id: recurso.id,
              unit: 'm3',
              coefficient,
              source: 'SINAPI',
            }),
          ],
        }),
        catalog,
      )
      expect(result.errors.map((error) => error.targetId)).not.toContain(
        compositionFieldId('resources', 0, 'coefficient'),
      )
    },
  )

  it.each(['', '1,5', 'abc', '1.5.6', '1e5', '  '])('rejects the coefficient %s', (coefficient) => {
    const result = validateCompositionDraft(
      draft({
        resources: [
          createResourceRow({
            catalog_item_id: recurso.id,
            unit: 'm3',
            coefficient,
            source: 'SINAPI',
          }),
        ],
      }),
      catalog,
    )
    expect(result.errors.map((error) => error.targetId)).toContain(
      compositionFieldId('resources', 0, 'coefficient'),
    )
  })

  it('requires the resource source and respects its 200 character limit', () => {
    const blank = validateCompositionDraft(
      draft({
        resources: [
          createResourceRow({
            catalog_item_id: recurso.id,
            unit: 'm3',
            coefficient: '1',
            source: '',
          }),
        ],
      }),
      catalog,
    )
    expect(blank.errors.map((error) => error.targetId)).toContain(
      compositionFieldId('resources', 0, 'source'),
    )

    const long = validateCompositionDraft(
      draft({
        resources: [
          createResourceRow({
            catalog_item_id: recurso.id,
            unit: 'm3',
            coefficient: '1',
            source: 's'.repeat(201),
          }),
        ],
      }),
      catalog,
    )
    expect(long.errors.map((error) => error.targetId)).toContain(
      compositionFieldId('resources', 0, 'source'),
    )
  })

  it('blocks on a missing signed reference instead of inventing one', () => {
    const result = validateCompositionDraft(draft({ fixture_ref: '' }), catalog)
    expect(result.valid).toBe(false)
    expect(result.firstTargetId).toBe(COMPOSITION_FIELD_IDS.fixtureRef)
    expect(errorForTarget(result.errors, COMPOSITION_FIELD_IDS.fixtureRef)).toContain(
      'caso de referência',
    )
  })

  it('points the first focus target at the first problem in reading order', () => {
    const result = validateCompositionDraft(
      draft({
        code: '',
        inputs: [createInputRow({ name: '', unit: '' })],
      }),
      catalog,
    )
    expect(result.firstTargetId).toBe(COMPOSITION_FIELD_IDS.code)
  })

  it('orders input rows before resource rows so the user fixes them in form order', () => {
    const result = validateCompositionDraft(
      draft({
        inputs: [createInputRow({ name: '', unit: 'm2' })],
        resources: [createResourceRow({ unit: 'm3', coefficient: '1', source: 'SINAPI' })],
      }),
      catalog,
    )
    expect(result.firstTargetId).toBe(compositionFieldId('inputs', 0, 'name'))
  })

  it('finds a message for a specific row and column', () => {
    const result = validateCompositionDraft(
      draft({
        inputs: [createInputRow({ name: 'Área', unit: 'm2' }), createInputRow({ unit: 'kg' })],
      }),
      catalog,
    )
    expect(errorForTarget(result.errors, compositionFieldId('inputs', 1, 'name'))).toContain(
      'nome do insumo',
    )
    expect(errorForTarget(result.errors, compositionFieldId('inputs', 0, 'name'))).toBeNull()
  })

  it('gives every editable control a stable, unique id', () => {
    const ids = [
      compositionFieldId('inputs', 0, 'name'),
      compositionFieldId('inputs', 0, 'unit'),
      compositionFieldId('resources', 3, 'coefficient'),
      COMPOSITION_FIELD_IDS.fixtureRef,
    ]
    expect(new Set(ids).size).toBe(ids.length)
    expect(compositionFieldId('inputs', 12, 'min')).toBe('composicao-insumo-12-min')
    expect(compositionFieldId('resources', 4, 'source')).toBe('composicao-recurso-4-source')
  })
})
