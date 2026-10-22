# Cartão L1-24 — Documentação e checklists (fecha a L1)

Leia só este cartão e os arquivos citados. Não crie arquivos além dos listados. Sem emojis. Depende dos cartões 01 a 23 (todos verdes).

## Arquivos
1. `docs/historico-fatias.md`, `docs/plano-execucao.md`, `docs/ia.md` (editar)
2. `docs/checklist-manual-cypecad.md`, `docs/checklist-manual-calculo-cypecad.md` (editar linhas; depois `npm run checklists`)

## Documentação
1. `docs/historico-fatias.md`: acrescente ao fim uma linha `- 22/10/2026: L1 concluída (assistente de nova obra e gestão de obras; 15 itens …)` resumindo: `assistente.ts` (`gerarObra`, `EspecificacaoObra`), `categoriasUso.ts`, `etapas.ts`, `importarArranques.ts`, `exemplos.ts`, `file.ts` (versões e resultados), `recentes.ts`, comandos `obra.assistente` e `obra.importarArranques` (`mcp: false`), `Obra.descricao/origem`, interface `NovaObra*.tsx`, `DadosGerais.tsx`, `ObrasRecentes.tsx`, `ImportarTexto.tsx`, `EtapasObra.tsx`, e2e `L1`, premissa `assistente`. Liste as premissas a confirmar: valores das 9 categorias adicionais da NBR 6120; limites de 120 caracteres, 500 aberturas, 20 versões, 3 MB e 5 MB; 30 × 30 cm e 5 m na importação. Pendências: lançamento por DXF/DWG (L2) e IFC (L3), passo de muros (E1c), escadas (E4), lajes nervuradas no exemplo.
2. `docs/plano-execucao.md`, seção `## Andamento`: acrescente depois da última linha de data (`- 22/10/2026: E1b …`) uma entrada curta `- 22/10/2026: L1 concluída (15 itens; ver historico-fatias.md)` com a contagem de testes e o tamanho do pacote lidos de `npm test` e `npm run build`.
3. `docs/ia.md`: antes de `## Limites desta versão`, acrescente a seção `## Nova obra pelo assistente` com 2 parágrafos curtos e 2 exemplos JSON: a ferramenta `comandos` lista `obra.assistente` e `obra.importarArranques`; a ferramenta `previa` mostra o que o comando faz antes de aplicar (exemplo: `previa` com `nome: "obra.assistente"` e `params: { espec: { nome: "Obra", pavimentos: [{ nome: "Térreo", peDireito: 3, categoria: "comum", repeticoes: 1 }] } }`). Confira os nomes dos argumentos da `previa` na seção `## Ferramentas` do mesmo arquivo antes de escrever.

## Checklists
Escreva e rode um script Python curto (fora do repositório, em `/tmp`) que, para cada id abaixo, localiza a linha que começa com `| <id> |` em um dos dois arquivos de checklist e troca só as três últimas colunas (Situação, Frente, Nota), mantendo id e texto:

| Id | Situação | Frente | Nota |
|---|---|---|---|
| C1.14 | Feito | — | descrição de até 2 linhas e origem em `Obra` (`obra.definir`); obras na lista de recentes e na biblioteca (sem pastas: o navegador não as tem) [L1] |
| C1.15 | Parcial | L | janela `NovaObra.tsx`: assistente, vazia, padrão, exemplo e texto; DXF/DWG chegam na L2 e IFC na L3 [L1] |
| C1.16 | Feito | — | `assistente.ts` (`gerarObra`), comando `obra.assistente`, janela `NovaObra.tsx` em 6 etapas, guia `etapas.ts`/`EtapasObra.tsx` [L1] |
| C1.24 | Feito | — | ao criar, abre `DadosGerais.tsx` (normas, materiais, perfil de padrões) [L1] |
| C1.28 | Feito | — | etapa Pilares-parede do guia (`etapas.ts`) leva à ferramenta (E1b) [L1] |
| C1.29 | Falta | E1 | etapa Muros e paredes do guia existe e fica indisponível até a E1c (`MUROS_DISPONIVEIS` em `etapas.ts`) [L1] |
| C1.40 | Feito | — | `recentes.ts` (6 últimas distintas, histórico de 500, localStorage) e `ObrasRecentes.tsx` [L1] |
| C1.41 | Feito | — | `importarArranques.ts` + `ImportarTexto.tsx`: colunas fixas, vírgula, ponto e vírgula, tabulação [L1] |
| C1.42 | Feito | — | hipóteses, esforços por hipótese (N, Hx, Hy, Mx, My) e base dos pilares (`ArranqueImp`) [L1] |
| C1.43 | Feito | — | fluxo nome, arquivo, mapeamento, prévia e cálculo das fundações (`ImportarTexto.tsx`) [L1] |
| C1.44 | Feito | — | `exemplos.ts`: residencial, com subsolo e com treliçadas (nervuradas quando o tipo existir); abertos em `ObrasRecentes.tsx` [L1] |
| C1.45 | Feito | — | `buscarRecentes` nos recentes, na biblioteca e nos exemplos; edifício na biblioteca (`salvarEdificioNaBiblioteca`, até 240 KB) [L1] |
| C1.48 | Feito | — | `file.ts` (`versoesDoLog`, `arquivoComExtras`, `recuperarVersao`) e grupo Arquivo e versões [L1] |
| C3.12 | Feito | — | `categoriasUso.ts`: 7 do modelo + 9 da NBR 6120 [a confirmar]; sobrecarga editável por obra no passo Cargas [L1] |
| K1.9.2 | Feito | — | `Obra.descricao` (2 linhas): painel, dados gerais, memorial e carimbo [L1] |

Depois: `npm run checklists` (reescreve os resumos e `plano-frentes.md`) e confira com `git diff --stat docs/` que só mudaram as linhas esperadas.

## Verificação final (todas devem passar)
```bash
npx tsc -b
npm test
npm run build
npm run e2e -- L1
npm run e2e -- --no-build E1b
```
`npm test` inclui `src/core/checklists.test.ts`: ele reprova contagens divergentes e Parcial/Falta sem frente. Registre no `historico-fatias.md` o total de testes e o tamanho do `dist/index.html` lidos nesses comandos.
