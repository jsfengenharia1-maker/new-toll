// Armaduras em 3D (V2): barras como caminhos espaciais a partir do detalhamento das vigas, dos pilares e das lajes
// (DetalheViga, DetalhePilar, DetalheLaje). O caminho de cada barra tem o comprimento do detalhamento (as pernas dos
// ganchos absorvem o arredondamento e as emendas), então a soma por elemento bate com o resumo de aço. Núcleo puro:
// a interface agrupa por camada (`camadasDeArmadura`) e desenha linhas ou tubos (`matrizesDeTubos`).
//
// Premissas [a confirmar]: distribuição das barras da viga em camadas pelo espaçamento mínimo máx(2 cm; φ); gancho de
// 90° das vigas e dos pilares como perna reta (para cima nas barras inferiores, para baixo nas superiores, para o miolo
// nos pilares); gancho dos estribos como duas pernas diagonais no canto superior; vigotas das lajes treliçadas ainda
// não geradas.
import type { Dimensionamento } from '../building/dimensionamento';
import type { DetalheViga } from '../building/detalhamento';
import { anguloNoLance, centroNoLance, deslocarPolilinha, dimsSecao, offsetsViga, pavimentosDoGrupo, pavimentosOrdenados, secaoNoLance, type BuildingModel, type Pilar, type Viga } from '../building/types';
import { cobrimentoLaje, cobrimentoPilar, cobrimentoViga } from '../building/materiais';
import { posicoesEstribos } from '../building/detalhamentoPilares';
import { construirCena } from './cena';
import type { Cena3D } from './registro';

export type V3 = [number, number, number];
export type OrigemArmadura = 'viga' | 'pilar' | 'laje';

export interface Barra3D {
  id: string;
  origem: OrigemArmadura;
  elemento: string; nome: string;
  pavimento: string;
  /** Posição do detalhamento (N1, N2…); estribos e grampos: `E<n>` / `G<n>` da zona ou do lance. */
  posicao: string;
  /** Tipo do detalhamento (passante, negativo, longitudinal, positiva…) ou `estribo` / `grampo`. */
  tipo: string;
  face?: string;
  /** Bitola (mm) e raio de desenho (m). */
  phi: number; raio: number;
  caminho: V3[];
  /** Comprimento do caminho (m). */
  comprimento: number;
}

export interface SelecaoArmaduras {
  /** Ids de vigas, pilares e lajes; ausente = todos. */
  elementos?: string[];
  /** Pavimentos (ids); ausente = todos. */
  pavimentos?: string[];
  tipos?: OrigemArmadura[];
  /** Limite de segmentos da cena (padrão 20 000); acima, as barras restantes ficam de fora e `truncado` indica. */
  limiteSegmentos?: number;
  /** Multiplica o raio real das barras (1 = escala real; o padrão 1). */
  escalaRaio?: number;
}

export interface Armaduras3D {
  barras: Barra3D[];
  segmentos: number;
  truncado: boolean;
  /** Comprimento (m) das barras geradas por elemento (id) e pavimento (id): `${elemento}|${pavimento}`. */
  comprimentos: Record<string, number>;
  avisos: string[];
}

export const LIMITE_SEGMENTOS_ARMADURA = 20000;

// ---------------------------------------------------------------- geometria auxiliar

const dist3 = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export const comprimentoCaminho = (c: V3[]) => c.reduce((s, p, i) => (i ? s + dist3(c[i - 1], p) : 0), 0);

/**
 * Ajusta as pontas do caminho para que o comprimento seja `alvo`: com ganchos, cada perna (na direção dada) recebe
 * (alvo − caminho)/nº de ganchos; sem ganchos, a última ponta é prolongada. Caminho maior que o alvo fica como está.
 */
function ajustar(c: V3[], alvo: number, ganchos: [boolean, boolean], dir: [V3, V3]): V3[] {
  const L = comprimentoCaminho(c), falta = alvo - L, n = (ganchos[0] ? 1 : 0) + (ganchos[1] ? 1 : 0);
  if (falta <= 1e-9 || c.length < 2) return c;
  const out = c.slice();
  if (n === 0) {
    const a = out[out.length - 2], z = out[out.length - 1], d = dist3(a, z) || 1;
    out[out.length - 1] = [z[0] + ((z[0] - a[0]) / d) * falta, z[1] + ((z[1] - a[1]) / d) * falta, z[2] + ((z[2] - a[2]) / d) * falta];
    return out;
  }
  const leg = falta / n;
  if (ganchos[1]) { const z = out[out.length - 1], d = dir[1]; out.push([z[0] + d[0] * leg, z[1] + d[1] * leg, z[2] + d[2] * leg]); }
  if (ganchos[0]) { const z = out[0], d = dir[0]; out.unshift([z[0] + d[0] * leg, z[1] + d[1] * leg, z[2] + d[2] * leg]); }
  return out;
}

/** Posição ordenada nos cantos primeiro (0, último, 1, penúltimo…) para n colunas. */
const ordemColuna = (c: number, m: number) => (m <= 1 ? 0 : c === 0 ? 0 : c === 1 ? m - 1 : c % 2 === 0 ? c / 2 : m - 1 - (c - 1) / 2);

// ---------------------------------------------------------------- vigas

/** Trecho [s0, s1] da polilinha base, com os pontos correspondentes na polilinha deslocada (mesmo número de vértices). */
function trechoDaPolilinha(base: [number, number][], off: [number, number][], s0: number, s1: number): [number, number][] {
  const cum = [0];
  for (let i = 1; i < base.length; i++) cum.push(cum[i - 1] + Math.hypot(base[i][0] - base[i - 1][0], base[i][1] - base[i - 1][1]));
  const em = (s: number): [number, number] => {
    let i = 0;
    while (i + 2 < base.length && s > cum[i + 1]) i++;
    const L = cum[i + 1] - cum[i] || 1, t = Math.max(0, Math.min(1, (s - cum[i]) / L));
    return [off[i][0] + t * (off[i + 1][0] - off[i][0]), off[i][1] + t * (off[i + 1][1] - off[i][1])];
  };
  const out: [number, number][] = [em(s0)];
  for (let i = 1; i + 1 < base.length; i++) if (cum[i] > s0 + 1e-9 && cum[i] < s1 - 1e-9) out.push(off[i]);
  out.push(em(s1));
  return out;
}
/** Tangente e normal à esquerda da polilinha base na abscissa s. */
function frenet(base: [number, number][], s: number): { t: [number, number]; n: [number, number]; p: [number, number] } {
  let acc = 0;
  for (let i = 0; i + 1 < base.length; i++) {
    const L = Math.hypot(base[i + 1][0] - base[i][0], base[i + 1][1] - base[i][1]);
    if (s <= acc + L + 1e-9 || i + 2 === base.length) {
      const t: [number, number] = [(base[i + 1][0] - base[i][0]) / (L || 1), (base[i + 1][1] - base[i][1]) / (L || 1)], k = Math.max(0, Math.min(L, s - acc));
      return { t, n: [-t[1], t[0]], p: [base[i][0] + t[0] * k, base[i][1] + t[1] * k] };
    }
    acc += L;
  }
  return { t: [1, 0], n: [0, 1], p: base[0] };
}

function barrasDaViga(b: BuildingModel, v: Viga, d: DetalheViga, pav: { id: string; cota: number }, emitir: (x: Omit<Barra3D, 'id' | 'origem' | 'elemento' | 'nome' | 'pavimento' | 'raio'>) => boolean) {
  const off = offsetsViga(v), ref = pav.cota + (v.nivel ?? 0), h = v.secao.h, bw = v.secao.b;
  const zTop = v.invertida ? ref + h : ref, zBot = zTop - h, cob = cobrimentoViga(b, v.cobrimento);
  const phiT = (d.estribos[0]?.phi ?? 5) / 1000;
  const eixoPl = deslocarPolilinha(v.pontos, off.eixo);
  const polAt = (e: number) => deslocarPolilinha(v.pontos, off.eixo + e);
  // trilhas por face (barras que se sobrepõem em s ficam em trilhas diferentes)
  for (const face of ['inf', 'sup'] as const) {
    const lista = d.barras.map((x, i) => ({ x, i })).filter((q) => q.x.face === face && q.x.tipo !== 'pele');
    const phiMax = Math.max(0, ...lista.map((q) => q.x.phi)) / 1000, esp = Math.max(0.02, phiMax);
    const nL = Math.max(1, Math.floor((bw - 2 * (cob.lat + phiT) + esp) / (phiMax + esp)));
    const trilhas: [number, number][][] = [];
    const exp: { q: (typeof lista)[number]; k: number; t: number }[] = [];
    for (const q of lista.slice().sort((a, z) => (z.x.s1 - z.x.s0) * z.x.n - (a.x.s1 - a.x.s0) * a.x.n)) {
      for (let k = 0; k < q.x.n; k++) {
        let t = 0;
        while (trilhas[t]?.some(([a, z]) => q.x.s0 < z - 1e-9 && q.x.s1 > a + 1e-9)) t++;
        (trilhas[t] ??= []).push([q.x.s0, q.x.s1]);
        exp.push({ q, k, t });
      }
    }
    const nT = trilhas.length;
    for (const { q, k, t } of exp.sort((a, z) => a.q.i - z.q.i || a.k - z.k)) {
      const x = q.x, phi = x.phi / 1000, camada = Math.floor(t / nL), m = Math.min(nL, nT - camada * nL), rank = ordemColuna(t % nL, m);
      const span = bw - 2 * (cob.lat + phiT) - phi;
      const e = m <= 1 ? 0 : -span / 2 + (rank * span) / (m - 1);
      const dz = (face === 'inf' ? cob.inf : cob.sup) + phiT + phi / 2 + camada * (phiMax + esp);
      const z = face === 'inf' ? zBot + dz : zTop - dz;
      const c = trechoDaPolilinha(v.pontos, polAt(e), x.s0, x.s1).map(([px, py]) => [px, py, z] as V3);
      const up: V3 = [0, 0, face === 'inf' ? 1 : -1];
      if (!emitir({ posicao: x.pos, tipo: x.tipo, face, phi: x.phi, caminho: ajustar(c, x.comprimento, x.ganchos, [up, up]), comprimento: x.comprimento })) return;
      void k;
    }
  }
  // pele: metade de cada lado, distribuída na altura
  for (const x of d.barras.filter((q) => q.tipo === 'pele' || q.face === 'pele')) {
    const phi = x.phi / 1000, e = bw / 2 - cob.lat - phiT - phi / 2, nE = Math.ceil(x.n / 2), nD = x.n - nE;
    for (let k = 0; k < x.n; k++) {
      const lado = k % 2 === 0 ? 1 : -1, idx = Math.floor(k / 2), m = lado === 1 ? nE : nD;
      const z = zBot + (h * (idx + 1)) / (m + 1);
      const c = trechoDaPolilinha(v.pontos, polAt(lado * e), x.s0, x.s1).map(([px, py]) => [px, py, z] as V3);
      if (!emitir({ posicao: x.pos, tipo: 'pele', face: 'pele', phi: x.phi, caminho: ajustar(c, x.comprimento, x.ganchos, [[0, 0, 1], [0, 0, 1]]), comprimento: x.comprimento })) return;
    }
  }
  // estribos
  d.estribos.forEach((zn, zi) => {
    const phi = zn.phi / 1000, he = bw / 2 - cob.lat - phi / 2, zb = zBot + cob.inf + phi / 2, zt = zTop - cob.sup - phi / 2;
    const per = 2 * (2 * he) + 2 * (zt - zb), leg = Math.max(0, (zn.comprimento - per) / 2);
    for (let k = 0; k < zn.n; k++) {
      const s = zn.s0 + ((k + 0.5) * (zn.s1 - zn.s0)) / zn.n, f = frenet(eixoPl, s);
      const P = (e: number, z: number): V3 => [f.p[0] + f.n[0] * e, f.p[1] + f.n[1] * e, z];
      const TL = P(he, zt), TR = P(-he, zt), BR = P(-he, zb), BL = P(he, zb);
      const g = (c: number, sn: number): V3 => [TL[0] - f.n[0] * leg * c, TL[1] - f.n[1] * leg * c, TL[2] - leg * sn];
      // grampo vertical aberto (R8b): U com a abertura em cima, largura = espaçamento entre ramos, centrado na seção
      const hg = zn.grampo ? Math.max(0.01, (zn.largura ?? 0.1) / 2) : 0, GL = P(hg, zt), GR = P(-hg, zt), GBL = P(hg, zb), GBR = P(-hg, zb);
      const caminho = zn.grampo ? [GL, GBL, GBR, GR] : [g(0.707, 0.707), TL, TR, BR, BL, TL, g(0.2, 0.9798)];
      if (!emitir({ posicao: zn.grampo ? `G${zi + 1}` : `E${zi + 1}`, tipo: 'estribo', phi: zn.phi, caminho, comprimento: zn.comprimento })) return;
    }
  });
}

// ---------------------------------------------------------------- pilares

/** Posições (u, v) das barras no contorno interno da seção, cantos primeiro; `a` = distância do eixo da barra à face. */
function posicoesPilar(sec: ReturnType<typeof secaoNoLance>, arr: { n?: number; nb?: number; nh?: number; nbS?: number; nhD?: number } | undefined, a: number): [number, number][] {
  if (sec.tipo === 'circ') {
    const n = arr?.n ?? 6, r = sec.d / 2 - a;
    return Array.from({ length: n }, (_, k) => [r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n)] as [number, number]);
  }
  const w = sec.b / 2 - a, h = sec.h / 2 - a;
  const nb = arr?.nb ?? 2, nh = arr?.nh ?? 2, nbS = arr?.nbS ?? nb, nhD = arr?.nhD ?? nh;
  const out: [number, number][] = [[-w, -h], [w, -h], [w, h], [-w, h]];
  const face = (n: number, f: (t: number) => [number, number]) => { for (let i = 1; i < n - 1; i++) out.push(f(i / (n - 1))); };
  face(nb, (t) => [-w + 2 * w * t, -h]); face(nbS, (t) => [-w + 2 * w * t, h]);
  face(nh, (t) => [-w, -h + 2 * h * t]); face(nhD, (t) => [w, -h + 2 * h * t]);
  return out;
}

function barrasDoPilar(b: BuildingModel, p: Pilar, dim: Dimensionamento, esc: number, emitir: (pav: string, x: Omit<Barra3D, 'id' | 'origem' | 'elemento' | 'nome' | 'pavimento' | 'raio'>) => boolean, pavOk: (id: string) => boolean) {
  const d = dim.detalhesPilares?.find((q) => q.pilar === p.id);
  if (!d) return;
  const cob = cobrimentoPilar(b, p.cobrimento);
  const arrDe = (lance: string) => dim.pilares.find((r) => r.pilar === p.id && r.pavimentoId === lance)?.arranjo;
  const phiTDe = (lance: string) => (d.lances.find((l) => l.pavimento === lance)?.estribos.phi ?? 5) / 1000;
  const glob = (lance: string, u: number, v: number): [number, number] => {
    const c = centroNoLance(p, lance), a = (anguloNoLance(p, lance) * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a);
    return [c[0] + u * co - v * si, c[1] + u * si + v * co];
  };
  // barras longitudinais: posições consecutivas do arranjo do primeiro lance da barra
  let cursor = 0, ultimaChave = '';
  for (const x of d.barras.slice().sort((a, z) => a.pos.localeCompare(z.pos, undefined, { numeric: true }))) {
    const pv = x.lances.find(pavOk);
    if (!pv) { cursor += x.n; continue; }
    const lance = x.lances[0] ?? d.lances[0]?.pavimento, sec = secaoNoLance(p, lance), phi = x.phi / 1000;
    const pos = posicoesPilar(sec, arrDe(lance), cob + phiTDe(lance) + phi / 2);
    if (ultimaChave !== lance) { cursor = 0; ultimaChave = lance; }
    for (let k = 0; k < x.n; k++) {
      const [u, v] = pos[(cursor + k) % pos.length], [gx, gy] = glob(lance, u, v), [cx, cy] = centroNoLance(p, lance);
      const dl = Math.hypot(cx - gx, cy - gy) || 1, para: V3 = [(cx - gx) / dl, (cy - gy) / dl, 0];
      const c: V3[] = [[gx, gy, x.z0], [gx, gy, x.z1]];
      if (!emitir(pv, { posicao: x.pos, tipo: x.tipo, phi: x.phi, caminho: ajustar(c, x.comprimento, x.ganchos, [para, para]), comprimento: x.comprimento })) return;
    }
    cursor += x.n;
  }
  // estribos e grampos por lance
  for (const l of d.lances) {
    if (!pavOk(l.pavimento)) continue;
    const sec = secaoNoLance(p, l.pavimento), [w, h] = dimsSecao(sec), phi = l.estribos.phi / 1000, a = cob + phi / 2;
    let zs = posicoesEstribos(l.z0, l.z1, l.estribos.s, l.estribos.ad);
    if (zs.length !== l.estribos.n) zs = Array.from({ length: l.estribos.n }, (_, k) => (l.estribos.n === 1 ? (l.z0 + l.z1) / 2 : l.z0 + 0.05 + (k * (l.z1 - l.z0 - 0.1)) / (l.estribos.n - 1)));
    const anel: [number, number][] = sec.tipo === 'circ'
      ? Array.from({ length: 16 }, (_, k) => [(sec.d / 2 - a) * Math.cos((2 * Math.PI * k) / 16), (sec.d / 2 - a) * Math.sin((2 * Math.PI * k) / 16)] as [number, number])
      : [[-(w / 2 - a), h / 2 - a], [w / 2 - a, h / 2 - a], [w / 2 - a, -(h / 2 - a)], [-(w / 2 - a), -(h / 2 - a)]];
    const per = anel.reduce((s, q, i) => s + Math.hypot(q[0] - anel[(i + 1) % anel.length][0], q[1] - anel[(i + 1) % anel.length][1]), 0), leg = Math.max(0, (l.estribos.comprimento - per) / 2);
    for (const z of zs) {
      const pts = [...anel, anel[0]].map(([u, v]) => { const [gx, gy] = glob(l.pavimento, u, v); return [gx, gy, z] as V3; });
      const [c0x, c0y] = centroNoLance(p, l.pavimento), q0 = pts[0], dl = Math.hypot(c0x - q0[0], c0y - q0[1]) || 1, ux = (c0x - q0[0]) / dl, uy = (c0y - q0[1]) / dl;
      const ini: V3 = [q0[0] + ux * leg, q0[1] + uy * leg, z], fim: V3 = [q0[0] + ux * leg * 0.7071, q0[1] + uy * leg * 0.7071, z - leg * 0.7071];
      if (!emitir(l.pavimento, { posicao: 'E', tipo: 'estribo', phi: l.estribos.phi, caminho: [ini, ...pts, fim], comprimento: l.estribos.comprimento })) return;
      for (let g = 0; g < l.estribos.grampos; g++) {
        const vg = ((g + 1) / (l.estribos.grampos + 1) - 0.5) * (h - 2 * a), ex = w / 2 - a, [x0, y0] = glob(l.pavimento, -ex, vg), [x1, y1] = glob(l.pavimento, ex, vg);
        const cg: V3[] = [[x0, y0, z], [x1, y1, z]], lg = Math.max(0, (l.estribos.comprimentoGrampo - Math.hypot(x1 - x0, y1 - y0)) / 2);
        if (!emitir(l.pavimento, { posicao: 'G', tipo: 'grampo', phi: l.estribos.phi, caminho: [[x0, y0, z - lg], ...cg, [x1, y1, z - lg]], comprimento: l.estribos.comprimentoGrampo })) return;
      }
    }
  }
  void esc;
}

// ---------------------------------------------------------------- lajes

function barrasDaLaje(b: BuildingModel, lajeId: string, dim: Dimensionamento, pav: { id: string; cota: number }, emitir: (x: Omit<Barra3D, 'id' | 'origem' | 'elemento' | 'nome' | 'pavimento' | 'raio'>) => boolean) {
  const l = b.lajes.find((q) => q.id === lajeId), d = dim.detalhesLajes?.find((q) => q.laje === lajeId);
  if (!l || !d) return;
  const cob = cobrimentoLaje(b, l.cobrimento), topo = pav.cota + (l.nivel ?? 0), base = topo - d.h;
  for (const x of d.posicoes) {
    const phi = x.phi / 1000, ca = x.dir === 1 ? phi : 0;
    const z = x.face === 'inf' ? base + cob.inf + phi / 2 + ca : topo - cob.sup - phi / 2 - ca;
    const [f0, f1] = x.faixa, Lf = Math.hypot(f1[0] - f0[0], f1[1] - f0[1]);
    const ba = Math.hypot(x.z[0] - x.a[0], x.z[1] - x.a[1]) || 1, bx = (x.z[0] - x.a[0]) / ba, by = (x.z[1] - x.a[1]) / ba;
    const sentido: V3 = [0, 0, x.face === 'inf' ? 1 : -1];
    for (let k = 0; k < x.n; k++) {
      let tx = 0, ty = 0;
      if (x.n > 1) {
        if (Lf > 1e-9) {
          const fx = (f1[0] - f0[0]) / Lf, fy = (f1[1] - f0[1]) / Lf, ta = (x.a[0] - f0[0]) * fx + (x.a[1] - f0[1]) * fy, t = (k * Lf) / (x.n - 1) - ta;
          tx = fx * t; ty = fy * t;
        } else { tx = -by * x.s * k; ty = bx * x.s * k; }
      }
      const c: V3[] = [[x.a[0] + tx, x.a[1] + ty, z], [x.z[0] + tx, x.z[1] + ty, z]];
      if (!emitir({ posicao: x.pos, tipo: x.tipo, face: x.face, phi: x.phi, caminho: ajustar(c, x.comprimento, [x.ganchos[0] > 0, x.ganchos[1] > 0], [sentido, sentido]), comprimento: x.comprimento })) return;
    }
  }
}

// ---------------------------------------------------------------- entrada

export function armaduras3D(b: BuildingModel, dim: Dimensionamento, sel: SelecaoArmaduras = {}): Armaduras3D {
  const limite = sel.limiteSegmentos ?? LIMITE_SEGMENTOS_ARMADURA, esc = sel.escalaRaio ?? 1;
  const out: Armaduras3D = { barras: [], segmentos: 0, truncado: false, comprimentos: {}, avisos: [] };
  const tipoOk = (t: OrigemArmadura) => !sel.tipos || sel.tipos.includes(t);
  const elOk = (id: string) => !sel.elementos || sel.elementos.includes(id);
  const pavOk = (id: string) => !sel.pavimentos || sel.pavimentos.includes(id);
  let seq = 0;
  const fazer = (origem: OrigemArmadura, elemento: string, nome: string, pavimento: string) => (x: Omit<Barra3D, 'id' | 'origem' | 'elemento' | 'nome' | 'pavimento' | 'raio'>): boolean => {
    const seg = Math.max(0, x.caminho.length - 1);
    if (out.segmentos + seg > limite) { out.truncado = true; return false; }
    out.segmentos += seg;
    out.barras.push({ ...x, id: `${origem}:${elemento}:${pavimento}:${x.posicao}:${seq++}`, origem, elemento, nome, pavimento, raio: (x.phi / 2000) * esc });
    const k = `${elemento}|${pavimento}`;
    out.comprimentos[k] = (out.comprimentos[k] ?? 0) + comprimentoCaminho(x.caminho);
    return true;
  };
  if (tipoOk('viga')) {
    for (const v of b.vigas) {
      const d = dim.detalhes?.find((q) => q.viga === v.id);
      if (!d || !elOk(v.id)) continue;
      for (const pav of pavimentosDoGrupo(b, v.grupo)) if (pavOk(pav.id) && !out.truncado) barrasDaViga(b, v, d, pav, fazer('viga', v.id, v.nome, pav.id));
    }
  }
  if (tipoOk('pilar')) {
    for (const p of b.pilares) {
      if (!elOk(p.id) || out.truncado) continue;
      barrasDoPilar(b, p, dim, esc, (pav, x) => fazer('pilar', p.id, p.nome, pav)(x), pavOk);
    }
  }
  if (tipoOk('laje')) {
    for (const l of b.lajes) {
      if (!elOk(l.id)) continue;
      for (const pav of pavimentosDoGrupo(b, l.grupo)) if (pavOk(pav.id) && !out.truncado) barrasDaLaje(b, l.id, dim, pav, fazer('laje', l.id, l.nome, pav.id));
    }
    if (dim.vigotas?.length && (!sel.tipos || sel.tipos.includes('laje'))) out.avisos.push('Vigotas das lajes treliçadas ainda não são desenhadas em 3D.');
  }
  if (out.truncado) out.avisos.push(`Limite de ${limite} segmentos atingido: selecione um pavimento ou elemento para ver todas as barras.`);
  void pavimentosOrdenados;
  return out;
}

// ---------------------------------------------------------------- camadas para a interface

export type AgruparPor = 'bitola' | 'tipo' | 'elemento' | 'posicao';
export interface CamadaArmadura { chave: string; rotulo: string; phi?: number; /** [x0, y0, z0, x1, y1, z1, ...] por segmento. */ linhas: number[]; barras: number; segmentos: number }

/** Funde as barras em camadas por material (bitola, tipo, elemento ou posição): um objeto de linhas por camada. */
export function camadasDeArmadura(a: Armaduras3D, por: AgruparPor): CamadaArmadura[] {
  const m = new Map<string, CamadaArmadura>();
  for (const x of a.barras) {
    const chave = por === 'bitola' ? `φ${x.phi}` : por === 'tipo' ? `${x.origem}:${x.tipo}` : por === 'elemento' ? x.nome : `${x.nome}:${x.posicao}`;
    const c = m.get(chave) ?? { chave, rotulo: por === 'bitola' ? `φ${String(x.phi).replace('.', ',')} mm` : chave, ...(por === 'bitola' ? { phi: x.phi } : {}), linhas: [], barras: 0, segmentos: 0 };
    for (let i = 0; i + 1 < x.caminho.length; i++) c.linhas.push(...x.caminho[i], ...x.caminho[i + 1]);
    c.barras++; c.segmentos += Math.max(0, x.caminho.length - 1);
    m.set(chave, c);
  }
  return [...m.values()].sort((p, q) => (p.phi ?? 0) - (q.phi ?? 0) || p.chave.localeCompare(q.chave));
}

/**
 * Malha de tubos de seção poligonal (`lados` faces, 6 por padrão, sem tampas) que cobre os segmentos de `linhas`
 * com o raio dado: uma só malha por camada, para desenhar as barras como sólidos finos sem um objeto por barra.
 */
export function malhaDeTubos(linhas: number[], raio: number, lados = 6): { pos: Float32Array; idx: Uint32Array } {
  const n = Math.floor(linhas.length / 6), pos = new Float32Array(n * lados * 2 * 3), idx = new Uint32Array(n * lados * 6);
  for (let i = 0; i < n; i++) {
    const o = i * 6, dx = linhas[o + 3] - linhas[o], dy = linhas[o + 4] - linhas[o + 1], dz = linhas[o + 5] - linhas[o + 2], len = Math.hypot(dx, dy, dz) || 1e-9;
    const y: V3 = [dx / len, dy / len, dz / len], ref: V3 = Math.abs(y[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    let x: V3 = [ref[1] * y[2] - ref[2] * y[1], ref[2] * y[0] - ref[0] * y[2], ref[0] * y[1] - ref[1] * y[0]];
    const lx = Math.hypot(...x) || 1; x = [x[0] / lx, x[1] / lx, x[2] / lx];
    const z: V3 = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
    const v0 = i * lados * 2;
    for (let k = 0; k < lados; k++) {
      const a = (2 * Math.PI * k) / lados, c = Math.cos(a) * raio, s = Math.sin(a) * raio;
      for (let e = 0; e < 2; e++) {
        const q = (v0 + k * 2 + e) * 3;
        for (let m = 0; m < 3; m++) pos[q + m] = linhas[o + 3 * e + m] + x[m] * c + z[m] * s;
      }
      const k2 = (k + 1) % lados, t = (i * lados + k) * 6, a0 = v0 + k * 2, b0 = v0 + k2 * 2;
      idx.set([a0, b0, b0 + 1, a0, b0 + 1, a0 + 1], t);
    }
  }
  return { pos, idx };
}

/**
 * Cena do elemento isolado (concreto) e as barras dele, para a aba 3D das janelas de armadura. Viga e laje: o pavimento
 * dado ou o primeiro do grupo; pilar: todos os lances.
 */
export function cenaDoElemento(b: BuildingModel, dim: Dimensionamento, origem: OrigemArmadura, id: string, pavimento?: string): { cena: Cena3D; armaduras: Armaduras3D; pavimento?: string } {
  const el = origem === 'viga' ? b.vigas.find((v) => v.id === id) : origem === 'laje' ? b.lajes.find((l) => l.id === id) : b.pilares.find((p) => p.id === id);
  const grupo = el && 'grupo' in el ? el.grupo : undefined;
  const pav = origem === 'pilar' ? undefined : (pavimento && pavimentosOrdenados(b).some((p) => p.id === pavimento && p.grupo === grupo) ? pavimento : pavimentosDoGrupo(b, grupo ?? '')[0]?.id);
  const tudo = construirCena(b, pav ? { pavimentos: [pav] } : {});
  const objetos = tudo.objetos.filter((o) => o.elemento === id);
  const min: V3 = [Infinity, Infinity, Infinity], max: V3 = [-Infinity, -Infinity, -Infinity];
  for (const o of objetos) for (let i = 0; i < o.pos.length; i += 3) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], o.pos[i + k]); max[k] = Math.max(max[k], o.pos[i + k]); }
  if (!objetos.length) { min.fill(0); max.fill(0); }
  const porTipo: Record<string, number> = {}, porPavimento: Record<string, number> = {};
  for (const o of objetos) { porTipo[o.tipo] = (porTipo[o.tipo] ?? 0) + 1; porPavimento[o.pavimento] = (porPavimento[o.pavimento] ?? 0) + 1; }
  const cena: Cena3D = { objetos, auxiliares: [], rotulos: [], limites: { min, max }, contagens: { total: objetos.length, porTipo, porPavimento }, avisos: [] };
  return { cena, armaduras: armaduras3D(b, dim, { elementos: [id], tipos: [origem], ...(pav ? { pavimentos: [pav] } : {}) }), pavimento: pav };
}
