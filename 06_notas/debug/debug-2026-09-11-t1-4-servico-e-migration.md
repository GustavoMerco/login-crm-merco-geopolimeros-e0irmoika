# Debug Summary — T1.4 — 2026-09-11

**Problema:** após a avaliação, o usuário não via checklist/pendências; os cards mostravam apenas o nome da oportunidade e poucos dados.

**Reprodução:** logs confirmaram `POST /backend/v1/opportunities/aptitude` com HTTP 200. No frontend, o bloco de checklist só era renderizado quando `pendingItems.length > 0`; o card listava apenas cliente, status, família e local.

**Causa raiz:** regra server-side funcionando, mas apresentação incompleta: checklist omitido quando não havia pendências e card sem contato, origem, datas, recebimento e demais informações.

**Correção:** checklist agora sempre é renderizado, com cada campo marcado como preenchido/pendente e mensagem de nenhuma pendência; cards agora exibem contato, origem, família, local, data da demanda, recebimento e prazo quando informado.

**Verificação:** QA SKIP 0.0.13 passou; avaliação server-side já confirmada HTTP 200.

**Gate:** aguardando novo teste humano.
