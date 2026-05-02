# Spec: Contexto Analitico de Sessoes de Treino

**Feature:** TRAINING-SESSION-CONTEXT  
**Data:** 2026-05-01  
**Ambito:** Persistir identificador comum e metadados explicitos em `training_sessions` para segmentar estatisticas entre treino individual e treino simultaneo, incluindo filtro por quantidade de mesas.

---

## Problem Statement

Hoje o treino individual persiste uma linha em `training_sessions`, enquanto o treino simultaneo persiste varias linhas independentes sem um identificador de bloco comum nem metadados explicitos de contexto.  
Com isso, as consultas de estatisticas nao conseguem distinguir com precisao sessoes individuais vs simultaneas nem responder de forma confiavel quantas mesas simultaneas originaram cada resultado.

---

## Goals

- [ ] Persistir contexto analitico explicito para toda nova sessao de treino.
- [ ] Garantir que todas as mesas criadas no mesmo treino simultaneo compartilham um identificador de bloco comum.
- [ ] Permitir filtro de estatisticas por tipo de sessao: `individual` ou `simultaneo`.
- [ ] Permitir filtro de estatisticas por quantidade de mesas simultaneas: `2`, `3` ou `4`.
- [ ] Preservar o fluxo atual de estatisticas quando nenhum dos novos filtros estiver aplicado.

---

## Out of Scope

| Item                                                                | Reason                                                                                                        |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Redesign completo da pagina de estatisticas                         | O pedido atual e segmentacao analitica, nao reformulacao visual ampla                                         |
| Drill-down historico por bloco simultaneo em pagina propria         | O identificador comum deve ser persistido agora, mas exploracao dedicada de blocos nao faz parte deste escopo |
| Suporte a quantidades de mesas fora de `2`, `3` e `4`               | O treino simultaneo atual so suporta essas opcoes                                                             |
| Reconstituicao perfeita de blocos simultaneos antigos sem metadados | Os dados atuais nao possuem sinal suficiente para inferencia confiavel                                        |

---

## User Stories

### P1: Persistir contexto de sessao no momento da criacao - MVP

**User Story:** Como utilizador e como sistema analitico, quero que cada sessao gravada carregue seu contexto explicito para que os resultados possam ser segmentados sem heuristicas.

**Why P1:** Sem esta base de persistencia, qualquer filtro futuro continuaria dependente de inferencia fragil e produziria estatisticas ambiguas.

**Acceptance Criteria:**

1. WHEN uma sessao de treino individual e iniciada THEN o sistema SHALL persistir o tipo de sessao como `individual`.
2. WHEN uma sessao de treino individual e iniciada THEN o sistema SHALL persistir `simultaneousTableCount` como nulo ou ausente, sem valor artificial.
3. WHEN um treino simultaneo cria `N` mesas THEN o sistema SHALL persistir o tipo de sessao como `simultaneo` em todas as `training_sessions` criadas, onde `N` pertence a `{2,3,4}`.
4. WHEN um treino simultaneo cria `N` mesas THEN o sistema SHALL persistir o mesmo identificador de bloco comum em todas as `training_sessions` desse arranque.
5. WHEN um treino simultaneo cria `N` mesas THEN o sistema SHALL persistir `simultaneousTableCount = N` em cada linha criada para o bloco.
6. WHEN os dados forem consultados por estatisticas THEN o sistema SHALL conseguir identificar tipo e bloco da sessao sem depender de timestamp, ordem de insercao ou comparacao indireta entre linhas.

**Independent Test:** Iniciar um treino individual e um treino simultaneo com 3 mesas, inspecionar as linhas persistidas e validar tipo, bloco e contagem de mesas.

---

### P1: Filtrar estatisticas por tipo de sessao - MVP

**User Story:** Como utilizador, quero separar estatisticas de treino individual e treino simultaneo para analisar desempenhos em contextos cognitivos diferentes.

**Why P1:** O problema relatado pelo utilizador e precisamente a impossibilidade de diferenciar esses dois contextos no fluxo atual de estatisticas.

**Acceptance Criteria:**

1. WHEN o utilizador abre estatisticas sem aplicar os novos filtros THEN o sistema SHALL manter o comportamento atual e carregar dados sem regressao funcional.
2. WHEN o utilizador seleciona filtro `tipo de sessao = individual` THEN o sistema SHALL considerar apenas sessoes persistidas como `individual`.
3. WHEN o utilizador seleciona filtro `tipo de sessao = simultaneo` THEN o sistema SHALL considerar apenas sessoes persistidas como `simultaneo`.
4. WHEN o utilizador combina filtro de tipo com filtros ja existentes de grupo, periodo, posicao ou situacao THEN o sistema SHALL aplicar a intersecao de todos os filtros.
5. WHEN o backend recebe um filtro de tipo invalido THEN o sistema SHALL rejeitar a consulta com erro de validacao claro em vez de retornar dados ambiguos.

**Independent Test:** Gerar dados de treino individual e simultaneo, alternar o filtro por tipo na pagina de estatisticas e validar que os totais refletem apenas o subconjunto escolhido.

---

### P1: Filtrar estatisticas por quantidade de mesas simultaneas - MVP

**User Story:** Como utilizador, quero analisar separadamente os resultados de treinos com 2, 3 ou 4 mesas para comparar desempenho por carga de multitabling.

**Why P1:** A quantidade de mesas e um fator analitico central do treino simultaneo e foi explicitamente pedida como filtro do fluxo de estatisticas.

**Acceptance Criteria:**

1. WHEN o utilizador seleciona `tipo de sessao = simultaneo` THEN o sistema SHALL permitir filtrar adicionalmente por `2`, `3` ou `4` mesas.
2. WHEN o utilizador aplica filtro `quantidade de mesas = N` THEN o sistema SHALL considerar apenas sessoes simultaneas com `simultaneousTableCount = N`.
3. WHEN nenhum filtro de quantidade de mesas estiver ativo THEN o sistema SHALL agregar conjuntamente todas as sessoes simultaneas compativeis com os demais filtros.
4. WHEN o filtro de quantidade de mesas for usado em conjunto com `tipo de sessao = individual` ou sem um contexto simultaneo valido THEN o sistema SHALL impedir, limpar ou ignorar esse filtro de forma explicita e deterministica.
5. WHEN o backend recebe `simultaneousTableCount` fora do conjunto `{2,3,4}` THEN o sistema SHALL rejeitar a consulta com erro de validacao claro.

**Independent Test:** Criar treinos simultaneos com 2, 3 e 4 mesas, aplicar o filtro de quantidade e validar que cada visao retorna apenas o subconjunto correspondente.

---

### P2: Compatibilidade analitica com dados legados e fluxo atual

**User Story:** Como utilizador, quero que a introducao dos novos metadados e filtros nao quebre a leitura das estatisticas existentes nem os fluxos ja implantados.

**Why P2:** A feature so e util se puder coexistir com o comportamento atual sem gerar erros ou resultados enganosos.

**Acceptance Criteria:**

1. WHEN existirem sessoes antigas sem os novos metadados THEN o sistema SHALL continuar carregando estatisticas nao filtradas sem erro.
2. WHEN existirem sessoes antigas sem os novos metadados e o utilizador aplicar filtros por tipo ou quantidade de mesas THEN o sistema SHALL trata-las de forma deterministica, sem classificacao heuristica silenciosa.
3. WHEN a nova segmentacao for introduzida THEN o sistema SHALL manter compatibilidade com o dashboard atual e com o fluxo atual de resumo de treino, salvo onde o filtro novo for explicitamente aplicado.
4. WHEN uma criacao de treino simultaneo falhar no meio do processo THEN o sistema SHALL evitar persistencia parcial de um bloco com metadados inconsistentes entre as mesas.

**Independent Test:** Executar estatisticas com e sem filtros num banco contendo linhas novas e legadas, garantindo que o fluxo continua funcional e sem classificacoes espurias.

---

## Edge Cases

- WHEN duas sessoes simultaneas diferentes forem iniciadas no mesmo instante THEN o sistema SHALL distingui-las pelo identificador de bloco persistido, nao por heuristica temporal.
- WHEN linhas antigas nao tiverem `sessionType` ou `simultaneousTableCount` THEN o sistema SHALL exclui-las de subconjuntos filtrados que exigem classificacao explicita, a menos que exista regra de migracao deterministica.
- WHEN o renderer enviar filtro de quantidade de mesas sem filtro valido de sessao simultanea THEN o sistema SHALL responder de forma consistente, sem contaminar resultados de sessoes individuais.
- WHEN uma sessao individual tentar persistir metadados de treino simultaneo por bypass de contrato THEN o sistema SHALL rejeitar ou normalizar a gravacao sem ambiguidade.
- WHEN um bloco simultaneo criar varias `training_sessions` THEN todas as linhas SHALL compartilhar exatamente o mesmo identificador de bloco, sem variacoes por mesa.

---

## Requirement Traceability

| Requirement ID | Story | Descricao                                                                             | Status      |
| -------------- | ----- | ------------------------------------------------------------------------------------- | ----------- |
| TSC-01         | P1    | Persistir `sessionType = individual` em sessoes de treino individual                  | Implemented |
| TSC-02         | P1    | Persistir `simultaneousTableCount` nulo ou ausente para sessoes individuais           | Implemented |
| TSC-03         | P1    | Persistir `sessionType = simultaneo` em todas as linhas criadas por treino simultaneo | Implemented |
| TSC-04         | P1    | Persistir identificador de bloco comum para todas as mesas do mesmo treino simultaneo | Implemented |
| TSC-05         | P1    | Persistir `simultaneousTableCount` igual ao numero de mesas do bloco                  | Implemented |
| TSC-06         | P1    | Filtrar estatisticas por `tipo de sessao`                                             | Implemented |
| TSC-07         | P1    | Combinar filtro de tipo com filtros existentes sem quebrar o fluxo atual              | Implemented |
| TSC-08         | P1    | Validar valores invalidos de filtro de tipo no backend                                | Implemented |
| TSC-09         | P1    | Filtrar estatisticas por quantidade de mesas simultaneas `2`, `3` ou `4`              | Implemented |
| TSC-10         | P1    | Validar valores invalidos de `simultaneousTableCount` no backend                      | Implemented |
| TSC-11         | P2    | Preservar estatisticas nao filtradas com dados legados sem erro                       | Implemented |
| TSC-12         | P2    | Tratar dados legados sem classificacao heuristica silenciosa em filtros segmentados   | Implemented |
| TSC-13         | P2    | Evitar persistencia parcial inconsistente ao criar bloco simultaneo                   | Implemented |

**Coverage:** 13 requisitos totais, 13 mapeados no spec, 0 nao mapeados.

**Execution note (2026-05-01):** Implementacao e validacao concluidas. Gates da feature e suite completa passaram (`pnpm typecheck`, `pnpm test:unit`, `pnpm playwright test ...`, `pnpm test`).

---

## Success Criteria

- [x] Toda nova sessao de treino fica classificada explicitamente como `individual` ou `simultaneo`.
- [x] Todo treino simultaneo grava um identificador de bloco comum reutilizado por todas as mesas criadas no mesmo arranque.
- [x] O utilizador consegue filtrar estatisticas por tipo de sessao sem alterar o comportamento do fluxo nao filtrado.
- [x] O utilizador consegue filtrar estatisticas de treino simultaneo por `2`, `3` ou `4` mesas.
- [x] O sistema deixa de depender de inferencias por timestamp ou agrupamentos implicitos para segmentacao analitica de sessoes simultaneas.
