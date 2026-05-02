# Situation Groups — Especificação

## Problem Statement

Atualmente as situações existem de forma plana, sem organização hierárquica. No poker de cash game, os jogadores trabalham ranges distintos consoante o stake (NL2, NL5, NL10, NL25 …). Não há forma de agrupar situações por stake/contexto, o que torna difícil treinar especificamente para um stack e filtrar estatísticas por contexto. A feature introduz **grupos de situações** (nomeados livremente pelo utilizador) como contentor obrigatório de cada situação, habilitando treino focado e estatísticas segmentadas.

## Goals

- [ ] Introduzir o conceito de **Grupo** como entidade de primeira classe, nomeada livremente pelo utilizador (ex.: "NL2", "NL10", "Live 1/2").
- [ ] Toda situação pertence a exatamente um grupo.
- [ ] O utilizador pode selecionar um grupo completo — ou situações concretas dentro de um grupo — para treinar, mas **nunca situações de grupos distintos** na mesma sessão.
- [ ] Estatísticas filtrável por grupo.
- [ ] Migração de dados retroativa: situações existentes migradas para um grupo-padrão.

## Out of Scope

| Feature                                          | Reason                                                            |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| Grupos aninhados (sub-grupos)                    | Complexidade desnecessária; NL2/NL5 como nível único é suficiente |
| Partilha de grupos entre utilizadores            | Fora do MVP; autenticação é local                                 |
| Import/Export de grupos                          | Fora do MVP (já listado no PROJECT.md)                            |
| Ordenação manual de situações dentro do grupo    | Pode ser adicionado numa iteração futura                          |
| Estatísticas inter-grupos (comparar NL2 vs NL10) | P3 diferido; filtro por grupo cobre o caso de uso imediato        |

---

## User Stories

### P1: CRUD de Grupos ⭐ MVP

**User Story**: Como jogador, quero criar, renomear e arquivar grupos de situações para organizar os meus ranges por contexto (stake, formato, etc.).

**Why P1**: Sem a entidade grupo nenhuma outra história pode ser implementada.

**Acceptance Criteria**:

1. WHEN o utilizador acede à página de grupos THEN o sistema SHALL mostrar todos os grupos ativos do utilizador com o nome e o número de situações que contêm.
2. WHEN o utilizador cria um grupo com um nome não vazio THEN o sistema SHALL persistir o grupo e redirecioná-lo para a vista do grupo.
3. WHEN o utilizador tenta criar um grupo com nome duplicado (mesmo utilizador) THEN o sistema SHALL retornar um erro de validação visível na UI.
4. WHEN o utilizador renomeia um grupo THEN o sistema SHALL atualizar o nome sem afetar as situações.
5. WHEN o utilizador arquiva um grupo THEN o sistema SHALL aplicar soft-delete ao grupo (`is_active = false`); o grupo e as suas situações deixam de aparecer nas listas ativas mas os dados históricos de sessões mantêm-se intactos.
6. WHEN um grupo tem pelo menos uma situação ativa THEN o sistema SHALL impedir a eliminação física (só soft-delete).

**Independent Test**: Criar grupo "NL5", renomear para "NL5 6-Max", arquivar — grupo desaparece da lista.

---

### P1: Situações pertencem a um Grupo ⭐ MVP

**User Story**: Como jogador, quero que cada situação pertença a um grupo, para que os meus ranges fiquem organizados por contexto.

**Why P1**: Requisito estrutural — o schema e todos os fluxos dependem disto.

**Acceptance Criteria**:

1. WHEN o utilizador cria uma situação THEN o sistema SHALL obrigar a selecionar o grupo a que pertence (campo obrigatório no formulário).
2. WHEN o utilizador lista situações THEN o sistema SHALL mostrar as situações agrupadas/filtradas pelo grupo selecionado.
3. WHEN o utilizador edita uma situação THEN o sistema SHALL permitir mover a situação para outro grupo.
4. WHEN há situações existentes sem grupo (migração) THEN o sistema SHALL criá-las associadas a um grupo "Default" (criado automaticamente na migração).
5. WHEN uma situação é duplicada THEN o sistema SHALL preservar o grupo de origem.

**Independent Test**: Criar situação sem selecionar grupo — formulário bloqueia submissão com mensagem de erro.

---

### P1: Seleção de treino por Grupo ⭐ MVP

**User Story**: Como jogador, quero selecionar um grupo completo (ou situações específicas dentro dele) para treinar, sem poder misturar situações de grupos distintos.

**Why P1**: É o principal benefício operacional da feature; sem isto o agrupamento serve apenas de organização visual.

**Acceptance Criteria**:

1. WHEN o utilizador abre a página de configuração de treino THEN o sistema SHALL mostrar os grupos ativos com as suas situações.
2. WHEN o utilizador seleciona um grupo THEN o sistema SHALL marcar automaticamente todas as situações desse grupo.
3. WHEN o utilizador seleciona situações de um grupo THEN o sistema SHALL impedir a seleção de situações de outro grupo (as checkboxes de outros grupos ficam desativadas/bloqueadas) até nenhuma situação do grupo atual estar selecionada.
4. WHEN o utilizador tenta iniciar sessão sem situações selecionadas THEN o sistema SHALL mostrar erro de validação.
5. WHEN a sessão é iniciada THEN o sistema SHALL persistir `groupId` (além dos `situationIds`) em `training_sessions` para rastreabilidade histórica.
6. WHEN todas as situações de um grupo são desmarcadas THEN o sistema SHALL reativar a seleção de todos os grupos.

**Independent Test**: Selecionar "NL5" → grupo "NL10" fica bloqueado; desmarcar todas as NL5 → NL10 volta a estar disponível.

---

### P1: Estatísticas filtradas por Grupo ⭐ MVP

**User Story**: Como jogador, quero filtrar as estatísticas por grupo para perceber a minha performance num stake específico.

**Why P1**: Sem este filtro o utilizador não consegue perceber a sua evolução por contexto, objetivo central da feature.

**Acceptance Criteria**:

1. WHEN o utilizador abre a página de estatísticas THEN o sistema SHALL mostrar um seletor de grupo (dropdown ou tabs).
2. WHEN o utilizador seleciona um grupo THEN o sistema SHALL filtrar todos os gráficos e tabelas para mostrar apenas dados desse grupo.
3. WHEN o utilizador seleciona "Todos os grupos" THEN o sistema SHALL mostrar a visão global (comportamento atual).
4. WHEN não há sessões de treino para o grupo selecionado THEN o sistema SHALL mostrar estado vazio informativo.
5. WHEN o utilizador muda de grupo THEN o filtro SHALL persistir durante a sessão de navegação (não precisa sobreviver a reloads).

**Independent Test**: Treinar só com NL5, ir a stats, selecionar NL2 → estado vazio; selecionar NL5 → dados aparecem.

---

### P2: Vista do Grupo com lista de situações

**User Story**: Como jogador, quero ver as situações de um grupo numa página dedicada para gerir o meu range por stake.

**Why P2**: Melhora a navegação mas a listagem filtrada (P1) já cobre o caso de uso base.

**Acceptance Criteria**:

1. WHEN o utilizador clica num grupo THEN o sistema SHALL mostrar a lista de situações desse grupo com ações rápidas (editar, arquivar, duplicar).
2. WHEN o grupo não tem situações THEN o sistema SHALL mostrar estado vazio com CTA para criar situação.
3. WHEN o utilizador cria uma situação a partir da vista do grupo THEN o sistema SHALL pré-preencher o campo de grupo no formulário.

**Independent Test**: Abrir grupo "NL5", clicar "Nova situação" — formulário abre com grupo "NL5" pré-selecionado.

---

### P2: Estatísticas — resumo por Grupo no Dashboard

**User Story**: Como jogador, quero ver no dashboard um resumo de performance por grupo (acerto médio, total de mãos) para ter uma visão rápida do estado dos meus ranges.

**Why P2**: Complementa a página de stats mas não bloqueia o MVP.

**Acceptance Criteria**:

1. WHEN o utilizador acede ao dashboard THEN o sistema SHALL mostrar um card por grupo com: nome, acerto total, total de mãos treinadas nas últimas sessões.
2. WHEN um grupo não tem sessões de treino THEN o sistema SHALL mostrar o card com acerto "—" e "0 mãos".

**Independent Test**: Treinar 10 mãos em NL5 → dashboard mostra card NL5 com ~X% de acerto.

---

### P3: Ordenação de Grupos

**User Story**: Como jogador, quero reordenar os grupos para os ter na ordem que me faz sentido.

**Why P3**: Nice-to-have; `sortOrder` no schema permite implementá-lo sem mudança de estrutura.

**Acceptance Criteria**:

1. WHEN o utilizador reordena grupos via drag-and-drop ou setas THEN o sistema SHALL persistir a nova ordem.

---

## Edge Cases

- WHEN um grupo é arquivado com situações ativas THEN o sistema SHALL arquivar (soft-delete) o grupo **e** todas as suas situações em cascata.
- WHEN se tenta iniciar sessão de treino com `situationIds` de grupos misturados (bypass de UI) THEN o sistema SHALL rejeitar com erro de validação no main process.
- WHEN todos os grupos são arquivados THEN a página de configuração de treino SHALL mostrar estado vazio com CTA para criar grupo.
- WHEN a migração corre THEN o sistema SHALL limpar a base de dados (sem migração de dados antigos); o utilizador começa do zero com grupos limpos. (Decisão: sistema ainda em desenvolvimento, sem dados de produção a preservar.)

---

## Testing Strategy

Esta feature atravessa todas as camadas do sistema — schema, IPC, renderer e integração entre elas — pelo que a estratégia de testes é central para a qualidade e não apenas um complemento.

### E2E (Playwright + Electron) — Cobertura ponta a ponta obrigatória

Os testes E2E são o principal mecanismo de verificação de que cada User Story funciona no sistema real (sem mocks de IPC nem de DB). A spec toca o schema, os handlers IPC, o renderer e o fluxo de treino de ponta a ponta — o que torna os E2E insubstituíveis para garantir que as peças se encaixam correctamente. Cada critério de aceitação listado abaixo **deve** ter cobertura num `*.spec.ts` em `e2e/`.

| Test ID    | Critério coberto                                                                                        | Ficheiro sugerido                                    |
| ---------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| E2E-GRP-01 | Criar grupo "NL5", renomear para "NL5 6-Max", arquivar; grupo desaparece da lista                       | `e2e/situation-groups/crud-groups.spec.ts`           |
| E2E-GRP-02 | Criar grupo com nome duplicado → erro de validação visível na UI                                        | `e2e/situation-groups/crud-groups.spec.ts`           |
| E2E-GRP-03 | Criar situação sem selecionar grupo → formulário bloqueia com mensagem de erro                          | `e2e/situation-groups/situation-group-field.spec.ts` |
| E2E-GRP-04 | Arquivar grupo com situações → situações desaparecem das listas ativas                                  | `e2e/situation-groups/archive-cascade.spec.ts`       |
| E2E-GRP-05 | Selecionar grupo "NL5" na configuração de treino → NL10 fica bloqueado; desmarcar NL5 → NL10 disponível | `e2e/situation-groups/training-selection.spec.ts`    |
| E2E-GRP-06 | Iniciar sessão de treino com situações de grupos misturados via bypass de UI → main process rejeita     | `e2e/situation-groups/training-selection.spec.ts`    |
| E2E-GRP-07 | Treinar só com NL5 → stats com tab NL2 mostra estado vazio; tab NL5 mostra dados                        | `e2e/situation-groups/stats-filter.spec.ts`          |
| E2E-GRP-08 | Fluxo completo: criar grupo → criar situação → treinar → ver stats filtradas por grupo                  | `e2e/situation-groups/full-flow.spec.ts`             |

**Regras para os testes E2E desta feature:**

- Usar os fixtures `PT_E2E_*` e os helpers de `e2e/helpers/` já estabelecidos no projeto (ver skill `preflop-e2e-playwright`).
- Cada spec deve ser independente: criar os dados de que precisa e não assumir estado global.
- O fluxo completo (E2E-GRP-08) é o teste de maior valor — priorizá-lo se o tempo for limitado.
- E2E-GRP-06 deve fazer bypass deliberado da UI e verificar que o IPC devolve erro de validação.

### Testes Unitários — Cobertura a aumentar

A feature toca módulos críticos que actualmente têm cobertura unitária insuficiente. A implementação deve ser aproveitada para aumentar essa cobertura de forma deliberada.

| Módulo                       | O que testar                                                                                                   | Prioridade |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------- |
| `src/main/db/groups` (novo)  | `createGroup`, `renameGroup`, `archiveGroup` (incluindo cascata), `listGroups` — cenários de erro e edge cases | P1         |
| `src/main/ipc/groups` (novo) | Handler de cada canal: validação de input, delegação para DB, erros formatados                                 | P1         |
| `src/shared/poker`           | Invariantes que envolvem `groupId` em `TrainingSession`; validação cross-group                                 | P1         |
| `src/main/db/situations`     | `moveSituation` (mudança de grupo), `duplicateSituation` (preserva grupo)                                      | P2         |
| `src/main/db/stats`          | Queries filtradas por `groupId`; resultado vazio quando não há sessões                                         | P2         |

**Meta de cobertura:** Todos os novos módulos do main criados para grupos devem atingir ≥ 80 % de cobertura de statements nos testes unitários (`pnpm test:unit`).

---

## Requirement Traceability

| Requirement ID | Story                                                                             | Phase  | Status  |
| -------------- | --------------------------------------------------------------------------------- | ------ | ------- |
| GRP-01         | P1: CRUD Grupos — listar                                                          | Design | Done    |
| GRP-02         | P1: CRUD Grupos — criar com validação de nome único                               | Design | Done    |
| GRP-03         | P1: CRUD Grupos — renomear                                                        | Design | Done    |
| GRP-04         | P1: CRUD Grupos — arquivar (soft-delete)                                          | Design | Done    |
| GRP-05         | P1: Situações — grupo obrigatório na criação                                      | Design | Done    |
| GRP-06         | P1: Situações — listar por grupo                                                  | Design | Done    |
| GRP-07         | P1: Situações — mover para outro grupo na edição                                  | Design | Done    |
| GRP-08         | P1: Migração — DB limpa (dados existentes descartados; utilizador começa do zero) | Design | Done    |
| GRP-09         | P1: Situações — duplicar preserva grupo                                           | Design | Done    |
| GRP-10         | P1: Treino — seleção por grupo (select-all)                                       | Design | Done    |
| GRP-11         | P1: Treino — bloqueio de seleção cross-group                                      | Design | Done    |
| GRP-12         | P1: Treino — validação cross-group no main process                                | Design | Done    |
| GRP-13         | P1: Treino — persistir groupId em training_sessions                               | Design | Done    |
| GRP-14         | P1: Stats — seletor de grupo                                                      | Design | Done    |
| GRP-15         | P1: Stats — filtrar dados por grupo                                               | Design | Done    |
| GRP-16         | P1: Stats — estado vazio por grupo                                                | Design | Done    |
| GRP-17         | P2: Vista de grupo com lista de situações                                         | -      | Pending |
| GRP-18         | P2: Pré-preencher grupo ao criar situação a partir de grupo                       | -      | Pending |
| GRP-19         | P2: Dashboard — card de resumo por grupo                                          | -      | Pending |
| GRP-20         | P3: Ordenação de grupos                                                           | -      | Pending |

**Coverage:** 20 total, 16 P1 Design concluídos, 4 P2/P3 pendentes.

---

## Success Criteria

- [ ] Utilizador consegue criar grupo "NL5", adicionar situações e treinar apenas com NL5 em < 1 minuto.
- [ ] É impossível iniciar uma sessão com situações de grupos diferentes (validado na UI e no main process).
- [ ] Estatísticas filtradas por grupo devolvem apenas dados das sessões associadas a esse grupo.
- [ ] Migração limpa a DB; o utilizador cria grupos e situações do zero sem dados corrompidos.
- [ ] Todos os testes unitários passam (`pnpm test:unit`).
- [ ] Os 8 testes E2E da tabela `Testing Strategy` passam (`pnpm test` ou suite E2E isolada).
- [ ] Novos módulos do main (grupos, IPC de grupos) têm ≥ 80 % de cobertura de statements nos testes unitários.
