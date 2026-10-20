# Debug 2026-10-19 — T2.13 e tentativa pelos módulos CRM

## Sintoma relatado

Paulo informou que não conseguiu criar pela navegação do menu **Clientes / Propostas / Projetos**.

## Escopo ativo e envelope

- Task ativa: T2.13 (SPEC-2-006), inicialmente `aguardando_teste_humano`; diagnóstico executado em `debugar` após o relato.
- A tentativa do champion pelos módulos CRM **não chegou ao formulário da Biblioteca**. Portanto, não marca aprovação nem reprovação do teste humano da T2.13; gate permanece pendente.
- Nenhuma task nova aberta e nenhum código de tela alterado.

## Evidência observada no projeto/preview

- `src/App.tsx` registra a rota autenticada `/painel-tecnico` com `DashboardLegacy`.
- `src/components/AppLayout.tsx` lista no `navItems` somente `/dashboard`, `/clientes`, `/propostas`, `/projetos`, `/configuracoes`; `/painel-tecnico` não aparece no menu.
- `src/pages/Clientes.tsx`: marca “Módulo em breve”, estado vazio e modal mock; o texto do modal afirma que o formulário completo será disponibilizado em ciclo futuro.
- `src/pages/Propostas.tsx`: marca “Módulo em breve”; link “Nova Demanda Técnica” aponta para `/dashboard`, não para a biblioteca/fluxo técnico. Sem lista operacional de propostas.
- `src/pages/Projetos.tsx`: marca “Módulo em breve”; sem lista ou ação de criar projeto.
- `src/pages/Dashboard.tsx` (rota `/painel-tecnico`) contém formulários reais de oportunidade, catálogo e composições.
- O campo da Biblioteca “Item do catálogo (id)” requer ID digitado manualmente. A lista de catálogo mostra nome/família/tipo/estado, mas não expõe o ID; inputs de recurso também exigem IDs manuais. Catálogo exige datas inicial/final de vigência.
- A SPEC-2-006 inclui menu por papel e módulos reais nas tasks T2.14/T2.15, ambas ainda bloqueadas. Cadastro comercial de Clientes/Projetos como CRM está explicitamente fora do escopo da Fase 2.
- A evidência anterior do ensaio T2.13 foi retificada no GitHub em `05_entregas/fase-2/evidencias/t2-13/PROVA-T2.13.md`, commit `d92f4455`: API mostrou que `im6n9uakjgnzycu` é o item antigo `teste`, família `Teste`, tipo `servico`, inativo; `COMP-T213-01` foi criado sob família `Teste`. Essa resposta 409 não comprova o setup de geotecnia nem o passo 4 da T2.3.

## Causa-raiz confirmada para a tentativa do champion

**Desencontro de navegação/escopo, não falha de criação reportada na tela de Biblioteca.** O champion seguiu o menu CRM, que leva a páginas explicitamente mock/“Módulo em breve”. A única área com formulários técnicos é a rota não listada `/painel-tecnico`. Não se atribui à T2.13 a implementação de cadastro comercial de Clientes/Projetos (fora da fase) nem a extração de módulos (T2.14/T2.15).

## Limite e estado

- O conector Skip voltou a responder e `.adapta-cliente/estado-atual.md` está em `aguardando_teste_humano`, com o relato de que o champion usou as páginas CRM. O fluxo de duplicidade correta foi verificado tecnicamente depois, no preview.
- Após a reconexão, o preview foi autenticado e abriu `/painel-tecnico`. A Biblioteca foi testada sem criar uma composição: preenchida a tentativa duplicada com o item geotecnia existente `krkue1xg6fiwlfe` e código já registrado `COMP-TESTE-01`; a tela exibiu **“Código já existe para esta família; revisão cria nova versão via /revise.”**
- Verificação independente via `GET /backend/v1/compositions` retornou HTTP 200 e exatamente uma ocorrência geotecnia `COMP-TESTE-01`, v1 (`26ljaq5sixv5unr`). Portanto, não foi gravada segunda versão neste ensaio.
- O rascunho T2.13 sob família `Teste` permanece e não foi apagado.
- O intento de atualizar STATUS/CHANGELOG do GitHub foi bloqueado por approval hook; nenhuma atualização foi feita nesses dois arquivos. A errata da evidência foi publicada anteriormente.

## Próxima ação única

Próximo passo: o caminho e o 409 foram verificados no preview; solicitar ao champion confirmação explícita de que viu o mesmo alerta (ou se ainda não acessou `/painel-tecnico`). Só com confirmação positiva concluir T2.13; manter T2.3 em seu próprio gate até passo 4 revalidado. Cadastro comercial no menu CRM é fora de escopo; disponibilizar módulos técnicos no menu/extrair páginas exige tasks T2.14/T2.15 e suas autorizações.
