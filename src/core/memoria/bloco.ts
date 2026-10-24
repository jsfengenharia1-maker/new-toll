// Memória detalhada (MD fase 5b): bloco de coroamento sobre estacas (caps.ts; bielas e tirantes, Blévot; NBR 6118, 22.7).
// Chamada por `registrarFundacoes` só com a memória ligada, depois do cálculo, com os parâmetros guardados em `dadosDoProjeto`.
// Os números vêm do `CapResult` (A, h, ângulos, braços, tirantes) e os intermediários são refeitos com as mesmas fórmulas; o teste
// refaz tudo das `entradas` (reações, lx, ly, dMin, dMax, h, θ, tensões das bielas, T pelo equilíbrio dos nós, As, ancoragem).
import { concrete } from '../concrete';
import { CAP_TIES, capK, type CapInput, type CapResult } from '../caps';
import { capExtra, dadosDoProjeto, type SupportDesign } from '../foundation';
import type { FoundationData, FoundationParams } from '../piles';
import { anchorageLength } from '../rebar';
import { fm, type Registrador } from './registrador';

type Chave = Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>;
const NBR6118 = 'NBR 6118:2023';
const BLEVOT = 'Blévot e Frémy (1967); NBR 6118, 22.7 (a confirmar)';

/** Entrada que o núcleo monta para o bloco a partir da estaca adotada (a mesma de `capFor`/`designSupport`). */
export function entradaBloco(d: SupportDesign, data: FoundationData): CapInput | null {
  const ld = d.load, ex = capExtra(ld);
  if (d.pileFixed) { const pf = d.pileFixed; return { n: pf.n, coords: pf.loads.coords, D: pf.D / 100, s: pf.loads.s, Nk: ld.Nk, Mx: ld.Mx, My: ld.My, ap: d.ap, bp: d.bp, WbAssumed: pf.loads.Wb, ...ex }; }
  if (d.pile) { const s = d.pile; return { n: s.n, coords: s.loads.coords, D: s.D, s: s.loads.s, Nk: ld.Nk, Mx: ld.Mx, My: ld.My, ap: d.ap, bp: d.bp, WbAssumed: s.loads.Wb, ...ex }; }
  void data;
  return null;
}

export function registrarBloco(mem: Registrador, el: string, d: SupportDesign): void {
  const data = dadosDoProjeto.get(d), cap = d.cap;
  if (!data || !cap) return;
  const inp = entradaBloco(d, data);
  if (inp) cadeiaBloco(mem, el, inp, data.params, cap);
}

export function cadeiaBloco(mem: Registrador, el: string, inp: CapInput, p: FoundationParams, r: CapResult): void {
  const E = (etapa: 'cargas' | 'esforcos' | 'dimensionamento' | 'detalhamento', topico: string, q: Chave) => mem.passo({ etapa, elemento: el, topico, ...q });
  const { n, coords, D, ap, bp } = inp;
  const c = concrete(p.fckFound, p.gammaC), fyd = p.fyk / p.gammaS, gf = p.gammaF;
  const Ae = (Math.PI * D * D) / 4;
  const KR = p.capKR, K = capK(n, p);
  const sigmaLim = K * KR * c.fcd;
  const cS = JSON.stringify(coords);

  // ---------------------------------------------------------------- materiais e parâmetros
  let t = 'Materiais e parâmetros do bloco';
  E('dimensionamento', t, { descricao: 'Resistências de cálculo do concreto e do aço', formula: 'fcd = fck/γc; fyd = fyk/γs', expressao: `fcd = ${fm(p.fckFound)}/${fm(p.gammaC)} = ${fm(c.fcd)} MPa; fyd = ${fm(p.fyk)}/${fm(p.gammaS)} = ${fm(fyd)} MPa`, resultado: c.fcd, unidade: 'MPa', norma: `${NBR6118}, 12.3.3`, entradas: { fck: p.fckFound, gammaC: p.gammaC, fyk: p.fyk, gammaS: p.gammaS, fcd: c.fcd, fyd } });
  E('dimensionamento', t, { descricao: `Tensão limite das bielas (bloco de ${n} estaca${n > 1 ? 's' : ''}): K·KR·fcd`, formula: 'σlim = K·KR·fcd', expressao: `σlim = ${fm(K)}·${fm(KR)}·${fm(c.fcd)} = ${fm(sigmaLim)} MPa`, resultado: sigmaLim, unidade: 'MPa', norma: `${BLEVOT}; K = ${fm(K)} (${n} estacas), KR = ${fm(KR)}`, aConfirmar: true, entradas: { K, KR, fcd: c.fcd, n } });
  const lbCol = anchorageLength(p.colPhi, c, fyd);
  E('dimensionamento', t, { descricao: `Ancoragem das barras do pilar (φ${fm(p.colPhi)}) dentro do bloco`, formula: 'lb = máx[(φ/4)·(fyd/fbd); 25φ], fbd = 2,25·fctd', expressao: `fbd = 2,25·${fm(c.fctd)} = ${fm(2.25 * c.fctd)} MPa; lb = ${fm(lbCol)} m`, resultado: lbCol, unidade: 'm', norma: `${NBR6118}, 9.4.2.4 e 9.4.2.5`, entradas: { phi: p.colPhi, fyd, fctd: c.fctd } });
  const dPrime = n === 1 ? p.cover : Math.max(p.capDprime, (0.886 * D) / 5);
  E('dimensionamento', t, { descricao: n === 1 ? 'Bloco de uma estaca: d′ = cobrimento' : 'Distância do centro das barras do tirante à face inferior (d′)', formula: n === 1 ? 'd′ = c' : 'd′ = máx(d′mín; 0,886·D/5)', expressao: n === 1 ? `d′ = ${fm(p.cover)} m` : `d′ = máx(${fm(p.capDprime)}; 0,886·${fm(D)}/5) = ${fm(dPrime)} m`, resultado: dPrime, unidade: 'm', norma: `${BLEVOT}; d′ ≥ máx(10 cm; 0,886D/5) (a confirmar)`, aConfirmar: true, entradas: { capDprime: p.capDprime, D, n, cover: p.cover } });

  // ---------------------------------------------------------------- reação nas estacas
  t = 'Reação de cálculo nas estacas';
  const Sx = coords.reduce((a, [x]) => a + x * x, 0), Sy = coords.reduce((a, [, y]) => a + y * y, 0);
  const Nd = gf * inp.Nk;
  E('esforcos', t, { descricao: 'Carga de cálculo no topo do bloco (γf·Nk da combinação de projeto) e somas dos quadrados das coordenadas das estacas', formula: 'Nd = γf·Nk; Sx = Σx²; Sy = Σy²', expressao: `Nd = ${fm(gf)}·${fm(inp.Nk)} = ${fm(Nd)} kN; Sx = ${fm(Sx)} m²; Sy = ${fm(Sy)} m²`, resultado: Nd, unidade: 'kN', norma: `${NBR6118}, 11.7; γf aplicado ao característico (a confirmar)`, aConfirmar: true, entradas: { gammaF: gf, Nk: inp.Nk, Sx, Sy, coords: cS, Mx: inp.Mx, My: inp.My, n } });
  coords.forEach(([x, y], j) => {
    const Rj = r.R[j];
    E('esforcos', t, { descricao: `Estaca ${j + 1}: posição (${fm(x)}; ${fm(y)}) m`, formula: 'R = γf·[Nk/n + |My|·|x|/Σx² + |Mx|·|y|/Σy²]', expressao: `R = ${fm(gf)}·[${fm(inp.Nk)}/${n} + ${Sx > 1e-9 ? `|${fm(inp.My)}|·${fm(Math.abs(x))}/${fm(Sx)}` : '0'} + ${Sy > 1e-9 ? `|${fm(inp.Mx)}|·${fm(Math.abs(y))}/${fm(Sy)}` : '0'}] = ${fm(Rj)} kN`, resultado: Rj, unidade: 'kN', norma: `${NBR6118}, 22.7; bloco rígido: reação linear nas estacas`, entradas: { gammaF: gf, Nk: inp.Nk, n, My: inp.My, Mx: inp.Mx, x, y, Sx, Sy } });
  });
  E('esforcos', t, { descricao: `Maior reação por estaca e carga equivalente das bielas (n·Rd)${r.multi ? '; pilares múltiplos: cada pilar tem a sua carga escalada ao total das estacas' : ''}`, formula: 'Rd = máx R; Nd,eq = n·Rd', expressao: `Rd = ${fm(r.Rd)} kN; Nd,eq = ${n}·${fm(r.Rd)} = ${fm(r.NdEq)} kN`, resultado: r.Rd, unidade: 'kN', norma: BLEVOT, aConfirmar: true, entradas: { n, Rd: r.Rd, NdEq: r.NdEq, R: JSON.stringify(r.R), Nd: r.Nd } });

  // ---------------------------------------------------------------- planta
  t = 'Dimensões em planta';
  const xs = coords.map(([x]) => x), ys = coords.map(([, y]) => y);
  const exx = Math.max(...xs) - Math.min(...xs), eyy = Math.max(...ys) - Math.min(...ys);
  if (n === 1) {
    E('dimensionamento', t, { descricao: `Bloco de uma estaca: lado a ${inp.fixed ? '(imposto)' : '= máx(ceil05(D + 2e); ceil05(ap + 0,1); ceil05(bp + 0,1)), bloco quadrado'}`, formula: 'a = máx(lx; ly)', expressao: `a = ${fm(r.single!.a)} m`, resultado: r.single!.a, unidade: 'm', norma: BLEVOT, aConfirmar: true, entradas: { D, capEdge: p.capEdge, ap, bp, a: r.single!.a } });
  } else {
    const lxRaw = exx + D + 2 * p.capEdge, lyRaw = eyy + D + 2 * p.capEdge;
    E('dimensionamento', t, { descricao: inp.fixed ? 'Dimensões do bloco impostas (só verificadas)' : 'Planta do bloco: envoltória dos eixos das estacas + D + 2·distância à borda, em múltiplos de 5 cm, com o pilar + 10 cm', formula: 'lx = máx(ceil05(Δx + D + 2e); ceil05(ap + 0,1)); ly análogo', expressao: `Δx = ${fm(exx)}; Δy = ${fm(eyy)}; D = ${fm(D)}; e = ${fm(p.capEdge)} → lx = ${fm(r.lx)} m; ly = ${fm(r.ly)} m`, resultado: r.lx * r.ly, unidade: 'm²', norma: BLEVOT, aConfirmar: true, entradas: { dx: exx, dy: eyy, D, capEdge: p.capEdge, ap, bp, lxBruto: lxRaw, lyBruto: lyRaw, lx: r.lx, ly: r.ly, cols: r.multi ? JSON.stringify(inp.cols ?? []) : '', imposto: inp.fixed ? 1 : 0 } });
  }

  // ---------------------------------------------------------------- um estaca
  if (n === 1 && r.single) {
    const s = r.single;
    t = 'Bloco de uma estaca';
    E('dimensionamento', t, { descricao: inp.fixed?.h ? 'Altura imposta' : 'Altura: h = ceil05(máx(proporção·a; lb + c))', formula: 'h = ceil05(máx(cap1Ratio·a; lb + c))', expressao: `h = ceil05(máx(${fm(p.cap1Ratio)}·${fm(s.a)}; ${fm(lbCol)} + ${fm(p.cover)})) = ${fm(r.h)} m`, resultado: r.h, unidade: 'm', norma: `${BLEVOT} (bloco de 1 estaca: h = a; a confirmar)`, aConfirmar: true, entradas: { cap1Ratio: p.cap1Ratio, a: s.a, lbCol, cover: p.cover, h: r.h, imposta: inp.fixed?.h ? 1 : 0 } });
    (['x', 'y'] as const).forEach((ax, i) => E('dimensionamento', t, { descricao: `Tirante de fretagem (estribos horizontais) na direção ${ax}`, formula: 'Rst = 0,25·Nd·(a − a_pilar)/a; As = Rst/(1000·fyd)', expressao: `Rst = 0,25·${fm(Nd)}·máx(0; ${fm(s.a)} − ${fm(i ? bp : ap)})/${fm(s.a)} = ${fm(s.Rst[i])} kN; As = ${fm(s.Rst[i])}/(1000·${fm(fyd)}) = ${fm(s.As[i] * 1e4)} cm²`, resultado: s.As[i], unidade: 'm²', norma: `${BLEVOT} (Rst = 0,25·Nd·(a − ap)/a; a confirmar)`, aConfirmar: true, entradas: { Nd, a: s.a, ap: i ? bp : ap, fyd, Rst: s.Rst[i], As: s.As[i] } }));
    const Ac0 = ap * bp;
    E('dimensionamento', t, { descricao: 'Pressão de contato do pilar (área parcialmente carregada)', formula: 'σ = Nd/(ap·bp) ≤ fcd·mín(√mín((a/ap)²; (a/bp)²); 3,3)', expressao: `σ = ${fm(Nd / 1000)}/${fm(Ac0)} = ${fm(s.colSigma)} MPa ${s.colSigma <= s.colLim + 1e-9 ? '≤' : '>'} ${fm(s.colLim)} MPa`, resultado: s.colSigma, unidade: 'MPa', norma: `${NBR6118}, 21.2`, entradas: { Nd, ap, bp, a: s.a, fcd: c.fcd, limite: s.colLim } });
    E('dimensionamento', t, { descricao: 'Pressão na cabeça da estaca', formula: 'σ = Nd/Ae ≤ fcd·mín(a/(0,886·D); 3,3)', expressao: `σ = ${fm(Nd / 1000)}/${fm(Ae)} = ${fm(s.pileSigma)} MPa ${s.pileSigma <= s.pileLim + 1e-9 ? '≤' : '>'} ${fm(s.pileLim)} MPa`, resultado: s.pileSigma, unidade: 'MPa', norma: `${NBR6118}, 21.2`, entradas: { Nd, D, Ae, a: s.a, fcd: c.fcd, limite: s.pileLim } });
  } else {
    // ---------------------------------------------------------------- bielas
    t = 'Bielas: geometria e altura';
    const struts = r.multi ? r.multi.struts : coords.map((_, j) => ({ col: 0, pile: j, F: r.Rd, top: r.tops[j] ?? [0, 0] as [number, number], arm: r.arms[j], theta: r.theta[j] }));
    for (const q of struts) {
      const [x, y] = coords[q.pile];
      E('dimensionamento', t, { descricao: `${r.multi ? `Biela do pilar ${r.multi.cols[q.col]?.label ?? q.col + 1} à` : 'Biela do pilar à'} estaca ${q.pile + 1}: topo no centróide da parte do pilar voltada à estaca; braço horizontal ${r.multi ? '(carga da biela F pelo ajuste bi-proporcional)' : '(F = Rd)'}`, formula: 'arm = √[(x − xt)² + (y − yt)²]', expressao: `topo = (${fm(q.top[0], 5)}; ${fm(q.top[1], 5)}) m; arm = ${fm(q.arm, 5)} m; F = ${fm(q.F)} kN`, resultado: q.arm, unidade: 'm', norma: BLEVOT, aConfirmar: true, entradas: { col: q.col, pile: q.pile, x, y, tx: q.top[0], ty: q.top[1], F: q.F, arm: q.arm } });
    }
    const outerArms = struts.filter((q) => q.arm > 1e-9).map((q) => q.arm);
    const tmin = (p.capThetaMin * Math.PI) / 180, tmax = (p.capThetaMax * Math.PI) / 180;
    const dMin = Math.max(...outerArms) * Math.tan(tmin), dMax = Math.min(...outerArms) * Math.tan(tmax);
    E('dimensionamento', t, { descricao: `Altura útil mínima (biela mais longa a ${fm(p.capThetaMin)}°) e máxima (biela mais curta a ${fm(p.capThetaMax)}°)`, formula: 'd,mín = arm,máx·tan θmín; d,máx = arm,mín·tan θmáx', expressao: `d,mín = ${fm(Math.max(...outerArms))}·tan(${fm(p.capThetaMin)}°) = ${fm(dMin)} m; d,máx = ${fm(Math.min(...outerArms))}·tan(${fm(p.capThetaMax)}°) = ${fm(dMax)} m`, resultado: dMin, unidade: 'm', norma: `${BLEVOT}; 45° ≤ θ ≤ 55° (a confirmar)`, aConfirmar: true, entradas: { armMax: Math.max(...outerArms), armMin: Math.min(...outerArms), thetaMin: p.capThetaMin, thetaMax: p.capThetaMax, dMin, dMax } });
    E('dimensionamento', t, { descricao: inp.fixed?.h ? 'Altura imposta' : `Altura do bloco: h = ceil05(máx(d,mín; lb) + d′)${lbCol > dMin ? ' (governada pela ancoragem das barras do pilar)' : ''}`, formula: 'h = ceil05(máx(d,mín; lb) + d′); d = h − d′', expressao: `h = ceil05(máx(${fm(dMin)}; ${fm(lbCol)}) + ${fm(dPrime)}) = ${fm(r.h)} m; d = ${fm(r.h)} − ${fm(dPrime)} = ${fm(r.d)} m`, resultado: r.h, unidade: 'm', norma: `${BLEVOT}; d ≥ lb do pilar (a confirmar)`, aConfirmar: true, entradas: { dMin, lbCol, dPrime, h: r.h, d: r.d, dMax, imposta: inp.fixed?.h ? 1 : 0 } });
    t = 'Bielas: inclinação e tensões';
    struts.forEach((q) => {
      const th = q.arm > 1e-9 ? (Math.atan(r.d / q.arm) * 180) / Math.PI : 90;
      E('dimensionamento', t, { descricao: `Inclinação da biela ${r.multi ? `do pilar ${q.col + 1} ` : ''}à estaca ${q.pile + 1}`, formula: 'θ = arctan(d/arm)', expressao: `θ = arctan(${fm(r.d)}/${fm(q.arm, 5)}) = ${fm(th)}°`, resultado: th, unidade: '°', norma: BLEVOT, entradas: { d: r.d, arm: q.arm } });
    });
    E('dimensionamento', t, { descricao: `Inclinações extremas das bielas externas${r.d > dMax + 1e-9 ? ` — d > d,máx: biela mais inclinada que ${fm(p.capThetaMax)}°` : ''}`, formula: 'θmín; θmáx', expressao: `θmín = ${fm(r.thetaMin)}°; θmáx = ${fm(r.thetaMax)}°`, resultado: r.thetaMin, unidade: '°', norma: BLEVOT, entradas: { thetaMin: r.thetaMin, thetaMax: r.thetaMax } });
    if (!r.multi) {
      E('dimensionamento', t, { descricao: 'Tensão da biela junto ao pilar (seção do pilar, menor inclinação)', formula: 'σ = Nd,eq/(ap·bp·sen²θmín) ≤ σlim', expressao: `σ = ${fm(r.NdEq / 1000)}/(${fm(ap)}·${fm(bp)}·sen²(${fm(r.thetaMin)}°)) = ${fm(r.strutCol)} MPa ${r.strutCol <= sigmaLim + 1e-9 ? '≤' : '>'} ${fm(sigmaLim)} MPa`, resultado: r.strutCol, unidade: 'MPa', norma: BLEVOT, aConfirmar: true, entradas: { NdEq: r.NdEq, ap, bp, thetaMin: r.thetaMin, sigmaLim } });
      E('dimensionamento', t, { descricao: 'Tensão da biela junto à estaca (pior estaca)', formula: 'σ = máx_j[Rd/(Ae·sen²θj)] ≤ σlim', expressao: `σ = ${fm(r.strutPile)} MPa ${r.strutPile <= sigmaLim + 1e-9 ? '≤' : '>'} ${fm(sigmaLim)} MPa (Ae = ${fm(Ae)} m²)`, resultado: r.strutPile, unidade: 'MPa', norma: BLEVOT, aConfirmar: true, entradas: { Rd: r.Rd, Ae, theta: JSON.stringify(r.theta), sigmaLim } });
    } else {
      r.multi.cols.forEach((q, i) => E('dimensionamento', t, { descricao: `Pilar ${q.label}: tensão da biela junto ao pilar (carga escalada ao total das estacas)`, formula: 'σ = Nd,eq,i/(ap·bp·sen²θmín,i) ≤ σlim', expressao: `σ = ${fm(q.NdEq / 1000)}/(${fm(inp.cols![i].ap)}·${fm(inp.cols![i].bp)}·sen²(${fm(q.thetaMin)}°)) = ${fm(q.sigma)} MPa ${q.ok ? '≤' : '>'} ${fm(sigmaLim)} MPa`, resultado: q.sigma, unidade: 'MPa', norma: BLEVOT, aConfirmar: true, entradas: { NdEq: q.NdEq, ap: inp.cols![i].ap, bp: inp.cols![i].bp, thetaMin: q.thetaMin, sigmaLim } }));
      E('dimensionamento', t, { descricao: 'Tensão da biela junto à estaca (pior estaca; soma das bielas que chegam)', formula: 'σ = máx_j[máx(Rj; ΣF)/(Ae·sen²θj)]', expressao: `σ = ${fm(r.strutPile)} MPa ${r.strutPile <= sigmaLim + 1e-9 ? '≤' : '>'} ${fm(sigmaLim)} MPa`, resultado: r.strutPile, unidade: 'MPa', norma: BLEVOT, aConfirmar: true, entradas: { Ae, theta: JSON.stringify(r.theta), R: JSON.stringify(r.R), F: JSON.stringify(r.multi.struts.map((q) => [q.pile, q.F])), sigmaLim } });
    }

    // ---------------------------------------------------------------- tirantes
    t = 'Tirantes';
    const hv: [number, number][] = coords.map(([x, y], j) => {
      let hx = 0, hy = 0;
      for (const q of struts) if (q.pile === j && q.arm > 0) { hx += (q.F * (x - q.top[0])) / r.d; hy += (q.F * (y - q.top[1])) / r.d; }
      return [hx, hy];
    });
    E('esforcos', t, { descricao: 'Componente horizontal das bielas em cada estaca (nós da treliça plana de tirantes)', formula: 'H = Σ F·(x − xt)/d; (y análogo)', expressao: hv.map(([hx, hy], j) => `estaca ${j + 1}: (${fm(hx)}; ${fm(hy)}) kN`).join('; '), resultado: Math.max(...hv.map(([hx, hy]) => Math.hypot(hx, hy))), unidade: 'kN', norma: BLEVOT, entradas: { coords: cS, d: r.d, hv: JSON.stringify(hv), struts: JSON.stringify(struts.map((q) => [q.pile, q.F, q.top[0], q.top[1], q.arm])) } });
    const band = p.capBand * D, edges = CAP_TIES[n] ?? [];
    r.ties.forEach((tie, e) => {
      const [a, b] = edges[e];
      E('dimensionamento', t, { descricao: `Tirante ${a + 1}–${b + 1} (${tie.dir}): força pelo equilíbrio horizontal dos nós (mínimos quadrados sobre a malha de tirantes) e armadura`, formula: 'T: Σ(T·u) + H = 0 nos nós; As = T/(1000·fyd)', expressao: `T = ${fm(tie.T)} kN; As = ${fm(tie.T)}/(1000·${fm(fyd)}) = ${fm(tie.As * 1e4)} cm²`, resultado: tie.As, unidade: 'm²', norma: BLEVOT, aConfirmar: true, entradas: { a, b, T: tie.T, fyd, As: tie.As, edges: JSON.stringify(edges), dir: tie.dir } });
      E('detalhamento', t, { descricao: `Tirante ${a + 1}–${b + 1}: barras na faixa de ${fm(p.capBand)}·D = ${fm(band)} m${inp.fixed?.bars ? ' (armadura imposta, só verificada)' : ''}`, formula: 'menor área com n ≥ 2 barras, φ ≥ 10 mm, espaçamento ≥ máx(2 cm; φ; 1,2·dmáx)', expressao: tie.bars ? `${tie.bars.n} φ${fm(tie.bars.phi)} (${fm(tie.bars.As * 1e4)} cm²)` : tie.As <= 1e-9 ? 'tirante descarregado' : 'não coube na faixa', resultado: tie.bars ? `${tie.bars.n} φ${fm(tie.bars.phi)}` : 'sem barras', unidade: '', norma: BLEVOT, aConfirmar: true, entradas: { As: tie.As, faixa: band, ...(tie.bars ? { phi: tie.bars.phi, n: tie.bars.n, Aprov: tie.bars.As } : {}) } });
      if (tie.bars) {
        const lb = anchorageLength(tie.bars.phi, c, fyd), nec = Math.max(0.7 * lb * (tie.As / tie.bars.As), 0.3 * lb, (10 * tie.bars.phi) / 1000, 0.1);
        E('detalhamento', t, { descricao: `Tirante ${a + 1}–${b + 1}: ancoragem com gancho a partir da face interna da estaca`, formula: 'lb,nec = máx(0,7·lb·As/As,ef; 0,3·lb; 10φ; 10 cm) ≤ lb,disp = D + e − c', expressao: `lb = ${fm(lb)} m; lb,nec = ${fm(nec)} m ${nec <= tie.lbAvail + 1e-9 ? '≤' : '>'} lb,disp = ${fm(D)} + ${fm(p.capEdge)} − ${fm(p.cover)} = ${fm(tie.lbAvail)} m`, resultado: nec, unidade: 'm', norma: `${NBR6118}, 9.4.2.5`, entradas: { phi: tie.bars.phi, lb, As: tie.As, Aef: tie.bars.As, lbNec: tie.lbNec, D, capEdge: p.capEdge, cover: p.cover, lbDisp: tie.lbAvail } });
      }
    });

    // ---------------------------------------------------------------- complementares
    t = 'Armaduras complementares';
    const bw = (a: number, b: number) => { const dx = coords[b][0] - coords[a][0], dy = coords[b][1] - coords[a][1], L = Math.hypot(dx, dy); return [Math.abs(dx / L), Math.abs(dy / L)]; };
    if (r.mesh) {
      const px = r.ties.reduce((s, tie) => s + tie.As * bw(tie.a, tie.b)[0], 0), py = r.ties.reduce((s, tie) => s + tie.As * bw(tie.a, tie.b)[1], 0);
      for (const [ax, m, pr] of [['x', r.mesh.x, px], ['y', r.mesh.y, py]] as const) E('detalhamento', t, { descricao: `Malha inferior na direção ${ax}: ${fm(p.capDistRatio * 100)} % da projeção das áreas dos tirantes`, formula: 'As,malha = ρ·Σ(As,tirante·|cos|)', expressao: `As,malha = ${fm(p.capDistRatio)}·${fm(pr * 1e4)} = ${fm(m.As * 1e4)} cm²${m.bars ? `; ${m.bars.n} φ${fm(m.bars.phi)} c/${fm(m.bars.spacing * 100)} cm` : ''}`, resultado: m.As, unidade: 'm²', norma: BLEVOT, aConfirmar: true, entradas: { capDistRatio: p.capDistRatio, projecao: pr, As: m.As, ...(m.bars ? { phi: m.bars.phi, n: m.bars.n, s: m.bars.spacing } : {}) } });
    }
    if (r.top && r.skin && r.stirrups) {
      E('detalhamento', t, { descricao: 'Armadura superior do bloco de 2 estacas', formula: 'As,sup = ρ·As,tirante', expressao: `As,sup = ${fm(p.capDistRatio)}·${fm((r.ties[0]?.As ?? 0) * 1e4)} = ${fm(r.top.As * 1e4)} cm²${r.top.bars ? `; ${r.top.bars.n} φ${fm(r.top.bars.phi)}` : ''}`, resultado: r.top.As, unidade: 'm²', norma: BLEVOT, aConfirmar: true, entradas: { capDistRatio: p.capDistRatio, AsTirante: r.ties[0]?.As ?? 0, As: r.top.As } });
      E('detalhamento', t, { descricao: 'Armadura de pele (cada face)', formula: 'As,pele = ρ·w·h', expressao: `As,pele = ${fm(p.capSkinRatio)}·w·${fm(r.h)} = ${fm(r.skin.AsFace * 1e4)} cm²${r.skin.bars ? `; ${r.skin.bars.n} φ${fm(r.skin.bars.phi)}` : ''}`, resultado: r.skin.AsFace, unidade: 'm²', norma: `${BLEVOT}; ρ = 0,10 % (a confirmar)`, aConfirmar: true, entradas: { capSkinRatio: p.capSkinRatio, h: r.h, As: r.skin.AsFace } });
      E('detalhamento', t, { descricao: `Estribos verticais: ${r.stirrups.legs} ramos φ${fm(r.stirrups.phi)} c/${fm(r.stirrups.s * 100)} cm`, formula: 'Asw/s = 0,2·fctm/fyk·w', expressao: `Asw/s = ${fm(r.stirrups.aswS * 1e4)} cm²/m`, resultado: r.stirrups.aswS, unidade: 'm²/m', norma: `${NBR6118}, 17.4.1.1.1`, entradas: { fctm: c.fctm, fyk: p.fyk, aswS: r.stirrups.aswS, phi: r.stirrups.phi, s: r.stirrups.s, legs: r.stirrups.legs } });
    }
    E('detalhamento', t, { descricao: r.susp.need ? `Armadura de suspensão (espaçamento ${fm(inp.s)} m > ${fm(p.capSuspFactor)}·D)` : `Armadura de suspensão dispensada (espaçamento ${fm(inp.s)} m ≤ ${fm(p.capSuspFactor)}·D)`, formula: 's > f·D ⇒ As,susp = Nd/(1,5·n·fyd)', expressao: r.susp.need ? `As,susp = ${fm(Nd / 1000)}/(1,5·${n}·${fm(fyd)}) = ${fm(r.susp.AsTot * 1e4)} cm²` : '—', resultado: r.susp.AsTot, unidade: 'm²', norma: `${BLEVOT} (a confirmar)`, aConfirmar: true, entradas: { s: inp.s, D, fator: p.capSuspFactor, Nd, n, fyd, need: r.susp.need ? 1 : 0, As: r.susp.AsTot } });
  }

  // ---------------------------------------------------------------- volume e situação
  t = 'Volume, peso e situação';
  E('detalhamento', t, { descricao: 'Volume e peso do bloco (comparado com o peso adotado na distribuição das cargas)', formula: 'V = lx·ly·h; Wb = 25·V', expressao: `V = ${fm(r.lx)}·${fm(r.ly)}·${fm(r.h)} = ${fm(r.volume)} m³; Wb = ${fm(r.weight)} kN${r.WbAssumed !== undefined ? ` (adotado ${fm(r.WbAssumed)} kN)` : ''}`, resultado: r.volume, unidade: 'm³', norma: NBR6118, entradas: { lx: r.lx, ly: r.ly, h: r.h, W: r.weight, WbAdotado: r.WbAssumed ?? 0 } });
  E('detalhamento', t, { descricao: r.ok ? 'Bloco atende às verificações' : 'Bloco NÃO atende', formula: 'verificações', expressao: r.messages.join(' ') || 'sem mensagens', resultado: r.ok ? 'atende' : 'não atende', unidade: '', entradas: {} });
}
