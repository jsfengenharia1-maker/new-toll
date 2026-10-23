// Ações e combinações (frente N2a): estados-limite selecionáveis, γ por origem, controle de execução, situações de
// projeto do usuário (com o alerta de responsabilidade) e verificação de equilíbrio (tombamento global, EQU).
// Núcleo puro. Valores sem fonte aberta confirmada ficam marcados "a confirmar".
import { tabelaNorma, type FonteNormas } from '../normas';
import type { AnaliseEdificio } from './analitico';
import type { OpcoesCalculo } from './opcoes';
import { casosDaObra, centroPilar, contornoPilar, type BuildingModel, type ControleExecucao, type EstadoConfig, type EstadoId, type SituacaoUsuario } from './types';

export type TipoCombinacao = 'ELU' | 'QP' | 'FREQ' | 'RARA';

export interface EstadoInfo {
  id: EstadoId;
  /** Sempre verificado (não pode ser desativado). */
  fixo?: boolean;
  rotulo: string;
  /** Tipo das combinações do grupo (EQU usa γ próprios, não lista). */
  tipo: TipoCombinacao | 'EQU' | 'FOGO';
  /** Padrão do sistema: ativo? */
  ativo: boolean;
  /** O grupo consome uma lista de combinações (aceita o modo "usuário")? */
  lista: boolean;
  descricao: string;
  fonte: string;
}

/** Grupos de combinações / estados-limite (aço, madeira e alumínio ficam fora do escopo do edifício de concreto). */
export const ESTADOS_INFO: EstadoInfo[] = [
  { id: 'concreto', fixo: true, rotulo: 'Concreto armado (ELU)', tipo: 'ELU', ativo: true, lista: true, descricao: 'Vigas e pilares (combinações últimas normais, de construção e excepcionais).', fonte: 'NBR 6118, 11.8; NBR 8681' },
  { id: 'fundacoes', rotulo: 'Fundações, estrutura (ELU)', tipo: 'ELU', ativo: true, lista: false, descricao: 'Dimensionamento estrutural de sapatas, blocos e tubulões: cargas características da combinação rara × γf (módulo de fundações), sem lista própria de combinações.', fonte: 'NBR 6118; NBR 6122; padrão do programa de referência' },
  { id: 'solo', rotulo: 'Tensões no solo (raras)', tipo: 'RARA', ativo: true, lista: true, descricao: 'Verificação geotécnica: combinações raras (principal integral + ψ1 das demais).', fonte: 'NBR 6122; padrão Eberick/TQS' },
  { id: 'deslocamentos', rotulo: 'Deslocamentos laterais (frequentes)', tipo: 'FREQ', ativo: true, lista: false, descricao: 'Deslocamento do topo e entre pavimentos pelo vento na combinação frequente (ψ1 = 0,3).', fonte: 'NBR 6118, Tabela 13.3' },
  { id: 'fissuracao', rotulo: 'Fissuração (frequentes)', tipo: 'FREQ', ativo: true, lista: true, descricao: 'Abertura de fissuras de vigas e lajes (combinação frequente).', fonte: 'NBR 6118, 13.4.2' },
  { id: 'flecha', rotulo: 'Flechas (quase permanentes)', tipo: 'QP', ativo: true, lista: false, descricao: 'Flechas de vigas e lajes (quase permanente com fluência).', fonte: 'NBR 6118, 17.3.2 e 13.3' },
  { id: 'equilibrio', rotulo: 'Equilíbrio global (EQU)', tipo: 'EQU', ativo: true, lista: false, descricao: 'Tombamento do edifício: momento estabilizante das permanentes × momento do vento, com γ de equilíbrio.', fonte: 'NBR 8681, 5.1.1 e Tabelas 1 a 3 [a confirmar os valores]' },
  { id: 'incendio', rotulo: 'Resistência ao fogo (NBR 15200)', tipo: 'FOGO', ativo: false, lista: false, descricao: 'Verificação opcional em situação de incêndio pelo método tabular: dimensões mínimas e distância c1 de vigas, lajes e pilares conforme o TRRF (solicitação Sd,fi = 0,7·Sd; sem lista de combinações).', fonte: 'NBR 15200; NBR 14432 [a confirmar as tabelas]' },
];

export const estadoInfo = (id: EstadoId) => ESTADOS_INFO.find((e) => e.id === id)!;

/** Configuração em uso de um grupo de estados (padrão do sistema + o que o modelo alterou). */
export function estadoEmUso(b: BuildingModel, id: EstadoId): EstadoConfig {
  return { ativo: estadoInfo(id).ativo, modo: 'norma', ...b.estados?.[id] };
}

/** Fator final por caso de uma situação do usuário (γ·ψ no modo `gamapsi`). */
export function fatoresDaSituacao(s: Pick<SituacaoUsuario, 'modo' | 'fatores' | 'gama' | 'psi'>): Record<string, number> {
  if (s.modo !== 'gamapsi') return { ...s.fatores };
  const out: Record<string, number> = {};
  for (const k of new Set([...Object.keys(s.gama ?? {}), ...Object.keys(s.psi ?? {})])) {
    const f = (s.gama?.[k] ?? 1) * (s.psi?.[k] ?? 1);
    if (f) out[k] = +f.toFixed(6);
  }
  return out;
}

// ---------------- γ por origem ----------------

export interface LinhaGama {
  id: string;
  origem: string;
  /** [desfavorável, favorável] nas combinações normais, de construção/especiais e excepcionais. */
  normal: [number, number];
  especial: [number, number];
  excepcional: [number, number];
  fonte: string;
  aConfirmar: boolean;
}

/** γ padrão do empuxo de terra (linha da NBR 8681, tratada como permanente) [a confirmar]. */
export const GAMA_EMPUXO = 1.4;

/**
 * Coeficientes de ponderação das ações por origem e tipo de combinação (NBR 6118, Tabela 11.1) mais as linhas de
 * empuxo e de ações indiretas da NBR 8681. As linhas "em uso" (permanentes, variáveis, empuxo) vêm dos materiais
 * (`gamas`); as demais são de referência.
 */
export function gamasPorOrigem(b?: FonteNormas): LinhaGama[] {
  return tabelaNorma(b, 'nbr8681.gama-origem').map((l) => ({
    id: l.id as string, origem: l.origem as string, normal: [l.nD as number, l.nF as number], especial: [l.eD as number, l.eF as number], excepcional: [l.xD as number, l.xF as number],
    fonte: l.fonte as string, aConfirmar: l.aConfirmar === 1,
  }));
}
/** Tabela de fábrica (biblioteca de normas, `nbr8681.gama-origem`). */
export const GAMA_ORIGEM: LinhaGama[] = gamasPorOrigem();

// ---------------- controle de execução ----------------

export const CONTROLE_INFO: Record<ControleExecucao, { rotulo: string; gamaC: number; fonte: string }> = {
  normal: { rotulo: 'Normal', gamaC: 1.4, fonte: 'NBR 6118, Tabela 12.1 (combinações normais)' },
  desfavoravel: { rotulo: 'Desfavorável (γc × 1,1)', gamaC: +(1.4 * 1.1).toFixed(2), fonte: 'NBR 6118, 12.4.1: γc multiplicado por 1,1 quando as condições de execução são desfavoráveis [a confirmar o item]' },
  premoldado: { rotulo: 'Pré-moldado com controle rigoroso (γc 1,3)', gamaC: 1.3, fonte: 'NBR 6118, 12.4.1 e NBR 9062 (pré-moldados e pré-fabricados) [a confirmar o item]' },
};

/** γc padrão do nível de controle de execução. */
export const gamaCDoControle = (c?: ControleExecucao) => CONTROLE_INFO[c ?? 'normal'].gamaC;

// ---------------- alerta de responsabilidade ----------------

export interface CombinacaoSimples { nome: string; tipo: TipoCombinacao; fatores: Record<string, number> }

/**
 * Alerta de responsabilidade: casos cujo maior fator nas situações do usuário de um grupo é menor que o da norma
 * (segurança menor que a da norma). Compara só os grupos em modo "usuário" com situações.
 */
export function alertasSituacoes(b: BuildingModel, normativas: CombinacaoSimples[]): { estado: EstadoId; caso: string; usuario: number; norma: number }[] {
  const out: { estado: EstadoId; caso: string; usuario: number; norma: number }[] = [];
  for (const info of ESTADOS_INFO) {
    if (!info.lista || estadoEmUso(b, info.id).modo !== 'usuario' || info.tipo === 'EQU') continue;
    const sits = (b.situacoes ?? []).filter((s) => s.estado === info.id);
    if (!sits.length) continue;
    const norma = new Map<string, number>(), user = new Map<string, number>();
    for (const c of normativas) if (c.tipo === info.tipo) for (const [k, v] of Object.entries(c.fatores)) norma.set(k, Math.max(norma.get(k) ?? 0, v));
    for (const s of sits) for (const [k, v] of Object.entries(fatoresDaSituacao(s))) user.set(k, Math.max(user.get(k) ?? 0, v));
    for (const [k, vn] of norma) { const vu = user.get(k) ?? 0; if (vu < vn - 1e-9) out.push({ estado: info.id, caso: k, usuario: vu, norma: vn }); }
  }
  return out;
}

const fmtA = (v: number) => String(+v.toFixed(3)).replace('.', ',');
/** Texto de um alerta de caso (parte da frase do grupo). */
export const textoAlerta = (b: BuildingModel, a: { estado: EstadoId; caso: string; usuario: number; norma: number }) => {
  const nome = casosDaObra(b).find((c) => c.id === a.caso)?.nome ?? a.caso;
  return `fator máximo de ${nome} = ${fmtA(a.usuario)}, abaixo de ${fmtA(a.norma)} da norma`;
};

/** Uma frase por grupo de estados com todos os casos abaixo da norma. */
export function textosAlertas(b: BuildingModel, alertas: { estado: EstadoId; caso: string; usuario: number; norma: number }[]): string[] {
  return ESTADOS_INFO.filter((e) => alertas.some((a) => a.estado === e.id)).map((e) =>
    `Combinações do usuário (${e.rotulo}): ${alertas.filter((a) => a.estado === e.id).map((a) => textoAlerta(b, a)).join('; ')}. Responsabilidade do projetista: a segurança não pode ser menor que a da norma.`);
}

// ---------------- equilíbrio global (EQU) ----------------

export interface ResultadoEQU {
  direcao: 0 | 90 | 180 | 270;
  /** Momento instabilizante do vento (γq·ΣF·z, kN·m) e estabilizante das permanentes (γg,fav·ΣN·braço, kN·m). */
  Minst: number; Mest: number;
  /** Mest / Minst (≥ 1 atende); Infinity sem vento. */
  FS: number;
  ok: boolean;
  /** Carga permanente total (kN) e braço médio até a aresta de tombamento (m). */
  W: number; braco: number;
}

/**
 * Tombamento global do edifício: para cada direção do vento (centrado), momento do vento em relação ao plano do
 * apoio × momento estabilizante das cargas permanentes (reações dos casos G) em relação à aresta da base do lado
 * sotavento. γ de equilíbrio das opções (NBR 8681): permanentes favoráveis `equGamaFav` e vento `equGamaVento`.
 * Não considera a profundidade da fundação nem o solo sobre as sapatas.
 */
export function equilibrioGlobal(b: BuildingModel, an: Pick<AnaliseEdificio, 'fundacao' | 'vento'>, op: Pick<OpcoesCalculo, 'equGamaFav' | 'equGamaVento'>): ResultadoEQU[] {
  if (!an.vento || !b.pilares.length) return [];
  const perm = new Set(casosDaObra(b).filter((c) => c.natureza === 'G').map((c) => c.id));
  const pos = new Map<string, { c: [number, number]; ct: [number, number][] }>();
  for (const q of b.pilares) pos.set(q.id, { c: centroPilar(q, q.secao), ct: contornoPilar(q, q.secao) });
  const cargas = new Map<string, number>();
  for (const f of an.fundacao) if (perm.has(f.caso) && pos.has(f.pilar)) cargas.set(f.pilar, (cargas.get(f.pilar) ?? 0) + f.N);
  const W = [...cargas.values()].reduce((s, v) => s + v, 0);
  const out: ResultadoEQU[] = [];
  for (const cv of an.vento.casos.filter((c) => c.exc === 0)) {
    const ix = cv.direcao === 0 || cv.direcao === 180 ? 0 : 1, mais = cv.direcao === 0 || cv.direcao === 90;
    const todos = [...pos.values()].flatMap((p) => p.ct.map((q) => q[ix]));
    const aresta = mais ? Math.max(...todos) : Math.min(...todos);
    let Mest = 0;
    for (const [id, N] of cargas) { const x = pos.get(id)!.c[ix]; Mest += N * Math.abs(aresta - x); }
    Mest *= op.equGamaFav;
    const Minst = op.equGamaVento * cv.forcas.reduce((s, f) => s + Math.abs(f.F) * f.z, 0);
    out.push({ direcao: cv.direcao, Minst, Mest, FS: Minst > 1e-9 ? Mest / Minst : Infinity, ok: Mest >= Minst, W, braco: W > 1e-9 ? Mest / op.equGamaFav / W : 0 });
  }
  return out;
}

// ---------------- biblioteca de situações ----------------

/** Situações de um grupo de estados para gravar na biblioteca (sem ids) e levar a outra obra. */
export interface ListaSituacoes {
  estado: EstadoId;
  situacoes: Omit<SituacaoUsuario, 'id' | 'estado'>[];
}

export const listaDeSituacoes = (b: BuildingModel, estado: EstadoId): ListaSituacoes =>
  ({ estado, situacoes: (b.situacoes ?? []).filter((s) => s.estado === estado).map(({ id: _id, estado: _e, ...s }) => s) });

/** Comandos que criam as situações da lista na obra (substituindo as do grupo). */
export function comandosDaLista(l: ListaSituacoes, b: BuildingModel): { nome: string; params: Record<string, unknown> }[] {
  const ids = (b.situacoes ?? []).filter((s) => s.estado === l.estado).map((s) => s.id);
  return [
    ...(ids.length ? [{ nome: 'situacao.remover', params: { ids } }] : []),
    ...l.situacoes.map((s) => ({ nome: 'situacao.criar', params: { nome: s.nome, estado: l.estado, situacao: s.situacao, modo: s.modo, fatores: s.fatores, ...(s.gama ? { gama: s.gama } : {}), ...(s.psi ? { psi: s.psi } : {}) } })),
  ];
}

// ---------------- biblioteca de materiais ----------------

/** Concreto, aço, controle de execução e coeficientes de uma obra, para gravar na biblioteca e aplicar em outra. */
export interface PerfilMateriais {
  fck: number;
  aco: 'CA-50' | 'CA-60';
  controle?: ControleExecucao;
  fckElem?: NonNullable<BuildingModel['norma']['fckElem']>;
  acoPos?: NonNullable<BuildingModel['norma']['acoPos']>;
  gamas?: NonNullable<BuildingModel['norma']['gamas']>;
}

/** Materiais da obra como perfil (só o que a obra definiu além do padrão). */
export function perfilMateriaisDe(b: BuildingModel): PerfilMateriais {
  const n = b.norma;
  return { fck: n.fck, aco: n.aco, ...(n.controle ? { controle: n.controle } : {}), ...(n.fckElem ? { fckElem: { ...n.fckElem } } : {}), ...(n.acoPos ? { acoPos: { ...n.acoPos } } : {}), ...(n.gamas ? { gamas: { ...n.gamas } } : {}) };
}

/** Comandos que aplicam o perfil à obra (volta os materiais ao padrão e define o que o perfil traz). */
export function comandosDoPerfil(p: PerfilMateriais): { nome: string; params: Record<string, unknown> }[] {
  return [
    { nome: 'materiais.definir', params: { padrao: true } },
    { nome: 'norma.definir', params: { fck: p.fck, aco: p.aco, controle: p.controle ?? 'normal' } },
    ...(p.fckElem || p.acoPos || p.gamas ? [{ nome: 'materiais.definir', params: { ...(p.fckElem ? { fck: p.fckElem } : {}), ...(p.acoPos ? { aco: p.acoPos } : {}), ...(p.gamas ? { gamas: p.gamas } : {}) } }] : []),
  ];
}
