# Application Visual UX System Specification

## Problem Statement

O Preflop Trainer já possui uma base funcional sólida para treino pré-flop 6-max, com autenticação, grupos, situações, treino, histórico, revisão e estatísticas. A UI também já recebeu uma padronização técnica recente (`PageHeader`, `Skeleton`, `EmptyState`, breadcrumbs, tokens Felt/âmbar), mas ainda precisa de uma direção visual única e mais forte para parecer um produto de estudo de poker, não apenas um CRUD com telas de treino.

A melhoria proposta é consolidar o app inteiro em um sistema visual coerente, com linguagem de mesa de poker/estudo estratégico, hierarquia de informação consistente, densidade adequada para desktop, feedback claro durante treino e páginas de gestão/revisão visualmente alinhadas.

## Contexto do Nicho

O utilizador principal está estudando decisões pré-flop em NLHE 6-max. Ele precisa reconhecer padrões rapidamente, comparar ações corretas/incorretas, memorizar ranges e acompanhar evolução. A experiência ideal deve equilibrar três necessidades: velocidade de treino, clareza cognitiva e confiança estatística.

O app deve transmitir a sensação de um cockpit de estudo: mesa de feltro, controles objetivos, métricas legíveis, feedback imediato e baixo ruído visual. A estética não deve competir com o conteúdo principal, especialmente cartas, ações, grid 13x13 e estatísticas.

## Goals

- [x] Definir um padrão visual único para todas as páginas baseado na identidade Felt/âmbar já existente
- [x] Melhorar hierarquia visual e densidade de informação em páginas de gestão, treino, revisão e estatísticas
- [x] Padronizar estados interativos, feedback, empty/loading/error e ações primárias/secundárias em toda a aplicação
- [x] Propor ajustes página por página sem alterar domínio poker, avaliação, IPC, DB ou autenticação
- [x] Criar critérios verificáveis para validar consistência visual, acessibilidade e responsividade desktop/mobile
- [x] Definir uma estratégia de testes unitários/E2E para evitar regressões funcionais durante o redesign

## Implementation Status

**Status**: Complete

**Completed**: 2026-05-05

**Summary**: Todas as 18 tasks planejadas foram executadas. A implementação preservou domínio poker, avaliação, IPC, preload, DB e autenticação, e concentrou mudanças na camada visual do renderer.

**Final verification**:

- `pnpm test` passou com 461 testes unitários e 102 E2E.
- QA visual/teclado cobriu temas claro/escuro e larguras 1280px, 1024px e 768px.
- Correção adicional de QA: assets de logo agora resolvem corretamente em rotas `file://` do Electron empacotado.

## Out of Scope

| Item                                             | Reason                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------- |
| Alterar regras de avaliação pré-flop             | O objetivo é UI/UX; lógica de domínio permanece intacta                         |
| Alterar convenções do grid 13x13                 | O grid é área sensível do domínio e segue `preflop-domain`                      |
| Alterar IPC, preload, main process ou DB         | Não é necessário para redesign visual                                           |
| Remover ou relaxar cobertura funcional existente | Redesign não pode reduzir proteção contra regressões                            |
| Criar novo branding externo/logotipo             | A spec assume assets atuais e paleta Felt/âmbar                                 |
| Migrar framework ou biblioteca UI                | O stack atual já suporta a melhoria                                             |
| Gamificação complexa                             | Pode virar feature própria depois; aqui só há feedback e progressão visual leve |
| Tema adicional além de claro/escuro              | Manter os dois temas existentes com consistência                                |

## Assumptions

- A paleta Felt/âmbar do skill `preflop-design` é a direção visual aprovada.
- O sistema deve continuar desktop-first por ser uma aplicação Electron, mas sem quebrar layouts em telas menores.
- As melhorias devem reutilizar shadcn/ui, componentes `app/*`, tokens CSS e Tailwind existentes.
- A spec anterior `ui-design-refactoring` é baseline técnica; esta spec define evolução visual e UX de produto.

---

## User Stories

### P1.1: Identidade Visual Unificada ⭐ MVP

**User Story**: Como utilizador, quero que todas as telas pareçam pertencer ao mesmo produto de treino de poker para que a experiência seja confiável e profissional.

**Why P1**: Sem uma identidade visual consistente, cada tela parece isolada. Isso reduz percepção de qualidade mesmo quando a funcionalidade está correta.

**Acceptance Criteria**:

| ID     | WHEN                                               | THEN system SHALL                                                                                   |
| ------ | -------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| VUX-01 | Utilizador navega entre páginas principais         | Manter tokens semânticos Felt/âmbar para background, cards, bordas, CTAs e textos                   |
| VUX-02 | Qualquer novo bloco visual é criado                | Não usar cores soltas (`slate-*`, `emerald-*`, `amber-*`) fora de tokens/variantes aprovadas        |
| VUX-03 | Página exibe conteúdo primário                     | Usar uma hierarquia previsível: `PageHeader`, contexto curto, conteúdo principal, ações secundárias |
| VUX-04 | App está em tema claro ou escuro                   | Manter contraste e personalidade visual equivalentes nos dois temas                                 |
| VUX-05 | Usuário abre páginas com cards/tabelas/formulários | Cards, seções e tabelas usarão o mesmo raio, borda, sombra/elevação e spacing base                  |

**Independent Test**: Navegar por Dashboard, Grupos, Situações, Treino, Histórico, Estatísticas e Perfil e verificar que nenhuma página parece usar linguagem visual paralela.

---

### P1.2: Cockpit de Treino Mais Claro ⭐ MVP

**User Story**: Como estudante de poker, quero que as telas de treino destaquem mão, posição, situação, progresso e ações possíveis para que eu responda rápido sem procurar informação.

**Why P1**: O treino é o fluxo central do produto. Toda melhoria visual deve proteger velocidade e clareza de decisão.

**Acceptance Criteria**:

| ID     | WHEN                                    | THEN system SHALL                                                                                                              |
| ------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| VUX-06 | Utilizador inicia treino normal         | Mostrar um layout de sessão com mão/cartas como elemento dominante, situação e posição como metadados próximos                 |
| VUX-07 | Utilizador vê botões de ação            | Botões de ação devem ter área clicável grande, rótulos consistentes e estados hover/focus/disabled claros                      |
| VUX-08 | Utilizador responde uma mão             | Feedback correto/incorreto deve aparecer próximo da decisão tomada e não deslocar o layout agressivamente                      |
| VUX-09 | Sessão está pausada                     | Overlay de pausa deve bloquear interação e comunicar estado sem esconder totalmente contexto                                   |
| VUX-10 | Treino simultâneo exibe múltiplas mesas | Cada mesa deve parecer uma unidade autônoma com status, progresso e ação disponíveis sem competir visualmente com outras mesas |

**Independent Test**: Executar uma sessão normal e uma simultânea e confirmar que mão, situação, progresso, timer e ações são identificáveis em menos de 3 segundos.

---

### P1.3: Gestão de Conteúdo com Baixa Fricção ⭐ MVP

**User Story**: Como utilizador que cria ranges e situações, quero páginas de grupos/situações/editor com organização visual clara para manter biblioteca de treino sem esforço.

**Why P1**: O treino depende de conteúdo bem cadastrado. Se gestão de grupos/situações for confusa, o usuário não chega ao fluxo de treino.

**Acceptance Criteria**:

| ID     | WHEN                             | THEN system SHALL                                                                                     |
| ------ | -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| VUX-11 | Utilizador abre Grupos           | Diferenciar claramente criar grupo, lista de grupos e ações de cada grupo                             |
| VUX-12 | Utilizador abre detalhe de grupo | Mostrar contexto do grupo antes da tabela e destacar ações principais sem poluir linhas               |
| VUX-13 | Utilizador abre Situações        | Filtros e tabela devem formar um bloco visual único, com empty state e CTA coerentes                  |
| VUX-14 | Utilizador edita situação        | Formulário, editor de ações e grid 13x13 devem parecer etapas de uma mesma edição, não módulos soltos |
| VUX-15 | Utilizador usa o range editor    | A legenda/ações de cores deve ser legível e consistente com tokens de ação do domínio                 |

**Independent Test**: Criar grupo, criar situação e editar range verificando que CTA primário está sempre evidente e elementos relacionados ficam agrupados.

---

### P1.4: Revisão e Estatísticas Acionáveis ⭐ MVP

**User Story**: Como estudante, quero entender meus erros, evolução e piores spots rapidamente para decidir o que treinar a seguir.

**Why P1**: Estatísticas e revisão fecham o ciclo de aprendizado. Sem visualização acionável, o app vira apenas quiz.

**Acceptance Criteria**:

| ID     | WHEN                                | THEN system SHALL                                                                                              |
| ------ | ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| VUX-16 | Utilizador abre resultado de sessão | Métricas principais, CTA de revisão e CTA de novo treino devem ter hierarquia clara                            |
| VUX-17 | Utilizador revisa mãos              | Cada mão revisada deve mostrar resposta, correta/errada, cartas, situação e range esperado com escaneabilidade |
| VUX-18 | Utilizador abre revisão múltipla    | O resumo deve explicar o agregado antes da lista, evitando sensação de tabela solta                            |
| VUX-19 | Utilizador abre Histórico           | Filtros, seleção em lote, paginação e linhas da tabela devem seguir uma narrativa visual consistente           |
| VUX-20 | Utilizador abre Estatísticas        | Overview, gráfico e rankings devem indicar prioridade: desempenho geral, evolução, maiores vazamentos          |

**Independent Test**: Após uma sessão com erros, abrir Resultado, Revisão, Histórico e Estatísticas e conseguir apontar o próximo treino recomendado visualmente.

---

### P2.1: Sistema de Componentes de Produto

**User Story**: Como developer, quero componentes/padrões de apresentação reutilizáveis para evitar que cada página resolva visualmente o mesmo problema de forma diferente.

**Why P2**: Redesign sem componentes vira dívida visual nova.

**Acceptance Criteria**:

| ID     | WHEN                                       | THEN system SHALL                                                                    |
| ------ | ------------------------------------------ | ------------------------------------------------------------------------------------ |
| VUX-21 | Página precisa de bloco introdutório       | Usar padrão único de hero/context panel quando aplicável                             |
| VUX-22 | Página precisa mostrar métrica             | Usar variação consistente de `StatCard` com número, label, detalhe opcional e estado |
| VUX-23 | Página precisa de lista vazia              | Usar `EmptyState` com CTA contextual e copy orientada a próximo passo                |
| VUX-24 | Página precisa de feedback de sucesso/erro | Usar padrões visuais consistentes, sem cores hardcoded fora dos tokens               |
| VUX-25 | Página precisa de ações em grupo           | Usar toolbar padrão com alinhamento, wrapping e prioridade consistente               |

**Independent Test**: Inspecionar páginas após implementação e identificar os mesmos padrões reutilizados, não recriados localmente.

---

### P2.2: Responsividade e Densidade Desktop

**User Story**: Como utilizador desktop, quero uma interface densa o suficiente para estudar sem excesso de scroll, mas responsiva para janelas menores.

**Why P2**: Electron costuma ser usado em janelas redimensionáveis. Layouts excessivamente espaçosos ou quebrados prejudicam estudo.

**Acceptance Criteria**:

| ID     | WHEN                                  | THEN system SHALL                                                                                         |
| ------ | ------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| VUX-26 | Janela está em desktop largo          | Usar grids/colunas para aproveitar largura sem esticar texto demais                                       |
| VUX-27 | Janela é reduzida                     | Cards, tabelas, grid e toolbars devem quebrar sem overflow horizontal indevido                            |
| VUX-28 | Sidebar ocupa espaço em telas menores | Conteúdo principal deve preservar leitura; se necessário, definir comportamento responsivo para navegação |
| VUX-29 | Página tem tabela larga               | Fornecer scroll/estrutura controlada sem quebrar o shell                                                  |

**Independent Test**: Validar telas em largura ~1280px, ~1024px e ~768px.

---

### P2.3: Microinterações e Estados de Foco

**User Story**: Como utilizador, quero respostas visuais sutis para hover, foco, seleção, progresso e conclusão para entender o estado do sistema.

**Why P2**: Estados visuais bem definidos reduzem carga cognitiva e melhoram percepção de app nativo.

**Acceptance Criteria**:

| ID     | WHEN                             | THEN system SHALL                                                                 |
| ------ | -------------------------------- | --------------------------------------------------------------------------------- |
| VUX-30 | Elemento interativo recebe hover | Estado deve ser perceptível e consistente com tokens                              |
| VUX-31 | Elemento recebe foco por teclado | Ring deve ser visível em tema claro e escuro                                      |
| VUX-32 | Ação está desabilitada           | Estado disabled deve explicar indisponibilidade quando necessário                 |
| VUX-33 | Progresso de treino muda         | Indicadores devem atualizar suavemente sem distração                              |
| VUX-34 | Usuário conclui sessão           | Resultado deve ter transição/ênfase suficiente para comunicar fechamento de ciclo |

**Independent Test**: Navegar por teclado e mouse pelos fluxos centrais e verificar estados em todos os controles principais.

---

### P3.1: Narrativa de Onboarding e Próximo Passo

**User Story**: Como novo utilizador, quero entender o caminho mínimo para começar: criar grupo, criar situação, treinar, revisar estatísticas.

**Why P3**: O domínio é especializado; usuários novos precisam de orientação sem tutorial pesado.

**Acceptance Criteria**:

| ID     | WHEN                               | THEN system SHALL                                                   |
| ------ | ---------------------------------- | ------------------------------------------------------------------- |
| VUX-35 | Usuário novo abre Dashboard        | Mostrar próximo passo contextual e progresso inicial                |
| VUX-36 | Usuário ainda não tem grupo        | CTAs de páginas vazias devem apontar para criação de grupo/situação |
| VUX-37 | Usuário conclui primeira sessão    | Resultado deve conduzir naturalmente para revisão e estatísticas    |
| VUX-38 | Usuário volta ao app com histórico | Dashboard deve priorizar continuidade, não onboarding básico        |

**Independent Test**: Usar app com base vazia e depois com dados simulados; CTAs devem mudar de onboarding para continuidade.

---

## Page-by-Page Visual Adjustment Targets

| Page                              | Current Role                  | Visual/UX Adjustment Target                                                                                                     | Requirements                   |
| --------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `LoginPage`                       | Entrada e cadastro            | Transformar em tela de boas-vindas premium com logo, proposta curta, card de auth mais limpo e visual compatível com Felt/âmbar | VUX-01, VUX-04, VUX-35         |
| `DashboardPage`                   | Home e resumo                 | Virar cockpit inicial: próximos passos, métricas principais, CTA de treino/criação e estado de progresso do usuário             | VUX-03, VUX-20, VUX-35, VUX-38 |
| `GroupsPage`                      | Organização de biblioteca     | Separar visualmente criação, cards de grupo e estados vazios; cards devem comunicar volume/status rapidamente                   | VUX-11, VUX-21, VUX-23         |
| `GroupDetailPage`                 | Gestão de situações por grupo | Adicionar contexto do grupo, ações de topo e tabela com prioridade visual clara                                                 | VUX-12, VUX-13, VUX-25         |
| `SituationsPage`                  | Lista global de situações     | Filtros + tabela como módulo único; CTA primário e empty state orientado ao treino                                              | VUX-13, VUX-23, VUX-29         |
| `SituationEditPage`               | Criação/edição de spot        | Layout por blocos: definição da situação, ações, range; reduzir sensação de formulário longo                                    | VUX-14, VUX-15, VUX-27         |
| `TrainingConfigPage`              | Configuração treino normal    | Wizard com progressão visual clara entre grupo, situações e preferências                                                        | VUX-06, VUX-21, VUX-36         |
| `SimultaneousTrainingConfigPage`  | Configuração multi-mesa       | Explicar diferença do modo simultâneo e deixar quantidade/tempo/situações legíveis                                              | VUX-10, VUX-21, VUX-27         |
| `TrainingSessionPage`             | Treino principal              | Reforçar layout de cockpit: cartas, situação, ações, progresso, timer e feedback em zonas fixas                                 | VUX-06, VUX-07, VUX-08, VUX-09 |
| `SimultaneousTrainingSessionPage` | Treino multi-mesa             | Padronizar cards de mesa, status, progresso e foco visual sem competição excessiva                                              | VUX-10, VUX-27, VUX-33         |
| `TrainingResultPage`              | Fechamento treino normal      | Resultado como tela de conclusão com métrica principal e próximo passo evidente                                                 | VUX-16, VUX-34, VUX-37         |
| `SimultaneousTrainingSummaryPage` | Fechamento multi-mesa         | Resumo agregado primeiro, depois breakdown por mesa e CTAs coerentes                                                            | VUX-16, VUX-18, VUX-34         |
| `HistoryPage`                     | Busca e auditoria de sessões  | Melhorar legibilidade de tabela, filtros, seleção em lote e paginação; manter URL state                                         | VUX-19, VUX-25, VUX-29         |
| `SessionHandReviewPage`           | Revisão detalhada             | Cards de mão com hierarquia forte para erro/acerto, resposta, correto e range                                                   | VUX-17, VUX-20                 |
| `MultiSessionReviewPage`          | Revisão agregada              | Cabeçalho agregado e lista com agrupamento claro por sessão/mão                                                                 | VUX-18, VUX-20                 |
| `StatsPage`                       | Análise de evolução           | Dashboard analítico: overview, evolução, vazamentos e filtros com hierarquia clara                                              | VUX-19, VUX-20, VUX-29         |
| `ProfilePage`                     | Conta/preferências            | Dividir conta, segurança e defaults com densidade menor e feedback persistente padronizado                                      | VUX-21, VUX-24, VUX-27         |

## Regression Testing Requirement

Toda task de implementação desta feature deve consultar `.specs/features/app-visual-ux-system/test-plan.md` antes de alterar UI. O implementador deve registrar explicitamente se testes unitários ou E2E existentes precisam ser ajustados e se novos testes são necessários. Alterações em texto visível, roles acessíveis, labels, data-testids, CTAs, formulários, tabelas, grid, treino, histórico, revisão ou estatísticas não podem ser concluídas sem essa análise.

---

## Edge Cases

- WHEN tema escuro está ativo THEN todos os contrastes devem permanecer legíveis sem depender apenas de cor.
- WHEN tema claro está ativo THEN o app deve manter identidade Felt/papel, não virar UI genérica branca.
- WHEN usuário não possui dados THEN páginas devem orientar próximo passo sem mostrar métricas falsas ou blocos vazios sem contexto.
- WHEN uma lista/tabela possui muitos itens THEN layout deve preservar cabeçalho, filtros e paginação com scroll controlado.
- WHEN nomes de grupos/situações são longos THEN cards/tabelas devem truncar ou quebrar texto sem deslocar ações críticas.
- WHEN usuário usa teclado THEN foco deve ser visível e ordem de tabulação deve seguir a hierarquia visual.
- WHEN grid 13x13 aparece em edição ou revisão THEN o grid deve preservar convenções de suited/offsuit e data-testids existentes.

---

## Requirement Traceability

| Requirement ID | Story                            | Phase | Status  |
| -------------- | -------------------------------- | ----- | ------- |
| VUX-01         | P1.1 Identidade Visual Unificada | Tasks | Pending |
| VUX-02         | P1.1 Identidade Visual Unificada | Tasks | Pending |
| VUX-03         | P1.1 Identidade Visual Unificada | Tasks | Pending |
| VUX-04         | P1.1 Identidade Visual Unificada | Tasks | Pending |
| VUX-05         | P1.1 Identidade Visual Unificada | Tasks | Pending |
| VUX-06         | P1.2 Cockpit de Treino           | Tasks | Pending |
| VUX-07         | P1.2 Cockpit de Treino           | Tasks | Pending |
| VUX-08         | P1.2 Cockpit de Treino           | Tasks | Pending |
| VUX-09         | P1.2 Cockpit de Treino           | Tasks | Pending |
| VUX-10         | P1.2 Cockpit de Treino           | Tasks | Pending |
| VUX-11         | P1.3 Gestão de Conteúdo          | Tasks | Pending |
| VUX-12         | P1.3 Gestão de Conteúdo          | Tasks | Pending |
| VUX-13         | P1.3 Gestão de Conteúdo          | Tasks | Pending |
| VUX-14         | P1.3 Gestão de Conteúdo          | Tasks | Pending |
| VUX-15         | P1.3 Gestão de Conteúdo          | Tasks | Pending |
| VUX-16         | P1.4 Revisão e Estatísticas      | Tasks | Pending |
| VUX-17         | P1.4 Revisão e Estatísticas      | Tasks | Pending |
| VUX-18         | P1.4 Revisão e Estatísticas      | Tasks | Pending |
| VUX-19         | P1.4 Revisão e Estatísticas      | Tasks | Pending |
| VUX-20         | P1.4 Revisão e Estatísticas      | Tasks | Pending |
| VUX-21         | P2.1 Sistema de Componentes      | Tasks | Pending |
| VUX-22         | P2.1 Sistema de Componentes      | Tasks | Pending |
| VUX-23         | P2.1 Sistema de Componentes      | Tasks | Pending |
| VUX-24         | P2.1 Sistema de Componentes      | Tasks | Pending |
| VUX-25         | P2.1 Sistema de Componentes      | Tasks | Pending |
| VUX-26         | P2.2 Responsividade              | Tasks | Pending |
| VUX-27         | P2.2 Responsividade              | Tasks | Pending |
| VUX-28         | P2.2 Responsividade              | Tasks | Pending |
| VUX-29         | P2.2 Responsividade              | Tasks | Pending |
| VUX-30         | P2.3 Microinterações             | Tasks | Pending |
| VUX-31         | P2.3 Microinterações             | Tasks | Pending |
| VUX-32         | P2.3 Microinterações             | Tasks | Pending |
| VUX-33         | P2.3 Microinterações             | Tasks | Pending |
| VUX-34         | P2.3 Microinterações             | Tasks | Pending |
| VUX-35         | P3.1 Onboarding                  | Tasks | Pending |
| VUX-36         | P3.1 Onboarding                  | Tasks | Pending |
| VUX-37         | P3.1 Onboarding                  | Tasks | Pending |
| VUX-38         | P3.1 Onboarding                  | Tasks | Pending |

**Coverage:** 38 total, 38 mapped to tasks, 0 unmapped. Test coverage strategy lives in `.specs/features/app-visual-ux-system/test-plan.md`; task mapping lives in `.specs/features/app-visual-ux-system/tasks.md`.

---

## Success Criteria

- [x] Todas as páginas seguem a mesma linguagem visual Felt/âmbar, com componentes e estados consistentes
- [x] Fluxos de treino normal e simultâneo destacam mão, situação, progresso, ação e feedback sem ambiguidade
- [x] Páginas de gestão deixam claro o próximo passo: criar grupo, criar situação, editar range ou iniciar treino
- [x] Resultado, histórico, revisão e estatísticas conduzem o usuário para aprendizado acionável
- [x] Nenhuma página usa cor hardcoded fora dos tokens/variantes aprovadas sem justificativa documentada
- [x] Layouts permanecem usáveis em 1280px, 1024px e 768px de largura
- [x] Estados hover, focus, disabled, loading, error e empty são consistentes em todos os fluxos principais
- [x] Cada bloco implementado declara testes existentes analisados, testes ajustados, testes novos e gate executado
