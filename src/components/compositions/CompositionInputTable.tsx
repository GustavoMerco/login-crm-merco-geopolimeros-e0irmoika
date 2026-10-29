import type { CompositionFieldError, CompositionInputRow } from '@/lib/compositionRows'
import {
  MAX_INPUT_BOUND,
  MAX_INPUT_NAME,
  MAX_INPUT_UNIT,
  MAX_COMPOSITION_ROWS,
  compositionFieldId,
  errorForTarget,
  sheetParamFieldId,
} from '@/lib/compositionRows'
import { Plus, Trash2 } from 'lucide-react'
import type { TechSheetParameter } from '@/services/techSheets'

type Props = {
  rows: readonly CompositionInputRow[]
  errors: readonly CompositionFieldError[]
  disabled: boolean
  /** Parâmetros da ficha disponíveis para vincular (T2.17); vazio quando não há contexto. */
  sheetParameters: readonly TechSheetParameter[]
  onChange: (index: number, changes: Partial<CompositionInputRow>) => void
  onAdd: () => void
  onRemove: (index: number) => void
}

const cellBase =
  'min-h-[40px] w-full rounded-[8px] border bg-white px-2 text-[13px] font-normal outline-none focus:ring-4 disabled:bg-[#F1F5F4]'
const cellOk = 'border-[#E1E8E5] focus:border-[#10B981] focus:ring-[#10B981]/15'
const cellBad = 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/15'

function cellClass(hasError: boolean): string {
  return `${cellBase} ${hasError ? cellBad : cellOk}`
}

/**
 * Tabela de insumos da composição (T2.33). Uma linha por insumo, com rótulo em
 * cada coluna: nada de pipe nem texto livre para interpretar.
 *
 * T2.17: cada insumo pode ser vinculado a um parâmetro da ficha técnica por
 * nome/unidade/origem, com mínimo/máximo do vínculo visíveis na linha. Sem a
 * lista da ficha no contexto, o vínculo continua possível por entrada manual.
 */
export default function CompositionInputTable({
  rows,
  errors,
  disabled,
  sheetParameters,
  onChange,
  onAdd,
  onRemove,
}: Props) {
  const errorFor = (index: number, column: 'name' | 'unit' | 'min' | 'max') =>
    errorForTarget(errors, compositionFieldId('inputs', index, column))

  const linkErrorFor = (index: number, column: 'name' | 'unit' | 'origin' | 'min' | 'max') =>
    errorForTarget(errors, sheetParamFieldId(index, column))

  const emptyTableError = rows.every(
    (row) =>
      !row.name.trim() &&
      !row.unit.trim() &&
      !row.min.trim() &&
      !row.max.trim() &&
      !row.sheet_param,
  )
    ? errorForTarget(errors, compositionFieldId('inputs', 0, 'name'))
    : null

  return (
    <fieldset className="rounded-[12px] border border-[#E1E8E5] p-4">
      <legend className="px-1 text-[13px] font-bold text-[#0F1F1C]">
        Insumos * ({rows.length}/{MAX_COMPOSITION_ROWS})
      </legend>
      <p className="mb-3 text-[12px] text-[#5B6B66]">
        Cada insumo é uma linha. Uma linha totalmente vazia é ignorada ao salvar. O vínculo com o
        parâmetro da ficha é opcional e identifica de onde vem o valor do insumo.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-separate border-spacing-y-2 text-left">
          <thead>
            <tr className="text-[11px] font-bold uppercase tracking-wide text-[#5B6B66]">
              <th scope="col" className="px-1">
                Insumo
              </th>
              <th scope="col" className="px-1">
                Unidade
              </th>
              <th scope="col" className="px-1">
                Obrigatório
              </th>
              <th scope="col" className="px-1">
                Mínimo
              </th>
              <th scope="col" className="px-1">
                Máximo
              </th>
              <th scope="col" className="px-1">
                Parâmetro da ficha (opcional)
              </th>
              <th scope="col" className="px-1">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const nameError = errorFor(index, 'name')
              const unitError = errorFor(index, 'unit')
              const minError = errorFor(index, 'min')
              const maxError = errorFor(index, 'max')
              const link = row.sheet_param
              const linkNameError = linkErrorFor(index, 'name')
              const linkUnitError = linkErrorFor(index, 'unit')
              const linkOriginError = linkErrorFor(index, 'origin')
              const linkMinError = linkErrorFor(index, 'min')
              const linkMaxError = linkErrorFor(index, 'max')
              return (
                <tr key={row.key}>
                  <td className="px-1 align-top">
                    <label
                      className="sr-only"
                      htmlFor={compositionFieldId('inputs', index, 'name')}
                    >
                      Nome do insumo {index + 1}
                    </label>
                    <input
                      id={compositionFieldId('inputs', index, 'name')}
                      disabled={disabled}
                      maxLength={MAX_INPUT_NAME}
                      aria-invalid={nameError ? true : undefined}
                      value={row.name}
                      onChange={(event) => onChange(index, { name: event.target.value })}
                      className={cellClass(!!nameError)}
                      placeholder="Ex.: Área de aplicação"
                    />
                    {nameError && (
                      <p className="mt-1 text-[11px] font-medium text-[#B91C1C]" role="alert">
                        {nameError}
                      </p>
                    )}
                  </td>
                  <td className="px-1 align-top">
                    <label
                      className="sr-only"
                      htmlFor={compositionFieldId('inputs', index, 'unit')}
                    >
                      Unidade do insumo {index + 1}
                    </label>
                    <input
                      id={compositionFieldId('inputs', index, 'unit')}
                      disabled={disabled}
                      maxLength={MAX_INPUT_UNIT}
                      aria-invalid={unitError ? true : undefined}
                      value={row.unit}
                      onChange={(event) => onChange(index, { unit: event.target.value })}
                      className={cellClass(!!unitError)}
                      placeholder="m2"
                    />
                    {unitError && (
                      <p className="mt-1 text-[11px] font-medium text-[#B91C1C]" role="alert">
                        {unitError}
                      </p>
                    )}
                  </td>
                  <td className="px-1 align-top">
                    <label className="flex min-h-[40px] items-center gap-2 text-[12px] text-[#2C3B36]">
                      <input
                        type="checkbox"
                        disabled={disabled}
                        checked={row.required}
                        onChange={(event) => onChange(index, { required: event.target.checked })}
                        className="h-4 w-4 rounded border-[#CBD5D1] text-[#10B981] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
                      />
                      Exigido
                    </label>
                  </td>
                  <td className="px-1 align-top">
                    <label className="sr-only" htmlFor={compositionFieldId('inputs', index, 'min')}>
                      Mínimo do insumo {index + 1}
                    </label>
                    <input
                      id={compositionFieldId('inputs', index, 'min')}
                      disabled={disabled}
                      maxLength={MAX_INPUT_BOUND}
                      inputMode="decimal"
                      aria-invalid={minError ? true : undefined}
                      value={row.min}
                      onChange={(event) => onChange(index, { min: event.target.value })}
                      className={cellClass(!!minError)}
                      placeholder="0"
                    />
                    {minError && (
                      <p className="mt-1 text-[11px] font-medium text-[#B91C1C]" role="alert">
                        {minError}
                      </p>
                    )}
                  </td>
                  <td className="px-1 align-top">
                    <label className="sr-only" htmlFor={compositionFieldId('inputs', index, 'max')}>
                      Máximo do insumo {index + 1}
                    </label>
                    <input
                      id={compositionFieldId('inputs', index, 'max')}
                      disabled={disabled}
                      maxLength={MAX_INPUT_BOUND}
                      inputMode="decimal"
                      aria-invalid={maxError ? true : undefined}
                      value={row.max}
                      onChange={(event) => onChange(index, { max: event.target.value })}
                      className={cellClass(!!maxError)}
                      placeholder="Sem limite"
                    />
                    {maxError && (
                      <p className="mt-1 text-[11px] font-medium text-[#B91C1C]" role="alert">
                        {maxError}
                      </p>
                    )}
                  </td>
                  <td className="min-w-[220px] px-1 align-top">
                    <label className="sr-only" htmlFor={sheetParamFieldId(index, 'name')}>
                      Parâmetro da ficha do insumo {index + 1}
                    </label>
                    <select
                      id={sheetParamFieldId(index, 'name')}
                      disabled={disabled || sheetParameters.length === 0}
                      value={link?.name ?? ''}
                      onChange={(event) => {
                        const selected = sheetParameters.find(
                          (parameter) => parameter.name === event.target.value,
                        )
                        if (!selected) {
                          // Sem seleção: limpa o vínculo inteiro, sem inventar valor.
                          onChange(index, { sheet_param: undefined })
                          return
                        }
                        onChange(index, {
                          sheet_param: {
                            name: selected.name,
                            unit: selected.unit,
                            origin: selected.origin,
                            min: link?.min ?? '',
                            max: link?.max ?? '',
                          },
                        })
                      }}
                      className={cellClass(!!linkNameError || !!linkUnitError)}
                    >
                      <option value="">
                        {sheetParameters.length === 0
                          ? 'Sem ficha no contexto (usar entrada manual)'
                          : 'Sem vínculo com a ficha'}
                      </option>
                      {sheetParameters.map((parameter) => (
                        <option key={parameter.name} value={parameter.name}>
                          {parameter.name} · {parameter.unit} · {parameter.origin}
                        </option>
                      ))}
                    </select>
                    {sheetParameters.length === 0 && (
                      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                        <div>
                          <label
                            className="sr-only"
                            htmlFor={`${sheetParamFieldId(index, 'name')}-m`}
                          >
                            Nome manual do parâmetro do insumo {index + 1}
                          </label>
                          <input
                            id={`${sheetParamFieldId(index, 'name')}-m`}
                            disabled={disabled}
                            maxLength={MAX_INPUT_NAME}
                            aria-invalid={linkNameError ? true : undefined}
                            value={link?.name ?? ''}
                            onChange={(event) =>
                              onChange(index, {
                                sheet_param: {
                                  name: event.target.value,
                                  unit: link?.unit ?? '',
                                  origin: link?.origin ?? '',
                                  min: link?.min ?? '',
                                  max: link?.max ?? '',
                                },
                              })
                            }
                            className={cellClass(!!linkNameError)}
                            placeholder="Nome do parâmetro"
                          />
                          {linkNameError && (
                            <p className="mt-1 text-[11px] font-medium text-[#B91C1C]" role="alert">
                              {linkNameError}
                            </p>
                          )}
                        </div>
                        <div>
                          <label
                            className="sr-only"
                            htmlFor={`${sheetParamFieldId(index, 'unit')}-m`}
                          >
                            Unidade manual do parâmetro do insumo {index + 1}
                          </label>
                          <input
                            id={`${sheetParamFieldId(index, 'unit')}-m`}
                            disabled={disabled}
                            maxLength={MAX_INPUT_UNIT}
                            aria-invalid={linkUnitError ? true : undefined}
                            value={link?.unit ?? ''}
                            onChange={(event) =>
                              onChange(index, {
                                sheet_param: {
                                  name: link?.name ?? '',
                                  unit: event.target.value,
                                  origin: link?.origin ?? '',
                                  min: link?.min ?? '',
                                  max: link?.max ?? '',
                                },
                              })
                            }
                            className={cellClass(!!linkUnitError)}
                            placeholder="Unidade (ex.: m2)"
                          />
                          {linkUnitError && (
                            <p className="mt-1 text-[11px] font-medium text-[#B91C1C]" role="alert">
                              {linkUnitError}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {link && (
                      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="sr-only" htmlFor={sheetParamFieldId(index, 'origin')}>
                            Origem do parâmetro do insumo {index + 1}
                          </label>
                          <input
                            id={sheetParamFieldId(index, 'origin')}
                            disabled={disabled}
                            maxLength={MAX_INPUT_NAME}
                            aria-invalid={linkOriginError ? true : undefined}
                            value={link.origin}
                            onChange={(event) =>
                              onChange(index, {
                                sheet_param: { ...link, origin: event.target.value },
                              })
                            }
                            className={cellClass(!!linkOriginError)}
                            placeholder="Origem"
                          />
                          {linkOriginError && (
                            <p className="mt-1 text-[11px] font-medium text-[#B91C1C]" role="alert">
                              {linkOriginError}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="sr-only" htmlFor={sheetParamFieldId(index, 'min')}>
                            Mínimo do vínculo do insumo {index + 1}
                          </label>
                          <input
                            id={sheetParamFieldId(index, 'min')}
                            disabled={disabled}
                            maxLength={MAX_INPUT_BOUND}
                            inputMode="decimal"
                            aria-invalid={linkMinError ? true : undefined}
                            value={link.min}
                            onChange={(event) =>
                              onChange(index, {
                                sheet_param: { ...link, min: event.target.value },
                              })
                            }
                            className={cellClass(!!linkMinError)}
                            placeholder="Mín. vínculo"
                          />
                          {linkMinError && (
                            <p className="mt-1 text-[11px] font-medium text-[#B91C1C]" role="alert">
                              {linkMinError}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="sr-only" htmlFor={sheetParamFieldId(index, 'max')}>
                            Máximo do vínculo do insumo {index + 1}
                          </label>
                          <input
                            id={sheetParamFieldId(index, 'max')}
                            disabled={disabled}
                            maxLength={MAX_INPUT_BOUND}
                            inputMode="decimal"
                            aria-invalid={linkMaxError ? true : undefined}
                            value={link.max}
                            onChange={(event) =>
                              onChange(index, {
                                sheet_param: { ...link, max: event.target.value },
                              })
                            }
                            className={cellClass(!!linkMaxError)}
                            placeholder="Máx. vínculo"
                          />
                          {linkMaxError && (
                            <p className="mt-1 text-[11px] font-medium text-[#B91C1C]" role="alert">
                              {linkMaxError}
                            </p>
                          )}
                        </div>
                        <p className="self-center text-[11px] text-[#5B6B66]">
                          Unidade do vínculo: {link.unit || '—'}
                        </p>
                      </div>
                    )}
                  </td>
                  <td className="px-1 align-top">
                    <button
                      type="button"
                      onClick={() => onRemove(index)}
                      disabled={disabled}
                      aria-label={`Remover insumo ${index + 1}`}
                      className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-[#CBD5D1] text-[#5B6B66] hover:bg-[#FEF2F2] hover:text-[#B91C1C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 disabled:opacity-60"
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
        className="mt-2 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#CBD5D1] bg-white px-4 text-[13px] font-semibold text-[#064E3B] hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 disabled:opacity-60"
      >
        <Plus className="h-4 w-4" /> Adicionar insumo
      </button>
      {emptyTableError && (
        <p className="mt-2 text-[12px] font-medium text-[#B91C1C]" role="alert">
          {emptyTableError}
        </p>
      )}
    </fieldset>
  )
}
