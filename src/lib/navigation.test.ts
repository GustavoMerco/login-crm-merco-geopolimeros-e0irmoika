import { describe, expect, it } from 'vitest'
import { SECTIONS, sectionUrl, sectionsForRole, legacySectionRedirect } from './navigation'
import { ROLES } from './auth/permissions'

describe('navigation routes (T2.14 / T2.15)', () => {
  it('maps all 14 existing functions without duplicate destinations', () => {
    expect(SECTIONS).toHaveLength(14)
    expect(new Set(SECTIONS.map(([id]) => id)).size).toBe(14)
    for (const [id] of SECTIONS) {
      if (id === 'biblioteca') expect(sectionUrl(id)).toBe('/biblioteca')
      else expect(sectionUrl(id)).toBe(`/painel-tecnico?secao=${id}`)
    }
  })

  it('keeps the old Biblioteca URL compatible by redirecting to the standalone page', () => {
    expect(legacySectionRedirect('?secao=biblioteca')).toBe('/biblioteca')
    expect(legacySectionRedirect('?secao=biblioteca&retorno=1')).toBe('/biblioteca')
    expect(legacySectionRedirect('?secao=ficha')).toBeNull()
    expect(legacySectionRedirect('')).toBeNull()
  })

  it.each(ROLES)('preserves current read navigation for %s without granting mutation', (role) => {
    expect(sectionsForRole(role)).toEqual(SECTIONS)
  })

  it('fails closed without a role or with an unknown role', () => {
    expect(sectionsForRole(undefined)).toEqual([])
    expect(sectionsForRole('desconhecido' as never)).toEqual([])
  })

  it('does not present fictional CRM modules', () => {
    expect(SECTIONS.map(([, label]) => label)).not.toContain('Clientes')
    expect(SECTIONS.map(([, label]) => label)).not.toContain('Projetos')
  })
})
