# Cartões da fatia L6 (cota em série e cotas temporárias editáveis): interface

Núcleo no commit "L6 núcleo" (premissa `cotas-planta`; estudo `docs/analises/cotas-revit.md`, decisões de 23/10/2026): referência padrão pela face; edição move sempre o selecionado; cota travada propaga pela cadeia (um passo de desfazer; conflito recusa e diz qual cota impede); cotas do usuário saem por padrão nas formas, na locação e no DXF (opção `cotasUsuario`). A interface sai destes cartões, **na ordem 01 → 05**; cada um compila sozinho depois dos anteriores (verificado com `npx tsc -b` a cada passo).

Classe: Haiku (interface sobre núcleo pronto; código validado: os patches foram gerados aplicando a interface, com `tsc`, `design.test`, e2e `L6`, `planta` e `FU` verdes). Falhou duas vezes: sobe de classe.

Núcleo usado (já existe, commit "L6 núcleo"): `src/core/building/cotas.ts` (`resolverRef`, `trechosCota`, `geometriaCota`, `offsetDoPonto`, `planejarMovimento`), `src/core/geom/cotasTemp.ts` (`indiceCotasTemp`, `cotasTemporarias`, `paramsMoverCotaTemp`, `paramsFixarCotaTemp`, `alternarModo`, `chavePar`) e os comandos `cota.criar`, `cota.editar`, `cota.remover`, `cota.travar`, `cota.mover`, `cota.valor`. A opção `cotasUsuario` (0/1, padrão 1) está em `ConfigArmacao` e em `prancha.definir`; as pranchas de formas e locação e o DXF já desenham as cotas do usuário na camada COTA.

Regras: Estilo só por tokens do design system (`cores.cota`, `cores.captura`, `cores.guia` do canvas; sem cor literal); componentes de `src/app/ui` (`Input`, `Check`); sem `<button>`, `<input>` ou `<select>` crus; sem CSS fora de `src/app/design`; **sem botões novos acima do canvas nem na barra da planta** (a ferramenta Cota em série entra pela tecla D com Medir ativa e pela paleta Ctrl+K). Rótulos novos e únicos: "Cota em série", "Valor da cota (cm)", "Cotas temporárias: ligar ou desligar", "Cotas do usuário (cota em série) nas formas e na locação". No e2e use `{ exact: true }` em botões, papéis e `getByLabel`, exceto NumField e Select (regex ancorada).

## Como aplicar cada cartão
1. Aplique `docs/cartoes/L6/patches/<NN>.patch` com o comando de patch do git (apply). Se falhar por contexto (outros merges em `Planta.tsx` ou `flows.mjs`), use a opção `--3way` ou aplique à mão os trechos do patch, na ordem.
2. Rode as verificações do cartão.

## Cartões
- `01-estado-e-rotulos.md`: Estado da ferramenta e rótulos.
- `02-serie.md`: Cota em série na planta.
- `03-temporarias.md`: Cotas temporárias, valor editável, pés, fixar e travar.
- `04-paleta-e-pranchas.md`: Paleta Ctrl+K e opção nas pranchas.
- `05-e2e.md`: Fluxo e2e `L6`.
