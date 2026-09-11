# Debug Summary — T1.4 — 2026-09-11

**Problema:** o primeiro QA da T1.4 falhou no build porque `createOpportunity` deixou de ser exportada ao atualizar `src/services/opportunities.ts`.

**Reprodução:** QA SKIP 0.0.8; build falhou com `[MISSING_EXPORT] createOpportunity is not exported` em `src/pages/Dashboard.tsx`.

**Causa raiz:** a atualização do serviço adicionou `evaluateOpportunityAptitude` substituindo o conteúdo anterior, em vez de preservar a exportação de cadastro da T1.3.

**Correção:** restauração de `CreateOpportunityInput`, `CreatedOpportunity` e `createOpportunity`, mantendo o novo serviço de avaliação.

**Verificação:** QA SKIP 0.0.9 passou; após correção da migration, QA SKIP 0.0.10 passou. Migration `0005_add_opportunity_aptitude` aplicada e campos de aptidão confirmados no schema ativo.

**Limitação:** chamada sem sessão para ID fictício retornou 404 por recurso inexistente; não foi usada como prova de autorização. O fluxo autenticado com oportunidade válida permanece no teste humano.
