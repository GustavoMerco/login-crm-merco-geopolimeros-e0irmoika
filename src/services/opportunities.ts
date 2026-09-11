import pb from '@/lib/pocketbase/client'

export type OpportunityRecord = {
  id: string
  customer_name: string
  contact_name: string
  contact_email?: string
  origin: string
  service_family: string
  location: string
  responsible_user_id: string
  demand_date: string
  deadline_date?: string
  received_at: string
  status: string
  aptitude_status?: 'pending' | 'blocked' | 'apt' | 'exception_approved'
  checklist?: Record<string, boolean>
  pending_items?: string[]
  exception_justification?: string
  exception_authorized_by?: string
  aptitude_evaluated_at?: string
  created: string
  updated: string
}

export type CreateOpportunityInput = {
  customer_name: string
  contact_name: string
  contact_email?: string
  origin: string
  service_family: string
  location: string
  demand_date: string
  deadline_date?: string
}

export type CreatedOpportunity = {
  id: string
  receivedAt: string
  status: 'received'
}

export const getOpportunities = () =>
  pb.collection('opportunities').getList<OpportunityRecord>(1, 50, {
    sort: '-received_at',
  })

export const createOpportunity = (input: CreateOpportunityInput) =>
  pb.send<CreatedOpportunity>('/backend/v1/opportunities', {
    method: 'POST',
    body: JSON.stringify(input),
    headers: { 'Content-Type': 'application/json' },
  })

export type AptitudeResult = {
  id: string
  aptitudeStatus: 'blocked' | 'apt' | 'exception_approved'
  status: 'blocked' | 'apt'
  checklist: Record<string, boolean>
  pendingItems: string[]
  evaluatedAt: string
}

export const evaluateOpportunityAptitude = (
  id: string,
  options?: { allowException?: boolean; exceptionJustification?: string },
) =>
  pb.send<AptitudeResult>(`/backend/v1/opportunities/${id}/aptitude`, {
    method: 'POST',
    body: JSON.stringify({
      allow_exception: options?.allowException ?? false,
      exception_justification: options?.exceptionJustification,
    }),
    headers: { 'Content-Type': 'application/json' },
  })
