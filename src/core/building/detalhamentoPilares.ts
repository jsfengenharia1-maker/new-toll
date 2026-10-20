// Detalhamento dos pilares (frente R3b, NBR 6118 cap. 9 e 18.4): por pilar, de baixo para cima, barras
// longitudinais por lance com espera na fundação, emendas por traspasse na passagem de um lance ao outro
// (comprimento de ancoragem em boa aderência), união de lances curtos com a mesma armadura, mudança de seção
// por dobra (inclinação ≤ 1:6 dentro do nó) ou por arranque, ancoragem no topo do último lance (reduzida por
// As,calc/As,ef como opção), estribos ao longo do lance e grampos nas barras a mais de 20φt de um canto (18.2.4).
import { barArea } from '../concrete';
import { ganchoNoventa, lbBasico } from './detalhamento';
import type { Dimensionamento, ResultadoPilar } from './dimensionamento';
import { acoDe, cobrimentoPilar, concretoDe } from './materiais';
import type { OpcoesCalculo } from './opcoes';
import { centroPilar, cotaFundacao, dimsSecao, lancesDoPilar, pavimentosOrdenados, secaoNoLance, type BuildingModel, type Pilar } from './types';
import { vigaTocaPilar } from './vigas';

export interface BarraPilar {
  pos: string;
  tipo: 'longitudinal' | 'arranque';
  /** Lances (ids dos pavimentos do topo) que a barra atravessa. */
  lances: string[];
  n: number; phi: number;
  /** Cotas (m) da ponta de baixo e da de cima e ganchos de 90° (base, topo). */
  z0: number; z1: number; ganchos: [boolean, boolean];
  comprimento: number;
}
export interface LanceDetalhe {
  pavimento: string; nome: string; z0: number; z1: number; secao: string;
  /** Passagem para o lance de cima: continua (mesma armadura, sem emenda), emenda, dobra (mudança de seção ≤ 1:6) ou arranque. */
  transicao: 'topo' | 'continua' | 'emenda' | 'dobra' | 'arranque';
  estribos: { phi: number; s: number; n: number; comprimento: number; grampos: number; comprimentoGrampo: number };
}
export interface DetalhePilar {
  pilar: string; nome: string;
  lances: LanceDetalhe[];
  barras: BarraPilar[];
  /** Comprimento de ancoragem básico (m) da bitola de cada lance, boa aderência. */
  lb: Record<string, number>;
  peso: number;
  avisos: string[];
}

const pesoLinear = (phi: number) => barArea(phi) * 7850;
const arred = (x: number, passo: number) => Math.ceil(x / passo - 1e-9) * passo;

/** Barras de um arranjo: total e por face (retangular), para os grampos. */
function contagem(r: ResultadoPilar): { n: number; nb: number; nh: number; circ: boolean } {
  const a = r.arranjo!;
  if (a.n !== undefined) return { n: a.n, nb: 0, nh: 0, circ: true };
  const nb = a.nb ?? 2, nh = a.nh ?? 2;
  return { n: 2 * nb + 2 * (nh - 2), nb, nh, circ: false };
}

/** Grampos por estribo: barras intermediárias de cada face a mais de 20φt do canto mais próximo (NBR 6118, 18.2.4). */
export function gramposPorEstribo(w: number, h: number, a: number, nb: number, nh: number, phiT: number): number {
  const lim = (20 * phiT) / 1000;
  const face = (L: number, n: number) => {
    let k = 0;
    for (let i = 1; i < n - 1; i++) { const x = ((L - 2 * a) * i) / (n - 1); if (Math.min(x, L - 2 * a - x) > lim + 1e-9) k++; }
    return k;
  };
  return 2 * face(w, nb) + 2 * face(h, nh);
}

export function detalharPilar(b: BuildingModel, p: Pilar, res: ResultadoPilar[], op: OpcoesCalculo): DetalhePilar | null {
  const ls = lancesDoPilar(b, p), ps = pavimentosOrdenados(b);
  const rs = ls.map((l) => res.find((r) => r.pilar === p.id && r.pavimentoId === l.id));
  if (!ls.length || rs.some((r) => !r?.arranjo)) return null;
  const c = concretoDe(b, 'pilar'), aL = acoDe(b, 'pilarLong'), cob = cobrimentoPilar(b, p.cobrimento);
  const passo = op.arredondamento / 100, avisos: string[] = [];
  const zBase = (i: number) => { const k = ps.findIndex((x) => x.id === ls[i].id); return k > 0 ? ps[k - 1].cota : cotaFundacao(b); };
  /** Maior altura de viga que chega ao pilar no pavimento (nó), para a dobra, a ancoragem do topo e os estribos no nó. */
  const hNo = (pav: string) => Math.max(0.1, ...b.vigas.filter((v) => ps.find((x) => x.id === pav)?.grupo === v.grupo && vigaTocaPilar(v, p, pav)).map((v) => v.secao.h));
  const lb: Record<string, number> = {};
  const lances: LanceDetalhe[] = [], barras: BarraPilar[] = [];
  let np = 0;
  const igual = (i: number, j: number) => {
    const a = rs[i]!.arranjo!, z = rs[j]!.arranjo!, sa = secaoNoLance(p, ls[i].id), sz = secaoNoLance(p, ls[j].id);
    return a.phi === z.phi && a.n === z.n && a.nb === z.nb && a.nh === z.nh && JSON.stringify(sa) === JSON.stringify(sz);
  };
  // trechos de barras corridas: lances consecutivos iguais unidos enquanto couberem no limite de união
  let i = 0;
  while (i < ls.length) {
    let j = i;
    while (j + 1 < ls.length && igual(j, j + 1) && ps.find((x) => x.id === ls[j + 1].id)!.cota - zBase(i) <= op.pilarUniaoLances + 1e-9) j++;
    const r = rs[i]!, a = r.arranjo!, cnt = contagem(r), phi = a.phi, f = phi / 1000;
    const lbB = lbBasico(phi, c, aL.fyd, true, aL.aco === 'CA-60');
    for (let k = i; k <= j; k++) lb[ls[k].id] = lbB;
    const topo = ps.find((x) => x.id === ls[j].id)!.cota, ultimo = j === ls.length - 1;
    // ponta de baixo: espera na fundação (lb abaixo da base, com gancho) ou já vem do trecho anterior
    let z0 = zBase(i), g0 = false;
    if (i === 0 && p.nasce === 'fundacao') { z0 -= lbB; g0 = true; }
    // ponta de cima: topo do edifício (ancoragem no nó, gancho) ou emenda / arranque para o trecho de cima
    let z1: number, g1 = false, trans: LanceDetalhe['transicao'];
    if (ultimo) {
      const disp = hNo(ls[j].id) - cob, util = Math.min(1, Math.max(0, r.util));
      const nec = Math.max((op.ancoragemReduzidaTopo ? util : 1) * 0.7 * lbB, 0.3 * lbB, 10 * f, 0.1);
      if (nec > disp + 1e-9) avisos.push(`${p.nome}: ancoragem no topo ${(nec * 100).toFixed(0)} cm > ${(disp * 100).toFixed(0)} cm disponíveis no nó (viga ou laje).`);
      z1 = topo - cob; g1 = true; trans = 'topo';
    } else {
      const sA = secaoNoLance(p, ls[j].id), sB = secaoNoLance(p, ls[j + 1].id);
      const [wA, hA] = dimsSecao(sA), [wB, hB] = dimsSecao(sB), cA = centroPilar(p, sA), cB = centroPilar(p, sB);
      const e = Math.hypot(cA[0] - cB[0], cA[1] - cB[1]) + Math.max(Math.abs(wA - wB), Math.abs(hA - hB)) / 2;
      const hv = hNo(ls[j].id);
      if (e < 1e-6) { trans = 'emenda'; z1 = topo + lbB; }
      else if (e / hv <= 1 / 6) { trans = 'dobra'; z1 = topo + lbB; }
      else {
        // arranque: as barras de baixo param no nó com gancho; barras novas ancoradas lb abaixo do topo e emendadas lb acima
        trans = 'arranque'; z1 = topo - cob; g1 = true;
        const rB = rs[j + 1]!, cB2 = contagem(rB), phiB = rB.arranjo!.phi, lbA = lbBasico(phiB, c, aL.fyd, true, aL.aco === 'CA-60');
        const za = topo - lbA, zb = topo + lbA;
        barras.push({ pos: `N${++np}`, tipo: 'arranque', lances: [ls[j].id, ls[j + 1].id], n: cB2.n, phi: phiB, z0: za, z1: zb, ganchos: [false, false], comprimento: arred(zb - za, passo) });
      }
    }
    for (let k = i; k <= j; k++) lances.push({ pavimento: ls[k].id, nome: ls[k].nome, z0: zBase(k), z1: ps.find((x) => x.id === ls[k].id)!.cota, secao: rs[k]!.secao, transicao: k < j ? 'continua' : trans, estribos: estribosDoLance(k) });
    // comprimento máximo: divide com emenda à meia altura do trecho (traspasse = lb)
    const comp = (za: number, zb: number, ga: boolean, gb: boolean) => arred(zb - za + (ga ? ganchoNoventa(phi) : 0) + (gb ? ganchoNoventa(phi) : 0), passo);
    const pecas: [number, number, boolean, boolean][] = [];
    let ini = z0, gi = g0;
    while (comp(ini, z1, gi, g1) > op.pilarBarraMaxima + 1e-9) {
      const corte = ini + op.pilarBarraMaxima - lbB - (gi ? ganchoNoventa(phi) : 0);
      if (corte <= ini + lbB) { avisos.push(`${p.nome}: comprimento máximo de barra ${op.pilarBarraMaxima} m insuficiente para a emenda.`); break; }
      pecas.push([ini, corte + lbB, gi, false]);
      ini = corte; gi = false;
    }
    pecas.push([ini, z1, gi, g1]);
    for (const [za, zb, ga, gb] of pecas) barras.push({ pos: `N${++np}`, tipo: 'longitudinal', lances: ls.slice(i, j + 1).map((x) => x.id), n: cnt.n, phi, z0: za, z1: zb, ganchos: [ga, gb], comprimento: comp(za, zb, ga, gb) });
    i = j + 1;
  }
  function estribosDoLance(k: number): LanceDetalhe['estribos'] {
    const r = rs[k]!, a = r.arranjo!, e = a.estribo, s = secaoNoLance(p, ls[k].id), [w, h] = dimsSecao(s), cnt = contagem(r);
    const z0 = zBase(k), z1 = ps.find((x) => x.id === ls[k].id)!.cota, f = e.phi / 1000;
    const n = Math.floor((z1 - z0 - 0.05) / e.s + 1e-9) + 1; // inclui o nó (estribos na interseção com vigas e lajes)
    const ganchos = 2 * Math.max(5 * f, 0.05) + 2 * ((3 * Math.PI) / 8) * (4 * f);
    const comprimento = arred(s.tipo === 'circ' ? Math.PI * (s.d - 2 * cob) + Math.max(30 * f, 0.1) + ganchos : 2 * (w - 2 * cob) + 2 * (h - 2 * cob) + ganchos, passo);
    const aBar = cob + f + a.phi / 2000;
    const grampos = cnt.circ ? 0 : gramposPorEstribo(w, h, aBar, cnt.nb, cnt.nh, e.phi);
    const comprimentoGrampo = arred(Math.max(w, h) - 2 * cob + 2 * Math.max(5 * f, 0.05) + 2 * ((3 * Math.PI) / 8) * (4 * f), passo);
    return { phi: e.phi, s: e.s, n, comprimento, grampos, comprimentoGrampo };
  }
  const peso = barras.reduce((t, x) => t + x.n * x.comprimento * pesoLinear(x.phi), 0)
    + lances.reduce((t, l) => t + l.estribos.n * (l.estribos.comprimento + l.estribos.grampos * l.estribos.comprimentoGrampo) * pesoLinear(l.estribos.phi), 0);
  return { pilar: p.id, nome: p.nome, lances, barras, lb, peso, avisos };
}

export function detalharPilares(b: BuildingModel, dim: Dimensionamento, op: OpcoesCalculo): DetalhePilar[] {
  const out: DetalhePilar[] = [];
  for (const p of b.pilares) { const d = detalharPilar(b, p, dim.pilares, op); if (d) out.push(d); }
  return out;
}

/** Resumo do aço dos pilares por aço e bitola (kg), com as perdas (%). */
export function resumoAcoPilares(b: BuildingModel, dets: DetalhePilar[], perdas: number): { aco: string; phi: number; comprimento: number; peso: number; pesoComPerdas: number }[] {
  const acoL = acoDe(b, 'pilarLong').aco, acoE = acoDe(b, 'pilarEstribo').aco;
  const m = new Map<string, { aco: string; phi: number; comprimento: number }>();
  const soma = (aco: string, phi: number, len: number) => { const k = `${aco}|${phi}`; const e = m.get(k) ?? { aco, phi, comprimento: 0 }; e.comprimento += len; m.set(k, e); };
  for (const d of dets) {
    for (const x of d.barras) soma(acoL, x.phi, x.n * x.comprimento);
    for (const l of d.lances) soma(acoE, l.estribos.phi, l.estribos.n * (l.estribos.comprimento + l.estribos.grampos * l.estribos.comprimentoGrampo));
  }
  return [...m.values()].sort((a, z) => a.aco.localeCompare(z.aco) || a.phi - z.phi).map((e) => { const peso = e.comprimento * pesoLinear(e.phi); return { ...e, peso, pesoComPerdas: peso * (1 + perdas / 100) }; });
}
