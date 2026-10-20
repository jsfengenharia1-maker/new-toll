# Checklist de paridade com o manual do usuário do CYPECAD

Comparação item a item entre as funcionalidades descritas no manual do usuário do CYPECAD (edição em inglês, set/2010, ~141 págs.) e o Statikos em 20/10/2026. Descrições com palavras próprias (reconstrução limpa: nada de texto, nomes de comando ou telas copiados). Paridade é de funcionalidade, nunca de implementação.

**Cobertura da leitura: capítulos 0 a 6 e a seção 7.1 (≈ págs. 1–80). O restante (7.2 em diante: resultados e desenhos de lajes, escadas, estruturas 3D e ligações, cargas/vento/sismo/fogo, fundações, isovalores, tabelas e bibliotecas) está listado no fim como pendente de leitura.**

Situação: **Feito** (existe e funciona), **Parcial** (existe com menos opções), **Falta**, **Fora** (fora do escopo decidido: normas estrangeiras, aço/mistas no edifício, sismo, serviços em nuvem, ou recomendação ao usuário sem função no programa).

## Resumo

| Capítulo | Itens | Feito | Parcial | Falta | Fora |
|---|---|---|---|---|---|
| 0. Apresentação do programa (pág. 9) | 4 | 0 | 3 | 0 | 1 |
| 1. Introdução ao programa: tela, ajuda, criação de obra e arquivos (págs. 11–22) | 56 | 13 | 15 | 18 | 10 |
| 2. Gabaritos DXF/DWG (págs. 23–25) | 22 | 5 | 9 | 5 | 3 |
| 3. Grupos e pavimentos (págs. 26–31) | 41 | 14 | 7 | 17 | 3 |
| 4. Pilares (págs. 32–41) | 63 | 8 | 17 | 31 | 7 |
| 5. Muros e paredes estruturais (págs. 42–46) | 30 | 0 | 0 | 26 | 4 |
| 6. Vigas (págs. 47–62) | 108 | 9 | 8 | 66 | 25 |
| 7. Lajes (págs. 63–80; leitura parcial até o início do 7.2.1.1) | 87 | 4 | 14 | 62 | 7 |
| **Total** | **411** | **53** | **73** | **225** | **60** |

## 0. Apresentação do programa (pág. 9)

| Item | Funcionalidade (palavras próprias) | Situação | Statikos |
|---|---|---|---|
| C0.1 | Programa para edifícios de concreto armado e aço que reúne análise espacial, dimensionamento dos elementos, edição de armaduras e seções e desenhos de execução. | Parcial | análise espacial, dimensionamento e pranchas de formas; sem desenhos de armadura nem aço no edifício |
| C0.2 | Análise tridimensional da estrutura completa (elementos verticais e lajes), incluindo as fundações. | Parcial | grelha por pavimento + pórtico espacial (não é um modelo único); fundação em módulo à parte |
| C0.3 | Dimensionamento automático dos elementos de concreto armado e de aço. | Parcial | concreto armado sim (NBR 6118); aço só no módulo Pórtico |
| C0.4 | Normas de vários países à escolha do usuário. | Fora | só normas brasileiras, por decisão de escopo |

## 1. Introdução ao programa: tela, ajuda, criação de obra e arquivos (págs. 11–22)

| Item | Funcionalidade (palavras próprias) | Situação | Statikos |
|---|---|---|---|
| | **1.1 Tela de trabalho** | | |
| C1.1 | Interface organizada em abas por etapa: lançamento de pilares, lançamento de vigas/lajes, resultados, mapas de isovalores e deformada. | Feito | abas Planta, Elevação, Verificação, Análise, Dimensionamento, Pranchas, Premissas |
| C1.2 | Menus principais no topo de cada aba e, como alternativa, uma barra de opções que se ativa e dá acesso aos mesmos menus. | Feito | barra lateral com grupos + linha de comando |
| C1.3 | Primeira barra de ferramentas, comum a todas as abas, com opções de visualização e de gabarito. | Feito | barra da planta (vista, capturas, eixos, cotas, grade, unidades) |
| C1.4 | Desfazer e refazer a última alteração nas abas de pilares, de vigas e de resultados. | Feito | desfazer/refazer por comando (200 passos) |
| C1.5 | Segunda barra de ferramentas com atalhos para opções dos menus. | Feito | barra de ferramentas da planta com atalhos de teclado |
| C1.6 | Barra de atalhos configurável: o usuário põe e tira botões. | Falta | barra configurável pelo usuário |
| C1.7 | Cor de fundo da área de desenho à escolha entre branco, cinza e preto, para contraste com os elementos. | Feito | temas escuro, claro e preto e branco |
| | **1.2 Ajuda na tela** | | |
| C1.8 | Ajuda contextual por tecla de função (F1): destaca os itens que têm ajuda e mostra a explicação do item clicado, inclusive de itens dentro de menus. | Falta | ajuda contextual (F1) por item |
| C1.9 | Botão de ajuda na barra de título que liga o mesmo modo de ajuda, válido também para os ícones das barras. | Falta | modo de ajuda |
| C1.10 | O modo de ajuda se desliga com o botão direito, com um novo clique no botão ou com Esc. | Falta |  |
| C1.11 | As janelas de diálogo têm botão de ajuda próprio na barra de título. | Parcial | dicas fixas nos painéis |
| C1.12 | Botão de informação geral sobre o conteúdo da janela, presente em várias janelas. | Parcial | dicas e aba Premissas |
| C1.13 | Guia rápido que reúne as ajudas das opções das abas, para consultar e imprimir. As ajudas dos diálogos não entram no guia. | Parcial | README e docs/ia.md; sem guia rápido imprimível na interface |
| | **1.3 Criação de obra** | | |
| C1.14 | Obra nova com pasta, nome e descrição. | Parcial | nome e cidade da obra; sem descrição longa |
| C1.15 | Escolha do modo de criação: obra vazia (lançamento manual), lançamento automático por DXF/DWG, lançamento automático por IFC ou exemplo de lançamento automático. Os modos automáticos dependem de licença. | Parcial | novo padrão ou vazio; sem lançamento automático por DXF/IFC |
| C1.16 | Assistente passo a passo no lançamento automático, que pede pavimentos, alturas e cargas. | Falta | assistente de nova obra (pavimentos, alturas, cargas) |
| C1.17 | O lançamento automático gera o contorno do edifício e os elementos de apoio. | Falta | lançamento automático |
| C1.18 | Lançamento por DXF/DWG: carrega um ou vários arquivos como gabarito. | Falta | lançamento automático por DXF |
| C1.19 | No assistente DXF/DWG, troca das cores das camadas e escolha das camadas visíveis. | Parcial | cores/visibilidade de camadas existem na máscara, não em assistente |
| C1.20 | No assistente DXF/DWG, associação de cada arquivo a grupos de pavimentos. | Parcial | uma máscara por grupo |
| C1.21 | No assistente DXF/DWG, escolha das camadas que definem a geometria de cada tipo de elemento. | Falta | camada → tipo de elemento (pilar, contorno, abertura) |
| C1.22 | Lançamento por IFC: importa o arquivo e depois pede os dados do edifício e dos pavimentos. | Falta | IFC |
| C1.23 | No lançamento por IFC, os materiais do arquivo são ligados a tipos de elemento estrutural, com propriedades atribuídas a cada seleção. | Falta | IFC |
| C1.24 | Ao fim do lançamento automático, a obra é gerada e abre a janela de dados gerais (normas e propriedades da obra). | Falta |  |
| C1.25 | Depois do lançamento automático, todos os dados ficam editáveis. Lajes, cargas adicionais, fundações e dados particulares são completados à mão. | Fora | depende do lançamento automático |
| C1.26 | Roteiro recomendado, passo 1: dados gerais (nome, descrição, materiais e opções, nível de controle de execução). | Feito | obra + norma (fck, aço, CAA, cobrimentos, ψ) |
| C1.27 | Passo 2: pavimentos (níveis, grupos, alturas, cargas variáveis e permanentes). | Feito | pavimentos, grupos, uso, cargas |
| C1.28 | Passo 3: pilares e pilares-parede (geometria e posição). | Parcial | pilares sim; pilar-parede só aviso |
| C1.29 | Passo 4: muros e paredes de apoio. | Falta | muros e paredes estruturais |
| C1.30 | Passo 5: vigas. | Feito | vigas |
| C1.31 | Passo 6: lajes. | Feito | lajes |
| C1.32 | Passo 7: cargas especiais, como as de paredes divisórias. As cargas gerais vêm dos pavimentos, e o peso próprio de pilares, muros, vigas e lajes é gerado automaticamente. | Feito | cargas especiais, alvenaria da máscara; peso próprio automático |
| C1.33 | Passo 8: escadas. | Falta | escadas |
| C1.34 | Passo 9: estruturas 3D integradas, definidas no módulo de barras metálicas 3D. | Falta | estruturas 3D integradas |
| C1.35 | Passo 10: fundações (sapatas, vigas de equilíbrio e de travamento). O radier é lançado como laje no nível da fundação. | Parcial | fundações no módulo Fundações (cargas importadas do edifício); sem vigas de equilíbrio, radier |
| C1.36 | Passo 11: cálculo da estrutura. | Feito | Calcular (worker) |
| C1.37 | Passo 12: conferir os erros e corrigir as dimensões, recalculando até não restar erro que peça mudança de dimensão. A cada ciclo o peso próprio é reajustado. | Parcial | status por elemento e revisão manual; peso próprio recalculado a cada cálculo |
| C1.38 | Passo 13: preparar os resultados antes dos desenhos (editar ou uniformizar armaduras de lajes, modificar armaduras e agrupar pilares, reposicionar textos). | Falta | edição/uniformização de armaduras antes dos desenhos |
| C1.39 | Passo 14: desenhos e relatórios, pelo comando de impressão ou pelos ícones de configuração. | Parcial | memorial e pranchas de formas; sem desenhos de armadura |
| | **1.3.3 Gestão de arquivos** | | |
| C1.40 | Lista das 6 últimas obras abertas e lista completa, em ordem cronológica, das obras abertas naquela versão. | Parcial | trabalho no navegador e arquivo .statikos; sem lista de obras recentes no edifício |
| C1.41 | Importação de arquivo texto ASCII, em colunas ou separado por vírgulas (planilhas ou outros programas), para gerar fundações. | Falta | importar cargas de fundação por texto/CSV |
| C1.42 | A importação ASCII traz as hipóteses de carga, os esforços nos arranques por hipótese simples e as dimensões da base dos pilares. | Falta |  |
| C1.43 | Fluxo da importação ASCII: nome da obra a criar, escolha do arquivo e depois cálculo. | Falta |  |
| C1.44 | Obras de exemplo acessíveis pelo gerenciador de arquivos. | Parcial | edifício padrão; sem obras de exemplo completas |
| C1.45 | Busca de obras na pasta por palavra no nome ou na descrição. | Parcial | busca na biblioteca do Pórtico; edifício não vai à biblioteca |
| C1.46 | Compactação de todos os arquivos da obra num único arquivo de formato próprio. | Feito | arquivo único .statikos com modelo, log e histórico |
| C1.47 | Envio da obra compactada por e-mail ou só gravação do compactado numa pasta. | Fora | e-mail fora do app (arquivo único) |
| C1.48 | Opção de incluir no compactado as cópias de segurança de versões anteriores e os arquivos associados (resultados do último cálculo). | Parcial | log de comandos no arquivo; sem cópias de versões |
| C1.49 | Descompactação da obra compactada. | Fora | não há compactação |
| C1.50 | Compartilhamento da obra compactada: publica num servidor com link privado, com título e comentário. | Fora | sem servidor (decisão: sem login); artifact do claude.ai pode compartilhar |
| C1.51 | Janela com o link para copiar e para abrir a página publicada. | Fora |  |
| C1.52 | Arquivo de texto local com os links de todas as obras publicadas. | Fora |  |
| C1.53 | Captura da tela do programa por tecla (F12) para publicar na internet com link privado. | Fora | captura de tela publicada |
| C1.54 | Na captura, nome, comentário e recorte de parte da imagem por janela de seleção. | Fora |  |
| C1.55 | A captura publicada gera dois formatos de endereço, para fóruns, e um link de acesso direto. | Fora |  |
| C1.56 | Arquivo de texto local com os links das capturas publicadas. | Fora |  |

## 2. Gabaritos DXF/DWG (págs. 23–25)

| Item | Funcionalidade (palavras próprias) | Situação | Statikos |
|---|---|---|---|
| C2.1 | Recomendação de preparo: pilares, vigas de contorno e vigas de borda de abertura em camadas distintas. | Fora | recomendação de preparo do DXF (vale para o usuário) |
| C2.2 | Recomendação: contorno externo e bordas de aberturas desenhados como polígonos fechados. | Fora |  |
| C2.3 | Ponto fixo dos pilares marcado numa camada própria, por polígono fechado que contém o ponto a usar como fixo. | Falta | ponto fixo por camada no lançamento automático |
| C2.4 | Recomendação: gabaritos ou camadas diferentes para cada grupo quando o desenho da obra é completo (térreo, tipo, cobertura...). | Fora |  |
| C2.5 | Gerenciador de vistas de gabarito acessível pela barra principal. | Parcial | grupo Máscara por grupo de pavimentos |
| C2.6 | Anexação de gabaritos DXF/DWG à obra, com lista dos importados. | Parcial | DXF importado por grupo; DWG não |
| C2.7 | Gerenciador de camadas por gabarito: ligar/desligar, renomear, mudar cor. | Parcial | ligar/desligar e cor; sem renomear |
| C2.8 | Espessura de linha por camada, com valor digitado quando a espessura vem do tamanho. | Falta | espessura de linha por camada da máscara |
| C2.9 | Mostrar ou ocultar os textos de cada camada. | Parcial | textos da máscara aparecem; sem ligar/desligar só os textos |
| C2.10 | Permitir ou não capturas (snap) nas entidades de cada camada. | Feito | camada capturável |
| C2.11 | Pré-visualização do resultado da configuração de camadas ao lado da lista. | Falta | prévia da configuração de camadas |
| C2.12 | Conceito de vista: conjunto de camadas, escala e origem de um desenho. Em geral uma vista por grupo, cada uma ligada a um gabarito com seleção própria de camadas. | Parcial | máscara por grupo com camadas e transformação; uma por grupo |
| C2.13 | Operações sobre vistas: adicionar, apagar, copiar, deslocar, transformar, associar a grupos, abrir e salvar configuração. | Parcial | importar, alinhar, editar, remover; sem copiar vista nem salvar configuração |
| C2.14 | Transformação do gabarito (deslocamento e escala) por valores digitados ou graficamente. | Feito | escala, origem e rotação numéricas e por 2 pontos |
| C2.15 | Mudança gráfica da origem de coordenadas do gabarito. | Feito | alinhar por pontos |
| C2.16 | Retorno à origem original do desenho, desfazendo todas as mudanças de origem. | Parcial | editar volta valores; sem botão “origem original” |
| C2.17 | Ajuste de escala desconhecida: marcar os dois pontos de um segmento e informar sua medida real. | Feito | escala por segmento de medida conhecida |
| C2.18 | Escolha dos grupos em que cada vista aparece. | Parcial | uma máscara ligada a um grupo |
| C2.19 | Janela rápida para ligar/desligar vistas por pavimento. | Falta | janela rápida de vistas por pavimento |
| C2.20 | Janela de seleção dos modos de captura de objetos (snap) do DXF/DWG. | Feito | tipos de captura |
| C2.21 | Tecla de função (F3) liga/desliga as capturas. Se nenhum modo estiver escolhido, abre a janela de seleção. | Parcial | liga/desliga capturas (botão); tecla própria a conferir |
| C2.22 | Nas pranchas, opção de desenhar o gabarito DXF/DWG associado a cada pavimento. | Falta | máscara nas pranchas |

## 3. Grupos e pavimentos (págs. 26–31)

| Item | Funcionalidade (palavras próprias) | Situação | Statikos |
|---|---|---|---|
| C3.1 | Até 5 pavimentos por grupo. | Fora | sem limite de pavimentos por grupo (escolha) |
| C3.2 | Grupo: conjunto de pavimentos iguais e consecutivos, com a mesma armadura. | Feito | grupo = pavimentos iguais |
| C3.3 | Num grupo, os dados são lançados uma vez para todos os pavimentos. | Feito |  |
| C3.4 | Os resultados na tela são a envoltória dos pavimentos do grupo. | Falta | envoltória dos pavimentos do grupo nos resultados (hoje lajes saem por pavimento; vigas pela envoltória do grupo) |
| C3.5 | O dimensionamento é único para todos os pavimentos do grupo. | Parcial | vigas por grupo; pilares por lance |
| C3.6 | Desenho único por grupo (uma planta de formas, um desenho de vigas etc.). | Feito | uma prancha de formas por grupo |
| C3.7 | Regra: só é preciso separar grupos onde um elemento vertical (pilar, pilar-parede, muro) ou viga inclinada nasce ou morre. | Parcial | verificação avisa pilar que nasce/morre |
| C3.8 | Sem pavimentos, só existe a criação. Depois aparecem apagar pavimentos, editar pavimentos, editar grupos, unir grupos e dividir grupos. | Feito | pavimento criar/editar/remover/repetir; grupo criar/editar/remover/desvincular |
| C3.9 | Novos pavimentos criados agrupados ou isolados. | Feito |  |
| C3.10 | Dados dos novos pavimentos: quantidade, alturas, carga variável, carga permanente (revestimento etc.) e nome de cada pavimento. | Feito | cota, nome, grupo; cargas por grupo |
| C3.11 | Categoria de uso do grupo escolhida entre as já definidas. Sem categorias definidas, fica a padrão e pode ser trocada depois. | Feito | uso NBR 6120 por grupo |
| C3.12 | As categorias de uso disponíveis dependem da norma (ex.: no Eurocódigo, residencial, escritórios, reunião, comércio, depósitos, veículos ≤ 30 kN, veículos de 30 a 160 kN e coberturas). | Parcial | usos da NBR 6120 (6 categorias) |
| C3.13 | Categoria de uso: conjunto de hipóteses variáveis (automáticas ou adicionais) que se combinam com as demais usando os mesmos coeficientes. | Falta | categoria de uso como hipótese própria nas combinações (hoje uma carga Q só) |
| C3.14 | Combinação correta das variáveis quando há categorias diferentes por pavimento. | Falta |  |
| C3.15 | As categorias da obra são escolhidas nos dados gerais, junto das hipóteses adicionais. | Falta | hipóteses de carga adicionais |
| C3.16 | A categoria é atribuída a cada grupo na edição de grupos, pelo menu de cargas ou pelo de pavimentos. | Feito |  |
| C3.17 | As categorias podem ser definidas antes ou depois dos grupos. No lançamento automático, sempre depois. | Feito |  |
| C3.18 | Várias categorias no mesmo grupo: sem carga variável geral, com cargas lançadas em posições diferentes, cada uma ligada à sua hipótese e categoria. | Falta | várias categorias no mesmo grupo |
| C3.19 | Aviso: cada categoria a mais aumenta o número de combinações e o tempo de cálculo. | Fora |  |
| C3.20 | Cota do plano de fundação definida na edição de pavimentos, com reajuste automático das cotas de todos os pavimentos. | Feito | profundidade da fundação |
| C3.21 | Renomear pavimentos na edição de pavimentos. | Feito |  |
| C3.22 | Unir pavimentos num grupo, selecionando-os. | Parcial | mudar o grupo do pavimento; sem “unir grupos” em lote |
| C3.23 | Editar grupos (nome, cargas, categoria de uso), com destaque no esquema dos pavimentos selecionados. | Feito | grupo.editar |
| C3.24 | Dividir um grupo, separando seus pavimentos. | Feito | grupo.desvincular |
| C3.25 | Copiar para o grupo atual o conteúdo de outro grupo escolhido no esquema, com origem e destino em cores diferentes. | Parcial | viga.copiarParaGrupos (só vigas) |
| C3.26 | Recarregar o grupo da última gravação, perdendo as alterações posteriores, com confirmação. | Fora | desfazer cobre isso |
| C3.27 | Informação de áreas do grupo: total (inclui a área de pilares e muros), vigas e lajes. | Parcial | área de lajes e quantitativos; sem quadro de áreas do grupo |
| C3.28 | Consulta das cotas relativas e absolutas de cada pavimento. | Feito | cotas e pé-direito |
| C3.29 | Mudar posição e representação das referências (textos) dos elementos com dois cliques (texto e novo local). | Falta | mover textos de referência na planta |
| C3.30 | Ligar/desligar de forma permanente as referências na planta, escolhendo os tipos de texto visíveis. | Parcial | camadas de exibição na planta; sem escolher tipos de texto |
| C3.31 | Corte vertical do edifício por linha traçada, visto na tela e nas pranchas. | Falta | cortes verticais do edifício |
| C3.32 | Cortes do edifício sem limite de número, cada um com nome. Editar e apagar. | Falta |  |
| C3.33 | Cortes do edifício ativáveis na prancha de cada planta, com tamanho configurável. | Falta |  |
| C3.34 | Linhas de seção em qualquer direção no pavimento, com diagrama da seção. A janela da seção abre automaticamente. | Falta | linhas de seção no pavimento |
| C3.35 | Vista 3D do grupo atual ou de um intervalo de grupos/pavimentos. | Falta | vista 3D |
| C3.36 | Vista 3D do edifício completo, incluindo as estruturas 3D integradas. | Falta |  |
| C3.37 | Vista 3D com cor e textura por tipo de elemento (pilares, vigas, lajes etc.). | Falta |  |
| C3.38 | Rotação da vista 3D por barras: em torno de z e em torno de x. | Falta |  |
| C3.39 | Alternância entre projeção cônica (perspectiva) e isométrica. | Falta |  |
| C3.40 | Na perspectiva, navegação livre por dentro da estrutura. | Falta |  |
| C3.41 | Lajes e paredes com transparência na vista 3D, para mostrar os elementos ocultos. | Falta |  |

## 4. Pilares (págs. 32–41)

| Item | Funcionalidade (palavras próprias) | Situação | Statikos |
|---|---|---|---|
| | **4.1 Lançamento** | | |
| C4.1 | Lançamento de pilares, pilares-parede e arranques. | Parcial | pilares sim; pilar-parede só aviso; arranque não |
| C4.2 | Sem pavimentos definidos, só arranques podem ser lançados. | Falta | arranques sem pavimentos |
| C4.3 | Depois do lançamento: editar, mover, ajustar, mudar ponto fixo e ângulo, coeficientes de engastamento, comprimentos de flambagem e cargas. | Parcial | editar, mover, ponto fixo, ângulo; sem coeficientes de engastamento/flambagem nem cargas no pilar |
| C4.4 | Arranque: pilar de altura zero para dimensionar a fundação (sapatas, radier etc.) sem lançar a estrutura nem os grupos. | Parcial | módulo Fundações aceita cargas diretas por apoio |
| C4.5 | Cargas no topo do arranque, que representam as cargas transmitidas à fundação. | Parcial | carga pontual no pavimento; sem carga no topo do pilar |
| C4.6 | Dois comandos de cálculo: a obra sem fundação e a obra com fundação. | Parcial | cálculo do edifício + módulo Fundações separado |
| C4.7 | Pilar novo: grupo inicial e grupo final. | Feito | nasce/morre |
| C4.8 | Pilar novo: coeficientes de engastamento e de flambagem. | Falta | coeficientes de engastamento e flambagem por pilar |
| C4.9 | Pilar novo: ângulo. | Feito |  |
| C4.10 | Pilar novo: vinculação exterior. | Falta | vínculo externo (hoje sempre engastado) |
| C4.11 | Material do pilar por pavimento/tramo (concreto ou aço) e dimensões ou perfil. | Parcial | seção por lance; só concreto |
| C4.12 | Posicionamento do pilar por clique. | Feito | clique, coordenada digitada, captura |
| C4.13 | Pilar que nasce sobre outro pilar. | Parcial | pilar que nasce num pavimento; sem checar apoio em pilar de baixo |
| C4.14 | Tramos superiores com ponto fixo, ângulo ou dimensões diferentes, podendo parte deles ficar fora da projeção do pilar de baixo. | Parcial | seção por lance; ponto fixo/ângulo por lance não |
| C4.15 | Empilhamento sem limite de pilares sobre pilares, e mais de um pilar nascendo no mesmo pilar. | Falta | vários pilares nascendo sobre um pilar |
| C4.16 | Pilar que admite outro por cima (termina antes do último pavimento) muda de cor sob o cursor e mostra um círculo de referência no eixo. | Falta |  |
| C4.17 | Coordenadas do ponto fixo do novo pilar relativas às do pilar de baixo. | Falta |  |
| C4.18 | Captura DXF/DWG de eixo, cantos ou ponto médio das faces do pilar de baixo, sem pedir coordenadas. | Parcial | capturas no contorno do pilar existente |
| C4.19 | Referência automática do pilar que nasce: referência do pilar de baixo seguida de letra sequencial (a, b, ...). | Falta | nome automático com sufixo para pilar que nasce |
| C4.20 | Pilares que não se sobrepõem são lançados como pilares comuns. | Feito |  |
| C4.21 | O topo do pilar de baixo não usa o coeficiente de engastamento do último pavimento. Os elementos apoiados nele são tidos como engastados por padrão. | Falta |  |
| C4.22 | Engastamento parcial só no topo do último tramo. Pode-se articular o pilar que chega a uma viga ou definir engaste parcial na base do pilar novo. | Falta | engaste parcial / articulação de pilar |
| C4.23 | A transmissão de esforços entre pilares sobrepostos considera a excentricidade. O detalhe construtivo fica com o usuário. | Falta | excentricidade entre pilares sobrepostos |
| C4.24 | Pilar que nasce sobre outro não admite vinculação exterior. | Falta |  |
| C4.25 | Edição completa do pilar ou de cada propriedade em separado. | Feito | editar tudo ou um campo; quadro de pilares |
| C4.26 | Mudar o ponto fixo do pilar sem mover o pilar, aplicando o novo ponto fixo a vários pilares. | Parcial | pilar.editar muda o ajuste; sem “sem mover” em lote |
| C4.27 | Ponto fixo dos pilares visível durante o lançamento de vigas e lajes. | Feito | ponto fixo visível |
| C4.28 | Pilar novo com os dados copiados de um pilar existente, escolhido na tela. | Falta | copiar dados de um pilar (conta-gotas) |
| C4.29 | O formulário de pilar novo guarda os dados do último pilar lançado. | Feito | ferramenta guarda a última seção |
| C4.30 | Cópia de pilar que leva também as cargas horizontais e as cargas no topo. | Falta |  |
| C4.31 | Pilar-parede: geometria composta de retângulos, nome, grupos inicial e final, espessura, vinculação exterior e ângulo. | Falta | pilar-parede de retângulos |
| C4.32 | Tipos de pilar-parede gravados com a obra, reutilizáveis sem limite. | Falta |  |
| C4.33 | Taxas geométricas mínimas dos pilares por norma e tipo de aço, substituíveis por valores do usuário (cargas estáticas e dinâmicas separadamente). | Parcial | taxa mínima fixa (máx(0,15Nd/fyd; 0,4%)); sem valor do usuário |
| | **4.2 Resultados de pilares** | | |
| C4.34 | Após o cálculo, pilares que não passam nas verificações ficam em vermelho e são revisados pela edição na aba de resultados. | Parcial | status em tabela; clique leva à planta; planta não colore |
| C4.35 | Janela de dimensionamento do pilar, aberta por clique. | Falta | janela de dimensionamento do pilar |
| C4.36 | O relatório do cálculo lista os pilares com erro de dimensionamento e indica onde revisá-los. | Feito | mensagens por lance |
| C4.37 | Seção em vermelho na tela, no pavimento onde está o erro. | Falta | seção em vermelho na planta |
| C4.38 | Tramos com erro marcados com símbolo de aviso e coluna de estado com códigos. O clique mostra o detalhe da verificação e sugestões de correção. | Parcial | status e mensagens; sem sugestões detalhadas |
| C4.39 | Erro de taxa excessiva: taxa mecânica aço/concreto acima de 100% ou geométrica acima de 8%. | Parcial | limite de 4% na busca |
| C4.40 | Verificação do cortante contra a compressão oblíqua (bielas), quando a norma pede, e do espaçamento dos estribos quando há armadura transversal. | Falta | cortante em pilares |
| C4.41 | Detalhe do cortante: área longitudinal em X e Y, área de estribo, esforços e cortante resistente em cada direção (Vsd ≤ Vrd). | Falta |  |
| C4.42 | Aviso de estribo fora da tabela: só um estribo foi colocado. Revisar a tabela de armaduras e a disposição dos estribos. | Falta |  |
| C4.43 | Limite da taxa volumétrica de estribos de confinamento em sismo com ductilidade muito alta. | Fora | sismo |
| C4.44 | Verificação de resistência ao fogo da seção do pilar, conforme o especificado. | Falta | fogo (NBR 15200) |
| C4.45 | Taxa As/Ac (%) mostrada por tramo. | Parcial | As por lance; taxa não exibida |
| C4.46 | Pilares de aço: ao calcular, opções de dimensionar ou não os perfis. | Fora | pilar de aço no edifício |
| C4.47 | Dimensionamento de perfis por toda a série (pode trocar por menor) ou só por perfis maiores ou iguais ao atual. | Fora |  |
| C4.48 | Testar outro perfil da série com verificação imediata. | Fora |  |
| C4.49 | Lista dos perfis da série com peso por metro, aproveitamento (%) e erros. | Fora |  |
| C4.50 | Botão para voltar ao perfil ótimo proposto pelo dimensionamento. | Fora |  |
| C4.51 | Dados do pilar no dimensionamento: ângulo, engastamento, desnível e profundidade do apoio. | Falta |  |
| C4.52 | Planta de situação dos pilares dos pavimentos selecionados. Pilares não dimensionados (armadura manual) em vermelho, e clique para passar a outro pilar. | Falta | planta de situação no dimensionamento |
| C4.53 | Bloqueio da armadura de pilares: recalcula a estrutura sem mudar a armadura bloqueada (preserva edições manuais). | Falta | bloqueio de armadura |
| C4.54 | Pilares bloqueados passam pela verificação completa da norma a cada recálculo, e os que falham ficam em vermelho. | Falta |  |
| C4.55 | Para redimensionar: desbloquear e redimensionar todos, ou redimensionar pilar a pilar mantendo o bloqueio. | Falta |  |
| C4.56 | Desbloqueio automático quando muda o número de pavimentos que o pilar sustenta. | Falta |  |
| C4.57 | Uso sugerido do bloqueio: estudar a sensibilidade da armadura ao engastamento, ao coeficiente de reação do solo ou ao radier. | Falta |  |
| C4.58 | O bloqueio vale só para pilares de concreto. Em aço, o equivalente é calcular sem dimensionar os perfis. | Fora |  |
| C4.59 | Seleção para bloqueio: um a um, por janela, ou bloquear/desbloquear todos. Selecionados em verde, pilares de aço em cinza e não selecionáveis. | Falta |  |
| C4.60 | Envoltórias de esforços em pilares e pilares-parede (momentos, cortantes, torção) por hipótese ou por combinação. | Parcial | esforços calculados; sem tela de envoltórias por pilar |
| | **4.3 Desenhos e relatórios de pilares** | | |
| C4.61 | Mostrar ou ocultar o ponto fixo dos pilares nas pranchas. | Falta |  |
| C4.62 | Detalhe das condições de estribos (configuradas em pilares, muros e consolos) desenhado no quadro de pilares. | Falta | detalhe de estribos no quadro |
| C4.63 | Relatório de esforços e armaduras de pilares, pilares-parede e muros, com a verificação de cortante dos pilares de concreto. | Parcial | memorial do edifício (Nd, armadura, estribo) |

## 5. Muros e paredes estruturais (págs. 42–46)

| Item | Funcionalidade (palavras próprias) | Situação | Statikos |
|---|---|---|---|
| C5.1 | Tipos de muro: concreto armado, alvenaria de blocos de concreto genéricos (armada), blocos de catálogo de fabricante e alvenaria genérica. | Falta | muros de concreto e alvenaria (V2); blocos de catálogo fora |
| C5.2 | Dados comuns a todos os tipos: geometria, existência de empuxos laterais e tipo de fundação de apoio. | Falta | muros e paredes estruturais (V2) |
| C5.3 | Bloco escolhido da biblioteca, com cadastro de blocos novos. | Falta | muros e paredes estruturais (V2) |
| C5.4 | Série de blocos genéricos com opção de peça de canto, para quando a largura não é metade do comprimento. | Falta | muros e paredes estruturais (V2) |
| C5.5 | Muros de blocos de fabricante: dimensionamento e verificação pelo Eurocódigo 6, com armadura vertical e/ou horizontal opcional. | Fora | Eurocódigo 6 |
| C5.6 | Saídas dos muros de blocos: relatório de cálculo, quantitativo, plantas e esquema em planta dos blocos e das armaduras. | Falta | muros e paredes estruturais (V2) |
| C5.7 | Escolha de fabricante e modelo de bloco. Peças especiais de canto usadas automaticamente quando o fabricante as tem. | Fora | catálogo de fabricante europeu |
| C5.8 | Alvenaria genérica: módulo de elasticidade, módulo de cisalhamento, peso específico, resistência de cálculo à compressão e à tração, e opção de considerar a rigidez ao cisalhamento. | Falta | muros e paredes estruturais (V2) |
| C5.9 | Aberturas (portas e janelas) em muros de concreto, de alvenaria genérica e de blocos. | Falta | muros e paredes estruturais (V2) |
| C5.10 | A abertura é lançada no pavimento de baixo dos dois entre os quais fica. | Falta | muros e paredes estruturais (V2) |
| C5.11 | Em muros de blocos, a abertura se ajusta à modulação dos blocos para evitar peças especiais. | Falta | muros e paredes estruturais (V2) |
| C5.12 | Verga: em muros de subsolo e de alvenaria genérica não há aviso de tensões excessivas. Em blocos, a verga é verificada e armada. | Falta | muros e paredes estruturais (V2) |
| C5.13 | Edição da armadura de uma abertura, destacada sob o cursor. | Falta | muros e paredes estruturais (V2) |
| C5.14 | Armadura padrão de portas, copiada de uma porta e aplicada a várias. | Falta | muros e paredes estruturais (V2) |
| C5.15 | Armadura padrão de janelas, copiada e aplicada da mesma forma. | Falta | muros e paredes estruturais (V2) |
| C5.16 | Armadura de vergas em muros de blocos, copiada e aplicada da mesma forma. | Falta | muros e paredes estruturais (V2) |
| C5.17 | Relatório das verificações da armadura de uma abertura escolhida. | Falta | muros e paredes estruturais (V2) |
| C5.18 | A armadura das aberturas de muros de concreto é dimensionada para empuxos e para os esforços em vergas e peitoris. | Falta | muros e paredes estruturais (V2) |
| C5.19 | Sismo com aceleração acima de 0,16 g: armadura inclinada em verga e peitoril. | Fora | sismo |
| C5.20 | Com vão livre/altura da verga < 1,5 e tração acima da resistência do concreto, as barras do quadro fazem o papel da armadura inclinada. | Fora | sismo |
| C5.21 | Prolongar muro (como as vigas), em todos os grupos onde ele existe. | Falta | muros e paredes estruturais (V2) |
| C5.22 | Atribuir as propriedades de um tipo de muro a outros muros, um a um ou por janela, inclusive copiando de um muro de outro tipo. | Falta | muros e paredes estruturais (V2) |
| C5.23 | Vigas embutidas e de coroamento aparecem sobrepostas ao muro em planta e são editáveis junto com ele. | Falta | muros e paredes estruturais (V2) |
| C5.24 | Opção de armadura: aço da armadura horizontal dos muros de blocos. | Falta | muros e paredes estruturais (V2) |
| C5.25 | Opção de armadura: resistências da argamassa e dos blocos de fabricante. | Falta | muros e paredes estruturais (V2) |
| C5.26 | Muro de concreto: armar ou não, sempre ou só quando necessário, só horizontal ou horizontal e vertical, e tipo da armadura horizontal. | Falta | muros e paredes estruturais (V2) |
| C5.27 | Pilares em contato com muros de alvenaria/blocos são desligados do muro no nível do pavimento, para uma transmissão de esforços mais realista. | Falta | muros e paredes estruturais (V2) |
| C5.28 | Sapata isolada equivalente para cada pilar sobre sapata corrida, dimensionada com os esforços do pilar e do trecho de muro apoiado. | Falta | muros e paredes estruturais (V2) |
| C5.29 | Quantitativo de muros de blocos com peças inteiras e especiais (meio bloco, canto). | Falta | muros e paredes estruturais (V2) |
| C5.30 | Lacuna: o texto do item sobre muros de concreto armado (5.1.2.1) não veio na extração. Só há o título. | Falta | pendente: texto não veio na leitura (muros de concreto) |

## 6. Vigas (págs. 47–62)

| Item | Funcionalidade (palavras próprias) | Situação | Statikos |
|---|---|---|---|
| | **6.1 Lançamento** | | |
| C6.1 | Lançamento do contorno do pavimento combinando gabarito DXF/DWG e ferramentas de viga. | Feito | vigas sobre a máscara com capturas |
| C6.2 | Ajudas genérica e específica durante o lançamento. | Parcial | dicas e mensagens |
| C6.3 | Painel flutuante de ferramentas aberto depois da escolha do tipo de seção. | Parcial | grupo Vigas na barra lateral |
| C6.4 | Troca do tipo de viga atual a partir do painel. | Feito |  |
| C6.5 | Modo contínuo: o fim de uma viga é o início da próxima. A sequência só vale depois de encerrada pelo menu de contexto. | Feito | polilinha contínua; Enter encerra |
| C6.6 | Atalhos de teclado: encerrar a sequência (Ctrl+T) e apagar o último ponto (Ctrl+B). | Parcial | Enter/Esc; apagar último ponto a conferir |
| C6.7 | Modo simples: cada viga com início e fim independentes. | Parcial | polilinha de 2 pontos |
| C6.8 | Linha de ajuste da viga: eixo ou uma das faces. | Feito | eixo ou face |
| C6.9 | Distinção entre a linha clicada (introdução) e a linha de ajuste, com deslocamento configurável entre elas. | Falta | deslocamento configurável entre linha clicada e linha de ajuste |
| C6.10 | Troca cíclica do ajuste (eixo/faces) por atalho (Ctrl+E) durante o lançamento. | Feito | tecla A |
| C6.11 | Deslocamento útil quando o desenho mostra a fachada (com revestimentos) e não o limite estrutural. | Falta |  |
| C6.12 | Viga reta por dois pontos e viga curva por três (início, passagem e fim). A curva vira uma poligonal de trechos retos. | Falta | viga curva |
| C6.13 | Alternância reta/curva por atalho (Ctrl+A) e trechos retos e curvos alternados no modo contínuo, começando por qualquer um dos dois. | Falta |  |
| C6.14 | Janela da viga atual: tipo e propriedades (dimensões, seção, conectores etc.). | Feito | seção, invertida |
| C6.15 | Viga plana (faixa) com altura igual ao desnível entre os pontos mais alto e mais baixo da laje que contorna. | Falta | viga chata (faixa) |
| C6.16 | Viga com altura (descolgada): retangular, T ou com mesa colaborante. A mesa entra na rigidez, mas a armadura usa só a alma. | Parcial | retangular; sem T/mesa colaborante |
| C6.17 | Vigas treliçadas e protendidas (pré-fabricadas), com propriedades próprias. | Falta | treliçadas/protendidas pré-fabricadas |
| C6.18 | Viga de vinculação exterior, que simula por exemplo o topo de um muro. Pilares coincidentes precisam ser desligados para não terem o deslocamento vertical travado. | Falta | viga de vínculo externo |
| C6.19 | Desligamento muro-pilar só em lajes de vigotas. Em lajes maciças/cogumelo, a recomendação é lançar o muro como elemento. | Falta |  |
| C6.20 | A viga de coroamento do topo do muro não é especificada pelo programa. O detalhe fica com o usuário, com apoio da biblioteca de detalhes construtivos. | Fora |  |
| C6.21 | Viga não estrutural (limite), que só fecha o contorno de um pano maciço quando a viga de borda é desprezível. | Falta | viga não estrutural de contorno |
| C6.22 | Vigas de fundação: retangular, L, T ou plana (esta para fechar panos de radier). | Parcial | vigas no térreo funcionam como baldrame; sem tipo próprio |
| C6.23 | Vigas de aço: perfil simples, caixão soldado, perfis afastados com chapas de ligação, perfis unidos. Usam a mesma biblioteca dos pilares de aço. | Fora | vigas de aço no edifício |
| C6.24 | Vigas alveoladas (não mistas): furos hexagonais, octogonais ou circulares, proporções e número de furos preenchidos nas extremidades. | Fora |  |
| C6.25 | Vigas mistas: perfil sob a laje com concreto colaborante ligado por conectores de geometria definível. | Fora | mistas |
| C6.26 | Engaste parcial fixo de 0,05 na ligação da viga mista com o apoio, para reduzir o negativo e aumentar o positivo. | Fora |  |
| C6.27 | Viga mista: no negativo só o perfil resiste, no positivo a seção mista. | Fora |  |
| C6.28 | Largura colaborante automática: mínimo entre a largura efetiva calculada e mesa + 10 cm de cada lado. Em viga de borda, mesa + 10 cm. | Fora |  |
| C6.29 | Largura efetiva própria para verificar os positivos. A armadura de negativo sobre o apoio não é dimensionada. | Fora |  |
| C6.30 | Capturas DXF/DWG (mais próximo, interseção, extremo, ponto médio etc.) ao marcar os pontos da viga, sem ajuste posterior. | Feito | capturas |
| C6.31 | Poliviga: vigas consecutivas ligadas, que mudam e são apagadas juntas, com armaduras que podem diferir. | Feito | viga em polilinha (vários trechos) |
| C6.32 | Viga curva agrupada por padrão como poliviga e como tramo de armadura predefinido, com opções de compor e decompor. | Falta |  |
| C6.33 | Tramo de armadura predefinido: vigas consecutivas sem emenda da armadura inferior em ponto intermediário, enquanto a barra não passa do comprimento máximo configurado. | Falta |  |
| C6.34 | Compor ou decompor muda o número de vãos do pórtico. Para atualizar a armadura, basta redimensionar. | Falta |  |
| C6.35 | Vigas inclinadas de aço ou concreto entre um grupo inicial e um final: simples (uma só) ou múltipla (uma por pavimento). | Falta | vigas inclinadas entre grupos |
| C6.36 | Diagonais de contraventamento entre grupos inicial e final de pavimento único, podendo atravessar grupos intermediários. | Falta | diagonais de contraventamento |
| C6.37 | Diagonal simples ou múltipla (uma por pavimento). | Falta |  |
| C6.38 | Diagonal de concreto (largura e altura) ou de aço (perfil da biblioteca, em posição normal ou girada). | Falta |  |
| C6.39 | Ligação das extremidades da diagonal: engastada ou articulada. | Falta |  |
| C6.40 | Coeficientes de flambagem vertical e transversal aplicados ao comprimento total entre nós, em planos globais (não nos eixos locais). O cruzamento entre barras inclinadas não reduz o comprimento. | Falta |  |
| C6.41 | Copiar os dados de uma diagonal existente. | Falta |  |
| C6.42 | Diagonal lançada por clique em dois pontos (ex.: viga de partida e viga oposta), sem trocar de pavimento. Setas indicam a diagonal na planta. | Falta |  |
| C6.43 | Nó gerado no cruzamento de diagonais. Elas são dimensionadas à tração e à compressão, com verificação da esbeltez máxima da norma. | Falta |  |
| C6.44 | Apagar diagonal: em todos os grupos, se for múltipla. | Falta |  |
| C6.45 | Informação da diagonal (tipo, grupos, comprimento real, seção, ligações, flambagem), também desenhada na prancha de vigas do grupo inicial. | Falta |  |
| C6.46 | Editar, mover extremos e atribuir propriedades a diagonais existentes: a operação vale só no grupo atual. | Falta |  |
| C6.47 | Viga comum a dois grupos (ex.: borda entre laje horizontal e laje inclinada), lançada uma vez e criada automaticamente no outro grupo. | Falta | viga comum a dois grupos |
| C6.48 | Viga comum com eixo em traço-ponto. Armadura e envoltórias são consultadas no grupo de origem. | Falta |  |
| C6.49 | Viga comum em metade do comprimento: cada parte pode ser comum a um grupo diferente. | Falta |  |
| C6.50 | Desfazer viga comum, voltando às duas vigas originais (feito no grupo associado). | Falta |  |
| C6.51 | Contorno externo retangular fora do perímetro atual: com ângulo zero (dois cantos) ou com qualquer ângulo (dois cantos de um lado e um ponto do lado oposto). | Falta | contorno retangular |
| C6.52 | Atribuir as propriedades da viga atual a vigas já lançadas, uma a uma ou por janela. O mesmo vale para muros. | Feito | viga.atribuir |
| C6.53 | Prolongar viga por comprimento fixo (pré-visualizado) ou arrastando a extremidade. | Parcial | prolongar até ponto/elemento; sem comprimento fixo |
| C6.54 | Consolos curtos para apoiar viga indiretamente no pilar (juntas de dilatação). Não servem para apoiar pilares. | Falta | consolos |
| C6.55 | Lançamento de consolo: viga até a face do pilar, tipo e geometria do consolo (com área de apoio) e clique na face do pilar. | Falta |  |
| C6.56 | Modelagem do consolo: apoio fixo interno no centro do apoio, transmissão só da carga vertical e viga desligada da face do pilar (sem momento nem cortante). | Falta |  |
| C6.57 | Edição de consolos. | Falta |  |
| C6.58 | Ajuste de vigas à interseção de planos inclinados ou à linha de máxima declividade, indicadas por linhas magenta (contínua ou tracejada). | Falta |  |
| C6.59 | Armadura opcional de vigas no nível das lajes sobre muros de alvenaria genérica e de coroamento em blocos. Em muros de subsolo, a viga é armada no topo. Espessuras mínimas configuráveis. | Falta |  |
| C6.60 | Informação da viga de aço, com a largura efetiva de laje que ela recebe. | Fora |  |
| C6.61 | Cobrimentos nas zonas de confinamento (cálculo com sismo), indicados por linhas no editor. | Fora | sismo |
| C6.62 | Gravar referências-base de juntas de vigas e de pórticos para usar em obras futuras. | Falta |  |
| C6.63 | Lançamento por captura do gabarito: um clique numa linha, arco ou polígono gera uma série de vigas ajustadas pela face (do lado oposto ao cursor) ou pelo eixo. | Falta | vigas geradas por clique em linha da máscara |
| | **6.2 Cálculo e resultados de vigas** | | |
| C6.64 | Vigas de aço no cálculo: dimensionar a partir do perfil inicial (só maiores ou iguais) ou de toda a série (pode reduzir). | Fora | aço |
| C6.65 | Erro: diâmetro do estribo acima de 1/10 da espessura (limite de norma específica). | Falta | verificações de detalhamento de estribo |
| C6.66 | Aviso de desnível longitudinal que pede detalhe especial (estribos adicionais para a continuidade da armadura). | Falta |  |
| C6.67 | Erro de barra mais longa que o máximo quando não é possível dividi-la (> 12 m). | Falta | barra acima de 12 m |
| C6.68 | Relatório de erros das vigas inclinadas após o cálculo. | Falta |  |
| C6.69 | Informação da viga inclinada: tipo, pavimentos, seção ou dimensões, armadura, engastamento e flambagem. | Falta |  |
| C6.70 | Listagem da viga inclinada: materiais, descrição, esforços por hipótese e combinação, envoltórias, aproveitamento (aço), resultado do dimensionamento e erros. | Falta |  |
| C6.71 | Vigas inclinadas com erro em vermelho, com detalhe por clique. | Falta |  |
| C6.72 | Edição de viga inclinada de concreto: geometria (largura e altura), armadura (estribos, superior, inferior, pele), verificação, dimensionamento, detalhamento e vista 3D. | Falta |  |
| C6.73 | Viga inclinada de aço: verificação de outros perfis da série. | Fora |  |
| C6.74 | Redimensionar todas as vigas inclinadas de concreto com os esforços do último cálculo. | Falta |  |
| C6.75 | Redimensionar os perfis das vigas inclinadas de aço (só maiores ou toda a série). | Fora |  |
| C6.76 | Copiar a armadura entre pórticos do mesmo grupo ou de grupos diferentes (destino escolhido por menu de contexto). | Falta | copiar armadura entre pórticos |
| C6.77 | Na cópia vão diâmetro, número e ancoragem (montagem e 1ª camada inferior), diâmetro, número e comprimento (demais barras) e diâmetro, espaçamento e extensão dos estribos. Não há aviso se a armadura copiada for menor que a necessária. | Falta |  |
| C6.78 | Condições para copiar: todos os vãos de concreto e do mesmo tipo (plana ↔ com altura sim, treliçada não), mesmo número de vãos, diferença de vão < 25 cm e desníveis coincidentes. Quando a cópia falha, uma mensagem dá o motivo. | Falta |  |
| C6.79 | Copiar a armadura não iguala os desenhos: isso só acontece com geometria idêntica. | Falta |  |
| C6.80 | Dimensionar as vigas de aço do pavimento a qualquer momento depois do cálculo, e testar outros perfis da série sem recalcular. | Fora |  |
| C6.81 | Agrupar pórticos depois do cálculo, sem verificar as condições. Aviso com o motivo quando não é possível. | Falta | agrupar pórticos |
| C6.82 | Em pórticos agrupados, a mudança em um vale para todos, e sai um único desenho com todas as referências. | Falta |  |
| C6.83 | Desagrupar pórticos e acrescentar pórtico a um agrupamento existente. | Falta |  |
| C6.84 | Bloquear a armadura de pórticos para preservar edições manuais nos recálculos. | Falta | bloquear armadura |
| C6.85 | Pórticos bloqueados só são verificados quanto à área de aço e à flecha. Os que falham aparecem na cor de erro. | Falta |  |
| C6.86 | Desbloqueio automático quando muda o número de vãos do pórtico. | Falta |  |
| C6.87 | Redimensionar todos os pórticos ou só os alterados (desbloqueados ou com seção modificada). | Falta |  |
| C6.88 | Seleção de bloqueio por grupo: todos, nenhum ou seleção gráfica (contorno vermelho), com a contagem de selecionados. | Falta |  |
| C6.89 | Erro de conector: diâmetro nominal pequeno. | Fora | conectores de vigas mistas |
| C6.90 | Erro de conector: comprimento total insuficiente. | Fora | conectores de vigas mistas |
| C6.91 | Erro de conector: não ancorado na laje. | Fora | conectores de vigas mistas |
| C6.92 | Erro de conector: comprimento insuficiente para o diâmetro. | Fora | conectores de vigas mistas |
| C6.93 | Erro de conector: diâmetro da cabeça insuficiente. | Fora | conectores de vigas mistas |
| C6.94 | Erro de conector: espessura da cabeça insuficiente. | Fora | conectores de vigas mistas |
| C6.95 | Erro de conector: diâmetro que não garante a ductilidade da ligação. | Fora | conectores de vigas mistas |
| C6.96 | Erro de conector: comprimento que não garante a ductilidade. | Fora | conectores de vigas mistas |
| C6.97 | Erro de conector: número excessivo para o comprimento da viga. | Fora | conectores de vigas mistas |
| C6.98 | Erro de conector: mesa do perfil fina demais para soldar o conector (espessura mínima depende do diâmetro). | Fora | conectores de vigas mistas |
| C6.99 | Erro de conector: mesa estreita demais para dois conectores (distâncias mínimas entre conectores e à borda). | Fora | conectores de vigas mistas |
| C6.100 | Verificação de consolos após o cálculo: os com erro ficam em vermelho, e o clique dá o relatório das verificações. | Falta |  |
| C6.101 | Redimensionar a armadura de todos os consolos com os esforços do último cálculo. | Falta |  |
| C6.102 | Editar a armadura de vigas inclinadas. | Falta |  |
| C6.103 | Configuração do editor de armaduras de vigas: escolher o que mostrar (superior, inferior, pele, faixas de estribos, seção, zonas de confinamento). | Falta | editor de armaduras de vigas |
| C6.104 | Fator multiplicador do comprimento de emenda (lb) no editor. | Falta |  |
| C6.105 | Envoltórias de esforços em vigas (momento, cortante, torção) por hipótese simples ou combinação. Em sismo dinâmico, escolha do modo de vibração. | Parcial | envoltórias calculadas (M+, M−, V); sem diagrama na tela |
| C6.106 | Diagramas consultados por clique em alinhamentos de vigas, lajes alveolares ou lajes mistas. | Falta | diagramas por clique |
| | **6.3 Desenhos de vigas** | | |
| C6.107 | Desenho da armadura de vigas inclinadas. | Falta |  |
| C6.108 | Desenho de consolos: vistas frontal e lateral cotadas, armadura principal e estribos, medidas e referências do pórtico e do pilar. | Falta |  |

## 7. Lajes (págs. 63–80; leitura parcial até o início do 7.2.1.1)

| Item | Funcionalidade (palavras próprias) | Situação | Statikos |
|---|---|---|---|
| | **7.1.1 Gestão de panos** | | |
| C7.1 | Tipos de pano: lajes de vigotas (unidirecionais), alveolares, mistas (steel deck), nervuradas bidirecionais (cubetas), maciças, radier e pano a definir. | Parcial | maciça e treliçada; sem alveolar, steel deck, nervurada bidirecional, radier |
| C7.2 | Todo contorno fechado por vigas vira automaticamente um pano a definir, marcado com um ponto de interrogação. | Parcial | panos detectados; pano sem laje gera aviso |
| C7.3 | O lançamento do pano pede a direção da armadura, das nervuras ou das vigotas, dada por clique numa viga paralela ou perpendicular ao pano. | Feito | direção pelo menor vão, editável |
| C7.4 | Apagar pano: o espaço vira abertura. | Feito | remover laje |
| C7.5 | Mudar o ponto de inserção do pano. | Falta |  |
| C7.6 | Mudar a direção do pano, por uma viga ou por dois pontos. | Parcial | direção editável (número); não por viga/2 pontos |
| C7.7 | Consultar e editar os dados do pano. | Feito |  |
| C7.8 | Copiar dados de outro pano, escolhendo o que copiar (plano de inclinação, engastamento etc.), inclusive de pano de outro grupo escolhido por menu de contexto. Alerta para desligar a cópia do plano entre panos de inclinações diferentes. | Parcial | laje.atribuir (tipo); sem escolher o que copiar |
| C7.9 | Mostrar as formas (cubetas) das lajes nervuradas e desenhar as nervuras com a largura real. | Falta | desenho das nervuras |
| C7.10 | Momentos mínimos por pano em lajes de vigotas, alveolares e mistas. | Falta | momentos mínimos por pano |
| C7.11 | Classe de ambiente (exposição) por pano em vigotas protendidas e alveolares, atribuída a um pano ou a todos do grupo. | Falta |  |
| C7.12 | Coeficiente de engastamento de borda por pano ou para todos do grupo (não disponível em nervuradas; nelas se usa o engaste de extremidade das vigas). | Falta | engastamento de borda por pano |
| C7.13 | Processo construtivo das alveolares: com ou sem escoramento. | Fora |  |
| C7.14 | Vigota dupla ou tripla ao lado de uma vigota escolhida, com apagamento posterior. | Falta |  |
| | **7.1.2.1 Pano a definir** | | |
| C7.15 | Trocar abertura ou pano já definido por pano a definir, e pano a definir por abertura ou por qualquer tipo de laje. | Parcial | remover/criar laje no pano |
| C7.16 | Pano a definir com desnível, inclinação e espessura. A espessura passa às vigas planas do contorno. | Parcial | desnível da laje; sem inclinação |
| C7.17 | Obra com pano a definir não pode ser calculada (evita esquecimento). | Falta | bloquear o cálculo com pano sem tipo |
| C7.18 | Pano a definir visível na vista 3D, para conferir aberturas e lajes antes de escolher o tipo. | Falta | 3D |
| | **7.1.2.2 Lajes de vigotas** | | |
| C7.19 | Tipos de laje de vigotas disponíveis conforme a norma escolhida. | Parcial | catálogo H8–H25 próprio [a confirmar] |
| C7.20 | Vigotas de concreto armadas ou protendidas, por catálogo de fabricante ou por propriedades geométricas (dependendo da norma, só a segunda opção). | Falta | vigotas protendidas; catálogo de fabricante |
| C7.21 | Tipos genéricos por geometria (criar, copiar, apagar) para quando a vigota final não é conhecida, ajudando a decidir entre armada e protendida pela flecha. | Falta |  |
| C7.22 | Dados geométricos: referência, espessura da capa, altura do enchimento, intereixo e largura mínima da nervura. | Parcial | capa, enchimento, intereixo, nervura do catálogo; não editáveis |
| C7.23 | Acréscimo de largura da nervura, usado só na rigidez e no momento de fissuração para a flecha (enchimento de concreto). | Falta |  |
| C7.24 | Volume de concreto por m² calculado e editável. | Feito | volume de concreto nos quantitativos |
| C7.25 | Tipo de enchimento: concreto, cerâmica, EPS ou genérico (genérico pede o peso por m²). Peso total por m² calculado. | Parcial | só EPS |
| C7.26 | Escolha entre vigota armada e protendida para o cálculo da flecha (relação rigidez fissurada/bruta a confirmar com o fabricante). | Falta |  |
| C7.27 | Exportar a laje definida para uma biblioteca interna e reutilizar em outras obras. | Falta | biblioteca de lajes |
| C7.28 | Biblioteca de fichas de fabricantes. Os dados são do fabricante, o programa só faz um controle lógico. Novas fichas podem ser criadas num editor à parte. | Falta |  |
| C7.29 | Seleção na biblioteca: referência opcional (padrão ficha + laje), ficha/fabricante e laje da série (altura e intereixo), com resumo das propriedades (concretos, aço de protensão etc.). | Falta |  |
| C7.30 | Ficha técnica para vigota simples e dupla, com dados obrigatórios e recomendados. | Falta |  |
| C7.31 | Vigota armada, positivo (meio do vão): tipo, armadura (base + adicional em todo o comprimento + adicional mais curta), área de aço, momento último, momento de fissuração, rigidez total e rigidez fissurada (flecha por Branson). | Parcial | momento por nervura informado; armadura com o fabricante |
| C7.32 | Vigota armada, negativo (apoio): armadura superior adicional (duas parcelas com comprimentos calculados), área de aço, momento último da seção típica e da seção maciça (sem enchimento), momento de fissuração e rigidezes. | Falta |  |
| C7.33 | Cortante último da seção, com valores por tipo de treliça. O tipo usado aparece na tela e no desenho. | Falta |  |
| C7.34 | Vigota protendida: momentos de serviço por classe de ambiente/exposição, comparados com o de cálculo. Se não passa, procura outra vigota, e sem solução emite erro no fim do cálculo. | Falta |  |
| C7.35 | Vigota protendida sem armadura de cortante. | Falta |  |
| C7.36 | Laje nervurada moldada no local (nervuras como vigas) com armadura de base atribuível. | Falta | nervurada moldada no local |
| C7.37 | Dados da nervurada moldada no local: referência, tipo de enchimento (biblioteca: criar, copiar, apagar), espessura da capa e intereixo. | Falta |  |
| C7.38 | Laje com vigotas de perfil I laminado: referência, enchimento, capa, intereixo e série de perfis. | Fora |  |
| C7.39 | Nas vigotas de aço, escolhe-se a série e o perfil é dimensionado automaticamente, sempre biapoiado (engastamento 0 fixo). | Fora |  |
| C7.40 | Laje com vigotas treliçadas de aço biapoiadas: tipo (banzos com um ou dois perfis), série de perfis, altura nominal, ângulo das diagonais entre 30° e 60°, intereixo e espessura da capa (não colaborante). | Fora |  |
| C7.41 | Coeficiente de redução da rigidez à torção das lajes de vigotas, consultável e editável nas opções gerais. | Parcial | torção 15% fixa (premissa); não editável na tela |
| | **7.1.2.3 Lajes nervuradas bidirecionais** | | |
| C7.42 | Forma perdida ou recuperável. | Falta | nervurada bidirecional |
| C7.43 | Formas importadas da biblioteca ou definidas pelo usuário, e editáveis. | Falta |  |
| C7.44 | Disposição das formas visível na tela. | Falta |  |
| C7.45 | Pano lançado paralelo a uma viga ou por dois pontos. | Falta |  |
| C7.46 | Copiar panos nervurados no mesmo grupo e atribuir armadura de base aos panos do grupo. | Falta |  |
| C7.47 | Geração automática de ábacos (capitéis), com parâmetros configuráveis. | Falta | ábacos/capitéis |
| C7.48 | Ábaco, ângulo de visão: cone de busca a partir de cada face do pilar. O pilar mais próximo dentro do cone dá o vão de referência, e sem pilar vale o mínimo. | Falta |  |
| C7.49 | Ábaco, extensão maciça: porcentagem da distância ao pilar vizinho, medida da face do pilar à borda do ábaco. | Falta |  |
| C7.50 | Ábaco, comprimentos mínimo e máximo da face do pilar à borda, em relação à altura do ábaco. | Falta |  |
| | **7.1.2.4 Lajes alveolares** | | |
| C7.51 | Lajes alveolares da biblioteca ou criadas pelo usuário, com ajuda sobre os dados pedidos. | Falta | alveolares |
| | **7.1.2.5 Lajes mistas (steel deck)** | | |
| C7.52 | Laje com chapa de aço perfilada, concreto e armaduras superior e inferior. | Falta | steel deck |
| C7.53 | Chapa só como forma: resiste ao peso próprio, ao concreto fresco e às cargas de execução, e em serviço só a laje de concreto armado trabalha. | Falta | steel deck |
| C7.54 | Posição da chapa normal ou invertida, conforme o fabricante. | Falta | steel deck |
| C7.55 | Linha tracejada no eixo de sobreposição das chapas, com a largura da ficha. | Falta | steel deck |
| C7.56 | Chapa colaborante: forma perdida na execução e armadura de tração (positivos) em serviço, com transmissão de cisalhamento por mossas. | Falta | steel deck |
| C7.57 | Análise e dimensionamento da chapa pelo Eurocódigo 4 (versão de 1994/95). | Fora | EC4 |
| C7.58 | Uso para cargas predominantemente estáticas, incluindo galpões com cargas móveis. | Falta | steel deck |
| C7.59 | Limites verificados: espessura total da laje, espessura de concreto sobre as nervuras da chapa e altura mínima dos conectores (vigas mistas). | Falta | steel deck |
| | **7.1.3 Lajes inclinadas e desníveis** | | |
| C7.60 | Fluxo: lançar tudo na horizontal e depois atribuir inclinações ou desníveis. | Falta | lajes inclinadas |
| C7.61 | Lista de planos com nome editável, indicação de plano já atribuído, cor por plano e valores (cota ou inclinação). | Falta | lajes inclinadas e planos |
| C7.62 | Atribuir um plano a panos do grupo, que passam a ter a cor do plano. | Falta | lajes inclinadas e planos |
| C7.63 | Plano inclinado por três pontos com desnível de cada um em relação ao pavimento. | Falta | lajes inclinadas e planos |
| C7.64 | Plano por reta horizontal (dois pontos com a mesma cota) e inclinação perpendicular a ela. | Falta | lajes inclinadas e planos |
| C7.65 | Plano por linha de máxima declividade (dois pontos), desnível do primeiro e inclinação. | Falta | lajes inclinadas e planos |
| C7.66 | Definição numérica ou gráfica sobre a planta, com captura do gabarito. O cursor muda de cor sobre eixo ou face de viga. | Falta | lajes inclinadas e planos |
| C7.67 | Editar plano na planta: arrastar pontos e reescrever cotas/inclinações sobre o texto. | Falta | lajes inclinadas e planos |
| C7.68 | Editar plano numericamente. | Falta | lajes inclinadas e planos |
| C7.69 | Seta indicando o sentido descendente da máxima declividade no pano. Aviso quando as nervuras não são paralelas ou perpendiculares a ela. | Falta | lajes inclinadas e planos |
| C7.70 | Incoerência de inclinação entre vigas e pano adjacente detectada (vigas em vermelho) e corrigida por clique, copiando a inclinação do pano. | Falta | lajes inclinadas e planos |
| C7.71 | Casos-guia: só panos inclinados (desníveis positivos), pano horizontal numa extremidade (desníveis negativos no grupo superior com vigas comuns), horizontais nas duas extremidades (rampa num grupo intermediário) e sobreposições na projeção (um grupo por cota). | Falta | lajes inclinadas e planos |
| C7.72 | Sequência recomendada: grupos, panos horizontais, vigas comuns, panos a inclinar (vigas de transição ajustadas às interseções do gabarito), planos e atribuição. | Falta | lajes inclinadas e planos |
| C7.73 | Projeção horizontal da viga pelo eixo ou pela face, com a face superior desenhada em linha contínua (cumeeira mais larga, rincão mais estreito). | Falta | lajes inclinadas e planos |
| C7.74 | Rotação da seção de vigas horizontais (cumeeira, borda) para acompanhar o pano, só em vigas planas. Sem coincidência com a interseção, não gira e ganha altura para os dois panos. | Falta | lajes inclinadas e planos |
| C7.75 | Limitações: pano inclinado não se apoia em muro, e não há viga comum com o coroamento de muro. | Falta | lajes inclinadas e planos |
| C7.76 | Na planta de formas, valor da inclinação junto ao texto de desnível, com croqui opcional do pavimento (pilares, eixos de vigas, setas de inclinação) em quadro de tamanho configurável. | Falta | lajes inclinadas e planos |
| C7.77 | Exemplos: telhado de duas águas, mansarda com águas-furtadas, rampa de garagem para subsolo (grupo intermediário, pilares próprios, muro na base, viga comum no topo) e rampa entre pavimentos de estacionamento. Curvas de rampa de preferência em plano horizontal. | Falta | lajes inclinadas e planos |
| | **7.1.4 Aberturas** | | |
| C7.78 | Aberturas retangulares com escolha do tipo de viga de borda, nos quatro modos a seguir. | Parcial | abertura em laje (polígono); sem viga de borda automática |
| C7.79 | Abertura retangular paralela a uma viga escolhida (dois cantos internos opostos). | Falta |  |
| C7.80 | Abertura retangular com ângulo zero (dois cantos). | Parcial | abertura por contorno |
| C7.81 | Abertura retangular no ângulo das nervuras do pano (paralela aos eixos gerais se o pano estiver vazio). | Falta |  |
| C7.82 | Abertura retangular com qualquer ângulo (dois pontos de um lado e arraste até o lado oposto). | Falta |  |
| | **7.1.5 Opções de lajes** | | |
| C7.83 | Limites de flecha ativa das lajes de vigotas (padrões próprios, como nas vigas). | Parcial | limite L/250 fixo |
| C7.84 | Limites de flecha total a longo prazo das lajes de vigotas. | Falta |  |
| C7.85 | Cortante em nervuradas moldadas no local (só pela norma espanhola EHE): fórmula alternativa sem dependência da armadura longitudinal. | Fora | EHE |
| C7.86 | Dimensionamento de vigotas treliçadas de aço: todas as barras iguais, banzos iguais ou cada barra independente. | Fora |  |
| | **7.2 Resultados de lajes (lido só o começo)** | | |
| C7.87 | Vistas de resultados das lajes de vigotas na aba de resultados, com a opção de mostrar momentos/tipos combinada com a de mostrar esforços. O texto termina aqui. | Falta | vistas de resultados das lajes |

## Pendente de leitura (só pelo sumário do manual)

- [S7.1] 7.2.1 Lajes de vigotas: vistas, igualar armaduras, erros, informação, atribuição (págs. 80–83).
- [S7.2] 7.2.2 Lajes maciças e nervuradas: armadura sem calcular, opções na aba de resultados, armadura de punção extra nos ábacos (84–86).
- [S7.3] 7.2.3 Lajes alveolares: vistas e catálogo de placas (87).
- [S7.4] 7.2.4 Lajes mistas: dimensionamento e resultados (87–91).
- [S7.5] 7.2.5 Diagramas de esforços em lajes (93).
- [S7.6] 7.3 Desenhos e relatórios de lajes: mistas (relatórios e desenhos), esforços e quantitativo das vigotas, panos inclinados (93–94).
- [S8.1] 8 Escadas: módulo, criação (dados comuns, lances, inserção na obra, ferramentas), editar, apagar, mover, girar (95–104).
- [S8.2] 8.4 Escadas: detalhe de armadura, isovalores de esforços e deslocamentos, dimensionamento, relatórios, desenhos (104–105).
- [S8.3] 8.5 Escadas: configuração (materiais, tabelas de armadura, opções) (106).
- [S9.1] 9.1 Estruturas 3D integradas de aço, madeira e alumínio: menu e programa de barras 3D (108–111).
- [S9.2] 9.2 Ligações metálicas: tipos, dimensionamento, consulta, motivos de não dimensionamento (111–116).
- [S9.3] 9.3 Exportação para outros programas (116).
- [S10.1] 10.1 Cargas nos dados gerais: vento, sismo, resistência ao fogo, hipóteses adicionais, estados-limite e configuração das combinações (118–120).
- [S10.2] 10.2 Cargas por grupo e cargas no nível da fundação (122).
- [S10.3] 10.3 Menu de cargas: cargas de superfície em lajes e cargas lineares automáticas em vigas (122–123).
- [S10.4] 10.4 Desenhos e relatórios de cargas (123).
- [S11.1] 11.1 Placas de base (124).
- [S11.2] 11.2 Fundações: propriedades, painel de lançamento, opções de sapatas, sapatas corridas sob muros, opções gerais (124–128).
- [S11.3] 11.3 Vigas de equilíbrio e de travamento: generalidades, painel, opções (129–132).
- [S11.4] 11.4 Geração automática de sapatas e vigas (132).
- [S11.5] 11.5 Cálculo e resultados: dimensionamento, erros de verificação, eliminar sobreposições (133).
- [S11.6] 11.6 Relatório de fundações e plantas de fundação e de armaduras (133–134).
- [S12.1] 12.1 Isovalores: janela de hipóteses e pavimentos, menu de esforços, menu de lajes maciças/nervuradas, menu de janela (136–138).
- [S12.2] 12.2 Deformada: vista 3D e escala de cores (138–139).
- [S13.1] 13.1 Tabelas de armadura: uso e restauração dos padrões (140).
- [S13.2] 13.2 Biblioteca de seções: edição individual e gerenciador (usar, editar, criar bibliotecas) (140–141).
