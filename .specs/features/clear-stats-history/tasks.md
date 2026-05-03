# Clear Stats History — Tasks

**Status:** Draft
**Spec:** `spec.md`
**Requisitos foco:** CLEAR-STATS-01..CLEAR-STATS-07

---

## Convenções

- `[P]` = pode executar em paralelo no mesmo bloco
- Cada task tem gate explícito
- Testes co-localizados com implementação
- Se houver divergência relevante de spec: marcar `SPEC_DEVIATION`

---

## Execution Plan

### Phase 0: Foundation (Parallel)

```
T1 [P] ──→ T3
T2 [P] ──→ T4 ──→ T5
```

### Phase 1: Integration (Sequential)

```
T3 ──→ T4 ──→ T5
```

### Phase 2: E2E (Sequential — depende de toda a implementação)

```
T5 ──→ T6
```

---

## Task Breakdown

### T1: Shared types + Zod schema [P]

**What:** Adicionar `DeleteEstimateDto`, `DeletePeriodInput` e respectivo schema Zod + parser.

**Where:**

- `src/shared/ipc/types.ts` (editar)
- `src/shared/forms/statsSchemas.ts` (editar)

**Depends on:** None

**Reuses:** Padrão `StatsFilters` existente (campos `fromTs`, `toTs`). Schema `baseStatsFiltersSchema` existente.

**Requirement:** CLEAR-STATS-01, CLEAR-STATS-03

**Done when:**

- `DeleteEstimateDto` definido em `types.ts` com campos: `sessionCount: number`, `handCount: number`.
- `DeletePeriodInput` definido em `types.ts` ou reutilizado `StatsFilters` — avaliar se precisamos de `fromTs` + `toTs` apenas ou se aceitamos os mesmos filtros que `StatsFilters`.
- Schema Zod `deletePeriodSchema` + `parseDeletePeriod(raw)` em `statsSchemas.ts` que valida `fromTs` + `toTs` (ints >= 0).
- `pnpm typecheck` passa.

**Tests:** unit
**Gate:** `pnpm typecheck`

---

### T2: Preload API — `window.api.stats` [P]

**What:** Adicionar `estimateDeleteSessions` e `deleteSessions` ao namespace `stats` no preload.

**Where:** `src/preload/index.ts` (editar)

**Depends on:** None (usa `unknown` para tipos, como os restantes métodos stats)

**Reuses:** Padrão `ipcRenderer.invoke` dos métodos existentes em `window.api.stats`.

**Requirement:** CLEAR-STATS-01, CLEAR-STATS-03

**Done when:**

- `window.api.stats.estimateDeleteSessions(period)` invoca `'stats:estimateDeleteSessions'`.
- `window.api.stats.deleteSessions(period)` invoca `'stats:deleteSessions'`.
- `pnpm typecheck` passa.

**Tests:** none (preload é `contextBridge`, não testado unitariamente no projecto)
**Gate:** `pnpm typecheck`

---

### T3: IPC handlers `stats:estimateDeleteSessions` + `stats:deleteSessions`

**What:** Implementar dois novos handlers IPC no ficheiro `stats.ts`:

- `stats:estimateDeleteSessions(fromTs, toTs)` → conta sessões + mãos no período sem apagar.
- `stats:deleteSessions(fromTs, toTs)` → apaga sessões + mãos em transacção, retorna `{ sessionCount, handCount }`.

**Where:** `src/main/ipc/stats.ts` (editar)

**Depends on:** T1 (tipos + Zod schema)

**Reuses:**

- `requireUserId()` de `src/main/services/session.ts`
- `getDb()` de `src/main/db/client.ts`
- `parseDeletePeriod` de T1
- Padrão `sessionWhereClause` já existente no ficheiro (reaproveitar para filtrar por `fromTs`/`toTs`)
- Transacção com `db.transaction()` — ver padrão em `training.ts` ou `situations.ts`

**Requirement:** CLEAR-STATS-01, CLEAR-STATS-03, CLEAR-STATS-05, CLEAR-STATS-07

**Done when:**

**`stats:estimateDeleteSessions`:**

- Com `fromTs` e `toTs` vazios → erro `'Período obrigatório'` (ou similar).
- Com período sem sessões → `{ sessionCount: 0, handCount: 0 }`.
- Com período com sessões → retorna contagem correcta de sessões + total de mãos (via `SELECT COUNT` ou similar, sem carregar tudo em memória).
- Valida input com `parseDeletePeriod`.

**`stats:deleteSessions`:**

- Com período sem sessões → erro `'Nenhuma sessão encontrada no período'` (evita transacção vazia).
- Com período com sessões → apaga em transacção (`DELETE FROM training_sessions WHERE ...` cascade para `session_hands`).
- Retorna `{ sessionCount, handCount }` com as contagens do que foi apagado.
- Sessões de outros users não são afectadas (filtro por `userId`).
- Valida input com `parseDeletePeriod`.
- Erro de BD → propaga excepção com mensagem clara.

**Testes unitários** (em `src/main/ipc/stats.test.ts`):

- `stats:estimateDeleteSessions` sem período → rejeita com erro.
- `stats:estimateDeleteSessions` com período vazio → `{ sessionCount: 0, handCount: 0 }`.
- `stats:estimateDeleteSessions` com sessões → contagens correctas.
- `stats:deleteSessions` sem sessões → rejeita com erro.
- `stats:deleteSessions` com sessões → apaga e retorna contagens.
- `stats:deleteSessions` de outro user → não apaga (filtro por userId).
- Ambos os handlers chamam `requireUserId()` e `parseDeletePeriod`.

**Tests:** unit
**Gate:** `pnpm typecheck` + `pnpm test:unit src/main/ipc/stats.test.ts`

---

### T4: ClearStatsDialog component

**What:** Criar componente `ClearStatsDialog` com:

1. DatePeriodFilter reutilizado para selecção de período
2. Preview automático (estima após selecção)
3. Botão "Remover" abre `ConfirmActionDialog` como segundo passo
4. Loading state durante estimativa e durante delecção

**Where:** `src/renderer/src/components/stats/ClearStatsDialog.tsx` (novo)

**Depends on:** T2 (para `window.api.stats.estimateDeleteSessions` e `deleteSessions`)

**Reuses:**

- `DatePeriodFilter` de `@/components/app`
- `ConfirmActionDialog` de `@/components/app`
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` de `@/components/ui/dialog`
- `Button` de `@/components/ui/button`
- Padrão de `Dialog` com `open`/`onOpenChange` controlado

**Requirement:** CLEAR-STATS-01, CLEAR-STATS-02, CLEAR-STATS-03, CLEAR-STATS-04, CLEAR-STATS-06, CLEAR-STATS-07

**Done when:**

**Estado:**

- `open`/`onOpenChange` controlado pelo componente pai.
- Estado interno: `period` (`{ fromTs, toTs }`), `estimate` (`{ sessionCount, handCount } | null`), `estimating` (boolean), `deleting` (boolean), `error` (string | null).
- Ao abrir, reseta todo o estado interno.

**UI — 1º diálogo (ClearStatsDialog):**

- Título: "Limpar histórico".
- Description: "Selecione o período e veja o impacto antes de confirmar."
- `DatePeriodFilter` integrado — ao mudar o período, faz auto-estimativa.
- Durante estimativa: esqueleto/loading.
- Após estimativa: "X sessões e Y mãos serão removidas permanentemente."
- Se período sem sessões: "Nenhuma sessão encontrada neste período." + botão "Remover" desabilitado.
- Botão "Remover" desabilitado enquanto `estimate === null` ou `estimate.sessionCount === 0`.
- Botão "Cancelar" fecha o diálogo.

**UI — 2º diálogo (ConfirmActionDialog):**

- Ao clicar "Remover", fecha 1º diálogo e abre `ConfirmActionDialog`.
- Título: "Tem a certeza?".
- Description: "Esta ação irá remover permanentemente X sessões e Y mãos. Não é possível desfazer esta operação."
- Botão confirm: "Sim, remover permanentemente" (classe `bg-destructive text-destructive-foreground`).
- Botão cancel: "Cancelar".
- Durante delecção: botão confirm mostra "Removendo..." e fica desabilitado.
- Sucesso: ambos os diálogos fecham, `onComplete()` é chamado no pai.
- Erro: mensagem de erro exibida no 2º diálogo, diálogo mantém-se aberto.

**Props:**

```ts
interface ClearStatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void; // chamado após delecção bem-sucedida
}
```

**Testes:**

- Renderiza com `open=true` → exibe título e DatePeriodFilter.
- Com `estimate` populado → exibe contagens.
- Com `estimate.sessionCount = 0` → exibe mensagem vazia, botão desabilitado.
- `onComplete` chamado ao finalizar delecção com sucesso.
- Fluxo de cancelamento: clicar "Cancelar" fecha diálogo sem chamar `onComplete`.

**Tests:** unit
**Gate:** `pnpm typecheck` + `pnpm test:unit`

---

### T5: StatsPage integration

**What:** Adicionar botão "Limpar histórico" na `StatsPage` + estado do diálogo + refresh automático após delecção.

**Where:** `src/renderer/src/pages/StatsPage.tsx` (editar)

**Depends on:** T4 (ClearStatsDialog component)

**Reuses:**

- `Button` de `@/components/ui/button`
- `ClearStatsDialog` de `@/components/stats`
- Padrão de `PageHeader` actions slot já existente na página
- `useCallback` para `handleStatsRefresh` que re-executa os 4 fetches (overview, timeline, bySituation, worstHands)

**Requirement:** CLEAR-STATS-01, CLEAR-STATS-05, CLEAR-STATS-06

**Done when:**

- Botão "Limpar histórico" no `PageHeader` (ao lado do título, ou numa toolbar abaixo — seguir o padrão visual da página).
- Estado `clearDialogOpen` (boolean) controla abertura do `ClearStatsDialog`.
- Ao clicar "Limpar histórico" → `clearDialogOpen = true`.
- `onComplete` do `ClearStatsDialog` → recarrega os 4 conjuntos de dados (overview, timeline, bySituation, worstHands) com os filtros actuais.
- Após recarregar, os cartões de overview, gráfico, tabela por situação e worst hands reflectem os novos dados.
- Teste: botão "Limpar histórico" está presente na página.
- Teste: `ClearStatsDialog` é renderizado com `open` controlado.
- Teste: após `onComplete`, os dados são re-fetched.

**Tests:** unit
**Gate:** `pnpm typecheck` + `pnpm test:unit`

---

### T6: E2E tests — fluxo completo de limpeza de histórico

**What:** Adicionar testes E2E em `stats.spec.ts` que cobrem o fluxo completo de limpeza de histórico, incluindo:

- Abertura do diálogo a partir da página de estatísticas
- Preview do impacto com período com e sem sessões
- Dupla confirmação (1º diálogo → `ConfirmActionDialog`)
- Cancelamento em cada etapa
- Deleção bem-sucedida com verificação de actualização das estatísticas

**Where:** `e2e/stats.spec.ts` (editar)

**Depends on:** T5 (toda a implementação deve estar concluída)

**Reuses:**

- `registerAccount` de `./helpers/auth`
- `uniqueGroupName`, `uniqueSituationName`, `uniqueUserCredentials` de `./helpers/credentials`
- `createGroup` de `./helpers/group`
- `createSituationMinimal` de `./helpers/situation`
- `openTrainingConfig`, `selectGroupForTraining`, `selectSituationsForTraining`, `setTrainingHands`, `startTrainingSession`, `answerFoldImmediate` de `./helpers/training`
- Padrão `test.describe('Estatísticas')` já existente em `stats.spec.ts`

**Requirement:** CLEAR-STATS-01, CLEAR-STATS-02, CLEAR-STATS-03, CLEAR-STATS-04, CLEAR-STATS-05, CLEAR-STATS-06, CLEAR-STATS-07

**Done when:**

**Cenário 1: Diálogo abre e mostra preview com sessões existentes**

1. Registar utilizador, criar grupo + situação, jogar 1 sessão de treino (1 mão).
2. Navegar para `/stats`.
3. Clicar botão "Limpar histórico".
4. Verificar que `ClearStatsDialog` abriu (título visível).
5. Seleccionar período "Mês atual" no `DatePeriodFilter`.
6. Aguardar preview: verificar que contagens de sessões e mãos > 0 aparecem.
7. Verificar que botão "Remover" está habilitado.

**Cenário 2: Período sem sessões mostra mensagem e desabilita botão**

1. Após limpeza (Cenário 4 executado), abrir novamente o diálogo.
2. Seleccionar período "Hoje".
3. Verificar mensagem "Nenhuma sessão encontrada neste período".
4. Verificar que botão "Remover" está desabilitado.

**Cenário 3: Cancelamento no 2º diálogo não remove nada**

1. Registar utilizador, criar grupo + situação, jogar 1 sessão.
2. Navegar para `/stats`.
3. Abrir diálogo, seleccionar "Mês atual", aguardar preview.
4. Clicar "Remover" → 2º diálogo (`ConfirmActionDialog`) abre.
5. Clicar "Cancelar" no 2º diálogo.
6. Verificar que o contador de sessões no overview continua igual.

**Cenário 4: Fluxo completo — remover sessões e verificar actualização**

1. Registar utilizador, criar grupo + situação.
2. Jogar 2 sessões de treino (1 mão cada).
3. Navegar para `/stats`.
4. Verificar que o overview mostra `2` sessões.
5. Abrir diálogo, seleccionar "Mês atual", aguardar preview (2 sessões, N mãos).
6. Clicar "Remover".
7. No 2º diálogo, clicar "Sim, remover permanentemente".
8. Aguardar diálogo fechar.
9. Verificar toast/notificação de sucesso (se implementada) OU verificar que o overview foi actualizado para `0` sessões.
10. Recarregar a página (`page.reload()`) e confirmar que `0` sessões permanece.

**Cenário 5: Abertura da página sem sessões mostra contagem zero**

1. Registar utilizador novo (sem treinos).
2. Navegar para `/stats`.
3. Verificar `stats-overview-sessions` = "0".
4. Botão "Limpar histórico" está visível.

**Tests estimados:** ~5 cenários E2E

**Gate:** `pnpm test:e2e e2e/stats.spec.ts`

---

## Parallel Execution Map

```
Phase 0 (Foundation, Parallel):
  T1 [P] ──→ (shared types + Zod)
  T2 [P] ──→ (preload API)

Phase 1 (Backend):
  T3 ──→ (IPC handlers + tests)
  depends on: T1

Phase 2 (Renderer, Sequential):
  T4 ──→ (ClearStatsDialog + tests)
  depends on: T2
  T5 ──→ (StatsPage integration + tests)
  depends on: T4

Phase 3 (E2E, Sequential):
  T6 ──→ (E2E tests)
  depends on: T5
```

---

## Task Granularity Check

| Task                              | Scope                              | Status                                              |
| --------------------------------- | ---------------------------------- | --------------------------------------------------- |
| T1: Shared types + Zod schema     | 2 files, ~20 linhas                | ✅ Granular                                         |
| T2: Preload API                   | 1 file, ~4 linhas                  | ✅ Granular                                         |
| T3: IPC handlers + tests          | 1 file (edit) + 1 file (test edit) | ⚠️ 2 handlers + tests — OK, coeso no mesmo ficheiro |
| T4: ClearStatsDialog + tests      | 1 file (new) + 1 file (test new)   | ✅ Granular                                         |
| T5: StatsPage integration + tests | 1 file (edit) + 1 file (test edit) | ✅ Granular                                         |
| T6: E2E tests                     | 1 file (edit), 5 cenários          | ✅ Granular — testes apenas, sem implementação      |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows     | Status   |
| ---- | ---------------------- | ----------------- | -------- |
| T1   | None                   | Phase 0, parallel | ✅ Match |
| T2   | None                   | Phase 0, parallel | ✅ Match |
| T3   | T1                     | T1 → T3           | ✅ Match |
| T4   | T2                     | T2 → T4           | ✅ Match |
| T5   | T4                     | T4 → T5           | ✅ Match |
| T6   | T5                     | T5 → T6           | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires             | Task Says               | Status                                                    |
| ---- | --------------------------- | --------------------------- | ----------------------- | --------------------------------------------------------- |
| T1   | shared (types + zod)        | none explicit               | Tests: unit (typecheck) | ✅ OK — sem testes unitários específicos para tipos puros |
| T2   | preload (contextBridge)     | none explicit               | Tests: none             | ✅ OK — preload não é testado unitariamente               |
| T3   | main (IPC handlers)         | unit (por padrão existente) | Tests: unit             | ✅ OK                                                     |
| T4   | renderer (component)        | unit (por padrão existente) | Tests: unit             | ✅ OK                                                     |
| T5   | renderer (page)             | unit (por padrão existente) | Tests: unit             | ✅ OK                                                     |
| T6   | e2e (stats.spec.ts)         | e2e (por padrão existente)  | Tests: e2e              | ✅ OK                                                     |

---

## Especificação Técnica de IPC

### `stats:estimateDeleteSessions`

```ts
// Input
ipcRenderer.invoke('stats:estimateDeleteSessions', {
  fromTs: number, // timestamp unix seconds
  toTs: number,   // timestamp unix seconds
})

// Output
{ sessionCount: number, handCount: number }
```

### `stats:deleteSessions`

```ts
// Input
ipcRenderer.invoke('stats:deleteSessions', {
  fromTs: number, // timestamp unix seconds
  toTs: number,   // timestamp unix seconds
})

// Output
{ sessionCount: number, handCount: number }
// Errors:
// - 'Nenhuma sessão encontrada no período' (validação)
// - Erro de BD propagado naturalmente
```

Ambos os handlers:

1. Chamam `parseDeletePeriod(input)` (Zod) para validar
2. Chamam `requireUserId()` para obter user autenticado
3. Usam `getDb()` para aceder à BD
4. Filtram por `userId` + `startedAt BETWEEN fromTs AND toTs`
