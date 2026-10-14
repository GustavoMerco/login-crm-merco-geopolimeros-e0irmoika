import React, { useState } from 'react'
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Building2,
  Mail,
  Phone,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react'

export const Clientes: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F1F1C] tracking-tight">
            Gestão de Clientes
          </h2>
          <p className="text-[13px] text-[#5B6B66] mt-1">
            Cadastre e gerencie clientes corporativos, contatos técnicos e histórico de
            atendimentos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#064E3B] to-[#047857] text-white text-[13px] font-bold shadow-md hover:from-[#043d2e] hover:to-[#065f46] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]"
        >
          <UserPlus className="w-4 h-4 text-[#FB923C]" />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E1E8E5] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5B6B66]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por razão social, CNPJ, contato ou cidade..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#E1E8E5] bg-[#F6F8F7] text-[13px] text-[#0F1F1C] placeholder-[#5B6B66] outline-none transition-all focus:bg-white focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#E1E8E5] bg-white hover:bg-[#F6F8F7] text-[13px] font-semibold text-[#0F1F1C] transition-colors"
          >
            <Filter className="w-4 h-4 text-[#5B6B66]" />
            <span>Filtros</span>
          </button>
        </div>
      </div>

      {/* Main Container - Empty State / Coming Soon */}
      <div className="bg-white rounded-2xl border border-[#E1E8E5] p-8 sm:p-12 shadow-xs text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#ECFDF5] to-[#D1FAE5] border border-[#10B981]/30 flex items-center justify-center text-[#059669] shadow-inner">
            <Users className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF7ED] text-[#EA580C] text-[11px] font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Módulo em breve</span>
          </div>

          <h3 className="text-xl font-extrabold text-[#0F1F1C]">
            Nenhum cliente cadastrado no momento
          </h3>

          <p className="mt-2 text-[14px] text-[#5B6B66] leading-relaxed">
            A listagem de clientes corporativos e contatos técnicos estará integrada diretamente com
            o fluxo de propostas comerciais e obras de geopolímeros.
          </p>

          <div className="mt-6 pt-6 border-t border-[#E1E8E5] grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="p-3 rounded-xl bg-[#F6F8F7] border border-[#E1E8E5]">
              <div className="flex items-center gap-2 text-[#047857]">
                <Building2 className="w-4 h-4" />
                <span className="text-[12px] font-bold">Dados Fiscais</span>
              </div>
              <p className="text-[11px] text-[#5B6B66] mt-1">
                CNPJ, inscrição e endereço de faturamento.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#F6F8F7] border border-[#E1E8E5]">
              <div className="flex items-center gap-2 text-[#FB923C]">
                <Mail className="w-4 h-4" />
                <span className="text-[12px] font-bold">Contatos</span>
              </div>
              <p className="text-[11px] text-[#5B6B66] mt-1">
                Engenheiros, compras e diretores de obra.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#F6F8F7] border border-[#E1E8E5]">
              <div className="flex items-center gap-2 text-[#059669]">
                <Clock className="w-4 h-4" />
                <span className="text-[12px] font-bold">Histórico</span>
              </div>
              <p className="text-[11px] text-[#5B6B66] mt-1">
                Propostas, visitas e ordens de serviço.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Mock */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-[#022C22]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E1E8E5] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E1E8E5]">
              <h4 className="text-base font-bold text-[#0F1F1C]">Cadastrar Novo Cliente</h4>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-[#5B6B66] hover:text-[#0F1F1C] text-sm"
              >
                ✕
              </button>
            </div>
            <div className="py-4 space-y-3">
              <p className="text-[13px] text-[#5B6B66]">
                O formulário completo de cadastro com validação de CNPJ e contatos será
                disponibilizado no próximo ciclo de engenharia.
              </p>
              <div className="p-3 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] text-[12px] text-[#C2410C]">
                Para registrar demandas técnico-comerciais imediatas, utilize o fluxo integrado em
                Propostas.
              </div>
            </div>
            <div className="pt-3 border-t border-[#E1E8E5] flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl bg-[#064E3B] text-white text-[13px] font-bold"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Clientes
