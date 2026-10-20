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
| Onda 1 | FU2 (em andamento) → FU3 → FU4 | R7-0 → R7a → R7b | — | specs N2, E1, E2 |
| Onda 2 | FU5 → FU6 → FU7a | R7c → R7d → R7e | N2a → N2b → N2c | specs E3, E4, L, V |
| Onda 3 | E1 → FU7b | R7f → R7g | N2d → N2e → N2f → N2g | auditoria FU e R |
| Onda 4 | E2 → E3 | L (fatias da spec) | V (fatias da spec) | auditoria N |
| Onda 5 | E4 | — | V (restante) | auditoria E, L e V |
| Fechamento | desempenho (13 pavimentos ≤ 3 s, teste no CI), pacote (divisão em partes sob demanda), republicação do artifact, revisão final dos "a confirmar" | | | |

Dependências que definem a ordem: FU7b depende de E1 (muros); E3 aproveita as vigotas da R6/R7; V usa os resultados de N2 e E; L (lançamento por DXF/IFC) não depende de nada e fica depois da R7 por dividir arquivos da planta com a R7-0.

## Fatias e agentes

| Frente | Itens pendentes | Spec | Fatias | Agentes (spec + núcleo + interface + auditoria) |
|---|---|---|---|---|
| FU | 81 | `spec-frente-FU.md` | FU2 a FU6, FU7a, FU7b | 0 + 7 + 7 + 1 = 15 |
| R7 | 109 + 11 | `spec-frente-R.md` (R7) | R7-0, R7a a R7g | 0 + 8 + 8 + 1 = 17 |
| N2 | 119 | `spec-frente-N2.md` | 7: N2a ações e combinações (25), N2b modelo integrado e casca (10), N2c pilares e P-Δ 3D (17), N2d punção e cortante das lajes (16), N2e vigas e lajes (23), N2f flechas (23), N2g fogo (5) | 1 + 7 + 7 + 1 = 16 |
| E1 | 80 | `spec-frente-E1.md` | 5: E1a transições (13), E1b pilar-parede (11), E1c paredes e empuxo (14), E1d dimensionamento e desenho de paredes (25), E1e alvenaria estrutural (17) | 1 + 5 + 5 = 11 |
| E2 | 61 | `spec-frente-E2.md` | 5: E2a seções T, chatas e amarração (7), E2b curvas e viga comum (8), E2c inclinadas (20), E2d diagonais (11), E2e consolos, vínculo externo e pré-moldadas (15) | 1 + 5 + 5 = 11 |
| E3 | ~56 | a escrever | ~4 (nervuradas bidirecionais com ábacos, alveolares, inclinadas e rampas, vigotas completas) | 1 + 4 + 4 = 9 |
| E4 | 65 | a escrever | ~4 (lançamento, cálculo, detalhamento, pranchas) | 1 + 4 + 4 + 1 = 10 |
| L | 75 | a escrever | ~4 (assistente de obra, DXF por camada, IFC, cópias e ajudas) | 1 + 4 + 4 + 1 = 10 |
| V | 62 | a escrever | ~3 (isovalores e deformada, vista 3D do modelo, 3D das armaduras e cortes) | 1 + 3 + 3 + 1 = 8 |
| Fechamento | — | — | 2 | 2 |
| **Total** | | | ~50 fatias | **~109 agentes** |

## Decisões prévias do usuário (únicas paradas previstas)

1. **Vista 3D (V):** biblioteca de 3D (three.js, MIT, ~150 KB gz, carregada sob demanda em `public/vendor` como o DWG) ou WebGL próprio (sem dependência, mais trabalho e menos recursos).
2. **Importação IFC (L):** biblioteca web-ifc (MPL-2.0, WASM ~1 MB, sob demanda) ou deixar IFC fora e fazer só DXF.
3. Pendências já registradas: AUDIT do DXF/DWG no AutoCAD; exemplos de prancha de viga de equilíbrio, tubulão, radier e armação de lajes (sem eles seguem o padrão das pranchas de armação, "a confirmar").

## Andamento

- 20/10/2026: plano criado; FU1 concluída; FU2 (núcleo) em andamento.
- 20/10/2026: specs da lane D escritas: `spec-frente-N2.md` (N2a–N2g, 119 itens), `spec-frente-E1.md` (E1a–E1e, 80 itens) e `spec-frente-E2.md` (E2a–E2e, 61 itens); fatia marcada na nota de cada item dos checklists (a frente segue "N"/"E": o teste só aceita a letra). Os 228 itens E restantes ficam para as specs E3 e E4. Ordem: N2a–N2c na onda 2 (a E1 depende delas), E1 na onda 3, E2 na onda 4.
