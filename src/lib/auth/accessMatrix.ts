import type { UserRole } from '@/lib/auth/permissions'

// Matriz perfil × módulo (ver, criar, editar, apagar). A fonte da verdade é a
// tabela role_permissions no servidor (migration 0051), administrada em
// Admin → Usuários e permissões. DEFAULT_MATRIX é a configuração inicial,
// idêntica à semeada pela migration, e serve de reserva se o servidor não
// responder. "Apagar" usuário = desativar (sem exclusão física).
export const ACCESS_MODULES = [
  {
    id: 'demandas',
    label: 'Demandas e funil',
    description: 'Cadastrar e acompanhar oportunidades da demanda ao envio.',
  },
  { id: 'clientes', label: 'Clientes', description: 'Empresas, contatos e histórico.' },
  { id: 'ficha', label: 'Ficha técnica', description: 'Parâmetros técnicos de cada oportunidade.' },
  {
    id: 'biblioteca',
    label: 'Biblioteca técnica',
    description: 'Composições, insumos e recursos.',
  },
  { id: 'catalogo', label: 'Catálogo', description: 'Itens de serviço, materiais e equipamentos.' },
  { id: 'unidades', label: 'Unidades', description: 'Unidades e dimensões homologadas.' },
  { id: 'parametros', label: 'Regras e SLA', description: 'BDI, ISS, margem, SLA e alçadas.' },
  {
    id: 'modelos',
    label: 'Modelos de proposta',
    description: 'Modelos aprovados para a proposta.',
  },
  { id: 'painel', label: 'Painel', description: 'Indicadores de volume, prazo e tempo.' },
  {
    id: 'evidencias',
    label: 'Evidências e controles',
    description: 'Baseline, gates, backup, auditorias e provas.',
  },
  {
    id: 'usuarios',
    label: 'Usuários e permissões',
    description: 'Criar usuários, definir perfis e permissões.',
  },
] as const

export type AccessModule = (typeof ACCESS_MODULES)[number]['id']
export const ACCESS_ACTIONS = ['view', 'create', 'edit', 'delete'] as const
export type AccessAction = (typeof ACCESS_ACTIONS)[number]
export const ACTION_LABELS: Record<AccessAction, string> = {
  view: 'Ver',
  create: 'Criar',
  edit: 'Editar',
  delete: 'Apagar',
}

export type ModuleFlags = Record<AccessAction, boolean>
export type RoleMatrix = Record<AccessModule, ModuleFlags>

const NONE: ModuleFlags = { view: false, create: false, edit: false, delete: false }
const VIEW: ModuleFlags = { view: true, create: false, edit: false, delete: false }
const WRITE: ModuleFlags = { view: true, create: true, edit: true, delete: false }
const FULL: ModuleFlags = { view: true, create: true, edit: true, delete: true }

export const DEFAULT_MATRIX: Record<UserRole, RoleMatrix> = {
  admin: {
    demandas: FULL,
    clientes: FULL,
    ficha: FULL,
    biblioteca: FULL,
    catalogo: FULL,
    unidades: FULL,
    parametros: FULL,
    modelos: FULL,
    painel: VIEW,
    evidencias: FULL,
    usuarios: FULL,
  },
  engenharia: {
    demandas: WRITE,
    clientes: WRITE,
    ficha: WRITE,
    biblioteca: WRITE,
    catalogo: WRITE,
    unidades: WRITE,
    parametros: WRITE,
    modelos: WRITE,
    painel: VIEW,
    evidencias: VIEW,
    usuarios: NONE,
  },
  comercial: {
    demandas: WRITE,
    clientes: WRITE,
    ficha: VIEW,
    biblioteca: VIEW,
    catalogo: NONE,
    unidades: NONE,
    parametros: NONE,
    modelos: NONE,
    painel: VIEW,
    evidencias: NONE,
    usuarios: NONE,
  },
  financeiro: {
    demandas: VIEW,
    clientes: VIEW,
    ficha: NONE,
    biblioteca: NONE,
    catalogo: VIEW,
    unidades: NONE,
    parametros: WRITE,
    modelos: VIEW,
    painel: VIEW,
    evidencias: NONE,
    usuarios: NONE,
  },
  aprovador: {
    demandas: VIEW,
    clientes: VIEW,
    ficha: VIEW,
    biblioteca: NONE,
    catalogo: NONE,
    unidades: NONE,
    parametros: VIEW,
    modelos: VIEW,
    painel: VIEW,
    evidencias: NONE,
    usuarios: NONE,
  },
  gestao: {
    demandas: VIEW,
    clientes: VIEW,
    ficha: VIEW,
    biblioteca: VIEW,
    catalogo: VIEW,
    unidades: VIEW,
    parametros: VIEW,
    modelos: VIEW,
    painel: VIEW,
    evidencias: VIEW,
    usuarios: NONE,
  },
}

// Criar, editar ou apagar implica ver; tirar "ver" tira o resto. O admin
// nunca perde "usuarios" (o servidor aplica a mesma regra).
export function normalizeFlags(
  role: UserRole,
  module: AccessModule,
  flags: ModuleFlags,
): ModuleFlags {
  if (role === 'admin' && module === 'usuarios') return { ...FULL }
  if (!flags.view && (flags.create || flags.edit || flags.delete)) return { ...flags, view: true }
  return { ...flags }
}

export function toggleFlag(
  role: UserRole,
  module: AccessModule,
  flags: ModuleFlags,
  action: AccessAction,
): ModuleFlags {
  const next = { ...flags, [action]: !flags[action] }
  if (action === 'view' && !next.view) return normalizeFlags(role, module, { ...NONE })
  return normalizeFlags(role, module, next)
}

export function isLocked(role: UserRole, module: AccessModule): boolean {
  return role === 'admin' && module === 'usuarios'
}

export type MatrixRow = {
  role: UserRole
  module: AccessModule
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
}

export function rowsToMatrix(rows: MatrixRow[]): Record<UserRole, RoleMatrix> {
  const matrix = JSON.parse(JSON.stringify(DEFAULT_MATRIX)) as Record<UserRole, RoleMatrix>
  for (const row of rows) {
    if (!matrix[row.role] || !(row.module in matrix[row.role])) continue
    matrix[row.role][row.module] = {
      view: row.can_view,
      create: row.can_create,
      edit: row.can_edit,
      delete: row.can_delete,
    }
  }
  return matrix
}

export function matrixToRows(matrix: Record<UserRole, RoleMatrix>): MatrixRow[] {
  return (Object.keys(matrix) as UserRole[]).flatMap((role) =>
    ACCESS_MODULES.map(({ id }) => ({
      role,
      module: id,
      can_view: matrix[role][id].view,
      can_create: matrix[role][id].create,
      can_edit: matrix[role][id].edit,
      can_delete: matrix[role][id].delete,
    })),
  )
}

export function summarize(flags: ModuleFlags): string {
  if (flags.view && flags.create && flags.edit && flags.delete) return 'Total'
  if (flags.view && flags.create && flags.edit) return 'Ver e editar'
  if (flags.view && (flags.create || flags.edit || flags.delete)) return 'Parcial'
  if (flags.view) return 'Só ver'
  return 'Sem acesso'
}
