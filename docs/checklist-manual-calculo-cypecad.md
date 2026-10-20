# Checklist de paridade com o manual de cálculo do CYPECAD

Comparação item a item entre o manual de cálculo do CYPECAD (edição polonesa, válida a partir da versão 2012.a, 111 págs., capítulo único "Cálculo", seções 1.1 a 1.15) e o Statikos em 20/10/2026. O manual foi lido por completo em duas partes (págs. 1–80 e 81–111); as figuras não foram extraídas. As descrições estão em palavras próprias (reconstrução limpa: nada de texto, nomes de comando ou telas copiados). A paridade buscada é de função, nunca de implementação. Quando o manual cita norma estrangeira (EC2, EHE, ACI, CEB-FIP, CIRSOC) e existe NBR equivalente, o item é comparado com o que o Statikos faz pela NBR.

Situação: **Feito** (o Statikos faz o equivalente pela norma brasileira), **Parcial** (menos alcance, só no módulo Pórtico 2D ou Fundações e não no edifício, ou premissa fixa não editável), **Falta**, **Fora** (norma estrangeira sem equivalente relevante, sismo, aço/misto/madeira/alumínio no edifício, lajes mistas, exemplo numérico, recomendação ao usuário ou critério interno do outro programa sem função para nós).

Frente (só para Parcial e Falta): **N** cálculo e normas; **R** revisão de resultados e detalhamento; **E** elementos estruturais; **FU** fundações; **L** lançamento e produtividade; **V** visualização.

## Resumo por seção

| Seção | Itens | Feito | Parcial | Falta | Fora |
|---|---|---|---|---|---|
| 1.1 Problema a resolver e escopo (pág. 4) | 8 | 2 | 4 | 1 | 1 |
| 1.2 Análise realizada (págs. 4–5) | 10 | 4 | 3 | 2 | 1 |
| 1.3 Discretização da estrutura, dimensão dos nós e envoltórias nos apoios (págs. 5–15) | 59 | 9 | 13 | 27 | 10 |
| 1.4 Opções de cálculo (págs. 15–27) | 92 | 19 | 15 | 45 | 13 |
| 1.5 Cargas: verticais, vento, sismo e 2ª ordem (págs. 27–37) | 59 | 28 | 8 | 9 | 14 |
| 1.6 Materiais (págs. 37–38) | 11 | 5 | 3 | 0 | 3 |
| 1.7 Coeficientes parciais de segurança (págs. 38–39) | 5 | 2 | 3 | 0 | 0 |
| 1.8 Combinações (págs. 39–41) | 8 | 1 | 2 | 1 | 4 |
| 1.9 Entrada de dados (págs. 41–65) | 116 | 15 | 21 | 67 | 13 |
| 1.10 Cálculo da estrutura (págs. 65–67) | 11 | 7 | 0 | 2 | 2 |
| 1.11 Resultados, relatórios e desenhos (págs. 67–76) | 62 | 3 | 28 | 28 | 3 |
| 1.12 Verificação e dimensionamento: vigas, pilares, paredes e vigotas (págs. 76–90) | 120 | 8 | 23 | 66 | 23 |
| 1.13 Lajes alveolares, maciças e nervuradas (págs. 90–95) | 45 | 2 | 2 | 37 | 4 |
| 1.14 Flechas de vigas (págs. 95–97) | 12 | 1 | 9 | 1 | 1 |
| 1.15 Deformações de lajes e fundações (págs. 97–111) | 43 | 1 | 15 | 8 | 19 |
| **Total** | **661** | **107** | **149** | **294** | **111** |

## Pendências por frente (Parcial + Falta)

| Frente | Parcial | Falta | Total |
|---|---|---|---|
| N — Cálculo e normas | 69 | 61 | 130 |
| R — Revisão de resultados e detalhamento | 44 | 81 | 125 |
| E — Elementos estruturais | 16 | 125 | 141 |
| FU — Fundações | 8 | 15 | 23 |
| L — Lançamento e produtividade | 5 | 0 | 5 |
| V — Visualização | 7 | 12 | 19 |
| **Total** | **149** | **294** | **443** |

## Divergências de premissa

Itens em que o critério do manual difere de uma premissa nossa (confirmada ou "a confirmar"). Servem para o usuário decidir se mantém a premissa, torna o valor editável ou adota o critério do manual.

- **Torção das vigas e lajes** (K1.4.33, K1.4.24) — *resolvido na N1a: redutores editáveis por tipo (vigas 15 %, lajes 15 %, pilares 1); falta a seção bruta na torção de equilíbrio (K1.4.35)*: nós 15 % fixo (vigas: rigidez elástica; lajes: 15 % de 2I); pilares sem redução. Manual: coeficiente redutor configurável, inclusive nos pilares, e seção bruta na torção de equilíbrio.
- **Rigidez axial dos pilares** (K1.4.36) — *resolvido na N1a: multiplicador editável 1 a 99,99, padrão 2*: nós área × 2 fixa. Manual: multiplicador de 1 a 99,99, mesmo padrão 2.
- **Trecho rígido no nó** (K1.3.45, K1.3.51, K1.3.57): nós até a face do pilar − 0,3h (NBR 6118 14.6.2.1) e dimensionamento na parte flexível. Manual: trecho rígido até a face, arredondamento cúbico do diagrama dentro do apoio e mísula fictícia 1:3.
- **Malha da grelha** (K1.3.21) — *resolvido na N1a: editável, padrão 0,25 m*: nós 0,5 m fixa. Manual: no máximo 25 cm (nervuradas: 1/3 do intereixo).
- **Engaste no topo do último lance** (K1.4.9, K1.4.11) — *topo do último lance resolvido na N1a (padrão 0,3); por lance fica na N1a-2*: nós ligação monolítica plena em todos os nós. Manual: coeficiente de engaste 0,3 no topo do último lance e 0–1 por lance, topo e base.
- **Engaste parcial de bordas** (K1.4.14, K1.4.15, K1.9.40): nós continuidade plena laje–viga (só rótula na ponta da viga). Manual: coeficiente 0–1 por borda de laje e por borda de viga.
- **Redistribuição e momentos mínimos** (K1.4.2, K1.4.3, K1.4.38): nós nenhuma redistribuição nem momento mínimo. Manual: redistribuição padrão 15 % (vigas) e 25 % (vigotas), até 30 %; momentos mínimos opcionais pl²/x.
- **Rigidez no γz** (K1.5.46, K1.5.52, K1.5.53): nós 0,4·Eci·Ic nas vigas e 0,8·Eci·Ic nos pilares (NBR 6118 15.7.3). Manual: multiplicador de deslocamentos, padrão 1,00 e recomendado 2,0 (NB-1: 1/0,7).
- **Limite e uso do γz** (K1.5.45, K1.5.48, K1.5.52): nós limite 1,3 com aviso e vento das ELU × 0,95·γz entre 1,1 e 1,3. Manual: aceita até 1,5 e amplia os esforços pelo próprio γz nas combinações com ação horizontal.
- **Carga variável no ΔM do γz** (K1.5.57): nós ψ0·Q quando o vento é principal e Q integral quando o uso é principal. Manual: sobrecarga integral sempre.
- **Comprimento de flambagem** (K1.9.11, K1.9.15, K1.9.16) — *resolvido na N1b: ℓe = mín(ℓ0 + h; ℓ) × α do pavimento × α do lance, editável por direção*: nós le = altura entre cotas, β = 1 fixo. Manual: altura livre (pé-direito − viga ou laje mais alta) × α editável por pavimento, pilar e direção; a NBR 6118 15.6 também permite ℓ0 + h ≤ ℓ.
- **Simetria da armadura dos pilares** (K1.4.50, K1.12.4-3): nós sempre simétrica no contorno. Manual: padrão não simétrico, com tolerância % configurável para forçar simetria.
- **Estribos dos pilares** (K1.12.4-11): nós φ5 ou φ6,3 c/ mín(20 cm; menor lado; 12φ), fixo. Manual: tipologias e tabelas editáveis com grampos.
- **Vento** (K1.5.21, K1.5.27, K1.5.25): nós Ca único por direção (X/Y), força no mestre com ± 0,075·largura, sem platibanda nem repartição por zona. Manual: coeficiente por sentido, largura corrigida pela platibanda e repartição por zona independente.
- **Fator de flecha das lajes** (K1.15.3-2, K1.15.3-4, K1.15.4-7, K1.15.4-33): nós elástica (G + ψ2·Q) × (1 + αf) = × 2,32, sem fissuração, só limite total L/250. Manual: fator editável, padrão 2,5; quadro de 2,0/1,75 (ativa), 3,0/2,5 (total) e 1,5/1,25 (conforto) para maciça/nervurada.
- **Flecha relativa ou absoluta** (K1.15.3-3): nós deslocamento total, incluindo o das vigas. Manual: flecha relativa aos apoios ou pontos de inflexão, descontando o encurtamento dos pilares.
- **Flecha ativa de vigas** (K1.14-9): nós (Pórtico 2D) parcela após a alvenaria ≈ αf·f0, a confirmar. Manual: fA = αg·fg + αq·fq com frações de carga por etapa construtiva.
- **Fissuração** (K1.12.1-21 a K1.12.1-25): nós NBR 6118 17.3.3 só no Pórtico 2D, com aviso. Manual: expressão do CEB-FIP MC90 e aumento automático da armadura até atender.
- **Momentos das lajes maciças** (K1.13.2.2-2, K1.13.2.2-3): nós momento das barras da grelha dividido pela largura da malha, torçor desprezado. Manual: Wood-Armer com o torçor e redistribuição transversal em faixa de 1 m.
- **Cortante das vigas** (K1.12.1-5): nós cortante máximo da parte flexível. Manual: estribos a partir da face do apoio ou de uma distância em % de d.

Lacunas de código encontradas na conferência (corrigidas em 20/10/2026, frente 0):

- ~~`dimensionamento.ts` usa fyk = 500 MPa fixo, mesmo com CA-60 escolhido na norma da obra (K1.6.4).~~ Corrigido: fyk do aço da obra, com aviso de bitola > φ10 em CA-60; aço por posição fica na frente N1.
- ~~Pilares do edifício descartam as combinações com Nd ≤ 0: pilar tracionado não é verificado (K1.12.4-16).~~ Corrigido: tração verificada por fibras, sem 2ª ordem.
- ~~Os furos das lajes (`laje.abertura`) entram nos quantitativos, mas a grelha os ignora: a laje é calculada e carregada cheia (K1.9.103).~~ Corrigido: a malha exclui as aberturas e as bordas delas viram faixas livres.

## 1.1 Problema a resolver e escopo (pág. 4)

| Item | Critério / funcionalidade | Situação | Frente | Statikos |
|---|---|---|---|---|
| K1.1.1 | Análise de esforços e dimensionamento de estruturas de concreto armado e aço que suportam lajes de vigotas (comuns, armadas, protendidas, moldadas in loco, de aço, alma vazada), alveolares, mistas, nervuradas e maciças, em edifícios sob cargas verticais e horizontais. | Parcial | E | lajes maciças e treliçadas; faltam nervuradas e alveolares (mistas fora) |
| K1.1.2 | Vigas de apoio das lajes podem ser de concreto armado, aço ou mistas (aço + concreto). | Feito | — | vigas de concreto armado; aço e mistas fora do escopo do edifício |
| K1.1.3 | Apoios possíveis: pilares de concreto ou aço, pilares-parede de concreto, paredes de concreto (com ou sem empuxo lateral) e paredes de alvenaria (comum ou de blocos de concreto). | Parcial | E | pilares de concreto retangulares e circulares; faltam pilares-parede, paredes de concreto e alvenaria estrutural |
| K1.1.4 | Fundações: sapatas isoladas, sapatas corridas/vigas de fundação, blocos sobre estacas e radiers. | Parcial | FU | sapatas isoladas, blocos de 1 a 6 estacas e tubulões (módulo Fundações); faltam corridas, vigas de fundação e radier |
| K1.1.5 | Fundações podem ser projetadas isoladamente da estrutura, só com "arranques" de pilar com cargas. | Feito | — | módulo Fundações dimensiona só com cargas por apoio (`piles.ts`, `foundation.ts`) |
| K1.1.6 | Escadas de concreto apoiadas nas lajes podem ser lançadas. | Falta | E | escadas |
| K1.1.7 | Saídas: desenhos com dimensões e armaduras de vigas, pilares, pilares-parede e paredes (plotter, impressora, DXF/DWG, PDF), listagens de resultados e memórias de cálculo. | Parcial | R | pranchas de formas PDF/DXF/DWG e memorial HTML; faltam desenhos de armadura |
| K1.1.8 | Com módulo 3D adicional: barras de aço, madeira e alumínio integradas ao edifício. | Fora | — | barras de aço, madeira e alumínio no edifício |

## 1.2 Análise realizada (págs. 4–5)

| Item | Critério / funcionalidade | Situação | Frente | Statikos |
|---|---|---|---|---|
| K1.2.1 | Análise espacial 3D por matriz de rigidez de todos os elementos (pilares, pilares-parede, vigas, lajes). | Parcial | N | modelo separado: grelha por pavimento + pórtico espacial; lajes não entram na matriz do pórtico |
| K1.2.2 | Compatibilidade de deslocamentos em todos os nós com 6 graus de liberdade. | Feito | — | `fe3d.ts`: 6 GL por nó no pórtico espacial |
| K1.2.3 | Hipótese de diafragma rígido por pavimento: plano indeformável; cada pavimento só translada e gira como corpo rígido (3 GL no plano). | Feito | — | diafragma rígido mestre-escravo por pavimento (`analitico.ts`) |
| K1.2.4 | Diafragma rígido vale para cada zona independente do pavimento, mesmo quando só há vigas (sem laje). | Parcial | N | um diafragma por pavimento com todos os nós do nível; zonas independentes não separadas |
| K1.2.5 | Exceções ao diafragma: vigas "livres" desligadas do diafragma pelo usuário e paredes que não tocam nenhuma laje (desde a versão 2012.a). | Parcial | N | vigas fora do diafragma (viga.editar foraDiafragma, N1a); paredes fora do diafragma dependem das paredes (E) |
| K1.2.6 | Zonas independentes num mesmo pavimento são diafragmas separados, sem influência mútua; pilar não ligado a nada é zona independente. | Falta | N | diafragmas separados por zona independente no mesmo pavimento |
| K1.2.7 | Cálculo estático para todos os casos de carga; para sismo, análise modal espectral. | Feito | — | estática para G, Q e 12 casos de vento; análise modal é do sismo (fora) |
| K1.2.8 | Comportamento linear dos materiais; análise de 1ª ordem para deslocamentos e esforços. | Feito | — | análise linear de 1ª ordem; 2ª ordem global pelo γz |
| K1.2.9 | Estruturas 3D integradas: sempre 6 GL por nó (sem diafragma). | Fora | — | estruturas 3D integradas (barras genéricas de aço/madeira) |
| K1.2.10 | Escadas: 6 GL, calculadas à parte; reações transferidas à estrutura principal. | Falta | E | escadas |

## 1.3 Discretização da estrutura, dimensão dos nós e envoltórias nos apoios (págs. 5–15)

| Item | Critério / funcionalidade | Situação | Frente | Statikos |
|---|---|---|---|---|
| K1.3.1 | Estrutura discretizada em barras, grelhas de barras e nós, e elementos finitos triangulares. | Parcial | N | só barras (pórtico e grelha); sem elementos finitos de casca |
| K1.3.2 | Pilares: barras verticais entre pavimentos, nó na base (fundação, viga ou laje) e nó em cada pavimento; eixo = eixo da seção. | Feito | — | lance entre pavimentos, nó na base e em cada pavimento, no centro da seção |
| K1.3.3 | Pilares: excentricidades por mudança de seção entre pavimentos são consideradas. | Parcial | N | nó de cada lance no centro da sua seção: barra levemente inclinada, sem trecho rígido de excentricidade |
| K1.3.4 | Pilares: comprimento da barra = altura ou distância livre entre faces dos elementos dos pavimentos inicial e final. | Parcial | N | comprimento = distância entre cotas; distância livre entre faces não usada |
| K1.3.5 | Vigas: definidas em planta; nós nas interseções com faces dos apoios (pilares, pilares-parede, paredes), com elementos de laje e com outras vigas; nós ao longo do eixo, nas extremidades, nos balanços e extremos livres. | Feito | — | nós nos cruzamentos e apoios (`dividirVigas`); no pórtico o nó fica no eixo do pilar com trecho rígido |
| K1.3.6 | Vigas: por padrão 3 GL (mantêm o diafragma), mesmo sem laje definida; podem ser desligadas do diafragma (vigas livres). | Feito | — | vigas no diafragma por padrão; opção "fora do diafragma" por viga (N1a) |
| K1.3.7 | Tipos de viga: concreto armado, aço, mista, madeira; seções de biblioteca. | Parcial | E | só concreto retangular; sem seção T colaborante nem biblioteca (aço/madeira fora) |
| K1.3.8 | Eixo da barra de viga no plano médio vertical da alma, na altura do centro de gravidade. | Feito | — | eixo da viga no plano do pavimento (prática usual com diafragma) |
| K1.3.9 | Viga de apoio em muro (apoio contínuo simulado): série de apoios nos nós de discretização com rigidez aumentada ×100 — equivale a viga muito rígida contínua com vãos curtos. | Falta | E | apoio contínuo em muro |
| K1.3.10 | Três tipos de apoio em muro: engaste (deslocamentos e rotações impedidos), articulação (deslocamentos impedidos, rotação livre), articulação com deslizamento horizontal (só vertical impedido). | Falta | E | tipos de vínculo do apoio em muro |
| K1.3.11 | Alerta: pilares que tocam esses apoios podem ficar "pendurados" — a carga não chega à fundação e podem surgir reações negativas. | Fora | — | alerta ligado a recurso inexistente (apoio em muro) |
| K1.3.12 | Alerta: na articulação deslizante, viga contínua ou alinhada ao eixo do apoio gera engaste por continuidade (momentos negativos na borda); conferir se a obra garante isso; viga desalinhada comporta-se como articulada. | Fora | — | alerta ligado a recurso inexistente |
| K1.3.13 | Para evitar engaste por continuidade: rótula na extremidade da viga junto ao apoio. | Fora | — | conselho de modelagem; rótula de extremidade já existe |
| K1.3.14 | Limitação: não se obtêm as reações desses apoios em muro. | Fora | — | limitação do outro programa |
| K1.3.15 | Vigas de fundação: vigas "flutuantes" sobre meio elástico; molas nos nós a partir do coeficiente de reação (módulo de reação do solo). | Falta | FU | vigas de fundação sobre base elástica (Winkler) |
| K1.3.16 | Vigas inclinadas: barras entre dois pontos no mesmo nível ou em níveis diferentes, com 2 nós; ligando zonas independentes não impõem diafragma (6 GL livres). | Falta | E | vigas inclinadas |
| K1.3.17 | Consolos curtos: tratados em capítulo próprio (fora do trecho lido). | Falta | E | consolos curtos (NBR 6118 22.5) |
| K1.3.18 | Lajes de vigotas: vigotas são barras nos panos entre vigas/paredes, com nós nas interseções; vigotas duplas e triplas permitidas; geometria da vigota definida na ficha da laje. | Parcial | E | treliçadas como faixas T na grelha (`propriedadesLaje`); vigotas não são barras individuais |
| K1.3.19 | Lajes alveolares: unidirecionais, discretizadas por barras a cada 40 cm; propriedades e resistências pela ficha da laje (biblioteca do usuário). | Falta | E | lajes alveolares (NBR 14861) |
| K1.3.20 | Lajes alveolares: cálculo aproximado do processo construtivo alterando o engaste das bordas (método simplificado). | Falta | E | fase construtiva das alveolares |
| K1.3.21 | Lajes maciças: grelha de barras com malha máxima de 25 cm. | Feito | — | opções de cálculo: malha configurável, padrão 0,25 m (N1a) |
| K1.3.22 | Lajes maciças: condensação estática (método exato) de todos os GL; considera deformação por cortante; mantém diafragma rígido; considera rigidez à torção. | Parcial | N | grelha Euler-Bernoulli (sem cortante); torção 15 % de 2I; diafragma só no pórtico |
| K1.3.23 | Lajes mistas (fôrma de aço trapezoidal): unidirecionais com barras a cada 40 cm; a chapa pode ser só fôrma perdida ou colaborante (comportamento misto). | Fora | — | lajes mistas |
| K1.3.24 | Radiers: lajes maciças "flutuantes", mesma discretização das lajes, com molas pelo coeficiente de reação; cada pano pode ter coeficiente distinto. | Falta | FU | radier |
| K1.3.25 | Lajes nervuradas: grelha com malha = 1/3 do intereixo das nervuras da zona aliviada. | Falta | E | lajes nervuradas bidirecionais |
| K1.3.26 | Lajes nervuradas: inércia à flexão das barras = metade da da zona maciça (tanto na zona maciça quanto na aliviada, como média); inércia à torção = 2 × a de flexão. | Falta | E | lajes nervuradas (inércias da malha) |
| K1.3.27 | Lajes nervuradas: malha igual nas zonas maciça e aliviada; considera cortante, diafragma e rigidez à torção. | Falta | E | lajes nervuradas |
| K1.3.28 | Pilares-parede: seção qualquer composta de retângulos, entre pavimentos, com nível inicial e final; altura de cada lado constante, espessura variável. | Falta | E | pilares-parede de seção composta |
| K1.3.29 | Pilares-parede: cada lado deve ter dimensão ≥ 5 × a outra; senão a discretização por elemento finito não é adequada e pode ser tratado como pilar (elemento linear). | Parcial | E | lado > 5 × o menor gera aviso de pilar-parede; segue como barra (premissa a confirmar) |
| K1.3.30 | Pilares-parede: vigas e lajes ligam-se aos lados em qualquer posição/direção por meio de viga fictícia de largura = espessura do trecho e altura constante de 25 cm; nós não coincidem com os da viga. | Falta | E | ligação de vigas e lajes ao pilar-parede |
| K1.3.31 | Paredes de concreto, de alvenaria e de blocos de concreto armado: seção composta de retângulos; dimensões dos lados podem mudar por pavimento e espessura pode diminuir por pavimento. | Falta | E | paredes de concreto e de alvenaria estrutural |
| K1.3.32 | Paredes: mesma regra de esbeltez (lado ≥ 5 × espessura), senão tratadas como pilares. | Falta | E | paredes (regra de esbeltez) |
| K1.3.33 | Paredes: vigas e lajes ligam-se em qualquer posição; todos os nós gerados coincidem com nós da malha triangular da parede. | Falta | E | paredes (ligação com vigas e lajes) |
| K1.3.34 | Paredes: elementos finitos triangulares de casca espessa (com deformação por cortante), 6 nós (vértices e meios dos lados), 6 GL por nó. | Falta | N | elemento finito de casca espessa |
| K1.3.35 | Paredes: malha triangular adaptada à geometria e às aberturas, refinada em cantos, bordas e pontos singulares. | Falta | N | malha triangular adaptativa |
| K1.3.36 | Paredes que não tocam lajes não ficam no diafragma daquele nível. | Falta | N | paredes fora do diafragma |
| K1.3.37 | Escadas: elementos finitos triangulares de casca espessa nos lances inclinados e patamares. | Falta | E | escadas |
| K1.3.38 | Escadas: apoios inicial e final simulados como laje por viga de rigidez elevada; apoios intermediários por apoios elásticos (alvenaria ou tirantes). | Falta | E | escadas (apoios) |
| K1.3.39 | Escadas: só casos gravitacionais (permanente e variável). | Falta | E | escadas (casos) |
| K1.3.40 | Escadas: calculadas à parte; reações integradas como cargas lineares aplicadas ao resto da estrutura nas ligações. | Falta | E | escadas (reações como cargas) |
| K1.3.41 | Escadas não entram na análise global (justificativa: grande influência das forças horizontais sobre elas). | Falta | E | escadas fora da análise global |
| | **1.3.1 Dimensão dos nós (págs. 10–12)** | | | |
| K1.3.42 | Nós gerais de dimensão finita no eixo dos pilares e nas interseções laje × eixo de viga; cada nó geral tem zero ou mais nós associados. | Feito | — | nó no eixo do pilar ligado à face por trecho rígido (`offsetFace`, offI/offJ) |
| K1.3.43 | Nós associados: interseções de elementos de laje com faces de vigas e pilares, e de eixos de vigas com faces de pilares. | Parcial | N | grelha: nó da viga dentro do pilar com w preso; sem trechos rígidos laje–face |
| K1.3.44 | Nós associados ligados ao geral por compatibilidade de deformação plana (corpo rígido): δz2 = δz1 − Ax·θy1 + Ay·θx1 (forma do texto), θx2 = θx1, θy2 = θy1. | Feito | — | compatibilidade de corpo rígido pelos offsets das barras |
| K1.3.45 | Barras entre o eixo do pilar e suas faces são infinitamente rígidas (trechos rígidos). | Parcial | N | nós: trecho rígido até a face − 0,3h (NBR 6118 14.6.2.1), fixo; manual: até a face |
| K1.3.46 | Dimensão das vigas considerada da mesma forma (deformação plana). | Parcial | N | viga apoiada em viga sem dimensão do nó |
| K1.3.47 | Alerta de modelagem: elementos tratados como lineares (pilares, vigas, vigotas) que na realidade são 2D/3D — consolos curtos, vigas-parede, lajes que são vigas, pilares e pilares-parede curtos — exigem correções manuais do usuário. | Falta | R | avisos de viga-parede, consolo, pilar curto (NBR 6118 22) |
| | **1.3.2 Envoltórias de esforços nos apoios (págs. 12–15)** | | | |
| K1.3.48 | Referência ao CEB-FIP MC 1990 art. 5.2.3.2: vão efetivo entre eixos; quando a reação está longe do eixo, considerar a posição real; na análise de pórtico, trechos rígidos entre eixo do pilar e extremidade da viga. | Feito | — | vão entre eixos com trechos rígidos no pórtico |
| K1.3.49 | Dimensão do nó modelada por trechos rígidos entre eixo do apoio e extremo da viga (reação excêntrica). | Feito | — | trechos rígidos entre eixo do pilar e viga |
| K1.3.50 | Dentro do apoio, reação admitida com variação linear. | Fora | — | critério interno de distribuição da reação no apoio |
| K1.3.51 | Dentro do apoio, momento como parábola cúbica M = ax³+bx²+cx+d e cortante Q = 3ax²+2bx+c, com 4 condições de contorno (Q e M nas duas faces) — "arredondamento" do diagrama. | Parcial | R | dimensiona na parte flexível (face − 0,3h); sem arredondamento (NBR 6118 14.6.3) |
| K1.3.52 | Referência a Branson (1977) sobre vão teórico × vão livre e momento no eixo × na face. | Fora | — | referência bibliográfica |
| K1.3.53 | Critério para tratar como elemento linear: vão/comprimento > 1/3 da altura média e > 4 × a largura média (texto como no manual). | Falta | R | aviso de elemento linear × não linear (NBR 6118 14.4.1) |
| K1.3.54 | EC2: redução do momento no apoio ΔM = reação × largura do apoio / 8. | Parcial | R | ΔM = R·t/8 (NBR 6118 14.6.3) não aplicado; trecho rígido faz papel parecido |
| K1.3.55 | EC2: em ligação monolítica, momento de cálculo na face do apoio, não menor que 65 % do momento no eixo (engaste perfeito nas faces). | Parcial | R | momento na face − 0,3h; sem mínimo em % do momento no eixo |
| K1.3.56 | Referência a CIRSOC (Argentina) / DIN: arredondamento parabólico conforme dimensão dos apoios. | Fora | — | referência a norma estrangeira |
| K1.3.57 | Dentro do apoio, altura da viga cresce linearmente com inclinação 1:3 até o eixo (mísula fictícia para dimensionamento). | Fora | — | mísula fictícia 1:3: critério interno; nós dimensionamos na face − 0,3h |
| K1.3.58 | Resultado: armadura máxima fica entre a face e o eixo, em geral na face — economia de armadura longitudinal. | Fora | — | consequência do critério interno anterior |
| K1.3.59 | Viga apoiada em apoio longitudinal (pilar-parede ou parede): diagrama prolongado a partir da face por um comprimento = altura da viga; armadura dimensionada só nesse trecho; viga e armadura interrompidas depois disso, mesmo que a viga seja mais larga que o apoio. | Falta | E | viga apoiada em pilar-parede ou parede |

## 1.4 Opções de cálculo (págs. 15–27)

| Item | Critério / funcionalidade | Situação | Frente | Statikos |
|---|---|---|---|---|
| K1.4.1 | Grande conjunto de parâmetros configuráveis que afetam esforços e dimensionamento; opções gerais, de vigas, de lajes, de ligações; tabelas de armadura e opções por elemento. | Parcial | N | opções de análise fixas no código (malha, torção, área × 2, trecho rígido); editáveis: norma, vento, ψ |
| | **1.4.1 Redistribuições (págs. 15–18)** | | | |
| K1.4.2 | Redistribuição de momentos negativos em vigas e vigotas até 30 % (configurável). | Falta | N | redistribuição de momentos (NBR 6118 14.6.4.3) |
| K1.4.3 | Valores recomendados/padrão: 15 % para vigas e 25 % para vigotas (padrão). | Falta | N | padrões de redistribuição |
| K1.4.4 | Redistribuição feita após o cálculo (pós-processamento). | Falta | N | redistribuição como pós-processamento |
| K1.4.5 | Alerta: redistribuição excessiva gera flechas e fissuração grandes, inadequadas com paredes divisórias. | Fora | — | alerta do manual |
| K1.4.6 | 25 % nas lajes ≈ igualar momentos negativos e positivos. | Fora | — | comentário do manual |
| K1.4.7 | Redistribuição aplicada aos momentos negativos nas bordas dos apoios (faces dos pilares), afetando o vão livre; momentos dentro do apoio recalculados a partir da face com o arredondamento de 1.3.2. | Falta | N | redistribuição nas faces dos apoios |
| K1.4.8 | Em vigas e lajes de vigotas, além da redistribuição, pode-se impor momentos mínimos positivos e negativos de norma. | Falta | N | momentos mínimos de norma em vigas |
| K1.4.9 | Coeficiente de engaste no topo do último lance de pilar (ligação com a viga): 0 (rótula) a 1 (engaste); padrão 0,3. | Feito | — | opções de cálculo: engaste no topo do último lance 0–1, padrão 0,3 (N1a) |
| K1.4.10 | Implementação: interpolação linear das matrizes de rigidez engaste-engaste e engaste-rótula: K = α·Kee + (1−α)·Ker, afetando os termos EI/L do último lance. | Feito | — | fe3d: engaste parcial por interpolação K = α·Kee + (1 − α)·Ker (N1a) |
| K1.4.11 | Coeficiente de engaste por lance de pilar, no topo e/ou na base (0 = rótula, 1 = engaste, padrão 1); os do topo do último lance multiplicam o anterior. | Feito | — | pilar.engaste: coeficiente por lance no topo e na base; no último lance multiplica o das opções (N1a) |
| K1.4.12 | Rótula plástica do pilar fica fisicamente na ligação topo/base com viga ou laje maciça/nervurada que toca o nó. | Fora | — | detalhe de implementação |
| K1.4.13 | Alerta: coeficientes muito baixos no extremo de viga e no topo do último pilar com rótula na viga podem gerar resultados absurdos ou mecanismo (duas rótulas ligadas por trechos rígidos). | Fora | — | alerta do manual |
| K1.4.14 | Lajes maciças, de vigotas e nervuradas: coeficiente de engaste variável 0–1 (padrão 1) em todas as bordas de apoio. | Feito | — | laje.editar engasteBordas: coeficiente 0–1 por aresta do contorno (N1a) |
| K1.4.15 | Bordas de vigas: coeficiente de engaste 0–1 (padrão 1), por borda, uma ou mais por viga. | Feito | — | viga.editar engasteLajes: coeficiente das lajes apoiadas na viga (N1a) |
| K1.4.16 | Coeficientes de laje e de borda de viga simultâneos são multiplicados. | Feito | — | coeficiente da borda da laje × o da viga de apoio (N1a) |
| K1.4.17 | Rótula de borda atua na borda da laje e em bordas de apoio em vigas e paredes; não atua em bordas em contato com pilares e pilares-parede (sempre engaste). | Feito | — | bordas em pilares ficam sempre engastadas (N1a) |
| K1.4.18 | Trecho rígido entre borda e eixo do apoio: sempre há momento no eixo gerado pela cortante na borda; vira torção se não houver continuidade de armadura com panos vizinhos. | Fora | — | comentário do manual |
| K1.4.19 | Alerta: borda articulada sobre viga com rigidez à torção muito reduzida pode dar deslocamentos/esforços absurdos. | Fora | — | alerta do manual |
| K1.4.20 | Rótulas em extremos de vigas: ficam fisicamente na face do apoio (pilar, parede, pilar-parede ou apoio em muro). | Feito | — | vínculo articulado na ponta da viga (libI/libJ no pórtico), após o trecho rígido |
| K1.4.21 | Essas redistribuições (engastes/rótulas) entram no cálculo e afetam deslocamentos e esforços finais. | Feito | — | rótulas entram na análise |
| | **1.4.2 Rigidezes consideradas (págs. 18–19)** | | | |
| K1.4.22 | Termos da matriz com seção bruta de todos os elementos de concreto. | Feito | — | seção bruta em todos os elementos (Ecs) |
| K1.4.23 | Termos: EI/L (flexão), GJ/L (torção), EA/L (axial). | Feito | — | EA, EI e GJ nas barras 3D (`fe3d.ts`) |
| K1.4.24 | Pilares: EIy, EIz bruto; GJ bruto × coeficiente de redução de torção; EA bruto × coeficiente de rigidez axial. | Feito | — | opções: GJ dos pilares × coeficiente (padrão 1) e EA × coeficiente (padrão 2) (N1a) |
| K1.4.25 | Vigas inclinadas: EI bruto nas duas direções; GJ bruto × coef.; EA bruto. | Falta | E | vigas inclinadas |
| K1.4.26 | Vigas de aço ou concreto: EI vertical bruto; EI no plano desprezado (∞, diafragma); GJ bruto × coef.; EA ∞. | Feito | — | vigas: EI bruto, GJ × 0,15; rigidez no plano dada pelo diafragma |
| K1.4.27 | Vigotas: EI bruto; plano ∞; GJ × coef.; EA ∞. | Parcial | E | treliçadas: seção T por nervura na grelha; GJ 15 % de 2I |
| K1.4.28 | Vigas perimetrais de borda (encadeados): EI vertical bruto × 10⁻¹⁵ (praticamente nula); plano ∞; GJ × coef.; EA ∞. | Falta | E | vigas de amarração sem rigidez à flexão |
| K1.4.29 | Apoio e engaste em muro: EI bruto × 10²; plano ∞; GJ × coef.; EA ∞. | Falta | E | apoio em muro |
| K1.4.30 | Paredes e pilares-parede: EI bruto nas duas direções; torção pelo elemento finito plano; EA bruto × coef. de rigidez axial. | Falta | E | paredes e pilares-parede |
| K1.4.31 | Lajes maciças e nervuradas: EI bruto; plano ∞; GJ × coef.; EA ∞. | Feito | — | opções: J das lajes × coeficiente (padrão 15 % de 2I) (N1a) |
| K1.4.32 | Lajes alveolares e mistas: EI bruto; plano ∞; GJ × coef.; EA ∞. | Falta | E | lajes alveolares (mistas fora) |
| | **1.4.3 Coeficientes de rigidez à torção (pág. 19)** | | | |
| K1.4.33 | Coeficiente redutor da rigidez à torção configurável (não se aplica a perfis de aço). | Feito | — | opções: redutores de torção de vigas, lajes e pilares editáveis (N1a) |
| K1.4.34 | Barras com dimensão ≤ ao limite de "barra curta" usam o valor definido nas opções para elas. | Falta | N | rigidez própria para barras curtas |
| K1.4.35 | Seção bruta (sem redução) usada na torção quando necessária ao equilíbrio da estrutura (torção de equilíbrio). | Feito | — | viga.editar torcaoEquilibrio: GJ da seção bruta (N1a) |
| | **1.4.4 Coeficientes de rigidez axial (pág. 19)** | | | |
| K1.4.36 | Encurtamento axial de pilares, paredes e pilares-parede considerado com coeficiente multiplicador de EA entre 1 e 99,99, para simular o processo construtivo. | Feito | — | opções: multiplicador de EA dos pilares de 1 a 99,99, padrão 2 (N1a) |
| K1.4.37 | Recomendado 2 a 3; padrão 2. | Feito | — | mesmo padrão 2 (premissa 25) |
| | **1.4.5 Momentos mínimos (págs. 19–20)** | | | |
| K1.4.38 | Vigas: momento mínimo como fração do isostático pl²/8, na forma pl²/x com x inteiro > 8, para negativo e positivo; padrão 0 (não aplica). | Falta | N | momentos mínimos em vigas |
| K1.4.39 | Recomendação: armadura para negativo pl²/32 e positivo pl²/20; pode valer para toda a estrutura, parte ou cada viga. | Falta | N | momentos mínimos recomendados |
| K1.4.40 | Vigotas e alveolares: momentos mínimos por obra ou por pano; recomendado ½ do momento isostático (wl²/16) para positivo e negativo. | Falta | E | momentos mínimos de vigotas |
| K1.4.41 | Envoltórias deslocadas para atender aos mínimos e depois aplicada a redistribuição de negativos. | Falta | N | envoltória deslocada para mínimos |
| K1.4.42 | Carga linear equivalente obtida das cortantes: p = (V1+V2)/l; com mínimo positivo, verifica Mv ≥ pl²/8. | Falta | N | carga equivalente pelas cortantes |
| K1.4.43 | Se o mínimo for menor que o de cálculo, prevalece o maior. | Falta | N | prevalência do maior momento |
| K1.4.44 | Limitação: exato para cargas distribuídas; aproximado para concentradas. | Fora | — | limitação do outro programa |
| | **1.4.6 Outras opções (págs. 20–27)** | | | |
| | **Pilares** | | | |
| K1.4.45 | Comprimento máximo de barra vertical padrão 8 m; acima exige emenda. | Falta | R | comprimento máximo de barra e emendas em pilares |
| K1.4.46 | União de lances curtos: comprimento máximo padrão 4 m; une lances e elimina emendas intermediárias até esse limite, de cima para baixo, se a armadura for idêntica. | Falta | R | união de lances curtos no detalhamento |
| K1.4.47 | Pilares sem vigas chegando num nível: pode-se prolongar armadura sem emenda até o pavimento seguinte ou emendar em todos os pavimentos (se armadura idêntica). | Falta | R | prolongamento de armadura sem vigas no nível |
| K1.4.48 | Opção de cortar as barras no topo do último lance (só afeta desenho/medição, não é calculada; usar com cautela); recomenda-se antes reduzir o engaste no topo e ativar redução de ancoragem. | Falta | R | corte das barras no topo |
| K1.4.49 | Redução do comprimento de ancoragem/arranque pela relação tensão real/tensão máxima: padrão desativada em pavimentos intermediários e ativada no último pavimento; pode gerar arranques de comprimentos diferentes. | Falta | R | ancoragem reduzida por As,nec/As,ef (NBR 6118 9.4.2.5) |
| K1.4.50 | Simetria de armadura: tabela permite armadura diferente nas faces X e Y; escolhe a 1ª disposição da tabela que atende todas as combinações e a 1ª simétrica nas 4 faces; compara taxas e aceita a simétrica se a diferença % ≤ limite (padrão 0 %, não simétrica; usar ~300 para forçar simetria). | Parcial | R | armadura sempre simétrica no contorno; sem tabela nem tolerância de simetria |
| K1.4.51 | Pilares dimensionados lance a lance, de cima para baixo. | Parcial | R | lance a lance, independentes; sem ordem de cima para baixo |
| K1.4.52 | Continuidade: opção de manter taxa, bitola de canto e de face e nº de barras para baixo a partir do último ou penúltimo pavimento; padrão: continuidade de taxa e bitola de canto a partir do penúltimo pavimento. | Falta | R | continuidade de taxa e bitola entre lances |
| K1.4.53 | Cobrimento: da face externa à 1ª barra (estribo); padrão conforme a norma escolhida. | Feito | — | cobrimento pela CAA (Tabela 7.2), editável (`norma.definir`) |
| K1.4.54 | Perfis metálicos: opção de reduzir o perfil quando possível ou mantê-lo e só verificar; esforços vêm do perfil lançado — se a inércia mudar muito, recalcular; escolhe o perfil mais econômico. | Fora | — | perfis metálicos |
| K1.4.55 | Mudança de seção entre pavimentos: dobra da armadura com inclinação limitada (ângulo depende da espessura da laje ou viga); se exceder, cortar e ancorar a barra inferior e colocar arranques para o lance de cima. | Falta | R | dobra ou arranque na mudança de seção |
| K1.4.56 | Arredondamento de comprimentos de barras: múltiplo de 5 cm (padrão). | Falta | R | arredondamento de comprimentos de barras |
| K1.4.57 | Símbolos gráficos para pilar que nasce, passa ou morre no pavimento (selecionáveis). | Parcial | V | prancha: pilar que chega hachurado, que nasce tracejado; símbolos fixos |
| K1.4.58 | Emendas no terço central do lance (zona sísmica): padrão desativado; recomendado em alta sismicidade. | Fora | — | sismo |
| K1.4.59 | Emendas em paredes e pilares-parede: verifica se a armadura na emenda está comprimida ou tracionada; fator de ampliação do comprimento de emenda conforme o espaçamento das barras. | Falta | E | emendas em paredes e pilares-parede |
| K1.4.60 | Paredes/pilares-parede: grau de cumprimento exigido da armadura (picos de tensão); padrão 90 %; recomenda-se conferir onde não atinge 100 % e se precisa armadura local. | Falta | E | grau de cumprimento em paredes |
| K1.4.61 | Estribos: na interseção com laje/viga (padrão ativo) e adensamento no topo e base numa altura definida (padrão inativo; recomendado em zona sísmica). | Falta | R | estribos no nó e adensamento junto às extremidades |
| K1.4.62 | Outras opções de pilar listadas: arranques, taxas mínimas, consolos curtos. | Parcial | R | taxas mínimas aplicadas; arranques e consolos não |
| | **Vigas (listadas, sem valores)** | | | |
| K1.4.63 | Armadura negativa simétrica em vigas de um vão; diferença % para simetria da negativa. | Falta | R | simetria da armadura negativa |
| K1.4.64 | Critérios de ganchos; ganchos no fim do alinhamento. | Falta | R | ganchos |
| K1.4.65 | Comprimento mínimo de estribos; simetria de estribos; estribos de bitolas diferentes na viga; ancoragem do fechamento; estribos em U; estribos múltiplos. | Parcial | R | estribo de 2 ramos φ5–φ12,5 pelo cálculo; sem simetria, zonas, estribos múltiplos |
| K1.4.66 | Armadura de vigas pré-moldadas (armadas e protendidas) e propriedades; estribos de vigas protendidas. | Falta | E | vigas pré-moldadas (NBR 9062) |
| K1.4.67 | Detalhamento de vigas sísmicas. | Fora | — | sismo |
| K1.4.68 | Cobrimentos superior, inferior e lateral; idem para vigas de fundação. | Parcial | N | cobrimento único das vigas; sem superior, inferior e lateral separados |
| K1.4.69 | Avaliação de erros; numeração de pórticos e de vigas. | Parcial | L | renumeração automática de vigas (`viga.renumerar`); sem pórticos |
| K1.4.70 | Considerar armadura de montagem; emenda de montagem em balanços. | Falta | R | armadura de montagem |
| K1.4.71 | Envoltória de cortante contínua ou descontínua (opção geral). | Falta | R | envoltória de cortante contínua/descontínua |
| K1.4.72 | Armadura de cortante: disposição de armadura de pele, seção de verificação ao cortante (opção geral). | Falta | R | armadura de pele (NBR 6118 17.3.5.2.3) |
| K1.4.73 | Seleção de estribos (opção geral); fissuração (opção geral). | Parcial | R | estribo escolhido automaticamente; fissuração só no Pórtico 2D |
| K1.4.74 | Taxas mínimas em vigas de fundação; armadura de vigas embutidas em paredes e de cintas/encadeados. | Falta | FU | vigas de fundação e cintas |
| | **Lajes maciças, mistas e nervuradas (listadas)** | | | |
| K1.4.75 | Armadura de lajes e nervuradas; taxas mínimas; redução de densidade de armadura; armadura de torção; comprimentos mínimos. | Parcial | R | ρmín 0,15 % e As por metro; sem armadura de torção nem comprimentos |
| K1.4.76 | Distância borda–centro da barra (lajes e nervuradas); detalhar armadura base nos desenhos (padrão desativado: não desenha nem mede). | Falta | R | detalhamento de lajes |
| K1.4.77 | Arredondamento de comprimentos; ganchos construtivos; critérios de disposição e numeração; armadura de lajes retangulares; cobrimentos de fundação; cobrimentos de vigotas, alveolares e mistas. | Falta | R | detalhamento de lajes (comprimentos, ganchos, numeração) |
| | **Escadas (listadas)** | | | |
| K1.4.78 | Igualar armaduras; arranques na base e no topo (ligação à laje); posição da armadura; cobrimento; ancoragem na laje; altura da fundação. | Falta | E | escadas |
| | **Opções gerais de vigas e lajes (listadas)** | | | |
| K1.4.79 | Opções de desenho; comprimento máximo de corte de barra; perdas de aço na medição. | Falta | R | perdas de aço e comprimento de corte |
| K1.4.80 | Taxas mínimas de negativo em lajes de vigotas e alveolares; armadura em lajes comuns e alveolares. | Falta | E | negativos de treliçadas |
| K1.4.81 | Momentos mínimos a resistir em lajes e vigas; armadura de vigas mestras. | Falta | N | momentos mínimos |
| K1.4.82 | Coeficiente redutor da rigidez à flexão em lajes de vigotas. | Falta | N | redutor de rigidez das treliçadas; nós: seção T bruta |
| K1.4.83 | Considerar armadura de torção em vigas. | Falta | N | torção em vigas não verificada (premissa) |
| K1.4.84 | Opções de vigas de aço e vigotas. | Fora | — | vigas de aço; vigotas ver K1.4.40 |
| K1.4.85 | Limites de flecha para vigas, vigotas, alveolares e mistas. | Parcial | N | lajes L/250 fixo; vigas do edifício sem flecha; limites não editáveis |
| K1.4.86 | Flecha ativa e total a longo prazo — processo construtivo. | Parcial | N | flecha diferida (t0) e após alvenaria só no Pórtico 2D |
| K1.4.87 | Cortante em lajes de vigotas moldadas in loco. | Falta | E | cortante em lajes treliçadas |
| K1.4.88 | Coeficientes de flambagem em vigas inclinadas e em diagonais de contraventamento. | Falta | E | vigas inclinadas e contraventamentos |
| | **Fundações (listadas)** | | | |
| K1.4.89 | Sapatas, sapatas corridas e blocos: opções gerais e particulares; vigas de equilíbrio e de travamento: opções gerais e particulares. | Parcial | FU | opções de sapatas e blocos editáveis no módulo Fundações; vigas de equilíbrio e travamento faltam |
| | **Desenho** | | | |
| K1.4.90 | Camadas, tamanho de texto e penas configuráveis. | Parcial | V | camadas e penas fixas (NBR 16861); não configuráveis |
| K1.4.91 | Opções gerais (marcadas) afetam todas as obras: mudar e recalcular pode alterar resultados; as demais ficam salvas com a obra. | Fora | — | opções por instalação do outro programa |
| K1.4.92 | Restauração dos padrões por instalação limpa ou botão de valores padrão. | Fora | — | restauração de opções por instalação |

## 1.5 Cargas: verticais, vento, sismo e 2ª ordem (págs. 27–37)

| Item | Critério / funcionalidade | Situação | Frente | Statikos |
|---|---|---|---|---|
| | **1.5.1 Cargas verticais (págs. 27–29)** | | | |
| K1.5.1 | Peso próprio dos elementos de concreto pelo volume da seção bruta × 2,5 (t/m³, sistema MKS) para pilares, pilares-parede, paredes, vigas e lajes. | Feito | — | γ = 25 kN/m³ na seção bruta de pilares, vigas e lajes |
| K1.5.2 | Peso próprio da laje definido pelo usuário na escolha do tipo; pode variar por pavimento/pano. | Feito | — | peso próprio pelo tipo de laje (maciça ou catálogo de treliçadas) |
| K1.5.3 | Laje maciça: h × 2,5; idem nos ábacos (maciços) das nervuradas. | Feito | — | maciça h × 25 (`lajeG`) |
| K1.5.4 | Zona aliviada das nervuradas e lajes de vigotas: valor da ficha da laje. | Parcial | E | treliçadas pelo catálogo (a confirmar); nervuradas faltam |
| K1.5.5 | Vigotas: peso por m² × intereixo = carga linear em cada vigota. | Parcial | E | treliçada carregada por faixa da grelha, não por vigota |
| K1.5.6 | Lajes maciças e nervuradas: peso × área de influência aplicado em cada nó. | Feito | — | carga de área distribuída nas barras e bordas da grelha |
| K1.5.7 | Carga permanente adicional (revestimento e divisórias) uniforme no pavimento; divisórias podem ser tratadas como variáveis se mudarem. | Feito | — | revestimento por grupo (gRev) e cargas de área; alvenaria da máscara como G |
| K1.5.8 | Peso próprio + permanentes adicionais = caso permanente, aplicado automaticamente às barras. | Feito | — | caso G automático |
| K1.5.9 | Sobrecarga de uso uniforme no pavimento, aplicada automaticamente às barras de cada grupo de pavimentos. | Feito | — | q por grupo, caso Q automático |
| K1.5.10 | Casos gerados automaticamente: permanente, sobrecarga, vento (X e Y conforme norma e larguras de fachada) e sismo (conforme norma). | Feito | — | G, Q e vento (4 direções × centrado/±e); sismo fora |
| K1.5.11 | Casos adicionais (antes "cargas especiais") pontuais, lineares ou superficiais, de natureza permanente, sobrecarga, vento, neve, sismo; combináveis com os automáticos (exceto com vento e sismo automáticos). | Parcial | N | ponto, linha e área só nos casos G ou Q; sem casos adicionais nem outras naturezas |
| K1.5.12 | Casos adicionais de empuxo de terra e acidentais. | Falta | N | empuxo de terra e ações excepcionais |
| K1.5.13 | Em cada caso, vários arranjos de carga agrupados, com relação compatível, incompatível ou simultâneo; definição se os casos adicionais se combinam entre si. | Falta | N | arranjos e compatibilidade de casos adicionais (vento usa grupo excludente) |
| K1.5.14 | Geração automática de todas as combinações de todos os estados-limite (inclui fadiga — texto —, tensões no solo e deslocamentos de nós) conforme normas de ações, materiais e categoria de uso. | Parcial | N | ELU, QP, frequente e rara automáticas (NBR 8681); sem grupo de deslocamentos |
| K1.5.15 | Verificação de resistência ao fogo opcional. | Falta | N | incêndio (NBR 15200) |
| K1.5.16 | Ações também valem para estruturas 3D integradas. | Fora | — | estruturas 3D integradas |
| K1.5.17 | Cargas no topo de pilares (N, Mx, My, Qx, Qy, T) em eixos globais, por caso, independentes da análise. | Falta | N | cargas no topo de pilares no edifício |
| K1.5.18 | Pilares/arranques com cargas podem ser lançados sobre radiers ou vigas de fundação. | Falta | FU | arranques sobre radier ou viga de fundação |
| K1.5.19 | Cargas horizontais concentradas em qualquer altura do pilar, em eixos locais ou globais. | Falta | N | cargas horizontais ao longo do pilar |
| | **1.5.2 Cargas horizontais — vento (págs. 29–32)** | | | |
| K1.5.20 | Vento gerado automaticamente por pavimento, conforme a norma, em X e Y (ou um só) e nos dois sentidos (+X, −X, +Y, −Y). | Feito | — | NBR 6123 por pavimento a 0°, 90°, 180°, 270° (`vento.ts`) |
| K1.5.21 | Coeficiente de carga por direção e sentido, multiplicando a pressão total. | Parcial | N | Ca por direção (X/Y), não por sentido |
| K1.5.22 | Edifício isolado: pressão ≈ 2/3 (0,66) a barlavento + sucção ≈ 1/3 (0,33) a sotavento → coeficiente 1. | Feito | — | o Ca da NBR 6123 já soma pressão e sucção |
| K1.5.23 | Edifício abrigado por vizinho: ajustar coeficientes (ex.: +X = 0,33 só sucção; −X = 0,66 só pressão). | Falta | N | fator de vizinhança (NBR 6123, Anexo G) |
| K1.5.24 | Largura de banda = comprimento da fachada perpendicular ao vento, por pavimento (pode variar). | Feito | — | largura da fachada por pavimento pela extensão em planta |
| K1.5.25 | Zonas independentes num pavimento: carga repartida na proporção da largura de cada zona (b1, b2 pelas coordenadas dos pilares extremos): Bi = bi/(b1+b2)·B. | Falta | N | repartição entre zonas independentes |
| K1.5.26 | Área exposta = semissoma das alturas dos pavimentos acima e abaixo × largura de banda; força = área × pressão na cota × coeficiente de carga. | Feito | — | altura de influência = semissoma; F = Ca·q·largura·altura |
| K1.5.27 | Platibanda/parede de cobertura: largura de banda corrigida b' proporcional à altura (b' = b·(2a+h)/h, forma do texto). | Falta | N | platibanda e ático na cobertura |
| K1.5.28 | Método geral: curva altura–pressão de biblioteca (editável), interpolada nas cotas dos pavimentos. | Feito | — | perfil S2(z) da NBR 6123 nas cotas dos pavimentos |
| K1.5.29 | Coeficiente de forma (esbeltez e forma em planta: retangular, cilíndrica etc.). | Parcial | N | Ca informado à mão (padrão 1,3); ábaco não digitalizado |
| K1.5.30 | Coeficiente de rajada para locais expostos (vales, encostas). | Feito | — | S1 (topográfico) e S3 editáveis |
| K1.5.31 | Força total por pavimento = pressão × área × coef. de forma × coef. de rajada; aplicada no centro geométrico do contorno do pavimento. | Feito | — | força no mestre (centro das lajes) com excentricidade ± 0,075·largura |
| K1.5.32 | Força de vento por pavimento visível na tela e em relatório. | Parcial | V | forças por pavimento na aba Análise; não no memorial nem em planta |
| K1.5.33 | Para cada norma a pressão é calculada automaticamente com dados próprios da norma. | Feito | — | pressão automática pela NBR 6123 |
| K1.5.34 | Estruturas 3D integradas: sem cargas automáticas; cargas manuais em nós e barras, combináveis com as automáticas por casos adicionais. | Fora | — | estruturas 3D integradas |
| K1.5.35 | Alerta ao importar do programa 3D: conferir combinatória e compatibilidade dos casos (sobretudo vento gerado por gerador de pórticos). | Fora | — | importação de outro programa 3D |
| | **1.5.2 Cargas horizontais — sismo (pág. 32)** | | | |
| K1.5.36 | Detalhe do cálculo sísmico remetido ao manual em inglês. | Fora | — | sismo |
| K1.5.37 | Torção: excentricidade = momento / cortante total da análise dinâmica, em relação ao centro de massa; comparada com a mínima da norma do país; se menor, amplifica o modo rotacional até atingi-la. | Fora | — | sismo |
| K1.5.38 | Análise modal espectral genérica: excentricidade mínima 0,05; relevante em estruturas simétricas. | Fora | — | sismo |
| K1.5.39 | Cortante na base: se a dinâmica < 80 % da estática, escala-se até não ser menor que esse valor. | Fora | — | sismo |
| | **1.5.2 Efeitos de 2ª ordem (P-Δ / γz) (págs. 33–37)** | | | |
| K1.5.40 | Opcional por caso de vento ou sismo: ampliação dos esforços por 2ª ordem; recomendado ativar. | Feito | — | γz sempre calculado por direção; nós: vento × 0,95·γz se 1,1 < γz ≤ 1,3 |
| K1.5.41 | Método simplificado a partir da análise de 1ª ordem, linear, seção bruta e módulo secante. | Feito | — | γz a partir da 1ª ordem linear |
| K1.5.42 | Momento de tombamento MH = Σ Hi·zi em relação ao nível 0 (ou sem deslocamento horizontal), por direção. | Feito | — | M1 = Σ F·z por direção |
| K1.5.43 | Momento P-Δ por caso gravitacional k: MPΔk = Σi Σj Pij·Δi (carga da laje no pilar j no pavimento i × deslocamento horizontal). | Feito | — | ΔM = Σ P·δ por pavimento (mestre do diafragma) |
| K1.5.44 | Índice de estabilidade Ck = MPΔk / MH, por caso gravitacional e direção. | Feito | — | ΔM por combinação (vento ou uso principal), equivalente aos Ck por caso |
| K1.5.45 | γz = 1 / [1 − (Σ γfgi·Ci + Σ γfqj·Cj)], com coeficientes de ponderação das permanentes e variáveis; aplicado como fator de ampliação nas combinações com ação horizontal. | Feito | — | γz = 1/(1 − ΔM/M1); nós ampliamos o vento por 0,95·γz, manual por γz |
| K1.5.46 | Multiplicador de deslocamentos para representar redução de rigidez (fissuração), inverso da rigidez reduzida; critério deixado ao projetista. | Feito | — | nós: rigidez 0,4·EI vigas e 0,8·EI pilares (NBR 15.7.3); manual: multiplicador de deslocamentos |
| K1.5.47 | Prática brasileira citada: E × 0,90 e I × 0,70 → 0,63 → multiplicador 1,59; γz > 1,20 → enrijecer; γz < 1,1 → efeito desprezível. | Fora | — | prática citada pelo manual |
| K1.5.48 | NB-1/2000 (Brasil): multiplicar deslocamentos por 1/0,7 = 1,43 e limitar γz a 1,3. | Feito | — | limite 1,3 com aviso (NBR 6118:2014); rigidez reduzida no lugar de 1/0,7 |
| K1.5.49 | CEB-FIP MC 1990: reduzir rigidez 50 % → multiplicador 2,00; γz > 1,50 → enrijecer; < 1,1 dispensável (mas recomenda-se ativar sempre). | Fora | — | CEB-FIP |
| K1.5.50 | ACI 318-95: índice Q por pavimento; γz ≈ 1/(1−Q); limite Q = 0,05 (γz ≈ 1,05) para pavimento indeslocável. | Fora | — | ACI 318 |
| K1.5.51 | Alternativa: inércia × ~0,7 por ação horizontal curta e E reduzido (15100/19000 ≈ 0,8) → multiplicador 1,78; γz razoável ≤ 1,35. | Fora | — | alternativa do manual |
| K1.5.52 | Critério recomendado no manual: multiplicador de deslocamentos 2 e limite de γz 1,5. | Fora | — | recomendação do manual (× 2 e γz 1,5); nós: 0,4/0,8 EI e 1,3 |
| K1.5.53 | Padrão do programa: multiplicador de deslocamentos 1,00 (fachadas, escadas e alvenarias enrijecem); mudança fica a cargo do projetista. | Fora | — | padrão 1,00 do outro programa; nós: rigidez reduzida da NBR |
| K1.5.54 | Saídas: fatores de ampliação por combinação e relatório com γz máximo por direção. | Feito | — | γz e ampliação por direção na aba Análise e no memorial |
| K1.5.55 | Instabilidade global: aviso antes do fim do cálculo quando Σ(γfg·Ci + γfq·Cj) ≥ 1 (γz → ∞ ou negativo). | Feito | — | ΔM ≥ M1 dá γz infinito e cai no aviso de γz > 1,3 |
| K1.5.56 | Recomendado como método alternativo de 2ª ordem, sobretudo para estruturas deslocáveis ou pouco deslocáveis. | Parcial | N | P-Δ só no Pórtico 2D (`secondorder.ts`); edifício só γz |
| K1.5.57 | Limitação: a sobrecarga entra integralmente (sem redução automática); recomenda-se recalcular com sobrecarga reduzida só para pilares. | Feito | — | nós: ψ0·Q com vento principal e Q integral com uso principal; manual: Q integral |
| K1.5.58 | ACI 318: após a estabilidade, redução de rigidez para dimensionar pilares pela fórmula do anexo de normas. | Fora | — | ACI 318 |
| K1.5.59 | Recomendação: adotar coeficiente de flambagem = 1 nos pilares, somando a excentricidade adicional/fictícia de 2ª ordem de barra isolada ao efeito P-Δ global; decisão do usuário. | Feito | — | nós: le = altura do lance, M2 local do pilar-padrão + γz global |

## 1.6 Materiais (págs. 37–38)

| Item | Critério / funcionalidade | Situação | Frente | Statikos |
|---|---|---|---|---|
| K1.6.1 | Materiais escolhidos de listas; propriedades em arquivo. | Parcial | N | fck, aço e CAA por obra; sem biblioteca de materiais |
| K1.6.2 | Concreto: resistência característica, coeficiente redutor, módulo secante, ν = 0,2, conforme norma. | Feito | — | fck, γc 1,4, Ecs (NBR 8.2.8) e ν 0,2 |
| K1.6.3 | Concreto pode diferir por elemento e, nos pilares, por pavimento. | Feito | — | materiais.definir: fck por tipo de elemento e dos pilares por lance; Ecs de cada barra pelo seu fck (N1b) |
| K1.6.4 | Aço de armadura: resistência de escoamento, coeficiente redutor e módulo, conforme norma; definido por posição e tipo de elemento. | Feito | — | aço por posição com fyk 500/600 e γs da obra no dimensionamento (N1b) |
| K1.6.5 | Aço de armadura distinto para pilares/paredes/pilares-parede/consolos (longitudinal; estribos). | Feito | — | pilares: longitudinal e estribos (N1b) |
| K1.6.6 | Aço distinto em vigas e vigas de fundação: negativo, positivo, montagem, pele, estribos. | Parcial | N | vigas: positiva, negativa e estribos (N1b); montagem e pele quando forem dimensionadas |
| K1.6.7 | Aço distinto em lajes e radiers: punção e cortante; superior e inferior de maciças; superior de nervuradas e vigotas; inferior de nervuradas. | Parcial | N | lajes maciças: inferior e superior (N1b); punção, cortante e nervuradas com as próprias verificações |
| K1.6.8 | Aço distinto em sapatas, sapatas corridas e blocos. | Feito | — | módulo Fundações tem fck e fyk próprios (`piles.ts`: fckFound, fyk) |
| K1.6.9 | Aço estrutural de pilares, vigas e placas de base: biblioteca não editável (módulo, escoamento, Poisson etc.); perfis laminados, formados a frio e soldados. | Fora | — | aço estrutural |
| K1.6.10 | Placas de base: aço da placa e enrijecedores, aço e tipo de chumbadores; bitolas pré-definidas não editáveis. | Fora | — | placas de base |
| K1.6.11 | Estruturas 3D integradas: material por barra (aço, madeira, alumínio, concreto, genérico) nos dados gerais. | Fora | — | estruturas 3D integradas |

## 1.7 Coeficientes parciais de segurança (págs. 38–39)

| Item | Critério / funcionalidade | Situação | Frente | Statikos |
|---|---|---|---|---|
| K1.7.1 | Coeficientes parciais conforme materiais, ações e método de cálculo da norma escolhida. | Feito | — | γc, γs, γg e γq editáveis no edifício (N1b) |
| K1.7.2 | Método dos estados-limites (ou o método próprio de cada norma). | Feito | — | método dos estados-limites |
| K1.7.3 | Coeficientes de minoração dos materiais definidos por norma; ao escolher o material indica-se o nível de controle de execução, que fixa o coeficiente pré-definido. | Parcial | N | γc e γs editáveis (N1b); sem nível de controle de execução que os escolha |
| K1.7.4 | Coeficientes das ações conforme nível de controle, danos previsíveis e uso; distinção entre efeito favorável/desfavorável e origem da ação. | Parcial | N | G favorável 1,0 / desfavorável 1,4; sem γ por origem (Tabela 11.1 completa) |
| K1.7.5 | Coeficientes parciais e de simultaneidade lidos de arquivo de combinações por norma (não editável); o usuário pode criar combinações próprias. | Parcial | N | ψ da carga de uso editável; combinações próprias só no Pórtico 2D |

## 1.8 Combinações (págs. 39–41)

| Item | Critério / funcionalidade | Situação | Frente | Statikos |
|---|---|---|---|---|
| K1.8.1 | Estados-limite verificados conforme a norma: equilíbrio, tensões, ruptura, fissuração, deformações; podem depender do material. | Parcial | N | ELU e flecha de lajes; fissuração só no Pórtico 2D; tombamento não |
| K1.8.2 | Grupos de combinações gerados automaticamente: ELU concreto (seções); ELU concreto de fundações; tensões no solo; deslocamentos (máximos da estrutura); ELU aço laminado e soldado; ELU aço formado a frio; ELU madeira; ELU alumínio. | Parcial | N | ELU de concreto e raras da fundação; sem grupo de deslocamentos (aço/madeira fora) |
| K1.8.3 | Usuário ativa os estados a verificar e os coeficientes por norma ativa. | Falta | N | escolha dos estados-limite a verificar |
| K1.8.4 | ELU não se aplicam em normas de tensões admissíveis. | Fora | — | normas de tensões admissíveis |
| K1.8.5 | Situação não sísmica com coeficientes de combinação: Σγg·Gk + γQ1·ψp1·Qk1 + Σ γQi·ψai·Qki (i>1). | Feito | — | ELU normais com ψ0 (`nbrCombinations`, NBR 8681) |
| K1.8.6 | Situação não sísmica sem coeficientes de combinação: Σγg·Gk + Σγq·Qk. | Fora | — | formato sem coeficientes de combinação de outras normas |
| K1.8.7 | Situação sísmica com coeficientes: Σγg·Gk + γA·AE + Σ γQi·ψai·Qki (i≥1). | Fora | — | sismo |
| K1.8.8 | Situação sísmica sem coeficientes: Σγg·Gk + γA·AE + Σ γQi·Qki. | Fora | — | sismo |

## 1.9 Entrada de dados (págs. 41–65)

| Item | Critério / funcionalidade | Situação | Frente | Statikos |
|---|---|---|---|---|
| | **1.9.1 Dados gerais da obra (págs. 41–45)** | | | |
| K1.9.1 | Normas por material: concreto, aço (formado a frio e laminado), madeira, alumínio, alvenaria, lajes mistas. | Fora | — | normas por material; só NBR de concreto no edifício |
| K1.9.2 | Descrição da obra (2 linhas). | Parcial | L | nome e cidade da obra; sem descrição |
| K1.9.3 | Concreto separado para lajes, fundações (com dados de fundação), pilares/pilares-parede (pode variar por pavimento) e paredes (pode variar por pavimento). | Falta | N | concreto separado por tipo de elemento |
| K1.9.4 | Alvenaria estrutural: E, G, peso específico, tensão de cálculo à compressão e à tração, opção de considerar rigidez ao cortante. | Falta | E | alvenaria estrutural (NBR 16868) |
| K1.9.5 | Blocos de concreto: argamassa, resistência da alvenaria e aço da armadura de junta. | Falta | E | blocos de concreto estrutural |
| K1.9.6 | Aço de armadura em pilares/pilares-parede/consolos (longitudinal e estribos), com abas separadas para estrutura e fundação. | Parcial | N | aço da fundação separado (módulo Fundações); sem aço por posição no pilar |
| K1.9.7 | Vigas: negativo (inferior em vigas de fundação), positivo (superior em vigas de fundação), montagem, pele lateral, estribos. | Falta | N | aço por posição em vigas |
| K1.9.8 | Lajes: punção e cortante; negativo/positivo de maciças (superior/inferior em radier); negativo/positivo de nervuradas, ábacos e vigotas in loco. | Falta | N | aço por posição em lajes |
| K1.9.9 | Aço de perfis de vigas e pilares: formado a frio e laminado a quente. | Fora | — | perfis de aço |
| K1.9.10 | Dados gerais incluem: vento, sismo, verificação de incêndio, casos adicionais, estados-limite (concreto, fundações, aço frio, laminado, madeira, alumínio, tensões no solo, deslocamentos). | Parcial | N | vento e ψ; sem incêndio, casos adicionais e escolha de estados |
| K1.9.11 | Coeficientes de flambagem por pavimento e por direção, para pilares de concreto e de aço; definíveis por pavimento e por pilar. | Feito | — | pilar.flambagem (α por lance e direção) e α do pavimento (N1b) |
| K1.9.12 | Padrão α (β) = 1; o usuário muda conforme tipo de estrutura e ligação do pilar às vigas/lajes nas duas direções. | Feito | — | α padrão 1, editável nas duas direções (N1b) |
| K1.9.13 | Pilar sem travamento nas duas direções em vários pavimentos seguidos: dimensionado lance a lance, mas l0 = máx(αi) × soma dos comprimentos dos lances desligados. | Parcial | N | pilar destravado por α > 1 no lance; sem soma automática dos lances desligados |
| K1.9.14 | Pilar desligado em uma só direção: o programa usa l0 = αi·li em cada lance sem saber do desligamento; o usuário deve dar αi = α·Σlj/li para obter o comprimento total. | Feito | — | mesmo critério: α por direção informado pelo usuário (N1b) |
| K1.9.15 | Altura para flambagem = altura livre: altura do pavimento menos a altura da viga ou laje mais alta que chega ao pilar. | Feito | — | ℓe = mín(ℓ0 + h; ℓ), ℓ0 = altura do lance − viga mais alta no topo (NBR 6118, 15.6) (N1b) |
| K1.9.16 | α final do pilar = α do pavimento × α do lance. | Feito | — | α final = α do pavimento × α do lance (N1b) |
| K1.9.17 | Valores de α deixados ao projetista: as normas só os definem para pórticos planos e o comportamento espacial não corresponde a esses modos. | Fora | — | comentário do manual |
| | **1.9.2–1.9.7 Ações, grupos, vento, sismo, incêndio, casos adicionais, estados-limite (págs. 45–47)** | | | |
| K1.9.18 | Escolha de considerar ou não vento e/ou sismo e as normas de cada um; combinatória interna por estado-limite. | Parcial | N | vento liga e desliga (NBR 6123); sismo fora |
| K1.9.19 | Coeficientes parciais conforme materiais e ações presentes; casos adicionais com origem atribuída. | Parcial | N | γ por natureza; sem casos adicionais com origem |
| K1.9.20 | Permanente adicional e sobrecarga totais por pavimento nos dados de cada grupo; peso próprio da laje na ficha da laje. | Feito | — | gRev e q por grupo; peso da laje pelo tipo |
| K1.9.21 | Vento e sismo: dados conforme a norma escolhida (seção de normas, fora do trecho). | Feito | — | V0, S1, S3, categoria, Ca e excentricidade (`vento.definir`) |
| K1.9.22 | Cargas de vento/sismo podem ser definidas em casos adicionais quando não geradas automaticamente. | Falta | N | vento em casos manuais |
| K1.9.23 | Incêndio: por grupo e elemento, revestimento de proteção, resistência ao fogo exigida e se a laje é compartimentadora. | Falta | N | incêndio (NBR 15200) |
| K1.9.24 | Casos gerais automáticos: permanente (peso da laje + permanentes), sobrecarga dos grupos, vento e sismo da norma; permanente e sobrecarga sempre existem. | Feito | — | G, Q e vento automáticos |
| K1.9.25 | Alternância de sobrecargas: criar um caso adicional por carga independente (não simultâneas) ou usar arranjos dentro do caso. | Falta | N | alternância de sobrecargas |
| K1.9.26 | Combinações geradas automaticamente pelos casos e suas compatibilidades; cada carga lançada é vinculada a um caso. | Parcial | N | combinações automáticas; cargas lançadas só em G ou Q |
| K1.9.27 | Grupos de combinações selecionáveis: concreto, fundações, aço frio, aço laminado, madeira, alumínio, tensões no solo, deslocamentos. | Parcial | N | ELU e raras para fundação; sem seleção de grupos |
| | **1.9.8 Pavimentos/grupos, pilares, arranques e pilares-parede (págs. 47–50)** | | | |
| K1.9.28 | Grupos: nome, permanente e sobrecarga; cota de fundação, nome do pavimento e alturas entre pavimentos. | Feito | — | grupos (nome, uso, gRev, q), pavimentos com cota e nível de fundação |
| K1.9.29 | Altura do pavimento = diferença entre faces superiores das lajes (plano de referência superior médio); cotas calculadas. | Feito | — | cota = topo da laje; pé-direito calculado |
| K1.9.30 | Pilar: tipo (concreto/metálico), seção por pavimento, referência (ponto fixo), ângulo, início (fundação com vinculação externa ou apoiado sem vinculação) e pavimento final. | Parcial | E | pilar ret/circ, seção por lance, ponto fixo, ângulo, nasce/morre; nascer em laje = apoio fixo provisório |
| K1.9.31 | Pilar que nasce em viga de fundação ou radier: sem vinculação externa. | Falta | FU | pilar sobre viga de fundação ou radier |
| K1.9.32 | Pilar: coeficientes de engaste de topo e base; coeficientes de flambagem por pavimento e por direção local; perfil e série se metálico; desnível e altura de apoio; arranques na vista. | Parcial | N | engaste de topo e base por lance feito (N1a); flambagem por pavimento e direção na N1b; perfil metálico fora |
| K1.9.33 | Arranque de pilar com altura zero: permite calcular a fundação só com cargas no topo. | Feito | — | módulo Fundações calcula com cargas por apoio |
| K1.9.34 | Pilares-parede: lista-tipo com nome, grupos inicial e final, lados e vértices, espessuras por pavimento à esquerda e direita do eixo; 1º vértice é ponto de inserção. | Falta | E | pilares-parede |
| K1.9.35 | Pilares-parede: mesma geometria em planta em toda a altura (só espessura varia); não podem nascer em pilares nem apoiar pilares; função de contraventamento horizontal. | Falta | E | pilares-parede (geometria e contraventamento) |
| K1.9.36 | Cargas horizontais em pilares: concentradas, uniformes ou em faixa; natureza conforme casos da obra; em qualquer altura; eixos locais ou globais, X ou Y. | Falta | N | cargas horizontais em pilares |
| K1.9.37 | Cargas no topo do pilar no último pavimento (N, Mx, My, Qx, Qy, T) em eixos globais, por caso, somadas às do cálculo. | Falta | N | cargas no topo do pilar |
| K1.9.38 | Vinculação de apoio, engastes e flambagem consultáveis e editáveis. | Parcial | L | `pilar.editar` (seção, nasce/morre); sem engastes nem flambagem |
| | **1.9.9 Dados das lajes (págs. 50–65)** | | | |
| K1.9.39 | Geometria em planta por grupo; ordem lógica: vigas, apoios em muro e vigas de fundação primeiro. | Feito | — | planta por grupo; panos detectados pelas vigas (`laje.detectarPanos`) |
| K1.9.40 | Coeficiente de engaste nas bordas de vigas (0–1), afetando as lajes que chegam à borda. | Feito | — | viga.editar engasteLajes, multiplicado pelo engaste da borda da laje (N1a) |
| K1.9.41 | Rótulas nos extremos de qualquer trecho de viga (com pilares, pilares-parede ou outras vigas). | Parcial | N | rótula só nas pontas da viga (`vinculoIni/Fim`), não em trechos internos |
| K1.9.42 | Viga de fundação exige coeficiente de reação e tensão admissível do solo. | Falta | FU | viga de fundação (coeficiente de reação e σadm) |
| K1.9.43 | Vigas mistas remetidas a capítulo próprio. | Fora | — | vigas mistas |
| K1.9.44 | Paredes de concreto (com ou sem empuxo) e de alvenaria (recebem carga vertical, sem empuxo lateral). | Falta | E | paredes de concreto e de alvenaria portante (alvenaria só como carga) |
| K1.9.45 | Paredes: pavimentos inicial e final; espessura média por pavimento (esquerda/direita). | Falta | E | paredes (pavimentos e espessuras) |
| K1.9.46 | Empuxo (paredes de subsolo): caso de empuxo, densidade aparente, densidade submersa, ângulo de talude natural, ângulo de atrito interno, sobrecarga no terreno. | Falta | N | empuxo de terra em paredes de subsolo |
| K1.9.47 | Base da parede: viga de fundação (sem vínculo externo), sapata corrida (sem vínculo externo), com vínculo externo (com ou sem sapata), viga sem vínculo externo. | Falta | FU | base da parede (viga, sapata corrida) |
| K1.9.48 | Sapata da parede: tensão admissível e coeficiente de reação; padrão alto 100 000 kN/m³ para evitar recalque diferencial com pilares de vinculação externa. | Falta | FU | sapata corrida com coeficiente de reação |
| K1.9.49 | Fundação toda flutuante: usar coeficiente compatível com solo e dimensões. | Falta | FU | fundação flutuante (Winkler) |
| K1.9.50 | Misturar apoios com e sem vinculação externa gera aviso. | Falta | FU | aviso de apoios mistos |
| K1.9.51 | Tipos de lajes de vigotas: concreto (geometria geral), armadas, protendidas, moldadas in loco, metálicas, tipo "joist". | Parcial | E | só treliçadas com EPS (H8–H25) |
| K1.9.52 | Vigotas armadas/protendidas: dados do fabricante (não editáveis), de biblioteca (fabricantes e usuários, editor de fichas) ou geometria do usuário (editável); para flecha, vigota calculada com armadura ou protensão. | Parcial | E | catálogo fixo de treliçadas (a confirmar); sem editor de fichas nem fabricante |
| K1.9.53 | Vigotas definidas por tipo, conforme momento último por metro de largura (em daN·m/m, já com coeficiente de segurança). | Falta | E | tipo de vigota por momento resistente |
| K1.9.54 | Direção das vigotas por pano: perpendicular à viga, paralela à viga ou por dois pontos. | Parcial | L | direção das vigotas por laje (ângulo; padrão menor vão) |
| K1.9.55 | Continuidade entre vigotas de panos vizinhos opcional (exceto metálicas e "joist", sempre biapoiadas); copiar panos dá continuidade. | Parcial | N | treliçadas sempre contínuas na grelha; sem opção biapoiada |
| K1.9.56 | Continuidade eliminada quando a distância entre extremos de vigotas vizinhas > comprimento de barra curta (padrão 0,20 m); continuidade também se outra vigota/trimmer estiver a menos que esse comprimento. | Fora | — | critério interno de continuidade |
| K1.9.57 | Desníveis entre panos (desenho e detalhamento; afetam altura de elementos de apoio); limitação: não calcula flexão transversal da viga — conferir estribos e ancoragens manualmente. | Parcial | E | desnível da laje guardado (`nivel`), não entra no cálculo |
| K1.9.58 | Momentos mínimos negativos/positivos das vigotas consultáveis e editáveis. | Falta | E | momentos mínimos de vigotas |
| K1.9.59 | Vigotas duplas, triplas…: peso definido (limitado à tripla); barra paralela à distância = largura da vigota da ficha. | Falta | E | vigotas duplas e triplas |
| K1.9.60 | Coeficiente de engaste nas bordas/extremos das vigotas por pano (padrão 1). | Falta | N | engaste nas bordas das vigotas |
| K1.9.61 | Lajes mistas remetidas a capítulo próprio. | Fora | — | lajes mistas |
| | **Lajes alveolares (ficha)** | | | |
| K1.9.62 | Ficha: código (8 dígitos), descrição, altura total (placa + capa), largura da placa (ou intereixo), espessura da capa. | Falta | E | lajes alveolares (ficha) |
| K1.9.63 | Largura mínima de placa cortada longitudinalmente (placa especial de borda); a largura usada fica entre a mínima e a padrão. | Falta | E | lajes alveolares (placa de borda) |
| K1.9.64 | Profundidade de apoio mínima e máxima (placa oblíqua ao apoio); acima da máxima a placa é chanfrada; apoio lateral (sobreposição sobre apoio paralelo). | Falta | E | lajes alveolares (apoio) |
| K1.9.65 | Peso por m² do conjunto; volume de concreto de preenchimento (padrão: volume da capa); concretos e aço apenas informativos. | Falta | E | lajes alveolares (peso e volume) |
| K1.9.66 | Positivo: momento último; momento de fissuração (flecha por Branson); rigidez total da seção composta (usada na matriz de rigidez das barras); rigidez fissurada (Branson). | Falta | E | lajes alveolares (momentos e rigidez) |
| K1.9.67 | Momento de serviço conforme classe da protensão: ambiente I = classe III; II = classe II; III = classe I (equivalências dadas). | Falta | E | lajes alveolares (classe de protensão) |
| K1.9.68 | Momento de serviço calculado comparado com o da ficha conforme o ambiente; se não atende, busca outra placa da tabela; se nenhuma, aviso. | Falta | E | lajes alveolares (escolha da placa) |
| K1.9.69 | Cortante resistente da seção em duas colunas: momento de cálculo maior ou menor que o momento de descompressão (Mg, classe II). | Falta | E | lajes alveolares (cortante) |
| K1.9.70 | Negativo: pares de bitolas e espaçamento; para cada linha, momento último, momento de fissuração, rigidez total e fissurada (Branson) e cortante resistente. | Falta | E | lajes alveolares (negativos) |
| K1.9.71 | Cortante resistente comparada à de cálculo; se não atende, aviso e marcação "insuficiente" na tela e no desenho; sem dados na ficha, não verifica cortante. | Falta | E | lajes alveolares (cortante insuficiente) |
| K1.9.72 | Processo: escolhe a placa cujo momento último > Md positivo e cujo momento de serviço (combinações de deslocamentos, coluna do ambiente 1/2/3) atende; senão, aviso "fora de tabela". | Falta | E | lajes alveolares (processo) |
| K1.9.73 | Para a placa escolhida, verifica cortante de cálculo ≤ resistente para flexão positiva e negativa; senão aviso. | Falta | E | lajes alveolares (cortante) |
| K1.9.74 | Comprimentos de barras negativas pela envoltória; mínimos nas opções; envoltórias incluem redistribuição e momentos mínimos. | Falta | E | lajes alveolares (negativos) |
| K1.9.75 | Sem dados de flecha, ambiente ou cortante, a respectiva verificação não é feita. | Falta | E | lajes alveolares |
| K1.9.76 | Por pano: ambiente, engastes de borda e momentos mínimos por tipo de vão (extremo, intermediário, isolado, balanço). | Falta | E | lajes alveolares (dados por pano) |
| K1.9.77 | Processo construtivo escolhível: com escoramento ou sem escoramento (autoportante). | Falta | E | lajes alveolares (escoramento) |
| K1.9.78 | Com escoramento: cálculo estático com continuidade e engaste de borda 1 sob carga total (permanente + variável) após retirada dos escoras; negativos em geral maiores que positivos. | Falta | E | lajes alveolares (com escoramento) |
| K1.9.79 | Sem escoramento (placas leves): estado final = (1) placa isostática sob peso próprio (pl²/8) + (2) laje contínua sob a carga aplicada depois (permanente adicional + sobrecarga); em geral positivos > negativos. | Falta | E | lajes alveolares (sem escoramento) |
| K1.9.80 | Limitação: o programa não faz o cálculo em duas fases; aproxima o caso sem escoramento reduzindo o engaste nas continuidades. | Falta | E | lajes alveolares (aproximação) |
| K1.9.81 | Engaste aproximado = 1 − (peso próprio da laje / carga total), carga uniforme; exemplo: 400/(400+100+500) → 0,6; aplicado automaticamente aos panos de placas leves quando ativado o cálculo autoportante. | Falta | E | lajes alveolares (engaste aproximado) |
| K1.9.82 | Recomendação: consultar o fabricante e verificar a fase construtiva com peso próprio + sobrecarga de construção (usual 100 kg/m²). | Fora | — | recomendação do manual |
| K1.9.83 | Flecha das alveolares com propriedades da ficha e diagrama de momentos médio do estado final; comparada aos limites das opções. | Falta | E | lajes alveolares (flecha) |
| | **Lajes maciças** | | | |
| K1.9.84 | Espessura e direção de armadura por pano (espessura pode variar por pano). | Feito | — | espessura e direção da malha por laje (`laje.editar`) |
| K1.9.85 | Engaste de borda com vigas de apoio 0–1 (inclui engaste parcial); desníveis entre panos como nas vigotas. | Parcial | N | sem engaste parcial; desnível não entra no cálculo |
| K1.9.86 | Armadura base (superior e inferior, em cada direção) ou tela soldada atribuível por pano; considerada no cálculo e descontada da armadura adicional. | Falta | R | armadura base ou tela por pano |
| K1.9.87 | Alerta: se a opção de detalhar armadura base estiver desligada, ela não aparece em desenhos, quantitativos e tabelas, embora entre no cálculo — indicar no desenho emendas e zonas. | Fora | — | alerta do manual |
| K1.9.88 | Armadura base inferior sempre contínua, com emendas nas zonas de máximo negativo; superior descontínua, só onde necessária; no radier posições invertidas; medida como adicional. | Falta | R | armadura base contínua e emendas |
| K1.9.89 | Lajes maciças podem ser radier: espessura, coeficiente de reação e tensão admissível; armadura base do radier pela taxa mínima automática das opções. | Falta | FU | radier |
| | **Lajes nervuradas** | | | |
| K1.9.90 | Zona aliviada e zona maciça; fôrma recuperável ou perdida (biblioteca editável). | Falta | E | lajes nervuradas |
| K1.9.91 | Dados: nome, altura total, capa, nº de peças do bloco, intereixo ou vão entre nervuras (iguais ou distintos em X e Y), largura da nervura (X e Y), peso próprio indicativo e volume de concreto m³/m² indicativo. | Falta | E | lajes nervuradas (dados) |
| K1.9.92 | Estimativa automática de peso e volume (nervuras + capa + material de enchimento padrão concreto); em fôrma recuperável só o concreto. | Falta | E | lajes nervuradas (peso e volume) |
| K1.9.93 | Ponto de passagem da malha por pano e direção das nervuras livres; desníveis entre panos. | Falta | E | lajes nervuradas (malha) |
| K1.9.94 | Armadura base em malha (superior/inferior, duas direções) considerada no dimensionamento; mesmo alerta de detalhamento de 1.9.87. | Falta | E | lajes nervuradas (armadura base) |
| K1.9.95 | Viga chata entre panos de alturas diferentes assume a altura da laje mais espessa; viga alta: parte saliente medida a partir da maior altura. | Falta | E | lajes nervuradas (vigas entre panos) |
| K1.9.96 | Engaste de borda do pano 0–1. | Falta | E | lajes nervuradas (engaste) |
| K1.9.97 | Ábacos (zonas maciças) gerados automaticamente nos pilares ou em qualquer zona, com a mesma espessura do pano aliviado; altura pode descer abaixo da zona aliviada. | Falta | E | ábacos automáticos |
| K1.9.98 | Ábaco automático: dimensão em cada direção = 1/6 da distância ao pilar mais próximo dentro de cone de visão de 40°; sem pilar visível (borda), usa o valor do sentido oposto; limites 2,5 a 5 vezes a altura (texto); parâmetros de geração configuráveis. | Falta | E | ábacos (dimensões) |
| K1.9.99 | Ábacos manuais ajustados ao número de caixotes; não usar para simular vigas (definir vigas); usar sempre em bordas livres. | Falta | E | ábacos manuais |
| K1.9.100 | Ábacos sempre têm armadura base entre nervuras, descontada da armadura das nervuras; não é medida nem detalhada — alerta para legenda e detalhes; tabela informativa sempre impressa na planta. | Falta | E | ábacos (armadura base) |
| K1.9.101 | Desenho opcional dos caixotes da zona aliviada. | Falta | E | desenho dos caixotes |
| K1.9.102 | Armadura pré-definida em qualquer posição/direção, descontada da armadura adicional na sua área. | Falta | R | armadura predefinida |
| | **Aberturas** | | | |
| K1.9.103 | Pano sem laje fica vazio (marcado com "?"); apagar o pano = abertura (cruz tracejada); aberturas retangulares em panos maciços e nervurados. | Parcial | L | `laje.abertura` cria furo e aviso de região sem laje; a grelha ignora os furos |
| K1.9.104 | Vigas chatas entre duas aberturas ou abertura e contorno, sem laje lateral, ficam sem altura: trocar por viga alta com dimensões. | Fora | — | regra interna de vigas chatas |
| K1.9.105 | Blocos de menor altura ao lado de abertura são desconsiderados, com aviso de dado incorreto. | Fora | — | regra interna de nervuradas |
| K1.9.106 | Limitação: zona independente fechada por vigas com abertura interna mantém o diafragma rígido; com ação horizontal os resultados não serão corretos — usar vigas inclinadas ou vigas livres desligadas (6 GL). | Falta | N | diafragma com aberturas grandes (flexível ou por zonas) |
| K1.9.107 | Paredes de subsolo com empuxo e panos de vigotas paralelos à parede: rigidez deve garantir diafragma (enchimento de concreto e detalhes), não feito automaticamente. | Falta | E | paredes com empuxo e diafragma |
| K1.9.108 | Versões < 2012.a: vigas livres perpendiculares à parede junto a vazios devem virar vigas inclinadas para dimensionar à flexo-compressão (vigas e lajes comuns só à flexão simples); ≥ 2012.a ver capítulo de diafragma rígido. | Fora | — | versões antigas do outro programa |
| K1.9.109 | Estruturas 3D integradas podem ligar zonas independentes. | Fora | — | estruturas 3D integradas |
| | **Fundações (na entrada de lajes)** | | | |
| K1.9.110 | Pilares e pilares-parede com vinculação externa podem ter sapatas e blocos sobre estacas; entre eles vigas de equilíbrio (centradoras) e vigas de travamento, que também ligam sapatas corridas de paredes. | Parcial | FU | sapata ou bloco por apoio no módulo Fundações; vigas de equilíbrio e travamento faltam |
| K1.9.111 | Sapatas retangulares calculadas como sólido rígido; podem receber vários pilares e/ou pilares-parede; blocos idem conforme tipologia. | Parcial | FU | sapata rígida isolada de um pilar; associadas faltam |
| K1.9.112 | Vigas centradoras absorvem os momentos transmitidos à sapata/bloco; várias numa direção dividem o momento proporcionalmente às rigidezes. | Falta | FU | vigas de equilíbrio (alavanca) |
| | **1.9.10–1.9.11 Cargas, vigas inclinadas, contraventamentos, escadas (pág. 65)** | | | |
| K1.9.113 | Cargas concentradas, lineares e superficiais lançadas graficamente, com cor por caso. | Feito | — | ponto, linha e área na planta por caso (`carga.*`); cor única |
| K1.9.114 | Vigas inclinadas: dimensões, cargas (concentrada, linear, faixa, triangular…), grupos inicial e final; sempre 6 GL; concreto retangular ou metálica; biengastadas ou biarticuladas. | Falta | E | vigas inclinadas |
| K1.9.115 | Contraventamentos em X: vigas inclinadas cruzadas entre dois apoios e dois pavimentos; sempre perfis metálicos. | Fora | — | contraventamento metálico |
| K1.9.116 | Escadas remetidas a capítulo próprio. | Falta | E | escadas |

## 1.10 Cálculo da estrutura (págs. 65–67)

| Item | Critério / funcionalidade | Situação | Frente | Statikos |
|---|---|---|---|---|
| K1.10.1 | Mensagens informativas por fase e de erro para dados incompatíveis. | Feito | — | aba Verificação (diagnósticos) e avisos/erros da análise |
| K1.10.2 | Fase 1: geração da geometria e da matriz de rigidez; dados incorretos param o processo; pode rodar por grupo ou obra inteira. | Feito | — | modelo gerado do lançamento, obra inteira; erros de lançamento sinalizados |
| K1.10.3 | Fase 2: inversão da matriz por método frontal; matriz singular → aviso de mecanismo e parada. | Feito | — | LDLᵀ em banda; linha singular vira erro (`fe3d.ts`) |
| K1.10.4 | Fase 3: deslocamentos por caso; aviso de deslocamentos excessivos acima de limite (má concepção ou rigidez à torção). | Falta | R | aviso de deslocamentos excessivos (NBR 6118 13.3, H/1700) |
| K1.10.5 | Problemas de estabilidade global → verificar com 2ª ordem. | Feito | — | aviso de γz > 1,3 |
| K1.10.6 | Fase 4: combinações e envoltórias por elemento e por estado-limite. | Feito | — | combinações e envoltórias por elemento |
| K1.10.7 | Fase 5: dimensionamento e armação conforme envoltórias, geometria, materiais e tabelas; aviso se exceder limites de norma; processo continua até o fim e gera relatório. | Feito | — | dimensionamento no worker; status ok/não atende/revisar com mensagens |
| K1.10.8 | Estruturas 3D integradas podem ser calculadas à parte dos pavimentos; recomenda-se dimensionar perfis antes do cálculo conjunto. | Fora | — | estruturas 3D integradas |
| K1.10.9 | Aço: mudanças de perfil alteram inércias → iterar cálculos até convergir; concreto (seção bruta) normalmente sem iteração. | Fora | — | iteração de perfis de aço |
| K1.10.10 | Escadas: reações nos apoios inferior, superior e intermediários convertidas em cargas lineares uniformes nos casos permanente e variável; sem cálculo integrado (efeito excessivo sob ação horizontal, fora da prática usual). | Falta | E | escadas |
| K1.10.11 | Erros consultáveis na tela ou impressos; recomenda-se revisar elemento a elemento. | Feito | — | filtro "só o que não atende", clique leva à planta; mensagens no memorial |

## 1.11 Resultados, relatórios e desenhos (págs. 67–76)

| Item | Critério / funcionalidade | Situação | Frente | Statikos |
|---|---|---|---|---|
| K1.11.1 | Resultados na tela, listagens em arquivo/impressora; cópia da obra. | Parcial | R | tabelas na tela e memorial HTML/PDF; sem listagens detalhadas; cópia = arquivo .statikos |
| K1.11.2 | Fundações com vinculação externa (sapatas, blocos, vigas centradoras e de travamento) calculadas junto ou depois; editáveis e redimensionáveis/verificáveis independentemente. | Parcial | FU | Fundações em módulo à parte, recebe cargas do edifício; sem vigas de equilíbrio |
| K1.11.3 | Dados gerais consultáveis; opções e tabelas especiais salvas com a obra; mudar opções/tabelas pode alterar resultados; recalcular após mudanças; permite reformar armaduras com novas opções. | Parcial | R | premissas visíveis e aviso de modelo alterado; sem refazer armadura com novas opções |
| | **Vigas** | | | |
| K1.11.4 | Flecha ativa e outras, relação flecha/vão, consideração de momentos mínimos. | Falta | N | flecha de vigas no edifício (o Pórtico 2D tem Branson + αf) |
| K1.11.5 | Envoltórias com e sem sismo de momento, cortante e torção (gráficas e numéricas). | Parcial | V | só máximos por viga; diagramas de M, V, T só no Pórtico 2D |
| K1.11.6 | Armadura (nº, bitola, comprimento, estribos) editável; áreas necessárias e efetivas, superior/inferior, longitudinal e transversal. | Parcial | R | um As e um arranjo por face e um estribo por viga; sem edição |
| K1.11.7 | Erros de vigas: flecha excessiva, espaçamento de barras, ancoragens, armadura comprimida, compressão diagonal (cortante e/ou torção), dimensionamento inadequado; código de cores. | Parcial | R | biela, armadura dupla e largura; sem flecha, espaçamento, ancoragem, torção |
| K1.11.8 | Coeficiente de engaste nas bordas consultável. | Falta | N | coeficiente de engaste de bordas |
| K1.11.9 | Vigas de aço: perfil dimensionado e perfis da série que atendem; vigas mistas: dimensionamento dos conectores. | Fora | — | vigas de aço e mistas |
| K1.11.10 | Mudança de seção + "rearmar" com os mesmos esforços (só pórticos alterados ou todos); travamento de armadura para verificação posterior; recalcular se variações grandes; edição manual por conta do usuário com verificação por cores. | Falta | R | editar seção/armadura e refazer só a armadura; travar armadura |
| K1.11.11 | Cargas exibidas graficamente por caso (cores). | Parcial | V | cargas desenhadas na planta com cor única, não por caso |
| | **Lajes de vigotas** | | | |
| K1.11.12 | Envoltórias de momento e cortante por vigota (majoradas), negativos (nº, bitola, comprimento), momentos e cortantes nos extremos por metro. | Parcial | E | treliçadas: momento por nervura informado; sem envoltórias nem negativos |
| K1.11.13 | Igualação de momentos, cortantes e negativos por média, diferença % ou máximo; editáveis. | Falta | R | uniformização de vigotas |
| K1.11.14 | Lajes mistas: ver capítulo próprio. | Fora | — | lajes mistas |
| | **Alveolares** | | | |
| K1.11.15 | Envoltórias médias por metro de faixa, placa escolhida, negativo nos apoios (nº, bitola, espaçamento, comprimento), flecha, erros de momento/cortante/flecha/ambiente; placa e negativos editáveis. | Falta | E | lajes alveolares |
| | **Maciças, nervuradas e radiers** | | | |
| K1.11.16 | Armadura base definida/modificada; malha de discretização (modelo 3D). | Falta | R | armadura base das lajes |
| K1.11.17 | Envoltória de áreas de armadura por metro nas direções de armadura, superior e inferior. | Parcial | R | As por metro (máximo por laje e direção), sem mapa |
| K1.11.18 | Deslocamentos (mm) por caso em qualquer nó; esforços por caso e taxa necessária por direção. | Falta | V | deslocamentos e esforços por nó e caso na tela |
| K1.11.19 | Esforços de cálculo pelo método de Wood (combina momentos fletores e volventes/torção nas direções de armadura). | Falta | N | Wood-Armer; nós: momentos da grelha por direção, torçor ignorado |
| K1.11.20 | Deslocamento máximo por pano e caso (não é flecha); no radier é recalque; valor positivo = levantamento → hipótese inválida. | Parcial | R | flecha elástica máxima por pavimento (G, Q) na aba Análise |
| K1.11.21 | Verificação e armadura de punção e cortante em zonas maciças e nervuras. | Falta | N | punção e cortante em lajes (NBR 6118 19.4 e 19.5) |
| K1.11.22 | Igualação de barras por máximos de taxa e comprimento; edição de nº, bitola, espaçamento, comprimento e ganchos. | Falta | R | uniformização e edição de barras das lajes |
| K1.11.23 | Tensões excessivas no radier sinalizadas. | Falta | FU | tensões no radier |
| K1.11.24 | Isovalores e isolinhas de esforços, deslocamentos e taxas. | Falta | V | isovalores e isolinhas |
| K1.11.25 | Linhas de dobra/emenda introduzidas antes do cálculo respeitam comprimentos mínimos; depois do cálculo, emendas construtivas de 30 cm sem recálculo. | Falta | R | linhas de dobra e emendas |
| K1.11.26 | "Rearmar" lajes com os esforços iniciais (com linha de igualação). | Falta | R | refazer armadura das lajes |
| | **Pilares** | | | |
| K1.11.27 | Armadura consultável e editável; mudança de dimensão gera nova armadura. | Parcial | R | armadura calculada por lance; não editável; nova seção recalcula tudo |
| K1.11.28 | Esforços por caso (N, M, V, T) em qualquer ponto da altura e diagramas. | Falta | V | esforços ao longo do pilar e diagramas (só no Pórtico 2D) |
| K1.11.29 | Esforços mais desfavoráveis (majorados) por lance que determinam a armadura; pode haver várias combinações determinantes (atendem a armadura escolhida mas não a imediatamente inferior). | Parcial | R | combinações determinantes escolhidas, mas não listadas ao usuário |
| K1.11.30 | Diagramas de deformação e tensão do concreto e aço na reta normal à linha neutra. | Falta | V | diagrama de deformações e tensões da seção |
| K1.11.31 | Momentos ampliados por excentricidade acidental e de 2ª ordem (flambagem) destacados. | Parcial | R | M1d,mín e M2d calculados, não exibidos |
| K1.11.32 | Código de motivo quando não atende (ex.: taxa excessiva acima do máximo de norma — armadura mantida); sinal de limite excedido após edição. | Parcial | R | mensagens (λ > 90, γn, 4 %) e status por lance |
| K1.11.33 | Recalcular se mudanças significativas (rigidez mudou). | Feito | — | aviso "o modelo mudou: recalcule" |
| K1.11.34 | Pilares com seção insuficiente não são desenhados nem dimensionados. | Parcial | R | λ > 200 não dimensiona; seção insuficiente marcada "não atende" |
| K1.11.35 | Quadro de pilares agrupa pilares; os que não atendem em vermelho; armadura travável para verificação posterior. | Parcial | R | quadro de pilares na prancha; sem agrupar iguais, cores ou travamento |
| | **Pilares-parede e paredes** | | | |
| K1.11.36 | Diagramas de tensões normais e tangenciais em toda a altura por combinação e deslocamentos por caso, em isovalores coloridos com mín/máx. | Falta | E | pilares-parede e paredes (tensões) |
| K1.11.37 | Armadura e espessura editáveis; incompatibilidades em vermelho; rearmar. | Falta | E | pilares-parede e paredes (edição) |
| K1.11.38 | Mensagens codificadas de estado; grau de cumprimento (%) da armadura e zonas a reforçar; esforços mais desfavoráveis do trecho e resultantes por caso. | Falta | E | pilares-parede e paredes (mensagens) |
| | **2ª ordem, vento, sismo, outros** | | | |
| K1.11.39 | Fatores de ampliação por combinação e fator resultante da ação horizontal; relatório. | Feito | — | ampliação por direção (0,95·γz) na aba Análise e no memorial |
| K1.11.40 | Forças de vento X e Y por pavimento. | Feito | — | forças de vento por pavimento (aba Análise) |
| K1.11.41 | Sismo: períodos por modo, coeficientes de participação de massa por direção e coeficiente sísmico do espectro de deslocamentos. | Fora | — | sismo |
| K1.11.42 | Isovalores de deslocamentos, esforços e taxas (cm²/m) em maciças e nervuradas por grupo. | Falta | V | isovalores de lajes |
| K1.11.43 | Deformada 3D por caso e combinação, com animação. | Falta | V | deformada 3D animada (o Pórtico 2D tem deformada) |
| | **1.11.2 Relatórios (págs. 73–75)** | | | |
| K1.11.44 | Listagem geral: obra, grupos, pavimentos, alturas, coordenadas e dimensões de pilares e vínculos, pilares-parede, ações gravitacionais, vento, sismo, materiais, níveis de controle, lajes, geometria e pesos. | Parcial | R | memorial com obra, pavimentos, ações, vento e materiais; sem coordenadas de pilares nem pesos por laje |
| K1.11.45 | Listagem das combinações usadas. | Falta | R | listagem das combinações (só a contagem) |
| K1.11.46 | Vigas: envoltórias de capacidade necessária, momentos, cortantes, torções, armadura colocada, flecha ativa; envoltórias com gráficos; quantitativos; etiquetas de detalhamento; arquivo de intercâmbio texto da armadura. | Parcial | R | vigas no memorial (M, V, armadura); sem envoltórias, flecha, etiquetas |
| K1.11.47 | Quantitativos: áreas e volumes de panos e vigas; vigotas por tipo e comprimento; blocos/caixotes; negativos de vigotas; quantidades por m² da obra; armadura de maciças e nervuradas. | Parcial | R | concreto, fôrma e aço por taxa por pavimento; sem itens por tipo de laje |
| K1.11.48 | Vigas inclinadas: envoltórias de momento, normal, cortante e armadura. | Falta | E | vigas inclinadas |
| K1.11.49 | Pilares e pilares-parede: barras, esforços na base, por caso e mais desfavoráveis. | Parcial | R | armadura e Nd por lance; esforços por caso na base em "Cargas na fundação" |
| K1.11.50 | Deslocamentos por caso por pilar e pavimento; deslocamentos máximos de pilares por pavimento na combinação mais desfavorável de cada direção (não simultâneos); distorções máximas dos pilares. | Falta | R | deslocamentos e distorções por pilar e pavimento |
| K1.11.51 | Efeitos de 2ª ordem; cargas de vento; participação sísmica (períodos, massas, coeficiente sísmico por direção). | Parcial | R | γz no memorial; forças de vento só na tela; sismo fora |
| K1.11.52 | Fundações: materiais, ações, geometria de sapatas, blocos, vigas centradoras e de travamento, quantitativos e verificações realizadas. | Parcial | FU | memorial de sapatas, blocos e tubulões no módulo Fundações; vigas de equilíbrio faltam |
| K1.11.53 | Consolos curtos; estruturas 3D integradas; verificações ELU de pilares e vigas. | Parcial | R | verificações ELU de pilares e vigas no memorial; sem detalhe por combinação |
| | **1.11.3 Desenhos (págs. 75–76)** | | | |
| K1.11.54 | Formatos padrão ou do usuário; impressora, plotter, DXF/DWG, PDF; detalhes DXF/DWG inseríveis; escala, espessuras, textos, moldura, modelo DXF/DWG; elementos por camadas. | Parcial | V | PDF, DXF R2000, DWG; A0–A4, carimbo, camadas; sem formato ou moldura do usuário |
| K1.11.55 | Planta de locação: elementos cotados por pavimento em relação a eixos; opcionalmente áreas, volumes e aço em quadro. | Parcial | V | cotas entre centros de pilares e eixos na prancha de formas; sem planta de locação própria |
| K1.11.56 | Plantas de fôrma/estrutura: vigas, pilares, pilares-parede, paredes, panos de vigotas (positivos, cortantes extremas, comprimentos de negativos), armaduras de maciças e nervuradas, quadro de armadura base, ábacos e nervuras, punção, zonas maciças/aliviadas, quadro de quantitativos; desenhos de fundação. | Parcial | R | planta de formas com quadro de pilares; sem armaduras de lajes nem fundações |
| K1.11.57 | Detalhamento de vigas (pórticos): nome, escala, dimensões, barras (nº, bitola, comprimentos, posição), estribos (tipo, bitola, espaçamento), quadro resumo. | Falta | R | detalhamento de vigas |
| K1.11.58 | Quadro de pilares e placas de base: seções, número, posição, trecho de estribos, tipos, bitolas, comprimentos, perfis; agrupados por tipos iguais; placas com dimensões, chumbadores e geometria; por pavimento, com resumo. | Parcial | R | quadro de pilares com seção e armadura; sem estribos, comprimentos, agrupamento |
| K1.11.59 | Detalhamento de pilares e pilares-parede: elevação e tabela de comprimentos de barras. | Falta | R | detalhamento de pilares |
| K1.11.60 | Cargas na fundação: arranques com cargas por caso em eixos globais (pilares e pilares-parede). | Parcial | FU | cargas na fundação em tabela e envio às Fundações; sem desenho |
| K1.11.61 | Paredes de subsolo/portantes: elevações por trecho com tabela de armadura por pavimento e quantitativos aproximados. | Falta | E | paredes de subsolo e portantes |
| K1.11.62 | Desenho de cargas especiais por caso e grupo; consolos curtos; isolinhas de lajes; estrutura 3D. | Falta | V | desenho de cargas, isolinhas e vista 3D |

## 1.12 Verificação e dimensionamento: vigas, pilares, paredes e vigotas (págs. 76–90)

| Item | Critério / funcionalidade | Situação | Frente | Statikos |
|---|---|---|---|---|
| K1.12.1 | ELU de seções de concreto: diagrama parábola-retângulo (flexão composta: normal + momentos) e retangular (flexão simples), com diagramas tensão-deformação de concreto e aço da norma. | Feito | — | fibras com parábola-retângulo (pilares) e retangular simplificado (vigas) |
| K1.12.2 | Limites de norma aplicados: taxas e densidades mín/máx de armadura, nº mínimo de barras, bitolas mínimas, espaçamentos mín/máx; parte editável nas opções, parte em arquivos internos. | Parcial | N | limites de armadura e espaçamento no código, não editáveis |
| | **1.12.1 Vigas horizontais e inclinadas** | | | |
| K1.12.3 | Flexão simples calculada em no mínimo 14 pontos por vão (vão delimitado pelos elementos que tocam a viga: vigotas, maciças, nervuradas). | Parcial | R | estações a cada 25 cm, mas um único par de máximos por viga |
| K1.12.4 | Em cada ponto: armadura superior e inferior pela envoltória (tração/compressão conforme sinal), comparada às taxas mínimas de norma; prevalece a maior. | Parcial | R | As,mín por viga, não seção a seção |
| K1.12.5 | Armadura calculada para envoltórias sísmica e não sísmica; adota a maior. | Fora | — | sismo |
| K1.12.6 | Inferior: primeira disposição da tabela de positivos que supera a necessária; até 3 comprimentos de corte; tabelas definidas por largura e altura. | Parcial | R | `chooseBars` escolhe nº e φ; sem tabelas nem comprimentos de corte |
| K1.12.7 | Tabela em 3 grupos (bitolas podem diferir): grupo 1 passante entre apoios, ancorado construtivamente (do eixo do apoio até a face oposta menos 3 cm), salvo quando o cálculo exige ancoragem menor a partir do eixo. | Falta | R | grupos de barras e ancoragem construtiva |
| K1.12.8 | Tabelas padrão: grupo passante sempre > 1/3 ou 1/4 da armadura total; manter a proporção ao editar. | Falta | R | proporção de barras passantes |
| K1.12.9 | Grupos 2 e 3 mais curtos, sempre simétricos, com comprimentos mínimos em % do vão (opções). | Falta | R | comprimentos mínimos dos grupos |
| K1.12.10 | Grupo 1 sempre penetra ≥ 10 diâmetros a partir da face do apoio. | Falta | R | penetração mínima no apoio |
| K1.12.11 | Sem combinação na tabela: usa φ25 e aviso "inferior fora de tabela". | Parcial | R | aviso "não cabe na largura"; sem arranjo forçado |
| K1.12.12 | Superior (inferior em vigas de fundação): primeira disposição da tabela de negativos acima da necessária; até 3 grupos de comprimentos com % mínimo por grupo nas opções. | Parcial | R | armadura superior por `chooseBars`, um arranjo por viga |
| K1.12.13 | Armadura de montagem: contínua ou construtiva, suportando estribos; montagem contínua quando a armação é feita em oficina de apoio a apoio (negativos colocados na obra). | Falta | R | armadura de montagem |
| K1.12.14 | Opção de considerar a montagem como colaborante (superior); se precisar de compressão superior, passa a colaborante. | Falta | R | montagem colaborante |
| K1.12.15 | Ancoragem da montagem: gancho ou prolongamento reto, a partir do extremo ou do eixo (opções). | Falta | R | ancoragem da montagem |
| K1.12.16 | Seções T: barras adicionais para apoiar as pontas dos estribos na mesa. | Falta | R | barras de canto da seção T |
| K1.12.17 | Montagem para porta-estribos entre extremos dos negativos, bitola pequena, emenda construtiva; útil em zona sísmica para afastar emendas dos nós. | Falta | R | porta-estribos |
| K1.12.18 | Sem disposição na tabela: nº necessário de φ25 e aviso "fora de tabela" (montagem e adicional). | Parcial | R | aviso "não cabe na largura" |
| K1.12.19 | Negativos que se encontram dos dois lados de um trecho viram montagem colaborante automaticamente. | Falta | R | negativos que viram montagem |
| K1.12.20 | Dentro do apoio: altura variando linearmente (1/3) reduz a armadura; o máximo fica entre as faces, normalmente na face. | Fora | — | mísula fictícia: critério interno |
| K1.12.21 | Vigas em pilares-parede/paredes: vão de cálculo = menor entre distância entre eixos (ou ponto médio do eixo da viga cruzada) e vão livre + 2 × altura; corte de barras não excede o vão de cálculo em mais de duas alturas. | Falta | E | vigas sobre pilares-parede e paredes |
| K1.12.22 | Armadura de pele nas faces laterais quando a altura exige (critério nas opções), com bitola e espaçamento mínimos de norma. | Falta | R | armadura de pele (NBR 6118 17.3.5.2.3) |
| K1.12.23 | Torção: após flexão, armadura longitudinal de torção por norma em cada seção; as barras de canto existentes absorvem o acréscimo se tiverem folga; senão aumenta a longitudinal e acrescenta barras laterais (como pele). | Falta | N | torção em vigas (NBR 6118 17.5) |
| K1.12.24 | Compressão diagonal por torção + cortante verificada com a altura útil na borda do apoio, pelas fórmulas da norma. | Parcial | N | biela por cortante (VRd2) verificada; cortante + torção não |
| K1.12.25 | Corte de barras: diagrama de capacidade necessária deslocado de d + comprimento de ancoragem reduzido (lb × As,nec/As,ef), conforme posição de aderência (I boa, II má). | Falta | R | decalagem aℓ e corte de barras (NBR 6118 17.4.2.2 e 18.3.2.3) |
| K1.12.26 | Comprimento máximo por zona para cada grupo no sentido em que o esforço decresce; opcionalmente ajustado a mínimos em % do vão e a múltiplos de 5 cm. | Falta | R | comprimentos por zona |
| K1.12.27 | Extremos: ancoragem com gancho, calculando o comprimento da perna vertical, com mínimo das opções se definido. | Falta | R | ganchos nos extremos |
| K1.12.28 | (Texto interrompido) Tratamento do positivo nos apoios intermediários — não lido. | Fora | — | trecho truncado; continua em K1.12.1-1 |
| | **1.12.1 Vigas de concreto, continuação: armadura longitudinal e transversal, fissuração (págs. 81–84)** | | | |
| K1.12.1-1 | Armadura inferior nos apoios (parágrafo iniciado na pág. 80): ancorada para os dois lados do eixo do apoio, com mínimo de 10 diâmetros contados da face do apoio. | Falta | R | ancoragem da armadura inferior nos apoios (NBR 6118 18.3.2.4) |
| K1.12.1-2 | Comprimento máximo de barra configurável: se excedido, a barra é cortada e emendada por traspasse igual a 2× o comprimento máximo de ancoragem. | Falta | R | emendas por traspasse |
| K1.12.1-3 | Opção para sismo: ancoragens e traspasses posicionados fora da zona de confinamento junto aos apoios. | Fora | — | sismo |
| K1.12.1-4 | Cortante: verificação da compressão na biela (diagonal comprimida) na face do apoio direto. | Feito | — | VRd2 na envoltória de cortante (`beamShear`) |
| K1.12.1-5 | Estribos dimensionados a partir da face do apoio ou, por opção, a partir de uma distância da face dada em % da altura útil d. | Parcial | N | cortante máximo da parte flexível; sem redução junto ao apoio (NBR 17.4.1.2.1) |
| K1.12.1-6 | Configuração dos estribos: diâmetros e espaçamentos mínimos em função das dimensões da viga, distribuição simétrica ou não, diâmetros diferentes por zona da viga. | Falta | R | configuração de estribos |
| K1.12.1-7 | Tipos de estribo: simples (sempre envolvendo a seção inteira), duplo, triplo e grampos verticais abertos; estribos e grampos combináveis, até 2 ou 3 na mesma seção; tabelas editáveis pelo usuário. | Parcial | R | estribo simples de 2 ramos; sem múltiplos nem grampos |
| K1.12.1-8 | Ordem de cálculo: primeiro o estribo mínimo normativo (função da seção e da tabela) e o trecho central que ele cobre na envoltória de cortante. | Parcial | R | ρw,mín aplicado; um só estribo por viga, sem zonas |
| K1.12.1-9 | Zonas laterais (esquerda e direita): estribos necessários até os apoios, estendidos pelo comprimento necessário + d/2; confere se os comprimentos superam os mínimos configurados. | Falta | R | zonas de estribos até os apoios |
| K1.12.1-10 | Torção: armadura transversal de torção com mínimos normativos (espaçamento máximo, estribo fechado), somada à de cortante; a disposição final (diâmetro, espaçamento, comprimento) cobre a soma. | Falta | N | estribos de torção |
| K1.12.1-11 | Verificação conjunta da biela comprimida sob tensões tangenciais de cortante + torção. | Falta | N | biela sob cortante + torção |
| K1.12.1-12 | Pilar que nasce em viga (sem ligação externa): estribos verticais pelo cortante na face de apoio desse trecho. | Falta | E | pilar que nasce em viga (transição: apoio fixo provisório) |
| K1.12.1-13 | Limitação: carga concentrada (ou pilar apoiado) a distância ≤ d do apoio forma bielas e tirantes e exige armadura horizontal, como num consolo curto; esse critério não é implementado → verificação, armadura e detalhe manuais (ou barras inclinadas). | Falta | N | carga próxima ao apoio (biela-tirante) |
| K1.12.1-14 | Recomendação de cuidado especial no projeto e na execução de apoios desse tipo (sensíveis a danos). | Fora | — | recomendação do manual |
| K1.12.1-15 | Verificação do espaçamento dos estribos quando a armadura longitudinal está comprimida: diâmetro e espaçamento máximo dependem do grau de compressão. | Falta | R | estribos com armadura longitudinal comprimida |
| K1.12.1-16 | Arranques de pilar apoiado em viga: conferir a ancoragem na viga; recomenda-se limitar o coeficiente de engaste na base do pilar no primeiro lance para evitar barras grossas e arranques longos. | Falta | E | arranques de pilar sobre viga |
| K1.12.1-17 | Limitação: trecho com vão < 2× a altura (viga alta/viga-parede) não tem critério de dimensionamento → verificação e armadura manuais. | Falta | R | aviso de viga-parede (NBR 6118 22.4) |
| K1.12.1-18 | Limitação: largura > 2× o vão → elemento de placa; deve ser discretizado e lançado como laje, não viga. | Falta | R | aviso de elemento de placa |
| K1.12.1-19 | Viga chata mais larga que o apoio em mais de uma altura: punção e estribos no apoio verificados manualmente, com armadura transversal adicional se necessário. | Falta | N | punção e estribos em viga chata larga |
| K1.12.1-20 | Limitação: cargas penduradas abaixo da linha neutra ou cargas concentradas de vigas apoiadas em vigas → armadura de suspensão não calculada; acrescentar manualmente. | Falta | R | armadura de suspensão (NBR 6118 18.3.6) |
| K1.12.1-21 | Fissuração (opcional): limite de abertura de fissura definido pelo usuário; expressão do CEB-FIP Model Code: wk = 1,7·sm·εsm. | Parcial | N | fissuração NBR 6118 17.3.3 só no Pórtico 2D (`crackWidth`); limite pela CAA |
| K1.12.1-22 | sm = 2c + 0,2s + K1·K2·φ·Ac,ef/As; c = cobrimento da armadura tracionada; s = espaçamento das barras (se s > 15φ, usa 15φ); K1 = 0,4 (barras nervuradas); K2 = 0,125 (flexão simples); As = área das barras dentro de Ac,ef; Ac,ef = área efetiva em torno das barras, com altura de 1/4 da altura da viga. | Fora | — | fórmula do CEB; usamos a da NBR 6118 |
| K1.12.1-23 | εsm = (σs/Es)·[1 − K3/(2,5·K1)·(σsr/σs)²] ≥ 0,4·σs/Es; σs = tensão em serviço; σsr = tensão na armadura no instante da fissuração; Es = módulo do aço; K3 = 0,5 (reconstruída). | Fora | — | fórmula do CEB |
| K1.12.1-24 | Essa expressão vale para as normas em geral; NB-1 e Eurocódigo 2 usam fórmulas próprias. | Parcial | N | fórmula da NBR no Pórtico 2D; edifício não verifica |
| K1.12.1-25 | Verificação ativa e não atendida: o programa alonga barras ou aumenta a taxa até atender e emite aviso (não erro) entre os erros da viga. | Falta | R | ajuste automático da armadura por fissuração |
| | **1.12.2 Vigas inclinadas (pág. 84)** | | | |
| K1.12.2-1 | Podem ser de concreto armado ou de aço. | Falta | E | vigas inclinadas de concreto |
| K1.12.2-2 | Dimensionadas à flexo-compressão oblíqua pela envoltória de momentos e esforço normal; estribos por cortante. | Falta | E | vigas inclinadas (flexo-compressão) |
| K1.12.2-3 | Armadura dimensionada para dois planos paralelos às faces: vertical e horizontal. | Falta | E | vigas inclinadas (dois planos) |
| K1.12.2-4 | Armadura longitudinal superior e inferior apresentada = máximo (envoltória) de todas as seções ao longo da barra. | Falta | E | vigas inclinadas (envoltória) |
| K1.12.2-5 | A armadura entra nos desenhos, mas a consulta é só em tela; o detalhe dos nós de extremidade (cruzamentos) fica a cargo do projetista. | Falta | E | vigas inclinadas (desenho) |
| K1.12.2-6 | Saída opcional: envoltória de esforços em listagem, para estudo das seções e dos nós de ligação. | Falta | E | vigas inclinadas (listagem) |
| K1.12.2-7 | Viga inclinada de aço segue os critérios dos pilares de aço. | Fora | — | aço |
| | **1.12.3 Vigas de aço (pág. 85)** | | | |
| K1.12.3-1 | Dimensionadas pela norma e tipo de aço escolhidos; o programa propõe o perfil ótimo da série. | Fora | — | aço no edifício (o Pórtico 2D faz NBR 8800) |
| K1.12.3-2 | Hipótese: flexão simples; esforço normal desconsiderado. | Fora | — | aço |
| K1.12.3-3 | Opcional: verificação de flambagem lateral com torção da mesa inferior em vigas sob a laje. | Fora | — | aço |
| K1.12.3-4 | Critérios: limites da norma e limites de flecha; aproveitamento expresso em % de cada um. | Fora | — | aço |
| K1.12.3-5 | Vigas mistas: remetidas a capítulo próprio. | Fora | — | vigas mistas |
| K1.12.3-6 | Vigas alveolares (tipo Boyd) modeladas como Vierendeel e dimensionadas como perfil laminado pela norma. | Fora | — | vigas alveolares de aço |
| K1.12.3-7 | Saída: listagens completas de verificação ELU com todas as checagens feitas. | Fora | — | aço |
| | **1.12.4 Pilares, pilares-parede e paredes de concreto (págs. 85–88)** | | | |
| K1.12.4-1 | Pilares de concreto dimensionados à flexo-compressão oblíqua. | Feito | — | flexão oblíqua por fibras (`fiber.ts`) |
| K1.12.4-2 | Processo sequencial: com a tabela de armaduras do projeto, testa as disposições em ordem crescente de taxa. | Parcial | R | busca por φ e espaçamento crescente; sem tabela de armaduras do projeto |
| K1.12.4-3 | Disposições possíveis: simétricas em 2 ou 4 faces, ou com pequena diferença percentual entre faces. | Parcial | R | só simétrica no contorno |
| K1.12.4-4 | A armadura escolhida deve atender todas as combinações. | Feito | — | atende as combinações determinantes (Nd máx./mín., maiores momentos) |
| K1.12.4-5 | Verifica compatibilidade esforços × deformações e que tensões e deformações-limite do concreto e do aço não são excedidas. | Feito | — | fibras com deformações-limite da NBR 6118 |
| K1.12.4-6 | Considera excentricidade mínima ou acidental e excentricidade adicional de flambagem (2ª ordem) conforme a norma. | Feito | — | M1d,mín e M2d do pilar-padrão com curvatura aproximada |
| K1.12.4-7 | Esbeltez mecânica limitada pela norma; acima do limite das fórmulas, a seção é dada como insuficiente (armadura manual ainda permitida) com aviso de esbeltez excessiva. | Parcial | N | λ > 90 "revisar", λ > 200 recusa; sem método geral entre 90 e 200 |
| K1.12.4-8 | Taxas geométricas/mecânicas mínimas e máximas por norma num arquivo interno; acima do máximo, aviso de taxa excessiva (em tela e listagem) → aumentar a seção. | Feito | — | As entre máx(0,15Nd/fyd; 0,4 %) e 4 % |
| K1.12.4-9 | Se nenhuma armadura da tabela resolve, o programa gera armaduras próprias até não caberem em uma camada no perímetro; então aviso de armadura manual → ampliar a tabela e recalcular só os pilares, ou aumentar a seção (que redimensiona automaticamente). | Parcial | R | uma camada no contorno; sem armadura própria além da busca |
| K1.12.4-10 | Grande mudança de dimensões: recomendado recalcular a estrutura toda (rigidez muda). | Feito | — | cálculo sempre global; aviso de modelo alterado |
| K1.12.4-11 | Estribos: diâmetro e espaçamento pela norma, a partir de tipologias predefinidas editáveis, dependentes da armadura vertical (também editável). | Parcial | R | estribo φ5/φ6,3 c/ mín(20; menor lado; 12φ) fixo; sem tipologias |
| K1.12.4-12 | Tabelas de estribos e grampos por armadura vertical e dimensões da seção, podendo variar por projeto; sem definição na tabela, só estribo perimetral. | Falta | R | grampos e estribos suplementares (NBR 6118 18.2.4) |
| K1.12.4-13 | Cortante: verificação da biela comprimida e da tração na alma com a armadura disposta; falha → aviso na coluna dos estribos. | Falta | N | cortante nos pilares do edifício (o Pórtico 2D verifica) |
| K1.12.4-14 | Emendas: comprimento = ancoragem em posição I (boa aderência), função do aço, do concreto e de cargas dinâmicas. | Falta | R | emendas de pilares |
| K1.12.4-15 | Opção: reduzir o comprimento de ancoragem pela relação armadura necessária/efetiva, com limite inferior (texto ambíguo); comprimentos editáveis. | Falta | R | ancoragem reduzida nas emendas |
| K1.12.4-16 | Hipótese: pilar predominantemente comprimido; pilar tracionado (tirante) exige alongar ancoragens e detalhar ligações manualmente. | Falta | N | pilar tracionado: combinações com Nd ≤ 0 são descartadas |
| K1.12.4-17 | Armadura vertical: último e penúltimo lances armados pelos seus esforços; depois, lance a lance de cima para baixo, sem que o inferior tenha menos armadura que o superior (critério de continuidade opcional). | Falta | R | continuidade de armadura entre lances |
| K1.12.4-18 | Seções verificadas por pavimento: topo e base do lance e base do lance superior; com cargas horizontais aplicadas no pilar, também seções intermediárias. | Parcial | N | topo e base do lance; sem seções intermediárias |
| K1.12.4-19 | Pilar com desnível: mesma metodologia para cada trecho em que fica dividido. | Falta | E | pilar com desnível |
| K1.12.4-20 | Estribos dispostos não atendem o cortante → aviso; correções sugeridas: reduzir espaçamento, aumentar diâmetro, outra disposição de estribos/grampos (via tabelas e recálculo dos pilares) ou aumentar armadura vertical. | Parcial | R | mensagem sugere aumentar a seção; sem verificação de estribos |
| K1.12.4-21 | Opções de armação: continuidade das barras ou não; manter diâmetro das barras de canto; manter número e diâmetro das barras das faces. | Falta | R | opções de continuidade |
| K1.12.4-22 | Edição: alterar seção (rearma), armadura vertical e tipo de estribo. | Falta | R | edição de seção, armadura e estribos no resultado |
| | **1.12.4.1 Pilares de aço (pág. 88)** | | | |
| K1.12.4.1-1 | Dimensionados pela norma escolhida para aço laminado ou formado a frio. | Fora | — | pilares de aço |
| K1.12.4.1-2 | Coeficientes de flambagem informados pelo usuário. | Fora | — | aço |
| K1.12.4.1-3 | Opção manter o perfil existente → conferir se atende. | Fora | — | aço |
| K1.12.4.1-4 | Opção o programa trocar o perfil: esforços vêm do perfil inicial; mudança grande → recalcular a obra. | Fora | — | aço |
| K1.12.4.1-5 | Placas de base: tensões globais e locais no aço, no concreto e nos chumbadores, punção e arrancamento. | Fora | — | placas de base |
| K1.12.4.1-6 | Pilar apoiado em elemento que não é fundação: comprimento dos chumbadores e ancoragem conferidos manualmente. | Fora | — | aço |
| K1.12.4.1-7 | Limitação: ligações do pilar em cada pavimento com vigas/lajes não são calculadas; verificar manualmente. | Fora | — | ligações de aço |
| | **1.12.4.2 Pilares-parede e paredes de concreto (págs. 88–89)** | | | |
| K1.12.4.2-1 | Com o estado de tensões, para cada combinação verifica armadura vertical e horizontal de cada pano, e tensões/deformações no concreto e no aço com a armadura das tabelas. | Falta | E | pilares-parede e paredes (armadura por pano) |
| K1.12.4.2-2 | Aumento sequencial da armadura até atender todas as combinações. | Falta | E | pilares-parede e paredes |
| K1.12.4.2-3 | Verificação também na direção transversal, com armadura adicional se necessário; repetido em cada pano. | Falta | E | pilares-parede e paredes (direção transversal) |
| K1.12.4.2-4 | Verifica taxas mínimas e máximas, espaçamentos mínimos e máximos e proporções (ex.: lado > 5× a espessura); não atendendo, aviso e aplicação das limitações de pilar. | Falta | E | pilares-parede e paredes (taxas) |
| K1.12.4.2-5 | Esbeltez verificada por pano; excedida → aviso. | Falta | E | pilares-parede e paredes (esbeltez) |
| K1.12.4.2-6 | Consulta em tela de armaduras e erros; alterar armadura ou espessura dispara reverificação; redimensionamento disponível. | Falta | E | pilares-parede e paredes (edição) |
| K1.12.4.2-7 | Fator de cumprimento (fração da área do pano que atende) padrão 90 %, editável; valor menor (ex.: 80 %) dá armadura menor e marca em vermelho os pontos que não atendem (20 % da área). | Falta | E | fator de cumprimento |
| K1.12.4.2-8 | Saída: para cada ponto vermelho, consulta da armadura adicional necessária; colocá-la é decisão do projetista, edição manual nos desenhos. | Falta | E | armadura adicional local |
| K1.12.4.2-9 | Edição direta da armadura recalcula o fator de cumprimento. | Falta | E | fator de cumprimento |
| K1.12.4.2-10 | Armadura não atendida: aviso e texto em vermelho. | Falta | E | aviso de armadura |
| K1.12.4.2-11 | Comprimentos de emenda por pavimento, editáveis, diferentes para tração e compressão. | Falta | E | emendas em paredes |
| | **1.12.4.3 Paredes de alvenaria (pág. 89)** | | | |
| K1.12.4.3-1 | Verificação das tensões-limite de compressão e de tração (tração = 10 % da compressão), com fator de cumprimento de 80 %; falha gera aviso no relatório final. | Falta | E | alvenaria estrutural (NBR 16868) |
| | **1.12.5 Lajes de vigotas (unidirecionais) (págs. 89–90)** | | | |
| K1.12.5-1 | Cálculo vigota a vigota, em flexão simples. | Parcial | E | treliçadas na grelha com nervura T |
| K1.12.5-2 | Saída: momento positivo máximo em kN·m por metro de largura, majorado. | Parcial | E | momento por nervura (majorado) informado |
| K1.12.5-3 | Uniformização dos momentos por pano: ao máximo ou à média, conforme a diferença percentual entre vigotas vizinhas. | Falta | R | uniformização de momentos por pano |
| K1.12.5-4 | Com momentos admissíveis por tipo de vigota definidos, o resultado sai pelo nome do tipo; excedida a tabela → aviso de insuficiente → ampliar a tabela de tipos. | Falta | E | tipo de vigota por momento admissível |
| K1.12.5-5 | Negativos também em flexão simples, armados pela tabela; comprimentos mínimos e taxas mínimas das opções; editáveis e uniformizáveis por diferença % de comprimento. | Falta | E | negativos das treliçadas |
| K1.12.5-6 | Necessidade de armadura comprimida no negativo → retirada dos blocos de enchimento (maciçamento) até onde deixa de ser necessária, indicada em planta por uma linha. | Falta | E | maciçamento junto aos apoios |
| K1.12.5-7 | Consulta em tela das envoltórias de momento e cortante (majoradas) por vigota. | Falta | V | envoltórias por vigota |
| K1.12.5-8 | Extremidades das vigotas: mesmo com negativo nulo, arma para momento = % do positivo máximo do vão (configurável). | Falta | E | momento mínimo nas extremidades |
| K1.12.5-9 | Momentos mínimos positivos e negativos configuráveis para toda a obra ou por pano. | Falta | N | momentos mínimos |
| K1.12.5-10 | Limitação: não verifica necessidade de armadura comprimida no vão. | Fora | — | limitação do outro programa |
| K1.12.5-11 | Cortantes nas extremidades das vigotas nos desenhos: majorados e por metro de largura. | Falta | R | cortante das vigotas nos desenhos |
| K1.12.5-12 | Flechas verificadas conforme a norma, distinguindo vigota armada e protendida (detalhe no cap. 2 do manual). | Parcial | N | flecha elástica × (1 + αf) sem fissuração; sem distinção protendida |

## 1.13 Lajes alveolares, maciças e nervuradas (págs. 90–95)

| Item | Critério / funcionalidade | Situação | Frente | Statikos |
|---|---|---|---|---|
| | **1.13 Lajes mistas (pág. 90)** | | | |
| K1.13-1 | Remetidas a capítulo próprio do manual. | Fora | — | lajes mistas |
| | **1.13.1 Lajes alveolares (pág. 90)** | | | |
| K1.13.1-1 | Processo de cálculo remetido ao item 1.9 (entrada de dados). | Falta | E | lajes alveolares |
| | **1.13.2 Lajes maciças (págs. 91–94)** | | | |
| | **1.13.2.1 Armadura base** | | | |
| K1.13.2.1-1 | Opcional: armadura base superior e inferior, longitudinal e transversal, podendo diferir entre si; escolhida da tabela e editável. | Falta | R | armadura base das lajes |
| K1.13.2.1-2 | Quando definida, é sempre colaborante; aumentada se o cálculo exigir (flexão, armadura comprimida ou taxas mínimas configuradas). | Falta | R | armadura base colaborante |
| K1.13.2.1-3 | Detalhada: desenhada com os reforços, cortes e emendas, com quantitativo e comprimentos de corte. | Falta | R | detalhamento da armadura base |
| K1.13.2.1-4 | Não detalhada: só diâmetro e espaçamento indicados, sem desenho nem quantitativo; o usuário completa planta e quantitativos. | Falta | R | armadura base não detalhada |
| | **1.13.2.2 Reforço longitudinal** | | | |
| K1.13.2.2-1 | Em cada nó da malha conhecem-se os momentos fletores nas duas direções e o momento torçor. | Parcial | N | barras da grelha dão momentos por direção; torçor não usado |
| K1.13.2.2-2 | Método de Wood (inclui a torção) dá o momento de dimensionamento em cada direção de armadura, que em geral não coincide com as direções principais. | Falta | N | Wood-Armer |
| K1.13.2.2-3 | Distribuição transversal: cada nó com os vizinhos à esquerda e à direita numa faixa de 1 m; soma-se no nó o esforço próprio e o redistribuído. | Parcial | N | nós: momento da barra / largura da malha (0,5 m), sem média em 1 m |
| K1.13.2.2-4 | Área necessária superior e inferior por direção, por metro, dividindo pelo tamanho da malha (distância entre nós) para valor uniforme e comparável. | Feito | — | As por metro superior e inferior por direção (cm²/m) |
| K1.13.2.2-5 | Confere taxas mínimas por direção e por metro; reforço escolhido nas tabelas. | Feito | — | ρmín 0,15 % por direção (premissa a confirmar) |
| K1.13.2.2-6 | Ponto de corte = comprimento necessário + ancoragem líquida reduzida conforme a posição (I ou II) + decalagem do diagrama conforme d e a norma. | Falta | R | corte das barras das lajes |
| K1.13.2.2-7 | Diâmetros e espaçamentos máximos garantidos pelas tabelas, definidas por faixa de espessura da laje. | Falta | R | escolha de φ e espaçamento (NBR 6118 20.1) |
| K1.13.2.2-8 | Consideração da torção opcional, recomendada sempre. | Falta | N | torção no dimensionamento das lajes |
| | **1.13.2.3 Armadura predefinida** | | | |
| K1.13.2.3-1 | Armadura lançada pelo usuário (face, direção, diâmetro e comprimento livres), descontada do reforço na sua zona de influência; útil onde o esforço é conhecido, ex. sobre apoios. | Falta | R | armadura predefinida |
| K1.13.2.3-2 | Radiers: mesmo critério de armadura das lajes maciças. | Falta | FU | radier |
| | **1.13.2.4 Armadura transversal** | | | |
| K1.13.2.4-1 | Punção: verificação em superfícies paralelas às faces dos apoios (pilares, pilares-parede, vigas, paredes) à distância 0,5d. | Falta | N | punção em lajes (NBR 6118 19.5); só sapatas têm (`footings.ts`) |
| K1.13.2.4-2 | Punção tratada como verificação de tensão tangencial: tensões a partir dos cortantes dos nós vizinhos, interpoladas linearmente nos pontos do perímetro. | Falta | N | tensões de punção no perímetro |
| K1.13.2.4-3 | O manual registra que a abordagem é geral e difere das normas (fórmulas simplificadas com normal e momento desequilibrado). | Fora | — | comentário do manual |
| K1.13.2.4-4 | Tensão máxima de punção excedida → linha vermelha; aumentar espessura ou resistência do concreto. | Falta | R | marcação de punção excedida |
| K1.13.2.4-5 | Tensão sem armadura excedida → armadura transversal indicada (número de barras e diâmetro) na forma de grampos verticais, com espaçamento conforme a quantidade num dado comprimento. | Falta | N | armadura de punção |
| K1.13.2.4-6 | Disposição dos grampos pelo usuário, com espaçamento ≤ 0,75d e entre as armaduras superior e inferior. | Falta | R | disposição dos grampos |
| K1.13.2.4-7 | Junto a vigas (chatas ou altas), as tensões tangenciais vão para os estribos das vigas; na laje só se calculam tensões em superfícies paralelas às faces das vigas. | Fora | — | critério interno |
| K1.13.2.4-8 | Cortante: a partir do perímetro de punção e em superfícies paralelas a cada 0,75d, verifica toda a laje até esgotar as superfícies que irradiam do apoio. | Falta | N | cortante em lajes (NBR 6118 19.4) |
| K1.13.2.4-9 | Armadura de cortante indicada (número e diâmetro) com o mesmo tipo usado na punção. | Falta | N | armadura de cortante em lajes |
| K1.13.2.4-10 | Falha de cortante → linha vermelha; aumentar espessura, dimensão do apoio ou resistência do concreto. | Falta | R | marcação de cortante excedido |
| K1.13.2.4-11 | Radiers: mesmas regras das lajes maciças. | Falta | FU | radier |
| K1.13.2.4-12 | Uniformização: linhas ou retângulos em qualquer direção, face superior ou inferior, definidos antes ou depois do cálculo, igualam a armadura ao máximo da zona (taxa e comprimento). | Falta | R | uniformização por zonas |
| K1.13.2.4-13 | Opção de uniformização automática sobre pilares, em faixas adjacentes a pilares indicados. | Falta | R | uniformização sobre pilares |
| K1.13.2.4-14 | Linhas de dobra (definidas antes do cálculo, pelas direções de apoio): tratadas como pontos de negativo máximo e locais preferenciais de emenda da armadura inferior. | Falta | R | linhas de dobra |
| K1.13.2.4-15 | Comprimento dos reforços negativos por porcentagens mínimas do vão entre linhas de dobra; emendas dos positivos nessas linhas quando possível. | Falta | R | comprimentos de negativos |
| K1.13.2.4-16 | Edição final de diâmetro e espaçamento dos reforços e dos ganchos superiores e inferiores. | Falta | R | edição de barras |
| K1.13.2.4-17 | Ancoragem na laje medida a partir da face do apoio; com vigas largas, conferir se a barra atravessa a viga e alongar a ancoragem se necessário. | Falta | R | ancoragem a partir da face |
| K1.13.2.4-18 | Opção: armadura média uniforme por direção em lajes retangulares apoiadas em vigas. | Falta | R | armadura média em lajes retangulares |
| | **1.13.3 Lajes nervuradas (págs. 94–95)** | | | |
| K1.13.3-1 | Critérios iguais aos das lajes maciças, salvo as diferenças abaixo. | Falta | E | lajes nervuradas |
| K1.13.3.1-1 | Armadura base pode distinguir zona maciça (ábaco) e zona aliviada. | Falta | E | lajes nervuradas (armadura base) |
| K1.13.3.1-2 | Ábaco: padrão de 2 barras (da tabela) de borda a borda do ábaco, entre eixos de nervuras; sempre colaborante. | Falta | E | ábacos |
| K1.13.3.1-3 | Limitação: a armadura base do ábaco não é desenhada nem quantificada; o projetista detalha à parte. | Falta | E | ábacos (detalhe) |
| K1.13.3.1-4 | Nervuras: armadura base não considerada por padrão; ativada por direção; tabelas próprias combinam base e reforço na nervura. | Falta | E | nervuras (armadura base) |
| K1.13.3.1-5 | Armadura base das nervuras detalhada (opção) → desenhada e medida; senão só descrição geral na listagem. | Falta | E | nervuras (detalhe) |
| K1.13.3.2-1 | Reforço longitudinal: mesmos critérios das maciças, concentrado nas nervuras; as envoltórias dos elementos adjacentes a cada nervura são agrupadas antes. | Falta | E | nervuras (reforço) |
| | **1.13.4 Armadura transversal das nervuradas (pág. 95)** | | | |
| K1.13.4-1 | Punção nos ábacos com a mesma análise da laje maciça. | Falta | E | punção nos ábacos |
| K1.13.4-2 | Nervuras da zona aliviada: cortante verificado a cada 0,75d; se necessário, barras verticais (diâmetro e espaçamento) desenhadas e visíveis em tela. | Falta | E | cortante nas nervuras |
| K1.13.4-3 | Armadura de punção distribuída localmente: revisar e uniformizar para facilitar a obra; recomenda biblioteca de detalhes. | Fora | — | recomendação do manual |
| K1.13.4.1-1 | Uniformização igual à das maciças, concentrando a armadura nas nervuras indicadas. | Falta | E | uniformização nas nervuras |

## 1.14 Flechas de vigas (págs. 95–97)

| Item | Critério / funcionalidade | Situação | Frente | Statikos |
|---|---|---|---|---|
| | **1.14 Flechas de vigas (págs. 95–97)** | | | |
| K1.14-1 | Limites opcionais: flecha instantânea (peso próprio, variável, total), total a longo prazo e ativa. | Parcial | N | flecha de vigas só no Pórtico 2D (L/250; após alvenaria ℓ/500 e 10 mm) |
| K1.14-2 | Cada limite: relativo L/xxx, L/xxx + xx cm, ou absoluto em cm. | Parcial | N | limites fixos da Tabela 13.3, não configuráveis |
| K1.14-3 | Limites dependem da norma; o usuário define os que considera relevantes. | Parcial | N | limites da NBR 6118 13.3, sem escolha do usuário |
| K1.14-4 | Usuais: flecha ativa e total a longo prazo. | Parcial | N | total e após alvenaria no Pórtico 2D; lajes só total |
| K1.14-5 | Coeficientes por processo construtivo, para carga permanente e variável, multiplicam as flechas instantâneas para obter as diferidas; padrões nas opções gerais. | Parcial | N | αf por t0 editável no Pórtico 2D; edifício 1,32 fixo |
| K1.14-6 | Flecha total de cada caso = instantânea + diferida. | Feito | — | total = imediata × (1 + αf) |
| K1.14-7 | Método: dupla integração das curvaturas numa série de pontos, com inércia bruta, homogeneizada, fissurada e rotações por caso de carga. | Parcial | N | Pórtico 2D: Branson com o Ma máximo, sem integrar curvaturas |
| K1.14-8 | Esforços e deslocamentos por caso com módulo secante do concreto; correções (clima, cura etc.) pelos coeficientes do processo construtivo, nas flechas instantâneas e diferidas. | Parcial | N | Ecs; correções só por αf e t0 |
| K1.14-9 | Flecha ativa = instantânea + diferida de permanentes e variáveis após a execução das paredes: fA = αg·fg + αq·fq (αg, αq coeficientes de carga permanente e variável). | Parcial | N | nós: após alvenaria ≈ αf·f0 (a confirmar); manual: αg·fg + αq·fq |
| K1.14-10 | αg e αq variam com as frações de carga definidas como permanentes/variáveis e os coeficientes instantâneo/diferido. | Falta | N | frações de carga por etapa |
| K1.14-11 | Flecha total a longo prazo = ativa + a parcela ocorrida até a execução do elemento danificável (paredes). | Parcial | N | total = ativa + anterior: no Pórtico 2D de forma aproximada |
| K1.14-12 | Valores padrão do programa são indicativos (condições favoráveis usuais); processo, umidade, temperatura, cura, desforma e idade de carregamento podem dobrar ou reduzir à metade a flecha. | Fora | — | comentário do manual |

## 1.15 Deformações de lajes e fundações (págs. 97–111)

| Item | Critério / funcionalidade | Situação | Frente | Statikos |
|---|---|---|---|---|
| | **1.15 Deformações de lajes (págs. 97–111)** | | | |
| | **1.15.1 Lajes de vigotas (pág. 97)** | | | |
| K1.15.1-1 | Lajes aliviadas e de vigotas seguem as regras das vigas, com opções independentes de processo construtivo por tipo de laje. | Parcial | N | treliçadas: flecha elástica × (1 + αf), igual à maciça |
| K1.15.1-2 | Pré-fabricados: rigidez das fichas técnicas; demais: inércias equivalentes calculadas. | Parcial | E | seção T do catálogo; sem ficha do fabricante |
| | **1.15.2 Lajes mistas (pág. 97)** | | | |
| K1.15.2-1 | Remetidas ao capítulo de lajes mistas. | Fora | — | lajes mistas |
| | **1.15.3 Lajes maciças e nervuradas (págs. 97–98)** | | | |
| K1.15.3-1 | Saída: deslocamentos de cada caso simples (permanente/peso próprio, variável, vento, sismo) em cada nó da malha de todos os pavimentos; máximo por caso e por pano. | Parcial | R | flecha máxima por laje e por pavimento; sem deslocamento por nó, caso e vento |
| K1.15.3-2 | Flecha ativa avaliada pelo projetista, com os coeficientes de fluência que julgar, a partir das flechas instantâneas. | Parcial | N | nós: fator fixo (1 + αf) = 2,32 automático; manual: a critério do projetista |
| K1.15.3-3 | Deslocamentos verticais são absolutos (incluem o do apoio); a flecha é relativa aos apoios extremos ou pontos de inflexão → subtrair o deslocamento dos apoios; efeito maior nos pavimentos altos (encurtamento elástico dos pilares). | Parcial | N | nós: deslocamento total (inclui vigas), não relativo aos apoios |
| K1.15.3-4 | Estimativa prática: deslocamentos de peso próprio + uso × fator de 1,5 a 4, conforme processo construtivo e tipo de flecha. | Parcial | N | nós: × 2,32 fixo; manual: 1,5 a 4 |
| K1.15.3-5 | Flecha relativa L/xxx: usar o menor dos vãos adjacentes ao ponto de máximo deslocamento absoluto. | Feito | — | limite pelo menor vão da laje (L/250) |
| | **1.15.4 Flecha entre dois pontos (págs. 98–111)** | | | |
| K1.15.4-1 | Ferramenta: dois pontos em laje maciça ou nervurada; linha entre eles e perfil dos deslocamentos verticais ao longo dela, por caso, por combinação e pela combinação gravitacional mais desfavorável (peso próprio + permanentes + variável). | Falta | V | flecha entre dois pontos (perfil de deslocamentos) |
| K1.15.4-2 | Leitura: convexidade nos apoios e concavidade nos vãos; o máximo absoluto costuma estar na maior concavidade. | Fora | — | explicação do manual |
| K1.15.4-3 | Direção da flecha relativa máxima: menor distância entre 2 pontos do contorno da concavidade; sugere marcar pontos mais afastados primeiro para achar o contorno. | Fora | — | dica de uso |
| K1.15.4-4 | Flecha medida em relação à reta pelos pontos inicial e final (secante) ou à tangente no ponto inicial (opção). | Falta | V | referência pela secante ou pela tangente |
| K1.15.4-5 | Saídas: vão L, flecha absoluta, flecha relativa a L (secante) ou a 2L (tangente). | Falta | V | saídas da ferramenta (vão, flecha, relação) |
| K1.15.4-6 | Combinação usada por padrão: a mais desfavorável de peso próprio + permanentes + variável entre as combinações de deslocamento do projeto, só casos gravitacionais; também por caso ou combinação escolhidos. | Falta | V | combinação gravitacional padrão da ferramenta |
| K1.15.4-7 | Fator de amplificação de deslocamentos, padrão 2,5, multiplica os deslocamentos dos casos; deve englobar desforma, processo construtivo, efeitos térmicos e reológicos (fluência, retração). | Parcial | N | nós: 1 + αf = 2,32 fixo, sem fissuração; manual: 2,5 editável |
| K1.15.4-8 | Faixa citada para o fator: 2,5 a 3,0 conforme o processo construtivo. | Fora | — | faixa citada pelo manual |
| K1.15.4-9 | Exemplo, dados: vão médio 6,50 m, vão extremo; momentos aproximados pl²/10 (negativo interno), pl²/17 (positivo), pl²/30 (negativo externo); paredes 1 kN/m² aos 60 dias; revestimento 1 kN/m² aos 120 dias; variável 2 kN/m²; HA-25 e B500; condições médias de temperatura e umidade. | Fora | — | exemplo numérico do manual |
| K1.15.4-10 | Caso 1, maciça h = 26 cm: L/h = 25 > 23 (EHE-08, Tab. 50.2.2.1.a, pouco armada) → flecha a verificar. | Fora | — | critério L/h da EHE-08 |
| K1.15.4-11 | Faixa de 1 m com distribuição uniforme (simplificação); Ig = b·h³/12 = 146 466,67 cm⁴ é a inércia do modelo. | Fora | — | exemplo numérico |
| K1.15.4-12 | Cálculo: 1,35·8,5 + 1,5·2 = 14,475 kN/m²; fator 0,76 na faixa de apoio e 0,6 na central; Md− esq. 93,02 kN·m/m (As 10,2 cm²/m), Md+ 43,16 (4,8 cm²/m), Md− dir. 31 (3,4 cm²/m). | Fora | — | exemplo numérico |
| K1.15.4-13 | Momento de fissuração: Mcr = fct,m,fl·Wb, com fct,m,fl = máx[(1,6 − h/1000)·fct,m; fct,m] (h em mm) e fct,m = 0,3·fck^(2/3); no exemplo 2,565 → 3,437 MPa, Wb = 11 266 667 mm³, Mcr = 38,72 kN·m. | Parcial | N | Mr da NBR 6118 17.3.1 no Pórtico 2D (`bransonRatio`); lajes do edifício não |
| K1.15.4-14 | Momentos de serviço com carga total 10,5 kN/m²: esq. 67,4 > Mcr (fissura), centro 31,3 < Mcr, dir. 22,48 < Mcr. | Fora | — | exemplo numérico |
| K1.15.4-15 | Inércia equivalente de Branson: Ie = (Mcr/Ma)³·Ig + [1 − (Mcr/Ma)³]·Icr. | Parcial | N | Branson (NBR 6118 17.3.2.1.1) no Pórtico 2D; lajes do edifício não |
| K1.15.4-16 | Inércia média do vão: Ie = [(Ie,esq + Ie,dir)/2 + Ie,centro]/2; Ie,esq = 51 744 cm⁴ (Icr = 29 584), dir. = centro = Ig → 122 768 cm⁴ = 0,84·Ig. | Parcial | N | Pórtico 2D: Ie com o Ma máximo; sem média apoios/vão |
| K1.15.4-17 | A favor da segurança adota Ie ≈ 0,66·Ig → fator de fissuração Ke = 1/0,66 ≈ 1,50 aplicado à flecha elástica do programa. | Fora | — | exemplo numérico |
| K1.15.4-18 | Flecha diferida pela EHE-08 (análoga ao ACI-08): λ = ξ/(1 + 50ρ'), ρ' = taxa média de armadura comprimida; com malhas de 1 ‰ (ρ' = 0,001) → λ = 0,95·ξ (reconstruída). | Parcial | N | αf = Δξ/(1 + 50ρ′) no Pórtico 2D; lajes ρ′ = 0 e t0 = 1 mês fixos |
| K1.15.4-19 | ξ por duração: ≥ 5 anos 2,0; 1 ano 1,4; 6 meses 1,2; 1 mês 0,7; 2 semanas 0,5 (o exemplo usa também 0,8 aos 60 dias e 1,0 aos 120 dias). | Parcial | N | ξ(t) da NBR com t0 editável no Pórtico 2D; edifício fixo |
| K1.15.4-20 | Processo: peso próprio 6,5 kN/m² desformado aos 28 dias (ξ = 2 − 0,7 = 1,3); paredes 1,0 aos 60 dias (1,2); revestimento 1,0 aos 120 dias (1,0); uso só a parcela quase permanente, ψ2 = 0,3 (residencial) → 0,6 kN/m², após 1 ano (ξ = 0,6). | Falta | N | ξ ponderado por etapas de carga (NBR 6118 17.3.2.1.2) |
| K1.15.4-21 | ξ médio ponderado pelas cargas = 11,01/10,5 ≈ 1,05 → λ ≈ 1,00; δinst = Ke·δi = 1,5·δi; δdif = 1,00·δinst; δtotal = 3,00·δi (valor do fator a usar). | Falta | N | fator total por etapas |
| K1.15.4-22 | Flecha ativa (após as paredes): exclui a instantânea do peso próprio e a diferida dele até 60 dias (ξ = 2 − 0,8 = 1,2); ξ médio 0,987 → λ = 0,93; fração instantânea sem peso próprio 4/10,5 = 0,38; δativa = (0,38·1,5 + 0,93·1,5)·δi = 1,965·δi. | Parcial | N | Pórtico 2D: parcela após alvenaria ≈ αf·f0; lajes do edifício não |
| K1.15.4-23 | Conclusão maciça: ativa ≈ 2,0× e total ≈ 3,0× a flecha elástica com seção bruta. | Fora | — | conclusão do exemplo (ver divergências) |
| K1.15.4-24 | Caso 2, nervurada com caixões perdidos: Ig da zona aliviada 61 567 cm⁴; do ábaco (maciça 30 cm × 82 cm) 184 500 cm⁴; média ao longo do vão 123 033,5 cm⁴. | Fora | — | exemplo numérico |
| K1.15.4-25 | Hipótese de modelagem: a malha de todo o pano nervurado (zona aliviada e ábaco) usa uma inércia única, igual à metade da zona maciça (no exemplo 92 250 cm⁴), para os deslocamentos elásticos. | Falta | E | nervuradas: inércia única na malha |
| K1.15.4-26 | Mcr: ábaco (0,82 m) 40,96 kN·m no negativo; zona aliviada 10,27 kN·m no positivo. | Fora | — | exemplo numérico |
| K1.15.4-27 | Cargas: peso próprio 4,6 kN/m² (só zona aliviada, o ábaco pouco influi), paredes 1,0, revestimento 1,0, uso 2,0 → 8,6 kN/m². | Fora | — | exemplo numérico |
| K1.15.4-28 | Momentos na nervura: esq. 45,2 ≥ 40,96 (fissura pouco), dir. 15,1 < 40,96, vão 20,1 > 10,27 (fissura no positivo). | Fora | — | exemplo numérico |
| K1.15.4-29 | Ie,dir ≈ Ig do ábaco; Ie,esq = 145 530 cm⁴; Ie médio 98 380 > inércia do modelo 92 250 → sem correção; por segurança Ie = 0,8·Imodelo → Ke = 1,25. | Fora | — | exemplo numérico |
| K1.15.4-30 | ρ' = 0 a favor da segurança → λ = ξ; ξ médio total ≈ 1 → δtotal = 2,5·δi; ativa: ξ médio 0,94 e fração sem peso próprio 4/8,6 ≈ 0,47 → δativa ≈ 1,75·δi. | Fora | — | exemplo numérico |
| K1.15.4-31 | Os fatores valem para casos usuais (vãos, espessuras, cargas, processo, ambiente, desforma, idade de carregamento); mudando as condições, corrigir. | Fora | — | comentário do manual |
| K1.15.4-32 | Conforto: basta a flecha do caso de carga variável. | Falta | N | aceitação sensorial (NBR 6118 Tab. 13.3, L/350 da variável) |
| K1.15.4-33 | Quadro-resumo do fator de amplificação: integridade → flecha ativa, 2,0 maciça / 1,75 nervurada, combinação gravitacional mais desfavorável; estética → total a longo prazo, 3,00 / 2,50, mesma combinação; conforto → instantânea da variável, 1,50 / 1,25, caso de carga variável. | Parcial | N | lajes: só total (× 2,32, L/250); faltam ativa e conforto |
| | **1.15.5 Elementos de fundação (pág. 111)** | | | |
| K1.15.5-1 | Remete à parte do manual sobre sapatas corridas e isoladas, blocos sobre estacas, vigas de equilíbrio e vigas de travamento. | Parcial | FU | sapatas, blocos e tubulões no módulo Fundações; corridas e vigas de equilíbrio faltam |
| K1.15.5-2 | Fim do texto: remete à versão completa em inglês (learning.cype.com, CYPECAD calculations manual). | Fora | — | remissão ao manual em inglês |
