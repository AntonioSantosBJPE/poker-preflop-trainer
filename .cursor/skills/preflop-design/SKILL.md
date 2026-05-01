---
name: preflop-design
description: >-
  Design system do Preflop Trainer — paleta Felt e âmbar, tokens CSS/Tailwind,
  tipografia, shell com sidebar e regras de alinhamento. Usar ao alterar UI,
  cores, layout ou tema claro/escuro.
---

# Preflop design system

## Paleta acordada: Felt e âmbar

Modo **escuro** (mesa):

| Token semântico | Uso | Hex |
|-----------------|-----|-----|
| Background | Fundo app | `#0d1f17` |
| Card | Painéis, cartões | `#142920` |
| Muted | Inputs, zebras | `#1e3530` |
| Border | Linhas | `#2a4a3e` |
| Foreground | Texto principal | `#e8f0ec` |
| Muted foreground | Texto secundário | `#9cb8ae` |
| Primary | CTAs, links fortes | `#c9a227` |
| Primary hover | Hover primário | `#ddb83d` |
| Destructive | Erro, abandonar | `#ef4444` |

Modo **claro** (papel):

| Token | Hex |
|-------|-----|
| Background | `#f4f1ea` |
| Card | `#faf8f4` |
| Muted | `#ebe6dc` |
| Border | `#d4cfc3` |
| Foreground | `#1a2e26` |
| Muted foreground | `#4a5c54` |
| Primary | `#8b6914` |
| Primary foreground | `#faf8f4` |

Implementação: variáveis RGB em `:root` / `.dark` em [`src/renderer/src/index.css`](src/renderer/src/index.css); Tailwind mapeia `background`, `foreground`, `card`, `muted`, `border`, `primary`, `primaryForeground`, `destructive`, `ring`.

## Tipografia

- **Display / títulos**: Fraunces (`font-display`) — import `@fontsource/fraunces`.
- **Corpo / UI**: Outfit (`font-sans`) — import `@fontsource/outfit`.
- Escala sugerida: página `text-2xl font-semibold font-display`; secção `text-sm font-medium text-muted-foreground`; corpo `text-sm`/`text-base`.

## Marca e assets (URLs no renderer)

- Favicon: `/assets/favicon/favicon.ico` (+ PNGs em `/assets/favicon/`).
- Logo shell: `/assets/logo/logo-master.png`.
- Ícone janela Electron (main): ficheiro em `src/renderer/public/assets/logo/icon.png` → cópia build em `out/renderer/assets/logo/icon.png`.

## Layout e alinhamento

- **Shell**: sidebar fixa (~14–16rem), área principal `flex-1 min-h-0 overflow-auto`.
- **Content**: container `w-full max-w-6xl mx-auto px-6 py-8` (páginas densas podem usar `max-w-7xl`).
- **Grelhas de cartões**: `grid gap-4 md:grid-cols-*` com `items-stretch`; métricas com números em `tabular-nums`.
- **Formulários**: labels `text-sm text-muted-foreground`; inputs usam componentes/utilities com `border-border bg-muted` (ver `index.css` `@layer components`).
- **Grid 13×13**: células vazias usam `--felt-empty` / `rgb(var(--felt-empty))`; hover/outline com primary. Testes E2E: `data-testid="range-grid-13"`; painel de ações na edição: `situation-actions-panel` / `situation-action-row`.

## Tema

- `dark` em `<html>` via classe (Tailwind `darkMode: 'class'`).
- Preferência em Zustand + `localStorage` (`pt-theme`); script inline em `index.html` reduz flash ao arrancar.

## Anti-padrões

- Não usar `slate-*` / `emerald-*` soltos em páginas novas — usar tokens semânticos.
- Não colocar JWT ou segredos em `localStorage` (apenas preferência de tema é aceitável).

## Referências

- Plano de padronização visual (executado).
- [`tailwind.config.js`](tailwind.config.js), [`src/renderer/src/index.css`](src/renderer/src/index.css).
