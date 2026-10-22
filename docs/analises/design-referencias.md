# Referências de design system para o Statikos (software profissional, não "cara de IA")

Pesquisa de 22/10/2026. Só leitura; nenhum código alheio foi copiado. Valores de token citados foram lidos nos arquivos reais dos repositórios (raw do GitHub) salvo onde marcado "não conferido". Substitui, no que divergir, as seções 4 e 5 de `design-artcraft.md` (a prévia que seguiu aquele documento é a que foi rejeitada).

## 1. Diagnóstico da prévia (`statikos-ui.html`)

O que denuncia o visual gerado por IA, com o seletor ou valor no arquivo:

1. **Mono em caixa alta com tracking largo em quase todo rótulo.** `h2`, `.tabs button`, `details.group>summary`, `th`, `.mh` (cabeçalho de modal), `.btn.primary`, `.pill`, `.badge-c`, `.dopt .tag`: `font: 600 11px IBM Plex Mono; letter-spacing:.08–.12em; text-transform:uppercase`. É o "HUD" do ArtCraft aplicado a texto que não é dado. Software profissional usa a fonte de interface em caixa de frase; mono só para números alinhados e código.
2. **Translucidez por todo lado.** `color-mix(in srgb, X 8–18%, transparent)` em `.pl-vig`, `.pl-laje`, `.pill.*` (fundo 13% + borda 30%: três camadas por etiqueta), `.badge-c`, `.alert`, `.btn:hover`, `.btn.danger:hover`, zebra de tabela. Bordas `rgb(255 255 255 / .15)` e `/ .28`. O resultado muda de cor conforme o fundo e é a assinatura de interface gerada.
3. **Cartão de alerta com faixa colorida à esquerda** (`.alert`: 2 px de cor + fundo tingido a 8% + borda de 1 px nos outros lados). Padrão mais repetido de IA.
4. **Azul-IA saturado e "brilho" de seleção.** `#2d81ff` (accent) com `accent-soft` marinho `#14284a` e texto `#74aaff` na ferramenta ativa; thumb do slider com halo `box-shadow 0 0 0 4px accent-soft`; foco com `box-shadow` 2 px do mesmo azul.
5. **Pretos azulados e profundidade invertida.** `--surface #101014` mais escuro que `--bg #121316`; campos `#0a0a0d` e "sunken" `#060607`. Cinzas com matiz frio (R<B) em vez de neutros; o painel parece um buraco, não uma camada.
6. **Primário invertido branco/preto** (`.btn.primary`, `.seg` ativo, `.chip.on`, checkbox marcado): copiado do ArtCraft; em app denso, vários elementos brancos sólidos competem com o desenho. Na mesma tela, três "estados ativos" diferentes (branco, azul-suave, sublinhado).
7. **Texto minúsculo.** 8 px (`kbd`), 9,5 px (`.badge-c`), 10–10,5 px (`th`, `.pill`, `.tag`), 11 px (rótulos). Abaixo de 11 px não é legível em tela comum.
8. **Estrutura de "showcase".** Seções com `h2` mono, grade de estados "hover/active/focus", cartões de opções A/B, nota "Prévia visual (exemplo)": parece página de documentação gerada, não um aplicativo. O logotipo é um quadradinho azul + nome.
9. **Movimento genérico.** `transition: all 140ms cubic-bezier(.22,1,.36,1)` em todo controle e modal com `scale(.97)`: efeito uniforme que nenhum CAD tem.
10. **Mistura de dois sistemas.** Cinza neutro no claro (`#f1f1f3`...) e matiz frio no escuro; `--sel` laranja, azul e branco como três destaques.

## 2. Candidatos avaliados

| Sistema | Licença (repo) | Tokens reutilizáveis | Densidade (controle) | Dark/light | Adequação a app técnico |
|---|---|---|---|---|---|
| **Adobe Spectrum 2** (`adobe/spectrum-design-data`; `@adobe/spectrum-tokens` 15.6.0; o repo `spectrum-tokens` virou só redirecionamento) | Apache-2.0. Fontes (Adobe Clean), ícones e marcas **não** estão cobertos | JSON: `color-palette.json` (gray-25…1000 por tema `light`/`dark`), `color-aliases.json`, `layout.json`, `layout-component.json`, `typography.json` | `component-height-50/75/100/200` = 20/24/32/40 px; texto 11/12/14/16 px; `corner-radius-75/100/200` = 3/4/5 px; foco 2 px + gap 2 px | Sim, cada token com `light` e `dark`; cinzas **neutros** (R=G=B) | Alta: é a linguagem de Photoshop/Illustrator na web (uso pela Adobe é público; não verificado produto a produto). Pontos de atenção: componentes S2 usam botões em pílula e raios grandes, que não adotamos; `component-height-75` (24 px) dá a densidade de painel de propriedades |
| **Palantir Blueprint** (`palantir/blueprint`) | Apache-2.0 | SCSS: `@blueprintjs/colors` (`$dark-gray1…5`, `$gray1…5`, `$light-gray1…5`, `$blue1…5`...), `_variables.scss` | Base 4 px: botão 30, `small` 24, `smaller` 20; texto 14 / 12 (pequeno); raio 4 px | Sim (`.bp5-dark`) | Alta para tabelas, formulários e árvores densas. Cinzas com matiz azul (`#1c2127`, `#252a31`, `#2f343c`): cara de painel de dados, menos de editor. Fonte 14 px é grande para o nosso painel |
| **IBM Carbon** (`carbon-design-system/carbon`, `@carbon/themes`) | Apache-2.0; IBM Plex é OFL | TypeScript/SCSS (`packages/themes/src/tokens`: layer, field, border-subtle...). O caminho do tema g100 não foi encontrado no raw; valores abaixo vêm da documentação (não conferido): g100 fundo `#161616`, layer-01 `#262626`, layer-02 `#393939`, interactive `#4589ff` | Controles de 32 px (sm) a 48 px; 24 px só em alguns componentes. Mais folgado que o necessário | Quatro temas (white, g10, g90, g100) | Média: ótimo para dashboards e tabelas, mas a altura mínima 32 px e o espaçamento 16 px reduzem a densidade |
| **Microsoft Fluent 2** (`microsoft/fluentui`, `@fluentui/tokens`) | MIT (arquivo `LICENSE` de 1.212 bytes; ícones e fontes têm termos próprios) | TS gerado: `darkColor.ts` com fundos `#292929 / #1f1f1f / #141414 / #0a0a0a`, traço `#525252 / #666`, texto `#fff / #d6d6d6 / #adadad / #999`; raios 2/4/6/8; fontes 10/12/14 px (linhas 14/16/20) | Controle 32 px padrão, 24 px `small` | Sim; exige uma rampa de marca (brand 10…160) | Boa e neutra, mas pensada para Office/Windows (cantos 4–8 px, tipografia Segoe) |
| **Radix Colors / Themes** (`radix-ui/colors`) | MIT | `src/dark.ts`: 12 passos por escala; `gray` dark `#111 #191919 #222 #2a2a2a #313131 #3a3a3a #484848 #606060 #6e6e6e #7b7b7b #b4b4b4 #eee`; `slate` dark `#111113 … #edeef0` (matiz azul leve) | Radix Themes: botão 24 px no tamanho 1, 32 px no 2 (da documentação; não conferido) | Sim, par claro/escuro de cada escala | Excelente como **regra de uso** (passo 1 fundo, 3 elemento, 4 hover, 5 ativo, 6 borda sutil, 7 borda, 9 sólido, 11/12 texto), menos como estética de editor |
| GitHub Primer, Grafana, Penpot | MIT / AGPL-Apache / MPL-2.0 | Não avaliados a fundo | Primer 32 px; Penpot 24–32 px | Sim | Fora do foco; Penpot (editor de design aberto) é referência de layout, não de tokens |
| Blender, Onshape, Figma, AutoCAD | Blender temas em GPL; os demais sem material aberto | Blender: XML de tema sob GPL (copyleft, evitar copiar) | n/a | n/a | Usar só como referência de comportamento: três níveis de cinza, controles de ~22–24 px, um único destaque |

Licença para "usar valores": Apache-2.0 e MIT permitem copiar valores de token em código próprio. Apache-2.0 pede manter o aviso de licença e atribuição ao redistribuir obra derivada, e não dá direito às marcas (cláusula 6). Os valores aqui são ~40 cores e medidas, de natureza de dado; mesmo assim a atribuição vai no `NOTICE` do repositório. Não é parecer jurídico.

## 3. Recomendação

**Base: Adobe Spectrum 2 (somente tokens de cor, altura, raio e tamanho de texto). Alternativa: Palantir Blueprint** (se o usuário achar os cinzas do Spectrum frios demais para tabelas, Blueprint fornece cinzas e alturas de 24 px prontos para app de dados). Radix Colors entra como regra de uso dos passos, sem copiar valores.

1. É o único candidato com escala de cinza **neutra** e par claro/escuro oficial, que é o visual de Photoshop que o usuário pediu; Fluent e Carbon têm a mesma neutralidade, mas Carbon é largo demais e Fluent é "Office".
2. `component-height-75` (24 px) com texto de 12 px e raio de 4 px é exatamente a densidade de painel de propriedades e de tabela do Statikos, hoje com ~29 px.
3. Tokens em JSON com nome estável e semântica documentada (`background-base`, `layer-1`, `accent-background`, `focus-indicator`): o mapeamento para `global.css` é direto e verificável.
4. Apache-2.0, sem dependência npm: copiamos ~40 valores com atribuição; Adobe Clean, ícones e o nome "Photoshop/Spectrum/Adobe" ficam de fora.
5. Cores de status e de destaque são **sólidas** (não translúcidas) no Spectrum, o que elimina por si só os itens 2 e 3 do diagnóstico.

Fonte: **Source Sans 3** (SIL OFL 1.1, desenhada pela Adobe, a opção livre mais próxima do Adobe Clean) a 12 px, com `font-variant-numeric: tabular-nums` nos campos (conferir o recurso `tnum` na versão do Google Fonts antes de remover o mono). Fallback: IBM Plex Sans, já em uso. IBM Plex Mono só para IDs, coordenadas e código; não para rótulos.

## 4. Mapeamento de tokens (Statikos → dark → light → origem)

Nomes de `global.css` mantidos; `+` = token novo. Origem = `color-palette.json` / `layout.json` / `typography.json` do pacote `@adobe/spectrum-tokens` 15.6.0.

| Token Statikos | Dark | Light | Origem |
|---|---|---|---|
| `--bg` (moldura, área atrás da prancha) | `#111111` | `#e9e9e9` | gray-25 dark / gray-100 light (`background-pasteboard`) |
| `--surface` (painéis, barras) | `#222222` | `#f3f3f3` | gray-75 |
| `--surface-2` (botão, cabeçalho de grupo, hover leve) | `#2c2c2c` | `#e1e1e1` | gray-100 dark / gray-200 light |
| `--hover` + (hover de linha e botão) | `#323232` | `#dadada` | gray-200 dark / gray-300 light |
| `--field` + (fundo de campo e tabela) | `#1b1b1b` | `#ffffff` | gray-50 dark / gray-25 light |
| `--sunken` + (trilhos, rebaixo) | `#111111` | `#e9e9e9` | gray-25 dark / gray-100 light |
| `--line` (divisores) | `#393939` | `#dadada` | gray-300 |
| `--line-strong` + (borda de controle, 3:1) | `#6d6d6d` | `#8f8f8f` | gray-500 |
| `--ink` | `#dbdbdb` | `#292929` | gray-800 (`neutral-content-default`) |
| `--ink-strong` + (títulos) | `#f2f2f2` | `#131313` | gray-900 |
| `--muted` | `#afafaf` | `#505050` | gray-700 (`neutral-subdued-content`) |
| `--faint` + (placeholder, unidade) | `#8a8a8a` | `#717171` | gray-600 |
| `--disabled` + | `#6d6d6d` | `#8f8f8f` | gray-500 (Spectrum usa gray-400; subido para legibilidade) |
| `--accent` (fundo de ação, seleção) | `#4069fd` | `#3b63fb` | blue-800 dark / blue-900 light (`accent-background-default`) |
| `--accent-hover` + | `#345bf8` | `#274dea` | blue-700 dark / blue-1000 light |
| `--accent-ink` | `#ffffff` | `#ffffff` | texto sobre accent |
| `--accent-soft` (item selecionado em lista/ferramenta) | `#0f1c52` | `#e5f0fe` | blue-200 |
| `--accent-text` + | `#6995fe` | `#274dea` | blue-1000 |
| `--ring` + (foco 2 px, gap 2 px) | `#4069fd` | `#4b75ff` | `focus-indicator-color` = blue-800 |
| `--primary` / `--primary-ink` + | = `--accent` / `#ffffff` | idem | botão primário na cor de destaque (não branco) |
| `--bad` / `--ok` / `--warn` | `#fc432e` / `#099d59` / `#e06400` | `#d73220` / `#05834e` / `#c24e00` | red-900 / green-900 / orange-900 (cada um no seu tema) |
| `--bad-bg` / `--ok-bg` / `--warn-bg` + (etiqueta cheia) | `#df3422` / `#068850` / `#c75200` | `#d73220` / `#05834e` / `#c24e00` | red-800, green-800, orange-800 dark; 900 light |
| `--sel` (seleção no desenho) | `#ffb53d` | `#e08a00` | **mantido** (engenharia, não pele) |
| `--h-ctl-xs` + (célula editável de tabela) | 20px | 20px | `component-height-50` |
| `--h-ctl` + (controle padrão) | 24px | 24px | `component-height-75` |
| `--h-ctl-lg` + (botão de diálogo) | 32px | 32px | `component-height-100` |
| `--fs-sm` / `--fs` / `--fs-lg` + | 11 / 12 / 14px | idem | `font-size-50` / `75` / `100` |
| `--radius` / `--radius-lg` + | 4px / 6px | idem | `corner-radius-100` / `300` (checkbox e chip: 3px = `75`) |
| `--sp-1…6` + | 2 / 4 / 8 / 12 / 16 / 24px | idem | `spacing-50…400` |
| `--shadow-pop` + (menu, modal; única sombra) | `0 4px 16px #00000099` | `0 4px 16px #00000033` | valor próprio (Spectrum usa sombras de camada; não copiado) |
| `--font-ui` / `--font-num` | Source Sans 3, IBM Plex Sans, system-ui / IBM Plex Mono | idem | OFL (Google Fonts) |

Não mudam: `--paper`, `--grid*`, `--axis`, `--member`, `--c-*`, `--pl-*`, `--v3d-*`, `--grupo-*`, `--solo-*`, `--m-*`. Atenção: `--c-v` (cortante, azul `#2c67c9`/`#6a9cf0`) fica perto do novo azul de destaque; se confundir na tela de resultados, deslocar `--c-v` para ciano. O teal `#0e6a72` deixa de ser accent e fica só em `--c-il`.

Atribuição para o `NOTICE` (a acrescentar quando os valores entrarem): "Valores de cor, altura, raio e tamanho de texto derivados de @adobe/spectrum-tokens (Adobe Inc.), Apache License 2.0, https://github.com/adobe/spectrum-design-data. Marcas Adobe, Photoshop e Spectrum, fonte Adobe Clean e ícones não são usados."

## 5. Regras de estilo contra a "cara de IA" (verificáveis por grep em `design.test.ts`)

1. Sem `color-mix(` e sem `rgb(... / x)` / `rgba(` / `#rrggbbaa` em `global.css`, exceto `--scrim` e `--shadow-pop`. Estados usam tokens sólidos (`--hover`, `--accent-soft`).
2. `text-transform: uppercase` e `letter-spacing` > 0 proibidos, exceto na lista fechada: tag de atalho (`.kbd`) e unidade de rodapé. Rótulos, abas, grupos, cabeçalhos de tabela e botões em caixa de frase.
3. `font-family: var(--font-num)` só em `td.n`, campos numéricos, coordenadas e IDs. Nenhum título, aba ou botão em mono.
4. Tamanho de texto mínimo 11 px; 12 px na interface; 14 px só em título de modal. Nenhum `font-size` literal abaixo de 11px.
5. Altura de controle só por `--h-ctl-xs/--h-ctl/--h-ctl-lg`; nenhum `height` de controle em número solto.
6. Profundidade por camada de cinza (`--bg` < `--surface` < `--surface-2`; campos `--field` mais escuros que o painel), borda de 1 px `--line`; sombra só em menu, modal e tooltip (`--shadow-pop`). Sem gradiente, sem `box-shadow` de brilho/halo.
7. Um só destaque: `--accent` para ação primária, seleção e foco. Estado ativo igual em ferramenta, aba, segmento e chip (mesmo fundo `--accent-soft` + texto `--accent-text`, ou `--accent` sólido no segmento). Sem branco/preto invertido.
8. Raio máximo 6 px (`--radius-lg`); nenhuma pílula (`border-radius: 999px`/`50%`) exceto o botão do slider e o indicador de rádio.
9. Alerta e etiqueta de status: fundo sólido do tom (`--*-bg`) com `--accent-ink`, ou texto no tom sobre `--surface`; proibida a faixa lateral colorida com fundo tingido.
10. `transition` apenas de `background-color`, `border-color`, `color` em 100–140 ms (`ease-out`); proibido `transition: all` e animação de entrada com escala; zerado em `prefers-reduced-motion`.
11. Foco: `outline: 2px solid var(--ring); outline-offset: 2px`, nunca `box-shadow`.
12. Contraste: `--ink`/`--muted` sobre `--surface` ≥ 4,5:1 e `--line-strong`/`--ring` sobre `--surface` ≥ 3:1 nos dois temas (testar com cálculo de luminância no `design.test.ts`).
13. Sem elementos decorativos: sem ícone-logotipo em quadrado de cor, sem texto de preenchimento, sem emojis; ícones de traço 1,5 px em `currentColor`.
14. Tabelas: linha de 24 px (`--h-ctl`), cabeçalho em `--surface-2` caixa de frase peso 600, números à direita com `tabular-nums`, sem zebra (hover e seleção bastam).

## 6. Próximos passos (quando o redesenho for priorizado)

1. Trocar os valores em `global.css` conforme a seção 4 (tema escuro e claro) e as regras 1–6, sem renomear classes (o e2e e o `design.test.ts` seguem válidos).
2. Acrescentar ao `design.test.ts` as verificações das regras 1, 2, 4, 5, 10 e 12.
3. Atualizar o `NOTICE` e a linha da fonte em `index.html` (Source Sans 3; manter Plex Mono).
4. Refazer a prévia a partir de uma tela real (planta + painel de propriedades + tabela), sem seção de "componentes" nem cartões comparativos, e validar com o usuário nos dois temas.
