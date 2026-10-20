// Detalhamento das lajes maciças (frente R4): planta da laje com contorno, furos, bordas por tipo (contínua, apoiada,
// livre) e as posições de armadura (barra representativa e linha de distribuição, com o rótulo "Nk – n φ c/s – C = x,xx"),
// em camadas inferior/superior; tabela de posições, As necessária × adotada, lb, emendas e avisos.
import { useState } from 'react';
import { useBuilding } from './store';
import { Check, KV, Pill } from '../ui';
import { barArea } from '../../core/concrete';
import { acoDe } from '../../core/building/materiais';
import type { BordaLaje, DetalheLaje, PosicaoLaje, TipoBarraLaje } from '../../core/building/detalhamentoLajes';
import { fmt, phiTxt } from './Detalhamento';

export const TIPO_POS_LAJE: Record<TipoBarraLaje, string> = {
  positiva: 'Positiva', negativa: 'Negativa', 'negativa-borda': 'Negativa de borda', distribuicao: 'Distribuição',
  'borda-livre': 'Borda livre (U)', 'borda-livre-long': 'Borda livre (longitudinal)', canto: 'Canto', furo: 'Reforço de furo',
};
export const FACE_POS_LAJE: Record<PosicaoLaje['face'], string> = { inf: 'inferior', sup: 'superior' };
const TIPO_BORDA: Record<BordaLaje['tipo'], string> = { continua: 'contínua', apoiada: 'apoiada', livre: 'livre' };
const kgM = (phi: number) => barArea(phi) * 7850;

/** Rótulo da posição: "N1 – 12 φ8 c/15 – C = 3,45" (sem espaçamento nas posições não distribuídas). */
export const rotuloPosicaoLaje = (x: PosicaoLaje) => `${x.pos} – ${x.n} ${phiTxt(x.phi)}${x.s > 0 ? ` c/${fmt(x.s * 100, 0)}` : ''} – C = ${fmt(x.comprimento)}`;

/** Linhas da tabela de posições de uma laje (um pavimento): comprimento total e peso. */
export function linhasPosicoesLaje(d: DetalheLaje) {
  return d.posicoes.map((x) => ({ ...x, total: x.n * x.comprimento, peso: x.n * x.comprimento * kgM(x.phi) }));
}

// ---------------------------------------------------------------- planta da laje

function PlantaLaje({ d, mostrar }: { d: DetalheLaje; mostrar: { inf: boolean; sup: boolean } }) {
  const b = useBuilding((s) => s.sessao.modelo);
  const l = b.lajes.find((x) => x.id === d.laje);
  if (!l) return null;
  const W = 960, m = 46, xs = l.contorno.map((p) => p[0]), ys = l.contorno.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const esc = Math.min((W - 2 * m) / Math.max(x1 - x0, 0.5), 520 / Math.max(y1 - y0, 0.5)), H = (y1 - y0) * esc + 2 * m;
  const X = (v: number) => (m + (v - x0) * esc).toFixed(1), Y = (v: number) => (m + (y1 - v) * esc).toFixed(1);
  const anel = (r: [number, number][]) => r.map((p, i) => `${i ? 'L' : 'M'}${X(p[0])},${Y(p[1])}`).join('') + 'Z';
  const vis = d.posicoes.filter((x) => mostrar[x.face]);
  const nomeLaje = (id?: string) => b.lajes.find((x) => x.id === id)?.nome ?? id ?? '';
  const usados = new Map<string, number>(); // rótulos no mesmo ponto ficam empilhados
  return (
    <svg className="det det-laje" viewBox={`0 0 ${W} ${H.toFixed(0)}`} role="img" aria-label={`Planta de armação da laje ${d.nome}`} data-detalhe-laje={d.laje} data-posicoes={vis.length} data-total-posicoes={d.posicoes.length}>
      <path d={anel(l.contorno)} className="det-contorno" />
      {(l.furos ?? []).map((f, i) => <path key={i} d={anel(f)} className="det-furo" data-furo={i} />)}
      {d.bordas.map((bd, i) => {
        const P0 = l.contorno[bd.aresta], Q = l.contorno[(bd.aresta + 1) % l.contorno.length], Le = Math.hypot(Q[0] - P0[0], Q[1] - P0[1]) || 1;
        const e = [(Q[0] - P0[0]) / Le, (Q[1] - P0[1]) / Le], A = [P0[0] + e[0] * bd.s0, P0[1] + e[1] * bd.s0], Z = [P0[0] + e[0] * bd.s1, P0[1] + e[1] * bd.s1];
        const mx = (A[0] + Z[0]) / 2, my = (A[1] + Z[1]) / 2;
        return (
          <g key={i} data-borda={bd.tipo}>
            <line x1={X(A[0])} y1={Y(A[1])} x2={X(Z[0])} y2={Y(Z[1])} className={`det-borda ${bd.tipo}`} />
            {bd.tipo === 'continua' && bd.vizinha && <text x={X(mx)} y={(+Y(my) + 3).toFixed(1)} textAnchor="middle" className="det-txt cota">{nomeLaje(bd.vizinha)}</text>}
          </g>
        );
      })}
      {vis.map((x) => {
        const f0 = x.faixa[0], f1 = x.faixa[1], mx = (f0[0] + f1[0]) / 2, my = (f0[1] + f1[1]) / 2;
        const chave = `${mx.toFixed(1)}|${my.toFixed(1)}`, k = usados.get(chave) ?? 0;
        usados.set(chave, k + 1);
        const ponta = (p: [number, number], g: number) => g > 0 && <circle cx={X(p[0])} cy={Y(p[1])} r={3} className={`det-gancho ${x.face}`} />;
        return (
          <g key={x.pos} data-pos={x.pos} data-tipo={x.tipo} data-face={x.face}>
            {(f0[0] !== f1[0] || f0[1] !== f1[1]) && <line x1={X(f0[0])} y1={Y(f0[1])} x2={X(f1[0])} y2={Y(f1[1])} className={`det-faixa ${x.face}`} />}
            <line x1={X(x.a[0])} y1={Y(x.a[1])} x2={X(x.z[0])} y2={Y(x.z[1])} className={`det-barra ${x.face}${x.tipo === 'distribuicao' ? ' distribuicao' : ''}`} />
            {ponta(x.a, x.ganchos[0])}{ponta(x.z, x.ganchos[1])}
            <text x={+X(mx) + 4} y={+Y(my) - 4 + k * 10} className={`det-txt ${x.face}`}>{rotuloPosicaoLaje(x)}</text>
          </g>
        );
      })}
      <text x={W - 8} y={H - 4} textAnchor="end" className="det-txt cota">cotas em m · escala {fmt(esc, 0)} px/m · malha a {fmt(d.angulo, 0)}°</text>
    </svg>
  );
}

// ---------------------------------------------------------------- aba Detalhamento da janela da laje

export function DetalheDaLaje({ id }: { id: string }) {
  const dim = useBuilding((s) => s.dim), b = useBuilding((s) => s.sessao.modelo);
  const [inf, setInf] = useState(true), [sup, setSup] = useState(true);
  const d = dim?.detalhesLajes?.find((x) => x.laje === id);
  if (!d) return <p className="muted">Laje sem detalhamento (só lajes maciças dimensionadas são detalhadas).</p>;
  const nomeLaje = (v?: string) => b.lajes.find((x) => x.id === v)?.nome ?? v ?? '—';
  const nomeViga = (v?: string) => b.vigas.find((x) => x.id === v)?.nome ?? v ?? '—';
  const linhas = linhasPosicoesLaje(d), peso = linhas.reduce((t, x) => t + x.peso, 0);
  return (
    <div data-detalhamento-laje={id}>
      <p className="small">Positivas em malha nas duas direções, negativos sobre as bordas contínuas (diagrama da grelha decalado + ancoragem, com mínimo em % do vão), negativos de borda sem continuidade, distribuição, borda livre, cantos e reforço de furos (NBR 6118, 9.4, 19.3 e 20.1). Cada posição mostra a barra representativa e a linha onde se distribui. {d.repeticoes > 1 ? `A laje se repete em ${d.repeticoes} pavimentos.` : ''}</p>
      <div className="row wrap">
        <Check label="Inferiores (positivas)" checked={inf} onChange={setInf} />
        <Check label="Superiores (negativas)" checked={sup} onChange={setSup} />
      </div>
      <div className="det-leg"><span><i className="inf" />armadura inferior</span><span><i className="sup" />armadura superior</span><span><i className="continua" />borda contínua</span><span><i className="apoiada" />borda apoiada</span><span><i className="livre" />borda livre</span></div>
      <PlantaLaje d={d} mostrar={{ inf, sup }} />
      <h4>Tabela de posições (uma laje)</h4>
      <div className="tablewrap">
        <table className="data quadro" data-tabela-posicoes-laje>
          <thead><tr><th>Pos.</th><th>Face</th><th>Tipo</th><th>Quant.</th><th>φ (mm)</th><th>Espaç. (cm)</th><th>C unit. (m)</th><th>C total (m)</th><th>Peso (kg)</th></tr></thead>
          <tbody>
            {linhas.map((x) => <tr key={x.pos} data-tipo={x.tipo}><td className="tl">{x.pos}</td><td className="tl">{FACE_POS_LAJE[x.face]}</td><td className="tl">{TIPO_POS_LAJE[x.tipo]}{x.vizinha ? ` (com ${nomeLaje(x.vizinha)})` : ''}</td><td className="num">{x.n}</td><td className="num">{fmt(x.phi, x.phi % 1 ? 1 : 0)}</td><td className="num">{x.s > 0 ? fmt(x.s * 100, 0) : '—'}</td><td className="num">{fmt(x.comprimento)}</td><td className="num">{fmt(x.total)}</td><td className="num">{fmt(x.peso)}</td></tr>)}
            <tr><td className="tl" colSpan={8}><b>Total de uma laje</b></td><td className="num"><b>{fmt(peso)}</b></td></tr>
          </tbody>
        </table>
      </div>
      <h4>Armadura positiva: necessária × adotada</h4>
      <div className="tablewrap">
        <table className="data quadro" data-tabela-positivas-laje>
          <thead><tr><th>Direção</th><th>Adotada</th><th>As adotada (cm²/m)</th><th>As necessária (cm²/m)</th><th>Situação</th></tr></thead>
          <tbody>
            {d.positivas.map((p, k) => <tr key={k}><td className="tl">{k === 0 ? 'principal' : 'perpendicular'} ({fmt((d.angulo + 90 * k) % 360, 0)}°){p.secundaria ? ' · secundária' : ''}</td><td className="tl">{phiTxt(p.phi)} c/{fmt(p.s * 100, 0)}</td><td className="num">{fmt(p.As)}</td><td className="num">{fmt(p.AsNec)}</td><td><Pill tone={p.As + 1e-6 >= p.AsNec ? 'ok' : 'bad'}>{p.As + 1e-6 >= p.AsNec ? 'atende' : 'não atende'}</Pill></td></tr>)}
          </tbody>
        </table>
      </div>
      <h4>Bordas</h4>
      <div className="tablewrap">
        <table className="data quadro" data-tabela-bordas-laje>
          <thead><tr><th>Aresta</th><th>Trecho (m)</th><th>Tipo</th><th>Laje vizinha</th><th>Viga</th></tr></thead>
          <tbody>{d.bordas.map((x, i) => <tr key={i}><td className="tl">{x.aresta + 1}</td><td className="num">{fmt(x.s0)} a {fmt(x.s1)}</td><td className="tl">{TIPO_BORDA[x.tipo]}</td><td className="tl">{x.vizinha ? nomeLaje(x.vizinha) : '—'}</td><td className="tl">{x.viga ? nomeViga(x.viga) : '—'}</td></tr>)}</tbody>
        </table>
      </div>
      <h4>Ancoragem e emendas</h4>
      <KV rows={[
        ['lb inferior (boa aderência)', `${fmt(d.lb.inf * 100, 0)} cm`], ['lb superior', `${fmt(d.lb.sup * 100, 0)} cm (${d.lb.supBoaAderencia ? 'boa' : 'má'} aderência)`],
        ['Emendas por traspasse', d.emendas.length ? d.emendas.map((e) => `direção ${e.dir}: l0 = ${fmt(e.l0 * 100, 0)} cm em ${e.linhas} ${e.linhas === 1 ? 'linha' : 'linhas'}`).join('; ') : 'nenhuma'],
        ['Peso de aço (uma laje)', `${fmt(d.peso)} kg`], ['Aço', `${acoDe(b, 'lajeInf').aco} (inferior) / ${acoDe(b, 'lajeSup').aco} (superior)`],
      ]} />
      <h4>Avisos do detalhamento</h4>
      {d.avisos.length === 0 ? <p className="muted small" data-avisos-det>Sem avisos.</p> : (
        <ul className="revmsg" data-avisos-det>{d.avisos.map((m, i) => <li key={i}><Pill tone="warn">DET</Pill> {m}</li>)}</ul>
      )}
    </div>
  );
}
