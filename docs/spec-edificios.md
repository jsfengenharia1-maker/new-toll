# Spec — Módulo Edifícios (Fase 1)

Data: 20/10/2026. Sem código. Base: `docs/pesquisa-edificios.md`; o usuário aceitou os padrões dos itens 1 a 48 em 20/10/2026.
Valores sem fonte aberta nesta pesquisa (a rede bloqueou CYPE, TQS, AltoQi e as universidades) continuam marcados **[a confirmar]** no app e no memorial, conforme o `CLAUDE.md`.

---

## 0. Premissas adotadas (itens 1–48 aceitos)

Todas editáveis no app e escritas no memorial.

| # | Premissa | Valor adotado |
|---|---|---|
| 1 | Grupo de pavimentos | Só pavimentos com o mesmo pé-direito formam grupo; pé-direito diferente cria outro grupo |
| 2 | Cota do pavimento | Topo da laje estrutural; revestimento de piso como carga (padrão 1,0 kN/m²) [a confirmar] |
| 3 | Fundação | Nível global 1,5 m abaixo do térreo; desvio por pilar na V2 |
| 4 | Máscara no MVP | Só DXF; PDF, DWG e IFC na V2 |
| 5 | Numeração | P1 no canto superior esquerdo, da esquerda para a direita e de cima para baixo; vigas horizontais primeiro, depois as verticais; nome estável entre pavimentos |
| 6 | Pilar | Ponto fixo padrão no centro; tolerância de desalinhamento entre pavimentos 1 cm (aviso) |
| 7 | Pilar-parede | Maior dimensão > 5 × menor (NBR 6118, item a confirmar); modelagem na V2, o MVP avisa |
| 8 | Pilar sobre viga (transição) | V2; no MVP é erro de verificação |
| 9 | Vinculação | Viga-pilar engastada; viga-viga articulada (apoio da secundária) |
| 10 | Fora do MVP | Viga chata com punção e viga inclinada |
| 11 | Baldrame | Apoiado nos blocos, sem solo elástico |
| 12 | Contorno do pano | Pelo eixo das vigas (vão teórico); a área de carga desconta a largura das vigas |
| 13 | Treliçadas | Catálogo editável (H8, H12, H16, H20, H25; intereixo 42/50 cm; capa 4–5 cm; EPS 0,1–0,3 kN/m³) [a confirmar com fabricante]; unidirecional |
| 14 | Vigotas | Direção padrão no menor vão; balanço em treliçada = erro |
| 15 | Desnível | Acima de h/2 da laje mais fina, o pano perde a continuidade (borda articulada) |
| 16 | NBR 6120:2019 | Tabela 10 por categoria de uso; divisórias 1,0 kN/m² quando não lançadas [a confirmar] |
| 17 | Alvenaria automática | Peso por tipo de bloco (cerâmico 13 kN/m³, concreto 14 kN/m³, incluindo revestimento) [a confirmar]; altura = pé-direito − h da viga; aberturas descontadas quando há camada de esquadrias |
| 18 | Vento | NBR 6123:1988 (a edição de 2023 aparece como cancelada [a confirmar]); excentricidades 0,075a (edificação comum) e 0,15a (turbulência alta); padrão categoria IV, classe B, S1 = 1,0, S3 = 1,0, V0 por mapa digitado |
| 19 | Escada e empuxo (V2) | Lance apoiado no patamar; escada 3,0 kN/m² (NBR 6120); empuxo K0, permanente |
| 20 | Modelo analítico | Separado: grelha por pavimento + pórtico espacial |
| 21 | Nó mestre | Centro geométrico do pavimento (o vento é aplicado no centro de massa da fachada com a excentricidade do item 18) |
| 22 | Trecho rígido | Até a face do pilar menos 0,3h da viga (NBR 6118 14.6.2.1, item a confirmar) |
| 23 | Grelha | Malha 50 cm; torção J = 2I × 15 % (grelha) e 0 no ELU de torção de compatibilidade |
| 24 | Treliçada | Apoiada nas vigas; capa colaborante na seção T |
| 25 | Rigidez axial dos pilares | Multiplicador 2 só nas ações verticais [a confirmar] |
| 26 | Redistribuição | 0 % no MVP |
| 27 | 2ª ordem | γz com rigidez reduzida (já existe); P-Δ 3D na V2 |
| 28 | Itens da NBR 6118 | Numeração de 2014, marcada a confirmar contra a de 2023 |
| 29 | Tema | Escuro (estilo CAD) com a paleta da pesquisa; claro e P&B |
| 30 | Atalhos | P pilar, V viga, L laje, E eixo, C carga, M mover, D cotar, 1–8 capturas |
| 31 | Coordenadas | Vírgula decimal, separador ";" (`@3,5;2,0`), ângulo anti-horário a partir de +x |
| 32 | Capturas | Raio 12 px; prioridade: extremidade > interseção > meio > centro > perpendicular > próximo; polar 15° |
| 33 | 3D | Visualizador WebGL próprio (~20 KB) |
| 34 | Desempenho | ≥ 55 fps no pan com 20 mil segmentos; captura ≤ 2 ms p99; devicePixelRatio máximo 2 |
| 35 | Penas P&B | NBR 16861:2020 (ver item 47) |
| 36 | Desfazer | 200 passos na sessão; o `.statikos` guarda o log de comandos, não a pilha |
| 37 | Licença | Apache-2.0 + CLA + marca "Statikos" |
| 38 | Dependências | Uma a uma na fatia correspondente (lista na seção 10) |
| 39 | IFC | Só saída na V2; entrada na V3 |
| 40 | Artifact do claude.ai | Recursos sob demanda (DWG, PDF de máscara) desativados no artifact, com aviso |
| 41 | IA | MCP local (Node); no artifact, a capability de perguntar ao Claude classifica camadas do DXF (V2) |
| 42 | Taxas de aço | Lajes 70, vigas 100, pilares 130 kg/m³ [a confirmar] |
| 43 | DWG | No MVP pelo nasjidwg sob demanda, depois do teste real no AutoCAD; acad-ts como reserva; DXF R2000 sempre |
| 44 | Versão DWG | R2018 |
| 45 | Prancha | Desenho em escala real no model space; uma prancha por layout com viewport em escala |
| 46 | Margens e carimbo | NBR 16752:2020: margem esquerda 20 mm; legenda 178 mm [a confirmar na norma] |
| 47 | Espessuras | NBR 16861:2020, série 0,13–1,40 mm; CTB gerado junto ao DWG [a confirmar] |
| 48 | Representação | NBR 6492 e 7191 [status a confirmar] |

---

## 1. Modelo físico × modelo analítico

Dois modelos, um gerado do outro:

```
BuildingModel (físico, editado pelo usuário e pela IA)
   └─ gerarAnalitico(b, opcoes)  — função pura, sem estado
        ├─ Grelha[]  (uma por pavimento)
        ├─ Portico3D (pilares + vigas + diafragmas)
        └─ Mapa      (elemento físico ↔ barras e nós analíticos)
```

### 1.1 `BuildingModel` (JSON versionado)

Arquivo `src/core/building/types.ts`. Unidades: m, kN, graus no físico (rad só no analítico). Ids são strings curtas estáveis (`"p_8f3a"`); o nome visível (`P12`) é campo separado, renumerável.

```ts
interface BuildingModel {
  version: 1;
  obra: { nome: string; cidade?: string; norma: NormaConfig; materiais: MaterialRef[] };
  pavimentos: Pavimento[];          // ordenados de baixo para cima
  grupos: Grupo[];                  // planta compartilhada (pavimento-tipo vinculado)
  eixos: Eixo[];                    // malha A-B-C × 1-2-3 (globais à obra)
  mascaras: Mascara[];              // DXF importado, por grupo
  pilares: Pilar[];
  vigas: Viga[];
  lajes: Laje[];
  paredes: Parede[];                // alvenaria (carga) — concreto na V2
  cargas: CargaFisica[];
  vento: VentoConfig;
  casos: CasoFisico[];              // G, Q, W gerados + do usuário
  opcoes: OpcoesAnalise;            // itens 20–27
  premissas: Premissa[];            // valor, fonte, "a confirmar", usado no memorial
}
interface Pavimento { id; nome; cota: number; grupo: string }       // cota = topo da laje estrutural
interface Grupo     { id; nome; uso: CategoriaUso; gRev: number; q: number }
interface Pilar     { id; nome; x; y; angulo; ajuste: Ajuste; nasce: string; morre: string;
                      lances: { desde: string; secao: SecaoPilar }[] }   // seção por pavimento
interface Viga      { id; nome; grupo: string; pontos: [number, number][]; secao: SecaoViga;
                      alinhamento: 'esq' | 'centro' | 'dir'; invertida?: boolean; vinculos?: Vinculo[] }
interface Laje      { id; nome; grupo: string; contorno: [number, number][]; furos: [number, number][][];
                      tipo: LajeMacica | LajeTrelicada; nivel?: number }
```

Regras:
- Elementos de planta (vigas, lajes, paredes, cargas, máscara) pertencem a um **grupo**; todos os pavimentos do grupo os compartilham. "Desvincular" cria um grupo novo copiando a planta (V2: diff visual).
- Pilares pertencem à obra, com `nasce`/`morre` e seção por lance.
- O arquivo `.statikos` passa a `version: 2`, com `building?: BuildingModel` ao lado do `model` atual. Arquivos v1 continuam abrindo. Migrações em `src/core/building/migrate.ts`, com teste por versão.

### 1.2 Gerador analítico

`src/core/building/analytic.ts` — `gerarAnalitico(b, op): { grelhas, portico, mapa, diagnosticos }`:
1. Por grupo: arranjo planar de eixos de vigas + contornos de laje → nós nas interseções (tolerância 1 mm).
2. Grelha do pavimento: barras de viga e de laje (malha 50 cm alinhada aos contornos; treliçada = barras T só na direção das vigotas); apoios nos pilares (rigidez vertical do lance de baixo e de cima); cargas G/Q de área, linha e ponto.
3. Pórtico espacial: pilares (lances por pavimento) + vigas; nós de viga sobre o pilar ligados ao eixo do pilar por trecho rígido (item 22); diafragma por pavimento (item 21).
4. Transferência: as forças das barras de laje sobre os nós das vigas viram cargas nodais nas vigas do pórtico (equilíbrio garantido por construção; teste de soma de cargas por pavimento).
5. `mapa` liga cada barra/nó analítico ao elemento físico, para resultados e diagnósticos voltarem à planta.

Testável sem interface: dado um `BuildingModel`, conferem-se número de nós, soma de cargas, simetria e reações.

---

## 2. Registro de comandos (núcleo IA-nativo)

`src/core/commands/`. Toda ação que muda o `BuildingModel` é um comando registrado. Interface, atalhos, linha de comando, arquivo, testes e MCP usam o mesmo registro.

```ts
interface Comando<P> {
  nome: string;                       // 'pilar.inserir'
  descricao: string;                  // usada na paleta Ctrl+K e no MCP
  schema: JsonSchema;                 // JSON Schema 2020-12 (subconjunto: object, number, string, enum, array, oneOf)
  risco: 'leitura' | 'escrita' | 'destrutivo';
  validar(m: BuildingModel, p: P): Diagnostico[];      // vazio = pode aplicar
  aplicar(draft: Draft<BuildingModel>, p: P): void;  // mutação immer
}
executar(m, nome, p, { previa?: boolean }) → { modelo, patches, inversos, diagnosticos, versao }
```

- **Desfazer/refazer:** `produceWithPatches` do immer (já é dependência) dá patch e inverso. A pilha de desfazer guarda os inversos (200 passos).
- **Log:** cada execução vira `{ t, nome, params, autor: 'usuario' | 'ia' | 'arquivo' }`. O `.statikos` guarda o log (replay reconstrói o modelo; teste: replay = modelo salvo).
- **Prévia:** `previa: true` não aplica; devolve diff legível (elementos criados/alterados/removidos) e um token preso à `versao` do modelo. `aplicar(token)` falha se o modelo mudou.
- **Validador de schema próprio** (~150 linhas, só o subconjunto acima), sem Ajv. O mesmo schema gera o formulário do painel de propriedades e a ajuda da linha de comando.
- **Teste genérico por comando:** aplicar + inverso = original; schema rejeita parâmetros inválidos; `validar` cobre os casos de erro.

Comandos do MVP (lista inicial; nomes em português, sem copiar nomes de outros programas):

| Grupo | Comandos |
|---|---|
| Obra | `obra.definir`, `pavimento.criar/editar/remover`, `grupo.criar/desvincular`, `eixo.criar/editar/remover`, `norma.definir` |
| Máscara | `mascara.importar {grupo, dxf, unidade}`, `mascara.alinhar {pares[2]}`, `mascara.camada {nome, visivel, capturavel, cor}` |
| Pilares | `pilar.inserir {pavimento, x, y, secao, ajuste, angulo}`, `pilar.editar`, `pilar.lances`, `pilar.remover`, `pilar.renumerar` |
| Vigas | `viga.tracar {grupo, pontos[], secao, alinhamento}`, `viga.ajustarFaces`, `viga.dividir`, `viga.unir`, `viga.prolongar`, `viga.editar` |
| Lajes | `laje.detectarPanos {grupo}`, `laje.criar {grupo, ponto | contorno, tipo}`, `laje.abertura`, `laje.editar` |
| Cargas | `carga.area/linha/ponto`, `carga.alvenariaDaMascara {grupo, camada, bloco}`, `vento.definir`, `vento.gerarCasos` |
| Edição | `selecao.*` (só leitura), `editar.mover/copiar/girar/espelhar {ids, ..., destino?: pavimentos[]}`, `editar.atribuir {ids, campo, valor}`, `editar.remover` |
| Análise | `calcular`, `verificar` (leitura), `resultado.consultar`, `exportar.dxf/pdf/dwg/memorial` |

---

## 3. Motor headless, CLI e MCP

- `src/core/**` continua sem DOM, React ou `localStorage` (já é assim hoje; um teste de lint proíbe `window`/`document` em `src/core`).
- **CLI** `src/cli/statikos.ts`, empacotado por `vite build --ssr` em `dist-cli/statikos.mjs` (Node ≥ 20, sem dependência nova):
  - `statikos calc obra.statikos --json` → resultados e diagnósticos;
  - `statikos verificar obra.statikos`;
  - `statikos exec obra.statikos comandos.jsonl [--previa]`;
  - `statikos exportar obra.statikos --dxf|--pdf|--dwg --pavimento 3`.
- **MCP stdio** `src/cli/mcp.ts`: JSON-RPC 2.0 próprio (~300 linhas: `initialize`, `tools/list`, `tools/call`, `resources/list|read`), sem SDK. Expõe:
  - um perfil de 20 a 40 ferramentas (comandos agrupados por elemento, cada um com `inputSchema`, `outputSchema` e annotations `readOnlyHint`/`destructiveHint` derivadas do `risco`);
  - ferramentas de escrita sempre em dois passos (`previa` → `aplicar` com token);
  - recursos: `statikos://modelo`, `statikos://diagnosticos`, `statikos://resultados/{pavimento}`, `statikos://premissas`;
  - nunca execução de código livre.
- **Navegador:** o cálculo roda num Web Worker (`src/app/worker.ts`) com o mesmo `src/core`, para a planta não travar.
- `docs/ia.md` e `public/llms.txt` na fatia 7.

---

## 4. Resultados explicáveis e diagnósticos

```ts
interface Valor { v: number; unid: string; origem?: Origem }
interface Origem { combinacao?: string; formula?: string; norma?: string; item?: string; aConfirmar?: boolean }
interface Diagnostico {
  codigo: string;               // 'PILAR_SEM_APOIO', 'PANO_ABERTO', 'VIGA_FORA_FACE' ...
  severidade: 'erro' | 'aviso' | 'info';
  elementos: string[];          // ids físicos
  mensagem: string;             // português, curta
  sugestao?: { comando: string; params: object; texto: string };   // correção executável
}
```

- Verificação de lançamento **contínua**: roda após cada comando (incremental por grupo afetado), mostra marcadores na planta e lista clicável; os mesmos diagnósticos vão para o MCP e para a CLI.
- Catálogo inicial de códigos (MVP): pilar sem viga, pilar sem apoio ao morrer, viga sem apoio, viga fora da face do pilar, viga sobre viga sem nó, pano aberto, sobreposição de elementos, laje sem tipo, treliçada em balanço, desalinhamento de pilar entre pavimentos, pilar-parede detectado, máscara desalinhada entre grupos.
- Resultados de dimensionamento reaproveitam `concrete.ts` e passam a carregar `Origem` (combinação, fórmula, item).

---

## 5. Solver 3D

Novos arquivos em `src/core/`, reaproveitando `SpRows`, `rcmOrder` e `BandLDL` de `math.ts`:

| Arquivo | Conteúdo |
|---|---|
| `frame3d.ts` | Barra de pórtico espacial 12 GL (Euler-Bernoulli; Timoshenko opcional), eixos locais pelo ângulo do pilar/viga, rótulas por condensação, trechos rígidos por matriz de transformação exata (offset nas extremidades) |
| `diaphragm.ts` | Restrição mestre-escravo: cada nó do pavimento com (ux, uy, rz) escravos do mestre; montagem direta de Tᵀ K T sem formar T densa |
| `grid.ts` | Grelha 3 GL/nó (w, θx, θy); barras de laje maciça (faixa b = malha) e de treliçada (seção T); torção reduzida (item 23) |
| `building/analytic.ts` | Gerador (seção 1.2) |
| `building/wind.ts` | NBR 6123: Vk, q, Ca pela relação de lados (ábaco digitalizado com fonte), largura de fachada pela projeção do contorno do pavimento, forças por pavimento, 4 direções × (centrado, +e, −e) no grupo excludente "vento" |
| `building/design.ts` | Combinações (reaproveita `edit.ts`/`design.ts`), γz 3D por direção, cargas na fundação por pilar → módulo Fundações |

Porte medido na pesquisa (0,3–0,4 Gflop/s): pórtico de 20 pavimentos com diafragma ~4.900 GL ≈ 1 s; grelha de 50 cm ≈ 0,3 s por pavimento. Meta: edifício de 10 pavimentos calculado em < 3 s no navegador; benchmark sintético de 20 pavimentos no CI (falha se piorar > 20 % sobre a linha de base). Rust/WASM só se essa meta falhar.

---

## 6. Interface

- **Planta:** Canvas 2D em 3 camadas:
  1. máscara, rasterizada em cache e reaproveitada durante o gesto;
  2. modelo;
  3. interativa (cursor, pré-visualização, glifos de captura).

  Rótulos e campos de digitação ficam em HTML por cima. O redesenho só acontece quando algo muda, com coordenadas em float64 e origem local automática no DXF. O SVG continua no memorial e na impressão.
- **Índices espaciais:** Flatbush (máscara, estática) e RBush (modelo, dinâmico). Juntos somam ~5 KB gz.
- **Ferramentas** como máquinas de estado (`ocioso → primeiro ponto → próximos pontos → confirmar`), cada uma terminando num comando do registro. Recursos:
  - entrada digitada durante o traço (distância na direção do cursor, `@dx;dy`, `@d<ângulo`);
  - Tab cicla as capturas candidatas;
  - F8 ortogonal, F10 polar;
  - Esc cancela;
  - Enter repete o último comando.
- **Paleta Ctrl+K:** busca comandos, pavimentos e elementos. Barra de status com dica da ferramenta ativa.
- **Painéis:**
  - seletor de pavimento (mostra o pavimento inferior esmaecido);
  - camadas da máscara;
  - propriedades (formulário gerado pelo schema);
  - quadro de pilares e vigas em tabela (colar do Excel);
  - diagnósticos.
- **3D:** visualizador WebGL próprio de prismas com órbita, liga/desliga por pavimento e cores por tipo. Fica em arquivo separado, carregado ao abrir a aba 3D.
- **Temas:** tokens CSS + tabela de cores do canvas (escuro, claro, P&B), editáveis; cor sempre reforçada por forma e tipo de traço.
- **Navegação:**
  - Estrutura atual: hoje o app é o pórtico 2D com abas.
  - Nova entrada: o Edifícios entra como segunda área ("Pórtico 2D" | "Edifício").
  - Integração com o resto: o resultado alimenta Fundações e Memorial.

---

## 7. Interoperabilidade

| Formato | Entrada | Saída | Como |
|---|---|---|---|
| DXF | MVP: parser próprio (LINE, LWPOLYLINE, POLYLINE, ARC, CIRCLE, TEXT, MTEXT, INSERT com blocos aninhados, cores e camadas; unidades por `$INSUNITS`) | MVP: `dxf.ts` passa de R12 a R2000 (camadas com lineweight, layouts com viewport, blocos, cotas como entidades simples) | Código próprio |
| PDF | V2: máscara por pdf.js sob demanda | MVP: gerador vetorial próprio (A0–A4, escala exata, penas, tracejado, Helvetica WinAnsi com acentos, camadas OCG) | Código próprio |
| DWG | V2: acad-ts sob demanda | MVP: nasjidwg sob demanda (R2018), acad-ts como reserva | `public/vendor/*.js` fora do HTML único |
| IFC | V3: web-ifc | V2: escrita STEP própria (IfcColumn, IfcBeam, IfcSlab, IfcBuildingStorey) | Código próprio |

Carregamento sob demanda: o `vite-plugin-singlefile` embute todo `import()`. Por isso as bibliotecas pesadas vão para `public/vendor/` (copiadas no build com licença e versão fixa), carregadas por `<script>` dinâmico só quando o usuário pede o recurso. No artifact do claude.ai esses recursos ficam desativados, com aviso (item 40).

---

## 8. Pranchas

- **Montagem** (`src/core/sheets/`, puro): `Prancha { formato: 'A0'..'A4', vistas: { pavimento, escala, origem }[], carimbo, quadros[] }` → primitivas (linha, arco, texto, hachura, cota) com pena por camada.
- **Um gerador, três saídas:** PDF (próprio), DXF R2000 e DWG (nasjidwg). Teste: a mesma prancha gera os três; o DXF e o DWG são relidos e comparados entidade a entidade.
- **Conteúdo do MVP:**
  - planta de formas por pavimento: pilares hachurados, vigas com nome e seção, lajes com nome, tipo e h, eixos e cotas;
  - quadro de pilares;
  - carimbo NBR 16752 com campos editáveis e logo opcional (o usuário define os dados; nada de dados de cliente no repositório);
  - formatos A0–A4 com margens e dobra;
  - tabela de penas pela NBR 16861.
- **Validação manual pedida ao usuário:** abrir o DWG e o DXF de teste no AutoCAD, rodar AUDIT e conferir o aviso de arquivo não Autodesk.

---

## 9. Validação pública

Pasta `validation/` com casos em JSON (`entrada.statikos`, `esperado.json`, `fonte.md`), rodando no `npm test`:

| Caso | Referência |
|---|---|
| Placa apoiada e engastada, carga uniforme | Timoshenko (tabelas de placas) × grelha 50/25 cm, erro < 5 % |
| Pórtico espacial de 3 pavimentos com diafragma | OpenSees (exemplo público `RigidFrame3D`), valores gerados offline com OpenSeesPy, script guardado |
| Vento em prédio retangular | Cálculo manual pela NBR 6123 (planilha no `fonte.md`) |
| Edifício próprio de 10 pavimentos | Modelo publicado no repositório (fictício), com γz, deslocamento no topo e reações; serve de regressão |
| Treliçada unidirecional | Viga T biapoiada (cálculo manual) |

---

## 10. Dependências novas (aprovação por fatia)

| Fatia | Pacote | Licença | Tamanho gz | Onde |
|---|---|---|---|---|
| 1 | flatbush | ISC | ~3 KB | bundle |
| 1 | rbush | MIT | ~2 KB | não usado (o índice do modelo é refeito por Flatbush a cada alteração) |
| 6b | nasjidwg 0.18.0 | MIT | 54 KB gz (192 KB, só o escritor R2018) | `public/vendor` (sob demanda); devDependency para os testes |
| V2 | acad-ts | MIT | ~198 KB | `public/vendor` |
| V2 | pdfjs-dist | Apache-2.0 | ~0,5 MB | `public/vendor` |
| V3 | web-ifc | MPL-2.0 | ~0,96 MB | `public/vendor` |

Sem SDK MCP, Ajv, three.js, jsPDF ou pdf-lib.

---

## 11. Licença

`LICENSE` Apache-2.0 + `NOTICE` + `CONTRIBUTING.md` com CLA individual simples (via CLA Assistant no GitHub) + nota de marca ("Statikos" não está coberto pela licença). Entra no primeiro commit da Fase 2.

---

## 12. Fatias da Fase 2 (revisadas)

Cada fatia entrega: núcleo puro com testes, comandos no registro, ferramenta na interface, ferramenta no MCP (a partir da fatia 1, o MCP mínimo), fluxo e2e, seção no memorial, README e CLAUDE.md atualizados. Critério de pronto: `npm test`, `tsc`, lint, build e e2e limpos.

| # | Fatia | Entrega principal |
|---|---|---|
| 0 | Fundação | LICENSE; `BuildingModel` + migração do `.statikos` v2; registro de comandos com desfazer, log e prévia; CLI e MCP mínimos (`obra.*`, `verificar`) |
| 1 | Planta | Canvas em camadas, pan/zoom, temas; pavimentos/grupos; eixos; parser DXF e máscara (alinhar por 2 pontos, camadas); capturas com Flatbush/RBush; pilares; quadro de pilares; benchmark de desempenho no e2e |
| 2 | Vigas | Traçado, alinhamento e ajuste às faces; dividir/unir/prolongar; verificação de lançamento contínua com marcadores |
| 3 | Lajes e cargas | Detecção de panos (half-edge), maciça e treliçada, aberturas; cargas por pavimento; alvenaria da camada do DXF |
| 4 | Análise | `frame3d`, diafragma, grelha, gerador analítico, transferência laje→viga; Web Worker; validação (placas, OpenSees) |
| 5 | Vento e estabilidade | NBR 6123 automática; combinações; γz 3D |
| 6a | Resultados e dimensionamento | Esforços por pavimento e 3D; isovalores; vigas e pilares com `concrete.ts`; cargas no módulo Fundações; quantitativos; memorial |
| 6b | Pranchas | Gerador de pranchas; PDF próprio; DXF R2000; DWG (nasjidwg) |
| 7 | IA | MCP completo, `docs/ia.md`, `llms.txt`, exemplo de agente que lança, calcula e revisa um edifício |

---

## 13. Riscos

| Risco | Mitigação |
|---|---|
| Fontes dos programas não verificadas (rede bloqueada) | Reabrir as fontes numa sessão com rede antes da fatia correspondente; tudo marcado a confirmar |
| nasjidwg jovem (um autor) | acad-ts de reserva; DXF R2000 sempre disponível; teste real no AutoCAD |
| Canvas 2D sem GPU em máquinas fracas | Cache da máscara, DPR ≤ 2, benchmark no CI |
| Modelo separado ignora a interação laje-pórtico no vento | Documentado no memorial; modelo integrado por condensação na V2 |
| Bundle crescer | Orçamento: HTML único ≤ 1 MB (900 KB até a fatia 6a; elevado pelo usuário em 20/10/2026); pesados em `public/vendor` |
| Escopo grande | Fatias verticais; cada uma utilizável sozinha |

---

## 14. Decisões novas desta spec [confirmar]

1. Ids em string curta estável + nome visível separado (renumerar não quebra referências nem o log).
2. Elementos de planta pertencem ao grupo (pavimento-tipo vinculado por padrão).
3. `.statikos` v2 com `building` + log de comandos; desfazer não é salvo.
4. Validador de JSON Schema próprio (sem Ajv) e MCP próprio (sem SDK).
5. CLI empacotada pelo próprio Vite (`--ssr`), Node ≥ 20.
6. Cálculo em Web Worker.
7. Edifícios como segunda área do app ("Pórtico 2D" | "Edifício").
8. Bibliotecas sob demanda em `public/vendor`, desativadas no artifact.
9. Orçamento do HTML único: 1 MB (era 900 KB; elevado pelo usuário em 20/10/2026).
10. Fatia 0 nova (fundação do registro/CLI/MCP) e fatia 6 dividida em 6a (resultados) e 6b (pranchas).
11. CLA via CLA Assistant.
