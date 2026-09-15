import pb from '@/lib/pocketbase/client'

export type BaselineSnapshotRecord = {
  id: string
  service_family: string
  complexity_class: string
  window_start: string
  window_end: string
  frozen_at: string
  calendar: string
  volume: number
  received_to_apt_ms: number
  apt_to_ready_ms: number
  ready_to_sent_ms: number
  active_time_ms: number
  reliability_criteria: string
  freeze_reason: string
  created_by: string
  created: string
}

export type FrozenBaseline = {
  id: string
  frozenAt: string
  volume: number
  receivedToAptMs: number
  aptToReadyMs: number
  readyToSentMs: number
  activeTimeMs: number
  alreadyFrozen: boolean
}

export type FreezeBaselineInput = {
  service_family: string
  complexity_class: string
  window_start: string
  window_end: string
  calendar: string
  reliability_criteria: string
  freeze_reason: string
}

export const getBaselines = async () => {
  const result = await pb
    .collection('baseline_snapshots')
    .getList<BaselineSnapshotRecord>(1, 50, { sort: '-frozen_at' })
  return result.items
}

export const freezeBaseline = (input: FreezeBaselineInput) =>
  pb.send<FrozenBaseline>('/backend/v1/baselines', {
    method: 'POST',
    body: JSON.stringify(input),
    headers: { 'Content-Type': 'application/json' },
  })
