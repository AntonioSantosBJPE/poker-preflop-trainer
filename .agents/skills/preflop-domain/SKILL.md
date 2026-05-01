---
name: preflop-domain
description: >-
  Domínio completo do Preflop Trainer: visão geral do produto, estrutura de mesa
  6-max (UTG→BB), grid 13×13, ações pré-flop canónicas (FOLD/CALL/RAISE_OPEN/
  RAISE_3BET/RAISE_4BET/ALL_IN), tipos de situação, regras de avaliação e
  invariantes de implementação. Usar ao editar src/shared/poker, lógica de
  treino, UI do grid, ou ao implementar/validar qualquer funcionalidade de domínio
  do poker pré-flop.
---

# Preflop Trainer — Domínio

## 1. Visão geral do produto

Aplicação desktop cross-platform (Electron) para treino deliberado de ranges pré-flop em **Cash Game NLHE 6-Max**. Funciona 100% offline; dados persistem em SQLite local.

**Módulos principais:**
- **Situações** — CRUD de cenários pré-flop com ranges no grid 13×13.
- **Treino** — sessões com cartas sorteadas, timer configurável e feedback imediato ou ao fim.
- **Estatísticas** — acerto, tempo de decisão, evolução histórica por situação.

**Fora do MVP (não implementar na v1):** import/export JSON, sync cloud, import solver, multiplayer.

---

## 2. Mesa 6-Max

| Sigla | Nome | Observação |
|-------|------|-----------|
| UTG | Under the Gun | Primeiro a agir pré-flop. Range mais fechado. |
| HJ | Hijack | Segunda posição. Range levemente mais amplo. |
| CO | Cutoff | Terceira posição. Range bastante amplo. |
| BTN | Button | Dealer. Range mais amplo; posição privilegiada. |
| SB | Small Blind | Posta metade do BB. Age por último pré-flop, primeiro pós-flop. |
| BB | Big Blind | Posta o BB. Possui closing action pré-flop. |

Enum canónico: `UTG | HJ | CO | BTN | SB | BB`.

---

## 3. Grid 13×13

169 mãos não-isomórficas do Texas Hold'em. Índices `row_index`, `col_index` ∈ [0,12]; **0 = Ás**, 12 = 2.

| Região | Condição | Tipo |
|--------|----------|------|
| Diagonal principal | `row_index === col_index` | Pares (AA→22) |
| Triângulo superior | `row_index < col_index` | Suited (s) |
| Triângulo inferior | `row_index > col_index` | Offsuit (o) |

`frequency` ∈ [0,1] por célula por ação. Célula omissa = frequência 0.

---

## 4. Ações pré-flop

| Ação | Código interno | Descrição |
|------|---------------|-----------|
| Fold | `FOLD` | Desistir da mão. |
| Call | `CALL` | Igualar a aposta vigente. |
| Open Raise | `RAISE_OPEN` | Primeira aposta (ex: 2.5BB, 3BB). |
| 3-Bet | `RAISE_3BET` | Re-raise sobre um open (ex: 8–10BB). |
| 4-Bet | `RAISE_4BET` | Re-raise sobre um 3-bet (ex: 22–25BB). |
| All-in | `ALL_IN` | Stack total; usado em situações short-stack. |

Enum canónico: `FOLD | CALL | RAISE_OPEN | RAISE_3BET | RAISE_4BET | ALL_IN`.

## 4.1 Outros enums canónicos

| Enum | Valores |
|------|---------|
| `feedback_mode` | `IMMEDIATE` \| `END_OF_SESSION` |
| `card*_suit` | `s` \| `h` \| `d` \| `c` |
| `card*_rank` | `A` `K` `Q` `J` `T` `9` `8` `7` `6` `5` `4` `3` `2` |

---

## 5. Tipos de situação

Cada situação é uma combinação de posição do herói, ações anteriores e stack efetivo. **O utilizador nomeia livremente** — não há categorias fixas. Exemplos ilustrativos:

- BTN Open em Gap (sem ações anteriores)
- UTG / HJ / CO Open em Gap
- SB vs BB (todos os outros foldaram)
- BTN 3-bet vs UTG Open
- CO 3-bet vs HJ Open
- BB Defend vs BTN Open (call / 3-bet / fold)
- UTG 4-bet vs BTN 3-bet

---

## 6. Regras de avaliação de treino

1. Para a célula da mão sorteada, **qualquer ação com `frequency > 0` é aceite** (estratégia mista).
2. Se **nenhuma** ação tem frequência > 0: a resposta correta é `FOLD` explícito da situação, se existir; caso contrário, é erro de configuração (prevenir na validação de criação de situação).
3. **Timeout** (`timedOut: true`) → sempre incorreto; `chosen_action_id` fica `NULL` em `session_hands`.

---

## 7. Invariantes de implementação

- Lógica de avaliação deve existir em `src/shared/poker` **e** validada no main — nunca só no renderer.
- Situações apagadas são **soft-delete** (`is_active = false`); nunca hard-delete se existirem `session_hands` a referenciar.
- `training_sessions.situation_ids_json` guarda JSON dos IDs selecionados.
- Não inventar categorias de situação fechadas; o utilizador nomeia livremente.
- Consultas SQL exclusivamente via Drizzle com parâmetros (sem concatenação).

---

## 8. Anti-padrões

- Não colocar lógica de avaliação só no renderer.
- Não usar `localStorage` para sessão ou JWT.
- Não fazer hard-delete de `situations` com `session_hands` associadas.
- Não inventar `action_type` fora do enum canónico.

---

## Referências

- [`src/main/db/schema.ts`](src/main/db/schema.ts) — schema Drizzle.
- [`src/shared/poker`](src/shared/poker) — lógica de domínio partilhada.
