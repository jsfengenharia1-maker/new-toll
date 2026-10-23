// Cotas temporárias (L6): ao selecionar um elemento da planta, as distâncias até o vizinho mais próximo em cada uma das quatro
// direções (eixos do próprio elemento) e as dimensões da seção. O valor é editável: o selecionado anda e a referência fica
// parada (comando `cota.mover`). Núcleo puro; o índice espacial de caixas (Flatbush) é montado uma vez por modelo e planta.
import Flatbush from 'flatbush';
import {
  anguloNoLance, contornoPilar, deslocarPolilinha, dimsSecao, geoLance, lanceNoPavimento, pavimentosDoGrupo, trechosViga,
  type BuildingModel, type ElemCota, type RefCota,
} from '../building/types';
import { chaveElem, dirCota, nomeElem, offsetDoPonto, resolverRef } from '../building/cotas';

type P = [number, number];
const dot = (a: P, b: P) => a[0] * b[0] + a[1] * b[1];
const r9 = (v: number) => +v.toFixed(9);
const TOL = 1e-6;
/** Máximo de cotas temporárias (quatro direções mais as dimensões da seção) e de candidatos por consulta. */
export const MAX_COTAS_TEMP = 6;
export const MAX_CANDIDATOS = 200;

/** Parte medida: a face voltada para o outro elemento ou o eixo/centro. */
export type ModoRef = 'face' | 'eixo';
/** Referência padrão por classe de elemento (decisão do usuário, 23/10/2026: face; eixo e centro por Tab). */
export interface PadraoRefTemp { selecionado: ModoRef; vizinho: ModoRef }
export const PADRAO_REF_TEMP: PadraoRefTemp = { selecionado: 'face', vizinho: 'face' };
/** Troca de referência feita pelo usuário (memória de sessão): por par selecionado|vizinho. */
export type RefTemp = Record<string, { sel?: ModoRef; viz?: ModoRef }>;
export const alternarModo = (m: ModoRef): ModoRef => (m === 'face' ? 'eixo' : 'face');
export const chavePar = (alvo: ElemCota, viz: ElemCota) => `${chaveElem(alvo)}|${chaveElem(viz)}`;

interface Item { elem: ElemCota; pts: P[] }
/** Elementos da planta do grupo para a busca de vizinhos. */
export interface IndiceCotasTemp {
  grupo: string;
  itens: Item[];
  eixos: { elem: ElemCota; p: P; dir: P }[];
  arvore: Flatbush | null;
}

const caixaDe = (pts: P[]): [number, number, number, number] => {
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};
const valorPav = (b: BuildingModel, id: string) => (id === 'fundacao' ? -Infinity : b.pavimentos.find((p) => p.id === id)?.cota ?? 0);

/** Índice dos elementos que aparecem na planta do grupo (pilares do lance, vigas, paredes, aberturas, fundações e eixos). */
export function indiceCotasTemp(b: BuildingModel, grupo: string): IndiceCotasTemp {
  const itens: Item[] = [];
  const pav = pavimentosDoGrupo(b, grupo)[0];
  if (pav) {
    for (const p of b.pilares) {
      const lance = lanceNoPavimento(b, p, pav.id);
      if (!lance) continue;
      const g = geoLance(p, lance);
      itens.push({ elem: { tipo: 'pilar', id: p.id }, pts: contornoPilar(g.p, g.secao) });
    }
    for (const w of b.paredes ?? []) {
      if (!(valorPav(b, w.nasce) <= pav.cota && valorPav(b, w.morre) >= pav.cota)) continue;
      itens.push({ elem: { tipo: 'parede', id: w.id }, pts: [...deslocarPolilinha(w.pontos, w.esq), ...deslocarPolilinha(w.pontos, -w.dir)] as P[] });
    }
  }
  for (const v of b.vigas) if (v.grupo === grupo) itens.push({ elem: { tipo: 'viga', id: v.id }, pts: trechosViga(v).flat() as P[] });
  for (const f of b.fundacao?.elementos ?? []) {
    const hx = (f.impostas?.A ?? 0.5) / 2, hy = (f.impostas?.B ?? 0.5) / 2, a = (f.angulo * Math.PI) / 180, cs = Math.cos(a), sn = Math.sin(a);
    itens.push({ elem: { tipo: 'fundacao', id: f.id }, pts: ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([i, j]) => [f.x + i * hx * cs - j * hy * sn, f.y + i * hx * sn + j * hy * cs] as P) });
  }
  const eixos = b.eixos.map((e) => {
    const L = Math.hypot(e.p2[0] - e.p1[0], e.p2[1] - e.p1[1]) || 1;
    return { elem: { tipo: 'eixo', id: e.id } as ElemCota, p: e.p1 as P, dir: [(e.p2[0] - e.p1[0]) / L, (e.p2[1] - e.p1[1]) / L] as P };
  });
  let arvore: Flatbush | null = null;
  if (itens.length) {
    arvore = new Flatbush(itens.length);
    for (const it of itens) { const [x0, y0, x1, y1] = caixaDe(it.pts); arvore.add(x0, y0, x1, y1); }
    arvore.finish();
  }
  return { grupo, itens, eixos, arvore };
}

export interface CotaTemp {
  /** Estável entre consultas: direção + vizinho (ou a dimensão da seção). */
  id: string;
  tipo: 'vizinho' | 'secao';
  /** Direção em relação ao selecionado: +x, −x, +y, −y nos eixos do próprio elemento. */
  dir: 'xp' | 'xn' | 'yp' | 'yn';
  /** Pontos medidos (sobre a linha que passa pelo centro do selecionado) e valor (m). */
  a: P; z: P; valor: number;
  /** Vetor unitário do selecionado para o vizinho (cota de vizinho) ou ao longo da dimensão. */
  sentido: P;
  /** Direção da medida (graus, [0, 180)) em que as referências abaixo valem. */
  angulo: number;
  alvo: ElemCota; junto: ElemCota[];
  vizinho?: ElemCota;
  /** Referências para fixar a cota (ausentes com vários selecionados). */
  refSel?: RefCota; refViz?: RefCota;
  modoSel: ModoRef; modoViz: ModoRef;
  /** Só as cotas de vizinho movem o selecionado; as dimensões da seção são informativas. */
  editavel: boolean;
}

/** Ângulo (graus) dos eixos do elemento selecionado: o do pilar, o do primeiro trecho de viga e parede; 0 nos demais. */
function anguloDe(b: BuildingModel, grupo: string, e: ElemCota): number {
  if (e.tipo === 'pilar') {
    const p = b.pilares.find((x) => x.id === e.id);
    const pav = pavimentosDoGrupo(b, grupo)[0];
    const lance = p && pav ? lanceNoPavimento(b, p, pav.id) : undefined;
    return p ? (lance ? anguloNoLance(p, lance) : p.angulo) : 0;
  }
  const pts = e.tipo === 'viga' ? b.vigas.find((x) => x.id === e.id)?.pontos : e.tipo === 'parede' ? b.paredes?.find((x) => x.id === e.id)?.pontos : undefined;
  if (pts && pts.length > 1) return (Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]) * 180) / Math.PI;
  if (e.tipo === 'fundacao') return b.fundacao?.elementos.find((x) => x.id === e.id)?.angulo ?? 0;
  return 0;
}

const SENTIDOS = [{ dir: 'xp', g: 0 }, { dir: 'yp', g: 90 }, { dir: 'xn', g: 180 }, { dir: 'yn', g: 270 }] as const;
const modAngulo = (g: number) => ((g % 180) + 180) % 180;

/**
 * Cotas temporárias da seleção (um ou vários elementos): até uma por direção, até o vizinho mais próximo cuja projeção
 * intersecta a sombra do selecionado, mais as dimensões da seção (elemento único). No máximo `MAX_COTAS_TEMP`.
 * Referência padrão: face voltada ao outro elemento (`PADRAO_REF_TEMP`); eixos estruturais sempre pelo eixo e aberturas
 * pelo centro; `refTemp` guarda as trocas do usuário.
 */
export function cotasTemporarias(b: BuildingModel, ind: IndiceCotasTemp, selecao: ElemCota[], padrao: PadraoRefTemp = PADRAO_REF_TEMP, refTemp: RefTemp = {}): CotaTemp[] {
  const grupo = ind.grupo;
  const sel = selecao.filter((e) => e.tipo !== 'eixo' && e.tipo !== 'abertura');
  if (selecao.length === 1 && selecao[0].tipo === 'abertura') return cotasDaAbertura(b, grupo, selecao[0]);
  if (!sel.length) return [];
  const chaves = new Set(sel.map(chaveElem));
  const proprios = ind.itens.filter((i) => chaves.has(chaveElem(i.elem)));
  if (!proprios.length) return [];
  const unico = sel.length === 1;
  const ang0 = unico ? anguloDe(b, grupo, sel[0]) : 0;
  const ptsSel = proprios.flatMap((i) => i.pts);
  const todos = caixaDe(ind.itens.flatMap((i) => i.pts).concat(ind.eixos.map((e) => e.p)));
  const out: CotaTemp[] = [];
  const centroSel: P = ((): P => { const [x0, y0, x1, y1] = caixaDe(ptsSel); return [(x0 + x1) / 2, (y0 + y1) / 2]; })();

  for (const { dir, g } of SENTIDOS) {
    const ga = ang0 + g, s = dirCota(ga), n: P = [-s[1], s[0]];
    const smax = Math.max(...ptsSel.map((q) => dot(s, q))), scen = dot(s, centroSel);
    const ns = ptsSel.map((q) => dot(n, q)), n0 = Math.min(...ns), n1 = Math.max(...ns);
    // faixa: da face do selecionado até o limite da planta, na largura da sombra (caixa que envolve a faixa girada)
    const alcance = Math.hypot(todos[2] - todos[0], todos[3] - todos[1]) + 1;
    const cantos: P[] = [[smax, n0], [smax + alcance, n0], [smax + alcance, n1], [smax, n1]].map(([ss, nn]) => [s[0] * ss + n[0] * nn, s[1] * ss + n[1] * nn] as P);
    const [bx0, by0, bx1, by1] = caixaDe(cantos);
    const idx = ind.arvore ? ind.arvore.search(bx0, by0, bx1, by1) : [];
    let melhor: { viz: ElemCota; dist: number; pts?: P[]; eixoP?: P } | null = null;
    for (const i of idx.slice(0, MAX_CANDIDATOS * 4)) {
      const it = ind.itens[i];
      if (chaves.has(chaveElem(it.elem))) continue;
      const ss = it.pts.map((q) => dot(s, q)), nn = it.pts.map((q) => dot(n, q));
      const smin = Math.min(...ss);
      if (smin <= smax + TOL) continue;
      if (Math.min(n1, Math.max(...nn)) - Math.max(n0, Math.min(...nn)) <= TOL) continue;
      const dist = smin - smax;
      if (!melhor || dist < melhor.dist) melhor = { viz: it.elem, dist, pts: it.pts };
    }
    for (const e of ind.eixos) {
      if (Math.abs(dot(e.dir, s)) > 0.01) continue; // só eixos perpendiculares à direção da medida
      const se = dot(s, e.p);
      if (se <= smax + TOL) continue;
      const dist = se - smax;
      if (!melhor || dist < melhor.dist) melhor = { viz: e.elem, dist, eixoP: e.p };
    }
    if (!melhor) continue;
    const viz = melhor.viz;
    const ang = modAngulo(ga), u = dirCota(ang), sgn = dot(s, u) > 0 ? 1 : -1;
    const par = unico ? chavePar(sel[0], viz) : '';
    const modoSel = refTemp[par]?.sel ?? padrao.selecionado;
    const modoViz = viz.tipo === 'eixo' ? 'eixo' : refTemp[par]?.viz ?? padrao.vizinho;
    // pontos medidos
    let refSel: RefCota | undefined, refViz: RefCota | undefined, a: P, z: P;
    if (unico) {
      refSel = { elem: sel[0], parte: modoSel === 'eixo' ? 'centro' : sgn > 0 ? 'faceB' : 'faceA' };
      refViz = { elem: viz, parte: viz.tipo === 'eixo' ? 'eixo' : modoViz === 'eixo' ? 'centro' : sgn > 0 ? 'faceA' : 'faceB' };
      a = resolverRef(b, grupo, refSel, ang) ?? centroSel;
      z = resolverRef(b, grupo, refViz, ang) ?? centroSel;
    } else {
      const face = smax;
      a = [s[0] * (modoSel === 'eixo' ? scen : face) + n[0] * dot(n, centroSel), s[1] * (modoSel === 'eixo' ? scen : face) + n[1] * dot(n, centroSel)];
      refViz = { elem: viz, parte: viz.tipo === 'eixo' ? 'eixo' : modoViz === 'eixo' ? 'centro' : sgn > 0 ? 'faceA' : 'faceB' };
      z = resolverRef(b, grupo, refViz, ang) ?? a;
      const nz = dot(n, a); // a linha da medida segue a do selecionado
      z = [s[0] * dot(s, z) + n[0] * nz, s[1] * dot(s, z) + n[1] * nz];
    }
    const valor = Math.abs(dot(s, z) - dot(s, a));
    out.push({
      id: `${dir}:${chaveElem(viz)}`, tipo: 'vizinho', dir, a, z, valor: r9(valor), sentido: s, angulo: ang,
      alvo: sel[0], junto: sel.slice(1), vizinho: viz, ...(refSel ? { refSel } : {}), ...(refViz ? { refViz } : {}), modoSel, modoViz, editavel: valor > TOL,
    });
  }

  // dimensões da seção do elemento único (informativas: a seção se edita no painel do elemento)
  if (unico && out.length < MAX_COTAS_TEMP) {
    const e = sel[0];
    const dims = dimensoesDaSecao(b, e);
    if (dims) for (const [k, valor] of dims.entries()) {
      if (out.length >= MAX_COTAS_TEMP) break;
      const ga = ang0 + (k === 0 ? 0 : 90), ang = modAngulo(ga), u = dirCota(ga);
      const a = resolverRef(b, grupo, { elem: e, parte: 'faceA' }, ang), z = resolverRef(b, grupo, { elem: e, parte: 'faceB' }, ang);
      if (!a || !z) continue;
      out.push({ id: `secao:${k}`, tipo: 'secao', dir: k === 0 ? 'xp' : 'yp', a, z, valor: r9(valor), sentido: u, angulo: ang, alvo: e, junto: [], modoSel: 'face', modoViz: 'face', editavel: false });
    }
  }
  return out.slice(0, MAX_COTAS_TEMP);
}

/** Largura e altura da seção em planta (m): pilar b × h (ou d), viga b × (comprimento do primeiro trecho não entra), parede espessura. */
function dimensoesDaSecao(b: BuildingModel, e: ElemCota): number[] | null {
  if (e.tipo === 'pilar') { const p = b.pilares.find((x) => x.id === e.id); return p ? [...dimsSecao(p.secao)] : null; }
  if (e.tipo === 'viga') { const v = b.vigas.find((x) => x.id === e.id); return v ? [v.secao.b] : null; }
  if (e.tipo === 'parede') { const w = b.paredes?.find((x) => x.id === e.id); return w ? [w.esq + w.dir] : null; }
  return null;
}

/** Abertura selecionada: cotas ao longo da parede, até a abertura vizinha ou a ponta da parede de cada lado. */
function cotasDaAbertura(b: BuildingModel, grupo: string, e: ElemCota): CotaTemp[] {
  const w = b.paredes?.find((x) => x.id === e.sub), a = w?.aberturas?.find((x) => x.id === e.id);
  if (!w || !a) return [];
  const out: CotaTemp[] = [];
  const pw: ElemCota = { tipo: 'parede', id: w.id };
  const dirParede = (): P => { const d: P = [w.pontos[1][0] - w.pontos[0][0], w.pontos[1][1] - w.pontos[0][1]]; const l = Math.hypot(d[0], d[1]) || 1; return [d[0] / l, d[1] / l]; };
  const t = dirParede(), ang = modAngulo((Math.atan2(t[1], t[0]) * 180) / Math.PI);
  const outras = (w.aberturas ?? []).filter((x) => x.id !== a.id);
  const antes = outras.filter((x) => x.s + x.largura <= a.s + TOL).sort((p, q) => q.s - p.s)[0];
  const depois = outras.filter((x) => x.s >= a.s + a.largura - TOL).sort((p, q) => p.s - q.s)[0];
  const alvo = e;
  const mk = (dir: 'xn' | 'xp', sentido: P, vizElem: ElemCota, parteViz: RefCota['parte'], parteSel: RefCota['parte']) => {
    const refSel: RefCota = { elem: e, parte: parteSel }, refViz: RefCota = { elem: vizElem, parte: parteViz };
    const aa = resolverRef(b, grupo, refSel, ang), zz = resolverRef(b, grupo, refViz, ang);
    if (!aa || !zz) return;
    const u = dirCota(ang);
    out.push({ id: `${dir}:${chaveElem(vizElem)}`, tipo: 'vizinho', dir, a: aa, z: zz, valor: r9(Math.abs(dot(u, zz) - dot(u, aa))), sentido, angulo: ang, alvo, junto: [], vizinho: vizElem, refSel, refViz, modoSel: 'face', modoViz: 'face', editavel: true });
  };
  mk('xn', [-t[0], -t[1]], antes ? { tipo: 'abertura', id: antes.id, sub: w.id } : pw, antes ? 'faceB' : 'extremoI', 'faceA');
  mk('xp', t, depois ? { tipo: 'abertura', id: depois.id, sub: w.id } : pw, depois ? 'faceA' : 'extremoJ', 'faceB');
  return out;
}

/**
 * Deslocamento do selecionado para a cota passar a valer `novoValor` (m): o selecionado anda e a referência fica parada.
 * Aumentar o valor afasta o selecionado do vizinho.
 */
export function deltaDaCotaTemp(c: CotaTemp, novoValor: number): P {
  const d = c.valor - novoValor;
  return [r9(c.sentido[0] * d), r9(c.sentido[1] * d)];
}

/** Parâmetros do comando `cota.mover` que aplica o novo valor da cota temporária. */
export function paramsMoverCotaTemp(c: CotaTemp, novoValor: number) {
  const fixos = c.vizinho && c.vizinho.tipo !== 'eixo' ? [c.vizinho] : [];
  return { alvo: c.alvo, ...(c.junto.length ? { junto: c.junto } : {}), delta: deltaDaCotaTemp(c, novoValor), ...(fixos.length ? { fixos } : {}) };
}

/** Parâmetros do comando `cota.criar` que fixa a cota temporária como permanente (null com vários selecionados ou na seção). */
export function paramsFixarCotaTemp(grupo: string, c: CotaTemp, afastamento = 0.5) {
  if (c.tipo !== 'vizinho' || !c.refSel || !c.refViz) return null;
  const meio: P = [(c.a[0] + c.z[0]) / 2, (c.a[1] + c.z[1]) / 2];
  return { grupo, refs: [c.refSel, c.refViz], linha: { angulo: c.angulo, offset: r9(offsetDoPonto(c.angulo, meio) + afastamento) } };
}

/** Rótulo curto da cota temporária (mensagens): "P1 → P2 (470 cm)". */
export const rotuloCotaTemp = (b: BuildingModel, c: CotaTemp) => `${nomeElem(b, c.alvo)}${c.vizinho ? ` → ${nomeElem(b, c.vizinho)}` : ''} (${Math.round(c.valor * 100)} cm)`;
