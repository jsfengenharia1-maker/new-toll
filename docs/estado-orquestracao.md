# Estado da orquestração (retomada após compactação)

Atualizado em 23/10/2026. Ler junto com o Andamento de `docs/plano-execucao.md`. Este arquivo é reescrito a cada compactação.

## Como retomar
1. `git -C /home/user/new-toll fetch -q origin main && git -C /home/user/new-toll status -sb` e `git worktree list` (worktrees de agentes em `.claude/worktrees/agent-*`).
2. Agentes de uma rodada interrompida (limite de sessão ou reinício do contêiner) são retomados por SendMessage com o id do agente; se o id se perdeu, olhar o worktree (`git -C <wt> log`, `git -C <wt> status`) e soltar um agente novo para terminar a partir dali.
3. Merge da rodada (revisão em lote, CLAUDE.md): para cada branch `worktree-agent-*` concluído:
   - `git merge --no-edit <branch>`;
   - docs em conflito: `python3 scripts/orquestracao/resolver-docs.py <arquivos .md>` (mantém a linha de checklist de maior situação; cuidado: quando um branch REBAIXA itens, reaplicar as linhas dele);
   - `docs/mapa-codigo.md`: `git checkout --theirs` e depois `npm run mapa`;
   - `e2e/flows/`: mergear o arquivo da frente (sem conflito, é arquivo novo) e acrescentar a linha do fluxo em `e2e/flows/index.mjs` (import do arquivo, se novo, e entrada na lista, na ordem desejada); conferir com `node --check e2e/flows/index.mjs` e o e2e;
   - código em conflito: unir os dois lados à mão (comandos, opções, premissas, imports, registros);
   - `npm run checklists`, `npx tsc -b`, `npx vitest run` (completo), `npm run e2e` (completo, paralelo) — tudo verde antes de `git push origin HEAD:main HEAD:claude/quirky-curie-uqb7br`;
   - remover worktrees e branches dos agentes juntados.
4. Briefing padrão dos agentes: citar `docs/regras-agentes.md`. Antes: ver as rodadas recentes no histórico desta sessão; regras fixas — worktree próprio + `ln -s /home/user/new-toll/node_modules node_modules`; consultar `docs/mapa-codigo.md`; e2e com `{ exact: true }` exceto NumField/Select (regex ancorada); cada cartão compila sozinho; não criar tarefas agendadas; sem processos em segundo plano; relatório UMA vez; `npm run mapa` no fim.

## Rodada em andamento
24/10/2026 (conferir ao retomar): (a) D7 — correções da auditoria D (`docs/auditorias/auditoria-D.md`, 12 itens "corrigir" + sugestões baratas; Sonnet baixo); (b) núcleo da E4c (cálculo das escadas; Sonnet alto); (c) reescrever no layout novo os cartões de interface de V5, E3c, E3d, E3e e completar os da E3f (TSX), validando aplicar/reverter (Sonnet médio, só docs/cartoes).

Última rodada fechada em 24/10/2026 (main 6cdccb9): e2e divididos em `e2e/flows/<frente>.mjs` (equivalência provada), auditoria D (sem bloqueante), núcleo E4b. 1.586 testes, 87 e2e, pacote 4.233 KB. Atenção: testes "telhado"/"cobertura" (exemplos/planos) passam isolados (~10 s), mas estouram 120 s com a máquina carregada.

## Próxima rodada (depois desta)
1. Execução dos cartões no Haiku (tipo `cartao`), 3 agentes por frente: (E3c+E3d+E3e), (E3f+V5), (E4a+E4b). Fluxos novos em `e2e/flows/<frente>.mjs` + linha no `index.mjs`.
2. Depois: E4d, E4e, L3, auditorias E/L/V, fechamento.

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
1.586 testes, 87 fluxos e2e (paralelo), pacote 4.233 KB.
