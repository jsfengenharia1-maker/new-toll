// Lajes nervuradas bidirecionais moldadas no local (frente E3c): formas (cubetas) em catálogo editável na biblioteca de
// normas (`lajes.formas`) e na obra, geometria, peso e volume, propriedades das barras da grelha (rigidez equivalente da
// nervura em T, zonas maciças), arranjo das nervuras e das cubetas, verificações geométricas da NBR 6118 (13.2.4.2 e
// 14.7.7 [números de item a confirmar]) e quantitativos de concreto e de forma. O dimensionamento das nervuras está em
// `nervuradasDim.ts`. Núcleo puro; kN, m. Dados de fabricante NÃO vêm no programa: o catálogo traz geometrias genéricas.
import { tabelaNorma, type FonteNormas } from '../normas';
import { areaPoligono, dentroPoligono, type P } from '../geom/faces';
import { intersecaoPoligonos } from '../geom/recorte';
import type { Abaco, BuildingModel, Laje, TipoLaje } from './types';
import { opcoesEmUso, perfilDe } from './opcoes';
import { enchimentoPorOuExemplo, GAMA_CONCRETO, secaoT, type FonteLajes } from './tiposLaje';

export type TipoForma = 'recuperavel' | 'perdida';
export const TIPOS_FORMA: { v: TipoForma; rotulo: string }[] = [{ v: 'recuperavel', rotulo: 'Recuperável' }, { v: 'perdida', rotulo: 'Perdida' }];

/**
 * Forma (cubeta) da laje nervurada bidirecional. `intereixo[k]` e `bw[k]` são a distância entre eixos e a largura das nervuras
 * da direção k (0 = a da laje, 1 = a transversal); a cubeta mede (intereixo[1] − bw[1]) ao longo da direção 0 e
 * (intereixo[0] − bw[0]) ao longo da direção 1. `pesoM2` e `volume` são valores indicativos informados que substituem os calculados.
 */
export interface FormaLaje {
  id: string; nome: string; tipo: TipoForma;
  altura: number; pecas: number;
  intereixo: [number, number]; bw: [number, number];
  /** Forma perdida: enchimento que fica na laje (id da biblioteca de enchimentos). */
  enchimento?: string;
  pesoM2?: number; volume?: number;
  nota?: string;
}

export type TipoNervurada = Extract<TipoLaje, { tipo: 'nervurada' }>;
/** Biblioteca de formas da obra dentro de `b.tiposLaje` e as tabelas normativas (N3). */
export type FonteFormas = FonteLajes & { tiposLaje?: { formas?: FormaLaje[] } };

const cm = (x: number) => Math.round(x * 100);
const num = (x: unknown, pad: number) => (typeof x === 'number' && Number.isFinite(x) ? x : pad);

/** Formas do catálogo (biblioteca de normas, `lajes.formas`). */
export function formasCatalogo(f?: FonteNormas): FormaLaje[] {
  return tabelaNorma(f, 'lajes.formas').map((l) => ({
    id: l.id as string, nome: l.nome as string, tipo: (l.tipo === 'perdida' ? 'perdida' : 'recuperavel') as TipoForma,
    altura: num(l.altura, 0.2), pecas: Math.max(1, Math.round(num(l.pecas, 1))),
    intereixo: [num(l.ix, 0.6), num(l.iy, 0.6)], bw: [num(l.bwx, 0.1), num(l.bwy, 0.1)],
    ...(l.enchimento && l.enchimento !== 'nenhum' ? { enchimento: l.enchimento as string } : {}),
    ...(typeof l.pesoM2 === 'number' ? { pesoM2: l.pesoM2 } : {}), ...(typeof l.volume === 'number' ? { volume: l.volume } : {}),
  }));
}
/** Formas disponíveis: as da obra primeiro, depois as do catálogo que a obra não repete. */
export const formasDisponiveis = (f?: FonteFormas): FormaLaje[] => [...(f?.tiposLaje?.formas ?? []), ...formasCatalogo(f).filter((c) => !f?.tiposLaje?.formas?.some((e) => e.id === c.id))];
export const formaPor = (f: FonteFormas | undefined, id: string): FormaLaje | undefined => formasDisponiveis(f).find((x) => x.id === id);

/** Coerência lógica da forma (não confere dado de fabricante). */
export function validarForma(fm: FormaLaje, f?: FonteFormas): string[] {
  const e: string[] = [], pos = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0;
  if (!fm.nome?.trim()) e.push('Forma sem nome.');
  if (fm.tipo !== 'recuperavel' && fm.tipo !== 'perdida') e.push('Tipo da forma inválido (recuperável ou perdida).');
  if (!pos(fm.altura)) e.push('Altura da cubeta deve ser positiva.');
  if (!(Number.isInteger(fm.pecas) && fm.pecas >= 1)) e.push('Número de peças do bloco deve ser um inteiro ≥ 1.');
  for (const k of [0, 1] as const) {
    if (!pos(fm.intereixo?.[k]) || !pos(fm.bw?.[k])) e.push(`Direção ${k}: intereixo e largura da nervura devem ser positivos.`);
    else if (fm.bw[k] >= fm.intereixo[k]) e.push(`Direção ${k}: largura da nervura maior ou igual ao intereixo.`);
  }
  if (fm.tipo === 'perdida') {
    if (!fm.enchimento) e.push('Forma perdida pede o material de enchimento (id da biblioteca de enchimentos).');
    else if (!enchimentoPorOuExemplo(f, fm.enchimento)) e.push(`Enchimento "${fm.enchimento}" não existe na biblioteca.`);
  }
  if (fm.pesoM2 !== undefined && !(typeof fm.pesoM2 === 'number' && fm.pesoM2 >= 0)) e.push('Peso indicativo inválido.');
  if (fm.volume !== undefined && !pos(fm.volume)) e.push('Volume indicativo inválido.');
  return e;
}

// ---------------------------------------------------------------- geometria, peso e volume

export interface GeometriaBidirecional {
  tipo: 'nervurada';
  /** Altura total, capa e altura da cubeta (m). */
  h: number; capa: number; hEnch: number;
  /** Distância entre eixos e largura das nervuras de cada direção (m). */
  i: [number, number]; bw: [number, number];
  /** Área da cubeta em planta (m²) e fração da laje que ela ocupa. */
  cubeta: number; fracVazio: number;
  /** Volume de concreto (m³/m²), peso do concreto, do enchimento da forma perdida e total (kN/m²). */
  volume: number; ppConcreto: number; ppEnchimento: number; pp: number;
  recuperavel: boolean; pecas: number;
  forma: FormaLaje; descricao: string;
  /** Forma ou enchimento inexistente: usa-se a primeira forma do catálogo para não parar a análise. */
  ausente?: string;
}

const FORMA_PADRAO: FormaLaje = { id: 'padrao', nome: 'Recuperável 60 × 60 (padrão)', tipo: 'recuperavel', altura: 0.25, pecas: 1, intereixo: [0.6, 0.6], bw: [0.1, 0.1] };

/**
 * Geometria da nervurada bidirecional. Volume de concreto/m² = capa + altura da cubeta × (1 − fração ocupada pela cubeta) e peso
 * = 25 × volume (+ enchimento da forma perdida); os valores indicativos da forma (peso, volume), se informados, substituem os
 * calculados (forma recuperável: só o concreto pesa; a perdida soma o material de enchimento) [a confirmar com o fabricante].
 */
export function geometriaBidirecional(f: FonteFormas | undefined, t: TipoNervurada): GeometriaBidirecional {
  const fm0 = formaPor(f, t.forma), ausente = fm0 ? undefined : `forma "${t.forma}" não existe`;
  const fm = fm0 ?? formasCatalogo(f)[0] ?? FORMA_PADRAO;
  const h = t.hTotal, capa = t.capa, hEnch = Math.max(0.01, h - capa), [i0, i1] = fm.intereixo, [b0, b1] = fm.bw;
  const cubeta = Math.max(0, (i1 - b1) * (i0 - b0)), fracVazio = Math.min(1, cubeta / (i0 * i1));
  const volume = fm.volume ?? capa + hEnch * (1 - fracVazio), ppConcreto = GAMA_CONCRETO * volume;
  let ppEnchimento = 0, aus = ausente;
  if (fm.tipo === 'perdida') {
    const e = fm.enchimento ? enchimentoPorOuExemplo(f, fm.enchimento) : undefined;
    if (!e) aus = aus ?? `enchimento "${fm.enchimento ?? ''}" da forma não existe`;
    else if (e.material === 'generico') ppEnchimento = e.pesoM2 ?? 0;
    else if (e.material === 'ceramica' && e.pesoPeca !== undefined) ppEnchimento = e.pesoPeca / (i0 * i1);
    else ppEnchimento = (e.gama ?? 0) * hEnch * fracVazio;
  }
  const pp = fm.pesoM2 ?? ppConcreto + ppEnchimento;
  return {
    tipo: 'nervurada', h, capa, hEnch, i: [i0, i1], bw: [b0, b1], cubeta, fracVazio, volume, ppConcreto, ppEnchimento, pp,
    recuperavel: fm.tipo === 'recuperavel', pecas: fm.pecas, forma: fm, descricao: `nervurada ${fm.nome} h=${cm(h)}`, ...(aus ? { ausente: aus } : {}),
  };
}

// ---------------------------------------------------------------- opções e propriedades das barras da grelha

/** Opções lidas pelas funções deste arquivo. */
export interface OpNervurada {
  nervuradaMalha: number; nervuradaInercia: number; nervuradaTorcao: number; nervuradaMacicoViga: number;
  torcaoLaje: number;
}

/** Constante de torção de retângulo (aproximação de Saint-Venant). */
function torcaoRetangulo(b: number, h: number): number {
  const a = Math.max(b, h), c = Math.min(b, h);
  return a * c ** 3 * (1 / 3 - 0.21 * (c / a) * (1 - c ** 4 / (12 * a ** 4)));
}

/** Passo da malha da grelha (m): fração do menor intereixo da zona aliviada (1/3 no padrão do sistema). */
export const passoMalhaNervurada = (g: Pick<GeometriaBidirecional, 'i'>, op: Pick<OpNervurada, 'nervuradaMalha'>): number => Math.max(0.05, op.nervuradaMalha * Math.min(g.i[0], g.i[1]));

/** Direção do arranjo (graus): a informada ou a da maior aresta do contorno. */
export function direcaoNervurada(l: Pick<Laje, 'contorno' | 'direcao'>): number {
  if (l.direcao !== undefined) return l.direcao;
  let best = 0, L = 0;
  const c = l.contorno;
  for (let i = 0; i < c.length; i++) { const a = c[i], z = c[(i + 1) % c.length], d = Math.hypot(z[0] - a[0], z[1] - a[1]); if (d > L) { L = d; best = (Math.atan2(z[1] - a[1], z[0] - a[0]) * 180) / Math.PI; } }
  return best;
}

export interface PropBarraNervurada { A: number; I: number; J: number; As: number }
/**
 * Propriedades da barra da grelha que representa uma faixa de largura `w` com barras da direção `k` (as nervuras da direção k,
 * de distância entre eixos `i[k]`): rigidez equivalente da nervura em T (mesa = intereixo) por nervura × w/i. Padrão do sistema
 * (`nervuradaInercia` > 0): I = fator × inércia da faixa maciça de mesma altura, a mesma nas zonas maciça e aliviada, com
 * J = `nervuradaTorcao` × I. Perfil NBR (fator 0): inércia da seção T na zona aliviada e da laje maciça na zona maciça, com a
 * torção geométrica das nervuras reduzida por `torcaoLaje` (NBR 6118, 14.6.2) [a confirmar com 14.7.7].
 */
export function propBarraNervurada(g: GeometriaBidirecional, k: 0 | 1, w: number, macica: boolean, op: Pick<OpNervurada, 'nervuradaInercia' | 'nervuradaTorcao' | 'torcaoLaje'>): PropBarraNervurada {
  const s = g.i[k], bw = g.bw[k], n = w / s, Is = (w * g.h ** 3) / 12, IT = n * secaoT(s, g.capa, bw, g.h).I;
  const I = op.nervuradaInercia > 0 ? op.nervuradaInercia * Is : macica ? Is : IT;
  const J = op.nervuradaTorcao > 0 ? op.nervuradaTorcao * I : op.torcaoLaje * (macica ? 2 * Is : n * torcaoRetangulo(bw, g.h));
  return { A: macica ? w * g.h : n * (s * g.capa + bw * g.hEnch), I, J, As: (5 / 6) * (macica ? w * g.h : n * bw * g.h) };
}
/** Propriedades de uma barra cuja faixa tem a fração `fm` em zona maciça: mistura linear das propriedades das duas zonas. */
export function propBarraNervuradaMista(g: GeometriaBidirecional, k: 0 | 1, w: number, fm: number, op: Pick<OpNervurada, 'nervuradaInercia' | 'nervuradaTorcao' | 'torcaoLaje'>, hMac?: number): PropBarraNervurada {
  const a = propBarraNervurada(g, k, w, false, op);
  if (fm <= 0) return a;
  // ábaco rebaixado (E3d): a parte maciça tem a altura do ábaco
  const m = propBarraNervurada(hMac !== undefined && hMac > g.h + 1e-9 ? { ...g, h: hMac } : g, k, w, true, op);
  return { A: (1 - fm) * a.A + fm * m.A, I: (1 - fm) * a.I + fm * m.I, J: (1 - fm) * a.J + fm * m.J, As: (1 - fm) * a.As + fm * m.As };
}
/** Altura da laje maciça de mesma inércia por metro que a nervura em T da direção k (comparação com a placa). */
export const alturaMacicaEquivalente = (g: GeometriaBidirecional, k: 0 | 1): number => ((12 * secaoT(g.i[k], g.capa, g.bw[k], g.h).I) / g.i[k]) ** (1 / 3);

// ---------------------------------------------------------------- zonas maciças

function distSeg(p: P, a: P, z: P): number {
  const dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy, u = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
  return Math.hypot(a[0] + u * dx - p[0], a[1] + u * dy - p[1]);
}
const distAoContorno = (p: P, c: P[]): number => c.reduce((m, a, i) => Math.min(m, distSeg(p, a, c[(i + 1) % c.length])), Infinity);

/**
 * O ponto está numa zona maciça da nervurada? Dentro de uma zona maciça manual (`Laje.zonasMacicas`) ou a menos de `faixaViga`
 * do contorno (vigas de borda; opção `nervuradaMacicoViga`). Os ábacos de pilar entram na E3d.
 */
export function emZonaMacica(l: Pick<Laje, 'contorno' | 'zonasMacicas'>, p: P, faixaViga: number): boolean {
  if (faixaViga > 0 && distAoContorno(p, l.contorno as P[]) < faixaViga - 1e-9) return true;
  return (l.zonasMacicas ?? []).some((z) => dentroPoligono(p, z as P[]));
}

// ---------------------------------------------------------------- arranjo das nervuras e das cubetas

export interface Nervura {
  dir: 0 | 1;
  /** Índice da nervura na direção (a partir da origem do arranjo, no sentido crescente da coordenada transversal). */
  indice: number;
  /** Coordenada transversal no referencial da laje (m). */
  c: number;
  a: P; z: P; L: number;
}
export interface Cubeta { canto: [number, number]; poligono: [P, P, P, P] }
export interface ArranjoNervuras {
  angulo: number; origem: [number, number]; nervuras: Nervura[]; cubetas: Cubeta[]; areaCubetas: number; loc: (p: P) => P; glob: (p: P) => P;
  /** O ponto (planta) está na zona aliviada, isto é, numa célula (de eixo a eixo de nervuras) que recebe cubeta? O resto é maciço. */
  aliviada: (p: P) => boolean;
  /** Fração (0 a 1) da faixa de largura `w` da barra da direção `k` no ponto médio `p` que cai em zona maciça (4 amostras na largura, sem viés nos eixos). */
  fracMacica: (p: P, k: 0 | 1, w: number) => number;
}

/**
 * Arranjo das nervuras e das cubetas da laje: as nervuras da direção k passam pelo ponto de passagem (`Laje.pontoNervuras`; senão
 * o ponto de inserção do pano) e se repetem a cada `i[k]` na transversal; só entram cubetas inteiras, fora das zonas maciças e das
 * aberturas (o resto fica maciço).
 */
export function arranjoNervuras(l: Pick<Laje, 'contorno' | 'furos' | 'direcao' | 'pontoNervuras' | 'insercao' | 'zonasMacicas'>, g: GeometriaBidirecional, faixaViga = 0): ArranjoNervuras {
  const ang = (direcaoNervurada(l) * Math.PI) / 180, c = Math.cos(ang), s = Math.sin(ang);
  const loc = (p: P): P => [p[0] * c + p[1] * s, -p[0] * s + p[1] * c];
  const glob = (p: P): P => [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
  const cont = l.contorno as P[], aneis = [cont.map(loc), ...(l.furos ?? []).map((f) => (f as P[]).map(loc))];
  const ref = loc((l.pontoNervuras ?? cont[l.insercao ?? 0] ?? cont[0]) as P);
  const xs = aneis[0].map((p) => p[0]), ys = aneis[0].map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  /** Trechos internos da reta (coordenada `v` no eixo `eixo`). */
  const cortes = (eixo: 0 | 1, v: number): [number, number][] => {
    const t: number[] = [];
    for (const anel of aneis) for (let i = 0; i < anel.length; i++) {
      const p = anel[i], q = anel[(i + 1) % anel.length];
      if ((p[eixo] > v) !== (q[eixo] > v)) t.push(p[1 - eixo] + ((v - p[eixo]) * (q[1 - eixo] - p[1 - eixo])) / (q[eixo] - p[eixo]));
    }
    t.sort((u, w) => u - w);
    const out: [number, number][] = [];
    for (let k = 0; k + 1 < t.length; k += 2) if (t[k + 1] - t[k] > 0.2) out.push([t[k], t[k + 1]]);
    return out;
  };
  const posicoes = (r: number, passo: number, lo: number, hi: number): number[] => {
    const out: number[] = [];
    for (let k = Math.ceil((lo - r) / passo - 1e-9); r + k * passo < hi + 1e-9; k++) { const v = r + k * passo; if (v > lo + 0.01 && v < hi - 0.01) out.push(v); }
    return out;
  };
  const nervuras: Nervura[] = [];
  const eixoY = posicoes(ref[1], g.i[0], y0, y1), eixoX = posicoes(ref[0], g.i[1], x0, x1);
  eixoY.forEach((v, n) => { for (const [a0, a1] of cortes(1, v)) nervuras.push({ dir: 0, indice: n, c: v, a: glob([a0, v]), z: glob([a1, v]), L: a1 - a0 }); });
  eixoX.forEach((v, n) => { for (const [a0, a1] of cortes(0, v)) nervuras.push({ dir: 1, indice: n, c: v, a: glob([v, a0]), z: glob([v, a1]), L: a1 - a0 }); });
  // cubetas: células entre eixos consecutivos (as parciais junto ao contorno ficam maciças)
  const cubetas: Cubeta[] = [];
  const celulas = new Set<string>();
  const dentro = (p: P) => dentroPoligono(glob(p), cont) && !(l.furos ?? []).some((f) => dentroPoligono(glob(p), f as P[]));
  for (let a = 0; a + 1 < eixoY.length; a++) for (let b = 0; b + 1 < eixoX.length; b++) {
    const ya = eixoY[a] + g.bw[0] / 2, yb = eixoY[a + 1] - g.bw[0] / 2, xa = eixoX[b] + g.bw[1] / 2, xb = eixoX[b + 1] - g.bw[1] / 2;
    if (yb - ya < 1e-6 || xb - xa < 1e-6) continue;
    const cantos: P[] = [[xa, ya], [xb, ya], [xb, yb], [xa, yb]], centro: P = [(xa + xb) / 2, (ya + yb) / 2];
    if (![...cantos, centro].every(dentro)) continue;
    // um furo inteiro dentro da célula também a exclui
    if ((l.furos ?? []).some((f) => (f as P[]).some((q) => { const t = loc(q); return t[0] > xa && t[0] < xb && t[1] > ya && t[1] < yb; }))) continue;
    if (cantos.some((q) => emZonaMacica(l, glob(q), faixaViga)) || emZonaMacica(l, glob(centro), faixaViga)) continue;
    cubetas.push({ canto: [xa, ya], poligono: cantos.map(glob) as [P, P, P, P] });
    celulas.add(`${Math.round((eixoX[b] - ref[0]) / g.i[1])},${Math.round((eixoY[a] - ref[1]) / g.i[0])}`);
  }
  const aliviada = (p: P): boolean => { const q = loc(p); return celulas.has(`${Math.floor((q[0] - ref[0]) / g.i[1] + 1e-9)},${Math.floor((q[1] - ref[1]) / g.i[0] + 1e-9)}`); };
  const fracMacica = (p: P, k: 0 | 1, w: number): number => {
    const q = loc(p);
    let n = 0;
    for (const o of [-3 / 8, -1 / 8, 1 / 8, 3 / 8]) if (!aliviada(glob(k === 0 ? [q[0], q[1] + o * w] : [q[0] + o * w, q[1]]))) n++;
    return n / 4;
  };
  return { angulo: ang, origem: ref, nervuras, cubetas, areaCubetas: cubetas.length * g.cubeta, loc, glob, aliviada, fracMacica };
}

// ---------------------------------------------------------------- ábacos (E3d)

/**
 * Zona efetiva de um ábaco: o polígono nominal (m) ajustado ao número de cubetas inteiras e recortado pelo contorno da laje. Um
 * retângulo alinhado às nervuras cresce para fora até os eixos de nervuras mais próximos (a cubeta que o ábaco toca em parte
 * sai inteira); um polígono qualquer vale como está. Vazio (< 3 vértices) se o ábaco fica fora do pano.
 */
export function poligonoEfetivoAbaco(l: Pick<Laje, 'contorno' | 'direcao' | 'pontoNervuras' | 'insercao'>, g: Pick<GeometriaBidirecional, 'i'>, poligono: P[]): P[] {
  const ang = (direcaoNervurada(l) * Math.PI) / 180, c = Math.cos(ang), s = Math.sin(ang);
  const loc = (p: P): P => [p[0] * c + p[1] * s, -p[0] * s + p[1] * c], glob = (p: P): P => [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
  const cont = l.contorno as P[], ref = loc((l.pontoNervuras ?? cont[l.insercao ?? 0] ?? cont[0]) as P), q = poligono.map(loc);
  const x0 = Math.min(...q.map((p) => p[0])), x1 = Math.max(...q.map((p) => p[0])), y0 = Math.min(...q.map((p) => p[1])), y1 = Math.max(...q.map((p) => p[1]));
  let r: P[] = poligono;
  if (Math.abs(areaPoligono(q)) >= (x1 - x0) * (y1 - y0) * 0.999 - 1e-9) {
    const px = g.i[1], py = g.i[0];
    const lo = (v: number, o: number, p: number) => o + Math.floor((v - o) / p + 1e-9) * p, hi = (v: number, o: number, p: number) => o + Math.ceil((v - o) / p - 1e-9) * p;
    const a = lo(x0, ref[0], px), b = hi(x1, ref[0], px), cc = lo(y0, ref[1], py), d = hi(y1, ref[1], py);
    r = ([[a, cc], [b, cc], [b, d], [a, d]] as P[]).map(glob);
  }
  return intersecaoPoligonos(r, cont);
}

export interface AbacoEfetivo { abaco: Abaco; poligono: P[]; area: number }
/** Ábacos da laje com a zona efetiva (os que ficam fora do pano não entram). */
export function abacosEfetivos(b: Pick<BuildingModel, 'abacos'>, l: Laje, g: Pick<GeometriaBidirecional, 'i'>): AbacoEfetivo[] {
  const out: AbacoEfetivo[] = [];
  for (const a of b.abacos ?? []) {
    if (a.laje !== l.id) continue;
    const poligono = poligonoEfetivoAbaco(l, g, a.poligono as P[]);
    if (poligono.length >= 3) out.push({ abaco: a, poligono, area: Math.abs(areaPoligono(poligono)) });
  }
  return out;
}
/** A laje com os ábacos somados às zonas maciças (a própria laje, se não há ábacos). */
export function lajeComAbacos(b: Pick<BuildingModel, 'abacos'>, l: Laje, g: Pick<GeometriaBidirecional, 'i'>): Laje {
  const ab = abacosEfetivos(b, l, g);
  return ab.length ? { ...l, zonasMacicas: [...(l.zonasMacicas ?? []), ...ab.map((x) => x.poligono as [number, number][])] } : l;
}
/** Altura total (m) do maior ábaco que contém o ponto; `undefined` fora de qualquer ábaco. */
export function alturaAbacoEm(efs: AbacoEfetivo[], p: P): number | undefined {
  let h: number | undefined;
  for (const e of efs) if (dentroPoligono(p, e.poligono)) h = Math.max(h ?? 0, e.abaco.hAbaco);
  return h;
}
/** Volume (m³) de concreto do rebaixo dos ábacos que descem abaixo da laje (área × (hAbaco − h)). */
export const volumeRebaixoAbacos = (efs: AbacoEfetivo[], h: number): number => efs.reduce((t, e) => t + e.area * Math.max(0, e.abaco.hAbaco - h), 0);

/** Geometria e arranjo da laje nervurada bidirecional com as opções da obra (faixa maciça junto às vigas, ábacos); `null` nas demais lajes. */
export function arranjoDaLaje(b: Pick<BuildingModel, 'opcoes' | 'perfilOpcoes' | 'normas' | 'tiposLaje' | 'abacos'>, l: Laje): { g: GeometriaBidirecional; arr: ArranjoNervuras; abacos: AbacoEfetivo[]; volumeRebaixo: number } | null {
  if (l.tipo.tipo !== 'nervurada' || l.definir) return null;
  const g = geometriaBidirecional(b, l.tipo), abacos = abacosEfetivos(b, l, g);
  return { g, arr: arranjoNervuras(lajeComAbacos(b, l, g), g, opcoesEmUso(b.opcoes, perfilDe(b)).nervuradaMacicoViga), abacos, volumeRebaixo: volumeRebaixoAbacos(abacos, g.h) };
}

/**
 * Espessura equivalente de concreto (m) da laje para os quantitativos: a da maciça, a da nervurada unidirecional pela
 * tabela e a da bidirecional pelas cubetas inteiras do arranjo (a margem e as zonas maciças entram inteiras).
 */
export function espessuraConcretoDaLaje(b: Pick<BuildingModel, 'opcoes' | 'perfilOpcoes' | 'normas' | 'tiposLaje' | 'abacos'>, l: Laje, esp: (t: TipoLaje) => number): number {
  const a = arranjoDaLaje(b, l);
  if (!a) return esp(l.tipo);
  const q = quantitativoNervurada(l, a.g, a.arr, a.volumeRebaixo);
  return q.area > 0 ? q.volumeConcreto / q.area : esp(l.tipo);
}

// ---------------------------------------------------------------- verificações da NBR (geometria)

export type Regime = 'laje' | 'viga' | 'macica';
export interface AvisoNervurada { codigo: string; severidade: 'erro' | 'aviso' | 'info'; mensagem: string }
export interface VerificacaoGeometria {
  /** Regime de cisalhamento e de flexão da mesa por direção. */
  regime: [Regime, Regime];
  /** Menor capa exigida (m) e distância livre entre nervuras de cada direção. */
  capaMin: number; livre: [number, number];
  avisos: AvisoNervurada[];
}
const fm2 = (x: number) => (Math.round(x * 100) / 100).toFixed(2).replace('.', ',');

/**
 * Verificações geométricas das lajes nervuradas (NBR 6118, 13.2.4.2 e 14.7.7 [números de item a confirmar]): mesa ≥ 1/15 da
 * distância livre entre nervuras e ≥ `mesaMin` (4 cm; 5 cm com tubulações), nervura ≥ 5 cm, sem armadura de compressão em nervura
 * < 8 cm; espaçamento entre eixos ≤ 65 cm dispensa a flexão da mesa e permite cisalhar como laje; de 65 a 110 cm exige a flexão da
 * mesa e o cisalhamento como viga (como laje até 90 cm com largura média da nervura ≥ 12 cm); acima de 110 cm a mesa é laje
 * maciça sobre grelha de vigas.
 */
export function verificarGeometria(g: GeometriaBidirecional, mesaMin = 0.04): VerificacaoGeometria {
  const avisos: AvisoNervurada[] = [];
  const livre: [number, number] = [g.i[1] - g.bw[1], g.i[0] - g.bw[0]];
  const capaMin = Math.max(Math.max(...livre) / 15, mesaMin);
  if (g.capa < capaMin - 1e-9) avisos.push({ codigo: 'NERV_MESA', severidade: 'erro', mensagem: `Nervuradas: mesa de ${fm2(g.capa * 100)} cm abaixo do mínimo de ${fm2(capaMin * 100)} cm (1/15 da distância livre entre nervuras, no mínimo ${fm2(mesaMin * 100)} cm; NBR 6118, 13.2.4.2).` });
  for (const k of [0, 1] as const) {
    if (g.bw[k] < 0.05 - 1e-9) avisos.push({ codigo: 'NERV_NERVURA', severidade: 'erro', mensagem: `Nervuradas: nervura da direção ${k} com ${fm2(g.bw[k] * 100)} cm, abaixo do mínimo de 5 cm (NBR 6118, 13.2.4.2).` });
    else if (g.bw[k] < 0.08 - 1e-9) avisos.push({ codigo: 'NERV_COMPRESSAO', severidade: 'info', mensagem: `Nervuradas: sem armadura de compressão na nervura da direção ${k} (${fm2(g.bw[k] * 100)} cm, < 8 cm; NBR 6118, 13.2.4.2).` });
  }
  const regime = [0, 1].map((k): Regime => {
    const i = g.i[k], bwMed = g.bw[k];
    return i <= 0.65 + 1e-9 ? 'laje' : i <= 0.9 + 1e-9 && bwMed >= 0.12 - 1e-9 ? 'laje' : i <= 1.1 + 1e-9 ? 'viga' : 'macica';
  }) as [Regime, Regime];
  for (const k of [0, 1] as const) {
    const i = g.i[k];
    if (i > 1.1 + 1e-9) avisos.push({ codigo: 'NERV_ESPACAMENTO_MAX', severidade: 'erro', mensagem: `Nervuradas: espaçamento acima de 110 cm — ${fm2(i * 100)} cm entre eixos (direção ${k}): a mesa deve ser calculada como laje maciça apoiada em grelha de vigas (NBR 6118, 13.2.4.2).` });
    else if (i > 0.65 + 1e-9) avisos.push({ codigo: 'NERV_ESPACAMENTO', severidade: 'aviso', mensagem: `Nervuradas: espaçamento de ${fm2(i * 100)} cm entre eixos (direção ${k}) acima de 65 cm: exige a verificação da flexão da mesa${regime[k] === 'viga' ? ' e o cisalhamento das nervuras como viga' : ' (cisalhamento como laje: espaçamento ≤ 90 cm e nervura ≥ 12 cm)'} (NBR 6118, 13.2.4.2).` });
  }
  return { regime, capaMin, livre, avisos };
}

/** Altura da cubeta da forma diferente de hTotal − capa. */
export function avisosForma(g: GeometriaBidirecional): AvisoNervurada[] {
  const out: AvisoNervurada[] = [];
  if (Math.abs(g.forma.altura - g.hEnch) > 0.005) out.push({ codigo: 'NERV_FORMA', severidade: 'aviso', mensagem: `Nervuradas: a cubeta "${g.forma.nome}" tem ${fm2(g.forma.altura * 100)} cm e a laje pede ${fm2(g.hEnch * 100)} cm (altura total − capa): ajuste a altura total, a capa ou escolha outra forma.` });
  return out;
}

// ---------------------------------------------------------------- quantitativos

export interface QuantitativoNervurada {
  /** Área da laje (m²), das cubetas inteiras em planta e da parte maciça (m²). */
  area: number; areaCubetas: number; areaMacica: number;
  cubetas: number; blocos: number;
  /** Concreto (m³), forma recuperável (m² de contato das cubetas) e enchimento perdido (m³ e kN). */
  volumeConcreto: number; areaFormaCubetas: number; volumeEnchimento: number; pesoEnchimento: number;
  /** Peso próprio médio (kN/m²) e peso total do concreto (kN). */
  ppMedio: number; pesoConcreto: number;
  /** Concreto (m³) do rebaixo dos ábacos abaixo da laje, já somado a `volumeConcreto`. */
  volumeRebaixo: number;
}
/** Concreto, formas e enchimento: concreto = área × h − cubetas × volume da cubeta (a parte maciça entra inteira). */
export function quantitativoNervurada(l: Pick<Laje, 'contorno' | 'furos'>, g: GeometriaBidirecional, arr: ArranjoNervuras, volumeRebaixo = 0): QuantitativoNervurada {
  const area = Math.abs(areaPoligono(l.contorno as P[])) - (l.furos ?? []).reduce((t, f) => t + Math.abs(areaPoligono(f as P[])), 0);
  const nCub = arr.cubetas.length, areaCub = nCub * g.cubeta, volVazio = areaCub * g.hEnch;
  const volumeConcreto = area * g.h - volVazio + volumeRebaixo;
  const per = (g.forma.tipo === 'perdida' ? 1 : 0), volEnch = per ? volVazio : 0;
  // contato da forma: fundo + 4 faces (cubeta prismática; a cubeta troncopiramidal real fica a confirmar com o fabricante)
  const lados = (() => { const [i0, i1] = g.i, [b0, b1] = g.bw, a = i1 - b1, bb = i0 - b0; return 2 * (a + bb) * g.hEnch + a * bb; })();
  const pesoEnch = per ? nCub * g.ppEnchimento * g.i[0] * g.i[1] : 0;
  return {
    area, areaCubetas: areaCub, areaMacica: Math.max(0, area - nCub * g.i[0] * g.i[1]), cubetas: nCub, blocos: Math.ceil(nCub / Math.max(1, g.pecas)),
    volumeConcreto, areaFormaCubetas: g.recuperavel ? nCub * lados : 0, volumeEnchimento: volEnch, pesoEnchimento: pesoEnch,
    ppMedio: area > 0 ? (volumeConcreto * GAMA_CONCRETO + pesoEnch) / area : 0, pesoConcreto: volumeConcreto * GAMA_CONCRETO, volumeRebaixo,
  };
}
