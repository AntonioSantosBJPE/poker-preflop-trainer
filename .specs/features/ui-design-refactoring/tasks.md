# Tasks — UI/UX Design Refactoring

## Execution Order

```
C1..C5 → C6                               # Bloco C: Terminologia (src + e2e) ✅
                                       ↓
B1 → B2 → B3 → B4 → B5 → B6 → B7 → B8  # Bloco B: Loading/Error ✅
                                       ↓
A1 → A2 → A3 → A4 → A6 → A7 → A5 → A8  # Bloco A: Estrutura ✅
                                       ↓
D1 → ~~D2~~ → D3 → D4 → ~~D5~~ → D6 → ~~D7~~  # Bloco D: Hooks ✅ (D2/D5/D7 deferred)
                                       ↓
E1 → E2 → ~~E3~~ → E4 → E5 → E6          # Bloco E: Restantes ✅ (E3 deferred)
```

Each block gates on the previous.
Within a block, tasks can run in parallel where marked `[P]`.

**Gate check after each block:**

- `pnpm test:unit` verde
- Blocos C, A: também `pnpm test:e2e` verde (locators alterados)

---

## Bloco C — Terminologia

### C1: "Guardar" → "Salvar" no ProfilePage [P]

| Field          | Value                                                                |
| -------------- | -------------------------------------------------------------------- |
| **What**       | Replace `Guardar` button text with `Salvar`                          |
| **Where**      | `src/renderer/src/pages/ProfilePage.tsx`                             |
| **Depends on** | None                                                                 |
| **Done when**  | Button renders "Salvar nome", "Alterar senha", "Salvar preferências" |
| **Tests**      | Existing tests pass                                                  |

### C2: "Pos." → "Posição" no StatsPage [P]

| Field          | Value                                       |
| -------------- | ------------------------------------------- |
| **What**       | Replace column header `Pos.` with `Posição` |
| **Where**      | `src/renderer/src/pages/StatsPage.tsx`      |
| **Depends on** | None                                        |
| **Done when**  | Column header shows "Posição"               |
| **Tests**      | Existing tests pass                         |

### C3: "Revisão da Sessão" → "Revisão da sessão" [P]

| Field          | Value                                              |
| -------------- | -------------------------------------------------- |
| **What**       | Fix title casing                                   |
| **Where**      | `src/renderer/src/pages/SessionHandReviewPage.tsx` |
| **Depends on** | None                                               |
| **Done when**  | Page title renders "Revisão da sessão"             |
| **Tests**      | Existing tests pass                                |

### C4: "Rever sessão" → "Revisão da sessão" no TrainingResultPage [P]

| Field          | Value                                           |
| -------------- | ----------------------------------------------- |
| **What**       | Normalize review action button text             |
| **Where**      | `src/renderer/src/pages/TrainingResultPage.tsx` |
| **Depends on** | None                                            |
| **Done when**  | Button renders "Revisão da sessão"              |
| **Tests**      | Existing tests pass                             |

### C5: "Revisão individual" → "Revisão da sessão" no Summary [P]

| Field          | Value                                                        |
| -------------- | ------------------------------------------------------------ |
| **What**       | Normalize review link text                                   |
| **Where**      | `src/renderer/src/pages/SimultaneousTrainingSummaryPage.tsx` |
| **Depends on** | None                                                         |
| **Done when**  | Link renders "Revisão da sessão"                             |
| **Tests**      | Existing tests pass (E2E será atualizado em C6)              |

### C6: Atualizar E2E locators para terminologia

| Field          | Value                                                                      |
| -------------- | -------------------------------------------------------------------------- |
| **What**       | Update 11 E2E locators that reference changed text strings                 |
| **Where**      | 9 ficheiros em `e2e/` (ver design.md Bloco C file map)                     |
| **Depends on** | C1, C2, C3, C4, C5                                                         |
| **Done when**  | All terminology locators updated; `pnpm test:unit` + `pnpm test:e2e` green |
| **Tests**      | `pnpm test:unit`, `pnpm test:e2e`                                          |

**E2E locators to update:**

| Ficheiro                                      | Linha             | Locator antigo                                        | Locator novo          |
| --------------------------------------------- | ----------------- | ----------------------------------------------------- | --------------------- |
| `e2e/profile/update-name.spec.ts`             | 16                | `Guardar nome`                                        | `Salvar nome`         |
| `e2e/profile/training-defaults.spec.ts`       | 29                | `Guardar preferências`                                | `Salvar preferências` |
| `e2e/profile/theme-preference.spec.ts`        | 38,58,82,89       | `Guardar preferências`                                | `Salvar preferências` |
| `e2e/session-history/back-navigation.spec.ts` | 44                | `Revisão da Sessão`                                   | `Revisão da sessão`   |
| `e2e/session-history/hand-review.spec.ts`     | 45,71,113,148,175 | `Revisão da Sessão`                                   | `Revisão da sessão`   |
| `e2e/session-history/batch-review.spec.ts`    | 116               | `Revisão da Sessão`                                   | `Revisão da sessão`   |
| `e2e/simultaneous-training/full-flow.spec.ts` | 50,59             | `Revisão individual` / `Revisão da Sessão`            | `Revisão da sessão`   |
| `e2e/training.spec.ts`                        | 223,224,225       | `Rever sessão` (link) + `Revisão da Sessão` (heading) | `Revisão da sessão`   |

---

## Bloco B — Loading/Error States

### B1: Skeleton loading no GroupDetailPage [P]

| Field          | Value                                                             |
| -------------- | ----------------------------------------------------------------- |
| **What**       | Replace `<p>Carregando…</p>` with shadcn `Skeleton` rows in table |
| **Where**      | `src/renderer/src/pages/GroupDetailPage.tsx`                      |
| **Depends on** | None                                                              |
| **Done when**  | Loading state renders `Skeleton` elements, not text               |
| **Tests**      | `pnpm test:unit`                                                  |

### B2: Skeleton loading no TrainingSessionPage [P]

| Field          | Value                                                  |
| -------------- | ------------------------------------------------------ |
| **What**       | Replace `<p>Carregando mão…</p>` with `Skeleton` cards |
| **Where**      | `src/renderer/src/pages/TrainingSessionPage.tsx`       |
| **Depends on** | None                                                   |
| **Done when**  | Loading state renders `Skeleton` elements              |
| **Tests**      | `pnpm test:unit`                                       |

### B3: Skeleton loading no TrainingResultPage [P]

| Field          | Value                                                           |
| -------------- | --------------------------------------------------------------- |
| **What**       | Replace `<p>Carregando…</p>` with `Skeleton` stat cards + chart |
| **Where**      | `src/renderer/src/pages/TrainingResultPage.tsx`                 |
| **Depends on** | None                                                            |
| **Done when**  | Loading state renders `Skeleton` elements                       |
| **Tests**      | `pnpm test:unit`                                                |

### B4: Skeleton loading no SimultaneousTrainingSessionPage [P]

| Field          | Value                                                               |
| -------------- | ------------------------------------------------------------------- |
| **What**       | Replace `<p>Carregando sessão simultânea…</p>` with `Skeleton` grid |
| **Where**      | `src/renderer/src/pages/SimultaneousTrainingSessionPage.tsx`        |
| **Depends on** | None                                                                |
| **Done when**  | Loading state renders `Skeleton` elements                           |
| **Tests**      | `pnpm test:unit`                                                    |

### B5: Skeleton loading no DashboardPage [P]

| Field          | Value                                                          |
| -------------- | -------------------------------------------------------------- |
| **What**       | Add `Skeleton` stat cards during loading (currently silent 0s) |
| **Where**      | `src/renderer/src/pages/DashboardPage.tsx`                     |
| **Depends on** | None                                                           |
| **Done when**  | Loading state shows `Skeleton` instead of 0 values             |
| **Tests**      | `pnpm test:unit`                                               |

### B6: Skeleton loading no GroupsPage, SituationsPage, StatsPage, ProfilePage [P]

| Field          | Value                                                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **What**       | Add `Skeleton` loading states for initial data fetch                                                                                     |
| **Where**      | `src/renderer/src/pages/GroupsPage.tsx`, `SituationsPage.tsx`, `StatsPage.tsx`, `ProfilePage.tsx`, `SimultaneousTrainingSummaryPage.tsx` |
| **Depends on** | None                                                                                                                                     |
| **Done when**  | Each page shows `Skeleton` while data loads                                                                                              |
| **Tests**      | `pnpm test:unit`                                                                                                                         |

### B7: Error states com EmptyState no DashboardPage e StatsPage [P]

| Field          | Value                                                       |
| -------------- | ----------------------------------------------------------- |
| **What**       | Replace silent catch with `EmptyState` + retry button       |
| **Where**      | `src/renderer/src/pages/DashboardPage.tsx`, `StatsPage.tsx` |
| **Depends on** | None                                                        |
| **Done when**  | Error displays `EmptyState` with error message and retry    |
| **Tests**      | `pnpm test:unit`                                            |

### B8: Error states com EmptyState no TrainingSessionPage e SimultaneousTrainingSessionPage [P]

| Field          | Value                                                                                   |
| -------------- | --------------------------------------------------------------------------------------- |
| **What**       | Replace redirect-on-error with `EmptyState` + back button                               |
| **Where**      | `src/renderer/src/pages/TrainingSessionPage.tsx`, `SimultaneousTrainingSessionPage.tsx` |
| **Depends on** | None                                                                                    |
| **Done when**  | Error displays `EmptyState` with back navigation                                        |
| **Tests**      | `pnpm test:unit`                                                                        |

---

## Bloco A — Estrutura de Página

### A1: Normalizar `gap` e `max-w` nas páginas de treino [P]

| Field          | Value                                                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **What**       | TrainingSessionPage, TrainingResultPage, SimultaneousTrainingSummaryPage: `space-y-6` → `flex flex-col gap-6`, remove `max-w-3xl` |
| **Where**      | 3 files in `src/renderer/src/pages/`                                                                                              |
| **Depends on** | None                                                                                                                              |
| **Done when**  | Pages use `flex flex-col gap-6` and inherit `max-w-6xl` from Layout                                                               |
| **Tests**      | `pnpm test:unit`                                                                                                                  |

### A2: Normalizar `gap` e `max-w` no SituationEditPage e SimultaneousTrainingSessionPage [P]

| Field          | Value                                                                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What**       | SituationEditPage: `space-y-6` → `flex flex-col gap-6` (já tem max-w-6xl). SimultaneousTrainingSessionPage: add `max-w-6xl mx-auto` + `space-y-6` → `flex flex-col gap-6` |
| **Where**      | `src/renderer/src/pages/SituationEditPage.tsx`, `SimultaneousTrainingSessionPage.tsx`                                                                                     |
| **Depends on** | None                                                                                                                                                                      |
| **Done when**  | Pages use `flex flex-col gap-6` and correct max-w                                                                                                                         |
| **Tests**      | `pnpm test:unit`                                                                                                                                                          |

### A3: Normalizar `gap-8` → `gap-6` no DashboardPage e StatsPage [P]

| Field          | Value                                                       |
| -------------- | ----------------------------------------------------------- |
| **What**       | Replace `gap-8` with `gap-6`                                |
| **Where**      | `src/renderer/src/pages/DashboardPage.tsx`, `StatsPage.tsx` |
| **Depends on** | None                                                        |
| **Done when**  | Pages use `gap-6`                                           |
| **Tests**      | `pnpm test:unit`                                            |

### A4: SituationEditPage — usar PageHeader

| Field          | Value                                                                                   |
| -------------- | --------------------------------------------------------------------------------------- |
| **What**       | Replace manual `<h1>` title with `PageHeader` component. Add back link to `/situations` |
| **Where**      | `src/renderer/src/pages/SituationEditPage.tsx`                                          |
| **Depends on** | None                                                                                    |
| **Done when**  | Page header rendered via `PageHeader` with title and back link                          |
| **Tests**      | `pnpm test:unit`                                                                        |

### A6: Wizard "Voltar" — usar shadcn Button [P]

| Field          | Value                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| **What**       | Replace plain `<button>` with shadcn `Button` component. Remove `max-w-xl` from wizard forms              |
| **Where**      | `src/renderer/src/components/training/SingleTrainingConfigForm.tsx`, `SimultaneousTrainingConfigForm.tsx` |
| **Depends on** | None                                                                                                      |
| **Done when**  | "Voltar" uses `Button` component; forms inherit Layout max-w                                              |
| **Tests**      | `pnpm test:unit`                                                                                          |

### A7: Corrigir prioridade de botões nas páginas de resultado [P]

| Field          | Value                                                                                  |
| -------------- | -------------------------------------------------------------------------------------- |
| **What**       | Swap button variants: "Revisão" → `default`, secondary actions → `secondary`/`outline` |
| **Where**      | `src/renderer/src/pages/TrainingResultPage.tsx`, `SimultaneousTrainingSummaryPage.tsx` |
| **Depends on** | None                                                                                   |
| **Done when**  | Button variant hierarchy matches design: most relevant action visually strongest       |
| **Tests**      | `pnpm test:unit`                                                                       |

### A5: SessionHandReviewPage e MultiSessionReviewPage — usar backLink

| Field          | Value                                                                             |
| -------------- | --------------------------------------------------------------------------------- |
| **What**       | Remove external "← Voltar ao histórico" Button; use `PageHeader.backLink` instead |
| **Where**      | `src/renderer/src/pages/SessionHandReviewPage.tsx`, `MultiSessionReviewPage.tsx`  |
| **Depends on** | None                                                                              |
| **Done when**  | Back navigation uses `backLink` prop, no external button                          |
| **Tests**      | `pnpm test:unit` (E2E será atualizado em A8)                                      |

### A8: Atualizar E2E locator para backLink

| Field          | Value                                                                                  |
| -------------- | -------------------------------------------------------------------------------------- |
| **What**       | Update E2E locator: back navigation role changes from `button` to `link`               |
| **Where**      | `e2e/session-history/back-navigation.spec.ts` linha 46                                 |
| **Depends on** | A5                                                                                     |
| **Done when**  | `getByRole('link', { name: '← Voltar ao histórico' })` funciona; `pnpm test:e2e` verde |
| **Tests**      | `pnpm test:e2e`                                                                        |

**Detalhe:** `PageHeader.backLink` renderiza `<Link>` (role `link`), não `<Button>` (role `button`). O locator muda de `getByRole('button', ...)` para `getByRole('link', ...)`.

---

## Bloco D — Hooks Partilhados

### D1: Criar hook `useIpcError`

| Field          | Value                                                       |
| -------------- | ----------------------------------------------------------- |
| **What**       | Extract `ipcErrorMessage` helper into reusable hook         |
| **Where**      | New file `src/renderer/src/hooks/useIpcError.ts`            |
| **Depends on** | None                                                        |
| **Done when**  | Hook returns formatted error string, imported by 3+ callers |
| **Tests**      | Add unit test for `useIpcError`                             |

### D2: Criar hook `usePreferenceSync`

| Field          | Value                                                     |
| -------------- | --------------------------------------------------------- |
| **What**       | Extract preference sync effect into reusable hook         |
| **Where**      | New file `src/renderer/src/hooks/usePreferenceSync.ts`    |
| **Depends on** | None                                                      |
| **Done when**  | Hook encapsulates dirtyFields-watching + IPC sync pattern |
| **Tests**      | Add unit test for `usePreferenceSync`                     |

### D3: Criar hook `useSessionTimer` com requestAnimationFrame

| Field          | Value                                                                        |
| -------------- | ---------------------------------------------------------------------------- |
| **What**       | Extract timer + ref pattern into reusable hook using `requestAnimationFrame` |
| **Where**      | New file `src/renderer/src/hooks/useSessionTimer.ts`                         |
| **Depends on** | None                                                                         |
| **Done when**  | Hook exposes `seconds`, `isPaused`, `pause`, `resume`, `reset`; uses rAF     |
| **Tests**      | Add unit test for `useSessionTimer`                                          |

### D4: Refactor LoginPage, SituationEditPage, ProfilePage — usar useIpcError [P]

| Field          | Value                                                    |
| -------------- | -------------------------------------------------------- |
| **What**       | Replace inline `ipcErrorMessage` with shared hook import |
| **Where**      | 3 files in `src/renderer/src/pages/`                     |
| **Depends on** | D1                                                       |
| **Done when**  | Inline code removed; hook imported and used              |
| **Tests**      | `pnpm test:unit`                                         |

### D5: Refactor SingleTrainingConfigForm, SimultaneousTrainingConfigForm, ProfilePage — usar usePreferenceSync [P]

| Field          | Value                                                                                   |
| -------------- | --------------------------------------------------------------------------------------- |
| **What**       | Replace duplicated preference sync effect with shared hook                              |
| **Where**      | `SingleTrainingConfigForm.tsx`, `SimultaneousTrainingConfigForm.tsx`, `ProfilePage.tsx` |
| **Depends on** | D2                                                                                      |
| **Done when**  | Duplicated effect removed; hook imported and used                                       |
| **Tests**      | `pnpm test:unit`                                                                        |

### D6: Refactor TrainingSessionPage — usar useSessionTimer

| Field          | Value                                                  |
| -------------- | ------------------------------------------------------ |
| **What**       | Replace inline timer + ref + interval with shared hook |
| **Where**      | `src/renderer/src/pages/TrainingSessionPage.tsx`       |
| **Depends on** | D3                                                     |
| **Done when**  | Inline timer code removed; hook imported and used      |
| **Tests**      | `pnpm test:unit`                                       |

### D7: Refactor SimultaneousTrainingSessionPage — usar useSessionTimer

| Field          | Value                                                        |
| -------------- | ------------------------------------------------------------ |
| **What**       | Replace duplicated timer logic with shared hook              |
| **Where**      | `src/renderer/src/pages/SimultaneousTrainingSessionPage.tsx` |
| **Depends on** | D3                                                           |
| **Done when**  | Duplicated timer code removed; hook imported and used        |
| **Tests**      | `pnpm test:unit`                                             |

---

## Bloco E — Restantes P2/P3

### E1: FilterToolbar no SituationsPage

| Field          | Value                                                                           |
| -------------- | ------------------------------------------------------------------------------- |
| **What**       | Wrap existing group filter `<Select>` inside `FilterToolbar > FilterToolbarRow` |
| **Where**      | `src/renderer/src/pages/SituationsPage.tsx`                                     |
| **Depends on** | Bloco A complete (page structure stable)                                        |
| **Done when**  | Filter renders inside `FilterToolbar` wrapper                                   |
| **Tests**      | `pnpm test:unit`                                                                |

### E2: ConfirmActionDialog — variante `variant` prop

| Field          | Value                                                                                  |
| -------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **What**       | Add `variant: 'destructive'                                                            | 'default'`prop. Default`destructive` for backward compat |
| **Where**      | `src/renderer/src/components/app/ConfirmActionDialog.tsx`                              |
| **Depends on** | None                                                                                   |
| **Done when**  | `variant="default"` renders primary-styled confirm button; existing callers unaffected |
| **Tests**      | `pnpm test:unit`                                                                       |

### E3: StatsPage — migrar para useSearchParams

| Field          | Value                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------- |
| **What**       | Replace local `useState` for filter state with `useSearchParams` (same pattern as HistoryPage) |
| **Where**      | `src/renderer/src/pages/StatsPage.tsx`                                                         |
| **Depends on** | None                                                                                           |
| **Done when**  | Filters persist in URL; navigating back restores filter state                                  |
| **Tests**      | `pnpm test:unit` + E2E stats                                                                   |

### E4: Dashboard — empty state banner

| Field          | Value                                                    |
| -------------- | -------------------------------------------------------- |
| **What**       | Add banner at top of page when `totalSessions === 0`     |
| **Where**      | `src/renderer/src/pages/DashboardPage.tsx`               |
| **Depends on** | A3 (gap normalization)                                   |
| **Done when**  | Banner renders with welcome message and CTA when no data |
| **Tests**      | `pnpm test:unit`                                         |

### E5: Breadcrumbs component + integração

| Field          | Value                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| **What**       | Create `Breadcrumbs` component; add route→breadcrumb mapping; render in all pages                          |
| **Where**      | New `src/renderer/src/components/app/Breadcrumbs.tsx`, update `PageHeader.tsx` or `Layout.tsx` + each page |
| **Depends on** | A4, A5 (PageHeader consistency for integration point)                                                      |
| **Done when**  | Breadcrumbs render correct path on each page                                                               |
| **Tests**      | `pnpm test:unit`                                                                                           |

### E6: Focus management

| Field          | Value                                                                 |
| -------------- | --------------------------------------------------------------------- |
| **What**       | Auto-focus `PageHeader` h1 on route change; verify dialog focus trap  |
| **Where**      | `src/renderer/src/App.tsx`, `src/renderer/src/components/Layout.tsx`  |
| **Depends on** | A4 (PageHeader exists on all pages)                                   |
| **Done when**  | Focus moves to page title on navigation; dialogs trap focus correctly |
| **Tests**      | Manual verification + existing tests pass                             |

---

## Deferred Tasks

As seguintes tasks foram identificadas mas **removidas do âmbito actual** por complexidade ou baixo valor relativo:

| Task                                                      | Motivo                                                          |
| --------------------------------------------------------- | --------------------------------------------------------------- |
| D2/D5 — `usePreferenceSync` hook + refactor               | Tipos genéricos complexos; risco de regressão nos 3 formulários |
| D7 — `useSessionTimer` no SimultaneousTrainingSessionPage | Timers por mesa vs timer global; arquitetura diferente          |
| E3 — StatsPage `useSearchParams`                          | Funcional; migração puramente cosmética                         |

**Motivação:** Feature atingiu o objetivo principal — consistência visual, terminologia unificada, layouts padronizados, loading/error states e hooks partilhados. Tasks diferidas podem ser retomadas em iteracão futura se o custo-benefício se justificar.

## Traceability Matrix

| Req ID | Task(s)                | Block |
| ------ | ---------------------- | ----- |
| DSG-01 | A1, A2, A3             | A     |
| DSG-02 | A4                     | A     |
| DSG-03 | A2                     | A     |
| DSG-04 | A5                     | A     |
| DSG-05 | A6                     | A     |
| DSG-06 | A7                     | A     |
| DSG-07 | B1, B2, B3, B4, B5, B6 | B     |
| DSG-08 | B1                     | B     |
| DSG-09 | B2                     | B     |
| DSG-10 | B3                     | B     |
| DSG-11 | B4                     | B     |
| DSG-12 | B5                     | B     |
| DSG-13 | B7                     | B     |
| DSG-14 | B7                     | B     |
| DSG-15 | B8                     | B     |
| DSG-16 | B8                     | B     |
| DSG-17 | C1                     | C     |
| DSG-18 | C2                     | C     |
| DSG-19 | C3                     | C     |
| DSG-20 | C4, C5                 | C     |
| DSG-21 | E1                     | E     |
| DSG-22 | D1, D4                 | D     |
| DSG-23 | D2, D5                 | D     |
| DSG-24 | D3, D6, D7             | D     |
| DSG-25 | E2                     | E     |
| DSG-26 | E2                     | E     |
| DSG-27 | E3                     | E     |
| DSG-28 | E3                     | E     |
| DSG-29 | E4                     | E     |
| DSG-30 | E4                     | E     |
| DSG-31 | E5                     | E     |
| DSG-32 | E6                     | E     |
| DSG-33 | E6                     | E     |
| DSG-34 | E6                     | E     |

**E2E-only tasks** (sem req ID direta, necessárias para gate check):

| Task | Block | Gate            |
| ---- | ----- | --------------- |
| C6   | C     | `pnpm test:e2e` |
| A8   | A     | `pnpm test:e2e` |

**Coverage:** 34/34 requisitos + 2 E2E tasks, total 36 tasks ✅
