# Plano de execução integral (20/10/2026)

Objetivo: executar, sem paradas para aprovação, todos os itens pendentes dos checklists de paridade (`checklist-manual-cypecad.md` e `checklist-manual-calculo-cypecad.md`) e as pendências das fatias já executadas. Base: `plano-frentes.md` (pendências por frente) e as specs de cada frente.

## Regras de execução

- **Sem aprovação por fatia.** Premissas: padrão do sistema = critério do programa de referência onde ele define; NBR onde não define (perfil NBR com `padraoNBR` quando difere); sem fonte = "a confirmar" no app e no memorial. Specs novas são escritas e executadas direto, sem esperar aprovação.
- **Paradas só por bloqueio real:** dependência nova (exige aceite), dado que só o usuário tem (exemplo de prancha, catálogo), conflito com premissa já confirmada, ou teste que só fecharia mudando premissa confirmada. Nesses casos a lane bloqueada para e as outras seguem.
- **Pipeline de cada fatia:** spec (se faltar) → núcleo (modelo principal) → interface (modelo mais barato) → verificação do orquestrador (`tsc -b`, `vitest`, `build`, `e2e`) → merge no branch e no `main` → push. A interface de uma fatia pode rodar junto com o núcleo da fatia seguinte da mesma lane.
- **Isolamento:** cada agente numa worktree a partir do `main` atualizado; o orquestrador faz os merges em ordem e resolve conflitos (tabelas de resumo dos checklists recontadas; `checklists.test.ts` decide).
- **Checklists:** toda fatia atualiza as linhas que tocou, os resumos, `plano-frentes.md` e o histórico; ao fim de cada frente, um agente de auditoria confere a frente inteira contra o código (como a auditoria da R7).
- **Pontos quentes de conflito:** `types.ts`, `opcoes.ts`, `premissas.ts`, `revisao.ts`, registro de comandos, checklists e `plano-frentes.md`. O CLAUDE.md só o orquestrador edita.
- **MCP:** comandos novos com `mcp: false` (limite de 40 ferramentas); acesso pelas ferramentas `comandos` e `previa`.
- **Relato ao usuário:** uma mensagem curta ao fim de cada frente (o que entrou, premissas "a confirmar" novas, números); nada é aprovado nela.

## Lanes (paralelas, áreas de código distintas)

No máximo 3 lanes de código ao mesmo tempo, mais 1 agente de documentação (specs adiantadas). Pico de 4 a 5 agentes simultâneos.

| Ordem | Lane 1 — Fundações e elementos | Lane 2 — Detalhamento e produtividade | Lane 3 — Normas e visualização | Lane D — Specs (só docs) |
|---|---|---|---|---|
| Onda 1 | FU2 (concluída) → FU3 (concluída, núcleo e interface em 21/10/2026) → FU4 (concluída) | R7-0 → R7a → R7b | — | specs N2, E1, E2 |
| Onda 2 | FU5 → FU6 → FU7a | R7c → R7d → R7e | N2a → N2b → N2c | specs E3, E4, L, V |
| Onda 3 | E1 → FU7b | R7f → R7g | N2d → N2e → N2f → N2g | auditoria FU e R |
| Onda 4 | E2 → E3a–E3f | L1 → L5 | V1 → V2 | auditoria N |
| Onda 5 | E4a–E4e (a E4e depois de V1, V4 e V5) | — | V3 → V4 → V5 | auditoria E, L e V |
| Fechamento | revisão numérica (Wp de borda/canto da punção, queda de momentos das vigas no modelo integrado, bloco multi-pilar com sinal do momento), desempenho (13 pavimentos ≤ 3 s, teste no CI), pacote (divisão em partes sob demanda), republicação do artifact, revisão final dos "a confirmar" | | | |

Dependências que definem a ordem: FU7b depende de E1 (muros); E3 aproveita as vigotas da R6/R7; V usa os resultados de N2 e E; L (lançamento por DXF/IFC) não depende de nada e fica depois da R7 por dividir arquivos da planta com a R7-0.

## Modelo e esforço por agente (decisão do usuário, 20/10/2026)

Objetivo: gastar menos créditos. Antes de soltar cada tarefa, o orquestrador a classifica pela tabela abaixo; Opus só onde há cálculo numérico novo e difícil de validar.

| Classe | Modelo / esforço | Quando |
|---|---|---|
| H | Haiku, baixo | Mecânico: recontagem e conflitos de checklists, sincronizar docs (`ia.md`, README), renomear, ajustar teste e2e por mudança de texto |
| S1 | Sonnet, baixo | Interface que segue padrão já existente (grupo, tabela, janela, campo novo), specs de frentes pequenas |
| S2 | Sonnet, médio | Interface com planta/ferramenta nova, specs, auditorias de frente, núcleo que reaproveita rotinas existentes (comandos, opções, pranchas, tabelas, geração automática) |
| S3 | Sonnet, alto | Núcleo com cálculo normativo por fórmulas conhecidas (NBR 6118/6122/15200, punção, consolos, sapata associada) |
| O | Opus, médio | Núcleo numérico novo: elementos finitos novos (casca, molas no pórtico 3D, paredes), P-Δ 3D, flecha por etapas, modelo integrado |

Escalonamento: se um agente S falhar a verificação duas vezes ou relatar dúvida numérica, a tarefa sobe uma classe (S3 → O). O orquestrador (sessão principal) só faz briefing, merge, verificação e commit.

| Fatia | Núcleo | Interface |
|---|---|---|
| FU2 | (feito, O) | (feito, S2) |
| FU3 associadas e blocos com vários pilares | S3 (núcleo feito em 20/10/2026) | S2 (interface feita em 21/10/2026) |
| FU4 geração automática | S2 (feito em 20/10/2026) | S1 (feito em 20/10/2026) |
| FU5 pranchas e memorial | S2 (feito em 21/10/2026; memorial feito na FU6) | S1 (feito em 21/10/2026) |
| FU6 radier e vigas sobre base elástica | O (feito em 21/10/2026) | S2 (feito em 21/10/2026) |
| FU7a sapata corrida | S3 | S1 |
| FU7b fundação de muros | S3 | S1 |
| R7-0 (concluída em 20/10/2026) | — | — |
| R7a (concluída em 20/10/2026), R7b (concluída em 21/10/2026), R7c (concluída em 21/10/2026), R7d (concluída em 21/10/2026), R7e (concluída em 21/10/2026), R7f (concluída em 21/10/2026), R7g (concluída em 21/10/2026) | S2 | S1 |
| N2a ações e combinações | S3 | S1 |
| N2b modelo integrado e casca | O | S1 |
| N2c pilares e P-Δ 3D | O | S1 |
| N2d punção e cortante das lajes | S3 | S1 |
| N2e vigas e lajes (avisos, suspensão) | S2 | S1 |
| N2f flechas por etapas | O | S1 |
| N2g fogo | S3 | S1 |
| E1a, E1b | S3 | S2 |
| E1c paredes e empuxo (casca) | O | S2 |
| E1d, E1e | S3 | S1 |
| E2a, E2d | S2 | S1 |
| E2b, E2c, E2e | S3 | S2 |
| E3a catálogo e fichas de vigotas | S2 | S2 |
| E3b vigotas completas (cálculo, edição, erros) | S3 | S2 |
| E3c nervuradas bidirecionais | S3 | S2 |
| E3d ábacos e punção | S3 | S2 |
| E3e lajes alveolares | S3 | S2 |
| E3f lajes inclinadas e rampas (modelo 3D fora do diafragma) | O | S2 |
| E4a escadas: modelo e tipos | S2 | S2 |
| E4b escadas: lançamento, edição e biblioteca | S2 | S2 |
| E4c escadas: cálculo (casca da N2b reaproveitada) | S3 | S1 |
| E4d escadas: armadura e detalhamento | S3 | S1 |
| E4e escadas: relatório, desenhos e fechamento da frente E | S2 | S1 |
| L1 assistente de nova obra | S2 | S2 |
| L2 DXF/DWG por camada e gabaritos | S2 | S2 |
| L3 IFC (web-ifc) | S2 | S2 |
| L4 cópias de grupo e ajudas | S2 | S2 |
| L5 ferramentas de lançamento | S2 | S2 |
| V1 vista 3D (three.js) | S2 | S2 |
| V2 cortes, seções e armaduras em 3D | S2 | S2 |
| V3 deformada, deslocamentos e flecha entre pontos | S2 | S2 |
| V4 isovalores e isolinhas | S2 | S2 |
| V5 esforços por hipótese, vistas de vigotas e saídas | S2 | S1 |
| Specs E3, E4, L, V (escritas em 20/10/2026) | S2 | — |
| Auditorias de fim de frente | S2 | — |
| Conflitos de checklist e docs | H | — |

Estimativa: ~8 agentes Opus (7 %; a E3f entra como Opus), ~102 Sonnet, ~12 Haiku.

## Fatias e agentes

| Frente | Itens pendentes | Spec | Fatias | Agentes (spec + núcleo + interface + auditoria) |
|---|---|---|---|---|
| FU | 81 | `spec-frente-FU.md` | FU2 a FU6, FU7a, FU7b | 0 + 7 + 7 + 1 = 15 |
| R7 | 109 + 11 | `spec-frente-R.md` (R7) | R7-0, R7a a R7g | 0 + 8 + 8 + 1 = 17 |
| N2 | 119 | `spec-frente-N2.md` | 7: N2a ações e combinações (25), N2b modelo integrado e casca (10), N2c pilares e P-Δ 3D (17), N2d punção e cortante das lajes (16), N2e vigas e lajes (23), N2f flechas (23), N2g fogo (5) | 1 + 7 + 7 + 1 = 16 |
| E1 | 80 | `spec-frente-E1.md` | 5: E1a transições (13), E1b pilar-parede (11), E1c paredes e empuxo (14), E1d dimensionamento e desenho de paredes (25), E1e alvenaria estrutural (17) | 1 + 5 + 5 = 11 |
| E2 | 61 | `spec-frente-E2.md` | 5: E2a seções T, chatas e amarração (7), E2b curvas e viga comum (8), E2c inclinadas (20), E2d diagonais (11), E2e consolos, vínculo externo e pré-moldadas (15) | 1 + 5 + 5 = 11 |
| E3 | 148 | `spec-frente-E3.md` | 6: E3a catálogo e fichas de vigotas (18), E3b vigotas completas (35), E3c nervuradas bidirecionais (26), E3d ábacos e punção (12), E3e alveolares (29), E3f inclinadas e rampas (28) | 1 + 6 + 6 + 1 = 14 |
| E4 | 80 | `spec-frente-E4.md` | 5: E4a modelo e tipos (26), E4b lançamento, edição e biblioteca (20), E4c cálculo (15), E4d armadura e detalhamento (11), E4e relatório, desenhos e fechamento da frente E (8) | 1 + 5 + 5 + 1 = 12 |
| L | 75 | `spec-frente-L.md` | 5: L1 assistente de nova obra (15), L2 DXF/DWG por camada (19), L3 IFC (2), L4 cópias de grupo e ajudas (19), L5 ferramentas de lançamento (20) | 1 + 5 + 5 + 1 = 12 |
| V | 62 | `spec-frente-V.md` | 5: V1 vista 3D (8), V2 cortes, seções e armaduras em 3D (4), V3 deformada e flecha entre pontos (15), V4 isovalores (19), V5 esforços por hipótese e saídas (16) | 1 + 5 + 5 + 1 = 12 |
| Fechamento | — | — | 2 | 2 |
| **Total** | | | ~55 fatias | **~122 agentes** |

## Decisões do usuário (20/10/2026)

1. **Vista 3D (V):** three.js (MIT), vendorizado em `public/vendor` e carregado sob demanda, como o DWG.
2. **Importação IFC (L):** web-ifc (MPL-2.0, WASM), vendorizado e carregado sob demanda.
3. Exemplos de prancha de viga de equilíbrio, tubulão, radier e lajes: enviados pelo usuário em 20/10/2026 (resumo fora do repositório, `padrao-desenho.md` §11). Pendente: AUDIT do DXF/DWG no AutoCAD.

## Andamento

Entradas antigas em `docs/historico-fatias.md`.

- 22/10/2026: N2e concluída (núcleo e interface): apoios, limites e avisos de modelagem das vigas e lajes. `src/core/building/apoios.ts` (parábola cúbica entre as faces, ΔM = R·t/8, redução a/2d, suspensão, critérios dos avisos); `arredondamentoApoio` (1 cúbica, padrão do sistema; 2 ΔM, padrão NBR), `momentoFaceMin`, `vigaApoiadaRigida` (trecho rígido até a face da viga de apoio, pórtico e integrado), `barraCurtaLimite/Fator`, `envoltoriaCortante`, `vigaTaxaMin`, `lajeTaxaMin`, `vigaEstriboSmax/Smin`, `lajeMomentoMinPositivo/Negativo`, `vigaSuspensao/Fator`, `criterioLinear`, `cargaProximaApoio`, `vigaEstriboComprimida`, `lajeDesnivelFator` (todas classificadas em OPCOES_ANALISE/OPCOES_DETALHE); `Viga.articulacoes` com ids de vigas cruzadas, `Laje.vigotasBiapoiadas`, `acoPos.vigaMontagem/vigaPele`; códigos ARREDONDAMENTO, VIGA_PAREDE, NAO_LINEAR, VIGA_PLACA, CONSOLO, PILAR_CURTO, CARGA_PROXIMA_APOIO, SUSPENSAO, TORCAO_MIN, ESTRIBO_COMPRIMIDA (com sugestões); suspensão no detalhamento (zona S1…), na elevação e na tabela de aço; interface em Vinculos.tsx e memorial (`data-memorial-apoios`, `data-memorial-suspensao`); premissas `n2e-*`; testes `apoiosN2e.test.ts` (funções puras contra cálculo manual; viga de 2 vãos com os três modos; suspensão = reação de q·ℓ/2; cargas a 2d; biapoiadas; desnível); e2e `N2e`. No exemplo da viga de 2 vãos o negativo do eixo passa de −28,29 para −26,83 kN·m (cúbica) e −26,72 (ΔM); `ANTES_N2E` (antesN2e.ts) fixa as opções antigas nos baselines, r70 e P-Δ × γz (tolerância 5 → 10 %: o negativo de projeto passa a ser o da face). 21 de 23 itens Feito; K1.4.1 (R7a) e K1.4.7 (redistribuição nas faces) Parcial. A confirmar: redistribuição sobre o diagrama arredondado, ΔM com R das faces, momento do eixo = estação mais próxima, parcela F(ℓ − a)/ℓ, largura bw + h/2 e redução h1/h2 da suspensão, zonas de ¼ do vão, 0,5 da menor espessura no desnível, critérios de viga-parede/linear. X4 (vibração de piso) não entrou: sem modelo de frequência do piso validado (flecha relativa aos apoios subestima a flexibilidade).
- 22/10/2026: E1b concluída (núcleo e interface; 11 itens: C4.1, C4.31, C4.32, K1.3.28-30, K1.9.34-35 Feito; K1.3.59, K1.4.30 e K1.12.21 Parcial). Pilar-parede de seção composta por retângulos (tipos reutilizáveis, espessura por pavimento), lado longo em casca de 6 nós e lado curto em barra, viga fictícia no topo para receber vigas e lajes, vigas apoiadas ao longo do pilar-parede, esforços por lado e pavimento, cargas na base, memorial e pranchas (formas e locação). Novos: `pilarParede.ts`, `pilarParedeModelo.ts`, `pilarParedeEsforcos.ts`, comandos `pilarParede.*`, `PilarParedeUI.tsx`, `MemorialPilarParede.tsx`, e2e `E1b`; validação OpenSees em `validation/opensees/pilar_parede.py`. Pacote 2.679 KB; 737 testes; e2e E1a e E1b ok. Armadura e tensões da parede ficam na E1d; X5 e X6 dependem da E1c. Detalhes no Andamento de `spec-frente-E1.md`.
- 22/10/2026: N2f, núcleo concluído (flechas por etapas e flecha ativa; 20 itens do manual de cálculo Feito, K1.4.85 e K1.12.5-12 Parcial com a E3, C7.83 Parcial até a interface). `src/core/building/flechas.ts`, comandos `etapas.definir`/`flechas.limites`, 14 opções, FLECHA_ATIVA/FLECHA_INST, `ANTES_N2F`. Próximo: interface pelos cartões `docs/cartoes/N2f/01-etapas-e-limites.md`, `02-janelas-flechas.md` e `03-memorial-e2e.md` (Haiku), depois N2g.
- 22/10/2026: E1c, núcleo concluído (6 itens do manual de cálculo a Feito; C5.2–C5.30 do manual do usuário a Parcial, à espera da interface; X5 e X6 Parcial). Paredes de concreto como pilares-parede virtuais (casca/barra por trecho), aberturas, empuxo de terra e de líquido aplicado nas cascas, paredes fora do diafragma onde não tocam laje, muro de arrimo isolado (`muroArrimo.ts`). Validação analítica e OpenSees (`validation/opensees/parede_empuxo.py`). Interface: cartões em `docs/cartoes/E1c/` (Haiku). Detalhes em `docs/historico-fatias.md`.

## Melhorias futuras (depois de concluir o aplicativo)

Decisão do usuário (21/10/2026): melhorias não essenciais ficam só registradas; começam depois que o aplicativo estiver concluído.

- Desempenho da vista 3D (`docs/analises/analise-motor3d.md`):
  - remontar só quando a geometria muda (`revGeometria`);
  - cache dos panos por grupo;
  - rótulos "?" num objeto só, com dispose;
  - filtros por visibilidade;
  - seleção por caixas;
  - cena no worker;
  - pavimentos iguais instanciados;
  - atualização incremental.
- Validação externa e QA (`docs/analises/plano-freecad-itens.md`):
  - conferência de conteúdo dos DXF;
  - fixtures IFC;
  - CalculiX (casca, radier, viga-parede, punção, bloco em sólido);
  - Gmsh × malhaTri;
  - cotas e hachuras do TechDraw como checklist de recursos;
  - benchmarks de vibração e flambagem;
  - exportação IFC estrutural.
- Desempenho do cálculo e desktop:
  - medir em 30+ pavimentos e, se o resolvedor dominar, núcleo em Rust/WASM;
  - app desktop com Tauri.
- Observação: os itens de validação que resolvem dúvidas numéricas já listadas no fechamento (Wp de borda/canto, momentos das vigas no modelo integrado, bloco multi-pilar) podem ser antecipados no fechamento se o usuário quiser.

## Interoperabilidade e documentação de exportação (depois de concluir o aplicativo)
Decisão do usuário (21/10/2026): depois de concluir o aplicativo, investigar e implementar a exportação do projeto estrutural para Revit, CYPECAD, TQS e Eberick (IFC ou outro formato), de forma que os programas reconheçam os elementos como nativos e permitam recalcular, para conferência do motor de cálculo.
- Relatório da pesquisa: `docs/analises/interoperabilidade-ifc.md` (viabilidade por programa, requisitos do IFC, limitações, itens "não confirmado"). A seção 7 (pesquisa aprofundada de 21/10/2026, páginas oficiais lidas por curl) substitui as conclusões das seções 2 a 5 onde houver conflito.
- Recomendação (seção 7.7): TQS pela API Python oficial (TQSBuild/TQSModel/TQSExec); CYPECAD pela entrada automática por IFC ou DXF (módulo AUT) mais DXF de vigas; Eberick por IFC com "importar pilares e vigas"; Revit fora do caminho crítico; CYPE 3D lê modelo analítico IFC.
- Fatias propostas (ordem de execução):
  - I0: teste de bancada nas licenças do usuário (edifício-teste fictício, série de IFC, DXF, ASC, planilhas de vento e script TQS; passo 0 = exportar IFC dos três programas como gabarito; planilha `I0-registro.csv` e critérios de Go na seção 7.8 do relatório). Trocar "não confirmado" por fato antes de implementar;
  - I1: exportar IFC2x3 (IFC4 opcional) físico com extrusão retangular/circular com origem no ponto fixo, tipos, materiais, Psets, storeys, IfcSlab com contorno, IfcFooting, IfcWall; calibrado pelos IFCs do passo 0;
  - I1b: DXF-gabarito do CYPECAD (camadas de pilares, contornos, aberturas, pontos fixos, eixos de vigas), planilha de vento do Eberick (.xlsx) e texto do TQS, ASC do CYPECAD (fundação);
  - I5: gerador de script Python do TQS (edifício, pilares, vigas, lajes, cargas; depois treliçadas, fundações, processamento e extração de resultados). Prioridade alta se o I0 confirmar o ciclo;
  - I2: modelo analítico (IfcStructuralAnalysisModel) para o CYPE 3D, prioridade subiu; SAF continua baixa;
  - I3: add-in Revit (API/Dynamo) para elementos nativos, só se o I0 mostrar necessidade (plugin CYPE pago ou plugin TQS-Revit);
  - I4: roteiro de conferência de cálculo num edifício-teste fictício, comparando esforços, γz, armaduras e deslocamentos.
