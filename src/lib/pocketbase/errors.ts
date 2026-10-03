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
  const msgs = Object.values(extractFieldErrors(error))
  if (msgs.length > 0) return msgs.join(' ')
  // Corpos de negócio server-side (ex.: 409 via e.json com { error, reason }):
  // o SDK expõe o corpo em error.response, não em error.response.data.
  const body = error.response as Record<string, unknown> | undefined
  if (body && typeof body.error === 'string' && body.error.trim()) {
    return body.error
  }
  if (body && typeof body.message === 'string' && body.message.trim()) {
    return body.message
  }
  return error.message || 'An unexpected error occurred.'
}
