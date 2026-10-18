// Montagem e solução do sistema global (método da rigidez direta).
import { elementMatrices, noLoad, recoverReleased, rotation, springFlex, type ElemLoad, type ElemMatrices, type ElemProps } from './element';
import { BandLDL, P, linearPoly, matVec, rcmOrder, spAdd, transpose, type Mat, type Poly, type SpRows } from './math';
import { sectionProps } from './section';
import type { DistLoad, Member, Model } from './types';

export interface PMember {
  id: number;
  index: number;
  i: number; // índice do nó
  j: number;
  L: number;
  c: number;
  s: number;
  props: ElemProps;
  hingeI: boolean;
  hingeJ: boolean;
  T: Mat; // global → local
  base: ElemMatrices; // sem cargas
  h: number;
  yc: number;
  alpha: number;
  gammaA: number; // peso próprio por metro (kN/m)
}

export interface Prepared {
  model: Model;
  nodeIndex: Map<number, number>;
  members: PMember[];
  ndof: number;
  K: SpRows; // global esparsa (linhas), já com apoios inclinados e molas
  constrained: Int8Array; // 1 = grau de liberdade eliminado (apoio fixo ou rotação indeterminada)
  free: number[]; // gdl livres na ordem de Cuthill-McKee reversa
  freePos: Int32Array; // posição do gdl na lista livre ou -1
  hb: number; // meia largura de banda
  lu: BandLDL | null;
  skew: { nodeIdx: number; c: number; s: number }[];
  warnings: string[];
  error?: string;
}

export interface MemberResult {
  L: number;
  f: number[]; // esforços de extremidade locais [Ni, Vi, Mi, Nj, Vj, Mj] atuando na barra
  ul: number[]; // deslocamentos locais de extremidade (com rotações liberadas recuperadas)
  N: Poly;
  V: Poly;
  M: Poly;
  u: Poly; // deslocamento axial local
  v: Poly; // deslocamento transversal local
  /** Descontinuidade imposta (linhas de influência): saltos aplicados para x > a. */
  jump?: { a: number; du: number; dv: number; dth: number };
}

export interface CaseResult {
  u: Float64Array; // deslocamentos globais por gdl
  reactions: Map<number, [number, number, number]>; // índice do nó → [Rx, Ry, Mz]
  members: MemberResult[];
}

const DOF = 3;

/** Substituições para análises não lineares: fatoração e matrizes de elemento modificadas. */
export interface SolveOverride {
  lu?: BandLDL;
  elem?: (pm: PMember, em: ElemMatrices) => ElemMatrices;
  /** Parcela global somada a K (mesma usada na fatoração), para os gdl prescritos. */
  extra?: SpRows;
}

export interface PrepareOptions { eiFactor?: (m: Member, angleFromHorizontalDeg: number) => number }

export function prepare(model: Model, opts: PrepareOptions = {}): Prepared {
  const warnings: string[] = [];
  const nodeIndex = new Map<number, number>();
  model.nodes.forEach((n, k) => nodeIndex.set(n.id, k));
  const nn = model.nodes.length;
  const ndof = nn * DOF;
  const mats = new Map(model.materials.map((m) => [m.id, m]));
  const secs = new Map(model.sections.map((s) => [s.id, s]));

  const members: PMember[] = [];
  model.members.forEach((m) => {
    const i = nodeIndex.get(m.ni), j = nodeIndex.get(m.nj);
    const mat = mats.get(m.material), sec = secs.get(m.section);
    if (i === undefined || j === undefined || !mat || !sec) { warnings.push(`Barra ${m.id} com dados incompletos foi ignorada.`); return; }
    const a = model.nodes[i], b = model.nodes[j];
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
    if (L < 1e-9) { warnings.push(`Barra ${m.id} com comprimento nulo foi ignorada.`); return; }
    const sp = sectionProps(sec.shape);
    const G = mat.E / (2 * (1 + mat.nu));
    const props: ElemProps = {
      L,
      EA: mat.E * sp.A * (model.options.axialDeformation ? 1 : 1e4),
      EI: mat.E * sp.I * (opts.eiFactor ? opts.eiFactor(m, (Math.abs(Math.atan2(dy, dx)) * 180) / Math.PI > 90 ? 180 - (Math.abs(Math.atan2(dy, dx)) * 180) / Math.PI : (Math.abs(Math.atan2(dy, dx)) * 180) / Math.PI) : 1),
      GAs: model.options.shearDeformation ? G * sp.As : Infinity,
      kI: m.hingeI ? undefined : m.springI,
      kJ: m.hingeJ ? undefined : m.springJ,
    };
    const c = dx / L, s = dy / L;
    members.push({
      id: m.id, index: members.length, i, j, L, c, s, props,
      hingeI: !!m.hingeI, hingeJ: !!m.hingeJ, T: rotation(c, s),
      base: elementMatrices(props, noLoad(), !!m.hingeI, !!m.hingeJ),
      h: sp.h, yc: sp.yc, alpha: mat.alpha, gammaA: mat.gamma * sp.A,
    });
  });

  const K: SpRows = Array.from({ length: ndof }, () => new Map<number, number>());
  const add = (r: number, c: number, v: number) => spAdd(K, r, c, v);
  const connected = new Int32Array(nn);
  for (const pm of members) {
    connected[pm.i]++; connected[pm.j]++;
    const Kg = globalMatrix(pm.T, pm.base.Kc);
    const map = dofMap(pm);
    for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) add(map[a], map[b], Kg[a][b]);
  }

  let maxDiag = 0;
  for (let d = 0; d < ndof; d++) maxDiag = Math.max(maxDiag, K[d].get(d) ?? 0);

  // apoios inclinados: rotaciona os gdl de translação do nó para os eixos do apoio (exato)
  const skew: Prepared['skew'] = [];
  model.nodes.forEach((n, k) => {
    const ang = (((n.support?.angle) ?? 0) * Math.PI) / 180;
    if (!n.support || Math.abs(ang) < 1e-12) return;
    skew.push({ nodeIdx: k, c: Math.cos(ang), s: Math.sin(ang) });
  });
  applySkew(K, skew);

  const constrained = new Int8Array(ndof);
  model.nodes.forEach((n, k) => {
    const base = k * DOF;
    if (!connected[k]) { constrained[base] = constrained[base + 1] = constrained[base + 2] = 1; return; }
    const sup = n.support;
    if (sup) {
      if (sup.ux === 'fixed') constrained[base] = 1; else if (sup.ux === 'spring') add(base, base, sup.kx ?? 0);
      if (sup.uy === 'fixed') constrained[base + 1] = 1; else if (sup.uy === 'spring') add(base + 1, base + 1, sup.ky ?? 0);
    if (sup.rz === 'fixed') constrained[base + 2] = 1; else if (sup.rz === 'spring') add(base + 2, base + 2, sup.kr ?? 0);
    }
    // rotação indeterminada: todas as barras rotuladas no nó, sem restrição à rotação
    if (!constrained[base + 2] && Math.abs(K[base + 2].get(base + 2) ?? 0) < 1e-12 * (maxDiag || 1)) constrained[base + 2] = 1;
  });

  const freeIdx: number[] = [];
  for (let d = 0; d < ndof; d++) if (!constrained[d]) freeIdx.push(d);
  const { order: free, hb } = rcmOrder(K, freeIdx);
  const freePos = new Int32Array(ndof).fill(-1);
  free.forEach((d, p) => (freePos[d] = p));
  const nf = free.length;
  let lu: BandLDL | null = null;
  let error: string | undefined;
  if (members.length === 0) error = 'Crie a estrutura (nenhuma barra válida).';
  else if (nf > 0) {
    lu = factorFree(K, free, freePos, hb, maxDiag);
    if (lu.singularRow >= 0) {
      const d = free[lu.singularRow];
      const node = model.nodes[Math.floor(d / DOF)];
      const dirName = ['X', 'Y', 'rotação'][d % DOF];
      error = `Estrutura hipostática (instável). Verifique apoios e rótulas próximo ao nó ${node?.id} (direção ${dirName}).`;
      lu = null;
    }
  }
  return { model, nodeIndex, members, ndof, K, constrained, free, freePos, hb, lu, skew, warnings, error };
}

/** Fatora a submatriz livre de K (mais `extra`, opcional, na mesma esparsidade) na ordem `free`. */
export function factorFree(K: SpRows, free: number[], freePos: Int32Array, hb: number, scale: number, extra?: SpRows, alpha = 1): BandLDL {
  return new BandLDL(free.length, hb, (set) => {
    free.forEach((d, p) => {
      for (const [c, v] of K[d]) { const q = freePos[c]; if (q >= p) set(p, q, v); }
      if (extra) for (const [c, v] of extra[d]) { const q = freePos[c]; if (q >= p) set(p, q, alpha * v); }
    });
  }, scale);
}

/** Leva os gdl de translação dos nós com apoio inclinado para os eixos do apoio (linhas e colunas). */
export function applySkew(K: SpRows, skew: Prepared['skew']) {
  for (const { nodeIdx, c, s } of skew) {
    const b = nodeIdx * DOF;
    const cols = new Set([...K[b].keys(), ...K[b + 1].keys(), b, b + 1]);
    for (const j of cols) {
      const a0 = K[b].get(j) ?? 0, a1 = K[b + 1].get(j) ?? 0;
      K[b].set(j, c * a0 + s * a1); K[b + 1].set(j, -s * a0 + c * a1);
    }
    for (const i of cols) {
      const a0 = K[i].get(b) ?? 0, a1 = K[i].get(b + 1) ?? 0;
      K[i].set(b, c * a0 + s * a1); K[i].set(b + 1, -s * a0 + c * a1);
    }
  }
}

/** Monta matrizes locais 6×6 (uma por barra, já condensadas) em uma matriz global esparsa com apoios inclinados. */
export function assembleGlobal(prep: Prepared, local: (pm: PMember) => Mat | null): SpRows {
  const G: SpRows = Array.from({ length: prep.ndof }, () => new Map<number, number>());
  for (const pm of prep.members) {
    const Kl = local(pm);
    if (!Kl) continue;
    const Kg = globalMatrix(pm.T, Kl), map = dofMap(pm);
    for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) spAdd(G, map[a], map[b], Kg[a][b]);
  }
  applySkew(G, prep.skew);
  return G;
}

export function dofMap(pm: PMember) {
  return [pm.i * DOF, pm.i * DOF + 1, pm.i * DOF + 2, pm.j * DOF, pm.j * DOF + 1, pm.j * DOF + 2];
}

function globalMatrix(T: Mat, Kl: Mat): Mat {
  const Tt = transpose(T);
  const n = 6;
  const tmp: Mat = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) { const a = Kl[i][k]; if (a) for (let j = 0; j < n; j++) tmp[i][j] += a * T[k][j]; }
  const out: Mat = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) { const a = Tt[i][k]; if (a) for (let j = 0; j < n; j++) out[i][j] += a * tmp[k][j]; }
  return out;
}

/** Converte uma carga distribuída para o sistema local da barra. */
function distToLocal(ld: DistLoad, pm: PMember): { qx: Poly; qy: Poly } {
  const { c, s, L } = pm;
  let { qxi, qyi, qxj, qyj } = ld;
  if (ld.system === 'local') return { qx: linearPoly(qxi, qxj, L), qy: linearPoly(qyi, qyj, L) };
  if (ld.system === 'projected') { qxi *= Math.abs(s); qxj *= Math.abs(s); qyi *= Math.abs(c); qyj *= Math.abs(c); }
  return {
    qx: linearPoly(c * qxi + s * qyi, c * qxj + s * qyj, L),
    qy: linearPoly(-s * qxi + c * qyi, -s * qxj + c * qyj, L),
  };
}

export function memberLoads(prep: Prepared, caseId: number): ElemLoad[] {
  const out = prep.members.map(() => noLoad());
  const byId = new Map(prep.members.map((m) => [m.id, m]));
  for (const ld of prep.model.loads) {
    if (ld.caseId !== caseId) continue;
    if (ld.kind === 'selfWeight') {
      for (const pm of prep.members) {
        const w = -pm.gammaA * ld.factor; // global −Y por metro de barra
        const e = out[pm.index];
        e.qx = P.add(e.qx, [pm.s * w]);
        e.qy = P.add(e.qy, [pm.c * w]);
      }
      continue;
    }
    if (!('member' in ld)) continue;
    const pm = byId.get(ld.member);
    if (!pm) continue;
    const e = out[pm.index];
    if (ld.kind === 'dist') {
      const q = distToLocal(ld, pm);
      e.qx = P.add(e.qx, q.qx);
      e.qy = P.add(e.qy, q.qy);
    } else if (ld.kind === 'endMoment') {
      e.mi += ld.mi; e.mj += ld.mj;
    } else if (ld.kind === 'thermal') {
      const Tc = ld.tBot + ((ld.tTop - ld.tBot) * pm.yc) / pm.h;
      e.eps0 += pm.alpha * Tc;
      e.kap0 += (pm.alpha * (ld.tBot - ld.tTop)) / pm.h;
    }
  }
  return out;
}

/** Resolve um caso de carga (ou um carregamento arbitrário de elementos/nós). */
export function solveLoading(
  prep: Prepared,
  elemLoads: ElemLoad[],
  nodal: Float64Array,
  presc: Float64Array | null,
  dirac?: { member: number; a: number; e: [number, number, number] },
  over?: SolveOverride,
): CaseResult {
  const { ndof, K, free, freePos } = prep;
  const lu = over?.lu ?? prep.lu;
  if (!lu && free.length) throw new Error(prep.error ?? 'Sistema singular');
  const F = Float64Array.from(nodal);
  const ems: ElemMatrices[] = prep.members.map((pm) => {
    const ld = dirac && dirac.member === pm.index ? { ...elemLoads[pm.index], dirac: { a: dirac.a, e: dirac.e } } : elemLoads[pm.index];
    const trivial = !dirac || dirac.member !== pm.index ? isTrivial(ld) : false;
    const em0 = trivial ? pm.base : elementMatrices(pm.props, ld, pm.hingeI, pm.hingeJ);
    const em = over?.elem ? over.elem(pm, em0) : em0;
    if (!trivial) {
      const fg = matVec(transpose(pm.T), em.fc);
      const map = dofMap(pm);
      for (let a = 0; a < 6; a++) F[map[a]] -= fg[a];
    }
    return em;
  });

  // gdl dos nós com apoio inclinado ficam nos eixos do apoio
  for (const sk of prep.skew) {
    const b = sk.nodeIdx * DOF, f0 = F[b], f1 = F[b + 1];
    F[b] = sk.c * f0 + sk.s * f1; F[b + 1] = -sk.s * f0 + sk.c * f1;
  }
  const u = new Float64Array(ndof);
  if (presc) for (let d = 0; d < ndof; d++) if (prep.constrained[d]) u[d] = presc[d];
  const nf = free.length;
  if (nf) {
    const rhs = new Float64Array(nf);
    for (let a = 0; a < nf; a++) {
      const r = free[a];
      let s = F[r];
      for (const [c, v] of K[r]) if (freePos[c] < 0 && u[c] !== 0) s -= v * u[c];
      if (over?.extra) for (const [c, v] of over.extra[r]) if (freePos[c] < 0 && u[c] !== 0) s -= v * u[c];
      rhs[a] = s;
    }
    const x = lu!.solve(rhs);
    for (let a = 0; a < nf; a++) u[free[a]] = x[a];
  }
  for (const sk of prep.skew) {
    const b = sk.nodeIdx * DOF, a0 = u[b], a1 = u[b + 1];
    u[b] = sk.c * a0 - sk.s * a1; u[b + 1] = sk.s * a0 + sk.c * a1;
  }

  // resultados de barra
  const members: MemberResult[] = [];
  const resid = new Float64Array(ndof);
  prep.members.forEach((pm, k) => {
    const em = ems[k];
    const map = dofMap(pm);
    const ug = map.map((d) => u[d]);
    const ul0 = matVec(pm.T, ug);
    const ul = recoverReleased(em, ul0);
    const f = em.K.map((r, a) => r.reduce((s, kk, b) => s + kk * ul[b], 0) + em.f[a]);
    const fg = matVec(transpose(pm.T), f);
    for (let a = 0; a < 6; a++) resid[map[a]] += fg[a];
    const ld = dirac && dirac.member === k ? { ...elemLoads[k], dirac: { a: dirac.a, e: dirac.e } } : elemLoads[k];
    members.push(memberFunctions(pm, ld, f, ul));
  });

  const reactions = new Map<number, [number, number, number]>();
  prep.model.nodes.forEach((n, k) => {
    if (!n.support) return;
    const b = k * DOF;
    reactions.set(k, [resid[b] - nodal[b], resid[b + 1] - nodal[b + 1], resid[b + 2] - nodal[b + 2]]);
  });
  return { u, reactions, members };
}

function isTrivial(ld: ElemLoad) {
  return !ld.dirac && ld.mi === 0 && ld.mj === 0 && ld.eps0 === 0 && ld.kap0 === 0 && ld.qx.every((c) => c === 0) && ld.qy.every((c) => c === 0);
}

function memberFunctions(pm: PMember, ld: ElemLoad, f: number[], ul: number[]): MemberResult {
  const { fN, fV, fM } = {
    fN: 1 / pm.props.EA,
    fV: Number.isFinite(pm.props.GAs) ? 1 / pm.props.GAs : 0,
    fM: 1 / pm.props.EI,
  };
  const Qx = P.integrate(ld.qx), Qy = P.integrate(ld.qy);
  const N = P.add([-f[0]], P.scale(Qx, -1));
  const V = P.add([f[1]], Qy);
  const M = P.add([-f[2], f[1]], P.integrate(Qy));
  const u = P.add([ul[0]], P.integrate(P.add(P.scale(N, fN), [ld.eps0])));
  // com mola em i, a seção x = 0⁺ gira M(0)/kI além do nó
  const th = P.add([ul[2] + P.evaluate(M, 0) * springFlex(pm.props)[0]], P.integrate(P.add(P.scale(M, fM), [ld.kap0])));
  const v = P.add([ul[1]], P.integrate(th), P.scale(P.integrate(V), -fV));
  const r: MemberResult = { L: pm.L, f, ul, N, V, M, u, v };
  if (ld.dirac) {
    const [du, gam, dth] = ld.dirac.e;
    r.jump = { a: ld.dirac.a, du, dv: -gam, dth };
  }
  return r;
}

/** Deslocamento local (u, v) num ponto da barra, considerando descontinuidades impostas. */
export function memberDisp(r: MemberResult, x: number): [number, number] {
  let u = P.evaluate(r.u, x), v = P.evaluate(r.v, x);
  if (r.jump && x > r.jump.a) { u += r.jump.du; v += r.jump.dv + r.jump.dth * (x - r.jump.a); }
  return [u, v];
}

export function caseVectors(prep: Prepared, caseId: number) {
  const nodal = new Float64Array(prep.ndof);
  const presc = new Float64Array(prep.ndof);
  let hasPresc = false;
  for (const ld of prep.model.loads) {
    if (ld.caseId !== caseId) continue;
    if (ld.kind === 'nodal') {
      const k = prep.nodeIndex.get(ld.node);
      if (k === undefined) continue;
      nodal[k * DOF] += ld.fx; nodal[k * DOF + 1] += ld.fy; nodal[k * DOF + 2] += ld.mz;
    } else if (ld.kind === 'presc') {
      const k = prep.nodeIndex.get(ld.node);
      if (k === undefined) continue;
      if (ld.dx) { presc[k * DOF] += ld.dx; hasPresc = true; }
      if (ld.dy) { presc[k * DOF + 1] += ld.dy; hasPresc = true; }
      if (ld.rz) { presc[k * DOF + 2] += ld.rz; hasPresc = true; }
    }
  }
  return { nodal, presc: hasPresc ? presc : null };
}

export function solveCase(prep: Prepared, caseId: number): CaseResult {
  const { nodal, presc } = caseVectors(prep, caseId);
  return solveLoading(prep, memberLoads(prep, caseId), nodal, presc);
}

/** Superposição linear de resultados (combinações). */
export function combine(results: CaseResult[], factors: number[]): CaseResult {
  const n = results[0].u.length;
  const u = new Float64Array(n);
  results.forEach((r, k) => { for (let d = 0; d < n; d++) u[d] += factors[k] * r.u[d]; });
  const reactions = new Map<number, [number, number, number]>();
  results.forEach((r, k) => r.reactions.forEach((v, node) => {
    const acc = reactions.get(node) ?? [0, 0, 0];
    reactions.set(node, [acc[0] + factors[k] * v[0], acc[1] + factors[k] * v[1], acc[2] + factors[k] * v[2]]);
  }));
  const members: MemberResult[] = results[0].members.map((m0, i) => {
    const lin = (get: (m: MemberResult) => number[]) => P.add(...results.map((r, k) => P.scale(get(r.members[i]), factors[k])));
    return { L: m0.L, f: lin((m) => m.f), ul: lin((m) => m.ul), N: lin((m) => m.N), V: lin((m) => m.V), M: lin((m) => m.M), u: lin((m) => m.u), v: lin((m) => m.v) };
  });
  return { u, reactions, members };
}

export interface Analysis {
  prep: Prepared;
  cases: Map<number, CaseResult>;
  combos: Map<number, CaseResult>;
}

export function analyze(model: Model, opts: PrepareOptions = {}): Analysis {
  const prep = prepare(model, opts);
  const cases = new Map<number, CaseResult>();
  const combos = new Map<number, CaseResult>();
  if (prep.error) return { prep, cases, combos };
  for (const c of model.cases) cases.set(c.id, solveCase(prep, c.id));
  for (const cb of model.combinations) {
    const ids = Object.keys(cb.factors).map(Number).filter((id) => cases.has(id));
    if (!ids.length) continue;
    combos.set(cb.id, combine(ids.map((id) => cases.get(id)!), ids.map((id) => cb.factors[id])));
  }
  return { prep, cases, combos };
}
