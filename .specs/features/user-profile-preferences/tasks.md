# Perfil do Utilizador e Preferências Padrão — Tasks

**Status:** ✅ Concluída (Blocos 0, 1, 2 e 3 concluídos em 2026-05-02)  
**Spec:** `spec.md`  
**Design:** `design.md`  
**Requisitos cobertos:** PROF-01 a PROF-16

---

## Convenções

- `[P]` = pode correr em paralelo com outras tasks do mesmo bloco quando não partilham write set.
- Gate rápido preferido: `pnpm test:unit` ou `pnpm typecheck`.
- Gate completo para fluxos do utilizador: `pnpm test`.
- Testes ficam colocalizados na mesma task que introduz o comportamento.

---

## Plano de Execução

### Bloco 0 — Fundação partilhada

```text
T-01 -> T-02 -> T-03
```

### Bloco 1 — Main process

```text
T-03 -> T-04 -> T-05
      \-> T-06 -> T-07
```

### Bloco 2 — Renderer base

```text
T-05 -> T-08 -> T-09
T-07 -> T-08
T-08 -> T-10 -> T-11
```

### Bloco 3 — Aplicação e integração

```text
T-09 -> T-12
T-10 -> T-12
T-11 -> T-12
```

---

## Task Breakdown

### T-01 — Tipos e schemas partilhados de perfil

**O quê:** Criar contratos partilhados de preferências/perfil e validação Zod para nome, senha e preferências.

**Status:** ✅ Concluída em 2026-05-02

**Onde:**

- `src/shared/constants.ts`
- `src/shared/ipc/types.ts`
- `src/shared/forms/profileSchemas.ts` (novo)
- `src/shared/forms/profileSchemas.test.ts` (novo)

**Depends on:** —

**Reuses:** `src/shared/forms/authSchemas.ts`, `src/shared/forms/trainingSchemas.ts`

**Requirement:** PROF-06, PROF-10, PROF-11, PROF-15

**Done when:**

- [x] Existem tipos partilhados para snapshot de auth e preferências
- [x] Existem schemas para update de nome, change password e update de preferências
- [x] Regras de nome/senha mantêm consistência com auth já existente
- [x] Testes dos schemas cobrem casos válidos e inválidos

**Tests:** unit  
**Gate:** `pnpm test:unit src/shared/forms/profileSchemas.test.ts`

---

### T-02 — Schema Drizzle e migração aditiva de `user_preferences`

**O quê:** Adicionar a tabela `user_preferences` ao schema e gerar migração sem destruir dados existentes.

**Status:** ✅ Concluída em 2026-05-02

**Onde:**

- `src/main/db/schema.ts`
- `src/main/db/migrations/*`

**Depends on:** T-01

**Reuses:** padrão de tabelas em `src/main/db/schema.ts`

**Requirement:** PROF-11, PROF-15

**Done when:**

- [x] `user_preferences` existe no schema com FK para `users`
- [x] A migração gerada é aditiva
- [x] `pnpm typecheck` passa
- [x] O build continua a copiar migrações normalmente

**Tests:** none  
**Gate:** `pnpm typecheck`

---

### T-03 — Atualizar tipos do preload/renderer para snapshot enriquecido

**O quê:** Alinhar preload e tipos do renderer com os novos contratos de auth e profile.

**Status:** ✅ Concluída em 2026-05-02

**Onde:**

- `src/preload/index.ts`
- `src/renderer/src/env.d.ts`

**Depends on:** T-02

**Reuses:** namespace `auth` e padrão de exposição mínima via `window.api`

**Requirement:** PROF-01, PROF-02, PROF-10, PROF-16

**Done when:**

- [x] `auth.login` e `auth.me` expõem `preferences`
- [x] Existe namespace `profile` com APIs mínimas necessárias
- [x] Tipos do renderer refletem exatamente o contrato do preload
- [x] `pnpm typecheck` passa

**Tests:** none  
**Gate:** `pnpm typecheck`

---

### T-04 — DB helper de perfil e preferências

**O quê:** Implementar a camada de dados de perfil com leitura de snapshot, update de nome, troca de senha e upsert de preferências.

**Status:** ✅ Concluída em 2026-05-02

**Onde:**

- `src/main/db/profile.ts` (novo)
- `src/main/db/profile.test.ts` (novo)

**Depends on:** T-02

**Reuses:** `src/main/services/session.ts`, `src/main/db/groups.test.ts` como padrão de teste

**Requirement:** PROF-04, PROF-07, PROF-08, PROF-11, PROF-15

**Done when:**

- [x] Existe função que monta `AuthSessionDto` a partir de `users` + `user_preferences`
- [x] Update de nome persiste corretamente
- [x] Change password valida hash atual e atualiza hash novo
- [x] Upsert parcial de preferências preserva campos não enviados
- [x] Testes cobrem sucesso, senha atual inválida e utilizador sem preferências

**Tests:** unit  
**Gate:** `pnpm test:unit src/main/db/profile.test.ts`

---

### T-05 — IPC de perfil e enriquecimento de `auth:login` / `auth:me`

**O quê:** Adicionar handlers `profile:*` e fazer `auth` devolver snapshot com preferências.

**Status:** ✅ Concluída em 2026-05-02

**Onde:**

- `src/main/ipc/profile.ts` (novo)
- `src/main/ipc/profile.test.ts` (novo)
- `src/main/ipc/auth.ts`
- `src/main/ipc/auth.test.ts`
- `src/main/ipc/register.ts`

**Depends on:** T-03, T-04

**Reuses:** padrão de `ipcMain.handle` já usado em `auth.ts` e `groups.ts`

**Requirement:** PROF-02, PROF-04, PROF-06, PROF-07, PROF-08, PROF-09, PROF-11, PROF-16

**Done when:**

- [x] `profile:updateName` devolve snapshot atualizado
- [x] `profile:changePassword` valida payload e propaga erros claros
- [x] `profile:updatePreferences` devolve snapshot atualizado
- [x] `auth:login` e `auth:me` passam a devolver `preferences`
- [x] Testes unitários existentes de auth são ajustados sem regressão

**Tests:** unit  
**Gate:** `pnpm test:unit src/main/ipc/profile.test.ts src/main/ipc/auth.test.ts`

---

### T-06 — Store de preferências e hidratação global do renderer

**O quê:** Criar a store de preferências e integrá-la ao bootstrap autenticado da app.

**Status:** ✅ Concluída em 2026-05-02

**Onde:**

- `src/renderer/src/stores/preferences.ts` (novo)
- `src/renderer/src/stores/auth.ts`
- `src/renderer/src/components/ThemeProvider.tsx`
- `src/renderer/src/hooks/useChartPalette.ts`
- testes associados do renderer

**Depends on:** T-05

**Reuses:** lógica atual de aplicação de tema em `src/renderer/src/stores/theme.ts`

**Requirement:** PROF-14, PROF-15, PROF-16

**Done when:**

- [x] Existe store única para preferências efetivas da conta autenticada
- [x] O bootstrap via `auth.me()` hidrata auth + preferências
- [x] Tema é aplicado ao DOM a partir da nova store
- [x] Logout limpa o estado de preferências em memória
- [x] Testes cobrem fallbacks e hidratação

**Tests:** unit  
**Gate:** `pnpm test:unit`

---

### T-07 — Componente reutilizável de senha com mostrar/esconder

**O quê:** Criar o componente de password input e integrá-lo ao login/registo existente.

**Status:** ✅ Concluída em 2026-05-02

**Onde:**

- `src/renderer/src/components/ui/password-input.tsx` (novo)
- `src/renderer/src/components/forms/PasswordField.tsx` (novo)
- `src/renderer/src/components/forms/index.ts`
- `src/renderer/src/pages/LoginPage.tsx`
- testes do componente/forms

**Depends on:** T-03

**Reuses:** `Input`, `Label`, `FieldError`, padrão de `FormField`

**Requirement:** PROF-10

**Done when:**

- [x] O componente alterna entre `password` e `text`
- [x] O valor digitado é preservado ao alternar
- [x] O login/registo existente passa a usar o novo componente
- [x] Existem testes de interação para mostrar/esconder

**Tests:** unit  
**Gate:** `pnpm test:unit`

---

### T-08 — Página de perfil, rota protegida e ponto de entrada no shell

**O quê:** Construir a `ProfilePage`, adicionar rota `/profile` e criar acesso claro a partir do layout autenticado.

**Status:** ✅ Concluída em 2026-05-02

**Onde:**

- `src/renderer/src/pages/ProfilePage.tsx` (novo)
- `src/renderer/src/App.tsx`
- `src/renderer/src/components/Layout.tsx`
- `src/renderer/src/components/app/AppSidebar.tsx`
- testes de página/layout

**Depends on:** T-05, T-06, T-07

**Reuses:** `PageHeader`, `Card`, componentes forms e store de auth

**Requirement:** PROF-01, PROF-02, PROF-03

**Done when:**

- [x] Existe rota protegida `/profile`
- [x] O utilizador consegue aceder ao perfil a partir do shell
- [x] Conta, segurança e preferências aparecem em secções distintas
- [x] E-mail é exibido como read-only
- [x] Testes de renderer cobrem renderização e navegação básica

**Tests:** unit  
**Gate:** `pnpm test:unit`

---

### T-09 — Fluxos de update de nome e change password no perfil

**O quê:** Ligar a `ProfilePage` aos handlers de update de nome e alteração de senha, com sincronização imediata de UI.

**Status:** ✅ Concluída em 2026-05-02

**Onde:**

- `src/renderer/src/pages/ProfilePage.tsx`
- testes da página
- `e2e/profile/update-name.spec.ts` (novo)
- `e2e/profile/change-password.spec.ts` (novo)

**Depends on:** T-08

**Reuses:** `useAuthStore`, novo `PasswordField`

**Requirement:** PROF-04, PROF-05, PROF-06, PROF-07, PROF-08, PROF-09

**Done when:**

- [x] Nome pode ser alterado e refletido imediatamente no shell
- [x] Fluxo de mudança de senha usa senha atual + nova senha
- [x] Erros de senha atual inválida aparecem na UI correta
- [x] E2E comprova mudança de nome e senha

**Tests:** e2e  
**Gate:** `pnpm test`

---

### T-10 — Persistência e edição de preferências no perfil

**O quê:** Implementar o formulário de preferências na `ProfilePage` com gravação e sincronização de estado.

**Status:** ✅ Concluída em 2026-05-02

**Onde:**

- `src/renderer/src/pages/ProfilePage.tsx`
- testes da página/store
- `e2e/profile/theme-preference.spec.ts` (novo, ou consolidado)

**Depends on:** T-08

**Reuses:** `FormNumberField`, `FormSelectField`, store de preferências

**Requirement:** PROF-11, PROF-14, PROF-15

**Done when:**

- [x] O perfil permite editar tema, total de mãos, timer, feedback mode e mesas simultâneas
- [x] Guardar preferências atualiza a store local e a persistência no main
- [x] Tema muda imediatamente quando alterado no perfil
- [x] Testes cobrem persistência e atualização de estado

**Tests:** unit + e2e  
**Gate:** `pnpm test`

---

### T-11 — Aplicar defaults no treino individual e simultâneo

**O quê:** Substituir defaults hardcoded dos formulários de treino por preferências efetivas do utilizador.

**Status:** ✅ Concluída em 2026-05-02

**Onde:**

- `src/renderer/src/components/training/SingleTrainingConfigForm.tsx`
- `src/renderer/src/components/training/SimultaneousTrainingConfigForm.tsx`
- `src/renderer/src/components/training/training-config.test.tsx`
- `e2e/profile/training-defaults.spec.ts` (novo)

**Depends on:** T-06, T-10

**Reuses:** `SessionSettingsForm`, store de preferências

**Requirement:** PROF-12, PROF-13, PROF-16

**Done when:**

- [x] Treino individual abre com defaults efetivos da conta
- [x] Treino simultâneo abre com defaults efetivos da conta
- [x] `tableCount` também respeita a preferência persistida
- [x] O formulário não sobrescreve input já editado após hidratação tardia
- [x] E2E valida o pré-preenchimento dos dois fluxos

**Tests:** unit + e2e  
**Gate:** `pnpm test`

---

### T-12 — Sincronizar toggle de tema do shell com a preferência persistida

**O quê:** Garantir que o toggle existente no `AppSidebar` continua a funcionar, mas passa a persistir a mesma preferência usada pela página de perfil.

**Status:** ✅ Concluída em 2026-05-02

**Onde:**

- `src/renderer/src/components/Layout.tsx`
- `src/renderer/src/components/app/AppSidebar.tsx`
- testes do shell
- `e2e/profile/theme-preference.spec.ts`

**Depends on:** T-06, T-10

**Reuses:** store de preferências, API `profile:updatePreferences`

**Requirement:** PROF-14

**Done when:**

- [x] O toggle do shell continua disponível
- [x] Alternar o tema via shell persiste o mesmo valor do perfil
- [x] Abrir o perfil depois do toggle mostra o valor já sincronizado
- [x] E2E cobre sincronização perfil <-> shell

**Tests:** unit + e2e  
**Gate:** `pnpm test`

---

## Mapa de Paralelismo

```text
Fundação:
  T-01 -> T-02 -> T-03

Main:
  T-03 -> T-04 -> T-05

Renderer:
  T-03 -> T-07
  T-05 -> T-06
  T-05 + T-06 + T-07 -> T-08 -> T-09
  T-08 -> T-10
  T-06 + T-10 -> T-11
  T-06 + T-10 -> T-12
```

---

## Ordem Recomendada de Entrega

1. Fechar contratos partilhados e migração aditiva.
2. Fechar main process e snapshot enriquecido de auth.
3. Introduzir store de preferências e componente de senha.
4. Entregar a página de perfil.
5. Aplicar defaults ao treino.
6. Fechar sincronização do toggle de tema e gates E2E completos.
