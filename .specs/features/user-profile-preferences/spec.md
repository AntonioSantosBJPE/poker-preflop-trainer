# Spec: Perfil do Usuário e Preferências Padrão

**Feature:** USER-PROFILE-PREFERENCES  
**Data:** 2026-05-02  
**Âmbito:** Introduzir uma página de perfil do utilizador autenticado para edição de nome, alteração de senha e gestão de preferências padrão do sistema, persistidas por utilizador e aplicadas automaticamente nos fluxos de treino e tema.

---

## Problem Statement

Hoje a aplicação permite registo, login e logout, mas não oferece qualquer área para o utilizador autenticado gerir a própria conta. O nome não pode ser alterado, a senha não pode ser trocada em segurança e os defaults operacionais do produto continuam espalhados como valores hardcoded no renderer.

Além disso, o tema claro/escuro vive apenas em persistência local do renderer e não como preferência da conta autenticada. O resultado é uma experiência inconsistente: o utilizador não consegue centralizar as suas preferências e o sistema não reutiliza automaticamente essas escolhas nos pontos onde elas fazem mais sentido.

---

## Goals

- [x] Criar uma página de perfil acessível apenas ao utilizador autenticado.
- [x] Permitir alteração do nome do utilizador sem quebrar a sessão atual.
- [x] Permitir alteração de senha com validação da senha atual.
- [x] Criar um componente reutilizável de input de senha com mostrar/esconder.
- [x] Persistir preferências por utilizador para `theme`, `defaultTrainingTotalHands`, `defaultTrainingTimerSeconds`, `defaultTrainingFeedbackMode` e `defaultSimultaneousTableCount`.
- [x] Aplicar automaticamente essas preferências nos fluxos adequados do sistema quando existirem.

---

## Out of Scope

Explicitamente fora do MVP desta feature.

| Item                                                     | Razão                                                                  |
| -------------------------------------------------------- | ---------------------------------------------------------------------- |
| Alteração de e-mail                                      | Exige impacto adicional em auth, unicidade e comunicação ao utilizador |
| Recuperação de senha / "esqueci minha senha"             | Produto é local/offline; fluxo não existe hoje                         |
| Avatar, foto de perfil ou preferências cosméticas extras | Não resolve o problema central do pedido                               |
| Preferências por grupo de situações                      | Complexidade adicional; o pedido é por defaults globais do utilizador  |
| Sync/cloud de perfil entre máquinas                      | Fora do escopo da arquitetura local atual                              |

---

## User Stories

### P1: Página de perfil do utilizador autenticado ⭐ MVP

**User Story:** Como utilizador autenticado, quero uma página de perfil dedicada para gerir minha conta e preferências num só lugar.

**Why P1:** Sem esta página, o utilizador continua sem ponto de entrada para qualquer uma das capacidades pedidas.

**Acceptance Criteria:**

1. WHEN o utilizador autenticado navega na aplicação THEN o sistema SHALL expor um ponto de acesso claro para a página de perfil.
2. WHEN o utilizador acede à página de perfil THEN o sistema SHALL carregar os dados atuais da conta autenticada e as preferências efetivas do utilizador.
3. WHEN o utilizador não está autenticado e tenta aceder à rota de perfil THEN o sistema SHALL redirecioná-lo para o fluxo de login existente.
4. WHEN a página de perfil é exibida THEN o sistema SHALL separar visualmente dados de conta, alteração de senha e preferências do sistema.
5. WHEN o e-mail do utilizador é mostrado na página THEN o sistema SHALL apresentá-lo como informação apenas de leitura no MVP.

**Independent Test:** Entrar na app, abrir a página de perfil a partir do shell autenticado e validar carregamento das três secções com dados do utilizador atual.

---

### P1: Alterar nome do utilizador ⭐ MVP

**User Story:** Como utilizador autenticado, quero alterar o meu nome para manter a conta atualizada e coerente com a minha identificação na app.

**Why P1:** O nome já é mostrado em pontos centrais da UI e hoje não existe qualquer mecanismo para o atualizar.

**Acceptance Criteria:**

1. WHEN o utilizador submete um novo nome válido THEN o sistema SHALL persistir a alteração em `users.name`.
2. WHEN o nome é alterado com sucesso THEN o sistema SHALL refletir o novo valor imediatamente nos pontos da UI que consomem o utilizador autenticado, incluindo sidebar e dashboard.
3. WHEN o utilizador submete um nome vazio ou inválido THEN o sistema SHALL bloquear a submissão com mensagem de validação clara.
4. WHEN a alteração de nome é concluída THEN o sistema SHALL manter a sessão atual autenticada.

**Independent Test:** Alterar o nome no perfil e verificar atualização imediata no shell sem precisar de novo login.

---

### P1: Alterar senha com senha atual obrigatória ⭐ MVP

**User Story:** Como utilizador autenticado, quero trocar a minha senha informando a senha atual e a nova para manter a conta segura.

**Why P1:** Trata-se de gestão básica de conta e o pedido exige um fluxo explícito de segurança.

**Acceptance Criteria:**

1. WHEN o utilizador submete o formulário de alteração de senha THEN o sistema SHALL exigir `senhaAtual` e `novaSenha`.
2. WHEN a senha atual informada não corresponde ao hash persistido THEN o sistema SHALL rejeitar a operação com erro claro sem alterar a senha guardada.
3. WHEN a nova senha não cumpre as regras mínimas do sistema THEN o sistema SHALL rejeitar a operação com mensagem de validação consistente com auth.
4. WHEN a nova senha é válida e a senha atual confere THEN o sistema SHALL guardar o novo hash bcrypt e invalidar apenas a senha anterior.
5. WHEN a alteração de senha é concluída THEN o sistema SHALL manter a sessão atual utilizável e futuros logins SHALL aceitar apenas a nova senha.
6. WHEN o utilizador tenta reutilizar a mesma senha atual como nova senha THEN o sistema SHALL rejeitar a operação.

**Independent Test:** Alterar a senha com sucesso, terminar sessão e comprovar que a senha antiga falha e a nova autentica.

---

### P1: Componente reutilizável de input de senha com mostrar/esconder ⭐ MVP

**User Story:** Como utilizador, quero poder mostrar e esconder o conteúdo de campos de senha para reduzir erros de digitação sem perder segurança.

**Why P1:** O pedido explicitamente solicita o componente e ele será reutilizado em login/registo e no novo fluxo de mudança de senha.

**Acceptance Criteria:**

1. WHEN um campo de senha reutiliza o novo componente THEN o sistema SHALL permitir alternar entre visualização mascarada e texto legível.
2. WHEN o utilizador alterna entre mostrar e esconder THEN o sistema SHALL preservar o valor digitado no input.
3. WHEN o componente é usado em formulários existentes de auth e no perfil THEN o sistema SHALL manter compatibilidade com React Hook Form e mensagens de erro já adotadas.
4. WHEN leitores de ecrã ou navegação por teclado são usados THEN o sistema SHALL expor labels e estados acessíveis para o botão de alternância.

**Independent Test:** Abrir login e perfil, alternar visibilidade da senha e confirmar que o valor digitado e a validação continuam a funcionar.

---

### P1: Preferências padrão persistidas e aplicadas automaticamente ⭐ MVP

**User Story:** Como utilizador autenticado, quero guardar preferências padrão do sistema para não reconfigurar repetidamente cada sessão de treino ou aspecto global da app.

**Why P1:** O valor da feature depende de o sistema reaproveitar essas escolhas nos fluxos corretos, não apenas de as armazenar.

**Acceptance Criteria:**

1. WHEN o utilizador guarda preferências válidas de `theme`, `defaultTrainingTotalHands`, `defaultTrainingTimerSeconds`, `defaultTrainingFeedbackMode` e `defaultSimultaneousTableCount` THEN o sistema SHALL persisti-las para o utilizador autenticado.
2. WHEN o utilizador abre a configuração de treino individual e existem preferências guardadas THEN o sistema SHALL pré-preencher `totalHands`, `timerSeconds` e `feedbackMode` com esses valores.
3. WHEN o utilizador abre a configuração de treino simultâneo e existem preferências guardadas THEN o sistema SHALL pré-preencher `tableCount`, `totalHands`, `timerSeconds` e `feedbackMode` com esses valores.
4. WHEN a preferência de tema é alterada no perfil THEN o sistema SHALL aplicar o novo tema imediatamente e persisti-lo para utilizações futuras.
5. WHEN o utilizador usa o atalho já existente de alternância de tema no shell THEN o sistema SHALL manter sincronização com a mesma preferência persistida do perfil.
6. WHEN uma preferência ainda não estiver definida THEN o sistema SHALL manter os defaults atuais da aplicação sem regressão funcional.
7. WHEN a app arranca com sessão autenticada válida THEN o sistema SHALL hidratar o estado de preferências dessa conta antes de os fluxos dependentes consumirem valores efetivos.

**Independent Test:** Guardar preferências no perfil, navegar para treino individual e simultâneo, e validar que os formulários já abrem com os valores configurados.

---

## Edge Cases

- WHEN o utilizador autenticado não tiver ainda linha de preferências persistida THEN o sistema SHALL carregar a página de perfil com fallbacks efetivos e sem erro.
- WHEN apenas parte das preferências tiver sido guardada THEN o sistema SHALL mesclar valores persistidos com fallbacks não definidos, sem apagar silenciosamente os restantes.
- WHEN o utilizador altera preferências e navega imediatamente para um formulário de treino THEN o sistema SHALL usar os novos valores já atualizados em memória.
- WHEN a hidratação assíncrona de preferências ocorrer após o formulário de treino montar THEN o sistema SHALL evitar sobrescrever input já editado manualmente pelo utilizador.
- WHEN a alteração de senha falha THEN o sistema SHALL manter o estado de autenticação e o hash atual intactos.
- WHEN `defaultSimultaneousTableCount` persistido estiver fora de `{2,3,4}` por bypass ou dados corrompidos THEN o sistema SHALL rejeitar/normalizar o valor no main process e cair em fallback seguro.
- WHEN o utilizador faz logout e outro utilizador entra no mesmo dispositivo THEN o sistema SHALL hidratar a preferência da nova conta autenticada, não apenas reutilizar estado anterior em memória.

---

## Testing Strategy

Esta feature cruza segurança, persistência, preload/IPC e experiência do utilizador. A cobertura precisa combinar testes unitários do main process com E2E ponta a ponta dos fluxos críticos.

### E2E (Playwright + Electron) — Cobertura obrigatória

| Test ID     | Critério coberto                                                                 | Ficheiro sugerido                       |
| ----------- | -------------------------------------------------------------------------------- | --------------------------------------- |
| E2E-PROF-01 | Navegação para `/profile` e carregamento das secções de conta/senha/preferências | `e2e/profile/navigation.spec.ts`        |
| E2E-PROF-02 | Alterar nome e refletir atualização imediata no shell                            | `e2e/profile/update-name.spec.ts`       |
| E2E-PROF-03 | Alteração de senha com senha atual inválida é rejeitada                          | `e2e/profile/change-password.spec.ts`   |
| E2E-PROF-04 | Alteração de senha bem-sucedida exige nova senha em login subsequente            | `e2e/profile/change-password.spec.ts`   |
| E2E-PROF-05 | Guardar defaults de treino individual e verificar pré-preenchimento              | `e2e/profile/training-defaults.spec.ts` |
| E2E-PROF-06 | Guardar defaults de treino simultâneo e verificar pré-preenchimento              | `e2e/profile/training-defaults.spec.ts` |
| E2E-PROF-07 | Alterar tema no perfil e via toggle do shell mantendo sincronização persistida   | `e2e/profile/theme-preference.spec.ts`  |

### Unit / Integration

| Camada                               | O que validar                                                           | Prioridade |
| ------------------------------------ | ----------------------------------------------------------------------- | ---------- |
| `src/shared/forms/profileSchemas.ts` | validação de nome, senha atual/nova e preferências                      | P1         |
| `src/main/db/profile.ts`             | leitura, upsert parcial de preferências, update de nome e troca de hash | P1         |
| `src/main/ipc/profile.ts`            | validação de payload, erros claros, delegação para DB                   | P1         |
| `src/main/ipc/auth.ts`               | `login` e `me` devolvem snapshot com preferências                       | P1         |
| Renderer store de preferências       | hidratação, fallbacks e sincronização de tema                           | P1         |
| Componentes de formulário            | `PasswordInput` / `PasswordField` e `ProfilePage`                       | P2         |

---

## Requirement Traceability

| Requirement ID | Story                                                                                  | Phase  | Status            |
| -------------- | -------------------------------------------------------------------------------------- | ------ | ----------------- |
| PROF-01        | P1: Expor rota e ponto de acesso para página de perfil autenticada                     | Design | Done (T-08)       |
| PROF-02        | P1: Carregar dados atuais da conta e preferências na página de perfil                  | Design | Done (T-08)       |
| PROF-03        | P1: Mostrar e-mail como campo read-only no MVP                                         | Design | Done (T-08)       |
| PROF-04        | P1: Persistir alteração de `users.name`                                                | Design | Done (T-09)       |
| PROF-05        | P1: Refletir novo nome imediatamente na UI autenticada                                 | Design | Done (T-09)       |
| PROF-06        | P1: Exigir senha atual para alteração de senha                                         | Design | Done (T-09)       |
| PROF-07        | P1: Rejeitar senha atual inválida sem alterar credenciais                              | Design | Done (T-09)       |
| PROF-08        | P1: Persistir novo hash bcrypt para a nova senha válida                                | Design | Done (T-09)       |
| PROF-09        | P1: Manter sessão atual utilizável após trocar senha                                   | Design | Done (T-09)       |
| PROF-10        | P1: Disponibilizar componente reutilizável de input de senha com mostrar/esconder      | Design | Done (T-07)       |
| PROF-11        | P1: Persistir preferências padrão por utilizador autenticado                           | Design | Done (T-10)       |
| PROF-12        | P1: Aplicar defaults guardados no treino individual                                    | Design | Done (T-11)       |
| PROF-13        | P1: Aplicar defaults guardados no treino simultâneo                                    | Design | Done (T-11)       |
| PROF-14        | P1: Aplicar e persistir preferência de tema de forma sincronizada entre perfil e shell | Design | Done (T-10, T-12) |
| PROF-15        | P1: Manter fallbacks atuais quando preferências ainda não existirem                    | Design | Done (T-10)       |
| PROF-16        | P1: Hidratar preferências da conta autenticada no arranque da app                      | Design | Done (T-11)       |

**Coverage:** 16 requisitos totais, 16 mapeados, 0 não mapeados.

## Execution Progress

- 2026-05-02: **T-01 concluída** (tipos partilhados `AuthSessionDto`/`UserPreferencesDto` + `profileSchemas` com testes unitários verdes).
- 2026-05-02: **T-02 concluída** (`user_preferences` adicionada ao Drizzle schema + migração aditiva `0004_red_eternity.sql` + `pnpm typecheck` verde).
- 2026-05-02: **T-03 concluída** (preload/renderer alinhados para snapshot com `preferences` + namespace `profile` + `pnpm typecheck` verde).
- 2026-05-02: **T-04 concluída** (`src/main/db/profile.ts` + testes unitários cobrindo snapshot, update de nome, troca de senha e upsert parcial de preferências).
- 2026-05-02: **T-05 concluída** (novos handlers `profile:*`, `auth:login/me` enriquecidos com `preferences`, registro no agregador IPC e testes unitários verdes).
- 2026-05-02: **T-06 concluída** (nova store de preferências com fallbacks/hidratação, bootstrap auth integrado, aplicação de tema via preferências e logout limpando estado em memória).
- 2026-05-02: **T-07 concluída** (`PasswordInput`/`PasswordField` criados, integração no login/registo e testes de interação mostrar/esconder).
- 2026-05-02: **T-08 concluída** (`ProfilePage` criada com rota protegida `/profile`, entrada pelo shell, secções separadas e e-mail read-only).
- 2026-05-02: **T-09 concluída** (update de nome e change password no perfil com sincronização imediata da sessão e E2E de sucesso/erro).
- 2026-05-02: **T-10 concluída** (edição e persistência de preferências no perfil com aplicação imediata de tema e cobertura unitária/E2E).
- 2026-05-02: **T-11 concluída** (defaults efetivos aplicados a treino individual/simultâneo com proteção contra sobrescrita após hidratação tardia e E2E dedicado).
- 2026-05-02: **T-12 concluída** (toggle de tema do shell passou a persistir via `profile:updatePreferences`, mantendo sincronização com o valor exibido no perfil, coberto por unit + E2E).

---

## Success Criteria

- [x] O utilizador autenticado consegue abrir uma página de perfil e gerir a própria conta sem sair do fluxo atual da app.
- [x] A alteração de nome reflete-se imediatamente no shell e no dashboard.
- [x] A alteração de senha exige a senha atual e impede login com a senha anterior após sucesso.
- [x] O novo componente de senha é reutilizado pelo menos no login/registo e no perfil.
- [x] Defaults guardados no perfil são reaproveitados automaticamente nas configurações de treino individual e simultâneo.
- [x] A preferência de tema deixa de ser apenas local e passa a ficar alinhada com a conta autenticada sem regressão do toggle atual.
