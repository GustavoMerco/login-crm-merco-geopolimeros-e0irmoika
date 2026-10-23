import { describe, expect, it } from 'vitest'
import { SECTIONS, sectionUrl, sectionsForRole, legacySectionRedirect } from './navigation'
import { ROLES } from './auth/permissions'

describe('navigation routes (T2.14 / T2.15 / T2.31 / T2.32)', () => {
  it('maps all 14 existing functions without duplicate destinations', () => {
    expect(SECTIONS).toHaveLength(14)
    expect(new Set(SECTIONS.map(([id]) => id)).size).toBe(14)
    for (const [id] of SECTIONS) {
      if (id === 'biblioteca') expect(sectionUrl(id)).toBe('/biblioteca')
      else if (id === 'demanda') expect(sectionUrl(id)).toBe('/demandas')
      else if (id === 'ficha') expect(sectionUrl(id)).toBe('/ficha')
      else expect(sectionUrl(id)).toBe(`/painel-tecnico?secao=${id}`)
    }
  })

  it('keeps old URLs compatible by redirecting extracted sections', () => {
    expect(legacySectionRedirect('?secao=biblioteca')).toBe('/biblioteca')
    expect(legacySectionRedirect('?secao=biblioteca&retorno=1')).toBe('/biblioteca')
    expect(legacySectionRedirect('?secao=demanda')).toBe('/demandas')
    expect(legacySectionRedirect('?secao=ficha')).toBe('/ficha')
    expect(legacySectionRedirect('?secao=prontidao')).toBeNull()
    expect(legacySectionRedirect('')).toBeNull()
  })

  it('does not redirect unknown sections to an invented route', () => {
    expect(legacySectionRedirect('?secao=inexistente')).toBeNull()
    expect(legacySectionRedirect('?secao=')).toBeNull()
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
