# Application Visual UX System Test Plan

**Spec**: `.specs/features/app-visual-ux-system/spec.md`
**Design**: `.specs/features/app-visual-ux-system/design.md`
**Status**: Complete

---

## Objective

Evitar regressões funcionais durante o redesign visual/UX. Toda alteração visual deve ser tratada como potencial risco para navegação, locators acessíveis, formulários, dialogs, filtros, grid 13x13, treino, histórico, revisão e estatísticas.

A regra base é: **se a implementação altera estrutura, texto visível, role acessível, data-testid, ordem de interação, estado loading/error/empty, layout de formulário, tabela, grid ou CTA, o implementador deve analisar testes existentes e decidir explicitamente entre ajustar teste, criar teste novo ou justificar ausência de mudança.**

---

## Regression Principles

| Principle                                      | Rule                                                                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Preferir comportamento sobre aparência         | Unit/E2E devem validar que a funcionalidade continua acessível e navegável, não snapshots frágeis de classes  |
| Preservar locators estáveis                    | Não remover `data-testid` existente sem migrar todos os testes e justificar                                   |
| Manter acessibilidade                          | Preferir `getByRole`, `getByLabel`, `getByText` estável; mudanças de texto exigem ajuste consciente           |
| Não mascarar regressão com teste visual frouxo | Se um CTA mudou de lugar mas a ação é crítica, o E2E deve continuar cobrindo o fluxo                          |
| Evitar E2E duplicado                           | Novo E2E só quando há risco cross-page, IPC/renderer via UI ou fluxo real; componentes isolados ficam em unit |
| Testar estados vazios/erro/loading em unit     | E2E deve focar happy path e regressões de integração; unit cobre variações de renderização                    |
| Grid e avaliação são protegidos                | Qualquer mudança no entorno do grid deve manter contagem 169, labels, pintura, clear e persistência cobertos  |
| Cada bloco fecha com gate                      | Nenhum bloco visual deve ser considerado pronto sem rodar o gate mínimo definido abaixo                       |

---

## Gate Checks by Change Type

| Change Type                       | Required Checks                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------- |
| Apenas spec/docs                  | Sem teste obrigatório; revisar diff                                                               |
| Token/CSS global/layout shell     | `pnpm test:unit`; E2E `auth-flows`, `dashboard`, smoke/navigation se afetar shell                 |
| Componente compartilhado `app/*`  | Unit do componente afetado; unit de páginas dependentes quando props/markup mudarem               |
| Página de gestão                  | Unit se existir; E2E específico de grupos/situações; smoke se navegação/CTA mudar                 |
| Página de treino                  | Unit de training components/pages; E2E `training.spec.ts` e regressão simultânea quando aplicável |
| Treino simultâneo                 | Unit de simultaneous components/pages; E2E `e2e/simultaneous-training/*` alvo                     |
| Histórico/revisão/stats           | Unit de pages/components; E2E session-history/stats/date-period-filter alvo                       |
| Login/perfil/tema                 | Unit profile/auth components quando existir; E2E auth/profile/theme alvo                          |
| Texto visível/role/label alterado | Ajustar todos os locators `getByRole/getByLabel/getByText` dependentes; rodar teste alvo          |
| `data-testid` alterado            | Proibido sem migração explícita de todos os testes dependentes                                    |

---

## Existing Unit Coverage Map

| Area                  | Existing Tests                                                                                             | Redesign Risk                                                                | Required Action                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Shell/nav             | `src/renderer/src/components/layout-nav-active.test.tsx`                                                   | Sidebar active states, route hierarchy, breadcrumbs/focus                    | Ajustar se nav label, route active logic, sidebar markup ou focus mudar                            |
| Shared app components | `src/renderer/src/components/app/app-shared.test.tsx`, `DatePeriodFilter.test.tsx`, `EntityTable.test.tsx` | `PageHeader`, `EmptyState`, `SectionCard`, `StatCard`, filters/tables        | Expandir para novos props/variants como `StatusMessage`, `StatCard.description`, surface variants  |
| Forms                 | `src/renderer/src/components/forms/*.test.tsx`                                                             | Inputs, selects, password field, labels                                      | Ajustar se labels/roles mudarem; criar testes se novos wrappers alterarem acessibilidade           |
| Cards/groups          | `src/renderer/src/components/groups/GroupCard.test.tsx`                                                    | Card layout, rename/archive actions                                          | Ajustar se ações virarem menu/dialog ou se CTAs/labels mudarem                                     |
| Training components   | `src/renderer/src/components/training/*.test.tsx`                                                          | Wizard, action buttons, feedback, timer, simultaneous cards                  | Expandir para cockpit/status de mesa/disabled helper se implementados                              |
| Review components     | `src/renderer/src/components/history/*.test.tsx`                                                           | Hand review hierarchy, multi review header, selection toolbar, delete dialog | Ajustar se `HandReviewCard` ou selection toolbar mudarem; criar casos para novo insight/status     |
| Stats components      | `src/renderer/src/components/stats/*.test.tsx`                                                             | Overview cards, chart empty state, worst hands, clear dialog                 | Expandir se `StatCard` ganha tone/trend ou se charts/listas viram componentes novos                |
| Pages: History        | `src/renderer/src/pages/HistoryPage.test.tsx`                                                              | Filtros URL, seleção, paginação, table actions                               | Ajustar locators se toolbar/table mudarem; preservar query params e seleção                        |
| Pages: Stats          | `src/renderer/src/pages/StatsPage.test.tsx`                                                                | Date/group/type filters, IPC calls, clear stats                              | Ajustar se layout/filtros mudarem; criar unit para vazamentos/analytics se novo bloco tiver lógica |
| Pages: Review         | `SessionHandReviewPage.test.tsx`, `MultiSessionReviewPage.test.tsx`                                        | Header, errors, hand navigation, omitted warning                             | Ajustar se warning/status tokens mudarem texto/role; preservar navegação entre mãos                |
| Pages: Result         | `TrainingResultPage.test.tsx`, `SimultaneousTrainingSummaryPage.test.tsx`                                  | CTAs de revisão, nova sessão, stats                                          | Ajustar se CTA primário muda texto/ordem; preservar navegação por sessionId                        |
| Pages: Profile        | `profile-page.test.tsx`                                                                                    | Feedback success/error, sections, theme sync                                 | Ajustar se `StatusMessage` muda role/texto; preservar sync com auth/preferences                    |
| Stores                | `src/renderer/src/stores/*.test.ts`                                                                        | Theme/session preferences                                                    | Normalmente não alterado; rodar se tema/preferências mudarem                                       |
| Playing cards         | `PlayingCard.test.tsx`                                                                                     | Card visuals/suits                                                           | Rodar se cartas forem estilizadas; não quebrar símbolos/semântica                                  |

---

## Existing E2E Coverage Map

| Flow                           | Existing Tests                                                                                          | Regression Risk                                                                   | Required Action                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Auth/Login                     | `e2e/auth.spec.ts`, `e2e/auth-flows.spec.ts`, `e2e/smoke.spec.ts`                                       | Headline/card redesign pode quebrar tabs, labels, submit, protected redirect      | Ajustar locators se labels mudarem; manter fluxo login/register/logout                         |
| Dashboard                      | `e2e/dashboard.spec.ts`                                                                                 | CTA e cards podem mudar texto/hierarquia                                          | Ajustar teste para novo CTA sem perder validação de resumo e navegação                         |
| Groups CRUD                    | `e2e/situation-groups/crud-groups.spec.ts`, `archive-cascade.spec.ts`, `full-flow.spec.ts`              | Novo card/menu/dialog pode quebrar criar/renomear/arquivar                        | Ajustar locators; criar teste se ações migrarem para menu/dropdown                             |
| Situation list/edit            | `e2e/situations.spec.ts`, `e2e/situation-edit.spec.ts`, `situation-group-field.spec.ts`                 | Form blocks/sticky actions podem quebrar salvar, duplicado, grupo obrigatório     | Preservar labels, select, salvar, erro duplicado e volta à lista                               |
| Range grid                     | `e2e/range-grid-improvements.spec.ts`                                                                   | Legenda/entorno visual pode afetar painting/clear/highlight                       | Rodar obrigatoriamente se tocar `RangeGrid13`, editor de ações ou legenda                      |
| Training config/session/result | `e2e/training.spec.ts`, `regression-single-flow.spec.ts`                                                | Cockpit pode quebrar seleção, timer, pause, abandon, feedback, result CTAs        | Ajustar locators; adicionar teste se novo layout introduzir estado ativo/disabled/helper       |
| Simultaneous training          | `e2e/simultaneous-training/*.spec.ts`                                                                   | Cards de mesa/status podem quebrar config, isolamento, pause, leave, summary      | Rodar alvos por alteração; criar teste se status visual ativo/concluído for novo comportamento |
| History list/filter/pagination | `e2e/session-history/*.spec.ts`, `date-period-filter/history-filter.spec.ts`                            | Toolbar/table redesign pode quebrar filtros, seleção em lote, paginação, back nav | Ajustar locators mantendo URL state, seleção e revisão                                         |
| Review                         | `e2e/session-history/hand-review.spec.ts`, `batch-review.spec.ts`                                       | Card hierarchy pode quebrar badges, grid, next/previous, timeout                  | Preservar textos/roles ou migrar testes; rodar se tocar `HandReviewCard`                       |
| Stats                          | `e2e/stats.spec.ts`, `date-period-filter/stats-filter.spec.ts`, `situation-groups/stats-filter.spec.ts` | Analytics layout pode quebrar filtros, clear stats, segmentation                  | Ajustar mantendo filtros, overview, clear flow e segregação single/simultaneous                |
| Profile/theme                  | `e2e/profile/*.spec.ts`                                                                                 | StatusMessage/layout pode quebrar update name, password, defaults, theme          | Ajustar locators; preservar sincronização shell/perfil                                         |

---

## Required New Tests by Redesign Block

### Block 1: Foundation and Shared Components

Create or update unit tests:

| Test                                                                        | File                                                                              | Trigger                              |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------ |
| `StatusMessage` renders tone, role and text                                 | `src/renderer/src/components/app/app-shared.test.tsx` or `StatusMessage.test.tsx` | If `StatusMessage` is added          |
| `StatCard` renders optional description/trend/tone without breaking old API | `src/renderer/src/components/app/app-shared.test.tsx`                             | If `StatCard` API expands            |
| `AppSidebar` theme toggle remains accessible without emoji labels           | `src/renderer/src/components/layout-nav-active.test.tsx` or new sidebar test      | If theme button visual/label changes |
| `PageHeader` still renders actions/backLink/description                     | `app-shared.test.tsx`                                                             | If header gains contextual slots     |

Create or update E2E tests:

| Test                                                 | File                                                | Trigger                              |
| ---------------------------------------------------- | --------------------------------------------------- | ------------------------------------ |
| Sidebar navigation still reaches all top-level pages | `e2e/smoke.spec.ts` or new `e2e/navigation.spec.ts` | If sidebar labels/structure change   |
| Theme toggle persists and profile stays synchronized | existing `e2e/profile/theme-preference.spec.ts`     | If theme toggle markup/label changes |

### Block 2: Management Pages

Create or update unit tests:

| Test                                                                         | File                                                    | Trigger                                               |
| ---------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------- |
| `GroupCard` actions remain reachable after visual changes                    | `src/renderer/src/components/groups/GroupCard.test.tsx` | If actions move, menu appears, or card layout changes |
| `SituationEditPage` renders form/actions/range blocks and save action        | new page unit or existing situation tests if introduced | If editor layout is reorganized                       |
| `RangeEditorPanel` legend/action colors render without changing grid buttons | new component unit                                      | If range legend is added/refactored                   |

Create or update E2E tests:

| Test                                                 | File                                                            | Trigger                                                            |
| ---------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------ |
| Create group via new visual flow                     | existing `e2e/situation-groups/crud-groups.spec.ts`             | If new group creation moves from inline to dialog/expandable panel |
| Create/edit/archive situation with redesigned editor | existing `e2e/situations.spec.ts`, `e2e/situation-edit.spec.ts` | Any editor/list CTA change                                         |
| Range painting/clear/highlight unchanged             | existing `e2e/range-grid-improvements.spec.ts`                  | Any change around range editor/actions                             |

### Block 3: Training Cockpit

Create or update unit tests:

| Test                                                            | File                                                             | Trigger                             |
| --------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------- |
| Training action buttons preserve labels and disabled states     | `src/renderer/src/components/training/training-session.test.tsx` | If buttons get new visual treatment |
| Feedback panel renders correct/incorrect and next action        | `training-feedback.test.tsx`                                     | If feedback placement/copy changes  |
| Simultaneous table panel renders active/paused/completed status | `training-simultaneous.test.tsx`                                 | If status visual is added           |
| Wizard step indicator does not block selection/start            | `training-config.test.tsx`                                       | If config wizard layout changes     |

Create or update E2E tests:

| Test                                           | File                                                                             | Trigger                                    |
| ---------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------ |
| Normal training happy path still completes     | existing `e2e/training.spec.ts`                                                  | Any `TrainingSessionPage` or config change |
| Timer/pause/abandon still work                 | existing `e2e/training.spec.ts`                                                  | Any cockpit/header/overlay change          |
| Simultaneous config/session/summary still work | existing `e2e/simultaneous-training/session-config.spec.ts`, `full-flow.spec.ts` | Any simultaneous UI change                 |
| Table isolation remains unchanged              | existing `isolated-state.spec.ts`                                                | If cards/status/actions are refactored     |

### Block 4: Learning Loop

Create or update unit tests:

| Test                                                                   | File                                                        | Trigger                             |
| ---------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------- |
| Result page keeps review/new/stats navigation                          | `TrainingResultPage.test.tsx`                               | If result hero/CTA changes          |
| Summary page keeps per-table and multi-review navigation               | `SimultaneousTrainingSummaryPage.test.tsx`                  | If summary layout/CTA changes       |
| Hand review card still shows answer, correct answer, timeout and range | `HandReviewCard.test.tsx`, `SessionHandReviewPage.test.tsx` | If review card hierarchy changes    |
| History query params/selection still behave                            | `HistoryPage.test.tsx`                                      | If toolbar/table/pagination changes |
| Stats calls all IPC handlers with filters                              | `StatsPage.test.tsx`                                        | If analytics/filter layout changes  |

Create or update E2E tests:

| Test                                                   | File                                                                                                             | Trigger                         |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Result → review link works                             | existing `e2e/training.spec.ts`                                                                                  | If result CTA text/role changes |
| History filters/back navigation preserved              | existing `e2e/session-history/back-navigation.spec.ts`, `date-period-filter/history-filter.spec.ts`              | If history toolbar changes      |
| Single and multi review navigation still works         | existing `hand-review.spec.ts`, `batch-review.spec.ts`                                                           | If review UI changes            |
| Stats filters, clear stats and segmentation still work | existing `e2e/stats.spec.ts`, `date-period-filter/stats-filter.spec.ts`, `situation-groups/stats-filter.spec.ts` | If stats layout changes         |

### Block 5: Entry and Settings

Create or update unit tests:

| Test                                                          | File                                                           | Trigger                   |
| ------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------- |
| Login auth tabs remain accessible by test id/role             | existing password-field/auth tests or new `LoginPage.test.tsx` | If login card/tabs change |
| Profile `StatusMessage` success/error keeps role status/alert | `profile-page.test.tsx`                                        | If feedback style changes |
| Theme preference and shell toggle remain synchronized         | `profile-page.test.tsx`, stores tests                          | If theme UI changes       |

Create or update E2E tests:

| Test                                        | File                                                  | Trigger                                   |
| ------------------------------------------- | ----------------------------------------------------- | ----------------------------------------- |
| Register/login/logout flow                  | existing `e2e/auth.spec.ts`, `e2e/auth-flows.spec.ts` | If login copy/layout changes              |
| Profile update name/password/defaults/theme | existing `e2e/profile/*.spec.ts`                      | If profile sections/labels/buttons change |

---

## Test Adjustment Rules

Before editing tests, classify the failure:

| Failure Type                       | Action                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Locator text changed intentionally | Update locator to new accessible name, but keep same behavioral assertion                                    |
| Role changed unintentionally       | Prefer fixing UI to restore semantic role; only update test if role change is intentional and accessible     |
| `data-testid` missing              | Restore it unless there is a documented migration                                                            |
| Timing/animation caused flake      | Use web-first assertions; do not add `waitForTimeout()`                                                      |
| Visual wrapper broke form label    | Fix label association in UI; do not switch to brittle CSS locator                                            |
| CTA removed/renamed                | Confirm requirement mapping; if behavior still required, restore CTA or update all acceptance criteria/tests |
| State moved from page to component | Move/duplicate unit coverage at the component boundary and keep one E2E integration check                    |

---

## Minimum Definition of Done per Implementation Task

Every implementation task under this feature must include in its completion notes:

- Existing unit tests reviewed: list files or say `none affected` with reason.
- Existing E2E tests reviewed: list files or say `none affected` with reason.
- Tests adjusted: list files or `none`.
- New tests added: list files or `none` with reason.
- Gate run: command and result.
- Known residual manual checks: theme, width, keyboard, visual hierarchy.

A task is not complete if it changes UI behavior and does not explicitly state why no test update was needed.

---

## Recommended Commands

Fast loop:

```bash
pnpm test:unit
```

Targeted unit examples:

```bash
pnpm test:unit -- src/renderer/src/components/training/training-session.test.tsx
pnpm test:unit -- src/renderer/src/pages/HistoryPage.test.tsx
pnpm test:unit -- src/renderer/src/pages/StatsPage.test.tsx
```

Targeted E2E examples:

```bash
pnpm build:app && pnpm playwright test e2e/training.spec.ts
pnpm build:app && pnpm playwright test e2e/session-history/hand-review.spec.ts
pnpm build:app && pnpm playwright test e2e/stats.spec.ts
```

Full local gate:

```bash
pnpm test
```

Linux without display:

```bash
xvfb-run -a pnpm test
```
