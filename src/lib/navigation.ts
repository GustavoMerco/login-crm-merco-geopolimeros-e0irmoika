import { hasPermission, type UserRole } from '@/lib/auth/permissions'

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
