// Memória detalhada (MD fase 1): cadeia do pilar de concreto armado (lance) do módulo Edifícios. Chamada por
// `dimensionarPilares` só com a memória ligada, com os números do cálculo (esforços da combinação determinante,
// excentricidades, esbeltez, 2ª ordem local, flexão oblíqua por fibras, armadura e cortante).
import type { Concrete } from '../concrete';
import { cm2, fm, fp, type Registrador } from './registrador';

/** Intermediários do pilar-padrão numa direção (os mesmos de `direcao` em dimensionamento.ts). */
export interface DirecaoPilar { tot: number; M1: number; M2: number; MA: number; MB: number; MAi: number; M1min: number; ab: number; lam1: number; nu: number; curv: number; e: number }

export interface ChequeOblíqua { rotulo: string; Nd: number; mu: number; mv: number; R: number | null; util: number }

export interface CtxMemoriaPilar {
  elemento: string;
  w: number; h: number; circ: number | null; Ac: number; Iu: number; Iv: number; iu: number; iv: number;
  fl: { l: number; l0: number; hTopo: number; leU: number; leV: number; aU: number; aV: number; desligados: [number, number] };
  lamU: number; lamV: number; gn: number; c: Concrete; fyd: number; taxaMin: number;
  metodo: [string, string]; ecc: [number, number];
  NdMax: number; AsMin: number; AsMax: number;
  det: { nome: string; tracao: boolean; Nd: number; Mu: number[]; Mv: number[]; Mi: [number, number]; ponta: 0 | 1; parcelasN: [string, number, number][] } | null;
  dirU: DirecaoPilar | null; dirV: DirecaoPilar | null; geral: [boolean, boolean];
  cheques: ChequeOblíqua[]; util: number;
  As: number; phi: number; nBarras: number; armadura: string; bloq: boolean;
  cortante: { dir: string; Vsd: number; Vc: number; VRd2: number; asw: number; combinacao: string; bw: number; d: number }[];
  est: { phi: number; s: number }; phiTmin: number; sTmax: number;
  /** Menor armadura que atende em cada bitola testada, com a opção de ordem por taxa (R8b). */
  ordemTaxa?: { phi: number; As: number }[];
  /** E5m: lance dividido por vigas em desnível. `fl`, λ, esforços e cheques são os do trecho `trechoDet` (maior utilização). */
  trechos?: TrechoPilar[]; trechoDet?: number; trechoEsbelto?: number;
}

/** Um trecho do lance (E5m): ℓe, λ, maior Nd, esforços da combinação determinante do trecho e utilização com a armadura adotada. */
export interface TrechoPilar {
  de: number; ate: number; leU: number; leV: number; iu: number; iv: number; lamU: number; lamV: number; metodo: [string, string];
  NdMax: number; combinacao: string; tracao: boolean; Nd: number; Mu: number[]; Mv: number[]; util: number;
}

const NBR = 'NBR 6118:2023';

export function registrarPilar(mem: Registrador, x: CtxMemoriaPilar) {
  const el = x.elemento;
  if (!mem.aceita(el)) return;
  const c = x.c;
  const P = (etapa: 'esforcos' | 'dimensionamento' | 'detalhamento', topico: string, p: Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>) => mem.passo({ etapa, elemento: el, topico, ...p });

  // ---- E5m: trechos do lance
  const nT = x.trechos?.length ?? 0, kT = x.trechoDet ?? 0, sufT = nT > 1 ? ` (trecho ${kT + 1} de ${nT})` : '';
  if (x.trechos && nT > 1) {
    const tt = 'Trechos do lance (vigas em desnível)';
    const mm = (v: number) => fm(v);
    P('dimensionamento', tt, { descricao: 'Divisão do lance pelos nós das vigas em desnível: a armadura do lance atende a todos os trechos', formula: 'trecho k entre os nós intermediários; util do lance = máx(util_k)', expressao: x.trechos.map((t, k) => `${k + 1}: ${mm(t.de)} a ${mm(t.ate)} m`).join('; '), resultado: nT, unidade: '', norma: 'E5m (K1.12.4-19)', entradas: { trechos: nT } });
    x.trechos.forEach((t, k) => {
      const ent = { trecho: k + 1, de: t.de, ate: t.ate, leU: t.leU, leV: t.leV, iu: t.iu, iv: t.iv, lamU: t.lamU, lamV: t.lamV };
      P('dimensionamento', tt, { descricao: `Trecho ${k + 1} (${mm(t.de)} a ${mm(t.ate)} m): comprimentos de flambagem e esbeltez`, formula: 'λ = ℓe/i, por direção', expressao: `λu = ${mm(t.leU)}/${mm(t.iu)} = ${mm(t.lamU)}; λv = ${mm(t.leV)}/${mm(t.iv)} = ${mm(t.lamV)}`, resultado: Math.max(t.lamU, t.lamV), unidade: '', norma: `${NBR}, 15.6 e 15.8.2`, entradas: ent });
      P('dimensionamento', tt, { descricao: `Trecho ${k + 1}: combinação determinante ${t.combinacao} e utilização com a armadura adotada ${x.armadura}`, formula: 'util_k = máx das verificações S1/S2 (ou da tração) do trecho', expressao: `${t.tracao ? 'Nt' : 'Nd'} = ${mm(t.Nd)} kN (Nd,máx = ${mm(t.NdMax)}); Mu = (${mm(t.Mu[0])}; ${mm(t.Mu[1])}); Mv = (${mm(t.Mv[0])}; ${mm(t.Mv[1])}); util = ${mm(t.util)}`, resultado: t.util, unidade: '', norma: `${NBR}, 17.2.5`, entradas: { trecho: k + 1, combinacao: t.combinacao, Nd: t.Nd, NdMax: t.NdMax, MuBase: t.Mu[0], MuTopo: t.Mu[1], MvBase: t.Mv[0], MvTopo: t.Mv[1], util: t.util } });
    });
    const ue = x.trechos[kT].util;
    P('dimensionamento', tt, { descricao: `Trecho determinante: o de maior utilização (trecho ${kT + 1}); o de maior esbeltez é o ${(x.trechoEsbelto ?? 0) + 1}`, formula: 'util do lance = máx(util_k)', expressao: `util = máx(${x.trechos.map((t) => mm(t.util)).join('; ')}) = ${mm(ue)}`, resultado: ue, unidade: '', entradas: { trechoDet: kT + 1, trechoEsbelto: (x.trechoEsbelto ?? 0) + 1, util: ue } });
  }

  // ---- geometria e esbeltez
  const tg = 'Geometria e esbeltez';
  P('dimensionamento', tg, { descricao: 'Área da seção', formula: x.circ ? 'Ac = π·D²/4' : 'Ac = b·h', expressao: x.circ ? `Ac = π·${fm(x.circ)}²/4 = ${fm(x.Ac)}` : `Ac = ${fm(x.w)}·${fm(x.h)} = ${fm(x.Ac)}`, resultado: x.Ac, unidade: 'm²', entradas: x.circ ? { D: x.circ } : { b: x.w, h: x.h } });
  P('dimensionamento', tg, { descricao: 'Raios de giração (u ao longo de b, v ao longo de h)', formula: 'i = √(I/A)', expressao: `iu = √(${fm(x.Iu)}/${fm(x.Ac)}) = ${fm(x.iu)}; iv = √(${fm(x.Iv)}/${fm(x.Ac)}) = ${fm(x.iv)}`, resultado: x.iu, unidade: 'm', entradas: { Iu: x.Iu, Iv: x.Iv, A: x.Ac } });
  if (nT > 1) {
    const lef = (rot: 'u' | 'v', le: number, al: number, dim: number) => P('dimensionamento', tg, { descricao: `Comprimento de flambagem na direção ${rot}${sufT}`, formula: 'ℓe = α·mín(ℓ0 + dimensão; ℓ), com ℓ e ℓ0 medidos entre os nós que travam a direção (nós de vigas em desnível)', expressao: `ℓe,${rot} = ${fm(al)}·${fm(al > 0 ? le / al : le)} = ${fm(le)}`, resultado: le, unidade: 'm', norma: `${NBR}, 15.6`, entradas: { le, alfa: al, dimensao: dim } });
    lef('u', x.fl.leU, x.fl.aU, x.w); lef('v', x.fl.leV, x.fl.aV, x.h);
  } else {
  P('dimensionamento', tg, { descricao: 'Comprimento de flambagem na direção u', formula: 'ℓe = α·mín(ℓ0 + b; ℓ), ℓ0 = ℓ − h,viga', expressao: `ℓe,u = ${fm(x.fl.aU)}·mín(${fm(x.fl.l0)} + ${fm(x.w)}; ${fm(x.fl.l)}) = ${fm(x.fl.leU)}${x.fl.desligados[0] > 1 ? ` (${x.fl.desligados[0]} lances desligados)` : ''}`, resultado: x.fl.leU, unidade: 'm', norma: `${NBR}, 15.6`, entradas: { l: x.fl.l, l0: x.fl.l0, b: x.w, alfa: x.fl.aU } });
  P('dimensionamento', tg, { descricao: 'Comprimento de flambagem na direção v', formula: 'ℓe = α·mín(ℓ0 + h; ℓ)', expressao: `ℓe,v = ${fm(x.fl.aV)}·mín(${fm(x.fl.l0)} + ${fm(x.h)}; ${fm(x.fl.l)}) = ${fm(x.fl.leV)}${x.fl.desligados[1] > 1 ? ` (${x.fl.desligados[1]} lances desligados)` : ''}`, resultado: x.fl.leV, unidade: 'm', norma: `${NBR}, 15.6`, entradas: { l: x.fl.l, l0: x.fl.l0, h: x.h, alfa: x.fl.aV } });
  }
  P('dimensionamento', tg, { descricao: `Índice de esbeltez na direção u${sufT}`, formula: 'λ = ℓe/i', expressao: `λu = ${fm(x.fl.leU)}/${fm(x.iu)} = ${fm(x.lamU)}`, resultado: x.lamU, unidade: '', norma: `${NBR}, 15.8.2`, entradas: { le: x.fl.leU, i: x.iu } });
  P('dimensionamento', tg, { descricao: `Índice de esbeltez na direção v${sufT}`, formula: 'λ = ℓe/i', expressao: `λv = ${fm(x.fl.leV)}/${fm(x.iv)} = ${fm(x.lamV)}`, resultado: x.lamV, unidade: '', norma: `${NBR}, 15.8.2`, entradas: { le: x.fl.leV, i: x.iv } });
  if (x.gn > 1) P('dimensionamento', tg, { descricao: 'Coeficiente adicional para seção com menor dimensão < 19 cm', formula: 'γn = 1,95 − 0,05·b (b em cm)', expressao: `γn = ${fm(x.gn)}`, resultado: x.gn, unidade: '', norma: `${NBR}, 13.2.3 (Tabela 13.1)`, entradas: { bmin: Math.min(x.w, x.h) } });
  P('dimensionamento', tg, { descricao: 'Método dos efeitos locais de 2ª ordem por direção', formula: 'λ ≤ 90: pilar-padrão com curvatura aproximada; 90 < λ ≤ 140: o mesmo com fluência; λ > 140: método geral', expressao: `u: ${x.metodo[0]}; v: ${x.metodo[1]}`, resultado: `${x.metodo[0]} / ${x.metodo[1]}`, unidade: '', norma: `${NBR}, 15.8.3 e 15.8.4`, entradas: { lamU: x.lamU, lamV: x.lamV } });
  if (x.ecc[0] || x.ecc[1]) P('dimensionamento', tg, { descricao: 'Excentricidade de fluência (combinação quase permanente)', formula: 'ecc = (MSg/NSg + ea)·[2,718^(φ·NSg/(Ne − NSg)) − 1], Ne = 10·Eci·Ic/ℓe²', expressao: `ecc,u = ${fm(x.ecc[0])}; ecc,v = ${fm(x.ecc[1])}`, resultado: Math.max(x.ecc[0], x.ecc[1]), unidade: 'm', norma: `${NBR}, 15.8.4`, entradas: { eccU: x.ecc[0], eccV: x.ecc[1] } });

  // ---- esforços da combinação determinante
  const d = x.det;
  if (d) {
    const te = 'Esforços da combinação determinante';
    const soma = d.parcelasN.map(([n, f, v]) => `${fm(f)}·${fp(-v)} [${n}]`).join(' + ');
    const ent: Record<string, number | string> = { combinacao: d.nome, gn: x.gn };
    d.parcelasN.forEach(([n, f, v]) => { ent[`γ_${n}`] = f; ent[`Nk_${n}`] = -v; });
    P('esforcos', te, { descricao: `Normal de cálculo (${d.tracao ? 'tração' : 'compressão'} +) na ${d.ponta === 0 ? 'base' : 'topo'} do lance, combinação ${d.nome}`, formula: 'Nd = γn·Σ γi·Nk,i', expressao: `Nd = ${fm(x.gn)}·(${soma}) = ${fm(d.Nd)}`, resultado: d.Nd, unidade: 'kN', norma: 'NBR 8681:2003, 5.1.3', entradas: ent });
    P('esforcos', te, { descricao: 'Momentos de 1ª ordem nas pontas (base, topo), direção u (flexão ao longo de b)', formula: 'Mu = γn·Σ γi·Mk,i', expressao: `Mu = (${fm(d.Mu[0])}; ${fm(d.Mu[1])})`, resultado: Math.max(Math.abs(d.Mu[0]), Math.abs(d.Mu[1])), unidade: 'kN·m', entradas: { MuBase: d.Mu[0], MuTopo: d.Mu[1] } });
    P('esforcos', te, { descricao: 'Momentos de 1ª ordem nas pontas (base, topo), direção v', formula: 'Mv = γn·Σ γi·Mk,i', expressao: `Mv = (${fm(d.Mv[0])}; ${fm(d.Mv[1])})`, resultado: Math.max(Math.abs(d.Mv[0]), Math.abs(d.Mv[1])), unidade: 'kN·m', entradas: { MvBase: d.Mv[0], MvTopo: d.Mv[1] } });
  }

  // ---- 2ª ordem local (pilar-padrão) por direção
  const dir = (rot: 'u' | 'v', q: DirecaoPilar | null, hDir: number, le: number, lam: number, geral: boolean) => {
    if (!q || !d) return;
    const t = `2ª ordem local – direção ${rot}`;
    P('dimensionamento', t, { descricao: 'Momento mínimo de 1ª ordem', formula: 'M1d,mín = Nd·(0,015 + 0,03·h)', expressao: `M1d,mín = ${fm(d.Nd)}·(0,015 + 0,03·${fm(hDir)}) = ${fm(q.M1min)}`, resultado: q.M1min, unidade: 'kN·m', norma: `${NBR}, 11.3.3.4.3`, entradas: { Nd: d.Nd, h: hDir } });
    P('dimensionamento', t, { descricao: 'Coeficiente αb (momentos das pontas; MA < M1d,mín ou carga transversal → 1)', formula: 'αb = 0,60 + 0,40·MB/MA, 0,40 ≤ αb ≤ 1,0', expressao: `MA = ${fm(q.MA)}, MB = ${fm(q.MB)} → αb = ${fm(q.ab)}`, resultado: q.ab, unidade: '', norma: `${NBR}, 15.8.2`, entradas: { MA: q.MA, MB: q.MB, MAi: q.MAi, M1min: q.M1min } });
    P('dimensionamento', t, { descricao: 'Esbeltez limite', formula: 'λ1 = (25 + 12,5·e1/h)/αb, 35 ≤ λ1 ≤ 90, e1 = MA/Nd', expressao: `λ1 = (25 + 12,5·(${fm(q.MAi)}/${fm(d.Nd)})/${fm(hDir)})/${fm(q.ab)} → ${fm(q.lam1)}; λ = ${fm(lam)}`, resultado: q.lam1, unidade: '', norma: `${NBR}, 15.8.2`, entradas: { MA: q.MAi, Nd: d.Nd, h: hDir, ab: q.ab } });
    P('dimensionamento', t, { descricao: 'Força normal adimensional', formula: 'ν = Nd/(Ac·fcd)', expressao: `ν = ${fm(d.Nd)}/1000/(${fm(x.Ac)}·${fm(c.fcd)}) = ${fm(q.nu)}`, resultado: q.nu, unidade: '', norma: `${NBR}, 15.8.3.3.2`, entradas: { Nd: d.Nd, Ac: x.Ac, fcd: c.fcd } });
    if (lam > q.lam1) {
      P('dimensionamento', t, { descricao: 'Curvatura aproximada', formula: '1/r = 0,005/[h·(ν + 0,5)] ≤ 0,005/h', expressao: `1/r = 0,005/[${fm(hDir)}·(${fm(q.nu)} + 0,5)] → ${fm(q.curv)}`, resultado: q.curv, unidade: '1/m', norma: `${NBR}, 15.8.3.3.2`, entradas: { h: hDir, nu: q.nu } });
      P('dimensionamento', t, { descricao: 'Momento de 2ª ordem local', formula: 'M2d = Nd·ℓe²/10·(1/r)', expressao: `M2d = ${fm(d.Nd)}·${fm(le)}²/10·${fm(q.curv)} = ${fm(q.M2)}`, resultado: q.M2, unidade: 'kN·m', norma: `${NBR}, 15.8.3.3.2`, entradas: { Nd: d.Nd, le, curv: q.curv } });
    } else P('dimensionamento', t, { descricao: 'λ ≤ λ1: dispensa dos efeitos locais de 2ª ordem', formula: 'M2d = 0', expressao: `λ = ${fm(lam)} ≤ λ1 = ${fm(q.lam1)}`, resultado: 0, unidade: 'kN·m', norma: `${NBR}, 15.8.2`, entradas: { lam, lam1: q.lam1 } });
    if (q.e) P('dimensionamento', t, { descricao: 'Acréscimo da fluência', formula: 'M1 = máx(MA; M1d,mín) + Nd·ecc', expressao: `M1 = ${fm(q.M1)}`, resultado: q.M1, unidade: 'kN·m', norma: `${NBR}, 15.8.4`, entradas: { Nd: d.Nd, ecc: q.e } });
    P('dimensionamento', t, geral
      ? { descricao: 'Momento total pelo método geral (integração M–N–1/r da seção armada)', formula: 'Md,tot = máx(M do método geral; M1)', expressao: `Md,tot = ${fm(q.tot)}`, resultado: q.tot, unidade: 'kN·m', norma: `${NBR}, 15.8.3.2`, entradas: { M1: q.M1 } }
      : { descricao: 'Momento total de cálculo', formula: 'Md,tot = máx[αb·máx(MA; M1d,mín) + M2d; máx(MA; M1d,mín)]', expressao: `Md,tot = máx(${fm(q.ab)}·${fm(q.M1)} + ${fm(q.M2)}; ${fm(q.M1)}) = ${fm(q.tot)}`, resultado: q.tot, unidade: 'kN·m', norma: `${NBR}, 15.8.3.3.2`, entradas: { ab: q.ab, M1: q.M1, M2: q.M2 } });
  };
  dir('u', x.dirU, x.circ ?? x.w, x.fl.leU, x.lamU, x.geral[0]);
  dir('v', x.dirV, x.circ ?? x.h, x.fl.leV, x.lamV, x.geral[1]);

  // ---- flexão composta oblíqua (fibras)
  const tf = 'Flexão composta oblíqua';
  for (const q of x.cheques) P('dimensionamento', tf, { descricao: `${q.rotulo}: momento resistente na direção do momento solicitante (integração por fibras, parábola-retângulo, armadura ${x.armadura})`, formula: 'util = √(Mu² + Mv²)/MRd(Nd, direção) ≤ 1', expressao: q.R === null ? `Nd = ${fm(q.Nd)} kN fora do intervalo resistente → util = 99` : `util = √(${fm(q.mu)}² + ${fm(q.mv)}²)/1000/${fm(q.R)} = ${fm(q.util)}`, resultado: q.util, unidade: '', norma: `${NBR}, 17.2.5`, entradas: { Nd: q.Nd, mu: q.mu, mv: q.mv, ...(q.R !== null ? { MRd: q.R } : {}) }, observacao: 'MRd em MN·m.' });
  P('dimensionamento', tf, { descricao: 'Utilização da seção (maior das verificações S1/S2 da combinação determinante)', formula: 'util = máx(util_i)', expressao: `util = ${fm(x.util)} ${x.util <= 1 ? '≤' : '>'} 1`, resultado: x.util, unidade: '', norma: `${NBR}, 17.2.5`, entradas: {} });

  // ---- armadura longitudinal
  const ta = 'Armadura longitudinal';
  P('dimensionamento', ta, { descricao: 'Armadura mínima', formula: `As,mín = máx(0,15·Nd/fyd; ${fm(x.taxaMin)} %·Ac)`, expressao: `As,mín = máx(0,15·${fm(x.NdMax)}/1000/${fm(x.fyd)}; ${fm(x.taxaMin / 100)}·${fm(x.Ac)}) = ${cm2(x.AsMin)}`, resultado: x.AsMin, unidade: 'm²', norma: `${NBR}, 17.3.5.3.1`, entradas: { Nd: x.NdMax, fyd: x.fyd, taxa: x.taxaMin, Ac: x.Ac } });
  P('dimensionamento', ta, { descricao: 'Armadura máxima', formula: 'As,máx = 4 %·Ac', expressao: `As,máx = 0,04·${fm(x.Ac)} = ${cm2(x.AsMax)}`, resultado: x.AsMax, unidade: 'm²', norma: `${NBR}, 17.3.5.3.2`, entradas: { Ac: x.Ac } });
  if (x.ordemTaxa?.length && !x.bloq) P('detalhamento', ta, { descricao: 'Disposições testadas em ordem crescente de taxa (menor armadura que atende, por bitola)', formula: 'As = mín over φ(As que atende); empate: menor φ', expressao: x.ordemTaxa.map((q) => `φ${fm(q.phi)}: ${cm2(q.As)}`).join('; ') + ` → ${cm2(x.As)}`, resultado: x.As, unidade: 'm²', norma: 'Critério do programa de referência (K1.12.4-2)', entradas: Object.fromEntries(x.ordemTaxa.map((q) => [`As_${q.phi}`, q.As])) });
  P('detalhamento', ta, { descricao: `Armadura adotada${x.bloq ? ' (bloqueada)' : ''}`, formula: 'As = n·π·φ²/4, As,mín ≤ As ≤ As,máx', expressao: `As = ${x.nBarras}·π·(${fm(x.phi / 1000)})²/4 = ${cm2(x.As)}`, resultado: x.As, unidade: 'm²', norma: `${NBR}, 18.4.2`, entradas: { n: x.nBarras, phi: x.phi } });

  // ---- cortante e estribos
  const tc = 'Cortante e estribos';
  for (const q of x.cortante) {
    P('dimensionamento', tc, { descricao: `Direção ${q.dir}: biela (combinação ${q.combinacao})`, formula: 'VRd2 = 0,27·αv2·fcd·bw·d ≥ VSd', expressao: `VRd2 = 0,27·${fm(c.av2)}·${fm(c.fcd)}·${fm(q.bw)}·${fm(q.d)}·1000 = ${fm(q.VRd2)} ${q.Vsd <= q.VRd2 ? '≥' : '<'} ${fm(q.Vsd)}`, resultado: q.VRd2, unidade: 'kN', norma: `${NBR}, 17.4.2.2`, entradas: { av2: c.av2, fcd: c.fcd, bw: q.bw, d: q.d, VSd: q.Vsd } });
    P('dimensionamento', tc, { descricao: `Direção ${q.dir}: parcela do concreto na flexo-compressão`, formula: 'Vc = Vc0·(1 + M0/MSd,máx) ≤ 2·Vc0, Vc0 = 0,6·fctd·bw·d (tração: Vc = 0)', expressao: `Vc = ${fm(q.Vc)}; Asw/s = ${fm(q.asw * 1e4)} cm²/m`, resultado: q.Vc, unidade: 'kN', norma: `${NBR}, 17.4.2.2 c`, entradas: { Vsd: q.Vsd, asw: q.asw } });
  }
  P('detalhamento', tc, { descricao: `Estribo adotado φ${fm(x.est.phi)} c/${fm(x.est.s * 100, 3)} cm`, formula: 'φt ≥ máx(5 mm; φℓ/4); s ≤ mín(20 cm; menor dimensão; 12·φℓ)', expressao: `φt,mín = ${fm(x.phiTmin)} mm; smáx = ${fm(x.sTmax)} m`, resultado: x.est.s, unidade: 'm', norma: `${NBR}, 18.4.3`, entradas: { phi: x.est.phi, s: x.est.s, phiL: x.phi } });
}
