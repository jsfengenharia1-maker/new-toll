# Statikos para agentes de IA (linha de comando e MCP)

O módulo Edifícios foi feito para ser operado por pessoas e por agentes com as mesmas regras. Há três portas para o mesmo núcleo (`src/core`) e o mesmo registro de comandos:

| Porta | Para quê | Onde |
|---|---|---|
| Interface web | lançamento na planta, prévia das pranchas | aba Edifício |
| Linha de comando | lotes, integração contínua, scripts | `node dist-cli/statikos.mjs` |
| Servidor MCP (stdio) | agentes (Claude Code, Claude Desktop, outros clientes MCP) | `node dist-cli/statikos.mjs mcp` |

Toda alteração do edifício é um **comando** com JSON Schema, validação, desfazer e registro no log do arquivo `.statikos`. O log reconstrói o modelo (replay). Não existe execução de código livre.

## Instalar e ligar

```bash
npm i
npm run cli                     # gera dist-cli/statikos.mjs (Node ≥ 20)
node dist-cli/statikos.mjs      # ajuda
```

Claude Code:

```bash
claude mcp add statikos -- node /caminho/para/new-toll/dist-cli/statikos.mjs mcp
```

Claude Desktop (`claude_desktop_config.json`):

```json
{ "mcpServers": { "statikos": { "command": "node", "args": ["/caminho/para/new-toll/dist-cli/statikos.mjs", "mcp"] } } }
```

O servidor trabalha sobre um edifício em memória. Abra um arquivo com `abrir` ou comece com `novo`, e grave com `salvar`. O DWG usa `public/vendor/nasjidwg-*.mjs`, que precisa estar ao lado de `dist-cli/` (o repositório já o traz).

## Regra de ouro: prévia, depois aplicar

1. A ferramenta de um comando (ex.: `pilar_inserir`) **não altera nada**. Ela devolve `{ ok, diff: { criados, alterados, removidos, resumo }, token, diagnosticos }`.
2. Mostre o `diff.resumo` ao usuário quando a mudança for relevante.
3. `aplicar { token }` executa. O token vale só para a revisão do modelo em que a prévia foi feita.
4. Ferramentas marcadas como destrutivas (`destructiveHint`) removem dados: confirme com o usuário antes de aplicar.
5. `desfazer` e `refazer` estão sempre disponíveis.

Comandos sem ferramenta própria (o limite é de 40 ferramentas) passam pela prévia genérica: `previa { comando: "prancha.definir", params: {...} }`. A lista completa, com schemas, sai da ferramenta `comandos`.

Opções de cálculo (malha da grelha, torção de vigas, lajes e pilares, rigidez axial dos pilares, trecho rígido, engaste no topo do último lance): `previa { comando: "opcoes.definir", params: { valores: { malha: 0.25 } } }`; `{ padrao: true }` volta tudo ao padrão. Vínculos por elemento: `pilar.engaste { ids, pavimentos?, topo?, base? }` (pela `previa`), `viga_editar` com `engasteIni`, `engasteFim`, `articulacoes`, `torcaoEquilibrio`, `engasteLajes`, `foraDiafragma`, e `laje.editar` com `engasteBordas` (um coeficiente por aresta do contorno). Materiais e segurança: `materiais.definir { fck, fckPilarPav, aco, gamas, cobFaces, padrao }` e flambagem `pilar.flambagem { ids, pavimentos?, au?, av? }` (ambos pela `previa`). O padrão segue a NBR 6118; os valores sem norma são "a confirmar" (ver `statikos://premissas`).

## Ferramentas

| Ferramenta | O que faz |
|---|---|
| `abrir`, `novo`, `salvar` | arquivo de trabalho `.statikos` (o `salvar` preserva pórtico, biblioteca e histórico do arquivo aberto) |
| `resumo`, `modelo` | leitura do edifício |
| `verificar` | diagnósticos de lançamento, com correção sugerida executável (`sugestao: { comando, params }`) |
| `calcular` | análise: grelha por pavimento + pórtico espacial, vento NBR 6123, γz, cargas na fundação, flechas, equilíbrio |
| `dimensionar` | NBR 6118: vigas, pilares por lance, lajes; quantitativos; cargas para Fundações. Filtros `pavimento` e `so_problemas` |
| `pranchas` | planta de formas por grupo: PDF (todas), DXF R2000 e DWG R2018 (uma por arquivo) |
| `aplicar`, `previa`, `comandos`, `desfazer`, `refazer` | fluxo de alteração |
| `obra_definir`, `norma_definir`, `vento_definir` | dados da obra, materiais e CAA, vento |
| `grupo_criar`, `grupo_editar` | grupos de pavimentos iguais (uso e cargas) |
| `pavimento_criar`, `pavimento_editar`, `pavimento_remover`, `pavimento_repetir` | pavimentos (cota = topo da laje) |
| `eixo_malha` | malha de eixos |
| `mascara_importar` | DXF de arquitetura como máscara de um grupo |
| `pilar_inserir`, `pilar_editar`, `pilar_remover` | pilares (seção por lance, ponto fixo, nascimento e morte) |
| `viga_tracar`, `viga_editar`, `viga_remover`, `viga_copiarParaGrupos` | vigas por polilinha, com alinhamento pelo eixo ou por uma face |
| `viga_alinharFace` | loca vigas pela face dos pilares (contorno na face externa, ou face esquerda/direita) |
| `laje_detectarPanos`, `laje_criar` | lajes maciças e treliçadas |
| `carga_ponto`, `carga_linha`, `carga_area`, `carga_alvenariaDaMascara` | cargas adicionais e alvenaria lida da máscara |
| `lote` | vários comandos como um passo só (um desfazer); para no primeiro erro |

## Recursos

| URI | Conteúdo |
|---|---|
| `statikos://modelo` | modelo físico |
| `statikos://diagnosticos` | verificação de lançamento |
| `statikos://premissas` | premissas de cálculo em uso, com fonte e marca "a confirmar" |
| `statikos://log` | log de comandos |
| `statikos://resultados` | dimensionamento do edifício (recalcula se o modelo mudou) |
| `statikos://resultados/{pavimento}` | recorte por pavimento (id ou nome) |

## Convenções

- **Unidades:** m, kN, kN/m², graus. Seções de pilar e viga em m (`{ tipo: "ret", b: 0.2, h: 0.4 }`). Os resultados de armadura vêm em texto ("4 φ12,5"); as áreas, em m² (vigas e pilares) ou cm²/m (lajes).
- **Ids** são estáveis e determinísticos (`pav_4`, `g_3`, `v_1a`); nomes (`P1`, `V3`) são rótulos e podem mudar na renumeração.
- **Grupo × pavimento:** vigas, lajes e cargas pertencem a um grupo (pavimentos iguais); pilares atravessam pavimentos (`nasce`, `morre`, seção por lance).
- **Viga:** a polilinha traçada é o eixo (`alinhamento: "centro"`) ou uma face (`"esq"`/`"dir"`, olhando do primeiro ao último ponto).
- **Situação no dimensionamento:** `ok`, `review` (revisar: método mais refinado ou conferência manual) e `fail` (não atende).
- **Premissas:** consulte `statikos://premissas` antes de propor valores. Itens "a confirmar" ainda não têm fonte normativa conferida: não os apresente como norma.

## Linha de comando

```bash
statikos novo obra.statikos
statikos exec obra.statikos comandos.jsonl [--previa] [--saida outra.statikos]
statikos verificar obra.statikos            # código de saída 1 se houver erro
statikos calc obra.statikos --json
statikos dim obra.statikos --json
statikos prancha obra.statikos --pdf p.pdf --dxf p.dxf --dwg p.dwg [--grupo Tipo] [--formato A1] [--escala 50]
statikos comandos --json                    # todos os comandos com schema
```

`comandos.jsonl`: uma linha JSON por comando, `{"nome": "pilar.inserir", "params": {"x": 0, "y": 0, "secao": {"tipo": "ret", "b": 0.2, "h": 0.4}}}`. Linhas com `#` são comentários.

## Exemplo de agente

`docs/exemplos/agente-mcp.mjs` liga o servidor por stdio e segue o roteiro de um agente:

1. Edifício padrão e eixos.
2. Pilares propositalmente pequenos, vigas e lajes.
3. Verificação.
4. Dimensionamento em rodadas, aumentando a seção dos pilares que não passam.
5. Contorno locado na face externa.
6. Carimbo e pranchas.

```bash
npm run cli && npm run agente -- ./saida
```

O mesmo roteiro roda no `npm test` (`src/cli/agente.test.ts`).

## Limites desta versão

- Análise linear com γz; sem P-Δ 3D.
- Sem torção de vigas e sem detalhamento de armaduras nas pranchas.
- Pilar-parede só é sinalizado.
- Máscara só em DXF.
- No artifact do claude.ai não há DWG (o escritor fica fora do arquivo único).
