# AP-2026-09-15-1555 — retroalimentação de eventos em dados pré-instrumentação

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: T1.6 / SPEC-1-004
- Sinal: quando uma nova instrumentação grava eventos a partir daquele momento, registros criados antes ficam sem histórico e travam fluxos que exigem sequência (ex.: pronta exige recebida). A correção é uma migration de retroalimentação usando os timestamps server-side já existentes nos registros, marcando o evento como retroativo — nunca inventando datas.
- Evidência: sintoma relatado no teste humano da T1.6 (demandas apta sem fluxo de marcos), migration 0011 aplicada, QA 0.0.24, novo teste humano aprovado.
- Regra reutilizável: toda instrumentação nova de eventos deve prever a retroalimentação dos registros existentes na mesma task.
- Quando aplicar: criação de coleções de eventos/timeline sobre dados que já existem.
- Quando não aplicar: coleções novas sobre dados que só passam a existir com a própria task.
- Confiança: alta — causa confirmada pelo sintoma e correção validada em teste humano.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
