# Poker Preflop Trainer

**Analisado:** 2026-05-01

## Visão

Aplicação desktop (Electron + SQLite) para treino de decisões pré-flop no Hold'em sem limite, formato 6-max. O utilizador é desafiado a tomar a ação correcta (FOLD / CALL / RAISE_OPEN / RAISE_3BET / RAISE_4BET / ALL_IN) para cada combinação de posição × range × situação, recebendo feedback imediato e estatísticas de progresso.

## Objectivos

- Cobrir todas as posições 6-max (UTG, MP, CO, BTN, SB, BB) e situações de abertura, 3-bet, 4-bet e all-in.
- Interface com grid 13×13 codificada por cor para visualização de ranges.
- Autenticação local (bcrypt + JWT) com armazenamento seguro de credenciais (keytar).
- Estatísticas de treino persistidas em SQLite via Drizzle ORM.
- Packaging multi-plataforma (electron-builder).

## Stack Principal

- **Runtime:** Electron 33 + Node 22
- **Frontend:** React 18 + Vite 5 + Tailwind 3 + react-router-dom 6
- **Data:** Drizzle ORM 0.38 + better-sqlite3 11 (main process)
- **Auth:** bcryptjs 2 + jsonwebtoken 9 + keytar 7
- **Testes:** Vitest 2 (unit) + Playwright 1.49 (E2E)
- **Build:** electron-vite 2 + electron-builder 25
- **Package manager:** pnpm 10 (lockfileVersion 9.0)

## Estado Actual

v0.1.0 — implementação inicial completa (scaffolding, DB, IPC, autenticação, grid, estatísticas, packaging).
