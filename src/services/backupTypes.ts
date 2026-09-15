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
