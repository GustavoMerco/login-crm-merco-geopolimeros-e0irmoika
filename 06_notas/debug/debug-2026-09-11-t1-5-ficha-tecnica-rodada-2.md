# Debug — 2026-09-11 — T1.5 ficha técnica (rodada 2)

- **Sintoma:** mesmo erro após a primeira correção; log mudou para `failed to upload all files: "u6nv4i0o38_1fmiecpg5q": open : no such file or directory`.
- **Causa raiz:** o manuseio de multipart em rota customizada (`routerAdd` + `findUploadedFiles` + `fileFromMultipart`) não preserva o arquivo temporário no runtime do Skip; a gravação falha ao abrir o caminho vazio.
- **Correção:** troca de estratégia — upload pelo fluxo nativo do PocketBase (`create` na coleção `tech_sheets`), que trata multipart de forma confiável, com migration 0007 abrindo `createRule` autenticado e hook `onRecordCreateRequest` mantendo TODAS as validações server-side (responsável, parâmetros, pendências, observações, versão calculada pelo servidor, autor pela sessão) e auditoria em `onRecordAfterCreateSuccess`.
- **Verificação:** QA SKIP 0.0.16 passou; migration 0007 aplicada; createRule confirmada no schema.
- **Gate:** aguardando teste humano.
