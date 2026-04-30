# TASK-02-merge-ipc

## Objetivo

Garantir que todos os handlers IPC ficam registados em `register.ts` (ou padrão equivalente) sem duplicação de canais.

## Pode editar

- `src/main/ipc/register.ts` apenas, salvo conflitos mínimos de imports.

## Critérios de pronto

- Arranque da app regista todos os módulos; não há `handle` duplicado no mesmo canal.

## Contratos

- [docs/agents/CONTRACTS.md](../docs/agents/CONTRACTS.md)
