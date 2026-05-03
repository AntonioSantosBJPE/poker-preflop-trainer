# Session History — Tasks

**Status:** Complete
**Spec:** `spec.md`
**Design:** `design.md`
**Requisitos foco:** HIST-01..HIST-21

---

## Convenções

- `[P]` = pode executar em paralelo no mesmo bloco
- Cada task tem gate explícito
- Se houver divergência relevante de spec/design: marcar `SPEC_DEVIATION`

---

## Bloco 0 — Fundação (shared types + utilitários)

### T01 — Shared types, Zod schema e formatDuration [P]

**Refs:** HIST-02, HIST-03, HIST-04, HIST-07, HIST-08, HIST-09, HIST-21  
**Prioridade:** P1  
**Bloco:** 0

**O quê:**

1. Adicionar DTOs em `src/shared/ipc/types.ts`: `SessionHistoryItemDto`, `SessionHandDetailDto`, `SessionDetailDto`, `SessionListResponse`, `SessionHistoryFilters`.
2. Adicionar schema Zod `sessionHistoryFiltersSchema` + parser `parseSessionHistoryFilters` em `src/shared/forms/trainingSchemas.ts`.
3. Criar `src/shared/utils/format.ts` com helper `formatDuration(ms)`.

**Where:**

- `src/shared/ipc/types.ts` (editar)
- `src/shared/forms/trainingSchemas.ts` (editar)
- `src/shared/utils/format.ts` (novo)

**Depends on:** (nenhum)

**Reuses:** tipos existentes `CardDto`, `SessionType`, `SimultaneousTableCount`, `ActionType`, `Position`, `RangeCellDto`.

**Done when:**

- `SessionHistoryItemDto` tem campos: `id`, `startedAt`, `finishedAt`, `groupName`, `situationCount`, `totalHands`, `handsPlayed`, `correct`, `accuracy`, `durationMs`, `sessionType`, `simultaneousTableCount`.
- `SessionHandDetailDto` tem campos: `handIndex`, `card1`, `card2`, `situationName`, `situationPosition`, `chosenAction`, `isCorrect`, `responseMs`, `gridCell`, `correctActionIds`.
- `SessionDetailDto` tem campos: `session`, `hands`, `situationActionsMap`.
- `SessionListResponse` tem campos: `items`, `total`, `page`, `pageSize`, `totalPages`.
- `SessionHistoryFilters` tem campos: `page?`, `groupId?`, `sessionType?`, `simultaneousTableCount?`.
- `sessionHistoryFiltersSchema` aceita `page` (int ≥ 1, default 1), `groupId` opcional, `sessionType` enum `'single'|'simultaneous'`, `simultaneousTableCount` union `2|3|4`.
- `formatDuration(ms)` retorna `"Xs"` para < 60s, `"Xmin Ys"` para ≥ 60s.
- `pnpm typecheck` passa.

**Gate:** `pnpm typecheck`

---

### T02 — Preload API + env.d.ts [P]

**Refs:** HIST-02, HIST-11, HIST-20  
**Prioridade:** P1  
**Bloco:** 0

**O quê:**

1. Adicionar `listSessions` e `getSessionDetail` ao namespace `training` em `src/preload/index.ts`.
2. Adicionar declarações de tipo em `src/renderer/src/env.d.ts`.

**Where:**

- `src/preload/index.ts` (editar)
- `src/renderer/src/env.d.ts` (editar)

**Depends on:** T01 (para os tipos)

**Done when:**

- `window.api.training.listSessions(filters)` invoca `'training:listSessions'`.
- `window.api.training.getSessionDetail(sessionId)` invoca `'training:getSessionDetail'`.
- Tipos em `env.d.ts` batem com os DTOs de T01.
- `pnpm typecheck` passa.

**Gate:** `pnpm typecheck`

---

## Bloco 1 — Main process (IPC handlers)

### T03 — IPC handler `history.ts` + registo

**Refs:** HIST-02, HIST-03, HIST-04, HIST-05, HIST-06, HIST-07, HIST-08, HIST-09, HIST-10, HIST-14, HIST-16, HIST-17, HIST-19, HIST-20  
**Prioridade:** P1  
**Bloco:** 1

**O quê:**

1. Criar `src/main/ipc/history.ts` com `registerHistoryIpc()`.
2. Implementar `training:listSessions` — paginação server-side com filtros, JOIN com `situationGroups`, subqueries para `handsPlayed`/`correct`, ordenação por `startedAt DESC`.
3. Implementar `training:getSessionDetail` — sessão + mãos enriquecidas com `correctActionIds` calculados via `evaluateTrainingAnswer()`, `situationActionsMap` para grid.
4. Registar `registerHistoryIpc()` em `src/main/ipc/register.ts`.

**Where:**

- `src/main/ipc/history.ts` (novo)
- `src/main/ipc/register.ts` (editar)

**Depends on:** T01 (tipos + Zod), T02 (preload — os canais são declarados no preload mas definidos aqui)

**Reuses:**

- `requireUserId()` de `src/main/services/session.ts`
- `getDb()` de `src/main/db/client.ts`
- `evaluateTrainingAnswer()` e `handToGridCell()` de `@shared/poker/grid`
- `parseSessionHistoryFilters` de T01
- Padrão de `sessionWhereClause` do `stats.ts` (extrair/reutilizar onde fizer sentido)

**Done when:**

**`training:listSessions`:**

- Sem filtros → retorna página 1 com todas as sessões concluídas do user.
- Com `groupId` → filtra apenas sessões desse grupo.
- Com `sessionType='single'` → filtra apenas sessões individuais.
- Com `sessionType='simultaneous'` + `simultaneousTableCount` → filtra por mesas.
- `page` inválido (< 1) → usa página 1.
- `page` além do total → retorna `items: []`.
- Sessões com `finishedAt = NULL` são omitidas.
- `groupName` pode ser `null` (LEFT JOIN).
- `accuracy = 0` quando `handsPlayed = 0`.
- `durationMs = null` quando `finishedAt = null` (não deve acontecer pois só retorna concluídas, mas defensivo).
- `totalPages = Math.ceil(total / 10)`.
- Apenas sessões do `userId` autenticado são retornadas.

**`training:getSessionDetail`:**

- `sessionId` inexistente → lança `'Sessão não encontrada'`.
- `sessionId` de outro user → lança `'Sessão não encontrada'`.
- Retorna `session` com stats calculados (accuracy, durationMs).
- Retorna `hands` ordenadas por `handIndex ASC`.
- Cada hand tem `correctActionIds` calculados corretamente.
- `chosenAction = null` quando `chosenActionId = null` (timeout).
- `situationActionsMap` indexado por `situationId` contém actions + rangeCells.
- Situações/grupos arquivados continuam a aparecer (sem filtrar por `isActive`).

**Gate:** `pnpm typecheck` + `pnpm test:unit src/main/ipc/history.test.ts` (criado em T04)

---

### T04 — Unit tests `history.test.ts` [P — com T03]

**Refs:** HIST-02..HIST-11, HIST-14, HIST-16, HIST-17, HIST-19, HIST-20  
**Prioridade:** P1  
**Bloco:** 1

**O quê:** Criar testes unitários para ambos os handlers IPC de `history.ts`.

**Where:** `src/main/ipc/history.test.ts` (novo)

**Depends on:** T03 (handler implementado), T01 (tipos)

**Reuses:** Padrão `vi.mock('better-sqlite3')` + `drizzle-orm/sql-js` dos testes existentes (`groups.test.ts`, `training.test.ts`).

**Done when:**

**`training:listSessions`:**

- Lista vazia (sem sessões) → `items: []`, `total: 0`, `totalPages: 0`.
- Lista com 5 sessões → `items` tem 5, `total: 5`, `totalPages: 1`.
- Lista com 25 sessões → página 1 tem 10 itens, `totalPages: 3`.
- Página 3 com 25 sessões → 5 itens.
- Filtro `groupId` → apenas sessões do grupo.
- Filtro `sessionType` → apenas do tipo.
- Filtro `simultaneousTableCount` → apenas com N mesas.
- Sessões inacabadas (`finishedAt = null`) não aparecem.
- `accuracy` calculado: 8/10 → 0.8.
- `groupName = null` quando `groupId` é null.
- `requireUserId` bloqueia sem autenticação.

**`training:getSessionDetail`:**

- Sessão encontrada → retorna session + hands + situationActionsMap.
- `correctActionIds` corretos para mão acertada.
- `correctActionIds` corretos para mão errada.
- Timeout hand → `chosenAction = null`, `isCorrect = false`.
- FOLD implícito (range vazio) → `correctActionIds` contém FOLD.
- Sessão de outro user → erro `'Sessão não encontrada'`.
- Situação arquivada → nome aparece normalmente.

**Tests estimados:** ~18 testes (12 para listSessions, 6 para getSessionDetail)

**Gate:** `pnpm test:unit src/main/ipc/history.test.ts` passa

---

## Bloco 2 — Renderer foundations (componentes base, independentes)

### T05 — shadcn Pagination [P]

**Refs:** HIST-04  
**Prioridade:** P1  
**Bloco:** 2 [P]

**O quê:** Adicionar componente `Pagination` da shadcn/ui.

**Where:** `src/renderer/src/components/ui/pagination.tsx` (novo, gerado por CLI)

**Depends on:** (nenhum — apenas shadcn CLI instalado)

**Reuses:** —

**Done when:**

- `npx shadcn@latest add pagination` executa com sucesso.
- Ficheiro `pagination.tsx` existe em `src/renderer/src/components/ui/`.
- `pnpm typecheck` passa (sem erros de import).
- Componentes exportados: `Pagination`, `PaginationContent`, `PaginationItem`, `PaginationLink`, `PaginationPrevious`, `PaginationNext`, `PaginationEllipsis`.

**Gate:** `pnpm typecheck`

---

### T06 — RangeGrid13 readOnly + highlightCell [P]

**Refs:** HIST-14  
**Prioridade:** P1  
**Bloco:** 2 [P]

**O quê:** Estender `RangeGrid13` com props `readOnly` (default `false`) e `highlightCell` (default `null`).

**Where:** `src/renderer/src/components/grid/RangeGrid13.tsx` (editar)

**Depends on:** (nenhum)

**Reuses:** Renderização de células existente (gradients, labels, grid bounds).

**Done when:**

- `readOnly=true` → células são `<div>` (não `<button>`), sem mouse handlers.
- `readOnly=true` → `onContextMenu` continua prevenido.
- `readOnly=true` → footer de ajuda não é renderizado.
- `readOnly=true` → `onMouseLeave`/`onMouseUp` do container são no-ops.
- `readOnly=false` → comportamento de edição inalterado (pintar, apagar, drag).
- `highlightCell` definido → célula alvo tem classe `ring-2 ring-inset ring-amber-400`.
- `highlightCell` nulo/undefined → nenhuma célula destacada.
- `activeActionKey` continua como prop obrigatória (passa-se `''` no modo readOnly).
- Testes E2E do editor de situações continuam a passar.

**Gate:** `pnpm typecheck` + `pnpm test:unit` (não deve quebrar testes existentes)

---

## Bloco 3 — Renderer pages

### T07 — Unit test `formatDuration.test.ts` [P com Bloco 3]

**Refs:** HIST-03  
**Prioridade:** P2  
**Bloco:** 3

**O quê:** Testes unitários para `formatDuration`.

**Where:** `src/shared/utils/format.test.ts` (novo)

**Depends on:** T01

**Reuses:** Vitest padrão.

**Done when:**

- `formatDuration(0)` → `"0s"`.
- `formatDuration(30000)` → `"30s"`.
- `formatDuration(60000)` → `"1min 0s"`.
- `formatDuration(125000)` → `"2min 5s"`.
- `formatDuration(3600000)` → `"60min 0s"`.

**Tests:** 5 testes

**Gate:** `pnpm test:unit src/shared/utils/format.test.ts` passa

---

### T08 — HistoryPage (`/history`)

**Refs:** HIST-01 (parcial — sidebar é T11), HIST-02, HIST-03, HIST-04, HIST-05, HIST-06, HIST-07, HIST-08, HIST-09, HIST-10, HIST-21  
**Prioridade:** P1  
**Bloco:** 3

**O quê:** Implementar a página de histórico de sessões com tabela, filtros e paginação.

**Where:** `src/renderer/src/pages/HistoryPage.tsx` (novo)

**Depends on:** T02 (preload), T05 (shadcn Pagination), T07 (formatDuration)

**Reuses:**

- `EntityTable` de `@/components/app`
- `FilterToolbar` + `FilterToolbarRow` de `@/components/app`
- `PageHeader` de `@/components/app`
- `EmptyState` de `@/components/app`
- `StatCard` de `@/components/app` (se necessário para overview)
- `Tabs`, `TabsList`, `TabsTrigger` de `@/components/ui/tabs`
- `Label` de `@/components/ui/label`
- `Badge` de `@/components/ui/badge`
- `Skeleton` de `@/components/ui/skeleton`
- `Pagination*` de T05
- Padrão de filtros + fetch do `StatsPage` (useEffect encadeado)

**Done when:**

**Estado e dados:**

- Carrega lista de grupos via `window.api.groups.list()` no mount.
- Estado inicial lido de `useSearchParams()`: `page`, `groupId`, `sessionType`, `tableCount`.
- Fetch `window.api.training.listSessions(filters)` a cada mudança de filtro/página.
- Loading state com Skeleton enquanto fetch está em curso.
- Alteração de filtro reseta `page = 1`.

**UI — Filtros:**

- Tabs horizontais: "Todos" + um tab por grupo (padrão StatsPage T-06).
- Select "Tipo de sessão": Todos / Individual / Simultâneo.
- Select "Mesas simultâneas": Todas / 2 / 3 / 4 (desabilitado se tipo ≠ Simultâneo).
- Filtros sincronizados com query params.

**UI — Tabela:**

- Colunas: Data, Grupo, Situações, Resultado, Duração, Tipo, Mãos.
- Data formatada com `toLocaleString('pt-BR')`.
- Tipo renderizado como `<Badge>`: "Individual" ou "Simultâneo (N)".
- Resultado formatado como percentagem (ex: "75.0%").
- Duração formatada com `formatDuration`.
- Cada linha é clicável → `navigate(\`/history/${row.id}${location.search}\`)`.
- `data-testid="history-sessions-table"` na EntityTable.

**UI — Paginação:**

- Componente shadcn Pagination com Previous/Next + números de página.
- Previous desabilitado na página 1.
- Next desabilitado na última página.
- Número total de páginas calculado de `data.totalPages`.

**UI — Empty state:**

- "Nenhuma sessão encontrada" com descrição contextual quando `items.length === 0 && !loading`.

**UI — Query params:**

- `useSearchParams` bidirecional: ler no mount, escrever em cada mudança.
- URL exemplo: `/history?page=2&groupId=3&sessionType=simultaneous&tableCount=4`.

**Gate:** `pnpm typecheck`

---

### T09 — SessionHandReviewPage (`/history/:sessionId`)

**Refs:** HIST-11, HIST-12, HIST-13, HIST-14, HIST-15, HIST-16, HIST-17, HIST-18  
**Prioridade:** P1  
**Bloco:** 3

**O quê:** Implementar a página de revisão mão a mão + componentes `SessionReviewHeader` e `HandReviewCard`.

**Where:**

- `src/renderer/src/pages/SessionHandReviewPage.tsx` (novo)
- `src/renderer/src/components/history/SessionReviewHeader.tsx` (novo)
- `src/renderer/src/components/history/HandReviewCard.tsx` (novo)

**Depends on:** T02 (preload), T06 (RangeGrid13 readOnly), T07 (formatDuration)

**Reuses:**

- `PageHeader` de `@/components/app`
- `StatCard` de `@/components/app`
- `Badge` de `@/components/ui/badge`
- `Button` de `@/components/ui/button`
- `Card` de `@/components/ui/card`
- `RangeGrid13` de `@/components/grid` (com novas props)
- `Skeleton` de `@/components/ui/skeleton`

**Done when:**

**Página (`SessionHandReviewPage`):**

- Carrega `window.api.training.getSessionDetail(sessionId)` no mount.
- Sessão não encontrada → mensagem de erro + link para `/history`.
- Sessão encontrada → renderiza `SessionReviewHeader` + `HandReviewCard`.
- Estado `currentHandIndex` começa em 0.
- `location.search` preservado para o link "Voltar".
- Loading state com Skeleton.

**SessionReviewHeader:**

- Grid de 4 StatCards: Data, Acerto (%), Duração, Mãos.
- `data-testid="session-review-header"`.

**HandReviewCard:**

- Indicador "Mão X de N" no topo.
- Hole cards renderizadas com naipes coloridos (♠♣ preto, ♥♦ vermelho).
- Nome da situação + posição.
- Feedback de acerto/erro:
  - Acerto: `Badge` verde com `✓` + nome da ação escolhida.
  - Erro: `Badge` vermelho com `✗` + ação escolhida + ações corretas listadas.
  - Timeout: `Badge` vermelho com "⏱ Timeout".
- Tempo de resposta em segundos (ex: "2.3s").
- `RangeGrid13` com `readOnly={true}`, `highlightCell={hand.gridCell}`, actions mapeadas com `clientKey = String(id)`, `activeActionKey=''`.
- Legenda abaixo do grid: cada ação com bolinha colorida + nome.
- Navegação entre mãos:
  - Botão "← Anterior" (desabilitado na primeira mão).
  - Indicador "X / N".
  - Botão "Próxima →" (desabilitado na última mão).
- `data-testid="hand-review-card"`.

**Gate:** `pnpm typecheck`

---

### T10 — Sidebar + Routes [P com T08, T09]

**Refs:** HIST-01  
**Prioridade:** P1  
**Bloco:** 3

**O quê:**

1. Adicionar `NavLink` "Histórico" na sidebar (`Layout.tsx`).
2. Adicionar rotas `/history` e `/history/:sessionId` em `App.tsx`.

**Where:**

- `src/renderer/src/components/Layout.tsx` (editar)
- `src/renderer/src/App.tsx` (editar)

**Depends on:** T08 (HistoryPage existe), T09 (SessionHandReviewPage existe)

**Reuses:** Padrão `NavLink` existente com `navLinkClass`.

**Done when:**

- Sidebar tem entrada "Histórico" entre "Treino Simultâneo" e "Estatísticas".
- `<Route path="/history" element={<HistoryPage />} />` em `App.tsx`.
- `<Route path="/history/:sessionId" element={<SessionHandReviewPage />} />` em `App.tsx`.
- Navegação pelo menu alcança `/history`.
- `pnpm typecheck` passa.

**Gate:** `pnpm typecheck`

---

## Bloco 4 — Testes unitários de renderer (P2)

### T11 — Unit tests para HistoryPage [P]

**Refs:** HIST-02, HIST-03, HIST-04, HIST-05, HIST-07, HIST-08, HIST-10  
**Prioridade:** P2  
**Bloco:** 4 [P]

**O quê:** Testes unitários para os estados da `HistoryPage`.

**Where:** `src/renderer/src/pages/HistoryPage.test.tsx` (novo)

**Depends on:** T08

**Reuses:** Padrão `// @vitest-environment jsdom` + `render` + `screen` + `vi.mock` de `window.api`.

**Done when:**

- Loading state: renderiza Skeleton.
- Empty state: mensagem "Nenhuma sessão encontrada".
- Dados populados: tabela com linhas, colunas Data/Grupo/Resultado visíveis.
- Clique na linha: `navigate` chamado com `/history/:id`.
- Paginação visível quando `totalPages > 1`.
- Filtro de grupo altera `groupId` nos query params.

**Tests estimados:** ~8 testes

**Gate:** `pnpm test:unit src/renderer/src/pages/HistoryPage.test.tsx` passa

---

### T12 — Unit tests para SessionHandReviewPage + HandReviewCard [P]

**Refs:** HIST-12, HIST-13, HIST-14, HIST-15, HIST-16  
**Prioridade:** P2  
**Bloco:** 4 [P]

**O quê:** Testes unitários para a página de revisão e componentes.

**Where:**

- `src/renderer/src/pages/SessionHandReviewPage.test.tsx` (novo)
- `src/renderer/src/components/history/HandReviewCard.test.tsx` (novo)

**Depends on:** T09

**Reuses:** Padrão `// @vitest-environment jsdom` + mock `window.api.training.getSessionDetail`.

**Done when:**

**SessionHandReviewPage.test.tsx:**

- Loading state: Skeleton visível.
- Erro (sessão não encontrada): mensagem de erro + link voltar.
- Dados carregados: header + primeira mão renderizada.
- Navegação anterior/próxima: botões chamam handlers corretos.

**HandReviewCard.test.tsx:**

- Mão correta: Badge verde com `✓`.
- Mão errada: Badge vermelho com `✗`.
- Timeout: Badge "Timeout".
- Grid renderizado com prop `readOnly`.
- Botão anterior desabilitado em `handIndex === 0`.
- Botão próxima desabilitado em `handIndex === totalHands - 1`.

**Tests estimados:** ~10 testes (5 + 5)

**Gate:** `pnpm test:unit src/renderer/src/pages/SessionHandReviewPage.test.tsx src/renderer/src/components/history/HandReviewCard.test.tsx` passa

---

## Bloco 5 — E2E

### T13 — E2E: navegação e listagem [P]

**Refs:** HIST-01, HIST-02, HIST-03, HIST-05, HIST-06  
**Cobre:** E2E-HIST-01, E2E-HIST-02, E2E-HIST-06  
**Prioridade:** P1  
**Bloco:** 5 [P]

**O quê:** Spec E2E para sidebar, listagem de sessões e empty state.

**Where:** `e2e/session-history/list.spec.ts` (novo)

**Depends on:** T10 (sidebar + routes + HistoryPage completos)

**Reuses:** Fixtures `PT_E2E_*`, padrão de auth/login dos E2E existentes.

**Done when:**

- E2E-HIST-01: Login → sidebar mostra "Histórico" → clique navega para `/history`.
- E2E-HIST-02: Após criar e concluir sessão de treino → `/history` mostra linha com data, grupo, acerto %, duração, badges.
- E2E-HIST-06: User sem sessões → `/history` mostra empty state.

**Gate:** `pnpm playwright test e2e/session-history/list.spec.ts`

---

### T14 — E2E: paginação e filtros [P]

**Refs:** HIST-04, HIST-07, HIST-08, HIST-09, HIST-10  
**Cobre:** E2E-HIST-03, E2E-HIST-04, E2E-HIST-05  
**Prioridade:** P1  
**Bloco:** 5 [P]

**O quê:** Spec E2E para paginação e filtros.

**Where:** `e2e/session-history/pagination.spec.ts` (novo)

**Depends on:** T10

**Reuses:** Fixtures E2E, padrão de criação de múltiplas sessões.

**Done when:**

- E2E-HIST-03: Criar 12+ sessões → página 1 mostra 10 → clique "Próxima" → página 2 mostra restantes.
- E2E-HIST-04: Selecionar grupo → apenas sessões desse grupo visíveis.
- E2E-HIST-05: Selecionar "Individual" → apenas sessões single visíveis. Selecionar "Simultâneo" → apenas simultâneas.

**Gate:** `pnpm playwright test e2e/session-history/pagination.spec.ts`

---

### T15 — E2E: revisão mão a mão [P]

**Refs:** HIST-11, HIST-12, HIST-13, HIST-14, HIST-15, HIST-16, HIST-17  
**Cobre:** E2E-HIST-07, E2E-HIST-08, E2E-HIST-09, E2E-HIST-10, E2E-HIST-11  
**Prioridade:** P1  
**Bloco:** 5 [P]

**O quê:** Spec E2E para drill-down e revisão de mãos.

**Where:** `e2e/session-history/hand-review.spec.ts` (novo)

**Depends on:** T09, T10

**Reuses:** Fixtures E2E, criação de sessão com mãos conhecidas.

**Done when:**

- E2E-HIST-07: Clicar sessão no histórico → navega para `/history/:sessionId` → header com data/acerto/duração/mãos → primeira mão visível.
- E2E-HIST-08: Navegar com "Próxima" até à última mão → botão desabilitado. Navegar "Anterior" até à primeira → botão desabilitado.
- E2E-HIST-09: Grid 13×13 visível com célula da mão destacada (`data-testid` na célula com `ring-amber-400`).
- E2E-HIST-10: Mão errada → indicador visual de erro (cross/texto vermelho). Mão certa → indicador de acerto (check/texto verde).
- E2E-HIST-11: Criar sessão com timeout → hand mostra "Timeout" como ação.

**Gate:** `pnpm playwright test e2e/session-history/hand-review.spec.ts`

---

### T16 — E2E: navegação de volta e erros [P]

**Refs:** HIST-18, HIST-20  
**Cobre:** E2E-HIST-12, E2E-HIST-13  
**Prioridade:** P1  
**Bloco:** 5 [P]

**O quê:** Spec E2E para back-navigation e tratamento de erros.

**Where:** `e2e/session-history/back-navigation.spec.ts` (novo)

**Depends on:** T08, T09, T10

**Reuses:** Fixtures E2E.

**Done when:**

- E2E-HIST-12: Aplicar filtros no histórico → entrar numa sessão → clicar "Voltar ao histórico" → filtros e página preservados.
- E2E-HIST-13: Navegar para `/history/99999` (sessão inexistente) → mensagem de erro clara.

**Gate:** `pnpm playwright test e2e/session-history/back-navigation.spec.ts`

---

### T17 — Suite E2E completa da feature

**Refs:** HIST-01..HIST-21  
**Prioridade:** P1  
**Bloco:** 5

**O quê:** Executar todos os specs E2E de `session-history` e validar consistência.

**Depends on:** T13, T14, T15, T16

**Done when:** `pnpm playwright test e2e/session-history/` passa com 0 falhas, 3 execuções consecutivas sem flaky.

**Gate:** `pnpm playwright test e2e/session-history/`

---

## Bloco 6 — Fechamento

### T18 — Requirement traceability update

**Refs:** HIST-01..HIST-21  
**Prioridade:** P1  
**Bloco:** 6

**O quê:** Actualizar status dos requisitos em `spec.md` (checkbox `[x]`) conforme implementação e testes concluídos.

**Depends on:** T17

**Gate:** Revisão manual — todos os HIST-01..21 marcados como `[x]`.

---

### T19 — Gate final de qualidade

**Refs:** Todos  
**Prioridade:** P1  
**Bloco:** 6

**O quê:** Executar pipeline completa de qualidade.

**Comandos:**

1. `pnpm test:unit` — todos os testes unitários passam.
2. `pnpm test:unit --coverage` — thresholds mantidos (≥ 80/75/85/80).
3. `pnpm playwright test e2e/session-history/` — suite E2E verde.
4. `pnpm test` (quando ambiente local completo) — unit + build + E2E.

**Depends on:** T18

**Done when:** Todos os comandos retornam exit code 0.

---

## Resumo por bloco

| Bloco           | Tasks        | Ficheiros novos                                                                  | Ficheiros editados                   | Dep           |
| --------------- | ------------ | -------------------------------------------------------------------------------- | ------------------------------------ | ------------- |
| 0 — Fundação    | T01, T02 [P] | 1 (`format.ts`)                                                                  | 2 (`types.ts`, `trainingSchemas.ts`) | —             |
| 0 — Fundação    | T02          | 0                                                                                | 2 (`preload/index.ts`, `env.d.ts`)   | T01           |
| 1 — Main IPC    | T03, T04     | 2 (`history.ts`, `history.test.ts`)                                              | 1 (`register.ts`)                    | T01, T02      |
| 2 — Foundations | T05, T06 [P] | 1 (`pagination.tsx`)                                                             | 1 (`RangeGrid13.tsx`)                | —             |
| 3 — Pages       | T07          | 1 (`format.test.ts`)                                                             | 0                                    | T01           |
| 3 — Pages       | T08          | 1 (`HistoryPage.tsx`)                                                            | 0                                    | T02, T05, T07 |
| 3 — Pages       | T09          | 3 (`SessionHandReviewPage.tsx`, `SessionReviewHeader.tsx`, `HandReviewCard.tsx`) | 0                                    | T02, T06, T07 |
| 3 — Pages       | T10          | 0                                                                                | 2 (`Layout.tsx`, `App.tsx`)          | T08, T09      |
| 4 — Unit tests  | T11, T12 [P] | 3 (`*.test.tsx`)                                                                 | 0                                    | T08, T09      |
| 5 — E2E         | T13..T17     | 4 (`*.spec.ts`)                                                                  | 0                                    | T10           |
| 6 — Fechamento  | T18, T19     | 0                                                                                | 1 (`spec.md`)                        | Todos         |

**Total:** ~16 ficheiros novos, ~9 ficheiros editados, 0 migrações.

## Fluxo de dependências

```
T01 (shared types) ──┬── T02 (preload) ──┬── T03 (IPC handler) ── T04 (IPC tests)
                     │                   │
                     │                   ├── T08 (HistoryPage) ─── T11 (HistoryPage tests)
                     │                   │       │
                     │                   │       ├── T10 (sidebar+routes)
                     │                   │       │       │
                     │                   │       │       ├── T13 (E2E list)
                     │                   │       │       ├── T14 (E2E pagination)
                     │                   │       │       ├── T15 (E2E hand review)
                     │                   │       │       └── T16 (E2E back nav)
                     │                   │       │
                     │                   │       └── T09 (ReviewPage) ── T12 (Review tests)
                     │                   │
                     │                   └── T07 (formatDuration) ─── T07 (format tests)
                     │
                     ├── T05 (shadcn Pagination) [P]
                     └── T06 (RangeGrid13 readOnly) [P]
```

---

## Status

| Task                                         | Status  | Gate                                          |
| -------------------------------------------- | ------- | --------------------------------------------- |
| T01 — Shared types + Zod + formatDuration    | ✅ Done | `pnpm typecheck`                              |
| T02 — Preload API + env.d.ts                 | ✅ Done | `pnpm typecheck`                              |
| T03 — IPC handler history.ts                 | ✅ Done | `pnpm test:unit src/main/ipc/history.test.ts` |
| T04 — Unit tests history.test.ts             | ✅ Done | 15 testes verdes                              |
| T05 — shadcn Pagination                      | ✅ Done | `pnpm typecheck`                              |
| T06 — RangeGrid13 readOnly + highlightCell   | ✅ Done | `pnpm test:unit` (316 ✅)                     |
| T07 — Unit test formatDuration               | ✅ Done | `pnpm test:unit`                              |
| T08 — HistoryPage                            | ✅ Done | `pnpm typecheck`                              |
| T09 — SessionHandReviewPage + components     | ✅ Done | `pnpm typecheck`                              |
| T10 — Sidebar + Routes                       | ✅ Done | `pnpm typecheck`                              |
| T11 — Unit tests HistoryPage                 | ✅ Done | `pnpm test:unit`                              |
| T12 — Unit tests ReviewPage + HandReviewCard | ✅ Done | `pnpm test:unit`                              |
| T13 — E2E list + empty state                 | ✅ Done | `pnpm playwright test`                        |
| T14 — E2E pagination + filters               | ✅ Done | `pnpm playwright test`                        |
| T15 — E2E hand review                        | ✅ Done | `pnpm playwright test`                        |
| T16 — E2E back nav + errors                  | ✅ Done | `pnpm playwright test`                        |
| T17 — E2E suite completa                     | ✅ Done | `pnpm playwright test e2e/session-history/`   |
| T18 — Requirement traceability               | ✅ Done | Revisão manual                                |
| T19 — Gate final                             | ✅ Done | `pnpm test`                                   |
