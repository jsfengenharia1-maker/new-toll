# E4b — cartão 3: editar, apagar, mover, girar e duplicar lance (C8.41, C8.45–C8.48)

Classe: Haiku (cada função segue o padrão de `pilar.mover`/`mover`, `girar`, `copiar` e do apagar por janela já existentes em `Planta.tsx`). Depende dos cartões 1 e 2.

## Funções da ferramenta Escada (`escadaFn`)
Em todas, só as escadas do grupo atual são selecionáveis; o clique usa `escadasNoPonto(b, grupo, ponto, tol)` com `tol` = 6 px convertidos para m, e a janela usa `escadasNaJanela(b, grupo, janela, modo)` (arrastar da esquerda para a direita = `'dentro'`, da direita para a esquerda = `'cruza'`, como as outras ferramentas de seleção).
1. **Editar (C8.45)**: clicar numa escada abre `useEscadaUI.getState().abrir(id)`. Na janela, os dados comuns chamam `escada.dados`; acrescentar na aba "Dados comuns" os campos "Origem x", "Origem y" e "Sentido de subida" (`NumField`) que chamam `escada.editar { id, origem, angulo }`.
2. **Apagar (C8.46)**: clique ou janela de captura; `exec('escada.remover', { ids })`. Mensagem na barra: "<n> escada(s) removida(s)".
3. **Mover (C8.47)**: 1º clique = ponto de referência (com as capturas do gabarito), 2º = destino; `exec('escada.mover', { ids, dx, dy })` com `dx, dy` = destino − referência. A seleção prévia (clique/janela) ou, se vazia, a escada sob o 1º clique. Prévia: contorno deslocado (`e-previa`).
4. **Girar (C8.48)**: em torno do início do lance (a origem da escada, no grupo atual). Duas formas: (a) clicar um ponto: ângulo = `deltaPorPontos(origem, pontoAnterior, pontoClicado)` — o 1º clique escolhe a escada e a direção atual, o 2º define a nova direção; (b) digitar o ângulo (campo da barra de entrada digitada, `pontoDigitado` não serve: usar o campo numérico da barra, como a ferramenta Girar existente) → `exec('escada.girar', { ids, angulo })`. Valor 0 ou 360 não faz nada (o comando recusa; mostrar a mensagem).
5. **Duplicar lance (C8.41)**: na aba "Lances" da janela, em cada linha, `Button variant="mini"` "Duplicar lance N" → `exec('lance.duplicar', { escada: id, lance: lance.id })`. O lance novo aparece no topo da lista (fim do vetor, fisicamente acima dos demais) e a prévia em corte se atualiza.

## Seleção e Propriedades
Clicar numa escada com a ferramenta Selecionar seleciona-a (`alvo.ts`: tipo `escada`, id) e abre as Propriedades do cartão 4 da E4a; `Delete` com a escada selecionada chama `escada.remover`.

## Teste
`npx tsc -b`; `design.test.ts`. e2e no cartão 6 (`E4b-editar`).
