import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { usePipeline } from '@/services/pipeline'
import {
  STAGES,
  cardUrl,
  familiesOf,
  filterCards,
  groupByStage,
  normalizeKey,
  type PipelineCard,
} from '@/lib/pipeline'
import { DeadlinePill, EmptyState, Notice, PageHeader, PrimaryLink, deadlineBar } from '@/components/crm/ui'

// Funil de propostas: quadro por etapa, da demanda ao envio. As etapas vêm dos
// dados do servidor (aptidão, ficha, marcos); mover de etapa acontece pelas
// ações do card, que chamam os endpoints existentes.
function FunnelCard({ card }: { card: PipelineCard }) {
  const { opportunity } = card
  return (
    <li className="mg-enter">
      <Link
        to={cardUrl(opportunity.id)}
        className="group relative block overflow-hidden rounded-lg border border-mg-line bg-mg-surface p-3 pl-4 transition-[border-color,box-shadow] duration-150 hover:border-mg-brand/50 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-mg-brand"
      >
        <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-[3px] ${deadlineBar(card.deadline)}`} />
        <p className="truncate text-[14px] font-bold text-mg-ink group-hover:text-mg-brand">{opportunity.customer_name}</p>
        <p className="mt-0.5 truncate text-[12px] text-mg-muted">
          {opportunity.service_family}
          {opportunity.location ? ` · ${opportunity.location}` : ''}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <DeadlinePill deadline={card.deadline} />
          {card.pendingCount > 0 && (
            <span className="mg-num rounded-full bg-mg-warn-bg px-2 py-0.5 text-[11px] font-medium text-mg-warn">
              {card.pendingCount} pendência(s)
            </span>
          )}
        </div>
      </Link>
    </li>
  )
}

export default function Funnel() {
  const { cards, isLoading, error, partialWarnings } = usePipeline()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const family = searchParams.get('familia') ?? ''
  const customerKey = searchParams.get('cliente') ?? ''

  const filtered = useMemo(() => filterCards(cards, { query, family, customerKey }), [cards, query, family, customerKey])
  const groups = useMemo(() => groupByStage(filtered), [filtered])
  const families = useMemo(() => familiesOf(cards), [cards])
  const customerName = customerKey
    ? cards.find((card) => normalizeKey(card.opportunity.customer_name) === customerKey)?.opportunity.customer_name
    : ''

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        eyebrow="Trabalho"
        title="Funil de propostas"
        description="Cada oportunidade da demanda ao envio. Clique num card para abrir a ficha completa e avançar a etapa."
        actions={<PrimaryLink to="/demandas?nova=1">Nova demanda</PrimaryLink>}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="w-full text-[13px] font-semibold text-mg-ink sm:w-72">
          Buscar
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cliente, contato, família, local…"
            className="mt-1.5 min-h-[40px] w-full rounded-lg border border-mg-line-strong bg-mg-surface px-3 text-sm font-normal text-mg-ink outline-none placeholder:text-mg-muted focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/20"
          />
        </label>
        <label className="text-[13px] font-semibold text-mg-ink">
          Família
          <select
            value={family}
            onChange={(event) => setParam('familia', event.target.value)}
            className="mt-1.5 block min-h-[40px] rounded-lg border border-mg-line-strong bg-mg-surface px-3 text-sm font-normal text-mg-ink outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/20"
          >
            <option value="">Todas</option>
            {families.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        {customerKey && (
          <button
            type="button"
            onClick={() => setParam('cliente', '')}
            className="min-h-[40px] rounded-full border border-mg-brand bg-mg-brand-soft px-3 text-[13px] font-semibold text-mg-brand"
          >
            Cliente: {customerName || customerKey} ✕
          </button>
        )}
        <p className="ml-auto text-[12px] text-mg-muted">Mostrando as oportunidades em que você é o responsável.</p>
      </div>

      {partialWarnings.map((warning) => (
        <div key={warning} className="mb-3">
          <Notice tone="warn">{warning}</Notice>
        </div>
      ))}
      {error && <Notice tone="crit">Não foi possível carregar o funil: {error}</Notice>}

      {isLoading ? (
        <p role="status" className="text-sm text-mg-muted">
          Carregando o funil…
        </p>
      ) : !error && cards.length === 0 ? (
        <EmptyState
          title="Nenhuma oportunidade ainda"
          description="Registre a primeira demanda recebida de um cliente; ela entra aqui na etapa Recebida."
          action={<PrimaryLink to="/demandas?nova=1">Registrar demanda</PrimaryLink>}
        />
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="grid min-w-[1080px] grid-cols-6 gap-3">
            {STAGES.map((stage) => (
              <section key={stage.id} aria-label={stage.label} className="flex min-h-[320px] flex-col rounded-xl border border-mg-line bg-mg-surface-2">
                <header className="border-b border-mg-line px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[13px] font-bold text-mg-ink">{stage.label}</h3>
                    <span className="mg-num rounded-full bg-mg-surface px-2 text-[12px] text-mg-muted">{groups[stage.id].length}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-mg-muted">{stage.description}</p>
                </header>
                <ul className="flex flex-1 flex-col gap-2 p-2">
                  {groups[stage.id].map((card) => (
                    <FunnelCard key={card.opportunity.id} card={card} />
                  ))}
                  {groups[stage.id].length === 0 && <li className="px-2 py-6 text-center text-[12px] text-mg-muted">Nada nesta etapa.</li>}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
      <p className="mt-2 text-[12px] text-mg-muted">
        Custos e preço, aprovação e desfecho (ganha/perdida) entram no funil quando as Fases 3 e 4 forem implementadas.
      </p>
    </div>
  )
}
