# Análise de design: referência ArtCraft / PhotoCraft para o Statikos

Pesquisa de 22/10/2026. Só leitura do repositório alheio; nada foi copiado. Valores numéricos de cor e tamanho entram como inspiração, já ajustados ao app denso de cálculo. Nenhum código, ícone, texto ou nome do ArtCraft entra no Statikos (regra de reconstrução limpa).

## 1. Fonte e licença

| Item | Dado |
|---|---|
| Projeto | ArtCraft ("the IDE for artists"), org. `storytold`: https://github.com/storytold/artcraft (app desktop Tauri + React, gerador de imagem/vídeo com IA, composição 2D/3D) |
| Irmão do editor | PhotoCraft: https://github.com/storytold/photocraft (editor de imagem tipo Photoshop, Rust + egui/wgpu, alfa). É o "substituto do Photoshop" da notícia; o app com os botões brancos e painéis escuros é o ArtCraft |
| Licença | Dupla MIT ou Apache-2.0 nos dois repositórios. Nome e logos ArtCraft são marcas fora da licença. Fontes e ícones empacotados têm licença própria (`ATTRIBUTION.md`) |
| Onde li | ArtCraft: `frontend/apps/artcraft/tailwind.config.ts`, `app/src/styles/base.css` e `tailwind.css`, `frontend/libs/components/*/src/lib/*.tsx` (button, button-icon, input, select, slider-v2, tab-selector, checkbox, switch, modal). PhotoCraft: `crates/ui-egui/src/theme.rs` (14 temas, tokens de raio, espaçamento e cor) |
| Capturas | O README não traz screenshots estáticas do ArtCraft; as conclusões vêm do código |

Obs.: a lib de componentes do ArtCraft é Tailwind + Headless UI; o Statikos é CSS próprio com tokens. Portanto só se aproveitam valores e ideias, não a estrutura.

## 2. Traços visuais do ArtCraft (extraídos do código)

1. Sistema "brutalista": superfícies quase pretas (`#121316` fundo, `#101014` painel, `#1E1F22` controles, `#060607` rebaixado), borda de 1 px branca a 15% (`rgba(255,255,255,.15)`), sem gradiente nem sombra nos painéis.
2. Raio mínimo: 3 px em tudo que se clica (botão, campo, select, aba, checkbox, switch); superfícies grandes (painel, modal, tabela) quadradas.
3. Botão primário invertido: fundo branco, texto preto, negrito; secundário = fundo `white/5` + borda 15%; ghost = só texto a 70%; destrutivo vermelho cheio.
4. Rótulos "HUD": mono (Geist Mono) 11-12 px, caixa alta, `letter-spacing` 0,12-0,15em, peso 500-600; títulos em Archivo (largura expandida); corpo em fonte do sistema.
5. Seleção/foco azul `#2D81FF` (anel de foco `#74AAFF`, 2 px, offset 3 px); abas e switch brancos sólidos quando ativos; slider fino (trilho 8 px a 15%, thumb branco 16 px, anel 4 px no hover).
6. Tema claro por troca de variáveis `--st-*` (classe `.theme-light`): fundo `#FFF`, painel `#F8F8F8`, controles `#EEEEEF`, borda `#E5E7EB`/`#DCDCDF`, texto `#111827`, rebaixado `#ECECEF`. Barras de rolagem finas (8 px) acompanham o tema.
7. Movimento curto: 140 ms (rápido) / 220 ms (base), `cubic-bezier(.22,1,.36,1)`; zerado em `prefers-reduced-motion`.

PhotoCraft (para painéis de propriedades densos): tema "Pro" com `chrome #141415`, `canvas #0E0E0F`, `dock #111112`, `card #1A1A1C`, `field #232326`, `hover #2C2C30`, `pressed #38383E`, texto `#ECECF0` / dim `#96969E` / faint `#606068`, raios 6/8/12 (3/4/6 no tema escuro tipo Photoshop), tipografia 12 px (corpo e botão) e 10,5 px (pequeno), `item_spacing 8x6`, `button_padding 10x4`, controle mínimo 24 px, slider 150 px, sombra de janela `0 10 32` e de popup `0 6 20`. Para um app técnico denso, esses 12 px / 24 px / 8x6 são a melhor régua.

## 3. Estado atual do Statikos

- `src/app/design/global.css` (805 linhas): tokens em `:root` (claro) + `@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) }` + `:root[data-theme='dark']`. O mecanismo claro/escuro por atributo `data-theme` já existe no CSS, mas nenhum TS/TSX define `data-theme` (grep sem ocorrências): hoje só segue o sistema, sem escolha do usuário. A planta e a vista 3D têm seus temas próprios (`escuro/claro/pb`), independentes.
- Paleta atual: bg `#eef1f4`/`#0f1419`, superfície `#fff`/`#161d24`, accent teal `#0e6a72`/`#3fb7bf`, raios 6-7 px nos controles e 10 px no modal, fonte IBM Plex Sans/Mono 13 px/1,4, sombra no menu e modal.
- Componentes (`ui/index.tsx`, 244 linhas): `Button`(default/primary/ghost/danger), `Chip`, `Pill`, `Note/Alert/Hint`, `Group` (`<details>`), `NumField/OptNumField/TextField/Select/Check/Seg`, células de tabela, `UseBar`, `KV`, `Slider` (input range nativo), `Modal`.
- Layout atual: barra superior, `.main` em grade `48px | 1fr | 380px` (ferramentas, prancha, painel), abas em 5 colunas no painel. Já é o arranjo do ArtCraft; a mudança é de pele, não de estrutura.

## 4. Tokens propostos

Nomes atuais mantidos (a ponte `cssVar` e o teste de design não mudam). Novos tokens marcados com `+`. Valores do escuro vêm do ArtCraft ajustados; o claro idem, com `--bg` levemente cinza para separar os painéis (no ArtCraft claro o fundo é branco).

| Token | Hoje (claro / escuro) | Proposto escuro | Proposto claro |
|---|---|---|---|
| `--bg` (moldura da área de trabalho) | `#eef1f4` / `#0f1419` | `#121316` | `#f1f1f3` |
| `--surface` (painéis, barras) | `#fff` / `#161d24` | `#101014` | `#f8f8f8` |
| `--surface-2` (controles, hover) | `#f4f6f8` / `#1c252e` | `#1e1f22` | `#eeeeef` |
| `--field` + (fundo de campo/tabela) | usa `--surface` | `#0a0a0d` | `#ffffff` |
| `--sunken` + (rebaixado, trilhos) | n/d | `#060607` | `#ececef` |
| `--ink` | `#16202a` / `#e2e8ee` | `#f2f1ee` | `#111827` |
| `--muted` | `#5b6876` / `#8f9dab` | `#9d9da3` | `#5b6472` |
| `--faint` + (placeholder, desabilitado) | n/d | `#6b6b72` | `#8b919b` |
| `--line` (borda fina) | `#d3d9df` / `#2a3540` | `rgb(255 255 255 / .15)` | `#e5e7eb` |
| `--line-strong` + (borda de controle, hover) | n/d | `rgb(255 255 255 / .28)` | `#c9ccd2` |
| `--accent` (seleção, foco, aba ativa) | `#0e6a72` / `#3fb7bf` | `#2d81ff` | `#1b63f5` |
| `--accent-ink` (texto sobre accent) | `#fff` / `#062226` | `#ffffff` | `#ffffff` |
| `--accent-soft` | `#d9eeef` / `#143a3e` | `#14284a` | `#e3edff` |
| `--accent-text` + (texto/ícone accent) | usa `--accent` | `#74aaff` | `#144ee1` |
| `--primary` + (botão primário) | usa `--accent` | `#f2f1ee` (branco) | `#111827` (tinta) |
| `--primary-ink` + | n/d | `#101014` | `#ffffff` |
| `--ring` + (anel de foco) | `--accent` | `#74aaff` | `#1b63f5` |
| `--ok` / `--warn` / `--bad` | `#2a7a46 #b7791f #b42318` / `#5cc27d #f0b44c #f97066` | `#5cc27d #f0b44c #f97066` (iguais) | `#2a7a46 #b7791f #b42318` (iguais) |
| `--sel` (seleção em desenho) | `#e08a00` / `#ffb53d` | iguais | iguais |
| `--radius` + (controles) | 6-7 px fixos | `3px` | `3px` |
| `--radius-lg` + (modal, menu) | 8-10 px fixos | `4px` | `4px` |
| `--h-ctl` + (altura de controle) | ~29 px implícito | `26px` | `26px` |
| `--fs` / `--fs-sm` / `--fs-label` + | 13 / 11,5-12 / 11 px | 12,5 / 11,5 / 11 px | iguais |
| `--shadow-pop` + (menu, modal) | `0 10px 30px / 0 20px 50px` | `0 8px 24px rgb(0 0 0 / .55)` | `0 8px 24px rgb(17 24 39 / .14)` |
| `--dur` / `--ease` + | 0,15 s | `140ms` / `cubic-bezier(.22,1,.36,1)` | iguais |
| `--scroll-thumb` / `--scroll-track` + | nativo | `#2c2c2f` / `#0b0b0c` | `#c4c4c8` / `#ececef` |

Fica de fora e não muda: `--paper`, `--grid*`, `--axis`, `--member`, `--c-*` (diagramas N, V, M, deformada, reações), `--pl-*`, `--v3d-*`, `--grupo-*`, `--solo-*`, `--m-*`. São semântica de engenharia/papel, não pele. Só `--paper`, `--grid` e `--grid-major` devem acompanhar o novo `--field`/`--bg` do escuro para não destoar (`--paper` escuro `#0b0b0e`, `--grid` `#15161a`, `--grid-major` `#1d1e23`; claro mantém).

Decisões abertas (confirmar com o usuário): (a) accent azul `#2d81ff` do ArtCraft no lugar do teal atual; o teal fica como `--c-il` das linhas de influência, sem conflito; (b) primário branco/tinta (traço mais marcante do ArtCraft) versus primário na cor de accent; proponho branco/tinta; (c) caixa alta mono nos botões: só no `primary` e nos títulos de grupo/abas, não nos demais (rótulos em português são longos).

## 5. Especificação por componente (`src/app/ui`)

Medidas em px, densidade compacta. "Estados" = hover / active / focus-visible / disabled.

| Componente | Especificação proposta |
|---|---|
| `Button` default | altura 26, padding 0 10, raio 3, fundo `--surface-2`, borda `--line-strong`, texto `--ink` 12 px peso 500. Hover: borda `--ink` a 50% e fundo +4% de brilho (`color-mix`). Active: fundo `--sunken`. Focus: anel 2 px `--ring`, offset 2. Disabled: opacidade .45 e sem hover |
| `Button primary` | fundo `--primary`, texto `--primary-ink`, sem borda visível, peso 700; caixa alta, fonte mono 11 px, tracking .08em. Hover: opacidade .9. Um por tela/diálogo |
| `Button ghost` | transparente, texto `--muted`; hover: texto `--ink` e fundo `--surface-2` |
| `Button danger` | borda e texto `--bad`; hover: fundo `--bad` a 12% (não cheio, para não gritar em tela técnica); variante cheia só em diálogo de exclusão |
| `Seg` | grupo com borda `--line`, raio 3, fundo `--sunken`, altura 24; item ativo = fundo `--primary`/`--ink` invertido e texto `--primary-ink` (como a aba do ArtCraft), sem sublinhado; separadores 1 px `--line`. Versão `small` altura 22 |
| `Check` | caixa 14x14, raio 3, borda `--line-strong`; marcada: fundo `--primary` com visto `--primary-ink`; foco com anel; rótulo 12 px `--muted` (ink se marcada). Trocar o `accent-color` nativo por `appearance:none` + `::after` do visto |
| `Select` | mesma anatomia do campo (altura 26, fundo `--field`, borda `--line`, raio 3); seta em SVG de `mask`; lista nativa mantida (acessibilidade e densidade); hover da borda `--line-strong`; foco borda `--accent` |
| `NumField` / `OptNumField` / `TextField` | `.finput`: altura 26, fundo `--field`, borda `--line`, raio 3, número em `--font-num` 12,5 px alinhado à direita com `tabular-nums`; hover borda `--line-strong`; foco borda `--accent` + anel `--accent-soft` 2 px (substitui o box-shadow atual); unidade em `--faint` 11 px; rótulo `--muted` 11 px acima (mono caixa alta é opcional e não recomendado aqui); setas de spin escondidas (já é regra do ArtCraft) |
| `NumCell` / `TextCell` | sem borda em repouso, borda `--line` no hover, `--accent` ao editar; altura 22 |
| `Slider` | trilho 4 px (`--sunken` com borda `--line`), preenchimento `--primary`, thumb 12 px `--primary` com borda do fundo, anel 4 px `--accent-soft` no hover/arraste; valor à direita em mono; no CSS: `input[type=range]` com `appearance:none` e pseudo-elementos `::-webkit-slider-*` e `::-moz-range-*` |
| `Group` (painel recolhível) | `<details>` mantido. Cabeçalho altura 30, fundo `--surface`, borda inferior `--line`, título mono 11 px caixa alta tracking .12em `--muted`, chevron SVG que gira 90°, hover do cabeçalho `--surface-2`; corpo com padding 10x12 e gap 8. Aberto: título em `--ink`. Sem sombra; sem raio (superfície grande quadrada) |
| `Modal` | fundo de tela `rgb(0 0 0 / .55)` (escuro) / `rgb(17 24 39 / .35)` (claro); caixa `--surface`, borda `--line`, raio 4, `--shadow-pop`; cabeçalho 36 px com título mono caixa alta e botão fechar ghost 26x26; entrada 140 ms (opacidade + escala .97 a 1), desligada com `prefers-reduced-motion` |
| `Chip` | altura 22, raio 3 (deixa de ser pílula), fundo `--surface-2`, borda `--line`, mono 11 px; `on`: fundo `--primary`, texto `--primary-ink` (idem aba "filter-tab" do ArtCraft) |
| `Pill` (situação) | mantém formato de etiqueta, raio 3, mono 10,5 px caixa alta, tons `ok/warn/bad/na` com fundo a 13% e borda a 30% da cor; `big` altura 24 |
| `Note` / `Alert` / `Hint` | raio 3, borda esquerda 2 px na cor do tom, fundo a 8%; `Hint` sem caixa, `--faint` |
| `UseBar` / `KV` | `UseBar` altura 12, raio 2, trilho `--sunken`; `KV` inalterado (só `--faint` nos rótulos) |
| Toolbar de ferramentas da planta (`.toolbar`/`.tool`) | coluna de 44 px (hoje 48), fundo `--surface`, borda direita `--line`; botão 32x32, raio 3, ícone 18 px traço 1,6; repouso `--muted`; hover fundo `--surface-2`; ativo: fundo `--primary`, ícone `--primary-ink` (quadrado branco como no ArtCraft) ou, mais discreto, `--accent-soft` com borda `--accent`; recomendo o segundo na planta para não competir com o desenho. Atalho (`.kbd`) 9 px mono; separadores horizontais 1 px entre grupos; tooltip com nome e tecla após 400 ms |
| Abas (`.tabs`) | altura 32, fundo `--surface`, texto mono 11 px caixa alta tracking .08em `--muted`; ativa: `--ink` com sublinhado 2 px `--accent` (mantém o padrão atual, que em 5 colunas é mais legível que a pílula branca); hover `--ink` |
| Barra superior (`.topbar`) | altura 40, fundo `--surface`, borda inferior `--line`; botões `.tbtn` 28x28 raio 3, sem borda até o hover; nome do projeto com campo que ganha borda no hover; marca "Statikos" em peso 600 |
| Menus (`.menu`) | fundo `--surface`, borda `--line`, raio 4, `--shadow-pop`, item altura 26, hover `--surface-2`, atalho em mono `--faint` |
| Tabelas (`.tablewrap`) | cabeçalho fixo mono 10,5 px caixa alta `--muted` sobre `--surface`; linhas altura 24, zebra opcional `--sunken` a 40%; borda `--line`; sem raio |
| Barras de rolagem | 8 px, trilho `--scroll-track`, polegar `--scroll-thumb` com borda de 2 px do trilho (tema incluído) |

Densidade: corpo 12,5 px (hoje 13), controles 26 px, espaçamento base 4/8/12; em tabelas e painel de propriedades isso põe ~15% mais linhas por tela que hoje.

## 6. Layout geral proposto

Já é o do ArtCraft/Photoshop; ajustes:

- Barra superior 40 px (marca, menus Arquivo/Editar, nome, status do cálculo, alternador de tema, desfazer/refazer, Imprimir).
- Coluna de ferramentas 44 px à esquerda, só na planta/pórtico; agrupar por separadores (seleção, desenho, fundação, edição).
- Centro: prancha em canvas com `--paper`; cantos sem moldura, 1 px `--line` entre áreas (sem cartões flutuantes).
- Painel de propriedades à direita, largura 360 px (hoje 380) com divisor arrastável (min 300, máx 520) e memória da largura; abas no topo, grupos recolhíveis abaixo (estado aberto/fechado lembrado por título).
- Rodapé opcional de 22 px com coordenadas, snap e unidade (mono 11 px `--muted`), no lugar de textos soltos no canvas.
- Tablet/estreito: o painel já vira gaveta (`.panel-toggle`); manter.

## 7. Troca claro/escuro

1. Preferência `tema` com três valores: `auto` (segue o sistema), `claro`, `escuro`. Padrão `auto`.
2. Aplicação: atributo `data-theme="light|dark"` na `<html>` só quando o usuário escolhe; em `auto` o atributo some e vale o `@media (prefers-color-scheme: dark)` que já existe (seletor `:root:not([data-theme='light'])`). `color-scheme` já é declarado no escuro; declarar também `color-scheme: light` no claro (barras e controles nativos).
3. Persistência: `localStorage['statikos:tema']` dentro de `try/catch` (no artifact e em janela privada pode falhar). Não vai para o arquivo `.statikos` (é preferência do aparelho, como o tema da planta). Aplicar antes do React montar (script de uma linha no `index.html`) para evitar o clarão.
4. Interface: botão `Seg` de três posições (sol / auto / lua) na barra superior; atalho opcional. Ouvir `matchMedia('(prefers-color-scheme: dark)')` para refletir mudanças em `auto`.
5. Relação com os temas da planta e da vista 3D (`escuro/claro/pb`): hoje independentes. Proposta: acrescentar o valor `auto` à planta, que acompanha o tema da interface, mantendo `pb` (impressão) como escolha manual. Memorial e pranchas seguem fora do tema (papel branco).
6. Teste: `design.test.ts` hoje confere cores literais; incluir verificação de que todo token do bloco claro existe no escuro e vice-versa (evita token esquecido) e contraste mínimo 4,5:1 de `--ink`/`--muted` sobre `--surface` nos dois temas.

## 8. O que muda onde

**Só `global.css` (tokens e classes, sem tocar em TSX):**
- Bloco `:root` e as duas cópias do escuro (hoje duplicadas: `@media` e `[data-theme='dark']`; unificar numa lista de seletores `:root[data-theme='dark'], :root:not([data-theme='light']) @media`): novos valores e novos tokens da seção 4.
- `.btn`, `.btn.primary/.ghost/.danger`, `.chip`, `.pill`, `.seg`, `.finput`, `.unit`, `.check`, `.group > summary`, `.gbody`, `.modal*`, `.menu*`, `.tool`, `.tabs`, `.topbar/.tbtn`, `.usebar`, `.note/.alert`, `.tablewrap`: raio, altura, fontes, bordas, estados.
- Slider (`input[type=range]`), barras de rolagem, foco global (`:focus-visible` com `--ring`), movimento (`--dur`, `--ease`, `prefers-reduced-motion`), `body` (12,5 px).
- Grade `.main` (44px | 1fr | 360px).

**Componentes (`ui/index.tsx`) e novos arquivos:**
- `Check`: marcador desenhado em CSS (pode exigir um `<span>` extra).
- `Group`: troca do `▸` em `::before` por ícone SVG; guardar aberto/fechado (opcional, via prop `id`).
- `Modal`: botão fechar ghost e título em mono; foco preso e Esc já devem existir (verificar).
- Novo `ThemeSwitch` (usa `Seg`) e hook `useTema` (aplica `data-theme`, `matchMedia`, `localStorage`), mais o script de pré-carga no `index.html`.
- `plantaStore.ts`: opção `auto` no tema da planta.
- Divisor arrastável do painel direito (estado de largura no `store`, valor aplicado por `style={{ width }}`, permitido pela regra 4 do design system).

**Não muda:** tokens `--c-*`, `--pl-*`, `--v3d-*`, `--m-*`, `src/core/sheets`, memorial/impressão, `tokens.ts` (a ponte `cssVar` continua válida; novos tokens entram sem alteração).

## 9. Ordem sugerida (quando o redesenho for priorizado)

1. Tokens novos + valores dos dois temas + `ThemeSwitch` (resultado visível imediato, risco baixo).
2. Controles (botão, campo, select, check, seg, slider) e estados de foco/disabled.
3. Chrome: barra superior, ferramentas, abas, grupos, menus, modal.
4. Tabelas, rolagem, densidade, divisor do painel.
5. Revisão de contraste (4,5:1 texto, 3:1 componentes) nos dois temas e capturas e2e de cada aba nos dois temas.

Risco: `design.test.ts` e os e2e usam seletores por classe e `data-*`; nenhuma classe é renomeada nesta proposta, então os fluxos existentes continuam válidos.
