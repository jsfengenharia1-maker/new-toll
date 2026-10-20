// Modelo físico do edifício (lançamento por pavimentos). Editado só por comandos (src/core/commands).
// Unidades: m, kN, graus. Ids são strings curtas estáveis; o nome visível é campo separado e renumerável.

export const BUILDING_VERSION = 1;

/** Categorias de uso (NBR 6120:2019, Tabela 10) com a carga variável padrão em kN/m² [a confirmar]. */
export type CategoriaUso = 'residencial' | 'servico' | 'comum' | 'escritorio' | 'garagem' | 'cobertura';

export interface Obra {
  nome: string;
  cidade?: string;
  /** Profundidade do nível de fundação abaixo do pavimento mais baixo (m). */
  profundidadeFundacao: number;
}

export interface Norma {
  fck: number; // MPa
  aco: 'CA-50' | 'CA-60';
  caa: 'I' | 'II' | 'III' | 'IV';
  /** Cobrimentos nominais (cm). */
  cobrimento: { laje: number; viga: number; pilar: number };
}

export interface Pavimento {
  id: string;
  nome: string;
  /** Cota do topo da laje estrutural (m). */
  cota: number;
  grupo: string;
}

/** Grupo de pavimentos iguais: todos compartilham a mesma planta (pavimento-tipo vinculado). */
export interface Grupo {
  id: string;
  nome: string;
  uso: CategoriaUso;
  /** Revestimento e piso (kN/m²). */
  gRev: number;
  /** Carga variável (kN/m²). */
  q: number;
}

/** Eixo de referência: reta pelos pontos p1 e p2, com rótulo (A, B, 1, 2...). */
export interface Eixo {
  id: string;
  nome: string;
  p1: [number, number];
  p2: [number, number];
}

/** Geometria de uma camada da máscara, em unidades do DXF (antes da transformação da máscara). */
export interface CamadaGeo {
  /** Segmentos [x1, y1, x2, y2, ...] (polilinhas e blocos já explodidos). */
  linhas: number[];
  /** Arcos [cx, cy, r, a0, a1, ...] em graus, anti-horário de a0 a a1 (círculo: 0 a 360). */
  arcos: number[];
  textos: { x: number; y: number; h: number; rot: number; t: string }[];
}

export interface CamadaMascara { nome: string; visivel: boolean; capturavel: boolean; cor?: string }

/** Desenho de referência (DXF) de um grupo de pavimentos. Mundo = R(rotacao)·(escala·p) + (dx, dy). */
export interface Mascara {
  id: string;
  nome: string;
  grupo: string;
  escala: number; // m por unidade do DXF
  rotacao: number; // graus
  dx: number;
  dy: number;
  camadas: CamadaMascara[];
  geo: Record<string, CamadaGeo>;
}

export type SecaoPilar = { tipo: 'ret'; b: number; h: number } | { tipo: 'circ'; d: number };

/**
 * Ponto fixo do pilar (o ponto da seção que fica em x, y), nos eixos locais da seção girada:
 * c = centro; n/s/l/o = meio das faces (+y, −y, +x, −x); ne/no/se/so = cantos.
 */
export type Ajuste = 'c' | 'n' | 's' | 'l' | 'o' | 'ne' | 'no' | 'se' | 'so';

export interface Pilar {
  id: string;
  nome: string;
  x: number;
  y: number;
  angulo: number; // graus; b na direção local x
  ajuste: Ajuste;
  /** 'fundacao' ou id do pavimento em cuja laje o pilar nasce. */
  nasce: string;
  /** Pavimento mais alto que o pilar alcança. */
  morre: string;
  secao: SecaoPilar;
  /** Seção diferente por lance (o lance é identificado pelo pavimento do seu topo). */
  secoes?: { pavimento: string; secao: SecaoPilar }[];
}

export interface BuildingModel {
  version: typeof BUILDING_VERSION;
  /** Contador para ids determinísticos (o replay do log gera os mesmos ids). */
  seq: number;
  obra: Obra;
  norma: Norma;
  pavimentos: Pavimento[]; // de baixo para cima
  grupos: Grupo[];
  eixos: Eixo[];
  mascaras: Mascara[];
  pilares: Pilar[];
}

export const USOS: { v: CategoriaUso; label: string; q: number }[] = [
  { v: 'residencial', label: 'Residencial (dormitórios, sala, cozinha)', q: 1.5 },
  { v: 'servico', label: 'Área de serviço e lavanderia', q: 2.0 },
  { v: 'comum', label: 'Áreas comuns, corredores e escadas', q: 3.0 },
  { v: 'escritorio', label: 'Escritórios', q: 2.5 },
  { v: 'garagem', label: 'Garagem (veículos leves)', q: 3.0 },
  { v: 'cobertura', label: 'Cobertura sem acesso (manutenção)', q: 1.0 },
];

export const qDoUso = (u: CategoriaUso) => USOS.find((x) => x.v === u)?.q ?? 1.5;

/** Cobrimentos nominais por classe de agressividade (NBR 6118, Tabela 7.2), em cm. */
export const COBRIMENTOS: Record<Norma['caa'], Norma['cobrimento']> = {
  I: { laje: 2.0, viga: 2.5, pilar: 2.5 },
  II: { laje: 2.5, viga: 3.0, pilar: 3.0 },
  III: { laje: 3.5, viga: 4.0, pilar: 4.0 },
  IV: { laje: 4.5, viga: 5.0, pilar: 5.0 },
};

export function edificioVazio(): BuildingModel {
  return {
    version: BUILDING_VERSION,
    seq: 0,
    obra: { nome: 'Edifício sem nome', profundidadeFundacao: 1.5 },
    norma: { fck: 30, aco: 'CA-50', caa: 'II', cobrimento: { ...COBRIMENTOS.II } },
    pavimentos: [],
    grupos: [],
    eixos: [],
    mascaras: [],
    pilares: [],
  };
}

export const pavimentosOrdenados = (b: BuildingModel) => [...b.pavimentos].sort((a, z) => a.cota - z.cota);

/** Pé-direito (m): distância até o pavimento de baixo; no mais baixo, a profundidade da fundação. */
export function peDireito(b: BuildingModel, id: string): number {
  const ps = pavimentosOrdenados(b);
  const i = ps.findIndex((p) => p.id === id);
  if (i < 0) return NaN;
  return i === 0 ? b.obra.profundidadeFundacao : ps[i].cota - ps[i - 1].cota;
}

export const cotaFundacao = (b: BuildingModel) => (b.pavimentos.length ? Math.min(...b.pavimentos.map((p) => p.cota)) : 0) - b.obra.profundidadeFundacao;

/** Modelos gravados antes de um campo existir ganham o valor vazio. */
export function normalizarEdificio(b: BuildingModel): BuildingModel {
  return { ...b, mascaras: b.mascaras ?? [], pilares: b.pilares ?? [] };
}

/** Pavimentos atravessados pelo pilar (topos dos lances), de baixo para cima. */
export function lancesDoPilar(b: BuildingModel, p: Pilar) {
  const ps = pavimentosOrdenados(b);
  const i0 = p.nasce === 'fundacao' ? 0 : ps.findIndex((x) => x.id === p.nasce) + 1;
  const i1 = ps.findIndex((x) => x.id === p.morre);
  return i0 < 0 || i1 < 0 ? [] : ps.slice(i0, i1 + 1);
}

/** Seção do lance que chega ao pavimento `pav`. */
export const secaoNoLance = (p: Pilar, pav: string) => p.secoes?.find((s) => s.pavimento === pav)?.secao ?? p.secao;

/** Dimensões (m) da seção nos eixos locais: largura em x, altura em y. */
export const dimsSecao = (s: SecaoPilar): [number, number] => (s.tipo === 'ret' ? [s.b, s.h] : [s.d, s.d]);

/** Centro da seção a partir do ponto fixo (o ponto inserido é o canto/face indicado). */
export function centroPilar(p: Pick<Pilar, 'x' | 'y' | 'angulo' | 'ajuste'>, s: SecaoPilar): [number, number] {
  const [w, h] = dimsSecao(s);
  const leste = p.ajuste === 'l' || p.ajuste === 'ne' || p.ajuste === 'se', oeste = p.ajuste === 'o' || p.ajuste === 'no' || p.ajuste === 'so';
  const ox = leste ? -w / 2 : oeste ? w / 2 : 0;
  const oy = p.ajuste.startsWith('n') ? -h / 2 : p.ajuste.startsWith('s') ? h / 2 : 0;
  const a = (p.angulo * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a);
  return [p.x + ox * c - oy * sn, p.y + ox * sn + oy * c];
}

/** Contorno da seção no mundo (retângulo: 4 cantos; circular: 24 pontos). */
export function contornoPilar(p: Pick<Pilar, 'x' | 'y' | 'angulo' | 'ajuste'>, s: SecaoPilar): [number, number][] {
  const [cx, cy] = centroPilar(p, s);
  if (s.tipo === 'circ') return Array.from({ length: 24 }, (_, k) => [cx + (s.d / 2) * Math.cos((k * Math.PI) / 12), cy + (s.d / 2) * Math.sin((k * Math.PI) / 12)] as [number, number]);
  const a = (p.angulo * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a);
  return ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([i, j]) => { const u = (i * s.b) / 2, v = (j * s.h) / 2; return [cx + u * c - v * sn, cy + u * sn + v * c] as [number, number]; });
}

/** Ponto da máscara no mundo. */
export function mascaraParaMundo(m: Pick<Mascara, 'escala' | 'rotacao' | 'dx' | 'dy'>, x: number, y: number): [number, number] {
  const a = (m.rotacao * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const u = x * m.escala, v = y * m.escala;
  return [u * c - v * s + m.dx, u * s + v * c + m.dy];
}
