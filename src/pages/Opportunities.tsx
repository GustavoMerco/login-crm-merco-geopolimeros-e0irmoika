import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { aptitudeLabel, statusLabel, cardUrl } from '@/lib/pipeline'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import {
  createOpportunity,
  getOpportunities,
  type CreateOpportunityInput,
  type OpportunityRecord,
} from '@/services/opportunities'
import {
  describeOpportunityEmptyState,
  filterOpportunities,
  resolveOpportunityId,
  type OpportunityListItem,
} from '@/lib/opportunityList'
import { techSheetUrl } from '@/lib/techSheetForm'
import { AlertTriangle, CheckCircle2, ClipboardList, Search } from 'lucide-react'

const inputClass =
  'mt-1.5 min-h-[44px] w-full rounded-[10px] border border-mg-line bg-mg-surface px-3 text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15 disabled:bg-mg-surface-2'
const labelClass = 'block text-[13px] font-semibold text-mg-ink'

const emptyForm: CreateOpportunityInput = {
  customer_name: '',
  contact_name: '',
  contact_email: '',
  origin: '',
  service_family: '',
  location: '',
  demand_date: '',
  deadline_date: '',
}

function toListItem(item: OpportunityRecord): OpportunityListItem {
  return {
    id: item.id,
    customer_name: item.customer_name,
    contact_name: item.contact_name,
    contact_email: item.contact_email,
    origin: item.origin,
    service_family: item.service_family,
    location: item.location,
    demand_date: item.demand_date,
    deadline_date: item.deadline_date,
    received_at: item.received_at,
    status: item.status,
    aptitude_status: item.aptitude_status,
  }
}

export default function Opportunities() {
  const location = useLocation()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const [items, setItems] = useState<OpportunityListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState('')

  // ?nova=1 (vindo do funil, de Hoje ou de Clientes) já abre o cadastro.
  const [isFormOpen, setIsFormOpen] = useState(() => new URLSearchParams(location.search).get('nova') === '1')
  const [form, setForm] = useState<CreateOpportunityInput>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdId, setCreatedId] = useState('')

  const [detail, setDetail] = useState<OpportunityRecord | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const loadOpportunities = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getOpportunities()
      setItems(result.items.map(toListItem))
      setLoadError(null)
    } catch (error: unknown) {
      setLoadError(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadOpportunities()
  }, [loadOpportunities])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [location.pathname])

  const openDetail = useCallback(async (id: string) => {
    const safeId = /^[a-z0-9]{15}$/.test(id) ? id : ''
    if (!safeId) {
      setDetailError('Demanda inválida.')
      return
    }
    setSelectedId(safeId)
    setIsLoadingDetail(true)
    setDetailError(null)
    try {
      const record = await pb.collection('opportunities').getOne<OpportunityRecord>(safeId)
      setDetail(record)
    } catch (error: unknown) {
      setDetail(null)
      setDetailError(getErrorMessage(error))
    } finally {
      setIsLoadingDetail(false)
    }
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setIsSubmitting(true)
    try {
      const result = await createOpportunity({
        ...form,
        contact_email: form.contact_email?.trim() || undefined,
        deadline_date: form.deadline_date || undefined,
      })
      setCreatedId(result.id)
      setForm(emptyForm)
      setIsFormOpen(false)
      await loadOpportunities()
      await openDetail(result.id)
    } catch (error: unknown) {
      setFormError(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: keyof CreateOpportunityInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setFormError(null)
  }

  const filtered = useMemo(() => filterOpportunities(items, query), [items, query])
  const listState = describeOpportunityEmptyState(
    { query, selectedId },
    items,
    isLoading,
    loadError,
  )
  const selectedInList = resolveOpportunityId(items, selectedId)

  const backToList = () => {
    setDetail(null)
    setDetailError(null)
    setSelectedId('')
    requestAnimationFrame(() => searchRef.current?.focus({ preventScroll: true }))
  }

  return (
    <section className="mx-auto mt-0 w-full max-w-6xl rounded-[16px] border border-mg-line bg-mg-surface p-6 shadow-[0_12px_40px_rgba(2,44,34,0.06)] sm:p-8">
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-mg-brand-soft text-mg-brand">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div>
          <h2
            id="secao-demanda"
            ref={headingRef}
            tabIndex={-1}
            style={{ scrollMarginTop: '5rem' }}
            className="text-xl font-extrabold text-mg-ink outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mg-brand-strong"
          >
            Demandas
          </h2>
          <p className="mt-1 text-[13px] text-mg-muted">
            Crie uma demanda ou retome uma já registrada. A lista mostra apenas os registros que o
            servidor autoriza ao seu usuário.
          </p>
        </div>
      </div>

      {createdId && (
        <div
          className="mb-5 flex items-start gap-2.5 rounded-[12px] border-l-4 border-mg-brand bg-mg-brand-soft p-3.5 text-[13px] font-medium text-mg-brand"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Demanda registrada e aberta em detalhe.</span>
        </div>
      )}

      {detail || isLoadingDetail || detailError ? (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-[15px] font-bold text-mg-ink">Detalhe da demanda</h3>
            <div className="flex flex-wrap gap-2">
              {detail && (
                <Link
                  to={techSheetUrl(detail.id)}
                  className="min-h-[44px] rounded-lg bg-mg-sidebar px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-mg-brand inline-flex items-center"
                >
                  Abrir ficha técnica
                </Link>
              )}
              <button
                type="button"
                onClick={backToList}
                className="min-h-[44px] rounded-lg border border-mg-line-strong bg-mg-surface px-4 text-sm font-semibold text-mg-brand-strong hover:bg-mg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-mg-brand"
              >
                Voltar para a lista
              </button>
            </div>
          </div>

          {isLoadingDetail && (
            <p className="text-[13px] text-mg-muted" role="status" aria-live="polite">
              Carregando o registro salvo…
            </p>
          )}

          {detailError && (
            <div
              className="rounded-[12px] border border-mg-crit-line bg-mg-crit-bg p-4 text-sm text-mg-crit"
              role="alert"
              aria-live="assertive"
            >
              <p>Não foi possível abrir o registro salvo.</p>
              <p className="mt-1">{detailError}</p>
              {selectedInList && (
                <button
                  type="button"
                  onClick={() => void openDetail(selectedInList)}
                  className="mt-3 min-h-[44px] rounded-lg border border-mg-crit px-4 font-semibold"
                >
                  Tentar novamente
                </button>
              )}
            </div>
          )}

          {detail && (
            <dl className="grid gap-x-6 gap-y-3 rounded-[12px] border border-mg-line bg-mg-surface-2 p-4 sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-bold uppercase text-mg-muted">Cliente</dt>
                <dd className="text-[14px] text-mg-ink">{detail.customer_name}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase text-mg-muted">Contato</dt>
                <dd className="text-[14px] text-mg-ink">{detail.contact_name}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase text-mg-muted">E-mail</dt>
                <dd className="text-[14px] text-mg-ink">{detail.contact_email || '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase text-mg-muted">Origem</dt>
                <dd className="text-[14px] text-mg-ink">{detail.origin}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase text-mg-muted">Família</dt>
                <dd className="text-[14px] text-mg-ink">{detail.service_family}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase text-mg-muted">Local</dt>
                <dd className="text-[14px] text-mg-ink">{detail.location}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase text-mg-muted">Data da demanda</dt>
                <dd className="text-[14px] text-mg-ink">{detail.demand_date}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase text-mg-muted">Prazo</dt>
                <dd className="text-[14px] text-mg-ink">{detail.deadline_date || '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase text-mg-muted">Recebida em</dt>
                <dd className="text-[14px] text-mg-ink">{detail.received_at}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase text-mg-muted">Situação</dt>
                <dd className="text-[14px] text-mg-ink">
                  {detail.aptitude_status && detail.aptitude_status !== 'pending'
                    ? aptitudeLabel(detail.aptitude_status)
                    : statusLabel(detail.status)}
                </dd>
              </div>
            </dl>
          )}
          {detail && (
            <Link
              to={cardUrl(detail.id)}
              className="mt-5 inline-flex min-h-[40px] items-center rounded-lg bg-mg-action px-4 text-sm font-semibold text-white hover:bg-mg-action-hover"
            >
              Abrir oportunidade completa
            </Link>
          )}
        </div>
      ) : (
        <div>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <label className={`${labelClass} w-full sm:max-w-sm`}>
              Buscar nas demandas carregadas
              <span className="relative mt-1.5 block">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mg-muted"
                />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cliente, contato, família, local…"
                  className={`${inputClass} pl-9`}
                />
              </span>
            </label>
            <button
              type="button"
              onClick={() => {
                setForm(emptyForm)
                setFormError(null)
                setIsFormOpen((open) => !open)
              }}
              aria-expanded={isFormOpen}
              className="min-h-[44px] rounded-[10px] bg-mg-brand-fill hover:bg-mg-brand-fill/90 px-5 text-[13px] font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-mg-brand"
            >
              {isFormOpen ? 'Fechar formulário' : 'Nova demanda'}
            </button>
          </div>

          {isFormOpen && (
            <form
              onSubmit={handleSubmit}
              className="mb-6 space-y-4 rounded-[12px] border border-mg-line bg-mg-surface-2 p-4"
              noValidate
            >
              {formError && (
                <div
                  className="flex items-start gap-2.5 rounded-[10px] border-l-4 border-mg-crit bg-mg-crit-bg p-3 text-[13px] font-medium text-mg-crit"
                  role="alert"
                  aria-live="assertive"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Cliente *
                  <input
                    required
                    maxLength={200}
                    disabled={isSubmitting}
                    value={form.customer_name}
                    onChange={(event) => handleChange('customer_name', event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Contato *
                  <input
                    required
                    maxLength={200}
                    disabled={isSubmitting}
                    value={form.contact_name}
                    onChange={(event) => handleChange('contact_name', event.target.value)}
                    className={inputClass}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  E-mail do contato
                  <input
                    type="email"
                    maxLength={200}
                    disabled={isSubmitting}
                    value={form.contact_email}
                    onChange={(event) => handleChange('contact_email', event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Origem *
                  <input
                    required
                    maxLength={120}
                    disabled={isSubmitting}
                    value={form.origin}
                    onChange={(event) => handleChange('origin', event.target.value)}
                    className={inputClass}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Família de serviço *
                  <input
                    required
                    maxLength={120}
                    disabled={isSubmitting}
                    value={form.service_family}
                    onChange={(event) => handleChange('service_family', event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Local do serviço *
                  <input
                    required
                    maxLength={300}
                    disabled={isSubmitting}
                    value={form.location}
                    onChange={(event) => handleChange('location', event.target.value)}
                    className={inputClass}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Data da demanda *
                  <input
                    required
                    type="date"
                    disabled={isSubmitting}
                    value={form.demand_date}
                    onChange={(event) => handleChange('demand_date', event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Prazo
                  <input
                    type="date"
                    disabled={isSubmitting}
                    value={form.deadline_date}
                    onChange={(event) => handleChange('deadline_date', event.target.value)}
                    className={inputClass}
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-[44px] rounded-[10px] bg-mg-sidebar px-5 text-[13px] font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-mg-brand disabled:pointer-events-none disabled:opacity-60"
              >
                {isSubmitting ? 'Salvando…' : 'Salvar demanda'}
              </button>
            </form>
          )}

          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-[15px] font-bold text-mg-ink">
              Demandas carregadas
              {listState === 'ready' && (
                <span className="ml-2 text-[12px] font-normal text-mg-muted">
                  {filtered.length} de {items.length}
                </span>
              )}
            </h3>
            <button
              type="button"
              onClick={() => void loadOpportunities()}
              disabled={isLoading}
              className="min-h-[44px] rounded-lg border border-mg-line-strong bg-mg-surface px-4 text-sm font-semibold text-mg-brand-strong hover:bg-mg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-mg-brand disabled:opacity-60"
            >
              {isLoading ? 'Atualizando…' : 'Atualizar lista'}
            </button>
          </div>

          {listState === 'loading' && (
            <p className="text-[13px] text-mg-muted" role="status" aria-live="polite">
              Carregando demandas…
            </p>
          )}

          {listState === 'error' && (
            <div
              className="rounded-[12px] border border-mg-crit-line bg-mg-crit-bg p-4 text-sm text-mg-crit"
              role="alert"
              aria-live="assertive"
            >
              <p>Não foi possível carregar as demandas.</p>
              <p className="mt-1">{loadError}</p>
              <button
                type="button"
                onClick={() => void loadOpportunities()}
                className="mt-3 min-h-[44px] rounded-lg border border-mg-crit px-4 font-semibold"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {listState === 'empty' && (
            <p className="text-[13px] text-mg-muted" role="status">
              Nenhuma demanda registrada para o seu usuário. Use “Nova demanda” para criar a
              primeira.
            </p>
          )}

          {listState === 'no-results' && (
            <p className="text-[13px] text-mg-muted" role="status">
              Nenhuma demanda carregada corresponde a “{query}”. A busca considera apenas os
              registros já carregados e autorizados.
            </p>
          )}

          {listState === 'ready' && (
            <ul className="space-y-2" aria-label="Demandas carregadas">
              {filtered.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => void openDetail(item.id)}
                    className="w-full rounded-[12px] border border-mg-line bg-mg-surface p-3.5 text-left transition-colors hover:border-mg-brand-soft-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mg-brand"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold text-mg-ink">
                        {item.customer_name}
                      </span>
                      <span className="shrink-0 text-[10px] font-bold uppercase text-mg-brand">
                        {item.aptitude_status && item.aptitude_status !== 'pending'
                          ? item.aptitude_status
                          : item.status}
                      </span>
                    </span>
                    <span className="mt-2 grid gap-x-3 gap-y-1 text-[11px] text-mg-muted sm:grid-cols-2">
                      <span>Contato: {item.contact_name}</span>
                      <span>Origem: {item.origin}</span>
                      <span>Família: {item.service_family}</span>
                      <span>Local: {item.location}</span>
                      <span>Demanda: {item.demand_date}</span>
                      {item.deadline_date && <span>Prazo: {item.deadline_date}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
