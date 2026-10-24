// Memória detalhada (MD fase 3): vigotas das lajes treliçadas (treliça + armadura adicional, igualação em grupos, redistribuição,
// flexão em T, negativos sobre os apoios, cortante, maciçamento, flecha de montagem e distribuição na capa). Chamada por
// `dimensionarVigotas` só com a memória ligada, com os mesmos números usados no cálculo.
import { barArea, type BeamSection, type Concrete } from '../concrete';
import { fm, type Registrador } from './registrador';
import { flexao } from './vigaConcreto';
import type { CasoFat } from './nervurada';

const NBR = 'NBR 6118:2023';
type Chave = Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>;
const P = (mem: Registrador, el: string, etapa: 'cargas' | 'esforcos' | 'dimensionamento' | 'detalhamento', topico: string, p: Chave) => mem.passo({ etapa, elemento: el, topico, ...p });
const fk = (c: Concrete, sec: BeamSection, h: number, b: number) => ({ c, sec, taxaMin: 0, b, h });
const barras = (b: { n: number; phi: number } | null) => (b && b.n ? `${b.n}φ${fm(b.phi)}` : 'sem adicional');

export interface CtxVigBase {
  nome: string; pavimentos: string; modelo: string; trelica: string; phiBanzo: number; AsBanzo: number; fyd60: number; AsTrel: number;
  intereixo: number; bw: number; capa: number; hEnch: number; h: number; pp: number; nVigotas: number; nGrupos: number; capaMin: number; rhoMin: number; AsMin: number;
  c: Concrete; fydInf: number; fydSup: number; acoInf: string; acoSup: string; gs: number; cobInf: number; cobSup: number; dI: number; dS: number;
  elu: CasoFat[]; bloqueada: boolean;
}
/** Cargas, geometria, treliça, mínimos, materiais e alturas úteis. */
export function registrarVigotasBase(mem: Registrador, el: string, x: CtxVigBase) {
  const c = x.c, gc = c.fck / c.fcd;
  P(mem, el, 'cargas', 'Geometria e treliça', { descricao: `Laje treliçada ${x.nome} (${x.pavimentos}), modelo ${x.modelo}: peso próprio por m² da geometria (vigota, enchimento e capa)`, formula: 'pp (geometria do modelo)', expressao: `pp = ${fm(x.pp)} kN/m²; ${x.nVigotas} vigotas em ${x.nGrupos} grupo(s) de igualação`, resultado: x.pp, unidade: 'kN/m²', norma: 'NBR 6120:2019', entradas: { pp: x.pp, nVigotas: x.nVigotas, nGrupos: x.nGrupos } });
  P(mem, el, 'cargas', 'Geometria e treliça', { descricao: 'Seção da nervura: intereixo (mesa), largura da nervura, capa, altura de enchimento e altura total', formula: 'h = capa + hEnch; seção T com mesa = intereixo', expressao: `intereixo ${fm(x.intereixo)} m; bw ${fm(x.bw)} m; capa ${fm(x.capa)} m; hEnch ${fm(x.hEnch)} m → h = ${fm(x.h)} m`, resultado: x.h, unidade: 'm', norma: `${NBR}, 13.2.4.2`, entradas: { intereixo: x.intereixo, bw: x.bw, capa: x.capa, hEnch: x.hEnch, h: x.h } });
  P(mem, el, 'dimensionamento', 'Geometria e treliça', { descricao: 'Capa mínima: máx(4 cm; distância livre entre nervuras/15)', formula: 'hf,mín = máx(0,04; (intereixo − bw)/15)', expressao: `hf,mín = máx(0,04; (${fm(x.intereixo)} − ${fm(x.bw)})/15) = ${fm(x.capaMin)} m ${x.capa >= x.capaMin - 1e-9 ? '≤' : '>'} hf = ${fm(x.capa)} m`, resultado: x.capaMin, unidade: 'm', norma: `${NBR}, 13.2.4.2`, entradas: { intereixo: x.intereixo, bw: x.bw } });
  P(mem, el, 'dimensionamento', 'Geometria e treliça', { descricao: `Banzo inferior da treliça ${x.trelica} (2φ${fm(x.phiBanzo)} CA-60) e área equivalente no aço da armadura inferior (${x.acoInf})`, formula: 'As,tr = 2·π·φ²/4; As,tr,eq = As,tr·(fyd,CA-60/fyd)', expressao: `As,tr = ${fm(x.AsBanzo)} cm²; As,tr,eq = ${fm(x.AsBanzo)}·${fm(x.fyd60)}/${fm(x.fydInf)} = ${fm(x.AsTrel)} cm²`, resultado: x.AsTrel, unidade: 'cm²', norma: `${NBR}, 17.2`, entradas: { phi: x.phiBanzo, fyd60: x.fyd60, fydInf: x.fydInf, gs: x.gs } });
  P(mem, el, 'dimensionamento', 'Geometria e treliça', { descricao: 'Armadura mínima por nervura (ρmín da laje sobre a seção T)', formula: 'As,mín = ρmín·(intereixo·hf + bw·hEnch)', expressao: `As,mín = ${fm(x.rhoMin)}·(${fm(x.intereixo)}·${fm(x.capa)} + ${fm(x.bw)}·${fm(x.hEnch)})·10⁴ = ${fm(x.AsMin)} cm²`, resultado: x.AsMin, unidade: 'cm²', norma: `${NBR}, 19.3.3.2`, aConfirmar: true, entradas: { rhoMin: x.rhoMin, intereixo: x.intereixo, capa: x.capa, bw: x.bw, hEnch: x.hEnch } });
  const tm = 'Materiais e alturas úteis';
  P(mem, el, 'dimensionamento', tm, { descricao: 'Resistência de cálculo do concreto', formula: 'fcd = fck / γc', expressao: `fcd = ${fm(c.fck)} / ${fm(gc)} = ${fm(c.fcd)}`, resultado: c.fcd, unidade: 'MPa', norma: `${NBR}, 12.3.3`, entradas: { fck: c.fck, gc } });
  P(mem, el, 'dimensionamento', tm, { descricao: 'Resistência de cálculo à tração', formula: 'fctd = 0,7·fct,m / γc', expressao: `fctd = 0,7·${fm(c.fctm)} / ${fm(gc)} = ${fm(c.fctd)}`, resultado: c.fctd, unidade: 'MPa', norma: `${NBR}, 8.2.5`, entradas: { fctm: c.fctm, gc } });
  P(mem, el, 'dimensionamento', tm, { descricao: `Resistência de cálculo do aço (inferior ${x.acoInf}; superior ${x.acoSup})`, formula: 'fyd = fyk / γs', expressao: `fyd,inf = ${fm(x.fydInf)} MPa; fyd,sup = ${fm(x.fydSup)} MPa`, resultado: x.fydInf, unidade: 'MPa', norma: `${NBR}, 12.3.3`, entradas: { fydInf: x.fydInf, fydSup: x.fydSup } });
  P(mem, el, 'dimensionamento', tm, { descricao: 'Alturas úteis (φ10 de referência)', formula: 'd = h − c − 0,005', expressao: `d,inf = ${fm(x.h)} − ${fm(x.cobInf)} − 0,005 = ${fm(x.dI)} m; d,sup = ${fm(x.h)} − ${fm(x.cobSup)} − 0,005 = ${fm(x.dS)} m`, resultado: x.dI, unidade: 'm', norma: `${NBR}, 7.4.7.6`, entradas: { h: x.h, cobInf: x.cobInf, cobSup: x.cobSup } });
  P(mem, el, 'esforcos', 'Fatores de ponderação', { descricao: `Fatores ELU por caso (esforços das vigotas)${x.bloqueada ? '; armadura bloqueada pelo usuário' : ''}`, formula: 'γi por caso de carga', expressao: x.elu.map((q) => `${q.caso}: ${fm(q.f)}`).join('; ') || '—', resultado: 'ELU', unidade: '', norma: 'NBR 8681:2003, 5.1.3', entradas: Object.fromEntries(x.elu.map((q) => [`γ_${q.caso}`, q.f])) });
}

export interface EsfV { mPos: number; mNeg: [number, number]; v: [number, number] }
export interface CtxVigNegativo {
  M: number; MRdN: number; MRdM: number; macico: number; bwEf: number; fn: { As: number; double: boolean }; AsN: number; br: { n: number; phi: number; As: number } | null;
  trava: { n: number; phi: number } | null; x0: number; al: number; lb: number; lbBase: number; comprimento: number; L: number; vao: number; arred: number; decalagem: number; pctVao: number;
}
export interface CtxVigCortante { Vsd: number; V1: number; V2: number; macico: number; As1: number; d: number; V1m: number; V2m: number }
export interface CtxVigGrupo {
  gi: number; nFaixas: number; vigotas: number; L: number; criterio: number; difPct: number; porArea: boolean;
  eg: EsfV; red: { delta: number; aplicada: boolean; pct: number; deltaMin: number; continuas: [boolean, boolean] } | null; esf: EsfV;
  sec: BeamSection; c: Concrete; fydInf: number; fydSup: number; dI: number; dS: number; bw: number; intereixo: number; h: number; capa: number; hEnch: number;
  fl: { As: number; double: boolean }; AsMin: number; AsTrel: number; AsNec: number; AsAd: number; barras: { n: number; phi: number; As: number } | null; trava: { n: number; phi: number } | null; comprimento: number;
  negativos: (CtxVigNegativo | null)[]; cortante: CtxVigCortante[]; macico: [number, number];
}
/** Um grupo de vigotas: esforços do grupo, redistribuição, flexão em T, adicional, negativos, cortante e maciçamento. */
export function registrarGrupoVigotas(mem: Registrador, el: string, x: CtxVigGrupo) {
  const tp = `Grupo ${x.gi + 1}`, ent = (o: Record<string, number | string>) => o;
  P(mem, el, 'esforcos', `${tp} – esforços`, { descricao: `Grupo ${x.gi + 1}: ${x.nFaixas} alinhamento(s) da grelha e ${x.vigotas} vigota(s), comprimento médio ponderado ${fm(x.L)} m; igualação ${x.criterio > 0 ? `(critério ${fm(x.criterio)}, diferença ≤ ${fm(x.difPct)} %${x.porArea ? ', pela área de aço' : ''})` : 'desligada'}`, formula: 'esforços do grupo = igualação dos mínimos/analisados dos alinhamentos', expressao: `M+ = ${fm(x.eg.mPos)}; M− = ${fm(x.eg.mNeg[0])} / ${fm(x.eg.mNeg[1])} kN·m; V = ${fm(x.eg.v[0])} / ${fm(x.eg.v[1])} kN (por nervura)`, resultado: x.eg.mPos, unidade: 'kN·m', norma: 'NBR 6118, 14.7 (critério do programa)', entradas: ent({ nFaixas: x.nFaixas, vigotas: x.vigotas, L: x.L, mPos: x.eg.mPos, mNeg0: x.eg.mNeg[0], mNeg1: x.eg.mNeg[1], v0: x.eg.v[0], v1: x.eg.v[1] }) });
  if (x.red?.aplicada) {
    const r = x.red, dm = x.eg.mNeg.reduce((t, m, k) => t + (r.continuas[k] && m < -1e-9 ? -m * (1 - r.delta) : 0), 0);
    P(mem, el, 'esforcos', `${tp} – esforços`, { descricao: `Redistribuição dos negativos das pontas contínuas (δ = ${fm(r.delta, 3)}; pedido ${fm(r.pct)} %; δmín = ${fm(r.deltaMin)}): cada negativo × δ e o positivo cresce da metade da soma das reduções`, formula: 'δ = máx(1 − r/100; δmín); M−′ = δ·M−; M+′ = M+ + ΣΔM/2', expressao: `ΔM = ${fm(dm)} kN·m; M+′ = ${fm(x.eg.mPos)} + ${fm(dm)}/2 = ${fm(x.esf.mPos)} kN·m; M−′ = ${fm(x.esf.mNeg[0])} / ${fm(x.esf.mNeg[1])} kN·m`, resultado: x.esf.mPos, unidade: 'kN·m', norma: `${NBR}, 14.6.4.3`, entradas: { pct: r.pct, deltaMin: r.deltaMin, delta: r.delta, cont0: r.continuas[0] ? 1 : 0, cont1: r.continuas[1] ? 1 : 0, mPos: x.eg.mPos, mNeg0: x.eg.mNeg[0], mNeg1: x.eg.mNeg[1] } });
  }
  // positivo
  const tpP = `${tp} – flexão positiva`;
  flexao(mem, el, tpP, fk(x.c, x.sec, x.h, x.bw), x.esf.mPos, x.dI, 0.03, x.fydInf, true, x.fl.As, true, { semMinimo: true });
  P(mem, el, 'dimensionamento', tpP, { descricao: 'Armadura necessária por nervura e adicional (descontado o banzo inferior da treliça)', formula: 'As,nec = máx(As,flexão; As,mín) (se M+ > 0); As,ad = máx(0; As,nec − As,tr,eq)', expressao: `As,nec = máx(${fm(x.fl.As * 1e4)}; ${fm(x.esf.mPos > 0 ? x.AsMin : 0)}) = ${fm(x.AsNec)} cm²; As,ad = máx(0; ${fm(x.AsNec)} − ${fm(x.AsTrel)}) = ${fm(x.AsAd)} cm²`, resultado: x.AsAd, unidade: 'cm²', norma: `${NBR}, 17.3.5.2`, entradas: { AsFlexao: x.fl.As * 1e4, AsMin: x.AsMin, M: x.esf.mPos, AsTrel: x.AsTrel, AsNec: x.AsNec } });
  P(mem, el, 'detalhamento', tpP, { descricao: x.trava ? `Armadura inferior bloqueada pelo usuário: ${barras(x.trava)}` : 'Armadura adicional adotada (menor combinação de 1 ou 2 barras φ6,3 a φ12,5 que cobre o necessário)', formula: 'As,ef = n·π·φ²/4 ≥ As,ad', expressao: `${barras(x.barras)}: As,ef = ${fm(x.barras?.As ?? 0)} cm² ${x.barras && x.barras.As >= x.AsAd - 1e-6 ? '≥' : '<'} ${fm(x.AsAd)} cm²; comprimento ${fm(x.comprimento)} m`, resultado: x.barras?.As ?? 0, unidade: 'cm²', norma: `${NBR}, 18.3.2.2`, entradas: { AsAd: x.AsAd, n: x.barras?.n ?? 0, phi: x.barras?.phi ?? 0, comprimento: x.comprimento } });
  // negativos e cortante por ponta
  const bwN = (n: CtxVigNegativo) => n.bwEf;
  [0, 1].forEach((k) => {
    const n = x.negativos[k], cv = x.cortante[k], pt = k ? 'final' : 'inicial';
    if (n) {
      const t = `${tp} – negativo na ponta ${pt}`, y = x.c.lambda * x.c.xLimRatio * x.dS;
      P(mem, el, 'dimensionamento', t, { descricao: 'Momentos resistentes da seção sem armadura de compressão (x = x,lim): da nervura e da faixa maciçada (largura = intereixo)', formula: 'MRd = σcd·b·λ·x,lim·(d − λ·x,lim/2)', expressao: `MRd,nervura = ${fm(n.MRdN)}; MRd,maciço = ${fm(n.MRdM)} kN·m; Md = ${fm(n.M)} kN·m → ${n.M > n.MRdN ? `maciçar ${fm(n.macico * 100)} cm` : 'nervura resiste'}`, resultado: n.MRdN, unidade: 'kN·m', norma: `${NBR}, 17.2.2`, entradas: { sigmaCd: x.c.sigmaCd, bw: x.bw, intereixo: x.intereixo, lambda: x.c.lambda, xLim: x.c.xLimRatio, d: x.dS, y, M: n.M, MRdN: n.MRdN, MRdM: n.MRdM, macico: n.macico } });
      flexao(mem, el, t, fk(x.c, { kind: 'rect', bw: bwN(n), h: x.h }, x.h, bwN(n)), n.M, x.dS, 0.03, x.fydSup, false, n.fn.As, false, { semMinimo: true });
      P(mem, el, 'dimensionamento', t, { descricao: 'Armadura negativa necessária e adotada', formula: 'As = máx(As,flexão; As,mín); n·φ ≥ As', expressao: `As = máx(${fm(n.fn.As * 1e4)}; ${fm(x.AsMin)}) = ${fm(n.AsN)} cm² → ${n.trava ? 'bloqueada ' : ''}${barras(n.br)}`, resultado: n.AsN, unidade: 'cm²', norma: `${NBR}, 17.3.5.2`, entradas: { AsFlexao: n.fn.As * 1e4, AsMin: x.AsMin, AsN: n.AsN, n: n.br?.n ?? 0, phi: n.br?.phi ?? 0, As: n.br?.As ?? 0 } });
      P(mem, el, 'detalhamento', t, { descricao: 'Comprimento do negativo a partir do eixo do apoio: máx(% do vão; ponto de momento nulo + decalagem + ancoragem), arredondado e limitado ao vão', formula: 'lb,nec = máx(lb·As/As,ef; 0,3·lb; 10φ; 10 cm); C = mín(L; ⌈máx(pct·L; x0 + aℓ + lb,nec)⌉)', expressao: `lb,nec = ${fm(n.lb)} m; aℓ = ${fm(n.decalagem)}·${fm(x.dS)} = ${fm(n.al)} m; x0 = ${fm(n.x0)} m; C = ${fm(n.comprimento)} m`, resultado: n.comprimento, unidade: 'm', norma: `${NBR}, 9.4.2.5 e 18.3.2.3`, entradas: { lbBase: n.lbBase, AsN: n.AsN, AsEf: n.br?.As || n.AsN, phi: n.br?.phi || 12.5, x0: n.x0, al: n.al, pct: n.pctVao, L: n.L, arred: n.arred, comprimento: n.comprimento } });
    }
    const t = `${tp} – cortante na ponta ${pt}`;
    P(mem, el, 'dimensionamento', t, { descricao: `Resistências por nervura sem armadura transversal (19.4.1) com a armadura tracionada da ponta (${fm(cv.As1 * 1e4)} cm²)`, formula: 'VRd1 = 0,25·fctd·k·(1,2 + 40ρ1)·bw·d (k = máx(1; 1,6 − d); ρ1 ≤ 0,02); VRd2 = 0,5·αv1·fcd·bw·0,9d (αv1 = mín(0,5; 0,7 − fck/200))', expressao: `VRd1 = ${fm(cv.V1)}; VRd2 = ${fm(cv.V2)}; Vsd = ${fm(cv.Vsd)} kN ${cv.Vsd > Math.min(cv.V1, cv.V2) ? `> mín → maciçar ${fm(cv.macico * 100)} cm` : '≤ mín(VRd1; VRd2)'}`, resultado: cv.V1, unidade: 'kN', norma: `${NBR}, 19.4.1`, entradas: { fctd: x.c.fctd, fcd: x.c.fcd, fck: x.c.fck, bw: x.bw, d: cv.d, As1: cv.As1, V1: cv.V1, V2: cv.V2, Vsd: cv.Vsd, V1m: cv.V1m, V2m: cv.V2m, intereixo: x.intereixo, macico: cv.macico } });
    P(mem, el, 'dimensionamento', t, { descricao: 'Faixa maciçada necessária na ponta (maior entre a flexão negativa e o cortante)', formula: 'maciço = máx(maciço,flexão; maciço,cortante)', expressao: `maciço = ${fm(x.macico[k] * 100)} cm`, resultado: x.macico[k], unidade: 'm', entradas: { flexao: n?.macico ?? 0, cortante: cv.macico, macico: x.macico[k] } });
  });
}

export interface CtxVigLaje {
  montagem?: { escoras: number; vao: number; flecha: number; limite: number; q: number; EI: number; L: number; ok: boolean; Mvao: number; reacaoEscora: number; dist: number; pp: number; construcao: number; intereixo: number; divisor: number };
  AsPrinc: number; AsDist: number; phiD: number; sD: number; capa: number; bitolaMinima: number; ca60: boolean;
  posicoes: { tipo: string; phi: number; n: number; comprimento: number }[]; peso: number; repeticoes: number;
}
/** Flecha de montagem da vigota sobre escoras, distribuição na capa e quantitativo. */
export function registrarVigotasLaje(mem: Registrador, el: string, x: CtxVigLaje) {
  const m = x.montagem;
  if (m) {
    P(mem, el, 'dimensionamento', 'Montagem sobre escoras', { descricao: `Vigota de ${fm(m.L)} m com ${m.escoras} escora(s) intermediária(s): carga linear da laje fresca + construção por vigota`, formula: 'q = (pp + q_construção)·intereixo; escoras = ⌈L/dist⌉ − 1; vão = L/(escoras + 1)', expressao: `q = (${fm(m.pp)} + ${fm(m.construcao)})·${fm(m.intereixo)} = ${fm(m.q)} kN/m; vão entre apoios = ${fm(m.vao)} m`, resultado: m.q, unidade: 'kN/m', norma: 'Critério do programa (C7.102)', aConfirmar: true, entradas: { pp: m.pp, construcao: m.construcao, intereixo: m.intereixo, L: m.L, dist: m.dist, escoras: m.escoras, vao: m.vao } });
    P(mem, el, 'dimensionamento', 'Montagem sobre escoras', { descricao: 'Flecha máxima de montagem (vãos iguais, três momentos; rigidez da vigota isolada) e limite', formula: 'sem escora: f = 5·q·L⁴/(384·EI); limite = vão/divisor', expressao: `f = ${fm(m.flecha * 1000)} mm ${m.ok ? '≤' : '>'} limite = ${fm(m.vao)}/${fm(m.divisor)} = ${fm(m.limite * 1000)} mm; EI = ${fm(m.EI)} kN·m²`, resultado: m.flecha, unidade: 'm', norma: 'Critério do programa (C7.102)', aConfirmar: true, entradas: { q: m.q, L: m.L, EI: m.EI, escoras: m.escoras, vao: m.vao, flecha: m.flecha, divisor: m.divisor, limite: m.limite, Mvao: m.Mvao, reacaoEscora: m.reacaoEscora } });
  }
  P(mem, el, 'dimensionamento', 'Distribuição na capa', { descricao: 'Armadura de distribuição da capa (laje em uma direção): máx(20 % da principal por metro; 0,9 cm²/m; 0,5·ρmín·hf)', formula: 'As,dist = máx(0,2·As,princ; 0,9; 0,5·0,0015·hf·10⁴)', expressao: `As,princ = ${fm(x.AsPrinc)} cm²/m; As,dist = ${fm(x.AsDist)} cm²/m`, resultado: x.AsDist, unidade: 'cm²/m', norma: `${NBR}, 20.1 e Tabela 19.1`, aConfirmar: true, entradas: { AsPrinc: x.AsPrinc, hf: x.capa } });
  P(mem, el, 'detalhamento', 'Distribuição na capa', { descricao: `Barras: φ${fm(x.phiD)} com espaçamento entre 5 e 33 cm`, formula: 's = máx(5; mín(33; ⌊As,φ/As,dist·100⌋)) cm', expressao: `φ${fm(x.phiD)} c/${fm(x.sD * 100)} cm`, resultado: x.sD, unidade: 'm', entradas: { AsFi: barArea(x.phiD) * 1e4, AsDist: x.AsDist, phi: x.phiD, s: x.sD } });
}
