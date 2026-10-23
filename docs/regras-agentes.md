# Regras fixas dos agentes (economia de contexto sem perder verificação)

Decisão do usuário, 23/10/2026. Todo briefing cita este arquivo; o agente o lê antes de começar.

## Ambiente
- Worktree próprio a partir do `main`; `ln -s /home/user/new-toll/node_modules node_modules`.
- Não criar tarefas agendadas; não deixar processos em segundo plano; sem push nem merge no `main`.
- Relatório UMA vez, curto: branch, commits, itens, premissas "a confirmar", pendências, números.

## Leitura de arquivos (o contexto é o maior custo)
- Proibido ler inteiros: `docs/checklist-manual-cypecad.md`, `docs/checklist-manual-calculo-cypecad.md`, `docs/mapa-codigo.md`, `docs/historico-fatias.md`, `docs/plano-execucao.md`, `e2e/flows/*`. Use `grep -n` e `sed -n 'a,bp'` em trechos.
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
- Fluxos e2e novos vão no arquivo da frente em `e2e/flows/` (exportar o fluxo) e ganham uma linha em `e2e/flows/index.mjs`; nunca num arquivo único.
- Cada cartão compila sozinho, na ordem. Sem botões novos acima do canvas/barra da planta.
- Premissas: CYPECAD onde define, NBR 6118 onde não; material normativo não verificável em `docs/pendencias-usuario.md`.

## Bloqueio automático (gancho do projeto)
`.claude/hooks/limitar-leitura.mjs` (PreToolUse em Read e Bash) recusa Read sem `limit` (ou com `limit` > 800) de arquivo acima de 60 KB e `cat/less/more` de arquivo grande sem pipe. A mensagem de recusa indica a alternativa; nenhum conteúdo fica inacessível. Erro no próprio gancho libera a chamada.

## Tipos de agente (`.claude/agents/`)
- `verificador` (Haiku): roda tsc/vitest/build/e2e e devolve só exit, contagens e falhas; nunca edita. O gate final do orquestrador antes do merge continua sendo executado por ele mesmo, conferindo exit e contagens.
- `cartao` (Haiku): executa cartões; não cria cálculo; para após duas falhas e nunca altera valor esperado de teste para passar.
- `nucleo` (Sonnet): núcleo + cartões. Opus continua sendo chamado com o tipo geral para cálculo novo.

## Acoplamento
Mudanças acopladas (função de cálculo, testes e comando da mesma função) ficam no mesmo agente; paralelismo só entre cartões/fatias independentes (arquivos distintos).

## NOTAS.md e relatório
Cada agente mantém `NOTAS.md` na raiz do worktree (plano, decisões, ponto atual; não commitar). Relatório final, uma vez, neste formato:
```
branch: <nome> | commits: <n> (<hashes curtos>)
arquivos: <lista curta>
verificação: tsc exit=<n> | vitest passou=<n> falhou=<n> | build exit=<n> | e2e passou=<n>/<total> (ou "não tocou interface")
itens: <ids Feito> | parciais: <ids>
a confirmar: <lista ou "nenhum">
pendências normativas: <lista ou "nenhuma">
desvios do briefing/cartões: <lista ou "nenhum">
```
