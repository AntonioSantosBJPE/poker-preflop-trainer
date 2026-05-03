# SESSION-REVIEW-NAV Tasks

**Spec**: `.specs/features/session-review-navigation/spec.md`
**Design**: N/A (skipped — straightforward additive UI)
**Status**: Draft

---

## Execution Plan

### Phase 1: Core Implementation (Parallel OK)

Both pages are independent — edits don't share state or files.

```
T1 [P] ──┐
          ├──→ T3 [P]
T2 [P] ──┘     │
               └──→ T4
```

### Phase 2: E2E Integration (Parallel OK)

E2E tests are in separate spec files.

```
T3 [P] ──┐
          ├──→ (done)
T4 [P] ──┘
```

---

## Task Breakdown

### T1: Adicionar "Rever sessão" ao TrainingResultPage + unit tests [P]

**What**: Adicionar botão "Rever sessão" (Link) ao lado dos botões existentes, navegando para `/history/{sessionId}`. Criar unit tests.

**Where**: `src/renderer/src/pages/TrainingResultPage.tsx` (edit) + `src/renderer/src/pages/TrainingResultPage.test.tsx` (new)

**Depends on**: None

**Reuses**: Existing `<Button asChild>` + `<Link>` pattern from same component

**Requirement**: SRN-01, SRN-02, SRN-07

**Done when**:

- [ ] Botão "Rever sessão" visível entre "Nova sessão" e "Ver estatísticas"
- [ ] Link tem href `/history/{sessionId}` correto
- [ ] Botões "Nova sessão" e "Ver estatísticas" mantidos sem alteração
- [ ] `TrainingResultPage.test.tsx` criado com 3 testes (UT-SRN-01 a 03)
- [ ] Gate check: `pnpm typecheck` sem erros
- [ ] Gate check: `pnpm test:unit` — testes do novo ficheiro passam

**Tests**: unit
**Gate**: quick (`pnpm typecheck && pnpm test:unit --run src/renderer/src/pages/TrainingResultPage.test.tsx`)

**Verify**:

```
pnpm typecheck && pnpm test:unit
```

---

### T2: Adicionar revisões ao SimultaneousTrainingSummaryPage + unit tests [P]

**What**: Adicionar (a) botão "Revisão individual" por mesa nos cards de cada mesa, navegando para `/history/{sessionId}` da mesa; (b) botão "Revisão múltipla" navegando para `/history/review-multi?ids=...` com todos os sessionIds. Criar unit tests.

**Where**: `src/renderer/src/pages/SimultaneousTrainingSummaryPage.tsx` (edit) + `src/renderer/src/pages/SimultaneousTrainingSummaryPage.test.tsx` (new)

**Depends on**: None

**Reuses**: Existing `<Button asChild>` + `<Link>` pattern, `useLocation` state for `sessionIds`

**Requirement**: SRN-03, SRN-04, SRN-05, SRN-06, SRN-07

**Done when**:

- [ ] Cada card de mesa exibe botão "Revisão individual" com href `/history/{sessionId}` correto
- [ ] Botão "Revisão múltipla" visível com href `/history/review-multi?ids={id1},{id2},...`
- [ ] Botões não aparecem se lista de sessionIds está vazia
- [ ] Botões existentes ("Novo treino simultâneo", "Treino normal") mantidos sem alteração
- [ ] `SimultaneousTrainingSummaryPage.test.tsx` criado com 6 testes (UT-SRN-04 a 09)
- [ ] Gate check: `pnpm typecheck` sem erros
- [ ] Gate check: `pnpm test:unit` — testes do novo ficheiro passam

**Tests**: unit
**Gate**: quick (`pnpm typecheck && pnpm test:unit --run src/renderer/src/pages/SimultaneousTrainingSummaryPage.test.tsx`)

**Verify**:

```
pnpm typecheck && pnpm test:unit
```

---

### T3: Atualizar E2E training.spec.ts para verificar "Rever sessão" [P]

**What**: Atualizar o teste existente "resultado da sessão liga para nova sessão" para também verificar que o botão "Rever sessão" aparece e navega para a revisão. Pode ser nova asserção no mesmo teste ou teste separado.

**Where**: `e2e/training.spec.ts` (edit)

**Depends on**: T1 (precisa do botão implementado para testar)

**Reuses**: Existing E2E helpers (`answerFoldImmediate`, `openTrainingConfig`, etc.) and test structure

**Requirement**: SRN-01, SRN-02, E2E-SRN-01

**Done when**:

- [ ] Teste verifica que "Rever sessão" está visível na página de resultado
- [ ] Teste clica no link e valida navegação para `/history/{sessionId}` (heading "Revisão da Sessão")
- [ ] E2E passa: `pnpm test:e2e:ci -- -g "Rever sessão"` (ou padrão equivalente)

**Tests**: e2e
**Gate**: full (`pnpm test:e2e:ci`)

**Verify**:

```
pnpm build:app && pnpm test:e2e -- e2e/training.spec.ts
```

---

### T4: Atualizar E2E simultaneous full-flow.spec.ts para verificar revisões [P]

**What**: Adicionar verificações no teste E2E-MT-10 para os botões "Revisão individual" (por mesa) e "Revisão múltipla" no resumo simultâneo, incluindo navegação para a página de revisão correspondente.

**Where**: `e2e/simultaneous-training/full-flow.spec.ts` (edit)

**Depends on**: T2 (precisa dos botões implementados para testar)

**Reuses**: Existing E2E helpers, existing test structure in `full-flow.spec.ts`

**Requirement**: SRN-03, SRN-04, SRN-05, SRN-06, E2E-SRN-02, E2E-SRN-03, E2E-SRN-04

**Done when**:

- [ ] Teste verifica botão "Revisão individual" em cada card de mesa
- [ ] Teste clica "Revisão individual" da Mesa 1 e valida navegação para `/history/{sessionId}`
- [ ] Teste volta ao resumo (via browser back ou re-navegação)
- [ ] Teste verifica botão "Revisão múltipla" e valida navegação para `/history/review-multi?ids=...`
- [ ] Botões existentes ("Novo treino simultâneo", "Treino normal") continuam funcionais
- [ ] E2E passa: `pnpm test:e2e:ci`

**Tests**: e2e
**Gate**: full (`pnpm test:e2e:ci`)

**Verify**:

```
pnpm build:app && pnpm test:e2e -- e2e/simultaneous-training/full-flow.spec.ts
```

---

## Parallel Execution Map

```
Phase 1 (Parallel):
  T1 [P] ──→ (edit TrainingResultPage + test)
  T2 [P] ──→ (edit SimultaneousTrainingSummaryPage + test)

Phase 2 (Parallel, after T1+T2):
  T3 [P] ──→ (update E2E training.spec.ts)
  T4 [P] ──→ (update E2E simultaneous full-flow.spec.ts)
```

**Parallelism constraint**: T3 depende de T1, T4 depende de T2. Como T1 e T2 já estão completos antes da Fase 2 começar, T3 e T4 podem rodar em paralelo entre si.

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows            | Status |
| ---- | ---------------------- | ------------------------ | ------ |
| T1   | None                   | Fase 1, sem dependências | ✅     |
| T2   | None                   | Fase 1, sem dependências | ✅     |
| T3   | T1                     | Fase 2, após T1          | ✅     |
| T4   | T2                     | Fase 2, após T2          | ✅     |

---

## Test Co-location Validation

| Task | Code Layer                        | Matrix Requires | Task Says | Status |
| ---- | --------------------------------- | --------------- | --------- | ------ |
| T1   | Renderer page (edit) + test (new) | unit            | unit      | ✅     |
| T2   | Renderer page (edit) + test (new) | unit            | unit      | ✅     |
| T3   | E2E spec (edit)                   | e2e             | e2e       | ✅     |
| T4   | E2E spec (edit)                   | e2e             | e2e       | ✅     |

---

## Gate Check Commands

| Gate  | Command                                  |
| ----- | ---------------------------------------- |
| quick | `pnpm typecheck && pnpm test:unit --run` |
| full  | `pnpm build:app && pnpm test:e2e`        |
