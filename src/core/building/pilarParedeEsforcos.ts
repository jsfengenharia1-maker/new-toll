// Esforços resultantes do pilar-parede por lado e por pavimento (E1b), a partir dos esforços das cascas (membrana e placa,
// no centroide de cada elemento) e das barras dos lados curtos; mais as cargas na base do pilar-parede. A armadura e as
// tensões ficam para a E1d.
import type { AnaliseEdificio } from './analitico';
import { combinacoesDoEstado } from './combinacoes';
import { ladosDoPP, lancesDoPP, tipoDoPilarParede } from './pilarParede';
import { memoriaAtiva } from '../memoria/registrador';
import { elementoParede, registrarCargasBase, registrarResultantesBarra, registrarResultantesCasca } from '../memoria/paredes';
import { ppDaParede } from './paredesBase';
import { cotaFundacao, pavimentosOrdenados, type BuildingModel } from './types';
import { cargasProprias, nosDeCorte, prepararElementos, secoesDoLance, type ElementosDoLance, type ForcasSecao } from './pilarParedeSecoes';

/** Resultante num lado e pavimento (kN, kN·m; N > 0 tração). Lado em casca: média sobre a altura do painel; em barra: extremo do lance. */
export interface Resultante {
  /** Normal ao longo da altura. */
  N: number;
  /** Cortante no plano do lado (ao longo do eixo) e momento fletor no plano. */
  Vp: number; Mp: number;
  /** Cortante e momento fletor fora do plano. */
  Vo: number; Mo: number;
}

export interface Extremo { max: number; min: number; cMax: string; cMin: string }

export interface EsforcosLado {
  pp: string; nomePP: string; lado: number; nome: string;
  modelo: 'casca' | 'barra';
  pavimento: string; nomePav: string;
  /** Comprimento do lado (m) e espessura total no lance (m). */
  L: number; t: number;
  /** Resultantes por caso (G, Q, adicionais e as direções do vento). */
  casos: Record<string, Resultante>;
  /** Extremos nas combinações ELU, por grandeza. */
  elu: Record<keyof Resultante, Extremo>;
}

/**
 * Forças internas numa seção horizontal do conjunto do pilar-parede (V7h, C4.60), por caso: base ou topo de um lance. Vêm das
 * forças nodais dos elementos do lance (equilíbrio do corpo livre, exato), em torno do centroide na cota da seção, na
 * convenção da carga da base (parte inferior sobre a superior; N > 0 compressão; eixos globais). A base do primeiro lance
 * coincide com `base`.
 */
export interface SecaoPilarParede {
  /** Pavimento do topo do lance, nome, posição da seção no lance e cota (m). */
  lance: string; nomePav: string; posicao: 'base' | 'topo'; cota: number;
  casos: Record<string, ForcasSecao>;
}

export interface ResultadoPilarParede {
  id: string; nome: string; tipo: string; nomeTipo: string;
  /** 'casca' se todos os lados são cascas, 'barra' se todos são barras, senão 'misto'. */
  modelo: 'casca' | 'barra' | 'misto';
  /** Quantas cascas e quantos lados em barra. */
  nCascas: number; ladosBarra: number;
  /** Ponto de referência (centroide dos lados) em que as cargas da base são dadas. */
  centro: [number, number];
  /** Cargas na base por caso (N > 0 compressão; eixos globais, kN e kN·m) e extremos ELU de N. */
  base: Record<string, { N: number; Vx: number; Vy: number; Mx: number; My: number; /** Torçor da reação em torno do eixo vertical pelo centro (V7g; anti-horário +). */ Mz: number }>;
  baseElu: { Nmax: number; Nmin: number; cNmax: string; cNmin: string };
  /** Seções horizontais (base e topo de cada lance), da base ao topo (V7h). */
  secoes: SecaoPilarParede[];
  lados: EsforcosLado[];
  mensagens: string[];
}

type PorCaso = (bi: number, xs: number[]) => Record<string, { N: number; Vy: number; Vz: number; My: number; Mz: number }[]>;

const vazio = (): Resultante => ({ N: 0, Vp: 0, Mp: 0, Vo: 0, Mo: 0 });
const GRANDEZAS: (keyof Resultante)[] = ['N', 'Vp', 'Mp', 'Vo', 'Mo'];

/** Esforços resultantes dos pilares-parede (vazio se a obra não tem nenhum ou a análise não os tem). */
export function esforcosPilaresParede(b: BuildingModel, an: AnaliseEdificio, porCasoBarra: PorCaso, quais: 'pilaresParede' | 'paredes' = 'pilaresParede'): ResultadoPilarParede[] {
  const pars = an.paredes;
  const alvos = quais === 'paredes' ? (b.paredes ?? []).map(ppDaParede) : b.pilaresParede ?? [];
  if (!alvos.length || !an.portico.res) return [];
  const ps = pavimentosOrdenados(b), zf = cotaFundacao(b);
  const resV = an.portico.resVento && !an.portico.resVento.erro ? an.portico.resVento : null;
  const nomesV = an.vento?.casos.map((c) => c.nome) ?? [];
  const casosAn = an.casos;
  const elu = combinacoesDoEstado(b, an, 'concreto').filter((c) => c.tipo === 'ELU');
  const out: ResultadoPilarParede[] = [], mem = memoriaAtiva();
  const fontes = [...casosAn.map((c, ic) => ({ nome: c, cascas: an.portico.res!.cascas?.[ic] })), ...(resV ? nomesV.map((n, iv) => ({ nome: n, cascas: resV.cascas?.[iv] })) : [])];
  for (const pp of alvos) {
    const parede = quais === 'paredes' ? b.paredes?.find((w) => w.id === pp.id) : undefined;
    const kind = !parede ? 'pilarParede' : parede.tipo === 'concreto' ? 'parede' : parede.tipo;
    const elDe = (lance: string) => { const el = elementoParede(kind, pp.nome, lance); return mem?.aceita(el) ? el : null; };
    const tipo = tipoDoPilarParede(b, pp), lances = lancesDoPP(b, pp);
    if (!tipo || !lances.length) continue;
    const lados = ladosDoPP(b, pp), lista: EsforcosLado[] = [];
    const iNasce = pp.nasce === 'fundacao' ? -1 : ps.findIndex((x) => x.id === pp.nasce);
    const zBase = (k: number) => (k === 0 ? (pp.nasce === 'fundacao' ? zf : ps[iNasce].cota) : lances[k - 1].cota);
    for (const g of lados) {
      for (const [k, lance] of lances.entries()) {
        const casos: Record<string, Resultante> = {};
        let pontas: Record<string, { N: number; Vy: number; Vz: number; My: number; Mz: number }[]> | undefined, elsCasca: { k: number; area: number; s: number }[] | undefined, Hc = 0;
        if (g.casca && pars) {
          const H = lance.cota - zBase(k), els = pars.info.filter((e) => e.ladoId === g.id && e.lance === lance.id);
          elsCasca = els; Hc = H;
          const soma = (res: NonNullable<typeof an.portico.res>, ic: number) => {
            const r = vazio();
            for (const e of els) {
              const v = res.cascas?.[ic]?.[e.k];
              if (!v) continue;
              const w = e.area / H, ds = e.s - (g.ext(lance.id)[0] + g.ext(lance.id)[1]) / 2; // centro do trecho existente no lance (E6d)
              r.N += v[1] * w; r.Vp += v[2] * w; r.Mp += v[1] * ds * w; r.Vo += v[7] * w; r.Mo += v[4] * w;
            }
            return r;
          };
          casosAn.forEach((c, ic) => (casos[c] = soma(an.portico.res!, ic)));
          if (resV) nomesV.forEach((n, iv) => (casos[n] = soma(resV, iv)));
        } else if (!g.casca) {
          const bi = an.portico.barras.findIndex((t) => t.tipo === 'pilar' && t.ref === g.id && t.pavimento === lance.id);
          if (bi < 0) continue;
          const L = an.portico.modelo.nos[an.portico.modelo.barras[bi].j][2] - an.portico.modelo.nos[an.portico.modelo.barras[bi].i][2];
          const pc = porCasoBarra(bi, [0, Math.max(L, 1e-6)]);
          pontas = pc;
          for (const [nome, est] of Object.entries(pc)) {
            const forte = (k2: 'N' | 'Vy' | 'Vz' | 'My' | 'Mz') => (Math.abs(est[0][k2]) >= Math.abs(est[1][k2]) ? est[0][k2] : est[1][k2]);
            casos[nome] = { N: est[0].N, Vp: forte('Vy'), Mp: forte('Mz'), Vo: forte('Vz'), Mo: forte('My') };
          }
        } else continue;
        // extremos ELU
        const ext = {} as Record<keyof Resultante, Extremo>;
        for (const q of GRANDEZAS) {
          let mx = -Infinity, mn = Infinity, cx = '', cn = '';
          for (const cb of elu) {
            let v = 0;
            for (const [n, f] of Object.entries(cb.fatores)) v += f * (casos[n]?.[q] ?? 0);
            if (v > mx) { mx = v; cx = cb.nome; }
            if (v < mn) { mn = v; cn = cb.nome; }
          }
          ext[q] = { max: Number.isFinite(mx) ? mx : 0, min: Number.isFinite(mn) ? mn : 0, cMax: cx, cMin: cn };
        }
        const e = g.esp(lance.id), elM = elDe(lance.nome);
        if (mem && elM) {
          if (g.casca && elsCasca) registrarResultantesCasca(mem, { elemento: elM, lado: g.nome, lance: lance.nome, L: g.L, e0: g.ext(lance.id)[0], e1: g.ext(lance.id)[1], t: e.t, H: Hc, els: elsCasca.map((q) => ({ k: q.k, area: q.area, s: q.s })), fontes, casos, ext, elu });
          else if (pontas) registrarResultantesBarra(mem, { elemento: elM, lado: g.nome, L: g.L, pontas, casos, ext, elu });
        }
        lista.push({ pp: pp.id, nomePP: pp.nome, lado: g.i, nome: g.nome, modelo: g.casca ? 'casca' : 'barra', pavimento: lance.id, nomePav: lance.nome, L: g.L, t: e.t, casos, elu: ext });
      }
    }
    // base
    const base: ResultadoPilarParede['base'] = {};
    for (const f of an.fundacao) if (f.pilar === pp.id) base[f.caso] = { N: f.N, Vx: f.Vx, Vy: f.Vy, Mx: f.Mx, My: f.My, Mz: f.Mz ?? 0 };
    let Nmax = -Infinity, Nmin = Infinity, cx = '', cn = '';
    for (const cb of elu) {
      let N = 0;
      for (const [n, f] of Object.entries(cb.fatores)) N += f * (base[n]?.N ?? 0);
      if (N > Nmax) { Nmax = N; cx = cb.nome; }
      if (N < Nmin) { Nmin = N; cn = cb.nome; }
    }
    { const elB = elementoParede(kind, pp.nome, 'Base'); if (mem?.aceita(elB)) registrarCargasBase(mem, { elemento: elB, base, baseElu: { Nmax: Number.isFinite(Nmax) ? Nmax : 0, Nmin: Number.isFinite(Nmin) ? Nmin : 0, cNmax: cx, cNmin: cn }, elu }); }
    const secoes = secoesDoConjunto(an, pp.id, lances.map((l) => ({ id: l.id, nome: l.nome })), lados.filter((g) => !g.casca).map((g) => g.id), pars?.centro[pp.id] ?? [pp.x, pp.y], casosAn, nomesV);
    const nCascas = lados.filter((g) => g.casca).length;
    out.push({
      id: pp.id, nome: pp.nome, tipo: pp.tipo, nomeTipo: tipo.nome,
      modelo: nCascas === lados.length ? 'casca' : nCascas === 0 ? 'barra' : 'misto', nCascas, ladosBarra: lados.length - nCascas,
      centro: pars?.centro[pp.id] ?? [pp.x, pp.y], base,
      baseElu: { Nmax: Number.isFinite(Nmax) ? Nmax : 0, Nmin: Number.isFinite(Nmin) ? Nmin : 0, cNmax: cx, cNmin: cn },
      secoes, lados: lista, mensagens: [],
    });
  }
  return out;
}

/**
 * Seções (base e topo de cada lance) por caso: forças nodais dos elementos do lance (cascas do pilar-parede, faixas axiais e
 * barras dos lados curtos) nos nós da menor e da maior cota, sem as vigas e lajes que chegam ao pavimento.
 */
function secoesDoConjunto(an: AnaliseEdificio, pid: string, lances: { id: string; nome: string }[], ladosBarra: string[], O: [number, number], casosAn: string[], nomesV: string[]): SecaoPilarParede[] {
  const m = an.portico.modelo, res = an.portico.res, resV = an.portico.resVento && !an.portico.resVento.erro ? an.portico.resVento : null;
  if (!res || (!m.cascas && !ladosBarra.length)) return [];
  const out: SecaoPilarParede[] = [];
  for (const lance of lances) {
    const cascas = (an.paredes?.info ?? []).filter((e) => e.pp === pid && e.lance === lance.id).map((e) => e.k), conj = new Set(cascas);
    const axiais = (m.axiaisMedios ?? []).flatMap((a, i) => (a.cascas?.some((c) => conj.has(c.casca)) ? [i] : []));
    const barras = ladosBarra.map((id) => an.portico.barras.findIndex((t) => t.tipo === 'pilar' && t.ref === id && t.pavimento === lance.id)).filter((bi) => bi >= 0);
    const el: ElementosDoLance = { cascas, axiais, barras };
    if (!cascas.length && !barras.length) continue;
    const corte = nosDeCorte(m, el), pr = prepararElementos(m, el);
    // o vento é resolvido com as cascas brutas (sem multiplicador axial nem faixas axiais): as forças nodais usam essas cascas
    const mV = an.portico.cascasVento ? { ...m, cascas: an.portico.cascasVento, axiaisMedios: undefined } : m, prV = prepararElementos(mV, { ...el, axiais: [] });
    const base: SecaoPilarParede = { lance: lance.id, nomePav: lance.nome, posicao: 'base', cota: corte.zBase, casos: {} };
    const topo: SecaoPilarParede = { lance: lance.id, nomePav: lance.nome, posicao: 'topo', cota: corte.zTopo, casos: {} };
    // cargas próprias dos elementos do lance (peso próprio e empuxo) aplicadas em nós do corte: pertencem ao lance, não à parte vizinha
    const proprias = cargasProprias(an.paredes, m, conj);
    const caso = (nome: string, r: NonNullable<typeof res>, ic: number, c3: { pressoes?: { casca: number; q: number }[] } | undefined, vento: boolean) => {
      const q = vento ? secoesDoLance(mV, prV, corte, [], O, r.desloc[ic], c3, r.esforcos[ic]) : secoesDoLance(m, pr, corte, proprias.filter((c) => c.caso === ic), O, r.desloc[ic], c3, r.esforcos[ic]);
      base.casos[nome] = q.base;
      topo.casos[nome] = q.topo;
    };
    casosAn.forEach((c, ic) => caso(c, res, ic, an.portico.casos?.[ic], false));
    if (resV) nomesV.forEach((n, iv) => caso(n, resV, iv, an.portico.casosVento?.[iv], true));
    out.push(base, topo);
  }
  return out;
}

