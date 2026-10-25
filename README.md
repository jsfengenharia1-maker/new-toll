# Statikos — análise de pórticos planos (web)

Reconstrução limpa de um analisador de pórticos 2D. A especificação veio do comportamento observável (menus e funções), sem uso de código de terceiros. Nome provisório.

## Rodar

```bash
npm i
npm run dev        # desenvolvimento
npm test           # 225 testes (soluções analíticas, NBR 6118, NBR 8800, fundações, exemplos, arquivo de trabalho, DXF, cotas, caminho, perfis, comandos do edifício, CLI e MCP)
npm run build      # gera dist/ (index.html pequeno + assets/ sob demanda + manifest, service worker e ícones de public/)
npm run build:artifact  # gera dist-artifact/index.html único (artifact do claude.ai)
npm run e2e        # testes de interface (Playwright): build, vite preview numa porta livre e fluxos de e2e/flows.mjs
npm run cli        # gera dist-cli/statikos.mjs (linha de comando + servidor MCP, Node ≥ 20)
```

## Linha de comando e IA (módulo Edifícios)

Tudo o que a aba **Edifício** faz passa por comandos tipados (`src/core/commands`), com JSON Schema, desfazer e log. Os mesmos comandos servem à interface, à linha de comando e a agentes de IA:

```bash
node dist-cli/statikos.mjs novo obra.statikos            # edifício padrão (térreo, 3 tipos, cobertura)
node dist-cli/statikos.mjs exec obra.statikos cmds.jsonl  # uma linha JSON por comando: {"nome": "pavimento.repetir", "params": {"id": "pav_6", "vezes": 5}}
node dist-cli/statikos.mjs verificar obra.statikos        # verificação de lançamento (código 1 se houver erro)
node dist-cli/statikos.mjs calc obra.statikos             # análise: cargas na fundação, flechas, equilíbrio
node dist-cli/statikos.mjs comandos --json                # comandos e parâmetros
node dist-cli/statikos.mjs mcp                            # servidor MCP em stdio
```

No servidor MCP, cada comando de escrita é uma ferramenta que só devolve a **prévia** (diff e token). A alteração acontece na ferramenta `aplicar`, com o token. Não há execução de código livre. Exemplo de configuração num cliente MCP: `{"command": "node", "args": ["<repo>/dist-cli/statikos.mjs", "mcp"]}`.

## Publicar

Site estático: conecte o repositório no Netlify (o `netlify.toml` já define build e pasta). Não há servidor nem login; o usuário salva o trabalho em um arquivo `.statikos` (Arquivo › Salvar no computador, Ctrl+S) e o reabre depois (Ctrl+O). O arquivo leva o modelo, a biblioteca e o histórico.

Instalável (PWA): no Chrome/Edge, "Instalar Statikos" na barra de endereço. Depois da primeira visita, abre sem internet; com o app instalado, um `.statikos` abre com duplo clique (Chrome/Edge no desktop) e Ctrl+S grava no mesmo arquivo. O service worker busca sempre a versão publicada quando há rede.

Próximas fases: [`docs/spec-proximas-fases.md`](docs/spec-proximas-fases.md).

## Arquitetura

| Camada | Arquivo | Papel |
|---|---|---|
| Modelo | `src/core/types.ts` | JSON versionado (nós, barras, materiais, seções, casos, combinações, trens-tipo) |
| Elemento | `src/core/element.ts` | Pórtico plano por flexibilidade: Euler-Bernoulli/Timoshenko, rótulas por condensação, cargas lineares, temperatura, deformação inicial concentrada |
| Solver | `src/core/solver.ts` | Rigidez direta, apoio inclinado exato (rotação de gdl), molas, recalques, detecção de hipostaticidade, superposição |
| Influência | `src/core/influence.ts` | LI por Müller-Breslau (uma solução por seção), trem-tipo com q/q′, impacto, dois sentidos, envoltória + estático |
| Edição | `src/core/edit.ts` | Inserção com divisão automática em interseções, união de barras, combinações NBR 8681 |
| Concreto | `src/core/concrete.ts` | NBR 6118:2023: materiais, seção por compatibilidade de deformações (parábola-retângulo), pilares (M1d,mín, λ/λ1, pilar-padrão com curvatura aproximada, flexão oblíqua α = 1,2, escolha automática de armadura), vigas (flexão retangular/T, armadura dupla, As,mín, cisalhamento modelo I, Branson) |
| Aço | `src/core/steel.ts` | NBR 8800: Q (flambagem local), χ, FLT/FLM/FLA, cortante, interação N+M com B1 |
| Projeto | `src/core/design.ts` | Combinações ELU/QP/raras, γz com rigidez reduzida e 0,95γz, verificação de todas as barras, sugestão de seção até 100×100, cargas na fundação |
| Memorial | `src/app/Memorial.tsx`, `drawing.ts` | Memorial padrão (ordem TQS/ABECE 003) com figuras, tabelas, fórmulas e conclusão; exportação HTML |
| Fundações | `src/core/piles.ts`, `caps.ts`, `footings.ts`, `footingsGroup.ts` (sapata associada e aparada por limites), `caissons.ts`, `foundation.ts`, `src/app/Fundacoes.tsx` | Estacas: Décourt-Quaresma (α/β 1996) metro a metro, limites executivos (NA, nega estimada, profundidade de equipamento), Miche, NBR 6122 Tabela 4, armadura por bitola e estribo espiral. Blocos de 1 a 6 estacas por bielas e tirantes; sapatas rígidas e flexíveis; tubulões a céu aberto; várias sondagens por obra |
| Biblioteca | `src/app/storage.ts`, `Library.tsx` | Projetos e características salvos na conta (capability db, subárvore privada do usuário) ou no navegador |
| Interface | `src/app/*` | Editor SVG (snap, janela/cruzamento, arrastar nós, coordenadas), painéis, tabelas, exportação SVG/CSV/JSON |
| Design system | `src/app/design/`, `src/app/ui/` | Tokens e classes em `global.css` (papel: `memorial.css`), biblioteca de componentes e teste que reprova cor, CSS ou classe fora do sistema (`docs/design-system.md`) |
| Perfis | `src/core/profiles.ts` | Perfis I laminados W e HP, tubos circulares e retangulares usuais no Brasil: só dimensões nominais; A, I, Z etc. calculados pela geometria, sem raio de concordância |
| PWA | `public/manifest.webmanifest`, `public/sw.js` | Instalação, funcionamento offline (rede primeiro, cache como reserva), abertura de `.statikos` pelo sistema (File Handling API) |
| Testes de interface | `e2e/run.mjs`, `e2e/flows.mjs` | Runner próprio sobre `playwright`: desenho, memorial, salvar/abrir, modos, DXF, perfis, PWA |
| Saída | `src/app/dxf.ts`, `dims.ts`, `pathTable.ts` | DXF R12 próprio com camadas, cotas automáticas de vãos e níveis, CSV ao longo de uma cadeia de barras |
| Edifício (modelo) | `src/core/building/` | Modelo físico versionado (obra, norma, pavimentos, grupos, eixos), verificação de lançamento com correção sugerida, premissas em uso, parte do edifício no `.statikos` v2 |
| Comandos | `src/core/commands/` | Registro tipado (JSON Schema próprio), aplicação com patches do immer (desfazer), log que reproduz o modelo (replay), prévia com token |
| CLI e MCP | `src/cli/` | `statikos` em Node (novo, info, verificar, exec, calc, dim, prancha, comandos) e servidor MCP stdio (JSON-RPC próprio, sem SDK) |
| Pranchas | `src/core/sheets/` | Planta de formas por grupo, quadro de pilares, carimbo, folhas A0–A4; um modelo de prancha e quatro saídas: PDF vetorial próprio (camadas OCG), DXF R2000 próprio (modelo em m + layout com janela em escala), DWG R2018 pelo nasjidwg (MIT, `public/vendor`, sob demanda) e SVG (prévia) |
| Vista 3D | `src/core/vista3d/`, `src/app/vista3d/` | Cena 3D por função pura (pilares por lance, vigas, lajes com furos triangulados, panos a definir, fundações; geradores registrados por frente), câmera de órbita e caminhar, isométrico SVG (plano B e memorial); interface em three.js vendorizado em `public/vendor` (`scripts/vendor-three.mjs`, 623 KB, sob demanda, fora do HTML único) com seleção sincronizada com a planta |
| DXF (entrada) | `src/core/dxf/read.ts` | Leitor próprio: LINE, LWPOLYLINE com bulge, POLYLINE, ARC, CIRCLE, ELLIPSE, SPLINE (aproximada), TEXT, MTEXT, INSERT/DIMENSION com blocos aninhados, escala, rotação e matriz; $INSUNITS |
| Capturas | `src/core/geom/snap.ts` | Índice espacial (Flatbush) sobre segmentos e arcos: extremidade, interseção, meio, centro, quadrante, perpendicular e próximo; entrada digitada (x;y, @dx;dy, @d<ângulo, distância); ortogonal e polar |
| Barras 3D | `src/core/fe3d.ts` | Pórtico espacial e grelha (12 gdl por barra), trechos rígidos, liberações por condensação, molas, diafragma rígido mestre-escravo, cargas distribuídas e concentradas, barras de Timoshenko, superelementos e cascas; validado contra o OpenSees (`validation/opensees/`) |
| Condensação e casca | `src/core/condensacao.ts`, `src/core/casca.ts`, `src/core/geom/malhaTri.ts` | Complemento de Schur das grelhas (modelo integrado, N2b); casca espessa de 6 nós (LST + Mindlin com cortante por interpolação mista); malha triangular por Delaunay restrita |
| Modelo analítico | `src/core/building/analitico.ts`, `resumo.ts` | Grelha de lajes e vigas por pavimento (malha de 0,5 m, validada com as placas de Timoshenko) e pórtico espacial com diafragma; cargas na fundação por pilar |
| Edifício (interface) | `src/app/edificio/` | Aba Edifício: obra, pavimentos, grupos, máscara, pilares (quadro e colagem do Excel), eixos, linha de comando; planta em Canvas 2D (máscara em cache, modelo, interação), elevação, verificação e premissas |

## Inventário funcional

**Feito (fase 1)**
- Nós, barras, divisão automática, mover nó, inverter orientação, unir barras, entrada por coordenadas
- Transformar seleção: copiar ou mover por translação (cópias em série), rotação, espelhamento e escala, levando cargas e apoios
- Apoios fixos, livres ou com mola em X/Y/θ; apoio inclinado; recalques e rotações prescritas
- Rótulas por extremidade ou em todas as barras de um nó; ligações semirrígidas (mola rotacional linear-elástica k por extremidade); barras inextensíveis e trechos rígidos
- Materiais; seções retangular, T, I/H, caixão, circular, tubo, poligonal (ex.: L) e genérica
- Pilares de concreto circulares e poligonais por fibras, com flexão oblíqua real
- Cargas nodais, distribuídas lineares (global, projetada, local), momentos de extremidade, temperatura (fibras y+/y−), peso próprio
- Casos (G/Q/W com ψ), combinações livres e NBR 8681 automáticas, envoltórias de casos e combinações
- Diagramas N, V, M (M no lado tracionado ou comprimido), deformada exata, reações, leitura no ponto ao passar o mouse
- Linhas de influência de N, V e M, de reações de apoio e de deslocamentos de nó; trem-tipo com envoltória em toda a estrutura
- 2ª ordem global por P-Δ (opção ao γz), desaprumo global (11.3.3.4.1), flambagem global (modos e fatores de carga crítica) e vibração livre (frequências e massas modais)
- Cotas manuais, zoom por janela, eixos locais, símbolos P/M/G, preto e branco, PNG e cópia do desenho; consulta no nó; valores em passos; envoltória de casos/combinações escolhidos; importar materiais e seções de outro arquivo; perfis U, Z e cantoneiras; cortante por barra; apoio inclinado por H/V
- Unidades de exibição: força kN, tf, kgf ou N e comprimento m, cm ou mm (cálculo sempre em kN e m)
- Tabelas (reações, deslocamentos, esforços) com CSV; exportação SVG; desfazer/refazer; salvamento automático local
- Exportação DXF R12 em metros com camadas (geometria, nós, apoios, rótulas, cargas, cotas, textos, N, V, M e deformada do resultado ativo)
- Cotas automáticas de vãos e níveis (toggle "Cotas"), no desenho, no SVG e no DXF
- CSV de resultados ao longo de uma cadeia de barras (s acumulado, N, V, M, δx, δy)

**Feito (fase 2)**
- Dimensionamento NBR 6118 de vigas (retangular e T, com fissuração ELS-W) e pilares retangulares, com sugestão de seção e aplicação em um clique
- Verificação NBR 8800 de perfis I, tubos e caixões
- γz, cargas na fundação (características e de cálculo), flechas com Branson e fluência
- Biblioteca rápida de seções retangulares de 12 cm a 1,50 m; materiais por classe (C20–C90) e aços comerciais
- Perfis metálicos de catálogo (W150×13,0 a W610×174,0, HP200×53,0 a HP310×125,0, tubos circulares Ø33,4 a Ø323,8 e tubos quadrados/retangulares 50×50 a 300×200): propriedades pela geometria nominal, sem raio de concordância (a confirmar com o catálogo do fabricante)
- Memorial de cálculo padrão exportável em HTML e impresso em PDF (A4, cabeçalho, rodapé com paginação, quebras por seção)

**Plataforma**
- PWA: instalação, uso offline, abertura de `.statikos` com duplo clique (Chrome/Edge instalado)
- Testes de interface no repositório (`npm run e2e`)

**Feito (fase 3)**
- Biblioteca: salvar/abrir projetos e "características" do dimensionamento na conta do usuário
- Módulo de fundações profundas: SPT, cargas do pórtico ou salvas, hélice contínua, escavada e pré-moldada, Ø25–100 (pré-moldada nos diâmetros de catálogo), comprimento, número de estacas, armadura por bitola e memorial

**Feito (fase C — fundações, 18/10/2026)**
- Nd,mín da estaca com γf = 1,0 na parcela permanente e 1,4 no alívio variável e no binário (campo "N perm" por apoio)
- Tipo de fundação por apoio: estacas + bloco, sapata ou tubulão; furo, seção do pilar e coordenadas por apoio
- Blocos de coroamento sobre 1 a 6 estacas (bielas e tirantes): altura, tirantes, malha, suspensão, bielas no pilar e na estaca, croqui
- Sapatas isoladas rígidas e flexíveis com momento em uma ou duas direções: σadm informada ou pelo SPT, área comprimida, CEB-70 ou bielas, punção, croqui
- Tubulões a céu aberto: fuste, base alargada, cota automática acima do NA, croqui
- Várias sondagens por obra (arquivos antigos com uma sondagem continuam abrindo); por apoio, um furo ou a média de todos/alguns; leituras fora do padrão podem ser descartadas

**Módulo Edifícios — fatia 0 (20/10/2026)**
- Licença Apache-2.0; modelo físico do edifício; registro de comandos com desfazer, log e prévia; `.statikos` v2 (v1 continua abrindo)
- Aba Edifício: obra e norma (cobrimentos pela CAA), pavimentos com cota e pé-direito, grupos (pavimento-tipo vinculado) com uso e cargas da NBR 6120, “+1” para repetir pavimento, malha de eixos, linha de comando, verificação de lançamento contínua com correção em um clique
- Linha de comando `statikos` e servidor MCP com prévia → aplicar
- Spec e fatias seguintes: [`docs/spec-edificios.md`](docs/spec-edificios.md)

**Módulo Edifícios — fatia 1 (20/10/2026)**
- Planta do pavimento em Canvas 2D: zoom no cursor, pan (botão do meio ou espaço), temas escuro/claro/P&B, pavimento inferior esmaecido
- Máscara DXF por grupo de pavimentos: leitor próprio, unidade por $INSUNITS, camadas visível/capturável, alinhamento por 2 pares de pontos (com ou sem escala)
- Capturas com glifos e Tab para alternar; ortogonal (F8) e polar 15° (F10); valores digitados durante o traço
- Pilares: inserir por clique ou coordenada, ponto fixo (centro, faces, cantos), ângulo, nasce/morre, seção por lance, mover, copiar em série, renumerar, quadro editável e colagem do Excel; verificação de sobreposição, seção mínima e pilar-parede
- Eixos por dois pontos ou por malha; ferramentas Selecionar (janela/cruzamento), Mover e Medir
- Comando `lote` (vários comandos, um desfazer); no arquivo, a geometria da máscara vai uma vez só

**Módulo Edifícios — fatia 2 (20/10/2026)**
- Vigas por polilinha na planta do grupo, com a linha traçada no eixo ou numa face (tecla A), invertidas e com desnível; seção, alinhamento e desnível editáveis no quadro
- Dividir, unir, prolongar/aparar até outra viga ou eixo, mover, copiar em série, copiar para outros grupos sem apagar o que existe, atribuir em lote, renumerar e encostar nas faces dos pilares
- Verificação de lançamento contínua: viga sem apoio, viga em balanço, vigas sobrepostas, viga fora da face do pilar (com correção), pilar sem viga, pilar nascendo sem apoio e transição (V2); “ver na planta” seleciona os elementos
- MCP: ferramentas genéricas `comandos` e `previa` para os comandos sem ferramenta própria

**Módulo Edifícios — fatia 3 (20/10/2026)**
- Detecção de panos pelo eixo das vigas (arranjo planar com divisão nas interseções e semiarestas); pano sem laje vira aviso com correção
- Lajes maciças e treliçadas (catálogo H8–H25 com EPS, peso próprio, vigotas no menor vão com seta na planta), por clique no pano, por contorno (balanços) ou preenchendo todos os panos; aberturas, desnível, renumeração
- Cargas por grupo (revestimento e uso), pontuais, lineares e de área (G/Q); alvenaria gerada das paredes de uma camada da máscara (pares de linhas paralelas)
- Verificação: lajes sobrepostas, treliçada fora de região fechada por vigas

**Módulo Edifícios — fatia 4 (20/10/2026)**
- Motor de barras 3D próprio: pórtico espacial e grelha, trechos rígidos, liberações, molas, diafragma rígido (mestre-escravo), cargas distribuídas e concentradas
- Gerador do modelo analítico (função pura): grelha de lajes e vigas por pavimento, transferência das lajes para as vigas e pórtico espacial com trechos rígidos até a face − 0,3h; casos G e Q
- Validação: placas apoiada e engastada de Timoshenko (erro < 5 % com malha de 50/25 cm) e pórtico espacial idêntico ao OpenSees (10⁻⁶)
- Cálculo num Web Worker; aba Análise com cargas na fundação, flechas elásticas e verificação de equilíbrio; `statikos calc` e ferramenta `calcular` no MCP
- Porte: 10 pavimentos com 3 × 2 vãos (≈ 16 mil gdl) em < 1 s no Node

**Módulo Edifícios — fatia 5 (20/10/2026)**
- Vento pela NBR 6123: V0, S1, S2 (categoria e classe), S3, Ca por direção; forças por pavimento pela largura da fachada e altura de influência; 4 direções × (centrado, ± excentricidade), aplicadas no centro do diafragma
- γz por direção com rigidez reduzida (0,4/0,8·Eci·Ic), com vento principal e uso principal; vento das ELU ampliado por 0,95·γz entre 1,1 e 1,3; aviso acima de 1,3
- Combinações ELU, frequentes, quase permanentes e raras (grupo excludente do vento); cargas na fundação com envoltórias rara (geotécnica) e ELU (estrutural)
- Comandos `vento.definir` e ψ da carga de uso em `norma.definir`

**Módulo Edifícios — fatia 6a (20/10/2026)**
- Dimensionamento NBR 6118 no mesmo Web Worker da análise: vigas (envoltória ELU de momentos e cortantes, armaduras e estribos), pilares por lance (pilar-padrão com curvatura aproximada nas duas direções + flexão oblíqua por fibras nas combinações determinantes) e lajes maciças (As por metro nas duas direções e flecha com fluência)
- Aba Dimensionamento: tabelas com situação por elemento, filtro "só o que não atende", clique leva ao elemento na planta; quantitativos de concreto, fôrma e aço estimado por pavimento
- Cargas por pilar enviadas ao módulo Fundações (botão na aba e "Importar do edifício" no módulo Fundações; tipo de fundação e sondagem já escolhidos são mantidos)
- Memorial do edifício (materiais, geometria com planta de fôrma esquemática, ações, modelo, γz, dimensionamento, fundação, quantitativos e premissas), imprimível em PDF e exportável em HTML
- `statikos dim` e ferramenta `dimensionar` no MCP
- Fora desta fatia: torção de vigas, detalhamento (pranchas na 6b), resultados coloridos e visualização 3D

**Módulo Edifícios — fatia 6b (20/10/2026)**
- Pranchas de formas por grupo: pilares hachurados (os que nascem no pavimento, tracejados), faces das vigas interrompidas nos pilares e cruzamentos, rótulos de vigas, pilares e lajes, eixos com bolhas, cotas em cadeia entre pilares, quadro de pilares (com as armaduras do último dimensionamento) e carimbo editável
- Formato (A0–A4) e escala automáticos ou fixos; margens, legenda de 178 mm e marcas de dobra
- PDF vetorial próprio em escala exata (penas, tracejados, Helvetica com acentos, uma camada OCG por tipo de elemento), várias páginas
- DXF R2000 próprio: planta em metros no modelo, folha num layout com janela na escala, camadas com cor, tipo de linha e espessura; auditado sem erros pelo ezdxf (`validation/dxf/auditar.py`) e relido pelo nasjidwg
- DWG R2018 pelo nasjidwg (MIT), carregado sob demanda de `public/vendor` (192 KB, fora do HTML único); a mesma prancha relida do DXF e do DWG é comparada entidade a entidade nos testes
- Carimbo com empresa, obra, cliente, local, responsável técnico, registro, ART/RRT, etapa, desenho, revisão e data, todos editáveis na aba Pranchas
- Locação da viga pela face do pilar (`viga.alinharFace`): contorno na face externa ou face esquerda/direita escolhida; viga mais estreita que o pilar fica para dentro
- Aba Pranchas com prévia, `statikos prancha` (`--pdf`, `--dxf`, `--dwg`) e ferramenta `pranchas` no MCP; no artifact do claude.ai, arquivos de extensão não aceita (DXF, DWG, `.statikos`) saem dentro de um `.zip`

**Módulo Edifícios — fatia 7 (20/10/2026)**
- Servidor MCP completo: `outputSchema` em todas as ferramentas, resultados filtrados por pavimento e por situação, recursos `statikos://resultados` e `statikos://resultados/{pavimento}`
- Guia para agentes em [`docs/ia.md`](docs/ia.md) e `llms.txt` na raiz do site
- Agente de exemplo (`npm run agente`): lança um edifício, verifica, dimensiona, aumenta os pilares que não passam, loca o contorno na face externa e gera as pranchas

**Edifícios — opções de cálculo (frente N1a, 20/10/2026)**
- Opções editáveis com padrão pela NBR 6118 (o que a norma não fixa fica marcado "a confirmar"): malha da grelha (0,25 m), torção de vigas, lajes e pilares, rigidez axial dos pilares, trecho rígido no nó e engaste no topo do último lance (0,3)
- Engaste parcial nas barras 3D por interpolação entre as rigidezes engastada e articulada; tabela das opções no memorial
- Por elemento: engaste por lance de pilar (topo e base), pontas e apoios articulados de vigas, engaste das bordas das lajes, torção de equilíbrio e vigas fora do diafragma
- Materiais e segurança (frente N1b): fck por tipo de elemento e por lance de pilar, aço por posição, γc/γs/γg/γq, cobrimentos por face e por elemento; comprimento de flambagem ℓe = mín(ℓ0 + h; ℓ) × α por pavimento, pilar e direção (NBR 6118, 15.6)
- Casos de carga (frente N1c, parte A): casos adicionais G, Q, W (ação horizontal) e E (excepcional) com grupo de incompatíveis, caso simultâneo e ψ; cargas da planta em qualquer caso; cargas nos pilares (N, Hx, Hy, Mx, My, no topo ou a uma altura do lance); combinações excepcionais; lista das combinações (fatores por caso) na aba Análise, exportável em CSV, e resumo no memorial
- Zonas independentes e vento (frente N1c, parte B): partes do pavimento ligadas por vigas formam diafragmas separados (opção, padrão ligada); pilar isolado fica sem diafragma. O vento do pavimento é repartido entre as zonas pela largura (Bi = bi/Σb·B). `vento.definir` ganhou coeficiente por sentido (+X, −X, +Y, −Y), fator de vizinhança (NBR 6123, 6.4) e platibanda (m). γz com limite editável (padrão 1,3) e deslocamento pelos nós dos pilares ponderados pelas reações
- Lajes e flechas (frente N1d): lajes maciças por Wood-Armer com média em faixa de 1 m (opção); flecha relativa aos apoios, com αf = Δξ(t0) editável ou fator simplificado; flecha das vigas por vão com Branson em cada seção e integração da curvatura; limites total (ℓ/250) e sensorial das variáveis (ℓ/350) editáveis. Colunas de flecha nas abas Dimensionamento e no memorial. Ficaram de fora: etapas de carga da flecha diferida (flecha ativa) e ρ′
- Verificações das vigas e pilares (frente N1e): redistribuição de negativos (padrão 15 %) com os limites de δ da NBR 6118, momentos mínimos p·ℓ²/x opcionais, cortante a partir da face (ou + % de d), decalagem aℓ, torção das vigas com biela conjunta e Asl repartida nas faces, cortante nos pilares com Vc por flexo-compressão e abertura de fissuras em vigas e lajes maciças (armadura aumentada até atender). Colunas Td, δ, wk, laterais, aℓ e Vd nas abas Dimensionamento e no memorial.
- Revisão de resultados (frente R1): pilares, vigas e lajes com erro (vermelho) ou aviso (amarelo) na planta, com chave "Mostrar erros"; lista de erros e avisos com contagem, filtros, códigos e clique que centraliza o elemento na planta; janela de resultados por elemento (duplo clique, lista ou botão na planta) com diagramas das envoltórias de M, V e T das vigas, combinações determinantes dos pilares e resultados das lajes; deslocamentos laterais do vento por pavimento (NBR 6118, Tabela 13.3) na aba Análise e no memorial; listagem em CSV.
- Armadura editada e bloqueada (frente R2): editor na janela do elemento (vigas: nº e bitola inferior, superior e laterais, estribo; pilares: bitola, barras por face e estribo, por lance) com As efetiva × necessária; "Aplicar e bloquear", "Desbloquear" e "Restaurar calculada"; o recálculo só verifica a armadura bloqueada (erro ARM_BLOQ se não atende); coluna "Bloq." nas tabelas, marcador ▣ na planta, bloqueio e desbloqueio em lote (selecionados ou todos, com contagem) e seção no memorial.
- Detalhamento das vigas (frente R3a): aba Detalhamento na janela da viga com a elevação esquemática (pilares, barras inferiores, superiores e de pele em raias paralelas com ganchos de 90°, estribos por zona, emendas por traspasse e cotas), seção transversal no primeiro vão, tabela de barras e estribos (posição, tipo, quantidade, φ, comprimentos e peso), lb inferior e superior com a aderência e avisos; resumo de aço por aço e bitola na aba Dimensionamento (perdas da opção, padrão 10 %) com CSV do resumo e da lista de barras; botão "Copiar para…" que replica a armadura bloqueada para vigas do grupo (comando `viga.copiarArmadura`); seção "Detalhamento das vigas" no memorial. Opções: barra máxima 12 m, arredondamento 5 cm, perdas 10 %, bitola de montagem φ8.
- Detalhamento dos pilares (frente R3b): aba Detalhamento na janela do pilar com a elevação do pilar inteiro (escala vertical por cota; níveis dos pavimentos e fundação; barras por trecho com ganchos de 90°, arranques, emendas por traspasse e união de lances curtos; tipo de passagem por nível; estribos e grampos por lance), seção transversal de cada lance com barras, estribo e grampos (18.2.4), tabelas de barras (Pos., tipo, lances, quantidade, φ, comprimentos, peso) e de estribos por lance, lb por lance e avisos; resumo de aço de vigas, pilares e total geral por aço e bitola, com perdas e CSV (resumos e listas de barras); seção "Detalhamento dos pilares" e resumo geral de aço no memorial; opções `continuidadePilares`, `pilarBarraMaxima`, `pilarUniaoLances` e `ancoragemReduzidaTopo`.
- Detalhamento das lajes (frente R4): aba Detalhamento na janela da laje maciça com a planta da laje (contorno, furos, bordas contínuas, apoiadas e livres, barra representativa de cada posição com ganchos e linha de distribuição rotulada "Nk – n φ c/s – C = x,xx", camadas inferior e superior ligáveis), tabela de posições (Pos., face, tipo, quantidade, φ, espaçamento, comprimentos, peso), As necessária × adotada por direção, bordas, lb, emendas e avisos; camada opcional "Armadura das lajes" na planta do pavimento; resumo de aço de vigas, pilares, lajes e total geral com CSV (resumos e lista de posições); seção "Detalhamento das lajes" e resumo geral com lajes no memorial; opções `lajeNegativoVao`, `lajeNegativoBorda`, `lajeDecalagem`, `lajeBitolaMinima`, `lajeEspacamentoMinimo`, `lajeArmaduraCanto` e `lajePernasNegativos`.
- Lajes treliçadas (frente R6): aba Vigotas na janela da laje com a planta das vigotas (alinhamentos na direção das nervuras, cor e rótulo por grupo de igualação, faixas maciçadas hachuradas junto aos apoios, negativos e distribuição), diagramas de momento (com o resistente da nervura) e cortante (com VRd1) da vigota clicada, tabela por grupo (vigotas, L, Md+, Md−, Vsd/VRd1, As necessária, treliça, adicional, negativos com comprimento, maciço) e dados da laje (distribuição, capa, pesos); editor da armadura adicional inferior e negativa por nervura com "Aplicar e bloquear" e "Desbloquear"; camada "Armadura das lajes" da planta também com as treliçadas; resumo geral de aço com as vigotas, tabela de treliças (tipo, comprimento, peso) na aba Dimensionamento, no CSV e no memorial, que ganha a seção "Lajes treliçadas"; erros VIGOTA_* na lista de erros; fluxo e2e `R6`.
- Punção e cortante das lajes (frente N2d): aba Punção e cortante na janela da laje maciça (contornos C, C′ e C″ da NBR 6118, 19.5, recortados pela laje e pelos furos; pilares internos, de borda e de canto com momento desbalanceado; armadura de punção em linhas radiais, grupos informados somados à calculada, varredura de cortante e armadura transversal pela 19.4), camada e ferramenta na planta, cartão no Dimensionamento, memorial e armadura de punção na prancha de lajes.
- Pranchas de armação (frente R5): aba Pranchas com seletor do tipo (formas, locação e cargas, armação de vigas, de pilares, de lajes e conjunto completo) e do grupo, lista de folhas numeradas ("n/N", sigla LOC, FOR, ARV, ARP, ARL, formato e escala) com prévia SVG e navegação, dados de aço da folha (peso, com perdas, concreto, forma), aviso quando o cálculo falta ou está desatualizado, opções de armação (formato, escalas, lajes separadas, quadro de pilares), exportação em PDF (folha ou todas), DXF e DWG por folha e zip com todas as folhas; fluxo e2e `R5`.

**Próximas fases**
- Pré-moldado (NBR 9062: consolos, ligações) — escopo a definir
- Fundações: sapatas associadas e de divisa, recalques, tubulão com carga horizontal, detalhamento e quantitativos
- Perfis soldados (CS, CVS, VS) e conferência das propriedades calculadas com o catálogo do fabricante
- Cotas manuais entre nós
