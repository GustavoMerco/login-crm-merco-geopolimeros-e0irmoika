# AP-2026-09-11-1409 — Autorização centralizada por papel

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: T1.1 / SPEC-1-001
- Sinal: o controle de acesso foi implementado com catálogo único de papéis e permissões, reutilizado pelo dashboard.
- Evidência: `src/lib/auth/permissions.ts`, `src/pages/Dashboard.tsx`, QA SKIP 0.0.4 e teste humano aprovado.
- Regra reutilizável: novas ações protegidas devem consultar o catálogo centralizado de permissões, em vez de duplicar regras no componente.
- Quando aplicar: ao adicionar qualquer ação que dependa de papel de usuário.
- Quando não aplicar: para auditoria, retenção e revogação de sessão, que pertencem à T1.2.
- Confiança: alta — regra observada em implementação aprovada e verificações concluídas.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
