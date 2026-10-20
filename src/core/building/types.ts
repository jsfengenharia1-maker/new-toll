// Modelo físico do edifício (lançamento por pavimentos). Editado só por comandos (src/core/commands).
// Unidades: m, kN, graus. Ids são strings curtas estáveis; o nome visível é campo separado e renumerável.
import type { OpcoesCalculo } from './opcoes';
import type { Boring, FoundationParams, PileType } from '../piles';

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
  /** ψ0, ψ1, ψ2 da carga variável de uso (NBR 6118, Tabela 11.2). */
  psiQ?: [number, number, number];
  /** fck por tipo de elemento (MPa; fundacao = sapatas e blocos do edifício); ausente = fck da obra. */
  fckElem?: { laje?: number; viga?: number; pilar?: number; fundacao?: number };
  /** fck dos pilares por lance (pavimento do topo do lance). */
  fckPilarPav?: { pavimento: string; fck: number }[];
  /** Aço por posição de armadura; ausente = aço da obra. */
  acoPos?: Partial<Record<'pilarLong' | 'pilarEstribo' | 'vigaPos' | 'vigaNeg' | 'vigaEstribo' | 'lajeInf' | 'lajeSup' | 'fundacao', 'CA-50' | 'CA-60'>>;
  /** Coeficientes de ponderação (padrão γc 1,4; γs 1,15; γg 1,4; γq 1,4). */
  gamas?: Partial<{ c: number; s: number; g: number; q: number }>;
  /** Cobrimentos por face (cm); ausente = o do tipo de elemento. */
  cobFaces?: Partial<{ vigaInf: number; vigaSup: number; vigaLat: number; lajeInf: number; lajeSup: number }>;
  /** Cobrimento das fundações (sapatas, blocos e tubulões; cm); ausente = o das opções das fundações (padrão 5 cm). */
  cobFundacao?: number;
}

export type CategoriaVento = 'I' | 'II' | 'III' | 'IV' | 'V';

/** Vento (NBR 6123): velocidade básica, fatores e coeficientes de arrasto por direção. */
export interface Vento {
  ativo: boolean;
  v0: number; // m/s
  s1: number;
  s3: number;
  categoria: CategoriaVento;
  /** Coeficiente de arrasto com vento na direção X (0° e 180°) e Y (90° e 270°). */
  caX: number;
  caY: number;
  /** Excentricidade relativa à largura da fachada (0,075 para edificação comum). */
  excentricidade: number;
  /** Coeficiente por sentido (multiplica a força; edifício abrigado por vizinho): +X, −X, +Y, −Y; padrão 1. */
  sentido?: Partial<{ xp: number; xn: number; yp: number; yn: number }>;
  /** Fator de vizinhança (NBR 6123, 6.4); padrão 1. */
  vizinhanca?: number;
  /** Altura da platibanda (m) somada à faixa de exposição do último pavimento; padrão 0. */
  platibanda?: number;
}

export const VENTO_PADRAO: Vento = { ativo: true, v0: 35, s1: 1, s3: 1, categoria: 'IV', caX: 1.3, caY: 1.3, excentricidade: 0.075 };

export interface Pavimento {
  id: string;
  nome: string;
  /** Cota do topo da laje estrutural (m). */
  cota: number;
  grupo: string;
  /** α de flambagem dos lances que chegam a este pavimento (multiplica o de cada pilar; ausente = 1). */
  alfaFlambagem?: number;
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
  /** Coeficientes de engaste por lance (0 = rótula, 1 = engaste; ausente = 1). No topo do último lance, multiplica o das opções. */
  engastes?: { pavimento: string; topo?: number; base?: number }[];
  /** α de flambagem por lance e direção (u: ao longo de b; v: ao longo de h); ausente = 1. */
  flambagem?: { pavimento: string; au?: number; av?: number }[];
  /** Cobrimento próprio (cm); ausente = o da obra. */
  cobrimento?: number;
  /** Armaduras editadas e bloqueadas por lance: o recálculo só as verifica. */
  armaduras?: ArmaduraPilar[];
}

/** Armadura bloqueada de um lance de pilar (barras iguais no contorno; estribo). */
export interface ArmaduraPilar {
  /** Lance (pavimento do topo). */
  pavimento: string;
  /** Bitola longitudinal (mm). */
  phi: number;
  /** Retangular: barras por face ao longo de b e de h (com os cantos). */
  nb?: number;
  nh?: number;
  /** Circular: número de barras. */
  n?: number;
  estribo: { phi: number; s: number };
  /** Número de lances do pilar quando foi bloqueada (se mudar, o bloqueio deixa de valer). */
  lances: number;
}

/** Armadura editada e bloqueada de uma viga (vale para todos os vãos e pavimentos do grupo). */
export interface ArmaduraViga {
  inf: { n: number; phi: number };
  sup?: { n: number; phi: number };
  estribo: { phi: number; s: number };
  /** Barras longitudinais em cada face lateral (torção). */
  laterais?: { n: number; phi: number };
  /** Número de vãos quando foi bloqueada (se mudar, o bloqueio deixa de valer). */
  vaos: number;
}

/** Linha traçada da viga em relação ao corpo: eixo (centro) ou face esquerda/direita, olhando do 1º para o último ponto. */
export type Alinhamento = 'esq' | 'centro' | 'dir';
export type Vinculo = 'auto' | 'engaste' | 'articulado';

export interface Viga {
  id: string;
  nome: string;
  grupo: string;
  /** Polilinha traçada (m), com 2 ou mais pontos. */
  pontos: [number, number][];
  secao: { b: number; h: number }; // m
  alinhamento: Alinhamento;
  invertida?: boolean;
  /** Desnível do topo em relação ao topo da laje do pavimento (m; negativo = rebaixada). */
  nivel?: number;
  vinculoIni?: Vinculo;
  vinculoFim?: Vinculo;
  /** Coeficiente de engaste nas pontas (0 = rótula, 1 = engaste); prevalece sobre o vínculo. */
  engasteIni?: number;
  engasteFim?: number;
  /** Pilares intermediários em que a viga é articulada (rótula dos dois lados do apoio). */
  articulacoes?: string[];
  /** Torção de equilíbrio: rigidez à torção da seção bruta, sem o redutor das opções. */
  torcaoEquilibrio?: boolean;
  /** Coeficiente de engaste das lajes que se apoiam nesta viga (multiplica o da borda da laje). */
  engasteLajes?: number;
  /** Fora do diafragma rígido: os nós só dela não seguem o corpo rígido do pavimento (passarela, viga solta). */
  foraDiafragma?: boolean;
  /** Cobrimento próprio (cm); ausente = o da obra (faces da obra continuam valendo). */
  cobrimento?: number;
  /** Armadura editada e bloqueada: o recálculo só a verifica (área de aço, estribos e flecha). */
  armadura?: ArmaduraViga;
}

export type TipoLaje =
  | { tipo: 'macica'; h: number }
  /** Treliçada unidirecional (vigotas + enchimento de EPS); `modelo` do catálogo (lajes.ts). */
  | { tipo: 'trelicada'; modelo: string; capa: number };

export interface Laje {
  id: string;
  nome: string;
  grupo: string;
  /** Contorno pelo eixo das vigas (anti-horário), m. */
  contorno: [number, number][];
  furos?: [number, number][][];
  tipo: TipoLaje;
  /** Direção das vigotas (graus, anti-horário a partir de +x); padrão: menor vão. */
  direcao?: number;
  /** Desnível do topo em relação ao pavimento (m; negativo = rebaixada). */
  nivel?: number;
  /** Coeficiente de engaste por borda do contorno (índice k = aresta k → k+1; ausente = 1). Bordas em pilares ficam engastadas. */
  engasteBordas?: number[];
  /** Cobrimento próprio (cm); ausente = o da obra. */
  cobrimento?: number;
  /** Treliçadas: armadura adicional das vigotas editada e bloqueada (o recálculo só a verifica). */
  armaduraVigotas?: ArmaduraVigotas;
}

/**
 * Armadura bloqueada das vigotas de uma laje treliçada, por nervura: positiva adicional (além do banzo inferior da
 * treliça; n = 0 = sem adicional) e, se informada, a negativa sobre os apoios contínuos (barras na capa).
 */
export interface ArmaduraVigotas {
  inf: { n: number; phi: number };
  sup?: { n: number; phi: number };
}

export type CasoFisico = 'G' | 'Q';

/** Carga lançada na planta de um grupo: ponto (kN), linha (kN/m) ou área (kN/m²). */
/** Natureza do caso de carga: permanente, variável, vento (ação horizontal) ou excepcional. */
export type Natureza = 'G' | 'Q' | 'W' | 'E';

/**
 * Caso de carga adicional (além de G e Q da obra). `grupo`: casos do mesmo grupo são incompatíveis (nunca juntos);
 * `simultaneo`: id de outro caso que atua sempre junto com este (mesmo fator).
 */
export interface CasoAdicional {
  id: string;
  nome: string;
  natureza: Natureza;
  grupo?: string;
  simultaneo?: string;
  /** ψ0, ψ1, ψ2 (variáveis e vento). */
  psi?: [number, number, number];
}

/** Carga aplicada num lance de pilar (eixos globais): no topo ou a `altura` m acima da base do lance. */
export interface CargaPilar {
  id: string;
  pilar: string;
  /** Lance (pavimento do topo). */
  pavimento: string;
  /** G, Q ou id de caso adicional. */
  caso: string;
  /** Ausente = topo do lance. */
  altura?: number;
  /** kN (N > 0 = compressão, para baixo); kN·m. */
  N: number; Hx: number; Hy: number; Mx: number; My: number;
}

export interface Carga {
  id: string;
  grupo: string;
  /** G, Q ou id de caso adicional. */
  caso: string;
  tipo: 'ponto' | 'linha' | 'area';
  valor: number;
  pontos: [number, number][]; // ponto: 1; linha: polilinha; área: contorno
  /** Origem automática (ex.: alvenaria da camada X da máscara), para regenerar. */
  origem?: { tipo: 'alvenaria'; camada: string; bloco: string; espessura: number; altura: number };
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
  vigas: Viga[];
  lajes: Laje[];
  cargas: Carga[];
  vento?: Vento;
  /** Pranchas: dados do carimbo (definidos pelo usuário), formato e escala. */
  prancha?: ConfigPrancha;
  /** Opções de cálculo alteradas pelo usuário (o resto segue o padrão de opcoes.ts). */
  opcoes?: Partial<OpcoesCalculo>;
  /** Perfil dos padrões das opções: ausente = padrão do sistema; 'nbr' = padrão NBR 6118. */
  perfilOpcoes?: 'nbr';
  /** Casos de carga adicionais. */
  casos?: CasoAdicional[];
  /** Cargas nos pilares. */
  cargasPilar?: CargaPilar[];
  /** Fundações lançadas no edifício (frente FU): dados do terreno, sondagens e elementos. */
  fundacao?: FundacaoEdificio;
}

// ---------------- fundações (frente FU) ----------------

/** Tipo de estaca do terreno (escolhido por bloco). */
export interface EstacaTerreno {
  id: string;
  nome: string;
  tipo: PileType;
  /** Diâmetro (cm). */
  D: number;
  /** 'informada': capacidade característica por estaca (kN); 'sondagem': comprimento e capacidade pelo SPT (Décourt-Quaresma). */
  modo: 'informada' | 'sondagem';
  /** kN, carga admissível característica por estaca (modo informado). */
  capacidade?: number;
  /** Distância entre eixos (m); ausente = a dos parâmetros (× D). */
  s?: number;
}

export interface TerrenoFundacao {
  /** σadm (kN/m²) de sapatas e tubulões no modo informado. */
  sigmaAdm?: number;
  /** 'informada' (padrão) ou 'sondagem' (estimada pelo SPT: N̄/50 nas sapatas e N̄/30 nos tubulões, a confirmar). */
  sigmaModo: 'informada' | 'sondagem';
  /** Majoração de σadm nas combinações com vento (padrão 1,0; a confirmar). */
  fatorVento?: number;
  /** Cota da boca dos furos de sondagem = nível do terreno (m); ausente = cota do pavimento mais baixo. */
  cotaTerreno?: number;
  estacas: EstacaTerreno[];
}

export type TipoFundacao = 'sapata' | 'bloco' | 'tubulao';
/** Posição relativa pilar × elemento: centrada, de divisa (uma face na borda), de canto (duas faces) ou livre (centro informado). */
export type PosicaoFundacao = 'centrada' | 'divisa' | 'canto' | 'livre';

/** Elemento de fundação sob um pilar (FU1; associadas e blocos com vários pilares na FU3). */
export interface ElementoFundacao {
  id: string;
  nome: string;
  tipo: TipoFundacao;
  /** Pilares apoiados (FU1: um). */
  pilares: string[];
  /** Ponto de inserção (m): centro do elemento em 'livre'; nas demais posições, o centro do pilar (o centro real sai do cálculo). */
  x: number;
  y: number;
  /** Giro do elemento (graus, anti-horário); padrão: o do pilar. */
  angulo: number;
  posicao: PosicaoFundacao;
  /** Divisa e canto: lado da divisa nos eixos do elemento (−1, 0 ou 1 em x e em y). */
  lado?: [number, number];
  /** Cota de assentamento (m); ausente = cota de fundação da obra. */
  cota?: number;
  /** σadm próprio (kN/m²); sobrepõe o do terreno. */
  sigmaAdm?: number;
  /** Sondagem do elemento: um furo (`ids[0]`) ou a média dos furos `ids` (todos, se vazio); ausente = o furo mais próximo. */
  sondagem?: { modo: 'furo' | 'media'; ids?: number[] };
  /** Bloco: tipo de estaca do terreno e número de estacas fixo (opcional). */
  estaca?: { id: string; n?: number };
  /** Sapata: dimensões impostas (m), só verificadas. */
  impostas?: { A: number; B: number; h?: number };
}

export interface FundacaoEdificio {
  terreno: TerrenoFundacao;
  /** Furos de sondagem (mesmo formato do módulo Fundações). */
  sondagens: Boring[];
  /** Parâmetros do módulo Fundações que diferem do padrão. */
  params?: Partial<FoundationParams>;
  elementos: ElementoFundacao[];
}

export const FUNDACAO_VAZIA = (): FundacaoEdificio => ({ terreno: { sigmaModo: 'informada', estacas: [] }, sondagens: [], elementos: [] });

/** Arranque: pilar de altura zero (nasce e morre na fundação), só para levar cargas à fundação. */
export const ehArranque = (p: Pick<Pilar, 'nasce' | 'morre'>) => p.nasce === 'fundacao' && p.morre === 'fundacao';

export type Formato = 'A0' | 'A1' | 'A2' | 'A3' | 'A4';
export interface Carimbo {
  empresa: string; obra: string; cliente: string; local: string;
  responsavel: string; registro: string; art: string; etapa: string; desenho: string; revisao: string; data: string;
}
export interface ConfigPrancha {
  carimbo: Partial<Carimbo>;
  /** 'auto' escolhe o menor formato em que a planta cabe na escala. */
  formato: Formato | 'auto';
  /** Denominador da escala (50 = 1:50); 0 = automática. */
  escala: number;
  /** Pranchas de armação e locação (R5): o que difere do padrão (`ARMACAO_PADRAO`). */
  armacao?: Partial<ConfigArmacao>;
}
export const PRANCHA_PADRAO: ConfigPrancha = { carimbo: {}, formato: 'auto', escala: 0 };

/** Pranchas de armação e de locação (R5). Escalas são denominadores (50 = 1:50); 0 = a regra da planta de formas. */
export interface ConfigArmacao {
  /** Formato das pranchas de armação de vigas e pilares; 'auto' = A1, ou A0 quando um elemento não cabe. */
  formato: Formato | 'auto';
  /** Elevação das vigas (horizontal e vertical). */
  escalaVigas: number;
  /** Seções transversais e estribos desenhados à parte (vigas e pilares). */
  escalaSecao: number;
  /** Elevação dos pilares (aumenta automaticamente quando o pilar não cabe na altura da folha). */
  escalaPilares: number;
  /** Planta das lajes (0 = a das formas). */
  escalaLajes: number;
  /** Planta de locação (0 = a das formas). */
  escalaLocacao: number;
  /** Lajes: positivas e negativas em folhas separadas (1) ou na mesma folha, em camadas distintas (0). */
  lajesSeparadas: 0 | 1;
  /** Quadro de pilares (seção, armadura e estribos por lance) no fim das pranchas de pilares. */
  quadroPilares: 0 | 1;
}
export const ARMACAO_PADRAO: ConfigArmacao = { formato: 'auto', escalaVigas: 75, escalaSecao: 25, escalaPilares: 40, escalaLajes: 0, escalaLocacao: 0, lajesSeparadas: 1, quadroPilares: 1 };

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
    vigas: [],
    lajes: [],
    cargas: [],
    vento: { ...VENTO_PADRAO },
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
  return { ...b, mascaras: b.mascaras ?? [], pilares: b.pilares ?? [], vigas: b.vigas ?? [], lajes: b.lajes ?? [], cargas: b.cargas ?? [], vento: b.vento ?? { ...VENTO_PADRAO } };
}

/** Pavimentos atravessados pelo pilar (topos dos lances), de baixo para cima. */
export function lancesDoPilar(b: BuildingModel, p: Pilar) {
  const ps = pavimentosOrdenados(b);
  const i0 = p.nasce === 'fundacao' ? 0 : ps.findIndex((x) => x.id === p.nasce) + 1;
  const i1 = ps.findIndex((x) => x.id === p.morre);
  return i0 < 0 || i1 < 0 ? [] : ps.slice(i0, i1 + 1);
}

/** Seção do lance que chega ao pavimento `pav`. */
/** Coeficientes de engaste do lance do pilar cujo topo é o pavimento dado (1 = engaste). */
export function engasteNoLance(p: Pilar, pavimento: string): { topo: number; base: number } {
  const e = p.engastes?.find((x) => x.pavimento === pavimento);
  return { topo: e?.topo ?? 1, base: e?.base ?? 1 };
}

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

/** Deslocamentos (à esquerda do traçado) da face esquerda, do eixo e da face direita da viga. */
export function offsetsViga(v: Pick<Viga, 'secao' | 'alinhamento'>): { esq: number; eixo: number; dir: number } {
  const b = v.secao.b;
  return v.alinhamento === 'esq' ? { esq: 0, eixo: -b / 2, dir: -b } : v.alinhamento === 'dir' ? { esq: b, eixo: b / 2, dir: 0 } : { esq: b / 2, eixo: 0, dir: -b / 2 };
}

/** Polilinha deslocada de `d` para a esquerda, com cantos em esquadria (vértices intermediários pela interseção). */
export function deslocarPolilinha(pts: [number, number][], d: number): [number, number][] {
  const n = pts.length;
  const nrm = (a: [number, number], z: [number, number]): [number, number] => { const L = Math.hypot(z[0] - a[0], z[1] - a[1]) || 1; return [-(z[1] - a[1]) / L, (z[0] - a[0]) / L]; };
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    if (i === 0 || i === n - 1) { const m = i === 0 ? nrm(pts[0], pts[1]) : nrm(pts[n - 2], pts[n - 1]); out.push([pts[i][0] + d * m[0], pts[i][1] + d * m[1]]); continue; }
    const m1 = nrm(pts[i - 1], pts[i]), m2 = nrm(pts[i], pts[i + 1]);
    const bx = m1[0] + m2[0], by = m1[1] + m2[1], c = (bx * m1[0] + by * m1[1]);
    const k = Math.abs(c) < 0.2 ? d : d / c; // ângulos muito agudos: sem esquadria longa
    out.push([pts[i][0] + bx * k, pts[i][1] + by * k]);
  }
  return out;
}

/** Faces esquerda e direita e eixo da viga. */
export function geometriaViga(v: Pick<Viga, 'pontos' | 'secao' | 'alinhamento'>) {
  const o = offsetsViga(v);
  return { esq: deslocarPolilinha(v.pontos, o.esq), eixo: deslocarPolilinha(v.pontos, o.eixo), dir: deslocarPolilinha(v.pontos, o.dir) };
}

/** Retângulos (quadriláteros convexos) de cada trecho da viga, prolongados de `folga` nas pontas. */
export function trechosViga(v: Pick<Viga, 'pontos' | 'secao' | 'alinhamento'>, folga = 0): [number, number][][] {
  const o = offsetsViga(v);
  const r: [number, number][][] = [];
  for (let i = 0; i + 1 < v.pontos.length; i++) {
    const a = v.pontos[i], z = v.pontos[i + 1], L = Math.hypot(z[0] - a[0], z[1] - a[1]);
    if (!L) continue;
    const ux = (z[0] - a[0]) / L, uy = (z[1] - a[1]) / L, nx = -uy, ny = ux;
    const A: [number, number] = [a[0] - ux * folga, a[1] - uy * folga], Z: [number, number] = [z[0] + ux * folga, z[1] + uy * folga];
    r.push([[A[0] + nx * o.dir, A[1] + ny * o.dir], [Z[0] + nx * o.dir, Z[1] + ny * o.dir], [Z[0] + nx * o.esq, Z[1] + ny * o.esq], [A[0] + nx * o.esq, A[1] + ny * o.esq]]);
  }
  return r;
}

export const comprimentoPolilinha = (pts: [number, number][]) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);

/** Pavimentos que usam a planta do grupo. */
export const pavimentosDoGrupo = (b: BuildingModel, grupo: string) => pavimentosOrdenados(b).filter((p) => p.grupo === grupo);

/** Casos de carga da obra: G e Q (padrão) + os adicionais. */
export function casosDaObra(b: BuildingModel): { id: string; nome: string; natureza: Natureza; grupo?: string; simultaneo?: string; psi?: [number, number, number] }[] {
  return [{ id: 'G', nome: 'G', natureza: 'G' }, { id: 'Q', nome: 'Q', natureza: 'Q', psi: b.norma.psiQ ?? [0.5, 0.4, 0.3] }, ...(b.casos ?? [])];
}
