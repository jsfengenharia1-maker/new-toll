# Interoperabilidade: exportar o projeto do Statikos para Revit, CYPECAD, TQS e Eberick

Data: 21/10/2026. Pesquisa feita só com buscas na web (o WebFetch ficou sem acesso de rede no ambiente, então os fatos vêm de resumos de resultados de busca; nada foi lido nas páginas completas). Tudo que não foi confirmado em fonte oficial está marcado "não confirmado". Premissa nova de exportação deve ser validada com o usuário antes de implementar (regra do projeto).

## 1. Objetivo

Exportar o modelo estrutural (pilares, vigas, lajes, fundações, pavimentos, materiais, cargas se possível) de modo que o programa de destino mostre elementos estruturais nativos, para recalcular lá e conferir o motor do Statikos.

## 2. Resultado por programa

| Programa | Caminho de importação | Vira elemento nativo calculável? | Viabilidade |
|---|---|---|---|
| Revit | Abrir/vincular IFC (2x3; IFC4 só vínculo, segundo a ajuda da Autodesk); plugin CYPE Open BIM (converte IFC estrutural em famílias nativas); plugins de terceiros (ex.: OF Estrutural lê IFC e cria vigas, pilares e lajes); Revit API/Dynamo | Sim, com mapeamento de categorias ou plugin; sem plugin, cai em DirectShape/Modelo genérico. Analítico a partir de IFC: não encontrei evidência | Média (físico) / Alta só com plugin próprio via API |
| CYPECAD | IFC de arquitetura (direto ou via BIMserver.center, "Iniciar projeto Open BIM"); DXF/DWG como gabarito | Lê pavimentos, pilares e contornos de laje como modelo de entrada, que o engenheiro caracteriza; vigas e paredes não aparecem na lista de importação. Importação de IFC é processo de início de obra | Média-baixa (assistida, não nativa total) |
| TQS | IFC (importação passou a existir na V20, segundo o Jornal TQS 45) e Revit via plugin TQS (Autodesk App Store, Revit 2022/2023); DWG/DXF | IFC entra como referência/desenho de arquitetura para lançar a estrutura (não confirmado que converte em pilares/vigas calculáveis). Plugin Revit↔TQS é o caminho de ida e volta | Baixa por IFC; média por plugin (a parte TQS não é pública, não confirmado) |
| Eberick | Criar projeto novo a partir de modelo externo IFC (pavimentos, ambientes, geometria de referência); DWG/DXF como gabarito; QiBuilder importa .OQ3D/.IFC do Eberick | Importação é de referência arquitetônica; exportação IFC do Eberick leva geometria, classe de concreto, cobrimento e armaduras. Não confirmado que lê IFC estrutural como elementos do Eberick | Baixa |

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
