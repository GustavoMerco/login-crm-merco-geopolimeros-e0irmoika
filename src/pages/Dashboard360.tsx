import { useMemo } from 'react'
import { usePipeline } from '@/services/pipeline'
import { STAGES, computeMetrics } from '@/lib/pipeline'
import { Kpi, Notice, PageHeader, Panel, SecondaryLink } from '@/components/crm/ui'

// Painel de gestão: volume por etapa, prazos e tempo até o envio. Os números
// são uma amostra do que está registrado no sistema e NÃO substituem o
// baseline nem os indicadores contratuais K1–K3, que dependem da Fase 1/2.
const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 })

export default function Dashboard360() {
  const { cards, isLoading, error } = usePipeline()
  const metrics = useMemo(() => computeMetrics(cards), [cards])
  const maxStage = Math.max(1, ...Object.values(metrics.byStage))
  const families = useMemo(() => {
    const map = new Map<string, number>()
    for (const card of cards) map.set(card.opportunity.service_family || 'Sem família', (map.get(card.opportunity.service_family || 'Sem família') ?? 0) + 1)
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [cards])

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Gestão"
        title="Painel"
        description="Como as propostas estão andando. Amostra do que está registrado no sistema — não substitui o baseline nem os indicadores contratuais."
        actions={<SecondaryLink to="/funil">Abrir funil</SecondaryLink>}
      />
      {error && <Notice tone="crit">Não foi possível carregar o painel: {error}</Notice>}
      {isLoading ? (
        <p role="status" className="text-sm text-mg-muted">
          Carregando…
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-4">
          <Kpi label="Oportunidades" value={String(metrics.total)} hint={`${metrics.open} em andamento, ${metrics.byStage.enviada} aguardando resposta.`} />
          <Kpi label="Prazo vencido" value={String(metrics.overdue)} hint="Em andamento e já fora do prazo do cliente." />
          <Kpi
            label="Tempo até o envio"
            value={metrics.avgDaysToSend === null ? '—' : number.format(metrics.avgDaysToSend)}
            unit={metrics.avgDaysToSend === null ? undefined : 'dias'}
            hint={metrics.sentCount > 0 ? `Média de ${metrics.sentCount} proposta(s) enviada(s), da demanda ao envio.` : 'Aparece quando houver propostas enviadas.'}
          />
          <Kpi
            label="Enviadas no prazo"
            value={metrics.onTimeRate === null ? '—' : percent.format(metrics.onTimeRate)}
            hint={metrics.sentWithDeadline > 0 ? `${metrics.sentOnTime} de ${metrics.sentWithDeadline} com prazo informado.` : 'Aparece quando houver envios com prazo informado.'}
          />

          <Kpi
            label="Taxa de ganho"
            value={metrics.winRate === null ? '—' : percent.format(metrics.winRate)}
            hint={metrics.won + metrics.lost > 0 ? `${metrics.won} ganha(s) e ${metrics.lost} perdida(s).` : 'Aparece quando houver desfechos registrados.'}
          />
          <Panel title="Motivos de perda" className="lg:col-span-3">
            {metrics.lossReasons.length === 0 ? (
              <p className="text-sm text-mg-muted">Nenhuma perda registrada.</p>
            ) : (
              <ul className="space-y-2">
                {metrics.lossReasons.map((item) => (
                  <li key={item.reason} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="text-mg-ink">{item.reason}</span>
                    <span className="mg-num text-mg-muted">{item.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Oportunidades por etapa" className="lg:col-span-3">
            <ul className="space-y-2.5">
              {STAGES.map((stage) => (
                <li key={stage.id} className="grid grid-cols-[140px_1fr_40px] items-center gap-3">
                  <span className="text-[13px] text-mg-ink">{stage.label}</span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-mg-surface-2">
                    <span
                      className={`block h-full rounded-full ${stage.id === 'ganha' ? 'bg-mg-ok' : stage.id === 'perdida' ? 'bg-mg-crit' : stage.id === 'qualificacao' ? 'bg-mg-accent' : 'bg-mg-brand'}`}
                      style={{ width: `${(metrics.byStage[stage.id] / maxStage) * 100}%` }}
                    />
                  </span>
                  <span className="mg-num text-right text-[13px] text-mg-ink">{metrics.byStage[stage.id]}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Por família">
            {families.length === 0 ? (
              <p className="text-sm text-mg-muted">Sem dados ainda.</p>
            ) : (
              <ul className="space-y-2">
                {families.map(([name, count]) => (
                  <li key={name} className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="truncate text-mg-ink">{name}</span>
                    <span className="mg-num text-mg-muted">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Indicadores do contrato" eyebrow="K1 · K2 · K3" className="lg:col-span-4">
            <p className="text-sm text-mg-muted">
              Tempo da demanda ao envio (K1), horas por proposta (K2) e propostas dentro do SLA (K3) são calculados contra o baseline congelado
              e a família-piloto homologada. Enquanto o gate de prontidão estiver fechado, este painel mostra só a amostra acima.
            </p>
          </Panel>
        </div>
      )}
    </div>
  )
}
