# AP-2026-09-19 — acesso autenticado a arquivos de modelos

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: T1.13 / SPEC-1-007
- Sinal: upload e aprovação do registro funcionavam, mas a interface não oferecia abertura do arquivo armazenado.
- Evidência: Debug Summary `artifacts/debug-t113-2026-09-19.md`; correção na versão 0.0.53; log de GET autenticado do DOCX com HTTP 200; teste humano aprovado no preview.
- Regra reutilizável: toda entrega com campo de arquivo deve expor ação de abertura/baixar autenticada e exercitar o acesso ao conteúdo, não apenas a criação/aprovação do registro.
- Quando aplicar: ao implementar ou revisar uploads, anexos, modelos e documentos protegidos por sessão.
- Quando não aplicar: registros sem conteúdo de arquivo ou arquivos deliberadamente públicos, desde que a SPEC declare isso.
- Confiança: alta — causa reproduzida, corrigida, revalidada automaticamente e confirmada no preview.
- Privacidade: sem segredo, credencial, dado pessoal ou conteúdo bruto.
