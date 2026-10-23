// Flechas do edifício (frente N2f): etapas de carregamento (processo construtivo), fluência por etapa (NBR 6118,
// 17.3.2.1.2, t0 ponderado), flechas por tipo (instantânea por categoria de carga, diferida, total a longo prazo, ativa
// e da variável), limites por tipo de flecha e de elemento (ℓ/x, ℓ/x + cm ou absoluto), Branson com a seção
// homogeneizada e a recomposição da grelha das lajes com a rigidez fissurada. Funções puras: a integração das
// curvaturas das vigas fica em `dimensionamento.ts` (`flechasVigaSets`), que chama estas funções.
import { bransonRatio, ES, type BeamSection, type Concrete } from '../concrete';
import { resolver3, type Caso3, type Modelo3, type Resultado3 } from '../fe3d';
import { dentroPoligono, areaPoligono } from '../geom/faces';
import { propriedadesLaje } from './lajes';
import type { OpcoesCalculo } from './opcoes';
import type { BuildingModel, Laje } from './types';

/** Categorias da carga permanente para as etapas. */
export type CategoriaG = 'pp' | 'alvenaria' | 'revestimento';
export const CATEGORIAS_G: CategoriaG[] = ['pp', 'alvenaria', 'revestimento'];

/**
 * Etapa do processo construtivo: idade (dias desde a concretagem) e as frações de cada categoria de carga aplicadas nela.
 * `variavel` = fração da parcela quase permanente das variáveis (ψ2·Q) que passa a atuar nessa etapa.
 */
export interface EtapaCarga { nome: string; dias: number; pp: number; alvenaria: number; revestimento: number; variavel: number }

/** Tipo de elemento para etapas e limites próprios (nervuradas e alveolares entram com a E3). */
export type TipoElementoFlecha = 'viga' | 'macica' | 'trelicada';
export const TIPOS_ELEMENTO_FLECHA: { v: TipoElementoFlecha; rotulo: string }[] = [
  { v: 'viga', rotulo: 'Vigas' }, { v: 'macica', rotulo: 'Lajes maciças' }, { v: 'trelicada', rotulo: 'Lajes treliçadas' },
];
/** Tipo de flecha com limite próprio. */
export type TipoFlecha = 'total' | 'ativa' | 'variavel' | 'instantanea';
export const TIPOS_FLECHA: { v: TipoFlecha; rotulo: string }[] = [
  { v: 'total', rotulo: 'Total a longo prazo' }, { v: 'ativa', rotulo: 'Ativa (após as paredes)' },
  { v: 'variavel', rotulo: 'Instantânea da variável' }, { v: 'instantanea', rotulo: 'Instantânea total' },
];

/** Limite de flecha: ℓ/rel (+ mais, cm), limitado a abs (cm). Zero desliga a parcela; tudo zero = sem verificação. */
export interface LimiteFlecha { rel: number; mais?: number; abs?: number }

/** Configuração das flechas no modelo (`BuildingModel.flechas`): etapas e limites por tipo de elemento. */
export interface FlechasConfig {
  etapas?: Partial<Record<TipoElementoFlecha, EtapaCarga[]>>;
  limites?: Partial<Record<TipoElementoFlecha, Partial<Record<TipoFlecha, LimiteFlecha>>>>;
}

/**
 * Etapas padrão (exemplo do manual de cálculo do programa de referência): peso próprio na desforma aos 28 dias,
 * alvenaria aos 60, revestimento aos 120 e a parcela quase permanente do uso após 1 ano.
 */
export const ETAPAS_PADRAO: EtapaCarga[] = [
  { nome: 'Desforma (peso próprio)', dias: 28, pp: 1, alvenaria: 0, revestimento: 0, variavel: 0 },
  { nome: 'Alvenaria', dias: 60, pp: 0, alvenaria: 1, revestimento: 0, variavel: 0 },
  { nome: 'Revestimento', dias: 120, pp: 0, alvenaria: 0, revestimento: 1, variavel: 0 },
  { nome: 'Uso (quase permanente)', dias: 365, pp: 0, alvenaria: 0, revestimento: 0, variavel: 1 },
];

/** Etapas em uso de um tipo de elemento (as do modelo ou as padrão). */
export const etapasDe = (b: Pick<BuildingModel, 'flechas'>, tipo: TipoElementoFlecha): EtapaCarga[] => b.flechas?.etapas?.[tipo] ?? ETAPAS_PADRAO;

/** Erro de uma lista de etapas (frações entre 0 e 1 e soma por categoria ≤ 1, idades > 0), ou null. */
export function validarEtapas(etapas: EtapaCarga[]): string | null {
  if (!etapas.length) return 'A lista de etapas está vazia.';
  for (const e of etapas) {
    if (!(e.dias > 0)) return `Etapa "${e.nome}": idade deve ser maior que zero.`;
    for (const k of [...CATEGORIAS_G, 'variavel'] as const) if (!(e[k] >= 0 && e[k] <= 1)) return `Etapa "${e.nome}": fração de ${k} fora de 0 a 1.`;
  }
  for (const k of [...CATEGORIAS_G, 'variavel'] as const) { const s = etapas.reduce((t, e) => t + e[k], 0); if (s > 1 + 1e-9) return `A soma das frações de ${k} nas etapas é ${s.toFixed(2).replace('.', ',')} (> 1).`; }
  return null;
}

/** ξ(t) da NBR 6118, Tabela 17.1 (t em meses; t > 70 → 2). */
export const xiNBR = (tMeses: number) => (tMeses > 70 ? 2 : 0.68 * 0.996 ** tMeses * Math.max(0, tMeses) ** 0.32);
/** ξ(t) com t em dias (30 dias por mês). */
export const xiDias = (dias: number) => xiNBR(dias / 30);

/** Flechas instantâneas (m) por categoria de carga: G por categoria, variáveis (Q total) e a parcela quase permanente (ψ2·Q). */
export interface FlechasInstantaneas { pp: number; alvenaria: number; revestimento: number; q: number; qqp: number }

export interface ComposicaoEtapas {
  /** Instantânea total: G das etapas + variável (Q ou ψ2·Q conforme `qInstantanea`). */
  instantanea: number;
  /** Diferida total (fluência das cargas de longa duração, cada uma desde a sua idade). */
  diferida: number;
  total: number;
  /** Ativa: o que ocorre depois do elemento danificável (paredes): fA = αg·fg + αq·fq. */
  ativa: number;
  /** Parcela ocorrida até a execução das paredes (total = ativa + antes). */
  antes: number;
  /** Idade de execução das paredes (dias; 0 sem etapa de alvenaria). */
  tParedes: number;
  /** ξ médio ponderado pelas cargas (Σ Pi·Δξi / P instantânea), λ = ξ/(1 + 50ρ′) e o mesmo para a ativa. */
  xiMedio: number; lambda: number; xiMedioAtiva: number; lambdaAtiva: number;
  /** Coeficientes da ativa sobre as instantâneas: αg sobre G (todas as categorias) e αq sobre Q. */
  alfaG: number; alfaQ: number;
  /** Fatores sobre a instantânea total: total/inst e ativa/inst. */
  fatorTotal: number; fatorAtiva: number;
  porEtapa: { nome: string; dias: number; carga: number; dXi: number; dXiAtiva: number }[];
}

/**
 * Composição das flechas por etapas (NBR 6118, 17.3.2.1.2, com t0 ponderado pelas cargas). Cada etapa aplica, na sua
 * idade ti, as frações de cada categoria; a diferida de cada parcela é Δξ = ξ(∞) − ξ(ti), dividida por (1 + 50ρ′).
 * A ativa soma, das cargas aplicadas depois das paredes (t ≥ tp), a instantânea e, de todas, a diferida após tp
 * (Δξ = ξ(∞) − ξ(máx(ti, tp))). A variável instantânea entra inteira (`qInstantanea` = 'total', critério do programa
 * de referência) ou só a parcela quase permanente ('qp', combinação quase permanente da NBR 6118, 11.8.3.1).
 */
export function composicaoEtapas(etapas: EtapaCarga[], d: FlechasInstantaneas, o: { rho?: number; xi?: (dias: number) => number; qInstantanea?: 'total' | 'qp' } = {}): ComposicaoEtapas {
  const xi = o.xi ?? xiDias, xiInf = xi(Infinity), den = 1 + 50 * Math.max(0, o.rho ?? 0);
  const qInst = o.qInstantanea === 'qp' ? d.qqp : d.q;
  const comAlv = etapas.filter((e) => e.alvenaria > 0);
  const tp = comAlv.length ? Math.min(...comAlv.map((e) => e.dias)) : 0;
  const comQ = etapas.filter((e) => e.variavel > 0);
  const tQ = comQ.length ? Math.max(...comQ.map((e) => e.dias)) : Math.max(...etapas.map((e) => e.dias), 0);
  let instG = 0, instGAtiva = 0, difG = 0, difQ = 0, difGA = 0, difQA = 0;
  const porEtapa: ComposicaoEtapas['porEtapa'] = [];
  for (const e of etapas) {
    const g = e.pp * d.pp + e.alvenaria * d.alvenaria + e.revestimento * d.revestimento, q = e.variavel * d.qqp;
    const dXi = Math.max(0, xiInf - xi(e.dias)), dXiA = Math.max(0, xiInf - xi(Math.max(e.dias, tp)));
    instG += g; if (e.dias >= tp) instGAtiva += g;
    difG += g * dXi; difQ += q * dXi; difGA += g * dXiA; difQA += q * dXiA;
    porEtapa.push({ nome: e.nome, dias: e.dias, carga: g + q, dXi, dXiAtiva: dXiA });
  }
  const instantanea = instG + qInst, diferida = (difG + difQ) / den, total = instantanea + diferida;
  const qAtiva = tQ >= tp ? qInst : 0;
  const ativaG = instGAtiva + difGA / den, ativaQ = qAtiva + difQA / den, ativa = ativaG + ativaQ;
  const gTot = d.pp + d.alvenaria + d.revestimento;
  const xiMedio = instantanea > 0 ? (difG + difQ) / instantanea : 0, xiMedioAtiva = instantanea > 0 ? (difGA + difQA) / instantanea : 0;
  return {
    instantanea, diferida, total, ativa, antes: total - ativa, tParedes: tp,
    xiMedio, lambda: xiMedio / den, xiMedioAtiva, lambdaAtiva: xiMedioAtiva / den,
    alfaG: gTot > 0 ? ativaG / gTot : 0, alfaQ: d.q > 0 ? ativaQ / d.q : 0,
    fatorTotal: instantanea > 0 ? total / instantanea : 0, fatorAtiva: instantanea > 0 ? ativa / instantanea : 0, porEtapa,
  };
}

/** Limite (m) para o vão L; balanço usa 2L. Infinity quando o limite está desligado. */
export function limiteFlecha(L: number, lim: LimiteFlecha | undefined, balanco = false): number {
  if (!lim) return Infinity;
  const Lr = balanco ? 2 * L : L;
  let v = lim.rel > 0 ? Lr / lim.rel + (lim.mais ?? 0) / 100 : Infinity;
  if ((lim.abs ?? 0) > 0) v = Math.min(v, lim.abs! / 100);
  return v;
}
/** Texto do limite: "ℓ/500 e 1,0 cm", "ℓ/250 + 1,0 cm", "2ℓ/250" (balanço), "2,0 cm". */
export function textoLimite(lim: LimiteFlecha | undefined, balanco = false): string {
  if (!lim) return '—';
  const n = (x: number) => String(+x.toFixed(2)).replace('.', ',');
  const partes: string[] = [];
  if (lim.rel > 0) partes.push(`${balanco ? '2ℓ' : 'ℓ'}/${n(lim.rel)}${(lim.mais ?? 0) > 0 ? ` + ${n(lim.mais!)} cm` : ''}`);
  if ((lim.abs ?? 0) > 0) partes.push(`${n(lim.abs!)} cm`);
  return partes.join(' e ') || '—';
}

/** Limites em uso por tipo de flecha para um tipo de elemento: opções gerais + o que o modelo define para o tipo. */
export function limitesEmUso(b: Pick<BuildingModel, 'flechas'>, op: OpcoesCalculo, tipo: TipoElementoFlecha): Record<TipoFlecha, LimiteFlecha> {
  const base: Record<TipoFlecha, LimiteFlecha> = {
    total: { rel: op.limiteFlechaTotal },
    ativa: { rel: op.limiteFlechaAtiva, abs: op.limiteFlechaAtivaAbs },
    variavel: { rel: op.limiteFlechaSensorial },
    instantanea: { rel: op.limiteFlechaInst },
  };
  const m = b.flechas?.limites?.[tipo] ?? {};
  return { total: m.total ?? base.total, ativa: m.ativa ?? base.ativa, variavel: m.variavel ?? base.variavel, instantanea: m.instantanea ?? base.instantanea };
}

/** Tipo de elemento de uma laje para as flechas. */
export const tipoFlechaLaje = (l: Pick<Laje, 'tipo'>): TipoElementoFlecha => (l.tipo.tipo === 'macica' || l.tipo.tipo === 'nervurada' ? 'macica' : 'trelicada');

/** Frações da carga permanente por categoria (somam 1; sem carga, tudo no peso próprio). */
export type FracoesG = Record<CategoriaG, number>;
const normalizar = (x: FracoesG): FracoesG => { const s = x.pp + x.alvenaria + x.revestimento; return s > 0 ? { pp: x.pp / s, alvenaria: x.alvenaria / s, revestimento: x.revestimento / s } : { pp: 1, alvenaria: 0, revestimento: 0 }; };
const compr = (pts: [number, number][]) => pts.slice(1).reduce((t, p, i) => t + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
const meio = (pts: [number, number][]): [number, number] => { if (pts.length === 1) return pts[0]; const a = pts[0], z = pts[1]; return [(a[0] + z[0]) / 2, (a[1] + z[1]) / 2]; };
const centro = (pts: [number, number][]): [number, number] => [pts.reduce((t, p) => t + p[0], 0) / pts.length, pts.reduce((t, p) => t + p[1], 0) / pts.length];

/**
 * Frações da carga permanente de uma laje: peso próprio (tipo da laje), revestimento do grupo + cargas G de área e
 * pontuais dentro da laje (outras permanentes), alvenaria = cargas G lineares dentro da laje [a confirmar: por laje,
 * carga média na área].
 */
export function fracoesGLaje(b: BuildingModel, l: Laje): FracoesG {
  const A = Math.abs(areaPoligono(l.contorno)) || 1, gr = b.grupos.find((g) => g.id === l.grupo);
  const x: FracoesG = { pp: propriedadesLaje(l.tipo).pp, alvenaria: 0, revestimento: gr?.gRev ?? 0 };
  for (const c of b.cargas) {
    if (c.grupo !== l.grupo || c.caso !== 'G' || !c.pontos.length) continue;
    if (c.tipo === 'linha') { if (dentroPoligono(meio(c.pontos), l.contorno)) x.alvenaria += (c.valor * compr(c.pontos)) / A; }
    else if (c.tipo === 'area') { if (dentroPoligono(centro(c.pontos), l.contorno)) x.revestimento += (c.valor * Math.min(A, Math.abs(areaPoligono(c.pontos)))) / A; }
    else if (dentroPoligono(c.pontos[0], l.contorno)) x.revestimento += c.valor / A;
  }
  return normalizar(x);
}

/**
 * Frações da carga permanente das vigas de um grupo, pelos totais do grupo [a confirmar: proporção do grupo, não por
 * viga]: peso próprio das lajes e vigas, revestimento do grupo + cargas G de área e pontuais, alvenaria = cargas G lineares.
 */
export function fracoesGGrupo(b: BuildingModel, grupo: string): FracoesG {
  const gr = b.grupos.find((g) => g.id === grupo), x: FracoesG = { pp: 0, alvenaria: 0, revestimento: 0 };
  for (const l of b.lajes.filter((y) => y.grupo === grupo)) { const A = Math.abs(areaPoligono(l.contorno)); x.pp += propriedadesLaje(l.tipo).pp * A; x.revestimento += (gr?.gRev ?? 0) * A; }
  for (const v of b.vigas.filter((y) => y.grupo === grupo)) x.pp += 25 * v.secao.b * v.secao.h * compr(v.pontos);
  for (const c of b.cargas) {
    if (c.grupo !== grupo || c.caso !== 'G' || !c.pontos.length) continue;
    if (c.tipo === 'linha') x.alvenaria += c.valor * compr(c.pontos);
    else if (c.tipo === 'area') x.revestimento += c.valor * Math.abs(areaPoligono(c.pontos));
    else x.revestimento += c.valor;
  }
  return normalizar(x);
}

/** Separa a flecha instantânea de G nas categorias. */
export const instantaneasPorCategoria = (fG: number, fr: FracoesG, q: number, qqp: number): FlechasInstantaneas => ({ pp: fG * fr.pp, alvenaria: fG * fr.alvenaria, revestimento: fG * fr.revestimento, q, qqp });

/**
 * Branson (NBR 6118, 17.3.2.1.1) com a seção no estádio I homogeneizada (αe = Es/Ecs) quando `homogeneizada`: Mr e
 * a inércia de estádio I passam a ser os da seção com as armaduras (tracionada As a d, comprimida AsC a dC). Só para
 * seções retangulares; seção T e `homogeneizada` falso caem no Branson da seção bruta (`bransonRatio`).
 * Retorna Ie (m⁴), I de estádio I usado, III e Mr (kN·m).
 */
export function bransonFlecha(sec: BeamSection, flangeComp: boolean, As: number, d: number, Ma: number, c: Concrete, homogeneizada = false, AsC = 0, dC = 0): { Ie: number; I1: number; III: number; Mr: number } {
  const r = bransonRatio(sec, flangeComp, As, d, Ma, c);
  if (!homogeneizada || sec.kind !== 'rect') return { Ie: r.Ie, I1: r.Ic, III: r.III, Mr: r.Mr };
  const ae = ES / c.Ecs, bw = sec.bw, h = sec.h, n1 = ae - 1;
  const A = bw * h + n1 * (As + AsC), S = (bw * h * h) / 2 + n1 * (As * d + AsC * dC), yc = S / A; // do topo
  const I1 = (bw * h ** 3) / 12 + bw * h * (h / 2 - yc) ** 2 + n1 * (As * (d - yc) ** 2 + AsC * (yc - dC) ** 2);
  const Mr = ((1.5 * c.fctm * I1) / (h - yc)) * 1000;
  const m = Math.abs(Ma), k = m > 0 ? Math.min(1, (Mr / m) ** 3) : 1;
  return { Ie: Math.min(I1, k * I1 + (1 - k) * r.III), I1, III: r.III, Mr };
}

/**
 * Grelha das lajes com a rigidez fissurada (K1.15.4-15): Iz de cada barra de laje multiplicada por `fator[barra]`
 * (Ie/Ic de Branson) e resolvida de novo com os mesmos casos e apoios.
 */
export function resolverGrelhaFissurada(m: Modelo3, casos: Caso3[], fator: Map<number, number>): Resultado3 {
  const barras = m.barras.map((br, i) => { const f = fator.get(i); return f === undefined || f >= 1 ? br : { ...br, Iz: br.Iz * f }; });
  return resolver3({ ...m, barras }, casos);
}

/** Inércia média do vão (K1.15.4-16): [(Ie,esq + Ie,dir)/2 + Ie,centro]/2. */
export const inerciaMediaVao = (esq: number, dir: number, centroV: number) => ((esq + dir) / 2 + centroV) / 2;

/** Flechas de um elemento por tipo, com os limites (m) e a situação; para o memorial e a janela do elemento. */
export interface FlechasElemento {
  metodo: 'etapas' | 'fator' | 'simplificado';
  /** Instantâneas por categoria (m). */
  instantaneas: FlechasInstantaneas;
  instantanea: number; diferida: number; total: number; ativa: number; variavel: number;
  /** Fatores sobre a instantânea quando o método é simplificado ou por fator único. */
  limites: Record<TipoFlecha, number>;
  /** Texto dos limites (ℓ/x...). */
  textos: Record<TipoFlecha, string>;
  vao: number; balanco: boolean;
  /** Composição por etapas (método 'etapas'). */
  etapas?: ComposicaoEtapas;
  /** ρ′ usado na fluência e fator de fissuração da laje (δ fissurada / δ elástica). */
  rho: number; fissuracao?: number;
}

/** Monta o resumo por tipo de flecha com os limites do elemento. */
export function resumoFlechas(x: Omit<FlechasElemento, 'limites' | 'textos'>, lims: Record<TipoFlecha, LimiteFlecha>): FlechasElemento {
  const tipos: TipoFlecha[] = ['total', 'ativa', 'variavel', 'instantanea'];
  return { ...x, limites: Object.fromEntries(tipos.map((t) => [t, limiteFlecha(x.vao, lims[t], x.balanco)])) as Record<TipoFlecha, number>, textos: Object.fromEntries(tipos.map((t) => [t, textoLimite(lims[t], x.balanco)])) as Record<TipoFlecha, string> };
}

/**
 * Linhas da tabela de flechas por tipo (janela do elemento e memorial), em mm: total, ativa, variável e instantânea,
 * cada uma com o limite e se atende (limite desligado = atende, `limite` null).
 */
export function linhasFlechas(f: FlechasElemento): { tipo: TipoFlecha; rotulo: string; mm: number; limiteMm: number | null; texto: string; ok: boolean }[] {
  const val: Record<TipoFlecha, number> = { total: f.total, ativa: f.ativa, variavel: f.variavel, instantanea: f.instantanea };
  return TIPOS_FLECHA.map(({ v, rotulo }) => {
    const lim = f.limites[v];
    return { tipo: v, rotulo, mm: val[v] * 1000, limiteMm: Number.isFinite(lim) ? lim * 1000 : null, texto: f.textos[v], ok: !(val[v] > lim + 1e-12) };
  });
}

/** Resumo compacto e serializável em JSON (limite desligado = null), para o MCP. */
export function resumoFlechasJson(f: FlechasElemento) {
  const lim = (x: number) => (Number.isFinite(x) ? x : null);
  return { metodo: f.metodo, total: f.total, ativa: f.ativa, variavel: f.variavel, instantanea: f.instantanea, limites: { total: lim(f.limites.total), ativa: lim(f.limites.ativa), variavel: lim(f.limites.variavel), instantanea: lim(f.limites.instantanea) } };
}

/** Mensagens das flechas ativa e instantânea (as de total e variável continuam nos textos antigos). */
export function mensagensFlechasNovas(f: FlechasElemento): string[] {
  const mm = (x: number) => (x * 1000).toFixed(1).replace('.', ',');
  const out: string[] = [];
  if (f.ativa > f.limites.ativa + 1e-12) out.push(`Flecha ativa ${mm(f.ativa)} mm > ${f.textos.ativa} = ${mm(f.limites.ativa)} mm (após as paredes${f.etapas ? `, αg = ${f.etapas.alfaG.toFixed(2).replace('.', ',')}, αq = ${f.etapas.alfaQ.toFixed(2).replace('.', ',')}` : ''}).`);
  if (f.instantanea > f.limites.instantanea + 1e-12) out.push(`Flecha instantânea ${mm(f.instantanea)} mm > ${f.textos.instantanea} = ${mm(f.limites.instantanea)} mm.`);
  return out;
}

/** Dados do memorial das flechas: etapas por tipo de elemento com ξ e αf calculados e os limites em uso. */
export function memorialFlechas(b: BuildingModel, op: OpcoesCalculo) {
  return TIPOS_ELEMENTO_FLECHA.map(({ v, rotulo }) => {
    const etapas = etapasDe(b, v);
    const unit = composicaoEtapas(etapas, { pp: 1, alvenaria: 1, revestimento: 1, q: 1, qqp: 1 }, { qInstantanea: op.flechaQInstantanea ? 'total' : 'qp' });
    return {
      tipo: v, rotulo, proprias: !!b.flechas?.etapas?.[v],
      etapas: etapas.map((e, i) => ({ ...e, xi: xiDias(e.dias), dXi: unit.porEtapa[i].dXi, dXiAtiva: unit.porEtapa[i].dXiAtiva })),
      tParedes: unit.tParedes,
      limites: Object.fromEntries(Object.entries(limitesEmUso(b, op, v)).map(([t, l]) => [t, textoLimite(l)])) as Record<TipoFlecha, string>,
    };
  });
}

/**
 * Etapas coladas de uma planilha (uma por linha: nome, dias, pp, alvenaria, revestimento, variável; separadas por
 * tabulação ou ponto e vírgula; vírgula decimal aceita; frações em 0–1 ou em % quando > 1). A primeira linha cujo 2º
 * campo não é número (cabeçalho) é ignorada. Devolve a lista validada ou o texto do erro.
 */
export function lerEtapasColadas(texto: string): EtapaCarga[] | string {
  const num = (s: string | undefined) => ((s ?? '').trim() === '' ? 0 : Number((s ?? '').trim().replace('%', '').replace(',', '.')));
  const out: EtapaCarga[] = [];
  for (const [i, linha] of texto.split(/\r?\n/).entries()) {
    if (!linha.trim()) continue;
    const c = linha.split(/\t|;/);
    const dias = num(c[1]);
    if (!Number.isFinite(dias) || (c[1] ?? '').trim() === '') { if (out.length || i > 0) return `Linha ${i + 1}: idade (dias) inválida.`; continue; }
    const fr = c.slice(2, 6).map(num).map((v) => (v > 1 ? v / 100 : v));
    if (fr.some((v) => !Number.isFinite(v))) return `Linha ${i + 1}: fração inválida.`;
    out.push({ nome: c[0].trim() || `Etapa ${out.length + 1}`, dias, pp: fr[0] ?? 0, alvenaria: fr[1] ?? 0, revestimento: fr[2] ?? 0, variavel: fr[3] ?? 0 });
  }
  return validarEtapas(out) ?? out;
}
