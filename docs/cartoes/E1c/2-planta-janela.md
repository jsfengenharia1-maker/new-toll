# Cartão E1c-2 — ferramenta Parede na planta, desenho, janela e cartão do Dimensionamento

Executor: Haiku. Depende do cartão E1c-1 (botão "Traçar na planta"). Não altere `src/core/`.

## Arquivos
- `src/app/edificio/plantaStore.ts`: acrescentar `'parede'` ao tipo `Ferramenta` (linha 7–8), `'parede'` ao `tipo` de `janela` (linha ~51) e o campo `pwParams: Record<string, unknown> | null` (padrão `null`, junto de `ppParams`, linhas ~85 e ~159).
- `src/app/edificio/Planta.tsx`:
  - `ROTULO_FERRAMENTA` (linha 127): `parede: 'Parede de concreto'`. Isso já põe a ferramenta na paleta Ctrl+K (`PaletaComandos.tsx` lê `ROTULO_FERRAMENTA`).
  - **Sem tecla própria**: todas as letras de `ferr` (linha ~1415) estão ocupadas. Não acrescente entrada em `TECLA_FERRAMENTA` nem em `ferr`. **Não acrescente botão na barra da planta** (quebra os e2e de fundação). A entrada é o botão "Traçar na planta" do grupo Paredes e a paleta Ctrl+K.
  - `PASSOS` (linha 139): `parede: ['Clique os vértices do eixo da parede (capturas valem; Enter termina; Esc cancela).']`.
  - `POLILINHAS` (linha 33): acrescentar `'parede'`.
  - Em `terminar()` (perto da linha 1279, junto de `radier`/`corrida`): `if (f === 'parede') { if (pts.length >= 2) exec('parede.criar', { ...(usePlanta.getState().pwParams ?? {}), pontos: q }); else msg('Parede: ao menos 2 pontos.'); setPontos([]); return; }`.
  - Desenho (camada do modelo, onde os pilares-parede são desenhados — procure `paredesPl` e `contornoDoLado`): para cada `w` de `b.paredes ?? []` cujos lances (`lancesDoPP(b, ppDaParede(w))`) incluem o pavimento ativo, desenhar o contorno de cada lado: `ladosDoPP(b, ppDaParede(w)).map((g) => contornoDoLado(g, pav))` com o mesmo estilo dos pilares-parede (mesmas cores da paleta da planta: reutilize as chaves usadas para pilar-parede; não crie cor nova). Aberturas do lance cuja base é o pavimento ativo: segmento tracejado sobre o eixo de `s` a `s + largura` (use `furosDaParede(b, w).porTrecho[i]` e o lado `i`: ponto = `g.a + g.u · s0` … `g.a + g.u · s1`). Nome da parede (`w.nome`) no meio do primeiro trecho, como o rótulo do pilar-parede.
  - Seleção: clique a até meia espessura do eixo de uma parede seleciona `w.id` (igual ao pilar-parede, linha ~1461); `Delete` com paredes selecionadas soma `{ nome: 'parede.remover', params: { ids } }` ao `lote` (linha ~1430). Duplo clique abre `janela: { tipo: 'parede', id }`.
  - Vigas embutidas (`v.embutida`): desenhar como as demais vigas (já são); nada a fazer além de não duplicar o rótulo.
- `src/app/edificio/ParedesUI.tsx` (do cartão E1c-1): exportar `JanelaParede({ id })` e `CartaoParedes({ onIr })`, cópias de `JanelaPilarParede` e `CartaoPilaresParede` (`PilarParedeUI.tsx`) lendo `dim?.paredes` em vez de `dim?.pilaresParede` e `b.paredes` em vez de `b.pilaresParede`. Atributos: `data-janela-pw={id}`, tabela de base `data-pw-base`, detalhes por trecho `data-pw-lado`, cartão `data-pw-cartao`; botão do cartão com `aria-label={`Resultados de ${r.nome}`}`. Texto do topo da janela: "Parede de concreto · {r.nCascas} trecho(s) em casca e {r.ladosBarra} em barra." Acrescente na janela, abaixo das tabelas, a tabela `data-pw-empuxo` com a resultante aplicada por caso: `an.paredes?.empuxo.filter((e) => e.parede === id)` (colunas **Caso**, **Fx (kN)**, **Fy (kN)**; `an` = `useBuilding((s) => s.analise)` — confira o nome do campo em `store.ts`).
- `src/app/edificio/Revisao.tsx` (linha ~422): `j.tipo === 'parede' ? <JanelaParede id={j.id} /> : …` e incluir `'parede'` no tipo `Alvo` (linha 36).
- `src/app/edificio/Edificio.tsx` (linha ~875): `{dim?.paredes?.length ? <CartaoParedes onIr={(id) => onIr('parede', id)} /> : null}` e incluir `'parede'` no tipo do `onIr` (linha 845).

## Componentes
Só `src/app/ui` (`Button`, `Select`, `Hint`, `Pill`); tabelas `className="data quadro"`. Nenhuma cor literal; nenhum CSS novo.

## Núcleo usado
`ppDaParede(w)`, `furosDaParede(b, w)`, `niveisDaParede(b, w)` (`src/core/building/paredesBase.ts`); `ladosDoPP`, `contornoDoLado`, `lancesDoPP` (`src/core/building/pilarParede.ts`); `Dimensionamento.paredes: ResultadoPilarParede[]` (mesma forma dos pilares-parede); `AnaliseEdificio.paredes.empuxo: { parede, caso, F: [Fx, Fy] }[]` e `.foraDiafragma`.

## Teste (vitest, `src/app/edificio/ParedesUI.test.ts`, acrescentar)
Exporte de `ParedesUI.tsx` a função pura `aberturasNaPlanta(b, w, pavimento)` que devolve os segmentos `[[x0, y0], [x1, y1]][]` das aberturas cuja base é `pavimento`. Teste: `parede.criar { pontos: [[0,0],[6,0],[6,4]], espessura: 0.2 }` e `parede.abertura { parede, s: 7, largura: 1.5, peitoril: 1, altura: 1.2, pavimento: <id do Térreo> }` → `aberturasNaPlanta(b, w, <Térreo>)` igual a `[[[6, 1], [6, 2.5]]]` (com `toBeCloseTo` em cada número) e `aberturasNaPlanta(b, w, <Tipo 1>)` igual a `[]`.

## Verificação
```bash
npx tsc -b
npx vitest run src/app/edificio/ParedesUI.test.ts src/app/design/design.test.ts
```
