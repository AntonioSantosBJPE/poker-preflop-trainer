# Spec: Treino Simultâneo (Multi-Mesa)

**Feature:** SIMULTANEOUS-TRAINING  
**Data:** 2026-05-01  
**Âmbito:** Introduzir um novo fluxo de treino simultâneo (2 a 4 sessões paralelas) sem quebrar o fluxo de treino atual, simulando multi-tabling de poker com configuração compartilhada entre as mesas da mesma sessão.

---

## Problem Statement

O produto hoje oferece apenas uma sessão de treino por vez (single-table flow). Isso cobre estudo linear, mas não reproduz um comportamento real de jogadores de cash game e MTT: jogar várias mesas em simultâneo.  
Sem esta capacidade, o treino não exercita troca rápida de contexto nem tomada de decisão sob carga cognitiva de múltiplas mesas ativas.

É necessário criar uma nova seção dedicada no menu e um novo modo no sistema de treino para executar entre 2 e 4 sessões simultâneas, com as mesmas configurações-base aplicadas a todas as mesas do bloco.

---

## Goals

- [x] Preservar o fluxo de treino atual (single session) sem regressões.
- [x] Adicionar uma nova seção de menu para o modo de treino simultâneo.
- [x] Permitir ao utilizador escolher quantidade de mesas simultâneas entre 2 e 4.
- [x] Permitir configurar uma vez e aplicar a configuração a todas as mesas da sessão simultânea.
- [x] Garantir isolamento de estado por mesa durante a execução (progresso, mão atual, resposta e feedback por mesa).
- [x] Priorizar cobertura E2E ponta a ponta para validar o fluxo completo.

---

## Out of Scope

| Item | Reason |
|------|--------|
| Suporte a 5+ mesas simultâneas | Fora do escopo inicial; complexidade de UX/performance aumenta bastante |
| Configuração distinta por mesa no mesmo bloco | MVP exige configuração unificada para todas as mesas |
| Sincronização online/multiplayer | Feature é local e single-user |
| Reformulação completa do motor de treino | Objetivo é extensão de fluxo, não reescrita do core |

---

## User Stories

### P1: Nova entrada no menu para Treino Simultâneo ⭐ MVP

**User Story:** Como utilizador, quero uma seção dedicada de treino simultâneo no menu para iniciar esse modo sem interferir no fluxo atual.

**Acceptance Criteria:**

1. WHEN a aplicação carrega THEN o sistema SHALL exibir a opção "Treino Simultâneo" no menu principal.
2. WHEN o utilizador clica em "Treino Simultâneo" THEN o sistema SHALL navegar para a página de configuração do modo multi-mesa.
3. WHEN o utilizador usa o fluxo de treino atual THEN o sistema SHALL manter comportamento existente sem dependência do novo modo.

**Independent Test:** Aceder ao menu, abrir "Treino Simultâneo", voltar ao treino normal e validar que ambos os fluxos funcionam de forma independente.

---

### P1: Configuração única para 2 a 4 mesas ⭐ MVP

**User Story:** Como utilizador, quero definir quantidade de mesas e uma configuração única para todas elas para iniciar rapidamente um treino multi-mesa realista.

**Acceptance Criteria:**

1. WHEN o utilizador abre a configuração multi-mesa THEN o sistema SHALL oferecer seleção de `2`, `3` ou `4` mesas.
2. WHEN o utilizador define os parâmetros de treino (ex.: seleção de situações/grupo/regras ativas) THEN o sistema SHALL aplicar os mesmos parâmetros a todas as mesas.
3. WHEN o utilizador tenta iniciar sem configuração válida THEN o sistema SHALL bloquear início com erro de validação claro.
4. WHEN o utilizador inicia o treino multi-mesa THEN o sistema SHALL criar uma sessão simultânea com N mesas ativas, onde N ∈ {2,3,4}.

**Independent Test:** Selecionar 3 mesas, configurar treino, iniciar e validar que as 3 mesas abriram com configuração idêntica.

---

### P1: Execução simultânea com estado isolado por mesa ⭐ MVP

**User Story:** Como utilizador, quero responder em múltiplas mesas em paralelo sem que ações de uma mesa alterem o estado das outras.

**Acceptance Criteria:**

1. WHEN o treino multi-mesa está ativo THEN o sistema SHALL renderizar N painéis de mesa visíveis em simultâneo.
2. WHEN o utilizador responde numa mesa específica THEN o sistema SHALL atualizar apenas o estado dessa mesa (resultado, próxima mão, contadores locais).
3. WHEN mesas diferentes recebem respostas em ordem arbitrária THEN o sistema SHALL manter consistência de progresso individual por mesa.
4. WHEN o bloco de treino termina THEN o sistema SHALL consolidar estatísticas da sessão simultânea sem perda de eventos por mesa.

**Independent Test:** Com 2 mesas ativas, errar numa mesa e acertar noutra; validar feedback e progresso independentes.

---

### P1: Encerramento e resumo da sessão simultânea ⭐ MVP

**User Story:** Como utilizador, quero encerrar o treino simultâneo e visualizar resumo agregado para medir performance no modo multi-mesa.

**Acceptance Criteria:**

1. WHEN o utilizador termina ou interrompe o treino simultâneo THEN o sistema SHALL persistir a sessão e respetivos resultados.
2. WHEN o resumo é exibido THEN o sistema SHALL mostrar métricas agregadas do bloco (acertos, erros, total de decisões) e permitir distinguir contribuição por mesa.
3. WHEN a sessão simultânea fica disponível em histórico/stats THEN o sistema SHALL manter compatibilidade com consultas existentes.

**Independent Test:** Concluir sessão com 4 mesas e validar presença no histórico com métricas coerentes.

---

### P2: Guardrails de UX e performance

**User Story:** Como utilizador, quero que o sistema limite cenários inválidos e mantenha fluidez mínima para não comprometer o treino.

**Acceptance Criteria:**

1. WHEN o utilizador tenta selecionar menos de 2 ou mais de 4 mesas por manipulação de estado/UI THEN o sistema SHALL rejeitar com validação também no main process.
2. WHEN ocorre erro numa mesa específica THEN o sistema SHALL reportar erro sem derrubar as outras mesas ativas, sempre que possível.
3. WHEN a renderização multi-mesa está ativa THEN o sistema SHALL manter responsividade da UI dentro de limites aceitáveis no hardware-alvo do projeto.

**Independent Test:** Forçar payload inválido (`tableCount=5`) via bypass e validar rejeição no backend.

---

## Edge Cases

- WHEN o utilizador navega para outra página com sessão multi-mesa ativa THEN o sistema SHALL pedir confirmação antes de abandonar o treino para evitar perda acidental.
- WHEN uma mesa esgota a fila de mãos antes das outras THEN o sistema SHALL manter as restantes em execução sem encerrar o bloco inteiro prematuramente.
- WHEN existem cliques rápidos/repetidos na mesma ação THEN o sistema SHALL prevenir dupla submissão por mesa.
- WHEN a sessão é restaurada após crash/reload inesperado (se suportado) THEN o sistema SHALL definir regra explícita: retomar consistentemente ou encerrar com estado seguro.

---

## Testing Strategy

Esta feature é altamente sensível a regressões de fluxo e concorrência de estado UI, portanto E2E é critério de aceite principal.

### E2E (Playwright + Electron) — Cobertura obrigatória

| Test ID | Critério coberto | Ficheiro sugerido |
|---------|------------------|-------------------|
| E2E-MT-01 | Menu exibe "Treino Simultâneo" e navegação funciona | `e2e/simultaneous-training/navigation.spec.ts` |
| E2E-MT-02 | Fluxo atual de treino continua funcional após introdução do novo modo | `e2e/simultaneous-training/regression-single-flow.spec.ts` |
| E2E-MT-03 | Seleção válida de 2/3/4 mesas inicia sessão com quantidade correta | `e2e/simultaneous-training/session-config.spec.ts` |
| E2E-MT-04 | Tentativa de iniciar sem configuração válida bloqueia com erro claro | `e2e/simultaneous-training/session-config.spec.ts` |
| E2E-MT-05 | Estados por mesa são isolados (ação numa mesa não afeta outra) | `e2e/simultaneous-training/isolated-state.spec.ts` |
| E2E-MT-06 | Ordem arbitrária de respostas mantém progresso consistente por mesa | `e2e/simultaneous-training/isolated-state.spec.ts` |
| E2E-MT-07 | Encerramento persiste sessão e resumo agregado com dados coerentes | `e2e/simultaneous-training/session-summary.spec.ts` |
| E2E-MT-08 | Bypass com `tableCount` inválido (<2, >4) é rejeitado no main process | `e2e/simultaneous-training/backend-validation.spec.ts` |
| E2E-MT-09 | Navegação com sessão ativa pede confirmação de abandono | `e2e/simultaneous-training/leave-guard.spec.ts` |
| E2E-MT-10 | Fluxo completo: configurar 3 mesas → jogar → concluir → validar histórico/stats | `e2e/simultaneous-training/full-flow.spec.ts` |

**Regras para os E2E desta feature:**

- Usar convenções e fixtures já adotados pelo projeto em `e2e/`.
- Cada spec deve criar seus próprios dados e não depender de ordem de execução.
- Prioridade de implementação E2E: `E2E-MT-10`, `E2E-MT-05`, `E2E-MT-03`, `E2E-MT-08`.
- O bypass de validação deve testar a fronteira no backend (IPC/main), não apenas bloqueio de UI.

### Unit/Integration (suporte ao E2E)

| Camada | O que validar | Prioridade |
|--------|---------------|------------|
| Shared domain (tipos/contratos) | Limites de `tableCount` e shape da sessão simultânea | P1 |
| Main IPC handlers | Validação de payload, criação de sessão multi-mesa, erros formatados | P1 |
| Engine/serviços de treino | Isolamento de estado por mesa e agregação de resultados | P1 |
| Renderer state | Atualizações por mesa sem vazamento entre painéis | P2 |

---

## Requirement Traceability

| Requirement ID | Descrição | Status |
|----------------|-----------|--------|
| SMT-01 | Nova entrada de menu para "Treino Simultâneo" | Done |
| SMT-02 | Navegação para nova seção de configuração multi-mesa | Done |
| SMT-03 | Manter fluxo de treino atual sem regressão funcional | Done |
| SMT-04 | Permitir apenas 2, 3 ou 4 mesas na configuração | Done |
| SMT-05 | Aplicar configuração única a todas as mesas da sessão | Done |
| SMT-06 | Bloquear início quando configuração não é válida | Done |
| SMT-07 | Criar sessão simultânea com N mesas ativas (N ∈ {2,3,4}) | Done |
| SMT-08 | Garantir isolamento de estado por mesa durante execução | Done |
| SMT-09 | Consolidar resultados do bloco sem perda de eventos | Done |
| SMT-10 | Persistir sessão simultânea e exibir resumo agregado | Done |
| SMT-11 | Rejeitar payload inválido de contagem de mesas no main process | Done |
| SMT-12 | Exigir confirmação ao abandonar sessão ativa | Done |
| SMT-13 | Cobertura E2E obrigatória do fluxo completo multi-mesa | Done |
| SMT-14 | Cobertura E2E de regressão do fluxo single-table | Done |

---

## Success Criteria

- [x] O utilizador consegue iniciar e concluir treino simultâneo com 2, 3 ou 4 mesas.
- [x] O treino atual continua operacional sem alterações de comportamento percebidas.
- [x] Não há vazamento de estado entre mesas simultâneas.
- [x] O backend rejeita qualquer payload fora dos limites de mesas definidos.
- [x] A suíte E2E da feature cobre navegação, configuração, execução, encerramento e regressão do fluxo antigo.
