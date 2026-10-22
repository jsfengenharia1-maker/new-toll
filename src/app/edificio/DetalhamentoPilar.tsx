// Detalhamento dos pilares (frente R3b): elevação do pilar inteiro (lances, níveis, barras com ganchos, emendas, arranques
// e estribos), seção de cada lance, tabelas de barras e estribos, lb por lance e avisos.
import { useState } from 'react';
import { useBuilding } from './store';
import { Button, KV, NumField, Pill } from '../ui';
import { executarERecalcular } from './Armadura';
import { barArea } from '../../core/concrete';
import { cobrimentoPilar } from '../../core/building/materiais';
import { dimsSecao, secaoNoLance, type Pilar } from '../../core/building/types';
import type { BarraPilar, DetalhePilar, LanceDetalhe } from '../../core/building/detalhamentoPilares';
import { modoGrampos, tabelaDe, tabelaPilarNaSecao, type ModoGrampos } from '../../core/building/tabelasArmadura';
import { gramposPorEstribo, posicoesEstribos } from '../../core/building/detalhamentoPilares';
import type { ResultadoPilar } from '../../core/building/dimensionamento';
import { fmt, phiTxt } from './Detalhamento';

const kgM = (phi: number) => barArea(phi) * 7850;
export const TRANSICAO: Record<LanceDetalhe['transicao'], string> = { topo: 'topo (gancho)', continua: 'contínua', emenda: 'emenda por traspasse', dobra: 'dobra na mudança de seção', arranque: 'arranque' };
const rotuloBarra = (x: BarraPilar) => `${x.pos} – ${x.n} ${phiTxt(x.phi)} – C = ${fmt(x.comprimento)}`;

export function linhasBarrasPilar(d: DetalhePilar) {
  return d.barras.map((x) => ({ ...x, total: x.n * x.comprimento, peso: x.n * x.comprimento * kgM(x.phi) }));
}
export function linhasEstribosPilar(d: DetalhePilar) {
  return d.lances.map((l) => {
    const e = l.estribos, peso = e.n * (e.comprimento + e.grampos * e.comprimentoGrampo) * kgM(e.phi);
    return { ...e, nome: l.nome, pavimento: l.pavimento, peso, total: e.n * (e.comprimento + e.grampos * e.comprimentoGrampo) };
  });
}

// ---------------------------------------------------------------- elevação

/** Raias (colunas) das barras: barras que se sobrepõem em cota ficam em raias diferentes, deixando a emenda visível. */
function raias(bs: BarraPilar[]): Map<BarraPilar, number> {
  const fim: number[] = [], m = new Map<BarraPilar, number>();
  for (const b of [...bs].sort((a, z) => a.z0 - z.z0 || a.z1 - z.z1)) {
    let k = fim.findIndex((f) => f < b.z0 - 0.01);
    if (k < 0) { k = fim.length; fim.push(0); }
    fim[k] = b.z1; m.set(b, k);
  }
  return m;
}

/** Trechos de sobreposição entre barras (emendas por traspasse, arranques). */
export function emendasPilar(d: DetalhePilar): { z0: number; z1: number }[] {
  const out = new Map<string, { z0: number; z1: number }>();
  for (let i = 0; i < d.barras.length; i++) for (let j = i + 1; j < d.barras.length; j++) {
    const a = d.barras[i], b = d.barras[j], z0 = Math.max(a.z0, b.z0), z1 = Math.min(a.z1, b.z1);
    if (z1 - z0 > 0.02) out.set(`${z0.toFixed(3)}|${z1.toFixed(3)}`, { z0, z1 });
  }
  return [...out.values()].sort((a, z) => a.z0 - z.z0);
}

function Elevacao({ d, p }: { d: DetalhePilar; p: Pilar }) {
  const W = 960, xL = 190, wC = 120, xR = xL + wC, GANCHO = 9, ml = 8;
  const zMin = Math.min(...d.barras.map((x) => x.z0), d.lances[0].z0) - 0.2, zMax = Math.max(...d.barras.map((x) => x.z1), d.lances.at(-1)!.z1) + 0.25;
  const esc = Math.min(80, 620 / Math.max(zMax - zMin, 0.5)), yT = 22, H = yT + (zMax - zMin) * esc + 22;
  const Y = (z: number) => yT + (zMax - z) * esc;
  const rs = raias(d.barras), nR = Math.max(1, ...[...rs.values()].map((k) => k + 1));
  const passoR = Math.min(14, (wC - 24) / Math.max(nR - 1, 1)), x0R = xL + wC / 2 - ((nR - 1) * passoR) / 2;
  const xBarra = (b: BarraPilar) => x0R + (rs.get(b) ?? 0) * passoR;
  const emendas = emendasPilar(d);
  const nasceFund = p.nasce === 'fundacao';
  // rótulos das barras à direita, sem se sobrepor
  const alvo = d.barras.map((b) => ({ b, y: Y((b.z0 + b.z1) / 2) })).sort((a, z) => a.y - z.y);
  let ult = -1e9;
  const yRot = new Map<BarraPilar, number>();
  for (const a of alvo) { const y = Math.max(a.y, ult + 11); yRot.set(a.b, y); ult = y; }
  return (
    <svg className="det" viewBox={`0 0 ${W} ${Math.max(H, ult + 20)}`} role="img" aria-label="Elevação do pilar" data-detalhe-pilar={d.pilar} data-barras={d.barras.length} data-lances={d.lances.length} data-emendas={emendas.length}>
      {nasceFund && <g data-fundacao>
        <rect x={ml} y={Y(d.lances[0].z0)} width={xR + 40 - ml} height={Math.max(14, (d.lances[0].z0 - zMin) * esc)} className="det-fund" />
        <text x={ml + 2} y={Y(d.lances[0].z0) + 12} className="det-txt cota">Fundação</text>
      </g>}
      {d.lances.map((l, i) => {
        const yA = Y(l.z1), yB = Y(l.z0), ad = l.estribos.ad, px = (ad ? Math.min(ad.s, l.estribos.s) : l.estribos.s) * esc, ticks = px >= 3.5;
        const g = l.estribos.grampos;
        return (
          <g key={l.pavimento} data-lance={l.pavimento}>
            <rect x={xL} y={yA} width={wC} height={yB - yA} className="det-contorno" />
            {ticks
              ? posicoesEstribos(l.z0, l.z1, l.estribos.s, ad).map((z, k) => <line key={k} x1={xL + 3} x2={xR - 3} y1={Y(z)} y2={Y(z)} className="det-fio" />)
              : <rect x={xL + 3} y={yA + 2} width={wC - 6} height={Math.max(1, yB - yA - 4)} className="det-estribo-zona" />}
            <text x={xL - 8} y={(yA + yB) / 2 - 2} textAnchor="end" className="det-txt" data-rotulo-lance={i}>{l.nome} · {l.secao} cm</text>
            <text x={xL - 8} y={(yA + yB) / 2 + 9} textAnchor="end" className="det-txt cota" data-rotulo-estribo={i}>{l.estribos.n} {phiTxt(l.estribos.phi)} c/{Math.round(l.estribos.s * 100)}{ad ? ` (ad. c/${Math.round(ad.s * 100)} em ${Math.round(ad.h * 100)})` : ''}{g > 0 ? ` + ${g} ${g === 1 ? 'grampo' : 'grampos'}` : ''}</text>
          </g>
        );
      })}
      {emendas.map((e, i) => <rect key={i} x={xL} y={Y(e.z1)} width={wC} height={Math.max(2, (e.z1 - e.z0) * esc)} className="det-emenda" data-emenda={i} />)}
      {d.lances.map((l, i) => (
        <g key={`n${l.pavimento}`}>
          <line x1={ml} x2={xR + 40} y1={Y(l.z1)} y2={Y(l.z1)} className="det-nivel" />
          <text x={ml + 2} y={Y(l.z1) - 3} className="det-txt cota" data-nivel={i}>{l.nome} (+{fmt(l.z1)}) · {TRANSICAO[l.transicao]}</text>
        </g>
      ))}
      {d.barras.map((b) => {
        const x = xBarra(b), ya = Y(b.z0), yb = Y(b.z1), yr = yRot.get(b)!;
        const path = `M${(b.ganchos[0] ? x + GANCHO : x).toFixed(1)},${ya.toFixed(1)}L${x.toFixed(1)},${ya.toFixed(1)}L${x.toFixed(1)},${yb.toFixed(1)}L${(b.ganchos[1] ? x + GANCHO : x).toFixed(1)},${yb.toFixed(1)}`;
        return (
          <g key={b.pos} data-barra={b.pos} data-tipo={b.tipo}>
            <path d={path} className={`det-barra ${b.tipo === 'arranque' ? 'arranque' : 'pilar'}`} />
            <line x1={xR} x2={xR + 14} y1={Y((b.z0 + b.z1) / 2)} y2={yr - 3} className="det-cota" />
            <text x={xR + 18} y={yr} className={`det-txt ${b.tipo === 'arranque' ? 'arranque' : 'pilar'}`}>{rotuloBarra(b)}</text>
          </g>
        );
      })}
      <text x={W - 8} y={H - 3} textAnchor="end" className="det-txt cota">cotas em m · escala vertical {fmt(esc, 0)} px/m</text>
    </svg>
  );
}

// ---------------------------------------------------------------- seção transversal de um lance

function SecaoLance({ p, l, r, cob, modo }: { p: Pilar; l: LanceDetalhe; r: ResultadoPilar | undefined; cob: number; modo: ModoGrampos }) {
  const a = r?.arranjo, s = secaoNoLance(p, l.pavimento), [w, h] = dimsSecao(s);
  if (!a) return null;
  const t = l.estribos.phi / 1000, f = a.phi / 1000, ap = cob + t + f / 2;
  const esc = 150 / Math.max(w, h), m = 16, W = w * esc + 2 * m, H = h * esc + 2 * m + 16;
  const P = (v: number) => (m + v * esc).toFixed(1);
  const R = Math.max(2, (f / 2) * esc).toFixed(1);
  const pts: [number, number][] = [], gr: [number, number, number, number][] = [];
  if (s.tipo === 'circ') {
    const n = a.n ?? 6, rr = s.d / 2 - ap;
    for (let i = 0; i < n; i++) pts.push([s.d / 2 + rr * Math.cos((2 * Math.PI * i) / n), s.d / 2 + rr * Math.sin((2 * Math.PI * i) / n)]);
  } else {
    const nb = a.nb ?? 2, nh = a.nh ?? 2, nbS = a.nbS ?? nb, nhD = a.nhD ?? nh, lim = 20 * t;
    const xs = Array.from({ length: nb }, (_, i) => ap + ((w - 2 * ap) * i) / Math.max(nb - 1, 1)), ys = Array.from({ length: nh }, (_, i) => ap + ((h - 2 * ap) * i) / Math.max(nh - 1, 1));
    if (nbS === nb && nhD === nh) {
      xs.forEach((x) => { pts.push([x, ap], [x, h - ap]); });
      ys.slice(1, -1).forEach((y) => { pts.push([ap, y], [w - ap, y]); });
    } else { // arranjo não simétrico: faces opostas com números diferentes de barras
      const xsS = Array.from({ length: nbS }, (_, i) => ap + ((w - 2 * ap) * i) / Math.max(nbS - 1, 1)), ysD = Array.from({ length: nhD }, (_, i) => ap + ((h - 2 * ap) * i) / Math.max(nhD - 1, 1));
      xs.forEach((x) => { pts.push([x, ap]); });
      xsS.forEach((x) => { pts.push([x, h - ap]); });
      ys.slice(1, -1).forEach((y) => { pts.push([ap, y]); });
      ysD.slice(1, -1).forEach((y) => { pts.push([w - ap, y]); });
    }
    const L1 = w - 2 * ap, L2 = h - 2 * ap;
    xs.slice(1, -1).forEach((x, i) => { const d = Math.min(((L1) * (i + 1)) / Math.max(nb - 1, 1), L1 - (L1 * (i + 1)) / Math.max(nb - 1, 1)); if (modo !== 'nenhum' && (modo === 'todas' || d > lim + 1e-9)) gr.push([x, ap, x, h - ap]); });
    ys.slice(1, -1).forEach((y, i) => { const d = Math.min((L2 * (i + 1)) / Math.max(nh - 1, 1), L2 - (L2 * (i + 1)) / Math.max(nh - 1, 1)); if (modo !== 'nenhum' && (modo === 'todas' || d > lim + 1e-9)) gr.push([ap, y, w - ap, y]); });
  }
  const nGr = s.tipo === 'circ' ? 0 : gramposPorEstribo(w, h, ap, a.nb ?? 2, a.nh ?? 2, l.estribos.phi, a.nbS, a.nhD, modo);
  return (
    <figure className="det-fig" data-secao-lance={l.pavimento}>
      <svg className="det det-secao" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Seção do ${l.nome}`} data-barras-secao={pts.length} data-grampos={nGr}>
        {s.tipo === 'circ'
          ? <><circle cx={P(s.d / 2)} cy={P(s.d / 2)} r={(s.d / 2) * esc} className="det-contorno" /><circle cx={P(s.d / 2)} cy={P(s.d / 2)} r={((s.d / 2 - cob) * esc).toFixed(1)} className="det-estribo-sec" /></>
          : <><rect x={m} y={m} width={w * esc} height={h * esc} className="det-contorno" /><rect x={P(cob)} y={P(cob)} width={((w - 2 * cob) * esc).toFixed(1)} height={((h - 2 * cob) * esc).toFixed(1)} rx={3} className="det-estribo-sec" /></>}
        {gr.map((g, i) => <line key={i} x1={P(g[0])} y1={P(g[1])} x2={P(g[2])} y2={P(g[3])} className="det-grampo" />)}
        {pts.map((q, i) => <circle key={i} cx={P(q[0])} cy={P(q[1])} r={R} className="det-pt pilar" />)}
        <text x={m + (w * esc) / 2} y={H - 3} textAnchor="middle" className="det-txt cota">{l.secao} cm</text>
      </svg>
      <figcaption className="small">{l.nome}: {pts.length} {phiTxt(a.phi)}{nGr ? `, ${nGr} ${nGr === 1 ? 'grampo' : 'grampos'}` : ''}</figcaption>
    </figure>
  );
}

// ---------------------------------------------------------------- comprimentos editáveis (R7c)

export interface ComprimentosPilar {
  espera?: number;
  passagens: { pavimento: string; nome: string; transicao: LanceDetalhe['transicao']; emenda: number; ancoragem?: number }[];
}
const arred2 = (x: number) => Math.round(x * 100) / 100;
/** Espera na fundação, traspasse acima de cada topo e ancoragem dos arranques, lidos das barras do detalhamento. */
export function comprimentosPilar(d: DetalhePilar): ComprimentosPilar {
  const primeira = d.barras.find((x) => x.ganchos[0]);
  const out: ComprimentosPilar = { passagens: [] };
  if (primeira) out.espera = arred2(Math.max(0, d.lances[0].z0 - primeira.z0));
  d.lances.forEach((l, k) => {
    if (l.transicao === 'topo' || l.transicao === 'continua') return;
    const topo = l.z1, prox = d.lances[k + 1].pavimento;
    if (l.transicao === 'arranque') {
      const a = d.barras.find((x) => x.tipo === 'arranque' && x.lances[0] === l.pavimento);
      if (a) out.passagens.push({ pavimento: l.pavimento, nome: l.nome, transicao: l.transicao, emenda: arred2(a.z1 - topo), ancoragem: arred2(topo - a.z0) });
      return;
    }
    const zs = d.barras.filter((x) => x.tipo === 'longitudinal' && x.lances.includes(l.pavimento) && !x.lances.includes(prox)).map((x) => x.z1);
    if (zs.length) out.passagens.push({ pavimento: l.pavimento, nome: l.nome, transicao: l.transicao, emenda: arred2(Math.max(...zs) - topo) });
  });
  return out;
}

/** Editor da espera, dos traspasses e das ancoragens de arranque; aplica `pilar.detalhe`. */
export function EdicaoPilar({ d, p }: { d: DetalhePilar; p: Pilar }) {
  const calculando = useBuilding((s) => s.calculando);
  const c0 = comprimentosPilar(d);
  const [esp, setEsp] = useState(c0.espera ?? 0), [pas, setPas] = useState(c0.passagens);
  const chave = JSON.stringify(c0);
  const [vista, setVista] = useState(chave);
  if (vista !== chave) { setVista(chave); setEsp(c0.espera ?? 0); setPas(c0.passagens); } // novo cálculo: recarrega
  const alt = (pav: string, q: Partial<ComprimentosPilar['passagens'][number]>) => setPas((l) => l.map((x) => (x.pavimento === pav ? { ...x, ...q } : x)));
  const mud = pas.filter((x, i) => x.emenda !== c0.passagens[i].emenda || x.ancoragem !== c0.passagens[i].ancoragem);
  const mudEsp = c0.espera !== undefined && esp !== c0.espera;
  const aplicar = () => executarERecalcular('pilar.detalhe', {
    id: p.id, ...(mudEsp ? { espera: esp } : {}),
    ...(mud.length ? { passagens: mud.map((x) => { const o = c0.passagens.find((y) => y.pavimento === x.pavimento)!; return { pavimento: x.pavimento, ...(x.emenda !== o.emenda ? { emenda: x.emenda } : {}), ...(x.ancoragem !== undefined && x.ancoragem !== o.ancoragem ? { ancoragem: x.ancoragem } : {}) }; }) } : {}),
  });
  return (
    <section data-edicao-pilar={p.id}>
      <h4>Editar comprimentos {p.detalhe && <Pill tone="warn" data-detalhe-editado>editado</Pill>}</h4>
      <p className="small">Espera na fundação, traspasse (acima do topo do lance de baixo) e ancoragem das barras novas nos arranques, em m. O recálculo mantém a edição e a confere contra os mínimos (traspasse: % de lb das opções, 15φ e 20 cm; ancoragem: 0,3·lb, 10φ e 10 cm); vale enquanto o número de lances do pilar não mudar.</p>
      <div className="tablewrap">
        <table className="data quadro" data-tabela-edicao-pilar>
          <thead><tr><th>Posição</th><th>Passagem</th><th>Comprimento (m)</th></tr></thead>
          <tbody>
            {c0.espera !== undefined && <tr data-edicao-espera><td className="tl">Espera na fundação</td><td className="tl">abaixo da base</td><td><NumField label="Espera" width={90} value={esp} onChange={(q) => setEsp(Math.max(0.1, Math.min(3, q)))} /></td></tr>}
            {pas.map((x) => (
              <tr key={x.pavimento} data-edicao-passagem={x.pavimento}>
                <td className="tl">Traspasse acima do {x.nome}</td><td className="tl">{TRANSICAO[x.transicao]}</td>
                <td><NumField label={`Traspasse ${x.nome}`} width={90} value={x.emenda} onChange={(q) => alt(x.pavimento, { emenda: Math.max(0.1, Math.min(3, q)) })} /></td>
              </tr>
            ))}
            {pas.filter((x) => x.ancoragem !== undefined).map((x) => (
              <tr key={`a${x.pavimento}`} data-edicao-ancoragem={x.pavimento}>
                <td className="tl">Ancoragem do arranque no {x.nome}</td><td className="tl">abaixo do topo</td>
                <td><NumField label={`Ancoragem ${x.nome}`} width={90} value={x.ancoragem!} onChange={(q) => alt(x.pavimento, { ancoragem: Math.max(0.1, Math.min(3, q)) })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row wrap u-items-end">
        <Button variant="primary" disabled={calculando || (!mud.length && !mudEsp)} onClick={aplicar}>Aplicar edição</Button>
        <Button disabled={calculando || !p.detalhe} onClick={() => executarERecalcular('pilar.detalhe', { id: p.id, remover: true })}>Restaurar calculado</Button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- aba Detalhamento da janela do pilar

export function DetalheDoPilar({ id }: { id: string }) {
  const dim = useBuilding((s) => s.dim), b = useBuilding((s) => s.sessao.modelo);
  const d = dim?.detalhesPilares?.find((x) => x.pilar === id), p = b.pilares.find((x) => x.id === id);
  if (!d || !p) return <p className="muted">Pilar sem detalhamento (não dimensionado).</p>;
  const cob = cobrimentoPilar(b, p.cobrimento), nome = new Map(d.lances.map((l) => [l.pavimento, l.nome]));
  const barras = linhasBarrasPilar(d), est = linhasEstribosPilar(d);
  const pesoBarras = barras.reduce((t, x) => t + x.peso, 0), pesoEst = est.reduce((t, x) => t + x.peso, 0);
  return (
    <div data-detalhamento-pilar={id}>
      <p className="small">Barras longitudinais de baixo para cima: espera na fundação, emendas por traspasse (lb, boa aderência), união de lances curtos, dobra ou arranque na mudança de seção e ancoragem no topo (NBR 6118, 9.4, 9.5 e 18.4); estribos e grampos pelo item 18.2.4. Desenho esquemático com escala vertical por cota.</p>
      <div className="det-leg"><span><i className="pilar" />barras longitudinais</span><span><i className="arranque" />arranques</span><span><i className="emenda" />emenda / sobreposição</span><span><i className="estribo" />estribos</span></div>
      <Elevacao d={d} p={p} />
      <h4>Seção transversal de cada lance</h4>
      <div className="det-secoes">{d.lances.map((l) => {
        const r = dim?.pilares.find((x) => x.pilar === id && x.pavimentoId === l.pavimento), [w, h] = dimsSecao(secaoNoLance(p, l.pavimento));
        return <SecaoLance key={l.pavimento} p={p} l={l} r={r} cob={cob} modo={modoGrampos(tabelaPilarNaSecao(tabelaDe(b, 'pilares', p.tabela), w, h), r?.arranjo?.phi ?? 0, w, h)} />;
      })}</div>
      <h4>Ancoragem</h4>
      <KV rows={[
        ...d.lances.map((l): [string, string] => [`lb – ${l.nome} (boa aderência)`, `${fmt((d.lb[l.pavimento] ?? 0) * 100, 0)} cm`]),
        ['Peso de aço (barras)', `${fmt(pesoBarras)} kg`], ['Peso de aço (estribos e grampos)', `${fmt(pesoEst)} kg`], ['Peso total do pilar', `${fmt(d.peso)} kg`],
      ]} />
      <h4>Tabela de barras</h4>
      <div className="tablewrap">
        <table className="data quadro" data-tabela-barras-pilar>
          <thead><tr><th>Pos.</th><th>Tipo</th><th>Lances</th><th>Quant.</th><th>φ (mm)</th><th>C unit. (m)</th><th>C total (m)</th><th>Peso (kg)</th></tr></thead>
          <tbody>
            {barras.map((x) => <tr key={x.pos}><td className="tl">{x.pos}</td><td className="tl">{x.tipo === 'arranque' ? 'Arranque' : 'Longitudinal'}</td><td className="tl">{x.lances.map((l) => nome.get(l) ?? l).join(', ')}</td><td className="num">{x.n}</td><td className="num">{fmt(x.phi, x.phi % 1 ? 1 : 0)}</td><td className="num">{fmt(x.comprimento)}</td><td className="num">{fmt(x.total)}</td><td className="num">{fmt(x.peso)}</td></tr>)}
            <tr><td className="tl" colSpan={7}><b>Total das barras</b></td><td className="num"><b>{fmt(pesoBarras)}</b></td></tr>
          </tbody>
        </table>
      </div>
      <h4>Estribos e grampos por lance</h4>
      <div className="tablewrap">
        <table className="data quadro" data-tabela-estribos-pilar>
          <thead><tr><th>Lance</th><th>Quant.</th><th>φ (mm)</th><th>s (cm)</th><th>C estribo (m)</th><th>Grampos por estribo</th><th>C grampo (m)</th><th>Peso (kg)</th></tr></thead>
          <tbody>
            {est.map((z) => <tr key={z.pavimento}><td className="tl">{z.nome}</td><td className="num">{z.n}</td><td className="num">{fmt(z.phi, z.phi % 1 ? 1 : 0)}</td><td className="num">{fmt(z.s * 100, 0)}</td><td className="num">{fmt(z.comprimento)}</td><td className="num">{z.grampos}</td><td className="num">{z.grampos ? fmt(z.comprimentoGrampo) : '—'}</td><td className="num">{fmt(z.peso)}</td></tr>)}
            <tr><td className="tl" colSpan={7}><b>Total dos estribos</b></td><td className="num"><b>{fmt(pesoEst)}</b></td></tr>
          </tbody>
        </table>
      </div>
      <EdicaoPilar d={d} p={p} />
      <h4>Avisos do detalhamento</h4>
      {d.avisos.length === 0 ? <p className="muted small" data-avisos-det>Sem avisos.</p> : (
        <ul className="revmsg" data-avisos-det>{d.avisos.map((m, i) => <li key={i}><Pill tone="warn">DET</Pill> {m}</li>)}</ul>
      )}
    </div>
  );
}
