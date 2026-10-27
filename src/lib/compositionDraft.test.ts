import { describe, expect, it } from 'vitest'
import {
  afterCompositionSaved,
  createInitialCompositionDraft,
  hasUnsavedCompositionChanges,
  type CompositionDraftForm,
} from './compositionDraft'
import { createInputRow, createResourceRow } from './compositionRows'

function filled(): CompositionDraftForm {
  return {
    ...createInitialCompositionDraft(),
    catalog_item_id: 'krkue1xg6fiwlfe',
    code: 'COMP-GEO-001',
    output_unit: 'm3',
    source: 'Contrato sintético 2026',
    fixture_ref: 'docs/fixtures/COMP-GEO-001.v1.assinada.pdf',
    valid_from: '2026-01-01',
    valid_until: '2026-12-31',
    inputs: [createInputRow({ name: 'Área', unit: 'm2' })],
    resources: [
      createResourceRow({
        catalog_item_id: 'krkue1xg6fiwlfe',
        unit: 'm3',
        coefficient: '1.5',
        source: 'SINAPI 2026-01',
      }),
    ],
  }
}

describe('composition draft continuity (T2.15 / T2.33)', () => {
  it('opens with one empty row per table so the form is ready to type', () => {
    const initial = createInitialCompositionDraft()
    expect(initial.inputs).toHaveLength(1)
    expect(initial.resources).toHaveLength(1)
    expect(initial.inputs[0].name).toBe('')
    expect(initial.resources[0].coefficient).toBe('')
  })

  it('treats an untouched draft as clean', () => {
    const a = createInitialCompositionDraft()
    const b = createInitialCompositionDraft()
    expect(hasUnsavedCompositionChanges(a, b)).toBe(false)
  })

  it('detects an edit in any text field', () => {
    const initial = createInitialCompositionDraft()
    const edited = { ...initial, code: 'COMP-SINTETICA-01' }
    expect(hasUnsavedCompositionChanges(edited, initial)).toBe(true)
  })

  it('detects an edit inside an input row', () => {
    const initial = createInitialCompositionDraft()
    const edited = {
      ...initial,
      inputs: [createInputRow({ name: 'Área', unit: 'm2' })],
    }
    expect(hasUnsavedCompositionChanges(edited, initial)).toBe(true)
  })

  it('detects an edit inside a resource row', () => {
    const initial = createInitialCompositionDraft()
    const edited = {
      ...initial,
      resources: [createResourceRow({ catalog_item_id: 'krkue1xg6fiwlfe', coefficient: '2' })],
    }
    expect(hasUnsavedCompositionChanges(edited, initial)).toBe(true)
  })

  it('ignores the local render key so an untouched row is not unsaved', () => {
    const initial = createInitialCompositionDraft()
    const sameContentDifferentKey = {
      ...initial,
      inputs: [createInputRow()],
      resources: [createResourceRow()],
    }
    expect(sameContentDifferentKey.inputs[0].key).not.toBe(initial.inputs[0].key)
    expect(hasUnsavedCompositionChanges(sameContentDifferentKey, initial)).toBe(false)
  })

  it('clears the unsaved flag once the server confirms the save', () => {
    const saved = filled()
    expect(hasUnsavedCompositionChanges(saved, saved)).toBe(false)
  })

  it('keeps the shared reference fields but clears code and rows after saving', () => {
    const saved = filled()
    const reset = afterCompositionSaved(saved)
    expect(reset.code).toBe('')
    expect(reset.inputs).toHaveLength(1)
    expect(reset.inputs[0].name).toBe('')
    expect(reset.resources).toHaveLength(1)
    expect(reset.resources[0].catalog_item_id).toBe('')
    // Fonte, vigência, precisão e referência do caso sobrevivem ao salvamento.
    expect(reset.source).toBe(saved.source)
    expect(reset.valid_from).toBe(saved.valid_from)
    expect(reset.fixture_ref).toBe(saved.fixture_ref)
    expect(reset.precision).toBe(saved.precision)
    expect(hasUnsavedCompositionChanges(reset, afterCompositionSaved(saved))).toBe(false)
  })
})
