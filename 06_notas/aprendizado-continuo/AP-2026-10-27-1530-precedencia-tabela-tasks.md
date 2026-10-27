# AP-2026-10-27-1530 — Precedência documental resolve aparente conflito de dependências

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: T2.16 · SPEC-2-007 (CA-2-12, UX-F2-007)
- Sinal: o registro de 2026-10-23 concluiu que a T2.16 era inelegível ("SPEC-2-007 exige T2.5"), com base na seção descritiva de pré-condições da SPEC. A regra de precedência da própria SPEC ("as dependências e aceites da tabela Tasks vinculadas prevalecem sobre sequências descritivas antigas") dá à tabela de tasks autoridade sobre a seção descritiva; a tabela marca T2.16 com pré-condição apenas T2.3. A leitura errada custou uma rodada de planejamento (T2.31 foi escolhida em parte por causa dela).
- Evidência: SPEC-2-007, seção "Regras de integração e precedência desta revisão" (última regra) vs seção "Limites e dependências → Entradas e pré-condições"; tabela de Tasks vinculadas da mesma SPEC (linha T2.16: pré-condições "T2.3"); changelog.md registro de correção de 2026-10-27.
- Regra reutilizável: ao verificar elegibilidade de uma task, ler primeiro a tabela de Tasks vinculadas da SPEC e usar as seções descritivas apenas como contexto; quando as duas fontes divergem, a tabela prevalece por regra explícita — e a divergência deve ser registrada como correção de registro, não como mudança de SPEC.
- Quando aplicar: qualquer seleção de task em fase com SPECs que tenham tabela de tasks vinculada (todas as SPECs 2-001..2-008 deste projeto).
- Quando não aplicar: SPECs sem regra de precedência explícita; nesses casos, divergência continua sendo DÚVIDA para o consultor.
- Confiança: alta — a regra está escrita na própria SPEC e a correção foi registrada no changelog sem alterar contrato.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
