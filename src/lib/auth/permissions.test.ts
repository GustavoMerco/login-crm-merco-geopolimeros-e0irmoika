import { describe, it, expect } from 'vitest'
import { ROLES, ROLE_LABELS, PERMISSIONS, hasPermission, canAccess } from './permissions'

describe('ROLES', () => {
  it('contém os seis papéis do sistema', () => {
    expect(ROLES).toEqual(['comercial', 'engenharia', 'financeiro', 'aprovador', 'gestao', 'admin'])
  })
})

describe('ROLE_LABELS', () => {
  it('rotula todos os papéis', () => {
    for (const role of ROLES) {
      expect(typeof ROLE_LABELS[role]).toBe('string')
      expect(ROLE_LABELS[role].length).toBeGreaterThan(0)
    }
  })
})

describe('PERMISSIONS', () => {
  it('inclui approveReadiness restrito a engenharia/admin (T2.2)', () => {
    expect(PERMISSIONS.approveReadiness).toEqual(['engenharia', 'admin'])
  })

  it('mantém homologateCatalog intacto (não ampliar permissões antigas)', () => {
    expect(PERMISSIONS.homologateCatalog).toEqual(['engenharia', 'admin'])
  })
})

describe('hasPermission', () => {
  it('engenharia pode aprovar prontidão', () => {
    expect(hasPermission('engenharia', 'approveReadiness')).toBe(true)
  })

  it('admin pode aprovar prontidão', () => {
    expect(hasPermission('admin', 'approveReadiness')).toBe(true)
  })

  it('comercial NÃO pode aprovar prontidão (REG-P2-001)', () => {
    expect(hasPermission('comercial', 'approveReadiness')).toBe(false)
  })

  it('papel ausente é negado', () => {
    expect(hasPermission(undefined, 'approveReadiness')).toBe(false)
  })
})

describe('canAccess', () => {
  it('delega para hasPermission', () => {
    expect(canAccess('admin', 'approveReadiness')).toBe(true)
    expect(canAccess('financeiro', 'approveReadiness')).toBe(false)
  })
})
