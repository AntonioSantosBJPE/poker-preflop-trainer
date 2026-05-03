# Migracao para shadcn/ui e sistema de componentes compartilhados - Design

**Status:** Implemented  
**Requisitos cobertos:** SHUI-01 a SHUI-18  
**Spec base:** `spec.md`

---

## 1. Visao Geral

A migracao deve ser incremental, orientada por pagina e guiada por componentes compartilhados. A estrategia recomendada e:

1. preparar a fundacao (`shadcn/ui` + harness de testes do renderer);
2. criar familias compartilhadas de componentes;
3. migrar paginas por ondas com cobertura automatizada;
4. remover wrappers antigos (`.pt-*`) apenas no fim, quando nao houver dependencias residuais.

O foco nao e "trocar classes por classes", mas sim reduzir acoplamento entre orquestracao de pagina e renderizacao.

---

## 2. Decisoes de Arquitetura

### DA-01: `shadcn/ui` como base de source components

- O projeto vai adicionar `shadcn/ui` como codigo-fonte local, nao como dependencia opaca de biblioteca.
- Componentes gerados ficam em `src/renderer/src/components/ui/*`.
- Componentes compartilhados do produto ficam acima deles, em pastas semanticas do renderer.

**Impacto:** SHUI-01, SHUI-04

### DA-02: Preservar a identidade visual atual atraves de tokens semanticos

- `src/renderer/src/index.css` ja possui tokens semanticos (`background`, `foreground`, `primary`, `muted`, `card`, `border`, etc.) e tipografia definida.
- A configuracao do `shadcn/ui` deve reaproveitar esses tokens, sem introduzir uma paleta paralela.
- A migracao nao deve degradar o tema felt/ambar ja existente.

**Impacto:** SHUI-02

### DA-03: Separar componentes em tres niveis

1. `components/ui/*`
   - componentes base do `shadcn/ui` adicionados pela CLI.
2. `components/app/*`
   - blocos compartilhados neutros da aplicacao: shell, page headers, dialogs, empty states, tables, cards, toolbars.
3. `components/domain/*`
   - compostos ligados ao dominio do produto: `TrainingConfigWizard`, `SituationForm`, `SessionTablePanel`, `StatsFilterBar`, `RangeEditorPanel`.

**Impacto:** SHUI-04, SHUI-05, SHUI-07, SHUI-18

### DA-04: Pagina como orquestradora, nao como componente de render monolitico

- As paginas mantem:
  - roteamento;
  - composicao macro;
  - coordenacao com `window.api`;
  - estado de fluxo de alto nivel.
- Componentes extraidos assumem:
  - blocos de apresentacao;
  - formularios/partes de formulario;
  - dialogs;
  - tabelas/listas;
  - paines de resumo.

**Impacto:** SHUI-08 a SHUI-15

### DA-05: Composicao explicita em vez de boolean props

Aplicar diretamente os guardrails de `vercel-composition-patterns`:

- nao criar componentes do tipo `TrainingConfigForm({ isSimultaneous, isCompact, showBackButton })`;
- preferir variantes explicitas:
  - `SingleTrainingConfigForm`
  - `SimultaneousTrainingConfigForm`
  - `SingleTrainingSessionView`
  - `SimultaneousTrainingSessionView`
- quando varias subpartes precisarem de estado compartilhado, usar compound components com provider local em vez de `renderHeader`, `renderFooter`, `renderActions`.

**Impacto:** SHUI-11, SHUI-12, SHUI-13, SHUI-17, SHUI-18

### DA-06: Cobertura unitaria do renderer e mandatoria para componentes extraidos

- O Vitest atual segue bom para `main/shared`, mas o renderer precisa de ambiente DOM.
- A recomendacao e separar configuracao por ambiente de teste:
  - `node` para `src/main/**` e `src/shared/**`;
  - `jsdom` para `src/renderer/**`.
- Componentes do renderer devem usar mocks de `window.api`, `react-router-dom` e stores quando necessario.

**Impacto:** SHUI-03, SHUI-15

### DA-07: Migracao por ondas com coexistencia temporaria

- Componentes antigos e novos podem coexistir temporariamente.
- A remocao de `.pt-input`, `.pt-card`, `.pt-btn-primary`, `.pt-btn-secondary`, `.pt-page-title` deve ocorrer apenas apos a ultima onda que os utilize.
- Cada onda precisa de gate unitario + E2E de regressao das paginas afetadas.

**Impacto:** SHUI-16

---

## 3. Fundacao Tecnica

### 3.1 Inicializacao `shadcn/ui`

Estado atual observado:

- projeto usa `pnpm`;
- renderer baseado em Vite + Tailwind 4;
- `components.json` ainda nao existe;
- tokens globais ja estao em `src/renderer/src/index.css`.

Passos de fundacao:

1. inicializar `shadcn/ui` no renderer existente;
2. configurar aliases para `@/` ou alias equivalente real do projeto;
3. apontar o CSS global para `src/renderer/src/index.css`;
4. validar que o preset/base escolhido funciona com o stack atual antes de adicionar componentes.

### 3.2 Primeira leva de componentes `shadcn/ui`

Base recomendada para este projeto:

- `button`
- `card`
- `input`
- `textarea`
- `label`
- `select`
- `checkbox`
- `tabs`
- `dialog`
- `alert-dialog`
- `table`
- `badge`
- `separator`
- `skeleton`
- `tooltip`
- `scroll-area`

Componentes opcionais por necessidade real:

- `sheet` para paines laterais futuros
- `dropdown-menu` para menus contextuais
- `toggle-group` para conjuntos pequenos de opcoes
- `sonner` para feedbacks nao bloqueantes

### 3.3 Convencoes `shadcn` a aplicar

Das regras locais da skill:

- formularios com `FieldGroup` + `Field`;
- overlays destrutivos com `AlertDialog`;
- `TabsTrigger` sempre dentro de `TabsList`;
- `CardHeader` / `CardContent` / `CardFooter` completos quando fizer sentido;
- `Empty` e `Alert` para estados vazios/callouts, evitando divs customizadas;
- `gap-*` em vez de `space-y-*` nos novos componentes;
- `cn()` para classes condicionais.

---

## 4. Estrutura de Componentes Proposta

### 4.1 Shell e app-level

Arquivos alvo:

- `components/app/AppSidebar.tsx`
- `components/app/PageHeader.tsx`
- `components/app/SectionCard.tsx`
- `components/app/StatCard.tsx`
- `components/app/EmptyState.tsx`
- `components/app/ConfirmActionDialog.tsx`
- `components/app/EntityTable.tsx`
- `components/app/FilterToolbar.tsx`

Uso previsto:

- `AppLayout`, `DashboardPage`, `GroupsPage`, `SituationsPage`, `StatsPage`, `TrainingResultPage`, `SimultaneousTrainingSummaryPage`

### 4.2 Formularios e campos compartilhados

Arquivos alvo:

- `components/forms/FormField.tsx`
- `components/forms/FormSelectField.tsx`
- `components/forms/FormNumberField.tsx`
- `components/forms/FormTextareaField.tsx`
- `components/forms/FieldError.tsx`
- `components/forms/ToggleOptionGroup.tsx`

Uso previsto:

- `LoginPage`
- `SituationEditPage`
- `TrainingConfigPage`
- `SimultaneousTrainingConfigPage`

### 4.3 Componentes de dominio: grupos e situacoes

Arquivos alvo:

- `components/groups/GroupCreateDialog.tsx`
- `components/groups/GroupRenameDialog.tsx`
- `components/groups/GroupArchiveDialog.tsx`
- `components/situations/SituationsTable.tsx`
- `components/situations/SituationFilterBar.tsx`
- `components/situations/SituationForm.tsx`
- `components/situations/SituationActionsEditor.tsx`
- `components/situations/SituationActionRow.tsx`
- `components/situations/RangeEditorPanel.tsx`

Uso previsto:

- `GroupsPage`
- `GroupDetailPage`
- `SituationsPage`
- `SituationEditPage`

### 4.4 Componentes de dominio: treino

Arquivos alvo:

- `components/training/GroupSelectionStep.tsx`
- `components/training/SituationChecklist.tsx`
- `components/training/SessionSettingsForm.tsx`
- `components/training/SingleTrainingConfigForm.tsx`
- `components/training/SimultaneousTrainingConfigForm.tsx`
- `components/training/TrainingSessionHeader.tsx`
- `components/training/TrainingActionButtons.tsx`
- `components/training/TrainingFeedbackPanel.tsx`
- `components/training/LeaveTrainingDialog.tsx`
- `components/training/SimultaneousTablePanel.tsx`
- `components/training/TrainingSummaryCards.tsx`

Uso previsto:

- `TrainingConfigPage`
- `TrainingSessionPage`
- `TrainingResultPage`
- `SimultaneousTrainingConfigPage`
- `SimultaneousTrainingSessionPage`
- `SimultaneousTrainingSummaryPage`

### 4.5 Componentes de dominio: estatisticas

Arquivos alvo:

- `components/stats/StatsFilterBar.tsx`
- `components/stats/StatsOverviewCards.tsx`
- `components/stats/TimelineChartCard.tsx`
- `components/stats/BySituationTable.tsx`
- `components/stats/WorstHandsList.tsx`

Uso previsto:

- `DashboardPage`
- `StatsPage`
- `TrainingResultPage`
- `SimultaneousTrainingSummaryPage`

---

## 5. Matriz Pagina -> Componentes alvo

| Pagina                            | Componentes `shadcn/ui` principais                          | Compostos internos alvo                                                      |
| --------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `LoginPage`                       | `Card`, `Input`, `Button`, `Tabs` ou `ToggleGroup`, `Alert` | `AuthForm`, `AuthModeSwitcher`                                               |
| `DashboardPage`                   | `Card`, `Button`, `Separator`                               | `StatCard`, `PageHeader`                                                     |
| `GroupsPage`                      | `Card`, `Dialog`, `AlertDialog`, `Button`, `Input`, `Empty` | `GroupCreateDialog`, `PageHeader`                                            |
| `GroupDetailPage`                 | `Table`, `Button`, `AlertDialog`, `Empty`                   | `EntityTable`, `SituationRowActions`                                         |
| `SituationsPage`                  | `Select`, `Table`, `Button`, `AlertDialog`, `Empty`         | `SituationFilterBar`, `SituationsTable`                                      |
| `SituationEditPage`               | `Card`, `Input`, `Textarea`, `Select`, `Button`, `Alert`    | `SituationForm`, `SituationActionsEditor`, `RangeEditorPanel`                |
| `TrainingConfigPage`              | `Card`, `Checkbox`, `Button`, `ScrollArea`, `ToggleGroup`   | `GroupSelectionStep`, `SingleTrainingConfigForm`                             |
| `TrainingSessionPage`             | `Card`, `Button`, `AlertDialog`, `Badge`                    | `TrainingSessionHeader`, `TrainingActionButtons`, `TrainingFeedbackPanel`    |
| `TrainingResultPage`              | `Card`, `Button`                                            | `TrainingSummaryCards`, `TimelineChartCard`                                  |
| `SimultaneousTrainingConfigPage`  | `Card`, `Checkbox`, `Button`, `ScrollArea`, `ToggleGroup`   | `GroupSelectionStep`, `SimultaneousTrainingConfigForm`                       |
| `SimultaneousTrainingSessionPage` | `Card`, `Button`, `AlertDialog`, `Badge`                    | `SimultaneousTablePanel`, `LeaveTrainingDialog`                              |
| `SimultaneousTrainingSummaryPage` | `Card`, `Button`                                            | `TrainingSummaryCards`                                                       |
| `StatsPage`                       | `Tabs`, `Select`, `Card`, `Table`, `Empty`, `Separator`     | `StatsFilterBar`, `StatsOverviewCards`, `BySituationTable`, `WorstHandsList` |

---

## 6. Padroes de Composicao a aplicar

### 6.1 Variantes explicitas

Em vez de:

- `TrainingConfigForm({ isSimultaneous: true })`
- `TrainingSessionView({ mode: 'single' | 'simultaneous' })`
- `SummaryCards({ compact: true })`

Preferir:

- `SingleTrainingConfigForm`
- `SimultaneousTrainingConfigForm`
- `SingleTrainingSessionView`
- `SimultaneousTrainingSessionView`
- `TrainingSummaryCards`

### 6.2 Compound components quando houver estado compartilhado

Aplicacao recomendada:

- `SituationForm`
  - `SituationForm.Root`
  - `SituationForm.Metadata`
  - `SituationForm.Actions`
  - `SituationForm.Range`
  - `SituationForm.Submit`
- `TrainingSession`
  - `TrainingSession.Header`
  - `TrainingSession.Board`
  - `TrainingSession.Actions`
  - `TrainingSession.Feedback`

Uso condicionado a ganho real; nao criar compound components por formalidade.

### 6.3 Children over render props

Evitar APIs como:

- `renderHeader`
- `renderFooter`
- `renderActionBar`

Preferir:

```tsx
<PageHeader>
  <PageHeader.Title />
  <PageHeader.Actions>
    <Button />
  </PageHeader.Actions>
</PageHeader>
```

---

## 7. Estrategia de Testes

### 7.1 Renderer unit tests

Fundacao recomendada:

- adicionar dependencias de teste do renderer:
  - `@testing-library/react`
  - `@testing-library/user-event`
  - `@testing-library/jest-dom`
- criar setup compartilhado para:
  - `window.api`
  - matchers DOM
  - wrappers de router/store quando necessario

### 7.2 Gates por onda

- Gate rapido: `pnpm test:unit`
- Gate por fluxo afetado:
  - `pnpm playwright test e2e/auth.spec.ts`
  - `pnpm playwright test e2e/situations.spec.ts e2e/situation-groups/*.spec.ts`
  - `pnpm playwright test e2e/training.spec.ts`
  - `pnpm playwright test e2e/simultaneous-training`
  - `pnpm playwright test e2e/stats.spec.ts e2e/situation-groups/stats-filter.spec.ts e2e/simultaneous-training/stats-segmentation.spec.ts`
- Gate final: `pnpm test`

### 7.3 Nivel de cobertura esperado

- Componentes base compartilhados: render + estados + callbacks.
- Formularios: validacao visual, submit, estado disabled/loading.
- Dialogs: abertura, fechamento, confirmacao, cancelamento.
- Componentes compostos de treino: transicao entre passos, selecao/listagem, feedback.
- Charts: transformacoes e empty state; nao e necessario testar implementacao interna do Recharts.

---

## 8. Riscos e Mitigacoes

1. **Risco:** migracao virar apenas troca cosmetica de classes.  
   **Mitigacao:** task de fundacao exige criacao de compostos reutilizaveis antes de refatorar paginas grandes.

2. **Risco:** aumento de abstracao sem ganho, criando componentes "de tudo".  
   **Mitigacao:** aplicar explicit variants e evitar boolean props.

3. **Risco:** regressao em fluxos Electron que hoje so estao protegidos por E2E.  
   **Mitigacao:** gates por onda sempre incluem Playwright dos fluxos tocados.

4. **Risco:** mistura longa de `pt-*` e `shadcn/ui` gerar incoerencia visual.  
   **Mitigacao:** manter tokens semanticos unificados e remover wrappers antigos no fechamento da migracao.

5. **Risco:** extracao de componentes do editor de situacao quebrar o range grid.  
   **Mitigacao:** manter `RangeGrid13` como unidade de dominio e envolver a UI ao redor dele em compostos menores, com E2E e unitarios especificos.

---

## 9. Resultado Esperado

Ao fim da feature, o renderer deve ter:

- base `shadcn/ui` configurada e documentada no proprio codigo;
- familias de componentes compartilhados reaproveitadas entre paginas;
- paginas menores e mais focadas em orquestracao;
- cobertura unitaria do renderer antes inexistente;
- E2E atuais preservados como rede de seguranca de comportamento;
- convencoes arquiteturais claras para impedir regressao ao modelo de paginas monoliticas.
