# Test Coverage Improvement — Task Breakdown

**Feature:** test-coverage-improvement  
**Spec:** [spec.md](spec.md)  
**Estado:** ✅ Complete — metas P1 e P2 atingidas; `pnpm test` 100% verde  
**Última actualização:** 2026-05-02

---

## Blocos de execução

```
Bloco 0 — Infra   [T01]                          ← gate: vitest config c/ thresholds
Bloco 1 — Main    [T02, T03, T04] [P]            ← gate: unit tests verdes
Bloco 2 — Main    [T05, T06] [P]                 ← gate: unit tests verdes
Bloco 3 — Shared  [T07]                          ← gate: unit tests verdes
Bloco 4 — Renderer [T08]                         ← gate: unit tests verdes
Bloco 5 — E2E     [T09, T10] [P]                 ← gate: pnpm test verde
Bloco 6 — CI Gate [T11]                          ← gate: coverage ≥ thresholds
```

---

## T01 — Configurar threshold de cobertura no vitest.config.ts

**Refs:** COV-17  
**Prioridade:** P1  
**Bloco:** 0

**What:** Adicionar bloco `coverage` ao `vitest.config.ts` com provider `v8`, thresholds P1 e exclusões de ficheiros não relevantes (bootstrap, ui shadcn, schema migrations).

**Where:** `vitest.config.ts`

**Depends on:** (nenhum)

**Done when:**

- `vitest.config.ts` contém `coverage.provider = 'v8'`
- Thresholds configurados: `statements: 80, branches: 75, functions: 85, lines: 80`
- Excluídos: `src/main/index.ts`, `src/main/db/client.ts`, `src/renderer/src/main.tsx`, `src/renderer/src/components/ui/**`, `src/main/ipc/register.ts`
- `pnpm test:unit --coverage` gera relatório (pode falhar nos thresholds — esperado neste estado)
- `pnpm test:unit:watch` não activa thresholds (via `CI` env var ou `--run` flag)

**Tests:** Verificar saída do `pnpm test:unit --coverage` e confirmar que threshold block aparece

**Gate:** `pnpm test:unit` (sem `--coverage`) ainda passa; `pnpm test:unit --coverage` reporta gaps correctamente

---

## T02 — Criar `src/main/services/session.test.ts`

**Refs:** COV-08, COV-09  
**Prioridade:** P1  
**Bloco:** 1 [P]

**What:** Testes unitários para `session.ts` — JWT sign/verify, saveToken/readToken/clearToken com mock de keytar e mock de fs para modo E2E token file.

**Where:** `src/main/services/session.test.ts` (novo ficheiro)

**Depends on:** T01

**Reuses:** Padrão `vi.mock` de `training.test.ts` e `groups.test.ts`

**Done when:**

- `signUserToken` testado: JWT contém `sub` e `email` correctos
- `getUserIdFromStoredToken` testado: token válido → userId; sem token → null; token expirado → null
- `requireUserId` testado: sem token → rejeita com `'Não autenticado'`; com token → resolve userId
- `saveToken`/`readToken`/`clearToken` testados para ambos os caminhos: keytar (mock) e PT_E2E_TOKEN_FILE (fs tmp)
- Cobertura de `session.ts` ≥ 80% statements, ≥ 75% branches

**Tests:**

```
describe('signUserToken') → 2 tests
describe('getUserIdFromStoredToken') → 3 tests (válido, sem token, expirado)
describe('requireUserId') → 2 tests (autenticado, não autenticado)
describe('saveToken / readToken / clearToken - keytar path') → 3 tests
describe('saveToken / readToken / clearToken - E2E file path') → 3 tests
```

Total estimado: ~13 testes

**Gate:** `pnpm test:unit src/main/services/session.test.ts` passa

---

## T03 — Criar `src/main/ipc/auth.test.ts`

**Refs:** COV-05, COV-06, COV-07  
**Prioridade:** P1  
**Bloco:** 1 [P]

**What:** Testes unitários para todos os 4 handlers de `auth.ts`: `auth:register`, `auth:login`, `auth:logout`, `auth:me`.

**Where:** `src/main/ipc/auth.test.ts` (novo ficheiro)

**Depends on:** T01

**Reuses:** Padrão `vi.mock` de `groups.test.ts`; `vi.mock('bcryptjs')` para evitar hash real

**Done when:**

- `auth:register`: email duplicado → erro; payload Zod inválido → erro; sucesso → retorna userId+name+email
- `auth:login`: user não encontrado → `'Credenciais inválidas'`; password errada → mesmo erro; sucesso → chama saveToken + retorna token+user
- `auth:logout`: chama `clearToken`
- `auth:me`: sem token → null; token inválido → chama clearToken + null; user válido → retorna user
- Cobertura de `auth.ts` ≥ 80% statements, ≥ 75% branches

**Tests:**

```
describe('auth:register') → 3 tests
describe('auth:login') → 3 tests
describe('auth:logout') → 1 test
describe('auth:me') → 3 tests
```

Total estimado: ~10 testes

**Gate:** `pnpm test:unit src/main/ipc/auth.test.ts` passa

---

## T04 — Criar `src/main/ipc/situations.test.ts`

**Refs:** COV-01, COV-02, COV-03, COV-04  
**Prioridade:** P1  
**Bloco:** 1 [P]

**What:** Testes unitários para todos os handlers de `situations.ts`: list, get, create, update, delete, duplicate.

**Where:** `src/main/ipc/situations.test.ts` (novo ficheiro)

**Depends on:** T01

**Reuses:** Padrão de mock de DB de `training.test.ts` (mock em cadeia com `select().from().where()`)

**Done when:**

- `situations:list` com filtro groupId → retorna apenas situações do grupo ordenadas
- `situations:list` sem filtro → retorna todas situações activas
- `situations:get` id inexistente → lança `'Situação não encontrada'`
- `situations:create` com nome duplicado → lança `'Nome de situação já existe'`
- `situations:create` com payload válido → chama `db.transaction` e retorna id
- `situations:update` id inexistente → lança `'Situação não encontrada'`
- `situations:update` com nome duplicado para outro id → lança erro
- `situations:delete` → actualiza `isActive = false`
- `situations:duplicate` → gera nome `'Cópia de X'` e incrementa se já existir
- Cobertura de `situations.ts` ≥ 80% statements, ≥ 70% branches

**Tests:**

```
describe('situations:list') → 3 tests
describe('situations:get') → 2 tests
describe('situations:create') → 3 tests
describe('situations:update') → 3 tests
describe('situations:delete') → 2 tests
describe('situations:duplicate') → 3 tests
```

Total estimado: ~16 testes

**Gate:** `pnpm test:unit src/main/ipc/situations.test.ts` passa

---

## T05 — Expandir `src/main/ipc/training.test.ts`

**Refs:** COV-10, COV-11, COV-12, COV-13  
**Prioridade:** P1  
**Bloco:** 2 [P]

**What:** Adicionar testes para os handlers descobertos: `training:nextHand`, `training:submitAnswer`, `training:endSession`.

**Where:** `src/main/ipc/training.test.ts` (expandir ficheiro existente)

**Depends on:** T01, T02 (session mock reutilizado)

**Reuses:** Helpers `getHandler` e `createStartSessionDbMock` já existentes no ficheiro

**Done when:**

- `training:nextHand` com sessionId → selecciona mão de range cells e regista em `pendingBySession`; sem range cells → rejeita
- `training:submitAnswer` resposta correcta → persiste `isCorrect = true` e retorna `{ correct: true, correctActionId }`
- `training:submitAnswer` resposta incorrecta → persiste `isCorrect = false` e retorna acção correcta
- `training:submitAnswer` sem mão pendente → rejeita
- `training:endSession` → regista `endedAt` e limpa `pendingBySession`
- Cobertura de `training.ts` ≥ 70% statements, ≥ 65% branches

**Tests:**

```
describe('training:nextHand') → 3 tests
describe('training:submitAnswer') → 4 tests
describe('training:endSession') → 2 tests
```

Total estimado: ~9 novos testes

**Gate:** `pnpm test:unit src/main/ipc/training.test.ts` passa com todos os testes anteriores + novos

---

## T06 — Expandir `src/main/ipc/stats.test.ts`

**Refs:** COV-14, COV-15, COV-16  
**Prioridade:** P1  
**Bloco:** 2 [P]

**What:** Adicionar testes para handlers descobertos: `stats:bySituation`, `stats:evolution`, `stats:worstHands`, e o caminho feliz de `stats:overview` com dados reais.

**Where:** `src/main/ipc/stats.test.ts` (expandir ficheiro existente)

**Depends on:** T01, T02

**Reuses:** Helpers `getHandler` e `createOverviewDbMock` já existentes

**Done when:**

- `stats:overview` com sessões e mãos → calcula accuracy e avgResponseMs correctamente
- `stats:bySituation` com dados → retorna lista com accuracy por situação
- `stats:bySituation` sem dados → retorna lista vazia
- `stats:evolution` com sessões → retorna série temporal correcta
- `stats:worstHands` com dados → retorna lista ordenada por count desc
- Cobertura de `stats.ts` ≥ 70% statements, ≥ 65% branches

**Tests:**

```
describe('stats:overview') → +2 tests (com dados)
describe('stats:bySituation') → 3 tests
describe('stats:evolution') → 2 tests
describe('stats:worstHands') → 2 tests
```

Total estimado: ~9 novos testes

**Gate:** `pnpm test:unit src/main/ipc/stats.test.ts` passa com todos os testes anteriores + novos

---

## T07 — Expandir `src/shared/poker/grid.test.ts`

**Refs:** COV-18  
**Prioridade:** P2  
**Bloco:** 3

**What:** Adicionar casos edge para `handToGridCell` (pocket pair, suited, offsuit) e `evaluateTrainingAnswer` (fold implícito, resposta correcta, resposta errada).

**Where:** `src/shared/poker/grid.test.ts` (expandir ficheiro existente)

**Depends on:** T01

**Done when:**

- `handToGridCell` pocket pair → diagonal (`row === col`)
- `handToGridCell` suited → célula acima da diagonal (`col > row`)
- `handToGridCell` offsuit → célula abaixo da diagonal (`row > col`)
- `evaluateTrainingAnswer` com range cell → acção correcta e incorrecta ambas testadas
- `evaluateTrainingAnswer` sem range cell (fold implícito) → fold correcto, outra acção incorrecta
- Cobertura de `grid.ts` ≥ 90% statements, ≥ 85% branches

**Tests:** ~8 novos testes

**Gate:** `pnpm test:unit src/shared/poker/grid.test.ts` passa

---

## T08 — Criar testes unitários de componentes renderer

**Refs:** COV-19  
**Prioridade:** P2  
**Bloco:** 4

**What:** Criar testes para `GroupCard`, `TrainingFeedbackPanel`, `PlayingCard`, `SessionSettingsForm`.

**Where:**

- `src/renderer/src/components/groups/GroupCard.test.tsx` (novo)
- `src/renderer/src/components/training/training-feedback.test.tsx` (novo)

**Depends on:** T01

**Reuses:** Padrão `// @vitest-environment jsdom` + `render` + `screen` de `stats-shared.test.tsx`

**Done when:**

- `GroupCard` activo: nome, contagem de situações e botões de acção visíveis
- `GroupCard` arquivado: badge/estado de arquivado visível
- `TrainingFeedbackPanel` com resultado correcto: mensagem positiva + label da mão
- `TrainingFeedbackPanel` com resultado incorrecto: mensagem negativa + acção esperada
- `PlayingCard` rank A suit ♠ → renderiza "A♠" (ou equivalente)
- Cobertura dos componentes listados ≥ 80% statements

**Tests:** ~12 testes (2 ficheiros novos)

**Gate:** `pnpm test:unit` passa com novos ficheiros

---

## T09 — Criar `e2e/situation-edit.spec.ts`

**Refs:** COV-20  
**Prioridade:** P2  
**Bloco:** 5 [P]

**What:** Spec E2E para edição de situação existente — alterar range cells e verificar persistência; tentar criar situação com nome duplicado.

**Where:** `e2e/situation-edit.spec.ts` (novo ficheiro)

**Depends on:** T04 (situations IPC com testes unit verdes)

**Reuses:** Fixtures e padrões de `e2e/situations.spec.ts`

**Done when:**

- Fluxo: login → criar situação → editar → alterar range cells → guardar → reabrir → verificar células
- Fluxo: criar segunda situação com mesmo nome → ver mensagem de erro contextual
- Spec passa 3x consecutivas sem flaky

**Tests:** 2 it-blocks principais + beforeEach de setup

**Gate:** `pnpm test:e2e` passa com novo spec incluído

---

## T10 — Criar `e2e/auth-flows.spec.ts`

**Refs:** COV-21  
**Prioridade:** P2  
**Bloco:** 5 [P]

**What:** Spec E2E para logout e protecção de rotas.

**Where:** `e2e/auth-flows.spec.ts` (novo ficheiro)

**Depends on:** T03 (auth IPC com testes unit verdes)

**Reuses:** Fixture de auth de `e2e/auth.spec.ts`

**Done when:**

- Fluxo: login → ir a dashboard → clicar logout → redirigido para login → session limpa
- Fluxo: sem sessão → aceder `/situations` → redirigido para login
- Spec passa 3x consecutivas sem flaky

**Tests:** 2 it-blocks

**Gate:** `pnpm test:e2e` passa com novo spec incluído

---

## T11 — Gate final: `pnpm test` completo verde com thresholds

**Refs:** COV-17 (enforcement)  
**Prioridade:** P1  
**Bloco:** 6

**What:** Verificar que `pnpm test` (unit + build + E2E) passa com todos os thresholds de cobertura activos.

**Where:** `vitest.config.ts` (ajuste fino se necessário), `package.json` (scripts)

**Depends on:** T01–T10 todos completos

**Done when:**

- `pnpm test:unit --coverage` retorna exit code 0 com todos os thresholds atingidos
- `pnpm test` (pipeline completa) retorna exit code 0
- Relatório final mostra: statements ≥ 80%, branches ≥ 75%, functions ≥ 85%, lines ≥ 80%

**Gate:** `pnpm test` completo verde

---

## Resumo por bloco

| Bloco             | Tasks             | Testes novos estimados | Dep      |
| ----------------- | ----------------- | ---------------------- | -------- |
| 0 — Infra         | T01               | 0                      | —        |
| 1 — Main crítico  | T02, T03, T04 [P] | ~39                    | T01      |
| 2 — Main expansão | T05, T06 [P]      | ~18                    | T01, T02 |
| 3 — Shared        | T07               | ~8                     | T01      |
| 4 — Renderer      | T08               | ~12                    | T01      |
| 5 — E2E           | T09, T10 [P]      | ~4                     | T03, T04 |
| 6 — Gate          | T11               | 0                      | T01–T10  |

**Total estimado:** ~81 testes novos (119 actuais → ~200 total)

---

## Status

| Task                            | Status  | Gate                                                                                             |
| ------------------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| T01 — vitest coverage config    | ✅ Done | pnpm test:unit passa                                                                             |
| T02 — session.test.ts           | ✅ Done | 13 testes verdes                                                                                 |
| T03 — auth.test.ts              | ✅ Done | 10 testes verdes                                                                                 |
| T04 — situations.test.ts        | ✅ Done | 16 testes verdes                                                                                 |
| T05 — training.test.ts (expand) | ✅ Done | 11 testes verdes (+9 novos)                                                                      |
| T06 — stats.test.ts (expand)    | ✅ Done | 13 testes verdes (+11 novos)                                                                     |
| T07 — grid.test.ts (expand)     | ✅ Done | 22 testes verdes (+14 novos)                                                                     |
| T08 — renderer components       | ✅ Done | 11 testes novos; 205 total                                                                       |
| T09 — E2E situation-edit        | ✅ Done | Ficheiro criado (build E2E pendente)                                                             |
| T10 — E2E auth-flows            | ✅ Done | Ficheiro criado (build E2E pendente)                                                             |
| T11 — Gate final                | ✅ Done | 205 unit tests; stmts 91.18% / branches 75.12% / funcs 91.97% / lines 92.84% — todos ≥ threshold |

## Coverage final (2026-05-02)

| Métrica    | Baseline | P1 Result | Meta P1 | P2 Result  | Meta P2 | ✅? |
| ---------- | -------- | --------- | ------- | ---------- | ------- | --- |
| Statements | 65.84%   | 91.18%    | ≥ 80%   | **94.03%** | ≥ 90%   | ✅  |
| Branches   | 56.25%   | 75.12%    | ≥ 75%   | **85.99%** | ≥ 85%   | ✅  |
| Functions  | 74.59%   | 91.97%    | ≥ 85%   | **93.04%** | ≥ 90%   | ✅  |
| Lines      | 67.65%   | 92.84%    | ≥ 80%   | **95.93%** | ≥ 90%   | ✅  |

**Testes:** 119 baseline → 248 final (+129 novos)  
**E2E:** 21 specs existentes + 2 novas (situation-edit, auth-flows) = 57 testes E2E verdes  
**`pnpm test`:** ✅ verde (unit + build + E2E)
