# TASK-01-drizzle-db

## Objetivo

Schema SQLite §5.2 com Drizzle, migrações, `initDatabase()` no main apontando para `userData`, WAL e `migrate()`.

## Pode editar

- `src/main/db/**`, `drizzle.config.ts`, scripts `package.json` relacionados a `db:*`.

## Não deve editar

- Handlers IPC (outra task), renderer.

## Critérios de pronto

- `pnpm db:generate` produz SQL; arranque da app aplica migrações sem erro em DB limpa.

## Contratos

- [docs/agents/CONTRACTS.md](../docs/agents/CONTRACTS.md)
