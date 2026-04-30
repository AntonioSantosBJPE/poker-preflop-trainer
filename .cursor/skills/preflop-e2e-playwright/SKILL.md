---
name: preflop-e2e-playwright
description: >-
  Testes E2E deste repo com Playwright + Electron (_electron.launch), fixtures
  PT_E2E_* e convenções da pasta e2e/. Usar ao criar ou alterar *.spec.ts.
---

# E2E — Preflop Trainer (Playwright + Electron)

## Pré-requisitos

- Correr **`pnpm build:app`** antes de `pnpm test:e2e` (o fixture falha se `out/main/index.js` não existir). Em CI usar **`pnpm test:e2e:ci`**.
- Primeira vez: `pnpm exec playwright install` (ver [README](../../../README.md)).

## Arranque e isolamento

- Fixture em [`e2e/fixtures.ts`](../../../e2e/fixtures.ts): lança o processo Electron com `args: [mainJs]`, `cwd` na raiz do repo.
- Variáveis **`PT_E2E_USER_DATA`** e **`PT_E2E_TOKEN_FILE`**: base de dados e JWT isolados por teste (sem `keytar`). Não substituir por `storageState` de browser sem adaptar o fluxo de auth.

## Convenções

- Ficheiros de teste: **`e2e/**/*.spec.ts`**.
- Helpers partilhados: **`e2e/helpers/`** (auth, situação, treino).
- Locators: preferir **`getByRole`**, **`getByLabel`** (alinhado à UI em português).
- Enums e semântica de grid / ações: [`docs/agents/CONTRACTS.md`](../../../docs/agents/CONTRACTS.md).

## Boas práticas Playwright genéricas

- Instalar localmente (opcional): `npx skills add https://github.com/devinschumacher/skills --skill playwright -y` — gera **`.agents/skills/playwright`** com referências a POM, fixtures, CI e depuração do `@playwright/test`. Pasta **`.agents/`** está no `.gitignore`; cada clone pode voltar a instalar a skill se precisar do contexto extra no agente.

## Comandos

```bash
pnpm build:app && pnpm test:e2e
pnpm test:e2e:ci
```

Linux sem display: `xvfb-run -a pnpm test:e2e:ci`.

## Paralelismo

Manter **`workers: 1`** em [`playwright.config.ts`](../../../playwright.config.ts) salvo isolamento comprovado entre várias instâncias Electron.
