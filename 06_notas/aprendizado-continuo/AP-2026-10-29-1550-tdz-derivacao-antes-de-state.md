# AP-2026-10-29-1550 — TDZ: derivação de opções antes da declaração do state

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: T2.34 / SPEC-2-001 (UX-F2-001)
- Sinal: derivar lista de opções a partir de um `useState` declarado mais abaixo no componente lança ReferenceError no primeiro render (TDZ) e derruba a seção inteira antes de qualquer request — o servidor não registra nenhum log da rota, o que indica causa no frontend.
- Evidência: Skip 0.0.141 (crash no teste humano; nenhum request a /backend/v1/dimensioning/readiness nos logs) → 0.0.142 (derivação movida; QA reprovou por declaração emendada em uma linha) → 0.0.143/f685e0f (QA PASS; reteste humano "Funcionou").
- Regra reutilizável: declarar todos os `useState` antes de qualquer derivação que os use; ao depurar "erro ao carregar seção" sem request correspondente nos logs do servidor, suspeitar de erro de render no frontend antes de investigar API.
- Quando aplicar: telas que derivam opções/listas de estados carregados por consulta.
- Quando não aplicar: derivação dentro de useMemo/callback posicionado após as declarações, ou estados inicializados com literal.
- Confiança: alta — causa raiz confirmada por correção seguida de reteste humano aprovado.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
