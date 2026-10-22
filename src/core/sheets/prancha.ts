// Montagem das pranchas (função pura): planta de formas de um grupo de pavimentos em escala real (m) no espaço
// do modelo, e folha, carimbo e quadro de pilares no espaço do papel (mm). Os escritores (PDF, DXF, DWG, SVG)
// recebem a mesma prancha.
import { ARMACAO_PADRAO, contornoPilar, geometriaViga, lancesDoPilar, pavimentosOrdenados, secaoNoLance, PRANCHA_PADRAO, type BuildingModel, type Carimbo, type Formato, type Pilar, type SecaoPilar, contornoNoLance } from '../building/types';
import { dentroPoligono, pontoInterno, type P } from '../geom/faces';
import { TRELICADAS } from '../building/lajes';
import { encaixar } from './logo';
import { marcasPontoFixo, primitivasMascara } from './gabarito';

export type { P };

/** Camadas com cor (índice ACI) e pena (mm, série da NBR 16861 [a confirmar]). Hierarquia das folhas de referência:
 * concreto e moldura grossos, barras médias, cotas, eixos e linhas de chamada finos em cinza. */
export const CAMADAS = {
  'FOLHA': { cor: 7, pena: 0.5, tipo: 'cont' },
  'FOLHA-FINA': { cor: 8, pena: 0.18, tipo: 'cont' },
  'FOLHA-TEXTO': { cor: 7, pena: 0.25, tipo: 'cont' },
  'PILAR': { cor: 1, pena: 0.5, tipo: 'cont' },
  'PILAR-HACH': { cor: 8, pena: 0.13, tipo: 'cont' },
  'PILAR-NASCE': { cor: 1, pena: 0.35, tipo: 'trac' },
  'VIGA': { cor: 3, pena: 0.35, tipo: 'cont' },
  'LAJE': { cor: 4, pena: 0.25, tipo: 'cont' },
  'TEXTO': { cor: 7, pena: 0.25, tipo: 'cont' },
  'EIXO': { cor: 9, pena: 0.13, tipo: 'eixo' },
  'COTA': { cor: 8, pena: 0.18, tipo: 'cont' },
  'QUADRO': { cor: 7, pena: 0.25, tipo: 'cont' },
  // armação (R5): contorno do concreto nas elevações e seções, barras (inferiores/positivas e superiores/negativas) e planta de fundo fina
  'CONCRETO': { cor: 7, pena: 0.5, tipo: 'cont' },
  'ARMADURA': { cor: 1, pena: 0.35, tipo: 'cont' },
  'ARMADURA-NEG': { cor: 5, pena: 0.35, tipo: 'cont' },
  'FORMA-FINA': { cor: 8, pena: 0.18, tipo: 'cont' },
  // fundações (FU5): contorno dos elementos (sapatas, blocos, tubulões) e das vigas de fundação em planta
  'FUNDACAO': { cor: 6, pena: 0.5, tipo: 'cont' },
  // opções de desenho (R7g): gabarito (máscara DXF/DWG) na pena mais fina das existentes e ponto fixo dos pilares
  'MASCARA': { cor: 8, pena: 0.13, tipo: 'cont' },
  'PONTO-FIXO': { cor: 1, pena: 0.18, tipo: 'cont' },
} as const;
export type Camada = keyof typeof CAMADAS;
/** Padrões de traço no papel (mm): traço, espaço, ... */
export const TRACOS: Record<'trac' | 'eixo', number[]> = { trac: [3, 1.5], eixo: [8, 1.5, 1, 1.5] };

export type Prim =
  | { t: 'pl'; c: Camada; pts: P[]; fechada?: boolean }
  | { t: 'circ'; c: Camada; centro: P; r: number }
  /** Texto: `h` = altura das maiúsculas; `ang` em graus; alinhamento horizontal e vertical em relação a `p`. */
  | { t: 'txt'; c: Camada; p: P; h: number; s: string; ang?: number; ah?: 'e' | 'c' | 'd'; av?: 'base' | 'meio' | 'topo' }
  /** Região preenchida (sólida). */
  | { t: 'hach'; c: Camada; pts: P[] };

export const FORMATOS: Record<Formato, [number, number]> = { A0: [1189, 841], A1: [841, 594], A2: [594, 420], A3: [420, 297], A4: [297, 210] };
/** Margens (mm) [a confirmar na NBR 16752]: esquerda 20 (maior, para furação, como nas folhas de referência); demais 10
 * (A0, A1) ou 7 (A2–A4). Legenda com 178 mm de largura (175–180 mm nas folhas de referência). */
export const margens = (f: Formato) => ({ esq: 20, outras: f === 'A0' || f === 'A1' ? 10 : 7 });
export const LARGURA_LEGENDA = 178;
/** Escalas da planta de formas automática: a partir de 1:75, como nas folhas de referência (1:50 só quando escolhida). */
export const ESCALAS = [75, 100, 125, 200, 250];

/** Tipos de prancha do conjunto (R5) e sigla no carimbo. */
export type TipoPrancha = 'formas' | 'locacao' | 'vigas' | 'pilares' | 'lajes' | 'fundacao';
/**
 * Siglas das folhas de referência (fundação indireta SFN, direta SFS, formas SCF, vigas SCV, pilares SCP); lajes SCL por
 * extensão [a confirmar]. A sigla de `fundacao` é a padrão (SFN); cada folha de fundação leva a sua em `Prancha.sigla`
 * (`siglaFundacao`). A locação dos pilares era SFN e passou a SLP, para não colidir com a fundação indireta.
 */
export const SIGLAS: Record<TipoPrancha, string> = { formas: 'SCF', locacao: 'SLP', vigas: 'SCV', pilares: 'SCP', lajes: 'SCL', fundacao: 'SFN' };
export const siglaDe = (p: Pick<Prancha, 'tipo' | 'sigla'>) => p.sigla ?? SIGLAS[p.tipo ?? 'formas'];

/** Linha da tabela de aço de uma prancha (comprimentos em cm e m). */
export interface LinhaTabelaAco { pos: string; aco: string; phi: number; quant: number; cUnit: number; cTotal: number }
/** Linha do resumo de aço por aço e bitola (m, kg). */
export interface LinhaResumoAco { aco: string; phi: number; comprimento: number; peso: number; pesoComPerdas: number }
export interface AcoPrancha { tabela: LinhaTabelaAco[]; resumo: LinhaResumoAco[]; peso: number; pesoComPerdas: number; perdas: number; concreto: number; forma: number }

export interface Prancha {
  tipo?: TipoPrancha;
  /** Sigla no carimbo quando difere da padrão do tipo (fundação direta SFS, indireta SFN). */
  sigla?: string;
  titulo: string;
  formato: Formato;
  /** Largura e altura da folha (mm, paisagem). */
  W: number; H: number;
  escala: number;
  modelo: Prim[];
  papel: Prim[];
  /** Janela (viewport): retângulo no papel (mm) e ponto do modelo (m) no centro dela; ausente quando tudo está no papel. */
  janela?: { x0: number; y0: number; x1: number; y1: number; centro: P };
  avisos: string[];
  /** Pranchas de armação: tabela de aço e resumo da folha. */
  aco?: AcoPrancha;
  /** Elementos desenhados na folha (nomes). */
  elementos?: string[];
  /** Logo do carimbo (papel, mm): retângulo e o JPEG em base64 com as dimensões em px. */
  logo?: LogoPrancha;
}

export interface LogoPrancha { x0: number; y0: number; x1: number; y1: number; dados: string; largura: number; altura: number }

export interface OpcoesPrancha {
  formato?: Formato | 'auto';
  escala?: number;
  carimbo?: Partial<Carimbo>;
  numero?: number; total?: number;
  /** Armaduras do dimensionamento para o quadro, por `${pilar}|${pavimento}` (lance que chega ao pavimento de referência do grupo). */
  armaduras?: Record<string, string>;
}

const nf = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
const cm = (v: number) => String(Math.round(v * 100));
const secTxt = (s: SecaoPilar) => (s.tipo === 'ret' ? `${cm(s.b)}×${cm(s.h)}` : `ø${cm(s.d)}`);

/** Elementos do grupo no pavimento de referência (o primeiro do grupo). */
function elementos(b: BuildingModel, grupo: string) {
  const ps = pavimentosOrdenados(b), pavs = ps.filter((p) => p.grupo === grupo);
  const ref = pavs[0];
  const lajes = b.lajes.filter((l) => l.grupo === grupo), vigas = b.vigas.filter((v) => v.grupo === grupo);
  const chegam = ref ? b.pilares.filter((p) => lancesDoPilar(b, p).some((x) => x.id === ref.id)) : [];
  const nascem = ref ? b.pilares.filter((p) => p.nasce === ref.id) : [];
  const eixos = b.eixos;
  return { ps, pavs, ref, lajes, vigas, chegam, nascem, eixos };
}

/** Seção e contorno da base do pilar (primeiro lance, com a geometria própria dele): o desenho dos pilares que nascem no pavimento. */
const secaoBase = (b: BuildingModel, p: Pilar) => { const l = lancesDoPilar(b, p)[0]; return l ? secaoNoLance(p, l.id) : p.secao; };
const contornoBase = (b: BuildingModel, p: Pilar) => { const l = lancesDoPilar(b, p)[0]; return l ? contornoNoLance(p, l.id) : contornoPilar(p, p.secao); };

export function caixa(pts: P[]): [number, number, number, number] {
  if (!pts.length) return [0, 0, 1, 1];
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

/** Valores distintos (tolerância de 1 cm), ordenados. */
function distintos(v: number[]): number[] {
  const s = [...v].sort((a, z) => a - z), out: number[] = [];
  for (const x of s) if (!out.length || x - out[out.length - 1] > 0.01) out.push(x);
  return out;
}

/** Área disponível para a planta (mm): moldura menos a coluna da legenda e a faixa do título. */
function areaDesenho(f: Formato) {
  const [W, H] = FORMATOS[f], m = margens(f);
  const x0 = m.esq + 5, y0 = m.outras + 18, x1 = W - m.outras - LARGURA_LEGENDA - 10, y1 = H - m.outras - 5;
  return { x0, y0, x1, y1 };
}

/** Parâmetros t ∈ (0, 1) em que o segmento a–z cruza as arestas do polígono, ordenados. */
function cruzamentos(a: P, z: P, poly: P[]): number[] {
  const out: number[] = [], dx = z[0] - a[0], dy = z[1] - a[1];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length], ex = q[0] - p[0], ey = q[1] - p[1];
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = ((p[0] - a[0]) * ey - (p[1] - a[1]) * ex) / den, u = ((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / den;
    if (t > 1e-9 && t < 1 - 1e-9 && u >= -1e-9 && u <= 1 + 1e-9) out.push(t);
  }
  return out.sort((x, y) => x - y);
}

/** Partes do segmento a–z fora de todos os polígonos. */
function visiveis(a: P, z: P, polys: P[][]): P[][] {
  const ts = [0, 1, ...polys.flatMap((poly) => cruzamentos(a, z, poly))].sort((x, y) => x - y);
  const pt = (t: number): P => [a[0] + (z[0] - a[0]) * t, a[1] + (z[1] - a[1]) * t];
  const out: P[][] = [];
  for (let i = 0; i + 1 < ts.length; i++) {
    if (ts[i + 1] - ts[i] < 1e-9) continue;
    const m = pt((ts[i] + ts[i + 1]) / 2);
    if (polys.some((poly) => dentroPoligono(m, poly))) continue;
    const ult = out.at(-1);
    if (ult && Math.abs(ult[1][0] - pt(ts[i])[0]) < 1e-12 && Math.abs(ult[1][1] - pt(ts[i])[1]) < 1e-12) ult[1] = pt(ts[i + 1]);
    else out.push([pt(ts[i]), pt(ts[i + 1])]);
  }
  return out;
}

/** Folga em volta da geometria para cotas e eixos (mm no papel). */
const FOLGA_PAPEL = 28;

/** Eixos (fora da planta, com bolha) e cotas em cadeia pelos centros dos pilares (cm), abaixo e à esquerda. */
export function eixosECotas(modelo: Prim[], eixos: BuildingModel['eixos'], centros: P[], [gx0, gy0, gx1, gy1]: [number, number, number, number], k: number) {
  // eixos: só fora da planta (a geometria já marca a posição), com bolha no início
  const [bx0, by0, bx1, by1] = [gx0 - 3 * k, gy0 - 3 * k, gx1 + 3 * k, gy1 + 3 * k];
  for (const e of eixos) {
    const [x1, y1] = e.p1, [x2, y2] = e.p2, L = Math.hypot(x2 - x1, y2 - y1);
    if (L < 1e-6) continue;
    const ux = (x2 - x1) / L, uy = (y2 - y1) / L, ext = 12 * k, r = 4 * k;
    const a: P = [x1 - ux * ext, y1 - uy * ext], z: P = [x2 + ux * ext, y2 + uy * ext];
    const ts = cruzamentos(a, z, [[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]]);
    if (ts.length >= 2) {
      const pt = (t: number): P => [a[0] + (z[0] - a[0]) * t, a[1] + (z[1] - a[1]) * t];
      modelo.push({ t: 'pl', c: 'EIXO', pts: [a, pt(ts[0])] }, { t: 'pl', c: 'EIXO', pts: [pt(ts.at(-1)!), z] });
    } else modelo.push({ t: 'pl', c: 'EIXO', pts: [a, z] });
    const cb: P = [a[0] - ux * r, a[1] - uy * r];
    modelo.push({ t: 'circ', c: 'EIXO', centro: cb, r }, { t: 'txt', c: 'EIXO', p: cb, h: 3 * k, s: e.nome, ah: 'c', av: 'meio' });
  }
  // cotas em cadeia pelos centros dos pilares (cm), abaixo e à esquerda, e total
  const cota = (horiz: boolean, vals: number[], base: number) => {
    if (vals.length < 2) return;
    const tick = 1.2 * k, th = 2 * k;
    const P2 = (s: number, t: number): P => (horiz ? [s, t] : [t, s]);
    modelo.push({ t: 'pl', c: 'COTA', pts: [P2(vals[0], base), P2(vals.at(-1)!, base)] });
    for (const v of vals) {
      modelo.push({ t: 'pl', c: 'COTA', pts: [P2(v - tick, base - tick), P2(v + tick, base + tick)] });
      modelo.push({ t: 'pl', c: 'COTA', pts: [P2(v, base - 2 * k), P2(v, base + 2 * k)] });
    }
    for (let i = 0; i + 1 < vals.length; i++) {
      const m = (vals[i] + vals[i + 1]) / 2;
      modelo.push({ t: 'txt', c: 'COTA', p: P2(m, base + (horiz ? 0.8 * k : -0.8 * k)), h: th, s: cm(vals[i + 1] - vals[i]), ang: horiz ? 0 : 90, ah: 'c', av: 'base' });
    }
  };
  if (centros.length) {
    const xs = distintos(centros.map((c) => c[0])), ys = distintos(centros.map((c) => c[1]));
    cota(true, xs, gy0 - 10 * k); if (xs.length > 2) cota(true, [xs[0], xs.at(-1)!], gy0 - 18 * k);
    cota(false, ys, gx0 - 10 * k); if (ys.length > 2) cota(false, [ys[0], ys.at(-1)!], gx0 - 18 * k);
  }

}

export function montarPrancha(b: BuildingModel, grupo: string, o: OpcoesPrancha = {}): Prancha {
  const cfg = { ...PRANCHA_PADRAO, ...(b.prancha ?? {}) };
  const el = elementos(b, grupo);
  const g = b.grupos.find((x) => x.id === grupo);
  const avisos: string[] = [];
  const geo: P[] = [
    ...el.lajes.flatMap((l) => l.contorno), ...el.vigas.flatMap((v) => v.pontos),
    ...el.chegam.flatMap((p) => contornoNoLance(p, el.ref!.id)), ...el.nascem.flatMap((p) => contornoBase(b, p)),
  ];
  if (!geo.length) avisos.push('Grupo sem elementos lançados.');
  const [gx0, gy0, gx1, gy1] = caixa(geo.length ? geo : [[0, 0], [1, 1]]);
  const cabe = (f: Formato, e: number) => {
    const a = areaDesenho(f), k = 1000 / e;
    return (gx1 - gx0) * k + 2 * FOLGA_PAPEL <= a.x1 - a.x0 && (gy1 - gy0) * k + 2 * FOLGA_PAPEL <= a.y1 - a.y0;
  };
  // formato e escala: os informados; senão o menor formato que cabe em 1:75 (depois 1:100, 1:125...)
  const fFix = (o.formato ?? cfg.formato) !== 'auto' ? (o.formato ?? cfg.formato) as Formato : null;
  const eFix = (o.escala ?? cfg.escala) || 0;
  const forms: Formato[] = fFix ? [fFix] : ['A4', 'A3', 'A2', 'A1', 'A0'];
  const escs = eFix ? [eFix] : ESCALAS;
  let formato: Formato = fFix ?? 'A0', escala = eFix || ESCALAS[ESCALAS.length - 1], ok = false;
  busca: for (const e of escs) for (const f of forms) if (cabe(f, e)) { formato = f; escala = e; ok = true; break busca; }
  if (!ok) avisos.push(`A planta não cabe na folha ${formato} em 1:${escala}: escolha um formato maior ou outra escala.`);
  const [W, H] = FORMATOS[formato], area = areaDesenho(formato);
  const k = escala / 1000; // m no modelo por mm no papel

  // ---------- espaço do modelo ----------
  const modelo: Prim[] = [];
  const ref = el.ref;
  for (const l of el.lajes) {
    const pi = pontoInterno(l.contorno);
    const tipo = l.tipo.tipo === 'macica' ? `h=${cm(l.tipo.h)}` : `TR ${l.tipo.modelo}+${cm(l.tipo.capa)} (h=${cm((TRELICADAS[l.tipo.modelo] ?? TRELICADAS.H12).hEnch + l.tipo.capa)})`;
    modelo.push({ t: 'txt', c: 'LAJE', p: pi, h: 3 * k, s: l.nome, ah: 'c', av: 'base' }, { t: 'txt', c: 'LAJE', p: [pi[0], pi[1] - 1.5 * k], h: 2.2 * k, s: tipo, ah: 'c', av: 'topo' });
    for (const f of l.furos ?? []) {
      modelo.push({ t: 'pl', c: 'LAJE', pts: f, fechada: true });
      const [a0, b0, a1, b1] = caixa(f);
      modelo.push({ t: 'pl', c: 'LAJE', pts: [[a0, b0], [a1, b1]] }, { t: 'pl', c: 'LAJE', pts: [[a0, b1], [a1, b0]] });
    }
  }
  // corpos que interrompem as faces das vigas: pilares e as outras vigas (cruzamentos e apoios em "T")
  const corposPilar = [...el.chegam.map((p) => contornoNoLance(p, ref!.id)), ...el.nascem.map((p) => contornoBase(b, p))];
  const corpoViga = new Map(el.vigas.map((v) => { const gv = geometriaViga(v); return [v.id, [...gv.esq, ...[...gv.dir].reverse()] as P[]]; }));
  for (const v of el.vigas) {
    const gv = geometriaViga(v);
    const outros = [...corposPilar, ...el.vigas.filter((x) => x.id !== v.id).map((x) => corpoViga.get(x.id)!)];
    const linhas: P[][] = [gv.esq, gv.dir, [gv.esq[0], gv.dir[0]], [gv.esq.at(-1)!, gv.dir.at(-1)!]];
    for (const ln of linhas) for (let i = 0; i + 1 < ln.length; i++) for (const sg of visiveis(ln[i], ln[i + 1], outros)) modelo.push({ t: 'pl', c: 'VIGA', pts: sg });
    // rótulo no maior vão livre (entre pilares e vigas que cruzam) do maior trecho, do lado esquerdo, sempre legível
    let im = 0, lm = -1;
    for (let i = 0; i + 1 < v.pontos.length; i++) { const L = Math.hypot(v.pontos[i + 1][0] - v.pontos[i][0], v.pontos[i + 1][1] - v.pontos[i][1]); if (L > lm) { lm = L; im = i; } }
    const a = gv.esq[im], z = gv.esq[im + 1], la = Math.hypot(z[0] - a[0], z[1] - a[1]) || 1;
    const ux = (z[0] - a[0]) / la, uy = (z[1] - a[1]) / la, nx = -uy, ny = ux; // normal à esquerda
    const cortes = [0, la, ...outros.flatMap((poly) => cruzamentos(a, z, poly).map((t) => t * la))].sort((p1, p2) => p1 - p2);
    let t0 = 0, t1 = 0;
    for (let i = 0; i + 1 < cortes.length; i++) if (cortes[i + 1] - cortes[i] > t1 - t0) { t0 = cortes[i]; t1 = cortes[i + 1]; }
    const tm = (t0 + t1) / 2;
    let ang = (Math.atan2(uy, ux) * 180) / Math.PI;
    const inv = ang > 90.01 || ang < -89.99;
    if (inv) ang += ang > 0 ? -180 : 180;
    const off = 1.2 * k;
    modelo.push({ t: 'txt', c: 'TEXTO', p: [a[0] + ux * tm + nx * off, a[1] + uy * tm + ny * off], h: 2.5 * k, s: `${v.nome} ${cm(v.secao.b)}×${cm(v.secao.h)}`, ang, ah: 'c', av: inv ? 'topo' : 'base' });
  }
  const rotPilar = (p: Pilar, s: SecaoPilar, c: P[]) => {
    const [, , x1, y1] = caixa(c);
    modelo.push({ t: 'txt', c: 'TEXTO', p: [x1 + 0.8 * k, y1 + 0.8 * k], h: 2.5 * k, s: p.nome, av: 'base' });
    modelo.push({ t: 'txt', c: 'TEXTO', p: [x1 + 0.8 * k, y1 - 0.4 * k], h: 2 * k, s: secTxt(s), av: 'topo' });
  };
  for (const p of el.chegam) {
    const s = secaoNoLance(p, ref!.id), c = contornoPilar(p, s);
    modelo.push({ t: 'hach', c: 'PILAR-HACH', pts: c }, { t: 'pl', c: 'PILAR', pts: c, fechada: true });
    rotPilar(p, s, c);
  }
  for (const p of el.nascem) {
    const c = contornoBase(b, p);
    modelo.push({ t: 'pl', c: 'PILAR-NASCE', pts: c, fechada: true });
    rotPilar(p, secaoBase(b, p), c);
  }
  // opções de desenho (R7g): gabarito do pavimento e ponto fixo dos pilares (padrão desligadas)
  const opc = { ...ARMACAO_PADRAO, ...(cfg.armacao ?? {}) };
  if (opc.mascara) modelo.unshift(...primitivasMascara(b, grupo));
  if (opc.pontoFixo) modelo.push(...marcasPontoFixo([...el.chegam, ...el.nascem], k));
  const centros = [...el.chegam.map((p) => contornoNoLance(p, ref!.id)), ...el.nascem.map((p) => contornoBase(b, p))].map((c) => { const [a0, b0, a1, b1] = caixa(c); return [(a0 + a1) / 2, (b0 + b1) / 2] as P; });
  eixosECotas(modelo, el.eixos, centros, [gx0, gy0, gx1, gy1], k);

  // ---------- espaço do papel ----------
  const papel: Prim[] = [];
  const fc = folhaECarimbo(b, formato, { tipo: 'formas', conteudo: `PLANTA DE FORMAS — ${(g?.nome ?? grupo).toUpperCase()}`, escala: `1:${escala}`, numero: o.numero, total: o.total, carimbo: o.carimbo });
  papel.push(...fc.papel);
  const { x0: fx0, y0: fy0, x1: fx1, y1: fy1 } = fc.moldura, hLeg = fc.hLeg, lx1 = fx1;
  void fx0;
  // quadro de pilares acima da legenda (colunas para a esquerda quando não cabe)
  const todos = [...el.chegam, ...el.nascem.filter((p) => !el.chegam.includes(p))].sort((a, z) => a.nome.localeCompare(z.nome, 'pt-BR', { numeric: true }));
  const nomePav = (id: string) => (id === 'fundacao' ? 'Fundação' : el.ps.find((x) => x.id === id)?.nome ?? id);
  const colsQ = [{ w: 22, rot: 'PILAR' }, { w: 30, rot: 'SEÇÃO (cm)' }, { w: 38, rot: 'NASCE' }, { w: 38, rot: 'MORRE' }, { w: 50, rot: 'ARMADURA' }];
  const hl = 5, qy1 = fy1 - 2, qy0 = fy0 + hLeg + 6;
  const porCol = Math.max(1, Math.floor((qy1 - qy0 - 2 * hl) / hl));
  const nCols = Math.max(1, Math.ceil(todos.length / porCol));
  if (todos.length) for (let ci = 0; ci < nCols; ci++) {
    const qx1 = lx1 - ci * (LARGURA_LEGENDA + 4), qx0 = qx1 - LARGURA_LEGENDA;
    const fatia = todos.slice(ci * porCol, (ci + 1) * porCol);
    let yy = qy1;
    papel.push(ret('QUADRO', qx0, yy - hl * (fatia.length + 2), qx1, yy));
    papel.push(txt('QUADRO', (qx0 + qx1) / 2, yy - hl / 2, 2.5, 'QUADRO DE PILARES', 'c', 'meio'));
    yy -= hl; papel.push({ t: 'pl', c: 'QUADRO', pts: [[qx0, yy], [qx1, yy]] });
    let x = qx0;
    for (const c of colsQ) { papel.push(txt('QUADRO', x + c.w / 2, yy - hl / 2, 1.8, c.rot, 'c', 'meio')); x += c.w; }
    yy -= hl; papel.push({ t: 'pl', c: 'QUADRO', pts: [[qx0, yy], [qx1, yy]] });
    x = qx0;
    for (const c of colsQ.slice(0, -1)) { x += c.w; papel.push({ t: 'pl', c: 'QUADRO', pts: [[x, yy + hl], [x, yy - hl * fatia.length]] }); }
    for (const p of fatia) {
      const s = ref && lancesDoPilar(b, p).some((x2) => x2.id === ref.id) ? secaoNoLance(p, ref.id) : p.secao;
      const vals = [p.nome, secTxt(s), nomePav(p.nasce), nomePav(p.morre), (ref && o.armaduras?.[`${p.id}|${ref.id}`]) || '—'];
      x = qx0;
      vals.forEach((v, i) => { papel.push(txt('QUADRO', x + colsQ[i].w / 2, yy - hl / 2, 2, v, 'c', 'meio')); x += colsQ[i].w; });
      yy -= hl;
    }
  }
  const largQuadro = todos.length ? nCols * (LARGURA_LEGENDA + 4) : LARGURA_LEGENDA + 10;
  // título da planta, abaixo do desenho
  const niveis = el.pavs.map((p) => `${p.nome} (${p.cota >= 0 ? '+' : ''}${nf(p.cota)})`).join(', ');
  papel.push(txt('FOLHA-TEXTO', area.x0, fy0 + 10, 4.5, `PLANTA DE FORMAS — ${(g?.nome ?? grupo).toUpperCase()}`));
  papel.push(txt('FOLHA-TEXTO', area.x0, fy0 + 4.5, 2.5, `ESCALA 1:${escala} · cotas em cm · níveis em m: ${niveis || '—'}`));

  // janela: área livre à esquerda do quadro, centrada na geometria
  const jx1 = Math.min(area.x1, fx1 - largQuadro - 4);
  if (jx1 < area.x1 - 1 && !cabeEm(jx1)) avisos.push('O quadro de pilares invade a área do desenho: use um formato maior.');
  function cabeEm(x1: number) { return (gx1 - gx0) / k + 2 * FOLGA_PAPEL <= x1 - area.x0; }
  const janela = { x0: area.x0, y0: area.y0, x1: Math.max(jx1, area.x0 + 40), y1: area.y1, centro: [(gx0 + gx1) / 2 - 4 * k, (gy0 + gy1) / 2 - 4 * k] as P };
  return { tipo: 'formas', titulo: `Formas — ${g?.nome ?? grupo}`, formato, W, H, escala, modelo, papel, janela, avisos, ...(fc.logo ? { logo: fc.logo } : {}) };
}

export const ret = (c: Camada, x0: number, y0: number, x1: number, y1: number): Prim => ({ t: 'pl', c, pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], fechada: true });
export const txt = (c: Camada, x: number, y: number, h: number, s: string, ah: 'e' | 'c' | 'd' = 'e', av: 'base' | 'meio' | 'topo' = 'base'): Prim => ({ t: 'txt', c, p: [x, y], h, s, ah, av });

export interface OpcoesFolha { tipo: TipoPrancha; sigla?: string; conteudo: string; escala: string; numero?: number; total?: number; carimbo?: Partial<Carimbo> }

/**
 * Folha (moldura, marcas de dobra) e legenda (carimbo) no canto inferior direito, comuns a todas as pranchas.
 * Devolve as primitivas, a altura da legenda e a moldura (mm).
 */
export function folhaECarimbo(b: BuildingModel, formato: Formato, o: OpcoesFolha) {
  const cfg = { ...PRANCHA_PADRAO, ...(b.prancha ?? {}) };
  const [W, H] = FORMATOS[formato], mg = margens(formato);
  const papel: Prim[] = [];
  const fx0 = mg.esq, fy0 = mg.outras, fx1 = W - mg.outras, fy1 = H - mg.outras;
  papel.push(ret('FOLHA-FINA', 0, 0, W, H), ret('FOLHA', fx0, fy0, fx1, fy1));
  // marcas de dobra para o formato A4 (dobras verticais a 185 mm da direita e depois a cada 190 mm; horizontais a cada 297 mm) [a confirmar na NBR 13142]
  if (formato !== 'A4') {
    for (let x = W - 185; x > 210; x -= 190) papel.push({ t: 'pl', c: 'FOLHA-FINA', pts: [[x, 0], [x, 5]] }, { t: 'pl', c: 'FOLHA-FINA', pts: [[x, H - 5], [x, H]] });
    for (let y = 297; y < H - 1; y += 297) papel.push({ t: 'pl', c: 'FOLHA-FINA', pts: [[0, y], [5, y]] }, { t: 'pl', c: 'FOLHA-FINA', pts: [[W - 5, y], [W, y]] });
  }
  const cb = { ...cfg.carimbo, ...(o.carimbo ?? {}) };
  const lx0 = fx1 - LARGURA_LEGENDA, lx1 = fx1;
  const wCont = 0.56 * LARGURA_LEGENDA - 4;
  // logo opcional à esquerda da célula da empresa (30 % da largura da legenda)
  const lg = cfg.logo, wLogo = lg ? 0.3 : 0;
  const linhas: { h: number; cel: { w: number; rot: string; val: string; hv?: number }[] }[] = [
    { h: 14, cel: [...(lg ? [{ w: wLogo, rot: '', val: '' }] : []), { w: 1 - wLogo, rot: 'EMPRESA / PROFISSIONAL', val: cb.empresa ?? '', hv: 4 }] },
    { h: 10, cel: [{ w: 1, rot: 'OBRA', val: cb.obra ?? b.obra.nome ?? '' }] },
    { h: 9, cel: [{ w: 0.5, rot: 'CLIENTE', val: cb.cliente ?? '' }, { w: 0.5, rot: 'LOCAL', val: cb.local ?? b.obra.cidade ?? '' }] },
    { h: 12, cel: [{ w: 0.56, rot: 'CONTEÚDO', val: o.conteudo, hv: Math.min(3.5, wCont / (Math.max(1, o.conteudo.length) * 1.0)) }, { w: 0.12, rot: 'SIGLA', val: o.sigla ?? SIGLAS[o.tipo], hv: 3.5 }, { w: 0.32, rot: 'ETAPA', val: cb.etapa ?? '' }] },
    { h: 9, cel: [{ w: 0.46, rot: 'RESPONSÁVEL TÉCNICO', val: cb.responsavel ?? '' }, { w: 0.27, rot: 'REGISTRO PROFISSIONAL', val: cb.registro ?? '' }, { w: 0.27, rot: 'ART / RRT', val: cb.art ?? '' }] },
    { h: 10, cel: [{ w: 0.17, rot: 'ESCALA', val: o.escala }, { w: 0.2, rot: 'DATA', val: cb.data ?? '' }, { w: 0.25, rot: 'DESENHO', val: cb.desenho ?? '' }, { w: 0.14, rot: 'REVISÃO', val: cb.revisao ?? 'R00' }, { w: 0.24, rot: 'FOLHA', val: `${String(o.numero ?? 1).padStart(2, '0')}/${String(o.total ?? 1).padStart(2, '0')}`, hv: 4 }] },
  ];
  const hLeg = linhas.reduce((s, l) => s + l.h, 0);
  let y = fy0 + hLeg, logo: LogoPrancha | undefined;
  papel.push(ret('FOLHA', lx0, fy0, lx1, y));
  for (const l of linhas) {
    const yb = y - l.h;
    if (yb > fy0) papel.push({ t: 'pl', c: 'FOLHA-FINA', pts: [[lx0, yb], [lx1, yb]] });
    let x = lx0;
    l.cel.forEach((c, i) => {
      const w = c.w * LARGURA_LEGENDA;
      if (i) papel.push({ t: 'pl', c: 'FOLHA-FINA', pts: [[x, yb], [x, y]] });
      if (lg && l === linhas[0] && i === 0) logo = { ...encaixar({ x0: x, y0: yb, x1: x + w, y1: y }, lg.largura, lg.altura), dados: lg.dados, largura: lg.largura, altura: lg.altura };
      if (c.rot) papel.push(txt('FOLHA-TEXTO', x + 1.5, y - 1.5, 1.6, c.rot, 'e', 'topo'));
      if (c.val) papel.push(txt('FOLHA-TEXTO', x + 2, yb + 2, c.hv ?? 2.8, c.val));
      x += w;
    });
    y = yb;
  }
  papel.push(txt('FOLHA-FINA', lx1 - 1, fy0 + hLeg + 1.2, 1.6, 'Gerado pelo Statikos — conferir antes de emitir', 'd'));
  return { papel, hLeg, moldura: { x0: fx0, y0: fy0, x1: fx1, y1: fy1 }, logo };
}

/** Uma prancha por grupo com elementos lançados, numeradas na ordem dos pavimentos. */
export function montarPranchas(b: BuildingModel, o: Omit<OpcoesPrancha, 'numero' | 'total'> = {}): Prancha[] {
  const grupos = [...new Set(pavimentosOrdenados(b).map((p) => p.grupo))].filter((g) => b.vigas.some((v) => v.grupo === g) || b.lajes.some((l) => l.grupo === g));
  return grupos.map((g, i) => montarPrancha(b, g, { ...o, numero: i + 1, total: grupos.length }));
}

/** Transformação do modelo (m) para o papel (mm) pela janela da prancha. */
export function modeloParaPapel(pr: Prancha): (p: P) => P {
  const j = pr.janela;
  if (!j) return (p) => p;
  const s = 1000 / pr.escala, cx = (j.x0 + j.x1) / 2, cy = (j.y0 + j.y1) / 2;
  return ([x, y]) => [cx + (x - j.centro[0]) * s, cy + (y - j.centro[1]) * s];
}

