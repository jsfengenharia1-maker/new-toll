// Planta do pavimento em Canvas 2D, em três camadas: máscara (com cache durante pan/zoom), modelo e interação.
// Toda alteração vira comando do registro; a planta só calcula pontos (capturas, ortogonal/polar, digitação).
import { useEffect, useMemo, useRef, useState } from 'react';
import { useBuilding } from './store';
import { useRevisao } from './revisao';
import { paleta, usePlanta, type Ferramenta, type Vista } from './plantaStore';
import { IndiceCaptura, ordenar, pontoDigitado, restringir, type Captura } from '../../core/geom/snap';
import { geometriaMascara } from '../../core/building/pilares';
import { panosDoGrupo } from '../../core/building/lajes';
import { dentroPoligono, pontoInterno } from '../../core/geom/faces';
import { contornoPilar, geometriaViga, lancesDoPilar, mascaraParaMundo, pavimentosOrdenados, secaoNoLance, trechosViga, type BuildingModel, type Pilar } from '../../core/building/types';
import { useStore } from '../store';
import { idsBloqueados } from './Armadura';

type P2 = [number, number];
const RAIO_PX = 12;
const dprAtual = () => Math.min(2, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
const msg = (m: string) => useStore.getState().set({ message: m });
/** Relógio para as medições de desempenho (só chamado em efeitos e eventos). */
const agora = () => performance.now();

type Estado = 'chega' | 'morre' | 'nasce' | 'inferior';
interface PilarPlanta { p: Pilar; estado: Estado; contorno: P2[] }

/** Pilares desenhados na planta do pavimento: os que chegam nele, os que nascem nele e (fantasma) os do pavimento de baixo. */
function pilaresDaPlanta(b: BuildingModel, pav: string | null, inferior: boolean): PilarPlanta[] {
  if (!pav) return [];
  const ps = pavimentosOrdenados(b);
  const i = ps.findIndex((x) => x.id === pav);
  const abaixo = i > 0 ? ps[i - 1].id : null;
  const out: PilarPlanta[] = [];
  for (const p of b.pilares) {
    const l = lancesDoPilar(b, p).map((x) => x.id);
    if (l.includes(pav)) out.push({ p, estado: p.morre === pav ? 'morre' : 'chega', contorno: contornoPilar(p, secaoNoLance(p, pav)) });
    else if (p.nasce === pav) out.push({ p, estado: 'nasce', contorno: contornoPilar(p, secaoNoLance(p, l[0] ?? pav)) });
    else if (inferior && abaixo && l.includes(abaixo)) out.push({ p, estado: 'inferior', contorno: contornoPilar(p, secaoNoLance(p, abaixo)) });
  }
  return out;
}

function dentro(pt: P2, poly: P2[]) {
  let r = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) r = !r;
  }
  return r;
}
const distSeg = (p: P2, a: P2, z: P2) => {
  const dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy;
  const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
  return Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1]);
};

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function proximoEixo(b: BuildingModel, horizontal: boolean) {
  if (horizontal) { const usadas = new Set(b.eixos.map((e) => e.nome)); for (let i = 0; i < 26 * 27; i++) { const n = i < 26 ? LETRAS[i] : LETRAS[Math.floor(i / 26) - 1] + LETRAS[i % 26]; if (!usadas.has(n)) return n; } }
  return String(Math.max(0, ...b.eixos.map((e) => (/^\d+$/.test(e.nome) ? +e.nome : 0))) + 1);
}

const PASSOS: Record<Ferramenta, string[]> = {
  selecionar: ['Clique num elemento ou arraste: da esquerda para a direita seleciona o que está todo dentro; da direita para a esquerda, o que cruza. Del remove.'],
  pilar: ['Clique para inserir o pilar (A muda o ponto fixo, R gira 90°). Digite x;y e Enter para coordenadas.'],
  viga: ['Primeiro ponto da viga (A alterna eixo/face esquerda/face direita).', 'Próximo ponto; Enter, duplo clique ou botão direito termina; Esc cancela.'],
  laje: ['Clique dentro de uma região fechada por vigas (ou desenhe o contorno de um balanço: pontos e Enter).', 'Próximo ponto do contorno; Enter fecha.'],
  carga: ['Carga: clique o ponto (ou os pontos da linha/área; Enter termina).', 'Próximo ponto; Enter termina.'],
  eixo: ['Primeiro ponto do eixo.', 'Segundo ponto (digite a distância, @dx;dy ou @d<ângulo e Enter).'],
  mover: ['Ponto base do deslocamento da seleção.', 'Ponto de destino.'],
  medir: ['Primeiro ponto.', 'Segundo ponto.'],
  alinhar: ['1º ponto na máscara.', 'Onde esse ponto deve ficar.', '2º ponto na máscara.', 'Onde o 2º ponto deve ficar.'],
};

export function Planta() {
  const { sessao, exec, diags } = useBuilding();
  const b = sessao.modelo;
  const pl = usePlanta();
  const pavs = pavimentosOrdenados(b);
  const pav = pavs.find((p) => p.id === pl.pavimento) ?? pavs[Math.min(1, pavs.length - 1)] ?? null;
  const grupo = pav?.grupo ?? '';
  const cores = paleta(pl.tema);

  const wrap = useRef<HTMLDivElement>(null);
  const cvM = useRef<HTMLCanvasElement>(null), cvE = useRef<HTMLCanvasElement>(null), cvI = useRef<HTMLCanvasElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const [tam, setTam] = useState<[number, number]>([800, 500]);
  const [digitando, setDigitando] = useState<string | null>(null);
  const [posDig, setPosDig] = useState<P2>([0, 0]);
  const [pontos, setPontos] = useState<P2[]>([]);

  // estado de interação fora do React (muda a cada movimento do mouse)
  const it = useRef({
    cursor: [0, 0] as P2, tela: [0, 0] as P2, cap: null as Captura | null, caps: [] as Captura[], ciclo: 0, ponto: [0, 0] as P2,
    guia: false, pan: null as null | { x: 0 | number; y: number; v: Vista }, janela: null as null | { a: P2; z: P2 }, espaco: false,
    cache: null as HTMLCanvasElement | null, vistaCache: null as Vista | null, timer: 0 as number | ReturnType<typeof setTimeout>, quadros: [] as number[],
  });

  // ---- dados derivados ----
  const mascaras = b.mascaras, todasVigas = b.vigas;
  const desenhoMascara = useMemo(() => {
    const g = geometriaMascara({ mascaras }, grupo, false);
    const textos: { x: number; y: number; h: number; rot: number; t: string }[] = [];
    for (const m of mascaras.filter((x) => x.grupo === grupo))
      for (const c of m.camadas) if (c.visivel) for (const t of m.geo[c.nome]?.textos ?? []) { const [x, y] = mascaraParaMundo(m, t.x, t.y); textos.push({ x, y, h: t.h * m.escala, rot: t.rot + m.rotacao, t: t.t }); }
    return { segs: Float64Array.from(g.segs), arcos: Float64Array.from(g.arcos), textos };
  }, [mascaras, grupo]);
  const idxMascara = useMemo(() => { const g = geometriaMascara({ mascaras }, grupo, true); return new IndiceCaptura(g.segs, g.arcos); }, [mascaras, grupo]);
  const naPlanta = useMemo(() => pilaresDaPlanta(b, pav?.id ?? null, pl.inferior), [b, pav?.id, pl.inferior]);
  const vigas = useMemo(() => todasVigas.filter((v) => v.grupo === grupo).map((v) => ({ v, g: geometriaViga(v), t: trechosViga(v) })), [todasVigas, grupo]);
  const idxModelo = useMemo(() => {
    const segs: number[] = [], arcos: number[] = [];
    for (const e of b.eixos) segs.push(e.p1[0], e.p1[1], e.p2[0], e.p2[1]);
    for (const { g } of vigas) for (const lado of [g.esq, g.dir, g.eixo]) for (let i = 0; i + 1 < lado.length; i++) segs.push(lado[i][0], lado[i][1], lado[i + 1][0], lado[i + 1][1]);
    for (const q of naPlanta) {
      const c = q.contorno;
      if (c.length > 4) { const cx = c.reduce((s, v) => s + v[0], 0) / c.length, cy = c.reduce((s, v) => s + v[1], 0) / c.length, r = Math.hypot(c[0][0] - cx, c[0][1] - cy); arcos.push(cx, cy, r, 0, 360); continue; }
      for (let i = 0; i < c.length; i++) segs.push(c[i][0], c[i][1], c[(i + 1) % c.length][0], c[(i + 1) % c.length][1]);
      const cx = c.reduce((s, v) => s + v[0], 0) / c.length, cy = c.reduce((s, v) => s + v[1], 0) / c.length;
      arcos.push(cx, cy, 1e-6, 0, 360); // centro do pilar
    }
    return new IndiceCaptura(segs, arcos);
  }, [b.eixos, naPlanta, vigas]);
  const todasLajes = b.lajes, todasCargas = b.cargas;
  const lajes = useMemo(() => todasLajes.filter((l) => l.grupo === grupo).map((l) => ({ l, c: pontoInterno(l.contorno) })), [todasLajes, grupo]);
  const cargas = useMemo(() => todasCargas.filter((c) => c.grupo === grupo), [todasCargas, grupo]);
  const panos = useMemo(() => (pl.ferramenta === 'laje' ? panosDoGrupo({ vigas: todasVigas } as BuildingModel, grupo) : []), [todasVigas, grupo, pl.ferramenta]);
  // erros de lançamento (sempre) e, com resultado de dimensionamento, erros e avisos da revisão (calculados uma vez por resultado)
  const rev = useRevisao();
  const niveisRev = useMemo(() => {
    const e = new Set<string>(), a = new Set<string>();
    for (const [k, n] of rev.porElemento) (n === 'erro' ? e : a).add(k.slice(k.indexOf('|') + 1));
    return { e, a };
  }, [rev]);
  const comErro = useMemo(() => new Set([...diags.filter((d) => d.severidade === 'erro').flatMap((d) => d.elementos), ...(pl.mostrarErros ? niveisRev.e : [])]), [diags, niveisRev, pl.mostrarErros]);
  const bloqueados = useMemo(() => idsBloqueados({ vigas: b.vigas, pilares: b.pilares } as BuildingModel), [b.vigas, b.pilares]);
  const comAviso = useMemo(() => new Set(pl.mostrarErros ? [...niveisRev.a].filter((i) => !comErro.has(i)) : []), [niveisRev, comErro, pl.mostrarErros]);

  // ---- vista ----
  const enquadrar = () => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const bb = (x: number, y: number) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
    for (const e of b.eixos) { bb(...e.p1); bb(...e.p2); }
    for (const q of naPlanta) for (const v of q.contorno) bb(v[0], v[1]);
    for (const { v } of vigas) for (const q of v.pontos) bb(q[0], q[1]);
    const s = desenhoMascara.segs;
    for (let i = 0; i < s.length; i += 2) bb(s[i], s[i + 1]);
    if (!Number.isFinite(x0)) { x0 = -2; y0 = -2; x1 = 20; y1 = 14; }
    const w = Math.max(x1 - x0, 1), h = Math.max(y1 - y0, 1), k = Math.min((tam[0] - 110) / w, (tam[1] - 110) / h); // margem para os balões dos eixos
    pl.set({ vista: { k, ox: tam[0] / 2 - ((x0 + x1) / 2) * k, oy: tam[1] / 2 + ((y0 + y1) / 2) * k } });
  };
  const vista = pl.vista;
  const paraMundo = (sx: number, sy: number, v: Vista = vista!): P2 => [(sx - v.ox) / v.k, (v.oy - sy) / v.k];
  const paraTela = (x: number, y: number, v: Vista = vista!): P2 => [v.ox + x * v.k, v.oy - y * v.k];

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setTam([Math.max(100, e.contentRect.width), Math.max(100, e.contentRect.height)]));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // enquadra na primeira vez e ao trocar de grupo (planta diferente)
  const grupoVisto = useRef<string | null>(null);
  useEffect(() => {
    if (!vista || grupoVisto.current !== grupo) { grupoVisto.current = grupo; enquadrar(); }
  });
  // centraliza no elemento pedido pela lista de erros / janela de resultados (mantém o zoom se o elemento couber)
  const focoFeito = useRef<unknown>(null);
  useEffect(() => {
    const f = pl.foco;
    if (!f || focoFeito.current === f || !wrap.current) return;
    const pts: P2[] = naPlanta.find((q) => q.p.id === f.id)?.contorno ?? vigas.find((x) => x.v.id === f.id)?.v.pontos ?? lajes.find((x) => x.l.id === f.id)?.l.contorno ?? [];
    if (!pts.length) return;
    focoFeito.current = f;
    const W = wrap.current.clientWidth || tam[0], H = wrap.current.clientHeight || tam[1];
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const kAjuste = Math.min((W - 160) / Math.max(x1 - x0, 0.5), (H - 160) / Math.max(y1 - y0, 0.5));
    const k = vista && vista.k <= kAjuste ? vista.k : Math.min(kAjuste, 200);
    pl.set({ vista: { k, ox: W / 2 - ((x0 + x1) / 2) * k, oy: H / 2 + ((y0 + y1) / 2) * k } });
  });

  // ---- desenho ----
  const prep = (cv: HTMLCanvasElement | null) => {
    if (!cv) return null;
    const d = dprAtual(), W = Math.round(tam[0] * d), H = Math.round(tam[1] * d);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; cv.style.width = `${tam[0]}px`; cv.style.height = `${tam[1]}px`; }
    const ctx = cv.getContext('2d')!;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    return ctx;
  };

  const desenharMascaraEm = (ctx: CanvasRenderingContext2D, v: Vista) => {
    ctx.clearRect(0, 0, tam[0], tam[1]);
    ctx.fillStyle = cores.fundo; ctx.fillRect(0, 0, tam[0], tam[1]);
    const { segs, arcos, textos } = desenhoMascara;
    ctx.strokeStyle = cores.mascara; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < segs.length; i += 4) { ctx.moveTo(v.ox + segs[i] * v.k, v.oy - segs[i + 1] * v.k); ctx.lineTo(v.ox + segs[i + 2] * v.k, v.oy - segs[i + 3] * v.k); }
    for (let i = 0; i < arcos.length; i += 5) {
      const cx = v.ox + arcos[i] * v.k, cy = v.oy - arcos[i + 1] * v.k, r = arcos[i + 2] * v.k;
      ctx.moveTo(cx + r * Math.cos((-arcos[i + 3] * Math.PI) / 180), cy + r * Math.sin((-arcos[i + 3] * Math.PI) / 180));
      ctx.arc(cx, cy, r, (-arcos[i + 3] * Math.PI) / 180, (-arcos[i + 4] * Math.PI) / 180, true);
    }
    ctx.stroke();
    ctx.fillStyle = cores.mascara;
    for (const t of textos) {
      const h = t.h * v.k;
      if (h < 5 || h > 200) continue;
      ctx.save(); ctx.translate(v.ox + t.x * v.k, v.oy - t.y * v.k); ctx.rotate((-t.rot * Math.PI) / 180);
      ctx.font = `${h}px system-ui, sans-serif`; ctx.fillText(t.t, 0, 0); ctx.restore();
    }
  };

  /** Máscara: completa no cache; durante o gesto, só reposiciona o cache (rápido) e redesenha ao parar. */
  const desenharMascara = (rapido: boolean) => {
    const v = vista, ctx = prep(cvM.current);
    if (!v || !ctx) return;
    const s = it.current;
    if (rapido && s.cache && s.vistaCache) {
      const r = v.k / s.vistaCache.k, d = dprAtual();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = cores.fundo; ctx.fillRect(0, 0, cvM.current!.width, cvM.current!.height);
      ctx.setTransform(r, 0, 0, r, (v.ox - r * s.vistaCache.ox) * d, (v.oy - r * s.vistaCache.oy) * d);
      ctx.drawImage(s.cache, 0, 0);
      clearTimeout(s.timer);
      s.timer = setTimeout(() => desenharMascara(false), 140);
      return;
    }
    if (!s.cache) s.cache = document.createElement('canvas');
    const cctx = prep(s.cache)!;
    const t0 = agora();
    desenharMascaraEm(cctx, v);
    if (wrap.current) wrap.current.dataset.mascaraMs = (agora() - t0).toFixed(1);
    s.vistaCache = { ...v };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cvM.current!.width, cvM.current!.height);
    ctx.drawImage(s.cache, 0, 0);
  };

  const desenharModelo = () => {
    const v = vista, ctx = prep(cvE.current);
    if (!v || !ctx) return;
    ctx.clearRect(0, 0, tam[0], tam[1]);
    // eixos
    ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const e of b.eixos) {
      const a = paraTela(...e.p1), z = paraTela(...e.p2), sel = pl.selecao.has(e.id);
      ctx.strokeStyle = sel ? cores.selecao : cores.eixo; ctx.lineWidth = sel ? 2 : 1; ctx.setLineDash([14, 4, 2, 4]);
      ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...z); ctx.stroke(); ctx.setLineDash([]);
      const L = Math.hypot(z[0] - a[0], z[1] - a[1]) || 1, ux = (z[0] - a[0]) / L, uy = (z[1] - a[1]) / L;
      for (const [p, sgn] of [[a, -1], [z, 1]] as const) {
        const cx = p[0] + sgn * ux * 11, cy = p[1] + sgn * uy * 11;
        ctx.beginPath(); ctx.arc(cx, cy, 10, 0, 2 * Math.PI); ctx.fillStyle = cores.fundo; ctx.fill(); ctx.stroke();
        ctx.fillStyle = cores.eixo; ctx.fillText(e.nome, cx, cy + 0.5);
      }
    }
    // lajes
    for (const { l, c } of lajes) {
      const sel = pl.selecao.has(l.id), erro = comErro.has(l.id), avi = comAviso.has(l.id), cAlerta = erro ? cores.erro : avi ? cores.aviso : null;
      const path = new Path2D();
      l.contorno.forEach((q, i) => { const [x, y] = paraTela(q[0], q[1]); if (i) path.lineTo(x, y); else path.moveTo(x, y); });
      path.closePath();
      for (const f of l.furos ?? []) { f.forEach((q, i) => { const [x, y] = paraTela(q[0], q[1]); if (i) path.lineTo(x, y); else path.moveTo(x, y); }); path.closePath(); }
      ctx.globalAlpha = sel ? 0.45 : 0.22; ctx.fillStyle = cAlerta ?? (sel ? cores.selecao : cores.laje); ctx.fill(path, 'evenodd'); ctx.globalAlpha = 1;
      ctx.strokeStyle = cAlerta ?? cores.laje; ctx.lineWidth = 1; ctx.stroke(path);
      const [tx, ty] = paraTela(c[0], c[1]);
      ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = cAlerta ?? cores.laje;
      ctx.fillText(`${l.nome}${erro ? ' ⚠' : avi ? ' !' : ''}`, tx, ty - 8);
      ctx.font = '10px system-ui, sans-serif'; ctx.fillText(l.tipo.tipo === 'macica' ? `h=${Math.round(l.tipo.h * 100)}` : `${l.tipo.modelo}+${Math.round(l.tipo.capa * 100)}`, tx, ty + 6);
      if (l.tipo.tipo === 'trelicada') { // seta dupla na direção das vigotas
        const a = ((l.direcao ?? 0) * Math.PI) / 180, L = 22, ux = Math.cos(a), uy = -Math.sin(a), cy = ty + 18 + Math.abs(uy) * L;
        ctx.strokeStyle = cores.laje; ctx.lineWidth = 1.2; ctx.beginPath();
        ctx.moveTo(tx - ux * L, cy - uy * L); ctx.lineTo(tx + ux * L, cy + uy * L);
        for (const sgn of [1, -1]) { const ex = tx + sgn * ux * L, ey = cy + sgn * uy * L; ctx.moveTo(ex, ey); ctx.lineTo(ex - sgn * (ux * 7 - uy * 4), ey - sgn * (uy * 7 + ux * 4)); ctx.moveTo(ex, ey); ctx.lineTo(ex - sgn * (ux * 7 + uy * 4), ey - sgn * (uy * 7 - ux * 4)); }
        ctx.stroke();
      }
    }
    // vigas
    for (const { v, g, t } of vigas) {
      const sel = pl.selecao.has(v.id), erro = comErro.has(v.id), avi = comAviso.has(v.id), cor = erro ? cores.erro : avi ? cores.aviso : sel ? cores.selecao : cores.viga;
      ctx.fillStyle = cor; ctx.globalAlpha = 0.12;
      for (const r of t) { ctx.beginPath(); r.forEach((q, i) => { const [x, y] = paraTela(q[0], q[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath(); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.strokeStyle = cor; ctx.lineWidth = erro || avi ? 2.5 : sel ? 2.5 : 1.5;
      if (v.invertida) ctx.setLineDash([6, 3]);
      for (const lado of [g.esq, g.dir]) { ctx.beginPath(); lado.forEach((q, i) => { const [x, y] = paraTela(q[0], q[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); }
      ctx.setLineDash([]);
      if (sel) { ctx.setLineDash([8, 4]); ctx.lineWidth = 1; ctx.beginPath(); g.eixo.forEach((q, i) => { const [x, y] = paraTela(q[0], q[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); ctx.setLineDash([]); }
      // rótulo no meio do trecho mais longo, legível (sem ficar de cabeça para baixo)
      let k = 0, Lm = 0;
      for (let i = 0; i + 1 < v.pontos.length; i++) { const L = Math.hypot(v.pontos[i + 1][0] - v.pontos[i][0], v.pontos[i + 1][1] - v.pontos[i][1]); if (L > Lm) { Lm = L; k = i; } }
      const a = paraTela(...g.esq[k]), z = paraTela(...g.esq[k + 1]);
      let ang = Math.atan2(z[1] - a[1], z[0] - a[0]);
      if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI;
      ctx.save(); ctx.translate((a[0] + z[0]) / 2, (a[1] + z[1]) / 2); ctx.rotate(ang);
      ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillStyle = erro ? cores.erro : avi ? cores.aviso : cores.viga;
      ctx.fillText(`${v.nome} ${Math.round(v.secao.b * 100)}x${Math.round(v.secao.h * 100)}${v.invertida ? ' inv.' : ''}${erro ? ' ⚠' : avi ? ' !' : ''}${bloqueados.has(v.id) ? ' ▣' : ''}`, 0, -3);
      ctx.restore();
    }
    // pilares
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.font = '600 11px system-ui, sans-serif';
    for (const q of naPlanta) {
      const pts = q.contorno.map((c) => paraTela(c[0], c[1]));
      const path = new Path2D();
      pts.forEach((p, i) => (i ? path.lineTo(p[0], p[1]) : path.moveTo(p[0], p[1])));
      path.closePath();
      if (q.estado === 'inferior') {
        ctx.setLineDash([4, 3]); ctx.strokeStyle = cores.fantasma; ctx.lineWidth = 1; ctx.stroke(path); ctx.setLineDash([]);
        continue;
      }
      if (q.estado === 'chega') { ctx.fillStyle = cores.pilar; ctx.fill(path); }
      if (q.estado === 'nasce') { // hachura
        ctx.save(); ctx.clip(path); ctx.strokeStyle = cores.pilar; ctx.lineWidth = 1;
        const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
        ctx.beginPath(); for (let x = x0 - (y1 - y0); x < x1; x += 5) { ctx.moveTo(x, y1); ctx.lineTo(x + (y1 - y0), y0); } ctx.stroke(); ctx.restore();
      }
      const sel = pl.selecao.has(q.p.id), erro = comErro.has(q.p.id), avi = comAviso.has(q.p.id);
      ctx.strokeStyle = erro ? cores.erro : avi ? cores.aviso : sel ? cores.selecao : cores.pilarBorda; ctx.lineWidth = erro || avi ? 3 : sel ? 2.5 : 1.5;
      ctx.stroke(path);
      if (sel) { ctx.save(); ctx.globalAlpha = 0.25; ctx.lineWidth = 8; ctx.strokeStyle = cores.selecao; ctx.stroke(path); ctx.restore(); }
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      ctx.fillStyle = erro ? cores.erro : avi ? cores.aviso : cores.texto;
      ctx.fillText(q.p.nome + (erro ? ' ⚠' : avi ? ' !' : '') + (bloqueados.has(q.p.id) ? ' ▣' : ''), Math.max(...xs) + 4, Math.min(...ys) - 3);
    }
    desenharCargas(ctx);
  };

  const desenharCargas = (ctx: CanvasRenderingContext2D) => {
    ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    for (const c of cargas) {
      const sel = pl.selecao.has(c.id), cor = sel ? cores.selecao : c.origem ? cores.parede : cores.carga;
      const pts = c.pontos.map((q) => paraTela(q[0], q[1]));
      const rot = `${String(+c.valor.toFixed(2)).replace('.', ',')} ${c.tipo === 'ponto' ? 'kN' : c.tipo === 'linha' ? 'kN/m' : 'kN/m²'} ${b.casos?.find((x) => x.id === c.caso)?.nome ?? c.caso}`;
      ctx.strokeStyle = cor; ctx.fillStyle = cor;
      if (c.tipo === 'ponto') {
        const [x, y] = pts[0];
        ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 5, 0, 2 * Math.PI); ctx.moveTo(x - 3.5, y - 3.5); ctx.lineTo(x + 3.5, y + 3.5); ctx.moveTo(x + 3.5, y - 3.5); ctx.lineTo(x - 3.5, y + 3.5); ctx.stroke();
        ctx.fillText(rot, x + 8, y - 4);
      } else if (c.tipo === 'linha') {
        ctx.globalAlpha = c.origem ? 0.55 : 0.8; ctx.lineWidth = c.origem ? 4 : 2.5; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(...q) : ctx.moveTo(...q))); ctx.stroke(); ctx.globalAlpha = 1;
        if (!c.origem || sel) { const m = Math.floor((pts.length - 1) / 2); ctx.fillText(rot, (pts[m][0] + pts[m + 1][0]) / 2 + 4, (pts[m][1] + pts[m + 1][1]) / 2 - 4); }
      } else {
        ctx.setLineDash([6, 3]); ctx.lineWidth = 1.5; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(...q) : ctx.moveTo(...q))); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
        ctx.globalAlpha = 0.08; ctx.fill(); ctx.globalAlpha = 1;
        const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
        ctx.fillText(rot, Math.min(...xs) + 4, Math.max(...ys) - 4);
      }
    }
  };

  const glifo = (ctx: CanvasRenderingContext2D, c: Captura) => {
    const [x, y] = paraTela(c.x, c.y), r = 6;
    ctx.strokeStyle = cores.captura; ctx.lineWidth = 2;
    ctx.beginPath();
    switch (c.tipo) {
      case 'extremidade': ctx.rect(x - r, y - r, 2 * r, 2 * r); break;
      case 'meio': ctx.moveTo(x, y - r); ctx.lineTo(x + r, y + r); ctx.lineTo(x - r, y + r); ctx.closePath(); break;
      case 'intersecao': ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); break;
      case 'centro': ctx.arc(x, y, r, 0, 2 * Math.PI); break;
      case 'quadrante': ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); break;
      case 'perpendicular': ctx.moveTo(x - r, y + r); ctx.lineTo(x + r, y + r); ctx.moveTo(x - r, y + r); ctx.lineTo(x - r, y - r); ctx.moveTo(x - r, y); ctx.lineTo(x, y); ctx.lineTo(x, y + r); break;
      case 'proximo': ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.lineTo(x + r, y + r); ctx.closePath(); break;
    }
    ctx.stroke();
    ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = cores.captura;
    ctx.fillText(c.tipo + (it.current.caps.length > 1 ? `  (Tab: ${it.current.ciclo % it.current.caps.length + 1}/${it.current.caps.length})` : ''), x + 10, y - 9);
  };

  const desenharInteracao = () => {
    const v = vista, ctx = prep(cvI.current);
    if (!v || !ctx) return;
    ctx.clearRect(0, 0, tam[0], tam[1]);
    const s = it.current, [px, py] = paraTela(...s.ponto);
    // janela de seleção
    if (s.janela) {
      const [ax, ay] = paraTela(...s.janela.a), [zx, zy] = paraTela(...s.janela.z), cruz = zx < ax;
      ctx.fillStyle = cruz ? cores.cruzamento : cores.janela; ctx.globalAlpha = 0.15; ctx.fillRect(ax, ay, zx - ax, zy - ay); ctx.globalAlpha = 1;
      ctx.strokeStyle = cruz ? cores.cruzamento : cores.janela; ctx.lineWidth = 1; ctx.setLineDash(cruz ? [5, 4] : []); ctx.strokeRect(ax, ay, zx - ax, zy - ay); ctx.setLineDash([]);
    }
    const ult = pontos.at(-1);
    if (ult && pl.ferramenta !== 'selecionar') {
      const [ux, uy] = paraTela(...ult);
      ctx.strokeStyle = cores.guia; ctx.lineWidth = 1; ctx.setLineDash(pl.ferramenta === 'eixo' ? [14, 4, 2, 4] : [6, 4]);
      ctx.beginPath(); ctx.moveTo(ux, uy); ctx.lineTo(px, py); ctx.stroke(); ctx.setLineDash([]);
      const d = Math.hypot(s.ponto[0] - ult[0], s.ponto[1] - ult[1]), ang = (Math.atan2(s.ponto[1] - ult[1], s.ponto[0] - ult[0]) * 180) / Math.PI;
      ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = cores.cota;
      ctx.fillText(`${fmt(d)} m  ${fmt(((ang % 360) + 360) % 360, 1)}°`, (ux + px) / 2 + 8, (uy + py) / 2 - 8);
      for (const p of pontos) { const [qx, qy] = paraTela(...p); ctx.fillStyle = cores.guia; ctx.fillRect(qx - 3, qy - 3, 6, 6); }
    }
    if (s.guia && ult) { // linha-guia do polar/ortogonal
      const [ux, uy] = paraTela(...ult), L = Math.hypot(px - ux, py - uy) || 1;
      ctx.strokeStyle = cores.guia; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(ux, uy); ctx.lineTo(ux + ((px - ux) / L) * 3000, uy + ((py - uy) / L) * 3000); ctx.stroke(); ctx.setLineDash([]);
    }
    // pano sob o cursor (ferramenta laje)
    if (pl.ferramenta === 'laje' && !pontos.length) {
      const pano = panos.find((q) => dentroPoligono(s.cursor, q));
      if (pano) { ctx.beginPath(); pano.forEach((q, i) => { const [x, y] = paraTela(q[0], q[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath(); ctx.globalAlpha = 0.3; ctx.fillStyle = cores.laje; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = cores.laje; ctx.lineWidth = 2; ctx.stroke(); }
    }
    if ((pl.ferramenta === 'laje' || (pl.ferramenta === 'carga' && pl.tipoCarga === 'area')) && pontos.length >= 2) {
      const [ax, ay] = paraTela(...pontos[0]);
      ctx.strokeStyle = pl.ferramenta === 'laje' ? cores.laje : cores.carga; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ax, ay); ctx.stroke(); ctx.setLineDash([]);
    }
    // prévia da viga
    if (pl.ferramenta === 'viga' && pontos.length && !s.pan) {
      const g = geometriaViga({ pontos: [...pontos, s.ponto], secao: pl.secaoViga, alinhamento: pl.alinhamento });
      ctx.strokeStyle = cores.viga; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.5; ctx.setLineDash([5, 3]);
      for (const lado of [g.esq, g.dir]) { ctx.beginPath(); lado.forEach((q, i) => { const [x, y] = paraTela(q[0], q[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); }
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    // prévia do pilar
    if (pl.ferramenta === 'pilar' && !s.pan) {
      const c = contornoPilar({ x: s.ponto[0], y: s.ponto[1], angulo: pl.angulo, ajuste: pl.ajuste }, pl.secao).map((q) => paraTela(q[0], q[1]));
      ctx.beginPath(); c.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.closePath();
      ctx.globalAlpha = 0.45; ctx.fillStyle = cores.pilar; ctx.fill(); ctx.globalAlpha = 1; ctx.setLineDash([4, 3]); ctx.strokeStyle = cores.pilar; ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = cores.captura; ctx.fillRect(px - 2.5, py - 2.5, 5, 5);
    }
    // mira
    const [mx, my] = paraTela(...s.cursor);
    ctx.strokeStyle = cores.texto; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(mx - 14, my); ctx.lineTo(mx + 14, my); ctx.moveTo(mx, my - 14); ctx.lineTo(mx, my + 14); ctx.stroke();
    ctx.strokeRect(mx - 4, my - 4, 8, 8);
    if (s.cap) glifo(ctx, s.cap);
  };

  const ultimoZoom = useRef(0);
  const registrarQuadro = (ms: number) => {
    const q = it.current.quadros;
    q.push(ms); if (q.length > 60) q.shift();
    if (wrap.current) { wrap.current.dataset.frameMs = (q.reduce((a, z) => a + z, 0) / q.length).toFixed(2); wrap.current.dataset.segmentos = String(desenhoMascara.segs.length / 4); if (vista) wrap.current.dataset.vista = JSON.stringify(vista); }
  };

  // re-desenho quando dados, vista, tema ou tamanho mudam
  const vistaAnt = useRef<Vista | null>(null);
  useEffect(() => {
    const t0 = performance.now();
    const soVista = vistaAnt.current && vista && it.current.vistaCache && (vistaAnt.current.k !== vista.k || vistaAnt.current.ox !== vista.ox || vistaAnt.current.oy !== vista.oy);
    desenharMascara(!!soVista && (!!it.current.pan || performance.now() - ultimoZoom.current < 140));
    vistaAnt.current = vista;
    desenharModelo();
    desenharInteracao();
    registrarQuadro(performance.now() - t0);
  });

  // ---- pontos: captura, ortogonal/polar ----
  const capturar = (sx: number, sy: number) => {
    const s = it.current, w = paraMundo(sx, sy), r = RAIO_PX / vista!.k, ref = pontos.at(-1);
    const t0 = performance.now();
    const caps = ordenar([...idxModelo.consultar(w[0], w[1], r, pl.capturas, ref), ...idxMascara.consultar(w[0], w[1], r, pl.capturas, ref)], r);
    if (wrap.current) wrap.current.dataset.snapMs = (performance.now() - t0).toFixed(3);
    const mudou = caps.length !== s.caps.length || caps.some((c, i) => c.tipo !== s.caps[i]?.tipo || c.x !== s.caps[i]?.x || c.y !== s.caps[i]?.y);
    if (mudou) s.ciclo = 0;
    s.caps = caps; s.cursor = w; s.tela = [sx, sy];
    s.cap = caps.length ? caps[s.ciclo % caps.length] : null;
    s.guia = false;
    if (s.cap) s.ponto = [s.cap.x, s.cap.y];
    else if (ref && (pl.orto || pl.polar)) {
      const passo = pl.orto ? 90 : 15;
      const q = restringir(ref, w, passo);
      const desvio = Math.hypot(q[0] - w[0], q[1] - w[1]) * vista!.k;
      if (pl.orto || desvio < 10) { s.ponto = q; s.guia = true; } else s.ponto = w;
    } else s.ponto = w;
    if (statusRef.current) statusRef.current.textContent = `x ${fmt(s.ponto[0])}  y ${fmt(s.ponto[1])} m${s.cap ? ` · ${s.cap.tipo}` : s.guia ? ' · alinhado' : ''}`;
  };

  // ---- ações das ferramentas ----
  const selecionados = () => ({ pilares: b.pilares.filter((p) => pl.selecao.has(p.id)).map((p) => p.id), eixos: b.eixos.filter((e) => pl.selecao.has(e.id)).map((e) => e.id), vigas: vigas.filter(({ v }) => pl.selecao.has(v.id)).map(({ v }) => v.id), lajes: lajes.filter(({ l }) => pl.selecao.has(l.id)).map(({ l }) => l.id), cargas: cargas.filter((c) => pl.selecao.has(c.id)).map((c) => c.id) });
  const agir = (p: P2) => {
    const f = pl.ferramenta;
    const novos = [...pontos, p];
    if (f === 'pilar') { exec('pilar.inserir', { x: +p[0].toFixed(4), y: +p[1].toFixed(4), secao: pl.secao, ajuste: pl.ajuste, angulo: pl.angulo }); return; }
    if (f === 'selecionar') return;
    if (f === 'viga') { setPontos(novos); return; }
    if (f === 'laje') {
      if (!pontos.length) {
        const r = exec('laje.criar', { grupo, ponto: [+p[0].toFixed(4), +p[1].toFixed(4)], tipo: pl.tipoLaje });
        if (!r.ok && r.erros[0]?.codigo === 'PANO_NAO_ENCONTRADO') { setPontos([p]); msg('Fora de região fechada: desenhe o contorno da laje (pontos e Enter).'); }
        return;
      }
      setPontos(novos); return;
    }
    if (f === 'carga') {
      if (pl.tipoCarga === 'ponto') { exec('carga.ponto', { grupo, ponto: [+p[0].toFixed(4), +p[1].toFixed(4)], valor: pl.valorCarga, caso: pl.caso }); return; }
      setPontos(novos); return;
    }
    if (f === 'eixo' && novos.length === 2) {
      const [a, z] = novos;
      if (Math.hypot(z[0] - a[0], z[1] - a[1]) < 1e-3) return;
      exec('eixo.criar', { nome: proximoEixo(b, Math.abs(z[0] - a[0]) >= Math.abs(z[1] - a[1])), p1: a.map((v) => +v.toFixed(4)), p2: z.map((v) => +v.toFixed(4)) });
      setPontos([]); return;
    }
    if (f === 'medir' && novos.length === 2) {
      const [a, z] = novos, d = Math.hypot(z[0] - a[0], z[1] - a[1]);
      msg(`Distância ${fmt(d, 3)} m · Δx ${fmt(z[0] - a[0], 3)} · Δy ${fmt(z[1] - a[1], 3)} · ${fmt((Math.atan2(z[1] - a[1], z[0] - a[0]) * 180) / Math.PI, 2)}°`);
      setPontos([]); return;
    }
    if (f === 'mover' && novos.length === 2) {
      const dx = +(novos[1][0] - novos[0][0]).toFixed(4), dy = +(novos[1][1] - novos[0][1]).toFixed(4);
      const sel = selecionados();
      const cmds = [
        ...(sel.pilares.length ? [{ nome: 'pilar.mover', params: { ids: sel.pilares, dx, dy } }] : []),
        ...(sel.vigas.length ? [{ nome: 'viga.mover', params: { ids: sel.vigas, dx, dy } }] : []),
        ...sel.eixos.map((id) => { const e = b.eixos.find((x) => x.id === id)!; return { nome: 'eixo.editar', params: { id, p1: [e.p1[0] + dx, e.p1[1] + dy], p2: [e.p2[0] + dx, e.p2[1] + dy] } }; }),
      ];
      if (cmds.length) exec('lote', { comandos: cmds });
      setPontos([]); return;
    }
    if (f === 'alinhar' && novos.length === 4) {
      const m = b.mascaras.find((x) => x.grupo === grupo);
      if (m) exec('mascara.alinhar', { id: m.id, de: [novos[0], novos[2]], para: [novos[1], novos[3]], escalar: pl.alinharEscala });
      setPontos([]); usePlanta.getState().set({ ferramenta: 'selecionar' }); return;
    }
    setPontos(novos);
  };

  /** Enter/duplo clique: termina a polilinha da ferramenta atual. */
  const terminar = (pts: P2[] = pontos) => {
    const f = usePlanta.getState().ferramenta, tc = usePlanta.getState().tipoCarga;
    const q = pts.map((x) => [+x[0].toFixed(4), +x[1].toFixed(4)]);
    if (f === 'viga') { terminarViga(pts); return; }
    if (f === 'laje' && pts.length >= 3) exec('laje.criar', { grupo, contorno: q, tipo: pl.tipoLaje });
    if (f === 'carga' && tc === 'linha' && pts.length >= 2) exec('carga.linha', { grupo, pontos: q, valor: pl.valorCarga, caso: pl.caso });
    if (f === 'carga' && tc === 'area' && pts.length >= 3) exec('carga.area', { grupo, contorno: q, valor: pl.valorCarga, caso: pl.caso });
    setPontos([]);
  };
  const terminarViga = (pts: P2[] = pontos) => {
    if (pts.length >= 2) exec('viga.tracar', { grupo, pontos: pts.map((q) => [+q[0].toFixed(4), +q[1].toFixed(4)]), secao: pl.secaoViga, alinhamento: pl.alinhamento, invertida: pl.invertida });
    setPontos([]);
  };

  const escolher = (w: P2, aditivo: boolean) => {
    const tol = 6 / vista!.k;
    let id: string | null = null;
    for (const q of [...naPlanta].reverse()) if (q.estado !== 'inferior' && dentro(w, q.contorno)) { id = q.p.id; break; }
    if (!id) for (const { v, t } of [...vigas].reverse()) if (t.some((r) => dentro(w, r))) { id = v.id; break; }
    if (!id) for (const c of cargas) if (c.tipo === 'ponto' ? Math.hypot(w[0] - c.pontos[0][0], w[1] - c.pontos[0][1]) < tol * 1.5 : c.tipo === 'linha' ? c.pontos.some((q, i) => i > 0 && distSeg(w, c.pontos[i - 1], q) < tol) : false) { id = c.id; break; }
    if (!id) for (const e of b.eixos) if (distSeg(w, e.p1, e.p2) < tol) { id = e.id; break; }
    if (!id) for (const c of cargas) if (c.tipo === 'area' && dentro(w, c.pontos)) { id = c.id; break; }
    if (!id) for (const { l } of lajes) if (dentro(w, l.contorno)) { id = l.id; break; }
    const s = new Set(aditivo ? pl.selecao : []);
    if (id) { if (aditivo && s.has(id)) s.delete(id); else s.add(id); }
    pl.set({ selecao: s });
  };

  const selecionarJanela = (a: P2, z: P2) => {
    const cruz = z[0] < a[0];
    const x0 = Math.min(a[0], z[0]), x1 = Math.max(a[0], z[0]), y0 = Math.min(a[1], z[1]), y1 = Math.max(a[1], z[1]);
    const inside = (p: P2) => p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1;
    const s = new Set<string>();
    for (const q of naPlanta) if (q.estado !== 'inferior' && (cruz ? q.contorno.some(inside) || dentro([x0, y0], q.contorno) : q.contorno.every(inside))) s.add(q.p.id);
    for (const e of b.eixos) if (cruz ? inside(e.p1) || inside(e.p2) || cruzaRet(e.p1, e.p2, x0, y0, x1, y1) : inside(e.p1) && inside(e.p2)) s.add(e.id);
    for (const { l } of lajes) if (cruz ? l.contorno.some(inside) : l.contorno.every(inside)) s.add(l.id);
    for (const c of cargas) if (cruz ? c.pontos.some(inside) : c.pontos.every(inside)) s.add(c.id);
    for (const { v, t } of vigas) {
      const cantos = t.flat();
      const cr = v.pontos.some((q, i) => i > 0 && cruzaRet(v.pontos[i - 1], q, x0, y0, x1, y1));
      if (cruz ? cantos.some(inside) || cr : cantos.every(inside)) s.add(v.id);
    }
    pl.set({ selecao: s });
    msg(`${s.size} elemento(s) selecionado(s).`);
  };

  // ---- eventos ----
  const onDown = (e: React.PointerEvent) => {
    const r = cvI.current!.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    e.preventDefault(); // sem seleção de texto da página durante o arraste
    (document.activeElement as HTMLElement | null)?.blur?.();
    cvI.current!.setPointerCapture(e.pointerId);
    if (e.button === 1 || (e.button === 0 && it.current.espaco)) { it.current.pan = { x: sx, y: sy, v: { ...vista! } }; return; }
    if (e.button === 2) { if (['viga', 'laje', 'carga'].includes(pl.ferramenta)) terminar(); else setPontos([]); return; }
    if (e.button !== 0) return;
    capturar(sx, sy);
    if (pl.ferramenta === 'selecionar') { it.current.janela = { a: paraMundo(sx, sy), z: paraMundo(sx, sy) }; return; }
    agir(it.current.ponto);
  };
  const onMove = (e: React.PointerEvent) => {
    const r = cvI.current!.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    const s = it.current;
    if (s.pan) { pl.set({ vista: { ...s.pan.v, ox: s.pan.v.ox + sx - s.pan.x, oy: s.pan.v.oy + sy - s.pan.y } }); return; }
    if (s.janela) s.janela.z = paraMundo(sx, sy);
    capturar(sx, sy);
    const t0 = performance.now();
    desenharInteracao();
    registrarQuadro(performance.now() - t0);
  };
  const onUp = (e: React.PointerEvent) => {
    const s = it.current;
    if (s.pan) { s.pan = null; desenharMascara(false); return; }
    if (s.janela) {
      const [ax, ay] = paraTela(...s.janela.a), [zx, zy] = paraTela(...s.janela.z);
      if (Math.hypot(zx - ax, zy - ay) > 4) selecionarJanela(s.janela.a, s.janela.z);
      else escolher(s.janela.a, e.shiftKey);
      s.janela = null;
      desenharInteracao();
    }
  };
  useEffect(() => {
    const el = cvI.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = usePlanta.getState().vista;
      if (!v) return;
      const r = el.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
      const f = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015));
      const k = Math.min(5000, Math.max(0.5, v.k * f)), q = k / v.k;
      ultimoZoom.current = performance.now();
      usePlanta.getState().set({ vista: { k, ox: sx - (sx - v.ox) * q, oy: sy - (sy - v.oy) * q } });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // teclado da planta
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useStore.getState().module !== 'edificio') return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const P = usePlanta.getState(), k = e.key;
      const espera = P.ferramenta !== 'selecionar';
      if (k === ' ') { it.current.espaco = e.type === 'keydown'; e.preventDefault(); return; }
      if (e.type !== 'keydown') return;
      if (espera && /^[\d@\-+.,;<]$/.test(k)) { setPosDig([...it.current.tela]); setDigitando(k); e.preventDefault(); return; }
      if (k === 'Enter' && ['viga', 'laje', 'carga'].includes(P.ferramenta)) { terminar(); return; }
      if (P.ferramenta === 'viga' && k.toLowerCase() === 'a') { const o = ['centro', 'esq', 'dir'] as const; P.set({ alinhamento: o[(o.indexOf(P.alinhamento) + 1) % 3] }); msg(`Alinhamento: ${({ centro: 'eixo', esq: 'face esquerda', dir: 'face direita' })[o[(o.indexOf(P.alinhamento) + 1) % 3]]}.`); return; }
      const ferr: Record<string, Ferramenta> = { s: 'selecionar', p: 'pilar', v: 'viga', l: 'laje', c: 'carga', e: 'eixo', m: 'mover', d: 'medir' };
      if (ferr[k.toLowerCase()]) { P.set({ ferramenta: ferr[k.toLowerCase()] }); setPontos([]); return; }
      if (k === 'Escape') { if (pontos.length) setPontos([]); else P.set({ ferramenta: 'selecionar', selecao: new Set() }); return; }
      if (k === 'Tab') { e.preventDefault(); const s = it.current; s.ciclo++; s.cap = s.caps.length ? s.caps[s.ciclo % s.caps.length] : null; if (s.cap) s.ponto = [s.cap.x, s.cap.y]; desenharInteracao(); return; }
      if (k === 'F8') { e.preventDefault(); P.set({ orto: !P.orto }); msg(`Ortogonal ${P.orto ? 'desligado' : 'ligado'}.`); return; }
      if (k === 'F10') { e.preventDefault(); P.set({ polar: !P.polar }); msg(`Polar ${P.polar ? 'desligado' : 'ligado'}.`); return; }
      if (k.toLowerCase() === 'f') { enquadrar(); return; }
      if (P.ferramenta === 'pilar' && k.toLowerCase() === 'r') { P.set({ angulo: (P.angulo + 90) % 360 }); return; }
      if (P.ferramenta === 'pilar' && k.toLowerCase() === 'a') { const o = ['c', 'so', 's', 'se', 'l', 'ne', 'n', 'no', 'o'] as const; P.set({ ajuste: o[(o.indexOf(P.ajuste) + 1) % o.length] }); return; }
      if ((k === 'Delete' || k === 'Backspace') && P.selecao.size) {
        const sel = selecionados();
        const cmds = [...(sel.pilares.length ? [{ nome: 'pilar.remover', params: { ids: sel.pilares } }] : []), ...(sel.vigas.length ? [{ nome: 'viga.remover', params: { ids: sel.vigas } }] : []), ...(sel.eixos.length ? [{ nome: 'eixo.remover', params: { ids: sel.eixos } }] : []),
          ...(sel.lajes.length ? [{ nome: 'laje.remover', params: { ids: sel.lajes } }] : []), ...(sel.cargas.length ? [{ nome: 'carga.remover', params: { ids: sel.cargas } }] : [])];
        if (cmds.length) exec('lote', { comandos: cmds });
        P.set({ selecao: new Set() });
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); };
  });

  const confirmarDigitado = () => {
    const p = pontoDigitado(digitando ?? '', pontos.at(-1) ?? null, it.current.cursor);
    setDigitando(null);
    if (!p) { msg('Entrada inválida: use x;y, @dx;dy, @d<ângulo ou uma distância.'); return; }
    it.current.ponto = p;
    agir(p);
  };

  const passo = PASSOS[pl.ferramenta][Math.min(pontos.length, PASSOS[pl.ferramenta].length - 1)];
  return (
    <div className="planta">
      <div ref={wrap} className="planta-cv" data-tema={pl.tema} onContextMenu={(e) => e.preventDefault()}>
        <canvas ref={cvM} />
        <canvas ref={cvE} />
        <canvas ref={cvI} className="int" data-ferramenta={pl.ferramenta} aria-label="Planta do pavimento" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
          onPointerLeave={() => { it.current.cap = null; desenharInteracao(); }}
          onDoubleClick={() => { if (['viga', 'laje', 'carga'].includes(pl.ferramenta)) terminar(pontos.slice(0, -1).length >= 2 ? pontos.slice(0, -1) : pontos); }} />
        {digitando !== null && (
          <input className="digita" autoFocus aria-label="Valor digitado" style={{ left: posDig[0] + 16, top: posDig[1] + 12 }} value={digitando}
            onChange={(e) => setDigitando(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') confirmarDigitado(); if (e.key === 'Escape') setDigitando(null); e.stopPropagation(); }} onBlur={() => setDigitando(null)} />
        )}
      </div>
      <div className="planta-st">
        <span ref={statusRef} className="num">—</span>
        <span className="muted">{passo}</span>
      </div>
    </div>
  );
}

function cruzaRet(a: P2, z: P2, x0: number, y0: number, x1: number, y1: number) {
  const lados: [P2, P2][] = [[[x0, y0], [x1, y0]], [[x1, y0], [x1, y1]], [[x1, y1], [x0, y1]], [[x0, y1], [x0, y0]]];
  const cr = (p: P2, q: P2, r: P2) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  return lados.some(([c, d]) => cr(a, z, c) * cr(a, z, d) < 0 && cr(c, d, a) * cr(c, d, z) < 0);
}
