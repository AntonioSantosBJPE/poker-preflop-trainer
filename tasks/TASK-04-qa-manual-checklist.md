# TASK-04-qa-manual-checklist

## Objetivo

Checklist de QA manual derivado de §7–§8; não exige código.

## Entregável

Marcar itens ao validar builds de release / candidatos a tag.

## Checklist

- [ ] CSP ativa (sem erros óbvios no console por scripts bloqueados legítimos).
- [ ] Login, logout, `me` após reinício da app.
- [ ] Criar situação com 2 ações + grid; validar erro se nenhuma célula.
- [ ] Duplicar situação; arquivar; lista não mostra arquivadas.
- [ ] Treino: timer 0 e timer > 0 com timeout.
- [ ] Mão fora de range → acerto ao escolher FOLD (quando FOLD existe).
- [ ] Mão com estratégia mista aceita mais do que uma ação correta.
- [ ] Estatísticas: overview e gráfico com 2+ sessões.
- [ ] Instalador/AppImage ou artefacto gerado localmente abre (smoke).

## Referência

- Especificação §7–§8.
