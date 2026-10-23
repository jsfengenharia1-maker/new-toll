# Cartões da V3 — deformada 3D, deslocamentos e flecha entre pontos (interface)

Executor: Haiku. Ordem obrigatória: 1 → 2 → 3 → 4. Cada cartão compila sozinho depois dos anteriores (`npx tsc -b`).
O núcleo da V3 está pronto e testado (`src/core/resultados/`, `resultados.test.ts`, 16 testes); estes cartões são só a
interface. Cada cartão traz o diff final dos arquivos que toca (nenhum arquivo aparece em dois cartões).

| Cartão | O que entrega | Arquivos |
|---|---|---|
| 1 | Tokens `--v3d-def-*` e classes `v3d-def-*`, `desloc-aba`, `flecha-perfil` | `global.css` |
| 2 | Deformada na vista 3D: hipótese, escala, eixos, animação e legenda | `vista3dStore.ts`, `renderizador.ts`, `Vista3D.tsx` |
| 3 | Aba "Deslocamentos": consulta por nó, máximos, CSV e flecha entre dois pontos | `AbaDeslocamentos.tsx` (novo), `Edificio.tsx` |
| 4 | Fluxo e2e `V3` | `e2e/flows.mjs` |

Pendente fora destes cartões (outra fatia): tabelas de deslocamentos e flechas entre pontos e figura da deformada
isométrica no memorial; ferramenta "Flecha entre dois pontos" com cliques na planta (a aba usa coordenadas digitadas);
várias janelas de deformada lado a lado com câmera sincronizável (C12.22); clique no nó da vista 3D abrindo a consulta.

## Regras desta frente (valem para todos os cartões V3)
- Só `src/app/ui` para controles (`Button`, `Check`, `Select`, `NumField`, `Slider`, `Dropdown`, `Seg`, `Group`, `Hint`); `<button>`, `<select>`, `<input>` crus reprovam em `design.test.ts`.
- Nenhuma cor literal em TS/TSX, nenhum CSS fora de `src/app/design`, toda classe usada existe em `global.css`. A rampa da deformada vem de `--v3d-def-1` a `--v3d-def-5` (no tema p/b, `--v3d-pb-def-*`).
- Rótulos únicos (o nome acessível de cada controle aparece uma só vez na tela): nos testes e2e, `getByLabel`/`getByRole` com `{ exact: true }`, **exceto** `NumField`, `Select` e `Slider` (o rótulo visível leva a unidade ou o campo): nesses, regex ancorada no início, por exemplo `getByLabel(/^X inicial/)`. Os botões do `Seg` têm `role="radio"`.
- Não altere `src/core/`: o núcleo da V3 já está pronto e testado (`src/core/resultados/`, 16 testes em `resultados.test.ts`).
- O bloco `diff` de cada cartão é o resultado esperado, gerado e validado (tsc, `design.test.ts` e o fluxo e2e `V3`). Salve o bloco num arquivo `.patch` e aplique com `git apply`; se uma âncora não casar, procure o trecho equivalente (as linhas mudam pouco) e não invente código além do diff.

## Núcleo usado (já existe, `src/core/resultados/`)
- `deformada.ts`: `hipotesesDisponiveis(b, an)` (casos simples e combinações), `deslocamentosHipotese`, `pontoDaBarra` (Hermite cúbico + parcela da carga distribuída, exata para a viga biapoiada: 5qL⁴/384EI), `eixosDeformados(an, h, pontos)` (8 a 16 pontos por barra), `escalaAutomatica` (maior deslocamento = 5 % da altura, a confirmar), `fatorAnimacao(t, T)` = sin(2πt/T), `PERIODO_ANIMACAO` (2 s, a confirmar).
- `deformadaCena.ts`: `deformarCena(cena, an, h)` refina a malha da cena de V1 (subdivisão em 4) e dá a cada vértice o deslocamento do eixo da barra (com a rotação da seção) ou do campo da grelha (lajes); `posicoesDeformadas(o, escala, fator)`.
- `consultas.ts`: `consultaNo`, `maximosPorPano`, `maximosPilaresCombinados`, `tabelaDeslocamentosMalha`, `csvDeslocamentos`.
- `flechaPontos.ts`: `perfilDeslocamentos`, `flechaEntrePontos` (secante, padrão, ou tangente; máxima relativa, máxima absoluta ou entre os pontos; amplificação), `flechaDaHipotese`, `flechaMaisDesfavoravel` (combinação gravitacional de maior flecha entre as do estado `flecha`), `campoLaje`.
- `interpolacao.ts`: `campoDisperso` (mínimos quadrados móveis de grau 2 sobre os nós da grelha).

## Verificação final (depois do cartão 4)
```bash
npx tsc -b
npx vitest run src/app/design src/core/resultados
npm run e2e -- V3
npm run e2e -- V1
npm run e2e -- V2
```
O fluxo `V3` usa o Chromium com WebGL por SwiftShader (`webgl: true`, como o V1 e o V2); sem WebGL, as verificações da
legenda e da animação são puladas (`data-status` diferente de `pronto`) e as demais seguem.
