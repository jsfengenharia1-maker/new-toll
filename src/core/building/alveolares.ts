// Lajes alveolares protendidas (frente E3e): fichas de placas (catálogo editável na biblioteca de normas, `lajes.alveolares`,
// na obra e exemplos fictícios), geometria e peso, paginação das placas no pano (largura útil entre a mínima e a padrão, placas
// de borda cortadas, comprimento com os apoios), processo construtivo (escorado, engaste aproximado e duas fases) e
// exportação/importação em JSON. NÃO há dado de fabricante no programa: o catálogo de fábrica é um gabarito sem resistências e
// as fichas de `FICHAS_ALVEOLAR_EXEMPLO` são FICTÍCIAS (testes e demonstração). A verificação e o dimensionamento
// (escolha da placa, serviço, cortante, negativos na capa, flecha e quantitativos) estão em `alveolaresDim.ts`.
// Núcleo puro; kN, m; momentos em kN·m por metro de largura (as fichas por placa são convertidas pela largura).
import { tabelaNorma, type FonteNormas } from '../normas';
import { dentroPoligono, pontoInterno, type P } from '../geom/faces';
import { geometriaViga, type BuildingModel, type Laje, type TipoLaje } from './types';
import type { OpcoesCalculo } from './opcoes';
import type { FonteLajes } from './tiposLaje';

const GAMA_CONCRETO = 25; // kN/m³ (NBR 6120), o mesmo de `GAMA_CONCRETO` em tiposLaje.ts

export type TipoAlveolar = Extract<TipoLaje, { tipo: 'alveolar' }>;
export type OrigemFichaAlveolar = 'fabricante' | 'usuario';
/** Base das resistências da ficha: por metro de largura (padrão) ou por placa inteira (divididas pela largura da placa). */
export type BaseResistencia = 'metro' | 'placa';

/** Linha do negativo na capa: φ (mm) a cada `s` (m) com os valores da ficha por metro de largura (kN·m/m, kN·m²/m, kN/m). */
export interface NegativoPlaca { phi: number; s: number; Mu: number; Mfis?: number; EI?: number; EIfis?: number; VRd?: number }
/** Momentos de serviço admissíveis por nível de protensão e de descompressão (kN·m). */
export interface ServicoPlaca { Mdesc?: number; Mparcial?: number; Mlimitada?: number; Mcompleta?: number }

/**
 * Ficha de uma placa (K1.9.62–K1.9.67): código, geometria, apoio, peso e resistências. `altura` é a altura total (placa + capa).
 * `volume` = concreto moldado no local por m² (capa e juntas; padrão: a capa). Concreto e aço são só informativos.
 */
export interface PlacaAlveolar {
  id: string;
  descricao?: string;
  altura: number; capa: number;
  /** Largura padrão da placa e a mínima da placa cortada longitudinalmente (m). */
  largura: number; larguraMin: number;
  /** Profundidade de apoio mínima e máxima (m): acima da máxima, a placa é chanfrada; abaixo da mínima, o apoio é insuficiente. */
  apoioMin: number; apoioMax: number;
  /** Peso da placa (kN/m²), sem o concreto moldado no local. */
  pesoM2: number;
  volume?: number;
  concreto?: string; aco?: string;
  /** Positivo (flexão positiva da seção composta): Mu, Mfis, rigidez total e fissurada. */
  positivo?: { Mu: number; Mfis?: number; EI?: number; EIfis?: number };
  /** Cortante resistente na flexão positiva (kN, por metro) e, com o momento de cálculo no apoio abaixo do de descompressão, o da seção descomprimida (K1.9.69). */
  VRd?: number; VRdDesc?: number;
  servico?: ServicoPlaca;
  negativos?: NegativoPlaca[];
  /** Espessura do banzo inferior (m) e soma das almas por metro (m/m): a seção do negativo (compressão embaixo) sem linha da ficha. */
  hfInf?: number; bwAlma?: number;
}

export interface FichaAlveolar {
  id: string; nome: string; fabricante?: string; referencia?: string;
  /** `fabricante` = somente leitura; `usuario` = editável. */
  origem: OrigemFichaAlveolar;
  base?: BaseResistencia;
  placas: PlacaAlveolar[];
  ficticio?: boolean;
  nota?: string;
}

/** Biblioteca das fichas alveolares da obra dentro de `b.tiposLaje` e as tabelas normativas (N3). */
export type FonteAlveolares = FonteLajes & { tiposLaje?: { alveolares?: FichaAlveolar[] } };

// ---------------------------------------------------------------- catálogo (tabela N3) e exemplos

const nOuU = (x: unknown): number | undefined => (typeof x === 'number' && Number.isFinite(x) ? x : undefined);
const nOuZero = (x: unknown): number | undefined => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? x : undefined);

/** Negativos da célula de lista da tabela: grupos de 7 números [φ, s, Mu, Mfis, EI, EIfis, VRd] (0 = sem dado). */
export function negativosDaLista(l: unknown): NegativoPlaca[] {
  if (!Array.isArray(l)) return [];
  const out: NegativoPlaca[] = [];
  for (let i = 0; i + 6 < l.length; i += 7) {
    const [phi, s, Mu, Mfis, EI, EIfis, VRd] = l.slice(i, i + 7) as number[];
    out.push({ phi, s, Mu, ...(nOuZero(Mfis) ? { Mfis } : {}), ...(nOuZero(EI) ? { EI } : {}), ...(nOuZero(EIfis) ? { EIfis } : {}), ...(nOuZero(VRd) ? { VRd } : {}) });
  }
  return out;
}
/** Inverso de `negativosDaLista` (para gravar a ficha na tabela). */
export const negativosParaLista = (n: NegativoPlaca[] = []): number[] => n.flatMap((x) => [x.phi, x.s, x.Mu, x.Mfis ?? 0, x.EI ?? 0, x.EIfis ?? 0, x.VRd ?? 0]);

/** Fichas do catálogo (biblioteca de normas, `lajes.alveolares`): as linhas com a mesma "ficha" formam a tabela de placas. */
export function fichasAlveolaresCatalogo(f?: FonteNormas): FichaAlveolar[] {
  const out = new Map<string, FichaAlveolar>();
  for (const l of tabelaNorma(f, 'lajes.alveolares')) {
    const fid = String(l.ficha ?? 'cat:alveolar'), base: BaseResistencia = l.base === 'placa' ? 'placa' : 'metro';
    let fi = out.get(fid);
    if (!fi) { fi = { id: fid, nome: String(l.fichaNome ?? fid), ...(l.fabricante ? { fabricante: String(l.fabricante) } : {}), origem: 'fabricante', base, placas: [], nota: 'Catálogo da biblioteca de normas (a confirmar com o fabricante).' }; out.set(fid, fi); }
    const sv: ServicoPlaca = { ...(nOuU(l.Mdesc) ? { Mdesc: l.Mdesc as number } : {}), ...(nOuU(l.Mparcial) ? { Mparcial: l.Mparcial as number } : {}), ...(nOuU(l.Mlimitada) ? { Mlimitada: l.Mlimitada as number } : {}), ...(nOuU(l.Mcompleta) ? { Mcompleta: l.Mcompleta as number } : {}) };
    const neg = negativosDaLista(l.negativos);
    fi.placas.push({
      id: String(l.id), ...(l.descricao ? { descricao: String(l.descricao) } : {}),
      altura: l.altura as number, capa: l.capa as number, largura: l.largura as number, larguraMin: l.larguraMin as number, apoioMin: l.apoioMin as number, apoioMax: l.apoioMax as number, pesoM2: l.pesoM2 as number,
      ...(nOuU(l.volume) ? { volume: l.volume as number } : {}),
      ...(nOuU(l.Mu) ? { positivo: { Mu: l.Mu as number, ...(nOuU(l.Mfis) ? { Mfis: l.Mfis as number } : {}), ...(nOuU(l.EI) ? { EI: l.EI as number } : {}), ...(nOuU(l.EIfis) ? { EIfis: l.EIfis as number } : {}) } } : {}),
      ...(nOuU(l.VRd) ? { VRd: l.VRd as number } : {}), ...(nOuU(l.VRdDesc) ? { VRdDesc: l.VRdDesc as number } : {}), ...(Object.keys(sv).length ? { servico: sv } : {}), ...(neg.length ? { negativos: neg } : {}),
    });
  }
  return [...out.values()];
}

/**
 * Fichas FICTÍCIAS (testes e demonstração): números arbitrários, coerentes entre si, SEM relação com produto de fabricante.
 * Resistências por metro de largura. Quatro placas: três de 25 cm (20 + 5) com momentos últimos crescentes e uma de 30 cm.
 */
export const FICHAS_ALVEOLAR_EXEMPLO: FichaAlveolar[] = (() => {
  const neg = (VRd: number): NegativoPlaca[] => [
    { phi: 8, s: 0.2, Mu: 14, Mfis: 8, EI: 15000, EIfis: 6000, VRd },
    { phi: 10, s: 0.2, Mu: 22, Mfis: 8, EI: 15000, EIfis: 6500, VRd: VRd + 10 },
    { phi: 12.5, s: 0.2, Mu: 34, Mfis: 8, EI: 15000, EIfis: 7000, VRd: VRd + 20 },
    { phi: 16, s: 0.2, Mu: 52, Mfis: 8, EI: 15000, EIfis: 7500, VRd: VRd + 30 },
  ];
  const base = { capa: 0.05, largura: 1.2, larguraMin: 0.3, apoioMin: 0.07, apoioMax: 0.15, concreto: 'C45 (informativo)', aco: 'CP-190 (informativo)' };
  return [{
    id: 'ex:alveolar', nome: 'Alveolar exemplo (fictícia)', fabricante: 'Fictício', origem: 'fabricante', base: 'metro', ficticio: true, nota: 'Dados fictícios para teste e demonstração.',
    placas: [
      { ...base, id: 'A25-1', descricao: '20 + 5 cm, protensão baixa', altura: 0.25, pesoM2: 2.8, positivo: { Mu: 40, Mfis: 28, EI: 20000, EIfis: 9000 }, VRd: 70, VRdDesc: 90, servico: { Mdesc: 26, Mparcial: 36, Mlimitada: 30, Mcompleta: 28 }, negativos: neg(60), hfInf: 0.035, bwAlma: 0.4 },
      { ...base, id: 'A25-2', descricao: '20 + 5 cm, protensão média', altura: 0.25, pesoM2: 2.8, positivo: { Mu: 55, Mfis: 36, EI: 20000, EIfis: 10000 }, VRd: 85, VRdDesc: 105, servico: { Mdesc: 34, Mparcial: 48, Mlimitada: 40, Mcompleta: 36 }, negativos: neg(70), hfInf: 0.035, bwAlma: 0.4 },
      { ...base, id: 'A25-3', descricao: '20 + 5 cm, protensão alta', altura: 0.25, pesoM2: 2.8, positivo: { Mu: 75, Mfis: 46, EI: 20000, EIfis: 11000 }, VRd: 100, VRdDesc: 125, servico: { Mdesc: 44, Mparcial: 66, Mlimitada: 54, Mcompleta: 46 }, negativos: neg(80), hfInf: 0.035, bwAlma: 0.4 },
      { ...base, id: 'A30-1', descricao: '25 + 5 cm', altura: 0.3, pesoM2: 3.4, positivo: { Mu: 95, Mfis: 60, EI: 36000, EIfis: 17000 }, VRd: 120, VRdDesc: 150, servico: { Mdesc: 56, Mparcial: 84, Mlimitada: 70, Mcompleta: 60 }, negativos: neg(95), hfInf: 0.04, bwAlma: 0.4 },
    ],
  }];
})();

export type FonteFichaAlveolar = 'obra' | 'catalogo' | 'exemplo';
/** Todas as fichas ao alcance, com a fonte: as da obra primeiro, depois o catálogo da biblioteca de normas e os exemplos. */
export function fichasAlveolaresDisponiveis(f?: FonteAlveolares): { ficha: FichaAlveolar; fonte: FonteFichaAlveolar }[] {
  const obra = (f?.tiposLaje?.alveolares ?? []).map((ficha) => ({ ficha, fonte: 'obra' as const }));
  const ids = new Set(obra.map((x) => x.ficha.id));
  return [...obra, ...[...fichasAlveolaresCatalogo(f).map((ficha) => ({ ficha, fonte: 'catalogo' as const })), ...FICHAS_ALVEOLAR_EXEMPLO.map((ficha) => ({ ficha, fonte: 'exemplo' as const }))].filter((x) => !ids.has(x.ficha.id))];
}
export const fichaAlveolarPor = (f: FonteAlveolares | undefined, id: string): FichaAlveolar | undefined => fichasAlveolaresDisponiveis(f).find((x) => x.ficha.id === id)?.ficha;
export const placaPor = (ficha: FichaAlveolar | undefined, id: string): PlacaAlveolar | undefined => ficha?.placas.find((p) => p.id === id);

// ---------------------------------------------------------------- resistências por metro, geometria e peso

/** Resistências da placa por metro de largura (as fichas "por placa" são divididas pela largura da placa). */
export interface ResistenciasMetro {
  Mu?: number; Mfis?: number; EI?: number; EIfis?: number; VRd?: number; VRdDesc?: number; servico?: ServicoPlaca; negativos: NegativoPlaca[];
}
export function resistenciasPorMetro(ficha: FichaAlveolar, p: PlacaAlveolar): ResistenciasMetro {
  const k = ficha.base === 'placa' && p.largura > 0 ? 1 / p.largura : 1, d = (x?: number) => (x === undefined ? undefined : x * k);
  const sv = p.servico, o = <T extends object>(x: T) => x;
  return o({
    ...(p.positivo ? { Mu: p.positivo.Mu * k, ...(p.positivo.Mfis !== undefined ? { Mfis: d(p.positivo.Mfis) } : {}), ...(p.positivo.EI !== undefined ? { EI: d(p.positivo.EI) } : {}), ...(p.positivo.EIfis !== undefined ? { EIfis: d(p.positivo.EIfis) } : {}) } : {}),
    ...(p.VRd !== undefined ? { VRd: d(p.VRd) } : {}), ...(p.VRdDesc !== undefined ? { VRdDesc: d(p.VRdDesc) } : {}),
    ...(sv ? { servico: { ...(sv.Mdesc !== undefined ? { Mdesc: d(sv.Mdesc) } : {}), ...(sv.Mparcial !== undefined ? { Mparcial: d(sv.Mparcial) } : {}), ...(sv.Mlimitada !== undefined ? { Mlimitada: d(sv.Mlimitada) } : {}), ...(sv.Mcompleta !== undefined ? { Mcompleta: d(sv.Mcompleta) } : {}) } } : {}),
    negativos: (p.negativos ?? []).map((n) => ({ ...n, Mu: n.Mu * k, ...(n.Mfis !== undefined ? { Mfis: n.Mfis * k } : {}), ...(n.EI !== undefined ? { EI: n.EI * k } : {}), ...(n.EIfis !== undefined ? { EIfis: n.EIfis * k } : {}), ...(n.VRd !== undefined ? { VRd: n.VRd * k } : {}) })),
  }) as ResistenciasMetro;
}

export interface GeometriaAlveolar {
  ficha: FichaAlveolar; placa: PlacaAlveolar;
  /** Altura total (m), capa (m), largura padrão da placa (m). */
  h: number; capa: number; largura: number;
  /** Peso da placa, volume de concreto moldado no local (m³/m²) e peso próprio total (kN/m²) = placa + γc × volume. */
  ppPlaca: number; volume: number; pp: number;
  /** Espessura equivalente de concreto (m) = pp / γc, para volumes de concreto dos quantitativos. */
  espessuraConcreto: number;
  resist: ResistenciasMetro;
  /** Rigidez total por metro (kN·m²/m) da ficha; sem ela, a seção maciça de altura h (contra a segurança na flecha). */
  EI: number; EIdaFicha: boolean;
  descricao: string;
  /** Ficha ou placa inexistente: usa-se o gabarito do catálogo para não parar a análise. */
  ausente?: string;
}

const GABARITO: PlacaAlveolar = { id: 'GEN-20', altura: 0.2, capa: 0.05, largura: 1.2, larguraMin: 0.3, apoioMin: 0.07, apoioMax: 0.15, pesoM2: 2.0 };
const cm = (x: number) => Math.round(x * 100);

/** Geometria, peso e resistências por metro da placa do tipo alveolar. Ficha ou placa ausente: gabarito do catálogo, com `ausente`. */
export function geometriaAlveolar(f: FonteAlveolares | undefined, t: TipoAlveolar): GeometriaAlveolar {
  const ficha0 = fichaAlveolarPor(f, t.ficha), placa0 = placaPor(ficha0, t.placa);
  const ausente = !ficha0 ? `ficha "${t.ficha}" não existe` : !placa0 ? `placa "${t.placa}" não existe na ficha "${ficha0.nome}"` : undefined;
  const ficha = ficha0 ?? fichasAlveolaresCatalogo(f)[0] ?? { id: 'gabarito', nome: 'Gabarito', origem: 'fabricante' as const, placas: [GABARITO] };
  const placa = placa0 ?? ficha.placas[0] ?? GABARITO;
  const volume = placa.volume ?? placa.capa, pp = placa.pesoM2 + GAMA_CONCRETO * volume, resist = resistenciasPorMetro(ficha, placa);
  const EIdaFicha = resist.EI !== undefined;
  return {
    ficha, placa, h: placa.altura, capa: placa.capa, largura: placa.largura, ppPlaca: placa.pesoM2, volume, pp, espessuraConcreto: pp / GAMA_CONCRETO, resist,
    EI: resist.EI ?? (Math.pow(placa.altura, 3) / 12) * 30e6, EIdaFicha, descricao: `alveolar ${placa.id} h=${cm(placa.altura)}`, ...(ausente ? { ausente } : {}),
  };
}
export const rotuloAlveolar = (f: FonteAlveolares | undefined, t: TipoAlveolar): string => { const g = geometriaAlveolar(f, t); return `AL ${g.placa.id} (h=${cm(g.h)})`; };
export const ehAlveolar = (t: TipoLaje): t is TipoAlveolar => t.tipo === 'alveolar';

/**
 * Cortante resistente na flexão positiva (K1.9.69): o da seção descomprimida (`VRdDesc`) quando o momento de cálculo no apoio não
 * passa do momento de descompressão `Mdesc`; senão o `VRd`. Sem `VRdDesc` ou sem `Mdesc`, sempre o `VRd`.
 */
export const vrdPositivo = (r: Pick<ResistenciasMetro, 'VRd' | 'VRdDesc' | 'servico'>, Mapoio: number): number | undefined =>
  r.VRd !== undefined && r.VRdDesc !== undefined && r.servico?.Mdesc !== undefined && Mapoio <= r.servico.Mdesc + 1e-9 ? r.VRdDesc : r.VRd;

// ---------------------------------------------------------------- validação lógica

export interface ValidacaoFichaAlveolar { erros: string[]; avisos: string[] }
const pos = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0;

/**
 * Controle lógico da ficha (o programa não confere o dado do fabricante): geometria positiva, capa menor que a altura, largura
 * mínima ≤ padrão, apoio mínimo ≤ máximo, Mu > Mfis, EI fissurado ≤ total, momentos de serviço crescentes do nível completo ao
 * parcial e abaixo de Mu, negativos com Mu > Mfis e sem linha repetida, códigos únicos. Dados ausentes são avisos (a verificação
 * correspondente não é feita).
 */
export function validarFichaAlveolar(ficha: FichaAlveolar): ValidacaoFichaAlveolar {
  const erros: string[] = [], avisos: string[] = [];
  if (!ficha.id?.trim()) erros.push('Ficha sem identificador.');
  if (!ficha.nome?.trim()) erros.push('Ficha sem nome.');
  if (ficha.base !== undefined && ficha.base !== 'metro' && ficha.base !== 'placa') erros.push('Base das resistências inválida (metro ou placa).');
  if (!ficha.placas?.length) erros.push('A ficha precisa de ao menos uma placa.');
  const ids = new Set<string>();
  for (const p of ficha.placas ?? []) {
    const n = `Placa ${p.id || '(sem código)'}`;
    if (!p.id?.trim()) erros.push('Placa sem código.');
    else if (ids.has(p.id)) erros.push(`${n}: código repetido.`);
    ids.add(p.id);
    if (![p.altura, p.capa, p.largura, p.larguraMin, p.apoioMin, p.apoioMax, p.pesoM2].every(pos)) { erros.push(`${n}: altura, capa, largura, largura mínima, apoio mínimo e máximo e peso devem ser positivos.`); continue; }
    if (p.capa >= p.altura) erros.push(`${n}: a capa deve ser menor que a altura total.`);
    if (p.larguraMin > p.largura) erros.push(`${n}: largura mínima maior que a largura da placa.`);
    if (p.apoioMin > p.apoioMax) erros.push(`${n}: apoio mínimo maior que o máximo.`);
    if (p.volume !== undefined && !pos(p.volume)) erros.push(`${n}: volume de preenchimento inválido.`);
    const q = p.positivo;
    if (q) {
      if (!pos(q.Mu)) erros.push(`${n}: Mu positivo deve ser positivo.`);
      if (q.Mfis !== undefined && (!pos(q.Mfis) || (pos(q.Mu) && q.Mu <= q.Mfis))) erros.push(`${n}: momento positivo Mu deve ser maior que Mfis.`);
      if (q.EI !== undefined && !pos(q.EI)) erros.push(`${n}: EI positivo inválido.`);
      if (q.EIfis !== undefined && (!pos(q.EIfis) || (pos(q.EI) && q.EIfis > q.EI * (1 + 1e-9)))) erros.push(`${n}: EI fissurado inválido ou maior que o total.`);
      if (!q.EI) avisos.push(`${n}: sem EI total (a grelha usa a seção maciça, contra a segurança na flecha).`);
      if (q.EIfis === undefined) avisos.push(`${n}: sem EI fissurado (a flecha usa a rigidez total).`);
    } else avisos.push(`${n}: sem momento positivo (Mu): a placa não é verificada à flexão.`);
    if (p.VRd !== undefined && !pos(p.VRd)) erros.push(`${n}: VRd deve ser positivo.`);
    if (p.VRdDesc !== undefined && (!pos(p.VRdDesc) || (pos(p.VRd) && p.VRdDesc < p.VRd))) erros.push(`${n}: VRd da seção descomprimida inválido ou menor que o VRd.`);
    if (p.VRd === undefined) avisos.push(`${n}: sem cortante resistente (a verificação do cortante não é feita).`);
    const sv = p.servico;
    if (sv) {
      const niv = [sv.Mcompleta, sv.Mlimitada, sv.Mparcial];
      if (niv.some((x) => x !== undefined && !pos(x)) || (sv.Mdesc !== undefined && !pos(sv.Mdesc))) erros.push(`${n}: momentos de serviço e de descompressão devem ser positivos.`);
      const ok = niv.filter((x): x is number => x !== undefined);
      if (ok.some((x, i) => i > 0 && x < ok[i - 1] - 1e-9)) erros.push(`${n}: momentos de serviço devem crescer da protensão completa para a parcial.`);
      if (q && pos(q.Mu) && ok.some((x) => x > q.Mu + 1e-9)) erros.push(`${n}: momento de serviço maior que Mu.`);
    } else avisos.push(`${n}: sem momentos de serviço por nível de protensão (a verificação do ambiente não é feita).`);
    const vistos = new Set<string>();
    for (const g of p.negativos ?? []) {
      if (!pos(g.phi) || !pos(g.s) || !pos(g.Mu)) { erros.push(`${n}: negativo com φ, espaçamento e Mu positivos.`); continue; }
      const k = `${g.phi}|${g.s}`;
      if (vistos.has(k)) erros.push(`${n}: negativo φ${g.phi} c/${cm(g.s)} repetido.`);
      vistos.add(k);
      if (g.Mfis !== undefined && (!pos(g.Mfis) || g.Mu <= g.Mfis)) erros.push(`${n}: negativo φ${g.phi} c/${cm(g.s)}: Mu deve ser maior que Mfis.`);
      if (g.EIfis !== undefined && g.EI !== undefined && g.EIfis > g.EI * (1 + 1e-9)) erros.push(`${n}: negativo φ${g.phi} c/${cm(g.s)}: EI fissurado maior que o total.`);
      if (g.VRd !== undefined && !pos(g.VRd)) erros.push(`${n}: negativo φ${g.phi} c/${cm(g.s)}: VRd inválido.`);
    }
    if (!(p.negativos?.length)) avisos.push(`${n}: sem linhas de negativo na capa (calculado pela seção).`);
  }
  return { erros, avisos };
}

/** Erros do tipo alveolar (existência da ficha e da placa; coerência lógica da ficha), com código e mensagem. */
export function errosTipoAlveolar(f: FonteAlveolares | undefined, t: TipoAlveolar): { codigo: string; mensagem: string }[] {
  const e = (codigo: string, mensagem: string) => [{ codigo, mensagem }];
  const fi = fichaAlveolarPor(f, t.ficha);
  if (!fi) return e('FICHA_ALVEOLAR_INEXISTENTE', `Ficha alveolar "${t.ficha}" não existe (biblioteca da obra, tabela "Placas alveolares" da biblioteca de normas ou exemplo).`);
  if (!placaPor(fi, t.placa)) return e('FICHA_ALVEOLAR_INEXISTENTE', `A ficha "${fi.nome}" não tem a placa "${t.placa}".`);
  const v = validarFichaAlveolar(fi);
  return v.erros.length ? e('FICHA_ALVEOLAR_INCOERENTE', `Ficha "${fi.nome}" incoerente: ${v.erros.join(' ')}`) : [];
}

// ---------------------------------------------------------------- processo construtivo (K1.3.20, K1.9.77-K1.9.81)

export type ProcessoAlveolar = 0 | 1 | 2;
export const PROCESSOS_ALVEOLAR: { v: ProcessoAlveolar; rotulo: string }[] = [
  { v: 0, rotulo: 'Com escoramento (cálculo contínuo sob a carga total)' },
  { v: 1, rotulo: 'Sem escoramento, engaste aproximado (1 − peso próprio / carga total)' },
  { v: 2, rotulo: 'Sem escoramento, em duas fases (isostática sob o peso próprio + contínua sob o resto)' },
];
export const processoDoPano = (l: Pick<Laje, 'alveolar'>, op: Pick<OpcoesCalculo, 'alveolarProcesso'>): ProcessoAlveolar => (l.alveolar?.processo ?? Math.max(0, Math.min(2, Math.round(op.alveolarProcesso)))) as ProcessoAlveolar;

const centroide = (c: P[]): P => {
  let A = 0, cx = 0, cy = 0;
  for (let i = 0; i < c.length; i++) { const a = c[i], z = c[(i + 1) % c.length], w = a[0] * z[1] - z[0] * a[1]; A += w; cx += (a[0] + z[0]) * w; cy += (a[1] + z[1]) * w; }
  return A ? [cx / (3 * A), cy / (3 * A)] : pontoInterno(c);
};

/**
 * Cargas características de área do pano (kN/m²) no ponto interno do contorno: peso próprio da laje (placa + concreto moldado),
 * outras permanentes (revestimento do grupo e cargas de área lançadas como G), variável (uso do grupo e cargas de área Q e
 * dos demais casos). Usada pelo engaste aproximado do processo 1 e pela fase 1 do processo 2.
 */
export function cargasDoPano(b: BuildingModel, l: Laje, g: Pick<GeometriaAlveolar, 'pp'>): { pp: number; permanentes: number; variaveis: number; total: number } {
  const grupo = b.grupos.find((x) => x.id === l.grupo), c = centroide(l.contorno as P[]), c2 = dentroPoligono(c, l.contorno as P[]) ? c : pontoInterno(l.contorno as P[]);
  let perm = grupo?.gRev ?? 0, vari = grupo?.q ?? 0;
  for (const x of b.cargas) if (x.grupo === l.grupo && x.tipo === 'area' && dentroPoligono(c2, x.pontos as P[])) { if (x.caso === 'G') perm += x.valor; else vari += x.valor; }
  return { pp: g.pp, permanentes: perm, variaveis: vari, total: g.pp + perm + vari };
}
/** Fator do engaste aproximado (processo 1): 1 − peso próprio / carga total, entre 0 e 1 (exemplo: 4,0 e 10,0 kN/m² dão 0,6). */
export const fatorEngasteAproximado = (pp: number, total: number): number => (total > 1e-9 ? Math.max(0, Math.min(1, 1 - pp / total)) : 1);

/** Aresta do contorno de `l` onde está o ponto `p` (índice k de k → k+1), ou -1. */
export function arestaDoPonto(l: Pick<Laje, 'contorno'>, p: P, tol = 0.01): number {
  const c = l.contorno as P[];
  let k = -1, dm = tol;
  for (let i = 0; i < c.length; i++) { const d = distSeg(p, c[i], c[(i + 1) % c.length]); if (d < dm) { dm = d; k = i; } }
  return k;
}
function distSeg(p: P, a: P, z: P) {
  const dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy, u = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
  return Math.hypot(a[0] + u * dx - p[0], a[1] + u * dy - p[1]);
}
/** O ponto da borda está também na borda de outro pano do grupo (as placas continuam sobre o apoio: negativo na capa)? */
export const bordaCompartilhada = (l: Laje, p: P, lajes: Laje[]): boolean => lajes.some((l2) => l2 !== l && l2.grupo === l.grupo && arestaDoPonto(l2, p) >= 0);

/**
 * Engaste da borda de um pano alveolar na grelha (coeficiente 0 a 1 da rotação da ponta da barra): `a0` é o coeficiente que a
 * análise já calculou (aresta × viga × desnível). Sem engaste informado na aresta, a placa é APOIADA (0) em borda livre ou com
 * `alveolarContinuidade` = 0, e contínua (a0) em borda compartilhada com outro pano; o processo 1 multiplica pelo fator do engaste
 * aproximado `fProc`. Engaste informado (`engasteBordas`) vale em qualquer borda.
 */
export function engasteBordaAlveolar(l: Laje, p: P, a0: number, lajes: Laje[], continuidade: boolean, fProc: number): number {
  const k = arestaDoPonto(l, p), informado = k >= 0 && l.engasteBordas?.[k] !== undefined;
  const base = informado ? a0 : continuidade && bordaCompartilhada(l, p, lajes) ? a0 : 0;
  return base * fProc;
}

// ---------------------------------------------------------------- paginação das placas

export interface PlacaPaginada {
  /** Numeração no pano (0 = a primeira, a partir da borda do ponto de inserção). */
  indice: number;
  /** Faixa transversal ocupada (m, a mesma origem de `FaixaVigota.t`) e largura usada (m). */
  t0: number; t1: number; largura: number;
  /** Placa de borda cortada longitudinalmente (largura menor que a padrão). */
  cortada: boolean;
  /** Pontas do eixo da placa (eixo a eixo dos apoios) e comprimento entre eixos (m). */
  a: P; z: P; L: number;
  /** Maior corda da faixa (m) e ângulo (graus) das linhas de apoio com a perpendicular ao eixo da placa; oblíqua se > 0,5°. */
  Lmax: number; angulo: number; obliqua: boolean;
}

export interface Paginacao { placas: PlacaPaginada[]; avisos: string[]; B: number; u: P }

/** Cordas do contorno na direção `u` na posição transversal `t` (m): [início, fim] ao longo de `u`, ou null. */
export function cordaEm(contorno: P[], u: P, t: number): [number, number] | null {
  const v: P = [-u[1], u[0]], xs: number[] = [];
  for (let i = 0; i < contorno.length; i++) {
    const a = contorno[i], z = contorno[(i + 1) % contorno.length], ta = a[0] * v[0] + a[1] * v[1], tz = z[0] * v[0] + z[1] * v[1];
    if ((ta - t) * (tz - t) > 0 || Math.abs(tz - ta) < 1e-12) continue;
    const s = (t - ta) / (tz - ta), x = (a[0] + s * (z[0] - a[0])) * u[0] + (a[1] + s * (z[1] - a[1])) * u[1];
    xs.push(x);
  }
  return xs.length >= 2 ? [Math.min(...xs), Math.max(...xs)] : null;
}

/**
 * Paginação das placas do pano (K1.9.62, K1.11.15): a faixa transversal do contorno é dividida em placas da largura padrão a
 * partir da borda do ponto de inserção; o resto vira placa cortada, desde que tenha ao menos a largura mínima (senão, a última
 * placa inteira e o resto se dividem em duas iguais, ambas entre a mínima e a padrão). Faixa menor que a mínima: uma placa só,
 * com aviso. O comprimento entre eixos vem da corda no eixo da placa; a oblíqua (apoio inclinado) usa a maior corda.
 */
export function paginarPlacas(l: Pick<Laje, 'contorno' | 'direcao' | 'insercao'>, largura: number, larguraMin: number): Paginacao {
  const ang = (((l.direcao ?? 0) % 180) * Math.PI) / 180, u: P = [Math.cos(ang), Math.sin(ang)], v: P = [-u[1], u[0]];
  const c = l.contorno as P[], ts = c.map((p) => p[0] * v[0] + p[1] * v[1]);
  const tmin = Math.min(...ts), tmax = Math.max(...ts), B = tmax - tmin, avisos: string[] = [];
  const iv = l.insercao !== undefined && c[l.insercao] ? ts[l.insercao] : tmin, desce = Math.abs(iv - tmax) < Math.abs(iv - tmin);
  const n = Math.floor(B / largura + 1e-6), R = B - n * largura;
  let larguras: number[];
  if (n === 0) { larguras = [B]; if (B < larguraMin - 1e-6) avisos.push(`faixa de ${(B * 100).toFixed(0)} cm menor que a largura mínima da placa cortada (${(larguraMin * 100).toFixed(0)} cm)`); }
  else if (R < 0.005) larguras = Array(n).fill(largura);
  else if (R >= larguraMin - 1e-9) larguras = [...Array(n).fill(largura), R];
  else { larguras = [...Array(n - 1).fill(largura), (largura + R) / 2, (largura + R) / 2]; }
  const placas: PlacaPaginada[] = [];
  let acc = 0;
  larguras.forEach((w, i) => {
    const t0 = desce ? tmax - acc - w : tmin + acc, t1 = t0 + w, tc = (t0 + t1) / 2;
    acc += w;
    const eps = Math.min(0.02, w / 4), cs = [tc, t0 + eps, t1 - eps].map((t) => cordaEm(c, u, t)), cc = cs[0] ?? cs.find((x) => x) ?? null;
    if (!cc) return;
    const Lc = cc[1] - cc[0], Lmax = Math.max(...cs.filter((x): x is [number, number] => !!x).map((x) => x[1] - x[0]));
    const [c1, c2] = [cs[1], cs[2]];
    const dx = c1 && c2 ? (c2[0] + c2[1]) / 2 - (c1[0] + c1[1]) / 2 : 0, angulo = (Math.atan2(dx, Math.max(1e-9, w - 2 * eps)) * 180) / Math.PI;
    const pt = (x: number): P => [x * u[0] + tc * v[0], x * u[1] + tc * v[1]];
    placas.push({ indice: i, t0, t1, largura: w, cortada: w < largura - 0.005, a: pt(cc[0]), z: pt(cc[1]), L: Lc, Lmax, angulo, obliqua: Math.abs(angulo) > 0.5 });
  });
  placas.forEach((p, i) => (p.indice = i));
  return { placas, avisos, B, u };
}

/** Apoio lateral das placas de borda (K1.9.64): a viga paralela às placas recebe a placa por sobreposição; o disponível é a largura da viga menos 2 cm. */
export interface ApoioLateral { viga: number; disponivel: number | null; ok: boolean }
export const apoioLateralDaViga = (p: PlacaAlveolar, bViga: number): ApoioLateral => (bViga > 0 ? { viga: bViga, disponivel: bViga - 0.02, ok: bViga - 0.02 >= p.apoioMin - 1e-9 } : { viga: 0, disponivel: null, ok: true });

/** Largura (m) da viga do grupo cujo eixo passa pelo ponto, ou 0 (sem viga). */
export function larguraDaViga(b: BuildingModel, grupo: string, p: P): number {
  let melhor = 0, dm = 0.03;
  for (const v of b.vigas) {
    if (v.grupo !== grupo) continue;
    const e = geometriaViga(v).eixo;
    for (let i = 0; i + 1 < e.length; i++) { const d = distSeg(p, [e[i][0], e[i][1]], [e[i + 1][0], e[i + 1][1]]); if (d < dm) { dm = d; melhor = v.secao.b; } }
  }
  return melhor;
}

export interface ApoioPlaca {
  /** Largura da viga (m; 0 = sem viga encontrada), apoio disponível (m; `null` sem viga), apoio adotado (m) e situação. */
  viga: number; disponivel: number | null; adotado: number;
  /** insuficiente = disponível < mínimo; chanfrada = placa oblíqua cujo canto agudo passa do apoio máximo (corte do canto). */
  situacao: 'ok' | 'insuficiente' | 'chanfrada';
}
/** Junta entre placas sobre viga de apoio intermediário (m) [a confirmar com o fabricante]. */
export const JUNTA_APOIO = 0.02;
/**
 * Apoio da placa numa ponta: metade da viga menos a junta sobre apoio compartilhado; a largura toda menos 2 cm de folga na viga
 * de borda. O adotado é o disponível limitado ao máximo da ficha. `extraObliqua` = acréscimo de apoio no canto mais fundo da placa
 * oblíqua (largura × tg do ângulo): acima do máximo, a placa é chanfrada.
 */
export function apoioDaPonta(p: PlacaAlveolar, bViga: number, compartilhado: boolean, extraObliqua = 0): ApoioPlaca {
  if (!(bViga > 0)) return { viga: 0, disponivel: null, adotado: p.apoioMin, situacao: 'ok' };
  const disp = compartilhado ? bViga / 2 - JUNTA_APOIO / 2 : bViga - 0.02;
  const adotado = Math.max(0, Math.min(p.apoioMax, disp));
  return { viga: bViga, disponivel: disp, adotado, situacao: disp < p.apoioMin - 1e-9 ? 'insuficiente' : adotado + Math.abs(extraObliqua) > p.apoioMax + 1e-9 ? 'chanfrada' : 'ok' };
}
/** Comprimento da peça (m, arredondado para cima ao cm): vão livre entre as faces das vigas mais os dois apoios. */
export const comprimentoDaPeca = (Lmax: number, bIni: number, bFim: number, aIni: number, aFim: number): number => Math.ceil((Lmax - bIni / 2 - bFim / 2 + aIni + aFim) * 100 - 1e-9) / 100;

// ---------------------------------------------------------------- exportar / importar

export const FORMATO_FICHAS_ALVEOLARES = 'statikos-fichas-alveolares';
export interface ArquivoFichasAlveolares { formato: typeof FORMATO_FICHAS_ALVEOLARES; versao: 1; fichas: FichaAlveolar[] }
const copia = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const ehObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

/** JSON versionado das fichas alveolares da obra (todas, ou os ids indicados; catálogo e exemplo são resolvidos por id). */
export function exportarFichasAlveolares(b: FonteAlveolares | undefined, ids?: string[]): string {
  const fichas = fichasAlveolaresDisponiveis(b).map((x) => x.ficha).filter((x) => (ids ? ids.includes(x.id) : b?.tiposLaje?.alveolares?.some((y) => y.id === x.id)));
  const out: ArquivoFichasAlveolares = { formato: FORMATO_FICHAS_ALVEOLARES, versao: 1, fichas: copia(fichas) };
  return JSON.stringify(out, null, 2);
}
/** Lê o JSON exportado; só a estrutura é conferida aqui (a coerência lógica é `validarFichaAlveolar`). */
export function importarFichasAlveolares(texto: string): { ok: true; fichas: FichaAlveolar[] } | { ok: false; erros: string[] } {
  let j: unknown;
  try { j = JSON.parse(texto); } catch { return { ok: false, erros: ['JSON inválido'] }; }
  if (!ehObj(j) || j.formato !== FORMATO_FICHAS_ALVEOLARES) return { ok: false, erros: [`Arquivo não é uma biblioteca de fichas alveolares do Statikos (formato "${FORMATO_FICHAS_ALVEOLARES}").`] };
  const fichas = Array.isArray(j.fichas) ? j.fichas : [], erros: string[] = [];
  fichas.forEach((x, i) => { if (!ehObj(x) || typeof x.id !== 'string' || typeof x.nome !== 'string' || !Array.isArray(x.placas) || !x.placas.every(ehObj)) erros.push(`ficha ${i + 1}: estrutura inválida (id, nome e placas)`); });
  if (new Set(fichas.map((x) => (x as FichaAlveolar).id)).size !== fichas.length) erros.push('fichas com identificador repetido');
  return erros.length ? { ok: false, erros } : { ok: true, fichas: copia(fichas) as FichaAlveolar[] };
}

/** Linha do relatório de dados da obra (K1.9.62): quadro de propriedades das placas das fichas usadas pelos panos alveolares. */
export interface LinhaPlacaMemorial {
  ficha: string; fichaId: string; fabricante: string; marca: string; id: string; descricao: string; altura: number; capa: number; largura: number; larguraMin: number;
  apoioMin: number; apoioMax: number; pesoM2: number; volume: number; pp: number; Mu?: number; Mfis?: number; EI?: number; VRd?: number; negativos: number; usada: boolean; concreto?: string; aco?: string;
}
export const MARCA_FABRICANTE_ALVEOLAR = 'dado do fabricante, não verificado pelo programa';
export function placasNoMemorial(b: BuildingModel): LinhaPlacaMemorial[] {
  const usadas = new Map<string, Set<string>>();
  for (const l of b.lajes) if (l.tipo.tipo === 'alveolar') { const s = usadas.get(l.tipo.ficha) ?? new Set<string>(); s.add(l.tipo.placa); usadas.set(l.tipo.ficha, s); }
  const out: LinhaPlacaMemorial[] = [];
  for (const [fid, set] of usadas) {
    const fi = fichaAlveolarPor(b, fid);
    if (!fi) continue;
    for (const p of fi.placas) {
      const r = resistenciasPorMetro(fi, p), vol = p.volume ?? p.capa;
      out.push({
        ficha: fi.nome, fichaId: fi.id, fabricante: fi.fabricante ?? '—', marca: fi.ficticio ? 'ficha fictícia (demonstração)' : MARCA_FABRICANTE_ALVEOLAR, id: p.id, descricao: p.descricao ?? '', altura: p.altura, capa: p.capa, largura: p.largura, larguraMin: p.larguraMin,
        apoioMin: p.apoioMin, apoioMax: p.apoioMax, pesoM2: p.pesoM2, volume: vol, pp: p.pesoM2 + GAMA_CONCRETO * vol, ...(r.Mu !== undefined ? { Mu: r.Mu } : {}), ...(r.Mfis !== undefined ? { Mfis: r.Mfis } : {}), ...(r.EI !== undefined ? { EI: r.EI } : {}),
        ...(r.VRd !== undefined ? { VRd: r.VRd } : {}), negativos: r.negativos.length, usada: set.has(p.id), ...(p.concreto ? { concreto: p.concreto } : {}), ...(p.aco ? { aco: p.aco } : {}),
      });
    }
  }
  return out;
}
