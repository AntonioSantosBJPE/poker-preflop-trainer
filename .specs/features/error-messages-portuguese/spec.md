# Spec: Mensagens de Erro em Português

## Auto-Sizing Assessment

**Scope:** Large (multi-camada — main, preload, renderer)
**Spec:** Completa
**Design:** Necessário (arquitetura de sanitização de erros IPC)
**Tasks:** Sim (breakdown completo com dependências e testes)

---

## Problema

Mensagens de erro no sistema estão genéricas, técnicas ou em inglês. O pior caso é o **vazamento de detalhes internos do Electron** — o usuário chega a ver mensagens como:

```
Error invoking remote method 'auth:login': Database not initialized
Error invoking remote method 'groups:create': Nome de grupo já existe
```

Isto expõe:

1. **Nome do canal IPC interno** (`auth:login`, `groups:create`, etc.) — falha de segurança/UX
2. **Mensagens em inglês** que não deveriam chegar ao usuário
3. **Mensagens genéricas** como `'Erro'`, `'Falha ao criar grupo'` sem contexto útil

---

## Análise Detalhada

### 1. Electron serializa erros de IPC com prefixo técnico

Electron (v41) pode prefixar erros de `ipcMain.handle` com `Error invoking remote method '<channel>': <message>` ao entregar ao renderer.

### 2. `ipcErrorMessage()` não sanitiza

```ts
export function ipcErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message; // ← retorna o prefixo sujo!
  // ...
  return 'Erro'; // ← fallback genérico
}
```

### 3. Catch blocks ignoram `ipcErrorMessage` e usam hardcoded genérico

| Arquivo                               | Pattern actual                                                     | Risco                                |
| ------------------------------------- | ------------------------------------------------------------------ | ------------------------------------ |
| `GroupsPage.tsx`                      | `err instanceof Error ? err.message : 'Erro ao criar grupo'`       | `err.message` cru (prefixo Electron) |
| `GroupCard.tsx`                       | `err instanceof Error ? err.message : 'Erro ao renomear/arquivar'` | Idem                                 |
| `TrainingSessionPage.tsx`             | `setSessionError('Erro ao carregar sessão')`                       | Ignora mensagem real                 |
| `SimultaneousTrainingSessionPage.tsx` | `setSimSessionError('Erro ao processar mão')`                      | Ignora mensagem real                 |
| `SessionHandReviewPage.tsx`           | `setError('Sessão não encontrada')`                                | Ignora mensagem real                 |
| `MultiSessionReviewPage.tsx`          | `setError('Erro ao carregar sessões.')`                            | Ignora mensagem real                 |
| `DeleteSessionsDialog.tsx`            | `setError('Erro ao estimar/remover')`                              | Ignora mensagem real                 |
| `ClearStatsDialog.tsx`                | `setError('Erro ao estimar/remover')`                              | Ignora mensagem real                 |

### 4. Mensagens no main process que propagam para o renderer

| Arquivo                      | Mensagem                                                 | Problema                        |
| ---------------------------- | -------------------------------------------------------- | ------------------------------- |
| `src/main/db/client.ts`      | `'Database not initialized'`                             | **Inglês** + informação interna |
| `src/main/ipc/auth.ts`       | `'Dados inválidos'`, `'Falha ao criar usuário'`          | Genéricos                       |
| `src/main/ipc/situations.ts` | `'Falha ao criar situação'`, `'Falha ao duplicar'`, etc. | Genéricos                       |
| `src/main/ipc/training.ts`   | `'Falha ao iniciar sessão'`, `'Lista vazia'`             | Genéricos                       |
| `src/main/ipc/history.ts`    | `'Nenhuma sessão encontrada'`                            | Genérico                        |
| `src/main/ipc/stats.ts`      | `'Nenhuma sessão encontrada no período'`                 | Genérico                        |
| `src/main/ipc/groups.ts`     | `'Falha ao criar grupo'`                                 | Genérico                        |

### 5. Ausência de Error Boundary global

Nenhum React Error Boundary envolve a árvore em `App.tsx`.

---

## Requisitos com IDs Traceáveis

### REQ-ERR-01 — Sanitizar prefixo Electron no preload

- [REQ-ERR-01.1] Criar `sanitizeIpcError(err, fallbackPt): string` em `src/preload/index.ts`
- [REQ-ERR-01.2] Remover prefixo `Error invoking remote method '<channel>':` via regex
- [REQ-ERR-01.3] Se resultado vazio/técnico/inglês, usar `fallbackPt`
- [REQ-ERR-01.4] Aplicar em todos os métodos `api.*` via `applySafeIpc`
- [REQ-ERR-01.5] Garantir que nenhum nome de canal IPC chegue ao usuário

### REQ-ERR-02 — Melhorar ipcErrorMessage no renderer

- [REQ-ERR-02.1] Adicionar regex de sanitização em `useIpcError.ts`
- [REQ-ERR-02.2] Melhorar fallback `'Erro'` → `'Ocorreu um erro inesperado. Tente novamente.'`

### REQ-ERR-03 — Substituir fallbacks hardcoded por ipcErrorMessage

- [REQ-ERR-03.1] `TrainingSessionPage`: `ipcErrorMessage(err)`
- [REQ-ERR-03.2] `SimultaneousTrainingSessionPage`: `ipcErrorMessage(err)`
- [REQ-ERR-03.3] `SessionHandReviewPage`: `ipcErrorMessage(err)`
- [REQ-ERR-03.4] `MultiSessionReviewPage`: `ipcErrorMessage(err)`
- [REQ-ERR-03.5] `DeleteSessionsDialog` + `ClearStatsDialog`: `ipcErrorMessage(err)`

### REQ-ERR-04 — Substituir pattern manual por ipcErrorMessage

- [REQ-ERR-04.1] `GroupsPage`: `ipcErrorMessage(err)`
- [REQ-ERR-04.2] `GroupCard`: `ipcErrorMessage(err)`

### REQ-ERR-05 — Corrigir mensagens em inglês no main

- [REQ-ERR-05.1] `getDb()`: `'Database not initialized'` → `'Banco de dados não inicializado. O aplicativo será encerrado.'`

### REQ-ERR-06 — Melhorar mensagens genéricas no main

11 mensagens em 6 ficheiros (ver design.md para tabela completa).

### REQ-ERR-07 — Error Boundary global

- [REQ-ERR-07.1] Criar `ErrorBoundary.tsx` com fallback PT
- [REQ-ERR-07.2] Aplicar em `App.tsx`

---

## Estratégia de Testes

### Mapa de testes por camada

```
TESTES UNITÁRIOS (vitest)                           TESTES E2E (Playwright)
══════════════════════                               ═══════════════════════

CAMADA 1 — PRELOAD                                   CAMADA 1 + 2 + 3 (integrados)
─────────────────────                                ─────────────────────────────
sanitizeIpcError() → teste unitário                  auth.spec.ts
  (extrair p/ módulo testável)                         • credenciais inválidas → "Credenciais inválidas"
applySafeIpc() → teste unitário                        • email duplicado → "E-mail já cadastrado"
                                                        • validação client → "E-mail inválido"
CAMADA 2 — RENDERER                                     • validação client → "Nome obrigatório"
─────────────────────
ipcErrorMessage() → useIpcError.test.ts              situation-groups/
  • prefixo → cleaned                                  • crud-groups → erros criação/renomear
  • sem prefixo → original
  • técnico/EN → fallback                             training.spec.ts
  • null/undefined → fallback                          • erros de sessão

ErrorBoundary → ErrorBoundary.test.tsx               dashboard.spec.ts
  • renderiza children                                 • erro ao carregar dashboard
  • erro → fallback UI
  • "Tentar novamente" → reset                        stats.spec.ts
                                                        • erro ao carregar stats
CAMADA 3 — MAIN PROCESS
──────────────────────                                situations.spec.ts
auth.test.ts    → msg actualizadas                      • erro ao criar situação
situations.test.ts → msg actualizadas
training.test.ts → msg actualizadas
stats.test.ts    → msg actualizadas
groups.test.ts   → msg actualizadas
```

### Matriz de cobertura por requisito

| REQ    | Testes unitários                | Ficheiro(s)                                      | Testes E2E               | Ficheiro(s)                                |
| ------ | ------------------------------- | ------------------------------------------------ | ------------------------ | ------------------------------------------ |
| ERR-01 | `sanitizeIpcError()` 7 cenários | `src/preload/__tests__/sanitizeIpcError.test.ts` | Login com erro IPC       | `e2e/auth.spec.ts`                         |
| ERR-02 | `ipcErrorMessage()` 5 cenários  | `src/renderer/src/hooks/useIpcError.test.ts`     | (coberto por ERR-01 E2E) | —                                          |
| ERR-03 | — (só substituição de string)   | —                                                | Erros de sessão/treino   | `e2e/training.spec.ts`                     |
| ERR-04 | — (só substituição de string)   | —                                                | Erro ao criar grupo      | `e2e/situation-groups/crud-groups.spec.ts` |
| ERR-05 | — (só substituição de string)   | —                                                | (edge case: DB offline)  | manual                                     |
| ERR-06 | `rejects.toThrow('nova msg')`   | 5 ficheiros `*.test.ts`                          | Fluxo completo           | `e2e/auth.spec.ts`                         |
| ERR-07 | ErrorBoundary 3 cenários        | `ErrorBoundary.test.tsx`                         | (erro não-capturado)     | manual                                     |

### Contagem de testes novos

| Tipo      | Novos                          | Modificados                    | Total                     |
| --------- | ------------------------------ | ------------------------------ | ------------------------- |
| Unitários | 3 ficheiros (~21 cenários)     | 5 ficheiros (~11 asserts)      | ~32                       |
| E2E       | 1 spec (error-boundary-visual) | 1 spec (auth — asserts de msg) | ~4                        |
| **Total** |                                |                                | **~36 novos/modificados** |

---

## Verificação

### Gate por fase

| Fase                   | Gate                             |
| ---------------------- | -------------------------------- |
| T1 + T3 + T6 + T7 + T8 | `pnpm test:unit`                 |
| T2                     | `pnpm test`                      |
| T4 + T5                | `pnpm test`                      |
| **Final**              | `pnpm test` (unit + build + E2E) |

### Checklist de verificação manual

1. `grep -rn "Error invoking remote method" src/ --include="*.ts" --include="*.tsx"` → 0 ocorrências
2. Login com senha errada → mostra `'Credenciais inválidas'` (sem prefixo Electron)
3. Registar com email duplicado → mostra `'E-mail já cadastrado'` (sem prefixo)
4. Criar grupo com nome vazio → mostra mensagem Zod em PT
5. Erro não-capturado no renderer → ErrorBoundary mostra fallback PT com "Tentar novamente"

### Cobertura

- Linhas novas: `ipcErrorMessage` + `ErrorBoundary` + `sanitizeIpcError` + `applySafeIpc` cobertas a 100%
- Mensagens alteradas no main: todos os `rejects.toThrow` actualizados
- Nenhum teste existente quebrado

---

## Não-Escopo

- Mensagens de log interno (`electron-log`)
- Tooltips e dicas
- `console.log`/`console.debug` de desenvolvimento
- Tradução de mensagens Zod nos schemas (já estão em PT)
