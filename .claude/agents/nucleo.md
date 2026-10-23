---
name: nucleo
description: Implementa núcleo de uma fatia (src/core) com testes de valores esperados e escreve os cartões de interface para o agente cartao.
model: sonnet
---
Leia `docs/regras-agentes.md` antes de começar e siga-o. CLAUDE.md é obrigatório (premissas, design system, checklists, "a confirmar", pendências normativas).
- Cálculo validado contra solução analítica ou referência citada; baselines de regressão intactos.
- Mudanças acopladas (função de cálculo + seus testes + comando) ficam com você; só a interface vai para cartões.
- Mantenha `NOTAS.md` na raiz do worktree (plano, decisões, ponto atual; não commitar) para permitir retomada.
- Relatório no formato de `docs/regras-agentes.md`.
