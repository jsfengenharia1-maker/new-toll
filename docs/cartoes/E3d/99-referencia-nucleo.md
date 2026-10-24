# E3d — referência do núcleo (dados, funções e comandos usados pela interface; os cartões 01 a 05 estão escritos e validados)

**Atenção:** a seção "Onde a informação aparece" abaixo é o pedido original; o que foi entregue no layout novo (grupo na doca Propriedades, camada na planta, botão na faixa Lançamento, bloco na janela de punção, memorial) está em `00-leia-primeiro.md` e nos cartões 01 a 05, com as exceções listadas lá (ferramenta Ábaco por polígono e arrastar vértices na planta).

Núcleo e pranchas já entregues (`docs/historico-fatias.md`, linha E3d). Cada item abaixo diz o dado ou a função do núcleo e onde a informação aparece. Tudo com `src/app/ui` e tokens de `global.css`; os comandos `abaco.*` (`mcp: false`) são acionados pela paleta e pelos botões, nunca editando o modelo direto.

## Dados e funções

| Necessidade | Núcleo (arquivo) | Assinatura / dado |
|---|---|---|
| Lista de ábacos da laje | `building/abacos.ts` | `abacosDaLaje(b, lajeId): Abaco[]`; `BuildingModel.abacos?: Abaco[]` (`{ id, laje, poligono, hAbaco, automatico, pilar?, gerado?, base?, comoViga? }`) |
| Zona efetiva (hachura na planta, cotas) | `building/nervuradas.ts` | `abacosEfetivos(b, l, g): { abaco, poligono: P[], area }[]` (polígono ajustado às cubetas e recortado pelo contorno); `arranjoDaLaje(b, l).abacos` |
| Nome curto e desenho | `sheets/abacoDesenho.ts` | `nomeAbaco(efs, id)` ("AB1"); `primitivasAbaco(laje, ef, nome, k, camada): Prim[]` (contorno, hachura, rótulo, cotas), reaproveitável na planta |
| Prévia do cone e das dimensões | `building/abacos.ts` | `dimensionarAbacoPilar(p: PilarGrupo, outros, hAbaco, par): { poligono, faces: { lado, extensao, origem: 'cone'\|'oposto'\|'minimo', vizinho?, distancia?, limitado? }[] }`; `pilaresDoGrupo(b, grupo)`; `gerarAbacos(b, l, par, { pilares?, hAbaco?, somenteSemViga? }): { gerados, avisos }` (não grava: é a prévia); `parametrosAbaco(opcoes, sobre?)` |
| Armadura base do ábaco | `building/abacos.ts` | `baseDoAbaco(b, l, abaco, op): { inf, sup, padrao }`; `barrasBaseAbaco(b, l, ef, g, base): BarrasBaseAbaco[]` (por direção e face: vãos, barras por vão, φ, total, comprimento) |
| Alturas, volume e rebaixo | `building/nervuradas.ts`, `nervuradasDim.ts` | `QuantitativoNervurada.volumeRebaixo`; `ResultadoNervurada.abacos[]` (`id, hAbaco, area, automatico, pilar?, base, padrao`) |
| Reforço negativo e cortante por nervura no ábaco | `building/nervuradasDim.ts` | `NervuraDim.abacos: ArmaduraNervuraAbaco[]` (`abaco, x0, x1, Mneg, AsNec, AsBase, AsBorda, barras, cabe, comprimento, Vmax, VRd1, VRd2, estribo, ok`); `SecaoCortante.solido` |
| Punção | `building/abacosPuncao.ts`, `puncao.ts` | `Dimensionamento.puncao[]` (as nervuradas entram com `abaco?: AbacoPuncaoInfo` e `armaduraExterna?`); `contornos` = [C, C′, C″] com `pontos` para desenhar; `AbacoPuncaoInfo.id === undefined` = pilar sem ábaco |
| Memorial | `building/abacosMemorial.ts` | `abacosNoMemorial(b, d, op): LinhaMemorialAbaco[]`; `puncaoSemAbaco(d)` |
| Diagnósticos estáticos | `building/abacos.ts` | `diagnosticosAbacos(b)`: `ABACO_VIGA`, `ABACO_FORA`, `ABACO_ALTURA` (já em `diagnosticosLajes` e `verificar`) |
| Opções | `building/opcoes.ts` | `abacoFracao`, `abacoCone`, `abacoExtensao`, `abacoLimMin`, `abacoLimMax` (o painel de opções é genérico; conferir o grupo "Lajes nervuradas") |

Comandos (`src/core/commands/abacos.ts`): `abaco.gerar { lajes?, grupo?, pilares?, fracao?, cone?, extensao?, limMin?, limMax?, hAbaco?, somenteSemViga?, substituir? }`, `abaco.criar { laje, poligono, hAbaco?, base?, comoViga? }`, `abaco.editar { id, poligono?, hAbaco?, comoViga? }`, `abaco.remover { ids?, lajes?, automaticos? }`, `abaco.armaduraBase { ids, inf?, sup?, sem?, padrao? }`. Mudar uma opção `abaco*` não refaz os ábacos já gerados: a interface oferece "Gerar de novo" (`abaco.gerar`, que mantém a armadura base por pilar).

## Onde a informação aparece

1. **Propriedades da laje nervurada** (janela da laje, grupo "Nervuradas bidirecionais"): seção "Ábacos" com a lista (nome ABn, pilar, h, área, automático ou manual), botão "Gerar nos pilares" (parâmetros com os padrões das opções e prévia do cone e das dimensões por face), "Novo ábaco" (polígono), altura `hAbaco` (maior ou igual à da laje), armadura base (inf e sup: n × φ por vão, "padrão"), aviso `ABACO_VIGA` e caixa "simula viga (confirmar)". Tabela por nervura com o trecho no ábaco (Mneg, As, base, reforço, comprimento, V × VRd1).
2. **Planta e janela**: ferramenta **Ábaco** (automático nos pilares selecionados por `abaco.gerar { pilares }`, ou manual por polígono com `abaco.criar`); ábacos hachurados (zona efetiva), arrastar vértices chama `abaco.editar`; punção marcada (contornos C, C′ e C″ de `Dimensionamento.puncao`, armadura radial interna e externa); pilar sem ábaco em amarelo (`ABACO_FALTA`).
3. **Aba Punção e cortante** (N2d, `Puncao.tsx`): as linhas das nervuradas mostram h e d do ábaco e da laje, o C″ fora do ábaco e, sem ábaco, a ação "gerar ábaco".
4. **Memorial**: seção "Ábacos" a partir de `abacosNoMemorial` (parâmetros e fontes "a confirmar", dimensões por face, armadura base, trechos das nervuras, punção por pavimento); a premissa `abacos` já está em `premissas.ts`.
5. **Prancha**: já saem nas formas e na armação (contorno, hachura, nome, altura e cotas; reforço sobre o pilar; armadura base nos dois lados; quadro "Armadura base dos ábacos"; punção). Só conferir o visual na prancha final e o texto do quadro.
6. **Testes**: e2e `E3d` (gerar ábacos no pano nervurado com pilares, abrir a janela, editar a altura, conferir a hachura e a punção); o e2e `E3c` continua verde.

## Limitações a registrar na interface

- A rigidez do rebaixo entra na grelha; a flecha e o γz usam essa grelha (sem Branson por nervura).
- As opções `abaco*` só valem na geração: o polígono gravado não muda sozinho.
- Fonte e interpretações "a confirmar": `docs/pendencias-usuario.md` (linhas E3d).
