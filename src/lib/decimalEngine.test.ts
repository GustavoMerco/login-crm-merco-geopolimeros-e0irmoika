import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// T2.5 (SPEC-2-003; RED/GREEN-P2-003A). Testa o MESMO texto do motor que roda
// no JSVM: o bloco <decimal-engine> é extraído do hook e avaliado aqui. A
// avaliação dinâmica existe só neste teste; o hook nunca executa código enviado.
const HOOK_PATH = path.resolve(__dirname, '../../pocketbase/hooks/dimensioning_selftest.js')
const HOOK_SOURCE = readFileSync(HOOK_PATH, 'utf8')
const BLOCK = /\/\/ <decimal-engine>([\s\S]*?)\/\/ <\/decimal-engine>/.exec(HOOK_SOURCE)?.[1] ?? ''

type Outcome = {
  ok: boolean
  codigo?: string
  campo?: string
  modo?: string
  aprovacao?: boolean
  resultado?: { valor: string; unidade: string }
  passos?: Array<{ operacao: string; resultado: { valor: string; unidade: string }; exato: boolean }>
}
type Engine = {
  ENGINE_VERSION: string
  calculate: (ast: unknown, contract: unknown, values: unknown) => Outcome
  runSelfTest: () => {
    resumo: { total: number; passou: number; falhou: number }
    casos: Array<{ id: string; passou: boolean; esperado: string; obtido: string }>
    memoria: Outcome | null
  }
  canonicalRounding: (mode: unknown) => string
}

const ENGINE = new Function(`${BLOCK}; return ENGINE;`)() as Engine

const lit = (value: string, unit: string) => ({ type: 'literal', value, unit })
const inp = (name: string) => ({ type: 'input', name })
const op = (type: string, a: unknown, b: unknown) => ({ type, operands: [a, b] })
const adim = (precision: number, rounding: string) => ({
  inputs: [],
  output_unit: '1',
  precision,
  rounding,
})
const AREA_CONTRACT = {
  inputs: [
    { name: 'area', unit: 'm2' },
    { name: 'coeficiente', unit: 'kg/m2' },
  ],
  output_unit: 'kg',
  precision: 2,
  rounding: 'half-up',
}
const AREA_AST = op('mul', inp('area'), inp('coeficiente'))

describe('T2.5 — bloco do motor compatível com o JSVM', () => {
  it('o bloco existe no hook e não usa eval, Function, BigInt, require nem spread', () => {
    expect(BLOCK.length).toBeGreaterThan(1000)
    expect(BLOCK).not.toMatch(/\beval\s*\(/)
    expect(BLOCK).not.toMatch(/\bFunction\s*\(/)
    expect(BLOCK).not.toMatch(/\bBigInt\b/)
    expect(BLOCK).not.toMatch(/\brequire\s*\(/)
    expect(BLOCK).not.toMatch(/\.\.\.[a-zA-Z_[{(]/)
  })

  it('não converte valores do domínio com parseFloat/Number(valor)', () => {
    expect(BLOCK).not.toMatch(/parseFloat|parseInt/)
    // Number() só aparece para o expoente de um token de unidade (um dígito).
    const uses = BLOCK.match(/Number\(/g) ?? []
    expect(uses).toHaveLength(1)
    expect(BLOCK).toContain('Number(match[2])')
  })
})

describe('GREEN-P2-003A — fixture sintética da SPEC', () => {
  it('10.25 m2 × 0.20 kg/m2 = 2.05 kg, marcado como simulação sem aprovação', () => {
    const out = ENGINE.calculate(AREA_AST, AREA_CONTRACT, { area: '10.25', coeficiente: '0.20' })
    expect(out.ok).toBe(true)
    expect(out.resultado).toEqual({ valor: '2.05', unidade: 'kg' })
    expect(out.modo).toBe('simulacao')
    expect(out.aprovacao).toBe(false)
  })

  it('memória mostra o passo com valores, unidades e origem', () => {
    const out = ENGINE.calculate(AREA_AST, AREA_CONTRACT, { area: '10.25', coeficiente: '0.20' })
    expect(out.passos).toHaveLength(1)
    expect(out.passos?.[0]).toMatchObject({
      operacao: 'multiplicação',
      a: { valor: '10.25', unidade: 'm2', origem: 'area' },
      b: { valor: '0.2', unidade: 'kg/m2', origem: 'coeficiente' },
      resultado: { valor: '2.05', unidade: 'kg' },
      exato: true,
    })
  })

  it('repetição com as mesmas entradas é idêntica (determinismo)', () => {
    const values = { area: '10.25', coeficiente: '0.20' }
    const first = ENGINE.calculate(AREA_AST, AREA_CONTRACT, values)
    const second = ENGINE.calculate(AREA_AST, AREA_CONTRACT, values)
    expect(second).toEqual(first)
  })
})

describe('aritmética decimal exata', () => {
  it('0.1 + 0.2 = 0.3 exato, diferente do ponto flutuante', () => {
    expect(0.1 + 0.2).not.toBe(0.3)
    const out = ENGINE.calculate(op('add', lit('0.1', '1'), lit('0.2', '1')), adim(1, 'down'), {})
    expect(out.resultado?.valor).toBe('0.3')
  })

  it('subtração que troca de sinal', () => {
    const out = ENGINE.calculate(op('sub', lit('1.5', 'm'), lit('2.75', 'm')), { ...adim(2, 'down'), output_unit: 'm' }, {})
    expect(out.resultado).toEqual({ valor: '-1.25', unidade: 'm' })
  })

  it('multiplicação grande dentro de 18 inteiros sem perda', () => {
    const out = ENGINE.calculate(op('mul', lit('123456789.123456789', '1'), lit('1000', '1')), adim(9, 'down'), {})
    expect(out.resultado?.valor).toBe('123456789123.456789000')
  })

  it('divisão controlada marca o passo como inexato', () => {
    const out = ENGINE.calculate(op('div', lit('10', 'm'), lit('3', '1')), { ...adim(4, 'half-up'), output_unit: 'm' }, {})
    expect(out.resultado?.valor).toBe('3.3333')
    expect(out.passos?.[0].exato).toBe(false)
  })

  it('unidades se cancelam na multiplicação e se compõem na divisão', () => {
    const div = ENGINE.calculate(op('div', lit('10', 'kg'), lit('4', 'm2')), { ...adim(2, 'down'), output_unit: 'kg/m2' }, {})
    expect(div.resultado).toEqual({ valor: '2.50', unidade: 'kg/m2' })
  })
})

describe('arredondamento canônico da D-T2.5', () => {
  const round = (value: string, precision: number, mode: string) =>
    ENGINE.calculate(op('mul', lit(value, '1'), lit('1', '1')), adim(precision, mode), {}).resultado?.valor

  it.each([
    ['2.345', 2, 'half-up', '2.35'],
    ['2.344', 2, 'half-up', '2.34'],
    ['2.345', 2, 'half-even', '2.34'],
    ['2.355', 2, 'half-even', '2.36'],
    ['2.3451', 2, 'half-even', '2.35'],
    ['2.349', 2, 'down', '2.34'],
    ['2.341', 2, 'up', '2.35'],
    ['2.340', 2, 'up', '2.34'],
    ['-2.345', 2, 'half-up', '-2.35'],
    ['-2.349', 2, 'down', '-2.34'],
    ['0.004', 2, 'half-up', '0.00'],
    ['9.995', 2, 'half-up', '10.00'],
    ['2.345', 2, 'normal', '2.35'],
  ])('%s em %i casas com %s → %s', (value, precision, mode, expected) => {
    expect(round(value, precision, mode)).toBe(expected)
  })

  it('normal é alias de half-up; up e down mantêm o nome; demais são recusados', () => {
    expect(ENGINE.canonicalRounding('normal')).toBe('half-up')
    expect(ENGINE.canonicalRounding('up')).toBe('up')
    expect(ENGINE.canonicalRounding('ceil')).toBe('')
    expect(ENGINE.canonicalRounding('constructor')).toBe('')
  })

  it('resto descartado na divisão desempata o meio (bit de inexatidão)', () => {
    // 1/3 × 1.5 = 0.4999…; 0.5 só apareceria se o resto fosse ignorado.
    const ast = op('mul', op('div', lit('1', '1'), lit('3', '1')), lit('1.5', '1'))
    expect(ENGINE.calculate(ast, adim(0, 'half-up'), {}).resultado?.valor).toBe('0')
    expect(ENGINE.calculate(ast, adim(1, 'up'), {}).resultado?.valor).toBe('0.5')
  })
})

describe('RED-P2-003A — recusas sem saída parcial', () => {
  const expectRefusal = (out: Outcome, code: string) => {
    expect(out.ok).toBe(false)
    expect(out.codigo).toBe(code)
    expect(out.resultado).toBeUndefined()
    expect(out.passos).toBeUndefined()
  }

  it('nó desconhecido e nomes do protótipo de Object', () => {
    expectRefusal(ENGINE.calculate(op('pow', lit('2', '1'), lit('3', '1')), adim(0, 'down'), {}), 'ast_node_unknown')
    expectRefusal(ENGINE.calculate(op('constructor', lit('2', '1'), lit('3', '1')), adim(0, 'down'), {}), 'ast_node_unknown')
  })

  it('operação com número de operandos diferente de 2', () => {
    expectRefusal(ENGINE.calculate({ type: 'add', operands: [lit('1', '1')] }, adim(0, 'down'), {}), 'ast_invalid')
  })

  it('divisão por zero', () => {
    expectRefusal(ENGINE.calculate(op('div', lit('1', '1'), lit('0.000', '1')), adim(0, 'down'), {}), 'division_by_zero')
  })

  it('unidade incompatível na soma e na saída', () => {
    expectRefusal(ENGINE.calculate(op('add', inp('area'), inp('coeficiente')), AREA_CONTRACT, { area: '1', coeficiente: '1' }), 'unit_incompatible')
    expectRefusal(ENGINE.calculate(AREA_AST, { ...AREA_CONTRACT, output_unit: 'm2' }, { area: '1', coeficiente: '1' }), 'output_unit_mismatch')
  })

  it('entrada ausente, fora do contrato ou com nome do protótipo', () => {
    expectRefusal(ENGINE.calculate(AREA_AST, AREA_CONTRACT, { area: '10.25' }), 'input_missing')
    expectRefusal(ENGINE.calculate(op('mul', inp('area'), inp('preco')), AREA_CONTRACT, { area: '1', preco: '1' }), 'input_not_in_contract')
    expectRefusal(ENGINE.calculate(op('mul', inp('area'), inp('toString')), AREA_CONTRACT, { area: '1' }), 'input_not_in_contract')
  })

  it.each(['0,20', '2e-1', '.5', '5.', '+1', '01', ' 1', '1; $app.delete()', '0.1234567890123', '1234567890123456789'])(
    'coeficiente inválido "%s"',
    (raw) => {
      expectRefusal(ENGINE.calculate(AREA_AST, AREA_CONTRACT, { area: '10.25', coeficiente: raw }), 'decimal_invalid')
    },
  )

  it('zero sem regra homologada; com allow_zero passa', () => {
    expectRefusal(ENGINE.calculate(AREA_AST, AREA_CONTRACT, { area: '10.25', coeficiente: '0' }), 'input_zero_not_allowed')
    const contract = { ...AREA_CONTRACT, inputs: [AREA_CONTRACT.inputs[0], { name: 'coeficiente', unit: 'kg/m2', allow_zero: true }] }
    expect(ENGINE.calculate(AREA_AST, contract, { area: '10.25', coeficiente: '0' }).resultado?.valor).toBe('0.00')
  })

  it('resultado acima de 18 inteiros exige emenda', () => {
    expectRefusal(ENGINE.calculate(op('mul', lit('999999999999999999', '1'), lit('10', '1')), adim(0, 'down'), {}), 'out_of_range')
  })

  it('precisão e arredondamento fora do contrato', () => {
    expectRefusal(ENGINE.calculate(AREA_AST, { ...AREA_CONTRACT, precision: 13 }, {}), 'precision_invalid')
    expectRefusal(ENGINE.calculate(AREA_AST, { ...AREA_CONTRACT, precision: 1.5 }, {}), 'precision_invalid')
    expectRefusal(ENGINE.calculate(AREA_AST, { ...AREA_CONTRACT, rounding: 'ceil' }, {}), 'rounding_invalid')
  })

  it('unidade inválida', () => {
    expectRefusal(ENGINE.calculate(op('mul', lit('1', 'm/s/s'), lit('1', '1')), adim(0, 'down'), {}), 'unit_invalid')
  })
})

describe('autoteste da rota (mesmas fixtures do servidor)', () => {
  it('todos os casos GREEN e RED passam, e a memória é a da fixture da SPEC', () => {
    const report = ENGINE.runSelfTest()
    const failed = report.casos.filter((c) => !c.passou)
    expect(failed).toEqual([])
    expect(report.resumo.falhou).toBe(0)
    expect(report.resumo.total).toBeGreaterThanOrEqual(25)
    expect(report.memoria?.resultado).toEqual({ valor: '2.05', unidade: 'kg' })
  })
})
