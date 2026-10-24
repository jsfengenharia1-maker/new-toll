// Cargas por caso e vento por pavimento (V5, K1.11.11, K1.5.32, K1.11.62): classes de cor das cargas desenhadas na planta
// (por natureza G, Q, W, E, H e por caso adicional), legenda, agrupamento por caso e grupo para a prancha de cargas, e a
// tabela de forças de vento por pavimento e direção (relatório) com as resultantes por zona (planta).
// A cor vem do CSS: este módulo só devolve o nome da classe (`carga-caso-*`, tokens `--carga-caso-*`).
import type { AnaliseEdificio } from '../building/analitico';
import { casosDaObra, pavimentosOrdenados, type BuildingModel, type Carga, type Natureza } from '../building/types';

/** Classes por natureza e por caso adicional (cíclicas). */
export const CLASSES_CARGA_NATUREZA: Record<Natureza, string> = { G: 'carga-caso-g', Q: 'carga-caso-q', W: 'carga-caso-w', E: 'carga-caso-e', H: 'carga-caso-h' };
export const N_CLASSES_ADICIONAIS = 6;
export const classeAdicional = (k: number) => `carga-caso-adic-${((k % N_CLASSES_ADICIONAIS) + N_CLASSES_ADICIONAIS) % N_CLASSES_ADICIONAIS}`;
/** Todas as classes que o CSS precisa definir (tokens `--carga-caso-g`, `-q`, `-w`, `-e`, `-h` e `-adic-0` a `-adic-5`). */
export const TODAS_CLASSES_CARGA = [...Object.values(CLASSES_CARGA_NATUREZA), ...Array.from({ length: N_CLASSES_ADICIONAIS }, (_, k) => classeAdicional(k))];

/** Caso da carga: G e Q (e as Q das classes de uso) usam a cor da natureza; cada caso adicional leva a sua. */
export function classeDoCaso(b: BuildingModel, caso: string): string {
  const adic = (b.casos ?? []).map((c) => c.id), k = adic.indexOf(caso);
  if (k >= 0) return classeAdicional(k);
  const nat = casosDaObra(b).find((c) => c.id === caso)?.natureza ?? (caso === 'G' ? 'G' : 'Q');
  return CLASSES_CARGA_NATUREZA[nat];
}

export interface EntradaLegendaCarga { caso: string; nome: string; natureza: Natureza; classe: string; /** cargas do caso */ n: number }

/** Legenda dos casos que têm carga lançada (no grupo, quando dado), na ordem dos casos da obra. */
export function legendaDeCargas(b: BuildingModel, grupo?: string): EntradaLegendaCarga[] {
  const cargas = b.cargas.filter((c) => !grupo || c.grupo === grupo), obra = casosDaObra(b);
  const nomes = new Map(obra.map((c) => [c.id, c]));
  const contagem = new Map<string, number>();
  for (const c of cargas) contagem.set(c.caso, (contagem.get(c.caso) ?? 0) + 1);
  const ordem = [...obra.map((c) => c.id), ...[...contagem.keys()].filter((id) => !nomes.has(id))];
  return ordem.filter((id) => contagem.has(id)).map((id) => {
    const c = nomes.get(id);
    return { caso: id, nome: c?.nome ?? id, natureza: c?.natureza ?? 'Q', classe: classeDoCaso(b, id), n: contagem.get(id)! };
  });
}

/** Cargas separadas por grupo e caso (prancha de cargas especiais por caso e grupo). */
export function cargasPorGrupoECaso(b: BuildingModel): { grupo: string; nomeGrupo: string; caso: string; nome: string; classe: string; cargas: Carga[]; total: number }[] {
  const out: { grupo: string; nomeGrupo: string; caso: string; nome: string; classe: string; cargas: Carga[]; total: number }[] = [];
  const nomes = new Map(casosDaObra(b).map((c) => [c.id, c.nome]));
  const grupos = [...b.grupos.map((g) => ({ id: g.id, nome: g.nome })), { id: 'fundacao', nome: 'Fundação' }];
  for (const g of grupos) {
    const doGrupo = b.cargas.filter((c) => c.grupo === g.id);
    for (const caso of [...new Set(doGrupo.map((c) => c.caso))]) {
      const cs = doGrupo.filter((c) => c.caso === caso);
      out.push({ grupo: g.id, nomeGrupo: g.nome, caso, nome: nomes.get(caso) ?? caso, classe: classeDoCaso(b, caso), cargas: cs, total: cs.reduce((t, c) => t + c.valor, 0) });
    }
  }
  return out;
}

// ---------------- vento por pavimento ----------------

export interface ZonaVentoLinha {
  zona: number;
  /** Força (kN, com sinal no sentido +x ou +y da direção), momento de torção (kN·m), pressão dinâmica (kN/m²) e dimensões (m). */
  F: number; Mz: number; q: number; altura: number; largura: number; z: number;
  /** Ponto de aplicação em planta (m); null se a zona não tem pórtico (sem ponto). */
  ponto: [number, number] | null;
  /** Resultante em planta: vetor (kN) no sentido do vento. */
  vetor: [number, number];
}

export interface LinhaVentoPavimento {
  pavimento: string; nome: string; cota: number;
  /** Por caso de vento (W0°, W90°, W0°+e …): zonas, soma das forças (kN) e dos momentos. */
  casos: { caso: string; direcao: number; exc: number; zonas: ZonaVentoLinha[]; F: number; Mz: number }[];
}

/** Forças de vento por pavimento e direção (tabela do relatório e setas da planta); vazio sem vento ativo. */
export function ventoPorPavimento(b: BuildingModel, an: AnaliseEdificio): LinhaVentoPavimento[] {
  if (!an.vento) return [];
  const pavs = pavimentosOrdenados(b);
  const linhas: LinhaVentoPavimento[] = [];
  for (const p of pavs) {
    const casos = an.vento.casos.map((cv) => {
      const fs = cv.forcas.filter((f) => f.pavimento === p.id);
      const emX = cv.direcao === 0 || cv.direcao === 180;
      const zonas = fs.map((f): ZonaVentoLinha => {
        const z = an.portico.zonas[p.id]?.[f.zona];
        return { zona: f.zona, F: f.F, Mz: f.Mz, q: f.q, altura: f.altura, largura: f.largura, z: f.z, ponto: z ? [z.cx, z.cy] : null, vetor: emX ? [f.F, 0] : [0, f.F] };
      });
      return { caso: cv.nome, direcao: cv.direcao, exc: cv.exc, zonas, F: zonas.reduce((t, z) => t + z.F, 0), Mz: zonas.reduce((t, z) => t + z.Mz, 0) };
    }).filter((c) => c.zonas.length);
    if (casos.length) linhas.push({ pavimento: p.id, nome: p.nome, cota: p.cota, casos });
  }
  return linhas;
}

/** Tabela do relatório: um pavimento por linha e uma coluna por direção (sem excentricidade): F (kN) e Mz (kN·m); mais a soma na base. */
export function tabelaVento(linhas: LinhaVentoPavimento[]): { cabecalho: string[]; linhas: { pavimento: string; valores: { F: number; Mz: number }[] }[]; base: { F: number; Mz: number }[] } {
  const direcoes = [0, 90, 180, 270].filter((d) => linhas.some((l) => l.casos.some((c) => c.direcao === d && c.exc === 0)));
  const val = (l: LinhaVentoPavimento, d: number) => { const c = l.casos.find((x) => x.direcao === d && x.exc === 0); return { F: c?.F ?? 0, Mz: c?.Mz ?? 0 }; };
  const out = linhas.map((l) => ({ pavimento: l.nome, valores: direcoes.map((d) => val(l, d)) }));
  return { cabecalho: direcoes.map((d) => `W${d}°`), linhas: out, base: direcoes.map((_, i) => ({ F: out.reduce((t, l) => t + l.valores[i].F, 0), Mz: out.reduce((t, l) => t + l.valores[i].Mz, 0) })) };
}

/** Setas do vento de um pavimento para a planta: origem no ponto da zona, comprimento proporcional à força (m por kN). */
export function setasDeVento(l: LinhaVentoPavimento, caso: string, metrosPorKN: number): { de: [number, number]; para: [number, number]; F: number }[] {
  const c = l.casos.find((x) => x.caso === caso);
  if (!c) return [];
  return c.zonas.filter((z) => z.ponto).map((z) => ({ de: z.ponto!, para: [z.ponto![0] + z.vetor[0] * metrosPorKN, z.ponto![1] + z.vetor[1] * metrosPorKN] as [number, number], F: z.F }));
}

/** Escala das setas (m por kN) para que a maior força do caso no pavimento tenha a seta de `comprimento` (m); 0 sem força. */
export function metrosPorKNVento(l: LinhaVentoPavimento, caso: string, comprimento: number): number {
  const c = l.casos.find((x) => x.caso === caso), maxF = Math.max(0, ...(c?.zonas ?? []).map((z) => Math.abs(z.F)));
  return maxF > 1e-9 ? comprimento / maxF : 0;
}
