// Deformada da cena 3D (V3, estrutura completa): refina a malha de cada objeto da cena (subdivisão uniforme em 4) e dá a
// cada vértice o deslocamento do eixo da barra mais próxima (pilares e vigas, com Hermite e rotação da seção) ou do
// campo de deslocamentos da grelha (lajes). A interface soma `escala · fator · desl` às posições originais; a cor vem de |Δ|.
import type { AnaliseEdificio } from '../building/analitico';
import type { Cena3D, Objeto3D } from '../vista3d/registro';
import { campoLaje } from './flechaPontos';
import {
  cargasDistribuidasHipotese, deslocamentoMaximo, deslocamentosHipotese, escalaAutomatica, pontoDaBarra, type Hipotese,
} from './deformada';
import type { V3 } from '../fe3d';

export interface ObjetoDeformado {
  id: string;
  tipo: Objeto3D['tipo'];
  elemento: string;
  /** Malha refinada: vértices originais [x, y, z, ...], triângulos e segmentos de contorno (refinados também). */
  pos: Float32Array;
  idx: Uint32Array;
  linhas: Float32Array;
  /** Deslocamento (m) de cada vértice de `pos` e |Δ| (m). */
  desl: Float32Array;
  delta: Float32Array;
  /** Deslocamento dos vértices de `linhas`. */
  deslLinhas: Float32Array;
}

export interface CenaDeformada {
  objetos: ObjetoDeformado[];
  /** Maior |Δ| da hipótese (m) e escala automática (maior deslocamento = 5 % da altura). */
  dmax: number;
  escalaAuto: number;
  altura: number;
  hipotese: string;
  avisos: string[];
}

export interface OpcoesCenaDeformada {
  /** Aresta-alvo da malha refinada (m); padrão 0,5. */
  refino?: number;
  /** Teto de triângulos por objeto. */
  maxTriangulos?: number;
}

/** Subdivisão em 4 (ponto médio das arestas), `niveis` vezes, de um conjunto de triângulos com vértices próprios. */
export function subdividir(pos: ArrayLike<number>, idx: ArrayLike<number>, niveis: number): { pos: number[]; idx: number[] } {
  let P = Array.from(pos), I = Array.from(idx);
  for (let n = 0; n < niveis; n++) {
    const nP = [...P], nI: number[] = [], cache = new Map<number, number>();
    const meio = (a: number, b: number) => {
      const k = a < b ? a * 4294967296 + b : b * 4294967296 + a;
      let m = cache.get(k);
      if (m === undefined) { m = nP.length / 3; nP.push((P[a * 3] + P[b * 3]) / 2, (P[a * 3 + 1] + P[b * 3 + 1]) / 2, (P[a * 3 + 2] + P[b * 3 + 2]) / 2); cache.set(k, m); }
      return m;
    };
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t], b = I[t + 1], c = I[t + 2], ab = meio(a, b), bc = meio(b, c), ca = meio(c, a);
      nI.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
    }
    P = nP; I = nI;
  }
  return { pos: P, idx: I };
}

/** Maior aresta dos triângulos. */
function maiorAresta(pos: ArrayLike<number>, idx: ArrayLike<number>): number {
  let mx = 0;
  const d = (a: number, b: number) => Math.hypot(pos[a * 3] - pos[b * 3], pos[a * 3 + 1] - pos[b * 3 + 1], pos[a * 3 + 2] - pos[b * 3 + 2]);
  for (let t = 0; t < idx.length; t += 3) mx = Math.max(mx, d(idx[t], idx[t + 1]), d(idx[t + 1], idx[t + 2]), d(idx[t + 2], idx[t]));
  return mx;
}

/** Quebra cada segmento de contorno em 2^niveis partes (os vértices do contorno acompanham a malha refinada). */
function subdividirLinhas(linhas: ArrayLike<number>, niveis: number): number[] {
  const n = 2 ** niveis, out: number[] = [];
  for (let s = 0; s + 5 < linhas.length; s += 6) {
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n;
      for (const t of [t0, t1]) for (let c = 0; c < 3; c++) out.push(linhas[s + c] + t * (linhas[s + 3 + c] - linhas[s + c]));
    }
  }
  return out;
}

/** Distância ponto-segmento e fração do ponto mais próximo. */
function pontoSegmento(p: V3, a: V3, b: V3): { d: number; t: number } {
  const ab: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
  const t = l2 > 0 ? Math.min(1, Math.max(0, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / l2)) : 0;
  return { d: Math.hypot(p[0] - a[0] - t * ab[0], p[1] - a[1] - t * ab[1], p[2] - a[2] - t * ab[2]), t };
}

export function deformarCena(cena: Cena3D, an: AnaliseEdificio, h: Hipotese, o: OpcoesCenaDeformada = {}): CenaDeformada {
  const avisos: string[] = [], pm = an.portico, m = pm.modelo;
  const d = deslocamentosHipotese(an, h);
  if (d.ignorados.length) avisos.push(`Sem deslocamento para: ${d.ignorados.join(', ')}.`);
  const q = cargasDistribuidasHipotese(an, h);
  const alvo = o.refino ?? 0.5, teto = o.maxTriangulos ?? 6000;
  // barras do pórtico por tipo e referência
  const porRef = new Map<string, number[]>();
  const nb = Math.min(pm.barras.length, m.barras.length);
  for (let bi = 0; bi < nb; bi++) { const k = `${pm.barras[bi].tipo}:${pm.barras[bi].ref}`; (porRef.get(k) ?? porRef.set(k, []).get(k)!).push(bi); }
  const campos = new Map<string, (x: number, y: number) => number>();
  const campoDe = (pav: string) => {
    if (!campos.has(pav)) campos.set(pav, campoLaje(an, d, pav));
    return campos.get(pav)!;
  };
  // nós do pórtico por pavimento (cota) para a translação horizontal das lajes (diafragma)
  const nosPorCota = new Map<number, number[]>();
  m.nos.forEach((p, i) => { const k = Math.round(p[2] * 100); (nosPorCota.get(k) ?? nosPorCota.set(k, []).get(k)!).push(i); });
  const horizontalDaLaje = (x: number, y: number, z: number): [number, number] => {
    let melhor = -1, dm = Infinity;
    for (const [k, ns] of nosPorCota) {
      if (Math.abs(k / 100 - z) > 0.6) continue;
      for (const i of ns) { const dd = Math.hypot(m.nos[i][0] - x, m.nos[i][1] - y); if (dd < dm) { dm = dd; melhor = i; } }
    }
    return melhor < 0 ? [0, 0] : [d.portico[melhor * 6], d.portico[melhor * 6 + 1]];
  };
  const nosTodos = m.nos.map((_, i) => i);
  const maisProximoNo = (p: V3): number => {
    let melhor = -1, dm = Infinity;
    for (const i of nosTodos) { const dd = Math.hypot(m.nos[i][0] - p[0], m.nos[i][1] - p[1], m.nos[i][2] - p[2]); if (dd < dm) { dm = dd; melhor = i; } }
    return melhor;
  };

  const deslVertice = (ob: Objeto3D, x: number, y: number, z: number): V3 => {
    if (ob.tipo === 'pilar' || ob.tipo === 'viga') {
      const cands = porRef.get(`${ob.tipo}:${ob.elemento}`) ?? [];
      let melhor: { bi: number; t: number; d: number } | null = null;
      for (const bi of cands) {
        const b = m.barras[bi], r = pontoSegmento([x, y, z], m.nos[b.i], m.nos[b.j]);
        if (!melhor || r.d < melhor.d) melhor = { bi, t: r.t, d: r.d };
      }
      if (melhor) {
        const pt = pontoDaBarra(m, melhor.bi, d.portico, melhor.t, q.get(melhor.bi));
        // a seção gira com a barra: u + θ × (vértice − ponto do eixo)
        const r: V3 = [x - pt.pos[0], y - pt.pos[1], z - pt.pos[2]];
        return [pt.u[0] + pt.rot[1] * r[2] - pt.rot[2] * r[1], pt.u[1] + pt.rot[2] * r[0] - pt.rot[0] * r[2], pt.u[2] + pt.rot[0] * r[1] - pt.rot[1] * r[0]];
      }
    }
    if (ob.tipo === 'laje' && !ob.pendente && d.grelhas.has(ob.pavimento)) {
      const [ux, uy] = horizontalDaLaje(x, y, z);
      return [ux, uy, campoDe(ob.pavimento)(x, y)];
    }
    if (ob.tipo === 'fundacao') return [0, 0, 0];
    const i = maisProximoNo([x, y, z]);
    return i < 0 ? [0, 0, 0] : [d.portico[i * 6], d.portico[i * 6 + 1], d.portico[i * 6 + 2]];
  };

  const objetos: ObjetoDeformado[] = [];
  for (const ob of cena.objetos) {
    const ntri = ob.idx.length / 3;
    const aresta = maiorAresta(ob.pos, ob.idx);
    let niveis = aresta > alvo ? Math.ceil(Math.log2(aresta / alvo)) : 0;
    while (niveis > 0 && ntri * 4 ** niveis > teto) niveis--;
    const s = niveis ? subdividir(ob.pos, ob.idx, niveis) : { pos: Array.from(ob.pos), idx: Array.from(ob.idx) };
    const lin = niveis ? subdividirLinhas(ob.linhas, niveis) : Array.from(ob.linhas);
    const nv = s.pos.length / 3, desl = new Float32Array(nv * 3), delta = new Float32Array(nv);
    for (let v = 0; v < nv; v++) {
      const u = deslVertice(ob, s.pos[v * 3], s.pos[v * 3 + 1], s.pos[v * 3 + 2]);
      desl[v * 3] = u[0]; desl[v * 3 + 1] = u[1]; desl[v * 3 + 2] = u[2];
      delta[v] = Math.hypot(u[0], u[1], u[2]);
    }
    const dl = new Float32Array(lin.length);
    for (let v = 0; v * 3 < lin.length; v++) {
      const u = deslVertice(ob, lin[v * 3], lin[v * 3 + 1], lin[v * 3 + 2]);
      dl[v * 3] = u[0]; dl[v * 3 + 1] = u[1]; dl[v * 3 + 2] = u[2];
    }
    objetos.push({ id: ob.id, tipo: ob.tipo, elemento: ob.elemento, pos: Float32Array.from(s.pos), idx: Uint32Array.from(s.idx), linhas: Float32Array.from(lin), desl, delta, deslLinhas: dl });
  }
  const altura = Math.max(1e-6, cena.limites.max[2] - cena.limites.min[2]);
  let dmax = deslocamentoMaximo(d);
  for (const o2 of objetos) for (const v of o2.delta) dmax = Math.max(dmax, v);
  return { objetos, dmax, escalaAuto: escalaAutomatica(dmax, altura), altura, hipotese: h.nome, avisos };
}

/** Posições deformadas de um objeto: original + escala · fator · deslocamento (fator = fatorAnimacao ou 1). */
export function posicoesDeformadas(o: ObjetoDeformado, escala: number, fator = 1, linhas = false): Float32Array {
  const base = linhas ? o.linhas : o.pos, desl = linhas ? o.deslLinhas : o.desl, out = new Float32Array(base.length), k = escala * fator;
  for (let i = 0; i < base.length; i++) out[i] = base[i] + k * desl[i];
  return out;
}

/** Cor por |Δ|: posição 0 a 1 na rampa de `n` cores (índice fracionário), para a legenda e os vértices. */
export const posicaoNaRampa = (delta: number, dmax: number) => (dmax > 1e-12 ? Math.min(1, Math.max(0, delta / dmax)) : 0);
