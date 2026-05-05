# Fix: situations:update FOREIGN KEY constraint failed

## Bug Description

When the user edits a situation that already has completed training sessions, the
`situations:update` handler throws `SqliteError: FOREIGN KEY constraint failed`.

## Root Cause

The handler at `src/main/ipc/situations.ts:159` uses a **delete-and-recreate** strategy:

```
DELETE range_cells  (OK — FK on action_id has ON DELETE CASCADE)
DELETE actions      (FAILS — session_hands.chosen_action_id → actions.id has ON DELETE NO ACTION)
INSERT new actions
INSERT new range_cells
```

Once a training hand references an action via `session_hands.chosen_action_id`, SQLite
prevents deleting that action because the FK constraint is `ON DELETE NO ACTION`.

### FK Dependency Chain

```
situations (id)
  ├── actions (situation_id) ON DELETE CASCADE
  │     ├── range_cells (action_id) ON DELETE CASCADE
  │     └── session_hands (chosen_action_id) ON DELETE NO ACTION  ← BLOCKER
  └── session_hands (situation_id) ON DELETE NO ACTION
```

## Requirements

| ID     | Description                                                                                                              | Verification                          |
| ------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| **R1** | Editing situation metadata (name, position, group, stack) must always work regardless of training history                | Exists + passes                       |
| **R2** | Editing actions/range_cells of a situation WITH training history must not throw FK error                                 | Manual test with DB that has sessions |
| **R3** | Editing actions/range_cells of a situation WITHOUT training history must continue to work (existing behaviour preserved) | Unit test                             |
| **R4** | Existing FK references in `session_hands.chosen_action_id` must remain valid after update                                | Data integrity check                  |
| **R5** | New actions added during edit must be INSERTed with a new ID                                                             | Unit test                             |
| **R6** | Actions removed from the form that have NO training history must be DELETEd (cleanup)                                    | Unit test                             |
| **R7** | Actions removed from the form that HAVE training history must be kept in DB (FK integrity)                               | Unit test                             |

## Design Decision

**Strategy: UPSERT by optional action `id`**

The payload schema (`situationActionInputSchema`) gains an optional `id` field.
The client already has action IDs from `situations:get` (mapped as `k-${id}` clientKey).
When saving, the client includes the action `id` for existing actions; newly created
actions have no `id`.

The update handler changes from delete-and-recreate to:

```python
for each action in payload:
    if action.id is present:
        UPDATE actions SET … WHERE id = action.id
        DELETE range_cells WHERE action_id = action.id
        INSERT range_cells for this action
    else:
        INSERT actions … RETURNING id
        INSERT range_cells with new id

for each old_action_id NOT in payload:
    if no FK ref in session_hands:
        DELETE actions WHERE id = old_action_id  (cascades range_cells)
    else:
        # Keep the action in DB — FK references exist
        # (orphaned from UI but data integrity preserved)
```

### Files to change

| File                                   | Change                                                       |
| -------------------------------------- | ------------------------------------------------------------ |
| `src/shared/forms/situationSchemas.ts` | Add optional `id` to `situationActionInputSchema`            |
| `src/main/ipc/situations.ts`           | Rewrite update transaction: UPSERT by id, conditional delete |
| `src/main/ipc/situations.test.ts`      | Add test for update with existing session_hands refs         |

### Non-goals

- No migration needed (schema/db structure unchanged)
- No client UI changes aside from sending the `id` field (data already available)
- No FK definition changes (`ON DELETE NO ACTION` is correct for data integrity)
