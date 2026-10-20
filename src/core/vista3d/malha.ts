// Construção de malhas triangulares fechadas (prismas, troncos, cilindros) para a vista 3D. Coordenadas: x, y da
// planta e z de cota, em metros; triângulos anti-horários vistos de fora.
import { areaComSinal, triangular, type P } from './triangular';

export class Malha {
  readonly pos: number[] = [];
  readonly idx: number[] = [];
  /** Segmentos de contorno [x0, y0, z0, x1, y1, z1, ...]. */
  readonly linhas: number[] = [];

  private v(x: number, y: number, z: number): number {
    this.pos.push(x, y, z);
    return this.pos.length / 3 - 1;
  }

  aresta(a: P, za: number, b: P, zb: number): void {
    this.linhas.push(a[0], a[1], za, b[0], b[1], zb);
  }

  /** Tampa horizontal em z (cima = normal para +z). */
  tampa(contorno: P[], furos: P[][], z: number, cima: boolean): void {
    const t = triangular(contorno, furos);
    const base = this.pos.length / 3;
    for (let i = 0; i < t.pos.length; i += 2) this.v(t.pos[i], t.pos[i + 1], z);
    for (let i = 0; i < t.idx.length; i += 3) {
      if (cima) this.idx.push(base + t.idx[i], base + t.idx[i + 1], base + t.idx[i + 2]);
      else this.idx.push(base + t.idx[i], base + t.idx[i + 2], base + t.idx[i + 1]);
    }
  }

  /** Faixa lateral entre dois anéis de mesmo número de vértices; o anel "a" em za e o "b" em zb. Anel anti-horário = normais para fora. */
  loft(a: P[], za: number, b: P[], zb: number, linhas = true): void {
    const n = a.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const i0 = this.v(a[i][0], a[i][1], za), j0 = this.v(a[j][0], a[j][1], za);
      const i1 = this.v(b[i][0], b[i][1], zb), j1 = this.v(b[j][0], b[j][1], zb);
      this.idx.push(i0, j0, j1, i0, j1, i1);
      if (linhas) { this.aresta(a[i], za, a[j], za); this.aresta(b[i], zb, b[j], zb); if (za !== zb || a[i][0] !== b[i][0] || a[i][1] !== b[i][1]) this.aresta(a[i], za, b[i], zb); }
    }
  }

  /** Sólido extrudado: contorno com furos entre z0 e z1 (z0 < z1). `passoLinhas`: de quantos em quantos vértices desenhar a aresta vertical. */
  extrudar(contorno: P[], furos: P[][], z0: number, z1: number, passoLinhas = 1): void {
    const ccw = areaComSinal(contorno) >= 0 ? contorno : contorno.slice().reverse();
    this.tampa(ccw, furos, z1, true);
    this.tampa(ccw, furos, z0, false);
    const faixa = (anel: P[], seFura: boolean) => {
      // anel externo anti-horário; furos horários (as normais ficam para fora do material)
      const n = anel.length;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const a = this.v(anel[i][0], anel[i][1], z0), b = this.v(anel[j][0], anel[j][1], z0);
        const c = this.v(anel[j][0], anel[j][1], z1), d = this.v(anel[i][0], anel[i][1], z1);
        this.idx.push(a, b, c, a, c, d);
        this.aresta(anel[i], z0, anel[j], z0);
        this.aresta(anel[i], z1, anel[j], z1);
        if (i % passoLinhas === 0 || seFura) this.aresta(anel[i], z0, anel[i], z1);
      }
    };
    faixa(ccw, false);
    for (const f of furos) faixa(areaComSinal(f) <= 0 ? f : f.slice().reverse(), true);
  }

  /** Anéis ligados por um tronco entre dois anéis de mesmo tamanho (sapata: base retangular → seção do pilar). */
  tronco(base: P[], zb: number, topo: P[], zt: number): void {
    const ccw = (r: P[]) => (areaComSinal(r) >= 0 ? r : r.slice().reverse());
    const b = ccw(base);
    let t = topo;
    if (areaComSinal(topo) < 0) t = topo.slice().reverse();
    this.loft(b, zb, t, zt);
    this.tampa(t, [], zt, true);
    this.tampa(b, [], zb, false);
  }

  /** Volume (m³) pela soma dos tetraedros com a origem: vale para malhas fechadas e orientadas. */
  volume(): number {
    return volumeMalha(this.pos, this.idx);
  }
}

export function volumeMalha(pos: ArrayLike<number>, idx: ArrayLike<number>): number {
  let v = 0;
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    v += (pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1]) - pos[a + 1] * (pos[b] * pos[c + 2] - pos[b + 2] * pos[c]) + pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c])) / 6;
  }
  return v;
}

/** Polígono regular de n lados (anti-horário), de raio r em torno de c. */
export const circulo = (c: P, r: number, n = 24): P[] => Array.from({ length: n }, (_, k) => [c[0] + r * Math.cos((2 * Math.PI * k) / n), c[1] + r * Math.sin((2 * Math.PI * k) / n)] as P);

/** Retângulo de lados a (x local) e b (y local), centro c, girado `graus` (anti-horário). */
export function retangulo(c: P, a: number, b: number, graus: number): P[] {
  const t = (graus * Math.PI) / 180, co = Math.cos(t), si = Math.sin(t);
  return ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([i, j]) => { const u = (i * a) / 2, w = (j * b) / 2; return [c[0] + u * co - w * si, c[1] + u * si + w * co] as P; });
}
