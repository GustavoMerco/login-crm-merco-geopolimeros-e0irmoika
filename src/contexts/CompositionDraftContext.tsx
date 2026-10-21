import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import {
  hasUnsavedCompositionChanges,
  INITIAL_COMPOSITION_DRAFT,
  type CompositionDraftForm,
} from '@/lib/compositionDraft'

type CompositionDraftContextValue = {
  compositionForm: CompositionDraftForm
  setCompositionForm: Dispatch<SetStateAction<CompositionDraftForm>>
  markCompositionSaved: (form: CompositionDraftForm) => void
  hasUnsavedChanges: boolean
}

const CompositionDraftContext = createContext<CompositionDraftContextValue | null>(null)

export function CompositionDraftProvider({ children }: { children: ReactNode }) {
  const [compositionForm, setCompositionForm] =
    useState<CompositionDraftForm>(INITIAL_COMPOSITION_DRAFT)
  const [savedForm, setSavedForm] = useState<CompositionDraftForm>(INITIAL_COMPOSITION_DRAFT)
  const hasUnsavedChanges = hasUnsavedCompositionChanges(compositionForm, savedForm)

  useEffect(() => {
    if (!hasUnsavedChanges) return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [hasUnsavedChanges])

  useEffect(() => {
    if (!hasUnsavedChanges) return
    const confirmInternalNavigation = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return
      if (!(event.target instanceof Element)) return
      const link = event.target.closest('a[href]')
      if (!link || link.hasAttribute('download') || link.target === '_blank') return
      const destination = new URL(link.href, window.location.href)
      const current = new URL(window.location.href)
      if (destination.origin !== current.origin) return
      if (
        destination.pathname === current.pathname &&
        destination.search === current.search &&
        destination.hash === current.hash
      )
        return
      if (
        !window.confirm(
          'Há alterações não salvas na Biblioteca. Se sair, elas permanecerão apenas nesta sessão. Deseja continuar?',
        )
      ) {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()
      }
    }
    document.addEventListener('click', confirmInternalNavigation, true)
    return () => document.removeEventListener('click', confirmInternalNavigation, true)
  }, [hasUnsavedChanges])

  const value = useMemo(
    () => ({
      compositionForm,
      setCompositionForm,
      markCompositionSaved: setSavedForm,
      hasUnsavedChanges,
    }),
    [compositionForm, hasUnsavedChanges],
  )

  return (
    <CompositionDraftContext.Provider value={value}>{children}</CompositionDraftContext.Provider>
  )
}

export function useCompositionDraft() {
  const context = useContext(CompositionDraftContext)
  if (!context)
    throw new Error('useCompositionDraft deve ser usado dentro de CompositionDraftProvider.')
  return context
}
