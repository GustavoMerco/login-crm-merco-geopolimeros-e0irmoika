import pb from '@/lib/pocketbase/client'
import { ClientResponseError, type SendOptions } from 'pocketbase'
import type { BackupRestoreResponse } from './backupTypes'

/**
 * Envia a requisição e, em caso de resposta 409 (falha segura esperada),
 * retorna o corpo da resposta em vez de lançar exceção — o recibo de falha
 * faz parte do fluxo normal da demonstração (RED-012).
 */
export const sendAllowConflict = async <T>(
  path: string,
  options: SendOptions,
): Promise<{ status: number; data: T }> => {
  try {
    const data = await pb.send<T>(path, options)
    return { status: 200, data }
  } catch (error: unknown) {
    if (error instanceof ClientResponseError && error.status === 409) {
      return { status: 409, data: error.response as T }
    }
    throw error
  }
}

export type { BackupRestoreResponse }
