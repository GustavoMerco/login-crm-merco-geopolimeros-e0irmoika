# AP-2026-09-11-1454 — Revogação server-side com invalidação do token

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: T1.2 / SPEC-1-001
- Sinal: a revogação de sessão foi implementada no backend alterando o `tokenKey` do usuário, enquanto o frontend valida `authStore.isValid` e executa `authRefresh()` no carregamento.
- Evidência: `pocketbase/hooks/auth_revoke_session.js`, `src/contexts/AuthContext.tsx`, logs autenticados de `auth-refresh` e `auth/revoke-session` com HTTP 200, teste humano aprovado.
- Regra reutilizável: sessão revogada deve ser invalidada no servidor e revalidada no carregamento; limpar apenas o estado local não é suficiente.
- Quando aplicar: em logout, troca de credencial, revogação administrativa ou resposta de incidente.
- Quando não aplicar: para simples navegação entre páginas sem mudança de estado de autenticação.
- Confiança: alta — comportamento confirmado no backend, no cliente e no teste humano.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
