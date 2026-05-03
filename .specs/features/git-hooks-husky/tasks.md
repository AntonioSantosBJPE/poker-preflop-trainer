# Git Hooks — Husky Tasks

**Spec**: `.specs/features/git-hooks-husky/spec.md`
**Status**: Done
**Commit**: `8dd350e`

---

## Execution Plan

No parallelism needed — all tasks modify config/scripts/hooks and must run sequentially.

```
T1 → T2 → T3 → T4 → T5 → T6 → T7
```

---

## Task Breakdown

### T1: Install Dependencies

**What**: Add husky, @commitlint/cli, @commitlint/config-conventional to devDependencies
**Where**: `package.json` (via pnpm add)
**Depends on**: None
**Requirement**: HUSKY-05

**Done when**:

- [ ] `pnpm ls husky` shows husky in devDependencies
- [ ] `pnpm ls @commitlint/cli` shows commitlint in devDependencies
- [ ] `pnpm ls @commitlint/config-conventional` shows config in devDependencies

**Tests**: none
**Gate**: build

---

### T2: Initialize Husky Directory

**What**: Create `.husky/` directory structure via `pnpm exec husky init`
**Where**: `.husky/`
**Depends on**: T1
**Requirement**: HUSKY-05

**Done when**:

- [ ] `.husky/pre-commit` exists
- [ ] `.husky/_/` directory exists with husky.sh

**Tests**: none
**Gate**: build

---

### T3: Create Pre-commit Hook

**What**: Configure `.husky/pre-commit` to run `pnpm lint && pnpm format:check && pnpm typecheck`
**Where**: `.husky/pre-commit`
**Depends on**: T2
**Requirement**: HUSKY-01

**Done when**:

- [ ] `.husky/pre-commit` contains the full check commands
- [ ] Running `git commit` triggers lint + format:check + typecheck
- [ ] A commit with lint error is aborted

**Tests**: none
**Gate**: build

---

### T4: Create Pre-push Hook

**What**: Configure `.husky/pre-push` to run `pnpm typecheck && pnpm test`
**Where**: `.husky/pre-push`
**Depends on**: T2
**Requirement**: HUSKY-02

**Done when**:

- [ ] `.husky/pre-push` exists with the check commands
- [ ] Running `git push` triggers typecheck + test

**Tests**: none
**Gate**: build

---

### T5: Create Post-merge Hook

**What**: Configure `.husky/post-merge` to check for changed `package.json`/`pnpm-lock.yaml` and auto-install/rebuild
**Where**: `.husky/post-merge`
**Depends on**: T2
**Requirement**: HUSKY-03

**Done when**:

- [ ] `.husky/post-merge` exists with conditional install + rebuild logic
- [ ] Merge that changes `package.json` triggers install + build
- [ ] Merge that changes only `pnpm-lock.yaml` triggers install only
- [ ] Merge with no relevant changes does nothing

**Tests**: none
**Gate**: build

---

### T6: Create Commitlint Config

**What**: Create `commitlint.config.ts` with conventional commit config
**Where**: `commitlint.config.ts`
**Depends on**: T1
**Requirement**: HUSKY-04

**Done when**:

- [ ] `commitlint.config.ts` exists with `@commitlint/config-conventional` extension
- [ ] Commit-msg hook validates conventional commit format

**Tests**: none
**Gate**: build

---

### T7: Create Commit-msg Hook and Update Package Scripts

**What**: Create `.husky/commit-msg` hook and update `postinstall` script in package.json to init husky on install
**Where**: `.husky/commit-msg`, `package.json`
**Depends on**: T2, T6
**Requirement**: HUSKY-04, HUSKY-05

**Done when**:

- [ ] `.husky/commit-msg` exists calling `npx --no -- commitlint --edit $1`
- [ ] `package.json` `postinstall` includes `husky` (chained with existing electron-rebuild)
- [ ] Fresh clone → `pnpm install` → hooks are active automatically

**Tests**: none
**Gate**: build

---

## Granularity Check

| Task                          | Scope              | Status      |
| ----------------------------- | ------------------ | ----------- |
| T1: Install dependencies      | 1 command          | ✅ Granular |
| T2: Init husky dir            | 1 command          | ✅ Granular |
| T3: Pre-commit hook           | 1 file             | ✅ Granular |
| T4: Pre-push hook             | 1 file             | ✅ Granular |
| T5: Post-merge hook           | 1 file             | ✅ Granular |
| T6: Commitlint config         | 1 file             | ✅ Granular |
| T7: Commit-msg hook + scripts | 2 files (cohesive) | ✅ Granular |

## Test Co-location Validation

N/A — all tasks are tooling/config with no code layers requiring tests.

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows    | Status   |
| ---- | ----------------- | ---------------- | -------- |
| T1   | None              | T1 first         | ✅ Match |
| T2   | T1                | T1 → T2          | ✅ Match |
| T3   | T2                | T2 → T3          | ✅ Match |
| T4   | T2                | T2 → T4          | ✅ Match |
| T5   | T2                | T2 → T5          | ✅ Match |
| T6   | T1                | T1 → T6          | ✅ Match |
| T7   | T2, T6            | T6 → T7; T2 → T7 | ✅ Match |
