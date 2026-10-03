# AP-2026-10-03-1430 — Recibo de aceite como manifesto estruturado

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: T1.17 · SPEC-1-006 · prova REG-004
- Sinal: o recibo de aceite funciona melhor como tabela CA→evidência que só consolida provas já existentes (task, QA, migration, teste humano) e transforma ressalvas soltas em bloqueios estruturados (ID, dono, data, prova exigida) — isso transforma o documento em handoff acionável para a fase seguinte.
- Evidência: `05_entregas/fase-1/RECIBO-T1.17.md` (commits 9d8be36 e 5281a89); teste humano aprovado em 2026-10-03 14:29; STATUS.md e fase-1.md atualizados coerentes.
- Regra reutilizável: em task de recibo/consolidação, nunca criar prova nova — consolidar referências verificáveis dos registros canônicos (changelog, fase, matrizes) e registrar o que faltar como bloqueio com dono/data, nunca como simulação.
- Quando aplicar: qualquer task de fechamento de fase ou recibo de aceite (ex.: T2.12, recibo de aceite F2).
- Quando não aplicar: não substitui provas técnicas reais (ex.: recuperação real CA-1-13 segue pendente — o recibo apenas as estrutura como bloqueio).
- Confiança: média — padrão único até agora, mas com evidência concreta e aplicação imediata previsível.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
