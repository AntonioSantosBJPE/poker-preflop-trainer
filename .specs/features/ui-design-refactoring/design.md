# Design — UI/UX Refactoring

## Overview

Refactoring visual e estrutural em 5 blocos por ordem crescente de complexidade. Cada bloco é independente e pode ser implementado separadamente, com gate checks após cada um.

```
Bloco C (Terminologia) → Bloco B (Loading/Error) → Bloco A (Estrutura) → Bloco D (Hooks) → Bloco E (Restantes)
```

---

## Bloco A — Estrutura de Página (DSG-01 a 06)

### Page Layout Standard

Toda a página segue:

```tsx
<div className="flex flex-col gap-6">
  <PageHeader title="..." backLink={...} actions={...} />
  {/* conteúdo */}
</div>
```

### max-w Resolution

| Page                            | Current     | Target                               |
| ------------------------------- | ----------- | ------------------------------------ |
| TrainingSessionPage             | `max-w-3xl` | Remove — herda `max-w-6xl` do Layout |
| TrainingResultPage              | `max-w-3xl` | Remove — herda `max-w-6xl` do Layout |
| SimultaneousTrainingSummaryPage | `max-w-3xl` | Remove — herda `max-w-6xl` do Layout |
| SingleTrainingConfigForm        | `max-w-xl`  | Remove — herda `max-w-6xl` do Layout |
| SimultaneousTrainingConfigForm  | `max-w-xl`  | Remove — herda `max-w-6xl` do Layout |
| SimultaneousTrainingSessionPage | (none)      | Adicionar `max-w-6xl mx-auto`        |
| LoginPage                       | `max-w-md`  | Keep — standalone, não usa Layout    |

**Nota:** Páginas que usam `max-w` próprio removem-no e passam a herdar do `AppLayout` (`max-w-6xl mx-auto px-6 py-8`), exceto LoginPage.

### gap Resolution

| Page                            | Current     | Target                |
| ------------------------------- | ----------- | --------------------- |
| DashboardPage                   | `gap-8`     | `gap-6`               |
| StatsPage                       | `gap-8`     | `gap-6`               |
| TrainingSessionPage             | `space-y-6` | `flex flex-col gap-6` |
| TrainingResultPage              | `space-y-6` | `flex flex-col gap-6` |
| SimultaneousTrainingSummaryPage | `space-y-6` | `flex flex-col gap-6` |
| SituationEditPage               | `space-y-6` | `flex flex-col gap-6` |
| SimultaneousTrainingSessionPage | `space-y-6` | `flex flex-col gap-6` |

### PageHeader Usage

| Page                           | Current                             | Target                       |
| ------------------------------ | ----------------------------------- | ---------------------------- |
| SituationEditPage              | Manual `<h1>`                       | `PageHeader`                 |
| SessionHandReviewPage          | `PageHeader` + external back Button | `PageHeader` with `backLink` |
| MultiSessionReviewPage         | `PageHeader` + external back Button | `PageHeader` with `backLink` |
| SingleTrainingConfigForm       | Plain `<button>` for "Voltar"       | shadcn `Button`              |
| SimultaneousTrainingConfigForm | Plain `<button>` for "Voltar"       | shadcn `Button`              |

### Button Priority on Result Pages

Current (TrainingResultPage):

- "Rever sessão" → `secondary`
- "Nova sessão" → `outline`
- "Ver estatísticas" → `default` (strongest)

Target:

- "Rever sessão" → `default` (most relevant next action)
- "Nova sessão" → `secondary`
- "Ver estatísticas" → `outline`

Same pattern for SimultaneousTrainingSummaryPage:

- "Revisão múltipla" → `default`
- "Novo treino simultâneo" → `secondary`
- "Treino normal" → `outline`

---

## Bloco B — Loading/Error States (DSG-07 a 16)

### Skeleton Standards

| Context              | Skeleton Pattern                                                              |
| -------------------- | ----------------------------------------------------------------------------- |
| Table loading        | `Skeleton className="h-8 w-full"` × N rows                                    |
| Stat cards loading   | `Skeleton className="h-24 rounded-xl"` × N cards                              |
| Chart loading        | `Skeleton className="h-64 rounded-xl"`                                        |
| Session hand loading | `Skeleton className="h-32 rounded-xl"` × 1 card                               |
| Page content loading | `Skeleton className="h-6 w-48 mb-4"` + `Skeleton className="h-64 rounded-xl"` |

### Error State Standard

All pages use `EmptyState` for error display:

```tsx
<EmptyState
  title="Erro ao carregar"
  description={ipcErrorMessage(error)}
  action={<Button onClick={retry}>Tentar novamente</Button>}
/>
```

### Pages That Need Loading States

| Page                            | Current                     | Target                   |
| ------------------------------- | --------------------------- | ------------------------ |
| GroupDetailPage                 | `<p>Carregando…</p>`        | `Skeleton` rows          |
| TrainingSessionPage             | `<p>Carregando mão…</p>`    | `Skeleton` card          |
| TrainingResultPage              | `<p>Carregando…</p>`        | `Skeleton` cards + chart |
| SimultaneousTrainingSessionPage | `<p>Carregando sessão…</p>` | `Skeleton` panels        |
| DashboardPage                   | (none — defaults to 0)      | `Skeleton` cards         |
| GroupsPage                      | (none)                      | `Skeleton` grid          |
| SituationsPage                  | (none)                      | `Skeleton` table rows    |
| StatsPage                       | (none)                      | `Skeleton` cards + chart |
| ProfilePage                     | (none)                      | `Skeleton` forms         |
| SimultaneousTrainingSummaryPage | (none)                      | `Skeleton` cards         |

### Pages That Need Error States

| Page                            | Current                 | Target                     |
| ------------------------------- | ----------------------- | -------------------------- |
| DashboardPage                   | Silent catch → 0        | `EmptyState` + retry       |
| StatsPage                       | No error handling       | `EmptyState` + retry       |
| TrainingSessionPage             | Redirect to `/training` | `EmptyState` + back button |
| SimultaneousTrainingSessionPage | Redirect                | `EmptyState` + back button |

---

## Bloco C — Terminologia (DSG-17 a 20)

### Replacements

| Location                            | Current              | Target              | Type          |
| ----------------------------------- | -------------------- | ------------------- | ------------- |
| ProfilePage.tsx                     | "Guardar"            | "Salvar"            | Button text   |
| StatsPage.tsx                       | "Pos."               | "Posição"           | Column header |
| SessionHandReviewPage.tsx           | "Revisão da Sessão"  | "Revisão da sessão" | Page title    |
| TrainingResultPage.tsx              | "Rever sessão"       | "Revisão da sessão" | Button text   |
| SimultaneousTrainingSummaryPage.tsx | "Revisão individual" | "Revisão da sessão" | Link text     |

---

## Bloco D — Extrair Lógica Duplicada (DSG-22 a 24)

### Hook: `useIpcError`

```ts
// src/renderer/src/hooks/useIpcError.ts
export function useIpcError(): (error: unknown) => string;
```

**Behaviour:** Takes unknown error from IPC catch, returns user-friendly string.

**Source locations to extract from:**

- `LoginPage.tsx` lines 16-22
- `SituationEditPage.tsx` lines 20-26
- `ProfilePage.tsx` lines 59-65

### Hook: `usePreferenceSync`

```ts
// src/renderer/src/hooks/usePreferenceSync.ts
export function usePreferenceSync(
  form: UseFormReturn<...>,
  preferences: UserPreferences
): void
```

**Behaviour:** Watches `dirtyFields` and syncs changed fields to server.

**Source locations to extract from:**

- `SingleTrainingConfigForm.tsx`
- `SimultaneousTrainingConfigForm.tsx`
- `ProfilePage.tsx`

### Hook: `useSessionTimer`

```ts
// src/renderer/src/hooks/useSessionTimer.ts
export function useSessionTimer(): {
  seconds: number;
  isPaused: boolean;
  pause: () => void;
  resume: () => void;
  reset: () => void;
};
```

**Behaviour:** Timer using `requestAnimationFrame` for smooth updates. Replaces `setInterval(200ms)` + ref pattern.

**Source locations to extract from:**

- `TrainingSessionPage.tsx`
- `SimultaneousTrainingSessionPage.tsx`

---

## Bloco E — Restantes P2/P3

### E.1: FilterToolbar no SituationsPage (DSG-21)

Wrap existing filter select in `FilterToolbar`:

```tsx
<FilterToolbar>
  <FilterToolbarRow>{/* existing group select */}</FilterToolbarRow>
</FilterToolbar>
```

### E.2: ConfirmActionDialog Variant (DSG-25, 26)

```tsx
interface ConfirmActionDialogProps {
  // ...existing props
  variant?: 'destructive' | 'default'; // new
}
```

When `variant="default"`: confirm button uses `bg-primary` instead of `bg-destructive`.

### E.3: StatsPage URL Search Params (DSG-27, 28)

Replace local `useState` for filters with `useSearchParams`:

```
stats?tab=all&period=7d&type=all&tables=all
```

Pattern identical to HistoryPage's approach.

### E.4: Dashboard Empty State Banner (DSG-29, 30)

Banner at top of page when `totalSessions === 0`:

```tsx
{
  totalSessions === 0 && (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
      <p className="font-medium text-primary">Bem-vindo ao Preflop Trainer!</p>
      <p className="text-muted-foreground mt-1">
        Crie a sua primeira situação para começar a treinar.
      </p>
    </div>
  );
}
```

### E.5: Breadcrumbs (DSG-31)

Component `Breadcrumbs` in `src/renderer/src/components/app/`:

```tsx
<Breadcrumbs
  items={[
    { label: 'Dashboard', to: '/' },
    { label: 'Grupos', to: '/groups' },
    { label: groupName, to: `/groups/${id}` },
  ]}
/>
```

Placed inside `PageHeader` or directly above it in the page layout.

**Route-to-breadcrumb mapping:**

| Route Pattern     | Breadcrumbs                     |
| ----------------- | ------------------------------- |
| `/`               | Dashboard                       |
| `/groups`         | Dashboard > Grupos              |
| `/groups/:id`     | Dashboard > Grupos > {name}     |
| `/situations`     | Dashboard > Situações           |
| `/situations/new` | Dashboard > Situações > Nova    |
| `/situations/:id` | Dashboard > Situações > Editar  |
| `/training`       | Dashboard > Treino              |
| `/training/:id`   | Dashboard > Treino > Sessão     |
| `/history`        | Dashboard > Histórico           |
| `/history/:id`    | Dashboard > Histórico > Revisão |
| `/stats`          | Dashboard > Estatísticas        |
| `/profile`        | Dashboard > Perfil              |

### E.6: Focus Management (DSG-32, 33, 34)

- On route change: focus `PageHeader` h1 or `main` container via `autoFocus` or `useEffect`
- `ConfirmActionDialog`: shadcn `AlertDialog` handles focus trap natively — verify coverage
- On dialog close: return focus to trigger element via `onClose` callback pattern

---

## File Change Map

### Bloco C (Terminologia)

| File                                                         | Change                                                                |
| ------------------------------------------------------------ | --------------------------------------------------------------------- |
| `src/renderer/src/pages/ProfilePage.tsx`                     | "Guardar" → "Salvar"                                                  |
| `src/renderer/src/pages/StatsPage.tsx`                       | "Pos." → "Posição"                                                    |
| `src/renderer/src/pages/SessionHandReviewPage.tsx`           | "Revisão da Sessão" → "Revisão da sessão"                             |
| `src/renderer/src/pages/TrainingResultPage.tsx`              | "Rever sessão" → "Revisão da sessão"                                  |
| `src/renderer/src/pages/SimultaneousTrainingSummaryPage.tsx` | "Revisão individual" → "Revisão da sessão"                            |
| `e2e/profile/update-name.spec.ts`                            | "Guardar nome" → "Salvar nome"                                        |
| `e2e/profile/training-defaults.spec.ts`                      | "Guardar preferências" → "Salvar preferências"                        |
| `e2e/profile/theme-preference.spec.ts`                       | "Guardar preferências" → "Salvar preferências" (4×)                   |
| `e2e/session-history/back-navigation.spec.ts`                | "Revisão da Sessão" → "Revisão da sessão"                             |
| `e2e/session-history/hand-review.spec.ts`                    | "Revisão da Sessão" → "Revisão da sessão" (5×)                        |
| `e2e/session-history/batch-review.spec.ts`                   | "Revisão da Sessão" → "Revisão da sessão"                             |
| `e2e/simultaneous-training/full-flow.spec.ts`                | "Revisão da Sessão" + "Revisão individual" → "Revisão da sessão" (2×) |
| `e2e/training.spec.ts`                                       | "Revisão da Sessão" + "Rever sessão" → "Revisão da sessão" (3×)       |

### Bloco B (Loading/Error)

| File                                                         | Change                                      |
| ------------------------------------------------------------ | ------------------------------------------- |
| `src/renderer/src/pages/GroupDetailPage.tsx`                 | Text loading → Skeleton                     |
| `src/renderer/src/pages/TrainingSessionPage.tsx`             | Text loading → Skeleton                     |
| `src/renderer/src/pages/TrainingResultPage.tsx`              | Text loading → Skeleton                     |
| `src/renderer/src/pages/SimultaneousTrainingSessionPage.tsx` | Text loading → Skeleton                     |
| `src/renderer/src/pages/DashboardPage.tsx`                   | Add Skeleton loading state                  |
| `src/renderer/src/pages/GroupsPage.tsx`                      | Add Skeleton loading state                  |
| `src/renderer/src/pages/SituationsPage.tsx`                  | Add Skeleton loading state                  |
| `src/renderer/src/pages/StatsPage.tsx`                       | Add Skeleton loading state + error handling |
| `src/renderer/src/pages/ProfilePage.tsx`                     | Add Skeleton loading state                  |
| `src/renderer/src/pages/SimultaneousTrainingSummaryPage.tsx` | Add Skeleton loading state                  |
| `src/renderer/src/pages/DashboardPage.tsx`                   | Add error EmptyState                        |
| `src/renderer/src/pages/StatsPage.tsx`                       | Add error EmptyState                        |
| `src/renderer/src/pages/TrainingSessionPage.tsx`             | Redirect → EmptyState on error              |
| `src/renderer/src/pages/SimultaneousTrainingSessionPage.tsx` | Redirect → EmptyState on error              |

### Bloco A (Estrutura)

| File                                                                      | Change                                                                         |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/renderer/src/pages/DashboardPage.tsx`                                | `gap-8` → `gap-6`                                                              |
| `src/renderer/src/pages/StatsPage.tsx`                                    | `gap-8` → `gap-6`                                                              |
| `src/renderer/src/pages/TrainingSessionPage.tsx`                          | `space-y-6` → `flex flex-col gap-6`, remove `max-w-3xl`                        |
| `src/renderer/src/pages/TrainingResultPage.tsx`                           | `space-y-6` → `flex flex-col gap-6`, remove `max-w-3xl`, fix button priorities |
| `src/renderer/src/pages/SimultaneousTrainingSummaryPage.tsx`              | `space-y-6` → `flex flex-col gap-6`, remove `max-w-3xl`, fix button priorities |
| `src/renderer/src/pages/SituationEditPage.tsx`                            | `space-y-6` → `flex flex-col gap-6`, manual h1 → `PageHeader`                  |
| `src/renderer/src/pages/SimultaneousTrainingSessionPage.tsx`              | `space-y-6` → `flex flex-col gap-6`, add `max-w-6xl mx-auto`                   |
| `src/renderer/src/pages/SessionHandReviewPage.tsx`                        | External back Button → `PageHeader.backLink`                                   |
| `src/renderer/src/pages/MultiSessionReviewPage.tsx`                       | External back Button → `PageHeader.backLink`                                   |
| `e2e/session-history/back-navigation.spec.ts`                             | `getByRole('button')` → `getByRole('link')` para "← Voltar ao histórico"       |
| `src/renderer/src/components/training/SingleTrainingConfigForm.tsx`       | Plain button → shadcn Button; remove `max-w-xl`                                |
| `src/renderer/src/components/training/SimultaneousTrainingConfigForm.tsx` | Plain button → shadcn Button; remove `max-w-xl`                                |

### Bloco D (Hooks)

| File                                                                      | Change                                         |
| ------------------------------------------------------------------------- | ---------------------------------------------- |
| `src/renderer/src/hooks/useIpcError.ts`                                   | New file                                       |
| `src/renderer/src/hooks/usePreferenceSync.ts`                             | New file                                       |
| `src/renderer/src/hooks/useSessionTimer.ts`                               | New file (requestAnimationFrame)               |
| `src/renderer/src/pages/LoginPage.tsx`                                    | Use shared `useIpcError`                       |
| `src/renderer/src/pages/SituationEditPage.tsx`                            | Use shared `useIpcError`                       |
| `src/renderer/src/pages/ProfilePage.tsx`                                  | Use shared `useIpcError` + `usePreferenceSync` |
| `src/renderer/src/components/training/SingleTrainingConfigForm.tsx`       | Use shared `usePreferenceSync`                 |
| `src/renderer/src/components/training/SimultaneousTrainingConfigForm.tsx` | Use shared `usePreferenceSync`                 |
| `src/renderer/src/pages/TrainingSessionPage.tsx`                          | Use shared `useSessionTimer`                   |
| `src/renderer/src/pages/SimultaneousTrainingSessionPage.tsx`              | Use shared `useSessionTimer`                   |

### Bloco E (Restantes)

| File                                                      | Change                         |
| --------------------------------------------------------- | ------------------------------ |
| `src/renderer/src/pages/SituationsPage.tsx`               | Wrap filter in `FilterToolbar` |
| `src/renderer/src/components/app/ConfirmActionDialog.tsx` | Add `variant` prop             |
| `src/renderer/src/pages/StatsPage.tsx`                    | `useState` → `useSearchParams` |
| `src/renderer/src/pages/DashboardPage.tsx`                | Add empty state banner         |
| `src/renderer/src/components/app/Breadcrumbs.tsx`         | New component                  |
| `src/renderer/src/components/app/PageHeader.tsx`          | Optional breadcrumbs slot      |
| `src/renderer/src/components/Layout.tsx`                  | Focus main on route change     |
| `src/renderer/src/App.tsx`                                | Route change focus management  |
