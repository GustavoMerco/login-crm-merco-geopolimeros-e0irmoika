import { useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usePipeline } from '@/services/pipeline'
import { computeMetrics, summarizeCustomers } from '@/lib/pipeline'
import {
  EmptyState,
  Kpi,
  Notice,
  PageHeader,
  PrimaryLink,
  SecondaryLink,
} from '@/components/crm/ui'

// "Início" (/dashboard): tela de entrada do sistema com a saudação do usuário e
// o resumo do trabalho. Clientes e propostas vêm dos dados reais do funil
// (oportunidades); Projetos e Receita ainda não têm coleção no backend — o card
// aparece com "—" e o aviso de módulo em construção, sem número inventado.
function greeting(now = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'America/Sao_Paulo',
    }).format(now),
  )
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function todayLabel(now = new Date()): string {
  return now.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export default function DashboardHome() {
  const { user } = useAuth()
  const { cards, isLoading, error, partialWarnings } = usePipeline()

  const metrics = useMemo(() => computeMetrics(cards), [cards])
  const activeCustomers = useMemo(
    () => summarizeCustomers(cards).filter((customer) => customer.open > 0).length,
    [cards],
  )

  const firstName = (user?.name || '').split(' ')[0]

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow={todayLabel()}
        title={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
        description="Resumo do trabalho da equipe na Merco Geopolímeros."
        actions={
          <>
            <SecondaryLink to="/demandas">Ver demandas</SecondaryLink>
            <PrimaryLink to="/demandas?nova=1">Nova demanda</PrimaryLink>
          </>
        }
      />

      {error && <Notice tone="crit">Não foi possível carregar o resumo: {error}</Notice>}
      {partialWarnings.map((warning) => (
        <div key={warning} className="mb-3">
          <Notice tone="warn">{warning}</Notice>
        </div>
      ))}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Clientes ativos"
          value={String(activeCustomers)}
          hint="Com pelo menos uma proposta em andamento."
        />
        <Kpi
          label="Propostas abertas"
          value={String(metrics.open)}
          hint="Oportunidades ainda não enviadas ou decididas."
        />
        <Kpi
          label="Projetos em andamento"
          value="—"
          hint="Módulo de obras em construção; nada a exibir ainda."
        />
        <Kpi
          label="Receita do mês"
          value="—"
          hint="Faturamento entra com a fase de custos e aprovação."
        />
      </div>

      <div className="mt-8">
        {isLoading ? (
          <p role="status" className="text-sm text-mg-muted">
            Carregando…
          </p>
        ) : !error && cards.length === 0 ? (
          <EmptyState
            title="Nenhum trabalho registrado ainda"
            description="Registre a primeira demanda recebida de um cliente; o resumo se monta a partir dela."
            action={<PrimaryLink to="/demandas?nova=1">Registrar demanda</PrimaryLink>}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-mg-line bg-mg-surface p-5">
              <p className="mg-eyebrow text-mg-muted">Agora</p>
              <p className="mt-2 text-[14px] leading-relaxed text-mg-ink">
                {metrics.overdue > 0 ? (
                  <>
                    <span className="mg-num font-bold text-mg-crit">{metrics.overdue}</span>{' '}
                    proposta(s) com prazo vencido pedem atenção hoje.
                  </>
                ) : (
                  'Nenhum prazo vencido no momento.'
                )}
              </p>
              <div className="mt-4">
                <PrimaryLink to="/hoje">Abrir fila de hoje</PrimaryLink>
              </div>
            </div>
            <div className="rounded-xl border border-mg-line bg-mg-surface p-5">
              <p className="mg-eyebrow text-mg-muted">Funil</p>
              <p className="mt-2 text-[14px] leading-relaxed text-mg-ink">
                <span className="mg-num font-bold">{metrics.total}</span> oportunidade(s) no funil,
                <span className="mg-num font-bold"> {metrics.sentCount}</span> já enviada(s) ao
                cliente.
              </p>
              <div className="mt-4">
                <SecondaryLink to="/funil">Ver funil de propostas</SecondaryLink>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
