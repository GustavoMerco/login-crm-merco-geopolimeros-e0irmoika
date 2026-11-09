import pb from '@/lib/pocketbase/client'
import type { UserRole } from '@/lib/auth/permissions'
import type { AccessModule, MatrixRow } from '@/lib/auth/accessMatrix'

// Área de admin: usuários e perfis/permissões (rotas server-side; o servidor
// valida perfil, matriz e guardas, e audita cada mudança).
export type AdminUser = {
  id: string
  name: string
  email: string
  role: UserRole
  disabled: boolean
  created: string
}

export type CreateUserInput = { name: string; email: string; role: UserRole; password: string }
export type UpdateUserInput = { name?: string; role?: UserRole; disabled?: boolean }

const json = { 'Content-Type': 'application/json' }

export const listUsers = () => pb.send<{ items: AdminUser[] }>('/backend/v1/admin/users', { method: 'GET' })

export const createUser = (input: CreateUserInput) =>
  pb.send<AdminUser>('/backend/v1/admin/users', { method: 'POST', body: JSON.stringify(input), headers: json })

export const updateUser = (id: string, input: UpdateUserInput) =>
  pb.send<AdminUser>(`/backend/v1/admin/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
    headers: json,
  })

export const getPermissionMatrix = () =>
  pb.send<{ items: Array<MatrixRow & { updated: string; updated_by: string }> }>('/backend/v1/admin/permissions', { method: 'GET' })

export const savePermissionMatrix = (items: MatrixRow[]) =>
  pb.send<{ changed: number }>('/backend/v1/admin/permissions', { method: 'PUT', body: JSON.stringify({ items }), headers: json })

export type MyPermissions = {
  role: UserRole
  modules: Partial<Record<AccessModule, { view: boolean; create: boolean; edit: boolean; delete: boolean }>>
}

export const getMyPermissions = () => pb.send<MyPermissions>('/backend/v1/me/permissions', { method: 'GET' })

// Senha inicial forte e legível (sem caracteres ambíguos), gerada no navegador.
export function generatePassword(length = 14): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const values = new Uint32Array(length)
  crypto.getRandomValues(values)
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join('')
}
