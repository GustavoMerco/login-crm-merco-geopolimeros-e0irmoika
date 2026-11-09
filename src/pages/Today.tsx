import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { usePipeline } from '@/services/pipeline'
import { buildQueue, cardUrl, computeMetrics, stageLabel } from '@/lib/pipeline'
import { DeadlinePill, EmptyState, Kpi, Notice, PageHeader, PrimaryLink, SecondaryLink, deadlineBar } from '@/components/crm/ui'

// "Hoje": a primeira tela do comercial e da engenharia. Responde "o que eu
// faço agora?": prazos vencendo, propostas prontas para enviar e demandas
// travadas por falta de dado do cliente.
function greeting(now = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Sao_Paulo' }).format(now))
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function todayLabel(now = new Date()): string {
  return now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' })
}

export default function Today() {
  const { user } = useAuth()
  const { cards, isLoading, error, partialWarnings } = usePipeline()
  const queue = useMemo(() => buildQueue(cards), [cards])
  const metrics = useMemo(() => computeMetrics(cards), [cards])
  const firstName = (user?.name || '').split(' ')[0]
  const pendingGroups = queue.filter((group) => group.cards.length > 0)

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow={todayLabel()}
        title={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
        description="O que pede atenção agora nas suas oportunidades."
        actions={
          <>
            <SecondaryLink to="/funil">Ver funil</SecondaryLink>
            <PrimaryLink to="/demandas?nova=1">Nova demanda</PrimaryLink>
          </>
        }
      />

      {error && <Notice tone="crit">Não foi possível carregar suas oportunidades: {error}</Notice>}
      {partialWarnings.map((warning) => (
        <div key={warning} className="mb-3">
          <Notice tone="warn">{warning}</Notice>
        </div>
      ))}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Em andamento" value={String(metrics.open)} hint="Oportunidades ainda não enviadas." />
        <Kpi label="Prazo vencido" value={String(metrics.overdue)} hint="Passaram do prazo do cliente." />
        <Kpi
          label="Vencem em 2 dias"
          value={String(queue.find((group) => group.id === 'proximos')?.cards.length ?? 0)}
          hint="Priorize antes de abrir novas."
        />
        <Kpi label="Prontas para enviar" value={String(metrics.byStage.pronta)} hint="Só falta mandar ao cliente." />
      </div>

      <div className="mt-8 space-y-6">
        {isLoading ? (
          <p role="status" className="text-sm text-mg-muted">
            Carregando…
          </p>
        ) : pendingGroups.length === 0 && !error ? (
          <EmptyState
            title="Nada urgente por aqui"
            description="Nenhum prazo vencendo, nenhuma proposta parada. Bom momento para registrar novas demandas."
            action={<PrimaryLink to="/demandas?nova=1">Registrar demanda</PrimaryLink>}
          />
        ) : (
          pendingGroups.map((group) => (
            <section key={group.id} aria-labelledby={`fila-${group.id}`}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h3 id={`fila-${group.id}`} className="text-[15px] font-bold text-mg-ink">
                  {group.title} <span className="mg-num text-[13px] font-medium text-mg-muted">· {group.cards.length}</span>
                </h3>
                <p className="hidden text-[12px] text-mg-muted sm:block">{group.hint}</p>
              </div>
              <ul className="divide-y divide-mg-line overflow-hidden rounded-xl border border-mg-line bg-mg-surface">
                {group.cards.map((card) => (
                  <li key={card.opportunity.id} className="relative">
                    <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-[3px] ${deadlineBar(card.deadline)}`} />
                    <Link
                      to={cardUrl(card.opportunity.id)}
                      className="flex min-h-[56px] flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 transition-colors duration-150 hover:bg-mg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mg-brand"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-bold text-mg-ink">{card.opportunity.customer_name}</span>
                        <span className="block truncate text-[12px] text-mg-muted">
                          {card.opportunity.service_family} · {stageLabel(card.stage)}
                          {card.pendingCount > 0 ? ` · ${card.pendingCount} pendência(s)` : ''}
                        </span>
                      </span>
                      <DeadlinePill deadline={card.deadline} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
