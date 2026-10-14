import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_LABELS } from '@/lib/auth/permissions'
import { Settings, Shield, Sliders, Database, Building, Sparkles } from 'lucide-react'

export const Configuracoes: React.FC = () => {
  const { user } = useAuth()
  const role = user?.role
  const roleLabel = role ? ROLE_LABELS[role] : 'Usuário'

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F1F1C] tracking-tight">
            Configurações do CRM
          </h2>
          <p className="text-[13px] text-[#5B6B66] mt-1">
            Preferências da organização, controle de acesso e parâmetros do sistema.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#E1E8E5] text-[12px] font-semibold text-[#0F1F1C]">
          <Shield className="w-4 h-4 text-[#10B981]" />
          <span>Perfil atual: {roleLabel}</span>
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-[#E1E8E5] p-8 sm:p-12 shadow-xs text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#ECFDF5] to-[#D1FAE5] border border-[#10B981]/30 flex items-center justify-center text-[#047857] shadow-inner">
            <Settings className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF7ED] text-[#EA580C] text-[11px] font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#FB923C]" />
            <span>Módulo em breve</span>
          </div>

          <h3 className="text-xl font-extrabold text-[#0F1F1C]">
            Painel de administração e preferências
          </h3>

          <p className="mt-2 text-[14px] text-[#5B6B66] leading-relaxed">
            Personalize informações corporativas da Merco Geopolímeros, regras de SLA, integrações
            fiscais e permissões por grupo de usuários.
          </p>

          <div className="mt-6 pt-6 border-t border-[#E1E8E5] grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="p-3 rounded-xl bg-[#F6F8F7] border border-[#E1E8E5]">
              <div className="flex items-center gap-2 text-[#047857]">
                <Building className="w-4 h-4" />
                <span className="text-[12px] font-bold">Organização</span>
              </div>
              <p className="text-[11px] text-[#5B6B66] mt-1">
                Razão social, logotipos e cabeçalhos oficiais.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#F6F8F7] border border-[#E1E8E5]">
              <div className="flex items-center gap-2 text-[#FB923C]">
                <Sliders className="w-4 h-4" />
                <span className="text-[12px] font-bold">Parâmetros</span>
              </div>
              <p className="text-[11px] text-[#5B6B66] mt-1">
                Tabelas de BDI, alíquotas de ISS e margens de corte.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#F6F8F7] border border-[#E1E8E5]">
              <div className="flex items-center gap-2 text-[#059669]">
                <Database className="w-4 h-4" />
                <span className="text-[12px] font-bold">Segurança</span>
              </div>
              <p className="text-[11px] text-[#5B6B66] mt-1">
                Histórico de acessos, tokens e backups periódicos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Configuracoes
