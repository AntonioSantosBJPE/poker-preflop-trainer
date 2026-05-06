# Replace Native `<select>` with shadcn/Radix Select

## Scope Assessment

| Dimension                | Value                                            |
| ------------------------ | ------------------------------------------------ |
| **Tamanho**              | Medium                                           |
| **Source files**         | 2 componentes + 2 E2E + 0 unit tests existentes  |
| **Dependências novas**   | Nenhuma (shadcn Select + radix-ui já instalados) |
| **Mudança arquitetural** | Mínima — `register()` → `Controller` nos selects |

## Problem

Existem 3 `<select>` nativos em 2 componentes de editor de situação. O resto do app já usa shadcn Select (`FormSelectField` ou `<Select>` direto). Esses 3 precisam ser substituídos para consistência visual e de comportamento (Radix Select gerencia acessibilidade, focus, keyboard nav, tema).

## Requirement IDs

### R1 — SituationForm: groupId select

O `<select id="situation-group" data-testid="situation-group-select">` em `SituationForm.tsx:37-56` deve ser substituído por shadcn `<Select>`.

**Atualmente:** `<select {...register('groupId', { setValueAs }) }>` com `<option value="">Selecione um grupo…</option>` + options dos grupos.

**Após:** shadcn `<Select>` controlado via `Controller` do react-hook-form. Valor vazio/"Selecione um grupo…" tratado como placeholder do SelectValue.

- Mantém `data-testid="situation-group-select"` no `SelectTrigger`
- `setValueAs` lógica (string vazia → 0, parse → Number) mantida no `Controller`
- Placeholder visível: `"Selecione um grupo…"`

### R2 — SituationForm: position select

O `<select id="situation-position">` em `SituationForm.tsx:65-75` deve ser substituído por shadcn `<Select>`.

**Atualmente:** `<select {...register('position')}>` com options das POSITIONS (UTG, HJ, CO, BTN, SB, BB).

**Após:** shadcn `<Select>` controlado via `Controller`. POSITIONS mapeadas diretamente para `<SelectItem>`.

### R3 — SituationActionsEditor: actionType select

O `<select>` em `SituationActionsEditor.tsx:90-99` deve ser substituído por shadcn `<Select>`.

**Atualmente:** `<select {...register('actions.${index}.actionType')}>` com options dos ACTION_TYPES.

**Após:** shadcn `<Select>` controlado via `Controller` com field name `actions.${index}.actionType`.

### R4 — Testes E2E: atualizar interação com selects

Três arquivos E2E usam `selectOption()` em `situation-group-select`:

| Arquivo                               | Linha | Uso                                                                        |
| ------------------------------------- | ----- | -------------------------------------------------------------------------- |
| `e2e/situation-edit.spec.ts`          | 80    | `getByTestId('situation-group-select').selectOption({ label: groupName })` |
| `e2e/range-grid-improvements.spec.ts` | 18    | `getByTestId('situation-group-select').selectOption({ label: groupName })` |

Trocar para `selectShadcnOption(page, 'Grupo', groupName)`.

### R5 — Testes unitários

Nenhum teste unitário cobre `SituationForm` ou `SituationActionsEditor` diretamente. `SituationEditPage` não tem teste unitário. Portanto:

- **Nenhum teste unitário existente quebra.**
- Não criar testes novos (fora do escopo desta spec — pode ser tarefa futura).

### R6 — Interface dos componentes

`SituationForm` e `SituationActionsEditor` precisam receber `control` (de `useForm`) além de `register`. O parâmetro `register` permanece pois outros campos (Input, Textarea, color input) continuam usando register.

**Mudanças de props:**

```diff
 // SituationForm
 export interface SituationFormProps {
   register: UseFormRegister<SituationEditorFormValues>;
+  control: Control<SituationEditorFormValues>;
   errors: FieldErrors<SituationEditorFormValues>;
   groups: GroupSummaryDto[];
 }

 // SituationActionsEditor
 export interface SituationActionsEditorProps {
   fields: SituationActionField[];
   register: UseFormRegister<SituationEditorFormValues>;
+  control: Control<SituationEditorFormValues>;
   getValues: UseFormGetValues<SituationEditorFormValues>;
   ...
 }
```

## Arquivos Afetados

| File                                                                | Change                                                                  |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/renderer/src/components/situations/SituationForm.tsx`          | R1, R2: trocar 2 `<select>` por shadcn Select, adicionar `control` prop |
| `src/renderer/src/components/situations/SituationActionsEditor.tsx` | R3: trocar 1 `<select>` por shadcn Select, adicionar `control` prop     |
| `src/renderer/src/pages/SituationEditPage.tsx`                      | R6: passar `control` para SituationForm e SituationActionsEditor        |
| `e2e/situation-edit.spec.ts`                                        | R4: `selectOption` → `selectShadcnOption`                               |
| `e2e/range-grid-improvements.spec.ts`                               | R4: `selectOption` → `selectShadcnOption`                               |

## Dependências

```
Nenhuma — todos os componentes shadcn e pacotes já instalados.
```

## Verification

1. `pnpm test:unit` passa sem regressão
2. `pnpm exec playwright test --project=chromium e2e/situation-edit.spec.ts e2e/range-grid-improvements.spec.ts` passa
3. Inspeção visual: selects no editor de situação têm mesma aparência que os outros shadcn Selects do app
4. Grupo vazio (`groupId = 0`) mostra placeholder "Selecione um grupo…"
