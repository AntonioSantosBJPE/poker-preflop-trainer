# Situation Groups — Design

**Status:** Draft  
**Requisitos cobertos:** GRP-01 a GRP-16 (P1)  
**Decisões de contexto aplicadas:** DC-01, DC-02, DC-03, DC-04

---

## 1. Visão Geral da Arquitetura

A feature atravessa todas as camadas: schema → DB helpers → IPC handlers → preload → renderer. O padrão já estabelecido no projeto (Drizzle + ipcMain.handle + window.api + React/Zustand) é mantido sem desvios.

```
Renderer (React)
  └── window.api.groups.*          ← preload (contextBridge)
        └── IPC: groups:*          ← src/main/ipc/groups.ts
              └── src/main/db/groups.ts   ← queries Drizzle
                    └── schema: situation_groups table

Situações existentes:
  situations.groupId (FK) → situation_groups.id
  trainingSessions.groupId (FK) → situation_groups.id   [novo campo]
```

---

## 2. Schema — Alterações ao Drizzle

### 2.1 Nova tabela `situation_groups`

```ts
// src/main/db/schema.ts (adição)
export const situationGroups = sqliteTable('situation_groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});
```

**Unique constraint:** `(user_id, name)` — garante GRP-02 ao nível da DB.

### 2.2 Alterações à tabela `situations`

Adicionar coluna `group_id` (FK para `situation_groups`):

```ts
groupId: integer('group_id')
  .notNull()
  .references(() => situationGroups.id);
```

- `NOT NULL` com referência directa — toda situação nova tem grupo obrigatório (GRP-05).
- Situações existentes: migração limpa a DB (DC-04) — sem necessidade de valor DEFAULT.

### 2.3 Alterações à tabela `training_sessions`

Adicionar coluna `group_id` para rastreabilidade histórica (GRP-13):

```ts
groupId: integer('group_id').references(() => situationGroups.id);
```

- Nullable para não quebrar registos antigos (se existirem após clean migration).
- Na prática a migração limpa a DB, mas é boa prática deixar nullable para robustez futura.

### 2.4 Relações Drizzle

```ts
// situationGroups → users (many-to-one)
// situationGroups → situations (one-to-many)
// situations → situationGroups (many-to-one)
// trainingSessions → situationGroups (many-to-one, optional)
```

### 2.5 Migração

- Gerada com `pnpm db:generate` após alterar `schema.ts`.
- Por DC-04 a migração **não precisa de migrar dados** — DB é limpa ao arrancar a nova versão.
- Script de migração: DROP + CREATE das tabelas afetadas é aceitável; o Drizzle gerará `ALTER TABLE` standard; a limpeza será feita por `drizzle-kit push --force` em dev ou pelo utilizador ao reinstalar.
- Alternativa mais simples para dev: `pnpm db:reset` (drop all + migrate fresh).

---

## 3. Módulo `src/main/db/groups.ts` (novo)

Funções puras que recebem `db` e `userId`. Facilitam o teste unitário (P1 da Testing Strategy).

| Função            | Assinatura resumida             | Requisitos               |
| ----------------- | ------------------------------- | ------------------------ |
| `listGroups`      | `(db, userId) → GroupSummary[]` | GRP-01                   |
| `createGroup`     | `(db, userId, name) → id`       | GRP-02                   |
| `renameGroup`     | `(db, userId, id, name) → void` | GRP-03                   |
| `archiveGroup`    | `(db, userId, id) → void`       | GRP-04 + DC-01 (cascata) |
| `getGroupOrThrow` | `(db, userId, id) → Group`      | usado por handlers       |

**`createGroup`**: verifica unicidade `(userId, name)` antes de inserir; lança `'Nome de grupo já existe'` (GRP-02).

**`archiveGroup`**: numa única transação —

1. `UPDATE situations SET is_active=false WHERE group_id=id AND user_id=userId`
2. `UPDATE situation_groups SET is_active=false WHERE id=id AND user_id=userId`
   (DC-01 — cascata de soft-delete)

**`listGroups`** retorna também `situationCount` (subquery COUNT das situações ativas) — GRP-01 AC-1.

---

## 4. IPC — Novos canais `groups:*`

Novo ficheiro: `src/main/ipc/groups.ts`  
Registado em: `src/main/ipc/register.ts` → `registerGroupsIpc()`

| Canal            | Payload entrada                | Retorno             | Requisitos     |
| ---------------- | ------------------------------ | ------------------- | -------------- |
| `groups:list`    | —                              | `GroupSummaryDto[]` | GRP-01         |
| `groups:create`  | `{ name: string }`             | `{ id: number }`    | GRP-02         |
| `groups:rename`  | `{ id: number; name: string }` | `void`              | GRP-03         |
| `groups:archive` | `{ id: number }`               | `void`              | GRP-04 + DC-01 |

**Validação no handler:** todos os inputs passados por Zod (schema `groupCreateSchema`, `groupRenameSchema` em `src/shared/forms/groupSchemas.ts`).

### 4.1 Alterações a canais existentes

**`situations:list`** — payload passa a incluir `groupId` e aceitar filtro opcional `groupId?: number`:

```ts
// Novo parâmetro opcional:
ipcMain.handle('situations:list', async (_e, filters?: { groupId?: number }) => { ... })
```

**`situations:create` / `situations:update`** — payload passa a incluir `groupId: number` (obrigatório). Validação via `parseSituationPayload` (actualizar `situationSchemas.ts`).

**`situations:duplicate`** — preserva `groupId` do original (GRP-09).

**`training:startSession`** — payload passa a incluir `groupId: number`. Validação cross-group adicionada:

```ts
// Verificar que todas as situationIds pertencem ao mesmo groupId
const groups = await db
  .select({ g: situations.groupId })
  .from(situations)
  .where(inArray(situations.id, parsed.situationIds));
const distinct = new Set(groups.map((r) => r.g));
if (distinct.size > 1) throw new Error('Situações de grupos distintos não são permitidas');
if (!distinct.has(parsed.groupId)) throw new Error('groupId não corresponde às situações');
```

Persiste `groupId` em `training_sessions` (GRP-13).

**`stats:overview` / `stats:bySituation` / `stats:timeline` / `stats:worstHands`** — `StatsFilters` passa a incluir `groupId?: number`; `sessionWhereClause` adiciona filtro por `trainingSessions.groupId` quando presente (GRP-15, GRP-16).

---

## 5. Tipos partilhados — `src/shared/ipc/types.ts`

```ts
export type GroupSummaryDto = {
  id: number
  name: string
  sortOrder: number
  isActive: boolean
  situationCount: number
}

// StatsFilters — adicionar campo:
export type StatsFilters = {
  situationIds?: number[]
  fromTs?: number
  toTs?: number
  positions?: Position[]
  groupId?: number          // novo
}

// SituationSummaryDto — adicionar campo:
export type SituationSummaryDto = {
  ...
  groupId: number           // novo
}

// TrainingSessionConfig — adicionar campo:
export type TrainingSessionConfig = {
  situationIds: number[]
  groupId: number           // novo — obrigatório
  totalHands: number
  timerSeconds: number
  feedbackMode: FeedbackMode
}
```

---

## 6. Schemas Zod — `src/shared/forms/groupSchemas.ts` (novo)

```ts
export const groupCreateSchema = z.object({
  name: z.string().trim().min(1, 'Nome obrigatório').max(100, 'Máximo 100 caracteres'),
});

export const groupRenameSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(1, 'Nome obrigatório').max(100, 'Máximo 100 caracteres'),
});

export const groupArchiveSchema = z.object({
  id: z.number().int().positive(),
});
```

`situationSchemas.ts` — adicionar `groupId: z.number().int().positive()` ao schema de create/update.

`trainingSchemas.ts` — adicionar `groupId: z.number().int().positive()` ao `trainingStartFormSchema`.

---

## 7. Preload — `src/preload/index.ts`

Adicionar namespace `groups`:

```ts
groups: {
  list: () => ipcRenderer.invoke('groups:list'),
  create: (name: string) => ipcRenderer.invoke('groups:create', { name }),
  rename: (id: number, name: string) => ipcRenderer.invoke('groups:rename', { id, name }),
  archive: (id: number) => ipcRenderer.invoke('groups:archive', { id })
}
```

---

## 8. Renderer — Páginas e Componentes

### 8.1 Novas rotas

| Rota               | Componente        | Propósito                                 |
| ------------------ | ----------------- | ----------------------------------------- |
| `/groups`          | `GroupsPage`      | Listagem de grupos (GRP-01) + criar grupo |
| `/groups/:groupId` | `GroupDetailPage` | Lista situações do grupo (GRP-17/P2)      |

### 8.2 Componentes novos

| Componente        | Ficheiro                                           | Responsabilidade                                   |
| ----------------- | -------------------------------------------------- | -------------------------------------------------- |
| `GroupsPage`      | `src/renderer/src/pages/GroupsPage.tsx`            | CRUD de grupos (listar, criar, renomear, arquivar) |
| `GroupDetailPage` | `src/renderer/src/pages/GroupDetailPage.tsx`       | P2 — situações do grupo com CTA                    |
| `GroupCard`       | `src/renderer/src/components/groups/GroupCard.tsx` | Card de grupo com nome, count e ações              |

### 8.3 Alterações a páginas existentes

**`SituationsPage`** — adicionar selector de grupo (dropdown); filtrar listagem por grupo selecionado (GRP-06). Breadcrumb mostra grupo atual.

**`SituationEditPage`** — campo `groupId` (select obrigatório) no formulário (GRP-05). Quando acedido via `/groups/:id/situations/new` pré-preenche o grupo (GRP-18/P2).

**`TrainingConfigPage`** — redesenhada conforme DC-02:

1. Passo 1: selector de grupo (dropdown/radio dos grupos ativos).
2. Passo 2: lista de checkboxes das situações do grupo selecionado.
3. Grupos não selecionados ficam bloqueados (GRP-11) — naturalmente garantido pelo fluxo.
4. `groupId` passado no payload de `startSession`.

**`StatsPage`** — tabs horizontais (DC-03): uma tab por grupo ativo + tab "Todos". Ao mudar de tab, `groupId` passado nos filtros de todas as queries (GRP-14, GRP-15, GRP-16). Estado da tab persiste em useState local (não sobrevive a reload — conforme spec).

**`Layout` / sidebar** — adicionar item "Grupos" com link para `/groups` entre "Situações" e "Treino".

### 8.4 Estado Zustand

Não é necessário store global para grupos — dados carregados localmente em cada página com `useEffect`. Exceção: `TrainingConfigPage` pode usar estado local para o grupo selecionado (step 1 → step 2).

---

## 9. Validação Cross-Group

A validação cross-group existe em **duas camadas**:

| Camada       | Mecanismo                                                                                                                | Requisito |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ | --------- |
| UI           | `TrainingConfigPage` — ao selecionar grupo, só mostra situações desse grupo; sem checkboxes de outros grupos disponíveis | GRP-11    |
| Main process | `training:startSession` verifica que todos os `situationIds` pertencem ao mesmo `groupId` recebido                       | GRP-12    |

---

## 10. Migração de Dados (GRP-08 / DC-04)

Por decisão DC-04 **não há migração de dados**. A estratégia de migração é:

1. Gerar nova migração Drizzle com `pnpm db:generate`.
2. A migração cria `situation_groups`, adiciona `group_id` a `situations` e `training_sessions`.
3. Como a coluna `situations.group_id` é `NOT NULL` sem DEFAULT, a migration falhará se houver dados — o que é intencional: garante DB limpa.
4. Em dev: `pnpm db:reset` antes de aplicar.
5. Documentar no CHANGELOG que esta versão requer DB limpa.

---

## 11. Ficheiros Afetados / Criados

### Novos

| Ficheiro                                           | Descrição                |
| -------------------------------------------------- | ------------------------ |
| `src/main/db/groups.ts`                            | Funções DB para grupos   |
| `src/main/ipc/groups.ts`                           | Handlers IPC para grupos |
| `src/shared/forms/groupSchemas.ts`                 | Schemas Zod de grupos    |
| `src/renderer/src/pages/GroupsPage.tsx`            | Página CRUD de grupos    |
| `src/renderer/src/pages/GroupDetailPage.tsx`       | Vista do grupo (P2)      |
| `src/renderer/src/components/groups/GroupCard.tsx` | Card de grupo            |

### Modificados

| Ficheiro                                        | O que muda                                                                                     |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/main/db/schema.ts`                         | Nova tabela `situation_groups`; colunas `groupId` em `situations` e `trainingSessions`         |
| `src/main/ipc/register.ts`                      | Adicionar `registerGroupsIpc()`                                                                |
| `src/main/ipc/situations.ts`                    | `list` aceita filtro; `create`/`update` incluem `groupId`; `duplicate` preserva `groupId`      |
| `src/main/ipc/training.ts`                      | `startSession` valida cross-group e persiste `groupId`                                         |
| `src/main/ipc/stats.ts`                         | `sessionWhereClause` filtra por `groupId`                                                      |
| `src/shared/ipc/types.ts`                       | `GroupSummaryDto`, `groupId` em `SituationSummaryDto`, `TrainingSessionConfig`, `StatsFilters` |
| `src/shared/forms/situationSchemas.ts`          | Adicionar `groupId` obrigatório                                                                |
| `src/shared/forms/trainingSchemas.ts`           | Adicionar `groupId` obrigatório                                                                |
| `src/preload/index.ts`                          | Namespace `groups`                                                                             |
| `src/renderer/src/App.tsx`                      | Rotas `/groups` e `/groups/:groupId`                                                           |
| `src/renderer/src/components/Layout.tsx`        | Item "Grupos" na sidebar                                                                       |
| `src/renderer/src/pages/SituationsPage.tsx`     | Selector de grupo + filtro                                                                     |
| `src/renderer/src/pages/SituationEditPage.tsx`  | Campo `groupId` obrigatório                                                                    |
| `src/renderer/src/pages/TrainingConfigPage.tsx` | Fluxo dois passos (grupo → situações)                                                          |
| `src/renderer/src/pages/StatsPage.tsx`          | Tabs por grupo                                                                                 |

---

## 12. Traceability Update

| Requirement ID | Design Component                                           | Ficheiros chave                                    |
| -------------- | ---------------------------------------------------------- | -------------------------------------------------- |
| GRP-01         | `listGroups` + `groups:list` + `GroupsPage`                | `db/groups.ts`, `ipc/groups.ts`, `GroupsPage.tsx`  |
| GRP-02         | `createGroup` (unique check) + `groups:create`             | `db/groups.ts`, `ipc/groups.ts`, `groupSchemas.ts` |
| GRP-03         | `renameGroup` + `groups:rename`                            | `db/groups.ts`, `ipc/groups.ts`                    |
| GRP-04         | `archiveGroup` (soft-delete) + `groups:archive`            | `db/groups.ts`, `ipc/groups.ts`                    |
| GRP-05         | `groupId` obrigatório em `situations:create`               | `situationSchemas.ts`, `SituationEditPage.tsx`     |
| GRP-06         | Filtro `groupId` em `situations:list`                      | `ipc/situations.ts`, `SituationsPage.tsx`          |
| GRP-07         | `groupId` editável em `situations:update`                  | `ipc/situations.ts`, `SituationEditPage.tsx`       |
| GRP-08         | Migração Drizzle `NOT NULL` sem DEFAULT                    | `schema.ts`, nova migration                        |
| GRP-09         | `duplicate` copia `groupId`                                | `ipc/situations.ts`                                |
| GRP-10         | `TrainingConfigPage` — select-all ao escolher grupo        | `TrainingConfigPage.tsx`                           |
| GRP-11         | `TrainingConfigPage` — só mostra sits do grupo selecionado | `TrainingConfigPage.tsx`                           |
| GRP-12         | `training:startSession` — validação cross-group            | `ipc/training.ts`                                  |
| GRP-13         | `trainingSessions.groupId` persistido                      | `schema.ts`, `ipc/training.ts`                     |
| GRP-14         | Tabs de grupo em `StatsPage`                               | `StatsPage.tsx`                                    |
| GRP-15         | Filtro `groupId` em `stats:*`                              | `ipc/stats.ts`, `types.ts`                         |
| GRP-16         | Estado vazio quando sem sessões no grupo                   | `StatsPage.tsx`                                    |
