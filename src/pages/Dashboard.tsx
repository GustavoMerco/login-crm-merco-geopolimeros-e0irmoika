import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { hasPermission, ROLE_LABELS } from '@/lib/auth/permissions'
import { MercoLogo } from '@/components/MercoLogo'
import { LogOut, ShieldCheck, User as UserIcon, LockKeyhole } from 'lucide-react'

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  const rawName = user?.name || user?.email?.split('@')[0] || 'Usuário'
  const firstName = rawName.split(' ')[0]
  const initial = (firstName[0] || 'U').toUpperCase()
  const role = user?.role
  const canHomologateCatalog = hasPermission(role, 'homologateCatalog')

  return (
    <div className="min-h-screen w-full bg-[#F6F8F7] flex flex-col font-sans antialiased text-[#0F1F1C]">
      <header className="w-full h-16 bg-white border-b border-[#E1E8E5] px-4 sm:px-8 flex items-center justify-between shadow-xs sticky top-0 z-20">
        <div className="flex items-center">
          <MercoLogo size={36} showWordmark={true} lightTheme={true} />
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#10B981] text-white flex items-center justify-center font-bold text-sm shadow-xs select-none">
              {initial}
            </div>
            <span className="hidden sm:inline-block text-[14px] font-semibold text-[#0F1F1C]">
              Olá, {firstName}
            </span>
          </div>

          <div className="h-5 w-[1px] bg-[#E1E8E5] hidden sm:block" />

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-semibold text-[#EA580C] hover:bg-[#EA580C]/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-xl bg-white rounded-[16px] p-8 sm:p-10 border border-[#E1E8E5] shadow-[0_12px_40px_rgba(2,44,34,0.06)] text-center animate-assemble">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-b from-[#064E3B] to-[#022C22] p-4 flex items-center justify-center shadow-[0_8px_20px_rgba(2,44,34,0.18)]">
            <MercoLogo size={48} showWordmark={false} />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10B981]/12 text-[#047857] text-[12px] font-bold uppercase tracking-wider mb-4">
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            <span>Acesso Autorizado</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F1F1C] tracking-tight mb-3">
            Olá, {user?.name || firstName}!
          </h1>

          <p className="text-[16px] font-semibold text-[#10B981] mb-4">
            Seu acesso foi validado com sucesso.
          </p>

          <p className="text-[14px] sm:text-[15px] text-[#5B6B66] leading-relaxed mb-8 max-w-md mx-auto">
            Em breve, os módulos do CRM — Clientes, Propostas e Projetos — estarão disponíveis neste
            painel.
          </p>

          <div className="bg-[#F6F8F7] rounded-[12px] p-4 border border-[#E1E8E5] mb-4 text-left flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white border border-[#E1E8E5] flex items-center justify-center text-[#5B6B66]">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-[#0F1F1C]">{user?.name || 'Usuário'}</p>
                <p className="text-[12px] text-[#5B6B66]">{user?.email}</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#10B981] bg-[#10B981]/10 px-2.5 py-1 rounded-full">
              {role ? ROLE_LABELS[role] : 'Papel não definido'}
            </span>
          </div>

          <div
            className={`rounded-[12px] p-4 border text-left mb-8 ${
              canHomologateCatalog
                ? 'border-[#A7F3D0] bg-[#ECFDF5]'
                : 'border-[#FED7AA] bg-[#FFF7ED]'
            }`}
          >
            <div className="flex items-start gap-3">
              {canHomologateCatalog ? (
                <ShieldCheck className="w-5 h-5 text-[#059669] mt-0.5" />
              ) : (
                <LockKeyhole className="w-5 h-5 text-[#EA580C] mt-0.5" />
              )}
              <div>
                <p className="text-[14px] font-bold text-[#0F1F1C]">Homologação de catálogo</p>
                <p className="text-[13px] text-[#5B6B66] mt-1">
                  {canHomologateCatalog
                    ? 'Seu papel permite homologar o catálogo.'
                    : 'Acesso negado: somente Engenharia ou Administrador podem homologar.'}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full sm:w-auto px-8 h-[48px] rounded-[12px] bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-semibold text-[15px] hover:shadow-[0_4px_16px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 transition-all active:scale-[0.98] inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair da conta</span>
          </button>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
