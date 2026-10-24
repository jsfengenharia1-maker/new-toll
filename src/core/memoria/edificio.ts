// Memória de cálculo detalhada do edifício (MD fase 1): cargas, combinações e análise (resumo com os valores do
// solver) e a cadeia completa de vigas e pilares de concreto, registrada pelo próprio dimensionamento com a memória
// ligada. Gerada sob demanda (refaz o dimensionamento com o registrador ativo; a análise é reaproveitada).
import { analisarEdificio, type AnaliseEdificio } from '../building/analitico';
import { combinacoesDoEstado, combinacoesEdificio } from '../building/combinacoes';
import { dimensionarEdificio, type Dimensionamento } from '../building/dimensionamento';
import { gamas } from '../building/materiais';
import { casosDaObra, type BuildingModel } from '../building/types';
import { casosResolvidos } from './dadosAnalise';
import { ETAPAS_MEMORIA, Registrador, comMemoria, fm, type PassoMemoria } from './registrador';

export interface MemoriaDetalhada {
  versao: 1;
  obra: string;
  /** Escopo desta fase (o que a memória cobre e o que fica para as fases seguintes). */
  escopo: string;
  passos: PassoMemoria[];
  elementos: string[];
  truncado: boolean;
  /** Tempo do dimensionamento com a memória ligada (ms). */
  ms: number;
}

export const ESCOPO_MD1 = 'Fase 1: cargas por caso, combinações com os coeficientes, resumo da análise (γz, totais e deslocamentos) e a cadeia completa das vigas e dos pilares de concreto armado (esforços determinantes, flexão, cortante, ancoragem, fissuração, flecha; esbeltez, 2ª ordem local, flexão oblíqua, armaduras). Lajes, nervuradas, punção, fundações, escadas, paredes e o pórtico 2D entram nas fases seguintes (docs/spec-memoria-detalhada.md).';

export interface OpcoesMemoria {
  /** Análise já feita (reaproveitada); sem ela, a análise é refeita. */
  an?: AnaliseEdificio;
  /** Só estes elementos (nomes como "Viga V1" ou "Pilar P1 · Pavimento 2"); os passos globais entram sempre. */
  elementos?: string[];
}

const GLOBAL = 'Edifício';

export function memoriaDetalhada(b: BuildingModel, o: OpcoesMemoria = {}): { memoria: MemoriaDetalhada; an: AnaliseEdificio; dim: Dimensionamento } {
  const an = o.an ?? analisarEdificio(b);
  const sel = o.elementos ? new Set(o.elementos) : null;
  const reg = new Registrador({ filtro: sel ? (e) => e === GLOBAL || sel.has(e) : undefined });
  passosGlobais(reg, b, an);
  const t0 = performance.now();
  const dim = comMemoria(reg, () => dimensionarEdificio(b, an, { fundacao: false }));
  const ms = performance.now() - t0;
  const elementos = [...new Set(reg.passos.map((p) => p.elemento))];
  return { memoria: { versao: 1, obra: b.obra?.nome || 'Edifício', escopo: ESCOPO_MD1, passos: reg.passos, elementos, truncado: reg.truncado, ms }, an, dim };
}

function passosGlobais(reg: Registrador, b: BuildingModel, an: AnaliseEdificio) {
  const g = gamas(b), obra = casosDaObra(b);
  // ---- cargas
  for (const c of obra) {
    const tot = an.totais[c.id];
    reg.passo({ etapa: 'cargas', elemento: GLOBAL, topico: 'Casos de carga', descricao: `Caso ${c.id} (${c.nome ?? c.id}), natureza ${c.natureza}${c.psi ? `, ψ0 = ${fm(c.psi[0])}, ψ1 = ${fm(c.psi[1])}, ψ2 = ${fm(c.psi[2])}` : ''}: carga vertical característica total`, formula: 'ΣFk,vertical', expressao: `ΣF = ${fm(tot ?? 0)} kN`, resultado: tot ?? 0, unidade: 'kN', norma: 'NBR 6120:2019; NBR 8681:2003', entradas: { natureza: c.natureza, ...(c.psi ? { psi0: c.psi[0], psi1: c.psi[1], psi2: c.psi[2] } : {}) } });
  }
  for (const c of casosResolvidos(an)) {
    if (c.origem === 'pDelta') continue;
    let Rz = 0;
    for (const r of c.res.reacoes[c.ic].values()) Rz += r[2];
    reg.passo({ etapa: 'analise', elemento: GLOBAL, topico: 'Equilíbrio por caso', descricao: `Soma das reações verticais do pórtico no caso ${c.nome}`, formula: 'ΣRz', expressao: `ΣRz = ${fm(Rz)} kN`, resultado: Rz, unidade: 'kN', entradas: {} });
  }
  for (const cv of an.vento?.casos ?? []) {
    const F = cv.forcas;
    const tot = F.reduce((t, f) => t + f.F, 0), M = F.reduce((t, f) => t + Math.abs(f.F) * f.z, 0);
    reg.passo({ etapa: 'cargas', elemento: GLOBAL, topico: 'Vento (NBR 6123)', descricao: `Caso ${cv.nome}: forças por pavimento (F; z)`, formula: 'ΣF; M1 = Σ|F|·z', expressao: `${F.map((f) => `(${fm(f.F)} kN; ${fm(f.z)} m)`).join(' ')} → ΣF = ${fm(tot)} kN; M1 = ${fm(M)} kN·m`, resultado: tot, unidade: 'kN', norma: 'NBR 6123:1988', entradas: { M1: M } });
  }
  // ---- combinações
  reg.passo({ etapa: 'combinacoes', elemento: GLOBAL, topico: 'Coeficientes', descricao: 'Coeficientes de ponderação adotados', formula: 'γg, γq, γc, γs', expressao: `γg = ${fm(g.g)}; γq = ${fm(g.q)}; γc = ${fm(g.c)}; γs = ${fm(g.s)}`, resultado: g.g, unidade: '', norma: 'NBR 6118:2023, 11.7 e 12.4; NBR 8681:2003', entradas: { gg: g.g, gq: g.q, gc: g.c, gs: g.s } });
  const combs = combinacoesEdificio(b, an), elu = combinacoesDoEstado(b, an, 'concreto', combs), freq = combinacoesDoEstado(b, an, 'fissuracao', combs);
  const usadas = [...elu.map((c) => [c, 'ELU (concreto)'] as const), ...freq.map((c) => [c, 'ELS frequente (fissuração)'] as const), ...combs.filter((c) => c.tipo === 'QP' || c.tipo === 'RARA').map((c) => [c, c.tipo === 'QP' ? 'ELS quase permanente' : 'Rara (fundação)'] as const)];
  for (const [c, rot] of usadas) {
    const ent: Record<string, number> = {};
    for (const [k, f] of Object.entries(c.fatores)) ent[k] = f;
    reg.passo({ etapa: 'combinacoes', elemento: GLOBAL, topico: rot, descricao: c.nome, formula: c.tipo === 'ELU' ? 'Fd = Σ γg·Gk + γq·(Q1k + Σ ψ0j·Qjk)' : c.tipo === 'FREQ' ? 'Fd,ser = Σ Gk + ψ1·Q1k + Σ ψ2j·Qjk' : c.tipo === 'QP' ? 'Fd,ser = Σ Gk + Σ ψ2j·Qjk' : 'Fd,ser = Σ Gk + Q1k + Σ ψ1j·Qjk', expressao: `Fd = ${Object.entries(c.fatores).map(([k, f]) => `${fm(f)}·${k}`).join(' + ')}`, resultado: c.nome, unidade: '', norma: 'NBR 8681:2003, 5.1.3; NBR 6118:2023, 11.8', entradas: ent });
  }
  // ---- análise
  const pm = an.portico, m = pm.modelo;
  reg.passo({ etapa: 'analise', elemento: GLOBAL, topico: 'Modelo', descricao: 'Pórtico espacial (rigidez direta, elementos de barra com trechos rígidos e diafragma rígido por pavimento)', formula: 'K·u = F', expressao: `${m.nos.length} nós; ${m.barras.length} barras; ${an.gdl} gdl`, resultado: an.gdl, unidade: 'gdl', entradas: { nos: m.nos.length, barras: m.barras.length } });
  for (const gz of an.vento?.gamaZ ?? []) reg.passo({ etapa: 'analise', elemento: GLOBAL, topico: 'Estabilidade global (γz)', descricao: `Vento a ${gz.direcao}°: γz com o vento principal e com o uso principal (rigidez reduzida, 15.7.3)`, formula: 'γz = 1/(1 − ΔMtot,d/M1,tot,d); ampliação 0,95·γz se γz > 1,1', expressao: `γz = máx(${fm(gz.ventoPrincipal)}; ${fm(gz.usoPrincipal)}) = ${fm(gz.max)}; ampliação ${fm(gz.ampliacao)}`, resultado: gz.max, unidade: '', norma: 'NBR 6118:2023, 15.5.3 e 15.7.2', entradas: { ventoPrincipal: gz.ventoPrincipal, usoPrincipal: gz.usoPrincipal, ampliacao: gz.ampliacao } });
  for (const c of casosResolvidos(an)) {
    if (c.origem === 'pDelta') continue;
    const u = c.res.desloc[c.ic];
    let max = 0, no = -1, gdl = 0;
    for (let i = 0; i < u.length; i++) if (Math.abs(u[i]) > Math.abs(max) && i % 6 < 3) { max = u[i]; no = Math.floor(i / 6); gdl = i % 6; }
    reg.passo({ etapa: 'analise', elemento: GLOBAL, topico: 'Deslocamentos', descricao: `Maior deslocamento de translação no caso ${c.nome} (nó ${no}, ${['ux', 'uy', 'uz'][gdl]})`, formula: 'máx |u|', expressao: `u = ${fm(max * 1000)} mm`, resultado: max, unidade: 'm', entradas: { no, gdl } });
  }
}

/** Índice das etapas presentes e dos elementos de cada etapa, na ordem. */
export function indiceMemoria(mem: MemoriaDetalhada) {
  return ETAPAS_MEMORIA.map((e) => ({ ...e, elementos: [...new Set(mem.passos.filter((p) => p.etapa === e.id).map((p) => p.elemento))] })).filter((e) => e.elementos.length);
}

/** CSV dos passos (um por linha). */
export function csvMemoria(mem: MemoriaDetalhada): string {
  const esc = (s: string) => (/[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lin = [['id', 'etapa', 'elemento', 'topico', 'descricao', 'formula', 'expressao', 'resultado', 'unidade', 'norma', 'a_confirmar', 'entradas'].join(';')];
  for (const p of mem.passos) lin.push([p.id, p.etapa, p.elemento, p.topico, p.descricao, p.formula, p.expressao, typeof p.resultado === 'number' ? String(p.resultado) : p.resultado, p.unidade, p.norma ?? '', p.aConfirmar ? 'sim' : '', JSON.stringify(p.entradas)].map((x) => esc(String(x))).join(';'));
  return lin.join('\n') + '\n';
}
