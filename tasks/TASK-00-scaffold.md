# TASK-00-scaffold

## Objetivo

Inicializar o projeto Electron com **electron-vite**, React 18, TypeScript, Tailwind, estrutura de pastas da spec §4.3, `BrowserWindow` seguro e preload com `contextBridge`.

## Pode editar

- `package.json`, `electron.vite.config.ts`, `tsconfig*.json`, `tailwind.config.js`, `postcss.config.js`, `vitest.config.ts`, `drizzle.config.ts`, `src/main/index.ts` (shell), `src/preload/index.ts` (stub), `src/renderer/`** mínimo para arrancar.

## Não deve editar

- `docs/agents/`*, `.cursor/`*, `tasks/*` (outro agente na Onda 0).

## Critérios de pronto

- `pnpm dev` abre janela; `pnpm exec electron-vite build` compila sem erros.
- `contextIsolation` + `nodeIntegration: false` + preload definido.

## Referência

- [docs/agents/CONTRACTS.md](../docs/agents/CONTRACTS.md) (apenas leitura nesta task).