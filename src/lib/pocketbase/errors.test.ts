import { describe, it, expect } from 'vitest'
import { ClientResponseError } from 'pocketbase'
import { getErrorMessage, extractFieldErrors } from './errors'

// Helper: monta um ClientResponseError real a partir de uma resposta HTTP
// simulada, exatamente como o SDK do PocketBase faz para qualquer status >= 400.
const makeSdkError = (
  url: string,
  status: number,
  response: Record<string, unknown>,
): ClientResponseError => {
  return new ClientResponseError({
    url,
    status,
    response,
  })
}

describe('getErrorMessage — corpos de negócio server-side (T2.13 / SPEC-2-006)', () => {
  it('RED-P2-006A: 409 com corpo {error} retorna o motivo real, não mensagem genérica', () => {
    const err = makeSdkError('/backend/v1/compositions', 409, {
      error: 'Código já existe para esta família; revisão cria nova versão via /revise.',
      reason: 'code_duplicated',
    })
    const msg = getErrorMessage(err)
    expect(msg).toContain('Código já existe')
    expect(msg).not.toContain('Something went wrong')
  })

  it('lê {message} como corpo de negócio quando não há {error}', () => {
    const err = makeSdkError('/backend/v1/x', 400, {
      message: 'Vigência inválida para este item.',
    })
    expect(getErrorMessage(err)).toContain('Vigência inválida')
  })

  it('lê {error} e {message} juntos e junta os dois motivos', () => {
    const err = makeSdkError('/backend/v1/x', 400, {
      error: 'Motivo A',
      message: 'Motivo B',
    })
    const msg = getErrorMessage(err)
    expect(msg).toContain('Motivo A')
    expect(msg).toContain('Motivo B')
  })

  it('mantém field-errors nativo {data:{campo:{message}}} (regressão T1.5/T2.2)', () => {
    const err = makeSdkError('/backend/v1/x', 400, {
      data: {
        output_unit: { message: 'Informe a unidade de saída.' },
      },
    })
    const msgs = Object.values(extractFieldErrors(err))
    expect(msgs).toEqual(['Informe a unidade de saída.'])
    expect(getErrorMessage(err)).toContain('Informe a unidade de saída.')
  })

  it('sem corpo de negócio: cai no fallback genérico do SDK', () => {
    const err = makeSdkError('/backend/v1/x', 500, {})
    const msg = getErrorMessage(err)
    expect(typeof msg).toBe('string')
    expect(msg.length).toBeGreaterThan(0)
  })

  it('erro fora do SDK (Error comum) retorna a própria mensagem', () => {
    expect(getErrorMessage(new Error('Falha de rede'))).toBe('Falha de rede')
  })

  it('erro desconhecido (não-Error) retorna mensagem genérica estável', () => {
    expect(getErrorMessage(undefined)).toBe('An unexpected error occurred.')
  })
})
