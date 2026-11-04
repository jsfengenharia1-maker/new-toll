// Ferramentas Alinhar e Deslocar paralelo na planta (L9): escolha da referência e do elemento sob o cursor (Tab alterna entre
// referências sobrepostas), realce, cadeados e a prévia do deslocamento. O cálculo é dos comandos `editar.alinhar`,
// `restricao.alinhamento` e `editar.deslocar`; aqui só a interação, com o estado fora do React (muda a cada movimento do mouse).
import { candidatosRef, resolverRef, segmentoRef, type CandidatoRef, type Pt, type RefAlinh } from '../../core/geom/referencias';
import { deslocarPolilinha, type BuildingModel, type Laje, type Pilar, type Viga } from '../../core/building/types';
import type { Paleta } from './plantaStore';

export interface EntradaAlinhar {
  b: BuildingModel;
  pilares: Pilar[];
  vigas: Viga[];
  lajes: Laje[];
  grupo: string;
  cursor: Pt;
  /** pixels por metro */
  k: number;
  selecao: Set<string>;
}
export interface OpcoesAlinhar { multiplo: boolean; travar: boolean; distancia: number; copiar: boolean; modo: 'digitar' | 'grafico' }
type Exec = (nome: string, params: Record<string, unknown>) => { ok: boolean };
type Msg = (m: string) => void;

interface ElementoDeslocar { tipo: 'viga' | 'parede' | 'eixo'; id: string; pts: Pt[] }
const E = {
  ref: null as CandidatoRef | null,
  ciclo: 0,
  /** Último elemento alinhado e ainda sem trava: o cadeado aberto na linha trava com um clique. */
  ultimo: null as null | { ref: RefAlinh; alvo: RefAlinh },
  desl: null as null | ElementoDeslocar[],
  zonas: [] as { x: number; y: number; r: number; acao: () => void }[],
};

export function reiniciarAlinhar() { E.ref = null; E.ciclo = 0; E.ultimo = null; E.desl = null; E.zonas = []; }
export const alinharComReferencia = () => !!E.ref;
export const deslocarComElemento = () => !!E.desl;
/** Tab: passa ao próximo candidato sob o cursor. */
export function ciclarAlinhar() { E.ciclo++; }

const RAIO_PX = 8;
const raio = (e: EntradaAlinhar) => RAIO_PX / (e.k || 1);

/** Candidatos sob o cursor: referências (1º clique) ou pilar/viga a alinhar (2º clique; só os centros paralelos à referência). */
function lista(e: EntradaAlinhar): CandidatoRef[] {
  const dado = { pilares: e.pilares, vigas: e.vigas, lajes: e.lajes, eixos: e.b.eixos, mascaras: e.b.mascaras.filter((m) => m.visivel !== false && (m.grupo === e.grupo || m.grupos?.includes(e.grupo))) };
  if (!E.ref) return candidatosRef(dado, e.cursor, raio(e));
  const r = resolverRef(e.b, E.ref.ref);
  return candidatosRef(dado, e.cursor, raio(e), { alvo: true }).filter((c) => {
    if (c.ref.k !== 'pilar' || (c.ref.parte !== 'cx' && c.ref.parte !== 'cy')) return true;
    const a = resolverRef(e.b, c.ref);
    return !!r && !!a && Math.abs(r.u[0] * a.u[1] - r.u[1] * a.u[0]) < 1e-4;
  });
}
const escolhido = (l: CandidatoRef[]) => (l.length ? l[E.ciclo % l.length] : null);

const dist = (p: Pt, a: Pt, z: Pt) => {
  const dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy, u = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
  return Math.hypot(a[0] + u * dx - p[0], a[1] + u * dy - p[1]);
};
const distPoli = (p: Pt, pts: Pt[]) => Math.min(...pts.slice(1).map((q, i) => dist(p, pts[i], q)));

/** Clique da ferramenta Alinhar. */
export function agirAlinhar(e: EntradaAlinhar, o: OpcoesAlinhar, exec: Exec, msg: Msg): void {
  const c = escolhido(lista(e));
  if (!E.ref) {
    if (!c) { msg('Clique na referência: face de pilar ou viga, eixo, centro, linha do gabarito ou borda de laje (Tab alterna as sobrepostas).'); return; }
    E.ref = c; E.ciclo = 0; E.ultimo = null;
    msg(`Referência: ${c.rotulo}. Clique na face, no eixo ou no centro do pilar ou da viga a alinhar (Tab alterna).`);
    return;
  }
  if (!c || (c.ref.k !== 'pilar' && c.ref.k !== 'viga')) { msg('Clique na face, no eixo ou no centro de um pilar ou viga.'); return; }
  const ref = E.ref.ref;
  const r = exec('editar.alinhar', { ref, alvo: c.ref, travar: o.travar });
  E.ciclo = 0;
  if (!r.ok) return;
  E.ultimo = o.travar ? null : { ref, alvo: c.ref };
  if (!o.multiplo) E.ref = null;
}

function elementoSob(e: EntradaAlinhar): ElementoDeslocar | null {
  const tol = raio(e);
  let melhor: ElementoDeslocar | null = null, dm = tol;
  const testa = (el: ElementoDeslocar) => { const d = distPoli(e.cursor, el.pts); if (d <= dm) { dm = d; melhor = el; } };
  for (const v of e.vigas) testa({ tipo: 'viga', id: v.id, pts: v.pontos as Pt[] });
  for (const w of e.b.paredes ?? []) testa({ tipo: 'parede', id: w.id, pts: w.pontos as Pt[] });
  for (const x of e.b.eixos) testa({ tipo: 'eixo', id: x.id, pts: [x.p1, x.p2] });
  return melhor;
}
const geometriaDe = (e: EntradaAlinhar, a: { tipo: string; id: string }): Pt[] | null => {
  if (a.tipo === 'viga') return (e.b.vigas.find((x) => x.id === a.id)?.pontos as Pt[]) ?? null;
  if (a.tipo === 'parede') return (e.b.paredes?.find((x) => x.id === a.id)?.pontos as Pt[]) ?? null;
  const x = e.b.eixos.find((q) => q.id === a.id);
  return x ? [x.p1, x.p2] : null;
};

/** Distância (m) e lado do cursor em relação ao 1º elemento escolhido: no modo gráfico a distância é a do cursor ao traçado. */
function medidaDeslocar(e: EntradaAlinhar, o: OpcoesAlinhar): { d: number; lado: 1 | -1 } | null {
  const pts = E.desl && geometriaDe(e, E.desl[0]);
  if (!pts) return null;
  const a = pts[0], z = pts[1], L = Math.hypot(z[0] - a[0], z[1] - a[1]) || 1;
  const s = ((e.cursor[1] - a[1]) * (z[0] - a[0]) - (e.cursor[0] - a[0]) * (z[1] - a[1])) / L;
  return { d: o.modo === 'grafico' ? Math.round(Math.abs(s) * 100) / 100 : o.distancia, lado: s >= 0 ? 1 : -1 };
}

/** Clique da ferramenta Deslocar paralelo: 1º o elemento (ou a seleção de vigas, paredes e eixos), 2º o lado (e a distância no modo gráfico). */
export function agirDeslocar(e: EntradaAlinhar, o: OpcoesAlinhar, exec: Exec, msg: Msg): void {
  if (!E.desl) {
    const el = elementoSob(e);
    if (!el) { msg('Clique numa viga, parede ou eixo (ou selecione e clique num deles).'); return; }
    const sel = e.selecao.has(el.id);
    const todos: ElementoDeslocar[] = sel
      ? [...e.vigas.filter((v) => e.selecao.has(v.id)).map((v) => ({ tipo: 'viga' as const, id: v.id, pts: v.pontos as Pt[] })), ...(e.b.paredes ?? []).filter((w) => e.selecao.has(w.id)).map((w) => ({ tipo: 'parede' as const, id: w.id, pts: w.pontos as Pt[] })), ...e.b.eixos.filter((x) => e.selecao.has(x.id)).map((x) => ({ tipo: 'eixo' as const, id: x.id, pts: [x.p1, x.p2] }))]
      : [el];
    E.desl = [el, ...todos.filter((t) => t.id !== el.id)];
    msg(o.modo === 'grafico' ? 'Clique onde o elemento deve ficar (a distância é a do clique ao traçado).' : `Clique do lado para onde deslocar ${String(o.distancia).replace('.', ',')} m.`);
    return;
  }
  const m = medidaDeslocar(e, o);
  if (!m || m.d < 1e-3) { msg('Distância nula: afaste o cursor do traçado.'); return; }
  const por = (t: ElementoDeslocar['tipo']) => E.desl!.filter((x) => x.tipo === t).map((x) => x.id);
  const r = exec('editar.deslocar', { vigas: por('viga'), paredes: por('parede'), eixos: por('eixo'), distancia: m.d, ponto: [+e.cursor[0].toFixed(4), +e.cursor[1].toFixed(4)], copiar: o.copiar });
  if (r.ok) E.desl = null;
}

// ---------------------------------------------------------------- desenho

function traco(ctx: CanvasRenderingContext2D, pts: Pt[], paraTela: (x: number, y: number) => Pt) {
  ctx.beginPath();
  pts.forEach((q, i) => { const [x, y] = paraTela(q[0], q[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
  ctx.stroke();
}
function cadeado(ctx: CanvasRenderingContext2D, x: number, y: number, fechado: boolean, cor: string) {
  ctx.save();
  ctx.strokeStyle = cor; ctx.fillStyle = cor; ctx.lineWidth = 1.6; ctx.setLineDash([]);
  ctx.fillRect(x - 5, y - 1, 10, 8);
  ctx.beginPath();
  if (fechado) ctx.arc(x, y - 1, 3.5, Math.PI, 0); else { ctx.arc(x + 4, y - 3, 3.5, Math.PI, 0.2 * Math.PI); }
  ctx.stroke();
  ctx.restore();
}
const meio = (s: [Pt, Pt]): Pt => [(s[0][0] + s[1][0]) / 2, (s[0][1] + s[1][1]) / 2];

/** Realces e cadeados da ferramenta ativa (`alinharElem` ou `deslocar`), sobre a camada de interação. */
export function desenharAlinhar(ctx: CanvasRenderingContext2D, ferramenta: 'alinharElem' | 'deslocar', e: EntradaAlinhar, o: OpcoesAlinhar, paraTela: (x: number, y: number) => Pt, cores: Paleta, exec: Exec): void {
  E.zonas = [];
  ctx.save();
  ctx.font = '11px system-ui, sans-serif';
  const [cx, cy] = paraTela(e.cursor[0], e.cursor[1]);
  if (ferramenta === 'alinharElem') {
    if (E.ref) {
      const seg = segmentoRef(e.b, E.ref.ref);
      if (seg) {
        const [x1, y1] = paraTela(...seg[0]), [x2, y2] = paraTela(...seg[1]), L = Math.hypot(x2 - x1, y2 - y1) || 1;
        ctx.strokeStyle = cores.guia; ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
        ctx.beginPath(); ctx.moveTo(x1 - ((x2 - x1) / L) * 4000, y1 - ((y2 - y1) / L) * 4000); ctx.lineTo(x1 + ((x2 - x1) / L) * 4000, y1 + ((y2 - y1) / L) * 4000); ctx.stroke();
        ctx.setLineDash([]); ctx.lineWidth = 3; traco(ctx, seg, paraTela);
      }
    }
    const l = lista(e), c = escolhido(l);
    if (c) {
      ctx.strokeStyle = E.ref ? cores.selecao : cores.aviso; ctx.lineWidth = 3; ctx.setLineDash([]);
      traco(ctx, c.seg, paraTela);
      ctx.fillStyle = cores.cota;
      ctx.fillText(`${c.rotulo}${l.length > 1 ? ` · Tab ${(E.ciclo % l.length) + 1}/${l.length}` : ''}`, cx + 12, cy - 10);
    }
    // cadeados: fechado nas travas existentes (destrava), aberto no último alinhado (trava)
    for (const r of e.b.restricoes ?? []) {
      const s = segmentoRef(e.b, r.alvo);
      if (!s) continue;
      const [x, y] = paraTela(...meio(s));
      cadeado(ctx, x, y - 12, true, cores.guia);
      E.zonas.push({ x, y: y - 10, r: 10, acao: () => { exec('restricao.alinhamento', { alvo: r.alvo, remover: true }); } });
    }
    if (E.ultimo) {
      const u = E.ultimo, s = segmentoRef(e.b, u.alvo);
      if (s && !(e.b.restricoes ?? []).some((r) => JSON.stringify(r.alvo) === JSON.stringify(u.alvo))) {
        const [x, y] = paraTela(...meio(s));
        cadeado(ctx, x, y - 12, false, cores.aviso);
        E.zonas.push({ x, y: y - 10, r: 10, acao: () => { if (exec('restricao.alinhamento', { ref: u.ref, alvo: u.alvo }).ok) E.ultimo = null; } });
      }
    }
  } else {
    if (!E.desl) {
      const el = elementoSob(e);
      if (el) { ctx.strokeStyle = cores.aviso; ctx.lineWidth = 3; traco(ctx, el.pts, paraTela); }
    } else {
      ctx.strokeStyle = cores.selecao; ctx.lineWidth = 3;
      for (const el of E.desl) { const g = geometriaDe(e, el); if (g) traco(ctx, g, paraTela); }
      const m = medidaDeslocar(e, o);
      if (m && m.d > 1e-3) {
        ctx.strokeStyle = cores.guia; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
        for (const el of E.desl) { const g = geometriaDe(e, el); if (!g) continue; const a = g[0], z = g[1]; const s = ((e.cursor[1] - a[1]) * (z[0] - a[0]) - (e.cursor[0] - a[0]) * (z[1] - a[1])) >= 0 ? m.d : -m.d; traco(ctx, deslocarPolilinha(g, s), paraTela); }
        ctx.setLineDash([]); ctx.fillStyle = cores.cota;
        ctx.fillText(`${String(Math.round(m.d * 1000) / 1000).replace('.', ',')} m${o.copiar ? ' (cópia)' : ''}`, cx + 12, cy - 10);
      }
    }
  }
  ctx.restore();
}

/** Clique num cadeado desenhado? (as zonas da ferramenta Alinhar; true se tratou o clique.) */
export function cliqueNoCadeado(sx: number, sy: number): boolean {
  const z = E.zonas.find((q) => Math.hypot(q.x - sx, q.y - sy) <= q.r);
  if (!z) return false;
  z.acao();
  return true;
}
