// N2c: 2ª ordem na interface — resultados do P-Δ na aba Análise e, na janela do pilar, o método local por direção,
// a fluência, o diagrama de momentos de 1ª e 2ª ordem da combinação determinante e o cortante por direção.
import type { AnaliseEdificio } from '../../core/building/analitico';
import type { MetodoLocal, ResultadoPilar } from '../../core/building/dimensionamento';
import { KV } from '../ui';
import { Diagrama } from './Revisao';

/** Métodos dos efeitos locais (os mesmos textos das mensagens do dimensionamento). */
const METODO_LOCAL_TXT: Record<MetodoLocal, string> = { curvatura: 'pilar-padrão com curvatura aproximada', curvaturaFluencia: 'pilar-padrão com curvatura aproximada e fluência', geral: 'método geral (M–N–1/r) com fluência' };

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');

/** P-Δ por combinação ELU (aba Análise): amplificação dos deslocamentos horizontais, iterações e convergência. */
export function SegundaOrdemAnalise({ an }: { an: AnaliseEdificio }) {
  const so = an.segundaOrdem;
  if (!so) return <p className="muted small" data-segunda-ordem="gamaZ">2ª ordem global pelo γz (ações horizontais das ELU × 0,95·γz entre 1,1 e o limite). O P-Δ 3D é opção de cálculo (“2ª ordem global por P-Δ”).</p>;
  const lista = [...so.combinacoes].sort((a, z) => z.amplificacao - a.amplificacao);
  const falhas = so.combinacoes.filter((c) => c.erro);
  return (
    <div data-segunda-ordem="pDelta" data-pdelta-combinacoes={so.combinacoes.length}>
      <p className="small">2ª ordem global por <b>P-Δ</b> no pórtico espacial com rigidez reduzida (vigas 0,4·Eci·Ic, pilares 0,8·Eci·Ic, lajes 0,3·Eci·Ic), uma solução por combinação ELU, sem a ampliação 0,95·γz (o γz segue informado). {so.combinacoes.length} combinações em {fmt(so.ms / 1000, 2)} s; maior amplificação dos deslocamentos {fmt(so.amplificacaoMax, 3)}; até {so.iteracoesMax} iterações.{falhas.length ? ` ${falhas.length} combinação(ões) sem convergência (instabilidade global).` : ''}</p>
      <div className="tablewrap">
        <table className="data quadro">
          <thead><tr><th>Combinação</th><th>Amplificação</th><th>Iterações</th><th>Situação</th></tr></thead>
          <tbody>{lista.map((c) => <tr key={c.nome}><td className="tl small">{c.nome}</td><td className="num">{fmt(c.amplificacao, 3)}</td><td className="num">{c.iteracoes}</td><td className="tl">{c.erro ? 'instável' : c.convergiu ? 'convergiu' : 'não convergiu'}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

/** Efeitos locais e cortante por direção de um lance de pilar (janela do pilar). */
export function SegundaOrdemPilar({ x }: { x: ResultadoPilar }) {
  const loc = x.local;
  const det = (x.determinantes ?? []).filter((c) => !c.tracao);
  // combinação de maior momento total relativo ao de 1ª ordem
  const gov = det.reduce<(typeof det)[number] | null>((m, c) => (!m || Math.max(c.MuTot, c.MvTot) > Math.max(m.MuTot, m.MvTot) ? c : m), null);
  const k: 0 | 1 = gov && gov.MvTot > gov.MuTot ? 1 : 0;
  const M = gov ? (k === 0 ? gov.Mu : gov.Mv) : null, tot = gov ? (k === 0 ? gov.MuTot : gov.MvTot) : 0;
  const n = 20, L = x.le[k] || 1, xs = Array.from({ length: n + 1 }, (_, i) => (i * L) / n);
  const m1 = M ? xs.map((s) => M[0] + ((M[1] - M[0]) * s) / L) : [];
  const sg = M ? Math.sign(Math.abs(M[1]) > Math.abs(M[0]) ? M[1] : M[0]) || 1 : 1, m1max = Math.max(0, ...m1.map(Math.abs));
  // forma senoidal do pilar-padrão: o acréscimo de 2ª ordem leva o máximo ao Md,tot
  const m2 = m1.map((v, i) => v + sg * Math.max(0, tot - m1max) * Math.sin((Math.PI * xs[i]) / L));
  const c = x.cortante;
  return (
    <div data-pilar-2ordem={loc ? loc.metodo.join('|') : ''}>
      {loc && <KV rows={[
        ['2ª ordem local u (b)', `${METODO_LOCAL_TXT[loc.metodo[0]]}${loc.ecc[0] ? ` · e_cc ${fmt(loc.ecc[0] * 100)} cm` : ''}`],
        ['2ª ordem local v (h)', `${METODO_LOCAL_TXT[loc.metodo[1]]}${loc.ecc[1] ? ` · e_cc ${fmt(loc.ecc[1] * 100)} cm` : ''}`],
        ...(loc.lances[0] > 1 || loc.lances[1] > 1 ? [['Lances desligados somados (u / v)', `${loc.lances[0]} / ${loc.lances[1]}`] as [string, string]] : []),
        ...(loc.secoesIntermediarias ? [['Seções verificadas', 'base, topo, cargas e nove internas (carga horizontal no lance)'] as [string, string]] : []),
      ]} />}
      {x.trechos && (
        <div className="tablewrap">
          <p className="muted small">Lance dividido por vigas em desnível (K1.12.4-19): cada trecho verificado com o seu ℓe, os seus esforços e efeitos locais; a armadura do lance atende a todos.</p>
          <table className="data quadro" data-pilar-trechos={x.trechos.length}>
            <thead><tr><th>Trecho</th><th>Da base (m)</th><th>ℓe u / v (m)</th><th>λ u / v</th><th>Nd (kN)</th><th>Uso</th><th>Combinação</th></tr></thead>
            <tbody>{x.trechos.map((t, k) => <tr key={k}><td className="num">{k + 1}</td><td className="num">{fmt(t.de)} a {fmt(t.ate)}</td><td className="num">{fmt(t.le[0])} / {fmt(t.le[1])}</td><td className="num">{fmt(t.lambda[0], 0)} / {fmt(t.lambda[1], 0)}</td><td className="num">{fmt(t.Nd, 0)}</td><td className="num">{fmt(t.util)}</td><td className="tl small">{t.combinacao || '—'}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {gov && M && <Diagrama id="M2" titulo={`Momento ${k === 0 ? 'Mu (b)' : 'Mv (h)'} de 1ª e 2ª ordem · ${gov.combinacao}`} unid="kN·m" xs={xs} L={L} cor="dg-m"
        series={[{ ys: m1, rot: 'M1d' }, { ys: m2, rot: 'Md,tot', alt: true }]} />}
      {gov && <p className="muted small">Abscissa ao longo de ℓe a partir da base; M1d linear entre as pontas e o acréscimo de 2ª ordem com a forma senoidal do pilar-padrão até Md,tot (no método geral, o maior momento da integração).</p>}
      {c && (
        <div className="tablewrap">
          <table className="data quadro" data-cortante-direcao={c.v ? 2 : 1}>
            <thead><tr><th>Direção</th><th>Vsd (kN)</th><th>Vc (kN)</th><th>VRd2 (kN)</th><th>Asw/s (cm²/m)</th><th>As faces (cm²)</th><th>Combinação</th></tr></thead>
            <tbody>{([['u (b)', c.u], ['v (h)', c.v]] as const).filter(([, d]) => d).map(([r, d]) => <tr key={r}><td className="tl">{r}</td><td className="num">{fmt(d!.Vsd, 1)}</td><td className="num">{fmt(d!.Vc, 1)}</td><td className="num">{fmt(d!.VRd2, 1)}</td><td className="num">{fmt(d!.asw)}</td><td className="num">{fmt(d!.AsLong)}</td><td className="tl small">{d!.combinacao}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
