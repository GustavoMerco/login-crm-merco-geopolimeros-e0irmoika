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
