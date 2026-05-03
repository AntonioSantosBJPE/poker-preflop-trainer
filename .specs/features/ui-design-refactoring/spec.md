# UI/UX Design Refactoring

## Problem Statement

O Preflop Trainer tem 17 páginas construídas incrementalmente ao longo de várias features, resultando em inconsistências visuais e estruturais que degradam a experiência do utilizador. Gap spacings diferentes entre páginas, padrões de loading conflitantes (skeleton vs texto vs nada), terminologia divergente ("Guardar" vs "Salvar"), headers manuais vs `PageHeader`, botões de voltar com 4 implementações distintas, e lógica duplicada (preference sync, ipcErrorMessage, timer deadline) são exemplos de problemas que acumularam-se. O utilizador percebe estas inconsistências como falta de polimento. O objetivo é estabelecer padrões uniformes de UI/UX em todas as páginas e resolver a dívida técnica visual acumulada.

## Goals

- [ ] Padronizar layout, loading, error, back-navigation e terminologia em todas as 17 páginas
- [ ] Eliminar lógica de UI duplicada (3x preference sync, 3x ipcErrorMessage, 2x timer)
- [ ] Resolver inconsistências de prioridade visual em ações primárias/secundárias
- [ ] Adicionar estados de loading e empty state onde faltam

## Out of Scope

| Item                                                   | Reason                                                                                                          |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Alterações no domínio poker (grid, avaliação, células) | Foco exclusivo em UI/UX do renderer                                                                             |
| Migração React 18→19 ou react-router 6→7               | Decisão D-02 existente (adiar)                                                                                  |
| Migração Tailwind 3→4                                  | Decisão de-riscada; requer validação separada                                                                   |
| Reescrita de componentes shadcn/ui                     | Já standardizados                                                                                               |
| Alterações no main process, IPC ou DB                  | Fora do âmbito de UI                                                                                            |
| Testes E2E (fora alterações de locator por texto/role) | Locators com `getByText`/`getByRole` que referenciam strings alteradas precisam de update (ver tasks.md C6, A8) |

---

## User Stories

### P1 — MVP (must ship)

---

#### P1.1: Padronizar Estrutura de Página ⭐

**User Story**: Como utilizador, quero que todas as páginas sigam a mesma estrutura visual (header, content, spacing) para que a navegação seja previsível e não haja saltos visuais entre páginas.

**Why P1**: Inconsistências de estrutura são o problema UI mais visível. Afeta todas as sessões do utilizador.

**Acceptance Criteria**:

| ID     | WHEN                                                                                                     | THEN system SHALL                                                                                                                                           |
| ------ | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DSG-01 | Utilizador navega entre qualquer página                                                                  | O `gap` entre secções ser consistente (`gap-6`) em todas as páginas de lista/detalhe                                                                        |
| DSG-02 | Utilizador abre SituationEditPage                                                                        | O header usar `PageHeader` (como todas as outras páginas), não um `<h1>` manual                                                                             |
| DSG-03 | Utilizador abre SimultaneousTrainingSessionPage                                                          | A página ter `max-w` consistente (como TrainingSessionPage usa `max-w-3xl`)                                                                                 |
| DSG-04 | Utilizador abre página de revisão (SessionHandReviewPage, MultiSessionReviewPage)                        | O botão de voltar usar `backLink` do `PageHeader`, não um `Button` externo                                                                                  |
| DSG-05 | Utilizador usa "Voltar" nos wizards de treino (SingleTrainingConfigForm, SimultaneousTrainingConfigForm) | O "Voltar" ser um componente `Button` do shadcn, não um `<button>` com classes soltas                                                                       |
| DSG-06 | Utilizador vê resultados de treino (TrainingResultPage, SimultaneousTrainingSummaryPage)                 | A hierarquia visual dos botões de ação refletir a prioridade real: "Rever sessão" como `default`, "Ver estatísticas"/novo treino como `secondary`/`outline` |

---

#### P1.2: Estados de Loading Uniformes ⭐

**User Story**: Como utilizador, quero ver skeletons ou indicadores de loading consistentes em todas as páginas, em vez de texto "Carregando…" ou nada.

**Why P1**: Loading states quebram a ilusão de aplicação nativa polida. Texto "Carregando…" parece inacabado.

**Acceptance Criteria**:

| ID     | WHEN                                    | THEN system SHALL                                           |
| ------ | --------------------------------------- | ----------------------------------------------------------- |
| DSG-07 | Página está a carregar dados            | Usar `Skeleton` do shadcn (não texto "Carregando…")         |
| DSG-08 | GroupDetailPage carrega                 | Mostrar `Skeleton` de linhas de tabela (como HistoryPage)   |
| DSG-09 | TrainingSessionPage carrega mão         | Mostrar `Skeleton` de card + playing cards                  |
| DSG-10 | TrainingResultPage carrega              | Mostrar `Skeleton` de stat cards + chart                    |
| DSG-11 | SimultaneousTrainingSessionPage carrega | Mostrar `Skeleton` de grid de painéis                       |
| DSG-12 | DashboardPage carrega                   | Mostrar `Skeleton` de stat cards (não default 0 silencioso) |

---

#### P1.3: Estados de Erro Uniformes ⭐

**User Story**: Como utilizador, quero ver mensagens de erro consistentes quando algo corre mal, não redirecionamentos silenciosos ou valores default 0.

**Why P1**: Erros silenciosos quebram confiança. O utilizador precisa saber quando algo falhou.

**Acceptance Criteria**:

| ID     | WHEN                                          | THEN system SHALL                                                             |
| ------ | --------------------------------------------- | ----------------------------------------------------------------------------- |
| DSG-13 | DashboardPage falha ao carregar stats         | Mostrar `EmptyState` com mensagem de erro (não default 0)                     |
| DSG-14 | StatsPage falha ao carregar                   | Mostrar `EmptyState` com mensagem de erro (não silencioso)                    |
| DSG-15 | TrainingSessionPage encontra erro             | Mostrar `EmptyState` com "Erro ao carregar sessão" + botão "Voltar ao treino" |
| DSG-16 | SimultaneousTrainingSessionPage encontra erro | Mostrar `EmptyState` (não redirect seco)                                      |

---

#### P1.4: Padronizar Terminologia ⭐

**User Story**: Como utilizador, quero terminologia consistente em toda a aplicação — o mesmo conceito usa a mesma palavra em todas as páginas.

**Why P1**: Terminologia inconsistente ("Guardar" vs "Salvar") parece amadora e causa confusão.

**Acceptance Criteria**:

| ID     | WHEN                                         | THEN system SHALL                                                            |
| ------ | -------------------------------------------- | ---------------------------------------------------------------------------- |
| DSG-17 | Utilizador vê ação de persistir dados        | Usar "Salvar" (não "Guardar") — alinhado com SituationEditPage               |
| DSG-18 | Utilizador vê cabeçalho de coluna de posição | Usar "Posição" (não "Pos.") — alinhado com GroupDetailPage                   |
| DSG-19 | Utilizador vê título de página de revisão    | Usar "Revisão da sessão" (não "Revisão da Sessão" com S maiúsculo)           |
| DSG-20 | Utilizador vê ação de rever sessão           | Usar "Revisão" consistentemente (não "Rever sessão" vs "Revisão individual") |

---

### P2 — Should Have

---

#### P2.5: FilterToolbar no SituationsPage

**User Story**: Como utilizador, quero que o filtro de grupo na página de situações esteja no mesmo `FilterToolbar` que as outras páginas de lista, para consistência visual.

**Why P2**: A página de situações é a única que não usa o padrão `FilterToolbar`.

**Acceptance Criteria**:

| ID     | WHEN                           | THEN system SHALL                                            |
| ------ | ------------------------------ | ------------------------------------------------------------ |
| DSG-21 | Utilizador abre SituationsPage | O filtro "Filtrar por grupo" estar dentro de `FilterToolbar` |

---

#### P2.6: Extrair Lógica Duplicada

**User Story**: Como developer, quero que lógica de UI partilhada (preference sync, ipcErrorMessage, timer deadline) viva num único sítio, não copiada em 3 ficheiros.

**Why P2**: 3 cópias de `ipcErrorMessage` e 3 cópias do preference sync effect são fonte de bugs.

**Acceptance Criteria**:

| ID     | WHEN                                               | THEN system SHALL                                                |
| ------ | -------------------------------------------------- | ---------------------------------------------------------------- |
| DSG-22 | Página precisa de formatar mensagem de erro IPC    | Usar `ipcErrorMessage` importado de `src/shared/utils/format.ts` |
| DSG-23 | Página precisa de sincronizar preferências no form | Usar hook partilhado `usePreferenceSync` (ou similar)            |
| DSG-24 | Timer de sessão                                    | Usar hook partilhado `useSessionTimer` (ou similar)              |

---

#### P2.7: Padronizar ConfirmActionDialog com Variante Não-Destrutiva

**User Story**: Como utilizador, quero que confirmações não-destrutivas (ex.: iniciar treino) não usem estilo destrutivo (vermelho).

**Why P2**: `ConfirmActionDialog` força `bg-destructive` em todas as confirmações, mesmo quando a ação não é perigosa.

**Acceptance Criteria**:

| ID     | WHEN                                                   | THEN system SHALL                                  |
| ------ | ------------------------------------------------------ | -------------------------------------------------- |
| DSG-25 | `ConfirmActionDialog` é usado para ação destrutiva     | Botão confirmar usar estilo destrutivo (como hoje) |
| DSG-26 | `ConfirmActionDialog` é usado para ação não-destrutiva | Botão confirmar usar estilo `default`/primário     |

---

#### P2.8: StatsPage com URL Search Params

**User Story**: Como utilizador, quero que os filtros da página de estatísticas sejam preservados na URL (como no HistoryPage) para poder partilhar/bookmark.

**Why P2**: StatsPage usa `useState` local; filtros perdem-se ao navegar.

**Acceptance Criteria**:

| ID     | WHEN                                      | THEN system SHALL                                 |
| ------ | ----------------------------------------- | ------------------------------------------------- |
| DSG-27 | Utilizador altera filtro em StatsPage     | O valor do filtro ser refletido em `searchParams` |
| DSG-28 | Utilizador navega de volta para StatsPage | Os filtros serem restaurados dos `searchParams`   |

---

### P3 — Nice to Have

---

#### P3.9: Empty State no Dashboard

**User Story**: Como novo utilizador, quero ver uma mensagem de boas-vindas/empty state no dashboard quando ainda não tenho dados, em vez de ver "0.0%" de acerto.

**Why P3**: Melhora first-run experience.

**Acceptance Criteria**:

| ID     | WHEN                                      | THEN system SHALL                                                |
| ------ | ----------------------------------------- | ---------------------------------------------------------------- |
| DSG-29 | Utilizador recém-registado abre Dashboard | Mostrar empty state com call-to-action "Criar primeira situação" |
| DSG-30 | Utilizador com dados abre Dashboard       | Mostrar stat cards normalmente                                   |

---

#### P3.10: Breadcrumbs

**User Story**: Como utilizador, quero breadcrumbs nas páginas aninhadas (grupo → situações → editar) para saber onde estou e navegar rapidamente.

**Why P3**: Melhora navegação em páginas profundas. Valor baixo dado que a sidebar já dá contexto.

**Acceptance Criteria**:

| ID     | WHEN                                   | THEN system SHALL                                              |
| ------ | -------------------------------------- | -------------------------------------------------------------- |
| DSG-31 | Utilizador navega para página aninhada | Breadcrumb mostrar caminho (ex.: Grupos > Grupo X > Situações) |

---

#### P3.11: Acessibilidade — Focus Management

**User Story**: Como utilizador de teclado, quero que o foco seja gerido corretamente ao navegar entre páginas e ao abrir/fechar diálogos.

**Why P3**: Melhora acessibilidade geral.

**Acceptance Criteria**:

| ID     | WHEN                                          | THEN system SHALL                                             |
| ------ | --------------------------------------------- | ------------------------------------------------------------- |
| DSG-32 | Utilizador navega para nova página            | O foco mover-se para o `PageHeader` ou `main`                 |
| DSG-33 | Utilizador abre diálogo (ConfirmActionDialog) | Foco mover-se para o primeiro elemento focalizável do diálogo |
| DSG-34 | Utilizador fecha diálogo                      | Foco retornar ao elemento que abriu o diálogo                 |

---

## Edge Cases

- WHEN utilizador está offline e tenta carregar página → sistema SHALL mostrar `EmptyState` com mensagem de erro de rede
- WHEN utilizador com dados + sem dados no período do filtro → sistema SHALL mostrar empty state parcial (não confundir com erro)
- WHEN utilizador tem preferência de tema escuro → sistema SHALL verificar que skeletons usam cores corretas no tema escuro
- WHEN utilizador tem nome muito longo → sistema SHALL truncar no sidebar (já implementado com `truncate`, mas verificar)

---

## Requirement Traceability

| ID     | Story | Phase | Status  |
| ------ | ----- | ----- | ------- |
| DSG-01 | P1.1  | Spec  | Pending |
| DSG-02 | P1.1  | Spec  | Pending |
| DSG-03 | P1.1  | Spec  | Pending |
| DSG-04 | P1.1  | Spec  | Pending |
| DSG-05 | P1.1  | Spec  | Pending |
| DSG-06 | P1.1  | Spec  | Pending |
| DSG-07 | P1.2  | Spec  | Pending |
| DSG-08 | P1.2  | Spec  | Pending |
| DSG-09 | P1.2  | Spec  | Pending |
| DSG-10 | P1.2  | Spec  | Pending |
| DSG-11 | P1.2  | Spec  | Pending |
| DSG-12 | P1.2  | Spec  | Pending |
| DSG-13 | P1.3  | Spec  | Pending |
| DSG-14 | P1.3  | Spec  | Pending |
| DSG-15 | P1.3  | Spec  | Pending |
| DSG-16 | P1.3  | Spec  | Pending |
| DSG-17 | P1.4  | Spec  | Pending |
| DSG-18 | P1.4  | Spec  | Pending |
| DSG-19 | P1.4  | Spec  | Pending |
| DSG-20 | P1.4  | Spec  | Pending |
| DSG-21 | P2.5  | Spec  | Pending |
| DSG-22 | P2.6  | Spec  | Pending |
| DSG-23 | P2.6  | Spec  | Pending |
| DSG-24 | P2.6  | Spec  | Pending |
| DSG-25 | P2.7  | Spec  | Pending |
| DSG-26 | P2.7  | Spec  | Pending |
| DSG-27 | P2.8  | Spec  | Pending |
| DSG-28 | P2.8  | Spec  | Pending |
| DSG-29 | P3.9  | Spec  | Pending |
| DSG-30 | P3.9  | Spec  | Pending |
| DSG-31 | P3.10 | Spec  | Pending |
| DSG-32 | P3.11 | Spec  | Pending |
| DSG-33 | P3.11 | Spec  | Pending |
| DSG-34 | P3.11 | Spec  | Pending |

**Coverage:** 34 total, 0 mapped to tasks, 34 unmapped ⚠️

---

## Success Criteria

- [ ] Todas as 17 páginas seguem a mesma estrutura: `PageHeader` + `flex flex-col gap-6` + conteúdo
- [ ] Zero casos de texto "Carregando…" — todos substituídos por `Skeleton`
- [ ] Zero casos de erro silencioso — todas as páginas mostram `EmptyState` ou mensagem de erro
- [ ] Terminologia uniforme: "Salvar", "Posição", "Revisão da sessão"
- [ ] `ipcErrorMessage` e preference sync existem num único local partilhado
- [ ] `ConfirmActionDialog` suporta variante não-destrutiva
- [ ] StatsPage usa `useSearchParams` para filtros (como HistoryPage)
- [ ] Todos os botões "Voltar" usam `backLink` do `PageHeader` ou `Button` do shadcn
