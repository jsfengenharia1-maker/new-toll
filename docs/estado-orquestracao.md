# Estado da orquestração (retomada após compactação)

Atualizado em 24/10/2026. Ler junto com o Andamento de `docs/plano-execucao.md`. Este arquivo é reescrito a cada compactação.

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
24/10/2026 (conferir ao retomar), execução e escrita de cartões, a partir do main da rodada D7/E4c:
- (a) `cartao` (Haiku): V5 → E3c → E3d (`docs/cartoes/<fatia>/`, `validado.patch` de referência; foram validados antes da D7, então âncoras podem ter mudado).
- (b) `cartao` (Haiku): E4a (01–04) → E4b (01–06) → E4c (01–04; o 04 não foi validado).
- (c) `nucleo` (Sonnet médio): escrever os cartões da E3e (spec em `E3e/00-pendente.md`) e o TSX da E3f (01–04), validando aplicar/reverter.

Última rodada fechada em 24/10/2026: D7 (auditoria D corrigida, 4 e2e de layout), núcleo E4c (escadas por casca, validado analítico + OpenSees; `Casca3.acoplarGiro` opt-in), cartões V5/E3c/E3d reescritos. 1.631 testes, 91 e2e, pacote 4.304 KB. Testes "telhado"/"cobertura" passaram no gate desta vez.

## Próxima rodada (depois desta)
1. Executar os cartões da E3e e da E3f (Haiku); E4d (armadura das escadas, núcleo Sonnet alto).
2. Depois: E4e, L3, auditorias E/L/V, fechamento.

## Fila depois disso
- E4d–E4e (escadas), L3 (IFC).
- Auditorias independentes das frentes E, L e V.
- Fechamento: revisão numérica (punção de borda/canto, nervuradas contra OpenSees quando houver o pacote, bloco multi-pilar), desempenho (13 pavimentos acima de 3 s nesta máquina), pacote (~4,3 MB: dividir em partes sob demanda), republicação do artifact, revisão final dos "a confirmar".

## Decisões recentes do usuário (já registradas no CLAUDE.md/plano)
- Qualidade inegociável; revisão em lote; pendências normativas em `docs/pendencias-usuario.md`; itens "a confirmar" seguem o CYPECAD.
- Visual: tokens Spectrum 2 + paleta enxuta; layout BIMCraft adotado (todos os comandos continuam).
- Cotas (L6): face; move o selecionado; cota travada propaga; cotas do usuário nas pranchas.
- Lances desligados dos pilares: padrão do CYPECAD.
- Biblioteca de normas editável (N3) feita; NBR 15200:2024 virá do usuário depois.

## Números no último merge
1.631 testes, 91 fluxos e2e (paralelo), pacote 4.304 KB.
