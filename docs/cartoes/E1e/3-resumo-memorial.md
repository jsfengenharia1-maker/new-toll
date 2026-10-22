# Cartão E1e-3 — cartão "Alvenaria estrutural" do Dimensionamento (blocos, desligamentos, vigas sobre muros) e memorial

Executor: Haiku. Só interface; o núcleo está pronto e testado (`alvenaria.test.ts`, `alvenariaLista.test.ts`). **Não altere nada em `src/core/`.** Depende do cartão E1e-2 (o `dim.alvenaria` só aparece com paredes de alvenaria lançadas) e é independente do cartão 1 no código.

## Arquivos
- Criar `src/app/edificio/AlvenariaResumo.tsx` (componentes `CartaoAlvenaria` e `MemorialAlvenaria`). Sem teste de vitest.
- Editar `src/app/edificio/Edificio.tsx` (inserir o cartão na aba Dimensionamento).
- Editar `src/app/edificio/MemorialEdificio.tsx` (inserir o memorial).

## Componentes (só de `src/app/ui` e HTML de leitura; nunca controles crus; sem cor literal, sem CSS novo, sem `style`)
Para o cartão: `Hint`, `Pill` (de `../ui`). Classes existentes: `card`, `data`, `quadro`, `tl`, `num`, `small`, `muted`, `avoid` (memorial). Imports: `type ReactNode` de `react`; `useBuilding` de `./store`; `memorialAlvenaria` de `../../core/building/memorialAlvenaria`; `type Dimensionamento` de `../../core/building/dimensionamento`; `type BuildingModel` de `../../core/building/types`; `linhasDesligamentos`, `linhasVigasMuro` de `../../core/building/alvenariaLista`.

## Núcleo usado
- `memorialAlvenaria(b: BuildingModel, dim: Dimensionamento): TabelaMemorial[]` (`TabelaMemorial { id: string; titulo: string; colunas: string[]; linhas: string[][] }`; vazio sem paredes de alvenaria; ids: `alv-opcoes`, `alv-materiais`, `alv-panos`, `alv-pontos`, `alv-armadura`, `alv-lados`, `alv-vergas`, `alv-blocos`, `alv-resumo-blocos`, `alv-desligamentos`, `alv-vigas`, `alv-mensagens`; as tabelas sem linhas já vêm filtradas, exceto `alv-opcoes` e `alv-materiais`).
- `dim.alvenaria?.resumoBlocos: { bloco: string; nome: string; inteiros: number; meios: number; cantos: number; canaletas: number; total: number; area: number }[]`, `dim.alvenaria?.desligamentos` e `.vigasMuro` (use `linhasDesligamentos(al)` e `linhasVigasMuro(al)` sem o segundo argumento: todas as paredes).
- Para o nome do muro nos desligamentos e nas vigas: `al.desligamentos[i].nomeParede` e `al.vigasMuro[i].nomeParede`, na mesma ordem das linhas devolvidas por `linhasDesligamentos(al)` e `linhasVigasMuro(al)`.

## 1. `CartaoAlvenaria()` (sem props)
`const dim = useBuilding((s) => s.dim); const al = dim?.alvenaria; if (!al) return null;`. Raiz `<div className="card" data-alv-cartao>` com `<h4>Alvenaria estrutural</h4>` e:
1. **Blocos por tipo**: tabela `data-alv-resumo-blocos` com **Bloco**, **Inteiros**, **Meios blocos**, **Peças de canto**, **Canaletas**, **Total**, **Área líquida (m²)** (uma linha por `al.resumoBlocos`; área com vírgula decimal e 2 casas: `r.area.toFixed(2).replace('.', ',')`). Se `al.resumoBlocos` for vazio, `<p className="muted">Só há paredes de alvenaria genérica: sem contagem de blocos.</p>` no lugar da tabela.
2. **Pilares em contato com muros**: se `al.desligamentos.length`, `<h4>Pilares em contato com muros de alvenaria</h4>` e tabela `data-alv-cartao-desligamentos` com **Muro**, **Pilar**, **Pavimento**, **Laje junto ao pilar**, **Desligado do muro** (`al.desligamentos.map((d, i) => …)` com `d.nomeParede` e as demais células de `linhasDesligamentos(al)[i]`); a célula "Desligado" com `<Pill tone={d.desligado ? 'ok' : 'warn'}>{linha.desligado}</Pill>`. `Hint`: "O desligamento muro-pilar só vale com lajes de vigotas; com laje maciça, lance o muro como elemento (MURO_PILAR_MACICA)."
3. **Vigas sobre muros**: se `al.vigasMuro.length`, `<h4>Vigas sobre muros de alvenaria</h4>` e tabela `data-alv-cartao-vigas` com **Viga**, **Muro**, **Papel**, **Seção**, **Armadura**, **Situação** (`al.vigasMuro.map((v, i) => …)` com `v.nomeParede` e as demais células de `linhasVigasMuro(al)[i]`; situação em `<Pill tone={v.status === 'ok' ? 'ok' : 'bad'}>`).

## 2. `MemorialAlvenaria({ b, dim, h2 })`
Assinatura: `export function MemorialAlvenaria({ b, dim, h2 }: { b: BuildingModel; dim: Dimensionamento | null; h2: (t: string) => ReactNode })`. Modelo a imitar: `MemorialParedes.tsx` (mesma estrutura). Corpo: `const ts = dim ? memorialAlvenaria(b, dim) : []; if (!ts.length) return null;` e
`<>{h2('Alvenaria estrutural e blocos de concreto')}` seguido, para cada tabela, de
`<div className="avoid" key={t.id} data-memorial-alvenaria={t.id}><h3>{t.titulo}</h3><table><thead><tr>{t.colunas.map((c, i) => <th key={i} className="l">{c}</th>)}</tr></thead><tbody>{t.linhas.map((l, i) => <tr key={i}>{l.map((c, k) => <td key={k} className="l">{c}</td>)}</tr>)}</tbody></table></div>`
e, no fim, `<p>Premissas e1e-* (materiais, verificação por pano, alvenaria armada, verga, modulação, desligamento muro-pilar e vigas sobre muros) a confirmar com o texto da NBR 16868; ver a seção de premissas e docs/pendencias-usuario.md.</p></>`.

## 3. Inserções
- `Edificio.tsx`: importar `{ CartaoAlvenaria } from './AlvenariaResumo'` e, na aba Dimensionamento, logo depois da linha `{dim?.paredes?.length ? <CartaoParedes onIr={(id) => onIr('parede', id)} /> : null}`, inserir `{dim?.alvenaria ? <CartaoAlvenaria /> : null}`.
- `MemorialEdificio.tsx`: importar `{ MemorialAlvenaria } from './AlvenariaResumo'` e inserir `<MemorialAlvenaria b={b} dim={dim} h2={h2} />` imediatamente depois de `<MemorialParedes b={b} dim={dim} h2={h2} />`.

## Verificação
```bash
npx tsc -b
npx vitest run src/app/design/design.test.ts src/core/building/alvenaria.test.ts -t "memorial"
```
(o segundo comando roda o teste do memorial do núcleo; se o filtro não achar teste, rode o arquivo sem `-t`.)

## Checklist (marcar ao terminar)
- [ ] `AlvenariaResumo.tsx` com `CartaoAlvenaria` e `MemorialAlvenaria` e os atributos `data-alv-*` / `data-memorial-alvenaria`.
- [ ] Cartão no Dimensionamento e memorial inseridos nos dois arquivos.
- [ ] `npx tsc -b` e `design.test.ts` verdes.
