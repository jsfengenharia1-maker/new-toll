// Cortes do edifício e linhas de seção do pavimento (V2). Núcleo puro: `cortarCena` obtém as interseções de cada
// objeto da `Cena3D` com o plano vertical do corte (polígonos seccionados, hachurados) e as arestas dos elementos além
// do plano até a profundidade (vistos, linha fina); `desenharCorte` monta a elevação em SVG com níveis, cotas
// verticais, eixos e fundação; `secaoDoPavimento` devolve o diagrama da seção do pavimento por uma reta qualquer.
// As cores vêm das classes `corte-*` (global.css e memorial.css): nada de cor aqui.
import { comprimentoPolilinha, contornoNoLance, cotaFundacao, lancesDoPilar, pavimentosOrdenados, peDireito, trechosViga, type BuildingModel, type CorteEdificio, type LinhaSecao } from '../building/types';
import { propriedadesLaje } from '../building/lajes';
import { construirCena } from './cena';
import type { Cena3D, Objeto3D, TipoElemento3D } from './registro';

type V2 = [number, number];
const EPS = 1e-9;

// ---------------------------------------------------------------- cortes

export interface SegmentoCorte { /** Abscissa (m) do início e do fim do segmento no desenho. */ u0: number; u1: number; a: V2; b: V2 }
export interface PoligonoCorte {
  objeto: string; elemento: string; tipo: TipoElemento3D; pavimento: string;
  /** Segmento do corte (índice em `segmentos`). */
  segmento: number;
  /** Vértices (abscissa do desenho, cota), m. */
  pontos: V2[];
  /** Área (m²) do polígono. */
  area: number;
}
export interface LinhasVistas { objeto: string; elemento: string; tipo: TipoElemento3D; pavimento: string; /** [u0, z0, u1, z1, ...] */ linhas: number[] }
export interface CorteCena {
  corte: string;
  comprimento: number;
  segmentos: SegmentoCorte[];
  secoes: PoligonoCorte[];
  vistos: LinhasVistas[];
  zMin: number; zMax: number;
}

/**
 * Segmentos do traçado já orientados para o observador olhar para a esquerda do sentido de percurso (a abscissa u cresce
 * para a direita do observador). O sentido `dir` inverte o traçado.
 */
export function segmentosDoCorte(c: Pick<CorteEdificio, 'pontos' | 'sentido'>): SegmentoCorte[] {
  const pts = c.sentido === 'dir' ? c.pontos.slice().reverse() : c.pontos;
  const out: SegmentoCorte[] = [];
  let u = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    if (L < EPS) continue;
    out.push({ u0: u, u1: u + L, a: pts[i], b: pts[i + 1] });
    u += L;
  }
  return out;
}

const chave = (u: number, z: number) => `${Math.round(u * 1e6)}|${Math.round(z * 1e6)}`;

/** Recorta o polígono pelo semiplano u ≥ u0 (`mais`) ou u ≤ u0 (Sutherland-Hodgman). */
function recortarU(poly: V2[], u0: number, maior: boolean): V2[] {
  const dentro = (p: V2) => (maior ? p[0] >= u0 - EPS : p[0] <= u0 + EPS);
  const out: V2[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length], dp = dentro(p), dq = dentro(q);
    if (dp) out.push(p);
    if (dp !== dq) { const t = (u0 - p[0]) / (q[0] - p[0]); out.push([u0, p[1] + t * (q[1] - p[1])]); }
  }
  return out;
}

/** Remove vértices repetidos e colineares. */
function limpar(p: V2[]): V2[] {
  let r = p.filter((q, i) => { const a = p[(i + p.length - 1) % p.length]; return Math.hypot(q[0] - a[0], q[1] - a[1]) > 1e-7; });
  for (let mudou = true; mudou && r.length > 3;) {
    mudou = false;
    for (let i = 0; i < r.length; i++) {
      const a = r[(i + r.length - 1) % r.length], q = r[i], c = r[(i + 1) % r.length];
      if (Math.abs((q[0] - a[0]) * (c[1] - q[1]) - (q[1] - a[1]) * (c[0] - q[0])) < 1e-9) { r = r.filter((_, k) => k !== i); mudou = true; break; }
    }
  }
  return r;
}
const areaAbs = (p: V2[]) => Math.abs(p.reduce((s, q, i) => { const c = p[(i + 1) % p.length]; return s + q[0] * c[1] - c[0] * q[1]; }, 0) / 2);

/** Laços da interseção da malha fechada do objeto com o plano w = 0 (coordenadas locais u, z). */
function lacosNoPlano(o: Objeto3D, U: Float64Array, W: Float64Array): V2[][] {
  const Z = (i: number) => o.pos[i * 3 + 2];
  const cruz = (i: number, j: number): V2 => {
    const [p, q] = U[i] < U[j] || (U[i] === U[j] && (W[i] < W[j] || (W[i] === W[j] && Z(i) <= Z(j)))) ? [i, j] : [j, i];
    const t = (0 - W[p]) / (W[q] - W[p]);
    return [U[p] + t * (U[q] - U[p]), Z(p) + t * (Z(q) - Z(p))];
  };
  const segs: [V2, V2][] = [];
  for (let k = 0; k < o.idx.length; k += 3) {
    const v = [o.idx[k], o.idx[k + 1], o.idx[k + 2]];
    const pos = v.map((i) => W[i] >= 0);
    if (pos[0] === pos[1] && pos[1] === pos[2]) continue;
    let ent: V2 | null = null, sai: V2 | null = null;
    for (let e = 0; e < 3; e++) {
      const i = v[e], j = v[(e + 1) % 3];
      if (!pos[e] && pos[(e + 1) % 3]) ent = cruz(i, j);
      else if (pos[e] && !pos[(e + 1) % 3]) sai = cruz(i, j);
    }
    if (ent && sai) segs.push([ent, sai]);
  }
  const porInicio = new Map<string, number[]>();
  segs.forEach((s, i) => { const k = chave(s[0][0], s[0][1]); (porInicio.get(k) ?? porInicio.set(k, []).get(k)!).push(i); });
  const usado = new Array<boolean>(segs.length).fill(false), lacos: V2[][] = [];
  for (let i0 = 0; i0 < segs.length; i0++) {
    if (usado[i0]) continue;
    const laco: V2[] = [];
    let i = i0;
    for (;;) {
      usado[i] = true;
      laco.push(segs[i][0]);
      const prox = (porInicio.get(chave(segs[i][1][0], segs[i][1][1])) ?? []).find((k) => !usado[k]);
      if (prox === undefined) break;
      i = prox;
    }
    if (laco.length >= 3) lacos.push(laco);
  }
  return lacos;
}

/** Segmento 3D (u, w, z) recortado a 0 ≤ w ≤ prof e 0 ≤ u ≤ L (Liang-Barsky); devolve [u0, z0, u1, z1] ou null. */
function recortarLinha(p: number[], q: number[], L: number, prof: number): number[] | null {
  let t0 = 0, t1 = 1;
  const cl = (d: number, dist: number) => {
    // restrição d·t ≥ -dist... (dist = valor do ponto p na grandeza; d = variação)
    if (Math.abs(d) < EPS) return dist >= -EPS;
    const t = -dist / d;
    if (d > 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
    return true;
  };
  const du = q[0] - p[0], dw = q[1] - p[1];
  if (!cl(du, p[0]) || !cl(-du, L - p[0]) || !cl(dw, p[1]) || !cl(-dw, prof - p[1])) return null;
  if (t1 - t0 < 1e-9) return null;
  return [p[0] + t0 * du, p[2] + t0 * (q[2] - p[2]), p[0] + t1 * du, p[2] + t1 * (q[2] - p[2])];
}

export function cortarCena(cena: Cena3D, corte: Pick<CorteEdificio, 'pontos' | 'sentido' | 'profundidade'>): CorteCena {
  const segmentos = segmentosDoCorte(corte), prof = corte.profundidade ?? Infinity;
  const secoes: PoligonoCorte[] = [], vistosPor = new Map<string, LinhasVistas>();
  let zMin = Infinity, zMax = -Infinity;
  segmentos.forEach((sg, si) => {
    const dx = sg.b[0] - sg.a[0], dy = sg.b[1] - sg.a[1], L = sg.u1 - sg.u0, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    for (const o of cena.objetos) {
      const n = o.pos.length / 3, U = new Float64Array(n), W = new Float64Array(n);
      let uMin = Infinity, uMax = -Infinity, wMin = Infinity, wMax = -Infinity;
      for (let i = 0; i < n; i++) {
        const x = o.pos[i * 3] - sg.a[0], y = o.pos[i * 3 + 1] - sg.a[1];
        U[i] = x * ux + y * uy; W[i] = x * nx + y * ny;
        if (U[i] < uMin) uMin = U[i]; if (U[i] > uMax) uMax = U[i]; if (W[i] < wMin) wMin = W[i]; if (W[i] > wMax) wMax = W[i];
      }
      if (wMax < -EPS || uMax < -EPS || uMin > L + EPS || wMin > prof) continue;
      if (wMin < 0 && wMax >= 0) {
        for (const laco of lacosNoPlano(o, U, W)) {
          let poly = recortarU(recortarU(laco, 0, true), L, false);
          if (poly.length < 3) continue;
          poly = limpar(poly);
          const area = areaAbs(poly);
          if (poly.length < 3 || area < 1e-8) continue;
          const pontos = poly.map(([u, z]) => [u + sg.u0, z] as V2);
          secoes.push({ objeto: o.id, elemento: o.elemento, tipo: o.tipo, pavimento: o.pavimento, segmento: si, pontos, area });
          for (const [, z] of poly) { if (z < zMin) zMin = z; if (z > zMax) zMax = z; }
        }
      }
      const ls: number[] = [];
      for (let i = 0; i + 5 < o.linhas.length; i += 6) {
        const a = [(o.linhas[i] - sg.a[0]) * ux + (o.linhas[i + 1] - sg.a[1]) * uy, (o.linhas[i] - sg.a[0]) * nx + (o.linhas[i + 1] - sg.a[1]) * ny, o.linhas[i + 2]];
        const b = [(o.linhas[i + 3] - sg.a[0]) * ux + (o.linhas[i + 4] - sg.a[1]) * uy, (o.linhas[i + 3] - sg.a[0]) * nx + (o.linhas[i + 4] - sg.a[1]) * ny, o.linhas[i + 5]];
        const r = recortarLinha(a, b, L, prof);
        if (r) { ls.push(r[0] + sg.u0, r[1], r[2] + sg.u0, r[3]); for (const z of [r[1], r[3]]) { if (z < zMin) zMin = z; if (z > zMax) zMax = z; } }
      }
      if (ls.length) {
        const v = vistosPor.get(o.id) ?? { objeto: o.id, elemento: o.elemento, tipo: o.tipo, pavimento: o.pavimento, linhas: [] };
        v.linhas.push(...ls);
        vistosPor.set(o.id, v);
      }
    }
  });
  if (!isFinite(zMin)) { zMin = 0; zMax = 0; }
  const comprimento = segmentos.length ? segmentos[segmentos.length - 1].u1 : 0;
  return { corte: '', comprimento, segmentos, secoes, vistos: [...vistosPor.values()], zMin, zMax };
}

// ---------------------------------------------------------------- desenho

const f2 = (v: number) => v.toFixed(2).replace('.', ',');
const f1 = (v: number) => (Math.round(v * 10) / 10).toString();
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/** Abscissas (m, no desenho) em que os eixos de referência cruzam o corte. */
export function eixosNoCorte(b: BuildingModel, corte: Pick<CorteEdificio, 'pontos' | 'sentido'>): { nome: string; u: number }[] {
  const out: { nome: string; u: number }[] = [];
  for (const sg of segmentosDoCorte(corte)) {
    const dx = sg.b[0] - sg.a[0], dy = sg.b[1] - sg.a[1], L = sg.u1 - sg.u0;
    for (const e of b.eixos) {
      const ex = e.p2[0] - e.p1[0], ey = e.p2[1] - e.p1[1], den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-12) continue;
      const rx = e.p1[0] - sg.a[0], ry = e.p1[1] - sg.a[1];
      const t = (rx * ey - ry * ex) / den, s = (rx * dy - ry * dx) / den;
      if (t < -1e-9 || t > 1 + 1e-9 || s < -1e-9 || s > 1 + 1e-9) continue;
      out.push({ nome: e.nome, u: sg.u0 + t * L });
    }
  }
  return out.sort((a, z) => a.u - z.u);
}

export interface NivelCorte { nome: string; cota: number; fundacao?: boolean }
export interface DesenhoCorte {
  svg: string;
  cena: CorteCena;
  niveis: NivelCorte[];
  eixos: { nome: string; u: number }[];
  /** Cotas verticais entre níveis consecutivos (m). */
  cotas: { z0: number; z1: number; valor: number }[];
  largura: number; altura: number;
}

/** Níveis do edifício: pavimentos (topo da laje) e a cota de apoio das fundações. */
export function niveisDoEdificio(b: BuildingModel): NivelCorte[] {
  return [{ nome: 'Fundação', cota: cotaFundacao(b), fundacao: true }, ...pavimentosOrdenados(b).map((p) => ({ nome: p.nome, cota: p.cota }))].sort((a, z) => a.cota - z.cota);
}

export function desenharCorte(b: BuildingModel, corte: CorteEdificio, o: { cena?: Cena3D; idSvg?: string } = {}): DesenhoCorte {
  const cena3 = o.cena ?? construirCena(b);
  const c = { ...cortarCena(cena3, corte), corte: corte.id };
  const niveis = niveisDoEdificio(b), eixos = eixosNoCorte(b, corte);
  const zLo = Math.min(c.zMin, ...niveis.map((n) => n.cota)) - 0.3, zHi = Math.max(c.zMax, ...niveis.map((n) => n.cota)) + 0.5;
  const ML = 2.8, MR = 1.8, MT = 0.9, L = Math.max(c.comprimento, 1);
  const X = (u: number) => (u + ML) * 100, Y = (z: number) => (zHi - z) * 100 + MT * 100;
  const W = (L + ML + MR) * 100, H = (zHi - zLo + MT) * 100 + 40;
  const id = `corte-h-${o.idSvg ?? corte.id}`;
  const p: string[] = [`<defs><pattern id="${id}" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line class="corte-hachura" x1="0" y1="0" x2="0" y2="14"/></pattern></defs>`];
  // vistos, por tipo, em um só caminho
  const porTipo = new Map<string, string[]>();
  for (const v of c.vistos) {
    const d = porTipo.get(v.tipo) ?? [];
    for (let i = 0; i < v.linhas.length; i += 4) d.push(`M${f1(X(v.linhas[i]))} ${f1(Y(v.linhas[i + 1]))}L${f1(X(v.linhas[i + 2]))} ${f1(Y(v.linhas[i + 3]))}`);
    porTipo.set(v.tipo, d);
  }
  p.push('<g class="corte-vistos">');
  for (const [tipo, d] of porTipo) p.push(`<path class="corte-visto corte-v-${tipo}" d="${d.join('')}"/>`);
  p.push('</g>');
  // níveis
  p.push('<g class="corte-niveis">');
  for (const n of niveis) {
    const y = Y(n.cota);
    p.push(`<line class="corte-nivel${n.fundacao ? ' fundacao' : ''}" x1="${f1(X(0) - 60)}" y1="${f1(y)}" x2="${f1(X(L) + 40)}" y2="${f1(y)}"/><text class="corte-txt nivel" x="${f1(X(0) - 66)}" y="${f1(y - 6)}" text-anchor="end">${esc(n.nome)} (${f2(n.cota)})</text>`);
  }
  p.push('</g>');
  // seções
  p.push('<g class="corte-secoes">');
  for (const s of c.secoes) {
    const pts = s.pontos.map(([u, z]) => `${f1(X(u))},${f1(Y(z))}`).join(' ');
    p.push(`<polygon class="corte-sec corte-s-${s.tipo}" data-objeto="${esc(s.objeto)}" data-elemento="${esc(s.elemento)}" points="${pts}"/><polygon class="corte-hach" fill="url(#${id})" points="${pts}"/>`);
  }
  p.push('</g>');
  // eixos
  p.push('<g class="corte-eixos">');
  for (const e of eixos) p.push(`<line class="corte-eixo" x1="${f1(X(e.u))}" y1="${f1(Y(zHi) + 10)}" x2="${f1(X(e.u))}" y2="${f1(Y(zLo))}"/><circle class="corte-balao" cx="${f1(X(e.u))}" cy="${f1(Y(zHi) - 2)}" r="14"/><text class="corte-txt eixo" x="${f1(X(e.u))}" y="${f1(Y(zHi) + 3)}" text-anchor="middle">${esc(e.nome)}</text>`);
  p.push('</g>');
  // cotas verticais
  const cotas: DesenhoCorte['cotas'] = [];
  p.push('<g class="corte-cotas">');
  for (let i = 0; i + 1 < niveis.length; i++) {
    const a = niveis[i], z = niveis[i + 1], valor = z.cota - a.cota;
    if (valor < 0.01) continue;
    cotas.push({ z0: a.cota, z1: z.cota, valor });
    const x = X(L) + 80;
    p.push(`<line class="corte-cota" x1="${f1(x)}" y1="${f1(Y(a.cota))}" x2="${f1(x)}" y2="${f1(Y(z.cota))}"/><line class="corte-cota" x1="${f1(x - 6)}" y1="${f1(Y(a.cota))}" x2="${f1(x + 6)}" y2="${f1(Y(a.cota))}"/><line class="corte-cota" x1="${f1(x - 6)}" y1="${f1(Y(z.cota))}" x2="${f1(x + 6)}" y2="${f1(Y(z.cota))}"/><text class="corte-txt cota" x="${f1(x + 10)}" y="${f1((Y(a.cota) + Y(z.cota)) / 2 + 4)}">${f2(valor)}</text>`);
  }
  p.push('</g>');
  const svg = `<svg class="corte-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f1(W)} ${f1(H)}" data-corte="${esc(corte.id)}" data-secoes="${c.secoes.length}" role="img" aria-label="${esc(corte.nome)}">${p.join('')}</svg>`;
  return { svg, cena: c, niveis, eixos, cotas, largura: W, altura: H };
}

// ---------------------------------------------------------------- seção do pavimento

export interface ElementoSecao { tipo: 'pilar' | 'viga' | 'laje'; elemento: string; nome: string; u0: number; u1: number; z0: number; z1: number }
export interface VaoSecao { u0: number; u1: number; /** Vão livre (face a face) e de eixo a eixo (m). */ livre: number; eixo: number; apoioIni: string; apoioFim: string; /** Há laje sobre o vão. */ laje: boolean }
export interface SecaoPavimento {
  linha: string; nome: string; pavimento: string; pavimentoNome: string; cota: number;
  comprimento: number;
  elementos: ElementoSecao[];
  /** Pilares e vigas cortados (apoios), fundidos quando se tocam. */
  apoios: ElementoSecao[];
  vaos: VaoSecao[];
  svg: string; largura: number; altura: number;
}

/** Intervalos [u0, u1] da reta a→b dentro dos anéis (regra par-ímpar, meia-abertura nos vértices). */
export function intervalosDaReta(a: V2, b: V2, aneis: V2[][]): [number, number][] {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  const us: number[] = [];
  for (const r of aneis) for (let i = 0; i < r.length; i++) {
    const p = r[i], q = r[(i + 1) % r.length];
    const sp = ux * (p[1] - a[1]) - uy * (p[0] - a[0]), sq = ux * (q[1] - a[1]) - uy * (q[0] - a[0]);
    if (sp >= 0 === sq >= 0) continue;
    const s = sp / (sp - sq), x = p[0] + s * (q[0] - p[0]) - a[0], y = p[1] + s * (q[1] - p[1]) - a[1];
    us.push(x * ux + y * uy);
  }
  us.sort((m, n) => m - n);
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < us.length; i += 2) {
    const u0 = Math.max(0, us[i]), u1 = Math.min(L, us[i + 1]);
    if (u1 - u0 > 1e-6) out.push([u0, u1]);
  }
  return out;
}
function unir(iv: [number, number][]): [number, number][] {
  const r: [number, number][] = [];
  for (const q of iv.slice().sort((a, z) => a[0] - z[0])) { const t = r.at(-1); if (t && q[0] <= t[1] + 1e-6) t[1] = Math.max(t[1], q[1]); else r.push([q[0], q[1]]); }
  return r;
}

export function secaoDoPavimento(b: BuildingModel, linha: Pick<LinhaSecao, 'id' | 'nome' | 'a' | 'b' | 'pavimento'>, pavimentoId?: string): SecaoPavimento {
  const ps = pavimentosOrdenados(b), pav = ps.find((p) => p.id === (pavimentoId ?? linha.pavimento)) ?? ps[0];
  const L = Math.hypot(linha.b[0] - linha.a[0], linha.b[1] - linha.a[1]);
  const els: ElementoSecao[] = [];
  if (pav && L > EPS) {
    for (const l of b.lajes) {
      if (l.grupo !== pav.grupo) continue;
      const h = propriedadesLaje(l.tipo).h, topo = pav.cota + (l.nivel ?? 0);
      for (const [u0, u1] of intervalosDaReta(linha.a, linha.b, [l.contorno, ...(l.furos ?? [])])) els.push({ tipo: 'laje', elemento: l.id, nome: l.nome, u0, u1, z0: topo - h, z1: topo });
    }
    for (const v of b.vigas) {
      if (v.grupo !== pav.grupo) continue;
      const ref = pav.cota + (v.nivel ?? 0), z0 = v.invertida ? ref : ref - v.secao.h, z1 = v.invertida ? ref + v.secao.h : ref;
      for (const [u0, u1] of unir(trechosViga(v).flatMap((t) => intervalosDaReta(linha.a, linha.b, [t])))) els.push({ tipo: 'viga', elemento: v.id, nome: v.nome, u0, u1, z0, z1 });
    }
    for (const p of b.pilares) {
      if (!lancesDoPilar(b, p).some((x) => x.id === pav.id)) continue;
      const z1 = pav.cota, z0 = z1 - peDireito(b, pav.id);
      for (const [u0, u1] of intervalosDaReta(linha.a, linha.b, [contornoNoLance(p, pav.id)])) els.push({ tipo: 'pilar', elemento: p.id, nome: p.nome, u0, u1, z0, z1 });
    }
  }
  els.sort((a, z) => a.u0 - z.u0 || a.tipo.localeCompare(z.tipo));
  // apoios: pilares e vigas cortados, fundidos quando se sobrepõem (o pilar prevalece no nome)
  const apoios: ElementoSecao[] = [];
  for (const e of els.filter((x) => x.tipo !== 'laje')) {
    const t = apoios.at(-1);
    if (t && e.u0 <= t.u1 + 1e-6) { t.u1 = Math.max(t.u1, e.u1); t.z0 = Math.min(t.z0, e.z0); t.z1 = Math.max(t.z1, e.z1); if (e.tipo === 'pilar') { t.tipo = 'pilar'; t.nome = e.nome; t.elemento = e.elemento; } }
    else apoios.push({ ...e });
  }
  const lajes = els.filter((x) => x.tipo === 'laje');
  const vaos: VaoSecao[] = [];
  for (let i = 0; i + 1 < apoios.length; i++) {
    const A = apoios[i], Z = apoios[i + 1], livre = Z.u0 - A.u1;
    if (livre < 1e-6) continue;
    const meio = (A.u1 + Z.u0) / 2;
    vaos.push({ u0: A.u1, u1: Z.u0, livre, eixo: (Z.u0 + Z.u1) / 2 - (A.u0 + A.u1) / 2, apoioIni: A.nome, apoioFim: Z.nome, laje: lajes.some((l) => meio >= l.u0 && meio <= l.u1) });
  }
  // desenho
  const zs = els.flatMap((e) => [e.z0, e.z1]), zLo = (zs.length ? Math.min(...zs) : 0) - 0.4, zHi = (zs.length ? Math.max(...zs) : 1) + 0.6;
  const ML = 1.6, MR = 1.2, X = (u: number) => (u + ML) * 100, Y = (z: number) => (zHi - z) * 100 + 40;
  const W = (L + ML + MR) * 100, H = (zHi - zLo) * 100 + 90;
  const p: string[] = [];
  for (const e of els.filter((x) => x.tipo === 'laje')) p.push(`<rect class="corte-sec corte-s-laje" data-elemento="${esc(e.elemento)}" x="${f1(X(e.u0))}" y="${f1(Y(e.z1))}" width="${f1((e.u1 - e.u0) * 100)}" height="${f1((e.z1 - e.z0) * 100)}"/>`);
  for (const e of els.filter((x) => x.tipo === 'viga')) p.push(`<rect class="corte-sec corte-s-viga" data-elemento="${esc(e.elemento)}" x="${f1(X(e.u0))}" y="${f1(Y(e.z1))}" width="${f1((e.u1 - e.u0) * 100)}" height="${f1((e.z1 - e.z0) * 100)}"/><text class="corte-txt" x="${f1(X((e.u0 + e.u1) / 2))}" y="${f1(Y(e.z0) + 16)}" text-anchor="middle">${esc(e.nome)}</text>`);
  for (const e of els.filter((x) => x.tipo === 'pilar')) p.push(`<rect class="corte-sec corte-s-pilar" data-elemento="${esc(e.elemento)}" x="${f1(X(e.u0))}" y="${f1(Y(e.z1))}" width="${f1((e.u1 - e.u0) * 100)}" height="${f1((e.z1 - e.z0) * 100)}"/><text class="corte-txt" x="${f1(X((e.u0 + e.u1) / 2))}" y="${f1(Y(e.z0) + 16)}" text-anchor="middle">${esc(e.nome)}</text>`);
  if (pav) p.push(`<line class="corte-nivel" x1="${f1(X(0) - 40)}" y1="${f1(Y(pav.cota))}" x2="${f1(X(L) + 40)}" y2="${f1(Y(pav.cota))}"/><text class="corte-txt nivel" x="${f1(X(0) - 44)}" y="${f1(Y(pav.cota) - 6)}" text-anchor="end">${esc(pav.nome)} (${f2(pav.cota)})</text>`);
  const yc = Y(zHi) - 10;
  for (const v of vaos) p.push(`<line class="corte-cota" x1="${f1(X(v.u0))}" y1="${f1(yc)}" x2="${f1(X(v.u1))}" y2="${f1(yc)}"/><text class="corte-txt cota" x="${f1(X((v.u0 + v.u1) / 2))}" y="${f1(yc - 5)}" text-anchor="middle">${f2(v.livre)}</text>`);
  const svg = `<svg class="corte-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f1(W)} ${f1(H)}" data-secao="${esc(linha.id)}" data-elementos="${els.length}" role="img" aria-label="${esc(linha.nome)}">${p.join('')}</svg>`;
  return { linha: linha.id, nome: linha.nome, pavimento: pav?.id ?? '', pavimentoNome: pav?.nome ?? '', cota: pav?.cota ?? 0, comprimento: L, elementos: els, apoios, vaos, svg, largura: W, altura: H };
}

/** Comprimento (m) do traçado de um corte. */
export const comprimentoDoCorte = (c: Pick<CorteEdificio, 'pontos'>) => comprimentoPolilinha(c.pontos);
