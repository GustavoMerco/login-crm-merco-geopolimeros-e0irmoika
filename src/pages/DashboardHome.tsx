import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { sectionsForRole, sectionUrl } from '@/lib/navigation'

export default function DashboardHome() {
  const { user } = useAuth()
  const sections = sectionsForRole(user?.role)
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <p className="max-w-2xl text-sm leading-relaxed text-[#5B6B66]">
        Acesse as funções técnicas existentes pelo menu. As condições para uso real continuam
        exigidas no servidor; esta navegação não libera cálculo ou homologação.
      </p>
      {sections.length === 0 && (
        <p role="status">Nenhuma função disponível para o papel atual. Consulte a administração.</p>
      )}
      <ul className="grid gap-3 sm:grid-cols-2">
        {sections.map(([id, label], index) => (
          <li key={id}>
            {index === 4 && <h2 className="mb-3 font-semibold">Administração e evidências</h2>}
            <Link
              className="flex min-h-[44px] items-center rounded-lg border border-[#E1E8E5] bg-white p-4 font-semibold text-[#064E3B] hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
              to={sectionUrl(id)}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
