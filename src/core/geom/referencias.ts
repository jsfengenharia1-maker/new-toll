// Referências geométricas para alinhar e travar (L9): face ou centro de pilar, face ou eixo de viga, eixo de malha, linha do
// gabarito (máscara) e aresta de laje. Cada referência é um descritor guardado no modelo (`RefAlinh`); `resolverRef` devolve
// a reta (ponto + direção unitária) com a geometria atual, de modo que a restrição acompanha o elemento quando ele se move.
import { contornoPilar, centroPilar, geometriaViga, mascaraParaMundo, type BuildingModel, type Laje, type Pilar, type Viga } from '../building/types';

export type Pt = [number, number];
/** Reta orientada: ponto `p` e direção unitária `u`. */
export interface Reta { p: Pt; u: Pt }

export type ParteViga = 'esq' | 'eixo' | 'dir';
/** Faces do pilar (f0 = aresta do 1º ao 2º canto, no sentido de `contornoPilar`) e eixos que passam pelo centro (cx: paralelo ao eixo local x). */
export type PartePilar = 'f0' | 'f1' | 'f2' | 'f3' | 'cx' | 'cy';

export type RefAlinh =
  | { k: 'pilar'; id: string; parte: PartePilar }
  | { k: 'viga'; id: string; trecho: number; parte: ParteViga }
  | { k: 'eixo'; id: string }
  | { k: 'gabarito'; mascara: string; camada: string; seg: number }
  | { k: 'laje'; id: string; aresta: number };

/** Restrição de alinhamento (cadeado): `alvo` fica a `distancia` m (à esquerda de `ref`) enquanto `ref` mudar de lugar. */
export interface RestricaoAlinhamento { id: string; ref: RefAlinh; alvo: RefAlinh; distancia: number }

const TOL_PARALELO = 1e-4;
const r9 = (v: number) => +v.toFixed(9);

/** Elemento (pilar, viga, eixo, máscara, laje) a que a referência se liga; usado para detectar ciclos e remoções. */
export const elementoDe = (r: RefAlinh): string => (r.k === 'gabarito' ? r.mascara : r.id);

function retaDe(a: Pt, z: Pt): Reta | null {
  const L = Math.hypot(z[0] - a[0], z[1] - a[1]);
  return L < 1e-9 ? null : { p: a, u: [(z[0] - a[0]) / L, (z[1] - a[1]) / L] };
}

/** Segmento (dois pontos) que a referência representa hoje, ou null se o elemento não existe mais. */
export function segmentoRef(b: Pick<BuildingModel, 'pilares' | 'vigas' | 'lajes' | 'eixos' | 'mascaras'>, r: RefAlinh): [Pt, Pt] | null {
  switch (r.k) {
    case 'pilar': {
      const q = b.pilares.find((x) => x.id === r.id);
      if (!q) return null;
      if (r.parte === 'cx' || r.parte === 'cy') {
        const c = centroPilar(q, q.secao), a = (q.angulo * Math.PI) / 180;
        const u: Pt = r.parte === 'cx' ? [Math.cos(a), Math.sin(a)] : [-Math.sin(a), Math.cos(a)];
        const meio = (q.secao.tipo === 'circ' ? q.secao.d : r.parte === 'cx' ? q.secao.b : q.secao.h) / 2;
        return [[r9(c[0] - u[0] * meio), r9(c[1] - u[1] * meio)], [r9(c[0] + u[0] * meio), r9(c[1] + u[1] * meio)]];
      }
      if (q.secao.tipo === 'circ') return null;
      const c = contornoPilar(q, q.secao), i = +r.parte[1];
      return [c[i], c[(i + 1) % c.length]];
    }
    case 'viga': {
      const v = b.vigas.find((x) => x.id === r.id);
      if (!v || r.trecho < 0 || r.trecho + 1 >= v.pontos.length) return null;
      const pol = geometriaViga(v)[r.parte];
      return [pol[r.trecho], pol[r.trecho + 1]];
    }
    case 'eixo': {
      const e = b.eixos.find((x) => x.id === r.id);
      return e ? [e.p1, e.p2] : null;
    }
    case 'gabarito': {
      const m = b.mascaras.find((x) => x.id === r.mascara);
      const l = m?.geo[r.camada]?.linhas;
      if (!m || !l || (r.seg + 1) * 4 > l.length) return null;
      const k = r.seg * 4;
      return [mascaraParaMundo(m, l[k], l[k + 1]), mascaraParaMundo(m, l[k + 2], l[k + 3])];
    }
    case 'laje': {
      const l = b.lajes.find((x) => x.id === r.id);
      if (!l || r.aresta < 0 || r.aresta >= l.contorno.length) return null;
      return [l.contorno[r.aresta], l.contorno[(r.aresta + 1) % l.contorno.length]];
    }
  }
}

/** Reta da referência (null se o elemento não existe ou o segmento é degenerado). */
export function resolverRef(b: Pick<BuildingModel, 'pilares' | 'vigas' | 'lajes' | 'eixos' | 'mascaras'>, r: RefAlinh): Reta | null {
  const s = segmentoRef(b, r);
  return s ? retaDe(s[0], s[1]) : null;
}

/** Distância assinada de `q` à reta (positiva à esquerda de `u`). */
export const distanciaAssinada = (r: Reta, q: Pt) => (q[1] - r.p[1]) * r.u[0] - (q[0] - r.p[0]) * r.u[1];

/** As duas retas são paralelas (mesma direção ou oposta)? */
export const paralelas = (a: Reta, z: Reta) => Math.abs(a.u[0] * z.u[1] - a.u[1] * z.u[0]) < TOL_PARALELO;

/**
 * Translação, perpendicular à referência, que leva a reta `alvo` a `distancia` m à esquerda de `ref` (0 = coincidente).
 * Null se as retas não são paralelas.
 */
export function translacaoParaAlinhar(ref: Reta, alvo: Reta, distancia = 0): Pt | null {
  if (!paralelas(ref, alvo)) return null;
  const falta = distancia - distanciaAssinada(ref, alvo.p);
  const n: Pt = [-ref.u[1], ref.u[0]];
  return [r9(n[0] * falta), r9(n[1] * falta)];
}

// ---------------------------------------------------------------- candidatos sob o cursor

export interface CandidatoRef { ref: RefAlinh; seg: [Pt, Pt]; dist: number; rotulo: string }

function distSegmento(p: Pt, a: Pt, z: Pt): number {
  const dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy, u = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
  return Math.hypot(a[0] + u * dx - p[0], a[1] + u * dy - p[1]);
}
function dentro(p: Pt, poly: Pt[]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

export interface EntradaCandidatos {
  pilares: Pilar[];
  vigas: Viga[];
  lajes?: Laje[];
  eixos?: BuildingModel['eixos'];
  mascaras?: BuildingModel['mascaras'];
}

/**
 * Referências a até `raio` m do ponto, da mais próxima à mais distante (a ordem é estável: o Tab percorre a lista).
 * `alvo`: só pilares e vigas (o que pode ser movido).
 * Os eixos que passam pelo centro do pilar entram quando o ponto está dentro do contorno.
 */
export function candidatosRef(e: EntradaCandidatos, ponto: Pt, raio: number, opc: { alvo?: boolean } = {}): CandidatoRef[] {
  const out: CandidatoRef[] = [];
  const dado = { pilares: e.pilares, vigas: e.vigas, lajes: e.lajes ?? [], eixos: e.eixos ?? [], mascaras: e.mascaras ?? [] };
  const poe = (ref: RefAlinh, dist: number, rotulo: string) => {
    const seg = segmentoRef(dado, ref);
    if (!seg) return;
    out.push({ ref, seg, dist, rotulo });
  };
  for (const q of e.pilares) {
    if (q.secao.tipo === 'ret') {
      const c = contornoPilar(q, q.secao);
      c.forEach((a, i) => { const d = distSegmento(ponto, a, c[(i + 1) % c.length]); if (d <= raio) poe({ k: 'pilar', id: q.id, parte: `f${i}` as PartePilar }, d, `face de ${q.nome}`); });
      if (dentro(ponto, c)) for (const parte of ['cx', 'cy'] as const) poe({ k: 'pilar', id: q.id, parte }, raio, `centro de ${q.nome}`);
    } else if (Math.hypot(ponto[0] - centroPilar(q, q.secao)[0], ponto[1] - centroPilar(q, q.secao)[1]) <= q.secao.d / 2) {
      for (const parte of ['cx', 'cy'] as const) poe({ k: 'pilar', id: q.id, parte }, raio, `centro de ${q.nome}`);
    }
  }
  for (const v of e.vigas) {
    const g = geometriaViga(v);
    for (let i = 0; i + 1 < v.pontos.length; i++) for (const parte of ['esq', 'eixo', 'dir'] as const) {
      const d = distSegmento(ponto, g[parte][i], g[parte][i + 1]);
      if (d <= raio) poe({ k: 'viga', id: v.id, trecho: i, parte }, d + (parte === 'eixo' ? 1e-6 : 0), parte === 'eixo' ? `eixo de ${v.nome}` : `face de ${v.nome}`);
    }
  }
  if (!opc.alvo) {
    for (const x of dado.eixos) { const d = distSegmento(ponto, x.p1, x.p2); if (d <= raio) poe({ k: 'eixo', id: x.id }, d, `eixo ${x.nome}`); }
    for (const l of dado.lajes) l.contorno.forEach((a, i) => { const d = distSegmento(ponto, a, l.contorno[(i + 1) % l.contorno.length]); if (d <= raio) poe({ k: 'laje', id: l.id, aresta: i }, d, `borda de ${l.nome}`); });
    for (const m of dado.mascaras) for (const [camada, g] of Object.entries(m.geo)) {
      for (let s = 0; s * 4 + 3 < g.linhas.length; s++) {
        const k = s * 4, a = mascaraParaMundo(m, g.linhas[k], g.linhas[k + 1]), z = mascaraParaMundo(m, g.linhas[k + 2], g.linhas[k + 3]);
        const d = distSegmento(ponto, a, z);
        if (d <= raio) poe({ k: 'gabarito', mascara: m.id, camada, seg: s }, d, `gabarito ${camada}`);
      }
    }
  }
  return out.sort((a, z) => a.dist - z.dist);
}
