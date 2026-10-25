// Memória detalhada (MD fase 6): escadas, armadura e detalhamento de cada lance (E4d). Chamada por `armarLance` só com a memória
// ligada, com os mesmos números do cálculo; os intermediários que a armadura não guarda (elemento determinante de cada faixa,
// linha neutra, lb) vêm das mesmas funções determinísticas. O elemento da memória é "Escada E1 · Lance 1" (ver `escadasCalculo.ts`).
import { barArea, beamFlexure, blockForce, type BeamSection, type Concrete } from '../concrete';
import { ganchoNoventa } from '../building/detalhamento';
import type { AncoragemEscada, BarraEscada, FaixaEscada } from '../building/escadasArmadura';
import type { ElementoEscada } from '../building/escadasCalculo';
import { vcLaje } from '../building/puncao';
import { vrd1 } from '../building/vigotas';
import { woodArmer } from '../building/woodArmer';
import { fm, fp, type PassoMemoria, type Registrador, type ValorMemoria } from './registrador';
import { flexao } from './vigaConcreto';

const NBR = 'NBR 6118:2023';
type Chave = Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>;
/** Passo sem os campos de posição (etapa, elemento e tópico vêm do chamador). */
export type PassoSemChave = Omit<PassoMemoria, 'id' | 'etapa' | 'elemento' | 'topico' | 'resultado'> & { resultado: ValorMemoria };

// ---------------------------------------------------------------- base

export interface BaseEscadaMem {
  c: Concrete; h: number; cobI: number; cobS: number; dI: number; dS: number; folga: number;
  fydI: number; fydS: number; acoI: string; acoS: string;
  fg: number; fq: number; psi1: number; psi2: number;
  taxa: number; taxaUsuario: boolean; amin: number; wkLim: number; wkUsuario: boolean; caa: number;
}

/** Materiais, alturas úteis, armadura mínima e combinações de um lance. */
export function registrarEscadaBase(mem: Registrador, el: string, x: BaseEscadaMem) {
  const c = x.c, gc = c.fck / c.fcd;
  const D = (topico: string, p: Chave) => mem.passo({ etapa: 'dimensionamento', elemento: el, topico, ...p });
  const tm = 'Materiais e geometria';
  D(tm, { descricao: 'Resistência de cálculo do concreto', formula: 'fcd = fck / γc', expressao: `fcd = ${fm(c.fck)} / ${fm(gc)} = ${fm(c.fcd)}`, resultado: c.fcd, unidade: 'MPa', norma: `${NBR}, 12.3.3`, entradas: { fck: c.fck, gc } });
  D(tm, { descricao: 'Tensão do bloco retangular', formula: 'σcd = αc·ηc·fcd', expressao: `σcd = ${fm(c.sigmaCd / c.fcd)}·${fm(c.fcd)} = ${fm(c.sigmaCd)}`, resultado: c.sigmaCd, unidade: 'MPa', norma: `${NBR}, 17.2.2`, aConfirmar: c.fck > 40, entradas: { fcd: c.fcd, fator: c.sigmaCd / c.fcd } });
  D(tm, { descricao: 'Resistência média e de cálculo à tração', formula: 'fct,m = 0,3·fck^(2/3); fctd = 0,7·fct,m / γc', expressao: `fct,m = ${fm(c.fctm)}; fctd = 0,7·${fm(c.fctm)} / ${fm(gc)} = ${fm(c.fctd)}`, resultado: c.fctd, unidade: 'MPa', norma: `${NBR}, 8.2.5`, entradas: { fctm: c.fctm, gc } });
  D(tm, { descricao: `Resistência de cálculo do aço da armadura inferior (${x.acoI})`, formula: 'fyd = fyk / γs', expressao: `fyd = ${fm(x.fydI)} MPa`, resultado: x.fydI, unidade: 'MPa', norma: `${NBR}, 12.3.3`, entradas: {} });
  D(tm, { descricao: `Resistência de cálculo do aço da armadura superior (${x.acoS})`, formula: 'fyd = fyk / γs', expressao: `fyd = ${fm(x.fydS)} MPa`, resultado: x.fydS, unidade: 'MPa', norma: `${NBR}, 12.3.3`, entradas: {} });
  D(tm, { descricao: 'Altura útil da armadura inferior (φ10 de referência, como nas lajes)', formula: 'd = h − c_inf − 5 mm', expressao: `d = ${fm(x.h)} − ${fm(x.cobI)} − ${fm(x.folga)} = ${fm(x.dI)}`, resultado: x.dI, unidade: 'm', norma: `${NBR}, 7.4.7.6`, entradas: { h: x.h, cob: x.cobI, folga: x.folga } });
  D(tm, { descricao: 'Altura útil da armadura superior', formula: 'd = h − c_sup − 5 mm', expressao: `d = ${fm(x.h)} − ${fm(x.cobS)} − ${fm(x.folga)} = ${fm(x.dS)}`, resultado: x.dS, unidade: 'm', norma: `${NBR}, 7.4.7.6`, entradas: { h: x.h, cob: x.cobS, folga: x.folga } });
  D(tm, { descricao: 'Armadura mínima de flexão por metro (taxa das lajes)', formula: 'As,mín = ρmín·h', expressao: `As,mín = ${fm(x.taxa)}·${fm(x.h)}·10⁴ = ${fm(x.amin)} cm²/m`, resultado: x.amin, unidade: 'cm²/m', norma: `${NBR}, 19.3.3.2 (Tabela 19.1)`, aConfirmar: !x.taxaUsuario, entradas: { rho: x.taxa, h: x.h }, observacao: x.taxaUsuario ? 'Taxa mínima informada nas opções.' : 'ρmín = 0,15 %; a variação com o fck segue a confirmar.' });
  D(tm, { descricao: `Limite de abertura de fissuras${x.wkUsuario ? ' (informado nas opções)' : ' da classe de agressividade'}`, formula: 'wk,lim', expressao: `wk,lim = ${fm(x.wkLim)} mm`, resultado: x.wkLim, unidade: 'mm', norma: `${NBR}, 13.4.2 (Tabela 13.4)`, entradas: { caa: x.caa } });
  mem.passo({ etapa: 'combinacoes', elemento: el, topico: 'Combinações', descricao: 'Combinações do lance (só G e Q): ELU γg·G + γq·Q e γg·G (a sobrecarga pode aliviar); frequente G + ψ1·Q (fissuração); quase permanente G + ψ2·Q (flecha)', formula: 'Fd = γg·G + γq·Q; Fser,freq = G + ψ1·Q; Fser,qp = G + ψ2·Q', expressao: `γg = ${fm(x.fg)}; γq = ${fm(x.fq)}; ψ1 = ${fm(x.psi1)}; ψ2 = ${fm(x.psi2)}`, resultado: x.fg, unidade: '', norma: 'NBR 8681:2003, 5.1.3; NBR 6118:2023, 11.8', entradas: { gg: x.fg, gq: x.fq, psi1: x.psi1, psi2: x.psi2 } });
}

// ---------------------------------------------------------------- esforços por faixa

/** Índice (em `els`) do elemento que dá o máximo de cada grandeza de cada faixa (−1: nenhum). Preenchido por `armarLance` só com a memória ligada. */
export interface DetEsforcosEscada {
  inf: [number[], number[]]; sup: [number[], number[]]; V: number[];
  /** Momentos de serviço (combinação frequente) das armaduras inferior x, inferior y e superior x. */
  kInf: [number[], number[]]; kSup: number[];
}
export const novoDetEsforcos = (nb: number): DetEsforcosEscada => {
  const v = () => Array.from({ length: nb }, () => -1);
  return { inf: [v(), v()], sup: [v(), v()], V: v(), kInf: [v(), v()], kSup: v() };
};

const DIR = ['x (sentido do trecho)', 'y (transversal)'] as const;
const lado = (face: 'inf' | 'sup') => (face === 'inf' ? 'inferior' : 'superior');

/** Entre as combinações [fq, 0] da sobrecarga, a que dá o maior valor da grandeza (a primeira no empate, como no cálculo). */
function melhorF(fs: number[], valor: (f: number) => number): { f: number; v: number } {
  let b = { f: fs[0], v: valor(fs[0]) };
  for (const f of fs.slice(1)) { const v = valor(f); if (v > b.v) b = { f, v }; }
  return b;
}
const wa = (e: Pick<ElementoEscada, 'G' | 'Q'>, fg: number, f: number) => woodArmer(fg * e.G[3] + f * e.Q[3], fg * e.G[4] + f * e.Q[4], fg * e.G[5] + f * e.Q[5]);
const entMom = (e: ElementoEscada, fg: number, f: number): Record<string, ValorMemoria> => ({ Gmx: e.G[3], Gmy: e.G[4], Gmxy: e.G[5], Qmx: e.Q[3], Qmy: e.Q[4], Qmxy: e.Q[5], fg, f, cx: e.centro[0], cy: e.centro[1] });

export interface EsforcosTrecho {
  chave: string; faixas: FaixaEscada[]; els: ElementoEscada[]; fg: number; fq: number; psi1: number;
  det: DetEsforcosEscada;
  /** Momentos de serviço máximos usados na fissuração: inferior x, inferior y, superior x (kN·m/m). */
  mk: [number, number, number];
}

/** Momentos de cálculo (Wood-Armer do elemento determinante), cortante por faixa e momentos de serviço. */
export function registrarEsforcosTrecho(mem: Registrador, el: string, x: EsforcosTrecho) {
  const { chave, faixas, els, fg, fq, psi1, det } = x;
  const E = (topico: string, p: Chave) => mem.passo({ etapa: 'esforcos', elemento: el, topico, ...p });
  const tp = `Esforços do trecho ${chave}`;
  const nb = faixas.length;
  E(tp, { descricao: `Divisão do trecho ${chave} em faixas ao longo do vão (≈ 0,6 m, no máximo 8); a necessidade de cada faixa é o máximo dos elementos de casca cujo centroide cai nela`, formula: 'nf = máx(1; mín(8; arred(L/0,6))); w = L/nf', expressao: `nf = ${nb}; w = ${fm(faixas[0].u1 - faixas[0].u0)} m`, resultado: nb, unidade: '', norma: 'Critério do programa', entradas: { nf: nb, w: faixas[0].u1 - faixas[0].u0, L: faixas[nb - 1].u1 } });
  for (let k = 0; k < nb; k++) {
    const f = faixas[k];
    for (const face of ['inf', 'sup'] as const) for (const i of [0, 1] as const) {
      const valor = face === 'inf' ? f.mInf[i] : f.mSup[i], idx = det[face][i][k];
      if (!(valor > 0) || idx < 0) continue;
      const e = els[idx], b = melhorF([fq, 0], (q) => { const w = wa(e, fg, q); return face === 'inf' ? w.inf[i] : -w.sup[i]; });
      const mx = fg * e.G[3] + b.f * e.Q[3], my = fg * e.G[4] + b.f * e.Q[4], mxy = fg * e.G[5] + b.f * e.Q[5];
      E(tp, { descricao: `Faixa ${k + 1} (u = ${fm(f.u0)} a ${fm(f.u1)} m): momento de cálculo da armadura ${lado(face)} na direção ${DIR[i]}; Wood-Armer do elemento determinante (centroide ${fm(e.centro[0])}; ${fm(e.centro[1])}), combinação ${b.f === 0 ? 'γg·G (sem sobrecarga)' : 'γg·G + γq·Q'}`, formula: `mx = γg·Gmx + f·Qmx; my = γg·Gmy + f·Qmy; mxy = γg·Gmxy + f·Qmxy; M* = Wood-Armer(mx, my, mxy)`, expressao: `mx = ${fm(fg)}·${fp(e.G[3])} + ${fm(b.f)}·${fp(e.Q[3])} = ${fm(mx)}; my = ${fm(my)}; mxy = ${fm(mxy)} → M*${face === 'inf' ? 'inf' : 'sup'},${i === 0 ? 'x' : 'y'} = ${fm(valor)} kN·m/m`, resultado: valor, unidade: 'kN·m/m', norma: `${NBR}, 14.7.4 (momentos fletores e volventes em lajes)`, entradas: { faixa: k + 1, u0: f.u0, u1: f.u1, ...entMom(e, fg, b.f) } });
    }
    if (f.V > 0 && det.V[k] >= 0) {
      const e = els[det.V[k]], b = melhorF([fq, 0], (q) => Math.hypot(fg * e.G[6] + q * e.Q[6], fg * e.G[7] + q * e.Q[7]));
      const vx = fg * e.G[6] + b.f * e.Q[6], vy = fg * e.G[7] + b.f * e.Q[7];
      E(tp, { descricao: `Faixa ${k + 1}: cortante de cálculo (módulo do vetor Qx, Qy do elemento determinante)`, formula: 'V = √[(γg·Gqx + f·Qqx)² + (γg·Gqy + f·Qqy)²]', expressao: `V = √(${fp(vx)}² + ${fp(vy)}²) = ${fm(f.V)} kN/m`, resultado: f.V, unidade: 'kN/m', norma: `${NBR}, 19.4`, entradas: { faixa: k + 1, Gqx: e.G[6], Gqy: e.G[7], Qqx: e.Q[6], Qqy: e.Q[7], fg, f: b.f } });
    }
  }
  // ---- serviço (combinação frequente): máximo do trecho
  const serv: [string, number[], number, number, 'inf' | 'sup', 0 | 1][] = [
    ['armadura inferior, direção x', det.kInf[0], x.mk[0], 0, 'inf', 0], ['armadura inferior, direção y', det.kInf[1], x.mk[1], 1, 'inf', 1], ['armadura superior, direção x', det.kSup, x.mk[2], 2, 'sup', 0],
  ];
  for (const [rot, idxs, valor, , face, i] of serv) {
    if (!(valor > 0)) continue;
    let kmax = -1, vmax = 0;
    idxs.forEach((ix, k) => { if (ix < 0) return; const e = els[ix], b = melhorF([psi1, 0], (q) => { const w = wa(e, 1, q); return face === 'inf' ? w.inf[i] : -w.sup[i]; }); if (b.v > vmax) { vmax = b.v; kmax = k; } });
    if (kmax < 0) continue;
    const e = els[idxs[kmax]], b = melhorF([psi1, 0], (q) => { const w = wa(e, 1, q); return face === 'inf' ? w.inf[i] : -w.sup[i]; });
    E(tp, { descricao: `Momento de serviço da ${rot} (combinação frequente, Wood-Armer; faixa ${kmax + 1}): usado na abertura de fissuras do trecho`, formula: 'mx = Gmx + ψ1·Qmx (idem my, mxy); Mk = Wood-Armer(mx, my, mxy)', expressao: `mx = ${fp(e.G[3])} + ${fm(b.f)}·${fp(e.Q[3])}; … → Mk = ${fm(valor)} kN·m/m`, resultado: valor, unidade: 'kN·m/m', norma: `${NBR}, 11.8.3.2 e 17.3.3.2`, entradas: { faixa: kmax + 1, ...entMom(e, 1, b.f) } });
  }
}

// ---------------------------------------------------------------- flexão por faixa

export interface FlexaoTrecho {
  chave: string; c: Concrete; h: number; dI: number; dS: number; fydI: number; fydS: number; amin: number;
  faixas: FaixaEscada[];
  /** Área de flexão (cm²/m) de cada faixa, antes dos mínimos: inferior [x, y] e superior [x, y]. */
  flex: { inf: [number, number]; sup: [number, number] }[];
}

/** Flexão de cada faixa (faixa de 1 m, bloco retangular), regra dos mínimos e cadeia completa na faixa de maior momento de cada direção. */
export function registrarFlexaoTrecho(mem: Registrador, el: string, x: FlexaoTrecho) {
  const { chave, c, h, faixas } = x, nb = faixas.length;
  const sec: BeamSection = { kind: 'rect', bw: 1, h };
  const D = (topico: string, p: Chave) => mem.passo({ etapa: 'dimensionamento', elemento: el, topico, ...p });
  const fk = { c, sec, taxaMin: 0, b: 1, h };
  for (const face of ['inf', 'sup'] as const) for (const i of [0, 1] as const) {
    const d = face === 'inf' ? x.dI : x.dS, fyd = face === 'inf' ? x.fydI : x.fydS, tp = `Flexão – trecho ${chave}, armadura ${lado(face)}, direção ${i === 0 ? 'x' : 'y'}`;
    const Ms = faixas.map((f) => (face === 'inf' ? f.mInf[i] : f.mSup[i]));
    const kmax = Ms.reduce((m, v, k) => (v > Ms[m] ? k : m), 0);
    for (let k = 0; k < nb; k++) {
      const M = Ms[k];
      if (!(M > 1e-9)) continue;
      const As = x.flex[k][face][i], r = beamFlexure(sec, false, M, d, 0.02, c, fyd), C = blockForce(sec, false, r.x, c).C;
      const ent: Record<string, ValorMemoria> = { faixa: k + 1, Md: M, d, fyd, sigmaCd: c.sigmaCd, lambda: c.lambda, b: 1, x: r.x, C, duplo: r.double ? 1 : 0 };
      if (r.double) { const Mlim = C * (d - (c.lambda * r.x) / 2); ent.dM = M / 1000 - Mlim; ent.d2 = 0.02; ent.As2 = r.As2; }
      D(tp, { descricao: `Faixa ${k + 1}: armadura de flexão por metro (faixa de 1 m; bloco retangular, linha neutra pelo equilíbrio Md = σcd·b·λx·(d − λx/2))${r.double ? '; armadura dupla com x = x,lim (a parcela de compressão soma-se à área)' : ''}`, formula: r.double ? 'As = C/fyd + ΔM/[fyd·(d − d′)] + As′' : 'As = σcd·b·λ·x / fyd', expressao: `x = ${fm(r.x)} m; C = ${fm(C * 1000)} kN; As = ${fm(As)} cm²/m`, resultado: As, unidade: 'cm²/m', norma: `${NBR}, 17.2.2`, entradas: ent });
      if (face === 'inf' && i === 0) D(tp, { descricao: `Faixa ${k + 1}: armadura inferior na direção x com o mínimo`, formula: 'As = máx(As,mín; As,flexão)', expressao: `As = máx(${fm(x.amin)}; ${fm(As)}) = ${fm(faixas[k].AsInf[0])} cm²/m`, resultado: faixas[k].AsInf[0], unidade: 'cm²/m', norma: `${NBR}, 17.3.5.2`, entradas: { faixa: k + 1, amin: x.amin, AsFlexao: As } });
      if (face === 'sup') D(tp, { descricao: `Faixa ${k + 1}: armadura superior na direção ${i === 0 ? 'x' : 'y'}; abaixo do mínimo a face superior não leva armadura de flexão`, formula: 'As = As,flexão se As,flexão > As,mín; senão 0', expressao: `As = ${fm(faixas[k].AsSup[i])} cm²/m (As,flexão = ${fm(As)}; As,mín = ${fm(x.amin)})`, resultado: faixas[k].AsSup[i], unidade: 'cm²/m', norma: `${NBR}, 17.3.5.2`, entradas: { faixa: k + 1, amin: x.amin, AsFlexao: As } });
    }
    if (face === 'inf' && i === 0) for (let k = 0; k < nb; k++) if (!(Ms[k] > 1e-9)) D(tp, { descricao: `Faixa ${k + 1}: sem momento; armadura inferior na direção x = mínima`, formula: 'As = As,mín', expressao: `As = ${fm(x.amin)} cm²/m`, resultado: faixas[k].AsInf[0], unidade: 'cm²/m', norma: `${NBR}, 17.3.5.2`, entradas: { faixa: k + 1, amin: x.amin, AsFlexao: 0 } });
    if (Ms[kmax] > 1e-9) flexao(mem, el, `${tp} – faixa de maior momento (faixa ${kmax + 1}): cadeia completa`, fk, Ms[kmax], d, 0.02, fyd, false, 0, face === 'inf', { un: 'kN·m/m', semMinimo: true });
  }
}

// ---------------------------------------------------------------- cortante

export interface CortanteMem { chave: string; c: Concrete; h: number; dI: number; AsEf: number; VSd: number; VRd1: number; VRd2: number; Asw: number; fywd: number; comArmadura: boolean; ok: boolean }

/** Cortante sem armadura transversal (19.4.1) e, se preciso, com armadura (19.4.2), com a armadura inferior efetiva. */
export function registrarCortanteTrecho(mem: Registrador, el: string, x: CortanteMem) {
  const c = x.c, d = x.dI, tp = `Cortante – trecho ${x.chave}`;
  const P = (p: Chave) => mem.passo({ etapa: 'dimensionamento', elemento: el, topico: tp, ...p });
  const rho = Math.min(0.02, x.AsEf / 1e4 / d), k = Math.max(1, 1.6 - d);
  P({ descricao: 'Taxa de armadura de flexão tracionada (armadura inferior efetiva da direção do trecho)', formula: 'ρ1 = mín(0,02; As,ef/(b·d))', expressao: `ρ1 = mín(0,02; ${fm(x.AsEf)}·10⁻⁴/(1·${fm(d)})) = ${fm(rho)}`, resultado: rho, unidade: '', norma: `${NBR}, 19.4.1`, entradas: { AsEf: x.AsEf, d } });
  P({ descricao: 'Resistência sem armadura transversal', formula: 'VRd1 = 0,25·fctd·k·(1,2 + 40·ρ1)·bw·d; k = máx(1; 1,6 − d)', expressao: `VRd1 = 0,25·${fm(c.fctd)}·${fm(k)}·(1,2 + 40·${fm(rho)})·1·${fm(d)}·1000 = ${fm(x.VRd1)} kN/m`, resultado: x.VRd1, unidade: 'kN/m', norma: `${NBR}, 19.4.1`, entradas: { fctd: c.fctd, k, rho, d } });
  P({ descricao: 'Resistência da biela comprimida por metro de largura', formula: 'VRd2 = 0,27·αv2·fcd·bw·d', expressao: `VRd2 = 0,27·${fm(c.av2)}·${fm(c.fcd)}·1·${fm(d)}·1000 = ${fm(x.VRd2)} kN/m`, resultado: x.VRd2, unidade: 'kN/m', norma: `${NBR}, 19.4.2`, entradas: { av2: c.av2, fcd: c.fcd, d } });
  P({ descricao: 'Cortante solicitante do trecho (maior das faixas) e verificação', formula: 'VSd ≤ VRd1 dispensa armadura transversal', expressao: `VSd = ${fm(x.VSd)} kN/m ${x.VSd <= x.VRd1 + 1e-9 ? '≤' : '>'} VRd1 = ${fm(x.VRd1)} kN/m`, resultado: x.VSd, unidade: 'kN/m', norma: `${NBR}, 19.4.1`, entradas: { VSd: x.VSd, VRd1: x.VRd1, VRd2: x.VRd2, h: x.h } });
  if (x.VSd <= x.VRd1 + 1e-9 || !x.comArmadura) return;
  if (x.VSd > x.VRd2 || x.h < 0.15 - 1e-9) {
    P({ descricao: x.VSd > x.VRd2 ? 'VSd > VRd2: a biela comprimida não atende; aumente a espessura ou o fck' : 'VSd > VRd1 e h < 15 cm: a laje não leva armadura transversal; aumente a espessura ou o fck', formula: 'VSd ≤ VRd2; armadura transversal só para h ≥ 15 cm', expressao: `VSd = ${fm(x.VSd)} kN/m`, resultado: x.VSd, unidade: 'kN/m', norma: `${NBR}, 19.4.2`, entradas: { VRd2: x.VRd2, h: x.h } });
    return;
  }
  const vc = vcLaje(c, x.h, d, rho);
  P({ descricao: 'Parcela do concreto com armadura transversal: VRd1 até h = 15 cm e 0,6·fctd·d a partir de 35 cm (interpolação linear)', formula: 'Vc = VRd1 (h ≤ 15 cm); Vc = 0,6·fctd·d·1000 (h ≥ 35 cm); linear entre eles', expressao: `Vc = ${fm(vc)} kN/m`, resultado: vc, unidade: 'kN/m', norma: `${NBR}, 19.4.2`, aConfirmar: true, entradas: { h: x.h, VRd1: vrd1(c, 1, d, rho * d), V0: 0.6 * c.fctd * d * 1000 } });
  P({ descricao: 'Armadura transversal necessária', formula: 'Asw = (VSd − Vc) / (0,9·d·fywd)', expressao: `Asw = (${fm(x.VSd)} − ${fm(vc)})·10⁴/(0,9·${fm(d)}·${fm(x.fywd)}·1000) = ${fm(x.Asw)} cm²/m²`, resultado: x.Asw, unidade: 'cm²/m²', norma: `${NBR}, 19.4.2`, entradas: { VSd: x.VSd, Vc: vc, d, fywd: x.fywd } });
}

// ---------------------------------------------------------------- ancoragem

export interface AncoragemMem {
  topico: string; descricao: string; phi: number; c: Concrete; fyd: number; ca60: boolean; lb: number;
  AsCalc: number; AsEf: number; lbNec: number; disponivel: number; cob: number; a: AncoragemEscada;
}

/** Ancoragem de uma barra tracionada no apoio: lb básico, lb necessário, trecho reto disponível e gancho/dobra. */
export function registrarAncoragemEscada(mem: Registrador, el: string, x: AncoragemMem) {
  const { phi, c, topico } = x, f = phi / 1000, P = (p: Chave) => mem.passo({ etapa: 'detalhamento', elemento: el, topico, ...p });
  const eta1 = x.ca60 ? 1.4 : 2.25, eta3 = phi < 32 ? 1 : (132 - phi) / 100, fbd = eta1 * eta3 * c.fctd;
  P({ descricao: `${x.descricao}: comprimento de ancoragem básico (boa aderência) da barra φ${fm(phi)}`, formula: 'lb = máx[(φ/4)·(fyd/fbd); 25φ], fbd = η1·η2·η3·fctd', expressao: `fbd = ${fm(eta1)}·1·${fm(eta3)}·${fm(c.fctd)} = ${fm(fbd)} MPa; lb = máx[(${fm(f)}/4)·(${fm(x.fyd)}/${fm(fbd)}); ${fm(25 * f)}] = ${fm(x.lb)} m`, resultado: x.lb, unidade: 'm', norma: `${NBR}, 9.4.2.4`, entradas: { phi, fyd: x.fyd, fctd: c.fctd, eta1, eta3 } });
  P({ descricao: 'Comprimento de ancoragem necessário (a armadura efetiva é maior que a de cálculo)', formula: 'lb,nec = máx[lb·mín(1; As,calc/As,ef); 0,3·lb; 10φ; 10 cm]', expressao: `lb,nec = máx[${fm(x.lb)}·mín(1; ${fm(x.AsCalc)}/${fm(x.AsEf)}); ${fm(0.3 * x.lb)}; ${fm(10 * f)}; 0,1] = ${fm(x.lbNec)} m`, resultado: x.lbNec, unidade: 'm', norma: `${NBR}, 9.4.2.5`, entradas: { lb: x.lb, AsCalc: x.AsCalc, AsEf: x.AsEf, phi } });
  const a = x.a, g = ganchoNoventa(phi), reto = Math.max(0, x.disponivel - x.cob), lbG = Math.max(0.7 * x.lbNec, 8 * f, 0.06);
  P({ descricao: `Ancoragem no apoio (${a.tipo === 'reta' ? 'reta' : a.tipo === 'gancho' ? 'com gancho de 90°' : 'com dobra (perna prolongada)'}): trecho reto disponível = largura do apoio − cobrimento; reta se cobrir lb,nec; com gancho se cobrir 0,7·lb,nec (≥ 8φ e 6 cm); senão dobra`, formula: 'reto = máx(0; disp − c); gancho = 8φ + π(D + φ)/4 − (D/2 + φ); adicional = embutido + perna', expressao: `reto = máx(0; ${fm(x.disponivel)} − ${fm(x.cob)}) = ${fm(reto)} m; lb,gancho = ${fm(lbG)} m; gancho = ${fm(g)} m → comprimento somado à barra = ${fm(a.adicional)} m (embutido ${fm(a.embutido)}; perna ${fm(a.perna)})`, resultado: a.adicional, unidade: 'm', norma: `${NBR}, 9.4.2.5 e 9.4.2.3`, entradas: { lbNec: x.lbNec, disponivel: x.disponivel, cob: x.cob, phi, tipo: a.tipo, embutido: a.embutido, perna: a.perna } });
}

// ---------------------------------------------------------------- barras e quantitativo

/** Dados geométricos que definem o comprimento de uma barra (para refazer a conta). */
export type PartesBarra = Record<string, number>;

/** Barra adotada: bitola, espaçamento, área efetiva, quantidade e comprimento (com as partes). */
export function registrarBarraEscada(mem: Registrador, el: string, b: BarraEscada, n: PartesBarra, partes: PartesBarra | null) {
  const topico = `Barras – trecho ${b.trecho}`, P = (p: Chave) => mem.passo({ etapa: 'detalhamento', elemento: el, topico, ...p });
  const AsEf = (barArea(b.phi) / b.s) * 1e4;
  const rot = `${b.pos}: ${b.tipo === 'espera' ? 'espera' : b.tipo === 'passador' ? 'passador' : b.tipo === 'negativo' ? 'negativo' : b.tipo === 'principal' ? 'armadura principal' : 'distribuição'} ${b.face === 'inf' ? 'inferior' : 'superior'} ${b.direcao === 'L' ? 'longitudinal' : 'transversal'}`;
  P({ descricao: `${rot}${b.bloqueada ? ' (bloqueada)' : ''}: φ${fm(b.phi)} c/${fm(b.s * 100, 3)} cm; área efetiva por metro contra a necessária de ${fm(b.AsNec)} cm²/m`, formula: 'As,ef = π·φ²/4 / s ≥ As,nec', expressao: `As,ef = π·(${fm(b.phi / 1000)})²/4 / ${fm(b.s)} = ${fm(AsEf)} cm²/m ${AsEf >= b.AsNec - 1e-6 ? '≥' : '<'} ${fm(b.AsNec)}`, resultado: AsEf, unidade: 'cm²/m', norma: `${NBR}, 18.3.2.2 e 20.1`, entradas: { phi: b.phi, s: b.s, AsNec: b.AsNec, bloqueada: b.bloqueada ? 1 : 0 } });
  const modo = n.modo === 1 ? 'across' : 'along';
  P({ descricao: `${b.pos}: quantidade de barras ${modo === 'across' ? '(distribuídas na largura do trecho, descontado o cobrimento lateral nas duas bordas)' : '(distribuídas ao longo da extensão inclinada coberta)'}`, formula: modo === 'across' ? 'n = ⌊(B − 2·c) / s⌋ + 1' : 'n = ⌊ℓ / s⌋ + 1', expressao: modo === 'across' ? `n = ⌊(${fm(n.B)} − 2·${fm(n.cob)}) / ${fm(b.s)}⌋ + 1 = ${b.n}` : `n = ⌊${fm(n.len)} / ${fm(b.s)}⌋ + 1 = ${b.n}`, resultado: b.n, unidade: '', norma: 'Critério do programa', entradas: { ...n, s: b.s } });
  if (partes) {
    const soma = Object.entries(partes).filter(([k]) => k !== 'passo').reduce((t, [, v]) => t + v, 0);
    P({ descricao: `${b.pos}: comprimento da barra (desenvolvimento no trecho + ancoragens, ganchos e dobras), arredondado para cima a ${fm(partes.passo * 100)} cm`, formula: 'ℓ = ⌈Σ partes / passo⌉·passo', expressao: `ℓ = ⌈(${Object.entries(partes).filter(([k]) => k !== 'passo').map(([, v]) => fm(v)).join(' + ')}) / ${fm(partes.passo)}⌉·${fm(partes.passo)} = ${fm(b.comprimento)} m (Σ = ${fm(soma)} m)`, resultado: b.comprimento, unidade: 'm', norma: 'Critério do programa', entradas: { ...partes } });
  } else P({ descricao: `${b.pos}: comprimento da barra`, formula: 'ℓ', expressao: `ℓ = ${fm(b.comprimento)} m`, resultado: b.comprimento, unidade: 'm', entradas: {} });
}

/** Distribuição mínima (20.1) e a necessária por grupo de faixas. */
export function registrarDistribuicaoMin(mem: Registrador, el: string, chave: string, x: { principal: number; pct: number; amin: number; distMin: number; rotulo: string }) {
  mem.passo({ etapa: 'dimensionamento', elemento: el, topico: `Distribuição – trecho ${chave}`, descricao: `Armadura de distribuição mínima sob a armadura principal ${x.rotulo}`, formula: 'As,dist ≥ máx(20 %·As,principal; 0,9 cm²/m; 0,5·As,mín)', expressao: `As,dist = máx(${fm(x.pct / 100)}·${fm(x.principal)}; 0,9; 0,5·${fm(x.amin)}) = ${fm(x.distMin)} cm²/m`, resultado: x.distMin, unidade: 'cm²/m', norma: `${NBR}, 20.1`, entradas: { fracao: x.pct / 100, principal: x.principal, amin: x.amin, minimo: 0.9 } });
}

/** Peso de aço do lance. */
export function registrarPesoEscada(mem: Registrador, el: string, barras: BarraEscada[], peso: number) {
  const ent: Record<string, number> = {};
  barras.forEach((b) => { ent[`n_${b.pos}`] = b.n; ent[`l_${b.pos}`] = b.comprimento; ent[`phi_${b.pos}`] = b.phi; });
  mem.passo({ etapa: 'detalhamento', elemento: el, topico: 'Quantitativo do lance', descricao: 'Peso de aço do lance, sem perdas (aço 7850 kg/m³)', formula: 'P = Σ n·ℓ·π·φ²/4·7850', expressao: `P = ${fm(peso)} kg (${barras.length} posições)`, resultado: peso, unidade: 'kg', norma: 'NBR 7480', entradas: { ...ent, massaEspecifica: 7850 } });
}

