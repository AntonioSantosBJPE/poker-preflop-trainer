# Training Session Context - Tasks

**Status:** Completed  
**Spec:** `spec.md`  
**Design:** `design.md`  
**Requisitos foco:** TSC-01 a TSC-13

---

## Convencoes

- `[P]` = pode correr em paralelo com outras tasks do mesmo bloco
- Como `.specs/codebase/TESTING.md` nao existe, os gates usam as convencoes reais do repo:
  - quick: `pnpm test:unit`
  - e2e feature: `pnpm playwright test <specs>`
  - full: `pnpm test`
- Tests ficam co-localizados com a task que introduz ou altera o comportamento
- Se houver divergencia relevante entre spec/design e implementacao: marcar `SPEC_DEVIATION`

## Execution Status

| Task | Status | Notes                                                                        |
| ---- | ------ | ---------------------------------------------------------------------------- |
| T-01 | Done   | Colunas de contexto adicionadas ao schema                                    |
| T-02 | Done   | Migration `0003_famous_omega_sentinel.sql` + snapshot gerados                |
| T-03 | Done   | Tipos compartilhados e contrato `window.api.stats.*` tipados                 |
| T-04 | Done   | Parser `parseStatsFilters` + testes unitarios                                |
| T-05 | Done   | Helper `trainingSessionContext` + testes unitarios                           |
| T-06 | Done   | `training:startSession` persiste contexto `single`                           |
| T-07 | Done   | `simultaneous-training:startSession` transacional com `sessionBlockId` comum |
| T-08 | Done   | `stats:*` usa parser e aplica filtros por tipo/mesas                         |
| T-09 | Done   | `StatsPage` com filtros de tipo e quantidade de mesas                        |
| T-10 | Done   | Cobertura E2E validada com sucesso                                           |
| T-11 | Done   | Segmentacao por 2/3/4 mesas validada com sucesso                             |
| T-12 | Done   | Gates finais passaram: `pnpm test`                                           |

---

## Execution Plan

### Bloco 0 - Fundacao de schema e contratos

`T-01 -> T-02`  
`T-03 -> T-04`

### Bloco 1 - Persistencia de contexto de sessao

Depois de `T-01`, `T-03` e `T-04`:

`T-05 -> { T-06 [P], T-07 [P] }`

### Bloco 2 - Segmentacao de estatisticas

`T-08 -> T-09`

### Bloco 3 - Verificacao end-to-end e fechamento

`{ T-10 [P], T-11 [P] } -> T-12`

---

## Task Breakdown

### T-01 - Estender `training_sessions` com colunas de contexto

**O que:** Adicionar as colunas persistidas de contexto em `training_sessions` e tipar o schema Drizzle correspondente.

**Onde:**

- `src/main/db/schema.ts`

**Design ref:** `design.md` -> Data Models, Implementation Notes / Schema and Migration

**Cobre:** TSC-01, TSC-02, TSC-03, TSC-04, TSC-05

**Depends on:** -

**Reuses:** Padrao atual do `schema.ts` e naming existente de `training_sessions`.

**Done when:**

- `trainingSessions` inclui `sessionType`, `sessionBlockId` e `simultaneousTableCount`
- os tipos Drizzle do schema compilam sem erro
- nenhum default novo classifica dados legados automaticamente

**Tests:** none
**Gate:** `pnpm typecheck`

---

### T-02 - Gerar migration e snapshots da feature

**O que:** Gerar a migration Drizzle para as novas colunas de contexto em `training_sessions`.

**Onde:**

- `src/main/db/migrations/`
- `src/main/db/migrations/meta/`

**Design ref:** `design.md` -> Implementation Notes / Schema and Migration

**Cobre:** TSC-01, TSC-02, TSC-03, TSC-04, TSC-05

**Depends on:** T-01

**Reuses:** Workflow atual de migrations do repo.

**Done when:**

- existe migration adicionando `session_type`, `session_block_id` e `simultaneous_table_count`
- snapshots Drizzle ficam coerentes com o novo schema
- a migration nao tenta preencher dados legados por heuristica

**Tests:** none
**Gate:** `pnpm typecheck`

---

### T-03 - Atualizar contratos compartilhados de contexto e filtros

**O que:** Expandir os tipos compartilhados para suportar tipo de sessao e filtro por quantidade de mesas, e refletir isso no contrato tipado do renderer.

**Onde:**

- `src/shared/ipc/types.ts`
- `src/renderer/src/env.d.ts`

**Design ref:** `design.md` -> Data Models / Stats Filters, Shared Contracts

**Cobre:** TSC-06, TSC-07, TSC-09

**Depends on:** -

**Reuses:** Estrutura atual de `StatsFilters` e tipagem de `window.api`.

**Done when:**

- `StatsFilters` aceita `sessionType` e `simultaneousTableCount`
- existe tipo compartilhado para os valores persistidos de contexto
- `window.api.stats.*` aceita filtros tipados coerentes com `StatsFilters`

**Tests:** none
**Gate:** `pnpm typecheck`

---

### T-04 - Criar parser Zod para filtros de estatisticas

**O que:** Criar um parser dedicado para filtros de stats com validacao de combinacoes invalidas.

**Onde:**

- `src/shared/forms/statsSchemas.ts`
- `src/shared/forms/statsSchemas.test.ts`

**Design ref:** `design.md` -> Components / Stats Filter Parser, Error Handling Strategy

**Cobre:** TSC-08, TSC-10

**Depends on:** T-03

**Reuses:** Padrao de `parse*` usado em `src/shared/forms/trainingSchemas.ts`

**Done when:**

- `parseStatsFilters(raw)` rejeita `sessionType` invalido
- `parseStatsFilters(raw)` rejeita `simultaneousTableCount` fora de `2|3|4`
- `parseStatsFilters(raw)` rejeita `simultaneousTableCount` sem `sessionType = 'simultaneous'`
- os testes unitarios cobrem caminhos validos e invalidos

**Tests:** unit
**Gate:** `pnpm test:unit`

---

### T-05 - Criar helper de montagem do contexto de sessao

**O que:** Centralizar a construcao dos valores persistidos de contexto para sessoes single e simultaneous.

**Onde:**

- `src/main/services/trainingSessionContext.ts`
- `src/main/services/trainingSessionContext.test.ts`

**Design ref:** `design.md` -> Components / Session Insert Metadata Helper

**Cobre:** TSC-01, TSC-02, TSC-03, TSC-04, TSC-05

**Depends on:** T-01, T-03

**Reuses:** Tipos compartilhados e `node:crypto` para geracao de `sessionBlockId`

**Done when:**

- o helper gera contexto `single` com `simultaneousTableCount = null`
- o helper gera contexto `simultaneous` com `sessionBlockId` comum e contagem valida
- os testes unitarios cobrem ambos os modos e invariantes principais

**Tests:** unit
**Gate:** `pnpm test:unit`

---

### T-06 - Persistir contexto explicito no treino individual

**O que:** Atualizar `training:startSession` para persistir contexto `single` em toda nova sessao individual.

**Onde:**

- `src/main/ipc/training.ts`
- `src/main/ipc/training.test.ts`

**Design ref:** `design.md` -> Architecture Overview, Components / Session Context Persistence

**Cobre:** TSC-01, TSC-02

**Depends on:** T-02, T-04, T-05

**Reuses:** Fluxo atual de `training:startSession`

**Done when:**

- `training:startSession` persiste `sessionType = 'single'`
- a sessao individual grava `sessionBlockId` proprio
- `simultaneousTableCount` nao recebe valor artificial
- testes cobrem o payload persistido sem quebrar a validacao atual do treino

**Tests:** unit
**Gate:** `pnpm test:unit`

---

### T-07 - Tornar atomica a criacao do treino simultaneo com bloco comum

**O que:** Atualizar `simultaneous-training:startSession` para usar transacao e persistir contexto compartilhado entre as mesas do mesmo arranque.

**Onde:**

- `src/main/ipc/simultaneousTraining.ts`
- `src/main/ipc/simultaneousTraining.test.ts`

**Design ref:** `design.md` -> Architecture Overview, Legacy Data Strategy, Tech Decisions / Atomicidade do treino simultaneo

**Cobre:** TSC-03, TSC-04, TSC-05, TSC-13

**Depends on:** T-02, T-04, T-05

**Reuses:** Validacao atual de `parseSimultaneousTrainingStart`

**Done when:**

- todas as linhas do mesmo treino simultaneo compartilham o mesmo `sessionBlockId`
- todas persistem `sessionType = 'simultaneous'`
- todas persistem `simultaneousTableCount` coerente com `tableCount`
- os inserts ocorrem numa unica transacao
- testes cobrem sucesso e falha atomica sem persistencia parcial

**Tests:** unit
**Gate:** `pnpm test:unit`

---

### T-08 - Estender `stats.ts` com validacao e filtros de segmentacao

**O que:** Aplicar os novos filtros em todos os handlers `stats:*` e manter a visao nao filtrada compativel com dados legados.

**Onde:**

- `src/main/ipc/stats.ts`
- `src/main/ipc/stats.test.ts`

**Design ref:** `design.md` -> Components / Stats Query Extension, Legacy Data Strategy, Error Handling Strategy

**Cobre:** TSC-06, TSC-07, TSC-08, TSC-09, TSC-10, TSC-11, TSC-12

**Depends on:** T-01, T-03, T-04

**Reuses:** `sessionWhereClause` e a estrutura atual dos handlers `stats:*`

**Done when:**

- todos os handlers `stats:*` usam `parseStatsFilters`
- `sessionType` filtra apenas sessoes explicitamente classificadas
- `simultaneousTableCount` filtra apenas sessoes `simultaneous` com contagem valida
- consultas sem filtros novos continuam incluindo sessoes legadas
- testes cobrem filtros validos, combinacoes invalidas e compatibilidade com dados legados

**Tests:** unit
**Gate:** `pnpm test:unit`

---

### T-09 - Expor os novos filtros na `StatsPage`

**O que:** Adicionar controles de UI para tipo de sessao e quantidade de mesas, compondo-os com o filtro por grupo ja existente.

**Onde:**

- `src/renderer/src/pages/StatsPage.tsx`

**Design ref:** `design.md` -> Components / Stats Filter UI, Renderer

**Cobre:** TSC-06, TSC-07, TSC-09

**Depends on:** T-03, T-08

**Reuses:** Estado local atual de `StatsPage` e ciclo de refetch existente

**Done when:**

- existe seletor para `todos`, `individual` e `simultaneo`
- existe seletor para `2`, `3` e `4` mesas habilitado apenas em `simultaneo`
- mudar o tipo para `single` ou `all` limpa `simultaneousTableCount`
- a pagina continua carregando normalmente sem filtros novos ativos

**Tests:** e2e
**Gate:** `pnpm playwright test e2e/stats.spec.ts e2e/situation-groups/stats-filter.spec.ts`

---

### T-10 - Cobrir fluxo E2E de compatibilidade e filtro por tipo

**O que:** Atualizar ou criar specs E2E para provar que stats sem filtro continuam funcionando e que o filtro por tipo separa treino individual de simultaneo.

**Onde:**

- `e2e/stats.spec.ts`
- `e2e/situation-groups/stats-filter.spec.ts`

**Design ref:** `design.md` -> Testing Direction

**Cobre:** TSC-06, TSC-07, TSC-11, TSC-12

**Depends on:** T-06, T-07, T-08, T-09

**Reuses:** Helpers atuais de auth, training e simultaneous-training

**Done when:**

- existe cobertura para stats nao filtradas continuarem exibindo dados
- existe cobertura para `tipo de sessao = individual`
- existe cobertura para `tipo de sessao = simultaneo`
- os testes provam que os totais mudam apenas para o subconjunto esperado

**Tests:** e2e
**Gate:** `pnpm playwright test e2e/stats.spec.ts e2e/situation-groups/stats-filter.spec.ts`

---

### T-11 - Cobrir fluxo E2E de filtro por quantidade de mesas e combinacoes invalidas

**O que:** Garantir via E2E que a segmentacao por `2|3|4` mesas funciona e que combinacoes invalidas nao contaminam o fluxo atual.

**Onde:**

- `e2e/simultaneous-training/full-flow.spec.ts`
- `e2e/simultaneous-training/session-config.spec.ts`
- novo spec dedicado em `e2e/simultaneous-training/stats-segmentation.spec.ts` se necessario

**Design ref:** `design.md` -> Testing Direction, Error Handling Strategy

**Cobre:** TSC-08, TSC-09, TSC-10, TSC-13

**Depends on:** T-07, T-08, T-09

**Reuses:** Fixtures de treino simultaneo ja existentes

**Done when:**

- existe cobertura para filtros de `2`, `3` e `4` mesas
- existe cobertura para ausencia de resultados cruzados entre contagens diferentes
- existe cobertura para combinacao invalida de filtros ser bloqueada ou normalizada de forma deterministica

**Tests:** e2e
**Gate:** `pnpm playwright test e2e/simultaneous-training/full-flow.spec.ts e2e/simultaneous-training/session-config.spec.ts e2e/simultaneous-training/stats-segmentation.spec.ts`

---

### T-12 - Fechar traceabilidade e gates finais da feature

**O que:** Atualizar status da spec conforme a implementacao e executar os gates finais da feature.

**Onde:**

- `.specs/features/training-session-context/spec.md`
- `.specs/features/training-session-context/tasks.md`

**Design ref:** `design.md` completo

**Cobre:** TSC-01 a TSC-13

**Depends on:** T-10, T-11

**Reuses:** Padrao de fechamento usado nas outras features do repo

**Done when:**

- os requisitos TSC-01..TSC-13 estao atualizados com status coerente
- `tasks.md` reflete o estado final da execucao
- gates finais da feature passam sem falhas

**Tests:** full
**Gate:** `pnpm test`

---

## Parallel Execution Map

```text
Bloco 0
  T-01 -> T-02
  T-03 -> T-04

Bloco 1
  T-01, T-03, T-04 completos ->
    T-05 ->
      ├── T-06 [P]
      └── T-07 [P]

Bloco 2
  T-01, T-03, T-04 completos ->
    T-08 -> T-09

Bloco 3
  T-06, T-07, T-08, T-09 completos ->
      ├── T-10 [P]
      └── T-11 [P]
  T-10, T-11 -> T-12
```

---

## Validation Checks

### Check 1 - Task Granularity

| Task | Atomicidade validada                        | Resultado |
| ---- | ------------------------------------------- | --------- |
| T-01 | Um deliverable de schema                    | PASS      |
| T-02 | Um deliverable de migration                 | PASS      |
| T-03 | Um deliverable de contrato compartilhado    | PASS      |
| T-04 | Um deliverable de parser/validacao          | PASS      |
| T-05 | Um deliverable de helper de contexto        | PASS      |
| T-06 | Um deliverable no fluxo single              | PASS      |
| T-07 | Um deliverable no fluxo simultaneous        | PASS      |
| T-08 | Um deliverable de filtragem backend         | PASS      |
| T-09 | Um deliverable de UI de filtros             | PASS      |
| T-10 | Um deliverable E2E para filtro por tipo     | PASS      |
| T-11 | Um deliverable E2E para filtro por contagem | PASS      |
| T-12 | Um deliverable de fechamento/gates          | PASS      |

### Check 2 - Diagram-Definition Cross-Check

| Task | Depends on definido    | Dependencia no mapa      | Resultado |
| ---- | ---------------------- | ------------------------ | --------- |
| T-01 | -                      | raiz                     | PASS      |
| T-02 | T-01                   | T-01 -> T-02             | PASS      |
| T-03 | -                      | raiz                     | PASS      |
| T-04 | T-03                   | T-03 -> T-04             | PASS      |
| T-05 | T-01, T-03             | pre-condicoes do Bloco 1 | PASS      |
| T-06 | T-02, T-04, T-05       | ramo paralelo apos T-05  | PASS      |
| T-07 | T-02, T-04, T-05       | ramo paralelo apos T-05  | PASS      |
| T-08 | T-01, T-03, T-04       | inicio do Bloco 2        | PASS      |
| T-09 | T-03, T-08             | T-08 -> T-09             | PASS      |
| T-10 | T-06, T-07, T-08, T-09 | ramo paralelo do Bloco 3 | PASS      |
| T-11 | T-07, T-08, T-09       | ramo paralelo do Bloco 3 | PASS      |
| T-12 | T-10, T-11             | fechamento final         | PASS      |

### Check 3 - Test Co-location Validation

| Task | Camada alterada           | Teste requerido | Planeado                         | Resultado |
| ---- | ------------------------- | --------------- | -------------------------------- | --------- |
| T-01 | schema                    | none            | typecheck                        | PASS      |
| T-02 | migration                 | none            | typecheck                        | PASS      |
| T-03 | shared contracts          | none            | typecheck                        | PASS      |
| T-04 | shared parser             | unit            | `statsSchemas.test.ts`           | PASS      |
| T-05 | service/helper main       | unit            | `trainingSessionContext.test.ts` | PASS      |
| T-06 | IPC training              | unit            | `training.test.ts`               | PASS      |
| T-07 | IPC simultaneous training | unit            | `simultaneousTraining.test.ts`   | PASS      |
| T-08 | IPC stats                 | unit            | `stats.test.ts`                  | PASS      |
| T-09 | renderer stats filters    | e2e             | co-validado por T-10/T-11        | PASS      |
| T-10 | fluxo stats por tipo      | e2e             | specs atualizados                | PASS      |
| T-11 | fluxo stats por contagem  | e2e             | specs atualizados/novos          | PASS      |
| T-12 | fechamento da feature     | full            | `pnpm test`                      | PASS      |
