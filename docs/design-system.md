# Design system do Statikos

Decisão do usuário (20/10/2026): toda funcionalidade nova usa a biblioteca de componentes e o design system global. Uma mudança de design feita num lugar vale para o app inteiro. O redesenho visual (proposta em https://claude.ai/artifact/XkWi2JtGrgPQka5Rk7G389) fica para depois; por enquanto a aparência é a atual.

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
