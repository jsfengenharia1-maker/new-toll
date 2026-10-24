// Memória detalhada (MD fase 3b): lajes alveolares. Chamada por `dimensionarAlveolares` só com a memória ligada, com os mesmos
// números usados no cálculo: envoltórias por metro (alinhamentos da grelha, mínimos, redistribuição, média ponderada na placa),
// verificação da placa pelos dados da ficha (Mu, serviço, negativos, cortante), escolha da placa, capa, apoios e quantitativos.
// A flecha do pano (Branson com a ficha) é registrada pelo dimensionamento das lajes (`dimensionamento.ts`).
import type { BeamSection, Concrete } from '../concrete';
import { fm, type Registrador } from './registrador';
import { flexao } from './vigaConcreto';
import type { CasoFat } from './nervurada';
import type { EsfV } from './vigotas';

const NBR = 'NBR 6118:2023';
type Chave = Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>;
type Etapa = 'cargas' | 'esforcos' | 'dimensionamento' | 'detalhamento';
const P = (mem: Registrador, el: string, etapa: Etapa, topico: string, p: Chave) => mem.passo({ etapa, elemento: el, topico, ...p });
const PROC = ['escorado (laje contínua sobre apoios rígidos)', 'engaste aproximado (fator 1 − pp/total)', 'duas fases (placa isostática sob o peso próprio e depois contínua)'];

export interface CtxAlvBase {
  nome: string; pavimentos: string; ficha: string; fichaNome: string; fabricante: string; ficticio: boolean; placa: string; fixa: boolean;
  altura: number; capa: number; ppPlaca: number; volume: number; pp: number; processo: 0 | 1 | 2; engaste: number | null;
  vao: number; larguraPano: number; nPlacas: number; larguraPlaca: number;
  permanentes: number; variaveis: number; gg: number; gq: number; psiS: number; qELU: number; qSrv: number;
  nivel: string; caa: string; comb: 'frequente' | 'rara'; c: Concrete; fydSup: number; acoSup: string; cobSup: number; dNeg: number;
  elu: CasoFat[]; serv: CasoFat[]; faltam: string[]; redistribuir: boolean; fase1: boolean;
}
/** Placa, ficha, processo construtivo, cargas, materiais e fatores de ponderação por caso. */
export function registrarAlveolarBase(mem: Registrador, el: string, x: CtxAlvBase) {
  const t = 'Placa e cargas', c = x.c, gc = c.fck / c.fcd;
  P(mem, el, 'cargas', t, { descricao: `Laje alveolar ${x.nome} (${x.pavimentos}): placa ${x.placa}${x.fixa ? ' (fixada pelo usuário)' : ''} da ficha "${x.fichaNome}" (${x.fabricante}${x.ficticio ? ', ficha fictícia de demonstração' : ''}); altura total ${fm(x.altura * 100)} cm, capa ${fm(x.capa * 100)} cm`, formula: 'pp = peso da placa + γc·volume moldado no local', expressao: `pp = ${fm(x.ppPlaca)} + 25·${fm(x.volume)} = ${fm(x.pp)} kN/m²`, resultado: x.pp, unidade: 'kN/m²', norma: 'Dado do fabricante (ficha) e NBR 6120:2019', aConfirmar: true, entradas: { ppPlaca: x.ppPlaca, volume: x.volume, pp: x.pp, altura: x.altura, capa: x.capa, larguraPlaca: x.larguraPlaca } });
  P(mem, el, 'cargas', t, { descricao: `Pano de ${fm(x.larguraPano)} m de largura com ${x.nPlacas} placa(s); vão das placas ${fm(x.vao)} m; processo construtivo: ${PROC[x.processo]}`, formula: x.processo === 1 ? 'fator de engaste = máx(0; mín(1; 1 − pp/total))' : x.processo === 2 ? 'fase 1: placa isostática sob γg·pp; fase 2: contínua com as demais cargas' : 'laje contínua sobre apoios rígidos com todas as cargas', expressao: x.engaste !== null ? `fator de engaste = ${fm(x.engaste)}` : PROC[x.processo], resultado: x.engaste ?? x.processo, unidade: '', norma: 'Critério do programa (processo construtivo)', aConfirmar: true, entradas: { processo: x.processo, vao: x.vao, larguraPano: x.larguraPano, nPlacas: x.nPlacas, engaste: x.engaste ?? 'n/d' } });
  P(mem, el, 'cargas', t, { descricao: 'Cargas do pano para a razão entre placas: permanentes (revestimento do grupo e cargas de área G), variáveis (uso e cargas de área Q); ELU = γg·(pp + perm) + γq·var; serviço = pp + perm + ψ·var', formula: 'qELU = γg·(pp + g) + γq·q; qserv = pp + g + ψ·q', expressao: `qELU = ${fm(x.gg)}·(${fm(x.pp)} + ${fm(x.permanentes)}) + ${fm(x.gq)}·${fm(x.variaveis)} = ${fm(x.qELU)} kN/m²; qserv = ${fm(x.pp)} + ${fm(x.permanentes)} + ${fm(x.psiS)}·${fm(x.variaveis)} = ${fm(x.qSrv)} kN/m² (combinação ${x.comb})`, resultado: x.qELU, unidade: 'kN/m²', norma: 'NBR 8681:2003, 5.1.3', entradas: { pp: x.pp, perm: x.permanentes, var: x.variaveis, gg: x.gg, gq: x.gq, psiS: x.psiS, qELU: x.qELU, qSrv: x.qSrv } });
  const tm = 'Materiais e alturas úteis';
  P(mem, el, 'dimensionamento', tm, { descricao: 'Resistência de cálculo do concreto', formula: 'fcd = fck / γc', expressao: `fcd = ${fm(c.fck)} / ${fm(gc)} = ${fm(c.fcd)}`, resultado: c.fcd, unidade: 'MPa', norma: `${NBR}, 12.3.3`, entradas: { fck: c.fck, gc } });
  P(mem, el, 'dimensionamento', tm, { descricao: `Resistência de cálculo do aço dos negativos da capa (${x.acoSup})`, formula: 'fyd = fyk / γs', expressao: `fyd = ${fm(x.fydSup)} MPa`, resultado: x.fydSup, unidade: 'MPa', norma: `${NBR}, 12.3.3`, entradas: { fyd: x.fydSup } });
  P(mem, el, 'dimensionamento', tm, { descricao: 'Altura útil do negativo (medida da face inferior da placa)', formula: 'd = h − c_sup − 0,005', expressao: `d = ${fm(x.altura)} − ${fm(x.cobSup)} − 0,005 = ${fm(x.dNeg)} m`, resultado: x.dNeg, unidade: 'm', norma: `${NBR}, 7.4.7.6`, entradas: { h: x.altura, cobSup: x.cobSup, d: x.dNeg } });
  P(mem, el, 'esforcos', 'Fatores de ponderação', { descricao: 'Fatores ELU por caso (envoltória por metro)', formula: 'γi por caso de carga', expressao: x.elu.map((q) => `${q.caso}: ${fm(q.f)}`).join('; ') || '—', resultado: 'ELU', unidade: '', norma: 'NBR 8681:2003, 5.1.3', entradas: Object.fromEntries(x.elu.map((q) => [`γ_${q.caso}`, q.f])) });
  P(mem, el, 'esforcos', 'Fatores de ponderação', { descricao: `Fatores de serviço por caso (protensão ${x.nivel}, CAA ${x.caa}: combinação ${x.comb})`, formula: 'frequente: G + ψ1·Q; rara: G + Q', expressao: x.serv.map((q) => `${q.caso}: ${fm(q.f)}`).join('; ') || '—', resultado: x.comb, unidade: '', norma: `${NBR}, Tabela 13.4`, aConfirmar: true, entradas: Object.fromEntries(x.serv.map((q) => [`ψ_${q.caso}`, q.f])) });
  if (x.faltam.length) P(mem, el, 'dimensionamento', 'Dados da ficha', { descricao: `A ficha da placa não informa: ${x.faltam.join(', ')}; a verificação correspondente não foi feita`, formula: '—', expressao: x.faltam.join('; '), resultado: x.faltam.length, unidade: '', norma: 'Dado do fabricante (ficha)', aConfirmar: true, entradas: { n: x.faltam.length } });
}

export interface FaixaAlv {
  t: number; largura: number; L: number; calc: EsfV; tipo: string; divisorPos: number; divisorNeg: number; pisoPos: number; pisoNeg: number;
  min: EsfV; rd: { delta: number; aplicada: boolean; pct: number; deltaMin: number; continuas: [boolean, boolean] } | null; esf: EsfV;
  mEnd: [number, number];
}
export interface PlacaEnv { indice: number; t0: number; t1: number; largura: number; env: { mPos: number; mNeg: [number, number]; v: [number, number]; mEnd: [number, number] }; ms: number }
export interface CtxAlvEsforcos {
  processo: 0 | 1 | 2; faixas: FaixaAlv[]; serv: { t: number; largura: number; ms: number }[]; placas: PlacaEnv[]; envPano: { mPos: number; mNeg: [number, number]; v: [number, number]; mEnd: [number, number] }; MsPano: number;
  minPos: number; minNeg: number;
}
/** Média ponderada pela sobreposição das faixas da grelha com a faixa [t0, t1] da placa (como no dimensionamento). */
function mediaPonderada(fs: { t: number; largura: number; v: number }[], t0: number, t1: number) {
  let s = 0, w = 0;
  const ov = fs.map((f) => Math.max(0, Math.min(t1, f.t + f.largura / 2) - Math.max(t0, f.t - f.largura / 2)));
  fs.forEach((f, i) => { s += ov[i] * f.v; w += ov[i]; });
  if (w > 1e-9) return { v: s / w, ov, w };
  const mais = fs.reduce((b, f) => (Math.abs(f.t - (t0 + t1) / 2) < Math.abs(b.t - (t0 + t1) / 2) ? f : b), fs[0]);
  return { v: mais.v, ov, w };
}
/** Esforços por metro: alinhamentos (análise, mínimos, redistribuição), média nas placas e envoltória do pano. */
export function registrarAlveolarEsforcos(mem: Registrador, el: string, x: CtxAlvEsforcos) {
  const t = 'Esforços por metro';
  x.faixas.forEach((f, i) => {
    P(mem, el, 'esforcos', t, { descricao: `Alinhamento ${i + 1} (t = ${fm(f.t)} m, L = ${fm(f.L)} m): envoltória ELU da grelha por metro${x.processo === 2 ? ' com a fase 1 (placa isostática sob o peso próprio)' : ''}, mínimos do tipo de vão (${f.tipo}) e redistribuição dos negativos`, formula: 'p = (V1 + V2)/ℓ; M+ ≥ p·ℓ²/divisor+; M− ≤ −p·ℓ²/divisor−; δ = máx(1 − r/100; δmín), M−′ = δ·M−, M+′ = M+ + ΣΔM/2', expressao: `análise: M+ = ${fm(f.calc.mPos)}; M− = ${fm(f.calc.mNeg[0])} / ${fm(f.calc.mNeg[1])} kN·m/m; V = ${fm(f.calc.v[0])} / ${fm(f.calc.v[1])} kN/m; pisos: +${fm(f.pisoPos)} / ${fm(f.pisoNeg)}; após mínimos${f.rd?.aplicada ? ` e redistribuição (δ = ${fm(f.rd.delta)})` : ''}: M+ = ${fm(f.esf.mPos)}; M− = ${fm(f.esf.mNeg[0])} / ${fm(f.esf.mNeg[1])} kN·m/m`, resultado: f.esf.mPos, unidade: 'kN·m/m', norma: `${NBR}, 14.6.4.3`, aConfirmar: true, entradas: { t: f.t, largura: f.largura, L: f.L, mPosA: f.calc.mPos, mNegA0: f.calc.mNeg[0], mNegA1: f.calc.mNeg[1], v0: f.calc.v[0], v1: f.calc.v[1], divisorPos: f.divisorPos, divisorNeg: f.divisorNeg, pisoPos: f.pisoPos, pisoNeg: f.pisoNeg, mPosM: f.min.mPos, mNegM0: f.min.mNeg[0], mNegM1: f.min.mNeg[1], aplicada: f.rd?.aplicada ? 1 : 0, delta: f.rd?.delta ?? 1, pct: f.rd?.pct ?? 0, deltaMin: f.rd?.deltaMin ?? 0, cont0: f.rd?.continuas[0] ? 1 : 0, cont1: f.rd?.continuas[1] ? 1 : 0, mPos: f.esf.mPos, mNeg0: f.esf.mNeg[0], mNeg1: f.esf.mNeg[1], tipo: f.tipo } });
  });
  const campos: { id: string; rot: string; un: string; sel: (f: FaixaAlv) => number; ext: (p: PlacaEnv) => number }[] = [
    { id: 'mPos', rot: 'M+', un: 'kN·m/m', sel: (f) => f.esf.mPos, ext: (p) => p.env.mPos },
    { id: 'mNeg0', rot: 'M− início', un: 'kN·m/m', sel: (f) => f.esf.mNeg[0], ext: (p) => p.env.mNeg[0] },
    { id: 'mNeg1', rot: 'M− fim', un: 'kN·m/m', sel: (f) => f.esf.mNeg[1], ext: (p) => p.env.mNeg[1] },
    { id: 'v0', rot: 'V início', un: 'kN/m', sel: (f) => f.esf.v[0], ext: (p) => p.env.v[0] },
    { id: 'v1', rot: 'V fim', un: 'kN/m', sel: (f) => f.esf.v[1], ext: (p) => p.env.v[1] },
    { id: 'mEnd0', rot: 'M+ na ponta inicial', un: 'kN·m/m', sel: (f) => f.mEnd[0], ext: (p) => p.env.mEnd[0] },
    { id: 'mEnd1', rot: 'M+ na ponta final', un: 'kN·m/m', sel: (f) => f.mEnd[1], ext: (p) => p.env.mEnd[1] },
  ];
  for (const pl of x.placas) {
    const tp = `Placa ${pl.indice + 1}`;
    const mp = mediaPonderada(x.faixas.map((f) => ({ t: f.t, largura: f.largura, v: f.esf.mPos })), pl.t0, pl.t1);
    const ent: Record<string, number | string> = { t0: pl.t0, t1: pl.t1, n: x.faixas.length, ms: pl.ms };
    x.faixas.forEach((f, i) => { ent[`t_${i}`] = f.t; ent[`w_${i}`] = f.largura; ent[`ov_${i}`] = mp.ov[i]; });
    for (const cm of campos) x.faixas.forEach((f, i) => { ent[`${cm.id}_${i}`] = cm.sel(f); });
    const msP = mediaPonderada(x.serv.map((f) => ({ t: f.t, largura: f.largura, v: f.ms })), pl.t0, pl.t1);
    ent.nS = x.serv.length;
    x.serv.forEach((f, i) => { ent[`ms_${i}`] = f.ms; ent[`tS_${i}`] = f.t; ent[`wS_${i}`] = f.largura; ent[`ovS_${i}`] = msP.ov[i]; });
    for (const cm of campos) ent[`r_${cm.id}`] = cm.ext(pl);
    P(mem, el, 'esforcos', t, { descricao: `${tp} (faixa t = ${fm(pl.t0)} a ${fm(pl.t1)} m, largura ${fm(pl.largura)} m): esforços por metro como média dos alinhamentos ponderada pela sobreposição com a placa`, formula: 'S = Σ ovᵢ·Sᵢ / Σ ovᵢ, ovᵢ = máx(0; mín(t1; tᵢ + wᵢ/2) − máx(t0; tᵢ − wᵢ/2)); sem sobreposição, o alinhamento mais próximo do centro', expressao: `${campos.map((cm) => `${cm.rot} = ${fm(cm.ext(pl))}`).join('; ')}; serviço: Ms = ${fm(pl.ms)} kN·m/m`, resultado: pl.env.mPos, unidade: 'kN·m/m', norma: 'Critério do programa (envoltória por metro de faixa)', aConfirmar: true, entradas: ent });
  }
  const e = x.envPano;
  P(mem, el, 'esforcos', t, { descricao: 'Envoltória do pano: máximos entre as placas (positivo, negativos, cortantes, momentos nas pontas e serviço)', formula: 'Md+ = máx M+ das placas; Md− = mín M−; Vd = máx V; Ms = máx Ms', expressao: `M+ = ${fm(e.mPos)}; M− = ${fm(e.mNeg[0])} / ${fm(e.mNeg[1])} kN·m/m; V = ${fm(e.v[0])} / ${fm(e.v[1])} kN/m; Ms = ${fm(x.MsPano)} kN·m/m`, resultado: e.mPos, unidade: 'kN·m/m', norma: 'Critério do programa', entradas: { mPos: e.mPos, mNeg0: e.mNeg[0], mNeg1: e.mNeg[1], v0: e.v[0], v1: e.v[1], mEnd0: e.mEnd[0], mEnd1: e.mEnd[1], Ms: x.MsPano, nPlacas: x.placas.length, ...Object.fromEntries(x.placas.flatMap((p, i) => [[`pmPos_${i}`, p.env.mPos], [`pmNeg0_${i}`, p.env.mNeg[0]], [`pmNeg1_${i}`, p.env.mNeg[1]], [`pv0_${i}`, p.env.v[0]], [`pv1_${i}`, p.env.v[1]], [`pmEnd0_${i}`, p.env.mEnd[0]], [`pmEnd1_${i}`, p.env.mEnd[1]], [`pms_${i}`, p.ms]])) } });
}
export { mediaPonderada as mediaPonderadaAlveolar };

export interface PontaVer {
  k: 0 | 1; M: number; Vd: number; mEnd: number; VRdPos: number | null; semNeg: boolean;
  res: { VRd: number | null; VRdDesc: number | null; Mdesc: number | null };
  ed: { phi: number; s: number } | null;
  linhas: { phi: number; s: number; Mu: number; VRd: number | null }[];
  origem: 'editado' | 'ficha' | 'ficha-sem-cortante' | 'secao' | null;
  secao: { AsNec: number | null; AsMin: number; alvo: number; sec: BeamSection } | null;
  escolha: { phi: number; s: number; AsNec: number; AsAdotada: number; Mu: number; fonte: string; ok: boolean } | null;
  VRd: number | null; regiao: 'positiva' | 'negativa'; okCort: boolean;
  /** Comprimento: faixa que governa, x0, decalagem, ancoragem, automático, final, barras na largura. */
  comp: { Lk: number; x0: number; al: number; lb: number; pct: number; arredOp: number; decalagem: number; auto: number; final: number; editado: boolean; barras: number; larguraPano: number } | null;
}
export interface CtxAlvVerificacao {
  dem: { mPos: number; mNeg: [number, number]; v: [number, number]; ms: number }; demanda: { mPos: number; mNeg: [number, number]; v: [number, number]; ms: number; mEnd: [number, number] };
  ratioELU: number; ratioServico: number;
  Mu: number | null; flexao: boolean | null;
  servico: { nivel: string; Madm: number | null; Mdesc: number | null; ok: boolean | null } | null;
  pontas: PontaVer[]; c: Concrete; fydSup: number; dNeg: number; altura: number; hfInf: number | null; bwAlma: number | null; capa: number;
}
export function registrarAlveolarVerificacao(mem: Registrador, el: string, x: CtxAlvVerificacao) {
  const tf = 'Flexão positiva e serviço';
  P(mem, el, 'dimensionamento', tf, { descricao: 'Demanda da placa adotada: envoltória do pano × razão entre as cargas de cálculo da placa e da adotada (1 para a adotada)', formula: 'Sd = S·(qELU,placa/qELU,adotada); Ms = Ms·(qserv,placa/qserv,adotada)', expressao: `M+ = ${fm(x.dem.mPos)}; M− = ${fm(x.dem.mNeg[0])} / ${fm(x.dem.mNeg[1])} kN·m/m; V = ${fm(x.dem.v[0])} / ${fm(x.dem.v[1])} kN/m; Ms = ${fm(x.dem.ms)} kN·m/m`, resultado: x.dem.mPos, unidade: 'kN·m/m', norma: 'Critério do programa', entradas: { mPos: x.demanda.mPos, mNeg0: x.demanda.mNeg[0], mNeg1: x.demanda.mNeg[1], v0: x.demanda.v[0], v1: x.demanda.v[1], ms: x.demanda.ms, ratioELU: x.ratioELU, ratioServico: x.ratioServico, dMPos: x.dem.mPos, dV0: x.dem.v[0], dV1: x.dem.v[1], dMs: x.dem.ms } });
  if (x.Mu !== null) P(mem, el, 'dimensionamento', tf, { descricao: 'Flexão positiva: momento último da placa (ficha, por metro de largura) × momento de cálculo', formula: 'Md+ ≤ Mu', expressao: `Md+ = ${fm(x.dem.mPos)} kN·m/m ${x.flexao ? '≤' : '>'} Mu = ${fm(x.Mu)} kN·m/m (aproveitamento ${fm(x.dem.mPos / x.Mu)})`, resultado: x.dem.mPos / x.Mu, unidade: '', norma: 'Dado do fabricante (ficha)', aConfirmar: true, entradas: { Md: x.dem.mPos, Mu: x.Mu, ok: x.flexao ? 1 : 0 } });
  if (x.servico) {
    const s = x.servico;
    P(mem, el, 'dimensionamento', tf, { descricao: `Serviço da protensão (${s.nivel}): momento de serviço × admissível da ficha para o nível`, formula: 'Ms ≤ Madm(nível)', expressao: s.Madm === null ? 'Madm não informado na ficha: verificação não feita' : `Ms = ${fm(x.dem.ms)} kN·m/m ${s.ok ? '≤' : '>'} Madm = ${fm(s.Madm)} kN·m/m`, resultado: x.dem.ms, unidade: 'kN·m/m', norma: `${NBR}, Tabela 13.4`, aConfirmar: true, entradas: { Ms: x.dem.ms, Madm: s.Madm ?? 'n/d', Mdesc: s.Mdesc ?? 'n/d', ok: s.ok === null ? 'n/d' : s.ok ? 1 : 0 } });
  }
  const c = x.c;
  for (const p of x.pontas) {
    const pt = p.k ? 'final' : 'inicial', t = `Ponta ${pt}`;
    P(mem, el, 'dimensionamento', t, { descricao: `Cortante resistente da flexão positiva: VRd da ficha, ou o da seção descomprimida quando o momento positivo na ponta não passa de Mdesc`, formula: 'VRd+ = VRd,desc se M+,ponta ≤ Mdesc; senão VRd', expressao: `M+,ponta = ${fm(p.mEnd)} kN·m/m → VRd+ = ${p.VRdPos === null ? 'não informado' : `${fm(p.VRdPos)} kN/m`}`, resultado: p.VRdPos ?? 0, unidade: 'kN/m', norma: 'Dado do fabricante (ficha)', aConfirmar: true, entradas: { mEnd: p.mEnd, VRdPos: p.VRdPos ?? 'n/d', Vd: p.Vd, VRd: p.res.VRd ?? 'n/d', VRdDesc: p.res.VRdDesc ?? 'n/d', Mdesc: p.res.Mdesc ?? 'n/d' } });
    if (p.semNeg) {
      P(mem, el, 'dimensionamento', t, { descricao: 'Sem negativo de cálculo na ponta (|M−| < 0,01 kN·m/m): só o cortante da flexão positiva', formula: 'Vd ≤ VRd+', expressao: `Vd = ${fm(p.Vd)} kN/m ${p.okCort ? '≤' : '>'} VRd+ = ${p.VRdPos === null ? '—' : fm(p.VRdPos)} kN/m`, resultado: p.Vd, unidade: 'kN/m', norma: 'Dado do fabricante (ficha)', entradas: { Vd: p.Vd, VRd: p.VRdPos ?? 'n/d', ok: p.okCort ? 1 : 0 } });
      continue;
    }
    P(mem, el, 'dimensionamento', t, { descricao: `Momento negativo de cálculo na ponta ${pt} (módulo)${p.ed ? '; negativo editado pelo usuário' : ''}`, formula: 'Md− = |M−|', expressao: `Md− = ${fm(p.M)} kN·m/m`, resultado: p.M, unidade: 'kN·m/m', entradas: { M: p.M, Vd: p.Vd } });
    if (p.origem === 'editado') P(mem, el, 'dimensionamento', t, { descricao: `Negativo atribuído φ${fm(p.ed!.phi)} c/${fm(p.ed!.s * 100)} cm: Mu da linha da ficha ou, sem linha, pela seção`, formula: 'Mu ≥ Md−', expressao: `Mu = ${fm(p.escolha!.Mu)} kN·m/m ${p.escolha!.ok ? '≥' : '<'} Md− = ${fm(p.M)} kN·m/m`, resultado: p.escolha!.Mu, unidade: 'kN·m/m', norma: 'Atribuição do usuário', entradas: { M: p.M, Mu: p.escolha!.Mu, phi: p.ed!.phi, s: p.ed!.s, AsAdotada: p.escolha!.AsAdotada, ok: p.escolha!.ok ? 1 : 0 } });
    else if (p.origem === 'ficha' || p.origem === 'ficha-sem-cortante') {
      const e: Record<string, number | string> = { M: p.M, Vd: p.Vd, n: p.linhas.length };
      p.linhas.forEach((q, i) => { e[`Mu_${i}`] = q.Mu; e[`VRd_${i}`] = q.VRd ?? 'n/d'; e[`phi_${i}`] = q.phi; e[`s_${i}`] = q.s; });
      P(mem, el, 'dimensionamento', t, { descricao: `Linhas de armadura negativa da ficha (por Mu crescente): a primeira com Mu ≥ Md− e VRd ≥ Vd${p.origem === 'ficha-sem-cortante' ? '; nenhuma atende ao cortante, adotada a primeira com Mu ≥ Md−' : ''}`, formula: 'linha = primeira com Mu ≥ Md− e (VRd não informado ou VRd ≥ Vd)', expressao: `${p.linhas.map((q) => `φ${fm(q.phi)} c/${fm(q.s * 100)}: Mu = ${fm(q.Mu)}${q.VRd !== null ? `, VRd = ${fm(q.VRd)}` : ''}`).join('; ')} → φ${fm(p.escolha!.phi)} c/${fm(p.escolha!.s * 100)} cm (Mu = ${fm(p.escolha!.Mu)})`, resultado: p.escolha!.Mu, unidade: 'kN·m/m', norma: 'Dado do fabricante (ficha)', aConfirmar: true, entradas: { ...e, phi: p.escolha!.phi, s: p.escolha!.s, Mu: p.escolha!.Mu, ssemCortante: p.origem === 'ficha-sem-cortante' ? 1 : 0 } });
    } else if (p.secao) {
      const sc = p.secao;
      if (p.linhas.length) P(mem, el, 'dimensionamento', t, { descricao: `Md− = ${fm(p.M)} kN·m/m passa da maior linha da ficha (${fm(p.linhas.at(-1)!.Mu)} kN·m/m): negativo calculado pela seção`, formula: 'Md− > Mu,máx da ficha', expressao: `Md− = ${fm(p.M)} > ${fm(p.linhas.at(-1)!.Mu)}`, resultado: p.M, unidade: 'kN·m/m', norma: 'Dado do fabricante (ficha)', aConfirmar: true, entradas: { M: p.M, MuMax: p.linhas.at(-1)!.Mu } });
      flexao(mem, el, t, { c, sec: sc.sec, taxaMin: 0, b: 1, h: x.altura }, p.M, x.dNeg, 0.03, x.fydSup, true, sc.AsNec ?? 0, false, { un: 'kN·m/m', semMinimo: true });
      P(mem, el, 'dimensionamento', t, { descricao: sc.AsNec === null ? 'Flexão exige armadura de compressão: sem solução com as bitolas da capa' : 'Armadura negativa: máx(As,flexão; ρmín·capa); menor combinação φ/s (φ6,3 a φ16; s 10 a 20 cm) que cobre', formula: 'As,alvo = máx(As; ρmín·hcapa); φ/s com π·φ²/(4s) ≥ As,alvo', expressao: sc.AsNec === null ? `Md− = ${fm(p.M)} kN·m/m` : `As,alvo = máx(${fm((sc.AsNec) * 1e4)}; ${fm(sc.AsMin * 1e4)}) = ${fm(sc.alvo * 1e4)} cm²/m → ${p.escolha ? `φ${fm(p.escolha.phi)} c/${fm(p.escolha.s * 100)} cm (${fm(p.escolha.AsAdotada * 1e4)} cm²/m)` : 'nenhuma até φ16 c/10'}`, resultado: p.escolha?.AsAdotada ?? 0, unidade: 'm²/m', norma: `${NBR}, 19.3.3.2`, aConfirmar: true, entradas: { AsFlexao: sc.AsNec ?? 'n/d', AsMin: sc.AsMin, alvo: sc.alvo, phi: p.escolha?.phi ?? 0, s: p.escolha?.s ?? 0, AsAdotada: p.escolha?.AsAdotada ?? 0, rhoMin: 0.0015, capa: x.capa } });
      if (p.escolha && p.escolha.ok) {
        const hfInf = x.hfInf, bwA = x.bwAlma;
        P(mem, el, 'dimensionamento', t, { descricao: 'Momento último do negativo adotado pela seção (banzo inferior comprimido: T invertido ou retângulo, sem armadura de compressão)', formula: 'Mu = MRd(As,adotada): y = As·fyd/(σcd·bf) ≤ hf → σcd·bf·y·(d − y/2); senão mesa + alma', expressao: `Mu = ${fm(p.escolha.Mu)} kN·m/m`, resultado: p.escolha.Mu, unidade: 'kN·m/m', norma: `${NBR}, 17.2.2`, entradas: { Mu: p.escolha.Mu, As: p.escolha.AsAdotada, sigmaCd: c.sigmaCd, lambda: c.lambda, xLim: c.xLimRatio, bf: 1, hf: hfInf && bwA ? hfInf : x.altura, bw: hfInf && bwA ? bwA : 1, d: x.dNeg, fyd: x.fydSup } });
      }
    }
    P(mem, el, 'dimensionamento', t, { descricao: `Cortante na flexão negativa: VRd da linha da ficha (ou, sem ele, o da flexão positiva) × Vd`, formula: 'Vd ≤ VRd', expressao: `Vd = ${fm(p.Vd)} kN/m ${p.okCort ? '≤' : '>'} VRd = ${p.VRd === null ? 'não informado' : `${fm(p.VRd)} kN/m`}`, resultado: p.Vd, unidade: 'kN/m', norma: 'Dado do fabricante (ficha)', entradas: { Vd: p.Vd, VRd: p.VRd ?? 'n/d', ok: p.okCort ? 1 : 0 } });
    const cp = p.comp;
    if (cp) P(mem, el, 'detalhamento', t, { descricao: `Comprimento do negativo na ponta ${pt}${cp.editado ? ' (atribuído)' : ''}: máx(% do vão; ponto de momento nulo + decalagem + ancoragem), arredondado e limitado ao vão da faixa que governa; barras na largura do pano`, formula: 'C = mín(L; ⌈máx(pct·L; x0 + aℓ + lb)⌉); n = ⌈B/s⌉', expressao: `aℓ = ${fm(cp.decalagem)}·${fm(x.dNeg)} = ${fm(cp.al)} m; C = mín(${fm(cp.Lk)}; ⌈máx(${fm(cp.pct)}·${fm(cp.Lk)}; ${fm(cp.x0)} + ${fm(cp.al)} + ${fm(cp.lb)})⌉) = ${fm(cp.auto)} m${cp.editado ? `; atribuído: ${fm(cp.final)} m` : ''}; n = ⌈${fm(cp.larguraPano)}/${fm(p.escolha?.s ?? 0)}⌉ = ${cp.barras}`, resultado: cp.final, unidade: 'm', norma: `${NBR}, 9.4.2.5 e 18.3.2.3`, aConfirmar: true, entradas: { Lk: cp.Lk, x0: cp.x0, al: cp.al, lb: cp.lb, pct: cp.pct, arred: cp.arredOp, auto: cp.auto, final: cp.final, B: cp.larguraPano, s: p.escolha?.s ?? 0, barras: cp.barras, d: x.dNeg, decalagem: cp.decalagem } });
  }
}

export interface CtxAlvEscolha {
  candidatas: { placa: string; altura: number; Mu: number | null; adequada: boolean; motivos: string[]; adotada: boolean; escolhida: boolean }[];
  adotada: string; escolhida: string | null; fixa: boolean; trocar: boolean; adequadaAdotada: boolean | null;
}
export function registrarAlveolarEscolha(mem: Registrador, el: string, x: CtxAlvEscolha) {
  const ent: Record<string, number | string> = { n: x.candidatas.length, fixa: x.fixa ? 1 : 0, trocar: x.trocar ? 1 : 0, adequadaAdotada: x.adequadaAdotada === null ? 'n/d' : x.adequadaAdotada ? 1 : 0 };
  x.candidatas.forEach((q, i) => { ent[`placa_${i}`] = q.placa; ent[`Mu_${i}`] = q.Mu ?? 'n/d'; ent[`adequada_${i}`] = q.adequada ? 1 : 0; ent[`escolhida_${i}`] = q.escolhida ? 1 : 0; });
  P(mem, el, 'dimensionamento', 'Escolha da placa', { descricao: 'Placas da ficha na ordem de escolha (mesma altura primeiro, por Mu crescente): a primeira que atende (Mu, serviço, negativos e cortante, com o peso próprio de cada uma)', formula: 'placa = primeira adequada; fixada pelo usuário: mantém a adotada se atende', expressao: `${x.candidatas.map((q) => `${q.placa}${q.Mu !== null ? ` (Mu ${fm(q.Mu)})` : ''}: ${q.adequada ? 'atende' : `não atende — ${q.motivos.join('; ')}`}`).join('. ')} → ${x.escolhida ?? 'nenhuma'}${x.trocar ? ` (a adotada ${x.adotada} também pode ser trocada)` : ''}`, resultado: x.escolhida ?? 'nenhuma', unidade: '', norma: 'Critério do programa (ficha do fabricante)', aConfirmar: true, entradas: ent });
}

export interface PlacaApoio { numero: string; largura: number; Lmax: number; bI: number; bF: number; compI: boolean; compF: boolean; dispI: number | null; dispF: number | null; adotI: number; adotF: number; apoioMin: number; apoioMax: number; comprimento: number; situacao: string[]; cortada: boolean; obliqua: boolean }
export interface CtxAlvPlacas {
  placas: PlacaApoio[]; junta: number; lateral: { viga: number; disponivel: number | null; ok: boolean }[]; apoioMin: number;
  capa: { espessura: number; minima: number; ok: boolean; AsMinTela: number; rhoMin: number };
  quant: { numeroPlacas: number; areaPlacas: number; pesoM2: number; pesoPlacas: number; areaPano: number; volume: number; concretoLocal: number; negativos: { phi: number; comprimento: number; peso: number }[]; lista: { largura: number; comprimento: number; quantidade: number }[] };
  repeticoes: number;
}
export function registrarAlveolarPlacas(mem: Registrador, el: string, x: CtxAlvPlacas) {
  const t = 'Placas e apoios';
  for (const p of x.placas) {
    P(mem, el, 'detalhamento', t, { descricao: `Placa ${p.numero} (${fm(p.largura * 100)} cm${p.cortada ? ', cortada' : ''}${p.obliqua ? ', oblíqua' : ''}): apoio em cada ponta (viga disponível: bw − 2 cm; viga compartilhada: bw/2 − junta/2; limitado ao máximo da ficha) e comprimento da peça`, formula: 'a = máx(0; mín(amáx; disp)); C = ⌈(Lmáx − b1/2 − b2/2 + a1 + a2)·100⌉/100', expressao: `apoios ${p.adotI === undefined ? '' : `${fm(p.adotI * 100)} / ${fm(p.adotF * 100)} cm`} (disponível ${p.dispI === null ? '—' : fm(p.dispI * 100)} / ${p.dispF === null ? '—' : fm(p.dispF * 100)} cm; mín ${fm(p.apoioMin * 100)}, máx ${fm(p.apoioMax * 100)}); C = ⌈${fm(p.Lmax)} − ${fm(p.bI)}/2 − ${fm(p.bF)}/2 + ${fm(p.adotI)} + ${fm(p.adotF)}⌉ = ${fm(p.comprimento)} m${p.situacao.some((s) => s !== 'ok') ? `; situação: ${p.situacao.join(' / ')}` : ''}`, resultado: p.comprimento, unidade: 'm', norma: 'Dado do fabricante (ficha)', aConfirmar: true, entradas: { Lmax: p.Lmax, bI: p.bI, bF: p.bF, compI: p.compI ? 1 : 0, compF: p.compF ? 1 : 0, junta: x.junta, dispI: p.dispI ?? 'n/d', dispF: p.dispF ?? 'n/d', adotI: p.adotI, adotF: p.adotF, apoioMin: p.apoioMin, apoioMax: p.apoioMax, comprimento: p.comprimento } });
  }
  x.lateral.forEach((l, i) => P(mem, el, 'detalhamento', t, { descricao: `Apoio lateral da placa de borda ${i ? 'final' : 'inicial'} (sobreposição sobre a viga paralela às placas)`, formula: 'disp = bw − 2 cm ≥ apoio mínimo', expressao: l.disponivel === null ? 'sem viga paralela' : `disp = ${fm(l.viga)} − 0,02 = ${fm(l.disponivel)} m ${l.ok ? '≥' : '<'} ${fm(x.apoioMin)} m`, resultado: l.disponivel ?? 0, unidade: 'm', norma: 'Dado do fabricante (ficha)', aConfirmar: true, entradas: { viga: l.viga, disp: l.disponivel ?? 'n/d', apoioMin: x.apoioMin, ok: l.ok ? 1 : 0 } }));
  const cp = x.capa;
  P(mem, el, 'dimensionamento', 'Capa', { descricao: 'Capa de concreto moldada no local: espessura × mínimo das opções e armadura mínima da tela', formula: 'hcapa ≥ hmín; As,mín = ρmín·hcapa', expressao: `hcapa = ${fm(cp.espessura * 100)} cm ${cp.minima <= 0 || cp.ok ? '≥' : '<'} ${fm(cp.minima * 100)} cm; As,mín = ${fm(cp.rhoMin)}·${fm(cp.espessura)}·10⁴ = ${fm(cp.AsMinTela)} cm²/m`, resultado: cp.AsMinTela, unidade: 'cm²/m', norma: `${NBR}, 19.3.3.2`, aConfirmar: true, entradas: { espessura: cp.espessura, minima: cp.minima, ok: cp.ok ? 1 : 0, rhoMin: cp.rhoMin, AsMinTela: cp.AsMinTela } });
  const q = x.quant, tq = 'Quantitativo';
  P(mem, el, 'detalhamento', tq, { descricao: `Placas do pano: ${q.numeroPlacas} peça(s), área (largura × comprimento), peso (área × peso por m²) e concreto moldado no local (área do pano × volume por m²); repetido em ${x.repeticoes} pavimento(s)`, formula: 'A = Σ b·C; P = A·pesoM2; V = Apano·volume', expressao: `A = ${fm(q.areaPlacas)} m²; P = ${fm(q.areaPlacas)}·${fm(q.pesoM2)} = ${fm(q.pesoPlacas)} kN; V = ${fm(q.areaPano)}·${fm(q.volume)} = ${fm(q.concretoLocal)} m³`, resultado: q.pesoPlacas, unidade: 'kN', norma: 'Dado do fabricante (ficha)', entradas: { n: q.numeroPlacas, areaPlacas: q.areaPlacas, pesoM2: q.pesoM2, pesoPlacas: q.pesoPlacas, areaPano: q.areaPano, volume: q.volume, concretoLocal: q.concretoLocal, repeticoes: x.repeticoes, ...Object.fromEntries(q.lista.flatMap((l, i) => [[`b_${i}`, l.largura], [`C_${i}`, l.comprimento], [`q_${i}`, l.quantidade]])) } });
  for (const n of q.negativos) P(mem, el, 'detalhamento', tq, { descricao: `Aço dos negativos φ${fm(n.phi)}: comprimento total (barras × comprimento) e peso (por pavimento, sem perdas)`, formula: 'm = Σ n·C·π·φ²/4·7850', expressao: `L = ${fm(n.comprimento)} m; m = ${fm(n.peso)} kg`, resultado: n.peso, unidade: 'kg', norma: `${NBR}, 9.4`, entradas: { phi: n.phi, comprimento: n.comprimento, peso: n.peso } });
}
