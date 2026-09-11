import pb from '@/lib/pocketbase/client'

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
