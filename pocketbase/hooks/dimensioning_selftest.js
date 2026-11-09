// T2.5 — Demonstrar cálculo decimal seguro com exemplos sintéticos (SPEC-2-003;
// CA-2-03/04; RED/GREEN-P2-003A). Decisão D-T2.5 da consultoria (09/11/2026):
// recorte enxuto = módulo decimal puro + rota de prova isolada no runtime real
// (goja/JSVM). Sem persistência, sem endpoint de produto, sem cálculo real, sem
// abrir o gate. A rota executa SOMENTE fixtures sintéticas fixas no servidor; não
// recebe AST, valores nem contrato do cliente.
//
// O bloco entre os marcadores <decimal-engine> é a fonte única do motor: o
// teste `src/lib/decimalEngine.test.ts` extrai este mesmo texto e o executa no
// Node, e esta rota o executa no JSVM. Escrever o bloco em sintaxe compatível
// com o JSVM (sem spread, sem BigInt, sem dependência npm, sem eval/Function).
routerAdd(
  'GET',
  '/backend/v1/dimensioning/selftest',
  (e) => {
    // <decimal-engine>
    const ENGINE = (function () {
      const ENGINE_VERSION = 't2.5-1'
      const MAX_INT_DIGITS = 18
      const MAX_INPUT_DECIMALS = 12
      const MAX_PRECISION = 12
      const INTERNAL_SCALE = 30
      const MAX_DEPTH = 16
      const MAX_NODES = 256
      const ROUNDING_MODES = ['half-up', 'half-even', 'down', 'up']
      // Mapeamento canônico da D-T2.5: nomes legados do hook de composição.
      const ROUNDING_ALIASES = { normal: 'half-up' }
      const DECIMAL_PATTERN = /^-?(0|[1-9][0-9]{0,17})(\.[0-9]{1,12})?$/
      const UNIT_TOKEN = /^([a-zA-Z]+)([0-9]?)$/

      // Consulta só chaves próprias: nomes como "constructor" não podem casar
      // com o protótipo de Object.
      function own(map, key) {
        return typeof key === 'string' && Object.prototype.hasOwnProperty.call(map, key)
      }

      function fail(code, message, field) {
        return { engineError: true, code: code, message: message, field: field || '' }
      }

      // ---------- inteiros não negativos em texto (sem Number para o domínio) ----------
      function zeros(count) {
        let out = ''
        for (let i = 0; i < count; i++) out += '0'
        return out
      }

      function stripLeadingZeros(digits) {
        let i = 0
        while (i < digits.length - 1 && digits.charAt(i) === '0') i++
        return digits.slice(i)
      }

      function cmpInt(a, b) {
        const x = stripLeadingZeros(a)
        const y = stripLeadingZeros(b)
        if (x.length !== y.length) return x.length > y.length ? 1 : -1
        if (x === y) return 0
        return x > y ? 1 : -1
      }

      function addInt(a, b) {
        let i = a.length - 1
        let j = b.length - 1
        let carry = 0
        let out = ''
        while (i >= 0 || j >= 0 || carry > 0) {
          const sum = (i >= 0 ? a.charCodeAt(i) - 48 : 0) + (j >= 0 ? b.charCodeAt(j) - 48 : 0) + carry
          out = String(sum % 10) + out
          carry = sum >= 10 ? 1 : 0
          i--
          j--
        }
        return stripLeadingZeros(out)
      }

      // Pré-condição: a >= b.
      function subInt(a, b) {
        let i = a.length - 1
        let j = b.length - 1
        let borrow = 0
        let out = ''
        while (i >= 0) {
          let diff = a.charCodeAt(i) - 48 - borrow - (j >= 0 ? b.charCodeAt(j) - 48 : 0)
          borrow = 0
          if (diff < 0) {
            diff += 10
            borrow = 1
          }
          out = String(diff) + out
          i--
          j--
        }
        return stripLeadingZeros(out)
      }

      function mulInt(a, b) {
        if (a === '0' || b === '0') return '0'
        const acc = []
        for (let k = 0; k < a.length + b.length; k++) acc.push(0)
        for (let i = a.length - 1; i >= 0; i--) {
          for (let j = b.length - 1; j >= 0; j--) {
            const pos = i + j + 1
            const total = (a.charCodeAt(i) - 48) * (b.charCodeAt(j) - 48) + acc[pos]
            acc[pos] = total % 10
            acc[pos - 1] += Math.floor(total / 10)
          }
        }
        return stripLeadingZeros(acc.join(''))
      }

      // Divisão longa: quociente inteiro e se houve resto.
      function divInt(a, b) {
        let remainder = '0'
        let quotient = ''
        for (let i = 0; i < a.length; i++) {
          remainder = stripLeadingZeros(remainder + a.charAt(i))
          let digit = 0
          while (cmpInt(remainder, b) >= 0) {
            remainder = subInt(remainder, b)
            digit++
          }
          quotient += String(digit)
        }
        return { quotient: stripLeadingZeros(quotient), exact: remainder === '0' }
      }

      // ---------- decimais: { neg, digits, scale } = (-1)^neg × digits × 10^-scale ----------
      function makeDecimal(neg, digits, scale) {
        const clean = stripLeadingZeros(digits)
        return { neg: clean === '0' ? false : neg, digits: clean, scale: scale }
      }

      function isZero(d) {
        return d.digits === '0'
      }

      function intDigitCount(d) {
        return Math.max(d.digits.length - d.scale, 0)
      }

      function parseDecimal(raw, field) {
        if (typeof raw !== 'string' || !DECIMAL_PATTERN.test(raw)) {
          return fail(
            'decimal_invalid',
            'Valor decimal inválido em ' +
              field +
              ': use ponto como separador, sem expoente, até ' +
              MAX_INT_DIGITS +
              ' algarismos inteiros e ' +
              MAX_INPUT_DECIMALS +
              ' decimais.',
            field,
          )
        }
        const neg = raw.charAt(0) === '-'
        const body = neg ? raw.slice(1) : raw
        const parts = body.split('.')
        const fraction = parts.length > 1 ? parts[1] : ''
        return makeDecimal(neg, parts[0] + fraction, fraction.length)
      }

      function alignTo(d, scale) {
        return d.digits + zeros(scale - d.scale)
      }

      function addDecimal(a, b) {
        const scale = Math.max(a.scale, b.scale)
        const x = alignTo(a, scale)
        const y = alignTo(b, scale)
        if (a.neg === b.neg) return makeDecimal(a.neg, addInt(x, y), scale)
        const order = cmpInt(x, y)
        if (order === 0) return makeDecimal(false, '0', scale)
        return order > 0
          ? makeDecimal(a.neg, subInt(x, y), scale)
          : makeDecimal(b.neg, subInt(y, x), scale)
      }

      function negate(d) {
        return makeDecimal(!d.neg, d.digits, d.scale)
      }

      // Trunca na escala interna e informa se houve perda (bit de inexatidão).
      function capScale(d) {
        if (d.scale <= INTERNAL_SCALE) return { value: d, exact: true }
        const drop = d.scale - INTERNAL_SCALE
        const kept = d.digits.length > drop ? d.digits.slice(0, d.digits.length - drop) : '0'
        const dropped = d.digits.slice(Math.max(d.digits.length - drop, 0))
        return { value: makeDecimal(d.neg, kept, INTERNAL_SCALE), exact: /^0*$/.test(dropped) }
      }

      function mulDecimal(a, b) {
        return capScale(makeDecimal(a.neg !== b.neg, mulInt(a.digits, b.digits), a.scale + b.scale))
      }

      function divDecimal(a, b) {
        const numerator = a.digits + zeros(b.scale + INTERNAL_SCALE)
        const denominator = b.digits + zeros(a.scale)
        const result = divInt(numerator, denominator)
        return {
          value: makeDecimal(a.neg !== b.neg, result.quotient, INTERNAL_SCALE),
          exact: result.exact,
        }
      }

      function canonicalRounding(mode) {
        if (typeof mode !== 'string') return ''
        const trimmed = mode.trim()
        if (ROUNDING_MODES.indexOf(trimmed) >= 0) return trimmed
        return own(ROUNDING_ALIASES, trimmed) ? ROUNDING_ALIASES[trimmed] : ''
      }

      // Arredonda magnitude e aplica o sinal (modos simétricos em relação a zero).
      // `exact` = false indica que o valor verdadeiro é maior em magnitude que o
      // representado (resto descartado antes), o que desempata meio e "up".
      function roundDecimal(d, precision, mode, exact) {
        if (d.scale <= precision) {
          return makeDecimal(d.neg, d.digits + zeros(precision - d.scale), precision)
        }
        const drop = d.scale - precision
        const padded = zeros(Math.max(drop + 1 - d.digits.length, 0)) + d.digits
        const kept = padded.slice(0, padded.length - drop)
        const dropped = padded.slice(padded.length - drop)
        const first = dropped.charCodeAt(0) - 48
        const restZero = /^0*$/.test(dropped.slice(1)) && exact
        const allZero = /^0*$/.test(dropped) && exact
        let bump = false
        if (mode === 'up') bump = !allZero
        if (mode === 'half-up') bump = first >= 5
        if (mode === 'half-even') {
          if (first > 5 || (first === 5 && !restZero)) bump = true
          if (first === 5 && restZero) bump = (kept.charCodeAt(kept.length - 1) - 48) % 2 === 1
        }
        return makeDecimal(d.neg, bump ? addInt(kept, '1') : kept, precision)
      }

      function formatDecimal(d) {
        const padded = zeros(Math.max(d.scale + 1 - d.digits.length, 0)) + d.digits
        const intPart = padded.slice(0, padded.length - d.scale)
        const fracPart = padded.slice(padded.length - d.scale)
        return (d.neg ? '-' : '') + intPart + (d.scale > 0 ? '.' + fracPart : '')
      }

      // Formato compacto para a memória: sem zeros à direita na fração.
      function formatCompact(d) {
        const text = formatDecimal(d)
        if (text.indexOf('.') < 0) return text
        return text.replace(/0+$/, '').replace(/\.$/, '')
      }

      // ---------- unidades: assinatura dimensional, sem conversão implícita ----------
      function parseUnit(raw, field) {
        if (typeof raw !== 'string' || raw.trim() === '') {
          return fail('unit_required', 'Informe a unidade em ' + field + ' (use 1 para adimensional).', field)
        }
        const text = raw.trim()
        const dims = {}
        if (text === '1') return { dims: dims, label: '1' }
        const halves = text.split('/')
        if (halves.length > 2) return fail('unit_invalid', 'Unidade inválida em ' + field + ': ' + text, field)
        for (let h = 0; h < halves.length; h++) {
          const sign = h === 0 ? 1 : -1
          const tokens = halves[h].split('.')
          for (let t = 0; t < tokens.length; t++) {
            if (h === 0 && tokens[t] === '1' && tokens.length === 1) continue
            const match = UNIT_TOKEN.exec(tokens[t])
            if (!match) return fail('unit_invalid', 'Unidade inválida em ' + field + ': ' + text, field)
            const power = match[2] === '' ? 1 : Number(match[2])
            dims[match[1]] = (dims[match[1]] || 0) + sign * power
          }
        }
        return { dims: dims, label: unitLabel(dims) }
      }

      function combineUnits(a, b, sign) {
        const dims = {}
        const keys = Object.keys(a.dims).concat(Object.keys(b.dims))
        for (let i = 0; i < keys.length; i++) {
          const k = keys[i]
          if (dims[k] !== undefined) continue
          const power = (a.dims[k] || 0) + sign * (b.dims[k] || 0)
          if (power !== 0) dims[k] = power
        }
        return { dims: dims, label: unitLabel(dims) }
      }

      function unitLabel(dims) {
        const keys = Object.keys(dims).sort()
        const top = []
        const bottom = []
        for (let i = 0; i < keys.length; i++) {
          const p = dims[keys[i]]
          if (p === 0) continue
          const abs = Math.abs(p)
          const token = keys[i] + (abs === 1 ? '' : String(abs))
          if (p > 0) top.push(token)
          else bottom.push(token)
        }
        const head = top.length > 0 ? top.join('.') : '1'
        return bottom.length > 0 ? head + '/' + bottom.join('.') : head
      }

      // ---------- AST: estrutura validada antes de qualquer aritmética ----------
      const OPERATIONS = { add: 'soma', sub: 'subtração', mul: 'multiplicação', div: 'divisão' }

      function validateAst(root) {
        let count = 0
        function walk(node, depth) {
          if (depth > MAX_DEPTH) {
            return fail('ast_too_deep', 'A fórmula passa de ' + MAX_DEPTH + ' níveis.', 'formula_ast')
          }
          count++
          if (count > MAX_NODES) {
            return fail('ast_too_large', 'A fórmula passa de ' + MAX_NODES + ' nós.', 'formula_ast')
          }
          if (!node || typeof node !== 'object' || Array.isArray(node)) {
            return fail('ast_invalid', 'Nó de fórmula inválido.', 'formula_ast')
          }
          if (node.type === 'literal' || node.type === 'input') return null
          if (!own(OPERATIONS, node.type)) {
            return fail('ast_node_unknown', 'Tipo de nó não permitido: ' + String(node.type) + '.', 'formula_ast')
          }
          if (!Array.isArray(node.operands) || node.operands.length !== 2) {
            return fail('ast_invalid', 'A operação ' + node.type + ' exige exatamente 2 operandos.', 'formula_ast')
          }
          for (let i = 0; i < 2; i++) {
            const problem = walk(node.operands[i], depth + 1)
            if (problem) return problem
          }
          return null
        }
        return walk(root, 1)
      }

      function checkRange(value, field) {
        if (intDigitCount(value) > MAX_INT_DIGITS) {
          return fail(
            'out_of_range',
            'Resultado intermediário passa de ' + MAX_INT_DIGITS + ' algarismos inteiros em ' + field + '; exige emenda, não truncamento.',
            field,
          )
        }
        return null
      }

      function evaluate(ast, contract, values) {
        const c = contract || {}
        const precision = c.precision
        if (typeof precision !== 'number' || Math.floor(precision) !== precision || precision < 0 || precision > MAX_PRECISION) {
          return fail('precision_invalid', 'Precisão deve ser inteira entre 0 e ' + MAX_PRECISION + '.', 'precision')
        }
        const rounding = canonicalRounding(c.rounding)
        if (!rounding) {
          return fail('rounding_invalid', 'Arredondamento inválido; use half-up, half-even, down ou up.', 'rounding')
        }
        const outputUnit = parseUnit(c.output_unit, 'output_unit')
        if (outputUnit.engineError) return outputUnit
        const structural = validateAst(ast)
        if (structural) return structural

        const declared = {}
        const inputs = Array.isArray(c.inputs) ? c.inputs : []
        for (let i = 0; i < inputs.length; i++) {
          if (inputs[i] && typeof inputs[i].name === 'string') declared[inputs[i].name] = inputs[i]
        }
        const given = values || {}
        const steps = []
        let exact = true

        function leaf(node) {
          if (node.type === 'literal') {
            const unit = parseUnit(node.unit, 'literal')
            if (unit.engineError) return unit
            const value = parseDecimal(node.value, 'literal')
            if (value.engineError) return value
            return { value: value, unit: unit, label: formatCompact(value) }
          }
          if (!own(declared, node.name)) {
            return fail('input_not_in_contract', 'A entrada ' + String(node.name) + ' não está no contrato.', String(node.name))
          }
          const spec = declared[node.name]
          const raw = own(given, node.name) ? given[node.name] : undefined
          if (raw === undefined || raw === null || raw === '') {
            return fail('input_missing', 'Informe a entrada ' + node.name + ' (' + spec.unit + '); ausência não vira zero.', node.name)
          }
          const value = parseDecimal(raw, node.name)
          if (value.engineError) return value
          if (isZero(value) && spec.allow_zero !== true) {
            return fail('input_zero_not_allowed', 'Zero não é permitido em ' + node.name + ' sem regra homologada.', node.name)
          }
          const unit = parseUnit(spec.unit, node.name)
          if (unit.engineError) return unit
          return { value: value, unit: unit, label: node.name }
        }

        function run(node) {
          if (node.type === 'literal' || node.type === 'input') return leaf(node)
          const left = run(node.operands[0])
          if (left.engineError) return left
          const right = run(node.operands[1])
          if (right.engineError) return right
          let unit
          let result
          if (node.type === 'add' || node.type === 'sub') {
            if (left.unit.label !== right.unit.label) {
              return fail(
                'unit_incompatible',
                'Unidades incompatíveis na ' + OPERATIONS[node.type] + ': ' + left.unit.label + ' e ' + right.unit.label + '. Não há conversão implícita.',
                'formula_ast',
              )
            }
            unit = left.unit
            result = { value: addDecimal(left.value, node.type === 'sub' ? negate(right.value) : right.value), exact: true }
          } else if (node.type === 'mul') {
            unit = combineUnits(left.unit, right.unit, 1)
            result = mulDecimal(left.value, right.value)
          } else {
            if (isZero(right.value)) {
              return fail('division_by_zero', 'Divisão por zero na fórmula.', 'formula_ast')
            }
            unit = combineUnits(left.unit, right.unit, -1)
            result = divDecimal(left.value, right.value)
          }
          const range = checkRange(result.value, 'passo ' + (steps.length + 1))
          if (range) return range
          if (!result.exact) exact = false
          steps.push({
            passo: steps.length + 1,
            operacao: OPERATIONS[node.type],
            a: { valor: formatCompact(left.value), unidade: left.unit.label, origem: left.label },
            b: { valor: formatCompact(right.value), unidade: right.unit.label, origem: right.label },
            resultado: { valor: formatCompact(result.value), unidade: unit.label },
            exato: result.exact,
          })
          return { value: result.value, unit: unit, label: 'passo ' + steps.length }
        }

        const final = run(ast)
        if (final.engineError) return final
        if (final.unit.label !== outputUnit.label) {
          return fail(
            'output_unit_mismatch',
            'A fórmula resulta em ' + final.unit.label + ', mas o contrato declara ' + outputUnit.label + '.',
            'output_unit',
          )
        }
        const rounded = roundDecimal(final.value, precision, rounding, exact)
        return {
          ok: true,
          modo: 'simulacao',
          aprovacao: false,
          resultado: { valor: formatDecimal(rounded), unidade: outputUnit.label },
          bruto: formatCompact(final.value),
          precisao: precision,
          arredondamento: rounding,
          passos: steps,
        }
      }

      // Envelope sem saída parcial: erro nunca carrega passos nem resultado.
      function calculate(ast, contract, values) {
        let outcome
        try {
          outcome = evaluate(ast, contract, values)
        } catch (err) {
          outcome = fail('internal_error', 'Falha inesperada no motor de cálculo.', '')
        }
        if (outcome.engineError) {
          return { ok: false, codigo: outcome.code, mensagem: outcome.message, campo: outcome.field }
        }
        return outcome
      }

      // ---------- fixtures sintéticas fixas (RED/GREEN-P2-003A) ----------
      function op(type, a, b) {
        return { type: type, operands: [a, b] }
      }
      function lit(value, unit) {
        return { type: 'literal', value: value, unit: unit }
      }
      function inp(name) {
        return { type: 'input', name: name }
      }
      function adim(value, precision, rounding) {
        return {
          ast: op('mul', lit(value, '1'), lit('1', '1')),
          contract: { inputs: [], output_unit: '1', precision: precision, rounding: rounding },
          values: {},
        }
      }
      function balanced(leaves) {
        let level = []
        for (let i = 0; i < leaves; i++) level.push(lit('1', '1'))
        while (level.length > 1) {
          const next = []
          for (let i = 0; i + 1 < level.length; i += 2) next.push(op('add', level[i], level[i + 1]))
          if (level.length % 2 === 1) next.push(level[level.length - 1])
          level = next
        }
        return level[0]
      }
      function chain(depth) {
        let node = lit('1', '1')
        for (let i = 1; i < depth; i++) node = op('add', node, lit('1', '1'))
        return node
      }

      const AREA_COEF = {
        ast: op('mul', inp('area'), inp('coeficiente')),
        contract: {
          inputs: [
            { name: 'area', unit: 'm2' },
            { name: 'coeficiente', unit: 'kg/m2' },
          ],
          output_unit: 'kg',
          precision: 2,
          rounding: 'half-up',
        },
        values: { area: '10.25', coeficiente: '0.20' },
      }

      function withValues(base, values) {
        return { ast: base.ast, contract: base.contract, values: values }
      }
      function withContract(base, patch) {
        const contract = {}
        const keys = Object.keys(base.contract)
        for (let i = 0; i < keys.length; i++) contract[keys[i]] = base.contract[keys[i]]
        const extra = Object.keys(patch)
        for (let i = 0; i < extra.length; i++) contract[extra[i]] = patch[extra[i]]
        return { ast: base.ast, contract: contract, values: base.values }
      }

      const FIXTURES = [
        { id: 'GREEN-P2-003A', tipo: 'GREEN', descricao: 'Fixture da SPEC: 10.25 m2 × 0.20 kg/m2 = 2.05 kg', caso: AREA_COEF, esperado: '2.05 kg' },
        { id: 'G-EXATO', tipo: 'GREEN', descricao: '0.1 + 0.2 exato (ponto flutuante daria 0.30000000000000004)', caso: { ast: op('add', lit('0.1', '1'), lit('0.2', '1')), contract: { inputs: [], output_unit: '1', precision: 12, rounding: 'half-up' }, values: {} }, esperado: '0.300000000000 1' },
        { id: 'G-DIVISAO', tipo: 'GREEN', descricao: 'Divisão controlada: 10 m / 3 = 3.3333 m (4 casas, half-up)', caso: { ast: op('div', lit('10', 'm'), lit('3', '1')), contract: { inputs: [], output_unit: 'm', precision: 4, rounding: 'half-up' }, values: {} }, esperado: '3.3333 m' },
        { id: 'G-HALF-UP', tipo: 'GREEN', descricao: 'half-up: 2.345 → 2.35', caso: adim('2.345', 2, 'half-up'), esperado: '2.35 1' },
        { id: 'G-HALF-EVEN-A', tipo: 'GREEN', descricao: 'half-even: 2.345 → 2.34 (empate vai ao par)', caso: adim('2.345', 2, 'half-even'), esperado: '2.34 1' },
        { id: 'G-HALF-EVEN-B', tipo: 'GREEN', descricao: 'half-even: 2.355 → 2.36', caso: adim('2.355', 2, 'half-even'), esperado: '2.36 1' },
        { id: 'G-DOWN', tipo: 'GREEN', descricao: 'down: 2.349 → 2.34', caso: adim('2.349', 2, 'down'), esperado: '2.34 1' },
        { id: 'G-UP', tipo: 'GREEN', descricao: 'up: 2.341 → 2.35', caso: adim('2.341', 2, 'up'), esperado: '2.35 1' },
        { id: 'G-NEGATIVO', tipo: 'GREEN', descricao: 'half-up simétrico: -2.345 → -2.35', caso: adim('-2.345', 2, 'half-up'), esperado: '-2.35 1' },
        { id: 'G-ALIAS-NORMAL', tipo: 'GREEN', descricao: 'Nome legado normal = half-up: 2.345 → 2.35', caso: adim('2.345', 2, 'normal'), esperado: '2.35 1' },
        { id: 'G-DIVISAO-EMPATE', tipo: 'GREEN', descricao: '1 / 8 = 0.125 exato; half-even em 2 casas → 0.12', caso: { ast: op('div', lit('1', '1'), lit('8', '1')), contract: { inputs: [], output_unit: '1', precision: 2, rounding: 'half-even' }, values: {} }, esperado: '0.12 1' },
        { id: 'G-INEXATO', tipo: 'GREEN', descricao: '2 / 3 em 0 casas, down → 0 (resto descartado sinalizado)', caso: { ast: op('div', lit('2', '1'), lit('3', '1')), contract: { inputs: [], output_unit: '1', precision: 0, rounding: 'down' }, values: {} }, esperado: '0 1' },
        { id: 'G-LIMITE', tipo: 'GREEN', descricao: '18 algarismos inteiros: 999999999999999999 × 1', caso: adim('999999999999999999', 0, 'down'), esperado: '999999999999999999 1' },
        { id: 'G-MICRO', tipo: 'GREEN', descricao: '12 decimais: 0.000000000001 × 1000000 = 0.000001', caso: { ast: op('mul', lit('0.000000000001', '1'), lit('1000000', '1')), contract: { inputs: [], output_unit: '1', precision: 6, rounding: 'down' }, values: {} }, esperado: '0.000001 1' },
        { id: 'RED-NO-DESCONHECIDO', tipo: 'RED', descricao: 'Nó fora do contrato (pow) é recusado', caso: { ast: op('pow', lit('2', '1'), lit('3', '1')), contract: AREA_COEF.contract, values: {} }, esperado: 'ast_node_unknown' },
        { id: 'RED-PROFUNDIDADE', tipo: 'RED', descricao: 'Fórmula com 17 níveis é recusada', caso: { ast: chain(17), contract: { inputs: [], output_unit: '1', precision: 0, rounding: 'down' }, values: {} }, esperado: 'ast_too_deep' },
        { id: 'RED-TAMANHO', tipo: 'RED', descricao: 'Fórmula com 257 nós é recusada', caso: { ast: balanced(129), contract: { inputs: [], output_unit: '1', precision: 0, rounding: 'down' }, values: {} }, esperado: 'ast_too_large' },
        { id: 'RED-DIVISAO-ZERO', tipo: 'RED', descricao: 'Divisão por zero é recusada', caso: { ast: op('div', lit('1', 'm'), lit('0', '1')), contract: { inputs: [], output_unit: 'm', precision: 2, rounding: 'down' }, values: {} }, esperado: 'division_by_zero' },
        { id: 'RED-UNIDADE', tipo: 'RED', descricao: 'Soma de m2 com kg/m2 é recusada (unidade incompatível)', caso: { ast: op('add', inp('area'), inp('coeficiente')), contract: AREA_COEF.contract, values: AREA_COEF.values }, esperado: 'unit_incompatible' },
        { id: 'RED-UNIDADE-SAIDA', tipo: 'RED', descricao: 'Resultado em kg com saída declarada em m2 é recusado', caso: withContract(AREA_COEF, { output_unit: 'm2' }), esperado: 'output_unit_mismatch' },
        { id: 'RED-ENTRADA-AUSENTE', tipo: 'RED', descricao: 'Coeficiente ausente bloqueia (não vira zero)', caso: withValues(AREA_COEF, { area: '10.25' }), esperado: 'input_missing' },
        { id: 'RED-COEF-VIRGULA', tipo: 'RED', descricao: 'Coeficiente 0,20 (vírgula) é inválido', caso: withValues(AREA_COEF, { area: '10.25', coeficiente: '0,20' }), esperado: 'decimal_invalid' },
        { id: 'RED-COEF-EXPOENTE', tipo: 'RED', descricao: 'Coeficiente 2e-1 (expoente) é inválido', caso: withValues(AREA_COEF, { area: '10.25', coeficiente: '2e-1' }), esperado: 'decimal_invalid' },
        { id: 'RED-COEF-DECIMAIS', tipo: 'RED', descricao: 'Coeficiente com 13 decimais é inválido', caso: withValues(AREA_COEF, { area: '10.25', coeficiente: '0.1234567890123' }), esperado: 'decimal_invalid' },
        { id: 'RED-CODIGO', tipo: 'RED', descricao: 'Texto com código no lugar do número é recusado, nunca executado', caso: withValues(AREA_COEF, { area: '10.25', coeficiente: '1; $app.delete()' }), esperado: 'decimal_invalid' },
        { id: 'RED-ZERO', tipo: 'RED', descricao: 'Zero sem regra homologada é recusado', caso: withValues(AREA_COEF, { area: '10.25', coeficiente: '0' }), esperado: 'input_zero_not_allowed' },
        { id: 'RED-FAIXA', tipo: 'RED', descricao: '999999999999999999 × 10 passa de 18 inteiros', caso: { ast: op('mul', lit('999999999999999999', '1'), lit('10', '1')), contract: { inputs: [], output_unit: '1', precision: 0, rounding: 'down' }, values: {} }, esperado: 'out_of_range' },
        { id: 'RED-ARREDONDAMENTO', tipo: 'RED', descricao: 'Modo de arredondamento fora do contrato (ceil)', caso: withContract(AREA_COEF, { rounding: 'ceil' }), esperado: 'rounding_invalid' },
        { id: 'RED-PRECISAO', tipo: 'RED', descricao: 'Precisão 13 é recusada', caso: withContract(AREA_COEF, { precision: 13 }), esperado: 'precision_invalid' },
      ]

      function runSelfTest() {
        const cases = []
        let passed = 0
        let memory = null
        for (let i = 0; i < FIXTURES.length; i++) {
          const f = FIXTURES[i]
          const out = calculate(f.caso.ast, f.caso.contract, f.caso.values)
          const obtained = out.ok ? out.resultado.valor + ' ' + out.resultado.unidade : out.codigo
          const ok = f.tipo === 'GREEN' ? out.ok === true && obtained === f.esperado : out.ok === false && obtained === f.esperado
          if (ok) passed++
          if (f.id === 'GREEN-P2-003A' && out.ok) memory = out
          cases.push({
            id: f.id,
            tipo: f.tipo,
            descricao: f.descricao,
            esperado: f.esperado,
            obtido: obtained,
            mensagem: out.ok ? '' : out.mensagem,
            passou: ok,
          })
        }
        return {
          versaoMotor: ENGINE_VERSION,
          resumo: { total: FIXTURES.length, passou: passed, falhou: FIXTURES.length - passed },
          casos: cases,
          memoria: memory,
        }
      }

      return {
        ENGINE_VERSION: ENGINE_VERSION,
        calculate: calculate,
        runSelfTest: runSelfTest,
        canonicalRounding: canonicalRounding,
      }
    })()
    // </decimal-engine>

    const role = e.auth.getString('role')
    if (role !== 'engenharia' && role !== 'admin') {
      return e.forbiddenError('Somente Engenharia ou Administrador podem rodar a prova do cálculo.')
    }

    const report = ENGINE.runSelfTest()
    return e.json(200, {
      modo: 'simulacao',
      aprovacao: false,
      aviso:
        'Simulação sintética para provar o motor no servidor. Não é cálculo real, não usa dados da Mercogeo e não aprova nenhuma solução técnica.',
      runtime: 'pocketbase-jsvm',
      executadoEm: new Date().toISOString(),
      versaoMotor: report.versaoMotor,
      resumo: report.resumo,
      casos: report.casos,
      memoria: report.memoria,
    })
  },
  $apis.requireAuth(),
)
