# Migração para o layout BIMCraft: plano de fatias D1 a D6

Base: `docs/analises/layout-bimcraft-mapa.md` (224 itens, todos com destino) e `docs/analises/design-bimcraft.md`. Decisão do usuário de 23/10/2026: todos os comandos e opções continuam, só mudam de lugar. Ordem obrigatória D1 → D6; dentro da fatia, na ordem dos arquivos (cada cartão compila sozinho depois dos anteriores). Cada fatia termina com `npx tsc -b`, `npm test`, `npm run build` e `npm run e2e -- --workers 4` completos verdes, `npm run mapa` regenerado e auditoria independente ao fim da frente.

## Fatias

| Fatia | Conteúdo | Cartões | Classe |
|---|---|---|---|
| D1 | Tokens e estilos novos (faixa, docas, árvore, abas de vista, módulo) + componentes `Ribbon`, `Dock`/`Palette`, `Tree`, `ViewTabs`/`StatusBar` e ícones novos em `src/app/ui`; store de layout `src/app/layout.ts` com teste | 01 CSS, 02 Ribbon, 03 layout.ts + teste + Dock e Palette, 04 Tree, 05 ViewTabs e StatusBar, 06 ícones (+ teste) | Haiku (código pronto e validado) |
| D2 | Casca: faixa com abas vazias, abas de módulo, docas redimensionáveis/recolhíveis nos três módulos, abas de vista, barra de status; sem mover conteúdo | 01 e2e (escopo da aba Fundações e viewport), 02 FaixaModulo + abas de módulo + App, 03 docas em Edifício, Fundações e Pórtico, 04 abas de vista (Edifício) e StatusBar, grades CSS | 01: Haiku; 02 a 04: Sonnet baixo (integra layout) |
| D3 | Mover os comandos para a faixa, por aba, conforme o mapa; Configuração da obra; barra de opções; barra de status por módulo | 01 estado de UI do Edifício, 02 Arquivo e Lançamento, 03 Edição, 04 Cargas, Análise e Dimensionamento, 05 Fundações, Pranchas, Vista e contextual, 06 barra de opções e barra de status, 07 Configuração da obra, 08 faixa do Pórtico e do módulo Fundações | 01, 06, 07: Sonnet baixo; 02 a 05, 08: Sonnet baixo (cada botão aponta para handler existente) |
| D4 | Navegador em árvore na doca esquerda do Edifício, seleção sincronizada com a planta | 01 função da árvore + teste (validada), 02 Navegador e pilha de paletas, 03 sincronização árvore e planta | 01: Haiku (função pura com teste); 02, 03: Sonnet baixo |
| D5 | Propriedades do elemento selecionado (doca direita) com os grupos de elemento atuais | 01 cartão do tipo (ui) + casca, 02 doca direita do Edifício, 03 Pórtico e fundação | Sonnet baixo |
| D6 | Ajuste dos fluxos e2e e do `design.test.ts`; guia `docs/design-system.md`; mapa de código | 01 helpers e seletores dos fluxos, 02 fluxos por aba, 03 design.test e documentação | 01: Haiku (substituição mecânica); 02: Sonnet baixo; 03: Haiku |

## Resultado da validação da D2 (aplicada, medida e revertida em 23/10/2026)

Linha de base: 81 fluxos verdes (3 min 24 s com 4 workers; viewport 1400 × 900).

D2 aplicada com os cartões D1 e D2 (patch validado em `docs/cartoes/D2/validado-D1-D2.patch`): `tsc -b` limpo, `design.test` 10/10.
1. Sem nenhum ajuste nos fluxos: **5 falhas em 81** (1 delas intermitente).
   - FU1 (fundação no edifício) e FU8: `getByRole('tab', { name: 'Fundações', exact: true })` resolve em 2 elementos (aba de módulo e aba "Fundações" da faixa). Correção: escopar por `getByRole('tablist', { name: 'Módulo' })` (2 usos, cartão D2-01).
   - FU3 (sapata associada, bloco de 2 pilares) e R7e (painel de edição das lajes): a faixa e a linha de abas de módulo tiram 151 px da altura; o canvas cai ao mínimo de 240 px, os cliques por coordenada deixam de acertar o pilar e o canvas passa a cobrir o painel das lajes ("canvas.int intercepts pointer events"). Correção: viewport dos fluxos de 1400 × 1080 (1 linha em `e2e/run.mjs`, cartão D2-01), que devolve ao canvas a altura anterior.
   - "planta: desempenho com 20 mil segmentos": passou isolado; tempo de captura oscila com a carga das 4 workers (já intermitente na linha de base).
2. Com os dois ajustes (escopo da aba Fundações + viewport 1080): **81 de 81 verdes** (3 min 41 s).
3. Medidas no viewport de 1400 × 900 (Edifício): canvas 1000 × 546 px, com 114 px de faixa e 37 px das abas de módulo (150 px a mais que hoje). A faixa recolhe (duplo clique numa aba), devolvendo 80 px.
4. Descoberta de implementação (já corrigida no código validado): largura da doca em `min(380px, 100%)` dentro de coluna `auto` do grid zera a coluna do desenho; usar largura em px (cartão D1-03/D2-04).

Dimensionamento da D6: a D2 sozinha custa 2 linhas de e2e. A D3 moverá botões que os fluxos acham por papel e nome (mantidos) e por classe (`.planta-barra`, `.panel .tabs`, `.topbar .status`, menu Arquivo): estimativa de 14 usos de `fileMenu` (1 helper), 4 usos de `.topbar .status`, 7 de `.planta-barra`, 5 de `.panel`/`.tabs`, e os fluxos que abrem grupos do painel por `summary` (`.edif-in`, 21 usos; `summary` com "Máscara", "Fundação" etc., que vão para CFG/NAV/PROP). Meta: nenhum seletor por texto de botão muda; só os contêineres.

## Referência aplicada
`docs/cartoes/D2/validado-D1-D2.patch` é o estado D1 + D2 que foi aplicado, medido e revertido (13 arquivos). Os cartões diferem dele só por melhorias de texto: `limitaDoca` exportado de `layout.ts` (para o teste), `.rbl` com quebra de linha e `.rbtn[aria-checked]` no CSS, regra `.tn .tl` e `RibbonGroup` com `radios`. Quem executar os cartões não precisa aplicar o patch.

## Contagem
27 cartões: D1 6, D2 4, D3 8, D4 3, D5 3, D6 3. Haiku: D1 (6), D2-01, D4-01, D6-01, D6-03 (10); Sonnet baixo: D2-02 a 04, D3 (8), D4-02 e 03, D5 (3), D6-02 (17).
