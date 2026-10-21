# Análise do motor 3D do Statikos (e lições da vista do FreeCAD)

Somente leitura. Nada foi alterado em /home/user/new-toll (git status limpo). Do FreeCAD (LGPL-2.1+) só foram lidos princípios; nenhum trecho foi copiado e nada abaixo deve ser portado linha a linha.

Data: 21/10/2026. Medições em Node 22 (V8) numa máquina de 4 vCPU compartilhada; o tempo de GPU não é mensurável sem navegador, então os números de GPU são estimativas por contagem de triângulos e bytes. Os tempos de CPU valem para o V8 do navegador com ordem de grandeza igual (o desktop costuma ser 1,5 a 3 vezes mais rápido que este sandbox).

## 1. Nosso motor

### 1.1 Como é montado (leitura do código)

Núcleo puro, `src/core/vista3d/`:
- `registro.ts`: `Objeto3D` = um elemento (um lance de pilar, uma viga, uma laje, uma fundação) com `pos`, `idx` e `linhas` em `number[]` (doubles de JS), mais metadados (id, elemento, pavimento, descrição, volume). `GERADORES_3D` é o registro de geradores por tipo.
- `cena.ts`: `construirCena(b, opcoes)` chama cada gerador (pilares, vigas, lajes, fundações), junta tudo, filtra por `tipos` e calcula limites e contagens. Tudo síncrono, no thread principal, e refeito do zero.
- `pilares3d.ts`, `vigas3d.ts`, `lajes3d.ts`, `fundacoes3d.ts`: cada um percorre pavimentos e elementos e gera um prisma por lance/viga/laje com `Malha.extrudar` (`malha.ts`). Os vértices não são compartilhados entre faces (24 vértices e 12 triângulos por caixa), o que dá normais planas sem custo. Lajes usam `triangular.ts` (ear clipping com ponte para furos).
- `lajes3d.ts` chama `panosDoGrupo(b, grupo)` (extração de faces planares) uma vez por pavimento, mesmo quando todos os pavimentos do grupo são idênticos.
- `camera.ts` (órbita, enquadramento, caminhar) e `isometrico.ts` (fallback SVG por algoritmo do pintor, sem `maxFaces` quando chamado pela aba) são puros.

Aplicação, `src/app/vista3d/`:
- `carregarThree.ts`: three 0.186.1 vendorizado, `import()` sob demanda; sem ele ou sem WebGL cai no SVG.
- `renderizador.ts` (`RenderizadorCena`): converte a `Cena3D` em objetos three.js. Uma `BufferGeometry` mesclada por tipo (pilar, viga, laje, fundação...) mais uma para panos pendentes, com tabela de faixas `{ini, fim, obj}` por elemento. Todas as arestas viram um único `LineSegments`. Materiais: um `MeshLambertMaterial` por tipo (compartilhado por todos os elementos do tipo). Renderização sob demanda (`requestAnimationFrame` só quando algo muda).
- Seleção: `pick()` usa `Raycaster.intersectObjects` nas malhas mescladas e converte `faceIndex` em objeto por busca binária na tabela de faixas. Realce (seleção e hover): `refazerRealce()` cria uma malha nova com a cópia dos triângulos dos objetos escolhidos, sobreposta com `polygonOffset`.
- `Vista3D.tsx`: `construirCena` dentro de `useMemo` com dependências `[b, rev, opcoes, dim?.fundacoes, dim?.vigasFundacao]`; `opcoes` depende dos filtros de tipo e do escopo. Qualquer mudança nessas dependências chama `definirCena`, que descarta tudo e remonta tudo.

Equivalência com o FreeCAD: o `renderizador.ts` já é o análogo do `SoBrepFaceSet` (faces de todas as partes em um buffer, tabela de partes, realce por sobreposição de subconjunto). Isso está certo e não precisa ser refeito.

### 1.2 Medições (scripts em `.../scratchpad/medir3d/`)

Plantas: P1 = 3x2 vãos (12 pilares, 7 vigas, 6 lajes; o edifício dos testes); P2 = 6x4 (35 pilares, 12 vigas, 24 lajes); P3 = 8x5 com uma viga por vão (54 pilares, 93 vigas, 40 lajes); P4 = 12x8 com uma viga por vão (117 pilares, 212 vigas, 96 lajes). Lajes maciças de 12 cm, fundações fora (não calculadas). N = número de pavimentos (10, 30, 60). Mediana de 3 a 5 execuções; "ciclo" = o que acontece a cada comando do usuário (`construirCena` + `definirCena` com o `RenderizadorCena` real, com o WebGLRenderer trocado por um stub; three.js real para geometria, normais e raycast).

| Cenário | Objetos | Triângulos | Vértices | Segm. de aresta | construirCena | definirCena | Ciclo (edição) | Pick (mediana) | Buffers GPU* | Arrays JS** |
|---|---|---|---|---|---|---|---|---|---|---|
| P1 10 | 224 | 2,7 k | 5,4 k | 2,7 k | 22 ms | 12 ms | 18 ms | 0,5 ms | 0,3 MB | 0,3 MB |
| P1 30 | 724 | 8,7 k | 17 k | 8,7 k | 33 ms | 30 ms | 41 ms | 0,7 ms | 0,8 MB | 1 MB |
| P1 60 | 1.474 | 17,7 k | 35 k | 17,7 k | 48 ms | 39 ms | 109 ms | 1,2 ms | 1,7 MB | 2 MB |
| P2 10 | 638 | 7,7 k | 15 k | 7,7 k | 16 ms | 17 ms | 49 ms | 1,3 ms | 0,7 MB | 0,9 MB |
| P2 30 | 2.058 | 24,7 k | 49 k | 24,7 k | 51 ms | 39 ms | 131 ms | 1,7 ms | 2,4 MB | 2,8 MB |
| P2 60 | 4.188 | 50 k | 100 k | 50 k | 126 ms | 92 ms | 259 ms | 4,0 ms | 4,8 MB | 5,8 MB |
| P3 10 | 1.604 | 19 k | 38 k | 19 k | 92 ms | 50 ms | 77 ms | 1,8 ms | 1,8 MB | 2,2 MB |
| P3 30 | 5.344 | 64 k | 128 k | 64 k | 412 ms | 107 ms | 356 ms | 6,4 ms | 6,1 MB | 7,3 MB |
| P3 60 | 10.954 | 131 k | 263 k | 131 k | 499 ms | 179 ms | 715 ms | 11,7 ms | 12,5 MB | 15 MB |
| P4 10 | 3.634 | 44 k | 87 k | 44 k | 256 ms | 36 ms | 374 ms | 4,3 ms | 4,2 MB | 5 MB |
| P4 30 | 12.134 | 146 k | 291 k | 146 k | 0,92–0,96 s | 111 ms | 1,1 s | 14,5 ms | 13,9 MB | 16,7 MB |
| P4 60 | 24.884 | 299 k | 597 k | 299 k | 1,8–2,7 s | 581 ms | 2,3 s | 28,8 ms (máx. 60) | 28,5 MB | 34 MB |

\* posição + normal + uv (32 B/vértice) + índices (12 B/triângulo) + linhas (24 B/segmento), contado pelo script.
\** número de doubles de JS x 8 B. A memória retida real do heap é cerca de 1,7x isso (medido: P2/60 = 10 MB para 6 MB de elementos), então P4/60 ficaria em torno de 55 a 60 MB de heap JS, mais cerca de 28 MB de cópias Float32 mantidas pelo three e 28 MB na GPU.

Observações das medições:
- Escala linear com o número de objetos: cerca de 70 µs por objeto em `construirCena` e 25 µs por objeto em `definirCena`. A extrusão em si é barata (1.000 prismas simples em 11 ms); o custo é distribuído.
- Em `lajes3d.ts` o `panosDoGrupo` custa cerca de 16 ms por chamada em P4 e é chamado uma vez por pavimento: 60 x 16 ms = cerca de 1 s dos 1,8 s de `construirCena` em P4/60 (gerador de lajes: 1.466 ms; sem a repetição seria cerca de 450 ms). É a maior perda isolada e a mais barata de corrigir.
- Draw calls estimados com lajes lançadas: 4 filhos na raiz (3 malhas mescladas + 1 `LineSegments`), mais até 2 malhas de realce. Independe de N. Excelente.
- Draw calls estimados com panos "a definir" (fase de lançamento, ainda sem lajes): cada "?" vira um `Sprite` com `SpriteMaterial` próprio. P3 com 10/30/60 pavimentos sem lajes: 325 / 1.125 / 2.325 filhos na raiz (medido), ou seja, 2.325 draw calls e 2.325 materiais por quadro. É o pior caso real do motor, justamente quando o usuário está lançando o modelo.
- Treliçada em detalhe alto (P3 com lajes treliçadas H12): as vigotas somam 3,8 k / 13 k / 28 k segmentos para 10/30/60 pavimentos e o tempo de `construirCena` praticamente não muda (78 / 294 / 583 ms). Sem problema.
- Seleção e realce: `destacar` custa 0,2 a 2,6 ms; selecionar muitos elementos (todos os pilares) 36 a 118 ms. O hover completo (pick + destacar) é dominado pelo raycast: 6,7 / 13 / 15 / 29 ms em P3/30, P3/60, P4/30, P4/60. Com o limite de um pick a cada 60 ms em `passar`, o hover em P4/60 consome cerca de metade do thread principal enquanto o mouse se move.
- Fallback SVG (`isometricoSvg`): P3/30 286 ms e 3,5 MB; P3/60 440 ms, 65,7 k faces e 7,2 MB de string; P4/60 1,0 s, 149 k faces e 16,4 MB. A aba não passa `maxFaces` e recalcula tudo a cada tique do controle de azimute/elevação, depois injeta por `dangerouslySetInnerHTML` (dezenas de milhares de `<path>` no DOM; o custo de DOM não foi medido).

### 1.3 Avaliação por tópico

- Um Mesh por elemento? Não. Uma malha mesclada por tipo, com tabela de faixas. Bom.
- Instancing? Não há. Pavimentos repetidos regeram e regravam geometria idêntica (só muda o z); 60 pavimentos do mesmo grupo = 60 cópias. Não é gargalo de GPU (28 MB em P4/60), mas é o motivo de o `construirCena` e o `definirCena` crescerem com N.
- Materiais: compartilhados por tipo. Exceção: sprites dos "?" (um material por sprite) e a textura dos "?" nunca é descartada (`limpar()` não faz `dispose` de `map`), então cada `definirCena` com panos pendentes vaza uma `CanvasTexture`.
- Índices: `Uint32` com vértices duplicados por face (24 por caixa). Funciona, mas desperdiça 3 vezes mais vértices do que uma caixa indexada; sem urgência.
- Normais: `computeVertexNormals` na mescla inteira a cada `definirCena` (parte dos 581 ms em P4/60). As normais das caixas são conhecidas na geração.
- Seleção por raycast: O(N triângulos) por pick (o three não tem BVH nativo); a busca de parte é binária (melhor que a linear do FreeCAD). Em 300 k triângulos, 29 ms.
- Atualização incremental: inexistente. Cada comando, mesmo de carga, opção ou armadura, incrementa `rev` (`store.ts`: `rev: s.rev + Math.random()`), invalida o `useMemo` e remonta a cena. Idem a cada novo `dim` com fundações.
- Troca de filtros: remonta tudo (ciclo da tabela, de 18 ms a 2,3 s), embora já exista uma malha por tipo e bastasse `mesh.visible`. Troca de escopo (pavimento/grupo/intervalo) idem, mais reenquadramento da câmera.
- Aba 3D: ao sair e voltar, desmonta o WebGLRenderer (contexto novo, shaders compilados de novo) e remonta a cena.
- Descarte (`dispose`): geometrias e materiais corretos; vaza a textura dos rótulos; o realce é descartado corretamente.
- LOD: nenhum. Todas as arestas (um segmento por aresta de cada prisma) são sempre desenhadas, inclusive durante a órbita. Lajes com 40% de transparência (padrão) e `depthWrite=false`: com 60 lajes empilhadas há cerca de 60 camadas de mistura por pixel na vista de cima (custo de preenchimento, relevante em GPU integrada e em celular; não medido).
- Culling: só o frustum culling por objeto do three, e como há 3 malhas gigantes com uma esfera envolvente cada, nunca corta nada. Em órbita externa isso não importa (tudo está na tela); no modo caminhar, importa.
- Thread: tudo no principal. Montar a cena (0,1 a 2,7 s) bloqueia o React; o cálculo estrutural já roda em worker, a cena não.
- GC: cada elemento aloca 3 `number[]` por push; picos de cerca de 60 MB de heap em P4/60 e dezenas de milhares de arrays pequenos.

## 2. FreeCAD: o que a arquitetura de visualização ensina

Clone esparso ampliado (src/Gui, src/Mod/Part/Gui, src/Mod/Mesh/Gui, src/3rdParty, src/Mod/Part/App). A pasta `src/3rdParty/coin` vem vazia (submódulo), então o grafo de cena em si (Coin3D) não está disponível; o que vale está nas classes do FreeCAD que usam o Coin.

1. Um nó para todas as faces, um para todas as arestas, um para todos os vértices (`src/Mod/Part/Gui/SoBrepFaceSet.h` e `.cpp`, `SoBrepEdgeSet.h`, `SoBrepPointSet.h`). O comentário do cabeçalho conta o motivo: antes cada subelemento tinha um nó próprio e o custo era a travessia do grafo, não o OpenGL; fundir em um nó com `partIndex` (quantos triângulos tem cada parte) resolveu. É exatamente o que o nosso `renderizador.ts` faz com a tabela de faixas.
2. Seleção e realce por subelemento sem tocar na geometria (`SoBrepFaceSet.cpp`: `renderHighlight`, `renderSelection`, `overrideMaterialBinding`; `Gui/Selection/SoFCSelectionContext.h`): o estado é um contexto leve (`highlightIndex` único, `selectionIndex` em conjunto, "selecionar tudo" = -1, cores); o desenho monta um índice só com as partes escolhidas e as redesenha por cima, ou, para cor por parte, remapeia um índice de material por face. `createTriangleDetail` converte triângulo atingido em parte somando contagens (linear; a nossa busca binária é melhor). Para arestas, `SoBrepEdgeSet::setEdgeMapping` guarda a correspondência entre polilinha desenhada e aresta topológica (arestas sem polilinha são puladas).
3. Seleção por raiz, com atalho para o objeto inteiro (`Gui/Selection/SoFCUnifiedSelection.cpp`, `SoFCSelectionRoot::doActionPrivate`): quando se seleciona ou pré-seleciona um objeto inteiro guarda-se um contexto na raiz e a travessia é interrompida ali; o comentário diz que isso melhora muito o desempenho em grupos grandes. `SelectStyles` (`Full`, `Box`, `PassThrough`) e `SoFCSelectionRoot::renderBBox` permitem realçar com a caixa delimitadora em vez da geometria completa.
4. Pré-seleção (hover) pode ser desligada (`SoFCUnifiedSelection::handleEvent`, modos AUTO/ON/OFF): o comentário diz que, para conjuntos enormes, procurar o ponto sob o cursor a cada movimento pode travar o sistema, então só se faz o pick quando há pré-seleção ligada. É uma válvula de segurança, não uma otimização.
5. Cache de renderização e VBO (`Gui/View3DInventorViewer.cpp`: `setRenderCache` AUTO/Distribuído/Desligado, que ajusta `renderCaching` e `boundingBoxCaching` dos separadores `SoFCSeparator` em `SoFCUnifiedSelection.cpp` ~L1309; `Gui/Application.cpp` ~L544 força VBO por `COIN_VBO`; `Gui/SoFCDB.cpp` registra `SoUpdateVBOAction`). `SoFCSelectionCounter::checkRenderCache` (`SoFCSelectionContext.cpp`) invalida o cache de um nó somente se ele tem seleção/pré-seleção ativa; o resto do desenho reaproveita listas de exibição/VBO. Ideia: o que não mudou não é reenviado à GPU nem reatravessado.
6. Tesselação sob demanda com tolerância relativa (`Mod/Part/Gui/ViewProviderExt.cpp`, `setupCoinGeometry`, ~L1050-1180; `Mod/Part/App/Tools.cpp` L895-907): deflexão = (dx+dy+dz)/300 x desvio%, ou seja, relativa ao tamanho do objeto, com padrão 0,2% e 28,65° de deflexão angular (`MeshDeviation`, `MeshAngularDeflection`, L947-948), malha paralela (`InParallel`) e `AllowQualityDecrease`. É o LOD estático: qualidade é parâmetro do ViewProvider, não da geometria.
7. Não retesselar o que não mudou (`ViewProviderExt.cpp`, `updateVisual` ~L1514): se a forma é "parceira" da última renderizada e o visual não foi tocado, só reaplica materiais; `VisualTouched` + `forceUpdate` fazem objeto invisível adiar a tesselação até ficar visível (`onChanged`, L305-455). Ou seja, cache por identidade da forma e geração preguiçosa para o que está oculto.
8. Instâncias por compartilhamento de subgrafo (`Gui/ViewProviderLink.cpp`, `LinkView::setSize`, ~L1275-1310): cada elemento de um arranjo é uma transformação própria mais o mesmo subgrafo `pcLinkedRoot`; a geometria existe uma vez e é desenhada N vezes (com VBO/cache do separador). Equivale ao nosso `InstancedMesh` por pavimento.
9. Modo interativo (`Gui/View3DInventorViewer.cpp` ~L2846-2865, `interactionStartCB/FinishCB` com `SoFCInteractiveElement`; `Mod/Mesh/Gui/SoFCMeshObject.cpp` ~L642-690 e L805-830, `renderTriangleLimit`): durante a órbita, malhas com mais facetas que o limite são desenhadas como um subconjunto de pontos; ao soltar, redesenha completo. É o LOD dinâmico clássico.
10. Seleção por raio com raio de tolerância em pixels (`View3DInventorViewer.cpp` ~L1759-1761, `SoRayPickAction` + `setRadius`) e poda hierárquica pelas caixas delimitadoras em cache dos separadores (a mesma opção `boundingBoxCaching` do item 5). Dentro de uma malha grande a busca é linear, sem BVH no `SoBrepFaceSet`; para malhas do módulo Mesh existe uma grade uniforme de facetas (`SoFCMeshPickNode` em `Mod/Mesh/Gui/SoFCMeshObject.cpp` ~L364-420, `MeshFacetGrid` com célula de 5x o comprimento médio de aresta, reconstruída quando a malha muda).
11. Separação modelo/visual (`Gui/ViewProvider.h`: `pcRoot`, `pcModeSwitch` para modos de exibição; `Gui/ViewProviderDocumentObject.cpp`: `updateView` esconde o objeto durante a atualização "para acelerar"; `Gui/Document.cpp`: `slotChangedObject` roteia a mudança de uma propriedade somente ao ViewProvider daquele objeto). O objeto de modelo não conhece nada de visualização; cada ViewProvider guarda a sua subárvore e a atualiza só quando a sua propriedade muda.
12. Threads: não encontrei montagem do grafo de cena fora do thread da interface; o paralelismo está dentro da tesselação do OpenCASCADE (`InParallel`). O ganho de fazer isso em worker é nosso (JS não tem threads compartilhadas de grafo); a lição é manter o grafo mutável só em um thread e entregar buffers prontos.

O que o FreeCAD não faz e nós podemos: culling por andar, BVH, instancing real por GPU, atualização por diferença.

## 3. Conclusões

### 3.1 Veredito

- 10 pavimentos: leve. Em todas as plantas (até 117 pilares), `construirCena` 16 a 256 ms, ciclo de edição ≤ 374 ms, pick ≤ 4,3 ms, GPU ≤ 4,2 MB. Pode ficar como está; só vale o item de draw calls dos "?".
- 30 pavimentos: aceitável em plantas até ~54 pilares e ~90 vigas (P3: rebuild de 0,36 a 0,41 s por comando, pick 6 ms); em planta grande (P4) o rebuild passa de 1 s no thread principal a cada comando e o hover custa 15 ms. Perceptível. Com os panos pendentes sem laje, 1.125 draw calls.
- 60 pavimentos: a GPU aguenta (3 malhas e 1 linha, 300 k triângulos, 28 MB), mas a interatividade não: rebuild de 0,7 s (P3) a 2,3 s (P4) a cada comando, pick de 12 a 29 ms, SVG de fallback de 7 a 16 MB, e 2.325 draw calls na fase de lançamento (sem lajes). Precisa das técnicas 1 a 3 antes de ser prometido.

### 3.2 Gargalos prováveis, em ordem

1. Remontagem total a cada comando (inclusive os que não mexem na geometria). Maior causa de lentidão percebida, pois acontece sempre.
2. `construirCena` no thread principal, linear em N e sem reaproveitar pavimentos idênticos; `panosDoGrupo` repetido N vezes.
3. Draw calls dos "?" (centenas a milhares) e vazamento de textura.
4. Raycast linear no hover.
5. GC e memória por `number[]` (não é o limitante hoje, só em P4/60).
6. Fill rate das lajes transparentes empilhadas e das arestas durante a órbita (estimativa; medir no navegador).
7. Fallback SVG sem limite de faces.

### 3.3 Técnicas priorizadas

Esforço em dias de trabalho de um agente da classe indicada (tabela "Modelo e esforço por agente" do plano; nenhuma toca o núcleo numérico, então nenhuma exige Opus). Ganhos são estimados sobre as medições acima.

| # | Técnica | Ganho estimado | Esforço | Arquivos |
|---|---|---|---|---|
| 1 | Reconstruir a cena só quando a geometria muda: assinatura de geometria (pilares, vigas, lajes, pavimentos e resultado das fundações) no lugar de `rev`/`dim` nas dependências do `useMemo`; ou `revGeometria` no `Sessao` com flag `geometria` nos comandos | Elimina a maioria dos rebuilds (cargas, opções, armaduras, tabelas, pranchas, rearmar e cada novo `dim` não alteram a forma): de 0,1 a 2,3 s por comando para 0 | 0,5 a 1 dia, Sonnet | `src/app/vista3d/Vista3D.tsx`, novo `src/core/vista3d/assinatura.ts` (+ teste), possivelmente `src/core/commands/*` e `Sessao` |
| 2 | Cache de `panosDoGrupo` por grupo (uma chamada por grupo e não por pavimento) e, no mesmo passo, tirar `pavimentosOrdenados`/filtros de dentro dos laços | `construirCena` -45% em P4/60 (1,8 para ~0,9 s) e -30% em P3 | 0,25 dia, Haiku | `src/core/vista3d/lajes3d.ts` |
| 3 | Rótulos "?" em um objeto só (um `Points`/malha de quadrados com a mesma textura) e `dispose` da textura | Com panos pendentes: de 325 / 1.125 / 2.325 draw calls para 5; elimina o vazamento de `CanvasTexture` por rebuild | 0,25 a 0,5 dia, Haiku | `src/app/vista3d/renderizador.ts` (`definirCena`, `limpar`) |
| 4 | Filtros de tipo e escopo por visibilidade: construir a cena completa uma vez e dividir as malhas em partes por (tipo, pavimento), alternando `mesh.visible`; o frustum culling por andar vem de graça (esfera por parte) e é útil no modo caminhar | Troca de filtro/escopo de 0,02 a 2,3 s para < 1 ms; 60 pavimentos x 3 tipos = ~180 draw calls (aceitável) em troca de culling | 2 dias, Sonnet | `src/app/vista3d/renderizador.ts`, `Vista3D.tsx`, `vista3dStore.ts`, `src/core/vista3d/cena.ts` (separar "construir" de "filtrar"), `isometrico.ts` |
| 5 | Picking por caixas: guardar uma AABB por objeto (já existe a tabela de faixas), testar o raio contra as caixas e só então contra os triângulos dos candidatos; função pura em `core` (testável sem three). Alternativa com dependência nova (precisa de aceite): `three-mesh-bvh` (MIT). Outra: pick por cores (id) na GPU | Hover de 12 a 29 ms para < 1 ms em 130 a 300 k triângulos | 1 dia, Sonnet | novo `src/core/vista3d/pick.ts` (+ teste), `src/app/vista3d/renderizador.ts` (`pick`) |
| 6 | Montar a cena no worker com buffers transferíveis: `Objeto3D` passa a `Float32Array`/`Uint32Array` (tira o GC e metade da memória), pedido novo "cena3d" no worker de cálculo já existente (para não duplicar código no pacote), resposta com `postMessage(..., [buffers])`, normais planas calculadas na geração (sem `computeVertexNormals`) | Tira 0,1 a 2,7 s do thread de interface; `definirCena` -50% (P4/60: 581 para ~250 ms); memória JS -50% | 3 dias, Sonnet | `src/core/vista3d/malha.ts`, `registro.ts`, geradores, `cena.ts`, `src/app/edificio/calculo.worker.ts` e `store.ts` (ou módulo de pedido próprio), `renderizador.ts`, `isometrico.ts`, `desenhoMemorial.ts` |
| 7 | Modelos por grupo e repetição por pavimento: gerar a geometria de um grupo uma vez (assinatura = gerador + elemento + secão) e replicar com deslocamento em z; fase 2 opcional: `InstancedMesh` para pilares e vigas (id da instância dá o pavimento) | `construirCena` e memória proporcionais ao número de grupos distintos e não de pavimentos: P4/60 de ~1,8 s para ~0,3 s e de 28 para ~5 MB de GPU na fase 2 | 3 a 4 dias, Sonnet (fase 2 + 2 dias) | `pilares3d.ts`, `vigas3d.ts`, `lajes3d.ts`, `fundacoes3d.ts`, `registro.ts`, `cena.ts`, `renderizador.ts`, testes de volume e contagem |
| 8 | Atualização incremental por parte: com 4 e 7, comparar assinaturas por (tipo, grupo/pavimento) e remontar só as partes alteradas, enviando só os buffers delas | Edição de uma viga: ciclo de 0,7 a 2,3 s (60 pav.) para ~20 a 80 ms | 2 a 3 dias, Sonnet | `renderizador.ts`, `cena.ts`, `assinatura.ts` |
| 9 | LOD durante a interação: ao arrastar, esconder as arestas (e opcionalmente tornar as lajes opacas) e restaurar ao soltar; `maxFaces` automático (ex.: 20 k) no SVG enquanto os sliders são arrastados e cache da projeção | Menos custo de preenchimento e de vértices por quadro em GPU integrada; SVG de 440 ms a 1 s por tique para ~100 ms | 0,5 dia, Haiku/Sonnet | `controles.ts` (callback de início/fim de interação), `Vista3D.tsx`, `renderizador.ts`, `isometrico.ts` |
| 10 | Ocultar a aba 3D sem desmontar (manter o `RenderizadorCena` e a cena entre trocas de aba) | Remove a recriação do contexto WebGL, dos shaders e da cena ao voltar | 0,5 dia, Haiku | `src/app/edificio/Edificio.tsx`, `Vista3D.tsx` |

Ordem sugerida de execução: 3 e 2 (quick wins, meio dia no total) > 1 > 5 > 4 > 6 > 7 > 8 > 9/10. Os itens 1 a 3 e 5 mexem em poucos arquivos e já deixam 30 pavimentos confortável e 60 usável; 4 e 6 a 8 são o caminho para 60 pavimentos fluidos em planta grande.

Observações: (a) `three-mesh-bvh` e qualquer outra dependência exigem aceite do usuário (regra do projeto); a alternativa por AABB do item 5 não precisa. (b) O item 6 deve reaproveitar o worker de cálculo para não crescer o pacote (hoje 2,4 MB; o worker inline já duplica código do núcleo). (c) No item 7, pilares com seção ou pé-direito diferente por lance geram assinaturas diferentes e não se repetem; os ganhos vêm de vigas e lajes por grupo e dos pilares regulares. (d) Medir os itens de fill rate (lajes transparentes, arestas) no navegador antes de decidir o item 9.

### 3.4 Lições de arquitetura para o resto do sistema

- Separar modelo de visual como o `ViewProvider`: o dado (`BuildingModel`) não conhece a vista; cada vista tem um "provider" por tipo de elemento que guarda o resultado derivado e sabe quando invalidá-lo. Hoje nossos geradores são funções puras, o que é bom; falta a camada de invalidação por parte (assinatura) que o FreeCAD tem ao rotear `slotChangedObject` só ao provider do objeto.
- Revisões por finalidade. Já temos `revCalculo`, `revDetalhe`, `revFund`, `revEsforcos`, mais a `rev` geral (que também muda com dados de prancha); a vista 3D, o memorial (`desenhoMemorial.ts`, que também chama `construirCena`), as pranchas e a planta deveriam ter a sua `revGeometria` (ou assinatura por elemento) e não depender de `rev`, que muda a cada comando. A mesma regra do `rearmar.ts` (só refazer o que a mudança afeta; `OPCOES_ANALISE`/`OPCOES_DETALHE` classificam toda opção) vale aqui: classificar cada comando como altera geometria ou não.
- Cache por identidade como no `updateVisual` (não retesselar a forma "parceira" da anterior): resultados caros (panos, faces, triangulações, grelhas idênticas) devem ser memoizados por (modelo imutável, grupo). Já fazemos isso na análise (grelhas idênticas resolvidas uma vez); a vista 3D e a planta ainda não.
- Geração preguiçosa para o que está oculto (`VisualTouched`): pavimentos fora do escopo, tipos desligados e abas fechadas não precisam de geometria até serem mostrados; combina com o item 4.
- Qualidade como parâmetro do provider (deflexão relativa à dimensão do objeto, ângulo): o nosso equivalente é `detalhe` baixo/alto; manter assim e evitar dependência do tamanho do prédio nas decisões de geometria.
- Um nó por conjunto, não por elemento: vale para a planta 2D (Canvas) e para qualquer outra vista que vier (elevação, quadros); a regra é custo proporcional a draw calls e não a elementos.
- Trabalho pesado fora do thread de interface, com buffers transferíveis: o worker de cálculo e o `montarConjuntoNoWorker` já seguem esse caminho; a vista 3D é o único consumidor pesado que ainda roda no principal.
- Válvulas de segurança configuráveis (pré-seleção AUTO/ON/OFF, modo interativo com limite de triângulos): oferecer um limite que desliga hover/arestas acima de N triângulos, exibido em `data-` para os testes e2e.

## 4. Como reproduzir

Scripts em `/tmp/claude-0/-home-user/bdeaf127-12fc-549a-99cd-d433fbf2c8c5/scratchpad/medir3d/`: `modelo.ts` (gera os prédios via comandos do `Sessao`), `bench.mtest.ts` (P1 e P2), `bench2.mtest.ts` (P3, P4, treliçada), `bench3.mtest.ts` (por gerador e panos), `bench4.mtest.ts` (repetições), `bench5.mtest.ts` (hover, seleção), `bench6.mtest.ts` (sem lajes lançadas, draw calls dos "?"), `vitest.config.mts`. Resultados em `resultados*.jsonl` na mesma pasta. Comando (a partir de /home/user/new-toll): `npx vitest run --config <pasta>/vitest.config.mts [bench2]`. O renderizador real é usado com um stub de `WebGLRenderer`; three.js é o de `public/vendor`. Nada foi escrito no repositório.
