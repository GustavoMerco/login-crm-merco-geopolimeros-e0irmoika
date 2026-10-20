import { hasPermission, type UserRole } from '@/lib/auth/permissions'

// Leitura preserva o contrato atual: GETs das seções exigem autenticação;
// ações de escrita continuam guardadas no servidor e nos formulários existentes.
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
export const sectionUrl = (id: string) => `/painel-tecnico?secao=${encodeURIComponent(id)}`
export function sectionsForRole(role: UserRole | undefined) {
  return hasPermission(role, 'viewDashboard') ? SECTIONS : []
}
