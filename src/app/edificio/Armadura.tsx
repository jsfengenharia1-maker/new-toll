// Armadura editada e bloqueada (frente R2): editor na janela do elemento, bloqueio em lote e marcadores.
// O recálculo só verifica a armadura bloqueada; "Restaurar calculada" volta ao dimensionamento automático.
import { useState } from 'react';
import { useBuilding } from './store';
import { usePlanta } from './plantaStore';
import { useStore } from '../store';
import { Button, Hint, NumField, Pill, Select } from '../ui';
import { barArea } from '../../core/concrete';
import type { BuildingModel } from '../../core/building/types';
import type { DimEdificio } from './calculo';
import type { ResultadoPilar, ResultadoViga } from '../../core/building/dimensionamento';

export const BITOLAS_LONG = [8, 10, 12.5, 16, 20, 25, 32];
export const BITOLAS_EST = [5, 6.3, 8, 10, 12.5];
const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');
const phiTxt = (p: number) => `φ${String(p).replace('.', ',')}`;
const opts = (xs: number[]) => xs.map((v) => ({ v, label: phiTxt(v) }));
const cm2 = (m2: number) => fmt(m2 * 1e4);
const phiMais = (p: number, xs: number[]) => (xs.includes(p) ? p : xs.reduce((a, c) => (Math.abs(c - p) < Math.abs(a - p) ? c : a), xs[0]));

type Barras = { n: number; phi: number };

/** Texto do arranjo de uma viga dimensionada ou bloqueada (usa os textos do resultado). */
export const arranjoVigaTxt = (v: ResultadoViga) => `inferior ${v.barrasInf} · superior ${v.barrasSup} · estribo ${v.estribo}${v.barrasLaterais !== '—' ? ` · laterais ${v.barrasLaterais}` : ''}`;
export const arranjoPilarTxt = (p: ResultadoPilar) => `${p.armadura} · estribo ${p.estribo}`;

// ---------------------------------------------------------------- comandos de bloqueio

type Cmd = { nome: string; params: Record<string, unknown> };

/** Comandos que bloqueiam o arranjo calculado atual (os já bloqueados e os sem arranjo editável ficam de fora). */
export function comandosBloquear(dim: DimEdificio, ids?: Set<string>): { cmds: Cmd[]; ignorados: number } {
  const cmds: Cmd[] = [];
  let ignorados = 0;
  for (const v of dim.vigas) {
    if (ids && !ids.has(v.viga)) continue;
    if (v.bloqueada) continue;
    const a = v.arranjo;
    if (!a.inf || !a.estribo || a.inf.n > 40 || (a.sup?.n ?? 0) > 40 || (a.laterais?.n ?? 0) > 40) { ignorados++; continue; }
    cmds.push({ nome: 'viga.armadura', params: { id: v.viga, inf: a.inf, ...(a.sup ? { sup: a.sup } : {}), estribo: a.estribo, ...(a.laterais ? { laterais: a.laterais } : {}) } });
  }
  for (const p of dim.pilares) {
    if (ids && !ids.has(p.pilar)) continue;
    if (p.bloqueada) continue;
    const a = p.arranjo;
    if (!a || !p.pavimentoId) { ignorados++; continue; }
    cmds.push({ nome: 'pilar.armadura', params: { id: p.pilar, pavimento: p.pavimentoId, phi: a.phi, ...(a.n !== undefined ? { n: a.n } : { nb: a.nb, nh: a.nh }), estribo: a.estribo } });
  }
  return { cmds, ignorados };
}

/** Armaduras bloqueadas no modelo: vigas e lances de pilar. */
export function contarBloqueios(b: BuildingModel) {
  return { vigas: b.vigas.filter((v) => v.armadura).length, lances: b.pilares.reduce((t, p) => t + (p.armaduras?.length ?? 0), 0) };
}

/** Ids de vigas e pilares com armadura bloqueada (marcador na planta). */
export const idsBloqueados = (b: BuildingModel) => new Set([...b.vigas.filter((v) => v.armadura).map((v) => v.id), ...b.pilares.filter((p) => p.armaduras?.length).map((p) => p.id)]);

/** Executa o comando e recalcula (o dimensionamento mostrado passa a refletir a armadura aplicada). */
export async function executarERecalcular(nome: string, params: Record<string, unknown>) {
  const { exec, calcular } = useBuilding.getState();
  const r = exec(nome, params);
  if (r.ok) await calcular();
  return r.ok;
}

// ---------------------------------------------------------------- bloqueio em lote (aba Dimensionamento)

export function BloqueioLote({ dim, velha }: { dim: DimEdificio | null; velha: boolean }) {
  const b = useBuilding((s) => s.sessao.modelo), calculando = useBuilding((s) => s.calculando);
  const selecao = usePlanta((s) => s.selecao);
  const c = contarBloqueios(b);
  const sel = new Set([...selecao].filter((id) => b.vigas.some((v) => v.id === id) || b.pilares.some((p) => p.id === id)));
  const pode = !!dim && !velha && !calculando;
  const bloquear = async (ids?: Set<string>) => {
    if (!dim) return;
    const { cmds } = comandosBloquear(dim, ids);
    if (!cmds.length) { useStore.getState().set({ message: 'Nada a bloquear: os elementos já estão bloqueados ou não têm arranjo editável.' }); return; }
    await executarERecalcular('lote', { comandos: cmds });
  };
  const desbloquear = async (ids?: Set<string>) => {
    if (ids && !ids.size) return;
    await executarERecalcular('armadura.desbloquear', ids ? { ids: [...ids] } : {});
  };
  return (
    <div data-bloqueio-lote>
      <h4>Armaduras bloqueadas</h4>
      <p className="small" data-bloqueadas>
        <b>{c.vigas}</b> {c.vigas === 1 ? 'viga bloqueada' : 'vigas bloqueadas'} · <b>{c.lances}</b> {c.lances === 1 ? 'lance de pilar bloqueado' : 'lances de pilar bloqueados'}. O recálculo só verifica essas armaduras; as demais são dimensionadas.
      </p>
      <div className="row wrap">
        <Button disabled={!pode || !sel.size} title="Bloqueia o arranjo calculado das vigas e pilares selecionados na planta" onClick={() => bloquear(sel)}>Bloquear selecionados ({sel.size})</Button>
        <Button disabled={!pode} onClick={() => bloquear()}>Bloquear todos</Button>
        <Button disabled={calculando || !sel.size} onClick={() => desbloquear(sel)}>Desbloquear selecionados</Button>
        <Button disabled={calculando || (!c.vigas && !c.lances)} onClick={() => desbloquear()}>Desbloquear todos</Button>
      </div>
      {velha && <Hint>Recalcule antes de bloquear: o arranjo bloqueado é o do último cálculo.</Hint>}
    </div>
  );
}

// ---------------------------------------------------------------- editor de viga

export function EditorArmaduraViga({ v }: { v: ResultadoViga }) {
  const calculando = useBuilding((s) => s.calculando);
  const a = v.arranjo;
  const [inf, setInf] = useState<Barras>(a.inf ?? { n: 2, phi: 12.5 });
  const [sup, setSup] = useState<Barras>(a.sup ?? { n: 0, phi: 10 });
  const [est, setEst] = useState(a.estribo ?? { phi: 5, s: 0.15 });
  const [lat, setLat] = useState<Barras>(a.laterais ?? { n: 0, phi: 10 });
  const area = (x: Barras) => x.n * barArea(x.phi);
  const n = (x: number) => Math.max(0, Math.min(40, Math.round(x)));
  const invalido = inf.n < 1 || est.s < 0.03 || est.s > 0.5;
  const aplicar = () => executarERecalcular('viga.armadura', { id: v.viga, inf, ...(sup.n > 0 ? { sup } : {}), estribo: est, ...(lat.n > 0 ? { laterais: lat } : {}) });
  const linha = (rot: string, x: Barras, set: (y: Barras) => void, minN: number, nec?: string) => (
    <div className="row wrap" data-armadura={rot}>
      <NumField label={`${rot} (nº barras)`} width={130} value={x.n} onChange={(q) => set({ ...x, n: Math.max(minN, n(q)) })} />
      <Select label="Bitola" value={x.phi} options={opts(BITOLAS_LONG)} onChange={(p) => set({ ...x, phi: p })} />
      <span className="small" data-as>{x.n ? `As efetiva ${cm2(area(x))} cm²` : 'sem barras'}{nec ? ` · ${nec}` : ''}</span>
    </div>
  );
  return (
    <section data-editor-armadura="viga">
      <h4>Armadura {v.bloqueada && <Pill tone="warn" data-bloqueada>bloqueada</Pill>}</h4>
      <p className="small">{v.bloqueada ? 'Armadura editada: o recálculo só a verifica (área de aço, estribos, laterais, fissuras e flecha).' : 'Arranjo calculado. Edite e use "Aplicar e bloquear" para fixá-lo; o recálculo passa a verificá-lo, sem redimensionar.'} Vale para todos os vãos e pavimentos do grupo.</p>
      {linha('Inferior', inf, setInf, 1, `necessária ${cm2(v.AsNec[0])} cm²`)}
      {linha('Superior', sup, setSup, 0, `necessária ${cm2(v.AsNec[1])} cm²`)}
      <div className="row wrap" data-armadura="Estribo">
        <Select label="Estribo" value={est.phi} options={opts(BITOLAS_EST)} onChange={(p) => setEst({ ...est, phi: p })} />
        <NumField label="Espaçamento" unit="cm" width={120} value={Math.round(est.s * 1000) / 10} onChange={(q) => setEst({ ...est, s: q / 100 })} />
        <span className="small">{est.s > 0 ? `Asw ${fmt((2 * barArea(est.phi)) / est.s * 1e4)} cm²/m (2 ramos)` : ''}</span>
      </div>
      {linha('Laterais por face', lat, setLat, 0)}
      <div className="row wrap">
        <Button variant="primary" disabled={calculando || invalido} onClick={aplicar}>Aplicar e bloquear</Button>
        <Button disabled={calculando || !v.bloqueada} onClick={() => executarERecalcular('armadura.desbloquear', { ids: [v.viga] })}>Desbloquear</Button>
        <Button disabled={calculando || !v.bloqueada} onClick={() => executarERecalcular('armadura.desbloquear', { ids: [v.viga] })}>Restaurar calculada</Button>
      </div>
      {calculando && <p className="muted small">Recalculando…</p>}
    </section>
  );
}

// ---------------------------------------------------------------- editor de pilar (por lance)

export function EditorArmaduraPilar({ p }: { p: ResultadoPilar }) {
  const calculando = useBuilding((s) => s.calculando);
  const a = p.arranjo;
  const circ = a?.n !== undefined;
  const [phi, setPhi] = useState(a ? phiMais(a.phi, BITOLAS_LONG) : 12.5);
  const [nb, setNb] = useState(a?.nb ?? 3), [nh, setNh] = useState(a?.nh ?? 3), [nc, setNc] = useState(a?.n ?? 8);
  const [est, setEst] = useState(a?.estribo ?? { phi: 5, s: 0.15 });
  if (!a || !p.pavimentoId) return null;
  const nBarras = circ ? nc : 2 * nb + 2 * Math.max(0, nh - 2);
  const As = nBarras * barArea(phi);
  const lim = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(x)));
  const invalido = est.s < 0.03 || est.s > 0.5;
  const aplicar = () => executarERecalcular('pilar.armadura', { id: p.pilar, pavimento: p.pavimentoId, phi, ...(circ ? { n: nc } : { nb, nh }), estribo: est });
  return (
    <div data-editor-armadura="pilar">
      <h5>Armadura do lance {p.bloqueada && <Pill tone="warn" data-bloqueada>bloqueada</Pill>}</h5>
      <p className="small">{p.bloqueada ? 'Armadura editada: o recálculo faz a verificação completa do lance, sem redimensionar.' : 'Arranjo calculado. Edite e use "Aplicar e bloquear" para fixá-lo.'}</p>
      <div className="row wrap">
        <Select label="Bitola longitudinal" value={phi} options={opts(BITOLAS_LONG)} onChange={setPhi} />
        {circ
          ? <NumField label="Nº de barras" width={120} value={nc} onChange={(q) => setNc(lim(q, 4, 40))} />
          : <><NumField label="Barras ao longo de b" width={140} value={nb} onChange={(q) => setNb(lim(q, 2, 20))} /><NumField label="Barras ao longo de h" width={140} value={nh} onChange={(q) => setNh(lim(q, 2, 20))} /></>}
        <span className="small" data-as>{nBarras} {phiTxt(phi)} · As efetiva {cm2(As)} cm²</span>
      </div>
      <div className="row wrap">
        <Select label="Estribo" value={est.phi} options={opts(BITOLAS_EST)} onChange={(q) => setEst({ ...est, phi: q })} />
        <NumField label="Espaçamento" unit="cm" width={120} value={Math.round(est.s * 1000) / 10} onChange={(q) => setEst({ ...est, s: q / 100 })} />
      </div>
      <div className="row wrap">
        <Button variant="primary" disabled={calculando || invalido} onClick={aplicar}>Aplicar e bloquear</Button>
        <Button disabled={calculando || !p.bloqueada} onClick={() => executarERecalcular('armadura.desbloquear', { ids: [p.pilar] })}>Desbloquear</Button>
        <Button disabled={calculando || !p.bloqueada} title="Volta ao dimensionamento automático (todos os lances deste pilar)" onClick={() => executarERecalcular('armadura.desbloquear', { ids: [p.pilar] })}>Restaurar calculada</Button>
      </div>
    </div>
  );
}
