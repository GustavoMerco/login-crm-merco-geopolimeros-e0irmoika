import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ADMIN_INDEX, sectionsForRole } from '@/lib/navigation'
import { hasPermission } from '@/lib/auth/permissions'

// T2.36 — índice administrativo: organiza as funções administrativas existentes
// com destinos autorizados e entradas contextuais. Não extrai nem redesenha as
// seções; não concede acesso novo (leitura segue viewDashboard; mutações seguem
// negadas no servidor).
export default function AdminIndex() {
  const { user } = useAuth()
  const sections = sectionsForRole(user?.role)

  if (sections.length === 0) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-xl font-bold text-[#0F1F1C]">Administração e evidências</h1>
        <p role="status" className="mt-3 text-sm text-[#5B6B66]">
          Nenhuma função disponível para o papel atual. Consulte a administração.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#0F1F1C]">Administração e evidências</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#5B6B66]">
          Funções administrativas e evidências existentes, organizadas por destino. Cada entrada
          abre a seção real onde a função vive hoje; permissões e validações continuam no servidor.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {ADMIN_INDEX.map((entry) => (
          <li key={entry.id}>
            <Link
              className="flex min-h-[44px] flex-col justify-center rounded-lg border border-[#E1E8E5] bg-white p-4 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
              to={entry.url}
            >
              <span className="font-semibold text-[#064E3B]">{entry.label}</span>
              <span className="mt-1 text-[13px] leading-snug text-[#5B6B66]">
                {entry.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {hasPermission(user?.role, 'approveReadiness') && (
        <section aria-labelledby="provas-tecnicas">
          <h2 id="provas-tecnicas" className="text-sm font-semibold text-[#0F1F1C]">
            Provas técnicas
          </h2>
          <Link
            className="mt-2 flex min-h-[44px] flex-col justify-center rounded-lg border border-[#E1E8E5] bg-white p-4 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 sm:w-1/2"
            to="/administracao/prova-calculo"
          >
            <span className="font-semibold text-[#064E3B]">Prova do cálculo decimal (T2.5)</span>
            <span className="mt-1 text-[13px] leading-snug text-[#5B6B66]">
              Roda no servidor os exemplos sintéticos do motor de cálculo; simulação, sem aprovação.
            </span>
          </Link>
        </section>
      )}
    </div>
  )
}
