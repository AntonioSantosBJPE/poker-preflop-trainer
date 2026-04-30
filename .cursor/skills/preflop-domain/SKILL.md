---
name: preflop-domain
description: >-
  Domínio poker pré-flop NLHE 6-max — grid 13×13, combos, frequências e avaliação
  de treino. Usar ao editar src/shared/poker, lógica de treino ou UI do grid.
---

# Preflop domain

## Invariantes

- Grid: suited acima da diagonal, offsuit abaixo, pares na diagonal (ver `CONTRACTS.md`).
- Avaliação: qualquer ação com frequência > 0 na célula é aceite; fora do range implica FOLD se existir ação FOLD.
- Não inventar categorias de situação fechadas — o utilizador nomeia livremente.

## Anti-padrões

- Não colocar lógica de avaliação só no renderer (deve existir no shared + main).
- Não usar `localStorage` para sessão.

## Referências

- Especificação interna do produto §2–§3.4.
