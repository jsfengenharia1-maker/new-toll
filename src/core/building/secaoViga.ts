// Seções das vigas (E2a): mesa colaborante (T e L, NBR 6118 14.6.2.2), altura da viga chata e propriedades para a
// análise e para a flexão. Funções puras sobre o modelo; a análise (`analitico.ts`), o dimensionamento e o detalhamento
// usam os mesmos números.
import type { BeamSection } from '../concrete';
import { dentroPoligono } from '../geom/faces';
import { propriedadesLaje } from './lajes';
import { capaLaje } from './tiposLaje';
import type { OpcoesCalculo } from './opcoes';
import { geometriaViga, type BuildingModel, type Viga } from './types';
import { vaosDaViga } from './vigas';

type P = [number, number];

/** Mesa colaborante de uma viga T ou L. */
export interface MesaViga {
  tipo: 'T' | 'L';
  /** Largura colaborante total (m): bw + b1 (+ b3). */
  bf: number;
  /** Espessura da mesa (m). */
  hf: number;
  /** Abas de cada lado (m): esquerda e direita do traçado. */
  b1: [number, number];
  /** Distância entre pontos de momento nulo (m). */
  a: number;
  /** Mesa calculada pela norma (true) ou informada (false). */
  automatica: boolean;
  /** Texto para o dimensionamento e o memorial. */
  texto: string;
}

const f2 = (x: number) => (+x.toFixed(2)).toString().replace('.', ',');

/** Inércia de seção T (mesa bf × hf, alma bw, altura total h) em torno do centróide. */
export function inerciaT(bf: number, hf: number, bw: number, h: number) {
  const A1 = bf * hf, A2 = bw * (h - hf), y1 = h - hf / 2, y2 = (h - hf) / 2, yc = (A1 * y1 + A2 * y2) / (A1 + A2);
  return (bf * hf ** 3) / 12 + A1 * (y1 - yc) ** 2 + (bw * (h - hf) ** 3) / 12 + A2 * (y2 - yc) ** 2;
}

/**
 * Aba colaborante de um lado (NBR 6118, 14.6.2.2): b1 ≤ 0,1·a e b1 ≤ 0,5·b2, com b2 a distância livre até a alma da
 * viga vizinha. `null` = sem laje desse lado (aba nula); `Infinity` = sem viga vizinha (vale só 0,1·a).
 */
export function abaColaborante(a: number, b2: number | null): number {
  if (b2 === null) return 0;
  return Math.max(0, Math.min(0.1 * a, 0.5 * b2));
}

/**
 * Distância entre pontos de momento nulo `a` pela posição no vão (NBR 6118, 14.6.2.2.1, aproximação): biapoiada 1,0ℓ,
 * vão extremo de contínua 0,75ℓ, interno 0,6ℓ. Sem a posição de cada vão, a viga de 1 vão usa 1,0, a de 2 vãos 0,75 e a de
 * 3 ou mais 0,6 (a favor da segurança nos vãos extremos) [a confirmar].
 */
export function distanciaMomentoNulo(L: number, vaos: number): number {
  const l = L / Math.max(1, vaos);
  return (vaos <= 1 ? 1 : vaos === 2 ? 0.75 : 0.6) * l;
}

/** Largura colaborante bf (m) da alma bw com as abas dos dois lados. */
export function larguraColaborante(bw: number, a: number, b2: [number | null, number | null]): { bf: number; b1: [number, number] } {
  const b1: [number, number] = [abaColaborante(a, b2[0]), abaColaborante(a, b2[1])];
  return { bf: bw + b1[0] + b1[1], b1 };
}

const comprimento = (pts: P[]) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);

/**
 * Para cada lado do trecho mais longo da viga (esquerdo e direito do traçado): distância livre b2 até a alma da viga
 * paralela vizinha (`Infinity` se não houver) e a laje que fica nesse lado (`null` se não houver). Amostra 9 pontos do
 * trecho e adota a mediana das distâncias achadas.
 */
function vizinhancaLateral(b: BuildingModel, v: Viga): { b2: [number | null, number | null]; hf: [number, number] } {
  const eixo = geometriaViga(v).eixo.map((q) => [q[0], q[1]] as P);
  let ia = 0, Lm = -1;
  for (let i = 0; i + 1 < eixo.length; i++) { const L = Math.hypot(eixo[i + 1][0] - eixo[i][0], eixo[i + 1][1] - eixo[i][1]); if (L > Lm) { Lm = L; ia = i; } }
  const A = eixo[ia], Z = eixo[ia + 1], L = Lm || 1, ux = (Z[0] - A[0]) / L, uy = (Z[1] - A[1]) / L;
  const outras = b.vigas.filter((w) => w.id !== v.id && w.grupo === v.grupo).map((w) => ({ w, e: geometriaViga(w).eixo.map((q) => [q[0], q[1]] as P) }));
  const lajes = b.lajes.filter((l) => l.grupo === v.grupo);
  const res = { b2: [null, null] as [number | null, number | null], hf: [0, 0] as [number, number] };
  for (const [lado, sinal] of [[0, 1], [1, -1]] as const) {
    // normal à esquerda do traçado (+) e à direita (−)
    const nx = -uy * sinal, ny = ux * sinal;
    const dist: number[] = [];
    let comLaje = 0, hf = 0;
    const N = 9;
    for (let k = 0; k < N; k++) {
      const t = (k + 0.5) / N, M: P = [A[0] + (Z[0] - A[0]) * t, A[1] + (Z[1] - A[1]) * t];
      // laje logo ao lado da face (5 cm)
      const q: P = [M[0] + nx * (v.secao.b / 2 + 0.05), M[1] + ny * (v.secao.b / 2 + 0.05)];
      const lj = lajes.find((l) => dentroPoligono(q, l.contorno));
      if (lj) { comLaje++; hf = Math.max(hf, capaLaje(b, lj.tipo)); }
      // viga paralela mais próxima ao longo da normal
      let melhor = Infinity;
      for (const { w, e } of outras) for (let i = 0; i + 1 < e.length; i++) {
        const c = e[i], d = e[i + 1], ex = d[0] - c[0], ey = d[1] - c[1], Le = Math.hypot(ex, ey) || 1;
        if (Math.abs((ex * ux + ey * uy) / Le) < 0.866) continue; // só as paralelas (até 30°)
        const den = nx * ey - ny * ex;
        if (Math.abs(den) < 1e-12) continue;
        const s = ((c[0] - M[0]) * ey - (c[1] - M[1]) * ex) / den, u = ((c[0] - M[0]) * ny - (c[1] - M[1]) * nx) / den;
        if (s <= 0 || u < -0.01 || u > 1.01) continue;
        melhor = Math.min(melhor, s - v.secao.b / 2 - w.secao.b / 2);
      }
      if (Number.isFinite(melhor)) dist.push(Math.max(0, melhor));
    }
    res.hf[lado] = hf;
    if (comLaje >= Math.ceil(N / 2)) {
      dist.sort((x, y) => x - y);
      res.b2[lado] = dist.length ? dist[Math.floor(dist.length / 2)] : Infinity;
    }
  }
  return res;
}

const memo = new WeakMap<BuildingModel, Map<string, MesaViga | null>>();

/**
 * Mesa colaborante da viga (T ou L), ou `null` se a seção é retangular. Tipo informado: T usa os dois lados e L um só
 * (o lado com laje, o esquerdo se os dois tiverem); sem laje no lado, a aba usa só 0,1·a. `bf`, `hf` e `a` informados
 * prevalecem sobre a norma.
 */
export function mesaDaViga(b: BuildingModel, v: Viga): MesaViga | null {
  if (!v.mesa) return null;
  let m = memo.get(b);
  if (!m) { m = new Map(); memo.set(b, m); }
  const chave = v.id + JSON.stringify([v.mesa, v.secao, v.pontos, v.alinhamento]);
  if (m.has(chave)) return m.get(chave)!;
  const viz = vizinhancaLateral(b, v);
  const L = comprimento(v.pontos), a = v.mesa.a ?? distanciaMomentoNulo(L, vaosDaViga(b, v));
  const bw = v.secao.b;
  let b2 = viz.b2;
  if (v.mesa.tipo === 'T') b2 = [b2[0] ?? Infinity, b2[1] ?? Infinity];
  else if (b2[0] === null && b2[1] === null) b2 = [Infinity, null];
  else if (b2[0] !== null && b2[1] !== null) b2 = [b2[0], null];
  const lc = larguraColaborante(bw, a, b2);
  const hfLaje = Math.max(viz.hf[0], viz.hf[1]);
  const hf = Math.min(v.mesa.hf ?? (hfLaje || Math.min(0.1, v.secao.h / 2)), v.secao.h * 0.9);
  const bf = v.mesa.bf ?? lc.bf;
  const automatica = v.mesa.bf === undefined;
  const mesa: MesaViga | null = bf <= bw + 1e-9 || hf <= 0 ? null : {
    tipo: v.mesa.tipo, bf, hf, b1: automatica ? lc.b1 : [(bf - bw) / (v.mesa.tipo === 'T' ? 2 : 1), v.mesa.tipo === 'T' ? (bf - bw) / 2 : 0], a, automatica,
    texto: `Seção ${v.mesa.tipo}: bf = ${f2(bf * 100)} cm${automatica ? ` (NBR 6118 14.6.2.2: a = ${f2(a)} m, abas ${f2(lc.b1[0] * 100)} e ${f2(lc.b1[1] * 100)} cm)` : ' informada'}, hf = ${f2(hf * 100)} cm${v.mesa.hf === undefined ? ' (laje adjacente)' : ''}.`,
  };
  m.set(chave, mesa);
  return mesa;
}

/** Propriedades de rigidez da viga na análise: área, inércias vertical (Iz) e lateral (Iy). */
export function propriedadesRigidez(v: Viga, mesa: MesaViga | null, op: Pick<OpcoesCalculo, 'mesaRigidez'>): { A: number; Iz: number; Iy: number } {
  const { b: bw, h } = v.secao;
  const Iy = (h * bw ** 3) / 12;
  if (mesa && op.mesaRigidez) return { A: mesa.bf * mesa.hf + bw * (h - mesa.hf), Iz: inerciaT(mesa.bf, mesa.hf, bw, h), Iy };
  return { A: bw * h, Iz: (bw * h ** 3) / 12, Iy };
}

/**
 * Seção para a flexão (dimensionamento e detalhamento): T onde a mesa está comprimida, se a opção `mesaDimensionamento`
 * estiver ligada; senão retangular pela alma. A mesa fica no lado da laje (em cima); na viga invertida, embaixo.
 */
export function secaoParaFlexao(b: BuildingModel, v: Viga, op: Pick<OpcoesCalculo, 'mesaDimensionamento'>): { sec: BeamSection; fcPos: boolean; fcNeg: boolean; mesa: MesaViga | null } {
  const mesa = mesaDaViga(b, v);
  const rect: BeamSection = { kind: 'rect', bw: v.secao.b, h: v.secao.h };
  if (!mesa || !op.mesaDimensionamento) return { sec: rect, fcPos: false, fcNeg: false, mesa };
  const sec: BeamSection = { kind: 'tee', bw: v.secao.b, h: v.secao.h, bf: mesa.bf, hf: mesa.hf };
  return { sec, fcPos: !v.invertida, fcNeg: !!v.invertida, mesa };
}

/**
 * Altura (m) da viga chata (C6.15): a da laje que contorna (maior altura entre as lajes que tocam a viga). Com desnível
 * entre as lajes (`nivel`), do topo mais alto à face inferior mais baixa [a confirmar]. `null` se nenhuma laje a toca.
 */
export function alturaVigaChata(b: BuildingModel, v: Viga): number | null {
  const eixo = geometriaViga(v).eixo.map((q) => [q[0], q[1]] as P);
  const toca = (l: BuildingModel['lajes'][number]) => {
    for (let i = 0; i + 1 < eixo.length; i++) for (const t of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      const M: P = [eixo[i][0] + (eixo[i + 1][0] - eixo[i][0]) * t, eixo[i][1] + (eixo[i + 1][1] - eixo[i][1]) * t];
      const dx = eixo[i + 1][0] - eixo[i][0], dy = eixo[i + 1][1] - eixo[i][1], Lg = Math.hypot(dx, dy) || 1;
      for (const s of [-1, 1]) if (dentroPoligono([M[0] - (dy / Lg) * s * (v.secao.b / 2 + 0.05), M[1] + (dx / Lg) * s * (v.secao.b / 2 + 0.05)], l.contorno)) return true;
    }
    return false;
  };
  const ls = b.lajes.filter((l) => l.grupo === v.grupo && toca(l));
  if (!ls.length) return null;
  const topo = Math.max(...ls.map((l) => l.nivel ?? 0)), base = Math.min(...ls.map((l) => (l.nivel ?? 0) - propriedadesLaje(l.tipo).h));
  return Math.round((topo - base) * 1000) / 1000;
}

/**
 * Contorno da seção para a prévia (m, y para cima, origem no canto inferior esquerdo do retângulo que a contém):
 * retângulo, T ou L; mesa em cima (embaixo se a viga é invertida). Na L a aba fica à esquerda do traçado.
 */
export function contornoSecaoViga(bw: number, h: number, mesa: { tipo: 'T' | 'L'; bf: number; hf: number } | null, invertida = false): { pontos: [number, number][]; largura: number; altura: number } {
  if (!mesa) return { pontos: [[0, 0], [bw, 0], [bw, h], [0, h]], largura: bw, altura: h };
  const { bf, hf } = mesa, esq = mesa.tipo === 'L' ? bf - bw : (bf - bw) / 2, dir = esq + bw;
  if (invertida) return { pontos: [[0, 0], [bf, 0], [bf, hf], [dir, hf], [dir, h], [esq, h], [esq, hf], [0, hf]], largura: bf, altura: h };
  return { pontos: [[esq, 0], [dir, 0], [dir, h - hf], [bf, h - hf], [bf, h], [0, h], [0, h - hf], [esq, h - hf]], largura: bf, altura: h };
}

/** Linha do quadro de seções do memorial (E2a): vigas com mesa, chatas, não estruturais ou de amarração. */
export interface LinhaSecaoViga {
  viga: string; nome: string; grupo: string;
  /** Seção da alma, cm. */
  b: number; h: number;
  /** Tipo de seção: 'ret', 'T' ou 'L'; mesa em cm (bf, hf, a em m) quando há. */
  tipo: 'ret' | 'T' | 'L'; bf?: number; hf?: number; a?: number; abas?: [number, number]; automatica?: boolean;
  chata: boolean; estrutural: boolean; amarracao: boolean;
}

/** Vigas do edifício com seção especial (mesa, chata, não estrutural ou amarração), na ordem do modelo. */
export function resumoSecoesVigas(b: BuildingModel): LinhaSecaoViga[] {
  const out: LinhaSecaoViga[] = [];
  for (const v of b.vigas) {
    if (!v.mesa && !v.chata && v.estrutural !== false && !v.amarracao) continue;
    const m = mesaDaViga(b, v);
    out.push({
      viga: v.id, nome: v.nome, grupo: v.grupo, b: Math.round(v.secao.b * 1000) / 10, h: Math.round(v.secao.h * 1000) / 10,
      tipo: m ? m.tipo : 'ret', ...(m ? { bf: m.bf, hf: m.hf, a: m.a, abas: m.b1, automatica: m.automatica } : {}),
      chata: !!v.chata, estrutural: v.estrutural !== false, amarracao: !!v.amarracao,
    });
  }
  return out;
}
