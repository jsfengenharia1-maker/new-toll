// Relatórios das vigotas (frente E3b): relatório de esforços de um alinhamento (envoltórias de momento, cortante e torção
// com o croqui do grupo de pavimentos e da vigota, C7.193), cortantes das pontas majorados e por metro de largura
// (K1.12.5-11) e quantitativo das vigotas por tipo, com perdas e, nas moldadas, as armaduras superior, inferior e transversal
// (C7.194). Núcleo puro; kN, m.
import type { P } from '../geom/faces';
import type { AnaliseEdificio } from './analitico';
import { barArea } from '../concrete';
import { gamas } from './materiais';
import { alinhamentosDaLaje } from './vigotasFlecha';
import { casosDaObra, pavimentosDoGrupo, type BuildingModel } from './types';
import type { ResultadoVigotas } from './vigotas';

export interface RelatorioEsforcos {
  laje: string; nome: string; indice: number;
  /** Pavimentos do grupo cujas combinações entram na envoltória. */
  pavimentos: string[];
  /** Abscissas dos nós ao longo da vigota (m) e envoltórias por nervura: momento máximo e mínimo (kN·m), cortante (|V|, kN) e torção (|T|, kN·m). */
  x: number[]; Mmax: number[]; Mmin: number[]; V: number[]; T: number[];
  /** Combinação: ELU com γg·G + γq·Q + γh·H de todos os casos verticais. */
  combinacao: string;
  /** Croqui: contorno da laje, eixo da vigota (pontas) e eixos das demais vigotas, e o tipo de vão. */
  croqui: { contorno: [number, number][]; vigota: [P, P]; vigotas: [P, P][]; grupoPavimentos: string };
}

/** Relatório de esforços da vigota `indice` (0 = a primeira) de uma laje já dimensionada; null se a vigota ou a grelha não existem. */
export function relatorioEsforcos(b: BuildingModel, an: AnaliseEdificio, res: ResultadoVigotas, indice: number): RelatorioEsforcos | null {
  const l = b.lajes.find((x) => x.id === res.laje), v = res.lista?.find((x) => x.indice === indice);
  if (!l || !v) return null;
  const gm = gamas(b), obra = casosDaObra(b), nat = an.casos.map((id) => obra.find((x) => x.id === id)?.natureza ?? 'G');
  const fELU = nat.map((n) => (n === 'G' ? gm.g : n === 'H' ? gm.h : n === 'Q' ? gm.q : 0));
  const ang = ((l.direcao ?? 0) * Math.PI) / 180, u: P = [Math.cos(ang), Math.sin(ang)];
  const pavs = pavimentosDoGrupo(b, l.grupo), nomes: string[] = [];
  let melhor: RelatorioEsforcos | null = null;
  for (const g of an.grelhas) {
    if (!g.res || !pavs.some((p) => p.id === g.pavimento)) continue;
    nomes.push(b.pavimentos.find((p) => p.id === g.pavimento)?.nome ?? g.pavimento);
    const als = alinhamentosDaLaje(g, l.id, u);
    if (!als.length) continue;
    const al = als.reduce((best, a) => (Math.abs(a.t - v.t) < Math.abs(best.t - v.t) ? a : best), als[0]);
    const k = res.intereixo / (g.barras[al.barras[0]].largura || res.intereixo), r = g.res;
    const soma = (bi: number, i: number, s: number) => fELU.reduce((t, f, ic) => t + f * s * r.esforcos[ic][bi][i], 0);
    const m = g.modelo, p0 = m.nos[al.nos[0]];
    const x = al.nos.map((n) => Math.hypot(m.nos[n][0] - p0[0], m.nos[n][1] - p0[1]));
    const Mmax: number[] = [], Mmin: number[] = [], V: number[] = [], T: number[] = [];
    for (let n = 0; n < al.nos.length; n++) {
      const cand: { M: number; V: number; T: number }[] = [];
      const ant = n > 0 ? al.barras[n - 1] : null, seg = n < al.barras.length ? al.barras[n] : null;
      for (const [bi, fim] of [[ant, true], [seg, false]] as const) {
        if (bi === null) continue;
        const frente = m.barras[bi].i === al.nos[fim ? n - 1 : n];
        // extremo da barra neste nó: no fim do trecho anterior (j se a barra segue no sentido do alinhamento) ou no início do seguinte
        const usaJ = fim ? frente : !frente;
        cand.push(usaJ ? { M: soma(bi, 11, 1), V: Math.abs(soma(bi, 7, 1)), T: Math.abs(soma(bi, 9, 1)) } : { M: soma(bi, 5, -1), V: Math.abs(soma(bi, 1, -1)), T: Math.abs(soma(bi, 3, -1)) });
      }
      Mmax.push(Math.max(...cand.map((c) => c.M)) * k); Mmin.push(Math.min(...cand.map((c) => c.M)) * k); V.push(Math.max(...cand.map((c) => c.V)) * k); T.push(Math.max(...cand.map((c) => c.T)) * k);
    }
    if (!melhor) melhor = { laje: l.id, nome: l.nome, indice, pavimentos: [], x, Mmax, Mmin, V, T, combinacao: '', croqui: { contorno: l.contorno.map((q) => [q[0], q[1]] as [number, number]), vigota: [v.a, v.z], vigotas: (res.lista ?? []).map((q): [P, P] => [q.a, q.z]), grupoPavimentos: '' } };
    else if (Math.max(...Mmax) > Math.max(...melhor.Mmax) && x.length === melhor.x.length) Object.assign(melhor, { Mmax, Mmin, V, T });
  }
  if (!melhor) return null;
  melhor.pavimentos = nomes;
  melhor.combinacao = `ELU: ${gm.g.toString().replace('.', ',')}·G + ${gm.q.toString().replace('.', ',')}·Q (todos os casos verticais, envoltória dos pavimentos do grupo)`;
  melhor.croqui.grupoPavimentos = nomes.join(', ');
  return melhor;
}

/** Cortantes das pontas de cada vigota, majorados (ELU) por nervura e por metro de largura (K1.12.5-11). */
export function cortantesDasPontas(res: ResultadoVigotas): { indice: number; nervura: [number, number]; porMetro: [number, number] }[] {
  return (res.lista ?? []).map((v) => ({ indice: v.indice, nervura: [v.esforcos.v[0], v.esforcos.v[1]], porMetro: v.cortantePorMetro }));
}

export interface LinhaQuantitativoVigotas {
  /** Família e tipo (ficha e tipo da série, treliça ou "moldada"), número de vigotas, comprimento total (m) e com perdas. */
  familia: string; tipo: string; vigotas: number; comprimento: number; comprimentoComPerdas: number;
}
/** Vigotas por tipo: número e comprimento, com repetições dos pavimentos e perdas (%). */
export function quantitativoVigotas(vs: ResultadoVigotas[], perdas: number): LinhaQuantitativoVigotas[] {
  const m = new Map<string, LinhaQuantitativoVigotas>();
  for (const r of vs) {
    for (const g of r.grupos) {
      const familia = r.familia ?? 'trelicada', tipo = r.familia === 'moldada' ? `moldada h=${Math.round(r.h * 100)}` : r.fichaNome ? `${r.fichaNome} ${g.tipo ?? r.serie ?? ''}`.trim() : `${r.modelo || r.trelica}`;
      const k = `${familia}|${tipo}`, e = m.get(k) ?? { familia, tipo, vigotas: 0, comprimento: 0, comprimentoComPerdas: 0 };
      e.vigotas += g.vigotas * r.repeticoes; e.comprimento += g.vigotas * g.L * r.repeticoes;
      m.set(k, e);
    }
  }
  return [...m.values()].map((e) => ({ ...e, comprimento: +e.comprimento.toFixed(3), comprimentoComPerdas: +(e.comprimento * (1 + perdas / 100)).toFixed(3) })).sort((a, z) => a.familia.localeCompare(z.familia) || a.tipo.localeCompare(z.tipo));
}

export interface LinhaArmaduraMoldada { posicao: 'inferior' | 'superior' | 'transversal'; aco: string; phi: number; comprimento: number; peso: number; pesoComPerdas: number }
/** Armaduras das nervuras moldadas no local (C7.194): inferior, superior e transversal por aço e bitola (kg), com repetições e perdas. */
export function quantitativoMoldadas(vs: ResultadoVigotas[], perdas: number): LinhaArmaduraMoldada[] {
  const m = new Map<string, LinhaArmaduraMoldada>();
  for (const r of vs) {
    if (r.familia !== 'moldada') continue;
    for (const x of r.posicoes) {
      if (x.tipo !== 'inferior' && x.tipo !== 'superior' && x.tipo !== 'transversal') continue;
      const k = `${x.tipo}|${x.aco}|${x.phi}`, e = m.get(k) ?? { posicao: x.tipo, aco: x.aco, phi: x.phi, comprimento: 0, peso: 0, pesoComPerdas: 0 };
      e.comprimento += x.n * x.comprimento * r.repeticoes;
      m.set(k, e);
    }
  }
  const ordem = { inferior: 0, superior: 1, transversal: 2 };
  return [...m.values()].map((e) => { const peso = e.comprimento * barArea(e.phi) * 7850; return { ...e, comprimento: +e.comprimento.toFixed(3), peso: +peso.toFixed(3), pesoComPerdas: +(peso * (1 + perdas / 100)).toFixed(3) }; })
    .sort((a, z) => ordem[a.posicao] - ordem[z.posicao] || a.phi - z.phi);
}

export interface LinhaMemorialVigotas {
  laje: string; nome: string; familia: string; ficha: string; serie: string; vigotas: number; pavimentos: number;
  /** Vigotas por tipo da série (ou "moldada"). */
  tipos: { tipo: string; vigotas: number }[];
  /** Classe de agressividade, nível de protensão e combinação de serviço (protendidas). */
  protensao?: { caa: string; nivel: string; combinacao: string };
  /** Momentos de serviço comparados com o admissível da ficha, por grupo (protendidas). */
  servico: { grupo: number; tipo: string; Mserv: number; Madm: number | null; ok: boolean }[];
  /** Redistribuição dos negativos aplicada por grupo (δ). */
  redistribuicao: { grupo: number; delta: number }[];
  /** Vigotas à parte (editadas, duplas, triplas, esforços atribuídos): índice (1 = primeira) e motivo. */
  especiais: { vigota: number; motivo: string }[];
  erros: string[]; avisos: string[];
}
/** Linhas do memorial para as lajes de vigotas por ficha e moldadas: tipos, exposição, serviço, redistribuição, erros e avisos. */
export function vigotasNoMemorial(vs: ResultadoVigotas[]): LinhaMemorialVigotas[] {
  return vs.filter((r) => r.familia).map((r) => {
    const tipos = new Map<string, number>();
    for (const g of r.grupos) tipos.set(g.tipo ?? 'moldada', (tipos.get(g.tipo ?? 'moldada') ?? 0) + g.vigotas);
    const motivo = { editada: 'editada', dupla: 'vigota dupla', tripla: 'vigota tripla', manual: 'esforços atribuídos' } as const;
    return {
      laje: r.laje, nome: r.nome, familia: r.familia!, ficha: r.fichaNome ?? '—', serie: r.serie ?? '—', vigotas: r.vigotas, pavimentos: r.repeticoes,
      tipos: [...tipos.entries()].map(([tipo, vigotas]) => ({ tipo, vigotas })), ...(r.protensao ? { protensao: r.protensao } : {}),
      servico: r.grupos.flatMap((g, i) => (g.ficha?.servico ? [{ grupo: i + 1, tipo: g.tipo ?? '—', Mserv: g.ficha.servico.Mserv, Madm: g.ficha.servico.Madm, ok: g.ficha.servico.ok }] : [])),
      redistribuicao: r.grupos.flatMap((g, i) => (g.redistribuicao?.aplicada ? [{ grupo: i + 1, delta: g.redistribuicao.delta }] : [])),
      especiais: r.grupos.flatMap((g) => (g.especial ? (g.indices ?? []).map((i) => ({ vigota: i + 1, motivo: motivo[g.especial!] })) : [])),
      erros: r.mensagens.filter((m) => /^(Vigotas: (momento|cortante|nenhuma|armadura não|flecha|capa|altura|ficha)|Armadura bloqueada)/.test(m)),
      avisos: r.mensagens.filter((m) => /^Vigotas: (fora da tabela|a (edição|marcação)|tração|maciçamento)/.test(m)),
    };
  });
}
