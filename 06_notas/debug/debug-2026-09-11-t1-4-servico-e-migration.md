# Debug Summary — T1.4 — 2026-09-11

**Problema:** demandas criadas não apareciam para o usuário no dashboard.

**Reprodução:** o backend possuía a collection `opportunities` e registros persistidos, mas `Dashboard.tsx` só mantinha `createdOpportunity` em memória e não executava nenhuma consulta/listagem de oportunidades.

**Causa raiz:** ausência de serviço frontend para listar `opportunities` e ausência de componente de lista; o cadastro funcionava, mas a tela não recarregava nem mostrava registros existentes.

**Correção:** adicionada `getOpportunities()` com consulta paginada/autenticada, lista de demandas no dashboard, atualização após novo cadastro e seleção de uma oportunidade persistida para avaliação de aptidão.

**Verificação:** QA SKIP 0.0.11 passou; acesso direto não autenticado não expôs dados; collection mantém leitura restrita ao responsável autenticado.

**Gate:** aguardando novo teste humano do dashboard/listagem e avaliação.
