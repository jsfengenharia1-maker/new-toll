// Escadas, E4b: geometria de inserção e edição na planta (direção pelos dois cliques, mover, girar, seleção por clique ou janela,
// prévia com erro geométrico) e biblioteca de tipos de lance (exportar/importar `.json`). Núcleo puro; a interface só chama estas funções.
import { errosTipoLance, geometriaEscada, tiposLanceDisponiveis, type DadosComunsEscada, type Escada, type GeometriaEscada, type LanceEscada, type TipoLance } from './escadas';
import type { OpcoesCalculo } from './opcoes';
import type { BuildingModel } from './types';

type P = [number, number];
const RAD = Math.PI / 180;

// ---------------------------------------------------------------- direção e transformações

/** Normaliza o ângulo (graus) para [0, 360). */
export const normalizarAngulo = (a: number): number => { const r = ((a % 360) + 360) % 360; return Math.abs(r - 360) < 1e-9 ? 0 : Math.round(r * 1e9) / 1e9; };

/** Ângulo (graus, 0 = +x, anti-horário, em [0, 360)) do segmento inicio → ponto; `ortogonal` o arredonda ao múltiplo de 90° mais próximo (C8.34). Null com os pontos coincidentes. */
export function anguloDeInsercao(inicio: P, ponto: P, ortogonal = false): number | null {
  const dx = ponto[0] - inicio[0], dy = ponto[1] - inicio[1];
  if (Math.hypot(dx, dy) < 1e-9) return null;
  let a = Math.atan2(dy, dx) / RAD;
  if (ortogonal) a = Math.round(a / 90) * 90;
  return normalizarAngulo(a);
}

/** Gira o ponto `p` em torno de `c` (graus, anti-horário). */
export function girarPonto(p: P, c: P, graus: number): P {
  const co = Math.cos(graus * RAD), si = Math.sin(graus * RAD), x = p[0] - c[0], y = p[1] - c[1];
  return [c[0] + x * co - y * si, c[1] + x * si + y * co];
}

/** Nova posição da escada ao mover: só a origem muda (a geometria sai de origem + ângulo). */
export const moverEscada = (e: Pick<Escada, 'origem' | 'angulo'>, dx: number, dy: number): { origem: P; angulo: number } => ({ origem: [e.origem[0] + dx, e.origem[1] + dy], angulo: e.angulo });

/** Gira a escada de `delta` graus em torno do início do lance (a origem) ou de `centro` (C8.48). */
export function girarEscada(e: Pick<Escada, 'origem' | 'angulo'>, delta: number, centro?: P): { origem: P; angulo: number } {
  const o = centro ? girarPonto(e.origem, centro, delta) : ([e.origem[0], e.origem[1]] as P);
  return { origem: o, angulo: normalizarAngulo(e.angulo + delta) };
}

/** Ângulo de giro que leva a direção `de` à direção `para`, ambas a partir de `centro` (giro por pontos na tela), em (-180, 180]; null se algum ponto coincide com o centro. */
export function deltaPorPontos(centro: P, de: P, para: P): number | null {
  const a = anguloDeInsercao(centro, de), b = anguloDeInsercao(centro, para);
  if (a === null || b === null) return null;
  let d = b - a;
  if (d > 180) d -= 360; else if (d <= -180) d += 360;
  return d;
}

// ---------------------------------------------------------------- contorno, seleção

/** Polígonos em planta do que a escada ocupa (degraus iniciais, trechos e patamares de todos os lances). */
export const contornosEscada = (g: GeometriaEscada): P[][] => g.lances.flatMap((l) => l.planta);

function dentroDoPoligono(p: P, poli: P[]): boolean {
  let dentro = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [xi, yi] = poli[i], [xj, yj] = poli[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}
const distSeg = (p: P, a: P, b: P): number => {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
  const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
};

/** Escadas do grupo sob o ponto (C8.45/C8.46), a última lançada primeiro; `tol` (m) aceita o clique perto do contorno. */
export function escadasNoPonto(b: BuildingModel, grupo: string, p: P, tol = 0): string[] {
  const tipos = tiposLanceDisponiveis(b);
  return (b.escadas ?? []).filter((e) => e.grupo === grupo).filter((e) => {
    const polis = contornosEscada(geometriaEscada(e, tipos, b));
    return polis.some((poli) => dentroDoPoligono(p, poli) || (tol > 0 && poli.some((q, i) => distSeg(p, q, poli[(i + 1) % poli.length]) <= tol)));
  }).map((e) => e.id).reverse();
}

/**
 * Escadas do grupo capturadas pela janela [x0, y0, x1, y1] (C8.46). `dentro`: a caixa da escada inteira dentro da janela;
 * `cruza`: a caixa toca a janela.
 */
export function escadasNaJanela(b: BuildingModel, grupo: string, janela: [number, number, number, number], modo: 'dentro' | 'cruza' = 'dentro'): string[] {
  const [x0, y0, x1, y1] = [Math.min(janela[0], janela[2]), Math.min(janela[1], janela[3]), Math.max(janela[0], janela[2]), Math.max(janela[1], janela[3])];
  const tipos = tiposLanceDisponiveis(b);
  return (b.escadas ?? []).filter((e) => e.grupo === grupo).filter((e) => {
    const c = geometriaEscada(e, tipos, b).caixa;
    if (!c) return false;
    return modo === 'dentro' ? c[0] >= x0 && c[1] >= y0 && c[2] <= x1 && c[3] <= y1 : c[0] <= x1 && c[2] >= x0 && c[1] <= y1 && c[3] >= y0;
  }).map((e) => e.id);
}

// ---------------------------------------------------------------- prévia e validação da inserção

export interface PreviaEscada {
  escada: Escada;
  geometria: GeometriaEscada;
  /** Mensagens de erro geométrico (C8.36): impedem o lançamento. */
  erros: string[];
  avisos: string[];
}
export interface EntradaInsercao {
  grupo: string;
  origem: P;
  angulo: number;
  nome?: string;
  dados?: Partial<DadosComunsEscada>;
  lances: Omit<LanceEscada, 'id'>[];
}

/**
 * Escada temporária para o cursor (prévia do contorno) e para validar o lançamento. Os erros geométricos (altura que não fecha,
 * grupo inexistente, dimensões inválidas, tipo inexistente, lance sem pavimento) vêm de `geometriaEscada`; a interface mostra
 * as mensagens e não chama `escada.criar` enquanto houver erro.
 */
export function previaInsercao(b: BuildingModel, ent: EntradaInsercao): PreviaEscada {
  const base: Escada = { id: '__previa__', nome: ent.nome ?? 'E?', grupo: ent.grupo, origem: [ent.origem[0], ent.origem[1]], angulo: ent.angulo, largura: 1.2, piso: 0.28, espelho: 0.175, lances: [] };
  Object.assign(base, JSON.parse(JSON.stringify(ent.dados ?? {})));
  base.lances = ent.lances.map((l, i) => ({ ...JSON.parse(JSON.stringify(l)), id: `__l${i}__` }));
  const tipos = tiposLanceDisponiveis(b);
  const g = geometriaEscada(base, tipos, b);
  const erros = g.diagnosticos.filter((d) => d.severidade === 'erro').map((d) => d.mensagem);
  for (const l of base.lances) if (!tipos.some((t) => t.id === l.tipo)) erros.push(`Tipo de lance "${l.tipo}" não existe.`);
  if (!base.lances.length) erros.push('A escada precisa de ao menos um lance.');
  return { escada: base, geometria: g, erros, avisos: g.diagnosticos.filter((d) => d.severidade !== 'erro').map((d) => d.mensagem) };
}

// ---------------------------------------------------------------- biblioteca de tipos de lance (C8.17, C8.44)

export const FORMATO_TIPOS_LANCE = 'statikos-tipos-lance';
export type TipoLanceExportado = Omit<TipoLance, 'id' | 'predefinido' | 'desbloqueado'>;
export interface BibliotecaTiposLance { formato: typeof FORMATO_TIPOS_LANCE; versao: 1; tipos: TipoLanceExportado[] }

const semIdentidade = ({ id: _i, predefinido: _p, desbloqueado: _d, ...resto }: TipoLance): TipoLanceExportado => JSON.parse(JSON.stringify(resto)) as TipoLanceExportado;

/** Tipos da obra (todos ou os `ids`) no formato de troca entre obras. Predefinidos não se exportam: já existem em toda obra. */
export function exportarTiposLance(b: Pick<BuildingModel, 'tiposLance'>, ids?: string[]): BibliotecaTiposLance {
  const tipos = (b.tiposLance ?? []).filter((t) => !ids || ids.includes(t.id)).map(semIdentidade);
  return { formato: FORMATO_TIPOS_LANCE, versao: 1, tipos };
}

const CHAVES: (keyof TipoLanceExportado)[] = ['nome', 'tipologia', 'trechos', 'espessura', 'desnivelInicial', 'degrausIniciais', 'poco', 'degrausPatamar'];
/** Lê e valida um `.json` de biblioteca (texto ou objeto). Devolve os tipos válidos e uma mensagem por tipo ou por defeito do arquivo. */
export function lerBibliotecaTiposLance(entrada: unknown, o: Pick<OpcoesCalculo, 'escadaDesnivelMin'>): { tipos: TipoLanceExportado[]; erros: string[] } {
  let x = entrada;
  if (typeof x === 'string') { try { x = JSON.parse(x); } catch { return { tipos: [], erros: ['O arquivo não é um JSON válido.'] }; } }
  const raiz = x as Partial<BibliotecaTiposLance> | null;
  if (!raiz || typeof raiz !== 'object' || raiz.formato !== FORMATO_TIPOS_LANCE) return { tipos: [], erros: ['O arquivo não é uma biblioteca de tipos de lance (formato desconhecido).'] };
  if (raiz.versao !== 1) return { tipos: [], erros: [`Versão ${String(raiz.versao)} da biblioteca não suportada.`] };
  if (!Array.isArray(raiz.tipos)) return { tipos: [], erros: ['A biblioteca não traz a lista de tipos.'] };
  const tipos: TipoLanceExportado[] = [], erros: string[] = [];
  raiz.tipos.forEach((t: unknown, i: number) => {
    const r = `Tipo ${i + 1}`;
    if (!t || typeof t !== 'object') { erros.push(`${r}: formato inválido.`); return; }
    const extra = Object.keys(t).filter((k) => !(CHAVES as string[]).includes(k));
    if (extra.length) { erros.push(`${r}: campo(s) desconhecido(s) ${extra.join(', ')}.`); return; }
    const tt = t as TipoLanceExportado;
    const nomeOk = typeof tt.nome === 'string' && !!tt.nome.trim();
    const e = Array.isArray(tt.trechos) ? errosTipoLance({ ...tt, id: 'x' }, o) : ['faltam os trechos'];
    if (!nomeOk) e.unshift('falta o nome');
    if (e.length) erros.push(`${r}${nomeOk ? ` "${tt.nome}"` : ''}: ${e.join('; ')}.`);
    else tipos.push(semIdentidade({ ...tt, id: 'x' }));
  });
  return { tipos, erros };
}

/** Dois tipos são iguais quando todos os campos de conteúdo coincidem (a importação não duplica). */
export const tiposLanceIguais = (a: TipoLanceExportado, b: TipoLanceExportado): boolean =>
  JSON.stringify(CHAVES.map((k) => a[k] ?? null)) === JSON.stringify(CHAVES.map((k) => b[k] ?? null));

// ---------------------------------------------------------------- lista por grupo (memorial)

export interface EscadasDoGrupo { grupo: string; nomeGrupo: string; escadas: { nome: string; origem: P; angulo: number; lances: number; degraus: number }[] }
/** Escadas agrupadas por grupo de pavimentos, na ordem dos grupos (memorial: lista de escadas por grupo). */
export function escadasPorGrupo(b: BuildingModel): EscadasDoGrupo[] {
  const tipos = tiposLanceDisponiveis(b);
  return b.grupos.map((g) => ({
    grupo: g.id, nomeGrupo: g.nome,
    escadas: (b.escadas ?? []).filter((e) => e.grupo === g.id).map((e) => {
      const ge = geometriaEscada(e, tipos, b);
      return { nome: e.nome, origem: [e.origem[0], e.origem[1]] as P, angulo: e.angulo, lances: ge.lances.length, degraus: ge.lances.reduce((s, l) => s + l.degraus.total, 0) };
    }),
  })).filter((g) => g.escadas.length);
}

// ---------------------------------------------------------------- desenho em planta (camada, formas, locação)

export interface DesenhoPlantaEscada {
  /** Polígonos (degraus iniciais, trechos e patamares) de todos os lances. */
  contornos: P[][];
  /** Degraus em traço fino. */
  degraus: [P, P][];
  /** Setas de subida (haste e pontas), cada uma como segmento. */
  setas: [P, P][];
  /** Ponto da referência (nome) da escada: centro da caixa; null sem geometria. */
  rotulo: P | null;
  nome: string;
}
/** Primitivas 2D da escada para a planta, as formas e a locação (contorno, degraus, setas de subida, referência). */
export function desenhoPlantaEscada(g: GeometriaEscada): DesenhoPlantaEscada {
  const c = g.caixa;
  return {
    contornos: contornosEscada(g),
    degraus: g.lances.flatMap((l) => l.degrausLinhas.map((d): [P, P] => [d.a, d.b])),
    setas: g.lances.flatMap((l) => l.setas),
    rotulo: c ? [(c[0] + c[2]) / 2, (c[1] + c[3]) / 2] : null,
    nome: g.escada.nome,
  };
}
