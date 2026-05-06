# Design: Sanitização de Mensagens de Erro

## Visão Geral

Sistema de defesa em profundidade com 2 camadas que garante que nenhum detalhe técnico interno (nomes de canais IPC, mensagens em inglês, stack traces) chegue ao usuário final.

```
┌──────────────────────────────────────────────────────────────────┐
│                        MAIN PROCESS                              │
│                                                                  │
│  handlers: throw new Error(msg_pt)  ← mensagens editoriais em PT  │
│           ⚠ getDb() → 'Database not initialized' (EN) ← corrigir │
│                                                                  │
│  → Electron serializa e entrega ao renderer                      │
│    (pode prefixar: "Error invoking remote method 'ch': msg")     │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│  CAMADA 1 — PRELOAD (proteção principal)                        │
│                                                                  │
│  sanitizeIpcError(err, fallbackPt): string                       │
│    ├── extrai .message                                           │
│    ├── remove prefixo "Error invoking remote method '...':"      │
│    ├── detecta mensagens técnicas/EN e substitui por fallback    │
│    └── retorna string limpa em PT                                │
│                                                                  │
│  applySafeIpc<T>(fn, fallbackPt): Promise<T>                     │
│    ├── try: return await fn()                                    │
│    └── catch: throw sanitizeIpcError(err, fallbackPt)            │
│                                                                  │
│  Todos os métodos api.* usam applySafeIpc                        │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│  CAMADA 2 — RENDERER (sanitização adicional)                    │
│                                                                  │
│  ipcErrorMessage(err): string                                    │
│    ├── regex sanitização (captura qualquer variante do prefixo)  │
│    ├── fallback: 'Ocorreu um erro inesperado. Tente novamente.'  │
│    └── usado por TODOS os catch blocks (sem hardcoded)           │
│                                                                  │
│  ErrorBoundary (global)                                          │
│    └── fallback final para erros não-capturados                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Camada 1: Preload

### `sanitizeIpcError(err: unknown, fallbackPt: string): string`

**Interface:**

```ts
function sanitizeIpcError(err: unknown, fallbackPt: string): string;
```

**Algoritmo:**

```
1. Extrair message string do err (Error, objeto c/ .message, string)
2. Se message contém "Error invoking remote method":
   a. Extrair parte após o último ': '
   b. Se vazio → return fallbackPt
3. Se message contém "Database not initialized" → return fallbackPt
4. Se message vazia → return fallbackPt
5. Return message
```

### `applySafeIpc<T>(fn: () => Promise<T>, fallbackPt: string): Promise<T>`

```ts
async function applySafeIpc<T>(fn: () => Promise<T>, fb: string): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw new Error(sanitizeIpcError(err, fb));
  }
}
```

### Constante `FALLBACK` e aplicação

```ts
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

**Exceção:** `auth:logout` não precisa (não rejeita).

### Testes unitários do preload

A função `sanitizeIpcError` precisa ser testável isoladamente. Estratégia:

- Extrair `sanitizeIpcError` e `applySafeIpc` para `src/preload/sanitizeIpcError.ts`
- Testar com vitest (ambiente node, sem Electron)
- O `index.ts` importa e usa estas funções

**Ficheiro novo:** `src/preload/__tests__/sanitizeIpcError.test.ts`

```ts
import { describe, it, expect } from 'vitest';

// Nota: importar após extrair para módulo separado
import { sanitizeIpcError } from '../sanitizeIpcError';

const FB = 'Fallback contextual.';

describe('sanitizeIpcError', () => {
  it('remove prefixo Electron e mantém mensagem PT', () => {
    expect(
      sanitizeIpcError(
        new Error("Error invoking remote method 'auth:login': Credenciais inválidas"),
        FB,
      ),
    ).toBe('Credenciais inválidas');
  });

  it('remove prefixo com canal diferente', () => {
    expect(
      sanitizeIpcError(
        new Error("Error invoking remote method 'groups:create': Nome de grupo já existe"),
        FB,
      ),
    ).toBe('Nome de grupo já existe');
  });

  it('fallback quando mensagem é inglesa/técnica mesmo após limpeza', () => {
    expect(
      sanitizeIpcError(new Error("Error invoking remote method 'x': Database not initialized"), FB),
    ).toBe(FB);
  });

  it('mantém mensagem PT sem prefixo', () => {
    expect(sanitizeIpcError(new Error('Credenciais inválidas'), FB)).toBe('Credenciais inválidas');
  });

  it('fallback para string pura (não Error)', () => {
    expect(sanitizeIpcError('raw string', FB)).toBe(FB);
  });

  it('fallback para objeto com message', () => {
    expect(sanitizeIpcError({ message: "Error invoking remote method 'x': y" }, FB)).toBe('y');
  });

  it('fallback para null', () => {
    expect(sanitizeIpcError(null, FB)).toBe(FB);
  });

  it('fallback para undefined', () => {
    expect(sanitizeIpcError(undefined, FB)).toBe(FB);
  });
});

describe('applySafeIpc', () => {
  it('resolve quando fn resolve', async () => {
    const fn = () => Promise.resolve('ok');
    await expect(applySafeIpc(fn, FB)).resolves.toBe('ok');
  });

  it('reject com mensagem sanitizada quando fn rejeita', async () => {
    const fn = () => Promise.reject(new Error("Error invoking remote method 'x': erro real"));
    await expect(applySafeIpc(fn, FB)).rejects.toThrow('erro real');
  });

  it('reject com fallback quando erro é técnico', async () => {
    const fn = () =>
      Promise.reject(new Error("Error invoking remote method 'x': Database not initialized"));
    await expect(applySafeIpc(fn, FB)).rejects.toThrow(FB);
  });
});
```

---

## Camada 2: Renderer

### `ipcErrorMessage(err: unknown): string`

**Implementação:**

```ts
const IPC_PREFIX = /^Error invoking remote method '[^']+':\s*/;
const TECHNICAL_PATTERNS = [
  'database not initialized',
  'error invoking',
  'internal error',
  'undefined',
  'null',
];

export function ipcErrorMessage(err: unknown): string {
  const raw = extractMessage(err);
  const cleaned = raw.replace(IPC_PREFIX, '').trim();
  if (!cleaned || TECHNICAL_PATTERNS.some((p) => cleaned.toLowerCase().includes(p))) {
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

### Testes unitários

**Ficheiro:** `src/renderer/src/hooks/useIpcError.test.ts` (novo)

```ts
import { describe, it, expect } from 'vitest';
import { ipcErrorMessage } from './useIpcError';

describe('ipcErrorMessage', () => {
  it('remove prefixo Electron', () => {
    expect(
      ipcErrorMessage(new Error("Error invoking remote method 'x': Credenciais inválidas")),
    ).toBe('Credenciais inválidas');
  });

  it('mantém mensagem sem prefixo', () => {
    expect(ipcErrorMessage(new Error('Credenciais inválidas'))).toBe('Credenciais inválidas');
  });

  it('fallback para mensagem técnica em inglês', () => {
    expect(ipcErrorMessage(new Error('Database not initialized'))).toBe(
      'Ocorreu um erro inesperado. Tente novamente.',
    );
  });

  it('fallback para null', () => {
    expect(ipcErrorMessage(null)).toBe('Ocorreu um erro inesperado. Tente novamente.');
  });

  it('fallback para string pura', () => {
    expect(ipcErrorMessage('raw string')).toBe('Ocorreu um erro inesperado. Tente novamente.');
  });

  it('fallback para undefined', () => {
    expect(ipcErrorMessage(undefined)).toBe('Ocorreu um erro inesperado. Tente novamente.');
  });

  it('fallback para objeto sem message', () => {
    expect(ipcErrorMessage({ foo: 'bar' })).toBe('Ocorreu um erro inesperado. Tente novamente.');
  });
});
```

### `ErrorBoundary` component

```tsx
// src/renderer/src/components/app/ErrorBoundary.tsx

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-8">
          <div className="flex max-w-md flex-col items-center gap-4 text-center">
            <h1 className="font-display text-2xl font-semibold text-foreground">Algo deu errado</h1>
            <p className="text-sm text-muted-foreground">
              Ocorreu um erro inesperado. Tente recarregar a página ou volte ao início.
            </p>
            <Button onClick={this.handleRetry} data-testid="error-boundary-retry">
              Tentar novamente
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**Aplicação em App.tsx:**

```tsx
import { ErrorBoundary } from '@/components/app/ErrorBoundary';

<ThemeProvider>
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
</ThemeProvider>;
```

### Testes do ErrorBoundary

**Ficheiro:** `src/renderer/src/components/app/ErrorBoundary.test.tsx` (novo)

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from './ErrorBoundary';

function BombsOnRender({ shouldThrow }: { shouldThrow?: boolean }) {
  if (shouldThrow) throw new Error('explodiu');
  return <p>ok</p>;
}

describe('ErrorBoundary', () => {
  it('renderiza children quando não há erro', () => {
    render(
      <ErrorBoundary>
        <p data-testid="child">funcionando</p>
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('child')).toHaveTextContent('funcionando');
  });

  it('mostra fallback quando child lança erro', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {}); // silencia erro esperado
    render(
      <ErrorBoundary>
        <BombsOnRender shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument();
  });

  it('"Tentar novamente" permite remontar children', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(
      <ErrorBoundary>
        <BombsOnRender shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('error-boundary-retry'));

    // Após retry, renderiza children sem erro
    rerender(
      <ErrorBoundary>
        <p data-testid="child">recuperou</p>
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('child')).toHaveTextContent('recuperou');
  });
});
```

---

## Main Process: Mensagens

### Tabela completa de alterações

| Ficheiro        | Antes                                    | Depois                                                                       |
| --------------- | ---------------------------------------- | ---------------------------------------------------------------------------- |
| `db/client.ts`  | `'Database not initialized'`             | `'Banco de dados não inicializado. O aplicativo será encerrado.'`            |
| `auth.ts`       | `'Dados inválidos'`                      | `'E-mail ou senha inválidos. Verifique os dados.'`                           |
| `auth.ts`       | `'Falha ao criar usuário'`               | `'Não foi possível criar a conta. Tente novamente.'`                         |
| `situations.ts` | `'Falha ao criar situação'`              | `'Não foi possível criar a situação. Verifique os dados e tente novamente.'` |
| `situations.ts` | `'Falha ao duplicar'`                    | `'Não foi possível duplicar a situação. Tente novamente.'`                   |
| `situations.ts` | `'Falha ao criar ação'`                  | `'Não foi possível criar a ação. Tente novamente.'`                          |
| `situations.ts` | `'Falha ao duplicar ação'`               | `'Não foi possível duplicar a ação. Tente novamente.'`                       |
| `training.ts`   | `'Falha ao iniciar sessão'`              | `'Não foi possível iniciar a sessão. Tente novamente.'`                      |
| `training.ts`   | `'Lista vazia'`                          | `'Nenhuma situação selecionada para treino.'`                                |
| `history.ts`    | `'Nenhuma sessão encontrada'`            | `'Nenhuma sessão encontrada no período.'`                                    |
| `stats.ts`      | `'Nenhuma sessão encontrada no período'` | `'Nenhuma sessão de treino encontrada no período selecionado.'`              |
| `groups.ts`     | `'Falha ao criar grupo'`                 | `'Não foi possível criar o grupo. Tente novamente.'`                         |

### Testes a actualizar

Cada `rejects.toThrow('mensagem antiga')` precisa ser actualizado:

| Ficheiro de teste    | Ocorrências             | Nova string                                                     |
| -------------------- | ----------------------- | --------------------------------------------------------------- |
| `auth.test.ts`       | 2 (`'Dados inválidos'`) | `'E-mail ou senha inválidos. Verifique os dados.'`              |
| `situations.test.ts` | 4                       | Nova msg correspondente                                         |
| `training.test.ts`   | 2                       | Nova msg correspondente                                         |
| `stats.test.ts`      | 1                       | `'Nenhuma sessão de treino encontrada no período selecionado.'` |
| `groups.test.ts`     | 1                       | `'Não foi possível criar o grupo. Tente novamente.'`            |

### E2E: asserts de texto a verificar

| Ficheiro E2E          | Assert actual                        | Deve continuar a passar se |
| --------------------- | ------------------------------------ | -------------------------- |
| `e2e/auth.spec.ts:21` | `getByText('Credenciais inválidas')` | Mensagem não mudou         |
| `e2e/auth.spec.ts:33` | `getByText('E-mail já cadastrado')`  | Mensagem não mudou         |
| `e2e/auth.spec.ts:41` | `getByText('E-mail inválido')`       | Mensagem não mudou         |
| `e2e/auth.spec.ts:50` | `getByText(/8 caracteres/)`          | Mensagem não mudou         |
| `e2e/auth.spec.ts:58` | `getByText('Nome obrigatório')`      | Mensagem não mudou         |

---

## Considerações de Segurança

1. **Nunca expor nomes de canais IPC.** O prefixo `Error invoking remote method 'auth:login'` revela estrutura interna. Sanitização remove isto.
2. **Nunca expor detalhes de implementação.** `'Database not initialized'` revela SQLite. Mensagem substituta é genérica.
3. **Fallbacks contextuais vs genéricos.** Cada grupo de APIs tem fallback específico.

---

## Matriz de Rastreabilidade

| Componente                | Ficheiro                                            | REQ        | Testes                         |
| ------------------------- | --------------------------------------------------- | ---------- | ------------------------------ |
| `sanitizeIpcError`        | `src/preload/sanitizeIpcError.ts`                   | ERR-01.1–3 | Unit: 8 cenários               |
| `applySafeIpc`            | `src/preload/sanitizeIpcError.ts`                   | ERR-01.4   | Unit: 3 cenários               |
| Aplicação no api object   | `src/preload/index.ts`                              | ERR-01.5   | E2E: fluxo auth                |
| `ipcErrorMessage`         | `src/renderer/src/hooks/useIpcError.ts`             | ERR-02     | Unit: 7 cenários               |
| Catch blocks × 6          | Vários páginas/componentes                          | ERR-03     | E2E: training/dashboard        |
| Catch blocks × 2          | GroupsPage, GroupCard                               | ERR-04     | E2E: groups crud               |
| `getDb()`                 | `src/main/db/client.ts`                             | ERR-05.1   | Unit: test actualizado         |
| Mensagens genéricas       | `src/main/ipc/*.ts` (6 ficheiros)                   | ERR-06     | Unit: 5 ficheiros actualizados |
| `ErrorBoundary`           | `src/renderer/src/components/app/ErrorBoundary.tsx` | ERR-07     | Unit: 3 cenários               |
| `ErrorBoundary` aplicação | `src/renderer/src/App.tsx`                          | ERR-07.2   | —                              |
