# E4b — cartões de interface (Haiku): leia primeiro

Núcleo da E4b pronto e testado (branch da E4b; `npx vitest run src/core/building/escadasEdicao.test.ts`, 21 testes). Os cartões 01 a 06 só desenham e chamam o núcleo. **Aplicar depois dos cartões 01 a 04 da E4a** (`docs/cartoes/E4a/`, que criam `EscadaUI.tsx`, `TiposLanceUI.tsx`, `MemorialEscadas.tsx` e o ícone `escada`) **e da D6** (Navegador em árvore, Propriedades, faixa com abas: `Navegador.tsx`, `Propriedades.tsx`, `FaixaEdificio.tsx`). Cada cartão compila sozinho (`npx tsc -b`), na ordem 01 a 06; validar aplicando e revertendo antes de seguir.

## Núcleo disponível (não reescrever; `src/core/building/escadasEdicao.ts` e `escadas.ts`)
- Direção e transformações: `anguloDeInsercao(inicio, ponto, ortogonal)` (graus em [0, 360); null se coincidem), `girarPonto`, `moverEscada`, `girarEscada`, `deltaPorPontos(centro, de, para)`, `normalizarAngulo`.
- Seleção: `escadasNoPonto(b, grupo, [x, y], tol)` (ids, a última lançada primeiro), `escadasNaJanela(b, grupo, [x0, y0, x1, y1], 'dentro' | 'cruza')`.
- Prévia e erro geométrico: `previaInsercao(b, { grupo, origem, angulo, nome?, dados?, lances })` devolve `{ escada, geometria, erros[], avisos[] }`. Com `erros.length`, a interface mostra as mensagens em vermelho e **não** chama `escada.criar`.
- Desenho: `desenhoPlantaEscada(geometria)` devolve `{ contornos, degraus, setas, rotulo, nome }` (coordenadas da obra em m) para a planta, as formas, a locação e o DXF.
- Padrão da última escada: `dadosComunsDe(escada)` (`escadas.ts`) devolve os dados comuns; `nomeSequencial(b, ultimoNome?)` dá o nome seguinte ("E3" → "E4").
- Biblioteca: `exportarTiposLance(b, ids?)` → `{ formato: 'statikos-tipos-lance', versao: 1, tipos }`; `lerBibliotecaTiposLance(texto|objeto, opcoes)` → `{ tipos, erros }`; `tiposLanceIguais`; `tipoLanceBloqueado(b, id)` e `tiposLanceEmUso(b)`. Opções: `opcoesEmUso(b.opcoes, perfilDe(b))` (`core/building/opcoes`).
- Memorial: `escadasPorGrupo(b)`.
- Comandos (todos `mcp: false`, via `useBuilding().exec(nome, params)`): `escada.criar` (aceita `nome`, `id`), `escada.editar { id, origem?, angulo?, ...dados }`, `escada.mover { ids, dx, dy }`, `escada.girar { ids, angulo, centro? }` (graus, anti-horário, em torno da origem de cada escada ou de `centro`), `escada.remover { ids }`, `escada.copiarDe { de, id?, grupo?, origem? | dx, dy, angulo?, ...dados }`, `lance.duplicar { escada, lance, vezes? }`, `tipoLance.desbloquear { id, desbloquear? }`, `tipoLance.importar { tipos }`, `tipoLance.editar` (recusa `TIPO_LANCE_BLOQUEADO` quando o tipo está em uso e sem desbloqueio), `tipoLance.copiar`. Um comando = um passo do desfazer; para vários, o comando em lote já existente.
- Guia de etapas: `ESCADAS_DISPONIVEIS = true`; a etapa "Escadas" fica "feito" com ao menos uma escada (já em `etapas.ts`).

## Decisões desta fatia (premissas de interface, sem cálculo novo)
- Atalho da ferramenta: **Shift+E** (E sozinho é Eixo; A e R já têm uso dentro de ferramentas). Verificar `grep -n "shiftKey" Planta.tsx` antes; o tratamento de Shift+E vai antes da linha `ferr[k.toLowerCase()]`.
- Botão direito e Esc encerram a inserção repetida; a ferramenta volta a Selecionar.
- Giro e movimento sempre no grupo atual da planta: só as escadas do grupo (`escada.grupo === grupo do pavimento atual`) são selecionáveis.
- Fora do escopo: detalhe de armadura (E4d) e esforços/deslocamentos por isovalores (E4c): os dois itens do menu ficam desabilitados com a dica "disponível nas frentes E4d / E4c".

## Regras de todos os cartões
Componentes de `src/app/ui`; sem cor literal em TS/TSX; CSS só em `src/app/design/global.css` (e `memorial.css` para o papel); toda classe usada definida no CSS; estilo inline só para valores calculados; `design.test.ts` precisa passar. e2e: `getByRole`/`getByLabel` com `{ exact: true }`, exceto `NumField`/`Select` (regex ancorada no início). Sem botões novos acima do canvas/barra da planta, salvo o da faixa de comandos indicado. Cada cartão termina com `npx tsc -b`, os testes citados e `npm run mapa`. Os fluxos e2e novos entram no arquivo de fluxos da frente E4 (`e2e/flows/E4.mjs`, ou o arquivo equivalente que a divisão dos fluxos criou; se ainda houver só `e2e/flows.mjs`, no fim dele), sem depender do nome exato do arquivo. Falhou duas vezes: parar e relatar.
