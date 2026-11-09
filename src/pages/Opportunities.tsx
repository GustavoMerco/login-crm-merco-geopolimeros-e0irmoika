import React, { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { createOpportunity, type CreateOpportunityInput } from '@/services/opportunities'
import { usePipeline } from '@/services/pipeline'
import { usePermissions } from '@/contexts/PermissionsContext'
import { cardUrl, civilDate, familiesOf, filterCards, formatCivil } from '@/lib/pipeline'
import {
  Button,
  DeadlinePill,
  EmptyState,
  Notice,
  PageHeader,
  Panel,
  StagePill,
} from '@/components/crm/ui'

// Demandas (RF-01): cadastro da demanda recebida e lista de todas as
// oportunidades com etapa e prazo. O detalhe é o card da oportunidade. O
// registro do recebimento é feito pelo servidor (início do relógio do K1).
const inputClass =
  'mt-1.5 min-h-[40px] w-full rounded-lg border border-mg-line-strong bg-mg-surface px-3 text-sm font-normal text-mg-ink outline-none placeholder:text-mg-muted focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/20'
const labelClass = 'block text-[13px] font-semibold text-mg-ink'

const EMPTY: CreateOpportunityInput = {
  customer_name: '',
  contact_name: '',
  contact_email: '',
  origin: '',
  service_family: '',
  location: '',
  demand_date: '',
  deadline_date: '',
}

const ORIGINS = [
  'Indicação',
  'Cliente da carteira',
  'Portal do cliente (Ariba, ME…)',
  'Licitação',
  'Site / contato direto',
]

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className={labelClass}>
      {label}
      {children}
      {hint && <span className="mt-1 block text-[12px] font-normal text-mg-muted">{hint}</span>}
    </label>
  )
}

function NewDemandForm({ families, onCancel }: { families: string[]; onCancel: () => void }) {
  const navigate = useNavigate()
  const [form, setForm] = useState<CreateOpportunityInput>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const set =
    (field: keyof CreateOpportunityInput) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }))
      setError(null)
    }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await createOpportunity({
        ...form,
        contact_email: form.contact_email?.trim() || undefined,
        deadline_date: form.deadline_date || undefined,
      })
      navigate(cardUrl(result.id))
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Panel title="Nova demanda" eyebrow="Registro do recebimento">
      <form onSubmit={(event) => void submit(event)} className="space-y-6">
        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className="mg-eyebrow mb-3 text-mg-muted">Cliente e contato</legend>
          <Field label="Cliente">
            <input
              className={inputClass}
              value={form.customer_name}
              onChange={set('customer_name')}
              required
              placeholder="Empresa e unidade"
            />
          </Field>
          <Field label="Contato">
            <input
              className={inputClass}
              value={form.contact_name}
              onChange={set('contact_name')}
              required
              placeholder="Quem pediu a proposta"
            />
          </Field>
          <Field label="E-mail do contato" hint="Opcional.">
            <input
              className={inputClass}
              type="email"
              value={form.contact_email}
              onChange={set('contact_email')}
            />
          </Field>
        </fieldset>
        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className="mg-eyebrow mb-3 text-mg-muted">Serviço e local</legend>
          <Field label="Família de serviço">
            <input
              className={inputClass}
              value={form.service_family}
              onChange={set('service_family')}
              required
              list="familias-servico"
              placeholder="Ex.: Nivelamento de pisos"
            />
            <datalist id="familias-servico">
              {families.map((family) => (
                <option key={family} value={family} />
              ))}
            </datalist>
          </Field>
          <Field label="Local da obra">
            <input
              className={inputClass}
              value={form.location}
              onChange={set('location')}
              required
              placeholder="Cidade/UF"
            />
          </Field>
          <Field label="Origem">
            <input
              className={inputClass}
              value={form.origin}
              onChange={set('origin')}
              required
              list="origens-demanda"
            />
            <datalist id="origens-demanda">
              {ORIGINS.map((origin) => (
                <option key={origin} value={origin} />
              ))}
            </datalist>
          </Field>
        </fieldset>
        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className="mg-eyebrow mb-3 text-mg-muted">Datas</legend>
          <Field label="Data da demanda" hint="Quando o cliente pediu.">
            <input
              className={`${inputClass} mg-num`}
              type="date"
              value={form.demand_date}
              onChange={set('demand_date')}
              required
            />
          </Field>
          <Field
            label="Prazo do cliente"
            hint="Opcional, mas é o que alimenta os alertas de prazo."
          >
            <input
              className={`${inputClass} mg-num`}
              type="date"
              value={form.deadline_date}
              onChange={set('deadline_date')}
            />
          </Field>
          <p className="self-center text-[12px] text-mg-muted">
            O recebimento é registrado pelo servidor no momento do cadastro e inicia a medição do
            tempo até o envio.
          </p>
        </fieldset>
        {error && <Notice tone="crit">{error}</Notice>}
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-[40px] items-center rounded-lg bg-mg-action px-4 text-sm font-semibold text-white hover:bg-mg-action-hover disabled:opacity-60"
          >
            {isSubmitting ? 'Registrando…' : 'Registrar demanda e abrir'}
          </button>
          <Button variant="quiet" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </Panel>
  )
}

export default function Opportunities() {
  const location = useLocation()
  const { can } = usePermissions()
  const { cards, isLoading, error } = usePipeline()
  const [isFormOpen, setIsFormOpen] = useState(
    () => new URLSearchParams(location.search).get('nova') === '1',
  )
  const [query, setQuery] = useState('')
  const families = useMemo(() => familiesOf(cards), [cards])
  const visible = useMemo(
    () => filterCards(cards, { query, family: '', customerKey: '' }),
    [cards, query],
  )
  const canCreate = can('demandas', 'create')

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Trabalho"
        title="Demandas"
        description="Registre a demanda assim que o cliente pedir a proposta. Cada demanda vira uma oportunidade no funil."
        actions={
          canCreate && !isFormOpen ? (
            <Button variant="primary" onClick={() => setIsFormOpen(true)}>
              Nova demanda
            </Button>
          ) : undefined
        }
      />

      {isFormOpen && canCreate && (
        <NewDemandForm families={families} onCancel={() => setIsFormOpen(false)} />
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className={`${labelClass} w-full sm:w-80`}>
          Buscar
          <input
            type="search"
            className={inputClass}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cliente, contato, família, local…"
          />
        </label>
        <Link to="/funil" className="text-sm font-semibold text-mg-brand underline">
          Ver como funil
        </Link>
      </div>

      {error && <Notice tone="crit">Não foi possível carregar as demandas: {error}</Notice>}
      {isLoading ? (
        <p role="status" className="text-sm text-mg-muted">
          Carregando demandas…
        </p>
      ) : visible.length === 0 && !error ? (
        <EmptyState
          title={cards.length === 0 ? 'Nenhuma demanda registrada' : 'Nada encontrado'}
          description={
            cards.length === 0
              ? 'Registre a primeira demanda recebida.'
              : 'Tente outro termo de busca.'
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-mg-line bg-mg-surface">
          <table className="w-full min-w-[760px] text-left text-sm">
            <caption className="sr-only">Demandas registradas</caption>
            <thead className="border-b border-mg-line bg-mg-surface-2">
              <tr>
                {['Cliente', 'Família', 'Etapa', 'Prazo', 'Recebida em'].map((head) => (
                  <th key={head} scope="col" className="mg-eyebrow px-4 py-3 text-mg-muted">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-mg-line">
              {visible.map((card) => (
                <tr key={card.opportunity.id} className="hover:bg-mg-surface-2">
                  <td className="px-4 py-3">
                    <Link
                      to={cardUrl(card.opportunity.id)}
                      className="font-bold text-mg-ink hover:text-mg-brand hover:underline"
                    >
                      {card.opportunity.customer_name}
                    </Link>
                    <span className="block text-[12px] text-mg-muted">
                      {card.opportunity.contact_name} · {card.opportunity.location}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-mg-ink">{card.opportunity.service_family}</td>
                  <td className="px-4 py-3">
                    <StagePill stage={card.stage} />
                  </td>
                  <td className="px-4 py-3">
                    <DeadlinePill deadline={card.deadline} />
                  </td>
                  <td className="mg-num px-4 py-3 text-[13px] text-mg-muted">
                    {formatCivil(civilDate(card.opportunity.received_at))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
