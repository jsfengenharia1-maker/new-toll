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
Nenhum agente rodando (30/10/2026). `main` = f9f8112 + este registro (gate verde: 2670 testes, build, e2e 163/163; artifact versão 7).
Feito em 29–30/10 (usabilidade, aprovado pelo usuário): captura por alinhamento (F9), faixa do Edifício por 8 etapas + barra de etapas + um só Calcular (docs/analises/fluxo-etapas.md), defeitos da auditoria de usabilidade, janela "Antes de calcular" e painel "Erros do cálculo", lançamento em cadeia (viga/parede/carga linear sem Enter).
Em aberto com o usuário: regra da etapa Cargas (hoje: carga lançada ou sobrecarga diferente do padrão NBR 6120); capturas de tela do CYPECAD para conferir o layout (manual oficial inacessível na rede da sessão).
Restante anterior: N4a/N4b com material do usuário; momentos com sinal na punção das lajes; revisão do docs/a-confirmar-consolidado.md.

## Próxima rodada (depois desta)
1. Demais E5 (b–g, i–k), FU7d.
2. Fechamento: revisão numérica, desempenho, pacote (~4,7 MB: dividir sob demanda), republicação do artifact, revisão final dos "a confirmar".

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
1.906 testes, 126 fluxos e2e (paralelo), pacote 4.845 KB.
