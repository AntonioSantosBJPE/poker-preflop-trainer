# Migracao para shadcn/ui e sistema de componentes compartilhados

## Problem Statement

O renderer atual concentra a maior parte da carga cognitiva de UI dentro dos arquivos de pagina. Ha pouca reutilizacao entre fluxos visualmente parecidos, o que aumenta o custo de manutencao, dificulta evolucao de layout e empurra a maior parte da cobertura para E2E. Alguns sintomas concretos hoje:

- `src/renderer/src/pages/SituationEditPage.tsx` tem 484 linhas e mistura orquestracao, formulario, tabela de acoes e editor de range.
- `src/renderer/src/pages/SimultaneousTrainingSessionPage.tsx` tem 289 linhas e concentra timer, estado por mesa, dialogs e renderizacao.
- `src/renderer/src/pages/TrainingSessionPage.tsx`, `StatsPage.tsx`, `TrainingConfigPage.tsx` e `SimultaneousTrainingConfigPage.tsx` repetem padroes de cards, formularios, filtros, listas e confirmacoes.
- O projeto usa utilitarios locais (`.pt-input`, `.pt-card`, `.pt-btn-*`) e markup customizado em vez de um sistema de componentes padrao.
- Nao ha testes unitarios no renderer hoje; a seguranca de comportamento depende quase totalmente de Playwright.

O objetivo desta feature e migrar o frontend para uma base em `shadcn/ui`, introduzir componentes compartilhados e compostos reutilizaveis, e quebrar a refatoracao em ondas por pagina com cobertura automatizada adequada.

## Goals

- [x] Inicializar `shadcn/ui` no renderer atual, preservando a identidade visual ja estabelecida em `src/renderer/src/index.css`.
- [x] Substituir gradualmente wrappers locais e markup repetido por componentes `shadcn/ui` e compostos internos reutilizaveis.
- [x] Reduzir a responsabilidade de renderizacao das paginas, movendo blocos visuais e interativos para componentes menores, coesos e testaveis.
- [x] Adotar padroes de composicao coerentes com `vercel-composition-patterns`, evitando proliferacao de boolean props e render APIs acopladas.
- [x] Garantir cobertura de testes por camada: manter E2E para fluxos completos e adicionar testes unitarios para cada componente/hook/provider extraido.
- [x] Executar a migracao pagina por pagina, sem regressao funcional em autenticacao, grupos, situacoes, treino, treino simultaneo e estatisticas.

## Out of Scope

| Feature                                                                           | Reason                                                                              |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Reescrever regras de negocio do poker, avaliacao ou IPC                           | A feature e de arquitetura de UI e manutencao do renderer                           |
| Migrar React Router, Zustand, Electron IPC ou schema de DB sem necessidade direta | Mudancas estruturais fora do objetivo principal aumentam risco                      |
| Redesenho visual completo do produto                                              | A prioridade e consolidar sistema de componentes com paridade comportamental        |
| Substituir Recharts por outra biblioteca                                          | Estatisticas podem continuar em Recharts, envolvidas por componentes compartilhados |
| Refatorar `RangeGrid13` para outro modelo de dominio                              | O grid pode ganhar casca/composicao nova, mas invariantes de dominio permanecem     |
| Introduzir Storybook ou catalogo visual nesta iteracao                            | Pode ser avaliado depois da consolidacao da base compartilhada                      |

---

## Current Baseline

### Inventario de paginas do renderer

| Pagina                   | Ficheiro                                                     | Tamanho atual | Cobertura E2E atual                                                                                                      | Lacuna principal                                                    |
| ------------------------ | ------------------------------------------------------------ | ------------: | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Login                    | `src/renderer/src/pages/LoginPage.tsx`                       |    186 linhas | `e2e/auth.spec.ts`, `e2e/smoke.spec.ts`                                                                                  | Sem testes unitarios; formulario e tabs embutidos                   |
| Dashboard                | `src/renderer/src/pages/DashboardPage.tsx`                   |     52 linhas | `e2e/dashboard.spec.ts`, `e2e/smoke.spec.ts`                                                                             | Cards resumo e fallback sem componente compartilhado                |
| Grupos                   | `src/renderer/src/pages/GroupsPage.tsx`                      |    116 linhas | `e2e/situation-groups/crud-groups.spec.ts`                                                                               | Create form inline; estado visual repetido                          |
| Detalhe do grupo         | `src/renderer/src/pages/GroupDetailPage.tsx`                 |    161 linhas | `e2e/situation-groups/full-flow.spec.ts`, `archive-cascade.spec.ts`                                                      | Tabela, empty state e confirmacao customizados                      |
| Situacoes                | `src/renderer/src/pages/SituationsPage.tsx`                  |    148 linhas | `e2e/situations.spec.ts`, `e2e/situation-groups/*.spec.ts`                                                               | Filtro, tabela e acoes repetem padroes do detalhe de grupo          |
| Editor de situacao       | `src/renderer/src/pages/SituationEditPage.tsx`               |    484 linhas | `e2e/situations.spec.ts`, `e2e/range-grid-improvements.spec.ts`, `e2e/situation-groups/situation-group-field.spec.ts`    | Arquivo monolitico com baixa reutilizacao                           |
| Config treino            | `src/renderer/src/pages/TrainingConfigPage.tsx`              |    221 linhas | `e2e/training.spec.ts`, `e2e/situation-groups/training-selection.spec.ts`                                                | Wizard e seletores repetidos em treino simultaneo                   |
| Sessao treino            | `src/renderer/src/pages/TrainingSessionPage.tsx`             |    274 linhas | `e2e/training.spec.ts`                                                                                                   | Dialog e botoes de acao customizados                                |
| Resultado treino         | `src/renderer/src/pages/TrainingResultPage.tsx`              |     91 linhas | `e2e/training.spec.ts`, `e2e/stats.spec.ts`                                                                              | Stat cards e chart shell repetem Stats/Summary                      |
| Config treino simultaneo | `src/renderer/src/pages/SimultaneousTrainingConfigPage.tsx`  |    229 linhas | `e2e/simultaneous-training/session-config.spec.ts`                                                                       | Duplicacao forte do treino normal                                   |
| Sessao treino simultaneo | `src/renderer/src/pages/SimultaneousTrainingSessionPage.tsx` |    289 linhas | `e2e/simultaneous-training/*.spec.ts`                                                                                    | Estado e layout por mesa fortemente acoplados                       |
| Resumo treino simultaneo | `src/renderer/src/pages/SimultaneousTrainingSummaryPage.tsx` |     86 linhas | `e2e/simultaneous-training/full-flow.spec.ts`                                                                            | Cards/resumo repetidos                                              |
| Estatisticas             | `src/renderer/src/pages/StatsPage.tsx`                       |    255 linhas | `e2e/stats.spec.ts`, `e2e/situation-groups/stats-filter.spec.ts`, `e2e/simultaneous-training/stats-segmentation.spec.ts` | Filtros, tabs, metric cards e tabela sem componentes compartilhados |

### Baseline de testes

- E2E existente: cobertura ampla dos fluxos principais do usuario.
- Unitarios do renderer: inexistentes no baseline atual.
- Vitest atual: configurado apenas com `environment: 'node'`, adequado a `main` e `shared`, mas insuficiente para componentes React.

---

## User Stories

### P1: Fundacao de design system e testes do renderer ⭐ MVP

**User Story**: Como maintainer, quero inicializar `shadcn/ui` e uma infraestrutura de testes do renderer para que a migracao de UI tenha base padronizada e segura.

**Why P1**: Sem base de componentes e sem harness de testes, a refatoracao tende a virar apenas troca de classes CSS sem ganho estrutural.

**Acceptance Criteria**:

1. WHEN a feature for iniciada THEN o sistema SHALL passar a ter `components.json` configurado para o renderer e aliases coerentes com o projeto.
2. WHEN componentes `shadcn/ui` forem adicionados THEN o sistema SHALL preservar tokens semanticos, tipografia e paleta existentes em `src/renderer/src/index.css`.
3. WHEN um componente React do renderer for extraido THEN o sistema SHALL poder ser testado em ambiente DOM isolado, sem depender de Electron real.
4. WHEN a suite unitaria rodar THEN o sistema SHALL suportar testes `node` para `main/shared` e testes DOM para o renderer na mesma base de projeto.
5. WHEN a equipa adicionar novos componentes de UI THEN o sistema SHALL ter convencoes explicitas para importacao de `components/ui/*` e compostos internos.

**Independent Test**: Criar um componente simples do renderer com teste de interacao, e executar a suite unitaria sem quebrar testes existentes do `main/shared`.

---

### P1: Extrair componentes compartilhados e compostos reutilizaveis ⭐ MVP

**User Story**: Como maintainer, quero substituir markup repetido por componentes compartilhados para reduzir duplicacao e manter consistencia visual/arquitetural.

**Why P1**: A raiz do problema atual e a repeticao de estruturas similares em varias paginas.

**Acceptance Criteria**:

1. WHEN paginas renderizarem titulos, acoes e secoes THEN o sistema SHALL reutilizar compostos compartilhados como cabecalhos, cards de secao, estados vazios e barras de filtro.
2. WHEN fluxos exibirem confirmacoes destrutivas THEN o sistema SHALL usar overlays acessiveis (`AlertDialog`/`Dialog`) em vez de `confirm()` ou `alert()`.
3. WHEN formularios forem refatorados THEN o sistema SHALL usar layout consistente de campos e mensagens de erro com `shadcn/ui`.
4. WHEN tabelas/listagens forem refatoradas THEN o sistema SHALL usar estrutura compartilhada para cabecalho, linhas vazias e celulas de acoes.
5. WHEN dois fluxos tiverem estrutura parecida mas semantica distinta THEN o sistema SHALL preferir variantes explicitas ou compound components, e nao boolean props acumuladas.

**Independent Test**: Reutilizar o mesmo `PageHeader`, `ConfirmActionDialog` ou `EntityTable` em pelo menos duas paginas distintas sem branches condicionais especificos de pagina dentro do componente.

---

### P1: Migrar o fluxo CRUD principal por paginas com paridade comportamental ⭐ MVP

**User Story**: Como utilizador, quero continuar criando, editando, duplicando e arquivando grupos/situacoes sem regressao enquanto a UI e reestruturada.

**Why P1**: CRUD de grupos e situacoes e o nucleo operacional do produto.

**Acceptance Criteria**:

1. WHEN `GroupsPage`, `GroupDetailPage`, `SituationsPage` e `SituationEditPage` forem migradas THEN o comportamento funcional SHALL permanecer equivalente ao baseline atual.
2. WHEN componentes menores forem extraidos do editor de situacao THEN cada um SHALL receber testes unitarios focados na sua responsabilidade.
3. WHEN o editor de situacao for quebrado em compostos THEN o sistema SHALL manter intactos os comportamentos cobertos por `e2e/situations.spec.ts`, `e2e/range-grid-improvements.spec.ts` e `e2e/situation-groups/situation-group-field.spec.ts`.
4. WHEN estados vazios, erros ou confirmacoes ocorrerem THEN a UI SHALL usar os componentes compartilhados definidos na fundacao.

**Independent Test**: Executar a suite E2E existente de grupos e situacoes apos a migracao dessas paginas sem alterar os resultados esperados.

---

### P1: Migrar fluxos de treino, treino simultaneo e estatisticas com componentes explicitos ⭐ MVP

**User Story**: Como utilizador, quero que os fluxos de treino e estatisticas permaneçam funcionais enquanto a UI e modularizada em componentes mais reutilizaveis e legiveis.

**Why P1**: Estes fluxos concentram a maior quantidade de estado de interface e sao onde o risco de regressao visual/comportamental e maior.

**Acceptance Criteria**:

1. WHEN `TrainingConfigPage` e `SimultaneousTrainingConfigPage` forem refatoradas THEN o sistema SHALL compartilhar blocos de selecao e formulario sem unificar os fluxos via props booleanas do tipo `isSimultaneous`.
2. WHEN `TrainingSessionPage` e `SimultaneousTrainingSessionPage` forem refatoradas THEN o sistema SHALL usar variantes explicitas para sessao unica e multi-mesa, compartilhando apenas pecas puras e compostos bem definidos.
3. WHEN `TrainingResultPage`, `SimultaneousTrainingSummaryPage` e `StatsPage` forem migradas THEN cards de metricas, wrappers de chart e tabelas SHALL convergir para componentes reutilizaveis.
4. WHEN filtros e tabs forem renderizados em estatisticas THEN a UI SHALL usar componentes `shadcn/ui` apropriados e acessiveis.
5. WHEN a migracao dessas paginas terminar THEN a suite E2E atual de treino, treino simultaneo e stats SHALL continuar verde.

**Independent Test**: Rodar as suites `e2e/training.spec.ts`, `e2e/stats.spec.ts` e `e2e/simultaneous-training/*.spec.ts` apos cada onda relevante.

---

### P1: Expandir cobertura automatizada por componente, hook e provider ⭐ MVP

**User Story**: Como maintainer, quero que componentes extraidos tenham cobertura unitaria para que futuras alteracoes nao dependam apenas de testes end-to-end.

**Why P1**: A refatoracao aumenta a malha de componentes; sem testes unitarios, so deslocamos a complexidade.

**Acceptance Criteria**:

1. WHEN um componente de apresentacao for criado ou movido para reutilizacao THEN ele SHALL receber teste unitario cobrindo renderizacao base, estados vazios/erro e callbacks relevantes.
2. WHEN um hook ou provider de UI for introduzido THEN ele SHALL receber teste unitario do contrato publico.
3. WHEN uma pagina mantiver responsabilidade apenas de orquestracao THEN seus testes unitarios SHALL focar composicao, transicoes de estado local e integracao com `window.api` mockado.
4. WHEN a migracao de uma pagina for considerada concluida THEN ela SHALL continuar coberta pelo E2E correspondente e pelos novos unitarios dos blocos extraidos.
5. WHEN a feature terminar THEN o renderer SHALL deixar de ter cobertura unitaria nula.

**Independent Test**: Mapear cada nova familia de componente para pelo menos um ficheiro `*.test.tsx` ou `*.spec.tsx` no renderer.

---

### P2: Consolidar linguagem de composicao e extensibilidade

**User Story**: Como equipa, quero uma arquitetura previsivel de componentes para que novas paginas usem a mesma linguagem de composicao e nao reincidam em monolitos.

**Why P2**: Sem guardrails arquiteturais, a duplicacao pode voltar mesmo depois da migracao.

**Acceptance Criteria**:

1. WHEN uma pagina exigir variantes de UI THEN o sistema SHALL preferir componentes explicitos (`SingleTrainingConfigForm`, `SimultaneousTrainingConfigForm`) em vez de um unico componente com varios modos.
2. WHEN um componente complexo precisar partilhar estado entre subpartes THEN o sistema SHALL usar compound components ou provider local com interface clara.
3. WHEN uma API de componente puder ser expressa com `children` THEN o sistema SHALL evitar `renderHeader`, `renderFooter`, `renderActions` e similares.

**Independent Test**: Revisao de codigo das novas familias de componentes nao identifica proliferacao de props booleanas ou render props desnecessarias.

---

## Testing Strategy

### Matriz de cobertura alvo por area

| Area                    | E2E existente a preservar                                                                                                | Novos unitarios esperados                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| App shell               | `e2e/smoke.spec.ts`, `e2e/dashboard.spec.ts`                                                                             | `AppLayout`, nav ativa, toggle de tema, CTA/logout                                |
| Auth                    | `e2e/auth.spec.ts`                                                                                                       | tabs/alternancia, validacao visual, submit error handling                         |
| Groups                  | `e2e/situation-groups/crud-groups.spec.ts`, `archive-cascade.spec.ts`                                                    | `GroupsPage`, `GroupCard`, dialogs de rename/archive                              |
| Situations list         | `e2e/situations.spec.ts`, `e2e/situation-groups/full-flow.spec.ts`                                                       | filtros, empty state, acoes de linha                                              |
| Situation editor        | `e2e/situations.spec.ts`, `e2e/range-grid-improvements.spec.ts`, `situation-group-field.spec.ts`                         | subcomponentes de formulario, lista de acoes, totais, integracao com grid mockado |
| Training config         | `e2e/training.spec.ts`, `e2e/situation-groups/training-selection.spec.ts`                                                | wizard, group picker, checklist, feedback mode                                    |
| Training session/result | `e2e/training.spec.ts`, `e2e/stats.spec.ts`                                                                              | header de sessao, leave dialog, feedback panel, summary cards                     |
| Simultaneous training   | `e2e/simultaneous-training/*.spec.ts`                                                                                    | config variant, table panel, summary cards, leave guard                           |
| Stats                   | `e2e/stats.spec.ts`, `e2e/situation-groups/stats-filter.spec.ts`, `e2e/simultaneous-training/stats-segmentation.spec.ts` | filter bar, stats cards, empty states, chart/table wrappers                       |

### Regras de cobertura desta feature

- E2E continuam sendo o gate de comportamento para fluxos completos do Electron.
- Todo componente reaproveitavel extraido do renderer deve ter cobertura unitaria co-localizada.
- Mocks de `window.api` devem substituir IPC real nos testes unitarios do renderer.
- O grid 13x13, dialogs e filtros precisam de testes unitarios focados em comportamento visual/interativo, nao apenas snapshot.
- Ao concluir cada bloco de execucao (Blocos 0, 1, 2, 3 e 4), a equipa SHALL executar a suite completa com `pnpm test`.
- Um bloco so pode ser marcado como concluido quando `pnpm test` terminar verde (unit + build + E2E).

---

## Edge Cases

- WHEN a migracao substituir `confirm()`/`alert()` THEN o sistema SHALL preservar mensagens destrutivas e fluxo de confirmacao/cancelamento sem quebrar acessibilidade.
- WHEN componentes compartilharem estrutura mas nao semantica THEN o sistema SHALL evitar props como `isSimultaneous`, `isEditing`, `isCompact`, `hasSidebar`, preferindo variantes explicitas.
- WHEN a pagina carregar dados assincronamente THEN estados de loading, empty e error SHALL ser modelados por componentes compartilhados e testados.
- WHEN filtros mudarem em `StatsPage` ou nos configuradores de treino THEN a refatoracao SHALL preservar a integracao com `window.api` e `react-hook-form`.
- WHEN `RangeGrid13` continuar como componente de dominio especializado THEN a casca em volta dele SHALL ser modularizada sem alterar invariantes de dominio existentes.
- WHEN uma pagina ainda nao tiver sido migrada THEN a coexistencia temporaria entre `.pt-*` e `shadcn/ui` SHALL ser suportada sem quebrar a aparencia global.

---

## Requirement Traceability

| Requirement ID | Story                                                                              | Phase       | Status   |
| -------------- | ---------------------------------------------------------------------------------- | ----------- | -------- |
| SHUI-01        | P1: inicializar `shadcn/ui` no renderer                                            | Implemented | Verified |
| SHUI-02        | P1: preservar tokens semanticos e identidade visual                                | Implemented | Verified |
| SHUI-03        | P1: habilitar testes DOM no renderer                                               | Implemented | Verified |
| SHUI-04        | P1: estabelecer convencoes de pastas/imports para UI compartilhada                 | Implemented | Verified |
| SHUI-05        | P1: criar compostos compartilhados para page header/cards/empty states             | Implemented | Verified |
| SHUI-06        | P1: substituir confirmacoes destrutivas por overlays acessiveis                    | Implemented | Verified |
| SHUI-07        | P1: padronizar formularios com `shadcn/ui`                                         | Implemented | Verified |
| SHUI-08        | P1: migrar CRUD de grupos com paridade comportamental                              | Implemented | Verified |
| SHUI-09        | P1: migrar listagem de situacoes com componentes compartilhados                    | Implemented | Verified |
| SHUI-10        | P1: modularizar `SituationEditPage` em componentes menores                         | Implemented | Verified |
| SHUI-11        | P1: migrar configuracao de treino em variantes explicitas                          | Implemented | Verified |
| SHUI-12        | P1: migrar sessoes de treino e overlays associados                                 | Implemented | Verified |
| SHUI-13        | P1: migrar treino simultaneo em compostos reutilizaveis                            | Implemented | Verified |
| SHUI-14        | P1: migrar resultados e estatisticas com metric cards/charts compartilhados        | Implemented | Verified |
| SHUI-15        | P1: adicionar cobertura unitaria aos componentes extraidos                         | Implemented | Verified |
| SHUI-16        | P1: preservar e ampliar gates E2E durante a migracao                               | Implemented | Verified |
| SHUI-17        | P2: evitar boolean prop proliferation e render props desnecessarias                | Implemented | Verified |
| SHUI-18        | P2: adotar compound components/providers locais quando houver estado compartilhado | Implemented | Verified |

**Coverage:** 18 requisitos totais; 18 Verified; 0 pendentes.

---

## Task Execution Tracking

| Task | Status  | Last update |
| ---- | ------- | ----------- |
| T-01 | Done    | 2026-05-02  |
| T-02 | Done    | 2026-05-02  |
| T-03 | Done    | 2026-05-02  |
| T-04 | Done    | 2026-05-02  |
| T-05 | Done    | 2026-05-02  |
| T-06 | Done    | 2026-05-02  |
| T-07 | Done    | 2026-05-02  |
| T-08 | Done    | 2026-05-02  |
| T-09 | Done    | 2026-05-02  |
| T-10 | Done    | 2026-05-02  |
| T-11 | Done    | 2026-05-02  |
| T-12 | Done    | 2026-05-02  |
| T-13 | Done    | 2026-05-02  |
| T-14 | Done    | 2026-05-02  |
| T-15 | Done    | 2026-05-02  |
| T-16 | Done    | 2026-05-02  |

---

## Success Criteria

- [x] O projeto passa a ter `components.json` e base `shadcn/ui` configurada no renderer.
- [x] O renderer deixa de depender exclusivamente de E2E para seguranca de UI, passando a ter cobertura unitaria para os componentes extraidos.
- [x] Nenhuma pagina principal permanece como monolito de renderizacao equivalente ao baseline atual sem um plano de decomposicao executado.
- [x] Fluxos cobertos hoje por Playwright continuam verdes durante e apos a migracao.
- [x] O sistema de componentes compartilhados reduz duplicacao entre `TrainingConfigPage`/`SimultaneousTrainingConfigPage`, `TrainingResultPage`/`SimultaneousTrainingSummaryPage`, `SituationsPage`/`GroupDetailPage`, e cards/tabelas/filtros de stats.
- [x] Novos componentes seguem uma linguagem de composicao explicita, sem regressao para APIs baseadas em modos booleanos acumulados.
