# Session History — Design

**Status:** Implemented
**Requisitos cobertos:** HIST-01 a HIST-21
**Spec base:** `spec.md`

---

## 1. Visão Geral

Duas novas rotas no renderer, dois novos handlers IPC no main, zero alterações ao schema.
A feature lê dados já persistidos (`trainingSessions` + `sessionHands`) enriquecendo-os com JOINs.
O grid 13×13 existente ganha modo read-only com célula destacada para a revisão mão a mão.

```
Renderer (React)
├── /history — HistoryPage
│   ├── FilterToolbar (grupos + tipo + mesas)
│   ├── EntityTable<SessionHistoryItemDto>
│   └── Pagination (shadcn)
│       └── IPC: training:listSessions({ page, pageSize, filters })
│             └── main: SELECT + JOIN + COUNT, LIMIT/OFFSET
│
└── /history/:sessionId — SessionHandReviewPage
    ├── SessionReviewHeader (StatCards)
    └── HandReviewCard (com RangeGrid13 readOnly)
        ├── anterior/próxima navegação local
        └── IPC: training:getSessionDetail(sessionId)
              └── main: session + hands + actions + rangeCells
              └── compute correctActionIds via evaluateTrainingAnswer()
```

---

## 2. Decisões de Arquitetura

### DA-01: Zero alterações ao schema

As tabelas `trainingSessions` e `sessionHands` (schema §5) já armazenam todos os campos necessários:

- `trainingSessions`: id, userId, groupId, sessionType, simultaneousTableCount, startedAt, finishedAt, totalHands, timerSeconds, feedbackMode, situationIdsJson
- `sessionHands`: id, sessionId, situationId, card1Rank, card1Suit, card2Rank, card2Suit, chosenActionId, isCorrect, responseMs, handIndex

**Sem migração Drizzle.** As queries apenas enriquecem com JOINs. HIST-01..21 implementados sem alterar `schema.ts`.

### DA-02: Paginação server-side com pageSize fixo

- `pageSize = 10` fixo no handler; não exposto na UI nem nos query params.
- Query principal: `LIMIT 10 OFFSET (page-1)*10`.
- Query de total: `COUNT(*)` com mesmos filtros (sem LIMIT/OFFSET).
- Parâmetro `page` ≥ 1 validado no handler; valores inválidos → página 1.
- A query de total retorna o número de páginas para o componente de paginação.

**Racional:** Evita que o renderer carregue todas as sessões em memória. Consistente com boas práticas de SQLite (evitar scroll-cursor desnecessário).

### DA-03: Grid 13×13 read-only via extensão do RangeGrid13

Duas novas props opcionais em `RangeGrid13`:

```typescript
type Props = {
  // ... existing props ...
  readOnly?: boolean; // default false
  highlightCell?: { rowIndex: number; colIndex: number } | null; // default null
};
```

**Quando `readOnly=true`:**

- Mouse handlers (`onMouseDown`, `onMouseEnter`, `onMouseUp`, `onMouseLeave`) são no-ops.
- `onContextMenu` prevenido apenas no readOnly também.
- Células são renderizadas como `<div>` em vez de `<button>` (sem interatividade).
- Footer de ajuda ("Clique esquerdo...") é omitido.

**Quando `highlightCell` está definido:**

- A célula alvo recebe classe adicional `ring-2 ring-amber-400 ring-inset` para destaque visual.
- Aplica-se independentemente do `readOnly` (mas na prática apenas usado no modo revisão).

**Racional:** Evita duplicar a lógica complexa de renderização (gradients, labels, grid bounds). A mudança no componente existente é mínima e condicional — o comportamento de edição (`onChange`, painting) permanece inalterado quando `readOnly=false`.

### DA-04: Filtros mantidos em query params

Estado dos filtros (`groupId`, `sessionType`, `tableCount`, `page`) é bidirecional com `useSearchParams()` do react-router-dom v6.

```
/history?page=2&groupId=3&sessionType=simultaneous&tableCount=4
```

- Inicialização: lê query params → inicializa estado local.
- Alteração de filtro: atualiza estado local → escreve query params + reseta `page=1`.
- Alteração de página: atualiza estado local + query param `page`.
- "Voltar ao histórico": link preserva query params correntes via `useLocation().search`.

**Racional:** Permite partilhar/bookmarkar estado da página, navegação back/forward consistente.

### DA-05: Novo módulo IPC `history.ts`

Handlers registados em `src/main/ipc/history.ts`, importado por `src/main/ipc/register.ts`:

| Canal                       | Handler                    | Retorno               |
| --------------------------- | -------------------------- | --------------------- |
| `training:listSessions`     | Lista paginada com filtros | `SessionListResponse` |
| `training:getSessionDetail` | Sessão + mãos + ranges     | `SessionDetailDto`    |

O módulo segue o padrão existente: `requireUserId()`, validação Zod para parâmetros, Drizzle parametrizado.

**Nota:** Apesar do prefixo `training:`, estes canais são específicos da feature de histórico. Foram mantidos sob `training:` por tratarem de dados de `trainingSessions`. O módulo `history.ts` é separado para evitar conflitos de merge com `training.ts`.

### DA-06: correctActionIds calculados no main (nunca no renderer)

O handler `training:getSessionDetail` carrega os `rangeCells` de cada situação referenciada nas mãos e, para cada mão, invoca `evaluateTrainingAnswer()` (função em `src/shared/poker/grid.ts`) para determinar `correctActionIds`.

**Racional:** Segue o invariante do domínio (§7 do skill `preflop-domain`): "Lógica de avaliação deve existir em `src/shared/poker` e validada no main — nunca só no renderer."

### DA-07: shadcn Pagination (novo componente)

Adicionar componente `Pagination` via `npx shadcn@latest add pagination` para obter:

- `Pagination`, `PaginationContent`, `PaginationItem`, `PaginationLink`, `PaginationPrevious`, `PaginationNext`, `PaginationEllipsis`

Usado apenas na página de histórico (não na navegação entre mãos).

---

## 3. Modelo de Dados

**Sem alterações ao schema.** Apenas novas queries.

### Query: `training:listSessions`

Duas fases:

1. `COUNT(*)` com filtros → `total`.
2. `SELECT` com JOIN + subquery de agregação → `items`.

**SELECT (pseudocode Drizzle):**

```typescript
db.select({
  id: trainingSessions.id,
  startedAt: trainingSessions.startedAt,
  finishedAt: trainingSessions.finishedAt,
  groupName: situationGroups.name,
  situationCount: sql<number>`json_array_length(${trainingSessions.situationIdsJson})`.mapWith(
    Number,
  ),
  totalHands: trainingSessions.totalHands,
  handsPlayed:
    sql<number>`(SELECT COUNT(*) FROM session_hands WHERE session_hands.session_id = ${trainingSessions.id})`.mapWith(
      Number,
    ),
  correct:
    sql<number>`(SELECT COUNT(*) FROM session_hands WHERE session_hands.session_id = ${trainingSessions.id} AND session_hands.is_correct = 1)`.mapWith(
      Number,
    ),
  sessionType: trainingSessions.sessionType,
  simultaneousTableCount: trainingSessions.simultaneousTableCount,
  durationMs:
    sql<number>`(unixepoch(${trainingSessions.finishedAt}) - unixepoch(${trainingSessions.startedAt})) * 1000`.mapWith(
      Number,
    ),
})
  .from(trainingSessions)
  .leftJoin(situationGroups, eq(trainingSessions.groupId, situationGroups.id))
  .where(
    and(
      eq(trainingSessions.userId, userId),
      not(isNull(trainingSessions.finishedAt)), // apenas concluídas
      ...filters, // groupId, sessionType, simultaneousTableCount
    ),
  )
  .orderBy(desc(trainingSessions.startedAt))
  .limit(pageSize)
  .offset((page - 1) * pageSize);
```

**Filtro de grupo:** `eq(trainingSessions.groupId, groupId)` quando `groupId` definido.
**Filtro de tipo:** `eq(trainingSessions.sessionType, sessionType)` quando ≠ 'all'.
**Filtro de mesas:** `eq(trainingSessions.simultaneousTableCount, tableCount)` quando definido.

### Query: `training:getSessionDetail`

Carrega:

1. Sessão (mesma query de listagem, sem paginação, filtrada por `sessionId`).
2. Todas as `sessionHands` da sessão, ordenadas por `handIndex ASC`.
3. Para cada `situationId` distinto, carrega `actions` + `rangeCells`.
4. Para cada hand, computa `correctActionIds` via `evaluateTrainingAnswer()`.

**Algoritmo de correctActionIds por mão:**

```typescript
for (const hand of hands) {
  const sitActions = actionsBySituationId.get(hand.situationId) ?? [];
  const cells = rangeCellsBySituationId.get(hand.situationId) ?? [];

  const getFrequency = (actionId, row, col) => {
    const cell = cells.find(
      (c) => c.actionId === actionId && c.rowIndex === row && c.colIndex === col,
    );
    return cell?.frequency ?? 0;
  };

  const { rowIndex, colIndex } = handToGridCell(
    hand.card1Rank,
    hand.card2Rank,
    hand.card1Suit,
    hand.card2Suit,
  );
  const foldAction = sitActions.find((a) => a.actionType === 'FOLD');

  const evalResult = evaluateTrainingAnswer({
    rowIndex,
    colIndex,
    chosenActionId: hand.chosenActionId,
    timedOut: hand.chosenActionId === null,
    actionIdsInSituation: sitActions.map((a) => a.id),
    getFrequency,
    foldActionId: foldAction?.id ?? null,
  });

  // Inclui correctActionIds e gridCell no DTO da mão
}
```

---

## 4. IPC + Shared Contracts

### 4.1 Novos DTOs em `src/shared/ipc/types.ts`

```typescript
export type SessionHistoryItemDto = {
  id: number;
  startedAt: number; // timestamp ms (Date → epoch)
  finishedAt: number | null; // timestamp ms (Date → epoch)
  groupName: string | null;
  situationCount: number;
  totalHands: number;
  handsPlayed: number;
  correct: number;
  accuracy: number; // computed: correct / handsPlayed (0 se handsPlayed = 0)
  durationMs: number | null; // null se finishedAt = null
  sessionType: SessionType;
  simultaneousTableCount: number | null;
};

export type SessionHandDetailDto = {
  handIndex: number;
  card1: CardDto;
  card2: CardDto;
  situationName: string;
  situationPosition: Position;
  chosenAction: {
    id: number;
    name: string;
    actionType: ActionType;
    colorHex: string;
  } | null; // null when timedOut (chosenActionId = null)
  isCorrect: boolean;
  responseMs: number;
  gridCell: { rowIndex: number; colIndex: number };
  correctActionIds: number[];
};

export type SessionDetailDto = {
  session: SessionHistoryItemDto;
  hands: SessionHandDetailDto[];
  situationActionsMap: Record<
    number,
    {
      name: string;
      position: Position;
      actions: {
        id: number;
        name: string;
        actionType: ActionType;
        colorHex: string;
        sortOrder: number;
      }[];
      rangeCells: RangeCellDto[];
    }
  >;
};

export type SessionListResponse = {
  items: SessionHistoryItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number; // Math.ceil(total / pageSize)
};

export type SessionHistoryFilters = {
  page?: number;
  groupId?: number;
  sessionType?: 'single' | 'simultaneous';
  simultaneousTableCount?: SimultaneousTableCount;
};
```

### 4.2 Schema Zod em `src/shared/forms/trainingSchemas.ts`

Adicionar schema de validação para os parâmetros do handler:

```typescript
export const sessionHistoryFiltersSchema = z.object({
  page: z.number().int().min(1).default(1),
  groupId: z.number().int().positive().optional(),
  sessionType: z.enum(['single', 'simultaneous']).optional(),
  simultaneousTableCount: z.union([z.literal(2), z.literal(3), z.literal(4)]).optional(),
});
```

Parser: `parseSessionHistoryFilters(raw)` — aplica defaults e valida.

### 4.3 Canais IPC

| Canal                       | Parâmetros                       | Retorno               |
| --------------------------- | -------------------------------- | --------------------- |
| `training:listSessions`     | `filters: SessionHistoryFilters` | `SessionListResponse` |
| `training:getSessionDetail` | `sessionId: number`              | `SessionDetailDto`    |

Ambos exigem `requireUserId()`. Ambos propagam erros com mensagens em português.

---

## 5. Main Process

### 5.1 Novo módulo: `src/main/ipc/history.ts`

```typescript
export function registerHistoryIpc(): void {
  ipcMain.handle('training:listSessions', async (_e, rawFilters: unknown) => {
    const filters = parseSessionHistoryFilters(rawFilters);
    const userId = await requireUserId();
    const db = getDb();

    // Build where clause
    const conditions = [
      eq(trainingSessions.userId, userId),
      sql`${trainingSessions.finishedAt} IS NOT NULL`,
    ];
    if (filters.groupId !== undefined)
      conditions.push(eq(trainingSessions.groupId, filters.groupId));
    if (filters.sessionType !== undefined)
      conditions.push(eq(trainingSessions.sessionType, filters.sessionType));
    if (filters.simultaneousTableCount !== undefined)
      conditions.push(eq(trainingSessions.simultaneousTableCount, filters.simultaneousTableCount));

    const whereClause = and(...conditions);

    // Count total
    const [countRow] = await db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(trainingSessions)
      .leftJoin(situationGroups, eq(trainingSessions.groupId, situationGroups.id))
      .where(whereClause);

    const total = countRow?.total ?? 0;
    const pageSize = 10;
    const page = filters.page;

    // Fetch page
    const rows = await db
      .select({
        id: trainingSessions.id,
        startedAt: trainingSessions.startedAt,
        finishedAt: trainingSessions.finishedAt,
        groupName: situationGroups.name,
        totalHands: trainingSessions.totalHands,
        sessionType: trainingSessions.sessionType,
        simultaneousTableCount: trainingSessions.simultaneousTableCount,
        situationCount: sql<number>`json_array_length(${trainingSessions.situationIdsJson})`,
        handsPlayed: sql<number>`(SELECT COUNT(*) FROM session_hands WHERE session_hands.session_id = ${trainingSessions.id})`,
        correct: sql<number>`(SELECT COUNT(*) FROM session_hands WHERE session_hands.session_id = ${trainingSessions.id} AND session_hands.is_correct = 1)`,
        durationMs: sql<number>`(unixepoch(${trainingSessions.finishedAt}) * 1000 - unixepoch(${trainingSessions.startedAt}) * 1000)`,
      })
      .from(trainingSessions)
      .leftJoin(situationGroups, eq(trainingSessions.groupId, situationGroups.id))
      .where(whereClause)
      .orderBy(desc(trainingSessions.startedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const items = rows.map((r) => ({
      ...r,
      startedAt: r.startedAt instanceof Date ? r.startedAt.getTime() : Number(r.startedAt),
      finishedAt: r.finishedAt instanceof Date ? r.finishedAt.getTime() : Number(r.finishedAt),
      accuracy: r.handsPlayed > 0 ? r.correct / r.handsPlayed : 0,
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  });

  ipcMain.handle('training:getSessionDetail', async (_e, sessionId: number) => {
    const userId = await requireUserId();
    const db = getDb();

    // Load session
    const sessRows = await db
      .select({
        id: trainingSessions.id,
        startedAt: trainingSessions.startedAt,
        finishedAt: trainingSessions.finishedAt,
        groupId: trainingSessions.groupId,
        totalHands: trainingSessions.totalHands,
        sessionType: trainingSessions.sessionType,
        simultaneousTableCount: trainingSessions.simultaneousTableCount,
      })
      .from(trainingSessions)
      .where(and(eq(trainingSessions.id, sessionId), eq(trainingSessions.userId, userId)))
      .limit(1);
    if (!sessRows[0]) throw new Error('Sessão não encontrada');

    // Load hands
    const hands = await db
      .select()
      .from(sessionHands)
      .where(eq(sessionHands.sessionId, sessionId))
      .orderBy(asc(sessionHands.handIndex));

    // Collect unique situation IDs
    const sitIds = [...new Set(hands.map((h) => h.situationId))];

    // Load situations with actions and rangeCells
    const sitRows =
      sitIds.length > 0
        ? await db.select().from(situations).where(inArray(situations.id, sitIds))
        : [];
    const actionRows =
      sitIds.length > 0
        ? await db.select().from(actions).where(inArray(actions.situationId, sitIds))
        : [];
    const cellRows =
      actionRows.length > 0
        ? await db
            .select()
            .from(rangeCells)
            .where(
              inArray(
                rangeCells.actionId,
                actionRows.map((a) => a.id),
              ),
            )
        : [];

    // Index data
    const actionsBySit = new Map<number, typeof actionRows>();
    const cellsByAction = new Map<number, typeof cellRows>();
    for (const a of actionRows) {
      const arr = actionsBySit.get(a.situationId) ?? [];
      arr.push(a);
      actionsBySit.set(a.situationId, arr);
    }
    for (const c of cellRows) {
      const arr = cellsByAction.get(c.actionId) ?? [];
      arr.push(c);
      cellsByAction.set(c.actionId, arr);
    }

    // Enrich hands with correctActionIds
    const enrichedHands = hands.map((h) => {
      const sitActs = actionsBySit.get(h.situationId) ?? [];
      const allCells = sitActs.flatMap(
        (a) => cellsByAction.get(a.id)?.map((c) => ({ ...c, actionId: a.id })) ?? [],
      );
      const { rowIndex, colIndex } = handToGridCell(
        h.card1Rank,
        h.card2Rank,
        h.card1Suit,
        h.card2Suit,
      );
      const foldAct = sitActs.find((a) => a.actionType === 'FOLD');

      const getFrequency = (actionId: number, row: number, col: number): number => {
        return (
          allCells.find((c) => c.actionId === actionId && c.rowIndex === row && c.colIndex === col)
            ?.frequency ?? 0
        );
      };

      const evalResult = evaluateTrainingAnswer({
        rowIndex,
        colIndex,
        chosenActionId: h.chosenActionId,
        timedOut: h.chosenActionId === null,
        actionIdsInSituation: sitActs.map((a) => a.id),
        getFrequency,
        foldActionId: foldAct?.id ?? null,
      });

      const chosenAct = sitActs.find((a) => a.id === h.chosenActionId) ?? null;

      const sit = sitRows.find((s) => s.id === h.situationId);
      const sitName = sit?.name ?? '(arquivada)';
      const sitPosition = (sit?.position ?? 'UTG') as Position;

      return {
        handIndex: h.handIndex,
        card1: { rank: h.card1Rank, suit: h.card1Suit } as CardDto,
        card2: { rank: h.card2Rank, suit: h.card2Suit } as CardDto,
        situationName: sitName,
        situationPosition: sitPosition,
        chosenAction: chosenAct
          ? {
              id: chosenAct.id,
              name: chosenAct.name,
              actionType: chosenAct.actionType as ActionType,
              colorHex: chosenAct.colorHex,
            }
          : null,
        isCorrect: h.isCorrect,
        responseMs: h.responseMs,
        gridCell: { rowIndex, colIndex },
        correctActionIds: evalResult.correctActionIds,
      } satisfies SessionHandDetailDto;
    });

    // Build situationActionsMap for grid rendering
    const situationActionsMap: SessionDetailDto['situationActionsMap'] = {};
    for (const s of sitRows) {
      const sitActs = actionsBySit.get(s.id) ?? [];
      const allCells = sitActs.flatMap(
        (a) =>
          cellsByAction.get(a.id)?.map((c) => ({
            actionId: a.id,
            rowIndex: c.rowIndex,
            colIndex: c.colIndex,
            frequency: c.frequency,
          })) ?? [],
      );
      situationActionsMap[s.id] = {
        name: s.name,
        position: s.position as Position,
        actions: sitActs.map((a) => ({
          id: a.id,
          name: a.name,
          actionType: a.actionType as ActionType,
          colorHex: a.colorHex,
          sortOrder: a.sortOrder,
        })),
        rangeCells: allCells,
      };
    }

    // Compute session-level stats
    const handsPlayed = enrichedHands.length;
    const correct = enrichedHands.filter((h) => h.isCorrect).length;

    const session: SessionHistoryItemDto = {
      id: sessRows[0].id,
      startedAt:
        sessRows[0].startedAt instanceof Date
          ? sessRows[0].startedAt.getTime()
          : Number(sessRows[0].startedAt),
      finishedAt:
        sessRows[0].finishedAt instanceof Date
          ? sessRows[0].finishedAt.getTime()
          : Number(sessRows[0].finishedAt),
      groupName: null, // não carregado neste handler (não essencial para a revisão)
      situationCount: 0, // não carregado
      totalHands: sessRows[0].totalHands,
      handsPlayed,
      correct,
      accuracy: handsPlayed > 0 ? correct / handsPlayed : 0,
      durationMs:
        sessRows[0].finishedAt && sessRows[0].startedAt
          ? (sessRows[0].finishedAt instanceof Date
              ? sessRows[0].finishedAt.getTime()
              : Number(sessRows[0].finishedAt)) -
            (sessRows[0].startedAt instanceof Date
              ? sessRows[0].startedAt.getTime()
              : Number(sessRows[0].startedAt))
          : null,
      sessionType: (sessRows[0].sessionType as SessionType) ?? 'single',
      simultaneousTableCount: sessRows[0].simultaneousTableCount,
    };

    return { session, hands: enrichedHands, situationActionsMap };
  });
}
```

### 5.2 Registo em `src/main/ipc/register.ts`

```typescript
import { registerHistoryIpc } from './history';
// ...
registerHistoryIpc();
```

---

## 6. Preload

Adicionar ao namespace `training` em `src/preload/index.ts`:

```typescript
training: {
  // ... existing ...
  listSessions: (filters: unknown) => ipcRenderer.invoke('training:listSessions', filters),
  getSessionDetail: (sessionId: number) =>
    ipcRenderer.invoke('training:getSessionDetail', sessionId),
},
```

### 6.1 Declaração de tipos em `src/renderer/src/env.d.ts`

```typescript
training: {
  // ... existing ...
  listSessions: (filters: SessionHistoryFilters) => Promise<SessionListResponse>;
  getSessionDetail: (sessionId: number) => Promise<SessionDetailDto>;
}
```

---

## 7. Renderer

### 7.1 Rotas novas em `App.tsx`

```typescript
<Route path="/history" element={<HistoryPage />} />
<Route path="/history/:sessionId" element={<SessionHandReviewPage />} />
```

Colocar após o grupo de rotas `/training/*` e antes de `/stats`, mantendo a ordem existente.

### 7.2 Sidebar

Adicionar `NavLink` em `Layout.tsx`:

```typescript
<NavLink to="/history" className={navLinkClass}>
  📋 Histórico
</NavLink>
```

Posição: entre "Treino Simultâneo" e "Estatísticas".

### 7.3 Página: `HistoryPage` (`src/renderer/src/pages/HistoryPage.tsx`)

**Estado local:**

```typescript
const [groups, setGroups] = useState<GroupSummaryDto[]>([]);
const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
const [sessionType, setSessionType] = useState<'all' | 'single' | 'simultaneous'>('all');
const [tableCount, setTableCount] = useState<'' | '2' | '3' | '4'>('');
const [page, setPage] = useState(1);
const [data, setData] = useState<SessionListResponse | null>(null);
const [loading, setLoading] = useState(true);
```

**Inicialização a partir de query params:**

```typescript
const [searchParams, setSearchParams] = useSearchParams();

// Ler query params → estado local no mount
useEffect(() => {
  const p = searchParams.get('page');
  const g = searchParams.get('groupId');
  const t = searchParams.get('sessionType');
  const c = searchParams.get('tableCount');
  if (p) setPage(Math.max(1, Number(p)));
  if (g) setActiveGroupId(Number(g));
  if (t === 'single' || t === 'simultaneous') setSessionType(t);
  if (c === '2' || c === '3' || c === '4') setTableCount(c);
}, []);
```

**Sincronização estado local → query params:**

```typescript
useEffect(() => {
  const params = new URLSearchParams();
  if (page > 1) params.set('page', String(page));
  if (activeGroupId !== null) params.set('groupId', String(activeGroupId));
  if (sessionType !== 'all') params.set('sessionType', sessionType);
  if (tableCount) params.set('tableCount', tableCount);
  setSearchParams(params, { replace: true });
}, [page, activeGroupId, sessionType, tableCount]);
```

**Fetch:**

```typescript
useEffect(() => {
  setLoading(true);
  const filters: SessionHistoryFilters = { page };
  if (activeGroupId !== null) filters.groupId = activeGroupId;
  if (sessionType !== 'all') filters.sessionType = sessionType;
  if (tableCount) filters.simultaneousTableCount = Number(tableCount) as SimultaneousTableCount;
  window.api.training.listSessions(filters).then((res) => {
    setData(res);
    setLoading(false);
  });
}, [page, activeGroupId, sessionType, tableCount]);
```

**Reset de página ao mudar filtros:**

```typescript
// Nos handlers de onChange dos filtros, chamar setPage(1)
const handleGroupChange = (gid: number | null) => {
  setActiveGroupId(gid);
  setPage(1);
};
```

**Colunas da EntityTable:**

```typescript
const columns: EntityTableColumn<SessionHistoryItemDto>[] = [
  {
    key: 'date',
    header: 'Data',
    cell: (row) => new Date(row.startedAt).toLocaleString('pt-BR'),
  },
  {
    key: 'group',
    header: 'Grupo',
    cell: (row) => row.groupName ?? '—',
  },
  {
    key: 'situations',
    header: 'Situações',
    cell: (row) => row.situationCount,
    cellClassName: 'tabular-nums',
  },
  {
    key: 'result',
    header: 'Resultado',
    cell: (row) => `${(row.accuracy * 100).toFixed(1)}%`,
    cellClassName: 'tabular-nums',
  },
  {
    key: 'duration',
    header: 'Duração',
    cell: (row) => row.durationMs !== null ? formatDuration(row.durationMs) : '—',
  },
  {
    key: 'type',
    header: 'Tipo',
    cell: (row) => (
      <Badge variant="secondary">
        {row.sessionType === 'simultaneous' ? `Simultâneo (${row.simultaneousTableCount})` : 'Individual'}
      </Badge>
    ),
  },
  {
    key: 'hands',
    header: 'Mãos',
    cell: (row) => `${row.handsPlayed}/${row.totalHands}`,
    cellClassName: 'tabular-nums',
  },
];
```

**Cada linha é clicável:**

```typescript
// onClick na TableRow → navigate(`/history/${row.id}${location.search}`)
// Passa os query params correntes no state para o voltar funcionar
```

**Pagination:**

```typescript
{data && data.totalPages > 1 && (
  <Pagination>
    <PaginationContent>
      <PaginationPrevious
        onClick={() => setPage(Math.max(1, page - 1))}
        disabled={page === 1}
      />
      {/* ... PaginationLink para cada página visível ... */}
      <PaginationNext
        onClick={() => setPage(Math.min(data.totalPages, page + 1))}
        disabled={page === data.totalPages}
      />
    </PaginationContent>
  </Pagination>
)}
```

Layout completo:

```
<div className="flex flex-col gap-6">
  <PageHeader title="Histórico" />

  <FilterToolbar>
    <Tabs value={groupTabValue} onValueChange={handleGroupChange}>
      <TabsList>
        <TabsTrigger value="all">Todos</TabsTrigger>
        {groups.map(g => <TabsTrigger key={g.id} value={String(g.id)}>{g.name}</TabsTrigger>)}
      </TabsList>
    </Tabs>

    <FilterToolbarRow>
      <div className="flex min-w-44 flex-col gap-1">
        <Label>Tipo de sessão</Label>
        <select value={sessionType} onChange={(e) => { setSessionType(e.target.value); setPage(1); }}>
          <option value="all">Todos</option>
          <option value="single">Individual</option>
          <option value="simultaneous">Simultâneo</option>
        </select>
      </div>
      <div className="flex min-w-44 flex-col gap-1">
        <Label>Mesas simultâneas</Label>
        <select
          value={tableCount}
          onChange={(e) => { setTableCount(e.target.value); setPage(1); }}
          disabled={sessionType !== 'simultaneous'}
        >
          <option value="">Todas</option>
          <option value="2">2 mesas</option>
          <option value="3">3 mesas</option>
          <option value="4">4 mesas</option>
        </select>
      </div>
    </FilterToolbarRow>
  </FilterToolbar>

  {loading ? (
    <Skeleton rows={10} />
  ) : (
    <EntityTable
      rows={data?.items ?? []}
      columns={columns}
      getRowKey={(row) => row.id}
      onRowClick={(row) => navigate(`/history/${row.id}${location.search}`)}
      emptyState={<EmptyState title="Nenhuma sessão" description="..." />}
      tableTestId="history-sessions-table"
    />
  )}

  {/* Pagination */}
</div>
```

### 7.4 Página: `SessionHandReviewPage` (`src/renderer/src/pages/SessionHandReviewPage.tsx`)

**Estado:**

```typescript
const { sessionId } = useParams();
const location = useLocation();
const navigate = useNavigate();
const [detail, setDetail] = useState<SessionDetailDto | null>(null);
const [currentHandIndex, setCurrentHandIndex] = useState(0);
const [loading, setLoading] = useState(true);
```

**Fetch inicial:**

```typescript
useEffect(() => {
  window.api.training
    .getSessionDetail(Number(sessionId))
    .then(setDetail)
    .catch(() => setDetail(null)) // erro tratado como sessão não encontrada
    .finally(() => setLoading(false));
}, [sessionId]);
```

**Hand atual e navegação:**

```typescript
const currentHand = detail?.hands[currentHandIndex] ?? null;
const totalHands = detail?.hands.length ?? 0;

const goTo = (index: number) => {
  if (index >= 0 && index < totalHands) setCurrentHandIndex(index);
};
```

**Voltar ao histórico:**

```typescript
// location.state contém os query params de origem, ou usa location.search
const backTo = `/history${location.state?.search ?? location.search ?? ''}`;
// Nota: ao navegar de HistoryPage, passar { state: { search: location.search } }
```

**Estrutura do componente:**

```
<div className="flex flex-col gap-6">
  <div className="flex flex-wrap items-center justify-between gap-3">
    <PageHeader title="Revisão da Sessão" />
    <Button variant="outline" onClick={() => navigate(backTo)}>
      ← Voltar ao histórico
    </Button>
  </div>

  {detail && (
    <SessionReviewHeader session={detail.session} />
  )}

  {currentHand && (
    <HandReviewCard
      hand={currentHand}
      situationActionsMap={detail.situationActionsMap}
      handIndex={currentHandIndex}
      totalHands={totalHands}
      onPrev={() => goTo(currentHandIndex - 1)}
      onNext={() => goTo(currentHandIndex + 1)}
    />
  )}
</div>
```

### 7.5 Componente: `SessionReviewHeader` (`src/renderer/src/components/history/SessionReviewHeader.tsx`)

4 StatCards em grid 2×2 ou 4-col:

| Label   | Value                                  |
| ------- | -------------------------------------- |
| Data    | `formatDate(session.startedAt)`        |
| Acerto  | `(session.accuracy * 100).toFixed(1)%` |
| Duração | `formatDuration(session.durationMs)`   |
| Mãos    | `session.handsPlayed`                  |

### 7.6 Componente: `HandReviewCard` (`src/renderer/src/components/history/HandReviewCard.tsx`)

Props:

```typescript
type Props = {
  hand: SessionHandDetailDto;
  situationActionsMap: SessionDetailDto['situationActionsMap'];
  handIndex: number;
  totalHands: number;
  onPrev: () => void;
  onNext: () => void;
};
```

**Layout:**

```
┌────────────────────────────────────────────────────────────┐
│ Indicador: Mão 3 de 10                                     │
├────────────────────────────────────────────────────────────┤
│ ┌──────────────┐  Situação: "BTN Open"                     │
│ │  A♠   K♥    │  Posição: BTN                             │
│ └──────────────┘                                           │
│                                                             │
│ Resposta: ┌──────────────────────┐                          │
│           │ ✓ CALL (correto)     │  ou  ✗ FOLD (errado)    │
│           └──────────────────────┘                          │
│ Tempo: 2.3s                                                │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────┐          │
│  │            RangeGrid13 (readOnly)             │          │
│  │          com highlightCell ativo              │          │
│  │         e legenda de ações abaixo             │          │
│  └──────────────────────────────────────────────┘          │
│                                                             │
├────────────────────────────────────────────────────────────┤
│ [← Anterior]                3/10                [Próxima →] │
└────────────────────────────────────────────────────────────┘
```

**Hole cards:** Renderizar com `Card` + texto `{card.rank}{suitSymbol(card.suit)}`. Usar cores para naipes (♠ preto, ♥ vermelho, ♦ vermelho, ♣ preto).

**Feedback de acerto/erro:**

- Acerto: `Badge` verde com `✓` + nome da ação.
- Erro: `Badge` vermelho com `✗` + nome da ação escolhida + ações corretas em texto (ex: "Correto: RAISE_OPEN, CALL").
- Timeout: `Badge` vermelho com "⏱ Timeout".

**Grid:**

```typescript
// Mapear situationActionsMap[situationId] para props do RangeGrid13
const sitData = situationActionsMap[hand.situationId];
// sitData.actions → actions (com clientKey = String(id))
// sitData.rangeCells → cells (com actionClientKey = String(actionId))
// hand.gridCell → highlightCell
```

**Legenda do grid:**
Abaixo do grid, mostrar cada ação com sua cor:

```typescript
<div className="flex flex-wrap gap-3 mt-3">
  {actions.map(a => (
    <div key={a.id} className="flex items-center gap-1.5 text-xs">
      <span className="inline-block w-3 h-3 rounded-sm" style={{ background: a.colorHex }} />
      <span>{a.name}</span>
    </div>
  ))}
</div>
```

**Navegação entre mãos:**

```typescript
<div className="flex items-center justify-between">
  <Button variant="outline" onClick={onPrev} disabled={handIndex === 0}>
    ← Anterior
  </Button>
  <span className="text-sm text-muted-foreground tabular-nums">
    {handIndex + 1} / {totalHands}
  </span>
  <Button variant="outline" onClick={onNext} disabled={handIndex === totalHands - 1}>
    Próxima →
  </Button>
</div>
```

### 7.7 Modificação: `RangeGrid13` (readOnly + highlightCell)

Adicionar ao ficheiro `src/renderer/src/components/grid/RangeGrid13.tsx`:

**Props novas:**

```typescript
type Props = {
  // ... existing ...
  readOnly?: boolean;
  highlightCell?: { rowIndex: number; colIndex: number } | null;
};
```

**Alterações no componente:**

1. Desestruturar novas props com defaults:

```typescript
const { actions, activeActionKey, cells, onChange, readOnly = false, highlightCell = null } = props;
```

2. Mouse handlers condicionais:

```typescript
function onDown(row: number, col: number, ev: React.MouseEvent): void {
  if (readOnly) return;
  // ... existing logic ...
}

function onEnter(row: number, col: number): void {
  if (readOnly) return;
  // ... existing logic ...
}
```

3. Elemento da célula (button vs div):

```typescript
const CellTag = readOnly ? 'div' : 'button';
const cellProps = readOnly
  ? {}
  : {
      type: 'button' as const,
      onMouseDown: (e: React.MouseEvent) => onDown(row, col, e),
      onMouseEnter: () => onEnter(row, col),
    };
```

4. Highlight class:

```typescript
const isHighlighted = highlightCell?.rowIndex === row && highlightCell?.colIndex === col;
const highlightClass = isHighlighted ? 'ring-2 ring-inset ring-amber-400' : '';
```

5. Container events condicionais:

```typescript
// No wrapper div:
{...(!readOnly && {
  onMouseLeave: () => setPainting(false),
  onMouseUp: () => setPainting(false),
  onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
})}
```

6. Footer condicional:

```typescript
{!readOnly && (
  <p className="mt-2 text-xs text-muted-foreground">
    Clique esquerdo: selecionar a ação ativa. Alt+clique ou botão direito: apagar célula.
  </p>
)}
```

**Racional para `activeActionKey` no modo readOnly:**
No modo readOnly, `activeActionKey` não é usado pelo grid (não há pintura), mas a prop é mantida como obrigatória no tipo. O chamador passa uma string vazia `''` ou o primeiro action como fallback. Isto evita tornar a prop opcional (o que poderia quebrar chamadores existentes).

Alternativa: tornar `activeActionKey` opcional com default `''`. É mais limpo para o readOnly mas requer mudança no tipo. A escolha é **manter obrigatória** — o editor de situações passa sempre `activeActionKey` e a página de revisão passa `''`.

### 7.8 Componente: shadcn Pagination

Adicionar via CLI:

```bash
npx shadcn@latest add pagination
```

Isto cria `src/renderer/src/components/ui/pagination.tsx` com:

- `Pagination`, `PaginationContent`, `PaginationItem`
- `PaginationPrevious`, `PaginationNext`, `PaginationLink`
- `PaginationEllipsis`

Usar apenas em `HistoryPage`. O componente de navegação entre mãos usa `Button` simples.

---

## 8. Formatação de Duração

Função utilitária em `src/shared/utils/format.ts` (ou inline no renderer):

```typescript
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}min ${seconds}s`;
}
```

---

## 9. Compatibilidade e Regressão

| Área              | Risco                                 | Mitigação                                                                                          |
| ----------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `RangeGrid13`     | Quebrar pintura no editor             | Props novas são opcionais com default `false`/`null`. Sem alteração em caminhos existentes.        |
| `training.ts` IPC | Conflito de merge                     | Novo módulo `history.ts` separado; `register.ts` apenas adiciona uma linha `registerHistoryIpc()`. |
| Preload           | Quebrar API existente                 | Novos métodos adicionados ao namespace `training` existente; métodos existentes inalterados.       |
| Rotas             | Interferir com `/training/:sessionId` | `/history/:sessionId` é prefixo diferente; sem conflito de rotas.                                  |
| Sidebar           | Layout overflow                       | Uma entrada adicional (7 total); sidebar atual tem espaço.                                         |

**Gate:** `pnpm test` (unit + build + E2E) deve passar antes de considerar a feature concluída.

---

## 10. Riscos e Mitigações

1. **Risco: Performance da query de listagem com subqueries correlacionadas.**
   **Mitigação:** SQLite lida bem com subqueries em tabelas pequenas (< 1000 sessões). O índice em `session_hands.session_id` (FK) garante rapidez nas subqueries. Se necessário no futuro, materializar counts numa coluna `trainingSessions.handsPlayed`.

2. **Risco: `getSessionDetail` carrega muitos rangeCells para sessões com muitas situações.**
   **Mitigação:** Sessões típicas usam 1-5 situações. Cada situação tem ≤ 6 ações, cada ação tem ≤ 169 células. Pior caso: 5 × 6 × 169 = ~5070 registos — aceitável para SQLite local.

3. **Risco: Modificação acidental do RangeGrid13 quebra o editor.**
   **Mitigação:** Testes E2E do editor de situações cobrem a pintura de células. O gate `pnpm test` inclui estes testes.

4. **Risco: `session_hands.situationId` referencia situação soft-deleted.**
   **Mitigação:** O JOIN na query NÃO filtra por `isActive`. Situações arquivadas continuam a aparecer na revisão com o nome original.

---

## 11. Estrutura de Ficheiros

```
src/
├── shared/
│   ├── ipc/types.ts                  # + SessionHistoryItemDto, SessionHandDetailDto, SessionDetailDto, SessionListResponse, SessionHistoryFilters
│   ├── forms/trainingSchemas.ts      # + sessionHistoryFiltersSchema, parseSessionHistoryFilters
│   └── utils/format.ts               # + formatDuration (novo ficheiro)
│
├── main/ipc/
│   ├── history.ts                    # NOVO: registerHistoryIpc()
│   └── register.ts                   # + import + registerHistoryIpc()
│
├── preload/index.ts                  # + training.listSessions, training.getSessionDetail
│
└── renderer/src/
    ├── env.d.ts                      # + tipos das novas funções em window.api.training
    ├── App.tsx                       # + 2 novas rotas
    ├── pages/
    │   ├── HistoryPage.tsx           # NOVO
    │   └── SessionHandReviewPage.tsx # NOVO
    ├── components/
    │   ├── Layout.tsx                # + NavLink "Histórico" na sidebar
    │   ├── grid/
    │   │   └── RangeGrid13.tsx       # + readOnly + highlightCell props
    │   ├── history/
    │   │   ├── SessionReviewHeader.tsx  # NOVO
    │   │   └── HandReviewCard.tsx       # NOVO
    │   └── ui/
    │       └── pagination.tsx        # NOVO (shadcn add)
```

**Total: ~7 ficheiros novos, ~5 ficheiros modificados. Nenhuma migração.**
