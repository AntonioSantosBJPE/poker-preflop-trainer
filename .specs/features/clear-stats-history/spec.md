# Spec: Limpar Histórico de Estatísticas (por Período)

**Feature:** CLEAR-STATS-HISTORY
**Data:** 2026-05-03
**Âmbito:** Acção na página de estatísticas que permite ao utilizador apagar sessões de treino de um período específico, com dupla confirmação (pré-visualização → confirmação → confirmação final).

---

## Problem Statement

O produto permite acumular sessões de treino indefinidamente, mas não oferece forma de remover dados antigos. Um utilizador que:

- Queira "resetar" as estatísticas para começar do zero num período novo;
- Tenha sessões de teste/experimentais que poluem os dados;
- Queira limpar períodos antigos (ex.: >6 meses) para libertar espaço ou focar-se em dados recentes;

...não tem qualquer forma de o fazer sem acesso directo à base de dados.

---

## Goals

- [ ] Botão de acção na página `/stats` que abre um diálogo de limpeza.
- [ ] Diálogo com selecção de período (date range) + pré-visualização do impacto (sessões e mãos a remover).
- [ ] Segundo diálogo de confirmação ao clicar "Remover", com texto explícito de que a acção é irreversível.
- [ ] Deleção permanente em transacção apenas após a segunda confirmação (`training_sessions` + cascade `session_hands`).
- [ ] Estatísticas são recarregadas automaticamente após a remoção.
- [ ] Cobertura de testes E2E para o fluxo completo (abrir diálogo → preview → dupla confirmação → refresh).

---

## Out of Scope

| Item                                            | Reason                                                                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Limpar dados de situações/grupos/ranges         | Apenas sessões de treino e mãos; configuração de treino nunca é apagada                                             |
| Limpar por situação específica                  | A pré-visualização agrupa tudo no período, sem drill-down por situação                                              |
| Soft-delete ou recuperação (undo)               | Deleção é permanente; futuramente pode-se considerar arquivo                                                        |
| Apagar sessões individuais (uma a uma)          | Funcionalidade separada; esta foca-se em limpeza em massa por período                                               |
| Exportar antes de apagar                        | Pode ser adicionado futuramente como P3                                                                             |
| ConfirmActionDialog reutilizado para o 2º passo | O diálogo principal (date picker + preview) é próprio; o segundo diálogo de confirmação reusa `ConfirmActionDialog` |

---

## User Stories

### P1: Pré-visualização do impacto antes de apagar ⭐ MVP

**User Story:** Como utilizador, quero selecionar um período e ver quantas sessões e mãos serão removidas antes de confirmar a delecção.

**Acceptance Criteria:**

1. WHEN o utilizador clica no botão "Limpar histórico" na página `/stats` THEN o sistema SHALL abrir um diálogo modal com um selector de período (date range).
2. WHEN o utilizador selecciona um período no diálogo THEN o sistema SHALL consultar o backend (`stats:estimateDeleteSessions`) e exibir:
   - Número de sessões de treino no período.
   - Número total de mãos jogadas nessas sessões.
3. WHEN o período seleccionado não tem sessões THEN o sistema SHALL exibir "Nenhuma sessão encontrada neste período" e desabilitar o botão de confirmação.
4. WHEN o utilizador ainda não seleccionou um período THEN o sistema SHALL manter o botão de confirmação desabilitado.

**Independent Test:** Abrir diálogo, seleccionar um período com dados, verificar que o resumo exibe contagens correctas de sessões e mãos.

---

### P1: Confirmação e delecção permanente ⭐ MVP

**User Story:** Como utilizador, quero confirmar a remoção e ver as estatísticas actualizadas após a operação.

**Acceptance Criteria:**

1. WHEN o utilizador clica em "Remover" no primeiro diálogo (com preview) THEN o sistema SHALL fechar o primeiro diálogo e abrir um segundo diálogo de confirmação (`ConfirmActionDialog`) com:
   - Título: "Tem a certeza?"
   - Descrição: "Esta ação irá remover permanentemente X sessões e Y mãos. Não é possível desfazer esta operação."
   - Botão de confirmação: "Sim, remover permanentemente" (destructive styling).
   - Botão de cancelar: "Cancelar".
2. WHEN o utilizador confirma no segundo diálogo THEN o sistema SHALL remover permanentemente as sessões e respectivas mãos do período (transacção `DELETE FROM training_sessions WHERE ...` + cascade `session_hands`).
3. WHEN o utilizador clica "Cancelar" no segundo diálogo THEN o sistema SHALL fechar o segundo diálogo sem qualquer alteração aos dados.
4. WHEN a delecção termina com sucesso THEN o sistema SHALL:
   - Fechar o segundo diálogo.
   - Recarregar automaticamente todos os dados de estatísticas (overview, timeline, bySituation, worstHands) com os filtros actuais.
   - Exibir uma toast/notificação de sucesso (ex.: "X sessões removidas com sucesso").
5. WHEN a delecção falha (erro de BD, perda de conexão) THEN o sistema SHALL exibir uma mensagem de erro no segundo diálogo e manter o diálogo aberto.

**Independent Test:** Seleccionar período → confirmar → verificar toast de sucesso → verificar que as estatísticas foram actualizadas (sessões e mãos decrementadas).

---

## Edge Cases

- WHEN o período seleccionado contém >1000 sessões THEN o sistema SHALL processar a delecção sem bloquear a UI (transacção única, mas com feedback visual de "processando...").
- WHEN o utilizador abre o diálogo, fecha, e reabre THEN o sistema SHALL resetar o estado (período volta ao valor padrão, preview recalculado).
- WHEN o período seleccionado cobre todo o histórico (fromTs = 0) THEN o sistema SHALL confirmar que o utilizador quer apagar **todas** as sessões.
- WHEN o período contém sessões de outros utilizadores THEN o sistema SHALL apagar apenas as sessões do utilizador autenticado (filtro por `userId`).
- WHEN o período não tem sessões THEN o sistema SHALL rejeitar `stats:deleteSessions` com erro `'Nenhuma sessão encontrada no período'` e não executar qualquer transacção.
- WHEN o período é inválido (fromTs > toTs, valores negativos) THEN o sistema SHALL rejeitar com erro de validação sem consultar a BD.

---

## Flows

### Fluxo Principal

```
[StatsPage] → clica "Limpar histórico"
    ↓
[Abre ClearStatsDialog (1º diálogo)]
    ↓
[Selecciona período via DatePeriodFilter]
    ↓ (auto‑trigger após selecção)
[IPC: stats:estimateDeleteSessions] → { sessionCount, handCount }
    ↓
[Exibe preview: "X sessões e Y mãos serão removidas"]
    ↓
[Clica "Remover"]
    ↓
[Fecha 1º diálogo → Abre ConfirmActionDialog (2º diálogo)]
    ↓
[Lê aviso: "Tem a certeza? ... Não é possível desfazer"]
    ↓
[Clica "Sim, remover permanentemente"]
    ↓ (loading state no botão)
[IPC: stats:deleteSessions] → sucesso
    ↓
[Fecha 2º diálogo + toast + refresh stats]
```

**Fluxo de cancelamento:**

```
[2º diálogo aberto] → clica "Cancelar"
    ↓
[Fecha 2º diálogo] → nada é alterado
```

### Integração com DatePeriodFilter

O diálogo reutiliza o componente `DatePeriodFilter` já existente no projecto (`src/renderer/src/components/app/DatePeriodFilter.tsx`) para a selecção do período, garantindo consistência de UX com os restantes filtros de data.

---

## Requirement Traceability

| Requirement ID | Story                                     | Tasks                  | Phase | Status  |
| -------------- | ----------------------------------------- | ---------------------- | ----- | ------- |
| CLEAR-STATS-01 | P1: Pré-visualização do impacto           | T1, T2, T3, T4, T5, T6 | Tasks | Pending |
| CLEAR-STATS-02 | P1: Pré-visualização (sessões vazias)     | T4, T6                 | Tasks | Pending |
| CLEAR-STATS-03 | P1: Dupla confirmação (2º diálogo)        | T1, T2, T3, T4, T6     | Tasks | Pending |
| CLEAR-STATS-04 | P1: Cancelar no 2º diálogo sem alterações | T4, T6                 | Tasks | Pending |
| CLEAR-STATS-05 | P1: Deleção após segunda confirmação      | T3, T5, T6             | Tasks | Pending |
| CLEAR-STATS-06 | P1: Recarregar estatísticas após delecção | T4, T5, T6             | Tasks | Pending |
| CLEAR-STATS-07 | P1: Tratamento de erro na delecção        | T3, T4, T6             | Tasks | Pending |

**Coverage:** 7 total, 7 mapped to tasks, 0 unmapped ✅

---

## Success Criteria

- [ ] Utilizador consegue remover sessões de um período em < 4 cliques após abrir o diálogo (selecionar período → ver preview → Remover → confirmar).
- [ ] Estatísticas reflectem os dados correctos imediatamente após a remoção (refresh automático dos 4 conjuntos de dados).
- [ ] Zero perda de dados não-intencional (dupla confirmação explícita antes de apagar).
- [ ] Testes E2E validam o fluxo completo com verificação de persistência após reload da página.
- [ ] Testes unitários cobrem validação, estimativa, deleção e tratamento de erros nos handlers IPC.
- [ ] Cobertura de cenários de cancelamento (1º e 2º diálogo) sem efeitos colaterais.
