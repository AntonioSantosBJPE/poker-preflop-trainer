# Spec: Paralelismo nos Testes E2E

**Feature:** E2E-PARALLEL  
**Data:** 2026-05-01  
**Âmbito:** Habilitar múltiplos workers no Playwright para reduzir o tempo de execução dos testes E2E, mantendo isolamento total entre processos.

---

## Contexto

Os testes E2E correm actualmente com `workers: 1` e `fullyParallel: false`, o que força execução **estritamente serial**. A análise do código mostra que **o isolamento já está implementado** ao nível do fixture: cada teste recebe um processo Electron separado, com `userData` e `tokenFile` em directórios temporários distintos (`mkdtempSync`). Não há estado global partilhado entre testes a nível de ficheiros ou base de dados.

O único obstáculo real ao paralelismo é **a geração de credenciais baseada em `Date.now()`**, que pode produzir valores idênticos quando dois workers arrancam no mesmo milissegundo.

---

## Análise do Estado Actual

### O que já funciona para paralelismo
- `fixtures.ts`: cada teste lança instância Electron própria com `tmp` isolado (`mkdtempSync`)
- `PT_E2E_USER_DATA`: directório SQLite único por teste
- `PT_E2E_TOKEN_FILE`: JWT em ficheiro único por teste
- Nenhum teste partilha estado com outro (sem `beforeAll` cross-test, sem dados globais)
- `uniqueUserCredentials()` e `uniqueSituationName()` já têm intenção de unicidade

### O que bloqueia paralelismo

| Problema | Localização | Impacto |
|----------|-------------|---------|
| `workers: 1` e `fullyParallel: false` | `playwright.config.ts` | Força execução serial — causa principal da lentidão |
| `Date.now()` como semente de unicidade | `e2e/helpers/credentials.ts` | Colisão possível com ≥2 workers no mesmo milissegundo |

---

## Requisitos

| ID | Requisito |
|----|-----------|
| R-01 | Os testes E2E devem executar com ≥2 workers em paralelo sem flakiness |
| R-02 | Cada teste deve continuar a ter isolamento total (BD, sessão, JWT) |
| R-03 | Credenciais geradas dinamicamente não devem colidir entre workers |
| R-04 | A suite completa deve passar após os ajustes (`pnpm test:e2e:ci`) |
| R-05 | A skill `preflop-e2e-playwright` deve reflectir as novas regras de paralelismo |
| R-06 | Os comandos de execução documentados devem permanecer válidos |

---

## Decisões de Design

### Workers: como dimensionar?

A app Electron é nativa (não browser headless puro) e cada worker lança um processo completo. Em ambientes de desenvolvimento Linux sem display, cada instância Electron precisa de um contexto X11/Xvfb. Considerações:

- **Máquina local** (com display): 2–4 workers são razoáveis
- **CI sem display** (`xvfb-run`): 1 Xvfb partilhado + `--disable-gpu` já em uso; 2 workers funcionam sem problemas adicionais
- **Valor recomendado**: `workers: 2` por defeito, com suporte a override via env (`PLAYWRIGHT_WORKERS`)

### `fullyParallel`

Com `fullyParallel: true`, cada `test()` dentro de um `describe` pode correr em worker separado. Com `false`, os testes dentro do mesmo ficheiro correm no mesmo worker mas ficheiros diferentes correm em paralelo.

Dado que:
- Cada `test()` já tem fixture `appPage` completamente isolado
- `range-grid-improvements.spec.ts` usa `beforeEach` que recria estado fresco por teste
- Nenhum `test()` depende de outro dentro do mesmo ficheiro

→ **`fullyParallel: true`** é seguro e maximiza o ganho.

### Unicidade de credenciais

`Date.now()` em ms não é suficiente com ≥2 workers. Solução: adicionar `crypto.randomBytes` (ou `Math.random()` com entropia suficiente) à semente:

```ts
// antes
const stamp = Date.now()

// depois
const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
```

Mantém legibilidade e garante unicidade mesmo com múltiplos workers no mesmo ms.
