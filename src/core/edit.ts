// Operações de edição do modelo (mutam um rascunho; usar com immer).
import type { Combination, DistLoad, LoadCase, Member, Model } from './types';

export const TOL = 1e-6;

export function nextId(list: { id: number }[]): number {
  return list.reduce((m, x) => Math.max(m, x.id), 0) + 1;
}

export function findNodeAt(m: Model, x: number, y: number, tol = TOL) {
  return m.nodes.find((n) => Math.hypot(n.x - x, n.y - y) <= tol);
}

/** Garante um nó em (x, y), dividindo barras que passem pelo ponto. Retorna o id. */
export function ensureNode(m: Model, x: number, y: number, tol = TOL): number {
  const ex = findNodeAt(m, x, y, tol);
  if (ex) return ex.id;
  const id = nextId(m.nodes);
  m.nodes.push({ id, x, y });
  for (const mem of [...m.members]) {
    const t = paramOnMember(m, mem, x, y, tol);
    if (t !== null) splitMember(m, mem.id, id, t);
  }
  return id;
}

function nodeOf(m: Model, id: number) {
  return m.nodes.find((n) => n.id === id)!;
}

/** Parâmetro t ∈ (0,1) se o ponto está no interior da barra; senão null. */
function paramOnMember(m: Model, mem: Member, x: number, y: number, tol: number): number | null {
  const a = nodeOf(m, mem.ni), b = nodeOf(m, mem.nj);
  const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy;
  const t = ((x - a.x) * dx + (y - a.y) * dy) / L2;
  const L = Math.sqrt(L2);
  if (t * L <= tol || (1 - t) * L <= tol) return null;
  const px = a.x + t * dx, py = a.y + t * dy;
  return Math.hypot(px - x, py - y) <= tol ? t : null;
}

/** Divide a barra no nó dado (posição relativa t), preservando propriedades e cargas. */
export function splitMember(m: Model, memberId: number, nodeId: number, t: number) {
  const k = m.members.findIndex((x) => x.id === memberId);
  if (k < 0) return;
  const old = m.members[k];
  const id2 = nextId(m.members);
  const a: Member = { ...old, nj: nodeId, hingeJ: false, springJ: undefined };
  const b: Member = { ...old, id: id2, ni: nodeId, hingeI: false, springI: undefined };
  m.members.splice(k, 1, a, b);
  const extra = [];
  let lid = nextId(m.loads);
  for (const ld of m.loads) {
    if (!('member' in ld) || ld.member !== memberId) continue;
    if (ld.kind === 'dist') {
      const mid = (vi: number, vj: number) => vi + (vj - vi) * t;
      const second: DistLoad = { ...ld, id: lid++, member: id2, qxi: mid(ld.qxi, ld.qxj), qyi: mid(ld.qyi, ld.qyj) };
      ld.qxj = second.qxi; ld.qyj = second.qyi;
      extra.push(second);
    } else if (ld.kind === 'thermal') {
      extra.push({ ...ld, id: lid++, member: id2 });
    } else if (ld.kind === 'endMoment') {
      extra.push({ ...ld, id: lid++, member: id2, mi: 0 });
      ld.mj = 0;
    }
  }
  m.loads.push(...extra);
}

function segIntersect(p1: number[], p2: number[], p3: number[], p4: number[]) {
  const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
  if (Math.abs(d) < 1e-12) return null;
  const t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d;
  const u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d;
  const eps = 1e-9;
  if (t <= eps || t >= 1 - eps || u <= eps || u >= 1 - eps) return null;
  return { t, x: p1[0] + t * (p2[0] - p1[0]), y: p1[1] + t * (p2[1] - p1[1]) };
}

/** Insere barra entre dois pontos, criando nós e dividindo nas interseções. */
export function addMember(m: Model, x1: number, y1: number, x2: number, y2: number, material: number, section: number): number[] {
  if (Math.hypot(x2 - x1, y2 - y1) < TOL) return [];
  // interseções com barras existentes
  const pts: { t: number; x: number; y: number }[] = [{ t: 0, x: x1, y: y1 }, { t: 1, x: x2, y: y2 }];
  for (const mem of m.members) {
    const a = nodeOf(m, mem.ni), b = nodeOf(m, mem.nj);
    const hit = segIntersect([x1, y1], [x2, y2], [a.x, a.y], [b.x, b.y]);
    if (hit) pts.push(hit);
  }
  // nós existentes sobre o segmento
  const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy;
  for (const n of m.nodes) {
    const t = ((n.x - x1) * dx + (n.y - y1) * dy) / L2;
    if (t <= 1e-9 || t >= 1 - 1e-9) continue;
    if (Math.hypot(x1 + t * dx - n.x, y1 + t * dy - n.y) < TOL) pts.push({ t, x: n.x, y: n.y });
  }
  pts.sort((a, b) => a.t - b.t);
  const ids: number[] = [];
  for (const p of pts) {
    const id = ensureNode(m, p.x, p.y);
    if (ids[ids.length - 1] !== id) ids.push(id);
  }
  const created: number[] = [];
  for (let k = 0; k + 1 < ids.length; k++) {
    const exists = m.members.some((mm) => (mm.ni === ids[k] && mm.nj === ids[k + 1]) || (mm.nj === ids[k] && mm.ni === ids[k + 1]));
    if (exists) continue;
    const id = nextId(m.members);
    m.members.push({ id, ni: ids[k], nj: ids[k + 1], material, section });
    created.push(id);
  }
  return created;
}

export function deleteSelection(m: Model, nodeIds: Set<number>, memberIds: Set<number>) {
  const delMembers = new Set(memberIds);
  for (const mem of m.members) if (nodeIds.has(mem.ni) || nodeIds.has(mem.nj)) delMembers.add(mem.id);
  const endpoints = new Set(m.members.filter((x) => delMembers.has(x.id)).flatMap((x) => [x.ni, x.nj]));
  m.members = m.members.filter((x) => !delMembers.has(x.id));
  const used = new Set(m.members.flatMap((x) => [x.ni, x.nj]));
  m.nodes = m.nodes.filter((n) => !nodeIds.has(n.id) && !(endpoints.has(n.id) && !used.has(n.id)));
  const nodeSet = new Set(m.nodes.map((n) => n.id));
  const memSet = new Set(m.members.map((x) => x.id));
  m.loads = m.loads.filter((ld) => ('member' in ld ? memSet.has(ld.member) : 'node' in ld ? nodeSet.has(ld.node) : true));
}

/** Junta duas barras colineares que compartilham um nó sem apoio nem outras barras. */
export function joinAtNode(m: Model, nodeId: number): boolean {
  const ms = m.members.filter((x) => x.ni === nodeId || x.nj === nodeId);
  const node = nodeOf(m, nodeId);
  if (ms.length !== 2 || node.support) return false;
  const other = (mm: Member) => (mm.ni === nodeId ? mm.nj : mm.ni);
  const a = nodeOf(m, other(ms[0])), b = nodeOf(m, other(ms[1]));
  const cross = (node.x - a.x) * (b.y - a.y) - (node.y - a.y) * (b.x - a.x);
  if (Math.abs(cross) > 1e-9 * Math.hypot(b.x - a.x, b.y - a.y) ** 2) return false;
  if (m.loads.some((ld) => 'member' in ld && (ld.member === ms[0].id || ld.member === ms[1].id) && ld.kind !== 'thermal')) return false;
  const keep = ms[0];
  // as extremidades externas mantêm rótulas e ligações semirrígidas
  const end = (mm: Member, n: number) => (mm.ni === n ? { h: mm.hingeI, k: mm.springI } : { h: mm.hingeJ, k: mm.springJ });
  const ea = end(ms[0], a.id), eb = end(ms[1], b.id);
  keep.ni = a.id; keep.nj = b.id;
  keep.hingeI = !!ea.h; keep.springI = ea.k; keep.hingeJ = !!eb.h; keep.springJ = eb.k;
  m.members = m.members.filter((x) => x.id !== ms[1].id);
  m.loads = m.loads.filter((ld) => !('member' in ld && ld.member === ms[1].id));
  m.nodes = m.nodes.filter((n) => n.id !== nodeId);
  return true;
}

/**
 * Combinações NBR 8681 (normais, simplificadas): ELU com γg = 1,4 (desfavorável) e 1,0 (favorável),
 * γq = 1,4 com cada variável como principal e as demais reduzidas por ψ0; ELS quase permanente (ψ2)
 * e frequente (ψ1 na principal). Os fatores ficam editáveis depois.
 */
export function nbrCombinations(cases: LoadCase[], startId: number): Combination[] {
  const G = cases.filter((c) => (c.nature ?? 'G') === 'G');
  const Q = cases.filter((c) => c.nature === 'Q' || c.nature === 'W');
  const out: Combination[] = [];
  let id = startId;
  const psi = (c: LoadCase, k: 0 | 1 | 2) => c[`psi${k}`] ?? (c.nature === 'W' ? [0.6, 0.3, 0][k] : [0.5, 0.4, 0.3][k]);
  const push = (name: string, f: Record<number, number>) => out.push({ id: id++, name, factors: f, kind: name.startsWith('ELU') ? 'ELU' : name.includes('quase') ? 'QP' : 'FREQ' });
  for (const gg of [1.4, 1.0]) {
    const tag = gg === 1.4 ? 'G desf.' : 'G fav.';
    if (!Q.length) { push(`ELU ${tag}`, Object.fromEntries(G.map((c) => [c.id, gg]))); continue; }
    for (const p of Q) {
      const f: Record<number, number> = {};
      G.forEach((c) => (f[c.id] = gg));
      Q.forEach((c) => (f[c.id] = c === p ? 1.4 : round(1.4 * psi(c, 0))));
      push(`ELU ${tag} · ${p.name} principal`, f);
    }
  }
  const cqp: Record<number, number> = {};
  G.forEach((c) => (cqp[c.id] = 1));
  Q.forEach((c) => (cqp[c.id] = psi(c, 2)));
  push('ELS quase permanente', cqp);
  for (const p of Q) {
    const f: Record<number, number> = {};
    G.forEach((c) => (f[c.id] = 1));
    Q.forEach((c) => (f[c.id] = c === p ? psi(c, 1) : psi(c, 2)));
    push(`ELS frequente · ${p.name}`, f);
  }
  return out;
}

const round = (v: number) => Math.round(v * 1e4) / 1e4;
