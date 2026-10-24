// Consultas de deslocamentos (V3): por nó e caso, máximos por pano, por pilar e pavimento, e a saída em tabela/CSV dos
// deslocamentos de cada caso simples nos nós da malha. Núcleo puro. Convenção: uz positivo para cima; o recalque/flecha
// (para baixo) aparece como valor negativo de uz; "levantamento" é uz > 0.
import type { AnaliseEdificio } from '../building/analitico';
import { combinacoesEdificio, type CombinacaoEd } from '../building/combinacoes';
import type { Dimensionamento } from '../building/dimensionamento';
import { pavimentosOrdenados, type BuildingModel } from '../building/types';
import { dentroPoligono, type P } from '../geom/faces';
import { vigasElasticasEf } from '../building/baseElastica';
import { deslocPorticoDoCaso, deslocamentosHipotese, hipoteseDeCaso, hipoteseDeCombinacao, type Hipotese } from './deformada';

export type Desloc6 = [number, number, number, number, number, number];
const sextupla = (u: ArrayLike<number>, no: number): Desloc6 => [0, 1, 2, 3, 4, 5].map((k) => u[no * 6 + k]) as Desloc6;

export interface ConsultaNo {
  origem: 'portico' | 'grelha';
  no: number; pavimento?: string;
  pos: [number, number, number];
  /** Distância do ponto pedido ao nó (m). */
  distancia: number;
  /** ux, uy, uz (m) e rx, ry, rz (rad) por caso simples e por combinação. */
  casos: { nome: string; u: Desloc6 }[];
  combinacoes: { nome: string; tipo: CombinacaoEd['tipo']; u: Desloc6 }[];
  /** Esforços (N, Vy, Vz, T, My, Mz) na ponta da barra ligada ao nó, por caso (barras do pórtico). */
  esforcos: { caso: string; barra: number; tipo: string; ref: string; extremidade: 'i' | 'j'; valores: number[] }[];
  /** Laje que contém o ponto e as taxas de armadura necessárias (cm²/m) por direção da malha. */
  armadura?: { laje: string; nome: string; pos: [number, number]; neg: [number, number] };
}

export interface AlvoConsulta { x: number; y: number; z?: number; pavimento?: string }

/** Nó mais próximo no pórtico (3D se `z` vier, senão em planta) ou, com `pavimento`, nos da grelha da laje. */
export function consultaNo(b: BuildingModel, an: AnaliseEdificio, dim: Dimensionamento | null | undefined, alvo: AlvoConsulta): ConsultaNo | null {
  const pm = an.portico, combs = combinacoesEdificio(b, an);
  const pav = alvo.pavimento ? pavimentosOrdenados(b).find((p) => p.id === alvo.pavimento) : undefined;
  let melhor: { origem: 'portico' | 'grelha'; no: number; d: number } | null = null;
  const grelha = alvo.pavimento ? an.grelhas.find((g) => g.pavimento === alvo.pavimento && g.res && !g.res.erro) : undefined;
  if (grelha) grelha.modelo.nos.forEach((n, i) => { const d = Math.hypot(n[0] - alvo.x, n[1] - alvo.y); if (!melhor || d < melhor.d) melhor = { origem: 'grelha', no: i, d }; });
  else pm.modelo.nos.forEach((n, i) => {
    const d = alvo.z === undefined ? Math.hypot(n[0] - alvo.x, n[1] - alvo.y) : Math.hypot(n[0] - alvo.x, n[1] - alvo.y, n[2] - alvo.z);
    if (!melhor || d < melhor.d) melhor = { origem: 'portico', no: i, d };
  });
  if (!melhor) return null;
  const { origem, no, d } = melhor as { origem: 'portico' | 'grelha'; no: number; d: number };
  const casosH = [...an.casos.map((c) => hipoteseDeCaso(c)), ...(an.vento?.casos ?? []).filter((_, i) => pm.resVento?.desloc[i]).map((c) => hipoteseDeCaso(c.nome))];
  const vetor = (h: Hipotese): Desloc6 => {
    const dh = deslocamentosHipotese(an, h);
    return sextupla(origem === 'grelha' ? dh.grelhas.get(alvo.pavimento!) ?? new Float64Array(0) : dh.portico, no);
  };
  const pos = origem === 'grelha' ? [grelha!.modelo.nos[no][0], grelha!.modelo.nos[no][1], pav?.cota ?? 0] as [number, number, number] : pm.modelo.nos[no] as [number, number, number];
  const out: ConsultaNo = {
    origem, no, ...(origem === 'grelha' ? { pavimento: alvo.pavimento } : {}), pos, distancia: d,
    casos: casosH.map((h) => ({ nome: h.nome, u: vetor(h) })),
    combinacoes: combs.map((c) => ({ nome: c.nome, tipo: c.tipo, u: vetor(hipoteseDeCombinacao(c)) })),
    esforcos: [],
  };
  if (origem === 'portico' && pm.res) {
    const nb = Math.min(pm.barras.length, pm.modelo.barras.length);
    for (let bi = 0; bi < nb; bi++) {
      const bar = pm.modelo.barras[bi], ext = bar.i === no ? 'i' : bar.j === no ? 'j' : null;
      if (!ext) continue;
      an.casos.forEach((c, ic) => {
        const e = pm.res!.esforcos[ic]?.[bi];
        if (e) out.esforcos.push({ caso: c, barra: bi, tipo: pm.barras[bi].tipo, ref: pm.barras[bi].ref, extremidade: ext, valores: Array.from(e.slice(ext === 'i' ? 0 : 6, ext === 'i' ? 6 : 12)) });
      });
    }
  }
  if (dim && alvo.pavimento && pav) {
    const laje = b.lajes.find((l) => l.grupo === pav.grupo && dentroPoligono([pos[0], pos[1]] as P, l.contorno as P[]));
    const r = laje && dim.lajes.find((x) => x.laje === laje.id && x.pavimento === pav.id) ? dim.lajes.find((x) => x.laje === laje.id && x.pavimento === pav.id)! : laje ? dim.lajes.find((x) => x.laje === laje.id) : undefined;
    if (r) out.armadura = { laje: r.laje, nome: r.nome, pos: r.As.pos, neg: r.As.neg };
  }
  return out;
}

export interface MaximoPano {
  laje: string; nome: string; pavimento: string; pavimentoNome: string;
  /** Maior |uz| por caso simples (m, com sinal: negativo = para baixo) e posição do nó. */
  casos: Record<string, { uz: number; x: number; y: number; levantamento: boolean }>;
}

/** Deslocamento máximo de cada pano (nó da grelha dentro da laje) por caso simples. Não é flecha: é o deslocamento do nó. */
export function maximosPorPano(b: BuildingModel, an: AnaliseEdificio): MaximoPano[] {
  const out: MaximoPano[] = [];
  for (const pav of pavimentosOrdenados(b)) {
    const g = an.grelhas.find((x) => x.pavimento === pav.id);
    if (!g || !g.res || g.res.erro) continue;
    for (const l of b.lajes.filter((x) => x.grupo === pav.grupo)) {
      const dentro = g.modelo.nos.map((n, i) => ({ n, i })).filter(({ n }) => dentroPoligono([n[0], n[1]] as P, l.contorno as P[]) || false);
      const casos: MaximoPano['casos'] = {};
      an.casos.forEach((c, ic) => {
        let melhor: { uz: number; x: number; y: number } | null = null;
        for (const { n, i } of dentro) { const uz = g.res!.desloc[ic][i * 6 + 2]; if (!melhor || Math.abs(uz) > Math.abs(melhor.uz)) melhor = { uz, x: n[0], y: n[1] }; }
        if (melhor) casos[c] = { ...melhor, levantamento: melhor.uz > 1e-9 };
      });
      out.push({ laje: l.id, nome: l.nome, pavimento: pav.id, pavimentoNome: pav.nome, casos });
    }
  }
  return out;
}

export interface MaximoBase {
  /** Radier ou viga sobre base elástica (FU6). */
  id: string; nome: string; tipo: 'radier' | 'viga';
  /** Maior |uz| dos nós por caso (m; negativo = recalque, positivo = levantamento) e posição do nó. */
  casos: Record<string, { uz: number; x: number; y: number; levantamento: boolean }>;
}

/** Casos com deslocamento no pórtico (verticais e de vento), na ordem da análise. */
export const casosDoPortico = (an: AnaliseEdificio): string[] => [...an.casos, ...(an.vento?.casos ?? []).filter((c) => deslocPorticoDoCaso(an, c.nome)).map((c) => c.nome)];

/**
 * Deslocamento máximo do radier por caso (V7e, K1.11.20): o "pano" do radier é o próprio elemento; é o recalque do nó
 * (negativo para baixo). Valor positivo = levantamento: o solo não traciona, a hipótese é inválida (aviso na tabela).
 */
export function maximosPorRadier(b: BuildingModel, an: AnaliseEdificio): MaximoBase[] {
  const be = an.baseElastica;
  if (!be) return [];
  const nomes = new Map<string, string>([...(b.fundacao?.radiers ?? []).map((r) => [r.id, r.nome] as const), ...vigasElasticasEf(b).map((v) => [v.id, v.nome] as const)]);
  const out: MaximoBase[] = [];
  for (const ref of [...new Set(be.nos.map((n) => n.ref))]) {
    const nos = be.nos.filter((n) => n.ref === ref), casos: MaximoBase['casos'] = {};
    for (const c of casosDoPortico(an)) {
      const u = deslocPorticoDoCaso(an, c);
      if (!u) continue;
      let melhor: { uz: number; x: number; y: number } | null = null;
      for (const n of nos) { const uz = u[n.no * 6 + 2]; if (!melhor || Math.abs(uz) > Math.abs(melhor.uz)) melhor = { uz, x: n.x, y: n.y }; }
      if (melhor) casos[c] = { ...melhor, levantamento: melhor.uz > 1e-9 };
    }
    out.push({ id: ref, nome: nomes.get(ref) ?? ref, tipo: nos[0].tipo, casos });
  }
  return out;
}

export interface DeslocamentoPilar {
  pilar: string; pavimento: string; pavimentoNome: string; z: number; altura: number;
  /** Topo do lance: ux, uy (m) por caso simples; distorção = deslocamento relativo ao pé do lance / altura. */
  casos: Record<string, { ux: number; uy: number; dx: number; dy: number }>;
}

/**
 * Lances de pilar do pórtico: pé (nó i da primeira barra) e topo (nó j da última). Lance dividido por vigas em desnível
 * (E5m, `BarraPortico.trecho`): as barras consecutivas do mesmo pilar e pavimento formam um lance só.
 */
function lancesDoPortico(an: AnaliseEdificio): { t: AnaliseEdificio['portico']['barras'][number]; base: number; topo: number; zBase: number; zTopo: number }[] {
  const pm = an.portico, nb = Math.min(pm.barras.length, pm.modelo.barras.length), out: ReturnType<typeof lancesDoPortico> = [];
  for (let bi = 0; bi < nb; bi++) {
    const t = pm.barras[bi];
    if (t.tipo !== 'pilar') continue;
    let bf = bi;
    if (t.trecho !== undefined) while (bf + 1 < nb && pm.barras[bf + 1].tipo === 'pilar' && pm.barras[bf + 1].ref === t.ref && pm.barras[bf + 1].pavimento === t.pavimento && pm.barras[bf + 1].trecho !== undefined) bf++;
    const b0 = pm.modelo.barras[bi], b1 = pm.modelo.barras[bf];
    const a = pm.modelo.nos[b0.i], z = pm.modelo.nos[b1.j];
    const [base, topo] = a[2] <= z[2] ? [b0.i, b1.j] : [b1.j, b0.i];
    out.push({ t, base, topo, zBase: Math.min(a[2], z[2]), zTopo: Math.max(a[2], z[2]) });
    bi = bf;
  }
  return out;
}

/** Topo e pé de cada lance de pilar com ux, uy e o deslocamento relativo entre pavimentos. */
export function deslocamentosPilares(b: BuildingModel, an: AnaliseEdificio): DeslocamentoPilar[] {
  const pm = an.portico, out: DeslocamentoPilar[] = [];
  const pavs = new Map(pavimentosOrdenados(b).map((p) => [p.id, p]));
  const hip = [...an.casos.map((c) => hipoteseDeCaso(c)), ...(an.vento?.casos ?? []).filter((_, i) => pm.resVento?.desloc[i]).map((c) => hipoteseDeCaso(c.nome))];
  const vet = new Map(hip.map((h) => [h.nome, deslocamentosHipotese(an, h).portico]));
  for (const { t, base, topo, zBase, zTopo } of lancesDoPortico(an)) {
    const altura = zTopo - zBase, pav = pavs.get(t.pavimento);
    const casos: DeslocamentoPilar['casos'] = {};
    for (const [nome, u] of vet) {
      const ux = u[topo * 6], uy = u[topo * 6 + 1];
      casos[nome] = { ux, uy, dx: ux - u[base * 6], dy: uy - u[base * 6 + 1] };
    }
    out.push({ pilar: t.ref, pavimento: t.pavimento, pavimentoNome: pav?.nome ?? t.pavimento, z: zTopo, altura, casos });
  }
  return out;
}

export interface MaximoCombinado {
  pavimento: string; pavimentoNome: string; z: number;
  /** Maior |ux| e |uy| do topo dos pilares entre as combinações (não simultâneos: cada direção tem a sua combinação) e a distorção. */
  x: { valor: number; combinacao: string; pilar: string; distorcao: number };
  y: { valor: number; combinacao: string; pilar: string; distorcao: number };
}

/**
 * Deslocamentos máximos dos pilares por pavimento na combinação mais desfavorável de cada direção, entre as
 * combinações do tipo `tipo` (padrão frequentes), e a distorção máxima (deslocamento relativo do lance / altura).
 */
export function maximosPilaresCombinados(b: BuildingModel, an: AnaliseEdificio, tipo: CombinacaoEd['tipo'] = 'FREQ'): MaximoCombinado[] {
  const combs = combinacoesEdificio(b, an).filter((c) => c.tipo === tipo);
  const pavs = pavimentosOrdenados(b);
  const us = combs.map((c) => deslocamentosHipotese(an, hipoteseDeCombinacao(c)).portico);
  const out = new Map<string, MaximoCombinado>();
  for (const { t, base, topo, zBase, zTopo } of lancesDoPortico(an)) {
    const altura = zTopo - zBase;
    const pav = pavs.find((p) => p.id === t.pavimento);
    const r = out.get(t.pavimento) ?? { pavimento: t.pavimento, pavimentoNome: pav?.nome ?? t.pavimento, z: zTopo, x: { valor: 0, combinacao: '', pilar: '', distorcao: 0 }, y: { valor: 0, combinacao: '', pilar: '', distorcao: 0 } };
    out.set(t.pavimento, r);
    combs.forEach((c, k) => {
      (['x', 'y'] as const).forEach((eixo, e) => {
        const v = Math.abs(us[k][topo * 6 + e]), rel = Math.abs(us[k][topo * 6 + e] - us[k][base * 6 + e]);
        if (v > r[eixo].valor) r[eixo] = { ...r[eixo], valor: v, combinacao: c.nome, pilar: t.ref };
        if (altura > 0 && rel / altura > r[eixo].distorcao) r[eixo].distorcao = rel / altura;
      });
    });
  }
  return [...out.values()].sort((p, q) => p.z - q.z);
}

export interface LinhaMalha { pavimento: string; pavimentoNome: string; laje: string; no: number; x: number; y: number; caso: string; uz: number }

/** Deslocamento vertical de cada caso simples em cada nó da malha de todos os pavimentos, com o máximo por caso e por pano. */
export function tabelaDeslocamentosMalha(b: BuildingModel, an: AnaliseEdificio): { linhas: LinhaMalha[]; maximoPorCaso: Record<string, number>; porPano: MaximoPano[] } {
  const linhas: LinhaMalha[] = [], maximoPorCaso: Record<string, number> = {};
  for (const pav of pavimentosOrdenados(b)) {
    const g = an.grelhas.find((x) => x.pavimento === pav.id);
    if (!g || !g.res || g.res.erro) continue;
    const lajes = b.lajes.filter((l) => l.grupo === pav.grupo);
    g.modelo.nos.forEach((n, i) => {
      const laje = lajes.find((l) => dentroPoligono([n[0], n[1]] as P, l.contorno as P[]))?.id ?? '';
      an.casos.forEach((c, ic) => {
        const uz = g.res!.desloc[ic][i * 6 + 2];
        linhas.push({ pavimento: pav.id, pavimentoNome: pav.nome, laje, no: i, x: n[0], y: n[1], caso: c, uz });
        if (Math.abs(uz) > Math.abs(maximoPorCaso[c] ?? 0)) maximoPorCaso[c] = uz;
      });
    });
  }
  return { linhas, maximoPorCaso, porPano: maximosPorPano(b, an) };
}

/** CSV (separador `;`, vírgula decimal, deslocamentos em mm) das linhas da malha. */
export function csvDeslocamentos(linhas: LinhaMalha[]): string {
  const f = (v: number, d = 3) => v.toFixed(d).replace('.', ',');
  const cab = 'Pavimento;Laje;No;X (m);Y (m);Caso;uz (mm)';
  return [cab, ...linhas.map((l) => [l.pavimentoNome, l.laje, l.no, f(l.x), f(l.y), l.caso, f(l.uz * 1000)].join(';'))].join('\n');
}
