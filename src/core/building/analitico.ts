// Gerador do modelo analítico (função pura): grelha de lajes e vigas por pavimento e pórtico espacial
// com diafragma rígido. Modelo "separado" (premissa 20): as lajes são resolvidas na grelha e as forças
// que elas passam às vigas viram cargas do pórtico, junto com o peso das vigas, das paredes e dos pilares.
import { concrete } from '../concrete';
import { resolver3, type Barra3, type Caso3, type Modelo3, type Resultado3, type V3 } from '../fe3d';
import { areaPoligono, dentroPoligono, pontoInterno, type P } from '../geom/faces';
import { GAMA_CONCRETO, TRELICADAS, eixosDasVigas } from './lajes';
import { casosVento, type CasoVento, type Classe } from './vento';
import {
  centroPilar, contornoPilar, cotaFundacao, dimsSecao, lancesDoPilar, pavimentosOrdenados, secaoNoLance,
  type BuildingModel, type Laje, type Pilar, type SecaoPilar, type Viga,
} from './types';

export interface OpcoesAnalise {
  /** Espaçamento da malha da grelha (m). */
  malha: number;
  /** Fator sobre J = 2I das barras de laje (premissa 23). */
  torcaoLaje: number;
  /** Fator sobre a rigidez à torção elástica das vigas (NBR 6118: 15 %). */
  torcaoViga: number;
  /** Multiplicador da área dos pilares nas ações verticais (premissa 25). */
  axialPilares: number;
  /** Trecho rígido da viga: até a face do pilar menos `trechoRigido` × h (premissa 22). */
  trechoRigido: number;
  nu: number;
}

export const OPCOES_PADRAO: OpcoesAnalise = { malha: 0.5, torcaoLaje: 0.15, torcaoViga: 0.15, axialPilares: 2, trechoRigido: 0.3, nu: 0.2 };

export type CasoAnalise = 'G' | 'Q';
export const CASOS: CasoAnalise[] = ['G', 'Q'];

// ---------------- malha da laje ----------------

/** Malha de uma laje: linhas paralelas às direções da laje, recortadas pelo contorno. */
export function malhaLaje(contorno: P[], direcao: number, s: number) {
  const a = (direcao * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a);
  const loc = (p: P): P => [p[0] * c + p[1] * sn, -p[0] * sn + p[1] * c];
  const glob = (p: P): P => [p[0] * c - p[1] * sn, p[0] * sn + p[1] * c];
  const pol = contorno.map(loc);
  const xs = pol.map((p) => p[0]), ys = pol.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const nx = Math.max(2, Math.round((x1 - x0) / s)), ny = Math.max(2, Math.round((y1 - y0) / s));
  const sx = (x1 - x0) / nx, sy = (y1 - y0) / ny;
  const X = Array.from({ length: nx - 1 }, (_, i) => x0 + (i + 1) * sx), Y = Array.from({ length: ny - 1 }, (_, j) => y0 + (j + 1) * sy);
  /** Trechos internos da reta (coordenada fixa `v` no eixo `eixo`) dentro do polígono. */
  const cortes = (eixo: 0 | 1, v: number): [number, number][] => {
    const t: number[] = [];
    for (let i = 0; i < pol.length; i++) {
      const p = pol[i], q = pol[(i + 1) % pol.length];
      if ((p[eixo] > v) !== (q[eixo] > v)) t.push(p[1 - eixo] + ((v - p[eixo]) * (q[1 - eixo] - p[1 - eixo])) / (q[eixo] - p[eixo]));
    }
    t.sort((u, w) => u - w);
    const out: [number, number][] = [];
    for (let k = 0; k + 1 < t.length; k += 2) if (t[k + 1] - t[k] > 1e-6) out.push([t[k], t[k + 1]]);
    return out;
  };
  // linhas: dir = 0 → paralela a x local (direção da laje); 1 → paralela a y local
  const linhas: { dir: 0 | 1; largura: number; pontos: P[]; borda: [boolean, boolean] }[] = [];
  for (const y of Y) for (const [a0, a1] of cortes(1, y)) {
    const ps = [a0, ...X.filter((x) => x > a0 + 1e-9 && x < a1 - 1e-9), a1];
    linhas.push({ dir: 0, largura: sy, pontos: ps.map((x) => glob([x, y])), borda: [true, true] });
  }
  for (const x of X) for (const [a0, a1] of cortes(0, x)) {
    const ps = [a0, ...Y.filter((y) => y > a0 + 1e-9 && y < a1 - 1e-9), a1];
    linhas.push({ dir: 1, largura: sx, pontos: ps.map((y) => glob([x, y])), borda: [true, true] });
  }
  // faixas junto ao contorno (meia malha) que as linhas internas não cobrem: área por direção
  const A = Math.abs(areaPoligono(contorno));
  const banda = [0, 1].map((d) => Math.max(0, A - linhas.filter((l) => l.dir === d).reduce((s1, l) => s1 + l.largura * comp(l.pontos), 0)));
  // contorno dividido nas pontas das linhas (nós de borda)
  const pontasBorda = linhas.flatMap((l) => [l.pontos[0], l.pontos[l.pontos.length - 1]]);
  const bordas: { a: P; z: P }[] = [];
  for (let i = 0; i < contorno.length; i++) {
    const a = contorno[i], z = contorno[(i + 1) % contorno.length], L = Math.hypot(z[0] - a[0], z[1] - a[1]);
    if (L < 1e-9) continue;
    const ts = [0, 1, ...pontasBorda.map((p) => {
      const t = ((p[0] - a[0]) * (z[0] - a[0]) + (p[1] - a[1]) * (z[1] - a[1])) / (L * L);
      const q: P = [a[0] + t * (z[0] - a[0]), a[1] + t * (z[1] - a[1])];
      return t > 1e-9 && t < 1 - 1e-9 && Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-6 ? t : -1;
    }).filter((t) => t > 0)].sort((u, w) => u - w);
    for (let k = 0; k + 1 < ts.length; k++) if ((ts[k + 1] - ts[k]) * L > 1e-6)
      bordas.push({ a: [a[0] + ts[k] * (z[0] - a[0]), a[1] + ts[k] * (z[1] - a[1])], z: [a[0] + ts[k + 1] * (z[0] - a[0]), a[1] + ts[k + 1] * (z[1] - a[1])] });
  }
  /** Carga por comprimento de cada borda para receber a faixa da direção d (proporcional a |borda · direção|). */
  const u = [[c, sn], [-sn, c]];
  const pesoBorda = [0, 1].map((d) => {
    const soma = bordas.reduce((s1, e) => s1 + Math.abs((e.z[0] - e.a[0]) * u[d][0] + (e.z[1] - e.a[1]) * u[d][1]), 0);
    return bordas.map((e) => { const L = Math.hypot(e.z[0] - e.a[0], e.z[1] - e.a[1]); return soma ? (banda[d] * Math.abs(((e.z[0] - e.a[0]) * u[d][0] + (e.z[1] - e.a[1]) * u[d][1]) / L)) / soma : 0; });
  });
  return { linhas, bordas, pesoBorda, sx, sy };
}
const comp = (ps: P[]) => ps.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - ps[i][0], p[1] - ps[i][1]), 0);

// ---------------- propriedades ----------------

const ret = (b: number, h: number) => ({ A: b * h, I: (b * h ** 3) / 12, J: torcaoRet(b, h) });
/** Constante de torção de retângulo (aproximação de Saint-Venant). */
export function torcaoRet(b: number, h: number) {
  const a = Math.max(b, h), c = Math.min(b, h);
  return a * c ** 3 * (1 / 3 - 0.21 * (c / a) * (1 - c ** 4 / (12 * a ** 4)));
}
/** Inércia de seção T (mesa bf × hf, alma bw, altura total h) em torno do centróide. */
function inerciaT(bf: number, hf: number, bw: number, h: number) {
  const A1 = bf * hf, A2 = bw * (h - hf), y1 = h - hf / 2, y2 = (h - hf) / 2, yc = (A1 * y1 + A2 * y2) / (A1 + A2);
  return (bf * hf ** 3) / 12 + A1 * (y1 - yc) ** 2 + (bw * (h - hf) ** 3) / 12 + A2 * (y2 - yc) ** 2;
}

/** Inércias do pilar em torno dos eixos globais X e Y (seção girada de `angulo`). */
export function inerciasPilar(s: SecaoPilar, angulo: number): { Ix: number; Iy: number; Iu: number; Iv: number; A: number; J: number } {
  if (s.tipo === 'circ') { const I = (Math.PI * s.d ** 4) / 64; return { Ix: I, Iy: I, Iu: I, Iv: I, A: (Math.PI * s.d ** 2) / 4, J: 2 * I }; }
  const Iu = (s.h * s.b ** 3) / 12, Iv = (s.b * s.h ** 3) / 12; // Iu: flexão com deslocamento na direção b (local x da seção)
  const a = (angulo * Math.PI) / 180, c2 = Math.cos(2 * a);
  // em torno de X global (deslocamento em Y) e de Y global (deslocamento em X)
  const Iy = (Iu + Iv) / 2 + ((Iu - Iv) / 2) * c2, Ix = (Iu + Iv) / 2 - ((Iu - Iv) / 2) * c2;
  return { Ix, Iy, Iu, Iv, A: s.b * s.h, J: torcaoRet(s.b, s.h) };
}

// ---------------- geometria comum: nós das vigas por pavimento ----------------

interface NoPlanta { p: P; viga: boolean; pilar?: string }
interface TrechoViga { viga: Viga; a: number; z: number } // índices dos nós

/** Divide os eixos das vigas nos pontos dados (interseções, bordas da malha e apoios). */
function dividirVigas(vigas: Viga[], eixos: [P, P][], extras: P[], tol = 0.005) {
  const nos: NoPlanta[] = [];
  const hash = new Map<string, number[]>();
  /** Nó existente a até `tol` de p, ou um novo (marcado como da viga ou só da laje). */
  const achar = (p: P, viga = true) => {
    const gx = Math.round(p[0] / tol), gy = Math.round(p[1] / tol);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const i of hash.get(`${gx + dx}:${gy + dy}`) ?? []) if (Math.hypot(nos[i].p[0] - p[0], nos[i].p[1] - p[1]) <= tol) return i;
    nos.push({ p: [p[0], p[1]], viga });
    const k = `${gx}:${gy}`;
    hash.set(k, [...(hash.get(k) ?? []), nos.length - 1]);
    return nos.length - 1;
  };
  // eixos já ajustados (pontas no eixo da viga de apoio): uma entrada por trecho de viga, na mesma ordem
  const trechos: TrechoViga[] = [];
  let k = 0;
  for (const v of vigas) for (let i = 0; i + 1 < v.pontos.length; i++) {
    const [a, z] = eixos[k++];
    const L = Math.hypot(z[0] - a[0], z[1] - a[1]);
    if (L < tol) continue;
    const ts = new Set<number>([0, 1]);
    const marca = (p: P) => {
      const t = ((p[0] - a[0]) * (z[0] - a[0]) + (p[1] - a[1]) * (z[1] - a[1])) / (L * L);
      const q: P = [a[0] + t * (z[0] - a[0]), a[1] + t * (z[1] - a[1])];
      if (t > -1e-9 && t < 1 + 1e-9 && Math.hypot(q[0] - p[0], q[1] - p[1]) <= tol) ts.add(Math.min(1, Math.max(0, t)));
    };
    for (const [c, f] of eixos) { // interseções com outros eixos
      const r = [z[0] - a[0], z[1] - a[1]], sv = [f[0] - c[0], f[1] - c[1]], den = r[0] * sv[1] - r[1] * sv[0];
      if (Math.abs(den) < 1e-12) continue;
      const t = ((c[0] - a[0]) * sv[1] - (c[1] - a[1]) * sv[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
      if (t > -1e-9 && t < 1 + 1e-9 && u > -1e-9 && u < 1 + 1e-9) ts.add(Math.min(1, Math.max(0, t)));
    }
    for (const p of extras) marca(p);
    const lista = [...ts].sort((x, y) => x - y).filter((t, j, arr) => j === 0 || (t - arr[j - 1]) * L > tol);
    const ids = lista.map((t) => achar([a[0] + t * (z[0] - a[0]), a[1] + t * (z[1] - a[1])]));
    for (let j = 0; j + 1 < ids.length; j++) if (ids[j] !== ids[j + 1]) trechos.push({ viga: v, a: ids[j], z: ids[j + 1] });
  }
  return { nos, trechos, achar };
}

/** Ponto do eixo da viga mais próximo do centro do pilar, se estiver dentro da seção. */
function pontoApoio(trechos: TrechoViga[], nos: NoPlanta[], pil: Pilar, sec: SecaoPilar): P[] {
  const cont = contornoPilar(pil, sec), c = centroPilar(pil, sec);
  const out: P[] = [];
  for (const t of trechos) {
    const a = nos[t.a].p, z = nos[t.z].p, dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy;
    const u = Math.max(0, Math.min(1, ((c[0] - a[0]) * dx + (c[1] - a[1]) * dy) / L2));
    const q: P = [a[0] + u * dx, a[1] + u * dy];
    if (dentroPoligono(q, cont) || Math.hypot(q[0] - c[0], q[1] - c[1]) < 1e-6) out.push(q);
  }
  return out;
}

// ---------------- análise ----------------

export interface BarraGrelha { tipo: 'laje' | 'viga'; ref: string; dir?: 0 | 1; largura?: number }
export interface GrelhaPavimento {
  pavimento: string;
  modelo: Modelo3;
  barras: BarraGrelha[];
  res: Resultado3 | null;
  /** Reações verticais (kN, para cima) por pilar e caso. */
  reacoes: Record<string, Record<CasoAnalise, number>>;
  carga: Record<CasoAnalise, number>;
}

export interface BarraPortico { tipo: 'viga' | 'pilar'; ref: string; pavimento: string }
export interface AnaliseEdificio {
  erro?: string;
  avisos: string[];
  opcoes: OpcoesAnalise;
  grelhas: GrelhaPavimento[];
  portico: { modelo: Modelo3; barras: BarraPortico[]; mestres: Record<string, number>; res: Resultado3 | null; resVento?: Resultado3 | null; casos?: Caso3[]; casosVento?: Caso3[] };
  /** Esforços na base de cada pilar por caso (G, Q, W…; kN, kN·m; N > 0 compressão). */
  fundacao: { pilar: string; caso: string; N: number; Vx: number; Vy: number; Mx: number; My: number }[];
  /** Vento (NBR 6123) e estabilidade global (γz por direção, com rigidez reduzida). */
  vento: { classe: Classe; altura: number; casos: CasoVento[]; gamaZ: { direcao: number; ventoPrincipal: number; usoPrincipal: number; max: number; ampliacao: number }[] } | null;
  /** Carga vertical característica por pavimento (kN), usada no γz. */
  cargasPavimento: Record<string, Record<CasoAnalise, number>>;
  /** Carga vertical total por caso (kN). */
  totais: Record<CasoAnalise, number>;
  gdl: number;
  ms: number;
}

export function analisarEdificio(b: BuildingModel, o: Partial<OpcoesAnalise> = {}): AnaliseEdificio {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const op = { ...OPCOES_PADRAO, ...o };
  const cc = concrete(b.norma.fck);
  const E = cc.Ecs * 1000, G = E / (2 * (1 + op.nu)); // kN/m²
  const avisos: string[] = [];
  const ps = pavimentosOrdenados(b);
  const vazio: AnaliseEdificio = { avisos, opcoes: op, grelhas: [], portico: { modelo: { nos: [], barras: [], apoios: new Map() }, barras: [], mestres: {}, res: null }, fundacao: [], vento: null, cargasPavimento: {}, totais: { G: 0, Q: 0 }, gdl: 0, ms: 0 };
  if (!ps.length) return { ...vazio, erro: 'A obra não tem pavimentos.' };
  if (!b.pilares.length) return { ...vazio, erro: 'A obra não tem pilares.' };

  // ---- grelhas (uma por pavimento) e geometria das vigas reaproveitada no pórtico ----
  const grelhas: GrelhaPavimento[] = [];
  const geoPav = new Map<string, { nos: NoPlanta[]; grosso: { nos: NoPlanta[]; trechos: TrechoViga[] }; apoio: Map<number, string>; transf: Record<CasoAnalise, Map<number, number[]>> }>();
  const totais: Record<CasoAnalise, number> = { G: 0, Q: 0 };
  const cargasPavimento: Record<string, Record<CasoAnalise, number>> = Object.fromEntries(ps.map((p) => [p.id, { G: 0, Q: 0 }]));
  for (const [ip, pav] of ps.entries()) {
    const grupo = b.grupos.find((g) => g.id === pav.grupo)!;
    const vigas = b.vigas.filter((v) => v.grupo === grupo.id);
    const lajes = b.lajes.filter((l) => l.grupo === grupo.id);
    const cargas = b.cargas.filter((c) => c.grupo === grupo.id);
    const pilares = b.pilares.filter((p) => lancesDoPilar(b, p).some((x) => x.id === pav.id));
    const malhas = lajes.map((l) => ({ l, m: malhaLaje(l.contorno, l.tipo.tipo === 'trelicada' ? l.direcao ?? 0 : direcaoPrincipal(l.contorno), op.malha) }));
    // pontos das bordas das malhas e apoios dos pilares dividem as vigas
    const eixos = eixosDasVigas(b, grupo.id) as [P, P][];
    const extras: P[] = [];
    for (const { m } of malhas) for (const ln of m.linhas) extras.push(ln.pontos[0], ln.pontos[ln.pontos.length - 1]);
    const pre = dividirVigas(vigas, eixos, extras);
    const apoiosP: P[] = [];
    for (const p of pilares) apoiosP.push(...pontoApoio(pre.trechos, pre.nos, p, secaoNoLance(p, pav.id)));
    const { nos, trechos, achar } = apoiosP.length ? dividirVigas(vigas, eixos, [...extras, ...apoiosP]) : pre;
    // divisão grossa (só cruzamentos e apoios) para o pórtico: as cargas da grelha entram como concentradas nas barras
    const grosso = dividirVigas(vigas, eixos, apoiosP);
    for (const p of pilares) for (const q of pontoApoio(grosso.trechos, grosso.nos, p, secaoNoLance(p, pav.id))) grosso.nos[grosso.achar(q)].pilar = p.id;
    // apoio: nó da viga dentro do pilar (o primeiro recebe as molas de rotação)
    const apoio = new Map<number, string>();
    const semViga: Pilar[] = [];
    for (const p of pilares) {
      const pts = pontoApoio(trechos, nos, p, secaoNoLance(p, pav.id));
      if (!pts.length) { semViga.push(p); continue; }
      for (const q of pts) { const i = achar(q); nos[i].pilar = p.id; apoio.set(i, p.id); }
    }
    // pilares sem viga no pavimento: nó próprio (recebe a laje se estiver dentro dela)
    for (const p of semViga) { const i = achar(centroPilar(p, secaoNoLance(p, pav.id)), false); nos[i].pilar = p.id; apoio.set(i, p.id); }

    // modelo da grelha
    const m: Modelo3 = { nos: [], barras: [], apoios: new Map(), molas: [] };
    const tags: BarraGrelha[] = [];
    const idx = new Map<number, number>(); // nó da planta → nó da grelha
    const no = (i: number) => { if (!idx.has(i)) { idx.set(i, m.nos.length); m.nos.push([nos[i].p[0], nos[i].p[1], 0]); } return idx.get(i)!; };
    const casos: Caso3[] = CASOS.map(() => ({ nodais: [], distribuidas: [] }));
    const carregar = (c: CasoAnalise, f: (cs: Caso3) => void) => f(casos[CASOS.indexOf(c)]);
    const ppBarra = new Map<number, number>(); // barra de viga → peso próprio (kN/m)
    for (const t of trechos) {
      const v = t.viga, s = ret(v.secao.b, v.secao.h);
      m.barras.push({ i: no(t.a), j: no(t.z), E, G, A: s.A, Iz: s.I, Iy: (v.secao.h * v.secao.b ** 3) / 12, J: op.torcaoViga * s.J });
      tags.push({ tipo: 'viga', ref: v.id });
      const pp = GAMA_CONCRETO * v.secao.b * v.secao.h;
      ppBarra.set(m.barras.length - 1, pp);
      carregar('G', (cs) => cs.distribuidas.push({ barra: m.barras.length - 1, q: [0, 0, -pp] }));
    }
    for (const { l, m: mm } of malhas) {
      const prop = propLaje(l, mm.sx, mm.sy, op);
      const areaG = lajeG(l) + grupo.gRev, areaQ = grupo.q;
      for (const ln of mm.linhas) {
        const k = ln.dir;
        const share = l.tipo.tipo === 'trelicada' ? (k === 0 ? 1 : 0) : 0.5;
        const ids = ln.pontos.map((p) => achar(p, false));
        for (let j = 0; j + 1 < ids.length; j++) {
          if (ids[j] === ids[j + 1]) continue;
          const pr = prop[k];
          m.barras.push({ i: no(ids[j]), j: no(ids[j + 1]), E, G, A: pr.A, Iz: pr.I, Iy: pr.A * 0.01, J: pr.J });
          tags.push({ tipo: 'laje', ref: l.id, dir: k, largura: ln.largura });
          const bi = m.barras.length - 1, w = ln.largura * share;
          if (!w) continue;
          // cargas de área: grupo + regiões de carga que contêm o meio da barra
          const mid: P = [(nos[ids[j]].p[0] + nos[ids[j + 1]].p[0]) / 2, (nos[ids[j]].p[1] + nos[ids[j + 1]].p[1]) / 2];
          let g = areaG, q = areaQ;
          for (const c of cargas) if (c.tipo === 'area' && dentroPoligono(mid, c.pontos)) { if (c.caso === 'G') g += c.valor; else q += c.valor; }
          carregar('G', (cs) => cs.distribuidas.push({ barra: bi, q: [0, 0, -g * w] }));
          carregar('Q', (cs) => cs.distribuidas.push({ barra: bi, q: [0, 0, -q * w] }));
        }
      }
      if (!mm.linhas.length) avisos.push(`${l.nome}: malha vazia.`);
      // bordas: a faixa junto ao contorno vai para os nós da borda; borda livre (sem viga) ganha barra de meia faixa
      const sobreViga = (p: P) => trechos.some((t) => { const a = nos[t.a].p, z = nos[t.z].p, dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy; const u = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0; return Math.hypot(a[0] + u * dx - p[0], a[1] + u * dy - p[1]) < 0.01; });
      mm.bordas.forEach((e, k) => {
        const L = Math.hypot(e.z[0] - e.a[0], e.z[1] - e.a[1]), mid: P = [(e.a[0] + e.z[0]) / 2, (e.a[1] + e.z[1]) / 2];
        const sh = l.tipo.tipo === 'trelicada' ? [1, 0] : [0.5, 0.5];
        const larg = mm.pesoBorda[0][k] * sh[0] + mm.pesoBorda[1][k] * sh[1]; // m² de faixa por m de borda
        if (!larg) return;
        let g = areaG, q = areaQ;
        for (const c of cargas) if (c.tipo === 'area' && dentroPoligono(mid, c.pontos)) { if (c.caso === 'G') g += c.valor; else q += c.valor; }
        const ia = no(achar(e.a, false)), iz = no(achar(e.z, false));
        for (const [cs, v] of [['G', g], ['Q', q]] as const) carregar(cs, (x) => { x.nodais.push({ no: ia, f: [0, 0, (-v * larg * L) / 2, 0, 0, 0] }, { no: iz, f: [0, 0, (-v * larg * L) / 2, 0, 0, 0] }); });
        if (!sobreViga(mid)) {
          const w = Math.min(mm.sx, mm.sy) / 2, h = l.tipo.tipo === 'macica' ? l.tipo.h : l.tipo.capa, I = (w * h ** 3) / 12;
          m.barras.push({ i: ia, j: iz, E, G, A: w * h, Iz: I, Iy: I, J: op.torcaoLaje * 2 * I });
          tags.push({ tipo: 'laje', ref: l.id, largura: w });
        }
      });
    }
    // cargas de linha (paredes) e de ponto: discretizadas no nó mais próximo da grelha
    const maisProximo = (p: P) => { let best = -1, d = Infinity; for (const [i, gi] of idx) { const dd = Math.hypot(nos[i].p[0] - p[0], nos[i].p[1] - p[1]); if (dd < d) { d = dd; best = gi; } } return best; };
    for (const c of cargas) {
      if (c.tipo === 'area') continue;
      const pts: { p: P; f: number }[] = [];
      if (c.tipo === 'ponto') pts.push({ p: c.pontos[0], f: c.valor });
      else for (let k = 0; k + 1 < c.pontos.length; k++) {
        const a = c.pontos[k], z = c.pontos[k + 1], L = Math.hypot(z[0] - a[0], z[1] - a[1]), n = Math.max(1, Math.ceil(L / (op.malha / 2)));
        for (let s = 0; s < n; s++) { const t = (s + 0.5) / n; pts.push({ p: [a[0] + t * (z[0] - a[0]), a[1] + t * (z[1] - a[1])], f: (c.valor * L) / n }); }
      }
      for (const { p, f } of pts) { const gi = maisProximo(p); if (gi >= 0) carregar(c.caso, (cs) => cs.nodais.push({ no: gi, f: [0, 0, -f, 0, 0, 0] })); }
    }
    // apoios: w preso nos pilares, molas de rotação com 4EI/L dos lances de baixo e de cima
    for (let gi = 0; gi < m.nos.length; gi++) m.apoios.set(gi, [0, 1, 5]);
    const comMola = new Set<string>();
    for (const [i, pid] of apoio) {
      const gi = no(i);
      m.apoios.set(gi, [0, 1, 2, 5]);
      if (comMola.has(pid)) continue;
      comMola.add(pid);
      const pil = b.pilares.find((x) => x.id === pid)!;
      let kx = 0, ky = 0;
      const abaixo = ip > 0 ? ps[ip - 1].cota : cotaFundacao(b);
      const hBaixo = pav.cota - abaixo, sb = inerciasPilar(secaoNoLance(pil, pav.id), pil.angulo);
      kx += (4 * E * sb.Ix) / hBaixo; ky += (4 * E * sb.Iy) / hBaixo;
      const acima = ps[ip + 1];
      if (acima && lancesDoPilar(b, pil).some((x) => x.id === acima.id)) { const sa = inerciasPilar(secaoNoLance(pil, acima.id), pil.angulo); kx += (4 * E * sa.Ix) / (acima.cota - pav.cota); ky += (4 * E * sa.Iy) / (acima.cota - pav.cota); }
      m.molas!.push({ no: gi, gdl: 3, k: kx }, { no: gi, gdl: 4, k: ky });
    }
    const carga: Record<CasoAnalise, number> = { G: 0, Q: 0 };
    casos.forEach((cs, ic) => {
      let s = 0;
      for (const d of cs.distribuidas) { const br = m.barras[d.barra], a = m.nos[br.i], z = m.nos[br.j]; s += -d.q[2] * Math.hypot(z[0] - a[0], z[1] - a[1]); }
      for (const n of cs.nodais) s += -n.f[2];
      carga[CASOS[ic]] = s;
    });
    let res: Resultado3 | null = null;
    const reacoes: Record<string, Record<CasoAnalise, number>> = {};
    const transf: Record<CasoAnalise, Map<number, number[]>> = { G: new Map(), Q: new Map() };
    if (m.barras.length) {
      res = resolver3(m, casos);
      if (res.erro) avisos.push(`${pav.nome}: ${res.erro}`);
      else {
        for (const [i, pid] of apoio) {
          const r = CASOS.map((_, ic) => res!.reacoes[ic].get(no(i))![2]);
          reacoes[pid] ??= { G: 0, Q: 0 };
          CASOS.forEach((c, ic) => (reacoes[pid][c] += r[ic]));
        }
        // forças das lajes sobre os nós das vigas (e cargas aplicadas nesses nós) → cargas do pórtico
        const gidx = new Map([...idx].map(([i, gi]) => [gi, i]));
        CASOS.forEach((c, ic) => {
          const f = new Map<number, number[]>();
          m.barras.forEach((br, bi) => {
            if (tags[bi].tipo !== 'laje') return;
            const e = res!.esforcos[ic][bi];
            for (const [noG, off] of [[br.i, 0], [br.j, 6]] as const) {
              const i = gidx.get(noG)!;
              if (!nos[i].viga && !apoio.has(i)) continue;
              const g = paraGlobal(m, br, e, off); // força que o nó faz na barra
              const acc = f.get(i) ?? [0, 0, 0, 0, 0, 0];
              for (let k = 0; k < 6; k++) acc[k] -= g[k]; // a laje empurra o nó
              f.set(i, acc);
            }
          });
          for (const n of casos[ic].nodais) { const i = gidx.get(n.no)!; if (!nos[i].viga && !apoio.has(i)) continue; const acc = f.get(i) ?? [0, 0, 0, 0, 0, 0]; n.f.forEach((v, k) => (acc[k] += v)); f.set(i, acc); }
          transf[c] = f;
        });
      }
    } else avisos.push(`${pav.nome}: sem vigas nem lajes (só pilares).`);
    totais.G += carga.G; totais.Q += carga.Q;
    cargasPavimento[pav.id].G += carga.G; cargasPavimento[pav.id].Q += carga.Q;
    grelhas.push({ pavimento: pav.id, modelo: m, barras: tags, res, reacoes, carga });
    geoPav.set(pav.id, { nos, grosso, apoio, transf });
  }

  // ---- pórtico espacial ----
  const pm: Modelo3 = { nos: [], barras: [], apoios: new Map(), escravos: [] };
  const ptags: BarraPortico[] = [];
  const mestres: Record<string, number> = {};
  const zf = cotaFundacao(b);
  // nós dos pilares por nível (base na fundação)
  const noPilar = new Map<string, number>(); // `${pilar}|${pav ou 'base'}`
  for (const p of b.pilares) {
    const l = lancesDoPilar(b, p);
    if (!l.length) continue;
    const c = centroPilar(p, p.secao);
    const i0 = ps.findIndex((x) => x.id === l[0].id);
    const base = i0 === 0 ? zf : ps[i0 - 1].cota;
    const baseKey = p.nasce === 'fundacao' ? `${p.id}|base` : `${p.id}|${p.nasce}`;
    noPilar.set(baseKey, pm.nos.length); pm.nos.push([c[0], c[1], base]);
    pm.apoios.set(noPilar.get(baseKey)!, [0, 1, 2, 3, 4, 5]);
    if (p.nasce !== 'fundacao') avisos.push(`${p.nome} nasce em ${ps.find((x) => x.id === p.nasce)?.nome}: transição ainda não modelada (apoio fixo provisório).`);
    for (const x of l) {
      const sx = secaoNoLance(p, x.id);
      const cx = centroPilar(p, sx);
      noPilar.set(`${p.id}|${x.id}`, pm.nos.length); pm.nos.push([cx[0], cx[1], x.cota]);
    }
  }
  const casosV: Caso3[] = CASOS.map(() => ({ nodais: [], distribuidas: [], pontuais: [] }));
  for (const p of b.pilares) {
    const l = lancesDoPilar(b, p);
    let ant = noPilar.get(p.nasce === 'fundacao' ? `${p.id}|base` : `${p.id}|${p.nasce}`);
    for (const x of l) {
      const sx = secaoNoLance(p, x.id), inr = inerciasPilar(sx, p.angulo), j = noPilar.get(`${p.id}|${x.id}`)!;
      const a = (p.angulo * Math.PI) / 180;
      // eixo local y = direção b da seção (Iz: deslocamento em y local)
      pm.barras.push({ i: ant!, j, E, G, A: inr.A, Iz: inr.Iu, Iy: inr.Iv, J: inr.J, ref: [Math.cos(a), Math.sin(a), 0] });
      ptags.push({ tipo: 'pilar', ref: p.id, pavimento: x.id });
      // peso próprio do lance no nó de cima
      const [w, h] = dimsSecao(sx), area = sx.tipo === 'circ' ? (Math.PI * w * w) / 4 : w * h;
      const H = pm.nos[j][2] - pm.nos[ant!][2];
      casosV[0].nodais.push({ no: j, f: [0, 0, -GAMA_CONCRETO * area * H, 0, 0, 0] });
      totais.G += GAMA_CONCRETO * area * H;
      cargasPavimento[x.id].G += GAMA_CONCRETO * area * H;
      ant = j;
    }
  }
  // vigas por pavimento (divisão grossa), com trecho rígido até a face do pilar menos 0,3h
  for (const pav of ps) {
    const g0 = geoPav.get(pav.id)!, g = g0.grosso;
    const z = pav.cota;
    const local = new Map<number, number>();
    const noViga = (i: number) => {
      const pid = g.nos[i].pilar;
      if (pid && noPilar.has(`${pid}|${pav.id}`)) return noPilar.get(`${pid}|${pav.id}`)!;
      if (!local.has(i)) { local.set(i, pm.nos.length); pm.nos.push([g.nos[i].p[0], g.nos[i].p[1], z]); }
      return local.get(i)!;
    };
    /** Barra do pórtico de cada trecho grosso: índice, início da parte flexível e direção (para cargas concentradas). */
    const barraDe = new Map<number, { bi: number; ini: P; u: P; L: number } | { no: number }>();
    g.trechos.forEach((t, ti) => {
      const v = t.viga, s = ret(v.secao.b, v.secao.h), pp = GAMA_CONCRETO * v.secao.b * v.secao.h;
      const ni = noViga(t.a), nj = noViga(t.z);
      const Lt = Math.hypot(g.nos[t.z].p[0] - g.nos[t.a].p[0], g.nos[t.z].p[1] - g.nos[t.a].p[1]);
      if (ni === nj) { casosV[0].nodais.push({ no: ni, f: [0, 0, -pp * Lt, 0, 0, 0] }); barraDe.set(ti, { no: ni }); return; } // dentro do pilar
      const barra: Barra3 = { i: ni, j: nj, E, G, A: s.A, Iz: s.I, Iy: (v.secao.h * v.secao.b ** 3) / 12, J: op.torcaoViga * s.J };
      for (const [k, i, outro] of [['I', t.a, t.z], ['J', t.z, t.a]] as const) {
        const pid = g.nos[i].pilar;
        if (!pid) continue;
        const pil = b.pilares.find((x) => x.id === pid)!;
        const off = offsetFace(g.nos[i].p, g.nos[outro].p, pil, secaoNoLance(pil, pav.id), op.trechoRigido * v.secao.h, pm.nos[k === 'I' ? ni : nj]);
        if (off) { if (k === 'I') barra.offI = off; else barra.offJ = off; }
      }
      const daViga = g.trechos.filter((x) => x.viga === v);
      if (v.vinculoIni === 'articulado' && t === daViga[0]) barra.libI = [4, 5];
      if (v.vinculoFim === 'articulado' && t === daViga.at(-1)) barra.libJ = [4, 5];
      pm.barras.push(barra);
      ptags.push({ tipo: 'viga', ref: v.id, pavimento: pav.id });
      const bi = pm.barras.length - 1;
      casosV[0].distribuidas.push({ barra: bi, q: [0, 0, -pp] });
      // a carga distribuída atua só na parte flexível: o peso dos trechos rígidos vai para o nó do pilar
      const nI = pm.nos[ni], nJ = pm.nos[nj], oI = barra.offI ?? [0, 0, 0], oJ = barra.offJ ?? [0, 0, 0];
      const ini: P = [nI[0] + oI[0], nI[1] + oI[1]], fim: P = [nJ[0] + oJ[0], nJ[1] + oJ[1]];
      const Lflex = Math.hypot(fim[0] - ini[0], fim[1] - ini[1]);
      const rigI = barra.offI ? Math.hypot(oI[0], oI[1]) : 0, rigJ = barra.offJ ? Math.hypot(oJ[0], oJ[1]) : 0;
      const falta = Math.max(0, Lt - Lflex), tot = rigI + rigJ || 1;
      if (falta > 1e-9) { if (rigI) casosV[0].nodais.push({ no: ni, f: [0, 0, (-pp * falta * rigI) / tot, 0, 0, 0] }); if (rigJ) casosV[0].nodais.push({ no: nj, f: [0, 0, (-pp * falta * rigJ) / tot, 0, 0, 0] }); }
      barraDe.set(ti, { bi, ini, u: [(fim[0] - ini[0]) / Lflex, (fim[1] - ini[1]) / Lflex], L: Lflex });
    });
    // forças que as lajes passam às vigas (nós da grelha): no nó grosso, no pilar ou concentradas na barra
    const achaGrosso = (p: P) => g.nos.findIndex((n) => Math.hypot(n.p[0] - p[0], n.p[1] - p[1]) <= 0.005);
    CASOS.forEach((c, ic) => {
      for (const [i, f] of g0.transf[c]) {
        const p = g0.nos[i].p, pid = g0.apoio.get(i);
        if (pid && noPilar.has(`${pid}|${pav.id}`)) { casosV[ic].nodais.push({ no: noPilar.get(`${pid}|${pav.id}`)!, f }); continue; }
        const k = achaGrosso(p);
        if (k >= 0) { casosV[ic].nodais.push({ no: noViga(k), f }); continue; }
        let melhor = -1, dm = Infinity;
        g.trechos.forEach((t, ti) => {
          const a = g.nos[t.a].p, zz = g.nos[t.z].p, dx = zz[0] - a[0], dy = zz[1] - a[1], L2 = dx * dx + dy * dy;
          const u = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
          const d = Math.hypot(a[0] + u * dx - p[0], a[1] + u * dy - p[1]);
          if (d < dm) { dm = d; melhor = ti; }
        });
        const bd = barraDe.get(melhor);
        if (!bd) continue;
        if ('no' in bd) { casosV[ic].nodais.push({ no: bd.no, f }); continue; }
        const a = (p[0] - bd.ini[0]) * bd.u[0] + (p[1] - bd.ini[1]) * bd.u[1];
        if (a <= 0 || a >= bd.L) { const br = pm.barras[bd.bi]; casosV[ic].nodais.push({ no: a <= 0 ? br.i : br.j, f }); continue; } // no trecho rígido
        (casosV[ic].pontuais ??= []).push({ barra: bd.bi, a, f });
      }
    });
    // diafragma: mestre no centro geométrico das lajes do grupo (ou dos nós do nível)
    const nivel = pm.nos.map((n, i) => [n, i] as const).filter(([n, i]) => Math.abs(n[2] - z) < 1e-6 && !pm.apoios.has(i));
    if (nivel.length >= 2) {
      const lajes = b.lajes.filter((l) => l.grupo === pav.grupo);
      let cx = 0, cy = 0, A = 0;
      for (const l of lajes) { const a = Math.abs(areaPoligono(l.contorno)), c = centroide(l.contorno); cx += c[0] * a; cy += c[1] * a; A += a; }
      if (!A) { for (const [n] of nivel) { cx += n[0]; cy += n[1]; } A = nivel.length; }
      const mi = pm.nos.length;
      pm.nos.push([cx / A, cy / A, z]);
      pm.apoios.set(mi, [2, 3, 4]);
      mestres[pav.id] = mi;
      for (const [, i] of nivel) pm.escravos!.push({ no: i, mestre: mi });
    }
  }
  // cargas verticais: multiplicador axial dos pilares (premissa 25)
  const pmV: Modelo3 = { ...pm, barras: pm.barras.map((br, i) => (ptags[i].tipo === 'pilar' ? { ...br, A: br.A * op.axialPilares } : br)) };
  const res = resolver3(pmV, casosV);
  if (res.erro) return { ...vazio, grelhas, avisos, erro: `Pórtico: ${res.erro}`, portico: { modelo: pm, barras: ptags, mestres, res: null } };
  const fundacao: AnaliseEdificio['fundacao'] = [];
  const bases = b.pilares.map((p) => [p.id, noPilar.get(`${p.id}|base`)] as const).filter((x): x is readonly [string, number] => x[1] !== undefined);
  for (const [pid, k] of bases) CASOS.forEach((c, ic) => { const r = res.reacoes[ic].get(k)!; fundacao.push({ pilar: pid, caso: c, N: r[2], Vx: r[0], Vy: r[1], Mx: r[3], My: r[4] }); });

  // ---- vento: forças nos mestres, pórtico com a área real dos pilares ----
  const pontoAplicacao = (pav: string): number | undefined => mestres[pav] ?? pm.nos.findIndex((n, i) => Math.abs(n[2] - (ps.find((x) => x.id === pav)?.cota ?? NaN)) < 1e-6 && !pm.apoios.has(i));
  const centro = (pav: string): [number, number] => { const i = pontoAplicacao(pav); return i !== undefined && i >= 0 ? [pm.nos[i][0], pm.nos[i][1]] : [0, 0]; };
  const ven = casosVento(b, centro);
  let resVento: Resultado3 | null = null, vento: AnaliseEdificio['vento'] = null, casosW: Caso3[] = [];
  if (ven.casos.length) {
    casosW = ven.casos.map((cv) => ({
      nodais: cv.forcas.flatMap((f) => { const i = pontoAplicacao(f.pavimento); return i !== undefined && i >= 0 ? [{ no: i, f: cv.direcao === 0 || cv.direcao === 180 ? [f.F, 0, 0, 0, 0, f.Mz] : [0, f.F, 0, 0, 0, f.Mz] }] : []; }),
      distribuidas: [],
    }));
    resVento = resolver3(pm, casosW);
    if (resVento.erro) avisos.push(`Vento: ${resVento.erro}`);
    else for (const [pid, k] of bases) ven.casos.forEach((cv, ic) => { const r = resVento!.reacoes[ic].get(k)!; fundacao.push({ pilar: pid, caso: cv.nome, N: r[2], Vx: r[0], Vy: r[1], Mx: r[3], My: r[4] }); });
    // γz com rigidez reduzida (NBR 6118 15.7.3: vigas 0,4·Eci·Ic, pilares 0,8·Eci·Ic)
    const Eci = cc.Eci * 1000, k = Eci / E;
    const pmR: Modelo3 = { ...pm, barras: pm.barras.map((br, i) => { const f = (ptags[i].tipo === 'pilar' ? 0.8 : 0.4) * k; return { ...br, E: br.E * k, G: br.G * k, Iz: br.Iz * f / k, Iy: br.Iy * f / k }; }) };
    const centrados = ven.casos.filter((c) => c.exc === 0);
    const rR = resolver3(pmR, centrados.map((cv) => casosW[ven.casos.indexOf(cv)]));
    const psi0 = b.norma.psiQ?.[0] ?? 0.5;
    const gamaZ = rR.erro ? [] : centrados.map((cv, ic) => {
      const ix = cv.direcao === 0 || cv.direcao === 180 ? 0 : 1, sg = cv.direcao === 0 || cv.direcao === 90 ? 1 : -1;
      let M1 = 0, dV = 0, dU = 0;
      for (const f of cv.forcas) M1 += Math.abs(f.F) * f.z;
      for (const p of ps) {
        const i = pontoAplicacao(p.id);
        if (i === undefined || i < 0) continue;
        const d = sg * rR.desloc[ic][i * 6 + ix], c = cargasPavimento[p.id];
        dV += 1.4 * (c.G + psi0 * c.Q) * d; dU += 1.4 * (c.G + c.Q) * d;
      }
      const gz = (r: number) => (r < 1 ? 1 / (1 - r) : Infinity);
      const vp = M1 ? gz(dV / M1) : 1, up = M1 ? gz(dU / M1) : 1, max = Math.max(vp, up);
      return { direcao: cv.direcao, ventoPrincipal: vp, usoPrincipal: up, max, ampliacao: max > 1.1 ? 0.95 * max : 1 };
    });
    for (const g of gamaZ) if (g.max > 1.3) avisos.push(`γz = ${g.max.toFixed(3).replace('.', ',')} na direção ${g.direcao}°: acima de 1,3 (exige análise de 2ª ordem mais rigorosa; P-Δ 3D na V2).`);
    vento = { classe: ven.classe, altura: ven.altura, casos: ven.casos, gamaZ };
  }
  const ms = (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
  return { avisos, opcoes: op, grelhas, portico: { modelo: pmV, barras: ptags, mestres, res, resVento, casos: casosV, casosVento: casosW }, fundacao, vento, cargasPavimento, totais, gdl: res.neq + grelhas.reduce((s, g) => s + (g.res?.neq ?? 0), 0), ms };
}

// ---------------- auxiliares ----------------

/** Direção principal da laje maciça (a da maior aresta), para alinhar a malha. */
function direcaoPrincipal(c: P[]) {
  let best = 0, L = 0;
  for (let i = 0; i < c.length; i++) { const a = c[i], z = c[(i + 1) % c.length], l = Math.hypot(z[0] - a[0], z[1] - a[1]); if (l > L) { L = l; best = (Math.atan2(z[1] - a[1], z[0] - a[0]) * 180) / Math.PI; } }
  return best;
}

function centroide(p: P[]): P {
  const A = areaPoligono(p);
  if (!A) return pontoInterno(p);
  let cx = 0, cy = 0;
  for (let i = 0; i < p.length; i++) { const a = p[i], z = p[(i + 1) % p.length], c = a[0] * z[1] - z[0] * a[1]; cx += (a[0] + z[0]) * c; cy += (a[1] + z[1]) * c; }
  return [cx / (6 * A), cy / (6 * A)];
}

/** Peso próprio da laje (kN/m²). */
function lajeG(l: Laje) {
  if (l.tipo.tipo === 'macica') return GAMA_CONCRETO * l.tipo.h;
  const c = TRELICADAS[l.tipo.modelo] ?? TRELICADAS.H12;
  return GAMA_CONCRETO * (l.tipo.capa + (c.bw * c.hEnch) / c.intereixo) + 0.2 * (((c.intereixo - c.bw) * c.hEnch) / c.intereixo);
}

/** Propriedades das barras de laje nas duas direções da malha (0: direção da laje; 1: transversal). */
function propLaje(l: Laje, sx: number, sy: number, op: OpcoesAnalise): [{ A: number; I: number; J: number }, { A: number; I: number; J: number }] {
  if (l.tipo.tipo === 'macica') {
    const h = l.tipo.h;
    return [sy, sx].map((w) => { const I = (w * h ** 3) / 12; return { A: w * h, I, J: op.torcaoLaje * 2 * I }; }) as [{ A: number; I: number; J: number }, { A: number; I: number; J: number }];
  }
  const c = TRELICADAS[l.tipo.modelo] ?? TRELICADAS.H12, h = c.hEnch + l.tipo.capa;
  const IT = inerciaT(c.intereixo, l.tipo.capa, c.bw, h);
  const nerv = { A: (sy / c.intereixo) * (c.intereixo * l.tipo.capa + c.bw * c.hEnch), I: (sy / c.intereixo) * IT, J: op.torcaoLaje * 2 * (sy / c.intereixo) * IT };
  const Icapa = (sx * l.tipo.capa ** 3) / 12;
  return [nerv, { A: sx * l.tipo.capa, I: Icapa, J: op.torcaoLaje * 2 * Icapa }];
}

/** Esforços de extremidade (locais) → forças globais que o nó faz na barra (6 componentes). */
function paraGlobal(m: Modelo3, br: Barra3, f: Float64Array, off: 0 | 6): number[] {
  const a = m.nos[br.i], z = m.nos[br.j], L = Math.hypot(z[0] - a[0], z[1] - a[1], z[2] - a[2]);
  const ex: V3 = [(z[0] - a[0]) / L, (z[1] - a[1]) / L, (z[2] - a[2]) / L];
  const ref: V3 = [0, 0, 1];
  const ez0: V3 = [ex[1] * ref[2] - ex[2] * ref[1], ex[2] * ref[0] - ex[0] * ref[2], ex[0] * ref[1] - ex[1] * ref[0]];
  const Lz = Math.hypot(...ez0), ez: V3 = [ez0[0] / Lz, ez0[1] / Lz, ez0[2] / Lz];
  const ey: V3 = [ez[1] * ex[2] - ez[2] * ex[1], ez[2] * ex[0] - ez[0] * ex[2], ez[0] * ex[1] - ez[1] * ex[0]];
  const R = [ex, ey, ez];
  const out = [0, 0, 0, 0, 0, 0];
  for (let k = 0; k < 3; k++) for (let r = 0; r < 3; r++) { out[k] += R[r][k] * f[off + r]; out[3 + k] += R[r][k] * f[off + 3 + r]; }
  return out;
}

/** Trecho rígido do nó do pilar até o ponto da viga a `recuo` para dentro da face do pilar. */
function offsetFace(pNo: P, pOutro: P, pil: Pilar, sec: SecaoPilar, recuo: number, noPilar: V3): V3 | null {
  const cont = contornoPilar(pil, sec);
  const dx = pOutro[0] - pNo[0], dy = pOutro[1] - pNo[1], L = Math.hypot(dx, dy);
  if (!L) return null;
  const ux = dx / L, uy = dy / L;
  // saída do eixo da viga pela face do pilar (a partir do ponto do apoio, em direção ao outro nó)
  let tFace = 0;
  for (let i = 0; i < cont.length; i++) {
    const a = cont[i], z = cont[(i + 1) % cont.length], ex = z[0] - a[0], ey = z[1] - a[1], den = ux * ey - uy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = ((a[0] - pNo[0]) * ey - (a[1] - pNo[1]) * ex) / den, u = ((a[0] - pNo[0]) * uy - (a[1] - pNo[1]) * ux) / den;
    if (t > 0 && u >= -1e-9 && u <= 1 + 1e-9) tFace = Math.max(tFace, t);
  }
  const t = Math.min(Math.max(0, tFace - recuo), 0.9 * L);
  const q: P = [pNo[0] + ux * t, pNo[1] + uy * t];
  return [q[0] - noPilar[0], q[1] - noPilar[1], 0];
}
