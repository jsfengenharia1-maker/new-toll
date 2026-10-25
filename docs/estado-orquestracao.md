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
PAUSADO em 25/10/2026 a pedido do usuário. Nenhum agente rodando.

Situação ao pausar:
- `main` = 79b425c (gate verde: MD8, MD9, decisões ancoragem/γz/ábaco, pacote dividido).
- Branch da sessão `claude/quirky-curie-uqb7br` = main + desaprumo global no Edifício + ligação rígida barra–casca + punção com desaprumo (todos com tsc e testes próprios verdes; e2e completo 153/153).
- ENVIADO ao main em 25/10/2026 com aprovação do usuário ("aprovo o teste de desempenho da forma que está"); main = 29cf3b8. Observação mantida: `src/core/building/desempenho.test.ts` (13 pavimentos ≤ 3 s) reprovou no vitest completo (3133 ms). Medido lado a lado: branch 2,82–2,90 s × main 2,64–2,68 s (+7–8 %). Causa provável: casos D (4 direções × casos verticais) e as ELU extras do desaprumo, e/ou a ligação rígida. AO RETOMAR (opcional, já não bloqueia): agente de desempenho (perfil V8) para recuperar o custo sem mudar resultados (ex.: resolver os casos D como RHS da mesma fatoração, deduplicar combinações, cache), sem aumentar o limite do teste; depois gate completo e push no main.

Restante (13 itens dos checklists + fechamento; estimativa 8–12 h):
- V6a (C3.31, C3.33 cortes nas pranchas), V6b (C12.22 várias janelas de deformada), V6c (C11.49 3D da viga de fundação), K1.11.46 (resíduo N2).
- N4a (fogo NBR 15200: C4.44, C10.6, K1.5.15, K1.9.23), N4b (ábacos NBR 6123, Tab. 19.2: K1.5.23, K1.5.29, K1.13.2.4-2), E6b (C7.100 igualação entre panos): material do usuário em docs/pendencias-usuario.md; sem ele, padrão do CYPECAD + "a confirmar".
- Fechamento: limpar passos duplicados na memória do pórtico 2D (MD8 e MD9 instrumentaram γz/desaprumo do 2D), auditoria final independente, revisão final dos "a confirmar", atualizar contagem de testes no CLAUDE.md (hoje ~2.590), republicar o artifact (`npm run build:artifact`).

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
