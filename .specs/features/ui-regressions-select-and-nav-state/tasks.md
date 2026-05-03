# UI Regressions (Select + Menu Ativo) — Tasks

**Status:** Done  
**Spec:** `.specs/features/ui-regressions-select-and-nav-state/spec.md`  
**Design:** N/A (decisões de implementação inline)  
**Requisitos foco:** UIR-01..UIR-07

---

## Convenções

- `[P]` = pode executar em paralelo no mesmo bloco (após dependências)
- Cada task inclui gate explícito
- Se houver divergência relevante da spec: marcar `SPEC_DEVIATION`
- Como `.specs/codebase/TESTING.md` não existe, os gates usam scripts oficiais do `package.json`

---

## Bloco 0 — Fundação visual do Select

### T-01 — Normalizar tokens semânticos de superfície para Select

**O quê:** adicionar/ajustar tokens de tema usados pelo shadcn/Radix Select (`popover`, `popover-foreground`, `accent`, `accent-foreground`) em `src/renderer/src/index.css` para temas claro e escuro.  
**Cobre:** UIR-01, UIR-02, UIR-03.  
**Done when:** tokens existem em `:root` e `.dark`, sem regressão de contraste visível.  
**Gate:** `pnpm typecheck`.

### T-02 — Ajustar classes do componente Select para legibilidade e interação

**O quê:** revisar classes em `src/renderer/src/components/ui/select.tsx` (`SelectContent` + `SelectItem`) para garantir fundo/texto/hover/focus legíveis e seleção funcional em ambos os temas.  
**Cobre:** UIR-01, UIR-02, UIR-03, UIR-04.  
**Depends on:** T-01.  
**Done when:** dropdown não fica transparente e clique em item continua atualizando valor.  
**Gate:** `pnpm test:unit`.

---

## Bloco 1 — Regressão de navegação (menu ativo)

### T-03 — Corrigir matching de rota ativa entre Treino e Treino Simultâneo

**O quê:** ajustar lógica de links no shell em `src/renderer/src/components/Layout.tsx` para evitar ativação concorrente de `/training` com `/training/simultaneous*` (inclui config/session/summary).  
**Cobre:** UIR-05, UIR-06, UIR-07.  
**Done when:** apenas uma entrada de menu aparece ativa por rota.  
**Gate:** `pnpm test:unit`.

---

## Bloco 2 — Testes de regressão (unit + E2E)

### T-04 — Unit tests do Select (contrato visual + comportamento)

**O quê:** criar/atualizar testes no renderer para validar abertura do `Select`, render de opções e seleção sem quebra após ajustes (ex.: `src/renderer/src/components/ui/select.test.tsx` e/ou testes de forms/páginas que usam Select).  
**Cobre:** UIR-03, UIR-04.  
**Depends on:** T-02.  
**Done when:** testes falhariam sem fix e passam com fix; nenhuma remoção silenciosa de cobertura existente.  
**Gate:** `pnpm test:unit`.

### T-05 — Unit tests de estado ativo do menu no Layout

**O quê:** adicionar testes para `AppLayout` cobrindo rotas `/training`, `/training/simultaneous`, `/training/simultaneous/session` e `/training/simultaneous/summary`, validando highlight único por rota.  
**Cobre:** UIR-05, UIR-06, UIR-07.  
**Depends on:** T-03.  
**Done when:** asserts verificam que “Treino” e “Treino Simultâneo” nunca ficam ativos ao mesmo tempo.  
**Gate:** `pnpm test:unit`.

### T-06 — E2E de visibilidade/interação do Select em claro e escuro [P]

**O quê:** criar/estender spec E2E para abrir selects reais (ex.: Perfil/Stats/Situações), alternar tema e validar que opções continuam legíveis e selecionáveis.  
**Cobre:** UIR-01, UIR-02, UIR-03, UIR-04.  
**Depends on:** T-02.  
**Done when:** cenário passa em tema claro e escuro com seleção efetiva de opção.  
**Gate:** `pnpm playwright test e2e/profile/theme-preference.spec.ts`.

### T-07 — E2E de highlight de menu no fluxo simultâneo [P]

**O quê:** criar/estender E2E de navegação para validar estado ativo exclusivo de menu nas rotas de treino normal e treino simultâneo (incluindo subrotas de sessão e resumo).  
**Cobre:** UIR-05, UIR-06, UIR-07.  
**Depends on:** T-03.  
**Done when:** asserts confirmam exclusividade de item ativo em toda navegação alvo.  
**Gate:** `pnpm playwright test e2e/simultaneous-training/navigation.spec.ts`.

---

## Bloco 3 — Fechamento e rastreabilidade

### T-08 — Requirement traceability update

**O quê:** atualizar status dos requisitos `UIR-01..UIR-07` no `spec.md` conforme implementação e testes concluídos.  
**Depends on:** T-04, T-05, T-06, T-07.  
**Done when:** tabela de traceability reflete estado real (Pending → Done/Verified conforme evidências).  
**Gate:** revisão manual.

### T-09 — Gate final da feature

**O quê:** executar validação final de qualidade da feature antes de fechar.  
**Depends on:** T-08.  
**Comandos:**

1. `pnpm test:unit`
2. `pnpm playwright test e2e/profile/theme-preference.spec.ts e2e/simultaneous-training/navigation.spec.ts`
3. `pnpm test` (opcional quando ambiente local permitir ciclo completo)

**Done when:** gates da feature passam sem regressões nas áreas afetadas.
