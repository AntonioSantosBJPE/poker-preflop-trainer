# Spec: Pausar/Continuar, Barra de Progresso e Timer

**Feature:** SESSION-PAUSE-PROGRESS-TIMER
**Data:** 2026-05-03
**Ambito:** Melhorias na UX das sessoes de treino (individual e simultaneo): pausa curta, barra de progresso visual e icone do cronometro.

---

## Problem Statement

Hoje o utilizador so tem a opcao de **abandonar** a sessao de treino — nao existe pausa para momentos curtos de interrupcao. Alem disso, nao ha indicacao visual do progresso geral ("mao 7 de 20") nem do temporizador (apenas numeros soltos), o que reduz a percepcao de controle e contexto durante o treino.

---

## Goals

- [ ] Permitir pausar e continuar sessao de treino (pausa curta, nao persiste entre fechos do app)
- [ ] Exibir barra de progresso visual no cabecalho da sessao individual
- [ ] Exibir indicacao de progresso nas mesas simultaneas
- [ ] Adicionar icone de cronometro antes do timer para facilitar identificacao visual

---

## Out of Scope

| Item                                                    | Reason                              |
| ------------------------------------------------------- | ----------------------------------- |
| Persistir estado de pausa entre reinicializacoes do app | Pausa curta e efemera, nao persiste |
| Pausa programada / autopause por inatividade            | Nao pedido                          |
| Customizacao visual da barra de progresso (cor, estilo) | Usar tokens do design system        |
| Alteracao no fluxo de feedback ou avaliacao             | Fora do escopo                      |

---

## User Stories

### P1: Pausar e continuar sessao individual - MVP

**User Story:** Como utilizador, quero pausar uma sessao de treino individual e depois continuar do mesmo ponto, para lidar com interrupcoes curtas sem perder progresso.

**Why P1:** Funcionalidade principal do pedido — o utilizador precisa de uma opcao entre "abandonar" e "seguir".

**Acceptance Criteria:**

1. WHEN o utilizador clica "Pausar" na sessao individual THEN o sistema SHALL parar o cronometro da mao atual e congelar a interacao (botoes de acao desativados, novas jogadas bloqueadas)
2. WHEN a sessao esta pausada THEN o sistema SHALL exibir estado visual claro (ex: overlay sutil ou indicacao "Pausada") e substituir o botao "Pausar" por "Continuar"
3. WHEN o utilizador clica "Continuar" THEN o sistema SHALL restaurar o cronometro com o tempo restante anterior e reativar a interacao
4. WHEN o utilizador pausa e retorna varias vezes na mesma mao THEN o sistema SHALL acumular corretamente o tempo decorrido
5. WHEN os testes unitarios do `TrainingSessionHeader` sao executados THEN eles SHALL cobrir: renderizacao do botao Pausar/Continuar, exibicao do overlay de pausa, e congelamento do timer
6. WHEN os testes E2E de treino individual sao executados THEN eles SHALL cobrir: clicar Pausar, confirmar que o timer para, clicar Continuar, confirmar que o timer retoma do mesmo valor

**Independent Test:** Iniciar sessao com timer de 10s por mao, pausar, esperar 5s, continuar — validar que o cronometro ainda mostra ~10s (nao 5s).

---

### P1: Pausar e continuar sessao simultanea - MVP

**User Story:** Como utilizador, quero pausar e continuar todas as mesas de um treino simultaneo ao mesmo tempo.

**Why P1:** Treino simultaneo tem mesma necessidade de pausa curta.

**Acceptance Criteria:**

1. WHEN o utilizador clica "Pausar" no cabecalho do treino simultaneo THEN o sistema SHALL pausar todas as mesas simultaneamente (cronometros parados, botoes desativados)
2. WHEN todas as mesas estao pausadas THEN o sistema SHALL substituir "Pausar" por "Continuar"
3. WHEN o utilizador clica "Continuar" THEN o sistema SHALL restaurar cronometros e interacao em todas as mesas
4. WHEN uma mesa ja esta concluida THEN o sistema SHALL ignora-la na pausa/continuar (mesas concluidas permanecem concluidas)
5. WHEN os testes E2E de treino simultaneo sao executados THEN eles SHALL cobrir: pausar treino simultaneo com 2 mesas, validar que ambas pararam, continuar e validar retomada

**Independent Test:** Iniciar treino simultaneo com 2 mesas, pausar, validar que ambas pararam, continuar, validar que ambas retomaram.

---

### P1: Barra de progresso visual no cabecalho - MVP

**User Story:** Como utilizador, quero ver visualmente em que ponto da sessao estou ("mao 7 de 20"), para ter perspectiva do quanto falta.

**Why P1:** Diferenca entre frustracao ("quanto falta?") e controle.

**Acceptance Criteria:**

1. WHEN a sessao individual esta ativa THEN o cabecalho SHALL exibir "Mao X / Y" com uma barra de progresso proporcional ao lado
2. WHEN `X = 0` (inicio) THEN a barra SHALL estar vazia
3. WHEN `X = Y` (ultima mao concluida) THEN a barra SHALL estar cheia
4. WHEN o treino e simultaneo THEN cada mesa SHALL exibir "X/Y" no cabecalho da mesa
5. WHEN os testes unitarios do `TrainingSessionHeader` sao executados THEN eles SHALL cobrir: renderizacao da barra com largura proporcional a `index/totalHands`, barra vazia em `index=0`, barra cheia em `index=totalHands-1`
6. WHEN os testes E2E de treino sao executados THEN eles SHALL cobrir: progresso visivel na sessao individual e nas mesas simultaneas

**Independent Test:** Iniciar sessao com 20 maos, avancar 5 maos, validar que a barra mostra 25% de preenchimento.

---

### P2: Icone de cronometro antes do timer

**User Story:** Como utilizador, quero identificar rapidamente onde esta o temporizador na tela, sem precisar ler numeros.

**Why P2:** Melhoria de scaneabilidade visual, especialmente em treino simultaneo com varias mesas.

**Acceptance Criteria:**

1. WHEN o timer esta visivel na sessao individual THEN o sistema SHALL exibir um icone de cronometro (clock) antes dos segundos
2. WHEN o timer esta visivel em uma mesa simultanea THEN o sistema SHALL exibir o mesmo icone antes dos segundos
3. WHEN o timer nao esta visivel (timer desligado) THEN o icone SHALL nao ser exibido
4. WHEN os testes unitarios do `TrainingSessionHeader` sao executados THEN eles SHALL cobrir: icone `TimerIcon` presente quando `remainingSec !== null`, ausente quando `remainingSec === null`
5. WHEN os testes E2E de treino sao executados THEN eles SHALL cobrir: icone de cronometro visivel na sessao com timer configurado

**Independent Test:** Iniciar sessao com timer=10s e sessao sem timer; validar que icone aparece apenas na primeira.

---

## Edge Cases

- WHEN o utilizador pausa exatamente no momento em que o cronometro vai expirar THEN o sistema SHALL congelar o timer no valor atual (nao processar timeout durante pausa)
- WHEN o utilizador esta em feedback mode `END_OF_SESSION` e pausa THEN o sistema SHALL pausar normalmente (não ha feedback imediato para congelar)
- WHEN o utilizador abre o dialogo de Abandonar enquanto pausado THEN o sistema SHALL manter estado de pausa ao fechar o dialogo sem abandonar

---

## Requirement Traceability

| Requirement ID | Story | Description                                                                  | Status  |
| -------------- | ----- | ---------------------------------------------------------------------------- | ------- |
| SPT-01         | P1    | Pausar sessao individual (timer + interacao congelados)                      | Pending |
| SPT-02         | P1    | Continuar sessao individual (restaurar timer + interacao)                    | Pending |
| SPT-03         | P1    | Pausar todas as mesas no treino simultaneo                                   | Pending |
| SPT-04         | P1    | Continuar todas as mesas no treino simultaneo                                | Pending |
| SPT-05         | P1    | Barra de progresso visual no cabecalho da sessao individual                  | Pending |
| SPT-06         | P1    | Indicador X/Y em cada mesa simultanea                                        | Pending |
| SPT-07         | P2    | Icone de cronometro antes do timer                                           | Pending |
| SPT-08         | -     | Pausa nao processa timeout (timer congelado)                                 | Pending |
| SPT-09         | -     | Dialogo de abandonar nao afeta estado de pausa                               | Pending |
| SPT-10         | P1    | Testes unitarios: pause/continue no `TrainingSessionHeader`                  | Pending |
| SPT-11         | P1    | Testes unitarios: barra de progresso proporcional no `TrainingSessionHeader` | Pending |
| SPT-12         | P2    | Testes unitarios: icone `TimerIcon` no `TrainingSessionHeader`               | Pending |
| SPT-13         | P1    | Testes E2E: pausar e continuar sessao individual                             | Pending |
| SPT-14         | P1    | Testes E2E: pausar e continuar treino simultaneo                             | Pending |
| SPT-15         | P1    | Testes E2E: barra de progresso visivel na sessao                             | Pending |
| SPT-16         | P2    | Testes E2E: icone de cronometro visivel com timer ativo                      | Pending |

**Coverage:** 16 requisitos totais, 16 mapeados, 0 nao mapeados.

---

## Test Requirements

### Unit tests (`training-session.test.tsx`)

- `TrainingSessionHeader` — renderiza botao Pausar/Continuar com label correta baseada na prop `isPaused`
- `TrainingSessionHeader` — exibe overlay/indicacao "Pausada" quando `isPaused=true`
- `TrainingSessionHeader` — barra de progresso com `width` proporcional a `index/totalHands`
- `TrainingSessionHeader` — barra vazia quando `index=0`, cheia quando `index=totalHands-1`
- `TrainingSessionHeader` — `TimerIcon` presente quando `remainingSec !== null`, ausente quando `null`
- `TrainingSessionHeader` — `onPause` invocado ao clicar no botao de pause (caso nao pausado)

### E2E tests (`e2e/training.spec.ts`)

- Pausar sessao individual com timer → timer congela, continuar → timer retoma
- Barra de progresso visivel e atualiza entre maos na sessao individual
- Icone de cronometro visivel com timer > 0, ausente com timer = 0

### E2E tests (`e2e/simultaneous-training/`)

- Pausar treino simultaneo → todas as mesas pausam, continuar → todas retomam
- Indicador X/Y visivel em cada mesa simultanea

---

## Success Criteria

- [ ] Utilizador consegue pausar e continuar sessoes individuais e simultaneas sem perder progresso ou tempo
- [ ] Barra de progresso visivel da perspectiva de quantas maos faltam
- [ ] Icone de cronometro presente em todos os timers da interface
- [ ] Todos os testes unitarios e E2E especificados passam no CI
