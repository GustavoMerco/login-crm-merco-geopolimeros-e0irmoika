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
          <h2 className="text-xl sm:text-2xl font-extrabold text-mg-ink tracking-tight">
            Propostas Comerciais
          </h2>
          <p className="text-[13px] text-mg-muted mt-1">
            Geração de orçamentos técnicos com composições de poliureia e geotecnia.
          </p>
        </div>

        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-mg-action text-white text-[13px] font-bold shadow-md hover:bg-mg-action-hover transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-mg-accent"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Nova Demanda Técnica</span>
        </Link>
      </div>

      {/* Main card */}
      <div className="bg-mg-surface rounded-2xl border border-mg-line p-8 sm:p-12 shadow-xs text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-mg-warn-bg to-mg-warn-bg border border-mg-accent/30 flex items-center justify-center text-mg-warn shadow-inner">
            <FileSpreadsheet className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mg-brand-soft text-mg-brand text-[11px] font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-mg-brand" />
            <span>Módulo em breve</span>
          </div>

          <h3 className="text-xl font-extrabold text-mg-ink">
            Gestão de propostas e orçamentos
          </h3>

          <p className="mt-2 text-[14px] text-mg-muted leading-relaxed">
            Acompanhe o funil de propostas com status de elaboração, envio para o cliente, validação
            técnica e aprovação de margem e BDI.
          </p>

          <div className="mt-6 pt-6 border-t border-mg-line grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="p-3 rounded-xl bg-mg-canvas border border-mg-line">
              <div className="flex items-center gap-2 text-mg-brand">
                <Calculator className="w-4 h-4" />
                <span className="text-[12px] font-bold">Composições</span>
              </div>
              <p className="text-[11px] text-mg-muted mt-1">
                Cálculo de insumos, equipamentos e equipes de campo.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-mg-canvas border border-mg-line">
              <div className="flex items-center gap-2 text-mg-accent">
                <FileCheck className="w-4 h-4" />
                <span className="text-[12px] font-bold">Modelos PDF</span>
              </div>
              <p className="text-[11px] text-mg-muted mt-1">
                Templates padronizados para poliureia e geotecnia.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-mg-canvas border border-mg-line">
              <div className="flex items-center gap-2 text-mg-brand-strong">
                <Send className="w-4 h-4" />
                <span className="text-[12px] font-bold">Envio Rastreável</span>
              </div>
              <p className="text-[11px] text-mg-muted mt-1">
                Notificações e protocolo de entrega comercial.
              </p>
            </div>
          </div>

          <div className="mt-8">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-[13px] font-bold text-mg-brand hover:text-mg-brand-strong hover:underline"
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
