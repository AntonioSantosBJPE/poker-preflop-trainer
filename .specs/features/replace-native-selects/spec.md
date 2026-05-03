# Substituir native `<select>` por shadcn `Select` em HistoryPage e StatsPage

## Problem

`HistoryPage.tsx` e `StatsPage.tsx` usam `<select>` nativo do HTML para os filtros de tipo de sessão e mesas simultâneas. O padrão do projeto é usar o componente `Select` do shadcn/ui (Radix). As páginas foram criadas/modificadas depois da migração shadcn (SHUI-01 a SHUI-18) e não seguiram o padrão.

## Requirements

| ID | Description | Verification |
|----|------------|-------------|
| NSELECT-01 | `HistoryPage.tsx`: filtro "Tipo de sessão" usa `<Select>` shadcn | Render + interação |
| NSELECT-02 | `HistoryPage.tsx`: filtro "Mesas simultâneas" usa `<Select>` shadcn com `disabled` condicional | Render com disabled/abled |
| NSELECT-03 | `StatsPage.tsx`: filtro "Tipo de sessão" usa `<Select>` shadcn preservando `data-testid="stats-session-type-filter"` | Render + query by testid |
| NSELECT-04 | `StatsPage.tsx`: filtro "Mesas simultâneas" usa `<Select>` shadcn preservando `data-testid="stats-simultaneous-count-filter"` com `disabled` condicional | Render + query by testid |
| NSELECT-05 | Testes existentes continuam verdes após as alterações | `pnpm test:unit` |

## Out of Scope

- SituationForm.tsx e SituationActionsEditor.tsx (usam react-hook-form `register` nativo, requerem abordagem diferente com `FormSelectField`)
- Qualquer alteração além da troca de `<select>` → `<Select>`

## Changes

| File | Change |
|------|--------|
| `src/renderer/src/pages/HistoryPage.tsx` | Import shadcn Select; replace 2 `<select>` |
| `src/renderer/src/pages/StatsPage.tsx` | Import shadcn Select; replace 2 `<select>` |

## Design Decision

Usar `<Select>` com `<SelectTrigger>` recebendo `id`/`data-testid`/`className="w-full"`. Manter `htmlFor` no `<Label>` pois o Trigger é focado via `id`. Nenhuma alteração de comportamento — `onValueChange` mapeia diretamente para os handlers existentes que já recebem `string`.
