// Memória detalhada (MD fase 5b): estacas do bloco (piles.ts). Chamada por `registrarFundacoes` só com a memória ligada, depois do
// cálculo, com os parâmetros guardados em `dadosDoProjeto`. Capacidade de carga de Décourt-Quaresma camada a camada (metro a metro),
// Padm, limites de profundidade, cargas por estaca (inclusive Nd,mín e tração), Miche para a carga horizontal e armadura da estaca
// (NBR 6122:2019, Tabela 4). O teste refaz Np, Rp, Rl (soma das camadas), Padm, Tadm, Nmáx, Nmín, Nd,mín, T de Miche, Mk e As.
import { circleBars, circleWidth, concrete, momentCapacity } from '../concrete';
import { dadosDoProjeto, type SupportDesign } from '../foundation';
import {
  ALPHA, BETA, C_TIP, GROUP, PILE_LABEL, SOIL_LABEL, catalogoPreMoldadas, clampN, estruturalMoldadas, maxDepth, nhFor, recommendedOption,
  type Boring, type FoundationParams, type PileLoads, type PileStructure, type PileType,
} from '../piles';
import { fm, type Registrador } from './registrador';

type Chave = Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>;
const NBR6122 = 'NBR 6122:2019';
const DQ = 'Décourt-Quaresma (1978; Décourt 1996); NBR 6122:2019, 8.2.1.2';

export function registrarEstaca(mem: Registrador, el: string, d: SupportDesign): void {
  const data = dadosDoProjeto.get(d);
  if (!data) return;
  const E = (etapa: 'cargas' | 'esforcos' | 'dimensionamento' | 'detalhamento', topico: string, q: Chave) => mem.passo({ etapa, elemento: el, topico, ...q });
  const p = data.params, ld = d.load;
  if (d.pileFixed) {
    const pf = d.pileFixed;
    E('dimensionamento', 'Estaca com capacidade informada', { descricao: `Estaca ${PILE_LABEL[pf.type]} φ${fm(pf.D)} cm com carga admissível característica informada (${fm(pf.capacity)} kN): sem sondagem; menor número de estacas (ou o fixado) com Nmáx ≤ capacidade e sem tração`, formula: 'Nmáx ≤ Padm,informada; Nmín ≥ 0', expressao: `n = ${pf.n}; Nmáx = ${fm(pf.loads.Nmax)} kN ${pf.loads.Nmax <= pf.capacity + 1e-9 ? '≤' : '>'} ${fm(pf.capacity)} kN; Nmín = ${fm(pf.loads.Nmin)} kN`, resultado: pf.capacity, unidade: 'kN', norma: NBR6122, entradas: { capacidade: pf.capacity, n: pf.n, D: pf.D, Nmax: pf.loads.Nmax, Nmin: pf.loads.Nmin, ok: pf.ok ? 1 : 0 } });
    cargasEstacas(E, ld, pf.loads, p);
    return;
  }
  const s = d.pile;
  if (!s) return;
  const b: Boring = d.boring;
  const D = s.D, type = s.type, cap = s.cap;

  // ---------------------------------------------------------------- sondagem
  let t = 'Sondagem de cálculo';
  E('dimensionamento', t, { descricao: `Sondagem usada no apoio: ${d.boringChoice}${b.water !== null ? `; nível d'água a ${fm(b.water)} m` : '; sem nível d\'água'}${b.endImpenetrable ? '; termina impenetrável' : ''}`, formula: 'NSPT por metro e solo (leituras descartadas já interpoladas)', expressao: b.meters.map((m, i) => `${i + 1} m: N = ${fm(m.N)} (${SOIL_LABEL[m.soil]})`).join('; '), resultado: b.meters.length, unidade: 'm', norma: NBR6122, entradas: { escolha: d.boringChoice, agua: b.water ?? 'sem', impenetravel: b.endImpenetrable ? 1 : 0, N: JSON.stringify(b.meters.map((m) => m.N)), solo: JSON.stringify(b.meters.map((m) => m.soil)) } });

  // ---------------------------------------------------------------- limites de profundidade
  t = 'Limites de profundidade e escolha do comprimento';
  const Lstart = Math.max(1, Math.ceil(p.cutoff + p.minLength));
  const lim = maxDepth(type, b, p);
  E('dimensionamento', t, { descricao: `Profundidade máxima da estaca ${PILE_LABEL[type]} (${lim.reason}) e comprimento inicial da busca (arrasamento + comprimento mínimo)`, formula: type === 'escavada' ? 'Lmax = mín[NA; 1º metro com N ≥ N,trado]' : type === 'helice' ? 'Lmax = mín(fim da sondagem; profundidade do equipamento)' : 'Lmax = 1º metro com N ≥ N,nega', expressao: `Lmáx = ${lim.L} m (${lim.reason}); Linício = ⌈${fm(p.cutoff)} + ${fm(p.minLength)}⌉ = ${Lstart} m`, resultado: lim.L, unidade: 'm', norma: `${NBR6122}; limites executivos (a confirmar)`, aConfirmar: true, entradas: { Lmax: lim.L, Linicio: Lstart, cutoff: p.cutoff, minLength: p.minLength, agua: b.water ?? 'sem', augerStopN: p.augerStopN, hcMaxDepth: p.hcMaxDepth, precastStopN: p.precastStopN, tipo: type, motivo: lim.reason, nMetros: b.meters.length } });

  // ---------------------------------------------------------------- Décourt-Quaresma
  t = `Capacidade de carga · ${PILE_LABEL[type]} φ${fm(D * 100)} cm · L = ${s.L} m`;
  const L = s.L, m = b.meters, at = (i: number) => (i >= 1 && i <= m.length ? m[i - 1] : null);
  const tipVals: number[] = [];
  for (const i of [L - 1, L, L + 1]) { const x = at(i); if (x) tipVals.push(clampN(x.N, 0, 50)); else if (i > m.length && b.endImpenetrable) tipVals.push(50); }
  const Np = tipVals.reduce((a, v) => a + v, 0) / tipVals.length;
  E('dimensionamento', t, { descricao: `Np: média dos N da ponta (metros ${L - 1}, ${L} e ${L + 1}; cada um limitado a 0–50; abaixo do fim da sondagem impenetrável vale 50)`, formula: 'Np = média(N,L−1; N,L; N,L+1)', expressao: `Np = (${tipVals.map((v) => fm(v)).join(' + ')})/${tipVals.length} = ${fm(Np)}`, resultado: Np, unidade: '', norma: DQ, entradas: { valores: JSON.stringify(tipVals), Np } });
  const tipSoil = at(L)!.soil, Ap = (Math.PI * D * D) / 4, U = Math.PI * D;
  const alfa = ALPHA[type][GROUP[tipSoil]], K = C_TIP[tipSoil];
  const Rp = alfa * K * Np * Ap;
  E('dimensionamento', t, { descricao: `Resistência de ponta: solo ${SOIL_LABEL[tipSoil]} (K = ${K} kPa), α = ${fm(alfa)} para estaca ${PILE_LABEL[type]}`, formula: 'Rp = α·K·Np·Ap', expressao: `Rp = ${fm(alfa)}·${K}·${fm(Np)}·${fm(Ap)} = ${fm(Rp)} kN`, resultado: Rp, unidade: 'kN', norma: DQ, entradas: { alfa, K, Np, Ap, D, Rp } });
  const shaft: { i: number; w: number }[] = [];
  for (let i = Math.floor(p.cutoff) + 1; i <= L; i++) { const w = Math.min(1, i - p.cutoff); if (w > 0) shaft.push({ i, w }); }
  const body = shaft.filter((x) => x.i <= L - 2);
  const Nl = body.length ? body.reduce((a, x) => a + clampN(at(x.i)!.N, 3, 50) * x.w, 0) / body.reduce((a, x) => a + x.w, 0) : clampN(at(Math.max(1, L - 2))!.N, 3, 50);
  E('dimensionamento', t, { descricao: `Nl: média ponderada dos N do fuste (cada N limitado a 3–50), excluídos os dois metros da ponta que usam essa média; trecho entre o arrasamento (${fm(p.cutoff)} m) e L`, formula: 'Nl = Σ(N·w)/Σw, w = mín(1; i − cota de arrasamento)', expressao: `Nl = ${fm(Nl)}`, resultado: Nl, unidade: '', norma: DQ, entradas: { Nl, cutoff: p.cutoff, L, Ns: JSON.stringify(body.map((x) => [x.i, clampN(at(x.i)!.N, 3, 50), x.w])) } });
  let Rl = 0;
  for (const x of shaft) {
    const sl = at(x.i)!, Nu = x.i <= L - 2 ? clampN(sl.N, 3, 50) : Nl, beta = BETA[type][GROUP[sl.soil]];
    const parc = beta * 10 * (Nu / 3 + 1) * U * x.w;
    Rl += parc;
    E('dimensionamento', t, { descricao: `Camada do metro ${x.i} (${SOIL_LABEL[sl.soil]}, N = ${fm(sl.N)}${x.i > L - 2 ? ', usa Nl' : ''}${x.w < 1 ? `, w = ${fm(x.w)}` : ''}): atrito lateral`, formula: 'Rl,i = β·10·(N/3 + 1)·U·w', expressao: `Rl,${x.i} = ${fm(beta)}·10·(${fm(Nu)}/3 + 1)·${fm(U)}·${fm(x.w)} = ${fm(parc)} kN`, resultado: parc, unidade: 'kN', norma: DQ, entradas: { metro: x.i, beta, N: Nu, U, w: x.w, parcela: parc } });
  }
  E('dimensionamento', t, { descricao: 'Resistência lateral total', formula: 'Rl = Σ Rl,i', expressao: `Rl = ${fm(Rl)} kN`, resultado: Rl, unidade: 'kN', norma: DQ, entradas: { Rl, U } });
  const RpUsed = type === 'premoldada' ? Rp : Math.min(Rp, Rl);
  E('dimensionamento', t, { descricao: type === 'premoldada' ? 'Ponta adotada: Rp inteira (pré-moldada)' : 'Ponta adotada limitada ao atrito lateral (estaca moldada: Rp ≤ Rl)', formula: type === 'premoldada' ? 'Rp,adot = Rp' : 'Rp,adot = mín(Rp; Rl)', expressao: `Rp,adot = ${fm(RpUsed)} kN`, resultado: RpUsed, unidade: 'kN', norma: `${DQ}; regra Rp ≤ Rl para moldadas (a confirmar)`, aConfirmar: type !== 'premoldada', entradas: { Rp, Rl, RpUsed, tipo: type } });
  const pG = (RpUsed + Rl) / 2, pP = RpUsed / 4 + Rl / 1.3;
  let Padm = Math.min(pG, pP);
  E('dimensionamento', t, { descricao: 'Carga admissível: o menor valor entre a ruptura global com FS = 2 e a parcial (ponta FS = 4, fuste FS = 1,3)', formula: 'Padm = mín[(Rp + Rl)/2; Rp/4 + Rl/1,3]', expressao: `Padm = mín[(${fm(RpUsed)} + ${fm(Rl)})/2; ${fm(RpUsed)}/4 + ${fm(Rl)}/1,3] = mín[${fm(pG)}; ${fm(pP)}] = ${fm(Math.min(pG, pP))} kN`, resultado: Math.min(pG, pP), unidade: 'kN', norma: `${NBR6122}, 8.2.1.2`, entradas: { RpUsed, Rl, pGlobal: pG, pParcial: pP } });
  if (type === 'escavada') {
    const lim125 = 1.25 * Rl;
    Padm = Math.min(Padm, lim125);
    E('dimensionamento', t, { descricao: 'Estaca escavada: Padm ≤ 1,25·Rl (regra de 2010 mantida a favor da segurança)', formula: 'Padm = mín(Padm; 1,25·Rl)', expressao: `Padm = mín(${fm(Math.min(pG, pP))}; 1,25·${fm(Rl)} = ${fm(lim125)}) = ${fm(Padm)} kN`, resultado: Padm, unidade: 'kN', norma: `${NBR6122}:2010 (a confirmar na edição de 2019)`, aConfirmar: true, entradas: { Padm0: Math.min(pG, pP), Rl, Padm } });
  }
  const Wpp = 25 * Ap * Math.max(0, L - p.cutoff), Tadm = Rl / 2 + 0.9 * Wpp;
  E('dimensionamento', t, { descricao: 'Tração admissível: metade do atrito lateral + 0,9 do peso próprio da estaca', formula: 'Tadm = Rl/2 + 0,9·W, W = 25·Ap·(L − arrasamento)', expressao: `W = 25·${fm(Ap)}·${fm(L - p.cutoff)} = ${fm(Wpp)} kN; Tadm = ${fm(Rl)}/2 + 0,9·${fm(Wpp)} = ${fm(Tadm)} kN`, resultado: Tadm, unidade: 'kN', norma: `${NBR6122}; Rl/2 + 0,9W (estimativa, a confirmar)`, aConfirmar: true, entradas: { Rl, Ap, L, cutoff: p.cutoff, W: Wpp, Tadm } });
  E('dimensionamento', t, { descricao: `Verificação da capacidade com as cargas por estaca (governa: ${cap.governs})`, formula: 'Nmáx ≤ Padm; −Nmín ≤ Tadm', expressao: `Nmáx = ${fm(s.loads.Nmax)} kN ${s.loads.Nmax <= cap.Padm + 1e-9 ? '≤' : '>'} Padm = ${fm(cap.Padm)} kN; tração = ${fm(Math.max(0, -s.loads.Nmin))} kN ${Math.max(0, -s.loads.Nmin) <= cap.Tadm + 1e-9 ? '≤' : '>'} Tadm = ${fm(cap.Tadm)} kN`, resultado: cap.Padm, unidade: 'kN', norma: NBR6122, entradas: { Padm: cap.Padm, Tadm: cap.Tadm, Nmax: s.loads.Nmax, Nmin: s.loads.Nmin } });
  void Padm;

  cargasEstacas(E, ld, s.loads, p);
  estruturaEstaca(E, type, D, L, s.loads, s.struct, b, p);

  // ---------------------------------------------------------------- escolha
  t = 'Escolha da estaca e do número de estacas';
  const cand = d.piles!.byType.flatMap((bt) => bt.diameters.filter((x) => x.best).map((x) => ({ tipo: bt.type, D: x.D, n: x.best!.n, L: x.best!.L, volume: x.best!.volume, aco: x.best!.steelKg, bloco: x.best!.blockVolume, custo: x.best!.cost })));
  E('dimensionamento', t, { descricao: `Candidatas (menor n e L que atendem capacidade, tração e estrutura por tipo e diâmetro) e o critério: custo = volume das estacas + volume estimado do bloco + aço/${fm(p.steelPerM3 || 85)}; ${d.pileAdopted ? 'estaca marcada no apoio' : 'adotada a de menor custo do primeiro tipo com solução'}`, formula: 'custo = Vestacas + Vbloco + kg aço/steelPerM3', expressao: cand.map((q) => `${PILE_LABEL[q.tipo]} φ${fm(q.D)}: n = ${q.n}, L = ${q.L} m, custo = ${fm(q.custo)}`).join('; ') || '—', resultado: s.cost, unidade: 'm³ eq.', norma: 'Critério do programa (ranking de soluções; a confirmar)', aConfirmar: true, entradas: { candidatas: JSON.stringify(cand), adotada: JSON.stringify({ tipo: s.type, D: s.D, n: s.n, L: s.L, custo: s.cost, volume: s.volume, aco: s.steelKg, bloco: s.blockVolume }), steelPerM3: p.steelPerM3 || 85, marcada: d.pileAdopted ? 1 : 0 } });
}

type Reg = (etapa: 'cargas' | 'esforcos' | 'dimensionamento' | 'detalhamento', topico: string, q: Chave) => void;

function cargasEstacas(E: Reg, ld: SupportDesign['load'], pl: PileLoads, p: FoundationParams): void {
  const t = 'Cargas nas estacas';
  const n = pl.n, gfU = p.gammaF ?? 1.4, gfF = p.gammaFfav ?? 1;
  E('esforcos', t, { descricao: `Disposição das ${n} estaca(s) com espaçamento s = ${fm(pl.s)} m entre eixos`, formula: 'coordenadas pela disposição padrão do bloco (n = 1 a 6)', expressao: pl.coords.map(([x, y], j) => `E${j + 1} = (${fm(x)}; ${fm(y)})`).join('; '), resultado: pl.s, unidade: 'm', norma: NBR6122, entradas: { n, s: pl.s, coords: JSON.stringify(pl.coords) } });
  const Sx = pl.coords.reduce((a, [x]) => a + x * x, 0), Sy = pl.coords.reduce((a, [, y]) => a + y * y, 0);
  const xmax = Math.max(...pl.coords.map(([x]) => Math.abs(x))), ymax = Math.max(...pl.coords.map(([, y]) => Math.abs(y)));
  E('esforcos', t, { descricao: `Peso do bloco (${fm(p.blockWeightPct)} % de Nk) e acréscimo de carga pelo momento (binário nas estacas extremas)`, formula: 'Wb = pct/100·Nk; ΔN = |My|·xmáx/Σx² + |Mx|·ymáx/Σy²', expressao: `Wb = ${fm(p.blockWeightPct)}/100·${fm(ld.Nk)} = ${fm(pl.Wb)} kN; ΔN = ${fm(pl.dN)} kN`, resultado: pl.dN, unidade: 'kN', norma: NBR6122, entradas: { pct: p.blockWeightPct, Nk: ld.Nk, Wb: pl.Wb, My: ld.My, Mx: ld.Mx, xmax, ymax, Sx, Sy, dN: pl.dN } });
  E('esforcos', t, { descricao: 'Carga máxima e mínima por estaca (característica, com o peso do bloco)', formula: 'Nmáx = (Nk + Wb)/n + ΔN; Nmín = (Nk,mín + Wb)/n − ΔN', expressao: `Nmáx = (${fm(ld.Nk)} + ${fm(pl.Wb)})/${n} + ${fm(pl.dN)} = ${fm(pl.Nmax)} kN; Nmín = (${fm(ld.NkMin)} + ${fm(pl.Wb)})/${n} − ${fm(pl.dN)} = ${fm(pl.Nmin)} kN`, resultado: pl.Nmax, unidade: 'kN', norma: NBR6122, entradas: { Nk: ld.Nk, NkMin: ld.NkMin, Wb: pl.Wb, n, dN: pl.dN, Nmax: pl.Nmax, Nmin: pl.Nmin } });
  const relief = Math.max(0, pl.Gk - ld.NkMin);
  E('esforcos', t, { descricao: `Nd,mín: carga mínima de cálculo para a tração (permanente favorável γ = ${fm(gfF)}, variável que alivia desfavorável γ = ${fm(gfU)}); Gk ${pl.GkSource === 'informada' ? 'é a soma dos casos G' : 'adotado = Nk (sem dado da parcela permanente)'}`, formula: 'Nd,mín = γfav·(Gk + Wb)/n − γf·[(Gk − Nk,mín)/n + ΔN]; Td = máx(0; −Nd,mín)', expressao: `Nd,mín = ${fm(gfF)}·(${fm(pl.Gk)} + ${fm(pl.Wb)})/${n} − ${fm(gfU)}·[${fm(relief)}/${n} + ${fm(pl.dN)}] = ${fm(pl.NdMin)} kN; Td = ${fm(Math.max(0, -pl.NdMin))} kN`, resultado: pl.NdMin, unidade: 'kN', norma: `NBR 6118:2023, Tabela 11.1 (γf favorável 1,0 e desfavorável 1,4)`, entradas: { gammaFav: gfF, gammaUnf: gfU, Gk: pl.Gk, Wb: pl.Wb, n, NkMin: ld.NkMin, dN: pl.dN, relief, NdMin: pl.NdMin } });
  E('esforcos', t, { descricao: 'Carga horizontal por estaca e momento no topo da estaca (parcela do momento que não vira binário)', formula: 'H = √(Hx² + Hy²)/n; M0 = √(M0x² + M0y²), M0y = |My|/n se Σx² = 0 e M0x = |Mx|/n se Σy² = 0', expressao: `H = ${fm(pl.H)} kN; M0 = ${fm(pl.M0)} kN·m`, resultado: pl.H, unidade: 'kN', norma: NBR6122, entradas: { Hx: ld.Hx, Hy: ld.Hy, n, H: pl.H, M0: pl.M0, Mx: ld.Mx, My: ld.My, Sx, Sy } });
}

function estruturaEstaca(E: Reg, type: PileType, D: number, L: number, pl: PileLoads, st: PileStructure, b: Boring, p: FoundationParams): void {
  const t = 'Estaca: horizontal (Miche) e armadura';
  const Ac = (Math.PI * D * D) / 4, { nh, label } = nhFor(b, p), gf = p.gammaF ?? 1.4;
  E('dimensionamento', t, { descricao: `Coeficiente de reação horizontal do solo nh (${label})`, formula: 'nh pelo solo nos 3 m abaixo do arrasamento', expressao: `nh = ${fm(nh)} MN/m³`, resultado: nh, unidade: 'MN/m³', norma: 'Terzaghi (areias); argila média/rija informada (a confirmar)', aConfirmar: true, entradas: { nh, cutoff: p.cutoff, nhClay: p.nhClay, rotulo: label } });
  if (type === 'premoldada') {
    const cat = catalogoPreMoldadas(p)[Math.round(D * 100)];
    E('dimensionamento', t, { descricao: 'Estaca pré-moldada centrifugada: cargas de catálogo (SCAC, menor valor da faixa); armadura de fábrica', formula: 'Nmáx ≤ P,cat; Td ≤ T,cat', expressao: cat ? `Nmáx = ${fm(pl.Nmax)} kN ${pl.Nmax <= cat.P ? '≤' : '>'} P = ${fm(cat.P)} kN; tração = ${fm(Math.max(0, -pl.Nmin))} kN ${Math.max(0, -pl.Nmin) <= cat.T ? '≤' : '>'} T = ${fm(cat.T)} kN` : 'diâmetro sem carga de catálogo', resultado: cat?.P ?? 0, unidade: 'kN', norma: 'Catálogo SCAC (a confirmar)', aConfirmar: true, entradas: { P: cat?.P ?? 0, T: cat?.T ?? 0, Nmax: pl.Nmax, Nmin: pl.Nmin } });
    const E30 = 30000 * 1000, T = ((E30 * Math.PI * D ** 4) / 64 / (nh * 1000)) ** 0.2, Mk = pl.M0 + 0.79 * pl.H * T;
    E('dimensionamento', t, { descricao: 'Comprimento elástico T e momento máximo pela carga horizontal (Miche; E ≈ 30 GPa, ordem de grandeza para C40)', formula: 'T = [E·I/(nh)]^(1/5); Mk = M0 + 0,79·H·T', expressao: `T = ${fm(T)} m; Mk = ${fm(pl.M0)} + 0,79·${fm(pl.H)}·${fm(T)} = ${fm(Mk)} kN·m`, resultado: Mk, unidade: 'kN·m', norma: 'Miche; Mmáx = 0,79·H·T (curto/longo, a confirmar)', aConfirmar: true, entradas: { E: E30, D, nh, M0: pl.M0, H: pl.H, T, Mk } });
    return;
  }
  const tab = estruturalMoldadas(p)[type], c0 = tab[p.caa];
  const c = concrete(c0.fck, c0.gc), fyd = p.fyk / 1.15;
  E('dimensionamento', t, { descricao: `Concreto da estaca ${PILE_LABEL[type]} (classe de agressividade ${p.caa}): fck e γc da Tabela 4 da NBR 6122:2019 (do projeto de 2018, a confirmar)`, formula: 'fcd = fck/γc; fyd = fyk/1,15', expressao: `fcd = ${fm(c0.fck)}/${fm(c0.gc)} = ${fm(c0.fck / c0.gc)} MPa; fyd = ${fm(p.fyk)}/1,15 = ${fm(fyd)} MPa; σ,lim = ${fm(tab.sigmaLim)} MPa; ρmín = ${fm(tab.rhoMin * 100)} %`, resultado: c0.fck / c0.gc, unidade: 'MPa', norma: `${NBR6122}, Tabela 4 (projeto de 2018; a confirmar)`, aConfirmar: true, entradas: { fck: c0.fck, gc: c0.gc, fyk: p.fyk, fyd, sigmaLim: tab.sigmaLim, rhoMin: tab.rhoMin, Lmin: tab.Lmin } });
  const Nd = gf * pl.Nmax, sigma = Nd / 1000 / Ac, fcd = c0.fck / c0.gc, needComp = sigma > tab.sigmaLim;
  E('dimensionamento', t, { descricao: 'Tensão de compressão no concreto da estaca (carga de cálculo) e necessidade de armadura de compressão', formula: 'Nd = γf·Nmáx; σ = Nd/Ac ≤ σ,lim', expressao: `Nd = ${fm(gf)}·${fm(pl.Nmax)} = ${fm(Nd)} kN; σ = ${fm(Nd / 1000)}/${fm(Ac)} = ${fm(sigma)} MPa ${needComp ? '>' : '≤'} ${fm(tab.sigmaLim)} MPa`, resultado: sigma, unidade: 'MPa', norma: `${NBR6122}, Tabela 4`, aConfirmar: true, entradas: { gammaF: gf, Nmax: pl.Nmax, Nd, Ac, sigma, sigmaLim: tab.sigmaLim } });
  const ss2 = Math.min(fyd, 420), AsComp = needComp ? Math.max(0, (Nd / 1000 - 0.85 * fcd * Ac) / ss2) : 0;
  E('dimensionamento', t, { descricao: needComp ? 'Armadura de compressão (o concreto absorve 0,85·fcd·Ac; tensão do aço limitada a 420 MPa)' : 'Armadura de compressão não necessária (σ ≤ σ,lim)', formula: 'As,c = (Nd − 0,85·fcd·Ac)/σs', expressao: `As,c = ${fm(AsComp * 1e4)} cm²`, resultado: AsComp, unidade: 'm²', norma: NBR6122, entradas: { Nd, fcd, Ac, sigmaS: ss2, necessaria: needComp ? 1 : 0, AsComp } });
  const Td = Math.max(0, -pl.NdMin), AsT = Td / 1000 / fyd, AsMin = tab.rhoMin * Ac;
  E('dimensionamento', t, { descricao: 'Armadura de tração (Td = máx(0; −Nd,mín)) e armadura mínima', formula: 'As,t = Td/(1000·fyd); As,mín = ρmín·Ac', expressao: `As,t = ${fm(Td)}/(1000·${fm(fyd)}) = ${fm(AsT * 1e4)} cm²; As,mín = ${fm(tab.rhoMin)}·${fm(Ac)} = ${fm(AsMin * 1e4)} cm²`, resultado: AsT, unidade: 'm²', norma: `${NBR6122}, Tabela 4 (As,mín 0,4 %: a confirmar)`, aConfirmar: true, entradas: { Td, NdMin: pl.NdMin, fyd, AsT, rhoMin: tab.rhoMin, Ac, AsMin } });
  const E2 = c.Ecs * 1000, T = ((E2 * Math.PI * D ** 4) / 64 / (nh * 1000)) ** 0.2, Mk = pl.M0 + 0.79 * pl.H * T, Md = gf * Mk, Lp = L - p.cutoff;
  E('dimensionamento', t, { descricao: 'Carga horizontal (Miche): comprimento elástico, momento máximo característico e de cálculo', formula: 'T = [Ecs·π·D⁴/64/(nh)]^(1/5); Mk = M0 + 0,79·H·T; Md = γf·Mk', expressao: `T = ${fm(T)} m; Mk = ${fm(pl.M0)} + 0,79·${fm(pl.H)}·${fm(T)} = ${fm(Mk)} kN·m; Md = ${fm(gf)}·${fm(Mk)} = ${fm(Md)} kN·m; L − arrasamento = ${fm(Lp)} m ${Lp > 4 * T ? '>' : '≤'} 4T = ${fm(4 * T)} m`, resultado: Mk, unidade: 'kN·m', norma: 'Miche; Mmáx = 0,79·H·T (a confirmar)', aConfirmar: true, entradas: { Ecs: c.Ecs, D, nh, M0: pl.M0, H: pl.H, T, Mk, Md, gammaF: gf, Lp } });
  E('detalhamento', t, { descricao: `Comprimento da armadura: ${st.armedReason}`, formula: 'máx(Lmín; 4T [com momento]); todo o comprimento se σ > σ,lim ou há tração', expressao: `L,arm = ${fm(st.armedLength)} m (${st.armedReason})`, resultado: st.armedLength, unidade: 'm', norma: `${NBR6122}, Tabela 4 (comprimento mínimo; a confirmar)`, aConfirmar: true, entradas: { Lmin: tab.Lmin, T, Mk, Lp, armedLength: st.armedLength, comp: needComp ? 1 : 0, tracao: AsT > 0 ? 1 : 0 } });
  const opt = recommendedOption(st.options);
  if (opt) {
    const phiT = p.stirrupPhi, rs = D / 2 - p.cover - phiT / 1000 - opt.phi / 2000;
    let MRmin = Infinity;
    if (Md > 0.01) for (const N of [Nd, pl.NdMin]) for (const rot of [0, Math.PI / opt.n]) { const v = momentCapacity(circleWidth(D), D, circleBars(D, opt.n, opt.phi, rs, rot), N / 1000, c, fyd); MRmin = Math.min(MRmin, v === null ? -1 : v * 1000); }
    E('detalhamento', t, { descricao: `Armadura adotada: a de menor área entre as bitolas ≥ 10 mm que atende As,mín, As de compressão e tração e o momento resistente (flexo-compressão por fibras, duas rotações da armadura; mínimo de 3 barras)${st.options.length > 1 ? `; opções: ${st.options.map((o) => `${o.n}φ${fm(o.phi)}`).join(', ')}` : ''}`, formula: 'As ≥ máx(As,mín; As,c; As,t); MRd ≥ Md em Nd e Nd,mín', expressao: `${opt.n} φ${fm(opt.phi)} (${fm(opt.As * 1e4)} cm²), raio das barras ${fm(rs)} m${Md > 0.01 ? `; MRd,mín = ${fm(MRmin)} kN·m ${MRmin >= Md ? '≥' : '<'} Md = ${fm(Md)} kN·m` : ''}${opt.notes.length ? ` — ${opt.notes.join('; ')}` : ''}`, resultado: opt.As, unidade: 'm²', norma: `${NBR6122}, Tabela 4; NBR 6118:2023, 17.2`, entradas: { phi: opt.phi, n: opt.n, As: opt.As, rs, Md, MRmin: Number.isFinite(MRmin) ? MRmin : 0, Nd, NdMin: pl.NdMin, AsMin, AsComp, AsT, estribo: phiT, opcoes: JSON.stringify(st.options.map((o) => [o.phi, o.n, o.As])) } });
  }
  E('detalhamento', t, { descricao: st.ok ? 'Estaca atende (concreto e armadura)' : 'Estaca NÃO atende', formula: 'Nd ≤ 0,85·fcd·Ac + 0,04·Ac·σs', expressao: st.messages.join(' ') || 'sem mensagens', resultado: st.ok ? 'atende' : 'não atende', unidade: '', entradas: {} });
}
