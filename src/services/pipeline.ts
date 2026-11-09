import { useCallback, useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { buildCards, type PipelineCard, type PipelineEvent, type PipelineOpportunity } from '@/lib/pipeline'

// Carrega o funil a partir das coleções existentes. O servidor só devolve as
// oportunidades em que o usuário é o responsável (listRule), então este é o
// funil "meu". Marcos e fichas são fontes complementares: se falharem, o funil
// aparece mesmo assim, com aviso, e a etapa é derivada só da aptidão.
export type PipelineState = {
  cards: PipelineCard[]
  isLoading: boolean
  error: string | null
  partialWarnings: string[]
  reload: () => Promise<void>
}

export function usePipeline(): PipelineState {
  const [cards, setCards] = useState<PipelineCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [partialWarnings, setPartialWarnings] = useState<string[]>([])

  const reload = useCallback(async () => {
    setIsLoading(true)
    const warnings: string[] = []
    try {
      const opportunities = await pb
        .collection('opportunities')
        .getFullList<PipelineOpportunity>({ sort: '-received_at', requestKey: 'pipeline-opportunities' })
      const [eventsResult, sheetsResult] = await Promise.allSettled([
        pb.collection('opportunity_events').getFullList<PipelineEvent>({
          sort: 'occurred_at',
          fields: 'opportunity_id,milestone,occurred_at',
          requestKey: 'pipeline-events',
        }),
        pb.collection('tech_sheets').getFullList<{ opportunity_id: string }>({
          fields: 'opportunity_id',
          requestKey: 'pipeline-sheets',
        }),
      ])
      const events = eventsResult.status === 'fulfilled' ? eventsResult.value : []
      if (eventsResult.status === 'rejected') {
        warnings.push('Não foi possível ler os marcos (pronta/enviada); as etapas finais podem estar desatualizadas.')
      }
      const sheetIds = new Set(sheetsResult.status === 'fulfilled' ? sheetsResult.value.map((s) => s.opportunity_id) : [])
      if (sheetsResult.status === 'rejected') {
        warnings.push('Não foi possível ler as fichas técnicas; "Em engenharia" pode aparecer como "Apta".')
      }
      setCards(buildCards(opportunities, events, sheetIds))
      setPartialWarnings(warnings)
      setError(null)
    } catch (err: unknown) {
      setCards([])
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { cards, isLoading, error, partialWarnings, reload }
}
