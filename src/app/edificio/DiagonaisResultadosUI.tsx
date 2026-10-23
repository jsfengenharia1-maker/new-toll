// Resultados das diagonais de contraventamento (E2d, interface): informação (tipo, pavimentos, seção, armadura, ligações, flambagem
// e nós de cruzamento), erros em vermelho, envoltória por seção, listagem completa (materiais, esforços por hipótese e combinação,
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
const INFO = /^Diagonal: (o detalhe dos nós|nó gerado|\d+ nós gerados)/;

/** Elevação desenvolvida (barras superiores, inferiores, pele e estribos) e seção da diagonal, em escala própria. */
export function DesenhoDiagonal({ r, det }: { r: ResultadoInclinada; det: DetalheInclinada }) {
  const W = 360, m = 16, alt = 64, hSec = 90, wSec = Math.max(24, Math.min(90, (hSec * r.b) / r.h));
  const nEst = Math.min(60, Math.max(2, Math.round(r.Lf / det.estribos.s)));
  const a = r.arranjo, yS = m + 10, yI = m + alt - 10;
  const xs = (i: number) => m + ((W - 2 * m) * i) / (nEst - 1);
  const col = (n: number, k: number) => (n > 1 ? (k * (wSec - 20)) / (n - 1) + 10 : wSec / 2);
  return (
    <div className="det-secoes" data-diagonal-desenho>
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

/** Listagem completa de uma barra (C6.45 e a das inclinadas): materiais, esforços por hipótese e combinação, envoltória e resultado. */
function ListagemDiagonal({ b, r }: { b: BuildingModel; r: ResultadoInclinada }) {
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
    <div data-diagonal-listagem>
      <p className="small"><b>Listagem de {l.nome}</b></p>
      <ul className="small">
        <li>Materiais: C{l.materiais.fck}, aço {l.materiais.acoLongitudinal} (barras) e {l.materiais.acoEstribo} (estribos), cobrimento {fmt(l.materiais.cobrimento, 1)} cm, γc {fmt(l.materiais.gamaC)} e γs {fmt(l.materiais.gamaS)}.</li>
        {l.descricao.map((t, i) => <li key={i}>{t}</li>)}
        <li>Resultado: {l.resultado}; aproveitamento {fmt(l.aproveitamento * 100, 0)} %.</li>
      </ul>
      <div className="row wrap u-items-end">
        <Select label="Esforços da diagonal por hipótese ou combinação" value={atual} options={nomes} onChange={setQual} />
        <Button onClick={csv}>Baixar a envoltória da diagonal (CSV)</Button>
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

/** Resultados de uma diagonal lançada (uma linha por barra, se múltipla). */
export function DiagonalResultados({ b, id }: { b: BuildingModel; id: string }) {
  const atual = useBuilding((s) => calculoAtual(s) && dimAtual(s));
  const dim = useBuilding((s) => s.dim);
  const [aberto, setAberto] = useState<string | null>(null);
  const [lista, setLista] = useState<string | null>(null);
  if (!dim || !atual) return <div data-diagonal-resultados><Hint>Calcule o edifício (aba Dimensionamento) para ver a armadura, a esbeltez e os erros desta diagonal.</Hint></div>;
  const rs = (dim.diagonais ?? []).filter((r) => r.inclinada === id);
  if (!rs.length) return <div data-diagonal-resultados><Hint>Esta diagonal não entrou no último cálculo (confira os avisos da análise: extremo sem apoio ou modelo integrado).</Hint></div>;
  return (
    <div data-diagonal-resultados>
      {rs.map((r) => {
        const det = dim.detalhesDiagonais?.find((d) => d.barra === r.barra);
        const erros = r.mensagens.filter((m) => !INFO.test(m));
        const infos = r.mensagens.filter((m) => INFO.test(m) && !m.startsWith('Diagonal: o detalhe dos nós'));
        return (
          <div key={r.barra} data-diagonal-barra={r.barra}>
            <p className="small"><b>{r.nome}</b> <Pill tone={TOM[r.status]}>{ST[r.status]}</Pill></p>
            <ul className="small">
              <li>Pavimentos {r.pavimento} → {r.pavimentoFim}; seção {r.secao} cm; {fmt(r.L)} m entre os extremos ({fmt(r.Lf)} m entre faces), {fmt(r.angulo, 1)}° com a horizontal; ligações {r.ligacao}.</li>
              <li>Flambagem: ℓe = {fmt(r.le[0])} m (vertical, λ = {fmt(r.lambda[0], 0)}) e {fmt(r.le[1])} m (transversal, λ = {fmt(r.lambda[1], 0)}).</li>
              <li>Armadura: {r.armadura}{r.bloqueada ? ' (bloqueada)' : ''}; estribos {r.estribo}; As = {fmt(r.As.total, 1)} cm² ({fmt(r.taxa * 100, 2)} %); utilização {fmt(r.util, 2)}; cortante e torção {fmt(r.utilCortante, 2)}.</li>
              <li>Esforços de cálculo: Nd = {fmt(r.Nd.compressao, 1)} kN (compressão) e {fmt(r.Nd.tracao, 1)} kN (tração); Mz = {fmt(r.Mz, 1)} e My = {fmt(r.My, 1)} kN·m; Vy = {fmt(r.Vd[0], 1)} e Vz = {fmt(r.Vd[1], 1)} kN.</li>
            </ul>
            {infos.length > 0 && <ul className="small" data-diagonal-cruzamento>{infos.map((m, i) => <li key={i}>{m}</li>)}</ul>}
            {erros.length > 0 && (
              <ul className="small" data-diagonal-erros>
                {erros.map((m, i) => <li key={i} className={r.status === 'fail' ? 'bad' : 'warn'}>{m}</li>)}
              </ul>
            )}
            <Hint>O detalhe dos nós de extremidade fica a cargo do projetista.</Hint>
            {det && <DesenhoDiagonal r={r} det={det} />}
            <div className="row wrap">
              <Button aria-label={`Detalhe das seções da diagonal ${r.nome}`} onClick={() => setAberto(aberto === r.barra ? null : r.barra)}>{aberto === r.barra ? 'Ocultar o detalhe das seções da diagonal' : 'Ver o detalhe das seções da diagonal'}</Button>
              <Button aria-label={`Listagem da diagonal ${r.nome}`} onClick={() => setLista(lista === r.barra ? null : r.barra)}>{lista === r.barra ? 'Ocultar a listagem da diagonal' : 'Ver a listagem da diagonal'}</Button>
            </div>
            {aberto === r.barra && (
              <div className="tablewrap" data-diagonal-envoltoria>
                <table className="data quadro">
                  <thead><tr><th>x (m)</th><th>N máx</th><th>N mín</th><th>Mz máx</th><th>Mz mín</th><th>My máx</th><th>My mín</th><th>Vy</th><th>Vz</th><th>T</th><th>Utilização</th></tr></thead>
                  <tbody>{r.envoltoria.map((e, i) => <tr key={i} className={e.util > 1 ? 'bad' : ''}><td>{fmt(e.x)}</td><td>{fmt(e.Nmax, 1)}</td><td>{fmt(e.Nmin, 1)}</td><td>{fmt(e.Mzmax, 1)}</td><td>{fmt(e.Mzmin, 1)}</td><td>{fmt(e.Mymax, 1)}</td><td>{fmt(e.Mymin, 1)}</td><td>{fmt(e.Vy, 1)}</td><td>{fmt(e.Vz, 1)}</td><td>{fmt(e.T, 1)}</td><td>{fmt(e.util, 2)}</td></tr>)}</tbody>
                </table>
                <p className="small">Seções mais desfavoráveis: {r.determinantes.map((d) => `${d.combinacao} em x = ${fmt(d.x)} m (${fmt(d.util, 2)})`).join('; ')}.</p>
              </div>
            )}
            {lista === r.barra && <ListagemDiagonal b={b} r={r} />}
          </div>
        );
      })}
    </div>
  );
}
