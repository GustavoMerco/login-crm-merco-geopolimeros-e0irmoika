import pb from '@/lib/pocketbase/client'

export type PilotParamRecord = {
  id: string
  param_type: 'bdi' | 'iss' | 'margem' | 'sla' | 'alcada' | 'arredondamento'
  family: string
  value: string
  unit: string
  source: string
  decision: 'rascunho' | 'homologado' | 'bloqueado'
  blocked_reason: string
  blocked_owner: string
  blocked_deadline: string
  notes: string
  created_by: string
  homologated_by: string
  homologated_at: string
  created: string
}

export type CreatePilotParamInput = {
  param_type: 'bdi' | 'iss' | 'margem' | 'sla' | 'alcada' | 'arredondamento'
  family: string
  value?: string
  unit?: string
  source: string
  decision: 'rascunho' | 'bloqueado'
  blocked_reason?: string
  blocked_owner?: string
  blocked_deadline?: string
  notes?: string
}

export type ParamStatusItem = {
  id?: string
  paramType: string
  family: string
  value?: string
  unit?: string
  source?: string
  decision: 'rascunho' | 'homologado' | 'bloqueado' | 'ausente'
  blockedReason?: string
  blockedOwner?: string
  blockedDeadline?: string
  homologatedAt?: string
}

export type ParamStatusResponse = {
  items: ParamStatusItem[]
  gate: { family: string; open: boolean; detail: string }
}

export const getPilotParams = async () => {
  const result = await pb.collection('pilot_params').getList<PilotParamRecord>(1, 100, {
    sort: '-created',
  })
  return result.items
}

export const getPilotParamsStatus = () =>
  pb.send<ParamStatusResponse>('/backend/v1/pilot-params/status', { method: 'GET' })

export const createPilotParam = (input: CreatePilotParamInput) =>
  pb.send<{ id: string; decision: string }>('/backend/v1/pilot-params', {
    method: 'POST',
    body: JSON.stringify(input),
    headers: { 'Content-Type': 'application/json' },
  })

export const homologatePilotParam = (id: string, value: string, unit?: string) =>
  pb.send<{ id: string; decision: string; homologatedAt: string }>(
    '/backend/v1/pilot-params/homologate',
    {
      method: 'POST',
      body: JSON.stringify({ id, value, unit }),
      headers: { 'Content-Type': 'application/json' },
    },
  )
