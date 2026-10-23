# Cartões da V4 — isovalores e isolinhas (interface)

Executor: Haiku. Ordem obrigatória: 1 → 2 → 3 → 4. Cada cartão compila sozinho depois dos anteriores (`npx tsc -b`).
O núcleo da V4 está pronto e testado; estes cartões são só a interface. Nenhum arquivo aparece em dois cartões.

| Cartão | O que entrega | Arquivos |
|---|---|---|
| 1 | Classes `isov-*`, bandas (`iso-banda`), isolinhas, contorno, valores e extremos | `global.css` |
| 2 | Estado das janelas de isovalores (várias, mantidas até fechar o programa) | `isovaloresStore.ts` (novo) |
| 3 | Aba "Isovalores": janelas, grandeza, hipótese, níveis, limites, clique na laje, saídas SVG, PNG, DXF e CSV | `AbaIsovalores.tsx` (novo), `Edificio.tsx` |
| 4 | Fluxo e2e `V4` | `e2e/flows.mjs` |

Pendente fora destes cartões (outra fatia): figura dos mapas por pavimento no memorial e folha "Resultados" no `montarConjunto` [sigla SCR a confirmar]; menu de esforços em vigas, vigotas e alveolares por hipótese (C12.14, depende dos diagramas da V5); escolha do radier na mesma janela já existe (grandezas `rSigmaMax`, `rSigmaMin`, `rW`), mas o e2e não cobre radier.

## Regras desta frente (valem para todos os cartões V4)
- Só `src/app/ui` para controles (`Button`, `Check`, `Select`, `NumField`, `OptNumField`, `TextField`, `Group`, `Hint`); `<button>`, `<select>`, `<input>` crus reprovam em `design.test.ts`.
- Nenhuma cor literal em TS/TSX, nenhum CSS fora de `src/app/design`, toda classe usada existe em `global.css`. A escala de cor são os tokens `--iso-0` a `--iso-10` (já existem em `global.css`, da E1d; classes `.iso-0` a `.iso-10`); o núcleo devolve só o índice do token. Para arquivos exportados a interface lê a cor computada do token (`getComputedStyle`).
- Rótulos únicos: cada controle leva o número da janela no nome, por exemplo `Grandeza (janela 1)`. Nos testes e2e, `getByLabel`/`getByRole` com `{ exact: true }`, **exceto** `NumField`, `OptNumField`, `TextField`, `Select` e `Slider` (o rótulo visível leva a unidade ou o campo): nesses, regex ancorada no início, por exemplo `getByLabel(/^Grandeza \(janela 1\)/)`.
- Não altere `src/core/`: o núcleo da V4 está pronto e testado (`src/core/resultados/bandas.ts`, `isovalores.ts`, `isovalores.test.ts`, 18 testes).
- Sem botões na barra da planta: a funcionalidade fica na aba "Isovalores".
- O bloco `diff` de cada cartão é o resultado esperado, gerado e validado (tsc, `design.test.ts` e o fluxo e2e `V4`). Salve o bloco num arquivo `.patch` e aplique com `git apply`; se uma âncora não casar, procure o trecho equivalente e não invente código além do diff.

## Núcleo usado (já existe, `src/core/resultados/`)
- `bandas.ts`: `Campo`, `triangularNos` (Delaunay recortado por contorno e furos), `niveisAutomaticos` (1-2-5), `niveisDefinidos`, `faixaExibida`, `extremos` (com limites), `isolinhas` (marching triangles) e `encadear`, `bandas` (polígonos entre níveis, recortados por limites mínimo e máximo), `tokenDoValor` (sequencial ou divergente), `legenda`, `nosParaRotulo`, `enquadramento` (metros ↔ pixels, com a inversa para o clique), `svgIsovalores`, `csvCampo`, `dxfIsolinhas` (camada ISOLINHAS), `fmtIso`.
- `isovalores.ts`: `GRANDEZAS_ISO` (deslocamentos uz, rx, ry; esforços Q, Qx, Qy, Mx, My, |Mxy| por hipótese; esforços de cálculo QCalc, MxInf, MyInf, MxSup, MySup pelo Wood-Armer das combinações ELU; áreas de aço AsInfX, AsInfY, AsSupX, AsSupY e envoltórias AsInf, AsSup; radier rSigmaMax, rSigmaMin, rW), `campoDoPavimento`, `campoDoRadier`, `hipotesesDeLaje`, `pavimentosComMapa`, `elementoNoPonto`.

## Verificação final (depois do cartão 4)
```bash
npx tsc -b
npx vitest run src/app/design src/core/resultados
npm run e2e -- V4
npm run e2e -- V
```
