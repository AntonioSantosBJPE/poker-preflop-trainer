# Test Coverage Improvement Specification

## Problem Statement

A cobertura de testes actual do projeto está abaixo dos padrões de mercado para aplicações Electron de missão crítica. Com **65.84% de statements** e **56.25% de branches**, existem lacunas significativas especialmente nas camadas IPC do main process (`training.ts` a 22%, `stats.ts` a 23%`) e em ficheiros de serviço sem qualquer cobertura (`auth.ts`, `session.ts`, `situations.ts`). O renderer tem componentes de página inteiramente descobertos. Esta situação aumenta o risco de regressões silenciosas durante refactorings e novas features.

## Baseline (medido em 2026-05-02)

| Métrica   | Actual  | Meta P1 | Meta P2 |
|-----------|---------|---------|---------|
| Statements | 65.84% | ≥ 80%  | ≥ 90%  |
| Branches   | 56.25% | ≥ 75%  | ≥ 85%  |
| Functions  | 74.59% | ≥ 85%  | ≥ 90%  |
| Lines      | 67.65% | ≥ 80%  | ≥ 90%  |

> **Referência de mercado:** Projectos TypeScript com domínio de negócio crítico (lógica de jogo, auth, persistência) visam tipicamente 80–90% em statements/lines e 70–80% em branches como threshold de CI aceitável. Abaixo de 70% em statements é considerado risco alto pela comunidade (Jest/Vitest docs, Google Testing Blog, Atlassian Engineering standards).

## Diagnóstico de Lacunas

### Camada Main Process (IPC + Serviços)

| Ficheiro | Stmts | Branches | Funcs | Prioridade |
|---|---|---|---|---|
| `main/ipc/training.ts` | 22% | 12% | 19% | **P1 — crítico** |
| `main/ipc/stats.ts` | 24% | 13% | 24% | **P1 — crítico** |
| `main/ipc/situations.ts` | 0% | 0% | 0% | **P1 — crítico** |
| `main/ipc/auth.ts` | 0% | 0% | 0% | **P1 — crítico** |
| `main/services/session.ts` | 0% | 0% | 0% | **P1 — crítico** |
| `main/db/schema.ts` | 69% | 100% | 44% | P2 |
| `shared/poker/grid.ts` | 69% | 60% | 80% | P2 |
| `shared/forms/authSchemas.ts` | 77% | 56% | 80% | P2 |

### Camada Renderer (Componentes + Páginas)

| Ficheiro / Grupo | Situação | Prioridade |
|---|---|---|
| Páginas (`SituationsPage`, `DashboardPage`, `StatsPage`, `TrainingSessionPage`, `GroupsPage`, etc.) | 0% — sem testes unitários | P2 |
| `components/ui/*` (card, select, alert-dialog) | 57–83% | P3 |
| `components/groups/GroupCard` | 0% | P2 |
| `components/training/SessionSettingsForm`, `TrainingFeedbackPanel`, etc. | 0% | P2 |

### Camada E2E

21 ficheiros de spec cobrem os fluxos principais. Lacunas identificadas:
- Sem spec para fluxo de **edição de situação** (range editor)
- Sem spec para fluxo de **dashboard** (verificação de KPIs)
- Sem spec para **tratamento de erros de rede/IPC** (ex: DB inacessível)
- Auth: sem testes de **registo com dados inválidos** e **logout**

## Goals

- [x] Atingir ≥ 80% statements e lines (meta P1)
- [x] Atingir ≥ 75% branches (meta P1)
- [x] Atingir ≥ 85% functions (meta P1)
- [x] Atingir ≥ 90% statements/lines e ≥ 85% branches (meta P2 — stretch)
- [x] Integrar threshold de cobertura no CI (`vitest --coverage` com limites)
- [x] Eliminar ficheiros com 0% de cobertura nas camadas main/services

## Out of Scope

| Feature | Reason |
|---|---|
| Cobertura de ficheiros `src/renderer/src/components/ui/*` gerados pelo shadcn | Código de biblioteca gerado — testar comportamento externo, não internos |
| Testes E2E para cada permutation de range grid 13×13 | Cobertura de domínio já existe em unit tests de `grid.ts` |
| Snapshot tests visuais (screenshot comparison) | Fora do âmbito; requer infra adicional |
| Cobertura de `src/main/index.ts` (bootstrap) | Ficheiro de bootstrap — testado de forma integrada via E2E |

---

## User Stories

### P1-01: Cobertura de `main/ipc/situations.ts` ⭐ MVP

**User Story**: Como developer, quero testes unitários para todos os handlers IPC de situações para que regressões em CRUD (create, read, update, delete, duplicate) sejam detectadas automaticamente.

**Why P1**: `situations.ts` tem 0% de cobertura e contém lógica complexa: dedup por nome, transações com range_cells, soft-delete, duplicação com nome único incremental.

**Acceptance Criteria**:

1. WHEN handler `situations:list` é invocado com filtro de groupId THEN sistema SHALL retornar apenas situações do grupo e ordenadas por nome
2. WHEN handler `situations:create` é invocado com nome duplicado THEN sistema SHALL rejeitar com erro `'Nome de situação já existe'`
3. WHEN handler `situations:create` é invocado com payload válido THEN sistema SHALL persistir em transação situação + ações + range_cells
4. WHEN handler `situations:update` é invocado com id inexistente THEN sistema SHALL rejeitar com erro `'Situação não encontrada'`
5. WHEN handler `situations:delete` é invocado THEN sistema SHALL fazer soft-delete (`isActive = false`)
6. WHEN handler `situations:duplicate` é invocado THEN sistema SHALL gerar nome único `'Cópia de X'` e incrementar `(2)`, `(3)`... se necessário
7. WHEN cobertura é medida THEN `situations.ts` SHALL ter ≥ 80% statements e ≥ 75% branches

**Independent Test**: `pnpm test:unit` passa com novo ficheiro `src/main/ipc/situations.test.ts`

---

### P1-02: Cobertura de `main/ipc/auth.ts` ⭐ MVP

**User Story**: Como developer, quero testes unitários para todos os handlers de autenticação para que a lógica de registo, login, logout e `auth:me` seja verificável sem depender da UI.

**Why P1**: `auth.ts` tem 0% de cobertura e contém lógica de segurança crítica (bcrypt hash, JWT sign, dedup de email).

**Acceptance Criteria**:

1. WHEN `auth:register` recebe email já existente THEN sistema SHALL rejeitar com `'E-mail já cadastrado'`
2. WHEN `auth:register` recebe payload inválido (Zod) THEN sistema SHALL rejeitar com mensagem do primeiro issue
3. WHEN `auth:login` recebe password errada THEN sistema SHALL rejeitar com `'Credenciais inválidas'` (sem revelar se é email ou password)
4. WHEN `auth:login` é bem-sucedido THEN sistema SHALL chamar `saveToken` e retornar token + user
5. WHEN `auth:logout` é invocado THEN sistema SHALL chamar `clearToken`
6. WHEN `auth:me` é invocado sem token THEN sistema SHALL retornar `null`
7. WHEN `auth:me` é invocado com token expirado/inválido THEN sistema SHALL chamar `clearToken` e retornar `null`
8. WHEN cobertura é medida THEN `auth.ts` SHALL ter ≥ 80% statements e ≥ 75% branches

**Independent Test**: `pnpm test:unit` passa com novo ficheiro `src/main/ipc/auth.test.ts`

---

### P1-03: Cobertura de `main/services/session.ts` ⭐ MVP

**User Story**: Como developer, quero testes unitários para o serviço de sessão (JWT sign/verify, keytar mock) para que a camada de autenticação de token seja verificável isoladamente.

**Why P1**: `session.ts` tem 0% de cobertura e é dependência crítica de todos os outros handlers.

**Acceptance Criteria**:

1. WHEN `signUserToken` é chamado THEN sistema SHALL retornar JWT com `sub` e `email` corretos
2. WHEN `getUserIdFromStoredToken` é chamado com token válido THEN sistema SHALL retornar userId correto
3. WHEN `getUserIdFromStoredToken` é chamado sem token armazenado THEN sistema SHALL retornar `null`
4. WHEN `getUserIdFromStoredToken` é chamado com token expirado THEN sistema SHALL retornar `null`
5. WHEN `requireUserId` é chamado sem token THEN sistema SHALL rejeitar com `'Não autenticado'`
6. WHEN variável `PT_E2E_TOKEN_FILE` está definida THEN `saveToken`/`readToken`/`clearToken` SHALL usar sistema de ficheiros em vez de keytar
7. WHEN cobertura é medida THEN `session.ts` SHALL ter ≥ 80% statements e ≥ 75% branches

**Independent Test**: `pnpm test:unit` passa com novo ficheiro `src/main/services/session.test.ts`

---

### P1-04: Expansão de cobertura de `main/ipc/training.ts` ⭐ MVP

**User Story**: Como developer, quero testes que cubram os handlers `training:nextHand`, `training:submitAnswer` e `training:endSession` para que a lógica de jogo seja verificável sem Electron.

**Why P1**: `training.ts` está a 22% — os handlers mais críticos (nextHand com selecção de mão aleatória, submitAnswer com avaliação de correctude, endSession) não têm cobertura.

**Acceptance Criteria**:

1. WHEN `training:nextHand` é invocado com sessionId válido THEN sistema SHALL seleccionar mão aleatória de situação válida e registar em `pendingBySession`
2. WHEN `training:nextHand` é invocado com sessionId sem situações com range cells THEN sistema SHALL rejeitar com erro adequado
3. WHEN `training:submitAnswer` é invocado com resposta correcta THEN sistema SHALL persistir `isCorrect = true` e retornar feedback correcto
4. WHEN `training:submitAnswer` é invocado com resposta incorrecta THEN sistema SHALL persistir `isCorrect = false` e retornar a acção esperada
5. WHEN `training:endSession` é invocado THEN sistema SHALL registar `endedAt` na sessão e retornar resumo de resultados
6. WHEN cobertura é medida THEN `training.ts` SHALL ter ≥ 70% statements e ≥ 65% branches

**Independent Test**: `pnpm test:unit` passa com testes adicionais em `src/main/ipc/training.test.ts`

---

### P1-05: Expansão de cobertura de `main/ipc/stats.ts` ⭐ MVP

**User Story**: Como developer, quero testes que cubram os handlers `stats:bySituation`, `stats:evolution` e `stats:worstHands` para que a lógica de agregação estatística seja verificável.

**Why P1**: `stats.ts` está a 23% — apenas `stats:overview` tem 1 teste.

**Acceptance Criteria**:

1. WHEN `stats:bySituation` é invocado com filtros válidos THEN sistema SHALL retornar lista de situações com accuracy, count e situationId
2. WHEN `stats:evolution` é invocado THEN sistema SHALL retornar série temporal de accuracy por sessão
3. WHEN `stats:worstHands` é invocado THEN sistema SHALL retornar top erros ordenados por contagem desc
4. WHEN `stats:overview` é invocado com sessões existentes THEN sistema SHALL calcular accuracy e avgResponseMs correctamente
5. WHEN cobertura é medida THEN `stats.ts` SHALL ter ≥ 70% statements e ≥ 65% branches

**Independent Test**: `pnpm test:unit` passa com testes adicionais em `src/main/ipc/stats.test.ts`

---

### P1-06: Threshold de cobertura no CI ⭐ MVP

**User Story**: Como developer, quero que a pipeline de CI falhe automaticamente quando a cobertura cai abaixo dos thresholds definidos para que regressões de qualidade sejam bloqueadas em PR.

**Why P1**: Sem enforcement automático, os thresholds são aspiracionais e não garantem manutenção.

**Acceptance Criteria**:

1. WHEN `pnpm test:unit` é executado THEN vitest SHALL gerar relatório de cobertura com v8
2. WHEN cobertura de statements cai abaixo de 80% THEN vitest SHALL falhar com exit code não-zero
3. WHEN cobertura de branches cai abaixo de 75% THEN vitest SHALL falhar com exit code não-zero
4. WHEN cobertura de functions cai abaixo de 85% THEN vitest SHALL falhar com exit code não-zero
5. WHEN cobertura de lines cai abaixo de 80% THEN vitest SHALL falhar com exit code não-zero
6. WHEN `pnpm test:unit:watch` é executado THEN cobertura SHALL ser gerada mas sem enforcement de threshold (DX)

**Independent Test**: Forçar coverage abaixo do limite e verificar que `pnpm test:unit` retorna exit code 1

---

### P2-01: Cobertura de `shared/poker/grid.ts`

**User Story**: Como developer, quero cobertura completa das funções de domínio do grid para que bugs em `evaluateTrainingAnswer`, `handToGridCell` e geração de label sejam detectados.

**Why P2**: `grid.ts` a 69% — funções de avaliação têm casos edge não cobertos (pocket pair handling, suited vs offsuit).

**Acceptance Criteria**:

1. WHEN `handToGridCell` recebe pocket pair THEN sistema SHALL retornar `{rowIndex: i, colIndex: i}` na diagonal
2. WHEN `handToGridCell` recebe mão suited (ranks diferentes, mesmo naipe) THEN sistema SHALL retornar célula acima da diagonal
3. WHEN `handToGridCell` recebe mão offsuit THEN sistema SHALL retornar célula abaixo da diagonal
4. WHEN `evaluateTrainingAnswer` recebe actionId que corresponde a acção correcta THEN SHALL retornar `{ correct: true }`
5. WHEN `evaluateTrainingAnswer` recebe fold implícito (sem range cell) THEN SHALL tratar como correcta se actionId for null/foldId
6. WHEN cobertura é medida THEN `grid.ts` SHALL ter ≥ 90% statements e ≥ 85% branches

**Independent Test**: `pnpm test:unit` passa com testes adicionais em `src/shared/poker/grid.test.ts`

---

### P2-02: Cobertura de componentes renderer críticos

**User Story**: Como developer, quero testes unitários para componentes de alto valor (`GroupCard`, `TrainingFeedbackPanel`, `SessionSettingsForm`, `PlayingCard`) para que mudanças de UI não introduzam regressões silenciosas.

**Why P2**: Componentes usados transversalmente em múltiplos fluxos sem qualquer cobertura.

**Acceptance Criteria**:

1. WHEN `GroupCard` é renderizado com grupo activo THEN SHALL mostrar nome, contagem de situações e botões de acção
2. WHEN `GroupCard` é renderizado com grupo arquivado THEN SHALL mostrar estado visual de arquivado
3. WHEN `TrainingFeedbackPanel` recebe resultado correcto THEN SHALL mostrar feedback positivo e mão jogada
4. WHEN `TrainingFeedbackPanel` recebe resultado incorrecto THEN SHALL mostrar feedback negativo e acção esperada
5. WHEN `PlayingCard` recebe rank e suit THEN SHALL renderizar o label correcto (ex: "A♠")
6. WHEN `SessionSettingsForm` é submetido com dados inválidos THEN SHALL mostrar erros de validação inline
7. WHEN cobertura é medida THEN componentes listados SHALL ter ≥ 80% statements

**Independent Test**: `pnpm test:unit` passa com novos ficheiros de test em `src/renderer/src/components/`

---

### P2-03: Expansão de specs E2E — fluxos em falta

**User Story**: Como developer, quero specs E2E para os fluxos de edição de situação e navegação de erros de auth para que regressões nestes fluxos críticos sejam detectadas em integração real.

**Why P2**: Fluxo de edição de range e erros de auth são críticos e não têm spec E2E própria.

**Acceptance Criteria**:

1. WHEN utilizador edita situação existente e altera range cells THEN sistema SHALL persistir e mostrar células actualizadas
2. WHEN utilizador tenta criar situação com nome duplicado THEN sistema SHALL mostrar mensagem de erro contextual
3. WHEN utilizador faz logout THEN sistema SHALL redirigir para login e limpar estado
4. WHEN utilizador acede a rota protegida sem sessão THEN sistema SHALL redirigir para login
5. WHEN spec é executada via `pnpm test:e2e` THEN SHALL passar sem flaky failures em 3 execuções consecutivas

**Independent Test**: `pnpm test:e2e` passa com novos ficheiros `e2e/situation-edit.spec.ts` e `e2e/auth-flows.spec.ts`

---

### P3-01: Relatório HTML de cobertura persistente

**User Story**: Como developer, quero um relatório HTML de cobertura gerado localmente para navegação visual dos gaps de cobertura.

**Why P3**: Nice-to-have para análise visual; o relatório text no terminal é suficiente para CI.

**Acceptance Criteria**:

1. WHEN `pnpm test:unit:coverage` é executado THEN sistema SHALL gerar pasta `coverage/` com relatório HTML navegável
2. WHEN `coverage/` existe THEN `.gitignore` SHALL excluir a pasta

**Independent Test**: Abrir `coverage/index.html` no browser após execução

---

## Edge Cases

- WHEN teste unitário de `auth.ts` usa bcrypt THEN SHALL usar `vi.mock('bcryptjs')` para evitar hashing real e lentidão
- WHEN teste de `session.ts` com `PT_E2E_TOKEN_FILE` THEN SHALL usar `tmp` dir e limpar em `afterEach`
- WHEN handler IPC recebe payload `undefined` ou `null` THEN sistema SHALL rejeitar com erro de validação (não crash)
- WHEN stats handler não encontra sessões THEN SHALL retornar estrutura com zeros (não array vazio)
- WHEN `situations:list` é chamado sem filtro de groupId THEN SHALL retornar todas as situações activas do user

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| COV-01 | P1-01: situations IPC | Tasks | Pending |
| COV-02 | P1-01: situations create dedup | Tasks | Pending |
| COV-03 | P1-01: situations soft-delete | Tasks | Pending |
| COV-04 | P1-01: situations duplicate naming | Tasks | Pending |
| COV-05 | P1-02: auth register validation | Tasks | Pending |
| COV-06 | P1-02: auth login wrong password | Tasks | Pending |
| COV-07 | P1-02: auth:me token invalid | Tasks | Pending |
| COV-08 | P1-03: session JWT sign/verify | Tasks | Pending |
| COV-09 | P1-03: session PT_E2E_TOKEN_FILE | Tasks | Pending |
| COV-10 | P1-04: training:nextHand | Tasks | Pending |
| COV-11 | P1-04: training:submitAnswer correcto | Tasks | Pending |
| COV-12 | P1-04: training:submitAnswer incorrecto | Tasks | Pending |
| COV-13 | P1-04: training:endSession | Tasks | Pending |
| COV-14 | P1-05: stats:bySituation | Tasks | Pending |
| COV-15 | P1-05: stats:evolution | Tasks | Pending |
| COV-16 | P1-05: stats:worstHands | Tasks | Pending |
| COV-17 | P1-06: vitest coverage thresholds CI | Tasks | Pending |
| COV-18 | P2-01: grid.ts edge cases | Tasks | Pending |
| COV-19 | P2-02: componentes renderer | Tasks | Pending |
| COV-20 | P2-03: E2E situation-edit | Tasks | Pending |
| COV-21 | P2-03: E2E auth-flows logout | Tasks | Pending |
| COV-22 | P3-01: HTML coverage report | Tasks | Pending |

**Coverage:** 22 total, 0 mapped to tasks, 22 unmapped ⚠️

---

## Success Criteria

- [ ] `pnpm test:unit` passa com statements ≥ 80%, branches ≥ 75%, functions ≥ 85%, lines ≥ 80%
- [ ] Nenhum ficheiro em `main/ipc/` ou `main/services/` com 0% de cobertura
- [ ] `vitest.config.ts` com thresholds configurados (CI falha se abaixo)
- [ ] `pnpm test` (unit + E2E) verde sem regressões
- [ ] Novos testes seguem convenções existentes (vi.mock pattern, jsdom environment para renderer)
