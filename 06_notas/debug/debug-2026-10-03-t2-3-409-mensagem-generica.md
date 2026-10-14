# Debug 2026-10-03 — T2.3: 409 exibia mensagem genérica no card

## Sintoma

No teste humano do passo 4 (código duplicado), o card da Biblioteca de composições
exibia "Something went wrong." em vez do motivo do 409. A API negava corretamente
(409 com `{ error: "Código já existe para esta família; revisão cria nova versão via /revise.", reason: "code_duplicated" }`)
e a lista não duplicava — falha exclusiva de apresentação.

## Reprodução

Preview, login QA Engenharia, formulário da Biblioteca com código COMP-TESTE-01 já
existente → submit → alerta genérico. Reproduzido 1:1 antes da correção.

## Causa raiz

`getErrorMessage` (src/lib/pocketbase/errors.ts) só lia `error.response.data`
(field-errors nativo do PocketBase) e `error.message` (genérico do SDK). Corpos de
negócio server-side enviados via `e.json(409, { error, reason })` chegam ao SDK como
`error.response` — campo `error` nunca era lido → fallback genérico.

## Correção

`getErrorMessage` agora lê `error.response.error` e `error.response.message`
(corpos de negócio) antes do fallback. Versão 0.0.69; QA completo passou.

## Verificação

Reprodução pós-correção no preview: alerta exibe "Código já existe para esta família;
revisão cria nova versão via /revise." — sem "Something went wrong", lista com um único
COMP-TESTE-01 v1. Evidência: t23-409-mensagem-real.png.

## Gate atual

aguardando teste humano (passo 4 revalidado pelo champion)
