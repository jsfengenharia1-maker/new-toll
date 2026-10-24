// Tubulões a céu aberto (NBR 6122): fuste de concreto simples e base alargada.
// Base pela tensão admissível na cota de apoio (informada ou estimada pelo SPT), altura da base com 60° e rodapé.
// Unidades: kN, m, kPa.
import { sptSigma } from './footings';
import { ceil05 } from './rebar';
import type { Boring, FoundationParams } from './piles';

export interface CaissonInput {
  Nk: number; NkMin: number; Mx: number; My: number; Hx?: number; Hy?: number; boring?: Boring;
  /** Dimensões impostas (m): base Db e fuste Df (opcional); só verificadas (FU3). */
  fixed?: { Db: number; Df?: number };
}

export interface CaissonTry {
  depth: number; Df: number; Db: number; Hcone: number; H: number; rodape: number;
  sigmaAdm: number; spt?: { Nbar: number; Nused: number; from: number; to: number };
  W: number; Nbase: number; sigmaBaseMax: number; volume: number; ok: boolean; reasons: string[];
}

export interface CaissonResult extends CaissonTry {
  messages: string[]; depthMode: 'automática' | 'informada'; sigmaSrc: string;
  sigmaFusteLim: number; sigmaFuste: number; // MPa (cálculo)
  tries: CaissonTry[];
}

export const vol = (Df: number, Db: number, L: number, Hc: number, rod: number) => {
  const base = Db > Df + 1e-9 ? (Math.PI / 12) * Hc * (Db * Db + Db * Df + Df * Df) + (Math.PI * Db * Db * rod) / 4 : 0;
  const fuste = (Math.PI * Df * Df) / 4 * Math.max(0, L - (Db > Df + 1e-9 ? Hc + rod : 0));
  return fuste + base;
};

/** Fuste: γf·Nk/Af ≤ 0,85·fck/γc (concreto simples). */
export function caissonShaft(Nk: number, p: FoundationParams) {
  const lim = (0.85 * p.tbFck) / p.tbGc; // MPa
  const Af = (p.gammaF * Nk) / 1000 / lim;
  const Df = Math.max(p.tbDfMin, ceil05(Math.sqrt((4 * Af) / Math.PI)));
  return { Df, lim, sigma: (p.gammaF * Nk) / 1000 / ((Math.PI * Df * Df) / 4) };
}

export function tryCaisson(inp: CaissonInput, depth: number, p: FoundationParams): CaissonTry {
  const reasons: string[] = [];
  const Df = inp.fixed?.Df ?? caissonShaft(inp.Nk, p).Df;
  const M = Math.hypot(inp.Mx, inp.My);
  const L = depth - p.cutoff;
  const b = inp.boring;
  if (b && b.water !== null && depth > b.water + 1e-9) reasons.push(`base abaixo do nível d'água (${b.water} m): céu aberto exige escavação seca`);
  const sigmaOf = (Db: number) => {
    if (p.tbSigmaMode === 'informada') return { s: p.tbSigmaAdm };
    if (!b) return null;
    const r = sptSigma(b, depth, p.ftBulb * Db, p.tbSptDiv, p.tbNmaxEst);
    return r ? { s: r.sigma, spt: { Nbar: r.Nbar, Nused: r.Nused, from: r.from, to: r.to } } : null;
  };
  let best: CaissonTry | null = null;
  const Dbs = inp.fixed ? [inp.fixed.Db] : null;
  for (let Db = Dbs ? Dbs[0] : Df; Dbs ? Db === Dbs[0] : Db <= p.tbDbMax + 1e-9; Db = Dbs ? NaN : Math.round((Db + 0.05) * 100) / 100) {
    const sg = sigmaOf(Db);
    if (!sg) { reasons.push('sem SPT abaixo da base para estimar σadm'); break; }
    const Hcone = Db > Df + 1e-9 ? 0.866 * (Db - Df) : 0;
    const rodape = Db > Df + 1e-9 ? p.tbRodape : 0;
    const V = vol(Df, Db, L, Hcone, rodape);
    const W = p.tbWeight ? 25 * V : 0;
    const Ab = (Math.PI * Db * Db) / 4;
    const Nbase = inp.Nk + W;
    const sigmaBaseMax = Nbase / Ab + M / ((Math.PI * Db ** 3) / 32);
    if (Nbase / Ab > sg.s + 1e-9 || sigmaBaseMax > p.ftEdgeFactor * sg.s + 1e-6) continue;
    best = { depth, Df, Db, Hcone, H: Hcone + rodape, rodape, sigmaAdm: sg.s, spt: sg.spt, W, Nbase, sigmaBaseMax, volume: V, ok: true, reasons };
    break;
  }
  if (!best) {
    if (!reasons.length) reasons.push(inp.fixed ? `base imposta φ${inp.fixed.Db.toFixed(2)} m não atende σadm na cota ${depth} m` : `base maior que ${p.tbDbMax} m`);
    return { depth, Df, Db: NaN, Hcone: NaN, H: NaN, rodape: p.tbRodape, sigmaAdm: NaN, W: NaN, Nbase: NaN, sigmaBaseMax: NaN, volume: Infinity, ok: false, reasons };
  }
  if (best.H > p.tbHmax + 1e-9) reasons.push(`altura da base ${best.H.toFixed(2)} m > ${p.tbHmax} m`);
  if (L < best.H + 1e-9) reasons.push('profundidade menor que a altura da base');
  best.ok = reasons.length === 0;
  return best;
}

export function designCaisson(inp: CaissonInput, p: FoundationParams): CaissonResult | { ok: false; messages: string[]; tries: CaissonTry[] } {
  const messages: string[] = [];
  if (inp.NkMin < 0) return { ok: false, messages: ['N mín < 0: tubulão de concreto simples não resiste à tração.'], tries: [] };
  const sh0 = caissonShaft(inp.Nk, p);
  const sh = inp.fixed?.Df ? { ...sh0, Df: inp.fixed.Df, sigma: (p.gammaF * inp.Nk) / 1000 / ((Math.PI * inp.fixed.Df ** 2) / 4) } : sh0;
  const sigmaSrc = p.tbSigmaMode === 'informada' ? 'informada' : `estimada pelo SPT: N̄/${p.tbSptDiv} MPa (a confirmar)`;
  let tries: CaissonTry[];
  let mode: CaissonResult['depthMode'];
  if (p.tbDepth > 0) { mode = 'informada'; tries = [tryCaisson(inp, p.tbDepth, p)]; }
  else {
    mode = 'automática';
    const n = inp.boring?.meters.length ?? 0;
    const zmax = Math.min(n - 1, inp.boring?.water != null ? Math.floor(inp.boring.water) : Infinity);
    tries = [];
    for (let z = Math.max(Math.ceil(p.tbMinDepth), Math.ceil(p.cutoff + 1)); z <= zmax; z++) tries.push(tryCaisson(inp, z, p));
    if (p.tbSigmaMode === 'informada' && !tries.length) tries.push(tryCaisson(inp, p.tbMinDepth, p));
  }
  const valid = tries.filter((t) => t.ok).sort((a, b) => a.volume - b.volume || a.depth - b.depth);
  const pick = valid[0];
  if (!pick) return { ok: false, messages: [tries.length ? `Nenhuma cota de apoio atende: ${tries.map((t) => `${t.depth} m — ${t.reasons.join('; ')}`).slice(0, 4).join(' · ')}` : 'Sem cotas possíveis (sondagem curta ou nível d’água raso).'], tries };
  if (pick.spt && pick.spt.Nbar > p.tbNmaxEst) messages.push(`N̄ = ${pick.spt.Nbar.toFixed(1)} limitado a ${p.tbNmaxEst} na estimativa de σadm.`);
  if (Math.hypot(inp.Hx ?? 0, inp.Hy ?? 0) > 0) messages.push('Carga horizontal não verificada (empuxo passivo do fuste não calculado).');
  messages.push('Armadura de ligação no topo do fuste (fretagem/arranque do pilar) não calculada.');
  return { ...pick, messages, depthMode: mode, sigmaSrc, sigmaFusteLim: sh.lim, sigmaFuste: sh.sigma, tries };
}

export const isCaisson = (r: ReturnType<typeof designCaisson>): r is CaissonResult => 'Db' in r && r.ok;
