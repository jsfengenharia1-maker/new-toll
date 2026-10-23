// Planta do pavimento em Canvas 2D, em três camadas: máscara (com cache durante pan/zoom), modelo e interação.
// Toda alteração vira comando do registro; a planta só calcula pontos (capturas, ortogonal/polar, digitação).
import { faixasVisiveis, larguraGrupo } from './vigotasFaixas';
import { ehNervurada, rotuloLaje } from '../../core/building/tiposLaje';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useBuilding } from './store';
import { useRevisao } from './revisao';
import { aoEscolher, facesLaje, hexDaCor, paleta, usePlanta, type Ferramenta, type Vista } from './plantaStore';
import { poligonoZona, siglaReforco } from '../../core/building/lajesEdicao';
import { faixaVigaElastica } from '../../core/sheets/fundacaoRadier';
import { corridaEfetiva } from '../../core/building/baseElastica';
import { geometriasCintas } from '../../core/building/cintasCorrida';
import { contornoApoio, contornoCorrida, ladosDaBase } from '../../core/building/sapataCorrida';
import { opcoesEmUso, perfilDe } from '../../core/building/opcoes';
import { cadeiaDeSegmentos } from '../../core/geom/cadeia';
import { planoGrupo } from './fundacaoGrupo';
import { isFooting } from '../../core/footings';
import { IndiceCaptura, ordenar, pontoDigitado, restringir, type Captura } from '../../core/geom/snap';
import { geometriaMascara, geometriaPorCamada } from '../../core/building/pilares';
import { vigasDoClique } from '../../core/building/lancamentoDxf';
import { pontaProlongada, retanguloDaAbertura, retanguloPorLado } from '../../core/building/lancamentoL5';
import { direcaoMenorVao, panosDoGrupo } from '../../core/building/lajes';
import { dentroPoligono, pontoInterno, type P } from '../../core/geom/faces';
import { montarPoligonal } from '../../core/building/curvas';
import { centroPilar, contornoPilar, dimsSecao, ehArranque, geometriaViga, lancesDoPilar, mascaraNoGrupo, mascaraParaMundo, pavimentosOrdenados, trechosViga, type BuildingModel, type Pilar, contornoNoLance, centroNoLance, geoLance } from '../../core/building/types';
import { POSICAO_LABEL, TIPO_FUNDACAO_LABEL, secaoBase } from '../../core/building/fundacao';
import { cruzamentosVF, geometriaVF, pontasEquilibradas } from '../../core/building/vigasFundacao';
import { abrirJanelaFundacao } from './Fundacao';
import { contornoDoLado, ladosDoPP, lancesDoPP } from '../../core/building/pilarParede';
import { niveisDaParede, paredeDoPP, ppDaParede } from '../../core/building/paredesBase';
import { aberturasNaPlanta } from './paredesLista';
import type { PilarParede } from '../../core/building/types';
import { useStore } from '../store';
import { executarERecalcular, idsBloqueados } from './Armadura';
import { Input, useAjuda } from '../ui';
import { ajudaDaFerramenta } from '../../core/ajuda';
import { ancoraMaisProxima, ancorasRef, deslocamentoPorCliques, refDe, textosVisiveis } from '../../core/building/vistaObra';

type P2 = [number, number];
const RAIO_PX = 12;
/** Ferramentas de polilinha: Enter, duplo clique e botão direito terminam. */
const POLILINHAS = ['viga', 'laje', 'carga', 'limite', 'radier', 'vigaElastica', 'corrida', 'parede', 'corte'];
const dprAtual = () => Math.min(2, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
const msg = (m: string) => useStore.getState().set({ message: m });
/** Relógio para as medições de desempenho (só chamado em efeitos e eventos). */
const agora = () => performance.now();

type Estado = 'chega' | 'morre' | 'nasce' | 'inferior';
interface PilarPlanta { p: Pilar; estado: Estado; contorno: P2[] }

/** Pilares desenhados na planta do pavimento: os que chegam nele, os que nascem nele e (fantasma) os do pavimento de baixo. */
function pilaresDaPlanta(b: BuildingModel, pav: string | null, inferior: boolean): PilarPlanta[] {
  if (!pav) return [];
  const ps = pavimentosOrdenados(b);
  const i = ps.findIndex((x) => x.id === pav);
  const abaixo = i > 0 ? ps[i - 1].id : null;
  const out: PilarPlanta[] = [];
  for (const p of b.pilares) {
    const l = lancesDoPilar(b, p).map((x) => x.id);
    if (l.includes(pav)) out.push({ p, estado: p.morre === pav ? 'morre' : 'chega', contorno: contornoNoLance(p, pav) });
    else if (p.nasce === pav) out.push({ p, estado: 'nasce', contorno: contornoNoLance(p, l[0] ?? pav) });
    else if (inferior && abaixo && l.includes(abaixo)) out.push({ p, estado: 'inferior', contorno: contornoNoLance(p, abaixo) });
  }
  return out;
}

/** Pilar-parede na planta: o estado no pavimento e o contorno de cada lado (E1b). */
interface ParedePlanta { pp: PilarParede; estado: Estado; lados: { casca: boolean; contorno: P2[] }[]; aberturas: [number, number][][] }
/** Pilares-parede da planta do pavimento (que chegam, que nascem e, fantasma, os do pavimento de baixo) ou do nível de fundação (os que nascem nela). */
function paredesDaPlanta(b: BuildingModel, pav: string | null, fundacao: boolean, inferior: boolean): ParedePlanta[] {
  const out: ParedePlanta[] = [];
  const ps = pavimentosOrdenados(b), i = ps.findIndex((x) => x.id === pav), abaixo = i > 0 ? ps[i - 1].id : null;
  for (const pp of [...(b.pilaresParede ?? []), ...(b.paredes ?? []).map(ppDaParede)]) {
    const l = lancesDoPP(b, pp).map((x) => x.id);
    if (!l.length) continue;
    const w = paredeDoPP(b, pp), nv = w ? niveisDaParede(b, w) : null;
    const mk = (estado: Estado, lance: string): ParedePlanta => ({ pp, estado, lados: ladosDoPP(b, pp).map((g) => ({ casca: g.casca, contorno: contornoDoLado(g, lance) as P2[] })), aberturas: w && nv ? aberturasNaPlanta(b, w, nv.bases[nv.topos.indexOf(lance)] ?? '') : [] });
    if (fundacao) { if (pp.nasce === 'fundacao') out.push(mk('nasce', l[0])); continue; }
    if (!pav) continue;
    if (l.includes(pav)) out.push(mk(pp.morre === pav ? 'morre' : 'chega', pav));
    else if (pp.nasce === pav) out.push(mk('nasce', l[0]));
    else if (inferior && abaixo && l.includes(abaixo)) out.push(mk('inferior', abaixo));
  }
  return out;
}

/** Pilares do nível de fundação: os que nascem nela (os arranques, de altura zero, aparecem hachurados). */
function pilaresDaFundacao(b: BuildingModel): PilarPlanta[] {
  return b.pilares.filter((p) => p.nasce === 'fundacao').map((p) => ({ p, estado: (ehArranque(p) ? 'nasce' : 'chega') as Estado, contorno: contornoPilar(p, secaoBase(b, p)) }));
}

const circulo = (c: P2, r: number, n = 20): P2[] => Array.from({ length: n }, (_, k) => [c[0] + r * Math.cos((2 * Math.PI * k) / n), c[1] + r * Math.sin((2 * Math.PI * k) / n)] as P2);
const girar = (v: P2, graus: number): P2 => { const a = (graus * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c]; };

/**
 * Lado da divisa (divisa) ou quadrante (canto) pelo ponto do clique no pilar, nos eixos do pilar (= os do elemento):
 * a face mais próxima do ponto ou o canto do quadrante em que ele cai.
 */
export function ladoPeloClique(b: BuildingModel, p: Pilar, w: P2, posicao: 'divisa' | 'canto'): [number, number] {
  const [cx, cy] = centroPilar(p, secaoBase(b, p)), [pw, ph] = dimsSecao(secaoBase(b, p));
  const [u, v] = girar([w[0] - cx, w[1] - cy], -p.angulo);
  const lx = u / (pw / 2 || 1), ly = v / (ph / 2 || 1);
  if (posicao === 'canto') return [lx < 0 ? -1 : 1, ly < 0 ? -1 : 1];
  return Math.abs(lx) >= Math.abs(ly) ? [lx < 0 ? -1 : 1, 0] : [0, ly < 0 ? -1 : 1];
}

/** Posição pelo ponto do clique no pilar: perto do centro = centrada; perto de uma face = divisa; perto de um canto = canto. */
export function posicaoPeloClique(b: BuildingModel, p: Pilar, w: P2): 'centrada' | 'divisa' | 'canto' {
  const [cx, cy] = centroPilar(p, secaoBase(b, p)), [pw, ph] = dimsSecao(secaoBase(b, p));
  const [u, v] = girar([w[0] - cx, w[1] - cy], -p.angulo);
  const perto = [Math.abs(u) / (pw / 2 || 1), Math.abs(v) / (ph / 2 || 1)].filter((t) => t > 0.5).length;
  return perto >= 2 ? 'canto' : perto === 1 ? 'divisa' : 'centrada';
}

function dentro(pt: P2, poly: P2[]) {
  let r = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) r = !r;
  }
  return r;
}
/** Distância do ponto à polilinha (aberta ou fechada). */
const distPolilinha = (p: P2, pts: P2[], fechado?: boolean) => {
  let d = Infinity;
  for (let i = 0; i + 1 < pts.length + (fechado ? 1 : 0); i++) d = Math.min(d, distSeg(p, pts[i], pts[(i + 1) % pts.length]));
  return d;
};
const distSeg = (p: P2, a: P2, z: P2) => {
  const dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy;
  const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
  return Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1]);
};

/** Nome de cada ferramenta (barra da planta, paleta e repetição pelo Enter) e a tecla de atalho. */
export const ROTULO_FERRAMENTA: Record<Ferramenta, string> = {
  selecionar: 'Selecionar', pilar: 'Pilar', viga: 'Viga', laje: 'Laje', carga: 'Carga', eixo: 'Eixo', fundacao: 'Fundação', vigaFund: 'Viga de fundação', girarFund: 'Girar 2 pontos', insFund: 'Ponto de inserção', radier: 'Radier', vigaElastica: 'Viga sobre base elástica', vigaGabarito: 'Viga pelo gabarito', moverRef: 'Mover referência', contaGotas: 'Conta-gotas', contornoRet: 'Contorno retangular de vigas', aberturaRet: 'Abertura retangular', cargaLaje: 'Carga na laje inteira', cargaViga: 'Carga ao longo da viga', direcaoPano: 'Direção do pano', insercaoPano: 'Inserção do pano (vértice)', corrida: 'Sapata corrida', limite: 'Limite da fundação', limiteMascara: 'Limite pela máscara', mover: 'Mover', medir: 'Medir', alinhar: 'Alinhar máscara',
  dividir: 'Dividir viga', unir: 'Unir vigas', prolongar: 'Prolongar viga', copiar: 'Copiar', girar: 'Girar', espelhar: 'Espelhar', puncao: 'Armadura de punção', zonaLaje: 'Zona de uniformização', corte: 'Corte do edifício', secao: 'Linha de seção', linhaDobra: 'Linha de dobra', pilarParede: 'Pilar-parede', parede: 'Parede de concreto',
};
export const TECLA_FERRAMENTA: Partial<Record<Ferramenta, string>> = { selecionar: 'S', pilar: 'P', viga: 'V', laje: 'L', carga: 'C', eixo: 'E', fundacao: 'U', vigaFund: 'B', girarFund: 'K', insFund: 'N', radier: 'W', vigaElastica: 'X', corrida: 'A', limite: 'T', limiteMascara: 'Q', mover: 'M', medir: 'D', dividir: 'I', unir: 'J', prolongar: 'O', copiar: 'Y', girar: 'G', espelhar: 'H', puncao: 'Z' };

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function proximoEixo(b: BuildingModel, horizontal: boolean) {
  if (horizontal) { const usadas = new Set(b.eixos.map((e) => e.nome)); for (let i = 0; i < 26 * 27; i++) { const n = i < 26 ? LETRAS[i] : LETRAS[Math.floor(i / 26) - 1] + LETRAS[i % 26]; if (!usadas.has(n)) return n; } }
  return String(Math.max(0, ...b.eixos.map((e) => (/^\d+$/.test(e.nome) ? +e.nome : 0))) + 1);
}

const PASSOS: Record<Ferramenta, string[]> = {
  selecionar: ['Clique num elemento ou arraste: da esquerda para a direita seleciona o que está todo dentro; da direita para a esquerda, o que cruza. Del remove.'],
  pilar: ['Clique para inserir o pilar (A muda o ponto fixo, R gira 90°). Digite x;y e Enter para coordenadas.'],
  viga: ['Primeiro ponto da viga (A alterna eixo/face esquerda/face direita; R alterna trecho reto/curvo).', 'Próximo ponto; Enter, duplo clique ou botão direito termina; Esc cancela. Trecho curvo (R): clique na passagem e depois no fim do arco.'],
  laje: ['Clique dentro de uma região fechada por vigas (ou desenhe o contorno de um balanço: pontos e Enter).', 'Próximo ponto do contorno; Enter fecha.'],
  carga: ['Carga: clique o ponto (ou os pontos da linha/área; Enter termina).', 'Próximo ponto; Enter termina.'],
  eixo: ['Primeiro ponto do eixo.', 'Segundo ponto (digite a distância, @dx;dy ou @d<ângulo e Enter).'],
  mover: ['Ponto base do deslocamento da seleção.', 'Ponto de destino.'],
  medir: ['Primeiro ponto.', 'Segundo ponto.'],
  vigaGabarito: ['Clique numa linha, arco ou polilinha do gabarito (modo eixo: a viga sai pelo eixo; modo face: a linha é a face da viga).', 'Clique do lado em que o corpo da viga deve ficar (a linha é a face oposta ao clique).'],
  moverRef: ['Clique no texto de referência (nome) de um pilar, viga ou laje.', 'Clique no novo local do texto (Esc cancela; “Restaurar posições” no grupo Referências volta ao automático).'],
  contornoRet: ['Primeiro canto do contorno externo (dois cliques: cantos opostos, ângulo zero; três: um lado e um ponto do lado oposto).', 'Segundo ponto: com Enter, o contorno de ângulo zero; com outro clique, o terceiro ponto define o lado oposto. Esc cancela.', 'Ponto do lado oposto (qualquer ângulo).'],
  aberturaRet: ['Clique na laje onde abrir (modo paralela a uma viga: antes, clique na viga de referência).', 'Primeiro ponto da abertura (canto, ou um lado no modo de qualquer ângulo).', 'Segundo ponto (canto oposto, ou o outro ponto do lado).', 'Ponto do lado oposto (modo de qualquer ângulo). Esc cancela.'],
  cargaLaje: ['Clique numa laje (destacada): lança a carga de superfície do painel Ferramentas de lançamento.'],
  cargaViga: ['Clique numa viga para lançar a carga linear ao longo dela, ou clique em dois cantos para uma janela de captura.', 'Segundo canto da janela: as vigas inteiramente dentro dela recebem a carga.'],
  direcaoPano: ['Clique no pano cuja direção mudar.', 'Clique numa viga (paralela ou perpendicular, conforme o painel) ou, no modo de dois pontos, no primeiro ponto.', 'Segundo ponto da direção.'],
  insercaoPano: ['Clique no pano.', 'Clique perto do vértice que será o ponto de inserção do pano.'],
  contaGotas: ['Clique num pilar para pegar os dados dele (clique noutro pilar para trocar).', 'Clique onde inserir um pilar novo com esses dados (Esc volta a Selecionar).'],
  alinhar: ['1º ponto na máscara.', 'Onde esse ponto deve ficar.', '2º ponto na máscara.', 'Onde o 2º ponto deve ficar.'],
  vigaFund: ['Clique no primeiro elemento de fundação (ou pilar de arranque) da viga de fundação.', 'Clique no segundo elemento; a viga é lançada com o tipo e a seção do grupo Fundação. Esc cancela.'],
  girarFund: ['Primeiro ponto da direção: os elementos de fundação selecionados giram para a direção dos dois pontos.', 'Segundo ponto da direção.'],
  insFund: ['Clique no elemento de fundação (sapata ou bloco) cujo ponto de inserção quer mover.', 'Clique no novo centro do elemento (posição livre; o pilar fica excêntrico).'],
  limite: ['Primeiro vértice do limite (divisa, poço, reservatório); “Limite fechado” na barra fecha a polilinha.', 'Próximo vértice; Enter ou botão direito termina; Esc cancela.'],
  limiteMascara: ['Clique sobre uma linha da máscara DXF: a polilinha ligada a ela vira o limite da fundação.'],
  corte: ['Clique os vértices do traçado do corte (capturas valem; Enter, duplo clique ou botão direito termina; Esc cancela). O lado visto e a profundidade ficam no grupo Cortes e seções.'],
  secao: ['Primeiro ponto da linha de seção do pavimento.', 'Segundo ponto: a seção abre em uma janela.'],
  zonaLaje: ['Primeiro ponto da zona de uniformização das armaduras das lajes (linha ou canto do retângulo; forma, face e direção na barra).', 'Segundo ponto (outro canto, ou o fim da linha).'],
  linhaDobra: ['Primeiro ponto da linha de dobra das lajes (negativo máximo e emenda preferencial da armadura inferior).', 'Segundo ponto da linha.'],
  puncao: ['Clique num pilar que apoia a laje sem viga: adiciona (ou apaga, conforme o modo da barra) o grupo de armadura de punção informado. Calcule o dimensionamento antes; Esc volta a Selecionar.'],
  radier: ['Primeiro vértice do contorno do radier (placa sobre base elástica; os pilares dentro dele nascem na malha).', 'Próximo vértice; Enter, duplo clique ou botão direito fecha o contorno; Esc cancela.'],
  corrida: ['Primeiro ponto do eixo da sapata corrida (sob parede, viga de fundação ou alinhamento de pilares; largura do apoio, aba e opções no grupo Fundação).', 'Próximo ponto; Enter, duplo clique ou botão direito termina; Esc cancela.'],
  vigaElastica: ['Primeiro ponto do eixo da viga sobre base elástica (os pilares sobre ela nascem na viga).', 'Próximo ponto; Enter, duplo clique ou botão direito termina; Esc cancela.'],
  fundacao: ['Clique num pilar para lançar o elemento de fundação (tipo e posição no grupo Fundação; em divisa e canto o clique indica a face ou o canto). R gira 90°.', 'Posição livre: clique no centro do elemento.'],
  dividir: ['Clique na viga, no ponto em que ela deve ser dividida em duas.'],
  unir: ['Clique na primeira viga.', 'Clique na viga a unir (mesma seção e alinhamento, com uma ponta em comum).'],
  prolongar: ['Clique perto da extremidade da viga a prolongar ou aparar.', 'Clique no alvo: outra viga, um eixo ou um ponto (a viga segue a direção do trecho).'],
  copiar: ['Ponto base da cópia da seleção (pilares e vigas).', 'Ponto de destino (cópias em série pelo número da barra).'],
  girar: ['Clique o centro do giro da seleção (ângulo na barra da planta; digite x;y e Enter para coordenadas).'],
  espelhar: ['1º ponto do eixo de espelhamento da seleção.', '2º ponto do eixo.'],
  pilarParede: ['Clique para lançar o pilar-parede do tipo escolhido no grupo Pilares-parede (o primeiro vértice do tipo vai ao clique; R gira 90°; Esc volta a Selecionar).'], parede: ['Clique os vértices do eixo da parede (capturas valem; Enter termina; Esc cancela).'],
};

export function Planta() {
  const { sessao, exec, diags } = useBuilding();
  const aj = useAjuda();
  const b = sessao.modelo;
  const pl = usePlanta();
  const pavs = pavimentosOrdenados(b);
  const nivelFund = pl.pavimento === 'fundacao';
  const pav = nivelFund ? pavs[0] ?? null : pavs.find((p) => p.id === pl.pavimento) ?? pavs[Math.min(1, pavs.length - 1)] ?? null;
  const grupo = pav?.grupo ?? '';
  /** Grupo das cargas: no nível de fundação, as cargas sobre as vigas e os elementos de fundação (FU2). */
  const grupoCarga = nivelFund ? 'fundacao' : grupo;
  const cores = paleta(pl.tema, pl.cores[pl.tema]);
  /** Textos de referência (L4): tipos visíveis da obra e deslocamento do usuário em pixels. */
  const textosVis = textosVisiveis(b);
  const descRef = (id: string): [number, number] => { const r = refDe(b, id), k = vista?.k ?? 1; return r ? [r.dx * k, -r.dy * k] : [0, 0]; };

  const wrap = useRef<HTMLDivElement>(null);
  const cvM = useRef<HTMLCanvasElement>(null), cvE = useRef<HTMLCanvasElement>(null), cvI = useRef<HTMLCanvasElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const [tam, setTam] = useState<[number, number]>([800, 500]);
  const [digitando, setDigitando] = useState<string | null>(null);
  const [posDig, setPosDig] = useState<P2>([0, 0]);
  const [pontos, setPontosEstado] = useState<P2[]>([]);
  // espelho síncrono dos vértices em lançamento: cliques e Enter em sequência rápida chegam antes da nova renderização e leriam o estado antigo
  const pontosRef = useRef<P2[]>([]);
  const setPontos = (v: P2[]) => { pontosRef.current = v; setPontosEstado(v); };

  // estado de interação fora do React (muda a cada movimento do mouse)
  const it = useRef({
    cursor: [0, 0] as P2, tela: [0, 0] as P2, cap: null as Captura | null, caps: [] as Captura[], ciclo: 0, ponto: [0, 0] as P2,
    guia: false, pan: null as null | { x: 0 | number; y: number; v: Vista }, janela: null as null | { a: P2; z: P2 }, espaco: false,
    baixo: null as string | null, fundPilar: null as string | null, insEl: null as string | null, vigaRef: null as string | null, lajeAb: null as string | null, refEl: null as string | null, refDe: [0, 0] as P2, vfIni: null as string | null, extremidade: 'fim' as 'ini' | 'fim', cache: null as HTMLCanvasElement | null, vistaCache: null as Vista | null, timer: 0 as number | ReturnType<typeof setTimeout>, quadros: [] as number[],
  });

  // ---- dados derivados ----
  const mascaras = b.mascaras, todasVigas = b.vigas;
  const desenhoMascara = useMemo(() => {
    const g = geometriaMascara({ mascaras }, grupo, false);
    const textos: { x: number; y: number; h: number; rot: number; t: string }[] = [];
    for (const m of mascaras.filter((x) => mascaraNoGrupo(x, grupo) && x.visivel !== false))
      for (const c of m.camadas) if (c.visivel && c.textos !== false) for (const t of m.geo[c.nome]?.textos ?? []) { const [x, y] = mascaraParaMundo(m, t.x, t.y); textos.push({ x, y, h: t.h * m.escala, rot: t.rot + m.rotacao, t: t.t }); }
    // camadas com cor ou espessura próprias (L2, C2.7 e C2.8) são traçadas à parte
    const pad = { segs: [] as number[], arcos: [] as number[] };
    const estilos: { segs: Float64Array; arcos: Float64Array; cor?: string; espessura?: number }[] = [];
    for (const c of geometriaPorCamada({ mascaras }, grupo, false)) {
      if (c.cam.cor || c.cam.espessura) estilos.push({ segs: Float64Array.from(c.segs), arcos: Float64Array.from(c.arcos), cor: c.cam.cor, espessura: c.cam.espessura });
      else { for (const v of c.segs) pad.segs.push(v); for (const v of c.arcos) pad.arcos.push(v); }
    }
    return { segs: Float64Array.from(g.segs), arcos: Float64Array.from(g.arcos), textos, padrao: { segs: Float64Array.from(pad.segs), arcos: Float64Array.from(pad.arcos) }, estilos };
  }, [mascaras, grupo]);
  const idxMascara = useMemo(() => { const g = geometriaMascara({ mascaras }, grupo, true); return new IndiceCaptura(g.segs, g.arcos); }, [mascaras, grupo]);
  const paredesPl = useMemo(() => paredesDaPlanta(b, pav?.id ?? null, nivelFund, pl.inferior), [b, pav?.id, pl.inferior, nivelFund]);
  const naPlanta = useMemo(() => (nivelFund ? pilaresDaFundacao(b) : pilaresDaPlanta(b, pav?.id ?? null, pl.inferior)), [b, pav?.id, pl.inferior, nivelFund]);
  const vigas = useMemo(() => (nivelFund ? [] : todasVigas.filter((v) => v.grupo === grupo).map((v) => ({ v, g: geometriaViga(v), t: trechosViga(v) }))), [todasVigas, grupo, nivelFund]);
  const idxModelo = useMemo(() => {
    const segs: number[] = [], arcos: number[] = [];
    for (const e of b.eixos) segs.push(e.p1[0], e.p1[1], e.p2[0], e.p2[1]);
    for (const { g } of vigas) for (const lado of [g.esq, g.dir, g.eixo]) for (let i = 0; i + 1 < lado.length; i++) segs.push(lado[i][0], lado[i][1], lado[i + 1][0], lado[i + 1][1]);
    for (const q of naPlanta) {
      const c = q.contorno;
      if (c.length > 4) { const cx = c.reduce((s, v) => s + v[0], 0) / c.length, cy = c.reduce((s, v) => s + v[1], 0) / c.length, r = Math.hypot(c[0][0] - cx, c[0][1] - cy); arcos.push(cx, cy, r, 0, 360); continue; }
      for (let i = 0; i < c.length; i++) segs.push(c[i][0], c[i][1], c[(i + 1) % c.length][0], c[(i + 1) % c.length][1]);
      const cx = c.reduce((s, v) => s + v[0], 0) / c.length, cy = c.reduce((s, v) => s + v[1], 0) / c.length;
      arcos.push(cx, cy, 1e-6, 0, 360); // centro do pilar
    }
    return new IndiceCaptura(segs, arcos);
  }, [b.eixos, naPlanta, vigas]);
  const todasLajes = b.lajes, todasCargas = b.cargas;
  const lajes = useMemo(() => (nivelFund ? [] : todasLajes.filter((l) => l.grupo === grupo).map((l) => ({ l, c: pontoInterno(l.contorno) }))), [todasLajes, grupo, nivelFund]);
  const cargas = useMemo(() => todasCargas.filter((c) => c.grupo === grupoCarga), [todasCargas, grupoCarga]);
  // elementos de fundação do nível (contorno do resultado ou, sem cálculo, um círculo de referência no pilar)
  const dimFund = useBuilding((st) => st.dim?.fundacoes);
  const limitesIgnorados = useMemo(() => new Set((dimFund ?? []).flatMap((r) => r.grupo?.limitesIgnorados.map((x) => x.id) ?? [])), [dimFund]);
  const elementosFund = b.fundacao?.elementos;
  const fund = useMemo(() => (!nivelFund ? [] : (elementosFund ?? []).map((el) => {
    const r = dimFund?.find((x) => x.id === el.id);
    const calculado = !!r && r.contorno.length > 0;
    return { el, r, calculado, contorno: calculado ? r!.contorno as P2[] : circulo([el.x, el.y], 0.45) };
  })), [nivelFund, elementosFund, dimFund]);
  // vigas de fundação (equilíbrio e travamento): eixo entre os pilares das pontas e pontas equilibradas
  const dimVF = useBuilding((st) => st.dim?.vigasFundacao);
  const vigasFund = useMemo(() => (!nivelFund ? [] : (b.fundacao?.vigas ?? []).map((v) => {
    const g = geometriaVF(b, v), r = dimVF?.find((x) => x.id === v.id);
    return { v, g, eq: r?.equilibrio ?? pontasEquilibradas(v, g), larg: r?.bAdot ?? v.b, alt: r?.hAdot ?? v.h };
  })), [nivelFund, b, dimVF]);
  // limites poligonais da fundação (FU3) e cruzamentos de vigas de fundação (apoio intermediário)
  const limites = useMemo(() => (nivelFund ? b.fundacao?.limites ?? [] : []), [nivelFund, b.fundacao?.limites]);
  // base elástica (FU6): radiers e vigas sobre base elástica, com o resultado por nó (mapa) do último cálculo
  const radiers = useMemo(() => (nivelFund ? b.fundacao?.radiers ?? [] : []), [nivelFund, b.fundacao?.radiers]);
  const vigasEl = useMemo(() => (nivelFund ? (b.fundacao?.vigasElasticas ?? []).map((v) => ({ v, f: faixaVigaElastica(v) as P2[] })) : []), [nivelFund, b.fundacao?.vigasElasticas]);
  const dimRad = useBuilding((st) => st.dim?.radiers), dimVE = useBuilding((st) => st.dim?.vigasElasticas), dimCor = useBuilding((st) => st.dim?.corridas);
  // sapatas corridas (FU7a): base (largura calculada ou a efetiva) e elemento apoiado em planta
  const corridasP = useMemo(() => (nivelFund ? (b.fundacao?.corridas ?? []).map((c) => { const r = dimCor?.find((x) => x.id === c.id), B = r?.B ?? corridaEfetiva(b, c).B; const cintas = c.cintas?.length && c.aba !== 'ambas' ? geometriasCintas(b, c).itens.filter((x) => !x.erro).map((x) => { const rc = r?.cintas?.find((y) => y.id === x.cinta.id); return { nome: x.cinta.nome, a: x.g.a as P2, z: x.g.z as P2, larg: rc?.bAdot ?? x.cinta.b, alt: rc?.hAdot ?? x.cinta.h }; }) : []; return { c, r, B, contorno: contornoCorrida(c, B) as P2[], apoio: contornoApoio(c) as P2[], cintas }; }) : []), [nivelFund, b, dimCor]);
  const cruzamentosVFPlanta = useMemo(() => cruzamentosVF(vigasFund.map((x) => x.g)).map((c) => {
    const nome = (id: string) => b.fundacao?.vigas?.find((x) => x.id === id)?.nome ?? id, nApoiada = nome(c.apoiada);
    return { ...c, nApoiada, nApoio: nome(c.apoio), R: dimVF?.find((x) => x.id === c.apoio)?.cruzamentos?.find((x) => x.papel === 'apoio' && x.com === nApoiada)?.R };
  }), [vigasFund, b.fundacao?.vigas, dimVF]);
  const panos = useMemo(() => (pl.ferramenta === 'laje' ? panosDoGrupo({ vigas: todasVigas } as BuildingModel, grupo) : []), [todasVigas, grupo, pl.ferramenta]);
  // erros de lançamento (sempre) e, com resultado de dimensionamento, erros e avisos da revisão (calculados uma vez por resultado)
  const rev = useRevisao();
  const niveisRev = useMemo(() => {
    const e = new Set<string>(), a = new Set<string>();
    for (const [k, n] of rev.porElemento) (n === 'erro' ? e : a).add(k.slice(k.indexOf('|') + 1));
    return { e, a };
  }, [rev]);
  const comErro = useMemo(() => new Set([...diags.filter((d) => d.severidade === 'erro').flatMap((d) => d.elementos), ...(pl.mostrarErros ? niveisRev.e : [])]), [diags, niveisRev, pl.mostrarErros]);
  // armadura das lajes do pavimento (camada opcional): posições das lajes do grupo, calculadas uma vez por resultado
  const dimLajes = useBuilding((st) => st.dim?.detalhesLajes);
  const armLajes = useMemo(() => {
    if (pl.armaduraLajes === 'nenhuma' || !dimLajes) return [];
    const ids = new Set(lajes.map(({ l }) => l.id));
    return dimLajes.filter((d) => ids.has(d.laje)).flatMap((d) => d.posicoes.filter((x) => facesLaje(pl.armaduraLajes).includes(x.face)).map((x) => ({ x, laje: d.laje, mx: (x.faixa[0][0] + x.faixa[1][0]) / 2, my: (x.faixa[0][1] + x.faixa[1][1]) / 2 })));
  }, [dimLajes, lajes, pl.armaduraLajes]);
  const painelLajes = useMemo(() => {
    if (pl.armaduraLajes === 'nenhuma' || !dimLajes) return [];
    const ids = new Set(lajes.map(({ l }) => l.id));
    return dimLajes.filter((d) => ids.has(d.laje)).flatMap((d) => (d.paineis ?? []).filter((p) => facesLaje(pl.armaduraLajes).includes(p.face)));
  }, [dimLajes, lajes, pl.armaduraLajes]);
  // lajes treliçadas na mesma camada: vigotas (inferior: adicional ao longo do vão) e negativos nas pontas (superior)
  const dimVigotas = useBuilding((st) => st.dim?.vigotas);
  const armVigotas = useMemo(() => {
    if (pl.armaduraLajes === 'nenhuma' || !dimVigotas) return [];
    const ids = new Set(lajes.map(({ l }) => l.id));
    const out: { a: P; z: P; rot?: string; face: 'inf' | 'sup' }[] = [];
    for (const face of facesLaje(pl.armaduraLajes)) for (const r of dimVigotas) {
      if (!ids.has(r.laje)) continue;
      const vistos = new Set<number>();
      for (const i of faixasVisiveis(r, pl.vigotasTodas)) {
        const f = r.faixas[i], g = r.grupos[f.grupo], ux = (f.z[0] - f.a[0]) / (f.L || 1), uy = (f.z[1] - f.a[1]) / (f.L || 1), ao = (c: number): P => [f.a[0] + ux * c, f.a[1] + uy * c];
        const rot = vistos.has(f.grupo) ? undefined : (vistos.add(f.grupo), `G${f.grupo + 1} · ${g.vigotas} vigotas · ${larguraGrupo(r, f.grupo).toFixed(2).replace('.', ',')} m`);
        if (face === 'inf') out.push({ a: f.a, z: f.z, rot, face });
        else g.negativos.forEach((n, k) => { if (n) out.push(k ? { a: ao(Math.max(0, f.L - n.comprimento)), z: f.z, face } : { a: f.a, z: ao(Math.min(f.L, n.comprimento)), face }); });
      }
    }
    return out;
  }, [dimVigotas, lajes, pl.armaduraLajes, pl.vigotasTodas]);
  // punção e cortante (N2d): contornos críticos e armadura dos pilares do pavimento (camada opcional)
  const dimPuncao = useBuilding((st) => st.dim?.puncao);
  const puncaoPlanta = useMemo(() => (pl.camadaPuncao && dimPuncao && pav ? dimPuncao.filter((r) => r.pavimentoId === pav.id) : []), [dimPuncao, pav?.id, pl.camadaPuncao]);
  const bloqueados = useMemo(() => idsBloqueados({ vigas: b.vigas, pilares: b.pilares } as BuildingModel), [b.vigas, b.pilares]);
  const comAviso = useMemo(() => new Set(pl.mostrarErros ? [...niveisRev.a].filter((i) => !comErro.has(i)) : []), [niveisRev, comErro, pl.mostrarErros]);

  // ---- vista ----
  const enquadrar = () => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const bb = (x: number, y: number) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
    for (const e of b.eixos) { bb(...e.p1); bb(...e.p2); }
    for (const q of naPlanta) for (const v of q.contorno) bb(v[0], v[1]);
    for (const { v } of vigas) for (const q of v.pontos) bb(q[0], q[1]);
    for (const f of fund) for (const q of f.contorno) bb(q[0], q[1]);
    for (const l of limites) for (const q of l.pontos) bb(q[0], q[1]);
    for (const r of radiers) for (const q of r.contorno) bb(q[0], q[1]);
    for (const { f } of vigasEl) for (const q of f) bb(q[0], q[1]);
    for (const { contorno } of corridasP) for (const q of contorno) bb(q[0], q[1]);
    for (const { g } of vigasFund) if (!g.erro) { bb(...g.a); bb(...g.z); }
    const s = desenhoMascara.segs;
    for (let i = 0; i < s.length; i += 2) bb(s[i], s[i + 1]);
    if (!Number.isFinite(x0)) { x0 = -2; y0 = -2; x1 = 20; y1 = 14; }
    const w = Math.max(x1 - x0, 1), h = Math.max(y1 - y0, 1), k = Math.min((tam[0] - 110) / w, (tam[1] - 110) / h); // margem para os balões dos eixos
    pl.set({ vista: { k, ox: tam[0] / 2 - ((x0 + x1) / 2) * k, oy: tam[1] / 2 + ((y0 + y1) / 2) * k } });
  };
  const vista = pl.vista;
  const paraMundo = (sx: number, sy: number, v: Vista = vista!): P2 => [(sx - v.ox) / v.k, (v.oy - sy) / v.k];
  const paraTela = (x: number, y: number, v: Vista = vista!): P2 => [v.ox + x * v.k, v.oy - y * v.k];

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setTam([Math.max(100, e.contentRect.width), Math.max(100, e.contentRect.height)]));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // enquadra na primeira vez e ao trocar de grupo (planta diferente)
  const grupoVisto = useRef<string | null>(null);
  useEffect(() => {
    if (!vista || grupoVisto.current !== grupo) { grupoVisto.current = grupo; enquadrar(); }
  });
  // centraliza no elemento pedido pela lista de erros / janela de resultados (mantém o zoom se o elemento couber)
  const focoFeito = useRef<unknown>(null);
  useEffect(() => {
    const f = pl.foco;
    if (!f || focoFeito.current === f || !wrap.current) return;
    const pts: P2[] = naPlanta.find((q) => q.p.id === f.id)?.contorno ?? vigas.find((x) => x.v.id === f.id)?.v.pontos ?? lajes.find((x) => x.l.id === f.id)?.l.contorno ?? fund.find((x) => x.el.id === f.id)?.contorno ?? (radiers.find((x) => x.id === f.id)?.contorno as P2[] | undefined) ?? vigasEl.find((x) => x.v.id === f.id)?.f ?? corridasP.find((x) => x.c.id === f.id)?.contorno ?? (limites.find((x) => x.id === f.id)?.pontos as P2[] | undefined) ?? ((vf) => (vf && !vf.g.erro ? [vf.g.a, vf.g.z] : []))(vigasFund.find((x) => x.v.id === f.id)) ?? [];
    if (!pts.length) return;
    focoFeito.current = f;
    const W = wrap.current.clientWidth || tam[0], H = wrap.current.clientHeight || tam[1];
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const kAjuste = Math.min((W - 160) / Math.max(x1 - x0, 0.5), (H - 160) / Math.max(y1 - y0, 0.5));
    const k = vista && vista.k <= kAjuste ? vista.k : Math.min(kAjuste, 200);
    pl.set({ vista: { k, ox: W / 2 - ((x0 + x1) / 2) * k, oy: H / 2 + ((y0 + y1) / 2) * k } });
  });

  // ---- desenho ----
  const prep = (cv: HTMLCanvasElement | null) => {
    if (!cv) return null;
    const d = dprAtual(), W = Math.round(tam[0] * d), H = Math.round(tam[1] * d);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; cv.style.width = `${tam[0]}px`; cv.style.height = `${tam[1]}px`; }
    const ctx = cv.getContext('2d')!;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    return ctx;
  };

  const desenharMascaraEm = (ctx: CanvasRenderingContext2D, v: Vista) => {
    ctx.clearRect(0, 0, tam[0], tam[1]);
    ctx.fillStyle = cores.fundo; ctx.fillRect(0, 0, tam[0], tam[1]);
    const { textos, padrao, estilos } = desenhoMascara;
    const tracar = (segs: Float64Array, arcos: Float64Array, cor: string, largura: number) => {
      ctx.strokeStyle = cor; ctx.lineWidth = largura;
      ctx.beginPath();
      for (let i = 0; i < segs.length; i += 4) { ctx.moveTo(v.ox + segs[i] * v.k, v.oy - segs[i + 1] * v.k); ctx.lineTo(v.ox + segs[i + 2] * v.k, v.oy - segs[i + 3] * v.k); }
      for (let i = 0; i < arcos.length; i += 5) {
        const cx = v.ox + arcos[i] * v.k, cy = v.oy - arcos[i + 1] * v.k, r = arcos[i + 2] * v.k;
        ctx.moveTo(cx + r * Math.cos((-arcos[i + 3] * Math.PI) / 180), cy + r * Math.sin((-arcos[i + 3] * Math.PI) / 180));
        ctx.arc(cx, cy, r, (-arcos[i + 3] * Math.PI) / 180, (-arcos[i + 4] * Math.PI) / 180, true);
      }
      ctx.stroke();
    };
    tracar(padrao.segs, padrao.arcos, cores.mascara, 1);
    for (const e of estilos) tracar(e.segs, e.arcos, e.cor || cores.mascara, e.espessura || 1);
    ctx.fillStyle = cores.mascara;
    for (const t of textos) {
      const h = t.h * v.k;
      if (h < 5 || h > 200) continue;
      ctx.save(); ctx.translate(v.ox + t.x * v.k, v.oy - t.y * v.k); ctx.rotate((-t.rot * Math.PI) / 180);
      ctx.font = `${h}px system-ui, sans-serif`; ctx.fillText(t.t, 0, 0); ctx.restore();
    }
  };

  /** Máscara: completa no cache; durante o gesto, só reposiciona o cache (rápido) e redesenha ao parar. */
  const desenharMascara = (rapido: boolean) => {
    const v = vista, ctx = prep(cvM.current);
    if (!v || !ctx) return;
    const s = it.current;
    if (rapido && s.cache && s.vistaCache) {
      const r = v.k / s.vistaCache.k, d = dprAtual();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = cores.fundo; ctx.fillRect(0, 0, cvM.current!.width, cvM.current!.height);
      ctx.setTransform(r, 0, 0, r, (v.ox - r * s.vistaCache.ox) * d, (v.oy - r * s.vistaCache.oy) * d);
      ctx.drawImage(s.cache, 0, 0);
      clearTimeout(s.timer);
      s.timer = setTimeout(() => desenharMascara(false), 140);
      return;
    }
    if (!s.cache) s.cache = document.createElement('canvas');
    const cctx = prep(s.cache)!;
    const t0 = agora();
    desenharMascaraEm(cctx, v);
    if (wrap.current) wrap.current.dataset.mascaraMs = (agora() - t0).toFixed(1);
    s.vistaCache = { ...v };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cvM.current!.width, cvM.current!.height);
    ctx.drawImage(s.cache, 0, 0);
  };

  /** Marcas dos cortes (traço e ponto, seta para o lado visto e nome nas pontas) e das linhas de seção do pavimento (V2). */
  const marcasDeCorte = (ctx: CanvasRenderingContext2D) => {
    if (!pl.mostrarCortes) return;
    ctx.save();
    ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = cores.janela; ctx.fillStyle = cores.janela; ctx.lineWidth = 2;
    for (const c of b.cortes ?? []) {
      const pts = c.pontos.map((q) => paraTela(q[0], q[1]));
      ctx.setLineDash([16, 5, 3, 5]); ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke(); ctx.setLineDash([]);
      for (const ini of [true, false]) {
        const a = ini ? pts[0] : pts[pts.length - 1], z = ini ? pts[1] : pts[pts.length - 2], L = Math.hypot(z[0] - a[0], z[1] - a[1]) || 1;
        const ux = ((ini ? 1 : -1) * (z[0] - a[0])) / L, uy = ((ini ? 1 : -1) * (z[1] - a[1])) / L, lado = c.sentido === 'esq' ? 1 : -1;
        const nx = lado * uy, ny = -lado * ux, fx = a[0] + nx * 26, fy = a[1] + ny * 26;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(fx, fy); ctx.moveTo(fx, fy); ctx.lineTo(fx - nx * 8 + ny * 5, fy - ny * 8 - nx * 5); ctx.moveTo(fx, fy); ctx.lineTo(fx - nx * 8 - ny * 5, fy - ny * 8 + nx * 5); ctx.stroke();
        ctx.fillText(c.nome, a[0] - ux * 18, a[1] - uy * 18);
      }
    }
    for (const sc of b.secoes ?? []) {
      if (sc.pavimento && sc.pavimento !== pav?.id) continue;
      const a = paraTela(sc.a[0], sc.a[1]), z = paraTela(sc.b[0], sc.b[1]);
      ctx.setLineDash([]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(z[0], z[1]); ctx.stroke();
      for (const q of [a, z]) { ctx.beginPath(); ctx.arc(q[0], q[1], 4, 0, 2 * Math.PI); ctx.fill(); }
      ctx.fillText(sc.nome, (a[0] + z[0]) / 2, (a[1] + z[1]) / 2 - 10);
    }
    ctx.restore();
  };

  const desenharModelo = () => {
    const v = vista, ctx = prep(cvE.current);
    if (!v || !ctx) return;
    ctx.clearRect(0, 0, tam[0], tam[1]);
    // eixos
    ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const e of b.eixos) {
      const a = paraTela(...e.p1), z = paraTela(...e.p2), sel = pl.selecao.has(e.id);
      ctx.strokeStyle = sel ? cores.selecao : cores.eixo; ctx.lineWidth = sel ? 2 : 1; ctx.setLineDash([14, 4, 2, 4]);
      ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...z); ctx.stroke(); ctx.setLineDash([]);
      const L = Math.hypot(z[0] - a[0], z[1] - a[1]) || 1, ux = (z[0] - a[0]) / L, uy = (z[1] - a[1]) / L;
      for (const [p, sgn] of [[a, -1], [z, 1]] as const) {
        const cx = p[0] + sgn * ux * 11, cy = p[1] + sgn * uy * 11;
        ctx.beginPath(); ctx.arc(cx, cy, 10, 0, 2 * Math.PI); ctx.fillStyle = cores.fundo; ctx.fill(); ctx.stroke();
        ctx.fillStyle = cores.eixo; ctx.fillText(e.nome, cx, cy + 0.5);
      }
    }
    // lajes
    for (const { l, c } of lajes) {
      const sel = pl.selecao.has(l.id), erro = comErro.has(l.id), avi = comAviso.has(l.id), cAlerta = erro ? cores.erro : avi ? cores.aviso : null;
      const path = new Path2D();
      l.contorno.forEach((q, i) => { const [x, y] = paraTela(q[0], q[1]); if (i) path.lineTo(x, y); else path.moveTo(x, y); });
      path.closePath();
      for (const f of l.furos ?? []) { f.forEach((q, i) => { const [x, y] = paraTela(q[0], q[1]); if (i) path.lineTo(x, y); else path.moveTo(x, y); }); path.closePath(); }
      ctx.globalAlpha = sel ? 0.45 : 0.22; ctx.fillStyle = cAlerta ?? (sel ? cores.selecao : cores.laje); ctx.fill(path, 'evenodd'); ctx.globalAlpha = 1;
      ctx.strokeStyle = cAlerta ?? cores.laje; ctx.lineWidth = 1; ctx.stroke(path);
      const [tx, ty] = paraTela(c[0], c[1]);
      ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = cAlerta ?? cores.laje;
      const [lx, ly] = descRef(l.id);
      if (textosVis.includes('nomes')) ctx.fillText(`${l.nome}${l.definir ? ' ?' : ''}${erro ? ' ⚠' : avi ? ' !' : ''}`, tx + lx, ty - 8 + ly);
      ctx.font = '10px system-ui, sans-serif'; if (textosVis.includes('secoes')) ctx.fillText(l.definir ? 'a definir' : l.tipo.tipo === 'macica' ? `h=${Math.round(l.tipo.h * 100)}` : l.tipo.tipo === 'trelicada' ? `${l.tipo.modelo}+${Math.round(l.tipo.capa * 100)}` : rotuloLaje(b, l.tipo), tx + lx, ty + 6 + ly);
      if (l.insercao !== undefined && l.contorno[l.insercao]) { const [ix, iy] = paraTela(l.contorno[l.insercao][0], l.contorno[l.insercao][1]); ctx.strokeStyle = cores.laje; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ix, iy, 5, 0, 2 * Math.PI); ctx.stroke(); } // ponto de inserção do pano (L5)
      if (ehNervurada(l.tipo) && !l.definir) { // seta dupla na direção das vigotas
        const a = ((l.direcao ?? 0) * Math.PI) / 180, L = 22, ux = Math.cos(a), uy = -Math.sin(a), cy = ty + 18 + Math.abs(uy) * L;
        ctx.strokeStyle = cores.laje; ctx.lineWidth = 1.2; ctx.beginPath();
        ctx.moveTo(tx - ux * L, cy - uy * L); ctx.lineTo(tx + ux * L, cy + uy * L);
        for (const sgn of [1, -1]) { const ex = tx + sgn * ux * L, ey = cy + sgn * uy * L; ctx.moveTo(ex, ey); ctx.lineTo(ex - sgn * (ux * 7 - uy * 4), ey - sgn * (uy * 7 + ux * 4)); ctx.moveTo(ex, ey); ctx.lineTo(ex - sgn * (ux * 7 + uy * 4), ey - sgn * (uy * 7 - ux * 4)); }
        ctx.stroke();
      }
    }
    // painéis de tela soldada da base detalhada (retângulo com diagonais e designação)
    if (painelLajes.length) {
      ctx.lineWidth = 1; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const pn of painelLajes) {
        const cor = pn.face === 'inf' ? cores.viga : cores.carga;
        ctx.strokeStyle = cor; ctx.fillStyle = cor;
        const q = pn.poligono.map((pt) => paraTela(pt[0], pt[1]));
        ctx.beginPath(); ctx.moveTo(...q[0]); for (const pt of q.slice(1)) ctx.lineTo(...pt); ctx.closePath(); ctx.moveTo(...q[0]); ctx.lineTo(...q[2]); ctx.stroke();
        if (v.k > 40) ctx.fillText(`${pn.n} ${pn.designacao}`, (q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2);
      }
      ctx.textAlign = 'left';
    }
    // armadura das lajes (barra representativa de cada posição, com ganchos e rótulo)
    if (armLajes.length) {
      const rotulos = v.k > 40, sigla = opcoesEmUso(b.opcoes, perfilDe(b)).lajeSiglaReforco === 1;
      ctx.lineWidth = 2; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      for (const { x, laje, mx, my } of armLajes) {
        const sel = pl.selecao.has(laje), cor = x.face === 'inf' ? cores.viga : cores.carga;
        ctx.strokeStyle = cor; ctx.fillStyle = cor; ctx.lineWidth = sel ? 3 : 2;
        const a = paraTela(x.a[0], x.a[1]), z = paraTela(x.z[0], x.z[1]);
        ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...z); ctx.stroke();
        for (const [pt, g] of [[a, x.ganchos[0]], [z, x.ganchos[1]]] as const) if (g > 0) { ctx.beginPath(); ctx.arc(pt[0], pt[1], 3, 0, 2 * Math.PI); ctx.stroke(); }
        if (rotulos) { const [tx, ty] = paraTela(mx, my), sg = sigla ? siglaReforco(x) : ''; ctx.fillText(`${x.pos} ${x.n}φ${String(x.phi).replace('.', ',')}${x.s > 0 ? ` c/${Math.round(x.s * 100)}` : ''}${sg ? ` ${sg}` : ''}${x.editada ? ' ✎' : ''}`, tx + 4, ty - 6); }
      }
    }
    // zonas de uniformização e linhas de dobra do grupo (R7e): com a camada de armadura, o painel de edição ou uma das ferramentas
    if (pl.armaduraLajes !== 'nenhuma' || pl.painelLajes || pl.ferramenta === 'zonaLaje' || pl.ferramenta === 'linhaDobra') {
      ctx.lineWidth = 1.5; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      (b.zonasLaje ?? []).forEach((z, i) => {
        if (z.grupo !== grupo) return;
        const poly = poligonoZona(z).map((q) => paraTela(q[0], q[1]));
        ctx.strokeStyle = cores.janela; ctx.fillStyle = cores.janela; ctx.setLineDash([8, 3]);
        ctx.beginPath(); poly.forEach((q, k) => (k ? ctx.lineTo(...q) : ctx.moveTo(...q))); ctx.closePath();
        ctx.globalAlpha = 0.1; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke(); ctx.setLineDash([]);
        ctx.fillText(`Z${i + 1} ${z.face === 'inf' ? 'inf.' : 'sup.'}`, poly[0][0] + 4, poly[0][1] - 8);
      });
      (b.linhasDobra ?? []).forEach((ln, i) => {
        if (ln.grupo !== grupo) return;
        const a = paraTela(ln.a[0], ln.a[1]), z = paraTela(ln.z[0], ln.z[1]);
        ctx.strokeStyle = cores.guia; ctx.fillStyle = cores.guia; ctx.setLineDash([14, 4, 2, 4]); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...z); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1.5;
        ctx.fillText(`LD${i + 1}`, (a[0] + z[0]) / 2 + 4, (a[1] + z[1]) / 2 - 8);
      });
    }
    if (armVigotas.length) {
      ctx.lineWidth = 1; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      for (const x of armVigotas) {
        ctx.strokeStyle = x.face === 'inf' ? cores.viga : cores.carga; ctx.fillStyle = ctx.strokeStyle;
        const a = paraTela(x.a[0], x.a[1]), z = paraTela(x.z[0], x.z[1]);
        ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...z); ctx.stroke();
        if (v.k > 40 && x.rot) { const [tx, ty] = paraTela((x.a[0] + x.z[0]) / 2, (x.a[1] + x.z[1]) / 2); ctx.fillText(x.rot, tx + 4, ty - 6); }
      }
    }
    // punção e cortante: contornos C, C′ e C″ (vermelho onde a tensão excede a resistência) e a armadura de punção
    if (wrap.current) wrap.current.dataset.puncao = String(puncaoPlanta.length);
    if (puncaoPlanta.length) {
      ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      for (const r of puncaoPlanta) {
        r.contornos.forEach((c, k) => {
          ctx.strokeStyle = !c.ok ? cores.erro : k === 0 ? cores.carga : k === 1 ? cores.laje : cores.viga; ctx.lineWidth = c.ok ? 1.2 : 2.6;
          for (const poli of c.pontos) { ctx.beginPath(); poli.forEach((q, i) => { const [x, y] = paraTela(q[0], q[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); }
        });
        ctx.fillStyle = cores.viga;
        for (const linha of r.armadura?.posicoes ?? []) for (const q of linha) { const [x, y] = paraTela(q[0], q[1]); ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 2 * Math.PI); ctx.fill(); }
        if (v.k > 25) { const [tx, ty] = paraTela(r.centro[0], r.centro[1]); ctx.fillStyle = r.status === 'fail' ? cores.erro : r.status === 'armadura' ? cores.aviso : cores.texto; ctx.fillText(`${r.contornos[1].tau.toFixed(2).replace('.', ',')}/${r.contornos[1].limite.toFixed(2).replace('.', ',')} MPa`, tx + 6, ty + 14); }
      }
    }
    // vigas
    for (const { v, g, t } of vigas) {
      const sel = pl.selecao.has(v.id), erro = comErro.has(v.id), avi = comAviso.has(v.id), cor = erro ? cores.erro : avi ? cores.aviso : sel ? cores.selecao : cores.viga;
      ctx.fillStyle = cor; ctx.globalAlpha = v.estrutural === false ? 0.04 : 0.12;
      for (const r of t) { ctx.beginPath(); r.forEach((q, i) => { const [x, y] = paraTela(q[0], q[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath(); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.strokeStyle = cor; ctx.lineWidth = erro || avi ? 2.5 : sel ? 2.5 : 1.5;
      if (v.estrutural === false) ctx.setLineDash([2, 4]); else if (v.invertida) ctx.setLineDash([6, 3]);
      for (const lado of [g.esq, g.dir]) { ctx.beginPath(); lado.forEach((q, i) => { const [x, y] = paraTela(q[0], q[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); }
      ctx.setLineDash([]);
      if (sel) { ctx.setLineDash([8, 4]); ctx.lineWidth = 1; ctx.beginPath(); g.eixo.forEach((q, i) => { const [x, y] = paraTela(q[0], q[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); ctx.setLineDash([]); }
      if (v.comum || v.comumDe) { ctx.setLineDash([10, 3, 2, 3]); ctx.lineWidth = 1.2; ctx.beginPath(); g.eixo.forEach((q, i) => { const [x, y] = paraTela(q[0], q[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); ctx.setLineDash([]); } // viga comum a dois grupos: eixo em traço-ponto (E2b)
      // rótulo no meio do trecho mais longo, legível (sem ficar de cabeça para baixo)
      let k = 0, Lm = 0;
      for (let i = 0; i + 1 < v.pontos.length; i++) { const L = Math.hypot(v.pontos[i + 1][0] - v.pontos[i][0], v.pontos[i + 1][1] - v.pontos[i][1]); if (L > Lm) { Lm = L; k = i; } }
      const a = paraTela(...g.esq[k]), z = paraTela(...g.esq[k + 1]);
      let ang = Math.atan2(z[1] - a[1], z[0] - a[0]);
      if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI;
      const [vx, vy] = descRef(v.id);
      ctx.save(); ctx.translate((a[0] + z[0]) / 2 + vx, (a[1] + z[1]) / 2 + vy); ctx.rotate(ang - ((refDe(b, v.id)?.rot ?? 0) * Math.PI) / 180);
      ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillStyle = erro ? cores.erro : avi ? cores.aviso : cores.viga;
      ctx.fillText(`${textosVis.includes('nomes') ? `${v.nome} ` : ''}${textosVis.includes('secoes') ? `${Math.round(v.secao.b * 100)}x${Math.round(v.secao.h * 100)}` : ''}${v.invertida ? ' inv.' : ''}${v.mesa ? ` ${v.mesa.tipo}` : ''}${v.chata ? ' chata' : ''}${v.estrutural === false ? ' n.est.' : ''}${v.amarracao ? ' amar.' : ''}${v.comum ? ' comum' : ''}${v.comumDe ? ' (assoc.)' : ''}${erro ? ' ⚠' : avi ? ' !' : ''}${bloqueados.has(v.id) ? ' ▣' : ''}`, 0, -3);
      ctx.restore();
    }
    // base elástica (FU6): radiers (contorno, furos, rótulo) e vigas sobre base elástica (faixa b), sob os elementos
    for (const r of radiers) {
      const sel = pl.selecao.has(r.id), erro = comErro.has(r.id), avi = comAviso.has(r.id), cor = erro ? cores.erro : avi ? cores.aviso : sel ? cores.selecao : cores.laje;
      const path = new Path2D();
      for (const anel of [r.contorno, ...(r.furos ?? [])]) { anel.forEach((q, i) => { const [x, y] = paraTela(q[0], q[1]); if (i) path.lineTo(x, y); else path.moveTo(x, y); }); path.closePath(); }
      ctx.globalAlpha = sel ? 0.35 : 0.14; ctx.fillStyle = cor; ctx.fill(path, 'evenodd'); ctx.globalAlpha = 1;
      ctx.strokeStyle = cor; ctx.lineWidth = erro || avi || sel ? 3 : 2; ctx.stroke(path);
      const res = dimRad?.find((x) => x.id === r.id), [tx, ty] = paraTela(...(pontoInterno(r.contorno) as P2));
      ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = cor;
      ctx.fillText(`${r.nome} radier h=${Math.round(r.h * 100)}${erro ? ' ⚠' : avi ? ' !' : ''}`, tx, ty - 8);
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillText(res ? `σmáx ${fmt(res.sigmaMax / 1000)} MPa · w ${fmt(res.recalque * 1000, 1)} mm` : `k ${r.k ? `${fmt(r.k / 1000, 0)} MN/m³` : 'padrão'}`, tx, ty + 7);
    }
    for (const { v: ve, f } of vigasEl) {
      const sel = pl.selecao.has(ve.id), erro = comErro.has(ve.id), avi = comAviso.has(ve.id), cor = erro ? cores.erro : avi ? cores.aviso : sel ? cores.selecao : cores.viga;
      ctx.beginPath(); f.forEach((q, i) => { const [x, y] = paraTela(q[0], q[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath();
      ctx.globalAlpha = sel ? 0.4 : 0.2; ctx.fillStyle = cor; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = cor; ctx.lineWidth = erro || avi || sel ? 2.5 : 1.5; ctx.stroke();
      const a = paraTela(...ve.pontos[0]), z = paraTela(...ve.pontos[1]);
      let ang = Math.atan2(z[1] - a[1], z[0] - a[0]);
      if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI;
      ctx.save(); ctx.translate((a[0] + z[0]) / 2, (a[1] + z[1]) / 2); ctx.rotate(ang);
      ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillStyle = cor;
      ctx.fillText(`${ve.nome} ${Math.round(ve.b * 100)}x${Math.round(ve.h * 100)} base elástica${erro ? ' ⚠' : avi ? ' !' : ''}`, 0, -Math.max(3, (ve.b * v.k) / 2 + 2));
      ctx.restore();
    }
    // sapatas corridas (FU7a): base, elemento apoiado, eixo e rótulo "SC1 120x40/20 φ12,5 c/14"
    for (const { c, r, contorno, apoio, B: Bc, cintas } of corridasP) {
      const sel = pl.selecao.has(c.id), erro = comErro.has(c.id), avi = comAviso.has(c.id), cor = erro ? cores.erro : avi ? cores.aviso : sel ? cores.selecao : cores.laje;
      const poli = (pts: P2[]) => { ctx.beginPath(); pts.forEach((q, i) => { const [x, y] = paraTela(q[0], q[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath(); };
      poli(contorno); ctx.globalAlpha = sel ? 0.35 : 0.14; ctx.fillStyle = cor; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = cor; ctx.lineWidth = erro || avi || sel ? 3 : 2; ctx.stroke();
      poli(apoio); ctx.globalAlpha = 0.3; ctx.fillStyle = cores.viga; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = cores.viga; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); c.pontos.forEach((q, i) => { const [x, y] = paraTela(q[0], q[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.strokeStyle = cores.guia; ctx.lineWidth = 1; ctx.setLineDash([8, 3, 2, 3]); ctx.stroke(); ctx.setLineDash([]);
      const a = paraTela(...c.pontos[0]), z = paraTela(...c.pontos[c.pontos.length - 1]);
      let ang = Math.atan2(z[1] - a[1], z[0] - a[0]);
      if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI;
      const t = r?.transversal;
      ctx.save(); ctx.translate((a[0] + z[0]) / 2, (a[1] + z[1]) / 2); ctx.rotate(ang);
      ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillStyle = cor;
      ctx.fillText(`${c.nome} ${Math.round(Bc * 100)}x${Math.round((r?.h ?? c.h ?? 0) * 100)}${r && r.h0 < r.h ? `/${Math.round(r.h0 * 100)}` : ''}${t?.barras ? ` φ${fmt(t.barras.phi, 1)} c/${Math.round(t.barras.s * 100)}` : ''}${r ? (r.modo === 'pilares' ? ' s/ pilares' : '') : ''}${erro ? ' ⚠' : avi ? ' !' : ''}`, 0, -Math.max(3, Math.max(ladosDaBase(c.aba, Bc, c.bw).esq, ladosDaBase(c.aba, Bc, c.bw).dir) * v.k + 2));
      ctx.restore();
      // cintas (FU8a): faixa da viga do eixo da corrida ao pilar interno, com nome e seção
      for (const ct of cintas) {
        const p1 = paraTela(ct.a[0], ct.a[1]), p2 = paraTela(ct.z[0], ct.z[1]);
        ctx.save(); ctx.lineCap = 'butt'; ctx.globalAlpha = 0.35; ctx.strokeStyle = cores.viga; ctx.lineWidth = Math.max(3, ct.larg * v.k);
        ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 1; ctx.stroke();
        let ang2 = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]); if (ang2 > Math.PI / 2 || ang2 < -Math.PI / 2) ang2 += Math.PI;
        ctx.translate((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2); ctx.rotate(ang2);
        ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillStyle = cores.viga;
        ctx.fillText(`${ct.nome} ${Math.round(ct.larg * 100)}x${Math.round(ct.alt * 100)} cinta`, 0, -Math.max(3, (ct.larg * v.k) / 2 + 2));
        ctx.restore();
      }
    }
    // mapa por nó (envoltória das raras): tensão no solo (escala até a σadm) ou recalque (até o maior), cor por faixa
    if (pl.mapaBase !== 'nenhum' && (dimRad?.length || dimVE?.length)) {
      const todos = [...(dimRad ?? []), ...(dimVE ?? [])].filter((x) => radiers.some((r) => r.id === x.id) || vigasEl.some((q) => q.v.id === x.id));
      const ref = pl.mapaBase === 'tensao' ? Math.max(1e-9, ...todos.map((x) => x.sigmaAdm ?? x.sigmaMax)) : Math.max(1e-9, ...todos.map((x) => x.recalque));
      const c0 = hexDaCor(cores.laje).hex, c1 = hexDaCor(cores.aviso).hex, c2 = hexDaCor(cores.erro).hex;
      const mix = (a: string, z: string, t: number) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(z.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('');
      const r0 = Math.max(2.5, Math.min(7, opcoesEmUso(b.opcoes, perfilDe(b)).radierMalha * v.k * 0.35));
      for (const x of todos) for (const n of x.nos) {
        const val = pl.mapaBase === 'tensao' ? n.sigma : n.w, t = val / ref;
        const [px, py] = paraTela(n.x, n.y);
        ctx.fillStyle = val < 0 || n.sigmaMin < 0 ? cores.selecao : t <= 0.5 ? mix(c0, c1, t * 2) : t <= 1 ? mix(c1, c2, (t - 0.5) * 2) : c2;
        ctx.beginPath(); ctx.arc(px, py, t > 1 || n.sigmaMin < 0 ? r0 * 1.4 : r0, 0, 2 * Math.PI); ctx.fill();
      }
      ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = cores.texto;
      ctx.fillText(pl.mapaBase === 'tensao' ? `Tensão no solo (raras): cor até σadm = ${fmt(ref / 1000)} MPa; acima = erro; tração em destaque` : `Recalque (raras): cor até ${fmt(ref * 1000, 1)} mm`, 12, 12);
    }
    // vigas de fundação: faixa entre os pilares das pontas (sob os elementos), seção e tipo no rótulo
    for (const { v: vf, g, larg, alt } of vigasFund) {
      const sel = pl.selecao.has(vf.id), erro = comErro.has(vf.id) || !!g.erro, avi = comAviso.has(vf.id), cor = erro ? cores.erro : avi ? cores.aviso : sel ? cores.selecao : cores.viga;
      if (g.erro) { // ponta inválida: traço fino entre o que existir
        continue;
      }
      const n: P2 = [-g.u[1] * larg / 2, g.u[0] * larg / 2];
      const c = [[g.a[0] + n[0], g.a[1] + n[1]], [g.z[0] + n[0], g.z[1] + n[1]], [g.z[0] - n[0], g.z[1] - n[1]], [g.a[0] - n[0], g.a[1] - n[1]]].map((q) => paraTela(q[0], q[1]));
      ctx.beginPath(); c.forEach((q, i) => (i ? ctx.lineTo(...q) : ctx.moveTo(...q))); ctx.closePath();
      ctx.globalAlpha = sel ? 0.4 : 0.18; ctx.fillStyle = cor; ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = cor; ctx.lineWidth = erro || avi || sel ? 2.5 : 1.5; if (vf.tipo === 'travamento') ctx.setLineDash([7, 4]); ctx.stroke(); ctx.setLineDash([]);
      const a = paraTela(...g.a), z = paraTela(...g.z);
      let ang = Math.atan2(z[1] - a[1], z[0] - a[0]);
      if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI;
      ctx.save(); ctx.translate((a[0] + z[0]) / 2, (a[1] + z[1]) / 2); ctx.rotate(ang);
      ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillStyle = erro ? cores.erro : avi ? cores.aviso : cores.viga;
      ctx.fillText(`${vf.nome} ${Math.round(larg * 100)}x${Math.round(alt * 100)} ${vf.tipo === 'equilibrio' ? 'eq.' : 'trav.'}${erro ? ' ⚠' : avi ? ' !' : ''}`, 0, -Math.max(3, (larg * v.k) / 2 + 2));
      ctx.restore();
    }
    // cruzamentos de vigas de fundação (a viga de maior prioridade apoia a outra no cruzamento)
    for (const c of cruzamentosVFPlanta) {
      const [x, y] = paraTela(c.ponto[0], c.ponto[1]);
      ctx.strokeStyle = cores.cruzamento; ctx.fillStyle = cores.cruzamento; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 6); ctx.lineTo(x - 6, y); ctx.closePath(); ctx.stroke();
      ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1;
      if (v.k > 18) { ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(`${c.nApoiada} apoiada em ${c.nApoio}${c.R !== undefined ? ` · R ${fmt(c.R, 0)} kN` : ''}`, x + 9, y + 3); }
    }
    // limites poligonais da fundação (divisa, poço, reservatório): as sapatas de altura constante não os invadem
    for (const l of limites) {
      const sel = pl.selecao.has(l.id), ign = limitesIgnorados.has(l.id), cor = sel ? cores.selecao : ign ? cores.aviso : cores.limite;
      const pts = l.pontos.map((q) => paraTela(q[0], q[1]));
      ctx.strokeStyle = cor; ctx.lineWidth = sel ? 4 : 3; ctx.setLineDash([12, 5]);
      ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(...q) : ctx.moveTo(...q))); if (l.fechado) ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = cor;
      for (const q of pts) ctx.fillRect(q[0] - 2.5, q[1] - 2.5, 5, 5);
      ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText(`${l.nome}${l.cota !== undefined ? ` (${fmt(l.cota)} m)` : ''}${ign ? ' ignorado' : ''}`, pts[0][0] + 6, pts[0][1] - 6);
    }
    // elementos de fundação: contorno do resultado, estacas, centro e excentricidade do pilar, rótulo
    for (const { el, r, calculado, contorno } of fund) {
      const sel = pl.selecao.has(el.id), erro = comErro.has(el.id), avi = comAviso.has(el.id), cor = erro ? cores.erro : avi ? cores.aviso : sel ? cores.selecao : cores.laje;
      const path = new Path2D();
      contorno.forEach((q, i) => { const [x, y] = paraTela(q[0], q[1]); if (i) path.lineTo(x, y); else path.moveTo(x, y); });
      path.closePath();
      ctx.globalAlpha = sel ? 0.4 : 0.2; ctx.fillStyle = cor; ctx.fill(path); ctx.globalAlpha = 1;
      ctx.strokeStyle = cor; ctx.lineWidth = erro || avi || sel ? 2.5 : 1.5; if (!calculado) ctx.setLineDash([5, 3]); ctx.stroke(path); ctx.setLineDash([]);
      let cxm = 0, cym = 0;
      for (const q of contorno) { cxm += q[0]; cym += q[1]; }
      cxm /= contorno.length; cym /= contorno.length;
      const centro: P2 = r && calculado ? r.centro as P2 : [cxm, cym];
      const estacas = r?.projeto?.pile?.loads.coords ?? r?.projeto?.pileFixed?.loads.coords;
      if (estacas && calculado) {
        const D = (r!.dims.D ?? 40) / 100;
        ctx.lineWidth = 1; ctx.fillStyle = cores.fundo;
        for (const e of estacas) { const w = girar(e as P2, el.angulo), [x, y] = paraTela(centro[0] + w[0], centro[1] + w[1]); ctx.beginPath(); ctx.arc(x, y, Math.max(2, (D / 2) * v.k), 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); }
      }
      // bloco com vários pilares: bielas de cada pilar às estacas
      const struts = r?.projeto?.cap?.multi?.struts;
      if (struts && estacas && calculado) {
        ctx.strokeStyle = cores.carga; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.75;
        for (const q of struts) {
          const e = estacas[q.pile];
          if (!e) continue;
          const w0 = girar(q.top as P2, el.angulo), w1 = girar(e as P2, el.angulo), [x0, y0] = paraTela(centro[0] + w0[0], centro[1] + w0[1]), [x1, y1] = paraTela(centro[0] + w1[0], centro[1] + w1[1]);
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      // sapata associada / bloco com vários pilares: faixas de flexão (eixos do elemento), pilares do grupo e ponto de referência
      if (calculado && r?.grupo) {
        const cs = contorno.map((q) => paraTela(q[0], q[1])), ax = Math.cos((el.angulo * Math.PI) / 180), ay = Math.sin((el.angulo * Math.PI) / 180);
        const ext = Math.max(...contorno.map((q) => Math.hypot(q[0] - centro[0], q[1] - centro[1])));
        if (r.tipo === 'sapata' && v.k > 12 && cs.length) {
          ctx.strokeStyle = cores.cota; ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
          for (const [dx, dy] of [[ax, ay], [-ay, ax]]) { const [x0, y0] = paraTela(centro[0] - dx * ext, centro[1] - dy * ext), [x1, y1] = paraTela(centro[0] + dx * ext, centro[1] + dy * ext); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
          ctx.setLineDash([]);
        }
        const [rx, ry] = paraTela(r.grupo.referencia[0], r.grupo.referencia[1]);
        ctx.strokeStyle = cor; ctx.fillStyle = cor; ctx.lineWidth = 1;
        for (const q of r.grupo.pilares) { const [qx, qy] = paraTela(q.centro[0], q.centro[1]); ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(qx, qy); ctx.stroke(); ctx.setLineDash([]); ctx.fillRect(qx - 3, qy - 3, 6, 6); }
        ctx.beginPath(); ctx.moveTo(rx, ry - 6); ctx.lineTo(rx + 6, ry); ctx.lineTo(rx, ry + 6); ctx.lineTo(rx - 6, ry); ctx.closePath(); ctx.fill();
        const f = r.projeto?.footing;
        if (f && isFooting(f) && v.k > 12 && (f.flex.x.top?.needed || f.flex.y.top?.needed)) {
          ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = cores.cota;
          ctx.fillText('malha sup.', Math.min(...cs.map((q) => q[0])) + 4, Math.min(...cs.map((q) => q[1])) + 3);
        }
      }
      if (calculado && r) {
        const [px, py] = paraTela(...centro), pc = b.pilares.find((x) => x.id === el.pilares[0]);
        ctx.strokeStyle = cores.cota; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px - 5, py); ctx.lineTo(px + 5, py); ctx.moveTo(px, py - 5); ctx.lineTo(px, py + 5); ctx.stroke();
        const e = Math.hypot(r.excentricidade[0], r.excentricidade[1]);
        if (pc && e > 1e-3) {
          const c0 = centroPilar(pc, secaoBase(b, pc)), [qx, qy] = paraTela(c0[0], c0[1]);
          ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(qx, qy); ctx.stroke(); ctx.setLineDash([]);
        }
        ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillStyle = cores.cota;
        const pts = contorno.map((q) => paraTela(q[0], q[1])), lx = Math.min(...pts.map((q) => q[0])) + 4, ly = Math.max(...pts.map((q) => q[1])) - 3;
        if (v.k > 18) ctx.fillText(`${el.nome}${erro ? ' ⚠' : avi ? ' !' : ''}  ${r.tipo === 'tubulao' ? `φ${fmt(r.dims.Db ?? 0)}` : `${fmt(r.dims.A ?? 0)}×${fmt(r.dims.B ?? 0)}`}${e > 1e-3 ? `  e ${fmt(e, 3)}` : ''}`, lx, ly);
      } else {
        const [px, py] = paraTela(cxm, cym);
        ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = cor;
        ctx.fillText(`${el.nome}${erro ? ' ⚠' : ''}`, px, py + 14);
      }
    }
    // pilares
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.font = '600 11px system-ui, sans-serif';
    for (const q of naPlanta) {
      const pts = q.contorno.map((c) => paraTela(c[0], c[1]));
      const path = new Path2D();
      pts.forEach((p, i) => (i ? path.lineTo(p[0], p[1]) : path.moveTo(p[0], p[1])));
      path.closePath();
      if (q.estado === 'inferior') {
        ctx.setLineDash([4, 3]); ctx.strokeStyle = cores.fantasma; ctx.lineWidth = 1; ctx.stroke(path); ctx.setLineDash([]);
        continue;
      }
      if (q.estado === 'chega') { ctx.fillStyle = cores.pilar; ctx.fill(path); }
      if (q.estado === 'nasce') { // hachura
        ctx.save(); ctx.clip(path); ctx.strokeStyle = cores.pilar; ctx.lineWidth = 1;
        const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
        ctx.beginPath(); for (let x = x0 - (y1 - y0); x < x1; x += 5) { ctx.moveTo(x, y1); ctx.lineTo(x + (y1 - y0), y0); } ctx.stroke(); ctx.restore();
      }
      const sel = pl.selecao.has(q.p.id), erro = comErro.has(q.p.id), avi = comAviso.has(q.p.id);
      ctx.strokeStyle = erro ? cores.erro : avi ? cores.aviso : sel ? cores.selecao : cores.pilarBorda; ctx.lineWidth = erro || avi ? 3 : sel ? 2.5 : 1.5;
      ctx.stroke(path);
      if (sel) { ctx.save(); ctx.globalAlpha = 0.25; ctx.lineWidth = 8; ctx.strokeStyle = cores.selecao; ctx.stroke(path); ctx.restore(); }
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      ctx.fillStyle = erro ? cores.erro : avi ? cores.aviso : cores.texto;
      const [px0, py0] = descRef(q.p.id);
      if (textosVis.includes('nomes')) ctx.fillText(q.p.nome + (erro ? ' ⚠' : avi ? ' !' : '') + (bloqueados.has(q.p.id) ? ' ▣' : ''), Math.max(...xs) + 4 + px0, Math.min(...ys) - 3 + py0);
    }
    // pilares-parede (E1b): um contorno por lado, hachurado se chega, tracejado se vem de baixo; lado em barra com traço mais fino
    for (const w of paredesPl) {
      const sel = pl.selecao.has(w.pp.id);
      for (const l of w.lados) {
        const pts = l.contorno.map((c) => paraTela(c[0], c[1])), path = new Path2D();
        pts.forEach((p, i) => (i ? path.lineTo(p[0], p[1]) : path.moveTo(p[0], p[1])));
        path.closePath();
        if (w.estado === 'inferior') { ctx.setLineDash([4, 3]); ctx.strokeStyle = cores.fantasma; ctx.lineWidth = 1; ctx.stroke(path); ctx.setLineDash([]); continue; }
        ctx.save(); ctx.globalAlpha = w.estado === 'nasce' ? 0.25 : 0.55; ctx.fillStyle = cores.parede; ctx.fill(path); ctx.restore();
        ctx.strokeStyle = sel ? cores.selecao : cores.pilarBorda; ctx.lineWidth = sel ? 2.5 : l.casca ? 1.8 : 1;
        if (w.estado === 'nasce') ctx.setLineDash([5, 3]);
        ctx.stroke(path); ctx.setLineDash([]);
      }
      if (w.estado !== 'inferior') {
        ctx.save(); ctx.setLineDash([4, 3]); ctx.strokeStyle = cores.pilarBorda; ctx.lineWidth = 2;
        for (const seg of w.aberturas) { const [p0, p1] = seg.map((c) => paraTela(c[0], c[1])); ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke(); }
        ctx.restore();
        const todos = w.lados.flatMap((l) => l.contorno.map((c) => paraTela(c[0], c[1])));
        ctx.fillStyle = cores.texto; ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(w.pp.nome, Math.max(...todos.map((p) => p[0])) + 4, Math.min(...todos.map((p) => p[1])) - 3);
      }
    }
    // seta curva (anel aberto) na ponta equilibrada da viga de fundação, sobre o pilar, com a abertura voltada para a viga
    ctx.lineWidth = 2;
    for (const { v: vf, g, eq } of vigasFund) {
      if (g.erro) continue;
      const cor = comErro.has(vf.id) ? cores.erro : pl.selecao.has(vf.id) ? cores.selecao : cores.cota;
      for (const ponta of ['ini', 'fim'] as const) {
        if (!eq[ponta]) continue;
        const C = paraTela(...(ponta === 'ini' ? g.a : g.z)), d = ponta === 'ini' ? g.u : [-g.u[0], -g.u[1]], al = Math.atan2(-d[1], d[0]), r = Math.max(14, 0.32 * v.k), g0 = 0.7;
        const fim = al + 2 * Math.PI - g0;
        ctx.strokeStyle = cor; ctx.fillStyle = cor;
        ctx.beginPath(); ctx.arc(C[0], C[1], r, al + g0, fim); ctx.stroke();
        const ex = C[0] + r * Math.cos(fim), ey = C[1] + r * Math.sin(fim), tg = fim + Math.PI / 2; // tangente no sentido do arco
        ctx.beginPath(); ctx.moveTo(ex + 6 * Math.cos(tg), ey + 6 * Math.sin(tg)); ctx.lineTo(ex + 4 * Math.cos(tg + 2.2), ey + 4 * Math.sin(tg + 2.2)); ctx.lineTo(ex + 4 * Math.cos(tg - 2.2), ey + 4 * Math.sin(tg - 2.2)); ctx.closePath(); ctx.fill();
      }
    }
    desenharCargas(ctx);
  };

  const desenharCargas = (ctx: CanvasRenderingContext2D) => {
    ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    for (const c of cargas) {
      const sel = pl.selecao.has(c.id), cor = sel ? cores.selecao : c.origem ? cores.parede : cores.carga;
      const pts = c.pontos.map((q) => paraTela(q[0], q[1]));
      const rot = !textosVis.includes('cargas') ? '' : `${String(+c.valor.toFixed(2)).replace('.', ',')} ${c.tipo === 'ponto' ? 'kN' : c.tipo === 'linha' ? 'kN/m' : 'kN/m²'} ${b.casos?.find((x) => x.id === c.caso)?.nome ?? c.caso}`;
      ctx.strokeStyle = cor; ctx.fillStyle = cor;
      if (c.tipo === 'ponto') {
        const [x, y] = pts[0];
        ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 5, 0, 2 * Math.PI); ctx.moveTo(x - 3.5, y - 3.5); ctx.lineTo(x + 3.5, y + 3.5); ctx.moveTo(x + 3.5, y - 3.5); ctx.lineTo(x - 3.5, y + 3.5); ctx.stroke();
        ctx.fillText(rot, x + 8, y - 4);
      } else if (c.tipo === 'linha') {
        ctx.globalAlpha = c.origem ? 0.55 : 0.8; ctx.lineWidth = c.origem ? 4 : 2.5; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(...q) : ctx.moveTo(...q))); ctx.stroke(); ctx.globalAlpha = 1;
        if (!c.origem || sel) { const m = Math.floor((pts.length - 1) / 2); ctx.fillText(rot, (pts[m][0] + pts[m + 1][0]) / 2 + 4, (pts[m][1] + pts[m + 1][1]) / 2 - 4); }
      } else {
        ctx.setLineDash([6, 3]); ctx.lineWidth = 1.5; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(...q) : ctx.moveTo(...q))); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
        ctx.globalAlpha = 0.08; ctx.fill(); ctx.globalAlpha = 1;
        const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
        ctx.fillText(rot, Math.min(...xs) + 4, Math.max(...ys) - 4);
      }
    }
    if (!nivelFund) marcasDeCorte(ctx);
  };

  const glifo = (ctx: CanvasRenderingContext2D, c: Captura) => {
    const [x, y] = paraTela(c.x, c.y), r = 6;
    ctx.strokeStyle = cores.captura; ctx.lineWidth = 2;
    ctx.beginPath();
    switch (c.tipo) {
      case 'extremidade': ctx.rect(x - r, y - r, 2 * r, 2 * r); break;
      case 'meio': ctx.moveTo(x, y - r); ctx.lineTo(x + r, y + r); ctx.lineTo(x - r, y + r); ctx.closePath(); break;
      case 'intersecao': ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); break;
      case 'centro': ctx.arc(x, y, r, 0, 2 * Math.PI); break;
      case 'quadrante': ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); break;
      case 'perpendicular': ctx.moveTo(x - r, y + r); ctx.lineTo(x + r, y + r); ctx.moveTo(x - r, y + r); ctx.lineTo(x - r, y - r); ctx.moveTo(x - r, y); ctx.lineTo(x, y); ctx.lineTo(x, y + r); break;
      case 'proximo': ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.lineTo(x + r, y + r); ctx.closePath(); break;
    }
    ctx.stroke();
    ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = cores.captura;
    ctx.fillText(c.tipo + (it.current.caps.length > 1 ? `  (Tab: ${it.current.ciclo % it.current.caps.length + 1}/${it.current.caps.length})` : ''), x + 10, y - 9);
  };

  const desenharInteracao = () => {
    const v = vista, ctx = prep(cvI.current);
    if (!v || !ctx) return;
    ctx.clearRect(0, 0, tam[0], tam[1]);
    const s = it.current, [px, py] = paraTela(...s.ponto);
    // janela de seleção
    if (s.janela) {
      const [ax, ay] = paraTela(...s.janela.a), [zx, zy] = paraTela(...s.janela.z), cruz = zx < ax;
      ctx.fillStyle = cruz ? cores.cruzamento : cores.janela; ctx.globalAlpha = 0.15; ctx.fillRect(ax, ay, zx - ax, zy - ay); ctx.globalAlpha = 1;
      ctx.strokeStyle = cruz ? cores.cruzamento : cores.janela; ctx.lineWidth = 1; ctx.setLineDash(cruz ? [5, 4] : []); ctx.strokeRect(ax, ay, zx - ax, zy - ay); ctx.setLineDash([]);
    }
    const ult = pontos.at(-1);
    if (ult && pl.ferramenta !== 'selecionar') {
      const [ux, uy] = paraTela(...ult);
      ctx.strokeStyle = cores.guia; ctx.lineWidth = 1; ctx.setLineDash(pl.ferramenta === 'eixo' ? [14, 4, 2, 4] : [6, 4]);
      ctx.beginPath(); ctx.moveTo(ux, uy); ctx.lineTo(px, py); ctx.stroke(); ctx.setLineDash([]);
      const d = Math.hypot(s.ponto[0] - ult[0], s.ponto[1] - ult[1]), ang = (Math.atan2(s.ponto[1] - ult[1], s.ponto[0] - ult[0]) * 180) / Math.PI;
      ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = cores.cota;
      ctx.fillText(`${fmt(d)} m  ${fmt(((ang % 360) + 360) % 360, 1)}°`, (ux + px) / 2 + 8, (uy + py) / 2 - 8);
      for (const p of pontos) { const [qx, qy] = paraTela(...p); ctx.fillStyle = cores.guia; ctx.fillRect(qx - 3, qy - 3, 6, 6); }
    }
    if (s.guia && ult) { // linha-guia do polar/ortogonal
      const [ux, uy] = paraTela(...ult), L = Math.hypot(px - ux, py - uy) || 1;
      ctx.strokeStyle = cores.guia; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(ux, uy); ctx.lineTo(ux + ((px - ux) / L) * 3000, uy + ((py - uy) / L) * 3000); ctx.stroke(); ctx.setLineDash([]);
    }
    // pano sob o cursor (ferramenta laje)
    if (pl.ferramenta === 'laje' && !pontos.length) {
      const pano = panos.find((q) => dentroPoligono(s.cursor, q));
      if (pano) { ctx.beginPath(); pano.forEach((q, i) => { const [x, y] = paraTela(q[0], q[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath(); ctx.globalAlpha = 0.3; ctx.fillStyle = cores.laje; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = cores.laje; ctx.lineWidth = 2; ctx.stroke(); }
    }
    if ((pl.ferramenta === 'laje' || (pl.ferramenta === 'carga' && pl.tipoCarga === 'area')) && pontos.length >= 2) {
      const [ax, ay] = paraTela(...pontos[0]);
      ctx.strokeStyle = pl.ferramenta === 'laje' ? cores.laje : cores.carga; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ax, ay); ctx.stroke(); ctx.setLineDash([]);
    }
    // L5: laje sob o cursor (escolha do pano nas ferramentas de abertura, carga, direção e inserção)
    if (['aberturaRet', 'cargaLaje', 'direcaoPano', 'insercaoPano'].includes(pl.ferramenta) && !pontos.length && !s.pan) {
      const lj = lajes.find((x) => dentroPoligono(s.cursor, x.l.contorno as P2[]))?.l;
      if (lj) { ctx.beginPath(); lj.contorno.forEach((q, i) => { const [x, y] = paraTela(q[0], q[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath(); ctx.globalAlpha = 0.3; ctx.fillStyle = cores.aviso; ctx.fill(); ctx.globalAlpha = 1; }
    }
    // L5: janela de captura das cargas ao longo das vigas
    if (pl.ferramenta === 'cargaViga' && pontos.length === 1 && !s.pan) {
      const [ax, ay] = paraTela(...pontos[0]);
      ctx.strokeStyle = cores.janela; ctx.lineWidth = 1; ctx.setLineDash([5, 4]); ctx.strokeRect(ax, ay, px - ax, py - ay); ctx.setLineDash([]);
    }
    // L5: prévia do contorno retangular e da abertura retangular
    if ((pl.ferramenta === 'contornoRet' || pl.ferramenta === 'aberturaRet') && pontos.length && !s.pan) {
      const alvo = [...(pl.ferramenta === 'aberturaRet' ? pontos.slice(1) : pontos), s.ponto];
      let ret: P2[] | null = null;
      if (pl.ferramenta === 'contornoRet') ret = alvo.length === 2 ? retanguloPorLado(alvo[0], alvo[1]) : alvo.length === 3 ? retanguloPorLado(alvo[0], alvo[1], alvo[2]) : null;
      else if (alvo.length >= 2) {
        const lj = lajes.find((x) => x.l.id === it.current.lajeAb)?.l, vp = pl.l5.vigaRef ? vigas.find((x) => x.v.id === pl.l5.vigaRef)?.v.pontos as P2[] | undefined : undefined;
        const nerv = lj && !lj.definir && lj.tipo.tipo === 'trelicada' ? lj.direcao ?? direcaoMenorVao(lj.contorno as P2[]) : null;
        ret = retanguloDaAbertura(pl.l5.modoAbertura, alvo[0], alvo[1], alvo[2], vp, nerv);
      }
      if (ret) {
        ctx.strokeStyle = pl.ferramenta === 'contornoRet' ? cores.viga : cores.laje; ctx.lineWidth = 2; ctx.setLineDash([8, 4]); ctx.beginPath();
        ret.forEach((q, i) => { const [x, y] = paraTela(q[0], q[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    // prolongar por comprimento fixo (L5, C6.53): prévia da nova ponta da viga sob o cursor
    if (pl.ferramenta === 'prolongar' && pl.l5.comprimento && !pontos.length && !s.pan) {
      const v = vigaSob(s.cursor, 12);
      if (v) {
        const a0 = v.pontos[0], z0 = v.pontos[v.pontos.length - 1], ini = Math.hypot(s.cursor[0] - a0[0], s.cursor[1] - a0[1]) <= Math.hypot(s.cursor[0] - z0[0], s.cursor[1] - z0[1]);
        const [a, z] = ini ? [v.pontos[1], a0] : [v.pontos[v.pontos.length - 2], z0], q = pontaProlongada(a as P2, z as P2, pl.l5.comprimento);
        if (q) {
          const [x0, y0] = paraTela(z[0], z[1]), [x1, y1] = paraTela(q[0], q[1]);
          ctx.strokeStyle = cores.viga; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]);
          ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = cores.cota; ctx.fillText(`${fmt(pl.l5.comprimento, 2)} m`, x1 + 8, y1 - 8);
        }
      }
    }
    // prévia da viga
    if (pl.ferramenta === 'viga' && pontos.length && !s.pan) {
      // viga curva (E2b): trechos curvos já lançados e o em andamento (passagem marcada) como arcos pela mesma discretização da viga
      const ctl = [...pontos, s.ponto], pass = Array.from({ length: ctl.length - 1 }, (_, i) => (i < pontos.length - 1 ? pl.passagensViga[i] ?? null : pl.passagemViga));
      const arco = pass.some((q) => q) ? montarPoligonal(ctl, pass, b.opcoes?.curvaSegmento ? b.opcoes.curvaSegmento / 100 : undefined) : null;
      const g = geometriaViga({ pontos: arco && !('degenerado' in arco) ? arco.pontos : ctl, secao: pl.secaoViga, alinhamento: pl.alinhamento });
      if (pl.passagemViga) { const [qx, qy] = paraTela(...pl.passagemViga); ctx.strokeStyle = cores.viga; ctx.beginPath(); ctx.arc(qx, qy, 4, 0, 2 * Math.PI); ctx.stroke(); }
      ctx.strokeStyle = cores.viga; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.5; ctx.setLineDash([5, 3]);
      for (const lado of [g.esq, g.dir]) { ctx.beginPath(); lado.forEach((q, i) => { const [x, y] = paraTela(q[0], q[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); }
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    // vários pilares escolhidos (ferramenta Fundação em modo de associada/bloco): contornos, ligação entre os centros e contagem
    if (pl.ferramenta === 'fundacao' && pl.multiFund && nivelFund && !s.pan) {
      const esc = naPlanta.filter((q) => pl.pilaresFund.includes(q.p.id));
      ctx.strokeStyle = cores.captura; ctx.fillStyle = cores.captura; ctx.lineWidth = 2;
      for (const q of esc) {
        const cs = q.contorno.map((c) => paraTela(c[0], c[1]));
        ctx.beginPath(); cs.forEach((c, i) => (i ? ctx.lineTo(...c) : ctx.moveTo(...c))); ctx.closePath();
        ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
      }
      if (esc.length) {
        const cen = esc.map((q) => paraTela(...centroPilar(q.p, secaoBase(b, q.p))));
        ctx.setLineDash([6, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); cen.forEach((c, i) => (i ? ctx.lineTo(...c) : ctx.moveTo(...c))); ctx.stroke(); ctx.setLineDash([]);
        ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.fillText(`${esc.length} pilar${esc.length === 1 ? '' : 'es'} escolhido${esc.length === 1 ? '' : 's'}${esc.length >= 2 ? ' — Enter cria' : ' — escolha ao menos mais um'}`, cen[0][0] + 10, cen[0][1] - 14);
      }
    }
    // corte e linha de seção em desenho: vértices dados e o trecho até o cursor
    if ((pl.ferramenta === 'corte' || pl.ferramenta === 'secao') && pontos.length && !s.pan) {
      const tela = [...pontos, s.ponto].map((q) => paraTela(q[0], q[1]));
      ctx.strokeStyle = cores.janela; ctx.lineWidth = 2; ctx.setLineDash([16, 5, 3, 5]);
      ctx.beginPath(); tela.forEach((c, i) => (i ? ctx.lineTo(...c) : ctx.moveTo(...c))); ctx.stroke(); ctx.setLineDash([]);
    }
    // limite em desenho: vértices já dados e o trecho até o cursor (fecha ao primeiro vértice se for fechado)
    if (pl.ferramenta === 'limite' && nivelFund && pontos.length && !s.pan) {
      const tela = [...pontos, s.ponto].map((q) => paraTela(q[0], q[1]));
      ctx.strokeStyle = cores.limite; ctx.lineWidth = 2.5; ctx.setLineDash([12, 5]);
      ctx.beginPath(); tela.forEach((c, i) => (i ? ctx.lineTo(...c) : ctx.moveTo(...c))); if (pl.limiteFechado && tela.length >= 3) ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
    }
    // radier, viga sobre base elástica e sapata corrida em desenho: vértices dados e o trecho até o cursor (o radier fecha)
    if ((pl.ferramenta === 'radier' || pl.ferramenta === 'vigaElastica' || pl.ferramenta === 'corrida') && nivelFund && pontos.length && !s.pan) {
      const tela = [...pontos, s.ponto].map((q) => paraTela(q[0], q[1]));
      ctx.strokeStyle = pl.ferramenta === 'radier' || pl.ferramenta === 'corrida' ? cores.laje : cores.viga; ctx.lineWidth = 2.5; ctx.setLineDash([10, 4]);
      ctx.beginPath(); tela.forEach((c, i) => (i ? ctx.lineTo(...c) : ctx.moveTo(...c))); if (pl.ferramenta === 'radier' && tela.length >= 3) ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
    }
    // ponto de inserção: do centro atual do elemento ao cursor
    if (pl.ferramenta === 'insFund' && nivelFund && !s.pan) {
      const alvo = s.insEl ? fund.find((x) => x.el.id === s.insEl) : [...fund].reverse().find((x) => dentro(s.cursor, x.contorno));
      if (alvo) {
        const cs = alvo.contorno.map((q) => paraTela(q[0], q[1]));
        ctx.beginPath(); cs.forEach((q, i) => (i ? ctx.lineTo(...q) : ctx.moveTo(...q))); ctx.closePath();
        ctx.globalAlpha = 0.3; ctx.fillStyle = cores.captura; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = cores.captura; ctx.lineWidth = 2; ctx.stroke();
        if (s.insEl) {
          const c0 = alvo.r?.centro ?? [alvo.el.x, alvo.el.y], [qx, qy] = paraTela(c0[0], c0[1]);
          ctx.strokeStyle = cores.guia; ctx.lineWidth = 1; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(px, py); ctx.stroke(); ctx.setLineDash([]);
          ctx.strokeStyle = cores.captura; ctx.strokeRect(px - 8, py - 8, 16, 16);
        }
        ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillStyle = cores.captura;
        ctx.fillText(s.insEl ? `${alvo.el.nome}: novo centro` : `${alvo.el.nome}: clique para mover o ponto de inserção`, px + 12, py - 12);
      }
    }
    // prévia da fundação: pilar sob o cursor, face da divisa ou canto, e a linha ao centro (posição livre)
    if (pl.ferramenta === 'fundacao' && nivelFund && !s.pan) {
      const alvo = s.fundPilar ? naPlanta.find((q) => q.p.id === s.fundPilar) : pilarSob(s.cursor);
      if (alvo) {
        const cs = alvo.contorno.map((q) => paraTela(q[0], q[1]));
        ctx.beginPath(); cs.forEach((q, i) => (i ? ctx.lineTo(...q) : ctx.moveTo(...q))); ctx.closePath();
        ctx.globalAlpha = 0.3; ctx.fillStyle = cores.captura; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = cores.captura; ctx.lineWidth = 2; ctx.stroke();
        const tem = (b.fundacao?.elementos ?? []).some((e) => e.pilares.includes(alvo.p.id));
        const posEf = pl.multiFund || pl.tipoFund === 'tubulao' ? 'centrada' : pl.posFund === 'auto' ? (s.fundPilar ? 'livre' : posicaoPeloClique(b, alvo.p, s.cursor)) : pl.posFund;
        let txt = pl.multiFund ? `${alvo.p.nome}: clique para ${pl.pilaresFund.includes(alvo.p.id) ? 'desmarcar' : 'marcar'}` : tem ? `${alvo.p.nome} já tem elemento` : `${TIPO_FUNDACAO_LABEL[pl.tipoFund]} · ${POSICAO_LABEL[posEf]}`;
        if (!tem && !pl.multiFund && (posEf === 'divisa' || posEf === 'canto') && alvo.contorno.length === 4) {
          const [lx, ly] = ladoPeloClique(b, alvo.p, s.cursor, posEf), c = alvo.contorno;
          // vértices do contorno retangular: 0 (−,−), 1 (+,−), 2 (+,+), 3 (−,+) nos eixos do pilar
          const face = (i: number, j: number) => { const [a, z] = [paraTela(...c[i]), paraTela(...c[j])]; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...z); ctx.stroke(); };
          ctx.strokeStyle = cores.cruzamento; ctx.lineWidth = 5;
          if (lx === -1) face(0, 3); if (lx === 1) face(1, 2); if (ly === -1) face(0, 1); if (ly === 1) face(3, 2);
          txt += ` (${lx ? (lx < 0 ? '−x' : '+x') : ''}${lx && ly ? ' ' : ''}${ly ? (ly < 0 ? '−y' : '+y') : ''})`;
        }
        ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillStyle = cores.captura;
        ctx.fillText(txt, px + 12, py - 12);
        if (s.fundPilar) { // posição livre: do centro do pilar ao cursor
          const c0 = centroPilar(alvo.p, secaoBase(b, alvo.p)), [qx, qy] = paraTela(c0[0], c0[1]);
          ctx.strokeStyle = cores.guia; ctx.lineWidth = 1; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(px, py); ctx.stroke(); ctx.setLineDash([]);
          ctx.strokeStyle = cores.captura; ctx.strokeRect(px - 8, py - 8, 16, 16);
        }
      }
    }
    // prévia da viga de fundação: elemento (ou pilar) sob o cursor e a linha desde o primeiro
    if (pl.ferramenta === 'vigaFund' && nivelFund && !s.pan) {
      const alvo = pontaSob(s.cursor);
      if (alvo) {
        const cs = alvo.contorno.map((q) => paraTela(q[0], q[1]));
        ctx.beginPath(); cs.forEach((q, i) => (i ? ctx.lineTo(...q) : ctx.moveTo(...q))); ctx.closePath();
        ctx.globalAlpha = 0.3; ctx.fillStyle = cores.captura; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = cores.captura; ctx.lineWidth = 2; ctx.stroke();
        ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillStyle = cores.captura;
        ctx.fillText(alvo.nome, px + 12, py - 12);
      }
      const ini = s.vfIni ? pontaPorId(s.vfIni) : null;
      if (ini && pontos.length) { const [ix, iy] = paraTela(...ini.centro); ctx.strokeStyle = cores.guia; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(alvo ? paraTela(...alvo.centro)[0] : px, alvo ? paraTela(...alvo.centro)[1] : py); ctx.stroke(); ctx.setLineDash([]); }
    }
    // pilar de baixo que admite outro por cima: realçado sob o cursor, com um círculo de referência no eixo (E1a)
    if (pl.ferramenta === 'pilar' && s.baixo) {
      const q = naPlanta.find((x) => x.p.id === s.baixo);
      if (q) {
        const c = q.contorno.map((v) => paraTela(v[0], v[1])), ce = centroNoLance(q.p, pav?.id ?? ''), [cx, cy] = paraTela(ce[0], ce[1]);
        ctx.beginPath(); c.forEach((v, i) => (i ? ctx.lineTo(...v) : ctx.moveTo(...v))); ctx.closePath();
        ctx.globalAlpha = 0.35; ctx.fillStyle = cores.captura; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = cores.captura; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, 9, 0, 2 * Math.PI); ctx.stroke();
      }
    }
    // prévia do pilar
    if (pl.ferramenta === 'pilar' && !s.pan) {
      const c = contornoPilar({ x: s.ponto[0], y: s.ponto[1], angulo: pl.angulo, ajuste: pl.ajuste }, pl.secao).map((q) => paraTela(q[0], q[1]));
      ctx.beginPath(); c.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.closePath();
      ctx.globalAlpha = 0.45; ctx.fillStyle = cores.pilar; ctx.fill(); ctx.globalAlpha = 1; ctx.setLineDash([4, 3]); ctx.strokeStyle = cores.pilar; ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = cores.captura; ctx.fillRect(px - 2.5, py - 2.5, 5, 5);
    }
    // prévia do pilar-parede (E1b): contorno de cada lado do tipo escolhido no ponto
    if (pl.ferramenta === 'pilarParede' && pl.ppTipo && !s.pan) {
      const fant = { id: '?', nome: '?', tipo: pl.ppTipo, x: s.ponto[0], y: s.ponto[1], angulo: pl.ppAngulo, nasce: 'fundacao', morre: pavimentosOrdenados(b).at(-1)?.id ?? '' };
      const lance = pav?.id ?? '';
      for (const g of ladosDoPP(b, fant)) {
        const c = contornoDoLado(g, lance).map((q) => paraTela(q[0], q[1]));
        ctx.beginPath(); c.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.closePath();
        ctx.globalAlpha = 0.45; ctx.fillStyle = cores.parede; ctx.fill(); ctx.globalAlpha = 1; ctx.setLineDash([4, 3]); ctx.strokeStyle = cores.pilar; ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.fillStyle = cores.captura; ctx.fillRect(px - 2.5, py - 2.5, 5, 5);
    }
    // mira
    const [mx, my] = paraTela(...s.cursor);
    ctx.strokeStyle = cores.texto; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(mx - 14, my); ctx.lineTo(mx + 14, my); ctx.moveTo(mx, my - 14); ctx.lineTo(mx, my + 14); ctx.stroke();
    ctx.strokeRect(mx - 4, my - 4, 8, 8);
    if (s.cap) glifo(ctx, s.cap);
  };

  const ultimoZoom = useRef(0);
  const registrarQuadro = (ms: number) => {
    const q = it.current.quadros;
    q.push(ms); if (q.length > 60) q.shift();
    if (wrap.current) { wrap.current.dataset.frameMs = (q.reduce((a, z) => a + z, 0) / q.length).toFixed(2); wrap.current.dataset.segmentos = String(desenhoMascara.segs.length / 4); if (vista) wrap.current.dataset.vista = JSON.stringify(vista); }
  };

  // re-desenho quando dados, vista, tema ou tamanho mudam
  const vistaAnt = useRef<Vista | null>(null);
  useEffect(() => {
    const t0 = performance.now();
    const soVista = vistaAnt.current && vista && it.current.vistaCache && (vistaAnt.current.k !== vista.k || vistaAnt.current.ox !== vista.ox || vistaAnt.current.oy !== vista.oy);
    desenharMascara(!!soVista && (!!it.current.pan || performance.now() - ultimoZoom.current < 140));
    vistaAnt.current = vista;
    desenharModelo();
    desenharInteracao();
    registrarQuadro(performance.now() - t0);
  });

  // ---- pontos: captura, ortogonal/polar ----
  const capturar = (sx: number, sy: number) => {
    const s = it.current, w = paraMundo(sx, sy), r = RAIO_PX / vista!.k, ref = pontos.at(-1);
    const t0 = performance.now();
    const caps = ordenar([...idxModelo.consultar(w[0], w[1], r, pl.capturas, ref), ...idxMascara.consultar(w[0], w[1], r, pl.capturas, ref)], r);
    if (wrap.current) wrap.current.dataset.snapMs = (performance.now() - t0).toFixed(3);
    const mudou = caps.length !== s.caps.length || caps.some((c, i) => c.tipo !== s.caps[i]?.tipo || c.x !== s.caps[i]?.x || c.y !== s.caps[i]?.y);
    if (mudou) s.ciclo = 0;
    s.caps = caps; s.cursor = w; s.tela = [sx, sy];
    s.cap = caps.length ? caps[s.ciclo % caps.length] : null;
    s.guia = false;
    s.baixo = pl.ferramenta === 'pilar' ? (baixoSob(w)?.p.id ?? (s.cap ? baixoSob([s.cap.x, s.cap.y])?.p.id : null) ?? null) : null;
    if (s.cap) s.ponto = [s.cap.x, s.cap.y];
    else if (ref && (pl.orto || pl.polar)) {
      const passo = pl.orto ? 90 : 15;
      const q = restringir(ref, w, passo);
      const desvio = Math.hypot(q[0] - w[0], q[1] - w[1]) * vista!.k;
      if (pl.orto || desvio < 10) { s.ponto = q; s.guia = true; } else s.ponto = w;
    } else s.ponto = w;
    const qb = s.baixo ? naPlanta.find((x) => x.p.id === s.baixo) : null;
    if (statusRef.current) statusRef.current.textContent = `x ${fmt(s.ponto[0])}  y ${fmt(s.ponto[1])} m${s.cap ? ` · ${s.cap.tipo}` : s.guia ? ' · alinhado' : ''}${qb ? ` · sobre ${qb.p.nome}: Δx ${fmt(s.ponto[0] - refBaixo(qb.p).x)}  Δy ${fmt(s.ponto[1] - refBaixo(qb.p).y)} m` : ''}`;
  };

  /** Pilar do nível de fundação sob o ponto (dentro do contorno ou a até 8 px dele). */
  const pilarSob = (w: P2) => {
    const tol = 8 / (vista?.k || 1);
    return naPlanta.find((q) => dentro(w, q.contorno) || q.contorno.some((c, i) => distSeg(w, c, q.contorno[(i + 1) % q.contorno.length]) < tol));
  };

  /** Ponto fixo do pilar de baixo no pavimento (geometria própria do lance): referência das coordenadas relativas. */
  const refBaixo = (q: Pilar) => geoLance(q, pav?.id ?? '').p;
  /** Pilar de baixo que admite outro por cima (termina neste pavimento, antes do último) sob o ponto (E1a). */
  const baixoSob = (w: P2) => {
    if (nivelFund || !pav || pav.id === pavs.at(-1)?.id) return null;
    return naPlanta.find((q) => q.estado === 'morre' && q.p.morre === pav.id && !ehArranque(q.p) && dentro(w, q.contorno)) ?? null;
  };

  /** Viga do grupo sob o ponto (dentro do contorno ou a até `px` pixels do eixo). */
  const vigaSob = (w: P2, px = 6) => {
    const tol = px / (vista?.k || 1);
    for (const { v, t, g } of [...vigas].reverse()) if (t.some((r) => dentro(w, r)) || g.eixo.some((q, i) => i > 0 && distSeg(w, g.eixo[i - 1], q) < tol)) return v;
    return null;
  };

  /** Ponta de viga de fundação sob o ponto: o pilar (com o elemento dele, se houver) ou o elemento. id = elemento ou pilar. */
  const pontaSob = (w: P2) => {
    const els = b.fundacao?.elementos ?? [];
    const q = pilarSob(w);
    if (q) { const el = els.find((e) => e.pilares.includes(q.p.id)); return { id: el?.id ?? q.p.id, nome: el?.nome ?? q.p.nome, contorno: q.contorno, centro: centroPilar(q.p, secaoBase(b, q.p)) as P2 }; }
    const f = [...fund].reverse().find((x) => dentro(w, x.contorno));
    const pil = f && naPlanta.find((x) => x.p.id === f.el.pilares[0]);
    return f && pil ? { id: f.el.id, nome: f.el.nome, contorno: f.contorno, centro: centroPilar(pil.p, secaoBase(b, pil.p)) as P2 } : null;
  };
  const pontaPorId = (id: string) => {
    const el = b.fundacao?.elementos.find((e) => e.id === id);
    const pil = naPlanta.find((x) => x.p.id === (el ? el.pilares[0] : id));
    return pil ? { id, nome: el?.nome ?? pil.p.nome, centro: centroPilar(pil.p, secaoBase(b, pil.p)) as P2 } : null;
  };

  // ---- ações das ferramentas ----
  const selecionados = () => ({ corridas: corridasP.filter((x) => pl.selecao.has(x.c.id)).map((x) => x.c.id), radiers: radiers.filter((r) => pl.selecao.has(r.id)).map((r) => r.id), vigasEl: vigasEl.filter((x) => pl.selecao.has(x.v.id)).map((x) => x.v.id), limites: limites.filter((l) => pl.selecao.has(l.id)).map((l) => l.id), vigasFund: vigasFund.filter((x) => pl.selecao.has(x.v.id)).map((x) => x.v.id), fundacoes: fund.filter((f) => pl.selecao.has(f.el.id)).map((f) => f.el.id), pilares: b.pilares.filter((p) => pl.selecao.has(p.id)).map((p) => p.id), eixos: b.eixos.filter((e) => pl.selecao.has(e.id)).map((e) => e.id), vigas: vigas.filter(({ v }) => pl.selecao.has(v.id)).map(({ v }) => v.id), lajes: lajes.filter(({ l }) => pl.selecao.has(l.id)).map(({ l }) => l.id), cargas: cargas.filter((c) => pl.selecao.has(c.id)).map((c) => c.id) });
  const agir = (p: P2) => {
    const f = pl.ferramenta;
    const novos = [...pontosRef.current, p];
    if (f === 'pilar') {
      // sobre um pilar de baixo que admite outro por cima: coordenadas relativas ao ponto fixo dele (nasce no pavimento em que ele morre)
      const q = !pl.arranque ? baixoSob(p) ?? (it.current.baixo ? naPlanta.find((x) => x.p.id === it.current.baixo) ?? null : null) : null;
      if (q) { exec('pilar.inserir', { sobre: { pilar: q.p.id, dx: +(p[0] - refBaixo(q.p).x).toFixed(4), dy: +(p[1] - refBaixo(q.p).y).toFixed(4) }, secao: pl.secao, ajuste: pl.ajuste, angulo: pl.angulo }); return; }
      exec('pilar.inserir', { x: +p[0].toFixed(4), y: +p[1].toFixed(4), secao: pl.secao, ajuste: pl.ajuste, angulo: pl.angulo, ...(pl.arranque ? { nasce: 'fundacao', morre: 'fundacao' } : {}) });
      return;
    }
    if (f === 'selecionar') return;
    if (f === 'vigaGabarito') {
      // L2 (C6.63): clique na linha, arco ou polilinha do gabarito; no modo face, o 2º clique diz o lado do corpo da viga
      if (nivelFund) { msg('A viga pelo gabarito é lançada nas plantas dos pavimentos.'); return; }
      const c = it.current.cursor, r4 = (q: P2) => [+q[0].toFixed(4), +q[1].toFixed(4)], raio = 12 / (vista?.k || 1);
      if (pl.modoVigaGab === 'eixo') { exec('viga.daMascara', { grupo, ponto: r4(c), modo: 'eixo', secao: pl.secaoViga, raio }); return; }
      if (!pontosRef.current.length) {
        if (!vigasDoClique({ mascaras }, grupo, c, c, 'face', raio).length) { msg('Nenhuma linha, arco ou polilinha do gabarito perto do clique.'); return; }
        setPontos([c]); return;
      }
      const a = pontosRef.current[0];
      setPontos([]);
      exec('viga.daMascara', { grupo, ponto: r4(a), cursor: r4(c), modo: 'face', secao: pl.secaoViga, raio });
      return;
    }
    if (f === 'pilarParede') {
      if (!pl.ppTipo) { msg('Escolha o tipo no grupo Pilares-parede (Lançar na planta).'); return; }
      exec('pilarParede.inserir', { ...(pl.ppParams ?? {}), tipo: pl.ppTipo, angulo: pl.ppAngulo, x: +p[0].toFixed(4), y: +p[1].toFixed(4) });
      return;
    }
    if (f === 'puncao') {
      if (nivelFund) { msg('A armadura de punção é lançada nas plantas dos pavimentos.'); return; }
      const q = pilarSob(it.current.cursor);
      if (!q) { msg('Clique dentro de um pilar.'); return; }
      const r = dimPuncao?.find((x) => x.pilar === q.p.id && x.pavimentoId === pav?.id);
      if (!r) { msg(`${q.p.nome} não tem verificação de punção neste pavimento (calcule o dimensionamento; só pilares que apoiam a laje maciça sem viga e vigas chatas largas).`); return; }
      const g = pl.puncaoGrupo;
      void executarERecalcular('laje.puncao', pl.puncaoModo === 'apagar' ? { id: r.laje, pilares: [q.p.id] } : { id: r.laje, adicionar: [{ pilar: q.p.id, linhas: g.linhas, barras: g.barras, phi: g.phi, s: g.s }] });
      return;
    }
    if (f === 'vigaFund') {
      if (!nivelFund) { msg('Abra o nível “Fundação” no seletor de pavimento para lançar vigas de fundação.'); return; }
      const q = pontaSob(it.current.cursor);
      if (!q) { msg('Clique num elemento de fundação ou num pilar que nasce na fundação.'); return; }
      if (!pontos.length) { it.current.vfIni = q.id; setPontos([q.centro]); return; }
      const ini = it.current.vfIni;
      it.current.vfIni = null; setPontos([]);
      if (!ini) return;
      const r = exec('vigaFundacao.criar', { tipo: pl.tipoVigaFund, ini, fim: q.id, b: pl.secaoVigaFund.b, h: pl.secaoVigaFund.h });
      if (r.ok) usePlanta.getState().set({ selecao: new Set() });
      return;
    }
    if (f === 'girarFund') {
      const ids = selecionados().fundacoes;
      if (!ids.length) { msg('Selecione antes os elementos de fundação a girar (ferramenta Selecionar).'); usePlanta.getState().set({ ferramenta: 'selecionar' }); return; }
      if (novos.length < 2) { setPontos(novos); return; }
      setPontos([]);
      const r = exec('fundacao.girar', { ids, pontos: [[+novos[0][0].toFixed(4), +novos[0][1].toFixed(4)], [+novos[1][0].toFixed(4), +novos[1][1].toFixed(4)]] });
      if (r.ok) usePlanta.getState().set({ ferramenta: 'selecionar' });
      return;
    }
    if (f === 'limite') { setPontos(novos); return; }
    if (f === 'radier' || f === 'vigaElastica' || f === 'corrida') {
      if (!nivelFund) { msg('Abra o nível “Fundação” no seletor de pavimento para lançar radier, vigas sobre base elástica e sapatas corridas.'); return; }
      setPontos(novos); return;
    }
    if (f === 'limiteMascara') {
      if (!nivelFund) { msg('Abra o nível “Fundação” no seletor de pavimento para capturar limites.'); return; }
      const w = it.current.cursor, c = cadeiaDeSegmentos(desenhoMascara.segs, w, 10 / (vista?.k || 1), 1e-3);
      if (!c || c.pontos.length < 2) { msg('Nenhuma linha da máscara DXF perto do clique (importe a máscara no grupo Máscara).'); return; }
      const fechado = c.fechada || pl.limiteFechado;
      exec('limite.criar', { pontos: c.pontos.map((q) => [+q[0].toFixed(4), +q[1].toFixed(4)]), ...(fechado && c.pontos.length >= 3 ? { fechado: true } : {}) });
      return;
    }
    if (f === 'insFund') {
      if (!nivelFund) { msg('Abra o nível “Fundação” no seletor de pavimento para mover o ponto de inserção.'); return; }
      if (!it.current.insEl) {
        const alvo = [...fund].reverse().find((x) => dentro(it.current.cursor, x.contorno));
        if (!alvo) { msg('Clique dentro de um elemento de fundação.'); return; }
        it.current.insEl = alvo.el.id; usePlanta.getState().set({ selecao: new Set([alvo.el.id]) }); setPontos([(alvo.r?.centro as P2 | undefined) ?? [alvo.el.x, alvo.el.y]]);
        return;
      }
      const id = it.current.insEl;
      it.current.insEl = null; setPontos([]);
      const r = exec('fundacao.editar', { id, posicao: 'livre', x: +p[0].toFixed(4), y: +p[1].toFixed(4) });
      if (r.ok) usePlanta.getState().set({ ferramenta: 'selecionar' });
      return;
    }
    if (f === 'fundacao' && pl.multiFund) {
      if (!nivelFund) { msg('Abra o nível “Fundação” no seletor de pavimento para lançar elementos.'); return; }
      const q = pilarSob(it.current.cursor);
      if (!q) { msg('Clique dentro de um pilar que nasce na fundação.'); return; }
      const ja = pl.pilaresFund.includes(q.p.id);
      usePlanta.getState().set({ pilaresFund: ja ? pl.pilaresFund.filter((x) => x !== q.p.id) : [...pl.pilaresFund, q.p.id] });
      return;
    }
    if (f === 'fundacao') {
      const t = b.fundacao?.terreno, estaca = pl.tipoFund === 'bloco' ? (pl.estacaFund && t?.estacas.some((e) => e.id === pl.estacaFund) ? pl.estacaFund : t?.estacas[0]?.id) : undefined;
      if (!nivelFund) { msg('Abra o nível “Fundação” no seletor de pavimento para lançar elementos.'); return; }
      if (pl.tipoFund === 'bloco' && !estaca) { msg('Bloco sobre estacas: cadastre um tipo de estaca no grupo Fundação.'); return; }
      const w = it.current.cursor, q = it.current.fundPilar && pontos.length ? naPlanta.find((x) => x.p.id === it.current.fundPilar) : pilarSob(w);
      if (!q) { msg('Clique dentro de um pilar que nasce na fundação.'); return; }
      const pos = pl.tipoFund === 'tubulao' ? 'centrada' : pl.posFund === 'auto' ? posicaoPeloClique(b, q.p, w) : pl.posFund;
      const base = { pilar: q.p.id, tipo: pl.tipoFund, posicao: pos, ...(estaca ? { estaca: { id: estaca } } : {}) };
      if (pos === 'livre') {
        if (!pontos.length) { it.current.fundPilar = q.p.id; setPontos([centroPilar(q.p, secaoBase(b, q.p))]); return; }
        it.current.fundPilar = null; setPontos([]);
        exec('fundacao.criar', { ...base, x: +p[0].toFixed(4), y: +p[1].toFixed(4) });
        return;
      }
      const lado = pos === 'divisa' || pos === 'canto' ? ladoPeloClique(b, q.p, w, pos) : undefined;
      const r = exec('fundacao.criar', { ...base, ...(lado ? { lado } : {}) });
      if (r.ok) usePlanta.getState().set({ selecao: new Set() });
      return;
    }
    if (f === 'moverRef') {
      if (nivelFund || !pav) { msg('Abra um pavimento para mover textos de referência.'); return; }
      if (!it.current.refEl) {
        const a = ancoraMaisProxima(ancorasRef(b, pav.id), it.current.cursor, 40 / (vista?.k || 1));
        if (!a) { msg('Clique perto do texto de referência de um pilar, viga ou laje.'); return; }
        it.current.refEl = a.id; it.current.refDe = a.ponto; usePlanta.getState().set({ selecao: new Set([a.id]) }); setPontos([a.ponto]); return;
      }
      const id = it.current.refEl, de = it.current.refDe;
      it.current.refEl = null; setPontos([]);
      exec('ref.mover', { id, ...deslocamentoPorCliques(b, id, de, [p[0], p[1]]) });
      return;
    }
    if (f === 'contaGotas') {
      const P = usePlanta.getState(), q = pilarSob(it.current.cursor);
      if (q || !P.contaGotas.pilar) {
        if (!q) { msg('Clique num pilar para pegar os dados dele.'); return; }
        P.set({ contaGotas: { ...P.contaGotas, pilar: q.p.id }, selecao: new Set([q.p.id]) });
        msg(`Dados de ${q.p.nome} pegos: clique onde inserir um pilar novo (ou noutro pilar para trocar).`); return;
      }
      exec('pilar.inserir', { x: +p[0].toFixed(4), y: +p[1].toFixed(4), copiarDe: P.contaGotas.pilar, incluirCargas: P.contaGotas.cargas });
      return;
    }
    if (f === 'contornoRet') {
      // L5 (C6.51): dois cliques + Enter = cantos opostos (ângulo zero); três cliques = um lado e um ponto do lado oposto
      if (nivelFund || !pav) { msg('O contorno de vigas é lançado nas plantas dos pavimentos.'); return; }
      if (novos.length < 3) { setPontos(novos); msg(novos.length === 1 ? 'Segundo ponto do contorno.' : 'Enter cria o contorno de ângulo zero; um clique no lado oposto cria o de qualquer ângulo.'); return; }
      setPontos([]);
      const [c1, c2, c3] = novos.map((q) => [+q[0].toFixed(4), +q[1].toFixed(4)]);
      exec('viga.contornoRetangular', { grupo, c1, c2, c3, secao: pl.secaoViga, alinhar: usePlanta.getState().l5.alinharContorno });
      return;
    }
    if (f === 'aberturaRet') {
      // L5 (C7.78 a C7.82): 1º clique na laje (no modo paralela a uma viga, antes na viga de referência) e depois os cantos
      if (nivelFund || !pav) { msg('A abertura retangular é lançada nas plantas dos pavimentos.'); return; }
      const P = usePlanta.getState(), L = P.l5, c = it.current.cursor;
      if (!pontos.length) {
        if (L.modoAbertura === 'viga' && !L.vigaRef) {
          const v = vigaSob(c);
          if (!v) { msg('Modo paralela a uma viga: clique primeiro na viga de referência.'); return; }
          P.set({ l5: { ...L, vigaRef: v.id }, selecao: new Set([v.id]) }); msg(`Viga de referência: ${v.nome}. Clique na laje.`); return;
        }
        const l = lajes.find((x) => dentro(c, x.l.contorno))?.l;
        if (!l) { msg('Clique dentro de uma laje.'); return; }
        it.current.lajeAb = l.id; P.set({ selecao: new Set([l.id]) }); setPontos([p]); return;
      }
      if (novos.length - 1 < (L.modoAbertura === 'qualquer' ? 3 : 2)) { setPontos(novos); return; }
      const [c1, c2, c3] = novos.slice(1).map((q) => [+q[0].toFixed(4), +q[1].toFixed(4)]);
      setPontos([]);
      exec('laje.aberturaRetangular', { id: it.current.lajeAb, modo: L.modoAbertura, c1, c2, ...(L.modoAbertura === 'qualquer' ? { c3 } : {}), ...(L.modoAbertura === 'viga' ? { viga: L.vigaRef } : {}), borda: L.borda, secaoBorda: { b: L.bordaB, h: L.bordaH } });
      return;
    }
    if (f === 'cargaLaje') {
      // L5 (C10.24): um clique na laje (destacada) lança a carga de superfície nela inteira
      if (nivelFund || !pav) { msg('A carga na laje inteira é lançada nas plantas dos pavimentos.'); return; }
      const L = usePlanta.getState().l5, l = lajes.find((x) => dentro(it.current.cursor, x.l.contorno))?.l;
      if (!l) { msg('Clique dentro de uma laje.'); return; }
      exec('carga.areaNaLaje', L.copiarCarga ? { laje: l.id, copiarDe: L.copiarCarga } : { laje: l.id, valor: L.valorLaje, caso: L.casoLaje });
      return;
    }
    if (f === 'cargaViga') {
      // L5 (C10.25): clique numa viga = carga ao longo do eixo dela; dois cliques em lugar livre = janela de captura
      if (nivelFund || !pav) { msg('A carga ao longo da viga é lançada nas plantas dos pavimentos.'); return; }
      const L = usePlanta.getState().l5, c = it.current.cursor, v = pontos.length ? null : vigaSob(c);
      if (v) { exec('carga.aoLongoDaViga', { vigas: [v.id], valor: L.valorViga, caso: L.casoViga }); return; }
      if (novos.length < 2) { setPontos(novos); msg('Segundo canto da janela de captura.'); return; }
      setPontos([]);
      exec('carga.aoLongoDaViga', { grupo, janela: novos.map((q) => [+q[0].toFixed(4), +q[1].toFixed(4)]), valor: L.valorViga, caso: L.casoViga });
      return;
    }
    if (f === 'direcaoPano' || f === 'insercaoPano') {
      // L5 (C7.5, C7.6, K1.9.54): 1º clique no pano; depois uma viga (ou dois pontos) para a direção, ou o vértice para a inserção
      if (nivelFund || !pav) { msg('Panos são editados nas plantas dos pavimentos.'); return; }
      const P = usePlanta.getState(), c = it.current.cursor;
      if (!pontos.length) {
        const l = lajes.find((x) => dentro(c, x.l.contorno))?.l;
        if (!l) { msg('Clique dentro de um pano (laje).'); return; }
        it.current.lajeAb = l.id; P.set({ selecao: new Set([l.id]) }); setPontos([p]); return;
      }
      const id = it.current.lajeAb;
      if (f === 'insercaoPano') { setPontos([]); exec('laje.editar', { id, insercaoPonto: [+p[0].toFixed(4), +p[1].toFixed(4)] }); return; }
      if (P.l5.direcaoModo === 'viga') {
        const v = vigaSob(c);
        if (!v) { msg('Clique numa viga (a direção sai paralela ou perpendicular ao trecho clicado).'); return; }
        setPontos([]); exec('laje.editar', { id, direcaoPor: { viga: v.id, relacao: P.l5.relacao } }); return;
      }
      if (novos.length < 3) { setPontos(novos); return; }
      setPontos([]);
      exec('laje.editar', { id, direcaoPor: { pontos: novos.slice(1).map((q) => [+q[0].toFixed(4), +q[1].toFixed(4)]) } });
      return;
    }
    if (f === 'viga') {
      // viga curva (E2b): no trecho curvo o 1º clique é a passagem do arco e o 2º, o fim; os trechos retos guardam null
      const P = usePlanta.getState(), n = pontosRef.current.length;
      if (P.l5.simples) {
        // modo simples (L5, C6.7): cada par de pontos é uma viga independente
        if (!n) { setPontos(novos); return; }
        setPontos([]);
        exec('viga.tracar', { grupo, pontos: novos.map((q) => [+q[0].toFixed(4), +q[1].toFixed(4)]), secao: pl.secaoViga, alinhamento: pl.alinhamento, invertida: pl.invertida, simples: true, ...(P.l5.deslocamento ? { deslocamentoClique: P.l5.deslocamento } : {}) });
        return;
      }
      if (!n) { P.set({ passagemViga: null, passagensViga: [] }); setPontos(novos); return; }
      if (P.curvaViga && !P.passagemViga) { P.set({ passagemViga: [p[0], p[1]] }); msg('Passagem do arco marcada: clique no fim do arco.'); desenharInteracao(); return; }
      P.set({ passagensViga: [...P.passagensViga.slice(0, n - 1), P.curvaViga ? P.passagemViga : null], passagemViga: null });
      setPontos(novos); return;
    }
    if (f === 'laje') {
      if (!pontos.length) {
        const r = exec('laje.criar', { grupo, ponto: [+p[0].toFixed(4), +p[1].toFixed(4)], tipo: pl.tipoLaje });
        if (!r.ok && r.erros[0]?.codigo === 'PANO_NAO_ENCONTRADO') { setPontos([p]); msg('Fora de região fechada: desenhe o contorno da laje (pontos e Enter).'); }
        return;
      }
      setPontos(novos); return;
    }
    if (f === 'carga') {
      if (pl.tipoCarga === 'ponto') { exec('carga.ponto', { grupo: grupoCarga, ponto: [+p[0].toFixed(4), +p[1].toFixed(4)], valor: pl.valorCarga, caso: pl.caso }); return; }
      setPontos(novos); return;
    }
    if (f === 'eixo' && novos.length === 2) {
      const [a, z] = novos;
      if (Math.hypot(z[0] - a[0], z[1] - a[1]) < 1e-3) return;
      exec('eixo.criar', { nome: proximoEixo(b, Math.abs(z[0] - a[0]) >= Math.abs(z[1] - a[1])), p1: a.map((v) => +v.toFixed(4)), p2: z.map((v) => +v.toFixed(4)) });
      setPontos([]); return;
    }
    if ((f === 'zonaLaje' || f === 'linhaDobra') && novos.length === 2) {
      setPontos([]);
      if (nivelFund) { msg('Zonas e linhas de dobra valem para as lajes: abra um pavimento.'); return; }
      const [a, z] = novos.map((q) => [+q[0].toFixed(4), +q[1].toFixed(4)]), P = usePlanta.getState();
      if (f === 'linhaDobra') void executarERecalcular('laje.linhaDobra', { acao: 'criar', grupo, a, z });
      else void executarERecalcular('laje.uniformizacao', { acao: 'criar', grupo, forma: P.zonaForma, pontos: [a, z], face: P.zonaFace, ...(P.zonaForma === 'linha' ? { largura: P.zonaLargura } : {}), ...(P.zonaAngulo !== null ? { angulo: P.zonaAngulo } : {}) });
      return;
    }
    if (f === 'medir' && novos.length === 2) {
      const [a, z] = novos, d = Math.hypot(z[0] - a[0], z[1] - a[1]);
      msg(`Distância ${fmt(d, 3)} m · Δx ${fmt(z[0] - a[0], 3)} · Δy ${fmt(z[1] - a[1], 3)} · ${fmt((Math.atan2(z[1] - a[1], z[0] - a[0]) * 180) / Math.PI, 2)}°`);
      setPontos([]); return;
    }
    if (f === 'mover' && novos.length === 2) {
      const dx = +(novos[1][0] - novos[0][0]).toFixed(4), dy = +(novos[1][1] - novos[0][1]).toFixed(4);
      const sel = selecionados();
      const cmds = [
        ...(sel.fundacoes.length ? [{ nome: 'fundacao.mover', params: { ids: sel.fundacoes, dx, dy } }] : []),
        ...sel.limites.map((id) => ({ nome: 'limite.editar', params: { id, pontos: b.fundacao!.limites!.find((l) => l.id === id)!.pontos.map((q) => [+(q[0] + dx).toFixed(4), +(q[1] + dy).toFixed(4)]) } })),
        ...(sel.pilares.length ? [{ nome: 'pilar.mover', params: { ids: sel.pilares, dx, dy } }] : []),
        ...(sel.vigas.length ? [{ nome: 'viga.mover', params: { ids: sel.vigas, dx, dy } }] : []),
        ...sel.eixos.map((id) => { const e = b.eixos.find((x) => x.id === id)!; return { nome: 'eixo.editar', params: { id, p1: [e.p1[0] + dx, e.p1[1] + dy], p2: [e.p2[0] + dx, e.p2[1] + dy] } }; }),
      ];
      if (cmds.length) exec('lote', { comandos: cmds });
      setPontos([]); return;
    }
    if (f === 'dividir') {
      const v = vigaSob(p);
      if (!v) { msg('Clique sobre uma viga.'); return; }
      exec('viga.dividir', { id: v.id, ponto: [+p[0].toFixed(4), +p[1].toFixed(4)] });
      return;
    }
    if (f === 'unir') {
      const v = vigaSob(it.current.cursor) ?? vigaSob(p);
      if (!v) { msg('Clique sobre uma viga.'); return; }
      if (!pontos.length) { it.current.vigaRef = v.id; usePlanta.getState().set({ selecao: new Set([v.id]) }); setPontos([p]); return; }
      const a = it.current.vigaRef; it.current.vigaRef = null; setPontos([]);
      if (a && a !== v.id) { const r = exec('viga.unir', { ids: [a, v.id] }); if (r.ok) usePlanta.getState().set({ selecao: new Set([a]) }); }
      return;
    }
    if (f === 'prolongar') {
      if (!pontos.length) {
        const v = vigaSob(it.current.cursor, 12) ?? vigaSob(p, 12);
        if (!v) { msg('Clique perto da extremidade de uma viga.'); return; }
        const w = it.current.cursor, a = v.pontos[0], z = v.pontos[v.pontos.length - 1];
        it.current.vigaRef = v.id; it.current.extremidade = Math.hypot(w[0] - a[0], w[1] - a[1]) <= Math.hypot(w[0] - z[0], w[1] - z[1]) ? 'ini' : 'fim';
        usePlanta.getState().set({ selecao: new Set([v.id]) });
        const cp = usePlanta.getState().l5.comprimento;
        if (cp) { it.current.vigaRef = null; exec('viga.prolongar', { id: v.id, extremidade: it.current.extremidade, ate: { comprimento: cp } }); return; } // L5 (C6.53): comprimento fixo
        setPontos([it.current.extremidade === 'ini' ? a : z]); return;
      }
      const id = it.current.vigaRef, ext = it.current.extremidade;
      it.current.vigaRef = null; setPontos([]);
      if (!id) return;
      const alvo = vigaSob(it.current.cursor);
      const eixo = b.eixos.find((e) => distSeg(it.current.cursor, e.p1, e.p2) < 6 / (vista?.k || 1));
      const ate = alvo && alvo.id !== id ? { viga: alvo.id } : eixo ? { eixo: eixo.id } : { ponto: [+p[0].toFixed(4), +p[1].toFixed(4)] };
      exec('viga.prolongar', { id, extremidade: ext, ate });
      return;
    }
    if (f === 'secao') {
      if (novos.length < 2) { setPontos(novos); return; }
      setPontos([]);
      const r = exec('secao.criar', { a: [+novos[0][0].toFixed(4), +novos[0][1].toFixed(4)], b: [+novos[1][0].toFixed(4), +novos[1][1].toFixed(4)], ...(!nivelFund && pav ? { pavimento: pav.id } : {}) });
      const nova = useBuilding.getState().sessao.modelo.secoes?.at(-1);
      if (r.ok && nova) usePlanta.getState().set({ janelaCorte: { tipo: 'secao', id: nova.id } });
      return;
    }
    if (f === 'copiar' && novos.length === 2) {
      const dx = +(novos[1][0] - novos[0][0]).toFixed(4), dy = +(novos[1][1] - novos[0][1]).toFixed(4), vezes = Math.max(1, Math.round(pl.copias));
      const sel = selecionados();
      const cmds = [...(sel.pilares.length ? [{ nome: 'pilar.copiar', params: { ids: sel.pilares, dx, dy, vezes } }] : []), ...(sel.vigas.length ? [{ nome: 'viga.copiar', params: { ids: sel.vigas, dx, dy, vezes } }] : [])];
      if (cmds.length) exec('lote', { comandos: cmds }); else msg('Selecione pilares ou vigas para copiar.');
      setPontos([]); return;
    }
    if (f === 'girar') {
      const sel = selecionados();
      if (!sel.pilares.length && !sel.vigas.length && !sel.lajes.length && !sel.cargas.length) { msg('Selecione os elementos a girar.'); return; }
      exec('editar.girar', { pilares: sel.pilares, vigas: sel.vigas, lajes: sel.lajes, cargas: sel.cargas, centro: [+p[0].toFixed(4), +p[1].toFixed(4)], angulo: pl.anguloGiro });
      return;
    }
    if (f === 'espelhar' && novos.length === 2) {
      const sel = selecionados();
      setPontos([]);
      if (!sel.pilares.length && !sel.vigas.length && !sel.lajes.length && !sel.cargas.length) { msg('Selecione os elementos a espelhar.'); return; }
      const q = novos.map((x) => [+x[0].toFixed(4), +x[1].toFixed(4)]);
      exec('editar.espelhar', pl.espelharCopia ? { pilares: sel.pilares, vigas: sel.vigas, eixo: q, copiar: true } : { pilares: sel.pilares, vigas: sel.vigas, lajes: sel.lajes, cargas: sel.cargas, eixo: q });
      return;
    }
    if (f === 'alinhar' && novos.length === 4) {
      const m = b.mascaras.find((x) => mascaraNoGrupo(x, grupo));
      if (m) exec('mascara.alinhar', { id: m.id, de: [novos[0], novos[2]], para: [novos[1], novos[3]], escalar: pl.alinharEscala });
      setPontos([]); usePlanta.getState().set({ ferramenta: 'selecionar' }); return;
    }
    setPontos(novos);
  };

  /** Enter na ferramenta Fundação em modo de vários pilares: cria a sapata associada ou o bloco com os pilares escolhidos. */
  const criarGrupoPlanta = () => {
    const P = usePlanta.getState(), t = b.fundacao?.terreno;
    const estaca = P.tipoFund === 'bloco' ? (P.estacaFund && t?.estacas.some((e) => e.id === P.estacaFund) ? P.estacaFund : t?.estacas[0]?.id) : undefined;
    const plano = planoGrupo(b, P.pilaresFund, P.tipoFund, estaca);
    if (plano.erro) { msg(plano.erro); return; }
    const r = exec('lote', { comandos: plano.cmds });
    if (r.ok) P.set({ pilaresFund: [], selecao: new Set() });
  };

  /** Enter/duplo clique: termina a polilinha da ferramenta atual. */
  const terminar = (pts: P2[] = pontosRef.current) => {
    const f = usePlanta.getState().ferramenta, tc = usePlanta.getState().tipoCarga;
    const q = pts.map((x) => [+x[0].toFixed(4), +x[1].toFixed(4)]);
    if (f === 'viga') { terminarViga(pts); return; }
    if (f === 'limite') {
      const fechado = usePlanta.getState().limiteFechado;
      if (pts.length >= (fechado ? 3 : 2)) exec('limite.criar', { pontos: q, ...(fechado ? { fechado: true } : {}) }); else msg(fechado ? 'Limite fechado: ao menos 3 vértices.' : 'Limite: ao menos 2 vértices.');
      setPontos([]); return;
    }
    if (f === 'corte') {
      const cl = usePlanta.getState().corteLanc;
      if (pts.length >= 2) {
        const r = exec('corte.criar', { pontos: q, sentido: cl.sentido, ...(cl.profundidade > 0 ? { profundidade: cl.profundidade } : {}) });
        const novo = useBuilding.getState().sessao.modelo.cortes?.at(-1);
        if (r.ok && novo) usePlanta.getState().set({ janelaCorte: { tipo: 'corte', id: novo.id } });
      } else msg('Corte: ao menos 2 pontos.');
      setPontos([]); return;
    }
    if (f === 'parede') { if (pts.length >= 2) exec('parede.criar', { ...(usePlanta.getState().pwParams ?? {}), pontos: q }); else msg('Parede: ao menos 2 pontos.'); setPontos([]); return; }
    if (f === 'radier') { if (pts.length >= 3) exec('radier.criar', { contorno: q, h: usePlanta.getState().hRadier }); else msg('Radier: ao menos 3 vértices.'); setPontos([]); return; }
    if (f === 'corrida') {
      const sc = usePlanta.getState().corridaLanc;
      if (pts.length >= 2) exec('corrida.criar', { pontos: q, bw: sc.bw, aba: sc.aba, ...(sc.B ? { B: sc.B } : {}), ...(sc.alvenaria ? { alvenaria: true } : {}), ...(sc.equilibrio ? { equilibrio: true } : {}) }); else msg('Sapata corrida: ao menos 2 pontos.');
      setPontos([]); return;
    }
    if (f === 'vigaElastica') { const sv = usePlanta.getState().secaoVigaElastica; if (pts.length >= 2) exec('vigaElastica.criar', { pontos: q, b: sv.b, h: sv.h }); else msg('Viga sobre base elástica: ao menos 2 pontos.'); setPontos([]); return; }
    if (f === 'laje' && pts.length >= 3) exec('laje.criar', { grupo, contorno: q, tipo: pl.tipoLaje });
    if (f === 'carga' && tc === 'linha' && pts.length >= 2) exec('carga.linha', { grupo: grupoCarga, pontos: q, valor: pl.valorCarga, caso: pl.caso });
    if (f === 'carga' && tc === 'area' && pts.length >= 3) exec('carga.area', { grupo: grupoCarga, contorno: q, valor: pl.valorCarga, caso: pl.caso });
    setPontos([]);
  };
  const terminarViga = (pts: P2[] = pontos) => {
    const P = usePlanta.getState();
    // passagens dos arcos (E2b), uma por trecho: null = reto
    const passagens = Array.from({ length: Math.max(0, pts.length - 1) }, (_, i) => { const q = P.passagensViga[i]; return q ? [+q[0].toFixed(4), +q[1].toFixed(4)] : null; });
    if (pts.length >= 2) exec('viga.tracar', { grupo, pontos: pts.map((q) => [+q[0].toFixed(4), +q[1].toFixed(4)]), ...(passagens.some((q) => q) ? { passagens } : {}), secao: pl.secaoViga, alinhamento: pl.alinhamento, invertida: pl.invertida, ...(P.l5.deslocamento ? { deslocamentoClique: P.l5.deslocamento } : {}) });
    P.set({ passagemViga: null, passagensViga: [] });
    setPontos([]);
  };

  const escolher = (w: P2, aditivo: boolean) => {
    const tol = 6 / vista!.k;
    let id: string | null = null;
    for (const q of [...naPlanta].reverse()) if (q.estado !== 'inferior' && dentro(w, q.contorno)) { id = q.p.id; break; }
    if (!id) for (const q of [...paredesPl].reverse()) if (q.estado !== 'inferior' && q.lados.some((l) => dentro(w, l.contorno))) { id = q.pp.id; break; }
    if (!id) for (const f of [...fund].reverse()) if (dentro(w, f.contorno)) { id = f.el.id; break; }
    if (!id) for (const { v: vf, g, larg } of [...vigasFund].reverse()) if (!g.erro && distSeg(w, g.a, g.z) < Math.max(tol, larg / 2)) { id = vf.id; break; }
    if (!id) for (const { v: ve } of [...vigasEl].reverse()) if (distPolilinha(w, ve.pontos as P2[]) < Math.max(tol, ve.b / 2)) { id = ve.id; break; }
    if (!id) for (const { c } of [...corridasP].reverse()) if (distPolilinha(w, c.pontos as P2[]) < Math.max(tol, c.bw / 2)) { id = c.id; break; }
    if (!id) for (const l of [...limites].reverse()) if (distPolilinha(w, l.pontos as P2[], l.fechado) < Math.max(tol, 0.05)) { id = l.id; break; }
    if (!id) for (const r of [...radiers].reverse()) if (dentro(w, r.contorno as P2[]) && !(r.furos ?? []).some((f) => dentro(w, f as P2[]))) { id = r.id; break; }
    if (!id) for (const { v, t } of [...vigas].reverse()) if (t.some((r) => dentro(w, r))) { id = v.id; break; }
    if (!id) for (const c of cargas) if (c.tipo === 'ponto' ? Math.hypot(w[0] - c.pontos[0][0], w[1] - c.pontos[0][1]) < tol * 1.5 : c.tipo === 'linha' ? c.pontos.some((q, i) => i > 0 && distSeg(w, c.pontos[i - 1], q) < tol) : false) { id = c.id; break; }
    if (!id) for (const e of b.eixos) if (distSeg(w, e.p1, e.p2) < tol) { id = e.id; break; }
    if (!id) for (const c of cargas) if (c.tipo === 'area' && dentro(w, c.pontos)) { id = c.id; break; }
    if (!id) for (const { l } of lajes) if (dentro(w, l.contorno)) { id = l.id; break; }
    const s = new Set(aditivo ? pl.selecao : []);
    if (id) { if (aditivo && s.has(id)) s.delete(id); else s.add(id); }
    pl.set({ selecao: s });
  };

  const selecionarJanela = (a: P2, z: P2) => {
    const cruz = z[0] < a[0];
    const x0 = Math.min(a[0], z[0]), x1 = Math.max(a[0], z[0]), y0 = Math.min(a[1], z[1]), y1 = Math.max(a[1], z[1]);
    const inside = (p: P2) => p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1;
    const s = new Set<string>();
    for (const q of naPlanta) if (q.estado !== 'inferior' && (cruz ? q.contorno.some(inside) || dentro([x0, y0], q.contorno) : q.contorno.every(inside))) s.add(q.p.id);
    for (const q of paredesPl) if (q.estado !== 'inferior' && (cruz ? q.lados.some((l) => l.contorno.some(inside)) : q.lados.every((l) => l.contorno.every(inside)))) s.add(q.pp.id);
    for (const e of b.eixos) if (cruz ? inside(e.p1) || inside(e.p2) || cruzaRet(e.p1, e.p2, x0, y0, x1, y1) : inside(e.p1) && inside(e.p2)) s.add(e.id);
    for (const { l } of lajes) if (cruz ? l.contorno.some(inside) : l.contorno.every(inside)) s.add(l.id);
    for (const f of fund) if (cruz ? f.contorno.some(inside) : f.contorno.every(inside)) s.add(f.el.id);
    for (const l of limites) if (cruz ? l.pontos.some((q) => inside(q as P2)) : l.pontos.every((q) => inside(q as P2))) s.add(l.id);
    for (const r of radiers) if (cruz ? r.contorno.some((q) => inside(q as P2)) : r.contorno.every((q) => inside(q as P2))) s.add(r.id);
    for (const { v: ve, f } of vigasEl) if (cruz ? f.some(inside) : f.every(inside)) s.add(ve.id);
    for (const { c, contorno } of corridasP) if (cruz ? contorno.some(inside) : contorno.every(inside)) s.add(c.id);
    for (const { v: vf, g } of vigasFund) if (!g.erro && (cruz ? inside(g.a) || inside(g.z) || cruzaRet(g.a, g.z, x0, y0, x1, y1) : inside(g.a) && inside(g.z))) s.add(vf.id);
    for (const c of cargas) if (cruz ? c.pontos.some(inside) : c.pontos.every(inside)) s.add(c.id);
    for (const { v, t } of vigas) {
      const cantos = t.flat();
      const cr = v.pontos.some((q, i) => i > 0 && cruzaRet(v.pontos[i - 1], q, x0, y0, x1, y1));
      if (cruz ? cantos.some(inside) || cr : cantos.every(inside)) s.add(v.id);
    }
    pl.set({ selecao: s });
    msg(`${s.size} elemento(s) selecionado(s).`);
  };

  // ---- eventos ----
  const onDown = (e: React.PointerEvent) => {
    const r = cvI.current!.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    e.preventDefault(); // sem seleção de texto da página durante o arraste
    (document.activeElement as HTMLElement | null)?.blur?.();
    cvI.current!.setPointerCapture(e.pointerId);
    if (e.button === 1 || (e.button === 0 && it.current.espaco)) { it.current.pan = { x: sx, y: sy, v: { ...vista! } }; return; }
    if (e.button === 2) { if (POLILINHAS.includes(pl.ferramenta)) terminar(); else setPontos([]); return; }
    if (e.button !== 0) return;
    capturar(sx, sy);
    if (pl.ferramenta === 'selecionar') { it.current.janela = { a: paraMundo(sx, sy), z: paraMundo(sx, sy) }; return; }
    agir(it.current.ponto);
  };
  const onMove = (e: React.PointerEvent) => {
    const r = cvI.current!.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    const s = it.current;
    if (s.pan) { pl.set({ vista: { ...s.pan.v, ox: s.pan.v.ox + sx - s.pan.x, oy: s.pan.v.oy + sy - s.pan.y } }); return; }
    if (s.janela) s.janela.z = paraMundo(sx, sy);
    capturar(sx, sy);
    const t0 = performance.now();
    desenharInteracao();
    registrarQuadro(performance.now() - t0);
  };
  const onUp = (e: React.PointerEvent) => {
    const s = it.current;
    if (s.pan) { s.pan = null; desenharMascara(false); return; }
    if (s.janela) {
      const [ax, ay] = paraTela(...s.janela.a), [zx, zy] = paraTela(...s.janela.z);
      if (Math.hypot(zx - ax, zy - ay) > 4) selecionarJanela(s.janela.a, s.janela.z);
      else escolher(s.janela.a, e.shiftKey);
      s.janela = null;
      desenharInteracao();
    }
  };
  useEffect(() => {
    const el = cvI.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = usePlanta.getState().vista;
      if (!v) return;
      const r = el.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
      const f = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015));
      const k = Math.min(5000, Math.max(0.5, v.k * f)), q = k / v.k;
      ultimoZoom.current = performance.now();
      usePlanta.getState().set({ vista: { k, ox: sx - (sx - v.ox) * q, oy: sy - (sy - v.oy) * q } });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // teclado da planta
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useStore.getState().module !== 'edificio') return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const P = usePlanta.getState(), k = e.key;
      const espera = P.ferramenta !== 'selecionar';
      if (k === ' ') { it.current.espaco = e.type === 'keydown'; e.preventDefault(); return; }
      if (e.type !== 'keydown') return;
      if (espera && /^[\d@\-+.,;<]$/.test(k)) { setPosDig([...it.current.tela]); setDigitando(k); e.preventDefault(); return; }
      if (k === 'Enter' && POLILINHAS.includes(P.ferramenta)) { terminar(); return; }
      if (k === 'Enter' && P.ferramenta === 'contornoRet' && pontos.length === 2) { // L5: cantos opostos, ângulo zero
        setPontos([]);
        exec('viga.contornoRetangular', { grupo, c1: pontos[0].map((v) => +v.toFixed(4)), c2: pontos[1].map((v) => +v.toFixed(4)), secao: P.secaoViga, alinhar: P.l5.alinharContorno });
        return;
      }
      if (k === 'Enter' && P.ferramenta === 'fundacao' && P.multiFund) { criarGrupoPlanta(); return; }
      // Enter sem nada pendente repete o último comando (ferramenta ou item da paleta Ctrl+K)
      if (k === 'Enter' && P.ferramenta === 'selecionar' && !pontos.length && P.ultimaAcao) {
        const u = P.ultimaAcao;
        if (u.tipo === 'ferramenta') { P.set({ ferramenta: u.f, ...aoEscolher(u.f) }); msg(`Repetindo: ${ROTULO_FERRAMENTA[u.f]}.`); }
        else { u.executar(); msg(`Repetindo: ${u.rotulo}.`); }
        return;
      }
      if (P.ferramenta === 'viga' && k.toLowerCase() === 'r') { P.set({ curvaViga: !P.curvaViga, passagemViga: null }); msg(P.curvaViga ? 'Próximo trecho da viga: reto.' : 'Próximo trecho da viga: curvo (passagem e fim do arco).'); return; }
      if (P.ferramenta === 'viga' && k.toLowerCase() === 'a') { const o = ['centro', 'esq', 'dir'] as const; P.set({ alinhamento: o[(o.indexOf(P.alinhamento) + 1) % 3] }); msg(`Alinhamento: ${({ centro: 'eixo', esq: 'face esquerda', dir: 'face direita' })[o[(o.indexOf(P.alinhamento) + 1) % 3]]}.`); return; }
      const ferr: Record<string, Ferramenta> = { s: 'selecionar', p: 'pilar', v: 'viga', l: 'laje', c: 'carga', e: 'eixo', m: 'mover', d: 'medir', u: 'fundacao', b: 'vigaFund', k: 'girarFund', n: 'insFund', t: 'limite', q: 'limiteMascara', w: 'radier', x: 'vigaElastica', i: 'dividir', j: 'unir', o: 'prolongar', y: 'copiar', g: 'girar', h: 'espelhar', z: 'puncao' };
      // A é a tecla da sapata corrida só no nível de fundação e fora das ferramentas em que A já é outra coisa (alinhamento da viga, ajuste do pilar)
      if (k.toLowerCase() === 'a' && nivelFund && P.ferramenta !== 'viga' && P.ferramenta !== 'pilar') { P.set({ ferramenta: 'corrida', ...aoEscolher('corrida') }); it.current.fundPilar = null; it.current.vfIni = null; it.current.insEl = null; setPontos([]); return; }
      if (ferr[k.toLowerCase()]) { const fe = ferr[k.toLowerCase()]; P.set({ ferramenta: fe, ...aoEscolher(fe) }); it.current.fundPilar = null; it.current.vfIni = null; it.current.insEl = null; setPontos([]); return; }
      if (k === 'Escape') { P.set({ passagemViga: null, passagensViga: [] }); it.current.fundPilar = null; it.current.vigaRef = null; it.current.vfIni = null; it.current.insEl = null; if (P.pilaresFund.length) P.set({ pilaresFund: [] }); else if (pontos.length) setPontos([]); else P.set({ ferramenta: 'selecionar', selecao: new Set() }); return; }
      if (k === 'Tab') { e.preventDefault(); const s = it.current; s.ciclo++; s.cap = s.caps.length ? s.caps[s.ciclo % s.caps.length] : null; if (s.cap) s.ponto = [s.cap.x, s.cap.y]; desenharInteracao(); return; }
      if (k === 'F8') { e.preventDefault(); P.set({ orto: !P.orto }); msg(`Ortogonal ${P.orto ? 'desligado' : 'ligado'}.`); return; }
      if (k === 'F3') {
        // F3 (L2, C2.21): liga e desliga as capturas; sem nenhum modo escolhido, abre a janela de seleção
        e.preventDefault();
        if (P.capturas.size) { P.set({ capturasAntes: new Set(P.capturas), capturas: new Set() }); msg('Capturas desligadas (F3 liga de novo).'); }
        else if (P.capturasAntes.size) { P.set({ capturas: new Set(P.capturasAntes) }); msg('Capturas ligadas.'); }
        else P.set({ janelaCapturas: true });
        return;
      }
      if (k === 'F10') { e.preventDefault(); P.set({ polar: !P.polar }); msg(`Polar ${P.polar ? 'desligado' : 'ligado'}.`); return; }
      if (k.toLowerCase() === 'f') { enquadrar(); return; }
      if (P.ferramenta === 'pilarParede' && k.toLowerCase() === 'r') { P.set({ ppAngulo: (P.ppAngulo + 90) % 360 }); return; }
      if (P.ferramenta === 'pilar' && k.toLowerCase() === 'r') { P.set({ angulo: (P.angulo + 90) % 360 }); return; }
      if (P.pavimento === 'fundacao' && k.toLowerCase() === 'r') { const sel = selecionados().fundacoes; if (sel.length) { exec('lote', { comandos: sel.map((id) => ({ nome: 'fundacao.girar', params: { ids: [id], angulo: (b.fundacao?.elementos.find((e) => e.id === id)?.angulo ?? 0) + 90 } })) }); return; } }
      if (P.ferramenta === 'pilar' && k.toLowerCase() === 'a') { const o = ['c', 'so', 's', 'se', 'l', 'ne', 'n', 'no', 'o'] as const; P.set({ ajuste: o[(o.indexOf(P.ajuste) + 1) % o.length] }); return; }
      if (k === 'Backspace' && P.ferramenta === 'viga' && pontos.length) {
        // L5 (C6.6): Backspace apaga o último ponto da sequência de pontos da viga
        e.preventDefault();
        P.set({ passagemViga: null, passagensViga: P.passagensViga.slice(0, Math.max(0, pontos.length - 2)) });
        setPontos(pontos.slice(0, -1));
        return;
      }
      if ((k === 'Delete' || k === 'Backspace') && P.selecao.size) {
        const sel = selecionados();
        const cmds = [...(sel.corridas.length ? [{ nome: 'corrida.remover', params: { ids: sel.corridas } }] : []), ...(sel.radiers.length ? [{ nome: 'radier.remover', params: { ids: sel.radiers } }] : []), ...(sel.vigasEl.length ? [{ nome: 'vigaElastica.remover', params: { ids: sel.vigasEl } }] : []), ...(sel.limites.length ? [{ nome: 'limite.remover', params: { ids: sel.limites } }] : []), ...(sel.vigasFund.length ? [{ nome: 'vigaFundacao.remover', params: { ids: sel.vigasFund } }] : []), ...(sel.fundacoes.length ? [{ nome: 'fundacao.remover', params: { ids: sel.fundacoes } }] : []), ...(sel.pilares.length ? [{ nome: 'pilar.remover', params: { ids: sel.pilares } }] : []), ...(sel.vigas.length ? [{ nome: 'viga.remover', params: { ids: sel.vigas } }] : []), ...(sel.eixos.length ? [{ nome: 'eixo.remover', params: { ids: sel.eixos } }] : []),
          ...(sel.lajes.length ? [{ nome: 'laje.remover', params: { ids: sel.lajes } }] : []), ...(sel.cargas.length ? [{ nome: 'carga.remover', params: { ids: sel.cargas } }] : [])];
        const paredesSel = [...P.selecao].filter((id) => (b.paredes ?? []).some((w) => w.id === id));
        if (paredesSel.length) cmds.push({ nome: 'parede.remover', params: { ids: paredesSel } });
        if (cmds.length) exec('lote', { comandos: cmds });
        P.set({ selecao: new Set() });
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); };
  });

  const confirmarDigitado = () => {
    // com um pilar de baixo sob o cursor, "@dx;dy" sem ponto anterior é relativo ao ponto fixo dele (E1a)
    const qb = it.current.baixo ? naPlanta.find((x) => x.p.id === it.current.baixo) : null;
    const p = pontoDigitado(digitando ?? '', pontos.at(-1) ?? (pl.ferramenta === 'pilar' && qb ? [refBaixo(qb.p).x, refBaixo(qb.p).y] : null), it.current.cursor);
    setDigitando(null);
    if (!p) { msg('Entrada inválida: use x;y, @dx;dy, @d<ângulo ou uma distância.'); return; }
    it.current.ponto = p;
    agir(p);
  };

  const passo = PASSOS[pl.ferramenta][Math.min(pontos.length, PASSOS[pl.ferramenta].length - 1)];
  return (
    <div className="planta">
      <div ref={wrap} className="planta-cv" data-ajuda={`ferramenta:${pl.ferramenta}`} data-tema={pl.tema} data-nivel={nivelFund ? 'fundacao' : pav?.nome} onContextMenu={(e) => e.preventDefault()}>
        <canvas ref={cvM} />
        <canvas ref={cvE} />
        <canvas ref={cvI} className="int" data-ferramenta={pl.ferramenta} aria-label="Planta do pavimento" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
          onPointerLeave={() => { it.current.cap = null; desenharInteracao(); }}
          onDoubleClick={() => {
            if (POLILINHAS.includes(pl.ferramenta)) terminar(pl.ferramenta === 'viga' && usePlanta.getState().passagemViga ? pontosRef.current : pontosRef.current.slice(0, -1).length >= 2 ? pontosRef.current.slice(0, -1) : pontosRef.current);
            else if (pl.ferramenta === 'selecionar' && !nivelFund && paredesPl.some((q) => q.estado !== 'inferior' && q.lados.some((l) => dentro(it.current.cursor, l.contorno)))) { const q = paredesPl.find((x) => x.estado !== 'inferior' && x.lados.some((l) => dentro(it.current.cursor, l.contorno)))!; usePlanta.getState().set({ janela: { tipo: paredeDoPP(b, q.pp) ? 'parede' : 'pilarParede', id: q.pp.id } }); }
            else if (pl.ferramenta === 'selecionar' && nivelFund) { const f = [...fund].reverse().find((x) => dentro(it.current.cursor, x.contorno)); const w = it.current.cursor, vf = !f && vigasFund.find(({ g, larg }) => !g.erro && distSeg(w, g.a, g.z) < Math.max(6 / (vista?.k || 1), larg / 2)); const ve = !f && !vf && vigasEl.find((x) => distPolilinha(w, x.v.pontos as P2[]) < Math.max(6 / (vista?.k || 1), x.v.b / 2)), ra = !f && !vf && !ve && radiers.find((r) => dentro(w, r.contorno as P2[])), co = !f && !vf && !ve && !ra && corridasP.find((x) => dentro(w, x.contorno)); if (f) abrirJanelaFundacao(f.el.id); else if (vf) abrirJanelaFundacao(vf.v.id); else if (ve) abrirJanelaFundacao(ve.v.id); else if (ra) abrirJanelaFundacao(ra.id); else if (co) abrirJanelaFundacao(co.c.id); }
          }} />
        {digitando !== null && (
          <Input className="digita" autoFocus aria-label="Valor digitado" style={{ left: posDig[0] + 16, top: posDig[1] + 12 }} value={digitando}
            onChange={(e) => setDigitando(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') confirmarDigitado(); if (e.key === 'Escape') setDigitando(null); e.stopPropagation(); }} onBlur={() => setDigitando(null)} />
        )}
      </div>
      <div className="planta-st" data-ajuda={`ferramenta:${pl.ferramenta}`}>
        <span ref={statusRef} className="num">—</span>
        <span className="muted">{passo}</span>
        {TECLA_FERRAMENTA[pl.ferramenta] && <span className="muted">Tecla {TECLA_FERRAMENTA[pl.ferramenta]}</span>}
      </div>
      {aj.ligada && <AjudaFerramenta f={pl.ferramenta} />}
    </div>
  );
}

/** Ajuda da ferramenta ativa durante o lançamento (L4, C6.2): o que ela faz, os passos e a tecla. */
function AjudaFerramenta({ f }: { f: Ferramenta }) {
  const h = ajudaDaFerramenta(f, PASSOS[f], TECLA_FERRAMENTA[f]);
  return (
    <aside className="ajuda-ferr" aria-label="Ajuda da ferramenta ativa" data-ajuda-controle>
      <b>{h.titulo}</b>
      <p>{h.texto}</p>
      <ol>{h.passos.map((x, i) => <li key={i}>{x}</li>)}</ol>
      {h.tecla && <p className="hint">Tecla de atalho: {h.tecla}</p>}
    </aside>
  );
}

function cruzaRet(a: P2, z: P2, x0: number, y0: number, x1: number, y1: number) {
  const lados: [P2, P2][] = [[[x0, y0], [x1, y0]], [[x1, y0], [x1, y1]], [[x1, y1], [x0, y1]], [[x0, y1], [x0, y0]]];
  const cr = (p: P2, q: P2, r: P2) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  return lados.some(([c, d]) => cr(a, z, c) * cr(a, z, d) < 0 && cr(c, d, a) * cr(c, d, z) < 0);
}
