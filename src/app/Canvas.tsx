import { useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { useStore } from './store';
import { useAnalysis, resultFor, memberSeries, globalDisp, fmt, effPoly, getDesign, type Eff } from './results';
import { addMember, ensureNode } from '../core/edit';
import { influenceField, ilOrdinate, type MemberEnvelope } from '../core/influence';
import { P } from '../core/math';
import type { Load, Model, Node, Support } from '../core/types';

type V2 = [number, number];

export function modelBounds(m: Model) {
  if (!m.nodes.length) return { x0: -1, y0: -1, x1: 10, y1: 6 };
  const xs = m.nodes.map((n) => n.x), ys = m.nodes.map((n) => n.y);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

export function fitView(m: Model, w: number, hFull: number) {
  const h = typeof window !== 'undefined' && window.innerWidth <= 860 ? hFull * 0.42 : hFull;
  const b = modelBounds(m);
  const dx = Math.max(b.x1 - b.x0, 1), dy = Math.max(b.y1 - b.y0, 1);
  const scale = Math.min((w * 0.7) / dx, (h * 0.62) / dy);
  return { scale, ox: w / 2 - ((b.x0 + b.x1) / 2) * scale, oy: h / 2 + ((b.y0 + b.y1) / 2) * scale };
}

export let svgSize = { w: 800, h: 600 };

export function Canvas({ svgRef }: { svgRef: React.RefObject<SVGSVGElement | null> }) {
  const st = useStore();
  const { model, view, tool, tab } = st;
  const a = useAnalysis();
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [mouse, setMouse] = useState<{ wx: number; wy: number; px: number; py: number; snapped: boolean } | null>(null);
  const [start, setStart] = useState<V2 | null>(null);
  const [box, setBox] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [pan, setPan] = useState<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [dragNode, setDragNode] = useState<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const fitted = useRef(false);
  const lastFit = useRef<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = wrap.current!;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
      svgSize = { w: r.width, h: r.height };
      const prev = lastFit.current;
      const big = !prev || Math.abs(r.width - prev.w) / prev.w > 0.25 || Math.abs(r.height - prev.h) / prev.h > 0.25;
      if (r.width > 50 && (!fitted.current || big)) { fitted.current = true; lastFit.current = { w: r.width, h: r.height }; useStore.getState().set({ view: fitView(useStore.getState().model, r.width, r.height) }); }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => { if (tool !== 'member') setStart(null); }, [tool]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setStart(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const X = (x: number) => x * view.scale + view.ox;
  const Y = (y: number) => view.oy - y * view.scale;
  const toWorld = (px: number, py: number): V2 => [(px - view.ox) / view.scale, (view.oy - py) / view.scale];

  const nodePos = useMemo(() => {
    const mp = new Map<number, Node>();
    for (const n of model.nodes) mp.set(n.id, dragNode && dragNode.id === n.id ? { ...n, x: dragNode.x, y: dragNode.y } : n);
    return mp;
  }, [model.nodes, dragNode]);

  // roda do mouse: zoom no cursor
  useEffect(() => {
    const el = svgRef.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top;
      const v = useStore.getState().view;
      const f = Math.exp(-e.deltaY * 0.0015);
      const scale = Math.min(5000, Math.max(2, v.scale * f));
      const k = scale / v.scale;
      useStore.getState().set({ view: { scale, ox: px - (px - v.ox) * k, oy: py - (py - v.oy) * k } });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [svgRef]);

  function snapPoint(px: number, py: number) {
    let best: Node | null = null, bd = 9;
    for (const n of model.nodes) { const d = Math.hypot(X(n.x) - px, Y(n.y) - py); if (d < bd) { bd = d; best = n; } }
    if (best) return { wx: best.x, wy: best.y, snapped: true };
    let [wx, wy] = toWorld(px, py);
    if (st.snap) { const g = st.grid; wx = Math.round(wx / g) * g; wy = Math.round(wy / g) * g; }
    return { wx: +wx.toFixed(6), wy: +wy.toFixed(6), snapped: false };
  }

  function hitNode(px: number, py: number): number | null {
    let best: number | null = null, bd = 8;
    for (const n of model.nodes) { const d = Math.hypot(X(n.x) - px, Y(n.y) - py); if (d < bd) { bd = d; best = n.id; } }
    return best;
  }
  function hitMember(px: number, py: number): { id: number; t: number } | null {
    let best: { id: number; t: number } | null = null, bd = 7;
    for (const m of model.members) {
      const p = nodePos.get(m.ni)!, q = nodePos.get(m.nj)!;
      const ax = X(p.x), ay = Y(p.y), bx = X(q.x), by = Y(q.y);
      const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L2));
      const d = Math.hypot(ax + t * dx - px, ay + t * dy - py);
      if (d < bd) { bd = d; best = { id: m.id, t }; }
    }
    return best;
  }

  const local = (e: React.PointerEvent) => { const r = svgRef.current!.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] as V2; };

  function onDown(e: React.PointerEvent) {
    const [px, py] = local(e);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    if (e.button === 1 || tool === 'pan' || (e.button === 0 && e.altKey)) { setPan({ x: px, y: py, ox: view.ox, oy: view.oy }); return; }
    if (e.button === 2) { setStart(null); return; }
    const sp = snapPoint(px, py);
    if (tool === 'node') {
      st.commit((m) => { ensureNode(m, sp.wx, sp.wy); }, `Nó inserido em (${fmt(sp.wx)}; ${fmt(sp.wy)}).`);
      return;
    }
    if (tool === 'member') {
      if (!start) { setStart([sp.wx, sp.wy]); return; }
      const mat = model.materials[0]?.id ?? 1, sec = model.sections[0]?.id ?? 1;
      const s0 = start;
      st.commit((m) => { addMember(m, s0[0], s0[1], sp.wx, sp.wy, mat, sec); }, 'Barra inserida. Clique para continuar ou Esc para encerrar.');
      setStart([sp.wx, sp.wy]);
      return;
    }
    if (tool === 'section') {
      const hm = hitMember(px, py);
      if (hm) {
        const mem = model.members.find((m) => m.id === hm.id)!;
        const p = nodePos.get(mem.ni)!, q = nodePos.get(mem.nj)!;
        const L = Math.hypot(q.x - p.x, q.y - p.y);
        st.set({ il: { ...st.il, member: hm.id, x: Math.round(hm.t * L * 100) / 100 } });
      }
      return;
    }
    // seleção
    const hn = hitNode(px, py);
    if (hn !== null) {
      if (!st.selNodes.has(hn) || e.shiftKey) st.select([hn], [], e.shiftKey);
      const n = model.nodes.find((k) => k.id === hn)!;
      if (!e.shiftKey) setDragNode({ id: hn, x: n.x, y: n.y, moved: false });
      return;
    }
    const hm = hitMember(px, py);
    if (hm) { st.select([], [hm.id], e.shiftKey); return; }
    if (!e.shiftKey) st.clearSel();
    setBox({ x0: px, y0: py, x1: px, y1: py });
  }

  function onMove(e: React.PointerEvent) {
    const [px, py] = local(e);
    if (pan) { st.set({ view: { ...view, ox: pan.ox + px - pan.x, oy: pan.oy + py - pan.y } }); return; }
    const sp = snapPoint(px, py);
    setMouse({ ...sp, px, py });
    if (dragNode) {
      const g = st.snap ? st.grid : 0;
      let [wx, wy] = toWorld(px, py);
      if (g) { wx = Math.round(wx / g) * g; wy = Math.round(wy / g) * g; }
      const n = model.nodes.find((k) => k.id === dragNode.id)!;
      const moved = dragNode.moved || Math.hypot(X(wx) - X(n.x), Y(wy) - Y(n.y)) > 4;
      setDragNode({ ...dragNode, x: +wx.toFixed(6), y: +wy.toFixed(6), moved });
    }
    if (box) setBox({ ...box, x1: px, y1: py });
  }

  function onUp() {
    if (pan) setPan(null);
    if (dragNode) {
      const d = dragNode;
      setDragNode(null);
      if (d.moved) {
        const clash = model.nodes.some((n) => n.id !== d.id && Math.abs(n.x - d.x) < 1e-9 && Math.abs(n.y - d.y) < 1e-9);
        if (clash) st.set({ message: 'Já existe um nó nessa posição. Movimento cancelado.' });
        else st.commit((m) => { const n = m.nodes.find((k) => k.id === d.id)!; n.x = d.x; n.y = d.y; }, `Nó ${d.id} movido para (${fmt(d.x)}; ${fmt(d.y)}).`);
      }
    }
    if (box) {
      const { x0, y0, x1, y1 } = box;
      setBox(null);
      if (Math.abs(x1 - x0) < 3 && Math.abs(y1 - y0) < 3) return;
      const inside = (n: Node) => { const px = X(n.x), py = Y(n.y); return px >= Math.min(x0, x1) && px <= Math.max(x0, x1) && py >= Math.min(y0, y1) && py <= Math.max(y0, y1); };
      const crossing = x1 < x0;
      const nodes = model.nodes.filter(inside).map((n) => n.id);
      const ns = new Set(nodes);
      const mems = model.members.filter((m) => (crossing ? ns.has(m.ni) || ns.has(m.nj) : ns.has(m.ni) && ns.has(m.nj))).map((m) => m.id);
      st.select(nodes, mems, true);
    }
  }

  const extent = useMemo(() => { const b = modelBounds(model); return Math.max(b.x1 - b.x0, b.y1 - b.y0, 1); }, [model]);

  // ----- desenho -----
  const els: JSX.Element[] = [];
  const labels: { x0: number; x1: number; y: number }[] = [];
  const label = (x: number, y: number, text: string, cls: string, key: string, anchor: 'start' | 'middle' | 'end' = 'middle') => {
    const w = text.length * 6.7 + 4;
    const x0 = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2, x1 = x0 + w;
    if (labels.some((l) => x0 < l.x1 && x1 > l.x0 && Math.abs(l.y - y) < 12)) return;
    labels.push({ x0, x1, y });
    els.push(<text key={key} x={x} y={y} className={`lbl ${cls}`} textAnchor={anchor}>{text}</text>);
  };

  const showResults = tab === 'resultados' && !a.prep.error;
  const showIL = tab === 'influencia' && !a.prep.error;
  const results = showResults ? resultFor(a, st.source) : [];

  // grade
  const grid: JSX.Element[] = [];
  {
    let g = st.grid;
    while (g * view.scale < 12) g *= 2;
    const [wx0, wy1] = toWorld(0, 0), [wx1, wy0] = toWorld(size.w, size.h);
    const major = g * 5;
    for (let x = Math.floor(wx0 / g) * g; x <= wx1; x += g) {
      const isMajor = Math.abs(x / major - Math.round(x / major)) < 1e-6;
      grid.push(<line key={`gx${x.toFixed(4)}`} x1={X(x)} x2={X(x)} y1={0} y2={size.h} className={Math.abs(x) < 1e-9 ? 'axis' : isMajor ? 'grid major' : 'grid'} />);
    }
    for (let y = Math.floor(wy0 / g) * g; y <= wy1; y += g) {
      const isMajor = Math.abs(y / major - Math.round(y / major)) < 1e-6;
      grid.push(<line key={`gy${y.toFixed(4)}`} y1={Y(y)} y2={Y(y)} x1={0} x2={size.w} className={Math.abs(y) < 1e-9 ? 'axis' : isMajor ? 'grid major' : 'grid'} />);
    }
  }

  const design = tab === 'dimensionar' && !a.prep.error ? getDesign(a) : null;
  const statusOf = new Map(design?.members.map((d) => [d.id, d]) ?? []);
  // barras
  for (const m of model.members) {
    const p = nodePos.get(m.ni), q = nodePos.get(m.nj);
    if (!p || !q) continue;
    const sel = st.selMembers.has(m.id);
    const inPath = showIL && st.trainPath.includes(m.id);
    const ds = statusOf.get(m.id);
    els.push(<line key={`m${m.id}`} x1={X(p.x)} y1={Y(p.y)} x2={X(q.x)} y2={Y(q.y)} className={`member${sel ? ' sel' : ''}${inPath ? ' path' : ''}${showResults || showIL ? ' dim' : ''}${ds ? ` st-${ds.status}` : ''}`} />);
    if (ds && ds.status !== 'na') {
      const mx = (X(p.x) + X(q.x)) / 2, my = (Y(p.y) + Y(q.y)) / 2;
      els.push(<text key={`du${m.id}`} x={mx + 7} y={my - 7} className={`lbl st st-${ds.status}`}>{ds.util > 9.99 ? '>999%' : `${(ds.util * 100).toFixed(0)}%`}</text>);
    }
    if (st.showValues && tab === 'estrutura') {
      const mx = (X(p.x) + X(q.x)) / 2, my = (Y(p.y) + Y(q.y)) / 2;
      els.push(<text key={`mt${m.id}`} x={mx + 6} y={my - 6} className="lbl id">{m.id}</text>);
    }
    const L = Math.hypot(q.x - p.x, q.y - p.y) * view.scale;
    const ux = (X(q.x) - X(p.x)) / L, uy = (Y(q.y) - Y(p.y)) / L;
    if (m.hingeI) els.push(<circle key={`hi${m.id}`} cx={X(p.x) + ux * 7} cy={Y(p.y) + uy * 7} r={3.6} className="hinge" />);
    if (m.hingeJ) els.push(<circle key={`hj${m.id}`} cx={X(q.x) - ux * 7} cy={Y(q.y) - uy * 7} r={3.6} className="hinge" />);
  }

  // apoios e nós
  for (const n of nodePos.values()) {
    if (n.support) els.push(<SupportGlyph key={`s${n.id}`} x={X(n.x)} y={Y(n.y)} s={n.support} />);
  }
  for (const n of nodePos.values()) {
    const sel = st.selNodes.has(n.id);
    els.push(<rect key={`n${n.id}`} x={X(n.x) - 3} y={Y(n.y) - 3} width={6} height={6} className={`node${sel ? ' sel' : ''}`} />);
    if (st.showValues && tab === 'estrutura') els.push(<text key={`nt${n.id}`} x={X(n.x) - 6} y={Y(n.y) + 14} className="lbl nid" textAnchor="end">{n.id}</text>);
  }

  // cargas do caso ativo
  if (tab === 'estrutura' || tab === 'cargas') drawLoads(model, st.activeCase, nodePos, X, Y, view.scale, els);

  // resultados
  if (showResults && results.length) {
    const prep = a.prep;
    if (st.diagram === 'N' || st.diagram === 'V' || st.diagram === 'M') {
      const e = st.diagram as Eff;
      const series = prep.members.map((pm) => memberSeries(results, pm.index, pm.L, e));
      let maxAbs = 0;
      for (const s of series) for (let i = 0; i < s.xs.length; i++) maxAbs = Math.max(maxAbs, Math.abs(s.max[i]), Math.abs(s.min[i]));
      const k = maxAbs > 1e-9 ? (0.11 * extent * st.diagScale) / maxAbs : 0;
      const sign = e === 'M' && st.mTension ? -1 : 1;
      const env = results.length > 1;
      prep.members.forEach((pm, i) => {
        const s = series[i];
        const p0 = nodePos.get(model.nodes[pm.i].id)!;
        const nx = -pm.s, ny = pm.c;
        const pt = (x: number, v: number): V2 => [X(p0.x + pm.c * x + nx * sign * v * k), Y(p0.y + pm.s * x + ny * sign * v * k)];
        const base = (x: number): V2 => [X(p0.x + pm.c * x), Y(p0.y + pm.s * x)];
        for (const [arr, tag] of (env ? [[s.max, 'max'], [s.min, 'min']] : [[s.max, 'one']]) as [number[], string][]) {
          const pts = s.xs.map((x, j) => pt(x, arr[j]));
          const poly = [...pts, base(pm.L), base(0)].map((q) => q.join(',')).join(' ');
          els.push(<polygon key={`d${i}${tag}`} points={poly} className={`diag ${e}${env ? ' env ' + tag : ''}`} />);
          els.push(<polyline key={`dl${i}${tag}`} points={pts.map((q) => q.join(',')).join(' ')} className={`diagline ${e}`} />);
          if (st.showValues) {
            const idx = new Set<number>([0, s.xs.length - 1]);
            let jm = 0; arr.forEach((v, j) => { if (Math.abs(v) > Math.abs(arr[jm])) jm = j; });
            idx.add(jm);
            for (const j of idx) {
              const v = arr[j];
              if (Math.abs(v) < 1e-3 * maxAbs) continue;
              const [lx, ly] = pt(s.xs[j], v);
              const off = Math.sign(v * sign) || 1;
              label(lx + nx * off * 10, ly - ny * off * 10 + 4, fmt(v), `v${e}`, `dv${i}${tag}${j}`);
            }
          }
        }
      });
    } else if (st.diagram === 'deformed') {
      let maxD = 0;
      const samples = results.map((r) => prep.members.map((pm) => Array.from({ length: 21 }, (_, q) => { const x = (pm.L * q) / 20; const d = globalDisp(a, r, pm.index, x); maxD = Math.max(maxD, Math.hypot(d[0], d[1])); return [x, d] as const; })));
      const amp = maxD > 0 ? (0.07 * extent * st.diagScale) / maxD : 0;
      samples.forEach((perMember, ri) => perMember.forEach((pts, i) => {
        const pm = prep.members[i];
        const p0 = nodePos.get(model.nodes[pm.i].id)!;
        const line = pts.map(([x, d]) => `${X(p0.x + pm.c * x + d[0] * amp)},${Y(p0.y + pm.s * x + d[1] * amp)}`).join(' ');
        els.push(<polyline key={`df${ri}-${i}`} points={line} className="deformed" />);
      }));
      if (st.showValues && results.length === 1) {
        const r = results[0];
        model.nodes.forEach((n, k) => {
          const dx = r.u[k * 3], dy = r.u[k * 3 + 1];
          if (Math.hypot(dx, dy) < 1e-3 * maxD) return;
          label(X(n.x + dx * amp) + 8, Y(n.y + dy * amp) - 8, `${fmt(Math.hypot(dx, dy) * 1000)} mm`, 'vD', `dd${n.id}`, 'start');
        });
      }
    }
    if (st.showReactions && results.length === 1) {
      const r = results[0];
      r.reactions.forEach((R, k) => {
        const n = model.nodes[k];
        const px = X(n.x), py = Y(n.y);
        if (Math.abs(R[0]) > 1e-6) { const d = Math.sign(R[0]); els.push(<Arrow key={`rx${k}`} x={px - d * 18} y={py + 26} dx={d} dy={0} len={30} cls="react" />); label(px - d * 34, py + 20, fmt(Math.abs(R[0])), 'vR', `rxl${k}`); }
        if (Math.abs(R[1]) > 1e-6) { const d = Math.sign(R[1]); els.push(<Arrow key={`ry${k}`} x={px + 18} y={py + 22 + (d > 0 ? 0 : 30)} dx={0} dy={-d} len={30} cls="react" />); label(px + 24, py + 62, fmt(Math.abs(R[1])), 'vR', `ryl${k}`, 'start'); }
        if (Math.abs(R[2]) > 1e-6) { els.push(<MomentGlyph key={`rm${k}`} x={px} y={py} ccw={R[2] > 0} cls="react" r={20} />); label(px - 28, py - 22, `${fmt(Math.abs(R[2]))}`, 'vR', `rml${k}`, 'end'); }
      });
    }
  }

  // linhas de influência
  const ilField = useMemo(() => {
    if (!showIL || st.il.member === null) return null;
    const pm = a.prep.members.find((m) => m.id === st.il.member);
    if (!pm) return null;
    const x = Math.min(Math.max(st.il.x, 0), pm.L);
    return { pm, x, field: influenceField(a.prep, pm.index, x, st.il.effect) };
  }, [showIL, a, st.il]);

  const trainEnv = st.trainResult?.data as MemberEnvelope[] | undefined;
  if (showIL && trainEnv && trainEnv.length === a.prep.members.length) {
    const e = st.il.effect;
    let maxAbs = 0;
    trainEnv.forEach((m) => m.xs.forEach((_, j) => { maxAbs = Math.max(maxAbs, Math.abs(m.max[e][j]), Math.abs(m.min[e][j])); }));
    const k = maxAbs > 0 ? (0.11 * extent * st.diagScale) / maxAbs : 0;
    const sign = e === 'M' && st.mTension ? -1 : 1;
    a.prep.members.forEach((pm, i) => {
      const p0 = model.nodes[pm.i];
      const nx = -pm.s, ny = pm.c;
      const pt = (x: number, v: number): V2 => [X(p0.x + pm.c * x + nx * sign * v * k), Y(p0.y + pm.s * x + ny * sign * v * k)];
      const base = (x: number): V2 => [X(p0.x + pm.c * x), Y(p0.y + pm.s * x)];
      for (const tag of ['max', 'min'] as const) {
        const arr = trainEnv[i][tag][e];
        const pts = trainEnv[i].xs.map((x, j) => pt(x, arr[j]));
        els.push(<polygon key={`te${i}${tag}`} points={[...pts, base(pm.L), base(0)].map((q) => q.join(',')).join(' ')} className={`diag ${e} env ${tag}`} />);
        els.push(<polyline key={`tel${i}${tag}`} points={pts.map((q) => q.join(',')).join(' ')} className={`diagline ${e}`} />);
        if (st.showValues) {
          let jm = 0; arr.forEach((v, j) => { if (Math.abs(v) > Math.abs(arr[jm])) jm = j; });
          for (const j of new Set([0, arr.length - 1, jm])) {
            if (Math.abs(arr[j]) < 1e-3 * maxAbs) continue;
            const [lx, ly] = pt(trainEnv[i].xs[j], arr[j]);
            label(lx, ly + (arr[j] * sign > 0 ? -6 : 14), fmt(arr[j]), `v${e}`, `tev${i}${tag}${j}`);
          }
        }
      }
    });
  } else if (ilField) {
    const { field, pm: spm, x: sx } = ilField;
    let maxAbs = 0;
    const curves = a.prep.members.map((pm) => {
      const xs = Array.from({ length: 41 }, (_, q) => (pm.L * q) / 40);
      const r = field.members[pm.index];
      if (r.jump) xs.push(r.jump.a - 1e-9, r.jump.a + 1e-9);
      xs.sort((p, q) => p - q);
      const f = xs.map((x) => ilOrdinate(a.prep, field, pm.index, Math.min(Math.max(x, 0), pm.L)));
      f.forEach((v) => (maxAbs = Math.max(maxAbs, Math.abs(v))));
      return { pm, xs, f };
    });
    const k = maxAbs > 0 ? (0.15 * extent * st.diagScale) / maxAbs : 0;
    curves.forEach(({ pm, xs, f }, i) => {
      const p0 = model.nodes[pm.i];
      const pts = xs.map((x, j): V2 => [X(p0.x + pm.c * x), Y(p0.y + pm.s * x + f[j] * k)]);
      const base = (x: number): V2 => [X(p0.x + pm.c * x), Y(p0.y + pm.s * x)];
      els.push(<polygon key={`il${i}`} points={[...pts, base(pm.L), base(0)].map((q) => q.join(',')).join(' ')} className="il" />);
      els.push(<polyline key={`ill${i}`} points={pts.map((q) => q.join(',')).join(' ')} className="illine" />);
      if (st.showValues) {
        let jmx = 0, jmn = 0;
        f.forEach((v, j) => { if (v > f[jmx]) jmx = j; if (v < f[jmn]) jmn = j; });
        for (const j of new Set([jmx, jmn])) {
          if (Math.abs(f[j]) < 1e-3 * maxAbs) continue;
          label(pts[j][0], pts[j][1] + (f[j] > 0 ? -7 : 15), fmt(f[j], 3), 'vIL', `ilv${i}${j}`);
        }
      }
    });
    const p0 = model.nodes[spm.i];
    const cx = X(p0.x + spm.c * sx), cy = Y(p0.y + spm.s * sx);
    els.push(<g key="secmark" className="secmark"><line x1={cx + spm.s * 14} y1={cy + spm.c * 14} x2={cx - spm.s * 14} y2={cy - spm.c * 14} /><circle cx={cx} cy={cy} r={4} /></g>);
  }

  // dica ao passar o mouse (resultados)
  let tip: JSX.Element | null = null;
  if (showResults && results.length && mouse && !box && !pan) {
    const hm = hitMember(mouse.px, mouse.py);
    if (hm) {
      const pm = a.prep.members.find((m) => m.id === hm.id);
      if (pm) {
        const x = hm.t * pm.L;
        const rows: string[] = [`Barra ${pm.id} · x = ${fmt(x)} m`];
        if (results.length === 1) {
          const r = results[0];
          const d = globalDisp(a, r, pm.index, x);
          rows.push(`N = ${fmt(P.evaluate(effPoly(r, pm.index, 'N'), x))} kN`, `V = ${fmt(P.evaluate(effPoly(r, pm.index, 'V'), x))} kN`, `M = ${fmt(P.evaluate(effPoly(r, pm.index, 'M'), x))} kN·m`, `δx = ${fmt(d[0] * 1000)} mm · δy = ${fmt(d[1] * 1000)} mm`);
        } else {
          for (const e of ['N', 'V', 'M'] as Eff[]) {
            const vals = results.map((r) => P.evaluate(effPoly(r, pm.index, e), x));
            rows.push(`${e}: ${fmt(Math.max(...vals))} / ${fmt(Math.min(...vals))}`);
          }
        }
        const p0 = model.nodes[pm.i];
        const cx = X(p0.x + pm.c * x), cy = Y(p0.y + pm.s * x);
        const w = 210, hgt = rows.length * 16 + 10;
        const tx = Math.min(mouse.px + 14, size.w - w - 8), ty = Math.min(mouse.py + 14, size.h - hgt - 8);
        tip = (
          <g className="tip" pointerEvents="none">
            <circle cx={cx} cy={cy} r={4} className="tipdot" />
            <rect x={tx} y={ty} width={w} height={hgt} rx={4} />
            {rows.map((t, j) => <text key={j} x={tx + 10} y={ty + 18 + j * 16} className={j === 0 ? 'tiph' : ''}>{t}</text>)}
          </g>
        );
      }
    }
  }

  // feedback de ferramenta
  const overlay: JSX.Element[] = [];
  if (mouse && (tool === 'node' || tool === 'member')) {
    overlay.push(<circle key="cur" cx={X(mouse.wx)} cy={Y(mouse.wy)} r={mouse.snapped ? 7 : 4} className={`cursor${mouse.snapped ? ' snapped' : ''}`} />);
    if (start) overlay.push(<line key="rub" x1={X(start[0])} y1={Y(start[1])} x2={X(mouse.wx)} y2={Y(mouse.wy)} className="rubber" />);
    if (start) { const L = Math.hypot(mouse.wx - start[0], mouse.wy - start[1]); overlay.push(<text key="rubl" x={X(mouse.wx) + 12} y={Y(mouse.wy) - 10} className="lbl hint">{`L = ${fmt(L)} m`}</text>); }
  }
  if (box) overlay.push(<rect key="box" x={Math.min(box.x0, box.x1)} y={Math.min(box.y0, box.y1)} width={Math.abs(box.x1 - box.x0)} height={Math.abs(box.y1 - box.y0)} className={`selbox${box.x1 < box.x0 ? ' crossing' : ''}`} />);

  const cursor = pan ? 'grabbing' : tool === 'pan' ? 'grab' : tool === 'select' ? 'default' : 'crosshair';

  return (
    <div ref={wrap} className="canvas-wrap">
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        style={{ cursor }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={() => setMouse(null)}
        onContextMenu={(e) => e.preventDefault()}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width={size.w} height={size.h} className="bgfill" />
        <g>{grid}</g>
        <g>{els}</g>
        <g>{overlay}</g>
        {tip}
      </svg>
      <div className="coords">{mouse ? `x ${fmt(mouse.wx, 3)}   y ${fmt(mouse.wy, 3)} m` : ' '}</div>
    </div>
  );
}

function Arrow({ x, y, dx, dy, len, cls }: { x: number; y: number; dx: number; dy: number; len: number; cls: string }) {
  // seta terminando em (x, y), com direção (dx, dy) em coordenadas de tela
  const tx = x - dx * len, ty = y - dy * len;
  const hx = -dx * 7, hy = -dy * 7, px = -dy * 4, py = dx * 4;
  return (
    <g className={cls}>
      <line x1={tx} y1={ty} x2={x} y2={y} />
      <polygon points={`${x},${y} ${x + hx + px},${y + hy + py} ${x + hx - px},${y + hy - py}`} />
    </g>
  );
}

function MomentGlyph({ x, y, ccw, cls, r = 16 }: { x: number; y: number; ccw: boolean; cls: string; r?: number }) {
  // arco de 270° com ponta de seta
  const a0 = -Math.PI * 0.75, a1 = Math.PI * 0.75;
  const p = (a: number): V2 => [x + r * Math.cos(a), y - r * Math.sin(a)];
  const [sx, sy] = p(a0), [ex, ey] = p(a1);
  const end = ccw ? [ex, ey] : [sx, sy];
  const ang = ccw ? a1 + Math.PI / 2 : a0 - Math.PI / 2;
  const dx = Math.cos(ang), dy = -Math.sin(ang);
  const hx = end[0] - dx * 7, hy = end[1] - dy * 7;
  return (
    <g className={cls}>
      <path d={`M ${sx} ${sy} A ${r} ${r} 0 1 0 ${ex} ${ey}`} fill="none" />
      <polygon points={`${end[0]},${end[1]} ${hx - dy * 4},${hy + dx * 4} ${hx + dy * 4},${hy - dx * 4}`} />
    </g>
  );
}

function SupportGlyph({ x, y, s }: { x: number; y: number; s: Support }) {
  const ang = -(s.angle ?? 0);
  const parts: JSX.Element[] = [];
  const full = s.ux === 'fixed' && s.uy === 'fixed' && s.rz === 'fixed';
  if (full) {
    parts.push(<line key="b" x1={-14} y1={0} x2={14} y2={0} className="supline" />);
    for (let k = -12; k <= 12; k += 6) parts.push(<line key={`h${k}`} x1={k} y1={0} x2={k - 5} y2={7} className="hatch" />);
    return <g className="support" transform={`translate(${x},${y + 0}) rotate(${ang})`}>{parts}</g>;
  }
  const tri = (key: string, rot: number, roller: boolean) => (
    <g key={key} transform={`rotate(${rot})`}>
      <polygon points="0,0 -8,13 8,13" className="supfill" />
      {roller ? <line x1={-11} y1={17} x2={11} y2={17} className="supline" /> : <line x1={-11} y1={13} x2={11} y2={13} className="supline" />}
      {!roller && [-8, -3, 2, 7].map((k) => <line key={k} x1={k} y1={13} x2={k - 4} y2={18} className="hatch" />)}
    </g>
  );
  const spring = (key: string, rot: number) => (
    <g key={key} transform={`rotate(${rot})`}>
      <polyline points="0,0 0,4 -5,6 5,10 -5,14 5,18 0,20 0,24" className="supline" fill="none" />
      <line x1={-8} y1={24} x2={8} y2={24} className="supline" />
    </g>
  );
  const pinned = s.ux === 'fixed' && s.uy === 'fixed';
  if (pinned) parts.push(tri('p', 0, false));
  else {
    if (s.uy === 'fixed') parts.push(tri('y', 0, true));
    if (s.ux === 'fixed') parts.push(tri('x', 90, true));
  }
  if (s.uy === 'spring') parts.push(spring('sy', 0));
  if (s.ux === 'spring') parts.push(spring('sx', 90));
  if (s.rz === 'fixed') parts.push(<rect key="rz" x={-6} y={-6} width={12} height={12} className="rzbox" />);
  if (s.rz === 'spring') parts.push(<path key="rs" d="M 0 0 m -9 0 a 9 9 0 1 1 9 9" className="supline" fill="none" />);
  return <g className="support" transform={`translate(${x},${y}) rotate(${ang})`}>{parts}</g>;
}

function drawLoads(m: Model, caseId: number, nodePos: Map<number, Node>, X: (x: number) => number, Y: (y: number) => number, scale: number, els: JSX.Element[]) {
  const loads = m.loads.filter((l) => l.caseId === caseId);
  const memById = new Map(m.members.map((k) => [k.id, k]));
  let qmax = 0;
  for (const l of loads) if (l.kind === 'dist') qmax = Math.max(qmax, Math.hypot(l.qxi, l.qyi), Math.hypot(l.qxj, l.qyj));
  const kq = qmax > 0 ? 34 / qmax : 0;
  const sw = loads.find((l) => l.kind === 'selfWeight');
  if (sw && sw.kind === 'selfWeight') els.push(<text key="sw" x={14} y={22} className="lbl load" textAnchor="start">{`Peso próprio × ${fmt(sw.factor)} incluído neste caso`}</text>);
  loads.forEach((l: Load) => {
    if (l.kind === 'nodal') {
      const n = nodePos.get(l.node); if (!n) return;
      const px = X(n.x), py = Y(n.y);
      if (l.fx) { const d = Math.sign(l.fx); els.push(<Arrow key={`lfx${l.id}`} x={px - d * 5} y={py} dx={d} dy={0} len={40} cls="load" />); els.push(<text key={`lfxt${l.id}`} x={px - d * 48} y={py - 6} className="lbl load" textAnchor="middle">{fmt(Math.abs(l.fx))}</text>); }
      if (l.fy) { const d = -Math.sign(l.fy); els.push(<Arrow key={`lfy${l.id}`} x={px} y={py - d * 5} dx={0} dy={d} len={40} cls="load" />); els.push(<text key={`lfyt${l.id}`} x={px + 6} y={py - d * 46} className="lbl load" textAnchor="start">{fmt(Math.abs(l.fy))}</text>); }
      if (l.mz) { els.push(<MomentGlyph key={`lm${l.id}`} x={px} y={py} ccw={l.mz > 0} cls="load" />); els.push(<text key={`lmt${l.id}`} x={px + 20} y={py - 18} className="lbl load" textAnchor="start">{fmt(Math.abs(l.mz))}</text>); }
    } else if (l.kind === 'presc') {
      const n = nodePos.get(l.node); if (!n) return;
      els.push(<text key={`pr${l.id}`} x={X(n.x) + 10} y={Y(n.y) + 30} className="lbl load" textAnchor="start">{`recalque ${[l.dx ? `dx ${fmt(l.dx * 1000)} mm` : '', l.dy ? `dy ${fmt(l.dy * 1000)} mm` : '', l.rz ? `θ ${fmt(l.rz, 4)} rad` : ''].filter(Boolean).join(' ')}`}</text>);
    } else if ('member' in l) {
      const mem = memById.get(l.member); if (!mem) return;
      const p = nodePos.get(mem.ni), q = nodePos.get(mem.nj); if (!p || !q) return;
      const L = Math.hypot(q.x - p.x, q.y - p.y), c = (q.x - p.x) / L, s = (q.y - p.y) / L;
      if (l.kind === 'dist') {
        const pts: V2[] = [], tails: V2[] = [];
        const nArr = Math.max(4, Math.min(16, Math.round((L * scale) / 34)));
        for (let k = 0; k <= nArr; k++) {
          const t = k / nArr;
          let qx = l.qxi + (l.qxj - l.qxi) * t, qy = l.qyi + (l.qyj - l.qyi) * t;
          if (l.system === 'local') { const gx = c * qx - s * qy, gy = s * qx + c * qy; qx = gx; qy = gy; }
          const bx = X(p.x + (q.x - p.x) * t), by = Y(p.y + (q.y - p.y) * t);
          const vx = qx * kq, vy = -qy * kq;
          pts.push([bx, by]); tails.push([bx - vx, by - vy]);
        }
        els.push(<polyline key={`dlt${l.id}`} points={tails.map((t) => t.join(',')).join(' ')} className="loadline" />);
        pts.forEach((b, k) => { const t = tails[k]; const len = Math.hypot(b[0] - t[0], b[1] - t[1]); if (len > 3) els.push(<Arrow key={`dla${l.id}-${k}`} x={b[0]} y={b[1]} dx={(b[0] - t[0]) / len} dy={(b[1] - t[1]) / len} len={len} cls="load thin" />); });
        const mid = tails[Math.floor(tails.length / 2)];
        const same = l.qxi === l.qxj && l.qyi === l.qyj;
        const mag = (a: number, b: number) => fmt(Math.hypot(a, b));
        els.push(<text key={`dlx${l.id}`} x={mid[0]} y={mid[1] - 6} className="lbl load" textAnchor="middle">{same ? `${mag(l.qxi, l.qyi)} kN/m` : `${mag(l.qxi, l.qyi)} → ${mag(l.qxj, l.qyj)} kN/m`}{l.system === 'projected' ? ' (proj.)' : l.system === 'local' ? ' (local)' : ''}</text>);
      } else if (l.kind === 'thermal') {
        els.push(<text key={`th${l.id}`} x={X((p.x + q.x) / 2)} y={Y((p.y + q.y) / 2) + 16} className="lbl load" textAnchor="middle">{`ΔT sup ${fmt(l.tTop, 1)} / inf ${fmt(l.tBot, 1)} °C`}</text>);
      } else if (l.kind === 'endMoment') {
        if (l.mi) els.push(<MomentGlyph key={`emi${l.id}`} x={X(p.x + c * L * 0.12)} y={Y(p.y + s * L * 0.12)} ccw={l.mi > 0} cls="load" r={11} />);
        if (l.mj) els.push(<MomentGlyph key={`emj${l.id}`} x={X(q.x - c * L * 0.12)} y={Y(q.y - s * L * 0.12)} ccw={l.mj > 0} cls="load" r={11} />);
      }
    }
  });
}
