# Cartões da V2 — cortes, seções e armaduras em 3D (interface)

Executor: Haiku. Ordem obrigatória: 1 → 2 → 3 → 4 → 5 → 6. Cada cartão compila sozinho depois dos anteriores
(`npx tsc -b`). O núcleo da V2 está pronto e testado (`src/core/vista3d/v2.test.ts`, 18 testes); estes cartões são só a
interface. Cada cartão traz o diff final dos arquivos que toca (nenhum arquivo aparece em dois cartões).

| Cartão | O que entrega | Arquivos |
|---|---|---|
| 1 | Tokens `--v3d-arm-*` e classes `corte-*` / `armadura3d` | `global.css`, `memorial.css` |
| 2 | Ferramentas Corte e Seção na planta, marcas, grupo "Cortes e seções", janelas | `plantaStore.ts`, `Planta.tsx`, `CortesUI.tsx` (novo), `Edificio.tsx` |
| 3 | Cortes e seções no memorial | `MemorialCortes.tsx` (novo), `MemorialEdificio.tsx` |
| 4 | Armaduras na vista 3D do edifício | `vista3dStore.ts`, `renderizador.ts`, `Vista3D.tsx` |
| 5 | Aba "3D" nas janelas de armadura da viga, do pilar e da laje | `Armadura3D.tsx` (novo), `Revisao.tsx` |
| 6 | Fluxo e2e `V2` | `e2e/flows.mjs` |

Pendente fora destes cartões (outra fatia): marcas de corte nas pranchas de formas (`prancha.cortes`, tamanho
configurável) e folha de cortes no `montarConjunto` (C3.31 e C3.33 seguem Parcial/Falta até lá).

## Regras desta frente (valem para todos os cartões V2)
- Só `src/app/ui` para controles (`Button`, `Check`, `Select`, `NumField`, `Slider`, `Dropdown`, `TextCell`, `Seg`, `Modal`, `Group`, `Hint`); `<button>`, `<select>`, `<input>` crus reprovam em `design.test.ts`.
- Nenhuma cor literal em TS/TSX, nenhum CSS fora de `src/app/design`, toda classe usada existe em `global.css`. As cores das armaduras vêm de `--v3d-arm-1` a `--v3d-arm-8`; as das figuras de corte, de `--v3d-claro-*` (tela) e `--m-*` (memorial).
- Rótulos únicos (o nome acessível de cada controle aparece uma só vez na tela): nos testes e2e, `getByLabel`/`getByRole` com `{ exact: true }`, **exceto** `NumField`, `Select` e `Slider` (o rótulo visível leva a unidade ou o campo): nesses, regex ancorada no início, por exemplo `getByLabel(/^Profundidade de Longitudinal/)`.
- Não altere `src/core/`: o núcleo da V2 já está pronto (`src/core/vista3d/corte.ts`, `armaduras3d.ts`, `src/core/commands/cortes.ts`).
- O bloco `diff` de cada cartão é o resultado esperado, gerado e validado (tsc, `design.test.ts` e o fluxo e2e `V2`). Aplique com `git apply` (salve o bloco num arquivo `.patch`) ou reproduza as edições; se uma âncora não casar, procure o trecho equivalente (as linhas mudam pouco) e não invente código além do diff.

## Núcleo usado (já existe)
- `src/core/commands/cortes.ts`: comandos `corte.criar { pontos, sentido, profundidade? }`, `corte.editar { id, nome?, pontos?, sentido?, profundidade? (0 = até o fim) }`, `corte.remover { ids }`, `secao.criar { a, b, nome?, pavimento? }`, `secao.editar`, `secao.remover`; dados em `b.cortes?` e `b.secoes?` (`CorteEdificio`, `LinhaSecao` em `building/types.ts`).
- `src/core/vista3d/corte.ts`: `cortarCena(cena, corte)`, `desenharCorte(b, corte, { cena?, idSvg? })` (devolve `svg`, `cena` com `secoes[]`/`vistos[]`, `niveis`, `eixos`, `cotas`), `secaoDoPavimento(b, linha, pavimentoId?)` (devolve `svg`, `elementos`, `apoios`, `vaos`).
- `src/core/vista3d/armaduras3d.ts`: `armaduras3D(b, dim, { elementos?, pavimentos?, tipos?, limiteSegmentos? })`, `camadasDeArmadura(a, por)`, `malhaDeTubos(linhas, raio)`, `cenaDoElemento(b, dim, origem, id, pavimento?)`.

## Verificação final (depois do cartão 6)
```bash
npx tsc -b
npx vitest run src/app/design src/core/vista3d src/core/commands
npm run e2e -- V2
npm run e2e -- V1
```
Os dois fluxos usam o Chromium com WebGL por SwiftShader (`webgl: true` no fluxo); se o ambiente não tiver WebGL, o fluxo V2
verifica o caminho sem WebGL (`data-status` diferente de `pronto`).
