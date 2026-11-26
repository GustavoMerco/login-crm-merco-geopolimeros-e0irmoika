import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function extractFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ClientResponseError)) return {}
  const data = error.response?.data
  if (!data || typeof data !== 'object') return {}
  const errors: FieldErrors = {}
  for (const [field, detail] of Object.entries(data)) {
    if (
      detail &&
      typeof detail === 'object' &&
      'message' in detail &&
      typeof (detail as { message: unknown }).message === 'string'
    ) {
      errors[field] = (detail as { message: string }).message
    }
  }
  return errors
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'An unexpected error occurred.'
  }
  // T2.13 / SPEC-2-006 (CA-2-11): erros de negócio exibem o motivo real retornado
  // pelo servidor. Hooks do projeto respondem {error}, {message} ou os dois;
  // o fallback genérico só vale quando não há corpo de negócio.
  const response = error.response as { error?: unknown; message?: unknown } | undefined
  const business: string[] = []
  if (typeof response?.error === 'string' && response.error.trim()) {
    business.push(response.error.trim())
  }
  if (typeof response?.message === 'string' && response.message.trim()) {
    business.push(response.message.trim())
  }
  const msgs = Object.values(extractFieldErrors(error))
  const all = [...business, ...msgs]
  return all.length > 0 ? all.join(' ') : error.message || 'An unexpected error occurred.'
}
