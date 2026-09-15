import pb from '@/lib/pocketbase/client'

export type SourceAuditRecord = {
  id: string
  system: 'vobi' | 'omie'
  coverage: string
  source_of_truth: string
  access_method: 'manual' | 'exportacao' | 'api'
  fields_available: string
  gaps: string
  decision: 'integrar' | 'importar' | 'nao_usar'
  decision_reason: string
  decision_owner: string
  decision_date: string
  created_by: string
  created: string
  updated: string
}

export type SourceAuditMatrixItem = {
  id?: string
  system: 'vobi' | 'omie'
  decision: 'integrar' | 'importar' | 'nao_usar' | 'nao_auditado'
  coverage?: string
  sourceOfTruth?: string
  accessMethod?: 'manual' | 'exportacao' | 'api'
  fieldsAvailable?: string
  gaps?: string
  decisionReason?: string
  decisionOwner?: string
  decisionDate?: string
}

export type CreateSourceAuditInput = {
  system: 'vobi' | 'omie'
  coverage: string
  source_of_truth: string
  access_method: 'manual' | 'exportacao' | 'api'
  fields_available?: string
  gaps?: string
  decision: 'integrar' | 'importar' | 'nao_usar'
  decision_reason: string
  decision_owner: string
  decision_date: string
}

export const getSourceAudits = async () => {
  const result = await pb.collection('source_audits').getList<SourceAuditRecord>(1, 50, {
    sort: '-updated',
  })
  return result.items
}

export const getSourceAuditMatrix = () =>
  pb.send<{ matrix: SourceAuditMatrixItem[] }>('/backend/v1/source-audits', { method: 'GET' })

export const createSourceAudit = (input: CreateSourceAuditInput) =>
  pb.send<{ id: string; system: string; decision: string }>('/backend/v1/source-audits', {
    method: 'POST',
    body: JSON.stringify(input),
    headers: { 'Content-Type': 'application/json' },
  })

export const updateSourceDecision = (
  id: string,
  input: {
    decision: 'integrar' | 'importar' | 'nao_usar'
    decision_reason: string
    decision_owner: string
    decision_date: string
  },
) =>
  pb.send<{ id: string; decision: string }>('/backend/v1/source-audits/decide', {
    method: 'POST',
    body: JSON.stringify({ id, ...input }),
    headers: { 'Content-Type': 'application/json' },
  })
