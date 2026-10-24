// Memória detalhada (MD fase 3): lajes nervuradas bidirecionais (cubetas, ábacos, zonas maciças, mesa). Chamada por
// `dimensionarNervuradas` só com a memória ligada, com os mesmos números usados no cálculo; os intermediários que o cálculo
// não guarda (x da linha neutra, σs, w1, w2…) saem das mesmas funções determinísticas (beamFlexure, crackWidth).
import { barArea, beamFlexure, type BeamSection, type Concrete } from '../concrete';
import { fm, type Registrador } from './registrador';
import { flexao, passosFissuracao } from './vigaConcreto';

const NBR = 'NBR 6118:2023';
type Chave = Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>;
const P = (mem: Registrador, el: string, etapa: 'cargas' | 'esforcos' | 'dimensionamento' | 'detalhamento', topico: string, p: Chave) => mem.passo({ etapa, elemento: el, topico, ...p });
const fk = (c: Concrete, sec: BeamSection, h: number, b: number) => ({ c, sec, taxaMin: 0, b, h });

export interface CasoFat { caso: string; f: number }
export interface CtxNervBase {
  nome: string; pavimentos: string; forma: string; recuperavel: boolean;
  h: number; capa: number; hEnch: number; i: [number, number]; bw: [number, number]; pp: number;
  regime: [string, string]; nNervuras: number; nGrupos: number; tabela: string;
  c: Concrete; fydInf: number; fydSup: number; acoInf: string; acoSup: string; fywk: number; fywd: number; gs: number;
  cobInf: number; cobSup: number; dI: number; dS: number; caa: number; wkLim: number;
  elu: CasoFat[]; freq: CasoFat[];
  /** Geometria pedida pela verificação (E3c): mesa mínima (m) e distância livre. */
  capaMin: number;
}

/** Cargas, geometria da forma, regime de cisalhamento, materiais, alturas úteis e fatores de ponderação por caso. */
export function registrarNervuradaBase(mem: Registrador, el: string, x: CtxNervBase) {
  const c = x.c, gc = c.fck / c.fcd, h = x.h;
  P(mem, el, 'cargas', 'Cargas e geometria', { descricao: `Peso próprio médio da laje nervurada ${x.nome} (${x.pavimentos}), ${x.forma} (${x.recuperavel ? 'forma recuperável' : 'forma perdida'})`, formula: 'pp = γc,conc·V_concreto / A (volume de concreto da forma por m², sem as cubetas)', expressao: `pp = ${fm(x.pp)} kN/m²`, resultado: x.pp, unidade: 'kN/m²', norma: 'NBR 6120:2019', entradas: { pp: x.pp }, observacao: 'Os maciços (junto às vigas, zonas manuais e ábacos) entram na carga da grelha pelo seu próprio peso.' });
  P(mem, el, 'cargas', 'Cargas e geometria', { descricao: 'Seção da nervura: altura total, mesa (capa), altura de enchimento, intereixos e larguras das nervuras (direção 0; direção 1)', formula: 'h = capa + hEnch; seção T com mesa = intereixo', expressao: `h = ${fm(h)} = ${fm(x.capa)} + ${fm(x.hEnch)} m; intereixo ${fm(x.i[0])} × ${fm(x.i[1])} m; bw ${fm(x.bw[0])} × ${fm(x.bw[1])} m`, resultado: h, unidade: 'm', norma: `${NBR}, 13.2.4.2`, entradas: { h, capa: x.capa, hEnch: x.hEnch, i0: x.i[0], i1: x.i[1], bw0: x.bw[0], bw1: x.bw[1] } });
  const livre: [number, number] = [x.i[1] - x.bw[1], x.i[0] - x.bw[0]];
  P(mem, el, 'cargas', 'Cargas e geometria', { descricao: 'Espessura mínima da mesa (distância livre entre nervuras/15 e o mínimo das opções)', formula: 'hf,mín = máx(ℓ0,livre/15; mín. das opções)', expressao: `ℓ0,livre = ${fm(Math.max(...livre))} m → hf,mín = ${fm(x.capaMin)} m; hf = ${fm(x.capa)} m ${x.capa >= x.capaMin - 1e-9 ? '≥' : '<'} hf,mín`, resultado: x.capaMin, unidade: 'm', norma: `${NBR}, 13.2.4.2`, entradas: { livre0: livre[0], livre1: livre[1], capa: x.capa, capaMin: x.capaMin } });
  for (const k of [0, 1] as const) {
    const i = x.i[k], bw = x.bw[k];
    P(mem, el, 'cargas', 'Cargas e geometria', { descricao: `Regime de cisalhamento e da mesa na direção ${k}, pelo intereixo`, formula: 'i ≤ 65 cm: laje; i ≤ 90 cm e bw ≥ 12 cm: laje; i ≤ 110 cm: viga; acima: mesa como laje maciça sobre grelha de vigas', expressao: `i = ${fm(i * 100)} cm; bw = ${fm(bw * 100)} cm → ${x.regime[k]}`, resultado: x.regime[k], unidade: '', norma: `${NBR}, 13.2.4.2 e 19.4.1`, entradas: { i, bw } });
  }
  const tm = 'Materiais e alturas úteis';
  P(mem, el, 'dimensionamento', tm, { descricao: 'Resistência de cálculo do concreto', formula: 'fcd = fck / γc', expressao: `fcd = ${fm(c.fck)} / ${fm(gc)} = ${fm(c.fcd)}`, resultado: c.fcd, unidade: 'MPa', norma: `${NBR}, 12.3.3`, entradas: { fck: c.fck, gc } });
  P(mem, el, 'dimensionamento', tm, { descricao: 'Tensão do bloco retangular', formula: 'σcd = αc·ηc·fcd', expressao: `σcd = ${fm(c.sigmaCd / c.fcd)}·${fm(c.fcd)} = ${fm(c.sigmaCd)}`, resultado: c.sigmaCd, unidade: 'MPa', norma: `${NBR}, 17.2.2`, aConfirmar: c.fck > 40, entradas: { fcd: c.fcd, razao: c.sigmaCd / c.fcd } });
  P(mem, el, 'dimensionamento', tm, { descricao: 'Resistência de cálculo à tração', formula: 'fctd = 0,7·fct,m / γc', expressao: `fctd = 0,7·${fm(c.fctm)} / ${fm(gc)} = ${fm(c.fctd)}`, resultado: c.fctd, unidade: 'MPa', norma: `${NBR}, 8.2.5 e 12.3.3`, entradas: { fctm: c.fctm, gc } });
  P(mem, el, 'dimensionamento', tm, { descricao: `Resistência de cálculo do aço da armadura inferior (${x.acoInf})`, formula: 'fyd = fyk / γs', expressao: `fyd = ${fm(x.fydInf)} MPa`, resultado: x.fydInf, unidade: 'MPa', norma: `${NBR}, 12.3.3`, entradas: {} });
  P(mem, el, 'dimensionamento', tm, { descricao: `Resistência de cálculo do aço da armadura superior (${x.acoSup})`, formula: 'fyd = fyk / γs', expressao: `fyd = ${fm(x.fydSup)} MPa`, resultado: x.fydSup, unidade: 'MPa', norma: `${NBR}, 12.3.3`, entradas: {} });
  P(mem, el, 'dimensionamento', tm, { descricao: 'Resistência de cálculo dos estribos', formula: 'fywd = mín(fywk / γs; 435 MPa)', expressao: `fywd = mín(${fm(x.fywk)} / ${fm(x.gs)}; 435) = ${fm(x.fywd)}`, resultado: x.fywd, unidade: 'MPa', norma: `${NBR}, 17.4.2.2`, entradas: { fywk: x.fywk, gs: x.gs } });
  P(mem, el, 'dimensionamento', tm, { descricao: 'Altura útil da armadura inferior (estribo + metade da barra: 1 cm de referência)', formula: 'd = h − c_inf − 0,01', expressao: `d = ${fm(h)} − ${fm(x.cobInf)} − 0,01 = ${fm(x.dI)}`, resultado: x.dI, unidade: 'm', norma: `${NBR}, 7.4.7.6`, entradas: { h, cinf: x.cobInf } });
  P(mem, el, 'dimensionamento', tm, { descricao: 'Altura útil da armadura superior', formula: 'd = h − c_sup − 0,01', expressao: `d = ${fm(h)} − ${fm(x.cobSup)} − 0,01 = ${fm(x.dS)}`, resultado: x.dS, unidade: 'm', norma: `${NBR}, 7.4.7.6`, entradas: { h, csup: x.cobSup } });
  const ent = (f: CasoFat[], pre: string) => Object.fromEntries(f.map((q) => [`${pre}_${q.caso}`, q.f]));
  P(mem, el, 'esforcos', 'Fatores de ponderação', { descricao: 'Fatores ELU por caso (esforços das nervuras, mesa e zonas maciças)', formula: 'γi por caso de carga', expressao: x.elu.map((q) => `${q.caso}: ${fm(q.f)}`).join('; ') || '—', resultado: 'ELU', unidade: '', norma: 'NBR 8681:2003, 5.1.3', entradas: ent(x.elu, 'γ') });
  P(mem, el, 'esforcos', 'Fatores de ponderação', { descricao: `Fatores da combinação frequente por caso (fissuração, ψ1 das variáveis; limite wk = ${fm(x.wkLim)} mm, CAA ${x.caa})`, formula: 'G: 1; Q: ψ1', expressao: x.freq.map((q) => `${q.caso}: ${fm(q.f)}`).join('; ') || '—', resultado: 'frequente', unidade: '', norma: `${NBR}, 11.8.3.2`, entradas: { ...ent(x.freq, 'ψ'), wkLim: x.wkLim } });
}

export interface CtxNervEsforcos {
  nome: string; L: number; mPos: number; mNeg: [number, number]; V: number;
  grupo: number; nGrupo: number; gMPos: number; gMPosF: number; gMNeg: [number, number]; gMNegF: [number, number]; igualacao: number;
}
/** Esforços de cálculo da nervura (envoltória dos pavimentos) e uniformização no grupo. */
export function registrarNervuraEsforcos(mem: Registrador, el: string, x: CtxNervEsforcos) {
  const tp = `Nervura ${x.nome} – esforços`;
  P(mem, el, 'esforcos', tp, { descricao: `Esforços da nervura ${x.nome} (L = ${fm(x.L)} m): máximos nas estações da grelha, combinados por Σ γi·Sk e agrupados por sobreposição das faixas adjacentes`, formula: 'M+ = máx Mmax; M−(ponta) = Mmin na ponta; Vmax = máx |V|', expressao: `M+ = ${fm(x.mPos)}; M− = ${fm(x.mNeg[0])} / ${fm(x.mNeg[1])} kN·m; Vmax = ${fm(x.V)} kN (por nervura)`, resultado: x.mPos, unidade: 'kN·m', norma: 'NBR 8681:2003', entradas: { L: x.L, mPos: x.mPos, mNeg0: x.mNeg[0], mNeg1: x.mNeg[1], Vmax: x.V }, observacao: 'Valores combinados com os fatores ELU da seção "Fatores de ponderação"; a decomposição por caso não é registrada nas nervuras (a envoltória usa o máximo entre estações e pavimentos).' });
  P(mem, el, 'esforcos', tp, { descricao: `Uniformização: grupo ${x.grupo + 1} (${x.nGrupo} nervura(s) da mesma direção com momentos próximos, diferença ≤ ${fm(x.igualacao)} %): esforços de cálculo do grupo`, formula: 'M+,d = máx(M+ do grupo); M−,d = mín(M− do grupo); M+,freq = máx(M+ freq.)', expressao: `M+,d = ${fm(x.gMPos)} kN·m; M−,d = ${fm(x.gMNeg[0])} / ${fm(x.gMNeg[1])} kN·m; M+,freq = ${fm(x.gMPosF)} kN·m; M−,freq = ${fm(x.gMNegF[0])} / ${fm(x.gMNegF[1])} kN·m`, resultado: x.gMPos, unidade: 'kN·m', entradas: { n: x.nGrupo, mPos: x.gMPos, mPosF: x.gMPosF, mNeg0: x.gMNeg[0], mNeg1: x.gMNeg[1], mNegF0: x.gMNegF[0], mNegF1: x.gMNegF[1] } });
}

export interface EscBarras { n: number; phi: number; As: number; cabe: boolean; need: number }
const barraTxt = (b: { n: number; phi: number } | null) => (b ? `${b.n}φ${fm(b.phi)}` : '—');

/** Passos do cálculo da largura mínima (n barras em uma camada) e da escolha da combinação. */
function passosEscolha(mem: Registrador, el: string, tp: string, nec: number, bw: number, cob: number, esc: EscBarras | null, face: string) {
  if (!esc) { P(mem, el, 'dimensionamento', tp, { descricao: `Barras da armadura ${face}: nenhuma combinação até 6φ25 cobre ${fm(nec)} cm²`, formula: 'combinações n·φ (n ≤ 6; φ6,3 a φ25)', expressao: `As,nec = ${fm(nec)} cm² > 6φ25`, resultado: 'sem solução', unidade: '', entradas: { AsNec: nec } }); return; }
  const nd = esc.n, ph = esc.phi, esp = Math.max(0.02, ph / 1000, 1.2 * 0.019);
  P(mem, el, 'dimensionamento', tp, { descricao: `Barras adotadas na armadura ${face} (menor área que cobre o necessário e cabe na nervura)`, formula: 'As,ef = n·π·φ²/4 ≥ As,nec', expressao: `${barraTxt(esc)}: As,ef = ${fm(esc.As)} cm² ≥ ${fm(nec)} cm²`, resultado: esc.As, unidade: 'cm²', norma: `${NBR}, 18.3.2.2`, entradas: { AsNec: nec, n: nd, phi: ph } });
  P(mem, el, 'detalhamento', tp, { descricao: `Largura mínima da nervura para ${barraTxt(esc)} em uma camada (estribo φ5, cobrimento ${fm(cob * 100)} cm, espaçamento livre máx(2 cm; φ; 1,2·dmáx))`, formula: 'bw,mín = 2·(c + φt) + n·φ + (n − 1)·ah', expressao: `bw,mín = 2·(${fm(cob)} + 0,005) + ${nd}·${fm(ph / 1000)} + ${nd - 1}·${fm(esp)} = ${fm(esc.need)} m ${esc.cabe ? '≤' : '>'} bw = ${fm(bw)} m`, resultado: esc.need, unidade: 'm', norma: `${NBR}, 18.3.2.2`, entradas: { cob, phiEst: 5, n: nd, phi: ph, dmax: 0.019, bw } });
}

export interface CtxNervPositiva {
  nome: string; sec: BeamSection; c: Concrete; fyd: number; dI: number; cobInf: number; bw: number; bf: number; h: number; capa: number; hEnch: number;
  mPos: number; fl: { As: number; double: boolean }; AsMin: number; AsNec0: number;
  conc: { n: number; m: number; recebe: boolean } | null; AsNec: number;
  base: { n: number; phi: number; As: number } | null; falta: number; esc: EscBarras | null;
  fiss: { executada: boolean; mPosF: number; fatorC: number; iteracoes: number; As: number; phi: number; w: number; wkLim: number; caa: 1 | 2 | 3 | 4 } | null;
  total: number; Mu: number; comp: number;
}
/** Flexão positiva em T da nervura: linha neutra, As, mínimo, concentração, base, barras, fissuração, momento último. */
export function registrarNervuraPositiva(mem: Registrador, el: string, x: CtxNervPositiva) {
  const tp = `Nervura ${x.nome} – flexão positiva`;
  const AsMinTxt = `0,0015·(${fm(x.bf)}·${fm(x.capa)} + ${fm(x.bw)}·${fm(x.hEnch)})`;
  if (x.mPos > 0.01) flexao(mem, el, tp, fk(x.c, x.sec, x.h, x.bw), x.mPos, x.dI, 0.03, x.fyd, true, x.fl.As, true, { semMinimo: true });
  P(mem, el, 'dimensionamento', tp, { descricao: 'Armadura mínima da nervura (0,15 % da seção T: mesa + alma)', formula: 'As,mín = 0,0015·(bf·hf + bw·hEnch)', expressao: `As,mín = ${AsMinTxt}·10⁴ = ${fm(x.AsMin)} cm²`, resultado: x.AsMin, unidade: 'cm²', norma: `${NBR}, 17.3.5.2.1`, aConfirmar: true, entradas: { bf: x.bf, hf: x.capa, bw: x.bw, hEnch: x.hEnch }, observacao: 'Taxa 0,15 % da seção T (critério do programa).' });
  P(mem, el, 'dimensionamento', tp, { descricao: x.mPos > 0.01 ? 'Armadura necessária da nervura' : 'Armadura necessária da nervura (sem momento positivo: nula)', formula: 'As,nec = máx(As,flexão; As,mín) (0 se M+ ≤ 0,01 kN·m)', expressao: `As,nec = máx(${fm(x.fl.As * 1e4)}; ${fm(x.AsMin)}) = ${fm(x.AsNec0)} cm²`, resultado: x.AsNec0, unidade: 'cm²', norma: `${NBR}, 17.3.5.2`, entradas: { AsFlexao: x.fl.As * 1e4, AsMin: x.AsMin, M: x.mPos } });
  if (x.conc) P(mem, el, 'dimensionamento', tp, { descricao: `Concentração da armadura do grupo nas nervuras indicadas (${x.conc.m} de ${x.conc.n}): esta nervura ${x.conc.recebe ? 'recebe' : 'cede e fica com o mínimo'}`, formula: x.conc.recebe ? 'As = máx(As,mín; (n·As,nec − (n − m)·As,mín)/m)' : 'As = As,mín', expressao: `As = ${fm(x.AsNec)} cm²`, resultado: x.AsNec, unidade: 'cm²', norma: 'Critério do programa (E5g)', aConfirmar: true, entradas: { n: x.conc.n, m: x.conc.m, AsNec0: x.AsNec0, AsMin: x.AsMin, recebe: x.conc.recebe ? 1 : 0 } });
  const tp2 = tp;
  if (x.base) P(mem, el, 'dimensionamento', tp2, { descricao: `Armadura base considerada no cálculo (${barraTxt(x.base)} corridas)`, formula: 'As,falta = máx(0; As,nec − As,base)', expressao: `As,falta = máx(0; ${fm(x.AsNec)} − ${fm(x.base.As)}) = ${fm(x.falta)} cm²`, resultado: x.falta, unidade: 'cm²', entradas: { AsNec: x.AsNec, AsBase: x.base.As, falta: x.falta } });
  else P(mem, el, 'dimensionamento', tp2, { descricao: 'Sem armadura base considerada: a armadura de reforço cobre toda a necessária', formula: 'As,falta = As,nec', expressao: `As,falta = ${fm(x.falta)} cm²`, resultado: x.falta, unidade: 'cm²', entradas: { AsNec: x.AsNec, AsBase: 0, falta: x.falta } });
  passosEscolha(mem, el, tp, x.falta, x.bw, x.cobInf, x.esc, 'inferior (reforço)');
  const f = x.fiss;
  if (f?.executada) {
    P(mem, el, 'dimensionamento', tp, { descricao: `Fissuração (combinação frequente, seção T, momento positivo): ${f.iteracoes} aumento(s) de 10 % na armadura de reforço até wk ≤ limite`, formula: 'req ← 1,1·req até wk ≤ wk,lim (no máximo 30 passos); M = M+,freq·(As,nec/As,nec0)', expressao: `M+,freq·fator = ${fm(f.mPosF)}·${fm(f.fatorC)} = ${fm(f.mPosF * f.fatorC)} kN·m; As,tot = ${fm(f.As * 1e4)} cm²; φ = ${fm(f.phi)} mm`, resultado: f.iteracoes, unidade: 'passos', norma: `${NBR}, 17.3.3.2`, entradas: { iteracoes: f.iteracoes, mPosF: f.mPosF, fatorC: f.fatorC, As: f.As, phi: f.phi } });
    passosFissuracao(mem, el, tp, { sec: x.sec, fc: true, As: f.As, phi: f.phi, d: x.dI, Mk: f.mPosF * f.fatorC, c: x.c, caa: f.caa, h: x.h, b: x.bw, wkLim: f.wkLim, wk: f.w });
  }
  P(mem, el, 'dimensionamento', tp, { descricao: 'Armadura inferior total da nervura (base + reforço) e momento último da seção T', formula: 'As,tot = As,base + As,reforço; Mu = C·(d − z) com x limitado a x,lim', expressao: `As,tot = ${fm(x.total)} cm²; Mu = ${fm(x.Mu)} kN·m`, resultado: x.Mu, unidade: 'kN·m', norma: `${NBR}, 17.2.2`, entradas: { AsTot: x.total, Mu: x.Mu, sigmaCd: x.c.sigmaCd, bf: x.bf, hf: x.capa, bw: x.bw, d: x.dI, fyd: x.fyd, lambda: x.c.lambda, xLimRatio: x.c.xLimRatio } });
  P(mem, el, 'detalhamento', tp, { descricao: 'Comprimento da armadura inferior (vão + 2·máx(10 cm; φ), arredondado)', formula: 'C = ⌈L + 2·máx(0,1; φ)⌉', expressao: `C = ${fm(x.comp)} m`, resultado: x.comp, unidade: 'm', entradas: { C: x.comp } });
}

export interface CtxNervNegativa {
  nome: string; ponta: 0 | 1; Mneg: number; macica: boolean; bw: number; bwEf: number; bf: number; h: number; dS: number; c: Concrete; fyd: number;
  fn: { As: number; double: boolean }; AsMinN0: number; AsN0: number; AsN: number; conc: { n: number; m: number; recebe: boolean } | null;
  bs: EscBarras | null; AsFinal: number; cobSup: number;
  fiss: { MF: number; fator: number; iteracoes: number; As: number; phi: number; w: number; wkLim: number; caa: 1 | 2 | 3 | 4 } | null;
  ext: number; comp: number; L: number; arred: number;
}
/** Flexão negativa da nervura em cada ponta (retângulo; maciça no apoio = largura do intereixo), fissuração e comprimento. */
export function registrarNervuraNegativa(mem: Registrador, el: string, x: CtxNervNegativa) {
  const tp = `Nervura ${x.nome} – negativo na ponta ${x.ponta ? 'final' : 'inicial'}`, sec: BeamSection = { kind: 'rect', bw: x.bwEf, h: x.h };
  P(mem, el, 'dimensionamento', tp, { descricao: `Seção do momento negativo: ${x.macica ? 'ponta dentro de zona maciça (largura = intereixo)' : 'nervura (largura = bw)'}`, formula: 'bw,ef = bw (nervura) ou intereixo (maciça)', expressao: `bw,ef = ${fm(x.bwEf)} m`, resultado: x.bwEf, unidade: 'm', entradas: { bw: x.bw, intereixo: x.bf, macica: x.macica ? 1 : 0 } });
  flexao(mem, el, tp, fk(x.c, sec, x.h, x.bwEf), -x.Mneg, x.dS, 0.03, x.fyd, false, x.fn.As, false, { semMinimo: true });
  P(mem, el, 'dimensionamento', tp, { descricao: 'Armadura mínima da própria nervura (0,15 % de bw·h) e necessária', formula: 'As,mín = 0,0015·bw·h; As = máx(As,flexão; As,mín)', expressao: `As,mín = 0,0015·${fm(x.bw)}·${fm(x.h)}·10⁴ = ${fm(x.AsMinN0)} cm²; As = máx(${fm(x.fn.As * 1e4)}; ${fm(x.AsMinN0)}) = ${fm(x.AsN0)} cm²`, resultado: x.AsN0, unidade: 'cm²', norma: `${NBR}, 17.3.5.2.1`, aConfirmar: true, entradas: { bw: x.bw, h: x.h, AsFlexao: x.fn.As * 1e4, AsMin: x.AsMinN0 } });
  if (x.conc) P(mem, el, 'dimensionamento', tp, { descricao: `Concentração da armadura do grupo (${x.conc.m} de ${x.conc.n}): esta nervura ${x.conc.recebe ? 'recebe' : 'cede e fica com o mínimo'}`, formula: x.conc.recebe ? 'As = máx(As,mín; (n·As − (n − m)·As,mín)/m)' : 'As = As,mín', expressao: `As = ${fm(x.AsN)} cm²`, resultado: x.AsN, unidade: 'cm²', norma: 'Critério do programa (E5g)', aConfirmar: true, entradas: { n: x.conc.n, m: x.conc.m, AsN0: x.AsN0, AsMin: x.AsMinN0, recebe: x.conc.recebe ? 1 : 0 } });
  passosEscolha(mem, el, tp, x.AsN, x.bwEf, x.cobSup, x.bs, 'superior');
  const f = x.fiss;
  if (f) {
    P(mem, el, 'dimensionamento', tp, { descricao: `Fissuração do negativo (combinação frequente, retângulo, face superior): ${f.iteracoes} aumento(s) de 10 % na armadura`, formula: 'As ← 1,1·As até wk ≤ wk,lim (no máximo 30 passos); M = M−,freq·(As/As0)', expressao: `M−,freq·fator = ${fm(f.MF)}·${fm(f.fator)} = ${fm(f.MF * f.fator)} kN·m; As,ef = ${fm(f.As * 1e4)} cm²; φ = ${fm(f.phi)} mm`, resultado: f.iteracoes, unidade: 'passos', norma: `${NBR}, 17.3.3.2`, entradas: { iteracoes: f.iteracoes, MF: f.MF, fator: f.fator, As: f.As, phi: f.phi } });
    passosFissuracao(mem, el, tp, { sec, fc: false, As: f.As, phi: f.phi, d: x.dS, Mk: f.MF * f.fator, c: x.c, caa: f.caa, h: x.h, b: x.bwEf, wkLim: f.wkLim, wk: f.w });
  }
  const phi = x.bs?.phi ?? 10;
  P(mem, el, 'detalhamento', tp, { descricao: 'Comprimento da armadura negativa: ponto de momento nulo mais a decalagem e a ancoragem (máx(d; 12φ)), arredondado e limitado ao vão', formula: 'C = mín(L; ⌈ext + máx(d; 12φ)⌉)', expressao: `C = mín(${fm(x.L)}; ⌈${fm(x.ext)} + máx(${fm(x.dS)}; ${fm(12 * phi / 1000)})⌉) = ${fm(x.comp)} m`, resultado: x.comp, unidade: 'm', norma: `${NBR}, 18.3.2.3`, entradas: { L: x.L, ext: x.ext, d: x.dS, phi, arred: x.arred } });
}

export interface CtxNervAbaco {
  nome: string; abaco: string; x0: number; x1: number; hAb: number; dAb: number; bf: number; bw: number; h: number; dS: number; c: Concrete; fydSup: number; fydBorda: number;
  Mneg: number; Mb: number; fn: { As: number; double: boolean } | null; fb: { As: number; double: boolean } | null; AsMinN: number; AsBase: number; AsNec: number; AsBorda: number; AsRef: number;
  bsel: EscBarras | null; cobSup: number; regiao: [number, number]; phiB: number; comp: number; arred: number;
  AsTop: number; VRd1: number; VRd2: number; Vab: number; estribo: { phi: number; s: number; barras: number } | null; shear: { VRd2: number; Vc: number; aswS: number; aswMin: number; smax: number } | null; fywd: number;
}
/** Trecho da nervura sobre o ábaco: negativo na banda maciça, reforço, borda do ábaco, comprimento e cortante da banda. */
export function registrarNervuraAbaco(mem: Registrador, el: string, x: CtxNervAbaco) {
  const tp = `Nervura ${x.nome} – ábaco ${x.abaco}`, M = -x.Mneg;
  P(mem, el, 'esforcos', tp, { descricao: `Trecho de ${fm(x.x0)} a ${fm(x.x1)} m dentro do ábaco: maior momento negativo (banda maciça de largura = intereixo e altura ${fm(x.hAb)} m) e na borda do ábaco`, formula: 'M = −mín(M−) no trecho; Mb = −mín(M− nas bordas do ábaco)', expressao: `M = ${fm(M)}; Mb = ${fm(x.Mb)} kN·m por banda`, resultado: M, unidade: 'kN·m', entradas: { Mneg: x.Mneg, Mb: x.Mb, x0: x.x0, x1: x.x1 } });
  if (x.fn) flexao(mem, el, tp, fk(x.c, { kind: 'rect', bw: x.bf, h: x.hAb }, x.hAb, x.bf), M, x.dAb, 0.03, x.fydSup, false, x.fn.As, false, { semMinimo: true });
  if (x.fb) flexao(mem, el, `${tp} – borda`, fk(x.c, { kind: 'rect', bw: x.bw, h: x.h }, x.h, x.bw), x.Mb, x.dS, 0.03, x.fydBorda, false, x.fb.As, false, { semMinimo: true });
  P(mem, el, 'dimensionamento', tp, { descricao: 'Armadura negativa necessária no ábaco (descontada a base do ábaco) e na borda; reforço = máx(As − base; As,borda)', formula: 'As = máx(As,flexão; As,mín); As,ref = máx(0; As − As,base; As,borda)', expressao: `As = ${fm(x.AsNec)}; As,base = ${fm(x.AsBase)}; As,borda = ${fm(x.AsBorda)} → As,ref = ${fm(x.AsRef)} cm²`, resultado: x.AsRef, unidade: 'cm²', norma: `${NBR}, 17.3.5.2`, aConfirmar: true, entradas: { AsFlexao: x.fn ? x.fn.As * 1e4 : 0, AsMin: x.AsMinN, AsBase: x.AsBase, AsFlexaoBorda: x.fb ? x.fb.As * 1e4 : 0, hasBanda: x.fn ? 1 : 0, hasBorda: x.fb ? 1 : 0 } });
  passosEscolha(mem, el, tp, x.AsRef, x.bw, x.cobSup, x.bsel, 'superior do reforço sobre o ábaco');
  P(mem, el, 'detalhamento', tp, { descricao: 'Comprimento do reforço: região de momento negativo contínuo mais duas vezes máx(d; 12φ), arredondado e limitado ao vão', formula: 'C = ⌈x1 − x0 + 2·máx(d; 12φ)⌉', expressao: `C = ⌈${fm(x.regiao[1] - x.regiao[0])} + 2·máx(${fm(x.dS)}; ${fm(12 * x.phiB / 1000)})⌉ = ${fm(x.comp)} m`, resultado: x.comp, unidade: 'm', entradas: { r0: x.regiao[0], r1: x.regiao[1], d: x.dS, phi: x.phiB, arred: x.arred } });
  const k1 = Math.max(1, 1.6 - x.dAb), rho = Math.min(0.02, x.AsTop / 1e4 / (x.bf * x.dAb));
  P(mem, el, 'dimensionamento', tp, { descricao: 'Cortante da banda maciça: VRd1 (sem estribo) e VRd2 (biela), largura = intereixo, altura do ábaco', formula: 'VRd1 = 0,25·fctd·k·(1,2 + 40ρ1)·b·d; VRd2 = 0,27·αv2·fcd·b·d', expressao: `ρ1 = ${fm(rho)}; k = ${fm(k1)}; VRd1 = ${fm(x.VRd1)} kN; VRd2 = ${fm(x.VRd2)} kN; Vsd = ${fm(x.Vab)} kN`, resultado: x.VRd1, unidade: 'kN', norma: `${NBR}, 19.4.1`, entradas: { fctd: x.c.fctd, fcd: x.c.fcd, av2: x.c.av2, b: x.bf, d: x.dAb, AsTop: x.AsTop / 1e4, VRd2: x.VRd2, Vsd: x.Vab } });
  if (x.shear && x.estribo) P(mem, el, 'dimensionamento', tp, { descricao: 'Estribos da banda maciça (modelo I, VRd1 < Vsd ≤ VRd2)', formula: 'Vc = 0,6·fctd·b·d; Asw/s = máx(Asw,mín; (Vsd − Vc)/(0,9·d·fywd)); s ≤ 0,75d', expressao: `Vc = ${fm(x.shear.Vc)} kN; Asw/s = ${fm(x.shear.aswS * 1e4)} cm²/m → φ${fm(x.estribo.phi)} c/${fm(x.estribo.s * 100)} (${x.estribo.barras} barras)`, resultado: x.estribo.s, unidade: 'm', norma: `${NBR}, 17.4.2.2`, entradas: { Vsd: x.Vab, Vc: x.shear.Vc, aswS: x.shear.aswS, aswMin: x.shear.aswMin, smax: x.shear.smax, d: x.dAb, fywd: x.fywd, phi: x.estribo.phi, s: x.estribo.s } });
}

export interface SecCort { x: number; V: number; VRd: number; estribo: boolean; solido?: boolean }
export interface CtxNervCortante {
  nome: string; regime: string; c: Concrete; bw: number; d: number; AsTot: number; passo: number; dist: number; L: number;
  VRd1: number; VRd2: number; secoes: SecCort[]; Vnec: number; Vmax: number; VmaxRib: number;
  shear: { VRd2: number; Vc: number; aswS: number; aswMin: number; smax: number; ok: boolean; temEstribo: boolean } | null;
  estribo: { phi: number; s: number; barras: number } | null; zonas: [number, number][]; fywd: number; ok: boolean;
}
/** Cortante da nervura a cada `dist·d` (19.4.1): VRd1, VRd2, necessidade de estribo por seção, modelo I e zonas. */
export function registrarNervuraCortante(mem: Registrador, el: string, x: CtxNervCortante) {
  const tp = `Nervura ${x.nome} – cortante`;
  const k = Math.max(1, 1.6 - x.d), rho = Math.min(0.02, x.AsTot / 1e4 / (x.bw * x.d));
  P(mem, el, 'dimensionamento', tp, { descricao: `Resistência sem armadura transversal (19.4.1), nervura de ${fm(x.bw * 100)} cm, ρ1 com a armadura inferior total (${fm(x.AsTot)} cm²)`, formula: 'VRd1 = τRd·k·(1,2 + 40ρ1)·bw·d; τRd = 0,25·fctd; k = máx(1; 1,6 − d); ρ1 = As/(bw·d) ≤ 0,02', expressao: `VRd1 = 0,25·${fm(x.c.fctd)}·${fm(k)}·(1,2 + 40·${fm(rho)})·${fm(x.bw)}·${fm(x.d)}·1000 = ${fm(x.VRd1)} kN`, resultado: x.VRd1, unidade: 'kN', norma: `${NBR}, 19.4.1`, entradas: { fctd: x.c.fctd, k, rho, bw: x.bw, d: x.d, AsTot: x.AsTot / 1e4 } });
  P(mem, el, 'dimensionamento', tp, { descricao: 'Resistência da biela comprimida (modelo I)', formula: 'VRd2 = 0,27·αv2·fcd·bw·d', expressao: `VRd2 = 0,27·${fm(x.c.av2)}·${fm(x.c.fcd)}·${fm(x.bw)}·${fm(x.d)}·1000 = ${fm(x.VRd2)} kN`, resultado: x.VRd2, unidade: 'kN', norma: `${NBR}, 17.4.2.2`, entradas: { av2: x.c.av2, fcd: x.c.fcd, bw: x.bw, d: x.d } });
  const ent: Record<string, number | string> = { regime: x.regime, passo: x.passo, VRd1: x.VRd1, nSecoes: x.secoes.length };
  x.secoes.forEach((s, j) => { ent[`x_${j}`] = s.x; ent[`V_${j}`] = s.V; ent[`VRd_${j}`] = s.VRd; ent[`estribo_${j}`] = s.estribo ? 1 : 0; ent[`solido_${j}`] = s.solido ? 1 : 0; });
  P(mem, el, 'dimensionamento', tp, { descricao: `Seções de verificação a cada ${fm(x.dist)}·d = ${fm(x.passo)} m (V máximo da janela); regime "${x.regime}": ${x.regime === 'laje' ? 'estribo só onde V > VRd1' : 'estribos sempre (nervura como viga)'}; seção dentro de ábaco é maciça (sem estribo da nervura)`, formula: 'estribo(j) = V_j > VRd1 (laje) ou verdadeiro (viga)', expressao: x.secoes.map((s) => `x=${fm(s.x)}: V=${fm(s.V)}${s.solido ? ' (maciço)' : s.estribo ? ' → estribo' : ''}`).slice(0, 12).join('; ') + (x.secoes.length > 12 ? '…' : ''), resultado: x.Vnec, unidade: 'kN', norma: `${NBR}, 19.4.1`, entradas: ent });
  if (x.shear) {
    const sh = x.shear;
    P(mem, el, 'dimensionamento', tp, { descricao: 'Estribos pelo modelo I para o maior cortante que exige armadura (e, como viga, o maior da nervura fora dos ábacos)', formula: 'Vc = 0,6·fctd·bw·d; Asw/s = máx(0,2·fct,m/fywk·bw; (Vsd − Vc)/(0,9·d·fywd)); smax = 0,6d (≤ 30 cm) se Vsd ≤ 0,67VRd2, senão 0,3d (≤ 20 cm)', expressao: `Vsd = ${fm(Math.max(x.Vnec, x.VmaxRib))} kN; Vc = ${fm(sh.Vc)} kN; Asw/s = ${fm(sh.aswS * 1e4)} cm²/m; smax = ${fm(sh.smax)} m ${sh.ok ? '' : '(Vsd > VRd2: biela não atende)'}${x.estribo ? ` → φ${fm(x.estribo.phi)} c/${fm(x.estribo.s * 100)}, ${x.estribo.barras} barras em ${x.zonas.length} zona(s)` : ''}`, resultado: x.estribo ? x.estribo.s : 0, unidade: 'm', norma: `${NBR}, 17.4.2.2`, entradas: { Vsd: Math.max(x.Vnec, x.VmaxRib), Vc: sh.Vc, VRd2: sh.VRd2, aswS: sh.aswS, aswMin: sh.aswMin, smax: sh.smax, passo: x.passo, d: x.d, bw: x.bw, fywd: x.fywd, phi: x.estribo?.phi ?? 0, s: x.estribo?.s ?? 0, barras: x.estribo?.barras ?? 0 } });
  } else P(mem, el, 'dimensionamento', tp, { descricao: 'Cortante atendido pelo concreto: sem estribos', formula: 'Vsd ≤ VRd1', expressao: `Vmax = ${fm(x.Vmax)} kN ≤ VRd1 = ${fm(x.VRd1)} kN`, resultado: x.Vmax, unidade: 'kN', norma: `${NBR}, 19.4.1`, entradas: { Vmax: x.Vmax, VRd1: x.VRd1 } });
}

export interface CtxNervMesa {
  c: Concrete; capa: number; exigida: boolean; livre: number; qd: number; gg: number; gq: number; pp: number; gRev: number; q: number;
  Md: number; dm: number; fl: { As: number; double: boolean }; fydSup: number; AsMin: number; AsNec: number; AsAdotada: number; phi: number; s: number;
  malha?: { AsSup: number; AsInf: number; MdPos: number; AsNecPos: number; complementoSup: number; complementoInf: number; dmI: number; fydInf: number; flP: { As: number; double: boolean }; sSup: number; sInf: number };
}
/** Mesa entre nervuras: carga, flexão (espaçamento > 65 cm), armadura de distribuição, malha considerada e complemento. */
export function registrarMesa(mem: Registrador, el: string, x: CtxNervMesa) {
  const tp = 'Mesa';
  P(mem, el, 'cargas', tp, { descricao: 'Carga de cálculo da mesa por m² (peso próprio, revestimento e sobrecarga do grupo)', formula: 'qd = γg·(pp + grev) + γq·q', expressao: `qd = ${fm(x.gg)}·(${fm(x.pp)} + ${fm(x.gRev)}) + ${fm(x.gq)}·${fm(x.q)} = ${fm(x.qd)} kN/m²`, resultado: x.qd, unidade: 'kN/m²', norma: 'NBR 8681:2003', entradas: { gg: x.gg, pp: x.pp, gRev: x.gRev, gq: x.gq, q: x.q } });
  P(mem, el, 'esforcos', tp, { descricao: x.exigida ? 'Momento negativo da mesa engastada nas nervuras (vão livre entre nervuras): flexão exigida (intereixo > 65 cm)' : 'Flexão da mesa não exigida (intereixo ≤ 65 cm): só a armadura mínima de distribuição', formula: 'Md = qd·ℓ²/12', expressao: `Md = ${fm(x.qd)}·${fm(x.livre)}²/12 = ${fm(x.Md)} kN·m/m`, resultado: x.Md, unidade: 'kN·m/m', norma: `${NBR}, 13.2.4.2`, aConfirmar: true, entradas: { qd: x.qd, livre: x.livre, exigida: x.exigida ? 1 : 0 } });
  if (x.exigida) flexao(mem, el, tp, fk(x.c, { kind: 'rect', bw: 1, h: x.capa }, x.capa, 1), x.Md, x.dm, 0.02, x.fydSup, false, x.fl.As, false, { semMinimo: true, un: 'kN·m/m' });
  P(mem, el, 'dimensionamento', tp, { descricao: 'Armadura da mesa: máx(mínimo de distribuição; flexão)', formula: 'As,mín = máx(0,9 cm²/m; 0,5·0,0015·hf); As = máx(As,mín; As,flexão)', expressao: `As = máx(${fm(x.AsMin)}; ${fm(x.exigida ? x.fl.As * 1e4 : 0)}) = ${fm(x.AsNec)} cm²/m`, resultado: x.AsNec, unidade: 'cm²/m', norma: `${NBR}, 19.3.3.2`, aConfirmar: true, entradas: { AsMin: x.AsMin, AsFlexao: x.exigida ? x.fl.As * 1e4 : 0, hf: x.capa } });
  P(mem, el, 'detalhamento', tp, { descricao: `Barras de distribuição da mesa: φ${fm(x.phi)} com espaçamento múltiplo de 1 cm entre 5 e 20 cm`, formula: 's = máx(5; mín(20; ⌊As,φ/As·100⌋)) cm; As,ef = As,φ/s', expressao: `φ${fm(x.phi)} c/${fm(x.s * 100)} cm → As,ef = ${fm(x.AsAdotada)} cm²/m`, resultado: x.AsAdotada, unidade: 'cm²/m', norma: `${NBR}, 20.1`, entradas: { phi: x.phi, s: x.s, AsNec: x.AsNec, AsFi: barArea(x.phi) * 1e4 } });
  const m = x.malha;
  if (m) {
    P(mem, el, 'esforcos', tp, { descricao: 'Malha da base da mesa considerada: momento positivo no meio do vão da mesa', formula: 'Md+ = qd·ℓ²/24', expressao: `Md+ = ${fm(x.qd)}·${fm(x.livre)}²/24 = ${fm(m.MdPos)} kN·m/m`, resultado: m.MdPos, unidade: 'kN·m/m', aConfirmar: true, entradas: { qd: x.qd, livre: x.livre, exigida: x.exigida ? 1 : 0 } });
    if (x.exigida) flexao(mem, el, `${tp} – positivo`, fk(x.c, { kind: 'rect', bw: 1, h: x.capa }, x.capa, 1), m.MdPos, m.dmI, 0.02, m.fydInf, false, m.flP.As, true, { semMinimo: true, un: 'kN·m/m' });
    P(mem, el, 'dimensionamento', tp, { descricao: 'Complemento da armadura da mesa além da malha da base (menor área das duas direções)', formula: 'compl. = máx(0; As,nec − As,malha)', expressao: `superior: máx(0; ${fm(x.AsNec)} − ${fm(m.AsSup)}) = ${fm(m.complementoSup)}; inferior: máx(0; ${fm(m.AsNecPos)} − ${fm(m.AsInf)}) = ${fm(m.complementoInf)} cm²/m`, resultado: m.complementoSup, unidade: 'cm²/m', entradas: { AsNec: x.AsNec, AsSup: m.AsSup, AsNecPos: m.AsNecPos, AsInf: m.AsInf, complementoSup: m.complementoSup, complementoInf: m.complementoInf } });
  }
}

export interface CtxNervZona {
  area: number; nos: number; h: number; c: Concrete; dI: number; dS: number; fydInf: number; fydSup: number; taxaUsuario: number; amin: number;
  Minf: [number, number]; Msup: [number, number]; AsNecInf: [number, number]; AsNecSup: [number, number];
  AsMalhaInf: [number, number]; AsMalhaSup: [number, number]; complementoInf: [number, number]; complementoSup: [number, number];
  barrasInf: ({ phi: number; s: number } | null)[]; barrasSup: ({ phi: number; s: number } | null)[]; ok: boolean;
}
/** Zona maciça por Wood-Armer (E5g): momentos extremos, mínimos da Tabela 19.1, armadura necessária e complementar. */
export function registrarZonaMacica(mem: Registrador, el: string, x: CtxNervZona) {
  const tp = 'Zona maciça (Wood-Armer)', sec: BeamSection = { kind: 'rect', bw: 1, h: x.h };
  P(mem, el, 'esforcos', tp, { descricao: `Zona maciça de ${fm(x.area)} m² fora dos ábacos: maiores momentos de Wood-Armer por metro entre os ${x.nos} nós da grelha da zona`, formula: 'm+ = máx m*inf; m− = mín m*sup (direções 0 e 1)', expressao: `inferior ${fm(x.Minf[0])} / ${fm(x.Minf[1])}; superior ${fm(x.Msup[0])} / ${fm(x.Msup[1])} kN·m/m`, resultado: Math.max(...x.Minf), unidade: 'kN·m/m', norma: 'Wood (1968); NBR 6118, 14.7', entradas: { nos: x.nos, area: x.area, Minf0: x.Minf[0], Minf1: x.Minf[1], Msup0: x.Msup[0], Msup1: x.Msup[1] } });
  P(mem, el, 'dimensionamento', tp, { descricao: 'Armadura mínima da laje maciça (Tabela 19.1): positiva 0,67·ρmín·h e negativa ρmín·h por metro', formula: 'As,mín,inf = 0,67·ρmín·h; As,mín,sup = ρmín·h', expressao: `ρmín = ${fm(x.amin / x.h / 1e4)}; As,mín,inf = ${fm(0.67 * x.amin)} cm²/m; As,mín,sup = ${fm(x.amin)} cm²/m`, resultado: x.amin, unidade: 'cm²/m', norma: `${NBR}, 19.3.3.2 (Tabela 19.1)`, aConfirmar: !(x.taxaUsuario > 0), entradas: { rhoMin: x.amin / x.h / 1e4, h: x.h, amin: x.amin } });
  for (const face of ['inf', 'sup'] as const) for (const k of [0, 1] as const) {
    const M = face === 'inf' ? x.Minf[k] : x.Msup[k], nec = face === 'inf' ? x.AsNecInf[k] : x.AsNecSup[k], d = face === 'inf' ? x.dI : x.dS, fyd = face === 'inf' ? x.fydInf : x.fydSup;
    const tk = `${tp} – ${face === 'inf' ? 'inferior' : 'superior'}, direção ${k}`;
    if (Math.abs(M) >= 1e-3) flexao(mem, el, tk, fk(x.c, sec, x.h, 1), Math.abs(M), d, 0.02, fyd, false, 0, face === 'inf', { semMinimo: true, un: 'kN·m/m' });
    const comp = face === 'inf' ? x.complementoInf[k] : x.complementoSup[k], malha = face === 'inf' ? x.AsMalhaInf[k] : x.AsMalhaSup[k], br = (face === 'inf' ? x.barrasInf : x.barrasSup)[k];
    const asFlex = Math.abs(M) < 1e-3 ? 0 : beamFlexure(sec, false, Math.abs(M), d, 0.02, x.c, fyd).As * 1e4;
    P(mem, el, 'dimensionamento', tk, { descricao: 'Armadura necessária, malha da base considerada e complemento', formula: 'As,nec = máx(As,mín; As,flexão) (As,mín se |M| < 0,001); compl. = máx(0; As,nec − As,malha)', expressao: `As,nec = máx(${fm(face === 'inf' ? 0.67 * x.amin : x.amin)}; ${fm(asFlex)}) = ${fm(nec)}; malha ${fm(malha)} → complemento ${fm(comp)} cm²/m${br ? `; barras φ${fm(br.phi)} c/${fm(br.s * 100)}` : ''}`, resultado: comp, unidade: 'cm²/m', norma: `${NBR}, 19.3.3.2`, entradas: { M, AsMin: face === 'inf' ? 0.67 * x.amin : x.amin, AsFlexao: asFlex, AsNec: nec, malha, complemento: comp, phi: br?.phi ?? 0, s: br?.s ?? 0 } });
  }
}

export interface CtxNervAco { posicoes: { tipo: string; phi: number; n: number; comprimento: number }[]; peso: number; repeticoes: number }
/** Quantitativo de aço da laje por tipo de posição (kg, por pavimento, sem perdas). */
export function registrarAcoNervurada(mem: Registrador, el: string, x: CtxNervAco) {
  const tipos = [...new Set(x.posicoes.map((p) => p.tipo))], porTipo: Record<string, number> = {};
  for (const t of tipos) porTipo[t] = x.posicoes.filter((p) => p.tipo === t).reduce((s, p) => s + p.n * p.comprimento * barArea(p.phi) * 7850, 0);
  for (const t of tipos) P(mem, el, 'detalhamento', 'Quantitativo de aço', { descricao: `Peso do aço da posição "${t}" (Σ n·C·π·φ²/4·7850)`, formula: 'm = Σ n·C·As·ρaço', expressao: `m = ${fm(porTipo[t])} kg`, resultado: porTipo[t], unidade: 'kg', entradas: { nPosicoes: x.posicoes.filter((p) => p.tipo === t).length } });
  P(mem, el, 'detalhamento', 'Quantitativo de aço', { descricao: `Peso total do aço da laje (por pavimento; repetida em ${x.repeticoes} pavimento(s))`, formula: 'm = Σ m(tipo)', expressao: `m = ${tipos.map((t) => fm(porTipo[t])).join(' + ') || '0'} = ${fm(x.peso)} kg`, resultado: x.peso, unidade: 'kg', entradas: Object.fromEntries(tipos.map((t) => [`m_${t}`, porTipo[t]])) });
}
