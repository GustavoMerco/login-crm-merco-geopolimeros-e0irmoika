import React from 'react'
import { Link } from 'react-router-dom'
import {
  FileSpreadsheet,
  PlusCircle,
  FileCheck,
  Send,
  Calculator,
  Sparkles,
  ArrowRight,
} from 'lucide-react'

export const Propostas: React.FC = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F1F1C] tracking-tight">
            Propostas Comerciais
          </h2>
          <p className="text-[13px] text-[#5B6B66] mt-1">
            Geração de orçamentos técnicos com composições de poliureia e geotecnia.
          </p>
        </div>

        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FB923C] to-[#EA580C] text-white text-[13px] font-bold shadow-md hover:from-[#f97316] hover:to-[#c2410c] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FB923C]"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Nova Demanda Técnica</span>
        </Link>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-[#E1E8E5] p-8 sm:p-12 shadow-xs text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#FFF7ED] to-[#FFEDD5] border border-[#FB923C]/30 flex items-center justify-center text-[#EA580C] shadow-inner">
            <FileSpreadsheet className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECFDF5] text-[#047857] text-[11px] font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Módulo em breve</span>
          </div>

          <h3 className="text-xl font-extrabold text-[#0F1F1C]">
            Gestão de propostas e orçamentos
          </h3>

          <p className="mt-2 text-[14px] text-[#5B6B66] leading-relaxed">
            Acompanhe o funil de propostas com status de elaboração, envio para o cliente, validação
            técnica e aprovação de margem e BDI.
          </p>

          <div className="mt-6 pt-6 border-t border-[#E1E8E5] grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="p-3 rounded-xl bg-[#F6F8F7] border border-[#E1E8E5]">
              <div className="flex items-center gap-2 text-[#047857]">
                <Calculator className="w-4 h-4" />
                <span className="text-[12px] font-bold">Composições</span>
              </div>
              <p className="text-[11px] text-[#5B6B66] mt-1">
                Cálculo de insumos, equipamentos e equipes de campo.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#F6F8F7] border border-[#E1E8E5]">
              <div className="flex items-center gap-2 text-[#FB923C]">
                <FileCheck className="w-4 h-4" />
                <span className="text-[12px] font-bold">Modelos PDF</span>
              </div>
              <p className="text-[11px] text-[#5B6B66] mt-1">
                Templates padronizados para poliureia e geotecnia.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#F6F8F7] border border-[#E1E8E5]">
              <div className="flex items-center gap-2 text-[#059669]">
                <Send className="w-4 h-4" />
                <span className="text-[12px] font-bold">Envio Rastreável</span>
              </div>
              <p className="text-[11px] text-[#5B6B66] mt-1">
                Notificações e protocolo de entrega comercial.
              </p>
            </div>
          </div>

          <div className="mt-8">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-[13px] font-bold text-[#047857] hover:text-[#064E3B] hover:underline"
            >
              <span>Voltar para o Painel Inicial</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Propostas
