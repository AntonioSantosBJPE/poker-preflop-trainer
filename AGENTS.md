# AGENTS — Preflop Trainer

1. Antes de alterar IPC, grid ou avaliação, consultar os skills relevantes:
   - IPC e canais: skill `electron-preflop-architecture` (secção IPC).
   - Grid 13×13, enums e avaliação: skill `preflop-domain`.
2. Seguir regras em [.cursor/rules/](.cursor/rules/); skills do projeto em [.agents/skills/](.agents/skills/).
3. Não expor segredos no renderer; DB e JWT apenas no `main`.
4. Testes: **`pnpm test:unit`** (rápido / CI); **`pnpm test`** (unitários + build + E2E local).
