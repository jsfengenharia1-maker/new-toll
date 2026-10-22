// Detalhamento das vigas (frente R3a): elevação e seção esquemáticas, tabela de barras e estribos, resumo de aço
// com perdas, exportação CSV e cópia da armadura bloqueada para outras vigas do grupo.
import { useEffect, useMemo, useState } from 'react';
import { useBuilding } from './store';
import { Button, Check, Hint, KV, NumField, Pill, Select, download } from '../ui';
import { usePlanta } from './plantaStore';
import { motivoTramo } from '../../core/building/detalhamento';
import { COPIA_DIF_VAO, ehModeloPortico, modeloDaViga, motivoCopia, perfilDaViga } from '../../core/building/copiaArmadura';
import { useStore } from '../store';
import { deleteFromLibrary, listLibrary, loadFromLibrary, saveToLibrary, type LibraryItem } from '../storage';
import { opcoesEmUso, perfilDe } from '../../core/building/opcoes';
import type { Viga } from '../../core/building/types';
import { barArea } from '../../core/concrete';
import { cobrimentoViga } from '../../core/building/materiais';
import type { BarraViga, DetalheViga } from '../../core/building/detalhamento';
import type { ResultadoViga } from '../../core/building/dimensionamento';
import type { DimEdificio } from './calculo';
import { BITOLAS_EST, executarERecalcular } from './Armadura';
import { linhasBarrasPilar, linhasEstribosPilar } from './DetalhamentoPilar';
import { FACE_POS_LAJE, linhasPosicoesLaje, TIPO_POS_LAJE } from './DetalhamentoLaje';
import { linhasGruposVigotas } from './Vigotas';

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
  return d.estribos.map((z, i) => ({ ...z, pos: z.suspensao ? `S${d.estribos.slice(0, i).filter((q) => q.suspensao).length + 1}` : `E${i + 1}`, total: z.n * z.comprimento, peso: z.n * z.comprimento * kgM(z.phi) }));
}
const rotuloBarra = (x: BarraViga) => `${x.pos} – ${x.n} ${phiTxt(x.phi)} – C = ${fmt(x.comprimento)}${x.editada ? ' (editada)' : ''}${x.continuaCom ? ' (tramo)' : ''}`;

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

function Elevacao({ d, h, mostrar }: { d: DetalheViga; h: number; mostrar: { inf: boolean; sup: boolean; pele: boolean; estribos: boolean } }) {
  const W = 960, mx = 34, LS = 11, GANCHO = 9;
  const [e0, e1] = d.extensao, Lt = Math.max(e1 - e0, 0.1), esc = (W - 2 * mx) / Lt;
  const X = (s: number) => mx + (s - e0) * esc;
  const inf = mostrar.inf ? d.barras.filter((x) => x.face === 'inf') : [], sup = mostrar.sup ? d.barras.filter((x) => x.face === 'sup') : [], pele = mostrar.pele ? d.barras.filter((x) => x.face === 'pele') : [];
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
      {(mostrar.estribos ? d.estribos : []).map((z, i) => {
        const px = z.s * esc, ticks = px >= 3.5;
        return ticks
          ? <g key={i} data-zona={i}>{Array.from({ length: z.n }, (_, k) => <line key={k} x1={X(z.s0 + k * z.s)} x2={X(z.s0 + k * z.s)} y1={yT + 4} y2={yB - 4} className="det-fio" />)}</g>
          : <rect key={i} x={X(z.s0)} y={yT + 4} width={Math.max(1, (z.s1 - z.s0) * esc)} height={Hb - 8} className="det-estribo-zona" data-zona={i} />;
      })}
      {d.emendas.map((e, i) => <g key={i} data-emenda={i}>
        <rect x={X(e.s - e.l0 / 2)} y={yT} width={Math.max(2, e.l0 * esc)} height={Hb} className="det-emenda" />
        <text x={X(e.s)} y={yT - 3} textAnchor="middle" className="det-txt emenda">emenda l0 = {fmt(e.l0 * 100, 0)} cm</text>
      </g>)}
      {[...inf, ...sup, ...pele].map((x) => {
        const y = yBarra(x), s = x.face === 'sup' ? 1 : -1, x0 = X(x.s0), x1 = X(x.s1);
        const p = `M${x0.toFixed(1)},${(x.ganchos[0] ? y + s * GANCHO : y).toFixed(1)}L${x0.toFixed(1)},${y.toFixed(1)}L${x1.toFixed(1)},${y.toFixed(1)}L${x1.toFixed(1)},${(x.ganchos[1] ? y + s * GANCHO : y).toFixed(1)}`;
        return (
          <g key={x.pos} data-barra={x.pos}>
            <path d={p} className={`det-barra ${x.face}${x.tipo === 'montagem' ? ' montagem' : ''}`} />
            <text x={(x0 + x1) / 2} y={y - 2.5} textAnchor="middle" className={`det-txt ${x.face}`}>{rotuloBarra(x)}</text>
          </g>
        );
      })}
      {mostrar.estribos && d.estribos.map((z, i) => (
        <text key={i} x={(X(z.s0) + X(z.s1)) / 2} y={yB + 34 + (i % 2) * 11} textAnchor="middle" className="det-txt" data-rotulo-estribo={i}>{z.n} {phiTxt(z.phi)} c/{Math.round(z.s * 100)}</text>
      ))}
      <text x={mx} y={yB + 15} className="det-txt cota">Estribos por zona</text>
      {mostrar.estribos && d.estribos.map((z, i) => (
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

// ---------------------------------------------------------------- edição fina do detalhamento (R7b)

type LinhaBarra = { pos: string; s0: number; s1: number; g0: boolean; g1: boolean; perna: number };
type LinhaZona = { zona: number; phi: number; s: number; ramos: number; u: boolean };
const arredM = (x: number) => Math.round(x * 100) / 100;

/** Editor das posições das barras (extremos, ganchos, perna), das zonas de estribos e do fator de emenda; aplica `viga.detalhe`. */
export function EdicaoDetalhe({ d, v }: { d: DetalheViga; v: Viga }) {
  const b = useBuilding((s) => s.sessao.modelo), calculando = useBuilding((s) => s.calculando);
  const op = opcoesEmUso(b.opcoes, perfilDe(b));
  const barras0: LinhaBarra[] = d.barras.map((x) => ({ pos: x.pos, s0: arredM(x.s0), s1: arredM(x.s1), g0: x.ganchos[0], g1: x.ganchos[1], perna: x.perna ?? op.vigaPernaGancho }));
  const zonas0: LinhaZona[] = d.estribos.flatMap((z, i) => (z.suspensao ? [] : [{ zona: i, phi: z.phi, s: z.s, ramos: z.ramos ?? 2, u: !!z.u }]));
  const [barras, setBarras] = useState(barras0), [zonas, setZonas] = useState(zonas0);
  const [fator, setFator] = useState(v.detalhe?.fatorEmenda ?? op.vigaFatorEmenda);
  const chave = JSON.stringify([barras0, zonas0]);
  const [vista, setVista] = useState(chave);
  if (vista !== chave) { setVista(chave); setBarras(barras0); setZonas(zonas0); } // novo cálculo: recarrega as linhas
  const altB = (pos: string, p: Partial<LinhaBarra>) => setBarras((l) => l.map((x) => (x.pos === pos ? { ...x, ...p } : x)));
  const altZ = (zona: number, p: Partial<LinhaZona>) => setZonas((l) => l.map((x) => (x.zona === zona ? { ...x, ...p } : x)));
  const fator0 = v.detalhe?.fatorEmenda ?? op.vigaFatorEmenda;
  const mudB = barras.filter((x, i) => JSON.stringify(x) !== JSON.stringify(barras0[i]));
  const mudZ = zonas.filter((x, i) => JSON.stringify(x) !== JSON.stringify(zonas0[i]));
  const aplicar = async () => {
    const params: Record<string, unknown> = { id: v.id };
    if (mudB.length) params.barras = mudB.map((x) => ({ pos: x.pos, s0: x.s0, s1: x.s1, ganchos: [x.g0, x.g1], perna: x.perna }));
    if (mudZ.length) params.zonas = mudZ.map((x) => ({ zona: x.zona, phi: x.phi, s: x.s, ...(x.ramos !== 2 || d.estribos[x.zona]?.ramos ? { ramos: x.ramos } : {}), ...(x.u !== !!d.estribos[x.zona]?.u ? { u: x.u } : {}) }));
    if (fator !== fator0) params.fatorEmenda = fator;
    await executarERecalcular('viga.detalhe', params);
  };
  const algo = mudB.length > 0 || mudZ.length > 0 || fator !== fator0;
  return (
    <section data-edicao-detalhe={v.id}>
      <h4>Editar detalhamento {v.detalhe && <Pill tone="warn" data-detalhe-editado>editado</Pill>}</h4>
      <p className="small">Muda extremos, ganchos e perna de cada posição e as zonas de estribos. O recálculo mantém a edição e verifica se a armadura cobre a necessária (com ancoragem lb,mín além do corte) e se os estribos atendem; vale enquanto o número de vãos não mudar.</p>
      <div className="tablewrap">
        <table className="data quadro" data-tabela-edicao>
          <thead><tr><th>Pos.</th><th>Início (m)</th><th>Fim (m)</th><th>Gancho ini.</th><th>Gancho fim</th><th>Perna (× φ)</th></tr></thead>
          <tbody>
            {barras.map((x) => (
              <tr key={x.pos} data-edicao-barra={x.pos}>
                <td className="tl">{x.pos}</td>
                <td><NumField label={`${x.pos} início`} width={90} value={x.s0} onChange={(q) => altB(x.pos, { s0: q })} /></td>
                <td><NumField label={`${x.pos} fim`} width={90} value={x.s1} onChange={(q) => altB(x.pos, { s1: q })} /></td>
                <td><Check label="sim" checked={x.g0} onChange={(c) => altB(x.pos, { g0: c })} /></td>
                <td><Check label="sim" checked={x.g1} onChange={(c) => altB(x.pos, { g1: c })} /></td>
                <td><NumField label={`${x.pos} perna`} width={70} value={x.perna} onChange={(q) => altB(x.pos, { perna: Math.max(8, Math.min(20, q)) })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="tablewrap">
        <table className="data quadro" data-tabela-edicao-zonas>
          <thead><tr><th>Zona</th><th>Trecho (m)</th><th>Bitola</th><th>Espaç. (cm)</th><th>Ramos</th><th>Em U</th></tr></thead>
          <tbody>
            {zonas.map((z) => (
              <tr key={z.zona} data-edicao-zona={z.zona}>
                <td className="tl">E{z.zona + 1}</td>
                <td className="tl">{fmt(d.estribos[z.zona]?.s0 ?? 0)} a {fmt(d.estribos[z.zona]?.s1 ?? 0)}</td>
                <td><Select value={z.phi} options={BITOLAS_EST.map((p) => ({ v: p, label: phiTxt(p) }))} onChange={(q) => altZ(z.zona, { phi: q })} /></td>
                <td><NumField label={`E${z.zona + 1} espaçamento`} width={90} value={Math.round(z.s * 1000) / 10} onChange={(q) => altZ(z.zona, { s: q / 100 })} /></td>
                <td><Select value={z.ramos} options={[2, 4, 6].map((r) => ({ v: r, label: String(r) }))} onChange={(q) => altZ(z.zona, { ramos: q })} /></td>
                <td><Check label="U" checked={z.u} onChange={(c) => altZ(z.zona, { u: c })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row wrap u-items-end">
        <NumField label="Fator do comprimento de emenda" unit="×" width={170} value={fator} onChange={(q) => setFator(Math.max(0.5, Math.min(2, q)))} />
        <Button variant="primary" disabled={calculando || !algo} onClick={aplicar}>Aplicar edição</Button>
        <Button disabled={calculando || !v.detalhe} onClick={() => executarERecalcular('viga.detalhe', { id: v.id, remover: true })}>Restaurar calculado</Button>
      </div>
    </section>
  );
}

/** Tramo predefinido: barra inferior passante corrida entre vigas consecutivas e alinhadas. */
export function TramoDaViga({ v }: { v: Viga }) {
  const b = useBuilding((s) => s.sessao.modelo), calculando = useBuilding((s) => s.calculando);
  const doTramo = (b.tramos ?? []).find((t) => t.includes(v.id));
  const nome = (id: string) => b.vigas.find((x) => x.id === id)?.nome ?? id;
  const candidatas = doTramo ? [] : b.vigas.filter((x) => x.id !== v.id && !(b.tramos ?? []).some((t) => t.includes(x.id)) && motivoTramo(b, [v.id, x.id]) === null);
  return (
    <section data-tramo-viga={v.id}>
      <h4>Tramo predefinido</h4>
      {doTramo ? (
        <div className="row wrap u-items-end">
          <span className="small" data-tramo-atual>Tramo: {doTramo.map(nome).join(' + ')} (armadura inferior passante sem emenda nem gancho nos apoios comuns, até a barra máxima).</span>
          <Button disabled={calculando} onClick={() => executarERecalcular('viga.tramo', { ids: doTramo, remover: true })}>Desfazer tramo</Button>
        </div>
      ) : candidatas.length ? (
        <div className="row wrap u-items-end">
          {candidatas.map((x) => <Button key={x.id} disabled={calculando} data-tramo-com={x.id} onClick={() => executarERecalcular('viga.tramo', { ids: [v.id, x.id] })}>Tramo com {x.nome}</Button>)}
        </div>
      ) : <p className="muted small">Não há viga consecutiva e alinhada com esta.</p>}
    </section>
  );
}

// ---------------------------------------------------------------- aba Detalhamento da janela da viga

export function DetalheDaViga({ id }: { id: string }) {
  const dim = useBuilding((s) => s.dim), b = useBuilding((s) => s.sessao.modelo);
  const mostrar = usePlanta((s) => s.detMostrar), setPlanta = usePlanta((s) => s.set);
  const d = dim?.detalhes?.find((x) => x.viga === id), v = b.vigas.find((x) => x.id === id), r = dim?.vigas.find((x) => x.viga === id);
  if (!d || !v) return <p className="muted">Viga sem detalhamento (não dimensionada).</p>;
  const cob = cobrimentoViga(b, v.cobrimento), phiT = (d.estribos[0]?.phi ?? r?.arranjo.estribo?.phi ?? 5);
  const barras = linhasBarras(d), est = linhasEstribos(d);
  const pesoTotal = d.peso * d.repeticoes;
  return (
    <div data-detalhamento={id}>
      <p className="small">Disposição das barras pela envoltória ELU decalada de aℓ, com ancoragem e emendas da NBR 6118 (9.4, 9.5). Desenho esquemático, fora de escala na vertical; comprimentos arredondados para cima e com os ganchos de 90° ({d.repeticoes} {d.repeticoes === 1 ? 'pavimento' : 'pavimentos'} no grupo).</p>
      <div className="det-leg"><span><i className="inf" />armadura inferior</span><span><i className="sup" />armadura superior</span><span><i className="pele" />pele / laterais</span><span><i className="estribo" />estribos</span></div>
      <div className="row wrap" data-mostrar-detalhe>
        <span className="small">Mostrar:</span>
        {([['inf', 'inferior'], ['sup', 'superior'], ['pele', 'pele'], ['estribos', 'estribos'], ['secao', 'seção']] as const).map(([k, rot]) => (
          <Check key={k} label={rot} checked={mostrar[k]} onChange={(c) => setPlanta({ detMostrar: { ...mostrar, [k]: c } })} />
        ))}
      </div>
      <Elevacao d={d} h={v.secao.h} mostrar={mostrar} />
      <div className="det-grade">
        <div>
          <h4>Seção transversal</h4>
          {mostrar.secao ? <Secao d={d} b={v.secao.b} h={v.secao.h} cob={cob} phiT={phiT} /> : <p className="muted small">Seção oculta.</p>}
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
            {barras.map((x) => <tr key={x.pos}><td className="tl">{x.pos}{x.editada ? ' ✎' : ''}</td><td className="tl">{TIPO_BARRA[x.tipo]}{x.continuaCom ? ` (tramo com ${b.vigas.find((q) => q.id === x.continuaCom)?.nome ?? ''})` : ''}</td><td className="tl">{FACE_BARRA[x.face]}</td><td className="num">{x.n}</td><td className="num">{fmt(x.phi, x.phi % 1 ? 1 : 0)}</td><td className="num">{fmt(x.comprimento)}</td><td className="num">{fmt(x.total)}</td><td className="num">{fmt(x.peso)}</td></tr>)}
            {est.map((z) => <tr key={z.pos}><td className="tl">{z.pos}</td><td className="tl">Estribo</td><td className="tl">s = {fmt(z.s0)} a {fmt(z.s1)} m, c/{Math.round(z.s * 100)} cm</td><td className="num">{z.n}</td><td className="num">{fmt(z.phi, z.phi % 1 ? 1 : 0)}</td><td className="num">{fmt(z.comprimento)}</td><td className="num">{fmt(z.total)}</td><td className="num">{fmt(z.peso)}</td></tr>)}
            <tr><td className="tl" colSpan={7}><b>Total de uma viga</b></td><td className="num"><b>{fmt(d.peso)}</b></td></tr>
          </tbody>
        </table>
      </div>
      <TramoDaViga v={v} />
      <EdicaoDetalhe d={d} v={v} />
      <h4>Avisos do detalhamento</h4>
      {d.avisos.length === 0 ? <p className="muted small" data-avisos-det>Sem avisos.</p> : (
        <ul className="revmsg" data-avisos-det>{d.avisos.map((m, i) => <li key={i}><Pill tone="warn">DET</Pill> {m}</li>)}</ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- copiar armadura

/**
 * "Copiar para…" da viga com armadura bloqueada: lista as vigas de todos os grupos, com o motivo quando a cópia não é
 * possível (número de vãos, diferença de vão de 25 cm ou mais, desnível), e guarda o pórtico como modelo na biblioteca.
 */
export function CopiarArmadura({ v }: { v: ResultadoViga }) {
  const b = useBuilding((s) => s.sessao.modelo), calculando = useBuilding((s) => s.calculando);
  const [aberto, setAberto] = useState(false);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const o = b.vigas.find((x) => x.id === v.viga);
  const perfil = useMemo(() => (o ? perfilDaViga(b, o) : null), [b, o]);
  if (!o || !v.bloqueada || !perfil) return null;
  const outras = b.vigas.filter((x) => x.id !== o.id);
  const motivo = (x: (typeof outras)[number]) => motivoCopia(b, perfil, x);
  const grupoDe = (id: string) => b.grupos.find((g) => g.id === id)?.nome ?? id;
  const abrir = () => {
    setMarcadas(new Set(outras.filter((x) => x.grupo === o.grupo && !motivo(x) && x.secao.b === o.secao.b && x.secao.h === o.secao.h).map((x) => x.id)));
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
        <Button disabled={calculando || !outras.length} title="Copia a armadura bloqueada desta viga para outras, do mesmo grupo ou de outros grupos" onClick={() => (aberto ? setAberto(false) : abrir())}>Copiar para…</Button>
        {!outras.length && <span className="muted small">Não há outras vigas.</span>}
        <ModelosPortico o={o} />
      </div>
      {aberto && (
        <div className="card" data-lista-copia>
          <p className="small">Vigas de todos os grupos. Condições da cópia: mesmo número de vãos ({perfil.vaos.length}), diferença menor que {Math.round(COPIA_DIF_VAO * 100)} cm em cada vão e desníveis coincidentes; a armadura e o detalhe editado (comprimentos) vão juntos. Estão marcadas as do mesmo grupo e seção.</p>
          {outras.map((x) => {
            const m = motivo(x);
            return (
              <div key={x.id} className="row wrap" data-destino-copia={x.nome}>
                <Check label={`${x.nome} (${grupoDe(x.grupo)}) — ${Math.round(x.secao.b * 100)}×${Math.round(x.secao.h * 100)} cm${x.armadura ? ' (já bloqueada)' : ''}`} checked={marcadas.has(x.id) && !m}
                  onChange={(on) => { if (m) return; setMarcadas((s) => { const n = new Set(s); if (on) n.add(x.id); else n.delete(x.id); return n; }); }} />
                {m && <span className="hint bad small" data-motivo-copia>{m}</span>}
              </div>
            );
          })}
          <div className="row wrap">
            <Button variant="primary" disabled={calculando || !marcadas.size} onClick={copiar}>Copiar para {marcadas.size} {marcadas.size === 1 ? 'viga' : 'vigas'}</Button>
            <Button onClick={() => setAberto(false)}>Cancelar</Button>
          </div>
          <Hint>A armadura copiada fica bloqueada nas vigas de destino e o recálculo a verifica (pode reprovar onde o esforço for maior; não há aviso de armadura menor que a necessária).</Hint>
        </div>
      )}
    </section>
  );
}

/** Modelos de armadura de pórtico na biblioteca do usuário (reaproveitar em outras obras). */
function ModelosPortico({ o }: { o: Viga }) {
  const b = useBuilding((s) => s.sessao.modelo), calculando = useBuilding((s) => s.calculando);
  const [itens, setItens] = useState<LibraryItem[]>([]);
  const [sel, setSel] = useState('');
  const [msg, setMsg] = useState('');
  const recarregar = () => listLibrary().then((r) => setItens(r.items.filter((i) => i.kind === 'portico'))).catch(() => {});
  useEffect(() => { recarregar(); }, []);
  const gravar = async () => {
    const m = modeloDaViga(b, o);
    if (!m) { setMsg('A viga não tem armadura bloqueada.'); return; }
    try {
      await saveToLibrary('portico', m.nome, `${Math.round(m.secao.b * 100)}×${Math.round(m.secao.h * 100)} · ${m.vaos.length} vão(s) · ${m.armadura.inf.n}φ${m.armadura.inf.phi}`, m);
      setMsg(`Modelo “${m.nome}” gravado na biblioteca.`); recarregar();
    } catch (e) { setMsg((e as Error).message); }
  };
  const aplicar = async () => {
    const e = sel ? await loadFromLibrary(sel) : null;
    if (!e || !ehModeloPortico(e.payload)) { setMsg('Modelo inválido.'); return; }
    const ok = await executarERecalcular('viga.copiarArmadura', { modelo: e.payload, para: [o.id] });
    setMsg(ok ? `Modelo “${e.name}” aplicado a ${o.nome}.` : useStore.getState().message);
  };
  return (
    <details className="small" data-modelos-portico>
      <summary>Modelos de pórtico (biblioteca)</summary>
      <div className="row wrap">
        <Button disabled={calculando} data-modelo-gravar onClick={gravar}>Gravar a armadura desta viga como modelo</Button>
        <Select label="Modelos gravados" value={sel} options={[{ v: '', label: itens.length ? '— escolha —' : '(vazia)' }, ...itens.map((i) => ({ v: i.id, label: `${i.name} · ${i.summary}` }))]} onChange={setSel} />
        <Button disabled={calculando || !sel} onClick={aplicar}>Aplicar a {o.nome}</Button>
        <Button variant="danger" disabled={!sel} onClick={async () => { await deleteFromLibrary(sel); setSel(''); recarregar(); }}>Excluir</Button>
        {msg && <span className="hint">{msg}</span>}
      </div>
      <Hint>O modelo guarda a seção, os vãos, o desnível, a armadura e o detalhe editado; só se aplica a uma viga que atenda às condições da cópia.</Hint>
    </details>
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

/** Resumo de aço e lista de barras (vigas, pilares e lajes; separador ";", vírgula decimal). */
export function csvAco(dim: DimEdificio): string {
  const res = dim.resumoAcoVigas ?? [], resP = dim.resumoAcoPilares ?? [], resPar = dim.resumoAcoParedes ?? [], resL = dim.resumoAcoLajes ?? [], resV = dim.resumoAcoVigotas ?? [], dets = dim.detalhes ?? [], detsP = dim.detalhesPilares ?? [], detsL = dim.detalhesLajes ?? [];
  const cab = (t: string, p: number) => [[t], ['Aço', 'φ (mm)', 'Comprimento (m)', 'Peso (kg)', `Peso com perdas de ${fmt(p, 1)} % (kg)`]];
  const tabela = (t: string, r: LinhaAco[]) => {
    const l = cab(t, perdasDoResumo(r)), tt = totalAco(r);
    for (const x of r) l.push([x.aco, fmt(x.phi, x.phi % 1 ? 1 : 0), fmt(x.comprimento), fmt(x.peso), fmt(x.pesoComPerdas)]);
    l.push(['Total', '', fmt(tt.comprimento), fmt(tt.peso), fmt(tt.pesoComPerdas)], []);
    return l;
  };
  const lin: string[][] = [...tabela('Resumo de aço das vigas', res), ...tabela('Resumo de aço dos pilares', resP), ...tabela('Resumo de aço das paredes e pilares-parede', resPar), ...tabela('Resumo de aço das lajes', resL), ...tabela('Resumo de aço das lajes treliçadas (adicionais, negativos e distribuição)', resV), ...tabela('Resumo geral de aço (vigas, pilares, paredes, lajes e vigotas)', somarResumosAco(res, resP, resPar, resL, resV))];
  if (dim.trelicas?.length) {
    lin.push(['Treliças eletrossoldadas por tipo'], ['Treliça', 'Comprimento (m)', 'Peso (kg)', `Peso com perdas de ${fmt(perdasDoResumo(res), 1)} % (kg)`]);
    for (const t of dim.trelicas) lin.push([t.trelica, fmt(t.comprimento), fmt(t.peso), fmt(t.pesoComPerdas)]);
    lin.push(['Total', fmt(dim.trelicas.reduce((a, t) => a + t.comprimento, 0)), fmt(dim.trelicas.reduce((a, t) => a + t.peso, 0)), fmt(dim.trelicas.reduce((a, t) => a + t.pesoComPerdas, 0))], []);
  }
  if (dim.resumoTelas?.length) {
    lin.push(['Telas soldadas da base das lajes (NBR 7481)'], ['Designação', 'Painéis', 'Área (m²)', 'Peso (kg)', `Peso com perdas de ${fmt(perdasDoResumo(res), 1)} % (kg)`]);
    for (const t of dim.resumoTelas) lin.push([t.designacao, String(t.paineis), fmt(t.area), fmt(t.peso), fmt(t.pesoComPerdas)]);
    lin.push(['Total', String(dim.resumoTelas.reduce((a, t) => a + t.paineis, 0)), fmt(dim.resumoTelas.reduce((a, t) => a + t.area, 0)), fmt(dim.resumoTelas.reduce((a, t) => a + t.peso, 0)), fmt(dim.resumoTelas.reduce((a, t) => a + t.pesoComPerdas, 0))], []);
  }
  if (dim.vigotas?.length) {
    lin.push(['Lajes treliçadas por grupo de igualação (esforços e armadura por nervura)'], ['Laje', 'Grupo', 'Vigotas', 'L (m)', 'Md+ (kN·m)', 'Md− ini (kN·m)', 'Md− fim (kN·m)', 'As nec. (cm²)', 'Adicional', 'Negativo ini', 'Negativo fim', 'Maciço ini (cm)', 'Maciço fim (cm)']);
    for (const r of dim.vigotas) for (const x of linhasGruposVigotas(r)) lin.push([r.nome, `G${x.grupo}`, String(x.vigotas), fmt(x.L), fmt(x.mPos), fmt(x.mNeg[0]), fmt(x.mNeg[1]), fmt(x.AsNec), x.adicional, x.negativos[0], x.negativos[1], fmt(x.macico[0] * 100, 0), fmt(x.macico[1] * 100, 0)]);
    lin.push([]);
  }
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
  lin.push([], ['Lista de posições das lajes'], ['Laje', 'Pos.', 'Face', 'Tipo', 'Quant.', 'φ (mm)', 'Espaç. (cm)', 'C unit. (m)', 'Repetições', 'C total (m)', 'Peso (kg)']);
  for (const d of detsL) for (const x of linhasPosicoesLaje(d)) lin.push([d.nome, x.pos, FACE_POS_LAJE[x.face], TIPO_POS_LAJE[x.tipo], String(x.n), fmt(x.phi, x.phi % 1 ? 1 : 0), x.s > 0 ? fmt(x.s * 100, 0) : '', fmt(x.comprimento), String(d.repeticoes), fmt(x.total * d.repeticoes), fmt(x.peso * d.repeticoes)]);
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
  const res = dim.resumoAcoVigas ?? [], resP = dim.resumoAcoPilares ?? [], resPar = dim.resumoAcoParedes ?? [], resL = dim.resumoAcoLajes ?? [], resV = dim.resumoAcoVigotas ?? [], tre = dim.trelicas ?? [];
  const telas = dim.resumoTelas ?? [];
  if (!res.length && !resP.length && !resPar.length && !resL.length && !resV.length && !telas.length) return null;
  const perdas = perdasDoResumo(somarResumosAco(res, resP, resPar, resL, resV));
  return (
    <div className="card" data-resumo-aco>
      <h3>Resumo de aço</h3>
      <TabelaAco titulo="Vigas" res={res} marca="vigas" />
      <TabelaAco titulo="Pilares" res={resP} marca="pilares" />
      {resPar.length > 0 && <TabelaAco titulo="Paredes e pilares-parede" res={resPar} marca="paredes" />}
      <TabelaAco titulo="Lajes maciças" res={resL} marca="lajes" />
      {resV.length > 0 && <TabelaAco titulo="Lajes treliçadas (adicionais, negativos e distribuição)" res={resV} marca="vigotas" />}
      {tre.length > 0 && (
        <>
          <h4>Treliças eletrossoldadas (por tipo)</h4>
          <div className="tablewrap">
            <table className="data quadro" data-tabela-trelicas>
              <thead><tr><th>Treliça</th><th>Comprimento (m)</th><th>Peso (kg)</th><th>Peso com perdas (kg)</th></tr></thead>
              <tbody>
                {tre.map((t) => <tr key={t.trelica} data-trelica={t.trelica}><td className="tl">{t.trelica}</td><td className="num">{fmt(t.comprimento)}</td><td className="num">{fmt(t.peso)}</td><td className="num">{fmt(t.pesoComPerdas)}</td></tr>)}
                <tr data-total-trelicas><td className="tl"><b>Total</b></td><td className="num"><b>{fmt(tre.reduce((a, t) => a + t.comprimento, 0))}</b></td><td className="num"><b>{fmt(tre.reduce((a, t) => a + t.peso, 0))}</b></td><td className="num"><b>{fmt(tre.reduce((a, t) => a + t.pesoComPerdas, 0))}</b></td></tr>
              </tbody>
            </table>
          </div>
        </>
      )}
      {telas.length > 0 && (
        <>
          <h4>Telas soldadas da base das lajes (NBR 7481, fora do total de barras)</h4>
          <div className="tablewrap">
            <table className="data quadro" data-tabela-telas>
              <thead><tr><th>Designação</th><th>Painéis</th><th>Área (m²)</th><th>Peso (kg)</th><th>Peso com perdas (kg)</th></tr></thead>
              <tbody>
                {telas.map((t) => <tr key={t.designacao} data-tela={t.designacao}><td className="tl">{t.designacao}</td><td className="num">{t.paineis}</td><td className="num">{fmt(t.area)}</td><td className="num">{fmt(t.peso)}</td><td className="num">{fmt(t.pesoComPerdas)}</td></tr>)}
                <tr data-total-telas><td className="tl"><b>Total</b></td><td className="num"><b>{telas.reduce((a, t) => a + t.paineis, 0)}</b></td><td className="num"><b>{fmt(telas.reduce((a, t) => a + t.area, 0))}</b></td><td className="num"><b>{fmt(telas.reduce((a, t) => a + t.peso, 0))}</b></td><td className="num"><b>{fmt(telas.reduce((a, t) => a + t.pesoComPerdas, 0))}</b></td></tr>
              </tbody>
            </table>
          </div>
        </>
      )}
      <TabelaAco titulo="Total geral (vigas, pilares, paredes, lajes e vigotas)" res={somarResumosAco(res, resP, resPar, resL, resV)} marca="geral" />
      <div className="row wrap">
        <Button onClick={() => download('aco-vigas-pilares-lajes.csv', csvAco(dim), 'text/csv')}>Exportar CSV do aço</Button>
      </div>
      <Hint>Comprimentos das vigas já multiplicados pelas repetições dos grupos de pavimentos; pilares pelo lance de cada pavimento; lajes maciças pelas repetições do grupo. Perdas de {fmt(perdas, 1)} % (opção "perdas de aço"). As treliças (peso da geometria, fora do total de barras) vêm em tabela própria. O CSV traz os resumos e a lista de barras e estribos de cada viga e de cada pilar e de posições de cada laje.</Hint>
    </div>
  );
}
