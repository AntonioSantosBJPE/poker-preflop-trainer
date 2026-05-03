# AGENTS — Preflop Trainer

1. Antes de alterar IPC, preload, grid 13×13 ou avaliação, consultar os skills relevantes:
   - IPC e canais: skill `electron-preflop-architecture` (secção IPC).
   - Grid 13×13, enums e avaliação: skill `preflop-domain`.
2. Segurança Electron:
   - Manter `contextIsolation: true` e `nodeIntegration: false`.
   - Expor no preload apenas APIs mínimas via `contextBridge`; não expor `ipcRenderer` genérico.
   - Segredos, JWT, DB e validação final ficam no `main`; renderer não acede a Node/SQLite.
   - JWT só no keychain (`keytar`) em produção; `PT_E2E_TOKEN_FILE` é exceção exclusiva para E2E.
   - Senhas apenas com hash bcrypt (12 rounds).
3. IPC e renderer:
   - Consumir dados apenas via `window.api`; manter a API estável ao mudar canais, preload, renderer e testes.
   - `ipcMain.handle` deve ser assíncrono e propagar erros com mensagens claras.
   - Tipos partilhados de payload devem viver em `src/shared/ipc/types.ts` quando fizer sentido.
   - Respeitar as convenções do grid 13×13 (`row_index`/`col_index`, suited/offsuit) do skill `preflop-domain`.
4. Dados e persistência:
   - SQL apenas via Drizzle parametrizado; sem concatenação manual.
   - SQLite fica em `app.getPath('userData')/preflop_trainer.db`.
   - Usar transações ao criar/atualizar situação + ações + `range_cells`.
   - Situações usam soft-delete com `is_active = 0`.
5. Testes:
   - `pnpm test:unit` para ciclo rápido / CI; `pnpm test` para unitários + build + E2E local.
   - Em testes unitários de DB, não importar `better-sqlite3` diretamente; usar `drizzle-orm/sql-js` + `vi.mock('better-sqlite3')`.
6. Referências rápidas:
   - Regras detalhadas em [.cursor/rules/](.cursor/rules/).
   - Skills do projeto em [.agents/skills/](.agents/skills/).
