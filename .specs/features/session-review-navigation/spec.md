# Navegação para Revisão de Sessão

**Feature:** SESSION-REVIEW-NAV  
**Data:** 2026-05-03  
**Âmbito:** Adicionar ações de navegação para as páginas de revisão (hand-by-hand) a partir dos ecrãs de resultado de treino, tanto no fluxo single como no simultâneo.

---

## Problem Statement

Hoje, ao terminar um treino, o utilizador vê apenas um resumo estatístico (acertos/total/percentagem) e pode criar nova sessão ou ver estatísticas globais. Para rever mão a mão — funcionalidade já existente em `/history/:sessionId` e `/history/review-multi` — o utilizador precisa sair do resultado, ir ao histórico, encontrar a sessão e clicar para rever. Este atrito quebra o _feedback loop_ imediatamente após o treino, momento crítico para aprendizagem.

No treino simultâneo, o problema é maior: não há qualquer caminho para revisão individual por mesa nem para revisão agregada multi-sessão a partir do resumo.

---

## Goals

- [ ] Adicionar botão "Rever sessão" no ecrã de resultado do treino single que navega para `/history/:sessionId`
- [ ] Adicionar botão "Revisão individual" por mesa no resumo do treino simultâneo que navega para `/history/:sessionId` de cada mesa
- [ ] Adicionar botão "Revisão múltipla" no resumo do treino simultâneo que navega para `/history/review-multi?ids=...` com todas as sessões do bloco

---

## Out of Scope

| Item                                      | Reason                                                                 |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| Criar novas páginas de revisão            | Já existem `SessionHandReviewPage` e `MultiSessionReviewPage`          |
| Alterar comportamento do histórico        | Feature é apenas sobre navegação a partir dos resultados               |
| Suporte a revisão durante treino em curso | Seria uma funcionalidade distinta (pausar e rever)                     |
| Alterar IPC ou backend                    | Navegação usa rotas existentes e sessionIds já disponíveis no frontend |

---

## User Stories

### P1: Revisão de sessão single a partir do resultado ⭐ MVP

**User Story:** Como utilizador, quero aceder à revisão mão-a-mão imediatamente após ver o resultado do treino single para analisar erros sem sair do fluxo.

**Why P1:** Fechar o loop aprendizagem → resultado → revisão é crítico para a utilidade do produto.

**Acceptance Criteria:**

1. WHEN o ecrã de resultado de treino single é exibido THEN o sistema SHALL mostrar um botão "Rever sessão"
2. WHEN o utilizador clica em "Rever sessão" THEN o sistema SHALL navegar para `/history/{sessionId}`
3. WHEN a página de resultado carrega THEN o sistema SHALL manter os botões existentes ("Nova sessão", "Ver estatísticas") inalterados

**Independent Test:** Completar treino single → clicar "Rever sessão" → validar que abre a revisão mão-a-mão da sessão correta.

---

### P1: Revisão individual por mesa no resumo simultâneo ⭐ MVP

**User Story:** Como utilizador, quero rever mão-a-mão cada mesa individualmente a partir do resumo do treino simultâneo.

**Why P1:** Sem esta navegação, rever uma mesa específica exige ir ao histórico e procurar a sessão entre dezenas.

**Acceptance Criteria:**

1. WHEN o resumo do treino simultâneo é exibido THEN o sistema SHALL mostrar, para cada mesa, um botão "Revisão individual" no card da mesa
2. WHEN o utilizador clica em "Revisão individual" da Mesa N THEN o sistema SHALL navegar para `/history/{sessionId}` correspondente àquela mesa
3. WHEN a página carrega THEN o sistema SHALL preservar as informações textuais de cada mesa (acertos/total/percentagem)

**Independent Test:** Completar treino simultâneo com 3 mesas → clicar "Revisão individual" na Mesa 2 → validar que abre a revisão da sessão correta (sessionId da Mesa 2).

---

### P1: Revisão múltipla de todas as mesas do bloco ⭐ MVP

**User Story:** Como utilizador, quero rever todas as mãos de todas as mesas do bloco simultâneo numa vista agregada para comparar decisões entre mesas.

**Why P1:** A revisão multi-sessão já existe em `/history/review-multi` mas não tem entrada a partir do resumo do treino.

**Acceptance Criteria:**

1. WHEN o resumo do treino simultâneo é exibido THEN o sistema SHALL mostrar um botão "Revisão múltipla"
2. WHEN o utilizador clica em "Revisão múltipla" THEN o sistema SHALL navegar para `/history/review-multi?ids={id1},{id2},...` com todos os sessionIds do bloco
3. WHEN existem N mesas no bloco THEN o sistema SHALL incluir exatamente N sessionIds na query string
4. WHEN a página carrega THEN o sistema SHALL preservar os botões existentes ("Novo treino simultâneo", "Treino normal") inalterados

**Independent Test:** Completar treino simultâneo com 2 mesas → clicar "Revisão múltipla" → validar que a página multi-review mostra mãos das 2 sessões ordenadas por data.

---

## Edge Cases

- WHEN o sessionId é inválido ao navegar para revisão THEN o sistema SHALL mostrar erro 404 (já tratado pelo router existente)
- WHEN a lista de sessionIds está vazia no resumo simultâneo THEN o sistema SHALL não exibir botões de revisão (caso de estado inconsistente)
- WHEN o utilizador completa treino com 1 mesa apenas no modo simultâneo THEN o sistema SHALL exibir "Revisão múltipla" mas com apenas 1 sessão (já suportado pelo MultiSessionReviewPage existente)

---

## Requirement Traceability

| Requirement ID | Story                                                            | Phase | Status  |
| -------------- | ---------------------------------------------------------------- | ----- | ------- |
| SRN-01         | P1: Botão "Rever sessão" no resultado single                     | Spec  | Pending |
| SRN-02         | P1: Navegação para `/history/{sessionId}` no single              | Spec  | Pending |
| SRN-03         | P1: Botão "Revisão individual" por mesa no resumo simultâneo     | Spec  | Pending |
| SRN-04         | P1: Navegação para `/history/{sessionId}` por mesa no simultâneo | Spec  | Pending |
| SRN-05         | P1: Botão "Revisão múltipla" no resumo simultâneo                | Spec  | Pending |
| SRN-06         | P1: Navegação para `/history/review-multi?ids=...` no simultâneo | Spec  | Pending |
| SRN-07         | P1: Preservar botões existentes em ambos os ecrãs                | Spec  | Pending |

**Coverage:** 7 total, 0 mapped to tasks, 7 unmapped ⚠️

---

## Testing Strategy

### Unit Tests (Vitest + Testing Library)

Ficheiros a criar:

- `src/renderer/src/pages/TrainingResultPage.test.tsx` — novo
- `src/renderer/src/pages/SimultaneousTrainingSummaryPage.test.tsx` — novo

#### Testes: TrainingResultPage

| Test ID   | Descrição                                                                 | Gatilho                      |
| --------- | ------------------------------------------------------------------------- | ---------------------------- |
| UT-SRN-01 | Renderiza botão "Rever sessão" ao lado dos botões existentes              | Page loads with session data |
| UT-SRN-02 | Clique em "Rever sessão" navega para `/history/{sessionId}`               | Simular click no link        |
| UT-SRN-03 | Botões "Nova sessão" e "Ver estatísticas" continuam a existir após adição | Page renders                 |

**Padrão:** Page com `window.api.training.getSessionResult` mocked → `MemoryRouter` + `Routes` → verificar `screen.getByRole('link', { name: 'Rever sessão' })` e atributo `href` do Link.

#### Testes: SimultaneousTrainingSummaryPage

| Test ID   | Descrição                                                                         | Gatilho                               |
| --------- | --------------------------------------------------------------------------------- | ------------------------------------- |
| UT-SRN-04 | Cada card de mesa exibe botão "Revisão individual"                                | Resumo com 3 mesas                    |
| UT-SRN-05 | Clique em "Revisão individual" navega para `/history/{sessionId}` da mesa correta | Click no botão da Mesa N              |
| UT-SRN-06 | Botão "Revisão múltipla" está visível                                             | Resumo carregado com ≥2 sessionIds    |
| UT-SRN-07 | "Revisão múltipla" navega para `/history/review-multi?ids={id1},{id2},...`        | Click no botão                        |
| UT-SRN-08 | Botões existentes ("Novo treino simultâneo", "Treino normal") preservados         | Resumo carregado                      |
| UT-SRN-09 | Botões de revisão não aparecem quando lista de sessionIds está vazia              | Estado inconsistente / sem sessionIds |

### E2E Tests (Playwright + Electron)

Ficheiros a alterar:

- `e2e/training.spec.ts` — atualizar teste "resultado da sessão liga para nova sessão" para também verificar "Rever sessão"
- `e2e/simultaneous-training/full-flow.spec.ts` — adicionar verificação dos botões de revisão no resumo

Ficheiros a criar (opcional, se justificar separação):

- `e2e/session-review-navigation/single-result.spec.ts` — navegação a partir do resultado single
- `e2e/session-review-navigation/simultaneous-summary.spec.ts` — navegação a partir do resumo simultâneo

#### Testes E2E

| Test ID    | Critério coberto                                                                                                      | Ficheiro                                                              |
| ---------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| E2E-SRN-01 | Resultado single: botão "Rever sessão" visível e navega para revisão                                                  | `e2e/training.spec.ts` (nova asserção no teste existente, linha ~202) |
| E2E-SRN-02 | Resumo simultâneo: botão "Revisão individual" por mesa navega corretamente                                            | `e2e/simultaneous-training/full-flow.spec.ts`                         |
| E2E-SRN-03 | Resumo simultâneo: botão "Revisão múltipla" navega para multi-review com todas as sessões                             | `e2e/simultaneous-training/full-flow.spec.ts`                         |
| E2E-SRN-04 | Botões existentes ("Nova sessão", "Ver estatísticas", "Novo treino simultâneo", "Treino normal") continuam funcionais | Mesmo ficheiro dos respetivos                                         |

**Notas de implementação E2E:**

- Usar `appPage.getByRole('link', { name: 'Rever sessão' })` para localizar o botão
- No resumo simultâneo, usar `appPage.getByRole('link', { name: /^Revisão individual/ })` e `appPage.getByRole('link', { name: 'Revisão múltipla' })`
- Verificar navegação: após clique, validar heading "Revisão da Sessão" ou "Revisão Múltipla" conforme o caso
- Reutilizar helpers existentes em `e2e/helpers/training.ts`

### Regras para os testes:

- Testes unitários usam `// @vitest-environment jsdom` e mock de `window.api.*`
- Mock `window.api.training.getSessionResult` com dados mínimos (hands array)
- Navegação testada via `MemoryRouter` + `Routes` nos unitários; via `appPage` nos E2E
- E2E devem criar dados próprios (register + group + situation + training flow)
- Nos E2E existentes, adicionar asserções sem quebrar a estrutura atual

---

## Success Criteria

- [ ] Utilizador consegue rever sessão single em 1 clique após ver resultado
- [ ] Utilizador consegue rever cada mesa individualmente a partir do resumo simultâneo
- [ ] Utilizador consegue rever todas as mesas agregadas a partir do resumo simultâneo
- [ ] Navegação não quebra para sessões com qualquer número de mesas (2-4)
- [ ] Zero alterações em páginas de revisão, IPC, ou backend
- [ ] Unit tests para ambos os componentes passam (UT-SRN-01 a UT-SRN-09)
- [ ] E2E tests para navegação de revisão passam (E2E-SRN-01 a E2E-SRN-04)
