import pb from '@/lib/pocketbase/client'

export type ProposalTemplateRecord = {
  id: string
  family: string
  name: string
  model_number: string
  version: number
  file: string
  variable_fields: string | Record<string, unknown>
  status: 'rascunho' | 'aprovado' | 'inativo'
  approved_by: string
  approved_at: string
  created_by: string
  created: string
  updated: string
}

export type ProposalTemplateMatrixItem = {
  id: string
  family: string
  name: string
  modelNumber: string
  version: number
  fileUrl: string
  approvedAt: string
}

export type CreateProposalTemplateInput = {
  family: 'poliureia' | 'geotecnia'
  name: string
  model_number: string
  file: File
  variable_fields: string[]
}

export const getProposalTemplates = async () => {
  const result = await pb.collection('proposal_templates').getList<ProposalTemplateRecord>(1, 50, {
    sort: '-created',
  })
  return result.items
}

export const createProposalTemplate = (input: CreateProposalTemplateInput) => {
  const formData = new FormData()
  formData.append('family', input.family)
  formData.append('name', input.name)
  formData.append('model_number', input.model_number)
  formData.append('version', '1')
  formData.append('variable_fields', JSON.stringify(input.variable_fields))
  formData.append('status', 'rascunho')
  formData.append('file', input.file)

  return pb.collection('proposal_templates').create<ProposalTemplateRecord>(formData)
}

export const approveProposalTemplate = (id: string) =>
  pb.send<{ id: string; status: string; approvedAt: string }>(
    '/backend/v1/proposal-templates/approve',
    {
      method: 'POST',
      body: JSON.stringify({ id }),
      headers: { 'Content-Type': 'application/json' },
    },
  )

export const getApprovedProposalTemplates = (family?: string) => {
  const query = family ? `?family=${encodeURIComponent(family)}` : ''
  return pb.send<{ items: ProposalTemplateMatrixItem[] }>(
    `/backend/v1/proposal-templates/approved${query}`,
    { method: 'GET' },
  )
}
