---
name: preflop-e2e-playwright
description: >-
  Testes E2E deste repo com Playwright + Electron (_electron.launch), fixtures
  PT_E2E_* e convenções da pasta e2e/. Usar ao criar ou alterar *.spec.ts.
---

# E2E — Preflop Trainer (Playwright + Electron)

## Pré-requisitos

- Correr **`pnpm build:app`** antes de `pnpm test:e2e` (o fixture falha se `out/main/index.js` não existir). **`pnpm test:e2e:ci`** faz build + E2E; **`pnpm test`** (local) corre Vitest e depois `test:e2e:ci` — suíte completa.
- O workflow em **GitHub Actions** usa apenas **`pnpm test:unit`** (sem Playwright); validação E2E é local ou pipeline dedicado.
- Primeira vez: `pnpm exec playwright install` (ver [README](../../../README.md)).

## Arranque e isolamento

- Fixture em [`e2e/fixtures.ts`](../../../e2e/fixtures.ts): lança o processo Electron com `args: [mainJs]`, `cwd` na raiz do repo.
- Variáveis **`PT_E2E_USER_DATA`** e **`PT_E2E_TOKEN_FILE`**: base de dados e JWT isolados por teste (sem `keytar`). Não substituir por `storageState` de browser sem adaptar o fluxo de auth.

## Convenções

- Ficheiros de teste: **`e2e/**/*.spec.ts`**.
- Helpers partilhados: **`e2e/helpers/`** (auth, situação, treino).
- Locators: preferir **`getByRole`**, **`getByLabel`** (alinhado à UI em português).
- Enums e semântica de grid / ações: skill `preflop-domain` (secções Grid 13×13 e Ações pré-flop).

## Boas práticas Playwright genéricas

- Instalar localmente (opcional): `npx skills add https://github.com/devinschumacher/skills --skill playwright -y` — gera **`.agents/skills/playwright`** com referências a POM, fixtures, CI e depuração do `@playwright/test`. Pasta **`.agents/`** está no `.gitignore`; cada clone pode voltar a instalar a skill se precisar do contexto extra no agente.

## Comandos

```bash
pnpm build:app && pnpm test:e2e
pnpm test:e2e:ci
pnpm test
```

Linux sem display: `xvfb-run -a pnpm test:e2e:ci` ou `xvfb-run -a pnpm test` (suíte completa).

## Paralelismo

A suite corre com **`fullyParallel: true`** e **`workers: 2`** em local (1 em CI).

**Isolamento já garantido pelo fixture:** cada `test()` lança um processo Electron próprio com `userData` e `tokenFile` em directórios temporários distintos (`mkdtempSync`). Não há estado global partilhado entre testes.

**Regra de unicidade de credenciais:** `uniqueUserCredentials()` e `uniqueSituationName()` em `e2e/helpers/credentials.ts` usam `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` como semente, garantindo colisões impossíveis mesmo com múltiplos workers a gerar credenciais no mesmo milissegundo.

**Para aumentar workers** (ex: pipeline E2E dedicado): ajustar `playwright.config.ts`. Não há limitação no código da app que force um máximo — o limite prático é a carga de CPU/RAM de ter N processos Electron simultâneos e disponibilidade de display (Xvfb ou nativo).

**Não usar `test.describe.serial()`** salvo dependência de estado entre testes no mesmo `describe` comprovada — o padrão é cada teste criar o seu próprio contexto via helpers (`registerAccount`, `createSituationMinimal`, etc.).
