import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTheme, type ThemePreference } from '@/contexts/ThemeContext'
import { MercoLogo } from '@/components/MercoLogo'
import { buildCards, groupByStage, STAGES, type PipelineOpportunity } from '@/lib/pipeline'
import { Button, DeadlinePill, EmptyState, JourneyRuler, Kpi, Notice, Panel, Pill, StagePill, deadlineBar } from '@/components/crm/ui'

// Vitrine do design system "Laje nivelada" (claro) / "Galpão à noite" (escuro).
// Dados 100% fictícios, sem chamada ao servidor; serve para validar o visual.
const TOKENS = [
  'canvas', 'surface', 'surface-2', 'ink', 'muted', 'line', 'line-strong', 'brand', 'brand-strong', 'brand-fill',
  'brand-soft', 'brand-soft-2', 'action', 'action-hover', 'accent', 'sidebar', 'ok', 'ok-bg', 'warn', 'warn-bg', 'crit', 'crit-bg',
] as const

const SAMPLE: PipelineOpportunity[] = [
  { id: 'demo00000000001', customer_name: 'Cervejaria Exemplo — Jacareí', contact_name: 'Ana', origin: 'Indicação', service_family: 'Nivelamento de pisos', location: 'Jacareí/SP', responsible_user_id: 'x', demand_date: '2026-11-01', deadline_date: '2026-11-08', received_at: '2026-11-01T12:00:00Z', status: 'received', aptitude_status: 'pending' },
  { id: 'demo00000000002', customer_name: 'Laticínios Modelo', contact_name: 'Bruno', origin: 'Portal', service_family: 'Estabilização de solo', location: 'Garanhuns/PE', responsible_user_id: 'x', demand_date: '2026-11-03', deadline_date: '2026-11-11', received_at: '2026-11-03T12:00:00Z', status: 'blocked', aptitude_status: 'blocked', pending_items: ['Planta baixa', 'Área total'] },
  { id: 'demo00000000003', customer_name: 'Fábrica de Motores Sul', contact_name: 'Carla', origin: 'Indicação', service_family: 'Nivelamento de pisos', location: 'Jaraguá do Sul/SC', responsible_user_id: 'x', demand_date: '2026-11-02', deadline_date: '2026-11-25', received_at: '2026-11-02T12:00:00Z', status: 'apt', aptitude_status: 'apt' },
  { id: 'demo00000000004', customer_name: 'Terminal Aeroportuário', contact_name: 'Diego', origin: 'Licitação', service_family: 'Reforço estrutural', location: 'Rio de Janeiro/RJ', responsible_user_id: 'x', demand_date: '2026-10-28', deadline_date: '2026-11-12', received_at: '2026-10-28T12:00:00Z', status: 'apt', aptitude_status: 'apt' },
  { id: 'demo00000000005', customer_name: 'Alimentos do Vale', contact_name: 'Elisa', origin: 'Indicação', service_family: 'Permeação de solo', location: 'Chapecó/SC', responsible_user_id: 'x', demand_date: '2026-10-20', deadline_date: '2026-11-05', received_at: '2026-10-20T12:00:00Z', status: 'apt', aptitude_status: 'apt' },
]

const OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
  { value: 'system', label: 'Sistema' },
]

export default function DesignSystem() {
  const { preference, setPreference } = useTheme()
  const [searchParams] = useSearchParams()
  const forced = searchParams.get('tema')
  // ?tema=claro|escuro abre a vitrine num tema fixo (útil para revisar e compartilhar).
  useEffect(() => {
    if (forced === 'claro') setPreference('light')
    if (forced === 'escuro') setPreference('dark')
  }, [forced, setPreference])
  const cards = buildCards(
    SAMPLE,
    [
      { opportunity_id: 'demo00000000005', milestone: 'ready', occurred_at: '2026-11-03T12:00:00Z' },
      { opportunity_id: 'demo00000000005', milestone: 'sent', occurred_at: '2026-11-04T12:00:00Z' },
    ],
    new Set(['demo00000000004']),
    new Date('2026-11-10T15:00:00Z'),
  )
  const groups = groupByStage(cards)

  return (
    <div className="min-h-screen bg-mg-canvas text-mg-ink">
      <header className="bg-mg-sidebar px-6 py-10 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6">
          <div>
            <MercoLogo size={36} />
            <p className="mg-eyebrow mt-8 text-mg-sidebar-ink">Design system</p>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.01em] text-white sm:text-4xl">Laje nivelada</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-mg-sidebar-ink">
              Superfícies planas, estrutura em petróleo e um laranja de injeção só onde há algo a fazer. Versão escura: "Galpão à noite".
            </p>
          </div>
          <div role="radiogroup" aria-label="Tema" className="flex rounded-lg border border-white/15 p-0.5">
            {OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={preference === option.value}
                onClick={() => setPreference(option.value)}
                className={`min-h-[36px] rounded-md px-3 text-[13px] font-semibold ${preference === option.value ? 'bg-white/15 text-white' : 'text-mg-sidebar-ink'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-6 py-10 sm:px-10">
        <section aria-label="Cores">
          <h2 className="mg-eyebrow mb-3 text-mg-muted">Tokens de cor</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {TOKENS.map((token) => (
              <li key={token} className="overflow-hidden rounded-lg border border-mg-line bg-mg-surface">
                <span className="block h-14 border-b border-mg-line" style={{ background: `rgb(var(--mg-${token}))` }} />
                <span className="mg-num block px-2.5 py-2 text-[11px] text-mg-muted">mg-{token}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Tipografia" className="grid gap-4 md:grid-cols-2">
          <Panel title="Manrope" eyebrow="Títulos e texto">
            <p className="text-2xl font-bold tracking-[-0.01em]">Injetando vida na infraestrutura</p>
            <p className="mt-2 text-sm text-mg-muted">Corpo 14 px, peso 500. Linguagem de negócio, frases curtas, sempre dizendo o próximo passo.</p>
          </Panel>
          <Panel title="IBM Plex Mono" eyebrow="Números e unidades">
            <p className="mg-num text-[30px] font-semibold leading-none">2,05 kg</p>
            <p className="mg-num mt-3 text-[13px] text-mg-muted">10,25 m² × 0,20 kg/m² · COMP-GEO-01 v3 · vence 12/11/2026</p>
          </Panel>
        </section>

        <section aria-label="Componentes" className="grid gap-4 md:grid-cols-2">
          <Panel title="Ações">
            <div className="flex flex-wrap gap-2">
              <Button variant="primary">Nova demanda</Button>
              <Button>Ver funil</Button>
              <Button variant="quiet">Cancelar</Button>
            </div>
            <p className="mt-3 text-[13px] text-mg-muted">Um botão laranja por tela. As demais ações são secundárias.</p>
          </Panel>
          <Panel title="Estados">
            <div className="flex flex-wrap gap-2">
              <Pill tone="ok">Enviada no prazo</Pill>
              <Pill tone="warn">Vence em 2 dias</Pill>
              <Pill tone="crit">Prazo vencido</Pill>
              <Pill tone="neutral">Sem prazo</Pill>
              <Pill tone="brand">Apta</Pill>
            </div>
            <div className="mt-4 space-y-2">
              <Notice tone="warn">Não foi possível ler os marcos; as etapas finais podem estar desatualizadas.</Notice>
              <Notice tone="crit">Faltam a planta baixa e a área total para iniciar o orçamento.</Notice>
            </div>
          </Panel>
        </section>

        <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Em andamento" value="12" hint="Oportunidades ainda não enviadas." />
          <Kpi label="Prazo vencido" value="2" hint="Passaram do prazo do cliente." />
          <Kpi label="Tempo até o envio" value="3,4" unit="dias" hint="Média das últimas propostas enviadas." />
          <Kpi label="Enviadas no prazo" value="86%" hint="6 de 7 com prazo informado." />
        </section>

        <section aria-label="Jornada">
          <Panel title="Régua da jornada" eyebrow="Card da oportunidade">
            <JourneyRuler currentIndex={2} />
            <p className="mt-3 text-[13px] text-mg-muted">Etapas tracejadas ainda não existem; aparecem com a fase em que chegam.</p>
          </Panel>
        </section>

        <section aria-label="Funil de exemplo">
          <h2 className="mg-eyebrow mb-3 text-mg-muted">Funil de propostas (dados fictícios, hoje = 10/11/2026)</h2>
          <div className="overflow-x-auto pb-2">
            <div className="grid min-w-[1080px] grid-cols-6 gap-3">
              {STAGES.map((stage) => (
                <div key={stage.id} className="rounded-xl border border-mg-line bg-mg-surface-2">
                  <div className="flex items-center justify-between border-b border-mg-line px-3 py-3">
                    <span className="text-[13px] font-bold">{stage.label}</span>
                    <span className="mg-num rounded-full bg-mg-surface px-2 text-[12px] text-mg-muted">{groups[stage.id].length}</span>
                  </div>
                  <ul className="space-y-2 p-2">
                    {groups[stage.id].map((card) => (
                      <li key={card.opportunity.id} className="relative overflow-hidden rounded-lg border border-mg-line bg-mg-surface p-3 pl-4">
                        <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-[3px] ${deadlineBar(card.deadline)}`} />
                        <p className="truncate text-[14px] font-bold">{card.opportunity.customer_name}</p>
                        <p className="truncate text-[12px] text-mg-muted">{card.opportunity.service_family}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <DeadlinePill deadline={card.deadline} />
                          <StagePill stage={card.stage} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <EmptyState title="Nada urgente por aqui" description="Estado vazio: diz o porquê e oferece o próximo passo." action={<Button variant="primary">Registrar demanda</Button>} />
      </main>
    </div>
  )
}
