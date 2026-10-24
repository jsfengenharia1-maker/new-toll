// Memória detalhada (MD fase 3b): vigotas por ficha (armadas, protendidas, genéricas) e nervuradas moldadas no local. Chamada por
// `dimensionarVigotasFichas` só com a memória ligada, com os mesmos números usados no cálculo. Reaproveita a base, os esforços do
// grupo, a distribuição na capa e o quantitativo das treliçadas (`vigotas.ts`) e a flexão (`vigaConcreto.ts`).
import type { BeamSection, Concrete } from '../concrete';
import { fm, type Registrador } from './registrador';
import { flexao } from './vigaConcreto';
import { registrarEsforcosGrupo, registrarVigotasBase, type CtxEsforcosGrupo, type CtxVigBase, type EsfV } from './vigotas';

const NBR = 'NBR 6118:2023';
type Chave = Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>;
type Etapa = 'cargas' | 'esforcos' | 'dimensionamento' | 'detalhamento';
const P = (mem: Registrador, el: string, etapa: Etapa, topico: string, p: Chave) => mem.passo({ etapa, elemento: el, topico, ...p });
const fk = (c: Concrete, sec: BeamSection, h: number, b: number) => ({ c, sec, taxaMin: 0, b, h });
const barras = (b: { n: number; phi: number } | null | undefined) => (b && b.n ? `${b.n}φ${fm(b.phi)}` : 'sem barras');

export const TOPICO_GEO_FICHA = 'Geometria da laje';

export interface CtxFichaBase extends Omit<CtxVigBase, 'trelica' | 'phiBanzo' | 'AsBanzo' | 'fyd60' | 'AsTrel' | 'rotulo' | 'topicoGeo'> {
  familia: string; fichaNome: string; origem: string; serie: string; moldada: boolean;
  candidatos: { tipo: string; Mu: number }[];
  protendida: boolean; caa: string; nivel: string; comb: 'frequente' | 'rara';
}
/** Cargas, geometria, mínimos, materiais, alturas úteis e fatores ELU (base das treliçadas, sem a treliça) mais a ficha e a protensão. */
export function registrarFichaBase(mem: Registrador, el: string, x: CtxFichaBase) {
  registrarVigotasBase(mem, el, { ...x, trelica: '', phiBanzo: 0, AsBanzo: 0, fyd60: 0, AsTrel: 0, rotulo: x.moldada ? 'Laje nervurada moldada no local' : `Laje de vigotas (${x.familia})`, topicoGeo: TOPICO_GEO_FICHA });
  const tf = 'Ficha e série';
  P(mem, el, 'cargas', tf, { descricao: x.moldada ? 'Nervura moldada no local: armadura calculada pela seção T (sem ficha de fabricante)' : `Ficha "${x.fichaNome}" (família ${x.familia}, origem ${x.origem}), série ${x.serie}: tipos candidatos de mesma altura, intereixo e enchimento, em ordem crescente de Mu`, formula: 'tipos da série com h, intereixo e enchimento iguais aos da laje', expressao: x.moldada ? `intereixo ${fm(x.intereixo)} m; bw ${fm(x.bw)} m` : (x.candidatos.map((q) => `${q.tipo}: Mu = ${fm(q.Mu)} kN·m`).join('; ') || 'nenhum tipo candidato'), resultado: x.candidatos.length, unidade: '', norma: 'Dado do fabricante (ficha)', aConfirmar: !x.moldada, entradas: { nCandidatos: x.candidatos.length, ...Object.fromEntries(x.candidatos.map((q, i) => [`Mu_${i}`, q.Mu])) } });
  if (x.protendida) P(mem, el, 'dimensionamento', tf, { descricao: `Nível de protensão pela classe de agressividade (CAA ${x.caa}): ${x.nivel}; combinação de serviço ${x.comb}`, formula: 'CAA I: parcial; II: limitada; III e IV: completa (frequente na parcial e na limitada, rara na completa)', expressao: `CAA ${x.caa} → protensão ${x.nivel}, combinação ${x.comb}`, resultado: x.nivel, unidade: '', norma: `${NBR}, Tabela 13.4`, aConfirmar: true, entradas: { caa: x.caa, nivel: x.nivel, comb: x.comb } });
}

export interface Parc { n: number; phi: number; As: number; comprimento: number; percentual: number; tipo: string }
export interface CtxFichaPositiva {
  Md: number; escala: number; protendida: boolean; fabricante: boolean;
  cand: { tipo: string; Mu: number; adm: number | null; servOk: boolean }[]; atribuido: number; idx: number; precisaAd: boolean;
  servico: { Ms: number; servMax: number; nivel: string; comb: string; caa: string; Madm: number | null; Mdesc: number; ok: boolean } | null;
  Mu: number; AsBase: number;
  adicional: { editado: boolean; cand: { n: number; phi: number; As: number; MuTot: number } | null; reg: number; lb: number; ext: number; curta: boolean; L: number; arredOp: number } | null;
  parcelas: Parc[]; MuTotal: number; AsAdTot: number;
  fora: { MuSemCurta: number; folga: number; fora: boolean } | null;
}
export interface CtxFichaMoldada {
  AsNec: number; atribuida: { n: number; phi: number } | null; esc: { n: number; phi: number; As: number } | null; cabe: boolean; need: number; larguraMin: number;
  bw: number; phiEst: number; cobInf: number; ah: number; Mu: number; comprimento: number; L: number; arredOp: number; compEditado: boolean;
}
export interface CtxFichaNeg {
  M: number; MRdN: number; MRdM: number; fonte: 'ficha' | 'calculado'; macico: number; bwEf: number;
  fn: { As: number; double: boolean }; AsN: number; br: { n: number; phi: number; As: number } | null; editada: { n: number; phi: number } | null; ampla: boolean;
  x0: number; al: number; lb: number; lbN: number; comprimentoAuto: number; comprimento: number; L: number; pct: number; arredOp: number; decalagem: number; dS: number;
  parcelas: Parc[];
  dividida: { nA: number; AsA: number; MRdA: number; xB: number; compB: number; comprimento: number } | null;
}
export interface CtxFichaCort {
  Vsd: number; d: number; As1: number; V1calc: number; V2: number; V1: number; fonte: 'ficha' | 'calculado';
  ficha: { VRd1: number; Mend: number; Mdesc: number; VRd1Desc: number | null } | null;
  editado: { V1pre: number; Vc: number; Vsw: number; phi: number; s: number; fywd: number } | null;
  sh: { VRd2: number; Vc: number; aswS: number; aswMin: number; smax: number; ok: boolean; av2: number; fywd: number; fywk: number } | null;
  estribo: { phi: number; s: number; zona: number; barras: number } | null; atribuido: boolean;
  min: number; ok: boolean;
}
export interface CtxFichaUnidade {
  tp: string; tag: string; gi: number; indices: number[]; n: 1 | 2 | 3; nvig: number;
  grupo: CtxEsforcosGrupo;
  manual: boolean;
  multipla: { n: number; pesoLinear: number; ppNerv: number; gg: number; dp: number; base: EsfV } | null;
  esf: EsfV;
  c: Concrete; fydInf: number; fydSup: number; dI: number; dS: number; bw: number; intereixo: number; h: number; capa: number; hEnch: number;
  sec: BeamSection; fl: { As: number; double: boolean }; AsMin: number; AsNec: number; moldada: boolean;
  pos: CtxFichaPositiva | null; mold: CtxFichaMoldada | null;
  negativos: (CtxFichaNeg | null)[]; cortante: CtxFichaCort[]; macico: [number, number];
}

/** Uma unidade de cálculo (grupo de igualação, ou vigota dupla/tripla/editada): esforços, flexão, tipo, adicional, negativos, cortante. */
export function registrarFichaUnidade(mem: Registrador, el: string, x: CtxFichaUnidade) {
  const tp = x.tp, tE = `${tp} – esforços`, tpP = `${tp} – flexão positiva`;
  registrarEsforcosGrupo(mem, el, tp, x.grupo);
  if (x.manual) P(mem, el, 'esforcos', tE, { descricao: `Esforços atribuídos pelo usuário à ${x.tag} (igualação manual; substituem os do grupo)`, formula: 'M+, M−, V atribuídos', expressao: `M+ = ${fm(x.esf.mPos)}; M− = ${fm(x.esf.mNeg[0])} / ${fm(x.esf.mNeg[1])} kN·m; V = ${fm(x.esf.v[0])} / ${fm(x.esf.v[1])} kN`, resultado: x.esf.mPos, unidade: 'kN·m', norma: 'Atribuição do usuário', entradas: { mPos: x.esf.mPos, mNeg0: x.esf.mNeg[0], mNeg1: x.esf.mNeg[1], v0: x.esf.v[0], v1: x.esf.v[1] } });
  else if (x.multipla) {
    const m = x.multipla, L = x.grupo.L;
    P(mem, el, 'esforcos', tE, { descricao: `${x.tag}: o conjunto de ${m.n} vigotas divide os esforços do grupo, mais o peso do conjunto acima do peso próprio da laje por nervura (dp)`, formula: 'dp = máx(0; peso do conjunto − pp·intereixo)·γg; M+ = (M+g + dp·L²/8)/n; M− = (M−g − dp·L²/12)/n; V = (Vg + dp·L/2)/n', expressao: `dp = ${fm(m.dp)} kN/m; M+ = (${fm(m.base.mPos)} + ${fm(m.dp)}·${fm(L)}²/8)/${m.n} = ${fm(x.esf.mPos)} kN·m; M− = ${fm(x.esf.mNeg[0])} / ${fm(x.esf.mNeg[1])} kN·m; V = ${fm(x.esf.v[0])} / ${fm(x.esf.v[1])} kN (por vigota)`, resultado: x.esf.mPos, unidade: 'kN·m', norma: 'Critério do programa (vigotas múltiplas da ficha)', aConfirmar: true, entradas: { n: m.n, pesoLinear: m.pesoLinear, ppNerv: m.ppNerv, gg: m.gg, dp: m.dp, L, mPosG: m.base.mPos, mNeg0G: m.base.mNeg[0], mNeg1G: m.base.mNeg[1], v0G: m.base.v[0], v1G: m.base.v[1], mPos: x.esf.mPos, mNeg0: x.esf.mNeg[0], mNeg1: x.esf.mNeg[1], v0: x.esf.v[0], v1: x.esf.v[1] } });
  }
  // flexão positiva em T
  flexao(mem, el, tpP, fk(x.c, x.sec, x.h, x.bw), x.esf.mPos, x.dI, 0.03, x.fydInf, true, x.fl.As, true, { semMinimo: true });
  P(mem, el, 'dimensionamento', tpP, { descricao: 'Armadura necessária por nervura (flexão e mínimo)', formula: 'As,nec = máx(As,flexão; As,mín) (As,mín se M+ > 0)', expressao: `As,nec = máx(${fm(x.fl.As * 1e4)}; ${fm(x.esf.mPos > 0 ? x.AsMin : 0)}) = ${fm(x.AsNec)} cm²`, resultado: x.AsNec, unidade: 'cm²', norma: `${NBR}, 17.3.5.2`, entradas: { AsFlexao: x.fl.As * 1e4, AsMin: x.AsMin, M: x.esf.mPos, AsNec: x.AsNec } });
  if (x.pos) positivaFicha(mem, el, tpP, x, x.pos);
  if (x.mold) moldadaFicha(mem, el, tpP, x, x.mold);
  // negativos e cortante
  [0, 1].forEach((k) => {
    const pt = k ? 'final' : 'inicial', n = x.negativos[k], cv = x.cortante[k];
    if (n) negativoFicha(mem, el, `${tp} – negativo na ponta ${pt}`, x, n);
    cortanteFicha(mem, el, `${tp} – cortante na ponta ${pt}`, x, cv, n, k);
  });
}

function positivaFicha(mem: Registrador, el: string, tpP: string, x: CtxFichaUnidade, p: CtxFichaPositiva) {
  const ent: Record<string, number | string> = { Md: p.Md, n: p.cand.length, idx: p.idx, atribuido: p.atribuido, precisaAd: p.precisaAd ? 1 : 0, protendida: p.protendida ? 1 : 0 };
  p.cand.forEach((q, i) => { ent[`Mu_${i}`] = q.Mu; ent[`servOk_${i}`] = q.servOk ? 1 : 0; });
  const esc = p.cand[p.idx];
  P(mem, el, 'dimensionamento', tpP, { descricao: p.atribuido >= 0 ? `Tipo da série atribuído pelo usuário: ${esc.tipo}` : `Tipo da série: o primeiro (menor Mu) com Mu ≥ Md${p.protendida ? ' e momento de serviço dentro do admissível' : ''}; sem nenhum, o maior tipo${p.precisaAd ? ' e armadura adicional' : ''}`, formula: 'tipo = primeiro i com Mu,i ≥ Md (e Ms ≤ Madm,i); senão o maior da série', expressao: `Md = ${fm(p.Md)} kN·m; ${p.cand.map((q) => `${q.tipo}: Mu = ${fm(q.Mu)}`).join('; ')} → ${esc.tipo} (Mu = ${fm(p.Mu)} kN·m)`, resultado: p.Mu, unidade: 'kN·m', norma: 'Dado do fabricante (ficha)', aConfirmar: true, entradas: ent });
  if (p.servico) {
    const s = p.servico;
    P(mem, el, 'dimensionamento', tpP, { descricao: `Serviço da protensão (${s.nivel}, CAA ${s.caa}, combinação ${s.comb}): momento de serviço do pico dos alinhamentos do grupo por nervura × admissível do tipo`, formula: 'Ms = máx(picos de serviço do grupo)/escala ≤ Madm(nível)', expressao: `Ms = ${fm(s.servMax)}/${fm(p.escala)} = ${fm(s.Ms)} kN·m ${s.Madm === null ? '(Madm não informado na ficha: verificação não feita)' : `${s.ok ? '≤' : '>'} Madm = ${fm(s.Madm)} kN·m`}; Mdesc = ${fm(s.Mdesc)} kN·m`, resultado: s.Ms, unidade: 'kN·m', norma: `${NBR}, Tabela 13.4 e 17.3`, aConfirmar: true, entradas: { servMax: s.servMax, escala: p.escala, Ms: s.Ms, Madm: s.Madm === null ? 'n/d' : s.Madm, Mdesc: s.Mdesc, ok: s.ok ? 1 : 0 } });
  }
  const c = x.c;
  P(mem, el, 'dimensionamento', tpP, { descricao: 'Armadura inferior equivalente ao Mu do tipo (a ficha informa o Mu e não a armadura): As tal que MRd(As) = Mu na seção T (bisseção)', formula: 'MRd = σcd·bf·y·(d − y/2) com y = As·fyd/(σcd·bf) ≤ hf (mesa); senão mesa + alma; Mu = MRd(As,eq)', expressao: `As,eq = ${fm(p.AsBase)} cm² (Mu = ${fm(p.Mu)} kN·m)`, resultado: p.AsBase, unidade: 'cm²', norma: `${NBR}, 17.2.2`, entradas: { Mu: p.Mu, AsBase: p.AsBase, sigmaCd: c.sigmaCd, lambda: c.lambda, xLim: c.xLimRatio, bf: x.intereixo, hf: x.capa, bw: x.bw, d: x.dI, fyd: x.fydInf } });
  const ad = p.adicional;
  if (ad && !ad.editado) {
    P(mem, el, 'dimensionamento', tpP, { descricao: ad.cand ? 'Armadura adicional automática: menor combinação de 1 ou 2 barras φ6,3 a φ12,5 que leva o Mu da seção (As,eq + adicional) a Md' : 'Armadura adicional automática: nenhuma combinação (até 2φ12,5) leva o Mu a Md', formula: 'MRd(As,eq + As,ad) ≥ Md', expressao: ad.cand ? `${ad.cand.n}φ${fm(ad.cand.phi)} (${fm(ad.cand.As)} cm²): Mu = ${fm(ad.cand.MuTot)} kN·m ≥ Md = ${fm(p.Md)} kN·m` : `Md = ${fm(p.Md)} kN·m`, resultado: ad.cand?.As ?? 0, unidade: 'cm²', norma: `${NBR}, 17.2.2`, entradas: { Md: p.Md, n: ad.cand?.n ?? 0, phi: ad.cand?.phi ?? 0, As: ad.cand?.As ?? 0, MuTot: ad.cand?.MuTot ?? 0 } });
    if (ad.cand) P(mem, el, 'detalhamento', tpP, { descricao: 'Comprimento da parcela adicional: região onde o momento passa de Mu do tipo, mais a ancoragem e a altura útil nas duas pontas; curta se < 70 % do vão', formula: 'ext = reg + 2·(lb + d); curta se ext < 0,7·L; C = ⌈ext⌉ (curta) ou ⌈L⌉ (total)', expressao: `reg = ${fm(ad.reg)} m; ext = ${fm(ad.reg)} + 2·(${fm(ad.lb)} + ${fm(x.dI)}) = ${fm(ad.ext)} m ${ad.curta ? '<' : '≥'} 0,7·${fm(ad.L)} → parcela ${ad.curta ? 'curta' : 'total'}`, resultado: ad.curta ? 1 : 0, unidade: '', norma: `${NBR}, 9.4.2.5`, aConfirmar: true, entradas: { reg: ad.reg, lb: ad.lb, d: x.dI, ext: ad.ext, L: ad.L, curta: ad.curta ? 1 : 0, arred: ad.arredOp } });
  }
  P(mem, el, 'detalhamento', tpP, { descricao: p.parcelas.length ? `Armadura adicional adotada${ad?.editado ? ' (atribuída pelo usuário)' : ''}: ${p.parcelas.map((q) => `${barras(q)} (${q.tipo}, ${fm(q.comprimento)} m = ${fm(q.percentual)} % do vão)`).join(' + ')}` : p.protendida ? 'Vigota protendida: sem armadura adicional' : 'Sem armadura adicional: o tipo da série cobre o momento', formula: 'As,ad = Σ n·π·φ²/4', expressao: `As,ad = ${fm(p.AsAdTot)} cm²; Mu,total = ${fm(p.MuTotal)} kN·m`, resultado: p.AsAdTot, unidade: 'cm²', norma: `${NBR}, 18.3.2.2`, entradas: { AsAd: p.AsAdTot, MuTotal: p.MuTotal, Md: p.Md, nParcelas: p.parcelas.length, ...Object.fromEntries(p.parcelas.flatMap((q, i) => [[`n_${i}`, q.n], [`phi_${i}`, q.phi], [`comp_${i}`, q.comprimento]])) } });
  if (p.fora) P(mem, el, 'dimensionamento', tpP, { descricao: 'Parcela curta: fora dela vale só o Mu com a parcela total', formula: 'Mu,sem curta = MRd(As,eq + As,total); folga = (L − C)/2', expressao: `Mu,sem curta = ${fm(p.fora.MuSemCurta)} kN·m; folga = ${fm(p.fora.folga)} m → ${p.fora.fora ? 'momento acima do resistente fora da parcela' : 'atende'}`, resultado: p.fora.MuSemCurta, unidade: 'kN·m', norma: `${NBR}, 17.2.2`, entradas: { MuSemCurta: p.fora.MuSemCurta, folga: p.fora.folga, fora: p.fora.fora ? 1 : 0 } });
  P(mem, el, 'dimensionamento', tpP, { descricao: 'Aproveitamento do momento positivo', formula: 'Md/Mu,total ≤ 1', expressao: `Md/Mu,total = ${fm(p.Md)}/${fm(p.MuTotal)} = ${fm(p.MuTotal > 0 ? p.Md / p.MuTotal : 0)}`, resultado: p.MuTotal > 0 ? p.Md / p.MuTotal : 0, unidade: '', entradas: { Md: p.Md, MuTotal: p.MuTotal } });
}

function moldadaFicha(mem: Registrador, el: string, tpP: string, x: CtxFichaUnidade, m: CtxFichaMoldada) {
  P(mem, el, 'dimensionamento', tpP, { descricao: m.atribuida ? `Armadura inferior atribuída pelo usuário: ${barras(m.atribuida)}` : 'Armadura inferior: primeira combinação de até 2 barras (φ6,3 a φ25, por área crescente) que cobre As,nec e cabe na largura da nervura', formula: 'As,ef = n·π·φ²/4 ≥ As,nec; cabe se bw ≥ 2·(c + φest) + n·φ + (n − 1)·ah, ah = máx(2 cm; φ; 1,2·dmáx)', expressao: m.esc ? `${barras(m.esc)}: As = ${fm(m.esc.As)} cm² ${m.esc.As >= m.AsNec - 1e-6 ? '≥' : '<'} ${fm(m.AsNec)} cm²; largura necessária = 2·(${fm(m.cobInf)} + ${fm(m.phiEst / 1000)}) + ${m.esc.n}·${fm(m.esc.phi / 1000)} + ${m.esc.n - 1}·${fm(m.ah)} = ${fm(m.need)} m ${m.cabe ? '≤' : '>'} bw = ${fm(m.bw)} m` : `sem combinação que cubra As,nec = ${fm(m.AsNec)} cm²`, resultado: m.esc?.As ?? 0, unidade: 'cm²', norma: `${NBR}, 18.3.2.2`, entradas: { AsNec: m.AsNec, n: m.esc?.n ?? 0, phi: m.esc?.phi ?? 0, As: m.esc?.As ?? 0, need: m.need, bw: m.bw, cob: m.cobInf, phiEst: m.phiEst, ah: m.ah, larguraMin: m.larguraMin, cabe: m.cabe ? 1 : 0 } });
  if (m.esc) {
    P(mem, el, 'dimensionamento', tpP, { descricao: 'Momento resistente da nervura com a armadura adotada (seção T)', formula: 'Mu = MRd(As,ef): y = As·fyd/(σcd·bf) ≤ hf → σcd·bf·y·(d − y/2); senão mesa + alma', expressao: `Mu = ${fm(m.Mu)} kN·m (Md = ${fm(x.esf.mPos)} kN·m)`, resultado: m.Mu, unidade: 'kN·m', norma: `${NBR}, 17.2.2`, entradas: { Mu: m.Mu, As: m.esc.As, sigmaCd: x.c.sigmaCd, lambda: x.c.lambda, xLim: x.c.xLimRatio, bf: x.intereixo, hf: x.capa, bw: x.bw, d: x.dI, fyd: x.fydInf } });
    P(mem, el, 'detalhamento', tpP, { descricao: `Comprimento da armadura inferior${m.compEditado ? ' (atribuído)' : ' (vão da vigota arredondado)'}`, formula: 'C = ⌈L⌉ ao múltiplo do arredondamento', expressao: `C = ${fm(m.comprimento)} m (L = ${fm(m.L)} m)`, resultado: m.comprimento, unidade: 'm', entradas: { L: m.L, arred: m.arredOp, comprimento: m.comprimento } });
  }
}

function negativoFicha(mem: Registrador, el: string, t: string, x: CtxFichaUnidade, n: CtxFichaNeg) {
  const c = x.c;
  P(mem, el, 'dimensionamento', t, { descricao: n.fonte === 'ficha' ? 'Momentos máximos da nervura e da faixa maciçada (valores da ficha)' : 'Momentos resistentes da seção sem armadura de compressão (x = x,lim): da nervura e da faixa maciçada (largura = intereixo)', formula: n.fonte === 'ficha' ? 'MRd,N e MRd,M da ficha' : 'MRd = σcd·b·λ·x,lim·(d − λ·x,lim/2)', expressao: `MRd,nervura = ${fm(n.MRdN)}; MRd,maciço = ${fm(n.MRdM)} kN·m; Md = ${fm(n.M)} kN·m → ${n.M > n.MRdN ? `maciçar ${fm(n.macico * 100)} cm` : 'nervura resiste'}`, resultado: n.MRdN, unidade: 'kN·m', norma: n.fonte === 'ficha' ? 'Dado do fabricante (ficha)' : `${NBR}, 17.2.2`, aConfirmar: n.fonte === 'ficha', entradas: { fonte: n.fonte, sigmaCd: c.sigmaCd, bw: x.bw, intereixo: x.intereixo, lambda: c.lambda, xLim: c.xLimRatio, d: n.dS, M: n.M, MRdN: n.MRdN, MRdM: n.MRdM, macico: n.macico } });
  flexao(mem, el, t, fk(c, { kind: 'rect', bw: n.bwEf, h: x.h }, x.h, n.bwEf), n.M, n.dS, 0.03, x.fydSup, false, n.fn.As, false, { semMinimo: true });
  P(mem, el, 'dimensionamento', t, { descricao: `Armadura negativa necessária e adotada${n.editada ? ' (atribuída pelo usuário)' : n.ampla ? ' (fora da tabela de 2φ12,5: combinação ampla de 1 a 4 barras)' : ''}`, formula: 'As = máx(As,flexão; As,mín); n·φ ≥ As', expressao: `As = máx(${fm(n.fn.As * 1e4)}; ${fm(x.AsMin)}) = ${fm(n.AsN)} cm² → ${barras(n.br)}`, resultado: n.AsN, unidade: 'cm²', norma: `${NBR}, 17.3.5.2`, entradas: { AsFlexao: n.fn.As * 1e4, AsMin: x.AsMin, AsN: n.AsN, n: n.br?.n ?? 0, phi: n.br?.phi ?? 0, As: n.br?.As ?? 0 } });
  P(mem, el, 'detalhamento', t, { descricao: 'Comprimento do negativo a partir do eixo do apoio: máx(% do vão; ponto de momento nulo + decalagem + ancoragem necessária), arredondado e limitado ao vão', formula: 'lb,nec = lb·mín(1; As/As,ef); C = mín(L; ⌈máx(pct·L; x0 + aℓ + lb,nec)⌉)', expressao: `lb,nec = ${fm(n.lb)}·mín(1; ${fm(n.AsN)}/${fm(n.br?.As || n.AsN)}) = ${fm(n.lbN)} m; aℓ = ${fm(n.decalagem)}·${fm(n.dS)} = ${fm(n.al)} m; x0 = ${fm(n.x0)} m; C = ${fm(n.comprimentoAuto)} m${n.comprimento !== n.comprimentoAuto ? `; atribuído: ${fm(n.comprimento)} m` : ''}`, resultado: n.comprimento, unidade: 'm', norma: `${NBR}, 9.4.2.5 e 18.3.2.3`, entradas: { lbBase: n.lb, AsN: n.AsN, AsEf: n.br?.As || n.AsN, x0: n.x0, al: n.al, pct: n.pct, L: n.L, arred: n.arredOp, comprimento: n.comprimentoAuto, comprimentoFinal: n.comprimento } });
  if (n.dividida) {
    const d = n.dividida;
    P(mem, el, 'detalhamento', t, { descricao: `Duas parcelas: a longa (${d.nA} barra(s)) cobre o diagrama inteiro; a curta (${(n.br?.n ?? 0) - d.nA} barra(s)) só até onde o momento passa do que a longa resiste`, formula: 'nA = ⌈n/2⌉; MRd,A = MRd(nA·As1) (T, b = bw); xB = alcance do diagrama em MRd,A; CB = mín(C; ⌈máx(xB + aℓ + lb; 10 cm)⌉)', expressao: `MRd,A = ${fm(d.MRdA)} kN·m; xB = ${fm(d.xB)} m; CB = ${fm(d.compB)} m (longa: ${fm(d.comprimento)} m)`, resultado: d.compB, unidade: 'm', norma: `${NBR}, 9.4.2.5`, aConfirmar: true, entradas: { nA: d.nA, AsA: d.AsA, MRdA: d.MRdA, xB: d.xB, al: n.al, lb: n.lb, compB: d.compB, comprimento: d.comprimento, sigmaCd: c.sigmaCd, lambda: c.lambda, xLim: c.xLimRatio, bw: x.bw, h: x.h, d: n.dS, fyd: x.fydSup, arred: n.arredOp, C: n.comprimentoAuto } });
  }
}

function cortanteFicha(mem: Registrador, el: string, t: string, x: CtxFichaUnidade, v: CtxFichaCort, neg: CtxFichaNeg | null, k: number) {
  const c = x.c;
  P(mem, el, 'dimensionamento', t, { descricao: `Resistências calculadas por nervura sem armadura transversal (19.4.1) com a armadura tracionada da ponta (${fm(v.As1 * 1e4)} cm²)`, formula: 'VRd1 = 0,25·fctd·k·(1,2 + 40ρ1)·bw·d (k = máx(1; 1,6 − d); ρ1 ≤ 0,02); VRd2 = 0,5·αv1·fcd·bw·0,9d (αv1 = mín(0,5; 0,7 − fck/200))', expressao: `VRd1 = ${fm(v.V1calc)}; VRd2 = ${fm(v.V2)} kN`, resultado: v.V1calc, unidade: 'kN', norma: `${NBR}, 19.4.1`, entradas: { fctd: c.fctd, fcd: c.fcd, fck: c.fck, bw: x.bw, d: v.d, As1: v.As1, V1: v.V1calc, V2: v.V2 } });
  const V1f = v.ficha ? (v.ficha.VRd1Desc !== null && v.ficha.Mend <= v.ficha.Mdesc ? v.ficha.VRd1Desc : v.ficha.VRd1) : v.V1;
  if (v.ficha) P(mem, el, 'dimensionamento', t, { descricao: v.ficha.VRd1Desc !== null ? `VRd1 da ficha (duas colunas): momento positivo na ponta ${fm(v.ficha.Mend)} kN·m ${v.ficha.Mend <= v.ficha.Mdesc ? '≤' : '>'} Mdesc = ${fm(v.ficha.Mdesc)} kN·m → ${v.ficha.Mend <= v.ficha.Mdesc ? 'seção descomprimida' : 'seção fissurada'}` : 'VRd1 da ficha', formula: v.ficha.VRd1Desc !== null ? 'VRd1 = VRd1,descomprimida se Mend ≤ Mdesc; senão VRd1 da ficha' : 'VRd1 = VRd1 da ficha', expressao: `VRd1 = ${fm(V1f)} kN`, resultado: V1f, unidade: 'kN', norma: 'Dado do fabricante (ficha)', aConfirmar: true, entradas: { VRd1Ficha: v.ficha.VRd1, VRd1Desc: v.ficha.VRd1Desc ?? 'n/d', Mend: v.ficha.Mend, Mdesc: v.ficha.Mdesc } });
  if (v.editado) P(mem, el, 'dimensionamento', t, { descricao: `Estribo atribuído (φ${fm(v.editado.phi)} c/${fm(v.editado.s * 100)} cm): parcela de aço somada à resistência`, formula: 'VRd = máx(VRd1; Vc) + Vsw; Vc = 0,6·fctd·bw·d; Vsw = (Asw/s)·0,9d·fywd', expressao: `Vc = ${fm(v.editado.Vc)} kN; Vsw = ${fm(v.editado.Vsw)} kN → VRd = ${fm(v.V1)} kN`, resultado: v.V1, unidade: 'kN', norma: `${NBR}, 17.4.2`, aConfirmar: true, entradas: { V1pre: v.editado.V1pre, V1: v.V1, Vc: v.editado.Vc, Vsw: v.editado.Vsw, fctd: c.fctd, bw: x.bw, d: v.d, phi: v.editado.phi, s: v.editado.s, fywd: v.editado.fywd } });
  if (x.moldada && v.sh) P(mem, el, 'dimensionamento', t, { descricao: `Vsd > VRd1: estribos pelo modelo I (nervura moldada)${v.sh.ok ? '' : '; biela comprimida esgotada'}`, formula: 'VRd2 = 0,27·αv2·fcd·bw·d; Vc = 0,6·fctd·bw·d; Asw,mín = 0,2·fctm/fywk·bw; Asw/s = máx(Asw,mín; (Vsd − Vc)/(0,9·d·fywd))', expressao: `VRd2 = ${fm(v.sh.VRd2)} kN; Vc = ${fm(v.sh.Vc)} kN; Asw/s = ${fm(v.sh.aswS * 1e4)} cm²/m (mín ${fm(v.sh.aswMin * 1e4)}); smáx = ${fm(v.sh.smax * 100)} cm${v.estribo ? ` → φ${fm(v.estribo.phi)} c/${fm(v.estribo.s * 100)} cm${v.atribuido ? ' (atribuído)' : ''}, zona ${fm(v.estribo.zona)} m, ${v.estribo.barras} barras` : ''}`, resultado: v.sh.aswS, unidade: 'm²/m', norma: `${NBR}, 17.4.2.2`, entradas: { Vsd: v.Vsd, d: v.d, bw: x.bw, fcd: c.fcd, fctd: c.fctd, fctm: c.fctm, av2: v.sh.av2, fywd: v.sh.fywd, fywk: v.sh.fywk, VRd2: v.sh.VRd2, Vc: v.sh.Vc, aswS: v.sh.aswS, aswMin: v.sh.aswMin, smax: v.sh.smax, ok: v.sh.ok ? 1 : 0, phi: v.estribo?.phi ?? 0, s: v.estribo?.s ?? 0, zona: v.estribo?.zona ?? 0, barras: v.estribo?.barras ?? 0 } });
  else if (x.moldada && v.estribo) P(mem, el, 'dimensionamento', t, { descricao: 'Estribo atribuído (Vsd ≤ VRd1: sem exigência do cálculo)', formula: 'φ e s atribuídos', expressao: `φ${fm(v.estribo.phi)} c/${fm(v.estribo.s * 100)} cm`, resultado: v.estribo.phi, unidade: 'mm', entradas: { phi: v.estribo.phi, s: v.estribo.s } });
  P(mem, el, 'dimensionamento', t, { descricao: `Verificação do cortante por nervura (${v.fonte === 'ficha' ? 'resistente da ficha' : 'resistente calculado'})`, formula: 'Vsd ≤ mín(VRd1; VRd2)', expressao: `Vsd = ${fm(v.Vsd)} kN ${v.Vsd > v.min + 1e-9 && !x.moldada ? '>' : '≤'} mín(${fm(v.V1)}; ${fm(v.V2)}) = ${fm(v.min)} kN`, resultado: v.min, unidade: 'kN', norma: `${NBR}, 19.4.1`, entradas: { Vsd: v.Vsd, V1: v.V1, V2: v.V2, min: v.min, moldada: x.moldada ? 1 : 0 } });
  P(mem, el, 'dimensionamento', t, { descricao: 'Faixa maciçada necessária na ponta (da flexão negativa)', formula: 'maciço = alcance do diagrama de |M−| em MRd,N', expressao: `maciço = ${fm(x.macico[k] * 100)} cm`, resultado: x.macico[k], unidade: 'm', entradas: { flexao: neg?.macico ?? 0, macico: x.macico[k] } });
}
