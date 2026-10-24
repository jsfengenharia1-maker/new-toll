// Paredes de concreto (E1c): conversão da parede em pilar-parede virtual (um lado por trecho da polilinha), aberturas no
// sistema (s, z) de cada trecho, pressões de empuxo (terra e líquido) e pontos obrigatórios da malha. Sem dependência de
// pilarParede.ts (que importa daqui). Regras de lançamento e diagnósticos em `paredes.ts`.
import { dentroPoligono, type P } from '../geom/faces';
import { diagramaEmpuxo } from './empuxo';
import { cotaFundacao, lancesDoPilar, pavimentosOrdenados, type AberturaParede, type BuildingModel, type EmpuxoParede, type Parede, type Pilar, type PilarParede, type TipoPilarParede } from './types';

/** Prefixo do tipo dos pilares-parede virtuais que representam paredes. */
export const PREFIXO_PAREDE = '@parede:';
const GAMA_AGUA = 10;

/** A parede que o pilar-parede virtual representa (undefined para pilar-parede comum). */
export const paredeDoPP = (b: Pick<BuildingModel, 'paredes'>, pp: Pick<PilarParede, 'tipo'>): Parede | undefined =>
  pp.tipo.startsWith(PREFIXO_PAREDE) ? b.paredes?.find((w) => w.id === pp.tipo.slice(PREFIXO_PAREDE.length)) : undefined;

const memoTipo = new WeakMap<Parede, TipoPilarParede>();
/** Tipo virtual da parede: um lado por trecho reto da polilinha, em coordenadas do mundo (inserção na origem, ângulo 0). */
export function tipoDaParede(w: Parede): TipoPilarParede {
  let t = memoTipo.get(w);
  if (t) return t;
  t = {
    id: PREFIXO_PAREDE + w.id, nome: w.nome,
    lados: w.pontos.slice(1).map((z, i) => {
      // recorte do lance (E6d): o início da polilinha corta o primeiro lado e o fim, o último
      const L = Math.hypot(z[0] - w.pontos[i][0], z[1] - w.pontos[i][1]), ult = i === w.pontos.length - 2;
      const pp = w.porPavimento?.map(({ corteIni, corteFim, ...e }) => ({ ...e, ...(i === 0 && corteIni ? { s0: corteIni } : {}), ...(ult && corteFim ? { s1: L - corteFim } : {}) }));
      return { a: [w.pontos[i][0], w.pontos[i][1]], z: [z[0], z[1]], esq: w.esq, dir: w.dir, ...(pp?.length ? { porPavimento: pp } : {}) };
    }),
  };
  memoTipo.set(w, t);
  return t;
}

const memoPP = new WeakMap<Parede, PilarParede>();
/** Pilar-parede virtual da parede (mesmo id; tipo com o prefixo). */
export function ppDaParede(w: Parede): PilarParede {
  let p = memoPP.get(w);
  if (!p) { p = { id: w.id, nome: w.nome, tipo: PREFIXO_PAREDE + w.id, x: 0, y: 0, angulo: 0, nasce: w.nasce, morre: w.morre, ...(w.vinculoBase === 'rotula' ? { vinculoBase: 'rotula' as const } : {}) }; memoPP.set(w, p); }
  return p;
}

const memoObra = new WeakMap<BuildingModel, PilarParede[]>();
/** Pilares-parede da obra e as paredes como pilares-parede virtuais (em cache por modelo). */
export function ppDaObra(b: BuildingModel): PilarParede[] {
  if (!b.paredes?.length) return b.pilaresParede ?? [];
  let l = memoObra.get(b);
  if (!l) { l = [...(b.pilaresParede ?? []), ...b.paredes.map(ppDaParede)]; memoObra.set(b, l); }
  return l;
}

// ---------------------------------------------------------------- geometria ao longo do eixo

/** Comprimentos acumulados dos vértices da polilinha. */
export function acumulados(pts: [number, number][]): number[] {
  const c = [0];
  for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return c;
}
export const comprimentoParede = (w: Pick<Parede, 'pontos'>) => acumulados(w.pontos).at(-1)!;

/** Cotas da base e dos topos dos lances da parede e os ids das bases dos lances ('fundacao' ou pavimento). */
export function niveisDaParede(b: BuildingModel, w: Pick<Parede, 'nasce' | 'morre'>): { zs: number[]; bases: string[]; topos: string[] } {
  const ps = pavimentosOrdenados(b), lances = lancesDoPilar(b, w as unknown as Pilar);
  if (!lances.length) return { zs: [], bases: [], topos: [] };
  const z0 = w.nasce === 'fundacao' ? cotaFundacao(b) : ps.find((x) => x.id === w.nasce)!.cota;
  return { zs: [z0, ...lances.map((x) => x.cota)], bases: [w.nasce, ...lances.slice(0, -1).map((x) => x.id)], topos: lances.map((x) => x.id) };
}

/** Furo retangular no plano (s, z) de um trecho. */
export interface FuroTrecho { id: string; s0: number; s1: number; z0: number; z1: number; /** Recorte do lance (E6d): parede ausente na altura do lance, não é abertura. */ corte?: boolean }

/** Recortes dos lances da parede (E6d, K1.3.31): trecho [s0, s1] (no lado) e cotas do lance em que a parede não existe. */
export function recortesDaParede(b: BuildingModel, w: Parede): FuroTrecho[][] {
  const c = acumulados(w.pontos), { zs, topos } = niveisDaParede(b, w), n = w.pontos.length - 1;
  const out: FuroTrecho[][] = w.pontos.slice(1).map(() => []);
  for (const e of w.porPavimento ?? []) {
    const k = topos.indexOf(e.pavimento);
    if (k < 0) continue;
    if (e.corteIni && e.corteIni > 1e-6) out[0].push({ id: `corte:${e.pavimento}:ini`, s0: 0, s1: e.corteIni, z0: zs[k], z1: zs[k + 1], corte: true });
    if (e.corteFim && e.corteFim > 1e-6) { const L = c[n] - c[n - 1]; out[n - 1].push({ id: `corte:${e.pavimento}:fim`, s0: L - e.corteFim, s1: L, z0: zs[k], z1: zs[k + 1], corte: true }); }
  }
  return out;
}

/**
 * Aberturas da parede no plano (s, z) de cada trecho (s a partir do primeiro vértice do trecho), mais os recortes dos lances
 * (E6d, `corte: true`, tratados como abertura da altura do lance na malha e nos panos), e as aberturas que não cabem:
 * fora da parede, atravessando um vértice da polilinha, num lance que a parede não tem ou sem lintel até o topo do lance.
 */
export function furosDaParede(b: BuildingModel, w: Parede): { porTrecho: FuroTrecho[][]; ruins: { a: AberturaParede; motivo: string }[] } {
  const c = acumulados(w.pontos), { zs, bases } = niveisDaParede(b, w);
  const porTrecho: FuroTrecho[][] = w.pontos.slice(1).map(() => []), ruins: { a: AberturaParede; motivo: string }[] = [], cortes = recortesDaParede(b, w);
  for (const a of w.aberturas ?? []) {
    const k = bases.indexOf(a.pavimento);
    if (k < 0) { ruins.push({ a, motivo: 'pavimento da abertura fora dos lances da parede (lance-se no pavimento de baixo dos dois entre os quais fica)' }); continue; }
    const i = c.findIndex((ci, j) => j + 1 < c.length && a.s >= ci - 1e-6 && a.s + a.largura <= c[j + 1] + 1e-6);
    if (i < 0) { ruins.push({ a, motivo: a.s + a.largura > c.at(-1)! + 1e-6 || a.s < -1e-6 ? 'abertura fora do comprimento da parede' : 'abertura atravessa um vértice da parede (divida-a em duas)' }); continue; }
    const z0 = zs[k] + a.peitoril, z1 = z0 + a.altura;
    if (z1 > zs[k + 1] - 0.05 + 1e-9) { ruins.push({ a, motivo: 'abertura sem trecho de parede acima (lintel mínimo de 5 cm até o topo do lance)' }); continue; }
    const s0 = a.s - c[i], s1 = s0 + a.largura;
    if (s0 < 1e-6 && s1 > c[i + 1] - c[i] - 1e-6) { ruins.push({ a, motivo: 'abertura ocupa o trecho inteiro' }); continue; }
    const rc = cortes[i].find((f) => s0 < f.s1 - 1e-6 && s1 > f.s0 + 1e-6 && z0 < f.z1 - 1e-6 && z1 > f.z0 + 1e-6);
    if (rc) { ruins.push({ a, motivo: 'abertura no trecho recortado do lance' }); continue; }
    porTrecho[i].push({ id: a.id, s0, s1, z0, z1 });
  }
  cortes.forEach((l, i) => porTrecho[i].push(...l));
  return { porTrecho, ruins };
}

// ---------------------------------------------------------------- empuxo

/** Pressão de um empuxo da parede: função da cota (kPa, ≥ 0), cotas em que muda de inclinação e resultante por metro. */
export interface PressaoParede {
  empuxo: EmpuxoParede;
  /** Sinal da força na direção da normal à esquerda do eixo: terreno à esquerda empurra para a direita (−1). */
  sinal: 1 | -1;
  p: (z: number) => number;
  cortes: number[];
  /** Resultante (kN/m) entre a base e o topo. */
  resultante: number;
  avisos: string[];
}

/** Pressões dos empuxos da parede entre `zBase` e `zTopo` (vazio para empuxo sem caso, tipo ou líquido). */
export function pressoesDaParede(b: BuildingModel, w: Parede, zBase: number, zTopo: number): PressaoParede[] {
  const out: PressaoParede[] = [];
  for (const e of w.empuxos ?? []) {
    const sinal = e.lado === 'esq' ? -1 : 1;
    if (e.liquido) {
      const g = e.liquido.gama ?? GAMA_AGUA, zl = e.liquido.cota;
      const h = Math.max(0, Math.min(zl, zTopo) - zBase), topo = Math.min(zl, zTopo);
      // resultante: trapézio entre a base e o topo molhado
      const pB = g * Math.max(0, zl - zBase), pT = g * Math.max(0, zl - topo);
      out.push({ empuxo: e, sinal, p: (z) => (z >= zl ? 0 : g * (zl - z)), cortes: zl > zBase && zl < zTopo ? [zl] : [], resultante: ((pB + pT) / 2) * h, avisos: [] });
      continue;
    }
    const caso = b.casos?.find((c) => c.id === e.caso), tipo = caso?.empuxo ? b.empuxos?.find((t) => t.id === caso.empuxo) : undefined;
    if (!tipo) continue;
    const t = e.cotaTerreno !== undefined ? { ...tipo, cotaAterro: e.cotaTerreno } : tipo;
    const d = diagramaEmpuxo(t, zTopo, zBase), pts = d.pontos;
    const p = (z: number) => {
      if (!pts.length || z > pts[0].cota + 1e-9) return 0;
      for (let i = 0; i + 1 < pts.length; i++) {
        const a = pts[i], c = pts[i + 1];
        if (z <= a.cota + 1e-9 && z >= c.cota - 1e-9 && a.cota - c.cota > 1e-9) return a.total + ((c.total - a.total) * (a.cota - z)) / (a.cota - c.cota);
      }
      return pts.at(-1)!.total;
    };
    out.push({ empuxo: e, sinal, p, cortes: [...new Set(pts.map((x) => x.cota))].filter((z) => z > zBase + 1e-6 && z < zTopo - 1e-6), resultante: d.resultante, avisos: d.avisos });
  }
  return out;
}

const memoExtras = new WeakMap<BuildingModel, number[]>();
/**
 * Cotas obrigatórias comuns a todas as paredes da obra (bordas das aberturas e mudanças do empuxo): as paredes ligadas
 * entre si (cantos, T) ficam com as mesmas linhas da malha na junção.
 */
export function cotasObrigatoriasParedes(b: BuildingModel): number[] {
  let z = memoExtras.get(b);
  if (z) return z;
  const s = new Set<number>();
  for (const w of b.paredes ?? []) {
    const { zs } = niveisDaParede(b, w);
    if (!zs.length) continue;
    for (const f of furosDaParede(b, w).porTrecho.flat()) { s.add(f.z0); s.add(f.z1); }
    for (const p of pressoesDaParede(b, w, zs[0], zs.at(-1)!)) for (const c of p.cortes) s.add(c);
  }
  z = [...s].map((x) => Math.round(x * 1e4) / 1e4);
  memoExtras.set(b, z);
  return z;
}

// ---------------------------------------------------------------- ligações com vigas e lajes

const distSeg = (p: P, a: P, z: P) => {
  const dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
};

/**
 * Abscissas (s a partir de `a`) em que vigas e lajes do grupo chegam ao trecho a → z (K1.3.33): cruzamentos dos eixos das
 * vigas, pontas de viga e vértices de laje a até meia espessura + 2 cm do eixo. Viram nós obrigatórios da malha.
 */
export function chegadasNoTrecho(b: BuildingModel, grupos: string[], a: P, z: P, meia: number): number[] {
  const L = Math.hypot(z[0] - a[0], z[1] - a[1]);
  if (L < 1e-9) return [];
  const u: P = [(z[0] - a[0]) / L, (z[1] - a[1]) / L], tol = meia + 0.02, out: number[] = [];
  const proj = (p: P) => { const s = (p[0] - a[0]) * u[0] + (p[1] - a[1]) * u[1], d = Math.abs(-(p[0] - a[0]) * u[1] + (p[1] - a[1]) * u[0]); if (d <= tol && s > 1e-3 && s < L - 1e-3) out.push(s); };
  for (const v of b.vigas) {
    if (!grupos.includes(v.grupo) || v.embutida) continue;
    const pts = v.pontos as P[];
    proj(pts[0]); proj(pts.at(-1)!);
    for (let i = 0; i + 1 < pts.length; i++) {
      const c = pts[i], f = pts[i + 1], ex = f[0] - c[0], ey = f[1] - c[1], den = u[0] * ey - u[1] * ex;
      if (Math.abs(den) < 1e-9) continue;
      const s = ((c[0] - a[0]) * ey - (c[1] - a[1]) * ex) / den, t = ((c[0] - a[0]) * u[1] - (c[1] - a[1]) * u[0]) / den;
      if (t >= -1e-9 && t <= 1 + 1e-9 && s > 1e-3 && s < L - 1e-3) out.push(s);
    }
  }
  for (const l of b.lajes) if (grupos.includes(l.grupo)) for (const p of l.contorno as P[]) proj(p);
  // vértices de outras paredes sobre o trecho (T e cruz entre paredes): nós comuns
  for (const w of b.paredes ?? []) for (const p of w.pontos as P[]) { const s = (p[0] - a[0]) * u[0] + (p[1] - a[1]) * u[1], d = Math.abs(-(p[0] - a[0]) * u[1] + (p[1] - a[1]) * u[0]); if (d < 1e-3 && s > 1e-3 && s < L - 1e-3) out.push(s); }
  return out;
}

/**
 * A parede toca alguma laje do grupo do pavimento (K1.2.5, K1.3.36)? Contorno da laje a até meia espessura + 5 cm de um
 * ponto do eixo, ou eixo dentro da laje. Parede que não toca laje fica fora do diafragma naquele nível.
 */
export function paredeTocaLaje(b: BuildingModel, w: Parede, pavimento: string): boolean {
  const grupo = b.pavimentos.find((p) => p.id === pavimento)?.grupo;
  const lajes = b.lajes.filter((l) => l.grupo === grupo);
  if (!lajes.length) return false;
  const tol = Math.max(w.esq + w.dir, ...(w.porPavimento ?? []).map((e) => e.esq + e.dir)) / 2 + 0.05;
  for (let i = 0; i + 1 < w.pontos.length; i++) {
    const a = w.pontos[i] as P, z = w.pontos[i + 1] as P, L = Math.hypot(z[0] - a[0], z[1] - a[1]), n = Math.max(2, Math.ceil(L / 0.25));
    for (let k = 0; k <= n; k++) {
      const p: P = [a[0] + ((z[0] - a[0]) * k) / n, a[1] + ((z[1] - a[1]) * k) / n];
      for (const l of lajes) {
        const c = l.contorno as P[];
        if (dentroPoligono(p, c)) return true;
        for (let j = 0; j < c.length; j++) if (distSeg(p, c[j], c[(j + 1) % c.length]) <= tol) return true;
      }
    }
  }
  return false;
}

/** Eixos das paredes presentes nos pavimentos do grupo (para fechar panos de laje, `panosDoGrupo`). */
export function eixosDasParedes(b: BuildingModel, grupo: string): [P, P][] {
  const segs: [P, P][] = [];
  for (const w of b.paredes ?? []) {
    const { topos } = niveisDaParede(b, w);
    if (!topos.some((id) => b.pavimentos.find((p) => p.id === id)?.grupo === grupo)) continue;
    for (let i = 0; i + 1 < w.pontos.length; i++) segs.push([w.pontos[i] as P, w.pontos[i + 1] as P]);
  }
  return segs;
}
