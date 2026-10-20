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
| Onda 2 | FU5 → FU6 → FU7a | R7c → R7d → R7e | N2 (fatias da spec) | specs E3, E4, L, V |
| Onda 3 | E1 → FU7b | R7f → R7g | N2 (restante) | auditoria FU e R |
| Onda 4 | E2 → E3 | L (fatias da spec) | V (fatias da spec) | auditoria N |
| Onda 5 | E4 | — | V (restante) | auditoria E, L e V |
| Fechamento | desempenho (13 pavimentos ≤ 3 s, teste no CI), pacote (divisão em partes sob demanda), republicação do artifact, revisão final dos "a confirmar" | | | |

Dependências que definem a ordem: FU7b depende de E1 (muros); E3 aproveita as vigotas da R6/R7; V usa os resultados de N2 e E; L (lançamento por DXF/IFC) não depende de nada e fica depois da R7 por dividir arquivos da planta com a R7-0.

## Fatias e agentes

| Frente | Itens pendentes | Spec | Fatias | Agentes (spec + núcleo + interface + auditoria) |
|---|---|---|---|---|
| FU | 81 | `spec-frente-FU.md` | FU2 a FU6, FU7a, FU7b | 0 + 7 + 7 + 1 = 15 |
| R7 | 109 + 11 | `spec-frente-R.md` (R7) | R7-0, R7a a R7g | 0 + 8 + 8 + 1 = 17 |
| N2 | 117 | a escrever | ~5 (punção e cortante de lajes, estados-limite, P-Δ 3D, fogo NBR 15200, demais; categorias de uso como casos entraram na R7-0) | 1 + 5 + 5 + 1 = 12 |
| E1 | ~37 | a escrever | ~4 (pilar-parede, muros, paredes, empuxo) | 1 + 4 + 4 = 9 |
| E2 | ~40 | a escrever | ~4 (vigas T e chatas, inclinadas e curvas, entre pavimentos e diagonais, consolos e vínculo externo) | 1 + 4 + 4 = 9 |
| E3 | ~56 | a escrever | ~4 (nervuradas bidirecionais com ábacos, alveolares, inclinadas e rampas, vigotas completas) | 1 + 4 + 4 = 9 |
| E4 | 65 | a escrever | ~4 (lançamento, cálculo, detalhamento, pranchas) | 1 + 4 + 4 + 1 = 10 |
| L | 75 | a escrever | ~4 (assistente de obra, DXF por camada, IFC, cópias e ajudas) | 1 + 4 + 4 + 1 = 10 |
| V | 62 | a escrever | ~3 (isovalores e deformada, vista 3D do modelo, 3D das armaduras e cortes) | 1 + 3 + 3 + 1 = 8 |
| Fechamento | — | — | 2 | 2 |
| **Total** | | | ~46 fatias | **~101 agentes** |

## Decisões prévias do usuário (únicas paradas previstas)

1. **Vista 3D (V):** biblioteca de 3D (three.js, MIT, ~150 KB gz, carregada sob demanda em `public/vendor` como o DWG) ou WebGL próprio (sem dependência, mais trabalho e menos recursos).
2. **Importação IFC (L):** biblioteca web-ifc (MPL-2.0, WASM ~1 MB, sob demanda) ou deixar IFC fora e fazer só DXF.
3. Pendências já registradas: AUDIT do DXF/DWG no AutoCAD; exemplos de prancha de viga de equilíbrio, tubulão, radier e armação de lajes (sem eles seguem o padrão das pranchas de armação, "a confirmar").

## Andamento

- 20/10/2026: plano criado; FU1 concluída; FU2 (núcleo) em andamento.
- 20/10/2026: R7-0 concluída (núcleo e interface): ferramentas da planta para dividir, unir e prolongar vigas e copiar, girar e espelhar a seleção; quadro de vigas colado; paleta Ctrl+K e Enter repetindo; cores da planta editáveis; aviso de máscara desalinhada; origem e momento na face na janela; logo no carimbo; categorias de uso como casos próprios; regressão de 10 pavimentos e desempenho (13 pavimentos ≤ 3 s, otimização do núcleo sem mudar resultados). Próximo na lane 2: R7a.
