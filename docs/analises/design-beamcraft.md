# Análise de design: referência BIM (BeamCraft / BIMCraft) para o Statikos

Pesquisa de 23/10/2026. Só leitura; nada foi copiado. Valores de cor e medida entram como inspiração. Nenhum código, ícone, texto ou nome do projeto de referência entra no Statikos (reconstrução limpa). Prévia: `statikos-beamcraft.html` (artifact "Statikos Visual BIM"; fora do repositório, na pasta de trabalho da sessão).

## 1. Projeto identificado e licença

Busca no GitHub por "beamcraft" devolve 13 repositórios; só dois são plausíveis como "alternativa open source ao Revit".

| Candidato | Link | Licença | O que é | Veredito |
|---|---|---|---|---|
| **BIMCraft** (IPedrax) | https://github.com/IPedrax/BIMCraft | MIT ou Apache-2.0 (NOTICE cita código portado de rvt-rs, Apache-2.0) | "Take de código aberto e limpo do fluxo do Revit", Rust + egui, IFC, comandos para agentes (MCP). Desktop com faixa de abas, Propriedades + Navegador de Projeto acoplados à esquerda, abas de vista, barra de status | **Mais provável.** É o que tem a cara de Revit com o painel de propriedades lateral e a navegação por abas; o usuário provavelmente trocou o nome |
| **BeamCraft** (Apibim-com) | https://github.com/Apibim-com/BeamCraft | MPL-2.0 | Bancada de detalhamento de aço estrutural (tipo Tekla), Rust, IFC/DSTV. Pré-alfa: não há aplicação usável nem tema; `apps/beamcraft-ui` só tem 3 cores soltas | Existe com o nome exato, mas é Tekla, não Revit, e não tem identidade visual a extrair |
| Outros "beamcraft" | DJtsdk/BeamCraft, captiencelovesarch/beamcraft (mod de Minecraft); TarfuPingouin/BeamCraft (SVG para GCode) | n/d | Sem relação | Descartados |

Conclusão: a referência visual é o **BIMCraft** (tema em `crates/ui-egui/src/style.rs`, docas em `dock.rs`, capturas em `docs/images/*.png`). Se o usuário falava do BeamCraft da Apibim, nada muda neste documento, porque ele não tem UI. **Confirmar com o usuário** qual projeto ele viu. Licença permissiva: valores de cor e medida podem ser usados; aviso no `NOTICE` só se algum valor for copiado literalmente (aqui nenhum é; os valores propostos continuam os do Spectrum 2 já aprovados).

## 2. Traços extraídos do BIMCraft

1. **Layout de faixa (ribbon).** Barra de acesso rápido (abrir, salvar, desfazer, refazer, título) > abas de comando (Arquitetura, Estrutura, Anotar, Vista, Gerenciar, Modificar) > faixa de grupos com botões grandes (ícone 22 px + rótulo, grupo nomeado embaixo) > barra de opções do comando ativo > área de trabalho > barra de status (dica à esquerda, coordenadas e filtro à direita).
2. **Docas independentes.** Propriedades e Navegador são "paletas" que acoplam à esquerda, à direita ou embaixo, empilham (cada pilha redimensionável, mín. 80 px; lateral 290 px padrão, mín. 140 px), viram abas uma da outra ou flutuam; o layout é guardado nas configurações do usuário. A aba de vista acima do desenho também pode flutuar.
3. **Propriedades.** Cartão do tipo no topo (ícone 32 px, nome, tipo), contagem "Vigas (1)" + botão "Editar tipo", e grupos recolhíveis (Restrições, Dimensões...) com linha de duas colunas: rótulo à esquerda, campo à direita. Campo somente leitura em cinza.
4. **Navegador em árvore** (Vistas > Plantas > Nível 1), item ativo em azul suave, recuo de ~16 px por nível, busca.
5. **Paleta cinza-ardósia + um azul.** Densidade de editor: texto 13 px (pequeno 11, título 15), controle 22 px, botão com padding 8x3, raio 4 px, espaçamento 8x4, sem sombra nas paletas (só borda de 1 px). Aba contextual em verde ("Modificar | Vigas").

## 3. Comparação com o Statikos atual

- **Paleta:** BIMCraft usa Tailwind slate (matiz azul: R<B) e azul 500/600. O Statikos aprovado usa neutros R=G=B (Spectrum 2) e um accent azul `#4069fd`/`#3b63fb`. As duas têm um destaque azul e seleção no accent; a divergência é só o matiz dos cinzas e o verde da aba contextual. **Recomendação: manter a paleta aprovada.** O verde contextual não entra (semântica só em ponto/ícone); a aba contextual ganha o accent.
- **Tamanho:** BIMCraft 13/22 px; Statikos 12/24 px. Manter o do Statikos (já é mais denso e vem do Spectrum).
- **Estrutura atual** (`src/App.tsx`, `Edificio.tsx`): barra superior com tudo (menu, nome, desfazer, módulos, status, Salvar, Biblioteca, Memorial, Ajuda, Tema); Pórtico = ferramentas 48 px | Canvas | painel de 380 px com 5 abas; Edifício = coluna de 400 px (`.edif-in`: atalhos, etapas, Obra, Pavimentos...) | abas `.edif-tabs` (Planta, 3D, Elevação, Verificação, Análise, Deslocamentos, Isovalores, Dimensionamento, Pranchas, Premissas) + desenho/saída; Fundações = entrada 440 px | saída.
- **O que o BIMCraft tem a mais:** faixa de grupos com rótulo, barra de opções do comando, árvore navegável de pavimentos e elementos, painel de propriedades do selecionado, docas configuráveis.

## 4. Tokens (Statikos → escuro → claro → origem)

Os valores já aprovados (`global.css`, tabela da seção 4 de `design-referencias.md`) ficam. Novos tokens necessários só para a arquitetura:

| Token Statikos | Dark | Light | Origem |
|---|---|---|---|
| `--bg` / `--surface` / `--surface-2` / `--hover` / `--field` | `#111111` / `#222222` / `#2c2c2c` / `#323232` / `#1b1b1b` | `#e9e9e9` / `#f3f3f3` / `#e1e1e1` / `#dadada` / `#ffffff` | Spectrum 2 (mantidos); análogo a bar/panel/surface do BIMCraft (`#262B33`/`#1E2228`/`#171A1F` escuro; `#F1F5F9`/`#F8FAFC`/`#FFF` claro) |
| `--accent` / `--accent-soft` / `--accent-text` | `#4069fd` / `#0f1c52` / `#6995fe` | `#3b63fb` / `#e5f0fe` / `#274dea` | mantidos; BIMCraft `#3B82F6`/`#1E3A5F` escuro, `#2563EB`/`#BFDBFE` claro |
| `--line` / `--line-strong` | `#393939` / `#6d6d6d` | `#dadada` / `#858585` | mantidos (BIMCraft borda `#3A414B`/`#E2E8F0`) |
| `--h-ribbon` + (botão da faixa) | 56px | 56px | BIMCraft 58x52 (`lib.rs`), arredondado ao múltiplo de 4 |
| `--h-ctl-lg` (cabeçalho de paleta e de grupo) | 32px | 32px | existente; BIMCraft 26 px de cabeçalho |
| `--dock-w` + (doca lateral padrão) | 240px esq. / 304px dir. | idem | BIMCraft 290 px (`dock.rs`); abaixo do atual 380/400 px para devolver área ao desenho |
| `--fs-sm` / `--fs` / `--fs-lg` | 11 / 12 / 14px | idem | mantidos |
| `--radius` | 4px | 4px | igual ao BIMCraft |

Sem token de cor novo: faixa, abas, paletas e árvore usam os existentes (item ativo = `--accent-soft` + `--accent-text`).

## 5. Arquitetura de layout proposta

```
+ barra de acesso rápido: marca | Arquivo | desfazer refazer | Salvar Biblioteca Ajuda | nome da obra | status | Tema
+ abas de módulo:  Pórtico | Edifício | Fundações | Memorial
+ faixa de comandos do módulo (grupos rotulados) + barra de opções do comando
+ [ doca esquerda ] [ abas de vista + área de desenho ] [ doca direita ]
+ barra de status (estado do cálculo, contagens, seleção)
```

| Grupo atual | Onde fica |
|---|---|
| Barra superior (Arquivo, nome, desfazer/refazer, Salvar, Biblioteca, Ajuda, Tema) | Barra de acesso rápido, mesmos botões e handlers |
| Módulos Pórtico / Edifício / Fundações | Abas de módulo (`role="tab"` mantido). Memorial: aba na mesma barra que abre o overlay atual (mesmo handler); sem mudar o comportamento |
| Ferramentas do Pórtico (Selecionar, Nó, Barra, Cota, Zoom, Mover) | Grupos "Edição" e "Lançamento" da faixa (mesmos `TOOLS`, mesmas teclas), no lugar da coluna de 48 px |
| `BarraAtalhos` + `EtapasGrupo` (Edifício) | Faixa de Edifício (Cálculo: Calcular, Dimensionar, Pranchas) e paleta "Etapas" na doca esquerda |
| Obra, Pavimentos, Dados gerais, Casos (hoje em `.edif-in`) | Doca esquerda: **Navegador** em árvore (Obra > Pavimentos > Pilares/Vigas/Lajes > elemento) com os grupos atuais como seções abaixo; clicar no elemento seleciona na planta |
| Abas Estrutura / Cargas / Resultados / Influência / Dimensionar (Pórtico) | Doca direita, no lugar do painel de 380 px; **Propriedades do selecionado** fixa no topo e as 5 abas abaixo |
| Abas `.edif-tabs` (10 vistas) | Abas de vista acima do desenho, estilo documento (a ativa funde com o papel), rolagem horizontal; mesmo componente e `role="tab"` |
| Fundações (entrada 440 px + saída) | Doca esquerda = entrada (furos, apoios), centro = saída; Propriedades do apoio selecionado na direita |
| Tabela de resultados | Faixa recolhível embaixo do desenho (altura de 4 linhas, `overflow-x:auto`) |
| Tema Sistema/Escuro/Claro | `ThemeSelect` existente na barra de acesso rápido |

**Propriedades do elemento selecionado** (novo painel; hoje a edição está dentro do grupo da aba Estrutura): cartão do tipo + contagem + grupos recolhíveis (Seção, Vinculação, Materiais, Opções), reusando `Group`, `NumField`, `Select`, `Check`, `Slider`. Nada de lógica nova: só reorganiza onde cada campo aparece.

**Docas:** fase 1 fixa (esquerda = Navegador, direita = Propriedades/abas), larguras arrastáveis e recolhíveis (`--dock-w` como valor inicial, guardado em localStorage). Fase 2 (opcional): trocar de lado e empilhar, como no BIMCraft. Em ≤ 980 px as docas empilham sob o desenho (como na prévia, sem rolagem horizontal da página).

## 6. O que muda em `global.css` e nos componentes

- `global.css`: `.topbar` vira `.qbar` + `.modtabs` (nomes antigos mantidos como alias até o e2e migrar); novas classes `.ribbon`, `.rgrp`, `.rbtn`, `.optbar`, `.dock`, `.pal`, `.phead`, `.tree`/`.tn`, `.typecard`, `.vtabs` (substitui o estilo de `.edif-tabs` e `.tabs`); `.main` e `.edif` passam a `grid-template-columns: var(--dock-w) 1fr var(--dock-w-r)`. Remover o grid `48px 1fr 380px`.
- Componentes novos em `src/app/ui`: `Faixa`/`GrupoFaixa`/`BotaoFaixa`, `Paleta`, `Arvore`/`NoArvore`, `CartaoTipo`, `Abas` (vista e módulo). `Group` e campos permanecem.
- `App.tsx`, `Edificio.tsx`, `Fundacoes.tsx`: só reorganizam JSX; handlers, estado (`zustand`) e `data-ajuda` intactos.
- `design.test.ts`: as regras já existentes valem; acrescentar teste das novas classes definidas no CSS.
- `docs/design-system.md` e o mapa de código: atualizar ao implementar.

## 7. Riscos

1. **e2e acoplado a classe e posição** (`e2e/flows.mjs`, 5763 linhas): `.edif-tabs` (149 usos), `.statusbar` (115), `.edif-out` (38), `.planta-cv` (25), `.edif-in` (21), `.planta-st` (19), `.panel` (5) e `.panel .tabs`/`details.group`. Botões acima do canvas já quebraram fluxos (clique cai em outro elemento quando o canvas desce). Mitigação: manter nomes de classe, `role`, `aria-label` e `data-*`; faixa com altura fixa; rodar e2e completo a cada etapa; migrar por módulo (Pórtico, Fundações, Edifício, nessa ordem).
2. **Área do canvas:** a faixa (~92 px) + abas de módulo (~32) + opções (~32) tomam ~150 px de altura. Mitigar com faixa recolhível (duplo clique na aba) e doca 240 px em vez de 380/400 px. Medir o canvas antes e depois (e2e de planta usa coordenadas).
3. **Largura mínima das docas:** formulários do Edifício têm tabelas largas (Pavimentos, casos); a doca de 240 px exige `overflow-x:auto` interno ou largura arrastável.
4. **Duplicação de botões:** Memorial como aba não pode duplicar o botão atual no e2e (`getByRole('button', {name:'Memorial'})`); manter um só elemento.
5. **Aba contextual verde do BIMCraft** não adotada (paleta enxuta aprovada); se o usuário quiser, só como ponto verde.
6. **Escopo:** é mudança de arquitetura de layout, não de pele; mexe nas três telas. Não é a etapa de "pele" já aprovada. Prioridade atual do projeto é funcionalidade; propor como frente própria com auditoria independente.
7. **Dúvida aberta:** qual projeto o usuário quis dizer (seção 1) e se quer docas trocáveis (fase 2) ou só layout fixo.
