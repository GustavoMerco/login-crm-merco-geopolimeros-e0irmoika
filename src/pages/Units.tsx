import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { checkPermission } from '@/services/security'
import {
  createUnit,
  deactivateUnit,
  getUnits,
  homologateUnit,
  type UnitRecord,
} from '@/services/units'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { hasPermission } from '@/lib/auth/permissions'
import {
  DIMENSION_LABELS,
  MAX_UNIT_CODE,
  MAX_UNIT_NAME,
  UNIT_DIMENSIONS,
  UNIT_FIELD_IDS,
  unitErrorFor,
  unitStatusLabel,
  unitStatusTone,
  validateUnitForm,
} from '@/lib/unitForm'
import { AlertTriangle, Ruler } from 'lucide-react'

type ServerPermissionState = 'loading' | 'allowed' | 'denied' | 'unavailable'

const inputBase =
  'mt-1.5 min-h-[44px] w-full rounded-[10px] border bg-mg-surface px-3 text-[14px] font-normal outline-none focus:ring-4 disabled:bg-mg-surface-2'
const inputOk = 'border-mg-line focus:border-mg-brand focus:ring-mg-brand/15'
const inputBad = 'border-mg-crit focus:border-mg-crit focus:ring-mg-crit/15'
const labelClass = 'block text-[13px] font-semibold text-mg-ink'

function fieldClass(hasError: boolean): string {
  return `${inputBase} ${hasError ? inputBad : inputOk}`
}

function FieldMessage({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p className="mt-1 text-[12px] font-medium text-mg-crit" role="alert">
      {message}
    </p>
  )
}

const STATUS_TONE: Record<string, string> = {
  ok: 'bg-mg-brand-soft text-mg-brand',
  off: 'bg-mg-surface-2 text-mg-muted',
  draft: 'bg-mg-warn-bg text-mg-warn',
}

export default function Units() {
  const { user } = useAuth()
  const location = useLocation()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [serverPermission, setServerPermission] = useState<ServerPermissionState>('loading')
  const [units, setUnits] = useState<UnitRecord[]>([])
  const [isLoadingUnits, setIsLoadingUnits] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formInfo, setFormInfo] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [busyUnitId, setBusyUnitId] = useState<string | null>(null)
  const [showErrors, setShowErrors] = useState(false)
  const [deactivating, setDeactivating] = useState<UnitRecord | null>(null)
  const [deactivateReason, setDeactivateReason] = useState('')
  const [deactivateError, setDeactivateError] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [dimension, setDimension] = useState('')

  useEffect(() => {
    let active = true
    void checkPermission('homologateCatalog')
      .then((result) => {
        if (active) setServerPermission(result.allowed ? 'allowed' : 'denied')
      })
      .catch(() => {
        if (active) setServerPermission('unavailable')
      })
    return () => {
      active = false
    }
  }, [])

  const loadUnits = useCallback(async () => {
    setIsLoadingUnits(true)
    try {
      const result = await getUnits()
      setUnits(result.items)
      setLoadError(null)
    } catch (error: unknown) {
      setLoadError(getErrorMessage(error))
    } finally {
      setIsLoadingUnits(false)
    }
  }, [])

  useEffect(() => {
    void loadUnits()
  }, [loadUnits])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [location.pathname])

  const validation = validateUnitForm({ code, name, dimension })
  const activeErrors = showErrors ? validation.errors : []
  const errorFor = (targetId: string) => unitErrorFor(activeErrors, targetId)

  const focusFirstError = (targetId: string | null) => {
    if (!targetId) return
    const element = formRef.current?.querySelector<HTMLElement>(`[id="${targetId}"]`)
    if (!element) return
    element.scrollIntoView({ block: 'center', behavior: 'smooth' })
    element.focus({ preventScroll: true })
  }

  const canManageUnits =
    serverPermission === 'allowed' && hasPermission(user?.role, 'homologateCatalog')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setFormInfo(null)
    setShowErrors(true)

    if (!validation.valid) {
      focusFirstError(validation.firstTargetId)
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createUnit({ code: code.trim(), name: name.trim(), dimension })
      setFormInfo(
        `Unidade ${result.code} criada como rascunho. Homologue para que possa ser usada.`,
      )
      setCode('')
      setName('')
      setDimension('')
      setShowErrors(false)
      await loadUnits()
    } catch (error: unknown) {
      // Nada é limpo: se a API negar, o que a Engenharia digitou permanece.
      setFormError(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleHomologate = async (unit: UnitRecord) => {
    setActionError(null)
    setFormInfo(null)
    setBusyUnitId(unit.id)
    try {
      await homologateUnit(unit.id)
      setFormInfo(`Unidade ${unit.code} homologada.`)
      await loadUnits()
    } catch (error: unknown) {
      setActionError(getErrorMessage(error))
    } finally {
      setBusyUnitId(null)
    }
  }

  const openDeactivate = (unit: UnitRecord) => {
    setDeactivating(unit)
    setDeactivateReason('')
    setDeactivateError(null)
  }

  const confirmDeactivate = async () => {
    if (!deactivating) return
    if (!deactivateReason.trim()) {
      setDeactivateError('A inativação exige justificativa.')
      return
    }
    setDeactivateError(null)
    setBusyUnitId(deactivating.id)
    try {
      await deactivateUnit(deactivating.id, deactivateReason.trim())
      setFormInfo(`Unidade ${deactivating.code} inativada com justificativa registrada.`)
      setDeactivating(null)
      await loadUnits()
    } catch (error: unknown) {
      setDeactivateError(getErrorMessage(error))
    } finally {
      setBusyUnitId(null)
    }
  }

  const readOnlyMessage =
    serverPermission === 'loading'
      ? 'Verificando a permissão de escrita no servidor...'
      : serverPermission === 'unavailable'
        ? 'Não foi possível validar a permissão de escrita. O acesso foi bloqueado por segurança; você ainda pode consultar as unidades.'
        : 'Somente Engenharia/Admin podem cadastrar, homologar ou inativar unidades; seu papel tem acesso de visualização.'

  return (
    <section className="mx-auto mt-0 w-full max-w-5xl rounded-[16px] border border-mg-line bg-mg-surface p-6 shadow-[0_12px_40px_rgba(2,44,34,0.06)] sm:p-8">
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-mg-brand-soft text-mg-brand">
          <Ruler className="h-5 w-5" />
        </div>
        <div>
          <h2
            id="secao-unidades"
            ref={headingRef}
            tabIndex={-1}
            style={{ scrollMarginTop: '5rem' }}
            className="text-xl font-extrabold text-mg-ink outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mg-brand-strong"
          >
            Unidades e dimensões
          </h2>
          <p className="mt-1 text-[13px] text-mg-muted">
            Catálogo de unidades da Engenharia. Cada unidade declara sua dimensão física; somente
            unidade homologada pode ser usada em composição. Não há conversão automática entre
            unidades.
          </p>
        </div>
      </div>

      {formError && (
        <div
          className="mb-5 flex items-start gap-2.5 rounded-[12px] border-l-4 border-mg-crit bg-mg-crit-bg p-3.5 text-[13px] font-medium text-mg-crit"
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {actionError && (
        <div
          className="mb-5 flex items-start gap-2.5 rounded-[12px] border-l-4 border-mg-crit bg-mg-crit-bg p-3.5 text-[13px] font-medium text-mg-crit"
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {formInfo && (
        <div
          className="mb-5 rounded-[12px] border-l-4 border-mg-brand bg-mg-brand-soft p-3.5 text-[13px] font-medium text-mg-brand"
          role="status"
          aria-live="polite"
        >
          {formInfo}
        </div>
      )}

      <div className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[15px] font-bold text-mg-ink">Unidades cadastradas</h3>
          <button
            type="button"
            onClick={() => void loadUnits()}
            disabled={isLoadingUnits}
            className="min-h-[44px] rounded-lg border border-mg-line-strong bg-mg-surface px-4 text-sm font-semibold text-mg-brand-strong hover:bg-mg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-mg-brand disabled:opacity-60"
          >
            {isLoadingUnits ? 'Atualizando…' : 'Atualizar lista'}
          </button>
        </div>
        {isLoadingUnits ? (
          <p className="text-[13px] text-mg-muted" role="status" aria-live="polite">
            Carregando unidades…
          </p>
        ) : loadError ? (
          <div
            className="rounded-[12px] border border-mg-crit-line bg-mg-crit-bg p-4 text-sm text-mg-crit"
            role="alert"
            aria-live="assertive"
          >
            <p>Não foi possível consultar as unidades.</p>
            <p className="mt-1">{loadError}</p>
            <button
              type="button"
              onClick={() => void loadUnits()}
              className="mt-3 min-h-[44px] rounded-lg border border-mg-crit px-4 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-mg-crit"
            >
              Tentar novamente
            </button>
          </div>
        ) : units.length === 0 ? (
          <p className="text-[13px] text-mg-muted" role="status">
            Nenhuma unidade cadastrada ainda. A primeira unidade nasce como rascunho.
          </p>
        ) : (
          <div className="space-y-2" aria-label="Unidades cadastradas">
            {units.map((unit) => {
              const tone = unitStatusTone(unit.status)
              const busy = busyUnitId === unit.id
              return (
                <div
                  key={unit.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-mg-line bg-mg-surface-2 p-3.5"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-mg-ink">
                      {unit.code} · {unit.name} ·{' '}
                      <span className="font-normal text-mg-muted">
                        {DIMENSION_LABELS[unit.dimension as keyof typeof DIMENSION_LABELS] ??
                          unit.dimension}
                      </span>
                    </p>
                    {unit.status === 'inativo' && unit.inactiveReason && (
                      <p className="text-[12px] text-mg-muted">Motivo: {unit.inactiveReason}</p>
                    )}
                    {unit.status === 'homologado' && unit.homologatedAt && (
                      <p className="text-[12px] text-mg-muted">
                        Homologada em {unit.homologatedAt.slice(0, 10)}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_TONE[tone]}`}
                    >
                      {unitStatusLabel(unit.status)}
                    </span>
                    {canManageUnits && unit.status === 'rascunho' && (
                      <button
                        type="button"
                        onClick={() => void handleHomologate(unit)}
                        disabled={busy}
                        className="min-h-[40px] rounded-lg border border-mg-brand bg-mg-surface px-3 text-[12px] font-semibold text-mg-brand hover:bg-mg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-mg-brand disabled:opacity-60"
                      >
                        {busy ? 'Homologando…' : 'Homologar'}
                      </button>
                    )}
                    {canManageUnits && unit.status !== 'inativo' && (
                      <button
                        type="button"
                        onClick={() => openDeactivate(unit)}
                        disabled={busy}
                        className="min-h-[40px] rounded-lg border border-mg-line-strong bg-mg-surface px-3 text-[12px] font-semibold text-mg-muted hover:bg-mg-crit-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-mg-brand disabled:opacity-60"
                      >
                        Inativar
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {canManageUnits ? (
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" noValidate>
          <h3 className="text-[15px] font-bold text-mg-ink">Nova unidade</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass} htmlFor={UNIT_FIELD_IDS.code}>
                Código *
              </label>
              <input
                id={UNIT_FIELD_IDS.code}
                disabled={isSubmitting}
                required
                maxLength={MAX_UNIT_CODE}
                aria-invalid={errorFor(UNIT_FIELD_IDS.code) ? true : undefined}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className={fieldClass(!!errorFor(UNIT_FIELD_IDS.code))}
                placeholder="Ex.: m2"
              />
              <FieldMessage message={errorFor(UNIT_FIELD_IDS.code)} />
            </div>
            <div>
              <label className={labelClass} htmlFor={UNIT_FIELD_IDS.name}>
                Nome *
              </label>
              <input
                id={UNIT_FIELD_IDS.name}
                disabled={isSubmitting}
                required
                maxLength={MAX_UNIT_NAME}
                aria-invalid={errorFor(UNIT_FIELD_IDS.name) ? true : undefined}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={fieldClass(!!errorFor(UNIT_FIELD_IDS.name))}
                placeholder="Ex.: Metro quadrado"
              />
              <FieldMessage message={errorFor(UNIT_FIELD_IDS.name)} />
            </div>
            <div>
              <label className={labelClass} htmlFor={UNIT_FIELD_IDS.dimension}>
                Dimensão *
              </label>
              <select
                id={UNIT_FIELD_IDS.dimension}
                disabled={isSubmitting}
                required
                aria-invalid={errorFor(UNIT_FIELD_IDS.dimension) ? true : undefined}
                value={dimension}
                onChange={(event) => setDimension(event.target.value)}
                className={fieldClass(!!errorFor(UNIT_FIELD_IDS.dimension))}
              >
                <option value="">Selecione a dimensão</option>
                {UNIT_DIMENSIONS.map((value) => (
                  <option key={value} value={value}>
                    {DIMENSION_LABELS[value]}
                  </option>
                ))}
              </select>
              <FieldMessage message={errorFor(UNIT_FIELD_IDS.dimension)} />
            </div>
          </div>

          {showErrors && validation.errors.length > 0 && (
            <div
              className="rounded-[10px] border-l-4 border-mg-crit bg-mg-crit-bg p-3.5 text-[13px] text-mg-crit"
              role="alert"
              aria-live="assertive"
            >
              <p className="font-semibold">
                {validation.errors.length === 1
                  ? 'Há 1 pendência para salvar a unidade.'
                  : `Há ${validation.errors.length} pendências para salvar a unidade.`}
              </p>
              <p className="mt-1">O primeiro campo com problema recebeu foco.</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-[44px] rounded-[10px] bg-mg-brand-fill px-5 text-[13px] font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-mg-brand disabled:pointer-events-none disabled:opacity-60"
          >
            {isSubmitting ? 'Salvando...' : 'Cadastrar unidade (rascunho)'}
          </button>
        </form>
      ) : (
        <p className="text-[13px] text-mg-muted" role="status">
          {readOnlyMessage}
        </p>
      )}

      {deactivating && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inativar-titulo"
        >
          <div className="w-full max-w-md rounded-[16px] bg-mg-surface p-6">
            <h3 id="inativar-titulo" className="text-[15px] font-bold text-mg-ink">
              Inativar unidade {deactivating.code}
            </h3>
            <p className="mt-1 text-[13px] text-mg-muted">
              A unidade não é apagada; o motivo fica registrado e visível.
            </p>
            {deactivateError && (
              <p className="mt-3 text-[12px] font-medium text-mg-crit" role="alert">
                {deactivateError}
              </p>
            )}
            <label className={`${labelClass} mt-4 block`} htmlFor="unidade-inativar-motivo">
              Justificativa *
            </label>
            <textarea
              id="unidade-inativar-motivo"
              rows={3}
              maxLength={1000}
              value={deactivateReason}
              onChange={(event) => setDeactivateReason(event.target.value)}
              className="mt-1.5 w-full rounded-[10px] border border-mg-line bg-mg-surface px-3 py-2.5 text-[14px] outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
              placeholder="Explique por que esta unidade não deve mais ser usada."
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeactivating(null)}
                className="min-h-[44px] rounded-lg border border-mg-line-strong px-4 text-sm font-semibold text-mg-brand-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-mg-brand"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmDeactivate()}
                disabled={busyUnitId === deactivating.id}
                className="min-h-[44px] rounded-lg bg-mg-crit px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-700 disabled:opacity-60"
              >
                {busyUnitId === deactivating.id ? 'Inativando…' : 'Confirmar inativação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
