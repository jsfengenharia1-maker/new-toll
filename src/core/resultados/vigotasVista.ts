// Vigotas (V5, C7.87 a C7.92, C7.187, C12.14): diagramas de M, V e T por hipótese (caso, combinação ou envoltória) e as
// vistas da planta controladas pela chave geral de exibição de esforços. Núcleo puro.
import type { AnaliseEdificio } from '../building/analitico';
import { pavimentosDoGrupo, type BuildingModel } from '../building/types';
import { faixasDaGrelha, type ResultadoVigotas } from '../building/vigotas';
import type { Hipotese } from './deformada';
import type { Envoltoria, HipoteseEsforco } from './esforcosCaso';

export type P = [number, number];

// ---------------- diagramas por hipótese ----------------

export interface DiagramaVigota {
  /** Posição transversal e largura representada (m), pontas (início e fim, m) e comprimento (m). */
  t: number; largura: number; a: P; z: P; L: number;
  /** Abscissa (m) e esforços por nervura nos nós: M máx. e mín. (kN·m; + traciona embaixo), |V| (kN). A torção da vigota é nula (registrada). */
  s: number[]; Mmax: number[]; Mmin: number[]; V: number[]; T: number[];
  /** Largura de uma nervura (intereixo, m): dividir por ela dá o valor por metro de largura. */
  intereixo: number;
}

const partes = (h: HipoteseEsforco): { fatores: Record<string, number> }[] => (h.tipo === 'envoltoria' ? (h as Envoltoria).combinacoes.map((c: Hipotese) => ({ fatores: c.fatores })) : [{ fatores: (h as Hipotese).fatores }]);

/**
 * Diagrama de cada alinhamento de vigotas de uma laje para a hipótese. Só os casos de carga vertical atuam na grelha
 * (o vento não entra). A envoltória toma os extremos entre as combinações e entre os pavimentos do grupo. Para
 * lajes de vigotas, `r` traz o intereixo; as de ficha armada, protendida e moldada passam um `ResultadoVigotas` próprio (E3b).
 */
export function diagramaVigotas(b: BuildingModel, an: AnaliseEdificio, r: Pick<ResultadoVigotas, 'laje' | 'intereixo'>, h: HipoteseEsforco): DiagramaVigota[] {
  const l = b.lajes.find((x) => x.id === r.laje);
  if (!l) return [];
  const intereixo = r.intereixo;
  const ang = ((l.direcao ?? 0) * Math.PI) / 180, u: P = [Math.cos(ang), Math.sin(ang)];
  const pavs = pavimentosDoGrupo(b, l.grupo), brutas = new Map<string, DiagramaVigota>();
  for (const g of an.grelhas) {
    if (!g.res || !pavs.some((p) => p.id === g.pavimento)) continue;
    for (const pt of partes(h)) {
      const fat = an.casos.map((c) => pt.fatores[c] ?? 0);
      for (const f of faixasDaGrelha(g, l, fat, u, intereixo)) {
        const key = `${Math.round(f.t * 1000)}|${Math.round((f.a[0] * u[0] + f.a[1] * u[1]) * 100)}`, e = brutas.get(key);
        const novo: DiagramaVigota = { t: f.t, largura: f.largura, a: f.a, z: f.z, L: f.L, s: f.s, Mmax: f.Mmax, Mmin: f.Mmin, V: f.V, T: f.s.map(() => 0), intereixo };
        if (!e) { brutas.set(key, novo); continue; }
        if (e.s.length === novo.s.length) for (let i = 0; i < novo.s.length; i++) { e.Mmax[i] = Math.max(e.Mmax[i], novo.Mmax[i]); e.Mmin[i] = Math.min(e.Mmin[i], novo.Mmin[i]); e.V[i] = Math.max(e.V[i], novo.V[i]); }
      }
    }
  }
  return [...brutas.values()].sort((x, z) => x.t - z.t);
}

// ---------------- vistas da planta (chave geral de exibição de esforços) ----------------

export type FamiliaVista = 'trelicada' | 'armada' | 'protendida' | 'moldada';
export type VistaVigota = 'momentos' | 'cortantes' | 'armaduraInferior';

/** O que a vista precisa de cada grupo de vigotas (por metro de largura, já majorado). */
export interface DadosVigota {
  familia: FamiliaVista;
  /** Momento positivo de cálculo (kN·m/m) e cortantes de cálculo nas pontas (kN/m). */
  mPos: number; v: [number, number];
  /** Treliça (armada pré-fabricada) e armadura adicional positiva (n barras, φ em mm, comprimento em m). */
  trelica?: string; adicional?: { n: number; phi: number; comprimento: number } | null;
  /** Armadura inferior (moldada no local): φ (mm) e comprimento (m); estribos φ (mm) e espaçamento (m). */
  inferior?: { phi: number; comprimento: number }; estribos?: { phi: number; s: number };
}

const fmt = (x: number, n = 2) => x.toFixed(n).replace('.', ',');

/** C7.91: a vista da armadura inferior das lajes moldadas no local não existe com a exibição de esforços ligada. */
export const vistaDisponivel = (vista: VistaVigota, esforcos: boolean) => !(vista === 'armaduraInferior' && esforcos);

/** Vistas oferecidas na camada da planta (V7b): sem texto e as três vistas; a armadura inferior sai de oferta com os esforços ligados. */
export function opcoesDeVistaVigotas(esforcos: boolean): { v: 'nenhuma' | VistaVigota; label: string; disponivel: boolean }[] {
  return [
    { v: 'nenhuma', label: 'Sem texto', disponivel: true },
    { v: 'momentos', label: esforcos ? 'Momentos' : 'Tipo de vigota', disponivel: true },
    { v: 'cortantes', label: esforcos ? 'Cortantes' : 'Treliça / estribos', disponivel: true },
    { v: 'armaduraInferior', label: 'Armadura inferior', disponivel: vistaDisponivel('armaduraInferior', esforcos) },
  ];
}

/** Legenda do que a vista escreve ao lado de cada vigota na planta (C7.88 a C7.90 e C7.92); vazia sem texto ou com vista indisponível. */
export function legendaVigotas(vista: 'nenhuma' | VistaVigota, esforcos: boolean): string {
  if (vista === 'nenhuma' || !vistaDisponivel(vista, esforcos)) return '';
  if (esforcos) return vista === 'momentos' ? 'Vigotas: momento positivo de cálculo por metro de largura (kN·m/m)' : 'Vigotas: cortante de cálculo por metro de largura, nas duas pontas (kN/m)';
  if (vista === 'armaduraInferior') return 'Vigotas moldadas: armadura inferior (diâmetro e comprimento)';
  return vista === 'momentos'
    ? 'Vigotas: tipo (protendida ou armada com armadura adicional) ou armadura inferior das moldadas'
    : 'Vigotas: treliça das armadas ou estribos das moldadas (diâmetro e espaçamento)';
}

/**
 * Texto de uma vigota na vista. Com a chave de esforços ligada: M⁺ por metro (momentos) ou V por metro (cortantes, uma
 * linha por ponta). Desligada: o tipo da vigota (protendida ou armada) ou o diâmetro e o comprimento da armadura inferior
 * (moldada), e nos cortantes a treliça (armada pré-fabricada) ou o diâmetro e o espaçamento dos estribos (moldada).
 */
export function textoVigota(d: DadosVigota, vista: VistaVigota, esforcos: boolean): string[] {
  if (!vistaDisponivel(vista, esforcos)) return [];
  if (esforcos) {
    if (vista === 'momentos') return [`M = ${fmt(d.mPos)} kN·m/m`];
    if (vista === 'cortantes') return [`V = ${fmt(d.v[0])} kN/m`, `V = ${fmt(d.v[1])} kN/m`];
    return [];
  }
  const inf = d.inferior ? `φ${fmt(d.inferior.phi, d.inferior.phi % 1 ? 1 : 0)} c=${fmt(d.inferior.comprimento)} m` : '—';
  if (vista === 'armaduraInferior') return d.familia === 'moldada' ? [inf] : [];
  if (vista === 'momentos') {
    if (d.familia === 'protendida') return ['Protendida'];
    if (d.familia === 'moldada') return [inf];
    const ad = d.adicional?.n ? ` +${d.adicional.n}φ${fmt(d.adicional.phi, d.adicional.phi % 1 ? 1 : 0)} c=${fmt(d.adicional.comprimento)} m` : '';
    return [`Armada${ad}`];
  }
  // cortantes sem esforços
  if (d.familia === 'protendida') return ['Protendida'];
  if (d.familia === 'moldada') return [d.estribos ? `φ${fmt(d.estribos.phi, d.estribos.phi % 1 ? 1 : 0)} c/${fmt(d.estribos.s * 100, 0)}` : '—'];
  return [d.trelica ?? 'Armada'];
}

/** Dados por grupo de vigotas de uma laje treliçada (armada pré-fabricada) do dimensionamento. */
export function dadosDasVigotas(r: ResultadoVigotas): DadosVigota[] {
  return r.grupos.map((g) => ({
    familia: 'trelicada' as const, mPos: g.porMetro.mPos, v: g.porMetro.v, trelica: r.trelica,
    adicional: g.positiva.barras?.n ? { n: g.positiva.barras.n, phi: g.positiva.barras.phi, comprimento: g.positiva.comprimento } : null,
  }));
}

/**
 * Dados por grupo de qualquer laje de vigotas (E5e, C7.91): treliçadas e armadas (treliça e adicional), protendidas (só a família)
 * e moldadas no local (armadura inferior e estribos do cortante).
 */
export function dadosDeResultado(r: ResultadoVigotas): DadosVigota[] {
  if (!r.familia || r.familia === 'trelicada') return dadosDasVigotas(r);
  return r.grupos.map((g) => {
    const mPos = g.porMetro.mPos, v = g.porMetro.v;
    if (r.familia === 'protendida') return { familia: 'protendida' as const, mPos, v };
    if (r.familia === 'moldada') {
      const b = g.positiva.barras, est = g.cortante.find((c) => c.estribo)?.estribo;
      return { familia: 'moldada' as const, mPos, v, ...(b?.n ? { inferior: { phi: b.phi, comprimento: g.positiva.comprimento } } : {}), ...(est ? { estribos: { phi: est.phi, s: est.s } } : {}) };
    }
    return { familia: 'armada' as const, mPos, v, trelica: r.trelica || undefined, adicional: g.positiva.barras?.n ? { n: g.positiva.barras.n, phi: g.positiva.barras.phi, comprimento: g.positiva.comprimento } : null };
  });
}

export interface RotuloVigota { /** índice da faixa (alinhamento) e do grupo de igualação */ faixa: number; grupo: number; pos: P; /** ponta do cortante (0 início, 1 fim); ausente nos momentos */ ponta?: 0 | 1; texto: string }

/**
 * Rótulos da vista na planta, um por alinhamento (momentos e armadura inferior no meio; cortantes junto a cada ponta, a
 * 15 % do comprimento). `dados` vem de `dadosDasVigotas` ou, nas fichas armadas, protendidas e moldadas (E3b), do chamador.
 */
export function rotulosDeVigotas(r: ResultadoVigotas, vista: VistaVigota, esforcos: boolean, dados: DadosVigota[] = dadosDeResultado(r)): RotuloVigota[] {
  const out: RotuloVigota[] = [];
  r.faixas.forEach((f, i) => {
    const d = dados[f.grupo];
    if (!d) return;
    const tx = textoVigota(d, vista, esforcos);
    if (!tx.length) return;
    const em = (t: number): P => [f.a[0] + (f.z[0] - f.a[0]) * t, f.a[1] + (f.z[1] - f.a[1]) * t];
    if (vista === 'cortantes' && tx.length === 2) tx.forEach((texto, k) => out.push({ faixa: i, grupo: f.grupo, pos: em(k === 0 ? 0.15 : 0.85), ponta: k as 0 | 1, texto }));
    else out.push({ faixa: i, grupo: f.grupo, pos: em(0.5), texto: tx[0] });
  });
  return out;
}
