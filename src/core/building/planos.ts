// Planos inclinados, rampas e desníveis (frente E3f). Geometria pura: definição do plano (três pontos, reta horizontal +
// inclinação, linha de máxima declividade), cota z(x, y) de lajes e vigas, seta de declividade, coerência viga-pano,
// rotação da seção das vigas horizontais, dobra da armadura superior entre panos, croqui do pavimento e diagnósticos
// (PLANO_*, DESNIVEL_VIGA). O modelo de cálculo 3D dos panos inclinados está em `analitico.ts`.
import { areaPoligono, dentroPoligono, pontoInterno, type P } from '../geom/faces';
import { contornoPilar, type BuildingModel, type DefinicaoPlano, type Laje, type Plano, type Viga } from './types';
import type { Diagnostico } from './verify';
import type { AnaliseEdificio } from './analitico';
import { baseBarra } from '../fe3d';

/** Plano z = a·x + b·y + c (z = desnível em relação ao topo do pavimento, m). */
export interface CoefPlano { a: number; b: number; c: number }

/** Tolerância de cota (m) na coerência entre vigas e panos e nos desníveis. */
export const TOL_COTA = 0.01;
/** Inclinação abaixo da qual o plano é horizontal (tangente). */
export const TOL_INCLINACAO = 1e-6;
/** Tolerância angular (graus) do paralelismo das nervuras com a máxima declividade (C7.69) [a confirmar]. */
export const TOL_NERVURAS = 1;

const r6 = (v: number) => +v.toFixed(6);

/** Inclinação em % a partir do valor e da unidade (% ou graus). */
export const inclinacaoPercentual = (valor: number, unidade: '%' | 'graus' = '%') => (unidade === 'graus' ? r6(Math.tan((valor * Math.PI) / 180) * 100) : valor);
/** Inclinação em graus a partir da tangente (m/m). */
export const grausDaTangente = (t: number) => (Math.atan(t) * 180) / Math.PI;

/** Coeficientes do plano pela definição; null se degenerado (pontos alinhados ou coincidentes). */
export function coeficientesPlano(def: DefinicaoPlano): CoefPlano | null {
  if (def.tipo === 'tresPontos') {
    const [p1, p2, p3] = def.pontos;
    const den = (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p3[0] - p1[0]) * (p2[1] - p1[1]);
    if (Math.abs(den) < 1e-9) return null;
    const a = ((p2[2] - p1[2]) * (p3[1] - p1[1]) - (p3[2] - p1[2]) * (p2[1] - p1[1])) / den;
    const b = ((p3[2] - p1[2]) * (p2[0] - p1[0]) - (p2[2] - p1[2]) * (p3[0] - p1[0])) / den;
    return { a, b, c: p1[2] - a * p1[0] - b * p1[1] };
  }
  const [p1, p2] = def.pontos, L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
  if (L < 1e-6) return null;
  const u: P = [(p2[0] - p1[0]) / L, (p2[1] - p1[1]) / L], t = def.inclinacao / 100;
  // reta horizontal: sobe para a esquerda de p1→p2 (normal (−uy, ux)); máxima declividade: sobe de p1 para p2
  const g: P = def.tipo === 'retaHorizontal' ? [-u[1] * t, u[0] * t] : [u[0] * t, u[1] * t];
  return { a: g[0], b: g[1], c: def.desnivel - g[0] * p1[0] - g[1] * p1[1] };
}

export const zPlano = (c: CoefPlano, p: P) => c.a * p[0] + c.b * p[1] + c.c;
/** Tangente da máxima declividade. */
export const tangentePlano = (c: CoefPlano) => Math.hypot(c.a, c.b);
export const planoInclinado = (c: CoefPlano | null) => !!c && tangentePlano(c) > TOL_INCLINACAO;

/** Plano da obra pelo id (com os coeficientes), ou undefined. */
export function planoPor(b: Pick<BuildingModel, 'planos'>, id: string | undefined): (Plano & { coef: CoefPlano }) | undefined {
  if (!id) return undefined;
  const pl = (b.planos ?? []).find((x) => x.id === id), coef = pl ? coeficientesPlano(pl.def) : null;
  return pl && coef ? { ...pl, coef } : undefined;
}

/** Função de cota (desnível, m) do topo da laje: o plano atribuído ou o desnível constante. */
export function cotaDaLaje(b: Pick<BuildingModel, 'planos'>, l: Pick<Laje, 'plano' | 'nivel'>): (p: P) => number {
  const pl = planoPor(b, l.plano);
  if (pl) return (p) => zPlano(pl.coef, p);
  const n = l.nivel ?? 0;
  return () => n;
}
/** Função de cota (desnível, m) do topo do eixo da viga. */
export function cotaDaViga(b: Pick<BuildingModel, 'planos'>, v: Pick<Viga, 'plano' | 'nivel'>): (p: P) => number {
  return cotaDaLaje(b, v);
}
/** A laje está num plano inclinado (não horizontal)? */
export const lajeInclinada = (b: Pick<BuildingModel, 'planos'>, l: Pick<Laje, 'plano'>) => planoInclinado(planoPor(b, l.plano)?.coef ?? null);

/** Inclinação do plano: tangente, % e graus, e direção descendente da máxima declividade (unitária; null se horizontal). */
export function inclinacaoDoPlano(c: CoefPlano): { tangente: number; percentual: number; graus: number; descendente: P | null } {
  const t = tangentePlano(c);
  return { tangente: t, percentual: t * 100, graus: grausDaTangente(t), descendente: t > TOL_INCLINACAO ? [-c.a / t, -c.b / t] : null };
}

/** Seta da máxima declividade no pano (C7.69): origem no ponto interno, direção descendente e inclinação. null se horizontal. */
export function setaDeclividade(b: BuildingModel, l: Laje): { origem: P; direcao: P; percentual: number; graus: number } | null {
  const pl = planoPor(b, l.plano);
  if (!pl) return null;
  const i = inclinacaoDoPlano(pl.coef);
  if (!i.descendente) return null;
  return { origem: pontoInterno(l.contorno as P[]), direcao: i.descendente, percentual: i.percentual, graus: i.graus };
}

/** Texto da planta junto ao desnível (C7.76, C7.195): desnível no centro do pano e a tangente da inclinação. */
export function textoInclinacao(b: BuildingModel, l: Laje): string {
  const f = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
  const pl = planoPor(b, l.plano);
  const z = cotaDaLaje(b, l)(pontoInterno(l.contorno as P[]));
  const base = `${z >= 0 ? '+' : ''}${f(z)}`;
  return pl && planoInclinado(pl.coef) ? `${base} i = ${f(tangentePlano(pl.coef) * 100, 1)} %` : base;
}

/** Pontos de controle da definição com a cota de cada um (edição na planta, C7.67). */
export function pontosDeControle(pl: Plano): { ponto: P; z: number; rotulo: string }[] {
  const c = coeficientesPlano(pl.def);
  if (!c) return [];
  if (pl.def.tipo === 'tresPontos') return pl.def.pontos.map((q, k) => ({ ponto: [q[0], q[1]] as P, z: q[2], rotulo: `z${k + 1}` }));
  return pl.def.pontos.map((q, k) => ({ ponto: [q[0], q[1]] as P, z: zPlano(c, q as P), rotulo: k ? 'p2' : 'p1' }));
}

// ---------------------------------------------------------------- vizinhança vigas × panos

const distSeg = (p: P, a: P, z: P) => {
  const dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy;
  const u = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
  return Math.hypot(a[0] + u * dx - p[0], a[1] + u * dy - p[1]);
};
const naBorda = (p: P, c: P[], tol = 0.02) => c.some((q, i) => distSeg(p, q, c[(i + 1) % c.length]) < tol);

/** Trechos (pares de pontos) da viga que correm sobre a borda do pano. */
function trechosNaBorda(v: Viga, l: Laje): [P, P][] {
  // sobreposição (colinear, a até 2 cm) de cada trecho da viga com cada aresta do contorno: a viga pode passar por vários panos
  const out: [P, P][] = [], c = l.contorno as P[];
  for (let i = 0; i + 1 < v.pontos.length; i++) {
    const a = v.pontos[i] as P, z = v.pontos[i + 1] as P, L = Math.hypot(z[0] - a[0], z[1] - a[1]);
    if (L < 1e-9) continue;
    const u: P = [(z[0] - a[0]) / L, (z[1] - a[1]) / L];
    for (let k = 0; k < c.length; k++) {
      const p = c[k], q = c[(k + 1) % c.length];
      const dp = Math.abs((p[0] - a[0]) * u[1] - (p[1] - a[1]) * u[0]), dq = Math.abs((q[0] - a[0]) * u[1] - (q[1] - a[1]) * u[0]);
      if (dp > 0.02 || dq > 0.02) continue;
      const tp = (p[0] - a[0]) * u[0] + (p[1] - a[1]) * u[1], tq = (q[0] - a[0]) * u[0] + (q[1] - a[1]) * u[1];
      const t0 = Math.max(0, Math.min(tp, tq)), t1 = Math.min(L, Math.max(tp, tq));
      if (t1 - t0 > 0.01) out.push([[a[0] + u[0] * t0, a[1] + u[1] * t0], [a[0] + u[0] * t1, a[1] + u[1] * t1]]);
    }
  }
  return out;
}

/** Panos do grupo cuja borda contém algum trecho da viga. */
export function panosDaViga(b: BuildingModel, v: Viga): Laje[] {
  return b.lajes.filter((l) => l.grupo === v.grupo && trechosNaBorda(v, l).length > 0);
}

export interface IncoerenciaViga { viga: string; laje: string; desvio: number; sugerido?: string }
/**
 * Vigas incoerentes com o pano inclinado adjacente (C7.70): nos pontos do trecho sobre a borda, a cota da viga difere da do
 * pano em mais de `TOL_COTA`. `sugerido` = plano que corrige (o do pano; na cumeeira, qualquer um dos dois coincide).
 */
export function vigasIncoerentes(b: BuildingModel, grupo?: string): IncoerenciaViga[] {
  const out: IncoerenciaViga[] = [];
  for (const l of b.lajes) {
    if ((grupo && l.grupo !== grupo) || !lajeInclinada(b, l)) continue;
    const zl = cotaDaLaje(b, l);
    for (const v of b.vigas) {
      if (v.grupo !== l.grupo) continue;
      const ts = trechosNaBorda(v, l);
      if (!ts.length) continue;
      const zv = cotaDaViga(b, v);
      const desvio = Math.max(...ts.flat().map((p) => Math.abs(zv(p) - zl(p))));
      if (desvio > TOL_COTA) out.push({ viga: v.id, laje: l.id, desvio, sugerido: l.plano });
    }
  }
  return out;
}

/**
 * Plano que deixa a viga coerente com os panos inclinados vizinhos (correção por clique, C7.70): o primeiro plano de pano
 * adjacente em que a viga fica coerente com todos os panos inclinados que ela borda; senão o do primeiro pano. undefined
 * se a viga não borda pano inclinado.
 */
export function planoSugeridoDaViga(b: BuildingModel, v: Viga): string | undefined {
  const ls = panosDaViga(b, v).filter((l) => lajeInclinada(b, l));
  if (!ls.length) return undefined;
  for (const cand of ls) {
    const zc = cotaDaLaje(b, cand);
    if (ls.every((l) => trechosNaBorda(v, l).flat().every((p) => Math.abs(cotaDaLaje(b, l)(p) - zc(p)) <= TOL_COTA))) return cand.plano;
  }
  return ls[0].plano;
}

/**
 * Seção das vigas horizontais em panos inclinados (C7.74). Só vigas planas (cota constante ao longo do eixo). Com um pano
 * inclinado (ou dois no mesmo plano), a seção gira para acompanhá-lo (ângulo = inclinação transversal ao eixo). Na interseção
 * de dois planos diferentes (cumeeira, rincão) a seção não gira e ganha altura para alcançar os dois panos na face.
 */
export function secaoNoPlano(b: BuildingModel, v: Viga): { gira: boolean; angulo: number; alturaExtra: number } | null {
  const zv = cotaDaViga(b, v), ps = v.pontos as P[];
  if (ps.some((p) => Math.abs(zv(p) - zv(ps[0])) > TOL_COTA)) return null; // viga inclinada: não é plana
  const ls = panosDaViga(b, v).filter((l) => lajeInclinada(b, l));
  if (!ls.length) return null;
  const a = ps[0], z = ps[ps.length - 1], L = Math.hypot(z[0] - a[0], z[1] - a[1]) || 1, n: P = [-(z[1] - a[1]) / L, (z[0] - a[0]) / L];
  const planos = [...new Set(ls.map((l) => l.plano))];
  if (planos.length === 1) {
    const c = planoPor(b, planos[0])!.coef, t = c.a * n[0] + c.b * n[1];
    return { gira: Math.abs(t) > TOL_INCLINACAO, angulo: grausDaTangente(t), alturaExtra: 0 };
  }
  // dois planos: diferença de cota de cada pano na face (meia largura para cada lado)
  const m: P = [(a[0] + z[0]) / 2, (a[1] + z[1]) / 2], h = v.secao.b / 2;
  let extra = 0;
  for (const l of ls) {
    const zl = cotaDaLaje(b, l), ci = pontoInterno(l.contorno as P[]), lado = Math.sign((ci[0] - m[0]) * n[0] + (ci[1] - m[1]) * n[1]) || 1;
    extra = Math.max(extra, Math.abs(zl([m[0] + lado * h * n[0], m[1] + lado * h * n[1]]) - zv(m)));
  }
  return { gira: false, angulo: 0, alturaExtra: extra };
}

/**
 * Linhas da face superior da viga em planta (C7.73): projeção pelo eixo (as faces a ±b/2 do eixo) ou pela face (a face do
 * lado do pano mais alto é a referência e a outra fica a b dela). Devolve as duas linhas e a cota de cada ponta.
 */
export function faceSuperiorDaViga(b: BuildingModel, v: Viga): { linhas: [P, P][]; cotas: [number, number][] } {
  const ps = v.pontos as P[], a = ps[0], z = ps[ps.length - 1], L = Math.hypot(z[0] - a[0], z[1] - a[1]) || 1;
  const n: P = [-(z[1] - a[1]) / L, (z[0] - a[0]) / L], w = v.secao.b, zv = cotaDaViga(b, v);
  const offs = v.projecaoPlano === 'face' ? [0, -w] : [w / 2, -w / 2];
  const linhas = offs.map((o) => [[a[0] + o * n[0], a[1] + o * n[1]], [z[0] + o * n[0], z[1] + o * n[1]]] as [P, P]);
  return { linhas, cotas: linhas.map(() => [zv(a), zv(z)] as [number, number]) };
}

// ---------------------------------------------------------------- armadura dobrada (C7.94, C7.95, C7.129, C7.142)

export interface TrechoDobrado { a: P; z: P; laje?: string; comprimento: number; inclinacao: number }
/**
 * Barra superior (traço em planta de `a` a `z`) sobre panos de planos diferentes: trechos entre as bordas dos panos, com o
 * comprimento verdadeiro (inclinado) de cada um, os pontos de dobra (mudança de inclinação ao longo da barra acima de 0,5°,
 * com o ângulo) e o total. Fora de pano o trecho fica horizontal.
 */
export function dobraDaBarra(b: BuildingModel, grupo: string, a: P, z: P): { trechos: TrechoDobrado[]; dobras: { ponto: P; angulo: number }[]; total: number } {
  const L = Math.hypot(z[0] - a[0], z[1] - a[1]);
  if (L < 1e-9) return { trechos: [], dobras: [], total: 0 };
  const u: P = [(z[0] - a[0]) / L, (z[1] - a[1]) / L];
  const ls = b.lajes.filter((l) => l.grupo === grupo);
  // cortes nas bordas dos panos
  const ts = new Set<number>([0, 1]);
  for (const l of ls) for (const anel of [l.contorno as P[], ...((l.furos ?? []) as P[][])]) for (let i = 0; i < anel.length; i++) {
    const c = anel[i], f = anel[(i + 1) % anel.length], s: P = [f[0] - c[0], f[1] - c[1]], r: P = [z[0] - a[0], z[1] - a[1]], den = r[0] * s[1] - r[1] * s[0];
    if (Math.abs(den) < 1e-12) continue;
    const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, w = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
    if (t > 1e-9 && t < 1 - 1e-9 && w > -1e-9 && w < 1 + 1e-9) ts.add(t);
  }
  const lista = [...ts].sort((x, y) => x - y);
  const trechos: TrechoDobrado[] = [];
  for (let k = 0; k + 1 < lista.length; k++) {
    if ((lista[k + 1] - lista[k]) * L < 1e-6) continue;
    const pa: P = [a[0] + lista[k] * (z[0] - a[0]), a[1] + lista[k] * (z[1] - a[1])], pz: P = [a[0] + lista[k + 1] * (z[0] - a[0]), a[1] + lista[k + 1] * (z[1] - a[1])];
    const m: P = [(pa[0] + pz[0]) / 2, (pa[1] + pz[1]) / 2];
    const l = ls.find((x) => dentroPoligono(m, x.contorno as P[]) && !(x.furos ?? []).some((f) => dentroPoligono(m, f as P[])));
    const pl = l ? planoPor(b, l.plano) : undefined, t = pl ? pl.coef.a * u[0] + pl.coef.b * u[1] : 0, Lh = (lista[k + 1] - lista[k]) * L;
    trechos.push({ a: pa, z: pz, ...(l ? { laje: l.id } : {}), comprimento: Lh * Math.hypot(1, t), inclinacao: t });
  }
  // trechos consecutivos de mesma inclinação se juntam
  const juntos: TrechoDobrado[] = [];
  for (const t of trechos) {
    const ult = juntos.at(-1);
    if (ult && Math.abs(grausDaTangente(ult.inclinacao) - grausDaTangente(t.inclinacao)) <= 0.5) { ult.z = t.z; ult.comprimento += t.comprimento; if (ult.laje !== t.laje) delete ult.laje; }
    else juntos.push({ ...t });
  }
  const dobras = juntos.slice(1).map((t, k) => ({ ponto: t.a, angulo: Math.abs(grausDaTangente(t.inclinacao) - grausDaTangente(juntos[k].inclinacao)) }));
  return { trechos: juntos, dobras, total: juntos.reduce((s, t) => s + t.comprimento, 0) };
}

/** Marca do ponto de dobra (C7.95): traço perpendicular ao eixo da barra, de comprimento `tam` (m), centrado no ponto. */
export function marcaDeDobra(ponto: P, direcao: P, tam = 0.1): [P, P] {
  const L = Math.hypot(direcao[0], direcao[1]) || 1, n: P = [-direcao[1] / L, direcao[0] / L];
  return [[ponto[0] - (n[0] * tam) / 2, ponto[1] - (n[1] * tam) / 2], [ponto[0] + (n[0] * tam) / 2, ponto[1] + (n[1] * tam) / 2]];
}

// ---------------------------------------------------------------- croqui do pavimento (C7.76, C7.195)

export interface Croqui { escala: number; largura: number; altura: number; pilares: P[][]; vigas: [P, P][]; setas: { origem: P; fim: P; texto: string }[] }
/**
 * Croqui do pavimento para a planta de formas: pilares, eixos das vigas e setas de inclinação dos panos inclinados, levados a
 * um quadro de `tamanho` (unidades do desenho; o maior lado do pavimento ocupa o quadro), origem no canto inferior esquerdo.
 * null sem lajes inclinadas no grupo (o croqui só aparece com elas).
 */
export function croquiPavimento(b: BuildingModel, grupo: string, tamanho: number): Croqui | null {
  const ls = b.lajes.filter((l) => l.grupo === grupo);
  if (!ls.some((l) => lajeInclinada(b, l))) return null;
  const pils = b.pilares.map((p) => contornoPilar(p, p.secao) as P[]);
  const vigas = b.vigas.filter((v) => v.grupo === grupo).flatMap((v) => v.pontos.slice(1).map((q, i) => [v.pontos[i], q] as [P, P]));
  const pts = [...ls.flatMap((l) => l.contorno as P[]), ...vigas.flat()];
  if (!pts.length) return null;
  const x0 = Math.min(...pts.map((p) => p[0])), y0 = Math.min(...pts.map((p) => p[1])), x1 = Math.max(...pts.map((p) => p[0])), y1 = Math.max(...pts.map((p) => p[1]));
  const e = tamanho / Math.max(x1 - x0, y1 - y0, 1e-6), T = (p: P): P => [(p[0] - x0) * e, (p[1] - y0) * e];
  const setas = ls.flatMap((l) => {
    const s = setaDeclividade(b, l);
    if (!s) return [];
    const k = Math.sqrt(Math.abs(areaPoligono(l.contorno as P[]))) * 0.3;
    return [{ origem: T(s.origem), fim: T([s.origem[0] + s.direcao[0] * k, s.origem[1] + s.direcao[1] * k]), texto: `${s.percentual.toFixed(1).replace('.', ',')} %` }];
  });
  return { escala: e, largura: (x1 - x0) * e, altura: (y1 - y0) * e, pilares: pils.filter((c) => c.some((p) => p[0] >= x0 - 1 && p[0] <= x1 + 1 && p[1] >= y0 - 1 && p[1] <= y1 + 1)).map((c) => c.map(T)), vigas: vigas.map(([a, z]) => [T(a), T(z)] as [P, P]), setas };
}

// ---------------------------------------------------------------- captura na definição gráfica (C7.66)

/** Ponto capturado sobre o eixo ou uma face de viga do grupo (cursor em outra cor), a até `tol` m; null se nenhum. */
export function capturaPlano(b: BuildingModel, grupo: string, p: P, tol = 0.1): { ponto: P; tipo: 'eixo' | 'face'; viga: string } | null {
  let melhor: { ponto: P; tipo: 'eixo' | 'face'; viga: string; d: number } | null = null;
  for (const v of b.vigas) {
    if (v.grupo !== grupo) continue;
    for (let i = 0; i + 1 < v.pontos.length; i++) {
      const a = v.pontos[i] as P, z = v.pontos[i + 1] as P, L = Math.hypot(z[0] - a[0], z[1] - a[1]);
      if (L < 1e-9) continue;
      const n: P = [-(z[1] - a[1]) / L, (z[0] - a[0]) / L];
      for (const [tipo, o] of [['eixo', 0], ['face', v.secao.b / 2], ['face', -v.secao.b / 2]] as const) {
        const a2: P = [a[0] + o * n[0], a[1] + o * n[1]], z2: P = [z[0] + o * n[0], z[1] + o * n[1]];
        const dx = z2[0] - a2[0], dy = z2[1] - a2[1], t = Math.max(0, Math.min(1, ((p[0] - a2[0]) * dx + (p[1] - a2[1]) * dy) / (L * L)));
        const q: P = [a2[0] + t * dx, a2[1] + t * dy], d = Math.hypot(q[0] - p[0], q[1] - p[1]);
        if (d <= tol && (!melhor || d < melhor.d - 1e-12)) melhor = { ponto: q, tipo, viga: v.id, d };
      }
    }
  }
  return melhor ? { ponto: melhor.ponto, tipo: melhor.tipo, viga: melhor.viga } : null;
}

// ---------------------------------------------------------------- diagnósticos

/** Direção das nervuras do pano (graus) quando o tipo é unidirecional com direção (vigotas, treliçada, alveolar). */
const direcaoNervuras = (l: Laje) => (l.tipo.tipo === 'macica' || l.tipo.tipo === 'nervurada' ? undefined : l.direcao ?? 0);

export function diagnosticosPlanos(b: BuildingModel): Diagnostico[] {
  const d: Diagnostico[] = [];
  for (const pl of b.planos ?? []) if (!coeficientesPlano(pl.def)) d.push({ codigo: 'PLANO_INVALIDO', severidade: 'erro', elementos: [pl.id], mensagem: `Plano ${pl.nome}: pontos alinhados ou coincidentes em planta (definição degenerada).` });
  for (const e of [...b.lajes, ...b.vigas]) {
    if (!e.plano) continue;
    const pl = (b.planos ?? []).find((x) => x.id === e.plano);
    if (!pl || pl.grupo !== e.grupo) d.push({ codigo: 'PLANO_INEXISTENTE', severidade: 'erro', elementos: [e.id], mensagem: `${e.nome}: plano ${e.plano} inexistente ou de outro grupo.` });
  }
  for (const x of vigasIncoerentes(b)) {
    const v = b.vigas.find((y) => y.id === x.viga)!, l = b.lajes.find((y) => y.id === x.laje)!;
    d.push({ codigo: 'PLANO_VIGA', severidade: 'erro', elementos: [v.id, l.id], mensagem: `Plano: ${v.nome} não acompanha a inclinação de ${l.nome} (desvio de ${(x.desvio * 100).toFixed(1).replace('.', ',')} cm na borda).`,
      sugestao: { comando: 'plano.corrigirVigas', params: { vigas: [v.id] }, texto: `Copiar para ${v.nome} a inclinação do pano` } });
  }
  for (const l of b.lajes) {
    const pl = planoPor(b, l.plano), dir = direcaoNervuras(l);
    if (!pl || dir === undefined || !planoInclinado(pl.coef)) continue;
    const ang = (Math.atan2(-pl.coef.b, -pl.coef.a) * 180) / Math.PI, dif = ((((dir - ang) % 90) + 90) % 90);
    if (Math.min(dif, 90 - dif) > TOL_NERVURAS) d.push({ codigo: 'PLANO_NERVURAS', severidade: 'aviso', elementos: [l.id], mensagem: `Plano: as nervuras de ${l.nome} não são paralelas nem perpendiculares à máxima declividade (${Math.min(dif, 90 - dif).toFixed(1).replace('.', ',')}°).` });
  }
  // limitações (C7.75): pano inclinado não se apoia em muro e não há viga comum com o coroamento de muro
  for (const l of b.lajes) {
    if (!lajeInclinada(b, l)) continue;
    const c = l.contorno as P[];
    const muro = (b.paredes ?? []).find((w) => w.pontos.slice(1).some((q, i) => { const m: P = [(q[0] + w.pontos[i][0]) / 2, (q[1] + w.pontos[i][1]) / 2]; return naBorda(m, c, 0.05); }));
    const coroa = b.vigas.find((v) => v.grupo === l.grupo && v.vinculoExterno && trechosNaBorda(v, l).length);
    if (muro || coroa) d.push({ codigo: 'PLANO_MURO', severidade: 'aviso', elementos: [l.id, (muro ?? coroa)!.id], mensagem: `Plano: ${l.nome} é inclinado e se apoia em ${muro ? `muro (${muro.nome})` : `coroamento de muro (${coroa!.nome})`}; o pano inclinado não se apoia em muro (limitação): use viga própria.` });
  }
  // desníveis entre panos (K1.9.57): a viga de apoio comum não tem a flexão transversal calculada
  for (const v of b.vigas) {
    const ls = panosDaViga(b, v);
    if (ls.length < 2) continue;
    let dz = 0;
    for (let i = 0; i < ls.length; i++) for (let j = i + 1; j < ls.length; j++) {
      const pts = trechosNaBorda(v, ls[i]).flat().filter((p) => naBorda(p, ls[j].contorno as P[]));
      for (const p of pts) dz = Math.max(dz, Math.abs(cotaDaLaje(b, ls[i])(p) - cotaDaLaje(b, ls[j])(p)));
    }
    if (dz > TOL_COTA) d.push({ codigo: 'DESNIVEL_VIGA', severidade: 'aviso', elementos: [v.id, ...ls.map((l) => l.id)], mensagem: `Desnível de ${(dz * 100).toFixed(0)} cm entre os panos apoiados em ${v.nome}: a flexão transversal da viga não é calculada; confira estribos e ancoragens (a torção de equilíbrio existente é mantida).` });
  }
  return d;
}

// ---------------------------------------------------------------- memorial

export interface LinhaPlanoMemorial { plano: string; nome: string; grupo: string; definicao: string; percentual: number; graus: number; lajes: string[]; vigas: string[] }
/** Quadro dos planos para o memorial: definição, inclinação e elementos atribuídos (indicação de plano atribuído, C7.61). */
export function planosNoMemorial(b: BuildingModel): LinhaPlanoMemorial[] {
  const f = (v: number) => v.toFixed(2).replace('.', ',');
  return (b.planos ?? []).map((pl) => {
    const c = coeficientesPlano(pl.def), i = c ? inclinacaoDoPlano(c) : { percentual: 0, graus: 0 };
    const definicao = pl.def.tipo === 'tresPontos' ? `três pontos (${pl.def.pontos.map((q) => `${f(q[0])}; ${f(q[1])}; z ${f(q[2])}`).join(' | ')})`
      : `${pl.def.tipo === 'retaHorizontal' ? 'reta horizontal' : 'máxima declividade'} (${pl.def.pontos.map((q) => `${f(q[0])}; ${f(q[1])}`).join(' → ')}), desnível ${f(pl.def.desnivel)} m, ${f(pl.def.inclinacao)} %`;
    return { plano: pl.id, nome: pl.nome, grupo: pl.grupo, definicao, percentual: i.percentual, graus: i.graus, lajes: b.lajes.filter((l) => l.plano === pl.id).map((l) => l.nome), vigas: b.vigas.filter((v) => v.plano === pl.id).map((v) => v.nome) };
  });
}

/** Planos usados por algum elemento (indicação de plano já atribuído, C7.61). */
export const planoAtribuido = (b: BuildingModel, id: string) => b.lajes.some((l) => l.plano === id) || b.vigas.some((v) => v.plano === id);

/** Sequência recomendada para lançar panos inclinados (C7.60, C7.72) e dicas dos casos-guia (C7.71, C7.77): texto de ajuda. */
export const SEQUENCIA_PLANOS: string[] = [
  'Lance tudo na horizontal (grupos, pilares, vigas e panos) e só depois atribua as inclinações ou os desníveis.',
  'Crie um grupo por cota quando os panos se sobrepõem em planta (rampas de garagem: grupo intermediário com pilares próprios).',
  'Lance primeiro os panos horizontais e as vigas comuns entre grupos; depois os panos a inclinar, com as vigas de transição ajustadas às interseções do gabarito (viga.ajustarPlano).',
  'Defina os planos (três pontos, reta horizontal + inclinação ou máxima declividade) e atribua-os aos panos; corrija as vigas em vermelho copiando a inclinação do pano.',
  'Só panos inclinados: desníveis positivos a partir do pavimento. Pano horizontal numa extremidade: desníveis negativos no grupo superior, com vigas comuns. Horizontais nas duas extremidades: rampa num grupo intermediário.',
  'Curvas de rampa: de preferência em plano horizontal (pano curvo inclinado não é modelado).',
];

/** Casos-guia de lançamento dos planos (C7.71): o que lançar em cada situação. Texto de ajuda. */
export const CASOS_GUIA_PLANOS: { id: string; titulo: string; texto: string }[] = [
  { id: 'inclinados', titulo: 'Só panos inclinados', texto: 'Todos os panos do grupo sobem a partir da cota do pavimento: desníveis positivos nos planos, vigas de borda acompanhando cada pano.' },
  { id: 'horizontalUmaPonta', titulo: 'Pano horizontal numa extremidade', texto: 'O pano horizontal fica no pavimento de cima; o grupo superior recebe os panos inclinados com desníveis negativos, ligados ao horizontal por vigas comuns.' },
  { id: 'horizontalDuasPontas', titulo: 'Panos horizontais nas duas extremidades', texto: 'A rampa vai num grupo intermediário, com pilares próprios (morrem no grupo) e vigas comuns nas extremidades, onde encontra os panos horizontais de cima e de baixo.' },
  { id: 'sobrepostos', titulo: 'Panos sobrepostos na projeção', texto: 'Quando dois panos ocupam a mesma região da planta, cada um vai num grupo próprio, com a sua cota: um grupo por cota.' },
];

/** Limitações dos planos inclinados (C7.75, C7.76): texto da interface, da ajuda e do memorial. */
export const LIMITACOES_PLANOS: string[] = [
  'O pano inclinado não se apoia em muro: use viga própria sob o pano (aviso PLANO_MURO).',
  'Não há viga comum com o coroamento de um muro: o coroamento não divide a borda com pano inclinado.',
  'A flexão transversal da viga de apoio comum a panos de cotas diferentes não é calculada (aviso DESNIVEL_VIGA): conferir estribos e ancoragens.',
  'Pano curvo inclinado não é modelado: lance as curvas de rampa de preferência em plano horizontal.',
];

/**
 * Esforços normais das barras dos panos e vigas inclinados (E3f, memorial) e empuxo horizontal no topo dos pilares dos
 * pavimentos com planos, por caso vertical: N mínimo (compressão) e máximo (tração) por elemento (kN; laje por barra da faixa)
 * e a força horizontal que o lance recebe no topo (kN, eixos globais).
 */
export function esforcosDosPlanos(an: AnaliseEdificio): { normais: { ref: string; tipo: 'laje' | 'viga'; caso: string; Nmin: number; Nmax: number }[]; empuxos: { pilar: string; pavimento: string; caso: string; Hx: number; Hy: number }[] } {
  const normais: { ref: string; tipo: 'laje' | 'viga'; caso: string; Nmin: number; Nmax: number }[] = [], empuxos: { pilar: string; pavimento: string; caso: string; Hx: number; Hy: number }[] = [];
  const res = an.portico.res, pm = an.portico.modelo, tags = an.portico.barras;
  if (!res || !an.planos) return { normais, empuxos };
  const pavs = new Set(an.planos.map((x) => x.pavimento));
  an.casos.forEach((caso, ic) => {
    const acc = new Map<string, { tipo: 'laje' | 'viga'; Nmin: number; Nmax: number }>();
    for (const x of an.planos!) for (const k of x.barras) {
      const t = tags[k], e = res.esforcos[ic][k], N = [-e[0], e[6]];
      const a = acc.get(t.ref) ?? { tipo: t.tipo === 'laje' ? 'laje' as const : 'viga' as const, Nmin: Infinity, Nmax: -Infinity };
      a.Nmin = Math.min(a.Nmin, ...N); a.Nmax = Math.max(a.Nmax, ...N);
      acc.set(t.ref, a);
    }
    for (const [ref, a] of acc) normais.push({ ref, caso, ...a });
    tags.forEach((t, k) => {
      if (t.tipo !== 'pilar' || !pavs.has(t.pavimento) || k >= pm.barras.length) return;
      const { R } = baseBarra(pm, pm.barras[k]), e = res.esforcos[ic][k];
      // força que o nó de cima aplica no lance (extremidade j), em eixos globais
      const g = [0, 1, 2].map((c) => R[0][c] * e[6] + R[1][c] * e[7] + R[2][c] * e[8]);
      empuxos.push({ pilar: t.ref, pavimento: t.pavimento, caso, Hx: g[0], Hy: g[1] });
    });
  });
  return { normais, empuxos };
}

/**
 * Seletor único de tipo de pano (C7.1): os tipos que o programa calcula e o estado de cada um. Radier fecha com a base
 * elástica (FU6, lançado pelas fundações) e laje mista (steel deck) fica fora do escopo (aço).
 */
export const TIPOS_PANO: { id: 'vigotas' | 'alveolar' | 'nervurada' | 'macica' | 'definir' | 'radier' | 'mista'; rotulo: string; disponivel: boolean; nota?: string }[] = [
  { id: 'vigotas', rotulo: 'Vigotas (unidirecional)', disponivel: true },
  { id: 'alveolar', rotulo: 'Alveolar', disponivel: true },
  { id: 'nervurada', rotulo: 'Nervurada bidirecional (cubetas)', disponivel: true },
  { id: 'macica', rotulo: 'Maciça', disponivel: true },
  { id: 'definir', rotulo: 'Pano a definir', disponivel: true },
  { id: 'radier', rotulo: 'Radier', disponivel: false, nota: 'lançado pelas fundações (base elástica, FU6)' },
  { id: 'mista', rotulo: 'Mista (steel deck)', disponivel: false, nota: 'aço fora do escopo' },
];
