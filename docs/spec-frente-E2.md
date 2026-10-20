# Spec — Frente E2 (vigas T, chatas, curvas, inclinadas, entre pavimentos, diagonais, consolos, viga comum a dois grupos, vínculo externo)

Base: 61 itens Parcial/Falta com frente E nos dois checklists (41 do manual do usuário, cap. 6 menos C6.19 e C6.59, que ficaram na E1e; 20 do de cálculo), conferidos por script em 20/10/2026: cada id está em exatamente uma fatia abaixo, sem sobra nem repetição. Nos checklists a frente continua "E" (o `checklists.test.ts` só aceita a letra) e a nota de cada item leva a fatia, ex. "[E2c]". Pronta para execução direta, sem aprovação por fatia (`plano-execucao.md`, "Regras de execução").

## Regras de toda a E2

- **Paridade de função, nunca de implementação.** Nomes, textos, tabelas, ícones e disposição de tela próprios.
- **Premissas.** Padrão do sistema = critério do programa de referência onde os checklists ou `pesquisa-edificios.md` o registram; NBR 6118 e 9062 (consolos e pré-moldados) onde não registram (`padraoNBR`/`fonteNBR` quando diferem); sem fonte = "a confirmar" no app e no memorial. Vigas e diagonais de aço, mistas e de madeira ficam fora (aço no edifício fora do escopo): a fatia entrega a parte de concreto e a nota do item registra "aço fora".
- **Opções** em `opcoes.ts`; **comandos** novos com `mcp: false`, schema, `validar`, mensagem e exemplo em `EXEMPLOS`; nenhuma ferramenta MCP nova (o `dimensionar` passa a listar inclinadas, diagonais e consolos nos resumos; `docs/ia.md` atualizado).
- **Modelo:** campos novos em `Viga` e coleções novas (`vigasInclinadas`, `diagonais`, `consolos`) em `BuildingModel`, com `normalizarEdificio`; gravados só quando diferem do padrão.
- **Interface** com `src/app/ui` e `global.css`; ferramentas na `Planta.tsx`; janelas de elemento como as da R1; vista 3D fica com a frente V (as janelas mostram elevação e seção em SVG).
- **Revisão:** códigos novos em `CODIGOS_REVISAO`; `TipoRevisao` ganha `inclinada`, `diagonal` e `consolo`.
- **Aceite de cada fatia:** testes numéricos contra cálculo manual ou solução analítica, regressão do exemplo (`src/core/sheets/exemplo.ts`, sem elementos novos nada muda), e2e próprio (`E2a` … `E2e`), memorial, pranchas e checklists atualizados; `checklists.test.ts` verde.

## Fatias

| Fatia | Conteúdo | Itens | Depende de |
|---|---|---|---|
| E2a | Seções: viga T/L com mesa colaborante, viga chata (faixa), viga não estrutural de contorno, viga de amarração, seções de vigas de fundação | 7 | FU6 (viga de fundação) só para C6.22 |
| E2b | Vigas curvas e poliviga, viga comum a dois grupos, ajuste a planos inclinados | 8 | R7f (compor/decompor, opcional); E3 (lajes inclinadas) só para as linhas de C6.58 |
| E2c | Vigas inclinadas entre pavimentos: modelo, cargas, dimensionamento à flexo-compressão oblíqua, edição, listagem, desenho | 20 | N2b (fora do diafragma), N2c (matriz 3D) |
| E2d | Diagonais de contraventamento simples e múltiplas | 11 | E2c |
| E2e | Consolos curtos, viga de vínculo externo (apoio em muro), vigas pré-moldadas | 15 | E1c (muros, para o uso típico do vínculo externo; não bloqueia) |

Ordem: E2a → E2b → E2c → E2d → E2e (onda 4 da lane 1, depois da E1).

---

### E2a — Seções T, chatas, não estruturais e de amarração (7 itens)

- **Itens:** C6.15, C6.16, C6.21, C6.22, K1.3.7, K1.4.28, K1.12.16.
- **Já existe (não refazer):** `Viga.secao` retangular, `invertida`, `nivel`; flexão em seção T com mesa comprimida no Pórtico 2D (`BeamSection` 'tee' e `beamFlexure` em `concrete.ts`); inércia de seção T (`inerciaT` em `analitico.ts`, usada nas treliçadas); detalhamento com montagem (`detalhamento.ts`).
- **Núcleo:**
  - *T e L* (C6.16, K1.3.7): `Viga.secao.tipo` = `ret` | `T` | `L` com `bf`/`hf` informados, ou mesa colaborante automática (`mesaColaborante`), com a largura da NBR 6118, 14.6.2.2 (b1 ≤ 0,1a e metade da distância à viga vizinha; a = distância entre momentos nulos). A mesa entra na rigidez (grelha e pórtico); a armadura usa só a alma (padrão do sistema, referência); opção `mesaDimensionamento` = 1 dimensiona à flexão em seção T quando a mesa está comprimida (permitido pela NBR). Seções de biblioteca de aço e madeira: fora.
  - *Barras de canto da mesa* (K1.12.16): em seção T com estribos, barras adicionais nos cantos dos estribos dentro da mesa (bitola de montagem) no detalhamento.
  - *Viga chata* (C6.15): `tipo` = `chata`, altura igual à da laje que contorna (ou ao desnível entre o ponto mais alto e o mais baixo, quando há desnível); dimensionada como viga; punção e estribos de viga chata larga ficam na N2d.
  - *Não estrutural* (C6.21): `Viga.estrutural = false` só fecha o contorno do pano (borda livre da laje no cálculo); não entra na grelha nem no pórtico.
  - *Amarração (encadeado)* (K1.4.28): `Viga.amarracao` com EI vertical × 1e-15, plano e EA rígidos (penalidade), GJ × coeficiente das vigas.
  - *Vigas de fundação* (C6.22): seções retangular, L, T e plana (esta para fechar panos de radier) para as vigas de fundação da FU6.
  - Código `VIGA_NAO_ESTRUTURAL_CARGA` (aviso quando recebe carga).
- **Comandos:** `viga.editar` e `viga.atribuir` ampliados (`secao.tipo`, `bf`, `hf`, `mesaColaborante`, `estrutural`, `amarracao`).
- **Interface:** editor de seção com tipo e mesa (prévia SVG); viga chata e não estrutural com traço próprio na planta; atributos em lote.
- **Memorial:** largura colaborante por viga, critério de dimensionamento, vigas não estruturais e de amarração.
- **Pranchas:** seção T/L desenhada na prancha de vigas com as barras de canto; viga não estrutural fora da prancha de vigas.
- **Testes de aceite:** inércia T com mesa automática contra cálculo manual; flexão pela alma × pela T; altura da chata; pano fechado por viga não estrutural (borda livre); amarração sem flexão vertical; e2e `E2a`.

### E2b — Vigas curvas e viga comum a dois grupos (8 itens)

- **Itens:** C6.12, C6.13, C6.32, C6.47, C6.48, C6.49, C6.50, C6.58.
- **Já existe (não refazer):** viga por polilinha com alinhamento (`viga.tracar`), `viga.copiarParaGrupos`, `viga.dividir/unir/prolongar`; arcos lidos da máscara (`CamadaGeo.arcos`) e capturas.
- **Núcleo:**
  - *Curva* (C6.12, C6.13): trecho curvo por três pontos (início, passagem, fim) em `Viga.arcos` (índice do trecho e ponto de passagem), discretizado em poligonal de trechos retos com corda máxima `curvaSegmento` [a confirmar o padrão]; trechos retos e curvos alternados no traçado contínuo.
  - *Poliviga* (C6.32): viga curva agrupada como uma viga e um tramo de armadura por padrão, com compor e decompor (reaproveita o agrupamento da R7f, se já existir; senão, campo `Viga.tramoUnico`).
  - *Viga comum a dois grupos* (C6.47–C6.50): `Viga.comum = { grupo, trecho? }`: lançada uma vez, criada (vinculada) no outro grupo; uma barra só no pórtico, que recebe as lajes dos dois grupos; eixo em traço-ponto no grupo associado; armadura e envoltórias consultadas no grupo de origem; pode ser comum só em parte do comprimento, cada parte a um grupo; desfazer devolve as duas vigas originais (no grupo associado).
  - *Ajuste a planos inclinados* (C6.58): função que leva os pontos da viga à interseção de dois planos ou à linha de máxima declividade; as linhas indicativas na planta aparecem quando a E3 criar lajes inclinadas (até lá, ajuste por cotas informadas).
- **Comandos:** `viga.tracar` ampliado (trechos curvos), `viga.comum` (criar/desfazer), `viga.ajustarPlano`, `viga.tramo` (compor/decompor).
- **Interface:** alternância reta/curva por tecla no traçado; viga comum em traço-ponto; atalho para abrir o grupo de origem.
- **Memorial:** vigas curvas (raio, discretização) e comuns (grupos).
- **Pranchas:** viga curva desenhada desenvolvida na prancha de vigas [a confirmar a representação]; comum só no grupo de origem.
- **Testes de aceite:** viga curva biengastada sob carga uniforme contra a solução analítica (momento torçor); discretização pela corda; viga comum com cargas de dois grupos igual à viga única equivalente; desfazer; e2e `E2b`.

### E2c — Vigas inclinadas entre pavimentos (20 itens)

- **Itens:** C6.35, C6.68, C6.69, C6.70, C6.71, C6.72, C6.74, C6.102, C6.107, K1.3.16, K1.4.25, K1.4.88, K1.9.114, K1.11.48, K1.12.2-1, K1.12.2-2, K1.12.2-3, K1.12.2-4, K1.12.2-5, K1.12.2-6.
- **Já existe (não refazer):** barras 3D quaisquer, liberações e engaste parcial (`fe3d.ts`); flexo-compressão oblíqua por fibras (`fiber.ts`, `columnGeneral.ts`); estribos e cortante (`beamShear`, `chooseStirrup`); infraestrutura de envoltórias e janelas de elemento (R1), bloqueio (R2) e pranchas de vigas (R5); matriz geométrica 3D (N2c); regra do diafragma (N2b).
- **Núcleo:**
  - *Modelo* (C6.35, K1.3.16, K1.4.25, K1.9.114): `vigasInclinadas[]` com grupo inicial e final, pontos e cotas das pontas, seção b × h de concreto (aço fora), simples ou múltipla (uma por pavimento entre os grupos), ligações engastadas ou articuladas; barra de 2 nós com 6 gdl, ligada a nó existente (pilar ou viga; cria nó na viga se preciso), sem diafragma; EI bruto nas duas direções, GJ × coeficiente das vigas, EA bruto. Cargas próprias: concentrada, linear, em faixa e triangular, por caso.
  - *Flambagem* (K1.4.88): coeficientes por plano (vertical e transversal) sobre o comprimento entre nós; esbeltez verificada.
  - *Dimensionamento* (K1.12.2-1 … -6): flexo-compressão oblíqua pela envoltória de M e N ao longo da barra; armadura nos dois planos paralelos às faces (vertical e horizontal); superior e inferior = máximo da envoltória; estribos pelo cortante; detalhe dos nós de extremidade a cargo do projetista (aviso no memorial); listagem opcional da envoltória para estudo das ligações.
  - Códigos `INCLINADA_*` (armadura, esbeltez, biela).
- **Comandos:** `inclinada.criar/editar/remover/mover`, `inclinada.armadura` (editar e bloquear, C6.102), `inclinada.redimensionar` (todas, com os esforços do último cálculo, C6.74).
- **Interface:** lançamento por dois cliques com grupos inicial e final; informação (tipo, pavimentos, seção, armadura, vínculos, flambagem, C6.69); listagem de materiais, esforços por caso e combinação, envoltórias e resultado (C6.70, K1.11.48); com erro em vermelho e detalhe por clique (C6.68, C6.71); editor de geometria e armadura com verificar, dimensionar e detalhar; elevação e seção em SVG (a vista 3D pedida em C6.72 vem com a frente V).
- **Memorial:** lista de inclinadas, envoltórias, armaduras e aviso dos nós.
- **Pranchas:** desenho da armadura (elevação desenvolvida e seções) na prancha de vigas do grupo inicial (C6.107, K1.12.2-5) [a confirmar a representação].
- **Testes de aceite:** inclinada biapoiada sob peso próprio (N, V, M) contra cálculo manual; inclinada que liga zonas independentes sem impor diafragma; flexo-compressão oblíqua contra as fibras; múltipla gera uma por pavimento; e2e `E2c`.

### E2d — Diagonais de contraventamento (11 itens)

- **Itens:** C6.36, C6.37, C6.38, C6.39, C6.40, C6.41, C6.42, C6.43, C6.44, C6.45, C6.46.
- **Já existe (não refazer):** infraestrutura das inclinadas (E2c: barra entre grupos, flambagem por plano, dimensionamento por fibras, janelas, prancha).
- **Núcleo:**
  - `diagonais[]` com grupos inicial e final, podendo atravessar grupos intermediários (C6.36); simples ou múltipla, uma por pavimento (C6.37); concreto (largura e altura) — perfil de aço fora (C6.38); ligações engastadas ou articuladas (C6.39); flambagem vertical e transversal sobre o comprimento total entre nós, em planos globais, sem redução pelo cruzamento (C6.40).
  - Nó gerado no cruzamento de diagonais; dimensionamento à tração e à compressão com esbeltez máxima da norma (C6.43).
  - Apagar em todos os grupos quando múltipla (C6.44); editar, mover extremos e atribuir valem só no grupo atual (C6.46); copiar dados de outra diagonal (C6.41).
  - Códigos `DIAGONAL_*`.
- **Comandos:** `diagonal.criar/editar/remover/mover/atribuir`.
- **Interface:** lançamento por dois cliques sem trocar de pavimento, com setas indicando a diagonal na planta (C6.42); informação com tipo, grupos, comprimento real, seção, ligações e flambagem (C6.45).
- **Memorial:** diagonais e verificações.
- **Pranchas:** diagonais desenhadas na prancha de vigas do grupo inicial (C6.45).
- **Testes de aceite:** treliça plana de contraventamento (esforços nas diagonais) contra cálculo manual; cruzamento gera nó sem reduzir ℓe; múltipla e apagar em todos; e2e `E2d`.

### E2e — Consolos, vínculo externo e vigas pré-moldadas (15 itens)

- **Itens:** C6.17, C6.18, C6.54, C6.55, C6.56, C6.57, C6.100, C6.101, C6.108, K1.3.9, K1.3.10, K1.3.17, K1.4.29, K1.4.62, K1.4.66.
- **Já existe (não refazer):** apoios, molas e liberações no `fe3d`; `Viga.vinculoIni/vinculoFim` e engaste parcial (N1a); bielas e tirantes dos blocos (`caps.ts`, como referência de método); quadro e prancha de pilares (R5); γc editável e controle `premoldado` (N2a).
- **Núcleo:**
  - *Consolo curto* (C6.54–C6.57, K1.3.17, K1.4.62): `consolos[]` ligados a pilar e face, com a viga que apoia, geometria (largura, altura na face e na ponta, distância a da carga) e área do aparelho de apoio; não servem para apoiar pilares. Modelo: apoio fixo interno no centro do aparelho, só carga vertical transmitida, viga desligada da face do pilar (sem momento nem cortante). Dimensionamento pela NBR 6118, 22.5 e NBR 9062 (muito curto a < 0,5d por atrito-cisalhamento; curto 0,5d ≤ a ≤ d por biela e tirante; a > d como viga em balanço), força horizontal mínima no aparelho pela NBR 9062 [a confirmar os valores], tirante, estribos horizontais e verticais e ancoragem do tirante. Opções de consolo nas opções de pilar.
  - *Verificação e redimensionamento* (C6.100, C6.101): consolos com erro em vermelho com relatório; redimensionar todos com os esforços do último cálculo.
  - *Vínculo externo e apoio em muro* (C6.18, K1.3.9, K1.3.10, K1.4.29): `Viga.vinculoExterno` = `engaste` | `articulacao` | `deslizante` (só vertical impedido): apoios em todos os nós de discretização com rigidez aumentada (EI × 100 e plano e EA rígidos, como a referência), simulando o topo de um muro; pilares coincidentes desligados para não travar o deslocamento vertical (aviso `VINCULO_PILAR`).
  - *Pré-moldadas* (C6.17, K1.4.66): vigas pré-moldadas armadas (NBR 9062: γc do controle, ligações articuladas por padrão, verificação de içamento [a confirmar]) e vigas protendidas ou treliçadas pré-fabricadas com propriedades informadas (rigidez, momentos e cortante resistentes de ficha do usuário), só verificadas.
  - Códigos `CONSOLO_*`, `PREMOLDADA_*`.
- **Comandos:** `consolo.criar/editar/remover`, `consolo.redimensionar`, `viga.editar` ampliado (`vinculoExterno`, `premoldada`).
- **Interface:** lançamento do consolo (viga até a face, tipo e geometria, clique na face do pilar); editor; erros e relatório; vínculo externo e pré-moldada no editor da viga.
- **Memorial:** consolos (geometria, método, tirante, estribos), vigas com vínculo externo, pré-moldadas.
- **Pranchas:** desenho de consolos com vistas frontal e lateral cotadas, armadura principal e estribos, medidas e referências do pilar e da viga (C6.108), na prancha de pilares.
- **Testes de aceite:** consolo curto e muito curto contra cálculo manual (tirante e estribos); viga sobre vínculo externo contínuo igual à viga com apoios a cada nó; deslizante sem reação horizontal; pré-moldada com propriedades de ficha; e2e `E2e`.

---

## Riscos e pontos que exigiriam o usuário

- **Representação nas pranchas** de vigas curvas, inclinadas, diagonais e consolos: não há folha de referência; seguem o padrão das pranchas da R5 e ficam "a confirmar". Um exemplo de prancha do usuário com consolos ou vigas inclinadas fecharia o ponto.
- **Valores da NBR 9062** (força horizontal mínima no aparelho, içamento) entram "a confirmar" sem o texto da norma no ambiente.
- Nenhuma dependência nova.
