# Checklist de paridade com o manual do usuário do CYPECAD

Comparação item a item entre as funcionalidades do manual do usuário do CYPECAD (edição em inglês, set/2010, 141 págs., lido inteiro em duas partes; figuras não extraídas) e o Statikos em 20/10/2026. Descrições com palavras próprias (reconstrução limpa: nada de texto, nomes de comando ou telas copiados). Paridade é de funcionalidade, nunca de implementação. As hipóteses e os critérios de cálculo estão em `checklist-manual-calculo-cypecad.md`.

Situação: **Feito**, **Parcial** (existe com menos opções), **Falta**, **Fora** (fora do escopo decidido: normas estrangeiras, aço/misto/madeira no edifício, sismo, serviços em nuvem, ou recomendação ao usuário sem função no programa). Frente: quem cobre o item no plano (`docs/plano-frentes.md`).

## Resumo por capítulo

| Capítulo | Itens | Feito | Parcial | Falta | Fora |
|---|---|---|---|---|---|
| 0. Apresentação do programa | 4 | 0 | 3 | 0 | 1 |
| 1. Introdução ao programa: tela, ajuda, criação de obra e arquivos | 56 | 13 | 15 | 18 | 10 |
| 2. Gabaritos DXF/DWG | 22 | 5 | 9 | 5 | 3 |
| 3. Grupos e pavimentos | 41 | 15 | 8 | 15 | 3 |
| 4. Pilares | 63 | 11 | 20 | 25 | 7 |
| 5. Muros e paredes estruturais | 30 | 0 | 0 | 26 | 4 |
| 6. Vigas | 108 | 9 | 8 | 66 | 25 |
| 7. Lajes | 195 | 5 | 19 | 110 | 61 |
| 8. Escadas | 65 | 0 | 0 | 65 | 0 |
| 9. Estruturas de aço, madeira e alumínio | 50 | 0 | 0 | 0 | 50 |
| 10. Cargas | 26 | 7 | 7 | 9 | 3 |
| 11. Fundações | 70 | 6 | 8 | 51 | 5 |
| 12. Isovalores e deformada | 22 | 0 | 0 | 22 | 0 |
| 13. Tabelas e bibliotecas | 11 | 0 | 1 | 3 | 7 |
| **Total** | **763** | **71** | **98** | **415** | **179** |

## Pendências por frente

| Frente | Parcial | Falta | Total |
|---|---|---|---|
| R — Revisão de resultados e detalhamento | 17 | 88 | 105 |
| N — Cálculo e normas | 13 | 19 | 32 |
| E — Elementos estruturais | 15 | 185 | 200 |
| FU — Fundações integradas | 12 | 55 | 67 |
| L — Produtividade de lançamento | 40 | 31 | 71 |
| V — Visualização | 1 | 37 | 38 |

## 0. Apresentação do programa

| Item | Funcionalidade (palavras próprias) | Situação | Frente | Statikos |
|---|---|---|---|---|
| C0.1 | Programa para edifícios de concreto armado e aço que reúne análise espacial, dimensionamento dos elementos, edição de armaduras e seções e desenhos de execução. | Parcial | R | análise espacial, dimensionamento e pranchas de formas; sem desenhos de armadura nem aço no edifício |
| C0.2 | Análise tridimensional da estrutura completa (elementos verticais e lajes), incluindo as fundações. | Parcial | R | grelha por pavimento + pórtico espacial (não é um modelo único); fundação em módulo à parte |
| C0.3 | Dimensionamento automático dos elementos de concreto armado e de aço. | Parcial | R | concreto armado sim (NBR 6118); aço só no módulo Pórtico |
| C0.4 | Normas de vários países à escolha do usuário. | Fora | — | só normas brasileiras, por decisão de escopo |

## 1. Introdução ao programa: tela, ajuda, criação de obra e arquivos

| Item | Funcionalidade (palavras próprias) | Situação | Frente | Statikos |
|---|---|---|---|---|
| | **1.1 Tela de trabalho** | | | |
| C1.1 | Interface organizada em abas por etapa: lançamento de pilares, lançamento de vigas/lajes, resultados, mapas de isovalores e deformada. | Feito | — | abas Planta, Elevação, Verificação, Análise, Dimensionamento, Pranchas, Premissas |
| C1.2 | Menus principais no topo de cada aba e, como alternativa, uma barra de opções que se ativa e dá acesso aos mesmos menus. | Feito | — | barra lateral com grupos + linha de comando |
| C1.3 | Primeira barra de ferramentas, comum a todas as abas, com opções de visualização e de gabarito. | Feito | — | barra da planta (vista, capturas, eixos, cotas, grade, unidades) |
| C1.4 | Desfazer e refazer a última alteração nas abas de pilares, de vigas e de resultados. | Feito | — | desfazer/refazer por comando (200 passos) |
| C1.5 | Segunda barra de ferramentas com atalhos para opções dos menus. | Feito | — | barra de ferramentas da planta com atalhos de teclado |
| C1.6 | Barra de atalhos configurável: o usuário põe e tira botões. | Falta | L | barra configurável pelo usuário |
| C1.7 | Cor de fundo da área de desenho à escolha entre branco, cinza e preto, para contraste com os elementos. | Feito | — | temas escuro, claro e preto e branco |
| | **1.2 Ajuda na tela** | | | |
| C1.8 | Ajuda contextual por tecla de função (F1): destaca os itens que têm ajuda e mostra a explicação do item clicado, inclusive de itens dentro de menus. | Falta | L | ajuda contextual (F1) por item |
| C1.9 | Botão de ajuda na barra de título que liga o mesmo modo de ajuda, válido também para os ícones das barras. | Falta | L | modo de ajuda |
| C1.10 | O modo de ajuda se desliga com o botão direito, com um novo clique no botão ou com Esc. | Falta | L |  |
| C1.11 | As janelas de diálogo têm botão de ajuda próprio na barra de título. | Parcial | L | dicas fixas nos painéis |
| C1.12 | Botão de informação geral sobre o conteúdo da janela, presente em várias janelas. | Parcial | L | dicas e aba Premissas |
| C1.13 | Guia rápido que reúne as ajudas das opções das abas, para consultar e imprimir. As ajudas dos diálogos não entram no guia. | Parcial | L | README e docs/ia.md; sem guia rápido imprimível na interface |
| | **1.3 Criação de obra** | | | |
| C1.14 | Obra nova com pasta, nome e descrição. | Parcial | L | nome e cidade da obra; sem descrição longa |
| C1.15 | Escolha do modo de criação: obra vazia (lançamento manual), lançamento automático por DXF/DWG, lançamento automático por IFC ou exemplo de lançamento automático. Os modos automáticos dependem de licença. | Parcial | L | novo padrão ou vazio; sem lançamento automático por DXF/IFC |
| C1.16 | Assistente passo a passo no lançamento automático, que pede pavimentos, alturas e cargas. | Falta | L | assistente de nova obra (pavimentos, alturas, cargas) |
| C1.17 | O lançamento automático gera o contorno do edifício e os elementos de apoio. | Falta | L | lançamento automático |
| C1.18 | Lançamento por DXF/DWG: carrega um ou vários arquivos como gabarito. | Falta | L | lançamento automático por DXF |
| C1.19 | No assistente DXF/DWG, troca das cores das camadas e escolha das camadas visíveis. | Parcial | L | cores/visibilidade de camadas existem na máscara, não em assistente |
| C1.20 | No assistente DXF/DWG, associação de cada arquivo a grupos de pavimentos. | Parcial | L | uma máscara por grupo |
| C1.21 | No assistente DXF/DWG, escolha das camadas que definem a geometria de cada tipo de elemento. | Falta | L | camada → tipo de elemento (pilar, contorno, abertura) |
| C1.22 | Lançamento por IFC: importa o arquivo e depois pede os dados do edifício e dos pavimentos. | Falta | L | IFC |
| C1.23 | No lançamento por IFC, os materiais do arquivo são ligados a tipos de elemento estrutural, com propriedades atribuídas a cada seleção. | Falta | L | IFC |
| C1.24 | Ao fim do lançamento automático, a obra é gerada e abre a janela de dados gerais (normas e propriedades da obra). | Falta | L |  |
| C1.25 | Depois do lançamento automático, todos os dados ficam editáveis. Lajes, cargas adicionais, fundações e dados particulares são completados à mão. | Fora | — | depende do lançamento automático |
| C1.26 | Roteiro recomendado, passo 1: dados gerais (nome, descrição, materiais e opções, nível de controle de execução). | Feito | — | obra + norma (fck, aço, CAA, cobrimentos, ψ) |
| C1.27 | Passo 2: pavimentos (níveis, grupos, alturas, cargas variáveis e permanentes). | Feito | — | pavimentos, grupos, uso, cargas |
| C1.28 | Passo 3: pilares e pilares-parede (geometria e posição). | Parcial | L | pilares sim; pilar-parede só aviso |
| C1.29 | Passo 4: muros e paredes de apoio. | Falta | L | muros e paredes estruturais |
| C1.30 | Passo 5: vigas. | Feito | — | vigas |
| C1.31 | Passo 6: lajes. | Feito | — | lajes |
| C1.32 | Passo 7: cargas especiais, como as de paredes divisórias. As cargas gerais vêm dos pavimentos, e o peso próprio de pilares, muros, vigas e lajes é gerado automaticamente. | Feito | — | cargas especiais, alvenaria da máscara; peso próprio automático |
| C1.33 | Passo 8: escadas. | Falta | E | escadas |
| C1.34 | Passo 9: estruturas 3D integradas, definidas no módulo de barras metálicas 3D. | Falta | E | estruturas 3D integradas |
| C1.35 | Passo 10: fundações (sapatas, vigas de equilíbrio e de travamento). O radier é lançado como laje no nível da fundação. | Parcial | FU | fundações no módulo Fundações (cargas importadas do edifício); sem vigas de equilíbrio, radier |
| C1.36 | Passo 11: cálculo da estrutura. | Feito | — | Calcular (worker) |
| C1.37 | Passo 12: conferir os erros e corrigir as dimensões, recalculando até não restar erro que peça mudança de dimensão. A cada ciclo o peso próprio é reajustado. | Parcial | R | status por elemento e revisão manual; peso próprio recalculado a cada cálculo |
| C1.38 | Passo 13: preparar os resultados antes dos desenhos (editar ou uniformizar armaduras de lajes, modificar armaduras e agrupar pilares, reposicionar textos). | Falta | R | edição/uniformização de armaduras antes dos desenhos |
| C1.39 | Passo 14: desenhos e relatórios, pelo comando de impressão ou pelos ícones de configuração. | Parcial | R | memorial e pranchas de formas; sem desenhos de armadura |
| | **1.3.3 Gestão de arquivos** | | | |
| C1.40 | Lista das 6 últimas obras abertas e lista completa, em ordem cronológica, das obras abertas naquela versão. | Parcial | L | trabalho no navegador e arquivo .statikos; sem lista de obras recentes no edifício |
| C1.41 | Importação de arquivo texto ASCII, em colunas ou separado por vírgulas (planilhas ou outros programas), para gerar fundações. | Falta | L | importar cargas de fundação por texto/CSV |
| C1.42 | A importação ASCII traz as hipóteses de carga, os esforços nos arranques por hipótese simples e as dimensões da base dos pilares. | Falta | L |  |
| C1.43 | Fluxo da importação ASCII: nome da obra a criar, escolha do arquivo e depois cálculo. | Falta | L |  |
| C1.44 | Obras de exemplo acessíveis pelo gerenciador de arquivos. | Parcial | L | edifício padrão; sem obras de exemplo completas |
| C1.45 | Busca de obras na pasta por palavra no nome ou na descrição. | Parcial | L | busca na biblioteca do Pórtico; edifício não vai à biblioteca |
| C1.46 | Compactação de todos os arquivos da obra num único arquivo de formato próprio. | Feito | — | arquivo único .statikos com modelo, log e histórico |
| C1.47 | Envio da obra compactada por e-mail ou só gravação do compactado numa pasta. | Fora | — | e-mail fora do app (arquivo único) |
| C1.48 | Opção de incluir no compactado as cópias de segurança de versões anteriores e os arquivos associados (resultados do último cálculo). | Parcial | L | log de comandos no arquivo; sem cópias de versões |
| C1.49 | Descompactação da obra compactada. | Fora | — | não há compactação |
| C1.50 | Compartilhamento da obra compactada: publica num servidor com link privado, com título e comentário. | Fora | — | sem servidor (decisão: sem login); artifact do claude.ai pode compartilhar |
| C1.51 | Janela com o link para copiar e para abrir a página publicada. | Fora | — |  |
| C1.52 | Arquivo de texto local com os links de todas as obras publicadas. | Fora | — |  |
| C1.53 | Captura da tela do programa por tecla (F12) para publicar na internet com link privado. | Fora | — | captura de tela publicada |
| C1.54 | Na captura, nome, comentário e recorte de parte da imagem por janela de seleção. | Fora | — |  |
| C1.55 | A captura publicada gera dois formatos de endereço, para fóruns, e um link de acesso direto. | Fora | — |  |
| C1.56 | Arquivo de texto local com os links das capturas publicadas. | Fora | — |  |

## 2. Gabaritos DXF/DWG

| Item | Funcionalidade (palavras próprias) | Situação | Frente | Statikos |
|---|---|---|---|---|
| C2.1 | Recomendação de preparo: pilares, vigas de contorno e vigas de borda de abertura em camadas distintas. | Fora | — | recomendação de preparo do DXF (vale para o usuário) |
| C2.2 | Recomendação: contorno externo e bordas de aberturas desenhados como polígonos fechados. | Fora | — |  |
| C2.3 | Ponto fixo dos pilares marcado numa camada própria, por polígono fechado que contém o ponto a usar como fixo. | Falta | L | ponto fixo por camada no lançamento automático |
| C2.4 | Recomendação: gabaritos ou camadas diferentes para cada grupo quando o desenho da obra é completo (térreo, tipo, cobertura...). | Fora | — |  |
| C2.5 | Gerenciador de vistas de gabarito acessível pela barra principal. | Parcial | L | grupo Máscara por grupo de pavimentos |
| C2.6 | Anexação de gabaritos DXF/DWG à obra, com lista dos importados. | Parcial | L | DXF importado por grupo; DWG não |
| C2.7 | Gerenciador de camadas por gabarito: ligar/desligar, renomear, mudar cor. | Parcial | L | ligar/desligar e cor; sem renomear |
| C2.8 | Espessura de linha por camada, com valor digitado quando a espessura vem do tamanho. | Falta | L | espessura de linha por camada da máscara |
| C2.9 | Mostrar ou ocultar os textos de cada camada. | Parcial | L | textos da máscara aparecem; sem ligar/desligar só os textos |
| C2.10 | Permitir ou não capturas (snap) nas entidades de cada camada. | Feito | — | camada capturável |
| C2.11 | Pré-visualização do resultado da configuração de camadas ao lado da lista. | Falta | L | prévia da configuração de camadas |
| C2.12 | Conceito de vista: conjunto de camadas, escala e origem de um desenho. Em geral uma vista por grupo, cada uma ligada a um gabarito com seleção própria de camadas. | Parcial | L | máscara por grupo com camadas e transformação; uma por grupo |
| C2.13 | Operações sobre vistas: adicionar, apagar, copiar, deslocar, transformar, associar a grupos, abrir e salvar configuração. | Parcial | L | importar, alinhar, editar, remover; sem copiar vista nem salvar configuração |
| C2.14 | Transformação do gabarito (deslocamento e escala) por valores digitados ou graficamente. | Feito | — | escala, origem e rotação numéricas e por 2 pontos |
| C2.15 | Mudança gráfica da origem de coordenadas do gabarito. | Feito | — | alinhar por pontos |
| C2.16 | Retorno à origem original do desenho, desfazendo todas as mudanças de origem. | Parcial | L | editar volta valores; sem botão “origem original” |
| C2.17 | Ajuste de escala desconhecida: marcar os dois pontos de um segmento e informar sua medida real. | Feito | — | escala por segmento de medida conhecida |
| C2.18 | Escolha dos grupos em que cada vista aparece. | Parcial | L | uma máscara ligada a um grupo |
| C2.19 | Janela rápida para ligar/desligar vistas por pavimento. | Falta | L | janela rápida de vistas por pavimento |
| C2.20 | Janela de seleção dos modos de captura de objetos (snap) do DXF/DWG. | Feito | — | tipos de captura |
| C2.21 | Tecla de função (F3) liga/desliga as capturas. Se nenhum modo estiver escolhido, abre a janela de seleção. | Parcial | L | liga/desliga capturas (botão); tecla própria a conferir |
| C2.22 | Nas pranchas, opção de desenhar o gabarito DXF/DWG associado a cada pavimento. | Falta | R | máscara nas pranchas |

## 3. Grupos e pavimentos

| Item | Funcionalidade (palavras próprias) | Situação | Frente | Statikos |
|---|---|---|---|---|
| C3.1 | Até 5 pavimentos por grupo. | Fora | — | sem limite de pavimentos por grupo (escolha) |
| C3.2 | Grupo: conjunto de pavimentos iguais e consecutivos, com a mesma armadura. | Feito | — | grupo = pavimentos iguais |
| C3.3 | Num grupo, os dados são lançados uma vez para todos os pavimentos. | Feito | — |  |
| C3.4 | Os resultados na tela são a envoltória dos pavimentos do grupo. | Falta | N | envoltória dos pavimentos do grupo nos resultados (hoje lajes saem por pavimento; vigas pela envoltória do grupo) |
| C3.5 | O dimensionamento é único para todos os pavimentos do grupo. | Parcial | N | vigas por grupo; pilares por lance |
| C3.6 | Desenho único por grupo (uma planta de formas, um desenho de vigas etc.). | Feito | — | uma prancha de formas por grupo |
| C3.7 | Regra: só é preciso separar grupos onde um elemento vertical (pilar, pilar-parede, muro) ou viga inclinada nasce ou morre. | Parcial | L | verificação avisa pilar que nasce/morre |
| C3.8 | Sem pavimentos, só existe a criação. Depois aparecem apagar pavimentos, editar pavimentos, editar grupos, unir grupos e dividir grupos. | Feito | — | pavimento criar/editar/remover/repetir; grupo criar/editar/remover/desvincular |
| C3.9 | Novos pavimentos criados agrupados ou isolados. | Feito | — |  |
| C3.10 | Dados dos novos pavimentos: quantidade, alturas, carga variável, carga permanente (revestimento etc.) e nome de cada pavimento. | Feito | — | cota, nome, grupo; cargas por grupo |
| C3.11 | Categoria de uso do grupo escolhida entre as já definidas. Sem categorias definidas, fica a padrão e pode ser trocada depois. | Feito | — | uso NBR 6120 por grupo |
| C3.12 | As categorias de uso disponíveis dependem da norma (ex.: no Eurocódigo, residencial, escritórios, reunião, comércio, depósitos, veículos ≤ 30 kN, veículos de 30 a 160 kN e coberturas). | Parcial | L | usos da NBR 6120 (6 categorias) |
| C3.13 | Categoria de uso: conjunto de hipóteses variáveis (automáticas ou adicionais) que se combinam com as demais usando os mesmos coeficientes. | Parcial | N | hipóteses variáveis adicionais (Q) com ψ próprio (N1c); a categoria de uso continua uma só |
| C3.14 | Combinação correta das variáveis quando há categorias diferentes por pavimento. | Falta | N |  |
| C3.15 | As categorias da obra são escolhidas nos dados gerais, junto das hipóteses adicionais. | Feito | — | grupo Casos de carga na aba Edifício (N1c) |
| C3.16 | A categoria é atribuída a cada grupo na edição de grupos, pelo menu de cargas ou pelo de pavimentos. | Feito | — |  |
| C3.17 | As categorias podem ser definidas antes ou depois dos grupos. No lançamento automático, sempre depois. | Feito | — |  |
| C3.18 | Várias categorias no mesmo grupo: sem carga variável geral, com cargas lançadas em posições diferentes, cada uma ligada à sua hipótese e categoria. | Falta | N | várias categorias no mesmo grupo |
| C3.19 | Aviso: cada categoria a mais aumenta o número de combinações e o tempo de cálculo. | Fora | — |  |
| C3.20 | Cota do plano de fundação definida na edição de pavimentos, com reajuste automático das cotas de todos os pavimentos. | Feito | — | profundidade da fundação |
| C3.21 | Renomear pavimentos na edição de pavimentos. | Feito | — |  |
| C3.22 | Unir pavimentos num grupo, selecionando-os. | Parcial | L | mudar o grupo do pavimento; sem “unir grupos” em lote |
| C3.23 | Editar grupos (nome, cargas, categoria de uso), com destaque no esquema dos pavimentos selecionados. | Feito | — | grupo.editar |
| C3.24 | Dividir um grupo, separando seus pavimentos. | Feito | — | grupo.desvincular |
| C3.25 | Copiar para o grupo atual o conteúdo de outro grupo escolhido no esquema, com origem e destino em cores diferentes. | Parcial | L | viga.copiarParaGrupos (só vigas) |
| C3.26 | Recarregar o grupo da última gravação, perdendo as alterações posteriores, com confirmação. | Fora | — | desfazer cobre isso |
| C3.27 | Informação de áreas do grupo: total (inclui a área de pilares e muros), vigas e lajes. | Parcial | L | área de lajes e quantitativos; sem quadro de áreas do grupo |
| C3.28 | Consulta das cotas relativas e absolutas de cada pavimento. | Feito | — | cotas e pé-direito |
| C3.29 | Mudar posição e representação das referências (textos) dos elementos com dois cliques (texto e novo local). | Falta | L | mover textos de referência na planta |
| C3.30 | Ligar/desligar de forma permanente as referências na planta, escolhendo os tipos de texto visíveis. | Parcial | L | camadas de exibição na planta; sem escolher tipos de texto |
| C3.31 | Corte vertical do edifício por linha traçada, visto na tela e nas pranchas. | Falta | V | cortes verticais do edifício |
| C3.32 | Cortes do edifício sem limite de número, cada um com nome. Editar e apagar. | Falta | V |  |
| C3.33 | Cortes do edifício ativáveis na prancha de cada planta, com tamanho configurável. | Falta | V |  |
| C3.34 | Linhas de seção em qualquer direção no pavimento, com diagrama da seção. A janela da seção abre automaticamente. | Falta | V | linhas de seção no pavimento |
| C3.35 | Vista 3D do grupo atual ou de um intervalo de grupos/pavimentos. | Falta | V | vista 3D |
| C3.36 | Vista 3D do edifício completo, incluindo as estruturas 3D integradas. | Falta | V |  |
| C3.37 | Vista 3D com cor e textura por tipo de elemento (pilares, vigas, lajes etc.). | Falta | V |  |
| C3.38 | Rotação da vista 3D por barras: em torno de z e em torno de x. | Falta | V |  |
| C3.39 | Alternância entre projeção cônica (perspectiva) e isométrica. | Falta | V |  |
| C3.40 | Na perspectiva, navegação livre por dentro da estrutura. | Falta | V |  |
| C3.41 | Lajes e paredes com transparência na vista 3D, para mostrar os elementos ocultos. | Falta | V |  |

## 4. Pilares

| Item | Funcionalidade (palavras próprias) | Situação | Frente | Statikos |
|---|---|---|---|---|
| | **4.1 Lançamento** | | | |
| C4.1 | Lançamento de pilares, pilares-parede e arranques. | Parcial | E | pilares sim; pilar-parede só aviso; arranque não |
| C4.2 | Sem pavimentos definidos, só arranques podem ser lançados. | Falta | FU | arranques sem pavimentos |
| C4.3 | Depois do lançamento: editar, mover, ajustar, mudar ponto fixo e ângulo, coeficientes de engastamento, comprimentos de flambagem e cargas. | Parcial | N | editar, mover, ponto fixo, ângulo, engaste (N1a) e flambagem (N1b) por lance; cargas no topo do pilar na N1c |
| C4.4 | Arranque: pilar de altura zero para dimensionar a fundação (sapatas, radier etc.) sem lançar a estrutura nem os grupos. | Parcial | FU | módulo Fundações aceita cargas diretas por apoio |
| C4.5 | Cargas no topo do arranque, que representam as cargas transmitidas à fundação. | Parcial | FU | carga pontual no pavimento; sem carga no topo do pilar |
| C4.6 | Dois comandos de cálculo: a obra sem fundação e a obra com fundação. | Parcial | FU | cálculo do edifício + módulo Fundações separado |
| C4.7 | Pilar novo: grupo inicial e grupo final. | Feito | — | nasce/morre |
| C4.8 | Pilar novo: coeficientes de engastamento e de flambagem. | Feito | — | engaste (pilar.engaste, N1a) e flambagem (pilar.flambagem, N1b) por lance |
| C4.9 | Pilar novo: ângulo. | Feito | — |  |
| C4.10 | Pilar novo: vinculação exterior. | Parcial | N | base articulada ou com engaste parcial na fundação (pilar.engaste base, N1a); molas e outros vínculos externos ainda não |
| C4.11 | Material do pilar por pavimento/tramo (concreto ou aço) e dimensões ou perfil. | Parcial | E | seção por lance; só concreto |
| C4.12 | Posicionamento do pilar por clique. | Feito | — | clique, coordenada digitada, captura |
| C4.13 | Pilar que nasce sobre outro pilar. | Parcial | E | pilar que nasce num pavimento; sem checar apoio em pilar de baixo |
| C4.14 | Tramos superiores com ponto fixo, ângulo ou dimensões diferentes, podendo parte deles ficar fora da projeção do pilar de baixo. | Parcial | E | seção por lance; ponto fixo/ângulo por lance não |
| C4.15 | Empilhamento sem limite de pilares sobre pilares, e mais de um pilar nascendo no mesmo pilar. | Falta | E | vários pilares nascendo sobre um pilar |
| C4.16 | Pilar que admite outro por cima (termina antes do último pavimento) muda de cor sob o cursor e mostra um círculo de referência no eixo. | Falta | E |  |
| C4.17 | Coordenadas do ponto fixo do novo pilar relativas às do pilar de baixo. | Falta | E |  |
| C4.18 | Captura DXF/DWG de eixo, cantos ou ponto médio das faces do pilar de baixo, sem pedir coordenadas. | Parcial | E | capturas no contorno do pilar existente |
| C4.19 | Referência automática do pilar que nasce: referência do pilar de baixo seguida de letra sequencial (a, b, ...). | Falta | E | nome automático com sufixo para pilar que nasce |
| C4.20 | Pilares que não se sobrepõem são lançados como pilares comuns. | Feito | — |  |
| C4.21 | O topo do pilar de baixo não usa o coeficiente de engastamento do último pavimento. Os elementos apoiados nele são tidos como engastados por padrão. | Feito | — | lances intermediários usam o próprio coeficiente; o das opções vale só no topo do último lance (N1a) |
| C4.22 | Engastamento parcial só no topo do último tramo. Pode-se articular o pilar que chega a uma viga ou definir engaste parcial na base do pilar novo. | Feito | — | engaste parcial ou rótula no topo e na base de qualquer lance (N1a) |
| C4.23 | A transmissão de esforços entre pilares sobrepostos considera a excentricidade. O detalhe construtivo fica com o usuário. | Falta | N | excentricidade entre pilares sobrepostos |
| C4.24 | Pilar que nasce sobre outro não admite vinculação exterior. | Falta | E |  |
| C4.25 | Edição completa do pilar ou de cada propriedade em separado. | Feito | — | editar tudo ou um campo; quadro de pilares |
| C4.26 | Mudar o ponto fixo do pilar sem mover o pilar, aplicando o novo ponto fixo a vários pilares. | Parcial | L | pilar.editar muda o ajuste; sem “sem mover” em lote |
| C4.27 | Ponto fixo dos pilares visível durante o lançamento de vigas e lajes. | Feito | — | ponto fixo visível |
| C4.28 | Pilar novo com os dados copiados de um pilar existente, escolhido na tela. | Falta | L | copiar dados de um pilar (conta-gotas) |
| C4.29 | O formulário de pilar novo guarda os dados do último pilar lançado. | Feito | — | ferramenta guarda a última seção |
| C4.30 | Cópia de pilar que leva também as cargas horizontais e as cargas no topo. | Falta | L |  |
| C4.31 | Pilar-parede: geometria composta de retângulos, nome, grupos inicial e final, espessura, vinculação exterior e ângulo. | Falta | E | pilar-parede de retângulos |
| C4.32 | Tipos de pilar-parede gravados com a obra, reutilizáveis sem limite. | Falta | E |  |
| C4.33 | Taxas geométricas mínimas dos pilares por norma e tipo de aço, substituíveis por valores do usuário (cargas estáticas e dinâmicas separadamente). | Parcial | N | taxa mínima fixa (máx(0,15Nd/fyd; 0,4%)); sem valor do usuário |
| | **4.2 Resultados de pilares** | | | |
| C4.34 | Após o cálculo, pilares que não passam nas verificações ficam em vermelho e são revisados pela edição na aba de resultados. | Parcial | R | status em tabela; clique leva à planta; planta não colore |
| C4.35 | Janela de dimensionamento do pilar, aberta por clique. | Falta | R | janela de dimensionamento do pilar |
| C4.36 | O relatório do cálculo lista os pilares com erro de dimensionamento e indica onde revisá-los. | Feito | — | mensagens por lance |
| C4.37 | Seção em vermelho na tela, no pavimento onde está o erro. | Falta | R | seção em vermelho na planta |
| C4.38 | Tramos com erro marcados com símbolo de aviso e coluna de estado com códigos. O clique mostra o detalhe da verificação e sugestões de correção. | Parcial | R | status e mensagens; sem sugestões detalhadas |
| C4.39 | Erro de taxa excessiva: taxa mecânica aço/concreto acima de 100% ou geométrica acima de 8%. | Parcial | R | limite de 4% na busca |
| C4.40 | Verificação do cortante contra a compressão oblíqua (bielas), quando a norma pede, e do espaçamento dos estribos quando há armadura transversal. | Parcial | N | Vd e estribo pelo cortante nos pilares do edifício; biela não detalhada (N1e) |
| C4.41 | Detalhe do cortante: área longitudinal em X e Y, área de estribo, esforços e cortante resistente em cada direção (Vsd ≤ Vrd). | Parcial | N | Vd por pilar na tabela; sem detalhe por direção |
| C4.42 | Aviso de estribo fora da tabela: só um estribo foi colocado. Revisar a tabela de armaduras e a disposição dos estribos. | Falta | N |  |
| C4.43 | Limite da taxa volumétrica de estribos de confinamento em sismo com ductilidade muito alta. | Fora | — | sismo |
| C4.44 | Verificação de resistência ao fogo da seção do pilar, conforme o especificado. | Falta | N | fogo (NBR 15200) |
| C4.45 | Taxa As/Ac (%) mostrada por tramo. | Parcial | R | As por lance; taxa não exibida |
| C4.46 | Pilares de aço: ao calcular, opções de dimensionar ou não os perfis. | Fora | — | pilar de aço no edifício |
| C4.47 | Dimensionamento de perfis por toda a série (pode trocar por menor) ou só por perfis maiores ou iguais ao atual. | Fora | — |  |
| C4.48 | Testar outro perfil da série com verificação imediata. | Fora | — |  |
| C4.49 | Lista dos perfis da série com peso por metro, aproveitamento (%) e erros. | Fora | — |  |
| C4.50 | Botão para voltar ao perfil ótimo proposto pelo dimensionamento. | Fora | — |  |
| C4.51 | Dados do pilar no dimensionamento: ângulo, engastamento, desnível e profundidade do apoio. | Falta | R |  |
| C4.52 | Planta de situação dos pilares dos pavimentos selecionados. Pilares não dimensionados (armadura manual) em vermelho, e clique para passar a outro pilar. | Falta | R | planta de situação no dimensionamento |
| C4.53 | Bloqueio da armadura de pilares: recalcula a estrutura sem mudar a armadura bloqueada (preserva edições manuais). | Falta | R | bloqueio de armadura |
| C4.54 | Pilares bloqueados passam pela verificação completa da norma a cada recálculo, e os que falham ficam em vermelho. | Falta | R |  |
| C4.55 | Para redimensionar: desbloquear e redimensionar todos, ou redimensionar pilar a pilar mantendo o bloqueio. | Falta | R |  |
| C4.56 | Desbloqueio automático quando muda o número de pavimentos que o pilar sustenta. | Falta | R |  |
| C4.57 | Uso sugerido do bloqueio: estudar a sensibilidade da armadura ao engastamento, ao coeficiente de reação do solo ou ao radier. | Falta | R |  |
| C4.58 | O bloqueio vale só para pilares de concreto. Em aço, o equivalente é calcular sem dimensionar os perfis. | Fora | — |  |
| C4.59 | Seleção para bloqueio: um a um, por janela, ou bloquear/desbloquear todos. Selecionados em verde, pilares de aço em cinza e não selecionáveis. | Falta | R |  |
| C4.60 | Envoltórias de esforços em pilares e pilares-parede (momentos, cortantes, torção) por hipótese ou por combinação. | Parcial | R | esforços calculados; sem tela de envoltórias por pilar |
| | **4.3 Desenhos e relatórios de pilares** | | | |
| C4.61 | Mostrar ou ocultar o ponto fixo dos pilares nas pranchas. | Falta | R |  |
| C4.62 | Detalhe das condições de estribos (configuradas em pilares, muros e consolos) desenhado no quadro de pilares. | Falta | R | detalhe de estribos no quadro |
| C4.63 | Relatório de esforços e armaduras de pilares, pilares-parede e muros, com a verificação de cortante dos pilares de concreto. | Parcial | R | memorial do edifício (Nd, armadura, estribo) |

## 5. Muros e paredes estruturais

| Item | Funcionalidade (palavras próprias) | Situação | Frente | Statikos |
|---|---|---|---|---|
| C5.1 | Tipos de muro: concreto armado, alvenaria de blocos de concreto genéricos (armada), blocos de catálogo de fabricante e alvenaria genérica. | Falta | E | muros de concreto e alvenaria (V2); blocos de catálogo fora |
| C5.2 | Dados comuns a todos os tipos: geometria, existência de empuxos laterais e tipo de fundação de apoio. | Falta | E | muros e paredes estruturais (V2) |
| C5.3 | Bloco escolhido da biblioteca, com cadastro de blocos novos. | Falta | E | muros e paredes estruturais (V2) |
| C5.4 | Série de blocos genéricos com opção de peça de canto, para quando a largura não é metade do comprimento. | Falta | E | muros e paredes estruturais (V2) |
| C5.5 | Muros de blocos de fabricante: dimensionamento e verificação pelo Eurocódigo 6, com armadura vertical e/ou horizontal opcional. | Fora | — | Eurocódigo 6 |
| C5.6 | Saídas dos muros de blocos: relatório de cálculo, quantitativo, plantas e esquema em planta dos blocos e das armaduras. | Falta | E | muros e paredes estruturais (V2) |
| C5.7 | Escolha de fabricante e modelo de bloco. Peças especiais de canto usadas automaticamente quando o fabricante as tem. | Fora | — | catálogo de fabricante europeu |
| C5.8 | Alvenaria genérica: módulo de elasticidade, módulo de cisalhamento, peso específico, resistência de cálculo à compressão e à tração, e opção de considerar a rigidez ao cisalhamento. | Falta | E | muros e paredes estruturais (V2) |
| C5.9 | Aberturas (portas e janelas) em muros de concreto, de alvenaria genérica e de blocos. | Falta | E | muros e paredes estruturais (V2) |
| C5.10 | A abertura é lançada no pavimento de baixo dos dois entre os quais fica. | Falta | E | muros e paredes estruturais (V2) |
| C5.11 | Em muros de blocos, a abertura se ajusta à modulação dos blocos para evitar peças especiais. | Falta | E | muros e paredes estruturais (V2) |
| C5.12 | Verga: em muros de subsolo e de alvenaria genérica não há aviso de tensões excessivas. Em blocos, a verga é verificada e armada. | Falta | E | muros e paredes estruturais (V2) |
| C5.13 | Edição da armadura de uma abertura, destacada sob o cursor. | Falta | E | muros e paredes estruturais (V2) |
| C5.14 | Armadura padrão de portas, copiada de uma porta e aplicada a várias. | Falta | E | muros e paredes estruturais (V2) |
| C5.15 | Armadura padrão de janelas, copiada e aplicada da mesma forma. | Falta | E | muros e paredes estruturais (V2) |
| C5.16 | Armadura de vergas em muros de blocos, copiada e aplicada da mesma forma. | Falta | E | muros e paredes estruturais (V2) |
| C5.17 | Relatório das verificações da armadura de uma abertura escolhida. | Falta | E | muros e paredes estruturais (V2) |
| C5.18 | A armadura das aberturas de muros de concreto é dimensionada para empuxos e para os esforços em vergas e peitoris. | Falta | E | muros e paredes estruturais (V2) |
| C5.19 | Sismo com aceleração acima de 0,16 g: armadura inclinada em verga e peitoril. | Fora | — | sismo |
| C5.20 | Com vão livre/altura da verga < 1,5 e tração acima da resistência do concreto, as barras do quadro fazem o papel da armadura inclinada. | Fora | — | sismo |
| C5.21 | Prolongar muro (como as vigas), em todos os grupos onde ele existe. | Falta | E | muros e paredes estruturais (V2) |
| C5.22 | Atribuir as propriedades de um tipo de muro a outros muros, um a um ou por janela, inclusive copiando de um muro de outro tipo. | Falta | E | muros e paredes estruturais (V2) |
| C5.23 | Vigas embutidas e de coroamento aparecem sobrepostas ao muro em planta e são editáveis junto com ele. | Falta | E | muros e paredes estruturais (V2) |
| C5.24 | Opção de armadura: aço da armadura horizontal dos muros de blocos. | Falta | E | muros e paredes estruturais (V2) |
| C5.25 | Opção de armadura: resistências da argamassa e dos blocos de fabricante. | Falta | E | muros e paredes estruturais (V2) |
| C5.26 | Muro de concreto: armar ou não, sempre ou só quando necessário, só horizontal ou horizontal e vertical, e tipo da armadura horizontal. | Falta | E | muros e paredes estruturais (V2) |
| C5.27 | Pilares em contato com muros de alvenaria/blocos são desligados do muro no nível do pavimento, para uma transmissão de esforços mais realista. | Falta | E | muros e paredes estruturais (V2) |
| C5.28 | Sapata isolada equivalente para cada pilar sobre sapata corrida, dimensionada com os esforços do pilar e do trecho de muro apoiado. | Falta | FU | muros e paredes estruturais (V2) |
| C5.29 | Quantitativo de muros de blocos com peças inteiras e especiais (meio bloco, canto). | Falta | E | muros e paredes estruturais (V2) |
| C5.30 | Lacuna: o texto do item sobre muros de concreto armado (5.1.2.1) não veio na extração. Só há o título. | Falta | E | pendente: texto não veio na leitura (muros de concreto) |

## 6. Vigas

| Item | Funcionalidade (palavras próprias) | Situação | Frente | Statikos |
|---|---|---|---|---|
| | **6.1 Lançamento** | | | |
| C6.1 | Lançamento do contorno do pavimento combinando gabarito DXF/DWG e ferramentas de viga. | Feito | — | vigas sobre a máscara com capturas |
| C6.2 | Ajudas genérica e específica durante o lançamento. | Parcial | L | dicas e mensagens |
| C6.3 | Painel flutuante de ferramentas aberto depois da escolha do tipo de seção. | Parcial | L | grupo Vigas na barra lateral |
| C6.4 | Troca do tipo de viga atual a partir do painel. | Feito | — |  |
| C6.5 | Modo contínuo: o fim de uma viga é o início da próxima. A sequência só vale depois de encerrada pelo menu de contexto. | Feito | — | polilinha contínua; Enter encerra |
| C6.6 | Atalhos de teclado: encerrar a sequência (Ctrl+T) e apagar o último ponto (Ctrl+B). | Parcial | L | Enter/Esc; apagar último ponto a conferir |
| C6.7 | Modo simples: cada viga com início e fim independentes. | Parcial | L | polilinha de 2 pontos |
| C6.8 | Linha de ajuste da viga: eixo ou uma das faces. | Feito | — | eixo ou face |
| C6.9 | Distinção entre a linha clicada (introdução) e a linha de ajuste, com deslocamento configurável entre elas. | Falta | L | deslocamento configurável entre linha clicada e linha de ajuste |
| C6.10 | Troca cíclica do ajuste (eixo/faces) por atalho (Ctrl+E) durante o lançamento. | Feito | — | tecla A |
| C6.11 | Deslocamento útil quando o desenho mostra a fachada (com revestimentos) e não o limite estrutural. | Falta | L |  |
| C6.12 | Viga reta por dois pontos e viga curva por três (início, passagem e fim). A curva vira uma poligonal de trechos retos. | Falta | E | viga curva |
| C6.13 | Alternância reta/curva por atalho (Ctrl+A) e trechos retos e curvos alternados no modo contínuo, começando por qualquer um dos dois. | Falta | E |  |
| C6.14 | Janela da viga atual: tipo e propriedades (dimensões, seção, conectores etc.). | Feito | — | seção, invertida |
| C6.15 | Viga plana (faixa) com altura igual ao desnível entre os pontos mais alto e mais baixo da laje que contorna. | Falta | E | viga chata (faixa) |
| C6.16 | Viga com altura (descolgada): retangular, T ou com mesa colaborante. A mesa entra na rigidez, mas a armadura usa só a alma. | Parcial | E | retangular; sem T/mesa colaborante |
| C6.17 | Vigas treliçadas e protendidas (pré-fabricadas), com propriedades próprias. | Falta | E | treliçadas/protendidas pré-fabricadas |
| C6.18 | Viga de vinculação exterior, que simula por exemplo o topo de um muro. Pilares coincidentes precisam ser desligados para não terem o deslocamento vertical travado. | Falta | E | viga de vínculo externo |
| C6.19 | Desligamento muro-pilar só em lajes de vigotas. Em lajes maciças/cogumelo, a recomendação é lançar o muro como elemento. | Falta | E |  |
| C6.20 | A viga de coroamento do topo do muro não é especificada pelo programa. O detalhe fica com o usuário, com apoio da biblioteca de detalhes construtivos. | Fora | — |  |
| C6.21 | Viga não estrutural (limite), que só fecha o contorno de um pano maciço quando a viga de borda é desprezível. | Falta | E | viga não estrutural de contorno |
| C6.22 | Vigas de fundação: retangular, L, T ou plana (esta para fechar panos de radier). | Parcial | E | vigas no térreo funcionam como baldrame; sem tipo próprio |
| C6.23 | Vigas de aço: perfil simples, caixão soldado, perfis afastados com chapas de ligação, perfis unidos. Usam a mesma biblioteca dos pilares de aço. | Fora | — | vigas de aço no edifício |
| C6.24 | Vigas alveoladas (não mistas): furos hexagonais, octogonais ou circulares, proporções e número de furos preenchidos nas extremidades. | Fora | — |  |
| C6.25 | Vigas mistas: perfil sob a laje com concreto colaborante ligado por conectores de geometria definível. | Fora | — | mistas |
| C6.26 | Engaste parcial fixo de 0,05 na ligação da viga mista com o apoio, para reduzir o negativo e aumentar o positivo. | Fora | — |  |
| C6.27 | Viga mista: no negativo só o perfil resiste, no positivo a seção mista. | Fora | — |  |
| C6.28 | Largura colaborante automática: mínimo entre a largura efetiva calculada e mesa + 10 cm de cada lado. Em viga de borda, mesa + 10 cm. | Fora | — |  |
| C6.29 | Largura efetiva própria para verificar os positivos. A armadura de negativo sobre o apoio não é dimensionada. | Fora | — |  |
| C6.30 | Capturas DXF/DWG (mais próximo, interseção, extremo, ponto médio etc.) ao marcar os pontos da viga, sem ajuste posterior. | Feito | — | capturas |
| C6.31 | Poliviga: vigas consecutivas ligadas, que mudam e são apagadas juntas, com armaduras que podem diferir. | Feito | — | viga em polilinha (vários trechos) |
| C6.32 | Viga curva agrupada por padrão como poliviga e como tramo de armadura predefinido, com opções de compor e decompor. | Falta | R |  |
| C6.33 | Tramo de armadura predefinido: vigas consecutivas sem emenda da armadura inferior em ponto intermediário, enquanto a barra não passa do comprimento máximo configurado. | Falta | R |  |
| C6.34 | Compor ou decompor muda o número de vãos do pórtico. Para atualizar a armadura, basta redimensionar. | Falta | R |  |
| C6.35 | Vigas inclinadas de aço ou concreto entre um grupo inicial e um final: simples (uma só) ou múltipla (uma por pavimento). | Falta | E | vigas inclinadas entre grupos |
| C6.36 | Diagonais de contraventamento entre grupos inicial e final de pavimento único, podendo atravessar grupos intermediários. | Falta | E | diagonais de contraventamento |
| C6.37 | Diagonal simples ou múltipla (uma por pavimento). | Falta | E |  |
| C6.38 | Diagonal de concreto (largura e altura) ou de aço (perfil da biblioteca, em posição normal ou girada). | Falta | E |  |
| C6.39 | Ligação das extremidades da diagonal: engastada ou articulada. | Falta | E |  |
| C6.40 | Coeficientes de flambagem vertical e transversal aplicados ao comprimento total entre nós, em planos globais (não nos eixos locais). O cruzamento entre barras inclinadas não reduz o comprimento. | Falta | E |  |
| C6.41 | Copiar os dados de uma diagonal existente. | Falta | E |  |
| C6.42 | Diagonal lançada por clique em dois pontos (ex.: viga de partida e viga oposta), sem trocar de pavimento. Setas indicam a diagonal na planta. | Falta | E |  |
| C6.43 | Nó gerado no cruzamento de diagonais. Elas são dimensionadas à tração e à compressão, com verificação da esbeltez máxima da norma. | Falta | E |  |
| C6.44 | Apagar diagonal: em todos os grupos, se for múltipla. | Falta | E |  |
| C6.45 | Informação da diagonal (tipo, grupos, comprimento real, seção, ligações, flambagem), também desenhada na prancha de vigas do grupo inicial. | Falta | E |  |
| C6.46 | Editar, mover extremos e atribuir propriedades a diagonais existentes: a operação vale só no grupo atual. | Falta | E |  |
| C6.47 | Viga comum a dois grupos (ex.: borda entre laje horizontal e laje inclinada), lançada uma vez e criada automaticamente no outro grupo. | Falta | E | viga comum a dois grupos |
| C6.48 | Viga comum com eixo em traço-ponto. Armadura e envoltórias são consultadas no grupo de origem. | Falta | E |  |
| C6.49 | Viga comum em metade do comprimento: cada parte pode ser comum a um grupo diferente. | Falta | E |  |
| C6.50 | Desfazer viga comum, voltando às duas vigas originais (feito no grupo associado). | Falta | E |  |
| C6.51 | Contorno externo retangular fora do perímetro atual: com ângulo zero (dois cantos) ou com qualquer ângulo (dois cantos de um lado e um ponto do lado oposto). | Falta | L | contorno retangular |
| C6.52 | Atribuir as propriedades da viga atual a vigas já lançadas, uma a uma ou por janela. O mesmo vale para muros. | Feito | — | viga.atribuir |
| C6.53 | Prolongar viga por comprimento fixo (pré-visualizado) ou arrastando a extremidade. | Parcial | L | prolongar até ponto/elemento; sem comprimento fixo |
| C6.54 | Consolos curtos para apoiar viga indiretamente no pilar (juntas de dilatação). Não servem para apoiar pilares. | Falta | E | consolos |
| C6.55 | Lançamento de consolo: viga até a face do pilar, tipo e geometria do consolo (com área de apoio) e clique na face do pilar. | Falta | E |  |
| C6.56 | Modelagem do consolo: apoio fixo interno no centro do apoio, transmissão só da carga vertical e viga desligada da face do pilar (sem momento nem cortante). | Falta | E |  |
| C6.57 | Edição de consolos. | Falta | E |  |
| C6.58 | Ajuste de vigas à interseção de planos inclinados ou à linha de máxima declividade, indicadas por linhas magenta (contínua ou tracejada). | Falta | E |  |
| C6.59 | Armadura opcional de vigas no nível das lajes sobre muros de alvenaria genérica e de coroamento em blocos. Em muros de subsolo, a viga é armada no topo. Espessuras mínimas configuráveis. | Falta | E |  |
| C6.60 | Informação da viga de aço, com a largura efetiva de laje que ela recebe. | Fora | — |  |
| C6.61 | Cobrimentos nas zonas de confinamento (cálculo com sismo), indicados por linhas no editor. | Fora | — | sismo |
| C6.62 | Gravar referências-base de juntas de vigas e de pórticos para usar em obras futuras. | Falta | R |  |
| C6.63 | Lançamento por captura do gabarito: um clique numa linha, arco ou polígono gera uma série de vigas ajustadas pela face (do lado oposto ao cursor) ou pelo eixo. | Falta | L | vigas geradas por clique em linha da máscara |
| | **6.2 Cálculo e resultados de vigas** | | | |
| C6.64 | Vigas de aço no cálculo: dimensionar a partir do perfil inicial (só maiores ou iguais) ou de toda a série (pode reduzir). | Fora | — | aço |
| C6.65 | Erro: diâmetro do estribo acima de 1/10 da espessura (limite de norma específica). | Falta | R | verificações de detalhamento de estribo |
| C6.66 | Aviso de desnível longitudinal que pede detalhe especial (estribos adicionais para a continuidade da armadura). | Falta | R |  |
| C6.67 | Erro de barra mais longa que o máximo quando não é possível dividi-la (> 12 m). | Falta | R | barra acima de 12 m |
| C6.68 | Relatório de erros das vigas inclinadas após o cálculo. | Falta | E |  |
| C6.69 | Informação da viga inclinada: tipo, pavimentos, seção ou dimensões, armadura, engastamento e flambagem. | Falta | E |  |
| C6.70 | Listagem da viga inclinada: materiais, descrição, esforços por hipótese e combinação, envoltórias, aproveitamento (aço), resultado do dimensionamento e erros. | Falta | E |  |
| C6.71 | Vigas inclinadas com erro em vermelho, com detalhe por clique. | Falta | E |  |
| C6.72 | Edição de viga inclinada de concreto: geometria (largura e altura), armadura (estribos, superior, inferior, pele), verificação, dimensionamento, detalhamento e vista 3D. | Falta | E |  |
| C6.73 | Viga inclinada de aço: verificação de outros perfis da série. | Fora | — |  |
| C6.74 | Redimensionar todas as vigas inclinadas de concreto com os esforços do último cálculo. | Falta | E |  |
| C6.75 | Redimensionar os perfis das vigas inclinadas de aço (só maiores ou toda a série). | Fora | — |  |
| C6.76 | Copiar a armadura entre pórticos do mesmo grupo ou de grupos diferentes (destino escolhido por menu de contexto). | Falta | R | copiar armadura entre pórticos |
| C6.77 | Na cópia vão diâmetro, número e ancoragem (montagem e 1ª camada inferior), diâmetro, número e comprimento (demais barras) e diâmetro, espaçamento e extensão dos estribos. Não há aviso se a armadura copiada for menor que a necessária. | Falta | R |  |
| C6.78 | Condições para copiar: todos os vãos de concreto e do mesmo tipo (plana ↔ com altura sim, treliçada não), mesmo número de vãos, diferença de vão < 25 cm e desníveis coincidentes. Quando a cópia falha, uma mensagem dá o motivo. | Falta | R |  |
| C6.79 | Copiar a armadura não iguala os desenhos: isso só acontece com geometria idêntica. | Falta | R |  |
| C6.80 | Dimensionar as vigas de aço do pavimento a qualquer momento depois do cálculo, e testar outros perfis da série sem recalcular. | Fora | — |  |
| C6.81 | Agrupar pórticos depois do cálculo, sem verificar as condições. Aviso com o motivo quando não é possível. | Falta | R | agrupar pórticos |
| C6.82 | Em pórticos agrupados, a mudança em um vale para todos, e sai um único desenho com todas as referências. | Falta | R |  |
| C6.83 | Desagrupar pórticos e acrescentar pórtico a um agrupamento existente. | Falta | R |  |
| C6.84 | Bloquear a armadura de pórticos para preservar edições manuais nos recálculos. | Falta | R | bloquear armadura |
| C6.85 | Pórticos bloqueados só são verificados quanto à área de aço e à flecha. Os que falham aparecem na cor de erro. | Falta | R |  |
| C6.86 | Desbloqueio automático quando muda o número de vãos do pórtico. | Falta | R |  |
| C6.87 | Redimensionar todos os pórticos ou só os alterados (desbloqueados ou com seção modificada). | Falta | R |  |
| C6.88 | Seleção de bloqueio por grupo: todos, nenhum ou seleção gráfica (contorno vermelho), com a contagem de selecionados. | Falta | R |  |
| C6.89 | Erro de conector: diâmetro nominal pequeno. | Fora | — | conectores de vigas mistas |
| C6.90 | Erro de conector: comprimento total insuficiente. | Fora | — | conectores de vigas mistas |
| C6.91 | Erro de conector: não ancorado na laje. | Fora | — | conectores de vigas mistas |
| C6.92 | Erro de conector: comprimento insuficiente para o diâmetro. | Fora | — | conectores de vigas mistas |
| C6.93 | Erro de conector: diâmetro da cabeça insuficiente. | Fora | — | conectores de vigas mistas |
| C6.94 | Erro de conector: espessura da cabeça insuficiente. | Fora | — | conectores de vigas mistas |
| C6.95 | Erro de conector: diâmetro que não garante a ductilidade da ligação. | Fora | — | conectores de vigas mistas |
| C6.96 | Erro de conector: comprimento que não garante a ductilidade. | Fora | — | conectores de vigas mistas |
| C6.97 | Erro de conector: número excessivo para o comprimento da viga. | Fora | — | conectores de vigas mistas |
| C6.98 | Erro de conector: mesa do perfil fina demais para soldar o conector (espessura mínima depende do diâmetro). | Fora | — | conectores de vigas mistas |
| C6.99 | Erro de conector: mesa estreita demais para dois conectores (distâncias mínimas entre conectores e à borda). | Fora | — | conectores de vigas mistas |
| C6.100 | Verificação de consolos após o cálculo: os com erro ficam em vermelho, e o clique dá o relatório das verificações. | Falta | E |  |
| C6.101 | Redimensionar a armadura de todos os consolos com os esforços do último cálculo. | Falta | E |  |
| C6.102 | Editar a armadura de vigas inclinadas. | Falta | E |  |
| C6.103 | Configuração do editor de armaduras de vigas: escolher o que mostrar (superior, inferior, pele, faixas de estribos, seção, zonas de confinamento). | Falta | R | editor de armaduras de vigas |
| C6.104 | Fator multiplicador do comprimento de emenda (lb) no editor. | Falta | R |  |
| C6.105 | Envoltórias de esforços em vigas (momento, cortante, torção) por hipótese simples ou combinação. Em sismo dinâmico, escolha do modo de vibração. | Parcial | V | envoltórias calculadas (M+, M−, V); sem diagrama na tela |
| C6.106 | Diagramas consultados por clique em alinhamentos de vigas, lajes alveolares ou lajes mistas. | Falta | V | diagramas por clique |
| | **6.3 Desenhos de vigas** | | | |
| C6.107 | Desenho da armadura de vigas inclinadas. | Falta | R |  |
| C6.108 | Desenho de consolos: vistas frontal e lateral cotadas, armadura principal e estribos, medidas e referências do pórtico e do pilar. | Falta | R |  |

## 7. Lajes

| Item | Funcionalidade (palavras próprias) | Situação | Frente | Statikos |
|---|---|---|---|---|
| | **7.1.1 Gestão de panos** | | | |
| C7.1 | Tipos de pano: lajes de vigotas (unidirecionais), alveolares, mistas (steel deck), nervuradas bidirecionais (cubetas), maciças, radier e pano a definir. | Parcial | E | maciça e treliçada; sem alveolar, steel deck, nervurada bidirecional, radier |
| C7.2 | Todo contorno fechado por vigas vira automaticamente um pano a definir, marcado com um ponto de interrogação. | Parcial | L | panos detectados; pano sem laje gera aviso |
| C7.3 | O lançamento do pano pede a direção da armadura, das nervuras ou das vigotas, dada por clique numa viga paralela ou perpendicular ao pano. | Feito | — | direção pelo menor vão, editável |
| C7.4 | Apagar pano: o espaço vira abertura. | Feito | — | remover laje |
| C7.5 | Mudar o ponto de inserção do pano. | Falta | L |  |
| C7.6 | Mudar a direção do pano, por uma viga ou por dois pontos. | Parcial | L | direção editável (número); não por viga/2 pontos |
| C7.7 | Consultar e editar os dados do pano. | Feito | — |  |
| C7.8 | Copiar dados de outro pano, escolhendo o que copiar (plano de inclinação, engastamento etc.), inclusive de pano de outro grupo escolhido por menu de contexto. Alerta para desligar a cópia do plano entre panos de inclinações diferentes. | Parcial | L | laje.atribuir (tipo); sem escolher o que copiar |
| C7.9 | Mostrar as formas (cubetas) das lajes nervuradas e desenhar as nervuras com a largura real. | Falta | R | desenho das nervuras |
| C7.10 | Momentos mínimos por pano em lajes de vigotas, alveolares e mistas. | Falta | N | momentos mínimos por pano |
| C7.11 | Classe de ambiente (exposição) por pano em vigotas protendidas e alveolares, atribuída a um pano ou a todos do grupo. | Falta | N |  |
| C7.12 | Coeficiente de engastamento de borda por pano ou para todos do grupo (não disponível em nervuradas; nelas se usa o engaste de extremidade das vigas). | Falta | N | engastamento de borda por pano |
| C7.13 | Processo construtivo das alveolares: com ou sem escoramento. | Fora | — |  |
| C7.14 | Vigota dupla ou tripla ao lado de uma vigota escolhida, com apagamento posterior. | Falta | E |  |
| | **7.1.2.1 Pano a definir** | | | |
| C7.15 | Trocar abertura ou pano já definido por pano a definir, e pano a definir por abertura ou por qualquer tipo de laje. | Parcial | E | remover/criar laje no pano |
| C7.16 | Pano a definir com desnível, inclinação e espessura. A espessura passa às vigas planas do contorno. | Parcial | E | desnível da laje; sem inclinação |
| C7.17 | Obra com pano a definir não pode ser calculada (evita esquecimento). | Falta | L | bloquear o cálculo com pano sem tipo |
| C7.18 | Pano a definir visível na vista 3D, para conferir aberturas e lajes antes de escolher o tipo. | Falta | V | 3D |
| | **7.1.2.2 Lajes de vigotas** | | | |
| C7.19 | Tipos de laje de vigotas disponíveis conforme a norma escolhida. | Parcial | E | catálogo H8–H25 próprio [a confirmar] |
| C7.20 | Vigotas de concreto armadas ou protendidas, por catálogo de fabricante ou por propriedades geométricas (dependendo da norma, só a segunda opção). | Falta | E | vigotas protendidas; catálogo de fabricante |
| C7.21 | Tipos genéricos por geometria (criar, copiar, apagar) para quando a vigota final não é conhecida, ajudando a decidir entre armada e protendida pela flecha. | Falta | E |  |
| C7.22 | Dados geométricos: referência, espessura da capa, altura do enchimento, intereixo e largura mínima da nervura. | Parcial | E | capa, enchimento, intereixo, nervura do catálogo; não editáveis |
| C7.23 | Acréscimo de largura da nervura, usado só na rigidez e no momento de fissuração para a flecha (enchimento de concreto). | Falta | E |  |
| C7.24 | Volume de concreto por m² calculado e editável. | Feito | — | volume de concreto nos quantitativos |
| C7.25 | Tipo de enchimento: concreto, cerâmica, EPS ou genérico (genérico pede o peso por m²). Peso total por m² calculado. | Parcial | E | só EPS |
| C7.26 | Escolha entre vigota armada e protendida para o cálculo da flecha (relação rigidez fissurada/bruta a confirmar com o fabricante). | Falta | E |  |
| C7.27 | Exportar a laje definida para uma biblioteca interna e reutilizar em outras obras. | Falta | E | biblioteca de lajes |
| C7.28 | Biblioteca de fichas de fabricantes. Os dados são do fabricante, o programa só faz um controle lógico. Novas fichas podem ser criadas num editor à parte. | Falta | E |  |
| C7.29 | Seleção na biblioteca: referência opcional (padrão ficha + laje), ficha/fabricante e laje da série (altura e intereixo), com resumo das propriedades (concretos, aço de protensão etc.). | Falta | E |  |
| C7.30 | Ficha técnica para vigota simples e dupla, com dados obrigatórios e recomendados. | Falta | E |  |
| C7.31 | Vigota armada, positivo (meio do vão): tipo, armadura (base + adicional em todo o comprimento + adicional mais curta), área de aço, momento último, momento de fissuração, rigidez total e rigidez fissurada (flecha por Branson). | Parcial | E | momento por nervura informado; armadura com o fabricante |
| C7.32 | Vigota armada, negativo (apoio): armadura superior adicional (duas parcelas com comprimentos calculados), área de aço, momento último da seção típica e da seção maciça (sem enchimento), momento de fissuração e rigidezes. | Falta | E |  |
| C7.33 | Cortante último da seção, com valores por tipo de treliça. O tipo usado aparece na tela e no desenho. | Falta | E |  |
| C7.34 | Vigota protendida: momentos de serviço por classe de ambiente/exposição, comparados com o de cálculo. Se não passa, procura outra vigota, e sem solução emite erro no fim do cálculo. | Falta | E |  |
| C7.35 | Vigota protendida sem armadura de cortante. | Falta | E |  |
| C7.36 | Laje nervurada moldada no local (nervuras como vigas) com armadura de base atribuível. | Falta | E | nervurada moldada no local |
| C7.37 | Dados da nervurada moldada no local: referência, tipo de enchimento (biblioteca: criar, copiar, apagar), espessura da capa e intereixo. | Falta | E |  |
| C7.38 | Laje com vigotas de perfil I laminado: referência, enchimento, capa, intereixo e série de perfis. | Fora | — |  |
| C7.39 | Nas vigotas de aço, escolhe-se a série e o perfil é dimensionado automaticamente, sempre biapoiado (engastamento 0 fixo). | Fora | — |  |
| C7.40 | Laje com vigotas treliçadas de aço biapoiadas: tipo (banzos com um ou dois perfis), série de perfis, altura nominal, ângulo das diagonais entre 30° e 60°, intereixo e espessura da capa (não colaborante). | Fora | — |  |
| C7.41 | Coeficiente de redução da rigidez à torção das lajes de vigotas, consultável e editável nas opções gerais. | Parcial | E | torção 15% fixa (premissa); não editável na tela |
| | **7.1.2.3 Lajes nervuradas bidirecionais** | | | |
| C7.42 | Forma perdida ou recuperável. | Falta | E | nervurada bidirecional |
| C7.43 | Formas importadas da biblioteca ou definidas pelo usuário, e editáveis. | Falta | E |  |
| C7.44 | Disposição das formas visível na tela. | Falta | E |  |
| C7.45 | Pano lançado paralelo a uma viga ou por dois pontos. | Falta | E |  |
| C7.46 | Copiar panos nervurados no mesmo grupo e atribuir armadura de base aos panos do grupo. | Falta | E |  |
| C7.47 | Geração automática de ábacos (capitéis), com parâmetros configuráveis. | Falta | E | ábacos/capitéis |
| C7.48 | Ábaco, ângulo de visão: cone de busca a partir de cada face do pilar. O pilar mais próximo dentro do cone dá o vão de referência, e sem pilar vale o mínimo. | Falta | E |  |
| C7.49 | Ábaco, extensão maciça: porcentagem da distância ao pilar vizinho, medida da face do pilar à borda do ábaco. | Falta | E |  |
| C7.50 | Ábaco, comprimentos mínimo e máximo da face do pilar à borda, em relação à altura do ábaco. | Falta | E |  |
| | **7.1.2.4 Lajes alveolares** | | | |
| C7.51 | Lajes alveolares da biblioteca ou criadas pelo usuário, com ajuda sobre os dados pedidos. | Falta | E | alveolares |
| | **7.1.2.5 Lajes mistas (steel deck)** | | | |
| C7.52 | Laje com chapa de aço perfilada, concreto e armaduras superior e inferior. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.53 | Chapa só como forma: resiste ao peso próprio, ao concreto fresco e às cargas de execução, e em serviço só a laje de concreto armado trabalha. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.54 | Posição da chapa normal ou invertida, conforme o fabricante. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.55 | Linha tracejada no eixo de sobreposição das chapas, com a largura da ficha. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.56 | Chapa colaborante: forma perdida na execução e armadura de tração (positivos) em serviço, com transmissão de cisalhamento por mossas. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.57 | Análise e dimensionamento da chapa pelo Eurocódigo 4 (versão de 1994/95). | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.58 | Uso para cargas predominantemente estáticas, incluindo galpões com cargas móveis. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.59 | Limites verificados: espessura total da laje, espessura de concreto sobre as nervuras da chapa e altura mínima dos conectores (vigas mistas). | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| | **7.1.3 Lajes inclinadas e desníveis** | | | |
| C7.60 | Fluxo: lançar tudo na horizontal e depois atribuir inclinações ou desníveis. | Falta | E | lajes inclinadas |
| C7.61 | Lista de planos com nome editável, indicação de plano já atribuído, cor por plano e valores (cota ou inclinação). | Falta | E | lajes inclinadas e planos |
| C7.62 | Atribuir um plano a panos do grupo, que passam a ter a cor do plano. | Falta | E | lajes inclinadas e planos |
| C7.63 | Plano inclinado por três pontos com desnível de cada um em relação ao pavimento. | Falta | E | lajes inclinadas e planos |
| C7.64 | Plano por reta horizontal (dois pontos com a mesma cota) e inclinação perpendicular a ela. | Falta | E | lajes inclinadas e planos |
| C7.65 | Plano por linha de máxima declividade (dois pontos), desnível do primeiro e inclinação. | Falta | E | lajes inclinadas e planos |
| C7.66 | Definição numérica ou gráfica sobre a planta, com captura do gabarito. O cursor muda de cor sobre eixo ou face de viga. | Falta | E | lajes inclinadas e planos |
| C7.67 | Editar plano na planta: arrastar pontos e reescrever cotas/inclinações sobre o texto. | Falta | E | lajes inclinadas e planos |
| C7.68 | Editar plano numericamente. | Falta | E | lajes inclinadas e planos |
| C7.69 | Seta indicando o sentido descendente da máxima declividade no pano. Aviso quando as nervuras não são paralelas ou perpendiculares a ela. | Falta | E | lajes inclinadas e planos |
| C7.70 | Incoerência de inclinação entre vigas e pano adjacente detectada (vigas em vermelho) e corrigida por clique, copiando a inclinação do pano. | Falta | E | lajes inclinadas e planos |
| C7.71 | Casos-guia: só panos inclinados (desníveis positivos), pano horizontal numa extremidade (desníveis negativos no grupo superior com vigas comuns), horizontais nas duas extremidades (rampa num grupo intermediário) e sobreposições na projeção (um grupo por cota). | Falta | E | lajes inclinadas e planos |
| C7.72 | Sequência recomendada: grupos, panos horizontais, vigas comuns, panos a inclinar (vigas de transição ajustadas às interseções do gabarito), planos e atribuição. | Falta | E | lajes inclinadas e planos |
| C7.73 | Projeção horizontal da viga pelo eixo ou pela face, com a face superior desenhada em linha contínua (cumeeira mais larga, rincão mais estreito). | Falta | E | lajes inclinadas e planos |
| C7.74 | Rotação da seção de vigas horizontais (cumeeira, borda) para acompanhar o pano, só em vigas planas. Sem coincidência com a interseção, não gira e ganha altura para os dois panos. | Falta | E | lajes inclinadas e planos |
| C7.75 | Limitações: pano inclinado não se apoia em muro, e não há viga comum com o coroamento de muro. | Falta | E | lajes inclinadas e planos |
| C7.76 | Na planta de formas, valor da inclinação junto ao texto de desnível, com croqui opcional do pavimento (pilares, eixos de vigas, setas de inclinação) em quadro de tamanho configurável. | Falta | E | lajes inclinadas e planos |
| C7.77 | Exemplos: telhado de duas águas, mansarda com águas-furtadas, rampa de garagem para subsolo (grupo intermediário, pilares próprios, muro na base, viga comum no topo) e rampa entre pavimentos de estacionamento. Curvas de rampa de preferência em plano horizontal. | Falta | E | lajes inclinadas e planos |
| | **7.1.4 Aberturas** | | | |
| C7.78 | Aberturas retangulares com escolha do tipo de viga de borda, nos quatro modos a seguir. | Parcial | L | abertura em laje (polígono); sem viga de borda automática |
| C7.79 | Abertura retangular paralela a uma viga escolhida (dois cantos internos opostos). | Falta | L |  |
| C7.80 | Abertura retangular com ângulo zero (dois cantos). | Parcial | L | abertura por contorno |
| C7.81 | Abertura retangular no ângulo das nervuras do pano (paralela aos eixos gerais se o pano estiver vazio). | Falta | L |  |
| C7.82 | Abertura retangular com qualquer ângulo (dois pontos de um lado e arraste até o lado oposto). | Falta | L |  |
| | **7.1.5 Opções de lajes** | | | |
| C7.83 | Limites de flecha ativa das lajes de vigotas (padrões próprios, como nas vigas). | Parcial | N | limite L/250 fixo |
| C7.84 | Limites de flecha total a longo prazo das lajes de vigotas. | Falta | N |  |
| C7.85 | Cortante em nervuradas moldadas no local (só pela norma espanhola EHE): fórmula alternativa sem dependência da armadura longitudinal. | Fora | — | EHE |
| C7.86 | Dimensionamento de vigotas treliçadas de aço: todas as barras iguais, banzos iguais ou cada barra independente. | Fora | — |  |
| | **7.2 Resultados de lajes (lido só o começo)** | | | |
| C7.87 | Vistas de resultados das lajes de vigotas na aba de resultados, com a opção de mostrar momentos/tipos combinada com a de mostrar esforços. O texto termina aqui. | Falta | R | vistas de resultados das lajes |

## 7. Lajes (continuação)

| Item | Funcionalidade (palavras próprias) | Situação | Frente | Statikos |
|---|---|---|---|---|
| | **7.2.1.1 Vistas de resultados das lajes de vigotas (continuação)** | | | |
| C7.88 | Com a exibição de esforços desligada, a vista de momentos mostra em vez dos valores o tipo de vigota (protendida ou armada), o perfil (vigota de aço e treliça metálica) ou o diâmetro e comprimento da armadura inferior (vigota moldada no local). | Falta | R | vistas de resultado das vigotas |
| C7.89 | Com a exibição de esforços ligada, mostra o momento positivo de cálculo por metro de largura (já majorado) junto a cada vigota. | Parcial | R | momento por nervura informado na mensagem |
| C7.90 | Vista de cortantes: com esforços ligados, mostra a cortante de cálculo por metro; desligados, mostra o tipo de treliça (vigota armada pré-fabricada) ou o diâmetro e espaçamento dos estribos (vigota moldada no local). | Falta | R |  |
| C7.91 | Vista da armadura inferior das lajes moldadas no local, indisponível quando a exibição de esforços está ligada. | Falta | R |  |
| C7.92 | Chave geral de exibição de esforços para todos os tipos de vigota, que condiciona as vistas de momentos e de cortantes. | Falta | R |  |
| C7.93 | Exibição agrupada: mostra um só valor de esforço/tipo para cada grupo de vigotas iguais. | Falta | R |  |
| C7.94 | Armadura superior em lajes inclinadas: desenho do dobramento ao lado da barra. | Falta | E |  |
| C7.95 | Armadura superior em lajes inclinadas: marca do ponto de dobra como traço perpendicular ao eixo da barra. | Falta | E |  |
| | **7.2.1.2 Igualar vigotas** | | | |
| C7.96 | Agrupamento automático de vigotas quando (Mmáx − Mmín) do grupo < percentual × Mmáx, com o percentual dado pelo usuário. | Falta | R |  |
| C7.97 | Igualação feita ponto a ponto da discretização da vigota, considerando todas as combinações de todas as vigotas do grupo. | Falta | R |  |
| C7.98 | Momentos igualados pelo máximo de cada ponto ou pela média de cada ponto, à escolha. | Falta | R |  |
| C7.99 | Cortante igualada sempre pelo máximo entre as combinações das vigotas do grupo. | Falta | R |  |
| C7.100 | Igualação da armadura superior: percentual de diferença e critério (maior ou média) definidos pelo usuário; compara a área de aço de cada vigota com a vizinha, iguala se a diferença é menor que o percentual e segue em cadeia por todo o pano e por todos os panos. | Falta | R |  |
| | **7.2.1.3 Erros de vigotas** | | | |
| C7.101 | Vigotas com erro (flecha, cortante ou outro) aparecem em vermelho; consulta da mensagem clicando na vigota. | Parcial | R | status por laje; vigota individual não |
| C7.102 | Erro de armadura inferior: flecha instantânea, diferida ou ativa acima do limite (por peso próprio, sobrecarga ou carga de montagem); sugere aumentar a espessura. | Parcial | R | flecha da laje verificada (aproximada) |
| C7.103 | Erro: momento positivo no apoio da vigota; sugere mudar o coeficiente de engastamento do pano ou rever a continuidade da armadura inferior. | Falta | R |  |
| C7.104 | Erro: altura da laje insuficiente para a flexão. | Falta | R |  |
| C7.105 | Erro: nenhuma vigota da série (protendida ou armada) cobre o momento positivo máximo. | Falta | R |  |
| C7.106 | Erro: a armadura inferior da vigota moldada no local não cabe na largura da nervura (espaçamento e cobrimento); sugere aumentar altura ou largura da nervura. | Falta | R |  |
| C7.107 | Erro de vigota de aço: nenhum perfil da série serve para a geometria do pano e da forma (intereixo excessivo para apoiar a forma nas abas). | Falta | R |  |
| C7.108 | Erro de vigota de aço/treliça: nenhum perfil da série resiste aos esforços; sugere trocar de série. | Falta | R |  |
| C7.109 | Erro de armadura superior: zona comprimida insuficiente para o momento negativo, sem solução por maciçamento; exige laje mais alta. | Falta | R |  |
| C7.110 | Erro: momento negativo acima do máximo da ficha do fabricante, com o valor mostrado; sugere laje mais alta ou vigota dupla. | Falta | R |  |
| C7.111 | Erro: área de armadura superior exigida no apoio (face interna da viga) excessiva, armadura não dimensionada. | Falta | R |  |
| C7.112 | Aviso: armadura negativa fora da tabela (lajes genéricas e moldadas no local); o programa calcula assim mesmo e sugere laje mais alta ou vigota dupla. | Falta | R |  |
| C7.113 | Aviso: maciçamento maior que duas vezes a altura (o maciçamento evita armadura inferior comprimida). | Falta | R |  |
| C7.114 | Aviso: maciçamento maior que 20 % do vão livre. | Falta | R |  |
| C7.115 | Aviso: extremidades engastadas/contínuas não dimensionadas em vigotas de aço (articuladas nas bordas; em balanço o pano interno dá continuidade só para equilíbrio local, sem dimensionar o negativo). | Falta | R |  |
| C7.116 | Erro: cortante calculada acima da resistência da ficha da vigota; sugere laje mais alta ou vigota dupla. | Falta | R |  |
| | **7.2.1.4 Informação da vigota** | | | |
| C7.117 | Consulta, por clique, da flecha e de outros dados de uma vigota. | Falta | R |  |
| | **7.2.1.5 Atribuição manual** | | | |
| C7.118 | Atribuição de dados a vigotas selecionadas da primeira à última (destacadas em amarelo). | Falta | R |  |
| C7.119 | Vigota genérica de concreto: atribuir momento fletor e cortantes de extremidade (igualação manual). | Falta | R |  |
| C7.120 | Vigota armada: trocar o tipo dentro da série e a armadura transversal. | Falta | R |  |
| C7.121 | Vigota armada: armaduras parciais definidas por comprimento total, comprimento dado ou percentual do comprimento; exibidas sempre em percentual na tela e nos desenhos. | Falta | R |  |
| C7.122 | Vigota protendida: trocar o tipo dentro da série. | Falta | R |  |
| C7.123 | Vigota moldada no local: alterar armadura inferior (até duas barras longitudinais) e transversal; comprimento das barras editável sem ultrapassar a face externa das vigas; zona de estribos convertida em número de barras pelo espaçamento. | Falta | R |  |
| C7.124 | Vigota de aço: trocar o perfil dentro da série. | Falta | R |  |
| C7.125 | Treliça metálica: trocar o perfil dos banzos ou das diagonais dentro da série. | Falta | R |  |
| | **7.2.2 Lajes maciças e nervuradas (cogumelo/ábacos)** | | | |
| C7.126 | Aviso pós-cálculo: flecha de lajes nervuradas e maciças não é verificada automaticamente; o usuário consulta a flecha elástica entre dois pontos e compara com o limite da norma. | Feito | — | flecha de lajes maciças estimada e comparada com L/250 (o manual não verifica) |
| C7.127 | Aviso pós-cálculo recomendando recalcular quando há perfis de aço maiores que os lançados. | Falta | R |  |
| C7.128 | Geração da armadura de lajes maciças/nervuradas sem cálculo completo, com a geometria atual, para editar à mão; apaga toda a armadura existente da obra. | Falta | R |  |
| C7.129 | Vista da armadura em lajes inclinadas: desenho do dobramento, comprimentos parciais de cada lado da dobra e marca do ponto de dobra. | Falta | R |  |
| C7.130 | Vista com siglas de reforço superior e inferior junto às barras de reforço. | Falta | R |  |
| C7.131 | Vista das linhas de flexão (linhas de corte para armadura) definidas pelo usuário. | Falta | R |  |
| C7.132 | Troca de diâmetro/espaçamento escolhendo um conjunto de armadura de uma tabela, atribuível às lajes; a tabela é editável. | Falta | R |  |
| C7.133 | Janela de armadura pode ficar aberta enquanto se edita (edição contínua). | Falta | R |  |
| C7.134 | Desfazer o agrupamento de barras clicando no grupo, que mostra todas as barras dele. | Falta | R |  |
| C7.135 | Manter visível a armadura das vistas ativas enquanto se edita outra (ex.: ver a inferior ao editar a superior). | Falta | R |  |
| C7.136 | Salvar cópia da armadura de todos os grupos (ex.: antes de abrir um furo imprevisto). | Falta | R |  |
| C7.137 | Recuperar a cópia salva: restaura só onde a geometria não mudou, cortando barras na borda de furos novos sem criar ganchos. | Falta | R |  |
| C7.138 | Copiar a armadura de outro grupo de pavimentos para o grupo atual (destino); copia só onde há laje, corta nas bordas de furos sem ganchos; exige mesmo ângulo e ponto de inserção da malha; recomenda-se criar grupos copiando o de baixo e revisar barras cortadas. | Falta | R |  |
| C7.139 | Adicionar grupos de estribos de punção nas nervuras que chegam a um ábaco: número, diâmetro e espaçamento; o ábaco sob o cursor escurece e recebe as barras ao clicar. | Falta | N |  |
| C7.140 | As barras novas somam-se às existentes; para substituir, apagar antes. | Falta | N |  |
| C7.141 | Apagar grupos de armadura de punção (lajes cogumelo, maciças e nervuradas) um a um ou por janela de captura. | Falta | N |  |
| | **7.2.3 Lajes alveolares** | | | |
| C7.142 | Vistas de lajes alveolares inclinadas: desenho do dobramento e marca do ponto de dobra. | Falta | E |  |
| C7.143 | Catálogo de fabricante com fichas das placas alveolares; quadro de propriedades no relatório de dados da obra. | Falta | E |  |
| | **7.2.4 Lajes mistas (steel deck)** | | | |
| C7.144 | Cálculo em duas fases: construção e serviço. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.145 | Construção: resistência da fôrma de aço com peso do concreto, peso da fôrma e cargas de construção (operários, equipamentos). | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.146 | Construção: flecha calculada sem as cargas de construção. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.147 | Construção: pano tratado como simplesmente apoiado (engastamento 0 com as vigas). | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.148 | Construção: opção de dimensionar a fôrma se falhar ELU ou flecha, ou só calcular o espaçamento do escoramento sem trocar a fôrma. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.149 | Serviço: engastamento padrão 0 em todos os panos (sem momento positivo nos apoios intermediários das vigas de aço); depois do primeiro cálculo, o usuário pode dar coeficiente entre 0 e 1 e recalcular. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.150 | Serviço sem escoramento: só a carga aplicada após a construção atua na laje mista; aproximada por coeficiente interno = coef. do usuário × (1 − peso próprio/carga total). | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.151 | Serviço com escoramento: carga total (permanente + sobrecarga) na laje mista. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.152 | Opção de dimensionar a fôrma no serviço; armadura inferior pode ser dimensionada em qualquer caso, e com ela a colaboração da fôrma é desprezada. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.153 | Quando há armadura na espessura de concreto, ao menos uma barra por nervura. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.154 | Verificação seção crítica I: flexão no meio do vão (ligação completa fôrma-concreto), momento resistente pela teoria plástica. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.155 | Verificação seção crítica II: cisalhamento longitudinal (ligação parcial), pelos coeficientes m-k do fabricante, para lajes sem ancoragem de extremidade. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.156 | Verificação seção crítica III: cortante vertical junto ao apoio. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.157 | Área efetiva da fôrma considerada lisa e uniforme, conforme a ficha validada pelo usuário. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.158 | Momento positivo resistente conforme a linha neutra esteja acima ou dentro da fôrma. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.159 | Limitações: punção sob cargas concentradas e fissuração em zonas de momento negativo não são verificadas. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.160 | Flecha pelo método de Branson, com as armaduras superior e inferior (ou fôrma) conhecidas. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.161 | Na construção, cumpre os limites de flecha aumentando a espessura da fôrma ou escorando; no serviço só verifica a flecha (solução é aumentar a altura total). | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.162 | Tabelas de armadura superior e inferior próprias das lajes mistas, nas opções de barras dos dados gerais. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.163 | Opção: taxas mínimas de armadura superior em lajes mistas. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.164 | Opção: comprimentos mínimos da armadura superior em lajes mistas. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.165 | Opção: coeficientes de flecha (ativa e total a longo prazo) para lajes mistas. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.166 | Opção: limites de flecha para lajes mistas. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.167 | Parâmetro de execução: carga de construção uniforme — 0,150 t/m² em 3 m (ou o vão, se menor) no meio do vão, mais 0,075 t/m² no resto da nervura, somadas ao peso do concreto (com acúmulo por empoçamento). | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.168 | Parâmetros de execução: coeficientes de ponderação 1,35 (permanente) e 1,50 (variável). | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.169 | Parâmetro de execução: coeficiente de resistência da fôrma 1,10 na construção (aplicado mesmo se alterado). | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.170 | Parâmetro de execução: limite absoluto de flecha da fôrma sob peso próprio e concreto fresco. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.171 | Parâmetro de execução: limite relativo de flecha por empoçamento; se excedido (ou o absoluto), recalcula o peso do concreto somando 0,7 × flecha à espessura. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.172 | Opção de dimensionamento na construção: desligada, mantém a fôrma do usuário e calcula o espaçamento do escoramento; ligada, busca fôrma que dispense escoramento e, sem achar, mantém a do usuário e calcula escoramento. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.173 | Opção na fase mista: manter a fôrma e acrescentar armadura inferior se falhar. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.174 | Opção na fase mista: buscar na série fôrma mais espessa; sub-opção de acrescentar armadura se nem a maior servir, senão emite erro. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.175 | Vistas de resultado configuráveis para armaduras superior e inferior e para os rótulos na tela e nos desenhos; inferior por nervura, superior uniforme na largura. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.176 | Erros de laje mista em vermelho, consulta por clique e navegação anterior/seguinte pelos erros dos panos. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.177 | Informação do pano: fabricante, tipo de fôrma, altura total, espaçamento máximo do escoramento, vão de cálculo e flecha na construção, vão total e flecha no serviço (em vermelho se excessiva). | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.178 | Atribuir fôrma a um ou mais panos após o cálculo (igualação manual). | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.179 | Atribuir armadura inferior a uma ou mais nervuras. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.180 | Mover a representação da armadura (inferior ou superior) dentro da mesma faixa, para evitar sobreposição de textos. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.181 | Apagar armadura inferior. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.182 | Modificar armadura superior: espaçamento, diâmetro, comprimento, acrescentar ou remover camadas/grupos; comprimentos retos medidos do eixo da viga mais próxima, com gancho medidos do ponto de dobra. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.183 | Atribuir um tipo de armadura superior a um ou mais panos. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.184 | Lançar armadura superior escolhendo-a numa janela, com comprimentos padrão definíveis, arrastando do ponto inicial ao final. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.185 | Apagar armadura superior. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.186 | Consulta/edição dos dados do pano também na aba de resultados. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| | **7.2.5 Diagramas de esforços** | | | |
| C7.187 | Diagramas de momento, cortante e torção em vigotas, placas alveolares e lajes mistas: envoltórias, por hipótese ou por combinação. | Falta | V | diagramas de esforços em lajes |
| C7.188 | Para hipótese sísmica dinâmica, escolha do modo de vibração. | Fora | — | sismo |
| C7.189 | Consulta clicando nos alinhamentos de vigas, vigotas, alveolares ou lajes mistas. | Falta | V |  |
| | **7.3 Desenhos e relatórios de lajes** | | | |
| C7.190 | Relatórios de lajes mistas: esforços, quantitativo das lajes e quantitativo de armadura. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.191 | Dados das lajes mistas no relatório de dados da obra e quantidades no quantitativo geral. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.192 | Configuração própria dos elementos de laje mista no desenho da planta de formas. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.193 | Relatório de esforços em vigotas: envoltórias de momento, cortante e torção de um alinhamento, com croqui do grupo de pavimentos e da vigota. | Parcial | R | memorial traz momentos das lajes |
| C7.194 | Quantitativo das vigotas: peso e comprimento por metro com perda; nas moldadas no local, armaduras superior, inferior e transversal (cortante em comprimento total ou estribo em ômega). | Parcial | R | quantitativos por taxa; sem quantitativo de vigotas |
| C7.195 | Desenho de panos inclinados na planta: tangente da inclinação junto ao texto de cota e croqui do pavimento com tamanho configurável (só com lajes inclinadas). | Falta | E |  |

## 8. Escadas

| Item | Funcionalidade (palavras próprias) | Situação | Frente | Statikos |
|---|---|---|---|---|
| | **8.1 Generalidades** | | | |
| C8.1 | Módulo que calcula e arma as lajes de escada como elementos isolados da estrutura. | Falta | E |  |
| C8.2 | Reações da escada na estrutura principal, conforme geometria, apoios e cargas gravitacionais, transmitidas como cargas lineares e/ou de superfície, separadas em permanente e variável. | Falta | E |  |
| C8.3 | Escada composta por lances entre pavimentos com patamares; tipologias: lance reto; dois lances com patamar de meia-volta; três lances com patamares de quarto de volta; dois lances com patamar de volta inteira; dois lances consecutivos com patamar intermediário; n lances com patamares de meia-volta; n lances com patamares de quarto de volta. | Falta | E |  |
| C8.4 | Conceitos: escada = conjunto de lances entre pisos de uma circulação vertical; lance = trecho inclinado de degraus contínuos; patamar intermediário = plano horizontal entre dois lances. | Falta | E |  |
| | **8.2 Acesso ao módulo** | | | |
| C8.5 | Menu flutuante de escadas na aba de vigas, com: criar, editar, apagar, mover, girar, ver detalhe de armadura de todos os lances e ver esforços/deslocamentos por isovalores. | Falta | E |  |
| | **8.3.1 Criar escada** | | | |
| C8.6 | Janela de nova escada com duas abas: dados comuns da escada e lances entre pavimentos. | Falta | E |  |
| C8.7 | A escada nova começa no grupo atual, indicado na janela. | Falta | E |  |
| C8.8 | Dados comuns valem para todos os lances; partes com dados diferentes (ex.: outra carga) devem virar escadas separadas. | Falta | E |  |
| C8.9 | Geometria comum: largura da escada (comprimento dos degraus). | Falta | E |  |
| C8.10 | Geometria comum: piso (passo em planta) e espelho (altura do degrau). | Falta | E |  |
| C8.11 | Geometria comum: sentido de giro ao subir (esquerda ou direita). | Falta | E |  |
| C8.12 | Geometria comum: posição do último degrau do lance — formado pelo patamar ou sobre a laje inclinada. | Falta | E |  |
| C8.13 | Cargas comuns: modo de execução dos degraus (concretados com a laje ou em alvenaria), que afeta o peso próprio e o volume de concreto. | Falta | E |  |
| C8.14 | Cargas comuns: peso de corrimãos (total, considerando um ou dois), revestimento e sobrecarga. | Falta | E |  |
| C8.15 | Lances (trechos entre pavimentos) podem ter dados diferentes entre si: espessura, cota inicial, tipologia, número de degraus. | Falta | E |  |
| C8.16 | Escolha do tipo de lance numa lista de tipos predefinidos ou criação de tipo novo. | Falta | E |  |
| C8.17 | Tipos de lance ficam na biblioteca da obra, reutilizáveis em vários lances e escadas; importação/exportação entre obras pelo gerenciador de biblioteca. | Falta | E |  |
| C8.18 | Tipo de lance: referência (nome). | Falta | E |  |
| C8.19 | Tipo de lance: espessura da laje dada pelo usuário ou pré-dimensionada pelo programa como 1/30 do maior vão real entre apoios. | Falta | E |  |
| C8.20 | Tipo de lance: desnível no início do lance (≥ 10 cm), ex.: escada que nasce na fundação e atravessa contrapiso. | Falta | E |  |
| C8.21 | Tipo de lance: número de degraus iniciais construídos sobre o piso; gera reação uniforme de superfície (carga permanente média dos degraus), sem sobrecarga, pois o piso já tem a sua. | Falta | E |  |
| C8.22 | Tipo de lance: tipologia de lances e patamares. | Falta | E |  |
| C8.23 | Tipo de lance: número de degraus de cada trecho, conforme a tipologia. | Falta | E |  |
| C8.24 | Tipo de lance: largura do vão central (poço), só com patamares de meia-volta. | Falta | E |  |
| C8.25 | Tipo de lance: número de degraus construídos sobre o patamar intermediário. | Falta | E |  |
| C8.26 | Patamar intermediário apoiado ou livre; apoio frontal, lateral ou ambos, com tipo e largura. | Falta | E |  |
| C8.27 | Apoio do patamar por tirante pendurado em elemento do piso de cima; a largura serve para somar o peso da alvenaria entre o patamar e o piso superior. | Falta | E |  |
| C8.28 | Apoio do patamar em parede de alvenaria (15,70 kN/m³) ou de concreto (24,53 kN/m³): peso de parede de largura dada e altura entre patamar e piso de baixo, aplicado no elemento sob a borda apoiada. | Falta | E |  |
| C8.29 | Parede entre o patamar e o piso de cima (ou outra divisória) deve ser lançada pelo usuário como carga linear. | Falta | E |  |
| C8.30 | Apoio do patamar por conectores de cisalhamento em viga ou muro, que recebem a reação de extremidade. | Falta | E |  |
| C8.31 | Número de lances iguais consecutivos (pavimentos seguidos com o mesmo tipo de lance). | Falta | E |  |
| C8.32 | Número ilimitado de lances por escada. | Falta | E |  |
| | **8.3.1.3 Inserção na obra** | | | |
| C8.33 | Inserção no pavimento atual: o primeiro lance acompanha o cursor; clique fixa o início, a escada gira em torno dele e o segundo clique define a direção. | Falta | E |  |
| C8.34 | Capturas a gabarito DXF/DWG e modo ortogonal para posicionar. | Falta | E |  |
| C8.35 | Inserção repetida de escadas iguais com referências numeradas em sequência; botão direito encerra. | Falta | E |  |
| C8.36 | Mensagem de erro geométrico na inserção. | Falta | E |  |
| C8.37 | Conferência das escadas na vista 3D do edifício ou do pavimento (forma, interferências). | Falta | E | depende da vista 3D |
| | **8.3.1.4 Ferramentas de apoio** | | | |
| C8.38 | Dados da última escada lançada mantidos enquanto a obra não muda e o programa não fecha. | Falta | E |  |
| C8.39 | Copiar dados de uma escada visível no pavimento atual (inclusive lances) ao criar uma nova, para depois ajustar (ex.: escada simétrica trocando o sentido de giro). | Falta | E |  |
| C8.40 | Lista de tipos de lance com predefinidos e do usuário, escolhível na janela do lance e na de nova escada. | Falta | E |  |
| C8.41 | Duplicar um lance da mesma escada, colocado no topo da lista (fisicamente acima dos demais). | Falta | E |  |
| C8.42 | Copiar tipo de lance com nova referência. | Falta | E |  |
| C8.43 | Editar tipo de lance, bloqueado quando usado em outro lance para evitar alteração involuntária; desbloqueio manual. | Falta | E |  |
| C8.44 | Biblioteca de tipos de lance do usuário: exportar da obra e importar em outras obras. | Falta | E |  |
| | **8.3.2–8.3.5 Editar, apagar, mover, girar** | | | |
| C8.45 | Editar dados de escada existente clicando nela. | Falta | E |  |
| C8.46 | Apagar uma ou várias escadas, por clique ou janela de captura. | Falta | E |  |
| C8.47 | Mover escada por ponto de referência, com capturas a gabarito. | Falta | E |  |
| C8.48 | Girar escada em torno do início do lance no grupo atual, por ponto na tela ou ângulo digitado. | Falta | E |  |
| | **8.4 Resultados, relatórios e desenhos** | | | |
| C8.49 | Ver detalhe de armadura de cada lance numa janela, com seleção do lance; calcula na hora se for a primeira vez ou houve mudança. | Falta | E |  |
| C8.50 | Cálculo isolado por elementos finitos com as hipóteses de peso próprio/permanente e sobrecarga. | Falta | E |  |
| C8.51 | Vista 3D do lance com isovalores de esforços e deslocamentos. | Falta | E |  |
| C8.52 | Escadas calculadas primeiro no cálculo da obra, para aplicar as reações na estrutura. | Falta | E |  |
| C8.53 | Cálculo individual da escada antes do cálculo da obra; aviso para recalcular a obra se a escada mudar de forma que altere as reações. | Falta | E |  |
| C8.54 | Relatório de escadas: dados gerais (materiais, norma), dados comuns (geometria, cargas) e por lance (reações, armaduras, esforços em cada seção). | Falta | E |  |
| C8.55 | Desenho de detalhe de cada escada: cortes longitudinais e transversais, quadro de propriedades por lance (geometria, cargas, materiais) e quadros de aço por escada, por lance e total. | Falta | E |  |
| | **8.5 Configuração** | | | |
| C8.56 | Concreto das escadas igual ao das lajes, dos dados gerais. | Falta | E |  |
| C8.57 | Escolha do aço e gestão das tabelas de armadura das escadas. | Falta | E |  |
| C8.58 | Opção: igualar armaduras superior e inferior pelo maior valor. | Falta | E |  |
| C8.59 | Opção: espaçamentos das armaduras superior e inferior múltiplos entre si. | Falta | E |  |
| C8.60 | Opção: igualar a armadura de todas as seções (longitudinais e transversais) do lance, superior e depois inferior. | Falta | E |  |
| C8.61 | Opção: arranques (esperas) no início. | Falta | E |  |
| C8.62 | Opção: barras de ligação (passadores) no fim da laje. | Falta | E |  |
| C8.63 | Dado: comprimento disponível para ancorar as esperas do primeiro lance em viga chata; se maior que o necessário dobra as barras; prevalece a largura da viga se maior. | Falta | E |  |
| C8.64 | Dado: cobrimento nominal conforme a agressividade do ambiente. | Falta | E |  |
| C8.65 | Dado: profundidade de fundação para ancorar o início do lance quando não há elemento de fundação sob ele. | Falta | E |  |

## 9. Estruturas de aço, madeira e alumínio

| Item | Funcionalidade (palavras próprias) | Situação | Frente | Statikos |
|---|---|---|---|---|
| | **9.1 Estruturas 3D integradas** | | | |
| C9.1 | Estruturas 3D de barras (aço, madeira ou alumínio) com nós de 6 graus de liberdade, definidas e ligadas ao edifício em edição; várias por obra. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.2 | Cada operação do menu mostra os passos a seguir no rodapé da tela, e há ajuda na própria janela. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.3 | Nova estrutura: marcar os pontos de ligação ao edifício, que devem estar em pilares (ou em arranques lançados antes, quando a ligação é em viga ou laje). | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.4 | Ao capturar um pilar, marca vermelha e mensagem com a referência do pilar, os afastamentos X e Y ao centro dele e o desnível em relação ao grupo (padrão 0). | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.5 | Alterar o desnível da ligação ou o grupo de ligação (estrutura ligada a mais de um grupo) antes de fixá-la. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.6 | Validar as ligações e abrir o editor de barras 3D para modelar a estrutura. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.7 | Editar estrutura: destaque em amarelo ao aproximar e abertura no editor 3D. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.8 | Apagar estrutura integrada. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.9 | Mover estrutura integrada para nova posição. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.10 | Copiar para o grupo atual uma estrutura lançada em outro grupo. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.11 | Girar estrutura por ponto de giro e ângulo numérico. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.12 | Girar estrutura graficamente: ponto de giro, ponto de referência e ponto da reta até a nova posição da referência; pontos não precisam ser da estrutura; prévia durante o movimento. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.13 | No giro, cargas horizontais (ex.: vento) giram junto; se a hipótese é exclusiva da estrutura, o usuário define como ela combina com as hipóteses de mesmo tipo (padrão: independentes, não simultâneas). | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.14 | Se a hipótese é compartilhada com outras estruturas ou com o edifício: manter as cargas na hipótese atual (conferir depois) ou levá-las a hipóteses novas criadas automaticamente; em seguida, janela de combinação das hipóteses. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.15 | Alinhar estrutura (translação + rotação) por dois pontos de referência e suas novas posições, com prévia; cargas horizontais tratadas como no giro. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.16 | Acrescentar ligações a uma estrutura já lançada (em pilares ou arranques). | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.17 | Apagar ligações; viram nós da estrutura 3D, a eliminar se desnecessários. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.18 | Mover ligação; deixa um nó na posição original. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.19 | Informação da ligação: cota absoluta e desnível em relação ao grupo. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.20 | Atribuir desnível a várias ligações, inclusive copiando o de outra ligação. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.21 | Lista das estruturas integradas para ver e editar sem procurá-las na planta, com prévia da selecionada. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| | **9.1.2 Editor de barras 3D** | | | |
| C9.22 | Vinculação das barras que chegam às ligações: engastada, articulada ou indefinida. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.23 | Hipóteses de carga definidas só no programa principal (hipóteses adicionais dos dados gerais). | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.24 | Pré-dimensionamento obrigatório antes do cálculo conjunto, para que as inércias não mudem muito e distorçam os esforços. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.25 | Cálculo rápido da estrutura isolada, sem interação com o edifício, para pré-dimensionar. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.26 | Dimensionamento com os esforços atuais (isolados ou do cálculo global) usando todos os perfis da série; consulta das reações nas ligações. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.27 | Fluxo iterativo: pré-dimensionar, calcular o conjunto no programa principal, verificar as barras com os esforços globais e recalcular se as inércias mudarem muito. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.28 | Geração de placas de base nas ligações sobre pilares de concreto ou arranques (de aço ou concreto). | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.29 | Edição de placa de base com dimensionamento automático pelos parâmetros de placas dos dados gerais, propondo solução editável. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| | **9.2 Ligações metálicas** | | | |
| C9.30 | Cálculo e dimensionamento de ligações de perfis I laminados e soldados por várias normas; se a norma da obra não tiver o módulo, copiar a obra e calcular com outra. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.31 | Módulos: ligações soldadas em galpões; aparafusadas em galpões; soldadas em pórticos de edifícios; aparafusadas em pórticos de edifícios; treliças planas de perfis tubulares. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.32 | Nós com tipo de ligação reconhecido são dimensionados durante o cálculo, com desenho de detalhe. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.33 | Perfis I: ligações soldadas e aparafusadas (parafusos comuns ou protendidos). | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.34 | Dimensiona espessura de solda e acrescenta enrijecedores quando necessário. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.35 | Ligações aparafusadas: disposição ótima dos parafusos. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.36 | Treliças planas tubulares: perfis soldados, banzo contínuo no nó intermediário; verificação pela norma escolhida e desenho do preparo das bordas (corte) dos tubos. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.37 | Opção de dimensionar ligações junto com o cálculo geral. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.38 | Consulta de ligações: nós resolvidos em verde, não resolvidos em vermelho, parciais em laranja. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.39 | Ao aproximar de nó resolvido, destaque em azul e janela com os tipos de ligação; clique mostra os desenhos de detalhe. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.40 | Ao aproximar de nó de tipo reconhecido mas não resolvido, janela com o motivo. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.41 | Motivo de não cálculo: perfil engastado na alma de outro (barras na alma devem ser articuladas). | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.42 | Motivo: interferência do perfil que chega à alma com enrijecedores postos para engastar barras do plano ortogonal. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.43 | Motivo: garganta de solda necessária maior que 0,7 da espessura da peça unida. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.44 | Motivo: almas das barras fora do mesmo plano ou não perpendiculares. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.45 | Motivo: ângulo entre as superfícies a soldar menor que 60°. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| | **9.3 Exportação** | | | |
| C9.46 | Exportação da estrutura de aço para programas de detalhamento de terceiros. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.47 | Exportação no formato de intercâmbio CIS/2 (inclusive das estruturas 3D integradas). | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.48 | Exportação só da geometria e perfis (nós e barras), sem precisar calcular nem dimensionar ligações. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.49 | Exportação do detalhamento completo com ligações; exige obra e ligações calculadas. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |
| C9.50 | Ligações aparafusadas e soldadas de perfis I exportáveis para gerar modelo 3D completo no outro programa. | Fora | — | estruturas 3D de aço/madeira/alumínio integradas; ligações metálicas |

## 10. Cargas

| Item | Funcionalidade (palavras próprias) | Situação | Frente | Statikos |
|---|---|---|---|---|
| | **10.1 Ações nos dados gerais** | | | |
| C10.1 | Vento ativável nos dados gerais, com escolha da norma e dados próprios dela; todas pedem larguras de faixa e coeficientes de carga em X e Y. | Feito | — | vento NBR 6123 (V0, S1, S2, S3, Ca em X e Y, coeficiente por sentido, fator de vizinhança, platibanda; N1c) |
| C10.2 | Vento com ou sem efeitos de 2ª ordem. | Parcial | N | γz com ampliação do vento; P-Δ 3D não |
| C10.3 | Norma genérica de vento quando a desejada não existe. | Fora | — | só NBR 6123 |
| C10.4 | Sismo ativável com escolha da norma e dados próprios, e opção de 2ª ordem. | Fora | — | sismo |
| C10.5 | Sismo por norma genérica: análise modal espectral ou coeficientes por pavimento. | Fora | — | sismo |
| C10.6 | Verificação de resistência ao fogo (só pela norma espanhola), com dados dos revestimentos de proteção dos elementos. | Falta | N | fogo pela NBR 15200 |
| C10.7 | Lista de todas as hipóteses da obra com edição e criação de hipóteses adicionais (permanente, variável, vento, sismo, neve). | Feito | — | grupo Casos de carga: G e Q fixos e adicionais G/Q/W/E editáveis (N1c) |
| C10.8 | Hipótese adicional com referência e descrição. | Parcial | N | nome do caso; sem descrição (N1c) |
| C10.9 | Hipótese com várias disposições de carga: compatíveis (atuam sozinhas ou juntas com outras da mesma hipótese). | Feito | — | casos sem grupo são compatíveis e atuam sozinhos ou juntos (N1c) |
| C10.10 | Disposições incompatíveis: nunca combinadas entre si (ex.: vento em direções diferentes). | Feito | — | grupo de incompatíveis por caso adicional; vento em grupo próprio (N1c) |
| C10.11 | Disposições simultâneas: sempre atuam juntas; servem para dividir uma hipótese em grupos de cargas mais fáceis de editar e visualizar. | Feito | — | campo Simultâneo com: recebe o mesmo fator do caso ligado (N1c) |
| C10.12 | Uso das disposições para cargas alternadas e móveis. | Parcial | N | cargas alternadas por casos no mesmo grupo (N1c); sem cargas móveis |
| C10.13 | Com duas ou mais hipóteses adicionais, tabela de compatibilidade entre hipóteses de mesma natureza. | Parcial | N | grupo único entre casos substitui a tabela de compatibilidade (N1c) |
| C10.14 | Estados-limite: controle de execução, categoria de uso e altitude/nível de neve. | Parcial | N | CAA e ψ editáveis |
| C10.15 | Consulta das combinações geradas com os coeficientes de ponderação e de combinação. | Feito | — | quadro Combinações na aba Análise, com fatores por caso e exportação em CSV (N1c) |
| C10.16 | Configuração das combinações por estado-limite e por material: concreto, fundações, aço dobrado a frio, aço laminado, madeira, tensões no terreno e deslocamentos. | Falta | N |  |
| C10.17 | Situações de projeto definidas pelo usuário: criar, apagar, copiar, editar, biblioteca para outras obras e criar a partir das situações da norma. | Falta | N | combinações do usuário (existe no Pórtico, não no edifício) |
| C10.18 | Situação nova: referência e lista de combinações, definidas por coeficientes de segurança ou por coeficientes de segurança e de combinação. | Falta | N |  |
| C10.19 | Importar as situações da norma e ajustá-las, reduzindo erros de digitação. | Falta | N |  |
| C10.20 | Alerta de responsabilidade: situações do usuário não devem resultar em segurança menor que a da norma. | Falta | N |  |
| | **10.2 Cargas por grupo e na fundação** | | | |
| C10.21 | Sobrecarga de uso definida por grupo ao criar grupos, aplicada nos pavimentos, sem atuar nos furos. | Feito | — | sobrecarga por grupo, fora dos furos |
| C10.22 | Cargas no nível da fundação, consideradas só por radiers. | Falta | FU | radier |
| C10.23 | Aviso no cálculo quando há radier e o grupo de fundação não tem carga, com opção de defini-la na hora e seguir o cálculo. | Falta | FU |  |
| | **10.3 Menu de cargas** | | | |
| C10.24 | Carga de superfície em uma laje inteira com um clique (laje destacada em amarelo), com valor e hipótese, podendo copiar de carga existente. | Parcial | L | carga de área por polígono; sem clique na laje |
| C10.25 | Cargas lineares automáticas ao longo do eixo de vigas, uma a uma ou por janela de captura. | Parcial | L | carga linear por pontos; sem “ao longo da viga” |
| | **10.4 Desenhos e relatórios** | | | |
| C10.26 | Desenho de distribuição de cargas especiais com as cargas permanentes e variáveis por grupo; nos demais desenhos as cargas aparecem só se o usuário configurar. | Falta | R | prancha de cargas |

## 11. Fundações

| Item | Funcionalidade (palavras próprias) | Situação | Frente | Statikos |
|---|---|---|---|---|
| | **11.1 Placas de base** | | | |
| C11.1 | Dimensionamento de placas de base para qualquer disposição de pilares de aço e qualquer material. | Fora | — | placas de base (aço) |
| C11.2 | Gerar placas de base em todos os pés de pilares de aço (ou arranques de aço) que não as têm. | Fora | — |  |
| C11.3 | Apagar placa de base. | Fora | — |  |
| C11.4 | Editar placa: dimensionamento automático, verificação e consulta da disposição. | Fora | — |  |
| C11.5 | Igualar placas: copiar as propriedades de uma placa para outras após o cálculo, para reduzir a variedade; a placa copiada é verificada e fica em vermelho se falhar. | Fora | — |  |
| | **11.2 Sapatas e blocos** | | | |
| C11.6 | Número ilimitado de pilares, muros ou pilares-parede apoiados numa sapata ou bloco, em qualquer posição em relação aos eixos dela. | Parcial | FU | um pilar por elemento no módulo Fundações |
| C11.7 | Cálculo como fundação rígida; cabe ao usuário garantir a rigidez. | Feito | — | bloco/sapata rígidos |
| C11.8 | Novo elemento: sapata de concreto armado, sapata de concreto simples ou bloco sobre estacas. | Parcial | FU | sapata armada e bloco sobre estacas; sem sapata de concreto simples |
| C11.9 | Bloco: escolha do tipo (forma e número de estacas) e definição da estaca — descrição, seção circular ou quadrada, capacidade de carga característica e distância entre eixos. | Feito | — | tipos de bloco (1 a 6 estacas), estaca e capacidade (Décourt-Quaresma) |
| C11.10 | Elemento de um pilar: pilar destacado ao aproximar e prévia da posição relativa pilar/sapata conforme o ponto do cursor (centrada, de divisa, de canto etc.); ângulo padrão igual ao do pilar. | Falta | FU | sapata de divisa/canto |
| C11.11 | Elemento de vários pilares (sapata associada): seleção dos pilares/pilares-parede; ponto de inserção na média das coordenadas dos pilares, movível depois; ângulo do primeiro pilar. | Falta | FU | sapata associada |
| C11.12 | Editar: dimensionar automaticamente ou verificar dimensões e armadura impostas pelo usuário. | Parcial | FU | dimensiona automaticamente; impor dimensões só em parte |
| C11.13 | Apagar sapata ou bloco. | Parcial | FU | por apoio no módulo |
| C11.14 | Mover elemento de fundação. | Falta | FU | fundação lançada na planta |
| C11.15 | Girar em torno do centro: por ângulo digitado, por dois pontos (vetor de direção) ou pelo ângulo de um pilar apoiado (com vários, o do primeiro). | Falta | FU |  |
| C11.16 | Unir várias sapatas numa só (não vale para blocos). | Falta | FU |  |
| C11.17 | Igualar sapatas: copiar geometria, tipo e armadura de uma sapata mestre para outras. | Falta | FU |  |
| C11.18 | Informação: materiais (inclusive tensão admissível do solo nas sapatas), geometria, resultados, avisos e erros. | Feito | — | resultados, avisos e memorial de fundações |
| | **11.2.3 Opções avançadas de sapatas (módulo adicional)** | | | |
| C11.19 | Limites poligonais que as sapatas de concreto não podem invadir (divisa, poço de elevador, reservatórios), também úteis para gerar sapatas poligonais irregulares. | Falta | FU |  |
| C11.20 | Limites por polilinhas digitadas ou capturadas de gabarito DXF/DWG; valem só para o grupo onde foram lançados; uma sapata pode ser cortada por vários limites. | Falta | FU |  |
| C11.21 | A sapata é aparada pelo limite, conserva-se a parte com o(s) pilar(es) e o dimensionamento nunca ultrapassa o limite. | Falta | FU |  |
| C11.22 | Edição dos limites: apagar, mover, inserir vértice, eliminar trecho. | Falta | FU |  |
| C11.23 | Restrições do limite: não cortar pilar; cortar o contorno da sapata antes e depois do dimensionamento; não isolar um pilar dos demais numa sapata associada; se violadas, o limite é ignorado. | Falta | FU |  |
| C11.24 | Limites não afetam vigas de equilíbrio/travamento, blocos, sapatas de altura variável nem sapatas corridas; só sapatas de altura constante. | Falta | FU |  |
| C11.25 | Cargas pontuais, lineares e de superfície aplicadas sobre sapatas, blocos e vigas de fundação, consideradas no dimensionamento. | Falta | FU |  |
| C11.26 | Reconhecimento das cargas de apoios de escadas sobre elementos de fundação. | Falta | FU |  |
| C11.27 | Solo sob vigas de equilíbrio/travamento desconsiderado: as vigas resistem às cargas sobre elas e transmitem às sapatas, blocos ou vigas que cruzam. | Falta | FU |  |
| | **11.2.4 Sapatas corridas sob muros** | | | |
| C11.28 | Ao lançar um muro, definição da sua fundação: sem vinculação, engastado ou sobre sapata corrida (aba à esquerda, à direita ou ambas). | Falta | FU |  |
| C11.29 | Sapata corrida dimensionada automaticamente. | Falta | FU |  |
| C11.30 | Sapata corrida excêntrica (aba de um lado) exige vigas de equilíbrio até sapatas internas. | Falta | FU |  |
| C11.31 | Atribuir sapata a muro lançado sem ela, pelo menu de elementos de fundação. | Falta | FU |  |
| | **11.2.5 Opções de fundação (dados gerais)** | | | |
| C11.32 | Redução da taxa mecânica mínima de flexão quando a norma permite; sempre aplicada na verificação. | Falta | FU |  |
| C11.33 | Permitir ou não levantamento (descolamento) da sapata; sem permissão, a resultante deve cair no núcleo central. | Parcial | FU | área comprimida ≥ 2/3 [a confirmar] |
| C11.34 | Não colocar malha superior se a sapata passar como concreto simples (malha só se falhar à flexão com resistência à tração do concreto). | Falta | FU |  |
| C11.35 | Tipo de equilíbrio sob sapata com viga de equilíbrio: distribuição retangular (equilíbrio perfeito) ou trapezoidal (giro da sapata, momento na viga ~10 % menor). | Falta | FU |  |
| C11.36 | Relação máxima entre o maior vão entre pilares da sapata e a altura, para considerá-la rígida. | Parcial | FU | h0 e rigidez [a confirmar] |
| C11.37 | Relação máxima entre o maior balanço e a altura. | Falta | FU |  |
| | **11.3 Vigas de equilíbrio e de travamento** | | | |
| C11.38 | Viga de travamento e sapata corrida sem flexão rígida; viga de equilíbrio com flexão, absorvendo o momento da excentricidade entre pilar e eixo da sapata. | Falta | FU |  |
| C11.39 | Vigas não consideradas apoiadas no solo. | Falta | FU |  |
| C11.40 | Equilíbrio atribuível a uma ou às duas extremidades (ex.: equilibra só a ponta da sapata excêntrica, a outra funciona como travamento). | Falta | FU |  |
| C11.41 | Nova viga: de travamento, de equilíbrio (qualquer tipo de sapata) ou com equilíbrio automático nas pontas que chegam a sapatas excêntricas (divisa, canto). | Falta | FU |  |
| C11.42 | Edição pós-cálculo da viga; sapata pode ser dimensionada antes e a viga depois. | Falta | FU |  |
| C11.43 | Edição: trocar o tipo de viga numa lista do mesmo tipo. | Falta | FU |  |
| C11.44 | Edição: prolongar os estribos da viga de equilíbrio dentro da fundação até as esperas do pilar. | Falta | FU |  |
| C11.45 | Edição: alterar comprimentos de ancoragem. | Falta | FU |  |
| C11.46 | Edição: verificar a viga atual e listar as verificações feitas. | Falta | FU |  |
| C11.47 | Edição: dimensionar a viga pela norma, listando as verificações. | Falta | FU |  |
| C11.48 | Edição: detalhe com cortes transversal e longitudinal, armadura e dimensões. | Falta | FU |  |
| C11.49 | Edição: vista 3D da viga. | Falta | FU |  |
| C11.50 | Apagar viga. | Falta | FU |  |
| C11.51 | Ativar/desativar o equilíbrio em cada extremidade, indicado por seta curva. | Falta | FU |  |
| C11.52 | Igualar vigas: copiar o tipo de uma viga de equilíbrio ou travamento para outras; se a seção copiada for insuficiente, a viga fica em vermelho; ancoragens redimensionadas; a mestre não muda. | Falta | FU |  |
| C11.53 | Módulo avançado: cargas sobre vigas de fundação (como C11.25) e cruzamento de vigas de equilíbrio e travamento. | Falta | FU |  |
| | **11.4 Geração automática** | | | |
| C11.54 | Geração automática de sapatas e vigas segundo parâmetros dados numa janela. | Falta | FU |  |
| C11.55 | Balanço nulo numa direção quando há pilar em frente só de um lado. | Falta | FU |  |
| C11.56 | Pilares "em frente": eixo desalinhado do pilar gerador menos que a distância de visão D e dentro do ângulo de visão A. | Falta | FU |  |
| C11.57 | Distância máxima entre eixos de pilares para criar sapata associada: padrão 1 m, máximo 3 m. | Falta | FU |  |
| C11.58 | Elementos gerados editáveis depois. | Falta | FU |  |
| | **11.5 Cálculo e resultados** | | | |
| C11.59 | Cálculo e dimensionamento de sapatas, sapatas corridas, blocos, placas de base e vigas de fundação. | Parcial | FU | sapatas, blocos, tubulões; sem vigas de fundação e placas |
| C11.60 | Aviso de erros/avisos ao fim do cálculo, a consultar depois. | Feito | — |  |
| C11.61 | Vários níveis de fundação; escolha dos grupos cuja fundação será calculada. | Falta | FU |  |
| C11.62 | Três modos de dimensionamento (descritos na ajuda do programa). | Falta | FU |  |
| C11.63 | Exige o cálculo completo da estrutura para ter os esforços nas bases dos pilares. | Feito | — | cargas importadas do edifício |
| C11.64 | Elementos com erro em vermelho e mensagem por clique. | Falta | FU |  |
| C11.65 | Aviso de sapatas sobrepostas e opção de eliminar sobreposições, que reorganiza e cria sapata associada sob os pilares. | Falta | FU |  |
| | **11.6 Relatórios e desenhos** | | | |
| C11.66 | Relatório de fundação: dados de sapatas, blocos, vigas e placas de base com dimensões e verificações. | Feito | — | memorial de fundações |
| C11.67 | Planta de locação da fundação: elementos, arranques de pilares, armaduras e dimensões, e quadros de sapatas e de vigas de fundação. | Falta | FU |  |
| C11.68 | Planta de armaduras da fundação: detalhes de sapatas, blocos e placas de base. | Parcial | FU | detalhes de bloco, sapata e tubulão (SVG); sem planta de armaduras |
| C11.69 | Configuração do desenho com duas partes: locação (elementos e arranques) e detalhes/quadros de armadura. | Falta | FU |  |
| C11.70 | Na locação aparecem sapatas, blocos, estacas e quadros de estacas. | Falta | FU |  |

## 12. Isovalores e deformada

| Item | Funcionalidade (palavras próprias) | Situação | Frente | Statikos |
|---|---|---|---|---|
| | **12.1 Mapas de isovalores** | | | |
| C12.1 | Aba própria de isovalores: esforços e deslocamentos em cores com escala de valores, e opção de isolinhas. | Falta | V |  |
| C12.2 | Legenda de cores no rodapé com os valores e os extremos máximo e mínimo. | Falta | V |  |
| C12.3 | Isolinhas como curvas de nível: lugar dos pontos com o mesmo valor. | Falta | V |  |
| C12.4 | Mapas e isolinhas anexáveis a desenhos e imprimíveis. | Falta | V |  |
| C12.5 | Painel para ligar/desligar isolinhas e valores e escolher hipótese/combinação e grandeza. | Falta | V |  |
| C12.6 | Mapas por pavimento para lajes nervuradas, maciças e cogumelo: deslocamentos, esforços e áreas de aço. | Falta | V |  |
| C12.7 | Deslocamentos por hipótese ou combinação: vertical z (mm, negativo para baixo), giro em x e giro em y da malha. | Falta | V |  |
| C12.8 | Esforços por hipótese ou combinação: cortante total (√(Qx² + Qy²)), cortante X, cortante Y, momento X, momento Y e momento XY (torção). | Falta | V |  |
| C12.9 | Esforços de cálculo (envoltória mais desfavorável para armar): cortante total, X e Y; momentos X e Y para armadura inferior e para armadura superior. | Falta | V |  |
| C12.10 | Áreas de aço necessárias para o esforço de cálculo: superior ou inferior, em X ou Y. | Falta | V |  |
| C12.11 | Radier: tensão máxima no terreno, levantamento (mm) e tensão por hipótese/combinação. | Falta | V |  |
| C12.12 | Limites de valor máximo e/ou mínimo para restringir a faixa exibida (a ordem das cores se mantém); um limite só localiza o ponto extremo. | Falta | V |  |
| C12.13 | Usos: ver onde a armadura base não basta, onde cabe certo diâmetro, e onde a tensão no solo passa da admissível (dando-a como mínimo). | Falta | V |  |
| C12.14 | Menu de esforços em vigas, vigotas, alveolares e lajes mistas por hipótese, combinação ou envoltória. | Falta | V |  |
| C12.15 | Menu de lajes maciças/nervuradas igual ao da aba de resultados, com vista e edição da armadura. | Falta | V |  |
| C12.16 | Flecha entre dois pontos: secante ou tangente num ponto, com máxima relativa, máxima absoluta ou entre os dois pontos; por hipótese simples, combinação, combinação mais desfavorável e fator de amplificação (também acessível pelas envoltórias). | Falta | V |  |
| C12.17 | Várias janelas simultâneas de isovalores/envoltórias (ex.: permanente e variável lado a lado, ou pavimentos diferentes); configuração mantida até fechar o programa. | Falta | V |  |
| | **12.2 Deformada** | | | |
| C12.18 | Aba de deformada 3D após o cálculo, por hipótese simples ou combinação. | Falta | V |  |
| C12.19 | Opções: escolher hipótese/combinação, fator de escala, estrutura completa ou simplificada, mostrar lajes nervuradas/cogumelo e animação. | Falta | V |  |
| C12.20 | Animação da deformada para identificar comportamento anômalo. | Falta | V |  |
| C12.21 | Elementos deformados coloridos pelo deslocamento resultante (vetor de Δx, Δy, Δz), com legenda no rodapé. | Falta | V |  |
| C12.22 | Várias janelas de deformada simultâneas para comparar hipóteses/combinações. | Falta | V |  |

## 13. Tabelas e bibliotecas

| Item | Funcionalidade (palavras próprias) | Situação | Frente | Statikos |
|---|---|---|---|---|
| | **13.1 Tabelas de armadura** | | | |
| C13.1 | Tabelas de armadura predefinidas para todos os elementos de concreto, todas editáveis, e criação de tabelas novas independentes. | Falta | R | tabelas de armadura editáveis |
| C13.2 | Gestão das tabelas na janela de tipos de aço por posição, acessível nos dados gerais. | Falta | R |  |
| C13.3 | No cálculo, a armadura é escolhida na tabela; sem solução, aviso para revisar a tabela. | Parcial | R | bitolas fixas na busca |
| C13.4 | Recomendação de conferir a coerência de tabelas criadas ou alteradas. | Fora | — |  |
| C13.5 | Restaurar as tabelas originais, perguntando quais alteradas salvar; tabelas acrescentadas pelo usuário são mantidas. | Falta | R |  |
| | **13.2 Biblioteca de perfis** | | | |
| C13.6 | Bibliotecas de perfis predefinidas de fabricantes, com dimensões e propriedades prontas. | Fora | — | biblioteca de perfis (aço); o Pórtico tem perfis W/HP |
| C13.7 | Perfil individual editável: todas as dimensões e propriedades alteráveis. | Fora | — | biblioteca de perfis (aço); o Pórtico tem perfis W/HP |
| C13.8 | Para usar perfis de uma biblioteca, importá-la para a biblioteca da obra. | Fora | — | biblioteca de perfis (aço); o Pórtico tem perfis W/HP |
| C13.9 | Biblioteca padrão exibida e importação de outras bibliotecas. | Fora | — | biblioteca de perfis (aço); o Pórtico tem perfis W/HP |
| C13.10 | Edição da biblioteca da obra: acrescentar, copiar, editar e apagar perfis. | Fora | — | biblioteca de perfis (aço); o Pórtico tem perfis W/HP |
| C13.11 | Criar biblioteca nova diretamente (importando perfis) ou exportando perfis da obra. | Fora | — | biblioteca de perfis (aço); o Pórtico tem perfis W/HP |
