# Debug — 2026-09-11 — T1.5 ficha técnica (anexos e histórico)

- **Sintoma:** "Something went wrong while processing your request." ao salvar ficha técnica.
- **Reprodução:** POST `/backend/v1/opportunities/tech-sheet` com anexos → status 0, `http: no such file`; GET histórico → `TypeError ... dbx.Params`.
- **Causa raiz 1:** `e.findUploadedFiles()` retorna `FileHeader` multipart; gravar direto no campo `attachments` falha — exigia `$filesystem.fileFromMultipart()`.
- **Causa raiz 2:** `findRecordsByFilter` não aceita o ID como parâmetro posicional de bind; o filtro precisa da expressão interpolada (ID validado antes com `^[a-z0-9]{15}$`).
- **Correção:** conversão multipart no hook de criação; filtro com ID validado na fronteira; validação de formato reforçada nos dois endpoints.
- **Verificação:** QA SKIP 0.0.15 (setup, análise estática, build, integrações, testes) — passou; sem novos erros nos logs.
- **Gate:** aguardando teste humano.
