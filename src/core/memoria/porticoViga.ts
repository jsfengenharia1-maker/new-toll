// Memória detalhada do pórtico 2D (MD8): cadeia da viga de concreto armado (NBR 6118), registrada por `runDesign` só com a memória
// ligada: materiais, esforços determinantes (Σ γ·Sk por caso na estação), flexão por face, cortante (modelo I), fissuração e flecha.
// Reaproveita `flexao` e `passosFissuracao` da memória do edifício (as mesmas funções de cálculo).
import { P } from '../math';
import { ES, barArea, beamFlexure, bransonRatio, grossProps, type BarChoice, type BeamSection, type Concrete } from '../concrete';
import { sampleXs } from '../estacoes';
import type { BeamDesign, Deflection, MemberDesign } from '../design';
import type { DesignSettings } from '../types';
import { cm2, fm, fp, type Registrador } from './registrador';
import { composicao, entradasComposicao, extremo, flechaElastica, textoSoma, type Composicao, type CtxPortico } from './porticoBase';
import { flexao, passosFissuracao } from './vigaConcreto';

const NBR = 'NBR 6118:2023';

export interface CtxViga {
  el: string; k: number; L: number; cantilever: boolean; livreJ: boolean;
  bs: BeamSection; cover: number; conc: Concrete; settings: DesignSettings;
  /** Módulo de elasticidade do material na análise (MPa). */
  Emat: number;
  bd: BeamDesign; out: MemberDesign;
}

type Ch = Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>;

/** Passos da composição de um esforço de cálculo (Σ γ·Sk por caso na estação). */
export function passosComposicao(mem: Registrador, el: string, topico: string, rotulo: string, cp: Composicao | null, valor: number, un: string, simbolo: string) {
  const E = (q: Ch) => mem.passo({ etapa: 'esforcos', elemento: el, topico, ...q });
  if (!cp) { E({ descricao: `${rotulo}: nulo em todas as combinações`, formula: simbolo, expressao: `${simbolo} = 0`, resultado: 0, unidade: un, entradas: {} }); return; }
  if (!cp.linear) {
    E({ descricao: `${rotulo}: combinação determinante ${cp.combinacao} na abscissa x = ${fm(cp.x, 3)} m (análise P-Δ: resultado não linear, sem decomposição por caso)`, formula: `${simbolo} da análise P-Δ da combinação`, expressao: `${simbolo} = ${fm(valor)}`, resultado: valor, unidade: un, norma: `${NBR}, 15.7.3`, entradas: { combinacao: cp.combinacao, x: cp.x, valor } });
    return;
  }
  E({ descricao: `${rotulo}: combinação determinante ${cp.combinacao} na abscissa x = ${fm(cp.x, 3)} m`, formula: `${simbolo} = Σ γi·${simbolo}k,i`, expressao: `${simbolo} = ${textoSoma(cp)} = ${fm(valor)}`, resultado: valor, unidade: un, norma: 'NBR 8681:2003, 5.1.3; NBR 6118:2023, 11.8.2', entradas: entradasComposicao(cp) });
}

export function registrarVigaPortico(mem: Registrador, c: CtxPortico, x: CtxViga) {
  const el = x.el;
  if (!mem.aceita(el)) return;
  const { bd, out, conc: cc, bs, settings: st, cover, L, k } = x;
  const P_ = (etapa: 'esforcos' | 'dimensionamento' | 'detalhamento', topico: string, q: Ch) => mem.passo({ etapa, elemento: el, topico, ...q });
  const bw = bs.bw, gc = cc.fck / cc.fcd, fyd = st.fyk / st.gammaS, fywd = Math.min(st.fywk / st.gammaS, 435);
  const g = grossProps(bs);

  // ---- materiais e geometria
  const tm = 'Materiais e geometria';
  P_('dimensionamento', tm, { descricao: `Barra ${out.id} (${out.sectionName}, ${out.materialName}): comprimento e seção`, formula: 'L = √(Δx² + Δy²)', expressao: `L = ${fm(L)} m; seção ${bs.kind === 'tee' ? `T bf ${fm(bs.bf ?? 0)} · hf ${fm(bs.hf ?? 0)} · bw ${fm(bw)} · h ${fm(bs.h)}` : `${fm(bw)} × ${fm(bs.h)}`} m${x.cantilever ? ' (balanço)' : ''}`, resultado: L, unidade: 'm', entradas: { L, bw, h: bs.h, ...(bs.kind === 'tee' ? { bf: bs.bf ?? 0, hf: bs.hf ?? 0 } : {}), balanco: x.cantilever ? 1 : 0 } });
  P_('dimensionamento', tm, { descricao: 'Área e inércia bruta da seção', formula: 'Ac; Ic', expressao: `Ac = ${fm(g.A)} m²; Ic = ${fm(g.I)} m⁴; yc (a partir da base) = ${fm(g.ycb)} m`, resultado: g.A, unidade: 'm²', entradas: { Ac: g.A, Ic: g.I, ycb: g.ycb } });
  P_('dimensionamento', tm, { descricao: 'Resistência de cálculo do concreto', formula: 'fcd = fck / γc', expressao: `fcd = ${fm(cc.fck)} / ${fm(gc)} = ${fm(cc.fcd)}`, resultado: cc.fcd, unidade: 'MPa', norma: `${NBR}, 12.3.3`, entradas: { fck: cc.fck, gc } });
  P_('dimensionamento', tm, { descricao: 'Tensão do bloco retangular', formula: 'σcd = αc·ηc·fcd', expressao: `σcd = ${fm(cc.sigmaCd / cc.fcd)}·${fm(cc.fcd)} = ${fm(cc.sigmaCd)}`, resultado: cc.sigmaCd, unidade: 'MPa', norma: `${NBR}, 17.2.2`, aConfirmar: cc.fck > 40, entradas: { fcd: cc.fcd, fator: cc.sigmaCd / cc.fcd } });
  P_('dimensionamento', tm, { descricao: 'Resistência média à tração', formula: cc.fck > 50 ? 'fct,m = 2,12·ln(1 + 0,11·fck)' : 'fct,m = 0,3·fck^(2/3)', expressao: `fct,m = ${fm(cc.fctm)}`, resultado: cc.fctm, unidade: 'MPa', norma: `${NBR}, 8.2.5`, entradas: { fck: cc.fck } });
  P_('dimensionamento', tm, { descricao: 'Resistência de cálculo à tração', formula: 'fctd = 0,7·fct,m / γc', expressao: `fctd = 0,7·${fm(cc.fctm)} / ${fm(gc)} = ${fm(cc.fctd)}`, resultado: cc.fctd, unidade: 'MPa', norma: `${NBR}, 8.2.5`, entradas: { fctm: cc.fctm, gc } });
  P_('dimensionamento', tm, { descricao: 'Resistência de cálculo do aço longitudinal', formula: 'fyd = fyk / γs', expressao: `fyd = ${fm(st.fyk)} / ${fm(st.gammaS)} = ${fm(fyd)}`, resultado: fyd, unidade: 'MPa', norma: `${NBR}, 12.3.3`, entradas: { fyk: st.fyk, gs: st.gammaS } });
  P_('dimensionamento', tm, { descricao: 'Resistência de cálculo dos estribos', formula: 'fywd = mín(fywk / γs; 435 MPa)', expressao: `fywd = mín(${fm(st.fywk)} / ${fm(st.gammaS)}; 435) = ${fm(fywd)}`, resultado: fywd, unidade: 'MPa', norma: `${NBR}, 17.4.2.2`, entradas: { fywk: st.fywk, gs: st.gammaS } });
  P_('dimensionamento', tm, { descricao: `Cobrimento (CAA ${st.caa}) e altura útil da armadura inferior e da superior (estribo φ6,3; barra de referência φ16 sem barras escolhidas, ou o centro de gravidade das camadas)`, formula: 'd = h − c − φt − φℓ/2 − (camadas − 1)·(φℓ + 2 cm)/2', expressao: `c = ${fm(cover)} m; d,inf = ${fm(bd.pos.d)} m; d,sup = ${fm(bd.neg.d)} m`, resultado: bd.d, unidade: 'm', norma: `${NBR}, 7.4.7.6`, entradas: { cobrimento: cover, dInf: bd.pos.d, dSup: bd.neg.d, h: bs.h } });

  // ---- esforços (envoltória ELU)
  const te = 'Envoltória ELU';
  const eluRes = c.eluRes;
  const pos = extremo(eluRes, k, L, 'M', 'max'), neg = extremo(eluRes, k, L, 'M', 'min');
  passosComposicao(mem, el, te, 'Momento positivo máximo', pos ? composicao(c, pos.e, k, 'M', pos.x, true) : null, pos?.v ?? 0, 'kN·m', 'M');
  if (neg) passosComposicao(mem, el, te, 'Momento negativo máximo', composicao(c, neg.e, k, 'M', neg.x, true), neg.v, 'kN·m', 'M');
  // cortante: separa a seção totalmente tracionada (Vc = 0) como o dimensionamento
  const aT = bs.h / 2 - (cover + 0.0063 + 0.008);
  type Est = { e: typeof eluRes[number]; x: number };
  let Vn = 0, Vt = 0, en: Est | null = null, et: Est | null = null, Ncomp = 0;
  for (const e of eluRes) {
    const m = e.r.members[k];
    for (const xx of sampleXs(L, [m.M])) {
      const M = P.evaluate(m.M, xx), V = Math.abs(P.evaluate(m.V, xx)), N = P.evaluate(m.N, xx);
      if (N > 1e-6 && Math.abs(M) <= N * aT) { if (V > Vt) { Vt = V; et = { e, x: xx }; } } else if (V > Vn) { Vn = V; en = { e, x: xx }; }
    }
    Ncomp = Math.max(Ncomp, -P.evaluate(m.N, 0), -P.evaluate(m.N, L));
  }
  const tracionada = bd.shear.combo.endsWith('(seção tracionada, Vc = 0)');
  const gv = tracionada ? et : en;
  if (gv) passosComposicao(mem, el, te, `Cortante máximo${tracionada ? ' (seção tracionada: linha neutra fora da seção, Vc = 0)' : ''}`, composicao(c, gv.e, k, 'V', gv.x, true), P.evaluate(gv.e.r.members[k].V, gv.x), 'kN', 'V');
  P_('esforcos', te, { descricao: 'Compressão máxima na barra (para o limite ν = Nd/(Ac·fcd) de 0,10 da flexo-compressão)', formula: 'ν = N,máx/(Ac·fcd)', expressao: `N,máx = ${fm(Ncomp)} kN; ν = ${fm(Ncomp)}/1000/(${fm(g.A)}·${fm(cc.fcd)}) = ${fm(bd.axialNu)}`, resultado: bd.axialNu, unidade: '', norma: `${NBR}, 17.2.5`, entradas: { Ncomp, Ac: g.A, fcd: cc.fcd } });

  // ---- flexão (a armadura mínima usa a altura útil da primeira estimativa, sem barras escolhidas, como no dimensionamento)
  const ctxF = { c: cc, sec: bs, taxaMin: 0, b: bw, h: bs.h };
  const d2 = cover + 0.0063 + 0.008, dPrimeira = bs.h - cover - 0.0063 - 0.008;
  const asMin = (topico: string, Md: number, fc: boolean, f: typeof bd.pos) => {
    if (!(Md !== 0 || fc)) return;
    const gp = grossProps(bs), yt = fc ? gp.ycb : bs.h - gp.ycb, W0 = gp.I / yt, Mmin = 0.8 * W0 * cc.fctkSup;
    const rm = beamFlexure(bs, fc, Mmin * 1000, dPrimeira, 0.04, cc, fyd);
    P_('dimensionamento', topico, { descricao: 'Altura útil da primeira estimativa (barra φ16, estribo φ6,3) usada na armadura mínima', formula: 'd1 = h − c − φt − φℓ/2', expressao: `d1 = ${fm(bs.h)} − ${fm(cover)} − 0,0063 − 0,008 = ${fm(dPrimeira)}`, resultado: dPrimeira, unidade: 'm', norma: `${NBR}, 17.3.5.2.1`, entradas: { h: bs.h, cobrimento: cover } });
    P_('dimensionamento', topico, { descricao: 'Momento mínimo', formula: 'Md,mín = 0,8·W0·fctk,sup, W0 = Ic/yt, fctk,sup = 1,3·fct,m', expressao: `Md,mín = 0,8·(${fm(gp.I)}/${fm(yt)})·${fm(cc.fctkSup)} = ${fm(Mmin * 1000)} kN·m`, resultado: Mmin, unidade: 'MN·m', norma: `${NBR}, 17.3.5.2.1`, entradas: { Ic: gp.I, yt, fctkSup: cc.fctkSup } });
    P_('dimensionamento', topico, { descricao: 'Armadura mínima', formula: 'As,mín = máx[As(Md,mín); 0,15 %·Ac]', expressao: `As,mín = máx(${cm2(rm.As)}; 0,0015·${fm(gp.A)} = ${cm2(0.0015 * gp.A)}) = ${cm2(f.AsMin)}`, resultado: f.AsMin, unidade: 'm²', norma: `${NBR}, 17.3.5.2.1 (Tabela 17.3)`, entradas: { AsMd: rm.As, Ac: gp.A, d1: dPrimeira, Mmin } });
  };
  const face = (topico: string, Md: number, fc: boolean, f: typeof bd.pos, inferior: boolean) => {
    flexao(mem, el, topico, ctxF, Md, f.d, d2, fyd, fc, f.AsAdopt, inferior, { semMinimo: true });
    if (Math.abs(Md) <= 1e-9) return;
    asMin(topico, Md, fc, f);
    P_('dimensionamento', topico, { descricao: 'Armadura de cálculo', formula: 'As,calc = máx(As; As,mín)', expressao: `As,calc = máx(${cm2(f.As)}; ${cm2(f.AsMin)}) = ${cm2(f.AsAdopt)}`, resultado: f.AsAdopt, unidade: 'm²', norma: `${NBR}, 17.3.5.2`, entradas: { As: f.As, AsMin: f.AsMin } });
  };
  face('Flexão – armadura inferior', pos?.v ?? 0, true, bd.pos, true);
  if (neg) face('Flexão – armadura superior', Math.abs(neg.v), false, bd.neg, false);
  P_('dimensionamento', 'Flexão – armadura máxima', { descricao: 'Armadura longitudinal total (adotada + compressão) contra o máximo de 4 % de Ac', formula: 'As,total/Ac ≤ 4 %', expressao: `As,total = ${cm2(bd.AsTotalRatio * g.A)}; As,total/Ac = ${fm(bd.AsTotalRatio * 100)} %`, resultado: bd.AsTotalRatio, unidade: '', norma: `${NBR}, 17.3.5.2.4`, entradas: { Ac: g.A, AsTotal: bd.AsTotalRatio * g.A } });
  const barras = (rot: string, As: number, bb: BarChoice | null) => {
    if (!bb) { if (As > 0) P_('detalhamento', rot, { descricao: 'Armadura não cabe na largura (até 3 camadas)', formula: 'As,ef ≥ As', expressao: `As = ${cm2(As)}`, resultado: 'não cabe', unidade: '', norma: `${NBR}, 18.3.2`, entradas: { As, bw, cobrimento: cover } }); return; }
    P_('detalhamento', rot, { descricao: 'Barras adotadas (menor número de camadas, depois menor área)', formula: 'As,ef = n·π·φ²/4 ≥ As', expressao: `As,ef = ${bb.n}·π·(${fm(bb.phi / 1000)})²/4 = ${cm2(bb.As)} ≥ ${cm2(As)}; ${bb.layers} camada(s)`, resultado: bb.As, unidade: 'm²', norma: `${NBR}, 18.3.2`, entradas: { n: bb.n, phi: bb.phi, As, camadas: bb.layers, bw, cobrimento: cover } });
  };
  barras('Flexão – armadura inferior', bd.pos.AsAdopt, bd.pos.bars);
  if (bd.neg.AsAdopt > 0) barras('Flexão – armadura superior', bd.neg.AsAdopt, bd.neg.bars);

  // ---- cortante (modelo I)
  const sh = bd.shear, d = bd.d, tc = 'Cortante (modelo de cálculo I, θ = 45°)';
  P_('dimensionamento', tc, { descricao: 'Coeficiente de efetividade do concreto', formula: 'αv2 = 1 − fck/250', expressao: `αv2 = 1 − ${fm(cc.fck)}/250 = ${fm(cc.av2)}`, resultado: cc.av2, unidade: '', norma: `${NBR}, 17.4.2.2`, entradas: { fck: cc.fck } });
  P_('dimensionamento', tc, { descricao: 'Altura útil do cortante (menor das duas faces)', formula: 'd = mín(d,inf; d,sup)', expressao: `d = mín(${fm(bd.pos.d)}; ${fm(bd.neg.d)}) = ${fm(d)}`, resultado: d, unidade: 'm', norma: `${NBR}, 17.4.2.2`, entradas: { dInf: bd.pos.d, dSup: bd.neg.d } });
  P_('dimensionamento', tc, { descricao: 'Resistência da biela comprimida', formula: 'VRd2 = 0,27·αv2·fcd·bw·d', expressao: `VRd2 = 0,27·${fm(cc.av2)}·${fm(cc.fcd)}·${fm(bw)}·${fm(d)}·1000 = ${fm(sh.VRd2)}`, resultado: sh.VRd2, unidade: 'kN', norma: `${NBR}, 17.4.2.2`, entradas: { av2: cc.av2, fcd: cc.fcd, bw, d } });
  P_('dimensionamento', tc, { descricao: 'Verificação da biela', formula: 'VSd ≤ VRd2', expressao: `${fm(Math.abs(sh.Vsd))} ${Math.abs(sh.Vsd) <= sh.VRd2 ? '≤' : '>'} ${fm(sh.VRd2)}`, resultado: Math.abs(sh.Vsd) / sh.VRd2, unidade: '', norma: `${NBR}, 17.4.2.2`, entradas: { VSd: Math.abs(sh.Vsd), VRd2: sh.VRd2 } });
  P_('dimensionamento', tc, { descricao: tracionada ? 'Parcela do concreto nula (seção totalmente tracionada)' : 'Parcela do concreto (flexão simples)', formula: tracionada ? 'Vc = 0' : 'Vc = Vc0 = 0,6·fctd·bw·d', expressao: tracionada ? 'Vc = 0' : `Vc = 0,6·${fm(cc.fctd)}·${fm(bw)}·${fm(d)}·1000 = ${fm(sh.Vc)}`, resultado: sh.Vc, unidade: 'kN', norma: `${NBR}, 17.4.2.2 b`, entradas: { fctd: cc.fctd, bw, d, tracionada: tracionada ? 1 : 0 } });
  const aswV = Math.max(0, Math.abs(sh.Vsd) / 1000 - sh.Vc / 1000) / (0.9 * d * fywd);
  P_('dimensionamento', tc, { descricao: 'Armadura transversal do cortante', formula: 'Asw/s = (VSd − Vc)/(0,9·d·fywd)', expressao: `Asw/s = (${fm(Math.abs(sh.Vsd))} − ${fm(sh.Vc)})/1000/(0,9·${fm(d)}·${fm(fywd)}) = ${fm(aswV * 1e4)} cm²/m`, resultado: aswV, unidade: 'm²/m', norma: `${NBR}, 17.4.2.2`, entradas: { VSd: Math.abs(sh.Vsd), Vc: sh.Vc, d, fywd } });
  P_('dimensionamento', tc, { descricao: 'Armadura transversal mínima', formula: 'Asw,mín/s = 0,2·(fct,m/fywk)·bw', expressao: `Asw,mín/s = 0,2·(${fm(cc.fctm)}/${fm(st.fywk)})·${fm(bw)} = ${fm(sh.aswMin * 1e4)} cm²/m`, resultado: sh.aswMin, unidade: 'm²/m', norma: `${NBR}, 17.4.1.1.1`, entradas: { fctm: cc.fctm, fywk: st.fywk, bw } });
  P_('dimensionamento', tc, { descricao: 'Armadura transversal de cálculo', formula: 'Asw/s = máx(Asw/s; Asw,mín/s)', expressao: `Asw/s = máx(${fm(aswV * 1e4)}; ${fm(sh.aswMin * 1e4)}) = ${fm(sh.aswS * 1e4)} cm²/m`, resultado: sh.aswS, unidade: 'm²/m', norma: `${NBR}, 17.4.1.1.1`, entradas: { asw: aswV, aswMin: sh.aswMin } });
  P_('dimensionamento', tc, { descricao: 'Espaçamento máximo dos estribos', formula: 'VSd ≤ 0,67·VRd2 → smáx = mín(0,6·d; 30 cm); senão smáx = mín(0,3·d; 20 cm)', expressao: `VSd/VRd2 = ${fm(Math.abs(sh.Vsd) / sh.VRd2)} → smáx = ${fm(sh.smax)} m`, resultado: sh.smax, unidade: 'm', norma: `${NBR}, 18.3.3.2`, entradas: { VSd: Math.abs(sh.Vsd), VRd2: sh.VRd2, d } });
  if (sh.stirrup) {
    const ef = (sh.stirrup.legs * barArea(sh.stirrup.phi)) / sh.stirrup.s;
    P_('detalhamento', tc, { descricao: `Estribo adotado: φ${fm(sh.stirrup.phi)} c/${fm(sh.stirrup.s * 100, 3)} cm, ${sh.stirrup.legs} ramos (menor bitola com espaçamento ≥ 10 cm, arredondado para baixo ao cm)`, formula: 'Asw,ef/s = n·π·φt²/4 / s ≥ Asw/s; s ≤ smáx', expressao: `Asw,ef/s = ${sh.stirrup.legs}·π·(${fm(sh.stirrup.phi / 1000)})²/4 / ${fm(sh.stirrup.s)} = ${fm(ef * 1e4)} cm²/m`, resultado: ef, unidade: 'm²/m', norma: `${NBR}, 18.3.3.2`, entradas: { legs: sh.stirrup.legs, phi: sh.stirrup.phi, s: sh.stirrup.s, aswS: sh.aswS, smax: sh.smax } });
    const stMax = Math.abs(sh.Vsd) <= 0.2 * sh.VRd2 ? Math.min(d, 0.8) : Math.min(0.6 * d, 0.35), st2 = bw - 2 * cover - sh.stirrup.phi / 1000;
    P_('detalhamento', tc, { descricao: 'Distância entre os ramos do estribo (estribo de 4 ramos se exceder o máximo) e φt ≤ bw/10', formula: 'st = bw − 2c − φt ≤ stmáx', expressao: `st = ${fm(bw)} − 2·${fm(cover)} − ${fm(sh.stirrup.phi / 1000)} = ${fm(st2)} m ${st2 <= stMax ? '≤' : '>'} ${fm(stMax)} m; φt = ${fm(sh.stirrup.phi)} mm ${sh.stirrup.phi / 1000 <= bw / 10 ? '≤' : '>'} bw/10 = ${fm(bw * 100)} mm`, resultado: st2, unidade: 'm', norma: `${NBR}, 18.3.3.2`, entradas: { bw, cobrimento: cover, phi: sh.stirrup.phi, VSd: Math.abs(sh.Vsd), VRd2: sh.VRd2, d } });
  }

  // ---- fissuração (combinação frequente)
  const cr = bd.crack;
  if (cr) {
    const fiss = (rot: string, f: typeof bd.pos, q: typeof cr.pos, fc: boolean, sinal: 1 | -1) => {
      const bb = f.bars, As = bb?.As ?? f.AsAdopt;
      if (!As || !q.Mk) return;
      const e = c.freqRes.find((y) => y.cb.name === q.combo);
      if (e) {
        const xs = sampleXs(L, [e.r.members[k].M]);
        let xm = 0, best = 0;
        for (const xx of xs) { const v = sinal * P.evaluate(e.r.members[k].M, xx); if (v > best) { best = v; xm = xx; } }
        const cp = composicao(c, e, k, 'M', xm, false);
        mem.passo({ etapa: 'esforcos', elemento: el, topico: `Fissuração – ${rot}`, descricao: `Combinação frequente determinante ${q.combo} na abscissa x = ${fm(xm, 3)} m`, formula: 'Md,ser = Σ γi·Mk,i', expressao: `Md,ser = ${textoSoma(cp)} = ${fm(q.Mk)}`, resultado: q.Mk, unidade: 'kN·m', norma: `${NBR}, 11.8.3.2`, entradas: entradasComposicao(cp) });
      }
      passosFissuracao(mem, el, `Fissuração – ${rot}`, { sec: bs, fc, As, phi: bb?.phi ?? 10, d: f.d, Mk: q.Mk, c: cc, caa: st.caa, h: bs.h, b: bw, wkLim: q.limit, wk: q.wk });
    };
    fiss('face inferior', bd.pos, cr.pos, true, 1);
    if (bd.neg.AsAdopt > 0) fiss('face superior', bd.neg, cr.neg, false, -1);
  }

  // ---- flecha (combinação quase permanente, Branson e fluência)
  const df: Deflection | undefined = out.deflection;
  if (df) {
    const tf = 'Flecha (ELS-DEF)';
    const e = c.qpRes.find((y) => y.cb.name === df.combo);
    P_('dimensionamento', tf, { descricao: 'Módulo secante do concreto', formula: 'Ecs = αi·Eci, αi = 0,8 + 0,2·fck/80 ≤ 1', expressao: `Ecs = ${fm(cc.Ecs)}`, resultado: cc.Ecs, unidade: 'MPa', norma: `${NBR}, 8.2.8`, entradas: { Eci: cc.Eci, fck: cc.fck } });
    if (e) {
      const fe = flechaElastica(e.r, k, L, x.cantilever, x.livreJ);
      P_('dimensionamento', tf, { descricao: `Flecha elástica da análise (inércia bruta) na combinação quase permanente determinante ${df.combo}${x.cantilever ? ': deslocamento total da ponta do balanço' : ': relativa à corda entre os apoios'}`, formula: x.cantilever ? 'f0 = |v(x) − v(extremo engastado)|' : 'f0 = máx |v(x) − [v(0) + (v(L) − v(0))·x/L]|', expressao: `v(0) = ${fm(fe.v0)}; v(L) = ${fm(fe.vL)}; x = ${fm(fe.x, 3)} m; v(x) = ${fm(fe.v)} → f0 = ${fm(fe.f * 1000)} mm`, resultado: fe.f, unidade: 'm', norma: `${NBR}, 17.3.2.1`, entradas: { v0: fe.v0, vL: fe.vL, xm: fe.x, vx: fe.v, L, balanco: x.cantilever ? 1 : 0, livreJ: x.livreJ ? 1 : 0, combinacao: df.combo } });
      let Ma = 0;
      for (const xx of sampleXs(L, [e.r.members[k].M])) Ma = Math.max(Ma, Math.abs(P.evaluate(e.r.members[k].M, xx)));
      const Asd = bd.pos.bars?.As ?? Math.max(bd.pos.AsAdopt, 1e-6);
      const br = bransonRatio(bs, true, Asd, bd.pos.d, Ma, cc);
      P_('dimensionamento', tf, { descricao: 'Momento máximo da combinação quase permanente', formula: 'Ma = máx |M|', expressao: `Ma = ${fm(Ma)}`, resultado: Ma, unidade: 'kN·m', norma: `${NBR}, 17.3.2.1.1`, entradas: { Ma } });
      P_('dimensionamento', tf, { descricao: 'Momento de fissuração (armadura inferior)', formula: 'Mr = α·fct,m·Ic/yt (α = 1,5 retangular; 1,2 T)', expressao: `Mr = ${fm(br.Mr)}`, resultado: br.Mr, unidade: 'kN·m', norma: `${NBR}, 17.3.1`, entradas: { fctm: cc.fctm, Ic: br.Ic, alfa: bs.kind === 'tee' ? 1.2 : 1.5 } });
      P_('dimensionamento', tf, { descricao: 'Inércia no estádio II puro (αe = Es/Ecs)', formula: 'III = b·x³/3 + αe·As·(d − x)²', expressao: `III = ${fm(br.III)}`, resultado: br.III, unidade: 'm⁴', norma: `${NBR}, 17.3.2.1.1`, entradas: { As: Asd, d: bd.pos.d, ae: ES / cc.Ecs } });
      P_('dimensionamento', tf, { descricao: 'Inércia equivalente de Branson', formula: 'Ie = (Mr/Ma)³·Ic + [1 − (Mr/Ma)³]·III ≤ Ic', expressao: `Ie = ${fm(br.Ie)}`, resultado: br.Ie, unidade: 'm⁴', norma: `${NBR}, 17.3.2.1.1`, entradas: { Mr: br.Mr, Ma, Ic: br.Ic, III: br.III } });
      const rho2 = bd.pos.As2 / (bw * bd.pos.d);
      P_('dimensionamento', tf, { descricao: 'Coeficiente de fluência (ρ′ = armadura de compressão do vão)', formula: 'αf = Δξ/(1 + 50·ρ′), Δξ = ξ(∞) − ξ(t0)', expressao: `Δξ(t0 = ${fm(st.t0Months ?? 1)} meses) = ${fm(df.alphaF! * (1 + 50 * Math.min(rho2, 0.01)))}; ρ′ = ${fm(rho2)} → αf = ${fm(df.alphaF!)}`, resultado: df.alphaF!, unidade: '', norma: `${NBR}, 17.3.2.1.2`, entradas: { t0: st.t0Months ?? 1, As2: bd.pos.As2, bw, d: bd.pos.d, rho2 } });
      const stiff = (x.Emat / 1000 * br.Ic) / (cc.Ecs * br.Ie);
      P_('dimensionamento', tf, { descricao: 'Correção da rigidez: análise feita com E do material e inércia bruta', formula: 'f_imediata = f0·(E·Ic)/(Ecs·Ie)', expressao: `f_imediata = ${fm(fe.f * 1000)}·(${fm(x.Emat / 1000)}·${fm(br.Ic)})/(${fm(cc.Ecs)}·${fm(br.Ie)}) = ${fm(fe.f * stiff * 1000)} mm`, resultado: fe.f * stiff, unidade: 'm', norma: `${NBR}, 17.3.2.1.1`, entradas: { f0: fe.f, E: x.Emat / 1000, Ic: br.Ic, Ecs: cc.Ecs, Ie: br.Ie } });
    }
    const span = x.cantilever ? 2 * L : L;
    P_('dimensionamento', tf, { descricao: 'Flecha total (imediata com fluência) e limite de aceitabilidade', formula: 'f∞ = f_imediata·(1 + αf) ≤ L/250 (balanço: 2L/250)', expressao: `f∞ = ${fm(df.f * 1000)} mm ${df.f <= df.limit ? '≤' : '>'} ${fm(span)}/250 = ${fm(df.limit * 1000)} mm`, resultado: df.f, unidade: 'm', norma: `${NBR}, 13.3 (Tabela 13.3)`, entradas: { fEl: df.fEl, Ie: df.Ie ?? 0, Ic: df.Ic ?? 0, alphaF: df.alphaF ?? 0, limite: df.limit, vao: span } });
    if (df.after) P_('dimensionamento', tf, { descricao: 'Parcela após a alvenaria (diferida αf·f_imediata), limite ℓ/500 e 10 mm', formula: 'f_após = αf·f_imediata ≤ mín(ℓ/500; 10 mm)', expressao: `f_após = ${fm(df.after.f * 1000)} mm ${df.after.f <= df.after.limit ? '≤' : '>'} ${fm(df.after.limit * 1000)} mm`, resultado: df.after.f, unidade: 'm', norma: `${NBR}, 13.3 (Tabela 13.3)`, aConfirmar: true, entradas: { fApos: df.after.f, limite: df.after.limit } });
  }
  void fp;
}
