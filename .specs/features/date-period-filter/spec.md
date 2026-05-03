# Date Period Filter — Specification

**Feature:** DATE-PERIOD-FILTER  
**Data:** 2026-05-03  
**Âmbito:** Componente reutilizável de filtro por período (data inicial/data final) aplicado às páginas de Histórico (`/history`) e Estatísticas (`/stats`).

---

## Problem Statement

As páginas de Histórico e Estatísticas hoje permitem filtrar por grupo, tipo de sessão e nº de mesas simultâneas, mas não há qualquer filtro temporal. O utilizador vê **todas** as sessões desde o início, o que se torna impeditivo à medida que o volume de dados cresce. Na página de estatísticas, os gráficos (timeline) e tabelas (por situação, piores mãos) misturam dados de todo o período sem que o utilizador consiga isolar, por exemplo, o desempenho do último mês.

A `StatsFilters` já possui os campos `fromTs`/`toTs` no tipo (`src/shared/ipc/types.ts`) e o handler IPC `stats.ts` já os suporta, mas não há UI para os preencher. A `SessionHistoryFilters` não possui campos de data — é necessário adicioná-los e propagá-los até à query SQL.

---

## Goals

- [ ] Componente `DatePeriodFilter` reutilizável entre `HistoryPage` e `StatsPage`, com presets padrão e opção de data personalizada.
- [ ] `HistoryPage` ganha filtro por período; `SessionHistoryFilters` e handler IPC `training:listSessions` passam a suportar `fromTs`/`toTs`.
- [ ] `StatsPage` ganha UI de filtro por período (hoje é apenas backend-capable, sem UI).
- [ ] Valor default do filtro = "Mês atual" em ambas as páginas, para isolar o desempenho recente por omissão.

---

## Out of Scope

| Feature                                          | Reason                                                          |
| ------------------------------------------------ | --------------------------------------------------------------- |
| Filtro por período no Dashboard                  | Não há pedido; dashboard mostra visão geral sem volume de dados |
| Filtro por período na revisão mão a mão          | A revisão é de uma sessão específica, não faz sentido           |
| Comparação entre períodos                        | Complexidade excessiva; feature standalone futura               |
| Persistência da escolha de período entre sessões | Seria preferências de utilizador; fora do escopo                |

---

## User Stories

### P1: Componente DatePeriodFilter reutilizável ⭐ MVP

**User Story:** Como utilizador, quero um componente de filtro de período que possa ser usado tanto no histórico como nas estatísticas, com períodos predefinidos e opção de datas personalizadas.

**Acceptance Criteria:**

1. WHEN o componente é renderizado THEN o sistema SHALL exibir um `Select` com as opções de período predefinidas mais "Personalizado".
2. WHEN o utilizador seleciona um período predefinido THEN o sistema SHALL computar `fromTs` e `toTs` (epoch segundos) correspondentes e chamar `onChange`.
3. WHEN o utilizador seleciona "Personalizado" THEN o sistema SHALL exibir dois campos de data (`from` e `to`) do tipo `date` (apenas data, sem hora).
4. WHEN o utilizador preenche as datas personalizadas e ambas são válidas THEN o sistema SHALL chamar `onChange` com `fromTs`/`toTs`.
5. WHEN o utilizador preenche apenas a data inicial THEN o sistema SHALL usar a data atual como `toTs`.
6. WHEN `fromTs` > `toTs` THEN o sistema SHALL exibir erro de validação e não chamar `onChange`.

**Presets obrigatórios:**

| Label                   | Cálculo                                                         |
| ----------------------- | --------------------------------------------------------------- |
| Hoje                    | `fromTs = início do dia de hoje`, `toTs = agora`                |
| Ontem                   | `fromTs = início do dia de ontem`, `toTs = fim do dia de ontem` |
| Últimos 7 dias          | `fromTs = agora - 7 dias`, `toTs = agora`                       |
| Últimos 15 dias         | `fromTs = agora - 15 dias`, `toTs = agora`                      |
| **Mês atual** (default) | `fromTs = início do mês corrente`, `toTs = agora`               |
| Últimos 30 dias         | `fromTs = agora - 30 dias`, `toTs = agora`                      |
| Últimos 90 dias         | `fromTs = agora - 90 dias`, `toTs = agora`                      |
| Personalizado           | Exibe inputs de data `from` e `to`                              |

**Independent Test:** Renderizar `DatePeriodFilter`, selecionar "Últimos 7 dias", verificar que `onChange` recebe `fromTs` correspondente a 7 dias atrás e `toTs` ≈ agora. Selecionar "Personalizado", preencher datas, verificar `onChange`.

---

### P1: Filtro por período no Histórico ⭐ MVP

**User Story:** Como utilizador, quero filtrar o histórico de sessões por um período de datas para ver apenas sessões de um intervalo específico.

**Acceptance Criteria:**

1. WHEN o utilizador está na página `/history` THEN o sistema SHALL exibir o `DatePeriodFilter` na `FilterToolbar`.
2. WHEN o utilizador altera o período THEN o sistema SHALL incluir `fromTs`/`toTs` nos parâmetros enviados ao handler `training:listSessions`.
3. WHEN o utilizador altera o período THEN o sistema SHALL resetar a paginação para a página 1.
4. WHEN a página carrega sem query params THEN o sistema SHALL aplicar o preset "Mês atual" como default.
5. WHEN existem query params `fromTs`/`toTs` na URL THEN o sistema SHALL restaurar o período correspondente.
6. WHEN o filtro de período é aplicado THEN as subqueries de contagem (`handsPlayed`, `correct`) SHALL considerar apenas sessões dentro do período (consistência entre total e detalhe).

**Independent Test:** Navegar para `/history`, ver `DatePeriodFilter` presente. Selecionar "Últimos 7 dias", confirmar que a lista mostra apenas sessões dos últimos 7 dias. Verificar query params `fromTs`/`toTs` na URL.

---

### P1: Filtro por período nas Estatísticas ⭐ MVP

**User Story:** Como utilizador, quero filtrar as estatísticas por um período de datas para ver o meu desempenho num intervalo específico.

**Acceptance Criteria:**

1. WHEN o utilizador está na página `/stats` THEN o sistema SHALL exibir o `DatePeriodFilter` na `FilterToolbar`.
2. WHEN o utilizador altera o período THEN o sistema SHALL propagar `fromTs`/`toTs` para os handlers `stats:overview`, `stats:timeline`, `stats:bySituation` e `stats:worstHands`.
3. WHEN o utilizador altera o período THEN todas as secções da página (overview cards, gráfico de evolução, tabela por situação, piores mãos) SHALL refletir o mesmo período.
4. WHEN a página carrega sem estado prévio THEN o sistema SHALL aplicar o preset "Mês atual" como default.

**Independent Test:** Navegar para `/stats` com dados de vários meses. Selecionar "Mês atual", confirmar que overview cards mostram apenas dados do mês. Alterar para "Últimos 7 dias", confirmar que o gráfico de evolução e a tabela por situação atualizam.

---

### P2: Query params no histórico

**User Story:** Como utilizador, quero que o filtro de período seja preservado nos query params da URL do histórico para poder partilhar ou voltar ao estado.

**Acceptance Criteria:**

1. WHEN o utilizador seleciona um período no histórico THEN o sistema SHALL refletir `fromTs` e `toTs` nos query params.
2. WHEN o utilizador acede diretamente a `/history?fromTs=...&toTs=...` THEN o sistema SHALL aplicar os filtros correspondentes.
3. WHEN o utilizador seleciona "Personalizado" e preenche datas THEN `fromTs`/`toTs` nos query params SHALL corresponder às datas escolhidas.

---

## Edge Cases

- WHEN `toTs` é definido sem `fromTs` THEN o sistema SHALL considerar `fromTs = epoch 0` (desde o início).
- WHEN a data inicial é maior que a data final THEN o sistema SHALL exibir erro de validação no componente de filtro personalizado.
- WHEN `fromTs` e `toTs` são ambos `undefined` (nenhum preset selecionado) THEN o sistema SHALL não aplicar filtro temporal (mesmo comportamento atual).
- WHEN o mês atual muda (ex: 1º dia do mês) THEN o preset "Mês atual" SHALL recalcular corretamente para o novo mês (determinístico, baseado em `new Date()` do momento).
- WHEN não há sessões no período selecionado THEN o sistema SHALL exibir empty state "Nenhuma sessão encontrada neste período" no histórico e os cards vazios nas estatísticas.

---

## Requirement Traceability

| Requirement ID | Descrição                                                  | Status   |
| -------------- | ---------------------------------------------------------- | -------- |
| DATE-01        | Componente `DatePeriodFilter` com presets + personalizado  | Pending  |
| DATE-02        | Preset "Mês atual" como default                            | Pending  |
| DATE-03        | Validação: fromTs ≤ toTs                                   | Pending  |
| DATE-04        | `SessionHistoryFilters` ganha `fromTs`/`toTs` opcionais    | Pending  |
| DATE-05        | Handler `training:listSessions` filtra por `fromTs`/`toTs` | Pending  |
| DATE-06        | `HistoryPage` exibe `DatePeriodFilter` na FilterToolbar    | Pending  |
| DATE-07        | Query params `fromTs`/`toTs` no histórico (P2)             | Pending  |
| DATE-08        | `StatsPage` exibe `DatePeriodFilter` na FilterToolbar      | Pending  |
| DATE-09        | Handlers `stats:*` já suportam `fromTs`/`toTs` (existente) | Existing |
| DATE-10        | Todas as secções de stats respondem ao mesmo período       | Pending  |
| DATE-11        | Reset de página ao alterar período no histórico            | Pending  |
| DATE-12        | Empty state adequado quando período não tem dados          | Pending  |

---

## Success Criteria

- [ ] O utilizador consegue selecionar "Mês atual", "Últimos 7 dias", "Personalizado" e outros presets tanto no histórico como nas estatísticas.
- [ ] O histórico e as estatísticas refletem apenas os dados do período selecionado.
- [ ] O preset default "Mês atual" isola o desempenho do mês corrente sem intervenção do utilizador.
- [ ] O componente `DatePeriodFilter` é reutilizável (import partilhado entre ambas as páginas).
- [ ] Nenhuma regressão nos filtros existentes (grupo, tipo de sessão, mesas).
- [ ] A suíte de testes unitários e E2E existente continua verde.
