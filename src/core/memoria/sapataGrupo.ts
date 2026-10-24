// Memória detalhada (MD fase 5b): sapata associada / aparada por limites (footingsGroup.ts). Chamada por `registrarSapata` só com a
// memória ligada, depois do cálculo. Os diagramas de momento por faixa vêm de `detalheGrupo` (entradas e resultados de `faixa` do
// próprio cálculo, guardados num WeakMap só com a memória ligada); o teste refaz `faixa` com as entradas registradas.
import { concrete } from '../concrete';
import { casosDoGrupo, detalheGrupo, maiorVao } from '../footingsGroup';
import { polyPressure, sptSigma, type FootingInput, type FootingResult, type Pt } from '../footings';
import type { FoundationParams } from '../piles';
import { fm, type Registrador, type ValorMemoria } from './registrador';
import { flexao } from './vigaConcreto';

type Chave = Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>;
const NBR6122 = 'NBR 6122:2019';
const NBR6118 = 'NBR 6118:2023';
const ASSOC = 'Sapata associada: faixas pelo diagrama de momentos (a confirmar)';

export function cadeiaSapataGrupo(mem: Registrador, el: string, inp: FootingInput, p: FoundationParams, f: FootingResult): void {
  const det = detalheGrupo.get(f), g = inp.group, gr = f.grupo;
  if (!det || !g || !gr) return;
  const E = (etapa: 'cargas' | 'esforcos' | 'dimensionamento' | 'detalhamento', topico: string, q: Chave) => mem.passo({ etapa, elemento: el, topico, ...q });
  const cols = g.cols, c = concrete(p.fckFound, p.gammaC), cS = concrete(p.fckFound, p.gammaC * p.ftSimplesGamma), fyd = p.fyk / p.gammaS, gf = p.gammaF;
  const { A, B, W } = f, poly = gr.contorno as Pt[];

  // ---------------------------------------------------------------- pilares e combinações
  let t = 'Pilares e combinações do grupo';
  E('dimensionamento', t, { descricao: `Pilares sobre a sapata (posição do centro em relação ao ponto de referência, seção nos eixos do elemento)${g.limits?.length ? `; ${g.limits.length} limite(s) de divisa disponíveis` : ''}`, formula: 'x, y, ap, bp de cada pilar', expressao: cols.map((q) => `${q.label}: (${fm(q.x, 5)}; ${fm(q.y, 5)}) m, ${fm(q.ap)} × ${fm(q.bp)} m`).join('; '), resultado: cols.length, unidade: '', norma: ASSOC, aConfirmar: true, entradas: { cols: JSON.stringify(cols), limites: JSON.stringify(g.limits ?? []) } });
  for (const cb of g.combos) {
    const N = cb.cols.reduce((a, q) => a + q.N, 0);
    E('esforcos', t, { descricao: `${cb.label}: carga de cada pilar (eixos do elemento) e total`, formula: 'N = Σ Ni', expressao: `${cb.cols.map((q, i) => `${cols[i].label}: N = ${fm(q.N)} kN, M = (${fm(q.Mx)}; ${fm(q.My)}) kN·m`).join('; ')} → N = ${fm(N)} kN`, resultado: N, unidade: 'kN', norma: NBR6122, entradas: { combo: cb.label, cols: JSON.stringify(cb.cols), N } });
  }
  t = 'Casos de verificação';
  const casos = casosDoGrupo(cols, g.combos);
  casos.forEach((cs, i) => {
    const tot = cs.combo.cols.reduce((a, q) => a + q.N, 0);
    E('esforcos', t, { descricao: `Caso ${i + 1}: ${cs.label}, sinais dos momentos dos pilares (x ${cs.sx > 0 ? '+' : '−'}, y ${cs.sy > 0 ? '+' : '−'}); momentos em relação à origem (ponto de referência)`, formula: 'My = sx·ΣMy,i + ΣNi·xi; Mx = sy·ΣMx,i + ΣNi·yi', expressao: `N = ${fm(tot)} kN; My = ${fm(cs.My)} kN·m; Mx = ${fm(cs.Mx)} kN·m`, resultado: tot, unidade: 'kN', norma: `${ASSOC}; os dois sinais dos momentos (a convenção não é distinguida)`, aConfirmar: true, entradas: { caso: i, combo: cs.label, sx: cs.sx, sy: cs.sy, N: tot, My: cs.My, Mx: cs.Mx, cols: JSON.stringify(cs.combo.cols), colsPos: JSON.stringify(cols.map((q) => [q.x, q.y])) } });
  });

  // ---------------------------------------------------------------- σadm, peso, planta
  t = 'Tensão admissível do solo';
  const Bmin = Math.min(A, B);
  if (p.ftSigmaMode === 'informada') E('dimensionamento', t, { descricao: 'σadm informada (elemento ou terreno)', formula: 'σadm = valor informado', expressao: `σadm = ${fm(f.sigmaAdm)} kPa`, resultado: f.sigmaAdm, unidade: 'kPa', norma: NBR6122, entradas: { origem: 'informada' } });
  else {
    const bulbo = p.ftBulb * Bmin, z0 = p.ftDepth;
    const sel = (inp.boring?.meters ?? []).map((m, i) => [i + 1, m.N] as [number, number]).filter(([z]) => z > z0 + 1e-9 && z <= z0 + Math.max(1, bulbo) + 1e-9);
    const sg = inp.boring ? sptSigma(inp.boring, z0, bulbo, p.ftSptDiv, p.ftNmaxEst) : null;
    E('dimensionamento', t, { descricao: `Camadas do SPT no bulbo de tensões (bulbo = ${fm(p.ftBulb)}·menor lado)`, formula: 'N̄ = média dos NSPT por metro do bulbo', expressao: `NSPT = ${sel.map(([z, n]) => `${fm(z, 3)} m: ${fm(n)}`).join('; ')} → N̄ = ${fm(sg?.Nbar ?? 0)}`, resultado: sg?.Nbar ?? 0, unidade: '', norma: NBR6122, aConfirmar: true, entradas: { profundidade: z0, fatorBulbo: p.ftBulb, menorLado: Bmin, leituras: JSON.stringify(sel) } });
    E('dimensionamento', t, { descricao: 'N̄ limitado e σadm estimada pelo SPT', formula: 'σadm = mín(N̄; Nmáx)/div · 1000', expressao: `σadm = mín(${fm(sg?.Nbar ?? 0)}; ${fm(p.ftNmaxEst)})/${fm(p.ftSptDiv)}·1000 = ${fm(f.sigmaAdm)} kPa`, resultado: f.sigmaAdm, unidade: 'kPa', norma: `${NBR6122}; N̄/${p.ftSptDiv} MPa (a confirmar)`, aConfirmar: true, entradas: { Nbar: sg?.Nbar ?? 0, Nmax: p.ftNmaxEst, div: p.ftSptDiv } });
  }
  t = 'Peso próprio e planta';
  const Nkmax = Math.max(...g.combos.map((cb) => cb.cols.reduce((a, q) => a + q.N, 0)));
  const W0 = (p.ftPP / 100) * Nkmax;
  E('dimensionamento', t, { descricao: `Peso próprio estimado (${fm(p.ftPP)} % da maior carga total); refeito com o peso do concreto até convergir`, formula: 'W0 = ftPP/100·Nk,máx', expressao: `W0 = ${fm(p.ftPP)}/100·${fm(Nkmax)} = ${fm(W0)} kN`, resultado: W0, unidade: 'kN', norma: NBR6122, aConfirmar: true, entradas: { ftPP: p.ftPP, Nk: Nkmax } });
  E('dimensionamento', t, { descricao: 'Peso próprio adotado (percentual ou, se maior, o peso do concreto arredondado para cima em kN) e peso do solo sobre a sapata', formula: 'W = máx(W0; ⌈Wconc⌉); Wsolo = γsolo·máx(0; Apl·z − V)', expressao: `W = ${fm(W)} kN; Wconc = ${fm(f.Wconc)} kN; Wsolo = ${fm(f.Wsoil)} kN`, resultado: W, unidade: 'kN', norma: NBR6122, aConfirmar: true, entradas: { W0, W, Wconc: f.Wconc, Wsoil: f.Wsoil } });
  const Apl = poly.reduce((s, a, i) => { const z = poly[(i + 1) % poly.length]; return s + a[0] * z[1] - z[0] * a[1]; }, 0) / 2;
  E('dimensionamento', t, { descricao: `Planta: retângulo A × B centrado no ponto de referência, recortado pelos limites (${gr.limitesUsados.length} atuando); menor área em passos de 5 cm que atende σadm, tensão de borda e área comprimida`, formula: 'Apl = área do polígono recortado', expressao: `A = ${fm(A)} m; B = ${fm(B)} m; Apl = ${fm(Math.abs(Apl))} m²; vértices: ${poly.map((q) => `(${fm(q[0])}; ${fm(q[1])})`).join(' ')}`, resultado: Math.abs(Apl), unidade: 'm²', norma: NBR6122, aConfirmar: true, entradas: { A, B, poly: JSON.stringify(poly), area: Math.abs(Apl), limitesUsados: JSON.stringify(gr.limitesUsados), limitesIgnorados: JSON.stringify(gr.limitesIgnorados) } });

  // ---------------------------------------------------------------- tensões no solo
  casos.forEach((cs, i) => {
    t = `Tensões no solo · caso ${i + 1}`;
    const N = cs.N + W, pr = polyPressure(poly, N, cs.My / N, cs.Mx / N);
    if (!pr) return;
    E('dimensionamento', t, { descricao: `${cs.label}: força na base (cargas + peso próprio no centro) e excentricidades da resultante`, formula: 'N = ΣN + W; ex = My/N; ey = Mx/N', expressao: `N = ${fm(cs.N)} + ${fm(W)} = ${fm(N)} kN; ex = ${fm(cs.My / N, 5)} m; ey = ${fm(cs.Mx / N, 5)} m`, resultado: N, unidade: 'kN', norma: NBR6122, entradas: { N: cs.N, W, Nbase: N, My: cs.My, Mx: cs.Mx, ex: cs.My / N, ey: cs.Mx / N } });
    E('dimensionamento', t, { descricao: `Tensões na base sem tração (plano de tensões na região comprimida do polígono) ≤ ${fm(p.ftEdgeFactor)}·σadm; área comprimida ≥ ${fm((p.ftLevantamento ? 0 : p.ftMinCompressed) * 100)} %`, formula: 'σ(x,y) = máx(0; v0 + v1·x + v2·y), equilíbrio de N, Mx e My', expressao: `σmáx = ${fm(pr.sigmaMax)} kPa ${pr.sigmaMax <= p.ftEdgeFactor * f.sigmaAdm + 1e-6 ? '≤' : '>'} ${fm(p.ftEdgeFactor * f.sigmaAdm)} kPa; σmín = ${fm(pr.sigmaMin)} kPa; comprimida = ${fm(pr.compressed * 100)} %`, resultado: pr.sigmaMax, unidade: 'kPa', norma: NBR6122, entradas: { poly: JSON.stringify(poly), N, ex: cs.My / N, ey: cs.Mx / N, sigmaMax: pr.sigmaMax, sigmaMin: pr.sigmaMin, compressed: pr.compressed, v: JSON.stringify(pr.v), sigmaAdm: f.sigmaAdm, edge: p.ftEdgeFactor } });
  });

  // ---------------------------------------------------------------- altura
  t = 'Altura e ancoragem';
  const vao = maiorVao(cols);
  E('dimensionamento', t, { descricao: 'Balanço máximo da base além dos pilares extremos e maior vão entre pilares vizinhos (maior aresta da árvore geradora mínima dos centros)', formula: 'c = máx(balanços); ℓ = maior vão', expressao: `c = ${fm(det.balanco)} m; ℓ = ${fm(vao)} m`, resultado: det.balanco, unidade: 'm', norma: ASSOC, aConfirmar: true, entradas: { balanco: det.balanco, vao, cantosPilares: JSON.stringify(cols.map((q) => [q.x, q.y, q.ap, q.bp])) } });
  E('dimensionamento', t, { descricao: 'Alturas mínimas da sapata rígida pelo balanço e pelo vão', formula: 'hbal = (2/3)·c·(1,5/ftBalancoAltura); hvão = ℓ/ftVaoAltura', expressao: `hbal = (2/3)·${fm(det.balanco)}·(1,5/${fm(p.ftBalancoAltura)}) = ${fm(det.hBal)} m; hvão = ${fm(vao)}/${fm(p.ftVaoAltura)} = ${fm(det.hVao)} m`, resultado: Math.max(det.hBal, det.hVao), unidade: 'm', norma: `${NBR6118}, 22.6.1; relação balanço/altura e vão/altura (a confirmar)`, aConfirmar: true, entradas: { balanco: det.balanco, ftBalancoAltura: p.ftBalancoAltura, vao, ftVaoAltura: p.ftVaoAltura, hBal: det.hBal, hVao: det.hVao } });
  E('dimensionamento', t, { descricao: `Ancoragem das barras do pilar (φ${fm(p.colPhi)}) e altura adotada ${inp.fixed?.h ? '(imposta)' : '= ceil05(máx(hbal; hvão; lb + c))'}${f.simples ? '; concreto simples: ao menos a altura pela tração na flexão' : ''}`, formula: 'lb = máx[(φ/4)·(fyd/fbd); 25φ]; h = ceil05(máx(hbal; hvão; lb + c))', expressao: `lb = ${fm(det.lbCol)} m; h = ${fm(f.h)} m`, resultado: f.h, unidade: 'm', norma: NBR6118, aConfirmar: true, entradas: { hBal: det.hBal, hVao: det.hVao, lbCol: det.lbCol, cover: p.cover, h: f.h, imposta: inp.fixed?.h ? 1 : 0, simples: f.simples ? 1 : 0, phi: p.colPhi, fyd, fctd: c.fctd } });
  const d = f.h - p.cover - 0.01;
  E('dimensionamento', t, { descricao: `h0 da borda (${inp.constH ? 'altura constante' : 'máx(h/3; h0mín) em passos de 5 cm'}) e altura útil (barras de 10 mm de referência)`, formula: 'd = h − c − 0,01', expressao: `h0 = ${fm(f.h0)} m; d = ${fm(f.h)} − ${fm(p.cover)} − 0,01 = ${fm(d)} m`, resultado: d, unidade: 'm', norma: NBR6118, entradas: { h: f.h, h0: f.h0, cover: p.cover, d, h0Min: p.ftH0Min, constH: inp.constH ? 1 : 0 } });

  // ---------------------------------------------------------------- momentos por faixa
  t = 'Momentos por faixa (diagrama)';
  E('esforcos', t, { descricao: `Pressão do solo de cálculo (γf = ${fm(gf)} aplicado ao N e aos momentos, sem o peso próprio) menos as cargas dos pilares distribuídas na largura de cada um, mais os conjugados; seções a 0,35·a dentro da face dos pilares extremos e balanços de pressão`, formula: 'M(u) = ∫∫q − Σ[Ni·F1(u) − Mi·rampa(u)]', expressao: `${det.faixas.length} diagrama(s): ${casos.length} caso(s) × 2 direções`, resultado: det.faixas.length, unidade: '', norma: ASSOC, aConfirmar: true, entradas: { gammaF: gf, n: det.faixas.length } });
  for (const q of det.faixas) {
    const cs = casos[q.caso];
    E('esforcos', t, { descricao: `Caso ${q.caso + 1} (${cs.label}), direção ${q.ax}: momento positivo na seção de referência ou entre pilares e momento negativo entre pilares`, formula: 'Mpos = máx(M balanço esq.; M balanço dir.; M máx entre pilares); Mneg = mín M entre pilares', expressao: `M+ = ${fm(q.Mpos)} kN·m em u = ${fm(q.xPos)} m (largura ${fm(q.larguraPos)} m); M− = ${fm(q.Mneg)} kN·m em u = ${fm(q.xNeg)} m (largura ${fm(q.larguraNeg)} m); fechamento ${fm(q.residuo * 100)} %`, resultado: q.Mpos, unidade: 'kN·m', norma: ASSOC, aConfirmar: true, entradas: { caso: q.caso, eixo: q.ax, poly: JSON.stringify(q.ax === 'x' ? poly : poly.map(([x, y]) => [y, x])), v: JSON.stringify(q.v), col: JSON.stringify(q.col), secE: q.secE, secD: q.secD, Mpos: q.Mpos, xPos: q.xPos, Mneg: q.Mneg, xNeg: q.xNeg, larguraPos: q.larguraPos, larguraNeg: q.larguraNeg, cPos: q.cPos, Nd: q.Nd } });
  }
  const xs = poly.map((q) => q[0]), ys = poly.map((q) => q[1]);
  for (const ax of ['x', 'y'] as const) {
    const e = det.env[ax];
    E('esforcos', t, { descricao: `Envoltória dos casos, direção ${ax}`, formula: 'M+ = máx; M− = mín; larguras das faixas', expressao: `M+ = ${fm(e.Mpos)} kN·m (largura ${fm(e.Wpos)} m, balanço ${fm(e.cPos)} m); M− = ${fm(e.Mneg)} kN·m (largura ${fm(e.Wneg)} m)`, resultado: e.Mpos, unidade: 'kN·m', norma: ASSOC, aConfirmar: true, entradas: { eixo: ax, Mpos: e.Mpos, cPos: e.cPos, Wpos: e.Wpos, Mneg: e.Mneg, Wneg: e.Wneg } });
  }

  // ---------------------------------------------------------------- flexão
  for (const ax of ['x', 'y'] as const) {
    const e = det.env[ax], fx = f.flex[ax], tf = `Flexão · direção ${ax}`;
    const Wd = e.Wpos > 0 ? e.Wpos : ax === 'x' ? Math.max(...ys) - Math.min(...ys) : Math.max(...xs) - Math.min(...xs);
    const dEff = e.cPos > 0 ? Math.min(d, 1.5 * e.cPos) : d;
    const AsMin = p.ftRhoMin * Wd * f.h;
    const Wn = e.Wneg > 0 ? e.Wneg : Wd, sigmaTn = Math.abs(e.Mneg) > 0 ? (6 * (Math.abs(e.Mneg) / 1000)) / (Wn * f.h * f.h) : 0;
    if (f.simples) {
      const sigmaT = e.Wpos > 0 ? (6 * (e.Mpos / 1000)) / (e.Wpos * f.h * f.h) : 0;
      E('dimensionamento', tf, { descricao: 'Concreto simples: tração na flexão (sem armadura) ≤ fctd', formula: 'σt = 6·M/(b·h²) ≤ fctd = fctk,inf/(γc·γsimples)', expressao: `σt = ${fm(Math.max(sigmaT, sigmaTn))} MPa ${Math.max(sigmaT, sigmaTn) <= cS.fctd + 1e-9 ? '≤' : '>'} fctd = ${fm(cS.fctd)} MPa`, resultado: Math.max(sigmaT, sigmaTn), unidade: 'MPa', norma: `${NBR6118}, cap. 24`, entradas: { Mpos: e.Mpos, Wpos: e.Wpos, Mneg: e.Mneg, Wneg: Wn, h: f.h, fctd: cS.fctd, gammaSimples: p.ftSimplesGamma, sigmaPos: sigmaT, sigmaNeg: sigmaTn } });
      continue;
    }
    E('dimensionamento', tf, { descricao: `Largura da faixa positiva ${fm(Wd)} m e altura útil efetiva (limitada a 1,5 vezes o balanço da seção de referência)`, formula: 'dEff = mín(d; 1,5·c)', expressao: `dEff = ${e.cPos > 0 ? `mín(${fm(d)}; 1,5·${fm(e.cPos)})` : fm(d)} = ${fm(dEff)} m`, resultado: dEff, unidade: 'm', norma: NBR6118, aConfirmar: true, entradas: { d, cPos: e.cPos, Wd, dEff, calculado: fx.dEff } });
    if (e.Mpos > 0) flexao(mem, el, tf, { c, sec: { kind: 'rect' as const, bw: Wd, h: dEff + p.cover + 0.01 }, taxaMin: 0, b: Wd, h: f.h }, e.Mpos, dEff, 0.05, fyd, false, fx.As, true, { semMinimo: true });
    E('dimensionamento', tf, { descricao: 'Armadura mínima e de cálculo adotada', formula: 'As,mín = ρmín·b·h; As,adot = máx(As; As,mín)', expressao: `As,mín = ${fm(p.ftRhoMin)}·${fm(Wd)}·${fm(f.h)} = ${fm(AsMin * 1e4)} cm²; As,adot = ${fm(fx.AsAdopt * 1e4)} cm²`, resultado: fx.AsAdopt, unidade: 'm²', norma: `${NBR6118}, 17.3.5.2.1; ρmín 0,15 % (a confirmar)`, aConfirmar: true, entradas: { As: fx.As, AsMin, rhoMin: p.ftRhoMin, b: Wd, h: f.h, reduz: p.ftRhoMinReduz ? 1 : 0, AsAdopt: fx.AsAdopt } });
    if (fx.imposed) E('detalhamento', tf, { descricao: `Armadura imposta (φ${fm(fx.imposed.phi)} c/${fm(fx.imposed.s * 100)} cm): só verificada`, formula: 'As,prov ≥ As,adot', expressao: `As,prov = ${fm(fx.imposed.As * 1e4)} cm² ${fx.imposed.ok ? '≥' : '<'} ${fm(fx.AsAdopt * 1e4)} cm²`, resultado: fx.imposed.As, unidade: 'm²', norma: NBR6118, entradas: { phi: fx.imposed.phi, s: fx.imposed.s, AsProv: fx.imposed.As, AsAdopt: fx.AsAdopt } });
    else E('detalhamento', tf, { descricao: `Barras: menor área com espaçamento de 10 a 20 cm na largura útil ${fm(fx.width)} m`, formula: 'n = máx(2; ⌈As/Asφ⌉; ⌈l/20 cm⌉ + 1)', expressao: fx.bars ? `${fx.bars.n} φ${fm(fx.bars.phi)} c/${fm(fx.bars.spacing * 100)} cm (${fm(fx.bars.As * 1e4)} cm²)` : 'não coube com espaçamento entre 10 e 20 cm', resultado: fx.bars ? `${fx.bars.n} φ${fm(fx.bars.phi)} c/${fm(fx.bars.spacing * 100)}` : 'sem solução', unidade: '', norma: NBR6118, entradas: { AsAdopt: fx.AsAdopt, largura: fx.width, ...(fx.bars ? { phi: fx.bars.phi, n: fx.bars.n, As: fx.bars.As } : {}) } });
    if (fx.top) E('dimensionamento', tf, { descricao: `Momento negativo entre pilares: tração do concreto simples ${fm(fx.top.sigmaT)} MPa ${fx.top.needed ? '>' : '≤'} fctd = ${fm(fx.top.fctd)} MPa → ${fx.top.needed ? `malha superior ${fx.top.bars ? `${fx.top.bars.n} φ${fm(fx.top.bars.phi)}` : 'sem solução'}` : 'sem malha superior'}`, formula: 'σt = 6·|M−|/(Wn·h²); se σt > fctd: As,sup = As(|M−|) e ≥ ρmín·Wn·h', expressao: `σt = 6·${fm(Math.abs(e.Mneg) / 1000)}/(${fm(Wn)}·${fm(f.h)}²) = ${fm(sigmaTn)} MPa; As,sup = ${fm(fx.top.As * 1e4)} cm²`, resultado: fx.top.As, unidade: 'm²', norma: `${NBR6118}, cap. 24; ${ASSOC}`, aConfirmar: true, entradas: { Mneg: e.Mneg, Wn, h: f.h, sigmaT: sigmaTn, fctd: fx.top.fctd, As: fx.top.As, AsMin: fx.top.AsMin, necessaria: fx.top.needed ? 1 : 0, d } });
  }

  // ---------------------------------------------------------------- compressão diagonal
  t = 'Compressão diagonal no contorno dos pilares';
  gr.pilares.forEach((q, i) => {
    const u0 = 2 * (cols[i].ap + cols[i].bp);
    E('dimensionamento', t, { descricao: `Pilar ${q.label}: Nd = γf·Nmáx do pilar nas combinações; τSd no perímetro do pilar`, formula: 'τSd = Nd/(u0·d) ≤ τRd2 = 0,27·(1 − fck/250)·fcd', expressao: `τSd = ${fm(q.Nd)}/1000/(${fm(u0)}·${fm(d)}) = ${fm(q.tauSd0)} MPa ${q.tauSd0 <= q.tauRd2 + 1e-9 ? '≤' : '>'} τRd2 = ${fm(q.tauRd2)} MPa`, resultado: q.tauSd0, unidade: 'MPa', norma: `${NBR6118}, 19.5.3.1`, entradas: { Nd: q.Nd, u0, d, fck: p.fckFound, fcd: c.fcd, tauRd2: q.tauRd2, gammaF: gf, Nk: q.Nd / gf } as Record<string, ValorMemoria> });
  });

  // ---------------------------------------------------------------- volume
  t = 'Volume de concreto';
  const rigida = f.h >= det.hBal - 1e-9 && f.h >= det.hVao - 1e-9;
  E('detalhamento', t, { descricao: rigida && !inp.constH ? 'Volume: prisma de altura h0 + tronco de pirâmide até o topo (envoltória dos pilares + 5 cm)' : 'Volume: prisma de altura h', formula: rigida && !inp.constH ? 'V = Apl·h0 + (h − h0)/3·(A1 + A2 + √(A1·A2))' : 'V = Apl·h', expressao: `V = ${fm(f.volume)} m³`, resultado: f.volume, unidade: 'm³', norma: NBR6122, entradas: { Apl: Math.abs(Apl), h: f.h, h0: f.h0, constH: inp.constH ? 1 : 0, rigida: rigida ? 1 : 0, xmin: Math.min(...cols.map((q) => q.x - q.ap / 2)), xmax: Math.max(...cols.map((q) => q.x + q.ap / 2)), ymin: Math.min(...cols.map((q) => q.y - q.bp / 2)), ymax: Math.max(...cols.map((q) => q.y + q.bp / 2)), V: f.volume } });
  E('detalhamento', t, { descricao: f.ok ? 'Sapata associada atende às verificações estruturais e do solo' : 'Sapata associada NÃO atende', formula: 'verificações', expressao: f.messages.join(' ') || 'sem mensagens', resultado: f.ok ? 'atende' : 'não atende', unidade: '', entradas: {} });
}
