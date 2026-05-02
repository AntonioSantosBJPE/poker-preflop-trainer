# Tasks: Actualização de Dependências

**Feature:** DEP-UPGRADE  
**Spec:** [spec.md](spec.md)  
**Data:** 2026-05-01

---

## Estratégia de Faseamento

As actualizações são agrupadas em 5 fases por afinidade e risco crescente. Cada fase termina com um gate de validação antes de avançar para a seguinte.

```
Fase 1: Patch / Minor seguros       → risco BAIXO  (sem breaking)
Fase 2: Utilitários médios          → risco MÉDIO  (breaking circunscrito)
Fase 3: Build toolchain ALTO        → risco ALTO   (Vite stack, TypeScript, Tailwind)
Fase 4: Electron core               → risco CRÍTICO (Electron + electron-vite + builder)
Fase 5: React ecosystem             → risco CRÍTICO (React 19 + Router 7 + tipos)
```

---

## FASE 1 — Patch / Minor seguros

**Objectivo:** Apanhar todas as actualizações de patch e minor sem breaking changes.  
**Risco:** BAIXO  
**Req cobertos:** R-01, R-07

### T-1.1 — Actualizar pacotes patch/minor

**O quê:** Actualizar os seguintes pacotes para a versão mais recente:

- `@fontsource/fraunces` 5.2.8 → 5.2.9
- `postcss` 8.5.12 → 8.5.13
- `@playwright/test` 1.49.1 → 1.59.1
- `drizzle-kit` 0.30.6 → 0.31.10
- `eslint-plugin-react-refresh` 0.4.26 → 0.5.2

**Onde:** `package.json` + lockfile

**Comando:**

```bash
pnpm add @fontsource/fraunces@latest postcss@^8 @playwright/test@^1 drizzle-kit@latest eslint-plugin-react-refresh@latest
```

**Done when:**

- `pnpm outdated` não mostra estes pacotes
- `pnpm typecheck` passa
- `pnpm test:unit` passa

**Gate:** Quick (`pnpm test:unit && pnpm typecheck`)

---

## FASE 2 — Utilitários médios

**Objectivo:** Actualizar dependências com breaking changes circunscritos.  
**Risco:** MÉDIO  
**Req cobertos:** R-01, R-04

### T-2.1 — Actualizar drizzle-orm

**O quê:** `drizzle-orm` 0.38.4 → 0.45.x  
**Atenção:** Semver < 1.0 — rever changelog entre 0.38 e 0.45 antes de aplicar. Verificar se queries existentes e migrações compilam sem erros.

**Onde:** `package.json`, todos os ficheiros que importam de `drizzle-orm`

**Comando:**

```bash
pnpm add drizzle-orm@latest
```

**Done when:**

- `pnpm typecheck` passa sem erros em `src/main/db/`
- `pnpm test:unit` passa (testes de DB)

**Gate:** Quick

---

### T-2.2 — Actualizar bcryptjs para v3 e remover @types/bcryptjs

**O quê:** `bcryptjs` 2.4.3 → 3.0.3; `@types/bcryptjs` removido (deprecated, v3 inclui tipos)  
**Atenção:** Verificar se a API `bcryptjs` v3 mantém `bcrypt.hash()` e `bcrypt.compare()` com mesmas assinaturas.

**Onde:** `package.json`, `src/main/` (módulo de auth)

**Comandos:**

```bash
pnpm add bcryptjs@^3
pnpm remove @types/bcryptjs
```

**Done when:**

- `pnpm typecheck` passa no módulo de auth
- `pnpm test:unit` passa nos testes de autenticação

**Gate:** Quick

---

### T-2.3 — Actualizar @types/node para v25

**O quê:** `@types/node` 22.x → 25.x  
**Atenção:** Node runtime mantém-se 22 LTS; apenas os tipos mudam. Pode expor novos erros TS em uso de APIs Node.

**Comando:**

```bash
pnpm add -D @types/node@^25
```

**Done when:**

- `pnpm typecheck` passa em `src/main/` e `src/preload/`

**Gate:** Quick

---

### T-2.4 — Actualizar eslint para v10 e plugins ESLint

**O quê:** `eslint` 9.x → 10.x; `eslint-plugin-react-hooks` 5.x → 7.x  
**Atenção:** ESLint 10 pode deprecar ou remover regras; verificar `eslint.config.*` após upgrade.

**Comando:**

```bash
pnpm add -D eslint@^10 eslint-plugin-react-hooks@^7 typescript-eslint@latest
```

**Done when:**

- `pnpm lint` (ou `eslint .`) passa sem erros de configuração
- Não há regressões de lint

**Gate:** Quick (lint + typecheck)

---

## FASE 3 — Build toolchain (ALTO)

**Objectivo:** Actualizar Vite, Vitest, TypeScript e Tailwind — impacto no build e DX mas não em runtime Electron.  
**Risco:** ALTO  
**Req cobertos:** R-02, R-06  
**Pré-requisito:** Fase 2 completa e gate passou.

### T-3.1 — Actualizar TypeScript para v6

**O quê:** `typescript` 5.9.3 → 6.0.x  
**Atenção:** TS 6 remove algumas opções de `tsconfig` legadas; verificar `tsconfig.node.json` e `tsconfig.web.json`. Decorator changes podem afectar o projecto se usados.

**Comando:**

```bash
pnpm add -D typescript@^6
```

**Done when:**

- `pnpm typecheck` passa em todos os tsconfigs
- Sem erros de configuração deprecated

**Gate:** Quick

---

### T-3.2 — Actualizar Vite 5→8 e @vitejs/plugin-react

**O quê:** `vite` 5.4.x → 8.x; `@vitejs/plugin-react` 4.x → 6.x  
**Atenção:** Vite 6/7/8 têm breaking changes na config (`build.target`, `resolve.conditions`, plugin API). Rever `electron.vite.config.ts`. `@vitejs/plugin-react` v5+ requer Vite 6+, v6 requer Vite 7+.

**Comandos:**

```bash
pnpm add -D vite@^8 @vitejs/plugin-react@^6
```

**Verificar:**

- `electron.vite.config.ts` — opcões depreciadas/removidas
- `vite.config.ts` (se existir)

**Done when:**

- `pnpm build:app` conclui sem erros
- `pnpm dev` inicia correctamente

**Gate:** Full (`pnpm build:app && pnpm test:unit`)

---

### T-3.3 — Actualizar Vitest para v4

**O quê:** `vitest` 2.1.9 → 4.x  
**Atenção:** Par com Vite — deve ser actualizado na mesma fase ou após Vite. Vitest 3/4 pode ter mudanças na config de cobertura e globals.

**Comando:**

```bash
pnpm add -D vitest@^4
```

**Done when:**

- `pnpm test:unit` passa com mesma cobertura

**Gate:** Quick

---

### T-3.4 — Actualizar Tailwind CSS 3→4

**O quê:** `tailwindcss` 3.4.x → 4.x  
**Atenção:** Tailwind v4 é rewrite completo — elimina `tailwind.config.js`, usa `@theme` CSS, novo sistema de configuração. **Dependência:** confirmar suporte no electron-vite actualizado (T-4.x) antes de aplicar se electron-vite ainda não suportar. Pode ser necessário adiar para depois da Fase 4.

**Comandos:**

```bash
pnpm add -D tailwindcss@^4 autoprefixer@latest
```

**Onde:** `tailwind.config.ts` (ou equivalente), CSS entries, `postcss.config.*`

**Done when:**

- `pnpm build:app` gera CSS correcto
- UI visualmente idêntica (verificar manualmente as principais screens)

**Gate:** Full (build + inspecção visual)

---

## FASE 4 — Electron core (CRÍTICO)

**Objectivo:** Actualizar o núcleo Electron e ferramentas de packaging/dev.  
**Risco:** CRÍTICO  
**Req cobertos:** R-02, R-05, R-06  
**Pré-requisito:** Fase 3 completa e gate passou.

### T-4.1 — Actualizar electron-vite 2→5

**O quê:** `electron-vite` 2.3.0 → 5.0.0  
**Atenção:** electron-vite 3/4/5 alinha com Vite 5/6/7 respectivamente. Rever `electron.vite.config.ts` e estrutura de entrypoints. Pode exigir ajuste em `main`, `preload` e `renderer` configs.

**Comando:**

```bash
pnpm add -D electron-vite@^5
```

**Done when:**

- `pnpm dev` abre a janela correctamente
- `pnpm build:app` conclui sem erros

**Gate:** Full

---

### T-4.2 — Actualizar Electron 33→41

**O quê:** `electron` 33.4.11 → 41.x  
**Atenção:** 8 versões major incluem actualizações de Chromium e Node interno. Verificar:

- APIs IPC (`ipcMain`, `ipcRenderer`) — verificar changelogs de breaking changes
- `contextBridge` — API mantida mas verificar comportamento
- `session` e CSP — podem ter mudanças de defaults
- `keytar` — binding nativo; pode precisar de rebuild

**Comando:**

```bash
pnpm add -D electron@^41
pnpm rebuild
```

**Done when:**

- `pnpm dev` abre sem erros de contexto ou IPC
- `pnpm test` passa (unitários + build + E2E; cobre auth e treino)

**Gate:** Build completo (`pnpm test`)

---

### T-4.3 — Actualizar electron-builder 25→26

**O quê:** `electron-builder` 25.1.8 → 26.x  
**Atenção:** Mudanças possíveis em `electron-builder.yml` ou config embutida no `package.json`. Testar packaging real (pelo menos Linux AppImage ou deb).

**Comando:**

```bash
pnpm add -D electron-builder@^26
```

**Done when:**

- `pnpm build` gera artefacto de distribuição sem erros

**Gate:** Build (`pnpm build`)

---

### T-4.4 — Actualizar better-sqlite3 11→12

**O quê:** `better-sqlite3` 11.10.0 → 12.x  
**Atenção:** Major nativo — verificar API pública usada pelo projecto (`Database`, `prepare`, `run`, `get`, `all`, `transaction`). Reconstruir para o novo Electron.

**Comandos:**

```bash
pnpm add better-sqlite3@^12 @types/better-sqlite3@latest
pnpm rebuild
```

**Done when:**

- `pnpm typecheck` passa em `src/main/db/`
- `pnpm test:unit` passa nos testes de DB
- App inicia e persiste dados correctamente

**Gate:** Full

---

## FASE 5 — React ecosystem (CRÍTICO)

**Objectivo:** Migrar para React 19, react-router-dom 7 e Recharts 3.  
**Risco:** CRÍTICO  
**Req cobertos:** R-08, R-06  
**Pré-requisito:** Fases 1-4 completas. Esta fase é a mais trabalhosa — envolve alterações de código.

### T-5.1 — Actualizar Recharts 2→3

**O quê:** `recharts` 2.15.4 → 3.x  
**Atenção:** Recharts 3 refactorizou props de alguns componentes (ex: `<BarChart>`, `<LineChart>`). Verificar ecrã de estatísticas de treino.

**Comando:**

```bash
pnpm add recharts@^3
```

**Done when:**

- `pnpm typecheck` passa nos componentes de gráficos
- Ecrã de estatísticas renderiza correctamente

**Gate:** Quick + inspecção visual

---

### T-5.2 — Actualizar react-router-dom 6→7

**O quê:** `react-router-dom` 6.30.3 → 7.x  
**Atenção:** React Router v7 unificou com Remix — paradigma de `loader`/`action` promovido. No entanto, o modo "SPA clássico" com `createBrowserRouter`/`createHashRouter` mantém-se. Verificar:

- Imports alterados
- `useNavigate`, `useLocation`, `useParams` — mantidos mas verificar tipos
- Eventual uso de `<Routes>`/`<Route>` vs nova DSL

**Comando:**

```bash
pnpm add react-router-dom@^7
```

**Done when:**

- `pnpm typecheck` passa em todos os ficheiros de routing
- Navegação entre ecrãs funciona na app

**Gate:** Full (typecheck + E2E auth + navegação)

---

### T-5.3 — Actualizar React 18→19 e tipos

**O quê:** `react` + `react-dom` 18.3.1 → 19.x; `@types/react` + `@types/react-dom` → 19.x  
**Atenção:** React 19 remove algumas APIs legadas (`ReactDOM.render`, strings refs). Verificar:

- `createRoot` já usado? (sim, se scaffolded com Vite)
- `forwardRef` — simplificado em v19
- Server Components — não relevante para Electron
- Strict Mode behaviour pode expor bugs latentes

**Comando:**

```bash
pnpm add react@^19 react-dom@^19
pnpm add -D @types/react@^19 @types/react-dom@^19
```

**Done when:**

- `pnpm typecheck` passa sem erros React
- `pnpm test` passa (fluxo completo: unitários + build + E2E; auth + treino + stats)

**Gate:** Build completo (`pnpm test`)

---

## Dependências Entre Tasks

```
T-1.1 → T-2.1 → T-2.2 → T-2.3 → T-2.4
                                    ↓
                               T-3.1 → T-3.2 → T-3.3 → T-3.4(*)
                                                           ↓
                                                     T-4.1 → T-4.2 → T-4.3 → T-4.4
                                                                                ↓
                                                                    T-5.1 → T-5.2 → T-5.3

(*) T-3.4 (Tailwind 4) pode ser adiado para após T-4.1 se electron-vite 5 for pré-requisito
```

---

## Gates de Validação Resumidos

Paridade com CI (GitHub Actions): **`pnpm test:unit`**, `pnpm typecheck`, `pnpm exec electron-vite build` — sem E2E.

| Fase | Gate             | Comando                                |
| ---- | ---------------- | -------------------------------------- |
| 1    | Quick            | `pnpm test:unit && pnpm typecheck`     |
| 2    | Quick (por task) | `pnpm test:unit && pnpm typecheck`     |
| 3    | Full             | `pnpm build:app && pnpm test:unit`     |
| 4    | Build completo   | `pnpm test` (unit + build + E2E local) |
| 5    | Build completo   | `pnpm test` (unit + build + E2E local) |

---

## Status das Tasks

| Task  | Status | Observações                                                                                            |
| ----- | ------ | ------------------------------------------------------------------------------------------------------ |
| T-1.1 | done   | Gate Quick passou — 31 testes + typecheck OK                                                           |
| T-2.1 | done   | drizzle-orm 0.45.2 — typecheck + 31 testes OK                                                          |
| T-2.2 | done   | bcryptjs 3.0.3 + @types/bcryptjs removido — API mantida                                                |
| T-2.3 | done   | @types/node 25.6.0 — typecheck OK                                                                      |
| T-2.4 | done   | eslint 10.2.1 + eslint-plugin-react-hooks 7.1.1                                                        |
| T-3.1 | done   | typescript 6.0.3; ajustado tsconfig (ignoreDeprecations, noUncheckedSideEffectImports:false)           |
| T-3.2 | done   | vite 7.3.2 + @vitejs/plugin-react 5.2.0 (v8/v6 aguardam suporte electron-vite — SPEC_DEVIATION aceite) |
| T-3.3 | done   | vitest 4.1.5 — 31 testes OK                                                                            |
| T-3.4 | done   | tailwindcss 4.2.4; migração para @tailwindcss/vite + @theme; tailwind.config.js removido               |
| T-4.1 | done   | electron-vite 5.0.0 — feito junto com T-3.2                                                            |
| T-4.2 | done   | electron 41.4.0 — rebuild OK                                                                           |
| T-4.3 | done   | electron-builder 26.8.1 + electron-builder-squirrel-windows 26.8.1                                     |
| T-4.4 | done   | better-sqlite3 12.9.0 — feito junto com T-4.2; rebuild Electron 41 OK                                  |
| T-5.1 | done   | recharts 3.8.1; corrigido tipo Formatter do Tooltip (v→undefined)                                      |
| T-5.2 | done   | react-router-dom 7.14.2 — sem alterações de código                                                     |
| T-5.3 | done   | react + react-dom 19.2.5 + @types/\* 19.x — typecheck + 31 testes + build OK                           |
