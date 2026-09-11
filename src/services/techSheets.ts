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

export const getTechSheets = async (opportunityId: string) => {
  const result = await pb.collection('tech_sheets').getList<TechSheetRecord>(1, 100, {
    filter: `opportunity_id = "${opportunityId}"`,
    sort: '-version',
  })
  return {
    items: result.items.map((item) => ({
      ...item,
      pendingItems: item.pendingItems ?? [],
      parameters: item.parameters ?? [],
      attachments: item.attachments ?? [],
    })),
  }
}

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
  return pb.collection('tech_sheets').create<Record & CreateTechSheetInput>(form)
}

export const techSheetFileUrl = (sheet: { collectionId: string; id: string }, filename: string) =>
  `${pb.baseUrl}/api/files/${sheet.collectionId}/${sheet.id}/${encodeURIComponent(filename)}?token=${encodeURIComponent(pb.authStore.token || '')}`
