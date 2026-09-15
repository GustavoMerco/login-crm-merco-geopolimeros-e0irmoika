# AP-2026-09-15-1615 — zero não passa em required e datas com sufixo de tempo

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: T1.7 / SPEC-1-004
- Sinal 1: PocketBase trata número 0 como "vazio" em campo `required` — agregados que podem ser 0 ("sem amostra") não podem ser `required`; como o servidor é o único escritor (CRUD bloqueado), tornar o campo opcional não abre brecha.
- Sinal 2: campos `date` armazenados incluem sufixo de tempo (`2026-09-15 00:00:00.000Z`); comparar com string de data pura (`<= "2026-09-15"`) falha lexicograficamente — usar limites com formato completo (`00:00:00.000Z` / `23:59:59.999Z`).
- Evidência: reprodução via API real na T1.7 (validation_required nos agregados zerados; idempotência criando duplicado), correções 0013 e hook, re-teste GREEN (QA 0.0.27–0.0.29).
- Regra reutilizável: em coleções escritas só pelo servidor, campos numéricos que podem ser 0 devem ser opcionais; filtros de idempotência sobre datas devem usar limites de dia completos.
- Quando aplicar: qualquer agregação/estatística armazenada e qualquer filtro de unicidade por janela de datas.
- Quando não aplicar: campos que o cliente preenche e que nunca são 0 legítimo.
- Confiança: alta — reproduzido, corrigido e re-verificado via API real.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
