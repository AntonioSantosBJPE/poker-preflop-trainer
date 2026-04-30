# Contratos entre agentes (Preflop Trainer)

Documento normativo para tarefas paralelas. Alterações aqui exigem atualização coordenada de `preload`, `main/ipc`, `renderer` e testes.

## Enums e strings canónicas

- **Posição (`position`)**: `UTG` | `HJ` | `CO` | `BTN` | `SB` | `BB`
- **`action_type`**: `FOLD` | `CALL` | `RAISE_OPEN` | `RAISE_3BET` | `RAISE_4BET` | `ALL_IN`
- **`feedback_mode`**: `IMMEDIATE` | `END_OF_SESSION`
- **Naipes (`card*_suit`)**: `s` | `h` | `d` | `c`
- **Ranks (`card*_rank`)**: `A` `K` `Q` `J` `T` `9` … `2`

## Grid 13×13 (persistência `range_cells`)

- `row_index`, `col_index` ∈ [0,12]; **0 = Ás** (maior); 12 = 2 (menor).
- **Par**: `row_index === col_index`.
- **Suited**: `row_index < col_index` (triângulo superior, excluindo diagonal).
- **Offsuit**: `row_index > col_index` (triângulo inferior).
- `frequency` ∈ [0,1]; omissão de célula para uma ação = 0 combos dessa ação na célula.

## Avaliação de treino (§3.4.3)

- Para a célula da mão sorteada, considerar todas as ações com `frequency > 0` como **corretas** (estratégia mista).
- Se **nenhuma** ação tiver frequência > 0 na célula: a resposta correta é a ação **FOLD** explícita da situação, se existir; caso contrário, tratar como erro de configuração (evitar na validação de criação).
- **Timeout**: `timedOut: true` → incorreto; `chosen_action_id` em `session_hands` fica `NULL`.

## IPC (nomes estáveis)

Autenticação: `auth:register`, `auth:login`, `auth:logout`, `auth:me`  
Situações: `situations:list`, `situations:get`, `situations:create`, `situations:update`, `situations:delete`, `situations:duplicate`  
Treino: `training:startSession`, `training:getSession`, `training:dealHand`, `training:submitAnswer`, `training:finishSession`, `training:getSessionResult`  
Estatísticas: `stats:overview`, `stats:bySituation`, `stats:timeline`, `stats:worstHands`

Payloads de situação (create/update): ver implementação e espelhar em `window.api.situations.*` — ações identificadas por `clientKey` efémero no renderer; células referenciam `actionClientKey`.

## Merge ownership

- Evitar vários agentes a editarem o mesmo ficheiro: módulos IPC separados (`auth.ts`, `situations.ts`, `training.ts`, `stats.ts`) + `register.ts` como agregador único.
- Migrações Drizzle: um agente por migração ou fila explícita no `TASKS_INDEX.md`.

## Fora do MVP (não implementar na v1)

Import/export JSON, sync cloud, import solver, multiplayer (roadmap §9).
