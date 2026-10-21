# Plano: itens do FreeCAD a absorver no Statikos (validação externa e QA)

Somente leitura do new-toll. Regra geral: FreeCAD (LGPL-2.1+), CalculiX (GPL), Gmsh (GPL), IfcOpenShell (LGPL) e ezdxf (MIT) entram só como FERRAMENTAS EXTERNAS de validação, em scripts Python em `validation/<ferramenta>/` (fora do `npm test` e do build), no mesmo padrão de `validation/opensees/*.py` -> `*.json` commitado -> teste vitest que compara (ex.: `integrado.test.ts`, `radier` em `baseElastica.test.ts`). Nada do código do FreeCAD é copiado; os arquivos dele servem para ver a sintaxe do `.inp`/IFC e quais casos um validador cobre. A sintaxe canônica do CalculiX vem do manual do CalculiX, não do FreeCAD. Nada é embutido no app nem em `package.json`. Classes de agente: tabela de `docs/plano-execucao.md` (H, S1, S2, S3, O). Estimativas em dias de trabalho do agente + verificação.

Estado de partida (verificado):
- `validation/opensees/`: portico3d, pdelta3d, integrado, radier (ShellMITC4 quad), sapata_associada, bloco_multi. Nenhum validador usa casca TRIANGULAR de 6 nós nem sólido. `casca.ts` (T6) só é testado contra soluções analíticas (Mindlin, Timoshenko) em `src/core/casca.test.ts`; o `integrado.py` confere montagem (2e-11), não a formulação do elemento.
- `validation/dxf/auditar.py`: só `ezdxf.readfile` estrito + `audit()` (estrutura), sem conferir conteúdo.
- `src/core/dxf/read.ts` (leitor de máscara) testado só com DXF escritos à mão em `read.test.ts`.
- IFC: nada em `src/` (L3 não começou); `public/vendor` não tem web-ifc.
- Pranchas: `sheets/armacao.ts` tem `cotaHorizontal/Vertical`, `nivel`, `notas`, tabelas; HATCH só SOLID (`dxf.ts` l.139, `dwg.ts` l.14, `pdf.ts` l.53).
- Vibração/flambagem: `secondorder.ts` (pórtico plano, aba Modos) e `pdelta3.ts` (P-Δ 3D, validado no OpenSees). Não há análise modal nem flambagem global do edifício 3D.

## Prioridade (ganho/esforço)

| # | Item | Esforço | Classe | Ganho principal | Fecha / apoia | Frente |
|---|---|---|---|---|---|---|
| 1 | DXF: QA independente de conteúdo + fixtures de leitura (ezdxf) | 1,5 d | S1 | pega erro de camada, extensão, texto, HATCH e viewport nas pranchas; testa `lerDxf` com DXF reais de outras origens | apoia C1.18, C1.21, C2.22, K1.11.54; reduz a pendência do AUDIT no AutoCAD | L2, R7g, V5 |
| 2 | Fixtures IFC (IfcOpenShell) para a L3 | 1,5 d | S1 | testa o importador com variações que um STEP escrito à mão não cobre | apoia C1.22, C1.23 | L3 |
| 3 | CalculiX: casca T6 / laje+vigas / radier | 3 d | S2 (O se achar divergência) | 1ª validação independente da formulação de `casca.ts` (T6, drilling, cisalhamento de Mindlin); dá base à E1c | apoia K1.2.1, K1.2.5, K1.3.36, K1.3.35; pré-requisito da E1c | N2b, E1c, FU6 |
| 4 | Viga-parede 2D: calibrar o aviso ℓ/h | 1,5 d | S2 | mostra a partir de qual ℓ/h o modelo linear erra; define o limiar | fecha K1.12.1-17 e K1.3.47 (com o aviso) | N2e, E2 |
| 5 | Punção: distribuição elástica de cisalhamento em casca | 3,5 d | S3 | confere Wp, K e a fração de momento de pilar de borda/canto | resolve "a confirmar" da N2d; apoia K1.9.8 | N2d (fechamento) |
| 6 | Bloco de estacas: sólido C3D20 vs bielas | 3 d | S3 | mede o conservadorismo (+14 a +132 % do `bloco_multi.py`) e dá critério para refinar | apoia C11.x do bloco multi-pilar | FU3 (fechamento) |
| 7 | Gmsh vs `malhaTri.ts` | 1,5 d | S1 | qualidade (ângulo mínimo, razão de aspecto), refinamento junto a pilares/furos, convergência de M junto ao pilar | apoia K1.3.35 | N2b |
| 8 | Recursos de cotas e hachuras (TechDraw como checklist) | 3 d | S2 | concreto em corte hachurado, cota radial/diametral/angular, chamada (leader), linha de centro, precisão e tolerância de cota | apoia K1.4.57, K1.11.54 | V5, R7g |
| 9 | Benchmarks de vibração e flambagem | 1 d | S1 | cruza `secondorder.ts` com OpenSees (3D) e placa; sem análise modal 3D no edifício, o ganho é baixo | nenhum item aberto | (extra) |
| 10 | Exportação IFC (físico e analítico) | 4 d | S2 | interoperabilidade de saída; hoje não há item de checklist para exportar IFC | nenhum (proposta nova) | L3b (nova) / V |

Ordem sugerida: 1, 2, 3 (+7 no mesmo script de malha), 4, depois 5 e 6 no fechamento das frentes N2d/FU3, 8 junto da V5/R7g; 9 e 10 só sob demanda.

## 1. Leitor DXF independente (QA das pranchas e do leitor)
- FreeCAD faz: `src/Mod/Import/App/dxf/dxf.cpp` e `ImpExpDxf.cpp` (importador C++ que lê AC1006 a AC1015), `src/Mod/Draft/importDXF.py`, `drafttests/test_dxf.py`. Mostra a lista de entidades que um leitor tolerante trata (LWPOLYLINE com bulge, SPLINE, INSERT aninhado, HATCH, unidades por $INSUNITS).
- Temos: `validation/dxf/auditar.py` (estrutura apenas); `src/core/dxf/read.ts` (`lerDxf`) com `read.test.ts`; `sheets/dxf.ts` (R2000, handles, LAYOUT, VIEWPORT).
- Implementar:
  - Ampliar `validation/dxf/auditar.py` para ler com ezdxf e comparar com o que o Statikos declara: opção `--esperado prancha.json` (a CLI `prancha` já tem as primitivas; novo flag `--manifesto` na CLI grava camadas, nº de entidades por tipo, extensão em mm e textos). O script confere: todas as camadas esperadas existem e só elas; extensão do desenho dentro do papel (A0 a A4 menos margens); altura de texto 2 a 3 mm; nenhuma entidade com coordenada NaN/infinita; HATCH com laço fechado; LAYOUT/VIEWPORT coerentes; `$INSUNITS`; contagem de entidades igual ao modelo da prancha.
  - Novo `validation/dxf/gerar_fixtures.py` (ezdxf cria DXF R12, R2000, R2010, R2018 com LWPOLYLINE/bulge, ARC, SPLINE, INSERT aninhado com escala negativa, DIMENSION, MTEXT, unidades mm/cm/m) gravados em `src/core/dxf/fixtures/` (pequenos, ficticios) e novo caso em `read.test.ts` que confere segmentos e bbox esperados (ground truth saído do ezdxf). Isto é o teste que falta para a L2 (C1.18, C1.21).
  - Opcional, manual: abrir o mesmo DXF no FreeCAD/LibreCAD só como 2º leitor (não automatizar; pesado). Não substitui o AutoCAD.
- Arquivos: alterado `validation/dxf/auditar.py`, `src/cli/` (flag `--manifesto`), novo `validation/dxf/gerar_fixtures.py`, `src/core/dxf/fixtures/*.dxf`, alterado `read.test.ts`. Dependência: ezdxf (já usada). Fora do `npm test` só o script; o teste das fixtures roda no vitest (arquivos commitados).
- Esforço: 1,5 d, S1 (escopo claro, sem núcleo novo).
- Ganho: pega regressão silenciosa nas pranchas (R5/FU5) que o `audit()` não vê; dá massa de teste real ao leitor da L2. Não fecha a pendência do AutoCAD, só a reduz.

## 2. Fixtures IFC (IfcOpenShell) para a L3
- FreeCAD faz: `src/Mod/BIM/importers/importIFC.py`, `importIFCHelper.py`, `exportIFC.py`, `bimtests/TestArchImportersGui.py`, `importers/samples/`: roundtrip de IFC2X3/IFC4 gerado pelo IfcOpenShell. Os testes dele só dizem quais variantes importam (extrusão, mapped item, booleano de abertura, tipos).
- Temos: nada ainda; a spec `docs/spec-frente-L.md` L3 prevê UM arquivo STEP escrito à mão (<= 20 KB) e `web-ifc` como leitor.
- Implementar: `validation/ifc/gerar_fixtures.py` (IfcOpenShell, `ifcopenshell.api`) cria, a partir de uma descrição JSON do edifício fictício (2 pavimentos, pilares retangular/circular/poligonal, 4 vigas, laje com abertura, 2 materiais C30/CA-50), variações: IFC2X3 e IFC4; perfil `IfcRectangleProfileDef` e `IfcArbitraryClosedProfileDef`; `IfcMappedItem` (tipo compartilhado); abertura por `IfcOpeningElement`; unidades mm e m; placement aninhado com rotação; viga com representação `Axis`; material como `IfcMaterialLayerSet` e `IfcMaterial` por nome ("C30"); um elemento sem extrusão (BREP) para exercitar `IFC_APROXIMADO`. Gera também um `esperado.json` (posições, seções, ângulos, GUIDs) que o teste da L3 usa como ground truth. Ferramenta extra: `ifcopenshell.validate` para checar o IFC antes de commitar. Saída: `src/core/ifc/fixtures/*.ifc` (cada um <= 30 KB) e `esperado.json`.
- Arquivos novos: `validation/ifc/gerar_fixtures.py`, `validation/ifc/README` curto (cabeçalho do script), fixtures; o teste vive na L3 (`src/core/ifc/ler.test.ts`). Dependência: IfcOpenShell só no Python do dev; web-ifc continua a única dependência do app (já aceita).
- Esforço: 1,5 d, S1 (script + dados). A L3 em si continua S2 (2 d).
- Ganho: reduz o risco da L3 (mapeamento de pavimento/seção/ângulo, unidades, aberturas) com variantes reais de exportadores diferentes; sem isso, só um arquivo escrito à mão cobre o parser. Apoia C1.22 e C1.23.
- Mapeamento IFC -> modelo (para a L3, referência): IfcBuildingStorey -> pavimento (cota); IfcColumn -> pilar; IfcBeam -> viga; IfcSlab -> laje (+ IfcOpeningElement -> furo); IfcFooting/IfcPile -> `fundacao` (FU); IfcWall -> parede (E1c); IfcMaterial/IfcMaterialLayerSet -> `fckElem`/`acoPos`. Psets: `Pset_ColumnCommon`, `Pset_BeamCommon`, `Pset_SlabCommon` (LoadBearing, IsExternal, FireRating), `Pset_ConcreteElementGeneral` (ConstructionMethod, StrengthClass).

## 3. CalculiX: casca T6, laje+vigas e radier (validação cruzada)
- FreeCAD faz: escreve `.inp` do CalculiX a partir do modelo FEM. Referências de sintaxe: `src/Mod/Fem/femsolver/calculix/write_mesh.py` (tipos S6/S8/C3D20/B32R), `write_femelement_geometry.py` (`*SHELL SECTION`), `write_constraint_*.py`, exemplos `femexamples/ccx_cantilever_ele_tria6.py`, `ccx_cantilever_ele_quad8.py`, `ccx_cantilever_ele_hexa20.py`, `ccx_plane_stress_plate.py`, `mesh_buckling_plate_tria6.py`, `femtest/data/calculix/*.inp`.
- Temos: `src/core/casca.ts` (T6), `fe3d.ts` (barras 3D, molas, cascas), `geom/malhaTri.ts`, `validation/opensees/radier.py` (ShellMITC4 + molas), `integrado.py` (montagem), `casca.test.ts` (analítico). Nenhum comparativo independente do T6.
- Implementar `validation/calculix/` com `casca_placa.py`, `casca_parede.py`, `laje_vigas.py`, `radier_sk.py`:
  - Escrever o `.inp` em Python puro (sem FreeCAD): malha T6 exportada do Statikos (script Node `scripts/exportar-malha-validacao.mjs` grava nós/conectividade JSON a partir de `malhaTriangular` + `paraT6`, para as duas ferramentas usarem a MESMA malha), `*ELEMENT, TYPE=S6`, `*SHELL SECTION`, `*SPRING1`/`*SPRING` para o Winkler, `B32` para vigas, `*NODE FILE`/`*EL PRINT`.
  - Casos: (a) placa quadrada apoiada e engastada, carga uniforme, com h/L = 1/20 e 1/5 (espessa: cisalhamento); (b) parede em balanço (viga-parede curta) com carga no topo; (c) laje com 4 vigas (B32) e pilares, comparação do deslocamento e do momento nas vigas com o modelo integrado do `analitico.ts`; (d) radier do `radier.py` com a mesma malha, k e P (comparação de w no centro e momento) - ganho extra de terceiro validador sobre o OpenSees.
  - Resultado: `*.json` commitado (w, M nos pontos, reações) e novo bloco `describe('validação externa: CalculiX')` em `casca.test.ts` e `integrado.test.ts`. Tolerância alvo: w < 1 %, M < 3 % em malha igual; qualquer desvio maior escala para O (investigar drilling/cisalhamento).
- Arquivos novos: `validation/calculix/*.py`, `scripts/exportar-malha-validacao.mjs`, JSONs; alterados os testes acima. Dependência: `ccx` (CalculiX, GPL, apt/conda, só na máquina do dev). Fora do `npm test` (só o JSON entra). Não embute nada.
- Esforço: 3 d, S2 para o script e a bateria; O se aparecer divergência de formulação.
- Ganho: único jeito de pegar erro de formulação do T6 (travamento por cisalhamento, rigidez de drilling, fator de correção) que o OpenSees MITC4 e a analítica não pegam (T6 x quad). Lembrete do CLAUDE.md: V2 Mpos -11 %/Mneg -7,6 % do integrado "causa não isolada"; este comparativo isola se é o elemento ou o modelo. Fecha o risco antes da E1c (paredes e empuxo viram cascas). Apoia K1.2.1, K1.2.5, K1.3.36.

## 4. Viga-parede 2D: calibrar o aviso
- FreeCAD faz: `femexamples/rc_wall_2d.py`, `ccx_plane_stress_plate.py` (parede em estado plano de tensão via CalculiX) e `Fem/femobjects/material_reinforced.py`; sem norma de concreto.
- Temos: nada para viga-parede; N2e ainda sem implementar (K1.12.1-17 e K1.3.47 estão Falta, frente N2e: "aviso de viga-parede, NBR 6118 22.4").
- Implementar: `validation/calculix/viga_parede.py`: viga biapoiada e biengastada com ℓ/h = 0,5; 1; 1,5; 2; 3; 4; 6, estado plano (CPS8) com E, ν do Statikos e carga uniforme no topo; extrai flecha, braço de alavanca z = M/T (tração do banzo inferior integrada), momento de apoio. Compara com o elemento de viga (Euler-Bernoulli e Timoshenko do `element.ts`/`fe3d.ts`). Saída `viga_parede.json` + teste `src/core/building/vigaParede.test.ts` que fixa o limiar (provavelmente ℓ/h < 2 para o aviso e a tabela de erro do modelo linear vs 2D), e um caso para o aviso do `revisao.ts` (código novo `VIGA_PAREDE`). Isto serve de base numérica quando a E2 implementar o dimensionamento por bielas (22.2).
- Dependência: ccx. Esforço: 1,5 d, S2.
- Ganho: transforma o limiar do aviso (hoje só texto de norma) em fato medido; fecha K1.12.1-17 e K1.3.47 junto do aviso da N2e. Registrar a norma (22.2 da NBR 6118, numeração a confirmar) e o resultado no `premissas.ts`.

## 5. Punção por casca: distribuição elástica de cisalhamento
- FreeCAD faz: nada específico (sem punção). Só o ciclo CalculiX com casca/sólido.
- Temos: `puncao.ts` (`verificarPuncao`, Wp numérico, K da Tabela 19.2) testado por cálculo manual em `puncao.test.ts`. "A confirmar": Wp de borda/canto ≈ metade da fórmula (conservador), K de borda/canto, espaçamento tangencial.
- Implementar `validation/calculix/puncao.py`: laje maciça com pilar interno, de borda e de canto, malha refinada em S8 (ou C3D20R para laje espessa), carga uniforme + momento no pilar; integra o fluxo de cisalhamento q_n ao longo do contorno C' (a 2d da face) e calcula a fração do momento transmitida por cisalhamento (equivale a K) e o máximo de τ. Compara com τSd = FSd/(u·d) + K·MSd/(Wp·d) do `puncao.ts`. O sólido evita a singularidade da casca no pilar (usar contorno afastado, nunca a face). Saída JSON + teste de tolerância documentado (ex.: elástico <= NBR em +-15 %, a NBR é aproximada por natureza).
- Esforço: 3,5 d, S3 (interpretação e escolha do contorno).
- Ganho: apoia/encerra os "a confirmar" da N2d com dado, em vez de manter o fator conservador de 1/2; risco evitado: armadura de punção subdimensionada em pilar de borda/canto. Apoia K1.9.8. Não substitui o ensaio nem a norma; ajusta a premissa e fica no memorial.

## 6. Bloco de estacas: sólido C3D20 vs bielas e tirantes
- FreeCAD faz: `ccx_cantilever_ele_hexa20.py`, `ccx_cantilever_base_solid.py` (sólido hexa20, malha estruturada).
- Temos: `caps.ts` (bielas e tirantes, `CapInput.cols`), `bloco_multi.py` (OpenSees, treliça/casca) com tirante +14 a +16 % (pilares iguais) e até +132 % (cargas diferentes, Rmáx em todas as estacas - "refinar com o sinal do momento no fechamento").
- Implementar `validation/calculix/bloco.py`: bloco de 2, 3, 4 e 6 estacas com pilar único e com 2 pilares, sólido (C3D10 do Gmsh ou C3D20), estacas como apoios nodais; integra a resultante de tração na zona do tirante (tensão normal na seção de corte sob o pilar) e compara com `Rst` de `caps.ts`. Gmsh gera a malha tetraédrica (item 7).
- Esforço: 3 d, S3. Dependência: ccx, gmsh.
- Ganho: dá o número que falta para decidir o refinamento do tirante com cargas desiguais; hoje o app é conservador sem medida. Apoia o item de bloco multi-pilar (FU3, fechamento) sem criar premissa nova: qualquer mudança no critério volta ao usuário.

## 7. Gmsh vs `malhaTri.ts`
- FreeCAD faz: `src/Mod/Fem/femmesh/gmshtools.py` (monta o `.geo`/`.msh`, tamanho por entidade, campo de refinamento, Tri6/Tet10), `femexamples/gmsh_adaptive.py`, `gmsh_transfinite_*.py`.
- Temos: `malhaTri.ts` (Delaunay Bowyer-Watson, tamanho local por função, refino junto a cantos/obrigatórios com `refino`, suavização de Laplace), `qualidadeMalha` (só ângulo mínimo e área).
- Implementar `validation/malha/comparar.py` + `scripts/malha-statikos.mjs`: geometrias de teste (retângulo com 4 pilares, L, laje com furo circular e retangular, laje com pontos obrigatórios nas chegadas de viga); Gmsh gera malha com tamanho e refino equivalentes; compara nº de elementos, ângulo mínimo, razão de aspecto máxima, desvio de área (cobertura do domínio), e a convergência de uma grandeza (momento a 1 espessura do pilar e flecha máxima) com `casca.ts` nas duas malhas contra uma malha muito fina de referência. Saída: relatório em tabela (JSON + Markdown local); teste vitest com limites mínimos para `qualidadeMalha` ampliada (razão de aspecto, nº de nós por pilar) como regressão de `malhaTri.ts`.
- Esforço: 1,5 d, S1 (script + métricas). Dependência: gmsh (pip). Não entra no app.
- Ganho: mede se o refino junto a pilares e furos é suficiente (a singularidade do momento sob o pilar domina o resultado do Wood-Armer na N2b) e pega malhas ruins (ângulo < 20 °) que hoje só são vistas pelo `anguloMin`. Apoia K1.3.35.

## 8. Cotas e hachuras: o que falta nas nossas pranchas (TechDraw como checklist)
- FreeCAD faz (caminhos): `src/Mod/TechDraw/App/DimensionFormatter.*` (formato printf/std::format, precisão, prefixo/sufixo, tolerância +/-, unidade), `DrawViewDimension.*` (linear, radial, diametral, angular, comprimento de arco, encadeada, baseline, coordenada), `DimensionGeometry.*`, `DimensionReferences.*`, `DrawHatch.*`/`DrawGeomHatch.*`/`HatchLine.*` e `PAT/FCPAT.pat` (padrões Diamond, Diagonal, Square, Horizontal, Vertical), `DrawLeaderLine.*` e `DrawViewBalloon.*` (chamada com seta e balão numerado), `CenterLine.*` (linha de centro), `DrawViewSection.*`/`DrawViewDetail.*` (corte e detalhe com símbolo), `DrawTileWeld.*` (solda; irrelevante). Templates só ISO/ASME.
- Temos: `sheets/armacao.ts`: `cotaHorizontal`, `cotaVertical` (cadeia com traços oblíquos, texto em cm), `nivel`, `notas`, tabelas de aço, legenda; `Prim` = `pl`, `circ`, `txt`, `hach` (preenchimento sólido só). `app/dims.ts` (cotas automáticas da planta).
- Falta (lista priorizada para as pranchas):
  1. Hachura por padrão (diagonal 45 graus para concreto em corte, NBR 12298/6492; `HATCH` com `patternName` e `scale` no DXF/DWG; hoje só SOLID). Em `Prim`: `t: 'hach'` ganha `padrao?: 'solido' | 'diag' | 'cruz' | ...`, `angulo`, `esp`. PDF/SVG desenham as linhas recortadas pelo laço (ou usam o padrão do DXF).
  2. Cotas radial/diametral (pilar circular, estaca, tubulão), angular (viga inclinada na E2) e de coordenadas; hoje só lineares.
  3. Chamada com seta (leader) e balão de posição (n de peça N1, N2 nas armaduras); hoje o texto fica solto.
  4. Linha de centro/eixos de pilar e símbolo de corte e detalhe (NBR 10067) com letra e sentido; hoje só nas formas.
  5. Formatação de cota configurável: casas decimais, arredondamento (5 cm), sufixo de unidade, tolerância opcional; hoje fixa em `cotaCm`.
  6. Hachura de pilar que morre/nasce (K1.4.57): padrões distintos (cruz, tracejado) em vez do preenchimento único.
- Implementar: `Prim` ampliado em `sheets/prancha.ts`; escritores `dxf.ts`/`dwg.ts`/`pdf.ts`/`svg.ts`/`papel.ts` tratam os novos tipos; funções novas em `armacao.ts` (`cotaRadial`, `cotaAngular`, `chamada`, `balao`, `linhaCentro`, `simboloCorte`); mapa de padrões no próprio Statikos (definição própria em mm; o `.pat` do FreeCAD só mostra o conceito). Testes em `prancha.test.ts` (tipos novos) e `validation/dxf/auditar.py` (item 1) conferem o HATCH com padrão.
- Esforço: 3 d, S2 (núcleo de desenho, sem cálculo). Fatiar: hachura por padrão (1 d), leader/balão/centro (1 d), cotas radial/angular e formato (1 d).
- Ganho: qualidade de prancha igual às folhas de referência do usuário (R5/FU5); sem risco de cálculo. Sem item de checklist próprio; apoia K1.4.57 e K1.11.54 (frente V5) e a revisão visual das folhas de armação (R7g). Prioridade só depois dos itens de validação (1 a 7). Premissa: padrão visual sempre o das folhas do usuário e da NBR 6492/13142, nunca o ISO do TechDraw; qualquer padrão novo marcado "a confirmar".

## 9. Benchmarks de vibração e flambagem
- FreeCAD faz: `femexamples/frequency_beamsimple.py`, `ccx_buckling_flexuralbuckling.py`, `buckling_lateraltorsionalbuckling.py`, `buckling_platebuckling.py`, `boxanalysis_frequency.py`; valores esperados em `femtest/data/calculix/*_expected_values` e `box_frequency.inp`.
- Temos: `secondorder.ts` (flambagem global do pórtico plano, vibração livre por subespaço) com testes analíticos (Euler, massa na ponta, viga biapoiada) em `secondorder.test.ts`; `pdelta3.ts` validado no OpenSees (1e-6).
- Implementar: `validation/opensees/modos.py` (ou `validation/calculix/modos.py` com `*FREQUENCY` e `*BUCKLE`) para 3 casos: pórtico plano de 3 andares (frequências e fatores críticos vs `secondorder.ts`), pórtico espacial simétrico (modos de torção), placa apoiada comprimida (fator crítico vs fórmula k·π²D/b²; só útil se um dia houver flambagem de casca). OpenSees (`eigen`) basta para os dois primeiros e já está instalado: preferir. JSON + teste que compara f1..f4 (< 0,5 %).
- Esforço: 1 d, S1. Ganho: baixo hoje; o app não tem análise modal 3D do edifício (só o pórtico plano), então o risco coberto é pequeno. Útil se a frente V ou N2 incluir modos e frequência do edifício (por exemplo, conforto em vibração da NBR 6118, 23.3). Sem item de checklist aberto.

## 10. Exportação IFC (físico e analítico)
- FreeCAD faz: `src/Mod/BIM/importers/exportIFC.py` (físico: IfcColumn, IfcBeam, IfcSlab, IfcFooting, IfcPile com extrusão, material e psets) e `exportIFCStructuralTools.py` (analítico: `setup`, `createStructuralNode` -> IfcStructuralPointConnection com IfcBoundaryNodeCondition, `createStructuralCurve` -> IfcStructuralCurveConnection, `createStructuralMember` -> IfcStructuralCurveMember/SurfaceMember, `createStructuralGroup` -> IfcStructuralAnalysisModel, `associates` liga o membro físico ao analítico). Presets de classes e psets: `src/Mod/BIM/Presets/ifc_products_IFC4.json`, `ifc_types_*.json`, `pset_definitions.csv` (referência de nomes padrão; o padrão IFC é aberto).
- Temos: nada de exportação IFC.
- Implementar (proposta nova, não está em frente): `src/core/ifc/exportar.ts` escrevendo STEP IFC4 em texto (sem biblioteca; a L3 só lê com web-ifc, que escreve pouco). Parte A (físico): pavimentos (IfcBuildingStorey), pilares/vigas/lajes/fundação por extrusão do contorno do `BuildingModel`, `IfcMaterial` C30/CA-50, `Pset_*Common`, GlobalId determinístico (hash do id do comando, para reexportar sem duplicar). Parte B (analítico): IfcStructuralAnalysisModel com membros de curva (eixos de vigas e pilares), pontos de conexão com condição de contorno (apoios e molas), casos de carga (`IfcStructuralLoadCase`, `IfcStructuralCurveAction` para q), e resultados opcionais (IfcStructuralResultGroup de reações). Comando `ifc.exportar` (`mcp: false`) + botão na aba Pranchas/Edifício; no artifact, via a capability `downloads` como `.ifc` empacotado em zip (extensão não permitida, como o DWG).
- Validação: `validation/ifc/validar_export.py` abre o IFC com IfcOpenShell (`ifcopenshell.open`, `validate`, conta classes) - ferramenta externa.
- Esforço: 4 d, S2 (parte A 2 d, B 2 d). Ganho: troca de arquivo com projetistas de arquitetura/instalações; pouca adoção do modelo analítico IFC em ferramentas de cálculo. Não entra em nenhum checklist hoje; propor ao usuário como frente "L3b" só se houver demanda. Dependência nova: nenhuma (texto).

## O que não fazer
- Rodar o FreeCAD no CI ou depender dele; copiar `dxf.cpp`, `exportIFC*.py`, `planegcs` ou `.pat` (LGPL; ver a seção 1 da análise anterior).
- Usar o solver do FreeCAD/CalculiX no app: o cálculo continua no núcleo TS (premissa visível, memorial, sem dependência nativa).
- Tratar tolerância do CalculiX como verdade normativa: ele valida a mecânica linear; o dimensionamento (NBR 6118) segue como está.

## Itens de checklist citados (conferidos nos arquivos)
C1.18, C1.21, C1.22, C1.23, C2.22 (`docs/checklist-manual-cypecad.md`); K1.2.1, K1.2.5, K1.3.35, K1.3.36, K1.3.47, K1.4.57, K1.9.8, K1.11.54, K1.12.1-17 (`docs/checklist-manual-calculo-cypecad.md`). K1.3.35 (malha triangular) já está Feito: os itens 3 e 7 reforçam a validação dele, sem mudar a situação. O id do bloco multi-pilar (C11.x) deve ser conferido pelo agente na hora de editar a linha. Cada fatia atualiza as linhas tocadas e roda `npm run checklists` (regra do CLAUDE.md).
