import { describe, expect, it } from 'vitest'
import { SECTIONS, sectionUrl, sectionsForRole } from './navigation'
import { ROLES } from './auth/permissions'
describe('T2.14 UX-006-NAV', () => {
  it('mapeia as 14 funções existentes sem duplicar destinos', () => {
    expect(SECTIONS).toHaveLength(14)
    expect(new Set(SECTIONS.map(([id]) => id)).size).toBe(14)
    for (const [id] of SECTIONS) expect(sectionUrl(id)).toBe(`/painel-tecnico?secao=${id}`)
  })
  it.each(ROLES)('preserva leitura existente para %s sem conceder mutação', (role) => {
    expect(sectionsForRole(role)).toEqual(SECTIONS)
  })
  it('falha fechada sem papel ou papel desconhecido', () => {
    expect(sectionsForRole(undefined)).toEqual([])
    expect(sectionsForRole('desconhecido' as never)).toEqual([])
  })
  it('não apresenta módulos fictícios', () => {
    expect(SECTIONS.map(([, label]) => label)).not.toContain('Clientes')
    expect(SECTIONS.map(([, label]) => label)).not.toContain('Projetos')
  })
})
