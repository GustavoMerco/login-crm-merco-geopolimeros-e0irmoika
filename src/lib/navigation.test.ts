import { describe, expect, it } from 'vitest'
import {
  ADMIN_INDEX,
  ADMIN_INDEX_URL,
  SECTIONS,
  sectionUrl,
  sectionsForRole,
  legacySectionRedirect,
} from './navigation'
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

describe('T2.36 — índice administrativo', () => {
  it('lista exatamente os 10 destinos administrativos da SPEC + unidades, sem inventar destino', () => {
    const ids = ADMIN_INDEX.map((entry) => entry.id)
    expect(ids).toEqual([
      'catalogo',
      'sla',
      'baseline',
      'backup',
      'fontes',
      'gates',
      'modelos',
      'previa',
      'qualidade',
      'tempo',
      'unidades',
    ])
  })

  it('cada destino aponta para seção/rota existente (entrada contextual, sem extração)', () => {
    for (const entry of ADMIN_INDEX) {
      if (entry.id === 'unidades') {
        expect(entry.url).toBe('/unidades')
      } else {
        expect(entry.url).toBe(`/painel-tecnico?secao=${entry.id}`)
      }
    }
  })

  it('rótulos do índice são os mesmos das seções existentes (nenhum nome novo de função)', () => {
    const sectionLabels = new Map(SECTIONS)
    for (const entry of ADMIN_INDEX) {
      if (entry.id === 'unidades') continue
      const sectionId = entry.id as (typeof SECTIONS)[number][0]
      expect(sectionLabels.get(sectionId)).toBe(entry.label)
    }
  })

  it('cada entrada tem descrição de produto não vazia', () => {
    for (const entry of ADMIN_INDEX) {
      expect(entry.description.length).toBeGreaterThan(10)
    }
  })

  it('índice não concede acesso novo: usa viewDashboard vigente, papel a papel', () => {
    for (const role of ROLES) {
      // A visibilidade do índice segue a mesma permissão de leitura do painel.
      expect(sectionsForRole(role).length > 0).toBe(true)
    }
    expect(sectionsForRole(undefined)).toEqual([])
  })

  it('url do índice é constante estável para menu e testes', () => {
    expect(ADMIN_INDEX_URL).toBe('/administracao')
  })
})
