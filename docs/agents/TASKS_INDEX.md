# Índice de tasks (multi-agente)

Ordem sugerida por **ondas**. Dentro de cada onda, tasks podem correr em paralelo se respeitarem os ficheiros permitidos em cada `tasks/TASK-*.md` e o [CONTRACTS.md](./CONTRACTS.md).

| Onda | Tasks | Notas |
|------|--------|--------|
| 0 | [TASK-00-scaffold](../tasks/TASK-00-scaffold.md), [TASK-00-cursor-infra](../tasks/TASK-00-cursor-infra.md) | Paralelo |
| 0b | Contratos | Completar [CONTRACTS.md](./CONTRACTS.md) antes da onda 1 |
| 1 | [TASK-01-shared-poker](../tasks/TASK-01-shared-poker.md), [TASK-01-drizzle-db](../tasks/TASK-01-drizzle-db.md), [TASK-01-ipc-contract](../tasks/TASK-01-ipc-contract.md) | Paralelo após CONTRACTS |
| 2 | [TASK-02-main-auth](../tasks/TASK-02-main-auth.md), [TASK-02-main-situations](../tasks/TASK-02-main-situations.md), [TASK-02-main-training-stats](../tasks/TASK-02-main-training-stats.md) | Paralelo; depois [TASK-02-merge-ipc](../tasks/TASK-02-merge-ipc.md) se necessário |
| 3 | [TASK-03-renderer-auth-routing](../tasks/TASK-03-renderer-auth-routing.md), [TASK-03-renderer-grid](../tasks/TASK-03-renderer-grid.md), [TASK-03-renderer-situations](../tasks/TASK-03-renderer-situations.md), [TASK-03-renderer-training-stats](../tasks/TASK-03-renderer-training-stats.md) | Paralelo máximo grid vs auth |
| 4 | [TASK-04-packaging-ci](../tasks/TASK-04-packaging-ci.md), [TASK-04-qa-manual-checklist](../tasks/TASK-04-qa-manual-checklist.md) | CI + QA manual |

## Estado do repositório

A implementação base já cobre MVP funcional; as tasks acima servem para **refinos**, novos agentes ou regressões. Ajuste os critérios de pronto em cada task conforme o diff atual.
