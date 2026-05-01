# Editor de situação — cobertura implícita em fold e grid de range maior

## Problem Statement

No fluxo de criar ou editar uma situação, o utilizador pinta combos no grid 13×13 por ação. As células não pintadas ficam visualmente “vazias”, mas **não são persistidas** como fold na base de dados — o treino e a avaliação esperam um range completo por situação. Isto obriga o utilizador a pintar manualmente todo o complemento como fold ou deixa o modelo de dados incompleto relativamente ao tabuleiro completo.

Em paralelo, o componente de seleção de range (`RangeGrid13`) usa células e tipografia pequenas (`~28px` de altura, etiquetas ~7px), o que **dificulta identificar** qual o combo e a cor da ação activa, especialmente em ecrãs normais ou com pouca acuidade visual.

## Goals

- [x] Ao guardar uma situação (criar ou editar), **toda a grelha 13×13** de combinações válidas SHALL ter pelo menos uma entrada em `range_cells` após normalização, sendo as células sem pintura atribuídas à ação de **fold** (`action_type = FOLD`).
- [x] O editor de range SHALL apresentar células e legendas com **tamanho mínimo maior**, mantendo legibilidade e usabilidade (selecção e pintura) sem regressões de layout grave no formulário.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Alterar regras de domínio do grid (mapeamento row/col, suited/offsuit) | Invariantes em `preflop-domain`; fora deste ajuste |
| Frequências mistas por célula para “fold parcial” | Comportamento actual de multi-acção por célula mantém-se; fold implícito é célula inteiramente não pintada |
| Novo tipo de acção ou migração de schema SQL | Apenas lógica de payload/persistência e UI |
| Export/import de ranges | Não solicitado |

---

## User Stories

### P1: Persistir células não pintadas como fold ⭐ MVP

**User Story**: Como jogador, quero que os combos que deixo em branco no editor sejam guardados como fold, para que o meu range corresponda ao tabuleiro completo sem ter de pintar manualmente todo o fold.

**Why P1**: Corrige o modelo mental “vazio = fold” e alinha a BD com o grid completo usado no treino.

**Acceptance Criteria**:

1. WHEN o utilizador submete o formulário de criar ou editar situação com sucesso THEN o sistema SHALL garantir que **cada** par `(rowIndex, colIndex)` do grid 13×13 tem pelo menos uma entrada em `rangeCells` após normalização (mantendo-se o comportamento actual de **várias** entradas na mesma célula quando o utilizador define misturas com frequências).
2. WHEN uma célula `(rowIndex, colIndex)` não tem **qualquer** entrada em `rangeCells` no editor antes do guardar THEN o sistema SHALL acrescentar (ou equivalente na persistência) uma entrada com frequência total para fold associada à acção cujo `actionType` é `FOLD` (após mapeamento `clientKey` → id na gravação).
3. WHEN existe exactamente uma acção `FOLD` na lista de acções THEN o sistema SHALL usar essa acção para todas as células não pintadas.
4. WHEN existem zero acções `FOLD` na lista THEN o sistema SHALL rejeitar o guardar com mensagem de validação clara (ex.: obrigar pelo menos uma acção do tipo fold), **ou** SHALL garantir fold por convenção documentada na implementação — **preferência**: validação explícita na mesma camada que já valida o payload (`situationPayloadSchema` / IPC), sem criar acções ocultas.
5. WHEN existem duas ou mais acções `FOLD` THEN o sistema SHALL definir uma regra determinística (ex.: primeira por `sortOrder`) e documentá-la em código/comentário mínimo; a UI por defeito já evita duplicar fold — se o utilizador duplicar manualmente, o comportamento não pode ser ambíguo.

**Independent Test**: Criar situação com apenas uma parte do range pintada para raise; guardar; ler da BD ou reabrir o editor — todas as células não pintadas aparecem como fold (cor/atribuição da acção fold).

---

### P1: Aumentar o tamanho do quadro de seleção de range ⭐ MVP

**User Story**: Como jogador, quero um grid de range maior e mais legível, para distinguir rapidamente os combos e as cores das acções ao editar o range.

**Why P1**: Melhora directa na usabilidade do editor; não depende de alterações de domínio.

**Acceptance Criteria**:

1. WHEN o utilizador visualiza o editor de situação THEN o componente de grid (`RangeGrid13` ou sucessor) SHALL usar **altura mínima por célula** perceptivelmente maior que o estado actual (referência de baseline: `h-7` / ~28px — alvo sugerido na implementação: ≥ 36px ou equivalente responsivo até um máximo que preserve o formulário).
2. WHEN o utilizador visualiza os rótulos de rank (linhas/colunas) THEN o texto SHALL ser legível sem ampliação extrema do browser (aumentar relativamente a `text-[7px]`/`text-[10px]` actuais).
3. WHEN o utilizador usa rato ou trackpad para pintar THEN a área clicável SHALL acompanhar o aumento da célula (sem “hotspot” menor que o botão visível).
4. WHEN a largura disponível é reduzida (viewport estreito) THEN o grid SHALL continuar utilizável (scroll horizontal permitido ou escala mínima coerente com o design system `preflop-design`, sem sobrepor o resto do formulário).

**Independent Test**: Abrir “Nova situação” ou “Editar situação”; comparar visualmente com baseline — combos e cores identificáveis à distância confortável; smoke E2E opcional: selector `data-testid="range-grid-13"` continua presente.

---

## Edge Cases

- WHEN o utilizador apaga todas as pinturas com Alt+botão direito THEN após guardar SHALL todas as células normalizadas para fold (desde que exista acção `FOLD`).
- WHEN o payload inclui frequências fraccionadas ou múltiplas acções na mesma célula (comportamento actual de mistura) THEN a regra de “não pintada = fold” SHALL aplicar-se apenas a células **sem** qualquer entrada em `rangeCells` antes da normalização — não sobrescrever células já pintadas.
- WHEN editar situação legada com buracos na BD THEN ao próximo guardar, a normalização SHALL preencher buracos como fold (comportamento desejado de “reparar” ao editar).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| SRANGE-01 | P1: Fold implícito | Implementação | Done |
| SRANGE-02 | P1: Fold implícito (validação FOLD única / determinística) | Implementação | Done |
| SRANGE-03 | P1: Grid maior (células e rótulos) | Implementação | Done |
| SRANGE-04 | P1: Grid responsivo / usabilidade | Implementação | Done |

**Coverage:** 4 requisitos; mapear para `tasks.md` quando a fase Tasks for aberta.

---

## Success Criteria

- [ ] Guardar uma situação com range parcialmente pintado produz `range_cells` que cobrem todas as 169 células do grid 13×13, com não pintadas → `action_id` da acção fold.
- [ ] Testes automatizados cobrem normalização (unitário em `shared` ou `main`, conforme onde for aplicada a regra) e regressão do schema de payload.
- [x] Revisão visual: grid claramente maior que o estado actual; feedback do utilizador-alvo (opcional) ou checklist interno de acessibilidade básica (contraste já definido em design system).

---

## Notas de implementação (não normativas)

- Pontos prováveis no código actual: `SituationEditPage.tsx` (`onValid` / construção do payload), `situationPayloadSchema` em `src/shared/forms/situationSchemas.ts`, persistência em `src/main/ipc/situations.ts` / camada DB; UI em `src/renderer/src/components/grid/RangeGrid13.tsx` (`h-7`, `text-[7px]`).
- A normalização pode ocorrer no **renderer** antes de `safeParse`, no **shared** como função pura testada, ou no **main** antes da transação — preferir um único sítio documentado para evitar divergência create vs update.
