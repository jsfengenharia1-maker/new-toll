# Spec — Frente E1 (pilares sobre pilares, pilar-parede, paredes e muros, contenção com empuxo)

Base: 80 itens Parcial/Falta com frente E nos dois checklists (40 do manual do usuário: cap. 4 e 5, mais C6.19 e C6.59; 40 do de cálculo), conferidos por script em 20/10/2026: cada id está em exatamente uma fatia abaixo, sem sobra nem repetição; os demais itens E ficam para E2, E3 e E4. Nos checklists a frente continua "E" (o `checklists.test.ts` só aceita a letra) e a nota de cada item leva a fatia, ex. "[E1b]". Pronta para execução direta, sem aprovação por fatia (`plano-execucao.md`, "Regras de execução").

## Regras de toda a E1

- **Paridade de função, nunca de implementação.** Nomes, textos, tabelas, ícones e disposição de tela próprios.
- **Premissas.** Padrão do sistema = critério do programa de referência onde os checklists ou `pesquisa-edificios.md` o registram; NBR 6118, 6120, 6122, 16868 (alvenaria estrutural) e 9062 onde não registram (`padraoNBR`/`fonteNBR` quando diferem); sem fonte = "a confirmar" no app e no memorial. Aço, madeira e alumínio no edifício continuam fora do escopo: onde um item cita aço, a fatia entrega a parte de concreto e a nota registra "aço fora".
- **Opções** em `opcoes.ts`; **comandos** novos com `mcp: false`, schema, `validar`, mensagem e exemplo em `EXEMPLOS`; nenhuma ferramenta MCP nova (o `dimensionar` ganha resumos de paredes e pilares-parede); `docs/ia.md` cita os tipos novos nos resultados.
- **Modelo:** elementos novos em `BuildingModel` (`pilaresParede`, `tiposPilarParede`, `paredes`, `tiposAlvenaria`, `blocos`), com `normalizarEdificio` e versão do arquivo; elementos gravados só com o que difere do padrão.
- **Interface** com `src/app/ui` e `global.css`; ferramentas e camadas na `Planta.tsx` (estado no `plantaStore`); janelas de elemento como as da R1.
- **Revisão:** códigos novos em `CODIGOS_REVISAO`, com `TipoRevisao` ganhando `parede` e `pilarParede`.
- **Aceite de cada fatia:** testes numéricos contra cálculo manual ou OpenSees (`validation/opensees`), regressão do exemplo (`src/core/sheets/exemplo.ts`, sem elementos novos nada muda), e2e próprio (`E1a` … `E1e`), memorial, pranchas e checklists atualizados; `checklists.test.ts` verde.

## Fatias

| Fatia | Conteúdo | Itens | Depende de |
|---|---|---|---|
| E1a | Pilares sobre pilares e transições (pilar que nasce em pilar, viga ou laje), lances com ponto fixo próprio, pilar com desnível | 13 | N2b (nó do pé na laje), N2c (trechos rígidos, cota da base) |
| E1b | Pilar-parede: tipos de seção composta, lançamento, modelo por casca ou barra, ligação de vigas e lajes, vigas apoiadas ao longo | 11 | N2b (casca e diafragma) |
| E1c | Paredes de concreto e muros de contenção: modelo, lançamento, aberturas, empuxo aplicado, panos e apoios | 14 | N2a (empuxo), N2b (casca), E1b |
| E1d | Dimensionamento, edição e desenhos de paredes e pilares-parede | 25 | E1b, E1c; R7a (tabelas, opcional) |
| E1e | Alvenaria estrutural e blocos de concreto, vergas, modulação, desligamento muro-pilar, vigas sobre muros | 17 | E1c, E1d |

Ordem: E1a → E1b → E1c → E1d → E1e (onda 3 da lane 1, depois de N2a, N2b e N2c). A FU7b (fundação de muros e paredes) entra logo depois da E1c, que define a base do muro (`Parede.base`). A vista 3D desses elementos é da frente V.

---

### E1a — Pilares sobre pilares e transições (13 itens)

- **Itens:** C4.11, C4.13, C4.14, C4.15, C4.16, C4.17, C4.18, C4.19, C4.24, K1.9.30, K1.12.1-12, K1.12.1-16, K1.12.4-19.
- **Já existe (não refazer):** `Pilar.nasce`/`morre` com seção por lance (`pilar.secaoLance`, `secaoNoLance`); fck por pavimento dos pilares (`Norma.fckPilarPav`); `pilaresSobrepostos`; diagnósticos `PILAR_NASCE_SEM_APOIO`, `PILAR_TRANSICAO` e `PILAR_SOBREPOSTO` (`vigas.ts`, `pilares.ts`); pé do pilar que nasce acima da fundação com apoio fixo provisório e aviso (`analitico.ts`); capturas no contorno dos pilares; arranque (`ehArranque`, FU1); engaste da base por lance (`pilar.engaste`); `pilar.inserir` com ajuste e ângulo.
- **Núcleo:**
  - *Apoio do pé* (C4.13, C4.15, C4.24, K1.9.30): o pilar ganha `inicio` = `fundacao` (com vínculo externo) | `apoiado` (sem vínculo). Apoiado: o elemento de baixo é detectado no pavimento em que nasce — pilar(es) que morrem ali com contorno sobreposto, viga que toca o corpo, ou laje que o contém — e o pé vira nó desse elemento: no pilar de baixo, por trecho rígido horizontal entre os centros (N2c); na viga, nó da barra no pórtico e carga na grelha; na laje, nó da grelha (no modelo integrado da N2b; no separado, apoio fixo com o aviso atual). Vários pilares sobre um pilar são permitidos; pilar apoiado não aceita vínculo externo nem molas.
  - *Lances com ponto fixo, ângulo e dimensões próprios* (C4.14): `Pilar.secoes` ganha `ajuste`, `angulo` e deslocamento (dx, dy) por lance; a parte fora da projeção do lance de baixo liga-se por trecho rígido.
  - *Engaste na transição*: opção `engasteTransicao` (coeficiente da base do pilar apoiado em viga; padrão 0,3, faixa recomendada 0,1–0,3 registrada pela referência [a confirmar o padrão]).
  - *Dimensionamento* (K1.12.1-12, K1.12.1-16, K1.12.4-19): viga de transição recebe estribos verticais pelo cortante na face do trecho de apoio do pilar e armadura de suspensão (com a N2e); ancoragem das esperas do pilar na viga verificada (lb ≤ h − c, gancho), código `ARRANQUE_ANCORAGEM` (erro); pilar com desnível (cota da base própria ou altura de apoio, N2c) dimensionado por trecho.
  - *Material por lance* (C4.11): fck por pilar e lance (`Pilar.fck?` por pavimento) sobre o `fckPilarPav`; perfil metálico fora (aço no edifício).
- **Comandos:** `pilar.inserir` ampliado (`inicio`, `sobre`: pilar de referência e dx, dy relativos), `pilar.secaoLance` ampliado (ajuste, ângulo, deslocamento, fck), opção `engasteTransicao` por `opcoes.definir`.
- **Interface:** pilar que admite outro por cima (morre antes do último pavimento) destacado sob o cursor com círculo no eixo (C4.16); coordenadas do novo pilar relativas às do de baixo (C4.17); captura de eixo, cantos e meios das faces do pilar de baixo sem pedir coordenadas (C4.18); nome automático com sufixo de letra ("P5a", "P5b", C4.19); edição dos lances com ponto fixo próprio.
- **Memorial:** pilares apoiados com o elemento de apoio, coeficiente de engaste e ancoragem das esperas.
- **Pranchas:** na prancha de pilares, "nasce em V12" e esperas ancoradas na viga; na de vigas, estribos e suspensão da transição.
- **Testes de aceite:** pilar sobre viga biapoiada contra cálculo manual (reação, momento, cortante); pilar sobre pilar com excentricidade (momento N·e); dois pilares sobre um; lance com ponto fixo diferente; ancoragem insuficiente gera o erro; e2e `E1a`.

### E1b — Pilar-parede (11 itens)

- **Itens:** C4.1, C4.31, C4.32, K1.3.28, K1.3.29, K1.3.30, K1.3.59, K1.4.30, K1.9.34, K1.9.35, K1.12.21.
- **Já existe (não refazer):** aviso `PILAR_PAREDE` (lado > 5 × o menor) e premissa `pilar-parede`; seção poligonal por fibras (`fiber.ts`, `columnGeneral.ts`); detalhamento e quadro de pilares (R3b, R5); `axialPilares`; arranques (FU1); casca, malha e diafragma (N2b).
- **Núcleo:**
  - *Tipos* (C4.31, C4.32, K1.3.28, K1.9.34, K1.9.35): `tiposPilarParede` gravados na obra e reutilizáveis: lista de lados (vértices do eixo; o primeiro é o ponto de inserção) e espessura por pavimento à esquerda e à direita do eixo. Mesma geometria em planta em toda a altura (só a espessura varia). `pilaresParede`: tipo, nome, grupos inicial e final, ponto, ângulo e vínculo externo. Não nasce em pilar nem apoia pilar (validação).
  - *Modelo* (K1.3.29, K1.4.30): lado com comprimento ≥ 5 × a espessura vira casca (N2b), com EI bruto e EA × `axialPilares`; lado mais curto vira barra (pilar), como já decidido para o limite. Contraventa como elemento vertical do pórtico.
  - *Ligação de vigas e lajes* (K1.3.30): viga fictícia no topo de cada lado, largura = espessura e altura 25 cm, ligando vigas e lajes em qualquer posição (os nós delas não precisam coincidir com os da malha).
  - *Vigas apoiadas ao longo* (K1.3.59, K1.12.21): apoio longitudinal em pilar-parede ou parede: diagrama prolongado a partir da face por um comprimento = altura da viga, armadura só nesse trecho; vão de cálculo = menor entre a distância entre eixos e o vão livre + 2h; barras não passam mais de 2h além do vão de cálculo (`apoiosDaViga` e `detalharViga` ganham o apoio do tipo parede).
  - *Lançamento* (C4.1): pilares, pilares-parede e arranques pela mesma ferramenta.
  - Códigos `PPAREDE_APOIO` (nasce em pilar ou apoia pilar, erro) e `PPAREDE_LADO_CURTO` (info: lado tratado como barra).
- **Comandos:** `pilarParede.tipo` (criar/editar/remover), `pilarParede.inserir/editar/mover/remover`.
- **Interface:** editor de tipos (tabela de lados e espessuras por pavimento, prévia SVG); inserção na planta pelo primeiro vértice com ângulo; desenho em planta; janela do elemento com esforços por lado e por pavimento (tensões e armaduras na E1d).
- **Memorial:** tipos, geometria, modelo (casca ou barra por lado).
- **Pranchas:** contorno nas formas; cargas resultantes na locação (`cargasDosPilares` soma por pilar-parede); quadro e elevação na E1d.
- **Testes de aceite:** pilar-parede em L sob carga horizontal contra o OpenSees (casca); lado curto como barra; viga apoiada ao longo (vão de cálculo e corte das barras) contra cálculo manual; validação de apoio; e2e `E1b`.

### E1c — Paredes de concreto e contenção com empuxo (14 itens)

- **Itens:** C5.2, C5.9, C5.10, C5.21, C5.22, C5.23, C5.30, K1.1.3, K1.3.31, K1.3.32, K1.3.33, K1.9.44, K1.9.45, K1.9.107.
- **Já existe (não refazer):** `paredesDaMascara` (eixos de paredes por pares de linhas numa camada) e `carga.alvenariaDaMascara`; detecção de panos por faces (`geom/faces.ts`, `panosDoGrupo`); `laje.abertura`; lógica de `viga.prolongar` e `viga.copiarParaGrupos`; empuxo (`empuxo.ts`, natureza `H`, N2a); casca, malha e regra do diafragma (N2b); pilar-parede (E1b).
- **Núcleo:**
  - *Parede* (K1.1.3, K1.3.31, K1.9.44, K1.9.45, C5.2, C5.30): `paredes[]` com tipo (`concreto` aqui; `alvenaria` e `blocos` na E1e), polilinha do eixo, espessura por pavimento à esquerda e à direita, lados que mudam por pavimento (trechos por pavimento), pavimentos inicial e final, empuxo (tipo de empuxo, lado, cota do terreno), base (para a FU7b) e vínculo externo. Paredes de concreto com ou sem empuxo; dados do muro de concreto (espessura, armar ou não) como na E1d.
  - *Esbeltez* (K1.3.32): trecho com lado < 5 × a espessura vira pilar (barra), como no pilar-parede.
  - *Modelo* (K1.3.33): casca da N2b com malha adaptada às aberturas e com nós obrigatórios nas chegadas de vigas e lajes (todos coincidem com nós da malha); paredes fecham panos (faces) e apoiam lajes na grelha; parede que não toca laje fica fora do diafragma naquele nível (fecha K1.2.5 e K1.3.36 da N2b).
  - *Empuxo aplicado* (C5.2, K1.9.107): pressões do `diagramaEmpuxo` nas cascas do lado indicado, como caso de natureza `H`; aviso `PAREDE_EMPUXO_DIAFRAGMA` quando panos de vigotas correm paralelos à parede com empuxo (diafragma por enchimento a detalhar à parte).
  - *Aberturas* (C5.9, C5.10): portas e janelas por posição ao longo do eixo, largura, peitoril e altura, lançadas no pavimento de baixo dos dois entre os quais ficam.
  - *Vigas embutidas e de coroamento* (C5.23): `Viga.embutida` = id da parede; aparecem sobre o muro e são editadas junto.
- **Comandos:** `parede.criar/editar/remover/mover`, `parede.prolongar` (em todos os grupos onde a parede existe, C5.21), `parede.atribuir` (propriedades de um tipo ou de outra parede, uma a uma ou por janela, C5.22), `parede.abertura` (criar/editar/remover), `parede.empuxo`, `parede.daMascara` (gera paredes a partir da camada).
- **Interface:** ferramenta Parede na planta (polilinha com capturas; gerar da máscara); janela da parede com elevação SVG por pavimento, aberturas e diagrama de empuxo; edição em lote.
- **Memorial:** paredes (geometria, espessuras, aberturas), empuxo por parede com diagrama.
- **Pranchas:** paredes e aberturas nas formas (contorno e hachura de corte), locação com as paredes.
- **Testes de aceite:** muro de subsolo em balanço com empuxo triangular contra solução analítica de faixa; muro travado no topo pela laje; parede com abertura contra o OpenSees; prolongar em todos os grupos; parede fora do diafragma; e2e `E1c`.

### E1d — Dimensionamento, edição e desenhos de paredes e pilares-parede (25 itens)

- **Itens:** C4.62, C5.13, C5.14, C5.15, C5.17, C5.18, C5.26, K1.1.7, K1.4.59, K1.4.60, K1.11.36, K1.11.37, K1.11.38, K1.11.61, K1.12.4.2-1, K1.12.4.2-2, K1.12.4.2-3, K1.12.4.2-4, K1.12.4.2-5, K1.12.4.2-6, K1.12.4.2-7, K1.12.4.2-8, K1.12.4.2-9, K1.12.4.2-10, K1.12.4.2-11.
- **Já existe (não refazer):** bloqueio e edição de armadura (R2, `armaduras.ts`); comprimentos de emenda (`lbBasico`, `alfa0t` em `detalhamento.ts`); quadro e pranchas de pilares (`armacaoPilares.ts`); infraestrutura de pranchas e tabelas de aço (`armacao.ts`); Wood-Armer (`woodArmer`, N1d); tabelas de armadura (R7a, se já feita).
- **Núcleo:** `src/core/building/paredes.ts`.
  - *Armadura por pano* (K1.12.4.2-1, -2, -3, -4, -5): estado de tensões nos nós da casca por combinação → esforços de membrana e de placa → armadura vertical e horizontal por pano (região entre aberturas e pavimentos), aumentada em sequência até atender todas as combinações, com verificação das tensões no concreto e no aço; direção transversal (flexão fora do plano) com armadura adicional; taxas e espaçamentos mínimos e máximos e proporções (pilar-parede, NBR 6118 18.5 e 15.9 [a confirmar os itens]); esbeltez por pano (processo aproximado dos pilares-parede, 15.9.3) com aviso.
  - *Fator de cumprimento* (K1.4.60, K1.12.4.2-7, -8, -9): fração da área do pano que atende, padrão 90 % (referência), editável (`paredeCumprimento`); pontos que não atendem em vermelho com a armadura adicional local necessária; editar a armadura recalcula o fator.
  - *Emendas* (K1.4.59, K1.12.4.2-11): emenda tracionada ou comprimida conforme a armadura na seção; fator de ampliação pelo espaçamento das barras (9.5.2.2); comprimentos por pavimento editáveis, diferentes para tração e compressão.
  - *Aberturas* (C5.18, C5.13, C5.14, C5.15, C5.17): armadura de vergas, peitoris e cantos para os esforços (inclusive empuxo); armadura padrão de portas e de janelas copiada de uma abertura e aplicada a várias; edição por abertura; relatório das verificações.
  - *Opções de armar* (C5.26): armar sempre ou só quando necessário; só horizontal ou horizontal e vertical; tipo da armadura horizontal (barras corridas ou estribos/grampos).
  - *Mensagens* (K1.11.38, K1.12.4.2-10): códigos `PAREDE_*` (armadura não atende, esbeltez, taxas, cumprimento abaixo do exigido) com esforços mais desfavoráveis do trecho e resultantes por caso.
- **Comandos:** `parede.armadura` e `pilarParede.armadura` (editar e bloquear, como a R2; espessura editável), `parede.redimensionar`, `abertura.armadura` (editar, copiar, aplicar).
- **Interface:** na janela da parede ou do pilar-parede: isovalores de tensões normais e tangenciais por combinação e deslocamentos por caso, com mínimo e máximo (K1.11.36; SVG próprio por triângulo, sem esperar a frente V); armadura por pano editável com incompatibilidades em vermelho e "rearmar" (K1.11.37, K1.12.4.2-6); pontos sem cumprimento destacados.
- **Memorial:** armadura por pano, fator de cumprimento, emendas, aberturas e mensagens.
- **Pranchas:** prancha nova de paredes (K1.1.7, K1.11.61): elevação por trecho com tabela de armadura por pavimento, aberturas e quantitativos aproximados; sigla própria [a confirmar], na ordem do `montarConjunto` depois dos pilares. Pilares-parede no quadro de pilares, com o desenho das condições de estribos de pilares, muros e consolos (C4.62).
- **Testes de aceite:** parede sob compressão e flexão no plano contra cálculo manual por pano; fator de cumprimento 90 % × 80 % (armadura menor e pontos marcados); emenda tracionada × comprimida; verga de porta como viga; prancha de paredes (montagem, tabela de aço, DXF auditado); e2e `E1d`.

### E1e — Alvenaria estrutural e blocos de concreto (17 itens)

- **Itens:** C5.1, C5.3, C5.4, C5.6, C5.8, C5.11, C5.12, C5.16, C5.24, C5.25, C5.27, C5.29, C6.19, C6.59, K1.9.4, K1.9.5, K1.12.4.3-1.
- **Já existe (não refazer):** pesos de alvenaria (`BLOCOS` em `lajes.ts`, só carga); paredes, aberturas e casca (E1c); armadura por pano, aberturas e prancha de paredes (E1d); biblioteca do usuário (`storage.ts`).
- **Núcleo:**
  - *Tipos* (C5.1, C5.8, K1.9.4): parede de alvenaria genérica (E, G, peso específico, resistências de cálculo à compressão e à tração, opção de considerar a rigidez ao cisalhamento) e de blocos de concreto armada (C5.1). Blocos de catálogo de fabricante ficam fora; os blocos vêm da biblioteca do usuário.
  - *Blocos* (C5.3, C5.4, C5.25, K1.9.5): biblioteca de blocos (dimensões, meio bloco, peça de canto quando a largura não é metade do comprimento), resistência do bloco e da argamassa, prisma e graute; aço da armadura de junta (C5.24) por `materiais.definir`.
  - *Verificação* (K1.12.4.3-1): tensões-limite de compressão e de tração (tração = 10 % da compressão) com fator de cumprimento de 80 % (padrões registrados pela referência), resistências pela NBR 16868 [a confirmar as fórmulas]; aviso no relatório final.
  - *Aberturas e vergas* (C5.11, C5.12, C5.16): abertura ajustada à modulação dos blocos; verga verificada e armada nos muros de blocos (sem aviso de tensões excessivas nos de subsolo e de alvenaria genérica, como na referência); armadura padrão de vergas copiada e aplicada.
  - *Desligamento muro-pilar* (C5.27, C6.19): pilares em contato com muros de alvenaria ou blocos desligados do muro no nível do pavimento; o desligamento só vale com lajes de vigotas (aviso `MURO_PILAR_MACICA` sugerindo lançar o muro como elemento quando a laje é maciça).
  - *Vigas sobre muros* (C6.59): armadura opcional das vigas no nível das lajes sobre alvenaria genérica e das de coroamento em blocos; viga do muro de subsolo armada no topo; espessuras mínimas configuráveis.
  - *Quantitativos* (C5.29, C5.6): blocos inteiros e especiais (meio bloco, canto) por parede e pavimento; relatório de cálculo.
- **Comandos:** `alvenaria.tipo` e `bloco.tipo` (criar/editar/remover; gravar na biblioteca), `parede.criar/editar` com os tipos novos, `verga.armadura` (copiar e aplicar).
- **Interface:** editores de tipo de alvenaria e de bloco; na janela da parede, paginação dos blocos na elevação e verificação por ponto.
- **Memorial:** materiais da alvenaria, verificação, quantitativo de blocos.
- **Pranchas:** na prancha de paredes, elevação com a modulação e armaduras e esquema em planta dos blocos (C5.6) [a confirmar a representação].
- **Testes de aceite:** parede de blocos à compressão contra cálculo manual; tração 10 % e cumprimento 80 %; abertura modulada; quantitativo de meios blocos e cantos; desligamento muro-pilar; e2e `E1e`.

---

## Riscos e pontos que exigiriam o usuário

- **Fórmulas e tabelas da NBR 16868 e itens 15.9/18.5 da NBR 6118** entram "a confirmar" sem o texto da norma no ambiente; a execução segue.
- **Desempenho:** paredes em casca aumentam os gdl do pórtico; a malha (`malhaCasca`) é editável e o teste de desempenho do fechamento inclui um edifício com subsolo de muros.
- **Prancha de paredes:** não há folha de referência de paredes nem de alvenaria; o desenho segue o padrão das pranchas da R5 e fica "a confirmar" (como tubulão e radier na FU). Um exemplo de prancha de paredes do usuário fecharia o ponto.
- Nenhuma dependência nova.

## Andamento

- 21/10/2026: E1a concluída (13 itens: 12 Feito; K1.12.4-19 segue Falta porque o desnível — `Pilar.cotaBase` e `alturaApoio` — é da N2c, em paralelo). Entregue: apoio detectado (`transicao.ts`), `Pilar.inicio`, lance com ponto fixo, ângulo, deslocamento e fck próprios, `sobre` no `pilar.inserir`, nome "P5a", realce, coordenadas relativas e capturas na planta, ligação do pé no modelo (pilar: trecho rígido com N·e; viga: nó do pórtico e da grelha; laje: nó da grelha integrada, apoio fixo provisório no modelo separado), `engasteTransicao`, viga de transição verificada (`ResultadoViga.transicoes`), esperas ancoradas (ARRANQUE_ANCORAGEM), memorial e pranchas. Decisões: o primeiro lance de um pilar usa a geometria do pilar (os campos próprios valem do segundo lance em diante), para não divergir da fundação; lance com geometria própria liga-se ao de baixo por `offI` (a N2c generaliza o trecho rígido a todas as mudanças de centro); o pé de pilar sobre viga não é apoio da viga (sem momento negativo mínimo nem redistribuição ali); locação e cargas só listam os pilares que nascem na fundação. A confirmar: `engasteTransicao` 0,3 (NBR 1), gancho de 90° com 0,7·lb para as esperas, maior área em comum como apoio principal quando há vários pilares embaixo, carga localizada sobre a viga (N2e) e sobre a laje (punção do pilar apoiado em laje não verificada).
