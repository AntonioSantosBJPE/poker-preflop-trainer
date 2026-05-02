# Perfil do Utilizador e Preferências Padrão — Design

**Status:** Draft  
**Spec:** `./spec.md`  
**Requisitos cobertos:** PROF-01 a PROF-16

---

## 1. Visão Geral da Arquitetura

A feature deve ser aditiva e alinhada ao padrão já usado no projeto: `schema/DB helpers -> ipcMain.handle -> preload -> window.api -> stores/components/pages`.

Os dois problemas centrais têm naturezas diferentes e serão tratados separadamente:

1. **Conta autenticada**: nome e senha continuam a pertencer ao domínio de `users`.
2. **Preferências do utilizador**: passam a viver numa estrutura própria, desacoplada da tabela `users`, para suportar expansão futura e sem misturar auth com configurações de UX.

Fluxo proposto:

```text
auth:login / auth:me
  -> validam sessão
  -> devolvem snapshot da conta + preferências efetivas
  -> renderer hidrata stores de auth e preferências

profile:updateName / profile:changePassword / profile:updatePreferences
  -> validam payload
  -> atualizam users ou user_preferences
  -> devolvem snapshot atualizado quando aplicável
  -> renderer sincroniza UI sem reload completo
```

---

## 2. Code Reuse Analysis

### Componentes e padrões a reutilizar

| Reuso | Local | Como será aproveitado |
| --- | --- | --- |
| Store de auth | `src/renderer/src/stores/auth.ts` | Continuar como fonte do utilizador autenticado; hidratação passa a aceitar snapshot enriquecido |
| Store de tema atual | `src/renderer/src/stores/theme.ts` | Servirá de referência para migração da responsabilidade de tema para a nova store de preferências |
| Form fields | `src/renderer/src/components/forms/*` | Reutilizar `FormField`, `FormNumberField`, `FormSelectField`, `FieldError` e padrões de layout |
| Sessão de treino | `src/renderer/src/components/training/SingleTrainingConfigForm.tsx` | Substituir defaults hardcoded pelos defaults efetivos da conta |
| Sessão simultânea | `src/renderer/src/components/training/SimultaneousTrainingConfigForm.tsx` | Idem, incluindo `tableCount` |
| Auth schemas | `src/shared/forms/authSchemas.ts` | Reaproveitar regras de nome e senha mínima para consistência |
| Auth IPC | `src/main/ipc/auth.ts` | Estender `login` e `me` para devolver snapshot com preferências |
| Registo IPC | `src/main/ipc/register.ts` | Adicionar registo do novo módulo `profile.ts` |

### Pontos de integração

| Sistema | Integração |
| --- | --- |
| `users` | Update de `name` e `passwordHash` |
| Novo armazenamento de preferências | Leitura/upsert por `userId` |
| Shell autenticado | Link/atalho para `/profile` e sincronização do toggle de tema |
| Formulários de treino | Consumo dos defaults efetivos via store |

---

## 3. Modelo de Dados

### 3.1 Nova tabela `user_preferences`

Local: `src/main/db/schema.ts`

```ts
export const userPreferences = sqliteTable('user_preferences', {
  userId: integer('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  theme: text('theme'),
  defaultTrainingTotalHands: integer('default_training_total_hands'),
  defaultTrainingTimerSeconds: integer('default_training_timer_seconds'),
  defaultTrainingFeedbackMode: text('default_training_feedback_mode'),
  defaultSimultaneousTableCount: integer('default_simultaneous_table_count'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});
```

### 3.2 Justificação da tabela separada

- Evita poluir `users` com preferências de UI/fluxo.
- Permite semântica de "não configurado" via campos nulos.
- Facilita `upsert` isolado de preferências sem tocar em credenciais.
- Mantém migração **aditiva**, preservando utilizadores, grupos, situações e histórico existentes.

### 3.3 Fallbacks efetivos

Os valores nulos não significam erro; significam "usar o comportamento atual da app".

```ts
const DEFAULT_USER_PREFERENCES = {
  theme: 'dark',
  defaultTrainingTotalHands: 25,
  defaultTrainingTimerSeconds: 0,
  defaultTrainingFeedbackMode: 'IMMEDIATE',
  defaultSimultaneousTableCount: 2,
} as const;
```

Estes fallbacks devem ser centralizados num único local partilhado pelo renderer para evitar repetição dos hardcodes hoje espalhados nos formulários.

---

## 4. Tipos Partilhados e Validação

### 4.1 `src/shared/constants.ts`

Adicionar enum/constantes partilhadas para tema:

```ts
export const THEME_MODES = ['light', 'dark'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];
```

### 4.2 `src/shared/ipc/types.ts`

Adicionar:

```ts
export type UserPreferencesDto = {
  theme: ThemeMode | null;
  defaultTrainingTotalHands: number | null;
  defaultTrainingTimerSeconds: number | null;
  defaultTrainingFeedbackMode: FeedbackMode | null;
  defaultSimultaneousTableCount: SimultaneousTableCount | null;
};

export type AuthSessionDto = {
  user: UserDto;
  preferences: UserPreferencesDto;
};
```

### 4.3 `src/shared/forms/profileSchemas.ts`

Novo ficheiro com três grupos de schema:

1. `profileNameSchema`
2. `profileChangePasswordSchema`
3. `profilePreferencesSchema`

Regras principais:

- nome: reaproveitar constraints de `registerFormSchema` (`trim`, `min 1`, `max 120`)
- senha atual: obrigatória
- nova senha: `min 8`
- nova senha diferente da senha atual
- `defaultTrainingTotalHands`: inteiro `1..500`
- `defaultTrainingTimerSeconds`: inteiro `>= 0`
- `defaultTrainingFeedbackMode`: `FEEDBACK_MODES`
- `defaultSimultaneousTableCount`: `2 | 3 | 4`
- `theme`: `THEME_MODES`

---

## 5. Main Process

### 5.1 DB helper dedicado

Novo módulo: `src/main/db/profile.ts`

Funções previstas:

| Função | Responsabilidade |
| --- | --- |
| `getUserPreferences(db, userId)` | Retorna preferências cruas do utilizador ou `null`/objeto vazio |
| `buildAuthSessionSnapshot(db, userId)` | Lê `users` + `user_preferences` e monta `AuthSessionDto` |
| `updateUserName(db, userId, name)` | Atualiza `users.name` |
| `changeUserPassword(db, userId, currentPassword, newPassword)` | Valida hash atual e grava novo hash bcrypt |
| `upsertUserPreferences(db, userId, payload)` | Faz upsert parcial de preferências |

### 5.2 Estratégia de password change

- Ler utilizador autenticado por `userId`.
- `bcrypt.compare(currentPassword, user.passwordHash)`.
- Se falhar: lançar `Error('Senha atual inválida')`.
- Se passar: gerar novo hash com `BCRYPT_ROUNDS`.
- Atualizar apenas `passwordHash`.
- Não invalidar o JWT atual no MVP; a sessão local continua válida.

### 5.3 IPC

Novo módulo: `src/main/ipc/profile.ts`

Canais:

| Canal | Payload | Retorno |
| --- | --- | --- |
| `profile:updateName` | `{ name: string }` | `AuthSessionDto` |
| `profile:changePassword` | `{ currentPassword: string; newPassword: string }` | `void` |
| `profile:updatePreferences` | `UserPreferencesDto-like` | `AuthSessionDto` |

### 5.4 Ajustes em `auth.ts`

Os canais atuais devem continuar estáveis em nome, mas o payload de retorno passa a ser enriquecido:

- `auth:login` -> `{ token, user, preferences }`
- `auth:me` -> `{ user, preferences } | null`

Isto reduz round-trips e permite hidratar o estado do renderer logo no bootstrap autenticado.

### 5.5 `register.ts`

Adicionar `registerProfileIpc()` ao agregador único, mantendo o padrão modular do projeto.

---

## 6. Preload e API do Renderer

### 6.1 `src/preload/index.ts`

Adicionar namespace mínimo:

```ts
profile: {
  updateName: (name: string) => ipcRenderer.invoke('profile:updateName', { name }),
  changePassword: (currentPassword: string, newPassword: string) =>
    ipcRenderer.invoke('profile:changePassword', { currentPassword, newPassword }),
  updatePreferences: (payload: unknown) =>
    ipcRenderer.invoke('profile:updatePreferences', payload),
}
```

### 6.2 `src/renderer/src/env.d.ts`

Atualizar:

- tipos de retorno de `auth.login` e `auth.me`
- novo namespace `profile`
- tipos de `UserPreferencesDto` e `AuthSessionDto`

---

## 7. Renderer

### 7.1 Store de preferências

Novo módulo: `src/renderer/src/stores/preferences.ts`

Responsabilidades:

- guardar snapshot atual de preferências do utilizador autenticado
- expor valores efetivos com fallbacks
- aplicar/remover classe `dark` no DOM
- suportar hidratação inicial a partir do snapshot de auth
- suportar atualização otimista após guardar preferências

Shape sugerido:

```ts
type PreferencesState = {
  raw: UserPreferencesDto | null;
  ready: boolean;
  hydrate: (prefs: UserPreferencesDto | null) => void;
  clear: () => void;
  getEffective: () => EffectiveUserPreferences;
  setThemeLocally: (theme: ThemeMode) => void;
};
```

### 7.2 Relação com o store de auth

`useAuthStore.refresh()` deixa de consumir apenas `user`:

- chama `window.api.auth.me()`
- se houver sessão, faz `set({ user: snapshot.user, ready: true })`
- hidrata `usePreferencesStore` com `snapshot.preferences`
- se não houver sessão, limpa auth e preferências

O mesmo vale para o pós-login e para respostas de `profile:updateName` / `profile:updatePreferences`.

### 7.3 Página de perfil

Novo ficheiro: `src/renderer/src/pages/ProfilePage.tsx`

Secções:

1. **Conta**
   - nome editável
   - e-mail read-only
2. **Segurança**
   - senha atual
   - nova senha
3. **Preferências**
   - tema
   - número de mãos por defeito
   - timer padrão
   - feedback mode padrão
   - número de mesas simultâneas padrão

### 7.4 Navegação

- Nova rota protegida: `/profile`
- Acesso recomendado: link "Perfil" no bloco do utilizador no `AppSidebar`
- Não substituir o logout; complementar

### 7.5 Componente de senha

Dois níveis, alinhados ao padrão atual:

1. `src/renderer/src/components/ui/password-input.tsx`
   - baixo nível
   - compõe `Input` + botão mostrar/esconder
   - pode usar `lucide-react` (`Eye`, `EyeOff`)
2. `src/renderer/src/components/forms/PasswordField.tsx`
   - wrapper com `Label`, `FieldError` e integração fácil com RHF

Reuso obrigatório:

- `LoginPage.tsx`
- secção de segurança da `ProfilePage.tsx`

### 7.6 Aplicação dos defaults nos formulários de treino

Arquivos-alvo:

- `src/renderer/src/components/training/SingleTrainingConfigForm.tsx`
- `src/renderer/src/components/training/SimultaneousTrainingConfigForm.tsx`

Estratégia:

- substituir `defaultValues` hardcoded por valores vindos da store de preferências
- usar `reset(...)` apenas quando a store estiver pronta e o formulário ainda não tiver sido editado
- manter `groupId` e `situationIds` fora do escopo das preferências

### 7.7 Toggle de tema no shell

O toggle atual do `AppSidebar` não deve desaparecer. Ele passa a:

1. atualizar imediatamente o tema em memória/DOM
2. persistir a mesma preferência do perfil via `profile:updatePreferences`
3. manter o perfil sincronizado quando o utilizador abrir a página depois

---

## 8. Error Handling Strategy

| Cenário | Tratamento | Impacto no utilizador |
| --- | --- | --- |
| Senha atual inválida | erro explícito no IPC (`Senha atual inválida`) | feedback claro sem logout |
| Preferência inválida por bypass | validação Zod no main | dados não corrompem a DB |
| Utilizador sem linha em `user_preferences` | fallback efetivo em memória | app continua funcional |
| Hidratação tardia das preferências | `reset` guardado por `isDirty`/flag de init | evita sobrescrever inputs |
| Falha ao persistir tema pelo toggle | manter erro visível e opcionalmente reverter estado | evita divergência silenciosa |

---

## 9. Tech Decisions

| Decisão | Escolha | Racional |
| --- | --- | --- |
| Armazenamento de preferências | tabela `user_preferences` separada | melhor extensibilidade e semântica de valores nulos |
| Hidratação inicial | enriquecer `auth:login` e `auth:me` com preferências | menos round-trips e bootstrap mais consistente |
| Tema | store unificada de preferências + aplicação imediata no DOM | evita fontes duplas de verdade |
| Reuso de senha | `password-input` + `PasswordField` | reutilização em auth e perfil sem copiar lógica |
| Outras preferências a incluir no MVP | `defaultTotalHands` além de timer/feedback/mesas/tema | já existe no fluxo de treino, hoje hardcoded e faz sentido como default global |

---

## 10. Notas de Implementação

- A migração deve ser **aditiva**; não há decisão de limpeza de DB para esta feature.
- Os handlers continuam assíncronos e consumidos apenas via `window.api`.
- Testes unitários de DB devem seguir o padrão já adotado no projeto: `drizzle-orm/sql-js` + `vi.mock('better-sqlite3')`.
- Qualquer alteração no shape de `auth:login` / `auth:me` exige atualização coordenada de preload, renderer e testes.
