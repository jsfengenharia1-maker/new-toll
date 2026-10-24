// Memória detalhada (MD fase 5, fundações rasas): sapata corrida sob parede (carga linear por metro, largura B, altura, pressão
// sem tração, deslizamento) e sob pilares (viga sobre base elástica: pressão máxima da análise), com a flexão transversal da aba
// por metro (CEB-70 ou bielas), a armadura de distribuição e o cisalhamento da sapata flexível. Chamada por `calcularParede` e
// `calcularSobPilares` só com a memória ligada, depois do cálculo, com os números do próprio cálculo.
import type { CombinacaoEd } from '../building/combinacoes';
import type { OpcoesCalculo } from '../building/opcoes';
import type { EntradaFlexao, FlexaoTransversal, ResultadoCorrida } from '../building/sapataCorrida';
import { momentoAba, pressaoCorrida } from '../building/sapataCorrida';
import type { ResultadoVigaElastica } from '../building/baseElastica';
import type { SapataCorrida } from '../building/types';
import { vrd1 } from '../building/vigotas';
import { concrete } from '../concrete';
import { sptSigma } from '../footings';
import type { Boring, FoundationParams } from '../piles';
import { fm, type EtapaMemoria, type Registrador, type ValorMemoria } from './registrador';
import { flexao } from './vigaConcreto';

type Chave = Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>;
type Etapa = EtapaMemoria;
const NBR6118 = 'NBR 6118:2023';
const NBR6122 = 'NBR 6122:2019';
const GAMA_CONC = 25;

export const elementoCorrida = (nome: string) => `Sapata corrida ${nome}`;

/** Área da seção transversal (m²) da sapata sob parede (a mesma de `sapataCorrida.ts`). */
export const areaSecaoParede = (B: number, bw: number, h: number, h0: number) => bw * h + (B - bw) * ((h + h0) / 2);

// ------------------------------------------------------------------ flexão transversal (comum aos dois modos)

/** Flexão transversal da aba por metro, armadura de distribuição e cortante (sapata flexível). */
export function registrarFlexaoTransversal(mem: Registrador, el: string, s: EntradaFlexao, P: FoundationParams, op: OpcoesCalculo, tr: FlexaoTransversal): void {
  const E = (etapa: Etapa, topico: string, q: Chave) => mem.passo({ etapa, elemento: el, topico, ...q });
  const c = concrete(P.fckFound, P.gammaC), fyd = P.fyk / P.gammaS;
  const t = 'Flexão transversal da aba (por metro)';
  const balanco = Math.max(0, s.aba === 'ambas' ? (s.B - s.bw) / 2 : s.B - s.bw);
  const pct = s.alvenaria ? op.corridaRefAlvenaria : op.corridaRefConcreto;
  const ref = (pct / 100) * s.bw, l = balanco + ref;
  E('dimensionamento', t, { descricao: `Balanço da aba além da face do apoio (${s.aba === 'ambas' ? 'abas dos dois lados' : 'aba de um lado só'}) e seção de referência a ${fm(pct)} % de bw dentro da face (${s.alvenaria ? 'alvenaria' : 'concreto'})`, formula: 'c = (B − bw)/2 (ambas) ou B − bw; l = c + pct/100·bw', expressao: `c = ${fm(balanco)} m; l = ${fm(balanco)} + ${fm(pct)}/100·${fm(s.bw)} = ${fm(l)} m`, resultado: l, unidade: 'm', norma: `${NBR6118}, 22.6.2; seção de referência a 15 % (concreto) / 25 % (alvenaria) de bw: padrão do sistema (a confirmar)`, aConfirmar: true, entradas: { B: s.B, bw: s.bw, aba: s.aba, pct, balanco } });
  const d = s.h - P.cover - 0.01, dEff = Math.min(d, 1.5 * Math.max(balanco, 1e-6));
  E('dimensionamento', t, { descricao: 'Altura útil e altura útil efetiva (limitada a 1,5 vezes o balanço)', formula: 'd = h − c − 0,01; dEff = mín(d; 1,5·c)', expressao: `d = ${fm(s.h)} − ${fm(P.cover)} − 0,01 = ${fm(d)} m; dEff = mín(${fm(d)}; 1,5·${fm(balanco)}) = ${fm(dEff)} m`, resultado: dEff, unidade: 'm', norma: NBR6118, aConfirmar: true, entradas: { h: s.h, cover: P.cover, d, balanco } });
  const e = s.aba === 'ambas' ? 0 : (s.B - s.bw) / 2, eX = s.eExtra ?? 0;
  const eTot = (s.equilibrio ? 0 : e) + eX;
  const pr0 = pressaoCorrida(s.B, s.Nd, eTot, false) ?? { s0: s.Nd / s.B, sx: 0 };
  const pr = s.aba === 'ambas' ? { s0: pr0.s0, sx: -Math.abs(pr0.sx) } : pr0;
  E('esforcos', t, { descricao: `Carga de cálculo por metro (líquida do peso próprio) e tensões de cálculo sob a base (faixa de 1 m, sem tração); excentricidade ${s.equilibrio ? 'nula (equilibrada por cintas)' : 'geométrica da aba'} + do momento do pé da parede`, formula: 'Nd; e = (B − bw)/2 (aba de um lado, sem cintas) + M/N; σ(t) = s0 + sx·(t − B/2)', expressao: `Nd = ${fm(s.Nd)} kN/m; e = ${fm(eTot, 5)} m → s0 = ${fm(pr.s0)} kPa; sx = ${fm(pr.sx)} kPa/m`, resultado: s.Nd, unidade: 'kN/m', norma: `${NBR6122}; ${NBR6118}, 22.6`, entradas: { Nd: s.Nd, B: s.B, e: eTot, eGeom: s.equilibrio ? 0 : e, eExtra: eX, s0: pr.s0, sx: pr.sx } });
  const bielas = tr.metodo === 'bielas';
  const AsMinV = P.ftRhoMin * 1 * s.h;
  if (bielas) {
    const T = (s.Nd * (s.B - s.bw)) / (8 * d);
    E('dimensionamento', t, { descricao: 'Método das bielas (aba dos dois lados, sapata rígida)', formula: 'T = Nd·(B − bw)/(8·d)', expressao: `T = ${fm(s.Nd)}·(${fm(s.B)} − ${fm(s.bw)})/(8·${fm(d)}) = ${fm(T)} kN/m`, resultado: T, unidade: 'kN/m', norma: `${NBR6118}, 22.6.2.2 (numeração a confirmar)`, aConfirmar: true, entradas: { Nd: s.Nd, B: s.B, bw: s.bw, d } });
    E('dimensionamento', t, { descricao: 'Armadura de tração das bielas', formula: 'As = T/(1000·fyd)', expressao: `As = ${fm(T)}/(1000·${fm(fyd)}) = ${fm(tr.As)} cm²/m`, resultado: tr.As / 1e4, unidade: 'm²/m', norma: NBR6118, entradas: { T, fyd } });
  } else {
    const Md = momentoAba(pr, s.B, l);
    E('dimensionamento', t, { descricao: 'Momento fletor por metro na seção de referência: momento das tensões do solo entre a borda da aba e a seção (Simpson, 200 trechos; CEB-70)', formula: 'Md = ∫₀ˡ máx(0; s0 + sx·(t − B/2))·(l − t) dt', expressao: `Md = ${fm(Md)} kN·m/m`, resultado: Md, unidade: 'kN·m/m', norma: `${NBR6118}, 22.6.2 e 22.6.4 (CEB-70; numeração a confirmar)`, aConfirmar: true, entradas: { s0: pr.s0, sx: pr.sx, B: s.B, l } });
    if (Md > 0) flexao(mem, el, t, { c, sec: { kind: 'rect', bw: 1, h: dEff + P.cover + 0.01 }, taxaMin: 0, b: 1, h: s.h }, Md, dEff, 0.05, fyd, false, tr.As / 1e4, true, { semMinimo: true, un: 'kN·m/m' });
  }
  E('dimensionamento', t, { descricao: 'Armadura mínima por metro', formula: 'As,mín = ρmín·1·h', expressao: `As,mín = ${fm(P.ftRhoMin)}·1·${fm(s.h)} = ${fm(AsMinV * 1e4)} cm²/m`, resultado: AsMinV, unidade: 'm²/m', norma: `${NBR6118}, 17.3.5.2.1; ρmín 0,15 % (a confirmar)`, aConfirmar: true, entradas: { rhoMin: P.ftRhoMin, h: s.h } });
  const As = tr.As / 1e4, AsAdot = Math.max(As, P.ftRhoMinReduz ? Math.min(AsMinV, (4 / 3) * As) : AsMinV);
  E('dimensionamento', t, { descricao: 'Armadura transversal adotada', formula: P.ftRhoMinReduz ? 'As,adot = máx(As; mín(As,mín; 4/3·As))' : 'As,adot = máx(As; As,mín)', expressao: `As,adot = ${fm(AsAdot * 1e4)} cm²/m`, resultado: AsAdot, unidade: 'm²/m', norma: NBR6118, entradas: { As, AsMin: AsMinV, reduz: P.ftRhoMinReduz ? 1 : 0 } });
  const b = tr.barras;
  E('detalhamento', t, { descricao: 'Barras transversais: menor área efetiva com espaçamento de 10 a 20 cm (φ8 a φ25, φ ≤ h/8)', formula: 's = ⌊mín(20 cm; Asφ/As)⌋ em cm; As,ef = Asφ/s', expressao: b ? `φ${fm(b.phi)} c/${fm(b.s * 100)} cm (${fm(b.As * 1e4)} cm²/m)` : 'não coube com espaçamento entre 10 e 20 cm', resultado: b ? `φ${fm(b.phi)} c/${fm(b.s * 100)}` : 'sem solução', unidade: '', norma: NBR6118, entradas: { AsAdot, h: s.h, ...(b ? { phi: b.phi, s: b.s, As: b.As } : {}) } });
  const AsDist = Math.max((op.corridaDistribuicao / 100) * (b?.As ?? AsAdot), 0.9e-4, 0.5 * P.ftRhoMin * s.h);
  E('dimensionamento', t, { descricao: `Armadura de distribuição (paralela ao eixo): ${fm(op.corridaDistribuicao)} % da transversal, no mínimo 0,9 cm²/m e metade de ρmín·h`, formula: 'As,dist = máx(pct/100·As,ef; 0,9 cm²/m; 0,5·ρmín·h)', expressao: `As,dist = ${fm(AsDist * 1e4)} cm²/m`, resultado: AsDist, unidade: 'm²/m', norma: `${NBR6118}, 22.6.4.1 (a confirmar)`, aConfirmar: true, entradas: { pct: op.corridaDistribuicao, AsEf: b?.As ?? AsAdot, rhoMin: P.ftRhoMin, h: s.h } });
  const dist = tr.distribuicao.barras;
  E('detalhamento', t, { descricao: 'Barras de distribuição (espaçamento de 8 a 33 cm, φ6,3 a φ16)', formula: 's = ⌊mín(33 cm; Asφ/As)⌋', expressao: dist ? `φ${fm(dist.phi)} c/${fm(dist.s * 100)} cm (${fm(dist.As * 1e4)} cm²/m)` : 'sem solução', resultado: dist ? `φ${fm(dist.phi)} c/${fm(dist.s * 100)}` : 'sem solução', unidade: '', entradas: { AsDist, ...(dist ? { phi: dist.phi, s: dist.s, As: dist.As } : {}) } });
  if (s.h < s.hRigido - 1e-9 && tr.cortante) {
    const Vd = (s.Nd / s.B) * Math.max(0, balanco - d), R = vrd1(c, 1, dEff, b?.As ?? AsAdot);
    E('dimensionamento', t, { descricao: `Sapata flexível (h < altura rígida ${fm(s.hRigido)} m): cisalhamento a d da face, sem armadura transversal`, formula: 'Vd = Nd/B·máx(0; c − d); VRd1 = 0,25·fctd·k·(1,2 + 40ρ)·bw·d', expressao: `Vd = ${fm(s.Nd / s.B)}·máx(0; ${fm(balanco)} − ${fm(d)}) = ${fm(Vd)} kN/m ${Vd <= R + 1e-9 ? '≤' : '>'} VRd1 = ${fm(R)} kN/m`, resultado: Vd, unidade: 'kN/m', norma: `${NBR6118}, 19.4.1 (a confirmar)`, aConfirmar: true, entradas: { Nd: s.Nd, B: s.B, balanco, d, dEff, As: b?.As ?? AsAdot, VRd1: R } });
  }
}

// ------------------------------------------------------------------ sapata corrida sob parede

export interface CtxCorridaParede {
  c: SapataCorrida & { parede?: string }; P: FoundationParams; op: OpcoesCalculo; L: number;
  cj: { casos: Map<string, number[]>; nJan: number; wj: number; total: number };
  mom: Map<string, number[]>; hor: Map<string, number[]>;
  cargas: { cb: CombinacaoEd; q: number; qMin: number; m: number; h: number; vento: boolean; j: number }[];
  Nk: number; NkMin: number; cMax: string; W0: number; furo?: Boring;
  sg: { s: number; spt?: { Nbar: number; Nused: number; from: number; to: number } };
  g: { h: number; h0: number; hRig: number; bal: number }; W: number;
  piorX: { x: { cb: CombinacaoEd; q: number; m: number; h: number; vento: boolean }; qe: number; eGeom: number; eM: number };
  fv: number; B: number; qEfFinal: number; Nd: number; eMnet: number; ef: EntradaFlexao; tr: FlexaoTransversal; sec: number; volume: number; cintas: boolean;
  r: ResultadoCorrida;
}

export function registrarCorridaParede(mem: Registrador, x: CtxCorridaParede): void {
  const { c, P, op, L, cj, mom, hor, g, B } = x;
  const el = elementoCorrida(c.nome);
  if (!mem.aceita(el)) return;
  const E = (etapa: Etapa, topico: string, q: Chave) => mem.passo({ etapa, elemento: el, topico, ...q });
  let t = 'Cargas lineares sobre o eixo';
  E('cargas', t, { descricao: `Eixo da sapata dividido em ${cj.nJan} janela(s) de ${fm(cj.wj)} m (janela máxima ${fm(op.corridaJanela)} m); a carga por metro é a maior soma entre as janelas`, formula: 'wj = L/nJan; qj = Σ P/wj', expressao: `L = ${fm(L)} m; nJan = ${cj.nJan}; wj = ${fm(cj.wj)} m; carga total lançada/reações = ${fm(cj.total)} kN`, resultado: cj.wj, unidade: 'm', norma: NBR6122, aConfirmar: true, entradas: { L, nJan: cj.nJan, janelaMax: op.corridaJanela, total: cj.total } });
  for (const [caso, arr] of cj.casos) E('cargas', t, { descricao: `Caso ${caso}: carga linear característica por janela (vertical)`, formula: 'qj (kN/m)', expressao: arr.map((v, j) => `j${j + 1} = ${fm(v)}`).join('; '), resultado: Math.max(...arr), unidade: 'kN/m', entradas: { valores: JSON.stringify(arr) } });
  for (const [caso, arr] of mom) if (arr.some((v) => v !== 0)) E('cargas', t, { descricao: `Caso ${caso}: momento fora do plano na base da parede por janela`, formula: 'mj (kN·m/m)', expressao: arr.map((v, j) => `j${j + 1} = ${fm(v)}`).join('; '), resultado: Math.max(...arr.map(Math.abs)), unidade: 'kN·m/m', entradas: { valores: JSON.stringify(arr) } });
  for (const [caso, arr] of hor) if (arr.some((v) => v !== 0)) E('cargas', t, { descricao: `Caso ${caso}: cortante normal à parede na base por janela`, formula: 'hj (kN/m)', expressao: arr.map((v, j) => `j${j + 1} = ${fm(v)}`).join('; '), resultado: Math.max(...arr.map(Math.abs)), unidade: 'kN/m', entradas: { valores: JSON.stringify(arr) } });
  t = 'Combinações raras (carga por metro)';
  for (const k of x.cargas) {
    const fat = Object.entries(k.cb.fatores).filter(([, f]) => f !== 0);
    const ent: Record<string, ValorMemoria> = { janela: k.j, q: k.q, qMin: k.qMin, m: k.m, h: k.h };
    for (const [n, f] of fat) ent[`f_${n}`] = f;
    E('combinacoes', t, { descricao: `${k.cb.nome}: janela ${k.j + 1}${k.vento ? ' (com vento: σadm × fator)' : ''}`, formula: 'q = Σ f·qcaso,j; m = Σ f·mcaso,j; h = Σ f·hcaso,j', expressao: `q = ${fat.map(([n, f]) => `${fm(f)}·${fm(cj.casos.get(n)?.[k.j] ?? 0)}`).join(' + ') || '0'} = ${fm(k.q)} kN/m; m = ${fm(k.m)} kN·m/m; h = ${fm(k.h)} kN/m`, resultado: k.q, unidade: 'kN/m', norma: 'NBR 8681:2003, 5.1.3 (combinação rara)', entradas: ent });
  }
  E('esforcos', 'Envoltória por metro', { descricao: `Carga linear máxima (combinação ${x.cMax}) e mínima entre as combinações raras e janelas`, formula: 'Nk = máx q; Nk,mín = mín q', expressao: `Nk = ${fm(x.Nk)} kN/m; Nk,mín = ${fm(x.NkMin)} kN/m`, resultado: x.Nk, unidade: 'kN/m', norma: NBR6122, entradas: { NkMin: x.NkMin, combinacao: x.cMax } });
  // σadm
  t = 'Tensão admissível do solo';
  if (P.ftSigmaMode === 'informada') E('dimensionamento', t, { descricao: 'σadm informada (sapata ou terreno)', formula: 'σadm = valor informado', expressao: `σadm = ${fm(x.sg.s)} kPa`, resultado: x.sg.s, unidade: 'kPa', norma: NBR6122, entradas: { origem: 'informada' } });
  else if (x.furo) {
    const bulbo = P.ftBulb * B, sel = x.furo.meters.map((m, i) => [i + 1, m.N] as [number, number]).filter(([z]) => z > P.ftDepth + 1e-9 && z <= P.ftDepth + Math.max(1, bulbo) + 1e-9);
    const sp = sptSigma(x.furo, P.ftDepth, bulbo, P.ftSptDiv, P.ftNmaxEst);
    E('dimensionamento', t, { descricao: `NSPT do furo mais próximo do meio do eixo no bulbo de tensões (bulbo = ${fm(P.ftBulb)}·B)`, formula: 'N̄ = média dos NSPT por metro do bulbo', expressao: `${sel.map(([z, n]) => `${fm(z, 3)} m: ${fm(n)}`).join('; ')} → N̄ = ${fm(sp?.Nbar ?? 0)}`, resultado: sp?.Nbar ?? 0, unidade: '', norma: NBR6122, aConfirmar: true, entradas: { profundidade: P.ftDepth, fatorBulbo: P.ftBulb, B, leituras: JSON.stringify(sel) } });
    E('dimensionamento', t, { descricao: 'σadm estimada pelo SPT', formula: 'σadm = mín(N̄; Nmáx)/div · 1000', expressao: `σadm = mín(${fm(sp?.Nbar ?? 0)}; ${fm(P.ftNmaxEst)})/${fm(P.ftSptDiv)}·1000 = ${fm(x.sg.s)} kPa`, resultado: x.sg.s, unidade: 'kPa', norma: `${NBR6122}; N̄/${P.ftSptDiv} MPa (a confirmar)`, aConfirmar: true, entradas: { Nbar: sp?.Nbar ?? 0, Nmax: P.ftNmaxEst, div: P.ftSptDiv } });
  }
  // largura e altura
  t = 'Largura, altura e peso próprio';
  E('dimensionamento', t, { descricao: `Peso próprio estimado (${fm(P.ftPP)} % da carga máxima)`, formula: 'W0 = ftPP/100·Nk', expressao: `W0 = ${fm(P.ftPP)}/100·${fm(x.Nk)} = ${fm(x.W0)} kN/m`, resultado: x.W0, unidade: 'kN/m', norma: NBR6122, aConfirmar: true, entradas: { ftPP: P.ftPP, Nk: x.Nk } });
  E('dimensionamento', t, { descricao: c.B !== undefined ? 'Largura B imposta (só verificada)' : 'Largura B: a menor, em passos de 5 cm a partir da mínima, que atende σadm, tensão de borda e área comprimida em todas as combinações', formula: 'B', expressao: `B = ${fm(B)} m`, resultado: B, unidade: 'm', norma: NBR6122, aConfirmar: true, entradas: { B, bw: c.bw, BMin: op.corridaBMin, aba: c.aba } });
  E('dimensionamento', t, { descricao: `Balanço e altura mínima rígida da aba; altura h ${c.h !== undefined ? 'imposta' : '= ⌈máx(hrig; h0mín)⌉'} e h0 da borda`, formula: 'c = (B − bw)/2 ou B − bw; hrig = (2c/3)·(1,5/ftBalancoAltura); h0 = mín(h; ⌈máx(h/3; h0mín)⌉)', expressao: `c = ${fm(g.bal)} m; hrig = ${fm(g.hRig)} m; h = ${fm(g.h)} m; h0 = ${fm(g.h0)} m`, resultado: g.h, unidade: 'm', norma: `${NBR6118}, 22.6.1 (numeração a confirmar)`, aConfirmar: true, entradas: { balanco: g.bal, hRig: g.hRig, h0: g.h0, ftBalancoAltura: P.ftBalancoAltura, h0Min: P.ftH0Min, hImposta: c.h ?? 0, h0Imposta: c.h0 ?? 0 } });
  const area = areaSecaoParede(B, c.bw, g.h, g.h0);
  E('dimensionamento', t, { descricao: 'Peso do concreto por metro e peso adotado', formula: 'A = bw·h + (B − bw)·(h + h0)/2; W = máx(W0; 25·A)', expressao: `A = ${fm(c.bw)}·${fm(g.h)} + (${fm(B)} − ${fm(c.bw)})·(${fm(g.h)} + ${fm(g.h0)})/2 = ${fm(area)} m²; W = máx(${fm(x.W0)}; ${fm(GAMA_CONC * area)}) = ${fm(x.W)} kN/m`, resultado: x.W, unidade: 'kN/m', norma: NBR6122, aConfirmar: true, entradas: { bw: c.bw, B, h: g.h, h0: g.h0, area, W0: x.W0, gamaConc: GAMA_CONC } });
  // pressão
  t = 'Tensões no solo (pior combinação)';
  const pk = x.piorX, N = pk.qe + x.W, eTot = pk.eGeom + pk.eM, pr = pressaoCorrida(B, N, eTot, false);
  E('dimensionamento', t, { descricao: `Combinação governante: ${pk.x.cb.nome} — carga na base e excentricidades (geométrica da aba${x.cintas ? ' (equilibrada pelas cintas: nula)' : ''} + momento do pé da parede M/N)`, formula: 'N = q + W; e = eaba + |m|/N', expressao: `N = ${fm(pk.qe)} + ${fm(x.W)} = ${fm(N)} kN/m; e = ${fm(pk.eGeom, 5)} + ${fm(pk.eM, 5)} = ${fm(eTot, 5)} m`, resultado: N, unidade: 'kN/m', norma: NBR6122, entradas: { q: pk.qe, W: x.W, eGeom: pk.eGeom, m: pk.x.m, eM: pk.eM } });
  E('dimensionamento', t, { descricao: 'Pressão sob a base na faixa de 1 m (sem tração) e verificações de σadm e área comprimida', formula: 'σ(t) = máx(0; s0 + sx·(t − B/2)); σmáx ≤ ftEdgeFactor·σadm·(fator do vento); comprimida ≥ mínimo', expressao: `σmáx = ${fm(x.r.pressao!.sigmaMax)} kPa; σmín = ${fm(x.r.pressao!.sigmaMin)} kPa; comprimida = ${fm(x.r.pressao!.compressed * 100)} %; σadm = ${fm(x.sg.s)} kPa`, resultado: x.r.pressao!.sigmaMax, unidade: 'kPa', norma: `${NBR6122} (área comprimida ≥ 2/3: a confirmar)`, aConfirmar: true, entradas: { B, N, e: eTot, s0: pr?.s0 ?? 0, sx: pr?.sx ?? 0, sigmaMin: x.r.pressao!.sigmaMin, compressed: x.r.pressao!.compressed, sigmaAdm: x.sg.s, edge: P.ftEdgeFactor, fatorVento: pk.x.vento ? x.fv : 1, minComprimida: P.ftLevantamento ? 0 : P.ftMinCompressed } });
  E('esforcos', 'Carga de cálculo por metro', { descricao: `Carga de cálculo por metro, líquida do peso próprio${x.cintas ? ' (com a reação majorada pela alavanca das cintas)' : ''}`, formula: 'Nd = γf·q', expressao: `Nd = ${fm(P.gammaF)}·${fm(x.qEfFinal)} = ${fm(x.Nd)} kN/m`, resultado: x.Nd, unidade: 'kN/m', norma: `${NBR6118}, 11.7`, aConfirmar: true, entradas: { gammaF: P.gammaF, q: x.qEfFinal } });
  if (x.eMnet > 1e-9) E('esforcos', 'Carga de cálculo por metro', { descricao: 'Excentricidade líquida do momento do pé da parede (M/N, a favor da segurança) somada na flexão da aba', formula: 'eX = máx |m|/q', expressao: `eX = ${fm(x.eMnet, 5)} m`, resultado: x.eMnet, unidade: 'm', entradas: {} });
  registrarFlexaoTransversal(mem, el, x.ef, P, op, x.tr);
  // parede: deslizamento
  const par = x.r.parede;
  if (par?.deslizamento) {
    const d = par.deslizamento;
    E('dimensionamento', 'Deslizamento da base', { descricao: `Deslizamento na combinação ${d.comb}${par.conjunto ? ` (conjunto de ${par.conjunto.n} sapata(s) de paredes travadas: H líquida ${fm(par.conjunto.Hliq)} kN e N ${fm(par.conjunto.N)} kN)` : ''}`, formula: 'FS = μ·N/H ≥ FSmín', expressao: `FS = ${fm(d.mu)}·${fm(d.N)}/${fm(d.H)} = ${fm(Math.min(99, (d.mu * d.N) / Math.max(d.H, 1e-12)))} ${d.ok ? '≥' : '<'} ${fm(d.FSmin)}`, resultado: d.FS, unidade: '', norma: `${NBR6122} (μ e FSmín: opções do sistema; a confirmar)`, aConfirmar: true, entradas: { mu: d.mu, N: d.N, H: d.H, FSmin: d.FSmin } });
  }
  E('detalhamento', 'Quantitativos', { descricao: 'Volume de concreto da sapata', formula: 'V = A·L', expressao: `V = ${fm(x.sec)}·${fm(L)} = ${fm(x.volume)} m³`, resultado: x.volume, unidade: 'm³', entradas: { area: x.sec, L } });
  if (x.cintas || par?.pilares.length) E('detalhamento', 'Cintas e pilares sobre o eixo', { descricao: 'Cintas (vigas de equilíbrio) e pilares apoiados sobre o eixo entram no cálculo (alavanca e sapata isolada equivalente) e são dimensionados no módulo; esta memória registra o resultado e não o detalhe delas', formula: '—', expressao: `${x.cintas ? 'com cintas' : ''}${par?.pilares.length ? `; pilares: ${par.pilares.join(', ')}` : ''}`, resultado: 'ver módulo', unidade: '', entradas: {} });
  E('detalhamento', 'Situação', { descricao: x.r.status === 'ok' ? 'Sapata corrida atende' : 'Sapata corrida NÃO atende', formula: 'verificações', expressao: x.r.mensagens.join(' ') || 'sem mensagens', resultado: x.r.status === 'ok' ? 'atende' : 'não atende', unidade: '', entradas: {} });
}

// ------------------------------------------------------------------ sapata corrida sob pilares

export interface CtxCorridaPilares {
  c: SapataCorrida; P: FoundationParams; op: OpcoesCalculo; g: { B: number; bw: number; h: number; h0: number; balanco: number; hRig: number };
  lg: ResultadoVigaElastica; pesoPressao: number; netoK: number; ecc: number; ef: EntradaFlexao; tr: FlexaoTransversal; r: ResultadoCorrida;
}

export function registrarCorridaPilares(mem: Registrador, x: CtxCorridaPilares): void {
  const { c, P, op, g, lg } = x;
  const el = elementoCorrida(c.nome);
  if (!mem.aceita(el)) return;
  const E = (etapa: Etapa, topico: string, q: Chave) => mem.passo({ etapa, elemento: el, topico, ...q });
  let t = 'Sapata corrida sob pilares (viga sobre base elástica)';
  E('analise', t, { descricao: `Dimensões adotadas na análise global: B = ${fm(g.B)} m${c.B === undefined ? ' (opção "largura padrão")' : ''}, h = ${fm(g.h)} m, h0 = ${fm(g.h0)} m; molas de Winkler k·B por comprimento`, formula: 'k_mola = k·B·ℓ', expressao: `B = ${fm(g.B)} m; bw = ${fm(g.bw)} m; h = ${fm(g.h)} m; h0 = ${fm(g.h0)} m; k = ${fm(lg.k)} kN/m³`, resultado: g.B, unidade: 'm', norma: `${NBR6118}, 22.6; modelo de Winkler (a confirmar)`, aConfirmar: true, entradas: { B: g.B, bw: g.bw, h: g.h, h0: g.h0, k: lg.k } });
  E('esforcos', t, { descricao: `Pressão máxima sob a base na análise global (combinação rara ${lg.combMax}) e mínima (${lg.combMin})`, formula: 'σmáx, σmín (kPa)', expressao: `σmáx = ${fm(lg.sigmaMax)} kPa; σmín = ${fm(lg.sigmaMin)} kPa${lg.sigmaAdm !== null ? `; σadm = ${fm(lg.sigmaAdm)} kPa` : ''}`, resultado: lg.sigmaMax, unidade: 'kPa', norma: NBR6122, entradas: { sigmaMax: lg.sigmaMax, sigmaMin: lg.sigmaMin, sigmaAdm: lg.sigmaAdm ?? 0 } });
  E('dimensionamento', t, { descricao: 'Peso próprio da sapata como pressão e pressão líquida para a flexão da aba', formula: 'pp = 25·A/B; neto = máx(0; σmáx − pp)', expressao: `pp = ${fm(x.pesoPressao)} kPa; neto = máx(0; ${fm(lg.sigmaMax)} − ${fm(x.pesoPressao)}) = ${fm(x.netoK)} kPa`, resultado: x.netoK, unidade: 'kPa', norma: NBR6122, aConfirmar: true, entradas: { sigmaMax: lg.sigmaMax, pesoPressao: x.pesoPressao } });
  E('esforcos', t, { descricao: 'Carga de cálculo por metro da faixa transversal', formula: 'Nd = γf·neto·B', expressao: `Nd = ${fm(P.gammaF)}·${fm(x.netoK)}·${fm(g.B)} = ${fm(x.ef.Nd)} kN/m`, resultado: x.ef.Nd, unidade: 'kN/m', norma: `${NBR6118}, 11.7`, aConfirmar: true, entradas: { gammaF: P.gammaF, neto: x.netoK, B: g.B } });
  registrarFlexaoTransversal(mem, el, x.ef, P, op, x.tr);
  E('detalhamento', 'Longitudinal e quantitativos', { descricao: 'Esforços longitudinais da viga sobre base elástica (envoltória ELU) e quantitativo (os diagramas e a armadura estão no módulo de base elástica)', formula: 'Md,inf; Md,sup; Vd', expressao: `Md,inf = ${fm(lg.Md.inf)} kN·m; Md,sup = ${fm(lg.Md.sup)} kN·m; Vd = ${fm(lg.Vd)} kN; recalque = ${fm(lg.recalque * 1000)} mm; V = ${fm(lg.volume)} m³`, resultado: lg.Vd, unidade: 'kN', entradas: { MdInf: lg.Md.inf, MdSup: lg.Md.sup, Vd: lg.Vd, recalque: lg.recalque, volume: lg.volume } });
}
