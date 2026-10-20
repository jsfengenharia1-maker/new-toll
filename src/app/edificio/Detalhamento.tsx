// Detalhamento das vigas (frente R3a): elevação e seção esquemáticas, tabela de barras e estribos, resumo de aço
// com perdas, exportação CSV e cópia da armadura bloqueada para outras vigas do grupo.
import { useState } from 'react';
import { useBuilding } from './store';
import { Button, Check, Hint, KV, Pill, download } from '../ui';
import { barArea } from '../../core/concrete';
import { cobrimentoViga } from '../../core/building/materiais';
import type { BarraViga, DetalheViga } from '../../core/building/detalhamento';
import type { ResultadoViga } from '../../core/building/dimensionamento';
import type { DimEdificio } from './calculo';
import { executarERecalcular } from './Armadura';
import { linhasBarrasPilar, linhasEstribosPilar } from './DetalhamentoPilar';

export const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');
const ACO_KG_M3 = 7850;
const kgM = (phi: number) => barArea(phi) * ACO_KG_M3;
export const phiTxt = (p: number) => `φ${String(p).replace('.', ',')}`;
export const TIPO_BARRA: Record<BarraViga['tipo'], string> = { passante: 'Passante', reforço: 'Reforço', negativo: 'Negativo', montagem: 'Montagem', pele: 'Pele' };
export const FACE_BARRA: Record<BarraViga['face'], string> = { inf: 'inferior', sup: 'superior', pele: 'pele' };

/** Linha da tabela de barras: comprimento total e peso de uma viga (um pavimento). */
export function linhasBarras(d: DetalheViga) {
  return d.barras.map((x) => ({ ...x, total: x.n * x.comprimento, peso: x.n * x.comprimento * kgM(x.phi) }));
}
export function linhasEstribos(d: DetalheViga) {
  return d.estribos.map((z, i) => ({ ...z, pos: `E${i + 1}`, total: z.n * z.comprimento, peso: z.n * z.comprimento * kgM(z.phi) }));
}
const rotuloBarra = (x: BarraViga) => `${x.pos} – ${x.n} ${phiTxt(x.phi)} – C = ${fmt(x.comprimento)}`;

// ---------------------------------------------------------------- elevação

/** Atribui a cada barra uma raia (linha) da face, reaproveitando raias onde os trechos não se sobrepõem. */
function raias(bs: BarraViga[]): Map<BarraViga, number> {
  const fim: number[] = [], m = new Map<BarraViga, number>();
  for (const b of [...bs].sort((a, z) => a.s0 - z.s0 || a.s1 - z.s1)) {
    let k = fim.findIndex((f) => f < b.s0 - 0.02);
    if (k < 0) { k = fim.length; fim.push(0); }
    fim[k] = b.s1; m.set(b, k);
  }
  return m;
}

function Elevacao({ d, h }: { d: DetalheViga; h: number }) {
  const W = 960, mx = 34, LS = 11, GANCHO = 9;
  const [e0, e1] = d.extensao, Lt = Math.max(e1 - e0, 0.1), esc = (W - 2 * mx) / Lt;
  const X = (s: number) => mx + (s - e0) * esc;
  const inf = d.barras.filter((x) => x.face === 'inf'), sup = d.barras.filter((x) => x.face === 'sup'), pele = d.barras.filter((x) => x.face === 'pele');
  const rI = raias(inf), rS = raias(sup), rP = raias(pele);
  const nI = Math.max(0, ...rI.values()) + (inf.length ? 1 : 0), nS = Math.max(0, ...rS.values()) + (sup.length ? 1 : 0), nP = Math.max(0, ...rP.values()) + (pele.length ? 1 : 0);
  const Hb = Math.max(120, 15 * (nI + nS + nP) + 44), yT = 48, yB = yT + Hb, yM = (yT + yB) / 2;
  const yBarra = (x: BarraViga) => (x.face === 'inf' ? yB - 12 - (rI.get(x) ?? 0) * LS : x.face === 'sup' ? yT + 12 + (rS.get(x) ?? 0) * LS : yM + ((rP.get(x) ?? 0) - (nP - 1) / 2) * LS);
  const exag = (Hb / Math.max(h, 0.05)) / esc;
  const yCota = yB + 78, H = yCota + 18;
  return (
    <svg className="det" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Elevação da viga" data-detalhe={d.viga} data-barras={d.barras.length} data-estribos={d.estribos.length} data-emendas={d.emendas.length}>
      {d.apoios.map((a) => <rect key={a.pilar} x={X(a.s0)} y={yT - 24} width={Math.max(2, (a.s1 - a.s0) * esc)} height={Hb + 48} className="det-pilar" data-apoio={a.pilar} />)}
      <rect x={X(e0)} y={yT} width={Lt * esc} height={Hb} className="det-contorno" />
      {d.estribos.map((z, i) => {
        const px = z.s * esc, ticks = px >= 3.5;
        return ticks
          ? <g key={i} data-zona={i}>{Array.from({ length: z.n }, (_, k) => <line key={k} x1={X(z.s0 + k * z.s)} x2={X(z.s0 + k * z.s)} y1={yT + 4} y2={yB - 4} className="det-fio" />)}</g>
          : <rect key={i} x={X(z.s0)} y={yT + 4} width={Math.max(1, (z.s1 - z.s0) * esc)} height={Hb - 8} className="det-estribo-zona" data-zona={i} />;
      })}
      {d.emendas.map((e, i) => <g key={i} data-emenda={i}>
        <rect x={X(e.s - e.l0 / 2)} y={yT} width={Math.max(2, e.l0 * esc)} height={Hb} className="det-emenda" />
        <text x={X(e.s)} y={yT - 3} textAnchor="middle" className="det-txt emenda">emenda l0 = {fmt(e.l0 * 100, 0)} cm</text>
      </g>)}
      {d.barras.map((x) => {
        const y = yBarra(x), s = x.face === 'sup' ? 1 : -1, x0 = X(x.s0), x1 = X(x.s1);
        const p = `M${x0.toFixed(1)},${(x.ganchos[0] ? y + s * GANCHO : y).toFixed(1)}L${x0.toFixed(1)},${y.toFixed(1)}L${x1.toFixed(1)},${y.toFixed(1)}L${x1.toFixed(1)},${(x.ganchos[1] ? y + s * GANCHO : y).toFixed(1)}`;
        return (
          <g key={x.pos} data-barra={x.pos}>
            <path d={p} className={`det-barra ${x.face}${x.tipo === 'montagem' ? ' montagem' : ''}`} />
            <text x={(x0 + x1) / 2} y={y - 2.5} textAnchor="middle" className={`det-txt ${x.face}`}>{rotuloBarra(x)}</text>
          </g>
        );
      })}
      {d.estribos.map((z, i) => (
        <text key={i} x={(X(z.s0) + X(z.s1)) / 2} y={yB + 34 + (i % 2) * 11} textAnchor="middle" className="det-txt" data-rotulo-estribo={i}>{z.n} {phiTxt(z.phi)} c/{Math.round(z.s * 100)}</text>
      ))}
      <text x={mx} y={yB + 15} className="det-txt cota">Estribos por zona</text>
      {d.estribos.map((z, i) => (
        <g key={i}>
          <line x1={X(z.s0)} x2={X(z.s1)} y1={yCota - 8} y2={yCota - 8} className="det-cota" />
          <line x1={X(z.s0)} x2={X(z.s0)} y1={yCota - 12} y2={yCota - 4} className="det-cota" />
          <line x1={X(z.s1)} x2={X(z.s1)} y1={yCota - 12} y2={yCota - 4} className="det-cota" />
          <text x={(X(z.s0) + X(z.s1)) / 2} y={yCota + 3} textAnchor="middle" className="det-txt cota">{fmt((z.s1 - z.s0) * 100, 0)}</text>
        </g>
      ))}
      <text x={W - mx} y={H - 3} textAnchor="end" className="det-txt cota">cotas em cm · escala vertical exagerada ×{fmt(exag, 1)}</text>
    </svg>
  );
}

// ---------------------------------------------------------------- seção transversal

function Secao({ d, b, h, cob, phiT }: { d: DetalheViga; b: number; h: number; cob: { inf: number; sup: number; lat: number }; phiT: number }) {
  const ap = d.apoios;
  const sSec = ap.length >= 2 ? (ap[0].s1 + ap[1].s0) / 2 : (d.extensao[0] + d.extensao[1]) / 2;
  const noMeio = d.barras.filter((x) => x.s0 <= sSec && x.s1 >= sSec);
  const esc = 190 / Math.max(h, b), m = 18, wS = b * esc, hS = h * esc, W = wS + 2 * m, H = hS + 2 * m + 18;
  const t = phiT / 1000;
  const lista = (face: BarraViga['face']) => noMeio.filter((x) => x.face === face).flatMap((x) => Array.from({ length: x.n }, () => x.phi / 1000));
  const iL = cob.lat + t, xL = iL, xR = b - iL;
  const camadas = (phis: number[], de: 'inf' | 'sup') => {
    if (!phis.length) return [] as { x: number; y: number; r: number }[];
    const maxPhi = Math.max(...phis), cap = Math.max(1, Math.floor((xR - xL + 0.02) / (maxPhi + 0.02)));
    const out: { x: number; y: number; r: number }[] = [];
    phis.forEach((phi, i) => {
      const k = Math.floor(i / cap), j = i % cap, nLin = Math.min(cap, phis.length - k * cap);
      const xc = nLin === 1 ? (xL + xR) / 2 : xL + phi / 2 + (j * ((xR - xL) - phi)) / (nLin - 1);
      const dist = (de === 'inf' ? cob.inf : cob.sup) + t + phi / 2 + k * (maxPhi + 0.025);
      out.push({ x: xc, y: de === 'inf' ? h - dist : dist, r: phi / 2 });
    });
    return out;
  };
  const pI = camadas(lista('inf'), 'inf'), pS = camadas(lista('sup'), 'sup');
  const peles = lista('pele'), nFace = Math.floor(peles.length / 2);
  const yA = cob.sup + t + 0.03 + (pS.length ? Math.max(...pS.map((c) => c.y - cob.sup)) : 0), yB = h - cob.inf - t - 0.03 - (pI.length ? Math.max(...pI.map((c) => h - cob.inf - c.y)) : 0);
  const pP = Array.from({ length: nFace }, (_, i) => (nFace === 1 ? (yA + yB) / 2 : yA + (i * (yB - yA)) / (nFace - 1)))
    .flatMap((y, i) => [{ x: iL + (peles[i] ?? 0.008) / 2, y, r: (peles[i] ?? 0.008) / 2 }, { x: b - iL - (peles[i] ?? 0.008) / 2, y, r: (peles[i] ?? 0.008) / 2 }]);
  const P = (v: number) => (m + v * esc).toFixed(1);
  const R = (r: number) => Math.max(1.8, r * esc).toFixed(1);
  return (
    <svg className="det det-secao" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Seção transversal da viga" data-secao data-barras-secao={noMeio.reduce((s, x) => s + x.n, 0)}>
      <rect x={m} y={m} width={wS} height={hS} className="det-contorno" />
      <rect x={P(cob.lat)} y={P(cob.sup)} width={((b - 2 * cob.lat) * esc).toFixed(1)} height={((h - cob.sup - cob.inf) * esc).toFixed(1)} rx={4} className="det-estribo-sec" />
      {pS.map((c, i) => <circle key={`s${i}`} cx={P(c.x)} cy={P(c.y)} r={R(c.r)} className="det-pt sup" />)}
      {pI.map((c, i) => <circle key={`i${i}`} cx={P(c.x)} cy={P(c.y)} r={R(c.r)} className="det-pt inf" />)}
      {pP.map((c, i) => <circle key={`p${i}`} cx={P(c.x)} cy={P(c.y)} r={R(c.r)} className="det-pt pele" />)}
      <text x={m + wS / 2} y={H - 4} textAnchor="middle" className="det-txt cota">{fmt(b * 100, 0)} × {fmt(h * 100, 0)} cm · s = {fmt(sSec)} m · cobr. {fmt(cob.inf * 100, 1)} cm</text>
    </svg>
  );
}

// ---------------------------------------------------------------- aba Detalhamento da janela da viga

export function DetalheDaViga({ id }: { id: string }) {
  const dim = useBuilding((s) => s.dim), b = useBuilding((s) => s.sessao.modelo);
  const d = dim?.detalhes?.find((x) => x.viga === id), v = b.vigas.find((x) => x.id === id), r = dim?.vigas.find((x) => x.viga === id);
  if (!d || !v) return <p className="muted">Viga sem detalhamento (não dimensionada).</p>;
  const cob = cobrimentoViga(b, v.cobrimento), phiT = (d.estribos[0]?.phi ?? r?.arranjo.estribo?.phi ?? 5);
  const barras = linhasBarras(d), est = linhasEstribos(d);
  const pesoTotal = d.peso * d.repeticoes;
  return (
    <div data-detalhamento={id}>
      <p className="small">Disposição das barras pela envoltória ELU decalada de aℓ, com ancoragem e emendas da NBR 6118 (9.4, 9.5). Desenho esquemático, fora de escala na vertical; comprimentos arredondados para cima e com os ganchos de 90° ({d.repeticoes} {d.repeticoes === 1 ? 'pavimento' : 'pavimentos'} no grupo).</p>
      <div className="det-leg"><span><i className="inf" />armadura inferior</span><span><i className="sup" />armadura superior</span><span><i className="pele" />pele / laterais</span><span><i className="estribo" />estribos</span></div>
      <Elevacao d={d} h={v.secao.h} />
      <div className="det-grade">
        <div>
          <h4>Seção transversal</h4>
          <Secao d={d} b={v.secao.b} h={v.secao.h} cob={cob} phiT={phiT} />
        </div>
        <div>
          <h4>Ancoragem</h4>
          <KV rows={[
            ['lb inferior (boa aderência)', `${fmt(d.lb.inf * 100, 0)} cm`],
            ['lb superior', `${fmt(d.lb.sup * 100, 0)} cm (${d.lb.supBoaAderencia ? 'boa aderência' : 'má aderência'})`],
            ['Emendas por traspasse', d.emendas.length ? d.emendas.map((e) => `${FACE_BARRA[e.face]} em s = ${fmt(e.s)} m (l0 = ${fmt(e.l0 * 100, 0)} cm)`).join('; ') : 'nenhuma'],
            ['Peso de aço (uma viga)', `${fmt(d.peso)} kg`], ['Peso do grupo', `${fmt(pesoTotal)} kg (× ${d.repeticoes})`],
          ]} />
        </div>
      </div>
      <h4>Tabela de barras</h4>
      <div className="tablewrap">
        <table className="data quadro" data-tabela-barras>
          <thead><tr><th>Pos.</th><th>Tipo</th><th>Face</th><th>Quant.</th><th>φ (mm)</th><th>C unit. (m)</th><th>C total (m)</th><th>Peso (kg)</th></tr></thead>
          <tbody>
            {barras.map((x) => <tr key={x.pos}><td className="tl">{x.pos}</td><td className="tl">{TIPO_BARRA[x.tipo]}</td><td className="tl">{FACE_BARRA[x.face]}</td><td className="num">{x.n}</td><td className="num">{fmt(x.phi, x.phi % 1 ? 1 : 0)}</td><td className="num">{fmt(x.comprimento)}</td><td className="num">{fmt(x.total)}</td><td className="num">{fmt(x.peso)}</td></tr>)}
            {est.map((z) => <tr key={z.pos}><td className="tl">{z.pos}</td><td className="tl">Estribo</td><td className="tl">s = {fmt(z.s0)} a {fmt(z.s1)} m, c/{Math.round(z.s * 100)} cm</td><td className="num">{z.n}</td><td className="num">{fmt(z.phi, z.phi % 1 ? 1 : 0)}</td><td className="num">{fmt(z.comprimento)}</td><td className="num">{fmt(z.total)}</td><td className="num">{fmt(z.peso)}</td></tr>)}
            <tr><td className="tl" colSpan={7}><b>Total de uma viga</b></td><td className="num"><b>{fmt(d.peso)}</b></td></tr>
          </tbody>
        </table>
      </div>
      <h4>Avisos do detalhamento</h4>
      {d.avisos.length === 0 ? <p className="muted small" data-avisos-det>Sem avisos.</p> : (
        <ul className="revmsg" data-avisos-det>{d.avisos.map((m, i) => <li key={i}><Pill tone="warn">DET</Pill> {m}</li>)}</ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- copiar armadura

/** Botão "Copiar para…" da viga com armadura bloqueada: lista as vigas do grupo (mesma seção e nº de vãos pré-marcadas). */
export function CopiarArmadura({ v }: { v: ResultadoViga }) {
  const dim = useBuilding((s) => s.dim), b = useBuilding((s) => s.sessao.modelo), calculando = useBuilding((s) => s.calculando);
  const [aberto, setAberto] = useState(false);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const o = b.vigas.find((x) => x.id === v.viga);
  if (!o || !v.bloqueada) return null;
  const vaos = (id: string) => Math.max(0, (dim?.detalhes?.find((x) => x.viga === id)?.apoios.length ?? 1) - 1);
  const mesma = (x: { secao: { b: number; h: number } }) => Math.abs(x.secao.b - o.secao.b) < 1e-6 && Math.abs(x.secao.h - o.secao.h) < 1e-6;
  const outras = b.vigas.filter((x) => x.grupo === o.grupo && x.id !== o.id);
  const abrir = () => {
    setMarcadas(new Set(outras.filter((x) => mesma(x) && vaos(x.id) === vaos(o.id)).map((x) => x.id)));
    setAberto(true);
  };
  const copiar = async () => {
    if (!marcadas.size) return;
    await executarERecalcular('viga.copiarArmadura', { de: o.id, para: [...marcadas] });
    setAberto(false);
  };
  return (
    <section data-copiar-armadura>
      <div className="row wrap">
        <Button disabled={calculando || !outras.length} title="Copia a armadura bloqueada desta viga para outras do mesmo grupo" onClick={() => (aberto ? setAberto(false) : abrir())}>Copiar para…</Button>
        {!outras.length && <span className="muted small">Não há outras vigas neste grupo.</span>}
      </div>
      {aberto && (
        <div className="card" data-lista-copia>
          <p className="small">Vigas do grupo. Estão marcadas as de mesma seção ({Math.round(o.secao.b * 100)}×{Math.round(o.secao.h * 100)} cm) e mesmo número de vãos ({vaos(o.id)}); as demais exigem conferência.</p>
          {outras.map((x) => (
            <div key={x.id} className="row wrap">
              <Check label={`${x.nome} — ${Math.round(x.secao.b * 100)}×${Math.round(x.secao.h * 100)} cm, ${vaos(x.id)} ${vaos(x.id) === 1 ? 'vão' : 'vãos'}${x.armadura ? ' (já bloqueada)' : ''}`} checked={marcadas.has(x.id)}
                onChange={(on) => setMarcadas((m) => { const n = new Set(m); if (on) n.add(x.id); else n.delete(x.id); return n; })} />
            </div>
          ))}
          <div className="row wrap">
            <Button variant="primary" disabled={calculando || !marcadas.size} onClick={copiar}>Copiar para {marcadas.size} {marcadas.size === 1 ? 'viga' : 'vigas'}</Button>
            <Button onClick={() => setAberto(false)}>Cancelar</Button>
          </div>
          <Hint>A armadura copiada fica bloqueada nas vigas de destino e o recálculo a verifica (pode reprovar onde o esforço for maior).</Hint>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- resumo de aço (aba Dimensionamento) e CSV

const aspas = (x: string) => (/[;"\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x);

export type LinhaAco = { aco: string; phi: number; comprimento: number; peso: number; pesoComPerdas: number };

/** Percentual de perdas do resumo (a partir dos pesos, para não depender das opções). */
export const perdasDoResumo = (r: LinhaAco[]) => {
  const p = r.reduce((s, x) => s + x.peso, 0), q = r.reduce((s, x) => s + x.pesoComPerdas, 0);
  return p > 0 ? Math.round((q / p - 1) * 1000) / 10 : 0;
};

/** Soma resumos de aço (vigas, pilares...) por aço e bitola. */
export function somarResumosAco(...rs: LinhaAco[][]): LinhaAco[] {
  const m = new Map<string, LinhaAco>();
  for (const x of rs.flat()) {
    const k = `${x.aco}|${x.phi}`, e = m.get(k) ?? { aco: x.aco, phi: x.phi, comprimento: 0, peso: 0, pesoComPerdas: 0 };
    e.comprimento += x.comprimento; e.peso += x.peso; e.pesoComPerdas += x.pesoComPerdas; m.set(k, e);
  }
  return [...m.values()].sort((a, z) => a.aco.localeCompare(z.aco) || a.phi - z.phi);
}
const totalAco = (r: LinhaAco[]) => ({ comprimento: r.reduce((s, x) => s + x.comprimento, 0), peso: r.reduce((s, x) => s + x.peso, 0), pesoComPerdas: r.reduce((s, x) => s + x.pesoComPerdas, 0) });

/** Resumo de aço e lista de barras (vigas e pilares; separador ";", vírgula decimal). */
export function csvAco(dim: DimEdificio): string {
  const res = dim.resumoAcoVigas ?? [], resP = dim.resumoAcoPilares ?? [], dets = dim.detalhes ?? [], detsP = dim.detalhesPilares ?? [];
  const cab = (t: string, p: number) => [[t], ['Aço', 'φ (mm)', 'Comprimento (m)', 'Peso (kg)', `Peso com perdas de ${fmt(p, 1)} % (kg)`]];
  const tabela = (t: string, r: LinhaAco[]) => {
    const l = cab(t, perdasDoResumo(r)), tt = totalAco(r);
    for (const x of r) l.push([x.aco, fmt(x.phi, x.phi % 1 ? 1 : 0), fmt(x.comprimento), fmt(x.peso), fmt(x.pesoComPerdas)]);
    l.push(['Total', '', fmt(tt.comprimento), fmt(tt.peso), fmt(tt.pesoComPerdas)], []);
    return l;
  };
  const lin: string[][] = [...tabela('Resumo de aço das vigas', res), ...tabela('Resumo de aço dos pilares', resP), ...tabela('Resumo geral de aço (vigas e pilares)', somarResumosAco(res, resP))];
  lin.push(['Lista de barras'], ['Viga', 'Pos.', 'Tipo', 'Quant.', 'φ (mm)', 'C unit. (m)', 'Repetições', 'C total (m)', 'Peso (kg)']);
  for (const d of dets) {
    for (const x of linhasBarras(d)) lin.push([d.nome, x.pos, TIPO_BARRA[x.tipo], String(x.n), fmt(x.phi, x.phi % 1 ? 1 : 0), fmt(x.comprimento), String(d.repeticoes), fmt(x.total * d.repeticoes), fmt(x.peso * d.repeticoes)]);
    for (const z of linhasEstribos(d)) lin.push([d.nome, z.pos, 'Estribo', String(z.n), fmt(z.phi, z.phi % 1 ? 1 : 0), fmt(z.comprimento), String(d.repeticoes), fmt(z.total * d.repeticoes), fmt(z.peso * d.repeticoes)]);
  }
  lin.push([], ['Lista de barras dos pilares'], ['Pilar', 'Pos.', 'Tipo', 'Quant.', 'φ (mm)', 'C unit. (m)', 'C total (m)', 'Peso (kg)']);
  for (const d of detsP) {
    for (const x of linhasBarrasPilar(d)) lin.push([d.nome, x.pos, x.tipo === 'arranque' ? 'Arranque' : 'Longitudinal', String(x.n), fmt(x.phi, x.phi % 1 ? 1 : 0), fmt(x.comprimento), fmt(x.total), fmt(x.peso)]);
    for (const z of linhasEstribosPilar(d)) lin.push([d.nome, `Estribo ${z.nome}`, z.grampos ? `Estribo + ${z.grampos} grampo(s)` : 'Estribo', String(z.n), fmt(z.phi, z.phi % 1 ? 1 : 0), fmt(z.comprimento), fmt(z.total), fmt(z.peso)]);
  }
  return '﻿' + lin.map((l) => l.map(aspas).join(';')).join('\r\n') + '\r\n';
}

function TabelaAco({ titulo, res, marca }: { titulo: string; res: LinhaAco[]; marca?: string }) {
  const tt = totalAco(res);
  return (
    <>
      <h4>{titulo}</h4>
      <div className="tablewrap">
        <table className="data quadro" data-tabela-aco={marca}>
          <thead><tr><th>Aço</th><th>φ (mm)</th><th>Comprimento (m)</th><th>Peso (kg)</th><th>Peso com perdas (kg)</th></tr></thead>
          <tbody>
            {res.map((x) => <tr key={`${x.aco}-${x.phi}`}><td className="tl">{x.aco}</td><td className="num">{fmt(x.phi, x.phi % 1 ? 1 : 0)}</td><td className="num">{fmt(x.comprimento)}</td><td className="num">{fmt(x.peso)}</td><td className="num">{fmt(x.pesoComPerdas)}</td></tr>)}
            <tr data-total-aco={marca}><td className="tl" colSpan={2}><b>Total</b></td><td className="num"><b>{fmt(tt.comprimento)}</b></td><td className="num"><b>{fmt(tt.peso)}</b></td><td className="num"><b>{fmt(tt.pesoComPerdas)}</b></td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

export function ResumoAco({ dim }: { dim: DimEdificio }) {
  const res = dim.resumoAcoVigas ?? [], resP = dim.resumoAcoPilares ?? [];
  if (!res.length && !resP.length) return null;
  const perdas = perdasDoResumo(somarResumosAco(res, resP));
  return (
    <div className="card" data-resumo-aco>
      <h3>Resumo de aço</h3>
      <TabelaAco titulo="Vigas" res={res} marca="vigas" />
      <TabelaAco titulo="Pilares" res={resP} marca="pilares" />
      <TabelaAco titulo="Total geral (vigas e pilares)" res={somarResumosAco(res, resP)} marca="geral" />
      <div className="row wrap">
        <Button onClick={() => download('aco-vigas-pilares.csv', csvAco(dim), 'text/csv')}>Exportar CSV do aço</Button>
      </div>
      <Hint>Comprimentos das vigas já multiplicados pelas repetições dos grupos de pavimentos; pilares pelo lance de cada pavimento. Perdas de {fmt(perdas, 1)} % (opção "perdas de aço"). O CSV traz os resumos e a lista de barras e estribos de cada viga e de cada pilar.</Hint>
    </div>
  );
}
