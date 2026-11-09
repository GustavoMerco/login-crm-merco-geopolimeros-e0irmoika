import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { hasPermission } from '@/lib/auth/permissions'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { ADMIN_INDEX_URL } from '@/lib/navigation'
import { runCalculationProof, type CalculationProofReport } from '@/services/dimensioning'

// T2.5 — página de diagnóstico, somente leitura e fora da jornada de produto
// (D-T2.5). Pede ao servidor a prova do motor decimal com fixtures sintéticas e
// mostra esperado × obtido e a memória. Não envia valores, não grava e não aprova.
type ProofState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'done'; report: CalculationProofReport }

export default function CalculationProof() {
  const { user } = useAuth()
  const [state, setState] = useState<ProofState>({ kind: 'idle' })
  const canRun = hasPermission(user?.role, 'approveReadiness')

  const run = async () => {
    setState({ kind: 'loading' })
    try {
      const report = await runCalculationProof()
      setState({ kind: 'done', report })
    } catch (error) {
      setState({ kind: 'error', message: getErrorMessage(error) })
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link className="text-[13px] text-mg-brand underline" to={ADMIN_INDEX_URL}>
          Voltar para Administração
        </Link>
        <h1 className="mt-2 text-xl font-bold text-mg-ink">Prova do cálculo decimal (T2.5)</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-mg-muted">
          O servidor executa o motor de cálculo com exemplos sintéticos fixos e compara o esperado
          com o obtido. É uma simulação: não usa dados da Mercogeo, não grava nada e não aprova
          nenhuma solução técnica.
        </p>
      </div>

      {!canRun ? (
        <p role="status" className="text-sm text-mg-muted">
          Somente Engenharia ou Administrador podem rodar a prova do cálculo.
        </p>
      ) : (
        <button
          type="button"
          onClick={run}
          disabled={state.kind === 'loading'}
          className="min-h-[44px] rounded-[10px] bg-mg-brand-fill px-4 text-sm font-semibold text-white hover:bg-mg-brand-fill focus-visible:outline focus-visible:outline-2 focus-visible:outline-mg-brand disabled:opacity-60"
        >
          {state.kind === 'loading' ? 'Rodando no servidor…' : 'Rodar prova no servidor'}
        </button>
      )}

      {state.kind === 'error' && (
        <p role="alert" className="rounded-lg border border-mg-crit-line bg-mg-crit-bg p-3 text-sm text-mg-crit">
          {state.message}
        </p>
      )}

      {state.kind === 'done' && <ProofResult report={state.report} />}
    </div>
  )
}

function ProofResult({ report }: { report: CalculationProofReport }) {
  const allPassed = report.resumo.falhou === 0
  const memory = report.memoria
  return (
    <div className="space-y-6">
      <div role="status" className="rounded-lg border border-mg-warn-line bg-mg-warn-bg p-3 text-sm text-mg-warn">
        <strong>Simulação, não aprovação.</strong> {report.aviso}
      </div>

      <p className={`text-sm font-semibold ${allPassed ? 'text-mg-brand' : 'text-mg-crit'}`}>
        {report.resumo.passou} de {report.resumo.total} casos passaram
        {allPassed ? '.' : ` — ${report.resumo.falhou} falharam.`}{' '}
        <span className="font-normal text-mg-muted">
          Motor {report.versaoMotor} · {report.runtime} · {new Date(report.executadoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
        </span>
      </p>

      {memory && (
        <section aria-labelledby="memoria-titulo" className="rounded-lg border border-mg-line bg-mg-surface p-4">
          <h2 id="memoria-titulo" className="font-semibold text-mg-ink">
            Memória da fixture da SPEC (simulação)
          </h2>
          <ol className="mt-2 space-y-1 text-sm text-mg-ink">
            {memory.passos.map((step) => (
              <li key={step.passo}>
                Passo {step.passo} ({step.operacao}): {step.a.origem} = {step.a.valor} {step.a.unidade} e{' '}
                {step.b.origem} = {step.b.valor} {step.b.unidade} → {step.resultado.valor} {step.resultado.unidade}
                {step.exato ? '' : ' (inexato: resto descartado)'}
              </li>
            ))}
          </ol>
          <p className="mt-2 text-sm text-mg-ink">
            Resultado: <strong>{memory.resultado.valor} {memory.resultado.unidade}</strong>{' '}
            <span className="text-mg-muted">
              ({memory.precisao} casas, {memory.arredondamento}; bruto {memory.bruto})
            </span>
          </p>
        </section>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Casos da prova com esperado e obtido</caption>
          <thead className="text-[12px] uppercase text-mg-muted">
            <tr>
              <th scope="col" className="p-2">Caso</th>
              <th scope="col" className="p-2">O que prova</th>
              <th scope="col" className="p-2">Esperado</th>
              <th scope="col" className="p-2">Obtido</th>
              <th scope="col" className="p-2">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {report.casos.map((item) => (
              <tr key={item.id} className="border-t border-mg-line align-top">
                <td className="p-2 font-mono text-[12px]">{item.id}</td>
                <td className="p-2">
                  {item.descricao}
                  {item.mensagem && <span className="block text-[12px] text-mg-muted">{item.mensagem}</span>}
                </td>
                <td className="p-2 font-mono text-[12px]">{item.esperado}</td>
                <td className="p-2 font-mono text-[12px]">{item.obtido}</td>
                <td className={`p-2 font-semibold ${item.passou ? 'text-mg-brand' : 'text-mg-crit'}`}>
                  {item.passou ? 'Passou' : 'Falhou'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
