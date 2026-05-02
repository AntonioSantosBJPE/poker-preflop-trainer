# Migracao para shadcn/ui e sistema de componentes compartilhados - Tasks

**Status:** Draft  
**Spec:** `spec.md`  
**Design:** `design.md`  
**Requisitos foco:** SHUI-01 a SHUI-18

---

## Convencoes

- `[P]` = pode correr em paralelo com outras tasks do mesmo bloco
- Como `.specs/codebase/TESTING.md` nao existe, os gates usam as convencoes reais do repo:
  - quick: `pnpm test:unit`
  - e2e feature: `pnpm playwright test <specs>`
  - full: `pnpm test`
- Ao final de cada bloco do plano de execucao, executar obrigatoriamente `pnpm test`.
- Bloco so pode ser considerado concluido com `pnpm test` verde.
- Todo componente/hook/provider extraido do renderer deve receber teste unitario na mesma task
- Se houver divergencia relevante entre spec/design e implementacao: marcar `SPEC_DEVIATION`
- Skills recomendadas por task:
  - `shadcn` para init/add/update de componentes base
  - `vercel-composition-patterns` para APIs de compostos e variantes explicitas

---

## Execution Plan

### Bloco 0 - Fundacao

`T-01 -> T-02 -> T-03`

### Bloco 1 - Componentes compartilhados

Depois de `T-03`:

`{ T-04 [P], T-05 [P], T-06 [P] } -> T-07`

### Bloco 2 - CRUD e editor de situacao

Depois de `T-07`:

`T-08 -> T-09 -> T-10`

### Bloco 3 - Treino e treino simultaneo

Depois de `T-07`:

`T-11 -> { T-12 [P], T-13 [P] }`

### Bloco 4 - Estatisticas e fechamento

`T-14 -> T-15 -> T-16`

---

## Task Breakdown

### T-01 - Inicializar `shadcn/ui` no renderer existente

**O que:** Criar `components.json`, configurar aliases/caminhos e adicionar a primeira leva de componentes base do `shadcn/ui`.

**Onde:**

- `components.json`
- `src/renderer/src/components/ui/*`
- `src/renderer/src/index.css`

**Design ref:** `design.md` -> 3.1, 3.2, 3.3

**Cobre:** SHUI-01, SHUI-02, SHUI-04

**Depends on:** -

**Reuses:** Tokens e fontes atuais de `src/renderer/src/index.css`

**Done when:**

- existe `components.json` funcional para o renderer
- o CSS global continua sendo `src/renderer/src/index.css`
- os componentes base escolhidos para a migracao estao disponiveis em `components/ui`
- a aplicacao continua compilando com a identidade visual existente

**Tests:** none
**Gate:** `pnpm typecheck`

---

### T-02 - Preparar harness de testes DOM para o renderer

**O que:** Evoluir a configuracao de testes para suportar componentes React do renderer em ambiente DOM, mantendo os testes `node` existentes.

**Onde:**

- `vitest.config.ts`
- `src/renderer/src/test/` (novo)
- `package.json`

**Design ref:** `design.md` -> 6, 7.1

**Cobre:** SHUI-03, SHUI-15

**Depends on:** T-01

**Reuses:** Suite Vitest atual para `src/main/**` e `src/shared/**`

**Done when:**

- o projeto suporta testes unitarios de renderer com DOM
- existe setup para `window.api` mockado
- os testes existentes de `main/shared` continuam a passar
- existe pelo menos um teste smoke do renderer validando o harness

**Tests:** unit
**Gate:** `pnpm test:unit`

---

### T-03 - Definir convencoes de pastas e wrappers compartilhados

**O que:** Criar a estrutura inicial de `components/app`, `components/forms`, `components/training`, `components/stats`, `components/situations` e documentar/importar utilitarios comuns.

**Onde:**

- `src/renderer/src/components/app/`
- `src/renderer/src/components/forms/`
- `src/renderer/src/components/training/`
- `src/renderer/src/components/stats/`
- `src/renderer/src/components/situations/`

**Design ref:** `design.md` -> 3, 4

**Cobre:** SHUI-04, SHUI-05, SHUI-07, SHUI-18

**Depends on:** T-02

**Reuses:** Componentes `shadcn/ui` de `components/ui`

**Done when:**

- a estrutura de pastas para UI compartilhada existe
- imports base apontam para as novas camadas de componentes
- nao ha dependencia circular entre `ui`, `app` e `domain`

**Tests:** none
**Gate:** `pnpm typecheck`

---

### T-04 - Criar shell compartilhado da aplicacao [P]

**O que:** Extrair `AppSidebar`, `PageHeader`, `SectionCard`, `StatCard`, `EmptyState`, `ConfirmActionDialog` e `EntityTable`.

**Onde:**

- `src/renderer/src/components/app/*`
- `src/renderer/src/components/Layout.tsx`

**Design ref:** `design.md` -> 4.1

**Cobre:** SHUI-05, SHUI-06

**Depends on:** T-03

**Reuses:** `button`, `card`, `dialog`, `alert-dialog`, `table`, `separator`

**Done when:**

- `AppLayout` usa o novo shell compartilhado
- confirmacoes destrutivas deixam de depender de `confirm()`/`alert()` nos fluxos migrados
- `PageHeader`, `SectionCard`, `StatCard` e `EmptyState` sao reutilizaveis por ao menos duas paginas
- existem testes unitarios cobrindo shell, dialog e estados vazios

**Tests:** unit
**Gate:** `pnpm test:unit`

---

### T-05 - Criar sistema compartilhado de formularios [P]

**O que:** Extrair campos e mensagens reutilizaveis baseados em `shadcn/ui` para integracao com `react-hook-form`.

**Onde:**

- `src/renderer/src/components/forms/*`

**Design ref:** `design.md` -> 4.2

**Cobre:** SHUI-07, SHUI-15

**Depends on:** T-03

**Reuses:** `input`, `textarea`, `select`, `label`, `toggle-group`

**Done when:**

- existem wrappers reutilizaveis para texto, numero, select, textarea e erro
- os wrappers seguem a composicao recomendada do `shadcn`
- existem testes unitarios cobrindo estados normal, invalido e disabled

**Tests:** unit
**Gate:** `pnpm test:unit`

---

### T-06 - Criar wrappers compartilhados de filtros e metricas [P]

**O que:** Extrair `FilterToolbar`, `StatsOverviewCards`, wrappers de chart/lista e componentes de toolbar.

**Onde:**

- `src/renderer/src/components/app/FilterToolbar.tsx`
- `src/renderer/src/components/stats/*`

**Design ref:** `design.md` -> 4.5

**Cobre:** SHUI-05, SHUI-14, SHUI-15

**Depends on:** T-03

**Reuses:** `tabs`, `card`, `badge`, `separator`

**Done when:**

- `FilterToolbar` e `StatsOverviewCards` existem como blocos independentes
- wrappers de chart/table possuem empty state padrao
- testes unitarios cobrem filtros, metricas e estados sem dados

**Tests:** unit
**Gate:** `pnpm test:unit`

---

### T-07 - Consolidar guardrails de composicao e variantes explicitas

**O que:** Aplicar as convencoes de composicao nas familias compartilhadas antes de migrar paginas complexas.

**Onde:**

- componentes criados em `T-04`, `T-05`, `T-06`

**Design ref:** `design.md` -> 5, 6

**Cobre:** SHUI-17, SHUI-18

**Depends on:** T-04, T-05, T-06

**Reuses:** `vercel-composition-patterns`

**Done when:**

- nao ha APIs novas baseadas em `isSimultaneous`, `isEditing`, `renderHeader`, `renderFooter` e equivalentes sem justificativa forte
- variantes explicitas existem para fluxos de treino single/simultaneo quando a estrutura divergir
- componentes com estado compartilhado usam provider/compound component apenas quando ha ganho claro

**Tests:** none
**Gate:** `pnpm typecheck`

---

### T-08 - Migrar `LoginPage`, `DashboardPage` e shell principal

**O que:** Refatorar as paginas mais simples para validar a base visual, o shell e os wrappers de formulario/metrica.

**Onde:**

- `src/renderer/src/pages/LoginPage.tsx`
- `src/renderer/src/pages/DashboardPage.tsx`
- `src/renderer/src/components/Layout.tsx`

**Design ref:** `design.md` -> 4.1, 4.2, 5

**Cobre:** SHUI-05, SHUI-07, SHUI-15, SHUI-16

**Depends on:** T-07

**Reuses:** `PageHeader`, `StatCard`, `AuthForm`, `AppSidebar`

**Done when:**

- login usa componentes de formulario e card compartilhados
- dashboard usa cards resumo compartilhados
- layout principal usa shell compartilhado
- existem testes unitarios para login/dashboard/layout
- `e2e/auth.spec.ts`, `e2e/dashboard.spec.ts` e `e2e/smoke.spec.ts` continuam verdes

**Tests:** unit + e2e feature
**Gate:** `pnpm playwright test e2e/auth.spec.ts e2e/dashboard.spec.ts e2e/smoke.spec.ts`

---

### T-09 - Migrar `GroupsPage`, `GroupCard`, `GroupDetailPage` e `SituationsPage`

**O que:** Consolidar listagens CRUD em torno de dialogs, tabelas e empty states compartilhados.

**Onde:**

- `src/renderer/src/pages/GroupsPage.tsx`
- `src/renderer/src/components/groups/GroupCard.tsx`
- `src/renderer/src/pages/GroupDetailPage.tsx`
- `src/renderer/src/pages/SituationsPage.tsx`
- `src/renderer/src/components/situations/*`

**Design ref:** `design.md` -> 4.3, 5

**Cobre:** SHUI-05, SHUI-06, SHUI-08, SHUI-09, SHUI-15, SHUI-16

**Depends on:** T-07

**Reuses:** `EntityTable`, `ConfirmActionDialog`, `PageHeader`, `EmptyState`, `FilterToolbar`

**Done when:**

- grupos e situacoes usam listagens/componentes compartilhados
- criacao, rename e archive de grupos usam dialogs acessiveis
- archive de situacoes deixa de usar `confirm()`
- existem testes unitarios para listagens, dialogs e acoes de linha
- suites E2E de grupos e situacoes continuam verdes

**Tests:** unit + e2e feature
**Gate:** `pnpm playwright test e2e/situations.spec.ts e2e/situation-groups`

---

### T-10 - Modularizar `SituationEditPage` e `RangeGrid13`

**O que:** Quebrar o editor de situacao em formulario, painel de acoes e painel de range, mantendo invariantes de dominio do grid.

**Onde:**

- `src/renderer/src/pages/SituationEditPage.tsx`
- `src/renderer/src/components/grid/RangeGrid13.tsx`
- `src/renderer/src/components/situations/*`

**Design ref:** `design.md` -> 4.3, 6

**Cobre:** SHUI-07, SHUI-10, SHUI-15, SHUI-16, SHUI-18

**Depends on:** T-05, T-09

**Reuses:** `SituationForm`, `SituationActionsEditor`, `RangeEditorPanel`

**Done when:**

- a pagina deixa de concentrar toda a renderizacao do editor
- subcomponentes extraidos possuem testes unitarios focados
- `RangeGrid13` mantem comportamentos E2E existentes
- o arquivo de pagina fica restrito a orquestracao, carregamento e submit

**Tests:** unit + e2e feature
**Gate:** `pnpm playwright test e2e/situations.spec.ts e2e/range-grid-improvements.spec.ts e2e/situation-groups/situation-group-field.spec.ts`

---

### T-11 - Criar compostos de configuracao de treino

**O que:** Extrair `GroupSelectionStep`, `SituationChecklist`, `SessionSettingsForm` e criar variantes explicitas para treino simples e simultaneo.

**Onde:**

- `src/renderer/src/components/training/*`
- `src/renderer/src/pages/TrainingConfigPage.tsx`
- `src/renderer/src/pages/SimultaneousTrainingConfigPage.tsx`

**Design ref:** `design.md` -> 4.4, 6

**Cobre:** SHUI-11, SHUI-13, SHUI-15, SHUI-17

**Depends on:** T-05, T-07

**Reuses:** `SingleTrainingConfigForm`, `SimultaneousTrainingConfigForm`

**Done when:**

- treino normal e simultaneo compartilham blocos menores sem cair em `isSimultaneous`
- existem testes unitarios para wizard, checklist e formularios
- comportamento atual de selecao e validacao e preservado

**Tests:** unit
**Gate:** `pnpm test:unit`

---

### T-12 - Migrar `TrainingSessionPage` e `TrainingResultPage` [P]

**O que:** Refatorar sessao e resultado do treino normal usando componentes compartilhados de sessao, feedback, leave dialog e resumo.

**Onde:**

- `src/renderer/src/pages/TrainingSessionPage.tsx`
- `src/renderer/src/pages/TrainingResultPage.tsx`
- `src/renderer/src/components/training/*`

**Design ref:** `design.md` -> 4.4, 5

**Cobre:** SHUI-12, SHUI-14, SHUI-15, SHUI-16

**Depends on:** T-11

**Reuses:** `TrainingSessionHeader`, `TrainingActionButtons`, `TrainingFeedbackPanel`, `LeaveTrainingDialog`, `TrainingSummaryCards`

**Done when:**

- sessao normal usa dialog acessivel para abandono
- painel de feedback e acoes sao componentes dedicados
- resultado usa cards/resumo compartilhados
- existem testes unitarios para dialog, feedback e cards
- `e2e/training.spec.ts` permanece verde

**Tests:** unit + e2e feature
**Gate:** `pnpm playwright test e2e/training.spec.ts`

---

### T-13 - Migrar `SimultaneousTrainingSessionPage` e `SimultaneousTrainingSummaryPage` [P]

**O que:** Refatorar treino simultaneo usando variantes explicitas e `SimultaneousTablePanel`, sem regressao de isolamento entre mesas.

**Onde:**

- `src/renderer/src/pages/SimultaneousTrainingSessionPage.tsx`
- `src/renderer/src/pages/SimultaneousTrainingSummaryPage.tsx`
- `src/renderer/src/components/training/*`

**Design ref:** `design.md` -> 4.4, 6

**Cobre:** SHUI-12, SHUI-13, SHUI-14, SHUI-15, SHUI-16, SHUI-17

**Depends on:** T-11

**Reuses:** `SimultaneousTablePanel`, `LeaveTrainingDialog`, `TrainingSummaryCards`

**Done when:**

- cada mesa simultanea usa painel dedicado e testavel
- leave guard usa overlay acessivel
- resumo simultaneo reaproveita blocos de metricas
- existem testes unitarios para painel de mesa e resumo
- suites E2E de treino simultaneo continuam verdes

**Tests:** unit + e2e feature
**Gate:** `pnpm playwright test e2e/simultaneous-training`

---

### T-14 - Migrar `StatsPage` para filtros e blocos compartilhados

**O que:** Refatorar filtros, cards, tabela e listas de `StatsPage` usando `shadcn/ui` e wrappers compartilhados.

**Onde:**

- `src/renderer/src/pages/StatsPage.tsx`
- `src/renderer/src/components/stats/*`

**Design ref:** `design.md` -> 4.5, 5

**Cobre:** SHUI-05, SHUI-14, SHUI-15, SHUI-16

**Depends on:** T-06, T-12, T-13

**Reuses:** `StatsFilterBar`, `StatsOverviewCards`, `BySituationTable`, `WorstHandsList`, `TimelineChartCard`

**Done when:**

- filtros de grupo/tipo usam componentes compartilhados e acessiveis
- cards/tabela/lista usam wrappers compartilhados
- existem testes unitarios para filtros, estados vazios e transformacao de dados
- suites E2E de stats continuam verdes

**Tests:** unit + e2e feature
**Gate:** `pnpm playwright test e2e/stats.spec.ts e2e/situation-groups/stats-filter.spec.ts e2e/simultaneous-training/stats-segmentation.spec.ts`

---

### T-15 - Remover wrappers legados e consolidar imports/estilos

**O que:** Eliminar dependencias residuais de `.pt-*`, markup antigo e imports mortos depois que todas as paginas estiverem migradas.

**Onde:**

- `src/renderer/src/index.css`
- paginas/componentes do renderer afetados

**Design ref:** `design.md` -> 2, 8, 9

**Cobre:** SHUI-02, SHUI-04, SHUI-16

**Depends on:** T-08, T-09, T-10, T-12, T-13, T-14

**Reuses:** Base `shadcn/ui` e compostos internos consolidados

**Done when:**

- wrappers `.pt-btn-*`, `.pt-card`, `.pt-input`, `.pt-page-title` deixam de ser necessarios ou ficam estritamente limitados a legados residuais documentados
- imports mortos e classes antigas nao usadas sao removidos
- build e typecheck continuam limpos

**Tests:** none
**Gate:** `pnpm typecheck`

---

### T-16 - Rodar regressao completa e fechar a feature

**O que:** Executar a validacao final da migracao com suite completa e revisar rastreabilidade dos requisitos.

**Onde:**

- repo inteiro
- `.specs/features/shadcn-ui-migration/`

**Design ref:** `design.md` -> 7, 8, 9

**Cobre:** SHUI-01 a SHUI-18

**Depends on:** T-15

**Reuses:** todas as tasks anteriores

**Done when:**

- `pnpm test` passa
- requisitos da spec estao atualizados para `Verified` conforme implementacao
- eventuais `SPEC_DEVIATION` ficam registrados
- a feature esta pronta para PR/revisao

**Tests:** full
**Gate:** `pnpm test`
