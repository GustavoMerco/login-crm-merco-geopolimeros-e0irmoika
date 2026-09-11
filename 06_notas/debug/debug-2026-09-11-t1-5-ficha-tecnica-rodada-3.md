# Debug — 2026-09-11 — T1.5 ficha técnica (rodada 3, causa raiz final)

- **Sintoma:** "Envie no máximo 50 parâmetros por versão." com um único parâmetro no formulário.
- **Reprodução:** via API real (usuário de teste + oportunidade sintética), JSON e multipart — erro idêntico ao do navegador.
- **Mapa empírico:** `[]` e `{}` → "Cada parâmetro deve ser um objeto"; `[1,2,3]` → idem; string curta → "máximo 50"; objetos válidos com nomes ≥2 chars → "máximo 50". Padrão único compatível com: `record.get` em campo JSON devolve **bytes brutos** (types.JsonRaw) — `.length` é o tamanho em bytes do texto e a iteração dá códigos de caractere.
- **Causa raiz:** em `onRecordCreateRequest`, campos JSON não vêm como array/objeto JS; ler via `record.get` quebra toda validação baseada em `.length` e em itens.
- **Correção:** ler o campo com `record.getString` (texto JSON) e `JSON.parse` antes de validar; validações server-side, versão calculada pelo servidor e autor pela sessão preservados.
- **Verificação (GREEN, API real):** v1 criada (201); alteração de parâmetro gerou v2 com versão server-side; multipart com anexo salvo (v3, arquivo armazenado); histórico listado via listRule (200). QA SKIP 0.0.20 passou. Dados sintéticos removidos (migration 0008).
- **Gate:** aguardando teste humano.
