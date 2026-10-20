// Janela da viga de fundação (frente FU2, interface): resumo das ações (alívio, cargas, travamento), mensagens e notas,
// detalhe longitudinal (pilares das pontas, barras, estribos e diagramas de momento e cortante) e transversal (seção com
// barras superiores, inferiores, pele e estribo), todos a partir de `diagrama` e `armadura` do resultado.
import { useBuilding, fundacaoAtual } from './store';
import { classificar } from '../../core/building/revisao';
import { cobrimentoFundacao } from '../../core/building/materiais';
import { geometriaVF, meiaFace, type ResultadoVigaFundacao } from '../../core/building/vigasFundacao';
import type { BuildingModel, VigaFundacao } from '../../core/building/types';
import type { BarChoice } from '../../core/concrete';
import { KV, Pill } from '../ui';
import { fmt, phiTxt } from './Detalhamento';

const cm = (v: number, d = 0) => fmt(v * 100, d);
const barTxt = (x: BarChoice | null | undefined) => (x ? `${x.n} ${phiTxt(x.phi)}` : '—');

/** Item de mensagem (código FUND_* e texto). */
function Mensagens({ msgs }: { msgs: string[] }) {
  if (!msgs.length) return <p className="muted small">Sem mensagens.</p>;
  return <ul className="revmsg">{msgs.map((m, i) => { const c = classificar(m); return <li key={i}><Pill tone={c.nivel === 'erro' ? 'bad' : c.nivel === 'aviso' ? 'warn' : 'na'}>{c.codigo}</Pill> {m}</li>; })}</ul>;
}

// ---------------------------------------------------------------- detalhe longitudinal

/** Elevação da viga entre os eixos dos pilares das pontas: barras, estribos e diagramas característicos de M e V. */
export function DetalheLongitudinalVF({ b, v, r }: { b: BuildingModel; v: VigaFundacao; r: ResultadoVigaFundacao }) {
  const g = geometriaVF(b, v);
  if (g.erro || !g.ini || !g.fim) return null;
  const L = r.L, ar = r.armadura, h = r.hAdot, lb = ar.lb;
  const fi = meiaFace(b, g.ini.pilar, g.u), ff = meiaFace(b, g.fim.pilar, [-g.u[0], -g.u[1]]);
  const ext = r.equilibrio.ini || r.equilibrio.fim ? lb : 0; // barras superiores ancoradas além do pilar equilibrado
  const W = 960, m = 40, esc = (W - 2 * m) / (L + 2 * Math.max(ext, 0.3)), x0 = m + Math.max(ext, 0.3) * esc;
  const X = (s: number) => (x0 + s * esc).toFixed(1);
  const Hb = Math.max(46, Math.min(110, h * esc * 1.6)), yT = 56, yB = yT + Hb;
  const est = ar.estribo;
  const nEst = est ? Math.floor((L - fi - ff) / est.s) + 1 : 0;
  // diagramas: M (superior para cima, inferior para baixo) e V, a partir das faces dos pilares
  const dg = r.diagrama, Mmax = Math.max(1e-6, ...dg.Msup, ...dg.Minf), Vmax = Math.max(1e-6, ...dg.V);
  const yM0 = yB + 92, aM = 38, yV0 = yM0 + aM + 58, aV = 30;
  const poli = (ys: number[], y0: number, a: number, mx: number, sinal: 1 | -1) => dg.s.map((s, i) => `${i ? 'L' : 'M'}${X(s)},${(y0 - sinal * (ys[i] / mx) * a).toFixed(1)}`).join('');
  const area = (ys: number[], y0: number, a: number, mx: number, sinal: 1 | -1) => `${poli(ys, y0, a, mx, sinal)}L${X(L)},${y0}L${X(0)},${y0}Z`;
  const H = yV0 + aV + 34;
  const tem = (t: 'ini' | 'fim') => r.equilibrio[t];
  return (
    <svg className="det" viewBox={`0 0 ${W} ${H.toFixed(0)}`} role="img" aria-label={`Detalhe longitudinal da viga de fundação ${r.nome}`} data-detalhe-vf={r.id} data-estribos-vf={nEst}>
      {([['ini', 0, fi], ['fim', L, ff]] as const).map(([t, s, f]) => (
        <g key={t}>
          <rect x={X(s - f)} y={yT - 22} width={(2 * f * esc).toFixed(1)} height={Hb + 44} className="det-pilar" data-ponta-vf={t} />
          <text x={X(s)} y={yT - 26} textAnchor="middle" className="det-txt cota">{t === 'ini' ? r.ini : r.fim}{tem(t) ? ' (equilibrada)' : ''}</text>
        </g>
      ))}
      <rect x={X(0)} y={yT} width={(L * esc).toFixed(1)} height={Hb} className="det-contorno" />
      {est && Array.from({ length: Math.min(nEst, 80) }, (_, k) => <line key={k} x1={X(fi + k * est.s)} x2={X(fi + k * est.s)} y1={yT + 4} y2={yB - 4} className="det-fio" />)}
      {ar.sup.barras && <g data-barra-vf="sup">
        <path d={`M${X(-ext)},${yT + 9}L${X(L + ext)},${yT + 9}`} className="det-barra sup" />
        {ext > 0 && <>
          {tem('ini') && <path d={`M${X(-ext)},${yT + 9}L${X(-ext)},${yT + 24}`} className="det-barra sup" />}
          {tem('fim') && <path d={`M${X(L + ext)},${yT + 9}L${X(L + ext)},${yT + 24}`} className="det-barra sup" />}
        </>}
        <text x={X(L / 2)} y={yT + 23} textAnchor="middle" className="det-txt sup">{barTxt(ar.sup.barras)} sup. – C = {fmt(L + 2 * lb)} (lb = {cm(lb)} cm além do eixo)</text>
      </g>}
      {ar.inf.barras && <g data-barra-vf="inf">
        <path d={`M${X(0)},${yB - 9}L${X(L)},${yB - 9}`} className="det-barra inf" />
        <text x={X(L / 2)} y={yB - 13} textAnchor="middle" className="det-txt inf">{barTxt(ar.inf.barras)} inf. – C = {fmt(L)}</text>
      </g>}
      {ar.pele?.barras && <text x={X(L / 2)} y={yT + Hb / 2 + 3} textAnchor="middle" className="det-txt pele">pele {barTxt(ar.pele.barras)} por face</text>}
      <text x={X(L / 2)} y={yB + 15} textAnchor="middle" className="det-txt">{est ? `Estribos ${phiTxt(est.phi)} c/${cm(est.s)} (${nEst} entre as faces dos pilares)` : 'Estribo não encontrado'}</text>
      <line x1={X(fi)} x2={X(L - ff)} y1={yB + 26} y2={yB + 26} className="det-cota" />
      <text x={X(L / 2)} y={yB + 37} textAnchor="middle" className="det-txt cota">{cm(L - fi - ff)} cm entre faces · eixo a eixo {cm(L)} cm · h = {cm(h)} cm (altura exagerada ×{fmt(Hb / (h * esc), 1)})</text>
      {/* diagrama de momento característico */}
      <text x={m} y={yM0 - aM - 6} className="det-txt cota">Momento característico (kN·m): superior tracionada {fmt(r.Mk.sup, 1)} · inferior tracionada {fmt(r.Mk.inf, 1)}</text>
      <line x1={X(0)} x2={X(L)} y1={yM0} y2={yM0} className="det-cota" />
      <path d={area(dg.Msup, yM0, aM, Mmax, 1)} className="det-diag sup" data-diagrama-vf="Msup" />
      <path d={area(dg.Minf, yM0, aM, Mmax, -1)} className="det-diag inf" data-diagrama-vf="Minf" />
      <text x={W - m} y={yM0 - aM + 8} textAnchor="end" className="det-txt sup">face superior</text>
      <text x={W - m} y={yM0 + aM - 2} textAnchor="end" className="det-txt inf">face inferior</text>
      {/* diagrama de cortante */}
      <text x={m} y={yV0 - aV - 6} className="det-txt cota">Cortante característico (kN): máximo {fmt(r.Vk, 1)} nas faces dos pilares</text>
      <line x1={X(0)} x2={X(L)} y1={yV0} y2={yV0} className="det-cota" />
      <path d={area(dg.V, yV0, aV, Vmax, 1)} className="det-diag cortante" data-diagrama-vf="V" />
      <text x={W - m} y={H - 4} textAnchor="end" className="det-txt cota">diagramas característicos (sem γf), envoltória de alavanca, cargas sobre a viga e travamento · s a partir do eixo de {r.ini}</text>
    </svg>
  );
}

// ---------------------------------------------------------------- detalhe transversal

/** Seção transversal na região de maior momento: barras superiores, inferiores, pele e estribo. */
export function DetalheTransversalVF({ b, r }: { b: BuildingModel; r: ResultadoVigaFundacao }) {
  const bw = r.bAdot, h = r.hAdot, ar = r.armadura, cob = cobrimentoFundacao(b), t = ar.estribo ? ar.estribo.phi / 1000 : 0.005;
  const esc = 200 / Math.max(h, bw), m = 18, wS = bw * esc, hS = h * esc, W = wS + 2 * m, H = hS + 2 * m + 18;
  const xL = cob + t, xR = bw - cob - t;
  const camadas = (x: BarChoice | null, de: 'inf' | 'sup') => {
    if (!x) return [] as { x: number; y: number; r: number }[];
    const phi = x.phi / 1000, cap = Math.max(1, Math.floor((xR - xL + 0.02) / (phi + 0.02)));
    return Array.from({ length: x.n }, (_, i) => {
      const k = Math.floor(i / cap), j = i % cap, nLin = Math.min(cap, x.n - k * cap);
      const xc = nLin === 1 ? (xL + xR) / 2 : xL + phi / 2 + (j * ((xR - xL) - phi)) / (nLin - 1);
      const dist = cob + t + phi / 2 + k * (phi + 0.025);
      return { x: xc, y: de === 'inf' ? h - dist : dist, r: phi / 2 };
    });
  };
  const pS = camadas(ar.sup.barras, 'sup'), pI = camadas(ar.inf.barras, 'inf');
  const nFace = ar.pele?.barras ? Math.max(1, Math.round(ar.pele.barras.n / 2)) : 0, pr = (ar.pele?.barras?.phi ?? 8) / 2000;
  const yA = Math.max(cob + 0.06, ...pS.map((c) => c.y + c.r + 0.03)), yB = Math.min(h - cob - 0.06, ...pI.map((c) => c.y - c.r - 0.03));
  const pP = Array.from({ length: nFace }, (_, i) => (nFace === 1 ? (yA + yB) / 2 : yA + (i * (yB - yA)) / (nFace - 1))).flatMap((y) => [{ x: xL + pr, y, r: pr }, { x: xR - pr, y, r: pr }]);
  const P = (v: number) => (m + v * esc).toFixed(1), R = (x: number) => Math.max(1.8, x * esc).toFixed(1);
  return (
    <svg className="det det-secao" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Seção transversal da viga de fundação ${r.nome}`} data-secao-vf>
      <rect x={m} y={m} width={wS} height={hS} className="det-contorno" />
      <rect x={P(cob)} y={P(cob)} width={((bw - 2 * cob) * esc).toFixed(1)} height={((h - 2 * cob) * esc).toFixed(1)} rx={4} className="det-estribo-sec" />
      {pS.map((c, i) => <circle key={`s${i}`} cx={P(c.x)} cy={P(c.y)} r={R(c.r)} className="det-pt sup" />)}
      {pI.map((c, i) => <circle key={`i${i}`} cx={P(c.x)} cy={P(c.y)} r={R(c.r)} className="det-pt inf" />)}
      {pP.map((c, i) => <circle key={`p${i}`} cx={P(c.x)} cy={P(c.y)} r={R(c.r)} className="det-pt pele" />)}
      <text x={m + wS / 2} y={H - 4} textAnchor="middle" className="det-txt cota">{cm(bw)} × {cm(h)} cm · cobr. {cm(cob, 1)} cm</text>
    </svg>
  );
}

// ---------------------------------------------------------------- janela

/** Conteúdo da janela de uma viga de fundação. */
export function JanelaVigaFundacao({ id }: { id: string }) {
  const b = useBuilding((s) => s.sessao.modelo), dim = useBuilding((s) => s.dim);
  const atual = useBuilding((s) => fundacaoAtual(s));
  const v = b.fundacao?.vigas?.find((x) => x.id === id);
  const r = dim?.vigasFundacao?.find((x) => x.id === id);
  if (!v) return <p className="muted">A viga de fundação não existe mais.</p>;
  if (!r) return <p className="muted">Calcule as fundações (grupo Fundação › Calcular fundações) para ver os resultados da viga.</p>;
  const ar = r.armadura;
  const eq = r.equilibrio.ini || r.equilibrio.fim ? `${[r.equilibrio.ini ? r.ini : '', r.equilibrio.fim ? r.fim : ''].filter(Boolean).join(' e ')}` : 'nenhuma';
  return (
    <div data-janela-viga-fundacao={id}>
      {!atual && <p className="hint bad">Os resultados são anteriores a uma alteração: recalcule as fundações.</p>}
      <div className="row wrap u-items-center">
        <Pill tone={r.status === 'ok' ? 'ok' : 'bad'}>{r.status === 'ok' ? 'atende' : 'não atende'}</Pill>
        <Pill tone="na">{r.tipo === 'equilibrio' ? 'Viga de equilíbrio' : 'Viga de travamento'}</Pill>
        {r.fixa && <Pill tone="warn">seção fixa</Pill>}
        <span className="muted">{r.resumo}</span>
      </div>
      <KV rows={[
        ['Pontas', `${r.ini} — ${r.fim} (eixo a eixo ${fmt(r.L)} m)`],
        ['Seção do modelo → adotada', `${cm(r.b)}×${cm(r.h)} → ${cm(r.bAdot)}×${cm(r.hAdot)} cm`],
        ['Pontas equilibradas', eq],
        ['Alívio levado a cada ponta (Nk)', `${r.ini} ${fmt(r.alivio.ini, 1)} kN · ${r.fim} ${fmt(r.alivio.fim, 1)} kN`],
        ['Reações das cargas sobre a viga (com peso próprio)', `${r.ini} ${fmt(r.cargas.ini, 1)} kN · ${r.fim} ${fmt(r.cargas.fim, 1)} kN`],
        ['Momento de travamento (excentricidade de execução)', `${r.ini} ${fmt(r.travamento.ini, 1)} kN·m · ${r.fim} ${fmt(r.travamento.fim, 1)} kN·m`],
        ['Mk (superior / inferior)', `${fmt(r.Mk.sup, 1)} / ${fmt(r.Mk.inf, 1)} kN·m`],
        ['Md (superior / inferior)', `${fmt(r.Md.sup, 1)} / ${fmt(r.Md.inf, 1)} kN·m`],
        ['Vk · Vd (a partir das faces)', `${fmt(r.Vk, 1)} · ${fmt(r.Vd, 1)} kN`],
        ['Armadura superior', `${barTxt(ar.sup.barras)} (As = ${fmt(ar.sup.As * 1e4)} cm², mín. ${fmt(ar.sup.AsMin * 1e4)} cm²)`],
        ['Armadura inferior', `${barTxt(ar.inf.barras)} (As = ${fmt(ar.inf.As * 1e4)} cm², mín. ${fmt(ar.inf.AsMin * 1e4)} cm²)`],
        ...(ar.pele?.barras ? [['Pele (cada face)', `${barTxt(ar.pele.barras)} (0,10 % bw·h)`] as [string, string]] : []),
        ['Estribo', ar.estribo ? `${phiTxt(ar.estribo.phi)} c/${cm(ar.estribo.s)} cm, ${ar.estribo.legs} ramos (Asw/s = ${fmt(ar.aswS * 1e4)} cm²/m; VRd2 = ${fmt(ar.VRd2, 0)} kN)` : '—'],
        ['d · lb das barras superiores', `${cm(ar.d, 1)} cm · ${cm(ar.lb)} cm`],
        ['Concreto · aço estimado', `${fmt(r.volume)} m³ · ${fmt(r.aco, 1)} kg`],
      ]} />
      <h4>Mensagens</h4>
      <Mensagens msgs={r.mensagens} />
      {r.notas.length > 0 && <details className="small"><summary>Observações do cálculo ({r.notas.length})</summary><ul>{r.notas.map((n, i) => <li key={i}>{n}</li>)}</ul></details>}
      <h4>Detalhe longitudinal</h4>
      <div className="det-leg"><span><i className="sup" />armadura superior</span><span><i className="inf" />armadura inferior</span><span><i className="pele" />pele</span><span><i className="estribo" />estribos</span></div>
      <DetalheLongitudinalVF b={b} v={v} r={r} />
      <h4>Seção transversal</h4>
      <DetalheTransversalVF b={b} r={r} />
      <p className="hint">Viga sem apoio no solo: leva peso próprio e cargas do nível de fundação às pontas e, se de equilíbrio, centra o elemento excêntrico. Dimensionada como as vigas do edifício (NBR 6118: flexão, cortante modelo I, pele, ancoragem); seção mínima, excentricidade de execução e estribos até as esperas são a confirmar (ver Premissas em uso).</p>
    </div>
  );
}
