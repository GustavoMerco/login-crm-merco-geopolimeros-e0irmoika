import { hasPermission, type UserRole } from '@/lib/auth/permissions'
import type { AccessModule } from '@/lib/auth/accessMatrix'

// Leitura preserva o contrato atual; o servidor continua sendo autoridade para mutações.
export const SECTIONS = [
  ['demanda', 'Oportunidades'],
  ['ficha', 'Ficha técnica'],
  ['biblioteca', 'Biblioteca técnica'],
  ['prontidao', 'Prontidão da família'],
  ['catalogo', 'Catálogo'],
  ['backup', 'Backup e exportação'],
  ['modelos', 'Modelos de proposta'],
  ['previa', 'Prévia sem preço'],
  ['fontes', 'Auditoria VOBI/OMIE'],
  ['gates', 'Gates e cortes'],
  ['sla', 'Regras e SLA do piloto'],
  ['baseline', 'Baseline'],
  ['qualidade', 'Qualidade do tempo'],
  ['tempo', 'Marcos e tempo'],
] as const

// Superfícies já extraídas para página própria. As demais continuam no painel
// legado por seção até a task de extração correspondente (T2.34, T2.36).
const STANDALONE_ROUTES: Record<string, string> = {
  biblioteca: '/biblioteca',
  demanda: '/demandas',
  ficha: '/ficha',
}

export const sectionUrl = (id: string) =>
  STANDALONE_ROUTES[id] ?? `/painel-tecnico?secao=${encodeURIComponent(id)}`

export const legacySectionRedirect = (search: string) => {
  const section = new URLSearchParams(search).get('secao')
  return section ? (STANDALONE_ROUTES[section] ?? null) : null
}

export function sectionsForRole(role: UserRole | undefined) {
  return hasPermission(role, 'viewDashboard') ? SECTIONS : []
}

// T2.36 — índice administrativo: destinos autorizados das funções administrativas
// existentes, com descrição de produto e entrada contextual às seções reais.
// Nenhum destino inventado: cada id existe como seção/rota hoje; o índice só navega.
export type AdminEntry = {
  id: string
  label: string
  description: string
  url: string
}

export const ADMIN_INDEX: AdminEntry[] = [
  {
    id: 'catalogo',
    label: 'Catálogo',
    description: 'Itens de serviço, composições e recursos com vigência e homologação.',
    url: sectionUrl('catalogo'),
  },
  {
    id: 'sla',
    label: 'Regras e SLA do piloto',
    description: 'Parâmetros de BDI, ISS, margem, SLA e alçada; homologação pela Engenharia.',
    url: sectionUrl('sla'),
  },
  {
    id: 'baseline',
    label: 'Baseline',
    description: 'Congelamento de números de referência da família para comparação.',
    url: sectionUrl('baseline'),
  },
  {
    id: 'backup',
    label: 'Backup e exportação',
    description: 'Backups, exportações e recibos de restauração com resultado.',
    url: sectionUrl('backup'),
  },
  {
    id: 'fontes',
    label: 'Auditoria VOBI/OMIE',
    description: 'Auditoria das fontes de dados antes de entrar no fluxo técnico.',
    url: sectionUrl('fontes'),
  },
  {
    id: 'gates',
    label: 'Gates e cortes',
    description: 'Controles de liberação por família com escalada e resolução.',
    url: sectionUrl('gates'),
  },
  {
    id: 'modelos',
    label: 'Modelos de proposta',
    description: 'Modelos reais aprovados usados pela prévia; sem preço.',
    url: sectionUrl('modelos'),
  },
  {
    id: 'previa',
    label: 'Prévia sem preço',
    description: 'Prévia de proposta a partir dos modelos; envio permanece negado.',
    url: sectionUrl('previa'),
  },
  {
    id: 'qualidade',
    label: 'Qualidade do tempo',
    description: 'Revisão semanal da qualidade do apontamento de horas.',
    url: sectionUrl('qualidade'),
  },
  {
    id: 'tempo',
    label: 'Marcos e tempo',
    description: 'Consulta de marcos e apontamentos no contexto da demanda.',
    url: sectionUrl('tempo'),
  },
  {
    id: 'unidades',
    label: 'Unidades e dimensões',
    description: 'Cadastro e homologação de unidades pela Engenharia (rota própria da T2.16).',
    url: '/unidades',
  },
]

export const ADMIN_INDEX_URL = '/administracao'

// ---------------------------------------------------------------------------
// Navegação por perfil (reestruturação "CRM de propostas"). O menu do dia a dia
// é organizado pelo trabalho (oportunidade), não pelos módulos técnicos. As
// seções legadas continuam acessíveis pelas URLs e por "Evidências e controles".
// Visibilidade aqui é só conveniência de navegação: o servidor continua sendo a
// autoridade para leitura e mutação.
export type NavItem = {
  id: string
  label: string
  url: string
  description: string
  roles: readonly UserRole[]
  // Módulos da matriz de permissões: o item aparece se o perfil puder ver
  // pelo menos um deles (Admin → Usuários e permissões).
  modules: readonly AccessModule[]
}

export type NavGroup = { id: string; label: string; items: NavItem[] }

const ALL_ROLES: readonly UserRole[] = [
  'comercial',
  'engenharia',
  'financeiro',
  'aprovador',
  'gestao',
  'admin',
]
const TECH_ROLES: readonly UserRole[] = ['comercial', 'engenharia', 'admin']

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'trabalho',
    label: 'Trabalho',
    items: [
      {
        id: 'hoje',
        label: 'Hoje',
        url: '/hoje',
        description: 'Prazos, pendências e o que fazer agora.',
        roles: ['comercial', 'engenharia', 'admin'],
        modules: ['demandas'],
      },
      {
        id: 'funil',
        label: 'Funil de propostas',
        url: '/funil',
        description: 'Oportunidades por etapa, da demanda ao envio.',
        roles: ALL_ROLES,
        modules: ['demandas'],
      },
      {
        id: 'demandas',
        label: 'Demandas',
        url: '/demandas',
        description: 'Lista e cadastro de demandas.',
        roles: ALL_ROLES,
        modules: ['demandas'],
      },
      {
        id: 'clientes',
        label: 'Clientes',
        url: '/clientes',
        description: 'Empresas, contatos e histórico de propostas.',
        roles: ALL_ROLES,
        modules: ['clientes'],
      },
    ],
  },
  {
    id: 'engenharia',
    label: 'Engenharia',
    items: [
      {
        id: 'ficha',
        label: 'Ficha técnica',
        url: '/ficha',
        description: 'Parâmetros técnicos da oportunidade.',
        roles: TECH_ROLES,
        modules: ['ficha'],
      },
      {
        id: 'biblioteca',
        label: 'Biblioteca técnica',
        url: '/biblioteca',
        description: 'Composições, insumos e recursos.',
        roles: TECH_ROLES,
        modules: ['biblioteca'],
      },
    ],
  },
  {
    id: 'gestao',
    label: 'Gestão',
    items: [
      {
        id: 'painel',
        label: 'Painel',
        url: '/painel',
        description: 'Volume, prazos e tempo até o envio.',
        roles: ALL_ROLES,
        modules: ['painel'],
      },
    ],
  },
  {
    id: 'sistema',
    label: 'Sistema',
    items: [
      {
        id: 'configuracoes',
        label: 'Configurações',
        url: '/configuracoes',
        description: 'Catálogo, unidades, parâmetros e modelos.',
        roles: ['engenharia', 'financeiro', 'admin'],
        modules: ['biblioteca', 'catalogo', 'unidades', 'parametros', 'modelos'],
      },
      {
        id: 'usuarios',
        label: 'Usuários e permissões',
        url: '/administracao/usuarios',
        description: 'Criar usuários, definir perfis e permissões.',
        roles: ['admin'],
        modules: ['usuarios'],
      },
      {
        id: 'evidencias',
        label: 'Evidências e controles',
        url: '/administracao',
        description: 'Baseline, gates, backup, auditorias e provas.',
        roles: ['engenharia', 'gestao', 'admin'],
        modules: ['evidencias'],
      },
    ],
  },
]

// Sem matriz (testes, primeiro carregamento): usa os perfis padrão do item.
// Com a matriz do servidor: ela decide, por módulo.
export function navForRole(
  role: UserRole | undefined,
  canView?: (module: AccessModule) => boolean,
): NavGroup[] {
  if (!role) return []
  const visible = (item: NavItem) =>
    canView ? item.modules.some((module) => canView(module)) : item.roles.includes(role)
  return NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter(visible) })).filter(
    (group) => group.items.length > 0,
  )
}

// Página inicial de cada perfil depois do login.
export const ROLE_HOME: Record<UserRole, string> = {
  comercial: '/hoje',
  engenharia: '/hoje',
  financeiro: '/painel',
  aprovador: '/painel',
  gestao: '/painel',
  admin: '/hoje',
}

export function homeForRole(role: UserRole | undefined): string {
  return role ? ROLE_HOME[role] : '/funil'
}

const EXTRA_TITLES: Record<string, string> = {
  '/oportunidade': 'Oportunidade',
  '/unidades': 'Unidades e dimensões',
  '/administracao/prova-calculo': 'Prova do cálculo decimal',
}

// Item ativo e título da página a partir do caminho atual.
export function activeNavItem(pathname: string): NavItem | undefined {
  const items = NAV_GROUPS.flatMap((group) => group.items)
  if (pathname === '/oportunidade') return items.find((item) => item.id === 'funil')
  if (pathname.startsWith('/administracao/usuarios'))
    return items.find((item) => item.id === 'usuarios')
  if (pathname.startsWith('/administracao')) return items.find((item) => item.id === 'evidencias')
  if (pathname === '/unidades') return items.find((item) => item.id === 'configuracoes')
  return items.find((item) => item.url === pathname)
}

// Seções do painel técnico abrem como páginas próprias, com o nome da função
// e o item de menu de onde vieram (Configurações ou Evidências e controles).
const CONFIG_SECTIONS = new Set(['catalogo', 'sla', 'modelos'])

function legacySection(search: string): string {
  const id = new URLSearchParams(search).get('secao') ?? ''
  return SECTIONS.some(([sectionId]) => sectionId === id) ? id : ''
}

export function pageTitle(pathname: string, search = ''): string {
  if (pathname === '/painel-tecnico') {
    const id = legacySection(search)
    return SECTIONS.find(([sectionId]) => sectionId === id)?.[1] ?? 'Funções técnicas'
  }
  return EXTRA_TITLES[pathname] ?? activeNavItem(pathname)?.label ?? 'Merco Geopolímeros'
}

export function activeNavItemFor(pathname: string, search = ''): NavItem | undefined {
  if (pathname !== '/painel-tecnico') return activeNavItem(pathname)
  const id = legacySection(search)
  const items = NAV_GROUPS.flatMap((group) => group.items)
  if (id === 'demanda') return items.find((item) => item.id === 'demandas')
  if (id === 'ficha' || id === 'biblioteca') return items.find((item) => item.id === id)
  return items.find(
    (item) => item.id === (CONFIG_SECTIONS.has(id) ? 'configuracoes' : 'evidencias'),
  )
}
