# L6 — cartão 03: Cotas temporárias, valor editável, pés, fixar e travar

Classe: Haiku (interface sobre núcleo pronto; código validado).

## Arquivos
`src/app/edificio/Planta.tsx`

## O que faz
Com Selecionar, os pilares, vigas e paredes selecionados mostram as cotas temporárias (até 6; azul = editável). Zonas clicáveis refeitas a cada desenho (`it.current.zonas`): clique no valor abre o campo "Valor da cota (cm)" e Enter aplica `cota.mover` (move o selecionado; um passo de desfazer; falha mostra a mensagem do comando); clique no pé (ponta) alterna face e eixo daquele lado (memória em `refTemp`; o pé só vale fora do elemento selecionado, para não atrapalhar selecionar); o `+` ao lado do valor fixa como cota permanente (`cota.criar`). Nas cotas permanentes, clicar no valor edita (`cota.valor`: o elemento da referência final anda; cota travada recusa) e o quadrado ao lado trava e destrava (`cota.travar`; a travada propaga o movimento pela cadeia, ver premissa `cotas-planta`).

## Aplicação
Aplique `docs/cartoes/L6/patches/03.patch` (git apply).

## Verificação
- npx tsc -b; npx vitest run src/app/design

## Rótulos e regras
Estilo só por tokens do design system (`cores.cota`, `cores.captura`, `cores.guia` do canvas; sem cor literal); componentes de `src/app/ui` (`Input`, `Check`); sem `<button>`, `<input>` ou `<select>` crus; sem CSS fora de `src/app/design`; **sem botões novos acima do canvas nem na barra da planta** (a ferramenta Cota em série entra pela tecla D com Medir ativa e pela paleta Ctrl+K). Rótulos novos e únicos: "Cota em série", "Valor da cota (cm)", "Cotas temporárias: ligar ou desligar", "Cotas do usuário (cota em série) nas formas e na locação". No e2e use `{ exact: true }` em botões, papéis e `getByLabel`, exceto NumField e Select (regex ancorada).
