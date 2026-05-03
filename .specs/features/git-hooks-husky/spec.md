# Git Hooks — Husky Specification

## Problem Statement

O repositório não possui proteção alguma em commits e pushes — código quebrado, erros de lint ou type errors chegam ao repositório e só são detectados no CI (ou pior, em produção). Também não há automação pós-pull para manter as dependências e build atualizadas, causando erros manuais de `node_modules` desatualizada.

## Goals

- [ ] Bloquear commits com erros de lint, formatação ou tipo
- [ ] Bloquear pushes com testes falhando ou código que não compila
- [ ] Rodar `pnpm install` e rebuild automáticos ao fazer pull (quando `package.json`/`pnpm-lock.yaml` mudam)
- [ ] Validar mensagens de commit no formato conventional commit

## Out of Scope

| Feature                         | Reason                                          |
| ------------------------------- | ----------------------------------------------- |
| Hooks de servidor (server-side) | Foco em hooks client-side via Husky             |
| Substituir CI                   | Hooks são complementares, não substitutos do CI |
| Hooks para branches específicas | Todos os branches usam os mesmos hooks          |

---

## User Stories

### P1: Pre-commit — Validar código antes de commitar ⭐ MVP

**User Story**: Como desenvolvedor, quero que o commit seja bloqueado se houver erro de lint, formatação ou tipo, para que código ruim não entre no repositório.

**Why P1**: Protege a linha de base do repositório.

**Acceptance Criteria**:

1. WHEN o usuário executa `git commit` THEN o hook `pre-commit` SHALL rodar `pnpm lint` + `pnpm format:check` + `pnpm typecheck`
2. WHEN qualquer checagem falha THEN o commit SHALL ser abortado com mensagem de erro clara
3. WHEN todas as checagens passam THEN o commit SHALL prosseguir normalmente

**Independent Test**: Criar um arquivo com erro de lint, tentar commitar — ver hook bloquear. Corrigir, commitar — ver hook passar.

---

### P1: Pre-push — Validar build e testes antes de push ⭐ MVP

**User Story**: Como desenvolvedor, quero que o push seja bloqueado se testes unitários, typecheck ou build falharem, para evitar que código quebrado chegue ao remoto.

**Why P1**: Camada extra de segurança antes do CI.

**Acceptance Criteria**:

1. WHEN o usuário executa `git push` THEN o hook `pre-push` SHALL rodar `pnpm typecheck` + `pnpm test`
2. WHEN qualquer checagem falha THEN o push SHALL ser abortado com mensagem de erro clara
3. WHEN todas as checagens passam THEN o push SHALL prosseguir normalmente

**Independent Test**: Quebrar um teste, tentar push — ver hook bloquear. Corrigir, push — ver hook passar.

---

### P2: Post-merge — Automatizar instalação e rebuild

**User Story**: Como desenvolvedor, quero que `pnpm install` e rebuild rodem automaticamente ao fazer pull/merge se `package.json` ou `pnpm-lock.yaml` mudaram.

**Why P2**: Elimina erro humano de esquecer de instalar dependências ou rebuildar após pull.

**Acceptance Criteria**:

1. WHEN um `git pull` ou `git merge` modifica `package.json` ou `pnpm-lock.yaml` THEN o hook `post-merge` SHALL rodar `pnpm install`
2. WHEN `package.json` é modificado no merge THEN o hook SHALL também rodar `pnpm build:app`
3. WHEN `pnpm-lock.yaml` muda mas `package.json` não THEN o hook SHALL rodar apenas `pnpm install`
4. WHEN nenhum arquivo relevante mudou THEN o hook SHALL não fazer nada (zero overhead)

**Independent Test**: Fazer pull com mudança em package.json — ver install + build rodarem. Fazer pull sem mudanças — ver hook silencioso.

---

### P2: Commitlint — Validar conventional commits

**User Story**: Como desenvolvedor, quero que a mensagem do commit seja validada no formato conventional commit, para manter o histórico padronizado.

**Why P2**: Histórico consistente facilita geração de changelog e rastreabilidade.

**Acceptance Criteria**:

1. WHEN o usuário fornece uma mensagem de commit inválida (ex: `"fix bug"`) THEN o hook `commit-msg` SHALL rejeitar o commit com mensagem de erro
2. WHEN o usuário fornece uma mensagem válida (ex: `"fix(auth): corrige login"`) THEN o commit SHALL prosseguir
3. WHEN o commit é um merge automático (mensagem gerada pelo git) THEN o hook SHALL permitir sem validação

**Independent Test**: Commitar com mensagem sem conventional commit — ver hook rejeitar. Commitar com mensagem válida — ver hook passar.

---

## Edge Cases

- WHEN Husky não está instalado (ex: clonagem nova do repo sem `pnpm install`) THEN o script `postinstall` no `package.json` SHALL configurar o Husky automaticamente
- WHEN o usuário usa `git commit --no-verify` THEN nenhum hook SHALL rodar (respeitar flag `--no-verify` e `-n`)
- WHEN o hook `pre-push` leva muito tempo THEN o usuário SHALL poder usar `--no-verify` para pular
- WHEN não há staged files THEN `lint-staged`/full check SHALL não falhar (validar vazio)

---

## Requirement Traceability

| ID       | Story                                 | Phase | Status  |
| -------- | ------------------------------------- | ----- | ------- |
| HUSKY-01 | P1: Pre-commit full check             | Spec  | Pending |
| HUSKY-02 | P1: Pre-push typecheck + test         | Spec  | Pending |
| HUSKY-03 | P2: Post-merge auto install + rebuild | Spec  | Pending |
| HUSKY-04 | P2: Commit-msg conventional commit    | Spec  | Pending |
| HUSKY-05 | Install husky + hooks via postinstall | Spec  | Pending |

**Coverage:** 5 total, 0 mapped to tasks, 5 unmapped ⚠️

---

## Success Criteria

- [ ] Desenvolvedor consegue clonar o repo, rodar `pnpm install`, e todos os hooks estão ativos automaticamente
- [ ] Commit com qualquer erro de lint/type/format é bloqueado na hora
- [ ] Push com teste falhando ou build quebrada é bloqueado
- [ ] Pull com mudança de dependências instala/rebuilda automaticamente
- [ ] Mensagens de commit fora do padrão conventional commit são rejeitadas
