# Simultaneous Training — Design

**Status:** Draft  
**Requisitos cobertos:** SMT-01 a SMT-14  
**Spec base:** `spec.md`

---

## 1. Visão Geral

A feature introduz um segundo modo de treino (multi-mesa) sem substituir o fluxo atual.  
Arquitetura proposta: reaproveitar o motor de treino existente por sessão e criar um orquestrador de bloco simultâneo com N mesas (2..4), mantendo estado isolado por mesa e resumo agregado final.

```
Renderer (React)
  └── MultiTrainingConfigPage
      └── window.api.simultaneousTraining.start(...)
            └── IPC: simultaneous-training:start
                  └── main service cria bloco + N sessões de mesa

Renderer (React)
  └── MultiTrainingSessionPage
      ├── Mesa 1 state/store
      ├── Mesa 2 state/store
      ├── Mesa 3 state/store (opcional)
      └── Mesa 4 state/store (opcional)
            └── ações por mesa → IPC submitAnswer(tableId, ...)
```

---

## 2. Decisões de Arquitetura

### DA-01: Fluxo atual permanece intacto

- Não alterar contrato público do treino single-table.
- Novo modo entra por nova rota + novos canais IPC.
- Objetivo: cumprir SMT-03 e reduzir risco de regressão.

### DA-02: Configuração unificada no bloco

- `tableCount` (2..4) e config de treino únicos no momento de criação.
- Cada mesa recebe cópia dessa config no bootstrap.
- Objetivo: SMT-04, SMT-05, SMT-07.

### DA-03: Estado isolado por mesa

- Cada mesa possui identificador estável (`tableId`) e progresso próprio.
- Ações carregam `tableId`; backend/engine atualiza apenas a mesa alvo.
- Objetivo: SMT-08.

### DA-04: Persistência por bloco + estatística agregada

- Persistir sessão simultânea (bloco) e eventos por mesa.
- Expor resumo agregado com breakdown por mesa.
- Objetivo: SMT-09 e SMT-10.

### DA-05: Validação forte no main process

- Validar limites de `tableCount` no schema + guard no handler.
- Bloqueio backend para payload inválido independentemente de UI.
- Objetivo: SMT-11 e E2E-MT-08.

---

## 3. Modelo de Dados (MVP)

Opção recomendada para reduzir impacto no domínio atual:

1. Nova entidade `simultaneous_training_sessions`:
   - `id`, `user_id`, `table_count`, `status`, `started_at`, `ended_at`
   - `config_json` (snapshot da config aplicada às mesas)
2. Nova entidade `simultaneous_training_tables`:
   - `id`, `simultaneous_session_id`, `table_index`, `training_session_id`
   - Relaciona cada mesa a uma sessão de treino já existente (reuso do motor atual)

Justificativa:

- Reaproveita a infraestrutura existente de `training_sessions`.
- Evita refactor profundo da avaliação.
- Permite migrar incrementalmente.

---

## 4. IPC + Shared Contracts

### 4.1 Novos tipos em `src/shared/ipc/types.ts`

- `SimultaneousTrainingConfig`:
  - `tableCount: 2 | 3 | 4`
  - campos já existentes do treino base (situações, totalHands, timer, feedback, etc.)
- `SimultaneousTrainingSessionDto`:
  - `sessionId`, `tableCount`, `tables: Array<{ tableId; trainingSessionId; tableIndex }>`
- `SimultaneousTrainingSummaryDto`:
  - agregado: acertos, erros, decisões
  - detalhe por mesa

### 4.2 Schemas Zod em `src/shared/forms/trainingSchemas.ts`

- `simultaneousTrainingStartSchema` com `tableCount` restrito a enum `[2,3,4]`.
- parser dedicado para start multi-mesa.

### 4.3 Canais IPC novos

- `simultaneous-training:start`
- `simultaneous-training:get-state`
- `simultaneous-training:submit-answer`
- `simultaneous-training:finish`
- `simultaneous-training:abort`
- `simultaneous-training:get-summary`

Todos os canais seguem padrão existente: `requireUserId` + validação Zod + retorno tipado.

---

## 5. Main Process

### 5.1 Serviço novo: `src/main/services/simultaneousTraining.ts`

- `startSimultaneousSession(db, userId, config)`
- `submitAnswer(db, userId, simultaneousSessionId, tableId, answer)`
- `finishSimultaneousSession(db, userId, simultaneousSessionId)`
- `abortSimultaneousSession(...)`
- `getSummary(...)`

### 5.2 Estratégia de execução

- `start`: cria bloco simultâneo + cria N sessões de treino base associadas.
- `submitAnswer`: roteia por `tableId` para a sessão correta.
- `finish`: encerra sessões de mesa pendentes, consolida métricas.

### 5.3 Garantias

- `tableCount` fora de faixa: erro de validação.
- `tableId` fora da sessão: erro de autorização/consistência.
- Operações idempotentes de finalização/aborto.

---

## 6. Preload

Adicionar namespace `simultaneousTraining` em `src/preload/index.ts`:

- `start(config)`
- `getState(sessionId)`
- `submitAnswer(payload)`
- `finish(sessionId)`
- `abort(sessionId)`
- `getSummary(sessionId)`

---

## 7. Renderer

### 7.1 Novas rotas

- `/training/simultaneous` (config)
- `/training/simultaneous/session/:id` (execução)
- `/training/simultaneous/session/:id/summary` (resumo)

### 7.2 Novas páginas/componentes

- `SimultaneousTrainingConfigPage`
- `SimultaneousTrainingSessionPage`
- `SimultaneousTablePanel` (componente reutilizável por mesa)
- `SimultaneousTrainingSummaryPage`

### 7.3 Menu

- Nova entrada "Treino Simultâneo" no menu principal (SMT-01/SMT-02).

### 7.4 Estado por mesa

- Store local por página contendo mapa `{tableId -> tableState}`.
- Atualizações sempre direcionadas por `tableId`.
- Nenhuma escrita global compartilhada entre mesas.

### 7.5 Guard de abandono

- Se sessão ativa, navegação dispara confirmação.
- Confirmar: aborta sessão e segue navegação.
- Cancelar: permanece no treino.

---

## 8. Compatibilidade e Regressão

- Não remover nem alterar rotas/canais do treino atual.
- Reutilizar componentes do treino atual somente quando forem puros e sem estado global acoplado.
- Adicionar teste E2E dedicado de regressão single-table (SMT-14).

---

## 9. Estratégia de Testes

### 9.1 E2E como gate principal

- Implementar matriz E2E-MT-01..E2E-MT-10 da spec.
- Ordem sugerida:
  1. `E2E-MT-03` (start 2/3/4)
  2. `E2E-MT-05` (isolamento por mesa)
  3. `E2E-MT-10` (fluxo completo)
  4. `E2E-MT-08` (validação backend)
  5. restantes cenários

### 9.2 Unit/Integration

- Schemas: limite de `tableCount`
- Serviço main: roteamento por mesa, agregação, idempotência de finish
- IPC handlers: validação/erros

---

## 10. Riscos e Mitigações

1. Risco: vazamento de estado entre mesas no renderer.  
   Mitigação: store indexada por `tableId` + testes E2E de ações cruzadas.

2. Risco: regressão no fluxo single-table por refactor compartilhado.  
   Mitigação: separar módulos e cobrir com E2E de regressão.

3. Risco: aumento de complexidade de persistência.  
   Mitigação: modelagem de bloco simples com referência para sessões existentes.
