import pb from '@/lib/pocketbase/client'

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

export const createOpportunity = (input: CreateOpportunityInput) =>
  pb.send<CreatedOpportunity>('/backend/v1/opportunities', {
    method: 'POST',
    body: JSON.stringify(input),
    headers: { 'Content-Type': 'application/json' },
  })
