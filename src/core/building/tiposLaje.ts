// Tipos de laje nervurada unidirecional (frente E3a): fichas de vigotas (armada, protendida, moldada e treliçada),
// séries de lajes, enchimentos, tipos genéricos por geometria, propriedades de seção (peso, inércia, fissuração),
// validação lógica, escolha por momento, vigotas duplas e triplas e exportação/importação em JSON.
// O catálogo das treliçadas (modelos, treliças e enchimentos) vem da biblioteca de normas (N3). Fichas de fabricante
// NÃO vêm no programa: o dado é do fabricante e o programa só confere a coerência lógica (`validarFicha`); os exemplos
// de `FICHAS_EXEMPLO` são fictícios (testes e demonstração). Núcleo puro. Unidades: m, kN, kN·m, MPa nas saídas de
// seção (Concrete); rigidezes em kN·m².
import { tabelaNorma, type FonteNormas } from '../normas';
import type { Concrete } from '../concrete';
import type { TipoLaje } from './types';

export const GAMA_CONCRETO = 25; // kN/m³ (NBR 6120)

export type FamiliaVigota = 'trelicada' | 'armada' | 'protendida' | 'moldada';
export const FAMILIAS_VIGOTA: { v: FamiliaVigota; rotulo: string }[] = [
  { v: 'trelicada', rotulo: 'Treliçada' }, { v: 'armada', rotulo: 'Armada' }, { v: 'protendida', rotulo: 'Protendida' }, { v: 'moldada', rotulo: 'Moldada no local' },
];
/** `fabricante` = dado de catálogo ou fábrica (somente leitura); `usuario` = ficha do usuário (editável); `geometria` = tipo genérico por geometria. */
export type OrigemFicha = 'fabricante' | 'usuario' | 'geometria';
export type MaterialEnchimento = 'concreto' | 'ceramica' | 'eps' | 'generico';
export const MATERIAIS_ENCHIMENTO: { v: MaterialEnchimento; rotulo: string }[] = [
  { v: 'concreto', rotulo: 'Concreto' }, { v: 'ceramica', rotulo: 'Cerâmica' }, { v: 'eps', rotulo: 'EPS' }, { v: 'generico', rotulo: 'Genérico (peso por m²)' },
];

/**
 * Enchimento entre as nervuras. Concreto e EPS: peso específico `gama` (kN/m³) sobre o volume livre; cerâmica: peso da
 * peça e comprimento dela ao longo da vigota (a largura é o intereixo; peso por m² = peso/(comprimento × intereixo));
 * genérico: peso por m² de laje informado.
 */
export interface Enchimento {
  id: string;
  nome: string;
  material: MaterialEnchimento;
  gama?: number;
  pesoPeca?: number;
  comprimentoPeca?: number;
  pesoM2?: number;
  nota?: string;
}

export interface ResistenciaPositivo {
  /** Momento último e de fissuração (kN·m por nervura), rigidez total e fissurada (kN·m²) e rigidez à torção (kN·m², opcional). */
  Mu: number; Mfis: number; EI?: number; EIfis?: number; GJ?: number;
}
export interface ResistenciaNegativo {
  /** Mu da seção típica e da seção maciça, Mfis e rigidezes (kN·m, kN·m²). */
  Mu: number; MuMacico?: number; Mfis?: number; EI?: number; EIfis?: number;
}
export interface ResistenciaCortante {
  /** VRd1 (kN por nervura); nas protendidas sem estribo, a segunda coluna vale com o momento de cálculo acima da descompressão. */
  VRd1: number; VRd1Descomprimida?: number;
}
export interface ResistenciaProtensao {
  /** Momento de descompressão e momentos de serviço admissíveis por nível de protensão (kN·m por nervura). */
  Mdesc: number; Mparcial?: number; Mlimitada?: number; Mcompleta?: number;
}

/** Laje da série: altura total e intereixo definem a laje; as resistências valem para essa laje (tipo da vigota). */
export interface SerieFicha {
  id: string;
  /** Nome do tipo de vigota da série (K1.9.53: escolha por momento). */
  tipo?: string;
  altura: number; intereixo: number; capa: number; hEnch: number; bwMin: number;
  enchimento: string;
  /** Designação da treliça (tabela `lajes.trelicas`), nas treliçadas e armadas com treliça. */
  trelica?: string;
  /** Peso total por m² informado pelo fabricante; substitui o calculado. */
  pesoM2?: number;
  positivo?: ResistenciaPositivo;
  negativo?: ResistenciaNegativo;
  cortante?: ResistenciaCortante;
  protensao?: ResistenciaProtensao;
}

export interface FichaVigota {
  id: string;
  nome: string;
  fabricante?: string;
  /** Referência opcional (código do fabricante ou da obra). */
  referencia?: string;
  origem: OrigemFicha;
  familia: FamiliaVigota;
  series: SerieFicha[];
  /** Acréscimo de largura da nervura (m), só na rigidez e na fissuração (flecha), nunca na resistência (C7.23). */
  bwExtra?: number;
  /** Vigota dupla ou tripla: máximo de vigotas lado a lado (2 ou 3) e largura da vigota (m). */
  multipla?: { n: 2 | 3; larguraVigota: number };
  /** Relação EI fissurado/EI total informada quando as séries não trazem EIfis (armada × protendida na flecha, C7.26). */
  relacaoFis?: number;
  ficticio?: boolean;
  nota?: string;
}

export interface TiposLajeObra { fichas?: FichaVigota[]; enchimentos?: Enchimento[] }
/** O que as funções precisam do modelo: tabelas normativas (N3) e a biblioteca de tipos de laje da obra. */
export type FonteLajes = FonteNormas & { tiposLaje?: TiposLajeObra };

// ---------------------------------------------------------------- catálogo (tabelas N3)

export interface ModeloTrelicada { hEnch: number; intereixo: number; bw: number; capa: number; trelica: string }
export interface Trelica { h: number; sup: number; diag: number; inf: number }

/** Modelos das treliçadas em uso (biblioteca de normas, `lajes.trelicadas`). */
export function modelosTrelicadas(f?: FonteNormas): Record<string, ModeloTrelicada> {
  return Object.fromEntries(tabelaNorma(f, 'lajes.trelicadas').map((l) => [l.modelo as string, { hEnch: l.hEnch as number, intereixo: l.intereixo as number, bw: l.bw as number, capa: l.capa as number, trelica: l.trelica as string }]));
}
/** Treliças em uso (`lajes.trelicas`). */
export function trelicasDe(f?: FonteNormas): Record<string, Trelica> {
  return Object.fromEntries(tabelaNorma(f, 'lajes.trelicas').map((l) => [l.nome as string, { h: l.h as number, sup: l.sup as number, diag: l.diag as number, inf: l.inf as number }]));
}
const MATERIAIS = new Set<string>(['concreto', 'ceramica', 'eps', 'generico']);
/** Enchimentos do catálogo (`lajes.enchimentos`). */
export function enchimentosCatalogo(f?: FonteNormas): Enchimento[] {
  return tabelaNorma(f, 'lajes.enchimentos').map((l) => ({ id: l.id as string, nome: l.nome as string, material: (MATERIAIS.has(l.material as string) ? l.material : 'generico') as MaterialEnchimento, gama: l.gama as number }));
}
/** Enchimentos disponíveis: os da obra primeiro, depois os do catálogo. */
export const enchimentosDisponiveis = (f?: FonteLajes): Enchimento[] => [...(f?.tiposLaje?.enchimentos ?? []), ...enchimentosCatalogo(f).filter((c) => !f?.tiposLaje?.enchimentos?.some((e) => e.id === c.id))];
export const enchimentoPor = (f: FonteLajes | undefined, id: string): Enchimento | undefined => enchimentosDisponiveis(f).find((e) => e.id === id);

/** Peso do enchimento por m² de laje (kN/m²) numa laje de altura de enchimento `hEnch`, intereixo e largura de nervura `bw`. */
export function pesoEnchimentoM2(e: Enchimento, hEnch: number, intereixo: number, bw: number): number {
  if (e.material === 'generico') return e.pesoM2 ?? 0;
  if (e.material === 'ceramica' && e.pesoPeca !== undefined && e.comprimentoPeca) return e.pesoPeca / (e.comprimentoPeca * intereixo);
  const vol = ((intereixo - bw) * hEnch) / intereixo;
  return (e.gama ?? 0) * vol;
}

// ---------------------------------------------------------------- fichas

/** Id da ficha implícita das treliçadas do catálogo interno. */
export const FICHA_TRELICADAS = 'cat:trelicadas';

/** Ficha implícita do catálogo interno (somente leitura): uma série por modelo H8–H25, capa padrão. */
export function fichaTrelicadas(f?: FonteNormas): FichaVigota {
  const m = modelosTrelicadas(f);
  return {
    id: FICHA_TRELICADAS, nome: 'Treliçadas com EPS (catálogo interno)', origem: 'fabricante', familia: 'trelicada', nota: 'Catálogo próprio, a confirmar com o fabricante (biblioteca de normas, tabela "Lajes treliçadas").',
    series: Object.entries(m).map(([id, c]) => ({ id, altura: c.hEnch + c.capa, intereixo: c.intereixo, capa: c.capa, hEnch: c.hEnch, bwMin: c.bw, enchimento: 'eps', trelica: c.trelica })),
  };
}

/** Fichas fictícias (testes e demonstração): NÃO são de fabricante, os números são arbitrários mas coerentes. */
export const FICHAS_EXEMPLO: FichaVigota[] = [
  {
    id: 'ex:armada', nome: 'Armada exemplo (fictícia)', fabricante: 'Fictício', origem: 'fabricante', familia: 'armada', ficticio: true, nota: 'Dados fictícios para teste e demonstração.',
    multipla: { n: 3, larguraVigota: 0.12 },
    series: [
      { id: 'A12', tipo: 'A1', altura: 0.16, intereixo: 0.5, capa: 0.04, hEnch: 0.12, bwMin: 0.1, enchimento: 'eps', trelica: 'TR 12645', positivo: { Mu: 6, Mfis: 2.2, EI: 190, EIfis: 80, GJ: 60 }, negativo: { Mu: 3.2, MuMacico: 11, Mfis: 1.6, EI: 150, EIfis: 60 }, cortante: { VRd1: 6.5 } },
      { id: 'A12b', tipo: 'A2', altura: 0.16, intereixo: 0.5, capa: 0.04, hEnch: 0.12, bwMin: 0.1, enchimento: 'eps', trelica: 'TR 12645', positivo: { Mu: 9.5, Mfis: 2.2, EI: 190, EIfis: 95 }, negativo: { Mu: 3.2, MuMacico: 11, Mfis: 1.6 }, cortante: { VRd1: 6.5 } },
      { id: 'A20', tipo: 'A1', altura: 0.24, intereixo: 0.5, capa: 0.04, hEnch: 0.2, bwMin: 0.1, enchimento: 'eps', trelica: 'TR 20745', positivo: { Mu: 11, Mfis: 4.1, EI: 520, EIfis: 210 }, negativo: { Mu: 5, MuMacico: 20, Mfis: 3 }, cortante: { VRd1: 8 } },
    ],
  },
  {
    id: 'ex:protendida', nome: 'Protendida exemplo (fictícia)', fabricante: 'Fictício', origem: 'fabricante', familia: 'protendida', ficticio: true, nota: 'Dados fictícios para teste e demonstração.',
    series: [
      { id: 'P16', tipo: 'P1', altura: 0.2, intereixo: 0.5, capa: 0.04, hEnch: 0.16, bwMin: 0.1, enchimento: 'ceramica-ex', positivo: { Mu: 10, Mfis: 4.5, EI: 320, EIfis: 190 }, negativo: { Mu: 4.5, MuMacico: 16 }, cortante: { VRd1: 7, VRd1Descomprimida: 9 }, protensao: { Mdesc: 3.2, Mparcial: 8, Mlimitada: 6, Mcompleta: 4.5 } },
      { id: 'P16b', tipo: 'P2', altura: 0.2, intereixo: 0.5, capa: 0.04, hEnch: 0.16, bwMin: 0.1, enchimento: 'ceramica-ex', positivo: { Mu: 14, Mfis: 5.5, EI: 320, EIfis: 210 }, negativo: { Mu: 4.5, MuMacico: 16 }, cortante: { VRd1: 7, VRd1Descomprimida: 9 }, protensao: { Mdesc: 4.4, Mparcial: 11, Mlimitada: 8.5, Mcompleta: 6 } },
    ],
  },
];
/** Enchimentos fictícios das fichas de exemplo. */
export const ENCHIMENTOS_EXEMPLO: Enchimento[] = [
  { id: 'ceramica-ex', nome: 'Cerâmica exemplo (fictícia)', material: 'ceramica', pesoPeca: 0.07, comprimentoPeca: 0.2, nota: 'Peso da peça fictício.' },
];

export type FonteFicha = 'obra' | 'catalogo' | 'exemplo';
/** Todas as fichas ao alcance, com a fonte: as da obra primeiro, depois o catálogo interno e os exemplos. */
export function fichasDisponiveis(f?: FonteLajes): { ficha: FichaVigota; fonte: FonteFicha }[] {
  const obra = (f?.tiposLaje?.fichas ?? []).map((ficha) => ({ ficha, fonte: 'obra' as const }));
  const ids = new Set(obra.map((x) => x.ficha.id));
  return [...obra, ...[{ ficha: fichaTrelicadas(f), fonte: 'catalogo' as const }, ...FICHAS_EXEMPLO.map((ficha) => ({ ficha, fonte: 'exemplo' as const }))].filter((x) => !ids.has(x.ficha.id))];
}
export const fichaPor = (f: FonteLajes | undefined, id: string): FichaVigota | undefined => fichasDisponiveis(f).find((x) => x.ficha.id === id)?.ficha;
/** Enchimentos das fichas de exemplo entram na lista quando uma ficha de exemplo é usada (a obra os copia ao atribuir). */
export const enchimentoPorOuExemplo = (f: FonteLajes | undefined, id: string): Enchimento | undefined => enchimentoPor(f, id) ?? ENCHIMENTOS_EXEMPLO.find((e) => e.id === id);

// ---------------------------------------------------------------- geometria e peso

/** Geometria e propriedades resolvidas de uma laje nervurada unidirecional (treliçada, por ficha ou moldada). */
export interface GeometriaNervurada {
  tipo: 'trelicada' | 'vigotas' | 'moldada';
  /** Altura total, capa, altura do enchimento, intereixo e largura da nervura (m). */
  h: number; capa: number; hEnch: number; intereixo: number; bw: number;
  /** Largura da nervura na rigidez e na fissuração (bw + bwExtra); a resistência usa `bw`. */
  bwRigidez: number;
  /** Peso próprio (kN/m²) e descrição. */
  pp: number; descricao: string;
  trelica?: string;
  ficha?: FichaVigota; serie?: SerieFicha; familia: FamiliaVigota;
  /** Rigidez à flexão e à torção por nervura vindas da ficha (kN·m²), quando informadas. */
  EI?: number; GJ?: number;
  /** Ficha ou série não encontrada: usa-se o modelo H12 do catálogo para não parar a análise. */
  ausente?: string;
}

const cm = (x: number) => Math.round(x * 100);
/** Profundidade da nervura abaixo da capa: `hEnch` (igual a altura − capa nas séries consistentes). */
const hNervura = (altura: number, capa: number, hEnch: number) => (Math.abs(altura - capa - hEnch) < 1e-9 ? hEnch : altura - capa);

function pesoNervurada(capa: number, hNerv: number, intereixo: number, bw: number, ench: number): number {
  const nerv = (bw * hNerv) / intereixo;
  return GAMA_CONCRETO * (capa + nerv) + ench;
}

/** Geometria da laje nervurada unidirecional (qualquer tipo menos maciça). */
export function geometriaNervurada(f: FonteLajes | undefined, t: Exclude<TipoLaje, { tipo: 'macica' }>): GeometriaNervurada {
  if (t.tipo === 'trelicada') {
    const m = modelosTrelicadas(f), ausente = m[t.modelo] ? undefined : `modelo "${t.modelo}" não está no catálogo`;
    const c = m[t.modelo] ?? m.H12 ?? Object.values(m)[0];
    const eps = ((c.intereixo - c.bw) * c.hEnch) / c.intereixo;
    const gEps = enchimentoPor(f, 'eps')?.gama ?? 0.2;
    return { tipo: 'trelicada', h: c.hEnch + t.capa, capa: t.capa, hEnch: c.hEnch, intereixo: c.intereixo, bw: c.bw, bwRigidez: c.bw, pp: GAMA_CONCRETO * (t.capa + (c.bw * c.hEnch) / c.intereixo) + gEps * eps,
      descricao: `treliçada ${t.modelo}+${cm(t.capa)}`, trelica: c.trelica, familia: 'trelicada', ...(ausente ? { ausente } : {}) };
  }
  if (t.tipo === 'moldada') {
    const e = enchimentoPorOuExemplo(f, t.enchimento), ausente = e ? undefined : `enchimento "${t.enchimento}" não existe`;
    const hEnch = Math.max(0.01, t.h - t.capa), ench = e ? pesoEnchimentoM2(e, hEnch, t.intereixo, t.bw) : 0;
    return { tipo: 'moldada', h: t.h, capa: t.capa, hEnch, intereixo: t.intereixo, bw: t.bw, bwRigidez: t.bw, pp: pesoNervurada(t.capa, hEnch, t.intereixo, t.bw, ench),
      descricao: `nervurada moldada h=${cm(t.h)} i=${cm(t.intereixo)}`, familia: 'moldada', ...(ausente ? { ausente } : {}) };
  }
  const ficha = fichaPor(f, t.ficha), serie = ficha?.series.find((s) => s.id === t.serie);
  if (!ficha || !serie) {
    const g = geometriaNervurada(f, { tipo: 'trelicada', modelo: 'H12', capa: 0.04 });
    return { ...g, tipo: 'vigotas', ausente: !ficha ? `ficha "${t.ficha}" não existe` : `série "${t.serie}" não existe na ficha "${ficha.nome}"`, descricao: `${t.ficha} ${t.serie} (ausente)` };
  }
  const e = enchimentoPorOuExemplo(f, serie.enchimento), hN = hNervura(serie.altura, serie.capa, serie.hEnch);
  const ench = e ? pesoEnchimentoM2(e, serie.hEnch, serie.intereixo, serie.bwMin) : 0;
  return {
    tipo: 'vigotas', h: serie.altura, capa: serie.capa, hEnch: serie.hEnch, intereixo: serie.intereixo, bw: serie.bwMin, bwRigidez: serie.bwMin + (ficha.bwExtra ?? 0),
    pp: serie.pesoM2 ?? pesoNervurada(serie.capa, hN, serie.intereixo, serie.bwMin, ench), descricao: `${ficha.nome} ${serie.id}`,
    ...(serie.trelica ? { trelica: serie.trelica } : {}), ficha, serie, familia: ficha.familia,
    ...(serie.positivo?.EI !== undefined ? { EI: serie.positivo.EI } : {}), ...(serie.positivo?.GJ !== undefined ? { GJ: serie.positivo.GJ } : {}),
    ...(e ? {} : { ausente: `enchimento "${serie.enchimento}" não existe` }),
  };
}

// ---------------------------------------------------------------- propriedades de seção

/** Inércia (m⁴), posição do centróide a partir da face inferior (m) e área de uma seção T (mesa bf × hf em cima). */
export function secaoT(bf: number, hf: number, bw: number, h: number): { A: number; yc: number; I: number } {
  const A1 = bf * hf, A2 = bw * (h - hf), y1 = h - hf / 2, y2 = (h - hf) / 2, A = A1 + A2, yc = (A1 * y1 + A2 * y2) / A;
  return { A, yc, I: (bf * hf ** 3) / 12 + A1 * (y1 - yc) ** 2 + (bw * (h - hf) ** 3) / 12 + A2 * (y2 - yc) ** 2 };
}

export interface PropriedadesFlexao {
  /** Inércia bruta com a largura de rigidez (bw + bwExtra) e sem ela. */
  Ic: number; Ic0: number;
  /** Momento de fissuração (kN·m por nervura) com a largura de rigidez: Mr = 1,2·fctm·Ic/yt (NBR 6118, 17.3.1, seção T) [a confirmar]. */
  Mfis: number;
  /** Rigidez total EcsIc (kN·m²) por nervura. */
  EI: number;
}
/** Rigidez e momento de fissuração por nervura pela geometria; `bwExtra` entra aqui e não na resistência (C7.23). */
export function propriedadesFlexao(g: GeometriaNervurada, c: Concrete): PropriedadesFlexao {
  const a = secaoT(g.intereixo, g.capa, g.bwRigidez, g.h), a0 = secaoT(g.intereixo, g.capa, g.bw, g.h);
  return { Ic: a.I, Ic0: a0.I, Mfis: (1.2 * c.fctm * a.I * 1000) / a.yc, EI: c.Ecs * 1000 * a.I };
}

/** Momento resistente por nervura (kN·m) da seção T com armadura `As` (m², fyd em MPa) e altura útil `d`; só a largura `bw` (sem acréscimo). */
export function momentoResistenteT(c: Concrete, bf: number, hf: number, bw: number, d: number, As: number, fyd: number): number {
  const T = As * fyd, yLim = c.lambda * c.xLimRatio * d;
  let y = T / (c.sigmaCd * bf);
  if (y <= hf) { y = Math.min(y, yLim); return c.sigmaCd * bf * y * (d - y / 2) * 1000; }
  const Rcf = c.sigmaCd * (bf - bw) * hf, Rcw = Math.max(0, T - Rcf), yw = Math.min(Rcw / (c.sigmaCd * bw), yLim);
  return (Rcf * (d - hf / 2) + c.sigmaCd * bw * yw * (d - yw / 2)) * 1000;
}

/** Inércia fissurada (estádio II, m⁴) da seção T com armadura `As` (m²) e αe = Es/Ecs. */
export function inerciaEstadioII(c: Concrete, bf: number, hf: number, bw: number, d: number, As: number, Es = 210000): number {
  const ae = Es / c.Ecs;
  // linha neutra na mesa: bf x²/2 = αe As (d − x)
  const a = bf / 2, b = ae * As, x1 = (-b + Math.sqrt(b * b + 4 * a * b * d)) / (2 * a);
  if (x1 <= hf) return (bf * x1 ** 3) / 3 + ae * As * (d - x1) ** 2;
  // linha neutra na alma: bw x²/2 + (bf − bw)(hf x − hf²/2) = αe As (d − x)
  const A2 = bw / 2, B2 = (bf - bw) * hf + ae * As, C2 = -((bf - bw) * hf ** 2) / 2 - ae * As * d;
  const x = (-B2 + Math.sqrt(B2 * B2 - 4 * A2 * C2)) / (2 * A2);
  return (bw * x ** 3) / 3 + ((bf - bw) * hf ** 3) / 12 + (bf - bw) * hf * (x - hf / 2) ** 2 + ae * As * (d - x) ** 2;
}

/**
 * Relação EI fissurado/EI total para a flecha (C7.26): a da série (EIfis/EI), a da ficha (`relacaoFis`) ou `undefined`
 * (sem dado do fabricante: a flecha usa Branson com Mr e Ma, a confirmar com o fabricante).
 */
export function relacaoFissurada(g: GeometriaNervurada): number | undefined {
  const p = g.serie?.positivo;
  if (p?.EI && p.EIfis) return p.EIfis / p.EI;
  return g.ficha?.relacaoFis;
}
/** Rigidez efetiva por Branson entre a total e a fissurada: Ie = (Mr/Ma)³·Ic + [1 − (Mr/Ma)³]·II (limitada a Ic). */
export function bransonEI(EI: number, EIfis: number, Mfis: number, Ma: number): number {
  const r = Ma <= Mfis ? 1 : (Mfis / Ma) ** 3;
  return Math.min(EI, r * EI + (1 - r) * EIfis);
}

/** Rigidez à flexão (e à torção, se a ficha informa) por nervura para a grelha: da ficha ou da geometria (K1.15.1-2). */
export function rigidezNervura(g: GeometriaNervurada, c: Concrete, usarFicha = true): { EI: number; GJ?: number; fonte: 'ficha' | 'geometria' } {
  if (usarFicha && g.EI !== undefined) return { EI: g.EI, ...(g.GJ !== undefined ? { GJ: g.GJ } : {}), fonte: 'ficha' };
  return { EI: propriedadesFlexao(g, c).EI, fonte: 'geometria' };
}

// ---------------------------------------------------------------- vigotas duplas e triplas (K1.9.59)

export interface ConjuntoVigotas {
  n: number;
  /** Largura da nervura do conjunto (m), peso linear (kN/m de nervura) e inércia da seção T com essa largura (m⁴). */
  bw: number; pesoLinear: number; I: number;
}
/**
 * Propriedades da nervura com `n` vigotas lado a lado (1 a 3, no máximo o da ficha): a largura cresce de
 * (n − 1) larguras de vigota, no lugar do enchimento (a diferença de peso é concreto menos enchimento) [a confirmar].
 */
export function conjuntoVigotas(f: FonteLajes | undefined, g: GeometriaNervurada, n: number): ConjuntoVigotas {
  const max = g.ficha?.multipla?.n ?? 1, k = Math.min(Math.max(1, Math.round(n)), max), larg = g.ficha?.multipla?.larguraVigota ?? 0;
  const bw = g.bwRigidez + (k - 1) * larg, lin = g.pp * g.intereixo;
  const e = g.serie ? enchimentoPorOuExemplo(f, g.serie.enchimento) : undefined;
  const volLivre = (g.intereixo - g.bw) * g.hEnch, gamaEq = e && volLivre > 0 ? (pesoEnchimentoM2(e, g.hEnch, g.intereixo, g.bw) * g.intereixo) / volLivre : 0;
  return { n: k, bw, pesoLinear: lin + (k - 1) * larg * g.hEnch * (GAMA_CONCRETO - gamaEq), I: secaoT(g.intereixo, g.capa, bw, g.h).I };
}

// ---------------------------------------------------------------- tipo por momento (K1.9.53)

/** Momento último por metro de largura (kN·m/m) de uma série. */
export const muPorMetro = (s: SerieFicha): number | undefined => (s.positivo ? s.positivo.Mu / s.intereixo : undefined);
/**
 * Série da ficha de menor momento último por metro que cobre `MdPorMetro` (kN·m/m, já majorado), entre as de mesma altura
 * e intereixo; `null` se nenhuma cobre (a tabela deve ser ampliada).
 */
export function escolherPorMomento(ficha: FichaVigota, MdPorMetro: number, altura?: number, intereixo?: number): SerieFicha | null {
  const cand = ficha.series.filter((s) => s.positivo && (altura === undefined || Math.abs(s.altura - altura) < 1e-6) && (intereixo === undefined || Math.abs(s.intereixo - intereixo) < 1e-6))
    .sort((a, z) => muPorMetro(a)! - muPorMetro(z)!);
  return cand.find((s) => muPorMetro(s)! >= MdPorMetro - 1e-9) ?? null;
}

// ---------------------------------------------------------------- tipo genérico por geometria (C7.21, C7.22)

export interface ParamsGeometria {
  id: string; nome: string; referencia?: string;
  familia: 'armada' | 'protendida';
  capa: number; hEnch: number; intereixo: number; bwMin: number;
  enchimento: string;
  /** Armada: designação da treliça (banzo inferior de 2 barras CA-60). */
  trelica?: string;
  /** Protendida: Mu (e, se houver, Mfis) informados. */
  Mu?: number; Mfis?: number; relacaoFis?: number;
  bwExtra?: number;
}
/**
 * Ficha genérica (origem `geometria`): uma série com as propriedades calculadas pela seção T. Armada: treliça do
 * catálogo (Mu pelo banzo inferior em CA-60, EI total e fissurado pelo estádio II); protendida: Mu informado (Mfis, EIfis
 * por `relacaoFis`, se informados). Serve para decidir entre armada e protendida pela flecha antes da vigota final.
 */
export function fichaPorGeometria(f: FonteLajes | undefined, c: Concrete, p: ParamsGeometria, cobrimento = 0.025): FichaVigota {
  const altura = p.hEnch + p.capa, serie: SerieFicha = { id: p.id, altura, intereixo: p.intereixo, capa: p.capa, hEnch: p.hEnch, bwMin: p.bwMin, enchimento: p.enchimento, ...(p.trelica ? { trelica: p.trelica } : {}) };
  const ficha: FichaVigota = { id: p.id, nome: p.nome, ...(p.referencia ? { referencia: p.referencia } : {}), origem: 'geometria', familia: p.familia, series: [serie], ...(p.bwExtra ? { bwExtra: p.bwExtra } : {}), ...(p.familia === 'protendida' && p.relacaoFis ? { relacaoFis: p.relacaoFis } : {}) };
  const g = geometriaNervurada({ ...f, tiposLaje: { ...f?.tiposLaje, fichas: [ficha] } }, { tipo: 'vigotas', ficha: p.id, serie: p.id });
  const fl = propriedadesFlexao(g, c);
  if (p.familia === 'armada') {
    const t = p.trelica ? trelicasDe(f)[p.trelica] : undefined;
    if (t) {
      const As = 2 * (Math.PI * (t.inf / 1000) ** 2) / 4, d = altura - cobrimento - t.inf / 2000;
      const II = inerciaEstadioII(c, p.intereixo, p.capa, g.bwRigidez, d, As);
      serie.positivo = { Mu: momentoResistenteT(c, p.intereixo, p.capa, p.bwMin, d, As, 600 / 1.15), Mfis: fl.Mfis, EI: fl.EI, EIfis: c.Ecs * 1000 * II };
    }
  } else if (p.Mu !== undefined) {
    serie.positivo = { Mu: p.Mu, Mfis: p.Mfis ?? fl.Mfis, EI: fl.EI, ...(p.relacaoFis ? { EIfis: fl.EI * p.relacaoFis } : {}) };
  }
  return ficha;
}

// ---------------------------------------------------------------- validação lógica (C7.30)

export interface ValidacaoFicha { erros: string[]; avisos: string[] }
const pos = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0;
const num = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/**
 * Controle lógico da ficha (o programa não confere o dado do fabricante): campos obrigatórios, valores positivos,
 * Mu > Mfis, altura ≥ capa + enchimento, EI fissurado ≤ total, níveis de protensão ordenados e séries sem repetição.
 * `erros` impedem o uso; `avisos` são campos recomendados ausentes.
 */
export function validarFicha(ficha: FichaVigota, f?: FonteLajes): ValidacaoFicha {
  const erros: string[] = [], avisos: string[] = [];
  if (!ficha.id?.trim()) erros.push('Ficha sem identificador.');
  if (!ficha.nome?.trim()) erros.push('Ficha sem nome.');
  if (!FAMILIAS_VIGOTA.some((x) => x.v === ficha.familia)) erros.push('Família da vigota inválida.');
  if (!ficha.series?.length) erros.push('A ficha precisa de ao menos uma laje na série.');
  if (ficha.bwExtra !== undefined && !(num(ficha.bwExtra) && ficha.bwExtra >= 0)) erros.push('Acréscimo de largura da nervura inválido (≥ 0).');
  if (ficha.multipla && !((ficha.multipla.n === 2 || ficha.multipla.n === 3) && pos(ficha.multipla.larguraVigota))) erros.push('Vigota múltipla: n deve ser 2 ou 3 (no máximo a tripla) e a largura da vigota, positiva.');
  if (ficha.relacaoFis !== undefined && !(num(ficha.relacaoFis) && ficha.relacaoFis > 0 && ficha.relacaoFis <= 1)) erros.push('Relação EI fissurado/total deve estar entre 0 e 1.');
  const ids = new Set<string>(), pares = new Set<string>();
  const tr = trelicasDe(f);
  for (const s of ficha.series ?? []) {
    const n = `Série ${s.id || '(sem id)'}`;
    if (!s.id?.trim()) erros.push('Série sem identificador.');
    else if (ids.has(s.id)) erros.push(`${n}: identificador repetido.`);
    ids.add(s.id);
    if (![s.altura, s.intereixo, s.capa, s.hEnch, s.bwMin].every(pos)) { erros.push(`${n}: altura, intereixo, capa, altura do enchimento e largura mínima da nervura devem ser positivos.`); continue; }
    const par = `${s.altura.toFixed(4)}|${s.intereixo.toFixed(4)}|${s.tipo ?? ''}`;
    if (pares.has(par)) erros.push(`${n}: altura e intereixo repetidos na série${s.tipo ? ` para o tipo ${s.tipo}` : ''}.`);
    pares.add(par);
    if (s.altura < s.capa + s.hEnch - 1e-9) erros.push(`${n}: altura total menor que capa + altura do enchimento.`);
    if (s.bwMin >= s.intereixo) erros.push(`${n}: largura mínima da nervura maior ou igual ao intereixo.`);
    if (s.pesoM2 !== undefined && !pos(s.pesoM2)) erros.push(`${n}: peso por m² deve ser positivo.`);
    if (!s.enchimento) erros.push(`${n}: enchimento não informado.`);
    else if (!enchimentoPorOuExemplo(f, s.enchimento)) erros.push(`${n}: enchimento "${s.enchimento}" não existe na biblioteca.`);
    if (s.trelica && !tr[s.trelica]) erros.push(`${n}: treliça "${s.trelica}" não existe na biblioteca de normas.`);
    if (ficha.familia === 'trelicada' && !s.trelica) erros.push(`${n}: treliçada sem designação da treliça.`);
    const p = s.positivo;
    if (p) {
      if (!pos(p.Mu) || !pos(p.Mfis)) erros.push(`${n}: momentos positivos (Mu, Mfis) devem ser positivos.`);
      else if (p.Mu <= p.Mfis) erros.push(`${n}: momento positivo Mu deve ser maior que Mfis.`);
      if (p.EI !== undefined && !pos(p.EI)) erros.push(`${n}: EI positivo inválido.`);
      if (p.EIfis !== undefined && !pos(p.EIfis)) erros.push(`${n}: EI fissurado positivo inválido.`);
      if (pos(p.EI) && pos(p.EIfis) && p.EIfis > p.EI * (1 + 1e-9)) erros.push(`${n}: EI fissurado maior que o EI total.`);
      if (p.GJ !== undefined && !pos(p.GJ)) erros.push(`${n}: GJ inválido.`);
    } else if (ficha.familia !== 'trelicada') erros.push(`${n}: falta o momento positivo (Mu e Mfis), campo obrigatório.`);
    const ng = s.negativo;
    if (ng) {
      if (!pos(ng.Mu)) erros.push(`${n}: momento negativo Mu deve ser positivo.`);
      else {
        if (ng.Mfis !== undefined && (!pos(ng.Mfis) || ng.Mu <= ng.Mfis)) erros.push(`${n}: momento negativo Mu deve ser maior que Mfis.`);
        if (ng.MuMacico !== undefined && (!pos(ng.MuMacico) || ng.MuMacico < ng.Mu)) erros.push(`${n}: Mu da seção maciça menor que o da seção típica.`);
      }
      if (pos(ng.EI) && pos(ng.EIfis) && ng.EIfis > ng.EI * (1 + 1e-9)) erros.push(`${n}: EI fissurado negativo maior que o total.`);
    } else if (ficha.familia !== 'trelicada') avisos.push(`${n}: sem dados do momento negativo (recomendado).`);
    if (s.cortante && !pos(s.cortante.VRd1)) erros.push(`${n}: VRd1 deve ser positivo.`);
    else if (!s.cortante && ficha.familia !== 'trelicada') avisos.push(`${n}: sem cortante resistente VRd1 (recomendado).`);
    if (s.cortante?.VRd1Descomprimida !== undefined && s.cortante.VRd1Descomprimida < s.cortante.VRd1) erros.push(`${n}: VRd1 com descompressão menor que VRd1.`);
    if (ficha.familia === 'protendida') {
      const pr = s.protensao;
      if (!pr) erros.push(`${n}: protendida sem momentos de serviço e de descompressão, campos obrigatórios.`);
      else {
        const niv = [pr.Mcompleta, pr.Mlimitada, pr.Mparcial];
        if (!pos(pr.Mdesc)) erros.push(`${n}: momento de descompressão deve ser positivo.`);
        if (niv.some((x) => x !== undefined && !pos(x))) erros.push(`${n}: momentos de serviço por nível de protensão devem ser positivos.`);
        const ok = niv.filter((x): x is number => x !== undefined);
        if (ok.some((x, i) => i > 0 && x < ok[i - 1] - 1e-9)) erros.push(`${n}: momentos de serviço devem crescer da protensão completa para a parcial.`);
        if (!niv.some((x) => x !== undefined)) avisos.push(`${n}: sem momento de serviço por nível de protensão (recomendado).`);
        if (p && pos(p.Mu) && ok.some((x) => x > p.Mu + 1e-9)) erros.push(`${n}: momento de serviço maior que Mu.`);
      }
    }
    if (s.positivo && !s.positivo.EI) avisos.push(`${n}: sem EI total (a grelha usa a inércia calculada).`);
  }
  return { erros, avisos };
}

// ---------------------------------------------------------------- uso na obra

/** Fichas da obra usadas pelas lajes (ids em `b.lajes[].tipo`). */
export function fichasUsadas(b: FonteLajes & { lajes: { tipo: TipoLaje }[] }): FichaVigota[] {
  const ids = [...new Set(b.lajes.flatMap((l) => (l.tipo.tipo === 'vigotas' ? [l.tipo.ficha] : [])))];
  return ids.map((id) => fichaPor(b, id)).filter((x): x is FichaVigota => !!x);
}

export interface LinhaFichaMemorial {
  id: string; nome: string; fabricante: string; familia: string; origem: string; ficticio: boolean;
  /** Marca de procedência exibida no memorial. */
  marca: string;
  series: { id: string; tipo?: string; altura: number; intereixo: number; capa: number; hEnch: number; bw: number; pp: number; enchimento: string; Mu?: number; Mfis?: number; EI?: number; VRd1?: number; usada: boolean }[];
  erros: string[];
}
export const MARCA_FABRICANTE = 'dado do fabricante, não verificado pelo programa';
/** Tabela das fichas usadas para o memorial (e premissas de enchimento): peso por m² calculado e valores da ficha. */
export function fichasNoMemorial(b: FonteLajes & { lajes: { tipo: TipoLaje }[] }): LinhaFichaMemorial[] {
  return fichasUsadas(b).map((ficha) => {
    const usadas = new Set(b.lajes.flatMap((l) => (l.tipo.tipo === 'vigotas' && l.tipo.ficha === ficha.id ? [l.tipo.serie] : [])));
    return {
      id: ficha.id, nome: ficha.nome, fabricante: ficha.fabricante ?? '—', familia: FAMILIAS_VIGOTA.find((x) => x.v === ficha.familia)?.rotulo ?? ficha.familia,
      origem: ficha.origem === 'fabricante' ? 'fabricante (somente leitura)' : ficha.origem === 'usuario' ? 'usuário' : 'geometria (genérico)', ficticio: !!ficha.ficticio,
      marca: ficha.origem === 'geometria' ? 'propriedades calculadas pela geometria' : ficha.ficticio ? 'ficha fictícia (demonstração)' : MARCA_FABRICANTE,
      series: ficha.series.map((s) => {
        const g = geometriaNervurada(b, { tipo: 'vigotas', ficha: ficha.id, serie: s.id });
        return { id: s.id, ...(s.tipo ? { tipo: s.tipo } : {}), altura: s.altura, intereixo: s.intereixo, capa: s.capa, hEnch: s.hEnch, bw: s.bwMin, pp: g.pp, enchimento: s.enchimento,
          ...(s.positivo ? { Mu: s.positivo.Mu, Mfis: s.positivo.Mfis, ...(s.positivo.EI ? { EI: s.positivo.EI } : {}) } : {}), ...(s.cortante ? { VRd1: s.cortante.VRd1 } : {}), usada: usadas.has(s.id) };
      }),
      erros: validarFicha(ficha, b).erros,
    };
  });
}

// ---------------------------------------------------------------- exportar / importar

export const FORMATO_TIPOS_LAJE = 'statikos-tipos-laje';
export interface ArquivoTiposLaje { formato: typeof FORMATO_TIPOS_LAJE; versao: 1; fichas: FichaVigota[]; enchimentos: Enchimento[] }
const copia = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** JSON versionado das fichas e enchimentos da obra (todos, ou os ids indicados); fichas de catálogo e exemplo são resolvidas por id. */
export function exportarTiposLaje(b: FonteLajes | undefined, sel?: { fichas?: string[]; enchimentos?: string[] }): string {
  const fichas = fichasDisponiveis(b).map((x) => x.ficha).filter((x) => (sel?.fichas ? sel.fichas.includes(x.id) : b?.tiposLaje?.fichas?.some((y) => y.id === x.id)));
  const ids = new Set(fichas.flatMap((x) => x.series.map((s) => s.enchimento)));
  const ench = enchimentosDisponiveis(b).filter((e) => (sel?.enchimentos ? sel.enchimentos.includes(e.id) : b?.tiposLaje?.enchimentos?.some((y) => y.id === e.id)));
  // enchimentos das fichas exportadas que são da obra ou de exemplo vão junto, para o arquivo ser autossuficiente
  for (const id of ids) { const e = enchimentoPorOuExemplo(b, id); if (e && !ench.some((x) => x.id === id) && !enchimentosCatalogo(b).some((x) => x.id === id)) ench.push(e); }
  const out: ArquivoTiposLaje = { formato: FORMATO_TIPOS_LAJE, versao: 1, fichas: copia(fichas), enchimentos: copia(ench) };
  return JSON.stringify(out, null, 2);
}

const ehObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

/** Lê o JSON exportado; só a estrutura é conferida aqui (a coerência lógica das fichas é `validarFicha`). */
export function importarTiposLaje(texto: string): { ok: true; fichas: FichaVigota[]; enchimentos: Enchimento[] } | { ok: false; erros: string[] } {
  let j: unknown;
  try { j = JSON.parse(texto); } catch { return { ok: false, erros: ['JSON inválido'] }; }
  if (!ehObj(j) || j.formato !== FORMATO_TIPOS_LAJE) return { ok: false, erros: [`Arquivo não é uma biblioteca de tipos de laje do Statikos (formato "${FORMATO_TIPOS_LAJE}").`] };
  const erros: string[] = [];
  const fichas = Array.isArray(j.fichas) ? j.fichas : [], enchimentos = Array.isArray(j.enchimentos) ? j.enchimentos : [];
  fichas.forEach((x, i) => {
    if (!ehObj(x) || typeof x.id !== 'string' || typeof x.nome !== 'string' || typeof x.familia !== 'string' || !Array.isArray(x.series) || !x.series.every(ehObj)) erros.push(`ficha ${i + 1}: estrutura inválida (id, nome, familia e series)`);
  });
  enchimentos.forEach((x, i) => { if (!ehObj(x) || typeof x.id !== 'string' || typeof x.nome !== 'string' || !MATERIAIS.has(String(x.material))) erros.push(`enchimento ${i + 1}: estrutura inválida (id, nome e material)`); });
  if (new Set(fichas.map((x) => (x as FichaVigota).id)).size !== fichas.length) erros.push('fichas com identificador repetido');
  if (new Set(enchimentos.map((x) => (x as Enchimento).id)).size !== enchimentos.length) erros.push('enchimentos com identificador repetido');
  return erros.length ? { ok: false, erros } : { ok: true, fichas: copia(fichas) as FichaVigota[], enchimentos: copia(enchimentos) as Enchimento[] };
}

/** Erros do tipo de laje (existência da ficha, série e enchimento; coerência lógica da ficha), com código e mensagem. */
export function errosTipoLaje(f: FonteLajes | undefined, t: TipoLaje | undefined): { codigo: string; mensagem: string }[] {
  if (!t) return [];
  const e = (codigo: string, mensagem: string) => [{ codigo, mensagem }];
  if (t.tipo === 'trelicada') return modelosTrelicadas(f)[t.modelo] ? [] : e('TIPOLAJE_INVALIDO', `Modelo de treliçada "${t.modelo}" não existe na biblioteca de normas (tabela "Lajes treliçadas").`);
  if (t.tipo === 'vigotas') {
    const fi = fichaPor(f, t.ficha);
    if (!fi) return e('FICHA_INEXISTENTE', `Ficha "${t.ficha}" não existe.`);
    if (!fi.series.some((s) => s.id === t.serie)) return e('FICHA_INEXISTENTE', `A ficha "${fi.nome}" não tem a laje "${t.serie}" na série.`);
    const v = validarFicha(fi, f);
    return v.erros.length ? e('FICHA_INCOERENTE', `Ficha "${fi.nome}" incoerente: ${v.erros.join(' ')}`) : [];
  }
  if (t.tipo === 'moldada') {
    if (!enchimentoPorOuExemplo(f, t.enchimento)) return e('ENCHIMENTO_INEXISTENTE', `Enchimento "${t.enchimento}" não existe.`);
    if (!(t.capa > 0 && t.intereixo > 0 && t.bw > 0 && t.h > t.capa + 0.01 && t.bw < t.intereixo)) return e('TIPOLAJE_INVALIDO', 'Nervurada moldada: capa, intereixo e largura devem ser positivos, a largura menor que o intereixo e a altura maior que a capa.');
  }
  return [];
}

// ---------------------------------------------------------------- atalhos para os consumidores

/** Laje nervurada unidirecional (treliçada, por ficha ou moldada), em contraste com a maciça. */
export const ehNervurada = (t: TipoLaje): t is Exclude<TipoLaje, { tipo: 'macica' }> => t.tipo !== 'macica';
/**
 * Rótulo do tipo de laje nas legendas das pranchas (formas e armação): maciça "h=12"; treliçada "TR H12+4 (h=16)"; por ficha
 * "<ficha> <série> (h=…)", com a referência da ficha e da série (E3a); moldada "NM capa+enchimento i=… (h=…)".
 */
export function rotuloLaje(f: FonteLajes | undefined, t: TipoLaje): string {
  if (t.tipo === 'macica') return `h=${cm(t.h)}`;
  const g = geometriaNervurada(f, t);
  if (t.tipo === 'trelicada') return `TR ${t.modelo}+${cm(t.capa)} (h=${cm(g.hEnch + t.capa)})`;
  if (t.tipo === 'vigotas') return `${g.ficha?.nome ?? t.ficha} ${t.serie} (h=${cm(g.h)})`;
  return `NM ${cm(g.capa)}+${cm(g.hEnch)} i=${cm(g.intereixo)} (h=${cm(g.h)})`;
}
/** Espessura da maciça ou capa da nervurada (m). */
export const capaLaje = (f: FonteLajes | undefined, t: TipoLaje): number => (t.tipo === 'macica' ? t.h : geometriaNervurada(f, t).capa);
/** Espessura equivalente de concreto (m): h da maciça ou capa + volume das nervuras por m². */
export function espessuraConcreto(f: FonteLajes | undefined, t: TipoLaje): number {
  if (t.tipo === 'macica') return t.h;
  const g = geometriaNervurada(f, t);
  return g.capa + (g.bw * g.hEnch) / g.intereixo;
}
