# AP-2026-10-27-1125 — Lacuna de contrato descoberta na análise, não na implementação

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: T2.33 · SPEC-2-002 (CA-2-01/10, UX-F2-002)
- Sinal: o critério da task pedia "criar/**reabrir** composição", mas o contrato não oferecia leitura individual do registro: `composition_versions` tem `viewRule: null` e o hook expõe apenas `GET /compositions` (lista resumida), `POST /compositions` e `POST /compositions/revise`. Descobrir isso durante a análise read-only permitiu que o champion decidisse o recorte antes de qualquer código, em vez de a implementação travar no meio.
- Evidência: análise em `artifacts/t2-33/ANALISE-T2.33.md` (seções "Achados que mudam o recorte"); confirmação no arquivo `pocketbase/hooks/composition_versions.js` (três rotas, nenhuma com ID na URL) e na migration `0047_create_composition_versions.js` (`listRule/viewRule/createRule/updateRule/deleteRule` todos `null`); decisão registrada em `changelog.md` (2026-10-27, "Análise T2.33 e decisão de recorte").
- Regra reutilizável: ao analisar uma task cujo critério contém um verbo de consulta ("abrir", "reabrir", "selecionar", "listar"), verificar **antes de planejar** se existe rota de leitura com o recorte necessário — e não apenas se a tela já existe. Verbo de consulta sem rota correspondente é lacuna de contrato, não detalhe de implementação.
- Quando aplicar: tasks de UX sobre coleções cujo CRUD direto é negado por regra (`listRule`/`viewRule` nulos) e cujo acesso passa só por rotas server-side customizadas. Vale também para seletores que precisam de um registro específico por ID.
- Quando não aplicar: coleções com `viewRule` aberto a autenticados, onde `getOne` do SDK já resolve; e recortes em que o critério só pede listagem.
- Confiança: alta — a lacuna foi confirmada em dois artefatos independentes (hook e migration) e a consequência (exigir emenda de API) foi validada pela decisão do champion.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
