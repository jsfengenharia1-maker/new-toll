// Dimensionamento das lajes nervuradas bidirecionais (frente E3c): esforços de cada nervura a partir das barras da grelha
// (faixas adjacentes agrupadas por sobreposição), flexão positiva em T e negativa em retângulo, mesa, cortante a cada
// `nervuradaCortanteDist`·d (19.4.1; estribos pelo modelo I onde o VRd1 não basta, ou sempre quando as nervuras cisalham
// como viga), armadura base considerada ou não por direção, uniformização entre nervuras vizinhas, armaduras e quantitativo
// de aço. Mensagens vão para a laje (`Nervuradas: ...`). Núcleo puro; kN, m; áreas das armaduras em cm².
import { barArea, beamFlexure, beamShear, crackLimit, crackWidth } from '../concrete';
import type { P } from '../geom/faces';
import { areaPoligono } from '../geom/faces';
import type { AnaliseEdificio, GrelhaPavimento } from './analitico';
import type { ResultadoLaje } from './dimensionamento';
import { acoDe, cobrimentoLaje, concretoDe, gamas } from './materiais';
import type { OpcoesCalculo } from './opcoes';
import { abacosEfetivos, avisosForma, arranjoNervuras, geometriaBidirecional, lajeComAbacos, passoMalhaNervurada, quantitativoNervurada, verificarGeometria, volumeRebaixoAbacos, type ArranjoNervuras, type Nervura, type QuantitativoNervurada, type Regime } from './nervuradas';
import { baseDoAbaco, barrasBaseAbaco, trechosDentro, type BarrasBaseAbaco } from './abacos';
import { errosTipoLaje } from './tiposLaje';
import { lajesQueTocam, parteSalienteViga } from './secaoViga';
import { casosDaObra, pavimentosDoGrupo, type BarrasNervura, type BuildingModel, type Laje } from './types';
import { arred, gruposIgualacao, vrd1 } from './vigotas';
import { woodArmerNos } from './dimensionamento';
import { escolherBarrasLaje } from './detalhamentoLajes';
import { ID_PADRAO, linhaLajes, tabelaDe } from './tabelasArmadura';
import { areaBarraBase, areaTela, telaPor } from './telasSoldadas';
import type { BaseFaceLaje } from './types';
import { dentroPoligono } from '../geom/faces';

const FI_NERV = [6.3, 8, 10, 12.5, 16, 20, 25];
const DMAX = 0.019;
const fmt = (x: number, n = 2) => x.toFixed(n).replace('.', ',');
const fphi = (phi: number) => String(phi).replace('.', ',');
const r3 = (x: number) => +x.toFixed(3);

// ---------------------------------------------------------------- esforços das nervuras

/** Linha da grelha (cadeia de barras de uma direção): posição transversal `c`, largura da faixa `w` e esforços por faixa nos nós. */
interface LinhaGrelha { dir: 0 | 1; c: number; w: number; x: number[]; Mmax: number[]; Mmin: number[]; V: number[] }

/** Linhas da grelha da laje nas duas direções: momentos (+ traciona embaixo) e cortantes por faixa, no referencial da laje. */
function linhasDaGrelha(g: GrelhaPavimento, l: Laje, fat: number[], arr: ArranjoNervuras): LinhaGrelha[] {
  const m = g.modelo, res = g.res!, out: LinhaGrelha[] = [];
  const soma = (bi: number, k: number, sinal: number) => fat.reduce((t, f, ic) => t + f * sinal * res.esforcos[ic][bi][k], 0);
  for (const dir of [0, 1] as const) {
    const adj = new Map<number, { no: number; bar: number }[]>();
    m.barras.forEach((br, i) => {
      const tg = g.barras[i];
      if (tg.tipo !== 'laje' || tg.ref !== l.id || tg.dir !== dir || !tg.largura) return;
      adj.set(br.i, [...(adj.get(br.i) ?? []), { no: br.j, bar: i }]);
      adj.set(br.j, [...(adj.get(br.j) ?? []), { no: br.i, bar: i }]);
    });
    const visto = new Set<number>();
    const pos = (n: number): [number, number] => { const q = arr.loc([m.nos[n][0], m.nos[n][1]]); return dir === 0 ? [q[0], q[1]] : [q[1], q[0]]; }; // [ao longo, transversal]
    for (const [ini, vz] of adj) {
      if (vz.length !== 1 || visto.has(ini)) continue;
      let nos = [ini], bars: number[] = [];
      visto.add(ini);
      for (;;) { const prox = adj.get(nos.at(-1)!)!.find((x) => !visto.has(x.no)); if (!prox) break; nos.push(prox.no); bars.push(prox.bar); visto.add(prox.no); }
      if (!bars.length) continue;
      if (pos(nos.at(-1)!)[0] < pos(nos[0])[0]) { nos = nos.reverse(); bars = bars.reverse(); }
      const ini0: { M: number; V: number }[] = [], fim0: { M: number; V: number }[] = [];
      bars.forEach((bi, j) => {
        const br = m.barras[bi], frente = br.i === nos[j];
        const Mi = soma(bi, 5, -1), Mj = soma(bi, 11, 1), Vi = Math.abs(soma(bi, 1, -1)), Vj = Math.abs(soma(bi, 7, 1));
        ini0.push(frente ? { M: Mi, V: Vi } : { M: Mj, V: Vj });
        fim0.push(frente ? { M: Mj, V: Vj } : { M: Mi, V: Vi });
      });
      const Mmax: number[] = [], Mmin: number[] = [], V: number[] = [];
      for (let n = 0; n < nos.length; n++) {
        const cand = [n > 0 ? fim0[n - 1] : null, n < bars.length ? ini0[n] : null].filter((x): x is { M: number; V: number } => !!x);
        Mmax.push(Math.max(...cand.map((x) => x.M))); Mmin.push(Math.min(...cand.map((x) => x.M))); V.push(Math.max(...cand.map((x) => x.V)));
      }
      out.push({ dir, c: pos(nos[0])[1], w: g.barras[bars[0]].largura!, x: nos.map((n) => pos(n)[0]), Mmax, Mmin, V });
    }
  }
  return out;
}

const interp = (x: number[], v: number[], t: number): number | null => {
  const n = x.length - 1;
  if (t < x[0] - 1e-6 || t > x[n] + 1e-6) return null;
  for (let i = 0; i < n; i++) if (t <= x[i + 1] + 1e-9) { const d = x[i + 1] - x[i]; return d < 1e-12 ? v[i] : v[i] + ((v[i + 1] - v[i]) * (t - x[i])) / d; }
  return v[n];
};

export interface EsforcosNervura { x: number[]; Mmax: number[]; Mmin: number[]; V: number[] }
/**
 * Esforços de uma nervura (kN·m, kN) nas seções `x` (m, a partir da ponta inicial): soma, nas faixas da grelha da mesma direção
 * que a nervura cobre (banda de largura = intereixo em torno do eixo), do esforço da faixa × (parte da faixa dentro da banda ÷
 * largura da faixa); as envoltórias de momento e o cortante de cada faixa adjacente são agrupados antes (K1.13.3.1-5).
 */
export function esforcosDaNervura(rib: Nervura, linhas: LinhaGrelha[], s: number, arr: ArranjoNervuras): EsforcosNervura {
  const pa = arr.loc(rib.a), pz = arr.loc(rib.z), alo = rib.dir === 0 ? pa[0] : pa[1], aho = rib.dir === 0 ? pz[0] : pz[1];
  const lo = Math.min(alo, aho), hi = Math.max(alo, aho);
  const cob = linhas.flatMap((ln) => {
    if (ln.dir !== rib.dir) return [];
    const ov = Math.max(0, Math.min(ln.c + ln.w / 2, rib.c + s / 2) - Math.max(ln.c - ln.w / 2, rib.c - s / 2)) / ln.w;
    return ov > 1e-9 && ln.x.at(-1)! > lo + 1e-6 && ln.x[0] < hi - 1e-6 ? [{ ln, ov }] : [];
  });
  const xs = [...new Set([lo, hi, ...cob.flatMap(({ ln }) => ln.x.filter((t) => t > lo + 1e-6 && t < hi - 1e-6))].map((t) => Math.round(t * 1e6) / 1e6))].sort((a, z) => a - z);
  const at = (k: 'Mmax' | 'Mmin' | 'V') => xs.map((t) => cob.reduce((tot, { ln, ov }) => tot + ov * (interp(ln.x, ln[k], t) ?? 0), 0));
  return { x: xs.map((t) => t - lo), Mmax: at('Mmax'), Mmin: at('Mmin'), V: at('V') };
}

// ---------------------------------------------------------------- escolha de barras

export interface BarraEscolhida { n: number; phi: number; As: number }
const COMBINACOES: BarraEscolhida[] = FI_NERV.flatMap((phi) => [1, 2, 3, 4, 5, 6].map((n) => ({ n, phi, As: n * barArea(phi) * 1e4 }))).sort((a, z) => a.As - z.As || a.n - z.n);

/** Largura mínima da nervura (m) para n barras de φ mm em uma camada, com estribo φ `phiEst` mm e cobrimento `cob`. */
export const larguraNecessaria = (n: number, phi: number, phiEst: number, cob: number): number => 2 * (cob + phiEst / 1000) + (n * phi) / 1000 + (n - 1) * Math.max(0.02, phi / 1000, 1.2 * DMAX);

/** Menor combinação (em área) que cobre `AsNec` (cm²) e cabe na largura `bw`; sem caber, a menor por área, com `cabe: false`. */
export function escolherBarras(AsNec: number, bw: number, phiEst: number, cob: number, phis?: number[]): (BarraEscolhida & { cabe: boolean; need: number }) | null {
  if (AsNec <= 1e-9) return null;
  const ok = COMBINACOES.filter((x) => x.As >= AsNec - 1e-9 && (!phis || phis.includes(x.phi)));
  if (!ok.length) return null;
  const cabem = ok.find((x) => larguraNecessaria(x.n, x.phi, phiEst, cob) <= bw + 1e-9);
  const x = cabem ?? ok[0];
  return { ...x, cabe: !!cabem, need: larguraNecessaria(x.n, x.phi, phiEst, cob) };
}

// ---------------------------------------------------------------- resultados

/** `solido`: seção inteira dentro de um ábaco (banda maciça de largura igual ao intereixo; VRd1 com essa largura). */
export interface SecaoCortante { x: number; V: number; VRd: number; estribo: boolean; solido?: boolean }
/**
 * Trecho de uma nervura dentro de um ábaco (E3d): momento negativo da banda sobre o pilar (seção maciça de largura = intereixo e altura
 * do ábaco), armadura necessária descontada da base do ábaco (colaborante), reforço nas nervuras (que precisa caber na largura da nervura e
 * cobrir o momento na borda do ábaco), comprimento da armadura negativa e cortante da banda maciça.
 */
export interface ArmaduraNervuraAbaco {
  abaco: string; x0: number; x1: number; Mneg: number;
  /** Armadura negativa necessária no ábaco (cm² por banda), a da base do ábaco (cm²) e a necessária na borda do ábaco, na nervura (cm²). */
  AsNec: number; AsBase: number; AsBorda: number;
  barras: BarraEscolhida | null; cabe: boolean; larguraMin: number; comprimento: number; dupla: boolean;
  /** Cortante máximo no trecho (kN por banda), VRd1 e VRd2 da banda maciça e estribos se VRd1 < V ≤ VRd2. */
  Vmax: number; VRd1: number; VRd2: number; estribo: { phi: number; s: number; barras: number } | null; ok: boolean;
}
/** `MFreq` e `wk`: momento negativo da combinação frequente (kN·m por nervura, ≥ 0) e abertura de fissuras (mm) com as barras escolhidas (E5g); 0 se a verificação está desligada. */
export interface ArmaduraSup { Mneg: number; AsNec: number; barras: BarraEscolhida | null; comprimento: number; macica: boolean; bwEfetiva: number; dupla: boolean; MFreq: number; wk: number }
export interface NervuraDim {
  dir: 0 | 1; indice: number; a: P; z: P; L: number;
  /** Esforços de cálculo por nervura (kN·m, kN). */
  mPos: number; mNeg: [number, number]; Vmax: number;
  /** `base` = barras corridas consideradas no dimensionamento; `baseInformada` = as informadas na direção (consideradas ou não), `baseSup` = as superiores informadas. */
  inf: { AsNec: number; base: BarraNervura | null; baseInformada: BarraNervura | null; baseSup: BarraNervura | null; reforco: BarraEscolhida | null; total: number; cabe: boolean; larguraMin: number; comprimento: number; Mu: number };
  sup: [ArmaduraSup | null, ArmaduraSup | null];
  cortante: { regime: Regime; passo: number; VRd1: number; VRd2: number; secoes: SecaoCortante[]; zonas: [number, number][]; estribo: { phi: number; s: number; barras: number } | null; ok: boolean };
  /** Grupo de uniformização (nervuras da mesma direção com a mesma armadura). */
  grupo: number;
  /** Trechos da nervura dentro de ábacos (E3d); vazio se não há. */
  abacos: ArmaduraNervuraAbaco[];
  /** Concentração da armadura do grupo nas nervuras indicadas (E5g): 'recebe' = indicada (leva a armadura do grupo), 'cede' = só o mínimo. Ausente = sem concentração. */
  concentracao?: 'recebe' | 'cede';
}
type BarraNervura = BarrasNervura & { As: number };

export interface MesaNervurada {
  /** A flexão da mesa é exigida (espaçamento > 65 cm). */
  exigida: boolean;
  /** Distância livre (m), carga de cálculo (kN/m²), momento (kN·m/m) e armadura necessária e adotada (cm²/m). */
  livre: number; qd: number; Md: number; AsNec: number; AsAdotada: number; phi: number; s: number;
  /**
   * Malha da mesa e das zonas maciças considerada na verificação (E5g, `baseNervurada.considerarMesa`): armadura da malha (cm²/m, o menor
   * valor das duas direções) nas faces superior e inferior, momento positivo no meio do vão da mesa (qd·ℓ²/24, kN·m/m), armadura positiva
   * necessária (cm²/m; só se a flexão da mesa é exigida) e o complemento calculado em cada face (cm²/m) além da malha.
   */
  malha?: { AsSup: number; AsInf: number; MdPos: number; AsNecPos: number; complementoSup: number; complementoInf: number; phi: number; sSup: number; sInf: number };
}
/**
 * Zona maciça (faixa junto às vigas e zonas manuais, fora dos ábacos) dimensionada por Wood-Armer (E5g, K1.13.3-1): momentos de cálculo por
 * metro nos nós da grelha dentro da zona (inferior ≥ 0, superior ≤ 0), armadura necessária por direção (mínimo da laje maciça), malha da mesa
 * considerada e armadura complementar (cm²/m) com a bitola e o espaçamento escolhidos.
 */
export interface ZonaMacicaNervurada {
  area: number; nos: number;
  Minf: [number, number]; Msup: [number, number];
  AsNecInf: [number, number]; AsNecSup: [number, number];
  AsMalhaInf: [number, number]; AsMalhaSup: [number, number];
  complementoInf: [number, number]; complementoSup: [number, number];
  barrasInf: ({ phi: number; s: number } | null)[]; barrasSup: ({ phi: number; s: number } | null)[];
  ok: boolean;
}
export interface PosicaoAcoNervurada { tipo: 'inferior' | 'base' | 'baseSup' | 'superior' | 'estribo' | 'mesa' | 'abaco' | 'abacoBase' | 'zonaMacica'; aco: string; phi: number; n: number; comprimento: number }
export interface ResultadoNervurada {
  laje: string; nome: string; pavimentos: string[];
  /** Pavimentos do grupo que repetem a laje (multiplicam os quantitativos). */
  repeticoes: number;
  forma: string; formaNome: string; recuperavel: boolean; h: number; capa: number; hEnch: number; intereixo: [number, number]; bw: [number, number];
  pp: number; volume: number;
  regime: [Regime, Regime];
  nervuras: NervuraDim[]; grupos: { dir: 0 | 1; nervuras: number[] }[];
  /** Base das nervuras detalhada: desenhada e medida (senão só a descrição geral na listagem). */
  baseDetalhada: boolean;
  mesa: MesaNervurada;
  /** Zona maciça por Wood-Armer (E5g); ausente se a opção está desligada ou não há zona maciça fora dos ábacos. */
  zonaMacica?: ZonaMacicaNervurada;
  quantitativo: QuantitativoNervurada;
  /** Ábacos da laje (zona efetiva, m²) e a armadura base de cada um (E3d). */
  abacos: { id: string; hAbaco: number; area: number; automatico: boolean; pilar?: string; base: BarrasBaseAbaco[]; padrao: boolean }[];
  posicoes: PosicaoAcoNervurada[]; peso: number;
  mensagens: string[]; status: 'ok' | 'fail';
}

// ---------------------------------------------------------------- dimensionamento

/**
 * Armadura necessária (cm²/m) de uma laje nervurada bidirecional para o momento de cálculo `M` (kN·m/m) na face `inf`
 * (seção T: mesa = intereixo) ou `sup` (retângulo da nervura) e a direção `dir` (0 = X, 1 = Y), sem a fissuração (V6f,
 * mapas de taxa). O momento por nervura é `M` × intereixo e a armadura da nervura, dividida pelo intereixo, dá cm²/m;
 * mínimo de 0,15 % da nervura, como em `dimensionarNervuradas`. Zonas maciças não são distinguidas [a confirmar].
 */
export function armaduraNecessariaNervurada(b: BuildingModel, l: Laje, M: number, face: 'inf' | 'sup', dir: 0 | 1): number {
  if (l.tipo.tipo !== 'nervurada') return 0;
  const g = geometriaBidirecional(b, l.tipo), c = concretoDe(b, 'laje'), cob = cobrimentoLaje(b, l.cobrimento);
  const bw = g.bw[dir], bf = g.i[dir], fyd = acoDe(b, face === 'inf' ? 'lajeInf' : 'lajeSup').fyd;
  const Mn = Math.abs(M) * bf; // kN·m por nervura
  const AsMin = 0.0015 * (face === 'inf' ? bf * g.capa + bw * g.hEnch : bw * g.h) * 1e4; // cm² por nervura
  const As = Mn > 0.01
    ? beamFlexure(face === 'inf' ? { kind: 'tee', bw, h: g.h, bf, hf: g.capa } : { kind: 'rect', bw, h: g.h }, face === 'inf', Mn, g.h - (face === 'inf' ? cob.inf : cob.sup) - 0.01, 0.03, c, fyd).As * 1e4
    : 0;
  return Math.max(As, AsMin) / bf;
}


/**
 * Dimensiona as lajes nervuradas bidirecionais da obra: um resultado por laje (envoltória dos pavimentos do grupo). Acrescenta
 * as mensagens às lajes em `lajes` e marca 'fail' nos erros.
 */
export function dimensionarNervuradas(b: BuildingModel, an: AnaliseEdificio, lajes: ResultadoLaje[], op: OpcoesCalculo): ResultadoNervurada[] {
  const out: ResultadoNervurada[] = [];
  const c = concretoDe(b, 'laje'), gm = gamas(b), aI = acoDe(b, 'lajeInf'), aS = acoDe(b, 'lajeSup'), aV = acoDe(b, 'lajeCortante');
  const obra = casosDaObra(b), nat = an.casos.map((id) => obra.find((x) => x.id === id)?.natureza ?? 'G');
  const fELU = nat.map((n) => (n === 'G' ? gm.g : n === 'H' ? gm.h : n === 'Q' ? gm.q : 0));
  const fFreq = an.casos.map((id, ic) => { const x = obra.find((y) => y.id === id); return nat[ic] === 'G' || nat[ic] === 'H' ? 1 : nat[ic] === 'Q' ? (x?.psi?.[1] ?? b.norma.psiQ?.[1] ?? 0.4) : 0; });
  const caaNum = { I: 1, II: 2, III: 3, IV: 4 }[b.norma.caa] as 1 | 2 | 3 | 4, wkLim = op.limiteFissura || crackLimit(caaNum);
  for (const l of b.lajes) {
    if (l.tipo.tipo !== 'nervurada' || l.definir || errosTipoLaje(b, l.tipo).length) continue;
    const g = geometriaBidirecional(b, l.tipo), cob = cobrimentoLaje(b, l.cobrimento), tag = l.nome;
    const rs = lajes.filter((x) => x.laje === l.id);
    const msgs: string[] = [];
    let falhou = false;
    const aviso = (t: string) => msgs.push(t);
    const info = (t: string) => msgs.push(t);
    const erro = (t: string) => { msgs.push(t); falhou = true; };
    const ver = verificarGeometria(g, op.nervuradaMesaMin / 100);
    for (const a of [...ver.avisos, ...avisosForma(g)]) (a.severidade === 'erro' ? erro : a.severidade === 'info' ? info : aviso)(`${a.mensagem.replace(/\.$/, '')} (${tag}).`);
    const arr = arranjoNervuras(lajeComAbacos(b, l, g), g, op.nervuradaMacicoViga);
    const abEf = abacosEfetivos(b, l, g), baseAb = new Map(abEf.map((ef) => [ef.abaco.id, baseDoAbaco(b, l, ef.abaco, op)] as const));
    const pavs = pavimentosDoGrupo(b, l.grupo), grelhas = an.grelhas.filter((x) => x.res && pavs.some((p) => p.id === x.pavimento));
    const grupo = b.grupos.find((x) => x.id === l.grupo);
    // ---- esforços de cada nervura: envoltória dos pavimentos do grupo
    const envFat = (fat: number[]) => arr.nervuras.map((rib) => {
      let acc: EsforcosNervura | null = null;
      for (const gr of grelhas) {
        const e = esforcosDaNervura(rib, linhasDaGrelha(gr, l, fat, arr), g.i[rib.dir], arr);
        if (!acc) { acc = e; continue; }
        acc = { x: acc.x, Mmax: acc.x.map((t, j) => Math.max(acc!.Mmax[j], interp(e.x, e.Mmax, t) ?? -Infinity)), Mmin: acc.x.map((t, j) => Math.min(acc!.Mmin[j], interp(e.x, e.Mmin, t) ?? Infinity)), V: acc.x.map((t, j) => Math.max(acc!.V[j], interp(e.x, e.V, t) ?? 0)) };
      }
      return acc ?? { x: [0, rib.L], Mmax: [0, 0], Mmin: [0, 0], V: [0, 0] };
    });
    const esf = envFat(fELU), esfF = envFat(fFreq);
    // ---- uniformização: nervuras vizinhas da mesma direção com momentos próximos adotam a armadura da mais solicitada
    const grupoDe = new Array<number>(arr.nervuras.length).fill(0);
    const grupos: { dir: 0 | 1; nervuras: number[] }[] = [];
    for (const dir of [0, 1] as const) {
      const idx = arr.nervuras.map((r, i) => ({ r, i })).filter((x) => x.r.dir === dir).sort((a, z) => a.r.indice - z.r.indice || a.r.L - z.r.L).map((x) => x.i);
      const mp = idx.map((i) => Math.max(0, ...esf[i].Mmax));
      for (const gp of gruposIgualacao(mp, op.nervuradaIgualacaoDif, op.nervuradaIgualacaoDif > 0 ? 1 : 0)) { grupos.push({ dir, nervuras: gp.map((k) => idx[k]) }); for (const k of gp) grupoDe[idx[k]] = grupos.length - 1; }
    }
    const envolt = grupos.map((gp) => ({
      mPos: Math.max(0, ...gp.nervuras.map((i) => Math.max(0, ...esf[i].Mmax))),
      mPosF: Math.max(0, ...gp.nervuras.map((i) => Math.max(0, ...esfF[i].Mmax))),
      mNeg: [0, 1].map((k) => Math.min(0, ...gp.nervuras.map((i) => (k ? esf[i].Mmin.at(-1)! : esf[i].Mmin[0])))) as [number, number],
      mNegF: [0, 1].map((k) => Math.min(0, ...gp.nervuras.map((i) => (k ? esfF[i].Mmin.at(-1)! : esfF[i].Mmin[0])))) as [number, number],
    }));
    // ---- concentração da armadura nas nervuras indicadas (E5g, K1.13.4.1-1) e tabela de armadura (R7a, K1.13.3-1)
    const concSet = ([0, 1] as const).map((k) => new Set(l.nervurasConcentrar?.[k] ?? []));
    const concInfo = (ri: number) => {
      const gp = grupos[grupoDe[ri]], k = arr.nervuras[ri].dir, marc = gp.nervuras.filter((i) => concSet[k].has(arr.nervuras[i].indice)).length, n = gp.nervuras.length;
      return marc > 0 && marc < n ? { n, m: marc, recebe: concSet[k].has(arr.nervuras[ri].indice) } : null;
    };
    // tabela de armadura da laje (R7a): a padrão da obra não restringe (reproduz a escolha anterior); a editada limita as bitolas das nervuras às da linha da altura da laje
    const tabL = tabelaDe(b, 'lajes', l.tabela), phisTab = tabL.id === ID_PADRAO ? undefined : linhaLajes(tabL, g.h).bitolas, foraTabela = new Set<string>();
    const fissurouNeg = new Set<string>(), erroFissNeg: string[] = [];
    // ---- seções e armaduras
    const baseDir = (dir: 0 | 1): BarraNervura | null => { const bs = l.baseNervurada?.nervuras?.[dir]; return bs?.considerar && bs.inf ? { ...bs.inf, As: bs.inf.n * barArea(bs.inf.phi) * 1e4 } : null; };
    const barras = (x: { n: number; phi: number } | undefined): BarraNervura | null => (x ? { n: x.n, phi: x.phi, As: x.n * barArea(x.phi) * 1e4 } : null);
    const baseInfo = (dir: 0 | 1) => barras(l.baseNervurada?.nervuras?.[dir]?.inf), baseSupInfo = (dir: 0 | 1) => barras(l.baseNervurada?.nervuras?.[dir]?.sup);
    const baseDetalhada = l.baseNervurada?.detalhada ?? op.lajeBaseDetalhada === 1;
    const posicoes: PosicaoAcoNervurada[] = [];
    const fissurou = new Set<string>(), erroFiss: string[] = [];
    const nervuras: NervuraDim[] = arr.nervuras.map((rib, ri) => {
      const k = rib.dir, bw = g.bw[k], bf = g.i[k], dI = g.h - cob.inf - 0.01, dS = g.h - cob.sup - 0.01, e = esf[ri], eg = envolt[grupoDe[ri]];
      const AsMin = 0.0015 * (bf * g.capa + bw * g.hEnch) * 1e4; // cm²
      const regime = ver.regime[k];
      const phiEstProv = 5;
      // positivo (seção T)
      const tee = { kind: 'tee' as const, bw, h: g.h, bf, hf: g.capa };
      const fl = beamFlexure(tee, true, eg.mPos, dI, 0.03, c, aI.fyd);
      const AsNec0 = eg.mPos > 0.01 ? Math.max(fl.As * 1e4, AsMin) : 0;
      const ci = concInfo(ri);
      // concentração: a indicada leva a armadura do grupo (menos o mínimo das que cedem); as demais ficam com o mínimo
      const AsNec = ci && AsNec0 > 0 ? (ci.recebe ? Math.max(AsMin, (ci.n * AsNec0 - (ci.n - ci.m) * AsMin) / ci.m) : AsMin) : AsNec0;
      const fatorC = AsNec0 > 0 ? AsNec / AsNec0 : 1, cede = !!ci && !ci.recebe;
      const nomeR = `${k === 0 ? 'X' : 'Y'}${rib.indice + 1}`;
      const escTab = (As: number, bwx: number, cobx: number, _face: 'pos' | 'neg') => {
        const r = escolherBarras(As, bwx, phiEstProv, cobx, phisTab);
        if (r || As <= 1e-9) return r;
        const livre = escolherBarras(As, bwx, phiEstProv, cobx);
        if (livre) foraTabela.add(nomeR);
        return livre;
      };
      if (fl.double) erro(`Nervuradas: flexão — nervura ${k === 0 ? 'X' : 'Y'}${rib.indice + 1} de ${tag}: momento positivo ${fmt(eg.mPos)} kN·m por nervura exige armadura dupla; aumente a altura da laje ou a largura da nervura.`);
      const base = baseDir(k);
      const falta = Math.max(0, AsNec - (base?.As ?? 0));
      let esc = escTab(falta, bw, cob.inf, 'pos');
      // fissuração na combinação frequente (17.3.3.2; seção T, momento positivo): aumenta a armadura até wk ≤ limite
      if (esc && eg.mPosF > 0.01 && !cede) {
        let req = falta, it = 0, w = 0;
        for (; it < 30; it++) {
          const tot = (base?.As ?? 0) + esc.As, phiMax = Math.max(base?.phi ?? 0, esc.phi);
          w = crackWidth(tee, true, tot / 1e4, phiMax, dI, eg.mPosF * fatorC, c, caaNum).wk;
          if (w <= wkLim + 1e-9) break;
          req *= 1.1;
          const nova = escTab(req, bw, cob.inf, 'pos');
          if (!nova) break;
          esc = nova;
        }
        if (it > 0 && w <= wkLim + 1e-9) fissurou.add(`${k === 0 ? 'X' : 'Y'}${rib.indice + 1}`);
        if (w > wkLim + 1e-9) erroFiss.push(`${k === 0 ? 'X' : 'Y'}${rib.indice + 1} (${fmt(w)} mm)`);
      }
      if (AsNec > 0 && falta > 0 && !esc) erro(`Nervuradas: flexão — nervura ${k === 0 ? 'X' : 'Y'}${rib.indice + 1} de ${tag}: momento positivo ${fmt(eg.mPos)} kN·m por nervura acima do resistente com 6φ25 (As ${fmt(AsNec)} cm²); aumente a altura da laje.`);
      const larguraMin = esc ? esc.need : base ? larguraNecessaria(base.n, base.phi, phiEstProv, cob.inf) : 0;
      let cabe = !esc || esc.cabe;
      if (base) {
        const nTot = base.n + (esc?.n ?? 0), phiMax = Math.max(base.phi, esc?.phi ?? 0);
        const need = larguraNecessaria(nTot, phiMax, phiEstProv, cob.inf);
        if (need > bw + 1e-9) { cabe = false; }
      }
      if (!cabe) erro(`Nervuradas: armadura não cabe na nervura ${k === 0 ? 'X' : 'Y'}${rib.indice + 1} de ${tag} — ${esc ? `${esc.n}φ${fphi(esc.phi)}` : ''}${base ? ` + base ${base.n}φ${fphi(base.phi)}` : ''} com estribo φ${phiEstProv} e cobrimento ${fmt(cob.inf * 100, 1)} cm pedem nervura de ${fmt(Math.max(larguraMin, esc ? larguraNecessaria(esc.n + (base?.n ?? 0), Math.max(esc.phi, base?.phi ?? 0), phiEstProv, cob.inf) : 0) * 100, 1)} cm (largura ${fmt(bw * 100, 1)} cm); aumente a largura da nervura ou a altura da laje (menos aço), ou use barras mais grossas.`);
      const AsInfTot = (base?.As ?? 0) + (esc?.As ?? 0);
      const Mu = AsInfTot > 0 ? momentoU(c, bf, g.capa, bw, dI, AsInfTot / 1e4, aI.fyd) : 0;
      const compInf = r3(arred(rib.L + 2 * Math.max(0.1, (esc?.phi ?? base?.phi ?? 10) / 100), op.arredondamento));
      // negativo por ponta (retângulo; maciça no apoio = largura do intereixo)
      const sup = [0, 1].map((ponta): ArmaduraSup | null => {
        const M = -eg.mNeg[ponta];
        if (M < 0.05) return null;
        const t = ponta === 0 ? 0.05 / rib.L : 1 - 0.05 / rib.L, mp: P = [rib.a[0] + t * (rib.z[0] - rib.a[0]), rib.a[1] + t * (rib.z[1] - rib.a[1])];
        const macica = !arr.aliviada(mp), bwEf = macica ? bf : bw;
        const fn = beamFlexure({ kind: 'rect', bw: bwEf, h: g.h }, false, M, dS, 0.03, c, aS.fyd);
        const AsMinN0 = 0.0015 * bw * g.h * 1e4, AsN0 = Math.max(fn.As * 1e4, AsMinN0); // mínimo da própria nervura; a malha da zona maciça é a armadura base
        const AsN = ci && AsN0 > 0 ? (ci.recebe ? Math.max(AsMinN0, (ci.n * AsN0 - (ci.n - ci.m) * AsMinN0) / ci.m) : AsMinN0) : AsN0;
        const nome = `${k === 0 ? 'X' : 'Y'}${rib.indice + 1}`;
        if (fn.double) {
          if (bw < 0.08) erro(`Nervuradas: flexão — nervura ${nome} de ${tag}: momento negativo ${fmt(M)} kN·m por nervura exige armadura de compressão, que a nervura de ${fmt(bw * 100, 1)} cm (< 8 cm) não admite; maciçe a faixa do apoio, aumente a altura ou a largura da nervura.`);
          else aviso(`Nervuradas: armadura dupla na nervura ${nome} de ${tag} (momento negativo ${fmt(M)} kN·m por nervura; x limitado a ${fmt(c.xLimRatio, 2)}d).`);
        }
        let bs = escTab(AsN, bwEf, cob.sup, 'neg'), AsFinal = AsN, wkNeg = 0;
        // fissuração do momento negativo na combinação frequente (E5g, K1.13.3-1; 17.3.3.2; retângulo, face superior)
        const MF = -eg.mNegF[ponta], verFiss = !!op.nervuradaFissuraNegativo && !!bs && MF > 0.05 && !cede;
        if (verFiss) {
          let it = 0, w = 0;
          const sec = { kind: 'rect' as const, bw: bwEf, h: g.h };
          for (; it < 30; it++) {
            w = crackWidth(sec, false, bs!.As / 1e4, bs!.phi, dS, MF * (AsN / AsN0), c, caaNum).wk;
            if (w <= wkLim + 1e-9) break;
            AsFinal *= 1.1;
            const nova = escTab(AsFinal, bwEf, cob.sup, 'neg');
            if (!nova) break;
            bs = nova;
          }
          wkNeg = w;
          if (it > 0 && w <= wkLim + 1e-9) fissurouNeg.add(nome);
          if (w > wkLim + 1e-9) erroFissNeg.push(`${nome} (${fmt(w)} mm)`);
        }
        if (!bs) erro(`Nervuradas: flexão — nervura ${nome} de ${tag}: armadura negativa de ${fmt(AsN)} cm² por nervura excede 6φ25; maciçe a faixa do apoio ou aumente a altura da laje.`);
        else if (!bs.cabe && !macica) erro(`Nervuradas: armadura não cabe na nervura ${nome} de ${tag} — negativo ${bs.n}φ${fphi(bs.phi)} pede nervura de ${fmt(bs.need * 100, 1)} cm (largura ${fmt(bw * 100, 1)} cm); aumente a largura da nervura ou a altura da laje, ou maciçe a faixa do apoio.`);
        // comprimento: até o ponto de momento nulo mais a decalagem (d) e a ancoragem
        const ext = extensaoNegativa(e, ponta as 0 | 1, rib.L);
        const comp = Math.min(rib.L, arred(ext + Math.max(dS, 12 * ((bs?.phi ?? 10) / 1000)), op.arredondamento));
        return { Mneg: eg.mNeg[ponta], AsNec: AsFinal, barras: bs ? { n: bs.n, phi: bs.phi, As: bs.As } : null, comprimento: r3(comp), macica, bwEfetiva: bwEf, dupla: fn.double, MFreq: verFiss ? MF : 0, wk: wkNeg };
      }) as [ArmaduraSup | null, ArmaduraSup | null];
      // trechos dentro de ábacos (E3d): flexão negativa sobre o pilar na banda maciça, reforço na nervura e cortante da banda maciça
      const abRib: ArmaduraNervuraAbaco[] = [];
      for (const ef of abEf) for (const [s0, s1] of trechosDentro(rib.a, rib.z, ef.poligono)) {
        if (s1 - s0 < 0.05) continue;
        const nome = `${k === 0 ? 'X' : 'Y'}${rib.indice + 1}`, hAb = ef.abaco.hAbaco, dAb = hAb - cob.sup - 0.01;
        const mn = (t: number) => interp(e.x, e.Mmin, Math.min(Math.max(t, 0), rib.L)) ?? 0, mv = (t: number) => interp(e.x, e.V, Math.min(Math.max(t, 0), rib.L)) ?? 0;
        const dentro = e.x.filter((t) => t > s0 && t < s1);
        const Mneg = Math.min(0, mn(s0), mn(s1), ...dentro.map(mn)), M = -Mneg;
        const bAb = baseAb.get(ef.abaco.id)!.sup, AsBase = bAb ? bAb.n * barArea(bAb.phi) * 1e4 : 0;
        const AsMinN = 0.0015 * bw * g.h * 1e4;
        const fn = M > 0.05 ? beamFlexure({ kind: 'rect', bw: bf, h: hAb }, false, M, dAb, 0.03, c, aS.fyd) : null;
        const AsNec = fn ? Math.max(fn.As * 1e4, AsMinN) : 0;
        // na borda do ábaco o momento passa só para as nervuras (retângulo bw × h)
        const Mb = -Math.min(0, s0 > 0.01 ? mn(s0) : 0, s1 < rib.L - 0.01 ? mn(s1) : 0);
        const fb = Mb > 0.05 ? beamFlexure({ kind: 'rect', bw, h: g.h }, false, Mb, dS, 0.03, c, aS.fyd) : null;
        const AsBorda = fb ? Math.max(fb.As * 1e4, AsMinN) : 0;
        const AsRef = Math.max(0, AsNec - AsBase, AsBorda);
        const bsel = escolherBarras(AsRef, bw, phiEstProv, cob.sup);
        if (fn?.double || fb?.double) erro(`Nervuradas: flexão — nervura ${nome} de ${tag} sobre o ábaco: momento negativo ${fmt(Math.max(M, Mb))} kN·m por banda exige armadura de compressão; aumente a altura do ábaco ou a largura da nervura.`);
        else if (AsRef > 0 && !bsel) erro(`Nervuradas: flexão — nervura ${nome} de ${tag} sobre o ábaco: armadura negativa de ${fmt(AsRef)} cm² por nervura excede 6φ25; aumente a altura do ábaco ou a laje.`);
        else if (bsel && !bsel.cabe) erro(`Nervuradas: armadura não cabe na nervura ${nome} de ${tag} — negativo sobre o ábaco ${bsel.n}φ${fphi(bsel.phi)} pede nervura de ${fmt(bsel.need * 100, 1)} cm (largura ${fmt(bw * 100, 1)} cm); aumente a largura da nervura ou o ábaco, ou use barras mais grossas.`);
        const regiao = regiaoNegativa(e, s0, s1, rib.L), phiB = bsel?.phi ?? bAb?.phi ?? 10;
        const comp = Math.min(rib.L, arred(regiao[1] - regiao[0] + 2 * Math.max(dS, (12 * phiB) / 1000), op.arredondamento));
        // cortante da banda maciça (largura = intereixo, altura do ábaco)
        const AsTop = AsBase + (bsel?.As ?? 0), VRd1ab = vrd1(c, bf, dAb, AsTop / 1e4), VRd2ab = 0.27 * c.av2 * c.fcd * bf * dAb * 1000;
        const Vab = Math.max(mv(s0), mv(s1), ...dentro.map(mv));
        let estribo: ArmaduraNervuraAbaco['estribo'] = null, okAb = true;
        if (Vab > VRd2ab) { okAb = false; erro(`Nervuradas: cortante ${fmt(Vab)} kN por banda acima de VRd2 = ${fmt(VRd2ab)} kN em ${tag}, nervura ${nome}, sobre o ábaco (biela comprimida, modelo I); aumente a altura do ábaco.`); }
        else if (Vab > VRd1ab + 1e-9) {
          const sh = beamShear(bf, dAb, Vab, c, aV.fyk, gm.s);
          if (!sh.stirrup) { okAb = false; erro(`Nervuradas: cortante ${fmt(Vab)} kN por banda acima de VRd1 = ${fmt(VRd1ab)} kN em ${tag}, nervura ${nome}, sobre o ábaco, sem estribo possível; aumente a altura do ábaco.`); }
          else { const sEs = Math.min(sh.stirrup.s, Math.floor(0.75 * dAb * 100) / 100); estribo = { phi: sh.stirrup.phi, s: sEs, barras: Math.ceil((s1 - s0) / sEs - 1e-9) + 1 }; aviso(`Nervuradas: estribos sobre o ábaco — nervura ${nome} de ${tag}: cortante ${fmt(Vab)} kN por banda acima de VRd1 = ${fmt(VRd1ab)} kN; estribos φ${fphi(estribo.phi)} c/${fmt(sEs * 100, 0)} no trecho do ábaco.`); }
        }
        abRib.push({ abaco: ef.abaco.id, x0: r3(s0), x1: r3(s1), Mneg, AsNec, AsBase, AsBorda, barras: bsel && AsRef > 0 ? { n: bsel.n, phi: bsel.phi, As: bsel.As } : null, cabe: !bsel || bsel.cabe, larguraMin: r3(bsel?.need ?? 0), comprimento: r3(comp), dupla: !!(fn?.double || fb?.double), Vmax: Vab, VRd1: VRd1ab, VRd2: VRd2ab, estribo, ok: okAb });
      }
      const solidoEm = (x0: number, x1: number) => abRib.find((a) => x0 >= a.x0 - 1e-6 && x1 <= a.x1 + 1e-6);
      // cortante a cada passo (19.4.1)
      const dd = dI, passo = op.nervuradaCortanteDist * dd, rho1 = AsInfTot / 1e4;
      const VRd1 = vrd1(c, bw, dd, rho1), VRd2c = 0.27 * c.av2 * c.fcd * bw * dd * 1000;
      const secoes: SecaoCortante[] = [];
      const nSec = Math.max(1, Math.ceil(rib.L / passo - 1e-9));
      let Vnec = 0;
      for (let j = 0; j < nSec; j++) {
        const x0 = j * passo, x1 = Math.min(rib.L, (j + 1) * passo);
        const vs = [interp(e.x, e.V, x0) ?? 0, interp(e.x, e.V, x1) ?? 0, ...e.x.map((t, q) => (t > x0 && t < x1 ? e.V[q] : 0))];
        const V = Math.max(...vs), sol = solidoEm(x0, x1), preciso = sol ? false : regime === 'laje' ? V > VRd1 + 1e-9 : true;
        secoes.push({ x: r3(x0), V, VRd: sol ? sol.VRd1 : VRd1, estribo: preciso, ...(sol ? { solido: true } : {}) });
        if (preciso) Vnec = Math.max(Vnec, V);
      }
      const Vmax = Math.max(0, ...e.V), VmaxRib = abRib.length ? Math.max(0, ...secoes.filter((x) => !x.solido).map((x) => x.V)) : Vmax;
      let estribo: NervuraDim['cortante']['estribo'] = null, ok = true;
      const zonas: [number, number][] = [];
      if (Vnec > 0 || (regime !== 'laje' && secoes.some((x) => !x.solido))) {
        const sh = beamShear(bw, dd, Math.max(Vnec, VmaxRib), c, aV.fyk, gm.s);
        if (!sh.ok) { ok = false; erro(`Nervuradas: cortante ${fmt(VmaxRib)} kN por nervura acima de VRd2 = ${fmt(sh.VRd2)} kN em ${tag}, nervura ${k === 0 ? 'X' : 'Y'}${rib.indice + 1} (biela comprimida, modelo I); aumente a largura da nervura ou a altura da laje.`); }
        else if (!sh.stirrup) { ok = false; erro(`Nervuradas: cortante ${fmt(VmaxRib)} kN por nervura acima de VRd1 = ${fmt(VRd1)} kN em ${tag}, nervura ${k === 0 ? 'X' : 'Y'}${rib.indice + 1}, sem estribo possível; aumente a largura da nervura.`); }
        else {
          const s = Math.min(sh.stirrup.s, Math.floor(passo * 100) / 100);
          // zonas: janelas consecutivas que precisam de estribo
          let ini: number | null = null;
          secoes.forEach((sc, j) => {
            const x1 = Math.min(rib.L, (j + 1) * passo);
            if (sc.estribo && ini === null) ini = sc.x;
            if ((!sc.estribo || j === secoes.length - 1) && ini !== null) { zonas.push([ini, sc.estribo ? x1 : sc.x]); ini = null; }
          });
          const barras = zonas.reduce((t, [a0, a1]) => t + Math.ceil((a1 - a0) / s - 1e-9) + 1, 0);
          estribo = { phi: sh.stirrup.phi, s, barras };
        }
      }
      return {
        dir: k, indice: rib.indice, a: rib.a, z: rib.z, L: r3(rib.L), mPos: Math.max(0, ...e.Mmax), mNeg: [e.Mmin[0] < 0 ? e.Mmin[0] : 0, e.Mmin.at(-1)! < 0 ? e.Mmin.at(-1)! : 0],
        Vmax,
        inf: { AsNec, base, baseInformada: baseInfo(k), baseSup: baseSupInfo(k), reforco: esc ? { n: esc.n, phi: esc.phi, As: esc.As } : null, total: AsInfTot, cabe, larguraMin: r3(larguraMin), comprimento: compInf, Mu },
        sup, ...(ci ? { concentracao: ci.recebe ? 'recebe' as const : 'cede' as const } : {}), cortante: { regime, passo: r3(passo), VRd1, VRd2: VRd2c, secoes, zonas: zonas.map(([a0, a1]) => [r3(a0), r3(a1)] as [number, number]), estribo, ok: ok && abRib.every((a) => a.ok) }, grupo: grupoDe[ri], abacos: abRib,
      };
    });
    if (fissurou.size) aviso(`Nervuradas: fissuração — armadura inferior aumentada em ${fissurou.size} nervura(s) de ${tag} (${[...fissurou].slice(0, 6).join(', ')}${fissurou.size > 6 ? '…' : ''}) para limitar a abertura de fissuras a ${fmt(wkLim)} mm (combinação frequente).`);
    if (erroFiss.length) erro(`Nervuradas: fissuração acima do limite de ${fmt(wkLim)} mm em ${erroFiss.slice(0, 4).join(', ')}${erroFiss.length > 4 ? '…' : ''} de ${tag} mesmo com 6φ25; aumente a altura da laje.`);
    if (fissurouNeg.size) aviso(`Nervuradas: fissuração do negativo — armadura superior aumentada em ${fissurouNeg.size} nervura(s) de ${tag} (${[...fissurouNeg].slice(0, 6).join(', ')}${fissurouNeg.size > 6 ? '…' : ''}) para limitar a abertura de fissuras a ${fmt(wkLim)} mm (combinação frequente).`);
    if (erroFissNeg.length) erro(`Nervuradas: fissuração do negativo acima do limite de ${fmt(wkLim)} mm em ${erroFissNeg.slice(0, 4).join(', ')}${erroFissNeg.length > 4 ? '…' : ''} de ${tag} mesmo com a maior armadura possível; aumente a altura da laje ou a largura da nervura.`);
    if (foraTabela.size) aviso(`Fora de tabela (nervuradas): ${tag}, nervura(s) ${[...foraTabela].slice(0, 6).join(', ')}${foraTabela.size > 6 ? '…' : ''}: a armadura necessária não cabe com as bitolas da tabela de armadura "${tabL.nome}" (usadas bitolas fora dela).`);
    for (const k of [0, 1] as const) {
      const sem = [...concSet[k]].filter((i) => !arr.nervuras.some((r) => r.dir === k && r.indice === i));
      if (sem.length) aviso(`Nervuradas: concentração — ${tag}: nervura(s) ${sem.map((i) => `${k === 0 ? 'X' : 'Y'}${i + 1}`).join(', ')} indicada(s) não existe(m).`);
    }
    const concGr = grupos.flatMap((gp, gi) => { const rs0 = gp.nervuras.map((i) => nervuras[i]); const rc = rs0.filter((x) => x.concentracao === 'recebe'); return rc.length ? [`${gp.dir === 0 ? 'X' : 'Y'}${gi + 1}: ${rc.map((x) => `${gp.dir === 0 ? 'X' : 'Y'}${x.indice + 1}`).join(', ')}`] : []; });
    if (concGr.length) info(`Nervuradas: armadura concentrada nas nervuras indicadas de ${tag} — ${concGr.join('; ')}; as demais nervuras do grupo ficam com o mínimo (a armadura do grupo é a soma das necessárias) [a confirmar: distribuição transversal pela mesa].`);
    // ---- mesa: flexão da mesa entre nervuras (espaçamento > 65 cm) e malha de distribuição
    const livre = Math.max(...ver.livre), qd = gm.g * (g.pp + (grupo?.gRev ?? 0)) + gm.q * (grupo?.q ?? 0);
    const exigida = Math.max(g.i[0], g.i[1]) > 0.65 + 1e-9;
    const MdMesa = (qd * livre * livre) / 12, dm = g.capa - cob.sup - 0.005;
    const fm = beamFlexure({ kind: 'rect', bw: 1, h: g.capa }, false, exigida ? MdMesa : 0, dm, 0.02, c, aS.fyd);
    const AsMin = Math.max(0.9, 0.5 * 0.0015 * g.capa * 1e4); // cm²/m [a confirmar: mínimo de distribuição na mesa]
    const AsNecMesa = Math.max(AsMin, exigida ? fm.As * 1e4 : 0);
    if (exigida && fm.double) erro(`Nervuradas: mesa de ${fmt(g.capa * 100)} cm de ${tag} não resiste à flexão entre nervuras (Md = ${fmt(MdMesa)} kN·m/m, vão livre ${fmt(livre * 100, 0)} cm); aumente a mesa.`);
    // tabela de armadura de lajes (R7a): a bitola de distribuição da mesa precisa estar na linha da espessura da mesa
    const linhaMesa = linhaLajes(tabL, g.capa), ca60S = aS.aco === 'CA-60';
    let phiD = ca60S && op.lajeBitolaMinima <= 5 ? 5 : 6.3;
    if (tabL.id !== ID_PADRAO && !linhaMesa.bitolas.includes(phiD)) { const alt = [...linhaMesa.bitolas].sort((x, z) => x - z).find((p2) => p2 >= 6.3 || ca60S); if (alt) { phiD = alt; aviso(`Fora de tabela (nervuradas): a bitola de distribuição da mesa de ${tag} passa para φ${fphi(phiD)} (a tabela de lajes não tem φ${fphi(aS.aco === 'CA-60' && op.lajeBitolaMinima <= 5 ? 5 : 6.3)}).`); } }
    // malha da mesa e das zonas maciças (E5g, K1.9.94): considerada na verificação da mesa quando marcada
    const considerarMesa = !!l.baseNervurada?.considerarMesa;
    const asFace = (f?: BaseFaceLaje): [number, number] => {
      if (f?.tela) { const t = telaPor(f.tela, b); return t ? areaTela(t, f.giro) : [0, 0]; }
      return [0, 1].map((q) => { const x = f?.barras?.[q]; return x ? areaBarraBase(x.phi, x.s) : 0; }) as [number, number];
    };
    const malhaInf = considerarMesa ? asFace(l.baseNervurada?.mesa?.inf) : ([0, 0] as [number, number]), malhaSup = considerarMesa ? asFace(l.baseNervurada?.mesa?.sup) : ([0, 0] as [number, number]);
    const MdPos = exigida ? (qd * livre * livre) / 24 : 0, dmI = g.capa - cob.inf - 0.005;
    const fmP = beamFlexure({ kind: 'rect', bw: 1, h: g.capa }, false, MdPos, dmI, 0.02, c, aI.fyd);
    if (exigida && considerarMesa && fmP.double) erro(`Nervuradas: mesa de ${fmt(g.capa * 100)} cm de ${tag} não resiste ao momento positivo entre nervuras (Md = ${fmt(MdPos)} kN·m/m); aumente a mesa.`);
    const AsNecPos = exigida ? Math.max(AsMin, fmP.As * 1e4) : 0;
    const AsMalhaSup = Math.min(...malhaSup), AsMalhaInf = Math.min(...malhaInf);
    const compSup = considerarMesa ? Math.max(0, AsNecMesa - AsMalhaSup) : AsNecMesa, compInf = considerarMesa ? Math.max(0, AsNecPos - AsMalhaInf) : 0;
    const sDe = (As: number) => Math.max(0.05, Math.min(0.2, Math.floor(((barArea(phiD) * 1e4) / As) * 100 + 1e-9) / 100));
    const sD = sDe(AsNecMesa);
    const mesa: MesaNervurada = {
      exigida, livre: r3(livre), qd, Md: exigida ? MdMesa : 0, AsNec: AsNecMesa, AsAdotada: (barArea(phiD) * 1e4) / sD, phi: phiD, s: sD,
      ...(considerarMesa ? { malha: { AsSup: AsMalhaSup, AsInf: AsMalhaInf, MdPos, AsNecPos, complementoSup: compSup, complementoInf: compInf, phi: phiD, sSup: compSup > 0 ? sDe(compSup) : 0, sInf: compInf > 0 ? sDe(compInf) : 0 } } : {}),
    };
    // alerta de detalhamento (K1.9.94, como o da K1.9.87): a base entra no cálculo mas só aparece nos desenhos e quantitativos se detalhada
    if ((considerarMesa || [0, 1].some((k) => l.baseNervurada?.nervuras?.[k]?.considerar)) && !baseDetalhada) aviso(`Nervuradas: a armadura base de ${tag} entra no cálculo mas a opção de detalhar a armadura base está desligada — ela não aparece nos desenhos, quantitativos e tabelas (a malha da mesa nunca entra no resumo de aço; só é descrita). Ative "Base das nervuras detalhada" para desenhar e medir a das nervuras.`);
    if (considerarMesa && (compSup > 1e-9 || compInf > 1e-9)) aviso(`Nervuradas: a malha da base da mesa de ${tag} não cobre a armadura necessária (superior ${fmt(AsMalhaSup)} de ${fmt(AsNecMesa)} cm²/m${exigida ? `; inferior ${fmt(AsMalhaInf)} de ${fmt(AsNecPos)} cm²/m` : ''}); o complemento entra na armadura calculada da mesa.`);
    // ---- quantitativos
    const quantitativo = quantitativoNervurada(l, g, arr, volumeRebaixoAbacos(abEf, g.h));
    const Alaje = Math.abs(areaPoligono(l.contorno as P[])) - (l.furos ?? []).reduce((t, f) => t + Math.abs(areaPoligono(f as P[])), 0);
    const per = (phi: number) => barArea(phi) * 7850;
    for (const n of nervuras) {
      if (baseDetalhada && n.inf.baseInformada) posicoes.push({ tipo: 'base', aco: aI.aco, phi: n.inf.baseInformada.phi, n: n.inf.baseInformada.n, comprimento: n.inf.comprimento });
      if (baseDetalhada && n.inf.baseSup) posicoes.push({ tipo: 'baseSup', aco: aS.aco, phi: n.inf.baseSup.phi, n: n.inf.baseSup.n, comprimento: r3(arred(n.L + 2 * Math.max(0.1, n.inf.baseSup.phi / 100), op.arredondamento)) });
      if (n.inf.reforco) posicoes.push({ tipo: 'inferior', aco: aI.aco, phi: n.inf.reforco.phi, n: n.inf.reforco.n, comprimento: n.inf.comprimento });
      for (const s of n.sup) if (s?.barras) posicoes.push({ tipo: 'superior', aco: aS.aco, phi: s.barras.phi, n: s.barras.n, comprimento: r3(s.comprimento + Math.max(0.15, g.h - 2 * cob.sup)) });
      if (n.cortante.estribo) {
        const bwN = g.bw[n.dir];
        posicoes.push({ tipo: 'estribo', aco: aV.aco, phi: n.cortante.estribo.phi, n: n.cortante.estribo.barras, comprimento: r3(2 * (bwN - 2 * cob.inf) + 2 * (g.h - 2 * cob.inf) + 2 * Math.max(0.05, (5 * n.cortante.estribo.phi) / 1000)) });
      }
    }
    // ábacos (E3d): reforço negativo nas nervuras sobre o pilar, estribos da banda maciça e armadura base entre nervuras
    for (const n of nervuras) for (const a of n.abacos) {
      const hAb = abEf.find((x) => x.abaco.id === a.abaco)!.abaco.hAbaco;
      if (a.barras) posicoes.push({ tipo: 'abaco', aco: aS.aco, phi: a.barras.phi, n: a.barras.n, comprimento: r3(a.comprimento + Math.max(0.15, hAb - 2 * cob.sup)) });
      if (a.estribo) posicoes.push({ tipo: 'estribo', aco: aV.aco, phi: a.estribo.phi, n: a.estribo.barras, comprimento: r3(2 * (g.i[n.dir] - 2 * cob.inf) + 2 * (hAb - 2 * cob.inf) + 2 * Math.max(0.05, (5 * a.estribo.phi) / 1000)) });
    }
    const abacosRes = abEf.map((ef) => {
      const base = barrasBaseAbaco(b, l, ef, g, baseAb.get(ef.abaco.id)!);
      for (const x of base) posicoes.push({ tipo: 'abacoBase', aco: x.face === 'inf' ? aI.aco : aS.aco, phi: x.phi, n: x.total, comprimento: x.comprimento });
      return { id: ef.abaco.id, hAbaco: ef.abaco.hAbaco, area: ef.area, automatico: ef.abaco.automatico, ...(ef.abaco.pilar ? { pilar: ef.abaco.pilar } : {}), base, padrao: baseAb.get(ef.abaco.id)!.padrao };
    });
    if (!considerarMesa) posicoes.push({ tipo: 'mesa', aco: aS.aco, phi: phiD, n: 1, comprimento: r3((2 * Alaje) / sD) });
    else {
      // com a malha considerada, a calculada é só o complemento de cada face
      if (compSup > 1e-9) posicoes.push({ tipo: 'mesa', aco: aS.aco, phi: phiD, n: 1, comprimento: r3((2 * Alaje) / sDe(compSup)) });
      if (compInf > 1e-9) posicoes.push({ tipo: 'mesa', aco: aI.aco, phi: phiD, n: 1, comprimento: r3((2 * Alaje) / sDe(compInf)) });
    }
    // zona maciça por Wood-Armer (E5g, K1.13.3-1): momentos nos nós da grelha dentro da zona, fora dos ábacos (que têm o seu dimensionamento)
    let zonaMacica: ZonaMacicaNervurada | undefined;
    const aMac = Math.max(0, quantitativo.areaMacica - abEf.reduce((t, ef) => t + ef.area, 0));
    if (op.nervuradaWoodArmer && aMac > 0.05) {
      const eps = 0.01, Minf: [number, number] = [0, 0], Msup: [number, number] = [0, 0];
      let nNos = 0;
      for (const gr of grelhas) for (const x of woodArmerNos(gr, l.id, fELU)) {
        const q = gr.modelo.nos[x.no] as number[], pt: P = [q[0], q[1]];
        if ([[eps, eps], [-eps, eps], [eps, -eps], [-eps, -eps]].some(([dx, dy]) => arr.aliviada([pt[0] + dx, pt[1] + dy]))) continue;
        if (abEf.some((ef) => dentroPoligono(pt, ef.poligono as P[]))) continue;
        nNos++;
        for (const k of [0, 1] as const) { Minf[k] = Math.max(Minf[k], x.inf[k]); Msup[k] = Math.min(Msup[k], x.sup[k]); }
      }
      if (nNos > 0) {
        const amin = (op.lajeTaxaMin > 0 ? op.lajeTaxaMin / 100 : 0.0015) * g.h * 1e4, aminFace = { inf: 0.67 * amin, sup: amin }, dI2 = g.h - cob.inf - 0.005, dS2 = g.h - cob.sup - 0.005;
        const nec = (M: number, face: 'inf' | 'sup'): number => {
          if (Math.abs(M) < 1e-3) return aminFace[face];
          const f = beamFlexure({ kind: 'rect', bw: 1, h: g.h }, false, Math.abs(M), face === 'inf' ? dI2 : dS2, 0.02, c, face === 'inf' ? aI.fyd : aS.fyd);
          if (f.double) erro(`Nervuradas: zona maciça de ${tag}: momento ${face === 'inf' ? 'positivo' : 'negativo'} de Wood-Armer ${fmt(Math.abs(M))} kN·m/m exige armadura dupla; aumente a altura da laje.`);
          return Math.max(aminFace[face], f.As * 1e4);
        };
        const AsNecInf = [nec(Minf[0], 'inf'), nec(Minf[1], 'inf')] as [number, number], AsNecSup = [nec(Msup[0], 'sup'), nec(Msup[1], 'sup')] as [number, number];
        const compI = AsNecInf.map((v, k) => Math.max(0, v - malhaInf[k])) as [number, number], compS = AsNecSup.map((v, k) => Math.max(0, v - malhaSup[k])) as [number, number];
        const linhaZ = linhaLajes(tabelaDe(b, 'lajes', l.tabela), g.h), smin = op.lajeEspacamentoMinimo / 100, smaxP = Math.min(2 * g.h, 0.2);
        const sel = (v: number, ca60: boolean) => { if (v <= 1e-9) return null; const r = escolherBarrasLaje(v / 1e4, g.h, smaxP, smin, op.lajeBitolaMinima, ca60, linhaZ); return r; };
        const bI = compI.map((v) => sel(v, aI.aco === 'CA-60')), bS = compS.map((v) => sel(v, ca60S));
        for (const [lista, aco, comp] of [[bI, aI.aco, compI], [bS, aS.aco, compS]] as const) lista.forEach((x, k) => {
          if (!x) return;
          if (!x.cabe) erro(`Nervuradas: zona maciça de ${tag}: armadura complementar de ${fmt(comp[k])} cm²/m na direção ${k === 0 ? 'X' : 'Y'} não cabe com os espaçamentos da tabela; aumente a altura da laje.`);
          posicoes.push({ tipo: 'zonaMacica', aco, phi: x.phi, n: 1, comprimento: r3(aMac / x.s) });
        });
        const ok = [...bI, ...bS].every((x) => !x || x.cabe);
        zonaMacica = {
          area: r3(aMac), nos: nNos, Minf, Msup, AsNecInf, AsNecSup, AsMalhaInf: malhaInf, AsMalhaSup: malhaSup, complementoInf: compI, complementoSup: compS,
          barrasInf: bI.map((x) => (x ? { phi: x.phi, s: x.s } : null)), barrasSup: bS.map((x) => (x ? { phi: x.phi, s: x.s } : null)), ok,
        };
        info(`Nervuradas: zona maciça de ${tag} (${fmt(aMac)} m²) por Wood-Armer: positivo ${fmt(Minf[0])}/${fmt(Minf[1])} kN·m/m, negativo ${fmt(Msup[0])}/${fmt(Msup[1])} kN·m/m (X/Y); armadura necessária ${fmt(Math.max(...AsNecInf))} cm²/m inferior e ${fmt(Math.max(...AsNecSup))} cm²/m superior${considerarMesa ? ', descontada a malha da base da mesa' : ''}.`);
      }
    }
    const peso = posicoes.reduce((t, x) => t + x.n * x.comprimento * per(x.phi), 0);
    const regimeTxt = (r: Regime) => (r === 'laje' ? 'como laje' : r === 'viga' ? 'como viga' : 'mesa como laje maciça');
    msgs.push(`Nervuradas bidirecionais: ${tag} — ${g.forma.nome} (${g.recuperavel ? 'forma recuperável' : 'forma perdida'}), h = ${fmt(g.h * 100, 0)} cm, mesa ${fmt(g.capa * 100, 0)} cm, intereixo ${fmt(g.i[0] * 100, 0)} × ${fmt(g.i[1] * 100, 0)} cm, peso ${fmt(quantitativo.ppMedio)} kN/m², ${nervuras.length} nervura(s) em ${grupos.length} grupo(s); cisalhamento ${regimeTxt(ver.regime[0])} (X) e ${regimeTxt(ver.regime[1])} (Y)${abEf.length ? `; ${abEf.length} ábaco(s) de ${fmt(abEf.reduce((t, x) => t + x.area, 0))} m² (zona maciça com cubetas retiradas)` : ''}.`);
    for (const r of rs) { r.mensagens.push(...msgs); if (falhou) r.status = 'fail'; }
    out.push({
      laje: l.id, nome: l.nome, pavimentos: rs.map((r) => r.pavimento), repeticoes: Math.max(1, pavs.length), forma: g.forma.id, formaNome: g.forma.nome, recuperavel: g.recuperavel, h: g.h, capa: g.capa, hEnch: g.hEnch, intereixo: g.i, bw: g.bw,
      pp: g.pp, volume: g.volume, regime: ver.regime, nervuras, grupos, baseDetalhada, mesa, ...(zonaMacica ? { zonaMacica } : {}), quantitativo, abacos: abacosRes, posicoes, peso, mensagens: msgs, status: falhou ? 'fail' : 'ok',
    });
  }
  return out;
}

/** Momento último (kN·m) da seção T com a armadura `As` (m²). */
function momentoU(c: ReturnType<typeof concretoDe>, bf: number, hf: number, bw: number, d: number, As: number, fyd: number): number {
  const T = As * fyd, yLim = c.lambda * c.xLimRatio * d;
  let y = T / (c.sigmaCd * bf);
  if (y <= hf) { y = Math.min(y, yLim); return c.sigmaCd * bf * y * (d - y / 2) * 1000; }
  const Rcf = c.sigmaCd * (bf - bw) * hf, Rcw = Math.max(0, T - Rcf), yw = Math.min(Rcw / (c.sigmaCd * bw), yLim);
  return (Rcf * (d - hf / 2) + c.sigmaCd * bw * yw * (d - yw / 2)) * 1000;
}

/** Região (x0, x1, m ao longo da nervura) de momento negativo contínuo em torno do trecho [s0, s1]: até o ponto de momento nulo de cada lado ou a ponta da nervura. */
export function regiaoNegativa(e: EsforcosNervura, s0: number, s1: number, L: number): [number, number] {
  const mn = (t: number) => interp(e.x, e.Mmin, Math.min(Math.max(t, 0), L)) ?? 0;
  const varre = (inicio: number, sentido: 1 | -1): number => {
    let t = inicio, m = mn(t);
    if (m >= 0) return t;
    const nos = e.x.filter((x) => (sentido === 1 ? x > inicio + 1e-9 : x < inicio - 1e-9)).sort((a, z) => sentido * (a - z));
    for (const x of [...nos, sentido === 1 ? L : 0]) {
      const mx = mn(x);
      if (mx >= 0) return t + (m / (m - mx)) * (x - t);
      t = x; m = mx;
    }
    return t;
  };
  return [varre(s0, -1), varre(s1, 1)];
}

/** Extensão (m) do negativo a partir da ponta até o ponto de momento nulo (envoltória Mmin cruzando zero). */
export function extensaoNegativa(e: EsforcosNervura, ponta: 0 | 1, L: number): number {
  const n = e.x.length, idx = ponta === 0 ? [...Array(n).keys()] : [...Array(n).keys()].reverse();
  const dist = (i: number) => (ponta === 0 ? e.x[i] : L - e.x[i]);
  if (e.Mmin[idx[0]] >= 0) return 0;
  for (let q = 1; q < n; q++) {
    const i0 = idx[q - 1], i1 = idx[q];
    if (e.Mmin[i1] >= 0) { const m0 = e.Mmin[i0], m1 = e.Mmin[i1], t = m0 / (m0 - m1); return dist(i0) + t * (dist(i1) - dist(i0)); }
  }
  return L;
}

/** Resumo do aço das nervuradas bidirecionais por aço e bitola (kg), com repetições dos pavimentos e perdas (%). */
export function resumoAcoNervuradas(rs: ResultadoNervurada[], perdas: number): { aco: string; phi: number; comprimento: number; peso: number; pesoComPerdas: number }[] {
  const m = new Map<string, { aco: string; phi: number; comprimento: number }>();
  for (const r of rs) for (const x of r.posicoes) {
    const k = `${x.aco}|${x.phi}`, e = m.get(k) ?? { aco: x.aco, phi: x.phi, comprimento: 0 };
    e.comprimento += x.n * x.comprimento * r.repeticoes;
    m.set(k, e);
  }
  return [...m.values()].sort((a, z) => a.aco.localeCompare(z.aco) || a.phi - z.phi).map((e) => { const peso = e.comprimento * barArea(e.phi) * 7850; return { ...e, peso, pesoComPerdas: peso * (1 + perdas / 100) }; });
}

// ---------------------------------------------------------------- memorial

export interface GrupoMemorialNervurada { nome: string; dir: 0 | 1; nervuras: string; L: number; mPos: number; mNeg: [number, number]; Vmax: number; inf: string; sup: string; estribo: string; Mu: number }
export interface LinhaMemorialNervurada {
  laje: string; nome: string; pavimentos: string[];
  forma: { id: string; nome: string; tipo: string; pecas: number; alturaCubeta: number; origem: 'obra' | 'biblioteca de normas (a confirmar)' };
  geometria: { h: number; capa: number; hEnch: number; intereixo: [number, number]; bw: [number, number]; livre: [number, number] };
  peso: { aliviada: number; medio: number; volumeAliviada: number; volumeConcreto: number; enchimento: number; cubetas: number; areaMacica: number };
  modelo: { perfil: 'sistema' | 'nbr'; passoMalha: number; inercia: string; torcao: string; faixaMacicaViga: number; zonasMacicas: number };
  verificacoes: { capaMin: number; regime: [string, string]; avisos: string[] };
  mesa: MesaNervurada;
  base: { mesa: string; nervuras: string[] };
  /** Critérios da E5g (fissuração do negativo, malha da mesa considerada, zona maciça por Wood-Armer, concentração, tabela de armadura), um texto por item. */
  criterios: string[];
  grupos: GrupoMemorialNervurada[];
  vigas: { nome: string; h: number; saliente: number }[];
  mensagens: string[];
}
const REGIME_TXT: Record<Regime, string> = { laje: 'cisalhamento como laje (19.4.1)', viga: 'cisalhamento como viga, com flexão da mesa', macica: 'mesa como laje maciça sobre grelha de vigas' };

/** Linhas do memorial das nervuradas bidirecionais: forma, peso e volume, modelo (malha, inércias), verificações, mesa, base e reforço por grupo de nervuras. */
export function nervuradasNoMemorial(b: BuildingModel, rs: ResultadoNervurada[], op: OpcoesCalculo): LinhaMemorialNervurada[] {
  return rs.flatMap((r) => {
    const l = b.lajes.find((x) => x.id === r.laje);
    if (!l || l.tipo.tipo !== 'nervurada') return [];
    const g = geometriaBidirecional(b, l.tipo), ver = verificarGeometria(g, op.nervuradaMesaMin / 100);
    const phi = (x: { n: number; phi: number } | null | undefined) => (x ? `${x.n}φ${fphi(x.phi)}` : '—');
    const grupos = r.grupos.map((gp, gi): GrupoMemorialNervurada => {
      const r0 = r.nervuras[gp.nervuras[0]], idx = gp.nervuras.map((i) => r.nervuras[i].indice + 1);
      const sup = r0.sup.map((s) => (s?.barras ? `${phi(s.barras)} (${fmt(s.comprimento * 100, 0)} cm)` : '—')).join(' / ');
      const est = r0.cortante.estribo ? `φ${fphi(r0.cortante.estribo.phi)} c/${fmt(r0.cortante.estribo.s * 100, 0)} em ${r0.cortante.zonas.map(([a, z]) => `${fmt(a)}–${fmt(z)} m`).join(', ')}` : 'sem estribo (Vsd ≤ VRd1)';
      return {
        nome: `${gp.dir === 0 ? 'X' : 'Y'}${gi + 1}`, dir: gp.dir, nervuras: idx.length > 1 ? `${Math.min(...idx)} a ${Math.max(...idx)} (${idx.length})` : String(idx[0]), L: r0.L,
        mPos: Math.max(...gp.nervuras.map((i) => r.nervuras[i].mPos)), mNeg: [Math.min(...gp.nervuras.map((i) => r.nervuras[i].mNeg[0])), Math.min(...gp.nervuras.map((i) => r.nervuras[i].mNeg[1]))],
        Vmax: Math.max(...gp.nervuras.map((i) => r.nervuras[i].Vmax)),
        inf: `${r0.inf.base ? `base ${phi(r0.inf.base)} + ` : ''}${phi(r0.inf.reforco)}`.replace(/ \+ —$/, ''), sup, estribo: est, Mu: r0.inf.Mu,
      };
    });
    const bn = l.baseNervurada, face = (f: 'inf' | 'sup') => { const x = bn?.mesa?.[f]; return x ? `${f === 'inf' ? 'inferior' : 'superior'} ${x.tela ?? (x.barras ?? []).map((y) => (y ? `φ${fphi(y.phi)} c/${y.s}` : '—')).join(' / ')}` : ''; };
    return [{
      laje: r.laje, nome: r.nome, pavimentos: r.pavimentos,
      forma: { id: g.forma.id, nome: g.forma.nome, tipo: g.recuperavel ? 'recuperável' : 'perdida', pecas: g.pecas, alturaCubeta: g.forma.altura, origem: b.tiposLaje?.formas?.some((x) => x.id === g.forma.id) ? 'obra' as const : 'biblioteca de normas (a confirmar)' as const },
      geometria: { h: g.h, capa: g.capa, hEnch: g.hEnch, intereixo: g.i, bw: g.bw, livre: ver.livre },
      peso: { aliviada: g.pp, medio: r.quantitativo.ppMedio, volumeAliviada: g.volume, volumeConcreto: r.quantitativo.volumeConcreto, enchimento: r.quantitativo.pesoEnchimento, cubetas: r.quantitativo.cubetas, areaMacica: r.quantitativo.areaMacica },
      modelo: {
        perfil: b.perfilOpcoes === 'nbr' ? 'nbr' as const : 'sistema' as const, passoMalha: passoMalhaNervurada(g, op),
        inercia: op.nervuradaInercia > 0 ? `${fmt(op.nervuradaInercia)} × inércia da faixa maciça de mesma altura, igual nas zonas maciça e aliviada` : 'seção T real da nervura (mesa = intereixo) na zona aliviada; laje maciça na zona maciça',
        torcao: op.nervuradaTorcao > 0 ? `${fmt(op.nervuradaTorcao)} × a inércia à flexão` : `torção geométrica da nervura × ${fmt(op.torcaoLaje)}`,
        faixaMacicaViga: op.nervuradaMacicoViga, zonasMacicas: l.zonasMacicas?.length ?? 0,
      },
      verificacoes: { capaMin: ver.capaMin, regime: [REGIME_TXT[ver.regime[0]], REGIME_TXT[ver.regime[1]]] as [string, string], avisos: [...ver.avisos.map((a) => a.mensagem), ...avisosForma(g).map((a) => a.mensagem)] },
      mesa: r.mesa,
      base: {
        mesa: [face('inf'), face('sup')].filter(Boolean).join('; ') || 'sem base na mesa (só a malha de distribuição calculada)',
        nervuras: ([0, 1] as const).map((k) => { const x = bn?.nervuras?.[k]; return x ? `direção ${k === 0 ? 'X' : 'Y'}: ${[x.inf && `inferior ${phi(x.inf)}`, x.sup && `superior ${phi(x.sup)}`].filter(Boolean).join(', ') || '—'}${x.considerar ? ' (considerada no dimensionamento)' : ' (não considerada)'}` : `direção ${k === 0 ? 'X' : 'Y'}: sem base nas nervuras`; }),
      },
      criterios: criteriosE5g(b, l, r, op),
      grupos,
      vigas: b.vigas.filter((v) => lajesQueTocam(b, v).some((x) => x.id === l.id)).map((v) => ({ nome: v.nome, h: v.secao.h, saliente: parteSalienteViga(b, v) ?? 0 })),
      mensagens: r.mensagens,
    }];
  });
}

/** Texto dos critérios de dimensionamento da E5g de uma laje (memorial): o que foi verificado e com que valores. */
function criteriosE5g(b: BuildingModel, l: Laje, r: ResultadoNervurada, op: OpcoesCalculo): string[] {
  const out: string[] = [];
  out.push(op.nervuradaFissuraNegativo
    ? 'Fissuração do momento negativo das nervuras (17.3.3.2, combinação frequente, seção retangular da nervura ou da banda maciça): armadura aumentada até a abertura de fissuras ficar abaixo do limite, como no positivo.'
    : 'Fissuração do momento negativo das nervuras não verificada (opção desligada); só o positivo é verificado.');
  const tab = tabelaDe(b, 'lajes', l.tabela);
  out.push(tab.id === ID_PADRAO ? 'Tabela de armadura (R7a): a padrão da obra; as bitolas das nervuras não são restringidas.' : `Tabela de armadura (R7a) "${tab.nome}": as bitolas das nervuras e da mesa seguem a linha da tabela de lajes para a altura da laje.`);
  const m = r.mesa.malha;
  out.push(m
    ? `Malha da base considerada na mesa: superior ${fmt(m.AsSup)} cm²/m e inferior ${fmt(m.AsInf)} cm²/m (menor das duas direções); necessárias ${fmt(r.mesa.AsNec)} cm²/m (negativo, qd·ℓ²/12) e ${fmt(m.AsNecPos)} cm²/m (positivo, qd·ℓ²/24, ${fmt(m.MdPos)} kN·m/m); complemento calculado ${fmt(m.complementoSup)} e ${fmt(m.complementoInf)} cm²/m.`
    : 'Malha da base da mesa e das zonas maciças não considerada no dimensionamento (só descrita e desenhada); a mesa recebe a armadura calculada inteira.');
  const z = r.zonaMacica;
  out.push(z
    ? `Zona maciça (${fmt(z.area)} m², fora dos ábacos) por Wood-Armer (mx* = mx + |mxy|, média em faixa de 1 m): positivo ${fmt(z.Minf[0])} / ${fmt(z.Minf[1])} kN·m/m e negativo ${fmt(z.Msup[0])} / ${fmt(z.Msup[1])} kN·m/m (X / Y); armadura necessária ${fmt(z.AsNecInf[0])} / ${fmt(z.AsNecInf[1])} cm²/m inferior e ${fmt(z.AsNecSup[0])} / ${fmt(z.AsNecSup[1])} cm²/m superior (mínimo da laje armada em duas direções, NBR 6118 Tabela 19.1: negativo ρmín·h e positivo 0,67·ρmín·h; ρmín da opção das lajes maciças, 0,15 % para fck ≤ 30) [a confirmar: ρmín por fck e aplicação do Wood-Armer às zonas maciças das nervuradas]; complemento além da malha: ${fmt(Math.max(...z.complementoInf))} cm²/m inferior e ${fmt(Math.max(...z.complementoSup))} cm²/m superior.`
    : 'Zona maciça sem dimensionamento por Wood-Armer (opção desligada ou sem zona maciça fora dos ábacos).');
  const conc = r.nervuras.filter((n) => n.concentracao === 'recebe');
  if (conc.length) out.push(`Armadura concentrada nas nervuras ${conc.map((n) => `${n.dir === 0 ? 'X' : 'Y'}${n.indice + 1}`).join(', ')}: levam a armadura do grupo uniformizado menos o mínimo das demais [a confirmar: distribuição transversal pela mesa].`);
  return out;
}

/** Resumo de uma laje nervurada bidirecional para a ferramenta `dimensionar` (sem as seções de cortante e os esforços das nervuras). */
export function resumoNervurada(r: ResultadoNervurada) {
  const dir = (k: 0 | 1) => r.nervuras.filter((n) => n.dir === k);
  const env = (xs: NervuraDim[]) => ({ nervuras: xs.length, mPos: +Math.max(0, ...xs.map((n) => n.mPos)).toFixed(2), mNeg: +Math.min(0, ...xs.flatMap((n) => n.mNeg)).toFixed(2), Vmax: +Math.max(0, ...xs.map((n) => n.Vmax)).toFixed(2), comEstribo: xs.filter((n) => n.cortante.estribo).length });
  return {
    laje: r.laje, nome: r.nome, forma: r.formaNome, recuperavel: r.recuperavel, h: r.h, capa: r.capa, intereixo: r.intereixo, status: r.status,
    pesoMedio: +r.quantitativo.ppMedio.toFixed(2), concreto_m3: +r.quantitativo.volumeConcreto.toFixed(2), cubetas: r.quantitativo.cubetas, regime: r.regime,
    direcaoX: env(dir(0)), direcaoY: env(dir(1)), grupos: r.grupos.length, ...(r.abacos.length ? { abacos: r.abacos.length, areaAbacos: +r.abacos.reduce((t, a) => t + a.area, 0).toFixed(2) } : {}), mesa: { exigida: r.mesa.exigida, AsNec: +r.mesa.AsNec.toFixed(2), phi: r.mesa.phi, s: r.mesa.s }, aco_kg: +r.peso.toFixed(1), mensagens: r.mensagens,
  };
}
