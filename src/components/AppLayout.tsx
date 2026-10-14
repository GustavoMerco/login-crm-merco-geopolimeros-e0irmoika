import React, { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { MercoLogo } from '@/components/MercoLogo'
import { ROLE_LABELS } from '@/lib/auth/permissions'
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  FolderKanban,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  Bell,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/propostas', label: 'Propostas', icon: FileSpreadsheet },
  { to: '/projetos', label: 'Projetos', icon: FolderKanban },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': {
    title: 'Visão Geral',
    subtitle: 'Painel executivo e acompanhamento das operações',
  },
  '/clientes': {
    title: 'Clientes',
    subtitle: 'Gestão de contas, contatos corporativos e histórico',
  },
  '/propostas': {
    title: 'Propostas Comerciais',
    subtitle: 'Orçamentos, precificação e acompanhamento de propostas',
  },
  '/projetos': {
    title: 'Projetos e Obras',
    subtitle: 'Execução de geotecnia, poliureia e controle técnico',
  },
  '/configuracoes': {
    title: 'Configurações do Sistema',
    subtitle: 'Preferências da organização, integrações e parâmetros',
  },
}

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showSearchNotice, setShowSearchNotice] = useState(false)
  const [showBellNotice, setShowBellNotice] = useState(false)

  const rawName = user?.name || user?.email?.split('@')[0] || 'Usuário'
  const firstName = rawName.split(' ')[0]
  const initials =
    rawName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U'

  const role = user?.role
  const roleLabel = role ? ROLE_LABELS[role] : 'Usuário'

  const activePageInfo = pageTitles[location.pathname] || {
    title: 'Área Interna',
    subtitle: 'Merco Geopolímeros CRM',
  }

  const handleLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  return (
    <div className="min-h-screen w-full bg-[#F6F8F7] flex font-sans antialiased text-[#0F1F1C]">
      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#022C22]/70 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (Desktop fixed + Mobile drawer) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[268px] flex flex-col bg-gradient-to-b from-[#064E3B] via-[#043d2e] to-[#022C22] text-white shadow-2xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top brand header */}
        <div className="h-20 px-5 flex items-center justify-between border-b border-emerald-900/60 bg-[#064E3B]/40">
          <div className="flex items-center">
            <MercoLogo size={36} showWordmark={true} lightTheme={false} />
          </div>
          <button
            type="button"
            onClick={closeMobileMenu}
            className="lg:hidden p-2 -mr-1 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-900/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FB923C]"
            aria-label="Fechar menu de navegação"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Small subtitle badge */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-[11px] font-semibold text-emerald-200 tracking-wide">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="uppercase text-[10px] tracking-wider text-emerald-300">
              CRM Corporativo
            </span>
          </div>
        </div>

        {/* Navigation items */}
        <nav
          className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto"
          aria-label="Navegação principal"
        >
          <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300/60">
            Módulos
          </p>

          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-[14px] font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500/25 to-emerald-500/10 text-white font-bold shadow-sm'
                      : 'text-emerald-100/75 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Orange active indicator bar on the left */}
                    <span
                      className={`absolute left-0 top-1/2 -translate-y-1/2 w-1.5 rounded-r-full transition-all duration-200 ${
                        isActive
                          ? 'h-6 bg-gradient-to-b from-[#FB923C] to-[#EA580C] shadow-[0_0_8px_rgba(251,146,60,0.8)]'
                          : 'h-0 bg-transparent'
                      }`}
                      aria-hidden="true"
                    />

                    {/* Icon with orange highlight on active */}
                    <span
                      className={`p-1.5 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-[#F97316]/20 text-[#FB923C]'
                          : 'bg-emerald-900/40 text-emerald-200 group-hover:bg-emerald-800/50 group-hover:text-emerald-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </span>

                    <span className="flex-1 truncate">{item.label}</span>

                    {isActive && (
                      <ChevronRight className="w-4 h-4 text-[#FB923C]/80" aria-hidden="true" />
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Sidebar Footer: Logged user card & Logout button */}
        <div className="p-3 border-t border-emerald-900/60 bg-[#022C22]/80">
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/40">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#10B981] to-[#059669] text-white flex items-center justify-center font-extrabold text-[13px] shadow-md ring-2 ring-emerald-400/20 shrink-0 select-none">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-[13px] font-bold text-white truncate leading-tight">
                    {user?.name || firstName}
                  </p>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981] shrink-0" aria-hidden="true" />
                </div>
                <p className="text-[11px] text-emerald-200/80 truncate mt-0.5 leading-tight">
                  {user?.email || 'usuario@merco.com.br'}
                </p>
                <div className="mt-1">
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#FB923C] bg-[#FB923C]/10 border border-[#FB923C]/30 px-2 py-0.5 rounded-full">
                    {roleLabel}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleLogout()}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[12px] font-bold text-red-200 hover:text-white bg-red-950/40 hover:bg-red-900/50 border border-red-800/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span>Encerrar sessão</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[268px]">
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-20 bg-white/95 backdrop-blur-md border-b border-[#E1E8E5] px-4 sm:px-8 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-[#0F1F1C] hover:bg-[#F6F8F7] border border-[#E1E8E5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]"
              aria-label="Abrir menu de navegação"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Page Title & Subtitle */}
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-extrabold text-[#0F1F1C] tracking-tight truncate leading-tight">
                {activePageInfo.title}
              </h1>
              <p className="text-[12px] sm:text-[13px] text-[#5B6B66] truncate hidden sm:block leading-tight mt-0.5">
                {activePageInfo.subtitle}
              </p>
            </div>
          </div>

          {/* Right actions: Search + Notifications */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Search Input (Decorative / quick filter) */}
            <div className="relative hidden md:block w-64 lg:w-72">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5B6B66]"
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="Buscar clientes, propostas..."
                onClick={() => {
                  setShowSearchNotice(true)
                  setTimeout(() => setShowSearchNotice(false), 2400)
                }}
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#E1E8E5] bg-[#F6F8F7] text-[13px] text-[#0F1F1C] placeholder-[#5B6B66] outline-none transition-all focus:bg-white focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
              />
              {showSearchNotice && (
                <div className="absolute right-0 top-12 z-50 bg-[#064E3B] text-white text-[11px] font-semibold py-1.5 px-3 rounded-lg shadow-lg whitespace-nowrap animate-in fade-in slide-in-from-top-1">
                  Busca rápida integrada em breve
                </div>
              )}
            </div>

            {/* Notification Bell with Orange Badge */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowBellNotice(!showBellNotice)
                  setTimeout(() => setShowBellNotice(false), 2800)
                }}
                className="relative p-2.5 rounded-xl border border-[#E1E8E5] bg-white hover:bg-[#F6F8F7] text-[#0F1F1C] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]"
                aria-label="Notificações"
              >
                <Bell className="w-4 h-4 text-[#0F1F1C]" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#EA580C] text-[10px] font-bold text-white shadow-xs">
                  2
                </span>
              </button>

              {showBellNotice && (
                <div className="absolute right-0 top-12 z-50 w-72 bg-white border border-[#E1E8E5] rounded-xl p-3 shadow-xl text-left animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E1E8E5]">
                    <span className="text-[12px] font-bold text-[#0F1F1C]">Notificações</span>
                    <span className="text-[10px] font-semibold text-[#EA580C]">2 novas</span>
                  </div>
                  <div className="mt-2 space-y-2 text-[12px]">
                    <div className="p-2 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0]">
                      <p className="font-semibold text-[#047857]">Acesso seguro ativo</p>
                      <p className="text-[11px] text-[#5B6B66] mt-0.5">
                        Sessão autenticada via Merco Auth.
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-[#FFF7ED] border border-[#FED7AA]">
                      <p className="font-semibold text-[#C2410C]">Painel atualizado</p>
                      <p className="text-[11px] text-[#5B6B66] mt-0.5">
                        Sidebar interna e navegação habilitadas.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile initials avatar */}
            <div className="lg:hidden w-9 h-9 rounded-full bg-[#10B981] text-white flex items-center justify-center font-bold text-[12px] select-none">
              {initials}
            </div>
          </div>
        </header>

        {/* Dynamic Nested Route Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
