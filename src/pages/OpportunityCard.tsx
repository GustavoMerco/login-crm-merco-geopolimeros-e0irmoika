import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { evaluateOpportunityAptitude } from '@/services/opportunities'
import {
  getOpportunityEvents,
  recordMilestone,
  recordOutcome,
  type OpportunityEventRecord,
} from '@/services/tracking'
import { useAuth } from '@/contexts/AuthContext'
import { sectionUrl } from '@/lib/navigation'
import {
  CARD_TABS,
  aptitudeLabel,
  buildCards,
  civilDate,
  dateOnly,
  formatCivil,
  resolveTab,
  type CardTab,
  type PipelineCard,
  type PipelineOpportunity,
  type StageId,
} from '@/lib/pipeline'
import { Button, DeadlinePill, JourneyRuler, Notice, Panel, StagePill } from '@/components/crm/ui'
import TechSheet from '@/pages/TechSheet'
import CompositionLibrary from '@/pages/CompositionLibrary'

// Card da oportunidade: a jornada inteira num lugar só. As abas reaproveitam
// as páginas existentes (Ficha, Biblioteca) no contexto ?oportunidade=, sem
// duplicar lógica. As ações chamam os endpoints que já existem no servidor.
const TAB_LABELS: Record<CardTab, string> = {
  resumo: 'Resumo',
  ficha: 'Ficha técnica',
  composicoes: 'Composições',
  proposta: 'Proposta',
  historico: 'Histórico',
}

const JOURNEY_INDEX: Record<StageId, number> = {
  recebida: 1,
  qualificacao: 1,
  apta: 2,
  engenharia: 2,
  pronta: 7,
  enviada: 8,
  ganha: 9,
  perdida: 9,
}

const MILESTONE_LABELS: Record<string, string> = {
  received: 'Demanda recebida',
  apt: 'Apta para orçamento',
  ready: 'Proposta pronta para envio',
  sent: 'Proposta enviada ao cliente',
  won: 'Proposta ganha',
  lost: 'Proposta perdida',
}

function formatInstant(value: string): string {
  if (!value) return '—'
  const date = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="mg-eyebrow text-mg-muted">{label}</dt>
      <dd className={`mt-1 text-[14px] text-mg-ink ${mono ? 'mg-num' : ''}`}>{value || '—'}</dd>
    </div>
  )
}

export default function OpportunityCard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawId = searchParams.get('oportunidade') ?? ''
  const opportunityId = /^[a-z0-9]{15}$/.test(rawId) ? rawId : ''
  const tab = resolveTab(searchParams.get('aba'))

  const [card, setCard] = useState<PipelineCard | null>(null)
  const [events, setEvents] = useState<OpportunityEventRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionInfo, setActionInfo] = useState<string | null>(null)
  const [isActing, setIsActing] = useState(false)
  const [lossReason, setLossReason] = useState('')
  const [isLossOpen, setIsLossOpen] = useState(false)
  const { user } = useAuth()

  const load = useCallback(async () => {
    if (!opportunityId) {
      setError('Oportunidade inválida ou ausente no endereço.')
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const opportunity = await pb
        .collection('opportunities')
        .getOne<PipelineOpportunity>(opportunityId)
      const [eventsResult, sheetsResult] = await Promise.allSettled([
        getOpportunityEvents(opportunityId),
        pb
          .collection('tech_sheets')
          .getList(1, 1, {
            filter: pb.filter('opportunity_id = {:id}', { id: opportunityId }),
            fields: 'id',
          }),
      ])
      const loadedEvents = eventsResult.status === 'fulfilled' ? eventsResult.value : []
      const hasSheet = sheetsResult.status === 'fulfilled' && sheetsResult.value.totalItems > 0
      setEvents(loadedEvents)
      setCard(buildCards([opportunity], loadedEvents, new Set(hasSheet ? [opportunityId] : []))[0])
      setError(null)
    } catch (err: unknown) {
      setCard(null)
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }, [opportunityId])

  useEffect(() => {
    void load()
  }, [load])

  const goTab = (next: CardTab) => {
    const params = new URLSearchParams(searchParams)
    params.set('aba', next)
    setSearchParams(params, { replace: true })
  }

  const runAction = async (action: () => Promise<unknown>, success: string) => {
    setIsActing(true)
    setActionError(null)
    setActionInfo(null)
    try {
      await action()
      setActionInfo(success)
      await load()
    } catch (err: unknown) {
      setActionError(getErrorMessage(err))
    } finally {
      setIsActing(false)
    }
  }

  if (isLoading && !card) {
    return (
      <p role="status" className="text-sm text-mg-muted">
        Carregando a oportunidade…
      </p>
    )
  }

  if (error || !card) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Notice tone="crit">
          Não foi possível abrir a oportunidade: {error ?? 'não encontrada.'}
        </Notice>
        <Link to="/funil" className="text-sm font-semibold text-mg-brand underline">
          Voltar ao funil
        </Link>
      </div>
    )
  }

  const { opportunity, stage } = card
  // Mutações são do responsável (o servidor confere); o Administrador também registra desfecho.
  const isOwner = opportunity.responsible_user_id === user?.id
  const canOutcome = isOwner || user?.role === 'admin'

  const nextAction = (() => {
    if (stage === 'enviada') {
      if (!canOutcome) return null
      return (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            disabled={isActing}
            onClick={() =>
              void runAction(
                () => recordOutcome(opportunity.id, 'won', ''),
                'Proposta registrada como ganha.',
              )
            }
          >
            Registrar ganho
          </Button>
          <Button
            disabled={isActing}
            onClick={() => setIsLossOpen((open) => !open)}
            aria-expanded={isLossOpen}
          >
            Registrar perda
          </Button>
        </div>
      )
    }
    if (!isOwner) return null
    switch (stage) {
      case 'recebida':
      case 'qualificacao':
        return (
          <Button
            variant="primary"
            disabled={isActing}
            onClick={() =>
              void runAction(
                () => evaluateOpportunityAptitude(opportunity.id),
                'Aptidão avaliada. Veja o resultado no resumo.',
              )
            }
          >
            Avaliar aptidão
          </Button>
        )
      case 'apta':
        return (
          <Button variant="primary" onClick={() => goTab('ficha')}>
            Abrir ficha técnica
          </Button>
        )
      case 'engenharia':
        return (
          <Button
            variant="primary"
            disabled={isActing}
            onClick={() =>
              void runAction(
                () => recordMilestone(opportunity.id, 'ready'),
                'Proposta marcada como pronta para envio.',
              )
            }
          >
            Marcar como pronta
          </Button>
        )
      case 'pronta':
        return (
          <Button
            variant="primary"
            disabled={isActing}
            onClick={() =>
              void runAction(() => recordMilestone(opportunity.id, 'sent'), 'Envio registrado.')
            }
          >
            Registrar envio ao cliente
          </Button>
        )
      default:
        return null
    }
  })()

  return (
    <div className="mx-auto max-w-6xl">
      <nav aria-label="Trilha" className="mb-3 text-[13px] text-mg-muted">
        <Link to="/funil" className="font-semibold text-mg-brand hover:underline">
          Funil
        </Link>{' '}
        / <span>{opportunity.customer_name}</span>
      </nav>

      <div className="rounded-xl border border-mg-line bg-mg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StagePill stage={stage} />
              <DeadlinePill deadline={card.deadline} />
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-[-0.01em] text-mg-ink">
              {opportunity.customer_name}
            </h2>
            <p className="mt-1 text-sm text-mg-muted">
              {opportunity.service_family}
              {opportunity.location ? ` · ${opportunity.location}` : ''}
              {opportunity.contact_name ? ` · ${opportunity.contact_name}` : ''}
            </p>
          </div>
          {nextAction}
        </div>
        <div className="mt-5 border-t border-mg-line pt-4">
          <JourneyRuler currentIndex={JOURNEY_INDEX[stage]} />
        </div>
        {!isOwner && !['ganha', 'perdida'].includes(stage) && (
          <p className="mt-4 text-[13px] text-mg-muted">
            Só o responsável por esta oportunidade avança as etapas; você está vendo em modo
            leitura.
          </p>
        )}
        {isLossOpen && stage === 'enviada' && (
          <form
            className="mt-4 flex flex-wrap items-end gap-2 rounded-lg border border-mg-line bg-mg-surface-2 p-4"
            onSubmit={(event) => {
              event.preventDefault()
              void runAction(
                () => recordOutcome(opportunity.id, 'lost', lossReason),
                'Perda registrada com o motivo.',
              ).then(() => {
                setIsLossOpen(false)
                setLossReason('')
              })
            }}
          >
            <label className="min-w-[240px] flex-1 text-[13px] font-semibold text-mg-ink">
              Motivo da perda (obrigatório)
              <input
                value={lossReason}
                onChange={(event) => setLossReason(event.target.value)}
                maxLength={500}
                placeholder="Ex.: preço acima do concorrente, prazo, escopo mudou…"
                className="mt-1.5 min-h-[40px] w-full rounded-lg border border-mg-line-strong bg-mg-surface px-3 text-sm font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/20"
              />
            </label>
            <Button
              type="submit"
              variant="primary"
              disabled={isActing || lossReason.trim().length < 3}
            >
              Confirmar perda
            </Button>
          </form>
        )}
        {card.outcomeNote && stage === 'perdida' && (
          <div className="mt-4">
            <Notice tone="neutral">Motivo da perda: {card.outcomeNote}</Notice>
          </div>
        )}
        {actionError && (
          <div className="mt-4">
            <Notice tone="crit">{actionError}</Notice>
          </div>
        )}
        {actionInfo && (
          <div className="mt-4">
            <Notice tone="neutral">{actionInfo}</Notice>
          </div>
        )}
      </div>

      <div
        role="tablist"
        aria-label="Seções da oportunidade"
        className="mt-6 flex gap-1 overflow-x-auto border-b border-mg-line"
      >
        {CARD_TABS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            onClick={() => goTab(item)}
            className={`relative min-h-[44px] whitespace-nowrap px-4 text-[14px] font-semibold transition-colors duration-150 ${
              tab === item ? 'text-mg-ink' : 'text-mg-muted hover:text-mg-ink'
            }`}
          >
            {TAB_LABELS[item]}
            {tab === item && (
              <span
                aria-hidden="true"
                className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-mg-accent"
              />
            )}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="mt-6">
        {tab === 'resumo' && (
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel title="Dados da demanda" className="lg:col-span-2">
              <dl className="grid gap-4 sm:grid-cols-2">
                <Field label="Cliente" value={opportunity.customer_name} />
                <Field label="Contato" value={opportunity.contact_name} />
                <Field label="E-mail" value={opportunity.contact_email ?? ''} />
                <Field label="Origem" value={opportunity.origin} />
                <Field label="Família de serviço" value={opportunity.service_family} />
                <Field label="Local" value={opportunity.location} />
                <Field
                  label="Data da demanda"
                  value={formatCivil(dateOnly(opportunity.demand_date))}
                  mono
                />
                <Field
                  label="Prazo do cliente"
                  value={formatCivil(dateOnly(opportunity.deadline_date))}
                  mono
                />
                <Field
                  label="Recebida em"
                  value={formatCivil(civilDate(opportunity.received_at))}
                  mono
                />
              </dl>
            </Panel>
            <Panel title="Qualificação">
              <p className="text-sm font-semibold text-mg-ink">
                {aptitudeLabel(opportunity.aptitude_status)}
              </p>
              {(opportunity.pending_items?.length ?? 0) > 0 ? (
                <>
                  <p className="mt-3 text-[13px] text-mg-muted">Falta para iniciar o orçamento:</p>
                  <ul className="mt-2 space-y-1.5">
                    {opportunity.pending_items?.map((item) => (
                      <li key={item} className="flex gap-2 text-sm text-mg-ink">
                        <span
                          aria-hidden="true"
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-mg-accent"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-2 text-[13px] text-mg-muted">
                  Nenhuma pendência registrada no checklist.
                </p>
              )}
            </Panel>
          </div>
        )}

        {tab === 'ficha' && <TechSheet embedded />}

        {tab === 'composicoes' && <CompositionLibrary />}

        {tab === 'proposta' && (
          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Prévia da proposta (sem preço)" eyebrow="Disponível hoje">
              <p className="text-sm text-mg-muted">
                Gera a prévia a partir de um modelo aprovado, com cliente, obra e escopo. Preço,
                aprovação e PDF final chegam nas Fases 3 e 4.
              </p>
              <Link
                to={sectionUrl('previa')}
                className="mt-4 inline-block text-sm font-semibold text-mg-brand underline"
              >
                Abrir a prévia
              </Link>
            </Panel>
            <Panel title="Custos, preço e aprovação" eyebrow="Fases 3 e 4">
              <p className="text-sm text-mg-muted">
                Composição de custo, BDI, cenários de preço e alçadas de aprovação vão aparecer
                aqui, ligados a esta oportunidade.
              </p>
            </Panel>
          </div>
        )}

        {tab === 'historico' && (
          <Panel title="Marcos da oportunidade">
            {events.length === 0 ? (
              <p className="text-sm text-mg-muted">Nenhum marco registrado ainda.</p>
            ) : (
              <ol className="relative space-y-4 border-l border-mg-line pl-5">
                {events.map((event) => (
                  <li key={event.id}>
                    <span
                      aria-hidden="true"
                      className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-mg-surface bg-mg-brand"
                    />
                    <p className="text-sm font-semibold text-mg-ink">
                      {MILESTONE_LABELS[event.milestone] ?? event.milestone}
                    </p>
                    <p className="mg-num text-[12px] text-mg-muted">
                      {formatInstant(event.occurred_at)}
                    </p>
                    {event.note && <p className="mt-1 text-[13px] text-mg-muted">{event.note}</p>}
                  </li>
                ))}
              </ol>
            )}
            <Link
              to={sectionUrl('tempo')}
              className="mt-5 inline-block text-sm font-semibold text-mg-brand underline"
            >
              Ver apontamentos de tempo
            </Link>
          </Panel>
        )}
      </div>
    </div>
  )
}
