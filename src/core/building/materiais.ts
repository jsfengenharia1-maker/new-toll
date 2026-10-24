// Materiais, coeficientes de segurança, cobrimentos e flambagem do edifício (frente N1b).
// Padrão pela NBR 6118; cada valor é editável na obra (norma.*) e, onde o manual de referência permite, por elemento.
import { capaLaje } from './tiposLaje';
import { concrete, type Concrete } from '../concrete';
import { gamaCDoControle } from './acoes';
import { cotaFundacao, lancesDoPilar, pavimentosOrdenados, secaoNoLance, dimsSecao, type BuildingModel, type Norma, type Pilar } from './types';
import { opcoesEmUso, perfilDe } from './opcoes';
import { vigaTocaPilar } from './vigas';
import { dentroPoligono } from '../geom/faces';

export type Aco = Norma['aco'];
/** Tipos de elemento com concreto próprio (fundacao = sapatas e blocos do edifício). */
export type TipoElemento = 'laje' | 'viga' | 'pilar' | 'fundacao';
/** Posições de armadura com aço próprio (as que o dimensionamento calcula). */
export type PosicaoAco = 'pilarLong' | 'pilarEstribo' | 'vigaPos' | 'vigaNeg' | 'vigaMontagem' | 'vigaPele' | 'vigaEstribo' | 'lajeInf' | 'lajeSup' | 'lajePuncao' | 'lajeCortante' | 'escadaInf' | 'escadaSup' | 'fundacao' | 'alvenariaVert' | 'alvenariaHor';
export const POSICOES_ACO: { k: PosicaoAco; rotulo: string }[] = [
  { k: 'pilarLong', rotulo: 'Pilares: longitudinal' }, { k: 'pilarEstribo', rotulo: 'Pilares: estribos' },
  { k: 'vigaPos', rotulo: 'Vigas: positiva (inferior)' }, { k: 'vigaNeg', rotulo: 'Vigas: negativa (superior)' }, { k: 'vigaMontagem', rotulo: 'Vigas: montagem (porta-estribos)' }, { k: 'vigaPele', rotulo: 'Vigas: pele (laterais)' }, { k: 'vigaEstribo', rotulo: 'Vigas: estribos' },
  { k: 'lajeInf', rotulo: 'Lajes: inferior' }, { k: 'lajeSup', rotulo: 'Lajes: superior' },
  { k: 'lajePuncao', rotulo: 'Lajes: armadura de punção' }, { k: 'lajeCortante', rotulo: 'Lajes: armadura de cortante' },
  { k: 'escadaInf', rotulo: 'Escadas: inferior' }, { k: 'escadaSup', rotulo: 'Escadas: superior' },
  { k: 'fundacao', rotulo: 'Fundações (sapatas, blocos, tubulões)' },
  { k: 'alvenariaVert', rotulo: 'Alvenaria armada: barras verticais' }, { k: 'alvenariaHor', rotulo: 'Alvenaria armada: armadura horizontal (junta)' },
];

/** γ padrão (NBR 6118, Tabelas 11.1 e 12.1, combinações normais). */
export const GAMAS_PADRAO = { c: 1.4, s: 1.15, g: 1.4, q: 1.4, h: 1.4 };
/** γ em uso: o padrão (γc pelo nível de controle de execução; h = empuxo de terra) e o que a obra alterou. */
export const gamas = (b: BuildingModel) => ({ ...GAMAS_PADRAO, c: gamaCDoControle(b.norma.controle), ...b.norma.gamas });

/**
 * fck (MPa) do tipo de elemento; nos pilares, o do lance que chega ao pavimento quando informado (do pilar, E1a; senão o por pavimento). Fundação: o dos
 * materiais, o das opções das fundações (arquivos anteriores) ou o da obra.
 */
export function fckDe(b: BuildingModel, tipo: TipoElemento, pavimento?: string, pilar?: Pick<Pilar, 'fck'>): number {
  if (tipo === 'pilar' && pavimento) { const fp = pilar?.fck?.find((x) => x.pavimento === pavimento)?.fck; if (fp) return fp; }
  if (tipo === 'pilar' && pavimento) { const f = b.norma.fckPilarPav?.find((x) => x.pavimento === pavimento)?.fck; if (f) return f; }
  if (tipo === 'fundacao') return b.norma.fckElem?.fundacao ?? b.fundacao?.params?.fckFound ?? b.norma.fck;
  return b.norma.fckElem?.[tipo] ?? b.norma.fck;
}

/** Concreto de um elemento com o γc da obra. */
export const concretoDe = (b: BuildingModel, tipo: TipoElemento, pavimento?: string, pilar?: Pick<Pilar, 'fck'>): Concrete => concrete(fckDe(b, tipo, pavimento, pilar), gamas(b).c);

/** Aço da posição (padrão: aço da obra), com fyk e fyd (MPa). */
export function acoDe(b: BuildingModel, pos: PosicaoAco): { aco: Aco; fyk: number; fyd: number } {
  // montagem e pele seguem a positiva enquanto não tiverem aço próprio (N2e, K1.6.6); as escadas (E4d, C8.57) seguem as lajes
  const aco = b.norma.acoPos?.[pos] ?? ((pos === 'vigaMontagem' || pos === 'vigaPele') ? b.norma.acoPos?.vigaPos : undefined) ?? (pos === 'escadaInf' ? b.norma.acoPos?.lajeInf : pos === 'escadaSup' ? b.norma.acoPos?.lajeSup : undefined) ?? b.norma.aco, fyk = aco === 'CA-60' ? 600 : 500;
  return { aco, fyk, fyd: fyk / gamas(b).s };
}

/** Cobrimentos (m) por face: padrão o do tipo de elemento; faces e elemento podem mudar. */
export function cobrimentoViga(b: BuildingModel, cob?: number) {
  const base = cob ?? b.norma.cobrimento.viga, f = b.norma.cobFaces ?? {};
  return { inf: (f.vigaInf ?? base) / 100, sup: (f.vigaSup ?? base) / 100, lat: (f.vigaLat ?? base) / 100 };
}
export function cobrimentoLaje(b: BuildingModel, cob?: number) {
  const base = cob ?? b.norma.cobrimento.laje, f = b.norma.cobFaces ?? {};
  return { inf: (f.lajeInf ?? base) / 100, sup: (f.lajeSup ?? base) / 100 };
}
/** Cobrimento das fundações (m): o dos materiais, o das opções das fundações (legado) ou o padrão do módulo (5 cm). */
export const cobrimentoFundacao = (b: BuildingModel) => (b.norma.cobFundacao ? b.norma.cobFundacao / 100 : b.fundacao?.params?.cover ?? COBRIMENTO_FUNDACAO);
/** Padrão do cobrimento das fundações (m), o do módulo Fundações. */
export const COBRIMENTO_FUNDACAO = 0.05;
export const cobrimentoPilar = (b: BuildingModel, cob?: number) => (cob ?? b.norma.cobrimento.pilar) / 100;

/**
 * Comprimento de flambagem do lance por direção (NBR 6118, 15.6): ℓe = mín(ℓ0 + h; ℓ) × α, com ℓ = altura do lance
 * (entre cotas), ℓ0 = ℓ − altura da viga mais alta que chega ao pilar no topo (ou da laje que o contém), h = dimensão
 * do pilar na direção e α = α do pavimento × α do lance na direção (pilar destravado: α > 1).
 * Direção u: deslocamento ao longo de b (eixo x local da seção); v: ao longo de h.
 */
export function flambagemLance(b: BuildingModel, p: Pilar, pavimento: string) {
  const ps = pavimentosOrdenados(b), ip = ps.findIndex((x) => x.id === pavimento);
  const pav = ps[ip], l = pav.cota - baseDoLance(b, p, pavimento);
  const vigas = b.vigas.filter((v) => v.grupo === pav.grupo && vigaTocaPilar(v, p, pavimento));
  const c: [number, number] = [p.x, p.y];
  const hLaje = Math.max(0, ...b.lajes.filter((x) => x.grupo === pav.grupo && dentroPoligono(c, x.contorno)).map((x) => capaLaje(b, x.tipo)));
  const hTopo = vigas.length ? Math.max(...vigas.map((v) => v.secao.h)) : hLaje;
  const l0 = Math.max(0, l - hTopo);
  const [w, h] = dimsSecao(secaoNoLance(p, pavimento));
  const alfa = (pv: string) => {
    const fl = p.flambagem?.find((x) => x.pavimento === pv), aPav = ps.find((x) => x.id === pv)?.alfaFlambagem ?? 1;
    return [aPav * (fl?.au ?? 1), aPav * (fl?.av ?? 1)] as const;
  };
  const [aU, aV] = alfa(pavimento);
  let leU = Math.min(l0 + w, l) * aU, leV = Math.min(l0 + h, l) * aV;
  // travamento intermediário no lance (N2c): o maior trecho entre a base, o apoio e o topo
  const apoio = p.apoiosIntermediarios?.find((x) => x.pavimento === pavimento && x.altura > 0 && x.altura < l);
  if (apoio) {
    const t = Math.max(apoio.altura, l - apoio.altura);
    if (apoio.direcao !== 'v') leU = Math.min(leU, t * aU);
    if (apoio.direcao !== 'u') leV = Math.min(leV, t * aV);
  }
  // lances desligados (N2c, K1.9.13): cadeia de lances sem travamento no topo, por direção; ℓe = máx(αi) × Σ ℓi
  const desligados: [number, number] = [1, 1];
  if (opcoesEmUso(b.opcoes, perfilDe(b)).pilarLancesDesligados) {
    const ls = lancesDoPilar(b, p), k = ls.findIndex((x) => x.id === pavimento);
    const trav = ls.map((x) => travamentoNoTopo(b, p, x.id));
    for (const d of [0, 1] as const) {
      let s = k, e = k;
      while (s > 0 && !trav[s - 1][d]) s--;
      while (e < ls.length - 1 && !trav[e][d]) e++;
      if (s === e) continue;
      const soma = ls[e].cota - baseDoLance(b, p, ls[s].id), aMax = Math.max(...ls.slice(s, e + 1).map((x) => alfa(x.id)[d]));
      desligados[d] = e - s + 1;
      if (d === 0) leU = soma * aMax; else leV = soma * aMax;
    }
  }
  return { l, l0, hTopo, leU, leV, aU, aV, desligados, ...(apoio ? { apoio: apoio.altura } : {}) };
}

/** Cota da base do lance: o pavimento de baixo, a fundação ou a cota própria do pé do pilar (N2c). */
export function baseDoLance(b: BuildingModel, p: Pilar, pavimento: string): number {
  const ps = pavimentosOrdenados(b), ip = ps.findIndex((x) => x.id === pavimento);
  if (ip > 0) return ps[ip - 1].cota;
  return p.nasce === 'fundacao' && p.cotaBase !== undefined ? p.cotaBase : cotaFundacao(b);
}

/**
 * Travamento do pilar no topo do lance (pavimento dado), por direção [u, v]: laje junto ao pilar (trava as duas) ou viga
 * que chega ao pilar com o eixo a menos de 45° da direção.
 */
export function travamentoNoTopo(b: BuildingModel, p: Pilar, pavimento: string): [boolean, boolean] {
  const pav = b.pavimentos.find((x) => x.id === pavimento);
  if (!pav) return [true, true];
  const [w, h] = dimsSecao(secaoNoLance(p, pavimento)), r = Math.hypot(w, h) / 2 + 0.02, c: [number, number] = [p.x, p.y];
  const perto = (cont: [number, number][]) => dentroPoligono(c, cont) || cont.some((a, i) => distSeg(c, a, cont[(i + 1) % cont.length]) <= r);
  if (b.lajes.some((x) => x.grupo === pav.grupo && perto(x.contorno))) return [true, true];
  const a = (p.angulo * Math.PI) / 180, u: [number, number] = [Math.cos(a), Math.sin(a)], v: [number, number] = [-Math.sin(a), Math.cos(a)];
  const out: [boolean, boolean] = [false, false];
  for (const vg of b.vigas) {
    if (vg.grupo !== pav.grupo || !vigaTocaPilar(vg, p, pavimento)) continue;
    // trecho da viga mais próximo do pilar
    let best = Infinity, dir: [number, number] = [1, 0];
    for (let i = 0; i + 1 < vg.pontos.length; i++) {
      const d = distSeg(c, vg.pontos[i], vg.pontos[i + 1]);
      if (d < best) { best = d; const L = Math.hypot(vg.pontos[i + 1][0] - vg.pontos[i][0], vg.pontos[i + 1][1] - vg.pontos[i][1]) || 1; dir = [(vg.pontos[i + 1][0] - vg.pontos[i][0]) / L, (vg.pontos[i + 1][1] - vg.pontos[i][1]) / L]; }
    }
    if (Math.abs(dir[0] * u[0] + dir[1] * u[1]) >= Math.SQRT1_2 - 1e-9) out[0] = true;
    if (Math.abs(dir[0] * v[0] + dir[1] * v[1]) >= Math.SQRT1_2 - 1e-9) out[1] = true;
  }
  return out;
}

function distSeg(p: [number, number], a: [number, number], z: [number, number]) {
  const dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy;
  const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

