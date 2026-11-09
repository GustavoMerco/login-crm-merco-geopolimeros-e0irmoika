import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ROLES } from './permissions'
import {
  ACCESS_MODULES,
  DEFAULT_MATRIX,
  isLocked,
  matrixToRows,
  normalizeFlags,
  rowsToMatrix,
  summarize,
  toggleFlag,
} from './accessMatrix'
import { navForRole } from '@/lib/navigation'

// Lê a matriz semeada pela migration 0051 (mesmo texto que o servidor executa).
const MIGRATION = readFileSync(
  path.resolve(__dirname, '../../../pocketbase/migrations/0051_create_role_permissions.js'),
  'utf8',
)
const seedBlock =
  /(const MODULES = \[[\s\S]*?const DEFAULTS = \{[\s\S]*?\n {4}\})/.exec(MIGRATION)?.[1] ?? ''
const seed = new Function(`${seedBlock}; return { MODULES, DEFAULTS };`)() as {
  MODULES: string[]
  DEFAULTS: Record<string, Record<string, boolean[]>>
}

describe('matriz padrão = matriz semeada no servidor', () => {
  it('mesmos módulos, na mesma ordem', () => {
    expect(seed.MODULES).toEqual(ACCESS_MODULES.map((m) => m.id))
  })

  it('mesmos valores para todos os perfis e módulos', () => {
    for (const role of ROLES) {
      for (const { id } of ACCESS_MODULES) {
        const [view, create, edit, del] = seed.DEFAULTS[role][id]
        expect({ role, id, flags: DEFAULT_MATRIX[role][id] }).toEqual({
          role,
          id,
          flags: { view, create, edit, delete: del },
        })
      }
    }
  })
})

describe('regras da matriz', () => {
  it('só o Administrador administra usuários por padrão', () => {
    const withUsers = ROLES.filter((role) => DEFAULT_MATRIX[role].usuarios.view)
    expect(withUsers).toEqual(['admin'])
  })

  it('ninguém além do admin apaga por padrão (dados são preservados)', () => {
    for (const role of ROLES.filter((r) => r !== 'admin')) {
      for (const { id } of ACCESS_MODULES) expect(DEFAULT_MATRIX[role][id].delete).toBe(false)
    }
  })

  it('criar/editar/apagar implica ver; tirar ver tira tudo', () => {
    const base = { view: false, create: false, edit: false, delete: false }
    expect(toggleFlag('comercial', 'clientes', base, 'edit')).toEqual({
      view: true,
      create: false,
      edit: true,
      delete: false,
    })
    expect(
      toggleFlag(
        'comercial',
        'clientes',
        { view: true, create: true, edit: true, delete: false },
        'view',
      ),
    ).toEqual(base)
  })

  it('admin × usuários é fixo e sempre total', () => {
    expect(isLocked('admin', 'usuarios')).toBe(true)
    expect(isLocked('engenharia', 'usuarios')).toBe(false)
    expect(
      normalizeFlags('admin', 'usuarios', {
        view: false,
        create: false,
        edit: false,
        delete: false,
      }),
    ).toEqual({
      view: true,
      create: true,
      edit: true,
      delete: true,
    })
  })

  it('linhas ↔ matriz sem perda', () => {
    const rows = matrixToRows(DEFAULT_MATRIX)
    expect(rows).toHaveLength(ROLES.length * ACCESS_MODULES.length)
    expect(rowsToMatrix(rows)).toEqual(DEFAULT_MATRIX)
  })

  it('resumo em linguagem de gente', () => {
    expect(summarize(DEFAULT_MATRIX.admin.demandas)).toBe('Total')
    expect(summarize(DEFAULT_MATRIX.comercial.demandas)).toBe('Ver e editar')
    expect(summarize(DEFAULT_MATRIX.gestao.demandas)).toBe('Só ver')
    expect(summarize(DEFAULT_MATRIX.comercial.usuarios)).toBe('Sem acesso')
  })
})

describe('menu segue a matriz', () => {
  const ids = (role: (typeof ROLES)[number], can: (m: string) => boolean) =>
    navForRole(role, can).flatMap((g) => g.items.map((i) => i.id))

  it('admin vê "Usuários e permissões"; comercial não', () => {
    expect(ids('admin', (m) => DEFAULT_MATRIX.admin[m as 'demandas'].view)).toContain('usuarios')
    expect(ids('comercial', (m) => DEFAULT_MATRIX.comercial[m as 'demandas'].view)).not.toContain(
      'usuarios',
    )
  })

  it('tirar "ver" de demandas some com Hoje, Funil e Demandas', () => {
    const list = ids(
      'comercial',
      (m) => m !== 'demandas' && DEFAULT_MATRIX.comercial[m as 'demandas'].view,
    )
    expect(list).not.toContain('hoje')
    expect(list).not.toContain('funil')
    expect(list).toContain('clientes')
  })

  it('dar "usuarios" a um perfil faz o item aparecer para ele', () => {
    expect(
      ids('gestao', (m) => m === 'usuarios' || DEFAULT_MATRIX.gestao[m as 'demandas'].view),
    ).toContain('usuarios')
  })
})
