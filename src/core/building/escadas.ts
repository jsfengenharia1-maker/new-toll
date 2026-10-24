// Escadas (frente E4a): modelo de dados, tipos de lance, geometria e cargas próprias. Só o núcleo: lançamento e edição na
// planta (E4b), cálculo por casca (E4c), armadura (E4d) e relatório (E4e) usam este modelo.
//
// Conceitos (manual do programa de referência, cap. 8): ESCADA = conjunto de lances entre os pisos de uma circulação vertical;
// LANCE (aqui `LanceEscada`) = o trecho da escada entre dois pavimentos, escolhido num TIPO DE LANCE (`TipoLance`) que dá a
// tipologia (lance reto, meia-volta, quarto de volta...), o número de degraus de cada trecho inclinado e do patamar, a
// espessura e o desnível inicial; PATAMAR = trecho horizontal entre dois trechos inclinados. Os dados comuns (largura, piso,
// espelho, giro, execução, cargas) valem para todos os lances; dados diferentes pedem escadas separadas.
//
// Convenções (todas "a confirmar" com o manual, ver `docs/pendencias-usuario.md`):
// - `origem` é o centro da borda de partida do primeiro lance (plantas em m, eixos da obra); `angulo` (graus, 0 = +x) é o
//   sentido de subida do primeiro trecho. Em cada patamar a escada gira para o lado do `giro` ao subir (esq/dir).
// - O n-ésimo degrau de um trecho é o espelho que chega ao patamar (ou ao piso de cima). Com `ultimoDegrau: 'patamar'` o piso
//   desse degrau é o próprio patamar (a laje inclinada tem (n − 1) pisos de comprimento); com 'laje' o último piso fica sobre
//   a laje inclinada (n pisos). A inclinação é sempre espelho/piso; a laje inclinada começa na cota do pé do trecho.
// - `desnivelInicial` d: a base do lance fica d abaixo da cota do piso de partida; o conjunto de degraus (iniciais +
//   trechos + patamares) vence H + d.
// - Degraus iniciais ficam sobre o piso, antes da laje inclinada; degraus do patamar ficam sobre o patamar, junto da saída.
// - Vão para o pré-dimensionamento: soma dos comprimentos horizontais dos trechos e da profundidade dos patamares livres
//   consecutivos; o patamar apoiado separa os vãos. Espessura = vão / 30, em cm inteiros, não menor que o mínimo.
// Núcleo puro; kN, m.
import { BLOCOS } from './lajes';
import { opcoesEmUso, perfilDe, type OpcoesCalculo } from './opcoes';
import { pavimentosOrdenados, type BuildingModel, type Pavimento } from './types';
import type { Diagnostico } from './verify';
import type { P } from '../geom/faces';

export type P3 = [number, number, number];
const GAMA_CONCRETO = 25; // kN/m³ (NBR 6120), o mesmo de `GAMA_CONCRETO` em tiposLaje.ts
/** Pesos específicos padrão das paredes e tirantes sob o patamar (padrão do CYPECAD, 'a confirmar'): alvenaria 15,70 e concreto 24,53 kN/m³. */
export const GAMA_PAREDE_ALVENARIA = 15.7;
export const GAMA_PAREDE_CONCRETO = 24.53;
/** Peso específico do apoio do patamar: informado (`gama`) > bloco escolhido (`BLOCOS`) > padrão por tipo. */
export function gamaApoioPatamar(a: { tipo: string; bloco?: keyof typeof BLOCOS; gama?: number }): number {
  if (a.gama !== undefined) return a.gama;
  if (a.tipo === 'concreto') return GAMA_PAREDE_CONCRETO;
  return a.bloco ? BLOCOS[a.bloco].gama : GAMA_PAREDE_ALVENARIA;
}

// ---------------------------------------------------------------- modelo

/** Tipologia de lances e patamares (C8.3, C8.22). */
export type Tipologia = 'reto' | 'meiaVolta2' | 'quartoVolta3' | 'voltaInteira2' | 'consecutivos2' | 'meiaVoltaN' | 'quartoVoltaN';
export const TIPOLOGIAS: { v: Tipologia; rotulo: string; /** número de trechos fixo ou `null` (n ≥ 2) */ trechos: number | null; /** aceita vão central (poço) */ poco: boolean; giro: 'reta' | 'quarto' | 'meia' }[] = [
  { v: 'reto', rotulo: 'Lance reto', trechos: 1, poco: false, giro: 'reta' },
  { v: 'meiaVolta2', rotulo: 'Dois lances com patamar de meia-volta', trechos: 2, poco: true, giro: 'meia' },
  { v: 'quartoVolta3', rotulo: 'Três lances com patamares de quarto de volta', trechos: 3, poco: false, giro: 'quarto' },
  { v: 'voltaInteira2', rotulo: 'Dois lances com patamar de volta inteira', trechos: 2, poco: false, giro: 'meia' },
  { v: 'consecutivos2', rotulo: 'Dois lances consecutivos com patamar intermediário', trechos: 2, poco: false, giro: 'reta' },
  { v: 'meiaVoltaN', rotulo: 'N lances com patamares de meia-volta', trechos: null, poco: true, giro: 'meia' },
  { v: 'quartoVoltaN', rotulo: 'N lances com patamares de quarto de volta', trechos: null, poco: false, giro: 'quarto' },
];
export const tipologiaInfo = (v: Tipologia) => TIPOLOGIAS.find((t) => t.v === v)!;

/**
 * Tipo de lance (C8.16, C8.18–C8.25): reutilizável em vários lances e escadas. `espessura` ausente = pré-dimensionada
 * (vão/30). `desnivelInicial` = 0 ou ≥ opção `escadaDesnivelMin`. `trechos` = degraus de cada trecho inclinado (inteiros ≥ 1).
 * `poco` = largura do vão central (m), só com patamar de meia-volta. `degrausPatamar` = degraus construídos sobre cada patamar.
 */
export interface TipoLance {
  id: string;
  nome: string;
  tipologia: Tipologia;
  trechos: number[];
  espessura?: number;
  desnivelInicial?: number;
  degrausIniciais?: number;
  poco?: number;
  degrausPatamar?: number;
  /** Id do tipo predefinido de que a cópia da obra veio (`pre:...`). */
  predefinido?: string;
  /** Desbloqueio manual (C8.43): enquanto o tipo está em uso por um lance, só se edita com o desbloqueio. */
  desbloqueado?: true;
}

/** Apoio de uma borda do patamar (C8.26–C8.30). Tirante: pendurado no piso de cima; parede: alvenaria ou concreto sob a borda; conector: em viga ou muro. */
export type TipoApoioPatamar = 'tirante' | 'alvenaria' | 'concreto' | 'conector';
export interface ApoioBorda {
  /** frontal = borda oposta à chegada; lateral = bordas paralelas ao sentido da chegada. */
  borda: 'frontal' | 'lateral';
  tipo: TipoApoioPatamar;
  /** Largura da parede ou do tirante (m). */
  largura: number;
  /** Tipo de bloco (`BLOCOS`) da alvenaria e do tirante; ausente = `GAMA_PAREDE_ALVENARIA`. */
  bloco?: keyof typeof BLOCOS;
  /** Peso específico informado (kN/m³), no lugar do padrão do tipo. */
  gama?: number;
}
export interface ApoioPatamar { apoiado: boolean; apoios?: ApoioBorda[] }

/** Lance da escada: um trecho entre dois pavimentos, repetido em `repetir` pavimentos seguidos (C8.15, C8.31). */
export interface LanceEscada {
  id: string;
  /** Id do tipo (obra ou predefinido). */
  tipo: string;
  /** Pavimento de partida; ausente = o seguinte ao do lance anterior (o primeiro lance parte do mais baixo do grupo). */
  pavimento?: string;
  /** Cota do piso de partida (m); ausente = cota do pavimento. Vale para o primeiro pavimento do lance. */
  cotaInicial?: number;
  /** Número de lances iguais em pavimentos seguidos; ausente = 1. */
  repetir?: number;
  /** Apoio de cada patamar, na ordem da subida; patamar sem registro = livre. */
  patamares?: ApoioPatamar[];
}

/** Escada (C8.4, C8.8–C8.14). Só o que difere do padrão é gravado. */
export interface Escada {
  id: string;
  nome: string;
  /** Grupo de pavimentos em cuja planta a escada está lançada. */
  grupo: string;
  origem: P;
  angulo: number;
  largura: number;
  piso: number;
  espelho: number;
  /** Lado para onde a escada gira ao subir; padrão esquerda. */
  giro?: 'dir';
  /** Último degrau formado pelo patamar (padrão) ou sobre a laje inclinada. */
  ultimoDegrau?: 'laje';
  /** Degraus concretados com a laje (padrão) ou em alvenaria. */
  execucao?: 'alvenaria';
  /** Bloco da alvenaria dos degraus (padrão cerâmico). */
  bloco?: keyof typeof BLOCOS;
  /** Peso dos corrimãos (kN/m, total para um ou dois); padrão 0. */
  corrimao?: number;
  /** Revestimento (kN/m² da projeção horizontal); ausente = opção `escadaRevestimento`. */
  revestimento?: number;
  /** Sobrecarga (kN/m²); ausente = opção conforme o acesso. */
  sobrecarga?: number;
  /** Acesso ao público (sobrecarga de 3,0 em vez de 2,5 kN/m²). */
  acesso?: 'publico';
  /** Armadura e ligações da escada (E4d): tabela, dados do apoio do primeiro lance e armaduras editadas e bloqueadas. */
  armadura?: ArmaduraEscadaDados;
  lances: LanceEscada[];
}

/** Famílias de barras de um trecho: inferior longitudinal (principal) e transversal (distribuição); superior no início, no fim e transversal. */
export type FamiliaEscada = 'infL' | 'infT' | 'supIni' | 'supFim' | 'supT';
/** Armadura editada e bloqueada (E4d, como a R2): o recálculo só a verifica. `lance` = número do lance na escada (1...), `trecho` = 'L1', 'P1'... */
export interface BloqueioEscada { lance: number; trecho: string; familia: FamiliaEscada; phi: number; s: number }
export interface ArmaduraEscadaDados {
  /** Id da tabela de armadura das lajes usada pela escada; ausente = a padrão. */
  tabela?: string;
  /** Comprimento disponível (cm) para ancorar as esperas em viga chata e profundidade da fundação (cm): substituem as opções, só nesta escada. */
  ancoragemViga?: number;
  profundidadeFundacao?: number;
  bloqueadas?: BloqueioEscada[];
}

// ---------------------------------------------------------------- tipos de lance predefinidos e acesso

/** Tipos predefinidos (C8.16): ids `pre:...`; ao usar num lance, o comando copia para a obra. Número de degraus para pé-direito de ~3 m. */
export const TIPOS_LANCE_PREDEFINIDOS: TipoLance[] = [
  { id: 'pre:reto-18', nome: 'Reto, 18 degraus', tipologia: 'reto', trechos: [18] },
  { id: 'pre:reto-12', nome: 'Reto, 12 degraus', tipologia: 'reto', trechos: [12] },
  { id: 'pre:meia-volta-9-9', nome: 'Meia-volta, 9 + 9 degraus (poço 10 cm)', tipologia: 'meiaVolta2', trechos: [9, 9], poco: 0.1 },
  { id: 'pre:quarto-6-6-6', nome: 'Quarto de volta, 6 + 6 + 6 degraus', tipologia: 'quartoVolta3', trechos: [6, 6, 6] },
  { id: 'pre:volta-inteira-9-9', nome: 'Volta inteira, 9 + 9 degraus', tipologia: 'voltaInteira2', trechos: [9, 9] },
  { id: 'pre:consecutivos-9-9', nome: 'Dois lances consecutivos, 9 + 9 degraus', tipologia: 'consecutivos2', trechos: [9, 9] },
];

export const tiposLanceDisponiveis = (b: Pick<BuildingModel, 'tiposLance'>): TipoLance[] => [...(b.tiposLance ?? []), ...TIPOS_LANCE_PREDEFINIDOS];
export const tipoLancePor = (b: Pick<BuildingModel, 'tiposLance'>, id: string): TipoLance | undefined => tiposLanceDisponiveis(b).find((t) => t.id === id);
/** Ids dos tipos de lance em uso nas escadas (E4b bloqueia a edição de tipo usado). */
export const tiposLanceEmUso = (b: Pick<BuildingModel, 'escadas'>): Set<string> => new Set((b.escadas ?? []).flatMap((e) => e.lances.map((l) => l.tipo)));
/** Tipo da obra bloqueado para edição (C8.43): em uso por algum lance e sem desbloqueio manual. */
export const tipoLanceBloqueado = (b: Pick<BuildingModel, 'escadas' | 'tiposLance'>, id: string): boolean => {
  const t = b.tiposLance?.find((x) => x.id === id);
  return !!t && !t.desbloqueado && tiposLanceEmUso(b).has(id);
};

/** Dados comuns de uma escada (sem identidade, posição nem lances): o que fica como padrão da próxima escada lançada (C8.38). */
export type DadosComunsEscada = Pick<Escada, 'largura' | 'piso' | 'espelho'> & Partial<Pick<Escada, 'giro' | 'ultimoDegrau' | 'execucao' | 'bloco' | 'corrimao' | 'revestimento' | 'sobrecarga' | 'acesso'>>;
export function dadosComunsDe(e: Escada): DadosComunsEscada {
  const { largura, piso, espelho, giro, ultimoDegrau, execucao, bloco, corrimao, revestimento, sobrecarga, acesso } = e;
  const o: DadosComunsEscada = { largura, piso, espelho };
  const extra = { giro, ultimoDegrau, execucao, bloco, corrimao, revestimento, sobrecarga, acesso };
  for (const [k, v] of Object.entries(extra)) if (v !== undefined) (o as Record<string, unknown>)[k] = v;
  return o;
}

/**
 * Nome da próxima escada (C8.35): com `ultimo` terminado em número, o seguinte livre com o mesmo prefixo ("E3" → "E4");
 * sem `ultimo`, "E" + o menor número acima de todos os "E<n>" da obra.
 */
export function nomeSequencial(b: Pick<BuildingModel, 'escadas'>, ultimo?: string): string {
  const nomes = new Set((b.escadas ?? []).map((e) => e.nome));
  const m = /^(.*?)(\d+)$/.exec(ultimo?.trim() ?? '');
  if (m) { for (let n = Number(m[2]) + 1; ; n++) if (!nomes.has(m[1] + n)) return m[1] + n; }
  if (ultimo?.trim()) { for (let n = 2; ; n++) if (!nomes.has(`${ultimo.trim()} ${n}`)) return `${ultimo.trim()} ${n}`; }
  const maior = Math.max(0, ...[...nomes].map((n) => /^E(\d+)$/.exec(n)).filter((x): x is RegExpExecArray => !!x).map((x) => Number(x[1])));
  return `E${maior + 1}`;
}

// ---------------------------------------------------------------- validação dos dados

const fmt = (v: number, d = 3) => v.toFixed(d).replace('.', ',');
const cm = (v: number) => (v * 100).toFixed(1).replace('.', ',').replace(/,0$/, '');
const inteiro = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x);

/** Erros de consistência de um tipo de lance (vazio = coerente). */
export function errosTipoLance(t: TipoLance, o: Pick<OpcoesCalculo, 'escadaDesnivelMin'>): string[] {
  const e: string[] = [], info = tipologiaInfo(t.tipologia);
  if (!info) return [`tipologia "${String(t.tipologia)}" desconhecida`];
  if (!t.trechos.length || !t.trechos.every((n) => inteiro(n) && n >= 1)) e.push('o número de degraus de cada trecho deve ser inteiro e maior que zero');
  else if (info.trechos !== null && t.trechos.length !== info.trechos) e.push(`${info.rotulo.toLowerCase()} tem ${info.trechos} trecho(s) inclinado(s), mas foram informados ${t.trechos.length}`);
  else if (info.trechos === null && t.trechos.length < 2) e.push('a tipologia com N lances pede ao menos 2 trechos');
  if (t.degrausIniciais !== undefined && (!inteiro(t.degrausIniciais) || t.degrausIniciais < 0)) e.push('os degraus iniciais devem ser um inteiro ≥ 0');
  if (t.degrausPatamar !== undefined && (!inteiro(t.degrausPatamar) || t.degrausPatamar < 0)) e.push('os degraus do patamar devem ser um inteiro ≥ 0');
  if (t.degrausPatamar && t.trechos.length < 2) e.push('lance reto não tem patamar para receber degraus');
  if (t.desnivelInicial !== undefined && t.desnivelInicial !== 0 && !(t.desnivelInicial >= o.escadaDesnivelMin / 100 - 1e-9)) e.push(`o desnível inicial deve ser zero ou pelo menos ${cm(o.escadaDesnivelMin / 100)} cm`);
  if (t.poco !== undefined && t.poco < 0) e.push('o vão central (poço) não pode ser negativo');
  if (t.poco && !info.poco) e.push('o vão central (poço) só existe com patamar de meia-volta');
  if (t.espessura !== undefined && !(t.espessura >= 0.05 && t.espessura <= 0.5)) e.push('a espessura deve estar entre 5 e 50 cm');
  return e;
}

// ---------------------------------------------------------------- geometria

export interface TrechoGeo {
  tipo: 'lance' | 'patamar';
  /** Índice do trecho inclinado (0...) ou do patamar (0...). */
  indice: number;
  /** Degraus (espelhos) do trecho; no patamar, os construídos sobre ele. */
  degraus: number;
  /** Polígono em 3D (x, y, cota) no plano da laje; o patamar é horizontal. */
  poligono: P3[];
  planta: P[];
  cotaIni: number;
  cotaFim: number;
  /** Comprimento horizontal do trecho inclinado (m); 0 no patamar. */
  comprimento: number;
  /** Área em planta (m²) e área da superfície inclinada (m²). */
  areaPlanta: number;
  areaSuperficie: number;
}
export interface DegrauGeo { a: P; b: P; /** cota do piso do degrau */ cota: number; /** trecho inclinado (-1 = degraus iniciais sobre o piso) */ trecho: number }
export interface SuperficieEscada { origem: 'degraus iniciais' | 'degraus do patamar'; planta: P[]; /** carga permanente média dos degraus (kN/m²), sem sobrecarga */ permanente: number; patamar?: number }
export interface LinhaApoio {
  patamar: number; borda: 'frontal' | 'lateral'; tipo: TipoApoioPatamar; a: P; b: P;
  /** kN/m (0 no conector, que recebe a reação de extremidade na E4c) */
  valor: number;
  /** Onde o peso é aplicado: no elemento sob a borda apoiada ou no do piso de cima (tirante). */
  sobre: 'abaixo' | 'acima';
  descricao: string;
}
export interface CargasLance {
  /** kN/m² da superfície inclinada: laje, degraus e total. */
  pesoLaje: number; pesoDegraus: number; pesoInclinada: number;
  /** kN/m² da projeção horizontal (peso próprio, permanente com revestimento, sobrecarga). */
  pesoProjecao: number; permanenteProjecao: number; sobrecarga: number;
  /** Patamar: peso próprio e permanente (kN/m²). */
  pesoPatamar: number; permanentePatamar: number;
  revestimento: number; corrimao: number;
  superficies: SuperficieEscada[];
  linhas: LinhaApoio[];
  volumeConcreto: number;
}
export interface LanceGeo {
  lance: LanceEscada;
  tipo?: TipoLance;
  /** Posição na escada (0...), contando as repetições. */
  indice: number;
  repeticao: number;
  pavimento?: string;
  pavimentoTopo?: string;
  /** Cota do piso de partida, da base da escada (piso − desnível inicial) e do piso de chegada. */
  cotaPiso: number; cotaBase: number; cotaTopo: number;
  /** Desnível entre os pisos (H). */
  desnivel: number;
  degraus: { total: number; iniciais: number; trechos: number[]; patamar: number };
  /** Altura vencida pelos degraus (n × espelho − desnível inicial) e diferença para o desnível entre pisos. */
  alturaVencida: number; diferencaAltura: number;
  espessura: { valor: number; automatica: boolean; vaoMax: number };
  trechos: TrechoGeo[];
  degrausLinhas: DegrauGeo[];
  setas: [P, P][];
  /** Polígonos em planta de tudo o que o lance ocupa (degraus iniciais, trechos e patamares). */
  planta: P[][];
  cargas: CargasLance;
}
export interface GeometriaEscada {
  escada: Escada;
  lances: LanceGeo[];
  /** Caixa [x0, y0, x1, y1] de tudo o que a escada ocupa em planta; vazia sem lances calculáveis. */
  caixa: [number, number, number, number] | null;
  diagnosticos: Diagnostico[];
}

const soma = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
const mul = (a: P, s: number): P => [a[0] * s, a[1] * s];
const esq = (h: P): P => [-h[1], h[0]];
const area = (p: P[]) => Math.abs(p.reduce((s, q, i) => s + q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1], 0)) / 2;
const ret = (a: P, b: P, c: P, d: P): P[] => [a, b, c, d];
const com = (p: P[], z: number | number[]): P3[] => p.map((q, i) => [q[0], q[1], Array.isArray(z) ? z[i] : z]);

/** Instâncias dos lances da escada: um por pavimento, na ordem da subida. */
export function instanciasDaEscada(b: BuildingModel, e: Escada): { lance: LanceEscada; indice: number; repeticao: number; pavimento?: Pavimento; erro?: string }[] {
  const ps = pavimentosOrdenados(b), doGrupo = ps.filter((p) => p.grupo === e.grupo);
  let prox = doGrupo.length ? ps.indexOf(doGrupo[0]) : -1, k = 0;
  const out: { lance: LanceEscada; indice: number; repeticao: number; pavimento?: Pavimento; erro?: string }[] = [];
  for (const l of e.lances) {
    const n = Math.max(1, Math.floor(l.repetir ?? 1));
    const ini = l.pavimento ? ps.findIndex((p) => p.id === l.pavimento) : prox;
    for (let j = 0; j < n; j++) {
      const p = ini >= 0 ? ps[ini + j] : undefined;
      out.push({ lance: l, indice: k++, repeticao: j, pavimento: p, ...(p ? {} : { erro: l.pavimento && ini < 0 ? `o pavimento "${l.pavimento}" não existe` : 'não há pavimento para este lance' }) });
    }
    prox = ini >= 0 ? ini + n : -1;
  }
  return out;
}

/**
 * Geometria da escada: para cada lance (e cada repetição), os trechos inclinados e os patamares como polígonos 3D, o
 * contorno em planta, os degraus, a altura vencida e as cargas próprias. Não lança exceção: os problemas vêm em `diagnosticos`.
 */
export function geometriaEscada(e: Escada, tipos: TipoLance[], b: BuildingModel): GeometriaEscada {
  const o = opcoesEmUso(b.opcoes, perfilDe(b));
  const diag: Diagnostico[] = [];
  const pre = `Escada ${e.nome}`;
  const erro = (codigo: string, mensagem: string) => diag.push({ codigo, severidade: 'erro', elementos: [e.id], mensagem });
  const aviso = (codigo: string, mensagem: string) => diag.push({ codigo, severidade: 'aviso', elementos: [e.id], mensagem });
  const ps = pavimentosOrdenados(b);
  const L = e.largura, p = e.piso, esp = e.espelho;
  const lances: LanceGeo[] = [];

  if (!b.grupos.some((g) => g.id === e.grupo)) erro('ESCADA_GRUPO', `${pre}: o grupo "${e.grupo}" não existe.`);
  if (!(L > 0) || !(p > 0) || !(esp > 0)) { erro('ESCADA_DIMENSOES', `${pre}: largura, piso e espelho devem ser positivos.`); return { escada: e, lances, caixa: null, diagnosticos: diag }; }
  if (!e.lances.length) aviso('ESCADA_SEM_LANCES', `${pre}: a escada não tem lances.`);

  // verificações dos dados comuns (avisos configuráveis)
  const blondel = 2 * esp + p;
  if (blondel < o.escadaBlondelMin / 100 - 1e-9 || blondel > o.escadaBlondelMax / 100 + 1e-9)
    aviso('ESCADA_BLONDEL', `${pre}: 2e + p = ${cm(blondel)} cm fora de ${fmt(o.escadaBlondelMin, 0)} a ${fmt(o.escadaBlondelMax, 0)} cm (relação de Blondel, NBR 9077 [a confirmar]).`);
  if (esp < o.escadaEspelhoMin / 100 - 1e-9 || esp > o.escadaEspelhoMax / 100 + 1e-9)
    aviso('ESCADA_DIMENSOES', `${pre}: espelho de ${cm(esp)} cm fora de ${fmt(o.escadaEspelhoMin, 0)} a ${fmt(o.escadaEspelhoMax, 0)} cm (NBR 9050 [a confirmar]).`);
  if (L < o.escadaLarguraMin / 100 - 1e-9)
    aviso('ESCADA_DIMENSOES', `${pre}: largura de ${cm(L)} cm menor que ${fmt(o.escadaLarguraMin, 0)} cm (NBR 9050 [a confirmar]).`);

  const cosA = p / Math.hypot(p, esp);
  const gamaDegrau = e.execucao === 'alvenaria' ? BLOCOS[e.bloco ?? 'ceramico'].gama : GAMA_CONCRETO;
  const rev = e.revestimento ?? o.escadaRevestimento;
  const q = e.sobrecarga ?? (e.acesso === 'publico' ? o.escadaSobrecargaPublica : o.escadaSobrecargaPrivada);
  const g = e.giro === 'dir' ? -1 : 1;
  const th = (e.angulo * Math.PI) / 180, h0: P = [Math.cos(th), Math.sin(th)];
  const ultimoPatamar = e.ultimoDegrau !== 'laje';

  for (const inst of instanciasDaEscada(b, e)) {
    const lance = inst.lance, rot = `${pre}, lance ${inst.indice + 1}${inst.pavimento ? ` (${inst.pavimento.nome})` : ''}`;
    const tipo = tipos.find((t) => t.id === lance.tipo);
    if (!tipo) { erro('ESCADA_TIPO_INEXISTENTE', `${rot}: o tipo de lance "${lance.tipo}" não existe.`); continue; }
    if (!inst.pavimento) { erro('ESCADA_PAVIMENTO', `${rot}: ${inst.erro}.`); continue; }
    const pav = inst.pavimento;
    if (pav.grupo !== e.grupo) { erro('ESCADA_PAVIMENTO', `${rot}: o pavimento de partida não pertence ao grupo da escada.`); continue; }
    const iTopo = ps.findIndex((x) => x.id === pav.id) + 1, topo = ps[iTopo];
    if (!topo) { erro('ESCADA_SEM_TOPO', `${rot}: não há pavimento acima de ${pav.nome} para a escada chegar.`); continue; }
    const et = errosTipoLance(tipo, o);
    if (et.length) { erro(et[0].includes('tipologia') || et[0].includes('trecho') ? 'ESCADA_TIPOLOGIA' : et[0].includes('desnível') ? 'ESCADA_DESNIVEL' : et[0].includes('poço') ? 'ESCADA_POCO' : 'ESCADA_TIPOLOGIA', `${rot}: tipo "${tipo.nome}": ${et.join('; ')}.`); continue; }

    const z0 = inst.repeticao === 0 && lance.cotaInicial !== undefined ? lance.cotaInicial : pav.cota;
    const dIni = tipo.desnivelInicial ?? 0, zBase = z0 - dIni, zTopo = topo.cota, H = zTopo - z0;
    const k = tipo.degrausIniciais ?? 0, kp = tipo.degrausPatamar ?? 0, m = tipo.trechos.length;
    const total = k + tipo.trechos.reduce((s, x) => s + x, 0) + kp * (m - 1);
    const vencida = total * esp - dIni, dif = vencida - H;
    if (Math.abs(dif) > 0.001) erro('ESCADA_ALTURA', `${rot}: ${total} degraus × ${fmt(esp)} m = ${fmt(total * esp)} m${dIni ? ` menos o desnível inicial de ${fmt(dIni)} m` : ''} não fecha o desnível de ${fmt(H)} m entre os pisos (diferença de ${cm(Math.abs(dif))} cm).`);

    const tip = tipologiaInfo(tipo.tipologia), poco = tip.poco ? tipo.poco ?? 0 : 0;
    const trechos: TrechoGeo[] = [], linhas: DegrauGeo[] = [], setas: [P, P][] = [], planta: P[][] = [], superficies: SuperficieEscada[] = [], apoiosLinhas: LinhaApoio[] = [];
    const runs: number[] = [];
    let S: P = e.origem, h: P = h0, z = zBase, volumeConcreto = 0, ok = true;
    const patamares = lance.patamares ?? [];

    // degraus iniciais sobre o piso
    if (k > 0) {
      const a = esq(h), Fin = soma(S, mul(h, k * p));
      const pl = ret(soma(S, mul(a, -L / 2)), soma(Fin, mul(a, -L / 2)), soma(Fin, mul(a, L / 2)), soma(S, mul(a, L / 2)));
      planta.push(pl);
      superficies.push({ origem: 'degraus iniciais', planta: pl, permanente: (gamaDegrau * esp) / 2 });
      for (let j = 0; j < k; j++) linhas.push({ a: soma(soma(S, mul(h, j * p)), mul(a, -L / 2)), b: soma(soma(S, mul(h, j * p)), mul(a, L / 2)), cota: z + (j + 1) * esp, trecho: -1 });
      if (e.execucao !== 'alvenaria') volumeConcreto += k * ((esp * p) / 2) * L;
      S = Fin; z += k * esp;
    }

    for (let i = 0; i < m && ok; i++) {
      const n = tipo.trechos[i], R = (n - (ultimoPatamar ? 1 : 0)) * p;
      if (R <= 1e-9) { erro('ESCADA_TRECHO_CURTO', `${rot}: o trecho ${i + 1} (${n} degrau${n > 1 ? 's' : ''}) não tem comprimento inclinado com o último degrau no patamar; use mais degraus ou ultimoDegrau "laje".`); ok = false; break; }
      const a = esq(h), E = soma(S, mul(h, R)), zf = z + (R * esp) / p, zLand = z + n * esp;
      const pl = ret(soma(S, mul(a, -L / 2)), soma(E, mul(a, -L / 2)), soma(E, mul(a, L / 2)), soma(S, mul(a, L / 2)));
      const areaSup = (L * R) / cosA;
      trechos.push({ tipo: 'lance', indice: i, degraus: n, poligono: com(pl, [z, zf, zf, z]), planta: pl, cotaIni: z, cotaFim: zf, comprimento: R, areaPlanta: L * R, areaSuperficie: areaSup });
      planta.push(pl); runs.push(R); setas.push([S, E]);
      for (let j = 0; j < n; j++) linhas.push({ a: soma(soma(S, mul(h, j * p)), mul(a, -L / 2)), b: soma(soma(S, mul(h, j * p)), mul(a, L / 2)), cota: z + (j + 1) * esp, trecho: i });
      if (i === m - 1) { z = zLand; break; }

      // patamar depois do trecho i
      let land: P[], proxS: P, proxH: P, strip: P[] | null = null;
      const frontal: [P, P] = [[0, 0], [0, 0]], lateral: [P, P][] = [];
      if (tip.giro === 'quarto') {
        const nn = mul(esq(h), g);
        land = ret(soma(E, mul(a, -L / 2)), soma(soma(E, mul(a, -L / 2)), mul(h, L)), soma(soma(E, mul(a, L / 2)), mul(h, L)), soma(E, mul(a, L / 2)));
        const C = soma(E, mul(h, L / 2));
        proxS = soma(C, mul(nn, L / 2)); proxH = nn;
        if (kp) strip = ret(soma(soma(C, mul(nn, L / 2 - kp * p)), mul(h, -L / 2)), soma(soma(C, mul(nn, L / 2)), mul(h, -L / 2)), soma(soma(C, mul(nn, L / 2)), mul(h, L / 2)), soma(soma(C, mul(nn, L / 2 - kp * p)), mul(h, L / 2)));
        frontal[0] = soma(soma(E, mul(h, L)), mul(a, -L / 2)); frontal[1] = soma(soma(E, mul(h, L)), mul(a, L / 2));
        lateral.push([soma(E, mul(a, -L / 2)), soma(soma(E, mul(a, -L / 2)), mul(h, L))], [soma(E, mul(a, L / 2)), soma(soma(E, mul(a, L / 2)), mul(h, L))]);
      } else if (tip.giro === 'meia') {
        const nn = mul(esq(h), g), w = poco;
        const p0 = soma(E, mul(nn, -L / 2)), p1 = soma(E, mul(nn, L / 2 + w + L));
        land = ret(p0, soma(p0, mul(h, L)), soma(p1, mul(h, L)), p1);
        proxS = soma(E, mul(nn, L + w)); proxH = mul(h, -1);
        if (kp) { const q0 = soma(E, mul(nn, L / 2 + w)); strip = ret(q0, soma(q0, mul(h, kp * p)), soma(soma(q0, mul(nn, L)), mul(h, kp * p)), soma(q0, mul(nn, L))); }
        frontal[0] = soma(p0, mul(h, L)); frontal[1] = soma(p1, mul(h, L));
        lateral.push([p0, soma(p0, mul(h, L))], [p1, soma(p1, mul(h, L))]);
      } else {
        land = ret(soma(E, mul(a, -L / 2)), soma(soma(E, mul(a, -L / 2)), mul(h, L)), soma(soma(E, mul(a, L / 2)), mul(h, L)), soma(E, mul(a, L / 2)));
        proxS = soma(E, mul(h, L)); proxH = h;
        if (kp) strip = ret(soma(soma(E, mul(h, L - kp * p)), mul(a, -L / 2)), soma(soma(E, mul(h, L)), mul(a, -L / 2)), soma(soma(E, mul(h, L)), mul(a, L / 2)), soma(soma(E, mul(h, L - kp * p)), mul(a, L / 2)));
        frontal[0] = soma(soma(E, mul(h, L)), mul(a, -L / 2)); frontal[1] = soma(soma(E, mul(h, L)), mul(a, L / 2));
        lateral.push([soma(E, mul(a, -L / 2)), soma(soma(E, mul(a, -L / 2)), mul(h, L))], [soma(E, mul(a, L / 2)), soma(soma(E, mul(a, L / 2)), mul(h, L))]);
      }
      if (kp * p > L + 1e-9) { erro('ESCADA_PATAMAR_DEGRAUS', `${rot}: ${kp} degraus de ${fmt(p)} m não cabem no patamar de ${fmt(L)} m de profundidade.`); ok = false; break; }
      trechos.push({ tipo: 'patamar', indice: i, degraus: kp, poligono: com(land, zLand), planta: land, cotaIni: zLand, cotaFim: zLand, comprimento: 0, areaPlanta: area(land), areaSuperficie: area(land) });
      planta.push(land);
      if (strip) { superficies.push({ origem: 'degraus do patamar', planta: strip, permanente: (gamaDegrau * esp) / 2, patamar: i }); if (e.execucao !== 'alvenaria') volumeConcreto += kp * ((esp * p) / 2) * (area(strip) / (kp * p)); }
      // apoios do patamar (C8.26–C8.30)
      const ap = patamares[i];
      if (ap?.apoiado && !ap.apoios?.length) erro('ESCADA_PATAMAR_APOIO', `${rot}: o patamar ${i + 1} está marcado como apoiado, mas não tem apoio frontal nem lateral.`);
      if (ap && !ap.apoiado && ap.apoios?.length) erro('ESCADA_PATAMAR_APOIO', `${rot}: o patamar ${i + 1} está livre, mas tem apoios informados; marque-o como apoiado ou remova os apoios.`);
      const zPiso = z0, zCima = zTopo;
      for (const a2 of ap?.apoiado ? ap.apoios ?? [] : []) {
        const gam = gamaApoioPatamar(a2);
        const segs = a2.borda === 'frontal' ? [frontal] : lateral;
        for (const sg of segs) {
          if (a2.tipo === 'tirante') apoiosLinhas.push({ patamar: i, borda: a2.borda, tipo: a2.tipo, a: sg[0], b: sg[1], valor: gam * a2.largura * Math.max(0, zCima - zLand), sobre: 'acima', descricao: `tirante de ${cm(a2.largura)} cm: alvenaria entre o patamar e o piso de cima` });
          else if (a2.tipo === 'conector') apoiosLinhas.push({ patamar: i, borda: a2.borda, tipo: a2.tipo, a: sg[0], b: sg[1], valor: 0, sobre: 'abaixo', descricao: 'conectores de cisalhamento: recebem a reação de extremidade (E4c)' });
          else apoiosLinhas.push({ patamar: i, borda: a2.borda, tipo: a2.tipo, a: sg[0], b: sg[1], valor: gam * a2.largura * Math.max(0, zLand - (tipo.espessura ?? 0) - zPiso), sobre: 'abaixo', descricao: `parede de ${a2.tipo === 'concreto' ? 'concreto' : 'alvenaria'} de ${cm(a2.largura)} cm sob a borda ${a2.borda}` });
        }
      }
      z = zLand + kp * esp; S = proxS; h = proxH;
    }
    if (!ok) continue;

    // vão e espessura
    let vao = 0, cadeia = runs[0] ?? 0;
    for (let i = 1; i < runs.length; i++) { if (patamares[i - 1]?.apoiado) { vao = Math.max(vao, cadeia); cadeia = runs[i]; } else cadeia += L + runs[i]; }
    vao = Math.max(vao, cadeia);
    const automatica = tipo.espessura === undefined;
    const hLaje = tipo.espessura ?? Math.max(Math.ceil((vao / o.escadaEspessuraDivisor) * 100 - 1e-9) / 100, o.escadaEspessuraMin / 100);
    // as paredes sob o patamar usam a espessura definitiva
    if (tipo.espessura === undefined) for (const l of apoiosLinhas) if (l.sobre === 'abaixo' && l.tipo !== 'conector') {
      const ap = (lance.patamares ?? [])[l.patamar]?.apoios?.find((x) => x.borda === l.borda && x.tipo === l.tipo)!;
      const gam = gamaApoioPatamar(ap);
      const tl = trechos.filter((x) => x.tipo === 'patamar')[l.patamar];
      l.valor = gam * ap.largura * Math.max(0, tl.cotaIni - hLaje - z0);
    }
    const pesoLaje = GAMA_CONCRETO * hLaje, pesoDegraus = (gamaDegrau * esp * cosA) / 2, pesoInc = pesoLaje + pesoDegraus;
    for (const t of trechos) {
      if (t.tipo === 'lance') { volumeConcreto += t.areaSuperficie * hLaje + (e.execucao !== 'alvenaria' ? (t.comprimento / p) * ((esp * p) / 2) * L : 0); }
      else volumeConcreto += t.areaPlanta * hLaje;
    }
    const cargas: CargasLance = {
      pesoLaje, pesoDegraus, pesoInclinada: pesoInc, pesoProjecao: pesoInc / cosA, permanenteProjecao: pesoInc / cosA + rev, sobrecarga: q,
      pesoPatamar: pesoLaje, permanentePatamar: pesoLaje + rev, revestimento: rev, corrimao: e.corrimao ?? 0,
      superficies, linhas: apoiosLinhas, volumeConcreto,
    };
    if (m > 1 && !apoiosLinhas.some((x) => x.tipo === 'tirante') && inst.repeticao === 0)
      aviso('ESCADA_PAREDE_SUP', `${rot}: a parede entre o patamar e o piso de cima, se existir, não é considerada pela escada; lance-a como carga linear no elemento que a recebe.`);
    lances.push({
      lance, tipo, indice: inst.indice, repeticao: inst.repeticao, pavimento: pav.id, pavimentoTopo: topo.id, cotaPiso: z0, cotaBase: zBase, cotaTopo: zTopo, desnivel: H,
      degraus: { total, iniciais: k, trechos: [...tipo.trechos], patamar: kp }, alturaVencida: vencida, diferencaAltura: dif,
      espessura: { valor: hLaje, automatica, vaoMax: vao }, trechos, degrausLinhas: linhas, setas, planta, cargas,
    });
  }

  const pts = lances.flatMap((l) => l.planta.flat());
  const caixa: GeometriaEscada['caixa'] = pts.length ? [Math.min(...pts.map((x) => x[0])), Math.min(...pts.map((x) => x[1])), Math.max(...pts.map((x) => x[0])), Math.max(...pts.map((x) => x[1]))] : null;
  return { escada: e, lances, caixa, diagnosticos: diag };
}

/** Diagnósticos estáticos das escadas (entram em `verificar`). */
export function diagnosticosEscadas(b: BuildingModel): Diagnostico[] {
  if (!b.escadas?.length) return [];
  const tipos = tiposLanceDisponiveis(b);
  return b.escadas.flatMap((e) => geometriaEscada(e, tipos, b).diagnosticos);
}

/** Geometria de todas as escadas da obra. */
export const geometriaEscadas = (b: BuildingModel): GeometriaEscada[] => { const t = tiposLanceDisponiveis(b); return (b.escadas ?? []).map((e) => geometriaEscada(e, t, b)); };

// ---------------------------------------------------------------- resumo e memorial

export interface ResumoLanceEscada {
  escada: string; lance: number; pavimento?: string; tipo: string; degraus: number; desnivel: number; espessura: number; espessuraAutomatica: boolean; vao: number;
  pesoProjecao: number; permanenteProjecao: number; sobrecarga: number; corrimao: number; volumeConcreto: number;
}
export function resumoEscadas(b: BuildingModel): ResumoLanceEscada[] {
  const nomePav = (id?: string) => b.pavimentos.find((p) => p.id === id)?.nome;
  return geometriaEscadas(b).flatMap((g) => g.lances.map((l) => ({
    escada: g.escada.nome, lance: l.indice + 1, pavimento: nomePav(l.pavimento), tipo: l.tipo!.nome, degraus: l.degraus.total, desnivel: l.desnivel, espessura: l.espessura.valor, espessuraAutomatica: l.espessura.automatica,
    vao: l.espessura.vaoMax, pesoProjecao: l.cargas.pesoProjecao, permanenteProjecao: l.cargas.permanenteProjecao, sobrecarga: l.cargas.sobrecarga, corrimao: l.cargas.corrimao, volumeConcreto: l.cargas.volumeConcreto,
  })));
}

export interface LinhaMemorialEscada { escada: string; secao: 'Dados comuns' | 'Tipos de lance' | 'Geometria' | 'Cargas' | 'Avisos'; rotulo: string; valor: string; aConfirmar?: boolean }
/** Linhas do memorial: dados comuns, tipos de lance usados, geometria resultante, cargas e avisos de cada escada. */
export function escadasNoMemorial(b: BuildingModel): LinhaMemorialEscada[] {
  const out: LinhaMemorialEscada[] = [];
  const o = opcoesEmUso(b.opcoes, perfilDe(b)), nomeGrupo = (id: string) => b.grupos.find((g) => g.id === id)?.nome ?? id;
  for (const g of geometriaEscadas(b)) {
    const e = g.escada, a = e.nome, add = (secao: LinhaMemorialEscada['secao'], rotulo: string, valor: string, aConfirmar?: boolean) => out.push({ escada: a, secao, rotulo, valor, ...(aConfirmar ? { aConfirmar } : {}) });
    add('Dados comuns', 'Grupo', nomeGrupo(e.grupo));
    add('Dados comuns', 'Origem e sentido de subida', `(${fmt(e.origem[0], 2)} ; ${fmt(e.origem[1], 2)}) m, ${fmt(e.angulo, 1)}°`);
    add('Dados comuns', 'Largura, piso e espelho', `${cm(e.largura)} · ${cm(e.piso)} · ${cm(e.espelho)} cm`);
    add('Dados comuns', 'Giro ao subir', e.giro === 'dir' ? 'direita' : 'esquerda');
    add('Dados comuns', 'Último degrau', e.ultimoDegrau === 'laje' ? 'sobre a laje inclinada' : 'formado pelo patamar', true);
    add('Dados comuns', 'Execução dos degraus', e.execucao === 'alvenaria' ? `alvenaria (${BLOCOS[e.bloco ?? 'ceramico'].rotulo}, ${fmt(BLOCOS[e.bloco ?? 'ceramico'].gama, 1)} kN/m³)` : 'concretados com a laje');
    add('Dados comuns', 'Corrimão, revestimento e sobrecarga', `${fmt(e.corrimao ?? 0, 2)} kN/m · ${fmt(e.revestimento ?? o.escadaRevestimento, 2)} kN/m² · ${fmt(e.sobrecarga ?? (e.acesso === 'publico' ? o.escadaSobrecargaPublica : o.escadaSobrecargaPrivada), 2)} kN/m²${e.acesso === 'publico' ? ' (acesso ao público)' : ''}`, true);
    for (const l of g.lances) {
      const r = `Lance ${l.indice + 1}`;
      add('Tipos de lance', r, `${l.tipo!.nome} — ${tipologiaInfo(l.tipo!.tipologia).rotulo}, trechos ${l.degraus.trechos.join(' + ')} degraus${l.degraus.iniciais ? `, ${l.degraus.iniciais} inicial(is)` : ''}${l.degraus.patamar ? `, ${l.degraus.patamar} no patamar` : ''}`);
      add('Geometria', `${r}: cotas`, `base ${fmt(l.cotaBase, 3)} · piso ${fmt(l.cotaPiso, 3)} · chegada ${fmt(l.cotaTopo, 3)} m`);
      add('Geometria', `${r}: degraus e altura vencida`, `${l.degraus.total} degraus · ${fmt(l.alturaVencida, 3)} m para um desnível de ${fmt(l.desnivel, 3)} m`);
      add('Geometria', `${r}: espessura`, `${cm(l.espessura.valor)} cm${l.espessura.automatica ? ` (vão ${fmt(l.espessura.vaoMax, 2)} m / ${fmt(o.escadaEspessuraDivisor, 0)})` : ' (informada)'}`, l.espessura.automatica);
      add('Cargas', `${r}: trecho inclinado`, `peso próprio ${fmt(l.cargas.pesoProjecao, 2)} kN/m² da projeção (laje ${fmt(l.cargas.pesoLaje, 2)} + degraus ${fmt(l.cargas.pesoDegraus, 2)} kN/m² da superfície inclinada); permanente ${fmt(l.cargas.permanenteProjecao, 2)} e sobrecarga ${fmt(l.cargas.sobrecarga, 2)} kN/m²`);
      if (l.trechos.some((t) => t.tipo === 'patamar')) add('Cargas', `${r}: patamar`, `peso próprio ${fmt(l.cargas.pesoPatamar, 2)} kN/m²; permanente ${fmt(l.cargas.permanentePatamar, 2)} kN/m²`);
      for (const s of l.cargas.superficies) add('Cargas', `${r}: ${s.origem}`, `${fmt(s.permanente, 2)} kN/m² permanente em ${fmt(area(s.planta), 2)} m², sem sobrecarga`);
      for (const li of l.cargas.linhas) add('Cargas', `${r}: patamar ${li.patamar + 1}, apoio ${li.borda}`, `${li.descricao}: ${fmt(li.valor, 2)} kN/m ${li.sobre === 'acima' ? 'no elemento do piso de cima' : 'no elemento sob a borda'}`, true);
      add('Cargas', `${r}: concreto`, `${fmt(l.cargas.volumeConcreto, 2)} m³`);
    }
    for (const d of g.diagnosticos) add('Avisos', d.codigo, d.mensagem);
  }
  return out;
}
