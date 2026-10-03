# Debug Summary — T1.16

- **Task e problema:** T1.16 / SPEC-1-004; ao clicar em `Assinar revisão semanal`, o preview exibiu `Something went wrong while processing your request.`
- **Reprodução:** teste humano acionou a revisão autenticada; o runtime registrou `POST /backend/v1/time-quality/reviews` com status 0. As rotas sem sessão continuaram respondendo 401 e o CRUD direto 403.
- **Causa raiz:** a rota retornava `e.json(201, { id: reviewId, ...summary, signature })`. O JSVM do PocketBase tentou resolver o spread como `__spreadValues`, que não está disponível no runtime: `ReferenceError: __spreadValues is not defined at /pb.js:307:52(822)`.
- **Correção:** substituído somente o spread por um objeto de resposta explícito com os campos da revisão. Nenhuma regra de negócio, critério, persistência ou autorização foi ampliada.
- **Verificação automática:** versão SKIP 0.0.58 passou setup, análise estática, build, integrações e testes. Backend oficial repetiu GET/POST sem sessão com HTTP 401 e criação direta na coleção com HTTP 403. Nenhum novo erro de hook registrado após a correção.
- **Gate atual:** aguardando teste humano.
- **Próximo passo:** repetir no preview o mesmo fluxo de assinar a revisão semanal e confirmar se o relatório aparece.
