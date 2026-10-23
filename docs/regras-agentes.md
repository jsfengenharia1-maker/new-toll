# Regras fixas dos agentes (economia de contexto sem perder verificação)

Decisão do usuário, 23/10/2026. Todo briefing cita este arquivo; o agente o lê antes de começar.

## Ambiente
- Worktree próprio a partir do `main`; `ln -s /home/user/new-toll/node_modules node_modules`.
- Não criar tarefas agendadas; não deixar processos em segundo plano; sem push nem merge no `main`.
- Relatório UMA vez, curto: branch, commits, itens, premissas "a confirmar", pendências, números.

## Leitura de arquivos (o contexto é o maior custo)
- Proibido ler inteiros: `docs/checklist-manual-cypecad.md`, `docs/checklist-manual-calculo-cypecad.md`, `docs/mapa-codigo.md`, `docs/historico-fatias.md`, `docs/plano-execucao.md`, `e2e/flows.mjs` (ou `e2e/flows/*`, quando dividido). Use `grep -n` e `sed -n 'a,bp'` em trechos.
- Checklists: `npm run checklist -- get <id>` / `set` / `lote` (quando disponível) em vez de editar à mão.
- Código: `grep` no `docs/mapa-codigo.md` para achar o arquivo; leia só as funções que vai tocar.

## Saída de comandos
- Testes durante o trabalho: `npx vitest related <arquivos> --run --reporter=dot 2>&1 | tail -40`; e2e só do filtro da fatia: `npm run e2e -- --no-build <filtro> 2>&1 | tail -30`.
- Logs longos sempre com `| tail -N` ou `| grep -E 'FAIL|Error|✗'`; nunca despejar build, vitest ou e2e inteiros.

## Verificação obrigatória ao fim (inalterada)
- `npx tsc -b`; `npx vitest run --reporter=dot 2>&1 | tail -30` (COMPLETO, verde); `npm run build 2>&1 | tail -5`; e2e completo `npm run e2e -- --workers 4 2>&1 | tail -30` quando a fatia tocar interface.
- Testes com valores esperados; cálculo novo validado contra solução analítica; baselines intactos.
- `npm run checklists` e `npm run mapa` no fim; commit.
- O orquestrador repete tsc, vitest completo, build e e2e completo antes de qualquer merge no `main`.

## Escopo e tamanho
- Uma fase por agente: núcleo OU cartões OU execução de cartões. Se o contexto passar de ~200 mil tokens, commitar, relatar o ponto exato e parar; um agente novo continua.
- Cartões de interface e ajustes de checklist/documentação vão para o Haiku; núcleo novo para Sonnet (alto) ou Opus.

## Convenções de projeto
- CLAUDE.md, design system (`src/app/ui`, tokens de `src/app/design/global.css`).
- e2e com `{ exact: true }`, exceto NumField/Select (regex ancorada no início).
- Cada cartão compila sozinho, na ordem. Sem botões novos acima do canvas/barra da planta.
- Premissas: CYPECAD onde define, NBR 6118 onde não; material normativo não verificável em `docs/pendencias-usuario.md`.
