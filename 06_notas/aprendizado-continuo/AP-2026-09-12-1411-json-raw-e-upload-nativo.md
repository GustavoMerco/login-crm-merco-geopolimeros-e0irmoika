# AP-2026-09-12-1411 — JSON raw e upload nativo

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: T1.5 / SPEC-1-003
- Sinal: em hooks de requisição, campos JSON chegam como bytes brutos via `record.get` (`.length` é o tamanho do texto; itens são códigos de caractere); o caminho estável é `record.getString` + `JSON.parse`. Multipart em rota `routerAdd` perde o arquivo temporário; o caminho estável é o fluxo nativo de criação do PocketBase com validação em `onRecordCreateRequest` e auditoria em `onRecordAfterCreateSuccess`.
- Evidência: mapa empírico de erros da T1.5 (rodadas 2 e 3), GREEN via API real na 0.0.20/0.0.21, teste humano aprovado.
- Regra reutilizável: validar campos JSON e arquivos sempre pelos caminhos nativos do runtime, nunca por conversão manual em rota customizada.
- Quando aplicar: qualquer coleção com campos `json` ou upload de arquivos.
- Quando não aplicar: campos texto/number/select, que chegam interpretados.
- Confiança: alta — causa demonstrada por reprodução e correção verificada.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
