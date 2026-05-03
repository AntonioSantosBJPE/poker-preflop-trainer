# Pausar/Continuar, Barra de Progresso e Timer — Tasks

**Spec**: `.specs/features/session-pause-progress-timer/spec.md`
**Context**: `.specs/features/session-pause-progress-timer/context.md`
**Design**: N/A (inline)
**Status**: Draft

---

## Execution Plan

### Phase 1: Core UI + Simultaneous (Parallel)

```
T1 ───────────────┐
                  ├──→ T2 → T4
T3 ───────────────┘
```

- **T1**: `TrainingSessionHeader` — pause/continue, overlay, progress bar, timer icon + unit tests
- **T3**: `SimultaneousTablePanel` + `SimultaneousTrainingSessionPage` — timer icon, progress, global pause + unit tests
- T1 e T3 sao independentes e podem rodar em paralelo

### Phase 2: Single Session Wiring

- **T2**: `TrainingSessionPage` — estado paused, freeze/resume timer, dialog behavior + unit tests
- Depende de T1 (importa o componente atualizado)

### Phase 3: E2E

- **T4**: Testes E2E para pause, progresso e timer
- Depende de T1, T2, T3

---

## Task Breakdown

### T1: Atualizar TrainingSessionHeader [P]

**What**: Adicionar botoes Pausar/Continuar, overlay de pausa, barra de progresso horizontal e `TimerIcon` ao cabecalho da sessao individual.

**Where**: `src/renderer/src/components/training/TrainingSessionHeader.tsx`

**Depends on**: None

**Reuses**: `TimerIcon` do `lucide-react` (ja instalado); tokens de cor do design system (`bg-primary`, `bg-muted`, etc.)

**Requirement**: SPT-01, SPT-02, SPT-05, SPT-07

**Tools**:

- Skill: `preflop-design` (tokens CSS)

**Done when**:

- [ ] `TrainingSessionHeader` aceita novas props: `isPaused`, `onPause`, `onContinue`
- [ ] Botao "Pausar" visivel quando `isPaused=false`; "Continuar" quando `true`
- [ ] Overlay sutil + texto "Pausada" sobre a mao quando `isPaused=true`
- [ ] Barra de progresso horizontal fina abaixo de "Mao X / Y" com `width` proporcional a `index/totalHands`
- [ ] `TimerIcon` (Lucide) antes do `remainingSec`s quando `remainingSec !== null`
- [ ] Barra vazia quando `index=0`, cheia quando `index=totalHands-1`
- [ ] `onPause` invocado ao clicar "Pausar"; `onContinue` ao clicar "Continuar"
- [ ] Gate check: `pnpm typecheck && pnpm test:unit`
- [ ] Test count: testes do `TrainingSessionHeader` passam (3+ novos testes)

**Tests**: unit

**Gate**: quick (`pnpm typecheck && pnpm test:unit`)

---

### T2: Wire pause state no TrainingSessionPage

**What**: Adicionar estado `paused` a pagina de sessao individual, congelar/restaurar `deadlineRef` ao pausar/continuar, integrar com dialogo de abandonar.

**Where**: `src/renderer/src/pages/TrainingSessionPage.tsx`

**Depends on**: T1

**Reuses**: Padrao existente de `pausedRemainingMsRef` (ja usado no dialogo de abandonar)

**Requirement**: SPT-01, SPT-02, SPT-08, SPT-09

**Done when**:

- [ ] Estado `paused` gerido na pagina (useState)
- [ ] `openAbandonDialog` salva `pausedRemainingMsRef` (ja implementado) e NAO interfere com estado de pausa
- [ ] `closeAbandonDialog` restaura timer se `pausedRemainingMsRef` tinha valor **e** sessao nao esta pausada
- [ ] Timer nao processa timeout enquanto `paused=true` (SPT-08)
- [ ] Abrir/fechar dialogo de abandonar nao altera estado de pausa (SPT-09)
- [ ] `isPaused`, `onPause`, `onContinue` passados para `TrainingSessionHeader`
- [ ] Botoes de acao (`TrainingActionButtons`) desativados quando pausado
- [ ] Gate check: `pnpm typecheck && pnpm test:unit`

**Tests**: unit

**Gate**: quick (`pnpm typecheck && pnpm test:unit`)

---

### T3: Timer icon, progress e global pause no Simultaneo [P]

**What**: Adicionar `TimerIcon` e progresso visual no `SimultaneousTablePanel` + estado de pausa global no `SimultaneousTrainingSessionPage`.

**Where**:

- `src/renderer/src/components/training/SimultaneousTablePanel.tsx`
- `src/renderer/src/pages/SimultaneousTrainingSessionPage.tsx`

**Depends on**: None

**Reuses**: `TimerIcon` do `lucide-react`; `Progress` ou div com `bg-primary` para barra

**Requirement**: SPT-03, SPT-04, SPT-06, SPT-07

**Done when**:

- `SimultaneousTablePanel`:
  - [ ] `TimerIcon` exibido antes dos segundos quando timer ativo
  - [ ] Indicador "X/Y" com barra de progresso proporcional
  - [ ] Overlay de pausa + botoes desativados quando recebe prop `isPaused=true`
- `SimultaneousTrainingSessionPage`:
  - [ ] Estado `isPaused` global na pagina
  - [ ] Botao "Pausar"/"Continuar" no cabecalho (ao lado de "Encerrar")
  - [ ] Clicar "Pausar" seta `isPaused=true` em todas as mesas
  - [ ] Clicar "Continuar" seta `isPaused=false` em todas as mesas
  - [ ] Mesas concluidas sao ignoradas na pausa (permanece concluida)
  - [ ] Timer nao processa timeout enquanto `isPaused=true`
- [ ] Gate check: `pnpm typecheck && pnpm test:unit`

**Tests**: unit

**Gate**: quick (`pnpm typecheck && pnpm test:unit`)

---

### T4: Testes E2E

**What**: Escrever testes E2E para os fluxos de pause/continue, barra de progresso e icone do timer.

**Where**:

- `e2e/training.spec.ts` — pause individual, progresso, timer icon
- `e2e/simultaneous-training/` — pause simultaneo

**Depends on**: T1, T2, T3

**Reuses**: Helpers existentes em `e2e/helpers/training.ts`; padrao de fixtures em `e2e/fixtures.ts`; helpers de `clickAbandon`/`cancelAbandon`

**Requirement**: SPT-13, SPT-14, SPT-15, SPT-16

**Done when**:

- `e2e/training.spec.ts`:
  - [ ] Teste: pausar sessao individual com timer — timer congela, continuar — timer retoma do mesmo valor
  - [ ] Teste: barra de progresso visivel na sessao individual e atualiza entre maos
  - [ ] Teste: icone de cronometro visivel com timer>0, ausente com timer=0
- `e2e/simultaneous-training/` (ficheiro novo ou existente):
  - [ ] Teste: pausar treino simultaneo com 2 mesas — todas pausam, continuar — todas retomam
- [ ] Gate check: `pnpm test:unit && pnpm typecheck` (para garantir que o build esta ok)
- [ ] Navegacao e fluxo completo validados

**Tests**: e2e

**Gate**: full (`pnpm test`)

---

## Granularity Check

| Task                                  | Scope                                              | Status                                                |
| ------------------------------------- | -------------------------------------------------- | ----------------------------------------------------- |
| T1: Atualizar TrainingSessionHeader   | 1 componente                                       | ✅ Granular                                           |
| T2: Wire pause no TrainingSessionPage | 1 pagina (state logic)                             | ✅ Granular                                           |
| T3: Timer, progress, pause simultaneo | 2 ficheiros coesos (painel + pagina sincronizados) | ⚠️ OK — estao no mesmo flow, separar quebraria coesao |
| T4: Testes E2E                        | Testes integrados                                  | ✅ Granular                                           |

## Diagram-Definition Cross-Check

| Task | Depends On | Diagram Shows                | Status |
| ---- | ---------- | ---------------------------- | ------ |
| T1   | None       | Entry point                  | ✅     |
| T2   | T1         | Arrow T1→T2                  | ✅     |
| T3   | None       | Entry point (parallel to T1) | ✅     |
| T4   | T1, T2, T3 | Converges after all          | ✅     |

## Test Co-location Validation

| Task | Layer                               | Matrix Equivalent           | Task Tests | Status |
| ---- | ----------------------------------- | --------------------------- | ---------- | ------ |
| T1   | Component (`TrainingSessionHeader`) | Unit required by convention | unit       | ✅     |
| T2   | Page + state logic                  | Unit required by convention | unit       | ✅     |
| T3   | Component + page                    | Unit required by convention | unit       | ✅     |
| T4   | E2E flow                            | E2E required by convention  | e2e        | ✅     |

## Parallel Execution Map

```
Phase 1 (Parallel):
  T1 [P]  (TrainingSessionHeader)
  T3 [P]  (Simultaneous — independent)

Phase 2 (Sequential):
  T1 done → T2 (TrainingSessionPage, depends on T1)

Phase 3 (Sequential):
  T2 + T3 done → T4 (E2E tests)
```
