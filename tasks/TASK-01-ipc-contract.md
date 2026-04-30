# TASK-01-ipc-contract

## Objetivo

Tipos DTO em `src/shared/ipc/types.ts` (se aplicável) e `window.api` no preload espelhando §6; handlers no main podem estar em stub até a Onda 2.

## Pode editar

- `src/preload/index.ts`, `src/renderer/src/env.d.ts`, `src/shared/ipc/**`, stubs em `src/main/ipc/*` apenas se necessário para compilar.

## Não deve editar

- Lógica completa de negócio (Onda 2).

## Critérios de pronto

- Renderer compila com tipos de `window.api`; canais IPC nomeados como em `CONTRACTS.md`.

## Contratos

- [docs/agents/CONTRACTS.md](../docs/agents/CONTRACTS.md)
