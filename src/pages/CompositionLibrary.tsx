import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useCompositionDraft } from '@/contexts/CompositionDraftContext'
import { checkPermission } from '@/services/security'
import { getCatalogItems, type CatalogItemRecord } from '@/services/catalog'
import {
  createComposition,
  getCompositions,
  type CompositionListItem,
} from '@/services/compositions'
import { getUnits, type UnitRecord } from '@/services/units'
import { getTechSheets, type TechSheetParameter, type TechSheetRecord } from '@/services/techSheets'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { hasPermission } from '@/lib/auth/permissions'
import { afterCompositionSaved, type CompositionDraftForm } from '@/lib/compositionDraft'
import {
  canSubmitCompositionForCatalog,
  catalogItemOptionLabel,
  resolveCatalogItemId,
} from '@/lib/compositionCatalog'
import {
  COMPOSITION_FIELD_IDS,
  MAX_CODE,
  MAX_FIXTURE_REF,
  MAX_OUTPUT_UNIT,
  MAX_PRECISION,
  MAX_SOURCE,
  MAX_TOLERANCE,
  createInputRow,
  createResourceRow,
  errorForTarget,
  toInputPayloads,
  toResourcePayloads,
  validateCompositionDraft,
  type CompositionInputRow,
  type CompositionResourceRow,
} from '@/lib/compositionRows'
import CompositionInputTable from '@/components/compositions/CompositionInputTable'
import CompositionResourceTable from '@/components/compositions/CompositionResourceTable'
import { AlertTriangle, Boxes } from 'lucide-react'

type ServerPermissionState = 'loading' | 'allowed' | 'denied' | 'unavailable'

const inputBase =
  'mt-1.5 min-h-[44px] w-full rounded-[10px] border bg-white px-3 text-[14px] font-normal outline-none focus:ring-4 disabled:bg-[#F1F5F4]'
const inputOk = 'border-[#E1E8E5] focus:border-[#10B981] focus:ring-[#10B981]/15'
const inputBad = 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/15'
const labelClass = 'block text-[13px] font-semibold text-[#0F1F1C]'

function fieldClass(hasError: boolean): string {
  return `${inputBase} ${hasError ? inputBad : inputOk}`
}

function FieldMessage({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p className="mt-1 text-[12px] font-medium text-[#B91C1C]" role="alert">
      {message}
    </p>
  )
}

export default function CompositionLibrary() {
  const { user } = useAuth()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  // T2.17: quando há oportunidade no contexto, a lista de parâmetros da ficha
  // vem da consulta segura existente; sem contexto, o vínculo segue por texto.
  const opportunityContext = searchParams.get('oportunidade') ?? ''
  const headingRef = useRef<HTMLHeadingElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const { compositionForm, setCompositionForm, markCompositionSaved } = useCompositionDraft()
  const [serverPermission, setServerPermission] = useState<ServerPermissionState>('loading')
  const [compositions, setCompositions] = useState<CompositionListItem[]>([])
  const [catalogItems, setCatalogItems] = useState<CatalogItemRecord[]>([])
  const [isLoadingCatalogItems, setIsLoadingCatalogItems] = useState(true)
  const [catalogItemsError, setCatalogItemsError] = useState<string | null>(null)
  const [compositionError, setCompositionError] = useState<string | null>(null)
  const [compositionLoadError, setCompositionLoadError] = useState<string | null>(null)
  const [compositionInfo, setCompositionInfo] = useState<string | null>(null)
  const [isLoadingCompositions, setIsLoadingCompositions] = useState(true)
  const [isSubmittingComposition, setIsSubmittingComposition] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [sheetParameters, setSheetParameters] = useState<TechSheetParameter[]>([])
  const [sheetError, setSheetError] = useState<string | null>(null)
  const [isLoadingSheet, setIsLoadingSheet] = useState(false)
  const [units, setUnits] = useState<UnitRecord[]>([])
  const [unitsError, setUnitsError] = useState<string | null>(null)
  const [isLoadingUnits, setIsLoadingUnits] = useState(false)

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

  const loadCompositions = useCallback(async () => {
    setIsLoadingCompositions(true)
    try {
      const result = await getCompositions()
      setCompositions(result.items)
      setCompositionLoadError(null)
    } catch (error: unknown) {
      setCompositionLoadError(getErrorMessage(error))
    } finally {
      setIsLoadingCompositions(false)
    }
  }, [])

  const loadCatalogItems = useCallback(async () => {
    setIsLoadingCatalogItems(true)
    try {
      const items = await getCatalogItems()
      setCatalogItems(items)
      setCatalogItemsError(null)
    } catch (error: unknown) {
      setCatalogItemsError(getErrorMessage(error))
    } finally {
      setIsLoadingCatalogItems(false)
    }
  }, [])

  const loadSheetParameters = useCallback(async (opportunityId: string) => {
    setIsLoadingSheet(true)
    try {
      const result = await getTechSheets(opportunityId)
      const parameters: TechSheetParameter[] = []
      const seen = new Set<string>()
      // Última versão primeiro: o nome mais recente vence sem duplicar.
      for (const sheet of result.items as TechSheetRecord[]) {
        for (const parameter of sheet.parameters ?? []) {
          const key = parameter.name.toLowerCase()
          if (seen.has(key)) continue
          seen.add(key)
          parameters.push(parameter)
        }
      }
      setSheetParameters(parameters)
      setSheetError(null)
    } catch (error: unknown) {
      setSheetParameters([])
      setSheetError(getErrorMessage(error))
    } finally {
      setIsLoadingSheet(false)
    }
  }, [])

  const loadUnits = useCallback(async () => {
    setIsLoadingUnits(true)
    try {
      const result = await getUnits('homologado')
      setUnits(result.items)
      setUnitsError(null)
    } catch (error: unknown) {
      setUnits([])
      setUnitsError(getErrorMessage(error))
    } finally {
      setIsLoadingUnits(false)
    }
  }, [])

  useEffect(() => {
    void loadCompositions()
    void loadCatalogItems()
    void loadUnits()
  }, [loadCompositions, loadCatalogItems, loadUnits])

  useEffect(() => {
    if (!opportunityContext) {
      setSheetParameters([])
      setSheetError(null)
      return
    }
    void loadSheetParameters(opportunityContext)
  }, [opportunityContext, loadSheetParameters])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [location.pathname])

  const validation = validateCompositionDraft(compositionForm, catalogItems)
  const activeErrors = showErrors ? validation.errors : []
  const errorFor = (targetId: string) => errorForTarget(activeErrors, targetId)

  const clearNotices = () => {
    setCompositionError(null)
    setCompositionInfo(null)
  }

  const handleCompositionChange = <K extends keyof CompositionDraftForm>(
    field: K,
    value: CompositionDraftForm[K],
  ) => {
    setCompositionForm((previous) => ({ ...previous, [field]: value }))
    clearNotices()
  }

  const updateInputRow = (index: number, changes: Partial<CompositionInputRow>) => {
    setCompositionForm((previous) => ({
      ...previous,
      inputs: previous.inputs.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...changes } : row,
      ),
    }))
    clearNotices()
  }

  const updateResourceRow = (index: number, changes: Partial<CompositionResourceRow>) => {
    setCompositionForm((previous) => ({
      ...previous,
      resources: previous.resources.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...changes } : row,
      ),
    }))
    clearNotices()
  }

  const addInputRow = () => {
    setCompositionForm((previous) => ({
      ...previous,
      inputs: [...previous.inputs, createInputRow()],
    }))
    clearNotices()
  }

  const removeInputRow = (index: number) => {
    setCompositionForm((previous) => {
      const next = previous.inputs.filter((_, rowIndex) => rowIndex !== index)
      // A tabela nunca fica sem linha: vazio seria ambíguo para quem preenche.
      return { ...previous, inputs: next.length > 0 ? next : [createInputRow()] }
    })
    clearNotices()
  }

  const addResourceRow = () => {
    setCompositionForm((previous) => ({
      ...previous,
      resources: [...previous.resources, createResourceRow()],
    }))
    clearNotices()
  }

  const removeResourceRow = (index: number) => {
    setCompositionForm((previous) => {
      const next = previous.resources.filter((_, rowIndex) => rowIndex !== index)
      return { ...previous, resources: next.length > 0 ? next : [createResourceRow()] }
    })
    clearNotices()
  }

  const focusFirstError = (targetId: string | null) => {
    if (!targetId) return
    // Os IDs vêm de compositionFieldId (letras, números e hífen), sem aspas.
    const element = formRef.current?.querySelector<HTMLElement>(`[id="${targetId}"]`)
    if (!element) return
    element.scrollIntoView({ block: 'center', behavior: 'smooth' })
    element.focus({ preventScroll: true })
  }

  const localCompositionPermission = hasPermission(user?.role, 'manageCompositions')
  const canManageCompositions = serverPermission === 'allowed' && localCompositionPermission
  const selectedCatalogItemId = resolveCatalogItemId(catalogItems, compositionForm.catalog_item_id)
  const canSubmitComposition =
    canManageCompositions &&
    !isSubmittingComposition &&
    canSubmitCompositionForCatalog(
      { items: catalogItems, loading: isLoadingCatalogItems, error: catalogItemsError },
      compositionForm.catalog_item_id,
    )

  const handleCompositionSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearNotices()
    setShowErrors(true)

    if (!selectedCatalogItemId) {
      setCompositionError('Selecione um item existente do catálogo antes de criar o rascunho.')
      focusFirstError(COMPOSITION_FIELD_IDS.catalogItem)
      return
    }

    const check = validateCompositionDraft(compositionForm, catalogItems)
    if (!check.valid) {
      focusFirstError(check.firstTargetId)
      return
    }

    setIsSubmittingComposition(true)
    const submittedForm = compositionForm
    try {
      const result = await createComposition({
        catalog_item_id: selectedCatalogItemId,
        code: submittedForm.code.trim(),
        output_unit: submittedForm.output_unit.trim(),
        source: submittedForm.source.trim(),
        fixture_ref: submittedForm.fixture_ref.trim(),
        precision: submittedForm.precision.trim(),
        rounding: submittedForm.rounding,
        tolerance: submittedForm.tolerance.trim(),
        valid_from: submittedForm.valid_from,
        valid_until: submittedForm.valid_until,
        owner_id: user?.id || '',
        inputs: toInputPayloads(submittedForm.inputs),
        resources: toResourcePayloads(submittedForm.resources),
        formula_ast: { op: 'sum', args: [] },
      })
      const savedForm = afterCompositionSaved(submittedForm)
      setCompositionForm(savedForm)
      markCompositionSaved(savedForm)
      setShowErrors(false)
      setCompositionInfo(
        `Rascunho criado: versão ${result.version} (status ${result.status}). A composição aparece em "Versões registradas".`,
      )
      await loadCompositions()
    } catch (error: unknown) {
      // O formulário não é limpo aqui: se a API negar, nada foi salvo e o que a
      // Engenharia preencheu precisa continuar na tela.
      setCompositionError(getErrorMessage(error))
    } finally {
      setIsSubmittingComposition(false)
    }
  }

  const readOnlyMessage =
    serverPermission === 'loading'
      ? 'Verificando a permissão de escrita no servidor...'
      : serverPermission === 'unavailable'
        ? 'Não foi possível validar a permissão de escrita. O acesso foi bloqueado por segurança; você ainda pode consultar as versões permitidas.'
        : 'Somente Engenharia/Admin podem criar composições; seu papel tem acesso de visualização.'

  return (
    <section className="mx-auto mt-0 w-full max-w-6xl rounded-[16px] border border-[#E1E8E5] bg-white p-6 shadow-[0_12px_40px_rgba(2,44,34,0.06)] sm:p-8">
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#ECFDF5] text-[#047857]">
          <Boxes className="h-5 w-5" />
        </div>
        <div>
          <h2
            id="secao-biblioteca"
            ref={headingRef}
            tabIndex={-1}
            style={{ scrollMarginTop: '5rem' }}
            className="text-xl font-extrabold text-[#0F1F1C] outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#064E3B]"
          >
            Biblioteca de composições
          </h2>
          <p className="mt-1 text-[13px] text-[#5B6B66]">
            Consulte versões salvas e crie novos rascunhos. Insumos e recursos são preenchidos em
            tabelas, com o catálogo escolhido por nome; cada insumo pode ser vinculado ao parâmetro
            da ficha técnica por nome, unidade e origem. Reabrir ou editar uma versão salva ainda
            não faz parte desta página.
          </p>
        </div>
      </div>

      {compositionError && (
        <div
          className="mb-5 flex items-start gap-2.5 rounded-[12px] border-l-4 border-[#DC2626] bg-[#FEF2F2] p-3.5 text-[13px] font-medium text-[#B91C1C]"
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{compositionError}</span>
        </div>
      )}

      {compositionInfo && (
        <div
          className="mb-5 rounded-[12px] border-l-4 border-[#10B981] bg-[#ECFDF5] p-3.5 text-[13px] font-medium text-[#047857]"
          role="status"
          aria-live="polite"
        >
          {compositionInfo}
        </div>
      )}

      {compositionLoadError && !isLoadingCompositions && (
        <div
          className="mb-5 rounded-[12px] border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]"
          role="alert"
          aria-live="assertive"
        >
          <p>Não foi possível consultar as versões salvas.</p>
          <p className="mt-1">{compositionLoadError}</p>
          <button
            type="button"
            onClick={() => void loadCompositions()}
            className="mt-3 min-h-[44px] rounded-lg border border-[#B91C1C] px-4 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#991B1B]"
          >
            Tentar novamente
          </button>
        </div>
      )}

      <div className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[15px] font-bold text-[#0F1F1C]">Versões registradas</h3>
          <button
            type="button"
            onClick={() => void loadCompositions()}
            disabled={isLoadingCompositions || isSubmittingComposition}
            className="min-h-[44px] rounded-lg border border-[#CBD5D1] bg-white px-4 text-sm font-semibold text-[#064E3B] hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 disabled:opacity-60"
          >
            {isLoadingCompositions ? 'Atualizando…' : 'Atualizar versões salvas'}
          </button>
        </div>
        {isLoadingCompositions ? (
          <p className="text-[13px] text-[#5B6B66]" role="status" aria-live="polite">
            Carregando versões salvas…
          </p>
        ) : compositionLoadError ? null : compositions.length === 0 ? (
          <p className="text-[13px] text-[#5B6B66]" role="status">
            Nenhuma composição registrada ainda. O primeiro rascunho nasce como versão 1.
          </p>
        ) : (
          <div className="space-y-2" aria-label="Versões de composição salvas">
            {compositions.map((composition) => (
              <div
                key={composition.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[#E1E8E5] bg-[#F8FAF9] p-3.5"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#0F1F1C]">
                    {composition.code} · v{composition.version} ·{' '}
                    <span className="font-normal text-[#5B6B66]">{composition.family}</span>
                  </p>
                  <p className="text-[12px] text-[#5B6B66]">
                    {composition.outputUnit} · {composition.inputsCount} insumo(s) ·{' '}
                    {composition.resourcesCount} recurso(s) · vigência {composition.validFrom} a{' '}
                    {composition.validUntil} · fonte: {composition.source}
                  </p>
                </div>
                <span
                  className={`inline-block shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    composition.status === 'homologado'
                      ? 'bg-[#ECFDF5] text-[#047857]'
                      : composition.status === 'inativo'
                        ? 'bg-[#F1F5F4] text-[#5B6B66]'
                        : 'bg-[#FFF7ED] text-[#C2410C]'
                  }`}
                >
                  {composition.status === 'homologado'
                    ? 'HOMOLOGADO'
                    : composition.status === 'inativo'
                      ? 'INATIVO'
                      : 'RASCUNHO'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {canManageCompositions ? (
        <form ref={formRef} onSubmit={handleCompositionSubmit} className="space-y-5" noValidate>
          <div>
            <label className={labelClass} htmlFor={COMPOSITION_FIELD_IDS.catalogItem}>
              Item do catálogo *
            </label>
            <select
              id={COMPOSITION_FIELD_IDS.catalogItem}
              disabled={
                isSubmittingComposition ||
                isLoadingCatalogItems ||
                !!catalogItemsError ||
                catalogItems.length === 0
              }
              required
              aria-invalid={errorFor(COMPOSITION_FIELD_IDS.catalogItem) ? true : undefined}
              value={compositionForm.catalog_item_id}
              onChange={(event) => handleCompositionChange('catalog_item_id', event.target.value)}
              className={fieldClass(!!errorFor(COMPOSITION_FIELD_IDS.catalogItem))}
            >
              <option value="">
                {isLoadingCatalogItems
                  ? 'Carregando itens do catálogo…'
                  : catalogItemsError
                    ? 'Catálogo indisponível'
                    : catalogItems.length === 0
                      ? 'Nenhum item cadastrado'
                      : 'Selecione um item existente'}
              </option>
              {catalogItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {catalogItemOptionLabel(item)}
                </option>
              ))}
            </select>
            <FieldMessage message={errorFor(COMPOSITION_FIELD_IDS.catalogItem)} />
          </div>

          {catalogItemsError && (
            <div
              className="rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] p-3 text-sm text-[#991B1B]"
              role="alert"
              aria-live="assertive"
            >
              <p>Não foi possível consultar os itens do catálogo. A criação permanece bloqueada.</p>
              <p className="mt-1">{catalogItemsError}</p>
              <button
                type="button"
                onClick={() => void loadCatalogItems()}
                disabled={isLoadingCatalogItems || isSubmittingComposition}
                className="mt-2 min-h-[44px] rounded border border-[#B91C1C] px-3 font-semibold disabled:opacity-60"
              >
                Tentar carregar catálogo novamente
              </button>
            </div>
          )}
          {!catalogItemsError && !isLoadingCatalogItems && catalogItems.length === 0 && (
            <p
              className="rounded-[10px] border border-[#FED7AA] bg-[#FFF7ED] p-3 text-sm text-[#9A3412]"
              role="status"
            >
              Não há itens no catálogo para vincular. Um item de teste autorizado precisa estar
              cadastrado em uma massa isolada antes da criação da composição.
            </p>
          )}

          <div>
            <label className={labelClass} htmlFor={COMPOSITION_FIELD_IDS.code}>
              Código da composição *
            </label>
            <input
              id={COMPOSITION_FIELD_IDS.code}
              disabled={isSubmittingComposition}
              required
              maxLength={MAX_CODE}
              aria-invalid={errorFor(COMPOSITION_FIELD_IDS.code) ? true : undefined}
              value={compositionForm.code}
              onChange={(event) => handleCompositionChange('code', event.target.value)}
              className={fieldClass(!!errorFor(COMPOSITION_FIELD_IDS.code))}
              placeholder="Ex.: COMP-GEO-001"
            />
            <FieldMessage message={errorFor(COMPOSITION_FIELD_IDS.code)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelClass} htmlFor={COMPOSITION_FIELD_IDS.outputUnit}>
                Unidade de saída *
              </label>
              <input
                id={COMPOSITION_FIELD_IDS.outputUnit}
                disabled={isSubmittingComposition}
                required
                maxLength={MAX_OUTPUT_UNIT}
                aria-invalid={errorFor(COMPOSITION_FIELD_IDS.outputUnit) ? true : undefined}
                value={compositionForm.output_unit}
                onChange={(event) => handleCompositionChange('output_unit', event.target.value)}
                className={fieldClass(!!errorFor(COMPOSITION_FIELD_IDS.outputUnit))}
                placeholder="Ex.: m³"
              />
              <FieldMessage message={errorFor(COMPOSITION_FIELD_IDS.outputUnit)} />
              {unitsError ? (
                <p className="mt-1 text-[11px] text-[#9A3412]" role="status">
                  Não foi possível consultar as unidades homologadas; o servidor pode recusar a
                  unidade digitada.
                </p>
              ) : isLoadingUnits ? (
                <p className="mt-1 text-[11px] text-[#5B6B66]" role="status">
                  Carregando unidades homologadas…
                </p>
              ) : units.length === 0 ? (
                <p className="mt-1 text-[11px] text-[#9A3412]" role="status">
                  Nenhuma unidade homologada. Cadastre e homologue em /unidades antes de salvar.
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-[#5B6B66]" role="status">
                  Homologadas: {units.map((unit) => unit.code).join(', ')}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass} htmlFor={COMPOSITION_FIELD_IDS.precision}>
                Precisão *
              </label>
              <input
                id={COMPOSITION_FIELD_IDS.precision}
                disabled={isSubmittingComposition}
                required
                maxLength={MAX_PRECISION}
                aria-invalid={errorFor(COMPOSITION_FIELD_IDS.precision) ? true : undefined}
                value={compositionForm.precision}
                onChange={(event) => handleCompositionChange('precision', event.target.value)}
                className={fieldClass(!!errorFor(COMPOSITION_FIELD_IDS.precision))}
              />
              <FieldMessage message={errorFor(COMPOSITION_FIELD_IDS.precision)} />
            </div>
            <div>
              <label className={labelClass} htmlFor={COMPOSITION_FIELD_IDS.tolerance}>
                Tolerância *
              </label>
              <input
                id={COMPOSITION_FIELD_IDS.tolerance}
                disabled={isSubmittingComposition}
                required
                maxLength={MAX_TOLERANCE}
                aria-invalid={errorFor(COMPOSITION_FIELD_IDS.tolerance) ? true : undefined}
                value={compositionForm.tolerance}
                onChange={(event) => handleCompositionChange('tolerance', event.target.value)}
                className={fieldClass(!!errorFor(COMPOSITION_FIELD_IDS.tolerance))}
              />
              <FieldMessage message={errorFor(COMPOSITION_FIELD_IDS.tolerance)} />
            </div>
            <div>
              <label className={labelClass} htmlFor={COMPOSITION_FIELD_IDS.validFrom}>
                Início da vigência *
              </label>
              <input
                id={COMPOSITION_FIELD_IDS.validFrom}
                disabled={isSubmittingComposition}
                required
                type="date"
                aria-invalid={errorFor(COMPOSITION_FIELD_IDS.validFrom) ? true : undefined}
                value={compositionForm.valid_from}
                onChange={(event) => handleCompositionChange('valid_from', event.target.value)}
                className={fieldClass(!!errorFor(COMPOSITION_FIELD_IDS.validFrom))}
              />
              <FieldMessage message={errorFor(COMPOSITION_FIELD_IDS.validFrom)} />
            </div>
            <div>
              <label className={labelClass} htmlFor={COMPOSITION_FIELD_IDS.validUntil}>
                Fim da vigência *
              </label>
              <input
                id={COMPOSITION_FIELD_IDS.validUntil}
                disabled={isSubmittingComposition}
                required
                type="date"
                aria-invalid={errorFor(COMPOSITION_FIELD_IDS.validUntil) ? true : undefined}
                value={compositionForm.valid_until}
                onChange={(event) => handleCompositionChange('valid_until', event.target.value)}
                className={fieldClass(!!errorFor(COMPOSITION_FIELD_IDS.validUntil))}
              />
              <FieldMessage message={errorFor(COMPOSITION_FIELD_IDS.validUntil)} />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor={COMPOSITION_FIELD_IDS.source}>
              Fonte *
            </label>
            <input
              id={COMPOSITION_FIELD_IDS.source}
              disabled={isSubmittingComposition}
              required
              maxLength={MAX_SOURCE}
              aria-invalid={errorFor(COMPOSITION_FIELD_IDS.source) ? true : undefined}
              value={compositionForm.source}
              onChange={(event) => handleCompositionChange('source', event.target.value)}
              className={fieldClass(!!errorFor(COMPOSITION_FIELD_IDS.source))}
              placeholder="Origem do contrato ou referência sintética"
            />
            <FieldMessage message={errorFor(COMPOSITION_FIELD_IDS.source)} />
          </div>

          {!opportunityContext && (
            <p
              className="rounded-[10px] border border-[#E1E8E5] bg-[#F8FAF9] p-3 text-sm text-[#5B6B66]"
              role="status"
            >
              Esta página foi aberta sem oportunidade no contexto, então o seletor não lista os
              parâmetros da ficha. Preencha o vínculo manualmente (nome e unidade na linha do
              insumo) ou abra a Biblioteca com ?oportunidade=&lt;id&gt; para carregar os parâmetros
              reais da demanda.
            </p>
          )}
          {opportunityContext && sheetError && (
            <div
              className="rounded-[10px] border border-[#FED7AA] bg-[#FFF7ED] p-3 text-sm text-[#9A3412]"
              role="alert"
              aria-live="assertive"
            >
              <p>
                Não foi possível consultar os parâmetros da ficha desta oportunidade. O vínculo
                permanece disponível como texto validado; a lista suspensa volta quando a consulta
                funcionar.
              </p>
              <p className="mt-1">{sheetError}</p>
              <button
                type="button"
                onClick={() => void loadSheetParameters(opportunityContext)}
                disabled={isLoadingSheet || isSubmittingComposition}
                className="mt-2 min-h-[44px] rounded border border-[#B45309] px-3 font-semibold disabled:opacity-60"
              >
                Tentar consultar a ficha novamente
              </button>
            </div>
          )}
          {opportunityContext && !sheetError && isLoadingSheet && (
            <p className="text-[12px] text-[#5B6B66]" role="status" aria-live="polite">
              Carregando parâmetros da ficha da oportunidade…
            </p>
          )}
          {opportunityContext && !sheetError && !isLoadingSheet && sheetParameters.length === 0 && (
            <p
              className="rounded-[10px] border border-[#FED7AA] bg-[#FFF7ED] p-3 text-sm text-[#9A3412]"
              role="status"
            >
              Esta oportunidade ainda não tem ficha técnica com parâmetros. O vínculo fica para
              quando a ficha existir; ausência de dado é pendência, não zero.
            </p>
          )}

          <CompositionInputTable
            rows={compositionForm.inputs}
            errors={activeErrors}
            disabled={isSubmittingComposition}
            sheetParameters={sheetParameters}
            onChange={updateInputRow}
            onAdd={addInputRow}
            onRemove={removeInputRow}
          />

          <CompositionResourceTable
            rows={compositionForm.resources}
            errors={activeErrors}
            catalogItems={catalogItems}
            isLoadingCatalog={isLoadingCatalogItems}
            disabled={isSubmittingComposition}
            onChange={updateResourceRow}
            onAdd={addResourceRow}
            onRemove={removeResourceRow}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor={COMPOSITION_FIELD_IDS.fixtureRef}>
                Caso de referência (referência documental assinada) *
              </label>
              <input
                id={COMPOSITION_FIELD_IDS.fixtureRef}
                disabled={isSubmittingComposition}
                required
                maxLength={MAX_FIXTURE_REF}
                aria-invalid={errorFor(COMPOSITION_FIELD_IDS.fixtureRef) ? true : undefined}
                aria-describedby="composicao-referencia-ajuda"
                value={compositionForm.fixture_ref}
                onChange={(event) => handleCompositionChange('fixture_ref', event.target.value)}
                className={fieldClass(!!errorFor(COMPOSITION_FIELD_IDS.fixtureRef))}
                placeholder="Ex.: docs/fixtures/COMP-GEO-001.v1.assinada.pdf"
              />
              <p id="composicao-referencia-ajuda" className="mt-1 text-[11px] text-[#5B6B66]">
                O sistema não escolhe nem cria esse caso por você. Sem uma referência verificável
                fornecida pela Engenharia, o rascunho não é salvo, e nada é registrado em nome de
                uma referência fictícia.
              </p>
              <FieldMessage message={errorFor(COMPOSITION_FIELD_IDS.fixtureRef)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="composicao-arredondamento">
                Arredondamento *
              </label>
              <select
                id="composicao-arredondamento"
                disabled={isSubmittingComposition}
                required
                value={compositionForm.rounding}
                onChange={(event) =>
                  handleCompositionChange(
                    'rounding',
                    event.target.value as CompositionDraftForm['rounding'],
                  )
                }
                className={`${inputBase} ${inputOk}`}
              >
                <option value="normal">Normal</option>
                <option value="up">Para cima</option>
                <option value="down">Para baixo</option>
              </select>
              <p className="mt-1 text-[11px] text-[#5B6B66]">
                Opções do contrato atual do servidor (normal, up, down).
              </p>
            </div>
          </div>

          {showErrors && validation.errors.length > 0 && (
            <div
              className="rounded-[10px] border-l-4 border-[#DC2626] bg-[#FEF2F2] p-3.5 text-[13px] text-[#B91C1C]"
              role="alert"
              aria-live="assertive"
            >
              <p className="font-semibold">
                {validation.errors.length === 1
                  ? 'Há 1 pendência para salvar o rascunho.'
                  : `Há ${validation.errors.length} pendências para salvar o rascunho.`}
              </p>
              <p className="mt-1">
                O primeiro campo com problema recebeu foco. Nada foi enviado ao servidor.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmitComposition}
            className="min-h-[44px] rounded-[10px] bg-[#10B981] px-5 text-[13px] font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 disabled:pointer-events-none disabled:opacity-60"
          >
            {isSubmittingComposition ? 'Salvando...' : 'Criar rascunho (v1)'}
          </button>
        </form>
      ) : (
        <p className="text-[13px] text-[#5B6B66]" role="status">
          {readOnlyMessage}
        </p>
      )}
    </section>
  )
}
