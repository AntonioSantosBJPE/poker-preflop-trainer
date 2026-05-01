# Spec: Actualização de Dependências

**Feature ID:** DEP-UPGRADE  
**Data:** 2026-05-01  
**Âmbito:** Todas as dependências do `package.json` (runtime + devDependencies)

---

## Contexto

O projecto está em v0.1.0 com dependências que datam de finais de 2024. Após `pnpm outdated`, identificaram-se 27 pacotes com versões mais recentes disponíveis, vários com saltos major. O objectivo é actualizar de forma segura e incremental, agrupando por risco e validando com os testes existentes entre fases.

**Ambiente:**
- Node 22.22.0 / pnpm 10.29.3
- Lockfile v9.0

---

## Inventário de Dependências Desactualizadas

### Classificação de Risco

| Risco | Critério |
|-------|----------|
| **BAIXO** | Patch ou minor sem breaking changes conhecidos; impacto localizado |
| **MÉDIO** | Minor com API changes menores, ou major em biblioteca utilitária sem surface alargada |
| **ALTO** | Major com breaking changes documentados, impacta arquitectura, IPC ou testes |
| **CRÍTICO** | Major em peça central (Electron, Vite, React, Router) — requer fase isolada |

---

### Runtime Dependencies

| Pacote | Instalado | Mais recente | Delta | Risco | Notas |
|--------|-----------|--------------|-------|-------|-------|
| `@fontsource/fraunces` | 5.2.8 | 5.2.9 | patch | BAIXO | Apenas fonte; zero código |
| `@hookform/resolvers` | 5.2.2 | 5.2.2 | — | — | Já actualizado |
| `bcryptjs` | 2.4.3 | 3.0.3 | major | MÉDIO | v3 inclui tipos próprios → remover `@types/bcryptjs` |
| `better-sqlite3` | 11.10.0 | 12.9.0 | major | ALTO | Nativo Electron; API pode mudar; rebuild obrigatório |
| `drizzle-orm` | 0.38.4 | 0.45.2 | minor | MÉDIO | Semver < 1.0 — changelog necessário; pode ter breaking |
| `electron-log` | 5.2.4 | 5.2.4 | — | — | Já actualizado |
| `jsonwebtoken` | 9.0.2 | 9.0.2 | — | — | Já actualizado |
| `keytar` | 7.9.0 | 7.9.0 | — | — | Já actualizado |
| `react` | 18.3.1 | 19.2.5 | major | CRÍTICO | Concurrent features, novos hooks; toda a UI afectada |
| `react-dom` | 18.3.1 | 19.2.5 | major | CRÍTICO | Par com react |
| `react-hook-form` | 7.74.0 | 7.74.0 | — | — | Já actualizado |
| `react-router-dom` | 6.30.3 | 7.14.2 | major | CRÍTICO | v7 = Remix-inspired; mudança de paradigma de routing |
| `recharts` | 2.15.4 | 3.8.1 | major | ALTO | API de componentes alterada; afecta ecrã de estatísticas |
| `zod` | 4.4.1 | 4.4.1 | — | — | Já actualizado |
| `zustand` | 5.0.2 | 5.0.2 | — | — | Já actualizado |

### Dev Dependencies

| Pacote | Instalado | Mais recente | Delta | Risco | Notas |
|--------|-----------|--------------|-------|-------|-------|
| `@playwright/test` | 1.49.1 | 1.59.1 | minor | BAIXO | Minor com fixes; API retro-compatível |
| `@types/bcryptjs` | 2.4.6 | 3.0.0 (deprecated) | — | MÉDIO | Remover após upgrade bcryptjs 3 |
| `@types/better-sqlite3` | 7.6.12 | 7.6.12 | — | — | Já actualizado |
| `@types/jsonwebtoken` | 9.0.7 | 9.0.7 | — | — | Já actualizado |
| `@types/node` | 22.19.17 | 25.6.0 | major | MÉDIO | Node 22 LTS → tipos Node 25; verificar globais TS |
| `@types/react` | 18.3.28 | 19.2.14 | major | CRÍTICO | Par com react 19 |
| `@types/react-dom` | 18.3.7 | 19.2.3 | major | CRÍTICO | Par com react-dom 19 |
| `@vitejs/plugin-react` | 4.7.0 | 6.0.1 | major | CRÍTICO | v5/v6 requer Vite 6+/7+; par com Vite |
| `autoprefixer` | 10.4.20 | 10.4.20 | — | — | Já actualizado |
| `drizzle-kit` | 0.30.6 | 0.31.10 | minor | BAIXO | CLI apenas; sem impacto em runtime |
| `electron` | 33.4.11 | 41.4.0 | major | CRÍTICO | 8 versões major; Chromium e Node interno atualizados; IPC e security APIs podem mudar |
| `electron-builder` | 25.1.8 | 26.8.1 | major | ALTO | Config de packaging pode quebrar |
| `electron-vite` | 2.3.0 | 5.0.0 | major | CRÍTICO | Par com Electron e Vite; mudanças de config esperadas |
| `eslint` | 9.39.4 | 10.2.1 | major | MÉDIO | ESLint 10 pode deprecar regras |
| `eslint-plugin-react-hooks` | 5.2.0 | 7.1.1 | major | MÉDIO | Par com React 19 |
| `eslint-plugin-react-refresh` | 0.4.26 | 0.5.2 | minor | BAIXO | Apenas dev tooling |
| `postcss` | 8.5.12 | 8.5.13 | patch | BAIXO | Patch only |
| `tailwindcss` | 3.4.19 | 4.2.4 | major | ALTO | v4 = rewrite total; nova engine, sem `tailwind.config.js` convencional |
| `typescript` | 5.9.3 | 6.0.3 | major | ALTO | TS 6 tem breaking changes nos decorators e module resolution |
| `vite` | 5.4.21 | 8.0.10 | major | CRÍTICO | 3 versões major; impacta todo o build pipeline |
| `vitest` | 2.1.9 | 4.1.5 | major | ALTO | Par com Vite; API de config pode mudar |

---

## Sumário de Impacto

```
Total desactualizados: 27 pacotes
  Já actualizados (sem delta): 9
  Com actualizações disponíveis: 18

Por risco:
  BAIXO    : 5  (patch/minor sem breaking)
  MÉDIO    : 5  (minor com cuidado ou major pequeno)
  ALTO     : 6  (major com API changes relevantes)
  CRÍTICO  : 7  (major em peças centrais da arquitectura)
```

---

## Requisitos (Rastreáveis)

| ID | Requisito |
|----|-----------|
| R-01 | Todas as actualizações BAIXO e MÉDIO devem ser aplicadas com `pnpm install` e `pnpm test` a passar |
| R-02 | Actualizações ALTO devem ser aplicadas individualmente com gate de testes unitários + typecheck |
| R-03 | Actualizações CRÍTICO devem ser aplicadas em fases isoladas com gate E2E completo |
| R-04 | Após actualização de `bcryptjs` para v3, remover `@types/bcryptjs` |
| R-05 | `better-sqlite3` major deve ser acompanhado de rebuild nativo (`pnpm rebuild`) |
| R-06 | A app deve compilar, iniciar e passar todos os testes E2E após cada fase |
| R-07 | O `package.json` não deve conter versões pinned (usar `^`) excepto onde explicitamente justificado |
| R-08 | Adiar React 19 + react-router 7 para uma fase dedicada dado o impacto na UI toda |
| R-09 | Adiar Tailwind 4 para após confirmação de suporte pelo electron-vite actualizado |

---

## Fora de Âmbito

- Migração de funcionalidades para APIs novas (ex: usar Suspense boundaries do React 19)
- Alterações de lógica de negócio ou UI
- Upgrade de Node runtime (mantém 22 LTS)
