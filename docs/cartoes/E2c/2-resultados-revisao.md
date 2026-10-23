# Cartão E2c-2 — resultados das vigas inclinadas (informação, erros em vermelho, envoltória, listagem, desenho) e lista de erros

Executor: Haiku. Depende do cartão 1 (`1-janela-inclinadas.md`) aplicado. Cartão seguinte: `3-memorial-e2e.md`. Este cartão compila sozinho depois do 1.

## Regras (valem para todo o cartão)
- Só interface. **Não altere nada em `src/core/`** (o núcleo da E2c está pronto e testado em `src/core/building/inclinadas.test.ts`; a validação externa é `validation/opensees/viga_inclinada.py`). Componentes só de `src/app/ui` (nunca controles crus); sem cor literal, sem CSS novo, sem estilo inline (as classes usadas já existem em `global.css`); **nenhum botão novo na barra da planta** (a janela abre pelo item "Vigas inclinadas" da paleta Ctrl+K e pela lista de erros).
- Os rótulos abaixo são **exatos e únicos** no escopo em que o e2e os procura: não os renomeie, não acrescente `unit` aos campos que já o trazem no rótulo. No e2e, `getByRole('button', { name, exact: true })` para botões; para `NumField`, `OptNumField` e `Select` (o nome acessível inclui valor ou unidade) use regex ancorada no início, como `getByLabel(/^Valor da carga/)`.
- Aplique as edições na ordem. Se um texto a localizar não existir (outro agente mexeu no arquivo), pare e descreva o que encontrou: não improvise.

## O que o núcleo já entrega (não reimplemente)
- `Obra.vigasInclinadas?: VigaInclinada[]` (`types.ts`): pavimentos inicial e final (`pavIni`, `pavFim`), pontas `pIni` e `pFim` em planta, desnível das pontas, seção `{ b, h }` (m), `multipla`, ligações `ligIni` e `ligFim` (`engastada` ou `articulada`), `cargas` (concentrada, linear, faixa e triangular, por caso), `flambagem` por plano, `armadura` bloqueada.
- Comandos: `inclinada.criar`, `inclinada.editar`, `inclinada.mover { id, ponta: ini | fim | ambas, dx, dy }`, `inclinada.remover { ids }`, `inclinada.armadura { id, sup, inf, laterais?, estribo }` e `inclinada.redimensionar { ids? }`.
- `src/core/building/inclinadas.ts`: `resumoInclinadas(b)`, `barrasDaInclinada`, `ligacaoDaPonta`. `src/core/building/inclinadasDim.ts`: `ResultadoInclinada` (em `dim.inclinadas`, uma por barra), `DetalheInclinada` (`dim.detalhesInclinadas`), `listagemInclinada`. `src/core/building/memorialInclinadas.ts`: `memorialInclinadas(b, dim)`.
- Revisão: tipo `inclinada` e códigos INCLINADA_ARMADURA, INCLINADA_ESBELTEZ, INCLINADA_ESBELTEZ_MAX, INCLINADA_BIELA e INCLINADA_NOS.

## 1. Criar `src/app/edificio/InclinadasResultadosUI.tsx` (arquivo novo, cole inteiro)
```tsx
// Resultados das vigas inclinadas (E2c, interface): informação (tipo, pavimentos, seção, armadura, ligações e flambagem), erros
// em vermelho com o detalhe por clique, envoltória por seção, listagem completa (materiais, esforços por hipótese e combinação,
// resultado) e a elevação e a seção em SVG. O cálculo está em core/building/inclinadasDim.ts (dimensionarInclinadas,
// listagemInclinada) e a lista de erros em revisao.ts.
import { useMemo, useState } from 'react';
import { Button, download, Hint, Pill, Select } from '../ui';
import { combinacoesDoEstado, combinacoesEdificio } from '../../core/building/combinacoes';
import { porCaso } from '../../core/building/dimensionamento';
import { listagemInclinada, type DetalheInclinada, type ResultadoInclinada } from '../../core/building/inclinadasDim';
import type { BuildingModel } from '../../core/building/types';
import { calculoAtual, dimAtual, useBuilding } from './store';

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');
const ST = { ok: 'atende', review: 'revisar', fail: 'não atende' } as const;
const TOM = { ok: 'ok', review: 'warn', fail: 'bad' } as const;

/** Elevação desenvolvida (barras superiores, inferiores, pele e estribos) e seção da viga inclinada, em escala própria. */
export function DesenhoInclinada({ r, det }: { r: ResultadoInclinada; det: DetalheInclinada }) {
  const W = 360, m = 16, alt = 64, hSec = 90, wSec = Math.max(24, Math.min(90, (hSec * r.b) / r.h));
  const nEst = Math.min(60, Math.max(2, Math.round(r.Lf / det.estribos.s)));
  const a = r.arranjo, yS = m + 10, yI = m + alt - 10;
  const xs = (i: number) => m + ((W - 2 * m) * i) / (nEst - 1);
  const col = (n: number, k: number) => (n > 1 ? (k * (wSec - 20)) / (n - 1) + 10 : wSec / 2);
  return (
    <div className="det-secoes" data-inclinada-desenho>
      <svg className="det" viewBox={`0 0 ${W} ${alt + 2 * m + 12}`} role="img" aria-label={`Elevação desenvolvida de ${r.nome}`}>
        <rect x={m} y={m} width={W - 2 * m} height={alt} className="det-contorno" />
        {Array.from({ length: nEst }, (_, i) => <line key={i} x1={xs(i)} x2={xs(i)} y1={m} y2={m + alt} className="det-fio" />)}
        <line x1={m} x2={W - m} y1={yS} y2={yS} className="det-barra sup" />
        <line x1={m} x2={W - m} y1={yI} y2={yI} className="det-barra inf" />
        {a.laterais && <line x1={m} x2={W - m} y1={m + alt / 2} y2={m + alt / 2} className="det-barra pele" />}
        <text x={m + 4} y={yS - 3} className="det-txt sup">{a.sup.n}φ{fmt(a.sup.phi, a.sup.phi % 1 ? 1 : 0)}</text>
        <text x={m + 4} y={yI + 10} className="det-txt inf">{a.inf.n}φ{fmt(a.inf.phi, a.inf.phi % 1 ? 1 : 0)}</text>
        <text x={W / 2} y={alt + 2 * m + 8} textAnchor="middle" className="det-txt cota">{fmt(r.Lf)} m entre faces · {fmt(r.angulo, 1)}° · estribos {r.estribo}</text>
      </svg>
      <svg className="det det-secao" viewBox={`0 0 ${wSec + 20} ${hSec + 20}`} role="img" aria-label={`Seção de ${r.nome}`}>
        <rect x={10} y={10} width={wSec} height={hSec} className="det-contorno" />
        {Array.from({ length: a.sup.n }, (_, k) => <circle key={`s${k}`} cx={10 + col(a.sup.n, k)} cy={10 + 9} r={3} className="det-pt sup" />)}
        {Array.from({ length: a.inf.n }, (_, k) => <circle key={`i${k}`} cx={10 + col(a.inf.n, k)} cy={10 + hSec - 9} r={3} className="det-pt inf" />)}
        {a.laterais && Array.from({ length: a.laterais.n }, (_, k) => [9, wSec - 9].map((x) => <circle key={`l${k}${x}`} cx={10 + x} cy={10 + 9 + ((hSec - 18) * (k + 1)) / (a.laterais!.n + 1)} r={2.5} className="det-pt pele" />))}
      </svg>
    </div>
  );
}

/** Listagem completa de uma barra (C6.70, K1.12.2-6). */
function Listagem({ b, r }: { b: BuildingModel; r: ResultadoInclinada }) {
  const an = useBuilding((s) => s.analise);
  const [qual, setQual] = useState('');
  const l = useMemo(() => {
    if (!an) return null;
    const elu = combinacoesDoEstado(b, an, 'concreto', combinacoesEdificio(b, an));
    return listagemInclinada(b, an, r, elu, (bi, xs) => porCaso(an, bi, xs));
  }, [b, an, r]);
  if (!l) return null;
  const nomes = [...Object.keys(l.casos).map((n) => ({ v: `h:${n}`, label: `Hipótese ${n}` })), ...l.combinacoes.map((c) => ({ v: `c:${c.nome}`, label: `Combinação ${c.nome}` }))];
  const atual = nomes.find((x) => x.v === qual)?.v ?? nomes[0]?.v ?? '';
  const est = atual.startsWith('h:') ? l.casos[atual.slice(2)] : l.combinacoes.find((c) => `c:${c.nome}` === atual)?.estacoes ?? [];
  const csv = () => {
    const cab = 'x (m);N max (kN);N min (kN);Mz max (kN·m);Mz min (kN·m);My max (kN·m);My min (kN·m);Vy (kN);Vz (kN);T (kN·m);utilização';
    const linhas = l.envoltoria.map((e) => [e.x, e.Nmax, e.Nmin, e.Mzmax, e.Mzmin, e.Mymax, e.Mymin, e.Vy, e.Vz, e.T, e.util].map((v) => fmt(v, 3)).join(';'));
    void download(`envoltoria-${l.nome.replace(/[^\w-]+/g, '_')}.csv`, [cab, ...linhas].join('\n'), 'text/csv');
  };
  return (
    <div data-inclinada-listagem>
      <p className="small"><b>Listagem de {l.nome}</b></p>
      <ul className="small">
        <li>Materiais: C{l.materiais.fck}, aço {l.materiais.acoLongitudinal} (barras) e {l.materiais.acoEstribo} (estribos), cobrimento {fmt(l.materiais.cobrimento, 1)} cm, γc {fmt(l.materiais.gamaC)} e γs {fmt(l.materiais.gamaS)}.</li>
        {l.descricao.map((t, i) => <li key={i}>{t}</li>)}
        <li>Resultado: {l.resultado}; aproveitamento {fmt(l.aproveitamento * 100, 0)} %.</li>
      </ul>
      <div className="row wrap u-items-end">
        <Select label="Esforços por hipótese ou combinação" value={atual} options={nomes} onChange={setQual} />
        <Button onClick={csv}>Baixar a envoltória (CSV)</Button>
      </div>
      <div className="tablewrap">
        <table className="data quadro">
          <thead><tr><th>x (m)</th><th>N (kN)</th><th>Vy (kN)</th><th>Mz (kN·m)</th><th>Vz (kN)</th><th>My (kN·m)</th><th>T (kN·m)</th></tr></thead>
          <tbody>{est.map((e, i) => <tr key={i}><td>{fmt(e.x)}</td><td>{fmt(e.N, 1)}</td><td>{fmt(e.Vy, 1)}</td><td>{fmt(e.Mz, 1)}</td><td>{fmt(e.Vz, 1)}</td><td>{fmt(e.My, 1)}</td><td>{fmt(e.T, 1)}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

/** Resultados de uma viga inclinada lançada (uma linha por barra, se múltipla). */
export function InclinadaResultados({ b, id }: { b: BuildingModel; id: string }) {
  const atual = useBuilding((s) => calculoAtual(s) && dimAtual(s));
  const dim = useBuilding((s) => s.dim);
  const [aberto, setAberto] = useState<string | null>(null);
  const [lista, setLista] = useState<string | null>(null);
  if (!dim || !atual) return <div data-inclinada-resultados><Hint>Calcule o edifício (aba Dimensionamento) para ver a armadura, a esbeltez e os erros desta viga inclinada.</Hint></div>;
  const rs = (dim.inclinadas ?? []).filter((r) => r.inclinada === id);
  if (!rs.length) return <div data-inclinada-resultados><Hint>Esta viga inclinada não entrou no último cálculo (confira os avisos da análise: ponta sem apoio ou modelo integrado).</Hint></div>;
  return (
    <div data-inclinada-resultados>
      {rs.map((r) => {
        const det = dim.detalhesInclinadas?.find((d) => d.barra === r.barra);
        const erros = r.mensagens.filter((m) => !m.startsWith('Viga inclinada: o detalhe dos nós'));
        return (
          <div key={r.barra} data-inclinada-barra={r.barra}>
            <p className="small"><b>{r.nome}</b> <Pill tone={TOM[r.status]}>{ST[r.status]}</Pill></p>
            <ul className="small">
              <li>Pavimentos {r.pavimento} → {r.pavimentoFim}; seção {r.secao} cm; {fmt(r.L)} m entre as pontas ({fmt(r.Lf)} m entre faces), {fmt(r.angulo, 1)}° com a horizontal; ligações {r.ligacao}.</li>
              <li>Flambagem: ℓe = {fmt(r.le[0])} m (vertical, λ = {fmt(r.lambda[0], 0)}) e {fmt(r.le[1])} m (transversal, λ = {fmt(r.lambda[1], 0)}).</li>
              <li>Armadura: {r.armadura}{r.bloqueada ? ' (bloqueada)' : ''}; estribos {r.estribo}; As = {fmt(r.As.total, 1)} cm² ({fmt(r.taxa * 100, 2)} %); utilização {fmt(r.util, 2)}; cortante e torção {fmt(r.utilCortante, 2)}.</li>
              <li>Esforços de cálculo: Nd = {fmt(r.Nd.compressao, 1)} kN (compressão) e {fmt(r.Nd.tracao, 1)} kN (tração); Mz = {fmt(r.Mz, 1)} e My = {fmt(r.My, 1)} kN·m; Vy = {fmt(r.Vd[0], 1)} e Vz = {fmt(r.Vd[1], 1)} kN.</li>
            </ul>
            {erros.length > 0 && (
              <ul className="small" data-inclinada-erros>
                {erros.map((m, i) => <li key={i} className={r.status === 'fail' ? 'bad' : 'warn'}>{m}</li>)}
              </ul>
            )}
            <Hint>O detalhe dos nós de extremidade fica a cargo do projetista.</Hint>
            {det && <DesenhoInclinada r={r} det={det} />}
            <div className="row wrap">
              <Button aria-label={`Detalhe das seções de ${r.nome}`} onClick={() => setAberto(aberto === r.barra ? null : r.barra)}>{aberto === r.barra ? 'Ocultar o detalhe das seções' : 'Ver o detalhe das seções'}</Button>
              <Button aria-label={`Listagem de ${r.nome}`} onClick={() => setLista(lista === r.barra ? null : r.barra)}>{lista === r.barra ? 'Ocultar a listagem' : 'Ver a listagem'}</Button>
            </div>
            {aberto === r.barra && (
              <div className="tablewrap" data-inclinada-envoltoria>
                <table className="data quadro">
                  <thead><tr><th>x (m)</th><th>N máx</th><th>N mín</th><th>Mz máx</th><th>Mz mín</th><th>My máx</th><th>My mín</th><th>Vy</th><th>Vz</th><th>T</th><th>Utilização</th></tr></thead>
                  <tbody>{r.envoltoria.map((e, i) => <tr key={i} className={e.util > 1 ? 'bad' : ''}><td>{fmt(e.x)}</td><td>{fmt(e.Nmax, 1)}</td><td>{fmt(e.Nmin, 1)}</td><td>{fmt(e.Mzmax, 1)}</td><td>{fmt(e.Mzmin, 1)}</td><td>{fmt(e.Mymax, 1)}</td><td>{fmt(e.Mymin, 1)}</td><td>{fmt(e.Vy, 1)}</td><td>{fmt(e.Vz, 1)}</td><td>{fmt(e.T, 1)}</td><td>{fmt(e.util, 2)}</td></tr>)}</tbody>
                </table>
                <p className="small">Seções mais desfavoráveis: {r.determinantes.map((d) => `${d.combinacao} em x = ${fmt(d.x)} m (${fmt(d.util, 2)})`).join('; ')}.</p>
              </div>
            )}
            {lista === r.barra && <Listagem b={b} r={r} />}
          </div>
        );
      })}
    </div>
  );
}
```

## 2. Editar `src/app/edificio/InclinadasUI.tsx`

Mostra os resultados da viga escolhida logo abaixo da edição.

2.1. Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
import { useBuilding } from './store';
```

Substitua por:

```tsx
import { useBuilding } from './store';
import { InclinadaResultados } from './InclinadasResultadosUI';
```

2.2. Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
        {v && <EditarInclinada key={v.id} b={b} v={v} />}

```

Substitua por:

```tsx
        {v && <EditarInclinada key={v.id} b={b} v={v} />}
        {v && <InclinadaResultados b={b} id={v.id} />}

```

## 3. Editar `src/app/edificio/Revisao.tsx`

Erros e avisos das vigas inclinadas abrem a janela (clique ou duplo clique).

3.1. Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
import { limiteDaMensagem, sobreposicoesDe } from './fundacaoGrupo';
```

Substitua por:

```tsx
import { limiteDaMensagem, sobreposicoesDe } from './fundacaoGrupo';
import { useInclinadasUI } from './InclinadasUI';
```

3.2. Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
                  const el = i.tipo !== 'obra' && i.tipo !== 'inclinada' && i.id ?
```

Substitua por:

```tsx
                  const inc = i.tipo === 'inclinada' && i.id ? i.id : null;
                  const el = i.tipo !== 'obra' && i.tipo !== 'inclinada' && i.id ?
```

3.3. Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
className={`${el ? 'click' : ''} ${i.nivel === 'erro' ? 'bad' : 'warn'}`} title={el ? 'Clique: ver na planta. Duplo clique: resultados do elemento.' : undefined}
                      ir={() => el && onIr(el.tipo, el.id, i.pavimento)} abrir={() => el && abrirJanela({ ...el, pavimento: i.pavimento })}>
```

Substitua por:

```tsx
className={`${el || inc ? 'click' : ''} ${i.nivel === 'erro' ? 'bad' : 'warn'}`} title={el ? 'Clique: ver na planta. Duplo clique: resultados do elemento.' : inc ? 'Clique: abre a janela da viga inclinada.' : undefined}
                      ir={() => (inc ? useInclinadasUI.getState().abrir(inc) : el && onIr(el.tipo, el.id, i.pavimento))} abrir={() => (inc ? useInclinadasUI.getState().abrir(inc) : el && abrirJanela({ ...el, pavimento: i.pavimento }))}>
```

## Verificação
`npx tsc -b` sem erros e `npx vitest run src/app/design` verde (nenhuma cor literal, classe sem CSS ou estilo inline). Relate só o resultado.
