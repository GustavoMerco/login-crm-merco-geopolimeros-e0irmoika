import pb from '@/lib/pocketbase/client'

export type ReadinessLink = {
  ref: string
  valid: boolean
  label: string
}

export type ReadinessBlocker = {
  key: string
  reason: string
  owner: string
  openedAt: string
}

export type ReadinessStatus = {
  status: 'bloqueado' | 'aprovado' | 'invalidado'
  family: string
  approvedBy: string
  approvedAt: string
  blockers: ReadinessBlocker[]
  links: Record<string, ReadinessLink>
  detail: string
}

export type ApproveReadinessInput = {
  pilot_family: string
  pilot_owner: string
  pilot_reason: string
  sla_record_id: string
  baseline_id: string
  recovery_evidence_ref: string
  phase1_receipt_ref: string
}

export const getReadiness = () =>
  pb.send<ReadinessStatus>('/backend/v1/dimensioning/readiness', { method: 'GET' })

export const approveReadiness = (input: ApproveReadinessInput) =>
  pb.send<{ id: string; status: string; family: string; approvedAt: string }>(
    '/backend/v1/dimensioning/readiness/approve',
    {
      method: 'POST',
      body: JSON.stringify(input),
      headers: { 'Content-Type': 'application/json' },
    },
  )

// T2.5 — prova do motor decimal no servidor (SPEC-2-003; D-T2.5). Somente
// leitura: o servidor executa fixtures sintéticas fixas e nada é gravado.
export type CalculationStep = {
  passo: number
  operacao: string
  a: { valor: string; unidade: string; origem: string }
  b: { valor: string; unidade: string; origem: string }
  resultado: { valor: string; unidade: string }
  exato: boolean
}

export type CalculationProofCase = {
  id: string
  tipo: 'GREEN' | 'RED'
  descricao: string
  esperado: string
  obtido: string
  mensagem: string
  passou: boolean
}

export type CalculationProofReport = {
  modo: 'simulacao'
  aprovacao: false
  aviso: string
  runtime: string
  executadoEm: string
  versaoMotor: string
  resumo: { total: number; passou: number; falhou: number }
  casos: CalculationProofCase[]
  memoria: {
    resultado: { valor: string; unidade: string }
    bruto: string
    precisao: number
    arredondamento: string
    passos: CalculationStep[]
  } | null
}

export const runCalculationProof = () =>
  pb.send<CalculationProofReport>('/backend/v1/dimensioning/selftest', { method: 'GET' })
