# Spec: Correções de Regressão de UI (Select + Menu Ativo)

**Feature:** UI-REGRESSIONS-SELECT-NAV  
**Data:** 2026-05-02  
**Âmbito:** Corrigir duas regressões visuais/comportamentais introduzidas na UI: itens transparentes no `Select` (tema claro e escuro) e estado ativo incorreto no menu ao abrir "Treino Simultâneo".

---

## Problem Statement

Há duas regressões de UX que afetam diretamente navegação e uso de formulários:

1. os itens de seleção do `Select` (shadcn) aparecem transparentes e não utilizáveis em ambos os temas;
2. ao entrar na página de treino simultâneo, o menu "Treino" também permanece destacado como ativo.

Estas falhas reduzem usabilidade básica e geram ambiguidade de contexto na navegação.

---

## Goals

- [ ] Garantir que todos os itens de `Select` sejam legíveis e clicáveis nos temas claro e escuro.
- [ ] Garantir que apenas uma secção de treino fique ativa no menu por rota (sem dupla seleção visual).
- [ ] Preservar o comportamento atual de navegação e seleção sem regressões em outras páginas.

---

## Out of Scope

| Item                                              | Reason                                                       |
| ------------------------------------------------- | ------------------------------------------------------------ |
| Redesign completo do sistema de temas             | O escopo é correção de regressão, não rebranding visual      |
| Troca da biblioteca shadcn/radix para outro stack | Correção deve manter os componentes e padrões já adotados    |
| Refatoração ampla de roteamento                   | Apenas ajuste da lógica de estado ativo no menu de navegação |

---

## User Stories

### P1: Itens do Select visíveis e interativos em ambos os temas ⭐ MVP

**User Story:** Como utilizador, quero ver e selecionar claramente os itens dos dropdowns para conseguir configurar fluxos sem bloqueio visual.

**Why P1:** O `Select` é componente base de múltiplos fluxos; a regressão impede uso normal da aplicação.

**Acceptance Criteria:**

1. WHEN o utilizador abre qualquer `Select` THEN o sistema SHALL renderizar itens com contraste visível (texto e fundo) no tema claro.
2. WHEN o utilizador abre qualquer `Select` THEN o sistema SHALL renderizar itens com contraste visível (texto e fundo) no tema escuro.
3. WHEN o utilizador passa o rato/foca um item THEN o sistema SHALL aplicar estado de hover/focus legível em ambos os temas.
4. WHEN o utilizador clica num item THEN o sistema SHALL selecionar o valor e fechar o dropdown normalmente.

**Independent Test:** Abrir selects nas páginas de treino e treino simultâneo nos temas claro/escuro, selecionar opções e validar legibilidade + mudança de valor.

---

### P1: Menu destaca apenas a secção correta na rota de Treino Simultâneo ⭐ MVP

**User Story:** Como utilizador, quero que o menu destaque apenas a secção da página atual para saber exatamente onde estou na aplicação.

**Why P1:** Dupla seleção ("Treino" + "Treino Simultâneo") cria confusão de contexto e sinaliza estado de navegação incorreto.

**Acceptance Criteria:**

1. WHEN o utilizador navega para a rota de "Treino Simultâneo" THEN o sistema SHALL marcar apenas "Treino Simultâneo" como ativo.
2. WHEN o utilizador está em rotas de treino normal THEN o sistema SHALL marcar apenas "Treino" como ativo.
3. WHEN o utilizador alterna entre "Treino" e "Treino Simultâneo" THEN o sistema SHALL atualizar o estado ativo sem manter seleção residual.

**Independent Test:** Navegar entre páginas de treino normal e treino simultâneo e validar visualmente que só um item do menu fica ativo por vez.

---

## Edge Cases

- WHEN a aplicação inicia diretamente numa rota profunda de treino simultâneo (deep link) THEN o sistema SHALL refletir estado ativo correto no primeiro render.
- WHEN o tema é alternado com dropdown aberto THEN o sistema SHALL manter legibilidade dos itens sem ficar transparente.
- WHEN existem múltiplos `Select` na mesma página THEN o sistema SHALL aplicar o mesmo comportamento visual consistente em todos.

---

## Requirement Traceability

| Requirement ID | Story                                                                | Phase  | Status |
| -------------- | -------------------------------------------------------------------- | ------ | ------ |
| UIR-01         | P1: Renderizar itens do Select com contraste legível no tema claro   | Design | Done   |
| UIR-02         | P1: Renderizar itens do Select com contraste legível no tema escuro  | Design | Done   |
| UIR-03         | P1: Estados hover/focus legíveis para itens do Select                | Design | Done   |
| UIR-04         | P1: Seleção de item permanece funcional após correção visual         | Design | Done   |
| UIR-05         | P1: Em "Treino Simultâneo", apenas menu correspondente fica ativo    | Design | Done   |
| UIR-06         | P1: Em treino normal, apenas "Treino" fica ativo                     | Design | Done   |
| UIR-07         | P1: Transição entre rotas de treino não mantém estado ativo residual | Design | Done   |

**Coverage:** 7 total, 7 done, 0 pending.

---

## Success Criteria

- [x] Em tema claro e escuro, nenhum item de `Select` aparece transparente.
- [x] O utilizador consegue selecionar opções em todos os `Select` afetados sem ambiguidade visual.
- [x] O menu nunca apresenta "Treino" e "Treino Simultâneo" ativos ao mesmo tempo.
- [x] Regressão coberta por testes (unit/E2E) para evitar reintrodução futura.
