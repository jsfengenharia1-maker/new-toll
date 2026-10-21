// Materiais, coeficientes de segurança, cobrimentos e flambagem do edifício (frente N1b).
// Padrão pela NBR 6118; cada valor é editável na obra (norma.*) e, onde o manual de referência permite, por elemento.
import { concrete, type Concrete } from '../concrete';
import { gamaCDoControle } from './acoes';
import { cotaFundacao, pavimentosOrdenados, secaoNoLance, dimsSecao, type BuildingModel, type Norma, type Pilar } from './types';
import { vigaTocaPilar } from './vigas';
import { dentroPoligono } from '../geom/faces';

export type Aco = Norma['aco'];
/** Tipos de elemento com concreto próprio (fundacao = sapatas e blocos do edifício). */
export type TipoElemento = 'laje' | 'viga' | 'pilar' | 'fundacao';
/** Posições de armadura com aço próprio (as que o dimensionamento calcula). */
export type PosicaoAco = 'pilarLong' | 'pilarEstribo' | 'vigaPos' | 'vigaNeg' | 'vigaEstribo' | 'lajeInf' | 'lajeSup' | 'fundacao';
export const POSICOES_ACO: { k: PosicaoAco; rotulo: string }[] = [
  { k: 'pilarLong', rotulo: 'Pilares: longitudinal' }, { k: 'pilarEstribo', rotulo: 'Pilares: estribos' },
  { k: 'vigaPos', rotulo: 'Vigas: positiva (inferior)' }, { k: 'vigaNeg', rotulo: 'Vigas: negativa (superior)' }, { k: 'vigaEstribo', rotulo: 'Vigas: estribos' },
  { k: 'lajeInf', rotulo: 'Lajes: inferior' }, { k: 'lajeSup', rotulo: 'Lajes: superior' },
  { k: 'fundacao', rotulo: 'Fundações (sapatas, blocos, tubulões)' },
];

/** γ padrão (NBR 6118, Tabelas 11.1 e 12.1, combinações normais). */
export const GAMAS_PADRAO = { c: 1.4, s: 1.15, g: 1.4, q: 1.4, h: 1.4 };
/** γ em uso: o padrão (γc pelo nível de controle de execução; h = empuxo de terra) e o que a obra alterou. */
export const gamas = (b: BuildingModel) => ({ ...GAMAS_PADRAO, c: gamaCDoControle(b.norma.controle), ...b.norma.gamas });

/**
 * fck (MPa) do tipo de elemento; nos pilares, o do lance que chega ao pavimento quando informado. Fundação: o dos
 * materiais, o das opções das fundações (arquivos anteriores) ou o da obra.
 */
export function fckDe(b: BuildingModel, tipo: TipoElemento, pavimento?: string): number {
  if (tipo === 'pilar' && pavimento) { const f = b.norma.fckPilarPav?.find((x) => x.pavimento === pavimento)?.fck; if (f) return f; }
  if (tipo === 'fundacao') return b.norma.fckElem?.fundacao ?? b.fundacao?.params?.fckFound ?? b.norma.fck;
  return b.norma.fckElem?.[tipo] ?? b.norma.fck;
}

/** Concreto de um elemento com o γc da obra. */
export const concretoDe = (b: BuildingModel, tipo: TipoElemento, pavimento?: string): Concrete => concrete(fckDe(b, tipo, pavimento), gamas(b).c);

/** Aço da posição (padrão: aço da obra), com fyk e fyd (MPa). */
export function acoDe(b: BuildingModel, pos: PosicaoAco): { aco: Aco; fyk: number; fyd: number } {
  const aco = b.norma.acoPos?.[pos] ?? b.norma.aco, fyk = aco === 'CA-60' ? 600 : 500;
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
  const pav = ps[ip], abaixo = ip > 0 ? ps[ip - 1].cota : cotaFundacao(b);
  const l = pav.cota - abaixo;
  const vigas = b.vigas.filter((v) => v.grupo === pav.grupo && vigaTocaPilar(v, p, pavimento));
  const c: [number, number] = [p.x, p.y];
  const hLaje = Math.max(0, ...b.lajes.filter((x) => x.grupo === pav.grupo && dentroPoligono(c, x.contorno)).map((x) => (x.tipo.tipo === 'macica' ? x.tipo.h : x.tipo.capa)));
  const hTopo = vigas.length ? Math.max(...vigas.map((v) => v.secao.h)) : hLaje;
  const l0 = Math.max(0, l - hTopo);
  const [w, h] = dimsSecao(secaoNoLance(p, pavimento));
  const fl = p.flambagem?.find((x) => x.pavimento === pavimento), aPav = pav.alfaFlambagem ?? 1;
  const aU = aPav * (fl?.au ?? 1), aV = aPav * (fl?.av ?? 1);
  return { l, l0, hTopo, leU: Math.min(l0 + w, l) * aU, leV: Math.min(l0 + h, l) * aV, aU, aV };
}

