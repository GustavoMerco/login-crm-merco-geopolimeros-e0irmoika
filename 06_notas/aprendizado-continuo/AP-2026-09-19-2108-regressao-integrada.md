# AP-2026-09-19 — regressão integrada com fixtures isoladas

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: T1.15 / SPEC-1-001
- Sinal: regressão transversal precisa atravessar os fluxos já entregues com personas sintéticas distintas e remover todas as dependências criadas, sem testar apenas a tela.
- Evidência: 29/29 provas REG-001/REG-002; QA SKIP 0.0.55; migration 0042 aplicada; rotas sem sessão 401; CRUD direto 403; teste humano aprovado no preview.
- Regra reutilizável: regressões integradas devem separar RED/GREEN por papel, autenticação, idempotência e falha segura, registrar códigos HTTP/logs e possuir cleanup explícito de usuários, registros dependentes, recibos e auditorias sintéticas.
- Quando aplicar: em qualquer rodada REG-001/REG-002 ou regressão transversal que atravesse coleções server-side e papéis distintos.
- Quando não aplicar: validações unitárias isoladas sem criação de dados persistentes.
- Confiança: alta — rodada executada, limpeza aplicada e comportamento confirmado pelo champion.
- Privacidade: sem segredo, credencial, dado pessoal ou conteúdo bruto.
