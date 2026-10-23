# Estado da orquestração (retomada após compactação)

Atualizado em 23/10/2026. Ler junto com o Andamento de `docs/plano-execucao.md`. Este arquivo é reescrito a cada compactação.

## Como retomar
1. `git -C /home/user/new-toll fetch -q origin main && git -C /home/user/new-toll status -sb` e `git worktree list` (worktrees de agentes em `.claude/worktrees/agent-*`).
2. Agentes de uma rodada interrompida (limite de sessão ou reinício do contêiner) são retomados por SendMessage com o id do agente; se o id se perdeu, olhar o worktree (`git -C <wt> log`, `git -C <wt> status`) e soltar um agente novo para terminar a partir dali.
3. Merge da rodada (revisão em lote, CLAUDE.md): para cada branch `worktree-agent-*` concluído:
   - `git merge --no-edit <branch>`;
   - docs em conflito: `python3 scripts/orquestracao/resolver-docs.py <arquivos .md>` (mantém a linha de checklist de maior situação; cuidado: quando um branch REBAIXA itens, reaplicar as linhas dele);
   - `docs/mapa-codigo.md`: `git checkout --theirs` e depois `npm run mapa`;
   - `e2e/flows.mjs`: `python3 scripts/orquestracao/flows-add.py <branch> "<Prefixo:>"` (reconstrói = HEAD + fluxos novos do branch) e `node --check e2e/flows.mjs`;
   - código em conflito: unir os dois lados à mão (comandos, opções, premissas, imports, registros);
   - `npm run checklists`, `npx tsc -b`, `npx vitest run` (completo), `npm run e2e` (completo, paralelo) — tudo verde antes de `git push origin HEAD:main HEAD:claude/quirky-curie-uqb7br`;
   - remover worktrees e branches dos agentes juntados.
4. Briefing padrão dos agentes: citar `docs/regras-agentes.md`. Antes: ver as rodadas recentes no histórico desta sessão; regras fixas — worktree próprio + `ln -s /home/user/new-toll/node_modules node_modules`; consultar `docs/mapa-codigo.md`; e2e com `{ exact: true }` exceto NumField/Select (regex ancorada); cada cartão compila sozinho; não criar tarefas agendadas; sem processos em segundo plano; relatório UMA vez; `npm run mapa` no fim.

## Rodada em andamento
23/10/2026 (soltar/conferir ao retomar): (a) dividir `e2e/flows.mjs` em `e2e/flows/<frente>.mjs` com os mesmos 87 fluxos (Sonnet baixo); (b) auditoria independente da frente D (layout) — só relatório (Sonnet médio); (c) núcleo da E4b (escadas: lançamento, edição e biblioteca; Sonnet médio). Briefings citam `docs/regras-agentes.md`. Agentes de worktree em `.claude/worktrees/agent-*`.

Última rodada fechada em 23/10/2026 (main 438fcb4): layout D4–D6 (navegador em árvore, Propriedades, `mapaLayout.test.ts`), script `npm run checklist`, núcleos E4a (escadas) e E3f (inclinadas, rampas, desníveis; validado com método das forças e OpenSees), padrão das paredes sob o patamar 15,70/24,53 kN/m³ (programa de referência).

## Próxima rodada (depois desta)
1. Cartões de interface no layout novo e execução no Haiku (tipo `cartao`): V5, E3c, E3d, E3e (reescrever), E3f (só especificação: escrever o TSX), E4a (01–04; o 04 já é do layout novo), E4b. Fluxos novos em `e2e/flows/<frente>.mjs`.
2. E4c (cálculo das escadas, Sonnet alto) em paralelo.

## Fila depois disso
- E4b–E4e (escadas), L3 (IFC).
- Auditorias independentes das frentes E, L e V.
- Fechamento: revisão numérica (punção de borda/canto, nervuradas contra OpenSees quando houver o pacote, bloco multi-pilar), desempenho (13 pavimentos acima de 3 s nesta máquina), pacote (~4,2 MB: dividir em partes sob demanda), republicação do artifact, revisão final dos "a confirmar".

## Decisões recentes do usuário (já registradas no CLAUDE.md/plano)
- Qualidade inegociável; revisão em lote; pendências normativas em `docs/pendencias-usuario.md`; itens "a confirmar" seguem o CYPECAD.
- Visual: tokens Spectrum 2 + paleta enxuta; layout BIMCraft adotado (todos os comandos continuam).
- Cotas (L6): face; move o selecionado; cota travada propaga; cotas do usuário nas pranchas.
- Lances desligados dos pilares: padrão do CYPECAD.
- Biblioteca de normas editável (N3) feita; NBR 15200:2024 virá do usuário depois.

## Números no último merge
1.566 testes, 87 fluxos e2e (paralelo), pacote 4.224 KB.
