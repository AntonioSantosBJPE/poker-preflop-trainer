# Tasks: Mensagens de Erro em Português

## Grupos de Paralelização

```
GRUPO A (sem dependências)         GRUPO B (dependentes de A)
─────────────────────────────      ─────────────────────────────
T1  sanitizeIpcError (preload)      T2  aplicar api wrapper
T3  ipcErrorMessage (renderer)      T4  substituir catch hardcoded
T6  getDb() → português             T5  substituir pattern manual
T7  mensagens genéricas main
T8  ErrorBoundary global
```

**Ordem de execução:** T1 + T3 + T6 + T7 + T8 (paralelo) → T2 → T4 + T5 (paralelo) → gate final

---

## T1: Criar `sanitizeIpcError` no preload

| Campo            | Valor                                                                      |
| ---------------- | -------------------------------------------------------------------------- |
| **Onde**         | `src/preload/sanitizeIpcError.ts` (novo) + `src/preload/index.ts` (import) |
| **O quê**        | Extrair `sanitizeIpcError` e `applySafeIpc` para módulo testável           |
| **REQ**          | ERR-01.1, ERR-01.2, ERR-01.3                                               |
| **Depende de**   | —                                                                          |
| **Paralelo com** | T3, T6, T7, T8                                                             |

### Especificação

```ts
// src/preload/sanitizeIpcError.ts

const IPC_PREFIX = /^Error invoking remote method '[^']+':\s*/;
const KNOWN_ENGLISH = ['database not initialized', 'error invoking'];

export function sanitizeIpcError(err: unknown, fallbackPt: string): string {
  const msg = extractMessage(err);
  const cleaned = msg.replace(IPC_PREFIX, '').trim();
  if (!cleaned || KNOWN_ENGLISH.some((p) => cleaned.toLowerCase().includes(p))) {
    return fallbackPt;
  }
  return cleaned;
}

function extractMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  if (typeof err === 'string') return err;
  return '';
}

export async function applySafeIpc<T>(fn: () => Promise<T>, fallbackPt: string): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw new Error(sanitizeIpcError(err, fallbackPt));
  }
}
```

### Testes (novo ficheiro: `src/preload/__tests__/sanitizeIpcError.test.ts`)

| #   | Input                                                                                                         | Output                          |
| --- | ------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 1   | `Error("Error invoking remote method 'auth:login': Credenciais inválidas")`                                   | `"Credenciais inválidas"`       |
| 2   | `Error("Error invoking remote method 'x': Database not initialized")`                                         | `fallbackPt`                    |
| 3   | `Error("Credenciais inválidas")` (sem prefixo)                                                                | `"Credenciais inválidas"`       |
| 4   | `"string pura"`                                                                                               | `fallbackPt`                    |
| 5   | `{ message: "Error invoking remote method 'x': y" }`                                                          | `"y"`                           |
| 6   | `null`                                                                                                        | `fallbackPt`                    |
| 7   | `undefined`                                                                                                   | `fallbackPt`                    |
| 8   | `applySafeIpc(() => Promise.resolve('ok'), fb)`                                                               | `Promise.resolve('ok')`         |
| 9   | `applySafeIpc(() => Promise.reject(Error("Error invoking remote method 'x': real")), fb)`                     | `Promise.reject(Error('real'))` |
| 10  | `applySafeIpc(() => Promise.reject(Error("Error invoking remote method 'x': Database not initialized")), fb)` | `Promise.reject(Error(fb))`     |

**Config de vitest:** O ficheiro `src/preload/__tests__/*.test.ts` roda com `environment: 'node'` (config global).

### Done when

- [ ] `src/preload/sanitizeIpcError.ts` criado com funções exportadas
- [ ] `src/preload/__tests__/sanitizeIpcError.test.ts` com 10 cenários
- [ ] `pnpm test:unit` passa (todos os 10 testes verdes)

---

## T2: Aplicar `applySafeIpc` em todos os métodos do `api` object

| Campo            | Valor                                                |
| ---------------- | ---------------------------------------------------- |
| **Onde**         | `src/preload/index.ts`                               |
| **O quê**        | Envolver todos os métodos `api.*` com `applySafeIpc` |
| **REQ**          | ERR-01.4, ERR-01.5                                   |
| **Depende de**   | T1                                                   |
| **Paralelo com** | —                                                    |

### Especificação

```ts
// src/preload/index.ts (adicional)
import { applySafeIpc } from './sanitizeIpcError';

const FALLBACK = {
  AUTH: 'Falha na autenticação. Verifique os dados e tente novamente.',
  PROFILE: 'Erro ao atualizar perfil. Tente novamente.',
  GROUPS: 'Erro ao gerenciar grupos. Tente novamente.',
  SITUATIONS: 'Erro ao gerenciar situações. Tente novamente.',
  TRAINING: 'Erro na sessão de treino. Tente novamente.',
  SIM_TRAINING: 'Erro na sessão simultânea. Tente novamente.',
  STATS: 'Erro ao carregar estatísticas. Tente novamente.',
  HISTORY: 'Erro ao carregar histórico. Tente novamente.',
} as const;
```

**Métodos a envolver (31 métodos):**

| Grupo                  | Métodos                                                                                                                                                                                                               | Fallback                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `auth`                 | `login`, `register`, `me` (3)                                                                                                                                                                                         | `FALLBACK.AUTH`         |
| `profile`              | `updateName`, `changePassword`, `updatePreferences` (3)                                                                                                                                                               | `FALLBACK.PROFILE`      |
| `groups`               | `list`, `create`, `rename`, `archive` (4)                                                                                                                                                                             | `FALLBACK.GROUPS`       |
| `situations`           | `list`, `get`, `create`, `update`, `delete`, `duplicate` (6)                                                                                                                                                          | `FALLBACK.SITUATIONS`   |
| `training`             | `startSession`, `getSession`, `dealHand`, `submitAnswer`, `finishSession`, `getSessionResult`, `listSessions`, `getSessionDetail`, `estimateDeleteSessionsByIds`, `deleteSessionsByIds`, `getMultiSessionDetail` (11) | `FALLBACK.TRAINING`     |
| `simultaneousTraining` | `startSession` (1)                                                                                                                                                                                                    | `FALLBACK.SIM_TRAINING` |
| `stats`                | `overview`, `bySituation`, `timeline`, `worstHands`, `estimateDeleteSessions`, `deleteSessions` (6)                                                                                                                   | `FALLBACK.STATS`        |

**Excluir:** `auth.logout` (nunca rejeita).

**Pattern:**

```ts
// antes
login: (email: string, password: string) =>
  ipcRenderer.invoke('auth:login', email, password),

// depois
login: (email: string, password: string) =>
  applySafeIpc(() => ipcRenderer.invoke('auth:login', email, password), FALLBACK.AUTH),
```

### Verificação

- [ ] `auth.logout` NÃO tem wrapper (única excepção)
- [ ] Todos os outros 31 métodos têm wrapper
- [ ] `pnpm test` passa

### Testes (sem unit tests novos — coberto por E2E)

Os E2E existentes verificam o fluxo completo:

- `e2e/auth.spec.ts` — login, registo, validações
- `e2e/situation-groups/crud-groups.spec.ts` — criar/renomear grupos

### Gate

- [ ] `pnpm test` (unit + build + E2E)

---

## T3: Melhorar `ipcErrorMessage` no renderer

| Campo            | Valor                                                                  |
| ---------------- | ---------------------------------------------------------------------- |
| **Onde**         | `src/renderer/src/hooks/useIpcError.ts` + `useIpcError.test.ts` (novo) |
| **O quê**        | Sanitização com regex + fallback melhorado                             |
| **REQ**          | ERR-02.1, ERR-02.2                                                     |
| **Depende de**   | —                                                                      |
| **Paralelo com** | T1, T6, T7, T8                                                         |

### Especificação

```ts
const IPC_PREFIX = /^Error invoking remote method '[^']+':\s*/;
const TECHNICAL = [
  'database not initialized',
  'error invoking',
  'internal error',
  'undefined',
  'null',
];

export function ipcErrorMessage(err: unknown): string {
  const raw = extractMessage(err);
  const cleaned = raw.replace(IPC_PREFIX, '').trim();
  if (!cleaned || TECHNICAL.some((p) => cleaned.toLowerCase().includes(p))) {
    return 'Ocorreu um erro inesperado. Tente novamente.';
  }
  return cleaned;
}

function extractMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  if (typeof err === 'string') return err;
  return '';
}
```

### Testes (novo: `src/renderer/src/hooks/useIpcError.test.ts`)

| #   | Input                                                              | Output                                           |
| --- | ------------------------------------------------------------------ | ------------------------------------------------ |
| 1   | `Error("Error invoking remote method 'x': Credenciais inválidas")` | `"Credenciais inválidas"`                        |
| 2   | `Error("Credenciais inválidas")`                                   | `"Credenciais inválidas"`                        |
| 3   | `Error("Database not initialized")`                                | `"Ocorreu um erro inesperado. Tente novamente."` |
| 4   | `null`                                                             | `"Ocorreu um erro inesperado. Tente novamente."` |
| 5   | `"string"`                                                         | `"Ocorreu um erro inesperado. Tente novamente."` |
| 6   | `undefined`                                                        | `"Ocorreu um erro inesperado. Tente novamente."` |
| 7   | `{}` (objeto sem message)                                          | `"Ocorreu um erro inesperado. Tente novamente."` |

### Done when

- [ ] `useIpcError.ts` actualizado com regex + fallback
- [ ] `useIpcError.test.ts` com 7 cenários
- [ ] `pnpm test:unit` passa

---

## T4: Substituir catch hardcoded por `ipcErrorMessage`

| Campo            | Valor                                                      |
| ---------------- | ---------------------------------------------------------- |
| **Onde**         | 6 ficheiros (9 substituições)                              |
| **O quê**        | `setError('hardcoded')` → `setError(ipcErrorMessage(err))` |
| **REQ**          | ERR-03.1 a ERR-03.5                                        |
| **Depende de**   | T3                                                         |
| **Paralelo com** | T5                                                         |

### Ficheiros e alterações

| Ficheiro                                                       | Linha approx | Antes                                            | Depois                                     |
| -------------------------------------------------------------- | ------------ | ------------------------------------------------ | ------------------------------------------ |
| `src/renderer/src/pages/TrainingSessionPage.tsx`               | catch        | `setSessionError('Erro ao carregar sessão')`     | `setSessionError(ipcErrorMessage(err))`    |
| `src/renderer/src/pages/SimultaneousTrainingSessionPage.tsx`   | catch        | `setSimSessionError('Erro ao processar mão')`    | `setSimSessionError(ipcErrorMessage(err))` |
| `src/renderer/src/pages/SessionHandReviewPage.tsx`             | catch        | `setError('Sessão não encontrada')`              | `setError(ipcErrorMessage(err))`           |
| `src/renderer/src/pages/MultiSessionReviewPage.tsx`            | catch        | `setError('Erro ao carregar sessões.')`          | `setError(ipcErrorMessage(err))`           |
| `src/renderer/src/components/history/DeleteSessionsDialog.tsx` | catch ×2     | `'Erro ao estimar'`, `'Erro ao remover sessões'` | `ipcErrorMessage(err)`                     |
| `src/renderer/src/components/stats/ClearStatsDialog.tsx`       | catch ×2     | `'Erro ao estimar'`, `'Erro ao remover sessões'` | `ipcErrorMessage(err)`                     |

**Import a adicionar** em cada ficheiro (se ainda não existir):

```ts
import { ipcErrorMessage } from '@/hooks/useIpcError';
```

### Done when

- [ ] 6 ficheiros alterados, 9 substituições
- [ ] `pnpm test` passa (unit + build + E2E)

---

## T5: Substituir pattern manual por `ipcErrorMessage`

| Campo            | Valor                                                                      |
| ---------------- | -------------------------------------------------------------------------- |
| **Onde**         | `GroupsPage.tsx`, `GroupCard.tsx`                                          |
| **O quê**        | `err instanceof Error ? err.message : 'fallback'` → `ipcErrorMessage(err)` |
| **REQ**          | ERR-04.1, ERR-04.2                                                         |
| **Depende de**   | T3                                                                         |
| **Paralelo com** | T4                                                                         |

### Ficheiros e alterações

| Ficheiro                                           | Antes                                                           | Depois                 |
| -------------------------------------------------- | --------------------------------------------------------------- | ---------------------- |
| `src/renderer/src/pages/GroupsPage.tsx`            | `err instanceof Error ? err.message : 'Erro ao criar grupo'`    | `ipcErrorMessage(err)` |
| `src/renderer/src/components/groups/GroupCard.tsx` | `err instanceof Error ? err.message : 'Erro ao renomear grupo'` | `ipcErrorMessage(err)` |
| `src/renderer/src/components/groups/GroupCard.tsx` | `err instanceof Error ? err.message : 'Erro ao arquivar grupo'` | `ipcErrorMessage(err)` |

**Import a adicionar** em cada ficheiro:

```ts
import { ipcErrorMessage } from '@/hooks/useIpcError';
```

**Atenção:** `GroupsPage.tsx` já tem acesso a `window.api` — verificar se o import colide com imports existentes.

### Done when

- [ ] 2 ficheiros alterados, 3 substituições
- [ ] `pnpm test` passa (verificar `e2e/situation-groups/crud-groups.spec.ts`)

---

## T6: Corrigir mensagem em inglês no main process

| Campo            | Valor                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| **Onde**         | `src/main/db/client.ts`                                                                          |
| **O quê**        | `'Database not initialized'` → `'Banco de dados não inicializado. O aplicativo será encerrado.'` |
| **REQ**          | ERR-05.1                                                                                         |
| **Depende de**   | —                                                                                                |
| **Paralelo com** | T1, T3, T7, T8                                                                                   |

### Especificação

```diff
- throw new Error('Database not initialized');
+ throw new Error('Banco de dados não inicializado. O aplicativo será encerrado.');
```

### Verificação

- `grep -rn "Database not initialized" src/main/ --include="*.ts"` → 0 resultados
- `src/main/db/client.test.ts` — N/A (excluído do coverage, sem testes directos)

### Done when

- [ ] Mensagem alterada
- [ ] `pnpm test` passa

---

## T7: Melhorar mensagens genéricas no main process

| Campo            | Valor                                                     |
| ---------------- | --------------------------------------------------------- |
| **Onde**         | 6 ficheiros em `src/main/ipc/` + 5 ficheiros de teste     |
| **O quê**        | 11 mensagens substituídas + expects de teste actualizados |
| **REQ**          | ERR-06.1 a ERR-06.6                                       |
| **Depende de**   | —                                                         |
| **Paralelo com** | T1, T3, T6, T8                                            |

### Alterações nos fonte

| Ficheiro                     | Antes                                    | Depois                                                                       |
| ---------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------- |
| `src/main/ipc/auth.ts`       | `'Dados inválidos'`                      | `'E-mail ou senha inválidos. Verifique os dados.'`                           |
| `src/main/ipc/auth.ts`       | `'Falha ao criar usuário'`               | `'Não foi possível criar a conta. Tente novamente.'`                         |
| `src/main/ipc/situations.ts` | `'Falha ao criar situação'`              | `'Não foi possível criar a situação. Verifique os dados e tente novamente.'` |
| `src/main/ipc/situations.ts` | `'Falha ao duplicar'`                    | `'Não foi possível duplicar a situação. Tente novamente.'`                   |
| `src/main/ipc/situations.ts` | `'Falha ao criar ação'`                  | `'Não foi possível criar a ação. Tente novamente.'`                          |
| `src/main/ipc/situations.ts` | `'Falha ao duplicar ação'`               | `'Não foi possível duplicar a ação. Tente novamente.'`                       |
| `src/main/ipc/training.ts`   | `'Falha ao iniciar sessão'`              | `'Não foi possível iniciar a sessão. Tente novamente.'`                      |
| `src/main/ipc/training.ts`   | `'Lista vazia'`                          | `'Nenhuma situação selecionada para treino.'`                                |
| `src/main/ipc/history.ts`    | `'Nenhuma sessão encontrada'`            | `'Nenhuma sessão encontrada no período.'`                                    |
| `src/main/ipc/stats.ts`      | `'Nenhuma sessão encontrada no período'` | `'Nenhuma sessão de treino encontrada no período selecionado.'`              |
| `src/main/ipc/groups.ts`     | `'Falha ao criar grupo'`                 | `'Não foi possível criar o grupo. Tente novamente.'`                         |

### Actualizações nos testes

| Ficheiro de teste                 | Ocorrências | `rejects.toThrow` anterior                               | `rejects.toThrow` novo                                          |
| --------------------------------- | ----------- | -------------------------------------------------------- | --------------------------------------------------------------- |
| `src/main/ipc/auth.test.ts`       | 2           | `'Dados inválidos'`                                      | `'E-mail ou senha inválidos'`                                   |
| `src/main/ipc/situations.test.ts` | 4           | `'Falha ao criar situação'`, `'Falha ao duplicar'`, etc. | Nova msg correspondente                                         |
| `src/main/ipc/training.test.ts`   | 2           | `'Falha ao iniciar sessão'`, `'Lista vazia'`             | Nova msg correspondente                                         |
| `src/main/ipc/stats.test.ts`      | 1           | `'Nenhuma sessão encontrada no período'`                 | `'Nenhuma sessão de treino encontrada no período selecionado.'` |
| `src/main/ipc/groups.test.ts`     | 1           | `'Falha ao criar grupo'`                                 | `'Não foi possível criar o grupo.'`                             |

**Nota:** Usar substring no `rejects.toThrow` para evitar breaking se a mensagem for refinada depois. Ex: `rejects.toThrow('E-mail ou senha inválidos')` em vez da string completa.

### Done when

- [ ] 11 mensagens alteradas nos fonte
- [ ] ~9 expects actualizados nos testes
- [ ] `pnpm test:unit` passa
- [ ] `pnpm test` passa

---

## T8: Adicionar Error Boundary global

| Campo            | Valor                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Onde**         | `src/renderer/src/components/app/ErrorBoundary.tsx` (novo) + `ErrorBoundary.test.tsx` (novo) + `src/renderer/src/App.tsx` |
| **O quê**        | Componente ErrorBoundary class-based + testes + aplicação                                                                 |
| **REQ**          | ERR-07.1, ERR-07.2                                                                                                        |
| **Depende de**   | —                                                                                                                         |
| **Paralelo com** | T1, T3, T6, T7                                                                                                            |

### Especificação

Ver `design.md` para código completo do componente.

**Interface:**

```tsx
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}
```

**Fallback UI:**

- Título: "Algo deu errado"
- Descrição: "Ocorreu um erro inesperado. Tente recarregar a página ou volte ao início."
- Botão "Tentar novamente" com `data-testid="error-boundary-retry"`
- Layout: `min-h-screen`, centrado, bg-background

### Aplicação em App.tsx

```tsx
// src/renderer/src/App.tsx
import { ErrorBoundary } from '@/components/app/ErrorBoundary';

// Antes:
// <ThemeProvider><App /></ThemeProvider>

// Depois:
<ThemeProvider>
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
</ThemeProvider>;
```

### Testes (novo: `src/renderer/src/components/app/ErrorBoundary.test.tsx`)

| #   | Cenário                          | Assert                                 |
| --- | -------------------------------- | -------------------------------------- |
| 1   | Renderiza children sem erro      | `getByTestId('child')` visível         |
| 2   | Child lança erro → fallback UI   | `getByText('Algo deu errado')` visível |
| 3   | Clica "Tentar novamente" → reset | Children remontado após retry          |

**Mock necessário:** `vi.spyOn(console, 'error').mockImplementation(() => {})` para silenciar erro esperado do React.

### Done when

- [ ] `ErrorBoundary.tsx` criado com fallback UI em PT
- [ ] Aplicado em `App.tsx`
- [ ] `ErrorBoundary.test.tsx` com 3 cenários
- [ ] `pnpm test:unit` passa
- [ ] Sem regressões visuais

---

## Resumo de Execução

### Fases

```
Fase 1 (↗ paralelo — 5 tasks):
  T1 sanitizeIpcError + T3 ipcErrorMessage + T6 db/client PT +
  T7 msgs main + T8 ErrorBoundary
  → gate: pnpm test:unit

Fase 2 (→ sequencial — 1 task):
  T2 aplicar wrapper no preload (dep T1)
  → gate: pnpm test

Fase 3 (↗ paralelo — 2 tasks):
  T4 catch hardcoded + T5 pattern manual (dep T3)
  → gate: pnpm test

Fase 4 (gate final):
  pnpm test (unit + build + E2E)
```

### Contagem de ficheiros

| Tipo      | Criados                                                                         | Modificados                                                  |
| --------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Código    | 2 (`sanitizeIpcError.ts`, `ErrorBoundary.tsx`)                                  | 16 (preload, 6 ipc handlers, 8 páginas/componentes, App.tsx) |
| Testes    | 3 (`sanitizeIpcError.test.ts`, `useIpcError.test.ts`, `ErrorBoundary.test.tsx`) | 5 (ipc test files)                                           |
| **Total** | **5 novos**                                                                     | **21 modificados**                                           |

### Gate final

```bash
pnpm test:unit  # unit tests (novos + existentes)
pnpm test       # unit + build + E2E
```

**Gate falha se:**

- Algum `rejects.toThrow` não actualizado
- Testes E2E de auth quebrados (asserts por texto mudaram)
- Cobertura abaixo dos thresholds (statements 80%, branches 75%, functions 85%, lines 80%)
