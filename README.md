# Preflop Trainer

Aplicação **desktop** multiplataforma (**Linux** e **Windows**) para treino sistemático de **ranges pré-flop** em **No-Limit Hold’em**, **cash game 6-max**. Funciona **offline**; dados e sessão ficam na máquina do utilizador (SQLite + keychain).

---

## Funcionalidades

- **Contas locais** — registo, login, sessão com JWT guardado no keychain do SO (`keytar`).
- **Situações** — CRUD com posição (UTG–BB), stack em BB, ações e ranges no **grid 13×13** (169 mãos).
- **Treino** — sessões com várias situações, número de mãos, timer opcional e feedback imediato ou ao fim da sessão.
- **Estatísticas** — resumo, evolução temporal e desempenho por situação (incl. Recharts).

---

## Stack


| Camada       | Tecnologia                                                          |
| ------------ | ------------------------------------------------------------------- |
| UI           | React 18, TypeScript, Tailwind CSS, React Router, Zustand, Recharts |
| Desktop      | Electron, [electron-vite](https://electron-vite.org/)               |
| Main / IPC   | Node.js, `contextBridge`, `ipcMain.handle`                          |
| Persistência | SQLite (`better-sqlite3`), [Drizzle ORM](https://orm.drizzle.team/) |
| Auth         | `bcryptjs`, `jsonwebtoken`, `keytar`                                |


---

## Requisitos

- **Node.js** ≥ 20  
- **pnpm** (recomendado; o projeto usa `pnpm.onlyBuiltDependencies` para módulos nativos)

Instalação de dependências com scripts de build nativos:

```bash
pnpm install
```

---

## Desenvolvimento

```bash
pnpm dev
```

Em Linux, se a janela não abrir ou o processo Electron falhar por GPU/zygote, experimente:

```bash
pnpm dev:gpu-safe
```

(é o mesmo comando com `--disable-gpu` passado ao binário do Electron).

Abre a aplicação em modo desenvolvimento (hot reload no renderer).

### Scripts úteis


| Comando             | Descrição                                                     |
| ------------------- | ------------------------------------------------------------- |
| `pnpm dev`          | Desenvolvimento                                               |
| `pnpm dev:gpu-safe` | Desenvolvimento com `--disable-gpu` (Linux com falhas de GPU) |
| `pnpm build`        | Build de produção + empacotamento (`electron-builder`)        |
| `pnpm preview`      | Pré-visualização do build                                     |
| `pnpm test`         | Testes unitários (Vitest)                                     |
| `pnpm test:e2e`     | Testes E2E (Playwright + Electron); exige `pnpm build:app`    |
| `pnpm test:e2e:ci`  | Build da app + E2E (adequado a CI)                            |
| `pnpm build:app`    | Só compila main/preload/renderer e copia migrações (sem .exe) |
| `pnpm typecheck`    | Verificação TypeScript (main + renderer)                      |
| `pnpm db:generate`  | Gera migrações Drizzle a partir do schema                     |


### Testes E2E (Playwright)

A UI corre no **Electron** (IPC + `file://`); os testes lançam `out/main/index.js` com dados de utilizador isolados (`PT_E2E_USER_DATA`) e token em ficheiro (`PT_E2E_TOKEN_FILE`, sem `keytar`).

```bash
pnpm exec playwright install   # primeira vez: browsers do Playwright
pnpm build:app
pnpm test:e2e
```

Em CI sem display gráfico (Linux): `xvfb-run -a pnpm test:e2e:ci`.

### Cursor — MCP Playwright (navegador web)

O servidor oficial **não** abre esta app Electron; serve para automatizar **sites** em Chromium. Para ativar: **Cursor Settings → MCP → Add new MCP Server** — tipo *command*, comando `npx`, argumentos `@playwright/mcp@latest` (opcional: `--headless`). Documentação: [Playwright MCP](https://playwright.dev/docs/next/getting-started-mcp).

---

## Variáveis de ambiente


| Variável             | Descrição                                                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `PREFLOP_JWT_SECRET` | Segredo para assinar JWT de sessão. **Obrigatório em produção**; em desenvolvimento existe um valor por defeito apenas para conveniência. |


---

## Dados e privacidade

- Base de dados: `preflop_trainer.db` no diretório de dados da aplicação do Electron (`app.getPath('userData')`).
- **Sem servidor** — não há envio de ranges ou estatísticas para a nuvem nesta versão.

---

## Estrutura do repositório

```
src/
├── main/           # Processo principal (Electron, DB, IPC)
│   ├── db/         # Schema Drizzle, migrações, cliente SQLite
│   └── ipc/        # Handlers IPC (auth, situações, treino, stats)
├── preload/        # `contextBridge` → `window.api`
├── renderer/       # React (páginas, componentes, stores)
└── shared/         # Tipos e lógica partilhada (ex.: poker / grid)
```

Documentação para **agentes de IA** e contratos de API: `[AGENTS.md](AGENTS.md)`, `[docs/agents/CONTRACTS.md](docs/agents/CONTRACTS.md)`, `[docs/agents/TASKS_INDEX.md](docs/agents/TASKS_INDEX.md)`.

---

## CI

O workflow em `[.github/workflows/ci.yml](.github/workflows/ci.yml)` executa testes, `typecheck` e `electron-vite build` em pull requests e pushes para `main` / `master`.

---

## Empacotamento

O ficheiro `[electron-builder.yml](electron-builder.yml)` define alvos **Linux** (AppImage e `.deb`) e **Windows** (NSIS). Os artefactos são gerados em `release/` após `pnpm build`.

Atualize no `[package.json](package.json)` os campos `**homepage`**, `**author`** e o `**maintainer**` em `electron-builder.yml` com os dados reais do projeto antes de publicar releases.

---

## Contribuir

1. Fork e branch a partir de `main`.
2. `pnpm install` → `pnpm test` → `pnpm typecheck`.
3. Pull request com descrição clara do problema ou da funcionalidade.

Para convenções e trabalho com assistentes no editor, consulte `[.cursor/rules/](.cursor/rules/)` e o índice de tasks em `[docs/agents/TASKS_INDEX.md](docs/agents/TASKS_INDEX.md)`.

---

## Licença

Este repositório ainda não inclui um ficheiro `LICENSE` na raiz. Adicione uma licença explícita (por exemplo MIT ou AGPL, conforme a tua decisão) para clarificar uso e contribuições no GitHub.