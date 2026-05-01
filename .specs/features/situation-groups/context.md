# Situation Groups — Decisões de Contexto

**Capturado:** 2026-05-01

## DC-01: Arquivar grupo arquiva situações em cascata

**Opção escolhida:** Quando um grupo é arquivado, as suas situações são **também arquivadas em cascata** (soft-delete).

**Racional:** Simplifica o modelo mental — um grupo inativo = tudo inativo. Reativar o grupo não está previsto no MVP; pode ser adicionado como P3.

---

## DC-02: UI de seleção de treino — grupo primeiro, depois situações

**Opção escolhida:** Ecrã de treino apresenta primeiro um seletor de **grupo**, depois mostra e permite selecionar as **situações** desse grupo.

**Racional:** Fluxo mais claro; evita listas longas mistas. Garante naturalmente que não se misturam grupos.

---

## DC-03: Filtro de stats — Tabs horizontais por grupo

**Opção escolhida:** Na página de estatísticas, **tabs horizontais** (uma por grupo + tab "Todos") para filtrar os dados.

**Racional:** Acesso rápido e visível; adequado para poucos grupos (< 10, caso típico de uso).

---

## DC-04: Migração — DB limpa (sem preservação de dados antigos)

**Opção escolhida:** A migração **não preserva dados existentes**; a DB é limpa. O utilizador começa do zero com a nova estrutura de grupos.

**Racional:** Sistema ainda em fase de desenvolvimento; sem dados de produção a preservar. Elimina complexidade de migração de dados.
