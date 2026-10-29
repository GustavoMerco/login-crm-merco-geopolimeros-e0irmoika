import { describe, expect, it } from 'vitest'
import {
  baselineOptionLabel,
  buildReadinessPayload,
  buildSlaOptions,
  slaOptionLabel,
} from './readinessOptions'

const slaHomologado = {
  id: 'pbc_sla_0000001',
  param_type: 'sla' as const,
  family: 'geotecnia',
  value: '48',
  unit: 'h',
  source: 'RN-21',
  decision: 'homologado' as const,
}
const slaRascunho = { ...slaHomologado, id: 'pbc_sla_0000002', decision: 'rascunho' as const }
const slaOutroTipo = { ...slaHomologado, id: 'pbc_sla_0000003', param_type: 'bdi' as const }
const slaBloqueado = { ...slaHomologado, id: 'pbc_sla_0000004', decision: 'bloqueado' as const }

describe('T2.34 — seleção por rótulos na prontidão', () => {
  it('oferece apenas SLA homologado; rascunho, bloqueado e outro tipo ficam de fora', () => {
    const options = buildSlaOptions([slaHomologado, slaRascunho, slaOutroTipo, slaBloqueado])
    expect(options).toHaveLength(1)
    expect(options[0]).toEqual({
      id: 'pbc_sla_0000001',
      family: 'geotecnia',
      value: '48',
      unit: 'h',
      source: 'RN-21',
    })
  })

  it('rótulo do SLA mostra família, valor, unidade e fonte — nunca o ID', () => {
    const [option] = buildSlaOptions([slaHomologado])
    const label = slaOptionLabel(option)
    expect(label).toContain('geotecnia')
    expect(label).toContain('48')
    expect(label).toContain('h')
    expect(label).toContain('RN-21')
    expect(label).not.toContain('pbc_sla_0000001')
  })

  it('rótulo do SLA sem unidade não deixa espaço órfão', () => {
    const [option] = buildSlaOptions([{ ...slaHomologado, unit: '' }])
    expect(slaOptionLabel(option)).toBe('geotecnia — 48 · fonte: RN-21')
  })

  it('rótulo do baseline mostra família, janela e congelamento — nunca o ID', () => {
    const label = baselineOptionLabel({
      id: 'pbc_base_000001',
      service_family: 'geotecnia',
      window_start: '2026-09-01',
      window_end: '2026-09-30',
      frozen_at: '2026-10-01',
    })
    expect(label).toContain('geotecnia')
    expect(label).toContain('2026-09-01')
    expect(label).toContain('2026-09-30')
    expect(label).toContain('2026-10-01')
    expect(label).not.toContain('pbc_base_000001')
  })

  it('payload enviado ao servidor mantém o contrato vigente, campo a campo', () => {
    const payload = buildReadinessPayload({
      pilot_family: 'geotecnia',
      pilot_owner: 'Engenharia',
      pilot_reason: 'Família aprovada no piloto',
      sla_record_id: 'pbc_sla_0000001',
      baseline_id: 'pbc_base_000001',
      recovery_evidence_ref: 'backup_receipts pbc_bkp_000001',
      phase1_receipt_ref: '05_entregas/fase-1/RECIBO-T1.17.md',
    })
    expect(Object.keys(payload)).toEqual([
      'pilot_family',
      'pilot_owner',
      'pilot_reason',
      'sla_record_id',
      'baseline_id',
      'recovery_evidence_ref',
      'phase1_receipt_ref',
    ])
    expect(payload.sla_record_id).toBe('pbc_sla_0000001')
    expect(payload.baseline_id).toBe('pbc_base_000001')
  })

  it('sem SLA homologado, a lista de opções é vazia (estado vazio honesto)', () => {
    expect(buildSlaOptions([slaRascunho, slaBloqueado])).toEqual([])
    expect(buildSlaOptions([])).toEqual([])
  })
})
