# AP-2026-10-03-1710 — Badge do card deve mapear todos os estados da API

## Contexto

T2.2 (gate de prontidão por família). A API de readiness retorna três estados
(`bloqueado`, `aprovado`, `invalidado`), mas o card do Dashboard mapeava apenas dois
(`aprovado` → verde, qualquer outra coisa → "BLOQUEADO" vermelho). A invalidação real
provada pela migration 0046 aparecia na tela com o rótulo errado.

## Aprendizado

- **Regra geral:** quando um endpoint expõe N estados, o componente que o exibe deve mapear
  os N explicitamente — nunca um ternário aprovado/outra-coisa. Estado novo na API sem
  rótulo novo na UI é falha de apresentação silenciosa (mesma família de
  AP-2026-09-11-1617: regra server-side aprovada ≠ apresentação suficiente).
- **Detecção:** surgiu na pré-verificação do roteiro de teste humano no preview, não no QA
  automatizado — o QA valida contratos, a tela valida rótulos. Pré-verificar o card com
  login real antes de entregar o roteiro ao champion.
- **Correção aplicada:** versão 0.0.62 — ternário aninhado com INVALIDADO em âmbar/vermelho
  distinto de BLOQUEADO; QA 0.0.62 completo passou.

## Quando reusar

Qualquer task futura que adicione estado de coleção/hook consumido por card ou badge no
Dashboard: enumerar os estados da resposta e criar um rótulo por estado antes do teste humano.
