import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import {
  createTechSheet,
  getTechSheets,
  techSheetFileUrl,
  type TechSheetParameter,
  type TechSheetRecord,
} from '@/services/techSheets'
import { getOpportunities, type OpportunityRecord } from '@/services/opportunities'
import { filterOpportunities, type OpportunityListItem } from '@/lib/opportunityList'
import {
  MAX_ATTACHMENTS,
  classifyTechSheetError,
  describeTechSheetState,
  errorForField,
  parsePendingItems,
  resolveOpportunityContext,
  techSheetAccessMessage,
  techSheetFieldId,
  techSheetUrl,
  validateTechSheet,
  type TechSheetErrorKind,
  type TechSheetFieldError,
} from '@/lib/techSheetForm'
import { AlertTriangle, CheckCircle2, ClipboardList, FileText, Search } from 'lucide-react'

const inputClass =
  'mt-1.5 min-h-[44px] w-full rounded-[10px] border bg-white px-3 text-[14px] font-normal outline-none focus:ring-4 disabled:bg-[#F1F5F4]'
const inputOk = 'border-[#E1E8E5] focus:border-[#10B981] focus:ring-[#10B981]/15'
const inputBad = 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/15'
const labelClass = 'block text-[13px] font-semibold text-[#0F1F1C]'
const textAreaClass =
  'mt-1.5 w-full rounded-[10px] border bg-white px-3 py-2.5 text-[14px] font-normal outline-none focus:ring-4 disabled:bg-[#F1F5F4]'

const emptyParameter = (): TechSheetParameter => ({ name: '', value: '', unit: '', origin: '' })

function statusLabel(record: OpportunityRecord): string {
  if (record.aptitude_status && record.aptitude_status !== 'pending') {
    if (record.aptitude_status === 'apt') return 'Apta'
    if (record.aptitude_status === 'blocked') return 'Bloqueada'
    if (record.aptitude_status === 'exception_approved') return 'Exceção aprovada'
    return record.aptitude_status
  }
  return record.status
}

export default function TechSheet() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const [opportunity, setOpportunity] = useState<OpportunityRecord | null>(null)
  const [loadingOpportunity, setLoadingOpportunity] = useState(false)
  const [opportunityError, setOpportunityError] = useState<TechSheetErrorKind | null>(null)

  const [candidates, setCandidates] = useState<OpportunityListItem[]>([])
  const [candidatesError, setCandidatesError] = useState<string | null>(null)
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [query, setQuery] = useState('')

  const [history, setHistory] = useState<TechSheetRecord[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyError, setHistoryError] = useState<TechSheetErrorKind | null>(null)

  const [parameters, setParameters] = useState<TechSheetParameter[]>([emptyParameter()])
  const [pendingText, setPendingText] = useState('')
  const [notes, setNotes] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [fieldErrors, setFieldErrors] = useState<TechSheetFieldError[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [savedVersion, setSavedVersion] = useState<number | null>(null)

  const rawOpportunityId = searchParams.get('oportunidade') ?? ''
  const opportunityId = resolveOpportunityContext(rawOpportunityId)

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [location.pathname, rawOpportunityId])

  const loadMaybe = useCallback(async () => {
    setLoadingCandidates(true)
    try {
      const result = await getOpportunities()
      setCandidates(
        result.items.map((item) => ({
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
        })),
      )
      setCandidatesError(null)
    } catch (error: unknown) {
      setCandidates([])
      setCandidatesError(getErrorMessage(error))
    } finally {
      setLoadingCandidates(false)
    }
  }, [])

  const loadHistory = useCallback(async (id: string) => {
    setLoadingHistory(true)
    setHistoryError(null)
    try {
      const result = await getTechSheets(id)
      setHistory(result.items)
    } catch (error: unknown) {
      setHistory([])
      setHistoryError(classifyTechSheetError((error as { status?: number })?.status))
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    if (!opportunityId) {
      setOpportunity(null)
      setOpportunityError(null)
      setHistory([])
      void loadMaybe()
      return
    }

    let active = true
    setLoadingOpportunity(true)
    setOpportunityError(null)
    void pb
      .collection('opportunities')
      .getOne<OpportunityRecord>(opportunityId)
      .then((record) => {
        if (!active) return
        setOpportunity(record)
        setLoadingOpportunity(false)
        void loadHistory(opportunityId)
      })
      .catch((error: unknown) => {
        if (!active) return
        setOpportunity(null)
        setOpportunityError(classifyTechSheetError((error as { status?: number })?.status))
        setLoadingOpportunity(false)
      })
    return () => {
      active = false
    }
  }, [opportunityId, loadHistory, loadMaybe])

  const filteredCandidates = useMemo(
    () => filterOpportunities(candidates, query),
    [candidates, query],
  )

  const screenState = describeTechSheetState({
    loadingOpportunity,
    loadingHistory,
    opportunityError,
    historyError,
    hasOpportunity: Boolean(opportunity),
    versionCount: history.length,
  })

  const selectOpportunity = (id: string) => {
    setQuery('')
    setFieldErrors([])
    setFormError(null)
    setSavedVersion(null)
    setSearchParams({ oportunidade: id }, { replace: false })
  }

  const clearContext = () => {
    setSearchParams({}, { replace: false })
    setOpportunity(null)
    setHistory([])
    setFieldErrors([])
    setFormError(null)
    setSavedVersion(null)
  }

  const updateParameter = (index: number, field: keyof TechSheetParameter, value: string) => {
    setParameters((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    )
    setFieldErrors((current) =>
      current.filter((error) => !(error.index === index && error.field === field)),
    )
    setFormError(null)
  }

  const addParameter = () => {
    setParameters((current) => [...current, emptyParameter()])
    setFormError(null)
  }

  const removeParameter = (index: number) => {
    setParameters((current) => current.filter((_, itemIndex) => itemIndex !== index))
    setFieldErrors([])
    setFormError(null)
  }

  const focusFirstError = (targetId: string | null) => {
    if (!targetId) return
    requestAnimationFrame(() => {
      const element = document.getElementById(targetId)
      element?.focus({ preventScroll: false })
      element?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!opportunity) return

    setFormError(null)
    setSavedVersion(null)

    const validation = validateTechSheet({
      parameters,
      pendingText,
      notes,
      attachmentCount: files.length,
    })
    setFieldErrors(validation.errors)

    if (!validation.valid) {
      setFormError(
        'Revise os campos destacados. Nada foi enviado ao servidor e o que você digitou foi mantido.',
      )
      focusFirstError(validation.firstTargetId)
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createTechSheet({
        opportunity_id: opportunity.id,
        parameters: parameters.map((item) => ({
          name: item.name.trim(),
          value: item.value.trim(),
          unit: item.unit.trim(),
          origin: item.origin.trim(),
        })),
        pending_items:
          parsePendingItems(pendingText).length > 0 ? parsePendingItems(pendingText) : undefined,
        notes: notes.trim() || undefined,
        attachments: files.length > 0 ? files : undefined,
      })
      setSavedVersion(result.version)
      setParameters([emptyParameter()])
      setPendingText('')
      setNotes('')
      setFiles([])
      setFieldErrors([])
      await loadHistory(opportunity.id)
    } catch (error: unknown) {
      const kind = classifyTechSheetError((error as { status?: number })?.status)
      const access = techSheetAccessMessage(kind)
      setFormError(access ?? getErrorMessage(error))
      if (kind === 'forbidden') setHistoryError('forbidden')
    } finally {
      setIsSubmitting(false)
    }
  }

  const header = (
    <div className="mb-6 flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#ECFDF5] text-[#047857]">
        <FileText className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <h2
          id="secao-ficha"
          ref={headingRef}
          tabIndex={-1}
          style={{ scrollMarginTop: '5rem' }}
          className="text-xl font-extrabold text-[#0F1F1C] outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#064E3B]"
        >
          Ficha técnica
        </h2>
        <p className="mt-1 text-[13px] text-[#5B6B66]">
          Cada salvamento cria uma nova versão. Autor, data e número da versão são definidos pelo
          servidor; versões anteriores permanecem intactas.
        </p>
      </div>
    </div>
  )

  const contextBar = opportunity && (
    <div className="mb-5 rounded-[12px] border border-[#E1E8E5] bg-[#F8FAF9] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#5B6B66]">
            Demanda em contexto
          </p>
          <p className="truncate text-[15px] font-bold text-[#0F1F1C]">
            {opportunity.customer_name}
          </p>
          <p className="mt-1 grid gap-x-4 gap-y-0.5 text-[12px] text-[#5B6B66] sm:grid-cols-2">
            <span>Família: {opportunity.service_family}</span>
            <span>Local: {opportunity.location}</span>
            <span>Demanda: {opportunity.demand_date}</span>
            <span>Situação: {statusLabel(opportunity)}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/demandas`}
            className="inline-flex min-h-[44px] items-center rounded-lg border border-[#CBD5D1] bg-white px-4 text-sm font-semibold text-[#064E3B] hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
          >
            Ver demandas
          </Link>
          <button
            type="button"
            onClick={clearContext}
            className="inline-flex min-h-[44px] items-center rounded-lg border border-[#CBD5D1] bg-white px-4 text-sm font-semibold text-[#064E3B] hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
          >
            Trocar demanda
          </button>
        </div>
      </div>
    </div>
  )

  const selection = (
    <div>
      <h3 className="text-[15px] font-bold text-[#0F1F1C]">Escolha a demanda</h3>
      <p className="mt-1 text-[13px] text-[#5B6B66]">
        A ficha pertence a uma demanda. Selecione pelo nome do cliente — não é preciso informar
        identificador.
      </p>

      <label className={`${labelClass} mt-4 block w-full sm:max-w-sm`}>
        Buscar demanda
        <span className="relative mt-1.5 block">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5B6B66]"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cliente, contato, família, local…"
            className={`${inputClass} ${inputOk} pl-9`}
          />
        </span>
      </label>

      {candidatesError && (
        <div
          className="mt-4 rounded-[12px] border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]"
          role="alert"
          aria-live="assertive"
        >
          <p>Não foi possível carregar as demandas.</p>
          <p className="mt-1">{candidatesError}</p>
          <button
            type="button"
            onClick={() => void loadMaybe()}
            className="mt-3 min-h-[44px] rounded-lg border border-[#B91C1C] px-4 font-semibold"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {loadingCandidates && !candidatesError && (
        <p className="mt-4 text-[13px] text-[#5B6B66]" role="status" aria-live="polite">
          Carregando demandas…
        </p>
      )}

      {!loadingCandidates && !candidatesError && candidates.length === 0 && (
        <p className="mt-4 text-[13px] text-[#5B6B66]" role="status">
          Nenhuma demanda disponível para o seu usuário. Registre uma em Oportunidades.
        </p>
      )}

      {!loadingCandidates &&
        !candidatesError &&
        candidates.length > 0 &&
        filteredCandidates.length === 0 && (
          <p className="mt-4 text-[13px] text-[#5B6B66]" role="status">
            Nenhuma demanda corresponde a “{query}”.
          </p>
        )}

      {filteredCandidates.length > 0 && (
        <ul className="mt-4 space-y-2">
          {filteredCandidates.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => selectOpportunity(item.id)}
                className="w-full rounded-[12px] border border-[#E1E8E5] bg-white p-3.5 text-left transition-colors hover:border-[#A7F3D0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] font-semibold text-[#0F1F1C]">
                    {item.customer_name}
                  </span>
                  <span className="shrink-0 text-[10px] font-bold uppercase text-[#047857]">
                    {item.aptitude_status && item.aptitude_status !== 'pending'
                      ? item.aptitude_status
                      : item.status}
                  </span>
                </span>
                <span className="mt-2 grid gap-x-3 gap-y-1 text-[11px] text-[#5B6B66] sm:grid-cols-2">
                  <span>Contato: {item.contact_name}</span>
                  <span>Família: {item.service_family}</span>
                  <span>Local: {item.location}</span>
                  <span>Demanda: {item.demand_date}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  const form = opportunity && (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[15px] font-bold text-[#0F1F1C]">Nova versão</h3>
        <span className="text-[12px] text-[#5B6B66]">
          Preencha os parâmetros desta versão da ficha.
        </span>
      </div>

      {formError && (
        <div
          className="flex items-start gap-2.5 rounded-[12px] border-l-4 border-[#DC2626] bg-[#FEF2F2] p-3.5 text-[13px] font-medium text-[#B91C1C]"
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {savedVersion !== null && (
        <div
          className="flex items-start gap-2.5 rounded-[12px] border-l-4 border-[#10B981] bg-[#ECFDF5] p-3.5 text-[13px] font-medium text-[#047857]"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Versão {savedVersion} registrada pelo servidor. Ela aparece destacada no histórico
            abaixo; as anteriores continuam intactas.
          </span>
        </div>
      )}

      <div className="space-y-3">
        {parameters.map((parameter, index) => (
          <fieldset key={index} className="rounded-[12px] border border-[#E1E8E5] bg-[#F8FAF9] p-4">
            <legend className="px-1 text-[11px] font-bold uppercase tracking-wider text-[#5B6B66]">
              Parâmetro {index + 1}
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  {
                    field: 'name',
                    label: 'Nome',
                    placeholder: 'Ex.: espessura da camada',
                    max: 120,
                  },
                  { field: 'value', label: 'Valor', placeholder: 'Ex.: 3,0', max: 200 },
                  { field: 'unit', label: 'Unidade', placeholder: 'Ex.: mm', max: 40 },
                  {
                    field: 'origin',
                    label: 'Origem',
                    placeholder: 'Ex.: visita técnica',
                    max: 120,
                  },
                ] as const
              ).map((fieldConfig) => {
                const error = errorForField(fieldErrors, index, fieldConfig.field)
                const describedBy = error
                  ? `${techSheetFieldId(index, fieldConfig.field)}-erro`
                  : undefined
                return (
                  <div key={fieldConfig.field}>
                    <label
                      className={labelClass}
                      htmlFor={techSheetFieldId(index, fieldConfig.field)}
                    >
                      {fieldConfig.label} *
                    </label>
                    <input
                      id={techSheetFieldId(index, fieldConfig.field)}
                      required
                      maxLength={fieldConfig.max}
                      disabled={isSubmitting}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={describedBy}
                      value={parameter[fieldConfig.field]}
                      onChange={(event) =>
                        updateParameter(index, fieldConfig.field, event.target.value)
                      }
                      placeholder={fieldConfig.placeholder}
                      className={`${inputClass} ${error ? inputBad : inputOk}`}
                    />
                    {error && (
                      <p
                        id={describedBy}
                        className="mt-1 text-[12px] font-medium text-[#B91C1C]"
                        role="alert"
                      >
                        {error}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
            {parameters.length > 1 && (
              <button
                type="button"
                onClick={() => removeParameter(index)}
                disabled={isSubmitting}
                className="mt-3 inline-flex min-h-[44px] items-center rounded-lg border border-[#FECACA] px-3 text-[12px] font-semibold text-[#B91C1C] hover:bg-[#FEF2F2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#991B1B] disabled:opacity-60"
              >
                Remover parâmetro {index + 1}
              </button>
            )}
          </fieldset>
        ))}
      </div>

      <button
        type="button"
        onClick={addParameter}
        disabled={isSubmitting}
        className="inline-flex min-h-[44px] items-center rounded-lg border border-[#CBD5D1] bg-white px-4 text-[13px] font-semibold text-[#064E3B] hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 disabled:opacity-60"
      >
        + Adicionar parâmetro
      </button>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor={techSheetFieldId(-1, 'pending_items')}>
            Pendências (uma por linha)
          </label>
          <textarea
            id={techSheetFieldId(-1, 'pending_items')}
            rows={3}
            maxLength={3000}
            disabled={isSubmitting}
            aria-invalid={errorForField(fieldErrors, -1, 'pending_items') ? true : undefined}
            value={pendingText}
            onChange={(event) => {
              setPendingText(event.target.value)
              setFormError(null)
            }}
            className={`${textAreaClass} ${
              errorForField(fieldErrors, -1, 'pending_items') ? inputBad : inputOk
            }`}
            placeholder="Ex.: aguardando planta atualizada"
          />
          {errorForField(fieldErrors, -1, 'pending_items') && (
            <p className="mt-1 text-[12px] font-medium text-[#B91C1C]" role="alert">
              {errorForField(fieldErrors, -1, 'pending_items')}
            </p>
          )}
        </div>
        <div>
          <label className={labelClass} htmlFor={techSheetFieldId(-1, 'notes')}>
            Observações
          </label>
          <textarea
            id={techSheetFieldId(-1, 'notes')}
            rows={3}
            maxLength={2000}
            disabled={isSubmitting}
            aria-invalid={errorForField(fieldErrors, -1, 'notes') ? true : undefined}
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value)
              setFormError(null)
            }}
            className={`${textAreaClass} ${
              errorForField(fieldErrors, -1, 'notes') ? inputBad : inputOk
            }`}
            placeholder="Contexto adicional desta versão"
          />
          {errorForField(fieldErrors, -1, 'notes') && (
            <p className="mt-1 text-[12px] font-medium text-[#B91C1C]" role="alert">
              {errorForField(fieldErrors, -1, 'notes')}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor={techSheetFieldId(-1, 'attachments')}>
          Anexos (até {MAX_ATTACHMENTS} arquivos, um único envio)
        </label>
        <input
          id={techSheetFieldId(-1, 'attachments')}
          type="file"
          multiple
          disabled={isSubmitting}
          onChange={(event) => {
            setFiles(Array.from(event.target.files ?? []))
            setFormError(null)
          }}
          className="mt-1.5 w-full text-[13px] text-[#5B6B66] file:mr-3 file:min-h-[38px] file:rounded-[9px] file:border-0 file:bg-[#064E3B] file:px-3 file:text-[12px] file:font-semibold file:text-white file:cursor-pointer"
        />
        {files.length > 0 && (
          <p className="mt-1 text-[12px] text-[#5B6B66]" role="status">
            {files.length} arquivo(s) selecionado(s): {files.map((file) => file.name).join(', ')}
          </p>
        )}
        {errorForField(fieldErrors, -1, 'attachments') && (
          <p className="mt-1 text-[12px] font-medium text-[#B91C1C]" role="alert">
            {errorForField(fieldErrors, -1, 'attachments')}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] text-[#5B6B66]">
          O autor e o número da versão são definidos pelo servidor.
        </p>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-[46px] items-center justify-center rounded-[10px] bg-gradient-to-r from-[#10B981] to-[#059669] px-5 text-[14px] font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 disabled:pointer-events-none disabled:opacity-60"
        >
          {isSubmitting ? 'Salvando…' : 'Salvar nova versão'}
        </button>
      </div>
    </form>
  )

  const historyBlock = opportunity && (
    <div className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-bold text-[#0F1F1C]">Histórico de versões</h3>
          <p className="mt-1 text-[12px] text-[#5B6B66]">
            Versões anteriores são imutáveis e mantêm autor e data de registro.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadHistory(opportunity.id)}
          disabled={loadingHistory}
          className="min-h-[44px] rounded-lg border border-[#CBD5D1] bg-white px-4 text-sm font-semibold text-[#064E3B] hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 disabled:opacity-60"
        >
          {loadingHistory ? 'Atualizando…' : 'Atualizar histórico'}
        </button>
      </div>

      {historyError === 'forbidden' && (
        <p
          className="rounded-[12px] border border-[#FED7AA] bg-[#FFF7ED] p-4 text-sm text-[#9A3412]"
          role="alert"
        >
          {techSheetAccessMessage('forbidden')}
        </p>
      )}

      {historyError && historyError !== 'forbidden' && (
        <div
          className="rounded-[12px] border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]"
          role="alert"
        >
          <p>Não foi possível consultar o histórico desta demanda.</p>
          <button
            type="button"
            onClick={() => void loadHistory(opportunity.id)}
            className="mt-3 min-h-[44px] rounded-lg border border-[#B91C1C] px-4 font-semibold"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {loadingHistory && !historyError && (
        <p className="text-[13px] text-[#5B6B66]" role="status" aria-live="polite">
          Carregando histórico…
        </p>
      )}

      {!loadingHistory && !historyError && history.length === 0 && (
        <p className="text-[13px] text-[#5B6B66]" role="status">
          Nenhuma versão registrada para esta demanda. A primeira versão nasce ao salvar acima.
        </p>
      )}

      {history.length > 0 && (
        <div className="space-y-3">
          {history.map((sheet) => (
            <article
              key={sheet.id}
              className={`rounded-[12px] border bg-white p-3.5 ${
                savedVersion === sheet.version
                  ? 'border-[#10B981] ring-1 ring-[#10B981]/40'
                  : 'border-[#E1E8E5]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[13px] font-bold text-[#0F1F1C]">
                  Versão {sheet.version}
                  {savedVersion === sheet.version && (
                    <span className="ml-2 rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[10px] font-bold uppercase text-[#047857]">
                      salva agora
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-[#5B6B66]">{sheet.createdAt}</span>
              </div>

              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[#5B6B66]">
                Parâmetros
              </p>
              <ul className="mt-1 space-y-0.5 text-[12px] text-[#0F1F1C]">
                {sheet.parameters.map((parameter, parameterIndex) => (
                  <li key={`${sheet.id}-p-${parameterIndex}`}>
                    {parameter.name}: {parameter.value} {parameter.unit} · origem:{' '}
                    {parameter.origin}
                  </li>
                ))}
              </ul>

              {sheet.pendingItems.length > 0 && (
                <>
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[#C2410C]">
                    Pendências
                  </p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[12px] text-[#0F1F1C]">
                    {sheet.pendingItems.map((item, itemIndex) => (
                      <li key={`${sheet.id}-d-${itemIndex}`}>{item}</li>
                    ))}
                  </ul>
                </>
              )}

              {sheet.notes && (
                <p className="mt-2 text-[12px] text-[#5B6B66]">Observações: {sheet.notes}</p>
              )}

              {sheet.attachments.length > 0 && (
                <>
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[#5B6B66]">
                    Anexos
                  </p>
                  <ul className="mt-1 space-y-0.5 text-[12px]">
                    {sheet.attachments.map((filename) => (
                      <li key={`${sheet.id}-a-${filename}`}>
                        <a
                          href={techSheetFileUrl(sheet, filename)}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all text-[#047857] hover:underline"
                        >
                          {filename}
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )

  const opportunityErrorMessage = techSheetAccessMessage(opportunityError ?? 'other')

  return (
    <section className="mx-auto mt-0 w-full max-w-5xl rounded-[16px] border border-[#E1E8E5] bg-white p-6 shadow-[0_12px_40px_rgba(2,44,34,0.06)] sm:p-8">
      {header}

      {screenState === 'loading' && (
        <p className="text-[13px] text-[#5B6B66]" role="status" aria-live="polite">
          Carregando ficha técnica…
        </p>
      )}

      {(screenState === 'forbidden' || screenState === 'unavailable') && (
        <div
          className="rounded-[12px] border border-[#FED7AA] bg-[#FFF7ED] p-4 text-sm text-[#9A3412]"
          role="alert"
          aria-live="assertive"
        >
          <p>{techSheetAccessMessage(screenState === 'forbidden' ? 'forbidden' : 'not-found')}</p>
          <p className="mt-1">
            A consulta e o registro da ficha seguem restritos ao responsável pela demanda, como
            definido no servidor. Nenhum dado desta ficha é exibido.
          </p>
          <button
            type="button"
            onClick={clearContext}
            className="mt-3 min-h-[44px] rounded-lg border border-[#9A3412] px-4 font-semibold"
          >
            Escolher outra demanda
          </button>
        </div>
      )}

      {screenState === 'error' && (
        <div
          className="rounded-[12px] border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]"
          role="alert"
          aria-live="assertive"
        >
          <p>Não foi possível abrir a ficha técnica desta demanda.</p>
          <p className="mt-1">{opportunityErrorMessage ?? 'Tente novamente em instantes.'}</p>
          <button
            type="button"
            onClick={clearContext}
            className="mt-3 min-h-[44px] rounded-lg border border-[#B91C1C] px-4 font-semibold"
          >
            Escolher outra demanda
          </button>
        </div>
      )}

      {screenState === 'no-context' && (
        <div className="flex items-start gap-3 rounded-[12px] border border-[#E1E8E5] bg-[#F8FAF9] p-4">
          <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-[#5B6B66]" />
          <p className="text-[13px] text-[#5B6B66]">
            Nenhuma demanda em contexto. A ficha técnica pertence a uma demanda — escolha uma abaixo
            ou abra a ficha a partir do detalhe em Oportunidades.
          </p>
        </div>
      )}

      {contextBar}

      {screenState === 'no-context' && selection}

      {(screenState === 'empty' || screenState === 'ready') && form}
      {(screenState === 'empty' || screenState === 'ready') && historyBlock}
    </section>
  )
}
