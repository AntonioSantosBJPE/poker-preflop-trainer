# Session Review Action

## Problem

Clicking on a row in the history table navigates to the individual session review (`/history/:sessionId`). This conflicts with selecting rows via checkboxes for multi-review or deletion — users click on row text/data and are unexpectedly redirected.

Current flow:

1. `EntityTable` has `onRowClick` → navigates to `/history/:sessionId`
2. Checkbox uses `e.stopPropagation()` to survive the row click
3. Any click on row content (group name, accuracy, date, etc.) triggers navigation

## Solution

Remove implicit `onRowClick` navigation. Add an explicit action button (column) on each row to navigate to individual session review.

Clicking the row → only toggles checkbox selection (the expected list-like behavior).

## Requirements

| ID     | Description                                                             | Verification                                                             |
| ------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| REQ-01 | Remove `onRowClick` from `HistoryPage`'s `EntityTable` usage            | `EntityTable` receives no `onRowClick` prop                              |
| REQ-02 | Add an action column with a review button/icon in each row              | Each row has a clickable element that navigates to `/history/:sessionId` |
| REQ-03 | Review action preserves current search params and back-navigation state | Same `location.search` and `state.search` as current `onRowClick`        |
| REQ-04 | Clicking anywhere on the row (outside checkbox) does NOT navigate       | Only the explicit action button triggers navigation                      |
| REQ-05 | Checkbox selection behavior is unchanged                                | Multi-select, select-all, selection toolbar, delete all work as before   |

## Affected Files

### Source

| File                                              | Change                                                               |
| ------------------------------------------------- | -------------------------------------------------------------------- |
| `src/renderer/src/pages/HistoryPage.tsx`          | Remove `onRowClick` prop; add action column with review button       |
| `src/renderer/src/components/app/EntityTable.tsx` | (Optional) Remove `cursor-pointer` class when `onRowClick` is absent |

### Tests

| File                                          | Test IDs                                | Change                                                                  |
| --------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------- |
| `src/renderer/src/pages/HistoryPage.test.tsx` | "navigates to review page on row click" | Change to click the action button instead of row text                   |
| `e2e/session-history/hand-review.spec.ts`     | E2E-HIST-07, 08, 09, 10, 11             | Change `getByText(groupName).click()` to click the review action button |
| `e2e/session-history/back-navigation.spec.ts` | E2E-HIST-12                             | Change `getByText(groupName).click()` to click the review action button |

### Not affected

| File                                            | Reason                                      |
| ----------------------------------------------- | ------------------------------------------- |
| `e2e/session-history/batch-actions.spec.ts`     | All selection via checkboxes, no row clicks |
| `e2e/session-history/batch-review.spec.ts`      | Uses checkboxes + selection-toolbar buttons |
| `e2e/session-history/list.spec.ts`              | Only checks rendering, no navigation clicks |
| `e2e/session-history/pagination.spec.ts`        | Pagination controls, no row clicks          |
| `e2e/date-period-filter/history-filter.spec.ts` | Filter interaction, no row clicks           |

## Design Decisions

- The action column will use a ghost-style icon button (Lucide `Eye`) with `data-testid="review-session-{id}"` for test targeting
- Button placement: rightmost column, aligned to the right
- Button click handler: `navigate(\`/history/${row.id}${location.search}\`, { state: { search: location.search } })`— same logic as current`onRowClick`
- Tests will target the action button by `data-testid` to avoid ambiguity
- E2E tests using `getByText(groupName).click()` risk also hitting the checkbox row — switching to a dedicated testid eliminates fragility

## Traceability

```
REQ-01 → HistoryPage.tsx (remove onRowClick prop)
REQ-02 → HistoryPage.tsx (add action column)
REQ-03 → HistoryPage.tsx (use same navigate call)
REQ-04 → EntityTable.tsx (verify no onRowClick → no cursor-pointer, no onClick on row)
REQ-05 → All existing selection tests pass unchanged
```
