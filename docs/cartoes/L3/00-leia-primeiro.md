# L3 — cartões de interface (Haiku): leia primeiro

Núcleo da L3 pronto e testado (`npx vitest run src/core/ifc src/core/commands`: 19 testes do IFC + o genérico dos comandos). Os cartões só desenham e chamam o núcleo; a ordem é 01, 02, 03, 04 e cada um compila sozinho (`npx tsc -b`). Validado em 24/10/2026 aplicando e revertendo (`npx tsc -b`, `src/app/design/design.test.ts` e o fluxo e2e `L3`); o resultado completo está em `validado.patch` (`git apply docs/cartoes/L3/validado.patch` aplica os quatro cartões de uma vez, na árvore sem a interface da L3).

## Núcleo disponível (não reescrever)
- `src/core/ifc/ler.ts`: `lerIfc(api, bytes): IfcLido` (pavimentos, colunas, vigas, lajes com aberturas, paredes, outros, materiais, classes, avisos, tudo em metros). `api` é o `IfcAPI` do web-ifc já inicializado.
- `src/core/ifc/web.ts`: `VENDOR_IFC`, `VENDOR_IFC_WASM` (caminhos em `public/vendor`, gerados por `node scripts/vendor-web-ifc.mjs`) e `iniciarIfc(modulo, urlWasm)`.
- `src/core/ifc/proposta.ts`: `mapeamentoPadrao(l)`, `agruparPavimentos(l)`, `propostaIfc(l, mapeamento, nomeArquivo, modelo?)`: `PropostaIfc` com contagens, ambíguos, ignorados e avisos.
- `src/core/ifc/materiais.ts`: `TIPOS_ELEMENTO`, `valoresDoMaterial`, `textoMaterial`, `materiaisSugeridos`.
- `src/core/ifc/memorial.ts`: `memorialIfc(b)` (`null` se a obra não veio de IFC).
- Comando `ifc.importar { proposta, excluir?, lajes? }` (um passo no histórico; `mcp: false`); `b.obra.ifc` guarda arquivo, esquema, materiais e relatório; `b.obra.origem = 'ifc'` em obra vazia.
- No artifact do claude.ai o vendor não existe: a janela mostra a mensagem `IFC_INDISPONIVEL` e sugere o DXF (como o DWG).

## Regras de todos os cartões
Componentes de `src/app/ui` (nunca `<button>`, `<input>` ou `<select>` crus). Sem cor literal, sem CSS fora de `src/app/design`, toda classe usada já existe no CSS (`data`, `masc`, `lanc`, `lanc-rodape`, `row`, `wrap`, `muted`, `small`, `tl`, `num`, `l`). Pontos de inserção descritos por trecho/âncora (texto a procurar), não por número de linha. Falhou duas vezes: parar e relatar. e2e com `{ exact: true }`, exceto NumField/Select (regex ancorada no início).
