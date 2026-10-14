import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  Users,
  FileSpreadsheet,
  FolderKanban,
  TrendingUp,
  UserPlus,
  PlusCircle,
  Building2,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react'

export const DashboardHome: React.FC = () => {
  const { user } = useAuth()
  const rawName = user?.name || user?.email?.split('@')[0] || 'Usuário'
  const firstName = rawName.split(' ')[0]

  const stats = [
    {
      title: 'Clientes ativos',
      value: '0',
      description: 'Nenhum cliente cadastrado ainda',
      icon: Users,
      trend: '+0% no mês',
      accentColor: 'text-[#10B981]',
      badgeColor: 'bg-[#ECFDF5] text-[#047857]',
      borderColor: 'hover:border-[#10B981]/50',
    },
    {
      title: 'Propostas abertas',
      value: '0',
      description: 'Aguardando novas demandas',
      icon: FileSpreadsheet,
      trend: '0 em negociação',
      accentColor: 'text-[#FB923C]',
      badgeColor: 'bg-[#FFF7ED] text-[#EA580C]',
      borderColor: 'hover:border-[#FB923C]/50',
    },
    {
      title: 'Projetos em andamento',
      value: '0',
      description: 'Geotecnia e poliureia em fila',
      icon: FolderKanban,
      trend: '0 obras ativas',
      accentColor: 'text-[#059669]',
      badgeColor: 'bg-[#ECFDF5] text-[#047857]',
      borderColor: 'hover:border-[#059669]/50',
    },
    {
      title: 'Receita do mês',
      value: 'R$ 0,00',
      description: 'Meta mensal a ser iniciada',
      icon: TrendingUp,
      trend: 'Novo ciclo',
      accentColor: 'text-[#EA580C]',
      badgeColor: 'bg-[#FFF7ED] text-[#EA580C]',
      borderColor: 'hover:border-[#EA580C]/50',
    },
  ]

  const quickActions = [
    {
      title: 'Cadastrar primeiro cliente',
      description: 'Adicione uma conta corporativa com contatos e dados fiscais.',
      icon: UserPlus,
      to: '/clientes',
      actionLabel: 'Ir para Clientes',
      primary: true,
    },
    {
      title: 'Criar proposta comercial',
      description: 'Inicie um orçamento técnico com parametrização de custos.',
      icon: PlusCircle,
      to: '/propostas',
      actionLabel: 'Nova Proposta',
      primary: false,
    },
    {
      title: 'Acompanhar obras & projetos',
      description: 'Visualize cronogramas técnicos e relatórios de campo.',
      icon: FolderKanban,
      to: '/projetos',
      actionLabel: 'Ver Projetos',
      primary: false,
    },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#064E3B] via-[#043d2e] to-[#022C22] p-6 sm:p-8 text-white shadow-lg border border-emerald-900/60">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-[11px] font-bold uppercase tracking-wider text-[#34D399] border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-[#FB923C]" />
              <span>Painel Executivo Merco</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Bem-vindo(a) de volta, <span className="text-[#34D399]">{firstName}</span>!
            </h1>
            <p className="text-emerald-100/80 text-[14px] sm:text-[15px] max-w-2xl leading-relaxed">
              Este é o painel unificado da Merco Geopolímeros. Acompanhe abaixo o status dos seus
              clientes, orçamentos em negociação e projetos em execução.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/clientes"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FB923C] to-[#EA580C] text-white text-[13px] font-bold shadow-md hover:from-[#f97316] hover:to-[#c2410c] transition-all transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FB923C]"
            >
              <UserPlus className="w-4 h-4" />
              <span>Cadastrar Cliente</span>
            </Link>
            <Link
              to="/propostas"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[13px] font-bold border border-white/20 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#FB923C]" />
              <span>Nova Proposta</span>
            </Link>
          </div>
        </div>

        {/* Decorative corner glows */}
        <div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#10B981]/15 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-[#FB923C]/15 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
      </section>

      {/* 4 Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div
              key={idx}
              className={`rounded-2xl bg-white p-5 border border-[#E1E8E5] shadow-xs transition-all duration-200 ${stat.borderColor} hover:shadow-md`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-bold text-[#5B6B66]">{stat.title}</span>
                <span className={`p-2 rounded-xl bg-[#F6F8F7] ${stat.accentColor}`}>
                  <Icon className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#0F1F1C] tracking-tight">
                  {stat.value}
                </span>
              </div>
              <p className="mt-1 text-[12px] text-[#5B6B66]">{stat.description}</p>
              <div className="mt-3 pt-3 border-t border-[#E1E8E5]/70 flex items-center justify-between text-[11px]">
                <span className={`px-2 py-0.5 rounded-full font-bold ${stat.badgeColor}`}>
                  {stat.trend}
                </span>
                <span className="text-[#5B6B66]">Atualizado agora</span>
              </div>
            </div>
          )
        })}
      </section>

      {/* Main Grid: Empty State / CTA + Quick Actions */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Empty State Invitation Card (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-[#E1E8E5] p-6 sm:p-8 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#E1E8E5]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#ECFDF5] text-[#047857]">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0F1F1C]">
                    Base de Clientes & Oportunidades
                  </h2>
                  <p className="text-[12px] text-[#5B6B66]">
                    Fluxo comercial e carteira corporativa
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#047857] text-[11px] font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Pronto para cadastros
              </span>
            </div>

            {/* Empty state illustration & text */}
            <div className="py-10 text-center max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-[#ECFDF5] to-[#FEF3C7] border border-[#10B981]/20 flex items-center justify-center text-[#059669] shadow-inner">
                <Users className="w-8 h-8 text-[#059669]" />
              </div>
              <h3 className="text-lg font-extrabold text-[#0F1F1C]">
                Nenhum cliente cadastrado ainda
              </h3>
              <p className="mt-2 text-[13px] text-[#5B6B66] leading-relaxed">
                Comece cadastrando sua primeira conta para gerar propostas técnicas, gerenciar
                contatos e acompanhar os projetos de geopolímeros e impermeabilização.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/clientes"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#064E3B] hover:bg-[#043d2e] text-white text-[13px] font-bold shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]"
                >
                  <UserPlus className="w-4 h-4 text-[#FB923C]" />
                  <span>Cadastrar Primeiro Cliente</span>
                </Link>
                <Link
                  to="/propostas"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#E1E8E5] hover:bg-[#F6F8F7] text-[#0F1F1C] text-[13px] font-semibold transition-colors"
                >
                  <span>Ver Propostas</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E1E8E5] flex items-center justify-between text-[12px] text-[#5B6B66]">
            <span>Dica: Clientes cadastrados têm integração com as propostas técnicas.</span>
            <span className="font-semibold text-[#047857]">Merco Geopolímeros</span>
          </div>
        </div>

        {/* Quick actions panel (1 col) */}
        <div className="rounded-2xl bg-white border border-[#E1E8E5] p-6 shadow-xs flex flex-col">
          <h2 className="text-base font-bold text-[#0F1F1C] pb-3 border-b border-[#E1E8E5]">
            Ações Rápidas
          </h2>

          <div className="mt-4 space-y-3 flex-1">
            {quickActions.map((action, idx) => {
              const Icon = action.icon
              return (
                <Link
                  key={idx}
                  to={action.to}
                  className="group block p-3.5 rounded-xl border border-[#E1E8E5] hover:border-[#10B981] hover:bg-[#F6F8F7] transition-all"
                >
                  <div className="flex items-start gap-3">
                    <span className="p-2 rounded-lg bg-[#ECFDF5] text-[#047857] group-hover:bg-[#10B981] group-hover:text-white transition-colors shrink-0">
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-bold text-[#0F1F1C] group-hover:text-[#047857] transition-colors truncate">
                          {action.title}
                        </p>
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#5B6B66] group-hover:text-[#FB923C] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                      </div>
                      <p className="text-[12px] text-[#5B6B66] mt-1 line-clamp-2 leading-relaxed">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          <div className="mt-4 p-3 rounded-xl bg-gradient-to-br from-[#FFF7ED] to-[#FFEDD5] border border-[#FED7AA]">
            <div className="flex items-center gap-2 text-[#EA580C]">
              <Calendar className="w-4 h-4 shrink-0" />
              <span className="text-[12px] font-bold">Atendimento Merco</span>
            </div>
            <p className="text-[11px] text-[#5B6B66] mt-1 leading-relaxed">
              Em caso de dúvidas operacionais ou suporte à homologação, consulte a equipe técnica de
              engenharia.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default DashboardHome
