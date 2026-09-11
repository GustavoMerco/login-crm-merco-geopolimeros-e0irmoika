# Debug Summary — T1.4 — 2026-09-11

**Problema:** ao selecionar uma demanda persistida e avaliar aptidão, o preview retornava `The requested resource wasn't found`.

**Reprodução:** logs mostraram `GET /api/collections/opportunities/records` com HTTP 200, seguido de `POST /backend/v1/opportunities/{id}/aptitude` com HTTP 404.

**Causa raiz:** a rota customizada com parâmetro de caminho `{id}` não era encontrada pelo roteador do backend nesse formato, embora a listagem e a collection existissem.

**Correção:** substituída por rota fixa `POST /backend/v1/opportunities/aptitude`; o ID da oportunidade agora é enviado no corpo autenticado. O frontend foi ajustado para usar a nova rota.

**Verificação:** QA SKIP 0.0.12 passou; nova rota sem autenticação retorna HTTP 401; listagem permanece HTTP 200.

**Gate:** aguardando novo teste humano autenticado da avaliação, bloqueio e exceção.
