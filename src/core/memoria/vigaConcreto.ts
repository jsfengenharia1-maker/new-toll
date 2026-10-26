// Memória detalhada (MD fase 1): cadeia da viga de concreto armado do módulo Edifícios. Chamada por `dimensionarVigas`
// só com a memória ligada, com os mesmos números usados no cálculo (os que já existem e os recalculados aqui pelas
// mesmas funções, que são determinísticas: beamFlexure, beamAsMin, crackWidth, bransonRatio).
import { ES, barArea, beamFlexure, blockForce, bransonRatio, crackWidth, grossProps, type BarChoice, type BeamSection, type Concrete } from '../concrete';
import type { ComposicaoEtapas, FlechasInstantaneas } from '../building/flechas';
import { cm2, fm, fp, type Registrador } from './registrador';

/** Composição de um esforço de cálculo numa estação: Σ γ·Sk por caso + parcela da redistribuição. */
export interface ComposicaoEsforco {
  combinacao: string; s: number;
  /** [caso, fator, valor característico] na ordem da soma do cálculo. */
  parcelas: [string, number, number][];
  /** Valor combinado (Σ γ·Sk) usado pelo cálculo (pode diferir da soma quando houve arredondamento no apoio). */
  combinado: number;
  /** Acréscimo linear da redistribuição: dA·(1 − t) + dZ·t (momento) ou −(dZ − dA)/ℓ (cortante). */
  dA: number; dZ: number; t: number; L: number;
  total: number;
  /** Estação dentro do apoio recalculado a partir das faces (redistribuição nas faces): dA traz o acréscimo inteiro. */
  apoio?: boolean;
}

export interface EstacaoTorcao { vao: number; s: number; combinacao: string; V: number; T: number; aV: number; aT: number; asw: number }
export interface TorcaoMemoria { c1: number; he: number; Ae: number; ue: number; TRd2: number; estacoes: EstacaoTorcao[]; governante: number; totalEstacoes: number }
export interface CtxMemoriaViga {
  elemento: string;
  b: number; h: number;
  c: Concrete; fyk: number; fydPos: number; fydNeg: number; fywk: number; fywd: number; gs: number;
  cob: { inf: number; sup: number; lat: number }; dI: number; dS: number; d2I: number; d2S: number; d: number;
  sec: BeamSection; fcPos: boolean; fcNeg: boolean; taxaMin: number;
  /** Redistribuição nas faces dos pilares (N4c): muda o texto dos passos. */
  redistFaces?: boolean;
  Mpos: number; Mneg: number; V: number; delta: number; redistribuicao: number; deltaMin: number; deltaX: number;
  det: { Mmax: string; Mmin: string; V: string; T: string };
  comp: { Mpos?: ComposicaoEsforco; Mneg?: ComposicaoEsforco; V?: ComposicaoEsforco };
  env: { asw: number; T: number; biela: number; Asl: number };
  /** Torção (MD9): seção vazada equivalente e Asw/s por estação (máximo entre as combinações), com a estação determinante. */
  torcao?: TorcaoMemoria;
  AsNec: [number, number]; AsInf: number; AsSup: number; bi: BarChoice | null; bs: BarChoice | null; bloq: boolean;
  VRd2: number; Vc0: number; aswMin: number; aswS: number; smax: number; est: { phi: number; s: number; legs: number } | null; al: number;
  MkPos: number; MkNeg: number; wk: [number, number]; wkLim: number; caa: 1 | 2 | 3 | 4;
  flecha: {
    metodo: 'fator' | 'etapas'; L: number; balanco: boolean; dG: number; dQ: number; dQqp: number; af: number; rho: number; afR: number;
    total: number; limite: number; limiteTxt: string; flechaQ: number; limiteQ: number; limiteQTxt: string; AsMont: number; homogeneizada: boolean;
    inst: FlechasInstantaneas; comp: ComposicaoEtapas; qInst: 'total' | 'qp';
    /** Vão que governa a flecha ativa (pode não ser o da total): composição própria, limite e opção de truncamento. */
    ativa?: { L: number; balanco: boolean; valor: number; limite: number; limiteTxt: string; comp: ComposicaoEtapas; truncada: boolean };
  } | null;
}

const NBR = 'NBR 6118:2023';

/** Registra a cadeia completa de uma viga (esforços, flexão, cortante, fissuração e flecha). */
export function registrarViga(mem: Registrador, x: CtxMemoriaViga) {
  const el = x.elemento;
  if (!mem.aceita(el)) return;
  const c = x.c, gc = c.fck / c.fcd;
  const P = (etapa: 'esforcos' | 'dimensionamento' | 'detalhamento', topico: string, p: Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>) => mem.passo({ etapa, elemento: el, topico, ...p });

  // ---- materiais e geometria
  const tm = 'Materiais e geometria';
  P('dimensionamento', tm, { descricao: 'Resistência de cálculo do concreto', formula: 'fcd = fck / γc', expressao: `fcd = ${fm(c.fck)} / ${fm(gc)} = ${fm(c.fcd)}`, resultado: c.fcd, unidade: 'MPa', norma: `${NBR}, 12.3.3`, entradas: { fck: c.fck, gc } });
  P('dimensionamento', tm, { descricao: 'Tensão do bloco retangular', formula: 'σcd = αc·ηc·fcd (αc = 0,85 para fck ≤ 50; ηc = (40/fck)^(1/3) para fck > 40)', expressao: `σcd = ${fm(c.sigmaCd / c.fcd)}·${fm(c.fcd)} = ${fm(c.sigmaCd)}`, resultado: c.sigmaCd, unidade: 'MPa', norma: `${NBR}, 17.2.2 e 8.2.10.1`, aConfirmar: c.fck > 40, entradas: { fcd: c.fcd, fator: c.sigmaCd / c.fcd } });
  P('dimensionamento', tm, { descricao: 'Resistência média à tração', formula: c.fck > 50 ? 'fct,m = 2,12·ln(1 + 0,11·fck)' : 'fct,m = 0,3·fck^(2/3)', expressao: `fct,m = ${fm(c.fctm)}`, resultado: c.fctm, unidade: 'MPa', norma: `${NBR}, 8.2.5`, entradas: { fck: c.fck } });
  P('dimensionamento', tm, { descricao: 'Resistência de cálculo à tração', formula: 'fctd = 0,7·fct,m / γc', expressao: `fctd = 0,7·${fm(c.fctm)} / ${fm(gc)} = ${fm(c.fctd)}`, resultado: c.fctd, unidade: 'MPa', norma: `${NBR}, 8.2.5 e 12.3.3`, entradas: { fctm: c.fctm, gc } });
  P('dimensionamento', tm, { descricao: 'Resistência de cálculo do aço longitudinal (positiva)', formula: 'fyd = fyk / γs', expressao: `fyd = ${fm(x.fyk)} / ${fm(x.gs)} = ${fm(x.fydPos)}`, resultado: x.fydPos, unidade: 'MPa', norma: `${NBR}, 12.3.3`, entradas: { fyk: x.fyk, gs: x.gs } });
  P('dimensionamento', tm, { descricao: 'Resistência de cálculo dos estribos', formula: 'fywd = mín(fywk / γs; 435 MPa)', expressao: `fywd = mín(${fm(x.fywk)} / ${fm(x.gs)}; 435) = ${fm(x.fywd)}`, resultado: x.fywd, unidade: 'MPa', norma: `${NBR}, 17.4.2.2`, entradas: { fywk: x.fywk, gs: x.gs } });
  P('dimensionamento', tm, { descricao: 'Altura útil da armadura inferior (estribo φ5, barra φ16 de referência)', formula: 'd = h − c_inf − φt − φℓ/2', expressao: `d = ${fm(x.h)} − ${fm(x.cob.inf)} − 0,005 − 0,008 = ${fm(x.dI)}`, resultado: x.dI, unidade: 'm', norma: `${NBR}, 7.4.7.6`, entradas: { h: x.h, cinf: x.cob.inf } });
  P('dimensionamento', tm, { descricao: 'Altura útil da armadura superior', formula: 'd = h − c_sup − φt − φℓ/2', expressao: `d = ${fm(x.h)} − ${fm(x.cob.sup)} − 0,005 − 0,008 = ${fm(x.dS)}`, resultado: x.dS, unidade: 'm', norma: `${NBR}, 7.4.7.6`, entradas: { h: x.h, csup: x.cob.sup } });

  // ---- esforços de cálculo (envoltória)
  const regComp = (rot: string, cp: ComposicaoEsforco | undefined, valor: number, un: string, momento: boolean) => {
    if (!cp) {
      P('esforcos', 'Envoltória ELU', { descricao: `${rot}: valor da envoltória`, formula: momento ? 'Md = máx{Σ γ·Mk; M mínimo das opções; M na face com arredondamento}' : 'Vd = máx |Σ γ·Vk|', expressao: `${rot} = ${fm(valor)}`, resultado: valor, unidade: un, norma: 'NBR 8681:2003, 5.1.3', entradas: {}, observacao: 'O extremo vem do momento mínimo ou da face do apoio (opções), não de uma estação da combinação.' });
      return;
    }
    const soma = cp.parcelas.map(([n, f, v]) => `${fm(f)}·${fp(v)} [${n}]`).join(' + ') || '0';
    const ent: Record<string, number | string> = { combinacao: cp.combinacao, s: cp.s };
    cp.parcelas.forEach(([n, f, v]) => { ent[`γ_${n}`] = f; ent[`${momento ? 'M' : 'V'}k_${n}`] = v; });
    P('esforcos', 'Envoltória ELU', { descricao: `${rot}: combinação determinante ${cp.combinacao} na abscissa s = ${fm(cp.s, 3)} m`, formula: momento ? 'Md = Σ γi·Mk,i' : 'Vd = Σ γi·Vk,i', expressao: `${momento ? 'Md' : 'Vd'} = ${soma} = ${fm(cp.combinado)}`, resultado: cp.combinado, unidade: un, norma: 'NBR 8681:2003, 5.1.3; NBR 6118:2023, 11.8.2', entradas: ent, ...(Math.abs(cp.combinado - cp.parcelas.reduce((t, [, f, v]) => t + f * v, 0)) > 1e-9 * Math.max(1, Math.abs(cp.combinado)) ? { observacao: 'Valor do diagrama arredondado no apoio (opção): difere da soma das parcelas.' } : {}) });
    if (cp.dA || cp.dZ) {
      const faces = !!x.redistFaces;
      const desc = cp.apoio ? `${rot}: acréscimo da redistribuição δ = ${fm(x.delta, 3)} dentro do apoio, refeito a partir das faces redistribuídas (cúbica do arredondamento)`
        : `${rot}: acréscimo da redistribuição δ = ${fm(x.delta, 3)} nos apoios internos (linear ${faces ? 'entre as faces dos pilares' : 'entre os apoios'})`;
      const formula = !momento ? 'Vd,red = |Vd − (ΔMB − ΔMA)/ℓ|'
        : cp.apoio ? 'Md,red = Md + ΔM_apoio, ΔM_apoio = cúbica(M,V das faces redistribuídas) − cúbica(M,V das faces)'
        : faces ? 'Md,red = Md + ΔMA·(1 − t) + ΔMB·t, t = (x − x_face)/ℓ_livre, ΔM = (1 − δ)·|M,face|' : 'Md,red = Md + ΔMA·(1 − x/ℓ) + ΔMB·x/ℓ, ΔM = (1 − δ)·|M,apoio|';
      P('esforcos', 'Envoltória ELU', { descricao: desc, formula, expressao: momento ? (cp.apoio ? `Md = ${fm(cp.combinado)} + ${fm(cp.dA)} = ${fm(cp.total)}` : `Md = ${fm(cp.combinado)} + ${fm(cp.dA)}·(1 − ${fm(cp.t)}) + ${fm(cp.dZ)}·${fm(cp.t)} = ${fm(cp.total)}`) : `Vd = |${fm(cp.combinado)} − (${fm(cp.dZ)} − ${fm(cp.dA)})/${fm(cp.L)}| = ${fm(cp.total)}`, resultado: cp.total, unidade: un, norma: `${NBR}, 14.6.4.3`, entradas: { Md: cp.combinado, dA: cp.dA, dZ: cp.dZ, t: cp.t, L: cp.L, delta: x.delta } });
    }
  };
  regComp('Momento positivo máximo', x.comp.Mpos, x.Mpos, 'kN·m', true);
  if (x.Mneg < 0) regComp('Momento negativo máximo', x.comp.Mneg, x.Mneg, 'kN·m', true);
  regComp('Cortante máximo (seções a partir da face do apoio)', x.comp.V, x.V, 'kN', false);
  if (x.redistribuicao > 0) P('esforcos', 'Envoltória ELU', { descricao: 'Coeficiente de redistribuição nos apoios internos', formula: 'δ ≥ máx(1 − r/100; δmín), δ ≥ 0,44 + 1,25·x/d (fck ≤ 50)', expressao: `δ = ${fm(x.delta, 3)} (pedido ${fm(1 - x.redistribuicao / 100, 3)}; δmín = ${fm(x.deltaMin)}; ${fm(x.deltaX)} + 1,25·x/d)`, resultado: x.delta, unidade: '', norma: `${NBR}, 14.6.4.3`, entradas: { redistribuicao: x.redistribuicao, deltaMin: x.deltaMin, deltaX: x.deltaX } });

  // ---- flexão
  flexao(mem, el, 'Flexão – armadura inferior', x, x.Mpos, x.dI, x.d2I, x.fydPos, x.fcPos, x.AsNec[0], true);
  if (x.Mneg < 0) flexao(mem, el, 'Flexão – armadura superior', x, -x.Mneg, x.dS, x.d2S, x.fydNeg, x.fcNeg, x.AsNec[1], false);
  const Ac = grossProps(x.sec).A;
  P('dimensionamento', 'Flexão – armadura máxima', { descricao: 'Armadura longitudinal máxima (tração + compressão)', formula: 'As,máx = 4 %·Ac', expressao: `As,máx = 0,04·${fm(Ac)} = ${cm2(0.04 * Ac)}; As,inf + As,sup = ${cm2(x.AsInf + x.AsSup)}`, resultado: 0.04 * Ac, unidade: 'm²', norma: `${NBR}, 17.3.5.2.4`, entradas: { Ac } });
  const barras = (rot: string, As: number, bb: BarChoice | null) => {
    if (!bb) return;
    P('detalhamento', rot, { descricao: `Barras adotadas${x.bloq ? ' (armadura bloqueada)' : ''}`, formula: 'As,ef = n·π·φ²/4 ≥ As', expressao: `As,ef = ${bb.n}·π·(${fm(bb.phi / 1000)})²/4 = ${cm2(bb.As)} ≥ ${cm2(As)}`, resultado: bb.As, unidade: 'm²', norma: `${NBR}, 18.3.2`, entradas: { n: bb.n, phi: bb.phi, As, camadas: bb.layers } });
  };
  barras('Flexão – armadura inferior', x.AsInf, x.bi);
  if (x.AsSup > 0) barras('Flexão – armadura superior', x.AsSup, x.bs);

  // ---- cortante (modelo I)
  const tc = 'Cortante (modelo de cálculo I, θ = 45°)', bw = x.b, d = x.d;
  P('dimensionamento', tc, { descricao: 'Coeficiente de efetividade do concreto', formula: 'αv2 = 1 − fck/250', expressao: `αv2 = 1 − ${fm(c.fck)}/250 = ${fm(c.av2)}`, resultado: c.av2, unidade: '', norma: `${NBR}, 17.4.2.2`, entradas: { fck: c.fck } });
  P('dimensionamento', tc, { descricao: 'Resistência da biela comprimida', formula: 'VRd2 = 0,27·αv2·fcd·bw·d', expressao: `VRd2 = 0,27·${fm(c.av2)}·${fm(c.fcd)}·${fm(bw)}·${fm(d)}·1000 = ${fm(x.VRd2)}`, resultado: x.VRd2, unidade: 'kN', norma: `${NBR}, 17.4.2.2`, entradas: { av2: c.av2, fcd: c.fcd, bw, d } });
  P('dimensionamento', tc, { descricao: 'Verificação da biela', formula: 'VSd ≤ VRd2', expressao: `${fm(x.V)} ${x.V <= x.VRd2 ? '≤' : '>'} ${fm(x.VRd2)}${x.env.T > 0 ? ` (com torção: VSd/VRd2 + TSd/TRd2 = ${fm(x.env.biela)})` : ''}`, resultado: x.env.T > 0 ? x.env.biela : x.V / x.VRd2, unidade: '', norma: `${NBR}, 17.4.2.2${x.env.T > 0 ? ' e 17.7.2.2' : ''}`, entradas: { VSd: x.V, VRd2: x.VRd2 } });
  P('dimensionamento', tc, { descricao: 'Parcela do concreto (flexão simples)', formula: 'Vc = Vc0 = 0,6·fctd·bw·d', expressao: `Vc = 0,6·${fm(c.fctd)}·${fm(bw)}·${fm(d)}·1000 = ${fm(x.Vc0)}`, resultado: x.Vc0, unidade: 'kN', norma: `${NBR}, 17.4.2.2 b`, entradas: { fctd: c.fctd, bw, d } });
  const aswV = Math.max(0, x.V - x.Vc0) / 1000 / (0.9 * d * x.fywd);
  P('dimensionamento', tc, { descricao: x.env.T > 0 ? 'Armadura transversal (cortante + 2·A90/s da torção, máximo por estação)' : 'Armadura transversal do cortante', formula: x.env.T > 0 ? 'Asw/s = (VSd − Vc)/(0,9·d·fywd) + 2·Td/(2·Ae·fywd)' : 'Asw/s = (VSd − Vc)/(0,9·d·fywd)', expressao: x.env.T > 0 ? `Asw/s = ${fm(x.env.asw * 1e4)} cm²/m` : `Asw/s = (${fm(x.V)} − ${fm(x.Vc0)})/1000/(0,9·${fm(d)}·${fm(x.fywd)}) = ${fm(aswV * 1e4)} cm²/m`, resultado: x.env.T > 0 ? x.env.asw : aswV, unidade: 'm²/m', norma: `${NBR}, 17.4.2.2${x.env.T > 0 ? ' e 17.5.1.6' : ''}`, entradas: { VSd: x.V, Vc: x.Vc0, d, fywd: x.fywd } });
  if (x.torcao && x.env.T > 0) passosTorcao(P, x, x.torcao);
  P('dimensionamento', tc, { descricao: 'Armadura transversal mínima', formula: 'Asw,mín/s = 0,2·(fct,m/fywk)·bw', expressao: `Asw,mín/s = 0,2·(${fm(c.fctm)}/${fm(x.fywk)})·${fm(bw)} = ${fm(x.aswMin * 1e4)} cm²/m`, resultado: x.aswMin, unidade: 'm²/m', norma: `${NBR}, 17.4.1.1.1`, entradas: { fctm: c.fctm, fywk: x.fywk, bw } });
  P('dimensionamento', tc, { descricao: 'Armadura transversal de cálculo', formula: 'Asw/s = máx(Asw/s; Asw,mín/s)', expressao: `Asw/s = máx(${fm(x.env.asw * 1e4)}; ${fm(x.aswMin * 1e4)}) = ${fm(x.aswS * 1e4)} cm²/m`, resultado: x.aswS, unidade: 'm²/m', norma: `${NBR}, 17.4.1.1.1`, entradas: { asw: x.env.asw, aswMin: x.aswMin } });
  P('dimensionamento', tc, { descricao: 'Espaçamento máximo dos estribos', formula: 'VSd ≤ 0,67·VRd2 → smáx = mín(0,6·d; 30 cm); senão smáx = mín(0,3·d; 20 cm)', expressao: `VSd/VRd2 = ${fm(x.V / x.VRd2)} → smáx = ${fm(x.smax)}`, resultado: x.smax, unidade: 'm', norma: `${NBR}, 18.3.3.2`, entradas: { VSd: x.V, VRd2: x.VRd2, d } });
  if (x.est) {
    const ef = (x.est.legs * barArea(x.est.phi)) / x.est.s;
    P('detalhamento', tc, { descricao: `Estribo adotado${x.bloq ? ' (bloqueado)' : ''}: φ${fm(x.est.phi)} c/${fm(x.est.s * 100, 3)} cm, ${x.est.legs} ramos`, formula: 'Asw,ef/s = n·π·φt²/4 / s ≥ Asw/s; s ≤ smáx', expressao: `Asw,ef/s = ${x.est.legs}·π·(${fm(x.est.phi / 1000)})²/4 / ${fm(x.est.s)} = ${fm(ef * 1e4)} cm²/m ${ef >= x.aswS - 1e-12 ? '≥' : '<'} ${fm(x.aswS * 1e4)}`, resultado: ef, unidade: 'm²/m', norma: `${NBR}, 18.3.3.2`, entradas: { legs: x.est.legs, phi: x.est.phi, s: x.est.s } });
  }
  P('detalhamento', tc, { descricao: 'Decalagem do diagrama de força no banzo tracionado', formula: 'aℓ = d·VSd,máx / [2·(VSd,máx − Vc)], 0,5·d ≤ aℓ ≤ d', expressao: x.V > x.Vc0 ? `aℓ = ${fm(d)}·${fm(x.V)}/[2·(${fm(x.V)} − ${fm(x.Vc0)})] → ${fm(x.al)}` : `VSd ≤ Vc → aℓ = d = ${fm(x.al)}`, resultado: x.al, unidade: 'm', norma: `${NBR}, 17.4.2.2 c`, entradas: { d, VSd: x.V, Vc: x.Vc0 } });

  // ---- fissuração (combinação frequente)
  const fiss = (rot: string, Mk: number, bb: BarChoice | null, dd: number, fc: boolean, wk: number) => {
    if (!bb || !Mk) return;
    passosFissuracao(mem, el, `Fissuração – ${rot}`, { sec: x.sec, fc, As: bb.As, phi: bb.phi, d: dd, Mk, c, caa: x.caa, h: x.h, b: x.b, wkLim: x.wkLim, wk });
  };
  fiss('face inferior', x.MkPos, x.bi, x.dI, x.fcPos, x.wk[0]);
  if (x.AsSup > 0) fiss('face superior', -x.MkNeg, x.bs, x.dS, x.fcNeg, x.wk[1]);

  // ---- flecha
  const f = x.flecha;
  if (f) {
    const tf = 'Flecha (ELS-DEF)';
    const br = bransonRatio(x.sec, x.fcPos, x.AsInf, x.dI, 0, c);
    P('dimensionamento', tf, { descricao: 'Módulo secante do concreto', formula: 'Ecs = αi·Eci, αi = 0,8 + 0,2·fck/80 ≤ 1', expressao: `Ecs = ${fm(c.Ecs)}`, resultado: c.Ecs, unidade: 'MPa', norma: `${NBR}, 8.2.8`, entradas: { Eci: c.Eci, fck: c.fck } });
    P('dimensionamento', tf, { descricao: 'Momento de fissuração (armadura inferior)', formula: 'Mr = α·fct,m·Ic/yt (α = 1,5 retangular; 1,2 T)', expressao: `Mr = ${fm(br.Mr)}`, resultado: br.Mr, unidade: 'kN·m', norma: `${NBR}, 17.3.1`, entradas: { fctm: c.fctm, Ic: br.Ic } });
    P('dimensionamento', tf, { descricao: 'Inércia no estádio II puro (αe = Es/Ecs)', formula: 'III = b·x³/3 + αe·As·(d − x)²', expressao: `III = ${fm(br.III)}`, resultado: br.III, unidade: 'm⁴', norma: `${NBR}, 17.3.2.1.1`, entradas: { As: x.AsInf, d: x.dI, ae: ES / c.Ecs } });
    P('dimensionamento', tf, { descricao: `Flechas imediatas do vão ${f.balanco ? 'em balanço' : 'apoiado'} (ℓ = ${fm(f.L, 3)} m): integração da curvatura M/(Ecs·Ie) com Ie de Branson em cada seção`, formula: 'Ie = (Mr/Ma)³·Ic + [1 − (Mr/Ma)³]·III ≤ Ic; f = ∫ M·m̄/(Ecs·Ie) dx', expressao: `f(G) = ${fm(f.dG * 1000)} mm; f(Q) = ${fm(f.dQ * 1000)} mm; f(ψ2·Q) = ${fm(f.dQqp * 1000)} mm`, resultado: f.dG + f.dQqp, unidade: 'm', norma: `${NBR}, 17.3.2.1.1`, entradas: { dG: f.dG, dQ: f.dQ, dQqp: f.dQqp, homogeneizada: f.homogeneizada ? 1 : 0 }, observacao: 'Integração numérica (estações a cada 0,10 m) com os esforços do pórtico na combinação quase permanente.' });
    P('dimensionamento', tf, { descricao: 'Coeficiente de fluência', formula: 'αf = Δξ/(1 + 50·ρ′), Δξ = ξ(∞) − ξ(t0)', expressao: `αf = ${fm(f.af)}/(1 + 50·${fm(f.rho)}) = ${fm(f.afR)}`, resultado: f.afR, unidade: '', norma: `${NBR}, 17.3.2.1.2`, entradas: { dxi: f.af, rho: f.rho } });
    if (f.metodo === 'fator') P('dimensionamento', tf, { descricao: 'Flecha total (quase permanente com fluência)', formula: 'f∞ = (fG + fψ2Q)·(1 + αf) ≤ limite', expressao: `f∞ = (${fm(f.dG * 1000)} + ${fm(f.dQqp * 1000)})·(1 + ${fm(f.afR)}) = ${fm(f.total * 1000)} mm ${f.total <= f.limite ? '≤' : '>'} ${f.limiteTxt} = ${fm(f.limite * 1000)} mm`, resultado: f.total, unidade: 'm', norma: `${NBR}, 13.3 (Tabela 13.3) e 17.3.2.1.2`, entradas: { dG: f.dG, dQqp: f.dQqp, afR: f.afR, limite: f.limite } });
    else passosEtapasFlecha(mem, el, tf, f);
    if (f.ativa) passosFlechaAtiva(mem, el, tf, f.ativa, f.rho);
    P('dimensionamento', tf, { descricao: 'Flecha das cargas variáveis', formula: 'fQ ≤ limite', expressao: `fQ = ${fm(f.flechaQ * 1000)} mm ${f.flechaQ <= f.limiteQ ? '≤' : '>'} ${f.limiteQTxt} = ${fm(f.limiteQ * 1000)} mm`, resultado: f.flechaQ, unidade: 'm', norma: `${NBR}, 13.3 (Tabela 13.3)`, entradas: { limiteQ: f.limiteQ } });
  }
}

/** Flexão simples (17.2): linha neutra, domínio, As, As,mín e As de cálculo. */
export function flexao(mem: Registrador, el: string, topico: string, x: Pick<CtxMemoriaViga, 'c' | 'sec' | 'taxaMin' | 'b' | 'h'>, Md: number, d: number, d2: number, fyd: number, fc: boolean, AsCalc: number, inferior: boolean, opt: { un?: string; semMinimo?: boolean } = {}) {
  const c = x.c, sec = x.sec, P = (p: Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>) => mem.passo({ etapa: 'dimensionamento', elemento: el, topico, ...p });
  const r = beamFlexure(sec, fc, Md, d, d2, c, fyd);
  const tee = sec.kind === 'tee' && fc && !!sec.bf && !!sec.hf;
  const wComp = tee ? sec.bf! : sec.bw;
  const norma = `${NBR}, 17.2.2`;
  P({ descricao: `Momento de cálculo (${inferior ? 'tração embaixo' : 'tração em cima'})`, formula: 'Md', expressao: `Md = ${fm(Md)}`, resultado: Md, unidade: opt.un ?? 'kN·m', norma: `${NBR}, 17.2`, entradas: {} });
  const xlim = c.xLimRatio * d;
  P({ descricao: 'Limite da linha neutra para a ductilidade', formula: c.fck > 50 ? 'x,lim = 0,35·d' : 'x,lim = 0,45·d', expressao: `x,lim = ${fm(c.xLimRatio)}·${fm(d)} = ${fm(xlim)}`, resultado: xlim, unidade: 'm', norma: `${NBR}, 14.6.4.3`, entradas: { d, razao: c.xLimRatio } });
  if (r.Md === 0 && Md <= 1e-9) return;
  const f = blockForce(sec, fc, r.x, c);
  P({ descricao: `Linha neutra (bloco retangular λx${tee ? ', seção T com mesa comprimida' : ''}; equilíbrio por bisseção)`, formula: tee ? 'Md = C·(d − z), C = σcd·[(bf − bw)·hf + bw·λx]' : 'Md = σcd·b·λx·(d − λx/2)', expressao: `${fm(Md)}/1000 = ${fm(c.sigmaCd)}·${fm(wComp)}·${fm(c.lambda)}·x·(${fm(d)} − ${fm(c.lambda)}·x/2) → x = ${fm(r.x)}`, resultado: r.x, unidade: 'm', norma, entradas: { Md, sigmaCd: c.sigmaCd, b: wComp, lambda: c.lambda, d, ...(tee ? { bf: sec.bf!, bw: sec.bw, hf: sec.hf! } : {}) } });
  const x23 = c.ecu / (c.ecu + 0.01), x34 = c.ecu / (c.ecu + fyd / ES);
  const dom = r.double ? 'x = x,lim (armadura dupla)' : r.xd <= x23 ? 'Domínio 2' : r.xd <= x34 ? 'Domínio 3' : 'Domínio 4';
  P({ descricao: 'Posição relativa da linha neutra e domínio de deformação', formula: 'x/d; limites 2–3: εcu/(εcu + 10‰); 3–4: εcu/(εcu + εyd)', expressao: `x/d = ${fm(r.x)}/${fm(d)} = ${fm(r.xd)} (2–3: ${fm(x23)}; 3–4: ${fm(x34)}) → ${dom}`, resultado: r.xd, unidade: '', norma: `${NBR}, 17.2.2`, entradas: { x: r.x, d, ecu: c.ecu, eyd: fyd / ES } });
  P({ descricao: 'Resultante de compressão no concreto', formula: tee ? 'C = σcd·[(bf − bw)·hf + bw·λx]' : 'C = σcd·b·λx', expressao: `C = ${fm(f.C * 1000)} kN`, resultado: f.C, unidade: 'MN', norma, entradas: { sigmaCd: c.sigmaCd, b: wComp, lambda: c.lambda, x: r.x } });
  if (!r.double) P({ descricao: 'Armadura de tração', formula: 'As = C/fyd', expressao: `As = ${fm(f.C)}/${fm(fyd)} = ${cm2(r.As)}`, resultado: r.As, unidade: 'm²', norma, entradas: { C: f.C, fyd } });
  else {
    const Mlim = f.C * (d - f.z), dM = Md / 1000 - Mlim;
    P({ descricao: 'Armadura dupla: momento resistido com x = x,lim', formula: 'Mlim = C·(d − z)', expressao: `Mlim = ${fm(Mlim * 1000)} kN·m; ΔM = ${fm(dM * 1000)} kN·m`, resultado: Mlim, unidade: 'MN·m', norma, entradas: { C: f.C, d, z: f.z } });
    P({ descricao: 'Armadura dupla: tração', formula: 'As = C/fyd + ΔM/[fyd·(d − d′)]', expressao: `As = ${fm(f.C)}/${fm(fyd)} + ${fm(dM)}/[${fm(fyd)}·(${fm(d)} − ${fm(d2)})] = ${cm2(r.As)}`, resultado: r.As, unidade: 'm²', norma, entradas: { C: f.C, fyd, dM, d, d2 } });
    P({ descricao: 'Armadura dupla: compressão', formula: "As′ = ΔM/[σs′·(d − d′)], σs′ = mín(Es·εcu·(x − d′)/x; fyd)", expressao: `As′ = ${cm2(r.As2)}`, resultado: r.As2, unidade: 'm²', norma, entradas: { dM, d, d2, x: r.x } });
  }
  if (opt.semMinimo) return;
  if (x.taxaMin > 0) {
    const m = (x.taxaMin / 100) * x.b * x.h;
    P({ descricao: 'Armadura mínima pela taxa das opções', formula: 'As,mín = ρmín·b·h', expressao: `As,mín = ${fm(x.taxaMin / 100)}·${fm(x.b)}·${fm(x.h)} = ${cm2(m)}`, resultado: m, unidade: 'm²', norma: `${NBR}, 17.3.5.2.1`, entradas: { taxa: x.taxaMin, b: x.b, h: x.h } });
  } else {
    const g = grossProps(sec), yt = fc ? g.ycb : sec.h - g.ycb, W0 = g.I / yt, Mmin = 0.8 * W0 * c.fctkSup;
    const rm = beamFlexure(sec, fc, Mmin * 1000, d, 0.04, c, fyd), m = Math.max(rm.As, 0.0015 * g.A);
    P({ descricao: 'Momento mínimo', formula: 'Md,mín = 0,8·W0·fctk,sup, W0 = Ic/yt, fctk,sup = 1,3·fct,m', expressao: `Md,mín = 0,8·(${fm(g.I)}/${fm(yt)})·${fm(c.fctkSup)} = ${fm(Mmin * 1000)} kN·m`, resultado: Mmin, unidade: 'MN·m', norma: `${NBR}, 17.3.5.2.1`, entradas: { Ic: g.I, yt, fctkSup: c.fctkSup } });
    P({ descricao: 'Armadura mínima', formula: 'As,mín = máx[As(Md,mín); 0,15 %·Ac]', expressao: `As,mín = máx(${cm2(rm.As)}; 0,0015·${fm(g.A)} = ${cm2(0.0015 * g.A)}) = ${cm2(m)}`, resultado: m, unidade: 'm²', norma: `${NBR}, 17.3.5.2.1 (Tabela 17.3)`, entradas: { AsMd: rm.As, Ac: g.A } });
  }
  P({ descricao: 'Armadura de cálculo', formula: 'As,calc = máx(As; As,mín)', expressao: `As,calc = ${cm2(AsCalc)}`, resultado: AsCalc, unidade: 'm²', norma: `${NBR}, 17.3.5.2`, entradas: { As: r.As } });
}


export interface ParamFissuracao { sec: BeamSection; fc: boolean; As: number; phi: number; d: number; Mk: number; c: Concrete; caa: 1 | 2 | 3 | 4; h: number; b: number; wkLim: number; wk: number }
/** Abertura de fissuras (17.3.3.2) passo a passo: estádio II, σs, ρr, w1, w2 e wk. */
export function passosFissuracao(mem: Registrador, el: string, topico: string, p: ParamFissuracao) {
  const { sec, fc, As, phi, d, Mk, c, caa, h, b, wkLim, wk } = p;
  const P = (etapa: 'esforcos' | 'dimensionamento' | 'detalhamento', tp: string, q: Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>) => mem.passo({ etapa, elemento: el, topico: tp, ...q });
    const r = crackWidth(sec, fc, As, phi, d, Mk, c, caa);
    const tf = topico;
    P('dimensionamento', tf, { descricao: 'Momento da combinação frequente', formula: 'Md,ser = Σ Gk + ψ1·Q1k + Σ ψ2·Qjk', expressao: `Md,ser = ${fm(Mk)}`, resultado: Mk, unidade: 'kN·m', norma: `${NBR}, 11.8.3.2`, entradas: {} });
    P('dimensionamento', tf, { descricao: 'Linha neutra no estádio II (αe = 15)', formula: 'b·x²/2 = αe·As·(d − x)', expressao: `x = ${fm(r.x)}`, resultado: r.x, unidade: 'm', norma: `${NBR}, 17.3.3.2`, entradas: { As: As, d: d, ae: 15 } });
    P('dimensionamento', tf, { descricao: 'Tensão na armadura no estádio II', formula: 'σs = αe·M·(d − x)/III', expressao: `σs = ${fm(r.sigmaS)}`, resultado: r.sigmaS, unidade: 'MPa', norma: `${NBR}, 17.3.3.2`, entradas: { M: Mk / 1000, d: d, x: r.x } });
    const hcr = Math.min(h - d + 7.5 * (phi / 1000), h / 2);
    P('dimensionamento', tf, { descricao: 'Taxa na área de envolvimento (Acr = bw·mín(h − d + 7,5φ; h/2))', formula: 'ρr = As/Acr', expressao: `ρr = ${fm(As)}/(${fm(b)}·${fm(hcr)}) = ${fm(r.rhoR)}`, resultado: r.rhoR, unidade: '', norma: `${NBR}, 17.3.3.2`, aConfirmar: true, entradas: { As: As, bw: b, hcr } });
    P('dimensionamento', tf, { descricao: 'Abertura w1', formula: 'w1 = φ/(12,5·η1)·(σs/Es)·(3·σs/fct,m), η1 = 2,25', expressao: `w1 = ${fm(phi)}/(12,5·2,25)·(${fm(r.sigmaS)}/${ES})·(3·${fm(r.sigmaS)}/${fm(c.fctm)}) = ${fm(r.w1)}`, resultado: r.w1, unidade: 'mm', norma: `${NBR}, 17.3.3.2`, entradas: { phi: phi, sigmaS: r.sigmaS, Es: ES, fctm: c.fctm, eta1: 2.25 } });
    P('dimensionamento', tf, { descricao: 'Abertura w2', formula: 'w2 = φ/(12,5·η1)·(σs/Es)·(4/ρr + 45)', expressao: `w2 = ${fm(phi)}/(12,5·2,25)·(${fm(r.sigmaS)}/${ES})·(4/${fm(r.rhoR)} + 45) = ${fm(r.w2)}`, resultado: r.w2, unidade: 'mm', norma: `${NBR}, 17.3.3.2`, entradas: { phi: phi, sigmaS: r.sigmaS, Es: ES, rhoR: r.rhoR, eta1: 2.25 } });
    P('dimensionamento', tf, { descricao: 'Abertura característica', formula: 'wk = mín(w1; w2) ≤ wk,lim', expressao: `wk = mín(${fm(r.w1)}; ${fm(r.w2)}) = ${fm(wk)} ${wk <= wkLim + 1e-9 ? '≤' : '>'} ${fm(wkLim)}`, resultado: wk, unidade: 'mm', norma: `${NBR}, 13.4.2 (Tabela 13.4)`, entradas: { w1: r.w1, w2: r.w2, wkLim: wkLim } });
}


export interface ParamEtapasFlecha { comp: ComposicaoEtapas; inst: FlechasInstantaneas; rho: number; qInst: 'total' | 'qp'; total: number; limite: number; limiteTxt: string }
/** Flecha por etapas de carga (17.3.2.1.2): instantâneas por categoria, fluência por etapa, diferida e total. */
export function passosEtapasFlecha(mem: Registrador, el: string, tf: string, f: ParamEtapasFlecha) {
  const P = (etapa: 'esforcos' | 'dimensionamento' | 'detalhamento', tp: string, q: Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>) => mem.passo({ etapa, elemento: el, topico: tp, ...q });
    const k = f.comp, den = 1 + 50 * Math.max(0, f.rho);
    P('dimensionamento', tf, { descricao: 'Flechas instantâneas por categoria (frações das cargas permanentes do grupo)', formula: 'f = fpp + falv + frev; fQ; fψ2Q', expressao: `fpp = ${fm(f.inst.pp * 1000)} mm; falv = ${fm(f.inst.alvenaria * 1000)} mm; frev = ${fm(f.inst.revestimento * 1000)} mm; fQ = ${fm(f.inst.q * 1000)} mm; fψ2Q = ${fm(f.inst.qqp * 1000)} mm`, resultado: f.inst.pp + f.inst.alvenaria + f.inst.revestimento, unidade: 'm', norma: `${NBR}, 17.3.2.1.1`, entradas: { pp: f.inst.pp, alvenaria: f.inst.alvenaria, revestimento: f.inst.revestimento, q: f.inst.q, qqp: f.inst.qqp } });
    k.porEtapa.forEach((e, i) => P('dimensionamento', tf, { descricao: `Etapa ${i + 1} "${e.nome}" aos ${fm(e.dias)} dias: flecha instantânea da carga aplicada e fluência a partir dessa idade`, formula: 'Δξ = ξ(∞) − ξ(t), ξ(t) = 0,68·0,996^t·t^0,32 (t em meses) ', expressao: `Pi = ${fm(e.carga * 1000)} mm; Δξ = 2 − ξ(${fm(e.dias / 30)}) = ${fm(e.dXi)}`, resultado: e.dXi, unidade: '', norma: `${NBR}, 17.3.2.1.2 (Tabela 17.1)`, entradas: { dias: e.dias, carga: e.carga, dXi: e.dXi } }));
    P('dimensionamento', tf, { descricao: `Flecha instantânea (variável ${f.qInst === 'total' ? 'inteira' : 'quase permanente'})`, formula: 'fi = Σ G das etapas + fQ', expressao: `fi = ${fm(k.instantanea * 1000)} mm`, resultado: k.instantanea, unidade: 'm', norma: `${NBR}, 17.3.2.1.2`, entradas: { G: k.instantanea - (f.qInst === 'total' ? f.inst.q : f.inst.qqp), Q: f.qInst === 'total' ? f.inst.q : f.inst.qqp } });
    const soma = k.porEtapa.reduce((t, e) => t + e.carga * e.dXi, 0);
    P('dimensionamento', tf, { descricao: 'Flecha diferida (cada parcela de longa duração desde a sua idade)', formula: 'fd = Σ Pi·Δξi/(1 + 50·ρ′)', expressao: `fd = ${fm(soma * 1000)}/(1 + 50·${fm(f.rho)}) = ${fm(k.diferida * 1000)} mm`, resultado: k.diferida, unidade: 'm', norma: `${NBR}, 17.3.2.1.2`, entradas: { soma, den, rho: f.rho } });
    P('dimensionamento', tf, { descricao: 'Flecha total por etapas de carga', formula: 'f∞ = fi + fd ≤ limite', expressao: `f∞ = ${fm(k.instantanea * 1000)} + ${fm(k.diferida * 1000)} = ${fm(f.total * 1000)} mm ${f.total <= f.limite ? '≤' : '>'} ${f.limiteTxt} = ${fm(f.limite * 1000)} mm`, resultado: f.total, unidade: 'm', norma: `${NBR}, 13.3 (Tabela 13.3) e 17.3.2.1.2`, entradas: { fi: k.instantanea, fd: k.diferida, limite: f.limite } });
}


/**
 * Flecha ativa (NBR 6118, 13.3, Tabela 13.3: efeito em paredes, ℓ/500 e 10 mm): parcela que ocorre depois da execução das
 * alvenarias (t ≥ tp, primeira etapa com alvenaria). fA = instantânea das cargas aplicadas depois de tp + diferida
 * Σ Pi·[ξ(∞) − ξ(máx(ti, tp))]/(1 + 50ρ′). Etapas, limites e truncamento são opções editáveis; o critério da variável
 * inteira ou quase permanente segue a opção da flecha instantânea [a confirmar].
 */
export function passosFlechaAtiva(mem: Registrador, el: string, tf: string, a: { L: number; balanco: boolean; valor: number; limite: number; limiteTxt: string; comp: ComposicaoEtapas; truncada: boolean }, rho: number) {
  const k = a.comp, den = 1 + 50 * Math.max(0, rho), soma = k.porEtapa.reduce((t, e) => t + e.carga * e.dXiAtiva, 0), dif = soma / den;
  const P = (q: Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>) => mem.passo({ etapa: 'dimensionamento', elemento: el, topico: tf, ...q });
  if (k.tParedes <= 0) { P({ descricao: 'Flecha ativa: sem etapa de alvenaria nas etapas de carga, todas as cargas contam como posteriores à execução das paredes (ativa = total)', formula: 'fA = f∞', expressao: `fA = ${fm(a.valor * 1000)} mm`, resultado: a.valor, unidade: 'm', norma: `${NBR}, 13.3 (Tabela 13.3)`, entradas: { tp: 0 }, observacao: 'a confirmar' }); }
  P({ descricao: `Flecha ativa do vão ℓ = ${fm(a.L, 3)} m${a.balanco ? ' (balanço)' : ''}: instantânea das cargas aplicadas depois das paredes (tp = ${fm(k.tParedes)} dias)`, formula: 'fiA = Σ G (ti ≥ tp) + variável', expressao: `fiA = ${fm(k.instAtiva * 1000)} mm`, resultado: k.instAtiva, unidade: 'm', norma: `${NBR}, 13.3 (Tabela 13.3) e 17.3.2.1.2`, entradas: { tp: k.tParedes, instAtiva: k.instAtiva } });
  P({ descricao: 'Flecha diferida da ativa (fluência contada a partir de máx(ti, tp))', formula: 'fdA = Σ Pi·Δξi,A/(1 + 50·ρ′), Δξi,A = ξ(∞) − ξ(máx(ti, tp))', expressao: `fdA = ${fm(soma * 1000)}/(1 + 50·${fm(rho)}) = ${fm(dif * 1000)} mm`, resultado: dif, unidade: 'm', norma: `${NBR}, 17.3.2.1.2 (Tabela 17.1)`, entradas: { soma, den, rho } });
  P({ descricao: 'Flecha ativa', formula: 'fA = fiA + fdA ≤ limite (ℓ/500 e 10 mm)', expressao: `fA = ${fm(k.instAtiva * 1000)} + ${fm(dif * 1000)}${a.truncada ? ' (fatores truncados a duas casas, a confirmar)' : ''} = ${fm(a.valor * 1000)} mm ${a.valor <= a.limite + 1e-12 ? '≤' : '>'} ${a.limiteTxt} = ${fm(a.limite * 1000)} mm`, resultado: a.valor, unidade: 'm', norma: `${NBR}, 13.3 (Tabela 13.3)`, entradas: { fiA: k.instAtiva, fdA: dif, limite: a.limite, truncada: a.truncada ? 1 : 0 }, observacao: a.truncada ? 'Truncamento de fatores a confirmar (K1.15.4-22).' : undefined });
}

/** Torção da viga: seção vazada equivalente (he, Ae, ue, TRd2) e a decomposição do Asw/s por estação em cortante e torção. */
function passosTorcao(P: (etapa: 'esforcos' | 'dimensionamento' | 'detalhamento', topico: string, p: Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>) => number | string, x: CtxMemoriaViga, t: TorcaoMemoria) {
  const T = 'Torção – Asw/s por estação', c = x.c;
  P('dimensionamento', T, { descricao: 'Seção vazada equivalente: espessura fictícia he = A/u (≥ 2·c1, 17.5.1.4), área Ae e perímetro ue da linha média', formula: 'he = A/u (he ≥ 2·c1 se 2·c1 ≤ mín(b;h)/2); Ae = (b − he)·(h − he); ue = 2·(b − he + h − he)', expressao: `he = ${fm(t.he)} m; Ae = ${fm(t.Ae)} m²; ue = ${fm(t.ue)} m`, resultado: t.Ae, unidade: 'm²', norma: `${NBR}, 17.5.1.4`, entradas: { b: x.b, h: x.h, c1: t.c1, he: t.he, Ae: t.Ae, ue: t.ue } });
  P('dimensionamento', T, { descricao: 'Resistência da biela na torção', formula: 'TRd2 = 0,5·αv2·fcd·Ae·he·sen 2θ (θ = 45°)', expressao: `TRd2 = 0,5·${fm(c.av2)}·${fm(c.fcd)}·${fm(t.Ae)}·${fm(t.he)}·1000 = ${fm(t.TRd2)} kN·m`, resultado: t.TRd2, unidade: 'kN·m', norma: `${NBR}, 17.5.1.5`, entradas: { av2: c.av2, fcd: c.fcd, Ae: t.Ae, he: t.he } });
  const marca = (i: number) => (i === t.governante ? ' — ESTAÇÃO DETERMINANTE' : '');
  t.estacoes.forEach((e, i) => {
    P('dimensionamento', T, { descricao: `Vão ${e.vao + 1}, estação s = ${fm(e.s)} m, combinação ${e.combinacao}: Asw/s = parcela do cortante + 2·A90/s da torção${marca(i)}`, formula: 'Asw/s = máx(0; VSd − Vc)/(0,9·d·fywd) + 2·[Td/(2·Ae·fywd)]', expressao: `Asw/s = máx(0; ${fm(e.V)} − ${fm(x.Vc0)})/1000/(0,9·${fm(x.d)}·${fm(x.fywd)}) + 2·${fm(e.T)}/1000/(2·${fm(t.Ae)}·${fm(x.fywd)}) = ${fm(e.aV * 1e4)} + ${fm(e.aT * 1e4)} = ${fm(e.asw * 1e4)} cm²/m`, resultado: e.asw, unidade: 'm²/m', norma: `${NBR}, 17.4.2.2 e 17.5.1.6`, entradas: { VSd: e.V, Vc: x.Vc0, d: x.d, fywd: x.fywd, Td: e.T, Ae: t.Ae, aV: e.aV, aT: e.aT } });
  });
  const g = t.estacoes[t.governante];
  if (g) P('dimensionamento', T, { descricao: `Asw/s determinante: máximo entre as ${t.totalEstacoes} estações do eixo (${t.estacoes.length} registradas: as de maior Asw/s com torção) (cortante ${fm(g.aV * 1e4)} + torção ${fm(g.aT * 1e4)} cm²/m)`, formula: 'Asw/s = máx por estação', expressao: `Asw/s = ${fm(g.asw * 1e4)} cm²/m (vão ${g.vao + 1}, s = ${fm(g.s)} m, ${g.combinacao})`, resultado: g.asw, unidade: 'm²/m', norma: `${NBR}, 17.5.1.6`, entradas: { asw: g.asw, aswEnv: x.env.asw } });
}
