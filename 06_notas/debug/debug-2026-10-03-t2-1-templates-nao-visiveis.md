# Debug 2026-10-03 — T2.1 templates não visíveis a partir do recibo

## Debug Summary

**Task e problema:** T2.1 — champion não enxerga os templates A–D a partir do recibo PRONTIDAO-F2.md.
**Reprodução:** abrir `05_entregas/fase-2/PRONTIDAO-F2.md` no GitHub (blob view): as referências aos templates aparecem como caminhos em código inline, não clicáveis; sem seção de anexos, não há navegação direta.
**Causa raiz:** referências a artefatos entregues como caminhos em texto — em blob view do GitHub não navegam; recibo sem seção de anexos com links.
**Correção:** painel de prontidão passa a usar links relativos clicáveis por template + nova seção "Anexos — templates de prova" com os 4 links.
**Verificação automática:** releitura do arquivo atualizado no GitHub confirmando links e seção.
**Gate atual:** aguardando teste humano
