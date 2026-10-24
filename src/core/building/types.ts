// Modelo físico do edifício (lançamento por pavimentos). Editado só por comandos (src/core/commands).
// Unidades: m, kN, graus. Ids são strings curtas estáveis; o nome visível é campo separado e renumerável.
import { opcoesEmUso, type OpcoesCalculo, type OpcoesVigaPropria } from './opcoes';
import type { Boring, FoundationParams, PileType } from '../piles';
import type { TabelasArmadura } from './tabelasArmadura';
import type { NormasModelo } from '../normas/tipos';
import type { FlechasConfig } from './flechas';
import type { FogoConfig } from './fogo';
import type { TiposLajeObra } from './tiposLaje';
import type { Escada, TipoLance } from './escadas';

export const BUILDING_VERSION = 1;

/** Categorias de uso (NBR 6120:2019, Tabela 10) com a carga variável padrão em kN/m² [a confirmar]. */
export type CategoriaUso = 'residencial' | 'servico' | 'comum' | 'escritorio' | 'garagem' | 'cobertura' | 'misto';

/** Como a obra foi lançada (memorial e lista de obras; L1). Ausente = lançamento manual. */
export type OrigemObra = 'vazio' | 'padrao' | 'assistente' | 'dxf' | 'ifc' | 'exemplo' | 'texto';
export const ORIGEM_ROTULO: Record<OrigemObra, string> = {
  vazio: 'Lançamento manual (obra vazia)', padrao: 'Edifício padrão', assistente: 'Assistente de nova obra',
  dxf: 'Lançamento a partir de DXF/DWG', ifc: 'Importação de IFC', exemplo: 'Obra de exemplo', texto: 'Arquivo de texto de cargas (obra só de arranques)',
};

export interface Obra {
  nome: string;
  cidade?: string;
  /** Descrição da obra: até 2 linhas de até 120 caracteres (K1.9.2). */
  descricao?: string[];
  origem?: OrigemObra;
  /** Importação de IFC (L3): arquivo, esquema, mapeamento de materiais e relatório; ausente = obra não importada de IFC. */
  ifc?: ImportacaoIfc;
  /** Profundidade do nível de fundação abaixo do pavimento mais baixo (m). */
  profundidadeFundacao: number;
}

/** O que a importação de IFC (comando `ifc.importar`) registra para o memorial. */
export interface ImportacaoIfc {
  arquivo: string;
  esquema: string;
  /** Metros por unidade de comprimento do arquivo. */
  unidade: number;
  /** Deslocamento aplicado às coordenadas (m). */
  deslocamento: [number, number];
  /** Material do arquivo ligado a cada tipo de elemento, com o fck e o aço atribuídos. */
  materiais: { tipo: 'pilar' | 'viga' | 'laje' | 'fundacao'; material?: string; fck?: number; aco?: 'CA-50' | 'CA-60' }[];
  /** Contagem por classe IFC do arquivo e o que foi lançado, ignorado ou ajustado. */
  classes: Record<string, number>;
  lancados: { pavimentos: number; pilares: number; vigas: number; lajes: number; paredes: number; furos: number; pulados: number; extremosAjustados: number };
  ignorados: { classe: string; motivo: string; quantidade: number }[];
  ambiguos: string[];
  avisos: string[];
}

export interface Norma {
  fck: number; // MPa
  aco: 'CA-50' | 'CA-60';
  caa: 'I' | 'II' | 'III' | 'IV';
  /** Cobrimentos nominais (cm). */
  cobrimento: { laje: number; viga: number; pilar: number };
  /** ψ0, ψ1, ψ2 da carga variável de uso (NBR 6118, Tabela 11.2). */
  psiQ?: [number, number, number];
  /** ψ0, ψ1, ψ2 das classes de uso B (escritórios) e C (garagens) quando são casos próprios; ausente = Tabela 11.2. */
  psiUso?: { B?: [number, number, number]; C?: [number, number, number] };
  /** fck por tipo de elemento (MPa; fundacao = sapatas e blocos do edifício); ausente = fck da obra. */
  fckElem?: { laje?: number; viga?: number; pilar?: number; fundacao?: number };
  /** fck dos pilares por lance (pavimento do topo do lance). */
  fckPilarPav?: { pavimento: string; fck: number }[];
  /** Aço por posição de armadura; ausente = aço da obra. */
  acoPos?: Partial<Record<'pilarLong' | 'pilarEstribo' | 'vigaPos' | 'vigaNeg' | 'vigaMontagem' | 'vigaPele' | 'vigaEstribo' | 'lajeInf' | 'lajeSup' | 'nervInf' | 'nervSup' | 'vigotaInf' | 'vigotaSup' | 'abacoInf' | 'abacoSup' | 'lajePuncao' | 'lajeCortante' | 'escadaInf' | 'escadaSup' | 'fundacao' | 'alvenariaVert' | 'alvenariaHor', 'CA-50' | 'CA-60'>>;
  /** Coeficientes de ponderação (padrão γc 1,4 [pelo controle de execução]; γs 1,15; γg 1,4; γq 1,4; γh do empuxo 1,4). */
  gamas?: Partial<{ c: number; s: number; g: number; q: number; h: number }>;
  /** Cobrimentos por face (cm); ausente = o do tipo de elemento. */
  cobFaces?: Partial<{ vigaInf: number; vigaSup: number; vigaLat: number; lajeInf: number; lajeSup: number }>;
  /** Cobrimento das fundações (sapatas, blocos e tubulões; cm); ausente = o das opções das fundações (padrão 5 cm). */
  cobFundacao?: number;
  /** Nível de controle de execução (N2a): fixa o γc padrão (normal 1,4; desfavorável × 1,1; pré-moldado 1,3); ausente = normal. */
  controle?: ControleExecucao;
  /** Natureza cujos casos adicionais NÃO se combinam entre si (todos ficam num grupo excludente); ausente = combinam. */
  combinarAdicionais?: Partial<Record<Natureza, boolean>>;
}

/** Controle de execução (NBR 6118, 12.4.1; NBR 9062 para pré-moldados). */
export type ControleExecucao = 'normal' | 'desfavoravel' | 'premoldado';

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
  /** Tabelas de pontos dos ábacos da NBR 6123 (Ca, vizinhança), digitadas pelo usuário (N2a). */
  abacos?: AbacosVento;
  /** Ca pelo ábaco: 1 = vento de baixa turbulência (Fig. 4), 2 = alta turbulência (Fig. 5); ausente/0 = Ca informado. */
  caAuto?: 0 | 1 | 2;
  /** Fator de vizinhança pelo ábaco a partir da distância `vizDist`; ausente = informado. */
  vizAuto?: boolean;
  /** Distância (m) ao edifício vizinho, argumento do ábaco de vizinhança. */
  vizDist?: number;
}

/** Curva de um ábaco: `param` (ex.: h/l1) e pontos [x, y] ordenados por x (ex.: l1/l2 → Ca). */
export interface CurvaAbaco { param: number; pontos: [number, number][] }
/** Ábacos da NBR 6123 digitados: Ca em baixa e alta turbulência (curvas por h/l1, abscissa l1/l2) e fator de vizinhança (d/l1 → fator). */
export interface AbacosVento { caBaixa?: CurvaAbaco[]; caAlta?: CurvaAbaco[]; vizinhanca?: [number, number][] }

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
  /** Origem do lançamento automático (`dxf:<máscara>:<hash>`), para reimportar sem duplicar (L2). */
  origemLancamento?: string;
}

/** Geometria de uma camada da máscara, em unidades do DXF (antes da transformação da máscara). */
export interface CamadaGeo {
  /** Segmentos [x1, y1, x2, y2, ...] (polilinhas e blocos já explodidos). */
  linhas: number[];
  /** Arcos [cx, cy, r, a0, a1, ...] em graus, anti-horário de a0 a a1 (círculo: 0 a 360). */
  arcos: number[];
  textos: { x: number; y: number; h: number; rot: number; t: string }[];
}

/** Papel de uma camada do gabarito no lançamento automático (L2). */
export type PapelCamada = 'pilar' | 'pilarParede' | 'vigaEixo' | 'vigaFaces' | 'contorno' | 'abertura' | 'eixo' | 'pontoFixo' | 'texto' | 'parede' | 'ignorar';

/** Regras do lançamento por camada (L2): papel de cada camada e parâmetros (m) [valores a confirmar]. */
export interface RegrasCamadas {
  papeis: Record<string, PapelCamada>;
  /** Largura da viga lançada por eixo (m). */
  larguraViga: number;
  /** Altura das vigas lançadas (m). */
  alturaViga: number;
  /** Afastamento mínimo e máximo entre as linhas de uma viga por faces (m). */
  vigaFacesMin: number;
  vigaFacesMax: number;
  /** Tolerância para fechar polilinhas e juntar pontas (m). */
  tolerancia: number;
  /** Maior lado de um pilar reconhecido (m); polígonos maiores não viram pilar. */
  pilarMax: number;
  /** Distância máxima do texto ao elemento que ele nomeia (m). */
  raioTexto: number;
  /** Espessura da laje maciça criada nos panos e no contorno (m). */
  lajeH: number;
}

export interface CamadaMascara { nome: string; visivel: boolean; capturavel: boolean; cor?: string;
  /** Nome de exibição (L2); o nome do arquivo continua sendo a chave. */
  apelido?: string;
  /** Espessura de linha na planta (px); ausente = automática. */
  espessura?: number;
  /** false oculta só os textos da camada (padrão: true). */
  textos?: boolean }

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
  /** false: vista desligada na planta (janela rápida de vistas; L2, C2.19); ausente = ligada. */
  visivel?: boolean;
  /** Outros grupos em que a vista também aparece, além de `grupo` (L2, C2.18). */
  grupos?: string[];
  /** Regras do lançamento por camada (L2). */
  regras?: RegrasCamadas;
  /** Arquivo de origem e formato (L2, C2.6). */
  arquivo?: { nome: string; tipo: 'dxf' | 'dwg' };
  /** Escala, rotação e deslocamento ao importar, para voltar à origem original (L2, C2.16). */
  original?: { escala: number; rotacao: number; dx: number; dy: number };
}

/** Grupos em que a máscara aparece: o principal e os associados. */
export const gruposDaMascara = (m: Pick<Mascara, 'grupo' | 'grupos'>): string[] => [...new Set([m.grupo, ...(m.grupos ?? [])])];
export const mascaraNoGrupo = (m: Pick<Mascara, 'grupo' | 'grupos'>, grupo: string): boolean => m.grupo === grupo || !!m.grupos?.includes(grupo);

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
  /** Origem do lançamento automático (`dxf:<máscara>:<hash>`), para reimportar sem duplicar (L2). */
  origemLancamento?: string;
  ajuste: Ajuste;
  /** 'fundacao' ou id do pavimento em cuja laje o pilar nasce. */
  nasce: string;
  /** Pavimento mais alto que o pilar alcança. */
  morre: string;
  secao: SecaoPilar;
  /**
   * Seção diferente por lance (o lance é identificado pelo pavimento do seu topo). Ponto fixo, ângulo e deslocamento
   * (dx, dy em m, no mundo) próprios do lance (E1a): ausentes = os do pilar; a parte do lance fora da projeção do de
   * baixo liga-se a ele por trecho rígido horizontal.
   */
  secoes?: { pavimento: string; secao: SecaoPilar; ajuste?: Ajuste; angulo?: number; dx?: number; dy?: number }[];
  /** fck próprio por lance (MPa; sobre o do tipo e o por pavimento de `Norma.fckPilarPav`); ausente = o dos materiais. */
  fck?: { pavimento: string; fck: number }[];
  /**
   * Início do pilar (E1a): 'fundacao' = apoio externo (vínculo) no pavimento em que nasce; 'apoiado' = nasce sobre outro
   * pilar, viga ou laje, sem vínculo externo. Ausente: fundação se nasce na fundação, apoiado nos demais.
   */
  inicio?: 'fundacao' | 'apoiado';
  /** Coeficientes de engaste por lance (0 = rótula, 1 = engaste; ausente = 1). No topo do último lance, multiplica o das opções. */
  engastes?: { pavimento: string; topo?: number; base?: number }[];
  /** α de flambagem por lance e direção (u: ao longo de b; v: ao longo de h); ausente = 1. */
  flambagem?: { pavimento: string; au?: number; av?: number }[];
  /** Cobrimento próprio (cm); ausente = o da obra. */
  cobrimento?: number;
  /** Armaduras editadas e bloqueadas por lance: o recálculo só as verifica. */
  armaduras?: ArmaduraPilar[];
  /** Tabela de armadura (R7a); ausente = a padrão da obra. */
  tabela?: string;
  /** Comprimentos de espera, traspasse e arranque editados (R7c); verificados a cada recálculo. */
  detalhe?: DetalhePilarEditado;
  /**
   * Vínculo externo na base (N2c): ausente = engaste. `rotula` libera os giros de flexão (rx, ry); `molas` dá a rigidez
   * de cada gdl (kN/m e kN·m/rad, eixos globais): gdl ausente = preso, 0 = livre.
   */
  vinculoBase?: VinculoBasePilar;
  /** Cota própria do pé do pilar que nasce na fundação (m; desnível); ausente = cota da fundação da obra. */
  cotaBase?: number;
  /** Travamentos intermediários por lance (altura a partir da base do lance, m): dividem o lance para a flambagem. */
  apoiosIntermediarios?: { pavimento: string; altura: number; direcao?: 'u' | 'v' }[];
}

/**
 * Lado de um tipo de pilar-parede (E1b): trecho reto do eixo, em coordenadas locais do tipo (m; a origem é o ponto de
 * inserção, o primeiro vértice do primeiro lado), com a espessura à esquerda e à direita do eixo (a → z). Mesma geometria
 * em planta em toda a altura; só a espessura varia por pavimento (`porPavimento`, identificado pelo topo do lance).
 */
export interface LadoPilarParede {
  a: [number, number]; z: [number, number];
  esq: number; dir: number;
  porPavimento?: { pavimento: string; esq: number; dir: number }[];
}
/** Tipo de pilar-parede gravado com a obra e reutilizável (E1b). */
export interface TipoPilarParede { id: string; nome: string; lados: LadoPilarParede[] }
/** Pilar-parede lançado (E1b): tipo, ponto de inserção (o primeiro vértice), ângulo, pavimentos em que nasce e morre e vínculo externo da base. */
export interface PilarParede {
  id: string; nome: string; tipo: string;
  x: number; y: number;
  /** Graus, anti-horário. */
  angulo: number;
  /** 'fundacao' ou id do pavimento em cuja laje a parede nasce (apoio engastado nesse nível, a confirmar). */
  nasce: string;
  morre: string;
  /** Vínculo externo da base: engaste (padrão), rótula (giros livres) ou molas de Winkler de sapata corrida (FU7c: k das opções, largura = espessura de cada lado + 2 × o balanço; lados curtos em barra ficam engastados). */
  vinculoBase?: 'engaste' | 'rotula' | 'molas';
  /** Armadura bloqueada por pano (E1d). */
  armaduras?: ArmaduraPano[];
  /** Comprimentos de emenda editados por pavimento (E1d). */
  emendas?: EmendaParede[];
}

/** Muro de arrimo isolado da obra (dados de `muroArrimo.ts` mais id e nome). */
export interface MuroArrimoObra {
  id: string; nome: string;
  H: number; tTopo: number; tBase: number; B: number; ponta: number; hBase: number;
  solo: { gama: number; phi: number; metodo: 'repouso' | 'rankine' | 'coulomb'; delta?: number; k?: number };
  sobrecarga?: number; gamaConcreto?: number; atrito?: number; sigmaAdm?: number; fsTombamento?: number; fsDeslizamento?: number;
  /** Base na fundação (FU7b): cota de assentamento (m; ausente = a de fundação da obra) e comprimento do muro (m; ausente = só por metro). */
  cota?: number; comprimento?: number;
}

/** Malha de uma direção da parede (por face): bitola (mm) e espaçamento (m). */
export interface ArranjoParede { phi: number; s: number }
/**
 * Armadura bloqueada de um pano de parede ou pilar-parede (E1d): barras verticais e horizontais iguais nas duas faces.
 * Pano = faixa do lado e do lance entre as aberturas (da esquerda para a direita); sem `pano`, vale para todos os panos.
 */
export interface ArmaduraPano {
  /** Índice do lado (trecho) e lance (pavimento do topo). */
  lado: number; pavimento: string; pano?: number;
  /** Número de panos do lado e lance quando bloqueou; se mudar (aberturas, geometria), o bloqueio deixa de valer. */
  panos: number;
  vert: ArranjoParede; hor: ArranjoParede;
}
/** Comprimentos de emenda editados (m) acima do pavimento: tracionada e comprimida; ausente = calculado. */
export interface EmendaParede { pavimento: string; tracao?: number; compressao?: number }
/** Armadura de reforço de uma abertura (E1d): verga, peitoril, montantes e barras inclinadas nos cantos. */
export interface ArmaduraAbertura {
  /** Verga (inferior, sobre a abertura) e estribos dela; peitoril (superior, sob a abertura); montantes (cada lado); cantos (cada canto, inclinadas a 45°). */
  verga: { n: number; phi: number }; estribo: { phi: number; s: number };
  peitoril?: { n: number; phi: number }; montante: { n: number; phi: number }; canto?: { n: number; phi: number };
}

/**
 * Abertura (porta ou janela) numa parede (E1c, C5.9, C5.10): posição ao longo do eixo (distância `s` do primeiro vértice
 * da polilinha até a borda inicial, m), largura, peitoril (a partir da base do lance) e altura. Lançada no pavimento de
 * baixo dos dois entre os quais fica: `pavimento` = 'fundacao' ou id do pavimento da base do lance.
 */
export interface AberturaParede {
  id: string;
  tipo: 'porta' | 'janela';
  s: number; largura: number; peitoril: number; altura: number;
  pavimento: string;
  /** Armadura de reforço bloqueada (E1d); ausente = calculada. */
  armadura?: ArmaduraAbertura;
  /** Verga (e contraverga) da abertura em parede de blocos, bloqueada (E1e); ausente = calculada. */
  verga?: ArmaduraVerga;
}
/** Armadura da verga de uma abertura em alvenaria de blocos (E1e): n barras φ (mm) na canaleta grauteada, estribos opcionais. */
export interface ArmaduraVerga { n: number; phi: number; estribo?: { phi: number; s: number }; /** Contraverga sob a janela (canaleta abaixo do peitoril). */ contraverga?: { n: number; phi: number } }

/** Bloco de concreto da biblioteca (E1e, C5.3, C5.4): dimensões modulares (com a junta) em m e resistência característica na área bruta (MPa). */
export interface TipoBloco {
  id: string; nome: string;
  /** Comprimento, largura (= espessura da parede) e altura modulares, m. */
  comprimento: number; largura: number; altura: number;
  /** fbk na área bruta (MPa). */
  fbk: number;
  /** Peça de canto: ausente = só nas paredes em que a largura não é metade do comprimento. */
  canto?: boolean;
}
/**
 * Tipo de alvenaria estrutural (E1e; C5.1, C5.8, K1.9.4, K1.9.5, C5.25): 'generica' (módulo, peso e resistências de cálculo
 * informados) ou 'blocos' (resistência pelo bloco, argamassa, graute e prisma, NBR 16868). Valores em MPa e kN/m³.
 */
export interface TipoAlvenaria {
  id: string; nome: string;
  modelo: 'generica' | 'blocos';
  /** Peso específico com revestimento (kN/m³). */
  gama: number;
  /** Módulo de elasticidade (MPa); ausente em 'blocos' = mín(800·fpk; 16 000). */
  E?: number;
  /** Módulo de cisalhamento (MPa), usado só se `considerarG`; ausente = 0,4·E. */
  G?: number;
  /** Considera a rigidez ao cisalhamento informada (G); senão, material isótropo com o ν das opções. */
  considerarG?: boolean;
  /** Genérica: resistências de cálculo à compressão, à tração e ao cisalhamento (MPa); ftd ausente = % da compressão (opção), fvd ausente = ftd. */
  fd?: number; ftd?: number; fvd?: number;
  /** Blocos: id do bloco, resistência da argamassa e do graute (MPa), grauteamento e prisma informado (MPa). */
  bloco?: string; argamassa?: number; graute?: number;
  grauteamento?: 'nenhum' | 'parcial' | 'total';
  fpk?: number;
  /** Blocos armados: barras verticais nas células grauteadas e horizontais nas juntas, bloqueadas (E1e); ausente = calculadas. */
  armada?: boolean;
  armadura?: { vertical?: { phi: number; s: number }; horizontal?: { phi: number; s: number } };
}
/**
 * Empuxo aplicado à parede (E1c, C5.2, K1.9.107; X5): caso de carga, lado do terreno (ou do líquido) e a fonte da pressão:
 * terra pelo tipo de empuxo do caso (H) com a cota do terreno própria, ou líquido (pressão hidrostática γ·(cota − z)).
 */
export interface EmpuxoParede {
  /** Id do caso de carga (H com `empuxo` = tipo de empuxo de terra; ou qualquer caso para o líquido). */
  caso: string;
  /** Lado do eixo (a → z) em que está o terreno ou o líquido; a pressão empurra a parede para o outro lado. */
  lado: 'esq' | 'dir';
  /** Cota do terreno junto à parede (m); ausente = a cota do aterro do tipo de empuxo. */
  cotaTerreno?: number;
  /** Líquido (reservatório, X5): cota da superfície (m) e peso específico (kN/m³, padrão 10). */
  liquido?: { cota: number; gama?: number };
}
/**
 * Parede estrutural (E1c; K1.1.3, K1.3.31, K1.9.44, K1.9.45, C5.2): polilinha do eixo em planta, espessura à esquerda e à
 * direita do eixo (média por pavimento em `porPavimento`, pelo topo do lance), pavimentos inicial e final, aberturas,
 * empuxo, vínculo externo da base e dados da base para a fundação (FU7b). Cada trecho reto com comprimento ≥
 * `pilarParedeLimite` × a espessura vira casca; o mais curto, pilar (barra), como no pilar-parede.
 */
export interface Parede {
  id: string; nome: string;
  /** Origem do lançamento automático (`ifc:<GlobalId>`), para reimportar sem duplicar (L3). */
  origemLancamento?: string;
  /** Concreto (E1c), alvenaria genérica ou blocos de concreto (E1e; o `material` dá o tipo de alvenaria). */
  tipo: 'concreto' | 'alvenaria' | 'blocos';
  /** Id do tipo de alvenaria (`tiposAlvenaria`) das paredes 'alvenaria' e 'blocos' (E1e). */
  material?: string;
  /** Polilinha do eixo (m), 2 ou mais vértices. */
  pontos: [number, number][];
  esq: number; dir: number;
  porPavimento?: { pavimento: string; esq: number; dir: number }[];
  /** 'fundacao' ou id do pavimento em cuja laje a parede nasce. */
  nasce: string;
  morre: string;
  vinculoBase?: 'engaste' | 'rotula';
  aberturas?: AberturaParede[];
  empuxos?: EmpuxoParede[];
  /** Armar a parede (padrão) ou só verificar como concreto simples (E1d). */
  armar?: boolean;
  /** Armadura bloqueada por pano e comprimentos de emenda editados (E1d). */
  armaduras?: ArmaduraPano[];
  emendas?: EmendaParede[];
  /**
   * Base da parede para a fundação: apoio direto (padrão), sapata corrida com largura e altura próprias (FU7b) ou viga de
   * fundação sem vínculo externo (FU7c: viga sobre base elástica sob o eixo da parede, ligada aos nós da base da casca;
   * `largura` = base apoiada no solo, `altura` = h, `k` = coeficiente de reação, ausente = `radierK`).
   */
  base?: { tipo: 'apoio' | 'sapataCorrida' | 'viga'; largura?: number; altura?: number; k?: number };
}

/** Vínculo externo da base do pilar (N2c). */
export interface VinculoBasePilar {
  tipo: 'engaste' | 'rotula' | 'molas';
  /** Rigidez por gdl global (com `tipo` = molas): kx, ky, kz (kN/m), krx, kry, krz (kN·m/rad); ausente = preso. */
  kx?: number; ky?: number; kz?: number; krx?: number; kry?: number; krz?: number;
}

/** Comprimentos editados do detalhamento de um pilar (m); campos ausentes ficam como calculados. */
export interface DetalhePilarEditado {
  /** Espera na fundação, abaixo da base (m). */
  espera?: number;
  /** Por passagem (pavimento do topo do lance de baixo): traspasse acima do topo e, no arranque, ancoragem das barras novas abaixo do topo. */
  passagens?: { pavimento: string; emenda?: number; ancoragem?: number }[];
  /** Número de lances do pilar quando foi editado (se mudar, a edição deixa de valer). */
  lances: number;
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
  /** Faces opostas com outro número de barras (arranjo não simétrico): face superior (y+) e direita (x+); ausente = igual a nb e nh. */
  nbS?: number;
  nhD?: number;
  /** Circular: número de barras. */
  n?: number;
  estribo: { phi: number; s: number };
  /** Número de lances do pilar quando foi bloqueada (se mudar, o bloqueio deixa de valer). */
  lances: number;
}

/** Edição fina de uma posição de barra do detalhamento (R7b); os campos ausentes ficam como calculados. */
export interface EdicaoBarra {
  /** Posição (N1, N2, …) do detalhamento calculado. */
  pos: string;
  /** Extremos ao longo do traçado (m). */
  s0?: number; s1?: number;
  /** Ganchos de 90° nas pontas. */
  ganchos?: [boolean, boolean];
  /** Perna reta do gancho (× φ), no lugar do mínimo das opções. */
  perna?: number;
}
/** Edição de uma zona de estribos (índice na ordem do detalhamento calculado). */
export interface EdicaoZona { zona: number; phi?: number; s?: number; ramos?: number; /** Estribo em U nesta zona (R7g). */ u?: boolean }
/** Detalhamento editado de uma viga (R7b): verificado a cada recálculo; vale enquanto o número de vãos não muda. */
export interface DetalheEditado {
  barras?: EdicaoBarra[];
  zonas?: EdicaoZona[];
  /** Fator do comprimento de emenda desta viga (sobre a opção). */
  fatorEmenda?: number;
  vaos: number;
}

/** Armadura editada e bloqueada de uma viga (vale para todos os vãos e pavimentos do grupo). */
export interface ArmaduraViga {
  inf: { n: number; phi: number };
  sup?: { n: number; phi: number };
  /** Estribo; `legs` = ramos (2 simples, 4 duplo, 6 triplo; ausente = 2). */
  estribo: { phi: number; s: number; legs?: number };
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
  /**
   * Plano inclinado da viga (E3f, C7.70): id de `BuildingModel.planos`; a cota do topo do eixo segue z(x, y) do plano (no lugar
   * de `nivel`). Ausente = horizontal (com `nivel`).
   */
  plano?: string;
  /** Projeção horizontal da viga no plano inclinado (E3f, C7.73): pelo eixo (padrão) ou pela face; só desenho. */
  projecaoPlano?: 'eixo' | 'face';
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
  /** Tabela de barras longitudinais (R7a); ausente = a padrão da obra. */
  tabela?: string;
  /** Tabela de estribos (R7a); ausente = a padrão da obra. */
  tabelaEstribo?: string;
  /** Opções de cálculo só desta viga (N4c, K1.4.1): redistribuição, arredondamento no apoio, mínimos e estribos; as ausentes seguem as da obra. */
  opcoes?: OpcoesVigaPropria;
  /** Detalhamento editado (comprimentos, ganchos, posições, zonas de estribos; R7b). */
  detalhe?: DetalheEditado;
  /** Origem do lançamento automático (`dxf:<máscara>:<hash>`), para reimportar sem duplicar (L2). */
  origemLancamento?: string;
  /** Viga embutida ou de coroamento (E1c, C5.23): id da parede sobre a qual corre; é movida e removida junto com ela. */
  embutida?: string;
  /**
   * Seção com mesa (E2a, C6.16): T (mesa dos dois lados) ou L (de um lado). `bf`/`hf`/`a` ausentes = mesa colaborante
   * automática pela NBR 6118, 14.6.2.2 (`secaoViga.ts`); ausente = retangular. A mesa entra na rigidez da análise e,
   * com a opção `mesaDimensionamento`, na flexão.
   */
  mesa?: { tipo: 'T' | 'L'; bf?: number; hf?: number; a?: number };
  /** Viga chata (faixa, C6.15): altura igual à da laje que contorna (comando `viga.editar { chata }`). */
  chata?: boolean;
  /** `false` = viga não estrutural (C6.21): só fecha o contorno do pano; fica fora da grelha e do pórtico. */
  estrutural?: false;
  /** Viga de amarração ou encadeado (K1.4.28): sem rigidez à flexão vertical; plano e EA rígidos. */
  amarracao?: boolean;
  /**
   * Trechos curvos (E2b, C6.12): faixas de vértices de `pontos` (de `ini` a `fim`, inclusive, com pelo menos 2 cordas) que
   * discretizam um arco de círculo. O arco é o círculo pelos vértices `ini`, do meio e `fim`; `pontos` guarda sempre a
   * poligonal já discretizada (a análise e o desenho usam as cordas) e `sincronizarCurvas` refaz a discretização
   * quando a opção `curvaSegmento` muda. Ausente = só trechos retos.
   */
  arcos?: ArcoViga[];
  /** Viga comum a dois grupos, lado da origem (E2b, C6.47): a viga associada (`comumDe`) é criada no grupo indicado. */
  comum?: { grupo: string };
  /** Viga comum, lado associado: id da viga de origem. Geometria e seção seguem a origem; não entra na análise nem no dimensionamento. */
  comumDe?: string;
  /**
   * Vínculo externo contínuo (E2e, C6.18, K1.3.9, K1.3.10): a viga simula o topo de um muro. Apoios em todos os nós da discretização
   * (grelha e pórtico) e rigidez aumentada (EI × `vinculoExternoFatorEI`, plano e EA rígidos). `engaste` impede deslocamentos e
   * rotações; `articulacao`, os deslocamentos; `deslizante`, só o vertical.
   */
  vinculoExterno?: 'engaste' | 'articulacao' | 'deslizante';
  /** Viga pré-moldada (E2e, C6.17, K1.4.66): armada (NBR 9062, γc do controle pré-moldado, ligações articuladas) ou de ficha do fabricante. */
  premoldada?: PremoldadaViga;
}

/**
 * Viga pré-moldada (E2e). `armada`: dimensionada como as demais, com γc do controle pré-moldado, ligações articuladas por padrão (a
 * menos de engaste informado) e verificação de içamento (pontos a `icamento` m das extremidades; ausente = a fração das opções).
 * `ficha`: viga protendida ou treliçada pré-fabricada com propriedades do fabricante informadas (rigidez EI, peso, momentos e
 * cortante resistentes): só é verificada, a armadura não é calculada.
 */
export interface PremoldadaViga {
  tipo: 'armada' | 'ficha';
  icamento?: number;
  ficha?: FichaPremoldada;
}

/** Propriedades da ficha de uma viga pré-fabricada (kN, m): EI e peso ausentes = os da seção bruta. */
export interface FichaPremoldada {
  nome: string;
  classe?: 'protendida' | 'trelicada' | 'outra';
  EI?: number;
  peso?: number;
  MRdPos: number;
  MRdNeg?: number;
  VRd: number;
  TRd?: number;
}

/**
 * Consolo curto (E2e; C6.54 a C6.57, K1.3.17, K1.4.62) que apoia uma viga no pilar (juntas de dilatação); não serve para apoiar
 * pilares. A viga tem a ponta `ponta` na face do pilar; o consolo a apoia num aparelho de apoio de `aparelho` (l ao longo da viga,
 * b transversal), cujo centro fica a `a` da face. Modelo: apoio fixo no centro do aparelho (trecho rígido do pilar até ele), só a
 * carga vertical (mais a horizontal mínima no aparelho) chega ao pilar e a viga fica desligada da face (sem momento).
 */
export interface Consolo {
  id: string;
  nome: string;
  pilar: string;
  viga: string;
  ponta: 'ini' | 'fim';
  /** Face do pilar (aresta do contorno em planta: 0 = y− local, 1 = x+, 2 = y+, 3 = x−; -1 em seção circular). */
  face: number;
  /** Largura do consolo, alturas na face e na ponta, distância do centro do aparelho à face e comprimento do balanço (m). */
  b: number;
  h: number;
  hp: number;
  a: number;
  c: number;
  aparelho: { l: number; b: number };
  /** Força horizontal de cálculo informada no aparelho (kN); ausente = a mínima das opções. */
  hd?: number;
  /** Cobrimento próprio (cm); ausente = o dos pilares. */
  cobrimento?: number;
  /** Armadura editada e bloqueada: o recálculo só a verifica. */
  armadura?: ArmaduraConsolo;
}

/** Armadura de um consolo: tirante (barras em uma camada), estribos horizontais de costura (n fechados) e verticais (φ c/ s). */
export interface ArmaduraConsolo {
  tirante: { n: number; phi: number };
  horizontais: { n: number; phi: number };
  verticais: { phi: number; s: number };
}

/** Trecho curvo de uma viga (E2b): faixa de vértices [ini, fim] de `Viga.pontos` sobre um arco de círculo. */
export interface ArcoViga { ini: number; fim: number }

/** Ligação de uma ponta da barra entre grupos (E2c): engastada (gira com o nó) ou articulada (flexões livres). */
export type LigacaoBarra = 'engastada' | 'articulada';

/**
 * Carga própria de uma viga inclinada (E2c, K1.9.114), vertical (gravidade), por caso. Posições em metros ao longo da parte
 * flexível da barra a partir da ponta inicial. `concentrada`: força `valor` (kN) em `de`; `linear`: `valor` (kN/m, por metro
 * de barra) em todo o comprimento; `faixa`: `valor` de `de` a `ate`; `triangular`: varia linearmente de `valor` em `de` a
 * `valorFim` (padrão 0) em `ate`.
 */
export interface CargaInclinada {
  id: string;
  caso: string;
  tipo: 'concentrada' | 'linear' | 'faixa' | 'triangular';
  valor: number;
  valorFim?: number;
  de?: number;
  ate?: number;
}

/** Armadura editada e bloqueada de uma viga inclinada: barras nas faces superior e inferior, pele em cada face lateral e estribos. */
export interface ArmaduraInclinada {
  sup: { n: number; phi: number };
  inf: { n: number; phi: number };
  /** Barras intermediárias em cada face lateral (além das de canto). */
  laterais?: { n: number; phi: number };
  estribo: { phi: number; s: number };
}

/**
 * Viga inclinada de concreto entre pavimentos (E2c; C6.35, K1.3.16, K1.9.114): barra de 2 nós e 6 gdl entre o ponto `pIni`
 * no pavimento `pavIni` e `pFim` em `pavFim` (cota do pavimento + desnível da ponta), ligada ao pilar ou à viga que a
 * ponta toca. Não impõe diafragma. `multipla` repete a barra em cada par de pavimentos de mesma posição dentro dos
 * grupos inicial e final. Base das diagonais de contraventamento (E2d).
 */
export interface VigaInclinada {
  id: string;
  nome: string;
  pavIni: string;
  pavFim: string;
  pIni: [number, number];
  pFim: [number, number];
  /** Desnível da ponta em relação à cota do pavimento (m). */
  nivelIni?: number;
  nivelFim?: number;
  secao: { b: number; h: number };
  multipla?: boolean;
  /** Ligações das pontas (padrão engastadas). */
  ligIni?: LigacaoBarra;
  ligFim?: LigacaoBarra;
  cargas?: CargaInclinada[];
  /** Coeficientes de flambagem por plano (ausentes = os das opções). */
  flambagem?: { vertical?: number; transversal?: number };
  /** Cobrimento próprio (cm); ausente = o das vigas. */
  cobrimento?: number;
  /** Armadura editada e bloqueada: o recálculo só a verifica. */
  armadura?: ArmaduraInclinada;
}

/**
 * Diagonal de contraventamento de concreto (E2d; C6.36 a C6.46): a mesma barra de 2 nós e 6 gdl da viga inclinada, entre pontos de
 * pavimentos quaisquer (pode atravessar grupos intermediários), sem cargas próprias além do peso. `excluidas` guarda os pavimentos
 * iniciais das barras de uma diagonal múltipla que passaram a ser diagonais próprias (editar, mover e atribuir valem só no grupo
 * atual, C6.46). Nos cruzamentos de diagonais o pórtico ganha um nó, sem reduzir o comprimento de flambagem.
 */
export interface Diagonal extends VigaInclinada { excluidas?: string[] }

export type TipoLaje =
  | { tipo: 'macica'; h: number }
  /** Treliçada unidirecional (vigotas + enchimento de EPS); `modelo` do catálogo (lajes.ts). */
  | { tipo: 'trelicada'; modelo: string; capa: number }
  /** Vigotas por ficha (E3a): `ficha` (obra, catálogo ou exemplo) e `serie` (laje da série por altura e intereixo). */
  | { tipo: 'vigotas'; ficha: string; serie: string }
  /** Nervurada unidirecional moldada no local (E3a): nervuras como vigas T; `h` = altura total, `enchimento` = id da biblioteca. */
  | { tipo: 'moldada'; capa: number; intereixo: number; bw: number; h: number; enchimento: string }
  /** Nervurada bidirecional moldada no local (E3c): `forma` (cubeta da biblioteca, `formas`), altura total e capa (m). */
  | { tipo: 'nervurada'; forma: string; hTotal: number; capa: number }
  /** Alveolar protendida (E3e): `ficha` (obra, catálogo da biblioteca de normas ou exemplo) e `placa` adotada (código na ficha); a escolha automática só sugere (ver `Laje.alveolar`). */
  | { tipo: 'alveolar'; ficha: string; placa: string };

/**
 * Pano apagado = abertura (L7, K1.9.103): região fechada por vigas deliberadamente sem laje (shaft, vazio). Guarda o contorno do
 * pano que foi apagado; a detecção de panos não o recria, o aviso de pano sem laje some e a planta o marca com a cruz tracejada.
 */
export interface PanoVazio { id: string; grupo: string; contorno: [number, number][] }

export interface Laje {
  id: string;
  nome: string;
  grupo: string;
  /** Contorno pelo eixo das vigas (anti-horário), m. */
  contorno: [number, number][];
  /** Origem do lançamento automático (`dxf:<máscara>:<hash>`), para reimportar sem duplicar (L2). */
  origemLancamento?: string;
  furos?: [number, number][][];
  tipo: TipoLaje;
  /**
   * Pano a definir (L5, C7.2/C7.17): contorno fechado por vigas ainda sem tipo, marcado com "?". `tipo` guarda só um
   * valor provisório (maciça h = 10 cm); a obra com pano a definir não calcula (`DEFINIR_PANO`). Atribuir o tipo limpa a marca.
   */
  definir?: true;
  /** Direção das vigotas (graus, anti-horário a partir de +x); padrão: menor vão. */
  direcao?: number;
  /** Ponto de inserção do pano (L5, C7.5): índice do vértice do contorno, origem da numeração das vigotas e da malha; ausente = o primeiro. */
  insercao?: number;
  /** Viga de borda de cada abertura de `furos` (L5, C7.78): nenhuma, chata ou alta; faltando = nenhuma. */
  furosBorda?: ('nenhuma' | 'chata' | 'alta')[];
  /** Desnível do topo em relação ao pavimento (m; negativo = rebaixada). */
  nivel?: number;
  /** Coeficiente de engaste por borda do contorno (índice k = aresta k → k+1; ausente = 1). Bordas em pilares ficam engastadas. */
  engasteBordas?: number[];
  /** Treliçadas (N2e, K1.9.55): vigotas biapoiadas, sem continuidade nas bordas (rotações livres); ausente = contínuas. */
  vigotasBiapoiadas?: boolean;
  /** Cobrimento próprio (cm); ausente = o da obra. */
  cobrimento?: number;
  /** Treliçadas: armadura adicional das vigotas editada e bloqueada (o recálculo só a verifica). */
  armaduraVigotas?: ArmaduraVigotas;
  /** Tabela de armadura (R7a); ausente = a padrão da obra. */
  tabela?: string;
  /** Armadura base (R7d): barras ou tela soldada nas faces; ausente = sem base (só a calculada). */
  base?: ArmaduraBaseLaje;
  /** Armaduras predefinidas pelo usuário (R7d), descontadas do reforço na sua faixa. */
  predefinidas?: ArmaduraPredefinida[];
  /** Edição das posições de armadura (R7e): bloqueada, verificada a cada recálculo. */
  edicao?: EdicaoLaje;
  /** Armadura gerada só com a geometria (R7e): mínimos e base, sem os esforços; a edição manual substitui a calculada. */
  semCalculo?: boolean;
  /** Armadura de punção informada pelo usuário (N2d): somada à calculada. */
  puncao?: GrupoPuncao[];
  /** Nervurada moldada no local (E3a): armadura de base atribuída às nervuras (inferior e superior: n barras de φ mm; estribo φ mm a cada s m); a E3b a usa e verifica. */
  armaduraMoldada?: ArmaduraMoldada;
  /** Vigotas duplas e triplas (E3b, C7.14): vigota (índice, da primeira à última) com 2 ou 3 vigotas lado a lado; só em fichas que informam `multipla`. */
  vigotasMultiplas?: VigotaMultipla[];
  /** Vigotas editadas (E3b, C7.117–C7.123): tipo da série, armaduras, parciais, transversal e esforços atribuídos; bloqueadas até `armadura.desbloquear`. */
  edicaoVigotas?: EdicaoVigota[];
  /** Momentos mínimos por tipo de vão (E3b, C7.10): divisores de p·ℓ² (0 = desligado); ausente = os da obra. */
  momentosMin?: MomentosMinLaje;
  /** Classe de agressividade ambiental do pano (E3b, C7.11): nível de protensão das vigotas protendidas pela Tabela 13.4; ausente = a da obra. */
  exposicao?: 'I' | 'II' | 'III' | 'IV';
  /** Nervurada bidirecional (E3c, K1.9.93): ponto por onde passa o eixo de uma nervura de cada direção (origem do arranjo das nervuras); ausente = o ponto de inserção do pano. */
  pontoNervuras?: [number, number];
  /** Nervurada bidirecional (E3c): zonas maciças manuais (polígonos, m), além da faixa junto às vigas da opção `nervuradaMacicoViga`. */
  zonasMacicas?: [number, number][][];
  /** Nervurada bidirecional (E3c, K1.9.94, K1.13.3): armadura base da mesa e das nervuras; ausente = só a calculada. */
  baseNervurada?: BaseNervurada;
  /** Nervurada bidirecional (E5g, K1.13.4.1-1): nervuras (índice 0-based na direção) que concentram a armadura do grupo uniformizado, por direção (0 = a da laje, 1 = transversal); ausente ou vazio = todas as nervuras do grupo com a mesma armadura. */
  nervurasConcentrar?: [number[], number[]];
  /** Alveolar (E3e): placa fixada pelo usuário, negativos editados e processo construtivo do pano; ausente = tudo automático. */
  alveolar?: ConfigAlveolar;
  /** Plano inclinado do pano (E3f, C7.62): id de `BuildingModel.planos` do mesmo grupo; a cota do topo é z(x, y) do plano (no lugar de `nivel`). */
  plano?: string;
  /** Pano a definir (E3f, C7.16): espessura informada (m), passada às vigas chatas do contorno; ausente = a do tipo provisório. */
  espessuraDefinir?: number;
}

/**
 * Definição de um plano inclinado (E3f, C7.63–C7.65). Cotas em m relativas ao topo do pavimento (desnível); inclinação em %
 * (tangente × 100). `tresPontos`: três pontos com o desnível de cada. `retaHorizontal`: dois pontos de mesma cota (`desnivel`)
 * e a inclinação perpendicular a essa reta, subindo para a esquerda de p1→p2 (negativa: desce). `maximaDeclividade`: dois
 * pontos da linha de máxima declividade, o desnível do primeiro e a inclinação, subindo de p1 para p2 (negativa: desce).
 */
export type DefinicaoPlano =
  | { tipo: 'tresPontos'; pontos: [[number, number, number], [number, number, number], [number, number, number]] }
  | { tipo: 'retaHorizontal'; pontos: [[number, number], [number, number]]; desnivel: number; inclinacao: number }
  | { tipo: 'maximaDeclividade'; pontos: [[number, number], [number, number]]; desnivel: number; inclinacao: number };
/** Plano inclinado de um grupo (E3f, C7.61): nome editável, cor (índice da paleta `--plano-*`) e definição. */
export interface Plano { id: string; nome: string; grupo: string; cor?: number; def: DefinicaoPlano }

/** Negativo de uma ponta da placa alveolar na capa: φ (mm) a cada `s` (m); comprimento no pano em m ou em percentual do vão. */
export interface NegativoAlveolarEd { phi: number; s: number; comprimento?: number; percentual?: number }
/**
 * Configuração do pano alveolar (E3e): `fixa` = a placa do tipo foi escolhida pelo usuário (a verificação não sugere trocar);
 * `negativos` = armadura negativa editada nas pontas (início e fim no sentido da direção das placas), bloqueada até
 * `armadura.desbloquear`; `processo` = processo construtivo do pano (ausente = opção `alveolarProcesso`).
 */
export interface ConfigAlveolar { fixa?: true; negativos?: [NegativoAlveolarEd | null, NegativoAlveolarEd | null]; processo?: 0 | 1 | 2 }

/** Barras de uma nervura: n barras de φ mm. */
export interface BarrasNervura { n: number; phi: number }
/**
 * Ábaco (capitel) de uma nervurada bidirecional (E3d): zona maciça junto ao pilar (ou em qualquer ponto), com a espessura do pano
 * aliviado (`hAbaco` = altura total no ábaco, que pode descer abaixo da laje). `poligono` é o nominal (m); a zona efetiva é ajustada
 * às cubetas inteiras (`abacos.ts`). `automatico`: gerado a partir do pilar `pilar` (refeito por `abaco.gerar`); senão desenhado à mão.
 * `base`: armadura base entre nervuras (barras corridas de borda a borda, uma por vão entre eixos de nervuras); ausente = o padrão (2φ da tabela).
 */
export interface Abaco {
  id: string; laje: string; poligono: [number, number][]; hAbaco: number; automatico: boolean;
  pilar?: string;
  /** Dimensões da geração automática (parâmetros e extensão em cada face), para o memorial. */
  gerado?: GeradoAbaco;
  base?: ArmaduraBaseAbaco;
  /** Ábaco manual usado para simular uma viga (aviso `ABACO_VIGA`): confirmação do usuário em vez do aviso. */
  comoViga?: boolean;
}
/** Parâmetros usados na geração e a extensão (m, da face do pilar à borda) de cada face: de onde veio (pilar no cone, sentido oposto ou mínimo) e se o limite mínimo/máximo valeu. */
export interface GeradoAbaco {
  fracao: number; cone: number; extensao: number; limMin: number; limMax: number;
  faces: { lado: 'u+' | 'u-' | 'v+' | 'v-'; extensao: number; origem: 'cone' | 'oposto' | 'minimo'; vizinho?: string; distancia?: number; limitado?: 'min' | 'max' }[];
}
/** Armadura base do ábaco: n barras de φ mm em cada vão entre eixos de nervuras, nas faces inferior e superior, nas duas direções. */
export interface ArmaduraBaseAbaco { inf?: BarrasNervura | null; sup?: BarrasNervura | null }
/** Armadura base de uma direção de nervuras: barras inferiores e superiores em cada nervura; só entra no dimensionamento com `considerar`. */
export interface BaseNervuraDir { inf?: BarrasNervura; sup?: BarrasNervura; considerar?: boolean }
/**
 * Armadura base da nervurada bidirecional (E3c): `mesa` = malha na capa e nas zonas maciças (barras ou tela, como as maciças);
 * `considerarMesa` (E5g) = a malha da mesa e das zonas maciças entra na verificação da mesa e da zona maciça (senão só descrita e desenhada);
 * `nervuras` = barras corridas nas nervuras de cada direção (0 = a da laje, 1 = transversal); `detalhada` sobrepõe a opção
 * `lajeBaseDetalhada` (desenhada e medida; senão só a descrição geral na listagem).
 */
export interface BaseNervurada { mesa?: ArmaduraBaseLaje; considerarMesa?: boolean; nervuras?: [BaseNervuraDir | null, BaseNervuraDir | null]; detalhada?: boolean }

/** Tipo de vão da vigota: extremo (contínua numa ponta), intermediário (contínua nas duas), isolado (biapoiada) ou balanço. */
export type TipoVao = 'extremo' | 'intermediario' | 'isolado' | 'balanco';
export const TIPOS_VAO: { v: TipoVao; rotulo: string }[] = [
  { v: 'extremo', rotulo: 'Vão extremo' }, { v: 'intermediario', rotulo: 'Vão intermediário' }, { v: 'isolado', rotulo: 'Vão isolado' }, { v: 'balanco', rotulo: 'Balanço' },
];
/** Divisores de p·ℓ² dos momentos mínimos positivo e negativo por tipo de vão (0 = desligado). */
export type MomentosMinLaje = Partial<Record<TipoVao, { pos?: number; neg?: number }>>;
/** Vigota múltipla: `indice` da vigota escolhida (0 = primeira, da borda de inserção) e `n` (2 = dupla, 3 = tripla). */
export interface VigotaMultipla { indice: number; n: 2 | 3 }
/** Armadura parcial: n barras de φ mm no comprimento total, num comprimento dado (m) ou numa percentagem do comprimento da vigota. */
export interface BarrasVigota { n: number; phi: number; comprimento?: number; percentual?: number }
/**
 * Vigota editada (E3b): `tipo` = tipo da série da ficha (armadas e protendidas); `inf` = armadura inferior adicional (armadas) ou
 * principal (moldadas, até 2 barras); `sup` = armadura superior adicional sobre os apoios; `adicionalCurta` = segunda parcela do positivo;
 * `transversal` = estribo (moldadas) ou armadura transversal da vigota armada; `momentos` = esforços atribuídos (igualação manual, vigota
 * genérica de concreto): positivo, negativos das pontas (≤ 0) e cortantes das pontas, por nervura.
 */
export interface EdicaoVigota {
  indice: number;
  tipo?: string;
  inf?: BarrasVigota; adicionalCurta?: BarrasVigota; sup?: BarrasVigota;
  transversal?: { phi: number; s: number; zona?: number };
  momentos?: { pos: number; neg: [number, number]; v: [number, number] };
}

export interface ArmaduraMoldada { inf: { n: number; phi: number }; sup?: { n: number; phi: number }; estribo?: { phi: number; s: number } }

/**
 * Grupo de armadura de punção informado: `linhas` radiais com `barras` estribos (ou conectores) de φ `phi` (mm) por
 * linha, a partir da face do pilar, espaçados de `s` (m). Sem pilar, vale só o `ponto` (desenho e quantidade).
 */
export interface GrupoPuncao {
  id: string;
  pilar?: string;
  ponto?: [number, number];
  linhas: number;
  barras: number;
  phi: number;
  s?: number;
}

/** Armadura base de uma face: tela soldada (designação NBR 7481; `giro` troca a direção dos fios principais) ou barras por direção (φ mm, s cm). */
export interface BaseFaceLaje {
  tela?: string; giro?: boolean;
  barras?: [{ phi: number; s: number } | null, { phi: number; s: number } | null];
}
/** Armadura base da laje maciça; `detalhada` sobrepõe a opção `lajeBaseDetalhada` (ausente = a opção). */
export interface ArmaduraBaseLaje { inf?: BaseFaceLaje; sup?: BaseFaceLaje; detalhada?: boolean }
/**
 * Armadura predefinida: barra representativa de `a` na direção `angulo` (graus) com `comprimento` (m), `n` barras
 * φ `phi` (mm) espaçadas de `s` (m) à esquerda da representativa. A faixa de influência é n × s.
 */
export interface ArmaduraPredefinida { id: string; face: 'inf' | 'sup'; a: [number, number]; angulo: number; comprimento: number; phi: number; s: number; n: number }

/**
 * Edição de uma posição de armadura de laje maciça (R7e). A posição é identificada pelo número (N1, N2, …) e pela
 * `assinatura` (`face|tipo|dir`), para a edição ser desconsiderada quando a numeração mudar. Campos ausentes seguem o detalhamento.
 * `emenda`: corta a barra na distância `em` (m) a partir do início da representativa, com o traspasse construtivo.
 */
export interface EdicaoBarraLaje {
  pos: string; assinatura: string;
  n?: number; phi?: number; s?: number; comprimento?: number; ganchos?: [number, number];
  emenda?: { em: number };
}
/** Edição das posições de uma laje: barras editadas e grupos de posições (editar uma altera todas do grupo). */
export interface EdicaoLaje { barras: EdicaoBarraLaje[]; grupos?: { pos: string; assinatura: string }[][] }

/**
 * Zona de uniformização (R7e): as barras da face (e direção, quando dada) que passam pela zona recebem a maior taxa
 * (φ e espaçamento de maior As/m) e o maior comprimento entre elas. `linha`: segmento com `largura` (m) de cada lado
 * somada (faixa centrada no segmento); `retangulo`: dois cantos opostos (eixos globais).
 */
export interface ZonaUniformizacao {
  id: string; grupo: string; forma: 'linha' | 'retangulo';
  pontos: [[number, number], [number, number]];
  largura?: number; face: 'inf' | 'sup'; angulo?: number;
}
/** Linha de dobra (R7e): local de negativo máximo e de emenda preferencial da armadura inferior; limita o "vão" dos mínimos em % do vão. */
export interface LinhaDobra { id: string; grupo: string; a: [number, number]; z: [number, number] }

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
/** Natureza do caso de carga: permanente, variável, vento (ação horizontal), excepcional ou empuxo de terra (permanente com γ próprio). */
export type Natureza = 'G' | 'Q' | 'W' | 'E' | 'H';

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
  /** Descrição livre (referência da hipótese). */
  descricao?: string;
  /** Caso-pai: este caso é um arranjo do pai (arranjos do mesmo pai são incompatíveis entre si; o pai deixa de combinar). */
  pai?: string;
  /** Tipo de empuxo (`BuildingModel.empuxos`) de um caso H. */
  empuxo?: string;
}

/** Relação entre dois casos de carga: compatível, incompatível (nunca juntos) ou simultâneo (o primeiro segue o segundo). */
export type RelacaoCasos = 'compativel' | 'incompativel' | 'simultaneo';
/** Exceção à relação derivada de `grupo`/`simultaneo`/`pai` (tabela de compatibilidade editável). */
export interface CompatCasos { a: string; b: string; relacao: RelacaoCasos }

/** Estados-limite / grupos de combinações selecionáveis. */
export type EstadoId = 'concreto' | 'fundacoes' | 'solo' | 'deslocamentos' | 'fissuracao' | 'flecha' | 'equilibrio' | 'incendio';
export interface EstadoConfig { ativo: boolean; modo: 'norma' | 'usuario' }
/** Só o que difere do padrão (ver `ESTADOS_INFO`). */
export type EstadosLimite = Partial<Record<EstadoId, Partial<EstadoConfig>>>;

/** Situação (combinação) de projeto definida pelo usuário para um grupo de estados. */
export interface SituacaoUsuario {
  id: string;
  nome: string;
  estado: EstadoId;
  /** Tipo da situação (informativo): normal, de construção/especial ou excepcional. */
  situacao: 'normal' | 'especial' | 'excepcional';
  /** 'fatores': fator final por caso; 'gamapsi': γ e ψ separados (fator = γ·ψ). */
  modo: 'fatores' | 'gamapsi';
  fatores: Record<string, number>;
  gama?: Record<string, number>;
  psi?: Record<string, number>;
}

/** Estrato do terreno de um tipo de empuxo. */
export interface EstratoEmpuxo {
  /** Espessura (m); o último estrato continua até a base. */
  espessura: number;
  /** Peso específico aparente (kN/m³) e submerso (kN/m³; ausente = aparente − 10). */
  gama: number; gamaSub?: number;
  /** Ângulo de atrito interno (graus). */
  phi: number;
}
/** Tipo de empuxo de terra reutilizável (paredes de subsolo). */
export interface TipoEmpuxo {
  id: string;
  nome: string;
  /** repouso: K0 = 1 − sen φ; rankine/coulomb: empuxo ativo com talude `talude`. */
  metodo: 'repouso' | 'rankine' | 'coulomb';
  estratos: EstratoEmpuxo[];
  /** Cota do topo do aterro (m, mesma referência das cotas dos pavimentos). */
  cotaAterro: number;
  /** Cota do nível d'água (m); ausente = sem água. */
  nivelAgua?: number;
  /** Inclinação do talude β (graus) e atrito solo-parede δ (graus, Coulomb). */
  talude?: number; delta?: number;
  /** Alívio da pressão de água por drenagem (%). */
  alivio?: number;
  /** Sobrecarga no terreno (kN/m²). */
  sobrecarga?: number;
  /** Coeficiente K informado (substitui o do método). */
  k?: number;
}

/** Carga aplicada num lance de pilar (eixos globais): no topo ou a `altura` m acima da base do lance. */
export interface CargaPilar {
  id: string;
  pilar: string;
  /** Lance (pavimento do topo). */
  pavimento: string;
  /** G, Q ou id de caso adicional. */
  caso: string;
  /** Ausente = topo do lance (concentrada); na carga em faixa, início da faixa a partir da base do lance. */
  altura?: number;
  /** kN (N > 0 = compressão, para baixo); kN·m. Nas cargas uniformes e em faixa, N, Hx e Hy em kN/m (momentos ignorados). */
  N: number; Hx: number; Hy: number; Mx: number; My: number;
  /** Torção (kN·m) em torno do eixo do pilar (N2c); só na concentrada. */
  T?: number;
  /** N2c: concentrada (padrão), uniforme em todo o lance ou em faixa de `altura` a `ate`. */
  tipo?: 'concentrada' | 'uniforme' | 'faixa';
  /** Fim da faixa a partir da base do lance (m). */
  ate?: number;
  /** Eixos de Hx/Hy e Mx/My: globais (padrão) ou locais da seção (x ao longo de b, y ao longo de h). */
  eixos?: 'global' | 'local';
}

export interface Carga {
  id: string;
  /** Id do grupo; 'fundacao' = nível de fundação (cargas sobre vigas e elementos de fundação, FU2). */
  grupo: string;
  /** G, Q ou id de caso adicional. */
  caso: string;
  tipo: 'ponto' | 'linha' | 'area';
  valor: number;
  pontos: [number, number][]; // ponto: 1; linha: polilinha; área: contorno
  /** Origem automática (ex.: alvenaria da camada X da máscara), para regenerar. */
  origem?: { tipo: 'alvenaria'; camada: string; bloco: string; espessura: number; altura: number };
  /** Carga gerada pelo cálculo das escadas (E4c): reação de um apoio ou degraus iniciais; derivada, nunca gravada na obra. */
  escada?: { escada: string; lance: number; apoio: string };
}

/** Corte do edifício (V2): linha traçada na planta (poligonal); o observador olha para o lado `sentido` do traçado. */
export interface CorteEdificio {
  id: string;
  nome: string;
  pontos: [number, number][];
  /** Lado do traçado (no sentido dos pontos) para onde o observador olha: esquerda ou direita. */
  sentido: 'esq' | 'dir';
  /** Profundidade visível além do plano (m); ausente = até o fim do edifício. */
  profundidade?: number;
}
/** Linha de seção do pavimento (V2): reta a–b em qualquer direção; `pavimento` = o pavimento em que foi traçada. */
export interface LinhaSecao { id: string; nome: string; a: [number, number]; b: [number, number]; pavimento?: string }

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
  /** Vigas inclinadas entre pavimentos (E2c); ausente = nenhuma. */
  vigasInclinadas?: VigaInclinada[];
  /** Diagonais de contraventamento entre pavimentos (E2d); ausente = nenhuma. */
  diagonais?: Diagonal[];
  /** Consolos curtos que apoiam vigas nos pilares (E2e); ausente = nenhum. */
  consolos?: Consolo[];
  vento?: Vento;
  /** Pranchas: dados do carimbo (definidos pelo usuário), formato e escala. */
  prancha?: ConfigPrancha;
  /** Opções de cálculo alteradas pelo usuário (o resto segue o padrão de opcoes.ts). */
  opcoes?: Partial<OpcoesCalculo>;
  /** Perfil dos padrões das opções: ausente = padrão do sistema; 'nbr' = padrão NBR 6118. */
  perfilOpcoes?: 'nbr';
  /** Casos de carga adicionais. */
  casos?: CasoAdicional[];
  /** Exceções da tabela de compatibilidade entre casos (N2a). */
  compat?: CompatCasos[];
  /** Cortes do edifício e linhas de seção dos pavimentos (V2). */
  cortes?: CorteEdificio[];
  secoes?: LinhaSecao[];
  /** Estados-limite (grupos de combinações): só o que difere do padrão. */
  estados?: EstadosLimite;
  /** Situações de projeto do usuário. */
  situacoes?: SituacaoUsuario[];
  /** Tipos de empuxo de terra. */
  empuxos?: TipoEmpuxo[];
  /** Cargas nos pilares. */
  cargasPilar?: CargaPilar[];
  /** Tipos de pilar-parede (E1b), gravados com a obra e reutilizáveis. */
  tiposPilarParede?: TipoPilarParede[];
  /** Pilares-parede lançados (E1b); cada lado vira casca (lado ≥ 5 × a espessura) ou barra. */
  pilaresParede?: PilarParede[];
  /** Paredes de concreto (E1c), com ou sem empuxo; cascas como o pilar-parede. */
  paredes?: Parede[];
  /** Muros de arrimo em balanço isolados (X6/E1d): estabilidade e armadura do fuste e da base por metro. */
  murosArrimo?: MuroArrimoObra[];
  /** Armadura padrão de reforço das aberturas, por tipo, aplicada às que não têm armadura própria (E1d). */
  aberturasPadrao?: { porta?: ArmaduraAbertura; janela?: ArmaduraAbertura };
  /** Tipos de alvenaria estrutural (E1e) e blocos de concreto da biblioteca da obra. */
  tiposAlvenaria?: TipoAlvenaria[];
  blocos?: TipoBloco[];
  /** Verga padrão das aberturas em parede de blocos, por tipo, aplicada às que não têm verga própria (E1e). */
  vergasPadrao?: { porta?: ArmaduraVerga; janela?: ArmaduraVerga };
  /** Fundações lançadas no edifício (frente FU): dados do terreno, sondagens e elementos. */
  fundacao?: FundacaoEdificio;
  /** Tabelas de armadura alteradas ou criadas pelo usuário (R7a); as de fábrica não são guardadas. */
  tabelas?: TabelasArmadura;
  /** Tabelas normativas alteradas pelo usuário (N3, biblioteca de normas); as de fábrica não são guardadas. */
  normas?: NormasModelo;
  /** Tramos predefinidos (R7b): vigas consecutivas alinhadas cuja armadura inferior passante corre sem emenda no apoio comum. */
  tramos?: string[][];
  /** Zonas de uniformização da armadura das lajes (R7e). */
  zonasLaje?: ZonaUniformizacao[];
  /** Linhas de dobra das lajes (R7e). */
  linhasDobra?: LinhaDobra[];
  /** Vista permanente da obra (L4): tipos de texto de referência visíveis na planta e textos deslocados. */
  vista?: VistaObra;
  /** Cotas permanentes de planta (L6): séries associativas aos elementos (`building/cotas.ts`). */
  cotas?: CotaPlanta[];
  /** Agrupamentos de pórticos (R7f): vigas armadas com a mesma armadura (a do pórtico que governa) e um só desenho nas pranchas. */
  agrupamentos?: AgrupamentoPorticos[];
  /** Cópias da armadura das lajes (R7f), guardadas para recuperar depois (ex.: antes de abrir um furo imprevisto). */
  copiasLaje?: CopiaArmaduraLajes[];
  /** Flechas (N2f): etapas de carga e limites por tipo de elemento; só o que difere do padrão. */
  flechas?: FlechasConfig;
  /** Resistência ao fogo (N2g): TRRF por grupo, ocupação, revestimentos e dados por elemento; só o que difere do padrão. */
  fogo?: FogoConfig;
  /** Fichas de vigotas e enchimentos da obra (E3a); só o que a obra usa ou criou, o catálogo interno não é guardado. */
  tiposLaje?: TiposLajeObra;
  /** Ábacos das lajes nervuradas bidirecionais (E3d); ausente = nenhum. */
  abacos?: Abaco[];
  /** Panos apagados que viraram abertura (L7, cruz tracejada); ausente = nenhum. */
  panosVazios?: PanoVazio[];
  /** Escadas (E4a) e seus tipos de lance reutilizáveis; ausente = nenhuma. */
  escadas?: Escada[];
  tiposLance?: TipoLance[];
  /** Planos inclinados dos grupos (E3f): lajes e vigas com `plano` seguem z(x, y); ausente = nenhum. */
  planos?: Plano[];
}

/** Tipos de texto de referência da planta (L4, C3.30). */
export type TipoTexto = 'nomes' | 'secoes' | 'cotas' | 'cargas' | 'niveis';
/** Deslocamento (m, eixos da planta) e rotação (graus) do texto de referência de um elemento (L4, C3.29). */
export interface RefPos { dx: number; dy: number; rot?: number }
/** Vista da obra gravada com ela: tipos de texto visíveis (ausente = todos) e posições dos textos de referência por id de elemento. */
export interface VistaObra { textos?: TipoTexto[]; refs?: Record<string, RefPos> }

/** Elemento a que uma referência de cota se liga (L6). Abertura: `id` da abertura e `sub` = id da parede. */
export interface ElemCota { tipo: 'pilar' | 'viga' | 'parede' | 'abertura' | 'fundacao' | 'eixo'; id: string; sub?: string }
/** Parte do elemento medida (L6): faces do lado menor (A) e maior (B) da direção da cota, eixo, centro ou extremos do eixo da viga/parede. */
export type ParteCota = 'faceA' | 'faceB' | 'eixo' | 'centro' | 'extremoI' | 'extremoJ';
/** Referência de uma cota: associativa (`elem`) ou ponto livre (`fixo`, também o último valor de um elemento removido). */
export interface RefCota { elem?: ElemCota; parte: ParteCota; fixo?: [number, number]; /** O elemento foi removido: `fixo` guarda o último ponto (aviso na cota). */ removido?: boolean }
/**
 * Cota permanente de planta (L6). `refs` (≥ 2) na ordem da série; `linha.angulo` = direção da medida (graus; 0 = x, 90 = y) e
 * `linha.offset` = posição da linha de cota na normal n = (−sen a, cos a) (m, coordenada absoluta). 'serie': trechos
 * consecutivos; 'baseline': cada trecho a partir da primeira referência. `travada`: a distância é mantida (propaga o movimento).
 */
export interface CotaPlanta {
  id: string; grupo: string; estilo: 'serie' | 'baseline';
  refs: RefCota[];
  linha: { angulo: number; offset: number };
  travada?: boolean;
}

/** Agrupamento de pórticos: vigas que levam a mesma armadura (a envoltória do grupo). Uma viga pertence a um só agrupamento. */
export interface AgrupamentoPorticos { id: string; nome: string; vigas: string[] }

/** Dados de armadura de uma laje guardados numa cópia (R7f) junto com a geometria em que valiam. */
export interface CopiaLaje {
  laje: string; nome: string; grupo: string;
  contorno: [number, number][]; furos?: [number, number][][];
  base?: ArmaduraBaseLaje; predefinidas?: ArmaduraPredefinida[]; edicao?: EdicaoLaje; semCalculo?: boolean; armaduraVigotas?: ArmaduraVigotas; puncao?: GrupoPuncao[]; tabela?: string; edicaoVigotas?: EdicaoVigota[]; vigotasMultiplas?: VigotaMultipla[];
}
/** Cópia da armadura das lajes de todos os grupos (ou de um): dados das lajes, zonas de uniformização e linhas de dobra. */
export interface CopiaArmaduraLajes { id: string; nome: string; data: string; lajes: CopiaLaje[]; zonas: ZonaUniformizacao[]; linhas: LinhaDobra[] }

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
  /** Pilares apoiados: um (isolado) ou vários (sapata associada, bloco com vários pilares; FU3). */
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
  /**
   * Dimensões e armadura impostas (m), só verificadas. Sapata: base A × B, alturas h e h0, armadura por direção
   * (φ mm, espaçamento `s` m); bloco: A × B = lx × ly, h e armadura dos tirantes (φ, `n` barras); tubulão: A = B = base Db e fuste Df.
   */
  impostas?: ImpostasFundacao;
  /** Sapata de concreto simples (sem armadura de flexão; NBR 6118, cap. 24) (FU3). */
  simples?: boolean;
  /** Sapata de altura constante (h0 = h): só ela é aparada por limites (FU3). */
  alturaConstante?: boolean;
  /**
   * Igualar (FU3): este elemento copia do elemento `igualA` o tipo, a geometria e a armadura calculados; fica só verificado
   * (com erro se não atender). O modelo é calculado antes.
   */
  igualA?: string;
}

export interface ImpostasFundacao {
  A: number; B: number; h?: number; h0?: number;
  armadura?: { x?: { phi: number; s?: number; n?: number }; y?: { phi: number; s?: number; n?: number } };
  /** Tubulão: diâmetro do fuste (m). */
  Df?: number;
}

/**
 * Limite poligonal (divisa, poço de elevador, reservatório): as sapatas de altura constante do nível não o invadem; a parte
 * com o(s) pilar(es) fica (FU3). Polilinha aberta (divisa) ou fechada.
 */
export interface LimiteFundacao {
  id: string;
  nome: string;
  pontos: [number, number][];
  fechado?: boolean;
  /** Cota de assentamento do nível a que vale (m); ausente = todos os níveis. */
  cota?: number;
}

export interface FundacaoEdificio {
  terreno: TerrenoFundacao;
  /** Furos de sondagem (mesmo formato do módulo Fundações). */
  sondagens: Boring[];
  /** Parâmetros do módulo Fundações que diferem do padrão. */
  params?: Partial<FoundationParams>;
  elementos: ElementoFundacao[];
  /** Vigas de equilíbrio e de travamento (FU2). */
  vigas?: VigaFundacao[];
  /** Limites poligonais que aparam as sapatas de altura constante (FU3). */
  limites?: LimiteFundacao[];
  /** Níveis de fundação calculados (cotas de assentamento, m); ausente = todos. Os demais mantêm o cálculo anterior. */
  niveis?: number[];
  /** Radiers sobre base elástica (FU6): entram na análise global com molas de Winkler. */
  radiers?: Radier[];
  /** Vigas de fundação sobre base elástica (FU6): entram na análise global com molas de Winkler. */
  vigasElasticas?: VigaElastica[];
  /** Sapatas corridas (FU7a): sob parede (carga linear, dimensionamento rígido) ou sob alinhamento de pilares (viga sobre base elástica). */
  corridas?: SapataCorrida[];
}

/** Aba da sapata corrida: nas duas faces do elemento apoiado ou só à esquerda / à direita do sentido do traçado. */
export type AbaCorrida = 'ambas' | 'esq' | 'dir';

/**
 * Sapata corrida (FU7a), lançada por polilinha no nível de fundação sob uma parede ou carga linear (largura pela σadm,
 * flexão transversal CEB-70 numa faixa de 1 m, armadura de distribuição) ou sob um alinhamento de pilares / viga de
 * fundação (viga sobre base elástica no pórtico espacial, como na FU6, mais a flexão transversal da aba).
 * Aba de um lado só: o elemento apoiado fica rente à divisa; o momento N·e vai para vigas de equilíbrio (cintas).
 */
export interface SapataCorrida {
  id: string;
  nome: string;
  /** Eixo do elemento apoiado (parede, viga de fundação ou alinhamento de pilares), m. */
  pontos: [number, number][];
  aba: AbaCorrida;
  /** Largura do elemento apoiado (parede, viga ou nervura), m. */
  bw: number;
  /** Largura total da base (m). Sob parede, ausente = calculada pela σadm; informada = só verificada. Sob pilares, ausente = o padrão da opção `corridaBPadrao`. */
  B?: number;
  /** Altura no eixo (m) e espessura da aba na borda (m); ausentes = calculadas (sob pilares, a altura padrão é a da opção `corridaHPadrao`). */
  h?: number;
  h0?: number;
  /** Elemento apoiado de alvenaria: a seção de referência da flexão fica mais para dentro (opção `corridaRefAlvenaria`). */
  alvenaria?: boolean;
  /** Aba de um lado só: vigas de equilíbrio (cintas) até sapatas internas absorvem o momento N·e e a pressão fica uniforme. */
  equilibrio?: boolean;
  /** Coeficiente de reação (kN/m³; sob pilares) e σadm (kN/m²) próprios; ausentes = os das opções e do terreno. */
  k?: number;
  sigmaAdm?: number;
  /** Cota de assentamento (m); ausente = a cota de fundação da obra. */
  cota?: number;
  /**
   * Parede sobre a qual a sapata corrida foi lançada (FU7b): o eixo e a largura do apoio seguem a parede, e a carga por
   * metro vem das reações da base da parede na análise (N, momento fora do plano e cortante normal), além das cargas
   * lançadas no nível de fundação. Só paredes que nascem na fundação.
   */
  parede?: string;
  /** Coeficiente de atrito base-solo μ (verificação ao deslizamento sob parede com cortante); ausente = a opção `fundCorridaAtrito`. */
  atrito?: number;
  /**
   * Cintas (FU8a): vigas de equilíbrio da aba de um lado só, da sapata corrida (no eixo, na abscissa `s`) a sapatas internas.
   * Só sob parede. Cada cinta toma o momento N·e do trecho tributário e alivia o elemento da ponta oposta.
   */
  cintas?: CintaCorrida[];
}

/** Cinta de uma sapata corrida de aba única (FU8a): viga de equilíbrio entre o eixo da corrida e um elemento interno. */
export interface CintaCorrida {
  id: string;
  nome: string;
  /** Abscissa ao longo do eixo da corrida onde a cinta nasce (m, a partir do primeiro ponto). */
  s: number;
  /** Ponta interna: id de elemento de fundação ou de pilar que nasce na fundação. */
  fim: string;
  /** Seção (m). */
  b: number;
  h: number;
  /** Seção imposta: só verificada. */
  fixa?: boolean;
  /** Ancoragem editável das barras superiores além da face de cada ponta (m); ausente = lb. */
  ancoragem?: { ini?: number; fim?: number };
}

/**
 * Radier (FU6): placa maciça de concreto no nível de fundação, apoiada no solo por molas de Winkler (k × área de
 * influência de cada nó). Os pilares que nascem na fundação dentro do contorno ficam sem vínculo externo: o pé do
 * pilar é um nó da malha do radier, no pórtico espacial.
 */
export interface Radier {
  id: string;
  nome: string;
  /** Contorno (anti-horário), m. */
  contorno: [number, number][];
  furos?: [number, number][][];
  /** Espessura (m). */
  h: number;
  /** Coeficiente de reação vertical do solo (kN/m³); ausente = o das opções (`radierK`). */
  k?: number;
  /** σadm própria (kN/m²); ausente = a do terreno. */
  sigmaAdm?: number;
}

/**
 * Forma da seção de uma viga de fundação (E5k, C6.22): T (mesa dos dois lados), L (mesa de um lado só) ou plana (retangular
 * larga, b ≥ h). Ausente = retangular b × h. `bf` é a largura total da mesa e `hf` a sua espessura (m); `mesa` diz em que
 * face fica a mesa: 'inferior' (T invertido, apoiada no solo: a largura de contato é a da mesa) ou 'superior' (a mesa é
 * piso ou laje; a alma é que se apoia no solo). Padrão: inferior na viga sobre base elástica, superior na de equilíbrio/travamento.
 */
export interface FormaVF {
  tipo: 'T' | 'L' | 'plana';
  bf?: number;
  hf?: number;
  mesa?: 'inferior' | 'superior';
}

/**
 * Viga de fundação sobre base elástica (FU6): viga apoiada no solo ao longo do comprimento (molas k × largura ×
 * comprimento de influência), lançada por polilinha no nível de fundação; os pilares que nascem na fundação sobre ela
 * ficam sem vínculo externo.
 */
export interface VigaElastica {
  id: string;
  nome: string;
  /** Eixo (polilinha, m). */
  pontos: [number, number][];
  /** Seção (m): largura da base apoiada no solo e altura. */
  b: number;
  h: number;
  /** Coeficiente de reação vertical (kN/m³); ausente = o das opções (`radierK`). */
  k?: number;
  sigmaAdm?: number;
  /** Forma da seção (E5k): T, L ou plana; ausente = retangular. Com mesa, `b` é a largura da alma. */
  forma?: FormaVF;
}

/** Viga de equilíbrio (alavanca: centra a fundação excêntrica) ou de travamento (bloco de 1 e 2 estacas). */
export type TipoVigaFundacao = 'equilibrio' | 'travamento';

/**
 * Viga de fundação entre dois elementos (ou elemento e pilar) do nível de fundação, sem apoio no solo: leva as cargas
 * sobre ela às pontas e, se for de equilíbrio, centra o elemento excêntrico da ponta equilibrada (FU2).
 */
export interface VigaFundacao {
  id: string;
  nome: string;
  tipo: TipoVigaFundacao;
  /** Pontas: id de elemento de fundação ou de pilar que nasce na fundação. */
  ini: string;
  fim: string;
  /** Equilíbrio: pontas equilibradas; 'auto' (padrão) = as que chegam a sapata ou bloco excêntrico. */
  equilibrio?: { ini: boolean; fim: boolean } | 'auto';
  /** Seção (m). */
  b: number;
  h: number;
  /** Seção imposta (igualada ou fixada pelo usuário): só verificada. Sem ela, a altura (e depois a largura) cresce até atender. */
  fixa?: boolean;
  /**
   * Ancoragem editável (C11.45): comprimento reto (m) das barras superiores além da face do pilar de cada ponta.
   * Ausente = o comprimento de ancoragem básico lb calculado; valor menor que lb gera aviso.
   */
  ancoragem?: { ini?: number; fim?: number };
  /** Forma da seção (E5k): T, L ou plana; ausente = retangular. Com mesa, `b` é a largura da alma. */
  forma?: FormaVF;
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
  /** Logo do carimbo: JPEG em base64 (limite `LIMITE_LOGO`), dimensões em px e nome do arquivo de origem. */
  logo?: { dados: string; largura: number; altura: number; nome?: string };
  /** Rótulos das barras das lajes reposicionados nas pranchas (R7e): `laje|pos` → deslocamento no papel (mm). */
  rotulos?: Record<string, [number, number]>;
  /** Símbolos do pilar que passa, nasce ou morre no pavimento (V5, K1.4.57); ausente = os padrões. */
  simbolos?: Partial<SimbolosPilar>;
  /** Camadas (nome, cor ACI, pena, tipo de linha) e tamanho de texto por tipo diferentes do padrão da NBR 16861 (V5, K1.4.90). */
  estilo?: EstiloParcial;
  /** Moldura própria: modelo importado de DXF (V5, K1.11.54). */
  moldura?: ConfigMoldura;
  /** Detalhes DXF inseridos nas pranchas (V5, K1.11.54). */
  detalhes?: DetalheInserido[];
}
export type SimboloPilar = 'hachura' | 'tracejado' | 'cruz' | 'solido' | 'vazio';
export interface SimbolosPilar { passa: SimboloPilar; nasce: SimboloPilar; morre: SimboloPilar }
/** Padrão atual: o pilar que passa ou morre é hachurado e o que nasce é tracejado. */
export const SIMBOLOS_PADRAO: SimbolosPilar = { passa: 'hachura', nasce: 'tracejado', morre: 'hachura' };
export interface EstiloCamadaParcial { nome?: string; cor?: number; pena?: number; tipo?: 'cont' | 'trac' | 'eixo' }
/** Camadas por nome do catálogo (`CAMADAS`) e fator de tamanho de texto por tipo (1 = o atual). */
export interface EstiloParcial { camadas?: Record<string, EstiloCamadaParcial>; textos?: Record<string, number> }
/** Desenho DXF lido: segmentos [x1,y1,x2,y2], arcos [x,y,r,a0,a1] e textos, nas unidades do desenho. */
export interface DetalheDxf { nome: string; insunits: number; linhas: number[]; arcos: number[]; textos: { x: number; y: number; h: number; rot: number; t: string }[] }
export interface DetalheInserido { id: string; detalhe: DetalheDxf; /** posição na folha (mm) do ponto (0,0) do desenho, escala e rotação (graus) */ x: number; y: number; escala: number; rotacao?: number; /** folhas (tipos de prancha) ou vazio = todas */ folhas?: string[] }
export interface ConfigMoldura {
  /** Modelo de moldura importado: substitui o retângulo da folha ('moldura') ou também a legenda ('moldura+legenda'). */
  modelo?: { detalhe: DetalheDxf; x: number; y: number; escala: number; modo: 'moldura' | 'moldura+legenda' };
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
  /** Detalhes das fundações: planta e corte de sapatas, blocos e tubulões e elevação das vigas de fundação (50 ou 25). */
  escalaFundacao: number;
  /** Elevação das paredes e dos pilares-parede (E1d). */
  escalaParedes: number;
  /** Cortes longitudinais das escadas (E4e); os transversais seguem `escalaSecao`. */
  escalaEscadas: number;
  /** Lajes: positivas e negativas em folhas separadas (1) ou na mesma folha, em camadas distintas (0). */
  lajesSeparadas: 0 | 1;
  /** Quadro de pilares (seção, armadura e estribos por lance) no fim das pranchas de pilares. */
  quadroPilares: 0 | 1;
  /** Gabarito: desenha a máscara DXF/DWG do pavimento nas formas e nas lajes (R7g; camada MASCARA). */
  mascara: 0 | 1;
  /** Ponto fixo dos pilares nas formas e nas lajes (R7g; camada PONTO-FIXO). */
  pontoFixo: 0 | 1;
  /** Cotas permanentes de planta do usuário nas formas e na locação (L6; camada COTA); padrão ligado. */
  cotasUsuario: 0 | 1;
  /** Cargas do grupo (inclusive as reações das escadas) desenhadas nas plantas de formas (E4e, C10.26); padrão desligado: só a prancha de cargas as traz. */
  cargasNasFormas: 0 | 1;
  /** Croqui do pavimento nas formas, só com lajes inclinadas (E5a, C7.76, C7.195): lado do quadro em mm no papel; 0 = sem croqui. */
  croqui: number;
}
export const ARMACAO_PADRAO: ConfigArmacao = { formato: 'auto', escalaVigas: 75, escalaSecao: 25, escalaPilares: 40, escalaLajes: 0, escalaLocacao: 0, escalaFundacao: 50, escalaParedes: 50, escalaEscadas: 25, lajesSeparadas: 1, quadroPilares: 1, mascara: 0, pontoFixo: 0, cotasUsuario: 1, cargasNasFormas: 0, croqui: 60 };

export const USOS: { v: CategoriaUso; label: string; q: number }[] = [
  { v: 'residencial', label: 'Residencial (dormitórios, sala, cozinha)', q: 1.5 },
  { v: 'servico', label: 'Área de serviço e lavanderia', q: 2.0 },
  { v: 'comum', label: 'Áreas comuns, corredores e escadas', q: 3.0 },
  { v: 'escritorio', label: 'Escritórios', q: 2.5 },
  { v: 'garagem', label: 'Garagem (veículos leves)', q: 3.0 },
  { v: 'cobertura', label: 'Cobertura sem acesso (manutenção)', q: 1.0 },
  { v: 'misto', label: 'Misto (sem carga variável geral; cargas por área em cada categoria)', q: 0 },
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

/** Início efetivo do pilar: fundação (vínculo externo) ou apoiado em outro elemento (sem vínculo). */
export const inicioDe = (p: Pick<Pilar, 'nasce' | 'inicio'>): 'fundacao' | 'apoiado' => (p.nasce === 'fundacao' ? 'fundacao' : p.inicio ?? 'apoiado');
/** Só o pilar que começa na fundação (ou numa fundação intermediária) aceita vínculo externo (molas, rótula). */
export const aceitaVinculoExterno = (p: Pick<Pilar, 'nasce' | 'inicio'>) => inicioDe(p) === 'fundacao';

/** Posição (ponto fixo, ângulo e deslocamento) e seção do pilar num lance: os próprios do lance sobre os do pilar. */
export function geoLance(p: Pilar, lance: string): { p: Pilar; secao: SecaoPilar } {
  const e = p.secoes?.find((s) => s.pavimento === lance);
  if (!e || (e.ajuste === undefined && e.angulo === undefined && !e.dx && !e.dy)) return { p, secao: e?.secao ?? p.secao };
  return { p: { ...p, ajuste: e.ajuste ?? p.ajuste, angulo: e.angulo ?? p.angulo, x: p.x + (e.dx ?? 0), y: p.y + (e.dy ?? 0) }, secao: e.secao };
}
/** Centro e contorno do pilar no lance, com a geometria própria do lance. */
export function centroNoLance(p: Pilar, lance: string): [number, number] { const g = geoLance(p, lance); return centroPilar(g.p, g.secao); }
export function contornoNoLance(p: Pilar, lance: string): [number, number][] { const g = geoLance(p, lance); return contornoPilar(g.p, g.secao); }
/** Ângulo (graus) do pilar no lance. */
export const anguloNoLance = (p: Pilar, lance: string) => p.secoes?.find((s) => s.pavimento === lance)?.angulo ?? p.angulo;
/**
 * Lance cuja geometria vale no pavimento: o que chega a ele ou, no pavimento em que o pilar nasce apoiado, o primeiro
 * (sua base); `undefined` se o pilar não passa por ali.
 */
export function lanceNoPavimento(b: BuildingModel, p: Pilar, pav: string): string | undefined {
  const ls = lancesDoPilar(b, p);
  if (ls.some((x) => x.id === pav)) return pav;
  return p.nasce === pav ? ls[0]?.id : undefined;
}

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

/**
 * Classes de ψ da carga de uso (NBR 6118, Tabela 11.2): A = locais sem predominância de equipamentos fixos nem
 * elevada concentração de pessoas (residencial e similares); B = escritórios, comércio e edifícios públicos;
 * C = garagens, bibliotecas, arquivos e oficinas. Enquadramento das categorias [a confirmar].
 */
export type ClasseUso = 'A' | 'B' | 'C';
export const CLASSE_DO_USO: Record<CategoriaUso, ClasseUso> = { residencial: 'A', servico: 'A', comum: 'A', cobertura: 'A', misto: 'A', escritorio: 'B', garagem: 'C' };
export const PSI_CLASSE: Record<ClasseUso, [number, number, number]> = { A: [0.5, 0.4, 0.3], B: [0.7, 0.6, 0.4], C: [0.8, 0.7, 0.6] };
/** Caso de carga de cada classe (a classe A usa o caso Q da obra). */
export const CASO_DA_CLASSE: Record<ClasseUso, { id: string; nome: string }> = { A: { id: 'Q', nome: 'Q' }, B: { id: 'QB', nome: 'Q escritórios (classe B)' }, C: { id: 'QC', nome: 'Q garagens (classe C)' } };

/**
 * Classes de uso B e C que viram casos próprios (opção `categoriasUso`): as dos grupos com pavimentos e as das cargas
 * lançadas diretamente em QB/QC (grupo `misto`: cada carga de área na sua categoria).
 */
export function classesProprias(b: BuildingModel): ClasseUso[] {
  if (!opcoesEmUso(b.opcoes, b.perfilOpcoes ?? 'sistema').categoriasUso) return [];
  const usados = new Set<ClasseUso>(b.pavimentos.map((p) => b.grupos.find((g) => g.id === p.grupo)).filter(Boolean).map((g) => CLASSE_DO_USO[g!.uso] ?? 'A'));
  for (const c of [...b.cargas, ...(b.cargasPilar ?? [])]) for (const cl of ['B', 'C'] as const) if (c.caso === CASO_DA_CLASSE[cl].id) usados.add(cl);
  return (['B', 'C'] as const).filter((c) => usados.has(c));
}

/** Caso da carga variável de uso de um grupo: Q (classe A ou opção desligada) ou o da classe (QB, QC). */
export function casoUsoDoGrupo(b: BuildingModel, grupo: string): string {
  const g = b.grupos.find((x) => x.id === grupo), cl = g ? CLASSE_DO_USO[g.uso] ?? 'A' : 'A';
  return cl !== 'A' && classesProprias(b).includes(cl) ? CASO_DA_CLASSE[cl].id : 'Q';
}

export interface CasoObra { id: string; nome: string; natureza: Natureza; grupo?: string; simultaneo?: string; psi?: [number, number, number]; descricao?: string; pai?: string; empuxo?: string }

/** Chave de um par de casos (sem ordem). */
export const parDeCasos = (a: string, z: string) => (a < z ? `${a}\u0001${z}` : `${z}\u0001${a}`);

/**
 * Casos de carga da obra: G e Q (padrão), Q das classes de uso B e C (casos próprios) + os adicionais. Os campos
 * `grupo` e `simultaneo` já são os efetivos: derivados de `grupo`, de `pai` (arranjos do mesmo pai são incompatíveis),
 * da opção `combinarAdicionais` por natureza e das exceções da tabela de compatibilidade (`b.compat`); a
 * incompatibilidade vale por componente (A incompatível com B e B com C: os três são excludentes). Casos-pai com
 * arranjos não entram (só os arranjos têm carga).
 */
export function casosDaObra(b: BuildingModel): CasoObra[] {
  const usos = classesProprias(b).map((cl) => ({ ...CASO_DA_CLASSE[cl], natureza: 'Q' as const, psi: b.norma.psiUso?.[cl as 'B' | 'C'] ?? PSI_CLASSE[cl] }));
  const adic = b.casos ?? [];
  if (!adic.length) return [{ id: 'G', nome: 'G', natureza: 'G' }, { id: 'Q', nome: 'Q', natureza: 'Q', psi: b.norma.psiQ ?? [0.5, 0.4, 0.3] }, ...usos];
  const pais = new Set(adic.filter((c) => c.pai).map((c) => c.pai!));
  const porId = new Map(adic.map((c) => [c.id, c]));
  const casos: CasoObra[] = [{ id: 'G', nome: 'G', natureza: 'G' }, { id: 'Q', nome: 'Q', natureza: 'Q', psi: b.norma.psiQ ?? [0.5, 0.4, 0.3] }, ...usos,
    ...adic.filter((c) => !pais.has(c.id)).map((c): CasoObra => {
      const pai = c.pai ? porId.get(c.pai) : undefined;
      return { ...c, ...(pai ? { natureza: pai.natureza, ...(c.psi ?? pai.psi ? { psi: c.psi ?? pai.psi } : {}) } : {}) };
    })];
  // pares incompatíveis: mesmo grupo explícito, arranjos do mesmo pai, natureza que não combina, exceções do usuário
  const inc = new Set<string>(), sim = new Map<string, string>();
  const todosPares = (ids: string[]) => { for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) inc.add(parDeCasos(ids[i], ids[j])); };
  const porGrupo = new Map<string, string[]>();
  for (const c of casos) {
    if (c.grupo) porGrupo.set(c.grupo, [...(porGrupo.get(c.grupo) ?? []), c.id]);
    if (c.pai) porGrupo.set(`arranjos:${c.pai}`, [...(porGrupo.get(`arranjos:${c.pai}`) ?? []), c.id]);
    if (c.simultaneo) sim.set(c.id, c.simultaneo);
  }
  for (const ids of porGrupo.values()) todosPares(ids);
  for (const [nat, comb] of Object.entries(b.norma.combinarAdicionais ?? {})) if (comb === false) todosPares(casos.filter((c) => adic.some((a) => a.id === c.id) && c.natureza === nat).map((c) => c.id));
  for (const o of b.compat ?? []) {
    const k = parDeCasos(o.a, o.b);
    if (o.relacao === 'incompativel') { inc.add(k); if (sim.get(o.a) === o.b) sim.delete(o.a); if (sim.get(o.b) === o.a) sim.delete(o.b); }
    else if (o.relacao === 'simultaneo') { inc.delete(k); if (sim.get(o.b) === o.a) sim.delete(o.b); sim.set(o.a, o.b); }
    else { inc.delete(k); if (sim.get(o.a) === o.b) sim.delete(o.a); if (sim.get(o.b) === o.a) sim.delete(o.b); }
  }
  // componentes da incompatibilidade = grupos excludentes
  const pai = new Map(casos.map((c) => [c.id, c.id]));
  const raiz = (x: string): string => { while (pai.get(x) !== x) { pai.set(x, pai.get(pai.get(x)!)!); x = pai.get(x)!; } return x; };
  for (const k of inc) { const [a, z] = k.split('\u0001'); if (pai.has(a) && pai.has(z)) pai.set(raiz(a), raiz(z)); }
  const membros = new Map<string, CasoObra[]>();
  for (const c of casos) membros.set(raiz(c.id), [...(membros.get(raiz(c.id)) ?? []), c]);
  for (const ms of membros.values()) {
    const pf = ms.find((c) => c.pai), rot = ms.length < 2 ? undefined : ms.some((c) => c.grupo === 'vento') ? 'vento' : ms.find((c) => c.grupo)?.grupo ?? (pf ? `arranjos de ${porId.get(pf.pai!)?.nome ?? pf.pai}` : `incomp. ${ms.map((c) => c.nome).join(' / ')}`);
    for (const c of ms) { if (rot) c.grupo = rot; else delete c.grupo; }
  }
  for (const c of casos) { const s2 = sim.get(c.id); if (s2 && casos.some((x) => x.id === s2)) c.simultaneo = s2; else delete c.simultaneo; }
  return casos;
}

/** Relação efetiva entre dois casos (a tabela de compatibilidade da interface). */
export function relacaoEfetiva(casos: CasoObra[], a: string, z: string): RelacaoCasos {
  const ca = casos.find((c) => c.id === a), cz = casos.find((c) => c.id === z);
  if (ca?.simultaneo === z || cz?.simultaneo === a) return 'simultaneo';
  return ca?.grupo && ca.grupo === cz?.grupo ? 'incompativel' : 'compativel';
}

/** Casos que uma carga pode usar: os da obra e, com a opção `categoriasUso`, QB e QC mesmo sem grupo dessa classe (cargas por área em grupo misto). */
export function casosParaCarga(b: BuildingModel): { id: string; nome: string; natureza: Natureza }[] {
  const base = casosDaObra(b).map((c) => ({ id: c.id, nome: c.nome, natureza: c.natureza }));
  if (!opcoesEmUso(b.opcoes, b.perfilOpcoes ?? 'sistema').categoriasUso) return base;
  return [...base, ...(['B', 'C'] as const).map((cl) => ({ ...CASO_DA_CLASSE[cl], natureza: 'Q' as const })).filter((c) => !base.some((x) => x.id === c.id))];
}
