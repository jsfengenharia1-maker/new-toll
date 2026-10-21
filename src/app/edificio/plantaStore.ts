// Estado de visualização e de ferramenta da planta (não vai para o arquivo).
import { create } from 'zustand';
import type { Ajuste, Alinhamento, PosicaoFundacao, TipoFundacao, TipoLaje, TipoVigaFundacao } from '../../core/building/types';
import { TODAS, type TipoCaptura } from '../../core/geom/snap';
import { cssVar } from '../design/tokens';

export type Ferramenta = 'selecionar' | 'pilar' | 'viga' | 'laje' | 'carga' | 'eixo' | 'mover' | 'medir' | 'alinhar' | 'fundacao' | 'vigaFund' | 'girarFund'
  | 'limite' | 'limiteMascara' | 'insFund' | 'radier' | 'vigaElastica' | 'dividir' | 'unir' | 'prolongar' | 'copiar' | 'girar' | 'espelhar' | 'puncao' | 'zonaLaje' | 'linhaDobra';
/** Ferramentas que só existem no nível de fundação; as que mantêm a seleção ao serem escolhidas (agem sobre ela ou sobre um elemento). */
export const FERRAMENTAS_FUNDACAO: Ferramenta[] = ['fundacao', 'vigaFund', 'girarFund', 'limite', 'limiteMascara', 'insFund', 'radier', 'vigaElastica'];
export const MANTEM_SELECAO: Ferramenta[] = ['girarFund', 'insFund'];
/** Parâmetros que levam a planta ao nível de fundação ao escolher a ferramenta (e limpam a seleção, salvo as que a usam). */
export const aoEscolher = (f: Ferramenta): Partial<{ pavimento: string; selecao: Set<string> }> =>
  !FERRAMENTAS_FUNDACAO.includes(f) ? {} : MANTEM_SELECAO.includes(f) ? { pavimento: 'fundacao' } : { pavimento: 'fundacao', selecao: new Set<string>() };
/** Faces da camada de armadura das lajes na planta. */
export const facesLaje = (v: 'nenhuma' | 'inf' | 'sup' | 'ambas'): ('inf' | 'sup')[] => (v === 'ambas' ? ['inf', 'sup'] : v === 'nenhuma' ? [] : [v]);
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
  inferior: boolean;
  tema: Tema;
  /** Mostra em vermelho/amarelo os elementos com erro/aviso da revisão do dimensionamento. */
  mostrarErros: boolean;
  /** Camada de armadura das lajes na planta: barras representativas inferiores, superiores ou nenhuma (não vai para o arquivo). */
  armaduraLajes: 'nenhuma' | 'inf' | 'sup' | 'ambas';
  /** Painel de edição da armadura das lajes (R7e): aberto sob a planta, não modal (não vai para o arquivo). */
  painelLajes: boolean;
  /** Ferramentas Zona de uniformização e Linha de dobra (R7e): forma, face, direção das barras (null = qualquer) e largura da faixa da linha (m). */
  zonaForma: 'linha' | 'retangulo';
  zonaFace: 'inf' | 'sup';
  zonaAngulo: number | null;
  zonaLargura: number;
  /** O que mostrar na elevação do detalhamento das vigas (R7b; não vai para o arquivo). */
  detMostrar: { inf: boolean; sup: boolean; pele: boolean; estribos: boolean; secao: boolean };
  /** Camada "Punção e cortante" (N2d): contornos críticos dos pilares do pavimento e a armadura de punção (não vai para o arquivo). */
  camadaPuncao: boolean;
  /** Ferramenta Armadura de punção: adicionar ou apagar grupos ao clicar num pilar, e o grupo lançado (linhas radiais, barras por linha, φ em mm, espaçamento em m). */
  puncaoModo: 'adicionar' | 'apagar';
  puncaoGrupo: { linhas: number; barras: number; phi: number; s: number };
  /** Lajes treliçadas na camada de armadura: todas as faixas (true) ou uma por grupo de igualação (padrão). */
  vigotasTodas: boolean;
  /** Elemento aberto na janela de resultados (não vai para o arquivo). */
  janela: { tipo: 'viga' | 'pilar' | 'laje' | 'fundacao'; id: string; pavimento?: string } | null;
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
  /** Mapa por nó da base elástica na planta de fundação (FU6): tensão no solo, recalque ou nenhum. */
  mapaBase: 'nenhum' | 'tensao' | 'recalque';
  /** Ferramenta Pilar: lança arranque (pilar de altura zero que só leva cargas à fundação). */
  arranque: boolean;
  secao: { tipo: 'ret'; b: number; h: number } | { tipo: 'circ'; d: number };
  ajuste: Ajuste;
  angulo: number;
  alinharEscala: boolean;
  secaoViga: { b: number; h: number };
  alinhamento: Alinhamento;
  invertida: boolean;
  tipoLaje: TipoLaje;
  tipoCarga: 'ponto' | 'linha' | 'area';
  /** G, Q ou id de caso adicional. */
  caso: string;
  valorCarga: number;
  /** Copiar a seleção: número de cópias em série. */
  copias: number;
  /** Girar a seleção: ângulo (graus, anti-horário) em torno do ponto clicado. */
  anguloGiro: number;
  /** Espelhar a seleção: mantém os originais (cópia espelhada de pilares e vigas). */
  espelharCopia: boolean;
  /** Cores da planta alteradas pelo usuário, por tema (só neste navegador). */
  cores: Partial<Record<Tema, Partial<Paleta>>>;
  /** Última ação repetível (Enter com a ferramenta Selecionar e nada pendente): ferramenta ou item da paleta. */
  ultimaAcao: { tipo: 'ferramenta'; f: Ferramenta } | { tipo: 'paleta'; rotulo: string; executar: () => void } | null;
  set(p: Partial<Omit<PState, 'set'>>): void;
}

function coresSalvas(): PState['cores'] {
  try { const t = localStorage.getItem('statikos:cores-planta'); const o = t ? JSON.parse(t) : {}; return o && typeof o === 'object' ? o : {}; } catch { return {}; }
}

function temaSalvo(): Tema {
  try { const t = localStorage.getItem('statikos:tema-planta'); return t === 'claro' || t === 'pb' ? t : 'escuro'; } catch { return 'escuro'; }
}

export const usePlanta = create<PState>((set) => ({
  pavimento: null,
  ferramenta: 'selecionar',
  vista: null,
  selecao: new Set(),
  orto: false,
  polar: true,
  capturas: new Set(TODAS),
  inferior: true,
  tema: temaSalvo(),
  mostrarErros: true,
  armaduraLajes: 'nenhuma',
  painelLajes: false,
  zonaForma: 'linha',
  zonaFace: 'sup',
  zonaAngulo: null,
  zonaLargura: 0.5,
  detMostrar: { inf: true, sup: true, pele: true, estribos: true, secao: true },
  vigotasTodas: false,
  camadaPuncao: false,
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
  arranque: false,
  tipoVigaFund: 'equilibrio',
  secaoVigaFund: { b: 0.2, h: 0.4 },
  secao: { tipo: 'ret', b: 0.2, h: 0.4 },
  ajuste: 'c',
  angulo: 0,
  alinharEscala: false,
  secaoViga: { b: 0.15, h: 0.4 },
  alinhamento: 'centro',
  invertida: false,
  tipoLaje: { tipo: 'macica', h: 0.1 },
  tipoCarga: 'area',
  caso: 'Q',
  valorCarga: 2,
  copias: 1,
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
};
export const CHAVES = ['fundo', 'mascara', 'eixo', 'viga', 'laje', 'carga', 'parede', 'pilar', 'pilarBorda', 'texto', 'cota', 'selecao', 'captura', 'guia', 'erro', 'aviso', 'janela', 'cruzamento', 'fantasma', 'limite'] as const;
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
