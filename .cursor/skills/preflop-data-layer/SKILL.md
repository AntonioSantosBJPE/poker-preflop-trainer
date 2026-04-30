---
name: preflop-data-layer
description: >-
  Camada Drizzle + SQLite no main — schema §5, transações e estatísticas.
---

# Preflop data layer

- Schema em `src/main/db/schema.ts`; migrações geradas com `pnpm db:generate`.
- `situations` + `actions` + `range_cells`: sempre transação em create/update.
- `situations:delete` é soft-delete (`is_active`).
- Sessões: `training_sessions.situation_ids_json` guarda o JSON dos IDs selecionados.

## Anti-padrões

- Não executar SQL concatenado manualmente fora do Drizzle.
- Não apagar linhas de `situations` em hard-delete se houver `session_hands` a referenciar (usar soft-delete).
