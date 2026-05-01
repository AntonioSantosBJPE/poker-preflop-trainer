---
name: preflop-data-layer
description: >-
  Camada Drizzle + SQLite no main — schema §5, transações, estatísticas e
  regras de migração. Usar ao alterar schema, migrações ou queries de dados.
---

# Preflop data layer

- Schema em `src/main/db/schema.ts`; migrações geradas com `pnpm db:generate`.
- `situations` + `actions` + `range_cells`: sempre transação em create/update.
- `situations:delete` é soft-delete (`is_active`).
- Sessões: `training_sessions.situation_ids_json` guarda o JSON dos IDs selecionados.

## Migrações

- **Um agente por migração** — nunca dois agentes a gerar migrações em paralelo sem fila explícita acordada.
- Migrações copiadas no build para `out/main/db/migrations` (gerido pelo build do electron-vite).

## Anti-padrões

- Não executar SQL concatenado manualmente fora do Drizzle.
- Não apagar linhas de `situations` em hard-delete se houver `session_hands` a referenciar (usar soft-delete).
