# Tasks: Paralelismo nos Testes E2E

**Feature:** E2E-PARALLEL  
**Spec:** [spec.md](spec.md)  
**Data:** 2026-05-01

---

## Estratégia

Os ajustes são mínimos e seguros — o isolamento já existe no fixture. O trabalho é:
1. Corrigir a geração de credenciais (único risco real de colisão)
2. Activar paralelismo na config do Playwright
3. Actualizar skill e rule para reflectir o novo estado

```
T-1 (credentials) → T-2 (playwright.config) → T-3 (validação) → T-4 (skill) → T-5 (rule)
```

---

## T-1 — Corrigir unicidade de credenciais

**O quê:** `Date.now()` como semente única falha quando ≥2 workers geram credenciais no mesmo milissegundo. Adicionar componente aleatório.

**Onde:** `e2e/helpers/credentials.ts`

**Mudança:**

```ts
// antes
const stamp = Date.now()

// depois — unicidade garantida mesmo com múltiplos workers
const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
```

**Ambas as funções** (`uniqueUserCredentials` e `uniqueSituationName`) usam `stamp`, logo a mudança é aplicada uma vez na variável local.

**Done when:**
- `e2e/helpers/credentials.ts` usa `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` como stamp
- Formato do email: `e2e-<stamp>@test.local`
- Formato do nome: `Tester <stamp>`
- Sem regressões no typecheck

**Gate:** `pnpm typecheck`

---

## T-2 — Activar paralelismo na configuração do Playwright

**O quê:** Remover as restrições `workers: 1` e `fullyParallel: false`, activando execução paralela.

**Onde:** `playwright.config.ts`

**Mudança:**

```ts
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,                                    // cada test() corre em worker próprio
  workers: process.env.CI ? 1 : 2,                       // local: 2 workers; CI: mantém 1 (sem display dedicado)
  timeout: 120_000,
  expect: { timeout: 35_000 },
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']]
})
```

**Justificação de `workers: process.env.CI ? 1 : 2`:**
- **Local**: 2 workers → ganho de velocidade imediato sem pressão de recursos
- **CI** (GitHub Actions, sem display Electron dedicado): 1 worker mantém estabilidade. O CI já só corre `pnpm test:unit` conforme documentado; E2E em CI dedicado pode aumentar workers quando houver infra própria.

**Done when:**
- `playwright.config.ts` tem `fullyParallel: true` e `workers: process.env.CI ? 1 : 2`
- Sem erros de TypeScript

**Gate:** `pnpm typecheck`

---

## T-3 — Validação: suite E2E completa em paralelo

**O quê:** Correr a suite completa com os novos ajustes e confirmar que todos os testes passam.

**Onde:** Linha de comandos

**Comando:**
```bash
pnpm test:e2e:ci
```

Em ambiente headless (sem display):
```bash
xvfb-run -a pnpm test:e2e:ci
```

**Done when:**
- Todos os testes passam (0 falhas, 0 flakiness)
- Tempo de execução total inferior ao baseline com `workers: 1`
- Nenhuma colisão de credenciais

**Gate:** `pnpm test:e2e:ci` (exit 0)

---

## T-4 — Actualizar skill `preflop-e2e-playwright`

**O quê:** A skill documenta `workers: 1` como invariante a manter. Após os ajustes, esta restrição deixa de existir. A skill deve:
- Remover a nota de "Manter `workers: 1`"
- Documentar as novas regras de paralelismo (isolamento por fixture, credentials com entropia)
- Actualizar a secção "Paralelismo"

**Onde:** `.cursor/skills/preflop-e2e-playwright/SKILL.md`

**Done when:**
- Secção "Paralelismo" reflecte `fullyParallel: true` e `workers: 2` (local) / `workers: 1` (CI)
- Documentada a regra de unicidade de credenciais com `Date.now() + Math.random()`
- Sem referências desactualizadas a `workers: 1` obrigatório

**Gate:** Revisão manual do conteúdo

---

## T-5 — Actualizar rule de segurança Electron (se relevante)

**O quê:** Verificar se a rule `electron-security.mdc` ou `AGENTS.md` precisam de reflectir as mudanças. Em particular, `AGENTS.md` menciona `pnpm test:unit` e `pnpm test` — verificar se precisa de nota sobre paralelismo E2E.

**Onde:** `.cursor/rules/electron-security.mdc`, `AGENTS.md`

**Done when:**
- Rules relevantes reflectem o estado actual dos testes E2E
- Sem informação contraditória entre skill e rules

**Gate:** Revisão manual

---

## Status das Tasks

| Task | Status | Observações |
|------|--------|-------------|
| T-1  | done   | `uniqueStamp()` com `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` |
| T-2  | done   | `fullyParallel: true`, `workers: process.env.CI ? 1 : 2` |
| T-3  | done   | 30 passed em 37.4s com 2 workers — zero falhas |
| T-4  | done   | Secção "Paralelismo" da skill actualizada com regras de isolamento e unicidade |
| T-5  | done   | `electron-security.mdc` actualizada com excepção explícita para `PT_E2E_TOKEN_FILE` em testes |
