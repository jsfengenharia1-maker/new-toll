# Design system do Statikos

Decisão do usuário (20/10/2026): toda funcionalidade nova usa a biblioteca de componentes e o design system global. Uma mudança de design feita num lugar vale para o app inteiro. Redesenho visual (lote 1, 22/10/2026): tokens e componentes seguem a prévia aprovada `docs/analises/design-previa.html` e `docs/analises/design-referencias.md` (valores derivados do Spectrum 2, Apache-2.0; atribuição no `NOTICE`). Os controles crus dos demais arquivos migram para `src/app/ui` no lote 2.

## Onde fica cada coisa

| Arquivo | Papel |
|---|---|
| `src/app/design/global.css` | Fonte única da interface: tokens (`:root` e tema escuro), classes dos componentes, arranjo das telas. É o único CSS importado pelo app (`src/main.tsx`). |
| `src/app/design/memorial.css` | Design do papel (memoriais e figuras SVG estáticas). Tokens `--m-*`. O texto vai inteiro no HTML exportado. |
| `src/app/design/impressao-app.css` | Regras de impressão da janela do app com um memorial aberto. |
| `src/app/design/tokens.ts` | Ponte para o JS: `memo('ink')` (tokens do papel, para SVG em texto) e `cssVar('pl-escuro-viga')` (tokens da interface lidos do documento, para o Canvas 2D). |
| `src/app/design/design.test.ts` | Guarda das regras abaixo (roda no `npm test`). |
| `src/app/ui/index.tsx` | Biblioteca de componentes. |

## Regras (o teste reprova quem quebrar)

1. Nenhuma cor literal (`#hex`, `rgb()`, `hsl()`) em `.ts`/`.tsx` fora de `src/app/design/`. Cor nova vira token em `global.css` (interface) ou `memorial.css` (papel).
2. CSS só em `src/app/design/`. Nada de `.css` por componente, CSS-in-JS ou `<style>` com regra nova.
3. Toda classe usada em `className` existe em `global.css` ou `memorial.css`; uma família dinâmica (`st-${status}`) precisa de ao menos uma classe com o prefixo. Marcadores para teste usam `data-*`, não classe.
4. `style={{…}}` só para valores calculados em tempo de execução: `width`, `height`, `left`, `top`, `right`, `bottom`, `cursor`, `transform`, `fontSize`. Cor, borda, margem, espaçamento e fonte nunca.
5. Peça de interface usada em mais de um lugar vai para `src/app/ui` e se veste só com classes de `global.css`. Antes de escrever `<button className="btn">`, `<span className="pill">` etc., use o componente.

Fora do escopo: `src/core/sheets` (pranchas PDF/DXF/DWG), cujas penas, camadas e cores seguem as normas ABNT de representação, não o design da interface.

## Paleta e estilo (redesenho, lote 1)

- Paleta enxuta: neutros (R=G=B) + **um** accent azul (`--accent`, `--accent-text`, `--accent-soft`). Seleção na planta e no app = accent (`--sel`). Tema escuro é o `:root` puro; o claro redefine nos blocos `prefers-color-scheme: light` e `[data-theme='light']`.
- Cores semânticas (`--ok`, `--warn`, `--bad`) só em ícones, pontos (`.pill::before`, `.status::before`), texto pequeno e erros na planta. Etiqueta (`Pill`) neutra com ponto colorido; `Alert` neutro com ponto colorido; botão destrutivo = texto `--bad`.
- Planta, vista 3D, grupos, solos, diagramas e detalhamento: diferenciar por tom de cinza, traço e espessura, não por matiz (exceto o accent). `memorial.css` (papel impresso) não muda.
- Tipografia: Source Sans 3 (UI, 12 px) e IBM Plex Mono só para números (OFL, Google Fonts como antes; pilha de sistema como reserva). Controles de 24 px (`--h-ctl`), raio 4 px (`--radius`), foco por `outline` 2 px `--ring`.
- Regras testadas em `design.test.ts`: sem `color-mix(`, sem `text-transform: uppercase` (fora do memorial), sem `transition: all`, todo token no `:root` puro antes dos blocos de tema. Transições só de cor, 120 ms (`--dur`). Sem mono em caixa alta com espaçamento em rótulos, abas e grupos.
- Tema da interface: `ThemeSelect` (ui) na barra superior; Sistema/Escuro/Claro em `localStorage` (`statikos:tema`), aplicado em `document.documentElement` por `iniciarTema()` no `main.tsx` (`design/tema.ts`). A planta segue o tema do app enquanto o usuário não escolher um tema próprio (`statikos:tema-planta`).

## Tokens

- Interface: `--bg`, `--surface`, `--surface-2`, `--ink`, `--muted`, `--line`, `--accent`, `--accent-ink`, `--accent-soft`, `--ok`, `--warn`, `--bad`, `--sel`; fontes `--font-ui`, `--font-num`.
- Desenho do pórtico (SVG): `--paper`, `--grid`, `--grid-major`, `--axis`, `--member`, diagramas `--c-n`, `--c-v`, `--c-m`, `--c-def`, `--c-react`, `--c-load`, `--c-il`.
- Planta do edifício (Canvas 2D): `--pl-<tema>-<chave>` para os temas `escuro`, `claro` e `pb` (20 chaves cada; `limite` desde a FU3), lidos por `paleta()` em `plantaStore.ts`.
- Vista 3D: `--v3d-<tema>-<chave>` (`escuro`, `claro`, `pb`; 11 chaves: fundo, pilar, viga, laje, parede, escada, fundacao, pendente, linha, selecao, destaque), ligadas por `.v3d[data-tema]` às variáveis `--v3d-<chave>` que o renderizador e o isométrico em SVG leem.
- Grupos de pavimentos: `--grupo-0` a `--grupo-7` (classes `.grupo-c<i>` + `.grupo-marca`, `.grupo-faixa`, `.grupo-linha`).
- Solos do perfil SPT: `--solo-argila`, `--solo-silte-argiloso`, `--solo-silte-arenoso`, `--solo-areia` (classes `.solo-<tipo>`).
- Papel: `--m-*` em `memorial.css` (tinta, linhas, estados, cores das figuras).

## Componentes (`src/app/ui`)

| Componente | Uso |
|---|---|
| `Button` | Ação. `variant`: `default`, `primary` (ação principal), `ghost`, `danger`. |
| `Chip` | Botão-etiqueta alternável (`on`). |
| `Pill` | Situação: `tone` `ok` / `warn` / `bad` / `na`; `big`. |
| `Note`, `Alert`, `Hint` | Observação curta (`tone="bad"`), erro em destaque (`compact`), dica. |
| `Group` | Seção recolhível do painel. |
| `NumField`, `OptNumField`, `TextField`, `Select`, `Check`, `Seg` | Campos com rótulo; numérico com unidade, opcional (vazio = sem valor), texto, lista, caixa, segmentado. |
| `NumCell`, `OptNumCell`, `TextCell` | Células editáveis de tabela (Enter confirma, Esc desfaz). |
| `UseBar` | Barra da taxa de utilização. |
| `KV` | Lista rótulo/valor. |
| `Slider` | Barra deslizante com o valor ao lado (transparência, velocidade, ângulos da vista 3D). |
| `Spacer` | Empurra o resto da linha para a direita. |
| `download`, `copyText`, `useId` | Utilidades de interface (arquivo, área de transferência, id). |

## Como mudar o design depois

- Cor, fonte, raio, sombra: editar o token em `global.css`; vale no app inteiro, nos dois temas.
- Aparência de um componente: editar a classe dele em `global.css` (por exemplo `.btn`, `.pill`, `.group`).
- Estrutura de um componente (ícone no botão, novo estado): editar só o componente em `src/app/ui`.
- Memoriais: `memorial.css`.

## Como criar um componente

1. Escrever em `src/app/ui/index.tsx`, com comentário de uma linha dizendo o uso.
2. Criar as classes em `global.css`, na seção de componentes, usando só tokens.
3. Acrescentar à tabela acima.
