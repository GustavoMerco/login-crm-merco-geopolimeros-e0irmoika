import { describe, expect, it } from 'vitest'
import {
  hasUnsavedCompositionChanges,
  INITIAL_COMPOSITION_DRAFT,
  type CompositionDraftForm,
} from './compositionDraft'

describe('composition draft continuity (T2.15)', () => {
  it('treats initial and acknowledged saved fields as clean', () => {
    const initial = { ...INITIAL_COMPOSITION_DRAFT }
    expect(hasUnsavedCompositionChanges(initial, INITIAL_COMPOSITION_DRAFT)).toBe(false)
    const savedAfterCreate: CompositionDraftForm = { ...initial, code: '' }
    expect(hasUnsavedCompositionChanges(savedAfterCreate, savedAfterCreate)).toBe(false)
  })

  it('detects unsaved edits and clears them only after the server save is acknowledged', () => {
    const edited = { ...INITIAL_COMPOSITION_DRAFT, code: 'COMP-SINTETICA-01' }
    expect(hasUnsavedCompositionChanges(edited, INITIAL_COMPOSITION_DRAFT)).toBe(true)
    expect(hasUnsavedCompositionChanges(edited, edited)).toBe(false)
  })
})
