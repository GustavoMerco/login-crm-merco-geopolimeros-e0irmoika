# AP-2026-09-11-1517 — Recebimento e responsável definidos na fronteira server-side

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: T1.3 / SPEC-1-002
- Sinal: o endpoint de criação rejeita recebimento e responsável enviados pelo cliente e define ambos a partir da sessão e do relógio do servidor.
- Evidência: `pocketbase/hooks/opportunities_create.js`, `pocketbase/migrations/0004_create_opportunities.js`, logs de criação HTTP 201 e rejeições HTTP 400/401, teste humano aprovado.
- Regra reutilizável: eventos que iniciam métricas ou definem autoria devem ser gerados no servidor; dados enviados pelo navegador não podem substituir esses valores.
- Quando aplicar: no primeiro registro de demanda, mudança de responsável e qualquer marco usado em K1–K3.
- Quando não aplicar: para campos de contexto fornecidos pelo Comercial, como origem, local e família de serviço, que devem permanecer informados e auditáveis.
- Confiança: alta — comportamento confirmado no código, schema, logs e teste humano.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
