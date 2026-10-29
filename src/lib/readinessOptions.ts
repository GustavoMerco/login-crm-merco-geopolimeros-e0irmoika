// T2.34 — prova de unidade do recorte de seleção por rótulos.
// Verifica (1) construção das opções de SLA homologado a partir de pilot_params,
// (2) que as opções de baseline são exatamente a lista autorizada carregada,
// (3) que o payload enviado para approveReadiness é idêntico ao contrato vigente
// (mesmos campos; IDs vêm das opções selecionadas, nunca digitados).

export type SlaOption = { id: string; family: string; value: string; unit: string; source: string }
export type BaselineOption = {
  id: string
  service_family: string
  window_start: string
  window_end: string
  frozen_at: string
}

type PilotParamLike = {
  id: string
  param_type: 'bdi' | 'iss' | 'margem' | 'sla' | 'alcada' | 'arredondamento'
  family: string
  value: string
  unit: string
  source: string
  decision: 'rascunho' | 'homologado' | 'bloqueado'
}

export function buildSlaOptions(params: PilotParamLike[]): SlaOption[] {
  return params
    .filter((param) => param.param_type === 'sla' && param.decision === 'homologado')
    .map((param) => ({
      id: param.id,
      family: param.family,
      value: param.value,
      unit: param.unit,
      source: param.source,
    }))
}

export function slaOptionLabel(option: SlaOption): string {
  return (
    option.family +
    ' — ' +
    option.value +
    (option.unit ? ' ' + option.unit : '') +
    ' · fonte: ' +
    option.source
  )
}

export function baselineOptionLabel(option: BaselineOption): string {
  return (
    option.service_family +
    ' — janela ' +
    option.window_start +
    ' a ' +
    option.window_end +
    ' · congelado em ' +
    option.frozen_at
  )
}

/** Payload do approveReadiness: contrato vigente, inalterado pela T2.34. */
export function buildReadinessPayload(form: {
  pilot_family: string
  pilot_owner: string
  pilot_reason: string
  sla_record_id: string
  baseline_id: string
  recovery_evidence_ref: string
  phase1_receipt_ref: string
}) {
  return {
    pilot_family: form.pilot_family,
    pilot_owner: form.pilot_owner,
    pilot_reason: form.pilot_reason,
    sla_record_id: form.sla_record_id,
    baseline_id: form.baseline_id,
    recovery_evidence_ref: form.recovery_evidence_ref,
    phase1_receipt_ref: form.phase1_receipt_ref,
  }
}
