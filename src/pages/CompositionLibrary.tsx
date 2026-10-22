import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useCompositionDraft } from '@/contexts/CompositionDraftContext'
import { checkPermission } from '@/services/security'
import { getCatalogItems, type CatalogItemRecord } from '@/services/catalog'
import {
  createComposition,
  getCompositions,
  type CompositionListItem,
} from '@/services/compositions'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { hasPermission } from '@/lib/auth/permissions'
import type { CompositionDraftForm } from '@/lib/compositionDraft'
import {
  canSubmitCompositionForCatalog,
  catalogItemOptionLabel,
  resolveCatalogItemId,
} from '@/lib/compositionCatalog'
import { AlertTriangle, Boxes } from 'lucide-react'

type ServerPermissionState = 'loading' | 'allowed' | 'denied' | 'unavailable'

const inputClass =
  'mt-1.5 min-h-[44px] w-full rounded-[10px] border border-[#E1E8E5] bg-white px-3 text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15 disabled:bg-[#F1F5F4]'
const textAreaClass =
  'mt-1.5 w-full rounded-[10px] border border-[#E1E8E5] bg-white px-3 py-2.5 text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15 disabled:bg-[#F1F5F4]'
const labelClass = 'block text-[13px] font-semibold text-[#0F1F1C]'

export default function CompositionLibrary() {
  const { user } = useAuth()
  const location = useLocation()
  const headingRef = useRef<HTMLHeadingElement>(null)
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

  useEffect(() => {
    void loadCompositions()
    void loadCatalogItems()
  }, [loadCompositions, loadCatalogItems])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [location.pathname])

  const handleCompositionChange = <K extends keyof CompositionDraftForm>(
    field: K,
    value: CompositionDraftForm[K],
  ) => {
    setCompositionForm((previous) => ({ ...previous, [field]: value }))
    setCompositionError(null)
    setCompositionInfo(null)
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
    setCompositionError(null)
    setCompositionInfo(null)
    if (!selectedCatalogItemId) {
      setCompositionError('Selecione um item existente do catálogo antes de criar o rascunho.')
      return
    }

    setIsSubmittingComposition(true)
    const submittedForm = compositionForm
    try {
      const inputs = submittedForm.inputs_text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [name, unit] = line.split('|').map((part) => part.trim())
          return { name: name || '', unit: unit || '' }
        })
      const resources = submittedForm.resources_text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [id, unit, coefficient, source] = line.split('|').map((part) => part.trim())
          return {
            id: id || '',
            unit: unit || '',
            coefficient: coefficient || '',
            source: source || '',
          }
        })
      const result = await createComposition({
        catalog_item_id: selectedCatalogItemId,
        code: submittedForm.code,
        output_unit: submittedForm.output_unit,
        source: submittedForm.source,
        fixture_ref: submittedForm.fixture_ref,
        precision: submittedForm.precision,
        rounding: submittedForm.rounding,
        tolerance: submittedForm.tolerance,
        valid_from: submittedForm.valid_from,
        valid_until: submittedForm.valid_until,
        owner_id: user?.id || '',
        inputs,
        resources,
        formula_ast: { op: 'sum', args: [] },
      })
      const savedForm = { ...submittedForm, code: '' }
      setCompositionForm(savedForm)
      markCompositionSaved(savedForm)
      setCompositionInfo(`Rascunho criado: versão ${result.version} (status ${result.status}).`)
      await loadCompositions()
    } catch (error: unknown) {
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
    <section className="mx-auto mt-0 w-full max-w-5xl rounded-[16px] border border-[#E1E8E5] bg-white p-6 shadow-[0_12px_40px_rgba(2,44,34,0.06)] sm:p-8">
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
            Consulte versões salvas e crie novos rascunhos. Reabrir aqui significa localizar e
            consultar um rascunho persistido; edição de rascunho não faz parte desta página.
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
                    {composition.outputUnit} · vigência {composition.validFrom} a{' '}
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
        <form onSubmit={handleCompositionSubmit} className="space-y-4" noValidate>
          <label className={labelClass}>
            Item do catálogo *
            <select
              disabled={
                isSubmittingComposition ||
                isLoadingCatalogItems ||
                !!catalogItemsError ||
                catalogItems.length === 0
              }
              required
              value={compositionForm.catalog_item_id}
              onChange={(event) => handleCompositionChange('catalog_item_id', event.target.value)}
              className={inputClass}
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
          </label>

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

          <label className={labelClass}>
            Código da composição *
            <input
              disabled={isSubmittingComposition}
              required
              maxLength={64}
              value={compositionForm.code}
              onChange={(event) => handleCompositionChange('code', event.target.value)}
              className={inputClass}
              placeholder="Ex.: COMP-GEO-001"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className={labelClass}>
              Unidade de saída *
              <input
                disabled={isSubmittingComposition}
                required
                maxLength={40}
                value={compositionForm.output_unit}
                onChange={(event) => handleCompositionChange('output_unit', event.target.value)}
                className={inputClass}
                placeholder="Ex.: m³"
              />
            </label>
            <label className={labelClass}>
              Precisão *
              <input
                disabled={isSubmittingComposition}
                required
                maxLength={40}
                value={compositionForm.precision}
                onChange={(event) => handleCompositionChange('precision', event.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Tolerância *
              <input
                disabled={isSubmittingComposition}
                required
                maxLength={40}
                value={compositionForm.tolerance}
                onChange={(event) => handleCompositionChange('tolerance', event.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <label className={labelClass}>
            Fonte *
            <input
              disabled={isSubmittingComposition}
              required
              maxLength={200}
              value={compositionForm.source}
              onChange={(event) => handleCompositionChange('source', event.target.value)}
              className={inputClass}
              placeholder="Origem do contrato ou referência sintética"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Início da vigência *
              <input
                disabled={isSubmittingComposition}
                required
                type="date"
                value={compositionForm.valid_from}
                onChange={(event) => handleCompositionChange('valid_from', event.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Fim da vigência *
              <input
                disabled={isSubmittingComposition}
                required
                type="date"
                value={compositionForm.valid_until}
                onChange={(event) => handleCompositionChange('valid_until', event.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <label className={labelClass}>
            Insumos * (um por linha: nome | unidade)
            <textarea
              disabled={isSubmittingComposition}
              required
              rows={2}
              value={compositionForm.inputs_text}
              onChange={(event) => handleCompositionChange('inputs_text', event.target.value)}
              className={textAreaClass}
              placeholder={'Insumo A | m2\nInsumo B | kg'}
            />
          </label>

          <label className={labelClass}>
            Recursos * (um por linha: id | unidade | coeficiente | fonte)
            <textarea
              disabled={isSubmittingComposition}
              required
              rows={2}
              value={compositionForm.resources_text}
              onChange={(event) => handleCompositionChange('resources_text', event.target.value)}
              className={textAreaClass}
              placeholder="id do recurso | m2 | 1.5 | fonte/versão"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Referência da fixture *
              <input
                disabled={isSubmittingComposition}
                required
                maxLength={500}
                value={compositionForm.fixture_ref}
                onChange={(event) => handleCompositionChange('fixture_ref', event.target.value)}
                className={inputClass}
                placeholder="Referência à massa de teste aprovada"
              />
            </label>
            <label className={labelClass}>
              Arredondamento *
              <select
                disabled={isSubmittingComposition}
                required
                value={compositionForm.rounding}
                onChange={(event) =>
                  handleCompositionChange(
                    'rounding',
                    event.target.value as CompositionDraftForm['rounding'],
                  )
                }
                className={inputClass}
              >
                <option value="normal">Normal</option>
                <option value="up">Para cima</option>
                <option value="down">Para baixo</option>
              </select>
            </label>
          </div>

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
