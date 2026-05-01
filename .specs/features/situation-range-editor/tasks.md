# Editor de situação (range + grid) — Tasks

**Spec**: `.specs/features/situation-range-editor/spec.md`  
**Status**: In Progress (T1 concluída)

---

## Execution Plan

### Fase 1 — Fold implícito (sequencial)

T1 → T2

### Fase 2 — Grid maior [P] após T2

T3

---

## Task Breakdown

### T1: Normalizar células não pintadas como FOLD no payload partilhado

**What**: Garantir que, após validação, `rangeCells` cobre as 169 células do grid 13×13, preenchendo vazios com a acção FOLD determinística; rejeitar payload sem acção `FOLD` quando o grid estiver incompleto.  
**Where**: `src/shared/forms/implicitFoldRangeCells.ts` (novo), `src/shared/forms/situationSchemas.ts`, testes em `implicitFoldRangeCells.test.ts` e ajustes em `situationSchemas.test.ts`  
**Depends on**: Nenhuma  
**Reuses**: Constantes de grid 13×13 implícitas (0..12); `ACTION_TYPES` já usado no schema  
**Requirement**: SRANGE-01, SRANGE-02

**Tools**: Skill `preflop-domain` (invariantes de grid); MCP NONE

**Done when**:

- [x] `situationPayloadSchema` / `parseSituationPayload` produzem `rangeCells` com cobertura completa quando existe pelo menos uma acção `FOLD`
- [x] Zero acções `FOLD` com range incompleto → erro de validação claro em PT
- [x] Duas ou mais acções `FOLD` → mesma `clientKey` usada para implícito (primeira por `sortOrder`, empate por ordem no array)
- [x] Testes unitários cobrem os casos acima

**Tests**: unit  
**Gate**: `pnpm test:unit`

---

### T2: (Reservado) Endurecer mensagens / IPC se necessário

**What**: Só se após T1 faltar validação duplicada no `main`; caso contrário marcar como cancelado/N/A.  
**Depends on**: T1  
**Tests**: unit  
**Gate**: `pnpm test:unit`

---

### T3: Aumentar células e rótulos do `RangeGrid13`

**What**: Altura mínima de célula ≥ ~36px e rótulos mais legíveis; hotspot = botão; scroll em viewport estreito.  
**Where**: `src/renderer/src/components/grid/RangeGrid13.tsx`  
**Depends on**: T1 (opcional; pode ser paralelo se não tocar no mesmo fluxo — aqui UI isolada, marcamos dependência leve)  
**Requirement**: SRANGE-03, SRANGE-04

**Tests**: none (smoke visual; `data-testid="range-grid-13"` mantido)  
**Gate**: `pnpm test:unit` + `pnpm typecheck`

---

## Diagrama vs Depends on

| Task | Depends on (corpo) | Diagrama | Status |
| ---- | ------------------ | -------- | ------ |
| T1   | —                  | T1       | OK     |
| T2   | T1                 | T1→T2    | OK     |
| T3   | T1                 | T1→T3    | OK     |

## Co-localização de testes (matrix implícita)

| Task | Camada        | Task Says | Status |
| ---- | ------------- | --------- | ------ |
| T1   | shared/forms  | unit      | OK     |
| T2   | main opcional | unit      | OK     |
| T3   | renderer UI   | none      | OK     |
