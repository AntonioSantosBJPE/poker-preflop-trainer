# Training Session Context Design

**Spec**: `.specs/features/training-session-context/spec.md`  
**Status**: Draft

---

## Architecture Overview

Esta feature adiciona contexto analitico explicito diretamente em `training_sessions` e propaga esse contexto pelos fluxos que ja existem hoje: criacao de sessao individual, criacao de treino simultaneo e consultas de estatisticas.

O desenho evita novas entidades de analytics e evita heuristicas de agrupamento por timestamp. Em vez disso:

1. toda nova sessao passa a gravar metadados explicitos de contexto;
2. o treino simultaneo compartilha um identificador de bloco entre todas as mesas criadas no mesmo arranque;
3. os endpoints de stats continuam os mesmos, mas passam a aceitar filtros validados de tipo de sessao e quantidade de mesas;
4. a UI de estatisticas compoe esses novos filtros com os filtros atuais de grupo.

Fluxo previsto:

- `training:startSession` cria uma linha em `training_sessions` com contexto `single`
- `simultaneous-training:startSession` cria N linhas em transacao com o mesmo `sessionBlockId` e contexto `simultaneous`
- `stats:*` valida `StatsFilters`, aplica clausulas adicionais sobre `training_sessions` e devolve os mesmos DTOs agregados de hoje
- `StatsPage` adiciona controles de filtro e continua consumindo `overview`, `timeline`, `bySituation` e `worstHands`

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component                    | Location                               | How to Use                                                                          |
| ---------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------- |
| Schema atual de sessoes      | `src/main/db/schema.ts`                | Estender `trainingSessions` com colunas de contexto em vez de criar tabela paralela |
| Criacao de sessao individual | `src/main/ipc/training.ts`             | Reaproveitar fluxo atual e apenas enriquecer payload persistido                     |
| Criacao de treino simultaneo | `src/main/ipc/simultaneousTraining.ts` | Reaproveitar validacao atual e adicionar transacao + metadados comuns               |
| Queries de stats             | `src/main/ipc/stats.ts`                | Estender `sessionWhereClause` para suportar filtros novos sem criar novos canais    |
| Contratos compartilhados     | `src/shared/ipc/types.ts`              | Tipar os novos filtros de stats e o contexto de sessao                              |
| Schemas Zod existentes       | `src/shared/forms/trainingSchemas.ts`  | Manter padrao de parsers compartilhados; criar parser dedicado para stats           |
| API preload                  | `src/preload/index.ts`                 | Preservar canais IPC e apenas tipar melhor os filtros                               |
| Pagina de estatisticas       | `src/renderer/src/pages/StatsPage.tsx` | Expandir estado local e refetch existente, sem trocar o fluxo principal da pagina   |

### Integration Points

| System           | Integration Method                                                                                        |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| SQLite / Drizzle | Novas colunas em `training_sessions` + migration incremental                                              |
| Main IPC         | Mesmo conjunto de canais `training:*`, `simultaneous-training:*` e `stats:*`                              |
| Preload          | Mesmos metodos expostos em `window.api.stats.*`, agora com filtros tipados                                |
| Renderer         | Controles adicionais em `StatsPage` compostos com o filtro por grupo ja existente                         |
| E2E              | Extensao de `e2e/stats.spec.ts`, `e2e/situation-groups/stats-filter.spec.ts` e specs de treino simultaneo |

---

## Components

### 1. Session Context Persistence

- **Purpose**: Garantir que toda nova sessao de treino grave contexto analitico explicito.
- **Location**: `src/main/db/schema.ts`, `src/main/ipc/training.ts`, `src/main/ipc/simultaneousTraining.ts`
- **Interfaces**:
  - `training:startSession(config)` persiste uma sessao `single`
  - `simultaneous-training:startSession(config)` persiste N sessoes `simultaneous` com `sessionBlockId` comum
- **Dependencies**: Drizzle, `requireUserId`, schemas compartilhados
- **Reuses**: Fluxos atuais de criacao de sessao e validacao de payload

### 2. Session Insert Metadata Helper

- **Purpose**: Centralizar a montagem dos metadados de contexto para evitar divergencia entre treino individual e simultaneo.
- **Location**: novo helper em `src/main/services/` ou util adjacente a `training.ts`
- **Interfaces**:
  - `buildSessionContext(params): { sessionType; sessionBlockId; simultaneousTableCount }`
  - `createTrainingSessionValues(config, context): InsertPayload`
- **Dependencies**: Tipos compartilhados, `node:crypto` para gerar `sessionBlockId`
- **Reuses**: Campos ja persistidos em `training_sessions`

### 3. Stats Filter Parser

- **Purpose**: Validar no backend os filtros novos e impedir combinacoes ambiguas.
- **Location**: novo arquivo em `src/shared/forms/`, preferencialmente `statsSchemas.ts`
- **Interfaces**:
  - `parseStatsFilters(raw): StatsFilters`
- **Dependencies**: `zod`, tipos compartilhados de stats
- **Reuses**: Mesmo padrao de parse ja usado em `trainingSchemas.ts`

### 4. Stats Query Extension

- **Purpose**: Aplicar segmentacao por tipo de sessao e quantidade de mesas sem alterar os DTOs de resposta.
- **Location**: `src/main/ipc/stats.ts`
- **Interfaces**:
  - `stats:overview(filters?)`
  - `stats:bySituation(filters?)`
  - `stats:timeline(filters?)`
  - `stats:worstHands(filters?, limit)`
- **Dependencies**: `sessionWhereClause`, parser de stats, novas colunas de `training_sessions`
- **Reuses**: Estrutura atual de agregacao e saida

### 5. Stats Filter UI

- **Purpose**: Expor os novos filtros no fluxo atual de estatisticas sem reestruturar a pagina inteira.
- **Location**: `src/renderer/src/pages/StatsPage.tsx`
- **Interfaces**:
  - estado local `sessionType`
  - estado local `simultaneousTableCount`
  - composicao com `activeGroupId`
- **Dependencies**: `window.api.stats.*`
- **Reuses**: Ciclo atual de `useEffect` e cards/tabela/grafico ja existentes

---

## Data Models

### Training Session Context

```ts
type SessionType = 'single' | 'simultaneous';

interface TrainingSessionContextColumns {
  sessionType: SessionType | null;
  sessionBlockId: string | null;
  simultaneousTableCount: number | null;
}
```

**Relationships**:

- `sessionType` classifica a sessao para analytics
- `sessionBlockId` identifica o bloco logico de criacao
- `simultaneousTableCount` guarda a carga de multi-mesa quando aplicavel

**Persistence rules**:

- novas sessoes individuais: `sessionType = 'single'`, `sessionBlockId = <uuid>`, `simultaneousTableCount = null`
- novas sessoes simultaneas: `sessionType = 'simultaneous'`, `sessionBlockId = <uuid comum ao bloco>`, `simultaneousTableCount = 2|3|4`
- sessoes legadas: colunas podem permanecer `null`

### Stats Filters

```ts
type SessionTypeFilter = 'single' | 'simultaneous';

interface StatsFilters {
  groupId?: number;
  situationIds?: number[];
  fromTs?: number;
  toTs?: number;
  positions?: Position[];
  sessionType?: SessionTypeFilter;
  simultaneousTableCount?: 2 | 3 | 4;
}
```

**Validation rules**:

- `sessionType` so aceita `'single'` ou `'simultaneous'`
- `simultaneousTableCount` so aceita `2 | 3 | 4`
- `simultaneousTableCount` exige `sessionType = 'simultaneous'`

---

## Legacy Data Strategy

### Decision

Nao reclassificar automaticamente sessoes antigas.

### Rationale

O repositorio ja possui treino simultaneo persistindo multiplas linhas sem `sessionBlockId` nem `sessionType`. Como esses dados nao permitem inferencia confiavel, qualquer backfill heuristico poderia poluir analytics com classificacoes falsas.

### Practical effect

- visao sem filtros: continua incluindo sessoes legadas
- filtro `sessionType`: inclui apenas linhas com `sessionType` explicito compativel
- filtro `simultaneousTableCount`: inclui apenas linhas com `sessionType = 'simultaneous'` e `simultaneousTableCount` valido

---

## Error Handling Strategy

| Error Scenario                                              | Handling                                                        | User Impact                                             |
| ----------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------- |
| `sessionType` invalido em `stats:*`                         | parser rejeita payload com erro claro                           | filtro nao e aplicado e a UI recebe erro deterministico |
| `simultaneousTableCount` invalido                           | parser rejeita payload                                          | evita resultados ambiguos                               |
| `simultaneousTableCount` sem `sessionType = 'simultaneous'` | parser rejeita payload e UI deve limpar/desabilitar esse filtro | evita combinacao invalida                               |
| falha ao criar uma das linhas do treino simultaneo          | usar transacao e abortar tudo                                   | nao deixa bloco parcial persistido                      |
| sessoes legadas sem contexto em view filtrada               | excluir do subconjunto filtrado                                 | analytics segmentado permanece confiavel                |

---

## Tech Decisions

| Decision                         | Choice                                   | Rationale                                                                                       |
| -------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Onde persistir contexto          | Novas colunas em `training_sessions`     | O problema e sobre segmentacao das sessoes ja existentes; evita join/tabela paralela            |
| Nome interno do tipo             | `'single'                                | 'simultaneous'`                                                                                 | Alinha com naming atual do codigo e separa labels de UI dos valores persistidos |
| Identificador de bloco           | `sessionBlockId` textual gerado por UUID | Facil de gerar no main, estavel e compartilhavel entre N linhas                                 |
| Tratamento de legado             | Manter `null` e nao inferir              | Preserva corretude analitica                                                                    |
| Validacao de stats               | Parser Zod dedicado                      | Hoje `stats.ts` aceita `unknown` sem contrato forte; a feature pede validacao backend explicita |
| Compatibilidade IPC              | Reusar os canais `stats:*` existentes    | Menor superficie de mudanca em preload, renderer e testes                                       |
| Atomicidade do treino simultaneo | Insercoes em transacao unica             | Necessario para TSC-13                                                                          |

---

## Implementation Notes

### Schema and Migration

- adicionar tres colunas em `training_sessions`:
  - `session_type` `text` nullable
  - `session_block_id` `text` nullable
  - `simultaneous_table_count` `integer` nullable
- nao aplicar default que force classificacao incorreta em dados antigos

### Main Process

- `training.ts` passa a gerar `sessionBlockId` proprio para cada sessao individual
- `simultaneousTraining.ts` passa a:
  - gerar um unico `sessionBlockId`
  - envolver N inserts numa transacao Drizzle
  - persistir `sessionType = 'simultaneous'` e `simultaneousTableCount`

### Shared Contracts

- expandir `StatsFilters` em `src/shared/ipc/types.ts`
- tipar `window.api.stats.*` em `src/renderer/src/env.d.ts`
- manter `preload/index.ts` com os mesmos canais

### Renderer

- adicionar seletor de tipo de sessao em `StatsPage`
- adicionar seletor de quantidade de mesas, desabilitado ate `sessionType = 'simultaneous'`
- limpar `simultaneousTableCount` quando o utilizador trocar o tipo para `single` ou `all`

### Testing Direction

- unit: parser de stats e clausula de filtro por sessao
- unit/integration: criacao de treino simultaneo persiste bloco comum e contagem correta
- e2e: stats nao filtradas continuam funcionando com grupo
- e2e: filtro por tipo separa treino individual de simultaneo
- e2e: filtro por 2/3/4 mesas retorna apenas o subconjunto esperado

---

## Open Constraints Resolved by This Design

- Nao criar novos endpoints de analytics: resolvido via extensao de `StatsFilters`
- Nao inferir blocos antigos por timestamp: resolvido via `sessionBlockId` apenas para novos dados
- Nao quebrar o fluxo atual: resolvido mantendo comportamento padrao quando nenhum filtro novo estiver ativo
