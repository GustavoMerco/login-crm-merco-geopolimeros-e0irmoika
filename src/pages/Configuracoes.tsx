import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/lib/auth/permissions'
import { sectionUrl } from '@/lib/navigation'
import { PageHeader } from '@/components/crm/ui'

// Configurações: os cadastros que alimentam o trabalho (catálogo, composições,
// unidades, parâmetros e modelos), separados do dia a dia. Cada entrada abre a
// seção real; permissões continuam no servidor.
type Entry = { title: string; description: string; to: string; roles: readonly UserRole[] }

const ENTRIES: Array<{ group: string; items: Entry[] }> = [
  {
    group: 'Engenharia',
    items: [
      { title: 'Biblioteca técnica', description: 'Composições versionadas com insumos, recursos e coeficientes.', to: '/biblioteca', roles: ['engenharia', 'admin'] },
      { title: 'Catálogo', description: 'Itens de serviço, materiais e equipamentos com vigência e homologação.', to: sectionUrl('catalogo'), roles: ['engenharia', 'admin'] },
      { title: 'Unidades e dimensões', description: 'Unidades homologadas usadas nas fichas e composições.', to: '/unidades', roles: ['engenharia', 'admin'] },
    ],
  },
  {
    group: 'Comercial e financeiro',
    items: [
      { title: 'Regras e SLA do piloto', description: 'BDI, ISS, margem, SLA e alçadas, com homologação.', to: sectionUrl('sla'), roles: ['engenharia', 'financeiro', 'admin'] },
      { title: 'Modelos de proposta', description: 'Modelos aprovados usados para gerar a proposta.', to: sectionUrl('modelos'), roles: ['engenharia', 'financeiro', 'admin'] },
    ],
  },
]

export default function Configuracoes() {
  const { user } = useAuth()
  const role = user?.role
  const groups = ENTRIES.map((group) => ({ ...group, items: group.items.filter((item) => role && item.roles.includes(role)) })).filter(
    (group) => group.items.length > 0,
  )
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Sistema" title="Configurações" description="Os cadastros que alimentam fichas, composições e propostas." />
      {groups.length === 0 && <p className="text-sm text-mg-muted">Nenhuma configuração disponível para o seu perfil.</p>}
      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.group} aria-label={group.group}>
            <h3 className="mg-eyebrow mb-3 text-mg-muted">{group.group}</h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              {group.items.map((item) => (
                <li key={item.title}>
                  <Link
                    to={item.to}
                    className="block h-full rounded-xl border border-mg-line bg-mg-surface p-5 transition-[border-color,box-shadow] duration-150 hover:border-mg-brand/50 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-mg-brand"
                  >
                    <span className="font-bold text-mg-ink">{item.title}</span>
                    <span className="mt-1 block text-[13px] leading-snug text-mg-muted">{item.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
