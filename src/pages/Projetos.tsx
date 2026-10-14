import React from 'react'
import { Link } from 'react-router-dom'
import {
  FolderKanban,
  HardHat,
  CalendarDays,
  Activity,
  Layers,
  Sparkles,
  ArrowRight,
} from 'lucide-react'

export const Projetos: React.FC = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F1F1C] tracking-tight">
            Projetos e Obras
          </h2>
          <p className="text-[13px] text-[#5B6B66] mt-1">
            Controle de execução de geotecnia, impermeabilização com poliureia e diário de obra.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] text-[12px] font-bold">
          <HardHat className="w-4 h-4 text-[#FB923C]" />
          <span>Equipes Técnicas Merco</span>
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-[#E1E8E5] p-8 sm:p-12 shadow-xs text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#ECFDF5] to-[#D1FAE5] border border-[#10B981]/30 flex items-center justify-center text-[#047857] shadow-inner">
            <FolderKanban className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF7ED] text-[#EA580C] text-[11px] font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Módulo em breve</span>
          </div>

          <h3 className="text-xl font-extrabold text-[#0F1F1C]">Gestão operacional de obras</h3>

          <p className="mt-2 text-[14px] text-[#5B6B66] leading-relaxed">
            Acompanhe o cronograma físico de aplicação, consumo de matéria-prima, ensaios de
            qualidade e entrega técnica dos projetos homologados.
          </p>

          <div className="mt-6 pt-6 border-t border-[#E1E8E5] grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="p-3 rounded-xl bg-[#F6F8F7] border border-[#E1E8E5]">
              <div className="flex items-center gap-2 text-[#047857]">
                <CalendarDays className="w-4 h-4" />
                <span className="text-[12px] font-bold">Cronograma</span>
              </div>
              <p className="text-[11px] text-[#5B6B66] mt-1">
                Marcos de avanço e datas de mobilização.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#F6F8F7] border border-[#E1E8E5]">
              <div className="flex items-center gap-2 text-[#FB923C]">
                <Layers className="w-4 h-4" />
                <span className="text-[12px] font-bold">Consumo</span>
              </div>
              <p className="text-[11px] text-[#5B6B66] mt-1">
                Rastreio de geopolímeros e resinas por lote.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#F6F8F7] border border-[#E1E8E5]">
              <div className="flex items-center gap-2 text-[#059669]">
                <Activity className="w-4 h-4" />
                <span className="text-[12px] font-bold">Laudos</span>
              </div>
              <p className="text-[11px] text-[#5B6B66] mt-1">
                Ensaios de aderência e espessura da camada.
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

export default Projetos
