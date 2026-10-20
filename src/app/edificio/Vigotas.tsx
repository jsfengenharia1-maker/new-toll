// Lajes treliçadas (frente R6): janela da laje (aba Vigotas) com a planta das vigotas por grupo de igualação, diagramas por
// nervura (momentos e cortante com o resistente), tabela por grupo, dados da laje e editor da armadura adicional bloqueada.
import { useState } from 'react';
import { useBuilding } from './store';
import { executarERecalcular } from './Armadura';
import { fmt, phiTxt } from './Detalhamento';
import { Diagrama, Mensagens, ST_TXT } from './Revisao';
import { Button, Hint, KV, NumField, Pill, Select } from '../ui';
import type { GrupoVigotas, ResultadoVigotas } from '../../core/building/vigotas';

const NCORES = 6;
const BITOLAS_VIGOTA = [6.3, 8, 10, 12.5].map((v) => ({ v, label: `φ${String(v).replace('.', ',')}` })); // sem importar de Detalhamento na carga do módulo (ciclo)
const num = (v: number, d = 2) => fmt(v, d);

/** "2 φ8" ou "—" para barras por nervura. */
export const barrasTxt = (b: { n: number; phi: number } | null | undefined) => (b && b.n > 0 ? `${b.n} ${phiTxt(b.phi)}` : '—');

/** Linhas da tabela por grupo de igualação (esforços por nervura, kN e kN·m). */
export function linhasGruposVigotas(r: ResultadoVigotas) {
  return r.grupos.map((g: GrupoVigotas, i) => ({
    grupo: i + 1, vigotas: g.vigotas, L: g.L, mPos: g.esforcos.mPos, mNeg: g.esforcos.mNeg,
    v: g.cortante.map((c) => ({ Vsd: c.Vsd, VRd1: c.VRd1 })),
    AsNec: g.positiva.AsNec, AsTrelica: g.positiva.AsTrelica, AsAd: g.positiva.AsAdicional, adicional: barrasTxt(g.positiva.barras), comprimento: g.positiva.comprimento,
    negativos: g.negativos.map((n) => (n ? `${barrasTxt(n.barras)} · C = ${num(n.comprimento)} m` : '—')),
    macico: g.macico,
  }));
}

// ---------------------------------------------------------------- planta da laje com as vigotas

function PlantaVigotas({ r, sel, onSel }: { r: ResultadoVigotas; sel: number; onSel: (i: number) => void }) {
  const l = useBuilding((s) => s.sessao.modelo.lajes.find((x) => x.id === r.laje));
  if (!l) return null;
  const W = 960, m = 40, xs = l.contorno.map((p) => p[0]), ys = l.contorno.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const esc = Math.min((W - 2 * m) / Math.max(x1 - x0, 0.5), 460 / Math.max(y1 - y0, 0.5)), H = (y1 - y0) * esc + 2 * m;
  const X = (v: number) => +(m + (v - x0) * esc).toFixed(1), Y = (v: number) => +(m + (y1 - v) * esc).toFixed(1);
  const anel = (rg: [number, number][]) => rg.map((p, i) => `${i ? 'L' : 'M'}${X(p[0])},${Y(p[1])}`).join('') + 'Z';
  const grupoDe = (i: number) => r.faixas[i].grupo;
  const primeiras = new Map<number, number>();
  r.faixas.forEach((f, i) => { if (!primeiras.has(f.grupo)) primeiras.set(f.grupo, i); });
  const ult = r.faixas.at(-1), pri = r.faixas[0];
  const mid = (f: typeof pri) => [(f.a[0] + f.z[0]) / 2, (f.a[1] + f.z[1]) / 2];
  return (
    <svg className="det det-laje" viewBox={`0 0 ${W} ${H.toFixed(0)}`} role="img" aria-label={`Planta das vigotas da laje ${r.nome}`}
      data-vigotas-laje={r.laje} data-faixas={r.faixas.length} data-grupos={r.grupos.length}>
      <path d={anel(l.contorno)} className="det-contorno" />
      {(l.furos ?? []).map((f, i) => <path key={i} d={anel(f)} className="det-furo" />)}
      {r.faixas.map((f, i) => {
        const ux = (f.z[0] - f.a[0]) / (f.L || 1), uy = (f.z[1] - f.a[1]) / (f.L || 1), g = grupoDe(i), gr = r.grupos[g];
        const at = (s: number) => [f.a[0] + ux * s, f.a[1] + uy * s];
        const seg = (s0: number, s1: number, cls: string, k: string) => {
          const A = at(s0), B = at(s1);
          return <line key={k} x1={X(A[0])} y1={Y(A[1])} x2={X(B[0])} y2={Y(B[1])} className={cls} />;
        };
        const hw = f.largura / 2, nx = -uy * hw, ny = ux * hw; // meia largura representada, perpendicular às vigotas
        const banda = `M${X(f.a[0] + nx)},${Y(f.a[1] + ny)}L${X(f.z[0] + nx)},${Y(f.z[1] + ny)}L${X(f.z[0] - nx)},${Y(f.z[1] - ny)}L${X(f.a[0] - nx)},${Y(f.a[1] - ny)}Z`;
        return (
          <g key={i} data-faixa={i} data-grupo={g} data-selecionada={sel === i ? 'sim' : 'nao'} className={`vig-faixa vig-g${g % NCORES}${sel === i ? ' sel' : ''}`} onClick={() => onSel(i)}>
            <path d={banda} className="vig-banda" />
            {gr.macico[0] > 0 && seg(0, Math.min(f.L, gr.macico[0]), 'vig-macico', 'm0')}
            {gr.macico[1] > 0 && seg(Math.max(0, f.L - gr.macico[1]), f.L, 'vig-macico', 'm1')}
            {gr.negativos[0] && seg(0, Math.min(f.L, gr.negativos[0].comprimento), 'vig-neg', 'n0')}
            {gr.negativos[1] && seg(Math.max(0, f.L - gr.negativos[1].comprimento), f.L, 'vig-neg', 'n1')}
          </g>
        );
      })}
      {[...primeiras.entries()].map(([g, i]) => {
        const c = mid(r.faixas[i]);
        return <text key={g} x={X(c[0]) + 4} y={Y(c[1]) - 6} className={`det-txt vig-g${g % NCORES}`} data-rotulo-grupo={g + 1}>G{g + 1} · {r.grupos[g].vigotas} vigotas</text>;
      })}
      {ult && pri && (() => {
        const c0 = mid(pri), c1 = mid(ult), ux = (pri.z[0] - pri.a[0]) / (pri.L || 1), uy = (pri.z[1] - pri.a[1]) / (pri.L || 1);
        const cx = (c0[0] + c1[0]) / 2 + ux * 0.25 * pri.L, cy = (c0[1] + c1[1]) / 2 + uy * 0.25 * pri.L;
        return (
          <g data-distribuicao>
            <line x1={X(c0[0] + ux * 0.25 * pri.L)} y1={Y(c0[1] + uy * 0.25 * pri.L)} x2={X(c1[0] + ux * 0.25 * pri.L)} y2={Y(c1[1] + uy * 0.25 * pri.L)} className="vig-dist" />
            <text x={X(cx) + 4} y={Y(cy) + 12} className="det-txt cota">distribuição {phiTxt(r.distribuicao.phi)} c/{num(r.distribuicao.s * 100, 0)}</text>
          </g>
        );
      })()}
      <text x={W - 8} y={H - 4} textAnchor="end" className="det-txt cota">cotas em m · escala {num(esc, 0)} px/m · clique numa vigota para ver os diagramas</text>
    </svg>
  );
}

// ---------------------------------------------------------------- diagramas de uma vigota

function DiagramasVigota({ r, i }: { r: ResultadoVigotas; i: number }) {
  const f = r.faixas[i], g = r.grupos[f.grupo];
  if (!f) return null;
  const MRd = g.negativos.map((n) => n?.MRdNervura ?? 0);
  const refsM = MRd.some((v) => v > 0) ? [{ v: -Math.max(...MRd), rot: 'MRd nervura (neg.)' }] : [];
  const VRd = [...new Set(g.cortante.map((c) => +c.VRd1.toFixed(1)))];
  const refsV = VRd.map((v) => ({ v, rot: 'VRd1' }));
  return (
    <div data-diagrama-vigota={i} data-grupo-vigota={f.grupo}>
      <h4>Vigota {i + 1} do grupo G{f.grupo + 1} · {num(f.nervuras, 1)} nervura(s) · L = {num(f.L)} m</h4>
      <p className="small">Envoltória ELU por nervura (momento positivo para baixo, lado tracionado). Os valores de dimensionamento do grupo são os da tabela, após momentos mínimos e igualação.</p>
      <Diagrama id={`vig-M-${i}`} titulo="Momento por nervura" unid="kN·m" xs={f.s} L={f.L} baixo cor="dg-m" refs={refsM}
        series={[{ ys: f.Mmax, rot: 'Mmax' }, { ys: f.Mmin, rot: 'Mmin', alt: true }]} />
      <Diagrama id={`vig-V-${i}`} titulo="Cortante por nervura" unid="kN" xs={f.s} L={f.L} cor="dg-v" refs={refsV} series={[{ ys: f.V, rot: 'V' }]} />
    </div>
  );
}

// ---------------------------------------------------------------- editor da armadura bloqueada

function EditorVigotas({ r }: { r: ResultadoVigotas }) {
  const calculando = useBuilding((s) => s.calculando);
  const trava = useBuilding((s) => s.sessao.modelo.lajes.find((x) => x.id === r.laje)?.armaduraVigotas);
  const g0 = r.grupos[0]?.positiva.barras, n0 = r.grupos.flatMap((g) => g.negativos).find((n) => n?.barras?.n)?.barras;
  const [inf, setInf] = useState({ n: trava?.inf.n ?? g0?.n ?? 0, phi: trava?.inf.phi ?? (g0?.phi || 8) });
  const [sup, setSup] = useState({ n: trava?.sup?.n ?? n0?.n ?? 1, phi: trava?.sup?.phi ?? (n0?.phi || 8) });
  const lim = (x: number) => Math.max(0, Math.min(2, Math.round(x)));
  const aplicar = () => executarERecalcular('laje.armaduraVigotas', { ids: [r.laje], inf, ...(sup.n > 0 ? { sup } : {}) });
  return (
    <section data-editor-armadura="vigotas">
      <h4>Armadura adicional por nervura {r.bloqueada && <Pill tone="warn" data-bloqueada>bloqueada</Pill>}</h4>
      <p className="small">{r.bloqueada ? 'Armadura editada: o recálculo só a verifica (positiva = treliça + adicional; negativa na capa).' : 'Arranjo calculado. Edite e use "Aplicar e bloquear" para fixá-lo.'} Vale para todos os grupos da laje.</p>
      <div className="row wrap" data-armadura="Inferior">
        <NumField label="Adicional inferior (nº de barras, 0 a 2)" width={200} value={inf.n} onChange={(q) => setInf({ ...inf, n: lim(q) })} />
        <Select label="Bitola" value={inf.phi} options={BITOLAS_VIGOTA} onChange={(p) => setInf({ ...inf, phi: p })} />
      </div>
      <div className="row wrap" data-armadura="Negativa">
        <NumField label="Negativa na capa (nº de barras, 0 a 2)" width={200} value={sup.n} onChange={(q) => setSup({ ...sup, n: lim(q) })} />
        <Select label="Bitola" value={sup.phi} options={BITOLAS_VIGOTA} onChange={(p) => setSup({ ...sup, phi: p })} />
      </div>
      <div className="row wrap">
        <Button variant="primary" disabled={calculando} onClick={aplicar}>Aplicar e bloquear</Button>
        <Button disabled={calculando || !r.bloqueada} onClick={() => executarERecalcular('armadura.desbloquear', { ids: [r.laje] })}>Desbloquear</Button>
      </div>
      {calculando && <p className="muted small">Recalculando…</p>}
    </section>
  );
}

// ---------------------------------------------------------------- aba Vigotas

export function JanelaVigotas({ id }: { id: string }) {
  const dim = useBuilding((s) => s.dim);
  const r = dim?.vigotas?.find((x) => x.laje === id);
  const [sel, setSel] = useState(0);
  if (!r) return <p className="muted">Laje sem resultado de vigotas.</p>;
  const linhas = linhasGruposVigotas(r), i = Math.min(sel, r.faixas.length - 1);
  return (
    <div data-vigotas={id}>
      <p className="small">Alinhamentos de vigotas na direção das nervuras: esforços por nervura (grelha × intereixo), momentos mínimos e igualação entre vizinhas, armadura positiva adicional ao banzo inferior da treliça, negativos na capa sobre os apoios, cortante sem armadura transversal (NBR 6118, 19.4.1) e faixa maciçada. Repete-se em {r.repeticoes} {r.repeticoes === 1 ? 'pavimento' : 'pavimentos'}.</p>
      <div className="det-leg"><span><i className="vig-leg banda" />vigota (cor = grupo de igualação)</span><span><i className="vig-leg neg" />negativos</span><span><i className="vig-leg macico" />faixa maciçada</span><span><i className="vig-leg dist" />distribuição</span></div>
      {r.faixas.length > 0 && <PlantaVigotas r={r} sel={i} onSel={setSel} />}
      {r.faixas.length > 0 && <DiagramasVigota r={r} i={i} />}
      <h4>Grupos de igualação (esforços e armadura por nervura)</h4>
      <div className="tablewrap">
        <table className="data quadro" data-tabela-grupos-vigotas>
          <thead><tr><th>Grupo</th><th>Vigotas</th><th>L (m)</th><th>Md+ (kN·m)</th><th>Md− ini / fim</th><th>Vsd / VRd1 ini</th><th>Vsd / VRd1 fim</th><th>As nec. (cm²)</th><th>Treliça (cm²)</th><th>Adicional (cm²)</th><th>Barras adicionais</th><th>Negativo ini</th><th>Negativo fim</th><th>Maciço ini / fim (cm)</th></tr></thead>
          <tbody>
            {linhas.map((x, k) => (
              <tr key={x.grupo} data-grupo={x.grupo} className={`click${r.faixas[i]?.grupo === k ? ' sel' : ''}`} onClick={() => { const j = r.faixas.findIndex((f) => f.grupo === k); if (j >= 0) setSel(j); }}>
                <td className="tl">G{x.grupo}</td><td className="num">{x.vigotas}</td><td className="num">{num(x.L)}</td><td className="num">{num(x.mPos)}</td>
                <td className="num">{num(x.mNeg[0])} / {num(x.mNeg[1])}</td>
                <td className="num">{num(x.v[0].Vsd, 1)} / {num(x.v[0].VRd1, 1)}</td><td className="num">{num(x.v[1].Vsd, 1)} / {num(x.v[1].VRd1, 1)}</td>
                <td className="num">{num(x.AsNec)}</td><td className="num">{num(x.AsTrelica)}</td><td className="num">{num(x.AsAd)}</td>
                <td className="tl">{x.adicional}{x.adicional !== '—' ? ` · C = ${num(x.comprimento)} m` : ''}</td><td className="tl">{x.negativos[0]}</td><td className="tl">{x.negativos[1]}</td>
                <td className="num">{num(x.macico[0] * 100, 0)} / {num(x.macico[1] * 100, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Hint>Esforços e armadura por nervura (vigota), após momentos mínimos e igualação. O As necessário já considera a seção T e o mínimo de 0,15 %; o banzo inferior da treliça entra descontado (CA-60 convertido ao aço da armadura).</Hint>
      <h4>Dados da laje</h4>
      <KV rows={[
        ['Modelo / treliça', `${r.modelo} · ${r.trelica} (banzo inferior ${barrasTxt({ n: 2, phi: r.banzoInf.phi })})`], ['Altura h / capa', `${num(r.h * 100, 0)} / ${num(r.capa * 100, 1)} cm`],
        ['Intereixo / nervura bw', `${num(r.intereixo * 100, 0)} / ${num(r.bw * 100, 0)} cm`], ['Vigotas / comprimento total', `${r.vigotas} / ${num(r.comprimentoVigotas)} m`],
        ['Distribuição na capa', `${phiTxt(r.distribuicao.phi)} c/${num(r.distribuicao.s * 100, 0)} cm (${r.distribuicao.aco}; As nec. ${num(r.distribuicao.AsNec)} cm²/m)`],
        ['Capa (13.2.4.2)', `${num(r.capa * 100, 1)} cm ≥ ${num(r.verificacaoCapa.minima * 100, 1)} cm: ${r.verificacaoCapa.ok ? 'atende' : 'não atende'}`],
        ['Peso das barras (por pavimento)', `${num(r.peso)} kg`], ['Peso da treliça (por pavimento)', `${num(r.pesoTrelica)} kg`],
        ['Armadura', r.bloqueada ? 'bloqueada' : 'calculada'], ['Situação', ST_TXT[r.status]],
      ]} />
      <h4>Mensagens</h4>
      <Mensagens msgs={r.mensagens} />
      <EditorVigotas key={`${r.laje}|${r.bloqueada}|${JSON.stringify(r.grupos.map((g) => g.positiva.barras))}`} r={r} />
    </div>
  );
}
