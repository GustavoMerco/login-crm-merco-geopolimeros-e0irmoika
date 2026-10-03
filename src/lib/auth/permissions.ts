export const ROLES = [
  'comercial',
  'engenharia',
  'financeiro',
  'aprovador',
  'gestao',
  'admin',
] as const

export type UserRole = (typeof ROLES)[number]

export const ROLE_LABELS: Record<UserRole, string> = {
  comercial: 'Comercial técnico',
  engenharia: 'Engenharia',
  financeiro: 'Financeiro',
  aprovador: 'Aprovador',
  gestao: 'Gestão',
  admin: 'Administrador',
}

export const PERMISSIONS = {
  viewDashboard: ['comercial', 'engenharia', 'financeiro', 'aprovador', 'gestao', 'admin'],
  homologateCatalog: ['engenharia', 'admin'],
  approveReadiness: ['engenharia', 'admin'],
  manageCompositions: ['engenharia', 'admin'],
} as const satisfies Record<string, readonly UserRole[]>

export type Permission = keyof typeof PERMISSIONS

export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  return role !== undefined && PERMISSIONS[permission].includes(role)
}

export function canAccess(role: UserRole | undefined, permission: Permission): boolean {
  return hasPermission(role, permission)
}
