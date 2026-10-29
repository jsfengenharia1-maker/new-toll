// Estado de visualização e de ferramenta da planta (não vai para o arquivo).
import type { VistaVigota } from '../../core/resultados/vigotasVista';
import { create } from 'zustand';
import { pavimentosOrdenados, type AbaCorrida, type Ajuste, type Alinhamento, type BuildingModel, type PosicaoFundacao, type TipoFundacao, type TipoLaje, type TipoVigaFundacao } from '../../core/building/types';
import { TODAS, type TipoCaptura } from '../../core/geom/snap';
import type { RefTemp } from '../../core/geom/cotasTemp';
import type { DadosComunsEscada, LanceEscada } from '../../core/building/escadas';
import { cssVar } from '../design/tokens';
import { EVENTO_TEMA, temaEfetivo } from '../design/tema';

export type Ferramenta = 'selecionar' | 'pilar' | 'viga' | 'laje' | 'carga' | 'eixo' | 'mover' | 'medir' | 'alinhar' | 'fundacao' | 'vigaFund' | 'girarFund'
  | 'limite' | 'limiteMascara' | 'insFund' | 'radier' | 'vigaElastica' | 'corrida' | 'dividir' | 'unir' | 'prolongar' | 'copiar' | 'girar' | 'espelhar' | 'puncao' | 'zonaLaje' | 'linhaDobra' | 'pilarParede' | 'parede' | 'corte' | 'secao' | 'vigaGabarito' | 'moverRef' | 'contaGotas'
  | 'contornoRet' | 'aberturaRet' | 'cargaLaje' | 'cargaViga' | 'direcaoPano' | 'insercaoPano' | 'cota' | 'plano' | 'escada' | 'flecha' | 'diagonal' | 'consolo' | 'abaco';
/** Ferramentas que só existem no nível de fundação; as que mantêm a seleção ao serem escolhidas (agem sobre ela ou sobre um elemento). */
export const FERRAMENTAS_FUNDACAO: Ferramenta[] = ['fundacao', 'vigaFund', 'girarFund', 'limite', 'limiteMascara', 'insFund', 'radier', 'vigaElastica', 'corrida'];
export const MANTEM_SELECAO: Ferramenta[] = ['girarFund', 'insFund'];
/** Grupo do pavimento aberto na planta (o mesmo pavimento que a Planta desenha quando nenhum foi escolhido: o segundo, ou o único). */
export function grupoDaPlanta(b: BuildingModel, pavimento: string | null): { id: string; nome: string } | null {
  const pavs = pavimentosOrdenados(b);
  const pav = pavs.find((p) => p.id === pavimento) ?? pavs[Math.min(1, pavs.length - 1)];
  const g = b.grupos.find((x) => x.id === pav?.grupo);
  return g ? { id: g.id, nome: g.nome } : null;
}
/** Parâmetros que levam a planta ao nível de fundação ao escolher a ferramenta (e limpam a seleção, salvo as que a usam). */
export const aoEscolher = (f: Ferramenta): Partial<{ pavimento: string; selecao: Set<string> }> =>
  !FERRAMENTAS_FUNDACAO.includes(f) ? {} : MANTEM_SELECAO.includes(f) ? { pavimento: 'fundacao' } : { pavimento: 'fundacao', selecao: new Set<string>() };
/** Faces da camada de armadura das lajes na planta. */
export const facesLaje = (v: 'nenhuma' | 'inf' | 'sup' | 'ambas'): ('inf' | 'sup')[] => (v === 'ambas' ? ['inf', 'sup'] : v === 'nenhuma' ? [] : [v]);
/** Ferramentas de lançamento da L5 (não vão para o arquivo): modo simples e deslocamento da viga, contorno, abertura, cargas, direção e prolongar. */
export interface L5Estado {
  simples: boolean;
  /** Deslocamento (cm) entre a linha clicada e a linha de ajuste da viga; à esquerda do traçado, negativo à direita. */
  deslocamento: number;
  alinharContorno: boolean;
  modoAbertura: 'viga' | 'zero' | 'nervuras' | 'qualquer';
  borda: 'nenhuma' | 'chata' | 'alta';
  bordaB: number;
  bordaH: number;
  /** Viga de referência da abertura paralela a uma viga (escolhida na planta). */
  vigaRef: string | null;
  valorLaje: number;
  casoLaje: string;
  /** Carga existente de que copiar valor e caso na carga da laje inteira ('' = não copia). */
  copiarCarga: string;
  valorViga: number;
  casoViga: string;
  direcaoModo: 'viga' | 'pontos';
  relacao: 'paralela' | 'perpendicular';
  /** Prolongar por comprimento fixo (m; 0 = prolongar até o alvo clicado). */
  comprimento: number;
  /** Ao fechar um contorno por vigas, criar o pano a definir (?) automaticamente (L7, C7.2). */
  panoAuto: boolean;
}
export const L5_PADRAO: L5Estado = { simples: false, deslocamento: 0, alinharContorno: true, modoAbertura: 'zero', borda: 'nenhuma', bordaB: 0.15, bordaH: 0.4, vigaRef: null, valorLaje: 2, casoLaje: 'Q', copiarCarga: '', valorViga: 5, casoViga: 'G', direcaoModo: 'viga', relacao: 'paralela', comprimento: 0, panoAuto: true };
export type Tema = 'escuro' | 'claro' | 'pb';
export interface Vista { k: number; ox: number; oy: number } // px por m; tela = (ox + x·k, oy − y·k)

interface PState {
  pavimento: string | null;
  ferramenta: Ferramenta;
  vista: Vista | null;
  selecao: Set<string>;
  orto: boolean;
  polar: boolean;
  capturas: Set<TipoCaptura>;
  /** Tolerância do alinhamento (rastreamento) em pixels da tela (a confirmar; padrão 8). */
  alinhaPx: number;
  inferior: boolean;
  /** Capturas que estavam ligadas antes de F3 desligá-las (F3 as restaura; vazio = abre a janela de seleção). */
  capturasAntes: Set<TipoCaptura>;
  /** Janela de seleção dos modos de captura aberta (não vai para o arquivo). */
  janelaCapturas: boolean;
  /** Ferramenta Viga pelo gabarito (L2): a linha clicada é a face oposta ao 2º clique (face) ou o eixo (eixo). */
  modoVigaGab: 'face' | 'eixo';
  tema: Tema;
  /** Mostra em vermelho/amarelo os elementos com erro/aviso da revisão do dimensionamento. */
  mostrarErros: boolean;
  /** Pilares da planta com os símbolos escolhidos para as pranchas (passa, nasce, morre; V7d; não vai para o arquivo). */
  simbolosPlanta: boolean;
  /** Camada de armadura das lajes na planta: barras representativas inferiores, superiores ou nenhuma (não vai para o arquivo). */
  armaduraLajes: 'nenhuma' | 'inf' | 'sup' | 'ambas';
  /** Cargas coloridas por caso (G, Q, W, E, H e casos adicionais) com legenda na planta (V6e, não vai para o arquivo). */
  cargasPorCaso: boolean;
  /** Caso de vento cujas forças por pavimento aparecem como setas na planta ('' = nenhum; V6e, não vai para o arquivo). */
  ventoPlanta: string;
  /** Painel de edição da armadura das lajes (R7e): aberto sob a planta, não modal (não vai para o arquivo). */
  painelLajes: boolean;
  /** Ferramentas Zona de uniformização e Linha de dobra (R7e): forma, face, direção das barras (null = qualquer) e largura da faixa da linha (m). */
  zonaForma: 'linha' | 'retangulo';
  zonaFace: 'inf' | 'sup';
  zonaAngulo: number | null;
  zonaLargura: number;
  /** O que mostrar na elevação do detalhamento das vigas (R7b; não vai para o arquivo). */
  detMostrar: { inf: boolean; sup: boolean; pele: boolean; estribos: boolean; secao: boolean };
  /** Camada "Nervuras e cubetas" (E3c): cubetas inteiras das lajes nervuradas bidirecionais do pavimento (não vai para o arquivo). */
  camadaNervuras: boolean;
  /** Camada "Ábacos" (E3d): zona efetiva dos ábacos das lajes nervuradas bidirecionais do pavimento (não vai para o arquivo). */
  camadaAbacos: boolean;
  /** Camada "Punção e cortante" (N2d): contornos críticos dos pilares do pavimento e a armadura de punção (não vai para o arquivo). */
  camadaPuncao: boolean;
  /** Plano escolhido no Navegador ou no grupo "Planos" (E3f), para "Atribuir plano" (não vai para o arquivo). */
  planoSel: string | null;
  /** Janela "Novo plano" aberta pela faixa (E3f). */
  novoPlano: boolean;
  /** Definição do plano na planta (E3f, ferramenta `plano`): tipo, desníveis dos pontos (três pontos) ou do primeiro ponto e inclinação em % (não vai para o arquivo). */
  planoDef: { tipo: 'tresPontos' | 'retaHorizontal' | 'maximaDeclividade'; desnivel: number; inclinacao: number; z: [number, number, number] };
  /** Camada "Placas alveolares" (E3e): placas numeradas das lajes alveolares do pavimento (não vai para o arquivo). */
  camadaPlacas: boolean;
  /** Ferramenta Armadura de punção: adicionar ou apagar grupos ao clicar num pilar, e o grupo lançado (linhas radiais, barras por linha, φ em mm, espaçamento em m). */
  puncaoModo: 'adicionar' | 'apagar';
  puncaoGrupo: { linhas: number; barras: number; phi: number; s: number };
  /** Lajes treliçadas na camada de armadura: todas as faixas (true) ou uma por grupo de igualação (padrão). */
  vigotasTodas: boolean;
  /** Vista dos textos das vigotas na planta (E5e, C7.91): momentos, cortantes ou armadura inferior das moldadas; com a chave de esforços ligada a armadura inferior não existe. */
  vigotasVista: 'nenhuma' | VistaVigota;
  vigotasEsforcos: boolean;
  /** Elemento aberto na janela de resultados (não vai para o arquivo). */
  janela: { tipo: 'viga' | 'pilar' | 'laje' | 'fundacao' | 'pilarParede' | 'parede'; id: string; pavimento?: string } | null;
  /** Pedido de centralizar a planta num elemento (n muda a cada pedido). */
  foco: { id: string; n: number } | null;
  /** Pedido de abrir o grupo Tabelas de armadura numa tabela (atalho da lista de erros; não vai para o arquivo). */
  tabelaFoco: { tipo: 'vigas' | 'estribos' | 'pilares' | 'lajes'; id: string; n: number } | null;
  /** Ferramenta Fundação (planta do nível de fundação): tipo, posição em relação ao pilar e tipo de estaca do bloco. */
  tipoFund: TipoFundacao;
  /** 'auto': a posição sai do ponto do clique no pilar (centro = centrada, face = divisa, canto = canto). */
  posFund: PosicaoFundacao | 'auto';
  estacaFund: string | null;
  /** Ferramenta Fundação (FU3): os cliques acumulam pilares (Enter cria uma sapata associada ou um bloco com vários pilares). */
  multiFund: boolean;
  /** Pilares escolhidos na ferramenta Fundação em modo de vários pilares. */
  pilaresFund: string[];
  /** Ferramentas Limite e Limite da máscara (FU3): polilinha fechada (poço, reservatório) ou aberta (divisa). */
  limiteFechado: boolean;
  /** Ferramenta Viga de fundação (FU2): tipo e seção (m) das vigas lançadas por clique entre dois elementos. */
  tipoVigaFund: TipoVigaFundacao;
  secaoVigaFund: { b: number; h: number };
  /** Ferramentas Radier e Viga sobre base elástica (FU6): espessura do radier e seção da viga (m) lançados. */
  hRadier: number;
  secaoVigaElastica: { b: number; h: number };
  /** Ferramenta Sapata corrida (FU7a): largura do apoio, aba, largura B (0 = calculada pela σadm), alvenaria e equilíbrio por cintas. */
  corridaLanc: { bw: number; aba: AbaCorrida; B: number; alvenaria: boolean; equilibrio: boolean };
  /** Mapa por nó da base elástica na planta de fundação (FU6): tensão no solo, recalque ou nenhum. */
  mapaBase: 'nenhum' | 'tensao' | 'recalque';
  /** Ferramenta Pilar: lança arranque (pilar de altura zero que só leva cargas à fundação). */
  arranque: boolean;
  secao: { tipo: 'ret'; b: number; h: number } | { tipo: 'circ'; d: number };
  ajuste: Ajuste;
  angulo: number;
  /** Ferramenta Pilar-parede (E1b): tipo, ângulo (graus) e os demais parâmetros do lançamento (nasce, morre, base). */
  ppTipo: string | null;
  ppAngulo: number;
  ppParams: Record<string, unknown> | null;
  /** Ferramenta Parede de concreto (E1c): parâmetros do lançamento (espessura, nasce, morre, base), sem tipo próprio. */
  pwParams: Record<string, unknown> | null;
  /** Cortes do edifício e linhas de seção (V2): lado visto e profundidade (m; 0 = até o fim) do próximo corte, marcas na planta e janela aberta. */
  corteLanc: { sentido: 'esq' | 'dir'; profundidade: number };
  mostrarCortes: boolean;
  janelaCorte: { tipo: 'corte' | 'secao'; id: string } | null;
  alinharEscala: boolean;
  secaoViga: { b: number; h: number };
  alinhamento: Alinhamento;
  invertida: boolean;
  /** Viga curva (E2b): o próximo trecho é um arco (clique na passagem e depois no fim); tecla R alterna. */
  curvaViga: boolean;
  /** Passagem do arco em andamento e passagens dos trechos já lançados da viga (null = trecho reto). */
  passagemViga: [number, number] | null;
  passagensViga: ([number, number] | null)[];
  tipoLaje: TipoLaje;
  tipoCarga: 'ponto' | 'linha' | 'area';
  /** G, Q ou id de caso adicional. */
  caso: string;
  valorCarga: number;
  /** Copiar a seleção: número de cópias em série. */
  copias: number;
  /** Conta-gotas de pilar (L4): pilar de que copiar os dados e se leva as cargas (não vai para o arquivo). */
  contaGotas: { pilar: string | null; cargas: boolean };
  /** Ferramentas de lançamento (L5). */
  l5: L5Estado;
  /** Contador que abre o grupo Ferramentas de lançamento ao escolher o tipo da seção da viga (L7, C6.3). */
  abrirLancamento: number;
  /** Pano de origem da cópia de dados (L4, C7.8), escolhido pelo menu de contexto do Navegador; `abrirDadosL4` abre o grupo Referências e dados. */
  origemDadosPano: string;
  abrirDadosL4: number;
  /** Cotas temporárias ao selecionar (L6) e as trocas de referência da sessão (face/eixo por par de elementos; não vão para o arquivo). */
  cotasTemp: boolean;
  refTemp: RefTemp;
  /** Girar a seleção: ângulo (graus, anti-horário) em torno do ponto clicado. */
  anguloGiro: number;
  /** Espelhar a seleção: mantém os originais (cópia espelhada de pilares e vigas). */
  espelharCopia: boolean;
  /** Cores da planta alteradas pelo usuário, por tema (só neste navegador). */
  cores: Partial<Record<Tema, Partial<Paleta>>>;
  /** Ferramenta Escada (E4b): função (criar, editar, apagar, mover, girar); dados e lances da última escada lançada (C8.38, zerados ao trocar de obra);
   *  inserção repetida (C8.35) e escada de que a nova copia dados e lances (C8.39). Não vão para o arquivo. */
  /** Ferramenta Diagonal (E5b, C6.42): pavimento da ponta final ('' = o pavimento acima) e seção (m). Ferramenta Ábaco (K1.9.97): forma (retângulo por dois cantos ou polígono) e altura (cm; 0 = a do pano). */
  diagonalDef: { pavFim: string; b: number; h: number };
  abacoDef: { forma: 'ret' | 'poli'; h: number };
  escadaFn: 'criar' | 'editar' | 'apagar' | 'mover' | 'girar';
  escadaPadrao: { dados: DadosComunsEscada; lances: Omit<LanceEscada, 'id'>[]; nome?: string; angulo?: number } | null;
  escadaRepetir: boolean;
  escadaCopiar: string | null;
  /** Ângulo digitado da função Girar (graus) e erros geométricos do último lançamento recusado (C8.36). */
  escadaAngulo: number;
  escadaErros: { codigo: string; mensagem: string }[];
  /** Contador que descarta o ponto pendente da Planta depois de um giro digitado no menu da Escada. */
  escadaZera: number;
  /** Última ação repetível (Enter com a ferramenta Selecionar e nada pendente): ferramenta ou item da paleta. */
  ultimaAcao: { tipo: 'ferramenta'; f: Ferramenta } | { tipo: 'paleta'; rotulo: string; executar: () => void } | null;
  set(p: Partial<Omit<PState, 'set'>>): void;
}

function coresSalvas(): PState['cores'] {
  try { const t = localStorage.getItem('statikos:cores-planta'); const o = t ? JSON.parse(t) : {}; return o && typeof o === 'object' ? o : {}; } catch { return {}; }
}

/** Tema escolhido para a planta, ou null quando o usuário nunca escolheu (então segue o tema do app). */
function temaEscolhido(): Tema | null {
  try { const t = localStorage.getItem('statikos:tema-planta'); return t === 'claro' || t === 'pb' || t === 'escuro' ? t : null; } catch { return null; }
}
function temaSalvo(): Tema { return temaEscolhido() ?? temaEfetivo(); }

export const usePlanta = create<PState>((set) => ({
  pavimento: null,
  ferramenta: 'selecionar',
  vista: null,
  selecao: new Set(),
  orto: false,
  polar: true,
  capturas: new Set(TODAS),
  alinhaPx: 8,
  capturasAntes: new Set(),
  janelaCapturas: false,
  modoVigaGab: 'face',
  inferior: true,
  tema: temaSalvo(),
  mostrarErros: true,
  simbolosPlanta: false,
  armaduraLajes: 'nenhuma',
  cargasPorCaso: true,
  ventoPlanta: '',
  painelLajes: false,
  zonaForma: 'linha',
  zonaFace: 'sup',
  zonaAngulo: null,
  zonaLargura: 0.5,
  detMostrar: { inf: true, sup: true, pele: true, estribos: true, secao: true },
  vigotasTodas: false,
  vigotasVista: 'nenhuma',
  vigotasEsforcos: false,
  camadaNervuras: false,
  camadaAbacos: false,
  camadaPuncao: false,
  planoSel: null,
  novoPlano: false,
  planoDef: { tipo: 'maximaDeclividade', desnivel: 0, inclinacao: 10, z: [0, 0, 0] },
  camadaPlacas: false,
  puncaoModo: 'adicionar',
  puncaoGrupo: { linhas: 8, barras: 3, phi: 6.3, s: 0.12 },
  janela: null,
  foco: null,
  tabelaFoco: null,
  tipoFund: 'sapata',
  posFund: 'auto',
  estacaFund: null,
  multiFund: false,
  pilaresFund: [],
  limiteFechado: false,
  hRadier: 0.3,
  secaoVigaElastica: { b: 0.5, h: 0.8 },
  mapaBase: 'nenhum',
  corridaLanc: { bw: 0.2, aba: 'ambas', B: 0, alvenaria: false, equilibrio: false },
  arranque: false,
  tipoVigaFund: 'equilibrio',
  secaoVigaFund: { b: 0.2, h: 0.4 },
  secao: { tipo: 'ret', b: 0.2, h: 0.4 },
  ajuste: 'c',
  angulo: 0,
  ppTipo: null,
  ppAngulo: 0,
  ppParams: null,
  pwParams: null,
  diagonalDef: { pavFim: '', b: 0.2, h: 0.3 },
  abacoDef: { forma: 'ret', h: 0 },
  escadaFn: 'criar',
  escadaPadrao: null,
  escadaRepetir: true,
  escadaCopiar: null,
  escadaAngulo: 90,
  escadaErros: [],
  escadaZera: 0,
  corteLanc: { sentido: 'esq', profundidade: 0 },
  mostrarCortes: true,
  janelaCorte: null,
  alinharEscala: false,
  secaoViga: { b: 0.15, h: 0.4 },
  alinhamento: 'centro',
  invertida: false,
  curvaViga: false,
  passagemViga: null,
  passagensViga: [],
  tipoLaje: { tipo: 'macica', h: 0.1 },
  tipoCarga: 'area',
  caso: 'Q',
  valorCarga: 2,
  copias: 1,
  contaGotas: { pilar: null, cargas: false },
  cotasTemp: true,
  refTemp: {},
  l5: { ...L5_PADRAO },
  abrirLancamento: 0,
  origemDadosPano: '',
  abrirDadosL4: 0,
  anguloGiro: 90,
  espelharCopia: false,
  cores: coresSalvas(),
  ultimaAcao: null,
  set(p) {
    if (p.tema) try { localStorage.setItem('statikos:tema-planta', p.tema); } catch { /* sem armazenamento */ }
    if (p.cores) try { localStorage.setItem('statikos:cores-planta', JSON.stringify(p.cores)); } catch { /* sem armazenamento */ }
    // a última ferramenta usada (além de Selecionar) fica para o Enter repetir
    if (p.ferramenta && p.ferramenta !== 'selecionar' && p.ultimaAcao === undefined) p = { ...p, ultimaAcao: { tipo: 'ferramenta', f: p.ferramenta } };
    set(p);
  },
}));

/** Cores da planta por tema; os valores ficam em design/global.css (--pl-<tema>-<chave>). */
export type Paleta = {
  fundo: string; mascara: string; eixo: string; viga: string; laje: string; carga: string; parede: string; pilar: string; pilarBorda: string; texto: string; cota: string;
  selecao: string; captura: string; guia: string; erro: string; aviso: string; janela: string; cruzamento: string; fantasma: string; limite: string;
  /** Linhas dos planos inclinados (E5b, C6.58) e cursor sobre o eixo ou a face de viga (C7.66). */
  magenta: string; capturaViga: string;
};
export const CHAVES = ['fundo', 'mascara', 'eixo', 'viga', 'laje', 'carga', 'parede', 'pilar', 'pilarBorda', 'texto', 'cota', 'selecao', 'captura', 'guia', 'erro', 'aviso', 'janela', 'cruzamento', 'fantasma', 'limite', 'magenta', 'capturaViga'] as const;
const cache = new Map<Tema, Paleta>();
/** Paleta do tema no design system (global.css), sem as alterações do usuário. */
export function paletaBase(t: Tema): Paleta {
  let p = cache.get(t);
  if (!p) {
    p = Object.fromEntries(CHAVES.map((k) => [k, cssVar(`pl-${t}-${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`)])) as Paleta;
    if (p.fundo) cache.set(t, p);
  }
  return p;
}
/** Paleta em uso: a do tema com as cores que o usuário alterou (tabela de cores editável). */
export function paleta(t: Tema, alteradas: Partial<Paleta> = usePlanta.getState().cores[t] ?? {}): Paleta {
  const base = paletaBase(t);
  return Object.keys(alteradas).length ? { ...base, ...alteradas } : base;
}

/** Cor CSS (#rgb, #rrggbb, #rrggbbaa ou rgb[a](…)) → #rrggbb (para o seletor de cor) e o sufixo de opacidade (aa ou ''). */
export function hexDaCor(c: string): { hex: string; alfa: string } {
  const h2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  if (c.startsWith('#')) {
    const t = c.slice(1);
    if (t.length === 3 || t.length === 4) return { hex: '#' + [...t.slice(0, 3)].map((x) => x + x).join('').toLowerCase(), alfa: t.length === 4 ? t[3] + t[3] : '' };
    return { hex: '#' + t.slice(0, 6).toLowerCase(), alfa: t.length === 8 ? t.slice(6).toLowerCase() : '' };
  }
  const n = (c.match(/[\d.]+/g) ?? []).map(Number);
  if (n.length < 3) return { hex: '#' + '0'.repeat(6), alfa: '' };
  return { hex: '#' + n.slice(0, 3).map(h2).join(''), alfa: n.length > 3 && n[3] < 1 ? h2(n[3] * 255) : '' };
}

// Sem escolha explícita, a planta segue o tema da interface (Sistema/Escuro/Claro).
if (typeof window !== 'undefined') window.addEventListener(EVENTO_TEMA, () => { if (!temaEscolhido()) usePlanta.setState({ tema: temaEfetivo() }); });
