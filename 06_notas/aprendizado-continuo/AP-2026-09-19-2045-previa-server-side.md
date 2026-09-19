# AP-2026-09-19 — prévia sem preço como fronteira server-side

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: T1.14 / SPEC-1-007
- Sinal: a prévia precisa ser útil para revisão/impressão, mas não pode depender apenas do selo visual para impedir preço ou envio.
- Evidência: versão SKIP 0.0.54; migration 0041; criação da prévia HTTP 201; leitura HTTP 200; tentativa de envio HTTP 409; teste humano aprovado no preview.
- Regra reutilizável: regras de prévia (modelo aprovado, demanda do responsável, ausência de preço/faturamento e envio bloqueado) devem ser validadas e impostas server-side; a interface apenas apresenta o resultado e a prova negativa.
- Quando aplicar: qualquer fluxo documental que permita revisar ou imprimir antes de uma etapa posterior de aprovação/envio.
- Quando não aplicar: documentos explicitamente públicos e sem transição de envio, desde que a SPEC declare essa exceção.
- Confiança: alta — regra implementada, exercitada por API real e confirmada pelo champion no preview.
- Privacidade: sem segredo, credencial, dado pessoal ou conteúdo bruto.
