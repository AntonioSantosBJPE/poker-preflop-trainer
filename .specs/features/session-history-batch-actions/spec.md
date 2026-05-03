# Spec: Acções em Lote no Histórico de Sessões

**Feature:** SESSION-HISTORY-BATCH-ACTIONS
**Data:** 2026-05-03
**Âmbito:** Seleção múltipla de sessões na tabela de histórico (checkbox por linha + select-all), barra de ações em lote com "Remover sessões" e "Revisão múltipla", e novo fluxo agregado de revisão multi-sessão.

---

## Problem Statement

O histórico de sessões (`/history`) é atualmente uma lista de consulta apenas. O utilizador consegue:

- Ver sessões passadas
- Clicar numa sessão para a rever individualmente

Mas não consegue:

- **Selecionar várias sessões** para operar em lote (ex.: apagar várias de uma vez)
- **Rever várias sessões num único fluxo contínuo** — se fez 3 sessões curtas, tem de sair e entrar em cada uma separadamente
- **Remover sessões específicas** sem ter de apagar por período inteiro (como nas estatísticas)

Isto quebra o fluxo de estudo: o utilizador quer poder selecionar as sessões que errou mais e revê-las todas de seguida, ou limpar sessões de teste sem afetar o histórico real.

---

## Goals

- [ ] Multi-seleção na tabela de histórico via checkbox por linha + checkbox "select all" no header
- [ ] Barra de ações em lote surge quando ≥1 linha selecionada, com ações: "Remover sessões" e "Revisão múltipla"
- [ ] Remover sessões segue o padrão de dupla confirmação (estimate → confirm) das estatísticas, mas para IDs específicos
- [ ] Revisão múltipla: nova página `/history/review-multi` que agrega todas as mãos das sessões selecionadas num único fluxo de revisão sequencial
- [ ] Persistência da seleção ao mudar de página (checkbox mantém-se ao navegar na paginação)
- [ ] Cobertura de testes unitários (componentes, handlers) e E2E (fluxo completo)

---

## Out of Scope

| Item                                                                                             | Reason                                                                    |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Seleção persistente entre sessões (fechar e reabrir o programa)                                  | A seleção é efémera — apenas durante a visita à página                    |
| "Select all across all pages" (selecionar todos os resultados do filtro, não só da página atual) | Apenas select-all na página atual; cross-page requer pesquisa complexa    |
| Ordenar/arrastar mãos na revisão múltipla                                                        | A ordem segue o índice original de cada sessão, intercaladas por sessão   |
| Filtrar/ordenar dentro da revisão múltipla                                                       | A revisão múltipla é apenas visualização sequencial; sem filtros internos |
| Marcar sessões como "favoritas" ou com tags                                                      | Funcionalidade separada                                                   |
| Exportar sessões selecionadas                                                                    | Fora do escopo                                                            |

---

## User Stories

### P1: Seleção múltipla na tabela de histórico ⭐ MVP

**User Story:** Como utilizador, quero poder selecionar uma ou mais sessões na tabela do histórico através de checkboxes para depois executar ações em lote.

**Acceptance Criteria:**

1. WHEN a tabela de histórico renderiza THEN cada linha SHALL ter um checkbox na primeira coluna.
2. WHEN o utilizador clica no checkbox de uma linha THEN essa linha SHALL ficar visualmente selecionada (ex.: fundo mais escuro) e o checkbox marcado.
3. WHEN o utilizador clica novamente no checkbox THEN a linha SHALL desselecionar.
4. WHEN o utilizador clica no checkbox no cabeçalho da coluna (select-all) THEN TODAS as linhas da página atual SHALL ser selecionadas.
5. WHEN todas as linhas da página estão selecionadas e o utilizador clica no checkbox do cabeçalho THEN TODAS as linhas SHALL desselecionar.
6. WHEN o utilizador muda de página (paginação) THEN a seleção das linhas da página anterior SHALL ser preservada (a seleção é acumulativa através de páginas).
7. WHEN o utilizador altera um filtro (grupo, tipo, data) THEN a seleção SHALL ser limpa (muda o conjunto de resultados).
8. WHEN a tabela está em empty state (0 resultados) THEN o checkbox no cabeçalho SHALL estar oculto ou desabilitado.
9. WHEN o utilizador clica no checkbox de uma linha, o clique SHALL NÃO trigger a navegação (onRowClick) para a página de detalhe.

**Independent Test:** Navegar para `/history`, marcar 3 checkboxes, confirmar que aparecem marcadas visualmente. Marcar select-all, confirmar que todas as 10 linhas ficam marcadas. Mudar de página, voltar atrás, confirmar que a seleção anterior persiste.

---

### P1: Barra de ações em lote ⭐ MVP

**User Story:** Como utilizador, quero ver uma barra de ações contextual que surge quando tenho sessões selecionadas, com botões para "Remover sessões" e "Revisão múltipla".

**Acceptance Criteria:**

1. WHEN nenhuma linha está selecionada THEN a barra de ações SHALL estar oculta.
2. WHEN 1 ou mais linhas estão selecionadas THEN a barra de ações SHALL surgir entre os filtros e a tabela (ou sobrepondo a tabela), exibindo:
   - Contagem: "N sessões selecionadas"
   - Botão "Remover sessões" (destructive style - vermelho)
   - Botão "Revisão múltipla" (primary style)
   - Botão "Limpar seleção" (outline/cancel)
3. WHEN o utilizador clica em "Limpar seleção" THEN todas as linhas SHALL desselecionar e a barra SHALL ocultar-se.
4. WHEN a seleção é limpa (via "Limpar seleção" ou desselecionando todas as linhas) THEN a barra SHALL ocultar-se.
5. WHEN o utilizador clica em "Remover sessões" E a seleção contém sessões simultâneas (sessionType = 'simultaneous') THEN o sistema SHALL exibir um aviso adicional de que as sessões selecionadas podem incluir múltiplas sub-sessões.
6. WHEN a seleção é vazia (após remoção ou revisão) THEN a barra SHALL ocultar-se automaticamente.

**Independent Test:** Selecionar 3 sessões → confirmar que a barra aparece com "3 sessões selecionadas". Clicar "Limpar seleção" → confirmar que a barra desaparece.

---

### P1: Remover sessões selecionadas ⭐ MVP

**User Story:** Como utilizador, quero remover permanentemente as sessões que selecionei, com dupla confirmação (preview + confirmação final).

**Acceptance Criteria:**

1. WHEN o utilizador clica em "Remover sessões" na barra de ações THEN o sistema SHALL abrir um diálogo de pré-visualização com:
   - Título: "Remover sessões"
   - Descrição: "X sessões e Y mãos serão removidas permanentemente."
   - Botão "Remover" (destructive)
   - Botão "Cancelar"
2. WHEN o diálogo de pré-visualização abre THEN o sistema SHALL consultar `training:estimateDeleteSessionsByIds` (novo IPC) para obter a contagem exata de sessões e mãos.
3. WHEN o utilizador confirma no diálogo de pré-visualização THEN o sistema SHALL fechar esse diálogo e abrir um segundo diálogo (`ConfirmActionDialog`) com:
   - Título: "Tem a certeza?"
   - Descrição: "Esta ação irá remover permanentemente X sessões e Y mãos. Não é possível desfazer esta operação."
   - Botão "Sim, remover permanentemente" (destructive)
   - Botão "Cancelar"
4. WHEN o utilizador confirma no segundo diálogo THEN o sistema SHALL chamar `training:deleteSessionsByIds` (novo IPC), que remove as sessões em transação.
5. WHEN a remoção termina com sucesso THEN o sistema SHALL:
   - Fechar os diálogos
   - Limpar a seleção
   - Recarregar a lista de sessões (mantendo a página atual)
   - Exibir toast de sucesso: "X sessões removidas com sucesso."
6. WHEN a remoção falha THEN o sistema SHALL exibir mensagem de erro no segundo diálogo.

**Independent Test:** Selecionar 2 sessões → clicar "Remover sessões" → ver preview → confirmar → confirmar novamente → verificar que a lista recarregou sem as sessões e o toast apareceu.

---

### P1: Revisão múltipla de sessões ⭐ MVP

**User Story:** Como utilizador, quero rever todas as mãos de várias sessões selecionadas num único fluxo contínuo, como se fosse uma sessão gigante.

**Acceptance Criteria:**

1. WHEN o utilizador clica em "Revisão múltipla" na barra de ações THEN o sistema SHALL navegar para `/history/review-multi?ids=1,2,3` com os IDs das sessões selecionadas.
2. WHEN a página de revisão múltipla carrega THEN o sistema SHALL chamar `training:getMultiSessionDetail` (novo IPC) que retorna os dados agregados de todas as sessões.
3. WHEN os dados carregam THEN o sistema SHALL exibir:
   - **Cabeçalho agregado**: data range (ex.: "12 Mar 2026 — 14 Mar 2026"), total de sessões, total de mãos, accuracy agregada, duração total.
   - **Cards de mão** (reutilizar `HandReviewCard`) navegáveis com anterior/próxima, percorrendo todas as mãos de todas as sessões sequencialmente.
   - Indicador visual: "Mão X de Y global" + "Sessão: dd/mm (N)" para contextualizar a que sessão a mão pertence.
4. WHEN o utilizador navega para a última mão e clica "Próxima" THEN o sistema SHALL desabilitar o botão (como no fluxo de sessão única).
5. WHEN o utilizador clica em "Voltar ao histórico" THEN o sistema SHALL navegar de volta para `/history` preservando os filtros atuais.
6. WHEN uma sessão selecionada foi entretanto removida por outro processo THEN o sistema SHALL omitir essa sessão e continuar com as restantes, exibindo um aviso.

**Independent Test:** Selecionar 3 sessões → clicar "Revisão múltipla" → confirmar que o cabeçalho agrega corretamente → navegar entre mãos → confirmar que as mãos da sessão 2 aparecem após as da sessão 1.

---

### P2: Estado visual de linha selecionada

**User Story:** Como utilizador, quero ver claramente quais linhas estão selecionadas através de um estilo visual distinto.

**Acceptance Criteria:**

1. WHEN uma linha está selecionada THEN o sistema SHALL aplicar `bg-muted/70` ou similar (mais escuro que hover) à linha inteira.
2. WHEN o rato passa sobre uma linha selecionada THEN o sistema SHALL manter o fundo de seleção (não perder o estado visual).
3. WHEN o utilizador clica no corpo da linha (fora do checkbox) THEN o sistema SHALL navegar para a página de detalhe (comportamento existente), SEM alterar o estado do checkbox.

**Independent Test:** Selecionar linha A → clicar no corpo da linha B → confirmar que navega para o detalhe da sessão B. Voltar → confirmar que linha A continua selecionada.

---

## Edge Cases

- WHEN o utilizador seleciona sessões e depois aplica um filtro THEN a seleção SHALL ser limpa (os dados mudaram).
- WHEN o utilizador está na página 3, seleciona linhas, navega para a página 1 e volta à página 3 THEN a seleção SHALL preservar-se (desde que os filtros não tenham mudado).
- WHEN o utilizador seleciona 0 sessões e clica "Remover" (botão desabilitado) THEN nada acontece.
- WHEN o utilizador clica "Revisão múltipla" com apenas 1 sessão selecionada THEN o sistema SHALL redirecionar para a revisão normal (`/history/:sessionId`) em vez da revisão múltipla.
- WHEN a página `/history/review-multi` é acedida diretamente sem `ids` THEN o sistema SHALL exibir erro e link para voltar.
- WHEN as sessões selecionadas são de tipos mistos (single + simultaneous) THEN a revisão múltipla SHALL agregar normalmente.
- WHEN `training:deleteSessionsByIds` é chamado com IDs que não existem ou já foram removidos THEN o sistema SHALL retornar erro e não fazer alterações.
- WHEN EntityTable tem 0 linhas (empty state) THEN o cabeçalho não deve renderizar checkbox select-all.

---

## Flows

### Fluxo Principal — Seleção + Remoção

```
[HistoryPage] → marca checkbox na linha A, B, C
    ↓
[Barra de ações] surge: "3 sessões selecionadas" + [Remover] [Revisão múltipla] [Limpar]
    ↓ clica "Remover"
[Abre PreviewDialog] → IPC: training:estimateDeleteSessionsByIds([A,B,C])
    ↓ preview: "3 sessões, 45 mãos serão removidas"
[Clica "Remover"]
    ↓
[Abre ConfirmActionDialog] → "Tem a certeza? ... Não é possível desfazer"
    ↓ confirma
[IPC: training:deleteSessionsByIds([A,B,C])] → sucesso
    ↓
[Toast + recarregar lista + limpar seleção]
```

### Fluxo Principal — Seleção + Revisão Múltipla

```
[HistoryPage] → marca checkbox na linha A, B
    ↓
[Barra de ações] → clica "Revisão múltipla"
    ↓
[Navega para /history/review-multi?ids=42,55]
    ↓
[IPC: training:getMultiSessionDetail([42,55])]
    ↓
[Cabeçalho agregado + HandReviewCards navegáveis]
    ↓
[Voltar ao histórico] → /history (filtros preservados)
```

### Fluxo de Navegação na Revisão Múltipla

```
Mão 0 — Sessão A (handIndex 0)
Mão 1 — Sessão A (handIndex 1)
...
Mão N — Sessão A (handIndex N)
Mão N+1 — Sessão B (handIndex 0) ← transição visual: indicador "Sessão: 14 Mar"
...
Mão Total-1 — Sessão Z (handIndex M)
```

---

## Componentes e Modificações

### EntityTable — Adicionar suporte a seleção

- Nova prop opcional `selectedKeys?: Set<number | string>`
- Nova prop opcional `onSelectionChange?: (selected: Set<number | string>) => void`
- Nova prop opcional `selectable?: boolean` (default false)
- Nova prop opcional `getRowKey` já existe, usado para identificar linhas
- Quando `selectable` é true:
  - Primeira coluna é um checkbox no header e em cada linha
  - Checkbox do header: "select all" se nem todas selecionadas, "deselect all" se todas
  - Clique no checkbox da linha não propaga para `onRowClick`
  - Linha selecionada recebe classe visual `bg-muted/70`

### HistoryPage — Integração de seleção

- Estado `selectedIds: Set<number>` (acumulativo entre páginas)
- Estado `selectionVersion: number` (incrementa quando filtros mudam → limpa seleção)
- Persistir `selectedIds` num ref para preservar entre renders de página
- Barra de ações condicional (`selectedIds.size > 0`)
- Botão "Remover sessões" → abre diálogo de remoção
- Botão "Revisão múltipla" → navega para `/history/review-multi?ids=...`

### DeleteSessionsDialog (novo)

- Similar a `ClearStatsDialog` mas para IDs específicos em vez de período
- Dois passos: preview → confirmação

### MultiSessionReviewPage (nova página)

- Rota: `/history/review-multi`
- Lê `ids` dos query params
- Chama `training:getMultiSessionDetail` com array de IDs
- Renderiza cabeçalho agregado + `HandReviewCard` para navegação
- Indicador de sessão atual no card (ex.: badge "Sessão 2/3 — 14 Mar")

---

## Requisitos IPC

### Novos canais

| Canal                                  | Input               | Output                  | Descrição                                      |
| -------------------------------------- | ------------------- | ----------------------- | ---------------------------------------------- |
| `training:estimateDeleteSessionsByIds` | `{ ids: number[] }` | `DeleteEstimateDto`     | Estimar impacto de remover sessões específicas |
| `training:deleteSessionsByIds`         | `{ ids: number[] }` | `DeleteEstimateDto`     | Remover sessões específicas em transação       |
| `training:getMultiSessionDetail`       | `{ ids: number[] }` | `MultiSessionDetailDto` | Dados agregados de múltiplas sessões           |

### MultiSessionDetailDto

```typescript
type MultiSessionDetailDto = {
  sessions: SessionHistoryItemDto[];
  hands: SessionHandDetailDto[]; // flatten: todas as mãos de todas as sessões, ordenadas
  handSessionMap: number[]; // handSessionMap[i] = sessionId da mão i
  situationActionsMap: Record<number, SessionDetailDto['situationActionsMap'][number]>;
};
```

---

## Requirement Traceability

| Req ID        | Descrição                                                | Story                | Status  |
| ------------- | -------------------------------------------------------- | -------------------- | ------- |
| BATCH-SEL-01  | Checkbox por linha na tabela                             | P1: Seleção múltipla | Pending |
| BATCH-SEL-02  | Checkbox select-all no header                            | P1: Seleção múltipla | Pending |
| BATCH-SEL-03  | Estilo visual de linha selecionada                       | P2: Estado visual    | Pending |
| BATCH-SEL-04  | Clique no checkbox NÃO trigger navegação                 | P1: Seleção múltipla | Pending |
| BATCH-SEL-05  | Seleção preservada entre páginas                         | P1: Seleção múltipla | Pending |
| BATCH-SEL-06  | Seleção limpa ao mudar filtros                           | P1: Seleção múltipla | Pending |
| BATCH-TOOL-01 | Barra de ações surge com ≥1 seleção                      | P1: Barra de ações   | Pending |
| BATCH-TOOL-02 | Contagem "N sessões selecionadas"                        | P1: Barra de ações   | Pending |
| BATCH-TOOL-03 | Botão "Limpar seleção"                                   | P1: Barra de ações   | Pending |
| BATCH-TOOL-04 | Botão "Remover sessões"                                  | P1: Barra de ações   | Pending |
| BATCH-TOOL-05 | Botão "Revisão múltipla"                                 | P1: Barra de ações   | Pending |
| BATCH-DEL-01  | Diálogo preview ao clicar "Remover"                      | P1: Remover sessões  | Pending |
| BATCH-DEL-02  | Estimate IPC retorna contagens                           | P1: Remover sessões  | Pending |
| BATCH-DEL-03  | Dupla confirmação (FeedbackDialog + ConfirmActionDialog) | P1: Remover sessões  | Pending |
| BATCH-DEL-04  | Delete IPC remove em transação                           | P1: Remover sessões  | Pending |
| BATCH-DEL-05  | Toast + refresh + limpar seleção após sucesso            | P1: Remover sessões  | Pending |
| BATCH-REV-01  | Navegação para `/history/review-multi?ids=...`           | P1: Revisão múltipla | Pending |
| BATCH-REV-02  | IPC retorna dados agregados de múltiplas sessões         | P1: Revisão múltipla | Pending |
| BATCH-REV-03  | Cabeçalho agregado (data range, total hands, accuracy)   | P1: Revisão múltipla | Pending |
| BATCH-REV-04  | HandReviewCard navegável percorre mãos flatten           | P1: Revisão múltipla | Pending |
| BATCH-REV-05  | Indicador visual de sessão atual no card                 | P1: Revisão múltipla | Pending |
| BATCH-REV-06  | 1 sessão selecionada → redireciona para revisão normal   | P1: Revisão múltipla | Pending |
| BATCH-NAV-01  | "Voltar ao histórico" preserva filtros                   | P1: Revisão múltipla | Pending |
| BATCH-NAV-02  | Acesso direto sem `ids` → erro + link voltar             | P1: Revisão múltipla | Pending |

**Coverage:** 24 total, 0 mapped to tasks, 24 unmapped ⚠️

---

## Testing Strategy

### Unitários obrigatórios

| Teste                                                     | Layer       | Req              |
| --------------------------------------------------------- | ----------- | ---------------- |
| `EntityTable` renderiza checkbox quando selectable=true   | component   | BATCH-SEL-01     |
| `EntityTable` select-all seleciona/desseleciona todas     | component   | BATCH-SEL-02     |
| `EntityTable` clique checkbox não propaga onRowClick      | component   | BATCH-SEL-04     |
| `HistoryPage` mantém selectedIds entre mudanças de página | component   | BATCH-SEL-05     |
| `HistoryPage` limpa selectedIds quando filtros mudam      | component   | BATCH-SEL-06     |
| `HistoryPage` barra de ações visível/invisível            | component   | BATCH-TOOL-01    |
| `DeleteSessionsDialog` preview + confirmação              | component   | BATCH-DEL-01..04 |
| `MultiSessionReviewPage` carrega dados agregados          | component   | BATCH-REV-02     |
| `MultiSessionReviewPage` 1 sessão → redirect              | component   | BATCH-REV-06     |
| `training:estimateDeleteSessionsByIds` — contagens        | IPC handler | BATCH-DEL-02     |
| `training:deleteSessionsByIds` — transação                | IPC handler | BATCH-DEL-04     |
| `training:getMultiSessionDetail` — agregação              | IPC handler | BATCH-REV-02     |

### E2E obrigatórios

| Teste                                             | Req               | Ficheiro                                    |
| ------------------------------------------------- | ----------------- | ------------------------------------------- |
| Marcar/desselecionar checkbox individual          | BATCH-SEL-01      | `e2e/session-history/batch-actions.spec.ts` |
| Select-all + deselect-all                         | BATCH-SEL-02      | `e2e/session-history/batch-actions.spec.ts` |
| Barra de ações aparece/desaparece                 | BATCH-TOOL-01..03 | `e2e/session-history/batch-actions.spec.ts` |
| Remover 2 sessões (fluxo completo)                | BATCH-DEL-01..05  | `e2e/session-history/batch-actions.spec.ts` |
| Revisão múltipla: navegar entre mãos de 2 sessões | BATCH-REV-01..05  | `e2e/session-history/batch-review.spec.ts`  |
| 1 sessão → redireciona para revisão normal        | BATCH-REV-06      | `e2e/session-history/batch-review.spec.ts`  |
| Seleção preservada ao navegar páginas             | BATCH-SEL-05      | `e2e/session-history/batch-actions.spec.ts` |
| Seleção limpa ao mudar filtro                     | BATCH-SEL-06      | `e2e/session-history/batch-actions.spec.ts` |

---

## Success Criteria

- [ ] Utilizador consegue selecionar/desselecionar sessões com checkbox, e a seleção cruza páginas.
- [ ] Utilizador consegue remover N sessões em 4 cliques (Remover → preview → Remover → Confirmar).
- [ ] Utilizador consegue rever N sessões num fluxo contínuo com navegação mão a mão.
- [ ] Zero regressões no `EntityTable` existente (modo não-selecionável continua igual).
- [ ] Zero regressões na revisão de sessão única.
- [ ] Testes unitários e E2E validam todos os cenários críticos.
