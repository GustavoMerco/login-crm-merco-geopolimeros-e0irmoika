import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePipeline } from '@/services/pipeline'
import { formatCivil, civilDate, normalizeKey, summarizeCustomers } from '@/lib/pipeline'
import { EmptyState, Notice, PageHeader, Pill, PrimaryLink } from '@/components/crm/ui'

// Clientes derivados das oportunidades (sem cadastro novo): empresa, contatos,
// famílias atendidas e histórico. Um cadastro próprio de clientes depende de
// decisão de escopo (RF-01) e entra quando for aprovado.
export default function Clientes() {
  const { cards, isLoading, error } = usePipeline()
  const [query, setQuery] = useState('')
  const customers = useMemo(() => summarizeCustomers(cards), [cards])
  const visible = useMemo(() => {
    const key = normalizeKey(query)
    return key ? customers.filter((c) => c.key.includes(key) || c.contacts.some((p) => normalizeKey(p.name).includes(key))) : customers
  }, [customers, query])

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Trabalho"
        title="Clientes"
        description="Empresas atendidas, contatos e o andamento das propostas de cada uma."
        actions={<PrimaryLink to="/demandas?nova=1">Nova demanda</PrimaryLink>}
      />
      <label className="mb-4 block w-full text-[13px] font-semibold text-mg-ink sm:w-80">
        Buscar cliente ou contato
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="mt-1.5 min-h-[40px] w-full rounded-lg border border-mg-line-strong bg-mg-surface px-3 text-sm font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/20"
        />
      </label>
      {error && <Notice tone="crit">Não foi possível carregar os clientes: {error}</Notice>}
      {isLoading ? (
        <p role="status" className="text-sm text-mg-muted">
          Carregando…
        </p>
      ) : visible.length === 0 && !error ? (
        <EmptyState
          title={customers.length === 0 ? 'Nenhum cliente ainda' : 'Nenhum cliente encontrado'}
          description={
            customers.length === 0
              ? 'Os clientes aparecem aqui a partir das demandas registradas.'
              : 'Tente outro nome de empresa ou contato.'
          }
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((customer) => (
            <li key={customer.key} className="mg-enter">
              <Link
                to={`/funil?cliente=${encodeURIComponent(customer.key)}`}
                className="block h-full rounded-xl border border-mg-line bg-mg-surface p-5 transition-[border-color,box-shadow] duration-150 hover:border-mg-brand/50 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-mg-brand"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[15px] font-bold text-mg-ink">{customer.name}</p>
                  {customer.overdue > 0 && <Pill tone="crit">{customer.overdue} vencida(s)</Pill>}
                </div>
                <p className="mt-1 text-[12px] text-mg-muted">{customer.families.join(' · ') || 'Família não informada'}</p>
                <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-mg-line pt-3">
                  {[
                    ['Propostas', customer.total],
                    ['Em andamento', customer.open],
                    ['Enviadas', customer.sent],
                  ].map(([label, value]) => (
                    <div key={String(label)}>
                      <dt className="text-[11px] text-mg-muted">{label}</dt>
                      <dd className="mg-num text-lg font-semibold text-mg-ink">{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 truncate text-[12px] text-mg-muted">
                  {customer.contacts.map((contact) => contact.name).filter(Boolean).join(', ') || 'Sem contato registrado'}
                </p>
                <p className="mg-num mt-1 text-[11px] text-mg-muted">Última demanda {formatCivil(civilDate(customer.lastReceivedAt))}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
