# Cartão E1c-1 — grupo "Paredes" (lançamento por formulário, aberturas, empuxo, atribuir, máscara)

Executor: Haiku. Só interface; o núcleo já existe e está testado (`src/core/building/paredes.test.ts`). Não altere nada em `src/core/`.

## Arquivos
- Criar `src/app/edificio/ParedesUI.tsx` (componente `ParedesGrupo`).
- Editar `src/app/edificio/Edificio.tsx`: importar `ParedesGrupo` e montar logo abaixo de `<PilaresParedeGrupo b={b} onPlanta={() => setAba('planta')} />` (linha ~102), com a mesma assinatura: `<ParedesGrupo b={b} onPlanta={() => setAba('planta')} />`.
- Modelo a imitar, linha a linha: `src/app/edificio/PilarParedeUI.tsx` (`PilaresParedeGrupo`).

## Componentes (só de `src/app/ui`; nunca `<input>`, `<select>` ou `<button>` crus; sem cor literal, sem CSS novo)
`Group`, `NumField`, `TextField`, `Select`, `Seg`, `Check`, `Button`, `NumCell`, `Hint`. Tabelas com `className="data quadro"` (classe já existente).
Unidades: a interface mostra cm; o núcleo usa m. Use `const cm2m = (v: number) => +(v / 100).toFixed(4); const m2cm = (v: number) => +(v * 100).toFixed(2);` como em `PilarParedeUI.tsx`.

## Núcleo usado (assinaturas)
- `b.paredes?: Parede[]` (`src/core/building/types.ts`): `{ id, nome, tipo: 'concreto', pontos: [x, y][], esq, dir, porPavimento?, nasce, morre, vinculoBase?, aberturas?: AberturaParede[], empuxos?: EmpuxoParede[], armar?, base? }`.
- `exec(nome, params)` de `useBuilding()` (`./store`), como no pilar-parede. Comandos (todos `mcp: false`):
  - `parede.criar { pontos: [x,y][], espessura?: m, esq?: m, dir?: m, nasce?: 'fundacao'|idPav, morre?: idPav, vinculoBase?: 'engaste'|'rotula', nome? }`
  - `parede.editar { id, espessura?, esq?, dir?, porPavimento?: {pavimento, esq, dir}[], nasce?, morre?, nome?, vinculoBase?, armar? }`
  - `parede.remover { ids: string[] }`, `parede.mover { ids, dx, dy }`
  - `parede.abertura { parede, id?, remover?, tipo?: 'porta'|'janela', s: m, largura: m, peitoril?: m, altura: m, pavimento?: 'fundacao'|idPav }`
  - `parede.empuxo { parede, empuxos: { caso, lado: 'esq'|'dir', cotaTerreno?: m, liquido?: { cota: m, gama?: kN/m³ } }[] }` (lista vazia remove)
  - `parede.atribuir { ids: string[], de: idParede }`
  - `parede.daMascara { grupo, camada, nasce?, morre? }`
  - `parede.prolongar { id, extremidade: 'ini'|'fim', ate: { parede?: id } | { viga?: id } | { eixo?: id } | { ponto: [x,y] } }`
- Casos H com tipo de empuxo: `b.casos?.filter((c) => c.natureza === 'H' && c.empuxo)`; para líquido qualquer caso de `casosParaCarga(b)` (`types.ts`).

## Layout e rótulos exatos
`<Group title={`Paredes (${ws.length})`} open={ws.length > 0}>`:
1. Linha de lançamento `<div className="row wrap" data-pw-lancar>`:
   - `NumField label="Espessura" unit="cm"` (padrão 20), `Select label="Nasce em"` (opções `fundação` + pavimentos menos o último), `Select label="Morre em"` (pavimentos; padrão o mais alto), `Select label="Base"` (`engastada` / `rotulada`).
   - `Button` **"Traçar na planta"**: `usePlanta.getState().set({ ferramenta: 'parede', pwParams: { espessura: cm2m(esp), nasce, morre, vinculoBase } }); onPlanta?.()` (o campo `pwParams` e a ferramenta vêm no cartão E1c-2; até lá, deixe o botão chamando assim mesmo).
   - `Select label="Camada da máscara"` (camadas das máscaras do grupo do pavimento ativo: `b.mascaras.filter((m) => m.grupo === grupo).flatMap((m) => Object.keys(m.geo))`) e `Button` **"Gerar da máscara"** → `exec('parede.daMascara', { grupo, camada, nasce, morre })`.
2. Tabela `data-pw-lista` com uma linha `<tr data-id={w.id} aria-selected={pl.selecao.has(w.id)}>` por parede. Colunas: **Parede** (nome em `<b>`), **Trechos** (`w.pontos.length - 1`), **Comprimento (m)** (`comprimentoParede(w)` de `src/core/building/paredesBase.ts`, `fmt` 2 casas), **e (cm)** (`m2cm(w.esq + w.dir)`), **Nasce**, **Morre**, **Aberturas** (número), **Empuxo** (`sim`/`—`), e botões `ghost`: `aria-label="Selecionar M1"` texto **ir** (igual ao pilar-parede) e `aria-label="Remover M1"` texto **×**.
3. Abaixo da tabela, editor da parede selecionada (a primeira de `pl.selecao` que for parede; senão nada). Cabeçalho `<h4>` **"Parede {nome}"** e:
   - `NumField label="Esquerda" unit="cm"` e `NumField label="Direita" unit="cm"` → `parede.editar { id, esq, dir }`.
   - `Check label="Armar a parede"` (`w.armar !== false`) → `parede.editar { id, armar }`.
   - Subtítulo **"Aberturas"**; tabela `data-pw-aberturas` (colunas **Tipo**, **s (cm)**, **Largura (cm)**, **Peitoril (cm)**, **Altura (cm)**, **Pavimento**, botão `ghost` `aria-label="Remover abertura {i+1}"` texto **×** → `parede.abertura { parede, id, remover: true }`). Linha de inclusão: `Seg` com `porta`/`janela`, `NumField` **"s"** (cm), **"Largura"** (cm, padrão 90), **"Peitoril"** (cm, padrão 0), **"Altura"** (cm, padrão 210), `Select label="Pavimento da abertura"` (opções: `fundação` se `w.nasce === 'fundacao'`, depois os pavimentos-base dos lances da parede: `niveisDaParede(b, w).bases` de `paredesBase.ts`, rótulo = nome do pavimento) e `Button` **"Acrescentar abertura"**.
   - Subtítulo **"Empuxo"**; `Select label="Caso do empuxo"` (casos H com tipo; se a lista estiver vazia, mostre `Hint`: "Crie um tipo de empuxo e um caso H com ele em Casos de carga."), `Seg` lado com opções `{ v: 'esq', label: 'terreno à esquerda' }` e `{ v: 'dir', label: 'terreno à direita' }`, `OptNumField label="Cota do terreno" unit="m"` (vazio = do tipo de empuxo), `Check label="Líquido (reservatório)"` que troca o caso para qualquer caso e mostra `NumField label="Cota do líquido" unit="m"`; botões **"Aplicar empuxo"** (`parede.empuxo` com uma entrada) e **"Remover empuxo"** (`empuxos: []`).
   - Subtítulo **"Prolongar"**: `Seg` extremidade com `{ v: 'ini', label: 'início' }` e `{ v: 'fim', label: 'fim' }`, `Select label="Até a parede"` (outras paredes) e `Button` **"Prolongar"** → `parede.prolongar { id, extremidade, ate: { parede } }`.
   - Subtítulo **"Atribuir"**: `Select label="Copiar de"` (outras paredes) e `Button` **"Atribuir às selecionadas"** → `parede.atribuir { ids: paredes selecionadas, de }`.
4. `Hint` final: "Polilinha do eixo; espessura à esquerda e à direita do eixo (a → z). Trecho com comprimento ≥ 5 × a espessura vai em casca; o mais curto, em barra. Aberturas: lance no pavimento de baixo dos dois entre os quais ficam. Premissas e1c-* a confirmar."

Mensagens de erro dos comandos já aparecem pelo `exec` (igual ao pilar-parede); não trate à parte.

## Teste (vitest, novo arquivo `src/app/edificio/ParedesUI.test.ts`, só do helper puro)
Exporte de `ParedesUI.tsx` a função pura `linhasParedes(b: BuildingModel)` que devolve `{ id, nome, trechos, comprimento, e, nAberturas, empuxo }[]` (usada na tabela). Teste: modelo de `comandosEdificioPadrao()` + `parede.criar { pontos: [[0,0],[6,0],[6,4]], espessura: 0.2 }` → `linhasParedes(b)` igual a `[{ id: <id>, nome: 'M1', trechos: 2, comprimento: 10, e: 20, nAberturas: 0, empuxo: false }]` (comprimento em m, e em cm).

## Checklist (depois do e2e do cartão E1c-3)
Nada aqui; as linhas sobem no cartão E1c-3.

## Verificação
```bash
npx tsc -b
npx vitest run src/app/edificio/ParedesUI.test.ts src/app/design/design.test.ts
```
