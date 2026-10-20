// Fundações do edifício (frente FU, fatia FU1): adaptador entre o modelo do edifício e o núcleo do módulo Fundações.
// Monta a carga de cada elemento (rara máx./mín., permanente; H e M da rara de maior N) a partir das reações na base
// dos pilares (e dos arranques), leva-a aos eixos do elemento e chama `designSupport` (sapata, estacas + bloco,
// tubulão), sem duplicar cálculo. Sapata de divisa e de canto: pilar com a face na borda, excentricidade (A − ap)/2
// levada como momento (sem viga de equilíbrio, erro FUND_EXC_SEM_VIGA; as vigas entram na FU2).
// Unidades: kN, m, kN/m² (σadm), graus.
import { designSupport, type SupportDesign } from '../foundation';
import { isFooting } from '../footings';
import { isCaisson } from '../caissons';
import { defaultFoundationParams, PILE_LABEL, type Boring, type FLoad, type FoundationKind, type FoundationParams } from '../piles';
import type { AnaliseEdificio } from './analitico';
import { reacoesArranques } from './analitico';
import { combinacoesEdificio, type CombinacaoEd } from './combinacoes';
import { gamas } from './materiais';
import { opcoesEmUso, perfilDe } from './opcoes';
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
  for (const f of an.fundacao) { const r = porPilar.get(f.pilar) ?? {}; r[f.caso] = f; porPilar.set(f.pilar, r); }
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

/** Parâmetros do núcleo de fundações para o edifício: padrão do módulo, materiais da obra e o que o usuário alterou. */
export function parametrosFundacao(b: BuildingModel): FoundationParams {
  const g = gamas(b);
  return { ...defaultFoundationParams(), fckFound: b.norma.fck, fyk: b.norma.aco === 'CA-60' ? 600 : 500, gammaC: g.c, gammaS: g.s, gammaF: g.g, ...b.fundacao?.params };
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
  /** Modo "redimensionar só os com erro": resultado anterior mantido. */
  mantido?: boolean;
}

export interface OpcoesFundacao {
  /** 0 = dimensionar tudo; 1 = só verificar (dimensões impostas ou as do cálculo anterior); 2 = redimensionar só os com erro. Padrão: opção `fundModo`. */
  modo?: number;
  /** Resultados anteriores (modos 1 e 2). */
  anteriores?: ResultadoFundacao[];
  /** Só os elementos destes níveis (cotas de assentamento). */
  niveis?: number[];
  /** Só estes elementos. */
  ids?: string[];
}

const rot = (v: [number, number], graus: number): [number, number] => { const a = (graus * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c]; };

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
 * carga). Os elementos que não podem ser calculados voltam com erro e sem projeto.
 */
export function calcularFundacoes(b: BuildingModel, an: AnaliseEdificio | null, o: OpcoesFundacao = {}): ResultadoFundacao[] {
  const fe = b.fundacao;
  if (!fe?.elementos.length) return [];
  const base: Pick<AnaliseEdificio, 'fundacao' | 'vento'> = an && an.fundacao.length ? an : { fundacao: reacoesArranques(b), vento: an?.vento ?? null };
  const modo = o.modo ?? opcoesEmUso(b.opcoes, perfilDe(b)).fundModo;
  const cargas = cargasPorPilar(b, base);
  // combinações com vento (majoração de σadm)
  const ventos = new Set([...(base.vento?.casos ?? []).map((c) => c.nome), ...casosDaObra(b).filter((c) => c.natureza === 'W').map((c) => c.id)]);
  const comVento = (c: CombinacaoEd) => Object.entries(c.fatores).some(([k, f]) => f !== 0 && ventos.has(k));
  const fv = fe.terreno.fatorVento ?? 1;
  const separar = Math.abs(fv - 1) > 1e-9 && ventos.size > 0;
  const cargasSemVento = separar ? cargasPorPilar(b, base, (c) => !comVento(c)) : null;
  const cargasComVento = separar ? cargasPorPilar(b, base, comVento) : null;
  const P0 = parametrosFundacao(b);
  const zt = cotaTerreno(b);
  const furos = fe.sondagens;
  const anteriores = new Map((o.anteriores ?? []).map((r) => [r.id, r]));
  const out: ResultadoFundacao[] = [];
  for (const el of fe.elementos) {
    const cota = cotaElemento(b, el);
    if (o.ids && !o.ids.includes(el.id)) continue;
    if (o.niveis && !o.niveis.some((z) => Math.abs(z - cota) < 1e-3)) continue;
    const ant = anteriores.get(el.id);
    if (modo === 2 && ant && ant.status === 'ok') { out.push({ ...ant, mantido: true }); continue; }
    out.push(calcularElemento(b, el, { cargas, cargasSemVento, cargasComVento, fv, P0, zt, furos, cota, ant: modo === 1 ? ant : undefined }));
  }
  return out;
}

interface Contexto {
  cargas: Map<string, FLoad>; cargasSemVento: Map<string, FLoad> | null; cargasComVento: Map<string, FLoad> | null; fv: number;
  P0: FoundationParams; zt: number; furos: Boring[]; cota: number; ant?: ResultadoFundacao;
}

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
  const ld0 = cx.cargas.get(p.id);
  if (!ld0) { msgs.push(`Fundação sem cargas: ${ehArranque(p) ? `o arranque ${p.nome} não tem cargas lançadas` : 'calcule a estrutura antes (análise sem resultado)'}.`); return vazio(c, { ap, bp }); }
  if (prof <= 0) { msgs.push(`Fundação acima do terreno: cota de assentamento ${fmt(cx.cota)} m ≥ cota do terreno ${fmt(cx.zt)} m.`); return vazio(c, { ap, bp }); }

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
  const geom = (ld: FLoad): FLoad => ({
    ...cargaLocal(ld, el.angulo), kind, ap, bp, x: c[0], y: c[1], ...furo, ...(pile ? { pile } : {}),
    ...(el.tipo === 'sapata' && (el.posicao === 'divisa' || el.posicao === 'canto') ? { edge: el.lado ?? [0, 0] } : {}),
    ...(el.tipo === 'sapata' && el.posicao === 'livre' ? { offset: rot([c[0] - el.x, c[1] - el.y], -el.angulo) } : {}),
  });
  const data = (ld: FLoad) => ({ boring: cx.furos[0] ?? SEM_FURO, borings: cx.furos.length ? cx.furos : [SEM_FURO], loads: [ld], params: P });

  // sapata com dimensões impostas (ou as do cálculo anterior, no modo "só verificar")
  const imp = el.tipo === 'sapata' ? el.impostas ?? (cx.ant?.dims.A && cx.ant.dims.B ? { A: cx.ant.dims.A, B: cx.ant.dims.B, h: cx.ant.dims.h } : undefined) : undefined;
  if (cx.ant && el.tipo !== 'sapata') notas.push('Verificação de blocos e tubulões com dimensões impostas ainda não disponível: elemento redimensionado.');

  const projetar = (ld0: FLoad, sigmaFator = 1): { ld: FLoad; d: SupportDesign; e: [number, number] } => {
    let ld = geom(ld0);
    if (imp) ld.fixed = imp;
    const Pv = sigmaFator === 1 ? P : { ...P, ftSigmaAdm: P.ftSigmaAdm * sigmaFator, tbSigmaAdm: P.tbSigmaAdm * sigmaFator };
    if (el.tipo === 'bloco') {
      // pilar fora do centro do estaqueamento: momento N·e somado (livre: e fixo; divisa/canto: e pelo bloco, por iteração)
      const livre: [number, number] = el.posicao === 'livre' ? rot([c[0] - el.x, c[1] - el.y], -el.angulo) : [0, 0];
      const lado = el.posicao === 'divisa' || el.posicao === 'canto' ? el.lado ?? [0, 0] : [0, 0];
      let e: [number, number] = livre;
      let d = designSupport(ld, data(ld));
      const base = ld;
      for (let it = 0; it < 6 && (lado[0] || lado[1] || livre[0] || livre[1]); it++) {
        if (lado[0] || lado[1]) {
          const lx = d.cap?.lx ?? 0, ly = d.cap?.ly ?? 0;
          e = [lado[0] ? Math.sign(lado[0]) * Math.max(0, lx - ap) / 2 : livre[0], lado[1] ? Math.sign(lado[1]) * Math.max(0, ly - bp) / 2 : livre[1]];
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

  // σadm × fator nas combinações com vento: a maior sapata (ou base) entre as duas verificações
  let r = projetar(ld0);
  if (cx.cargasSemVento && cx.cargasComVento && el.tipo !== 'bloco') {
    const a = cx.cargasSemVento.get(p.id), w = cx.cargasComVento.get(p.id);
    if (a && w) {
      const ra = projetar(a), rw = projetar(w, cx.fv);
      const tam = (x: typeof ra) => { const f = x.d.footing, t = x.d.caisson; return f && isFooting(f) ? f.A * f.B : t && isCaisson(t) ? t.Db : Infinity; };
      r = tam(rw) > tam(ra) ? rw : ra;
      notas.push(`Combinações com vento verificadas com σadm × ${fmt(cx.fv)} (a confirmar); adotado o maior elemento.`);
    }
  }
  const { ld, d, e } = r;
  const res = vazio(c, { ap, bp, carga: ld, projeto: d, sigmaFonte });
  if ((el.tipo === 'sapata' || el.tipo === 'bloco') && (el.posicao === 'divisa' || el.posicao === 'canto'))
    msgs.push(`Fundação excêntrica sem viga de equilíbrio (${POSICAO_LABEL[el.posicao]}): a excentricidade do pilar vai como momento ao elemento; lance uma viga de equilíbrio (FU2).`);
  const centro = (ex: [number, number]): [number, number] => { const v = rot(ex, el.angulo); return [+(c[0] - v[0]).toFixed(4), +(c[1] - v[1]).toFixed(4)]; };

  if (el.tipo === 'sapata') {
    const f = d.footing!;
    if (!isFooting(f)) { msgs.push(`Fundação sem solução: ${f.messages.join(' ')}`); return res; }
    const cc = centro(f.colOffset);
    Object.assign(res, {
      centro: cc, contorno: retangulo(cc, f.A, f.B, el.angulo), excentricidade: f.colOffset,
      dims: { A: f.A, B: f.B, h: f.h, h0: f.h0 }, sigmaAdm: f.sigmaAdm, sigmaFonte: sigmaFonte ?? f.sigmaSrc, volume: f.volume,
      resumo: `${el.nome}: ${fmt(f.A)} × ${fmt(f.B)} m, h = ${fmt(f.h)} m (h0 = ${fmt(f.h0)} m)${f.fixed ? ', impostas' : ''}`,
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
      resumo: `${el.nome}: ${n} × ${PILE_LABEL[est.tipo].toLowerCase()} φ${est.D} cm${L ? `, L = ${fmt(L, 1)} m` : ''}; bloco ${fmt(cap.lx)} × ${fmt(cap.ly)} × ${fmt(cap.h)} m`,
    });
    if (d.pileFixed) notas.push(`Estacas pela capacidade informada (${fmt(est.capacidade!, 0)} kN): Nmáx = ${fmt(d.pileFixed.loads.Nmax, 0)} kN, Nmín = ${fmt(d.pileFixed.loads.Nmin, 0)} kN.`);
    if (n <= 2) notas.push(`Bloco de ${n} estaca(s): exige vigas de travamento (FU2).`);
  } else {
    const t = d.caisson!;
    if (!isCaisson(t)) { msgs.push(`Fundação sem solução: ${t.messages.join(' ')}`); return res; }
    Object.assign(res, {
      centro: c, contorno: circulo(c, t.Db), dims: { Df: t.Df, Db: t.Db, H: t.H, L: t.depth }, sigmaAdm: t.sigmaAdm, sigmaFonte: sigmaFonte ?? t.sigmaSrc, volume: t.volume,
      resumo: `${el.nome}: fuste φ${fmt(t.Df)} m, base φ${fmt(t.Db)} m, H = ${fmt(t.H)} m, apoio a ${fmt(t.depth, 1)} m`,
    });
    notas.push(...t.messages);
  }
  if (Math.hypot(e[0], e[1]) > 1e-9) notas.push(`Excentricidade do pilar em relação ao centro: ${fmt(e[0], 3)} m em x e ${fmt(e[1], 3)} m em y (eixos do elemento), levada como momento N·e.`);
  res.status = msgs.some((m) => !/^Fundação \(aviso\)/.test(m)) ? 'fail' : 'ok';
  return res;
}

/** Resumo de um resultado para o MCP e a linha de comando (sem o projeto completo). */
export function resumoFundacao(r: ResultadoFundacao) {
  return {
    id: r.id, nome: r.nome, tipo: r.tipo, posicao: r.posicao, pilares: r.pilares, centro: r.centro, angulo: r.angulo, cota: r.cota, profundidade: r.profundidade,
    dims: r.dims, ...(r.sigmaAdm !== undefined ? { sigmaAdm: +r.sigmaAdm.toFixed(1), sigmaFonte: r.sigmaFonte } : {}), volume: +r.volume.toFixed(3),
    ...(r.carga ? { carga: { Nk: r.carga.Nk, NkMin: r.carga.NkMin, Mx: r.carga.Mx, My: r.carga.My, Hx: r.carga.Hx, Hy: r.carga.Hy } } : {}),
    status: r.status, mensagens: r.mensagens, resumo: r.resumo, ...(r.mantido ? { mantido: true } : {}),
  };
}

/** Próximo nome livre do tipo (S1, B2, T3…). */
export function nomeFundacao(b: BuildingModel, tipo: TipoFundacao) {
  const pre = PREFIXO_FUNDACAO[tipo];
  const n = Math.max(0, ...(b.fundacao?.elementos ?? []).map((e) => { const m = new RegExp(`^${pre}(\\d+)$`).exec(e.nome); return m ? +m[1] : 0; })) + 1;
  return `${pre}${n}`;
}
