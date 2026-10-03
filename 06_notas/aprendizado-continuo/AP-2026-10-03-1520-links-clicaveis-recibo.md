# AP-2026-10-03-1520 — Links clicáveis em recibos com anexos

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: T2.1 · SPEC-2-001 · debug de teste humano
- Sinal: recibo que referencia artefatos por caminho em texto não navega no GitHub (blob view) — o revisor que abre só o recibo não chega aos anexos; referências precisam ser links clicáveis (relativos) e o recibo precisa de seção de anexos.
- Evidência: `06_notas/debug/debug-2026-10-03-t2-1-templates-nao-visiveis.md`; correção no commit seguinte a 17212d16.
- Regra reutilizável: todo recibo/entrega que citar artefatos separados usa links markdown relativos clicáveis e lista os anexos em seção própria.
- Quando aplicar: recibos, manifestos e entregas com múltiplos arquivos (ex.: T2.12).
- Quando não aplicar: referências internas a sistemas externos (QA do Skip) que não têm URL no repo.
- Confiança: média — padrão confirmado em um caso, com contraprova conhecida (referências externas).
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
