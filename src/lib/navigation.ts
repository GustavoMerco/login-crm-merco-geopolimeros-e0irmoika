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

export const sectionUrl = (id: string) =>
  id === 'biblioteca' ? '/biblioteca' : `/painel-tecnico?secao=${encodeURIComponent(id)}`

export const legacySectionRedirect = (search: string) =>
  new URLSearchParams(search).get('secao') === 'biblioteca' ? '/biblioteca' : null

export function sectionsForRole(role: UserRole | undefined) {
  return hasPermission(role, 'viewDashboard') ? SECTIONS : []
}
