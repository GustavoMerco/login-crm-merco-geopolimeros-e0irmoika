import type { CatalogItemRecord } from '@/services/catalog'
import type { CompositionFieldError, CompositionResourceRow } from '@/lib/compositionRows'
import {
  MAX_COMPOSITION_ROWS,
  MAX_RESOURCE_SOURCE,
  MAX_RESOURCE_UNIT,
  compositionFieldId,
  errorForTarget,
  resourceOptionLabel,
} from '@/lib/compositionRows'
import { Plus, Trash2 } from 'lucide-react'

type Props = {
  rows: readonly CompositionResourceRow[]
  errors: readonly CompositionFieldError[]
  catalogItems: readonly CatalogItemRecord[]
  isLoadingCatalog: boolean
  disabled: boolean
  onChange: (index: number, changes: Partial<CompositionResourceRow>) => void
  onAdd: () => void
  onRemove: (index: number) => void
}

const cellBase =
  'min-h-[40px] w-full rounded-[8px] border bg-mg-surface px-2 text-[13px] font-normal outline-none focus:ring-4 disabled:bg-mg-surface-2'
const cellOk = 'border-mg-line focus:border-mg-brand focus:ring-mg-brand/15'
const cellBad = 'border-mg-crit focus:border-mg-crit focus:ring-mg-crit/15'

function cellClass(hasError: boolean): string {
  return `${cellBase} ${hasError ? cellBad : cellOk}`
}

/**
 * Tabela de recursos da composição (T2.33). O recurso é escolhido pelo nome no
 * catálogo; o identificador interno vai por baixo e nunca é digitado.
 */
export default function CompositionResourceTable({
  rows,
  errors,
  catalogItems,
  isLoadingCatalog,
  disabled,
  onChange,
  onAdd,
  onRemove,
}: Props) {
  const errorFor = (index: number, column: 'catalog_item_id' | 'unit' | 'coefficient' | 'source') =>
    errorForTarget(errors, compositionFieldId('resources', index, column))

  const emptyTableError = rows.every(
    (row) =>
      !row.catalog_item_id.trim() &&
      !row.unit.trim() &&
      !row.coefficient.trim() &&
      !row.source.trim(),
  )
    ? errorForTarget(errors, compositionFieldId('resources', 0, 'catalog_item_id'))
    : null

  return (
    <fieldset className="rounded-[12px] border border-mg-line p-4">
      <legend className="px-1 text-[13px] font-bold text-mg-ink">
        Recursos * ({rows.length}/{MAX_COMPOSITION_ROWS})
      </legend>
      <p className="mb-3 text-[12px] text-mg-muted">
        Escolha o recurso pelo nome no catálogo. O identificador interno é preenchido pela página —
        não é digitado.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[840px] border-separate border-spacing-y-2 text-left">
          <thead>
            <tr className="text-[11px] font-bold uppercase tracking-wide text-mg-muted">
              <th scope="col" className="px-1">
                Recurso
              </th>
              <th scope="col" className="px-1">
                Unidade
              </th>
              <th scope="col" className="px-1">
                Coeficiente
              </th>
              <th scope="col" className="px-1">
                Fonte/versão
              </th>
              <th scope="col" className="px-1">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const itemError = errorFor(index, 'catalog_item_id')
              const unitError = errorFor(index, 'unit')
              const coefficientError = errorFor(index, 'coefficient')
              const sourceError = errorFor(index, 'source')
              return (
                <tr key={row.key}>
                  <td className="px-1 align-top">
                    <label
                      className="sr-only"
                      htmlFor={compositionFieldId('resources', index, 'catalog_item_id')}
                    >
                      Recurso {index + 1}
                    </label>
                    <select
                      id={compositionFieldId('resources', index, 'catalog_item_id')}
                      disabled={disabled || isLoadingCatalog}
                      aria-invalid={itemError ? true : undefined}
                      value={row.catalog_item_id}
                      onChange={(event) => {
                        const chosen = catalogItems.find((item) => item.id === event.target.value)
                        onChange(index, {
                          catalog_item_id: event.target.value,
                          // Sugere unidade e fonte do catálogo quando o campo
                          // ainda está vazio; o usuário continua podendo corrigir.
                          unit: chosen && !row.unit.trim() ? chosen.unit : row.unit,
                          source: chosen && !row.source.trim() ? chosen.source : row.source,
                        })
                      }}
                      className={cellClass(!!itemError)}
                    >
                      <option value="">
                        {isLoadingCatalog ? 'Carregando…' : 'Selecione o recurso'}
                      </option>
                      {catalogItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {resourceOptionLabel(item)}
                        </option>
                      ))}
                    </select>
                    {itemError && (
                      <p className="mt-1 text-[11px] font-medium text-mg-crit" role="alert">
                        {itemError}
                      </p>
                    )}
                  </td>
                  <td className="px-1 align-top">
                    <label
                      className="sr-only"
                      htmlFor={compositionFieldId('resources', index, 'unit')}
                    >
                      Unidade do recurso {index + 1}
                    </label>
                    <input
                      id={compositionFieldId('resources', index, 'unit')}
                      disabled={disabled}
                      maxLength={MAX_RESOURCE_UNIT}
                      aria-invalid={unitError ? true : undefined}
                      value={row.unit}
                      onChange={(event) => onChange(index, { unit: event.target.value })}
                      className={cellClass(!!unitError)}
                      placeholder="m3"
                    />
                    {unitError && (
                      <p className="mt-1 text-[11px] font-medium text-mg-crit" role="alert">
                        {unitError}
                      </p>
                    )}
                  </td>
                  <td className="px-1 align-top">
                    <label
                      className="sr-only"
                      htmlFor={compositionFieldId('resources', index, 'coefficient')}
                    >
                      Coeficiente do recurso {index + 1}
                    </label>
                    <input
                      id={compositionFieldId('resources', index, 'coefficient')}
                      disabled={disabled}
                      inputMode="decimal"
                      aria-invalid={coefficientError ? true : undefined}
                      value={row.coefficient}
                      onChange={(event) => onChange(index, { coefficient: event.target.value })}
                      className={cellClass(!!coefficientError)}
                      placeholder="1.5"
                    />
                    {coefficientError && (
                      <p className="mt-1 text-[11px] font-medium text-mg-crit" role="alert">
                        {coefficientError}
                      </p>
                    )}
                  </td>
                  <td className="px-1 align-top">
                    <label
                      className="sr-only"
                      htmlFor={compositionFieldId('resources', index, 'source')}
                    >
                      Fonte do recurso {index + 1}
                    </label>
                    <input
                      id={compositionFieldId('resources', index, 'source')}
                      disabled={disabled}
                      maxLength={MAX_RESOURCE_SOURCE}
                      aria-invalid={sourceError ? true : undefined}
                      value={row.source}
                      onChange={(event) => onChange(index, { source: event.target.value })}
                      className={cellClass(!!sourceError)}
                      placeholder="Fonte/versão homologada"
                    />
                    {sourceError && (
                      <p className="mt-1 text-[11px] font-medium text-mg-crit" role="alert">
                        {sourceError}
                      </p>
                    )}
                  </td>
                  <td className="px-1 align-top">
                    <button
                      type="button"
                      onClick={() => onRemove(index)}
                      disabled={disabled}
                      aria-label={`Remover recurso ${index + 1}`}
                      className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-mg-line-strong text-mg-muted hover:bg-mg-crit-bg hover:text-mg-crit focus-visible:outline focus-visible:outline-2 focus-visible:outline-mg-brand disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled || rows.length >= MAX_COMPOSITION_ROWS}
        className="mt-2 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-mg-line-strong bg-mg-surface px-4 text-[13px] font-semibold text-mg-brand-strong hover:bg-mg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-mg-brand disabled:opacity-60"
      >
        <Plus className="h-4 w-4" /> Adicionar recurso
      </button>
      {emptyTableError && (
        <p className="mt-2 text-[12px] font-medium text-mg-crit" role="alert">
          {emptyTableError}
        </p>
      )}
    </fieldset>
  )
}
