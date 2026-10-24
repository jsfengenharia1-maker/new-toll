// Memória detalhada (MD fase 5, fundações rasas): cadeia da sapata isolada rígida ou flexível (footings.ts). Chamada por
// `registrarFundacoes` só com a memória ligada, depois do cálculo, com os parâmetros guardados em `dadosDoProjeto`: refaz as
// contas com as mesmas funções determinísticas (basePressure, sptSigma, overhangMoment, beamFlexure, kTable…) e os números do
// resultado (A, B, W, h), de modo que o teste as refaz a partir das `entradas` e confere com o `FootingResult`.
import { concrete } from '../concrete';
import { dadosDoProjeto, type SupportDesign } from '../foundation';
import { basePressure, isFooting, kTable, overhangMoment, sptSigma, type FootingInput, type FootingResult } from '../footings';
import type { FoundationParams } from '../piles';
import { anchorageLength, bestBars, spacedBars } from '../rebar';
import { fm, type Registrador, type ValorMemoria } from './registrador';
import { cadeiaSapataGrupo } from './sapataGrupo';
import { flexao } from './vigaConcreto';

type Chave = Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>;
const NBR6122 = 'NBR 6122:2019';
const NBR6118 = 'NBR 6118:2023';

/** Entrada que o núcleo monta para a sapata isolada a partir da carga do apoio (a mesma de `designSupport`). */
export function entradaSapata(d: SupportDesign): FootingInput {
  const ld = d.load;
  return { Nk: ld.Nk, NkMin: ld.NkMin, Mx: ld.Mx, My: ld.My, ap: d.ap, bp: d.bp, boring: d.boring, offset: ld.offset, edge: ld.edge, fixed: ld.fixed, simples: ld.simples, constH: ld.constH };
}

/** Cadeia completa de uma sapata isolada (ignora silenciosamente o que não for sapata isolada calculada com a memória ligada). */
export function registrarSapata(mem: Registrador, el: string, d: SupportDesign): void {
  const f = d.footing, data = dadosDoProjeto.get(d);
  if (!f || !isFooting(f) || !data) return;
  if (d.load.group) cadeiaSapataGrupo(mem, el, { ...entradaSapata(d), group: d.load.group }, data.params, f);
  else cadeiaSapata(mem, el, entradaSapata(d), data.params, f);
}

export function cadeiaSapata(mem: Registrador, el: string, inp: FootingInput, p: FoundationParams, f: FootingResult): void {
  const E = (etapa: 'cargas' | 'esforcos' | 'dimensionamento' | 'detalhamento', topico: string, q: Chave) => mem.passo({ etapa, elemento: el, topico, ...q });
  const c = concrete(p.fckFound, p.gammaC), fyd = p.fyk / p.gammaS;
  const { A, B, W } = f, { ap, bp } = inp;
  const [ex0, ey0] = f.colOffset;
  const pontual = Math.abs(ex0) > 1e-9 || Math.abs(ey0) > 1e-9;

  // ---------------------------------------------------------------- materiais
  let t = 'Materiais e parâmetros';
  E('dimensionamento', t, { descricao: 'Resistência de cálculo do concreto', formula: 'fcd = fck/γc', expressao: `fcd = ${fm(p.fckFound)}/${fm(p.gammaC)} = ${fm(c.fcd)} MPa`, resultado: c.fcd, unidade: 'MPa', norma: `${NBR6118}, 12.3.3`, entradas: { fck: p.fckFound, gammaC: p.gammaC } });
  E('dimensionamento', t, { descricao: 'Resistência de cálculo do aço', formula: 'fyd = fyk/γs', expressao: `fyd = ${fm(p.fyk)}/${fm(p.gammaS)} = ${fm(fyd)} MPa`, resultado: fyd, unidade: 'MPa', norma: `${NBR6118}, 12.3.3`, entradas: { fyk: p.fyk, gammaS: p.gammaS } });
  E('dimensionamento', t, { descricao: 'Cobrimento, coeficiente de majoração das ações e cota de apoio abaixo do terreno', formula: 'c; γf; z', expressao: `c = ${fm(p.cover * 100)} cm; γf = ${fm(p.gammaF)}; z = ${fm(p.ftDepth)} m`, resultado: p.cover, unidade: 'm', entradas: { cover: p.cover, gammaF: p.gammaF, profundidade: p.ftDepth } });

  // ---------------------------------------------------------------- tensão admissível
  t = 'Tensão admissível do solo';
  const Bmin = Math.min(A, B);
  if (p.ftSigmaMode === 'informada') {
    E('dimensionamento', t, { descricao: 'σadm informada (elemento ou terreno)', formula: 'σadm = valor informado', expressao: `σadm = ${fm(f.sigmaAdm)} kPa`, resultado: f.sigmaAdm, unidade: 'kPa', norma: NBR6122, entradas: { origem: 'informada' } });
  } else {
    const bulbo = p.ftBulb * Bmin, z0 = p.ftDepth;
    const sel = d_meters(inp, z0, bulbo);
    const sg = inp.boring ? sptSigma(inp.boring, z0, bulbo, p.ftSptDiv, p.ftNmaxEst) : null;
    E('dimensionamento', t, { descricao: `Camadas do SPT no bulbo de tensões (de ${fm(z0)} m até ${fm(z0 + Math.max(1, bulbo))} m, bulbo = ${fm(p.ftBulb)}·menor lado)`, formula: 'N̄ = média dos NSPT por metro do bulbo', expressao: `NSPT = ${sel.map(([z, n]) => `${fm(z, 3)} m: ${fm(n)}`).join('; ')} → N̄ = ${fm(sg?.Nbar ?? 0)}`, resultado: sg?.Nbar ?? 0, unidade: '', norma: NBR6122, aConfirmar: true, entradas: { profundidade: z0, fatorBulbo: p.ftBulb, menorLado: Bmin, leituras: JSON.stringify(sel) } });
    E('dimensionamento', t, { descricao: 'N̄ usado (limitado) e σadm estimada pelo SPT', formula: 'σadm = mín(N̄; Nmáx)/div · 1000', expressao: `σadm = mín(${fm(sg?.Nbar ?? 0)}; ${fm(p.ftNmaxEst)})/${fm(p.ftSptDiv)}·1000 = ${fm(f.sigmaAdm)} kPa`, resultado: f.sigmaAdm, unidade: 'kPa', norma: `${NBR6122}; estimativa empírica N̄/${p.ftSptDiv} MPa (a confirmar)`, aConfirmar: true, entradas: { Nbar: sg?.Nbar ?? 0, Nmax: p.ftNmaxEst, div: p.ftSptDiv } });
  }

  // ---------------------------------------------------------------- peso próprio e planta
  t = 'Peso próprio e dimensões em planta';
  const W0 = (p.ftPP / 100) * inp.Nk;
  E('dimensionamento', t, { descricao: `Peso próprio estimado (${fm(p.ftPP)} % de Nk)`, formula: 'W0 = ftPP/100·Nk', expressao: `W0 = ${fm(p.ftPP)}/100·${fm(inp.Nk)} = ${fm(W0)} kN`, resultado: W0, unidade: 'kN', norma: NBR6122, aConfirmar: true, entradas: { ftPP: p.ftPP, Nk: inp.Nk } });
  E('dimensionamento', t, { descricao: 'Peso do concreto da sapata e do solo sobre ela', formula: 'Wconc = 25·V; Wsolo = γsolo·máx(0; A·B·z − V)', expressao: `Wconc = 25·${fm(f.volume)} = ${fm(f.Wconc)} kN; Wsolo = ${fm(p.gammaSoil)}·máx(0; ${fm(A)}·${fm(B)}·${fm(p.ftDepth)} − ${fm(f.volume)}) = ${fm(f.Wsoil)} kN`, resultado: f.Wconc, unidade: 'kN', norma: NBR6122, aConfirmar: true, entradas: { V: f.volume, A, B, z: p.ftDepth, gammaSoil: p.gammaSoil, Wsoil: f.Wsoil } });
  E('dimensionamento', t, { descricao: f.W > W0 + 1e-6 ? 'Peso próprio adotado (o do concreto calculado, maior que o percentual, arredondado para cima em kN)' : 'Peso próprio adotado (o percentual de Nk)', formula: 'W = máx(W0; ⌈Wconc⌉)', expressao: `W = ${fm(W)} kN`, resultado: W, unidade: 'kN', norma: NBR6122, aConfirmar: true, entradas: { W0, Wconc: f.Wconc } });
  E('dimensionamento', t, { descricao: inp.fixed ? 'Planta A × B (dimensões impostas, só verificadas)' : 'Planta A × B: menor área em passos de 5 cm que atende σadm, tensão de borda e área comprimida (entre áreas até 3 % maiores, balanços mais próximos)', formula: 'A·B', expressao: `A = ${fm(A)} m; B = ${fm(B)} m; A·B = ${fm(A * B)} m²`, resultado: A * B, unidade: 'm²', norma: NBR6122, aConfirmar: true, entradas: { A, B, ap, bp, razaoMax: p.ftMaxRatio } });
  if (pontual) E('dimensionamento', t, { descricao: 'Posição do centro do pilar em relação ao centro da base (pilar de divisa, de canto ou excêntrico)', formula: 'e = ±(A − ap)/2 (divisa) ou valor informado', expressao: `ex = ${fm(ex0, 5)} m; ey = ${fm(ey0, 5)} m`, resultado: Math.hypot(ex0, ey0), unidade: 'm', entradas: { ex: ex0, ey: ey0, edge: JSON.stringify(inp.edge ?? [0, 0]), offset: JSON.stringify(inp.offset ?? [0, 0]) } });

  // ---------------------------------------------------------------- verificações no solo (rara)
  const Ncols = [inp.Nk, inp.NkMin];
  f.cases.forEach((cs, i) => {
    t = `Tensões no solo · ${cs.label}`;
    const Nc = Ncols[i], My = Math.abs(inp.My) + Math.abs(Nc * ex0), Mx = Math.abs(inp.Mx) + Math.abs(Nc * ey0), N = Nc + W;
    E('dimensionamento', t, { descricao: 'Força vertical na base (carga do pilar + peso próprio)', formula: 'N = Nk + W', expressao: `N = ${fm(Nc)} + ${fm(W)} = ${fm(N)} kN`, resultado: N, unidade: 'kN', norma: NBR6122, entradas: { Nk: Nc, W } });
    E('dimensionamento', t, { descricao: 'Momentos na base: os do pilar mais N do pilar × excentricidade do pilar (somados em módulo, a favor da segurança)', formula: 'My = |My,pilar| + |Npilar·ex|; Mx = |Mx,pilar| + |Npilar·ey|', expressao: `My = |${fm(inp.My)}| + |${fm(Nc)}·${fm(ex0, 5)}| = ${fm(My)} kN·m; Mx = |${fm(inp.Mx)}| + |${fm(Nc)}·${fm(ey0, 5)}| = ${fm(Mx)} kN·m`, resultado: My, unidade: 'kN·m', norma: NBR6122, entradas: { Mx_pilar: inp.Mx, My_pilar: inp.My, Npilar: Nc, ex: ex0, ey: ey0, Mx_base: Mx } });
    E('dimensionamento', t, { descricao: 'Excentricidades da resultante na base', formula: 'ex = My/N; ey = Mx/N', expressao: `ex = ${fm(My)}/${fm(N)} = ${fm(cs.ex, 5)} m; ey = ${fm(Mx)}/${fm(N)} = ${fm(cs.ey, 5)} m`, resultado: cs.ex, unidade: 'm', entradas: { My, Mx, N, ey: cs.ey } });
    const pr = basePressure(A, B, N, My / N, Mx / N);
    E('dimensionamento', t, { descricao: 'Tensões na base sem tração (distribuição plana; fração comprimida pela linha de tensão nula)', formula: 'σ(x,y) = máx(0; s0 + sx·x + sy·y), equilíbrio de N, Mx e My', expressao: `σmáx = ${fm(cs.sigmaMax)} kPa; σmín = ${fm(cs.sigmaMin)} kPa; área comprimida = ${fm(cs.compressed * 100)} %`, resultado: cs.sigmaMax, unidade: 'kPa', norma: `${NBR6122}; ${NBR6118}, 22.6`, entradas: { A, B, N, ex: cs.ex, ey: cs.ey, sigmaMin: cs.sigmaMin, compressed: cs.compressed, s0: pr?.s0 ?? 0, sx: pr?.sx ?? 0, sy: pr?.sy ?? 0 } });
    if (i === 0) E('dimensionamento', t, { descricao: 'Tensão média na base ≤ σadm', formula: 'N/(A·B) ≤ σadm', expressao: `${fm(N)}/(${fm(A)}·${fm(B)}) = ${fm(N / (A * B))} ${N / (A * B) <= f.sigmaAdm + 1e-9 ? '≤' : '>'} ${fm(f.sigmaAdm)} kPa`, resultado: N / (A * B), unidade: 'kPa', norma: NBR6122, entradas: { N, A, B, sigmaAdm: f.sigmaAdm } });
    E('dimensionamento', t, { descricao: `Tensão de borda ≤ fator·σadm; área comprimida ≥ mínimo${p.ftLevantamento ? ' (descolamento permitido: mínimo dispensado)' : ''}`, formula: 'σmáx ≤ ftEdgeFactor·σadm; compressed ≥ ftMinCompressed', expressao: `σmáx = ${fm(cs.sigmaMax)} ${cs.sigmaMax <= p.ftEdgeFactor * f.sigmaAdm + 1e-6 ? '≤' : '>'} ${fm(p.ftEdgeFactor)}·${fm(f.sigmaAdm)} = ${fm(p.ftEdgeFactor * f.sigmaAdm)} kPa; comprimida = ${fm(cs.compressed * 100)} % ${cs.compressed >= (p.ftLevantamento ? 0 : p.ftMinCompressed) - 1e-6 ? '≥' : '<'} ${fm((p.ftLevantamento ? 0 : p.ftMinCompressed) * 100)} %`, resultado: p.ftEdgeFactor * f.sigmaAdm, unidade: 'kPa', norma: `${NBR6122} (área comprimida ≥ 2/3: a confirmar)`, aConfirmar: true, entradas: { sigmaMax: cs.sigmaMax, edge: p.ftEdgeFactor, sigmaAdm: f.sigmaAdm, compressed: cs.compressed, minComprimida: p.ftLevantamento ? 0 : p.ftMinCompressed } });
  });

  // ---------------------------------------------------------------- altura
  t = 'Altura e ancoragem do pilar';
  const cA = A / 2 + Math.abs(ex0) - ap / 2, cB = B / 2 + Math.abs(ey0) - bp / 2;
  E('dimensionamento', t, { descricao: 'Balanços da base além das faces do pilar (o maior de cada direção)', formula: 'cA = A/2 + |ex| − ap/2; cB = B/2 + |ey| − bp/2', expressao: `cA = ${fm(A)}/2 + ${fm(Math.abs(ex0), 5)} − ${fm(ap)}/2 = ${fm(cA)} m; cB = ${fm(B)}/2 + ${fm(Math.abs(ey0), 5)} − ${fm(bp)}/2 = ${fm(cB)} m`, resultado: Math.max(cA, cB), unidade: 'm', entradas: { A, B, ex: ex0, ey: ey0, ap, bp, cA, cB } });
  const hRigid = ((2 * Math.max(cA, cB)) / 3) * (1.5 / p.ftBalancoAltura);
  E('dimensionamento', t, { descricao: 'Altura mínima da sapata rígida', formula: 'hrig = (2/3)·máx(cA; cB)·(1,5/ftBalancoAltura)  [h ≥ (a − ap)/3 com a = 2c]', expressao: `hrig = (2·${fm(Math.max(cA, cB))}/3)·(1,5/${fm(p.ftBalancoAltura)}) = ${fm(hRigid)} m`, resultado: hRigid, unidade: 'm', norma: `${NBR6118}, 22.6.1 (sapata rígida: h ≥ (a − ap)/3; numeração a confirmar)`, aConfirmar: true, entradas: { cmax: Math.max(cA, cB), ftBalancoAltura: p.ftBalancoAltura } });
  const lbCol = anchorageLength(p.colPhi, c, fyd);
  E('dimensionamento', t, { descricao: `Comprimento de ancoragem das barras do pilar (φ${fm(p.colPhi)})`, formula: 'lb = máx[(φ/4)·(fyd/fbd); 25φ], fbd = 2,25·fctd', expressao: `fbd = 2,25·${fm(c.fctd)} = ${fm(2.25 * c.fctd)} MPa; lb = ${fm(lbCol)} m`, resultado: lbCol, unidade: 'm', norma: `${NBR6118}, 9.4.2.4 e 9.4.2.5`, entradas: { phi: p.colPhi, fyd, fctd: c.fctd } });
  const ramo = inp.simples ? 'concreto simples (h pela tração na flexão)' : inp.fixed?.h ? 'altura imposta' : f.kind === 'rigida' && p.ftKind === 'rigida' ? 'sapata rígida: h = ⌈máx(hrig; lb + c)⌉ em passos de 5 cm' : 'sapata flexível: menor h (passo de 5 cm) em que a compressão diagonal e a punção em C′ atendem; vira rígida se h ≥ hrig';
  E('dimensionamento', t, { descricao: `Altura adotada (${f.kind === 'rigida' ? 'rígida' : 'flexível'}): ${ramo}`, formula: f.kind === 'rigida' && !inp.fixed?.h && !inp.simples ? 'h = ceil05(máx(hrig; lb + c))' : 'h', expressao: `h = ${fm(f.h)} m (hrig = ${fm(hRigid)}; lb + c = ${fm(lbCol + p.cover)})`, resultado: f.h, unidade: 'm', norma: `${NBR6118}, 22.6`, aConfirmar: true, entradas: { hRigid, lbCol, cover: p.cover, tipo: f.kind, ramo: inp.simples ? 'simples' : inp.fixed?.h ? 'imposta' : 'calculada' } });
  const h0rule = inp.constH || f.kind !== 'rigida' ? 'altura constante (h0 = h)' : inp.fixed?.h0 ? 'h0 imposta' : 'h0 = ⌈máx(h/3; h0mín)⌉ em passos de 5 cm, no máximo h';
  E('dimensionamento', t, { descricao: `Altura da borda h0: ${h0rule}`, formula: 'h0', expressao: `h0 = ${fm(f.h0)} m (h/3 = ${fm(f.h / 3)}; h0mín = ${fm(p.ftH0Min)})`, resultado: f.h0, unidade: 'm', norma: `${NBR6118}, 22.6; h0 ≥ máx(h/3; 20 cm) (a confirmar)`, aConfirmar: true, entradas: { h: f.h, h0Min: p.ftH0Min, constH: inp.constH ? 1 : 0 } });
  const dd = f.h - p.cover - 0.01;
  E('dimensionamento', t, { descricao: 'Altura útil (barras de 10 mm de referência)', formula: 'd = h − c − 0,01', expressao: `d = ${fm(f.h)} − ${fm(p.cover)} − 0,01 = ${fm(dd)} m`, resultado: dd, unidade: 'm', entradas: { h: f.h, cover: p.cover } });

  // ---------------------------------------------------------------- esforços de cálculo
  t = 'Esforços de cálculo na base';
  const My0 = Math.abs(inp.My) + Math.abs(inp.Nk * ex0), Mx0 = Math.abs(inp.Mx) + Math.abs(inp.Nk * ey0);
  const gf = p.gammaF, Nd = gf * inp.Nk, Mdx = gf * Mx0, Mdy = gf * My0;
  E('esforcos', t, { descricao: 'Força e momentos de cálculo na base (sem o peso próprio; γf·característicos da combinação rara de maior N)', formula: 'Nd = γf·Nk; Mdx = γf·Mx; Mdy = γf·My', expressao: `Nd = ${fm(gf)}·${fm(inp.Nk)} = ${fm(Nd)} kN; Mdx = ${fm(gf)}·${fm(Mx0)} = ${fm(Mdx)} kN·m; Mdy = ${fm(gf)}·${fm(My0)} = ${fm(Mdy)} kN·m`, resultado: Nd, unidade: 'kN', norma: `${NBR6118}, 11.7 (γf = ${fm(gf)} aplicado ao valor característico; a envoltória ELU de cada pilar está nas cargas)`, aConfirmar: true, entradas: { gammaF: gf, Nk: inp.Nk, Mx: Mx0, My: My0, Mdx, Mdy } });
  const prD = basePressure(A, B, Nd, Mdy / Nd, Mdx / Nd)!;
  E('esforcos', t, { descricao: 'Tensões de cálculo na base (sem tração)', formula: 'σd(x,y) = máx(0; s0 + sx·x + sy·y)', expressao: `σd,máx = ${fm(prD.sigmaMax)} kPa; σd,mín = ${fm(prD.sigmaMin)} kPa`, resultado: prD.sigmaMax, unidade: 'kPa', norma: `${NBR6118}, 22.6`, entradas: { A, B, N: Nd, ex: Mdy / Nd, ey: Mdx / Nd, s0: prD.s0, sx: prD.sx, sy: prD.sy, sigmaMin: prD.sigmaMin, compressed: prD.compressed } });

  // ---------------------------------------------------------------- flexão
  const bielas = f.method === 'bielas' && f.kind === 'rigida';
  if (p.ftMethod === 'bielas' && !bielas) E('dimensionamento', 'Método de dimensionamento', { descricao: 'O método das bielas foi pedido mas não vale aqui (pilar excêntrico, concreto simples ou sapata flexível): usado o CEB-70', formula: 'CEB-70', expressao: f.methodNotes.join(' '), resultado: 'CEB-70', unidade: '', norma: NBR6118, aConfirmar: true, entradas: {} });
  for (const axis of ['x', 'y'] as const) {
    const fx = f.flex[axis];
    const [L, Wd, a0, cc] = axis === 'x' ? [A, B, ap, cA] : [B, A, bp, cB];
    const tf = `Flexão · direção ${axis} (momento em torno de ${axis === 'x' ? 'y' : 'x'})`;
    const AsMin = p.ftRhoMin * Wd * f.h;
    if (inp.simples) {
      const x1 = a0 / 2 - 0.15 * a0, xc = Math.abs(axis === 'x' ? ex0 : ey0);
      E('dimensionamento', tf, { descricao: 'Momento de cálculo na seção de referência (a 0,15·a0 para dentro da face), por integração da tensão de cálculo no balanço', formula: 'Md = máx[∫σd(t)·(t − a)dt (balanço +); ∫σd(t)·(z − t)dt (balanço −)], a = xc + x1, z = xc − x1', expressao: `x1 = ${fm(x1)} m; xc = ${fm(xc, 5)} m → Md = ${fm(fx.Md)} kN·m`, resultado: fx.Md, unidade: 'kN·m', norma: `${NBR6118}, 22.6.2 (CEB-70)`, aConfirmar: true, entradas: { ...entPressao(prD), A, B, x1, eixo: axis, xc } });
      E('dimensionamento', tf, { descricao: 'Concreto simples: tensão de tração na flexão (sem armadura) ≤ fctd', formula: 'σt = 6·Md/(b·h²) ≤ fctd', expressao: `σt = 6·${fm(fx.Md / 1000)}/(${fm(Wd)}·${fm(f.h)}²) = ${fm(fx.sigmaT!)} MPa ${fx.sigmaT! <= fx.fctd! + 1e-9 ? '≤' : '>'} fctd = ${fm(fx.fctd!)} MPa`, resultado: fx.sigmaT!, unidade: 'MPa', norma: `${NBR6118}, cap. 24`, entradas: { Md: fx.Md, b: Wd, h: f.h, fctd: fx.fctd!, gammaSimples: p.ftSimplesGamma } });
      continue;
    }
    if (bielas) {
      const NdEq = prD.sigmaMax * A * B, T = (NdEq * (L - a0)) / (8 * dd);
      E('dimensionamento', tf, { descricao: 'Método das bielas (pilar centrado, sapata rígida): carga equivalente com a tensão máxima de cálculo em toda a base (a favor da segurança)', formula: 'Nd,eq = σd,máx·A·B; T = Nd,eq·(L − a0)/(8·d)', expressao: `Nd,eq = ${fm(prD.sigmaMax)}·${fm(A)}·${fm(B)} = ${fm(NdEq)} kN; T = ${fm(NdEq)}·(${fm(L)} − ${fm(a0)})/(8·${fm(dd)}) = ${fm(T)} kN`, resultado: T, unidade: 'kN', norma: `${NBR6118}, 22.6.2.2 (bielas; numeração a confirmar)`, aConfirmar: true, entradas: { sigmaDmax: prD.sigmaMax, A, B, L, a0, d: dd } });
      E('dimensionamento', tf, { descricao: 'Armadura de tração das bielas', formula: 'As = T/(1000·fyd)', expressao: `As = ${fm(T)}/(1000·${fm(fyd)}) = ${fm(fx.As * 1e4)} cm²`, resultado: fx.As, unidade: 'm²', norma: NBR6118, entradas: { T, fyd } });
    } else {
      const x1 = a0 / 2 - 0.15 * a0, xc = Math.abs(axis === 'x' ? ex0 : ey0);
      const Md = overhangMoment(prD, A, B, x1, axis, xc);
      E('dimensionamento', tf, { descricao: 'Momento de cálculo na seção de referência (a 0,15·a0 para dentro da face do pilar), por integração da tensão de cálculo no balanço (CEB-70; Simpson, 400 trechos)', formula: 'Md = máx[∫σd(t)·(t − a)dt (balanço +); ∫σd(t)·(z − t)dt (balanço −)], a = xc + x1, z = xc − x1', expressao: `x1 = ${fm(a0)}/2 − 0,15·${fm(a0)} = ${fm(x1)} m; xc = ${fm(xc, 5)} m → Md = ${fm(Md)} kN·m`, resultado: Md, unidade: 'kN·m', norma: `${NBR6118}, 22.6.2 e 22.6.4 (CEB-70; numeração a confirmar)`, aConfirmar: true, entradas: { ...entPressao(prD), A, B, x1, eixo: axis, xc } });
      E('dimensionamento', tf, { descricao: 'Altura útil efetiva na flexão (limitada a 1,5 vezes o balanço)', formula: 'dEff = mín(d; 1,5·c)', expressao: `dEff = mín(${fm(dd)}; 1,5·${fm(cc)}) = ${fm(fx.dEff)} m`, resultado: fx.dEff, unidade: 'm', norma: NBR6118, aConfirmar: true, entradas: { d: dd, balanco: cc } });
      const sec = { kind: 'rect' as const, bw: Wd, h: fx.dEff + p.cover + 0.01 };
      flexao(mem, el, tf, { c, sec, taxaMin: 0, b: Wd, h: f.h }, Md, fx.dEff, 0.05, fyd, false, fx.As, true, { semMinimo: true });
    }
    E('dimensionamento', tf, { descricao: 'Armadura mínima da sapata', formula: 'As,mín = ρmín·B·h', expressao: `As,mín = ${fm(p.ftRhoMin)}·${fm(Wd)}·${fm(f.h)} = ${fm(AsMin * 1e4)} cm²`, resultado: AsMin, unidade: 'm²', norma: `${NBR6118}, 17.3.5.2.1; ρmín 0,15 % (a confirmar)`, aConfirmar: true, entradas: { rhoMin: p.ftRhoMin, b: Wd, h: f.h } });
    const AsAdopt = Math.max(fx.As, p.ftRhoMinReduz ? Math.min(AsMin, (4 / 3) * fx.As) : AsMin);
    E('dimensionamento', tf, { descricao: `Armadura de cálculo${p.ftRhoMinReduz ? ' (mínimo reduzido a 4/3 de As se menor)' : ''}`, formula: p.ftRhoMinReduz ? 'As,adot = máx(As; mín(As,mín; 4/3·As))' : 'As,adot = máx(As; As,mín)', expressao: `As,adot = ${fm(AsAdopt * 1e4)} cm²`, resultado: AsAdopt, unidade: 'm²', norma: NBR6118, entradas: { As: fx.As, AsMin, reduz: p.ftRhoMinReduz ? 1 : 0 } });
    if (fx.imposed) {
      E('detalhamento', tf, { descricao: `Armadura imposta pelo usuário (φ${fm(fx.imposed.phi)} c/${fm(fx.imposed.s * 100)} cm): só verificada`, formula: 'As,prov ≥ As,adot', expressao: `As,prov = ${fm(fx.imposed.As * 1e4)} cm² ${fx.imposed.ok ? '≥' : '<'} ${fm(AsAdopt * 1e4)} cm²`, resultado: fx.imposed.As, unidade: 'm²', norma: NBR6118, entradas: { phi: fx.imposed.phi, s: fx.imposed.s, n: fx.bars?.n ?? 0, AsAdopt } });
    } else {
      const bars = bestBars(spacedBars(AsAdopt, fx.width));
      E('detalhamento', tf, { descricao: `Barras: menor área de aço com espaçamento entre 10 e 20 cm na largura útil ${fm(fx.width)} m`, formula: 'n = máx(2; ⌈As/Asφ⌉; ⌈l/20 cm⌉ + 1); s = l/(n − 1)', expressao: bars ? `${bars.n} φ${fm(bars.phi)} c/${fm(bars.spacing * 100)} cm (${fm(bars.As * 1e4)} cm²)` : 'não coube com espaçamento entre 10 e 20 cm', resultado: bars ? `${bars.n} φ${fm(bars.phi)} c/${fm(bars.spacing * 100)}` : 'sem solução', unidade: '', norma: NBR6118, entradas: { AsAdopt, largura: fx.width, cobrimento: p.cover, ...(bars ? { phi: bars.phi, n: bars.n, As: bars.As, s: bars.spacing } : {}) } });
    }
  }

  // ---------------------------------------------------------------- compressão diagonal e punção
  t = 'Compressão diagonal e punção';
  const u0 = 2 * (ap + bp) - (inp.edge?.[0] ? bp : 0) - (inp.edge?.[1] ? ap : 0);
  const tauSd0 = Nd / 1000 / (u0 * dd), tauRd2 = 0.27 * (1 - p.fckFound / 250) * c.fcd;
  E('dimensionamento', t, { descricao: `Contorno C no perímetro do pilar${inp.edge?.[0] || inp.edge?.[1] ? ' (a face junto à divisa não entra)' : ''}`, formula: 'u0 = 2·(ap + bp) − [bp se divisa em x] − [ap se divisa em y]', expressao: `u0 = 2·(${fm(ap)} + ${fm(bp)})${inp.edge?.[0] ? ` − ${fm(bp)}` : ''}${inp.edge?.[1] ? ` − ${fm(ap)}` : ''} = ${fm(u0)} m`, resultado: u0, unidade: 'm', norma: `${NBR6118}, 19.5.2`, entradas: { ap, bp, edgeX: inp.edge?.[0] ?? 0, edgeY: inp.edge?.[1] ?? 0 } });
  E('dimensionamento', t, { descricao: 'Compressão diagonal do concreto no contorno do pilar', formula: 'τSd = Nd/(u0·d) ≤ τRd2 = 0,27·(1 − fck/250)·fcd', expressao: `τSd = ${fm(Nd)}/1000/(${fm(u0)}·${fm(dd)}) = ${fm(tauSd0)} MPa ${tauSd0 <= tauRd2 + 1e-9 ? '≤' : '>'} τRd2 = 0,27·(1 − ${fm(p.fckFound)}/250)·${fm(c.fcd)} = ${fm(tauRd2)} MPa`, resultado: tauSd0, unidade: 'MPa', norma: `${NBR6118}, 19.5.3.1`, entradas: { Nd, u0, d: dd, fck: p.fckFound, fcd: c.fcd, tauRd2 } });
  const applies = cA >= 2 * dd && cB >= 2 * dd;
  if (!applies) {
    E('dimensionamento', t, { descricao: 'Punção no contorno C′ não se aplica: balanço menor que 2d (a biela chega ao pilar; só a compressão diagonal governa)', formula: 'cA ≥ 2d e cB ≥ 2d', expressao: `cA = ${fm(cA)} m; cB = ${fm(cB)} m; 2d = ${fm(2 * dd)} m`, resultado: 'não se aplica', unidade: '', norma: `${NBR6118}, 19.5.2`, entradas: { cA, cB, d: dd } });
  } else {
    const pu = f.punch;
    const areaC1 = ap * bp + 4 * dd * (ap + bp) + 4 * Math.PI * dd * dd, Fred = Nd - (Nd / (A * B)) * areaC1, u1 = 2 * (ap + bp) + 4 * Math.PI * dd;
    E('dimensionamento', t, { descricao: 'Contorno C′ a 2d do pilar: área interna, força reduzida pela reação do solo dentro do contorno e perímetro', formula: 'AC′ = ap·bp + 4d·(ap + bp) + 4π·d²; Fred = Nd − Nd/(A·B)·AC′; u1 = 2·(ap + bp) + 4π·d', expressao: `AC′ = ${fm(areaC1)} m²; Fred = ${fm(Nd)} − ${fm(Nd / (A * B))}·${fm(areaC1)} = ${fm(Fred)} kN; u1 = ${fm(u1)} m`, resultado: u1, unidade: 'm', norma: `${NBR6118}, 19.5.2.1`, entradas: { ap, bp, d: dd, Nd, A, B, areaC1, Fred } });
    const Wp = (C1: number, C2: number) => (C1 * C1) / 2 + C1 * C2 + 4 * C2 * dd + 16 * dd * dd + 2 * Math.PI * dd * C1;
    const Kx = kTable(ap / bp), Ky = kTable(bp / ap), Wpx = Wp(ap, bp), Wpy = Wp(bp, ap);
    E('dimensionamento', t, { descricao: 'Coeficientes K (Tabela 19.2, por interpolação em C1/C2) e módulos de resistência plástica do perímetro C′', formula: 'Wp = C1²/2 + C1·C2 + 4·C2·d + 16·d² + 2π·d·C1', expressao: `Kx = ${fm(Kx)}, Wpx = ${fm(Wpx)} m²; Ky = ${fm(Ky)}, Wpy = ${fm(Wpy)} m²`, resultado: Kx, unidade: '', norma: `${NBR6118}, 19.5.2.2 (Tabela 19.2)`, entradas: { razaoX: ap / bp, razaoY: bp / ap, Kx, Ky, Wpx, Wpy, d: dd, ap, bp } });
    const tauSd1 = (Fred / (u1 * dd) + (Kx * Mdy) / (Wpx * dd) + (Ky * Mdx) / (Wpy * dd)) / 1000;
    E('dimensionamento', t, { descricao: 'Tensão solicitante em C′', formula: 'τSd = [Fred/(u1·d) + Kx·Mdy/(Wpx·d) + Ky·Mdx/(Wpy·d)]/1000', expressao: `τSd = [${fm(Fred)}/(${fm(u1)}·${fm(dd)}) + ${fm(Kx)}·${fm(Mdy)}/(${fm(Wpx)}·${fm(dd)}) + ${fm(Ky)}·${fm(Mdx)}/(${fm(Wpy)}·${fm(dd)})]/1000 = ${fm(tauSd1)} MPa`, resultado: tauSd1, unidade: 'MPa', norma: `${NBR6118}, 19.5.2.2`, entradas: { Fred, u1, d: dd, Kx, Mdy, Wpx, Ky, Mdx, Wpy } });
    const rx = (f.flex.x.bars?.As ?? f.flex.x.AsAdopt) / (B * dd), ry = (f.flex.y.bars?.As ?? f.flex.y.AsAdopt) / (A * dd);
    const rho = Math.min(0.02, Math.sqrt(rx * ry));
    const tauRd1 = 0.13 * (1 + Math.sqrt(20 / (dd * 100))) * (100 * rho * p.fckFound) ** (1 / 3);
    E('dimensionamento', t, { descricao: `Taxa de armadura de flexão (média geométrica das duas direções, ≤ 2 %) e resistência τRd1${f.kind === 'rigida' ? ' (sapata rígida: a punção em C′ não governa)' : ''}`, formula: 'ρ = mín(0,02; √(ρx·ρy)); τRd1 = 0,13·(1 + √(20/d[cm]))·(100·ρ·fck)^(1/3)', expressao: `ρx = ${fm(rx, 5)}; ρy = ${fm(ry, 5)}; ρ = ${fm(rho, 5)} → τRd1 = ${fm(tauRd1)} MPa; τSd = ${fm(tauSd1)} MPa ${tauSd1 <= tauRd1 + 1e-9 ? '≤' : '>'} τRd1`, resultado: tauRd1, unidade: 'MPa', norma: `${NBR6118}, 19.5.3.2`, entradas: { Asx: f.flex.x.bars?.As ?? f.flex.x.AsAdopt, Asy: f.flex.y.bars?.As ?? f.flex.y.AsAdopt, B, A, d: dd, fck: p.fckFound, rhoX: rx, rhoY: ry, rho, tauSd1 } });
    void pu;
  }

  // ---------------------------------------------------------------- volume
  t = 'Volume de concreto';
  const A1 = A * B, A2 = (ap + 0.05) * (bp + 0.05);
  E('detalhamento', t, { descricao: f.kind === 'rigida' ? 'Volume: prisma de altura h0 + tronco de pirâmide até o topo (pilar + 2,5 cm de cada lado)' : 'Volume: prisma de altura h', formula: f.kind === 'rigida' ? 'V = A·B·h0 + (h − h0)/3·(A1 + A2 + √(A1·A2))' : 'V = A·B·h', expressao: `V = ${fm(f.volume)} m³`, resultado: f.volume, unidade: 'm³', entradas: { A, B, h: f.h, h0: f.h0, A1, A2, tipo: f.kind } });
  E('detalhamento', t, { descricao: f.ok ? 'Sapata atende às verificações estruturais e do solo' : 'Sapata NÃO atende', formula: 'verificações', expressao: f.messages.join(' ') || 'sem mensagens', resultado: f.ok ? 'atende' : 'não atende', unidade: '', entradas: {} });
}

const entPressao = (pr: { s0: number; sx: number; sy: number; sigmaMax: number; sigmaMin: number; compressed: number }): Record<string, ValorMemoria> =>
  ({ s0: pr.s0, sx: pr.sx, sy: pr.sy, sigmaMax: pr.sigmaMax, sigmaMin: pr.sigmaMin, compressed: pr.compressed });

function d_meters(inp: FootingInput, z0: number, bulbo: number): [number, number][] {
  const b = inp.boring;
  if (!b) return [];
  return b.meters.map((m, i) => [i + 1, m.N] as [number, number]).filter(([z]) => z > z0 + 1e-9 && z <= z0 + Math.max(1, bulbo) + 1e-9);
}

