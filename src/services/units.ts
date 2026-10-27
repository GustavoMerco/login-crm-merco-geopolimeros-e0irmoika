import pb from '@/lib/pocketbase/client'

export type UnitRecord = {
  id: string
  code: string
  name: string
  dimension: string
  status: 'rascunho' | 'homologado' | 'inativo'
  inactiveReason: string
  homologatedAt: string
  created: string
}

export type CreateUnitInput = {
  code: string
  name: string
  dimension: string
}

export const getUnits = (status?: string) => {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return pb.send<{ items: UnitRecord[] }>(`/backend/v1/units${query}`, { method: 'GET' })
}

export const createUnit = (input: CreateUnitInput) =>
  pb.send<{ id: string; code: string; status: string }>('/backend/v1/units', {
    method: 'POST',
    body: JSON.stringify(input),
    headers: { 'Content-Type': 'application/json' },
  })

export const homologateUnit = (id: string) =>
  pb.send<{ id: string; status: string; homologatedAt: string }>('/backend/v1/units/homologate', {
    method: 'POST',
    body: JSON.stringify({ id }),
    headers: { 'Content-Type': 'application/json' },
  })

export const deactivateUnit = (id: string, reason: string) =>
  pb.send<{ id: string; status: string }>('/backend/v1/units/deactivate', {
    method: 'POST',
    body: JSON.stringify({ id, reason }),
    headers: { 'Content-Type': 'application/json' },
  })
