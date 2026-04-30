---
name: electron-preflop-architecture
description: >-
  Arquitetura Electron + electron-vite para o Preflop Trainer — main, preload,
  renderer, build e logging.
---

# Electron Preflop Architecture

- Estrutura: `src/main`, `src/preload`, `src/renderer`, `src/shared` (spec §4.3).
- Build: `pnpm dev` / `pnpm build`; migrações copiadas no `build` para `out/main/db/migrations`.
- Logging: `electron-log` no main (ver `src/main/index.ts`).
- Dependências nativas (`better-sqlite3`, `keytar`) externas no bundle do main (`electron.vite.config.ts`).

## Anti-padrões

- Não ativar `nodeIntegration` no renderer.
- Não embutir segredos JWT em código cliente.
