import pb from '@/lib/pocketbase/client'

export type MilestoneValue = 'received' | 'apt' | 'ready' | 'sent' | 'won' | 'lost'

export type OpportunityEventRecord = {
  id: string
  opportunity_id: string
  milestone: MilestoneValue
  note: string
  occurred_at: string
  created_by: string
  created: string
}

export type ActiveTimeEntryRecord = {
  id: string
  opportunity_id: string
  user_id: string
  stage: 'qualificacao' | 'portal' | 'ficha_tecnica' | 'revisao' | 'outro'
  started_at: string
  ended_at?: string
  pause_reason?: string
  created: string
}

export type TimeEntryStarted = {
  id: string
  opportunityId: string
  stage: string
  startedAt: string
}

export type TimeEntryStopped = {
  id: string
  endedAt: string
  pauseReason: string
}

export const getOpportunityEvents = (opportunityId: string) =>
  pb
    .collection('opportunity_events')
    .getList<OpportunityEventRecord>(1, 50, {
      filter: `opportunity_id = "${opportunityId}"`,
      sort: 'occurred_at',
    })
    .then((result) => result.items)

export const getTimeEntries = (opportunityId: string) =>
  pb
    .collection('active_time_entries')
    .getList<ActiveTimeEntryRecord>(1, 50, {
      filter: `opportunity_id = "${opportunityId}"`,
      sort: '-started_at',
    })
    .then((result) => result.items)

export const recordMilestone = (
  opportunityId: string,
  milestone: 'ready' | 'sent',
  note?: string,
) =>
  pb.send<{ id: string; opportunityId: string; milestone: string; occurredAt: string }>(
    '/backend/v1/opportunities/milestone',
    {
      method: 'POST',
      body: JSON.stringify({ opportunity_id: opportunityId, milestone, note }),
      headers: { 'Content-Type': 'application/json' },
    },
  )

// Desfecho (RF-22): ganha ou perdida; perda exige motivo (RN-17).
export const recordOutcome = (opportunityId: string, outcome: 'won' | 'lost', reason: string) =>
  pb.send<{ id: string; outcome: string; occurredAt: string }>(
    '/backend/v1/opportunities/outcome',
    {
      method: 'POST',
      body: JSON.stringify({ opportunity_id: opportunityId, outcome, reason }),
      headers: { 'Content-Type': 'application/json' },
    },
  )

export const startTimeEntry = (opportunityId: string, stage: string) =>
  pb.send<TimeEntryStarted>('/backend/v1/opportunities/time/start', {
    method: 'POST',
    body: JSON.stringify({ opportunity_id: opportunityId, stage }),
    headers: { 'Content-Type': 'application/json' },
  })

export const stopTimeEntry = (entryId: string, pauseReason: string) =>
  pb.send<TimeEntryStopped>('/backend/v1/opportunities/time/stop', {
    method: 'POST',
    body: JSON.stringify({ id: entryId, pause_reason: pauseReason }),
    headers: { 'Content-Type': 'application/json' },
  })
