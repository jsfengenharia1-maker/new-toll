// Memória detalhada (MD fase 5b): viga sobre base elástica (Winkler) e sapata corrida sob pilares, parte longitudinal
// (`dimensionarVigaElastica`, baseElastica.ts). Chamada pelo próprio cálculo só com a memória ligada, depois dele, com as variáveis
// locais do dimensionamento (`CtxVigaElastica`): tensões no solo, envoltória ELU nas pontas das barras (combinação, barra, ponta e a
// contribuição de cada caso), flexão inferior e superior (reaproveita `flexao` das vigas), As,mín, barras, cortante modelo I, pele,
// volume e aço. O radier (casca sobre molas, Wood-Armer) fica para a MD seguinte.
import type { BarChoice, BeamSection, Concrete, ShearResult } from '../concrete';
import { fm, type Registrador, type ValorMemoria } from './registrador';
import { flexao } from './vigaConcreto';

type Chave = Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>;
const NBR = 'NBR 6118:2023';
const WINKLER = 'Winkler; k·b·comprimento de influência (a confirmar)';

export interface CtxVigaElastica {
  el: string; nome: string; corrida: boolean;
  b: number; bw: number; h: number; k: number; L: number; nNos: number; sigmaAdm: number | null;
  c: Concrete; fyd: number; fyk: number; gs: number; cob: number; dd: number;
  secInf: BeamSection; secSup: BeamSection; fcInf: boolean; fcSup: boolean; AsMin: number; AsMinSup: number;
  fi: { As: number; As2: number; double: boolean }; fs: { As: number; As2: number; double: boolean };
  inf: { As: number; barras: BarChoice | null }; sup: { As: number; barras: BarChoice | null };
  sh: ShearResult; pele?: { phi: number; n: number; As: number };
  solo: { max: number; min: number; cMax: string; cMin: string; rec: number };
  Md: { inf: number; sup: number }; Vd: number;
  /** Combinações ELU (fatores por nome de caso), nomes dos casos e esforços por caso e por barra (12 componentes por barra). */
  elu: { nome: string; fatores: Record<string, number> }[]; nomes: string[]; esforcos: ArrayLike<ArrayLike<number>>[];
  barras: { bi: number; L: number }[];
  volume: number; aco: number; status: 'ok' | 'fail'; mensagens: string[];
}

interface Gov { v: number; comb: number; barra: number; ponta: 0 | 6; contrib: [string, number, number][] }

export function registrarVigaElastica(mem: Registrador, x: CtxVigaElastica): void {
  const el = x.el;
  const T0 = 'Base elástica · dados';
  if (!mem.aceita(el) || mem.passos.some((p) => p.elemento === el && p.topico === T0)) return;
  const E = (etapa: 'cargas' | 'esforcos' | 'dimensionamento' | 'detalhamento', topico: string, q: Chave) => mem.passo({ etapa, elemento: el, topico, ...q });
  const { c, fyd } = x;

  // ---------------------------------------------------------------- dados
  E('dimensionamento', T0, { descricao: `${x.corrida ? 'Sapata corrida sob pilares' : 'Viga de fundação'} ${x.nome} sobre base elástica: seção, comprimento e molas verticais (k × largura de contato × comprimento de influência de cada nó)`, formula: 'k_mola = k·b·ℓinfl', expressao: `contato b = ${fm(x.b)} m; alma bw = ${fm(x.bw)} m; h = ${fm(x.h)} m; L = ${fm(x.L)} m; k = ${fm(x.k)} kN/m³; ${x.nNos} nó(s) com mola`, resultado: x.k, unidade: 'kN/m³', norma: WINKLER, aConfirmar: true, entradas: { b: x.b, bw: x.bw, h: x.h, L: x.L, k: x.k, nos: x.nNos } });
  E('dimensionamento', T0, { descricao: 'Resistências de cálculo e cobrimento', formula: 'fcd = fck/γc; fyd = fyk/γs', expressao: `fcd = ${fm(c.fcd)} MPa; fyd = ${fm(fyd)} MPa; cobrimento = ${fm(x.cob * 100)} cm; d = ${fm(x.dd)} m`, resultado: c.fcd, unidade: 'MPa', norma: `${NBR}, 12.3.3`, entradas: { fcd: c.fcd, fctd: c.fctd, fctm: c.fctm, fyd, fyk: x.fyk, cob: x.cob, d: x.dd } });

  // ---------------------------------------------------------------- solo
  const T1 = 'Base elástica · tensões no solo';
  E('dimensionamento', T1, { descricao: `Pressão máxima (σ = k·w nos nós, combinação rara ${x.solo.cMax}) e mínima (${x.solo.cMin}); recalque máximo`, formula: 'σ = k·w', expressao: `σmáx = ${fm(x.solo.max)} kPa; σmín = ${fm(x.solo.min)} kPa; recalque = ${fm(x.solo.rec * 1000)} mm${x.sigmaAdm !== null ? `; σadm = ${fm(x.sigmaAdm)} kPa ${x.solo.max <= x.sigmaAdm + 1e-9 ? '(atende)' : '(NÃO atende)'}` : ''}`, resultado: x.solo.max, unidade: 'kPa', norma: 'NBR 6122:2019', entradas: { sigmaMax: x.solo.max, sigmaMin: x.solo.min, recalque: x.solo.rec, sigmaAdm: x.sigmaAdm ?? 'sem', combMax: x.solo.cMax, combMin: x.solo.cMin } });

  // ---------------------------------------------------------------- esforços ELU
  const T2 = 'Base elástica · esforços ELU (envoltória nas pontas das barras)';
  const fat = (cb: { fatores: Record<string, number> }) => x.nomes.map((n) => cb.fatores[n] ?? 0);
  const gov = { inf: { v: 0, comb: -1, barra: -1, ponta: 0, contrib: [] } as Gov, sup: { v: 0, comb: -1, barra: -1, ponta: 0, contrib: [] } as Gov, V: { v: 0, comb: -1, barra: -1, ponta: 0, contrib: [] } as Gov };
  x.barras.forEach((br, ib) => {
    for (const k of [0, 6] as const) x.elu.forEach((cb, icb) => {
      const f = fat(cb);
      let M = 0, Vy = 0;
      f.forEach((fi, ic) => { if (fi) { const e = x.esforcos[ic][br.bi]; M += fi * (k === 0 ? -e[5] : e[11]); Vy += fi * e[k + 1]; } });
      const contrib = (g: (e: ArrayLike<number>) => number): [string, number, number][] => f.map((fi, ic) => [x.nomes[ic], fi, g(x.esforcos[ic][br.bi])] as [string, number, number]).filter(([, fi]) => fi !== 0);
      if (M > gov.inf.v) gov.inf = { v: M, comb: icb, barra: ib, ponta: k, contrib: contrib((e) => (k === 0 ? -e[5] : e[11])) };
      if (-M > gov.sup.v) gov.sup = { v: -M, comb: icb, barra: ib, ponta: k, contrib: contrib((e) => -(k === 0 ? -e[5] : e[11])) };
      if (Math.abs(Vy) > gov.V.v) gov.V = { v: Math.abs(Vy), comb: icb, barra: ib, ponta: k, contrib: contrib((e) => e[k + 1]) };
    });
  });
  for (const [rot, g, un, chave, res] of [['Momento que traciona a face inferior', gov.inf, 'kN·m', 'Minf', x.Md.inf], ['Momento que traciona a face superior', gov.sup, 'kN·m', 'Msup', x.Md.sup], ['Cortante', gov.V, 'kN', 'V', x.Vd]] as const) {
    const cb = g.comb >= 0 ? x.elu[g.comb] : null;
    E('esforcos', T2, { descricao: `${rot}: máximo entre as combinações ELU nas pontas das barras${cb ? ` (combinação ${cb.nome}, barra ${g.barra + 1}, ${g.ponta === 0 ? 'ponta inicial' : 'ponta final'})` : ' (nulo)'}`, formula: chave === 'V' ? 'Vd = máx |Σ f·Vcaso|' : 'Md = máx(0; Σ f·Mcaso), M interno (+ traciona embaixo)', expressao: cb ? `${chave === 'V' ? 'Vd' : 'Md'} = ${g.contrib.map(([n, f, v]) => `${fm(f)}·${fp2(v)} (${n})`).join(' + ')} = ${fm(g.v)} ${un}` : `${chave === 'V' ? 'Vd' : 'Md'} = 0`, resultado: res, unidade: un, norma: `${NBR}, 11.8; ${WINKLER}`, aConfirmar: true, entradas: { valor: g.v, combinacao: cb?.nome ?? '', contribuicoes: JSON.stringify(g.contrib) } });
  }

  // ---------------------------------------------------------------- flexão
  const d2 = x.cob + 0.013;
  const geral = { c, taxaMin: 0, b: x.bw, h: x.h };
  const T3 = 'Base elástica · flexão inferior (tração embaixo)';
  flexao(mem, el, T3, { ...geral, sec: x.secInf }, x.Md.inf, x.dd, d2, fyd, x.fcInf, x.fi.As, true, { semMinimo: true });
  const T4 = 'Base elástica · flexão superior (tração em cima)';
  flexao(mem, el, T4, { ...geral, sec: x.secSup }, x.Md.sup, x.dd, d2, fyd, x.fcSup, x.fs.As, false, { semMinimo: true });
  const T5 = 'Base elástica · armaduras longitudinais';
  E('dimensionamento', T5, { descricao: 'Armadura mínima das faces (momento mínimo da seção) e armaduras adotadas (cada face recebe a armadura de compressão da outra, se dupla)', formula: 'As,inf = máx(As,flex,inf + As′,sup; As,mín); As,sup = máx(As,flex,sup + As′,inf; As,mín,sup)', expressao: `As,mín = ${fm(x.AsMin * 1e4)} cm²; As,mín,sup = ${fm(x.AsMinSup * 1e4)} cm²; As,inf = ${fm(x.inf.As * 1e4)} cm²; As,sup = ${fm(x.sup.As * 1e4)} cm²`, resultado: x.inf.As, unidade: 'm²', norma: `${NBR}, 17.3.5.2.1`, entradas: { AsFlexInf: x.fi.As, As2Inf: x.fi.As2, AsFlexSup: x.fs.As, As2Sup: x.fs.As2, AsMin: x.AsMin, AsMinSup: x.AsMinSup, AsInf: x.inf.As, AsSup: x.sup.As } });
  for (const [rot, b] of [['inferior', x.inf.barras], ['superior', x.sup.barras]] as const) {
    E('detalhamento', T5, { descricao: `Barras da face ${rot}`, formula: 'menor área com espaçamento mínimo de 2 cm, φ ≥ 5 mm de estribo e dmáx do agregado', expressao: b ? `${b.n} φ${fm(b.phi)} (${fm(b.As * 1e4)} cm²)` : 'não cabe na largura', resultado: b ? `${b.n} φ${fm(b.phi)}` : 'sem solução', unidade: '', norma: NBR, entradas: b ? { phi: b.phi, n: b.n, As: b.As } : {} });
  }

  // ---------------------------------------------------------------- cortante
  const T6 = 'Base elástica · cortante';
  const sh = x.sh, Vsd = Math.abs(x.Vd) / 1000;
  E('dimensionamento', T6, { descricao: 'Resistência da biela comprimida (modelo I, 90°) e parcela do concreto', formula: 'VRd2 = 0,27·αv2·fcd·bw·d; Vc = 0,6·fctd·bw·d', expressao: `VRd2 = ${fm(sh.VRd2)} kN; Vc = ${fm(sh.Vc)} kN; Vd = ${fm(x.Vd)} kN ${Vsd * 1000 <= sh.VRd2 + 1e-9 ? '≤' : '>'} VRd2`, resultado: sh.VRd2, unidade: 'kN', norma: `${NBR}, 17.4.2.2`, entradas: { av2: c.av2, fcd: c.fcd, fctd: c.fctd, bw: x.bw, d: x.dd, Vd: x.Vd, VRd2: sh.VRd2, Vc: sh.Vc } });
  E('dimensionamento', T6, { descricao: 'Armadura transversal necessária, mínima e espaçamento máximo', formula: 'Asw/s = máx[ρmín·bw; (Vd − Vc)/(0,9·d·fywd)]; smáx = mín(0,6d; 30 cm) se Vd ≤ 0,67 VRd2, senão mín(0,3d; 20 cm)', expressao: `Asw/s = ${fm(sh.aswS * 1e4)} cm²/m (mínima ${fm(sh.aswMin * 1e4)} cm²/m); smáx = ${fm(sh.smax * 100)} cm${sh.stirrup ? `; estribo φ${fm(sh.stirrup.phi)} c/${fm(sh.stirrup.s * 100)} cm (${sh.stirrup.legs} ramos)` : ''}`, resultado: sh.aswS, unidade: 'm²/m', norma: `${NBR}, 17.4.2.2 e 17.4.1.1.1`, entradas: { fctm: c.fctm, fywk: x.fyk, bw: x.bw, d: x.dd, Vd: x.Vd, Vc: sh.Vc, fywd: Math.min(x.fyk / x.gs, 435), aswMin: sh.aswMin, aswS: sh.aswS, smax: sh.smax, ...(sh.stirrup ? { phi: sh.stirrup.phi, s: sh.stirrup.s, legs: sh.stirrup.legs } : {}) } });

  // ---------------------------------------------------------------- quantitativos
  const T7 = 'Base elástica · pele, volume e aço';
  if (x.pele) E('detalhamento', T7, { descricao: 'Armadura de pele (h > 60 cm): 0,10 % da área da alma, em cada face', formula: 'n = máx(2; ⌈0,001·bw·h/Asφ⌉), φ8', expressao: `${x.pele.n} φ${fm(x.pele.phi)} por face (${fm(x.pele.As * 1e4)} cm²)`, resultado: x.pele.As, unidade: 'm²', norma: `${NBR}, 17.3.5.2.3`, entradas: { bw: x.bw, h: x.h, phi: x.pele.phi, n: x.pele.n } });
  E('detalhamento', T7, { descricao: 'Volume de concreto e peso de aço (barras corridas ou cortadas, estribos e pele)', formula: 'V = A·L; aço = Σ As·ℓ·7850', expressao: `V = ${fm(x.volume)} m³; aço = ${fm(x.aco)} kg`, resultado: x.volume, unidade: 'm³', norma: NBR, entradas: { V: x.volume, aco: x.aco, L: x.L } });
  E('detalhamento', T7, { descricao: x.status === 'ok' ? 'Viga sobre base elástica atende' : 'Viga sobre base elástica NÃO atende', formula: 'verificações', expressao: x.mensagens.join(' ') || 'sem mensagens', resultado: x.status === 'ok' ? 'atende' : 'não atende', unidade: '', entradas: {} as Record<string, ValorMemoria> });
}

const fp2 = (v: number) => (v < 0 ? `(${fm(v)})` : fm(v));
