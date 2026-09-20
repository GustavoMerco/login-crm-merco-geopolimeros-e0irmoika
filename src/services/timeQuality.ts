import pb from '@/lib/pocketbase/client'

export type TimeQualityFinding = {
  code: string
  severity: 'bloqueante' | 'pendente'
  count: number
  description: string
  sampleIds: string[]
}

export type TimeQualityReviewRecord = {
  id: string
  weekStart: string
  weekEnd: string
  status: 'aprovado' | 'pendente' | 'sem_amostra'
  reviewedOpportunities: number
  eligibleBaselineOpportunities: number
  nonComparableOpportunities: number
  openTimeEntries: number
  invalidTimeEntries: number
  missingReceivedEvents: number
  retrodatedEvents: number
  outOfOrderTimelines: number
  incompleteTimelines: number
  findings: TimeQualityFinding[]
  criteria: string
  decision: string
  signature: string
  signedAt: string
  createdBy: string
}

export type CreateTimeQualityReviewInput = {
  week_start: string
  week_end: string
  criteria: string
}

export const getTimeQualityReviews = () =>
  pb.send<{ items: TimeQualityReviewRecord[] }>('/backend/v1/time-quality/reviews', {
    method: 'GET',
  })

export const createTimeQualityReview = (input: CreateTimeQualityReviewInput) =>
  pb.send<TimeQualityReviewRecord>('/backend/v1/time-quality/reviews', {
    method: 'POST',
    body: JSON.stringify(input),
    headers: { 'Content-Type': 'application/json' },
  })
