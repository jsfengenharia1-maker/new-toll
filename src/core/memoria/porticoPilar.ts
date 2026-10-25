// Memória detalhada do pórtico 2D (MD8): cadeia do pilar de concreto armado (retangular, circular ou poligonal) e da
// viga com flexo-compressão (ν > 0,10). Registrada por `runDesign` só com a memória ligada, a partir do `ColumnDesign`
// (que guarda os intermediários de cada combinação) e dos esforços de cada combinação ELU.
import { P } from '../math';
import { barArea, type ColumnCombo, type ColumnDesign, type Concrete, type ShearResult } from '../concrete';
import { sampleXs } from '../estacoes';
import { circlePolygon, polyProps } from '../fiber';
import type { DesignSettings } from '../types';
import { cm2, fm, type Registrador } from './registrador';
import { composicao, extremo, type CtxPortico } from './porticoBase';
import { passosComposicao } from './porticoViga';

const NBR = 'NBR 6118:2023';
type Ch = Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>;

export type FormaPilar = { tipo: 'rect'; b: number; h: number } | { tipo: 'circ'; D: number } | { tipo: 'poly'; pts: [number, number][] };

export interface CtxPilar {
  el: string; k: number; L: number; leIn: number; leOut: number; cover: number; conc: Concrete; settings: DesignSettings;
  forma: FormaPilar; combos: ColumnCombo[]; cd: ColumnDesign;
  /** Cortante verificado (retangular e circular) com a bitola do estribo que havia no cálculo. */
  cortante?: ShearResult & { combo: string; provided: number };
  /** Espaçamento do estribo antes do ajuste pelo cortante. */
  s0?: number;
}

export function registrarPilarPortico(mem: Registrador, c: CtxPortico, x: CtxPilar) {
  const el = x.el;
  if (!mem.aceita(el)) return;
  const { cd, conc: cc, settings: st, forma } = x;
  const P_ = (etapa: 'esforcos' | 'dimensionamento' | 'detalhamento', topico: string, q: Ch) => mem.passo({ etapa, elemento: el, topico, ...q });
  const fyd = st.fyk / st.gammaS, gn = cd.gammaN;
  const rect = forma.tipo === 'rect';
  const poly = forma.tipo === 'circ' ? circlePolygon(forma.D) : forma.tipo === 'poly' ? forma.pts : null;
  const pp = poly ? polyProps(poly) : null;
  const hIn = rect ? forma.h : pp!.ymax - pp!.ymin, hOut = rect ? forma.b : pp!.xmax - pp!.xmin;
  const Ac = rect ? forma.b * forma.h : forma.tipo === 'circ' ? (Math.PI * forma.D ** 2) / 4 : pp!.A;
  const iIn = rect ? forma.h / Math.sqrt(12) : Math.sqrt(pp!.Ix / pp!.A), iOut = rect ? forma.b / Math.sqrt(12) : Math.sqrt(pp!.Iy / pp!.A);

  // ---- materiais, geometria e esbeltez
  const tg = 'Geometria e esbeltez';
  P_('dimensionamento', tg, { descricao: 'Comprimento da barra e comprimentos de flambagem no plano (ℓe,in) e fora do plano (ℓe,out)', formula: 'ℓe informado por barra (padrão L)', expressao: `L = ${fm(x.L)} m; ℓe,in = ${fm(x.leIn)} m; ℓe,out = ${fm(x.leOut)} m`, resultado: x.L, unidade: 'm', norma: `${NBR}, 15.6`, entradas: { L: x.L, leIn: x.leIn, leOut: x.leOut } });
  P_('dimensionamento', tg, { descricao: 'Resistência de cálculo do concreto', formula: 'fcd = fck / γc', expressao: `fcd = ${fm(cc.fck)} / ${fm(cc.fck / cc.fcd)} = ${fm(cc.fcd)}`, resultado: cc.fcd, unidade: 'MPa', norma: `${NBR}, 12.3.3`, entradas: { fck: cc.fck, gc: cc.fck / cc.fcd } });
  P_('dimensionamento', tg, { descricao: 'Resistência de cálculo do aço longitudinal', formula: 'fyd = fyk / γs', expressao: `fyd = ${fm(st.fyk)} / ${fm(st.gammaS)} = ${fm(fyd)}`, resultado: fyd, unidade: 'MPa', norma: `${NBR}, 12.3.3`, entradas: { fyk: st.fyk, gs: st.gammaS } });
  P_('dimensionamento', tg, { descricao: rect ? 'Área da seção (b fora do plano, h no plano)' : forma.tipo === 'circ' ? 'Área da seção circular' : 'Área e dimensões da seção poligonal (altura no plano, largura fora do plano)', formula: rect ? 'Ac = b·h' : forma.tipo === 'circ' ? 'Ac = π·D²/4' : 'Ac por Gauss', expressao: rect ? `Ac = ${fm(forma.b)}·${fm(forma.h)} = ${fm(Ac)}` : `Ac = ${fm(Ac)}; hIn = ${fm(hIn)}; hOut = ${fm(hOut)}`, resultado: Ac, unidade: 'm²', entradas: rect ? { b: forma.b, h: forma.h } : forma.tipo === 'circ' ? { D: forma.D, hIn, hOut } : { A: pp!.A, Ix: pp!.Ix, Iy: pp!.Iy, hIn, hOut } });
  P_('dimensionamento', tg, { descricao: 'Raios de giração no plano e fora do plano', formula: 'i = √(I/A)', expressao: `iin = ${fm(iIn)} m; iout = ${fm(iOut)} m`, resultado: iIn, unidade: 'm', entradas: rect ? { b: forma.b, h: forma.h } : { Ix: pp!.Ix, Iy: pp!.Iy, A: pp!.A } });
  const lamIn = rect ? (Math.sqrt(12) * x.leIn) / forma.h : x.leIn / iIn, lamOut = rect ? (Math.sqrt(12) * x.leOut) / forma.b : x.leOut / iOut;
  P_('dimensionamento', tg, { descricao: 'Índices de esbeltez no plano e fora do plano', formula: 'λ = ℓe/i', expressao: `λin = ${fm(x.leIn)}/${fm(iIn)} = ${fm(lamIn)}; λout = ${fm(x.leOut)}/${fm(iOut)} = ${fm(lamOut)}${Math.max(lamIn, lamOut) > 90 ? ' (> 90: revisar, resultado indicativo)' : ''}`, resultado: Math.max(lamIn, lamOut), unidade: '', norma: `${NBR}, 15.8.2`, entradas: { leIn: x.leIn, iIn, leOut: x.leOut, iOut } });
  if (gn > 1) P_('dimensionamento', tg, { descricao: 'Coeficiente adicional para seção com menor dimensão < 19 cm', formula: 'γn = 1,95 − 0,05·b (b em cm)', expressao: `γn = ${fm(gn)}`, resultado: gn, unidade: '', norma: `${NBR}, 13.2.3 (Tabela 13.1)`, entradas: { bmin: Math.min(hIn, hOut) } });
  const NdMax = Math.max(0, ...x.combos.map((q) => Math.max(-q.N0, -q.NL) * gn));

  // ---- resumo por combinação e cadeia da combinação determinante
  const cks = cd.checks;
  const kmax = cd.check ? cks.indexOf(cd.check) : -1;
  cks.forEach((ck, i) => {
    const cb = x.combos[i];
    P_('esforcos', 'Combinações ELU – utilização', { descricao: `${ck.combo}: Nd = ${fm(ck.Nd)} kN (${ck.governing === 'T' ? 'tração' : 'compressão'}), M nas pontas (${fm(cb.M0 * gn)}; ${fm(cb.ML * gn)}) kN·m, governa ${ck.governing}`, formula: 'util = máx(S1; S2) (ou |M|/MRd na tração)', expressao: `util = ${fm(ck.util)}`, resultado: ck.util, unidade: '', norma: `${NBR}, 17.2.5`, entradas: { Nd: ck.Nd, M0: cb.M0 * gn, ML: cb.ML * gn, util: ck.util } });
  });
  if (kmax >= 0) {
    const ck = cks[kmax], cb = x.combos[kmax], e = c.eluRes[kmax], te = 'Esforços da combinação determinante';
    const n0 = -cb.N0 * gn, nL = -cb.NL * gn, m0 = cb.M0 * gn, mL = cb.ML * gn, ms = cb.Mspan * gn;
    passosComposicao(mem, el, te, `Normal na base (nó i), combinação ${ck.combo}`, composicao(c, e, x.k, 'N', 0, true), cb.N0, 'kN', 'N');
    passosComposicao(mem, el, te, `Normal no topo (nó j), combinação ${ck.combo}`, composicao(c, e, x.k, 'N', x.L, true), cb.NL, 'kN', 'N');
    passosComposicao(mem, el, te, 'Momento na base (nó i)', composicao(c, e, x.k, 'M', 0, true), cb.M0, 'kN·m', 'M');
    passosComposicao(mem, el, te, 'Momento no topo (nó j)', composicao(c, e, x.k, 'M', x.L, true), cb.ML, 'kN·m', 'M');
    let Ms = 0, xs = -1;
    for (const xx of sampleXs(x.L, [e.r.members[x.k].M])) if (xx > 1e-9 && xx < x.L - 1e-9) { const v = Math.abs(P.evaluate(e.r.members[x.k].M, xx)); if (v > Ms) { Ms = v; xs = xx; } }
    if (xs >= 0) passosComposicao(mem, el, te, 'Momento máximo no vão (estações interiores)', composicao(c, e, x.k, 'M', xs, true), P.evaluate(e.r.members[x.k].M, xs), 'kN·m', 'M');
    P_('esforcos', te, { descricao: 'Esforços de cálculo majorados por γn (compressão positiva)', formula: 'Nd = γn·máx(−N0; −NL); M0, ML, Ms majorados por γn', expressao: `Nd = ${fm(gn)}·máx(${fm(-cb.N0)}; ${fm(-cb.NL)}) = ${fm(ck.Nd)} kN; M0 = ${fm(m0)}; ML = ${fm(mL)}; Ms = ${fm(ms)} kN·m`, resultado: ck.Nd, unidade: 'kN', norma: `${NBR}, 13.2.3`, entradas: { gn, N0: cb.N0, NL: cb.NL, M0: cb.M0, ML: cb.ML, Mspan: cb.Mspan, n0, nL, Nd: ck.Nd, m0, mL, ms, transverse: cb.transverse ? 1 : 0, cantilever: cb.cantilever ? 1 : 0, Mmid: cb.Mmid ?? 0 } });
    const t2 = 'Efeitos de 2ª ordem (pilar-padrão com curvatura aproximada) – no plano';
    if (ck.governing === 'T') {
      P_('dimensionamento', t2, { descricao: 'Normal de tração: verificação da flexo-tração nas pontas (sem 2ª ordem)', formula: 'util = máx |M|/MRd(N)', expressao: `util = ${fm(ck.util)}`, resultado: ck.util, unidade: '', norma: `${NBR}, 17.2.5`, entradas: { n0, nL, m0, mL, util: ck.util } });
    } else {
      const MA = ck.M1dA, MB = Math.min(Math.abs(m0), Math.abs(mL));
      P_('dimensionamento', t2, { descricao: 'Momento mínimo de 1ª ordem', formula: 'M1d,mín = Nd·(0,015 + 0,03·h)', expressao: `M1d,mín = ${fm(ck.Nd)}·(0,015 + 0,03·${fm(hIn)}) = ${fm(ck.M1dMinX)}`, resultado: ck.M1dMinX, unidade: 'kN·m', norma: `${NBR}, 11.3.3.4.3`, entradas: { Nd: ck.Nd, h: hIn } });
      P_('dimensionamento', t2, { descricao: `Coeficiente αb (${cb.cantilever ? 'balanço: 0,80 + 0,20·MC/MA, 0,85 ≤ αb ≤ 1' : cb.transverse ? 'carga transversal: 1' : 'pontas: 0,60 + 0,40·MB/MA, 0,40 ≤ αb ≤ 1'}; MA < M1d,mín → 1)`, formula: 'αb', expressao: `MA = ${fm(MA)}, MB = ${fm(MB)}, M1d,mín = ${fm(ck.M1dMinX)} → αb = ${fm(ck.alphaB)}`, resultado: ck.alphaB, unidade: '', norma: `${NBR}, 15.8.2`, entradas: { MA, MB, m0, mL, M1dMin: ck.M1dMinX, transverse: cb.transverse ? 1 : 0, cantilever: cb.cantilever ? 1 : 0, MC: (cb.Mmid ?? 0) * gn, alphaB: ck.alphaB } });
      P_('dimensionamento', t2, { descricao: 'Esbeltez limite', formula: 'λ1 = (25 + 12,5·e1/h)/αb, 35 ≤ λ1 ≤ 90, e1 = MA/Nd', expressao: `λ1 = (25 + 12,5·(${fm(MA)}/${fm(ck.Nd)})/${fm(hIn)})/${fm(ck.alphaB)} → ${fm(ck.lambda1X)}; λ = ${fm(ck.lambdaX)}`, resultado: ck.lambda1X, unidade: '', norma: `${NBR}, 15.8.2`, entradas: { MA, Nd: ck.Nd, h: hIn, alphaB: ck.alphaB, lambda: ck.lambdaX } });
      const nuR = ck.nu / gn, curv = Math.min(0.005 / (hIn * (nuR + 0.5)), 0.005 / hIn);
      P_('dimensionamento', t2, { descricao: 'Força normal adimensional (sem γn na curvatura)', formula: 'ν = Nd/(Ac·fcd); 1/r = 0,005/[h·(ν + 0,5)] ≤ 0,005/h', expressao: `ν = ${fm(ck.Nd)}/1000/(${fm(Ac)}·${fm(cc.fcd)}) = ${fm(ck.nu)}; 1/r = ${fm(curv)} 1/m`, resultado: curv, unidade: '1/m', norma: `${NBR}, 15.8.3.3.2`, entradas: { Nd: ck.Nd, Ac, fcd: cc.fcd, gn, h: hIn } });
      P_('dimensionamento', t2, { descricao: ck.lambdaX > ck.lambda1X ? 'Momento de 2ª ordem local' : 'λ ≤ λ1: dispensa os efeitos locais de 2ª ordem', formula: 'M2d = Nd·ℓe²/10·(1/r) (λ > λ1)', expressao: `M2d = ${fm(ck.M2dX)} kN·m`, resultado: ck.M2dX, unidade: 'kN·m', norma: `${NBR}, 15.8.3.3.2`, entradas: { Nd: ck.Nd, le: x.leIn, curv, lambda: ck.lambdaX, lambda1: ck.lambda1X } });
      P_('dimensionamento', t2, { descricao: `Momento total no plano${ck.gn1 && ck.gn1 > 1 ? ' (140 < λ ≤ 200: esforços finais × γn1)' : ''}`, formula: 'Md,tot = máx[αb·máx(MA; M1d,mín) + M2d; máx(MA; M1d,mín); Ms]·γn1', expressao: `Md,tot = máx(${fm(ck.alphaB)}·${fm(Math.max(MA, ck.M1dMinX))} + ${fm(ck.M2dX)}; ${fm(Math.max(MA, ck.M1dMinX))}; ${fm(ms)})·${fm(ck.gn1 ?? 1)} = ${fm(ck.MdTotX)}`, resultado: ck.MdTotX, unidade: 'kN·m', norma: `${NBR}, 15.8.3.3.2`, entradas: { alphaB: ck.alphaB, Mbase: Math.max(MA, ck.M1dMinX), M2d: ck.M2dX, ms, gn1: ck.gn1 ?? 1 } });
      const t3 = 'Fora do plano e flexão composta oblíqua';
      P_('dimensionamento', t3, { descricao: 'Momento mínimo e de 2ª ordem fora do plano', formula: 'M1d,mín = Nd·(0,015 + 0,03·b); M2d (λ > 35); Md,tot,y = (M1d,mín + M2d)·γn1', expressao: `λout = ${fm(ck.lambdaY)}; M1d,mín,y = ${fm(ck.M1dMinY)}; M2d,y = ${fm(ck.M2dY)}; Md,tot,y = ${fm(ck.MdTotY)} kN·m`, resultado: ck.MdTotY, unidade: 'kN·m', norma: `${NBR}, 15.8.3.3.2`, entradas: { Nd: ck.Nd, b: hOut, lambda: ck.lambdaY, M1dMinY: ck.M1dMinY, M2dY: ck.M2dY, gn1: ck.gn1 ?? 1, le: x.leOut, nuR } });
      if (ck.governing === 'N') P_('dimensionamento', t3, { descricao: 'Nd fora do intervalo resistente da seção armada: utilização adotada 99', formula: 'N fora de [NRt; NRc]', expressao: `util = ${fm(ck.util)}`, resultado: ck.util, unidade: '', norma: `${NBR}, 17.2.5`, entradas: { Nd: ck.Nd } });
      else {
        P_('dimensionamento', t3, { descricao: `Momentos resistentes por integração da seção armada em fibras (parábola-retângulo) com Nd·γn1 e a armadura adotada ${cd.layout?.n ?? '—'} φ${cd.layout?.phi ?? '—'}`, formula: 'MRd(Nd; direção) por equilíbrio de seção', expressao: `MRd,in = ${fm(ck.MRxx)} kN·m; MRd,out = ${fm(ck.MRyy)} kN·m`, resultado: ck.MRxx, unidade: 'kN·m', norma: `${NBR}, 17.2.5`, entradas: { N: ck.Nd * (ck.gn1 ?? 1), MRxx: ck.MRxx, MRyy: ck.MRyy, As: cd.layout?.As ?? 0, phi: cd.layout?.phi ?? 0, n: cd.layout?.n ?? 0 }, observacao: 'Calculado pela mesma rotina de fibras do dimensionamento; refazer fora do programa exige a integração da seção.' });
        const s1 = ck.MdTotX / Math.max(ck.MRxx, 1e-9);
        P_('dimensionamento', t3, { descricao: rect ? 'S1 (flexão no plano com 2ª ordem) e S2 (flexão oblíqua pela interação com α = 1,2)' : 'S1 (no plano, dois sentidos) e S2 (oblíqua, quatro quadrantes por fibras)', formula: rect ? 'S1 = Md,tot/MRd,in; S2 = (MxS2/MRd,in)^1,2 + (Md,tot,y/MRd,out)^1,2; util = máx(S1; S2)' : 'util = máx(S1; S2) com a capacidade na direção do momento solicitante', expressao: rect ? `S1 = ${fm(ck.MdTotX)}/${fm(ck.MRxx)} = ${fm(s1)}; S2 = (${fm(ck.MxS2)}/${fm(ck.MRxx)})^1,2 + (${fm(ck.MdTotY)}/${fm(ck.MRyy)})^1,2 = ${fm(ck.interaction)}; util = ${fm(ck.util)}` : `S2 = ${fm(ck.interaction)}; util = ${fm(ck.util)}`, resultado: ck.util, unidade: '', norma: `${NBR}, 17.2.5`, entradas: { MdTotX: ck.MdTotX, MRxx: ck.MRxx, MxS2: ck.MxS2, MdTotY: ck.MdTotY, MRyy: ck.MRyy, interaction: ck.interaction, util: ck.util, retangular: rect ? 1 : 0 } });
      }
    }
  }

  // ---- armadura longitudinal
  const ta = 'Armadura longitudinal';
  P_('dimensionamento', ta, { descricao: 'Armadura mínima', formula: 'As,mín = máx(0,15·Nd,máx/fyd; 0,4 %·Ac)', expressao: `As,mín = máx(0,15·${fm(NdMax)}/1000/${fm(fyd)}; 0,004·${fm(Ac)}) = ${cm2(cd.AsMin)}`, resultado: cd.AsMin, unidade: 'm²', norma: `${NBR}, 17.3.5.3.1`, entradas: { NdMax, fyd, Ac } });
  P_('dimensionamento', ta, { descricao: 'Armadura máxima', formula: 'As,máx = 4 %·Ac', expressao: `As,máx = 0,04·${fm(Ac)} = ${cm2(cd.AsMax)}`, resultado: cd.AsMax, unidade: 'm²', norma: `${NBR}, 17.3.5.3.2`, entradas: { Ac } });
  if (cd.layout) P_('detalhamento', ta, { descricao: `Armadura adotada: disposição de menor área que atende (busca em ordem crescente de As), ρ = ${fm(cd.rho * 100)} %`, formula: 'As = n·π·φ²/4, As,mín ≤ As ≤ As,máx; util ≤ 1', expressao: `As = ${cd.layout.n}·π·(${fm(cd.layout.phi / 1000)})²/4 = ${cm2(cd.layout.As)}${cd.layout.nx ? ` (nx = ${cd.layout.nx}, ny = ${cd.layout.ny})` : ''}`, resultado: cd.layout.As, unidade: 'm²', norma: `${NBR}, 18.4.2`, entradas: { n: cd.layout.n, phi: cd.layout.phi, nx: cd.layout.nx, ny: cd.layout.ny, util: cd.util, a: cd.layout.a } });
  else P_('detalhamento', ta, { descricao: 'Nenhuma disposição de armadura atende', formula: '—', expressao: cd.messages.join(' '), resultado: 'sem solução', unidade: '', entradas: {} });

  // ---- estribos e cortante
  if (cd.stirrup && cd.layout) {
    const tc = 'Cortante e estribos', phiL = cd.layout.phi, bMin = Math.min(hIn, hOut);
    const s0 = Math.floor(Math.min(0.2, bMin, (12 * phiL) / 1000) * 100) / 100;
    P_('detalhamento', tc, { descricao: `Estribo construtivo: φt ≥ máx(5 mm; φℓ/4) e espaçamento s ≤ mín(20 cm; menor dimensão; 12·φℓ)`, formula: 's0 = ⌊mín(0,20; bmín; 12φℓ)⌋ (cm)', expressao: `φt = ${fm(cd.stirrup.phi)} mm; s0 = ${fm(s0 * 100, 3)} cm`, resultado: s0, unidade: 'm', norma: `${NBR}, 18.4.3`, entradas: { phiL, bMin, s0, phiT: cd.stirrup.phi } });
    const sh = x.cortante;
    if (sh) {
      P_('dimensionamento', tc, { descricao: `Cortante no plano (combinação ${sh.combo}): biela`, formula: 'VRd2 = 0,27·αv2·fcd·bw·d ≥ VSd', expressao: `VRd2 = ${fm(sh.VRd2)} ${Math.abs(sh.Vsd) <= sh.VRd2 ? '≥' : '<'} VSd = ${fm(Math.abs(sh.Vsd))} kN`, resultado: sh.VRd2, unidade: 'kN', norma: `${NBR}, 17.4.2.2`, entradas: { av2: cc.av2, fcd: cc.fcd, VSd: Math.abs(sh.Vsd), VRd2: sh.VRd2 }, observacao: rect ? 'bw = b e d = h − c − φt − φℓ/2 (modelo I, como nas vigas).' : 'Seção circular: bw = D e d = 0,8·D (aproximação, a confirmar).', aConfirmar: !rect });
      P_('dimensionamento', tc, { descricao: 'Parcela do concreto, armadura transversal e mínimo', formula: 'Vc = 0,6·fctd·bw·d (ou 0 se tracionada); Asw/s = máx[(VSd − Vc)/(0,9·d·fywd); Asw,mín/s]', expressao: `Vc = ${fm(sh.Vc)} kN; Asw/s = ${fm(sh.aswS * 1e4)} cm²/m; Asw,mín/s = ${fm(sh.aswMin * 1e4)} cm²/m`, resultado: sh.aswS, unidade: 'm²/m', norma: `${NBR}, 17.4.2.2`, entradas: { Vc: sh.Vc, aswS: sh.aswS, aswMin: sh.aswMin, VSd: Math.abs(sh.Vsd), fywk: st.fywk } });
      const prov0 = (2 * barArea(cd.stirrup.phi)) / s0;
      P_('detalhamento', tc, { descricao: `Estribo adotado φ${fm(cd.stirrup.phi)} c/${fm(cd.stirrup.s * 100, 3)} cm${sh.aswS > prov0 * 1.0001 ? ' (espaçamento reduzido para atender ao cortante, mínimo 5 cm)' : ''}`, formula: 'Asw,ef/s = 2·π·φt²/4 / s ≥ Asw/s', expressao: `Asw,ef/s = ${fm(sh.provided * 1e4)} cm²/m ${sh.provided >= sh.aswS - 1e-12 ? '≥' : '<'} ${fm(sh.aswS * 1e4)} cm²/m`, resultado: sh.provided, unidade: 'm²/m', norma: `${NBR}, 18.4.3`, entradas: { phiT: cd.stirrup.phi, s: cd.stirrup.s, s0, aswS: sh.aswS, provided: sh.provided } });
    } else P_('detalhamento', tc, { descricao: `Estribo adotado φ${fm(cd.stirrup.phi)} c/${fm(cd.stirrup.s * 100, 3)} cm (cortante não verificado para esta seção)`, formula: '—', expressao: `s = ${fm(cd.stirrup.s)} m`, resultado: cd.stirrup.s, unidade: 'm', entradas: { phiT: cd.stirrup.phi, s: cd.stirrup.s } });
  }
  void extremo;
}
