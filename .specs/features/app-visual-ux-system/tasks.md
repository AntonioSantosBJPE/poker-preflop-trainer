# Application Visual UX System Tasks

**Spec**: `.specs/features/app-visual-ux-system/spec.md`
**Design**: `.specs/features/app-visual-ux-system/design.md`
**Test Plan**: `.specs/features/app-visual-ux-system/test-plan.md`
**Status**: Complete

---

## Execution Plan

### Phase 1: Foundation (Sequential)

Base visual system and shared primitives. These tasks must happen before page-level redesign to prevent divergent local styling.

```text
T1 -> T2 -> T3
```

### Phase 2: Management Pages (Mostly Sequential)

Library management depends on foundation. Group/list pages can start after shared primitives, but editor/range work should happen after list patterns are settled.

```text
T3 -> T4 -> T5 -> T6 -> T7
```

### Phase 3: Training Cockpit (Sequential With Parallel Config)

Configuration screens can be redesigned in parallel after foundation, then session screens follow.

```text
       ┌-> T8  ->┐
T3 ----┤         ├-> T10 -> T11
       └-> T9  ->┘
```

### Phase 4: Learning Loop (Parallel After Training/Management)

Result/review/history/stats share visual language but touch different pages. Run in parallel only when ownership is disjoint.

```text
T7 + T11 -> T12 [P]
         -> T13 [P]
         -> T14 [P]
         -> T15 [P]
```

### Phase 5: Entry and Settings (Parallel After Foundation)

Login and profile are independent of training flow, but should use shared feedback/status primitives.

```text
T3 -> T16 [P]
T3 -> T17 [P]
```

### Phase 6: Final Regression and Visual QA (Sequential)

```text
T4..T17 -> T18
```

---

## Task Breakdown

### T1: Define Visual Foundation Tokens and Audit Raw Colors

**What**: Add/adjust semantic visual tokens only where repeated use is proven, and audit renderer code for raw palette classes that conflict with the Felt/amber system.
**Where**: `src/renderer/src/index.css`, `src/renderer/src/components/**/*`, `src/renderer/src/pages/**/*`
**Depends on**: None
**Reuses**: `preflop-design` tokens, existing Tailwind theme variables, `test-plan.md` rules
**Requirement**: VUX-01, VUX-02, VUX-04, VUX-05, VUX-24, VUX-30, VUX-31

**Tools**:

- MCP: NONE
- Skills: `preflop-design`, `frontend-design`

**Done when**:

- [x] Any new token has at least two planned usages and is semantic, not page-specific
- [x] Raw success/warning colors are either replaced by semantic tokens/components or documented as intentionally deferred
- [x] Existing dark/light theme still uses Felt/paper visual language
- [x] No domain, IPC, preload, DB or auth logic is changed
- [x] Test impact is documented per `test-plan.md`

**Tests**: unit where token changes affect components; no E2E unless shell/theme behavior changes
**Gate**: `pnpm test:unit`

---

### T2: Add Shared Status and Surface Primitives

**What**: Add shared UI primitives for status feedback and reusable raised/subtle surfaces, without forcing usage on every page yet.
**Where**: `src/renderer/src/components/app/StatusMessage.tsx`, optional `src/renderer/src/components/app/SurfacePanel.tsx`, `src/renderer/src/components/app/index.ts`, `src/renderer/src/components/app/app-shared.test.tsx`
**Depends on**: T1
**Reuses**: `EmptyState`, `SectionCard`, `cn`, semantic tokens
**Requirement**: VUX-05, VUX-21, VUX-23, VUX-24, VUX-30, VUX-31, VUX-32

**Tools**:

- MCP: NONE
- Skills: `preflop-design`, `frontend-design`

**Done when**:

- [x] `StatusMessage` supports `success`, `warning`, `error`, `info` with appropriate ARIA role defaults
- [x] Optional `SurfacePanel` exists only if it avoids repeated page-local surface markup
- [x] Components are exported through `components/app/index.ts`
- [x] Unit tests cover tone rendering, roles, class merging and backward compatibility of existing app exports
- [x] No existing `EmptyState` or `SectionCard` API is broken

**Tests**: unit
**Gate**: `pnpm test:unit -- src/renderer/src/components/app/app-shared.test.tsx`

---

### T3: Enhance Shared Metrics, Header and Shell Polish

**What**: Enhance shared app-level layout pieces used across pages: `StatCard` optional detail/tone, `PageHeader` contextual affordances if needed, and sidebar/main visual polish.
**Where**: `src/renderer/src/components/app/StatCard.tsx`, `src/renderer/src/components/app/PageHeader.tsx`, `src/renderer/src/components/Layout.tsx`, `src/renderer/src/components/app/AppSidebar.tsx`, related tests
**Depends on**: T2
**Reuses**: `Breadcrumbs`, `Button`, current sidebar routes, `StatCard` existing API
**Requirement**: VUX-01, VUX-03, VUX-04, VUX-05, VUX-21, VUX-22, VUX-28, VUX-30, VUX-31

**Tools**:

- MCP: NONE
- Skills: `preflop-design`, `frontend-design`

**Done when**:

- [x] Existing `StatCard` usages continue to compile without prop changes
- [x] Optional metric detail/tone/icon support has unit coverage if added
- [x] Sidebar active state and theme toggle remain accessible
- [x] Breadcrumbs remain secondary to `PageHeader`
- [x] Shell does not introduce horizontal overflow at common desktop widths
- [x] E2E locator impact is reviewed for sidebar/theme labels

**Tests**: unit; targeted E2E if sidebar/theme labels change
**Gate**: `pnpm test:unit -- src/renderer/src/components/app/app-shared.test.tsx src/renderer/src/components/layout-nav-active.test.tsx`

---

### T4: Redesign Dashboard as Study Cockpit

**What**: Redesign `DashboardPage` into an initial study cockpit with contextual next step, metrics and CTAs for empty and returning users.
**Where**: `src/renderer/src/pages/DashboardPage.tsx`, `e2e/dashboard.spec.ts`, optional page/unit tests if added
**Depends on**: T3
**Reuses**: `PageHeader`, `StatCard`, `EmptyState`, `Button`, shared primitives from T2/T3
**Requirement**: VUX-03, VUX-20, VUX-22, VUX-23, VUX-35, VUX-38

**Tools**:

- MCP: NONE
- Skills: `preflop-design`, `frontend-design`

**Done when**:

- [x] New user state guides toward group/situation setup without fake metrics
- [x] Returning user state prioritizes continue training/review path
- [x] Existing dashboard summary values still render from current IPC data
- [x] Primary CTA remains reachable by role/name and navigates correctly
- [x] `e2e/dashboard.spec.ts` is updated if visible text/CTA changed

**Tests**: E2E existing adjusted; unit optional for state branches if practical
**Gate**: `pnpm test:unit && pnpm build:app && pnpm playwright test e2e/dashboard.spec.ts`

---

### T5: Redesign Groups and Group Detail Management

**What**: Improve group creation/list/detail hierarchy while preserving group CRUD, rename/archive and cascade behavior.
**Where**: `src/renderer/src/pages/GroupsPage.tsx`, `src/renderer/src/pages/GroupDetailPage.tsx`, `src/renderer/src/components/groups/GroupCard.tsx`, group tests
**Depends on**: T3
**Reuses**: `GroupCard`, `SectionCard`, `EntityTable`, `ConfirmActionDialog`, `StatusMessage`
**Requirement**: VUX-11, VUX-12, VUX-13, VUX-21, VUX-23, VUX-25, VUX-26, VUX-27

**Tools**:

- MCP: NONE
- Skills: `preflop-design`, `frontend-design`

**Done when**:

- [x] Groups page clearly separates create flow, group list and empty state
- [x] Group detail shows group context before table and preserves actions
- [x] Rename/archive controls remain accessible and covered
- [x] Empty states include contextual CTAs without breaking current flows
- [x] If actions move to menu/dialog, tests are updated instead of made brittle

**Tests**: unit + E2E existing adjusted
**Gate**: `pnpm test:unit -- src/renderer/src/components/groups/GroupCard.test.tsx && pnpm build:app && pnpm playwright test e2e/situation-groups/crud-groups.spec.ts e2e/situation-groups/archive-cascade.spec.ts`

---

### T6: Redesign Situations List and Filters

**What**: Make `SituationsPage` filters, count/list, empty states and CTAs a coherent management module without changing archive semantics.
**Where**: `src/renderer/src/pages/SituationsPage.tsx`, `e2e/situations.spec.ts`
**Depends on**: T5
**Reuses**: `FilterToolbar`, `EntityTable`, `EmptyState`, `ConfirmActionDialog`, existing URL/filter pattern if present
**Requirement**: VUX-13, VUX-23, VUX-25, VUX-26, VUX-27, VUX-29, VUX-36

**Tools**:

- MCP: NONE
- Skills: `preflop-design`, `frontend-design`

**Done when**:

- [x] Filter, count/list and table feel like one module
- [x] Empty state distinguishes no global data vs no data for selected filter when data allows
- [x] Create/edit/archive flows remain unchanged behaviorally
- [x] Existing `data-testid`/roles used by E2E remain stable or are migrated deliberately

**Tests**: E2E existing adjusted; unit optional if new branch logic is added
**Gate**: `pnpm test:unit && pnpm build:app && pnpm playwright test e2e/situations.spec.ts`

---

### T7: Redesign Situation Editor and Range Surroundings

**What**: Reorganize situation editing into clear blocks for spot definition, actions, range editor and save/cancel behavior, preserving grid and range semantics.
**Where**: `src/renderer/src/pages/SituationEditPage.tsx`, `src/renderer/src/components/situations/SituationForm.tsx`, `src/renderer/src/components/situations/SituationActionsEditor.tsx`, `src/renderer/src/components/situations/RangeEditorPanel.tsx`, related tests
**Depends on**: T6
**Reuses**: `RangeGrid13`, `PageHeader`, `SectionCard`, form components, `preflop-domain` conventions
**Requirement**: VUX-14, VUX-15, VUX-21, VUX-23, VUX-26, VUX-27, VUX-29, VUX-31, VUX-32

**Tools**:

- MCP: NONE
- Skills: `preflop-design`, `frontend-design`, `preflop-domain`

**Done when**:

- [x] Editor has clear visual sequence: details -> actions -> range -> save
- [x] Range legend/action colors are legible and token-aligned
- [x] `RangeGrid13` still renders 169 cells and preserves suited/offsuit conventions
- [x] Existing `range-grid-13`, `situation-actions-panel`, `situation-action-row` testids remain stable
- [x] Save, duplicate-name error, required group validation and edit persistence still pass

**Tests**: unit + E2E existing adjusted; range E2E required if range/action surroundings change
**Gate**: `pnpm test:unit -- src/renderer/src/components/situations src/renderer/src/components/grid src/renderer/src/pages && pnpm build:app && pnpm playwright test e2e/situation-edit.spec.ts e2e/range-grid-improvements.spec.ts e2e/situation-groups/situation-group-field.spec.ts`

---

### T8: Redesign Single Training Configuration Wizard [P]

**What**: Improve single training configuration flow with clearer step hierarchy, selected group/situations and preference summary.
**Where**: `src/renderer/src/pages/TrainingConfigPage.tsx`, `src/renderer/src/components/training/SingleTrainingConfigForm.tsx`, training config tests
**Depends on**: T3
**Reuses**: `GroupSelectionStep`, `SituationChecklist`, `SessionSettingsForm`, shared primitives
**Requirement**: VUX-06, VUX-21, VUX-23, VUX-26, VUX-27, VUX-32, VUX-36

**Tools**:

- MCP: NONE
- Skills: `preflop-design`, `frontend-design`, `preflop-domain`

**Done when**:

- [x] Step state is visually clear without breaking group/situation selection
- [x] Empty state points to correct setup path when no groups/situations exist
- [x] Preferences remain bound to current form logic and defaults
- [x] Start button disabled/enabled behavior is unchanged
- [x] Existing training config unit/E2E locators are adjusted only if necessary

**Tests**: unit + E2E existing adjusted
**Gate**: `pnpm test:unit -- src/renderer/src/components/training/training-config.test.tsx src/renderer/src/components/training/training-defaults.test.tsx && pnpm build:app && pnpm playwright test e2e/training.spec.ts e2e/situation-groups/training-selection.spec.ts`

---

### T9: Redesign Simultaneous Training Configuration Wizard [P]

**What**: Improve simultaneous training configuration with clear multi-table explanation, table count/time emphasis and reviewable setup summary.
**Where**: `src/renderer/src/pages/SimultaneousTrainingConfigPage.tsx`, `src/renderer/src/components/training/SimultaneousTrainingConfigForm.tsx`, simultaneous config tests
**Depends on**: T3
**Reuses**: `GroupSelectionStep`, `SituationChecklist`, `SessionSettingsForm`, simultaneous validation patterns
**Requirement**: VUX-10, VUX-21, VUX-23, VUX-26, VUX-27, VUX-32, VUX-36

**Tools**:

- MCP: NONE
- Skills: `preflop-design`, `frontend-design`, `preflop-domain`

**Done when**:

- [x] User can distinguish simultaneous mode from normal training before starting
- [x] Table count, timer and selected situations are visually reviewable
- [x] Invalid configuration remains blocked with accessible feedback
- [x] Existing simultaneous training E2E config flows pass or are deliberately migrated

**Tests**: unit + E2E existing adjusted
**Gate**: `pnpm test:unit -- src/renderer/src/components/training/training-config.test.tsx src/renderer/src/components/training/training-simultaneous.test.tsx && pnpm build:app && pnpm playwright test e2e/simultaneous-training/session-config.spec.ts e2e/simultaneous-training/navigation.spec.ts`

---

### T10: Redesign Single Training Session Cockpit

**What**: Refactor the normal training session layout into a cockpit emphasizing cards, spot metadata, action buttons, timer/progress, pause and feedback.
**Where**: `src/renderer/src/pages/TrainingSessionPage.tsx`, optional `src/renderer/src/components/training/TrainingCockpitCard.tsx`, `src/renderer/src/components/training/TrainingActionButtons.tsx`, `TrainingFeedbackPanel.tsx`, `TrainingSessionHeader.tsx`
**Depends on**: T8, T9
**Reuses**: `PlayingCard`, `TrainingActionButtons`, `TrainingFeedbackPanel`, `TrainingSessionHeader`, `LeaveTrainingDialog`
**Requirement**: VUX-06, VUX-07, VUX-08, VUX-09, VUX-26, VUX-27, VUX-30, VUX-31, VUX-32, VUX-33

**Tools**:

- MCP: NONE
- Skills: `preflop-design`, `frontend-design`, `preflop-domain`

**Done when**:

- [x] Cards, position/situation, progress/timer and action buttons are visually distinct zones
- [x] Action buttons retain accessible names for Fold/Call/Raise/etc.
- [x] Immediate and end-of-session feedback modes keep current behavior
- [x] Pause overlay blocks interaction and communicates state without losing context
- [x] Timer, abandon guard, timeout and result navigation still pass E2E

**Tests**: unit + E2E existing adjusted
**Gate**: `pnpm test:unit -- src/renderer/src/components/training/training-session.test.tsx src/renderer/src/components/training/training-feedback.test.tsx && pnpm build:app && pnpm playwright test e2e/training.spec.ts e2e/simultaneous-training/regression-single-flow.spec.ts`

---

### T11: Redesign Simultaneous Training Session Panels

**What**: Improve multi-table session panels with active/paused/completed status, comparable progress and reduced visual competition.
**Where**: `src/renderer/src/pages/SimultaneousTrainingSessionPage.tsx`, `src/renderer/src/components/training/SimultaneousTablePanel.tsx`, simultaneous training tests
**Depends on**: T10
**Reuses**: `PlayingCard`, `TrainingActionButtons`, `TrainingSessionHeader` patterns, simultaneous session state
**Requirement**: VUX-10, VUX-26, VUX-27, VUX-30, VUX-31, VUX-32, VUX-33

**Tools**:

- MCP: NONE
- Skills: `preflop-design`, `frontend-design`, `preflop-domain`

**Done when**:

- [x] Each table exposes clear active/paused/completed state
- [x] Actions in one table do not visually or functionally affect other tables
- [x] Pause/leave guards keep existing behavior
- [x] Summary navigation after completion is preserved
- [x] New status rendering has unit coverage if state branches are added

**Tests**: unit + E2E existing adjusted
**Gate**: `pnpm test:unit -- src/renderer/src/components/training/training-simultaneous.test.tsx && pnpm build:app && pnpm playwright test e2e/simultaneous-training/full-flow.spec.ts e2e/simultaneous-training/isolated-state.spec.ts e2e/simultaneous-training/pause-guard.spec.ts e2e/simultaneous-training/leave-guard.spec.ts`

---

### T12: Redesign Result and Simultaneous Summary Pages [P]

**What**: Improve session result and simultaneous summary as completion screens with score hierarchy, interpretation and review/new-training CTAs.
**Where**: `src/renderer/src/pages/TrainingResultPage.tsx`, `src/renderer/src/pages/SimultaneousTrainingSummaryPage.tsx`, result/summary tests
**Depends on**: T7, T11
**Reuses**: `TrainingSummaryCards`, `StatCard`, `PageHeader`, existing navigation routes
**Requirement**: VUX-16, VUX-18, VUX-22, VUX-23, VUX-34, VUX-37

**Tools**:

- MCP: NONE
- Skills: `preflop-design`, `frontend-design`

**Done when**:

- [x] Result page highlights score, acertos/erros and next step
- [x] Simultaneous summary shows aggregate first and per-table breakdown second
- [x] Review/session/stat buttons keep correct navigation by `sessionId`/query ids
- [x] CTA text/role changes are reflected in unit and E2E tests

**Tests**: unit + E2E existing adjusted
**Gate**: `pnpm test:unit -- src/renderer/src/pages/TrainingResultPage.test.tsx src/renderer/src/pages/SimultaneousTrainingSummaryPage.test.tsx && pnpm build:app && pnpm playwright test e2e/training.spec.ts e2e/simultaneous-training/full-flow.spec.ts`

---

### T13: Redesign History List, Filters and Batch Toolbar [P]

**What**: Improve HistoryPage filter toolbar, table readability, batch selection toolbar and pagination while preserving URL state and selection semantics.
**Where**: `src/renderer/src/pages/HistoryPage.tsx`, `src/renderer/src/components/history/SelectionToolbar.tsx`, history tests
**Depends on**: T7, T11
**Reuses**: `FilterToolbar`, `EntityTable`, `SelectionToolbar`, pagination helpers, URL search params
**Requirement**: VUX-19, VUX-25, VUX-26, VUX-27, VUX-29, VUX-30, VUX-31, VUX-32

**Tools**:

- MCP: NONE
- Skills: `preflop-design`, `frontend-design`

**Done when**:

- [x] Filters, table and pagination read as one query module
- [x] Selection toolbar appears only when relevant and preserves count/actions
- [x] URL params, page reset, back navigation and selection persistence remain correct
- [x] Table rows retain accessible review action

**Tests**: unit + E2E existing adjusted
**Gate**: `pnpm test:unit -- src/renderer/src/pages/HistoryPage.test.tsx src/renderer/src/components/history/SelectionToolbar.test.tsx && pnpm build:app && pnpm playwright test e2e/session-history/list.spec.ts e2e/session-history/pagination.spec.ts e2e/session-history/batch-actions.spec.ts e2e/date-period-filter/history-filter.spec.ts`

---

### T14: Redesign Hand Review and Multi-Session Review [P]

**What**: Improve single and multi-session review hierarchy, warning/status presentation and hand card scannability without changing review navigation or range rendering.
**Where**: `src/renderer/src/pages/SessionHandReviewPage.tsx`, `src/renderer/src/pages/MultiSessionReviewPage.tsx`, `src/renderer/src/components/history/HandReviewCard.tsx`, `MultiSessionReviewHeader.tsx`, review tests
**Depends on**: T7, T11
**Reuses**: `HandReviewCard`, `RangeGrid13`, `PlayingCard`, `Badge`, `StatusMessage`
**Requirement**: VUX-17, VUX-18, VUX-20, VUX-22, VUX-23, VUX-24, VUX-26, VUX-27

**Tools**:

- MCP: NONE
- Skills: `preflop-design`, `frontend-design`, `preflop-domain`

**Done when**:

- [x] Each review card clearly shows user answer, correct answer, correctness/timeout and range
- [x] Multi-session review has aggregate context before the hand list
- [x] Missing-session/omitted warnings use shared status styling if available
- [x] Previous/next navigation and grid visibility remain covered
- [x] `RangeGrid13` review display keeps existing semantics and testids

**Tests**: unit + E2E existing adjusted
**Gate**: `pnpm test:unit -- src/renderer/src/components/history/HandReviewCard.test.tsx src/renderer/src/components/history/MultiSessionReviewHeader.test.tsx src/renderer/src/pages/SessionHandReviewPage.test.tsx src/renderer/src/pages/MultiSessionReviewPage.test.tsx && pnpm build:app && pnpm playwright test e2e/session-history/hand-review.spec.ts e2e/session-history/batch-review.spec.ts`

---

### T15: Redesign Stats Analytics Page [P]

**What**: Reorganize StatsPage into an analytics flow: overview, evolution, leaks/rankings and compact filters, preserving all filter behavior and clear-history flow.
**Where**: `src/renderer/src/pages/StatsPage.tsx`, `src/renderer/src/components/stats/*`, stats tests
**Depends on**: T7, T11
**Reuses**: `StatsOverviewCards`, `StatsChartCard`, `StatsWorstHandsList`, `ClearStatsDialog`, `DatePeriodFilter`, group/type filters
**Requirement**: VUX-19, VUX-20, VUX-22, VUX-23, VUX-25, VUX-26, VUX-27, VUX-29

**Tools**:

- MCP: NONE
- Skills: `preflop-design`, `frontend-design`

**Done when**:

- [x] Overview, chart/evolution and leak/ranking sections have clear priority
- [x] Date/group/type/session-table filters still compose correctly
- [x] Empty chart/ranking states remain contextual and not misleading
- [x] Clear stats dialog behavior is unchanged
- [x] IPC calls continue receiving expected filters in unit tests

**Tests**: unit + E2E existing adjusted
**Gate**: `pnpm test:unit -- src/renderer/src/pages/StatsPage.test.tsx src/renderer/src/components/stats && pnpm build:app && pnpm playwright test e2e/stats.spec.ts e2e/date-period-filter/stats-filter.spec.ts e2e/situation-groups/stats-filter.spec.ts e2e/simultaneous-training/stats-segmentation.spec.ts`

---

### T16: Redesign Login Entry Experience [P]

**What**: Improve LoginPage visual presentation with product value, premium felt/paper background and cleaner auth card while preserving auth semantics.
**Where**: `src/renderer/src/pages/LoginPage.tsx`, auth-related tests
**Depends on**: T3
**Reuses**: `Card`, `Button`, `PasswordField`, current auth store/API flow
**Requirement**: VUX-01, VUX-04, VUX-21, VUX-24, VUX-27, VUX-35

**Tools**:

- MCP: NONE
- Skills: `preflop-design`, `frontend-design`

**Done when**:

- [x] Login and registration tabs remain reachable and accessible
- [x] Labels for name, email and password remain correctly associated
- [x] Error messages remain visible with appropriate role
- [x] Protected route redirect, login, register, duplicate email and validation flows still pass
- [x] Any visible copy changes are migrated in E2E locators intentionally

**Tests**: unit optional + E2E existing adjusted
**Gate**: `pnpm test:unit -- src/renderer/src/components/forms/password-field.test.tsx && pnpm build:app && pnpm playwright test e2e/auth.spec.ts e2e/auth-flows.spec.ts e2e/smoke.spec.ts`

---

### T17: Redesign Profile and Preferences Feedback [P]

**What**: Improve ProfilePage section hierarchy and replace local success/error feedback styling with shared status patterns while preserving account/security/preferences behavior.
**Where**: `src/renderer/src/pages/ProfilePage.tsx`, `src/renderer/src/pages/profile-page.test.tsx`, profile E2E tests
**Depends on**: T3
**Reuses**: `SectionCard`, `StatusMessage`, form components, preferences/auth stores
**Requirement**: VUX-21, VUX-24, VUX-26, VUX-27, VUX-30, VUX-31, VUX-32

**Tools**:

- MCP: NONE
- Skills: `preflop-design`, `frontend-design`

**Done when**:

- [x] Conta, Segurança and Preferências remain visually distinct and consistent
- [x] Success/error feedback uses shared patterns with `role="status"`/`role="alert"` as appropriate
- [x] Update name, change password, training defaults and theme sync behavior remains unchanged
- [x] Shell theme toggle stays synchronized with profile preference

**Tests**: unit + E2E existing adjusted
**Gate**: `pnpm test:unit -- src/renderer/src/pages/profile-page.test.tsx src/renderer/src/stores/preferences.test.ts && pnpm build:app && pnpm playwright test e2e/profile/update-name.spec.ts e2e/profile/change-password.spec.ts e2e/profile/training-defaults.spec.ts e2e/profile/theme-preference.spec.ts`

---

### T18: Final Regression, Accessibility and Visual QA

**What**: Run full regression gates and perform manual visual QA across all redesigned pages in dark/light themes and common desktop widths.
**Where**: full repo, `.specs/features/app-visual-ux-system/tasks.md` status updates if execution begins
**Depends on**: T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14, T15, T16, T17
**Reuses**: `test-plan.md`, project scripts, E2E fixtures
**Requirement**: VUX-01 through VUX-38

**Tools**:

- MCP: NONE
- Skills: `preflop-design`, `frontend-design`, `preflop-e2e-playwright`, `playwright`

**Done when**:

- [x] `pnpm test:unit` passes
- [x] Full E2E gate passes locally via `pnpm test` or documented equivalent
- [x] No test count drops are accepted without explanation
- [x] Manual QA covers dark/light themes and widths around 1280px, 1024px, 768px
- [x] Keyboard focus is checked in auth, sidebar, forms, training actions and dialogs
- [x] Known residual risks or deferred visual items are documented

**Tests**: unit + E2E full
**Gate**: `pnpm test`

**Completion notes**:

- Automated regression: `pnpm test` passed with 461 unit tests and 102 E2E tests.
- Visual/keyboard QA: temporary Playwright QA covered login, sidebar shell, history, stats, profile, clear-stats dialog and training session in dark/light themes at 1280px, 1024px and 768px; screenshots were generated and inspected, then removed as temporary artifacts.
- Additional fix from QA: renderer logo assets now resolve correctly in packaged Electron `file://` routes.
- Residual risk: QA is screenshot-assisted and assertion-based, not pixel-diff visual regression; future visual drift still needs human review or dedicated screenshot baselines.

---

## Parallel Execution Map

```text
Phase 1:
  T1 -> T2 -> T3

Phase 2:
  T3 -> T4 -> T5 -> T6 -> T7

Phase 3:
  T3 complete:
    ├── T8 [P]
    └── T9 [P]
  T8 + T9 -> T10 -> T11

Phase 4:
  T7 + T11 complete:
    ├── T12 [P]
    ├── T13 [P]
    ├── T14 [P]
    └── T15 [P]

Phase 5:
  T3 complete:
    ├── T16 [P]
    └── T17 [P]

Phase 6:
  T4..T17 -> T18
```

---

## Requirement Coverage Matrix

| Requirement | Tasks                                                           |
| ----------- | --------------------------------------------------------------- |
| VUX-01      | T1, T3, T16, T18                                                |
| VUX-02      | T1, T18                                                         |
| VUX-03      | T3, T4, T18                                                     |
| VUX-04      | T1, T3, T16, T18                                                |
| VUX-05      | T1, T2, T3, T18                                                 |
| VUX-06      | T8, T10, T18                                                    |
| VUX-07      | T10, T18                                                        |
| VUX-08      | T10, T18                                                        |
| VUX-09      | T10, T18                                                        |
| VUX-10      | T9, T11, T18                                                    |
| VUX-11      | T5, T18                                                         |
| VUX-12      | T5, T18                                                         |
| VUX-13      | T5, T6, T18                                                     |
| VUX-14      | T7, T18                                                         |
| VUX-15      | T7, T18                                                         |
| VUX-16      | T12, T18                                                        |
| VUX-17      | T14, T18                                                        |
| VUX-18      | T12, T14, T18                                                   |
| VUX-19      | T13, T15, T18                                                   |
| VUX-20      | T4, T14, T15, T18                                               |
| VUX-21      | T2, T5, T7, T8, T9, T16, T17, T18                               |
| VUX-22      | T3, T12, T14, T15, T18                                          |
| VUX-23      | T2, T4, T5, T6, T8, T9, T12, T14, T15, T18                      |
| VUX-24      | T1, T2, T14, T16, T17, T18                                      |
| VUX-25      | T5, T6, T13, T15, T18                                           |
| VUX-26      | T5, T6, T7, T8, T9, T10, T11, T12, T13, T14, T15, T17, T18      |
| VUX-27      | T5, T6, T7, T8, T9, T10, T11, T12, T13, T14, T15, T16, T17, T18 |
| VUX-28      | T3, T18                                                         |
| VUX-29      | T6, T7, T13, T15, T18                                           |
| VUX-30      | T1, T2, T3, T10, T11, T13, T17, T18                             |
| VUX-31      | T1, T2, T3, T7, T10, T11, T13, T17, T18                         |
| VUX-32      | T2, T7, T8, T9, T10, T11, T13, T17, T18                         |
| VUX-33      | T10, T11, T18                                                   |
| VUX-34      | T12, T18                                                        |
| VUX-35      | T4, T16, T18                                                    |
| VUX-36      | T6, T8, T9, T18                                                 |
| VUX-37      | T12, T18                                                        |
| VUX-38      | T4, T18                                                         |

**Coverage:** 38 total, 38 mapped to tasks, 0 unmapped.

---

## Diagram-Definition Cross-Check

| Task | Depends on | Diagram Match | Notes                                                                                           |
| ---- | ---------- | ------------- | ----------------------------------------------------------------------------------------------- |
| T1   | None       | OK            | Foundation start                                                                                |
| T2   | T1         | OK            | Sequential foundation                                                                           |
| T3   | T2         | OK            | Shared shell after primitives                                                                   |
| T4   | T3         | OK            | Dashboard after foundation                                                                      |
| T5   | T3         | OK            | Management can start after foundation; sequenced after dashboard in phase for review simplicity |
| T6   | T5         | OK            | Situations list after group patterns                                                            |
| T7   | T6         | OK            | Editor/range after list management                                                              |
| T8   | T3         | OK            | Parallel config branch                                                                          |
| T9   | T3         | OK            | Parallel config branch                                                                          |
| T10  | T8, T9     | OK            | Session cockpit after both config forms                                                         |
| T11  | T10        | OK            | Simultaneous panels reuse cockpit language                                                      |
| T12  | T7, T11    | OK            | Results after editor/training flows stable                                                      |
| T13  | T7, T11    | OK            | History after data creation/training flows stable                                               |
| T14  | T7, T11    | OK            | Review after range/training flows stable                                                        |
| T15  | T7, T11    | OK            | Stats after management/training flows stable                                                    |
| T16  | T3         | OK            | Entry after foundation                                                                          |
| T17  | T3         | OK            | Profile after foundation/status primitives                                                      |
| T18  | T4-T17     | OK            | Final gate after all implementation tasks                                                       |

---

## Test Co-Location Validation

| Task | Code Layer                    | Tests Field                     | Test Co-located? | Notes                                                             |
| ---- | ----------------------------- | ------------------------------- | ---------------- | ----------------------------------------------------------------- |
| T1   | Tokens/CSS/global             | unit conditional                | OK               | Unit if component behavior affected; no separate test-only task   |
| T2   | Shared components             | unit                            | OK               | Component tests in same task                                      |
| T3   | Shared components/shell       | unit + targeted E2E conditional | OK               | Shell tests in same task                                          |
| T4   | Dashboard page                | E2E + optional unit             | OK               | Dashboard E2E adjusted in task                                    |
| T5   | Groups pages/components       | unit + E2E                      | OK               | `GroupCard` unit and group E2E in task                            |
| T6   | Situations page               | E2E + optional unit             | OK               | Existing situations E2E adjusted in task                          |
| T7   | Situation editor/range        | unit + E2E                      | OK               | Range E2E required if range surroundings change                   |
| T8   | Single training config        | unit + E2E                      | OK               | Training config unit/E2E in task                                  |
| T9   | Simultaneous training config  | unit + E2E                      | OK               | Simultaneous config unit/E2E in task                              |
| T10  | Single training session       | unit + E2E                      | OK               | Timer/pause/feedback E2E in task                                  |
| T11  | Simultaneous training session | unit + E2E                      | OK               | Multi-table E2E in task                                           |
| T12  | Result/summary pages          | unit + E2E                      | OK               | Navigation tests in task                                          |
| T13  | History page/components       | unit + E2E                      | OK               | URL/selection E2E in task                                         |
| T14  | Review pages/components       | unit + E2E                      | OK               | Hand review and grid E2E in task                                  |
| T15  | Stats page/components         | unit + E2E                      | OK               | IPC filter unit and stats E2E in task                             |
| T16  | Login page                    | E2E + optional unit             | OK               | Auth E2E in task                                                  |
| T17  | Profile page                  | unit + E2E                      | OK               | Profile/unit/theme E2E in task                                    |
| T18  | Full app                      | unit + E2E full                 | OK               | Final regression gate, not a substitute for co-located task tests |

---

## Task Completion Report Template

Each implementation task must finish with:

```markdown
Task: T## - [name]
Status: Complete | Partial | Blocked
Requirements covered: VUX-...
Files changed: ...
Existing unit tests reviewed: ...
Existing E2E tests reviewed: ...
Tests adjusted: ...
New tests added: ...
Gate run: [command] -> pass/fail
Manual checks: theme / width / keyboard / visual hierarchy
SPEC_DEVIATION: none | [details]
```

---

## Tooling Before Execution

Before executing tasks, confirm available tooling for the chosen task batch.

**Available Skills likely relevant**:

- `preflop-design`: visual tokens/layout rules
- `frontend-design`: page/component visual redesign
- `preflop-domain`: grid 13x13, actions, training/review semantics
- `preflop-e2e-playwright`: project E2E conventions
- `playwright`: general Playwright locator/debug patterns
- `tlc-spec-driven`: task execution/status tracking

**MCPs**: none discovered in this session.

---

## Execution Log

### T1: Define Visual Foundation Tokens and Audit Raw Colors

Task: T1 - Define Visual Foundation Tokens and Audit Raw Colors
Status: Complete
Requirements covered: VUX-01, VUX-02, VUX-04, VUX-05, VUX-24, VUX-30, VUX-31
Files changed: `src/renderer/src/index.css`, `src/renderer/src/components/grid/RangeGrid13.tsx`, `src/renderer/src/components/history/HandReviewCard.tsx`, `src/renderer/src/pages/MultiSessionReviewPage.tsx`, `src/renderer/src/pages/ProfilePage.tsx`
Existing unit tests reviewed: `app-shared.test.tsx`, `profile-page.test.tsx`, `MultiSessionReviewPage.test.tsx`, `HandReviewCard.test.tsx`
Existing E2E tests reviewed: `e2e/range-grid-improvements.spec.ts`, `e2e/session-history/hand-review.spec.ts`, `e2e/session-history/batch-review.spec.ts`, `e2e/profile/*.spec.ts`
Tests adjusted: none for E2E; unit coverage added under T2 for shared status primitive
New tests added: none directly in T1
Gate run: `pnpm test:unit -- src/renderer/src/components/app/app-shared.test.tsx src/renderer/src/pages/profile-page.test.tsx src/renderer/src/pages/MultiSessionReviewPage.test.tsx src/renderer/src/components/history/HandReviewCard.test.tsx` -> pass (50 files, 457 tests before T3; 458 after T3)
Manual checks: raw color audit repeated; remaining raw values are domain/action colors, card suits, chart palette constants or test fixtures
SPEC_DEVIATION: none

### T2: Add Shared Status and Surface Primitives

Task: T2 - Add Shared Status and Surface Primitives
Status: Complete
Requirements covered: VUX-05, VUX-21, VUX-23, VUX-24, VUX-30, VUX-31, VUX-32
Files changed: `src/renderer/src/components/app/StatusMessage.tsx`, `src/renderer/src/components/app/index.ts`, `src/renderer/src/components/app/app-shared.test.tsx`, `src/renderer/src/pages/MultiSessionReviewPage.tsx`, `src/renderer/src/pages/ProfilePage.tsx`
Existing unit tests reviewed: `app-shared.test.tsx`, `profile-page.test.tsx`, `MultiSessionReviewPage.test.tsx`
Existing E2E tests reviewed: `e2e/profile/*.spec.ts`, `e2e/session-history/batch-review.spec.ts`
Tests adjusted: `app-shared.test.tsx`
New tests added: `StatusMessage` default role/tone and role override coverage
Gate run: `pnpm test:unit -- src/renderer/src/components/app/app-shared.test.tsx src/renderer/src/pages/profile-page.test.tsx src/renderer/src/pages/MultiSessionReviewPage.test.tsx src/renderer/src/components/history/HandReviewCard.test.tsx` -> pass
Manual checks: `SurfacePanel` not added because no repeated non-section surface pattern required it yet
SPEC_DEVIATION: none

### T3: Enhance Shared Metrics, Header and Shell Polish

Task: T3 - Enhance Shared Metrics, Header and Shell Polish
Status: Complete
Requirements covered: VUX-01, VUX-03, VUX-04, VUX-05, VUX-21, VUX-22, VUX-28, VUX-30, VUX-31
Files changed: `src/renderer/src/components/app/StatCard.tsx`, `src/renderer/src/components/app/AppSidebar.tsx`, `src/renderer/src/components/Layout.tsx`, `src/renderer/src/components/app/app-shared.test.tsx`
Existing unit tests reviewed: `app-shared.test.tsx`, `layout-nav-active.test.tsx`
Existing E2E tests reviewed: `e2e/profile/theme-preference.spec.ts`, `e2e/smoke.spec.ts`
Tests adjusted: `app-shared.test.tsx`
New tests added: `StatCard` optional description/icon/tone coverage
Gate run: `pnpm test:unit -- src/renderer/src/components/app/app-shared.test.tsx src/renderer/src/components/layout-nav-active.test.tsx src/renderer/src/pages/profile-page.test.tsx src/renderer/src/pages/MultiSessionReviewPage.test.tsx src/renderer/src/components/history/HandReviewCard.test.tsx` -> pass (50 files, 458 tests)
Manual checks: sidebar labels and route names preserved; theme button accessible name preserved; breadcrumbs unchanged
SPEC_DEVIATION: none

### T4: Redesign Dashboard as Study Cockpit

Task: T4 - Redesign Dashboard as Study Cockpit
Status: Complete
Requirements covered: VUX-03, VUX-20, VUX-22, VUX-23, VUX-35, VUX-38
Files changed: `src/renderer/src/pages/DashboardPage.tsx`
Existing unit tests reviewed: `app-shared.test.tsx`
Existing E2E tests reviewed: `e2e/dashboard.spec.ts`
Tests adjusted: none; existing `Treinar agora` link and metric labels preserved
New tests added: none; existing E2E covers summary labels and training navigation
Gate run: `pnpm test:unit -- src/renderer/src/components/app/app-shared.test.tsx src/renderer/src/components/layout-nav-active.test.tsx` -> pass (50 files, 458 tests)
Gate run: `pnpm build:app && pnpm playwright test e2e/dashboard.spec.ts` -> build pass, E2E launch failed inside sandbox before UI (`sandbox_host_linux.cc`, Operation not permitted)
Gate run: `xvfb-run -a pnpm playwright test e2e/dashboard.spec.ts --workers=1` outside sandbox with approval -> pass (1 test)
Manual checks: Dashboard now has study cockpit hero, empty/returning copy, setup CTA, preserved `Treinar agora` CTA and three existing metric labels
SPEC_DEVIATION: none

### T5: Redesign Groups and Group Detail Management

Task: T5 - Redesign Groups and Group Detail Management
Status: Complete
Requirements covered: VUX-11, VUX-12, VUX-13, VUX-21, VUX-23, VUX-25, VUX-26, VUX-27
Files changed: `src/renderer/src/pages/GroupsPage.tsx`, `src/renderer/src/pages/GroupDetailPage.tsx`, `src/renderer/src/components/groups/GroupCard.tsx`
Existing unit tests reviewed: `src/renderer/src/components/groups/GroupCard.test.tsx`, `src/renderer/src/components/app/app-shared.test.tsx`
Existing E2E tests reviewed: `e2e/situation-groups/crud-groups.spec.ts`, `e2e/situation-groups/archive-cascade.spec.ts`
Tests adjusted: none; existing testids, labels and CRUD flow preserved
New tests added: none; existing unit/E2E coverage already exercises group card actions and CRUD/cascade flows
Gate run: `pnpm test:unit -- src/renderer/src/components/groups/GroupCard.test.tsx src/renderer/src/components/app/app-shared.test.tsx` -> pass (50 files, 458 tests)
Gate run: `pnpm build:app && xvfb-run -a pnpm playwright test e2e/situation-groups/crud-groups.spec.ts e2e/situation-groups/archive-cascade.spec.ts --workers=1` outside sandbox with approval -> pass (3 tests)
Manual checks: group create/list/detail now have study-library context, preserved `Novo grupo`, `Criar`, rename/archive testids and group detail `Nova situação`
SPEC_DEVIATION: none

### T6: Redesign Situations List and Filters

Task: T6 - Redesign Situations List and Filters
Status: Complete
Requirements covered: VUX-13, VUX-23, VUX-25, VUX-26, VUX-27, VUX-29, VUX-36
Files changed: `src/renderer/src/pages/SituationsPage.tsx`
Existing unit tests reviewed: `src/renderer/src/components/app/app-shared.test.tsx`
Existing E2E tests reviewed: `e2e/situations.spec.ts`
Tests adjusted: none; existing `Nova situação`, table rows and action buttons preserved
New tests added: none; existing E2E covers empty list, create validation, duplicate, edit and archive
Gate run: `pnpm test:unit -- src/renderer/src/components/app/app-shared.test.tsx` -> pass (50 files, 458 tests)
Gate run: `pnpm build:app && xvfb-run -a pnpm playwright test e2e/situations.spec.ts --workers=1` outside sandbox with approval -> pass (3 tests)
Manual checks: Situations now has catalogue context, visible/total/group metrics, filter-aware empty state and preserved create/edit/archive flows
SPEC_DEVIATION: none

### T7: Redesign Situation Editor and Range Surroundings

Task: T7 - Redesign Situation Editor and Range Surroundings
Status: Complete
Requirements covered: VUX-14, VUX-15, VUX-21, VUX-23, VUX-26, VUX-27, VUX-29, VUX-31, VUX-32
Files changed: `src/renderer/src/pages/SituationEditPage.tsx`, `src/renderer/src/components/situations/SituationActionsEditor.tsx`, `src/renderer/src/components/situations/RangeEditorPanel.tsx`
Existing unit tests reviewed: page/component coverage under `src/renderer/src/pages`, `src/renderer/src/components/situations`, `src/renderer/src/components/grid`
Existing E2E tests reviewed: `e2e/situation-edit.spec.ts`, `e2e/range-grid-improvements.spec.ts`, `e2e/situation-groups/situation-group-field.spec.ts`
Tests adjusted: none; labels, range-grid testid and action panel/row testids preserved
New tests added: none; existing E2E coverage already validates grid labels, combo percentages, active action highlight, clearing, persistence, duplicate-name error and required group validation
Gate run: `pnpm test:unit -- src/renderer/src/components/situations src/renderer/src/components/grid src/renderer/src/pages` -> pass (50 files, 458 tests)
Gate run: `pnpm build:app && xvfb-run -a pnpm playwright test e2e/situation-edit.spec.ts e2e/range-grid-improvements.spec.ts e2e/situation-groups/situation-group-field.spec.ts --workers=1` outside sandbox with approval -> pass (10 tests)
Manual checks: editor now has visual sequence Spot -> Ações -> Range, range legend, preserved `range-grid-13`, `situation-actions-panel`, `situation-action-row`, and no domain/grid invariant changes
SPEC_DEVIATION: none

### T8: Redesign Single Training Configuration Wizard

Task: T8 - Redesign Single Training Configuration Wizard
Status: Complete
Requirements covered: VUX-06, VUX-21, VUX-23, VUX-26, VUX-27, VUX-32, VUX-36
Files changed: `src/renderer/src/components/training/SingleTrainingConfigForm.tsx`, `src/renderer/src/components/training/GroupSelectionStep.tsx`, `src/renderer/src/components/training/SituationChecklist.tsx`, `src/renderer/src/components/training/SessionSettingsForm.tsx`
Existing unit tests reviewed: `src/renderer/src/components/training/training-config.test.tsx`, `src/renderer/src/components/training/training-defaults.test.tsx`
Existing E2E tests reviewed: `e2e/training.spec.ts`, `e2e/situation-groups/training-selection.spec.ts`
Tests adjusted: none; `training-step-1`, `training-step-2`, `training-back-btn`, `training-select-all-btn`, form labels and submit label preserved
New tests added: none; existing unit/E2E coverage validates group selection, disabled submit, validations, preferences/defaults and session start
Gate run: `pnpm test:unit -- src/renderer/src/components/training/training-config.test.tsx src/renderer/src/components/training/training-defaults.test.tsx src/renderer/src/components/training/training-simultaneous.test.tsx` -> pass (50 files, 458 tests)
Gate run: `pnpm build:app` -> pass
Gate run: `xvfb-run -a pnpm playwright test e2e/training.spec.ts e2e/situation-groups/training-selection.spec.ts --workers=1` outside sandbox with approval -> pass (15 tests)
Manual checks: single training config now has a clearer library card, numbered spot/settings sections, selection count and carded settings while preserving IPC payload and domain behavior
SPEC_DEVIATION: none

### T9: Redesign Simultaneous Training Configuration Wizard

Task: T9 - Redesign Simultaneous Training Configuration Wizard
Status: Complete
Requirements covered: VUX-10, VUX-21, VUX-23, VUX-26, VUX-27, VUX-32, VUX-36
Files changed: `src/renderer/src/components/training/SimultaneousTrainingConfigForm.tsx`, `src/renderer/src/components/training/GroupSelectionStep.tsx`, `src/renderer/src/components/training/SituationChecklist.tsx`, `src/renderer/src/components/training/SessionSettingsForm.tsx`
Existing unit tests reviewed: `src/renderer/src/components/training/training-config.test.tsx`, `src/renderer/src/components/training/training-simultaneous.test.tsx`, `src/renderer/src/components/training/training-defaults.test.tsx`
Existing E2E tests reviewed: `e2e/simultaneous-training/session-config.spec.ts`, `e2e/simultaneous-training/navigation.spec.ts`
Tests adjusted: none; `sim-training-step-1`, `sim-training-step-2`, `sim-training-back-btn`, `sim-training-select-all-btn`, table count label, settings labels and submit label preserved
New tests added: none; existing E2E coverage validates navigation, 2/3/4 table starts and invalid configuration blocking
Gate run: `pnpm test:unit -- src/renderer/src/components/training/training-config.test.tsx src/renderer/src/components/training/training-defaults.test.tsx src/renderer/src/components/training/training-simultaneous.test.tsx` -> pass (50 files, 458 tests)
Gate run: `pnpm build:app` -> pass
Gate run: `xvfb-run -a pnpm playwright test e2e/simultaneous-training/session-config.spec.ts e2e/simultaneous-training/navigation.spec.ts --workers=1` outside sandbox with approval -> pass (7 tests)
Manual checks: simultaneous config now distinguishes multi-table mode with numbered Mesas -> Spots -> Ritmo sections and reviewable table/spot/settings controls without changing validation or session start behavior
SPEC_DEVIATION: none

### T10: Redesign Single Training Session Cockpit

Task: T10 - Redesign Single Training Session Cockpit
Status: Complete
Requirements covered: VUX-06, VUX-07, VUX-08, VUX-09, VUX-26, VUX-27, VUX-30, VUX-31, VUX-32, VUX-33
Files changed: `src/renderer/src/pages/TrainingSessionPage.tsx`, `src/renderer/src/components/training/TrainingSessionHeader.tsx`, `src/renderer/src/components/training/TrainingActionButtons.tsx`, `src/renderer/src/components/training/TrainingFeedbackPanel.tsx`
Existing unit tests reviewed: `src/renderer/src/components/training/training-session.test.tsx`, `src/renderer/src/components/training/training-feedback.test.tsx`
Existing E2E tests reviewed: `e2e/training.spec.ts`, `e2e/simultaneous-training/regression-single-flow.spec.ts`
Tests adjusted: none; action accessible names, `pause-continue-btn`, `progress-track`, `progress-filler`, `timer-icon`, feedback copy and navigation labels preserved
New tests added: none; existing tests cover feedback, action disabled state, pause/continue, progress width, timer icon, timeout, abandon guard and result navigation
Gate run: `pnpm test:unit -- src/renderer/src/components/training/training-session.test.tsx src/renderer/src/components/training/training-feedback.test.tsx` -> pass (50 files, 458 tests)
Gate run: `pnpm build:app` -> pass
Gate run: `xvfb-run -a pnpm playwright test e2e/training.spec.ts e2e/simultaneous-training/regression-single-flow.spec.ts --workers=1` outside sandbox with approval -> pass (14 tests)
Manual checks: single training now uses a study cockpit layout with distinct active-session header, spot/card zone, decision zone, inline feedback and stronger pause overlay without changing training state transitions
SPEC_DEVIATION: none

### T11: Redesign Simultaneous Training Session Panels

Task: T11 - Redesign Simultaneous Training Session Panels
Status: Complete
Requirements covered: VUX-10, VUX-26, VUX-27, VUX-30, VUX-31, VUX-32, VUX-33
Files changed: `src/renderer/src/pages/SimultaneousTrainingSessionPage.tsx`, `src/renderer/src/components/training/SimultaneousTablePanel.tsx`, `src/renderer/src/components/training/training-simultaneous.test.tsx`
Existing unit tests reviewed: `src/renderer/src/components/training/training-simultaneous.test.tsx`, `src/renderer/src/components/training/training-session.test.tsx`, `src/renderer/src/components/training/training-feedback.test.tsx`
Existing E2E tests reviewed: `e2e/simultaneous-training/full-flow.spec.ts`, `e2e/simultaneous-training/isolated-state.spec.ts`, `e2e/simultaneous-training/pause-guard.spec.ts`, `e2e/simultaneous-training/leave-guard.spec.ts`
Tests adjusted: `training-simultaneous.test.tsx`
New tests added: paused-state rendering and disabled table actions for `SimultaneousTablePanel`
Gate run: `pnpm test:unit -- src/renderer/src/components/training/training-simultaneous.test.tsx src/renderer/src/components/training/training-session.test.tsx src/renderer/src/components/training/training-feedback.test.tsx` -> pass (50 files, 459 tests)
Gate run: `pnpm build:app` -> pass
Gate run: `xvfb-run -a pnpm playwright test e2e/simultaneous-training/full-flow.spec.ts e2e/simultaneous-training/isolated-state.spec.ts e2e/simultaneous-training/pause-guard.spec.ts e2e/simultaneous-training/leave-guard.spec.ts --workers=1` outside sandbox with approval -> pass (4 tests)
Manual checks: simultaneous training now has page-level session summary and per-table cards with status, progress, timer, spot/cards, isolated actions, inline feedback and clearer pause overlay
SPEC_DEVIATION: none

### T12: Redesign Result and Simultaneous Summary Pages

Task: T12 - Redesign Result and Simultaneous Summary Pages
Status: Complete
Requirements covered: VUX-16, VUX-18, VUX-22, VUX-23, VUX-34, VUX-37
Files changed: `src/renderer/src/pages/TrainingResultPage.tsx`, `src/renderer/src/pages/SimultaneousTrainingSummaryPage.tsx`, `src/renderer/src/pages/TrainingResultPage.test.tsx`, `src/renderer/src/pages/SimultaneousTrainingSummaryPage.test.tsx`
Existing unit tests reviewed: `TrainingResultPage.test.tsx`, `SimultaneousTrainingSummaryPage.test.tsx`
Existing E2E tests reviewed: `e2e/training.spec.ts`, `e2e/simultaneous-training/full-flow.spec.ts`
Tests adjusted: `TrainingResultPage.test.tsx`, `SimultaneousTrainingSummaryPage.test.tsx`
New tests added: result interpretation/acertos-erros summary; simultaneous aggregate-first summary assertions
Gate run: `pnpm test:unit -- src/renderer/src/pages/TrainingResultPage.test.tsx src/renderer/src/pages/SimultaneousTrainingSummaryPage.test.tsx` -> pass (50 files, 461 tests)
Gate run: `pnpm build:app` -> pass
Gate run: `xvfb-run -a pnpm playwright test e2e/training.spec.ts e2e/simultaneous-training/full-flow.spec.ts --workers=1` outside sandbox with approval -> pass (14 tests)
Manual checks: result screens now emphasize score, interpretation, acertos/erros, situation/table breakdowns and next-step CTAs while preserving `Revisão da sessão`, `Nova sessão`, `Ver estatísticas`, `Revisão múltipla`, `Novo treino simultâneo` and `Treino normal` routes
SPEC_DEVIATION: none

### T13: Redesign History List, Filters and Batch Toolbar

Task: T13 - Redesign History List, Filters and Batch Toolbar
Status: Complete
Requirements covered: VUX-19, VUX-25, VUX-26, VUX-27, VUX-29, VUX-30, VUX-31, VUX-32
Files changed: `src/renderer/src/pages/HistoryPage.tsx`, `src/renderer/src/components/history/SelectionToolbar.tsx`, `src/renderer/src/components/app/EntityTable.tsx`
Existing unit tests reviewed: `src/renderer/src/pages/HistoryPage.test.tsx`, `src/renderer/src/components/history/SelectionToolbar.test.tsx`
Existing E2E tests reviewed: `e2e/session-history/list.spec.ts`, `e2e/session-history/pagination.spec.ts`, `e2e/session-history/batch-actions.spec.ts`, `e2e/date-period-filter/history-filter.spec.ts`
Tests adjusted: none; existing testids and accessible review action preserved
New tests added: none
Gate run: `pnpm test:unit -- src/renderer/src/pages/HistoryPage.test.tsx src/renderer/src/components/history/SelectionToolbar.test.tsx` -> pass (50 files, 461 tests)
Gate run: `pnpm build:app` -> pass
Gate run: `pnpm playwright test e2e/session-history/list.spec.ts e2e/session-history/pagination.spec.ts e2e/session-history/batch-actions.spec.ts e2e/date-period-filter/history-filter.spec.ts` -> pass (15 tests)
Manual checks: history filters, summary, selection toolbar, table and pagination now read as one query module; URL state, page reset, selection persistence and review actions preserved
SPEC_DEVIATION: none

### T14: Redesign Hand Review and Multi-Session Review

Task: T14 - Redesign Hand Review and Multi-Session Review
Status: Complete
Requirements covered: VUX-17, VUX-18, VUX-20, VUX-22, VUX-23, VUX-24, VUX-26, VUX-27
Files changed: `src/renderer/src/components/history/HandReviewCard.tsx`, `src/renderer/src/components/history/MultiSessionReviewHeader.tsx`, `src/renderer/src/pages/SessionHandReviewPage.tsx`, `src/renderer/src/pages/MultiSessionReviewPage.tsx`
Existing unit tests reviewed: `HandReviewCard.test.tsx`, `MultiSessionReviewHeader.test.tsx`, `SessionHandReviewPage.test.tsx`, `MultiSessionReviewPage.test.tsx`
Existing E2E tests reviewed: `e2e/session-history/hand-review.spec.ts`, `e2e/session-history/batch-review.spec.ts`
Tests adjusted: none; review navigation labels, timeout text and `range-grid-13` preserved
New tests added: none
Gate run: `pnpm test:unit -- src/renderer/src/components/history/HandReviewCard.test.tsx src/renderer/src/components/history/MultiSessionReviewHeader.test.tsx src/renderer/src/pages/SessionHandReviewPage.test.tsx src/renderer/src/pages/MultiSessionReviewPage.test.tsx` -> pass (50 files, 461 tests)
Gate run: `pnpm build:app` -> pass
Gate run: `pnpm playwright test e2e/session-history/hand-review.spec.ts e2e/session-history/batch-review.spec.ts` -> pass (7 tests)
Manual checks: review cards now show status, cards/spot, chosen answer, correct answer, response time and expected range in clear zones; multi-session review shows aggregate context before hand list
SPEC_DEVIATION: none

### T15: Redesign Stats Analytics Page

Task: T15 - Redesign Stats Analytics Page
Status: Complete
Requirements covered: VUX-19, VUX-20, VUX-22, VUX-23, VUX-25, VUX-26, VUX-27, VUX-29
Files changed: `src/renderer/src/pages/StatsPage.tsx`, `src/renderer/src/components/stats/StatsOverviewCards.tsx`, `src/renderer/src/components/stats/StatsChartCard.tsx`, `src/renderer/src/components/stats/StatsWorstHandsList.tsx`
Existing unit tests reviewed: `src/renderer/src/pages/StatsPage.test.tsx`, `src/renderer/src/components/stats/stats-shared.test.tsx`
Existing E2E tests reviewed: `e2e/stats.spec.ts`, `e2e/date-period-filter/stats-filter.spec.ts`, `e2e/situation-groups/stats-filter.spec.ts`, `e2e/simultaneous-training/stats-segmentation.spec.ts`
Tests adjusted: none; stats filter testids and IPC filter behavior preserved
New tests added: none
Gate run: `pnpm test:unit -- src/renderer/src/pages/StatsPage.test.tsx src/renderer/src/components/stats` -> pass (50 files, 461 tests)
Gate run: `pnpm build:app` -> pass
Gate run: `pnpm playwright test e2e/stats.spec.ts e2e/date-period-filter/stats-filter.spec.ts e2e/situation-groups/stats-filter.spec.ts e2e/simultaneous-training/stats-segmentation.spec.ts` -> pass (16 tests)
Manual checks: stats now flows as Recorte de análise -> Overview -> Evolução -> Ranking por situação/Vazamentos, with contextual empty states and unchanged clear-history behavior
SPEC_DEVIATION: none

### T16: Redesign Login Entry Experience

Task: T16 - Redesign Login Entry Experience
Status: Complete
Requirements covered: VUX-01, VUX-04, VUX-21, VUX-24, VUX-27, VUX-35
Files changed: `src/renderer/src/pages/LoginPage.tsx`, `src/renderer/src/components/app/AppSidebar.tsx`
Existing unit tests reviewed: `src/renderer/src/components/forms/password-field.test.tsx`
Existing E2E tests reviewed: `e2e/auth.spec.ts`, `e2e/auth-flows.spec.ts`, `e2e/smoke.spec.ts`
Tests adjusted: none; auth tabs, form labels, submit labels and root error role preserved
New tests added: none
Gate run: `pnpm test:unit -- src/renderer/src/components/forms/password-field.test.tsx` -> pass (50 files, 461 tests)
Gate run: `pnpm build:app` -> pass
Gate run: `pnpm playwright test e2e/auth.spec.ts e2e/auth-flows.spec.ts e2e/smoke.spec.ts` -> pass (10 tests)
Manual checks: login now presents product value and auth card in Felt/amber visual language; QA found and fixed packaged Electron logo asset resolution in `LoginPage` and `AppSidebar`
SPEC_DEVIATION: none

### T17: Redesign Profile and Preferences Feedback

Task: T17 - Redesign Profile and Preferences Feedback
Status: Complete
Requirements covered: VUX-21, VUX-24, VUX-26, VUX-27, VUX-30, VUX-31, VUX-32
Files changed: `src/renderer/src/pages/ProfilePage.tsx`
Existing unit tests reviewed: `src/renderer/src/pages/profile-page.test.tsx`, `src/renderer/src/stores/preferences.test.ts`
Existing E2E tests reviewed: `e2e/profile/update-name.spec.ts`, `e2e/profile/change-password.spec.ts`, `e2e/profile/training-defaults.spec.ts`, `e2e/profile/theme-preference.spec.ts`
Tests adjusted: none; account, password, preferences and theme sync flows preserved
New tests added: none
Gate run: `pnpm test:unit -- src/renderer/src/pages/profile-page.test.tsx src/renderer/src/stores/preferences.test.ts` -> pass (50 files, 461 tests)
Gate run: `pnpm build:app` -> pass
Gate run: `pnpm playwright test e2e/profile/update-name.spec.ts e2e/profile/change-password.spec.ts e2e/profile/training-defaults.spec.ts e2e/profile/theme-preference.spec.ts` -> pass (7 tests)
Manual checks: account, security and preferences sections are visually distinct; success/error feedback uses shared `StatusMessage` roles and shell theme toggle remains synchronized
SPEC_DEVIATION: none

### T18: Final Regression, Accessibility and Visual QA

Task: T18 - Final Regression, Accessibility and Visual QA
Status: Complete
Requirements covered: VUX-01 through VUX-38
Files changed: `.specs/features/app-visual-ux-system/tasks.md`, `.specs/project/STATE.md`
Existing unit tests reviewed: full unit suite
Existing E2E tests reviewed: full E2E suite
Tests adjusted: none
New tests added: none committed; temporary Playwright QA spec was created, run and removed
Gate run: `pnpm test` -> pass (461 unit tests, build app, 102 E2E tests)
Gate run: temporary Playwright visual/keyboard QA across login, sidebar shell, history, stats, profile, clear-stats dialog and training session -> pass
Manual checks: screenshots were generated and inspected for dark/light themes at 1280px, 1024px and 768px; keyboard focus checked in auth, sidebar, forms, training actions and dialogs
SPEC_DEVIATION: none
