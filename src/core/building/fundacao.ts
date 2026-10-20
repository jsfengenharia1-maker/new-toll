// Fundações do edifício (frente FU, fatia FU1): adaptador entre o modelo do edifício e o núcleo do módulo Fundações.
// Monta a carga de cada elemento (rara máx./mín., permanente; H e M da rara de maior N) a partir das reações na base
// dos pilares (e dos arranques), leva-a aos eixos do elemento e chama `designSupport` (sapata, estacas + bloco,
// tubulão), sem duplicar cálculo. Sapata de divisa e de canto: pilar com a face na borda, excentricidade (A − ap)/2
// levada como momento (sem viga de equilíbrio, erro FUND_EXC_SEM_VIGA).
// FU2: vigas de equilíbrio (alavanca: o elemento excêntrico passa a centrado com a reação R = N·ℓ/(ℓ − e) e alivia a
// ponta oposta) e de travamento (blocos de 1 e 2 estacas), cargas do nível de fundação sobre vigas e elementos e
// dimensionamento das vigas (vigasFundacao.ts).
// Unidades: kN, m, kN/m² (σadm), graus.
import { designSupport, type SupportDesign } from '../foundation';
import { columnOffset, isFooting } from '../footings';
import { dentroPoligono, type P } from '../geom/faces';
import { isCaisson } from '../caissons';
import { defaultFoundationParams, PILE_LABEL, type Boring, type FLoad, type FoundationKind, type FoundationParams } from '../piles';
import type { AnaliseEdificio } from './analitico';
import { reacoesArranques } from './analitico';
import { combinacoesEdificio, type CombinacaoEd } from './combinacoes';
import { acoDe, cobrimentoFundacao, fckDe, gamas } from './materiais';
import { opcoesEmUso, perfilDe, type OpcoesCalculo } from './opcoes';
import { classificar } from './revisao';
import {
  abscissaNaViga, alavanca, cargasDaViga, dimensionarVigaFundacao, geometriaVF, parcelasDaCarga, pontasEquilibradas, reacoesBiapoiada,
  type AlavancaNaViga, type CargaPontualVF, type GeometriaVF, type ResultadoVigaFundacao, type VigaAlavanca,
} from './vigasFundacao';
import {
  casosDaObra, centroPilar, contornoPilar, cotaFundacao, dimsSecao, ehArranque, lancesDoPilar, pavimentosOrdenados, secaoNoLance,
  type BuildingModel, type ElementoFundacao, type Pilar, type PosicaoFundacao, type TipoFundacao,
} from './types';

const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
const KIND: Record<TipoFundacao, FoundationKind> = { sapata: 'sapata', bloco: 'estacas', tubulao: 'tubulao' };
export const PREFIXO_FUNDACAO: Record<TipoFundacao, string> = { sapata: 'S', bloco: 'B', tubulao: 'T' };
export const TIPO_FUNDACAO_LABEL: Record<TipoFundacao, string> = { sapata: 'Sapata', bloco: 'Bloco sobre estacas', tubulao: 'Tubulão' };
export const POSICAO_LABEL: Record<PosicaoFundacao, string> = { centrada: 'centrada', divisa: 'de divisa', canto: 'de canto', livre: 'excêntrica (posição livre)' };

// ---------------- cargas por pilar ----------------

type Reacao = AnaliseEdificio['fundacao'][number];

/** Cargas características por pilar (id → FLoad): rara máx./mín., permanente, H e M da rara de maior N (eixos globais). */
export function cargasPorPilar(b: BuildingModel, an: Pick<AnaliseEdificio, 'fundacao' | 'vento'>, filtro?: (c: CombinacaoEd) => boolean): Map<string, FLoad> {
  const combs = combinacoesEdificio(b, an as AnaliseEdificio).filter((x) => x.tipo === 'RARA' && (!filtro || filtro(x)));
  const porPilar = new Map<string, Record<string, Reacao>>();
  const permanentes = casosDaObra(b).filter((c) => c.natureza === 'G').map((c) => c.id);
  for (const f of an.fundacao) {
    const r = porPilar.get(f.pilar) ?? {}, a = r[f.caso];
    // a mesma reação pode vir de mais de uma origem (análise + cargas do nível de fundação): soma
    r[f.caso] = a ? { ...a, N: a.N + f.N, Vx: a.Vx + f.Vx, Vy: a.Vy + f.Vy, Mx: a.Mx + f.Mx, My: a.My + f.My } : f;
    porPilar.set(f.pilar, r);
  }
  const out = new Map<string, FLoad>();
  if (!combs.length) return out;
  let id = 0;
  for (const p of b.pilares) {
    const r = porPilar.get(p.id);
    if (!r) continue;
    const v = (cb: CombinacaoEd, k: 'N' | 'Vx' | 'Vy' | 'Mx' | 'My') => Object.entries(cb.fatores).reduce((s, [n, f]) => s + f * (r[n]?.[k] ?? 0), 0);
    const ns = combs.map((cb) => v(cb, 'N'));
    const iMax = ns.indexOf(Math.max(...ns)), cMax = combs[iMax];
    const sec = secaoBase(b, p);
    const [cx, cy] = centroPilar(p, sec), [w, h] = dimsSecao(sec);
    const rot = Math.abs(Math.sin((p.angulo * Math.PI) / 180)) > 0.7;
    out.set(p.id, {
      id: ++id, label: p.nome, Nk: +ns[iMax].toFixed(2), NkMin: +Math.min(...ns).toFixed(2), NkPerm: +permanentes.reduce((t, c) => t + (r[c]?.N ?? 0), 0).toFixed(2),
      Hx: +v(cMax, 'Vx').toFixed(2), Hy: +v(cMax, 'Vy').toFixed(2), Mx: +v(cMax, 'Mx').toFixed(2), My: +v(cMax, 'My').toFixed(2),
      x: +cx.toFixed(3), y: +cy.toFixed(3), ap: rot ? h : w, bp: rot ? w : h, source: `Edifício · ${cMax.nome}`,
    });
  }
  return out;
}

/** Cargas características por pilar para o módulo Fundações (lista, na ordem dos pilares). */
export function cargasParaFundacao(b: BuildingModel, an: AnaliseEdificio, filtro?: (c: CombinacaoEd) => boolean): FLoad[] {
  return [...cargasPorPilar(b, an, filtro).values()];
}

/** Seção do pilar na base (primeiro lance; arranque: a seção do pilar). */
export const secaoBase = (b: BuildingModel, p: Pilar) => { const l = lancesDoPilar(b, p)[0]; return l ? secaoNoLance(p, l.id) : p.secao; };

// ---------------- parâmetros e terreno ----------------

/**
 * Parâmetros do núcleo de fundações para o edifício: padrão do módulo, o que o usuário alterou (fundacao.opcoes) e os
 * materiais da fundação (materiais.definir: fck, aço e cobrimento próprios, padrão = os da obra e 5 cm), com γ da obra.
 */
export function parametrosFundacao(b: BuildingModel): FoundationParams {
  const g = gamas(b);
  return { ...defaultFoundationParams(), gammaC: g.c, gammaS: g.s, gammaF: g.g, ...b.fundacao?.params, fckFound: fckDe(b, 'fundacao'), fyk: acoDe(b, 'fundacao').fyk, cover: cobrimentoFundacao(b) };
}

/** Cota do terreno (boca dos furos): a informada ou a do pavimento mais baixo. */
export const cotaTerreno = (b: BuildingModel) => b.fundacao?.terreno.cotaTerreno ?? (pavimentosOrdenados(b)[0]?.cota ?? 0);
/** Cota de assentamento do elemento. */
export const cotaElemento = (b: BuildingModel, e: Pick<ElementoFundacao, 'cota'>) => e.cota ?? cotaFundacao(b);
/** Níveis de fundação (cotas de assentamento distintas, de baixo para cima). */
export const niveisFundacao = (b: BuildingModel) => [...new Set((b.fundacao?.elementos ?? []).map((e) => +cotaElemento(b, e).toFixed(3)))].sort((a, z) => a - z);

/** Parâmetros do módulo para um elemento: cota de apoio (profundidade abaixo do terreno) e arrasamento das estacas. */
export const parametrosElemento = (P0: FoundationParams, el: Pick<ElementoFundacao, 'tipo' | 'cota'>, prof: number): FoundationParams =>
  ({ ...P0, ftDepth: prof, cutoff: el.tipo === 'bloco' ? prof : P0.cutoff, tbDepth: el.cota !== undefined ? prof : P0.tbDepth });

const SEM_FURO: Boring = { name: '(sem sondagem)', water: null, meters: [], endImpenetrable: false };

/** Lado da divisa sugerido pelo ponto fixo do pilar (face ou canto inserido na divisa). */
export function ladoDoAjuste(p: Pick<Pilar, 'ajuste'>): [number, number] {
  const a = p.ajuste;
  return [a === 'l' || a === 'ne' || a === 'se' ? 1 : a === 'o' || a === 'no' || a === 'so' ? -1 : 0, a.startsWith('n') ? 1 : a.startsWith('s') ? -1 : 0];
}

// ---------------- resultado ----------------

/** Alavanca do elemento equilibrado por vigas de equilíbrio (FU2). */
export interface AlavancaFundacao {
  /** Carga do pilar (rara de maior N) e reação no centro do elemento (kN); fator R/N; reação com a carga mínima. */
  N: number; R: number; fator: number; RMin: number;
  /** Do pilar ao centro do elemento (m, global) e excentricidade não equilibrada pelas vigas (m, eixos do elemento). */
  e: [number, number]; eRes: [number, number];
  distribuicao: 'retangular' | 'trapezoidal';
  /** Por viga: alívio na ponta oposta (rara máx. e mín.), excentricidade equilibrada ao longo da viga (gᵢ), extensão do elemento ao longo da viga e distância entre os pilares. */
  vigas: { id: string; ponta: 'ini' | 'fim'; dN: number; dNMin: number; ei: number; a: number; l: number }[];
}

export interface ResultadoFundacao {
  id: string; nome: string; tipo: TipoFundacao; posicao: PosicaoFundacao;
  /** Ids e nomes dos pilares apoiados. */
  pilarIds: string[]; pilares: string[];
  /** Cota de assentamento e profundidade abaixo do terreno (m). */
  cota: number; profundidade: number;
  /** Centro real do elemento (m) e giro (graus). */
  centro: [number, number]; angulo: number;
  /** Contorno em planta (m): retângulo da sapata ou do bloco, círculo da base do tubulão. */
  contorno: [number, number][];
  /** Pilar nos eixos do elemento: seção (m) e posição do centro do pilar em relação ao centro do elemento. */
  ap: number; bp: number; excentricidade: [number, number];
  /** Carga característica nos eixos do elemento (a usada no cálculo). */
  carga: FLoad | null;
  dims: { A?: number; B?: number; h?: number; h0?: number; n?: number; D?: number; estaca?: string; L?: number; Df?: number; Db?: number; H?: number };
  sigmaAdm?: number; sigmaFonte?: string;
  /** Concreto (m³). */
  volume: number;
  status: 'ok' | 'fail';
  /** Erros e avisos com códigos FUND_* (revisao.ts). */
  mensagens: string[];
  /** Observações do cálculo (módulo Fundações). */
  notas: string[];
  resumo: string;
  /** Cálculo completo do módulo (desenhos e memorial). */
  projeto: SupportDesign | null;
  /** Modo "redimensionar só os com erro" ou nível não calculado: resultado anterior mantido. */
  mantido?: boolean;
  /** Elemento centrado por vigas de equilíbrio (FU2). */
  alavanca?: AlavancaFundacao;
  /** Alívio recebido de vigas de equilíbrio (kN): total, parcela considerada no Nk e total com a carga mínima. */
  alivio?: { total: number; considerado: number; minimo: number; vigas: string[] };
  /** Cargas do nível de fundação aplicadas diretamente sobre o elemento (kN, soma dos casos). */
  cargaDireta?: number;
}

export interface OpcoesFundacao {
  /** 0 = dimensionar tudo; 1 = só verificar (dimensões impostas ou as do cálculo anterior); 2 = redimensionar só os com erro. Padrão: opção `fundModo`. */
  modo?: number;
  /** Resultados anteriores (modos 1 e 2 e níveis não calculados). */
  anteriores?: ResultadoFundacao[];
  /** Só os elementos destes níveis (cotas de assentamento); padrão: `fundacao.niveis` do modelo (ausente = todos). */
  niveis?: number[];
  /** Só estes elementos. */
  ids?: string[];
}

/** Elementos, vigas de fundação e avisos gerais (cargas do nível de fundação sem destino). */
export interface CalculoFundacao { elementos: ResultadoFundacao[]; vigas: ResultadoVigaFundacao[]; avisos: string[] }

const rot = (v: [number, number], graus: number): [number, number] => { const a = (graus * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c]; };
const dot = (a: P, z: P) => a[0] * z[0] + a[1] * z[1];

/** Carga global → eixos do elemento (forças e momentos girados de −θ). */
function cargaLocal(ld: FLoad, graus: number): FLoad {
  const [Hx, Hy] = rot([ld.Hx, ld.Hy], -graus), [Mx, My] = rot([ld.Mx, ld.My], -graus);
  return { ...ld, Hx: +Hx.toFixed(3), Hy: +Hy.toFixed(3), Mx: +Mx.toFixed(3), My: +My.toFixed(3) };
}

/** Pilar nos eixos do elemento: retângulo envolvente da seção (ap ao longo de x local) e centro (m). */
function pilarLocal(b: BuildingModel, p: Pilar, graus: number) {
  const sec = secaoBase(b, p);
  const c = centroPilar(p, sec);
  const loc = contornoPilar(p, sec).map(([x, y]) => rot([x - c[0], y - c[1]], -graus));
  const xs = loc.map((q) => q[0]), ys = loc.map((q) => q[1]);
  const ap = +(Math.max(...xs) - Math.min(...xs)).toFixed(4), bp = +(Math.max(...ys) - Math.min(...ys)).toFixed(4);
  return { c, ap, bp };
}

const retangulo = (c: [number, number], A: number, B: number, graus: number): [number, number][] =>
  ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([i, j]) => { const v = rot([(i * A) / 2, (j * B) / 2], graus); return [c[0] + v[0], c[1] + v[1]] as [number, number]; });
const circulo = (c: [number, number], D: number): [number, number][] => Array.from({ length: 24 }, (_, k) => [c[0] + (D / 2) * Math.cos((k * Math.PI) / 12), c[1] + (D / 2) * Math.sin((k * Math.PI) / 12)] as [number, number]);

/**
 * Calcula as fundações lançadas no edifício. `an` = análise do edifício (sem ela, ou com erro, só os arranques têm
 * carga). Os elementos que não podem ser calculados voltam com erro e sem projeto. Vigas de fundação: ver
 * `calcularFundacaoEdificio`.
 */
export function calcularFundacoes(b: BuildingModel, an: AnaliseEdificio | null, o: OpcoesFundacao = {}): ResultadoFundacao[] {
  return calcularFundacaoEdificio(b, an, o).elementos;
}

type Ponta = { g: GeometriaVF; ponta: 'ini' | 'fim' };
type AlivioRecebido = { dN: number; dNMin: number; viga: string };

/**
 * Fundações do edifício com as vigas de fundação (FU2): cargas do nível de fundação nas vigas (biapoiadas entre os
 * pilares, levadas às pontas por caso) e nos elementos; elementos com ponta de viga de equilíbrio calculados primeiro
 * (alavanca), depois os demais com o alívio recebido; por fim, as vigas (esforços e armadura) e o travamento dos blocos.
 */
export function calcularFundacaoEdificio(b: BuildingModel, an: AnaliseEdificio | null, o: OpcoesFundacao = {}): CalculoFundacao {
  const fe = b.fundacao;
  if (!fe?.elementos.length) return { elementos: [], vigas: [], avisos: [] };
  const base: Pick<AnaliseEdificio, 'fundacao' | 'vento'> = an && an.fundacao.length ? an : { fundacao: reacoesArranques(b), vento: an?.vento ?? null };
  const op = opcoesEmUso(b.opcoes, perfilDe(b));
  const modo = o.modo ?? op.fundModo;
  const niveis = o.niveis ?? fe.niveis;
  const geos = (fe.vigas ?? []).map((v) => geometriaVF(b, v));
  const avisos: string[] = [];

  // cargas do nível de fundação: primeiro nas vigas (faixa da largura entre os pilares), depois nos elementos
  const parcelas = b.cargas.filter((c) => c.grupo === 'fundacao').flatMap((c) => parcelasDaCarga(c).map((x) => ({ ...x, caso: c.caso })));
  const naViga = new Map<string, CargaPontualVF[]>();
  const resto: typeof parcelas = [];
  for (const pc of parcelas) {
    const g = geos.find((x) => abscissaNaViga(x, pc.pt) !== null);
    if (g) { const l = naViga.get(g.viga.id) ?? []; l.push({ caso: pc.caso, s: abscissaNaViga(g, pc.pt)!, P: pc.P }); naViga.set(g.viga.id, l); }
    else resto.push(pc);
  }
  // reações das vigas (peso próprio + cargas sobre elas) nas pontas, por caso → somadas às cargas dos pilares
  const extra: Reacao[] = [];
  const somar = (pilar: string, caso: string, N: number) => { if (N) extra.push({ pilar, caso, N, Vx: 0, Vy: 0, Mx: 0, My: 0 }); };
  for (const g of geos) if (!g.erro) {
    const cs = cargasDaViga(g, naViga.get(g.viga.id) ?? []);
    for (const caso of new Set(cs.map((c) => c.caso))) {
      const r = reacoesBiapoiada(g.L, cs.filter((c) => c.caso === caso));
      somar(g.ini!.pilar.id, caso, r.ini); somar(g.fim!.pilar.id, caso, r.fim);
    }
  }
  const ge: Geral = { o, op, modo, niveis, P0: parametrosFundacao(b), zt: cotaTerreno(b), furos: fe.sondagens };
  let res = passo(b, base, extra, geos, ge);
  // cargas sobre os elementos (contorno do primeiro cálculo): somadas ao pilar do elemento, por caso
  if (resto.length) {
    const sobre = new Map<string, number>();
    const fora = resto.filter((pc) => {
      const r = res.find((x) => x.contorno.length > 2 && dentroPoligono(pc.pt, x.contorno));
      if (!r) return true;
      somar(r.pilarIds[0], pc.caso, pc.P);
      sobre.set(r.id, (sobre.get(r.id) ?? 0) + pc.P);
      return false;
    });
    if (sobre.size) {
      res = passo(b, base, extra, geos, ge);
      for (const r of res) if (sobre.has(r.id)) {
        r.cargaDireta = sobre.get(r.id)!;
        r.notas.push(`Cargas do nível de fundação sobre o elemento: ${fmt(r.cargaDireta, 1)} kN (soma dos casos), somadas à carga do pilar sem momento (contorno do primeiro cálculo; a confirmar).`);
      }
    }
    if (fora.length) avisos.push(`Carga no nível de fundação fora das vigas e dos elementos de fundação: ${fmt(fora.reduce((t, x) => t + x.P, 0), 1)} kN ignorados (só vigas de fundação e elementos recebem cargas nesse nível).`);
  }

  // vigas de fundação
  const porId = new Map(res.map((r) => [r.id, r]));
  const vigasDe = (r: ResultadoFundacao) => geos.filter((g) => !g.erro && (g.ini?.elemento?.id === r.id || g.fim?.elemento?.id === r.id));
  const dirPara = (g: GeometriaVF, r: ResultadoFundacao): P => (g.ini?.elemento?.id === r.id ? g.u : [-g.u[0], -g.u[1]]);
  const cruz = (a: P, z: P) => Math.abs(a[0] * z[1] - a[1] * z[0]);
  // linha das estacas do bloco de 2 estacas (global)
  const linhaEstacas = (r: ResultadoFundacao): P => rot((r.dims.A ?? 0) >= (r.dims.B ?? 0) ? [1, 0] : [0, 1], r.angulo);
  const trava = (r: ResultadoFundacao, u: P) => r.tipo === 'bloco' && (r.dims.n === 1 || (r.dims.n === 2 && cruz(u, linhaEstacas(r)) >= 0.7));
  const vigas: ResultadoVigaFundacao[] = [];
  for (const g of geos) {
    const v = g.viga;
    const eq = g.erro ? { ini: false, fim: false } : pontasEquilibradas(v, g);
    const msgs: string[] = [], notas: string[] = [];
    const alavancas: AlavancaNaViga[] = [];
    const alivio = { ini: 0, fim: 0 }, travamento = { ini: 0, fim: 0 };
    if (!g.erro) {
      for (const ponta of ['ini', 'fim'] as const) {
        const el = g[ponta]?.elemento, r = el ? porId.get(el.id) : undefined;
        if (eq[ponta]) {
          const a = r?.alavanca?.vigas.find((x) => x.id === v.id);
          if (a) { alavancas.push({ ponta, dN: a.dN, ei: a.ei, a: a.a, l: a.l }); alivio[ponta === 'ini' ? 'fim' : 'ini'] += a.dN; }
          else notas.push(`Alavanca de ${g[ponta]!.nome} não calculada (elemento sem solução ou fora dos níveis calculados): viga sem o momento de equilíbrio.`);
        }
        // travamento: excentricidade de execução das estacas dos blocos de 1 e 2 estacas, repartida entre as vigas da mesma direção
        if (r && r.carga && trava(r, g.u)) {
          const nb = vigasDe(r).filter((x) => trava(r, x.u) && cruz(dirPara(x, r), dirPara(g, r)) < 0.7).length || 1;
          travamento[ponta] = (r.carga.Nk * op.vigaTravExc) / 100 / nb;
        }
      }
      if (v.tipo === 'equilibrio' && !eq.ini && !eq.fim) msgs.push('Viga de fundação: viga de equilíbrio sem ponta excêntrica — calculada como travamento (sem alavanca).');
      if (eq.ini && eq.fim) notas.push('Equilibrada nas duas pontas: cada alavanca com o apoio no pilar da ponta oposta (simplificação a confirmar).');
      // ponta aliviada sem elemento (pilar sem fundação lançada): tração não verificada no elemento
      for (const ponta of ['ini', 'fim'] as const) if (alivio[ponta] && !g[ponta]?.elemento) notas.push(`Alívio de ${fmt(alivio[ponta], 1)} kN em ${g[ponta]!.nome}, que não tem elemento de fundação lançado.`);
    }
    vigas.push(dimensionarVigaFundacao(b, { g, equilibrio: eq, alavancas, cargas: naViga.get(v.id) ?? [], travamento, alivio, mensagens: msgs, notas }, op));
  }
  // travamento obrigatório dos blocos de 1 e 2 estacas (NBR 6122)
  for (const r of res) {
    if (r.tipo !== 'bloco' || !r.dims.n || r.dims.n > 2 || r.mantido) continue;
    const us = vigasDe(r).map((g) => dirPara(g, r));
    const ok = r.dims.n === 1 ? us.some((a) => us.some((z) => cruz(a, z) >= 0.7)) : us.some((a) => cruz(a, linhaEstacas(r)) >= 0.7);
    if (!ok) r.mensagens.push(r.dims.n === 1 ? 'Bloco sem travamento: bloco de 1 estaca exige vigas de travamento em duas direções ortogonais (NBR 6122).' : 'Bloco sem travamento: bloco de 2 estacas exige viga de travamento na direção perpendicular à linha das estacas (NBR 6122).');
  }
  return { elementos: res, vigas, avisos };
}

interface Geral { o: OpcoesFundacao; op: OpcoesCalculo; modo: number; niveis?: number[]; P0: FoundationParams; zt: number; furos: Boring[] }

/** Um passo do cálculo dos elementos (com as reações extras das cargas do nível de fundação). */
function passo(b: BuildingModel, base: Pick<AnaliseEdificio, 'fundacao' | 'vento'>, extra: Reacao[], geos: GeometriaVF[], ge: Geral): ResultadoFundacao[] {
  const fe = b.fundacao!;
  const bb = extra.length ? { fundacao: [...base.fundacao, ...extra], vento: base.vento } : base;
  const cargas = cargasPorPilar(b, bb);
  // combinações com vento (majoração de σadm)
  const ventos = new Set([...(base.vento?.casos ?? []).map((c) => c.nome), ...casosDaObra(b).filter((c) => c.natureza === 'W').map((c) => c.id)]);
  const comVento = (c: CombinacaoEd) => Object.entries(c.fatores).some(([k, f]) => f !== 0 && ventos.has(k));
  const fv = fe.terreno.fatorVento ?? 1;
  const separar = Math.abs(fv - 1) > 1e-9 && ventos.size > 0;
  const cargasSemVento = separar ? cargasPorPilar(b, bb, (c) => !comVento(c)) : null;
  const cargasComVento = separar ? cargasPorPilar(b, bb, comVento) : null;
  const anteriores = new Map((ge.o.anteriores ?? []).map((r) => [r.id, r]));
  // pontas equilibradas por elemento
  const eqPorEl = new Map<string, Ponta[]>();
  for (const g of geos) if (!g.erro) {
    const eq = pontasEquilibradas(g.viga, g);
    for (const ponta of ['ini', 'fim'] as const) if (eq[ponta]) { const id = g[ponta]!.elemento!.id; eqPorEl.set(id, [...(eqPorEl.get(id) ?? []), { g, ponta }]); }
  }
  const alivios = new Map<string, AlivioRecebido[]>();
  const registrarAlivio = (r: ResultadoFundacao) => {
    for (const a of r.alavanca?.vigas ?? []) {
      const g = geos.find((x) => x.viga.id === a.id);
      const longe = g?.[a.ponta === 'ini' ? 'fim' : 'ini'];
      if (longe) alivios.set(longe.pilar.id, [...(alivios.get(longe.pilar.id) ?? []), { dN: a.dN, dNMin: a.dNMin, viga: g!.viga.nome }]);
    }
  };
  const out = new Map<string, ResultadoFundacao>();
  // os equilibrados primeiro (a alavanca define o alívio das pontas opostas)
  const ordem = [...fe.elementos.filter((e) => eqPorEl.has(e.id)), ...fe.elementos.filter((e) => !eqPorEl.has(e.id))];
  for (const el of ordem) {
    const cota = cotaElemento(b, el);
    if (ge.o.ids && !ge.o.ids.includes(el.id)) continue;
    const ant = anteriores.get(el.id);
    if (ge.niveis && !ge.niveis.some((z) => Math.abs(z - cota) < 1e-3)) { if (ant) { out.set(el.id, { ...ant, mantido: true }); registrarAlivio(ant); } continue; }
    if (ge.modo === 2 && ant && ant.status === 'ok') { out.set(el.id, { ...ant, mantido: true }); registrarAlivio(ant); continue; }
    const r = calcularElemento(b, el, {
      cargas, cargasSemVento, cargasComVento, fv, P0: ge.P0, zt: ge.zt, furos: ge.furos, cota, ant: ge.modo === 1 ? ant : undefined,
      op: ge.op, eq: eqPorEl.get(el.id), alivio: alivios.get(el.pilares[0]),
    });
    registrarAlivio(r);
    out.set(el.id, r);
  }
  return fe.elementos.filter((e) => out.has(e.id)).map((e) => out.get(e.id)!);
}

interface Contexto {
  cargas: Map<string, FLoad>; cargasSemVento: Map<string, FLoad> | null; cargasComVento: Map<string, FLoad> | null; fv: number;
  P0: FoundationParams; zt: number; furos: Boring[]; cota: number; ant?: ResultadoFundacao;
  op: OpcoesCalculo;
  /** Pontas de vigas de equilíbrio que equilibram este elemento. */
  eq?: Ponta[];
  /** Alívios recebidos de vigas de equilíbrio (no pilar do elemento). */
  alivio?: AlivioRecebido[];
}

type Alav = NonNullable<ReturnType<typeof alavanca>>;
type Projeto = { ld: FLoad; d: SupportDesign; e: [number, number]; lev?: { al: Alav; RMin: number; eC: P; eRes: [number, number]; vigas: VigaAlavanca[]; nucleo: boolean } | null };

function calcularElemento(b: BuildingModel, el: ElementoFundacao, cx: Contexto): ResultadoFundacao {
  const fe = b.fundacao!;
  const msgs: string[] = [], notas: string[] = [];
  const p = b.pilares.find((x) => x.id === el.pilares[0]);
  const prof = +(cx.zt - cx.cota).toFixed(3);
  const vazio = (c: [number, number], extra: Partial<ResultadoFundacao> = {}): ResultadoFundacao => ({
    id: el.id, nome: el.nome, tipo: el.tipo, posicao: el.posicao, pilarIds: el.pilares, pilares: el.pilares.map((id) => b.pilares.find((x) => x.id === id)?.nome ?? id),
    cota: cx.cota, profundidade: prof, centro: c, angulo: el.angulo, contorno: [], ap: 0, bp: 0, excentricidade: [0, 0], carga: null, dims: {}, volume: 0,
    status: 'fail', mensagens: msgs, notas, resumo: `${el.nome}: não calculado`, projeto: null, ...extra,
  });
  if (!p) { msgs.push(`Fundação sem pilar: o pilar ${el.pilares[0]} não existe.`); return vazio([el.x, el.y]); }
  if (p.nasce !== 'fundacao') { msgs.push(`Fundação sob pilar que não nasce na fundação (${p.nome}).`); return vazio([el.x, el.y]); }
  const { c, ap, bp } = pilarLocal(b, p, el.angulo);
  let ld0 = cx.cargas.get(p.id);
  if (!ld0) { msgs.push(`Fundação sem cargas: ${ehArranque(p) ? `o arranque ${p.nome} não tem cargas lançadas` : 'calcule a estrutura antes (análise sem resultado)'}.`); return vazio(c, { ap, bp }); }
  if (prof <= 0) { msgs.push(`Fundação acima do terreno: cota de assentamento ${fmt(cx.cota)} m ≥ cota do terreno ${fmt(cx.zt)} m.`); return vazio(c, { ap, bp }); }

  // alívio de vigas de equilíbrio (NBR 6122: só uma parte no Nk; tração verificada com o total e a carga mínima)
  let alivio: ResultadoFundacao['alivio'];
  let aliviar = (ld: FLoad) => ld;
  if (cx.alivio?.length) {
    const tot = cx.alivio.reduce((t, a) => t + a.dN, 0), totMin = cx.alivio.reduce((t, a) => t + a.dNMin, 0);
    const proprio = !!cx.eq?.length;
    const fr = cx.op.vigaEqAlivio / 100;
    const nomes = [...new Set(cx.alivio.map((a) => a.viga))];
    alivio = { total: tot, considerado: proprio ? 0 : fr * tot, minimo: totMin, vigas: nomes };
    if (ld0.NkMin - totMin < -1e-6) msgs.push(`Viga de fundação: tração no elemento aliviado — N mín ${fmt(ld0.NkMin, 1)} kN − alívio total ${fmt(totMin, 1)} kN < 0 (${nomes.join(', ')}).`);
    if (!proprio) {
      aliviar = (ld: FLoad) => ({ ...ld, Nk: +(ld.Nk - fr * tot).toFixed(2), NkMin: +(ld.NkMin - totMin).toFixed(2), NkPerm: +((ld.NkPerm ?? ld.Nk) - totMin).toFixed(2) });
      ld0 = aliviar(ld0);
      notas.push(`Alívio das vigas de equilíbrio ${nomes.join(', ')}: ΔN = ${fmt(tot, 1)} kN, considerados ${fmt(cx.op.vigaEqAlivio, 0)} % no Nk (${fmt(fr * tot, 1)} kN) e o total na carga mínima (${fmt(totMin, 1)} kN).`);
    } else notas.push(`Alívio de ${fmt(tot, 1)} kN (${nomes.join(', ')}) não considerado: o elemento também é equilibrado por viga (a favor da segurança).`);
  }

  // σadm (sapatas e tubulões): o do elemento, o do terreno (informado) ou pelo SPT
  const kind = KIND[el.tipo];
  const P: FoundationParams = parametrosElemento(cx.P0, el, prof);
  let sigmaFonte: string | undefined;
  if (el.tipo !== 'bloco') {
    const s = el.sigmaAdm ?? (fe.terreno.sigmaModo === 'informada' ? fe.terreno.sigmaAdm : undefined);
    if (el.sigmaAdm !== undefined || fe.terreno.sigmaModo === 'informada') {
      if (!s) { msgs.push('Fundação sem σadm: informe a tensão admissível do terreno ou do elemento.'); return vazio(c, { ap, bp }); }
      P.ftSigmaMode = 'informada'; P.ftSigmaAdm = s; P.tbSigmaMode = 'informada'; P.tbSigmaAdm = s;
      sigmaFonte = el.sigmaAdm !== undefined ? 'informada no elemento' : 'informada (terreno)';
    } else {
      if (!cx.furos.length) { msgs.push('Fundação sem sondagem: σadm estimada pelo SPT exige furos de sondagem.'); return vazio(c, { ap, bp }); }
      P.ftSigmaMode = 'spt'; P.tbSigmaMode = 'spt';
    }
  }
  // estacas
  let pile: FLoad['pile'];
  if (el.tipo === 'bloco') {
    const est = fe.terreno.estacas.find((x) => x.id === el.estaca?.id);
    if (!est) { msgs.push('Fundação sem estaca: escolha um tipo de estaca do terreno.'); return vazio(c, { ap, bp }); }
    if (est.modo === 'informada') {
      if (!est.capacidade) { msgs.push(`Fundação sem capacidade da estaca: informe a carga admissível de ${est.nome}.`); return vazio(c, { ap, bp }); }
      pile = { type: est.tipo, D: est.D, capacity: est.capacidade, ...(est.s ? { spacing: est.s } : {}), ...(el.estaca?.n ? { n: el.estaca.n } : {}) };
    } else {
      if (!cx.furos.length) { msgs.push('Fundação sem sondagem: estaca calculada pela sondagem exige furos de sondagem.'); return vazio(c, { ap, bp }); }
      pile = { type: est.tipo, D: est.D };
      P.types = [est.tipo];
      P.diameters = [est.D]; P.precastDiameters = [est.D];
      if (est.s) { if (est.tipo === 'premoldada') P.spacingPrecast = est.s / (est.D / 100); else P.spacingInSitu = est.s / (est.D / 100); }
      if (el.estaca?.n) notas.push('Número de estacas fixo só vale com capacidade informada; pela sondagem, o número sai do cálculo.');
    }
  }
  const furo = el.sondagem ? (el.sondagem.modo === 'furo' ? { boringId: el.sondagem.ids?.[0] } : { boringMode: 'average' as const, boringIds: el.sondagem.ids }) : {};
  const divisa = el.posicao === 'divisa' || el.posicao === 'canto';
  const livreOff: [number, number] = el.posicao === 'livre' ? rot([c[0] - el.x, c[1] - el.y], -el.angulo) : [0, 0];
  const geom = (ld: FLoad, centrada = false): FLoad => ({
    ...cargaLocal(ld, el.angulo), kind, ap, bp, x: c[0], y: c[1], ...furo, ...(pile ? { pile } : {}),
    ...(!centrada && el.tipo === 'sapata' && divisa ? { edge: el.lado ?? [0, 0] } : {}),
    ...(!centrada && el.tipo === 'sapata' && el.posicao === 'livre' ? { offset: livreOff } : {}),
  });
  const data = (ld: FLoad) => ({ boring: cx.furos[0] ?? SEM_FURO, borings: cx.furos.length ? cx.furos : [SEM_FURO], loads: [ld], params: P });

  // sapata com dimensões impostas (ou as do cálculo anterior, no modo "só verificar")
  const imp = el.tipo === 'sapata' ? el.impostas ?? (cx.ant?.dims.A && cx.ant.dims.B ? { A: cx.ant.dims.A, B: cx.ant.dims.B, h: cx.ant.dims.h } : undefined) : undefined;
  if (cx.ant && el.tipo !== 'sapata') notas.push('Verificação de blocos e tubulões com dimensões impostas ainda não disponível: elemento redimensionado.');

  const paramsV = (sigmaFator: number) => (sigmaFator === 1 ? P : { ...P, ftSigmaAdm: P.ftSigmaAdm * sigmaFator, tbSigmaAdm: P.tbSigmaAdm * sigmaFator });
  const projetarSem = (ldIn: FLoad, sigmaFator = 1): Projeto => {
    let ld = geom(ldIn);
    if (imp) ld.fixed = imp;
    const Pv = paramsV(sigmaFator);
    if (el.tipo === 'bloco') {
      // pilar fora do centro do estaqueamento: momento N·e somado (livre: e fixo; divisa/canto: e pelo bloco, por iteração)
      const lado = divisa ? el.lado ?? [0, 0] : [0, 0];
      let e: [number, number] = livreOff;
      let d = designSupport(ld, data(ld));
      const base = ld;
      for (let it = 0; it < 6 && (lado[0] || lado[1] || livreOff[0] || livreOff[1]); it++) {
        if (lado[0] || lado[1]) {
          const lx = d.cap?.lx ?? 0, ly = d.cap?.ly ?? 0;
          e = [lado[0] ? Math.sign(lado[0]) * Math.max(0, lx - ap) / 2 : livreOff[0], lado[1] ? Math.sign(lado[1]) * Math.max(0, ly - bp) / 2 : livreOff[1]];
        }
        ld = { ...base, My: Math.abs(base.My) + Math.abs(base.Nk * e[0]), Mx: Math.abs(base.Mx) + Math.abs(base.Nk * e[1]) };
        const d2 = designSupport(ld, { ...data(ld), params: Pv });
        const igual = d2.cap && d.cap && d2.cap.lx === d.cap.lx && d2.cap.ly === d.cap.ly;
        d = d2;
        if (igual || !(lado[0] || lado[1])) break;
      }
      return { ld, d, e };
    }
    const d = designSupport(ld, { ...data(ld), params: Pv });
    const fr = d.footing && isFooting(d.footing) ? d.footing : null;
    return { ld, d, e: fr ? fr.colOffset : [0, 0] };
  };

  // vigas de equilíbrio: o elemento é calculado centrado com a reação da alavanca, R = N/(1 − Σgᵢ/ℓᵢ)
  const vigasAl: VigaAlavanca[] = (el.tipo === 'sapata' || el.tipo === 'bloco') && cx.eq?.length
    ? cx.eq.map(({ g, ponta }) => ({ u: (ponta === 'ini' ? g.u : [-g.u[0], -g.u[1]]) as P, l: g.L, k: (g.viga.b * g.viga.h ** 3) / 12 / g.L })) : [];
  const trapezoidal = cx.op.vigaEqDistribuicao === 1;
  const dimsDe = (d: SupportDesign): [number, number] | null => (el.tipo === 'sapata' ? (d.footing && isFooting(d.footing) ? [d.footing.A, d.footing.B] : null) : d.cap ? [d.cap.lx, d.cap.ly] : null);
  // posição do pilar em relação ao centro do elemento (eixos do elemento) para as dimensões dadas
  const offsetDe = (dm: [number, number]): [number, number] => {
    if (el.tipo === 'sapata') return columnOffset({ ap, bp, ...(divisa ? { edge: el.lado ?? [0, 0] } : {}), ...(el.posicao === 'livre' ? { offset: livreOff } : {}) }, dm[0], dm[1]);
    const lado = divisa ? el.lado ?? [0, 0] : [0, 0];
    return [lado[0] ? Math.sign(lado[0]) * Math.max(0, dm[0] - ap) / 2 : livreOff[0], lado[1] ? Math.sign(lado[1]) * Math.max(0, dm[1] - bp) / 2 : livreOff[1]];
  };
  let alavancaImpossivel = false;
  const projetarAlavanca = (ldIn: FLoad, sigmaFator = 1): Projeto => {
    const Pv = paramsV(sigmaFator);
    const centrado = (ldC: FLoad, fixo?: { A: number; B: number; h?: number }) => { const l: FLoad = { ...ldC, ...(fixo ? { fixed: fixo } : imp ? { fixed: imp } : {}) }; return { l, d: designSupport(l, { ...data(l), params: Pv }) }; };
    let { l: ldC, d } = centrado(geom(ldIn, true));
    let dm = dimsDe(d);
    if (!dm) return { ld: ldC, d, e: [0, 0], lev: null };
    let out: Projeto = { ld: ldC, d, e: [0, 0], lev: null };
    const vistos: string[] = [];
    for (let it = 0; it < 16; it++) {
      const eLoc = offsetDe(dm);
      const nuc: [number, number] = trapezoidal ? [dm[0] / 6, dm[1] / 6] : [0, 0];
      const eBalLoc: [number, number] = [-Math.sign(eLoc[0]) * Math.max(0, Math.abs(eLoc[0]) - nuc[0]), -Math.sign(eLoc[1]) * Math.max(0, Math.abs(eLoc[1]) - nuc[1])];
      const al = alavanca(ldIn.Nk, rot(eBalLoc, el.angulo), vigasAl);
      if (!al) { alavancaImpossivel = true; return { ...projetarSem(ldIn, sigmaFator), lev: null }; }
      const eResLoc = rot(al.eRes, -el.angulo);
      // excentricidade não equilibrada (eixos do elemento): o resto da alavanca e a parte no núcleo central
      const eUnb: [number, number] = [eResLoc[0] + (-eLoc[0] - eBalLoc[0]), eResLoc[1] + (-eLoc[1] - eBalLoc[1])];
      const loc = geom(ldIn, true);
      const ld: FLoad = {
        ...loc, Nk: +al.R.toFixed(2), NkMin: +(ldIn.NkMin * al.fator).toFixed(2), NkPerm: +((ldIn.NkPerm ?? ldIn.Nk) * al.fator).toFixed(2),
        My: +(Math.abs(loc.My) + al.R * Math.abs(eUnb[0])).toFixed(3), Mx: +(Math.abs(loc.Mx) + al.R * Math.abs(eUnb[1])).toFixed(3),
      };
      const chave = `${dm[0]}|${dm[1]}`;
      const ciclo = vistos.includes(chave);
      vistos.push(chave);
      // sem convergência (ciclo entre tamanhos): verifica a sapata com as maiores dimensões do ciclo
      const fixo = ciclo && el.tipo === 'sapata' && !imp ? { A: Math.max(...vistos.map((k) => +k.split('|')[0])), B: Math.max(...vistos.map((k) => +k.split('|')[1])) } : undefined;
      ({ l: ldC, d } = centrado(ld, fixo));
      out = { ld: ldC, d, e: eLoc, lev: { al, RMin: ldIn.NkMin * al.fator, eC: rot([-eLoc[0], -eLoc[1]], el.angulo), eRes: eResLoc, vigas: vigasAl, nucleo: trapezoidal } };
      const nd = dimsDe(d);
      if (!nd || (nd[0] === dm[0] && nd[1] === dm[1]) || fixo || (ciclo && el.tipo !== 'sapata')) break;
      dm = nd;
    }
    return out;
  };
  const projetar = vigasAl.length ? projetarAlavanca : projetarSem;

  // σadm × fator nas combinações com vento: a maior sapata (ou base) entre as duas verificações
  let r = projetar(ld0);
  if (cx.cargasSemVento && cx.cargasComVento && el.tipo !== 'bloco') {
    const a = cx.cargasSemVento.get(p.id), w = cx.cargasComVento.get(p.id);
    if (a && w) {
      const ra = projetar(aliviar(a)), rw = projetar(aliviar(w), cx.fv);
      const tam = (x: typeof ra) => { const f = x.d.footing, t = x.d.caisson; return f && isFooting(f) ? f.A * f.B : t && isCaisson(t) ? t.Db : Infinity; };
      r = tam(rw) > tam(ra) ? rw : ra;
      notas.push(`Combinações raras sem vento verificadas com σadm e com vento com σadm × ${fmt(cx.fv)}, em separado (critério do programa de referência); adotado o maior elemento.`);
    }
  }
  const { ld, d, e } = r;
  const lev = r.lev ?? null;
  const res = vazio(c, { ap, bp, carga: ld, projeto: d, sigmaFonte, ...(alivio ? { alivio } : {}) });
  if (alavancaImpossivel) msgs.push(`Viga de fundação: alavanca impossível em ${el.nome} — a excentricidade é grande demais para o comprimento das vigas de equilíbrio (Σe/ℓ ≥ 0,9); aumente a viga ou reduza a excentricidade.`);
  if ((el.tipo === 'sapata' || el.tipo === 'bloco') && divisa) {
    if (!lev) msgs.push(`Fundação excêntrica sem viga de equilíbrio (${POSICAO_LABEL[el.posicao]}): a excentricidade do pilar vai como momento ao elemento; lance uma viga de equilíbrio.`);
    else {
      const lado = el.lado ?? [0, 0];
      const falta = [0, 1].filter((k) => lado[k] && Math.abs(lev.eRes[k]) > 0.01);
      if (falta.length) msgs.push(`Fundação excêntrica sem viga de equilíbrio na direção ${falta.map((k) => (k ? 'y' : 'x')).join(' e ')} do elemento (${POSICAO_LABEL[el.posicao]}): ${fmt(Math.max(...falta.map((k) => Math.abs(lev.eRes[k]))), 3)} m da excentricidade ficam como momento; lance uma viga de equilíbrio nessa direção.`);
    }
  }
  const centro = (ex: [number, number]): [number, number] => { const v = rot(ex, el.angulo); return [+(c[0] - v[0]).toFixed(4), +(c[1] - v[1]).toFixed(4)]; };

  if (el.tipo === 'sapata') {
    const f = d.footing!;
    if (!isFooting(f)) { msgs.push(`Fundação sem solução: ${f.messages.join(' ')}`); return res; }
    // com alavanca, a sapata é calculada centrada: a posição do pilar é a geométrica
    const off = lev ? e : f.colOffset;
    const cc = centro(off);
    Object.assign(res, {
      centro: cc, contorno: retangulo(cc, f.A, f.B, el.angulo), excentricidade: off,
      dims: { A: f.A, B: f.B, h: f.h, h0: f.h0 }, sigmaAdm: f.sigmaAdm, sigmaFonte: sigmaFonte ?? f.sigmaSrc, volume: f.volume,
      resumo: `${el.nome}: ${fmt(f.A)} × ${fmt(f.B)} m, h = ${fmt(f.h)} m (h0 = ${fmt(f.h0)} m)${f.fixed ? ', impostas' : ''}${lev ? `, R = ${fmt(lev.al.R, 1)} kN pela alavanca` : ''}`,
    });
    notas.push(...f.messages.filter((m) => f.ok || !/^(Compressão diagonal|Punção|Armadura de flexão não coube|Altura imposta)/.test(m)), ...f.methodNotes);
    if (!f.ok) msgs.push(`Fundação não atende: ${f.messages.filter((m) => /^(Compressão diagonal|Punção|Armadura de flexão não coube|Altura imposta)/.test(m)).join(' ') || 'verificações estruturais.'}`);
  } else if (el.tipo === 'bloco') {
    const cap = d.cap;
    const n = d.pileFixed?.n ?? d.pile?.n;
    if (!cap || !n) {
      const motivo = d.pileFixed?.messages.join(' ') || d.piles?.byType.flatMap((t) => t.diameters.map((x) => x.reason)).filter(Boolean).join(' ') || 'nenhuma estaca atende.';
      msgs.push(`Fundação sem solução: ${motivo}`);
      return res;
    }
    if (d.pileFixed && !d.pileFixed.ok) msgs.push(`Fundação não atende: ${d.pileFixed.messages.join(' ')}`);
    if (!cap.ok) msgs.push(`Fundação não atende: ${cap.messages.join(' ')}`);
    else notas.push(...cap.messages);
    const est = fe.terreno.estacas.find((x) => x.id === el.estaca?.id)!;
    const cc = centro(e);
    const L = d.pile?.L;
    Object.assign(res, {
      centro: cc, contorno: retangulo(cc, cap.lx, cap.ly, el.angulo), excentricidade: e,
      dims: { A: cap.lx, B: cap.ly, h: cap.h, n, D: est.D, estaca: `${PILE_LABEL[est.tipo]} φ${est.D}`, ...(L ? { L } : {}) }, volume: cap.volume,
      resumo: `${el.nome}: ${n} × ${PILE_LABEL[est.tipo].toLowerCase()} φ${est.D} cm${L ? `, L = ${fmt(L, 1)} m` : ''}; bloco ${fmt(cap.lx)} × ${fmt(cap.ly)} × ${fmt(cap.h)} m${lev ? `, R = ${fmt(lev.al.R, 1)} kN pela alavanca` : ''}`,
    });
    if (d.pileFixed) notas.push(`Estacas pela capacidade informada (${fmt(est.capacidade!, 0)} kN): Nmáx = ${fmt(d.pileFixed.loads.Nmax, 0)} kN, Nmín = ${fmt(d.pileFixed.loads.Nmin, 0)} kN.`);
  } else {
    const t = d.caisson!;
    if (!isCaisson(t)) { msgs.push(`Fundação sem solução: ${t.messages.join(' ')}`); return res; }
    Object.assign(res, {
      centro: c, contorno: circulo(c, t.Db), dims: { Df: t.Df, Db: t.Db, H: t.H, L: t.depth }, sigmaAdm: t.sigmaAdm, sigmaFonte: sigmaFonte ?? t.sigmaSrc, volume: t.volume,
      resumo: `${el.nome}: fuste φ${fmt(t.Df)} m, base φ${fmt(t.Db)} m, H = ${fmt(t.H)} m, apoio a ${fmt(t.depth, 1)} m`,
    });
    notas.push(...t.messages);
  }
  if (lev) {
    // alavanca: alívio de cada viga na ponta oposta e extensão do elemento ao longo dela (diagrama da viga)
    const al = lev.al;
    const ext = (u: P) => { const ps = res.contorno.map((q) => dot([q[0] - c[0], q[1] - c[1]], u)); return Math.max(...ps) - Math.min(...ps); };
    res.alavanca = {
      N: ld0.Nk, R: al.R, fator: al.fator, RMin: lev.RMin, e: [+lev.eC[0].toFixed(4), +lev.eC[1].toFixed(4)], eRes: [+lev.eRes[0].toFixed(4), +lev.eRes[1].toFixed(4)],
      distribuicao: lev.nucleo ? 'trapezoidal' : 'retangular',
      vigas: cx.eq!.map((q, i) => ({ id: q.g.viga.id, ponta: q.ponta, dN: al.dN[i], dNMin: (lev.RMin * al.g[i]) / q.g.L, ei: al.g[i], a: ext(lev.vigas[i].u), l: q.g.L })),
    };
    notas.push(`Viga(s) de equilíbrio ${cx.eq!.map((q) => q.g.viga.nome).join(', ')}: elemento centrado pela alavanca, R = N/(1 − Σe/ℓ) = ${fmt(al.R, 1)} kN (N = ${fmt(ld0.Nk, 1)} kN, fator ${fmt(al.fator, 3)}); alívio na ponta oposta ${res.alavanca.vigas.map((x) => `${fmt(x.dN, 1)} kN`).join(', ')}; tensões ${lev.nucleo ? 'trapezoidais (equilibrada só a excentricidade além do núcleo central)' : 'uniformes (equilíbrio total)'}; momentos do pilar ficam no elemento (a confirmar).`);
  }
  if (Math.hypot(e[0], e[1]) > 1e-9 && !lev) notas.push(`Excentricidade do pilar em relação ao centro: ${fmt(e[0], 3)} m em x e ${fmt(e[1], 3)} m em y (eixos do elemento), levada como momento N·e.`);
  res.status = msgs.some((m) => classificar(m).nivel === 'erro') ? 'fail' : 'ok';
  return res;
}

/** Resumo de um resultado para o MCP e a linha de comando (sem o projeto completo). */
export function resumoFundacao(r: ResultadoFundacao) {
  return {
    id: r.id, nome: r.nome, tipo: r.tipo, posicao: r.posicao, pilares: r.pilares, centro: r.centro, angulo: r.angulo, cota: r.cota, profundidade: r.profundidade,
    dims: r.dims, ...(r.sigmaAdm !== undefined ? { sigmaAdm: +r.sigmaAdm.toFixed(1), sigmaFonte: r.sigmaFonte } : {}), volume: +r.volume.toFixed(3),
    ...(r.carga ? { carga: { Nk: r.carga.Nk, NkMin: r.carga.NkMin, Mx: r.carga.Mx, My: r.carga.My, Hx: r.carga.Hx, Hy: r.carga.Hy } } : {}),
    ...(r.alavanca ? { alavanca: { R: +r.alavanca.R.toFixed(1), fator: +r.alavanca.fator.toFixed(4), alivios: r.alavanca.vigas.map((v) => ({ viga: v.id, dN: +v.dN.toFixed(1) })) } } : {}),
    ...(r.alivio ? { alivio: { total: +r.alivio.total.toFixed(1), considerado: +r.alivio.considerado.toFixed(1) } } : {}),
    status: r.status, mensagens: r.mensagens, resumo: r.resumo, ...(r.mantido ? { mantido: true } : {}),
  };
}

/** Próximo nome livre do tipo (S1, B2, T3…). */
export function nomeFundacao(b: BuildingModel, tipo: TipoFundacao) {
  const pre = PREFIXO_FUNDACAO[tipo];
  const n = Math.max(0, ...(b.fundacao?.elementos ?? []).map((e) => { const m = new RegExp(`^${pre}(\\d+)$`).exec(e.nome); return m ? +m[1] : 0; })) + 1;
  return `${pre}${n}`;
}
