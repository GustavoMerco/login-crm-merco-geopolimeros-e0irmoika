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
// legado por seção até a task de extração correspondente (T2.32, T2.34, T2.36).
const STANDALONE_ROUTES: Record<string, string> = {
  biblioteca: '/biblioteca',
  demanda: '/demandas',
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
