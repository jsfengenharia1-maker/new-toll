// Dimensionamento das lajes alveolares (frente E3e): envoltórias médias por metro de faixa (a partir das barras da grelha na
// direção das placas), paginação das placas do pano, escolha da placa (momento último, momento de serviço do ambiente, cortante
// nas flexões positiva e negativa), negativos na capa (linhas da ficha ou seção) com comprimentos pelo diagrama decalado,
// capa, apoios, quantitativos e relatório. A flecha vem da laje (`dimensionamento.ts`, Branson com a ficha); aqui só se
// copia. Mensagens "Alveolares: ..." vão para a laje. Núcleo puro; kN, m; momentos em kN·m por metro de largura.
import { barArea, beamFlexure, type BeamSection, type Concrete } from '../concrete';
import type { P } from '../geom/faces';
import { areaPoligono } from '../geom/faces';
import type { AnaliseEdificio } from './analitico';
import {
  apoioDaPonta, apoioLateralDaViga, bordaCompartilhada, cargasDoPano, comprimentoDaPeca, geometriaAlveolar, larguraDaViga, paginarPlacas, processoDoPano,
  vrdPositivo, type ApoioLateral, type ApoioPlaca, type GeometriaAlveolar, type NegativoPlaca, type PlacaAlveolar, type PlacaPaginada, type ProcessoAlveolar,
} from './alveolares';
import { lbBasico } from './detalhamento';
import { RHO_MIN_LAJE } from './detalhamentoLajes';
import type { ResultadoLaje } from './dimensionamento';
import { acoDe, cobrimentoLaje, concretoDe, gamas } from './materiais';
import type { OpcoesCalculo } from './opcoes';
import { errosTipoLaje, momentoResistenteT, type SerieFicha } from './tiposLaje';
import { alcance, arred, deltaMinVigotas, dot, faixasDaGrelha, fmt, fphi, r3, type Bruta, type EsforcosVigota } from './vigotas';
import { minimosDaFaixa, pontasContinuas, redistribuirNegativos } from './vigotasEsforcos';
import { combinacaoDoNivel, momentoDoNivel, nivelPorCAA, type NivelProtensao } from './vigotasFichas';
import { casosDaObra, pavimentosDoGrupo, type BuildingModel, type Laje, type NegativoAlveolarEd } from './types';
import type { DadosBranson } from './vigotasFlecha';

const ACO_KG_M3 = 7850;
const FI_NEG = [6.3, 8, 10, 12.5, 16];
const ESPACAMENTOS_NEG = [0.1, 0.125, 0.15, 0.175, 0.2];
/** Diferença mínima de momento (kN·m/m) para considerar que a ponta tem negativo de cálculo. */
const NEG_MIN = 0.01;

// ---------------------------------------------------------------- resultados

/** Esforços de cálculo por metro de largura: momento positivo, negativos nas pontas (≤ 0) e cortantes nas pontas. */
export interface EsforcosMetro { mPos: number; mNeg: [number, number]; v: [number, number]; mEnd?: [number, number] }

export interface NegativoAlveolar {
  /** Momento negativo de cálculo (kN·m/m, módulo) e armadura: φ (mm) a cada `s` (m), com o Mu da linha (ficha ou seção). */
  Md: number; phi: number; s: number; AsNec: number; AsAdotada: number; Mu: number;
  fonte: 'ficha' | 'secao' | 'editado';
  /** Linha da ficha usada (Mfis, rigidezes e cortante resistente) ou nada, se calculado pela seção. */
  linha?: NegativoPlaca;
  /** Comprimento do negativo no pano (m), distância ao zero do diagrama, decalagem e ancoragem (m), número de barras na largura do pano. */
  comprimento: number; x0: number; al: number; lb: number; barras: number;
  ok: boolean;
}
export interface CortanteAlveolar { Vd: number; VRd: number | null; regiao: 'positiva' | 'negativa'; ok: boolean }
export interface PlacaDim extends PlacaPaginada {
  numero: string;
  /** Comprimento da peça (m): vão livre entre as faces das vigas mais os dois apoios. */
  comprimento: number;
  apoios: [ApoioPlaca, ApoioPlaca];
  /** Envoltória média por metro de faixa (kN·m/m, kN/m) das barras da grelha que a placa cobre. */
  envoltoria: EsforcosMetro;
  status: 'ok' | 'insuficiente';
}
export interface CandidataAlveolar { placa: string; altura: number; Mu: number | null; adequada: boolean; motivos: string[]; adotada: boolean; escolhida: boolean }

export interface ResultadoAlveolar {
  laje: string; nome: string; pavimentos: string[]; repeticoes: number;
  ficha: string; fichaNome: string; fabricante: string; ficticio: boolean; marca: string;
  /** Placa do tipo da laje (adotada), a escolhida pelo processo de escolha e se a placa foi fixada pelo usuário. */
  placaAdotada: string; placaEscolhida: string | null; fixa: boolean; trocar: boolean;
  h: number; capa: number; pp: number; processo: ProcessoAlveolar; vao: number; larguraPano: number;
  /** Envoltória do pano (máximos entre as placas) por metro, ELU. */
  envoltoria: EsforcosMetro;
  positivo: { Md: number; Mu: number | null; aproveitamento: number | null; ok: boolean | null };
  servico: { nivel: NivelProtensao; caa: 'I' | 'II' | 'III' | 'IV'; combinacao: 'frequente' | 'rara'; Ms: number; Madm: number | null; aproveitamento: number | null; ok: boolean | null } | null;
  negativos: [NegativoAlveolar | null, NegativoAlveolar | null];
  cortante: [CortanteAlveolar, CortanteAlveolar];
  capaVerificacao: { espessura: number; minima: number; ok: boolean; AsMinTela: number };
  placas: PlacaDim[];
  /** Apoio lateral das placas de borda (K1.9.64): viga paralela às placas, por sobreposição (início e fim da numeração). */
  lateral: [ApoioLateral, ApoioLateral];
  /** Placas da ficha com a verificação (lista da série) na ordem de escolha. */
  candidatas: CandidataAlveolar[];
  /** Diagrama por metro da faixa que governa o positivo: abscissas (m), momentos máximo e mínimo e cortante. */
  diagrama: { x: number[]; Mmax: number[]; Mmin: number[]; V: number[] };
  quantitativo: QuantitativoAlveolar;
  /** Flecha do pano (copiada da laje): total, limite e da variável (m). */
  flecha?: { total: number; limite: number; variavel: number; limiteVariavel: number; ok: boolean };
  mensagens: string[]; status: 'ok' | 'fail';
}
export interface QuantitativoAlveolar {
  /** Placas por largura × comprimento (m) com a quantidade. */
  lista: { largura: number; comprimento: number; quantidade: number; cortada: boolean; obliqua: boolean }[];
  numeroPlacas: number; areaPlacas: number; pesoPlacas: number;
  /** Concreto moldado no local (capa e preenchimento, m³) e tela/armadura de distribuição da capa (m²). */
  concretoLocal: number; areaCapa: number;
  /** Aço dos negativos por bitola: φ, comprimento (m) e peso (kg) por pavimento, sem perdas. */
  negativos: { phi: number; comprimento: number; peso: number }[];
}

// ---------------------------------------------------------------- envoltórias

const merge = (map: Map<string, Bruta>, f: Bruta, u: P) => {
  const key = `${Math.round(f.t * 1000)}|${Math.round(dot(f.a, u) * 100)}`, e = map.get(key);
  if (!e) { map.set(key, { ...f, s: [...f.s], Mmax: [...f.Mmax], Mmin: [...f.Mmin], V: [...f.V] }); return; }
  if (e.s.length === f.s.length) for (let i = 0; i < f.s.length; i++) { e.Mmax[i] = Math.max(e.Mmax[i], f.Mmax[i]); e.Mmin[i] = Math.min(e.Mmin[i], f.Mmin[i]); e.V[i] = Math.max(e.V[i], f.V[i]); }
  else if (Math.max(...f.Mmax) > Math.max(...e.Mmax)) map.set(key, { ...f });
};

/** Alinhamentos do pano (envoltória dos pavimentos do grupo, casados pela posição) para os fatores `fat`, por metro de largura. */
function faixasDoPano(an: AnaliseEdificio, l: Laje, fat: number[], u: P, pavs: string[]): Bruta[] {
  const map = new Map<string, Bruta>();
  for (const g of an.grelhas) {
    if (!g.res || !pavs.includes(g.pavimento)) continue;
    for (const f of faixasDaGrelha(g, l, fat, u, 1)) merge(map, f, u);
  }
  return [...map.values()].sort((a, z) => a.t - z.t);
}

/** Fase 1 do processo 2: soma a placa isostática sob o peso próprio (momento p·x(ℓ−x)/2, cortante p·(ℓ/2 − x)), com o fator `fator` das permanentes. */
function comFase1(f: Bruta, pp: number, fator: number): Bruta {
  const p = fator * pp;
  return {
    ...f,
    Mmax: f.Mmax.map((m, i) => m + (p * f.s[i] * (f.L - f.s[i])) / 2),
    Mmin: f.Mmin.map((m, i) => m + (p * f.s[i] * (f.L - f.s[i])) / 2),
    V: f.V.map((v, i) => v + Math.abs(p * (f.L / 2 - f.s[i]))),
  };
}

/** Esforços da análise (antes dos mínimos): positivo máximo, negativos e cortantes nas pontas. */
const calcDe = (f: Bruta): EsforcosVigota => { const n = f.s.length - 1; return { mPos: Math.max(0, ...f.Mmax), mNeg: [Math.min(0, f.Mmin[0]), Math.min(0, f.Mmin[n])], v: [f.V[0], f.V[n]] }; };

/** Média ponderada pela sobreposição das faixas da grelha com a faixa [t0, t1] da placa. */
function mediaNaPlaca(faixas: { f: Bruta; v: number }[], t0: number, t1: number): number {
  let s = 0, w = 0;
  for (const { f, v } of faixas) {
    const ov = Math.max(0, Math.min(t1, f.t + f.largura / 2) - Math.max(t0, f.t - f.largura / 2));
    s += ov * v; w += ov;
  }
  if (w > 1e-9) return s / w;
  const mais = faixas.reduce((b, x) => (Math.abs(x.f.t - (t0 + t1) / 2) < Math.abs(b.f.t - (t0 + t1) / 2) ? x : b), faixas[0]);
  return mais.v;
}

// ---------------------------------------------------------------- verificação de uma placa

interface Demanda {
  /** ELU (kN·m/m, kN/m) e serviço positivo (kN·m/m) da placa adotada; `escala` ajusta ao peso de outra placa. */
  mPos: number; mNeg: [number, number]; v: [number, number]; ms: number;
  /** Momento positivo nas pontas (kN·m/m, ≥ 0): decide a coluna do cortante resistente (descomprimida × fissurada). */
  mEnd: [number, number];
}
interface ContextoVerificacao {
  c: Concrete; fyd: number; cobSup: number; capa: number;
  nivel: NivelProtensao; Ms: number; ratioELU: number; ratioServico: number;
  /** Demanda do pano na placa adotada. */
  d: Demanda;
  /** Negativo editado das pontas, se houver. */
  edicao: [NegativoAlveolarEd | null, NegativoAlveolarEd | null];
  /** Alturas úteis do negativo medidas da face inferior (m). */
  dNeg: number;
}

/** Mu do negativo (kN·m/m) pela seção com As (m²/m): banzo inferior comprimido (T invertido) ou retângulo, sem armadura de compressão. */
function muNegativoSecao(p: PlacaAlveolar, ctx: Pick<ContextoVerificacao, 'c' | 'fyd' | 'dNeg'>, As: number): number {
  const comAlma = p.hfInf && p.bwAlma;
  return momentoResistenteT(ctx.c, 1, comAlma ? p.hfInf! : p.altura, comAlma ? p.bwAlma! : 1, ctx.dNeg, As, ctx.fyd);
}
/** Armadura necessária (m²/m) do negativo `M` (kN·m/m) pela seção da placa; `null` se pede armadura dupla. */
function asNegativoSecao(p: PlacaAlveolar, ctx: Pick<ContextoVerificacao, 'c' | 'fyd' | 'dNeg'>, M: number): number | null {
  const sec: BeamSection = p.hfInf && p.bwAlma ? { kind: 'tee', bw: p.bwAlma, h: p.altura, bf: 1, hf: p.hfInf } : { kind: 'rect', bw: 1, h: p.altura };
  const r = beamFlexure(sec, true, M, ctx.dNeg, 0.03, ctx.c, ctx.fyd);
  return r.double ? null : r.As;
}

/** Menor combinação φ/s da lista que cobre `AsNec` (m²/m). */
function escolherBarrasNeg(AsNec: number, AsMin: number): { phi: number; s: number; As: number } | null {
  const lista = FI_NEG.flatMap((phi) => ESPACAMENTOS_NEG.map((s) => ({ phi, s, As: barArea(phi) / s }))).sort((a, z) => a.As - z.As || a.phi - z.phi);
  const alvo = Math.max(AsNec, AsMin);
  return lista.find((x) => x.As >= alvo - 1e-12) ?? null;
}

interface VerificacaoPlaca {
  adequada: boolean | null; motivos: string[];
  flexao: boolean | null; servico: boolean | null; Madm: number | null;
  negativos: [NegativoAlveolar | null, NegativoAlveolar | null];
  cortante: [CortanteAlveolar, CortanteAlveolar];
}

/**
 * Verifica a placa `p` contra a demanda do pano (escalada pelo peso próprio da placa): Mu > Md positivo; momento de serviço do
 * nível de protensão do ambiente; negativo na capa em cada ponta (linha da ficha de menor Mu que cobre e, nela, o cortante;
 * senão a seção); cortante nas flexões positiva e negativa. `adequada` é `null` se a placa não tem Mu (verificação não feita).
 */
function verificarPlaca(p: PlacaAlveolar, geo: GeometriaAlveolar, ctx: ContextoVerificacao): VerificacaoPlaca {
  const motivos: string[] = [], r = geo.resist;
  const dem = { mPos: ctx.d.mPos * ctx.ratioELU, mNeg: ctx.d.mNeg.map((m) => m * ctx.ratioELU) as [number, number], v: ctx.d.v.map((v) => v * ctx.ratioELU) as [number, number], ms: ctx.d.ms * ctx.ratioServico };
  const Mu = r.Mu ?? null;
  let flexao: boolean | null = null;
  if (Mu !== null) { flexao = dem.mPos <= Mu + 1e-9; if (!flexao) motivos.push(`momento positivo ${fmt(dem.mPos)} > Mu ${fmt(Mu)} kN·m/m`); }
  // serviço
  let servico: boolean | null = null, Madm: number | null = null;
  if (r.servico) {
    Madm = momentoDoNivel({ protensao: { Mdesc: r.servico.Mdesc ?? 0, ...(r.servico.Mparcial !== undefined ? { Mparcial: r.servico.Mparcial } : {}), ...(r.servico.Mlimitada !== undefined ? { Mlimitada: r.servico.Mlimitada } : {}), ...(r.servico.Mcompleta !== undefined ? { Mcompleta: r.servico.Mcompleta } : {}) } } as SerieFicha, ctx.nivel);
    if (Madm !== null) { servico = dem.ms <= Madm + 1e-9; if (!servico) motivos.push(`momento de serviço ${fmt(dem.ms)} > ${fmt(Madm)} kN·m/m (protensão ${ctx.nivel})`); }
  }
  // negativos e cortante
  const negativos: [NegativoAlveolar | null, NegativoAlveolar | null] = [null, null];
  const VRdPos = [0, 1].map((k) => vrdPositivo(r, ctx.d.mEnd[k] * ctx.ratioELU));
  const cortante = [0, 1].map((k): CortanteAlveolar => ({ Vd: dem.v[k], VRd: VRdPos[k] ?? null, regiao: 'positiva', ok: true })) as [CortanteAlveolar, CortanteAlveolar];
  const linhas = [...r.negativos].sort((a, z) => a.Mu - z.Mu || a.phi - z.phi);
  for (const k of [0, 1] as const) {
    const M = -dem.mNeg[k], ed = ctx.edicao[k], Vd = dem.v[k];
    if (M < NEG_MIN && !ed) { cortante[k].ok = VRdPos[k] === undefined || Vd <= VRdPos[k]! + 1e-9; if (!cortante[k].ok) motivos.push(`cortante ${fmt(Vd)} > VRd ${fmt(VRdPos[k]!)} kN/m na ponta ${k ? 'final' : 'inicial'}`); continue; }
    const ponta = k ? 'final' : 'inicial';
    let escolha: NegativoAlveolar | null = null;
    const base = { Md: Math.max(M, 0), x0: 0, al: 0, lb: 0, comprimento: 0, barras: 0 };
    if (ed) {
      const linha = linhas.find((x) => Math.abs(x.phi - ed.phi) < 1e-9 && Math.abs(x.s - ed.s) < 1e-9), As = barArea(ed.phi) / ed.s;
      const Mued = linha?.Mu ?? muNegativoSecao(p, ctx, As);
      escolha = { ...base, phi: ed.phi, s: ed.s, AsNec: 0, AsAdotada: As, Mu: Mued, fonte: 'editado', ...(linha ? { linha } : {}), ok: Mued >= M - 1e-9 };
      if (!escolha.ok) motivos.push(`negativo editado φ${fphi(ed.phi)} c/${fmt(ed.s * 100, 1)} (Mu ${fmt(Mued)}) < ${fmt(M)} kN·m/m na ponta ${ponta}`);
    } else {
      const linha = linhas.find((x) => x.Mu >= M - 1e-9 && (x.VRd === undefined || x.VRd >= Vd - 1e-9));
      if (linha) escolha = { ...base, phi: linha.phi, s: linha.s, AsNec: 0, AsAdotada: barArea(linha.phi) / linha.s, Mu: linha.Mu, fonte: 'ficha', linha, ok: true };
      else if (linhas.length && linhas.some((x) => x.Mu >= M - 1e-9)) {
        // há linha que resiste ao momento mas nenhuma ao cortante
        const x = linhas.find((y) => y.Mu >= M - 1e-9)!;
        escolha = { ...base, phi: x.phi, s: x.s, AsNec: 0, AsAdotada: barArea(x.phi) / x.s, Mu: x.Mu, fonte: 'ficha', linha: x, ok: true };
      } else {
        const AsNec = asNegativoSecao(p, ctx, M);
        if (AsNec === null) { motivos.push(`negativo ${fmt(M)} kN·m/m pede armadura de compressão na ponta ${ponta}`); escolha = { ...base, phi: 0, s: 0, AsNec: 0, AsAdotada: 0, Mu: 0, fonte: 'secao', ok: false }; }
        else {
          const AsMin = RHO_MIN_LAJE * ctx.capa, b = escolherBarrasNeg(AsNec, AsMin);
          if (!b) { motivos.push(`negativo ${fmt(M)} kN·m/m: nenhuma bitola até φ16 c/10 cobre ${fmt(AsNec * 1e4)} cm²/m na ponta ${ponta}`); escolha = { ...base, phi: 16, s: 0.1, AsNec: AsNec * 1e4, AsAdotada: barArea(16) / 0.1, Mu: 0, fonte: 'secao', ok: false }; }
          else escolha = { ...base, phi: b.phi, s: b.s, AsNec: AsNec * 1e4, AsAdotada: b.As, Mu: muNegativoSecao(p, ctx, b.As), fonte: 'secao', ok: true };
        }
      }
      if (linhas.length && !linhas.some((x) => x.Mu >= M - 1e-9)) motivos.push(`negativo ${fmt(M)} kN·m/m > maior linha da ficha (${fmt(linhas.at(-1)!.Mu)} kN·m/m) na ponta ${ponta}`);
    }
    negativos[k] = escolha;
    const VRdNeg = escolha?.linha?.VRd ?? null;
    cortante[k] = { Vd, VRd: VRdNeg ?? VRdPos[k] ?? null, regiao: 'negativa', ok: (VRdNeg ?? VRdPos[k]) === undefined || (VRdNeg ?? VRdPos[k] ?? Infinity) >= Vd - 1e-9 };
    if (!cortante[k].ok) motivos.push(`cortante ${fmt(Vd)} > VRd ${fmt(cortante[k].VRd!)} kN/m (flexão negativa) na ponta ${ponta}`);
  }
  const adequada = Mu === null ? null : motivos.length === 0;
  return { adequada, motivos, flexao, servico, Madm, negativos, cortante };
}

// ---------------------------------------------------------------- Branson (flecha)

/**
 * Dados de Branson da placa por metro (ficha: EI, EI fissurado e Mfis do positivo; o negativo usa os mesmos, ou os da linha de
 * negativo da ficha, se houver) [a confirmar com o fabricante]. `null` sem EI fissurado ou sem Mfis: rigidez total.
 */
export function dadosBransonAlveolar(geo: GeometriaAlveolar): DadosBranson | null {
  const r = geo.resist;
  if (r.EI === undefined || r.EIfis === undefined || r.Mfis === undefined) return null;
  const ng = r.negativos.find((n) => n.EI !== undefined && n.EIfis !== undefined && n.Mfis !== undefined);
  return { EI: r.EI, EIfis: r.EIfis, Mfis: r.Mfis, negEI: ng?.EI ?? r.EI, negEIfis: ng?.EIfis ?? r.EIfis, negMfis: ng?.Mfis ?? r.Mfis, fonte: 'ficha' };
}
/** Flecha da fase 1 do processo 2 (placa isostática sob o peso próprio): 5·p·ℓ⁴ / (384·EI) por metro (m). */
export const flechaFase1Alveolar = (pp: number, vao: number, EI: number): number => (EI > 0 ? (5 * pp * vao ** 4) / (384 * EI) : 0);

// ---------------------------------------------------------------- dimensionamento

/**
 * Dimensiona as lajes alveolares da obra: um resultado por laje (envoltória dos pavimentos do grupo). Acrescenta as mensagens
 * "Alveolares: ..." à laje em `lajes` e marca 'fail' nos erros.
 */
export function dimensionarAlveolares(b: BuildingModel, an: AnaliseEdificio, lajes: ResultadoLaje[], op: OpcoesCalculo): ResultadoAlveolar[] {
  const out: ResultadoAlveolar[] = [];
  const alvos = b.lajes.filter((l) => l.tipo.tipo === 'alveolar' && !l.definir);
  if (!alvos.length) return out;
  const c = concretoDe(b, 'laje'), gm = gamas(b), aS = acoDe(b, 'lajeSup');
  const obra = casosDaObra(b), nat = an.casos.map((id) => obra.find((x) => x.id === id)?.natureza ?? 'G');
  const psi1 = an.casos.map((id) => { const x = obra.find((y) => y.id === id); return x?.psi?.[1] ?? b.norma.psiQ?.[1] ?? 0.4; });
  const fELU = nat.map((n) => (n === 'G' ? gm.g : n === 'H' ? gm.h : n === 'Q' ? gm.q : 0));
  const fFreq = nat.map((n, i) => (n === 'G' || n === 'H' ? 1 : n === 'Q' ? psi1[i] : 0)), fRara = nat.map((n) => (n === 'G' || n === 'H' || n === 'Q' ? 1 : 0));
  const psiQ1 = b.norma.psiQ?.[1] ?? 0.4;
  for (const l of alvos) {
    if (l.tipo.tipo !== 'alveolar' || errosTipoLaje(b, l.tipo).length) continue;
    const geo = geometriaAlveolar(b, l.tipo), tag = l.nome;
    if (geo.ausente) continue;
    const msgs: { texto: string; erro: boolean }[] = [];
    const erro = (t: string) => msgs.push({ texto: t, erro: true }), aviso = (t: string) => msgs.push({ texto: t, erro: false });
    const pavs = pavimentosDoGrupo(b, l.grupo), pavIds = pavs.map((p) => p.id), nomesPav = pavs.map((p) => p.nome);
    const grelhas = an.grelhas.filter((g) => g.res && pavIds.includes(g.pavimento));
    if (!grelhas.length) continue;
    const ang = (((l.direcao ?? 0) % 180) * Math.PI) / 180, u: P = [Math.cos(ang), Math.sin(ang)];
    const processo = processoDoPano(l, op), carg = cargasDoPano(b, l, geo);
    const ficha = geo.ficha, adotada = geo.placa, fixa = !!l.alveolar?.fixa;
    const caa = l.exposicao ?? b.norma.caa, nivel = nivelPorCAA(caa), comb = combinacaoDoNivel(nivel);
    // ---- envoltórias por metro (ELU e serviço), com a fase 1 do processo 2
    const fase1 = (f: Bruta, fator: number) => (processo === 2 ? comFase1(f, geo.pp, fator) : f);
    const faixasELU = faixasDoPano(an, l, fELU, u, pavIds).map((f) => fase1(f, gm.g));
    const faixasServ = faixasDoPano(an, l, comb === 'rara' ? fRara : fFreq, u, pavIds).map((f) => fase1(f, 1));
    if (!faixasELU.length) continue;
    const opMin = { vigotaMomentoMinPositivo: op.alveolarMomentoMinPositivo, vigotaMomentoMinNegativo: op.alveolarMomentoMinNegativo };
    const dMin = deltaMinVigotas(an);
    const lin = faixasELU.map((f) => {
      const calc = calcDe(f), m = minimosDaFaixa({ L: f.L, calc }, opMin, l);
      // K1.9.74: redistribuição dos negativos das pontas contínuas depois dos mínimos (limitada pela NBR 6118, 14.6.4.3)
      const rd = op.alveolarRedistribuir ? redistribuirNegativos(m.esforcos, pontasContinuas({ L: f.L, calc }), op.redistribuicao, dMin) : null;
      if (rd?.aplicada) aviso(`Alveolares: redistribuição dos negativos em ${tag}: δ = ${fmt(rd.delta)} (NBR 6118, 14.6.4.3).`);
      return { f, esf: rd?.aplicada ? rd.esforcos : m.esforcos, tipoVao: m.tipo };
    });
    // ---- paginação
    const pag = paginarPlacas(l, adotada.largura, adotada.larguraMin);
    for (const a of pag.avisos) aviso(`Alveolares: ${a} (${tag}).`);
    const porPlaca = pag.placas.map((pl) => {
      const med = (sel: (x: (typeof lin)[number]) => number) => mediaNaPlaca(lin.map((x) => ({ f: x.f, v: sel(x) })), pl.t0, pl.t1);
      const env: EsforcosMetro = { mPos: med((x) => x.esf.mPos), mNeg: [med((x) => x.esf.mNeg[0]), med((x) => x.esf.mNeg[1])], v: [med((x) => x.esf.v[0]), med((x) => x.esf.v[1])], mEnd: [med((x) => Math.max(0, x.f.Mmax[0])), med((x) => Math.max(0, x.f.Mmax.at(-1)!))] };
      const ms = mediaNaPlaca(faixasServ.map((f) => ({ f, v: Math.max(0, ...f.Mmax) })), pl.t0, pl.t1);
      return { pl, env, ms };
    });
    if (!porPlaca.length) continue;
    const envPano: EsforcosMetro = {
      mPos: Math.max(...porPlaca.map((x) => x.env.mPos)),
      mNeg: [Math.min(...porPlaca.map((x) => x.env.mNeg[0])), Math.min(...porPlaca.map((x) => x.env.mNeg[1]))],
      v: [Math.max(...porPlaca.map((x) => x.env.v[0])), Math.max(...porPlaca.map((x) => x.env.v[1]))],
      mEnd: [Math.max(...porPlaca.map((x) => x.env.mEnd![0])), Math.max(...porPlaca.map((x) => x.env.mEnd![1]))],
    };
    const MsPano = Math.max(...porPlaca.map((x) => x.ms));
    // ---- contexto de verificação
    const cob = cobrimentoLaje(b, l.cobrimento), ctxBase = { c, fyd: aS.fyd, cobSup: cob.sup, capa: adotada.capa, nivel, edicao: (l.alveolar?.negativos ?? [null, null]) as [NegativoAlveolarEd | null, NegativoAlveolarEd | null], dNeg: adotada.altura - cob.sup - 0.005 };
    const demanda: Demanda = { mPos: envPano.mPos, mNeg: envPano.mNeg, v: envPano.v, ms: MsPano, mEnd: envPano.mEnd! };
    // peso de outra placa muda a carga: ELU = γg(pp + perm) + γq q; serviço = pp + perm + ψ·q
    const qELU = (pp: number) => gm.g * (pp + carg.permanentes) + gm.q * carg.variaveis;
    const psiS = comb === 'rara' ? 1 : psiQ1, qSrv = (pp: number) => pp + carg.permanentes + psiS * carg.variaveis;
    const ratio = (g2: GeometriaAlveolar) => ({ ratioELU: qELU(geo.pp) > 1e-9 ? qELU(g2.pp) / qELU(geo.pp) : 1, ratioServico: qSrv(geo.pp) > 1e-9 ? qSrv(g2.pp) / qSrv(geo.pp) : 1 });
    const ctxDe = (g2: GeometriaAlveolar, comEd: boolean): ContextoVerificacao => ({ ...ctxBase, capa: g2.placa.capa, dNeg: g2.placa.altura - cob.sup - 0.005, edicao: comEd ? ctxBase.edicao : [null, null], Ms: MsPano, ...ratio(g2), d: demanda });
    const ver = verificarPlaca(adotada, geo, ctxDe(geo, true));
    // ---- escolha da placa (lista da série): mesma altura primeiro, por Mu crescente; depois as outras alturas
    const geoDe = (p: PlacaAlveolar): GeometriaAlveolar => geometriaAlveolar(b, { tipo: 'alveolar', ficha: ficha.id, placa: p.id });
    const ordem = [...ficha.placas].sort((a, z) => {
      const ia = Math.abs(a.altura - adotada.altura) < 1e-6 ? 0 : 1, iz = Math.abs(z.altura - adotada.altura) < 1e-6 ? 0 : 1;
      return ia - iz || (ia ? a.altura - z.altura : 0) || (a.positivo?.Mu ?? Infinity) - (z.positivo?.Mu ?? Infinity);
    });
    const candidatas: CandidataAlveolar[] = ordem.map((p) => {
      const g2 = p.id === adotada.id ? geo : geoDe(p), v = p.id === adotada.id ? ver : verificarPlaca(p, g2, ctxDe(g2, false));
      return { placa: p.id, altura: p.altura, Mu: g2.resist.Mu ?? null, adequada: v.adequada === true, motivos: v.motivos, adotada: p.id === adotada.id, escolhida: false };
    });
    const primeira = candidatas.find((x) => x.adequada);
    let escolhida: string | null = null;
    if (ver.adequada === null) escolhida = null;
    else if (fixa) escolhida = ver.adequada ? adotada.id : (primeira?.placa ?? null);
    else escolhida = primeira?.placa ?? null;
    if (escolhida) { const e = candidatas.find((x) => x.placa === escolhida); if (e) e.escolhida = true; }
    const trocar = !!escolhida && escolhida !== adotada.id && !fixa;
    // ---- mensagens da escolha
    const semDados = ver.adequada === null;
    // K1.9.75: sem dado na ficha, a verificação correspondente não é feita
    const faltam = [semDados && 'momento último (flexão positiva)', !geo.resist.servico && 'momentos de serviço (ambiente)', geo.resist.VRd === undefined && 'cortante resistente', !geo.EIdaFicha && 'EI (flecha)'].filter((x): x is string => !!x);
    if (faltam.length) aviso(`Alveolares: a ficha da placa ${adotada.id} ("${ficha.nome}") não informa ${faltam.join(', ')}: a verificação correspondente não foi feita (${tag}). Cadastre os dados do fabricante.`);
    if (semDados) {
      if (ver.motivos.length) erro(`Alveolares: a placa ${adotada.id} não atende — ${ver.motivos.join('; ')} (${tag}).`);
    }
    else {
      const g2 = escolhida ? geoDe(ficha.placas.find((p) => p.id === escolhida)!) : null;
      if (ver.adequada === false) {
        if (escolhida && escolhida !== adotada.id) erro(`Alveolares: a placa ${adotada.id} não atende — ${ver.motivos.join('; ')} (${tag}); adote a placa ${escolhida} (laje.alveolar { placa: "${escolhida}" })${g2 && Math.abs(g2.h - geo.h) > 1e-6 ? `, que muda a altura da laje de ${fmt(geo.h * 100, 0)} para ${fmt(g2.h * 100, 0)} cm` : ''}.`);
        else if (!escolhida) erro(`Alveolares: nenhuma placa da ficha "${ficha.nome}" atende — ${ver.motivos.join('; ')} (${tag}); fora da tabela da ficha: use outra ficha ou reveja o vão e a carga.`);
        else erro(`Alveolares: a placa ${adotada.id} fixada não atende — ${ver.motivos.join('; ')} (${tag}).`);
      } else if (trocar) aviso(`Alveolares: a placa ${escolhida} também atende e tem menor momento último que a ${adotada.id} (${tag}); troque com laje.alveolar { placa: "${escolhida}" } para menos material (a análise é refeita com o peso da nova placa).`);
    }
    // ---- negativos: comprimentos pelo diagrama da faixa que governa cada ponta
    const governa = lin.reduce((best, x) => (Math.max(...x.f.Mmax) > Math.max(...best.f.Mmax) ? x : best), lin[0]);
    const dS = adotada.altura - cob.sup - 0.005, vaoPano = Math.max(...lin.map((x) => x.f.L));
    const negativos = ver.negativos.map((n, k) => {
      if (!n) return null;
      const linhaNeg = lin.reduce((best, x) => (x.esf.mNeg[k] < best.esf.mNeg[k] ? x : best), lin[0]);
      const diag = linhaNeg.f.Mmin.map((m) => -m), xs = linhaNeg.f.s, Lk = linhaNeg.f.L;
      const x0 = alcance(xs, diag, 0, k as 0 | 1), al = op.lajeDecalagem * dS, lb = n.phi ? lbBasico(n.phi, c, aS.fyd, adotada.altura - cob.sup <= 0.3 + 1e-9, aS.aco === 'CA-60') : 0;
      const ed = ctxBase.edicao[k];
      const auto = Math.min(Lk, arred(Math.max((op.vigotaNegativoVao / 100) * Lk, x0 + al + lb), op.arredondamento));
      const comprimento = ed ? (ed.comprimento !== undefined ? Math.min(Lk, ed.comprimento) : ed.percentual !== undefined ? (ed.percentual / 100) * Lk : auto) : auto;
      return { ...n, comprimento: r3(comprimento), x0: r3(x0), al: r3(al), lb: r3(lb), barras: n.s ? Math.ceil(pag.B / n.s - 1e-6) : 0 };
    }) as [NegativoAlveolar | null, NegativoAlveolar | null];
    // ---- placas: peças, apoios e situação
    const larg = (pt: P) => larguraDaViga(b, l.grupo, pt);
    const placas: PlacaDim[] = porPlaca.map(({ pl, env }) => {
      const bI = larg(pl.a), bF = larg(pl.z), extra = pl.obliqua ? pl.largura * Math.abs(Math.tan((pl.angulo * Math.PI) / 180)) : 0, ap = [apoioDaPonta(adotada, bI, bordaCompartilhada(l, pl.a, b.lajes), extra), apoioDaPonta(adotada, bF, bordaCompartilhada(l, pl.z, b.lajes), extra)] as [ApoioPlaca, ApoioPlaca];
      const comprimento = comprimentoDaPeca(pl.Lmax, bI, bF, ap[0].adotado, ap[1].adotado);
      const insuf = ver.adequada === false && !!env;
      return { ...pl, numero: `${tag}-P${pl.indice + 1}`, comprimento, apoios: ap, envoltoria: env, status: insuf || ap.some((a) => a.situacao === 'insuficiente') ? 'insuficiente' : 'ok' };
    });
    for (const p of placas) {
      if (p.apoios.some((a) => a.situacao === 'insuficiente')) erro(`Alveolares: apoio insuficiente da placa ${p.numero}: viga disponibiliza ${p.apoios.map((a) => (a.disponivel === null ? '—' : `${fmt(a.disponivel * 100, 1)} cm`)).join(' e ')} e a placa ${adotada.id} pede no mínimo ${fmt(adotada.apoioMin * 100, 1)} cm (${tag}); alargue a viga.`);
    }
    const nObl = placas.filter((p) => p.obliqua).length, nCort = placas.filter((p) => p.cortada).length, nCham = placas.filter((p) => p.apoios.some((a) => a.situacao === 'chanfrada')).length;
    if (nCort) aviso(`Alveolares: ${nCort} placa(s) de borda cortada longitudinalmente (${placas.filter((p) => p.cortada).map((p) => `${fmt(p.largura * 100, 0)} cm`).join(', ')}) em ${tag}; a resistência por metro é a da placa inteira [a confirmar com o fabricante].`);
    if (nObl) aviso(`Alveolares: ${nObl} placa(s) com apoio oblíquo em ${tag}: comprimento pela maior corda; confira o corte dos extremos com o fabricante.`);
    if (nCham) aviso(`Alveolares: ${nCham} placa(s) oblíqua(s) em ${tag} com apoio no canto acima do máximo da ficha (${fmt(adotada.apoioMax * 100, 1)} cm): chanfrar o canto.`);
    // ---- apoio lateral das placas de borda (sobreposição sobre a viga paralela às placas)
    const vv: P = [-u[1], u[0]], lat = (pl: PlacaPaginada, t: number): ApoioLateral => {
      const m: P = [(pl.a[0] + pl.z[0]) / 2, (pl.a[1] + pl.z[1]) / 2], tc = (pl.t0 + pl.t1) / 2;
      return apoioLateralDaViga(adotada, larguraDaViga(b, l.grupo, [m[0] + (t - tc) * vv[0], m[1] + (t - tc) * vv[1]]));
    };
    const pI = pag.placas[0], pF = pag.placas.at(-1)!, lateral: [ApoioLateral, ApoioLateral] = [lat(pI, Math.min(pI.t0, pI.t1)), lat(pF, Math.max(pF.t0, pF.t1))];
    if (lateral.some((x) => !x.ok)) aviso(`Alveolares: apoio lateral insuficiente da placa de borda em ${tag}: a viga paralela às placas oferece menos que o apoio mínimo (${fmt(adotada.apoioMin * 100, 1)} cm) por sobreposição.`);
    // ---- capa
    const capaMin = op.alveolarCapaMin / 100, capaOk = capaMin <= 0 || adotada.capa >= capaMin - 1e-9;
    if (!capaOk) erro(`Alveolares: capa de ${fmt(adotada.capa * 100, 1)} cm abaixo do mínimo de ${fmt(capaMin * 100, 1)} cm (${tag}).`);
    // ---- cortante e quantitativos
    const areaPano = Math.abs(areaPoligono(l.contorno)) - (l.furos ?? []).reduce((s, f) => s + Math.abs(areaPoligono(f)), 0);
    const lista = new Map<string, { largura: number; comprimento: number; quantidade: number; cortada: boolean; obliqua: boolean }>();
    for (const p of placas) { const k = `${r3(p.largura)}|${p.comprimento}|${p.obliqua}`, e = lista.get(k); if (e) e.quantidade++; else lista.set(k, { largura: r3(p.largura), comprimento: p.comprimento, quantidade: 1, cortada: p.cortada, obliqua: p.obliqua }); }
    const areaPlacas = placas.reduce((s, p) => s + p.largura * p.comprimento, 0);
    const neg = new Map<number, number>();
    for (const n of negativos) if (n && n.phi) neg.set(n.phi, (neg.get(n.phi) ?? 0) + n.barras * n.comprimento);
    const quant: QuantitativoAlveolar = {
      lista: [...lista.values()].sort((a, z) => z.largura - a.largura || z.comprimento - a.comprimento), numeroPlacas: placas.length, areaPlacas, pesoPlacas: areaPlacas * adotada.pesoM2,
      concretoLocal: areaPano * geo.volume, areaCapa: areaPano, negativos: [...neg.entries()].sort((a, z) => a[0] - z[0]).map(([phi, comprimento]) => ({ phi, comprimento, peso: comprimento * barArea(phi) * ACO_KG_M3 })),
    };
    // ---- resumo
    const aprovPos = geo.resist.Mu ? envPano.mPos / geo.resist.Mu : null;
    const rS = ver.Madm;
    msgs.push({ texto: `Alveolares: ${geo.descricao}, ${placas.length} placa(s) de ${fmt(adotada.largura * 100, 0)} cm, vão ${fmt(vaoPano)} m, Md+ ${fmt(envPano.mPos)} kN·m/m${geo.resist.Mu ? ` (Mu ${fmt(geo.resist.Mu)})` : ''}, processo ${processo === 0 ? 'escorado' : processo === 1 ? `engaste aproximado (${fmt(1 - geo.pp / Math.max(carg.total, 1e-9))})` : 'duas fases'} (${tag}).`, erro: false });
    const fl = lajes.find((x) => x.laje === l.id);
    // ---- resultado
    const fichaMarca = ficha.ficticio ? 'ficha fictícia (demonstração)' : ficha.origem === 'fabricante' ? 'dado do fabricante, não verificado pelo programa' : 'ficha do usuário, não verificada pelo programa';
    const resultado: ResultadoAlveolar = {
      laje: l.id, nome: l.nome, pavimentos: nomesPav, repeticoes: pavs.length || 1,
      ficha: ficha.id, fichaNome: ficha.nome, fabricante: ficha.fabricante ?? '—', ficticio: !!ficha.ficticio, marca: fichaMarca,
      placaAdotada: adotada.id, placaEscolhida: escolhida, fixa, trocar,
      h: geo.h, capa: geo.capa, pp: geo.pp, processo, vao: vaoPano, larguraPano: pag.B,
      envoltoria: envPano,
      positivo: { Md: envPano.mPos, Mu: geo.resist.Mu ?? null, aproveitamento: aprovPos, ok: ver.flexao },
      servico: geo.resist.servico ? { nivel, caa, combinacao: comb, Ms: MsPano, Madm: rS, aproveitamento: rS ? MsPano / rS : null, ok: ver.servico } : null,
      negativos, cortante: ver.cortante,
      capaVerificacao: { espessura: adotada.capa, minima: capaMin, ok: capaOk, AsMinTela: RHO_MIN_LAJE * adotada.capa * 1e4 },
      placas, lateral, candidatas,
      diagrama: { x: governa.f.s, Mmax: governa.f.Mmax, Mmin: governa.f.Mmin, V: governa.f.V },
      quantitativo: quant,
      ...(fl ? { flecha: { total: fl.flecha, limite: fl.limite, variavel: fl.flechaQ, limiteVariavel: fl.limiteQ, ok: fl.flecha <= fl.limite + 1e-12 && fl.flechaQ <= fl.limiteQ + 1e-12 } } : {}),
      mensagens: msgs.map((m) => m.texto), status: msgs.some((m) => m.erro) ? 'fail' : 'ok',
    };
    out.push(resultado);
    for (const r of lajes.filter((x) => x.laje === l.id)) { r.mensagens.push(...resultado.mensagens); if (resultado.status === 'fail') r.status = 'fail'; }
  }
  return out;
}

// ---------------------------------------------------------------- resumos

/** Aço dos negativos por bitola: comprimento (m) e peso (kg) com as repetições dos pavimentos e as perdas (%). */
export function resumoAcoAlveolares(rs: ResultadoAlveolar[], perdas: number): { aco: string; phi: number; comprimento: number; peso: number; pesoComPerdas: number }[] {
  const m = new Map<number, number>();
  for (const r of rs) for (const n of r.quantitativo.negativos) m.set(n.phi, (m.get(n.phi) ?? 0) + n.comprimento * r.repeticoes);
  return [...m.entries()].sort((a, z) => a[0] - z[0]).map(([phi, comprimento]) => { const peso = comprimento * barArea(phi) * ACO_KG_M3; return { aco: 'CA-50', phi, comprimento, peso, pesoComPerdas: peso * (1 + perdas / 100) }; });
}

/** Lista de placas da obra (K1.9.62, K1.11.15): quantidade por largura e comprimento, com a área e o peso total, repetições incluídas. */
export function listaDePlacas(rs: ResultadoAlveolar[]): { placa: string; ficha: string; largura: number; comprimento: number; quantidade: number; cortada: boolean; obliqua: boolean }[] {
  const m = new Map<string, { placa: string; ficha: string; largura: number; comprimento: number; quantidade: number; cortada: boolean; obliqua: boolean }>();
  for (const r of rs) for (const x of r.quantitativo.lista) {
    const k = `${r.ficha}|${r.placaAdotada}|${x.largura}|${x.comprimento}|${x.obliqua}`, e = m.get(k);
    if (e) e.quantidade += x.quantidade * r.repeticoes; else m.set(k, { placa: r.placaAdotada, ficha: r.fichaNome, ...x, quantidade: x.quantidade * r.repeticoes });
  }
  return [...m.values()].sort((a, z) => a.placa.localeCompare(z.placa) || z.largura - a.largura || z.comprimento - a.comprimento);
}

/** Resumo por laje para o MCP/CLI (sem os diagramas). */
export function resumoAlveolar(r: ResultadoAlveolar) {
  return {
    laje: r.laje, nome: r.nome, ficha: r.fichaNome, placa: r.placaAdotada, placaEscolhida: r.placaEscolhida, trocar: r.trocar, status: r.status, processo: r.processo,
    mPos: +r.envoltoria.mPos.toFixed(2), mNeg: r.envoltoria.mNeg.map((x) => +x.toFixed(2)), v: r.envoltoria.v.map((x) => +x.toFixed(2)), Mu: r.positivo.Mu === null ? null : +r.positivo.Mu.toFixed(2),
    negativos: r.negativos.map((n) => (n ? { phi: n.phi, s: n.s, comprimento: n.comprimento, barras: n.barras } : null)), placas: r.placas.length, area: +r.quantitativo.areaPlacas.toFixed(2), peso: +r.quantitativo.pesoPlacas.toFixed(1),
    ...(r.flecha ? { flecha: +(r.flecha.total * 1000).toFixed(1), limite: +(r.flecha.limite * 1000).toFixed(1) } : {}),
  };
}

/** Linhas do memorial: ficha, escolha da placa, comparação de serviço, cortante, processo construtivo e flecha por laje. */
export interface LinhaMemorialAlveolar {
  laje: string; ficha: string; marca: string; placa: string; escolhida: string | null; processo: string; pavimentos: string[];
  flexao: { Md: number; Mu: number | null; aproveitamento: number | null; ok: boolean | null };
  servico: ResultadoAlveolar['servico'];
  cortante: ResultadoAlveolar['cortante'];
  negativos: (string | null)[];
  flecha: string | null; status: 'ok' | 'fail'; mensagens: string[];
}
export function alveolaresNoMemorial(rs: ResultadoAlveolar[]): LinhaMemorialAlveolar[] {
  return rs.map((r) => ({
    laje: r.nome, ficha: r.fichaNome, marca: r.marca, placa: r.placaAdotada, escolhida: r.placaEscolhida, pavimentos: r.pavimentos,
    processo: r.processo === 0 ? 'com escoramento' : r.processo === 1 ? 'sem escoramento, engaste aproximado' : 'sem escoramento, em duas fases',
    flexao: r.positivo, servico: r.servico, cortante: r.cortante,
    negativos: r.negativos.map((n) => (n ? `φ${fphi(n.phi)} c/${fmt(n.s * 100, 1)} (${n.barras} barras), ${fmt(n.comprimento)} m, Mu ${fmt(n.Mu)} kN·m/m` : null)),
    flecha: r.flecha ? `${fmt(r.flecha.total * 1000, 1)} mm (limite ${fmt(r.flecha.limite * 1000, 1)} mm)` : null, status: r.status, mensagens: r.mensagens,
  }));
}
