// Memória detalhada (MD fase 7): paredes de concreto e pilares-parede. Os esforços resultantes de cada lado por caso (somas
// das cascas), as combinações ELU, a cadeia de cada pano (elemento governante, camadas do modelo sanduíche, membrana de
// chapas, mínimos, malha adotada, cumprimento, cortante transversal, reforços), os lados curtos em barra (pilar por fibras),
// a verificação global do lado, as aberturas, as vigas embutidas, a base (molas, viga de fundação) e a parcela axial da E6d.
// Chamadas só com a memória ligada, depois do cálculo, com os números do próprio cálculo; as contas auxiliares usam as
// mesmas funções determinísticas do dimensionamento com os mesmos argumentos.
import { barArea, beamShear, type Concrete } from '../concrete';
import { fiberCapacity, type FiberSection } from '../fiber';
import type { CombinacaoEd } from '../building/combinacoes';
import type { EntradaAbertura, EntradaPano, ResultadoAbertura, SaidaPano } from '../building/paredesDim';
import {
  atende, avaliarElementos, camadas, cortanteTransversal, membrana, minimosPano, requisitosElemento, verificaConcretoSimples,
  type Forcas, type MatParede,
} from '../building/paredesArmadura';
import { barrasDoLado, determinantes, m2dPadrao, secaoDoLado, type EntradaLadoBarra, type EsforcoLado, type ResultadoLadoBarra } from '../building/paredesLado';
import type { Extremo, Resultante } from '../building/pilarParedeEsforcos';
import { cm2, fm, fp, type EtapaMemoria, type Registrador } from './registrador';

type Chave = Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>;
const NBR = 'NBR 6118:2023';
const GRANDEZAS: (keyof Resultante)[] = ['N', 'Vp', 'Mp', 'Vo', 'Mo'];
const NOME_GRANDEZA: Record<keyof Resultante, string> = { N: 'normal N (tração +)', Vp: 'cortante no plano Vp', Mp: 'momento no plano Mp', Vo: 'cortante fora do plano Vo', Mo: 'momento fora do plano Mo' };
const UN_GRANDEZA: Record<keyof Resultante, string> = { N: 'kN', Vp: 'kN', Mp: 'kN·m', Vo: 'kN', Mo: 'kN·m' };

/** Nome do elemento da memória: "Parede P1 · Térreo", "Pilar-parede PP1 · Térreo", "Alvenaria A1 · Térreo". */
export const elementoParede = (tipo: 'parede' | 'pilarParede' | 'alvenaria' | 'blocos', nome: string, lance: string) =>
  `${tipo === 'parede' ? 'Parede' : tipo === 'pilarParede' ? 'Pilar-parede' : tipo === 'alvenaria' ? 'Alvenaria' : 'Alvenaria de blocos'} ${nome} · ${lance}`;

export const mk = (mem: Registrador, el: string) => (etapa: EtapaMemoria, topico: string, q: Chave) => mem.passo({ etapa, elemento: el, topico, ...q });

// ------------------------------------------------------------------------------------------------ esforços resultantes

/** Extremos ELU de cada grandeza (as mesmas combinações de `esforcosPilaresParede`), com a composição Σ γ·valor do caso. */
export function registrarExtremosELU(mem: Registrador, el: string, topico: string, casos: Record<string, Resultante>, ext: Record<keyof Resultante, Extremo>, elu: CombinacaoEd[]) {
  const P = mk(mem, el);
  for (const q of GRANDEZAS) {
    for (const [lado, nome, comb] of [['max', 'máximo', ext[q].cMax], ['min', 'mínimo', ext[q].cMin]] as const) {
      const cb = elu.find((c) => c.nome === comb);
      if (!cb) continue;
      const ent: Record<string, number | string> = { combinacao: comb };
      const termos: string[] = [];
      for (const [n, f] of Object.entries(cb.fatores)) { const v = casos[n]?.[q] ?? 0; ent[`γ_${n}`] = f; ent[`${q}_${n}`] = v; termos.push(`${fm(f)}·${fp(v)} [${n}]`); }
      P('esforcos', topico, { descricao: `Valor ${nome} ${NOME_GRANDEZA[q]} nas combinações ELU (combinação ${comb})`, formula: `${q} = Σ γi·${q},i`, expressao: `${q} = ${termos.join(' + ')} = ${fm(ext[q][lado])}`, resultado: ext[q][lado], unidade: UN_GRANDEZA[q], norma: 'NBR 8681:2003, 5.1.3', entradas: ent });
    }
  }
}

export interface CtxResultantesCasca {
  elemento: string; lado: string; lance: string;
  /** Comprimento do lado, trecho existente no lance [e0, e1] (E6d), espessura total e altura do painel. */
  L: number; e0: number; e1: number; t: number; H: number;
  els: { k: number; area: number; s: number }[];
  /** Esforços das cascas por caso (índice = k do elemento). */
  fontes: { nome: string; cascas?: Float64Array[] }[];
  casos: Record<string, Resultante>;
  ext: Record<keyof Resultante, Extremo>;
  elu: CombinacaoEd[];
}

/** Lado em casca: esforços resultantes por caso somados dos elementos da casca do lance e extremos ELU. */
export function registrarResultantesCasca(mem: Registrador, x: CtxResultantesCasca) {
  const P = mk(mem, x.elemento), T = `Esforços resultantes do lado ${x.lado}`;
  const sc = (x.e0 + x.e1) / 2;
  P('esforcos', T, { descricao: 'Altura do painel, trecho existente do lado no lance (recorte, E6d) e seu centro, referência dos momentos no plano', formula: 'H = cota do topo − cota da base do lance; sc = (e0 + e1)/2', expressao: `H = ${fm(x.H)} m; trecho [${fm(x.e0)}; ${fm(x.e1)}] m de ${fm(x.L)} m; sc = ${fm(sc)} m; ${x.els.length} elementos da casca, t = ${fm(x.t)} m`, resultado: x.H, unidade: 'm', entradas: { H: x.H, e0: x.e0, e1: x.e1, sc, L: x.L, t: x.t, elementos: x.els.length } });
  for (const f of x.fontes) {
    if (!f.cascas) continue;
    const r = x.casos[f.nome];
    if (!r) continue;
    const contrib: number[][] = [];
    for (const e of x.els) { const v = f.cascas[e.k]; if (v) contrib.push([e.area, e.s, v[1], v[2], v[7], v[4]]); }
    P('esforcos', T, {
      descricao: `Resultantes do lado no caso ${f.nome}: somas ponderadas pela faixa de altura dos elementos da casca (ny, nxy, qy e my no centroide de cada elemento)`,
      formula: 'N = Σ ny·A/H; Vp = Σ nxy·A/H; Mp = Σ ny·(s − sc)·A/H; Vo = Σ qy·A/H; Mo = Σ my·A/H',
      expressao: `N = ${fm(r.N)} kN; Vp = ${fm(r.Vp)} kN; Mp = ${fm(r.Mp)} kN·m; Vo = ${fm(r.Vo)} kN; Mo = ${fm(r.Mo)} kN·m (${contrib.length} elementos)`,
      resultado: r.N, unidade: 'kN', entradas: { caso: f.nome, H: x.H, sc, N: r.N, Vp: r.Vp, Mp: r.Mp, Vo: r.Vo, Mo: r.Mo, elementos: JSON.stringify(contrib) },
      observacao: 'elementos = [área, s, ny, nxy, qy, my] de cada elemento da casca; esforços completos nas tabelas esforcos_cascas e cascas_parede da exportação dos dados.',
    });
  }
  registrarExtremosELU(mem, x.elemento, T, x.casos, x.ext, x.elu);
}

export interface CtxResultantesBarra {
  elemento: string; lado: string; L: number;
  /** Esforços das duas pontas da barra do lado (N, Vy, Vz, My, Mz) por caso. */
  pontas: Record<string, { N: number; Vy: number; Vz: number; My: number; Mz: number }[]>;
  casos: Record<string, Resultante>;
  ext: Record<keyof Resultante, Extremo>;
  elu: CombinacaoEd[];
}

/** Lado curto em barra: resultantes pelos esforços da barra do pilar (ponta de maior valor absoluto) e extremos ELU. */
export function registrarResultantesBarra(mem: Registrador, x: CtxResultantesBarra) {
  const P = mk(mem, x.elemento), T = `Esforços resultantes do lado ${x.lado} (barra)`;
  for (const [nome, r] of Object.entries(x.casos)) {
    P('esforcos', T, {
      descricao: `Resultantes do lado curto no caso ${nome}: esforços da barra do pilar que o representa`,
      formula: 'N = N da base; Vp = Vy, Mp = Mz, Vo = Vz, Mo = My na ponta de maior valor absoluto',
      expressao: `N = ${fm(r.N)} kN; Vp = ${fm(r.Vp)} kN; Mp = ${fm(r.Mp)} kN·m; Vo = ${fm(r.Vo)} kN; Mo = ${fm(r.Mo)} kN·m`,
      resultado: r.N, unidade: 'kN', entradas: { caso: nome, N: r.N, Vp: r.Vp, Mp: r.Mp, Vo: r.Vo, Mo: r.Mo, pontas: JSON.stringify(x.pontas[nome] ?? []) },
    });
  }
  registrarExtremosELU(mem, x.elemento, T, x.casos, x.ext, x.elu);
}

export interface CtxBasePP {
  elemento: string;
  base: Record<string, { N: number; Vx: number; Vy: number; Mx: number; My: number; Mz: number }>;
  baseElu: { Nmax: number; Nmin: number; cNmax: string; cNmin: string };
  elu: CombinacaoEd[];
}

/** Cargas na base do pilar-parede ou da parede, por caso (N > 0 compressão), e os extremos ELU de N. */
export function registrarCargasBase(mem: Registrador, x: CtxBasePP) {
  const P = mk(mem, x.elemento), T = 'Cargas na base (reações da fundação)';
  for (const [caso, v] of Object.entries(x.base)) {
    P('cargas', T, { descricao: `Reações na base no caso ${caso} (eixos globais; N > 0 compressão), em torno do centro do pilar-parede`, formula: 'N, Vx, Vy, Mx, My, Mz das reações dos nós da base', expressao: `N = ${fm(v.N)} kN; Vx = ${fm(v.Vx)} kN; Vy = ${fm(v.Vy)} kN; Mx = ${fm(v.Mx)} kN·m; My = ${fm(v.My)} kN·m; Mz = ${fm(v.Mz)} kN·m`, resultado: v.N, unidade: 'kN', entradas: { caso, N: v.N, Vx: v.Vx, Vy: v.Vy, Mx: v.Mx, My: v.My, Mz: v.Mz } });
  }
  for (const [rot, comb, val] of [['máxima', x.baseElu.cNmax, x.baseElu.Nmax], ['mínima', x.baseElu.cNmin, x.baseElu.Nmin]] as const) {
    const cb = x.elu.find((c) => c.nome === comb);
    if (!cb) continue;
    const ent: Record<string, number | string> = { combinacao: comb };
    const termos: string[] = [];
    for (const [n, f] of Object.entries(cb.fatores)) { const v = x.base[n]?.N ?? 0; ent[`γ_${n}`] = f; ent[`N_${n}`] = v; termos.push(`${fm(f)}·${fp(v)} [${n}]`); }
    P('cargas', T, { descricao: `Normal ${rot} na base nas combinações ELU (combinação ${comb})`, formula: 'Nd = Σ γi·Ni', expressao: `Nd = ${termos.join(' + ')} = ${fm(val)}`, resultado: val, unidade: 'kN', norma: 'NBR 8681:2003, 5.1.3', entradas: ent });
  }
}

// ------------------------------------------------------------------------------------------------ cadeia de um elemento da casca

interface OpcElemento { t: number; le: number; mat: MatParede; matH: MatParede; combo: string; s: number; z: number; area: number; papel: string }

/** Cadeia de um elemento da casca (modelo sanduíche): esforços, momentos mínimo e de 2ª ordem, camadas, membrana, armaduras. */
function cadeiaElemento(P: ReturnType<typeof mk>, topico: string, f: Forcas, o: OpcElemento) {
  const { t, le, mat, matH } = o;
  const rq = requisitosElemento(f, t, le, mat), rqH = matH.fyd === mat.fyd ? rq : requisitosElemento(f, t, le, matH);
  const zb = 0.9 * (t - mat.d1);
  P('esforcos', topico, {
    descricao: `Elemento governante (${o.papel}): esforços de cálculo da combinação ${o.combo} no elemento em s = ${fm(o.s)} m, z = ${fm(o.z)} m (área ${fm(o.area)} m²)`,
    formula: 'nx, ny, nxy (kN/m); mx, my, mxy (kN·m/m); qx, qy (kN/m); tração +; M > 0 traciona a face z−',
    expressao: `nx = ${fm(f.nx)}; ny = ${fm(f.ny)}; nxy = ${fm(f.nxy)}; mx = ${fm(f.mx)}; my = ${fm(f.my)}; mxy = ${fm(f.mxy)}; qx = ${fm(f.qx)}; qy = ${fm(f.qy)}`,
    resultado: f.ny, unidade: 'kN/m', norma: 'NBR 8681:2003, 5.1.3', entradas: { combinacao: o.combo, s: o.s, z: o.z, area: o.area, ...f },
  });
  const ncomp = rq.ncomp;
  P('dimensionamento', topico, {
    descricao: 'Compressão por metro da faixa vertical e esbeltez do pano', formula: 'ncomp = máx(0; −ny); λ = ℓe·√12/t', expressao: `ncomp = máx(0; ${fm(-f.ny)}) = ${fm(ncomp)} kN/m; λ = ${fm(le)}·√12/${fm(t)} = ${fm(rq.lambda)}`,
    resultado: rq.lambda, unidade: '', norma: `${NBR}, 15.8.2`, entradas: { ny: f.ny, ncomp, le, t, lambda: rq.lambda },
  });
  if (ncomp > 0) {
    P('dimensionamento', topico, { descricao: 'Momento mínimo de 1ª ordem da faixa vertical', formula: 'M1d,mín = ncomp·(0,015 + 0,03·t)', expressao: `M1d,mín = ${fm(ncomp)}·(0,015 + 0,03·${fm(t)}) = ${fm(rq.m1min)}`, resultado: rq.m1min, unidade: 'kN·m/m', norma: `${NBR}, 11.3.3.4.3`, entradas: { ncomp, t, m1min: rq.m1min } });
    if (rq.lambda > 35) {
      const nu = ncomp / (t * mat.fcd * 1000);
      P('dimensionamento', topico, { descricao: 'Momento de 2ª ordem local pelo pilar-padrão de curvatura aproximada (processo por faixas, a favor da segurança: αb = 1)', formula: 'ν = ncomp/(t·fcd); M2d = ncomp·ℓe²/10·mín[0,005/(t·(ν + 0,5)); 0,005/t]', expressao: `ν = ${fm(nu)}; M2d = ${fm(ncomp)}·${fm(le)}²/10·mín[0,005/(${fm(t)}·(${fm(nu)} + 0,5)); ${fm(0.005 / t)}] = ${fm(rq.m2d)}`, resultado: rq.m2d, unidade: 'kN·m/m', norma: `${NBR}, 15.8.3.3.2 e 15.9`, aConfirmar: true, entradas: { ncomp, le, t, fcd: mat.fcd, nu, m2d: rq.m2d } });
    } else P('dimensionamento', topico, { descricao: 'λ ≤ 35: dispensa a 2ª ordem local', formula: 'M2d = 0 se λ ≤ 35', expressao: `λ = ${fm(rq.lambda)} ≤ 35`, resultado: 0, unidade: 'kN·m/m', norma: `${NBR}, 15.8.2`, entradas: { lambda: rq.lambda } });
  }
  const variantes = ncomp > 0 ? [Math.max(f.my, rq.m1min) + rq.m2d, Math.min(f.my, -rq.m1min) - rq.m2d] : [f.my];
  P('dimensionamento', topico, { descricao: `Braço de alavanca entre as camadas do sanduíche e momentos my de cálculo (${variantes.length} variante${variantes.length > 1 ? 's, nos dois sentidos' : ''})`, formula: 'z = 0,9·(t − d1); my,var = máx(my; M1d,mín) + M2d e mín(my; −M1d,mín) − M2d', expressao: `z = 0,9·(${fm(t)} − ${fm(mat.d1)}) = ${fm(zb)} m; my = ${variantes.map((v) => fm(v)).join('; ')}`, resultado: zb, unidade: 'm', norma: 'Modelo sanduíche (EN 1992-2, Annex LL, a confirmar)', aConfirmar: true, entradas: { t, d1: mat.d1, z: zb, my: f.my, m1min: rq.m1min, m2d: rq.m2d, ...Object.fromEntries(variantes.map((v, i) => [`my_${i + 1}`, v])) } });
  let ftxM = 0, ftyM = 0, util = 0;
  variantes.forEach((my, iv) => {
    const cs = camadas({ ...f, my }, zb), ms = cs.map((c) => membrana(c.nx, c.ny, c.nxy));
    const fiss = ms.some((c) => c.ftx > 1e-9 || c.fty > 1e-9);
    const hs = fiss ? Math.max(t / 3, 2 * mat.d1) : t / 2, lim = fiss ? 0.6 * (1 - mat.fck / 250) * mat.fcd : mat.sigmaCd;
    cs.forEach((c, ic) => {
      const m = ms[ic];
      P('dimensionamento', topico, {
        descricao: `Variante ${iv + 1}, camada da face ${ic === 0 ? 'z− (tracionada por M > 0)' : 'z+'}: forças de membrana da camada e armadura de chapa ortogonal (biela a θ do eixo x)`,
        formula: 'n = n_total/2 ± m/z; membrana: ftx = nx + |nxy|, fty = ny + |nxy| (sem compressão principal exigida); com nx < −|nxy|: fty = ny + nxy²/|nx|; com ny < −|nxy|: ftx = nx + nxy²/|ny|; senão compressão biaxial',
        expressao: `nx = ${fm(c.nx)}; ny = ${fm(c.ny)}; nxy = ${fm(c.nxy)} → ftx = ${fm(m.ftx)}; fty = ${fm(m.fty)}; nc = ${fm(m.nc)} kN/m`,
        resultado: m.fty, unidade: 'kN/m', norma: 'EN 1992-2, Annex F (armadura de chapas; a confirmar)', aConfirmar: true,
        entradas: { variante: iv + 1, camada: ic, my, z: zb, nx: c.nx, ny: c.ny, nxy: c.nxy, ftx: m.ftx, fty: m.fty, nc: m.nc },
      });
    });
    ms.forEach((m) => { ftxM = Math.max(ftxM, m.ftx); ftyM = Math.max(ftyM, m.fty); util = Math.max(util, m.nc / hs / 1000 / lim); });
    P('dimensionamento', topico, { descricao: `Variante ${iv + 1}: espessura da camada comprimida e tensão limite do concreto (${fiss ? 'estado fissurado' : 'sem tração'})`, formula: fiss ? 'hs = máx(t/3; 2·d1); σlim = 0,6·(1 − fck/250)·fcd' : 'hs = t/2; σlim = 0,85·fcd', expressao: `hs = ${fm(hs)} m; σlim = ${fm(lim)} MPa; nc/hs/σlim = ${ms.map((m) => fm(m.nc / hs / 1000 / lim)).join('; ')}`, resultado: lim, unidade: 'MPa', norma: `${NBR}, 22.2 (campos de compressão; a confirmar)`, aConfirmar: true, entradas: { variante: iv + 1, fissurado: fiss ? 1 : 0, hs, lim, fck: mat.fck, fcd: mat.fcd, sigmaCd: mat.sigmaCd, d1: mat.d1, t } });
  });
  const c1 = 10 / mat.fyd, cH = 10 / matH.fyd;
  P('dimensionamento', topico, {
    descricao: `Armadura necessária por face do elemento (${o.papel}): maior fty (vertical) e maior ftx (horizontal) entre camadas e variantes`,
    formula: 'As,vert = máx(fty)/(fyd·1000)·10⁴; As,hor = máx(ftx)/(fyd·1000)·10⁴',
    expressao: `As,vert = ${fm(ftyM)}·10/${fm(mat.fyd)} = ${fm(rq.rv)} cm²/m; As,hor = ${fm(ftxM)}·10/${fm(matH.fyd)} = ${fm(rqH.rh)} cm²/m; utilização do concreto = ${fm(util)}; cortante fora do plano V = √(qx² + qy²) = ${fm(rq.V)} kN/m`,
    resultado: rq.rv, unidade: 'cm²/m', norma: `${NBR}, 17.3.5 e 24`, aConfirmar: true,
    entradas: { combinacao: o.combo, ftyMax: ftyM, ftxMax: ftxM, fyd: mat.fyd, fydH: matH.fyd, rv: rq.rv, rh: rqH.rh, util: rq.util, V: rq.V, qx: f.qx, qy: f.qy, fatorV: c1, fatorH: cH },
  });
}

// ------------------------------------------------------------------------------------------------ pano

export interface CtxPano {
  elemento: string; lado: string; lance: string; ip: number; panos: number; s0: number; s1: number; H: number;
  e: EntradaPano; r: SaidaPano;
  /** Elementos que vieram da extrapolação às bordas do lance. */
  nExtra: number;
  bloqueioIgnorado: boolean;
}

/** Cadeia completa de um pano de parede ou pilar-parede em casca. */
export function registrarPano(mem: Registrador, x: CtxPano) {
  const { e, r, elemento } = x;
  const P = mk(mem, elemento), T = `Lado ${x.lado} · pano ${x.ip + 1} de ${x.panos} (s de ${fm(x.s0)} a ${fm(x.s1)} m)`;
  const { t, mat, matH, op } = e;
  const pts = avaliarElementos(e.elementos, t, e.le, mat, matH, e.simples), pp = pts.map((a) => a.pts[0]);
  const area = pp.reduce((s, p) => s + p.area, 0);
  P('dimensionamento', T, { descricao: `Geometria do pano no lance ${x.lance}: espessura, altura e distância da face ao centro das barras (cobrimento + bitola estimada)`, formula: 'área = Σ área dos elementos (inclui os pontos extrapolados às bordas); d1 = cobrimento + 13 mm', expressao: `t = ${fm(t)} m; H = ${fm(x.H)} m; d1 = ${fm(mat.d1)} m; ${e.elementos.length} elementos (${x.nExtra} extrapolados às bordas); área = ${fm(area)} m²`, resultado: area, unidade: 'm²', entradas: { s0: x.s0, s1: x.s1, H: x.H, t, d1: mat.d1, elementos: e.elementos.length, extrapolados: x.nExtra, area } });
  P('dimensionamento', T, { descricao: 'Materiais do pano: concreto e aço das armaduras vertical e horizontal', formula: 'fcd, σcd = 0,85·fcd, fctd (MPa); fyd (MPa)', expressao: `fck = ${fm(mat.fck)}; fcd = ${fm(mat.fcd)}; σcd = ${fm(mat.sigmaCd)}; fctd = ${fm(mat.fctd)}; fyd,vert = ${fm(mat.fyd)}; fyd,hor = ${fm(matH.fyd)} MPa`, resultado: mat.fyd, unidade: 'MPa', entradas: { fck: mat.fck, fcd: mat.fcd, sigmaCd: mat.sigmaCd, fctd: mat.fctd, fyd: mat.fyd, fydH: matH.fyd } });
  const coef = op.paredeFlambagem, lambda = r.esbeltez.lambda;
  P('dimensionamento', T, { descricao: `Comprimento de flambagem do pano e esbeltez${r.esbeltez.segundaOrdem ? ' (λ > 35: 2ª ordem local nas faixas)' : ''}`, formula: 'ℓe = c·H; λ = ℓe·√12/t', expressao: `ℓe = ${fm(coef)}·${fm(x.H)} = ${fm(e.le)} m; λ = ${fm(e.le)}·√12/${fm(t)} = ${fm(lambda)}${lambda > 90 ? ' > 90: o processo aproximado não vale, revisar pelo método geral' : ''}`, resultado: lambda, unidade: '', norma: `${NBR}, 15.8.2 e 15.9`, aConfirmar: true, entradas: { coef, H: x.H, le: e.le, t, lambda } });
  // fatias: necessidades por elemento
  const fat = e.elementos.map((el, i) => [el.s, el.z, el.area, pp[i].rv, pp[i].rh, pp[i].util, pp[i].V, pp[i].ncomp, pts[i].governa.vert, pts[i].governa.hor]);
  P('dimensionamento', T, { descricao: `Necessidades de cada elemento (fatia) do pano: envoltória das ${e.combos.length} combinações ELU (armadura vertical e horizontal por face, utilização do concreto, cortante, compressão)`, formula: 'por elemento: máx sobre as combinações de As,vert, As,hor, util, V e ncomp (modelo sanduíche)', expressao: `${e.elementos.length} elementos; máx As,vert = ${fm(r.req.vert)} cm²/m; máx As,hor = ${fm(r.req.hor)} cm²/m`, resultado: e.elementos.length, unidade: 'elementos', entradas: { combinacoes: JSON.stringify(e.combos), elementos: JSON.stringify(fat) }, observacao: 'elementos = [s, z, área, As,vert, As,hor, util, V, ncomp, índice da combinação (vert), índice da combinação (hor)] de cada elemento; os esforços por combinação estão em esforcos_cascas_combinacoes.' });
  // elementos governantes (cadeia)
  const idx = (f: (p: (typeof pp)[0]) => number) => pp.reduce((m, p, i) => (f(p) > f(pp[m]) ? i : m), 0);
  const fam: [string, number, number, number][] = [];
  const reqV = Math.max(0, ...pp.map((p) => p.rv)), reqH = Math.max(0, ...pp.map((p) => p.rh)), utilC = Math.max(0, ...pp.map((p) => p.util)), Vmax = Math.max(0, ...pp.map((p) => p.V));
  if (reqV > 0) { const i = idx((p) => p.rv); fam.push(['armadura vertical', i, pts[i].governa.vert, 0]); }
  if (reqH > 0) { const i = idx((p) => p.rh); fam.push(['armadura horizontal', i, pts[i].governa.hor, 0]); }
  if (utilC > 0) { const i = idx((p) => p.util); fam.push(['concreto', i, pts[i].governa.util, 0]); }
  if (Vmax > 0) { const i = idx((p) => p.V); fam.push(['cortante fora do plano', i, pts[i].governa.V, 0]); }
  const vistos = new Map<string, string[]>();
  for (const [papel, i, c] of fam) { const k = `${i}|${c}`; vistos.set(k, [...(vistos.get(k) ?? []), papel]); }
  if (!fam.length) P('dimensionamento', T, { descricao: 'Nenhum elemento exige armadura de cálculo nem trabalha perto do limite do concreto', formula: 'máx(As,vert; As,hor; util; V) = 0', expressao: 'sem tração, concreto e cortante folgados', resultado: 0, unidade: 'cm²/m', entradas: {} });
  for (const [k, papeis] of vistos) {
    const [i, c] = k.split('|').map(Number);
    cadeiaElemento(P, T, e.elementos[i].forcas[c], { t, le: e.le, mat, matH, combo: e.combos[c], s: e.elementos[i].s, z: e.elementos[i].z, area: e.elementos[i].area, papel: papeis.join(', ') });
  }
  P('dimensionamento', T, { descricao: 'Envoltória do pano: maiores necessidades entre os elementos', formula: 'req,vert = máx rv; req,hor = máx rh; util = máx util; Vmáx = máx V', expressao: `req,vert = ${fm(reqV)} cm²/m; req,hor = ${fm(reqH)} cm²/m; util do concreto = ${fm(utilC)}; Vmáx = ${fm(Vmax)} kN/m`, resultado: reqV, unidade: 'cm²/m', entradas: { reqV, reqH, utilC, Vmax, ...(r.governa.vert ? { combinacaoVert: r.governa.vert } : {}), ...(r.governa.hor ? { combinacaoHor: r.governa.hor } : {}) } });

  if (e.simples) {
    P('dimensionamento', T, { descricao: 'Parede em concreto simples (sem armadura): tração máxima contra fctd/1,2 e compressão máxima contra 0,85·fcd/1,2 nas duas faces', formula: 'razão = máx(σt/(fctd/1,2); σc/(σcd/1,2)) ≤ 1', expressao: `razão = ${fm(r.concretoSimples ?? 0)}; utilização do concreto = ${fm(utilC)}`, resultado: r.concretoSimples ?? 0, unidade: '', norma: `${NBR}, 24 (a confirmar)`, aConfirmar: true, entradas: { razao: r.concretoSimples ?? 0, utilC, fctd: mat.fctd, sigmaCd: mat.sigmaCd } });
    fimPano(P, T, r);
    return;
  }
  const ncompMax = Math.max(0, ...pp.map((p) => p.ncomp));
  const asMinMec = (0.15 * ncompMax * 10) / mat.fyd;
  if (!r.armada) {
    const sim = Math.max(0, ...e.elementos.flatMap((el) => el.forcas.map((f) => verificaConcretoSimples(f, t, mat).razao)));
    P('dimensionamento', T, { descricao: 'Nenhum ponto exige armadura e o concreto simples atende (opção "armar sempre" desligada): pano sem armadura', formula: 'razão de concreto simples ≤ 1 e V ≤ VRd1', expressao: `razão = ${fm(sim)}; Vmáx = ${fm(Vmax)} kN/m`, resultado: sim, unidade: '', norma: `${NBR}, 24 (a confirmar)`, aConfirmar: true, entradas: { razao: sim, Vmax } });
    fimPano(P, T, r);
    return;
  }
  // mínimos
  const pv = r.vert ? r.asVert : 0, ph = r.asHor;
  const par = { t, taxaVertMin: op.paredeTaxaVertMin, taxaHorMin: op.paredeTaxaHorMin, horFracVert: op.paredeHorFracVert, asMinMecanica: asMinMec };
  const mn = minimosPano(par, pv);
  P('dimensionamento', T, { descricao: 'Armadura mínima mecânica de pilar na faixa vertical (as duas faces)', formula: 'As,mín,mec = 0,15·ncomp,máx/fyd', expressao: `As,mín,mec = 0,15·${fm(ncompMax)}·10/${fm(mat.fyd)} = ${fm(asMinMec)} cm²/m`, resultado: asMinMec, unidade: 'cm²/m', norma: `${NBR}, 17.3.5.3.1`, entradas: { ncompMax, fyd: mat.fyd, asMinMec } });
  if (!op.paredeSoHorizontal) P('dimensionamento', T, { descricao: 'Armadura vertical mínima por face', formula: 'As,vert,mín = máx(ρv,mín·t·10⁴; As,mín,mec)/2', expressao: `As,vert,mín = máx(${fm(op.paredeTaxaVertMin)} %·${fm(t)}·10⁴; ${fm(asMinMec)})/2 = ${fm(mn.vert)} cm²/m`, resultado: mn.vert, unidade: 'cm²/m', norma: `${NBR}, 17.3.5.3.1 e 24.2 (taxas das opções; a confirmar)`, aConfirmar: true, entradas: { taxaVertMin: op.paredeTaxaVertMin, t, asMinMec, minVert: mn.vert } });
  P('dimensionamento', T, { descricao: 'Armadura horizontal mínima por face (taxa mínima ou fração da vertical adotada)', formula: 'As,hor,mín = máx(ρh,mín·t·10⁴/2; fração·As,vert adotada)', expressao: `As,hor,mín = máx(${fm(op.paredeTaxaHorMin)} %·${fm(t)}·10⁴/2; ${fm(op.paredeHorFracVert)} %·${fm(pv)}) = ${fm(mn.hor)} cm²/m`, resultado: mn.hor, unidade: 'cm²/m', norma: `${NBR}, 24.2 (a confirmar)`, aConfirmar: true, entradas: { taxaHorMin: op.paredeTaxaHorMin, t, horFracVert: op.paredeHorFracVert, pv, minHor: mn.hor } });
  // malha adotada
  const exigido = op.paredeCumprimento / 100;
  let areaOk = 0;
  for (const p of pp) if (atende(p, pv, ph, t, mat.d1, mat).ok) areaOk += p.area;
  const fracao = area > 0 ? areaOk / area : 1;
  const fmtM = (m: { phi: number; s: number } | null) => (m ? `φ${fm(m.phi)} c/${fm(m.s * 100)} cm` : 'sem armadura');
  P('dimensionamento', T, {
    descricao: `Malha adotada (${r.bloqueada ? 'armadura bloqueada pelo usuário, só verificada' : 'a de menor aço que atinge o fator de cumprimento, iguais nas duas faces'}): vertical ${fmtM(r.vert)}, horizontal ${fmtM(r.hor)}`,
    formula: 'As = π·φ²/4/s (por face); cumprimento = Σ área dos elementos que atendem / Σ área ≥ exigido',
    expressao: `As,vert = ${fm(pv)} cm²/m; As,hor = ${fm(ph)} cm²/m; cumprimento = ${fm(areaOk)}/${fm(area)} = ${fm(fracao * 100)} % (exigido ${fm(exigido * 100)} %)`,
    resultado: fracao, unidade: '', norma: `${NBR}, 24.2 e fator de cumprimento das opções (a confirmar)`, aConfirmar: true,
    entradas: { phiV: r.vert?.phi ?? 0, sV: r.vert?.s ?? 0, phiH: r.hor?.phi ?? 0, sH: r.hor?.s ?? 0, asVert: pv, asHor: ph, area, areaAtende: areaOk, cumprimento: fracao, exigido, bloqueada: r.bloqueada ? 1 : 0, taxaVertMax: op.paredeTaxaVertMax, asVertMax: ((op.paredeTaxaVertMax / 100) * t * 1e4) / 2 },
    observacao: x.bloqueioIgnorado ? 'Armadura bloqueada desconsiderada: o número de panos do lado mudou.' : undefined,
  });
  if (r.pontos.length) P('dimensionamento', T, { descricao: `Pontos que não atendem com a malha adotada: ${r.pontos.length}${r.pontos.length >= 200 ? ' (lista limitada aos 200 de maior área)' : ''}`, formula: 'motivo: vertical, horizontal, concreto ou cortante', expressao: `maior ponto: s = ${fm(r.pontos[0].s)}; z = ${fm(r.pontos[0].z)}; motivo ${r.pontos[0].motivo}`, resultado: r.pontos.length, unidade: 'pontos', entradas: { pontos: JSON.stringify(r.pontos.map((q) => [q.s, q.z, q.area, q.motivo, q.dv, q.dh])) } });
  // cortante transversal
  const d = t - mat.d1, rho = Math.min(0.02, pv / (100 * d * 100)), k = Math.max(1, Math.abs(1.6 - d)), tauRd = 0.25 * mat.fctd * 1000, sigmaCp = ncompMax / t;
  const ct = cortanteTransversal(t, mat.d1, pv, ncompMax, mat);
  P('dimensionamento', T, {
    descricao: 'Cortante fora do plano por metro, sem armadura transversal (como laje) e limite da biela', formula: 'VRd1 = [τRd·k·(1,2 + 40·ρ1) + 0,15·σcp]·d; τRd = 0,25·fctd; k = |1,6 − d| ≥ 1; ρ1 = As/(100·d·100) ≤ 0,02; VRd2 = 0,27·(1 − fck/250)·fcd·d',
    expressao: `d = ${fm(d)}; ρ1 = ${fm(rho)}; k = ${fm(k)}; τRd = ${fm(tauRd)} kN/m²; σcp = ${fm(sigmaCp)} kN/m²; VRd1 = ${fm(ct.VRd1)}; VRd2 = ${fm(ct.VRd2)} kN/m; V = ${fm(Vmax)} kN/m${r.cortante.grampos ? ' > VRd1: grampos entre as faces' : ''}`,
    resultado: ct.VRd1, unidade: 'kN/m', norma: `${NBR}, 19.4 (laje sem armadura transversal; a confirmar)`, aConfirmar: true,
    entradas: { t, d1: mat.d1, d, asCm2: pv, ncompMax, fctd: mat.fctd, fck: mat.fck, fcd: mat.fcd, rho, k, tauRd, sigmaCp, VRd1: ct.VRd1, VRd2: ct.VRd2, V: Vmax, grampos: r.cortante.grampos ? 1 : 0 },
  });
  // reforços locais
  const colunas = e.colunas, linhas = e.linhas;
  const fv: [number, number, number][] = colunas.slice(0, -1).map((a, i) => [a, colunas[i + 1], Math.max(0, ...pp.filter((p) => p.s >= a - 1e-9 && p.s < colunas[i + 1] - 1e-9).map((p) => p.rv))]);
  const fh: [number, number, number][] = linhas.slice(0, -1).map((a, i) => [a, linhas[i + 1], Math.max(0, ...pp.filter((p) => p.z >= a - 1e-9 && p.z < linhas[i + 1] - 1e-9).map((p) => p.rh))]);
  P('dimensionamento', T, { descricao: 'Faixas da malha da casca para os reforços locais: necessidade máxima por coluna (vertical) e por linha (horizontal) contra a malha adotada', formula: 'faixa = [início, fim, necessidade máx (cm²/m)]; reforço onde necessidade > adotada', expressao: `${fv.length} colunas e ${fh.length} linhas`, resultado: fv.length + fh.length, unidade: 'faixas', entradas: { colunas: JSON.stringify(fv), linhas: JSON.stringify(fh), adotadoVert: pv, adotadoHor: ph, phiMinVert: r.vert?.phi ?? 10, phiMinHor: r.hor?.phi ?? 0, soHorizontal: op.paredeSoHorizontal ? 1 : 0 } });
  for (const q of r.reforcos) P('detalhamento', T, { descricao: `Reforço local ${q.direcao} entre ${fm(q.de)} e ${fm(q.ate)} m: área adicional Σ(necessidade − adotada)·largura e barras n × φ (metade em cada face)`, formula: 'As,ref = Σ (r − adotado)·Δ; n barras de φ ≥ φ da malha, número par, até 6 por face', expressao: `As,ref = ${fm(q.As)} cm² → ${q.n} φ${fm(q.phi)} (${cm2((q.n * barArea(q.phi)))})`, resultado: q.As, unidade: 'cm²', norma: `${NBR}, 18.4 e 24`, aConfirmar: true, entradas: { direcao: q.direcao, de: q.de, ate: q.ate, As: q.As, n: q.n, phi: q.phi } });
  fimPano(P, T, r);
}

function fimPano(P: ReturnType<typeof mk>, T: string, r: SaidaPano) {
  P('dimensionamento', T, { descricao: `Resultado do pano: ${r.status === 'ok' ? 'atende' : 'NÃO atende'}`, formula: 'status = ok se as verificações do pano atendem', expressao: r.mensagens.length ? r.mensagens.join(' ') : 'sem mensagens', resultado: r.status, unidade: '', entradas: { utilConcreto: r.tensoes.utilConcreto, utilAco: r.tensoes.utilAco, tracaoNoTopo: r.tracaoNoTopo ? 1 : 0 } });
}

// ------------------------------------------------------------------------------------------------ lado curto (barra)

export interface CtxLadoBarra { elemento: string; lado: string; lance: string; e: EntradaLadoBarra; r: ResultadoLadoBarra; taxaMin: number; taxaMax: number }

/** Lado curto dimensionado como pilar por fibras: momentos de projeto, malha vertical, utilização por combinação e estribos. */
export function registrarLadoBarra(mem: Registrador, x: CtxLadoBarra) {
  const { e, r } = x;
  const P = mk(mem, x.elemento), T = `Lado curto ${x.lado} (pilar)`;
  const { L, t, a, le, conc, fyd } = e, Ac = L * t;
  P('dimensionamento', T, { descricao: 'Seção do lado curto (tratado como pilar), esbeltez nas duas direções e limites de armadura', formula: 'Ac = L·t; λp = ℓe·√12/L; λo = ℓe·√12/t; As,mín = máx(ρmín·Ac; 0,15·Nd,máx/fyd); As,máx = ρmáx·Ac', expressao: `Ac = ${fm(L)}·${fm(t)} = ${fm(Ac)} m²; λp = ${fm(r.lambdaP)}; λo = ${fm(r.lambdaO)}; As,mín = ${cm2(r.AsMin)}; As,máx = ${cm2(r.AsMax)}`, resultado: Ac, unidade: 'm²', norma: `${NBR}, 17.3.5.3 e 15.8.2`, entradas: { L, t, a, le, Ac, fyd, taxaMin: x.taxaMin, taxaMax: x.taxaMax, NdMax: Math.max(0, ...e.esforcos.map((q) => -q.N)), AsMin: r.AsMin, AsMax: r.AsMax, lambdaP: r.lambdaP, lambdaO: r.lambdaO } });
  const proj: EsforcoLado[] = [];
  for (const q of e.esforcos) {
    const Nd = Math.max(0, -q.N);
    if (Nd <= 0) { proj.push(q); P('esforcos', T, { descricao: `Combinação ${q.nome}: sem compressão (tração ou nula); os esforços não recebem momento mínimo nem 2ª ordem`, formula: 'Nd = máx(0; −N)', expressao: `N = ${fm(q.N)} kN`, resultado: q.N, unidade: 'kN', entradas: { combinacao: q.nome, N: q.N, Mp: q.Mp, Mo: q.Mo } }); continue; }
    const m1p = Nd * (0.015 + 0.03 * L), m1o = Nd * (0.015 + 0.03 * t), m2p = m2dPadrao(Nd, L, le, conc, Ac), m2o = m2dPadrao(Nd, t, le, conc, Ac);
    const p = Math.max(Math.abs(q.Mp), m1p) + m2p, o = Math.max(Math.abs(q.Mo), m1o) + m2o;
    proj.push({ nome: q.nome, N: q.N, Mp: -p, Mo: o });
    P('esforcos', T, {
      descricao: `Combinação ${q.nome}: momentos de projeto = máx(|M|; M1d,mín) + M2d em cada direção`,
      formula: 'M1d,mín = Nd·(0,015 + 0,03·h); M2d = Nd·ℓe²/10·mín[0,005/(h·(ν + 0,5)); 0,005/h] se λ > 35 (αb = 1); M = máx(|M|; M1d,mín) + M2d',
      expressao: `Nd = ${fm(Nd)} kN; plano: máx(${fm(Math.abs(q.Mp))}; ${fm(m1p)}) + ${fm(m2p)} = ${fm(p)}; fora do plano: máx(${fm(Math.abs(q.Mo))}; ${fm(m1o)}) + ${fm(m2o)} = ${fm(o)} kN·m`,
      resultado: p, unidade: 'kN·m', norma: `${NBR}, 11.3.3.4.3 e 15.8.3.3.2`, entradas: { combinacao: q.nome, Nd, Mp: q.Mp, Mo: q.Mo, L, t, le, fcd: conc.fcd, Ac, m1p, m1o, m2p, m2o, p, o },
    });
  }
  if (!r.vert) { P('dimensionamento', T, { descricao: 'Nenhuma malha vertical cabe entre a taxa mínima e a máxima', formula: 'As,mín ≤ As ≤ As,máx', expressao: r.mensagens.join(' '), resultado: 'sem solução', unidade: '', entradas: { AsMin: r.AsMin, AsMax: r.AsMax } }); return; }
  const bars = barrasDoLado(L, t, a, r.vert), As = bars.reduce((s, b) => s + b.A, 0), S = secaoDoLado(L, t, bars, conc, fyd);
  P('detalhamento', T, { descricao: `Malha vertical adotada φ${fm(r.vert.phi)} c/${fm(r.vert.s * 100)} cm por face (menor malha que atende): ${bars.length} barras no lado`, formula: 'As = n·π·φ²/4, As,mín ≤ As ≤ As,máx', expressao: `As = ${bars.length}·π·(${fm(r.vert.phi / 1000)})²/4 = ${cm2(As)}`, resultado: As, unidade: 'm²', norma: `${NBR}, 18.4.2`, entradas: { phi: r.vert.phi, s: r.vert.s, nBarras: bars.length, As, AsMin: r.AsMin, AsMax: r.AsMax } });
  registrarUtilizacoes(P, T, S, proj, r.util, r.combo, `armadura adotada (${bars.length} barras φ${fm(r.vert.phi)})`);
  P('detalhamento', T, { descricao: `Estribos do lado curto φ${fm(r.estribo.phi)} c/${fm(r.estribo.s * 100)} cm`, formula: 'φt ≥ máx(5 mm; φℓ/4); s ≤ mín(20 cm; t; 12·φℓ)', expressao: `φt = ${fm(r.estribo.phi)} mm; s = ${fm(r.estribo.s)} m`, resultado: r.estribo.s, unidade: 'm', norma: `${NBR}, 18.4.3`, entradas: { phiL: r.vert.phi, t, phi: r.estribo.phi, s: r.estribo.s } });
  if (r.mensagens.length) P('dimensionamento', T, { descricao: 'Avisos do lado curto', formula: '', expressao: r.mensagens.join(' '), resultado: r.ok ? 'ok' : 'fail', unidade: '', entradas: {} });
}

/** Utilização da seção por fibras em cada combinação determinante: MRd nas duas direções simétricas do momento oblíquo. */
function registrarUtilizacoes(P: ReturnType<typeof mk>, T: string, S: FiberSection, es: EsforcoLado[], utilTotal: number, comboTotal: string, rotulo: string) {
  let pior = 0;
  for (const q of determinantes(es)) {
    const Nd = -q.N, mx = -q.Mp, my = Math.abs(q.Mo), mom = Math.hypot(mx, my) / 1000;
    let u = 0, Rs: (number | null)[] = [];
    if (mom < 1e-12) { const R = fiberCapacity(S, Nd / 1000, 1, 0); u = R === null ? 99 : 0; Rs = [R]; }
    else for (const [a, c] of [[mx, my], [mx, -my]] as const) { const R = fiberCapacity(S, Nd / 1000, a, c); u = Math.max(u, R === null ? 99 : mom / R); Rs.push(R); }
    if (u >= pior) pior = u;
    P('dimensionamento', T, { descricao: `Combinação ${q.nome}: flexo-compressão oblíqua do lado com a ${rotulo} (integração por fibras, parábola-retângulo)`, formula: 'util = √(Mx² + My²)/MRd(Nd, direção) ≤ 1 (maior das duas direções simétricas do momento oblíquo)', expressao: Rs[0] === null ? `Nd = ${fm(Nd)} kN fora do intervalo resistente → util = 99` : `util = ${fm(mom)}/máx(${Rs.map((R) => (R === null ? '—' : fm(R))).join('; ')}) → ${fm(u)}`, resultado: u, unidade: '', norma: `${NBR}, 17.2.5`, entradas: { combinacao: q.nome, Nd, mx, my, mom, ...Object.fromEntries(Rs.map((R, i) => [`MRd_${i + 1}`, R ?? 'fora'])) }, observacao: 'Esforços em kN e kN·m; MRd em MN·m.' });
  }
  P('dimensionamento', T, { descricao: `Utilização do lado (maior das combinações determinantes: ${comboTotal})`, formula: 'util = máx(util_i)', expressao: `util = ${fm(utilTotal)} ${utilTotal <= 1 ? '≤' : '>'} 1`, resultado: utilTotal, unidade: '', norma: `${NBR}, 17.2.5`, entradas: { util: utilTotal, combinacao: comboTotal, maxCalculado: pior } });
}

export interface CtxLadoGlobal {
  elemento: string; lado: string; lance: string; Lc: number; t: number; S: FiberSection; es: EsforcoLado[]; util: number; combo: string;
  vert: { phi: number; s: number } | null; nReforcos: number; nBarras: number; As: number;
}

/** Verificação global do lado em casca com a armadura vertical adotada pelos panos (flexo-compressão oblíqua por fibras). */
export function registrarLadoGlobal(mem: Registrador, x: CtxLadoGlobal) {
  const P = mk(mem, x.elemento), T = `Verificação global do lado ${x.lado}`;
  P('dimensionamento', T, { descricao: `Seção do lado no lance (trecho existente, E6d) com a malha vertical adotada ${x.vert ? `φ${fm(x.vert.phi)} c/${fm(x.vert.s * 100)} cm` : '(nenhuma)'} e ${x.nReforcos} reforço(s) vertical(is): ${x.nBarras} barras`, formula: 'seção retangular L·t; As = Σ área das barras', expressao: `L = ${fm(x.Lc)} m; t = ${fm(x.t)} m; As = ${cm2(x.As)}`, resultado: x.As, unidade: 'm²', norma: `${NBR}, 17.2`, entradas: { L: x.Lc, t: x.t, nBarras: x.nBarras, As: x.As, reforcos: x.nReforcos } });
  registrarUtilizacoes(P, T, x.S, x.es, x.util, x.combo, 'armadura vertical adotada');
}

// ------------------------------------------------------------------------------------------------ aberturas

export interface CtxAbertura { elemento: string; lado: string; lance: string; e: EntradaAbertura; r: ResultadoAbertura }

/** Verga, peitoril, montantes e cantos da abertura (a malha dos panos não é descontada). */
export function registrarAbertura(mem: Registrador, x: CtxAbertura) {
  const { e, r } = x;
  const P = mk(mem, x.elemento), T = `Abertura ${e.a.tipo === 'porta' ? 'porta' : 'janela'} ${e.a.id} (lado ${x.lado})`;
  const dTr = (h: number) => Math.max(0.05, h - e.cobrimento - 0.01);
  P('dimensionamento', T, { descricao: `Geometria da abertura: largura ${fm(e.a.largura)} m, altura ${fm(e.a.altura)} m, peitoril ${fm(e.a.peitoril)} m; faixa acima (verga) com ${fm(e.hVerga)} m e abaixo (peitoril) com ${fm(e.hPeitoril)} m`, formula: 'hverga = H − topo da abertura; hpeitoril = base da abertura', expressao: `s = ${fm(e.a.s)} m; largura = ${fm(e.a.largura)} m; t = ${fm(e.t)} m`, resultado: e.a.largura, unidade: 'm', entradas: { s: e.a.s, largura: e.a.largura, altura: e.a.altura, peitoril: e.a.peitoril, hVerga: e.hVerga, hPeitoril: e.hPeitoril, t: e.t, cobrimento: e.cobrimento } });
  const trac = (f: { combos: { N: number; M: number; V: number }[] }, h: number, nome: string, nec: number) => {
    const d = dTr(h), z = 0.9 * d;
    let melhor = 0, ic = 0;
    f.combos.forEach((c, i) => { const v = Math.max(c.N / 2 + Math.abs(c.M) / z, c.N / 2 - Math.abs(c.M) / z) / (e.fyd * 1000) * 1e4; if (v > melhor) { melhor = v; ic = i; } });
    const c = f.combos[ic];
    P('dimensionamento', T, { descricao: `Armadura de ${nome}: tração da camada inferior da faixa de ${fm(h)} m (normal e momento integrados nas combinações; combinação ${ic + 1} determinante)`, formula: 'd = h − cob − 1 cm; z = 0,9·d; T = máx(N/2 + |M|/z; N/2 − |M|/z); As = T/(fyd·1000)·10⁴', expressao: `d = ${fm(d)}; z = ${fm(z)}; N = ${fm(c?.N ?? 0)} kN; M = ${fm(c?.M ?? 0)} kN·m → As = ${fm(nec)} cm²`, resultado: nec, unidade: 'cm²', norma: `${NBR}, 17.2.2 (a confirmar)`, aConfirmar: true, entradas: { h, cobrimento: e.cobrimento, d, z, fyd: e.fyd, N: c?.N ?? 0, M: c?.M ?? 0, indice: ic, combos: JSON.stringify(f.combos.map((q) => [q.N, q.M, q.V])) } });
  };
  trac(e.verga, e.hVerga, 'verga', r.necessaria.verga);
  if (e.a.tipo === 'janela') trac(e.peitoril, e.hPeitoril, 'peitoril', r.necessaria.peitoril);
  P('dimensionamento', T, { descricao: 'Montantes: barras verticais interrompidas pela largura da abertura (metade em cada lado)', formula: 'As,montante = As,vert vizinho·largura (cm²: duas faces × As × largura / 2 lados)', expressao: `As = ${fm(e.asVertVizinho)}·${fm(e.a.largura)} = ${fm(r.necessaria.montante)} cm²`, resultado: r.necessaria.montante, unidade: 'cm²', entradas: { asVertVizinho: e.asVertVizinho, largura: e.a.largura } });
  const V = Math.max(0, ...e.verga.combos.map((c) => Math.abs(c.V))), dV = dTr(e.hVerga);
  const cs = beamShear(e.t, dV, V, e.conc, e.fywk, e.gammaS);
  P('dimensionamento', T, { descricao: 'Cortante da verga como viga de largura t (modelo I)', formula: 'VRd2 = 0,27·αv2·fcd·t·d; Vc = 0,6·fctd·t·d; Asw/s = máx(Asw,mín/s; (Vsd − Vc)/(0,9·d·fywd))', expressao: `Vsd = ${fm(V)} kN; VRd2 = ${fm(cs.VRd2)} kN; Vc = ${fm(cs.Vc)} kN; Asw/s = ${fm(cs.aswS * 1e4)} cm²/m ${cs.ok ? '' : '(biela esmagada)'}`, resultado: cs.VRd2, unidade: 'kN', norma: `${NBR}, 17.4.2.2`, entradas: { t: e.t, d: dV, Vsd: V, fcd: e.conc.fcd, av2: e.conc.av2, fctd: e.conc.fctd, fctm: e.conc.fctm, fywk: e.fywk, gammaS: e.gammaS, VRd2: cs.VRd2, Vc: cs.Vc, aswS: cs.aswS, aswMin: cs.aswMin } });
  const ar = r.armadura, fb = (b?: { n: number; phi: number }) => (b ? `${b.n} φ${fm(b.phi)}` : '—');
  P('detalhamento', T, { descricao: `Armadura adotada (${r.origem === 'calculada' ? 'calculada' : r.origem === 'bloqueada' ? 'bloqueada pelo usuário' : 'padrão por tipo de abertura'}): verga ${fb(ar.verga)}, estribo φ${fm(ar.estribo.phi)} c/${fm(ar.estribo.s * 100)} cm${ar.peitoril ? `, peitoril ${fb(ar.peitoril)}` : ''}, montante ${fb(ar.montante)}${ar.canto ? `, canto ${fb(ar.canto)}` : ''}`, formula: 'As adotada = n·π·φ²/4 ≥ As necessária', expressao: `verga ${fm(ar.verga.n * barArea(ar.verga.phi) * 1e4)} cm² ≥ ${fm(r.necessaria.verga)}; montante ${fm(ar.montante.n * barArea(ar.montante.phi) * 1e4)} cm² ≥ ${fm(r.necessaria.montante)}`, resultado: ar.verga.n * barArea(ar.verga.phi) * 1e4, unidade: 'cm²', entradas: { origem: r.origem, vergaN: ar.verga.n, vergaPhi: ar.verga.phi, montanteN: ar.montante.n, montantePhi: ar.montante.phi, estriboPhi: ar.estribo.phi, estriboS: ar.estribo.s, ...(ar.peitoril ? { peitorilN: ar.peitoril.n, peitorilPhi: ar.peitoril.phi } : {}) }, observacao: r.mensagens.join(' ') || undefined });
}

// ------------------------------------------------------------------------------------------------ viga embutida

export interface CtxVigaEmbutida {
  elemento: string; parede: string; b: number; h: number; cobInf: number; d: number; taxaMin: number; AsMin: number; fyd: number; conc: Concrete;
  bars: { n: number; phi: number; layers: number; As: number } | null; fywk: number; gammaS: number; estribo: { phi: number; s: number } | null; texto: string; estTxt: string;
}

/** Viga embutida em parede de concreto: armadura mínima da norma (a parede leva a carga). */
export function registrarVigaEmbutida(mem: Registrador, x: CtxVigaEmbutida) {
  const P = mk(mem, x.elemento), T = `Viga embutida em ${x.parede}`;
  P('dimensionamento', T, { descricao: 'A viga corre sobre o eixo da parede de concreto, apoiada em todo o comprimento: não vence vão e a carga vai para a parede (casca); armadura própria mínima', formula: x.taxaMin > 0 ? 'As,mín = ρmín·b·h (taxa das opções)' : 'As,mín = máx(ρmín,NBR·Ac; 0,8·W0·fctk,sup/(z·fyd)) (17.3.5.2.1)', expressao: `b = ${fm(x.b)} m; h = ${fm(x.h)} m; d = ${fm(x.d)} m → As,mín = ${cm2(x.AsMin)}`, resultado: x.AsMin, unidade: 'm²', norma: `${NBR}, 17.3.5.2.1 (critério do programa de referência, a confirmar)`, aConfirmar: true, entradas: { b: x.b, h: x.h, cobInf: x.cobInf, d: x.d, taxaMin: x.taxaMin, fyd: x.fyd, AsMin: x.AsMin } });
  P('detalhamento', T, { descricao: `Armadura longitudinal adotada em cada face: ${x.texto}`, formula: 'barras de menor número com área ≥ As,mín na largura b', expressao: x.bars ? `As = ${cm2(x.bars.As)} ≥ ${cm2(x.AsMin)}` : 'não cabe na largura', resultado: x.bars?.As ?? 0, unidade: 'm²', entradas: { n: x.bars?.n ?? 0, phi: x.bars?.phi ?? 0, camadas: x.bars?.layers ?? 0, As: x.bars?.As ?? 0, AsMin: x.AsMin } });
  const sh = beamShear(x.b, x.d, 0, x.conc, x.fywk, x.gammaS);
  P('detalhamento', T, { descricao: `Estribo mínimo ${x.estTxt}`, formula: 'Vsd = 0: Asw/s = ρsw,mín·bw = 0,2·fctm/fywk·bw; s ≤ mín(0,6·d; 30 cm)', expressao: `Asw/s = ${fm(sh.aswS * 1e4)} cm²/m; smáx = ${fm(sh.smax)} m`, resultado: sh.aswS, unidade: 'm²/m', norma: `${NBR}, 17.4.1.1.1`, entradas: { bw: x.b, d: x.d, fctm: x.conc.fctm, fywk: x.fywk, gammaS: x.gammaS, aswS: sh.aswS, smax: sh.smax, phi: x.estribo?.phi ?? 0, s: x.estribo?.s ?? 0 } });
}

// ------------------------------------------------------------------------------------------------ base e parcela axial (global)

export type { Forcas };
