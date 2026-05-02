# Situation Groups — Tasks

**Status:** Done ✓  
**Spec:** `spec.md` (GRP-01 a GRP-16 — P1 MVP)  
**Design:** `design.md`  
**Requisitos cobertos:** GRP-01 a GRP-16

---

## Convenções

- `[P]` — pode correr em paralelo com outras tasks do mesmo bloco
- **Gate check** para cada task: comando a correr para verificar que passou
- **SPEC_DEVIATION** — marcado no PR/commit se a implementação divergir do design
- Sub-agentes recebem: esta task + design.md (secção relevante) + CONVENTIONS.md + TESTING.md (quando há gate)

---

## Bloco 0 — Fundações de schema e tipos partilhados

> Estas tasks não têm dependências entre si dentro do bloco, mas o Bloco 1 depende de todas elas estarem concluídas.

---

### T-01 — Schema Drizzle: tabela `situation_groups` + colunas FK [P]

**O quê:** Adicionar `situationGroups` ao `schema.ts`; adicionar `groupId` às tabelas `situations` e `trainingSessions`.

**Onde:**

- `src/main/db/schema.ts`

**Design ref:** §2.1, §2.2, §2.3, §2.4

**O que fazer:**

1. Adicionar export `situationGroups` com colunas: `id`, `userId` (FK→users, cascade delete), `name`, `sortOrder`, `isActive`, `createdAt`, `updatedAt`.
2. Adicionar unique constraint `(userId, name)` via `.unique()` na coluna ou `.uniqueIndex`.
3. Adicionar coluna `groupId: integer('group_id').notNull().references(() => situationGroups.id)` à tabela `situations`.
4. Adicionar coluna `groupId: integer('group_id').references(() => situationGroups.id)` (nullable) à tabela `trainingSessions`.
5. Adicionar relações Drizzle: `situationGroups → situations` (one-to-many), `situations → situationGroups` (many-to-one), `trainingSessions → situationGroups` (many-to-one opcional).

**Depends on:** —

**Reuses:** Padrão das tabelas existentes (`users`, `situations`) em `schema.ts`.

**Done when:**

- `pnpm typecheck` passa sem erros relacionados com o schema.
- Os tipos gerados pelo Drizzle incluem `groupId` em `situations` e `trainingSessions`.

**Gate:** `pnpm typecheck`

---

### T-02 — Migração Drizzle (db:generate + db:reset) [P]

**O quê:** Gerar o ficheiro SQL de migração após T-01 e documentar o procedimento de reset.

**Onde:**

- `src/main/db/migrations/` (novo ficheiro gerado)
- `package.json` (verificar scripts `db:generate`, `db:reset`)

**Design ref:** §2.5, §10

**O que fazer:**

1. Após T-01 estar merged: `pnpm db:generate` para gerar a migration.
2. Verificar que o SQL gerado cria `situation_groups`, adiciona `group_id` a `situations` (NOT NULL) e a `training_sessions` (nullable).
3. Verificar que `pnpm db:reset` funciona (limpa + re-migra) — executar em dev.
4. Fazer commit do ficheiro de migração gerado.

**Depends on:** T-01

**Done when:**

- Ficheiro `src/main/db/migrations/XXXX_situation_groups.sql` existe e contém a DDL esperada.
- `pnpm db:reset && pnpm db:migrate` (ou equivalente) completa sem erros.

**Gate:** `pnpm db:reset` (ou script equivalente de reset+migrate)

---

### T-03 — Tipos partilhados: `GroupSummaryDto`, `groupId` em DTOs existentes [P]

**O quê:** Adicionar `GroupSummaryDto` e atualizar tipos existentes em `src/shared/ipc/types.ts`.

**Onde:**

- `src/shared/ipc/types.ts`

**Design ref:** §5

**O que fazer:**

1. Adicionar export `GroupSummaryDto` com campos: `id`, `name`, `sortOrder`, `isActive`, `situationCount`.
2. Adicionar campo `groupId: number` a `SituationSummaryDto`.
3. Adicionar campo `groupId: number` a `TrainingSessionConfig` (obrigatório).
4. Adicionar campo `groupId?: number` a `StatsFilters` (opcional).

**Depends on:** —

**Reuses:** Padrão de tipos em `types.ts`.

**Done when:** `pnpm typecheck` passa; os tipos estão exportados e acessíveis.

**Gate:** `pnpm typecheck`

---

### T-04 — Schemas Zod: `groupSchemas.ts` novo + atualizar schemas existentes [P]

**O quê:** Criar `src/shared/forms/groupSchemas.ts` e atualizar `situationSchemas.ts` e `trainingSchemas.ts`.

**Onde:**

- `src/shared/forms/groupSchemas.ts` (novo)
- `src/shared/forms/situationSchemas.ts`
- `src/shared/forms/trainingSchemas.ts`

**Design ref:** §6

**O que fazer:**

1. Criar `groupSchemas.ts` com:
   - `groupCreateSchema`: `{ name: z.string().trim().min(1).max(100) }`
   - `groupRenameSchema`: `{ id: z.number().int().positive(), name: ... }`
   - `groupArchiveSchema`: `{ id: z.number().int().positive() }`
   - Funções `parseGroupCreate`, `parseGroupRename`, `parseGroupArchive` (padrão de `trainingSchemas.ts`).
2. Em `situationSchemas.ts`: adicionar `groupId: z.number().int().positive()` ao schema de payload de create/update.
3. Em `trainingSchemas.ts`: adicionar `groupId: z.number().int().positive()` ao `trainingStartSessionSchema` (e ao `trainingStartFormSchema`).
4. Atualizar os tipos inferidos (`TrainingStartFormValues`, `TrainingStartSessionInput`) para incluir `groupId`.

**Depends on:** —

**Done when:** `pnpm typecheck` passa; testes existentes de schemas não quebram; `pnpm test:unit` passa.

**Tests:** Adicionar testes unitários a `groupSchemas.test.ts` (valid/invalid para cada schema — min 3 casos por schema).

**Gate:** `pnpm test:unit`

---

## Bloco 1 — Camada Main (DB helpers + IPC)

> Depende do Bloco 0 (T-01, T-03, T-04). T-05 e T-06 podem correr em paralelo. T-07, T-08, T-09 dependem de T-05/T-06.

---

### T-05 — `src/main/db/groups.ts`: funções DB para grupos [P]

**O quê:** Criar o módulo de funções puras de DB para grupos.

**Onde:**

- `src/main/db/groups.ts` (novo)

**Design ref:** §3

**O que fazer:**

1. Implementar `listGroups(db, userId): Promise<GroupSummaryDto[]>` — lista grupos ativos com `situationCount` (subquery COUNT situações ativas).
2. Implementar `createGroup(db, userId, name): Promise<{ id: number }>` — verifica unicidade `(userId, name)` antes de inserir; lança `'Nome de grupo já existe'` se duplicado.
3. Implementar `renameGroup(db, userId, id, name): Promise<void>` — atualiza nome; verifica unicidade excluindo o próprio id.
4. Implementar `archiveGroup(db, userId, id): Promise<void>` — transação: (1) soft-delete situações do grupo, (2) soft-delete do grupo.
5. Implementar `getGroupOrThrow(db, userId, id): Promise<Group>` — lança se não encontrar.

**Depends on:** T-01, T-03

**Reuses:** Padrão de `getDb()` e queries Drizzle de `situations.ts`/`stats.ts`.

**Done when:** `pnpm typecheck` passa; testes unitários cobrem todos os cenários críticos.

**Tests:** Criar `src/main/db/groups.test.ts` com testes unitários (usando in-memory SQLite ou mock do `db`):

- `listGroups`: retorna lista vazia; retorna grupos com contagem correta.
- `createGroup`: sucesso; lança em nome duplicado.
- `renameGroup`: sucesso; lança em nome duplicado para outro grupo.
- `archiveGroup`: soft-delete em cascata (verifica que situações também ficam inativas).
- `getGroupOrThrow`: lança quando não encontrado.
- Meta: ≥ 80% statement coverage.

**Gate:** `pnpm test:unit`

---

### T-06 — `src/main/ipc/groups.ts`: handlers IPC de grupos [P]

**O quê:** Criar os handlers IPC `groups:list`, `groups:create`, `groups:rename`, `groups:archive`.

**Onde:**

- `src/main/ipc/groups.ts` (novo)

**Design ref:** §4

**O que fazer:**

1. Implementar `registerGroupsIpc()` com `ipcMain.handle` para cada canal.
2. `groups:list` — chama `listGroups`; retorna `GroupSummaryDto[]`.
3. `groups:create` — valida com `parseGroupCreate`; chama `createGroup`; retorna `{ id }`.
4. `groups:rename` — valida com `parseGroupRename`; chama `renameGroup`.
5. `groups:archive` — valida com `parseGroupArchive`; chama `archiveGroup`.
6. Todos os handlers usam `requireUserId()` e `getDb()` (padrão dos handlers existentes).
7. Erros de validação e DB devolvidos como rejeições de Promise (padrão existente).

**Depends on:** T-04, T-05

**Done when:** `pnpm typecheck` passa; testes unitários cobrem handlers.

**Tests:** Criar `src/main/ipc/groups.test.ts`:

- Mock de `requireUserId`, `getDb`, funções DB.
- Testar: validação de input inválido rejeita; input válido delega para DB; erros de DB propagados.
- Meta: ≥ 80% statement coverage.

**Gate:** `pnpm test:unit`

---

### T-07 — Registar `groups` IPC em `register.ts`

**O quê:** Adicionar `registerGroupsIpc()` ao `registerAllIpc()`.

**Onde:**

- `src/main/ipc/register.ts`

**Design ref:** §4

**O que fazer:**

1. Importar `registerGroupsIpc` de `./groups`.
2. Chamar `registerGroupsIpc()` dentro de `registerAllIpc()`.

**Depends on:** T-06

**Done when:** `pnpm typecheck` passa.

**Gate:** `pnpm typecheck`

---

### T-08 — Atualizar `situations.ts` IPC: filtro groupId, create/update/duplicate

**O quê:** Atualizar os handlers IPC de situações para suportar `groupId`.

**Onde:**

- `src/main/ipc/situations.ts`

**Design ref:** §4.1

**O que fazer:**

1. `situations:list` — aceitar filtro opcional `{ groupId?: number }`; adicionar cláusula `eq(situations.groupId, groupId)` quando presente.
2. `situations:create` — payload agora inclui `groupId` (obrigatório via schema atualizado em T-04); persistir `groupId`.
3. `situations:update` — payload inclui `groupId` (permite mover situação para outro grupo — GRP-07).
4. `situations:duplicate` — ao duplicar, copiar `groupId` do original (GRP-09).
5. `situations:list` — adicionar `groupId` ao DTO retornado.

**Depends on:** T-01, T-04

**Done when:** `pnpm typecheck` passa; `pnpm test:unit` passa (schemas atualizados não quebram testes existentes).

**Gate:** `pnpm test:unit`

---

### T-09 — Atualizar `training.ts` IPC: validação cross-group + persistir groupId

**O quê:** Atualizar `training:startSession` para validar cross-group e persistir `groupId`.

**Onde:**

- `src/main/ipc/training.ts`

**Design ref:** §4.1 (training:startSession)

**O que fazer:**

1. `parseTrainingStartSession` já incluirá `groupId` após T-04 — usar resultado parseado.
2. Após parse, buscar `groupId` de todas as `situationIds` fornecidas.
3. Validar que `distinct.size === 1` e que esse valor `=== parsed.groupId`; caso contrário lança erro descritivo.
4. Persistir `groupId` na inserção em `trainingSessions`.

**Depends on:** T-01, T-04

**Done when:** `pnpm typecheck` passa; validação cross-group funciona (coberta por E2E-GRP-06).

**Gate:** `pnpm typecheck`

---

### T-10 — Atualizar `stats.ts` IPC: filtro groupId

**O quê:** Adicionar filtro por `groupId` a `sessionWhereClause` e a todos os canais de stats.

**Onde:**

- `src/main/ipc/stats.ts`

**Design ref:** §4.1 (stats:\*)

**O que fazer:**

1. Em `sessionWhereClause`, adicionar: se `filters?.groupId !== undefined`, adicionar `eq(trainingSessions.groupId, filters.groupId)`.
2. Verificar que todos os canais (`stats:overview`, `stats:bySituation`, `stats:timeline`, `stats:worstHands`) passam `filters` para `sessionWhereClause`.

**Depends on:** T-01, T-03

**Done when:** `pnpm typecheck` passa.

**Gate:** `pnpm typecheck`

---

## Bloco 2 — Preload

### T-11 — Preload: namespace `groups` em `window.api`

**O quê:** Expor `window.api.groups` via contextBridge.

**Onde:**

- `src/preload/index.ts`

**Design ref:** §7

**O que fazer:**

1. Adicionar namespace `groups` ao objeto `api`:
   - `list: () => ipcRenderer.invoke('groups:list')`
   - `create: (name: string) => ipcRenderer.invoke('groups:create', { name })`
   - `rename: (id: number, name: string) => ipcRenderer.invoke('groups:rename', { id, name })`
   - `archive: (id: number) => ipcRenderer.invoke('groups:archive', { id })`
2. Seguir o padrão de whitelist de canais existente (segurança).

**Depends on:** T-07

**Done when:** `pnpm typecheck` passa; `window.api.groups` disponível no renderer.

**Gate:** `pnpm typecheck`

---

## Bloco 3 — Renderer

> T-12 a T-17 podem correr em paralelo após T-11 e Bloco 0/1. T-18 (rotas) depende de T-12, T-13.

---

### T-12 — `GroupsPage` + `GroupCard`: CRUD de grupos [P]

**O quê:** Criar a página de listagem/criação/renomeação/arquivo de grupos.

**Onde:**

- `src/renderer/src/pages/GroupsPage.tsx` (novo)
- `src/renderer/src/components/groups/GroupCard.tsx` (novo)

**Design ref:** §8.1, §8.2

**O que fazer:**

1. `GroupCard` — card com nome do grupo, contagem de situações, botões "Renomear" e "Arquivar".
2. `GroupsPage` — lista grupos via `window.api.groups.list()`; botão "Novo Grupo" abre inline form (input + confirm); renomear abre inline edit; arquivar pede confirmação.
3. Estado vazio: mensagem + CTA "Criar primeiro grupo".
4. Erro de nome duplicado: mostrar mensagem de erro no formulário.
5. Seguir design system (paleta Felt/âmbar, tokens CSS existentes) — usar skill `preflop-design` se necessário.

**Depends on:** T-11, T-03

**Done when:** `pnpm typecheck` passa; componente renderiza sem erros de tipo.

**Gate:** `pnpm typecheck`

---

### T-13 — `GroupDetailPage`: vista do grupo (P2) [P]

**O quê:** Criar a página de detalhe de um grupo com lista de situações.

**Onde:**

- `src/renderer/src/pages/GroupDetailPage.tsx` (novo)

**Design ref:** §8.1, §8.2 (GRP-17/P2)

**O que fazer:**

1. Carregar grupo por id (`window.api.groups.list()` + filtro, ou `window.api.situations.list({ groupId })`).
2. Listar situações do grupo com ações rápidas (editar, arquivar, duplicar).
3. Estado vazio com CTA "Nova situação" (pré-preenche `groupId` via query param ou state).
4. Botão "Nova situação" navega para `/situations/new?groupId=X`.

**Depends on:** T-11, T-08

**Done when:** `pnpm typecheck` passa.

**Gate:** `pnpm typecheck`

---

### T-14 — `SituationsPage`: selector de grupo + filtro [P]

**O quê:** Adicionar dropdown de grupo à página de situações para filtrar a listagem.

**Onde:**

- `src/renderer/src/pages/SituationsPage.tsx`

**Design ref:** §8.3

**O que fazer:**

1. Carregar lista de grupos com `window.api.groups.list()`.
2. Adicionar dropdown "Filtrar por grupo" (opção "Todos" + um item por grupo).
3. Ao selecionar grupo, chamar `window.api.situations.list({ groupId })`.
4. Mostrar breadcrumb ou label com grupo atual.

**Depends on:** T-08, T-11

**Done when:** `pnpm typecheck` passa.

**Gate:** `pnpm typecheck`

---

### T-15 — `SituationEditPage`: campo `groupId` obrigatório [P]

**O quê:** Adicionar campo select obrigatório "Grupo" ao formulário de criação/edição de situação.

**Onde:**

- `src/renderer/src/pages/SituationEditPage.tsx`

**Design ref:** §8.3 (GRP-05, GRP-07, GRP-18)

**O que fazer:**

1. Carregar grupos com `window.api.groups.list()`.
2. Adicionar campo `<select>` obrigatório "Grupo" (label visível, opção placeholder vazia).
3. Ao submeter sem grupo selecionado, mostrar mensagem de erro de validação (GRP-05).
4. Em edição, pré-preencher com `groupId` atual da situação (GRP-07).
5. Se URL tiver query param `?groupId=X` (navegação de `GroupDetailPage`), pré-preencher (GRP-18).
6. Incluir `groupId` no payload enviado para `window.api.situations.create` / `update`.

**Depends on:** T-08, T-11

**Done when:** `pnpm typecheck` passa; formulário bloqueia submissão sem grupo (testado por E2E-GRP-03).

**Gate:** `pnpm typecheck`

---

### T-16 — `TrainingConfigPage`: fluxo dois passos (grupo → situações) [P]

**O quê:** Redesenhar a página de configuração de treino com o fluxo grupo-primeiro.

**Onde:**

- `src/renderer/src/pages/TrainingConfigPage.tsx`

**Design ref:** §8.3, §9 (GRP-10, GRP-11, GRP-12, DC-02)

**O que fazer:**

1. Passo 1: dropdown/radio de grupos ativos. Ao selecionar grupo, avançar para passo 2.
2. Passo 2: checkboxes das situações do grupo selecionado. Botão "Selecionar todas".
3. Botão "Voltar" regressa ao passo 1 e limpa a seleção.
4. Incluir `groupId` no payload de `window.api.training.startSession`.
5. Estado vazio (sem grupos): mensagem + CTA "Criar grupo".
6. Estado vazio (grupo sem situações): mensagem + CTA "Criar situação".

**Depends on:** T-09, T-11

**Done when:** `pnpm typecheck` passa; fluxo funciona (testado por E2E-GRP-05).

**Gate:** `pnpm typecheck`

---

### T-17 — `StatsPage`: tabs horizontais por grupo [P]

**O quê:** Adicionar tabs de grupo à página de estatísticas.

**Onde:**

- `src/renderer/src/pages/StatsPage.tsx`

**Design ref:** §8.3 (GRP-14, GRP-15, GRP-16, DC-03)

**O que fazer:**

1. Carregar grupos com `window.api.groups.list()`.
2. Render de tabs: "Todos" + uma tab por grupo ativo.
3. Estado da tab ativa em `useState` local.
4. Ao mudar tab, passar `groupId` (ou `undefined` para "Todos") a todas as queries de stats.
5. Estado vazio (sem sessões no grupo): mensagem informativa.

**Depends on:** T-10, T-11

**Done when:** `pnpm typecheck` passa; tabs funcionam (testado por E2E-GRP-07).

**Gate:** `pnpm typecheck`

---

### T-18 — `App.tsx` + `Layout.tsx`: rotas e sidebar

**O quê:** Adicionar rotas `/groups` e `/groups/:groupId`; adicionar item "Grupos" à sidebar.

**Onde:**

- `src/renderer/src/App.tsx`
- `src/renderer/src/components/Layout.tsx`

**Design ref:** §8.1, §8.3

**O que fazer:**

1. Em `App.tsx`: importar `GroupsPage` e `GroupDetailPage`; adicionar rotas `/groups` e `/groups/:groupId` protegidas.
2. Em `Layout.tsx`: adicionar `NavLink` "Grupos" com link para `/groups` entre "Situações" e "Treino".

**Depends on:** T-12, T-13

**Done when:** `pnpm typecheck` passa; rotas navegáveis.

**Gate:** `pnpm typecheck`

---

## Bloco 4 — Testes E2E

> Depende de todo o Bloco 3 estar concluído. T-19 a T-26 podem correr em paralelo entre si.

---

### T-19 — E2E: `crud-groups.spec.ts` (E2E-GRP-01, E2E-GRP-02) [P]

**O quê:** Testes E2E de CRUD de grupos.

**Onde:** `e2e/situation-groups/crud-groups.spec.ts` (novo)

**Design ref:** spec.md §Testing Strategy — E2E-GRP-01, E2E-GRP-02

**O que fazer:**

1. E2E-GRP-01: criar grupo "NL5" → renomear para "NL5 6-Max" → arquivar → verificar que não aparece na lista.
2. E2E-GRP-02: criar grupo com nome duplicado → verificar erro de validação visível na UI.
3. Usar fixtures `PT_E2E_*` e helpers existentes (ver skill `preflop-e2e-playwright`).
4. Cada teste cria os dados de que precisa; sem estado global partilhado.

**Depends on:** T-12, T-18 + skill `preflop-e2e-playwright` lida

**Gate:** `pnpm test:e2e --grep "crud-groups"` (ou equivalente)

---

### T-20 — E2E: `situation-group-field.spec.ts` (E2E-GRP-03) [P]

**O quê:** Teste E2E do campo grupo obrigatório no formulário de situação.

**Onde:** `e2e/situation-groups/situation-group-field.spec.ts` (novo)

**O que fazer:**

1. E2E-GRP-03: tentar criar situação sem selecionar grupo → formulário bloqueia com mensagem de erro.

**Depends on:** T-15, T-18

**Gate:** `pnpm test:e2e --grep "situation-group-field"`

---

### T-21 — E2E: `archive-cascade.spec.ts` (E2E-GRP-04) [P]

**O quê:** Teste E2E de cascata de arquivo.

**Onde:** `e2e/situation-groups/archive-cascade.spec.ts` (novo)

**O que fazer:**

1. E2E-GRP-04: criar grupo com situações → arquivar grupo → verificar que situações desaparecem das listas ativas.

**Depends on:** T-12, T-14, T-18

**Gate:** `pnpm test:e2e --grep "archive-cascade"`

---

### T-22 — E2E: `training-selection.spec.ts` (E2E-GRP-05, E2E-GRP-06) [P]

**O quê:** Testes E2E de seleção de treino e validação cross-group.

**Onde:** `e2e/situation-groups/training-selection.spec.ts` (novo)

**O que fazer:**

1. E2E-GRP-05: selecionar grupo "NL5" → grupo "NL10" fica bloqueado; desmarcar todas NL5 → NL10 disponível.
2. E2E-GRP-06: bypass deliberado da UI (chamar `window.api.training.startSession` com `situationIds` de grupos misturados) → verificar que o main process rejeita com erro.

**Depends on:** T-09, T-16, T-18

**Gate:** `pnpm test:e2e --grep "training-selection"`

---

### T-23 — E2E: `stats-filter.spec.ts` (E2E-GRP-07) [P]

**O quê:** Teste E2E de filtro de stats por grupo.

**Onde:** `e2e/situation-groups/stats-filter.spec.ts` (novo)

**O que fazer:**

1. E2E-GRP-07: treinar só com NL5 → abrir stats → tab NL2 mostra estado vazio → tab NL5 mostra dados.

**Depends on:** T-17, T-18

**Gate:** `pnpm test:e2e --grep "stats-filter"`

---

### T-24 — E2E: `full-flow.spec.ts` (E2E-GRP-08) [P]

**O quê:** Teste E2E de fluxo completo (maior valor).

**Onde:** `e2e/situation-groups/full-flow.spec.ts` (novo)

**O que fazer:**

1. E2E-GRP-08: criar grupo → criar situação → treinar → ver stats filtradas por grupo.
2. Este é o teste de maior valor — cobrir o happy path completo end-to-end.

**Depends on:** T-19, T-20, T-22, T-23 (dependências implícitas — todas as peças devem estar a funcionar)

**Gate:** `pnpm test:e2e --grep "full-flow"`

---

## Bloco 5 — Verificação final

### T-25 — Verificação completa: typecheck + unit + E2E

**O quê:** Correr a suite completa de verificação.

**Onde:** — (sem ficheiros a alterar)

**O que fazer:**

1. `pnpm typecheck` — zero erros.
2. `pnpm test:unit` — todos os testes passam; novos módulos de grupos com ≥ 80% statement coverage.
3. `pnpm test` — incluindo E2E; os 8 testes E2E-GRP-01 a GRP-08 passam.

**Depends on:** T-19 a T-24

**Gate:** `pnpm test`

---

## Ordem de Execução Recomendada

```
Bloco 0 (paralelo): T-01, T-03, T-04
                          ↓
                         T-02 (depende de T-01)
                          ↓
Bloco 1 (paralelo): T-05, T-06
                          ↓
                    T-07, T-08, T-09, T-10
                          ↓
Bloco 2:            T-11
                          ↓
Bloco 3 (paralelo): T-12, T-13, T-14, T-15, T-16, T-17
                          ↓
                         T-18
                          ↓
Bloco 4 (paralelo): T-19, T-20, T-21, T-22, T-23, T-24
                          ↓
Bloco 5:            T-25
```

---

## Rastreabilidade Spec → Tasks

| Requirement ID | Task(s)                            | Status |
| -------------- | ---------------------------------- | ------ |
| GRP-01         | T-01, T-05, T-06, T-07, T-11, T-12 | Done   |
| GRP-02         | T-01, T-04, T-05, T-06, T-12       | Done   |
| GRP-03         | T-05, T-06, T-12                   | Done   |
| GRP-04         | T-05, T-06, T-12                   | Done   |
| GRP-05         | T-04, T-08, T-15                   | Done   |
| GRP-06         | T-08, T-14                         | Done   |
| GRP-07         | T-04, T-08, T-15                   | Done   |
| GRP-08         | T-01, T-02                         | Done   |
| GRP-09         | T-08                               | Done   |
| GRP-10         | T-09, T-16                         | Done   |
| GRP-11         | T-16                               | Done   |
| GRP-12         | T-04, T-09                         | Done   |
| GRP-13         | T-01, T-09                         | Done   |
| GRP-14         | T-10, T-17                         | Done   |
| GRP-15         | T-03, T-10, T-17                   | Done   |
| GRP-16         | T-17                               | Done   |

**Total tasks P1 MVP:** 25 (T-01 a T-25)  
**Coverage:** GRP-01 a GRP-16 todos cobertos.
