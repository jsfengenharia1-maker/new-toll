// Orquestra o dimensionamento: combinações, estabilidade global (γz), barras de concreto e aço, flechas e cargas na fundação.
import { analyze, combine, memberLoads, prepare, solveLoading, type Analysis, type CaseResult } from './solver';
import { comboLoading, pDelta } from './secondorder';
import { designColumnGeneral } from './columnGeneral';
import { elementMatrices, noLoad } from './element';
import { P, matVec, transpose } from './math';
import { caseGroup, exclusiveChoices, nbrCombinations } from './edit';
import {
  CAA_TABLE, ES, barArea, beamAsMin, beamFlexure, beamShear, bransonRatio, chooseBars, concrete, designColumn,
  grossProps, crackWidth, type BarChoice, type BeamSection, type ColumnCombo, type ColumnDesign, type Concrete, type CrackResult, type FlexureResult, type ShearResult,
} from './concrete';
import { designSteel, type SteelCombo, type SteelDesign } from './steel';
import { defaultDesign, type ComboKind, type DesignSettings, type Model } from './types';

export interface NamedCombo { name: string; factors: Record<number, number>; kind: ComboKind; auto?: boolean; windAmp?: number; /** desaprumo: +1 / −1 (sentido de x) ou ausente */ desap?: number }

export interface Imperfection { H: number; n: number; nAuto: number; theta1: number; thetaA: number }
export interface SecondOrderRow { combo: string; amplification: number; iterations: number; converged: boolean; error?: string }

export interface BeamDesign {
  section: BeamSection; d: number; cover: number;
  pos: FlexureResult & { AsMin: number; AsAdopt: number; bars: BarChoice | null; combo: string };
  neg: FlexureResult & { AsMin: number; AsAdopt: number; bars: BarChoice | null; combo: string };
  shear: ShearResult & { combo: string };
  AsTotalRatio: number;
  axialNu: number;
  /** Abertura de fissuras (ELS-W, combinação frequente) nas faces inferior e superior. */
  crack?: { pos: CrackResult & { combo: string; Mk: number }; neg: CrackResult & { combo: string; Mk: number } };
  asColumn?: ColumnDesign;
}

export interface Deflection { f: number; fEl: number; limit: number; ratio: number; Ie?: number; Ic?: number; alphaF?: number; combo: string; cantilever: boolean; after?: { f: number; limit: number; ratio: number } }

export interface MemberDesign {
  id: number; index: number; role: 'beam' | 'column' | 'none'; materialKind: 'concrete' | 'steel' | 'other';
  sectionName: string; materialName: string; L: number; leIn: number; leOut: number;
  status: 'ok' | 'fail' | 'review' | 'na'; util: number; summary: string; messages: string[];
  column?: ColumnDesign; beam?: BeamDesign; steel?: SteelDesign; deflection?: Deflection;
  suggestion?: string; suggestSection?: { b: number; h: number }; NdMax?: number;
  columnShear?: ShearResult & { combo: string; provided: number };
}

export interface FoundationRow {
  nodeId: number;
  perCase: { caseId: number; name: string; R: [number, number, number] }[];
  charMax: [number, number, number]; charMin: [number, number, number];
  /** Soma dos casos permanentes (G), característica. */
  perm: [number, number, number];
  designMax: [number, number, number]; designMin: [number, number, number];
  charComboMaxN: string; designComboMaxN: string;
}

export interface GammaZRow { combo: string; M1: number; dM: number; gz: number }

export interface DesignReport {
  settings: DesignSettings;
  conc: Map<number, Concrete>; // por material
  elu: NamedCombo[]; qp: NamedCombo[]; rare: NamedCombo[];
  autoElu: boolean;
  gammaZ: { rows: GammaZRow[]; max: number; cls: 'fixed' | 'mobile' | 'excessive' | 'none' };
  imperfection: Imperfection | null;
  secondOrder: { mode: 'gammaZ' | 'pdelta'; rows: SecondOrderRow[] };
  /** Resultados das combinações ELU efetivamente usadas (mesma ordem de `elu`). */
  eluResults: (CaseResult | null)[];
  members: MemberDesign[];
  foundation: FoundationRow[];
  warnings: string[];
  ok: boolean;
}

const isELU = (k?: ComboKind, name = '') => (k ? k === 'ELU' : /^ELU/i.test(name) || !/^ELS/i.test(name));

function psi(c: Model['cases'][number], k: 0 | 1 | 2) {
  return c[`psi${k}`] ?? (c.nature === 'W' ? [0.6, 0.3, 0][k] : [0.5, 0.4, 0.3][k]);
}

export function designCombos(model: Model) {
  let elu: NamedCombo[] = model.combinations.filter((c) => isELU(c.kind, c.name)).map((c) => ({ name: c.name, factors: c.factors, kind: 'ELU' as const }));
  const autoElu = elu.length === 0;
  if (autoElu) elu = nbrCombinations(model.cases, 1).filter((c) => c.name.startsWith('ELU')).map((c) => ({ name: c.name, factors: c.factors, kind: 'ELU' as const, auto: true }));
  let qp: NamedCombo[] = model.combinations.filter((c) => c.kind === 'QP' || (!c.kind && /quase/i.test(c.name))).map((c) => ({ name: c.name, factors: c.factors, kind: 'QP' as const }));
  const G = model.cases.filter((c) => (c.nature ?? 'G') === 'G'), Q = model.cases.filter((c) => c.nature === 'Q' || c.nature === 'W');
  if (!qp.length) {
    qp = exclusiveChoices(Q).map((ch, i, all) => {
      const f: Record<number, number> = {};
      G.forEach((c) => (f[c.id] = 1));
      ch.forEach((c) => { const v = psi(c, 2); if (v) f[c.id] = v; });
      return { name: `ELS quase permanente (automática${all.length > 1 ? ` ${i + 1}` : ''})`, factors: f, kind: 'QP' as const, auto: true };
    });
  }
  const rare: NamedCombo[] = [];
  const g1: Record<number, number> = {};
  G.forEach((c) => (g1[c.id] = 1));
  rare.push({ name: 'Rara · só permanentes', factors: { ...g1 }, kind: 'RARA', auto: true });
  for (const p of Q) {
    const same = (c: Model['cases'][number]) => c === p || (!!caseGroup(p) && caseGroup(c) === caseGroup(p));
    const choices = exclusiveChoices(Q, same);
    choices.forEach((ch, i) => {
      const f = { ...g1, [p.id]: 1 };
      ch.forEach((c) => { const v = psi(c, 1); if (v) f[c.id] = v; });
      rare.push({ name: `Rara · ${p.name} principal${choices.length > 1 ? ` (${i + 1})` : ''}`, factors: f, kind: 'RARA', auto: true });
    });
    if (Q.some((c) => !same(c))) rare.push({ name: `Rara · ${p.name} sozinha`, factors: { ...g1, [p.id]: 1 }, kind: 'RARA', auto: true });
  }
  const freq: NamedCombo[] = [];
  for (const p of Q) {
    const same = (c: Model['cases'][number]) => c === p || (!!caseGroup(p) && caseGroup(c) === caseGroup(p));
    exclusiveChoices(Q, same).forEach((ch, i, all) => {
      const f: Record<number, number> = { ...g1, [p.id]: psi(p, 1) };
      ch.forEach((c) => { const v = psi(c, 2); if (v) f[c.id] = v; });
      freq.push({ name: `Frequente · ${p.name}${all.length > 1 ? ` (${i + 1})` : ''}`, factors: f, kind: 'FREQ', auto: true });
    });
  }
  if (!Q.length) freq.push({ name: 'Frequente · só permanentes', factors: { ...g1 }, kind: 'FREQ', auto: true });
  return { elu, qp, rare, freq, autoElu };
}

export function comboResult(a: Analysis, factors: Record<number, number>): CaseResult | null {
  const ids = Object.keys(factors).map(Number).filter((id) => a.cases.has(id) && factors[id] !== 0);
  if (!ids.length) return null;
  return combine(ids.map((id) => a.cases.get(id)!), ids.map((id) => factors[id]));
}

function roleOf(_model: Model, pmAngle: number, role?: string): 'beam' | 'column' | 'none' {
  if (role === 'beam' || role === 'column' || role === 'none') return role;
  return pmAngle > 60 ? 'column' : 'beam';
}

function angleOf(c: number, s: number) {
  const a = (Math.abs(Math.atan2(s, c)) * 180) / Math.PI;
  return a > 90 ? 180 - a : a;
}

/** Cargas nodais equivalentes (globais) de um caso: forças aplicadas + engastamento perfeito das barras. */
function equivalentNodal(a: Analysis, caseId: number): Float64Array {
  const prep = a.prep;
  const F = new Float64Array(prep.ndof);
  for (const ld of prep.model.loads) {
    if (ld.caseId !== caseId || ld.kind !== 'nodal') continue;
    const k = prep.nodeIndex.get(ld.node);
    if (k === undefined) continue;
    F[k * 3] += ld.fx; F[k * 3 + 1] += ld.fy; F[k * 3 + 2] += ld.mz;
  }
  const lds = memberLoads(prep, caseId);
  prep.members.forEach((pm, i) => {
    const l = lds[i];
    if (l.qx.every((x) => x === 0) && l.qy.every((x) => x === 0)) return;
    const em = elementMatrices(pm.props, { ...l, eps0: 0, kap0: 0, mi: 0, mj: 0 }, false, false);
    const fg = matVec(transpose(pm.T), em.f);
    const map = [pm.i * 3, pm.i * 3 + 1, pm.i * 3 + 2, pm.j * 3, pm.j * 3 + 1, pm.j * 3 + 2];
    for (let q = 0; q < 6; q++) F[map[q]] -= fg[q];
  });
  return F;
}

/** Desaprumo global: θ1 = 1/(100√H), 1/300 ≤ θ1 ≤ 1/200; θa = θ1·√((1 + 1/n)/2) (11.3.3.4.1). */
export function imperfectionOf(model: Model, settings: DesignSettings): Imperfection | null {
  if (settings.imperfection === false || !model.nodes.length) return null;
  const ys = model.nodes.map((n) => n.y);
  const H = Math.max(...ys) - Math.min(...ys);
  if (H < 1e-6) return null;
  const sup = new Set(model.nodes.filter((n) => n.support).map((n) => n.id));
  const nAuto = model.members.filter((m) => {
    const a = model.nodes.find((n) => n.id === m.ni), b = model.nodes.find((n) => n.id === m.nj);
    return !!a && !!b && roleOf(model, angleOf(b.x - a.x, b.y - a.y), m.role) === 'column' && (sup.has(m.ni) || sup.has(m.nj));
  }).length;
  const n = Math.max(1, Math.round(settings.imperfectionColumns ?? nAuto) || 1);
  const theta1 = Math.min(1 / 200, Math.max(1 / 300, 1 / (100 * Math.sqrt(H))));
  return { H, n, nAuto, theta1, thetaA: theta1 * Math.sqrt((1 + 1 / n) / 2) };
}

/** Resultados unitários do desaprumo por caso (+x): forças θa·V nos nós, V = carga vertical equivalente do caso. */
function desapResults(a: Analysis, model: Model, thetaA: number, eq: Map<number, Float64Array>): Map<number, CaseResult> {
  const out = new Map<number, CaseResult>();
  if (!a.prep.lu) return out;
  const zero = a.prep.members.map(() => noLoad());
  for (const c of model.cases) {
    const F = eq.get(c.id);
    if (!F) continue;
    const nodal = new Float64Array(a.prep.ndof);
    let any = false;
    for (let k = 0; k * 3 < nodal.length; k++) { const V = -F[k * 3 + 1]; if (V) { nodal[k * 3] = thetaA * V; any = true; } }
    if (any) out.set(c.id, solveLoading(a.prep, zero, nodal, null));
  }
  return out;
}

/** Resultado de uma combinação ELU incluindo o desaprumo (superposição dos resultados unitários por caso). */
export function comboResultWith(a: Analysis, cb: NamedCombo, desap: Map<number, CaseResult>): CaseResult | null {
  const base = comboResult(a, cb.factors);
  if (!base || !cb.desap) return base;
  const list: CaseResult[] = [base], fs: number[] = [1];
  for (const [id, f] of Object.entries(cb.factors)) { const d = desap.get(+id); if (d && f) { list.push(d); fs.push(f * cb.desap); } }
  return combine(list, fs);
}

/**
 * Aplica o desaprumo às combinações ELU pela regra do vento (11.3.3.4.1): se 30% da ação do vento supera
 * o desaprumo, só vento; se o vento é menor que 30% do desaprumo, só desaprumo; senão, ambos no mesmo sentido.
 * Sem vento, o desaprumo entra nos dois sentidos. A comparação usa o momento de tombamento na base.
 */
function withImperfection(model: Model, elu: NamedCombo[], imp: Imperfection, eq: Map<number, Float64Array>): NamedCombo[] {
  const ybase = Math.min(...model.nodes.map((n) => n.y));
  const momentOf = (caseId: number, horizontal: boolean) => {
    const F = eq.get(caseId);
    if (!F) return 0;
    let m = 0;
    model.nodes.forEach((n, k) => { m += (horizontal ? F[k * 3] : imp.thetaA * -F[k * 3 + 1]) * (n.y - ybase); });
    return m;
  };
  const out: NamedCombo[] = [];
  for (const cb of elu) {
    let Mw = 0, Md = 0, hasW = false;
    for (const [id, f] of Object.entries(cb.factors)) {
      const c = model.cases.find((x) => x.id === +id);
      if (!c || !f) continue;
      Md += f * momentOf(c.id, false);
      if (c.nature === 'W') { hasW = true; Mw += f * momentOf(c.id, true); }
    }
    Md = Math.abs(Md);
    if (Md < 1e-9) { out.push(cb); continue; }
    if (!hasW || Math.abs(Mw) < 1e-9) {
      out.push({ ...cb, name: `${cb.name} · desaprumo +x`, desap: 1 }, { ...cb, name: `${cb.name} · desaprumo −x`, desap: -1 });
      continue;
    }
    const sign = Math.sign(Mw);
    if (0.3 * Math.abs(Mw) >= Md) out.push(cb);
    else if (Math.abs(Mw) < 0.3 * Md) {
      const f = { ...cb.factors };
      for (const c of model.cases) if (c.nature === 'W') delete f[c.id];
      out.push({ ...cb, name: `${cb.name} · só desaprumo (vento < 30%)`, factors: f, desap: sign });
    } else out.push({ ...cb, name: `${cb.name} + desaprumo`, desap: sign });
  }
  return out;
}

function reducedStiffness(model: Model, modulus: 'Eci' | 'Ecs') {
  return (m: Model['members'][number], ang: number) => {
    const mat = model.materials.find((x) => x.id === m.material);
    if (mat?.kind === 'steel') return 0.8;
    const isConc = mat?.kind === 'concrete' || (!mat?.kind && !!mat?.fck);
    const toEci = isConc && modulus === 'Eci' && mat?.fck ? (concrete(mat.fck).Eci * 1000) / mat.E : 1;
    return (roleOf(model, ang, m.role) === 'column' ? 0.8 : 0.4) * toEci;
  };
}

function gammaZ(model: Model, elu: NamedCombo[], modulus: 'Eci' | 'Ecs', imp: Imperfection | null, eq: Map<number, Float64Array>): DesignReport['gammaZ'] {
  const red = analyze(model, { eiFactor: reducedStiffness(model, modulus) });
  if (red.prep.error) return { rows: [], max: 0, cls: 'none' };
  const desap = imp ? desapResults(red, model, imp.thetaA, eq) : new Map<number, CaseResult>();
  const ybase = Math.min(...model.nodes.filter((n) => n.support).map((n) => n.y), ...model.nodes.map((n) => n.y));
  const rows: GammaZRow[] = [];
  for (const cb of elu) {
    const r = comboResultWith(red, cb, desap);
    if (!r) continue;
    let M1 = 0, dM = 0, Hsum = 0;
    model.nodes.forEach((n, k) => {
      let H = 0, V = 0;
      for (const [id, f] of Object.entries(cb.factors)) { const F = eq.get(+id); if (F) { H += f * F[k * 3]; V += f * F[k * 3 + 1]; } }
      if (cb.desap && imp) H += cb.desap * imp.thetaA * -V;
      Hsum += Math.abs(H);
      M1 += H * (n.y - ybase);
      dM += -V * r.u[k * 3];
    });
    if (Hsum < 1e-6 || Math.abs(M1) < 1e-6) continue;
    const ratio = dM / M1;
    rows.push({ combo: cb.name, M1, dM, gz: ratio < 1 ? 1 / (1 - ratio) : Infinity });
  }
  const max = rows.reduce((m, r) => Math.max(m, r.gz), 0);
  return { rows, max, cls: !rows.length ? 'none' : max <= 1.1 ? 'fixed' : max <= 1.3 ? 'mobile' : 'excessive' };
}

/** Δξ = ξ(∞) − ξ(t0), com ξ(t) = 0,68·0,996^t·t^0,32 para t ≤ 70 meses e 2 acima (NBR 6118, 17.3.2.1.2). */
export function deltaXi(t0: number) {
  const xi = (t: number) => (t > 70 ? 2 : 0.68 * 0.996 ** t * t ** 0.32);
  return 2 - xi(Math.max(0, t0));
}

function sampleXs(L: number, polys: number[][]) {
  const xs = new Set<number>();
  for (let q = 0; q <= 20; q++) xs.add((L * q) / 20);
  for (const p of polys) for (const x of P.rootsIn(P.derive(p), 0, L)) xs.add(x);
  return [...xs].sort((p, q) => p - q);
}

export function runDesign(model: Model, a: Analysis): DesignReport {
  const settings = { ...defaultDesign(), ...(model.design ?? {}) };
  const warnings: string[] = [];
  const { elu: elu0, qp, rare, freq, autoElu } = designCombos(model);
  const empty: DesignReport = { settings, conc: new Map(), elu: elu0, qp, rare, autoElu, gammaZ: { rows: [], max: 0, cls: 'none' }, imperfection: null, secondOrder: { mode: settings.secondOrder ?? 'gammaZ', rows: [] }, eluResults: [], members: [], foundation: [], warnings, ok: false };
  if (a.prep.error) { warnings.push(a.prep.error); return empty; }
  if (autoElu) warnings.push('Nenhuma combinação ELU no modelo: usadas combinações NBR 8681 geradas automaticamente pela natureza dos casos.');

  // estabilidade global: desaprumo, γz e (opcional) P-Δ
  const modulus = settings.gammaZModulus ?? 'Eci';
  const mode = settings.secondOrder ?? 'gammaZ';
  const eq = new Map(model.cases.map((c) => [c.id, equivalentNodal(a, c.id)]));
  const imp = imperfectionOf(model, settings);
  const elu1 = imp ? withImperfection(model, elu0, imp, eq) : elu0;
  if (imp) warnings.push(`Desaprumo global θa = 1/${Math.round(1 / imp.thetaA)} (H = ${imp.H.toFixed(2)} m, n = ${imp.n} prumadas) nas combinações ELU (NBR 6118, 11.3.3.4.1).`);
  const gz = gammaZ(model, elu1, modulus, imp, eq);
  let elu = elu1;
  const soRows: SecondOrderRow[] = [];
  let eluResults: (CaseResult | null)[];
  if (mode === 'pdelta') {
    const red = prepare(model, { eiFactor: reducedStiffness(model, modulus) });
    eluResults = elu.map((cb) => {
      if (red.error) return null;
      let extra: Float64Array | undefined;
      if (cb.desap && imp) {
        extra = new Float64Array(red.ndof);
        for (const [id, f] of Object.entries(cb.factors)) { const F = eq.get(+id); if (F) for (let k = 0; k * 3 < extra.length; k++) extra[k * 3] += cb.desap * f * imp.thetaA * -F[k * 3 + 1]; }
      }
      const r = pDelta(red, comboLoading(red, cb.factors, extra));
      soRows.push({ combo: cb.name, amplification: r.amplification, iterations: r.iterations, converged: r.converged, error: r.error });
      return r.result;
    });
    const bad = soRows.filter((r) => !r.converged);
    warnings.push(`Efeitos globais de 2ª ordem por análise P-Δ (matriz geométrica, rigidez reduzida 0,4/0,8·${modulus}·Ic). Amplificação máxima dos deslocamentos horizontais: ${Math.max(1, ...soRows.map((r) => (Number.isFinite(r.amplification) ? r.amplification : 1))).toFixed(3)}.`);
    if (bad.length) warnings.push(`P-Δ sem convergência em ${bad.length} combinação(ões): ${bad[0].error ?? ''}`);
  } else {
    if (gz.cls === 'mobile') {
      elu = elu1.map((cb) => {
        const row = gz.rows.find((r) => r.combo === cb.name);
        if (!row || row.gz <= 1.1) return cb;
        const amp = 0.95 * row.gz;
        const f = { ...cb.factors };
        for (const c of model.cases) if (c.nature === 'W' && f[c.id]) f[c.id] *= amp;
        return { ...cb, factors: f, windAmp: amp };
      });
      warnings.push(`γz = ${gz.max.toFixed(3)}: estrutura de nós móveis. Ações de vento majoradas por 0,95·γz nas combinações ELU (NBR 6118, 15.7.2).`);
    } else if (gz.cls === 'excessive') warnings.push(`γz = ${gz.max.toFixed(3)} > 1,3: deslocabilidade excessiva. Use a análise P-Δ (Dimensionar › Efeitos de 2ª ordem) ou enrijeça a estrutura.`);
    const desap = imp ? desapResults(a, model, imp.thetaA, eq) : new Map<number, CaseResult>();
    eluResults = elu.map((cb) => comboResultWith(a, cb, desap));
  }

  const eluRes = elu.map((cb, i) => ({ cb, r: eluResults[i] })).filter((x) => x.r) as { cb: NamedCombo; r: CaseResult }[];
  const qpRes = qp.map((cb) => ({ cb, r: comboResult(a, cb.factors) })).filter((x) => x.r) as { cb: NamedCombo; r: CaseResult }[];
  const rareRes = rare.map((cb) => ({ cb, r: comboResult(a, cb.factors) })).filter((x) => x.r) as { cb: NamedCombo; r: CaseResult }[];
  const freqRes = freq.map((cb) => ({ cb, r: comboResult(a, cb.factors) })).filter((x) => x.r) as { cb: NamedCombo; r: CaseResult }[];

  // cargas transversais por caso/barra
  const transverseByCase = new Map(model.cases.map((c) => [c.id, memberLoads(a.prep, c.id).map((l) => l.qy.some((x) => Math.abs(x) > 1e-12) || l.mi !== 0 || l.mj !== 0)]));
  const transverse = (cb: NamedCombo, k: number) => Object.entries(cb.factors).some(([id, f]) => f !== 0 && transverseByCase.get(+id)?.[k]);

  const conc = new Map<number, Concrete>();
  const caa = CAA_TABLE[settings.caa];
  const fyd = settings.fyk / settings.gammaS;
  const connectivity = new Map<number, number>();
  for (const m of model.members) { connectivity.set(m.ni, (connectivity.get(m.ni) ?? 0) + 1); connectivity.set(m.nj, (connectivity.get(m.nj) ?? 0) + 1); }

  const members: MemberDesign[] = a.prep.members.map((pm) => {
    const mem = model.members.find((m) => m.id === pm.id)!;
    const mat = model.materials.find((m) => m.id === mem.material)!;
    const sec = model.sections.find((s) => s.id === mem.section)!;
    const materialKind = mat.kind ?? (mat.fck ? 'concrete' : mat.fy ? 'steel' : mat.E < 60e6 ? 'concrete' : 'steel');
    const role = mem.rigid === 'full' ? 'none' : roleOf(model, angleOf(pm.c, pm.s), mem.role);
    const leIn = mem.leIn ?? pm.L, leOut = mem.leOut ?? pm.L;
    const base: MemberDesign = { id: pm.id, index: pm.index, role, materialKind, sectionName: sec.name, materialName: mat.name, L: pm.L, leIn, leOut, status: 'na', util: 0, summary: '', messages: [] };
    if (role === 'none') { base.summary = 'Não dimensionada'; return base; }
    const k = pm.index;
    const freeEnd = (nid: number) => { const n = model.nodes.find((x) => x.id === nid)!; return !n.support && (connectivity.get(nid) ?? 0) === 1; };
    const cantilever = freeEnd(mem.ni) || freeEnd(mem.nj);

    // flecha elástica relativa à corda (ou total na ponta do balanço)
    const deflOf = (r: CaseResult) => {
      const m = r.members[k];
      const v0 = P.evaluate(m.v, 0), vL = P.evaluate(m.v, pm.L);
      let f = 0;
      for (let q = 0; q <= 40; q++) {
        const x = (pm.L * q) / 40, v = P.evaluate(m.v, x);
        const rel = cantilever ? (freeEnd(mem.nj) ? v - v0 : v - vL) : v - (v0 + ((vL - v0) * x) / pm.L);
        f = Math.max(f, Math.abs(rel));
      }
      return f;
    };

    if (materialKind === 'steel') {
      const fy = mat.fy ?? 345;
      const combos: SteelCombo[] = eluRes.map(({ cb, r }) => {
        const m = r.members[k];
        const xs = sampleXs(pm.L, [m.M]);
        let Mmax = 0, V = 0;
        for (const x of xs) { Mmax = Math.max(Mmax, Math.abs(P.evaluate(m.M, x))); V = Math.max(V, Math.abs(P.evaluate(m.V, x))); }
        const N = Math.min(P.evaluate(m.N, 0), P.evaluate(m.N, pm.L)) < 0 ? Math.min(P.evaluate(m.N, 0), P.evaluate(m.N, pm.L)) : Math.max(P.evaluate(m.N, 0), P.evaluate(m.N, pm.L));
        return { name: cb.name, N, Mmax, MA: P.evaluate(m.M, pm.L / 4), MB: P.evaluate(m.M, pm.L / 2), MC: P.evaluate(m.M, (3 * pm.L) / 4), Mend0: P.evaluate(m.M, 0), MendL: P.evaluate(m.M, pm.L), V, transverse: transverse(cb, k) };
      });
      const sd = designSteel({ shape: sec.shape, fy, gammaA1: settings.gammaA1, L: pm.L, leIn, leOut, combos });
      const out: MemberDesign = { ...base, steel: sd, status: sd.status, util: sd.util, messages: [...sd.messages] };
      if (role === 'beam' && rareRes.length) {
        let best = { f: 0, combo: '' };
        for (const { cb, r } of rareRes) { const f = deflOf(r); if (f > best.f) best = { f, combo: cb.name }; }
        const limit = (cantilever ? 2 * pm.L : pm.L) / 250;
        out.deflection = { f: best.f, fEl: best.f, limit, ratio: best.f / limit, combo: best.combo, cantilever };
        out.util = Math.max(out.util, out.deflection.ratio);
        if (out.deflection.ratio > 1) { out.status = 'fail'; out.messages.push(`Flecha ${(best.f * 1000).toFixed(1)} mm > L/${cantilever ? 125 : 250} = ${(limit * 1000).toFixed(1)} mm.`); }
      }
      out.summary = sd.check ? `${sd.check.NSd >= 0 ? 'compressão' : 'tração'} ${Math.abs(sd.check.NSd).toFixed(1)} kN · M ${sd.check.MSd.toFixed(1)} kN·m · interação ${sd.check.interaction.toFixed(2)}`.replace(/\./g, ',') : sd.messages[0] ?? '';
      if (out.status === 'fail') out.suggestion = 'Aumente o perfil ou reduza o comprimento destravado.';
      return out;
    }
    if (materialKind !== 'concrete') { base.summary = 'Material sem regra de dimensionamento (defina concreto ou aço).'; return base; }

    const fck = mat.fck ?? 30;
    if (!conc.has(mat.id)) conc.set(mat.id, concrete(fck, settings.gammaC));
    const c = conc.get(mat.id)!;
    const msgs: string[] = [];
    if (fck < caa.fckMin) msgs.push(`fck ${fck} MPa abaixo do mínimo da CAA ${settings.caa} (C${caa.fckMin}).`);

    const colCombos = (): ColumnCombo[] => eluRes.map(({ cb, r }) => {
      const m = r.members[k];
      const xs = sampleXs(pm.L, [m.M]);
      let Ms = 0;
      for (const x of xs) if (x > 1e-9 && x < pm.L - 1e-9) Ms = Math.max(Ms, Math.abs(P.evaluate(m.M, x)));
      return { name: cb.name, N0: P.evaluate(m.N, 0), NL: P.evaluate(m.N, pm.L), M0: P.evaluate(m.M, 0), ML: P.evaluate(m.M, pm.L), Mspan: Ms, transverse: transverse(cb, k), cantilever, Mmid: P.evaluate(m.M, pm.L / 2) };
    });

    if (role === 'column') {
      if (sec.shape.kind === 'circle' || sec.shape.kind === 'polygon') {
        const cover = settings.coverColumn ?? caa.cover;
        const cd = designColumnGeneral({ poly: sec.shape.kind === 'polygon' ? sec.shape.pts : undefined, circleD: sec.shape.kind === 'circle' ? sec.shape.d : undefined, L: pm.L, leIn, leOut, cover, conc: c, fyk: settings.fyk, gammaS: settings.gammaS, dmax: settings.dmax, combos: colCombos() });
        const out: MemberDesign = { ...base, column: cd, status: cd.status, util: cd.util, messages: [...msgs, ...cd.messages, 'ELU de seção por fibras com flexão oblíqua real (linha neutra inclinada).'], NdMax: Math.max(...colCombos().map((x) => Math.max(-x.N0, -x.NL))) };
        if (sec.shape.kind === 'circle' && cd.layout && cd.stirrup) {
          // cortante em seção circular: bw = D e d = 0,8·D (aproximação usual, a confirmar)
          let V = 0, cn = '';
          for (const { cb, r } of eluRes) for (const x of sampleXs(pm.L, [r.members[k].M])) { const v = Math.abs(P.evaluate(r.members[k].V, x)); if (v > V) { V = v; cn = cb.name; } }
          const sh = { ...beamShear(sec.shape.d, 0.8 * sec.shape.d, V, c, settings.fywk, settings.gammaS), combo: cn };
          out.columnShear = { ...sh, provided: (2 * barArea(cd.stirrup.phi)) / cd.stirrup.s };
          if (!sh.ok) { out.status = 'fail'; out.messages.push(`Cortante: VSd > VRd2 (bw = D, d = 0,8·D, a confirmar).`); }
          else if (sh.aswS > out.columnShear.provided) { const sReq = Math.max(0.05, Math.floor(((2 * barArea(cd.stirrup.phi)) / sh.aswS) * 100) / 100); cd.stirrup = { ...cd.stirrup, s: sReq }; out.columnShear.provided = (2 * barArea(cd.stirrup.phi)) / sReq; out.messages.push(`Cortante (bw = D, d = 0,8·D, a confirmar): estribos c/${Math.round(sReq * 100)} cm.`); }
        } else if (sec.shape.kind === 'polygon') out.messages.push('Cortante não verificado para seção poligonal.');
        if (cd.layout) out.summary = `${cd.layout.n} φ${cd.layout.phi} (ρ = ${(cd.rho * 100).toFixed(2)}%) · estribo φ${cd.stirrup?.phi} c/${Math.round((cd.stirrup?.s ?? 0) * 100)}`.replace(/(\d)\.(\d)/g, '$1,$2');
        if (!cd.ok) out.suggestion = 'Aumente a seção ou a classe do concreto.';
        return out;
      }
      if (sec.shape.kind !== 'rect') return { ...base, status: 'na', summary: 'Pilar de concreto: dimensionamento disponível para seções retangular, circular e poligonal.', messages: msgs };
      const cover = settings.coverColumn ?? caa.cover;
      const inp = { b: sec.shape.b, h: sec.shape.h, L: pm.L, leIn, leOut, cover, conc: c, fyk: settings.fyk, gammaS: settings.gammaS, dmax: settings.dmax, combos: colCombos() };
      const cd = designColumn(inp);
      const out: MemberDesign = { ...base, column: cd, status: cd.status, util: cd.util, messages: [...msgs, ...cd.messages], NdMax: Math.max(...inp.combos.map((x) => Math.max(-x.N0, -x.NL))) };
      if (Math.max(inp.b, inp.h) / Math.min(inp.b, inp.h) > 5) { out.status = out.status === 'fail' ? 'fail' : 'review'; out.messages.push('Seção com lado maior > 5× o menor: pilar-parede (NBR 6118, 15.9), cujos efeitos localizados de 2ª ordem não são verificados aqui.'); }
      if ([mem.ni, mem.nj].some((id) => model.nodes.find((n) => n.id === id)?.support) && cover < 0.045) out.messages.push(`Trecho em contato com o solo ou a fundação: cobrimento mínimo 45 mm (Tab. 7.2, nota); adotado ${(cover * 1000).toFixed(0)} mm.`);
      // cortante no plano do pórtico (modelo I, mesma rotina das vigas): bw = b, d = h − c − φt − φl/2
      if (cd.layout && cd.stirrup) {
        const phiT = cd.stirrup.phi / 1000, dcol = inp.h - cover - phiT - cd.layout.phi / 2000, aT = inp.h / 2 - (cover + phiT + cd.layout.phi / 2000);
        let Vn = 0, Vt = 0, cn = '', ct = '';
        for (const { cb, r } of eluRes) {
          const m = r.members[k];
          for (const x of sampleXs(pm.L, [m.M])) {
            const V = Math.abs(P.evaluate(m.V, x)), N = P.evaluate(m.N, x), M = P.evaluate(m.M, x);
            if (N > 1e-6 && Math.abs(M) <= N * aT) { if (V > Vt) { Vt = V; ct = cb.name; } } else if (V > Vn) { Vn = V; cn = cb.name; }
          }
        }
        const shN = { ...beamShear(inp.b, dcol, Vn, c, settings.fywk, settings.gammaS), combo: cn };
        const shT = { ...beamShear(inp.b, dcol, Vt, c, settings.fywk, settings.gammaS, true), combo: `${ct} (seção tracionada, Vc = 0)` };
        const sh = Vt > 0 && shT.aswS > shN.aswS ? shT : shN;
        const prov = (2 * barArea(cd.stirrup.phi)) / cd.stirrup.s;
        out.columnShear = { ...sh, provided: prov };
        if (!sh.ok) { out.status = 'fail'; out.util = Math.max(out.util, Math.abs(sh.Vsd) / sh.VRd2); out.messages.push(`Cortante: VSd = ${Math.abs(sh.Vsd).toFixed(1)} kN > VRd2 = ${sh.VRd2.toFixed(1)} kN.`); }
        else if (sh.aswS > prov * 1.0001) {
          const sReq = Math.floor(((2 * barArea(cd.stirrup.phi)) / sh.aswS) * 100) / 100;
          out.messages.push(`Cortante (${sh.combo}): estribos φ${cd.stirrup.phi} reduzidos de c/${Math.round(cd.stirrup.s * 100)} para c/${Math.round(sReq * 100)} cm (Asw/s = ${(sh.aswS * 1e4).toFixed(2)} cm²/m).`);
          cd.stirrup = { ...cd.stirrup, s: Math.max(0.05, sReq) };
          out.columnShear.provided = (2 * barArea(cd.stirrup.phi)) / cd.stirrup.s;
          if (sReq < 0.05) { out.status = out.status === 'ok' ? 'review' : out.status; out.messages.push('Espaçamento de estribo < 5 cm: aumente a bitola do estribo ou a seção.'); }
        }
      }
      if (cd.layout) out.summary = `${cd.layout.n} φ${cd.layout.phi} (ρ = ${(cd.rho * 100).toFixed(2)}%) · estribo φ${cd.stirrup?.phi} c/${Math.round((cd.stirrup?.s ?? 0) * 100)}`.replace(/(\d)\.(\d)/g, '$1,$2');
      if (!cd.ok || cd.status === 'review') {
        const sizes: [number, number][] = [];
        const dims = [0.19, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0];
        for (const bb of dims) for (const hh of dims) if (bb >= inp.b - 1e-9 && hh >= inp.h - 1e-9 && hh >= bb - 1e-9 && (bb > inp.b + 1e-9 || hh > inp.h + 1e-9)) sizes.push([bb, hh]);
        sizes.sort((p, q) => p[0] * p[1] - q[0] * q[1]);
        for (const [bb, hh] of sizes.slice(0, 40)) {
          const t = designColumn({ ...inp, b: bb, h: hh });
          if (t.ok && t.status === 'ok') { out.suggestSection = { b: bb, h: hh }; out.suggestion = `Seção sugerida: ${Math.round(bb * 100)}×${Math.round(hh * 100)} cm com ${t.layout?.n} φ${t.layout?.phi} (refaça a análise com a nova seção).`; break; }
        }
        if (!out.suggestion) out.suggestion = 'Nenhuma seção até 100×100 cm atende com esses esforços. Revise o sistema estrutural.';
      }
      return out;
    }

    // viga
    if (sec.shape.kind !== 'rect' && sec.shape.kind !== 'tee') return { ...base, status: 'na', summary: 'Viga de concreto: dimensionamento disponível para seção retangular e T.', messages: msgs };
    const bs: BeamSection = sec.shape.kind === 'rect' ? { kind: 'rect', bw: sec.shape.b, h: sec.shape.h } : { kind: 'tee', bw: sec.shape.bw, h: sec.shape.h, bf: sec.shape.bf, hf: sec.shape.tf };
    const cover = settings.coverBeam ?? caa.cover;
    const beamCheck = (bsec: BeamSection, scaleDefl = 1) => {
      let posM = 0, negM = 0, posC = '', negC = '', Vmax = 0, Vc = '', Ncomp = 0, VmaxT = 0, VcT = '';
      const aT = bsec.h / 2 - (cover + 0.0063 + 0.008); // resultante de tração entre as camadas de armadura
      for (const { cb, r } of eluRes) {
        const m = r.members[k];
        for (const x of sampleXs(pm.L, [m.M])) {
          const M = P.evaluate(m.M, x), V = Math.abs(P.evaluate(m.V, x)), N = P.evaluate(m.N, x);
          if (M > posM) { posM = M; posC = cb.name; }
          if (M < negM) { negM = M; negC = cb.name; }
          if (N > 1e-6 && Math.abs(M) <= N * aT) { if (V > VmaxT) { VmaxT = V; VcT = cb.name; } }
          else if (V > Vmax) { Vmax = V; Vc = cb.name; }
        }
        Ncomp = Math.max(Ncomp, -P.evaluate(m.N, 0), -P.evaluate(m.N, pm.L));
      }
      const phiT = 0.0063;
      const dFor = (bars: BarChoice | null) => bsec.h - cover - phiT - (bars ? bars.phi / 2000 + ((bars.layers - 1) * (bars.phi / 1000 + 0.02)) / 2 : 0.008);
      const face = (M: number, flangeComp: boolean, combo: string) => {
        let d = dFor(null);
        let fl = beamFlexure(bsec, flangeComp, M, d, cover + phiT + 0.008, c, fyd);
        const AsMin = M !== 0 || flangeComp ? beamAsMin(bsec, flangeComp, d, c, fyd) : 0;
        let AsAdopt = Math.max(fl.As, Math.abs(M) > 1e-6 ? AsMin : 0);
        let bars = chooseBars(AsAdopt, bsec.bw, cover, phiT, settings.dmax);
        d = dFor(bars);
        fl = beamFlexure(bsec, flangeComp, M, d, cover + phiT + 0.008, c, fyd);
        AsAdopt = Math.max(fl.As, Math.abs(M) > 1e-6 ? AsMin : 0);
        bars = chooseBars(AsAdopt, bsec.bw, cover, phiT, settings.dmax);
        return { ...fl, AsMin, AsAdopt, bars, combo };
      };
      const pos = face(posM, true, posC);
      const neg = face(Math.abs(negM), false, negC);
      const d = Math.min(pos.d, neg.d);
      const shN = { ...beamShear(bsec.bw, d, Vmax, c, settings.fywk, settings.gammaS), combo: Vc };
      const shT = { ...beamShear(bsec.bw, d, VmaxT, c, settings.fywk, settings.gammaS, true), combo: `${VcT} (seção tracionada, Vc = 0)` };
      const sh = VmaxT > 0 && (shT.aswS > shN.aswS || Math.abs(shT.Vsd) > Math.abs(shN.Vsd)) ? shT : shN;
      const g = grossProps(bsec);
      const AsTotal = (pos.bars?.As ?? pos.AsAdopt) + (neg.bars?.As ?? neg.AsAdopt) + pos.As2 + neg.As2;
      const AsTotalRatio = AsTotal / g.A;
      const axialNu = Ncomp / 1000 / (g.A * c.fcd);
      // flecha (QP), Branson + fluência
      let defl: Deflection | undefined;
      if (qpRes.length) {
        let best = { f: 0, Ma: 0, combo: '' };
        for (const { cb, r } of qpRes) {
          const f = deflOf(r) * scaleDefl;
          let Ma = 0;
          for (const x of sampleXs(pm.L, [r.members[k].M])) Ma = Math.max(Ma, Math.abs(P.evaluate(r.members[k].M, x)));
          if (f > best.f) best = { f, Ma, combo: cb.name };
        }
        const Asd = pos.bars?.As ?? Math.max(pos.AsAdopt, 1e-6);
        const br = bransonRatio(bsec, true, Asd, pos.d, best.Ma, c);
        const Eanalysis = mat.E / 1000; // MPa
        // ρ' = armadura de compressão no vão (17.3.2.1.2); Δξ = ξ(∞) − ξ(t0)
        const rho2 = pos.As2 / (bsec.bw * pos.d);
        const alphaF = deltaXi(settings.t0Months ?? 1) / (1 + 50 * Math.min(rho2, 0.01));
        const stiffRatio = (Eanalysis * br.Ic) / (c.Ecs * br.Ie); // análise feita com E do material e Ic bruta
        const fImm = best.f * stiffRatio;
        const fTot = fImm * (1 + alphaF);
        const span = cantilever ? 2 * pm.L : pm.L;
        const limit = span / 250;
        defl = { f: fTot, fEl: best.f, limit, ratio: fTot / limit, Ie: br.Ie, Ic: br.Ic, alphaF, combo: best.combo, cantilever };
        if (settings.masonry) {
          // parcela após a parede: adotada a diferida αf·f0 (a confirmar); limite ℓ/500 e 10 mm
          const fAfter = fImm * alphaF, limAfter = Math.min(span / 500, 0.01);
          defl.after = { f: fAfter, limit: limAfter, ratio: fAfter / limAfter };
          defl.ratio = Math.max(defl.ratio, defl.after.ratio);
        }
      }
      // fissuração: maiores momentos positivo e negativo nas combinações frequentes
      let mPos = 0, mNeg = 0, cPos = '', cNeg = '';
      for (const { cb, r } of freqRes) for (const x of sampleXs(pm.L, [r.members[k].M])) { const M = P.evaluate(r.members[k].M, x); if (M > mPos) { mPos = M; cPos = cb.name; } if (M < mNeg) { mNeg = M; cNeg = cb.name; } }
      const crackOf = (f: typeof pos, M: number, flangeComp: boolean, combo: string) => ({ ...crackWidth(bsec, flangeComp, f.bars?.As ?? f.AsAdopt, f.bars?.phi ?? 10, f.d, M, c, settings.caa), combo, Mk: M });
      const crack = freqRes.length ? { pos: crackOf(pos, mPos, true, cPos), neg: crackOf(neg, mNeg, false, cNeg) } : undefined;
      return { pos, neg, sh, AsTotalRatio, axialNu, d, defl, crack };
    };
    const bc = beamCheck(bs);
    const bd: BeamDesign = { section: bs, d: bc.d, cover, pos: bc.pos, neg: bc.neg, shear: bc.sh, AsTotalRatio: bc.AsTotalRatio, axialNu: bc.axialNu, crack: bc.crack };
    const out: MemberDesign = { ...base, beam: bd, deflection: bc.defl, messages: msgs };
    const fails: string[] = [];
    if (!bc.sh.ok) fails.push(`VSd = ${bc.sh.Vsd.toFixed(1)} kN > VRd2 = ${bc.sh.VRd2.toFixed(1)} kN (esmagamento da biela).`);
    if (bc.AsTotalRatio > 0.04) fails.push(`Armadura total ${(bc.AsTotalRatio * 100).toFixed(2)}% > 4% de Ac.`);
    if (bc.defl && bc.defl.f > bc.defl.limit) fails.push(`Flecha diferida ${(bc.defl.f * 1000).toFixed(1)} mm > L/${bc.defl.cantilever ? 125 : 250} = ${(bc.defl.limit * 1000).toFixed(1)} mm.`);
    if (bc.defl?.after && bc.defl.after.ratio > 1) fails.push(`Flecha após a alvenaria ${(bc.defl.after.f * 1000).toFixed(1)} mm > ${(bc.defl.after.limit * 1000).toFixed(1)} mm (ℓ/500 e 10 mm).`);
    if (!bc.pos.bars && bc.pos.AsAdopt > 0) fails.push('Armadura positiva não cabe na largura (até 3 camadas).');
    if (!bc.neg.bars && bc.neg.AsAdopt > 0) fails.push('Armadura negativa não cabe na largura (até 3 camadas).');
    // detalhamento do estribo (18.3.3.2): φt ≤ bw/10 e espaçamento transversal entre ramos
    if (bc.sh.stirrup) {
      if (bc.sh.stirrup.phi / 1000 > bs.bw / 10) msgs.push(`Estribo φ${bc.sh.stirrup.phi} > bw/10 = ${(bs.bw * 100).toFixed(1)} mm: use bitola menor com espaçamento menor.`);
      const stMax = Math.abs(bc.sh.Vsd) <= 0.2 * bc.sh.VRd2 ? Math.min(bc.d, 0.8) : Math.min(0.6 * bc.d, 0.35);
      const st = bs.bw - 2 * cover - bc.sh.stirrup.phi / 1000;
      if (st > stMax) msgs.push(`Distância entre ramos do estribo ${(st * 100).toFixed(0)} cm > ${(stMax * 100).toFixed(0)} cm: use estribo de 4 ramos.`);
    }
    for (const [face, cr] of [['inferior', bc.crack?.pos], ['superior', bc.crack?.neg]] as const) if (cr && cr.wk > cr.limit) fails.push(`Fissuração (face ${face}): wk = ${cr.wk.toFixed(2)} mm > ${cr.limit.toFixed(1)} mm (${cr.combo}). Use mais barras de menor bitola ou aumente a armadura.`);
    if (bc.axialNu > 0.1 && bs.kind === 'rect') {
      const cd = designColumn({ b: bs.bw, h: bs.h, L: pm.L, leIn, leOut, cover, conc: c, fyk: settings.fyk, gammaS: settings.gammaS, dmax: settings.dmax, combos: colCombos() });
      bd.asColumn = cd;
      msgs.push(`ν = ${bc.axialNu.toFixed(2)} > 0,10: verificada também à flexo-compressão.`);
      if (!cd.ok) fails.push('Não atende à flexo-compressão.');
    }
    out.util = Math.max(bc.AsTotalRatio / 0.04, bc.sh.Vsd / Math.max(bc.sh.VRd2, 1e-9), bc.defl?.ratio ?? 0, bd.asColumn?.util ?? 0);
    out.status = fails.length ? 'fail' : 'ok';
    out.messages.push(...fails);
    if (bc.pos.double || bc.neg.double) out.messages.push('Armadura dupla necessária (x/d acima do limite de ductilidade).');
    const bars = (b: BarChoice | null) => (b ? `${b.n} φ${b.phi}${b.layers > 1 ? ` (${b.layers} camadas)` : ''}` : '—');
    out.summary = `inf. ${bars(bc.pos.bars)} · sup. ${bc.neg.AsAdopt > 0 ? bars(bc.neg.bars) : '2 φ10 (porta-estribo)'} · estribo ${bc.sh.stirrup ? `φ${bc.sh.stirrup.phi} c/${Math.round(bc.sh.stirrup.s * 100)}` : '—'}`.replace(/(\d)\.(\d)/g, '$1,$2');
    if (fails.length) {
      for (let hh = Math.ceil(bs.h * 20) / 20 + 0.05; hh <= 1.5001; hh += 0.05) {
        const ns: BeamSection = { ...bs, h: hh };
        const scale = grossProps(bs).I / grossProps(ns).I;
        const t = beamCheck(ns, scale);
        if (t.sh.ok && t.AsTotalRatio <= 0.04 && (!t.defl || t.defl.ratio <= 1) && t.pos.bars) { if (bs.kind === 'rect') out.suggestSection = { b: bs.bw, h: hh }; out.suggestion = `Altura sugerida: h = ${Math.round(hh * 100)} cm (bw = ${Math.round(bs.bw * 100)} cm). Refaça a análise com a nova seção.`; break; }
      }
      if (!out.suggestion) out.suggestion = 'Aumente a largura bw ou reduza o vão.';
    }
    return out;
  });

  // cargas na fundação
  const foundation: FoundationRow[] = [];
  model.nodes.forEach((n, k) => {
    if (!n.support) return;
    const perCase = model.cases.map((c) => ({ caseId: c.id, name: c.name, R: (a.cases.get(c.id)?.reactions.get(k) ?? [0, 0, 0]) as [number, number, number] }));
    const env = (list: { cb: NamedCombo; r: CaseResult }[]) => {
      const mx: [number, number, number] = [-Infinity, -Infinity, -Infinity], mn: [number, number, number] = [Infinity, Infinity, Infinity];
      let comboN = '';
      for (const { cb, r } of list) {
        const R = r.reactions.get(k) ?? [0, 0, 0];
        for (let q = 0; q < 3; q++) { if (R[q] > mx[q]) { mx[q] = R[q]; if (q === 1) comboN = cb.name; } mn[q] = Math.min(mn[q], R[q]); }
      }
      return { mx, mn, comboN };
    };
    const ch = env(rareRes), de = env(eluRes);
    const perm: [number, number, number] = [0, 0, 0];
    model.cases.forEach((c, i) => { if ((c.nature ?? 'G') === 'G') for (let q = 0; q < 3; q++) perm[q] += perCase[i].R[q]; });
    foundation.push({ nodeId: n.id, perCase, charMax: ch.mx, charMin: ch.mn, perm, designMax: de.mx, designMin: de.mn, charComboMaxN: ch.comboN, designComboMaxN: de.comboN });
  });

  const ok = members.every((m) => m.status !== 'fail') && (mode === 'pdelta' ? soRows.every((r) => r.converged) : gz.cls !== 'excessive');
  return { settings, conc, elu, qp, rare, autoElu, gammaZ: gz, imperfection: imp, secondOrder: { mode, rows: soRows }, eluResults, members, foundation, warnings, ok };
}

export { barArea, ES };
