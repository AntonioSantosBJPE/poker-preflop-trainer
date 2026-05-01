# Spec: Confirmação de Arquivamento de Situações

**Feature:** ARCHIVE-CONFIRMATION  
**Data:** 2026-05-01  
**Âmbito:** Exigir confirmação explícita do utilizador antes de arquivar uma situação individual ou um grupo de situações.

---

## Problem Statement

Atualmente o arquivamento pode ser executado diretamente a partir da UI, o que aumenta risco de ação acidental e perda de visibilidade imediata dos itens ativos.  
É necessário inserir uma etapa de confirmação para operações de arquivamento, cobrindo tanto o fluxo de uma situação única quanto o fluxo em lote/grupo.

---

## Goals

- [x] Toda ação de arquivar situação(s) deve abrir um diálogo de confirmação antes de executar a operação.
- [x] A operação só deve ser executada após confirmação explícita do utilizador.
- [x] Cancelar/fechar o diálogo não deve produzir qualquer alteração de dados.
- [x] O mesmo padrão deve ser aplicado de forma consistente para arquivamento individual e em grupo.

---

## Out of Scope

| Item | Reason |
|------|--------|
| Implementar “desarquivar” (undo) | Fora do pedido atual |
| Alterar regras de soft-delete no backend | O objetivo é confirmar antes da ação, não mudar o modelo de persistência |
| Redesign completo de componentes de modal | Apenas o fluxo de confirmação necessário |

---

## User Stories

### P1: Confirmar arquivamento de situação única ⭐ MVP

**User Story:** Como utilizador, quero confirmar antes de arquivar uma situação para evitar arquivamentos acidentais.

**Acceptance Criteria:**

1. WHEN o utilizador aciona “Arquivar” numa situação individual THEN o sistema SHALL abrir um diálogo de confirmação.
2. WHEN o utilizador confirma no diálogo THEN o sistema SHALL executar o arquivamento e atualizar a UI.
3. WHEN o utilizador cancela ou fecha o diálogo THEN o sistema SHALL não executar arquivamento.
4. WHEN o arquivamento é concluído THEN o sistema SHALL apresentar feedback de sucesso consistente com os padrões atuais da app.

**Independent Test:** Clicar “Arquivar” em uma situação, cancelar no diálogo, validar que a situação permanece ativa.

---

### P1: Confirmar arquivamento de grupo/lote de situações ⭐ MVP

**User Story:** Como utilizador, quero confirmar antes de arquivar várias situações para evitar impacto acidental em massa.

**Acceptance Criteria:**

1. WHEN o utilizador aciona “Arquivar” para um grupo/lote THEN o sistema SHALL abrir um diálogo de confirmação para a ação em massa.
2. WHEN o utilizador confirma no diálogo THEN o sistema SHALL arquivar todas as situações alvo.
3. WHEN o utilizador cancela ou fecha o diálogo THEN o sistema SHALL não arquivar nenhum item do lote.
4. WHEN a seleção alvo muda antes da confirmação THEN o sistema SHALL aplicar o arquivamento apenas ao conjunto confirmado no momento da ação.

**Independent Test:** Selecionar múltiplas situações, iniciar arquivamento, cancelar, validar que nenhuma foi arquivada.

---

## Edge Cases

- WHEN o utilizador aciona arquivar repetidamente (duplo clique) THEN o sistema SHALL impedir execuções duplicadas concorrentes da mesma ação.
- WHEN ocorre erro de persistência após confirmação THEN o sistema SHALL manter consistência visual (sem remover item indevidamente) e exibir erro ao utilizador.
- WHEN não há itens selecionados no fluxo em lote THEN o sistema SHALL bloquear a ação antes de abrir confirmação.

---

## Requirement Traceability

| Requirement ID | Descrição | Status |
|----------------|-----------|--------|
| ARC-01 | Abrir diálogo de confirmação no arquivamento individual | Done |
| ARC-02 | Executar arquivamento individual apenas com confirmação explícita | Done |
| ARC-03 | Cancelar/fechar diálogo não altera dados no arquivamento individual | Done |
| ARC-04 | Abrir diálogo de confirmação no arquivamento em lote/grupo | Done |
| ARC-05 | Executar arquivamento em lote/grupo apenas com confirmação explícita | Done |
| ARC-06 | Cancelar/fechar diálogo não altera dados no arquivamento em lote/grupo | Done |
| ARC-07 | Proteger contra submissão duplicada da mesma ação de arquivamento | Done |

---

## Success Criteria

- [x] Nenhum arquivamento é executado sem confirmação explícita do utilizador.
- [x] Cancelamento no diálogo preserva integralmente o estado anterior.
- [x] Fluxos individual e em lote têm comportamento consistente de confirmação.
- [x] Cobertura de testes inclui os caminhos de confirmar e cancelar para ambos os fluxos.
