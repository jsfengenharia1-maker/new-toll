# Cartões da fatia L5 (ferramentas de lançamento): interface

Núcleo da L5 já está no `main` (commit "L5 núcleo"): comandos `viga.contornoRetangular`, `laje.aberturaRetangular`, `carga.areaNaLaje`, `carga.aoLongoDaViga`, `viga.tracar` ampliado (`simples`, `deslocamentoClique`), `viga.prolongar` (`ate.comprimento`), `laje.detectarPanos` e `laje.criar` (`definir`), `laje.editar` (`direcaoPor`, `insercao`, `insercaoPonto`), o erro `DEFINIR_PANO` (verificação e análise), `src/core/building/lancamentoL5.ts` (geometria, `aberturasDoModelo`, `panosADefinir`) e as ajudas das seis ferramentas novas. A interface sai destes cartões, **na ordem 01 → 07**; cada um compila sozinho depois dos anteriores (verificado com `npx tsc -b` a cada passo).

Classe: Haiku (código pronto e validado: os patches foram gerados aplicando a interface, com `tsc`, `design.test`, e2e `L5`, `planta` e `FU` verdes). Falhou duas vezes: sobe de classe.

## Como aplicar cada cartão

1. `git apply docs/cartoes/L5/patches/<NN>-<nome>.patch`. Se falhar por contexto (outros merges em `Planta.tsx`, `Edificio.tsx` ou `flows.mjs`), use `git apply --3way` ou aplique os trechos do bloco `diff` do cartão à mão, mantendo a ordem dos blocos.
2. Rode as verificações do cartão.
3. Não crie botões na barra da planta (`PlantaBarra`) nem acima do canvas; não use `<button>`, `<input>` ou `<select>` crus fora de `src/app/ui`; sem cor literal, sem CSS fora de `src/app/design`. Teclas: todas as letras já são de ferramentas; as ferramentas novas ficam na barra lateral (Backspace é a única tecla nova, só na ferramenta Viga).

## Cartões

- `01-estado-e-rotulos.md`: Estado das ferramentas e rótulos.
- `02-vigas-painel.md`: Painel de vigas: modo simples, deslocamento, Backspace e prolongar por comprimento.
- `03-contorno-e-abertura.md`: Contorno retangular e abertura retangular.
- `04-panos.md`: Panos a definir, direção e ponto de inserção.
- `05-cargas.md`: Cargas rápidas: laje inteira e ao longo da viga.
- `06-memorial.md`: Memorial: aberturas com viga de borda e panos a definir.
- `07-e2e.md`: Fluxo e2e `L5`.
