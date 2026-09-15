import pb from '@/lib/pocketbase/client'

export type BackupReceiptItem = {
  id: string
  kind: 'backup' | 'restauracao' | 'exportacao'
  result: 'sucesso' | 'falha'
  payloadHash: string
  expectedHash: string
  counts: Record<string, number>
  errorDetail: string
  origin: string
  created: string
}

export type BackupExportResponse = {
  payload: { generatedAt: string; contentFingerprint: string; counts: Record<string, number> }
  hash: string
  counts: Record<string, number>
}

export type BackupVerifyResponse = {
  receiptId: string
  result: 'sucesso' | 'falha'
  currentHash: string
  counts: Record<string, number>
  errorDetail: string
}

export type BackupRestoreResponse = {
  receiptId: string
  result: 'sucesso' | 'falha'
  counts?: Record<string, number>
  errorDetail?: string
  detail?: string
}

export const getBackupReceipts = () =>
  pb.send<{ items: BackupReceiptItem[] }>('/backend/v1/backup/receipts', { method: 'GET' })

export const exportBackup = () =>
  pb.send<BackupExportResponse>('/backend/v1/backup/export', { method: 'GET' })

export const verifyBackup = (hash: string) =>
  pb.send<BackupVerifyResponse>('/backend/v1/backup/verify', {
    method: 'POST',
    body: JSON.stringify({ hash }),
    headers: { 'Content-Type': 'application/json' },
  })

export const restoreCheck = (hash: string) =>
  pb.send<BackupRestoreResponse>('/backend/v1/backup/restore-check', {
    method: 'POST',
    body: JSON.stringify({ hash }),
    headers: { 'Content-Type': 'application/json' },
  })
