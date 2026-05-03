# STATE — Preflop Trainer

**Última actualização:** 2026-05-03 (ui-design-refactoring — spec pronta)

## Decisões

| ID   | Decisão                                                                                                                                                               | Racional                                                                                              | Data       |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------- |
| D-01 | Usar pnpm como package manager                                                                                                                                        | Melhor gestão de dependências nativas Electron (better-sqlite3, keytar) via `onlyBuiltDependencies`   | 2026-05-01 |
| D-02 | Adiar actualização React 18→19 e react-router 6→7 para fase própria                                                                                                   | Breaking changes significativos; requerem validação E2E completa                                      | 2026-05-01 |
| D-03 | Adiar electron 33→41, electron-vite 2→5 e vite 5→8 para fase própria                                                                                                  | Saltos de versão major com potencial impacto no build e IPC                                           | 2026-05-01 |
| D-04 | [situation-groups] Arquivar grupo arquiva situações em cascata                                                                                                        | Modelo mental mais simples; consistência de estado                                                    | 2026-05-01 |
| D-05 | [situation-groups] UI de treino: escolher grupo primeiro, depois situações do grupo                                                                                   | Evita mistura cross-group naturalmente; fluxo claro                                                   | 2026-05-01 |
| D-06 | [situation-groups] Stats filtradas por tabs horizontais por grupo                                                                                                     | Acesso rápido; adequado para < 10 grupos                                                              | 2026-05-01 |
| D-07 | [situation-groups] Migração limpa DB (sem preservação de dados antigos)                                                                                               | Sistema em desenvolvimento; sem dados de produção a preservar                                         | 2026-05-01 |
| D-08 | [shadcn-ui-migration] Confirmacoes destrutivas migradas de `confirm()/alert()` para `AlertDialog`                                                                     | Acessibilidade, consistência visual e previsibilidade de testes E2E                                   | 2026-05-02 |
| D-09 | [shadcn-ui-migration] Encerramento de bloco exige gate completo `pnpm test`                                                                                           | Evita regressões acumuladas entre blocos e mantém rastreabilidade de qualidade                        | 2026-05-02 |
| D-10 | [test-coverage] Thresholds P1: statements ≥80%, branches ≥75%, functions ≥85%, lines ≥80%                                                                             | Alinhado com padrões de mercado (Google Testing Blog, Atlassian, Jest/Vitest docs) para apps críticas | 2026-05-02 |
| D-11 | [test-coverage] Excluir ui/ shadcn, bootstrap, register.ts e db/client.ts do coverage                                                                                 | Código gerado e bootstrap não representam lógica de domínio testável                                  | 2026-05-02 |
| D-12 | [session-history] Paginação server-side com pageSize=10 fixo; grid read-only na revisão via prop `readOnly` sem alterar `RangeGrid13` existente                       | Simplicidade de implementação; consistência com o padrão StatsPage                                    | 2026-05-02 |
| D-13 | [git-hooks] Husky v9 com pre-commit (lint+format:check+typecheck), pre-push (typecheck+test), post-merge (auto install+rebuild), commit-msg (commitlint conventional) | Proteger commits/push e automatizar pós-pull                                                          | 2026-05-03 |
| D-14 | [ui-design-refactoring] `max-w-6xl` em todas as páginas (herdado do Layout)                                                                                           | Consistência visual; LoginPage é exceção standalone                                                   | 2026-05-03 |
| D-15 | [ui-design-refactoring] `gap-6` em todas as páginas (nunca `gap-8` ou `space-y-6`)                                                                                    | Espaçamento uniforme entre secções                                                                    | 2026-05-03 |
| D-16 | [ui-design-refactoring] `ConfirmActionDialog.variant` prop (`'destructive' \| 'default'`)                                                                             | Suporta confirmações não-destrutivas sem quebrar API existente                                        | 2026-05-03 |
| D-17 | [ui-design-refactoring] Filtros de lista usam `useSearchParams` (padrão do sistema)                                                                                   | Consistência com HistoryPage; URLs partilháveis                                                       | 2026-05-03 |
| D-18 | [ui-design-refactoring] Loading: `Skeleton` (nunca texto); Error: `EmptyState` (nunca redirect)                                                                       | UX polida e previsível                                                                                | 2026-05-03 |
| D-19 | [ui-design-refactoring] Terminologia: "Salvar" (não "Guardar"), "Posição" (não "Pos.")                                                                                | Consistência de linguagem                                                                             | 2026-05-03 |
| D-20 | [ui-design-refactoring] Hooks partilhados em `src/renderer/src/hooks/`; timer usa `requestAnimationFrame`                                                             | Elimina duplicação; timer eficiente                                                                   | 2026-05-03 |

## Features em Progresso

| Feature         | Data       | Fase  |
| --------------- | ---------- | ----- |
| session-history | 2026-05-02 | Tasks |

## Features Concluídas

| Feature               | Data       | Notas                                                                 |
| --------------------- | ---------- | --------------------------------------------------------------------- |
| ui-design-refactoring | 2026-05-03 | 9/12 tasks executadas (D2/D5/D7/E3 diferidas) — 455 unit + 102 E2E ✅ |

| Feature                                     | Data       | Notas                                                                                                                                                        |
| ------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| situation-groups (GRP-01..16)               | 2026-05-01 | 25 tasks, 65 unit tests, 8 E2E novos (38 total)                                                                                                              |
| situation-range-editor (SRANGE-01..04)      | 2026-05-01 | T1 fold implícito shared; T2 N/A (parse no main); T3 `RangeGrid13` min 36px + scroll                                                                         |
| shadcn-ui-migration (blocos 0, 1, 2, 3 e 4) | 2026-05-02 | Fundação shadcn + CRUD/editor modularizados + treino/simultâneo + stats + remoção .pt-\* + gates E2E e `pnpm test` verdes                                    |
| test-coverage-improvement (T01–T11 + P2)    | 2026-05-02 | 129 novos testes (119→248); stmts 65%→94%, branches 56%→86%, funcs 74%→93%, lines 67%→96%; thresholds vitest activos; 2 specs E2E novas; pnpm test 57 E2E ✅ |
| git-hooks-husky                             | 2026-05-03 | Husky v9 + commitlint: pre-commit, pre-push, post-merge, commit-msg hooks configurados e verificados                                                         |

## Blockers Activos

Nenhum.

## Lições Aprendidas

- `@types/bcryptjs` 3.0.0 está deprecated — a biblioteca bcryptjs 3.x passa a incluir tipos próprios; remover `@types/bcryptjs` após upgrade de bcryptjs para ^3.
- `better-sqlite3` 12.x é major — verificar API nativa e compatibilidade com Electron.

## TODOs / Deferred

- [ ] Avaliar migração para Tailwind 4 após confirmar suporte electron-vite 5.
- [ ] Avaliar upgrade TypeScript 5→6 após estabilização do ecossistema (vite 8, vitest 4).
- [ ] Avaliar React 19 após Recharts 3 confirmar suporte estável.

## Preferências

- (nenhuma ainda)
