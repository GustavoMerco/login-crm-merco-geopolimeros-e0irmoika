# PROVA — T2.37 · Reativar unidade inativa com auditoria

**Data:** 2026-11-26 · **Branch:** `t2-37-reactivar-unidade` (base `main` = `b369b77`, v0.0.155)
**Critérios:** CA-2-12; UX-F2-007 · **Prova:** RED/GREEN-P2-007C (inativa → reativada; Comercial 403)
**Decisão:** D-T2.16 (Kim, 09/11/2026) — opção (a): reativação com auditoria; código único preservado; homologadas intactas.

## O que foi entregue

| Peça | Arquivo | Observação |
|---|---|---|
| Rota nova `POST /backend/v1/units/reactivate` | `pocketbase/hooks/units_reactivate.js` | Transição `inativo → homologado`; papel Engenharia/Admin (403 Comercial); motivo obrigatório; auditoria `unit_reactivated` em transação; C14: confere `role_permissions` (módulo `unidades`, `can_edit`) além do papel |
| Validação pura (espelho do hook) | `src/lib/unitLifecycle.ts` | `validateReactivateForm` (id 15 chars + motivo ≤1000), `unitCanReactivate` (só `inativo`) |
| Provas RED/GREEN locais | `src/lib/unitLifecycle.test.ts` | 10 casos: motivo ausente, motivo longo, id inválido, foco no primeiro erro, ids únicos, transição só de `inativo` |
| Serviço | `src/services/units.ts` | `reactivateUnit(id, reason)` |
| UI `/unidades` | `src/pages/Units.tsx` | Botão **Reativar** só em `status === 'inativo'`; diálogo com justificativa (mesmo padrão do de inativação); erro com `getErrorMessage`; campos preservados ao negar |
| Regressão T2.13 restaurada | `src/lib/pocketbase/errors.ts` | `getErrorMessage` volta a ler `{error}`/`{message}` do corpo (estava ausente no `main`; a Kim havia corrigido na branch `ux-crm-propostas`, que nunca foi ao GitHub) |

## RED (antes de implementar)

`npx vitest run src/lib/unitLifecycle.test.ts` → **falha de módulo inexistente** (`unitLifecycle` não existia). Registrado em 2026-11-26 16:44 UTC.

## GREEN (depois)

- `npx vitest run` → **256/256 testes passando** (14 arquivos), incluindo os 10 novos da T2.37 e os 2 da regressão T2.13.
- `npm run build` → ✓ built in 1.93s.
- `npx tsc -p tsconfig.app.json --noEmit` → 0 erros.
- `npm run lint` → 0 erros, 4 warnings **pré-existentes** (nenhum nos arquivos desta task).
- `node --check pocketbase/hooks/units_reactivate.js` → sintaxe OK.

## Regressão pré-existente encontrada (e corrigida)

Antes de qualquer alteração, `main` já reprovava 2 testes em `src/lib/pocketbase/errors.test.ts`
(`getErrorMessage` não lia `{error}`/`{message}` do corpo). Confirmado com `git checkout main -- errors.ts`.
A correção (T2.13) foi reaplicada nesta branch: agora o motivo real do servidor aparece na tela —
requisito para o diálogo de reativação mostrar o motivo da negativa (CA-2-11).

## O que NÃO foi alterado

- `units_lifecycle.js` (homologate/deactivate) — o `homologate` continua exigindo `rascunho`
  (`unit_not_draft`), para não abrir caminho paralelo sem motivo auditado.
- Nenhuma migration, nenhuma coleção de composição, nenhum índice: o código permanece único e
  versões homologadas não mudam (exigência da D-T2.16).
- Nenhum item de menu: `/unidades` segue acessível pelo índice da administração (T2.36).

## Pendente (aceite binário)

- [ ] QA Skip (setup/estática/build/integrações) na versão deployada.
- [ ] **Teste humano do champion:** reativar a unidade `m2` (a que travou a T2.17) com motivo,
      conferir a entrada `unit_reactivated` na auditoria e o 403 do Comercial.
- [ ] Recibo `05_entregas/fase-2/evidencias/t2-37/ACEITE-T2.37.md` e linhas de STATUS/fase/changelog
      no repositório de consultoria.
