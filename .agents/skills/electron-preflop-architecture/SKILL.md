---
name: electron-preflop-architecture
description: >-
  Arquitetura Electron + electron-vite para o Preflop Trainer — main, preload,
  renderer, build, logging, canais IPC estáveis e regras de merge ownership.
  Usar ao alterar IPC, preload, estrutura de módulos main/ipc ou build.
---

# Electron Preflop Architecture

- Estrutura: `src/main`, `src/preload`, `src/renderer`, `src/shared` (spec §4.3).
- Build: `pnpm dev` / `pnpm build`; migrações copiadas no `build` para `out/main/db/migrations`.
- Logging: `electron-log` no main (ver `src/main/index.ts`).
- Dependências nativas (`better-sqlite3`, `keytar`) externas no bundle do main (`electron.vite.config.ts`).

## IPC — canais estáveis

Alterar nomes de canais exige atualização coordenada de `preload`, `main/ipc`, `renderer` e testes.

| Domínio | Canais |
|---------|--------|
| Auth | `auth:register`, `auth:login`, `auth:logout`, `auth:me` |
| Situações | `situations:list`, `situations:get`, `situations:create`, `situations:update`, `situations:delete`, `situations:duplicate` |
| Treino | `training:startSession`, `training:getSession`, `training:dealHand`, `training:submitAnswer`, `training:finishSession`, `training:getSessionResult` |
| Estatísticas | `stats:overview`, `stats:bySituation`, `stats:timeline`, `stats:worstHands` |

**Payloads de situação** (create/update): espelhar em `window.api.situations.*` — ações identificadas por `clientKey` efémero no renderer; células referenciam `actionClientKey`.

## Merge ownership

- Módulos IPC separados: `auth.ts`, `situations.ts`, `training.ts`, `stats.ts`; `register.ts` é o agregador único.
- Evitar vários agentes a editarem o mesmo ficheiro simultaneamente.
- Migrações Drizzle: um agente por migração (ver `preflop-data-layer`).

## Anti-padrões

- Não ativar `nodeIntegration` no renderer.
- Não embutir segredos JWT em código cliente.
- Não alterar nomes de canais IPC sem atualizar preload, renderer e testes.
- Não importar módulos nativos (`better-sqlite3`, `keytar`) directamente em
  testes Vitest. O `postinstall` compila `better-sqlite3` para o ABI do Electron
  (`NODE_MODULE_VERSION 145`); o Vitest corre em Node puro (`NODE_MODULE_VERSION 127`).
  Para testes de DB: usar `drizzle-orm/sql-js` + `vi.mock('better-sqlite3')`.
  Ver `src/main/db/groups.test.ts`.
