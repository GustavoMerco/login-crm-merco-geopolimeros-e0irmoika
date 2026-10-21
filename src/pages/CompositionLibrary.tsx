import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { checkPermission } from '@/services/security'
import {
  createComposition,
  getCompositions,
  type CompositionListItem,
} from '@/services/compositions'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { hasPermission } from '@/lib/auth/permissions'
import { AlertTriangle, Boxes } from 'lucide-react'
import { useCompositionDraft } from '@/contexts/CompositionDraftContext'
import type { CompositionDraftForm } from '@/lib/compositionDraft'

type ServerPermissionState = 'loading' | 'allowed' | 'denied' | 'unavailable'

export default function CompositionLibrary() {
  const { user } = useAuth()
  const location = useLocation()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const { compositionForm, setCompositionForm, markCompositionSaved } = useCompositionDraft()
  const [serverPermission, setServerPermission] = useState<ServerPermissionState>('loading')
  const [compositions, setCompositions] = useState<CompositionListItem[]>([])
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

  useEffect(() => {
    void loadCompositions()
  }, [loadCompositions])

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

  const handleCompositionSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCompositionError(null)
    setCompositionInfo(null)
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
        catalog_item_id: submittedForm.catalog_item_id,
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

  const localCompositionPermission = hasPermission(user?.role, 'manageCompositions')
  const canManageCompositions = serverPermission === 'allowed' && localCompositionPermission
  const readOnlyMessage =
    serverPermission === 'loading'
      ? 'Verificando a permissão de escrita no servidor...'
      : serverPermission === 'unavailable'
        ? 'Não foi possível validar a permissão de escrita. O acesso foi bloqueado por segurança; você ainda pode consultar as versões permitidas.'
        : 'Somente Engenharia/Admin podem criar composições; seu papel tem acesso de visualização.'

  return (
    <section className="mx-auto w-full max-w-5xl mt-0 bg-white rounded-[16px] p-6 sm:p-8 border border-[#E1E8E5] shadow-[0_12px_40px_rgba(2,44,34,0.06)]">
      <div className="flex items-start gap-3 mb-6">
        <div className="w-11 h-11 rounded-[12px] bg-[#ECFDF5] text-[#047857] flex items-center justify-center shrink-0">
          <Boxes className="w-5 h-5" />
        </div>
        <div>
          <h2
            id="secao-biblioteca"
            ref={headingRef}
            tabIndex={-1}
            style={{ scrollMarginTop: '5rem' }}
            className="text-xl font-extrabold text-[#0F1F1C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#064E3B] outline-offset-2"
          >
            Biblioteca de composições
          </h2>
          <p className="text-[13px] text-[#5B6B66] mt-1">
            Consulte versões salvas e crie novos rascunhos. Reabrir aqui significa localizar e
            consultar um rascunho persistido; edição de rascunho não faz parte desta página.
          </p>
        </div>
      </div>

      {compositionError && (
        <div
          className="mb-5 p-3.5 rounded-[12px] bg-[#FEF2F2] border-l-4 border-[#DC2626] text-[#B91C1C] text-[13px] font-medium flex items-start gap-2.5"
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{compositionError}</span>
        </div>
      )}

      {compositionInfo && (
        <div
          className="mb-5 p-3.5 rounded-[12px] bg-[#ECFDF5] border-l-4 border-[#10B981] text-[#047857] text-[13px] font-medium"
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
                className="p-3.5 rounded-[12px] border border-[#E1E8E5] bg-[#F8FAF9] flex flex-wrap items-center justify-between gap-3"
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
                  className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
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
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-[13px] font-semibold text-[#0F1F1C]">
              Item do catálogo (id) *
              <input
                disabled={isSubmittingComposition}
                required
                maxLength={15}
                value={compositionForm.catalog_item_id}
                onChange={(event) => handleCompositionChange('catalog_item_id', event.target.value)}
                className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                placeholder="id catalog_items"
              />
            </label>
            <label className="block text-[13px] font-semibold text-[#0F1F1C]">
              Código da composição *
              <input
                disabled={isSubmittingComposition}
                required
                maxLength={64}
                value={compositionForm.code}
                onChange={(event) => handleCompositionChange('code', event.target.value)}
                className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                placeholder="Ex.: COMP-GEO-001"
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-[13px] font-semibold text-[#0F1F1C]">
              Unidade de saída *
              <input
                disabled={isSubmittingComposition}
                required
                maxLength={40}
                value={compositionForm.output_unit}
                onChange={(event) => handleCompositionChange('output_unit', event.target.value)}
                className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                placeholder="Ex.: m³"
              />
            </label>
            <label className="block text-[13px] font-semibold text-[#0F1F1C]">
              Precisão *
              <input
                disabled={isSubmittingComposition}
                required
                maxLength={40}
                value={compositionForm.precision}
                onChange={(event) => handleCompositionChange('precision', event.target.value)}
                className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
              />
            </label>
            <label className="block text-[13px] font-semibold text-[#0F1F1C]">
              Tolerância *
              <input
                disabled={isSubmittingComposition}
                required
                maxLength={40}
                value={compositionForm.tolerance}
                onChange={(event) => handleCompositionChange('tolerance', event.target.value)}
                className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
              />
            </label>
          </div>
          <label className="block text-[13px] font-semibold text-[#0F1F1C]">
            Fonte *
            <input
              disabled={isSubmittingComposition}
              required
              maxLength={200}
              value={compositionForm.source}
              onChange={(event) => handleCompositionChange('source', event.target.value)}
              className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
              placeholder="Origem do contrato (ex.: contrato sintético T2.3)"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-[13px] font-semibold text-[#0F1F1C]">
              Início da vigência *
              <input
                disabled={isSubmittingComposition}
                required
                type="date"
                value={compositionForm.valid_from}
                onChange={(event) => handleCompositionChange('valid_from', event.target.value)}
                className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
              />
            </label>
            <label className="block text-[13px] font-semibold text-[#0F1F1C]">
              Fim da vigência *
              <input
                disabled={isSubmittingComposition}
                required
                type="date"
                value={compositionForm.valid_until}
                onChange={(event) => handleCompositionChange('valid_until', event.target.value)}
                className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
              />
            </label>
          </div>
          <label className="block text-[13px] font-semibold text-[#0F1F1C]">
            Insumos * (um por linha: nome | unidade)
            <textarea
              disabled={isSubmittingComposition}
              required
              rows={2}
              value={compositionForm.inputs_text}
              onChange={(event) => handleCompositionChange('inputs_text', event.target.value)}
              className="mt-1.5 w-full px-3 py-2.5 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
              placeholder={'Insumo A | m2\nInsumo B | kg'}
            />
          </label>
          <label className="block text-[13px] font-semibold text-[#0F1F1C]">
            Recursos * (um por linha: id | unidade | coeficiente | fonte)
            <textarea
              disabled={isSubmittingComposition}
              required
              rows={2}
              value={compositionForm.resources_text}
              onChange={(event) => handleCompositionChange('resources_text', event.target.value)}
              className="mt-1.5 w-full px-3 py-2.5 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
              placeholder="id-do-recurso | m2 | 1.5 | contrato sintético v1"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-[13px] font-semibold text-[#0F1F1C]">
              Referência da fixture *
              <input
                disabled={isSubmittingComposition}
                required
                maxLength={500}
                value={compositionForm.fixture_ref}
                onChange={(event) => handleCompositionChange('fixture_ref', event.target.value)}
                className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                placeholder="Ex.: FIXTURE-SINTETICA-T2.3 (massa de teste)"
              />
            </label>
            <label className="block text-[13px] font-semibold text-[#0F1F1C]">
              Arredondamento *
              <select
                disabled={isSubmittingComposition}
                required
                value={compositionForm.rounding}
                onChange={(event) =>
                  handleCompositionChange(
                    'rounding',
                    event.target.value as 'normal' | 'up' | 'down',
                  )
                }
                className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
              >
                <option value="normal">Normal</option>
                <option value="up">Para cima</option>
                <option value="down">Para baixo</option>
              </select>
            </label>
          </div>
          <button
            type="submit"
            disabled={isSubmittingComposition}
            className="min-h-[44px] px-5 rounded-[10px] bg-[#10B981] text-white text-[13px] font-semibold disabled:opacity-60 disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
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
