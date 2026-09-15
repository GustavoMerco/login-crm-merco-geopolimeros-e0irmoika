import pb from '@/lib/pocketbase/client'
import { sendAllowConflict } from './backupConflict'
import type {
  BackupExportResponse,
  BackupReceiptItem,
  BackupRestoreResponse,
  BackupVerifyResponse,
} from './backupTypes'

export type {
  BackupExportResponse,
  BackupReceiptItem,
  BackupRestoreResponse,
  BackupVerifyResponse,
} from './backupTypes'

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

export const restoreCheck = async (hash: string): Promise<BackupRestoreResponse> => {
  const { data } = await sendAllowConflict<BackupRestoreResponse>(
    '/backend/v1/backup/restore-check',
    {
      method: 'POST',
      body: JSON.stringify({ hash }),
      headers: { 'Content-Type': 'application/json' },
    },
  )
  return data
}
