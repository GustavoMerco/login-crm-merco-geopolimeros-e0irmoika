import pb from '@/lib/pocketbase/client'

export type TechSheetParameter = {
  name: string
  value: string
  unit: string
  origin: string
}

export type TechSheetRecord = {
  id: string
  version: number
  parameters: TechSheetParameter[]
  pendingItems: string[]
  notes: string
  attachments: string[]
  createdBy: string
  createdAt: string
  collectionId: string
}

export type CreatedTechSheet = {
  id: string
  opportunityId: string
  version: number
  parameters: TechSheetParameter[]
  pendingItems: string[]
  notes: string
  attachmentCount: number
  createdBy: string
  createdAt: string
}

export const getTechSheets = (opportunityId: string) =>
  pb.send<{ items: TechSheetRecord[] }>(
    `/backend/v1/opportunities/tech-sheet?opportunity_id=${encodeURIComponent(opportunityId)}`,
    { method: 'GET' },
  )

export type CreateTechSheetInput = {
  opportunity_id: string
  parameters: TechSheetParameter[]
  pending_items?: string[]
  notes?: string
  attachments?: File[]
}

export const createTechSheet = (input: CreateTechSheetInput) => {
  const form = new FormData()
  form.append('opportunity_id', input.opportunity_id)
  form.append('parameters', JSON.stringify(input.parameters))
  if (input.pending_items && input.pending_items.length > 0) {
    form.append('pending_items', JSON.stringify(input.pending_items))
  }
  if (input.notes) {
    form.append('notes', input.notes)
  }
  for (const file of input.attachments ?? []) {
    form.append('attachments', file)
  }
  return pb.send<CreatedTechSheet>('/backend/v1/opportunities/tech-sheet', {
    method: 'POST',
    body: form,
  })
}

export const techSheetFileUrl = (sheet: { collectionId: string; id: string }, filename: string) =>
  `${pb.baseUrl}/api/files/${sheet.collectionId}/${sheet.id}/${encodeURIComponent(filename)}?token=${encodeURIComponent(pb.authStore.token || '')}`
