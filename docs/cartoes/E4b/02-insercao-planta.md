# E4b — cartão 2: inserção na planta, prévia no cursor e janela "Nova escada" (C8.6, C8.7, C8.33–C8.36, C8.38–C8.40)

Classe: Sonnet baixo ou Haiku com atenção (mexe em `Planta.tsx`, grande: usar `grep -n` e ler só os trechos). Depende do cartão 1. Siga o padrão da ferramenta Pilar (`pl.ferramenta === 'pilar'`, `capturar`, `it.current`, `desenharInteracao`) e da Pilar-parede.

## Comportamento (spec E4b)
1. Ferramenta Escada, função "Criar". A escada nova começa no grupo atual da planta (o pavimento atual pertence a um grupo).
2. **Antes do 1º clique**: a prévia da escada acompanha o cursor (origem = ponto capturado, ângulo = `angulo` da última escada ou 0). A prévia vem de `previaInsercao(b, { grupo, origem, angulo, dados, lances })` com `dados` e `lances` de `escadaPadrao` (ou, se `escadaCopiar` está definido, da escada copiada: `dadosComunsDe(e)` e `e.lances` sem `id`); sem nada disso, o 1º clique abre a janela "Nova escada" (item 4) e o lançamento continua depois que ela confirma.
3. **1º clique** fixa o início (centro da borda de partida do 1º lance). A prévia passa a girar em torno dele seguindo o cursor: ângulo = `anguloDeInsercao(inicio, cursor, orto)`, com `orto = plantaStore.orto` (F8) ou polar (F10), pelo mesmo caminho de `restringir` usado nas outras ferramentas; o ponto vem de `capturar` (capturas do gabarito DXF/DWG e demais modos, C8.34) e a entrada digitada (`pontoDigitado`) vale para o 2º ponto ("@d<ang" dá o ângulo).
4. **2º clique** define a direção. Chamar `previaInsercao`; se `erros.length`, mostrar as mensagens em `Note tone="bad"` na barra de mensagens da planta (`msg(...)`, C8.36) e **não criar**; senão `exec('escada.criar', { grupo, origem, angulo, nome: nomeSequencial(b, escadaPadrao?.nome), ...dados, lances })`. Em seguida gravar `escadaPadrao = { dados: dadosComunsDe(nova), lances: nova.lances.map(l => ({ tipo: l.tipo, ...patamares })), nome: nova.nome }` (C8.38).
5. Com `escadaRepetir` ligado, volta ao estado "antes do 1º clique" com os mesmos dados e o nome seguinte (C8.35); botão direito ou Esc encerra (`ferramenta: 'selecionar'`). Desligado, encerra depois de criar.
6. Cada escada criada é **um passo do desfazer** (Ctrl+Z desfaz a última).

## Janela "Nova escada" (C8.6) em `EscadaUI.tsx`
Estender o componente `NovaEscada` do cartão 2 da E4a:
- Abas "Dados comuns" e "Lances" já existem; acrescentar no topo "Grupo: <nome>" (somente leitura, o grupo atual da planta, C8.7) e o `Select` "Copiar dados de" (escadas visíveis no pavimento atual, C8.39), que carrega dados e lances da escolhida (escada simétrica: o usuário troca "Giro ao subir").
- O `Select` do tipo de cada lance lista `tiposLanceDisponiveis(b)` separando "Da obra" e "Predefinidos" (C8.40); o rótulo do tipo da obra em uso leva "(em uso)".
- Botão "Lançar na planta" fecha a janela e grava em `escadaPadrao` os dados e lances; os cliques seguem o item 1 a 5. Sem a planta (janela aberta pela faixa/Navegador), o botão antigo "Criar escada" (coordenadas digitadas) continua.
- Erros geométricos de `previaInsercao` aparecem em vermelho na janela antes de lançar (`data-escada-erro="<código>"`).

## Camada na planta
`src/app/edificio/CamadaEscadas.tsx` (novo, componente SVG chamado por `Planta.tsx` junto das outras camadas): para cada escada do grupo atual, `desenhoPlantaEscada(geometriaEscada(e, tiposLanceDisponiveis(b), b))` → `<path>` dos contornos (classe `e-trecho`), degraus em traço fino (`e-degrau`), setas de subida (`e-seta`) e a referência (`<text>` com `nome`) no `rotulo`; a escada selecionada leva a classe `e-sel`. Definir as classes no `global.css` com tokens (como `.escada-prev` do cartão 2 da E4a). A mesma função serve a prévia do cursor (classe `e-previa`, traço tracejado; vermelho se há erro: `e-erro`).

## Teste
`npx tsc -b`; `npx vitest related src/app/design/design.test.ts --run --reporter=dot`. e2e no cartão 6 (`E4b-inserir`).
