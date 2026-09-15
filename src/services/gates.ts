import pb from '@/lib/pocketbase/client'

export type GateRecord = {
  id: string
  title: string
  description: string
  owner: string
  decision_deadline: string
  status: 'aberto' | 'resolvido' | 'escalonado'
  resolution: string
  created_by: string
  resolved_by: string
  resolved_at: string
  created: string
}

export type GateStatusItem = {
  id: string
  title: string
  description: string
  owner: string
  decisionDeadline: string
  status: 'aberto' | 'resolvido' | 'escalonado'
  overdue: boolean
  escalations: number
  resolution: string
  resolvedAt: string
}

export type CutOrderItem = {
  position: number
  item: string
  cuttable: boolean
}

export type GateStatusResponse = {
  items: GateStatusItem[]
  cutOrder: CutOrderItem[]
  today: string
}

export const getGates = async () => {
  const result = await pb.collection('gates_ledger').getList<GateRecord>(1, 100, {
    sort: '-created',
  })
  return result.items
}

export const getGatesStatus = () =>
  pb.send<GateStatusResponse>('/backend/v1/gates/status', { method: 'GET' })

export const createGate = (input: {
  title: string
  description?: string
  owner: string
  decision_deadline: string
}) =>
  pb.send<{ id: string; status: string }>('/backend/v1/gates', {
    method: 'POST',
    body: JSON.stringify(input),
    headers: { 'Content-Type': 'application/json' },
  })

export const escalateGate = (id: string, escalatedByName: string, note?: string) =>
  pb.send<{ id: string; status: string }>('/backend/v1/gates/escalate', {
    method: 'POST',
    body: JSON.stringify({ id, escalated_by_name: escalatedByName, note }),
    headers: { 'Content-Type': 'application/json' },
  })

export const resolveGate = (id: string, resolution: string) =>
  pb.send<{ id: string; status: string; resolvedAt: string }>('/backend/v1/gates/resolve', {
    method: 'POST',
    body: JSON.stringify({ id, resolution }),
    headers: { 'Content-Type': 'application/json' },
  })
