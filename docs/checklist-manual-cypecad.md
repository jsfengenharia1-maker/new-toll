# Checklist de paridade com o manual do usuário do CYPECAD

Comparação item a item entre as funcionalidades do manual do usuário do CYPECAD (edição em inglês, set/2010, 141 págs., lido inteiro em duas partes; figuras não extraídas) e o Statikos em 20/10/2026. Descrições com palavras próprias (reconstrução limpa: nada de texto, nomes de comando ou telas copiados). Paridade é de funcionalidade, nunca de implementação. As hipóteses e os critérios de cálculo estão em `checklist-manual-calculo-cypecad.md`.

Situação: **Feito**, **Parcial** (existe com menos opções), **Falta**, **Fora** (fora do escopo decidido: normas estrangeiras, aço/misto/madeira no edifício, sismo, serviços em nuvem, ou recomendação ao usuário sem função no programa). Frente: quem cobre o item no plano (`docs/plano-frentes.md`).

## Resumo por capítulo

| Capítulo | Itens | Feito | Parcial | Falta | Fora |
|---|---|---|---|---|---|
| 0. Apresentação do programa | 4 | 1 | 2 | 0 | 1 |
| 1. Introdução ao programa: tela, ajuda, criação de obra e arquivos | 56 | 15 | 14 | 17 | 10 |
| 2. Gabaritos DXF/DWG | 22 | 5 | 9 | 5 | 3 |
| 3. Grupos e pavimentos | 41 | 25 | 7 | 6 | 3 |
| 4. Pilares | 63 | 25 | 17 | 14 | 7 |
| 5. Muros e paredes estruturais | 30 | 0 | 0 | 26 | 4 |
| 6. Vigas | 108 | 13 | 17 | 53 | 25 |
| 7. Lajes | 195 | 21 | 32 | 75 | 67 |
| 8. Escadas | 65 | 0 | 0 | 65 | 0 |
| 9. Estruturas de aço, madeira e alumínio | 50 | 0 | 0 | 0 | 50 |
| 10. Cargas | 26 | 7 | 8 | 8 | 3 |
| 11. Fundações | 70 | 31 | 19 | 15 | 5 |
| 12. Isovalores e deformada | 22 | 0 | 0 | 22 | 0 |
| 13. Tabelas e bibliotecas | 11 | 4 | 0 | 0 | 7 |
| **Total** | **763** | **147** | **125** | **306** | **185** |

## Pendências por frente

| Frente | Parcial | Falta | Total |
|---|---|---|---|
| R — Revisão de resultados e detalhamento (R1–R6 concluídas; o resíduo é a fatia R7, subfatias R7a–R7g, marcadas nas notas; auditoria de 20/10/2026 com a R7-0) | 18 | 19 | 37 |
| N — Cálculo e normas (pendências na N2: `spec-frente-N2.md`, fatias N2a–N2g marcadas nas notas) | 11 | 13 | 24 |
| E — Elementos estruturais (E1 e E2 especificadas em `spec-frente-E1.md` e `spec-frente-E2.md`, fatias E1a–E1e e E2a–E2e marcadas nas notas; E3 e E4 em `spec-frente-E3.md` e `spec-frente-E4.md`, fatias E3a–E3f e E4a–E4e marcadas nas notas) | 29 | 198 | 227 |
| FU — Fundações integradas (FU1 concluída, núcleo e interface; FU2 concluída em 20/10/2026) | 20 | 18 | 38 |
| L — Produtividade de lançamento (spec: `spec-frente-L.md`, fatias L1–L5 marcadas nas notas) | 40 | 31 | 71 |
| V — Visualização (spec: `spec-frente-V.md`, fatias V1–V5 marcadas nas notas) | 7 | 27 | 34 |

## 0. Apresentação do programa

| Item | Funcionalidade (palavras próprias) | Situação | Frente | Statikos |
|---|---|---|---|---|
| C0.1 | Programa para edifícios de concreto armado e aço que reúne análise espacial, dimensionamento dos elementos, edição de armaduras e seções e desenhos de execução. | Parcial | E | análise espacial, dimensionamento, pranchas de formas, locação e armação (R5); sem aço no edifício [E4e] |
| C0.2 | Análise tridimensional da estrutura completa (elementos verticais e lajes), incluindo as fundações. | Parcial | N | grelha por pavimento + pórtico espacial (não é um modelo único: frente N); fundação em módulo à parte (FU) [N2b] |
| C0.3 | Dimensionamento automático dos elementos de concreto armado e de aço. | Feito | — | concreto armado dimensionado no edifício (NBR 6118); aço no edifício fora do escopo (o Pórtico 2D dimensiona aço pela NBR 8800) |
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
| C1.6 | Barra de atalhos configurável: o usuário põe e tira botões. | Falta | L | barra configurável pelo usuário [L4] |
| C1.7 | Cor de fundo da área de desenho à escolha entre branco, cinza e preto, para contraste com os elementos. | Feito | — | temas escuro, claro e preto e branco |
| | **1.2 Ajuda na tela** | | | |
| C1.8 | Ajuda contextual por tecla de função (F1): destaca os itens que têm ajuda e mostra a explicação do item clicado, inclusive de itens dentro de menus. | Falta | L | ajuda contextual (F1) por item [L4] |
| C1.9 | Botão de ajuda na barra de título que liga o mesmo modo de ajuda, válido também para os ícones das barras. | Falta | L | modo de ajuda [L4] |
| C1.10 | O modo de ajuda se desliga com o botão direito, com um novo clique no botão ou com Esc. | Falta | L | [L4] |
| C1.11 | As janelas de diálogo têm botão de ajuda próprio na barra de título. | Parcial | L | dicas fixas nos painéis [L4] |
| C1.12 | Botão de informação geral sobre o conteúdo da janela, presente em várias janelas. | Parcial | L | dicas e aba Premissas [L4] |
| C1.13 | Guia rápido que reúne as ajudas das opções das abas, para consultar e imprimir. As ajudas dos diálogos não entram no guia. | Parcial | L | README e docs/ia.md; sem guia rápido imprimível na interface [L4] |
| | **1.3 Criação de obra** | | | |
| C1.14 | Obra nova com pasta, nome e descrição. | Parcial | L | nome e cidade da obra; sem descrição longa [L1] |
| C1.15 | Escolha do modo de criação: obra vazia (lançamento manual), lançamento automático por DXF/DWG, lançamento automático por IFC ou exemplo de lançamento automático. Os modos automáticos dependem de licença. | Parcial | L | novo padrão ou vazio; sem lançamento automático por DXF/IFC [L1] |
| C1.16 | Assistente passo a passo no lançamento automático, que pede pavimentos, alturas e cargas. | Falta | L | assistente de nova obra (pavimentos, alturas, cargas) [L1] |
| C1.17 | O lançamento automático gera o contorno do edifício e os elementos de apoio. | Falta | L | lançamento automático [L2] |
| C1.18 | Lançamento por DXF/DWG: carrega um ou vários arquivos como gabarito. | Falta | L | lançamento automático por DXF [L2] |
| C1.19 | No assistente DXF/DWG, troca das cores das camadas e escolha das camadas visíveis. | Parcial | L | cores/visibilidade de camadas existem na máscara, não em assistente [L2] |
| C1.20 | No assistente DXF/DWG, associação de cada arquivo a grupos de pavimentos. | Parcial | L | uma máscara por grupo [L2] |
| C1.21 | No assistente DXF/DWG, escolha das camadas que definem a geometria de cada tipo de elemento. | Falta | L | camada → tipo de elemento (pilar, contorno, abertura) [L2] |
| C1.22 | Lançamento por IFC: importa o arquivo e depois pede os dados do edifício e dos pavimentos. | Falta | L | IFC [L3] |
| C1.23 | No lançamento por IFC, os materiais do arquivo são ligados a tipos de elemento estrutural, com propriedades atribuídas a cada seleção. | Falta | L | IFC [L3] |
| C1.24 | Ao fim do lançamento automático, a obra é gerada e abre a janela de dados gerais (normas e propriedades da obra). | Falta | L | [L1] |
| C1.25 | Depois do lançamento automático, todos os dados ficam editáveis. Lajes, cargas adicionais, fundações e dados particulares são completados à mão. | Fora | — | depende do lançamento automático |
| C1.26 | Roteiro recomendado, passo 1: dados gerais (nome, descrição, materiais e opções, nível de controle de execução). | Feito | — | obra + norma (fck, aço, CAA, cobrimentos, ψ) |
| C1.27 | Passo 2: pavimentos (níveis, grupos, alturas, cargas variáveis e permanentes). | Feito | — | pavimentos, grupos, uso, cargas |
| C1.28 | Passo 3: pilares e pilares-parede (geometria e posição). | Parcial | L | pilares sim; pilar-parede só aviso [L1] |
| C1.29 | Passo 4: muros e paredes de apoio. | Falta | L | muros e paredes estruturais [L1] |
| C1.30 | Passo 5: vigas. | Feito | — | vigas |
| C1.31 | Passo 6: lajes. | Feito | — | lajes |
| C1.32 | Passo 7: cargas especiais, como as de paredes divisórias. As cargas gerais vêm dos pavimentos, e o peso próprio de pilares, muros, vigas e lajes é gerado automaticamente. | Feito | — | cargas especiais, alvenaria da máscara; peso próprio automático |
| C1.33 | Passo 8: escadas. | Falta | E | escadas [E4b] |
| C1.34 | Passo 9: estruturas 3D integradas, definidas no módulo de barras metálicas 3D. | Falta | E | estruturas 3D integradas [E4e] |
| C1.35 | Passo 10: fundações (sapatas, vigas de equilíbrio e de travamento). O radier é lançado como laje no nível da fundação. | Parcial | FU | FU1: sapatas, blocos e tubulões lançados no edifício, na planta de fundação e no grupo Fundação (`src/core/building/fundacao.ts`, `Fundacao.tsx`, comandos `fundacao.*`); faltam vigas de equilíbrio e travamento (FU2) e radier (FU6) |
| C1.36 | Passo 11: cálculo da estrutura. | Feito | — | Calcular (worker) |
| C1.37 | Passo 12: conferir os erros e corrigir as dimensões, recalculando até não restar erro que peça mudança de dimensão. A cada ciclo o peso próprio é reajustado. | Feito | — | lista de erros e avisos com contagem, filtros e clique para o elemento na planta; janela de resultados por elemento; peso próprio recalculado (R1) |
| C1.38 | Passo 13: preparar os resultados antes dos desenhos (editar ou uniformizar armaduras de lajes, modificar armaduras e agrupar pilares, reposicionar textos). | Parcial | R | armaduras de vigas, pilares e vigotas editáveis e bloqueáveis antes das pranchas (R2, R6) e pilares iguais agrupados no quadro (R5); sem editar/uniformizar a armadura das lajes maciças nem reposicionar textos [R7e] |
| C1.39 | Passo 14: desenhos e relatórios, pelo comando de impressão ou pelos ícones de configuração. | Feito | — | memorial e pranchas de formas, locação e armação de vigas, pilares e lajes em PDF/DXF/DWG (R5) |
| | **1.3.3 Gestão de arquivos** | | | |
| C1.40 | Lista das 6 últimas obras abertas e lista completa, em ordem cronológica, das obras abertas naquela versão. | Parcial | L | trabalho no navegador e arquivo .statikos; sem lista de obras recentes no edifício [L1] |
| C1.41 | Importação de arquivo texto ASCII, em colunas ou separado por vírgulas (planilhas ou outros programas), para gerar fundações. | Falta | L | importar cargas de fundação por texto/CSV [L1] |
| C1.42 | A importação ASCII traz as hipóteses de carga, os esforços nos arranques por hipótese simples e as dimensões da base dos pilares. | Falta | L | [L1] |
| C1.43 | Fluxo da importação ASCII: nome da obra a criar, escolha do arquivo e depois cálculo. | Falta | L | [L1] |
| C1.44 | Obras de exemplo acessíveis pelo gerenciador de arquivos. | Parcial | L | edifício padrão; sem obras de exemplo completas [L1] |
| C1.45 | Busca de obras na pasta por palavra no nome ou na descrição. | Parcial | L | busca na biblioteca do Pórtico; edifício não vai à biblioteca [L1] |
| C1.46 | Compactação de todos os arquivos da obra num único arquivo de formato próprio. | Feito | — | arquivo único .statikos com modelo, log e histórico |
| C1.47 | Envio da obra compactada por e-mail ou só gravação do compactado numa pasta. | Fora | — | e-mail fora do app (arquivo único) |
| C1.48 | Opção de incluir no compactado as cópias de segurança de versões anteriores e os arquivos associados (resultados do último cálculo). | Parcial | L | log de comandos no arquivo; sem cópias de versões [L1] |
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
| C2.3 | Ponto fixo dos pilares marcado numa camada própria, por polígono fechado que contém o ponto a usar como fixo. | Falta | L | ponto fixo por camada no lançamento automático [L2] |
| C2.4 | Recomendação: gabaritos ou camadas diferentes para cada grupo quando o desenho da obra é completo (térreo, tipo, cobertura...). | Fora | — |  |
| C2.5 | Gerenciador de vistas de gabarito acessível pela barra principal. | Parcial | L | grupo Máscara por grupo de pavimentos [L2] |
| C2.6 | Anexação de gabaritos DXF/DWG à obra, com lista dos importados. | Parcial | L | DXF importado por grupo; DWG não [L2] |
| C2.7 | Gerenciador de camadas por gabarito: ligar/desligar, renomear, mudar cor. | Parcial | L | ligar/desligar e cor; sem renomear [L2] |
| C2.8 | Espessura de linha por camada, com valor digitado quando a espessura vem do tamanho. | Falta | L | espessura de linha por camada da máscara [L2] |
| C2.9 | Mostrar ou ocultar os textos de cada camada. | Parcial | L | textos da máscara aparecem; sem ligar/desligar só os textos [L2] |
| C2.10 | Permitir ou não capturas (snap) nas entidades de cada camada. | Feito | — | camada capturável |
| C2.11 | Pré-visualização do resultado da configuração de camadas ao lado da lista. | Falta | L | prévia da configuração de camadas [L2] |
| C2.12 | Conceito de vista: conjunto de camadas, escala e origem de um desenho. Em geral uma vista por grupo, cada uma ligada a um gabarito com seleção própria de camadas. | Parcial | L | máscara por grupo com camadas e transformação; uma por grupo [L2] |
| C2.13 | Operações sobre vistas: adicionar, apagar, copiar, deslocar, transformar, associar a grupos, abrir e salvar configuração. | Parcial | L | importar, alinhar, editar, remover; sem copiar vista nem salvar configuração [L2] |
| C2.14 | Transformação do gabarito (deslocamento e escala) por valores digitados ou graficamente. | Feito | — | escala, origem e rotação numéricas e por 2 pontos |
| C2.15 | Mudança gráfica da origem de coordenadas do gabarito. | Feito | — | alinhar por pontos |
| C2.16 | Retorno à origem original do desenho, desfazendo todas as mudanças de origem. | Parcial | L | editar volta valores; sem botão “origem original” [L2] |
| C2.17 | Ajuste de escala desconhecida: marcar os dois pontos de um segmento e informar sua medida real. | Feito | — | escala por segmento de medida conhecida |
| C2.18 | Escolha dos grupos em que cada vista aparece. | Parcial | L | uma máscara ligada a um grupo [L2] |
| C2.19 | Janela rápida para ligar/desligar vistas por pavimento. | Falta | L | janela rápida de vistas por pavimento [L2] |
| C2.20 | Janela de seleção dos modos de captura de objetos (snap) do DXF/DWG. | Feito | — | tipos de captura |
| C2.21 | Tecla de função (F3) liga/desliga as capturas. Se nenhum modo estiver escolhido, abre a janela de seleção. | Parcial | L | liga/desliga capturas (botão); tecla própria a conferir [L2] |
| C2.22 | Nas pranchas, opção de desenhar o gabarito DXF/DWG associado a cada pavimento. | Falta | R | máscara nas pranchas (fora da R5) [R7g] |

## 3. Grupos e pavimentos

| Item | Funcionalidade (palavras próprias) | Situação | Frente | Statikos |
|---|---|---|---|---|
| C3.1 | Até 5 pavimentos por grupo. | Fora | — | sem limite de pavimentos por grupo (escolha) |
| C3.2 | Grupo: conjunto de pavimentos iguais e consecutivos, com a mesma armadura. | Feito | — | grupo = pavimentos iguais |
| C3.3 | Num grupo, os dados são lançados uma vez para todos os pavimentos. | Feito | — |  |
| C3.4 | Os resultados na tela são a envoltória dos pavimentos do grupo. | Parcial | N | vigas e vigotas pela envoltória dos pavimentos do grupo, armadura das lajes maciças pela envoltória do grupo (R4); resultados das lajes na tela por pavimento [N2d] |
| C3.5 | O dimensionamento é único para todos os pavimentos do grupo. | Feito | — | vigas, lajes maciças e vigotas dimensionadas uma vez pela envoltória do grupo (R3a, R4, R6); pilares por lance |
| C3.6 | Desenho único por grupo (uma planta de formas, um desenho de vigas etc.). | Feito | — | uma prancha de formas por grupo |
| C3.7 | Regra: só é preciso separar grupos onde um elemento vertical (pilar, pilar-parede, muro) ou viga inclinada nasce ou morre. | Parcial | L | verificação avisa pilar que nasce/morre [L4] |
| C3.8 | Sem pavimentos, só existe a criação. Depois aparecem apagar pavimentos, editar pavimentos, editar grupos, unir grupos e dividir grupos. | Feito | — | pavimento criar/editar/remover/repetir; grupo criar/editar/remover/desvincular |
| C3.9 | Novos pavimentos criados agrupados ou isolados. | Feito | — |  |
| C3.10 | Dados dos novos pavimentos: quantidade, alturas, carga variável, carga permanente (revestimento etc.) e nome de cada pavimento. | Feito | — | cota, nome, grupo; cargas por grupo |
| C3.11 | Categoria de uso do grupo escolhida entre as já definidas. Sem categorias definidas, fica a padrão e pode ser trocada depois. | Feito | — | uso NBR 6120 por grupo |
| C3.12 | As categorias de uso disponíveis dependem da norma (ex.: no Eurocódigo, residencial, escritórios, reunião, comércio, depósitos, veículos ≤ 30 kN, veículos de 30 a 160 kN e coberturas). | Parcial | L | usos da NBR 6120 (6 categorias) [L1] |
| C3.13 | Categoria de uso: conjunto de hipóteses variáveis (automáticas ou adicionais) que se combinam com as demais usando os mesmos coeficientes. | Feito | — | R7-0: classes de uso da NBR 6118 (Tabela 11.2) como casos próprios QB (escritórios) e QC (garagens) com ψ da classe, editável (`norma.definir psiUso`); `casosDaObra`/`casoUsoDoGrupo` em `types.ts`, opção `categoriasUso`; residencial, serviço, áreas comuns e cobertura no caso Q |
| C3.14 | Combinação correta das variáveis quando há categorias diferentes por pavimento. | Feito | — | R7-0: carga de uso de cada grupo no caso da sua classe (`analitico.ts`), combinados como variáveis distintas (principal e acompanhante, cada uma sozinha) em `combinacoes.ts`; teste `r70.test.ts` |
| C3.15 | As categorias da obra são escolhidas nos dados gerais, junto das hipóteses adicionais. | Feito | — | grupo Casos de carga na aba Edifício (N1c) |
| C3.16 | A categoria é atribuída a cada grupo na edição de grupos, pelo menu de cargas ou pelo de pavimentos. | Feito | — |  |
| C3.17 | As categorias podem ser definidas antes ou depois dos grupos. No lançamento automático, sempre depois. | Feito | — |  |
| C3.18 | Várias categorias no mesmo grupo: sem carga variável geral, com cargas lançadas em posições diferentes, cada uma ligada à sua hipótese e categoria. | Falta | N | várias categorias no mesmo grupo [N2a] |
| C3.19 | Aviso: cada categoria a mais aumenta o número de combinações e o tempo de cálculo. | Fora | — |  |
| C3.20 | Cota do plano de fundação definida na edição de pavimentos, com reajuste automático das cotas de todos os pavimentos. | Feito | — | profundidade da fundação |
| C3.21 | Renomear pavimentos na edição de pavimentos. | Feito | — |  |
| C3.22 | Unir pavimentos num grupo, selecionando-os. | Parcial | L | mudar o grupo do pavimento; sem “unir grupos” em lote [L4] |
| C3.23 | Editar grupos (nome, cargas, categoria de uso), com destaque no esquema dos pavimentos selecionados. | Feito | — | grupo.editar |
| C3.24 | Dividir um grupo, separando seus pavimentos. | Feito | — | grupo.desvincular |
| C3.25 | Copiar para o grupo atual o conteúdo de outro grupo escolhido no esquema, com origem e destino em cores diferentes. | Parcial | L | viga.copiarParaGrupos (só vigas) [L4] |
| C3.26 | Recarregar o grupo da última gravação, perdendo as alterações posteriores, com confirmação. | Fora | — | desfazer cobre isso |
| C3.27 | Informação de áreas do grupo: total (inclui a área de pilares e muros), vigas e lajes. | Parcial | L | área de lajes e quantitativos; sem quadro de áreas do grupo [L4] |
| C3.28 | Consulta das cotas relativas e absolutas de cada pavimento. | Feito | — | cotas e pé-direito |
| C3.29 | Mudar posição e representação das referências (textos) dos elementos com dois cliques (texto e novo local). | Falta | L | mover textos de referência na planta [L4] |
| C3.30 | Ligar/desligar de forma permanente as referências na planta, escolhendo os tipos de texto visíveis. | Parcial | L | camadas de exibição na planta; sem escolher tipos de texto [L4] |
| C3.31 | Corte vertical do edifício por linha traçada, visto na tela e nas pranchas. | Falta | V | cortes verticais do edifício [V2] |
| C3.32 | Cortes do edifício sem limite de número, cada um com nome. Editar e apagar. | Falta | V | [V2] |
| C3.33 | Cortes do edifício ativáveis na prancha de cada planta, com tamanho configurável. | Falta | V | [V2] |
| C3.34 | Linhas de seção em qualquer direção no pavimento, com diagrama da seção. A janela da seção abre automaticamente. | Falta | V | linhas de seção no pavimento [V2] |
| C3.35 | Vista 3D do grupo atual ou de um intervalo de grupos/pavimentos. | Feito | — | vista 3D por grupo, intervalo de pavimentos ou um pavimento: `construirCena` (`src/core/vista3d/cena.ts`), aba 3D (`src/app/vista3d/Vista3D.tsx`) [V1] |
| C3.36 | Vista 3D do edifício completo, incluindo as estruturas 3D integradas. | Feito | — | edifício completo na vista 3D (pilares, vigas, lajes e fundações); aço fora [V1] |
| C3.37 | Vista 3D com cor e textura por tipo de elemento (pilares, vigas, lajes etc.). | Feito | — | cor por tipo (tokens `--v3d-*` nos três temas) e textura procedural opcional [V1] |
| C3.38 | Rotação da vista 3D por barras: em torno de z e em torno de x. | Feito | — | barras de azimute e elevação e arrastar (`camera.ts`, `controles.ts`) [V1] |
| C3.39 | Alternância entre projeção cônica (perspectiva) e isométrica. | Feito | — | perspectiva e isométrica preservando o enquadramento (`alternarProjecao`) [V1] |
| C3.40 | Na perspectiva, navegação livre por dentro da estrutura. | Feito | — | modo caminhar: altura do olho 1,6 m, W A S D e setas, velocidade ajustável, limites do edifício [V1] |
| C3.41 | Lajes e paredes com transparência na vista 3D, para mostrar os elementos ocultos. | Feito | — | transparência de lajes e paredes de 0 a 100 %; as paredes entram com a E1 (gerador registrado em `GERADORES_3D`) [V1] |

## 4. Pilares

| Item | Funcionalidade (palavras próprias) | Situação | Frente | Statikos |
|---|---|---|---|---|
| | **4.1 Lançamento** | | | |
| C4.1 | Lançamento de pilares, pilares-parede e arranques. | Parcial | E | pilares sim; pilar-parede só aviso; arranque não [E1b] |
| C4.2 | Sem pavimentos definidos, só arranques podem ser lançados. | Feito | — | FU1: arranque (nasce e morre "fundacao") aceito sem pavimentos (`refsPilar`, `pilares.ts`); na interface, "Novo vazio", opção Arranque da ferramenta Pilar (a planta vai para o nível de fundação) e cálculo só da fundação (`calculo.worker.ts`; e2e FU1 "obra vazia"); pilar comum segue recusado |
| C4.3 | Depois do lançamento: editar, mover, ajustar, mudar ponto fixo e ângulo, coeficientes de engastamento, comprimentos de flambagem e cargas. | Feito | — | editar, mover, ponto fixo, ângulo, engaste por lance (N1a), flambagem (N1b) e cargas no lance (N1c) |
| C4.4 | Arranque: pilar de altura zero para dimensionar a fundação (sapatas, radier etc.) sem lançar a estrutura nem os grupos. | Feito | — | FU1: arranque (`ehArranque`, types.ts) lançado pela opção Arranque da ferramenta Pilar (`Edificio.tsx`, `Planta.tsx`), hachurado só na planta de fundação, com cargas levadas à fundação (`reacoesArranques`, analitico.ts); obra só de arranques calcula só a fundação (worker, `dimensionar` da CLI) |
| C4.5 | Cargas no topo do arranque, que representam as cargas transmitidas à fundação. | Feito | — | FU1: `carga.pilar` no arranque vai para o topo (lance "fundacao"), por caso e em eixos globais; interface: `CargasNoPilar` (`Vinculos.tsx`) no grupo Fundação ao selecionar o arranque na planta de fundação |
| C4.6 | Dois comandos de cálculo: a obra sem fundação e a obra com fundação. | Feito | — | FU1: botões "Calcular e dimensionar" (obra com fundação) e "Calcular sem fundação" na aba Dimensionamento, e "Calcular fundações" (só as fundações, com a análise em vigor); `store.ts` (`calcular(semFundacao)`, `calcularFundacao`, `revFund`), `calculo.worker.ts` (pedido `fundacao`, sem refazer a análise) e `Sessao.revFundacao` |
| C4.7 | Pilar novo: grupo inicial e grupo final. | Feito | — | nasce/morre |
| C4.8 | Pilar novo: coeficientes de engastamento e de flambagem. | Feito | — | engaste (pilar.engaste, N1a) e flambagem (pilar.flambagem, N1b) por lance |
| C4.9 | Pilar novo: ângulo. | Feito | — |  |
| C4.10 | Pilar novo: vinculação exterior. | Parcial | N | base articulada ou com engaste parcial na fundação (pilar.engaste base, N1a); molas e outros vínculos externos ainda não [N2c] |
| C4.11 | Material do pilar por pavimento/tramo (concreto ou aço) e dimensões ou perfil. | Parcial | E | seção por lance; só concreto [E1a] |
| C4.12 | Posicionamento do pilar por clique. | Feito | — | clique, coordenada digitada, captura |
| C4.13 | Pilar que nasce sobre outro pilar. | Parcial | E | pilar que nasce num pavimento; sem checar apoio em pilar de baixo [E1a] |
| C4.14 | Tramos superiores com ponto fixo, ângulo ou dimensões diferentes, podendo parte deles ficar fora da projeção do pilar de baixo. | Parcial | E | seção por lance; ponto fixo/ângulo por lance não [E1a] |
| C4.15 | Empilhamento sem limite de pilares sobre pilares, e mais de um pilar nascendo no mesmo pilar. | Falta | E | vários pilares nascendo sobre um pilar [E1a] |
| C4.16 | Pilar que admite outro por cima (termina antes do último pavimento) muda de cor sob o cursor e mostra um círculo de referência no eixo. | Falta | E | [E1a] |
| C4.17 | Coordenadas do ponto fixo do novo pilar relativas às do pilar de baixo. | Falta | E | [E1a] |
| C4.18 | Captura DXF/DWG de eixo, cantos ou ponto médio das faces do pilar de baixo, sem pedir coordenadas. | Parcial | E | capturas no contorno do pilar existente [E1a] |
| C4.19 | Referência automática do pilar que nasce: referência do pilar de baixo seguida de letra sequencial (a, b, ...). | Falta | E | nome automático com sufixo para pilar que nasce [E1a] |
| C4.20 | Pilares que não se sobrepõem são lançados como pilares comuns. | Feito | — |  |
| C4.21 | O topo do pilar de baixo não usa o coeficiente de engastamento do último pavimento. Os elementos apoiados nele são tidos como engastados por padrão. | Feito | — | lances intermediários usam o próprio coeficiente; o das opções vale só no topo do último lance (N1a) |
| C4.22 | Engastamento parcial só no topo do último tramo. Pode-se articular o pilar que chega a uma viga ou definir engaste parcial na base do pilar novo. | Feito | — | engaste parcial ou rótula no topo e na base de qualquer lance (N1a) |
| C4.23 | A transmissão de esforços entre pilares sobrepostos considera a excentricidade. O detalhe construtivo fica com o usuário. | Falta | N | excentricidade entre pilares sobrepostos [N2c] |
| C4.24 | Pilar que nasce sobre outro não admite vinculação exterior. | Falta | E | [E1a] |
| C4.25 | Edição completa do pilar ou de cada propriedade em separado. | Feito | — | editar tudo ou um campo; quadro de pilares |
| C4.26 | Mudar o ponto fixo do pilar sem mover o pilar, aplicando o novo ponto fixo a vários pilares. | Parcial | L | pilar.editar muda o ajuste; sem “sem mover” em lote [L4] |
| C4.27 | Ponto fixo dos pilares visível durante o lançamento de vigas e lajes. | Feito | — | ponto fixo visível |
| C4.28 | Pilar novo com os dados copiados de um pilar existente, escolhido na tela. | Falta | L | copiar dados de um pilar (conta-gotas) [L4] |
| C4.29 | O formulário de pilar novo guarda os dados do último pilar lançado. | Feito | — | ferramenta guarda a última seção |
| C4.30 | Cópia de pilar que leva também as cargas horizontais e as cargas no topo. | Falta | L | [L4] |
| C4.31 | Pilar-parede: geometria composta de retângulos, nome, grupos inicial e final, espessura, vinculação exterior e ângulo. | Falta | E | pilar-parede de retângulos [E1b] |
| C4.32 | Tipos de pilar-parede gravados com a obra, reutilizáveis sem limite. | Falta | E | [E1b] |
| C4.33 | Taxas geométricas mínimas dos pilares por norma e tipo de aço, substituíveis por valores do usuário (cargas estáticas e dinâmicas separadamente). | Parcial | N | taxa mínima fixa (máx(0,15Nd/fyd; 0,4%)); sem valor do usuário [N2c] |
| | **4.2 Resultados de pilares** | | | |
| C4.34 | Após o cálculo, pilares que não passam nas verificações ficam em vermelho e são revisados pela edição na aba de resultados. | Feito | — | pilares com erro em vermelho e aviso em amarelo na planta (R1), revisados pelo editor de armadura da janela do elemento com recálculo (R2) |
| C4.35 | Janela de dimensionamento do pilar, aberta por clique. | Feito | — | janela de resultados do pilar por clique duplo (tabela, lista de erros ou botão na planta) com as combinações determinantes de cada lance (R1) |
| C4.36 | O relatório do cálculo lista os pilares com erro de dimensionamento e indica onde revisá-los. | Feito | — | mensagens por lance |
| C4.37 | Seção em vermelho na tela, no pavimento onde está o erro. | Feito | — | contorno e rótulo do pilar em vermelho (erro) ou amarelo (aviso) no pavimento do lance, com chave Mostrar erros (R1) |
| C4.38 | Tramos com erro marcados com símbolo de aviso e coluna de estado com códigos. O clique mostra o detalhe da verificação e sugestões de correção. | Parcial | R | código e mensagem na lista de erros e na janela do elemento, com legenda dos códigos (R1); sem sugestões de correção por erro [R7g] |
| C4.39 | Erro de taxa excessiva: taxa mecânica aço/concreto acima de 100% ou geométrica acima de 8%. | Feito | — | erro ARMADURA quando nem 4 % de armadura atende (limite da NBR 6118, 17.3.5.3.2), equivalente à taxa máxima; sem taxa mecânica |
| C4.40 | Verificação do cortante contra a compressão oblíqua (bielas), quando a norma pede, e do espaçamento dos estribos quando há armadura transversal. | Feito | — | biela (Vsd/VRd2, erro BIELA) e estribo pelo cortante nos pilares (N1e); espaçamento do estribo verificado na armadura bloqueada (R2) |
| C4.41 | Detalhe do cortante: área longitudinal em X e Y, área de estribo, esforços e cortante resistente em cada direção (Vsd ≤ Vrd). | Parcial | N | Vd por pilar na tabela; sem detalhe por direção [N2c] |
| C4.42 | Aviso de estribo fora da tabela: só um estribo foi colocado. Revisar a tabela de armaduras e a disposição dos estribos. | Falta | N | [N2c] |
| C4.43 | Limite da taxa volumétrica de estribos de confinamento em sismo com ductilidade muito alta. | Fora | — | sismo |
| C4.44 | Verificação de resistência ao fogo da seção do pilar, conforme o especificado. | Falta | N | fogo (NBR 15200) [N2g] |
| C4.45 | Taxa As/Ac (%) mostrada por tramo. | Parcial | R | As por lance na tabela e na janela do pilar; taxa As/Ac não exibida [R7g] |
| C4.46 | Pilares de aço: ao calcular, opções de dimensionar ou não os perfis. | Fora | — | pilar de aço no edifício |
| C4.47 | Dimensionamento de perfis por toda a série (pode trocar por menor) ou só por perfis maiores ou iguais ao atual. | Fora | — |  |
| C4.48 | Testar outro perfil da série com verificação imediata. | Fora | — |  |
| C4.49 | Lista dos perfis da série com peso por metro, aproveitamento (%) e erros. | Fora | — |  |
| C4.50 | Botão para voltar ao perfil ótimo proposto pelo dimensionamento. | Fora | — |  |
| C4.51 | Dados do pilar no dimensionamento: ângulo, engastamento, desnível e profundidade do apoio. | Falta | R | ângulo, engaste e desnível não aparecem na janela do pilar (estão nos grupos de seleção e Vínculos) [R7g] |
| C4.52 | Planta de situação dos pilares dos pavimentos selecionados. Pilares não dimensionados (armadura manual) em vermelho, e clique para passar a outro pilar. | Parcial | R | planta do pavimento com pilares em vermelho/amarelo e botão "Resultados do elemento" (R1); sem planta de situação dentro da janela nem navegação pilar a pilar [R7g] |
| C4.53 | Bloqueio da armadura de pilares: recalcula a estrutura sem mudar a armadura bloqueada (preserva edições manuais). | Feito | — | armadura do pilar editada e bloqueada por lance (pilar.armadura; janela do elemento e bloqueio em lote), só verificada no recálculo (R2) |
| C4.54 | Pilares bloqueados passam pela verificação completa da norma a cada recálculo, e os que falham ficam em vermelho. | Feito | — | verificação completa por fibras a cada recálculo; reprovado = ARM_BLOQ (erro), vermelho na planta e na lista |
| C4.55 | Para redimensionar: desbloquear e redimensionar todos, ou redimensionar pilar a pilar mantendo o bloqueio. | Feito | — | desbloquear todos (`BloqueioLote`) e recalcular, ou desbloquear só o pilar ("Restaurar calculada" em `Armadura.tsx`) e recalcular: os demais continuam bloqueados e só verificados (`dimensionamento.ts`); rearmar sem nova análise é o C6.87 (auditoria de 20/10/2026) |
| C4.56 | Desbloqueio automático quando muda o número de pavimentos que o pilar sustenta. | Parcial | R | bloqueio desconsiderado no recálculo (aviso BLOQ_IGNORADO) quando muda o nº de lances; o desbloqueio não é gravado no modelo [R7f] |
| C4.57 | Uso sugerido do bloqueio: estudar a sensibilidade da armadura ao engastamento, ao coeficiente de reação do solo ou ao radier. | Feito | — | armadura bloqueada permite recalcular a estrutura com outros engastes ou rigidezes e só verificar |
| C4.58 | O bloqueio vale só para pilares de concreto. Em aço, o equivalente é calcular sem dimensionar os perfis. | Fora | — |  |
| C4.59 | Seleção para bloqueio: um a um, por janela, ou bloquear/desbloquear todos. Selecionados em verde, pilares de aço em cinza e não selecionáveis. | Parcial | R | bloquear/desbloquear selecionados na planta (com contagem) ou todos; sem janela própria nem cores de seleção (pilares de aço fora) [R7f] |
| C4.60 | Envoltórias de esforços em pilares e pilares-parede (momentos, cortantes, torção) por hipótese ou por combinação. | Parcial | V | combinações determinantes por lance na janela do pilar (R1); sem diagrama de envoltória por hipótese ou combinação [V5] |
| | **4.3 Desenhos e relatórios de pilares** | | | |
| C4.61 | Mostrar ou ocultar o ponto fixo dos pilares nas pranchas. | Falta | R | ponto fixo nas pranchas (fora da R5) [R7g] |
| C4.62 | Detalhe das condições de estribos (configuradas em pilares, muros e consolos) desenhado no quadro de pilares. | Parcial | E | quadro de pilares com seção, armadura, estribos e grampos por lance (R5); sem o desenho do detalhe das condições de estribos [E1d] |
| C4.63 | Relatório de esforços e armaduras de pilares, pilares-parede e muros, com a verificação de cortante dos pilares de concreto. | Parcial | R | memorial do edifício (detalhamento dos pilares) e listagem CSV com Nd, armadura, estribo, Vd e utilização (R1, R3b); sem relatório por esforço [R7g] |

## 5. Muros e paredes estruturais

| Item | Funcionalidade (palavras próprias) | Situação | Frente | Statikos |
|---|---|---|---|---|
| C5.1 | Tipos de muro: concreto armado, alvenaria de blocos de concreto genéricos (armada), blocos de catálogo de fabricante e alvenaria genérica. | Falta | E | muros de concreto e alvenaria (V2); blocos de catálogo fora [E1e] |
| C5.2 | Dados comuns a todos os tipos: geometria, existência de empuxos laterais e tipo de fundação de apoio. | Falta | E | muros e paredes estruturais (V2) [E1c] |
| C5.3 | Bloco escolhido da biblioteca, com cadastro de blocos novos. | Falta | E | muros e paredes estruturais (V2) [E1e] |
| C5.4 | Série de blocos genéricos com opção de peça de canto, para quando a largura não é metade do comprimento. | Falta | E | muros e paredes estruturais (V2) [E1e] |
| C5.5 | Muros de blocos de fabricante: dimensionamento e verificação pelo Eurocódigo 6, com armadura vertical e/ou horizontal opcional. | Fora | — | Eurocódigo 6 |
| C5.6 | Saídas dos muros de blocos: relatório de cálculo, quantitativo, plantas e esquema em planta dos blocos e das armaduras. | Falta | E | muros e paredes estruturais (V2) [E1e] |
| C5.7 | Escolha de fabricante e modelo de bloco. Peças especiais de canto usadas automaticamente quando o fabricante as tem. | Fora | — | catálogo de fabricante europeu |
| C5.8 | Alvenaria genérica: módulo de elasticidade, módulo de cisalhamento, peso específico, resistência de cálculo à compressão e à tração, e opção de considerar a rigidez ao cisalhamento. | Falta | E | muros e paredes estruturais (V2) [E1e] |
| C5.9 | Aberturas (portas e janelas) em muros de concreto, de alvenaria genérica e de blocos. | Falta | E | muros e paredes estruturais (V2) [E1c] |
| C5.10 | A abertura é lançada no pavimento de baixo dos dois entre os quais fica. | Falta | E | muros e paredes estruturais (V2) [E1c] |
| C5.11 | Em muros de blocos, a abertura se ajusta à modulação dos blocos para evitar peças especiais. | Falta | E | muros e paredes estruturais (V2) [E1e] |
| C5.12 | Verga: em muros de subsolo e de alvenaria genérica não há aviso de tensões excessivas. Em blocos, a verga é verificada e armada. | Falta | E | muros e paredes estruturais (V2) [E1e] |
| C5.13 | Edição da armadura de uma abertura, destacada sob o cursor. | Falta | E | muros e paredes estruturais (V2) [E1d] |
| C5.14 | Armadura padrão de portas, copiada de uma porta e aplicada a várias. | Falta | E | muros e paredes estruturais (V2) [E1d] |
| C5.15 | Armadura padrão de janelas, copiada e aplicada da mesma forma. | Falta | E | muros e paredes estruturais (V2) [E1d] |
| C5.16 | Armadura de vergas em muros de blocos, copiada e aplicada da mesma forma. | Falta | E | muros e paredes estruturais (V2) [E1e] |
| C5.17 | Relatório das verificações da armadura de uma abertura escolhida. | Falta | E | muros e paredes estruturais (V2) [E1d] |
| C5.18 | A armadura das aberturas de muros de concreto é dimensionada para empuxos e para os esforços em vergas e peitoris. | Falta | E | muros e paredes estruturais (V2) [E1d] |
| C5.19 | Sismo com aceleração acima de 0,16 g: armadura inclinada em verga e peitoril. | Fora | — | sismo |
| C5.20 | Com vão livre/altura da verga < 1,5 e tração acima da resistência do concreto, as barras do quadro fazem o papel da armadura inclinada. | Fora | — | sismo |
| C5.21 | Prolongar muro (como as vigas), em todos os grupos onde ele existe. | Falta | E | muros e paredes estruturais (V2) [E1c] |
| C5.22 | Atribuir as propriedades de um tipo de muro a outros muros, um a um ou por janela, inclusive copiando de um muro de outro tipo. | Falta | E | muros e paredes estruturais (V2) [E1c] |
| C5.23 | Vigas embutidas e de coroamento aparecem sobrepostas ao muro em planta e são editáveis junto com ele. | Falta | E | muros e paredes estruturais (V2) [E1c] |
| C5.24 | Opção de armadura: aço da armadura horizontal dos muros de blocos. | Falta | E | muros e paredes estruturais (V2) [E1e] |
| C5.25 | Opção de armadura: resistências da argamassa e dos blocos de fabricante. | Falta | E | muros e paredes estruturais (V2) [E1e] |
| C5.26 | Muro de concreto: armar ou não, sempre ou só quando necessário, só horizontal ou horizontal e vertical, e tipo da armadura horizontal. | Falta | E | muros e paredes estruturais (V2) [E1d] |
| C5.27 | Pilares em contato com muros de alvenaria/blocos são desligados do muro no nível do pavimento, para uma transmissão de esforços mais realista. | Falta | E | muros e paredes estruturais (V2) [E1e] |
| C5.28 | Sapata isolada equivalente para cada pilar sobre sapata corrida, dimensionada com os esforços do pilar e do trecho de muro apoiado. | Falta | FU | muros e paredes estruturais (V2) |
| C5.29 | Quantitativo de muros de blocos com peças inteiras e especiais (meio bloco, canto). | Falta | E | muros e paredes estruturais (V2) [E1e] |
| C5.30 | Lacuna: o texto do item sobre muros de concreto armado (5.1.2.1) não veio na extração. Só há o título. | Falta | E | pendente: texto não veio na leitura (muros de concreto) [E1c] |

## 6. Vigas

| Item | Funcionalidade (palavras próprias) | Situação | Frente | Statikos |
|---|---|---|---|---|
| | **6.1 Lançamento** | | | |
| C6.1 | Lançamento do contorno do pavimento combinando gabarito DXF/DWG e ferramentas de viga. | Feito | — | vigas sobre a máscara com capturas |
| C6.2 | Ajudas genérica e específica durante o lançamento. | Parcial | L | dicas e mensagens [L4] |
| C6.3 | Painel flutuante de ferramentas aberto depois da escolha do tipo de seção. | Parcial | L | grupo Vigas na barra lateral [L5] |
| C6.4 | Troca do tipo de viga atual a partir do painel. | Feito | — |  |
| C6.5 | Modo contínuo: o fim de uma viga é o início da próxima. A sequência só vale depois de encerrada pelo menu de contexto. | Feito | — | polilinha contínua; Enter encerra |
| C6.6 | Atalhos de teclado: encerrar a sequência (Ctrl+T) e apagar o último ponto (Ctrl+B). | Parcial | L | Enter/Esc; apagar último ponto a conferir [L5] |
| C6.7 | Modo simples: cada viga com início e fim independentes. | Parcial | L | polilinha de 2 pontos [L5] |
| C6.8 | Linha de ajuste da viga: eixo ou uma das faces. | Feito | — | eixo ou face |
| C6.9 | Distinção entre a linha clicada (introdução) e a linha de ajuste, com deslocamento configurável entre elas. | Falta | L | deslocamento configurável entre linha clicada e linha de ajuste [L5] |
| C6.10 | Troca cíclica do ajuste (eixo/faces) por atalho (Ctrl+E) durante o lançamento. | Feito | — | tecla A |
| C6.11 | Deslocamento útil quando o desenho mostra a fachada (com revestimentos) e não o limite estrutural. | Falta | L | [L5] |
| C6.12 | Viga reta por dois pontos e viga curva por três (início, passagem e fim). A curva vira uma poligonal de trechos retos. | Falta | E | viga curva [E2b] |
| C6.13 | Alternância reta/curva por atalho (Ctrl+A) e trechos retos e curvos alternados no modo contínuo, começando por qualquer um dos dois. | Falta | E | [E2b] |
| C6.14 | Janela da viga atual: tipo e propriedades (dimensões, seção, conectores etc.). | Feito | — | seção, invertida |
| C6.15 | Viga plana (faixa) com altura igual ao desnível entre os pontos mais alto e mais baixo da laje que contorna. | Falta | E | viga chata (faixa) [E2a] |
| C6.16 | Viga com altura (descolgada): retangular, T ou com mesa colaborante. A mesa entra na rigidez, mas a armadura usa só a alma. | Parcial | E | retangular; sem T/mesa colaborante [E2a] |
| C6.17 | Vigas treliçadas e protendidas (pré-fabricadas), com propriedades próprias. | Falta | E | treliçadas/protendidas pré-fabricadas [E2e] |
| C6.18 | Viga de vinculação exterior, que simula por exemplo o topo de um muro. Pilares coincidentes precisam ser desligados para não terem o deslocamento vertical travado. | Falta | E | viga de vínculo externo [E2e] |
| C6.19 | Desligamento muro-pilar só em lajes de vigotas. Em lajes maciças/cogumelo, a recomendação é lançar o muro como elemento. | Falta | E | [E1e] |
| C6.20 | A viga de coroamento do topo do muro não é especificada pelo programa. O detalhe fica com o usuário, com apoio da biblioteca de detalhes construtivos. | Fora | — |  |
| C6.21 | Viga não estrutural (limite), que só fecha o contorno de um pano maciço quando a viga de borda é desprezível. | Falta | E | viga não estrutural de contorno [E2a] |
| C6.22 | Vigas de fundação: retangular, L, T ou plana (esta para fechar panos de radier). | Parcial | E | vigas no térreo funcionam como baldrame; sem tipo próprio [E2a] |
| C6.23 | Vigas de aço: perfil simples, caixão soldado, perfis afastados com chapas de ligação, perfis unidos. Usam a mesma biblioteca dos pilares de aço. | Fora | — | vigas de aço no edifício |
| C6.24 | Vigas alveoladas (não mistas): furos hexagonais, octogonais ou circulares, proporções e número de furos preenchidos nas extremidades. | Fora | — |  |
| C6.25 | Vigas mistas: perfil sob a laje com concreto colaborante ligado por conectores de geometria definível. | Fora | — | mistas |
| C6.26 | Engaste parcial fixo de 0,05 na ligação da viga mista com o apoio, para reduzir o negativo e aumentar o positivo. | Fora | — |  |
| C6.27 | Viga mista: no negativo só o perfil resiste, no positivo a seção mista. | Fora | — |  |
| C6.28 | Largura colaborante automática: mínimo entre a largura efetiva calculada e mesa + 10 cm de cada lado. Em viga de borda, mesa + 10 cm. | Fora | — |  |
| C6.29 | Largura efetiva própria para verificar os positivos. A armadura de negativo sobre o apoio não é dimensionada. | Fora | — |  |
| C6.30 | Capturas DXF/DWG (mais próximo, interseção, extremo, ponto médio etc.) ao marcar os pontos da viga, sem ajuste posterior. | Feito | — | capturas |
| C6.31 | Poliviga: vigas consecutivas ligadas, que mudam e são apagadas juntas, com armaduras que podem diferir. | Feito | — | viga em polilinha (vários trechos) |
| C6.32 | Viga curva agrupada por padrão como poliviga e como tramo de armadura predefinido, com opções de compor e decompor. | Falta | E | viga curva e poliviga (vigas curvas: E2) [E2b] |
| C6.33 | Tramo de armadura predefinido: vigas consecutivas sem emenda da armadura inferior em ponto intermediário, enquanto a barra não passa do comprimento máximo configurado. | Parcial | R | barras inferiores corridas sem emenda intermediária enquanto não passam da barra máxima, dentro da viga (R3a); sem tramo predefinido entre vigas consecutivas [R7b] |
| C6.34 | Compor ou decompor muda o número de vãos do pórtico. Para atualizar a armadura, basta redimensionar. | Parcial | R | comandos `viga.unir` e `viga.dividir` (`src/core/commands/vigas.ts`) compõem e decompõem o pórtico e o recálculo redimensiona (bloqueio desconsiderado com BLOQ_IGNORADO); ferramentas Dividir viga (I) e Unir vigas (J) na planta (R7-0, `Planta.tsx`); sem desbloqueio gravado [R7f] |
| C6.35 | Vigas inclinadas de aço ou concreto entre um grupo inicial e um final: simples (uma só) ou múltipla (uma por pavimento). | Falta | E | vigas inclinadas entre grupos [E2c] |
| C6.36 | Diagonais de contraventamento entre grupos inicial e final de pavimento único, podendo atravessar grupos intermediários. | Falta | E | diagonais de contraventamento [E2d] |
| C6.37 | Diagonal simples ou múltipla (uma por pavimento). | Falta | E | [E2d] |
| C6.38 | Diagonal de concreto (largura e altura) ou de aço (perfil da biblioteca, em posição normal ou girada). | Falta | E | [E2d] |
| C6.39 | Ligação das extremidades da diagonal: engastada ou articulada. | Falta | E | [E2d] |
| C6.40 | Coeficientes de flambagem vertical e transversal aplicados ao comprimento total entre nós, em planos globais (não nos eixos locais). O cruzamento entre barras inclinadas não reduz o comprimento. | Falta | E | [E2d] |
| C6.41 | Copiar os dados de uma diagonal existente. | Falta | E | [E2d] |
| C6.42 | Diagonal lançada por clique em dois pontos (ex.: viga de partida e viga oposta), sem trocar de pavimento. Setas indicam a diagonal na planta. | Falta | E | [E2d] |
| C6.43 | Nó gerado no cruzamento de diagonais. Elas são dimensionadas à tração e à compressão, com verificação da esbeltez máxima da norma. | Falta | E | [E2d] |
| C6.44 | Apagar diagonal: em todos os grupos, se for múltipla. | Falta | E | [E2d] |
| C6.45 | Informação da diagonal (tipo, grupos, comprimento real, seção, ligações, flambagem), também desenhada na prancha de vigas do grupo inicial. | Falta | E | [E2d] |
| C6.46 | Editar, mover extremos e atribuir propriedades a diagonais existentes: a operação vale só no grupo atual. | Falta | E | [E2d] |
| C6.47 | Viga comum a dois grupos (ex.: borda entre laje horizontal e laje inclinada), lançada uma vez e criada automaticamente no outro grupo. | Falta | E | viga comum a dois grupos [E2b] |
| C6.48 | Viga comum com eixo em traço-ponto. Armadura e envoltórias são consultadas no grupo de origem. | Falta | E | [E2b] |
| C6.49 | Viga comum em metade do comprimento: cada parte pode ser comum a um grupo diferente. | Falta | E | [E2b] |
| C6.50 | Desfazer viga comum, voltando às duas vigas originais (feito no grupo associado). | Falta | E | [E2b] |
| C6.51 | Contorno externo retangular fora do perímetro atual: com ângulo zero (dois cantos) ou com qualquer ângulo (dois cantos de um lado e um ponto do lado oposto). | Falta | L | contorno retangular [L5] |
| C6.52 | Atribuir as propriedades da viga atual a vigas já lançadas, uma a uma ou por janela. O mesmo vale para muros. | Feito | — | viga.atribuir |
| C6.53 | Prolongar viga por comprimento fixo (pré-visualizado) ou arrastando a extremidade. | Parcial | L | comando `viga.prolongar` até ponto, eixo ou viga, com a ferramenta Prolongar viga (O) na planta (R7-0); sem comprimento fixo nem arraste da extremidade [L5] |
| C6.54 | Consolos curtos para apoiar viga indiretamente no pilar (juntas de dilatação). Não servem para apoiar pilares. | Falta | E | consolos [E2e] |
| C6.55 | Lançamento de consolo: viga até a face do pilar, tipo e geometria do consolo (com área de apoio) e clique na face do pilar. | Falta | E | [E2e] |
| C6.56 | Modelagem do consolo: apoio fixo interno no centro do apoio, transmissão só da carga vertical e viga desligada da face do pilar (sem momento nem cortante). | Falta | E | [E2e] |
| C6.57 | Edição de consolos. | Falta | E | [E2e] |
| C6.58 | Ajuste de vigas à interseção de planos inclinados ou à linha de máxima declividade, indicadas por linhas magenta (contínua ou tracejada). | Falta | E | [E2b] |
| C6.59 | Armadura opcional de vigas no nível das lajes sobre muros de alvenaria genérica e de coroamento em blocos. Em muros de subsolo, a viga é armada no topo. Espessuras mínimas configuráveis. | Falta | E | [E1e] |
| C6.60 | Informação da viga de aço, com a largura efetiva de laje que ela recebe. | Fora | — |  |
| C6.61 | Cobrimentos nas zonas de confinamento (cálculo com sismo), indicados por linhas no editor. | Fora | — | sismo |
| C6.62 | Gravar referências-base de juntas de vigas e de pórticos para usar em obras futuras. | Falta | R | referências-base de juntas [R7f] |
| C6.63 | Lançamento por captura do gabarito: um clique numa linha, arco ou polígono gera uma série de vigas ajustadas pela face (do lado oposto ao cursor) ou pelo eixo. | Falta | L | vigas geradas por clique em linha da máscara [L2] |
| | **6.2 Cálculo e resultados de vigas** | | | |
| C6.64 | Vigas de aço no cálculo: dimensionar a partir do perfil inicial (só maiores ou iguais) ou de toda a série (pode reduzir). | Fora | — | aço |
| C6.65 | Erro: diâmetro do estribo acima de 1/10 da espessura (limite de norma específica). | Falta | R | verificação φt ≤ bw/10 do estribo (NBR 6118, 18.3.3.2) não feita no edifício (existe no Pórtico 2D, `src/core/design.ts`, como aviso: reaproveitar) [R7b] |
| C6.66 | Aviso de desnível longitudinal que pede detalhe especial (estribos adicionais para a continuidade da armadura). | Falta | R | aviso de desnível longitudinal [R7b] |
| C6.67 | Erro de barra mais longa que o máximo quando não é possível dividi-la (> 12 m). | Feito | — | aviso no detalhamento quando a barra passa do comprimento máximo e não cabe a emenda (opção barraMaxima, padrão 12 m; R3a) |
| C6.68 | Relatório de erros das vigas inclinadas após o cálculo. | Falta | E | [E2c] |
| C6.69 | Informação da viga inclinada: tipo, pavimentos, seção ou dimensões, armadura, engastamento e flambagem. | Falta | E | [E2c] |
| C6.70 | Listagem da viga inclinada: materiais, descrição, esforços por hipótese e combinação, envoltórias, aproveitamento (aço), resultado do dimensionamento e erros. | Falta | E | [E2c] |
| C6.71 | Vigas inclinadas com erro em vermelho, com detalhe por clique. | Falta | E | [E2c] |
| C6.72 | Edição de viga inclinada de concreto: geometria (largura e altura), armadura (estribos, superior, inferior, pele), verificação, dimensionamento, detalhamento e vista 3D. | Falta | E | [E2c] |
| C6.73 | Viga inclinada de aço: verificação de outros perfis da série. | Fora | — |  |
| C6.74 | Redimensionar todas as vigas inclinadas de concreto com os esforços do último cálculo. | Falta | E | [E2c] |
| C6.75 | Redimensionar os perfis das vigas inclinadas de aço (só maiores ou toda a série). | Fora | — |  |
| C6.76 | Copiar a armadura entre pórticos do mesmo grupo ou de grupos diferentes (destino escolhido por menu de contexto). | Parcial | R | comando viga.copiarArmadura e botão "Copiar para…" na janela da viga, para vigas do mesmo grupo (R3a); entre grupos só pelo comando [R7f] |
| C6.77 | Na cópia vão diâmetro, número e ancoragem (montagem e 1ª camada inferior), diâmetro, número e comprimento (demais barras) e diâmetro, espaçamento e extensão dos estribos. Não há aviso se a armadura copiada for menor que a necessária. | Parcial | R | a cópia leva nº e bitola inferior, superior e laterais e o estribo da armadura bloqueada; comprimentos saem do detalhamento (R3a) [R7f] |
| C6.78 | Condições para copiar: todos os vãos de concreto e do mesmo tipo (plana ↔ com altura sim, treliçada não), mesmo número de vãos, diferença de vão < 25 cm e desníveis coincidentes. Quando a cópia falha, uma mensagem dá o motivo. | Parcial | R | lista pré-marca vigas de mesma seção e nº de vãos; sem bloqueio nem mensagem por motivo (R3a) [R7f] |
| C6.79 | Copiar a armadura não iguala os desenhos: isso só acontece com geometria idêntica. | Falta | R | sem agrupamento de desenhos de vigas iguais nas pranchas [R7f] |
| C6.80 | Dimensionar as vigas de aço do pavimento a qualquer momento depois do cálculo, e testar outros perfis da série sem recalcular. | Fora | — |  |
| C6.81 | Agrupar pórticos depois do cálculo, sem verificar as condições. Aviso com o motivo quando não é possível. | Falta | R | agrupar pórticos [R7f] |
| C6.82 | Em pórticos agrupados, a mudança em um vale para todos, e sai um único desenho com todas as referências. | Falta | R | [R7f] |
| C6.83 | Desagrupar pórticos e acrescentar pórtico a um agrupamento existente. | Falta | R | [R7f] |
| C6.84 | Bloquear a armadura de pórticos para preservar edições manuais nos recálculos. | Feito | — | viga.armadura bloqueia nº, bitola, estribo e laterais (R2) |
| C6.85 | Pórticos bloqueados só são verificados quanto à área de aço e à flecha. Os que falham aparecem na cor de erro. | Feito | — | bloqueadas verificadas quanto à área de aço, estribos, laterais, fissuração e flecha; reprovada em vermelho (ARM_BLOQ) |
| C6.86 | Desbloqueio automático quando muda o número de vãos do pórtico. | Parcial | R | bloqueio desconsiderado no recálculo (aviso BLOQ_IGNORADO) quando muda o nº de vãos; o desbloqueio não é gravado no modelo [R7f] |
| C6.87 | Redimensionar todos os pórticos ou só os alterados (desbloqueados ou com seção modificada). | Parcial | R | desbloquear todos ou selecionados e recalcular; sem rearmar só os alterados sem recálculo geral [R7f] |
| C6.88 | Seleção de bloqueio por grupo: todos, nenhum ou seleção gráfica (contorno vermelho), com a contagem de selecionados. | Parcial | R | bloquear/desbloquear selecionados na planta (com contagem) ou todos; sem seleção por grupo nem contorno vermelho [R7f] |
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
| C6.100 | Verificação de consolos após o cálculo: os com erro ficam em vermelho, e o clique dá o relatório das verificações. | Falta | E | [E2e] |
| C6.101 | Redimensionar a armadura de todos os consolos com os esforços do último cálculo. | Falta | E | [E2e] |
| C6.102 | Editar a armadura de vigas inclinadas. | Falta | E | [E2c] |
| C6.103 | Configuração do editor de armaduras de vigas: escolher o que mostrar (superior, inferior, pele, faixas de estribos, seção, zonas de confinamento). | Parcial | R | editor de armadura na janela da viga (R2) e aba Detalhamento com elevação (inferior, superior, pele, estribos por zona) e seção (R3a); sem escolher o que mostrar [R7b] |
| C6.104 | Fator multiplicador do comprimento de emenda (lb) no editor. | Falta | R | fator do comprimento de emenda no editor [R7b] |
| C6.105 | Envoltórias de esforços em vigas (momento, cortante, torção) por hipótese simples ou combinação. Em sismo dinâmico, escolha do modo de vibração. | Parcial | V | diagramas de M, V e T da envoltória ELU na janela da viga (R1); sem por hipótese simples ou combinação [V5] |
| C6.106 | Diagramas consultados por clique em alinhamentos de vigas, lajes alveolares ou lajes mistas. | Feito | — | diagramas da viga por clique duplo na planta, nas tabelas ou na lista de erros (R1); alveolares e mistas não existem no edifício |
| | **6.3 Desenhos de vigas** | | | |
| C6.107 | Desenho da armadura de vigas inclinadas. | Falta | E | vigas inclinadas (E2) [E2c] |
| C6.108 | Desenho de consolos: vistas frontal e lateral cotadas, armadura principal e estribos, medidas e referências do pórtico e do pilar. | Falta | E | consolos (E2) [E2e] |

## 7. Lajes

| Item | Funcionalidade (palavras próprias) | Situação | Frente | Statikos |
|---|---|---|---|---|
| | **7.1.1 Gestão de panos** | | | |
| C7.1 | Tipos de pano: lajes de vigotas (unidirecionais), alveolares, mistas (steel deck), nervuradas bidirecionais (cubetas), maciças, radier e pano a definir. | Parcial | E | maciça e treliçada; sem alveolar, steel deck, nervurada bidirecional, radier [E3f] |
| C7.2 | Todo contorno fechado por vigas vira automaticamente um pano a definir, marcado com um ponto de interrogação. | Parcial | L | panos detectados; pano sem laje gera aviso [L5] |
| C7.3 | O lançamento do pano pede a direção da armadura, das nervuras ou das vigotas, dada por clique numa viga paralela ou perpendicular ao pano. | Feito | — | direção pelo menor vão, editável |
| C7.4 | Apagar pano: o espaço vira abertura. | Feito | — | remover laje |
| C7.5 | Mudar o ponto de inserção do pano. | Falta | L | [L5] |
| C7.6 | Mudar a direção do pano, por uma viga ou por dois pontos. | Parcial | L | direção editável (número); não por viga/2 pontos [L5] |
| C7.7 | Consultar e editar os dados do pano. | Feito | — |  |
| C7.8 | Copiar dados de outro pano, escolhendo o que copiar (plano de inclinação, engastamento etc.), inclusive de pano de outro grupo escolhido por menu de contexto. Alerta para desligar a cópia do plano entre panos de inclinações diferentes. | Parcial | L | laje.atribuir (tipo); sem escolher o que copiar [L4] |
| C7.9 | Mostrar as formas (cubetas) das lajes nervuradas e desenhar as nervuras com a largura real. | Falta | E | desenho das nervuras e cubetas (nervuradas: E3) [E3c] |
| C7.10 | Momentos mínimos por pano em lajes de vigotas, alveolares e mistas. | Parcial | E | momentos mínimos das vigotas p·ℓ²/16 por obra (opções, R6); sem valor por pano [E3b] |
| C7.11 | Classe de ambiente (exposição) por pano em vigotas protendidas e alveolares, atribuída a um pano ou a todos do grupo. | Falta | E | classe de exposição por pano (vigotas protendidas e alveolares: E3) [E3b] |
| C7.12 | Coeficiente de engastamento de borda por pano ou para todos do grupo (não disponível em nervuradas; nelas se usa o engaste de extremidade das vigas). | Feito | — | coeficiente de engaste por borda da laje (laje.editar engasteBordas, Vínculos; N1a), também nas treliçadas |
| C7.13 | Processo construtivo das alveolares: com ou sem escoramento. | Fora | — |  |
| C7.14 | Vigota dupla ou tripla ao lado de uma vigota escolhida, com apagamento posterior. | Falta | E | [E3b] |
| | **7.1.2.1 Pano a definir** | | | |
| C7.15 | Trocar abertura ou pano já definido por pano a definir, e pano a definir por abertura ou por qualquer tipo de laje. | Parcial | E | remover/criar laje no pano [E3f] |
| C7.16 | Pano a definir com desnível, inclinação e espessura. A espessura passa às vigas planas do contorno. | Parcial | E | desnível da laje; sem inclinação [E3f] |
| C7.17 | Obra com pano a definir não pode ser calculada (evita esquecimento). | Falta | L | bloquear o cálculo com pano sem tipo [L5] |
| C7.18 | Pano a definir visível na vista 3D, para conferir aberturas e lajes antes de escolher o tipo. | Feito | — | pano fechado por vigas sem laje: polígono translúcido tracejado com "?" na vista 3D [V1] |
| | **7.1.2.2 Lajes de vigotas** | | | |
| C7.19 | Tipos de laje de vigotas disponíveis conforme a norma escolhida. | Parcial | E | catálogo H8–H25 próprio [a confirmar] [E3a] |
| C7.20 | Vigotas de concreto armadas ou protendidas, por catálogo de fabricante ou por propriedades geométricas (dependendo da norma, só a segunda opção). | Falta | E | vigotas protendidas; catálogo de fabricante [E3a] |
| C7.21 | Tipos genéricos por geometria (criar, copiar, apagar) para quando a vigota final não é conhecida, ajudando a decidir entre armada e protendida pela flecha. | Falta | E | [E3a] |
| C7.22 | Dados geométricos: referência, espessura da capa, altura do enchimento, intereixo e largura mínima da nervura. | Parcial | E | capa, enchimento, intereixo, nervura do catálogo; não editáveis [E3a] |
| C7.23 | Acréscimo de largura da nervura, usado só na rigidez e no momento de fissuração para a flecha (enchimento de concreto). | Falta | E | [E3a] |
| C7.24 | Volume de concreto por m² calculado e editável. | Feito | — | volume de concreto nos quantitativos |
| C7.25 | Tipo de enchimento: concreto, cerâmica, EPS ou genérico (genérico pede o peso por m²). Peso total por m² calculado. | Parcial | E | só EPS [E3a] |
| C7.26 | Escolha entre vigota armada e protendida para o cálculo da flecha (relação rigidez fissurada/bruta a confirmar com o fabricante). | Falta | E | [E3a] |
| C7.27 | Exportar a laje definida para uma biblioteca interna e reutilizar em outras obras. | Falta | E | biblioteca de lajes [E3a] |
| C7.28 | Biblioteca de fichas de fabricantes. Os dados são do fabricante, o programa só faz um controle lógico. Novas fichas podem ser criadas num editor à parte. | Falta | E | [E3a] |
| C7.29 | Seleção na biblioteca: referência opcional (padrão ficha + laje), ficha/fabricante e laje da série (altura e intereixo), com resumo das propriedades (concretos, aço de protensão etc.). | Falta | E | [E3a] |
| C7.30 | Ficha técnica para vigota simples e dupla, com dados obrigatórios e recomendados. | Falta | E | [E3a] |
| C7.31 | Vigota armada, positivo (meio do vão): tipo, armadura (base + adicional em todo o comprimento + adicional mais curta), área de aço, momento último, momento de fissuração, rigidez total e rigidez fissurada (flecha por Branson). | Parcial | E | treliça do modelo, adicional, área de aço e momento resistente da nervura no diagrama (R6); sem momento de fissuração nem rigidez fissurada da vigota [E3b] |
| C7.32 | Vigota armada, negativo (apoio): armadura superior adicional (duas parcelas com comprimentos calculados), área de aço, momento último da seção típica e da seção maciça (sem enchimento), momento de fissuração e rigidezes. | Parcial | E | negativos na capa com área, comprimento e momento resistente da nervura e da faixa maciçada (R6); uma parcela só, sem momento de fissuração nem rigidezes [E3b] |
| C7.33 | Cortante último da seção, com valores por tipo de treliça. O tipo usado aparece na tela e no desenho. | Feito | — | VRd1 e VRd2 da nervura calculados (19.4.1) com a treliça do modelo, mostrada na janela e na prancha de lajes (R6, R5) |
| C7.34 | Vigota protendida: momentos de serviço por classe de ambiente/exposição, comparados com o de cálculo. Se não passa, procura outra vigota, e sem solução emite erro no fim do cálculo. | Falta | E | [E3b] |
| C7.35 | Vigota protendida sem armadura de cortante. | Falta | E | [E3b] |
| C7.36 | Laje nervurada moldada no local (nervuras como vigas) com armadura de base atribuível. | Falta | E | nervurada moldada no local [E3a] |
| C7.37 | Dados da nervurada moldada no local: referência, tipo de enchimento (biblioteca: criar, copiar, apagar), espessura da capa e intereixo. | Falta | E | [E3a] |
| C7.38 | Laje com vigotas de perfil I laminado: referência, enchimento, capa, intereixo e série de perfis. | Fora | — |  |
| C7.39 | Nas vigotas de aço, escolhe-se a série e o perfil é dimensionado automaticamente, sempre biapoiado (engastamento 0 fixo). | Fora | — |  |
| C7.40 | Laje com vigotas treliçadas de aço biapoiadas: tipo (banzos com um ou dois perfis), série de perfis, altura nominal, ângulo das diagonais entre 30° e 60°, intereixo e espessura da capa (não colaborante). | Fora | — |  |
| C7.41 | Coeficiente de redução da rigidez à torção das lajes de vigotas, consultável e editável nas opções gerais. | Feito | — | redutor da torção das lajes editável nas opções (torcaoLaje, N1a), vale para as treliçadas |
| | **7.1.2.3 Lajes nervuradas bidirecionais** | | | |
| C7.42 | Forma perdida ou recuperável. | Falta | E | nervurada bidirecional [E3c] |
| C7.43 | Formas importadas da biblioteca ou definidas pelo usuário, e editáveis. | Falta | E | [E3c] |
| C7.44 | Disposição das formas visível na tela. | Falta | E | [E3c] |
| C7.45 | Pano lançado paralelo a uma viga ou por dois pontos. | Falta | E | [E3c] |
| C7.46 | Copiar panos nervurados no mesmo grupo e atribuir armadura de base aos panos do grupo. | Falta | E | [E3c] |
| C7.47 | Geração automática de ábacos (capitéis), com parâmetros configuráveis. | Falta | E | ábacos/capitéis [E3d] |
| C7.48 | Ábaco, ângulo de visão: cone de busca a partir de cada face do pilar. O pilar mais próximo dentro do cone dá o vão de referência, e sem pilar vale o mínimo. | Falta | E | [E3d] |
| C7.49 | Ábaco, extensão maciça: porcentagem da distância ao pilar vizinho, medida da face do pilar à borda do ábaco. | Falta | E | [E3d] |
| C7.50 | Ábaco, comprimentos mínimo e máximo da face do pilar à borda, em relação à altura do ábaco. | Falta | E | [E3d] |
| | **7.1.2.4 Lajes alveolares** | | | |
| C7.51 | Lajes alveolares da biblioteca ou criadas pelo usuário, com ajuda sobre os dados pedidos. | Falta | E | alveolares [E3e] |
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
| C7.60 | Fluxo: lançar tudo na horizontal e depois atribuir inclinações ou desníveis. | Falta | E | lajes inclinadas [E3f] |
| C7.61 | Lista de planos com nome editável, indicação de plano já atribuído, cor por plano e valores (cota ou inclinação). | Falta | E | lajes inclinadas e planos [E3f] |
| C7.62 | Atribuir um plano a panos do grupo, que passam a ter a cor do plano. | Falta | E | lajes inclinadas e planos [E3f] |
| C7.63 | Plano inclinado por três pontos com desnível de cada um em relação ao pavimento. | Falta | E | lajes inclinadas e planos [E3f] |
| C7.64 | Plano por reta horizontal (dois pontos com a mesma cota) e inclinação perpendicular a ela. | Falta | E | lajes inclinadas e planos [E3f] |
| C7.65 | Plano por linha de máxima declividade (dois pontos), desnível do primeiro e inclinação. | Falta | E | lajes inclinadas e planos [E3f] |
| C7.66 | Definição numérica ou gráfica sobre a planta, com captura do gabarito. O cursor muda de cor sobre eixo ou face de viga. | Falta | E | lajes inclinadas e planos [E3f] |
| C7.67 | Editar plano na planta: arrastar pontos e reescrever cotas/inclinações sobre o texto. | Falta | E | lajes inclinadas e planos [E3f] |
| C7.68 | Editar plano numericamente. | Falta | E | lajes inclinadas e planos [E3f] |
| C7.69 | Seta indicando o sentido descendente da máxima declividade no pano. Aviso quando as nervuras não são paralelas ou perpendiculares a ela. | Falta | E | lajes inclinadas e planos [E3f] |
| C7.70 | Incoerência de inclinação entre vigas e pano adjacente detectada (vigas em vermelho) e corrigida por clique, copiando a inclinação do pano. | Falta | E | lajes inclinadas e planos [E3f] |
| C7.71 | Casos-guia: só panos inclinados (desníveis positivos), pano horizontal numa extremidade (desníveis negativos no grupo superior com vigas comuns), horizontais nas duas extremidades (rampa num grupo intermediário) e sobreposições na projeção (um grupo por cota). | Falta | E | lajes inclinadas e planos [E3f] |
| C7.72 | Sequência recomendada: grupos, panos horizontais, vigas comuns, panos a inclinar (vigas de transição ajustadas às interseções do gabarito), planos e atribuição. | Falta | E | lajes inclinadas e planos [E3f] |
| C7.73 | Projeção horizontal da viga pelo eixo ou pela face, com a face superior desenhada em linha contínua (cumeeira mais larga, rincão mais estreito). | Falta | E | lajes inclinadas e planos [E3f] |
| C7.74 | Rotação da seção de vigas horizontais (cumeeira, borda) para acompanhar o pano, só em vigas planas. Sem coincidência com a interseção, não gira e ganha altura para os dois panos. | Falta | E | lajes inclinadas e planos [E3f] |
| C7.75 | Limitações: pano inclinado não se apoia em muro, e não há viga comum com o coroamento de muro. | Falta | E | lajes inclinadas e planos [E3f] |
| C7.76 | Na planta de formas, valor da inclinação junto ao texto de desnível, com croqui opcional do pavimento (pilares, eixos de vigas, setas de inclinação) em quadro de tamanho configurável. | Falta | E | lajes inclinadas e planos [E3f] |
| C7.77 | Exemplos: telhado de duas águas, mansarda com águas-furtadas, rampa de garagem para subsolo (grupo intermediário, pilares próprios, muro na base, viga comum no topo) e rampa entre pavimentos de estacionamento. Curvas de rampa de preferência em plano horizontal. | Falta | E | lajes inclinadas e planos [E3f] |
| | **7.1.4 Aberturas** | | | |
| C7.78 | Aberturas retangulares com escolha do tipo de viga de borda, nos quatro modos a seguir. | Parcial | L | abertura em laje (polígono); sem viga de borda automática [L5] |
| C7.79 | Abertura retangular paralela a uma viga escolhida (dois cantos internos opostos). | Falta | L | [L5] |
| C7.80 | Abertura retangular com ângulo zero (dois cantos). | Parcial | L | abertura por contorno [L5] |
| C7.81 | Abertura retangular no ângulo das nervuras do pano (paralela aos eixos gerais se o pano estiver vazio). | Falta | L | [L5] |
| C7.82 | Abertura retangular com qualquer ângulo (dois pontos de um lado e arraste até o lado oposto). | Falta | L | [L5] |
| | **7.1.5 Opções de lajes** | | | |
| C7.83 | Limites de flecha ativa das lajes de vigotas (padrões próprios, como nas vigas). | Parcial | N | limites ℓ/250 (total) e ℓ/350 (variável) editáveis, comuns a todas as lajes (N1d); sem flecha ativa nem padrões próprios das vigotas [N2f] |
| C7.84 | Limites de flecha total a longo prazo das lajes de vigotas. | Feito | — | limite da flecha total a longo prazo editável (ℓ/250), comum a todas as lajes, treliçadas inclusive (N1d) |
| C7.85 | Cortante em nervuradas moldadas no local (só pela norma espanhola EHE): fórmula alternativa sem dependência da armadura longitudinal. | Fora | — | EHE |
| C7.86 | Dimensionamento de vigotas treliçadas de aço: todas as barras iguais, banzos iguais ou cada barra independente. | Fora | — |  |
| | **7.2 Resultados de lajes (lido só o começo)** | | | |
| C7.87 | Vistas de resultados das lajes de vigotas na aba de resultados, com a opção de mostrar momentos/tipos combinada com a de mostrar esforços. O texto termina aqui. | Parcial | V | aba Vigotas na janela da laje (planta com grupos de igualação e diagramas) e camada "Armadura das lajes" na planta (R6); sem as vistas de momentos/tipos combinadas com esforços na planta [V5] |

## 7. Lajes (continuação)

| Item | Funcionalidade (palavras próprias) | Situação | Frente | Statikos |
|---|---|---|---|---|
| | **7.2.1.1 Vistas de resultados das lajes de vigotas (continuação)** | | | |
| C7.88 | Com a exibição de esforços desligada, a vista de momentos mostra em vez dos valores o tipo de vigota (protendida ou armada), o perfil (vigota de aço e treliça metálica) ou o diâmetro e comprimento da armadura inferior (vigota moldada no local). | Parcial | V | rótulo do grupo e armadura adicional por nervura na planta da laje (R6); sem a vista de tipos na planta (protendida e moldada no local: E3; aço fora) [V5] |
| C7.89 | Com a exibição de esforços ligada, mostra o momento positivo de cálculo por metro de largura (já majorado) junto a cada vigota. | Parcial | V | momento positivo de cálculo por nervura na tabela por grupo e nos diagramas (por metro no núcleo) (R6); sem o valor junto a cada vigota na planta [V5] |
| C7.90 | Vista de cortantes: com esforços ligados, mostra a cortante de cálculo por metro; desligados, mostra o tipo de treliça (vigota armada pré-fabricada) ou o diâmetro e espaçamento dos estribos (vigota moldada no local). | Parcial | V | cortante por nervura com VRd1 na tabela e nos diagramas (R6); sem vista na planta com o tipo de treliça [V5] |
| C7.91 | Vista da armadura inferior das lajes moldadas no local, indisponível quando a exibição de esforços está ligada. | Falta | E | vigotas moldadas no local (E3) [E3b] |
| C7.92 | Chave geral de exibição de esforços para todos os tipos de vigota, que condiciona as vistas de momentos e de cortantes. | Falta | V | chave geral de exibição de esforços das vigotas [V5] |
| C7.93 | Exibição agrupada: mostra um só valor de esforço/tipo para cada grupo de vigotas iguais. | Feito | — | rótulo "Gn · n vigotas" por grupo de igualação na planta e uma linha por grupo na tabela (R6) |
| C7.94 | Armadura superior em lajes inclinadas: desenho do dobramento ao lado da barra. | Falta | E | [E3f] |
| C7.95 | Armadura superior em lajes inclinadas: marca do ponto de dobra como traço perpendicular ao eixo da barra. | Falta | E | [E3f] |
| | **7.2.1.2 Igualar vigotas** | | | |
| C7.96 | Agrupamento automático de vigotas quando (Mmáx − Mmín) do grupo < percentual × Mmáx, com o percentual dado pelo usuário. | Feito | — | agrupamento por (Mmáx − Mmín) < percentual × Mmáx (opção vigotaIgualacaoDif) (R6) |
| C7.97 | Igualação feita ponto a ponto da discretização da vigota, considerando todas as combinações de todas as vigotas do grupo. | Parcial | E | igualação pelos valores de pico da envoltória (todas as combinações e pavimentos do grupo), não ponto a ponto (R6) [E3b] |
| C7.98 | Momentos igualados pelo máximo de cada ponto ou pela média de cada ponto, à escolha. | Feito | — | igualação pelo máximo ou pela média (opção vigotaIgualacao) (R6) |
| C7.99 | Cortante igualada sempre pelo máximo entre as combinações das vigotas do grupo. | Feito | — | cortante igualada sempre pelo máximo do grupo (R6) |
| C7.100 | Igualação da armadura superior: percentual de diferença e critério (maior ou média) definidos pelo usuário; compara a área de aço de cada vigota com a vizinha, iguala se a diferença é menor que o percentual e segue em cadeia por todo o pano e por todos os panos. | Parcial | E | igualação dos momentos (e não da área de aço) com percentual e critério editáveis; negativos pelo mesmo grupo (R6) [E3b] |
| | **7.2.1.3 Erros de vigotas** | | | |
| C7.101 | Vigotas com erro (flecha, cortante ou outro) aparecem em vermelho; consulta da mensagem clicando na vigota. | Parcial | E | erros VIGOTA_* por laje em vermelho na planta e na lista; vigota individual não [E3b] |
| C7.102 | Erro de armadura inferior: flecha instantânea, diferida ou ativa acima do limite (por peso próprio, sobrecarga ou carga de montagem); sugere aumentar a espessura. | Parcial | E | flecha da laje treliçada verificada (total e da variável, limites editáveis); sem flecha por vigota nem de montagem [E3b] |
| C7.103 | Erro: momento positivo no apoio da vigota; sugere mudar o coeficiente de engastamento do pano ou rever a continuidade da armadura inferior. | Feito | — | aviso VIGOTA_APOIO (momento positivo na ponta da vigota; rever engaste ou continuidade) (R6) |
| C7.104 | Erro: altura da laje insuficiente para a flexão. | Feito | — | erro VIGOTA_ALTURA (flexão positiva exige armadura de compressão: aumentar a altura) (R6) |
| C7.105 | Erro: nenhuma vigota da série (protendida ou armada) cobre o momento positivo máximo. | Parcial | E | erro VIGOTA_POS quando treliça + 2φ12,5 não cobre o momento; sem série de fabricante (R6) [E3b] |
| C7.106 | Erro: a armadura inferior da vigota moldada no local não cabe na largura da nervura (espaçamento e cobrimento); sugere aumentar altura ou largura da nervura. | Falta | E | vigotas moldadas no local (E3) [E3b] |
| C7.107 | Erro de vigota de aço: nenhum perfil da série serve para a geometria do pano e da forma (intereixo excessivo para apoiar a forma nas abas). | Fora | — | vigotas de aço (aço no edifício fora do escopo, como C7.39) |
| C7.108 | Erro de vigota de aço/treliça: nenhum perfil da série resiste aos esforços; sugere trocar de série. | Fora | — | vigotas de aço e treliças metálicas (aço no edifício fora do escopo, como C7.40) |
| C7.109 | Erro de armadura superior: zona comprimida insuficiente para o momento negativo, sem solução por maciçamento; exige laje mais alta. | Feito | — | erro VIGOTA_NEG: momento negativo acima do resistente mesmo com a faixa maciçada, exige laje mais alta (R6) |
| C7.110 | Erro: momento negativo acima do máximo da ficha do fabricante, com o valor mostrado; sugere laje mais alta ou vigota dupla. | Parcial | E | momento negativo comparado ao resistente calculado (nervura e faixa maciçada), sem ficha do fabricante nem vigota dupla (R6) [E3b] |
| C7.111 | Erro: área de armadura superior exigida no apoio (face interna da viga) excessiva, armadura não dimensionada. | Feito | — | erro VIGOTA_NEG_AS (armadura negativa > 2φ12,5 por nervura) (R6) |
| C7.112 | Aviso: armadura negativa fora da tabela (lajes genéricas e moldadas no local); o programa calcula assim mesmo e sugere laje mais alta ou vigota dupla. | Falta | E | aviso de negativa fora da tabela (tabelas de vigotas: E3) [E3b] |
| C7.113 | Aviso: maciçamento maior que duas vezes a altura (o maciçamento evita armadura inferior comprimida). | Feito | — | aviso VIGOTA_MACICO: maciçamento maior que duas vezes a altura (R6) |
| C7.114 | Aviso: maciçamento maior que 20 % do vão livre. | Feito | — | aviso VIGOTA_MACICO: maciçamento maior que 20 % do vão (R6) |
| C7.115 | Aviso: extremidades engastadas/contínuas não dimensionadas em vigotas de aço (articuladas nas bordas; em balanço o pano interno dá continuidade só para equilíbrio local, sem dimensionar o negativo). | Fora | — | vigotas de aço (aço no edifício fora do escopo, como C7.39) |
| C7.116 | Erro: cortante calculada acima da resistência da ficha da vigota; sugere laje mais alta ou vigota dupla. | Parcial | E | erro VIGOTA_CORTANTE contra VRd1 e VRd2 calculados (19.4.1), com a faixa maciçada necessária; sem ficha do fabricante nem vigota dupla (R6) [E3b] |
| | **7.2.1.4 Informação da vigota** | | | |
| C7.117 | Consulta, por clique, da flecha e de outros dados de uma vigota. | Parcial | E | clique na vigota mostra os diagramas por nervura; a flecha continua por laje (R6) [E3b] |
| | **7.2.1.5 Atribuição manual** | | | |
| C7.118 | Atribuição de dados a vigotas selecionadas da primeira à última (destacadas em amarelo). | Falta | E | edição de vigotas selecionadas (E3) [E3b] |
| C7.119 | Vigota genérica de concreto: atribuir momento fletor e cortantes de extremidade (igualação manual). | Falta | E | igualação manual de esforços (E3) [E3b] |
| C7.120 | Vigota armada: trocar o tipo dentro da série e a armadura transversal. | Falta | E | série de vigotas armadas (E3) [E3b] |
| C7.121 | Vigota armada: armaduras parciais definidas por comprimento total, comprimento dado ou percentual do comprimento; exibidas sempre em percentual na tela e nos desenhos. | Falta | E | armaduras parciais das vigotas (E3) [E3b] |
| C7.122 | Vigota protendida: trocar o tipo dentro da série. | Falta | E | vigotas protendidas (E3) [E3b] |
| C7.123 | Vigota moldada no local: alterar armadura inferior (até duas barras longitudinais) e transversal; comprimento das barras editável sem ultrapassar a face externa das vigas; zona de estribos convertida em número de barras pelo espaçamento. | Falta | E | vigotas moldadas no local (E3) [E3b] |
| C7.124 | Vigota de aço: trocar o perfil dentro da série. | Fora | — | vigotas de aço (aço no edifício fora do escopo, como C7.39) |
| C7.125 | Treliça metálica: trocar o perfil dos banzos ou das diagonais dentro da série. | Fora | — | treliças metálicas (aço no edifício fora do escopo, como C7.40) |
| | **7.2.2 Lajes maciças e nervuradas (cogumelo/ábacos)** | | | |
| C7.126 | Aviso pós-cálculo: flecha de lajes nervuradas e maciças não é verificada automaticamente; o usuário consulta a flecha elástica entre dois pontos e compara com o limite da norma. | Feito | — | flecha de lajes maciças estimada e comparada com L/250 (o manual não verifica) |
| C7.127 | Aviso pós-cálculo recomendando recalcular quando há perfis de aço maiores que os lançados. | Fora | — | perfis de aço nas lajes (aço no edifício fora do escopo) |
| C7.128 | Geração da armadura de lajes maciças/nervuradas sem cálculo completo, com a geometria atual, para editar à mão; apaga toda a armadura existente da obra. | Falta | R | armadura das lajes sem cálculo completo [R7e] |
| C7.129 | Vista da armadura em lajes inclinadas: desenho do dobramento, comprimentos parciais de cada lado da dobra e marca do ponto de dobra. | Falta | E | lajes inclinadas (E3) [E3f] |
| C7.130 | Vista com siglas de reforço superior e inferior junto às barras de reforço. | Parcial | R | rótulos "Nk – n φ c/s – C = x,xx" junto às barras na planta da laje (R4) e nas pranchas (R5); sem siglas de reforço [R7e] |
| C7.131 | Vista das linhas de flexão (linhas de corte para armadura) definidas pelo usuário. | Falta | R | linhas de dobra [R7e] |
| C7.132 | Troca de diâmetro/espaçamento escolhendo um conjunto de armadura de uma tabela, atribuível às lajes; a tabela é editável. | Falta | R | tabelas de armadura das lajes [R7e] |
| C7.133 | Janela de armadura pode ficar aberta enquanto se edita (edição contínua). | Falta | R | edição da armadura das lajes [R7e] |
| C7.134 | Desfazer o agrupamento de barras clicando no grupo, que mostra todas as barras dele. | Falta | R | [R7e] |
| C7.135 | Manter visível a armadura das vistas ativas enquanto se edita outra (ex.: ver a inferior ao editar a superior). | Parcial | R | camadas inferior e superior ligáveis na planta da laje e na planta do pavimento; sem edição (R4) [R7e] |
| C7.136 | Salvar cópia da armadura de todos os grupos (ex.: antes de abrir um furo imprevisto). | Falta | R | [R7f] |
| C7.137 | Recuperar a cópia salva: restaura só onde a geometria não mudou, cortando barras na borda de furos novos sem criar ganchos. | Falta | R | [R7f] |
| C7.138 | Copiar a armadura de outro grupo de pavimentos para o grupo atual (destino); copia só onde há laje, corta nas bordas de furos sem ganchos; exige mesmo ângulo e ponto de inserção da malha; recomenda-se criar grupos copiando o de baixo e revisar barras cortadas. | Falta | R | [R7f] |
| C7.139 | Adicionar grupos de estribos de punção nas nervuras que chegam a um ábaco: número, diâmetro e espaçamento; o ábaco sob o cursor escurece e recebe as barras ao clicar. | Falta | N | [N2d] |
| C7.140 | As barras novas somam-se às existentes; para substituir, apagar antes. | Falta | N | [N2d] |
| C7.141 | Apagar grupos de armadura de punção (lajes cogumelo, maciças e nervuradas) um a um ou por janela de captura. | Falta | N | [N2d] |
| | **7.2.3 Lajes alveolares** | | | |
| C7.142 | Vistas de lajes alveolares inclinadas: desenho do dobramento e marca do ponto de dobra. | Falta | E | [E3f] |
| C7.143 | Catálogo de fabricante com fichas das placas alveolares; quadro de propriedades no relatório de dados da obra. | Falta | E | [E3e] |
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
| C7.187 | Diagramas de momento, cortante e torção em vigotas, placas alveolares e lajes mistas: envoltórias, por hipótese ou por combinação. | Parcial | V | diagramas de momento e cortante da envoltória por vigota (R6); sem torção nem por hipótese ou combinação (alveolares e mistas: E/fora) [V5] |
| C7.188 | Para hipótese sísmica dinâmica, escolha do modo de vibração. | Fora | — | sismo |
| C7.189 | Consulta clicando nos alinhamentos de vigas, vigotas, alveolares ou lajes mistas. | Feito | — | clique duplo em vigas (R1) e clique na vigota da aba Vigotas (R6) abre os diagramas |
| | **7.3 Desenhos e relatórios de lajes** | | | |
| C7.190 | Relatórios de lajes mistas: esforços, quantitativo das lajes e quantitativo de armadura. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.191 | Dados das lajes mistas no relatório de dados da obra e quantidades no quantitativo geral. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.192 | Configuração própria dos elementos de laje mista no desenho da planta de formas. | Fora | — | laje mista (steel deck): aço/misto fora do edifício |
| C7.193 | Relatório de esforços em vigotas: envoltórias de momento, cortante e torção de um alinhamento, com croqui do grupo de pavimentos e da vigota. | Parcial | E | diagramas de momento e cortante por nervura na janela e tabela por grupo no memorial, com a combinação determinante do grupo de pavimentos; sem torção nem croqui do grupo (R6) [E3b] |
| C7.194 | Quantitativo das vigotas: peso e comprimento por metro com perda; nas moldadas no local, armaduras superior, inferior e transversal (cortante em comprimento total ou estribo em ômega). | Parcial | E | comprimento e peso das treliças por tipo e das barras adicionais, negativos e distribuição, com perdas, no resumo de aço, CSV e memorial; sem vigotas moldadas no local (R6) [E3b] |
| C7.195 | Desenho de panos inclinados na planta: tangente da inclinação junto ao texto de cota e croqui do pavimento com tamanho configurável (só com lajes inclinadas). | Falta | E | [E3f] |

## 8. Escadas

| Item | Funcionalidade (palavras próprias) | Situação | Frente | Statikos |
|---|---|---|---|---|
| | **8.1 Generalidades** | | | |
| C8.1 | Módulo que calcula e arma as lajes de escada como elementos isolados da estrutura. | Falta | E | [E4c] |
| C8.2 | Reações da escada na estrutura principal, conforme geometria, apoios e cargas gravitacionais, transmitidas como cargas lineares e/ou de superfície, separadas em permanente e variável. | Falta | E | [E4c] |
| C8.3 | Escada composta por lances entre pavimentos com patamares; tipologias: lance reto; dois lances com patamar de meia-volta; três lances com patamares de quarto de volta; dois lances com patamar de volta inteira; dois lances consecutivos com patamar intermediário; n lances com patamares de meia-volta; n lances com patamares de quarto de volta. | Falta | E | [E4a] |
| C8.4 | Conceitos: escada = conjunto de lances entre pisos de uma circulação vertical; lance = trecho inclinado de degraus contínuos; patamar intermediário = plano horizontal entre dois lances. | Falta | E | [E4a] |
| | **8.2 Acesso ao módulo** | | | |
| C8.5 | Menu flutuante de escadas na aba de vigas, com: criar, editar, apagar, mover, girar, ver detalhe de armadura de todos os lances e ver esforços/deslocamentos por isovalores. | Falta | E | [E4b] |
| | **8.3.1 Criar escada** | | | |
| C8.6 | Janela de nova escada com duas abas: dados comuns da escada e lances entre pavimentos. | Falta | E | [E4b] |
| C8.7 | A escada nova começa no grupo atual, indicado na janela. | Falta | E | [E4b] |
| C8.8 | Dados comuns valem para todos os lances; partes com dados diferentes (ex.: outra carga) devem virar escadas separadas. | Falta | E | [E4a] |
| C8.9 | Geometria comum: largura da escada (comprimento dos degraus). | Falta | E | [E4a] |
| C8.10 | Geometria comum: piso (passo em planta) e espelho (altura do degrau). | Falta | E | [E4a] |
| C8.11 | Geometria comum: sentido de giro ao subir (esquerda ou direita). | Falta | E | [E4a] |
| C8.12 | Geometria comum: posição do último degrau do lance — formado pelo patamar ou sobre a laje inclinada. | Falta | E | [E4a] |
| C8.13 | Cargas comuns: modo de execução dos degraus (concretados com a laje ou em alvenaria), que afeta o peso próprio e o volume de concreto. | Falta | E | [E4a] |
| C8.14 | Cargas comuns: peso de corrimãos (total, considerando um ou dois), revestimento e sobrecarga. | Falta | E | [E4a] |
| C8.15 | Lances (trechos entre pavimentos) podem ter dados diferentes entre si: espessura, cota inicial, tipologia, número de degraus. | Falta | E | [E4a] |
| C8.16 | Escolha do tipo de lance numa lista de tipos predefinidos ou criação de tipo novo. | Falta | E | [E4a] |
| C8.17 | Tipos de lance ficam na biblioteca da obra, reutilizáveis em vários lances e escadas; importação/exportação entre obras pelo gerenciador de biblioteca. | Falta | E | [E4b] |
| C8.18 | Tipo de lance: referência (nome). | Falta | E | [E4a] |
| C8.19 | Tipo de lance: espessura da laje dada pelo usuário ou pré-dimensionada pelo programa como 1/30 do maior vão real entre apoios. | Falta | E | [E4a] |
| C8.20 | Tipo de lance: desnível no início do lance (≥ 10 cm), ex.: escada que nasce na fundação e atravessa contrapiso. | Falta | E | [E4a] |
| C8.21 | Tipo de lance: número de degraus iniciais construídos sobre o piso; gera reação uniforme de superfície (carga permanente média dos degraus), sem sobrecarga, pois o piso já tem a sua. | Falta | E | [E4a] |
| C8.22 | Tipo de lance: tipologia de lances e patamares. | Falta | E | [E4a] |
| C8.23 | Tipo de lance: número de degraus de cada trecho, conforme a tipologia. | Falta | E | [E4a] |
| C8.24 | Tipo de lance: largura do vão central (poço), só com patamares de meia-volta. | Falta | E | [E4a] |
| C8.25 | Tipo de lance: número de degraus construídos sobre o patamar intermediário. | Falta | E | [E4a] |
| C8.26 | Patamar intermediário apoiado ou livre; apoio frontal, lateral ou ambos, com tipo e largura. | Falta | E | [E4a] |
| C8.27 | Apoio do patamar por tirante pendurado em elemento do piso de cima; a largura serve para somar o peso da alvenaria entre o patamar e o piso superior. | Falta | E | [E4a] |
| C8.28 | Apoio do patamar em parede de alvenaria (15,70 kN/m³) ou de concreto (24,53 kN/m³): peso de parede de largura dada e altura entre patamar e piso de baixo, aplicado no elemento sob a borda apoiada. | Falta | E | [E4a] |
| C8.29 | Parede entre o patamar e o piso de cima (ou outra divisória) deve ser lançada pelo usuário como carga linear. | Falta | E | [E4a] |
| C8.30 | Apoio do patamar por conectores de cisalhamento em viga ou muro, que recebem a reação de extremidade. | Falta | E | [E4a] |
| C8.31 | Número de lances iguais consecutivos (pavimentos seguidos com o mesmo tipo de lance). | Falta | E | [E4a] |
| C8.32 | Número ilimitado de lances por escada. | Falta | E | [E4a] |
| | **8.3.1.3 Inserção na obra** | | | |
| C8.33 | Inserção no pavimento atual: o primeiro lance acompanha o cursor; clique fixa o início, a escada gira em torno dele e o segundo clique define a direção. | Falta | E | [E4b] |
| C8.34 | Capturas a gabarito DXF/DWG e modo ortogonal para posicionar. | Falta | E | [E4b] |
| C8.35 | Inserção repetida de escadas iguais com referências numeradas em sequência; botão direito encerra. | Falta | E | [E4b] |
| C8.36 | Mensagem de erro geométrico na inserção. | Falta | E | [E4b] |
| C8.37 | Conferência das escadas na vista 3D do edifício ou do pavimento (forma, interferências). | Falta | E | depende da vista 3D [E4e] |
| | **8.3.1.4 Ferramentas de apoio** | | | |
| C8.38 | Dados da última escada lançada mantidos enquanto a obra não muda e o programa não fecha. | Falta | E | [E4b] |
| C8.39 | Copiar dados de uma escada visível no pavimento atual (inclusive lances) ao criar uma nova, para depois ajustar (ex.: escada simétrica trocando o sentido de giro). | Falta | E | [E4b] |
| C8.40 | Lista de tipos de lance com predefinidos e do usuário, escolhível na janela do lance e na de nova escada. | Falta | E | [E4b] |
| C8.41 | Duplicar um lance da mesma escada, colocado no topo da lista (fisicamente acima dos demais). | Falta | E | [E4b] |
| C8.42 | Copiar tipo de lance com nova referência. | Falta | E | [E4b] |
| C8.43 | Editar tipo de lance, bloqueado quando usado em outro lance para evitar alteração involuntária; desbloqueio manual. | Falta | E | [E4b] |
| C8.44 | Biblioteca de tipos de lance do usuário: exportar da obra e importar em outras obras. | Falta | E | [E4b] |
| | **8.3.2–8.3.5 Editar, apagar, mover, girar** | | | |
| C8.45 | Editar dados de escada existente clicando nela. | Falta | E | [E4b] |
| C8.46 | Apagar uma ou várias escadas, por clique ou janela de captura. | Falta | E | [E4b] |
| C8.47 | Mover escada por ponto de referência, com capturas a gabarito. | Falta | E | [E4b] |
| C8.48 | Girar escada em torno do início do lance no grupo atual, por ponto na tela ou ângulo digitado. | Falta | E | [E4b] |
| | **8.4 Resultados, relatórios e desenhos** | | | |
| C8.49 | Ver detalhe de armadura de cada lance numa janela, com seleção do lance; calcula na hora se for a primeira vez ou houve mudança. | Falta | E | [E4d] |
| C8.50 | Cálculo isolado por elementos finitos com as hipóteses de peso próprio/permanente e sobrecarga. | Falta | E | [E4c] |
| C8.51 | Vista 3D do lance com isovalores de esforços e deslocamentos. | Falta | E | [E4e] |
| C8.52 | Escadas calculadas primeiro no cálculo da obra, para aplicar as reações na estrutura. | Falta | E | [E4c] |
| C8.53 | Cálculo individual da escada antes do cálculo da obra; aviso para recalcular a obra se a escada mudar de forma que altere as reações. | Falta | E | [E4c] |
| C8.54 | Relatório de escadas: dados gerais (materiais, norma), dados comuns (geometria, cargas) e por lance (reações, armaduras, esforços em cada seção). | Falta | E | [E4e] |
| C8.55 | Desenho de detalhe de cada escada: cortes longitudinais e transversais, quadro de propriedades por lance (geometria, cargas, materiais) e quadros de aço por escada, por lance e total. | Falta | E | [E4e] |
| | **8.5 Configuração** | | | |
| C8.56 | Concreto das escadas igual ao das lajes, dos dados gerais. | Falta | E | [E4c] |
| C8.57 | Escolha do aço e gestão das tabelas de armadura das escadas. | Falta | E | [E4d] |
| C8.58 | Opção: igualar armaduras superior e inferior pelo maior valor. | Falta | E | [E4d] |
| C8.59 | Opção: espaçamentos das armaduras superior e inferior múltiplos entre si. | Falta | E | [E4d] |
| C8.60 | Opção: igualar a armadura de todas as seções (longitudinais e transversais) do lance, superior e depois inferior. | Falta | E | [E4d] |
| C8.61 | Opção: arranques (esperas) no início. | Falta | E | [E4d] |
| C8.62 | Opção: barras de ligação (passadores) no fim da laje. | Falta | E | [E4d] |
| C8.63 | Dado: comprimento disponível para ancorar as esperas do primeiro lance em viga chata; se maior que o necessário dobra as barras; prevalece a largura da viga se maior. | Falta | E | [E4d] |
| C8.64 | Dado: cobrimento nominal conforme a agressividade do ambiente. | Falta | E | [E4d] |
| C8.65 | Dado: profundidade de fundação para ancorar o início do lance quando não há elemento de fundação sob ele. | Falta | E | [E4d] |

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
| C10.2 | Vento com ou sem efeitos de 2ª ordem. | Parcial | N | γz com ampliação do vento; P-Δ 3D não [N2c] |
| C10.3 | Norma genérica de vento quando a desejada não existe. | Fora | — | só NBR 6123 |
| C10.4 | Sismo ativável com escolha da norma e dados próprios, e opção de 2ª ordem. | Fora | — | sismo |
| C10.5 | Sismo por norma genérica: análise modal espectral ou coeficientes por pavimento. | Fora | — | sismo |
| C10.6 | Verificação de resistência ao fogo (só pela norma espanhola), com dados dos revestimentos de proteção dos elementos. | Falta | N | fogo pela NBR 15200 [N2g] |
| C10.7 | Lista de todas as hipóteses da obra com edição e criação de hipóteses adicionais (permanente, variável, vento, sismo, neve). | Feito | — | grupo Casos de carga: G e Q fixos e adicionais G/Q/W/E editáveis (N1c) |
| C10.8 | Hipótese adicional com referência e descrição. | Parcial | N | nome do caso; sem descrição (N1c) [N2a] |
| C10.9 | Hipótese com várias disposições de carga: compatíveis (atuam sozinhas ou juntas com outras da mesma hipótese). | Feito | — | casos sem grupo são compatíveis e atuam sozinhos ou juntos (N1c) |
| C10.10 | Disposições incompatíveis: nunca combinadas entre si (ex.: vento em direções diferentes). | Feito | — | grupo de incompatíveis por caso adicional; vento em grupo próprio (N1c) |
| C10.11 | Disposições simultâneas: sempre atuam juntas; servem para dividir uma hipótese em grupos de cargas mais fáceis de editar e visualizar. | Feito | — | campo Simultâneo com: recebe o mesmo fator do caso ligado (N1c) |
| C10.12 | Uso das disposições para cargas alternadas e móveis. | Parcial | N | cargas alternadas por casos no mesmo grupo (N1c); sem cargas móveis [N2a] |
| C10.13 | Com duas ou mais hipóteses adicionais, tabela de compatibilidade entre hipóteses de mesma natureza. | Parcial | N | grupo único entre casos substitui a tabela de compatibilidade (N1c) [N2a] |
| C10.14 | Estados-limite: controle de execução, categoria de uso e altitude/nível de neve. | Parcial | N | CAA e ψ editáveis [N2a] |
| C10.15 | Consulta das combinações geradas com os coeficientes de ponderação e de combinação. | Feito | — | quadro Combinações na aba Análise, com fatores por caso e exportação em CSV (N1c) |
| C10.16 | Configuração das combinações por estado-limite e por material: concreto, fundações, aço dobrado a frio, aço laminado, madeira, tensões no terreno e deslocamentos. | Falta | N | [N2a] |
| C10.17 | Situações de projeto definidas pelo usuário: criar, apagar, copiar, editar, biblioteca para outras obras e criar a partir das situações da norma. | Falta | N | combinações do usuário (existe no Pórtico, não no edifício) [N2a] |
| C10.18 | Situação nova: referência e lista de combinações, definidas por coeficientes de segurança ou por coeficientes de segurança e de combinação. | Falta | N | [N2a] |
| C10.19 | Importar as situações da norma e ajustá-las, reduzindo erros de digitação. | Falta | N | [N2a] |
| C10.20 | Alerta de responsabilidade: situações do usuário não devem resultar em segurança menor que a da norma. | Falta | N | [N2a] |
| | **10.2 Cargas por grupo e na fundação** | | | |
| C10.21 | Sobrecarga de uso definida por grupo ao criar grupos, aplicada nos pavimentos, sem atuar nos furos. | Feito | — | sobrecarga por grupo, fora dos furos |
| C10.22 | Cargas no nível da fundação, consideradas só por radiers. | Falta | FU | radier |
| C10.23 | Aviso no cálculo quando há radier e o grupo de fundação não tem carga, com opção de defini-la na hora e seguir o cálculo. | Falta | FU |  |
| | **10.3 Menu de cargas** | | | |
| C10.24 | Carga de superfície em uma laje inteira com um clique (laje destacada em amarelo), com valor e hipótese, podendo copiar de carga existente. | Parcial | L | carga de área por polígono; sem clique na laje [L5] |
| C10.25 | Cargas lineares automáticas ao longo do eixo de vigas, uma a uma ou por janela de captura. | Parcial | L | carga linear por pontos; sem “ao longo da viga” [L5] |
| | **10.4 Desenhos e relatórios** | | | |
| C10.26 | Desenho de distribuição de cargas especiais com as cargas permanentes e variáveis por grupo; nos demais desenhos as cargas aparecem só se o usuário configurar. | Parcial | E | prancha de locação com as cargas características e de cálculo por pilar (R5); sem cargas especiais por grupo [E4e] |

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
| C11.6 | Número ilimitado de pilares, muros ou pilares-parede apoiados numa sapata ou bloco, em qualquer posição em relação aos eixos dela. | Parcial | FU | FU3 núcleo: `ElementoFundacao.pilares` com vários pilares em qualquer posição (sapata associada e bloco; `fundacao.criar { pilares }`, `calcularGrupo` em `fundacao.ts`, resultante no centro); seleção dos pilares na interface pendente |
| C11.7 | Cálculo como fundação rígida; cabe ao usuário garantir a rigidez. | Feito | — | bloco/sapata rígidos |
| C11.8 | Novo elemento: sapata de concreto armado, sapata de concreto simples ou bloco sobre estacas. | Parcial | FU | FU1: sapata armada, bloco sobre estacas e tubulão lançados pela ferramenta Fundação (`fundacao.criar`); FU3 núcleo: sapata de concreto simples (`simples`, `footings.ts` e `footingsGroup.ts`, NBR 6118 cap. 24, a confirmar); interface do tipo pendente |
| C11.9 | Bloco: escolha do tipo (forma e número de estacas) e definição da estaca — descrição, seção circular ou quadrada, capacidade de carga característica e distância entre eixos. | Feito | — | tipos de bloco (1 a 6 estacas), estaca e capacidade (Décourt-Quaresma) |
| C11.10 | Elemento de um pilar: pilar destacado ao aproximar e prévia da posição relativa pilar/sapata conforme o ponto do cursor (centrada, de divisa, de canto etc.); ângulo padrão igual ao do pilar. | Feito | — | FU1: ferramenta Fundação (U) na planta de fundação: pilar destacado ao aproximar, posição automática pelo ponto do clique (perto do centro: centrada; de uma face: de divisa, com a face realçada; de um canto: de canto) ou escolhida (livre: clique no pilar e no centro), ângulo padrão = o do pilar (`Planta.tsx`, `posicaoPeloClique`, `ladoPeloClique`) |
| C11.11 | Elemento de vários pilares (sapata associada): seleção dos pilares/pilares-parede; ponto de inserção na média das coordenadas dos pilares, movível depois; ângulo do primeiro pilar. | Parcial | FU | FU3 núcleo: sapata associada (`footingsGroup.ts`: base centrada na resultante, tensões sem tração em polígono, faixas pelo diagrama de momentos; ponto de inserção na média dos pilares e ângulo do primeiro, `fundacao.criar`/`fundacao.unir`); seleção dos pilares e ponto de inserção movível na interface pendentes |
| C11.12 | Editar: dimensionar automaticamente ou verificar dimensões e armadura impostas pelo usuário. | Parcial | FU | FU1: dimensiona automaticamente; sapata com dimensões impostas só verificada. FU3 núcleo: impostas de sapata (A, B, h, h0 e armadura por direção), de bloco (lx, ly, h e tirantes) e de tubulão (base e fuste), `fundacao.impor` e modo só verificar (`impostasDoResultado`); editor de blocos, tubulões e armadura na interface pendente |
| C11.13 | Apagar sapata ou bloco. | Feito | — | FU1: `fundacao.remover` pela tecla Del, botão Remover da barra da planta e grupo Fundação (e em cascata no `pilar.remover`) |
| C11.14 | Mover elemento de fundação. | Feito | — | FU1: ferramenta Mover da planta de fundação aplica `fundacao.mover` (o elemento passa a posição livre, pilar excêntrico) |
| C11.15 | Girar em torno do centro: por ângulo digitado, por dois pontos (vetor de direção) ou pelo ângulo de um pilar apoiado (com vários, o do primeiro). | Parcial | FU | FU1: `fundacao.girar` por ângulo digitado, pelo ângulo do pilar (o do primeiro) e em 90° (R), no grupo Fundação e na barra da planta; falta o giro por dois pontos na interface (só pela linha de comando) |
| C11.16 | Unir várias sapatas numa só (não vale para blocos). | Parcial | FU | FU3 núcleo: `fundacao.unir` (só sapatas da mesma cota; blocos não; o primeiro fica, vigas das pontas removidas passam ao unido); interface pendente |
| C11.17 | Igualar sapatas: copiar geometria, tipo e armadura de uma sapata mestre para outras. | Parcial | FU | FU3 núcleo: `fundacao.igualar` (tipo, geometria e armadura calculadas do modelo; as cópias só são verificadas e ficam em erro se não atenderem, FUND_IGUAL_MODELO quando o modelo não tem solução); interface pendente |
| C11.18 | Informação: materiais (inclusive tensão admissível do solo nas sapatas), geometria, resultados, avisos e erros. | Feito | — | resultados, avisos e memorial de fundações; no edifício, fck, aço e cobrimento da fundação nos materiais (`materiais.definir`, FU1) e σadm no terreno |
| | **11.2.3 Opções avançadas de sapatas (módulo adicional)** | | | |
| C11.19 | Limites poligonais que as sapatas de concreto não podem invadir (divisa, poço de elevador, reservatórios), também úteis para gerar sapatas poligonais irregulares. | Parcial | FU | FU3 núcleo: `LimiteFundacao` e `limite.criar/editar/remover` (polilinha aberta ou fechada, por cota de nível); sapata poligonal por recorte do retângulo (`recorteLimites`); interface (desenho do limite) pendente |
| C11.20 | Limites por polilinhas digitadas ou capturadas de gabarito DXF/DWG; valem só para o grupo onde foram lançados; uma sapata pode ser cortada por vários limites. | Parcial | FU | FU3 núcleo: limites por polilinha digitada, válidos por nível (`cota`), vários cortando a mesma sapata; captura da máscara DXF/DWG na interface pendente |
| C11.21 | A sapata é aparada pelo limite, conserva-se a parte com o(s) pilar(es) e o dimensionamento nunca ultrapassa o limite. | Parcial | FU | FU3 núcleo: a sapata de altura constante é aparada, fica a parte com o(s) pilar(es) e `designFootingGroup` dimensiona sobre a região aparada (pressões em polígono, momentos por faixa); desenho do contorno aparado na interface pendente |
| C11.22 | Edição dos limites: apagar, mover, inserir vértice, eliminar trecho. | Parcial | FU | FU3 núcleo: `limite.editar` (`pontos` substitui a polilinha: mover, inserir vértice, eliminar trecho) e `limite.remover`; edição gráfica pendente |
| C11.23 | Restrições do limite: não cortar pilar; cortar o contorno da sapata antes e depois do dimensionamento; não isolar um pilar dos demais numa sapata associada; se violadas, o limite é ignorado. | Feito | — | FU3: limite que corta pilar ou isola pilar da associada é ignorado com aviso (FUND_LIMITE_IGNORADO); limite que não atravessa a base não tem efeito (`footingsGroup.ts`) |
| C11.24 | Limites não afetam vigas de equilíbrio/travamento, blocos, sapatas de altura variável nem sapatas corridas; só sapatas de altura constante. | Feito | — | FU3: só sapatas de altura constante (`alturaConstante`) são aparadas; sapata de altura variável ignora o limite com aviso; blocos, tubulões e vigas não o usam |
| C11.25 | Cargas pontuais, lineares e de superfície aplicadas sobre sapatas, blocos e vigas de fundação, consideradas no dimensionamento. | Feito | — | FU2: cargas pontuais, lineares e de superfície do grupo "fundacao" lançadas na planta de fundação (ferramenta Carga; grupo Fundação › Cargas no nível de fundação) sobre vigas (biapoiadas entre os pilares, levadas às pontas por caso) e sobre elementos (somadas ao pilar, sem momento); fora deles, aviso FUND_CARGA_FORA; núcleo em `vigasFundacao.ts` e `fundacao.ts` |
| C11.26 | Reconhecimento das cargas de apoios de escadas sobre elementos de fundação. | Falta | FU |  |
| C11.27 | Solo sob vigas de equilíbrio/travamento desconsiderado: as vigas resistem às cargas sobre elas e transmitem às sapatas, blocos ou vigas que cruzam. | Parcial | FU | FU2: vigas sem apoio no solo, peso próprio e cargas sobre elas levados às pontas (`cargasDaViga`, `reacoesBiapoiada`); lançamento e janela na interface; cruzamento de vigas pendente |
| | **11.2.4 Sapatas corridas sob muros** | | | |
| C11.28 | Ao lançar um muro, definição da sua fundação: sem vinculação, engastado ou sobre sapata corrida (aba à esquerda, à direita ou ambas). | Falta | FU |  |
| C11.29 | Sapata corrida dimensionada automaticamente. | Falta | FU |  |
| C11.30 | Sapata corrida excêntrica (aba de um lado) exige vigas de equilíbrio até sapatas internas. | Falta | FU |  |
| C11.31 | Atribuir sapata a muro lançado sem ela, pelo menu de elementos de fundação. | Falta | FU |  |
| | **11.2.5 Opções de fundação (dados gerais)** | | | |
| C11.32 | Redução da taxa mecânica mínima de flexão quando a norma permite; sempre aplicada na verificação. | Feito | — | FU3: opção `fundReducaoTaxa` (As,mín = menor entre ρmín·b·h e 4/3 da calculada, NBR 6118 17.3.5.2.1, a confirmar); desligada por padrão |
| C11.33 | Permitir ou não levantamento (descolamento) da sapata; sem permissão, a resultante deve cair no núcleo central. | Feito | — | FU3: opção `fundDescolamento` (ligada: só σmáx limita; desligada: área comprimida ≥ 2/3 [a confirmar]) em sapatas isoladas e associadas |
| C11.34 | Não colocar malha superior se a sapata passar como concreto simples (malha só se falhar à flexão com resistência à tração do concreto). | Feito | — | FU3: malha superior da sapata associada só quando a tração do concreto simples 6M/(b·h²) passa de fctd (γc × 1,2) no momento negativo entre pilares (`FlexDir.top`) |
| C11.35 | Tipo de equilíbrio sob sapata com viga de equilíbrio: distribuição retangular (equilíbrio perfeito) ou trapezoidal (giro da sapata, momento na viga ~10 % menor). | Feito | — | FU2: opção `vigaEqDistribuicao` (0 retangular, equilíbrio total; 1 trapezoidal, equilibrada só a excentricidade além do núcleo central) em Opções de cálculo; a janela do elemento mostra a distribuição, a alavanca (R/N) e o alívio |
| C11.36 | Relação máxima entre o maior vão entre pilares da sapata e a altura, para considerá-la rígida. | Feito | — | FU3: opção `fundVaoAltura` (vão máximo entre pilares vizinhos ≤ 2·h, a confirmar): a altura da associada sobe até a sapata ser rígida |
| C11.37 | Relação máxima entre o maior balanço e a altura. | Feito | — | FU3: opção `fundBalancoAltura` (balanço ≤ 1,5·h, NBR 6118 22.6.1) na sapata isolada e na associada |
| | **11.3 Vigas de equilíbrio e de travamento** | | | |
| C11.38 | Viga de travamento e sapata corrida sem flexão rígida; viga de equilíbrio com flexão, absorvendo o momento da excentricidade entre pilar e eixo da sapata. | Parcial | FU | FU2: viga de equilíbrio com o momento da alavanca (`alavanca`, `diagramaAlavanca`) e travamento com Nk × excentricidade de execução (opção `vigaTravExc`, a confirmar), com editor e janela; sapata corrida (sem flexão rígida) na FU6 |
| C11.39 | Vigas não consideradas apoiadas no solo. | Feito | — | FU2: vigas não apoiadas no solo (só pontas); peso próprio e cargas do nível levados às pontas |
| C11.40 | Equilíbrio atribuível a uma ou às duas extremidades (ex.: equilibra só a ponta da sapata excêntrica, a outra funciona como travamento). | Feito | — | FU2: equilíbrio por ponta (`equilibrio: { ini, fim }`), editor "Pontas equilibradas" (automático, só uma ponta, as duas ou nenhuma); a ponta não equilibrada funciona como travamento/apoio da alavanca |
| C11.41 | Nova viga: de travamento, de equilíbrio (qualquer tipo de sapata) ou com equilíbrio automático nas pontas que chegam a sapatas excêntricas (divisa, canto). | Feito | — | FU2: ferramenta Viga de fundação (B) na planta de fundação, clique em dois elementos (ou pilares de arranque), tipo e seção no grupo Fundação (`vigaFundacao.criar`); equilíbrio "auto" nas pontas que chegam a sapata ou bloco de divisa, canto ou posição livre |
| C11.42 | Edição pós-cálculo da viga; sapata pode ser dimensionada antes e a viga depois. | Feito | — | FU2: vigas calculadas depois dos elementos (alavanca) e editáveis com recálculo só das fundações (`calculo: "fundacao"`, "Calcular fundações" sem refazer a análise) |
| C11.43 | Edição: trocar o tipo de viga numa lista do mesmo tipo. | Feito | — | FU2: editor da viga troca tipo, pontas, equilíbrio por ponta e seção (`vigaFundacao.editar`) |
| C11.44 | Edição: prolongar os estribos da viga de equilíbrio dentro da fundação até as esperas do pilar. | Parcial | FU | FU2: opção `vigaFundEstribosEsperas` (estribos de eixo a eixo dos pilares ou só entre as faces, no aço estimado e no detalhe da janela); desenho nas pranchas na FU5 |
| C11.45 | Edição: alterar comprimentos de ancoragem. | Falta | FU | FU2 calcula lb das barras superiores (nota da viga e detalhe da janela); edição dos comprimentos de ancoragem fica para o desenho (FU5) |
| C11.46 | Edição: verificar a viga atual e listar as verificações feitas. | Feito | — | FU2: seção fixa (`fixa`, imposta ou igualada) só verificada; editor e janela da viga listam as verificações (mensagens FUND_VIGA_* e observações do cálculo) |
| C11.47 | Edição: dimensionar a viga pela norma, listando as verificações. | Feito | — | FU2: `dimensionarVigaFundacao` (flexão com As,mín 17.3.5.2.1, cortante modelo I, pele, ancoragem; altura e depois largura crescentes a partir de 20 × 40 cm); sem "fixa" a viga é dimensionada e o editor lista as verificações; "Impor a seção calculada" fixa o resultado |
| C11.48 | Edição: detalhe com cortes transversal e longitudinal, armadura e dimensões. | Feito | — | FU2: janela da viga de fundação com detalhe longitudinal (pilares das pontas, barras superiores e inferiores com lb, estribos, diagramas de momento e cortante) e transversal (seção com barras, pele e estribo), em SVG (`VigaFundacao.tsx`); desenho nas pranchas fica na FU5 |
| C11.49 | Edição: vista 3D da viga. | Falta | FU |  |
| C11.50 | Apagar viga. | Feito | — | FU2: Remover no editor, Del e botão da barra da planta (`vigaFundacao.remover`); as vigas saem junto com o elemento ou o pilar das pontas |
| C11.51 | Ativar/desativar o equilíbrio em cada extremidade, indicado por seta curva. | Feito | — | FU2: equilíbrio por ponta no editor, indicado na planta por seta curva (anel aberto sobre o pilar da ponta equilibrada) |
| C11.52 | Igualar vigas: copiar o tipo de uma viga de equilíbrio ou travamento para outras; se a seção copiada for insuficiente, a viga fica em vermelho; ancoragens redimensionadas; a mestre não muda. | Feito | — | FU2: "Igualar esta ao modelo" e "Igualar as selecionadas a esta" (`vigaFundacao.igualar`): copia a seção e a fixa (copiada só verificada, em vermelho se não atender); a mestre não muda |
| C11.53 | Módulo avançado: cargas sobre vigas de fundação (como C11.25) e cruzamento de vigas de equilíbrio e travamento. | Parcial | FU | FU2: cargas sobre vigas de fundação como C11.25 (lançadas na planta); FU3 núcleo: cruzamento de vigas (`cruzamentosVF`, `reacoesComApoios`: a de maior prioridade apoia a outra, que passa a contínua com apoio no cruzamento; reação como carga concentrada; FUND_VIGA_CRUZA); interface do cruzamento pendente |
| | **11.4 Geração automática** | | | |
| C11.54 | Geração automática de sapatas e vigas segundo parâmetros dados numa janela. | Falta | FU |  |
| C11.55 | Balanço nulo numa direção quando há pilar em frente só de um lado. | Falta | FU |  |
| C11.56 | Pilares "em frente": eixo desalinhado do pilar gerador menos que a distância de visão D e dentro do ângulo de visão A. | Falta | FU |  |
| C11.57 | Distância máxima entre eixos de pilares para criar sapata associada: padrão 1 m, máximo 3 m. | Falta | FU |  |
| C11.58 | Elementos gerados editáveis depois. | Falta | FU |  |
| | **11.5 Cálculo e resultados** | | | |
| C11.59 | Cálculo e dimensionamento de sapatas, sapatas corridas, blocos, placas de base e vigas de fundação. | Parcial | FU | sapatas, blocos e tubulões no edifício (FU1, `calcularFundacoes` sobre `designSupport`; janela com os desenhos e verificações do módulo Fundações), sapatas associadas e blocos com vários pilares (FU3 núcleo); sem sapatas corridas e placas |
| C11.60 | Aviso de erros/avisos ao fim do cálculo, a consultar depois. | Feito | — |  |
| C11.61 | Vários níveis de fundação; escolha dos grupos cuja fundação será calculada. | Parcial | FU | FU1: cota de assentamento por elemento (`cota`, padrão `cotaFundacao`) editável no grupo Fundação, níveis em `niveisFundacao` e cálculo por nível (`calcularFundacoes`, opção `niveis`); falta a escolha dos níveis calculados na interface |
| C11.62 | Três modos de dimensionamento (descritos na ajuda do programa). | Feito | — | FU1: opção `fundModo` (0 dimensionar, 1 só verificar com as dimensões impostas ou as anteriores, 2 só os com erro) escolhida no grupo Fundação e executada no worker com os resultados anteriores (`calcularFundacoes`) |
| C11.63 | Exige o cálculo completo da estrutura para ter os esforços nas bases dos pilares. | Feito | — | cargas importadas do edifício |
| C11.64 | Elementos com erro em vermelho e mensagem por clique. | Feito | — | FU1: erros e avisos FUND_* (`revisao.ts`) em vermelho/amarelo na planta de fundação, na lista de erros (clique leva ao elemento; duplo clique abre a janela com as mensagens) e na janela do elemento (`Fundacao.tsx`, `JanelaFundacao`) |
| C11.65 | Aviso de sapatas sobrepostas e opção de eliminar sobreposições, que reorganiza e cria sapata associada sob os pilares. | Parcial | FU | FU3 núcleo: aviso FUND_SOBREPOSTA (`sobreposicoes`, `gruposSobrepostos`) e `fundacao.eliminarSobreposicoes` (une as sapatas sobrepostas numa associada); botão na interface pendente |
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
| C12.1 | Aba própria de isovalores: esforços e deslocamentos em cores com escala de valores, e opção de isolinhas. | Falta | V | [V4] |
| C12.2 | Legenda de cores no rodapé com os valores e os extremos máximo e mínimo. | Falta | V | [V4] |
| C12.3 | Isolinhas como curvas de nível: lugar dos pontos com o mesmo valor. | Falta | V | [V4] |
| C12.4 | Mapas e isolinhas anexáveis a desenhos e imprimíveis. | Falta | V | [V4] |
| C12.5 | Painel para ligar/desligar isolinhas e valores e escolher hipótese/combinação e grandeza. | Falta | V | [V4] |
| C12.6 | Mapas por pavimento para lajes nervuradas, maciças e cogumelo: deslocamentos, esforços e áreas de aço. | Falta | V | [V4] |
| C12.7 | Deslocamentos por hipótese ou combinação: vertical z (mm, negativo para baixo), giro em x e giro em y da malha. | Falta | V | [V4] |
| C12.8 | Esforços por hipótese ou combinação: cortante total (√(Qx² + Qy²)), cortante X, cortante Y, momento X, momento Y e momento XY (torção). | Falta | V | [V4] |
| C12.9 | Esforços de cálculo (envoltória mais desfavorável para armar): cortante total, X e Y; momentos X e Y para armadura inferior e para armadura superior. | Falta | V | [V4] |
| C12.10 | Áreas de aço necessárias para o esforço de cálculo: superior ou inferior, em X ou Y. | Falta | V | [V4] |
| C12.11 | Radier: tensão máxima no terreno, levantamento (mm) e tensão por hipótese/combinação. | Falta | V | [V4] |
| C12.12 | Limites de valor máximo e/ou mínimo para restringir a faixa exibida (a ordem das cores se mantém); um limite só localiza o ponto extremo. | Falta | V | [V4] |
| C12.13 | Usos: ver onde a armadura base não basta, onde cabe certo diâmetro, e onde a tensão no solo passa da admissível (dando-a como mínimo). | Falta | V | [V4] |
| C12.14 | Menu de esforços em vigas, vigotas, alveolares e lajes mistas por hipótese, combinação ou envoltória. | Falta | V | [V4] |
| C12.15 | Menu de lajes maciças/nervuradas igual ao da aba de resultados, com vista e edição da armadura. | Falta | V | [V4] |
| C12.16 | Flecha entre dois pontos: secante ou tangente num ponto, com máxima relativa, máxima absoluta ou entre os dois pontos; por hipótese simples, combinação, combinação mais desfavorável e fator de amplificação (também acessível pelas envoltórias). | Falta | V | [V3] |
| C12.17 | Várias janelas simultâneas de isovalores/envoltórias (ex.: permanente e variável lado a lado, ou pavimentos diferentes); configuração mantida até fechar o programa. | Falta | V | [V4] |
| | **12.2 Deformada** | | | |
| C12.18 | Aba de deformada 3D após o cálculo, por hipótese simples ou combinação. | Falta | V | [V3] |
| C12.19 | Opções: escolher hipótese/combinação, fator de escala, estrutura completa ou simplificada, mostrar lajes nervuradas/cogumelo e animação. | Falta | V | [V3] |
| C12.20 | Animação da deformada para identificar comportamento anômalo. | Falta | V | [V3] |
| C12.21 | Elementos deformados coloridos pelo deslocamento resultante (vetor de Δx, Δy, Δz), com legenda no rodapé. | Falta | V | [V3] |
| C12.22 | Várias janelas de deformada simultâneas para comparar hipóteses/combinações. | Falta | V | [V3] |

## 13. Tabelas e bibliotecas

| Item | Funcionalidade (palavras próprias) | Situação | Frente | Statikos |
|---|---|---|---|---|
| | **13.1 Tabelas de armadura** | | | |
| C13.1 | Tabelas de armadura predefinidas para todos os elementos de concreto, todas editáveis, e criação de tabelas novas independentes. | Feito | — | tabelas de armadura de vigas, estribos, pilares e lajes: de fábrica (id "padrao") e criadas pelo usuário, no modelo da obra (`tabelasArmadura.ts`, comando `tabela.definir`, grupo Tabelas de armadura) (R7a); sapatas, blocos e tubulões seguem as bitolas das suas regras |
| C13.2 | Gestão das tabelas na janela de tipos de aço por posição, acessível nos dados gerais. | Feito | — | grupo "Tabelas de armadura" nos dados gerais da obra, junto de Materiais (`TabelasArmadura.tsx`), com abas por elemento, linhas editáveis, importar e exportar JSON (R7a) |
| C13.3 | No cálculo, a armadura é escolhida na tabela; sem solução, aviso para revisar a tabela. | Feito | — | vigas, estribos, pilares e lajes escolhem pela tabela (`escolherBarrasViga`, `escolherEstribo`, busca de pilares, `escolherBarrasLaje`); sem solução: FORA_TABELA (erro, vigas), ARM_MANUAL (erro) ou aviso FORA_TABELA_PILAR (pilares) e FORA_TABELA_LAJE (aviso), com atalho "tabela" na lista de erros (R7a) |
| C13.4 | Recomendação de conferir a coerência de tabelas criadas ou alteradas. | Fora | — |  |
| C13.5 | Restaurar as tabelas originais, perguntando quais alteradas salvar; tabelas acrescentadas pelo usuário são mantidas. | Feito | — | botão "Restaurar a padrão de fábrica" por tipo (comando `tabela.restaurar`): volta a padrão alterada à original e mantém as criadas; exportar JSON antes guarda as alteradas (R7a) |
| | **13.2 Biblioteca de perfis** | | | |
| C13.6 | Bibliotecas de perfis predefinidas de fabricantes, com dimensões e propriedades prontas. | Fora | — | biblioteca de perfis (aço); o Pórtico tem perfis W/HP |
| C13.7 | Perfil individual editável: todas as dimensões e propriedades alteráveis. | Fora | — | biblioteca de perfis (aço); o Pórtico tem perfis W/HP |
| C13.8 | Para usar perfis de uma biblioteca, importá-la para a biblioteca da obra. | Fora | — | biblioteca de perfis (aço); o Pórtico tem perfis W/HP |
| C13.9 | Biblioteca padrão exibida e importação de outras bibliotecas. | Fora | — | biblioteca de perfis (aço); o Pórtico tem perfis W/HP |
| C13.10 | Edição da biblioteca da obra: acrescentar, copiar, editar e apagar perfis. | Fora | — | biblioteca de perfis (aço); o Pórtico tem perfis W/HP |
| C13.11 | Criar biblioteca nova diretamente (importando perfis) ou exportando perfis da obra. | Fora | — | biblioteca de perfis (aço); o Pórtico tem perfis W/HP |

## Histórico de conferência

- **20/10/2026 — conferência após a frente R (R1–R6) e as frentes 0 e N1 (N1a–N1e).** Itens R e N reconferidos no código (`src/core/building/`, `src/core/sheets/`, `src/app/edificio/`, comandos e memorial). Fechados como Feito, entre outros: pilares revisados pela edição (C4.34), biela dos pilares (C4.40), taxa máxima (C4.39), edição pós-lançamento do pilar (C4.3), dimensionamento único por grupo (C3.5), barra acima do máximo (C6.67), diagramas por clique (C6.106, C7.189), engaste de borda por pano (C7.12), redutor de torção das lajes (C7.41), cortante e treliça das vigotas (C7.33). Vigotas de aço e treliças metálicas passaram a Fora, como C7.39/C7.40 (C7.107, C7.108, C7.115, C7.124, C7.125, C7.127). O que a spec da R deixou de fora foi para a frente que vai assumi-lo (E3 vigotas de fabricante, E2 consolos e vigas inclinadas e curvas, V vistas e diagramas por hipótese, N modelo único); o restante ficou como resíduo da R, marcado `[resíduo R]`.
  - Situação: Feito 90 → 103; Parcial 119 → 119; Falta 375 → 356; Fora 179 → 185.
  - Pendências por frente (antes → depois): R 83 → 42; N 32 → 26; E 203 → 227; FU 67 → 67; L 71 → 71; V 38 → 42 (total 494 → 475).
- **20/10/2026 — resíduo da R especificado como fatia R7** (`docs/spec-frente-R.md`, aprovada a criação pelo usuário). A marca `[resíduo R]` foi trocada pela subfatia dona (R7a tabelas de armadura; R7b detalhamento de vigas; R7c detalhamento de pilares; R7d armadura base, tela e predefinida das lajes; R7e edição, uniformização e linhas de dobra das lajes; R7f cópia, agrupamento e rearmar; R7g revisão, relatórios e pranchas). Situações e contagens não mudam.
- **20/10/2026 — auditoria da R7 contra o código** (seção "Auditoria de 20/10/2026" em `docs/spec-frente-R.md`). Os 42 itens R7 deste manual foram reconferidos em `src/core/building`, `src/core/commands`, `src/core/sheets` e `src/app/edificio`: C4.55 passa a Feito (desbloquear o pilar e recalcular mantém os demais bloqueados); C6.34 passa de Falta a Parcial (`viga.unir`/`viga.dividir` existem no núcleo, sem ferramenta na planta); notas de C6.53 (prolongar só por comando) e C6.65 (aviso φt ≤ bw/10 já existe no Pórtico 2D) corrigidas. Os demais 40 confirmados como estavam.
  - Situação: Feito 103 → 104; Parcial 119 → 119; Falta 356 → 355; Fora 185 → 185.
  - Pendências por frente (antes → depois): R 42 → 41; demais sem mudança (total 475 → 474).
- **20/10/2026 — fatia FU1 no núcleo (fundações por pilar e dados do terreno).** Elementos de fundação no modelo do edifício (`ElementoFundacao`, `FundacaoEdificio` em `types.ts`), adaptador `src/core/building/fundacao.ts` sobre o núcleo do módulo Fundações (sapata com pilar fora do centro, de divisa e de canto em `footings.ts`; estacas por capacidade informada em `piles.ts`), comandos `fundacao.*` e `sondagem.*`, arranques, códigos FUND_* na revisão e resultados em `dimensionarEdificio`. Itens da FU1 reconferidos: todos seguem Parcial até a interface da FU1 (C4.2, C11.10, C11.14, C11.15, C11.61, C11.62 e C11.64 saíram de Falta).
  - Situação: Feito 104 → 104; Parcial 119 → 126; Falta 355 → 348; Fora 185 → 185.
  - Pendências por frente: FU 67 → 67 (Parcial 12 → 19, Falta 55 → 48); demais sem mudança.
- **20/10/2026 — fatia FU1, interface.** Grupo "Fundação" da aba Edifício (terreno, tipos de estaca, sondagens com o editor compartilhado `SondagemEditor`, modo de cálculo, parâmetros, lançamento e edição do elemento), planta do nível de fundação (ferramenta Fundação com prévia ao aproximar do pilar, contornos, estacas, centro e excentricidade, erros em vermelho; selecionar, mover, girar, remover), janela do elemento com os desenhos do módulo Fundações, itens FUND_* clicáveis, cálculo das fundações no worker ligado a `revFundacao` (a análise não é refeita) com e sem fundação, arranque no seletor "Morre"/"nasce" e na ferramenta Pilar, aba Fundações em leitura (e2e FU1). Itens que passam a Feito: C4.2, C4.4, C4.5, C4.6, C11.10, C11.13, C11.14, C11.62 e C11.64; C1.35, C11.8, C11.12, C11.15, C11.59 e C11.61 seguem Parcial (vigas de equilíbrio e travamento, radier, concreto simples, impostas de blocos, giro por dois pontos e escolha dos níveis na interface).
  - Situação: Feito 104 → 113; Parcial 126 → 117; Falta 348 → 348; Fora 185 → 185.
  - Pendências por frente: FU 67 → 58 (Parcial 19 → 10, Falta 48 → 48); demais sem mudança.
- **20/10/2026 — FU1: materiais da fundação e itens "a confirmar".** C11.18 com o concreto, o aço e o cobrimento próprios da fundação do edifício (padrão os da obra, `materiais.definir`); cota do terreno, N·e em módulo e raras sem e com vento em separado conferidos contra o cap. 11 (sem registro em contrário) e adotados como padrão do programa de referência. Situação sem mudança.
- **20/10/2026 — fatia FU2 no núcleo (vigas de equilíbrio e de travamento).** `src/core/building/vigasFundacao.ts` (alavanca com várias vigas pela rigidez, diagrama da alavanca, viga biapoiada para as cargas, dimensionamento da viga) e integração em `fundacao.ts` (`calcularFundacaoEdificio`: elementos equilibrados primeiro, centrados pela alavanca; alívio de 50 % no elemento oposto; travamento obrigatório dos blocos de 1 e 2 estacas; cargas do grupo "fundacao"); comandos `vigaFundacao.criar/editar/remover/igualar`; opções `vigaEqAlivio`, `vigaEqDistribuicao`, `vigaTravExc`, `vigaFundBMin`, `vigaFundHMin`, `vigaFundEstribosEsperas`. C11.25, C11.27, C11.35, C11.38–C11.44, C11.46, C11.47, C11.50–C11.53 passam de Falta a Parcial (interface pendente); C11.45 e C11.48 seguem Falta (ancoragem editável e desenho: interface e FU5).
  - Situação: Feito 113 → 113; Parcial 117 → 133; Falta 348 → 332; Fora 185 → 185.
  - Pendências por frente: FU 58 → 58 (Parcial 10 → 26, Falta 48 → 32); demais sem mudança.
- **20/10/2026 — specs N2, E1 e E2 (só documentação).** Pendências N (26) alocadas às fatias N2a–N2g de `spec-frente-N2.md`; pendências E dos cap. 4 e 5 e C6.19/C6.59 (40) às fatias E1a–E1e de `spec-frente-E1.md`; demais do cap. 6 (41) às fatias E2a–E2e de `spec-frente-E2.md`. A fatia vai na nota de cada item (ex. "[E1b]"); a frente continua "N" ou "E", porque `checklists.test.ts` só aceita a letra. Conferido por script: cada id em uma só fatia, sem sobra. Situação e contagens sem mudança.
- **20/10/2026 — fatia FU2, interface (vigas de equilíbrio e de travamento).** Ferramenta Viga de fundação (B) na planta de fundação (clique entre dois elementos ou arranques, com seta curva na ponta equilibrada, seleção, remoção e janela por duplo clique), grupo Fundação com lançamento, lista e editor da viga (tipo, pontas, equilíbrio por ponta, seção e "fixa", igualar, verificações), janela da viga com detalhe longitudinal e transversal (`VigaFundacao.tsx`), alavanca e alívio na janela do elemento, ferramenta Carga no nível de fundação (grupo "fundacao"), escolha dos níveis calculados e giro por dois pontos (G), erros FUND_VIGA_* clicáveis na lista de revisão e card de vigas no Dimensionamento. C11.25, C11.35, C11.39–C11.43, C11.46–C11.48 e C11.50–C11.52 passam a Feito; C11.27, C11.38, C11.44, C11.45 e C11.53 seguem pendentes (cruzamento de vigas, sapata corrida, desenho nas pranchas e ancoragem editável).
  - Situação: Feito 113 → 126; Parcial 133 → 121; Falta 332 → 331; Fora 185 → 185.
  - Pendências por frente: FU 58 → 45 (Parcial 26 → 14, Falta 32 → 31); demais sem mudança.
- **20/10/2026 — specs E3, E4, L e V (só documentação).** Pendências E restantes (146 neste manual) alocadas às fatias E3a–E3f de `spec-frente-E3.md` (cap. 7: 77) e E4a–E4e de `spec-frente-E4.md` (cap. 8, C0.1, C1.33, C1.34 e C10.26: 69); pendências L (71) às fatias L1–L5 de `spec-frente-L.md`; pendências V (42) às fatias V1–V5 de `spec-frente-V.md`. A fatia vai na nota de cada item (ex. "[E3b]", "[L2]", "[V1]"); a frente continua a letra. Conferido por script: cada id em uma só fatia, sem sobra. Previstas reclassificações no fechamento da E4e (C0.1 Feito com "aço fora", C1.34 Fora). Situação e contagens sem mudança.
- **20/10/2026 — fatia FU3 no núcleo (sapatas associadas, blocos com vários pilares, limites e edição).** `src/core/footingsGroup.ts` (sapata de vários pilares e/ou aparada por limites: base centrada na resultante, tensões sem tração em polígono, faixas pelo diagrama de momentos com negativo entre pilares e malha superior só se a tração passar de fctd, compressão diagonal por pilar), `footings.ts` (concreto simples, altura constante, descolamento, armadura imposta, taxa mínima reduzida, balanço/altura), `caps.ts` (bielas por pilar, tirantes pelo equilíbrio dos nós, bloco imposto), `caissons.ts` (tubulão imposto), `fundacao.ts` (`calcularGrupo`, igualar, sobreposição, cruzamento) e `vigasFundacao.ts` (`cruzamentosVF`, `reacoesComApoios`). Comandos `fundacao.unir/igualar/impor/eliminarSobreposicoes` e `limite.criar/editar/remover`; opções `fundDescolamento`, `fundVaoAltura`, `fundBalancoAltura`, `fundSimplesGamma`, `fundReducaoTaxa`; códigos FUND_SOBREPOSTA, FUND_LIMITE_IGNORADO, FUND_IGUAL_MODELO e FUND_VIGA_CRUZA; premissa `fundacoes-grupo`. Falta → Feito: C11.23, C11.24, C11.32, C11.34, C11.37; Parcial → Feito: C11.33, C11.36; Falta → Parcial (interface pendente): C11.11, C11.16, C11.17, C11.19–C11.22, C11.65; notas de C11.6, C11.8, C11.12, C11.53 e C11.59 atualizadas.
  - Situação: Feito 113 → 120; Parcial 133 → 139; Falta 332 → 319; Fora 185 → 185.
  - Pendências por frente: FU 58 → 51 (Parcial 26 → 32, Falta 32 → 19); demais sem mudança.
- **20/10/2026 — fatia V1 (vista 3D do modelo), núcleo e interface.** `src/core/vista3d/` (`cena.ts`: `construirCena` com escopo por grupos, intervalo ou pavimentos e filtro de tipos; geradores registrados em `GERADORES_3D` para pilares por lance, vigas, lajes com furos triangulados (`triangular.ts`, ear clipping próprio), panos a definir e fundações da FU1/FU2; `malha.ts`; `camera.ts`: órbita, enquadramento, troca de projeção e caminhar; `isometrico.ts`: SVG estático) e `src/app/vista3d/` (three.js 0.186.1 vendorizado em `public/vendor` por `scripts/vendor-three.mjs`, carregado sob demanda; `renderizador.ts`, `controles.ts`, `Vista3D.tsx`, aba 3D do Edifício, seleção sincronizada com a planta, captura PNG, fallback em SVG sem o vendor ou sem WebGL, figura isométrica no memorial do edifício). C3.35 a C3.41 e C7.18 fechados como Feito (aço fora na C3.36; paredes entram com a E1 na C3.41). Premissas a confirmar: altura do olho 1,6 m, velocidade inicial 2 m/s, toco do arranque 0,4 m, estaca nominal de 5 m sem comprimento calculado, viga invertida sobe a partir da cota da laje, detalhe alto = capa e vigotas em linhas.
  - Situação: Feito 126 → 134; Parcial 121 → 121; Falta 331 → 323; Fora 185 → 185.
  - Pendências por frente: V 42 → 34 (Parcial 7 → 7, Falta 35 → 27); demais sem mudança.
- Regra: toda fatia atualiza as linhas que tocou e as tabelas de resumo; `src/core/checklists.test.ts` reprova contagens divergentes e itens pendentes sem frente.
- **20/10/2026 — fatia R7a (tabelas de armadura editáveis, núcleo e interface).** C13.1, C13.2, C13.3 e C13.5 passam a Feito: tabelas de vigas, estribos, pilares e lajes (`src/core/building/tabelasArmadura.ts`, comandos `tabela.definir` e `tabela.restaurar`, grupo Tabelas de armadura, importar e exportar JSON, atalho da lista de erros), erros FORA_TABELA e ARM_MANUAL e avisos FORA_TABELA_PILAR e FORA_TABELA_LAJE.
  - Situação: Feito 143 → 147; Parcial 126 → 125; Falta 309 → 306; Fora 185 → 185.
  - Pendências por frente: R 41 → 37; demais sem mudança.
