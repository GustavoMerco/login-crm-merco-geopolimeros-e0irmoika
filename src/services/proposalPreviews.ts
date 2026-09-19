import pb from '@/lib/pocketbase/client'
import { ClientResponseError } from 'pocketbase'

export type ProposalAreaRow = {
  item: string
  local: string
  area: string
  pathology: string
  solution: string
}

export type ProposalTemplateMatrixItem = {
  id: string
  family: 'poliureia' | 'geotecnia'
  name: string
  modelNumber: string
  version: number
  fileUrl: string
  approvedAt: string
}

export type ProposalPreviewRecord = {
  id: string
  opportunityId: string
  templateId: string
  family: 'poliureia' | 'geotecnia'
  proposalNumber: string
  revision: string
  proposalDate: string
  city: string
  customerName: string
  customerCnpj: string
  customerAddress: string
  contactName: string
  contactEmail: string
  localObra: string
  surfaceType: string
  solutionProposed: string
  executionStart: string
  executionDeadline: string
  areas: ProposalAreaRow[]
  templateName: string
  templateModelNumber: string
  templateVersion: number
  status: 'previa'
  createdAt: string
}

export type CreateProposalPreviewInput = {
  opportunity_id: string
  template_id: string
  family: 'poliureia' | 'geotecnia'
  proposal_number: string
  revision: string
  proposal_date: string
  city: string
  customer_name: string
  customer_cnpj: string
  customer_address: string
  contact_name: string
  contact_email?: string
  local_obra: string
  surface_type: string
  solution_proposed: string
  execution_start: string
  execution_deadline: string
  areas: ProposalAreaRow[]
}

export type ProposalPreviewSendResponse = {
  result: 'bloqueado'
  previewId: string
  errorDetail: string
}

export const getApprovedProposalTemplates = (family?: string) => {
  const query = family ? `?family=${encodeURIComponent(family)}` : ''
  return pb.send<{ items: ProposalTemplateMatrixItem[] }>(
    `/backend/v1/proposal-templates/approved${query}`,
    { method: 'GET' },
  )
}

export const getProposalPreviews = (opportunityId?: string) => {
  const query = opportunityId ? `?opportunityId=${encodeURIComponent(opportunityId)}` : ''
  return pb.send<{ items: ProposalPreviewRecord[] }>(`/backend/v1/proposal-previews${query}`, {
    method: 'GET',
  })
}

export const createProposalPreview = (input: CreateProposalPreviewInput) =>
  pb.send<ProposalPreviewRecord>('/backend/v1/proposal-previews', {
    method: 'POST',
    body: JSON.stringify(input),
    headers: { 'Content-Type': 'application/json' },
  })

export const attemptProposalPreviewSend = async (
  id: string,
): Promise<ProposalPreviewSendResponse> => {
  try {
    return await pb.send<ProposalPreviewSendResponse>('/backend/v1/proposal-previews/send', {
      method: 'POST',
      body: JSON.stringify({ id }),
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    if (error instanceof ClientResponseError && error.status === 409) {
      return error.response as ProposalPreviewSendResponse
    }
    throw error
  }
}

export const proposalFamilyLabel = (family: 'poliureia' | 'geotecnia') =>
  family === 'poliureia' ? 'Poliureia' : 'Geotecnia'

export const proposalFixedSystemCopy = (family: 'poliureia' | 'geotecnia') =>
  family === 'poliureia'
    ? [
        'A poliúria é um elastômero de alta performance, resultante da reação química entre um isocianato e uma resina poliamínica. Esta reação de polimerização é extremamente rápida, resultando na formação de uma membrana monolítica (sem emendas), altamente resistente e flexível, que adere completamente ao substrato.',
        'Este sistema é projetado para proteger uma vasta gama de superfícies, como lajes de concreto, estacionamentos, tanques de contenção, reservatórios de água, arquibancadas de estádios, pisos industriais e estruturas metálicas, oferecendo uma barreira estanque e durável.',
      ]
    : [
        'O processo não destrutivo de reforço de pisos da Merco Geopolímeros oferece uma solução rápida, precisa e competitiva para estabilização e reforço de pisos em áreas com vazios entre o solo e a placa de concreto. A aplicação cria um colchão estrutural de poliuretano, com desempenho semelhante ao de um novo piso e resistência aproximada de 60 MPa.',
        'Em razão do curto tempo de cura da resina geopolimérica, o método proporciona menor interferência operacional quando comparado a soluções convencionais, permitindo, na maioria dos casos, a retomada do uso da área tratada poucos minutos após a conclusão dos serviços.',
        'O escopo proposto visa à correção da camada superficial do solo e da interface com a placa de concreto, não contemplando intervenções em camadas profundas, salvo se expressamente indicado em projeto complementar.',
      ]

export const formatProposalDate = (value: string) => {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}
