# Contexto — UI/UX Design Refactoring

**Feature:** ui-design-refactoring
**Data:** 2026-05-03

## Introdução

A análise de código identificou 17 problemas transversais de UI/UX. Algumas decisões de design são ambíguas e precisam da tua input antes de avançarmos para design e tasks.

---

## Discussão 1: Estrutura de Página — `max-w` Consistency

**Decisão:** `max-w-6xl` em todas as páginas.

---

## Discussão 2: `gap` Spaces

**Decisão:** Unificar para `gap-6` em toda a app.

---

## Discussão 3: ConfirmActionDialog — Como Modelar a Variante Não-Destrutiva?

**Decisão:** Opção A — prop `variant: 'destructive' | 'default'` (default `destructive`).

---

## Discussão 4: Terminologia — Português Europeu vs Brasileiro

**Decisão:** "Salvar" como padrão. Normalizar "Pos." para "Posição".

---

## Discussão 5: StatsPage — Migrar Filtros para URL Search Params

**Decisão:** O padrão mais simples = URL search params (como HistoryPage). Este passa a ser o padrão do sistema. **Ação:** atualizar AGENTS.md / skill para padronizar no futuro.

---

## Discussão 6: Extrair Hooks Partilhados

**Decisão:** Hooks em `src/renderer/src/hooks/`. `useSessionTimer` usa `requestAnimationFrame`.

---

## Discussão 7: EmptyState no Dashboard — Qual o Comportamento?

**Decisão:** Opção C — banner/overlay no topo da página.

---

## Discussão 8: Breadcrumbs

**Decisão:** Opção B — em todas as páginas.

---

## Discussão 9: Prioridade dos Blocos de Implementação

**Decisão:** Ordem por complexidade crescente:

1. **C** — Terminologia (text-only, zero risco de regressão)
2. **B** — Loading/Error states (código aditivo, baixo risco)
3. **A** — Estrutura de página (alterações estruturais, risco médio)
4. **D** — Extrair lógica duplicada (refactoring, risco de regressão)
5. **E** — Restantes P2/P3
