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

  const parts: string[] = []
  const addPart = (value: unknown) => {
    if (typeof value === 'string' && value.trim().length > 0 && !parts.includes(value.trim())) {
      parts.push(value.trim())
    }
  }

  // Field-errors nativos do PocketBase (validação de campos).
  for (const msg of Object.values(extractFieldErrors(error))) {
    addPart(msg)
  }

  // Corpos de negócio server-side enviados via e.json(409/400, { error, reason })
  // ou { message } — chegam ao SDK como error.response (T2.13 / SPEC-2-006).
  const response = error.response as Record<string, unknown> | undefined
  if (response && typeof response === 'object') {
    addPart(response.error)
    addPart(response.message)
  }

  // Fallback do SDK apenas quando o corpo não trouxe nada legível
  // (SPEC-2-006, regra 5: mensagem genérica só sem corpo).
  if (parts.length === 0) {
    addPart(error.message)
  }

  return parts.length > 0 ? parts.join(' ') : 'An unexpected error occurred.'
}
