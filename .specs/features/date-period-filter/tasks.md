# Date Period Filter — Tasks

**Spec:** `.specs/features/date-period-filter/spec.md`  
**Design:** Skipped (straightforward, no architectural decisions)  
**Status:** Draft

---

## Execution Plan

```
Phase 1 ── Foundation (parallel)
  T1 ──→ T2 ──→ T4
  T3 ──────────────────→ T5 ──→ T7 ──→ T9
                   ──→ T6 ──→ T8 ──→ T9
```

| Phase                          | Tasks      | Parallel?                                              |
| ------------------------------ | ---------- | ------------------------------------------------------ |
| Phase 1 (Foundation)           | T1, T2, T3 | ✅ T1+T2+T3 — no deps                                  |
| Phase 2 (Backend)              | T4         | Sequential after T2                                    |
| Phase 3 (Frontend Integration) | T5, T6     | ✅ Parallel — T5 depends on T1+T3+T4; T6 depends on T3 |
| Phase 4 (E2E Tests)            | T7, T8     | ✅ Parallel — T7 after T5; T8 after T6                 |
| Phase 5 (Validation Gate)      | T9         | Sequential after T7+T8                                 |

---

## Task Breakdown

### T1: Add `fromTs`/`toTs` to `SessionHistoryFilters` type

**What:** Add optional `fromTs` and `toTs` fields (epoch seconds, `number`) to the `SessionHistoryFilters` type.
**Where:** `src/shared/ipc/types.ts`
**Depends on:** None
**Reuses:** Existing `StatsFilters` pattern (already has `fromTs`/`toTs`)
**Requirement:** DATE-04

**Done when:**

- [ ] `SessionHistoryFilters` has `fromTs?: number` and `toTs?: number`
- [ ] No TypeScript errors — `pnpm test:unit` passes (compilation check)

**Tests:** none (type-only change; tested through compilation)
**Gate:** quick (`pnpm test:unit`)

---

### T2: Add `fromTs`/`toTs` to session history filters schema + test

**What:** Add `fromTs` and `toTs` fields to `sessionHistoryFiltersSchema` in Zod, update `parseSessionHistoryFilters` if needed. Write tests covering valid values, edge cases, and optionality.
**Where:** `src/shared/forms/trainingSchemas.ts` + `src/shared/forms/trainingSchemas.test.ts`
**Depends on:** T1 (types consistency)
**Reuses:** Existing `statsFiltersSchema` pattern (`fromTs: z.number().int().nonnegative().optional()`)
**Requirement:** DATE-04

**New test cases to add in `trainingSchemas.test.ts`:**

- `fromTs`/`toTs` são opcionais — omitidos retornam `undefined`
- `fromTs` = 0 (epoch start) é válido
- `fromTs` negativo rejeita
- `toTs` negativo rejeita
- Ambos `fromTs` + `toTs` juntos são válidos
- Valores fracionados (ex: 1.5) rejeitam (int)

**Done when:**

- [ ] `sessionHistoryFiltersSchema` validates `fromTs`/`toTs` as `z.number().int().nonnegative().optional()`
- [ ] Schema tests cover all new test cases above
- [ ] Gate check passes: `pnpm test:unit`
- [ ] Test count: existing + new tests pass (no silent deletions)

**Tests:** unit
**Gate:** quick (`pnpm test:unit`)

---

### T3: Create `DatePeriodFilter` component + unit test

**What:** New component with `Select` for preset periods + optional date inputs for "Personalizado". Exposes `onChange({ fromTs?: number; toTs?: number })`. Default preset: "Mês atual". Write co-located unit test.
**Where:** `src/renderer/src/components/app/DatePeriodFilter.tsx` + `src/renderer/src/components/app/DatePeriodFilter.test.tsx` + update `src/renderer/src/components/app/index.ts`
**Depends on:** None
**Reuses:** `Select`/`SelectTrigger`/`SelectContent`/`SelectItem` from shadcn, existing `FilterToolbarRow` layout pattern
**Requirement:** DATE-01, DATE-02, DATE-03

**Presets to compute:**

| Label               | `fromTs`                                             | `toTs`                             |
| ------------------- | ---------------------------------------------------- | ---------------------------------- |
| Hoje                | início do dia (00:00:00 UTC)                         | `Date.now() / 1000`                |
| Ontem               | início do dia de ontem                               | fim do dia de ontem (23:59:59 UTC) |
| Últimos 7 dias      | `now - 7 * 86400`                                    | `now`                              |
| Últimos 15 dias     | `now - 15 * 86400`                                   | `now`                              |
| Mês atual (default) | `startOfMonth(now)`                                  | `now`                              |
| Últimos 30 dias     | `now - 30 * 86400`                                   | `now`                              |
| Últimos 90 dias     | `now - 90 * 86400`                                   | `now`                              |
| Personalizado       | user picks `from` and `to` via `<input type="date">` |                                    |

**Test cases (`DatePeriodFilter.test.tsx`):**

- Renders all 8 preset options in the Select
- Default selected value is "Mês atual"
- Selecting "Últimos 7 dias" calls `onChange` with approx correct `fromTs` (within 1s tolerance)
- Selecting "Personalizado" reveals two date inputs (previously hidden)
- Custom `from` date > `to` date shows validation error and does NOT call `onChange`
- Custom valid dates call `onChange` with correct epoch values
- `onChange` returns `{ fromTs: number, toTs: number }` in epoch seconds
- Component renders inside a `FilterToolbarRow` without breaking layout

**Done when:**

- [ ] `DatePeriodFilter` renders with `Select` + all 8 preset options
- [ ] Default selected option is "Mês atual"
- [ ] Selecting a preset calls `onChange` with correct `fromTs`/`toTs`
- [ ] Selecting "Personalizado" reveals two date inputs (`from` / `to`)
- [ ] Custom dates with `fromTs > toTs` shows validation error
- [ ] Component is exported from `src/renderer/src/components/app/index.ts`
- [ ] All unit test cases above pass
- [ ] Gate check passes: `pnpm test:unit`
- [ ] Test count: [N] new tests pass (no silent deletions)

**Tests:** unit
**Gate:** quick (`pnpm test:unit`)

---

### T4: Update `training:listSessions` handler to filter by date + update handler test

**What:** Add `gte`/`lte` conditions for `trainingSessions.startedAt` when `fromTs`/`toTs` are present. Both count query and data query must use same conditions. Update handler test to cover date filtering.
**Where:** `src/main/ipc/history.ts` + `src/main/ipc/history.test.ts`
**Depends on:** T2
**Reuses:** Pattern from `sessionWhereClause` in `src/main/ipc/stats.ts` (same `gte`/`lte` approach)
**Requirement:** DATE-05

**New test cases to add in `history.test.ts`:**

- Filtrar por `fromTs` apenas — data query usa `gte`
- Filtrar por `toTs` apenas — data query usa `lte`
- Filtrar por ambos `fromTs` + `toTs` — ambas as condições aplicadas
- Filtrar com `fromTs` e `toTs` iguais — retorna sessões exatamente naquele timestamp
- `fromTs` = 0 (desde o início) — não filtra (equivalente a omitir)
- Combinar `fromTs` + filtro de grupo — interseção correta
- Verificar que count query e data query usam as mesmas condições (mesmo `where`)

**Done when:**

- [ ] `training:listSessions` applies `gte(trainingSessions.startedAt, new Date(fromTs * 1000))` when `fromTs` is set
- [ ] `training:listSessions` applies `lte(trainingSessions.startedAt, new Date(toTs * 1000))` when `toTs` is set
- [ ] Both count query and data query use the same date conditions
- [ ] All new test cases above pass
- [ ] Existing tests still pass (backward compatible)
- [ ] Gate check passes: `pnpm test:unit`
- [ ] Test count: existing + [N] new tests pass (no silent deletions)

**Tests:** unit
**Gate:** quick (`pnpm test:unit`)

---

### T5: Integrate `DatePeriodFilter` into `HistoryPage` + update page test

**What:** Add `DatePeriodFilter` to the `FilterToolbar` in `HistoryPage`. Sync period with query params (`fromTs`/`toTs`). Reset page to 1 when period changes. Update `HistoryPage.test.tsx` with new filter interaction tests.
**Where:** `src/renderer/src/pages/HistoryPage.tsx` + `src/renderer/src/pages/HistoryPage.test.tsx`
**Depends on:** T1, T3, T4
**Reuses:** Same `updateParams` / `useSearchParams` pattern as existing filters (groupId, sessionType)
**Requirement:** DATE-06, DATE-07 (P2), DATE-11

**New test cases to add in `HistoryPage.test.tsx`:**

- `DatePeriodFilter` renders inside the FilterToolbar
- Changing period calls `window.api.training.listSessions` with `fromTs`/`toTs` in filters object
- Changing period resets page to 1 (if page > 1)
- Query params `fromTs`/`toTs` appear in URL when filter changes
- Loading page with `fromTs`/`toTs` query params applies them as initial filter value
- Changing filter then navigating back restores filter state

**Done when:**

- [ ] `DatePeriodFilter` renders inside `FilterToolbar` between group tabs and session type filter
- [ ] Changing period calls `window.api.training.listSessions` with `fromTs`/`toTs` in filters
- [ ] Changing period resets page to 1
- [ ] Query params `fromTs`/`toTs` are synced bidirectionally with the filter (P2)
- [ ] On page load with `fromTs`/`toTs` in URL, the filter reflects those values
- [ ] All new test cases above pass
- [ ] Gate check passes: `pnpm test:unit`
- [ ] Test count: existing + [N] new tests pass (no silent deletions)

**Tests:** unit
**Gate:** quick (`pnpm test:unit`)

---

### T6: Integrate `DatePeriodFilter` into `StatsPage` + create StatsPage test

**What:** Add `DatePeriodFilter` to the `FilterToolbar` in `StatsPage`. Wire to existing stats IPC handlers (already support `fromTs`/`toTs` via `StatsFilters`). Create `StatsPage.test.tsx` with integration tests for the new filter flow.
**Where:** `src/renderer/src/pages/StatsPage.tsx` + `src/renderer/src/pages/StatsPage.test.tsx`
**Depends on:** T3
**Reuses:** Same `StatsFilters` type (already has `fromTs`/`toTs`), same `filterToolbar` layout pattern
**Requirement:** DATE-08, DATE-10

**New test cases (`StatsPage.test.tsx`):**

- `DatePeriodFilter` renders inside the FilterToolbar
- Changing period calls ALL 4 stats IPC handlers: `overview`, `timeline`, `bySituation`, `worstHands`
- Each IPC call receives the same `fromTs`/`toTs` in the filters object
- Changing period while "Simultâneo" filter is active still propagates date filters
- Default filter "Mês atual" is applied on initial load
- All sections (overview cards, chart, table, worst hands) receive updated data from their respective handlers

**Done when:**

- [ ] `DatePeriodFilter` renders inside `FilterToolbar` below the group tabs
- [ ] Changing period propagates `fromTs`/`toTs` to `stats:overview`, `stats:timeline`, `stats:bySituation`, `stats:worstHands`
- [ ] All sections (overview cards, chart, table, worst hands) respond to the same period
- [ ] All new test cases above pass
- [ ] Gate check passes: `pnpm test:unit`
- [ ] Test count: [N] new tests pass (no silent deletions)

**Tests:** unit
**Gate:** quick (`pnpm test:unit`)

---

### T7: E2E test — date filter on HistoryPage

**What:** Add E2E test spec verifying the period filter works on the session history page. The test creates sessions, applies the filter, and verifies the list updates accordingly.
**Where:** `e2e/date-period-filter/history-filter.spec.ts`
**Depends on:** T5
**Reuses:** Existing E2E helpers (`fixtures.ts`, `helpers/auth.ts`, `helpers/training.ts`, `helpers/group.ts`, `helpers/situation.ts`), existing `session-history/` test patterns
**Requirement:** DATE-06

**Test cases:**

1. **Filter renders and is interactive** — Navigate to `/history`, verify `DatePeriodFilter` component is visible with "Mês atual" selected
2. **Filter changes affect list** — Create training sessions, navigate to history, change filter to a period with no sessions, verify empty state appears (e.g. "Nenhuma sessão encontrada")
3. **Query params update** — Change filter, verify URL contains `fromTs`/`toTs` params
4. **Default period** — On fresh navigation to `/history` without query params, the "Mês atual" preset is active

**Done when:**

- [ ] All 4 E2E test cases pass
- [ ] Existing E2E tests for history still pass (no regressions)
- [ ] Gate check passes: `pnpm build:app && npx playwright test e2e/date-period-filter/history-filter.spec.ts`

**Tests:** e2e
**Gate:** full (`pnpm test:e2e:ci` — build + E2E)

---

### T8: E2E test — date filter on StatsPage

**What:** Add E2E test spec verifying the period filter works on the stats page. The test creates sessions, applies the filter, and verifies the overview cards + tables update.
**Where:** `e2e/date-period-filter/stats-filter.spec.ts`
**Depends on:** T6
**Reuses:** Existing E2E helpers, existing `stats.spec.ts` patterns
**Requirement:** DATE-08, DATE-10

**Test cases:**

1. **Filter renders and is interactive** — Navigate to `/stats`, verify `DatePeriodFilter` is visible with "Mês atual" selected
2. **Filter changes affect overview** — Create training sessions, navigate to stats, change filter to a period with no sessions (e.g. "Ontem" if no sessions were created yesterday), verify sessions count goes to 0
3. **Both filters compose** — Apply group filter + date filter together, verify both restrict the data correctly
4. **Default period** — On fresh navigation without params, "Mês atual" is active

**Done when:**

- [ ] All 4 E2E test cases pass
- [ ] Existing E2E tests for stats still pass (no regressions)
- [ ] Gate check passes: `pnpm build:app && npx playwright test e2e/date-period-filter/stats-filter.spec.ts`

**Tests:** e2e
**Gate:** full (`pnpm test:e2e:ci` — build + E2E)

---

### T9: Validation gate

**What:** Run full test suite to confirm no regressions. All unit + E2E tests must pass.
**Where:** N/A
**Depends on:** T5, T6, T7, T8
**Requirement:** All

**Done when:**

- [ ] `pnpm test:unit` passes — all unit tests (existing + new) green
- [ ] `pnpm test:e2e:ci` passes — build + all E2E tests (existing + new) green
- [ ] `pnpm test:unit:coverage` shows no coverage regression (thresholds: stmts ≥80%, branches ≥75%, funcs ≥85%, lines ≥80%)

**Tests:** all
**Gate:** full (`pnpm test`)

---

## Task Granularity Check

| Task                               | Scope                                      | Status                 |
| ---------------------------------- | ------------------------------------------ | ---------------------- |
| T1: Add fields to type             | 1 file, 2 optional fields                  | ✅ Granular            |
| T2: Extend Zod schema + test       | 2 files (schema + test)                    | ✅ Granular (cohesive) |
| T3: Create DatePeriodFilter + test | 2 files (component + test) + 1 export line | ✅ Granular (cohesive) |
| T4: Update handler + test          | 2 files (handler + test)                   | ✅ Granular (cohesive) |
| T5: Integrate HistoryPage + test   | 2 files (page + test)                      | ✅ Granular (cohesive) |
| T6: Integrate StatsPage + new test | 2 files (page + new test)                  | ✅ Granular (cohesive) |
| T7: E2E history filter spec        | 1 file                                     | ✅ Granular            |
| T8: E2E stats filter spec          | 1 file                                     | ✅ Granular            |
| T9: Validation gate                | N/A                                        | ✅                     |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows  | Status   |
| ---- | ---------------------- | -------------- | -------- |
| T1   | None                   | T1 at top      | ✅ Match |
| T2   | T1 (optional)          | T1 → T2        | ✅ Match |
| T3   | None                   | T3 independent | ✅ Match |
| T4   | T2                     | T2 → T4        | ✅ Match |
| T5   | T1, T3, T4             | T1+T3+T4 → T5  | ✅ Match |
| T6   | T3                     | T3 → T6        | ✅ Match |
| T7   | T5                     | T5 → T7        | ✅ Match |
| T8   | T6                     | T6 → T8        | ✅ Match |
| T9   | T7, T8                 | T7+T8 → T9     | ✅ Match |

## Test Co-location Validation

No TESTING.md exists in the project. Based on codebase analysis of existing patterns:

| Task | Code Layer         | Matrix Expectation                                       | Task Tests | Status |
| ---- | ------------------ | -------------------------------------------------------- | ---------- | ------ |
| T1   | Shared types       | none (type-only)                                         | none       | ✅     |
| T2   | Shared form schema | unit (existing: `trainingSchemas.test.ts`)               | unit       | ✅     |
| T3   | Renderer component | unit (existing: co-located `.test.tsx`)                  | unit       | ✅     |
| T4   | Main IPC handler   | unit (existing: `history.test.ts`)                       | unit       | ✅     |
| T5   | Renderer page      | unit (existing: `HistoryPage.test.tsx`)                  | unit       | ✅     |
| T6   | Renderer page      | unit (no existing `StatsPage.test.tsx` → needs creation) | unit       | ✅     |
| T7   | E2E spec           | e2e (existing: `e2e/session-history/`)                   | e2e        | ✅     |
| T8   | E2E spec           | e2e (existing: `e2e/stats.spec.ts`)                      | e2e        | ✅     |
| T9   | Integration gate   | all                                                      | all        | ✅     |

## Test Summary by Layer

| Layer       | File(s)                                                              | Test Type   | Coverage         |
| ----------- | -------------------------------------------------------------------- | ----------- | ---------------- |
| Types       | `src/shared/ipc/types.ts`                                            | compilation | TypeScript check |
| Schema      | `src/shared/forms/trainingSchemas.ts` + `.test.ts`                   | unit        | 6 new test cases |
| Component   | `src/renderer/src/components/app/DatePeriodFilter.tsx` + `.test.tsx` | unit        | 8 new test cases |
| Handler     | `src/main/ipc/history.ts` + `.test.ts`                               | unit        | 7 new test cases |
| HistoryPage | `src/renderer/src/pages/HistoryPage.tsx` + `.test.tsx`               | unit        | 5 new test cases |
| StatsPage   | `src/renderer/src/pages/StatsPage.tsx` + `.test.tsx`                 | unit        | 5 new test cases |
| E2E History | `e2e/date-period-filter/history-filter.spec.ts`                      | e2e         | 4 test cases     |
| E2E Stats   | `e2e/date-period-filter/stats-filter.spec.ts`                        | e2e         | 4 test cases     |
