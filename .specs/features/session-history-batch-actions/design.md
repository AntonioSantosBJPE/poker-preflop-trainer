# Design: Acções em Lote no Histórico de Sessões

**Spec**: `.specs/features/session-history-batch-actions/spec.md`
**Status**: Draft

---

## Architecture Overview

Três novas camadas comunicam via IPC existente:

```
┌─────────────────────────────────────────────────────────────┐
│ Renderer Process                                             │
│                                                              │
│  ┌──────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │  HistoryPage │  │ DeleteSessions   │  │ MultiSession   │ │
│  │  (edit)      │  │ Dialog (novo)    │  │ ReviewPage     │ │
│  │              │  │                  │  │ (novo)         │ │
│  │  selectedIds │  │  preview →       │  │  aggregated    │ │
│  │  ↔ EntityTbl │  │  confirm         │  │  hands + nav   │ │
│  └──────┬───────┘  └────────┬─────────┘  └───────┬────────┘ │
│         │                   │                     │          │
│    ┌────▼───────────────────▼─────────────────────▼────┐     │
│    │               window.api.training                  │     │
│    │  estimateDeleteByIds / deleteByIds / getMulti      │     │
│    └───────────────────────┬────────────────────────────┘     │
└────────────────────────────┼──────────────────────────────────┘
                             │ IPC
┌────────────────────────────┼──────────────────────────────────┐
│ Main Process               │                                   │
│  ┌─────────────────────────▼──────────────────────┐           │
│  │           ipcMain.handle (history.ts)           │           │
│  │  training:estimateDeleteSessionsByIds           │           │
│  │  training:deleteSessionsByIds                   │           │
│  │  training:getMultiSessionDetail                 │           │
│  └─────────────────────────┬──────────────────────┘           │
│                            │                                   │
│  ┌─────────────────────────▼──────────────────────┐           │
│  │           Drizzle ORM + SQLite                   │           │
│  │  training_sessions → session_hands → situations  │           │
│  │  actions → rangeCells                            │           │
│  └──────────────────────────────────────────────────┘           │
└────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision                   | Choice                                                          | Rationale                                                                                                                                                             |
| -------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toast library              | Add `sonner` (shadcn-compatible)                                | Existing `components.json` suggests shadcn ecosystem; sonner is the standard toast for shadcn projects. Lightweight, accessible, no deps conflict.                    |
| Selection state location   | `HistoryPage` (useRef + useState), NOT URL params               | Selection is ephemeral (cleared on filter change). URL params would clutter the URL and add complexity. useRef keeps selection stable across re-renders/page changes. |
| EntityTable selection mode | Props-based (`selectable`, `selectedKeys`, `onSelectionChange`) | Non-breaking: existing usage without `selectable` renders identically. No internal state in EntityTable — controlled by parent.                                       |
| Multi-session data model   | One IPC call returning flattened array + `handSessionMap`       | Simpler than client-side merging of N separate IPC calls. Main process does the heavy lifting (JOIN, sort, enrich). A single round-trip for N sessions.               |
| Delete confirmation        | Reuse `ConfirmActionDialog` + new `DeleteSessionsDialog`        | Follows exact pattern from `ClearStatsDialog`. `DeleteSessionsDialog` replaces `DatePeriodFilter` with a static summary (since IDs are pre-selected).                 |

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component             | Location                                                      | How to Use                                                                           |
| --------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `EntityTable`         | `src/renderer/src/components/app/EntityTable.tsx`             | Add `selectable`, `selectedKeys`, `onSelectionChange` props                          |
| `ConfirmActionDialog` | `src/renderer/src/components/app/ConfirmActionDialog.tsx`     | Reuse for 2nd step of delete flow                                                    |
| `HandReviewCard`      | `src/renderer/src/components/history/HandReviewCard.tsx`      | Direct reuse in multi-session review (identical per-hand display)                    |
| `SessionReviewHeader` | `src/renderer/src/components/history/SessionReviewHeader.tsx` | Adapt for aggregated multi-session header (new component `MultiSessionReviewHeader`) |
| `Checkbox` (Radix)    | `src/renderer/src/components/ui/checkbox.tsx`                 | Table row and header checkboxes                                                      |
| `StatCard`            | `src/renderer/src/components/app/StatCard.tsx`                | Reuse in aggregated header                                                           |
| `Badge`               | `src/renderer/src/components/ui/badge.tsx`                    | Session context badge in multi-review                                                |
| `Skeleton`            | `src/renderer/src/components/ui/skeleton.tsx`                 | Loading states in new pages                                                          |
| `PageHeader`          | `src/renderer/src/components/app/PageHeader.tsx`              | Consistent page headers                                                              |

### Existing Code to Leverage

| Code                           | Location                                                 | How to Use                                                             |
| ------------------------------ | -------------------------------------------------------- | ---------------------------------------------------------------------- |
| `ClearStatsDialog` pattern     | `src/renderer/src/components/stats/ClearStatsDialog.tsx` | Same two-phase dialog pattern but adapted for IDs                      |
| `stats:estimateDeleteSessions` | `src/main/ipc/stats.ts`                                  | Same counting logic but filter by `inArray(ids)` instead of date range |
| `stats:deleteSessions`         | `src/main/ipc/stats.ts`                                  | Same transaction pattern but filter by `inArray(ids)`                  |
| `training:getSessionDetail`    | `src/main/ipc/history.ts`                                | Reuse enrichment logic for multi-session                               |
| `SessionHandReviewPage`        | `src/renderer/src/pages/SessionHandReviewPage.tsx`       | Reference for review page structure                                    |
| `sessionWhereClause`           | `src/main/ipc/stats.ts`                                  | Pattern for building WHERE conditions                                  |

### Integration Points

| System       | Integration Method                                                                      |
| ------------ | --------------------------------------------------------------------------------------- |
| React Router | New route `/history/review-multi` in `App.tsx` alongside existing `/history/:sessionId` |
| Preload API  | Extend `window.api.training` with 3 new methods                                         |
| IPC Registry | New handlers registered inside existing `registerHistoryIpc()` in `history.ts`          |
| DB Schema    | No schema changes — existing `training_sessions` FK cascade handles deletion            |

---

## Components

### 1. EntityTable (modificado)

- **Purpose**: Adicionar modo selecionável com checkbox
- **Location**: `src/renderer/src/components/app/EntityTable.tsx` (edit)
- **New Props**:
  - `selectable?: boolean` (default `false`) — ativa modo seleção
  - `selectedKeys?: Set<number | string>` — keys atualmente selecionadas
  - `onSelectionChange?: (selected: Set<number | string>) => void` — callback quando muda seleção
  - `onSelectionCheckboxClick?: (e: React.MouseEvent) => void` — para evitar propagação do clique
- **Behavior**:
  - Quando `selectable=true`, a primeira coluna é um checkbox em `<TableHead>` e `<TableRow>`
  - Checkbox do header: `checked` quando todas as linhas visíveis estão selecionadas; `indeterminate` quando algumas
  - Clique no checkbox da linha: `e.stopPropagation()` para não disparar `onRowClick`
  - Linha selecionada: classe `data-[state=selected]:bg-muted` (já existe no componente `TableRow` do shadcn)
  - `emptyState` com `selectable=true`: checkbox do header oculto (colSpan ajustado)
- **Existing behavior preserved**: `selectable` default `false` → renderização exatamente igual à atual

### 2. HistoryPage (modificado)

- **Purpose**: Integrar seleção, barra de ações, diálogo de remoção, navegação para revisão múltipla
- **Location**: `src/renderer/src/pages/HistoryPage.tsx` (edit)
- **New State**:
  - `selectedIds: Set<number>` — acumulativo entre páginas (useRef para persistência)
  - `selectionVersion: number` — incrementa quando filtros mudam → limpa `selectedIds`
  - `deleteDialogOpen: boolean`
- **Key Logic**:
  - `handleSelectionChange(newSelected)` — merge/unmerge com `selectedIds` atual
  - `handleFilterChange` — limpa `selectedIds` e incrementa `selectionVersion`
  - `handleDeleteComplete` — recarrega dados (`setLoading(true)` + re-fetch), limpa seleção
  - `handleReviewMultiple` — se 1 sessão, navega para `history/:id`; se >1, navega para `history/review-multi?ids=...`
- **Barra de Ações**: surge entre `FilterToolbar` e `EntityTable` quando `selectedIds.size > 0`

### 3. SelectionToolbar (novo)

- **Purpose**: Barra contextual de ações em lote
- **Location**: `src/renderer/src/components/history/SelectionToolbar.tsx`
- **Props**:

```typescript
interface SelectionToolbarProps {
  selectedCount: number;
  onRemove: () => void;
  onReviewMultiple: () => void;
  onClearSelection: () => void;
}
```

- **UI**: Sticky bar com `bg-card border border-border rounded-lg p-3 flex items-center gap-3`
  - `{selectedCount} sessões selecionadas` (texto à esquerda)
  - Botões à direita: [Revisão múltipla] [Remover sessões] [Limpar seleção]
- **Responsividade**: `flex-wrap` para ecrãs pequenos; botões colapsam para baixo do texto

### 4. DeleteSessionsDialog (novo)

- **Purpose**: Diálogo de dupla confirmação para remover sessões específicas
- **Location**: `src/renderer/src/components/history/DeleteSessionsDialog.tsx`
- **Props**:

```typescript
interface DeleteSessionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionIds: number[];
  onComplete: () => void;
}
```

- **Structure** (following `ClearStatsDialog` pattern):
  - **1º diálogo** (`Dialog`): mostra "Remover sessões", botão "Remover" (apenas se preview > 0)
  - **2º diálogo** (`ConfirmActionDialog`): "Tem a certeza?" + "Sim, remover permanentemente"
- **State**: `estimate` (carregado via IPC ao abrir), `deleting`, `error`
- **On open**: chama `window.api.training.estimateDeleteSessionsByIds({ ids: sessionIds })`
- **Preview text**: "X sessões e Y mãos serão removidas permanentemente."
- **On confirm**: chama `window.api.training.deleteSessionsByIds({ ids: sessionIds })`
- **On success**: fecha diálogos, chama `onComplete()`
- **On error**: exibe erro no 2º diálogo

### 5. MultiSessionReviewPage (nova página)

- **Purpose**: Revisão agregada de múltiplas sessões num fluxo único
- **Location**: `src/renderer/src/pages/MultiSessionReviewPage.tsx`
- **Route**: `/history/review-multi?ids=1,2,3`
- **State**:
  - `detail: MultiSessionDetailDto | null`
  - `currentHandIndex: number`
  - `loading: boolean`
  - `error: string | null`
- **Data Loading**:
  - Lê `ids` de `searchParams`
  - Se `ids` vazio → erro "Nenhuma sessão selecionada" + link voltar
  - Se 1 ID → redireciona para `/history/:id`
  - Chama `window.api.training.getMultiSessionDetail({ ids })`
- **UI**:
  - `PageHeader` com título "Revisão Múltipla" + botão "Voltar ao histórico"
  - `MultiSessionReviewHeader` (agregado)
  - `HandReviewCard` reutilizado, com badge extra "Sessão N: dd/mm"
  - Navegação anterior/próxima idêntica à `SessionHandReviewPage`
- **Edge Cases**: sessão removida entre seleção e carregamento → omitir com aviso

### 6. MultiSessionReviewHeader (novo)

- **Purpose**: Cabeçalho agregado com data range, total de mãos, accuracy, duração total
- **Location**: `src/renderer/src/components/history/MultiSessionReviewHeader.tsx`
- **Props**:

```typescript
interface MultiSessionReviewHeaderProps {
  sessions: SessionHistoryItemDto[];
  totalHands: number;
  accuracy: number;
  totalDurationMs: number | null;
}
```

- **UI**: grid de `StatCard` (reutilizado):
  - "Período": data da 1ª sessão → data da última
  - "Sessões": N
  - "Acerto total": accuracy%
  - "Duração total": soma das durações
  - "Mãos": N total

### 7. Toast (novo — sonner)

- **Purpose**: Feedback de sucesso após operações
- **Location**: `src/renderer/src/components/ui/sonner.tsx` (standard shadcn sonner)
- **Usage**: `import { toast } from 'sonner'` → `toast.success('X sessões removidas')`
- **Integration**: `<Toaster />` no `App.tsx` (junto ao `<BrowserRouter>`)

---

## Data Models

### MultiSessionDetailDto

```typescript
// Em src/shared/ipc/types.ts
export type MultiSessionDetailDto = {
  sessions: SessionHistoryItemDto[]; // todas as sessões (para cabeçalho agregado)
  hands: SessionHandDetailDto[]; // flatten: todas as mãos, ordenadas por session.startedAt, depois handIndex
  handSessionMap: { sessionIndex: number; sessionId: number }[]; // handSessionMap[i] = { sessionIndex, sessionId } da mão i
  situationActionsMap: Record<number, SessionDetailDto['situationActionsMap'][number]>;
};
```

### DeleteSessionsInput

```typescript
// Em src/shared/ipc/types.ts
export type DeleteSessionsInput = {
  ids: number[];
};
```

### EntityTable Props (modificado)

```typescript
// Em src/renderer/src/components/app/EntityTable.tsx
export interface EntityTableProps<T> {
  rows: T[];
  columns: EntityTableColumn<T>[];
  getRowKey: (row: T) => number | string;
  onRowClick?: (row: T) => void;
  rowTestId?: (row: T) => string;
  emptyState?: React.ReactNode;
  tableTestId?: string;
  // novos:
  selectable?: boolean;
  selectedKeys?: Set<number | string>;
  onSelectionChange?: (selected: Set<number | string>) => void;
}
```

---

## IPC Contracts

### `training:estimateDeleteSessionsByIds`

```
→ { ids: number[] }
← { sessionCount: number, handCount: number }
```

- Valida `ids` com array não vazio
- Conta sessões do user autenticado com `id IN ids`
- Conta mãos dessas sessões

### `training:deleteSessionsByIds`

```
→ { ids: number[] }
← { sessionCount: number, handCount: number }
```

- Valida `ids` com array não vazio
- Executa em `db.transaction()`:
  1. Verifica se sessões existem (pelo menos 1)
  2. `DELETE FROM training_sessions WHERE id IN ids AND userId = ?`
  3. Cascade FK apaga `session_hands`
- Se nenhuma sessão encontrada → erro `'Nenhuma sessão encontrada'`
- Se algumas sessões não existem → apaga as que existem e retorna contagem real

### `training:getMultiSessionDetail`

```
→ { ids: number[] }
← MultiSessionDetailDto
```

- Valida `ids` com array não vazio
- Fetch das sessões por `id IN ids` (filtradas por userId)
- Fetch de todas `session_hands` para essas sessões, ordenadas por `session.startedAt`, depois `handIndex`
- Enriquecimento idêntico a `training:getSessionDetail` (JOIN situations, actions, rangeCells, evaluateTrainingAnswer)
- Se alguma sessão não existe ou foi removida → omitir da resposta + incluir campo `omittedIds: number[]` no DTO

### Required Preload Additions

```typescript
// Em src/preload/index.ts, dentro de `api.training`
export const api = {
  training: {
    // ... existing methods
    estimateDeleteSessionsByIds: (payload: { ids: number[] }) =>
      ipcRenderer.invoke('training:estimateDeleteSessionsByIds', payload),
    deleteSessionsByIds: (payload: { ids: number[] }) =>
      ipcRenderer.invoke('training:deleteSessionsByIds', payload),
    getMultiSessionDetail: (payload: { ids: number[] }) =>
      ipcRenderer.invoke('training:getMultiSessionDetail', payload),
  },
};
```

---

## Routing

### App.tsx — Nova Rota

```tsx
<Route path="history/review-multi" element={<MultiSessionReviewPage />} />
```

**IMPORTANTE**: A rota `/history/review-multi` deve ser declarada **ANTES** de `/history/:sessionId` para evitar que `review-multi` seja interpretado como `:sessionId`.

Ordem correcta:

```tsx
<Route path="history" element={<HistoryPage />} />
<Route path="history/review-multi" element={<MultiSessionReviewPage />} />   {/* nova */}
<Route path="history/:sessionId" element={<SessionHandReviewPage />} />
```

---

## Selection State Management

### Fluxo de seleção entre páginas

```
HistoryPage
  │
  ├── selectedIds: Set<number> (useRef — preserva entre renders)
  │
  ├── handleSelectionChange(changedKey, checked):
  │     const next = new Set(selectedRef.current)
  │     if (checked) next.add(changedKey)
  │     else next.delete(changedKey)
  │     selectedRef.current = next
  │     setRenderTick(t => t + 1)  // força re-render para EntityTable
  │
  ├── handleSelectAll(checked, currentRows):
  │     const next = new Set(selectedRef.current)
  │     for (const row of currentRows) {
  │       if (checked) next.add(getRowKey(row))
  │       else next.delete(getRowKey(row))
  │     }
  │     selectedRef.current = next
  │     setRenderTick(...)
  │
  ├── selectionVersion (useState):
  │     incremented when filter changes → triggers useEffect que limpa selectedRef
  │
  ├── useEffect([page]):
  │     // selectedRef NÃO é limpo — preserva seleção entre páginas
  │
  └── useEffect([groupId, sessionType, fromTs, toTs]):
        // selectedRef.current = new Set() — limpa quando filtros mudam
```

### EntityTable — checked state calculation

```typescript
// Dentro de EntityTable, para select-all:
const allVisibleSelected = rows.length > 0 && rows.every((r) => selectedKeys?.has(getRowKey(r)));
const someVisibleSelected = rows.some((r) => selectedKeys?.has(getRowKey(r)));
```

---

## Error Handling Strategy

| Error Scenario                                            | Handling                                       | User Impact                                                                             |
| --------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| `deleteSessionsByIds` com IDs inexistentes                | IPC retorna erro `'Nenhuma sessão encontrada'` | Diálogo exibe mensagem de erro, sem alterações                                          |
| `getMultiSessionDetail` com IDs mistos (alguns deletados) | IPC retorna `omittedIds` + dados dos restantes | Página exibe aviso: "X sessões foram removidas e não estão disponíveis"                 |
| `review-multi` acedido sem `ids`                          | Página valida e exibe erro + link voltar       | Mensagem "Nenhuma sessão selecionada"                                                   |
| Seleção de 1 sessão → clica "Revisão múltipla"            | HistoryPage redireciona para `/history/:id`    | Utilizador vai para revisão normal (sem saber que "revisão múltipla" foi redirecionada) |
| Falha de rede/BD nos handlers                             | Erro propagado com mensagem clara              | Diálogo/ecrã de erro com possibilidade de voltar                                        |

---

## File Change Map

### New Files

| File                                                               | Purpose                                  |
| ------------------------------------------------------------------ | ---------------------------------------- |
| `src/renderer/src/components/history/SelectionToolbar.tsx`         | Barra de ações em lote                   |
| `src/renderer/src/components/history/DeleteSessionsDialog.tsx`     | Diálogo de remoção (dupla confirmação)   |
| `src/renderer/src/components/history/MultiSessionReviewHeader.tsx` | Cabeçalho agregado para revisão múltipla |
| `src/renderer/src/pages/MultiSessionReviewPage.tsx`                | Página de revisão múltipla               |
| `src/renderer/src/components/ui/sonner.tsx`                        | Componente Toaster (shadcn sonner)       |

### Modified Files

| File                                                   | Changes                                                                             |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `src/shared/ipc/types.ts`                              | Add `MultiSessionDetailDto`, `DeleteSessionsInput`, update `EntityTableProps` types |
| `src/shared/forms/trainingSchemas.ts`                  | Add `deleteSessionsByIdsSchema`, `multiSessionDetailSchema`                         |
| `src/preload/index.ts`                                 | Add 3 new methods to `api.training`                                                 |
| `src/main/ipc/history.ts`                              | Add 3 new IPC handlers                                                              |
| `src/main/ipc/history.test.ts`                         | Tests for new handlers                                                              |
| `src/renderer/src/components/app/EntityTable.tsx`      | Add selectable props + checkbox column                                              |
| `src/renderer/src/components/app/EntityTable.test.tsx` | Tests for new selection behavior                                                    |
| `src/renderer/src/pages/HistoryPage.tsx`               | Add selection state, SelectionToolbar, DeleteSessionsDialog, batch action handlers  |
| `src/renderer/src/pages/HistoryPage.test.tsx`          | Tests for selection + batch actions                                                 |
| `src/renderer/src/App.tsx`                             | Add route `/history/review-multi` (before `/history/:sessionId`)                    |

### E2E Files

| File                                        | Changes                |
| ------------------------------------------- | ---------------------- |
| `e2e/session-history/batch-actions.spec.ts` | New — 8 test scenarios |
| `e2e/session-history/batch-review.spec.ts`  | New — 2 test scenarios |

---

## Implementation Order

```
Phase 0 (Foundation, Parallel):
  T1 [P] — Shared types + Zod schemas
  T2 [P] — Preload API additions
  T3 [P] — Sonner toast component + Toaster in App.tsx

Phase 1 (Backend):
  T4 — IPC handlers (estimateDelete, delete, getMultiSession) + tests

Phase 2 (Renderer Components):
  T5 [P] — EntityTable: selectable mode + tests
  T6 [P] — SelectionToolbar (new)
  T7 [P] — DeleteSessionsDialog (new)
  T8 [P] — MultiSessionReviewHeader (new)

Phase 3 (Pages, Sequential):
  T9 — HistoryPage: selection + toolbar + delete integration + tests
  T10 — MultiSessionReviewPage + route + tests

Phase 4 (E2E):
  T11 — batch-actions.spec.ts
  T12 — batch-review.spec.ts
```

---

## Verification Criteria

| Check                            | How to Verify                                                     |
| -------------------------------- | ----------------------------------------------------------------- |
| `EntityTable` sem `selectable`   | Renderização idêntica antes/depois — comparar snapshot            |
| `EntityTable` com `selectable`   | Checkbox por linha + select-all funcional                         |
| Seleção preservada entre páginas | Marcar 3 na página 1, ir para página 2, voltar — 3 ainda marcadas |
| Filtro limpa seleção             | Mudar grupo → seleção limpa                                       |
| Delete completo                  | Dupla confirmação → toast → lista recarregada sem as sessões      |
| Multi-review                     | Mãos de sessão A seguidas de sessão B, navegação funcional        |
| 1 sessão → redirect              | Selecionar 1 → Revisão múltipla → vai para `/history/:id`         |
| `pnpm typecheck`                 | Passa                                                             |
| `pnpm test:unit`                 | Passa                                                             |
| `pnpm test:e2e` (E2E local)      | Passa                                                             |
