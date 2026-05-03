# Spec: Histórico de Sessões com Revisão Mão a Mão

**Feature:** SESSION-HISTORY  
**Data:** 2026-05-02  
**Âmbito:** Página de histórico de todas as sessões passadas com paginação server-side. Drill-down para revisão mão a mão com visualização do range correto no grid 13×13.

---

## Problem Statement

O produto hoje permite ao utilizador ver o resultado de uma sessão imediatamente após finalizá-la (`TrainingResultPage`), mas esta página é efémera — após navegar para outra rota, o resultado é inacessível. A página de estatísticas (`/stats`) agrega dados globalmente, mas o utilizador não tem como:

1. Navegar por todas as sessões passadas de forma cronológica.
2. Revisar cada mão individual para perceber onde errou e qual era o range correto.

Sem esta funcionalidade, o ciclo de aprendizagem fica truncado: o utilizador vê o agregado mas não consegue estudar os erros pontuais com contexto visual.

---

## Goals

- [x] Nova entrada "Histórico" na sidebar de navegação.
- [x] Página `/history` com lista paginada de sessões passadas (data, grupo, situações, acerto %, duração, tipo).
- [x] Filtros por grupo e tipo de sessão (single/simultaneous) na página de histórico.
- [x] Server-side pagination com página controlada por query params e query do lado main.
- [x] Cada linha da lista é clicável → drill-down para revisão mão a mão em `/history/:sessionId`.
- [x] Na revisão, cada mão mostra: hole cards, situação, ação escolhida, se acertou, e o grid 13×13 com o range da situação e a célula da mão destacada.
- [x] Navegação entre mãos (anterior/próxima) com indicador de progresso.

---

## Out of Scope

| Item                                                     | Reason                                                    |
| -------------------------------------------------------- | --------------------------------------------------------- |
| Exportar histórico (CSV/JSON)                            | Fora do MVP; funcionalidade de export futuro              |
| Filtro por data (date range)                             | Complexidade de UX adicional; dados já ordenados por data |
| Revisão interativa (refazer mão)                         | Fora do escopo desta feature; é treino, não revisão       |
| Agregação por bloco de sessão simultânea                 | Sessões simultâneas usam `sessionBlockId`; agrupamento é P2 |
| Alterações ao schema da BD                               | Schema atual (`trainingSessions` + `sessionHands`) já cobre todos os dados necessários |

---

## User Stories

### P1: Lista de sessões passadas com paginação ⭐ MVP

**User Story:** Como utilizador, quero ver uma lista cronológica de todas as minhas sessões de treino já concluídas, com paginação, para rever o meu progresso histórico.

**Acceptance Criteria:**

1. WHEN o utilizador navega para `/history` THEN o sistema SHALL exibir uma tabela com as sessões passadas ordenadas por data de início (mais recente primeiro).
2. WHEN existem mais sessões do que o tamanho da página THEN o sistema SHALL exibir controlos de paginação (anterior/próxima + número da página).
3. WHEN o utilizador muda de página THEN o sistema SHALL carregar apenas os dados da página solicitada (server-side pagination).
4. WHEN não existem sessões THEN o sistema SHALL exibir empty state com mensagem clara.
5. WHEN uma sessão não tem `finishedAt` (inacabada) THEN o sistema SHALL omite-la da listagem.

**Detalhe de cada linha da tabela:**

| Coluna         | Fonte / Cálculo                                                                   |
| -------------- | --------------------------------------------------------------------------------- |
| Data           | `training_sessions.startedAt` formatado (dd/mm/aaaa HH:mm)                        |
| Grupo          | `situation_groups.name` via JOIN (`groupId`)                                      |
| Situações      | Nº de situações (`JSON.parse(situationIdsJson).length`)                           |
| Resultado      | `%` acerto = `COUNT(sessionHands WHERE isCorrect) / COUNT(sessionHands)` × 100    |
| Duração        | `finishedAt - startedAt` formatado (Xmin Ys)                                      |
| Tipo           | Badge "Individual" ou "Simultâneo (N mesas)"                                      |
| Mãos           | `totalHands`                                                                      |

**Independent Test:** Navegar para `/history`, verificar tabela populada, mudar de página, confirmar ordenação cronológica inversa.

---

### P1: Filtros por grupo e tipo de sessão ⭐ MVP

**User Story:** Como utilizador, quero filtrar o histórico por grupo de situações e por tipo de sessão (individual vs simultâneo) para encontrar sessões específicas rapidamente.

**Acceptance Criteria:**

1. WHEN o utilizador seleciona um grupo no filtro THEN o sistema SHALL listar apenas sessões desse grupo.
2. WHEN o utilizador seleciona "Todos" THEN o sistema SHALL listar sessões de todos os grupos.
3. WHEN o utilizador alterna entre "Individual" / "Simultâneo" / "Todos" THEN o sistema SHALL filtrar por `sessionType`.
4. WHEN um filtro é alterado THEN o sistema SHALL resetar a paginação para a página 1.
5. WHEN o filtro "Simultâneo" está selecionado THEN o sistema SHALL exibir filtro adicional de quantidade de mesas (2/3/4/Todas), seguindo o mesmo padrão da página de stats.

**Independent Test:** Filtrar por grupo X, confirmar que apenas sessões do grupo X aparecem. Filtrar por "Simultâneo", confirmar que apenas sessões simultâneas aparecem. Combinar filtros e validar interseção.

---

### P1: Drill-down para revisão mão a mão ⭐ MVP

**User Story:** Como utilizador, quero clicar numa sessão do histórico e ver cada mão que joguei, com a mão sorteada, a ação que tomei, se acertei, e o range correto visualizado no grid 13×13, para estudar os meus erros.

**Acceptance Criteria:**

1. WHEN o utilizador clica numa linha da lista THEN o sistema SHALL navegar para `/history/:sessionId`.
2. WHEN a página de revisão carrega THEN o sistema SHALL exibir um cabeçalho com: data da sessão, grupo, acerto %, duração, nº de mãos.
3. WHEN a página de revisão carrega THEN o sistema SHALL exibir a primeira mão da sessão.
4. WHEN uma mão é exibida THEN o sistema SHALL mostrar:
   - As duas hole cards (ex: `A♠ K♥`)
   - O nome da situação e posição
   - A ação escolhida pelo utilizador com indicador visual de acerto/erro (check verde / cross vermelho)
   - O tempo de resposta em ms
   - O grid 13×13 com o range completo da situação pintado e a célula correspondente à mão destacada (borda ou overlay)
5. WHEN o utilizador clica em "Anterior" / "Próxima" THEN o sistema SHALL navegar entre as mãos da sessão.
6. WHEN a mão atual é a primeira THEN o botão "Anterior" SHALL estar desabilitado.
7. WHEN a mão atual é a última THEN o botão "Próxima" SHALL estar desabilitado.
8. WHEN o utilizador acertou (FOLD quando range vazio) THEN o sistema SHALL indicar "Fold (correto)" como ação escolhida.

**Comportamento do grid na revisão:**

- O grid renderiza o range **completo** da situação (todas as ações × rangeCells), igual ao editor de situações.
- A célula correspondente à mão do utilizador recebe um **destaque visual** (borda contrastante, ex: ring ou glow).
- O grid é **read-only** — não permite pintar/editar.
- A legenda mostra as ações com as respetivas cores (reaproveitar do editor de situações).

**Independent Test:** Clicar numa sessão com 10 mãos, verificar que a primeira mão carrega com grid correto. Navegar com anterior/próxima. Confirmar que mão errada mostra cross vermelho e range correto no grid. Confirmar que navegação circular não acontece (bloqueio nos extremos).

---

### P2: Persistência de estado de navegação nos filtros

**User Story:** Como utilizador, quero que os filtros e a página atual sejam mantidos nos query params da URL para poder partilhar ou guardar o estado da página.

**Acceptance Criteria:**

1. WHEN o utilizador aplica filtros ou muda de página THEN o sistema SHALL reflectir `groupId`, `sessionType`, `tableCount`, e `page` nos query params da URL.
2. WHEN o utilizador acede diretamente a um URL com query params THEN o sistema SHALL aplicar os filtros correspondentes.
3. WHEN o utilizador navega para trás (browser back) THEN o sistema SHALL restaurar o estado anterior dos filtros e página.

---

### P2: Navegação e acessibilidade

**User Story:** Como utilizador, quero uma experiência de navegação fluida entre histórico, revisão e outras páginas.

**Acceptance Criteria:**

1. WHEN o utilizador está na página de revisão THEN o sistema SHALL exibir um link "Voltar ao histórico" que preserva os filtros e página atuais (via query params no referrer ou state).
2. WHEN a sidebar é renderizada THEN o sistema SHALL exibir a entrada "Histórico" com ícone consistente (reutilizar padrão de ícones existente).
3. WHEN o utilizador acede `/history/:sessionId` diretamente e a sessão não existe ou pertence a outro utilizador THEN o sistema SHALL exibir mensagem de erro clara.

---

## Edge Cases

- WHEN uma sessão tem 0 mãos (`totalHands` = 0 ou sem rows em `sessionHands`) THEN o sistema SHALL exibir "0%" de acerto e duração "—".
- WHEN uma sessão foi criada (`startedAt` preenchido) mas nunca finalizada (`finishedAt` = NULL) THEN o sistema SHALL omiti-la da listagem de histórico.
- WHEN uma mão teve timeout THEN `chosenActionId` é NULL → o sistema SHALL exibir "Timeout" como ação escolhida e marcar como erro.
- WHEN uma situação usada na sessão foi arquivada (soft-delete) posteriormente THEN o sistema SHALL continuar a mostrar o nome da situação (JOIN não filtra por `isActive`).
- WHEN um grupo foi arquivado posteriormente THEN o sistema SHALL continuar a mostrar o nome do grupo.
- WHEN a sessão não tem `groupId` (null) THEN o sistema SHALL exibir "—" na coluna de grupo.
- WHEN o utilizador navega rapidamente entre mãos (cliques consecutivos) THEN o sistema SHALL prevenir race conditions (debounce ou bloqueio durante carregamento).

---

## Testing Strategy

### Unit/Integration (suporte)

| Camada                   | O que validar                                                                     | Prioridade |
| ------------------------ | --------------------------------------------------------------------------------- | ---------- |
| Shared types             | Novos DTOs (`SessionHistoryItemDto`, `SessionHandDetailDto`, paginação)           | P1         |
| Main IPC handlers        | `training:listSessions` com paginação, filtros e JOINs corretos                   | P1         |
| Main IPC handlers        | `training:getSessionDetail` com hands enriquecidas + rangeCells                   | P1         |
| Main IPC handlers        | Validação de parâmetros (page ≥ 1, pageSize ∈ [10, 50])                           | P1         |
| Main IPC handlers        | Segurança: `requireUserId` impede acesso a sessões de outros users                | P1         |
| Renderer components      | `SessionHistoryList` — renderização de estados (loading, empty, dados, erro)      | P2         |
| Renderer components      | `HandReviewCard` — grid com highlight + indicadores de acerto/erro                | P2         |
| Renderer hooks           | `useHistoryParams` — sincronização filtros ↔ query params                         | P2         |

### E2E (Playwright + Electron) — Cobertura obrigatória

| Test ID       | Critério coberto                                                                              | Ficheiro sugerido                             |
| ------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------- |
| E2E-HIST-01   | Sidebar exibe "Histórico" e navega para `/history`                                            | `e2e/session-history/navigation.spec.ts`      |
| E2E-HIST-02   | Lista exibe sessões com dados corretos (data, grupo, acerto %, duração, tipo, mãos)          | `e2e/session-history/list.spec.ts`            |
| E2E-HIST-03   | Paginação funciona: muda página, dados atualizam, controlos respondem                         | `e2e/session-history/pagination.spec.ts`      |
| E2E-HIST-04   | Filtro por grupo limita resultados                                                            | `e2e/session-history/filters.spec.ts`         |
| E2E-HIST-05   | Filtro por tipo de sessão (single/simultaneous) funciona                                      | `e2e/session-history/filters.spec.ts`         |
| E2E-HIST-06   | Empty state quando não há sessões                                                             | `e2e/session-history/empty-state.spec.ts`     |
| E2E-HIST-07   | Drill-down para `/history/:sessionId` mostra cabeçalho e primeira mão                         | `e2e/session-history/hand-review.spec.ts`     |
| E2E-HIST-08   | Navegação entre mãos (anterior/próxima) com bloqueio nos extremos                             | `e2e/session-history/hand-review.spec.ts`     |
| E2E-HIST-09   | Grid 13×13 mostra range e célula da mão destacada                                             | `e2e/session-history/hand-review.spec.ts`     |
| E2E-HIST-10   | Mão errada mostra indicador visual de erro; mão certa mostra check                            | `e2e/session-history/hand-review.spec.ts`     |
| E2E-HIST-11   | Timeout hand mostra "Timeout" como ação e indicador de erro                                   | `e2e/session-history/hand-review.spec.ts`     |
| E2E-HIST-12   | "Voltar ao histórico" preserva filtros e página                                               | `e2e/session-history/back-navigation.spec.ts` |
| E2E-HIST-13   | Sessão inexistente mostra erro claro                                                          | `e2e/session-history/error-handling.spec.ts`  |

**Regras para os E2E desta feature:**

- Usar convenções e fixtures do projeto em `e2e/` (ver `PT_E2E_*`).
- Cada spec cria os seus próprios dados de sessão (criar grupo, situações, executar sessão completa).
- Para o grid no E2E, validar presença de elementos visuais (data-testid na célula destacada) sem depender de screenshots de pixel.
- Prioridade de implementação E2E: `E2E-HIST-01`, `E2E-HIST-02`, `E2E-HIST-07`, `E2E-HIST-09`, `E2E-HIST-08`.

---

## Requirement Traceability

| Requirement ID | Descrição                                                                      | Status |
| -------------- | ------------------------------------------------------------------------------ | ------ |
| HIST-01        | Sidebar exibe entrada "Histórico" com navegação para `/history`                | [x]    |
| HIST-02        | Lista paginada de sessões concluídas (ordenada por data desc)                  | [x]    |
| HIST-03        | Colunas: data, grupo, situações, acerto %, duração, tipo, mãos                 | [x]    |
| HIST-04        | Server-side pagination com query params (`page`, `pageSize`)                   | [x]    |
| HIST-05        | Empty state quando não há sessões                                              | [x]    |
| HIST-06        | Omissão de sessões com `finishedAt` = NULL                                     | [x]    |
| HIST-07        | Filtro por grupo (tabs horizontais + "Todos", padrão StatsPage)               | [x]    |
| HIST-08        | Filtro por tipo de sessão (single/simultaneous/all)                            | [x]    |
| HIST-09        | Filtro por nº de mesas (2/3/4/Todas) quando tipo = simultaneous                | [x]    |
| HIST-10        | Reset de página ao alterar filtros                                             | [x]    |
| HIST-11        | Drill-down: clique na linha → `/history/:sessionId`                            | [x]    |
| HIST-12        | Cabeçalho da revisão: data, grupo, acerto %, duração                           | [x]    |
| HIST-13        | Exibição de hole cards, situação, ação escolhida, indicador acerto/erro        | [x]    |
| HIST-14        | Grid 13×13 read-only com range da situação e célula da mão destacada           | [x]    |
| HIST-15        | Navegação anterior/próxima entre mãos com bloqueio nos extremos                | [x]    |
| HIST-16        | Tratamento de timeout (`chosenActionId` = NULL → "Timeout")                    | [x]    |
| HIST-17        | Tratamento de FOLD implícito (range vazio → FOLD é correto)                    | [x]    |
| HIST-18        | "Voltar ao histórico" preserva filtros e página                                | [x]    |
| HIST-19        | Resiliência a situações/grupos arquivados (não filtra por `isActive`)          | [x]    |
| HIST-20        | Segurança: `requireUserId` em todos os handlers IPC novos                      | [x]    |
| HIST-21        | Query params sincronizam filtros e página (grupo, tipo, mesas, página)         | [x]    |

---

## Technical Notes

### Novos canais IPC

| Canal                        | Parâmetros                                                                | Retorno                                     |
| ---------------------------- | ------------------------------------------------------------------------- | ------------------------------------------- |
| `training:listSessions`      | `{ page, pageSize, groupId?, sessionType?, simultaneousTableCount? }`     | `{ items: SessionHistoryItemDto[], total: number, page: number, pageSize: number }` |
| `training:getSessionDetail`  | `sessionId: number`                                                       | `SessionDetailDto` (sessão + hands enriquecidas + rangeCells) |

### Novos DTOs (em `src/shared/ipc/types.ts`)

```typescript
export type SessionHistoryItemDto = {
  id: number;
  startedAt: number;          // timestamp ms
  finishedAt: number | null;  // timestamp ms
  groupName: string | null;   // via JOIN situation_groups
  situationCount: number;     // parsed from situationIdsJson
  totalHands: number;
  handsPlayed: number;        // COUNT sessionHands
  correct: number;            // COUNT sessionHands WHERE isCorrect
  accuracy: number;           // correct / handsPlayed (0 se 0)
  durationMs: number | null;  // finishedAt - startedAt (null se inacabada)
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
    id: number | null;
    name: string;
    actionType: ActionType;
    colorHex: string;
  } | null;                   // null quando timeout
  isCorrect: boolean;
  responseMs: number;
  gridCell: { rowIndex: number; colIndex: number };
  correctActionIds: number[];
};

export type SessionDetailDto = {
  session: SessionHistoryItemDto;
  hands: SessionHandDetailDto[];
  situationRangeCells: Record<number, RangeCellDto[]>;  // situationId -> cells
};

export type SessionListResponse = {
  items: SessionHistoryItemDto[];
  total: number;
  page: number;
  pageSize: number;
};
```

### Paginação server-side

- Query no main process: limit + offset via Drizzle (`db.select().limit(pageSize).offset((page-1) * pageSize)`).
- Query de total separada para `COUNT(*)`.
- Page size fixo em 10 itens. Não expor parâmetro `pageSize` ao utilizador.
- Validação no handler: `page` deve ser ≥ 1; valores inválidos → página 1.

### Grid 13×13 read-only na revisão

- Reutilizar lógica de renderização do `RangeGrid13` mas com um wrapper/prop `readOnly: true`.
- Célula da mão recebe prop adicional: `highlightCell?: { rowIndex: number; colIndex: number }`.
- Destaque: borda de 2px contrastante (ex: `ring-2 ring-amber-400` ou `outline-2 outline-amber-400`) sobre a célula.
- O componente **não** deve ser alterado de forma a quebrar o comportamento de edição existente no editor de situações.

### FilterToolbar — reutilização de padrão

Mesma estrutura do `StatsPage`: `FilterToolbar` com `Tabs` horizontais para grupos + `FilterToolbarRow` para tipo de sessão e nº de mesas. Extrair lógica comum se fizer sentido, mas sem refactor prematuro.

### Query params (P2)

Formato:
```
/history?page=2&groupId=3&sessionType=simultaneous&tableCount=4
```

Usar `useSearchParams` do react-router-dom (v6). Filtros aplicados localmente no estado, sincronizados bidirecionalmente com query params.

---

## Success Criteria

- [x] O utilizador consegue navegar para `/history` e ver todas as sessões concluídas com paginação funcional.
- [x] Os filtros (grupo, tipo de sessão, nº de mesas) limitam os resultados corretamente.
- [x] O utilizador consegue clicar numa sessão e ver cada mão com o grid 13×13 mostrando o range correto e a célula da mão destacada.
- [x] A navegação entre mãos (anterior/próxima) funciona com bloqueio correto nos extremos.
- [x] Hands com timeout ou FOLD implícito são tratadas corretamente.
- [x] "Voltar ao histórico" preserva o estado de filtros e página.
- [x] Nenhuma regressão nas páginas de treino, stats ou editor de situações.
- [x] A suíte E2E da feature cobre navegação, listagem, paginação, filtros, drill-down, revisão mão a mão e tratamento de erros.
