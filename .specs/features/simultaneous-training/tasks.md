# Simultaneous Training — Tasks

**Status:** Planned  
**Spec:** `spec.md`  
**Design:** `design.md`  
**Requisitos foco:** SMT-01..SMT-14

---

## Convenções

- `[P]` = pode executar em paralelo no mesmo bloco
- Cada task tem gate explícito
- Se houver divergência relevante de spec/design: marcar `SPEC_DEVIATION`

---

## Bloco 0 — Fundação de contrato e schema

### T-01 — Shared types do modo simultâneo [P]
**O quê:** adicionar DTOs/inputs de treino simultâneo em `src/shared/ipc/types.ts`.  
**Cobre:** SMT-04, SMT-05, SMT-07, SMT-10.  
**Done when:** tipos exportados e compilando.  
**Gate:** `pnpm typecheck`.

### T-02 — Schemas Zod para start multi-mesa [P]
**O quê:** adicionar parser/schema com `tableCount` restrito a `2|3|4` em `src/shared/forms/trainingSchemas.ts`.  
**Cobre:** SMT-04, SMT-11.  
**Done when:** payload inválido falha parse com erro claro.  
**Gate:** `pnpm test:unit`.

### T-03 — Schema DB para sessão simultânea [P]
**O quê:** criar tabelas `simultaneous_training_sessions` e `simultaneous_training_tables` em `src/main/db/schema.ts` + migration.  
**Cobre:** SMT-07, SMT-09, SMT-10.  
**Depends on:** T-01.  
**Done when:** migração aplica sem erro e relações estão tipadas.  
**Gate:** `pnpm db:generate` + `pnpm typecheck`.

---

## Bloco 1 — Main process (serviço e IPC)

### T-04 — Serviço de domínio no main
**O quê:** criar `src/main/services/simultaneousTraining.ts` com start/submit/finish/abort/summary.  
**Cobre:** SMT-05, SMT-07, SMT-08, SMT-09, SMT-10.  
**Depends on:** T-02, T-03.  
**Done when:** sessões por mesa criadas e roteamento por `tableId` funcional.  
**Gate:** `pnpm test:unit`.

### T-05 — Handlers IPC do modo simultâneo
**O quê:** criar `src/main/ipc/simultaneousTraining.ts` + registrar no `register.ts`.  
**Cobre:** SMT-07, SMT-11.  
**Depends on:** T-04.  
**Done when:** canais expostos com validação e erros formatados.  
**Gate:** `pnpm test:unit`.

### T-06 — API preload do modo simultâneo [P]
**O quê:** expor `window.api.simultaneousTraining.*` em `src/preload/index.ts`.  
**Cobre:** SMT-02, SMT-07.  
**Depends on:** T-05.  
**Done when:** renderer consegue invocar todos os canais novos.  
**Gate:** `pnpm typecheck`.

---

## Bloco 2 — Renderer (menu, configuração, sessão)

### T-07 — Entrada de menu + rotas novas
**O quê:** adicionar item “Treino Simultâneo” e rotas de config/sessão/resumo.  
**Cobre:** SMT-01, SMT-02.  
**Depends on:** T-06.  
**Done when:** navegação principal alcança páginas novas.  
**Gate:** `pnpm test:unit`.

### T-08 — Página de configuração multi-mesa
**O quê:** implementar `SimultaneousTrainingConfigPage` com seleção 2/3/4 e config compartilhada.  
**Cobre:** SMT-04, SMT-05, SMT-06.  
**Depends on:** T-07.  
**Done when:** valida início e chama `start`.  
**Gate:** `pnpm test:unit`.

### T-09 — Página de sessão simultânea com isolamento por mesa
**O quê:** implementar `SimultaneousTrainingSessionPage` + `SimultaneousTablePanel` com estado indexado por `tableId`.  
**Cobre:** SMT-08, SMT-09.  
**Depends on:** T-08.  
**Done when:** ação em mesa A não altera mesa B.  
**Gate:** `pnpm test:unit`.

### T-10 — Guard de abandono de sessão ativa
**O quê:** confirmar saída ao navegar fora de sessão simultânea em andamento.  
**Cobre:** SMT-12.  
**Depends on:** T-09.  
**Done when:** prompt bloqueia abandono acidental.  
**Gate:** `pnpm test:unit`.

### T-11 — Página de resumo agregado
**O quê:** implementar resumo final agregado + breakdown por mesa.  
**Cobre:** SMT-10.  
**Depends on:** T-09.  
**Done when:** resumo mostra totais e métricas por mesa.  
**Gate:** `pnpm test:unit`.

---

## Bloco 3 — E2E first-class (critério principal)

### T-12 — E2E base de navegação e configuração [P]
**O quê:** criar `navigation.spec.ts` e `session-config.spec.ts`.  
**Cobre:** E2E-MT-01, E2E-MT-03, E2E-MT-04.  
**Depends on:** T-08.  
**Gate:** `pnpm playwright test e2e/simultaneous-training/navigation.spec.ts e2e/simultaneous-training/session-config.spec.ts`.

### T-13 — E2E isolamento e fluxo completo [P]
**O quê:** criar `isolated-state.spec.ts` e `full-flow.spec.ts`.  
**Cobre:** E2E-MT-05, E2E-MT-06, E2E-MT-10.  
**Depends on:** T-09, T-11.  
**Gate:** `pnpm playwright test e2e/simultaneous-training/isolated-state.spec.ts e2e/simultaneous-training/full-flow.spec.ts`.

### T-14 — E2E validação backend + guard de saída [P]
**O quê:** criar `backend-validation.spec.ts` e `leave-guard.spec.ts`.  
**Cobre:** E2E-MT-08, E2E-MT-09.  
**Depends on:** T-10.  
**Gate:** `pnpm playwright test e2e/simultaneous-training/backend-validation.spec.ts e2e/simultaneous-training/leave-guard.spec.ts`.

### T-15 — E2E regressão do fluxo antigo
**O quê:** criar `regression-single-flow.spec.ts`.  
**Cobre:** SMT-03, SMT-14, E2E-MT-02.  
**Depends on:** T-07.  
**Gate:** `pnpm playwright test e2e/simultaneous-training/regression-single-flow.spec.ts`.

### T-16 — Execução completa da suíte da feature
**O quê:** rodar todos os specs de `e2e/simultaneous-training/*.spec.ts`.  
**Depends on:** T-12, T-13, T-14, T-15.  
**Done when:** 100% dos testes da feature passam sem flakiness.  
**Gate:** `pnpm playwright test e2e/simultaneous-training`.

---

## Bloco 4 — Fechamento

### T-17 — Requirement traceability update
**O quê:** atualizar status em `spec.md` (SMT-01..14) conforme implementação/testes.  
**Depends on:** T-16.  
**Gate:** revisão manual.

### T-18 — Validação final de qualidade
**O quê:** executar gate final de projeto.  
**Comandos:**
1. `pnpm test:unit`
2. `pnpm playwright test e2e/simultaneous-training`
3. `pnpm test` (quando aplicável no ambiente local completo)
**Done when:** todos os gates passam.

