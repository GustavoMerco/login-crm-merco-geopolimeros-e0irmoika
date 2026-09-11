# Estado atual — Adapta Cliente

- task_id: T1.5
- champion: Paulo Romeiro
- spec: 04_fase-atual/specs/SPEC-1-003.md
- etapa: aguardando_teste_humano
- autorizacao_implementacao: confirmada em 2026-09-11 17:48 - "Sim, implementar a T1.5"
- teste_humano: pendente
- verificacao_automatica: passou - QA SKIP 0.0.20; GREEN comprovado via API real: v1 criada (201), alteração gerou v2 com versão calculada server-side, multipart com anexo salvo (v3), histórico listado por listRule; dados sintéticos de teste removidos pela migration 0008
- aprendizado: pendente
- ultima_acao: causa raiz confirmada (campo JSON chega como bytes brutos via record.get; getString devolve o texto JSON) e corrigida
- proxima_acao: aguardar teste humano da ficha técnica no preview
- atualizado_em: 2026-09-11T19:20:00-03:00
