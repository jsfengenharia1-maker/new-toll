// Operações de edição do modelo (mutam um rascunho; usar com immer).
import type { Combination, DistLoad, Load, LoadCase, Member, Model, Support } from './types';

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

/** Grupo excludente efetivo de um caso variável ('' = sem grupo). */
export function caseGroup(c: LoadCase): string {
  return c.group ?? (c.nature === 'W' ? 'vento' : '');
}

const LIMIT = 400;

/**
 * Escolhas de variáveis acompanhantes: os casos sem grupo entram sempre; de cada grupo excludente
 * entra no máximo um (todas as alternativas são geradas). `exclude` remove casos (ex.: o grupo da principal).
 */
export function exclusiveChoices(Q: LoadCase[], exclude: (c: LoadCase) => boolean = () => false): LoadCase[][] {
  const free = Q.filter((c) => !exclude(c) && !caseGroup(c));
  const groups = new Map<string, LoadCase[]>();
  for (const c of Q) { const g = caseGroup(c); if (g && !exclude(c)) groups.set(g, [...(groups.get(g) ?? []), c]); }
  let out: LoadCase[][] = [free];
  for (const list of groups.values()) {
    const next: LoadCase[][] = [];
    for (const base of out) for (const c of list) { next.push([...base, c]); if (next.length >= LIMIT) break; }
    out = next;
  }
  return out;
}

/**
 * Combinações NBR 8681 / NBR 6118 (11.7, 11.8): ELU normal com γg = 1,4 (desfavorável) e 1,0 (favorável),
 * γq = 1,4 na principal e 1,4·ψ0 nas acompanhantes; casos de um mesmo grupo excludente nunca atuam juntos.
 * Para cada principal gera-se também a combinação sem acompanhantes (ações variáveis favoráveis = 0).
 * ELS quase permanente (ψ2) e frequente (ψ1 na principal). Os fatores ficam editáveis depois.
 */
export function nbrCombinations(cases: LoadCase[], startId: number): Combination[] {
  const G = cases.filter((c) => (c.nature ?? 'G') === 'G');
  const Q = cases.filter((c) => c.nature === 'Q' || c.nature === 'W');
  const out: Combination[] = [];
  let id = startId;
  const psi = (c: LoadCase, k: 0 | 1 | 2) => c[`psi${k}`] ?? (c.nature === 'W' ? [0.6, 0.3, 0][k] : [0.5, 0.4, 0.3][k]);
  const push = (name: string, f: Record<number, number>) => out.push({ id: id++, name, factors: f, kind: name.startsWith('ELU') ? 'ELU' : name.includes('quase') ? 'QP' : 'FREQ' });
  const sameGroup = (p: LoadCase) => (c: LoadCase) => c === p || (!!caseGroup(p) && caseGroup(c) === caseGroup(p));
  const label = (list: LoadCase[], all: LoadCase[]) => (list.length && list.length < all.length ? ` + ${list.map((c) => c.name).join(', ')}` : '');
  for (const gg of [1.4, 1.0]) {
    const tag = gg === 1.4 ? 'G desf.' : 'G fav.';
    if (!Q.length) { push(`ELU ${tag}`, Object.fromEntries(G.map((c) => [c.id, gg]))); continue; }
    for (const p of Q) {
      const others = Q.filter((c) => !sameGroup(p)(c));
      const choices = exclusiveChoices(Q, sameGroup(p));
      for (const ch of choices) {
        const f: Record<number, number> = {};
        G.forEach((c) => (f[c.id] = gg));
        f[p.id] = 1.4;
        ch.forEach((c) => (f[c.id] = round(1.4 * psi(c, 0))));
        push(`ELU ${tag} · ${p.name} principal${label(ch, others)}`, f);
      }
      if (others.length) {
        const f: Record<number, number> = {};
        G.forEach((c) => (f[c.id] = gg));
        f[p.id] = 1.4;
        push(`ELU ${tag} · ${p.name} sozinha`, f);
      }
    }
  }
  for (const ch of exclusiveChoices(Q)) {
    const cqp: Record<number, number> = {};
    G.forEach((c) => (cqp[c.id] = 1));
    ch.forEach((c) => { const v = psi(c, 2); if (v) cqp[c.id] = v; });
    const grouped = ch.filter((c) => caseGroup(c));
    push(`ELS quase permanente${grouped.length && exclusiveChoices(Q).length > 1 ? ` (${grouped.map((c) => c.name).join(', ')})` : ''}`, cqp);
  }
  for (const p of Q) {
    for (const ch of exclusiveChoices(Q, sameGroup(p))) {
      const f: Record<number, number> = {};
      G.forEach((c) => (f[c.id] = 1));
      f[p.id] = psi(p, 1);
      ch.forEach((c) => { const v = psi(c, 2); if (v) f[c.id] = v; });
      const others = Q.filter((c) => !sameGroup(p)(c));
      push(`ELS frequente · ${p.name}${label(ch, others)}`, f);
    }
  }
  return out;
}

const round = (v: number) => Math.round(v * 1e4) / 1e4;

// ---------------------------------------------------------------------------
// Transformações da seleção: mover ou copiar (em série) por translação, rotação ou espelhamento.

export type Xform =
  | { kind: 'translate'; dx: number; dy: number }
  | { kind: 'rotate'; cx: number; cy: number; deg: number }
  | { kind: 'mirror'; x1: number; y1: number; x2: number; y2: number }
  | { kind: 'scale'; cx: number; cy: number; f: number };

export interface XformOptions {
  copy: boolean;
  /** Número de cópias em série (cada uma aplica a transformação de novo sobre a anterior). */
  copies: number;
  loads: boolean;
  supports: boolean;
}

/** Parte linear [[a, b], [c, d]] e translação da transformação. */
function affine(t: Xform): { A: [number, number, number, number]; b: [number, number] } {
  if (t.kind === 'translate') return { A: [1, 0, 0, 1], b: [t.dx, t.dy] };
  if (t.kind === 'scale') return { A: [t.f, 0, 0, t.f], b: [t.cx * (1 - t.f), t.cy * (1 - t.f)] };
  if (t.kind === 'rotate') {
    const r = (t.deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
    return { A: [c, -s, s, c], b: [t.cx - c * t.cx + s * t.cy, t.cy - s * t.cx - c * t.cy] };
  }
  const ux = t.x2 - t.x1, uy = t.y2 - t.y1, L2 = ux * ux + uy * uy || 1;
  const a = (ux * ux - uy * uy) / L2, bb = (2 * ux * uy) / L2, d = -a;
  return { A: [a, bb, bb, d], b: [t.x1 - a * t.x1 - bb * t.y1, t.y1 - bb * t.x1 - d * t.y1] };
}

export function xformPoint(t: Xform, x: number, y: number, times = 1): [number, number] {
  const { A, b } = affine(t);
  for (let k = 0; k < times; k++) [x, y] = [A[0] * x + A[1] * y + b[0], A[2] * x + A[3] * y + b[1]];
  return [x, y];
}

/** Barras e nós afetados: barras selecionadas, barras com os dois nós selecionados e seus nós. */
export function selectionSets(m: Model, nodeIds: Set<number>, memberIds: Set<number>) {
  const members = m.members.filter((mm) => memberIds.has(mm.id) || (nodeIds.has(mm.ni) && nodeIds.has(mm.nj)));
  const nodes = new Set<number>(nodeIds);
  for (const mm of members) { nodes.add(mm.ni); nodes.add(mm.nj); }
  return { members, nodes };
}

/**
 * Convenção para as cargas: no espelhamento os vetores globais são refletidos, as cargas locais
 * transversais e os momentos trocam de sinal e as faces da temperatura se invertem; na translação
 * e na rotação as cargas são copiadas como estão (carga global mantém a direção, ex.: gravidade).
 */
function mirrorLoad<T extends Load>(ld: T, A: [number, number, number, number]): T {
  const v = (x: number, y: number): [number, number] => [A[0] * x + A[1] * y, A[2] * x + A[3] * y];
  const c = { ...ld };
  if (c.kind === 'nodal') { [c.fx, c.fy] = v(c.fx, c.fy); c.mz = -c.mz; }
  else if (c.kind === 'presc') { const [dx, dy] = v(c.dx ?? 0, c.dy ?? 0); c.dx = dx; c.dy = dy; if (c.rz) c.rz = -c.rz; }
  else if (c.kind === 'endMoment') { c.mi = -c.mi; c.mj = -c.mj; }
  else if (c.kind === 'thermal') { [c.tTop, c.tBot] = [c.tBot, c.tTop]; }
  else if (c.kind === 'dist') {
    if (c.system === 'local') { c.qyi = -c.qyi; c.qyj = -c.qyj; }
    else { [c.qxi, c.qyi] = v(c.qxi, c.qyi); [c.qxj, c.qyj] = v(c.qxj, c.qyj); }
  }
  return c;
}

function xformSupport(s: Support, t: Xform): Support {
  if (t.kind === 'translate' || t.kind === 'scale') return { ...s };
  const ang = s.angle ?? 0;
  if (t.kind === 'rotate') return { ...s, angle: ang + t.deg };
  const phi = (Math.atan2(t.y2 - t.y1, t.x2 - t.x1) * 180) / Math.PI;
  return { ...s, angle: 2 * phi - ang };
}

export function transformSelection(m: Model, nodeIds: Set<number>, memberIds: Set<number>, t: Xform, o: XformOptions): { nodes: number[]; members: number[] } {
  const { members: src, nodes: srcNodes } = selectionSets(m, nodeIds, memberIds);
  const { A } = affine(t);
  const isMirror = t.kind === 'mirror';
  const pos = new Map(m.nodes.map((n) => [n.id, n]));

  if (!o.copy) {
    for (const id of srcNodes) {
      const n = pos.get(id)!;
      [n.x, n.y] = xformPoint(t, n.x, n.y);
      if (o.supports && n.support) n.support = xformSupport(n.support, t);
    }
    if (isMirror) {
      const memSet = new Set(src.map((x) => x.id));
      m.loads = m.loads.map((ld) => (('member' in ld && memSet.has(ld.member)) || ('node' in ld && srcNodes.has(ld.node)) ? mirrorLoad(ld, A) : ld));
    }
    return { nodes: [...srcNodes], members: src.map((x) => x.id) };
  }

  const newNodes: number[] = [], newMembers: number[] = [];
  const srcLoads = m.loads.filter((ld) => ('member' in ld && src.some((x) => x.id === ld.member)) || ('node' in ld && srcNodes.has(ld.node)));
  const n = isMirror ? 1 : Math.max(1, Math.floor(o.copies));
  for (let c = 1; c <= n; c++) {
    const map = new Map<number, number>();
    const fresh = new Set<number>();
    for (const id of srcNodes) {
      const n = pos.get(id)!;
      const [x, y] = xformPoint(t, n.x, n.y, c);
      const before = m.nodes.length;
      const nid = ensureNode(m, x, y);
      if (m.nodes.length > before) fresh.add(nid);
      map.set(id, nid);
      newNodes.push(nid);
      const target = m.nodes.find((k) => k.id === nid)!;
      if (o.supports && n.support && !target.support) target.support = xformSupport(n.support, c === 1 ? t : composeTimes(t, c));
    }
    const mirrorNow = isMirror && c % 2 === 1;
    for (const s of src) {
      const a = m.nodes.find((k) => k.id === map.get(s.ni))!, b = m.nodes.find((k) => k.id === map.get(s.nj))!;
      const created = addMember(m, a.x, a.y, b.x, b.y, s.material, s.section);
      const pieces = created.map((id) => m.members.find((k) => k.id === id)!);
      pieces.forEach((p, k) => {
        if (s.role) p.role = s.role;
        if (s.leIn !== undefined && pieces.length === 1) p.leIn = s.leIn;
        if (s.leOut !== undefined && pieces.length === 1) p.leOut = s.leOut;
        if (k === 0 && p.ni === a.id) { p.hingeI = s.hingeI; if (s.springI) p.springI = s.springI; }
        if (k === pieces.length - 1 && p.nj === b.id) { p.hingeJ = s.hingeJ; if (s.springJ) p.springJ = s.springJ; }
      });
      newMembers.push(...created);
      if (!o.loads) continue;
      const L2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
      const tOf = (id: number) => { const n = m.nodes.find((k) => k.id === id)!; return ((n.x - a.x) * (b.x - a.x) + (n.y - a.y) * (b.y - a.y)) / L2; };
      for (const ld of srcLoads) {
        if (!('member' in ld) || ld.member !== s.id) continue;
        const base = mirrorNow ? mirrorLoad(ld, A) : { ...ld };
        pieces.forEach((p, k) => {
          const t0 = tOf(p.ni), t1 = tOf(p.nj);
          let cp: Load = { ...base, id: nextId(m.loads), member: p.id } as Load;
          if (cp.kind === 'dist') {
            const at = (vi: number, vj: number, tt: number) => vi + (vj - vi) * tt;
            const d = base as DistLoad;
            cp = { ...cp, qxi: at(d.qxi, d.qxj, t0), qyi: at(d.qyi, d.qyj, t0), qxj: at(d.qxi, d.qxj, t1), qyj: at(d.qyi, d.qyj, t1) };
          } else if (cp.kind === 'endMoment') {
            cp = { ...cp, mi: k === 0 ? cp.mi : 0, mj: k === pieces.length - 1 ? cp.mj : 0 };
          }
          m.loads.push(cp);
        });
      }
    }
    if (o.loads) {
      for (const ld of srcLoads) {
        if (!('node' in ld)) continue;
        const nid = map.get(ld.node);
        if (nid === undefined || !fresh.has(nid)) continue; // não duplica carga em nó que já existia
        const base = mirrorNow ? mirrorLoad(ld, A) : { ...ld };
        m.loads.push({ ...base, id: nextId(m.loads), node: nid } as Load);
      }
    }
  }
  return { nodes: [...new Set(newNodes)], members: newMembers };
}

/** Transformação aplicada c vezes (para o ângulo dos apoios nas cópias em série). */
function composeTimes(t: Xform, c: number): Xform {
  if (t.kind === 'translate') return { kind: 'translate', dx: t.dx * c, dy: t.dy * c };
  if (t.kind === 'rotate') return { ...t, deg: t.deg * c };
  if (t.kind === 'scale') return t;
  return c % 2 === 1 ? t : { kind: 'translate', dx: 0, dy: 0 };
}

/** Traz de outro modelo as tabelas de materiais e seções e as unidades (sem repetir itens iguais). */
export function importTables(m: Model, src: Model): { materials: number; sections: number } {
  let nm = 0, ns = 0;
  for (const mat of src.materials) {
    const { id: _id, ...rest } = mat;
    if (m.materials.some((x) => JSON.stringify({ ...x, id: 0 }) === JSON.stringify({ ...mat, id: 0 }))) continue;
    const name = m.materials.some((x) => x.name === mat.name) ? `${mat.name} (importado)` : mat.name;
    m.materials.push({ ...rest, id: nextId(m.materials), name });
    nm++;
  }
  for (const sec of src.sections) {
    if (m.sections.some((x) => JSON.stringify(x.shape) === JSON.stringify(sec.shape))) continue;
    const name = m.sections.some((x) => x.name === sec.name) ? `${sec.name} (importada)` : sec.name;
    m.sections.push({ ...sec, id: nextId(m.sections), name });
    ns++;
  }
  if (src.units) m.units = { ...src.units };
  return { materials: nm, sections: ns };
}
