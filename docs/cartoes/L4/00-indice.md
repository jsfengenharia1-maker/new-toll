# Cartões da fatia L4 (cópias de grupo e ajudas): interface

Núcleo da L4 já está no `main` (commit "L4 núcleo"): comandos `grupo.copiarConteudo`, `pavimento.unir`, `ref.mover`, `vista.textos`, `pilar.pontoFixo`, `pilar.inserir` ampliado (`copiarDe`, `incluirCargas`), `pilar.copiar` (`incluirCargas`), `laje.copiarDados`, `portico.renumerar`, o catálogo de ajuda e de atalhos (`src/core/ajuda`), `vistaObra.ts` e `gruposCopia.ts`. A interface sai destes cartões, **na ordem 01 → 06**; cada um compila sozinho depois dos anteriores (verificado com `npx tsc -b` a cada passo).

Classe: Haiku (código pronto e validado: os patches foram gerados aplicando a interface, com `tsc`, `design.test`, e2e `L4` e `planta` verdes). Falhou duas vezes: sobe de classe.

## Como aplicar cada cartão

1. `git apply docs/cartoes/L4/patches/<NN>-<nome>.patch`. Se falhar por contexto (outros merges em `Edificio.tsx`, `Planta.tsx` ou `global.css`), use `git apply --3way` ou aplique os trechos do bloco `diff` do cartão à mão, mantendo a ordem dos blocos.
2. Rode as verificações do cartão.
3. Não crie botões na barra da planta (`PlantaBarra`); não use `<button>`, `<input>` ou `<select>` crus fora de `src/app/ui` (o `<input type="file" hidden>` é aceito); sem cor literal, sem CSS fora de `src/app/design`.

## Cartões

- `01-ui-ajuda.md`: Modo de ajuda, ícones e botão de ajuda da barra de título.
- `02-grupos.md`: Copiar de outro grupo, unir pavimentos, sugestão de grupos e áreas.
- `03-dados-e-planta.md`: Referências, conta-gotas de pilar, ponto fixo, dados de pano e pórticos (planta).
- `04-atalhos-guia-ajuda.md`: Barra de atalhos configurável, guia rápido e ajuda por item e por ferramenta.
- `05-memorial.md`: Memorial: áreas por grupo e anexo do guia rápido.
- `06-e2e.md`: Fluxo e2e `L4`.
