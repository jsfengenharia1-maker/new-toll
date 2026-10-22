# Checklist de itens extras (fora dos manuais do programa de referência)

Itens que não constam nos manuais do programa de referência (`checklist-manual-cypecad.md` e `checklist-manual-calculo-cypecad.md`). Mesma escala de situação: Feito, Parcial, Falta, Fora. Frente dona na coluna Frente (N, R, E, FU, L, V), "—" quando não há frente.

| Id | Item | Situação | Frente | Nota |
|---|---|---|---|---|
| X1 | Viga-parede (NBR 6118 22.4): detecção automática, dimensionamento e detalhamento | Falta | E2 | hoje só o alerta K1.3.47 |
| X2 | Interação solo-estrutura pelo SPT: molas automáticas por estaca/sapata, capacidade por Aoki-Velloso, recalques no ELS e distorção angular | Parcial | FU9 | molas por gdl e k do radier já existem (N2c, FU6) |
| X3 | Copiloto de IA dentro do app sobre o MCP existente, com aprovação por alteração | Parcial | L | MCP e CLI existem; falta a interface de chat |
| X4 | Vibração de piso (NBR 6118 23.3) | Falta | N2 | — |
| X5 | Reservatórios (paredes e fundo, empuxo hidrostático) | Parcial | E1 | empuxo hidrostático de líquido nas paredes (`EmpuxoParede.liquido`, `pressoesDaParede`, E1c); fundo como laje/radier com carga de área; falta armadura das paredes e do fundo e a verificação de estanqueidade [E1d] |
| X6 | Muro de arrimo isolado (estabilidade ao tombamento e deslizamento, dimensionamento) | Parcial | E1 | `estabilidadeMuro` (`muroArrimo.ts`, E1c): tombamento, deslizamento, tensões na base e esforços do fuste; falta interface e dimensionamento do fuste e da base [E1d] |
| X7 | Custo estimado por m² (preços unitários editáveis sobre os quantitativos) | Falta | L | — |
| X8 | Sismo (NBR 15421) | Fora | — | decisão de escopo mantida; reavaliar com o usuário |

Origem: comparação com um projeto público de mesma finalidade (licença MIT), usado só como fonte de ideias; nada de código copiado (21/10/2026).
