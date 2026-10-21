# Interoperabilidade: exportar o projeto do Statikos para Revit, CYPECAD, TQS e Eberick

Data: 21/10/2026. As seções 1 a 6 vêm da primeira pesquisa, feita só com buscas na web (o WebFetch ficou sem acesso de rede no ambiente, então os fatos vinham de resumos de resultados de busca). **A seção 7 (mesma data) refaz a pesquisa lendo as páginas oficiais inteiras por curl e corrige parte das conclusões das seções 2, 4 e 5: onde houver conflito, vale a seção 7.** Tudo que não foi confirmado em fonte oficial está marcado "não confirmado". Premissa nova de exportação deve ser validada com o usuário antes de implementar (regra do projeto).

## 1. Objetivo

Exportar o modelo estrutural (pilares, vigas, lajes, fundações, pavimentos, materiais, cargas se possível) de modo que o programa de destino mostre elementos estruturais nativos, para recalcular lá e conferir o motor do Statikos.

## 2. Resultado por programa

| Programa | Caminho de importação | Vira elemento nativo calculável? | Viabilidade |
|---|---|---|---|
| Revit | Abrir/vincular IFC (2x3; IFC4 só vínculo, segundo a ajuda da Autodesk); plugin CYPE Open BIM (converte IFC estrutural em famílias nativas); plugins de terceiros (ex.: OF Estrutural lê IFC e cria vigas, pilares e lajes); Revit API/Dynamo | Sim, com mapeamento de categorias ou plugin; sem plugin, cai em DirectShape/Modelo genérico. Analítico a partir de IFC: não encontrei evidência | Média (físico) / Alta só com plugin próprio via API |
| CYPECAD | IFC de arquitetura (direto ou via BIMserver.center, "Iniciar projeto Open BIM"); DXF/DWG como gabarito | Lê pavimentos, pilares e contornos de laje como modelo de entrada, que o engenheiro caracteriza; vigas e paredes não aparecem na lista de importação. Importação de IFC é processo de início de obra | Média-baixa (assistida, não nativa total) |
| TQS | IFC (importação passou a existir na V20, segundo o Jornal TQS 45) e Revit via plugin TQS (Autodesk App Store, Revit 2022/2023); DWG/DXF | IFC entra como referência/desenho de arquitetura para lançar a estrutura (não confirmado que converte em pilares/vigas calculáveis). Plugin Revit↔TQS é o caminho de ida e volta | Baixa por IFC; média por plugin (a parte TQS não é pública, não confirmado) |
| Eberick | Criar projeto novo a partir de modelo externo IFC (pavimentos, ambientes, geometria de referência); DWG/DXF como gabarito; QiBuilder importa .OQ3D/.IFC do Eberick | Importação é de referência arquitetônica; exportação IFC do Eberick leva geometria, classe de concreto, cobrimento e armaduras. Não confirmado que lê IFC estrutural como elementos do Eberick | Baixa |

Atenção: esta tabela está superada em parte pela seção 7 (CYPECAD tem entrada automática por IFC e DXF; Eberick converte pilares e vigas de IFC em nativos; TQS tem API Python; CYPE 3D lê modelo analítico IFC).

Pontos de apoio e URLs:
- CYPECAD/Open BIM: https://blog.bimserver.center/9-good-reasons-to-use-cypecad-together-with-bimserver-center/ ; https://info.cype.com/en/subject/cypecad-workflows-supported-by-the-program/ ; https://info.cype.com/en/new-feature/integration-of-cypecad-in-the-open-bim-workflow/ ; exportação IFC 2x3/4 de pilares, vigas, sapatas, blocos: https://info.cype.com/en/subject/cypecad-exports/ ; https://learning.cype.com/en/faq/how-to-export-an-ifc-file-from-cypecad/
- Revit com plugin CYPE (classes que viram nativas: IfcColumn, IfcBeam, IfcMember, IfcFooting, IfcPile, IfcSlab; recomenda modelo com template estrutural): https://info.cype.com/en/subject/plugin-open-bim-revit-generating-native-revit-elements-based-on-a-structural-ifc/ ; https://info.cype.com/en/blog/step-by-step-how-to-convert-cypecad-ifcs-into-revit-native-entities/
- Revit e IFC (versões, mapeamento de classes para categorias): https://help.autodesk.com/cloudhelp/2026/ENU/Revit-DocumentPresent/files/GUID-6708CFD6-0AD7-461F-ADE8-6527423EC895.htm ; vínculo vs abrir, DirectShape: https://ukcommunity.arkance.world/hc/en-us/articles/21566204744594-Revit-2022-Tip-Working-with-IFC-files-Elements-missing-limited-functionality ; importação de laje portante vira Floor estrutural (Graphisoft add-in): https://help.graphisoft.com/Revit/INT/IFC_Model_Exchange_with_Archicad_for_Revit_2026.pdf ; efeito de SweptSolid vs Tessellation no importador: https://help.scia.net/25.0/en/data_transfer/ifc/tips.htm
- Plugin de terceiros que lê IFC e cria elementos nativos: https://www.orcafascio.com/modulos-e-plugins/of-estrutural
- TQS: https://dl.tqs.com.br/files/Projeto_Estrutural_no_Ambiente_BIM_TQSABECE.pdf ; https://dl.tqs.com.br/tqs-news/JornalTQS_45.pdf ; estudo Mackenzie https://dspace.mackenzie.br/handle/10899/29031 e UTFPR https://riut.utfpr.edu.br/jspui/bitstream/1/27015/1/CT_COECI_2020_2_04.pdf (plugin TQS-Revit melhor que IFC, trabalhos de graduação); IFC do TQS no ArchiCAD chega como Morph com a opção < 2014 (fórum, relato isolado): https://community.graphisoft.com/t5/Colabora%C3%A7%C3%A3o-com-outros-softwares/Importa%C3%A7%C3%A3o-de-IFC-de-modelo-TQS/m-p/659684
- Eberick: https://www.altoqi.com.br/recursos/importacao-e-exportacao-ifc-openbim ; https://www.altoqi.com.br/recursos/criacao-de-novo-projeto-a-partir-do-modelo-externo-ifc-e-importacao-dos-ambientes ; https://suporte.altoqi.com.br/hc/pt-br/articles/360034453434 ; armaduras no IFC: https://suporte.altoqi.com.br/hc/pt-br/articles/360049945013 ; QiBuilder: https://suporte.altoqi.com.br/hc/pt-br/articles/115001609233
- SAF: https://www.scia.net/en/innovations/structural-analysis-format-saf ; https://gitbook.saf.guide/getting-started/what-is-saf ; https://github.com/StructuralAnalysisFormat/StructuralAnalysisFormat-Doc ; apoiadores listados pela SCIA: SCIA, Graphisoft, Allplan, RISA, Frilo, StruSoft, AxisVM, Dlubal, SOFiSTiK, LiraLand. Revit, TQS, Eberick e CYPECAD não aparecem nas fontes que li (não confirmado; a tabela "Who supports SAF" do saf.guide não foi lida).
- Vista de análise estrutural do IFC (Structural Analysis View): Revit exporta mal o modelo analítico (fóruns: https://forums.autodesk.com/t5/revit-structure-forum/is-there-a-final-answer-as-to-if-analytical-elements-can-be/m-p/9350321/highlight/true); ArchiCAD tem importação/exportação experimental (https://helpcenter.graphisoft.com/user-guide/128765); SOFiSTiK lê IFC2x3/IFC4 com essa vista (https://docs.sofistik.com/2025/en/fea/basic/interfaces/ifc_export.html). Nenhum dos quatro programas-alvo documenta leitura de IfcStructuralAnalysisModel (não confirmado).

## 3. O que o IFC "físico" precisa ter para máximo reconhecimento

Base: boas práticas conhecidas do esquema IFC e o que os importadores acima declaram. Os pontos específicos de cada programa são não confirmados e saem do teste empírico (fatia I4).

- Esquema: gerar IFC2x3 (Coordination View 2.0) como padrão, que é o que Revit e a certificação mais comum aceitam, e IFC4 (Reference View) opcional. Revit abre só IFC2x3 como modelo editável.
- Hierarquia: IfcProject > IfcSite > IfcBuilding > IfcBuildingStorey (elevação de cada pavimento do modelo `types.ts`), com unidades SI (m) e uma única origem.
- Classes: pilar = IfcColumn (PredefinedType COLUMN); viga = IfcBeam (BEAM); laje = IfcSlab (FLOOR, ROOF para cobertura); sapata = IfcFooting (PAD_FOOTING/STRIP_FOOTING); bloco = IfcFooting (PILE_CAP); estaca/tubulão = IfcPile (BORED, DRIVEN); radier = IfcFooting (FOOTING_BEAM ou slab); parede estrutural = IfcWallStandardCase; evitar IfcBuildingElementProxy (vira Modelo genérico no Revit).
- Geometria: IfcExtrudedAreaSolid com IfcRectangleProfileDef / IfcCircleProfileDef (ou IfcArbitraryClosedProfileDef para polígonos), Representation "SweptSolid", mais eixo (Axis, IfcPolyline) para vigas e pilares quando o destino aproveitar. Evitar BRep/tessellation: o SCIA e o Revit (importador) tratam extrusão paramétrica melhor. Laje: contorno extrudado com espessura; furos como IfcOpeningElement ou perfil com vazios.
- Tipos: IfcColumnType/IfcBeamType com nome da seção ("P1 30x60"), pois o plugin da CYPE para Revit mapeia pelos tipos.
- Material: IfcMaterial "C30" (ou "Concreto C30") associado por IfcRelAssociatesMaterial; IfcMaterialProfileSet nas versões IFC4. Aço CA-50 só como propriedade.
- Psets: Pset_ColumnCommon / Pset_BeamCommon / Pset_SlabCommon (LoadBearing=TRUE, IsExternal, Reference), Pset_ConcreteElementGeneral (StrengthClass C30), Pset_FootingCommon; Qto_* de comprimento, volume e área; Pset próprio "Statikos" com ID, lance, cobrimento, fck.
- Eixos: IfcGrid a partir dos eixos de pilares (referência de conferência).
- Nome estável: GlobalId derivado do id do elemento (determinístico) para reexportar e comparar.
- Modelo analítico: IfcStructuralAnalysisModel com IfcStructuralPointConnection (nós), IfcStructuralCurveMember (barras, com eixo e perfil), IfcStructuralSurfaceMember (lajes), IfcStructuralPointAction/LinearAction/SurfaceAction, IfcStructuralLoadCase/Group e combinações, IfcBoundaryNodeCondition (apoios). Só vale se o destino ler; ver conclusão.

## 4. Alternativas onde o IFC não basta

- Revit: o caminho robusto é um add-in/Dynamo que lê um JSON do Statikos e cria FamilyInstances nativas (Structural Column, Structural Framing, Floor estrutural, Structural Foundation) e o modelo analítico pela API. Exige Revit instalado para teste (não confirmado que o ambiente do usuário tem licença). Alternativa sem código: IFC com mapeamento de classes para categorias nas opções de importação do Revit.
- TQS: o plugin Revit↔TQS troca dados com o Revit; assim, Statikos → Revit (nativo) → TQS é um caminho plausível, mas a parte TQS não é pública (não confirmado). Formato de troca TQS↔Eberick: não encontrei (não confirmado). Gabarito DWG/DXF existe nos dois, mas só como referência.
- CYPECAD: BIMserver.center com IFC; exportação do CYPECAD é rica (pilares, vigas, sapatas, blocos), a importação é de arquitetura. Plugins/API pública de importação de modelo estrutural: não encontrei (não confirmado). O .cyp e formatos próprios são fechados.
- SAF (.xlsx): útil para programas de análise (SCIA, Dlubal, SOFiSTiK, RISA, AxisVM etc.), não para os quatro programas-alvo (não confirmado para eles).

## 5. Conclusão

1. Nenhum dos quatro programas documenta importar IFC estrutural de terceiros e convertê-lo em elementos calculáveis. TQS, Eberick e CYPECAD usam o IFC como arquitetura de referência (gabarito) e exigem relançar ou caracterizar a estrutura; só o Revit, com mapeamento ou plugin, gera elementos nativos (sem armadura e sem cargas de cálculo).
2. Armaduras, cargas, combinações, vínculos e as premissas de cálculo (rigidez reduzida, γz, opções) nunca chegam por IFC físico. O modelo analítico IFC é pouco suportado.
3. Formato recomendado: IFC2x3 físico (extrusões paramétricas, tipos, material C30, Psets) como formato universal e base para Revit; IFC4 como opção; mais um arquivo de conferência (JSON/CSV com esforços, armaduras e deslocamentos do Statikos) para comparar manualmente com o programa de destino. Para recálculo real, o roteiro prático é relançar a estrutura no programa usando o IFC/DXF como gabarito e comparar resultados em um edifício-teste.
4. Viabilidade: Revit média (alta com add-in via API); CYPECAD média-baixa; TQS baixa por IFC; Eberick baixa. Esforço: I1 ~1 fatia média (o `core/vista3d` já tem a geometria); I2 média-alta com risco; I3 alta e dependente de Revit; I4 média e depende do usuário abrir os programas.

## 6. Fatias propostas

- I1: exportar IFC2x3 (e IFC4 opcional) físico: hierarquia, classes por tipo, extrusões paramétricas, tipos, materiais, Psets, IfcGrid, GlobalId determinístico; ferramenta na CLI/MCP e na interface; teste com leitura via web-ifc (frente L) e ifcopenshell/IfcTester em `validation/` (fora do npm test); fixture do edifício fictício.
- I2: modelo analítico (IfcStructuralAnalysisModel) e SAF .xlsx a partir da análise (nós, barras, apoios, casos e combinações); validar com SCIA/SOFiSTiK ou ArchiCAD quando disponível. Prioridade baixa, por serem pouco lidos pelos alvos.
- I3: add-in Revit (API/Dynamo) que lê JSON do Statikos e cria elementos nativos e modelo analítico; fora do app web, com repositório/pasta própria; dependência nova exige aceite.
- I4: roteiro de conferência de cálculo com o edifício-teste fictício: o usuário abre o IFC/DXF em cada programa, relança ou caracteriza, recalcula, e comparamos esforços, γz, armaduras e deslocamentos com os do Statikos (planilha de comparação e tolerâncias); registrar divergências por premissa (CYPECAD/TQS/Eberick × NBR).
- I0 (antes de tudo): teste empírico de importação com um IFC mínimo de cada tipo nos quatro programas, para trocar os "não confirmado" por fatos.

## 7. Rotas por programa (21/10/2026, pesquisa aprofundada)

### 7.0 Método, legenda e correções à pesquisa anterior

Método: o WebFetch não resolve DNS no ambiente (`getaddrinfo ENOTFOUND`); as páginas foram baixadas com `curl -sL` pelo proxy configurado (200 em todas) e lidas na íntegra: ajuda e notas de versão da CYPE, base de conhecimento e recursos da AltoQi, TQS Docs (docs.tqs.com.br, que tem busca por GET), PDFs da TQS e TQS Store. Nada foi testado nos programas. Não foi copiado texto de manual; só fatos curtos com a URL.

Legenda de confirmação, usada em todas as tabelas desta seção:
- **[doc]**: dito em página oficial do fabricante, lida inteira.
- **[doc-parcial]**: oficial, mas sem o detalhe que importa (critério interno, versão, licença).
- **[inferido]**: deduzido de amostra pública ou de comportamento de outro componente do mesmo fabricante.
- **[não confirmado]**: sem fonte; só o teste I0 resolve.

Correções ao que as seções 1 a 6 afirmavam:
1. **CYPE 3D lê modelo analítico IFC** (IfcStructuralAnalysisModel, IfcStructuralPointConnection, IfcStructuralCurveMember, IfcBoundaryNodeCondition, IfcRelConnectsStructuralMember/WithEccentricity), com apoios e condições de extremidade [doc]. A seção 2 dizia que nenhum dos programas lia. O CYPE 3D não é o CYPECAD, mas é da mesma família e integra o resultado ao CYPECAD (.ed3 como "estrutura 3D integrada") [doc].
2. **Eberick converte IfcColumn/IfcBeam em pilares e vigas nativos** na criação do projeto a partir de modelo externo (versão 2024, caixa "importar pilares e vigas", exclusiva da versão por assinatura) e, desde a 2025.02, converte elementos de um IFC importado em nativos no pórtico 3D (classificação pilar ou viga; concreto armado ou genérico) [doc]. A seção 2 dava "baixa, só referência". Os critérios internos (classe, seção, Pset) não são publicados [não confirmado].
3. **CYPECAD tem entrada automática por DXF/DWG e por IFC** (módulo "Entrada automática de obras: DXF, DWG e modelos CAD/BIM", código AUT). Lê pilares, contornos de laje (que viram vigas de contorno e de abertura), sapatas, vigas de fundação e paredes (viram cargas lineares). **Não lê vigas internas do IFC** [doc].
4. **TQS: a importação de IFC é só referência** (pavimentos, desenhos de referência 2D por corte, volumetria 3D, paredes viram cargas lineares, tubos viram furos) [doc]. A rota nativa é outra: **API Python oficial** (TQSBuild, TQSModel, TQSExec) que cria edifício, pilares, vigas, lajes, fundações e cargas e dispara o processamento [doc]. A seção 4 não conhecia essa API.
5. **Plugin Revit↔TQS** é gratuito na TQS Store para Revit 2014 a 2027 [doc]. A seção 2 citava só a Autodesk App Store (2022/2023). Transfere geometria apenas (sem cargas e armaduras) [doc, documento de 2013/14; o texto atual do TQS Docs não contradiz].
6. **Plugin AltoQi para Revit** só sincroniza notas BCF e publica IFC no Visus Collab; não transfere modelo para o Eberick [doc].
7. IFC Uploader da CYPE foi descontinuado na 2025.d; o upload é pelo site do BIMserver.center ("Nova contribuição") [doc-parcial, resumo de busca + FAQ].

### 7.1 CYPECAD

Fontes: https://info.cype.com/en/subject/cypecad-automatic-entry-of-projects-dxf-dwg-and-cad-bim-models/ ; https://info.cype.com/en/subject/cypecad-workflows-supported-by-the-program/ ; https://info.cype.com/en/subject/cypecad-ifc-entities-imported-in-the-automatic-ifc-import-process/ ; https://info.cype.com/en/product/cypecad-entering-the-structure/ ; https://info.cype.com/en/subject/automatic-entry/ .

Fatos centrais [doc]:
- Entrada automática por IFC e por DXF/DWG são **processos iniciais** (escolhidos ao criar a obra) e **não combinam entre si nem com a conexão ao BIMserver.center**. Combinam com os demais processos (entrada manual, CYPE 3D integrado, ASC).
- IFC lido: IfcBuilding, IfcBuildingStorey, IfcFooting (PAD_FOOTING, USERDEFINED, NOTDEFINED), IfcFooting FOOTING_BEAM ou IfcBeam sobreposto à sapata, IfcColumn de concreto ("se representado por faces, só é interpretado se a seção for circular ou retangular"), IfcSlab, IfcRoof, IfcWall/IfcWallStandardCase (cargas de fachada/divisória). Sem essas entidades "não gera nada".
- Assistente do IFC: arquivo, cotas dos pavimentos (sugere nomes e níveis do IFC; fundação profunda ou radier e cota do plano), cargas de piso (permanente e acidental, digitadas no assistente), lista de IfcColumn a importar, lista de IfcSlab/IfcRoof a gerar como contorno externo e aberturas **com o tipo de viga escolhido no assistente**, paredes (peso superficial escolhido numa tabela vira carga linear), gabaritos por pavimento. Não há lista de IfcBeam: as vigas de contorno e de abertura nascem do contorno das lajes.
- Assistente do DXF/DWG: configuração dos pavimentos (subsolos, térreo, tipos, cobertura, casa de máquinas; só térreo e cobertura são obrigatórios), alturas, cargas por pavimento, arquivos e **camadas escolhidas pelo usuário** para pilares, contorno externo e contornos de abertura; tipo de viga dos contornos e deslocamento opcional da viga em relação à linha (fachada x borda estrutural); calcula o ponto fixo dos pilares de seção variável; camada opcional de pontos fixos. Em seguida o usuário posiciona as lajes e completa.
- Com o módulo AUT há ainda "entrada de vigas com ajuda de DXF/DWG": atribui um tipo de viga a uma polilinha (reta e curva, aberta ou fechada) ou linha de qualquer planta, sem lançar viga a viga.
- Ponto fixo de pilar vindo do Revit/IFC: o CYPECAD lê o ponto fixo pela **posição da extrusão em relação aos eixos da família** (padrão: centro) [doc, FAQ 2024.d]: https://learning.cype.com/en/faq/how-can-the-fixed-points-of-revit-columns-be-read/ . Vale o mesmo critério para o nosso IFC (origem do perfil no ponto fixo) [inferido].
- Leitura de DXF/DWG até AutoCAD 2025 a partir da versão 2025.c [doc-parcial].
- Exporta IFC 2x3 ou 4 sem exigir o módulo AUT [doc]: serve de **gabarito do nosso gerador** (ver I0).

Rotas:

| # | Rota | Viab. | Chega nativo | Precisa relançar/completar | Geramos | Dependência | Esforço | Confirmação |
|---|---|---|---|---|---|---|---|---|
| C1 | IFC por "Entrada automática IFC" | Alta | pavimentos (nome, cota), pilares com seção e ponto fixo, vigas de contorno e de abertura (do contorno das lajes), sapatas, vigas de fundação, cargas lineares de paredes, gabaritos | lajes (posição e tipo), vigas internas, cargas de piso (digitadas no assistente), materiais e norma, vínculos, escadas | IFC2x3 com IfcColumn extrudado (perfil retangular/circular), IfcSlab/IfcRoof com contorno, IfcFooting, IfcWall | módulo AUT (licença; disponibilidade na edição brasileira: [não confirmado]) | baixo-médio (I1) | existência [doc]; resultado real [não confirmado] |
| C2 | DXF/DWG por "Entrada automática DXF/DWG" | Alta | pavimentos (pelo assistente), pilares, vigas de contorno e de abertura, pontos fixos por camada | lajes, vigas internas, cargas | DXF R2000 em metros, escala real, uma camada por tema (nomes livres: o usuário mapeia no assistente) | módulo AUT | baixo (já geramos DXF) | existência [doc]; tipo de entidade que vale como pilar (polilinha fechada? bloco?) [não confirmado]; um arquivo por pavimento ou vistas? [não confirmado] |
| C3 | Entrada de vigas com ajuda de DXF (completa C1 ou C2) | Alta | cada polilinha/linha vira viga com o tipo escolhido | seção por tipo (cadastrada no programa) | DXF só com eixos das vigas por pavimento, camada por tipo de seção | módulo AUT | baixo | existência [doc]; uso após partida por IFC [não confirmado] |
| C4 | IFC via BIMserver.center (conta, projeto, "contribuição") | Média | o mesmo do C1, mais atualizações notificadas | o mesmo | o mesmo IFC | conta BIMserver.center; plugin/CYPE como intermediário opcional | baixo (depois do C1) | [doc-parcial] |
| C5 | ASC (BARRAS.asc, NUDOS.asc, REAC.asc): "Importar arquivo ASCII" | Média | **fundação**: seções de arranque de pilares, casos simples, cargas de cabeça; não cria superestrutura | tudo da superestrutura | três arquivos CSV (amostras públicas) | licença CYPECAD (módulo de fundações) | baixo | formato **inferido** das amostras (cm; BARRAS traz A, Ix, Iy, Wx, Wy; NUDOS traz x, y, z; REAC traz nó, caso, 6 reações); semântica das colunas [não confirmado]: https://learning.cype.com/wp-content/uploads/2022/04/BARRAS.asc (e NUDOS, REAC) |
| C6 | CYPE 3D: IFC analítico, DXF de linhas ou TXT (NODES/FRAMES/SHELLS/PANELS); depois integrar ao CYPECAD (.ed3) | Alta para **conferir esforços** de pórtico espacial; baixa como estrutura CYPECAD de concreto | nós e barras (apoios e extremidades do IFC; DXF e TXT só geometria; DXF em metros) | seções, vínculos internos/externos, cargas | IFC com IfcStructural* (I2), DXF de eixos, TXT | licença CYPE 3D (não confirmada) | médio (I2) | [doc] |
| C7 | Revit + plugin Open BIM → BIMserver.center → CYPECAD | Média-baixa | pilares (IfcColumn) e contornos de laje | vigas | add-in/IFC no Revit | Revit + plugin gratuito + AUT | alto | [doc] (guia CYPE-Revit de 2021) |
| C8 | API pública, arquivo nativo (.cyp), XML | — | — | — | — | — | — | nenhuma API pública encontrada; formatos fechados [não confirmado que não existam] |

Cargas no CYPECAD: IFC/DXF não trazem cargas de cálculo; cargas de piso entram no assistente (o usuário digita os nossos valores); paredes viram carga linear via IfcWall e peso superficial escolhido; combinações são do programa. A conferência de cargas na fundação pode usar o ASC (C5).

### 7.2 Eberick (AltoQi)

Fontes: https://www.altoqi.com.br/recursos/importacao-e-exportacao-ifc-openbim ; https://www.altoqi.com.br/recursos/criacao-de-novo-projeto-a-partir-do-modelo-externo-ifc-e-importacao-dos-ambientes ; https://suporte.altoqi.com.br/hc/pt-br/articles/360021136733 ; https://suporte.altoqi.com.br/hc/pt-br/articles/360008355873 ; https://suporte.altoqi.com.br/hc/pt-br/articles/115001514973 ; https://lps.altoqi.com.br/novos-recursos-eberick-2025-02 .

Fatos centrais [doc]:
- Menu Arquivo > Novo > "Nova edificação com modelo externo" abre um IFC, identifica pavimentos com nome, altura e nível e cria a edificação. A caixa **"importar pilares e vigas"** converte esses elementos do IFC em pilares e vigas nativos no ato; a ajuda avisa que pode não existir em versões antigas e é exclusiva do modelo assinatura.
- O restante do modelo vira **arquitetura de referência** por "planificação" (corte do 3D em planos superior e inferior; padrão 3/5 da altura em cima e 1/4 embaixo), com opção de filtrar "grupos do IFC". Modelo IFC vinculado depois: Arquivo > Interoperabilidade BIM > "Vincular modelo 3D".
- Versão 2024: novo importador IFC (leitura mais rápida); 2025.02: "converter elementos IFC para nativos no pórtico 3D" escolhendo o elemento, a classificação (pilar ou viga) e o tipo (concreto armado ou genérico).
- Exportação IFC (2x3, 4): classe do concreto, cobrimento, classe de agressividade, taxa de armadura, quantitativos, armaduras 3D, nervuras. Serve de **gabarito do nosso gerador**.
- DWG/DXF: importados como desenho de referência no pavimento (janela Desenho > Arquivo > Importar DWG/DXF, com conversão de escala e origem); "ainda não é possível importar DWG 3D". Não há lançamento automático a partir de DWG na documentação [não confirmado que não exista].
- Q3D: formato próprio para Eberick e Builder (exportar e vincular), sem especificação pública [não confirmado].
- Saída para SAP2000 (.$2K: pórtico unifilar, grelhas de lajes, casos e combinações ELU): só exportação: https://suporte.altoqi.com.br/hc/pt-br/articles/360016037073 .
- Vento de túnel: importa planilha .xlsx com 3 abas (Força Vento, Força Transversal, Momento Torsor; 1ª linha com os ângulos, 1ª coluna pavimento, 2ª coluna cota em m; forças em tf e momentos em tf·m): https://suporte.altoqi.com.br/hc/pt-br/articles/360050991093 .
- API pública ou importação de planilha de pilares/cargas: não encontradas [não confirmado].
- O plugin AltoQi para Revit (Revit 2019 a 2026, Revit em português) faz BCF e publica IFC; não transfere modelo: https://suporte.altoqi.com.br/hc/pt-br/articles/4412920148247 .

| # | Rota | Viab. | Chega nativo | Precisa relançar/completar | Geramos | Dependência | Esforço | Confirmação |
|---|---|---|---|---|---|---|---|---|
| E1 | IFC em "Nova edificação com modelo externo" + "importar pilares e vigas" | Média-alta | pavimentos (nome, altura, nível), pilares, vigas; arquitetura de referência | lajes, fundações, cargas, materiais, seções fora do padrão, vínculos | IFC2x3 com IfcColumn/IfcBeam de perfil retangular e IfcBuildingStorey; opcional IfcWall/IfcSlab só como referência | Eberick por assinatura (2024+) | baixo-médio (I1) | existência [doc]; critérios de reconhecimento [não confirmado] |
| E2 | IFC vinculado + conversão no pórtico 3D (2025.02) | Média | pilares e vigas escolhidos, concreto armado ou genérico | idem E1; operação manual por elemento | o mesmo IFC | Eberick 2025.02+ | zero adicional | [doc-parcial] |
| E3 | DWG/DXF | Baixa | nada (referência) | tudo | DXF de formas já existente | — | — | [doc] |
| E4 | Vento por planilha do túnel | Alta para vento | casos de vento por pavimento | resto | .xlsx de 3 abas | Eberick (módulo vento: [não confirmado]) | baixo | [doc] |
| E5 | Q3D, API, planilha de lançamento | — | — | — | — | — | — | sem especificação pública [não confirmado] |
| E6 | Revit + plugin AltoQi | Baixa | só IFC | — | — | Revit | — | [doc] |

Lajes e fundações no Eberick: nenhuma fonte indica leitura de IfcSlab ou IfcFooting como elementos de cálculo; as propriedades IFC "nos elementos de fundação" (2025.02) são de **saída** [doc-parcial].

### 7.3 TQS

Fontes: https://docs.tqs.com.br/Docs/Details?id=173818189&language=pt-BR (Python) ; id=951437050 (TQSModel) ; id=1277906619 (TQSBuild) ; id=1598847847 (TQSExec) ; id=377170627 (Leitura de IFC e RTQ) ; id=296322546 (Importação do IFC) ; id=3485 e 537641241 (Plugin TQS-Revit) ; id=214253614 (tutorial TQS BIM) ; id=794427846 e 118485204 (vento de túnel) ; https://store.tqs.com.br/apps/plugins ; https://dl.tqs.com.br/files/Projeto_Estrutural_no_Ambiente_BIM_TQSABECE.pdf ; https://dl.tqs.com.br/tqs-news/JornalTQS_45.pdf .

Fatos centrais [doc]:
- **Python**: criado na versão 23; exige Python 3.7+ e o pacote `TQSPythonInterface` (wheel, por pip; o instalador do TQS tenta instalá-lo; arquivos em `TQSW\EXEC\Python`, com o manual `Programacao_TQS_Python.pdf` e exemplos `TSTMODELn.PY`).
- **TQSBuild**: lê, edita e **cria edifícios**: dados gerais (norma NBR 6118:2003/2014 etc., tipo de estrutura), modelo (P-Delta, análise dinâmica, interação solo-estrutura), pavimentos e cotas, materiais por tipo de elemento, cobrimentos, casos de carregamento simples e vento.
- **TQSModel**: lê e grava o modelo estrutural do Modelador (~100 classes, ~1200 funções, 54 tipos de objeto): cria pilares (retangular e outras seções, "nasce na fundação"), pilaretes, fundações, vigas por poligonal, lajes dentro de contorno (ângulo principal), contornos auxiliares, capitéis, furos, formas de nervuradas, cargas de empuxo, adicionais, de área, concentradas e lineares. Os dados "atuais" (pilar, viga, laje) seguem a lógica do Modelador. Unidades do modelo em cm e tf (exemplos do manual).
- **TQSExec**: executa o gerenciador e o processamento global (extração de plantas, esforços das lajes, vigas, pilares, grelha, pórtico espacial, fundações, escadas), em fila. Isso fecha o ciclo "criar e recalcular" sem interface.
- **Importação de IFC e RTQ**: cria o edifício com cotas de pavimento, referências 2D (do corte do IFC, ou a planta de trabalho do Revit com anotações no RTQ), referência 3D, paredes em cargas lineares e tubos em furos. **Não cria pilares, vigas e lajes** a partir do IFC. "Importação sem cortes 2D" (V24) cria só o edifício.
- **Plugin TQS-Revit** (gratuito, Revit 2014 a 2027): "Exportar RTQ" no Revit gera o arquivo; no TQS, "Interfaces BIM > Revit > Importar/Sincronizar modelo do Revit" cria o edifício e os pilares, vigas e lajes do **projeto básico**; sincronização bidirecional só de geometria; cargas, combinações, critérios e armaduras não passam. Famílias estruturais nativas do Revit (viga retangular, pilar retangular, piso estrutural). Formato RTQ/TQR não documentado [não confirmado].
- **Vento de túnel**: planilha SDF e FTV XML, texto separado por tabulação (uma linha por piso, uma coluna por direção de 0° a <360°, forças em tf e torsor em tf·m; opção por pilar). Outro canal de carga documentado.
- **DWG/DXF**: só referência externa (conversão DWG-ACAD); não achei lançamento automático a partir de desenho [não confirmado que não exista].
- **IEF/IFE** (estrutura-fundação, SISEs): arquivos de transferência sem formato publicado [não confirmado].
- Compatibilidade IFC: o TQS exporta IFC com opção "Sugerir" por software e vigas só horizontais para Archicad; quem exporta aprende o que cada programa lê (útil como gabarito dos nossos IFCs).

| # | Rota | Viab. | Chega nativo | Precisa relançar/completar | Geramos | Dependência | Esforço | Confirmação |
|---|---|---|---|---|---|---|---|---|
| T1 | **Script Python TQS** (TQSBuild + TQSModel + TQSExec) | Alta | edifício (pavimentos, cotas, materiais, cobrimentos, casos de carga), pilares, vigas, lajes, fundações, cargas (pontual, linear, de área), furos; processável e recalculável | critérios finos e premissas do TQS (dados atuais), tipos não cobertos pelas ~15 classes iniciais, armadura bloqueada | script `.py` gerado do modelo do Statikos (ou JSON + executor genérico) | TQS 23+ com pacote Python; licença que permita o Modelador (e módulos de cálculo) [não confirmado se o Python exige algo a mais]; Windows | **alto** (mapear classes e dados atuais), mas incremental | existência e API [doc]; comportamento real [não confirmado] |
| T2 | Revit + plugin TQS (RTQ) | Média | edifício, pilares, vigas, lajes (geometria) | cargas, critérios, fundações como referência apenas | exigiria famílias nativas no Revit (add-in/Dynamo/plugin CYPE pago) | Revit + plugin gratuito + passo extra | alto | [doc] (parte do texto de 2013/14) |
| T3 | IFC importado como referência | Baixa para nativo | pavimentos, referência 2D/3D, cargas lineares de paredes | tudo estrutural | IFC (o mesmo da I1) | — | zero adicional | [doc] |
| T4 | Vento por SDF/FTV XML | Alta para vento | forças por piso (ou por pilar) | resto | planilha texto | — | baixo | [doc] |
| T5 | DWG/DXF, IEF/IFE, RTQ direto | Baixa | referência | — | — | — | — | [doc]/[não confirmado] |

### 7.4 Revit (rota intermediária)

Fontes: https://help.autodesk.com/cloudhelp/2026/ENU/Revit-DocumentPresent/files/GUID-6708CFD6-0AD7-461F-ADE8-6527423EC895.htm ; https://info.cype.com/en/product/plugin-open-bim-revit/ ; https://info.cype.com/en/subject/plugin-open-bim-revit-generating-native-revit-elements-based-on-a-structural-ifc/ ; https://info.cype.com/en/blog/step-by-step-how-to-convert-cypecad-ifcs-into-revit-native-entities/ .

- Revit abre IFC2x3 (editável) e só vincula IFC4 [doc]. O mapeamento de classes para categorias é configurável na importação [doc-parcial]; sem mapeamento o que chega vira DirectShape/modelo genérico [doc-parcial, Autodesk e CYPE].
- **Plugin Open BIM da CYPE**: "Extrair o conteúdo do vínculo e atribuir a famílias" converte um IFC estrutural do projeto BIMserver.center em elementos **nativos** (paredes, lajes, pilares estruturais, estrutura de vigas/IfcMember/IfcFooting, fundações IfcFooting/IfcPile, escadas, rampas, aberturas), por tabela de mapeamento classe/tipo para família, com arquivo Revit de template estrutural; Revit 2022 a 2027; **módulo pago** (assinatura anual) [doc]. Também converte armadura de IFC com barras em BVBS. Funciona com qualquer IFC do projeto, não só os da CYPE [doc].
- Rota própria: add-in ou Dynamo cria `FamilyInstance` com `StructuralType` (Column, Beam, Footing) e pisos pela API [doc-parcial, Autodesk]; exige Revit para testar.
- Valor da rota Revit: só aparece se o usuário quiser (a) o plugin TQS-Revit (T2) ou (b) o plugin CYPE para CYPECAD (C7). Para os três alvos há rotas diretas melhores.

### 7.5 Matriz: o que chega como elemento nativo, por rota recomendada

| Item | CYPECAD (C1/C2+C3) | Eberick (E1) | TQS (T1 Python) |
|---|---|---|---|
| Pavimentos e cotas | sim (IFC: storeys; DXF: assistente) | sim (nome, altura, nível) | sim (TQSBuild) |
| Pilares com seção e ponto fixo | sim (retangular e circular; ponto fixo pela extrusão ou camada) | sim (seção: [não confirmado]) | sim (retangular e demais seções do dado atual) |
| Vigas | contorno e aberturas pelo contorno das lajes; internas por C3 | sim | sim |
| Lajes | contorno vira gabarito; posicionar e tipificar | não documentado | sim (maciça, treliçada, nervurada) |
| Fundações | sapatas e vigas de fundação (IFC); ASC para cargas | não documentado | sim (CreateFoundation) e fundações do edifício |
| Materiais | não (assistente/obra) | não documentado | sim (TQSBuild.materials, cobrimentos) |
| Cargas | cargas de piso no assistente; paredes viram carga linear; fundação por ASC | vento por planilha; resto manual | sim (casos, pontual, linear, de área, vento) |
| Recalculável sem relançar | após completar | após completar | sim (TQSExec) |

### 7.6 Convenções de entrada (o que o nosso gerador teria de respeitar)

| Rota | Convenção | Fonte |
|---|---|---|
| CYPECAD IFC | IfcBuildingStorey com nome e elevação; IfcColumn por extrusão de perfil retangular ou circular (se faces, só essas seções); origem do perfil = ponto fixo; IfcSlab/IfcRoof com contorno; IfcFooting PAD_FOOTING e FOOTING_BEAM; IfcWallStandardCase para cargas | [doc] |
| CYPECAD DXF | camadas livres, mapeadas no assistente (pilares, contorno externo, contorno de abertura, pontos fixos); escala real; sem nome de camada ou texto obrigatório na documentação | [doc]; geometria exigida por entidade [não confirmado] |
| Eberick IFC | IfcColumn/IfcBeam; demais classes só para referência; sem especificação de atributos | [doc-parcial] |
| TQS IFC | referência: famílias do modelo listadas e ativáveis | [doc] |
| TQS Python | coordenadas em cm; dados "atuais" antes de criar; o edifício precisa existir (TQSBuild) | [doc] |
| CYPE 3D | IFC com IfcStructural*; DXF em metros com camadas selecionadas, linhas viram barras e polígonos fechados viram lajes/chapas ou painéis de carga; TXT com NODES/FRAMES/SHELLS/PANELS | [doc] |
| Vento Eberick/TQS | planilhas descritas acima | [doc] |

### 7.7 Recomendação final e ordem de implementação

Melhor rota por programa (grau de confirmação):
1. **TQS: T1, script Python** (existência da API e das funções: [doc]; comportamento com o nosso modelo: [não confirmado]). É a única rota documentada que entrega estrutura e cargas **nativas e recalculáveis** por automação. IFC vira só referência.
2. **CYPECAD: C1 (IFC) ou C2 (DXF) como partida, mais C3 (DXF de vigas)** para as vigas internas; fundação por C5 se compensar (existência [doc]; efeito [não confirmado]). Cargas de piso digitadas no assistente. Conferência de esforços do pórtico espacial por C6.
3. **Eberick: E1 (IFC com "importar pilares e vigas")**, complementado por E4 para o vento (existência [doc]; critérios do importador [não confirmado]). Lajes, fundações e cargas ficam manuais.
4. **Revit**: só como destino de visualização/BIM (IFC2x3 + plugin CYPE ou add-in), fora do caminho crítico dos três programas.

Ordem (alterada em relação à seção 6; o `plano-execucao.md` foi atualizado):
1. **I0** (bancada, nas licenças do usuário; seção 7.8). Define o que vira "Go".
2. **I1**: IFC2x3 físico, agora com requisitos por programa (perfil extrudado retangular/circular com origem no ponto fixo, IfcSlab com contorno, IfcFooting, IfcWall, storeys) e calibração pelos IFCs exportados pelos três programas.
3. **I1b**: DXF-gabarito do CYPECAD (pilares, contornos, aberturas, pontos fixos, eixos de vigas por camada) e planilhas de vento (.xlsx do Eberick, texto do TQS).
4. **I5**: gerador de script Python do TQS (núcleo: edifício, pilares, vigas, lajes maciças, cargas; depois treliçadas, fundações, processamento e extração de resultados). Prioridade alta se o I0 confirmar o ciclo.
5. **I2**: IFC analítico (IfcStructural*) para o CYPE 3D, prioridade subiu; SAF segue baixa.
6. **I3**: add-in Revit só se o I0 mostrar necessidade (plugin CYPE ou RTQ).
7. **I4**: roteiro de conferência de cálculo (esforços, γz, armaduras, deslocamentos) no edifício-teste.

Regra do projeto: toda premissa de mapeamento (orientação b×h, ponto fixo, tipo de viga do contorno, peso superficial de paredes, unidades) é confirmada com o usuário antes de implementar e fica editável.

### 7.8 Teste de bancada I0

Objetivo: trocar cada [não confirmado] acima por fato, em cerca de duas a três horas por programa, sem escrever código no Statikos. Os arquivos saem de um script descartável em `validation/interop/` (Node, fora do `npm test`), que lê o edifício-teste abaixo; nada de obra real.

**Edifício-teste I0 (fictício, em metros; origem no eixo de P1)**
- Níveis: fundação −1,50; Térreo 0,00; 1º pavimento +3,00; Cobertura +6,00 (dois lances de pilar de 3,00 m).
- Pilares: P1 (0; 0) 20×50 com ponto fixo no canto inferior esquerdo; P2 (6; 0) 30×30 no 1º lance e 25×25 acima; P3 (6; 4) 50×20 (testa a ordem b×h); P4 (0; 4) circular Ø40; P5 (3; 2) 25×25 interno.
- Vigas, 15×40 salvo indicação: V1 (0,0)–(6,0); V2 (6,0)–(6,4); V3 (6,4)–(0,4); V4 (0,4)–(0,0); V5 (0,2)–(6,2) contínua por P5; V6 (3,0)–(3,4) apoiada em V1 e V3 e cruzando V5 em P5; V1 com 20×50 como variante de seção.
- Lajes maciças de 12 cm, quatro painéis de 3×2 m formados pelas vigas; o painel de (3,2)–(6,4) com furo de 0,6×0,6 m.
- Fundações: sapatas isoladas 1,20×1,20×0,40 (P5: 1,40×1,40) e viga de fundação 15×40 de P1 a P2; variante com bloco de duas estacas em P3.
- Paredes: alvenaria de 14 cm e 2,60 m sobre V1 a V4 (só para o teste das cargas lineares).
- Material: concreto C30; aço CA-50 como propriedade.
- Cargas de referência em `cargas-I0.csv` (para digitar ou comparar): revestimento 1,0 kN/m² e acidental 1,5 kN/m² nas lajes; alvenaria 0,14×2,6×13 ≈ 4,7 kN/m; vento em duas direções por pavimento.

**Série de arquivos a gerar (`i0/`)**
- IFC: `A01-completo.ifc` (IFC2x3 CV2.0: storeys, IfcColumn/IfcBeam/IfcSlab/IfcFooting/IfcWallStandardCase, extrusão com `Axis`, tipos, material, Psets); `A02-pilares`, `A03-vigas`, `A04-lajes`, `A05-fundacoes`, `A06-paredes` (um só tema cada, para ver o que cada programa lê); `A07-pilar-brep` (pilar retangular por faces), `A08-pilar-perfil-livre` (IfcArbitraryClosedProfileDef), `A09-pilar-circular`; `A10-sem-tipos-sem-psets`; `A11-ponto-fixo-centro` e `A12-ponto-fixo-canto` (origem do perfil no centróide e no canto); `A13-ifc4` (A01 em IFC4 Reference View); `A14-nomes` ("P1 20x50" contra "P1").
- DXF (R2000, metros, escala real, um por pavimento e um com todos): `B01-gabarito-cypecad.dxf` com camadas `PILARES` (polilinha fechada por pilar), `CONTORNO-EXT`, `ABERTURAS`, `PONTO-FIXO` (ponto), `VIGAS-15x40` e `VIGAS-20x50` (eixos), `TEXTO` ("P1 20x50"); `B02-gabarito-pilar-bloco` (pilares como bloco com atributo) para o caso de polilinha não valer.
- CYPECAD fundação: `BARRAS.asc`, `NUDOS.asc`, `REAC.asc` no formato das amostras (4 pilares, casos G, Q e W).
- CYPE 3D: `C01-analitico.ifc` (IfcStructuralAnalysisModel do pórtico espacial), `C02-linhas.dxf`, `C03.txt` (NODES/FRAMES).
- Vento: `D01-vento-eberick.xlsx` (3 abas) e `D02-vento-tqs.txt` (tabulado, 4 direções).
- TQS: `E01-edificio.py` mínimo escrito a partir do manual (1 edifício de 3 pavimentos, 5 pilares, 6 vigas, 4 lajes, 1 carga de área), mais a instrução de rodar antes os `TSTMODELn.PY` que acompanham o TQS.
- Manifesto `LEIA-ME.csv` com arquivo, finalidade, programas e o que observar.

**Passo 0 (gabarito, 30 a 40 minutos por programa; o mais valioso)**: lançar o mesmo edifício à mão em cada programa e **exportar o IFC dele** (CYPECAD: Arquivo > Exportar > IFC 2x3; Eberick: Arquivo > Interoperabilidade BIM > Exportar modelo 3D, formato IFC; TQS: Ferramentas > Importar ou exportar > IFC, com "Sugerir" para o software de destino). Enviar os três IFCs e, no TQS, também o relatório do edifício. Eles mostram as classes, os tipos e a posição de perfil que cada fabricante considera "normal"; ajustamos o nosso gerador a eles antes de qualquer comparação.

**Passos por programa**
- *CYPECAD* (registrar a versão e se o módulo "Entrada automática" consta na licença; sem ele, só C5, C6 e o gabarito do passo 0):
  1. Nova obra com entrada automática por IFC; abrir `A01`, depois `A02` a `A14` em obras separadas. Anotar, em cada etapa do assistente, o que aparece nas listas de pilares, lajes e elementos (contagens, nomes, seções) e as cores do 3D.
  2. Conferir: cotas e nomes dos pavimentos; seção e orientação de P1 e P3; ponto fixo (A11 contra A12); P4 circular; se P2 muda de seção; vigas geradas no contorno e nas aberturas; sapatas e viga de fundação; cargas lineares das paredes; mensagens do programa.
  3. Nova obra por DXF/DWG com `B01` (e `B02` se a polilinha não valer): mapear as camadas, definir pavimentos e alturas; conferir pilares, contornos, pontos fixos e o deslocamento da viga.
  4. Na obra do passo 1 (e na do passo 3, se aplicável), tentar "entrada de vigas com ajuda de DXF" com `VIGAS-15x40`: anotar se funciona depois de partir de IFC.
  5. Importar o ASC (Arquivo > Importar > arquivo ASCII) e conferir seções de arranque, casos e cargas de cabeça.
  6. No CYPE 3D (se licenciado): importar `C01`, `C02`, `C03` e anotar nós, barras, apoios e extremidades.
  7. Pós-importação: completar o mínimo (lajes, cargas de piso) e **calcular**; anotar se calcula e os avisos.
- *Eberick* (registrar a versão, se é assinatura e a edição):
  1. Arquivo > Novo > Nova edificação com modelo externo: abrir `A01` com e sem a caixa "importar pilares e vigas"; depois `A02`, `A03`, `A07` a `A14`. Anotar pavimentos, quantos pilares e vigas viraram nativos, seções, posição, e o que ficou só como referência.
  2. Para IFC já vinculado: usar a conversão no pórtico 3D (2025.02) e anotar o que aparece na lista de elementos convertíveis e as opções.
  3. Processar (análise estática linear) e anotar erros D-xx e se o pórtico 3D gera.
  4. Importar `D01` no vento e conferir os casos criados.
- *TQS* (registrar a versão, módulos e se o pacote Python está instalado):
  1. Gerenciador > Interfaces BIM > Modelo BIM > IFC > Importar Modelo IFC com `A01`: anotar pavimentos, referências 2D e 3D, paredes e se algum pilar ou viga aparece como elemento (esperado: não).
  2. Python: rodar os `TSTMODELn.PY` de `TQSW\EXEC\Python`; depois `E01-edificio.py`. Anotar erros, o edifício criado no Gerenciador, o Modelador (pilares, vigas, lajes, carga) e, em seguida, o processamento global (por interface ou `TQSExec`).
  3. Vento: ler `D02` pela tabela de vento de túnel (SDF) e conferir os casos.
- *Revit* (opcional, se o usuário o tiver): abrir `A01` (File > Open > IFC) e vincular `A13`; anotar a categoria de cada elemento (estrutural nativo, DirectShape, modelo genérico) e editar um pilar. Se houver o plugin CYPE, importar via projeto BIMserver.center e rodar "Extrair o conteúdo do vínculo e atribuir a famílias". Se houver o plugin TQS, exportar o RTQ do resultado e importá-lo no TQS.

**O que observar e devolver** (planilha `I0-registro.csv`, uma linha por arquivo e programa)
- Versão, edição e módulos; arquivo; rota; resultado (ok, parcial, falha); contagens lidas (pavimentos, pilares, vigas, lajes, fundações, paredes) contra o esperado; seção correta (sim/não, b×h trocados?); ponto fixo correto; nativo e editável (sim/não, em qual janela); sobrevive a mudar a seção; recalculou (sim/não); mensagem ou log literal; tempo.
- Capturas das telas do assistente, da lista de elementos e do modelo 3D; o `.ifc.log` do Revit, quando houver; o IFC reexportado de cada programa depois da importação; os IFCs do passo 0.

**Critério de decisão (Go)**
- CYPECAD: Go no C1 se pilares com seção e ponto fixo e vigas de contorno saem corretos em A01 e A11/A12; Go no C2 se os pilares saem de `B01`; Go no C3 se as vigas de `VIGAS-*` entram depois de partir de IFC. Se nenhum, o CYPECAD fica no gabarito manual.
- Eberick: Go no E1 se pilares e vigas saem nativos e com seção correta em A01/A03; se só aparecem como referência, a rota é a conversão manual do pórtico 3D (E2) e o ganho é pequeno.
- TQS: Go no T1 se `E01` cria o edifício e o Modelador mostra os elementos, e o processamento global roda; senão, avaliar o RTQ.
- Qualquer [não confirmado] resolvido no I0 é atualizado nesta página (e as premissas de mapeamento vão para o app e o memorial, como manda o projeto).

### 7.9 Fontes desta seção

CYPE: https://info.cype.com/en/subject/cypecad-workflows-supported-by-the-program/ ; https://info.cype.com/en/subject/cypecad-automatic-entry-of-projects-dxf-dwg-and-cad-bim-models/ ; https://info.cype.com/en/subject/automatic-entry/ ; https://info.cype.com/en/subject/cypecad-ifc-entities-imported-in-the-automatic-ifc-import-process/ ; https://learning.cype.com/en/faq/what-do-the-colours-of-the-different-elements-that-appear-in-the-3d-views-of-some-sections-of-the-assistant-for-automatically-inserting-files-in-ifc-format-represent/ ; https://info.cype.com/en/product/cypecad-entering-the-structure/ ; https://info.cype.com/en/subject/cypecad-exports/ ; https://learning.cype.com/en/faq/how-to-export-an-ifc-file-from-cypecad/ ; https://learning.cype.com/en/faq/how-to-import-ascii-files-into-cypecad/ ; https://learning.cype.com/en/faq/how-can-the-fixed-points-of-revit-columns-be-read/ ; https://info.cype.com/en/subject/cype-3d-workflows-supported-by-the-program/ ; https://info.cype.com/en/subject/cype-3d-automatic-ifc-import/ ; https://info.cype.com/en/subject/cype-3d-ifc-entities-imported-via-the-automatic-entry-ifc-process/ ; https://info.cype.com/en/subject/cype-3d-import-dxf-or-dwg/ ; https://info.cype.com/en/subject/cype-3d-import-text-file/ ; https://info.cype.com/en/product/plugin-open-bim-revit/ ; https://info.cype.com/en/subject/plugin-open-bim-revit-generating-native-revit-elements-based-on-a-structural-ifc/ ; https://info.cype.com/en/blog/step-by-step-how-to-convert-cypecad-ifcs-into-revit-native-entities/ ; https://blog.bimserver.center/wp-content/uploads/2021/06/CYPE-Revit-Interoperability-Guide.-English.-2.0.pdf ; https://learning.cype.com/en/faq/how-to-upload-ifc-files-to-a-bimserver-center-project/ ; https://bimserver.center/en/faq/23 (API aberta do BIMserver.center, Swagger em https://apis.bimserver.center/swagger/swagger.html: não avaliada).

AltoQi: ver 7.2 (URLs na lista da subseção) e https://suporte.altoqi.com.br/hc/pt-br/arquitetura-e-interoperabilidade-bim ; https://suporte.altoqi.com.br/hc/pt-br/articles/360034453434 .

TQS: ver 7.3 (URLs na lista da subseção); busca no TQS Docs: `https://docs.tqs.com.br/Docs/Search?search=<termo>`.

Autodesk: https://help.autodesk.com/cloudhelp/2026/ENU/Revit-DocumentPresent/files/GUID-6708CFD6-0AD7-461F-ADE8-6527423EC895.htm ; https://help.autodesk.com/cloudhelp/2023/ENU/Revit-Model/files/GUID-21EFC097-96F3-428A-AFA4-BFEA4EDAB3D2.htm (Abrir IFC).
