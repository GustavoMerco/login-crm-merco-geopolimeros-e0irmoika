# AP-2026-09-11-1617 — Aptidão server-side e checklist visível

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: T1.4 / SPEC-1-002
- Sinal: o checklist e a aptidão são calculados no servidor; a interface exibe todos os campos, pendências e detalhes da oportunidade; exceções exigem Engenharia/Admin e justificativa.
- Evidência: `pocketbase/hooks/opportunities_aptitude.js`, migration 0005 aplicada, QA 0.0.13, logs HTTP 200, teste humano aprovado.
- Regra reutilizável: não confundir regra server-side aprovada com apresentação suficiente; estados, checklist e pendências devem ser visíveis mesmo quando a lista de pendências está vazia.
- Quando aplicar: em qualquer etapa de qualificação que bloqueie ou libere o avanço de uma oportunidade.
- Quando não aplicar: em regras de cálculo ou solução técnica, que exigem catálogo/regra homologada própria.
- Confiança: alta — comportamento confirmado no backend, interface, logs e teste humano.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
