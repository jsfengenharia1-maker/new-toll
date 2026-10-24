// Geometria pura das ferramentas de planta com o mouse (E5b): consolo pelo clique na face do pilar (C6.55), diagonal por dois
// cliques (C6.42), linhas magenta da interseção de planos e da máxima declividade (C6.58), edição do plano pelos pontos e pelos
// textos (C7.67) e ábaco desenhado na planta ajustado ao número de caixotes (K1.9.97, K1.9.99). A interface só traduz o clique
// nestas funções e lança os comandos `consolo.criar`, `diagonal.criar`, `plano.editar` e `abaco.criar`.
import { dentroPoligono, type P } from '../geom/faces';
import { faceDoPilar, pontaDaViga, pontaToca } from './consolos';
import { arranjoDaLaje, direcaoNervurada, poligonoEfetivoAbaco } from './nervuradas';
import { retanguloLocal } from './abacos';
import { coeficientesPlano, zPlano } from './planos';
import { contornoPilar, pavimentosOrdenados, type BuildingModel, type Laje, type Pilar, type Plano, type Viga } from './types';

const r6 = (v: number) => +v.toFixed(6);
const dist = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function distSegmento(p: P, a: P, z: P): number {
  const dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy, u = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
  return Math.hypot(a[0] + u * dx - p[0], a[1] + u * dy - p[1]);
}

// ---------------------------------------------------------------- consolo na face do pilar (C6.55)

export type EscolhaConsolo =
  | { ok: true; pilar: string; viga: string; ponta: 'ini' | 'fim'; face: number; aresta: [P, P] | null }
  | { ok: false; motivo: string };

/** Aresta do contorno do pilar que a face indica (null na seção circular, que não tem face plana). */
export function arestaDaFace(pil: Pilar, face: number): [P, P] | null {
  if (face < 0) return null;
  const c = contornoPilar(pil, pil.secao) as P[];
  return [c[face % c.length], c[(face + 1) % c.length]];
}

/**
 * Consolo pelo clique: o pilar cujo contorno está a até `tol` m do ponto e a viga que chega à face clicada (ponta que toca o pilar,
 * sem consolo). Havendo vigas em mais de uma face, vale a da face mais próxima do clique; na seção circular, a ponta mais próxima.
 */
export function consoloNaFace(b: Pick<BuildingModel, 'consolos'>, pilares: Pilar[], vigas: Viga[], p: P, tol = 0.15): EscolhaConsolo {
  let pil: Pilar | null = null, dm = Infinity;
  for (const q of pilares) {
    const c = contornoPilar(q, q.secao) as P[];
    const d = dentroPoligono(p, c) ? 0 : Math.min(...c.map((v, i) => distSegmento(p, v, c[(i + 1) % c.length])));
    if (d <= tol && d < dm - 1e-9) { dm = d; pil = q; }
  }
  if (!pil) return { ok: false, motivo: 'Clique na face de um pilar.' };
  const alvo = pil;
  const cand: { viga: Viga; ponta: 'ini' | 'fim'; ponto: P; ocupada: boolean }[] = [];
  for (const v of vigas) for (const ponta of ['ini', 'fim'] as const) {
    const ponto = pontaDaViga(v as { pontos: [number, number][] }, ponta) as P;
    if (pontaToca(ponto, alvo)) cand.push({ viga: v, ponta, ponto, ocupada: !!b.consolos?.some((c) => c.viga === v.id && c.ponta === ponta) });
  }
  if (!cand.length) return { ok: false, motivo: `Nenhuma viga chega ao pilar ${alvo.nome}: leve a ponta da viga até a face.` };
  const livres = cand.filter((x) => !x.ocupada);
  if (!livres.length) return { ok: false, motivo: `As vigas que chegam ao pilar ${alvo.nome} já têm consolo.` };
  const faceClique = faceDoPilar(alvo, p);
  const naFace = livres.filter((x) => faceDoPilar(alvo, x.ponto) === faceClique);
  if (faceClique >= 0 && !naFace.length && livres.length > 1) return { ok: false, motivo: `Nenhuma viga livre chega a esta face do pilar ${alvo.nome}: clique na face da viga.` };
  const pool = faceClique < 0 || !naFace.length ? livres : naFace;
  const e = [...pool].sort((u, w) => dist(u.ponto, p) - dist(w.ponto, p))[0];
  const face = faceDoPilar(alvo, e.ponto);
  return { ok: true, pilar: alvo.id, viga: e.viga.id, ponta: e.ponta, face, aresta: arestaDaFace(alvo, face) };
}

// ---------------------------------------------------------------- diagonal por dois cliques (C6.42)

/** Pavimento seguinte ao indicado (acima), ou null no último. */
export function pavimentoAcima(b: BuildingModel, pav: string): string | null {
  const ps = pavimentosOrdenados(b), i = ps.findIndex((p) => p.id === pav);
  return i >= 0 && i + 1 < ps.length ? ps[i + 1].id : null;
}

/**
 * Parâmetros de `diagonal.criar` a partir dos dois cliques: a ponta inicial fica no pavimento da planta; a final no pavimento
 * escolhido (vazio = o pavimento acima). Null se não há pavimento acima nem escolhido.
 */
export function paramsDiagonalPlanta(b: BuildingModel, pavAtual: string, pavFim: string, a: P, z: P, secao: { b: number; h: number }) {
  const fim = pavFim || pavimentoAcima(b, pavAtual);
  if (!fim) return null;
  return { pavIni: pavAtual, pavFim: fim, pIni: [r6(a[0]), r6(a[1])] as P, pFim: [r6(z[0]), r6(z[1])] as P, secao: { ...secao } };
}

// ---------------------------------------------------------------- linhas magenta dos planos (C6.58)

export interface LinhaMagenta { tipo: 'interseccao' | 'declividade'; a: P; z: P; planos: string[] }

/** Caixa envolvente [x0, y0, x1, y1] (m) dos panos e vigas do grupo, com folga. */
export function caixaDoGrupo(b: BuildingModel, grupo: string, folga = 0.5): [number, number, number, number] | null {
  const pts: P[] = [...b.lajes.filter((l) => l.grupo === grupo).flatMap((l) => l.contorno as P[]), ...b.vigas.filter((v) => v.grupo === grupo).flatMap((v) => v.pontos as P[])];
  if (!pts.length) return null;
  return [Math.min(...pts.map((q) => q[0])) - folga, Math.min(...pts.map((q) => q[1])) - folga, Math.max(...pts.map((q) => q[0])) + folga, Math.max(...pts.map((q) => q[1])) + folga];
}

/** Recorta a reta (ponto + direção) na caixa [x0, y0, x1, y1]; null se não a atravessa. */
export function recortarReta(o: P, d: P, caixa: [number, number, number, number]): [P, P] | null {
  let t0 = -Infinity, t1 = Infinity;
  for (const [k, lo, hi] of [[0, caixa[0], caixa[2]], [1, caixa[1], caixa[3]]] as const) {
    if (Math.abs(d[k]) < 1e-12) { if (o[k] < lo || o[k] > hi) return null; continue; }
    const u = (lo - o[k]) / d[k], w = (hi - o[k]) / d[k];
    t0 = Math.max(t0, Math.min(u, w)); t1 = Math.min(t1, Math.max(u, w));
  }
  if (!(t1 - t0 > 1e-9) || !Number.isFinite(t0) || !Number.isFinite(t1)) return null;
  return [[o[0] + t0 * d[0], o[1] + t0 * d[1]], [o[0] + t1 * d[0], o[1] + t1 * d[1]]];
}

/**
 * Linhas magenta do grupo: a interseção de cada par de planos (contínua) e a linha de máxima declividade de cada plano inclinado
 * pelo seu primeiro ponto (tracejada), recortadas na caixa dos panos e vigas. Com `plano`, só as linhas desse plano.
 */
export function linhasMagenta(b: BuildingModel, grupo: string, o: { plano?: string } = {}): LinhaMagenta[] {
  const caixa = caixaDoGrupo(b, grupo);
  if (!caixa) return [];
  const pls = (b.planos ?? []).filter((p) => p.grupo === grupo).flatMap((p) => { const c = coeficientesPlano(p.def); return c ? [{ p, c }] : []; });
  const out: LinhaMagenta[] = [];
  for (let i = 0; i < pls.length; i++) for (let j = i + 1; j < pls.length; j++) {
    if (o.plano && pls[i].p.id !== o.plano && pls[j].p.id !== o.plano) continue;
    const a = pls[i].c.a - pls[j].c.a, bb = pls[i].c.b - pls[j].c.b, c = pls[i].c.c - pls[j].c.c, n2 = a * a + bb * bb;
    if (n2 < 1e-12) continue;
    const seg = recortarReta([-a * c / n2, -bb * c / n2], [-bb, a], caixa);
    if (seg) out.push({ tipo: 'interseccao', a: seg[0], z: seg[1], planos: [pls[i].p.id, pls[j].p.id] });
  }
  for (const { p, c } of pls) {
    if (o.plano && p.id !== o.plano) continue;
    const n = Math.hypot(c.a, c.b);
    if (n < 1e-9) continue;
    const seg = recortarReta([p.def.pontos[0][0], p.def.pontos[0][1]], [c.a / n, c.b / n], caixa);
    if (seg) out.push({ tipo: 'declividade', a: seg[0], z: seg[1], planos: [p.id] });
  }
  return out;
}

// ---------------------------------------------------------------- edição do plano na planta (C7.67)

export interface RotuloPlano { tipo: 'cota' | 'inclinacao'; indice: number; ponto: P; texto: string; valor: number }
export type ParamsEdicaoPlano = { id: string; pontos?: number[][]; desnivel?: number; inclinacao?: number };

const pontosXY = (pl: Plano): P[] => pl.def.pontos.map((q) => [q[0], q[1]] as P);
const cotasDoPlano = (pl: Plano): number[] => { const c = coeficientesPlano(pl.def); return c ? pl.def.pontos.map((q) => (pl.def.tipo === 'tresPontos' ? (q[2] as number) : zPlano(c, [q[0], q[1]]))) : []; };
const cmTxt = (m: number) => `${(m * 100).toFixed(1).replace('.', ',')} cm`;

/** Inclinação mostrada (%): a informada nos planos por reta; a tangente do plano nos de três pontos. */
export function inclinacaoDoPlano(pl: Plano): number {
  if (pl.def.tipo !== 'tresPontos') return pl.def.inclinacao;
  const c = coeficientesPlano(pl.def);
  return c ? r6(Math.hypot(c.a, c.b) * 100) : 0;
}

/** Textos editáveis do plano: a cota (valor em m) de cada ponto de controle e a inclinação (%), no meio dos pontos. */
export function rotulosDoPlano(pl: Plano): RotuloPlano[] {
  const xy = pontosXY(pl), zs = cotasDoPlano(pl);
  if (!zs.length) return [];
  const out: RotuloPlano[] = xy.map((ponto, indice) => ({ tipo: 'cota', indice, ponto, texto: cmTxt(zs[indice]), valor: zs[indice] }));
  const m: P = [xy.reduce((s, q) => s + q[0], 0) / xy.length, xy.reduce((s, q) => s + q[1], 0) / xy.length], inc = inclinacaoDoPlano(pl);
  out.push({ tipo: 'inclinacao', indice: -1, ponto: m, texto: `${inc.toFixed(1).replace('.', ',')} %`, valor: inc });
  return out;
}

/** Ponto de controle do plano a até `tol` m de `p` (índice) ou -1. */
export function pontoDoPlanoSob(pl: Plano, p: P, tol: number): number {
  let k = -1, dm = tol;
  pontosXY(pl).forEach((q, i) => { const d = dist(q, p); if (d <= dm) { dm = d; k = i; } });
  return k;
}

/** Arrasto: o ponto `indice` vai para `novo` em planta; as cotas e a inclinação ficam como estão. */
export function moverPontoDoPlano(pl: Plano, indice: number, novo: P): ParamsEdicaoPlano {
  const pts = (pl.def.pontos as number[][]).map((q, i) => (i === indice ? [r6(novo[0]), r6(novo[1]), ...(q.slice(2) as number[])] : [...q]));
  return { id: pl.id, pontos: pts };
}

/** Texto da cota reescrito (z em m): três pontos mudam a cota do ponto; reta horizontal, o desnível; máxima declividade, o desnível (p1) ou a inclinação (p2). */
export function reescreverCotaDoPlano(pl: Plano, indice: number, z: number): ParamsEdicaoPlano | null {
  if (!Number.isFinite(z) || indice < 0 || indice >= pl.def.pontos.length) return null;
  const d = pl.def;
  if (d.tipo === 'tresPontos') return { id: pl.id, pontos: d.pontos.map((q, i) => (i === indice ? [q[0], q[1], r6(z)] : [...q])) };
  if (d.tipo === 'retaHorizontal' || indice === 0) return { id: pl.id, desnivel: r6(z) };
  const L = dist(d.pontos[0] as P, d.pontos[1] as P);
  return L < 1e-9 ? null : { id: pl.id, inclinacao: r6(((z - d.desnivel) / L) * 100) };
}

/**
 * Texto da inclinação reescrito (%): reta horizontal e máxima declividade trocam a inclinação; o plano de três pontos gira em torno
 * do primeiro ponto (as cotas dos outros mudam na proporção, mantendo a direção da máxima declividade). Null no plano horizontal de três pontos.
 */
export function reescreverInclinacaoDoPlano(pl: Plano, percentual: number): ParamsEdicaoPlano | null {
  if (!Number.isFinite(percentual)) return null;
  const d = pl.def;
  if (d.tipo !== 'tresPontos') return { id: pl.id, inclinacao: r6(percentual) };
  const t = inclinacaoDoPlano(pl) / 100;
  if (t < 1e-9) return null;
  const k = percentual / 100 / t, z0 = d.pontos[0][2];
  return { id: pl.id, pontos: d.pontos.map((q) => [q[0], q[1], r6(z0 + k * (q[2] - z0))]) };
}

// ---------------------------------------------------------------- ábaco desenhado na planta (K1.9.97, K1.9.99)

/** Pano nervurado (bidirecional, definido) do grupo que contém o ponto. */
export function nervuradaSob(b: BuildingModel, grupo: string, p: P): Laje | null {
  return b.lajes.find((l) => l.grupo === grupo && l.tipo.tipo === 'nervurada' && !l.definir && dentroPoligono(p, l.contorno as P[])) ?? null;
}

/** Retângulo alinhado às nervuras do pano, com os dois cantos clicados em extremos opostos. */
export function retanguloNasNervuras(l: Pick<Laje, 'contorno' | 'direcao'>, a: P, z: P): P[] {
  const ang = (direcaoNervurada(l) * Math.PI) / 180, c = Math.cos(ang), s = Math.sin(ang);
  const loc = (p: P): P => [p[0] * c + p[1] * s, -p[0] * s + p[1] * c], glob = (p: P): P => [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
  const A = loc(a), Z = loc(z);
  return ([[A[0], A[1]], [Z[0], A[1]], [Z[0], Z[1]], [A[0], Z[1]]] as P[]).map(glob);
}

export interface AbacoNaPlanta { ok: boolean; motivo?: string; poligono: P[]; caixotes: [number, number] }

/**
 * Zona efetiva do ábaco desenhado: o retângulo alinhado às nervuras cresce até os eixos mais próximos (a cubeta tocada em parte
 * sai inteira, como no cálculo) e o número de caixotes sai da largura e da altura pelo intereixo; polígono qualquer vale como está.
 */
export function abacoAjustadoAosCaixotes(b: BuildingModel, l: Laje, poligono: P[]): AbacoNaPlanta {
  const ar = arranjoDaLaje(b, l);
  if (!ar) return { ok: false, motivo: `${l.nome} não é nervurada bidirecional definida.`, poligono: [], caixotes: [0, 0] };
  const ef = poligonoEfetivoAbaco(l, ar.g, poligono);
  if (ef.length < 3) return { ok: false, motivo: `O ábaco fica fora de ${l.nome}.`, poligono: [], caixotes: [0, 0] };
  const r = retanguloLocal(l, ef);
  return { ok: true, poligono: ef, caixotes: [Math.max(1, Math.round((r.x1 - r.x0) / ar.g.i[1])), Math.max(1, Math.round((r.y1 - r.y0) / ar.g.i[0]))] };
}
