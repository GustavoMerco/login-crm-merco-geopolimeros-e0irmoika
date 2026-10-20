# AP-2026-10-19-1415 — Navegação publicada deve apontar para fluxo disponível

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: diagnóstico T2.13; SPEC-2-006, CA-2-11 (T2.14/T2.15)
- Sinal: o menu publicou módulos de CRM como Clientes/Propostas/Projetos, mas as rotas exibiam placeholders; a rota técnica existente que contém formulários reais ficou fora do menu. O champion seguiu o menu e não chegou ao fluxo esperado.
- Evidência: `src/components/AppLayout.tsx` (navItems sem `/painel-tecnico`); `src/App.tsx` (rota `/painel-tecnico` registrada); `src/pages/Clientes.tsx` (Módulo em breve/modal mock); `src/pages/Propostas.tsx` e `src/pages/Projetos.tsx` (Módulo em breve); Debug Summary `06_notas/debug/debug-2026-10-19-t2-13-menu-placeholder.md`.
- Regra reutilizável: antes de instruir um teste humano, verificar que a rota é alcançável pelo menu ou declarar explicitamente o caminho direto e validar que o controle essencial está visível, habilitado e tem ação real. Não orientar o usuário a tentar módulos que são placeholders.
- Quando aplicar: testes humanos de navegação e fluxo em telas/módulos já entregues.
- Quando não aplicar: rotas explicitamente em desenvolvimento que o roteiro identifica como acesso técnico temporário, desde que a rota seja comunicada e testada previamente.
- Confiança: alta — menu, rotas e componentes lidos diretamente; comportamento confirmado no preview.
- Privacidade: sem segredos, credenciais ou dados pessoais.
