# Session History Batch Actions — Tasks

**Design**: `.specs/features/session-history-batch-actions/design.md`
**Status**: Draft

---

## Convenções

- `[P]` = pode executar em paralelo no mesmo bloco
- Cada task tem gate explícito
- Testes co-localizados com implementação
- Se houver divergência relevante de spec/design: marcar `SPEC_DEVIATION`

---

## Execution Plan

### Phase 0: Foundation (Parallel)

```
T1 ────→ T5
T2 ────→ T5
T3 ────→ T10, T11
T4 ────→ T10, T11
```

### Phase 1: Backend (Sequential)

```
T5 ──→ Phase 2
```

### Phase 2: Renderer Components (Parallel)

```
      ┌→ T6 [P] ──→ T10
      │
T5 ───┼→ T7 [P] ──→ T10
      │
      └→ T8 [P] ──→ T10
      │
      └→ T9 [P] ──→ T11
```

### Phase 3: Pages (Parallel)

```
       ┌→ T10 [P]
T6,T7,T8,T3,T4 ──→ T10
       └→ T11 [P]
T9,T3,T4 ────→ T11
```

### Phase 4: E2E (Sequential)

```
T10 → T12
T11 → T13
```

---

## Task Breakdown

### T1: Shared types — MultiSessionDetailDto + DeleteSessionsInput

**What:** Adicionar `MultiSessionDetailDto`, `DeleteSessionsInput`, `DeleteSessionsByIdsInput` e atualizar `EntityTableProps` (interface apenas).

**Where:** `src/shared/ipc/types.ts` (edit)

**Depends on:** None

**Reuses:** Padrão `SessionDetailDto`, `SessionHandDetailDto`, `DeleteEstimateDto` existentes.

**Requirements:** BATCH-DEL-02, BATCH-DEL-04, BATCH-REV-02

**Done when:**

- [ ] `MultiSessionDetailDto` definido: `{ sessions, hands, handSessionMap, situationActionsMap, omittedIds? }`
- [ ] `DeleteSessionsByIdsInput` definido: `{ ids: number[] }`
- [ ] `EntityTableProps` atualizado com `selectable`, `selectedKeys`, `onSelectionChange` opcionais
- [ ] `pnpm typecheck` passa

**Tests:** none (types only)
**Gate:** `pnpm typecheck`

---

### T2: Zod schemas — validação de inputs dos novos IPC handlers

**What:** Adicionar `deleteSessionsByIdsSchema`, `multiSessionDetailSchema` e respectivos parsers.

**Where:** `src/shared/forms/trainingSchemas.ts` (edit)

**Depends on:** None (usa tipos primitivos `number[]`)

**Reuses:** Padrão `sessionHistoryFiltersSchema`, `parseSessionHistoryFilters` existentes.

**Requirements:** BATCH-DEL-02, BATCH-DEL-04, BATCH-REV-02

**Done when:**

- [ ] `deleteSessionsByIdsSchema`: valida `{ ids: z.array(z.number().int().positive()).nonempty() }`
- [ ] `multiSessionDetailSchema`: valida `{ ids: z.array(z.number().int().positive()).nonempty() }`
- [ ] `parseDeleteSessionsByIds(raw)` e `parseMultiSessionDetail(raw)` exportados
- [ ] `pnpm typecheck` passa

**Tests:** none (validado via tests dos handlers — T5)
**Gate:** `pnpm typecheck`

---

### T3: Preload API — 3 novos métodos em `window.api.training`

**What:** Adicionar `estimateDeleteSessionsByIds`, `deleteSessionsByIds`, `getMultiSessionDetail` ao namespace `training` no preload.

**Where:** `src/preload/index.ts` (edit)

**Depends on:** None (usa `unknown` para payloads, como os restantes métodos)

**Reuses:** Padrão `ipcRenderer.invoke` dos métodos existentes em `window.api.training`.

**Requirements:** BATCH-DEL-02, BATCH-DEL-04, BATCH-REV-02

**Done when:**

- [ ] `window.api.training.estimateDeleteSessionsByIds(payload)` invoca `'training:estimateDeleteSessionsByIds'`
- [ ] `window.api.training.deleteSessionsByIds(payload)` invoca `'training:deleteSessionsByIds'`
- [ ] `window.api.training.getMultiSessionDetail(payload)` invoca `'training:getMultiSessionDetail'`
- [ ] `pnpm typecheck` passa

**Tests:** none (preload é `contextBridge`, não testado unitariamente no projecto)
**Gate:** `pnpm typecheck`

---

### T4: Sonner toast — setup do componente de notificação

**What:** Adicionar `sonner` como dependência, criar componente `Toaster` e integrar no `App.tsx`.

**Where:**

- `package.json` (adicionar `sonner`)
- `src/renderer/src/components/ui/sonner.tsx` (novo — copiar de shadcn/ui)
- `src/renderer/src/App.tsx` (adicionar `<Toaster />`)

**Depends on:** None

**Reuses:** Padrão shadcn existente no projecto; outras apps shadcn usam sonner como toast standard.

**Requirements:** BATCH-DEL-05

**Done when:**

- [ ] `sonner` instalado (`pnpm add sonner`)
- [ ] `src/renderer/src/components/ui/sonner.tsx` com o componente `Toaster` exportado
- [ ] `<Toaster richColors />` adicionado ao `App.tsx`
- [ ] `pnpm typecheck` passa

**Tests:** none (componente shadcn standard, sem lógica customizada)
**Gate:** `pnpm typecheck`

---

### T5: IPC handlers — estimateDeleteSessionsByIds + deleteSessionsByIds + getMultiSessionDetail

**What:** Implementar 3 novos handlers IPC no ficheiro `history.ts`:

- `training:estimateDeleteSessionsByIds` — conta sessões + mãos para IDs específicos (sem apagar)
- `training:deleteSessionsByIds` — apaga sessões + mãos em transacção
- `training:getMultiSessionDetail` — retorna dados agregados de múltiplas sessões

**Where:** `src/main/ipc/history.ts` (edit)
**Tests:** `src/main/ipc/history.test.ts` (edit)

**Depends on:** T1 (tipos), T2 (schemas)

**Reuses:**

- `requireUserId()`, `getDb()`, `parseDeletePeriod` — padrões existentes
- Lógica de enriquecimento de `training:getSessionDetail` (JOIN situations, actions, rangeCells, `evaluateTrainingAnswer`, `handToGridCell`)
- Padrão de transacção de `stats:deleteSessions`

**Requirements:** BATCH-DEL-02, BATCH-DEL-04, BATCH-REV-02

**Done when:**

**`training:estimateDeleteSessionsByIds`:**

- Com `ids` vazio → erro de validação
- Com IDs válidos → retorna `{ sessionCount, handCount }` apenas para sessões do user autenticado
- Com IDs que não existem → retorna `{ sessionCount: 0, handCount: 0 }`

**`training:deleteSessionsByIds`:**

- Com `ids` vazio → erro de validação
- Com IDs sem sessões → erro `'Nenhuma sessão encontrada'`
- Com IDs válidos → apaga em transacção (`DELETE FROM training_sessions WHERE id IN ids AND userId = ?`), cascade FK para `session_hands`
- Retorna `{ sessionCount, handCount }` com contagens do que foi apagado
- Sessões de outros users não são afectadas

**`training:getMultiSessionDetail`:**

- Com `ids` vazio → erro de validação
- Fetch de sessões por `id IN ids AND userId = ?`
- Fetch de `session_hands` ordenado por `session.startedAt ASC`, depois `handIndex ASC`
- Enriquecimento idêntico a `getSessionDetail` (JOIN situations, actions, rangeCells, `evaluateTrainingAnswer`)
- Se alguma sessão não existe → inclui `omittedIds` na resposta
- Retorna `MultiSessionDetailDto` com `handSessionMap`

**Testes unitários** (em `history.test.ts`):

- `estimateDeleteSessionsByIds`: com IDs válidos → contagens correctas
- `estimateDeleteSessionsByIds`: com IDs inexistentes → `{ sessionCount: 0, handCount: 0 }`
- `deleteSessionsByIds`: com IDs válidos → apaga e retorna contagens
- `deleteSessionsByIds`: sem sessões → erro
- `getMultiSessionDetail`: retorna dados agregados com hands flatten
- `getMultiSessionDetail`: com sessão removida → `omittedIds` populado
- Todos os handlers chamam `requireUserId()` e validam input

**Tests:** unit
**Gate:** `pnpm typecheck` + `pnpm test:unit src/main/ipc/history.test.ts`

---

### T6: EntityTable — modo selecionável [P]

**What:** Adicionar props `selectable`, `selectedKeys`, `onSelectionChange` ao `EntityTable`. Quando `selectable=true`, renderiza checkbox na primeira coluna do header e de cada linha. Select-all no header. Clique no checkbox não propaga `onRowClick`.

**Where:** `src/renderer/src/components/app/EntityTable.tsx` (edit)
**Tests:** `src/renderer/src/components/app/EntityTable.test.tsx` (novo)

**Depends on:** T1 (tipos `EntityTableProps`)

**Reuses:**

- `Checkbox` de `@/components/ui/checkbox`
- Classes CSS existentes no `TableRow`: `data-[state=selected]:bg-muted`
- Classes CSS no `TableHead`/`TableCell`: `[&:has([role=checkbox])]:pr-0`

**Requirements:** BATCH-SEL-01, BATCH-SEL-02, BATCH-SEL-04, BATCH-SEL-08

**Done when:**

**Props adicionadas:**

```typescript
selectable?: boolean;                                             // default false
selectedKeys?: Set<number | string>;
onSelectionChange?: (selected: Set<number | string>) => void;
```

**Comportamento com `selectable=true`:**

- Primeira coluna (antes das definidas pelo utilizador) é um checkbox
- Header: checkbox com `checked` (todas selecionadas), `indeterminate` (algumas), ou vazio (nenhuma)
- Cada linha: checkbox com `checked={selectedKeys?.has(getRowKey(row))}`
- Clique no checkbox: `e.stopPropagation()` — não dispara `onRowClick`
- Linha selecionada: `data-state="selected"` no `TableRow` (usa classe existente `data-[state=selected]:bg-muted`)
- Select-all no header: chama `onSelectionChange` com todas as keys das linhas visíveis
- Empty state com `selectable=true`: checkbox do header oculto, colSpan ajustado

**Comportamento com `selectable=false` (default):**

- Renderização identical à actual — zero alterações visuais

**Testes unitários:**

- Renderiza checkboxes quando `selectable=true`
- Select-all seleciona todas as linhas visíveis
- Select-all com algumas já selecionadas → indeterminate state
- Clique no checkbox não propaga `onRowClick`
- `selectable=false` não renderiza checkboxes
- Empty state com `selectable=true` oculta checkbox do header

**Tests:** unit
**Gate:** `pnpm typecheck` + `pnpm test:unit src/renderer/src/components/app/EntityTable.test.tsx`

---

### T7: SelectionToolbar — barra de ações em lote [P]

**What:** Criar componente `SelectionToolbar` com contagem de sessões selecionadas e botões de acção (Remover, Revisão múltipla, Limpar).

**Where:** `src/renderer/src/components/history/SelectionToolbar.tsx` (novo)
**Tests:** `src/renderer/src/components/history/SelectionToolbar.test.tsx` (novo)

**Depends on:** None (componente puramente visual)

**Reuses:** `Button` de `@/components/ui/button`

**Requirements:** BATCH-TOOL-01, BATCH-TOOL-02, BATCH-TOOL-03, BATCH-TOOL-04, BATCH-TOOL-05

**Done when:**

**Props:**

```typescript
interface SelectionToolbarProps {
  selectedCount: number;
  onRemove: () => void;
  onReviewMultiple: () => void;
  onClearSelection: () => void;
}
```

**UI:**

- Barra com `bg-card border border-border rounded-lg p-3`
- Texto: `{selectedCount} sessões selecionadas`
- 3 botões: "Revisão múltipla" (primary), "Remover sessões" (destructive), "Limpar seleção" (outline)
- `flex flex-wrap items-center justify-between gap-3`

**Testes unitários:**

- Renderiza contagem correcta (1, 3, "100")
- Botão "Remover" está presente com estilo destructive
- Botão "Revisão múltipla" está presente
- Botão "Limpar seleção" está presente
- `onRemove` chamado ao clicar "Remover"
- `onClearSelection` chamado ao clicar "Limpar"

**Tests:** unit
**Gate:** `pnpm typecheck` + `pnpm test:unit src/renderer/src/components/history/SelectionToolbar.test.tsx`

---

### T8: DeleteSessionsDialog — diálogo de remoção com dupla confirmação [P]

**What:** Criar componente `DeleteSessionsDialog` que segue o padrão de `ClearStatsDialog` (preview → ConfirmationDialog), mas para IDs de sessão em vez de período.

**Where:** `src/renderer/src/components/history/DeleteSessionsDialog.tsx` (novo)
**Tests:** `src/renderer/src/components/history/DeleteSessionsDialog.test.tsx` (novo)

**Depends on:** T3 (preload — `window.api.training.estimateDeleteSessionsByIds`, `deleteSessionsByIds`)

**Reuses:**

- `ConfirmActionDialog` de `@/components/app`
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` de `@/components/ui/dialog`
- `Button` de `@/components/ui/button`
- Padrão `ClearStatsDialog` (estado, fluxo, loading states)

**Requirements:** BATCH-DEL-01, BATCH-DEL-02, BATCH-DEL-03, BATCH-DEL-04, BATCH-DEL-05

**Done when:**

**Props:**

```typescript
interface DeleteSessionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionIds: number[];
  onComplete: () => void;
}
```

**Estado interno:**

- `estimate`, `estimating`, `confirmOpen`, `deleting`, `error`

**1º diálogo (preview):**

- Título: "Remover sessões"
- Ao abrir, chama `estimateDeleteSessionsByIds({ ids: sessionIds })`
- Durante estimativa: loading state
- Preview: "X sessões e Y mãos serão removidas permanentemente."
- Se 0 sessões: "Nenhuma sessão encontrada." + botão Remover desabilitado
- Botão "Remover" (destructive) habilitado apenas se `estimate.sessionCount > 0`
- Botão "Cancelar" fecha o diálogo

**2º diálogo (confirm):**

- Usa `ConfirmActionDialog` com texto específico
- Botão confirm: "Sim, remover permanentemente" com destructive styling
- Durante delecção: botão mostra "Removendo..." e fica desabilitado
- Sucesso: `onComplete()`
- Erro: exibe mensagem no diálogo

**Testes unitários:**

- Renderiza preview com contagens ao abrir
- Botão "Remover" desabilitado quando `estimate.sessionCount === 0`
- `onComplete` chamado após delecção bem-sucedida
- Fluxo de cancelamento
- Loading state durante estimativa

**Tests:** unit
**Gate:** `pnpm typecheck` + `pnpm test:unit src/renderer/src/components/history/DeleteSessionsDialog.test.tsx`

---

### T9: MultiSessionReviewHeader — cabeçalho agregado [P]

**What:** Criar componente `MultiSessionReviewHeader` que exibe dados agregados de múltiplas sessões (data range, total sessões, accuracy, duração, mãos).

**Where:** `src/renderer/src/components/history/MultiSessionReviewHeader.tsx` (novo)
**Tests:** `src/renderer/src/components/history/MultiSessionReviewHeader.test.tsx` (novo)

**Depends on:** None (componente puramente visual, recebe dados por props)

**Reuses:** `StatCard` de `@/components/app`

**Requirements:** BATCH-REV-03

**Done when:**

**Props:**

```typescript
interface MultiSessionReviewHeaderProps {
  sessions: SessionHistoryItemDto[];
  totalHands: number;
  accuracy: number;
  totalDurationMs: number | null;
}
```

**UI:**

- Grid de `StatCard` (reutilizado):
  - "Período": `minDate — maxDate` formatado pt-BR
  - "Sessões": N
  - "Acerto": X%
  - "Duração total": formatada via `formatDuration`
  - "Mãos": N

**Testes unitários:**

- Renderiza data range correcto com 2 sessões
- Renderiza accuracy formatada
- Renderiza duração total
- Duração `null` mostra "—"

**Tests:** unit
**Gate:** `pnpm typecheck` + `pnpm test:unit src/renderer/src/components/history/MultiSessionReviewHeader.test.tsx`

---

### T10: HistoryPage — integração de seleção, toolbar, delete e navegação múltipla

**What:** Modificar `HistoryPage` para:

1. Estado de seleção (`selectedIds: Set<number>`) que cruza páginas
2. `SelectionToolbar` visível quando `selectedIds.size > 0`
3. `DeleteSessionsDialog` integrado
4. Botão "Revisão múltipla" navega para `/history/review-multi?ids=...` (ou `/history/:id` se 1 sessão)
5. Seleção limpa ao mudar filtros
6. Clique no checkbox não navega

**Where:** `src/renderer/src/pages/HistoryPage.tsx` (edit)
**Tests:** `src/renderer/src/pages/HistoryPage.test.tsx` (edit)

**Depends on:** T3 (preload), T4 (sonner toast), T6 (EntityTable selectable), T7 (SelectionToolbar), T8 (DeleteSessionsDialog)

**Reuses:**

- Padrão de filtros existente (URL search params)
- `useRef` para `selectedIds` (preserva entre renders/páginas)
- `toast.success()` de `sonner` (via T4)

**Requirements:** BATCH-SEL-05, BATCH-SEL-06, BATCH-TOOL-01, BATCH-TOOL-02, BATCH-TOOL-03, BATCH-TOOL-04, BATCH-TOOL-05, BATCH-DEL-05, BATCH-REV-06

**Done when:**

**Estado:**

- `selectedRef = useRef<Set<number>>(new Set())` — preserva entre re-renders
- `renderTick` state — força re-render da EntityTable quando `selectedRef` muda
- `selectionVersionRef = useRef(0)` — incrementa quando filtros mudam → limpa `selectedRef`
- `deleteDialogOpen` — controla `DeleteSessionsDialog`

**Comportamento:**

- `handleSelectionChange` — merge/unmerge com `selectedRef.current`
- `useEffect` vigia `[groupId, sessionType, fromTs, toTs]` → limpa `selectedRef.current` quando mudam
- `handleDeleteComplete` — recarrega data (re-fetch), limpa seleção, `toast.success()`
- `handleReviewMultiple` — se 1 sessão: `navigate(/history/${id})`; se >1: `navigate(/history/review-multi?ids=...)`
- `EntityTable` com `selectable={true}`, `selectedKeys`, `onSelectionChange`
- `SelectionToolbar` condicional entre `FilterToolbar` e `EntityTable`
- `DeleteSessionsDialog` com `sessionIds={Array.from(selectedRef.current)}`

**Testes unitários (atualizar `HistoryPage.test.tsx`):**

- Checkbox presente na tabela com `selectable` activo
- Marcar checkbox → `selectedRef` actualizado
- Select-all → todas as linhas selecionadas
- Mudar filtro → seleção limpa
- "Revisão múltipla" com 1 sessão → navega para `/history/:id`
- "Revisão múltipla" com >1 sessão → navega para `/history/review-multi?ids=...`
- Barra de ações visível quando seleção > 0
- Barra de ações oculta quando seleção === 0
- `DeleteSessionsDialog` integrado

**Tests:** unit
**Gate:** `pnpm typecheck` + `pnpm test:unit src/renderer/src/pages/HistoryPage.test.tsx`

---

### T11: MultiSessionReviewPage — página de revisão múltipla [P]

**What:** Criar página `MultiSessionReviewPage` que:

- Lê `ids` dos query params
- Chama `training:getMultiSessionDetail`
- Se 1 sessão: redireciona para `/history/:id`
- Exibe cabeçalho agregado + `HandReviewCard` navegável
- Indicador visual "Sessão N: dd/mm"

**Where:**

- `src/renderer/src/pages/MultiSessionReviewPage.tsx` (novo)
- `src/renderer/src/pages/MultiSessionReviewPage.test.tsx` (novo)
- `src/renderer/src/App.tsx` (adicionar rota)

**Depends on:** T3 (preload), T4 (sonner), T9 (MultiSessionReviewHeader)

**Reuses:**

- `HandReviewCard` de `@/components/history/HandReviewCard`
- `PageHeader`, `Button`, `Skeleton` de componentes existentes
- Padrão de loading/error de `SessionHandReviewPage`

**Requirements:** BATCH-REV-01, BATCH-REV-02, BATCH-REV-03, BATCH-REV-04, BATCH-REV-05, BATCH-REV-06, BATCH-NAV-01, BATCH-NAV-02

**Done when:**

**Rota em App.tsx:**

```tsx
<Route path="history/review-multi" element={<MultiSessionReviewPage />} />
```

**IMPORTANTE**: Declarada ANTES de `/history/:sessionId`.

**Página:**

- Lê `ids` de `searchParams`: `?ids=1,2,3`
- Se `ids` vazio → erro "Nenhuma sessão selecionada" + "Voltar ao histórico"
- Se 1 ID → `navigate(/history/${ids[0]})` (replace)
- Loading: skeletons
- Erro: mensagem + link voltar
- Dados carregados:
  - `PageHeader` com título "Revisão Múltipla"
  - Botão "Voltar ao histórico" com `location.state.search` preservado
  - `MultiSessionReviewHeader` com dados agregados
  - `HandReviewCard` reutilizado, com badge "Sessão X: dd/mm"
  - Navegação anterior/próxima com boundary locking
  - `currentHandIndex` state

**Indicador de sessão no card:**

- Dentro do wrapper do `HandReviewCard`, exibir badge: "Sessão N — dd/mm"
- Usar `handSessionMap[currentHandIndex]` para obter `sessionIndex`
- Obter data da sessão via `sessions[sessionIndex].startedAt`

**Testes unitários:**

- Sem `ids` → mensagem de erro + link voltar
- 1 ID → navega para `/history/:id`
- Loading state → skeletons visíveis
- Dados carregados → `MultiSessionReviewHeader` presente
- Dados carregados → `HandReviewCard` presente
- Navegação entre mãos com boundary locking
- Indicador de sessão correcto

**Tests:** unit
**Gate:** `pnpm typecheck` + `pnpm test:unit src/renderer/src/pages/MultiSessionReviewPage.test.tsx`

---

### T12: E2E — batch-actions.spec.ts

**What:** Adicionar testes E2E para o fluxo de seleção múltipla, barra de ações, e remoção em lote.

**Where:** `e2e/session-history/batch-actions.spec.ts` (novo)

**Depends on:** T10 (HistoryPage implementado)

**Reuses:**

- `registerAccount` de `./helpers/auth`
- `uniqueGroupName`, `uniqueSituationName`, `uniqueUserCredentials` de `./helpers/credentials`
- `createGroup` de `./helpers/group`
- `createSituationMinimal` de `./helpers/situation`
- `openTrainingConfig`, `selectGroupForTraining`, `setTrainingHands`, `startTrainingSession`, `answerFoldImmediate` de `./helpers/training`
- Padrão de E2E existente em `e2e/session-history/`

**Requirements:** BATCH-SEL-01, BATCH-SEL-02, BATCH-SEL-05, BATCH-SEL-06, BATCH-TOOL-01, BATCH-TOOL-02, BATCH-TOOL-03, BATCH-DEL-01, BATCH-DEL-02, BATCH-DEL-03, BATCH-DEL-04, BATCH-DEL-05

**Done when:**

**Cenário 1: Checkbox individual + barra de ações**

1. Criar grupo + situação, jogar 3 sessões (1 mão cada)
2. Navegar para `/history`
3. Clicar checkbox da 1ª linha
4. Verificar que a barra de ações aparece com "1 sessões selecionadas"
5. Clicar checkbox da 2ª linha
6. Verificar "2 sessões selecionadas"
7. Clicar "Limpar seleção"
8. Verificar barra oculta

**Cenário 2: Select-all + deselect-all**

1. Após sessões criadas, navegar para `/history`
2. Clicar checkbox do header (select-all)
3. Verificar que todos os checkboxes das linhas visíveis estão marcados
4. Clicar checkbox do header novamente
5. Verificar que nenhum checkbox está marcado

**Cenário 3: Seleção preservada ao navegar páginas**

1. Criar 12 sessões (mais que page size = 10)
2. Navegar para `/history`, marcar 3 checkboxes na página 1
3. Ir para página 2
4. Voltar para página 1
5. Verificar que as 3 checkboxes continuam marcadas

**Cenário 4: Seleção limpa ao mudar filtro**

1. Criar sessões em 2 grupos diferentes
2. Selecionar algumas na página de histórico
3. Mudar filtro de grupo
4. Verificar que seleção foi limpa (barra oculta)

**Cenário 5: Remover sessões — fluxo completo**

1. Criar grupo + situação, jogar 2 sessões
2. Navegar para `/history`, selecionar ambas
3. Clicar "Remover sessões"
4. Verificar preview: "2 sessões e N mãos"
5. Clicar "Remover"
6. No ConfirmActionDialog, clicar "Sim, remover permanentemente"
7. Verificar toast de sucesso
8. Verificar que a lista foi recarregada (apenas 0 sessões restantes)

**Tests:** e2e
**Gate:** `pnpm test:e2e e2e/session-history/batch-actions.spec.ts`

---

### T13: E2E — batch-review.spec.ts

**What:** Adicionar testes E2E para o fluxo de revisão múltipla.

**Where:** `e2e/session-history/batch-review.spec.ts` (novo)

**Depends on:** T11 (MultiSessionReviewPage implementado)

**Reuses:** mesmos helpers de T12

**Requirements:** BATCH-REV-01, BATCH-REV-02, BATCH-REV-03, BATCH-REV-04, BATCH-REV-05, BATCH-REV-06

**Done when:**

**Cenário 1: Revisão múltipla com 2 sessões**

1. Criar grupo + situação, jogar 2 sessões (2 mãos cada = 4 mãos totais)
2. Navegar para `/history`, selecionar ambas as sessões
3. Clicar "Revisão múltipla"
4. Verificar URL: `/history/review-multi?ids=...`
5. Verificar cabeçalho agregado: período, 2 sessões, N mãos
6. Verificar `HandReviewCard` com a 1ª mão
7. Navegar até à última mão (4/4)
8. Verificar que botão "Próxima" está desabilitado

**Cenário 2: 1 sessão → redireciona para revisão normal**

1. Criar 1 sessão
2. Selecionar apenas essa sessão
3. Clicar "Revisão múltipla"
4. Verificar URL: `/history/:sessionId` (não `/history/review-multi`)

**Tests:** e2e
**Gate:** `pnpm test:e2e e2e/session-history/batch-review.spec.ts`

---

## Parallel Execution Map

```
Phase 0 (Foundation, Parallel):
  T1 ──→ (shared types)
  T2 ──→ (zod schemas)
  T3 ──→ (preload API)
  T4 ──→ (sonner toast)

Phase 1 (Backend, Sequential):
  T5 ──→ (IPC handlers + tests)
  depends on: T1, T2

Phase 2 (Renderer Components, Parallel):
  T6 [P] ──→ EntityTable selectable + tests
  T7 [P] ──→ SelectionToolbar
  T8 [P] ──→ DeleteSessionsDialog
  T9 [P] ──→ MultiSessionReviewHeader
  depends on: Phase 1 (não há dependência de código — podem começar após types/preload)

Phase 3 (Pages, Parallel):
  T10 [P] ──→ HistoryPage integration + tests
    depends on: T3, T4, T6, T7, T8
  T11 [P] ──→ MultiSessionReviewPage + route + tests
    depends on: T3, T4, T9

Phase 4 (E2E, Sequential):
  T12 ──→ batch-actions.spec.ts
    depends on: T10
  T13 ──→ batch-review.spec.ts
    depends on: T11
```

---

## Task Granularity Check

| Task                                        | Scope                                         | Status                                                                         |
| ------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------ |
| T1: Shared types                            | 1 file, ~20 linhas                            | ✅ Granular                                                                    |
| T2: Zod schemas                             | 1 file, ~15 linhas                            | ✅ Granular                                                                    |
| T3: Preload API                             | 1 file, ~6 linhas                             | ✅ Granular                                                                    |
| T4: Sonner toast                            | 1 new + 2 modified                            | ⚠️ 3 files but all trivial (install + copy component + add `<Toaster />`) — OK |
| T5: IPC handlers + tests                    | 1 file (edit) + 1 test file (edit)            | ✅ Granular — coeso no mesmo ficheiro                                          |
| T6: EntityTable + tests                     | 1 file (edit) + 1 test (new)                  | ✅ Granular — um componente                                                    |
| T7: SelectionToolbar + tests                | 1 file (new) + 1 test (new)                   | ✅ Granular                                                                    |
| T8: DeleteSessionsDialog + tests            | 1 file (new) + 1 test (new)                   | ✅ Granular                                                                    |
| T9: MultiSessionReviewHeader + tests        | 1 file (new) + 1 test (new)                   | ✅ Granular                                                                    |
| T10: HistoryPage integration + tests        | 1 file (edit) + 1 test (edit)                 | ✅ Granular — uma página                                                       |
| T11: MultiSessionReviewPage + route + tests | 2 files (new) + 1 test (new) + App.tsx (edit) | ⚠️ 3-4 files mas coeso: nova página + rota                                     |
| T12: E2E batch-actions                      | 1 file (new)                                  | ✅ Granular — testes apenas                                                    |
| T13: E2E batch-review                       | 1 file (new)                                  | ✅ Granular — testes apenas                                                    |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows            | Status   |
| ---- | ---------------------- | ------------------------ | -------- |
| T1   | None                   | Phase 0, parallel        | ✅ Match |
| T2   | None                   | Phase 0, parallel        | ✅ Match |
| T3   | None                   | Phase 0, parallel        | ✅ Match |
| T4   | None                   | Phase 0, parallel        | ✅ Match |
| T5   | T1, T2                 | T1,T2 → T5               | ✅ Match |
| T6   | T1                     | independent (types only) | ✅ Match |
| T7   | None                   | independent              | ✅ Match |
| T8   | T3                     | T3 → T8                  | ✅ Match |
| T9   | None                   | independent              | ✅ Match |
| T10  | T3, T4, T6, T7, T8     | T3,T4,T6,T7,T8 → T10     | ✅ Match |
| T11  | T3, T4, T9             | T3,T4,T9 → T11           | ✅ Match |
| T12  | T10                    | T10 → T12                | ✅ Match |
| T13  | T11                    | T11 → T13                | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified         | Test Required                  | Task Says   | Status                                    |
| ---- | ----------------------------------- | ------------------------------ | ----------- | ----------------------------------------- |
| T1   | shared types                        | none                           | Tests: none | ✅ OK — tipos puros, sem lógica runtime   |
| T2   | shared zod schemas                  | unit (validated via IPC tests) | Tests: none | ✅ OK — schemas testados via T5           |
| T3   | preload                             | none                           | Tests: none | ✅ OK — preload não testado unitariamente |
| T4   | renderer (sonner toast)             | none                           | Tests: none | ✅ OK — componente shadcn standard        |
| T5   | main (IPC handlers)                 | unit (padrão existente)        | Tests: unit | ✅ OK                                     |
| T6   | renderer (EntityTable)              | unit (novo componente)         | Tests: unit | ✅ OK                                     |
| T7   | renderer (SelectionToolbar)         | unit (novo componente)         | Tests: unit | ✅ OK                                     |
| T8   | renderer (DeleteSessionsDialog)     | unit (novo componente)         | Tests: unit | ✅ OK                                     |
| T9   | renderer (MultiSessionReviewHeader) | unit (novo componente)         | Tests: unit | ✅ OK                                     |
| T10  | renderer (HistoryPage)              | unit (componente modificado)   | Tests: unit | ✅ OK                                     |
| T11  | renderer (MultiSessionReviewPage)   | unit (nova página)             | Tests: unit | ✅ OK                                     |
| T12  | e2e (batch-actions.spec.ts)         | e2e                            | Tests: e2e  | ✅ OK                                     |
| T13  | e2e (batch-review.spec.ts)          | e2e                            | Tests: e2e  | ✅ OK                                     |

---

## Especificação Técnica de IPC

### `training:estimateDeleteSessionsByIds`

```ts
// Input
ipcRenderer.invoke('training:estimateDeleteSessionsByIds', { ids: number[] })

// Output
{ sessionCount: number, handCount: number }

// Validação: ids non-empty array de inteiros positivos
// Segurança: filtra por userId (apenas sessões do user autenticado)
```

### `training:deleteSessionsByIds`

```ts
// Input
ipcRenderer.invoke('training:deleteSessionsByIds', { ids: number[] })

// Output
{ sessionCount: number, handCount: number }

// Validação: ids non-empty array
// Executa em transacção: DELETE FROM training_sessions WHERE id IN ids AND userId = ?
// Cascade FK apaga session_hands automaticamente
// Erro se nenhuma sessão encontrada
```

### `training:getMultiSessionDetail`

```ts
// Input
ipcRenderer.invoke('training:getMultiSessionDetail', { ids: number[] })

// Output
{
  sessions: SessionHistoryItemDto[],
  hands: SessionHandDetailDto[],
  handSessionMap: { sessionIndex: number; sessionId: number }[],
  situationActionsMap: Record<number, { name, position, actions, rangeCells }>,
  omittedIds?: number[],        // IDs que não foram encontrados
}

// Validação: ids non-empty array
// Ordem: sessions ordenadas por startedAt ASC; hands flatten por startedAt ASC, depois handIndex ASC
// Enriquecimento idêntico a getSessionDetail (JOIN situations, actions, rangeCells + evaluateTrainingAnswer)
```

---

## Commit Plan

| Task | Commit Type | Scope   | Description                                                      |
| ---- | ----------- | ------- | ---------------------------------------------------------------- |
| T1   | `types`     | shared  | Add MultiSessionDetailDto and DeleteSessionsInput types          |
| T2   | `types`     | shared  | Add Zod schemas for batch actions IPC                            |
| T3   | `feat`      | preload | Add batch actions API methods                                    |
| T4   | `feat`      | ui      | Add sonner toast component                                       |
| T5   | `feat`      | main    | Add batch IPC handlers (estimateDelete, delete, getMultiSession) |
| T6   | `feat`      | ui      | Add selectable mode to EntityTable                               |
| T7   | `feat`      | ui      | Create SelectionToolbar component                                |
| T8   | `feat`      | ui      | Create DeleteSessionsDialog component                            |
| T9   | `feat`      | ui      | Create MultiSessionReviewHeader component                        |
| T10  | `feat`      | ui      | Integrate batch selection and actions in HistoryPage             |
| T11  | `feat`      | ui      | Create MultiSessionReviewPage                                    |
| T12  | `test`      | e2e     | Add E2E tests for batch actions                                  |
| T13  | `test`      | e2e     | Add E2E tests for batch review                                   |
