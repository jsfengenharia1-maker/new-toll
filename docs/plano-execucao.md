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
| Fechamento | desempenho (13 pavimentos ≤ 3 s, teste no CI), pacote (divisão em partes sob demanda), republicação do artifact, revisão final dos "a confirmar" | | | |

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
| FU5 pranchas e memorial | S2 (feito em 21/10/2026; memorial pendente) | S1 (feito em 21/10/2026) |
| FU6 radier e vigas sobre base elástica | O | S2 |
| FU7a sapata corrida | S3 | S1 |
| FU7b fundação de muros | S3 | S1 |
| R7-0 (concluída em 20/10/2026) | — | — |
| R7a (concluída em 20/10/2026), R7b (concluída em 21/10/2026), R7c, R7d, R7f, R7g | S2 | S1 |
| R7e uniformização e linhas de dobra | S3 | S2 |
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

- 20/10/2026: plano criado; FU1 concluída; FU2 (núcleo) em andamento.
- 20/10/2026: R7-0 concluída (núcleo e interface): ferramentas da planta para dividir, unir e prolongar vigas e copiar, girar e espelhar a seleção; quadro de vigas colado; paleta Ctrl+K e Enter repetindo; cores da planta editáveis; aviso de máscara desalinhada; origem e momento na face na janela; logo no carimbo; categorias de uso como casos próprios; regressão de 10 pavimentos e desempenho (13 pavimentos ≤ 3 s, otimização do núcleo sem mudar resultados). Próximo na lane 2: R7a.
- 20/10/2026: FU2 concluída (núcleo e interface): vigas de equilíbrio e de travamento lançadas na planta de fundação, editor, janela com detalhe longitudinal e transversal, alavanca e alívio na janela do elemento, cargas do nível de fundação, níveis calculados e giro por dois pontos; e2e `FU2`. Pendências de interface da FU1 também fechadas (giro por dois pontos e níveis). Seguem FU3 (núcleo em paralelo) e FU4.
- 20/10/2026: specs da lane D escritas: `spec-frente-N2.md` (N2a–N2g, 119 itens), `spec-frente-E1.md` (E1a–E1e, 80 itens) e `spec-frente-E2.md` (E2a–E2e, 61 itens); fatia marcada na nota de cada item dos checklists (a frente segue "N"/"E": o teste só aceita a letra). Os 228 itens E restantes ficam para as specs E3 e E4. Ordem: N2a–N2c na onda 2 (a E1 depende delas), E1 na onda 3, E2 na onda 4.
- 20/10/2026: specs E3, E4, L e V escritas (lane D): `spec-frente-E3.md` (E3a–E3f, 148 itens), `spec-frente-E4.md` (E4a–E4e, 80 itens), `spec-frente-L.md` (L1–L5, 75 itens) e `spec-frente-V.md` (V1–V5, 62 itens); 365 itens alocados, cada um em uma só fatia (conferido por script), fatia marcada na nota de cada item dos checklists. Classes por fatia na tabela acima; Opus só na E3f (núcleo). Dependências three.js (V) e web-ifc (L3) já aceitas, vendorizadas sob demanda; sem bloqueio. Dependências entre frentes: E3b/E3e esperam N2f para a flecha ativa; E3c/E3d esperam N2b e N2d; E3f espera N2b, N2c, E2b e E2c; E4c espera a casca da N2b; E4e espera V1, V4 e V5; L1 espera E1b e E1c para fechar C1.28 e C1.29; L4 espera R7f e E3f para K1.4.69 e C7.8.
- 20/10/2026: FU3 no núcleo (sapata associada, bloco com vários pilares, concreto simples, descolamento, impostas, limites, unir, igualar, sobreposição e cruzamento de vigas; detalhes no Andamento de `spec-frente-FU.md`). Interface da FU3 concluída em 21/10/2026 (ver a linha seguinte).

- 21/10/2026: FU3 concluída (interface): ferramenta Fundação em modo “vários pilares” (Enter cria a sapata associada ou o bloco com vários pilares), ponto de inserção movível (N), pilares do elemento, concreto simples, altura constante, unir, igualar, impor as calculadas e editor de dimensões e armadura impostas de sapata, bloco e tubulão, opções `fund*`, limites (desenhar T, capturar da máscara DXF Q, editor de vértices, mover e Del), aviso FUND_SOBREPOSTA com botão de eliminar, contorno poligonal, pilares, faixas, malha superior, bielas por pilar e cruzamentos de vigas na planta e nos croquis da janela; e2e `FU3` (3 fluxos). Resta a validação externa (OpenSees) da associada e do bloco multi-pilar. Próximo na lane 1: FU4 (núcleo em paralelo).

- 20/10/2026: V1 concluída (núcleo e interface): vista 3D do edifício com three.js 0.186.1 vendorizado (`scripts/vendor-three.mjs`, `public/vendor/three-0.186.1.mjs`, 623 KB, sob demanda, fora do `dist/index.html`), cena por função pura em `src/core/vista3d/` com geradores registrados (`GERADORES_3D`), aba 3D com escopo por grupo, intervalo ou pavimento, tipos, transparência, perspectiva/isométrica, caminhar, seleção sincronizada com a planta, captura PNG e fallback em SVG isométrico (artifact do claude.ai ou sem WebGL); figura isométrica no memorial; C3.35–C3.41 e C7.18 fechados; e2e `V1`. Seguem V2 e V3 (podem rodar em paralelo), depois V4 e V5.
- 20/10/2026: FU4 concluída (núcleo e interface mínima): comando `fundacao.gerar` (`mcp: false`, `calculo: 'fundacao'`) sobre `src/core/building/fundacaoGerar.ts` (`planejarFundacoes`): tipo pela σadm, posição de divisa e de canto pelos pilares em frente (D 3 m, A 30°) e pelos limites, sapata associada ou bloco com vários pilares (bordas a menos de 1 m ou sobreposição estimada pelas cargas), vigas de equilíbrio e de travamento dos blocos de 1 e 2 estacas, tudo em um passo só (um desfazer); opções `gerarDistVisao/AnguloVisao/DistAssociada/DistLimite/SigmaMin`, premissa `fundacoes-gerar`, memorial, `docs/ia.md`, botão e diálogo "Gerar fundações…" no grupo Fundação e e2e `FU4`. C11.54 a C11.58 Feito. Detalhes no Andamento de `spec-frente-FU.md`.
- 21/10/2026: FU5 concluída (núcleo e interface): pranchas de fundação (`src/core/sheets/fundacao.ts` e `fundacaoDetalhe.ts`): locação e planta de cargas por nível, detalhamento de sapatas (SFS), blocos e tubulões (SFN), vigas de fundação, arranques e quantitativos; tipo `fundacao` no conjunto, na CLI e na ferramenta `pranchas`; locação dos pilares passou de SFN a SLP; ancoragem editável das vigas de fundação (C11.45); tipo "Fundação" em `Pranchas.tsx`; e2e `FU5`. C11.45, C11.67–C11.70 e K1.11.60 Feito. Detalhes no Andamento de `spec-frente-FU.md`.
- 21/10/2026: N2a concluída (núcleo e interface S1): `src/core/building/acoes.ts` (estados-limite `ESTADOS_INFO`/`estadoEmUso`, γ por origem `GAMA_ORIGEM`, controle de execução, situações do usuário e `alertasSituacoes`, equilíbrio global `equilibrioGlobal`, perfil de materiais), `empuxo.ts` (K0, Rankine, Coulomb, `diagramaEmpuxo`), `abacosVento.ts` (tabelas de pontos e interpolação; vazias por padrão), comandos `caso.compatibilidade`, `caso.arranjos`, `empuxo.tipo`, `estados.definir`, `situacao.criar/editar/remover/importar` (`mcp: false`), natureza H, grupo de uso misto, opções `equGamaFav/equGamaVento`, códigos COMB_USUARIO e EQU_TOMBAMENTO, premissas `n2a-*`, interface (Casos, CasosArranjos, EstadosLimite, Empuxo, AbacosVento, MateriaisBiblioteca, MemorialAcoes) e e2e `N2a`. Pendente do usuário: pontos dos ábacos da NBR 6123 (Ca e vizinhança). Aplicação do empuxo às paredes na E1c. 25 itens: 21 Feito; K1.5.12, K1.5.23, K1.5.29 e K1.9.46 Parcial.
- 20/10/2026: R7a concluída (núcleo e interface): tabelas de armadura editáveis para vigas, estribos, pilares e lajes (fábrica + do usuário, atribuição por elemento, importar e exportar JSON, atalho da lista de erros, memorial), erros FORA_TABELA e ARM_MANUAL e avisos de fora de tabela, simetria dos pilares por tolerância (opção `pilarSimetria`: sistema 0 %, perfil NBR sempre simétrica) e estribos de 2, 4 e 6 ramos; e2e `R7a`. Resultados de pilares do perfil do sistema mudam (menos aço); o do perfil NBR reproduz os anteriores. Fica para a R7f o `calculo: 'detalhe'` (rearmar sem nova análise). Próxima: R7b.
- 21/10/2026: R7b concluída (núcleo e interface): opções e edição fina do detalhamento de vigas (`detalhamento.ts`: redução de lb por As,calc/As,ef ligada no perfil do sistema e desligada no NBR, mínimos dos negativos e reforços em % do vão, simetria e união dos negativos, montagem contínua ou interrompida com porta-estribos, colaborante ou construtiva, gancho ou reta, perna do gancho, estribos com extensão de d/2, zona mínima e simetria, fator de emenda, tramo predefinido, desnível longitudinal, φt ≤ bw/10), comandos `viga.detalhe` e `viga.tramo` (`mcp: false`), editor e "Mostrar" na aba Detalhamento, memorial, pranchas (perna e tramo), premissa `detalhamento-vigas-opcoes` e e2e `R7b`. Com as opções da NBR (`detalhamento.base.json`) o detalhamento das vigas é idêntico ao anterior; no perfil do sistema mudam comprimentos de reforços e negativos (menos aço pela redução de lb, mais pelos mínimos de 25 % do vão), as zonas de estribos (extensão de d/2) e a união de negativos. Ficam fora o estribo em U e a ancoragem do fechamento (K1.4.65) e o As,mín longitudinal ponto a ponto (K1.12.4).
