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
import { avisosForma, arranjoNervuras, geometriaBidirecional, passoMalhaNervurada, quantitativoNervurada, verificarGeometria, type ArranjoNervuras, type Nervura, type QuantitativoNervurada, type Regime } from './nervuradas';
import { errosTipoLaje } from './tiposLaje';
import { lajesQueTocam, parteSalienteViga } from './secaoViga';
import { casosDaObra, pavimentosDoGrupo, type BarrasNervura, type BuildingModel, type Laje } from './types';
import { arred, gruposIgualacao, vrd1 } from './vigotas';

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
export function escolherBarras(AsNec: number, bw: number, phiEst: number, cob: number): (BarraEscolhida & { cabe: boolean; need: number }) | null {
  if (AsNec <= 1e-9) return null;
  const ok = COMBINACOES.filter((x) => x.As >= AsNec - 1e-9);
  if (!ok.length) return null;
  const cabem = ok.find((x) => larguraNecessaria(x.n, x.phi, phiEst, cob) <= bw + 1e-9);
  const x = cabem ?? ok[0];
  return { ...x, cabe: !!cabem, need: larguraNecessaria(x.n, x.phi, phiEst, cob) };
}

// ---------------------------------------------------------------- resultados

export interface SecaoCortante { x: number; V: number; VRd: number; estribo: boolean }
export interface ArmaduraSup { Mneg: number; AsNec: number; barras: BarraEscolhida | null; comprimento: number; macica: boolean; bwEfetiva: number; dupla: boolean }
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
}
type BarraNervura = BarrasNervura & { As: number };

export interface MesaNervurada {
  /** A flexão da mesa é exigida (espaçamento > 65 cm). */
  exigida: boolean;
  /** Distância livre (m), carga de cálculo (kN/m²), momento (kN·m/m) e armadura necessária e adotada (cm²/m). */
  livre: number; qd: number; Md: number; AsNec: number; AsAdotada: number; phi: number; s: number;
}
export interface PosicaoAcoNervurada { tipo: 'inferior' | 'base' | 'baseSup' | 'superior' | 'estribo' | 'mesa'; aco: string; phi: number; n: number; comprimento: number }
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
  quantitativo: QuantitativoNervurada;
  posicoes: PosicaoAcoNervurada[]; peso: number;
  mensagens: string[]; status: 'ok' | 'fail';
}

// ---------------------------------------------------------------- dimensionamento

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
    const arr = arranjoNervuras(l, g, op.nervuradaMacicoViga);
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
    }));
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
      const AsNec = eg.mPos > 0.01 ? Math.max(fl.As * 1e4, AsMin) : 0;
      if (fl.double) erro(`Nervuradas: flexão — nervura ${k === 0 ? 'X' : 'Y'}${rib.indice + 1} de ${tag}: momento positivo ${fmt(eg.mPos)} kN·m por nervura exige armadura dupla; aumente a altura da laje ou a largura da nervura.`);
      const base = baseDir(k);
      const falta = Math.max(0, AsNec - (base?.As ?? 0));
      let esc = escolherBarras(falta, bw, phiEstProv, cob.inf);
      // fissuração na combinação frequente (17.3.3.2; seção T, momento positivo): aumenta a armadura até wk ≤ limite
      if (esc && eg.mPosF > 0.01) {
        let req = falta, it = 0, w = 0;
        for (; it < 30; it++) {
          const tot = (base?.As ?? 0) + esc.As, phiMax = Math.max(base?.phi ?? 0, esc.phi);
          w = crackWidth(tee, true, tot / 1e4, phiMax, dI, eg.mPosF, c, caaNum).wk;
          if (w <= wkLim + 1e-9) break;
          req *= 1.1;
          const nova = escolherBarras(req, bw, phiEstProv, cob.inf);
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
        const AsN = Math.max(fn.As * 1e4, 0.0015 * bw * g.h * 1e4); // mínimo da própria nervura; a malha da zona maciça é a armadura base
        const nome = `${k === 0 ? 'X' : 'Y'}${rib.indice + 1}`;
        if (fn.double) {
          if (bw < 0.08) erro(`Nervuradas: flexão — nervura ${nome} de ${tag}: momento negativo ${fmt(M)} kN·m por nervura exige armadura de compressão, que a nervura de ${fmt(bw * 100, 1)} cm (< 8 cm) não admite; maciçe a faixa do apoio, aumente a altura ou a largura da nervura.`);
          else aviso(`Nervuradas: armadura dupla na nervura ${nome} de ${tag} (momento negativo ${fmt(M)} kN·m por nervura; x limitado a ${fmt(c.xLimRatio, 2)}d).`);
        }
        const bs = escolherBarras(AsN, bwEf, phiEstProv, cob.sup);
        if (!bs) erro(`Nervuradas: flexão — nervura ${nome} de ${tag}: armadura negativa de ${fmt(AsN)} cm² por nervura excede 6φ25; maciçe a faixa do apoio ou aumente a altura da laje.`);
        else if (!bs.cabe && !macica) erro(`Nervuradas: armadura não cabe na nervura ${nome} de ${tag} — negativo ${bs.n}φ${fphi(bs.phi)} pede nervura de ${fmt(bs.need * 100, 1)} cm (largura ${fmt(bw * 100, 1)} cm); aumente a largura da nervura ou a altura da laje, ou maciçe a faixa do apoio.`);
        // comprimento: até o ponto de momento nulo mais a decalagem (d) e a ancoragem
        const ext = extensaoNegativa(e, ponta as 0 | 1, rib.L);
        const comp = Math.min(rib.L, arred(ext + Math.max(dS, 12 * ((bs?.phi ?? 10) / 1000)), op.arredondamento));
        return { Mneg: eg.mNeg[ponta], AsNec: AsN, barras: bs ? { n: bs.n, phi: bs.phi, As: bs.As } : null, comprimento: r3(comp), macica, bwEfetiva: bwEf, dupla: fn.double };
      }) as [ArmaduraSup | null, ArmaduraSup | null];
      // cortante a cada passo (19.4.1)
      const dd = dI, passo = op.nervuradaCortanteDist * dd, rho1 = AsInfTot / 1e4;
      const VRd1 = vrd1(c, bw, dd, rho1), VRd2c = 0.27 * c.av2 * c.fcd * bw * dd * 1000;
      const secoes: SecaoCortante[] = [];
      const nSec = Math.max(1, Math.ceil(rib.L / passo - 1e-9));
      let Vnec = 0;
      for (let j = 0; j < nSec; j++) {
        const x0 = j * passo, x1 = Math.min(rib.L, (j + 1) * passo);
        const vs = [interp(e.x, e.V, x0) ?? 0, interp(e.x, e.V, x1) ?? 0, ...e.x.map((t, q) => (t > x0 && t < x1 ? e.V[q] : 0))];
        const V = Math.max(...vs), preciso = regime === 'laje' ? V > VRd1 + 1e-9 : true;
        secoes.push({ x: r3(x0), V, VRd: VRd1, estribo: preciso });
        if (preciso) Vnec = Math.max(Vnec, V);
      }
      const Vmax = Math.max(0, ...e.V);
      let estribo: NervuraDim['cortante']['estribo'] = null, ok = true;
      const zonas: [number, number][] = [];
      if (Vnec > 0 || regime !== 'laje') {
        const sh = beamShear(bw, dd, Math.max(Vnec, Vmax), c, aV.fyk, gm.s);
        if (!sh.ok) { ok = false; erro(`Nervuradas: cortante ${fmt(Vmax)} kN por nervura acima de VRd2 = ${fmt(sh.VRd2)} kN em ${tag}, nervura ${k === 0 ? 'X' : 'Y'}${rib.indice + 1} (biela comprimida, modelo I); aumente a largura da nervura ou a altura da laje.`); }
        else if (!sh.stirrup) { ok = false; erro(`Nervuradas: cortante ${fmt(Vmax)} kN por nervura acima de VRd1 = ${fmt(VRd1)} kN em ${tag}, nervura ${k === 0 ? 'X' : 'Y'}${rib.indice + 1}, sem estribo possível; aumente a largura da nervura.`); }
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
        sup, cortante: { regime, passo: r3(passo), VRd1, VRd2: VRd2c, secoes, zonas: zonas.map(([a0, a1]) => [r3(a0), r3(a1)] as [number, number]), estribo, ok }, grupo: grupoDe[ri],
      };
    });
    if (fissurou.size) aviso(`Nervuradas: fissuração — armadura inferior aumentada em ${fissurou.size} nervura(s) de ${tag} (${[...fissurou].slice(0, 6).join(', ')}${fissurou.size > 6 ? '…' : ''}) para limitar a abertura de fissuras a ${fmt(wkLim)} mm (combinação frequente).`);
    if (erroFiss.length) erro(`Nervuradas: fissuração acima do limite de ${fmt(wkLim)} mm em ${erroFiss.slice(0, 4).join(', ')}${erroFiss.length > 4 ? '…' : ''} de ${tag} mesmo com 6φ25; aumente a altura da laje.`);
    // ---- mesa: flexão da mesa entre nervuras (espaçamento > 65 cm) e malha de distribuição
    const livre = Math.max(...ver.livre), qd = gm.g * (g.pp + (grupo?.gRev ?? 0)) + gm.q * (grupo?.q ?? 0);
    const exigida = Math.max(g.i[0], g.i[1]) > 0.65 + 1e-9;
    const MdMesa = (qd * livre * livre) / 12, dm = g.capa - cob.sup - 0.005;
    const fm = beamFlexure({ kind: 'rect', bw: 1, h: g.capa }, false, exigida ? MdMesa : 0, dm, 0.02, c, aS.fyd);
    const AsMin = Math.max(0.9, 0.5 * 0.0015 * g.capa * 1e4); // cm²/m [a confirmar: mínimo de distribuição na mesa]
    const AsNecMesa = Math.max(AsMin, exigida ? fm.As * 1e4 : 0);
    if (exigida && fm.double) erro(`Nervuradas: mesa de ${fmt(g.capa * 100)} cm de ${tag} não resiste à flexão entre nervuras (Md = ${fmt(MdMesa)} kN·m/m, vão livre ${fmt(livre * 100, 0)} cm); aumente a mesa.`);
    const phiD = aS.aco === 'CA-60' && op.lajeBitolaMinima <= 5 ? 5 : 6.3;
    const sD = Math.max(0.05, Math.min(0.2, Math.floor(((barArea(phiD) * 1e4) / AsNecMesa) * 100 + 1e-9) / 100));
    const mesa: MesaNervurada = { exigida, livre: r3(livre), qd, Md: exigida ? MdMesa : 0, AsNec: AsNecMesa, AsAdotada: (barArea(phiD) * 1e4) / sD, phi: phiD, s: sD };
    // ---- quantitativos
    const quantitativo = quantitativoNervurada(l, g, arr);
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
    posicoes.push({ tipo: 'mesa', aco: aS.aco, phi: phiD, n: 1, comprimento: r3((2 * Alaje) / sD) });
    const peso = posicoes.reduce((t, x) => t + x.n * x.comprimento * per(x.phi), 0);
    const regimeTxt = (r: Regime) => (r === 'laje' ? 'como laje' : r === 'viga' ? 'como viga' : 'mesa como laje maciça');
    msgs.push(`Nervuradas bidirecionais: ${tag} — ${g.forma.nome} (${g.recuperavel ? 'forma recuperável' : 'forma perdida'}), h = ${fmt(g.h * 100, 0)} cm, mesa ${fmt(g.capa * 100, 0)} cm, intereixo ${fmt(g.i[0] * 100, 0)} × ${fmt(g.i[1] * 100, 0)} cm, peso ${fmt(quantitativo.ppMedio)} kN/m², ${nervuras.length} nervura(s) em ${grupos.length} grupo(s); cisalhamento ${regimeTxt(ver.regime[0])} (X) e ${regimeTxt(ver.regime[1])} (Y).`);
    for (const r of rs) { r.mensagens.push(...msgs); if (falhou) r.status = 'fail'; }
    out.push({
      laje: l.id, nome: l.nome, pavimentos: rs.map((r) => r.pavimento), repeticoes: Math.max(1, pavs.length), forma: g.forma.id, formaNome: g.forma.nome, recuperavel: g.recuperavel, h: g.h, capa: g.capa, hEnch: g.hEnch, intereixo: g.i, bw: g.bw,
      pp: g.pp, volume: g.volume, regime: ver.regime, nervuras, grupos, baseDetalhada, mesa, quantitativo, posicoes, peso, mensagens: msgs, status: falhou ? 'fail' : 'ok',
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
      grupos,
      vigas: b.vigas.filter((v) => lajesQueTocam(b, v).some((x) => x.id === l.id)).map((v) => ({ nome: v.nome, h: v.secao.h, saliente: parteSalienteViga(b, v) ?? 0 })),
      mensagens: r.mensagens,
    }];
  });
}

/** Resumo de uma laje nervurada bidirecional para a ferramenta `dimensionar` (sem as seções de cortante e os esforços das nervuras). */
export function resumoNervurada(r: ResultadoNervurada) {
  const dir = (k: 0 | 1) => r.nervuras.filter((n) => n.dir === k);
  const env = (xs: NervuraDim[]) => ({ nervuras: xs.length, mPos: +Math.max(0, ...xs.map((n) => n.mPos)).toFixed(2), mNeg: +Math.min(0, ...xs.flatMap((n) => n.mNeg)).toFixed(2), Vmax: +Math.max(0, ...xs.map((n) => n.Vmax)).toFixed(2), comEstribo: xs.filter((n) => n.cortante.estribo).length });
  return {
    laje: r.laje, nome: r.nome, forma: r.formaNome, recuperavel: r.recuperavel, h: r.h, capa: r.capa, intereixo: r.intereixo, status: r.status,
    pesoMedio: +r.quantitativo.ppMedio.toFixed(2), concreto_m3: +r.quantitativo.volumeConcreto.toFixed(2), cubetas: r.quantitativo.cubetas, regime: r.regime,
    direcaoX: env(dir(0)), direcaoY: env(dir(1)), grupos: r.grupos.length, mesa: { exigida: r.mesa.exigida, AsNec: +r.mesa.AsNec.toFixed(2), phi: r.mesa.phi, s: r.mesa.s }, aco_kg: +r.peso.toFixed(1), mensagens: r.mensagens,
  };
}
