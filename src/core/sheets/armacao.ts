// Infraestrutura comum das pranchas de armação e locação (frente R5): opções, textos, numeração das posições
// por folha (barras iguais somadas), tabela de aço e resumo por bitola com perdas, coluna de tabelas acima da
// legenda e paginação dos elementos (blocos) nas folhas. Tudo em mm de papel (y para cima), sem dependência de
// navegador.
import { barArea } from '../concrete';
import { opcoesEmUso, perfilDe } from '../building/opcoes';
import { ARMACAO_PADRAO, type BuildingModel, type ConfigArmacao, type Formato } from '../building/types';
import { FORMATOS, LARGURA_LEGENDA, folhaECarimbo, margens, ret, txt, type AcoPrancha, type Camada, type LinhaResumoAco, type LinhaTabelaAco, type P, type Prancha, type Prim, type TipoPrancha } from './prancha';

export const cfgArmacao = (b: BuildingModel): ConfigArmacao => ({ ...ARMACAO_PADRAO, ...(b.prancha?.armacao ?? {}) });
export const perdasDe = (b: BuildingModel) => opcoesEmUso(b.opcoes, perfilDe(b)).perdasAco;

/** Número com vírgula decimal. */
export const nf = (v: number, d = 2) => (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d).replace('.', ',');
/** Bitola em mm com uma casa: φ6,3, φ10,0. */
export const phiTxt = (phi: number) => `φ${nf(phi, 1)}`;
/** Comprimento (m) em cm inteiros. */
export const cmInt = (m: number) => Math.round(m * 100);
/** Cota em cm: inteira ou com uma casa. */
export const cotaCm = (m: number) => { const r = Math.round(m * 1000) / 10; return Number.isInteger(r) ? String(r) : nf(r, 1); };
/** Quantidade com repetições: "3×2" quando o elemento se repete. */
export const qtd = (rep: number, n: number) => (rep > 1 ? `${rep}×${n}` : String(n));
export const pesoLinear = (phi: number) => barArea(phi) * 7850;
export const ordemNome = (a: string, z: string) => a.localeCompare(z, 'pt-BR', { numeric: true });

/** Largura estimada de um texto (mm) com altura de maiúsculas h. */
export const larguraTxt = (s: string, h: number) => s.length * h * 0.8;

/** Posições de uma folha: barras iguais (aço, bitola, comprimento e desenho) recebem o mesmo número e somam a quantidade. */
export class Posicoes {
  private m = new Map<string, LinhaTabelaAco>();
  /** Número da posição (N1, N2… na ordem em que aparecem) somando `quant` barras de `cCm` cm. */
  pos(chave: string, aco: string, phi: number, cCm: number, quant: number): string {
    const k = `${aco}|${phi}|${cCm}|${chave}`;
    let l = this.m.get(k);
    if (!l) { l = { pos: `N${this.m.size + 1}`, aco, phi, quant: 0, cUnit: cCm, cTotal: 0 }; this.m.set(k, l); }
    l.quant += quant; l.cTotal = (l.quant * l.cUnit) / 100;
    return l.pos;
  }
  get tabela(): LinhaTabelaAco[] { return [...this.m.values()]; }
}

/** Chaves (distintas) que um elemento usa, para paginar pelo tamanho da tabela; o número da posição não importa. */
export class Chaves {
  s = new Set<string>();
  pos(chave: string, aco: string, phi: number, cCm: number): string { this.s.add(`${aco}|${phi}|${cCm}|${chave}`); return 'N99'; }
}
export type PosDe = (chave: string, aco: string, phi: number, cCm: number, quant: number) => string;

/** Resumo por aço e bitola a partir da tabela de aço (m, kg), com perdas (%). */
export function resumoDaTabela(tab: LinhaTabelaAco[], perdas: number): LinhaResumoAco[] {
  const m = new Map<string, LinhaResumoAco>();
  for (const l of tab) {
    const k = `${l.aco}|${l.phi}`, e = m.get(k) ?? { aco: l.aco, phi: l.phi, comprimento: 0, peso: 0, pesoComPerdas: 0 };
    e.comprimento += l.cTotal; m.set(k, e);
  }
  return [...m.values()].sort((a, z) => a.aco.localeCompare(z.aco) || a.phi - z.phi).map((e) => { const peso = e.comprimento * pesoLinear(e.phi); return { ...e, peso, pesoComPerdas: peso * (1 + perdas / 100) }; });
}

export function acoDaFolha(tab: LinhaTabelaAco[], perdas: number, concreto: number, forma: number): AcoPrancha {
  const resumo = resumoDaTabela(tab, perdas);
  return { tabela: tab, resumo, peso: resumo.reduce((s, r) => s + r.peso, 0), pesoComPerdas: resumo.reduce((s, r) => s + r.pesoComPerdas, 0), perdas, concreto, forma };
}

// ---------------- geometria das primitivas ----------------

export function mover(ps: Prim[], dx: number, dy: number): Prim[] {
  const T = (p: P): P => [p[0] + dx, p[1] + dy];
  return ps.map((q) => (q.t === 'pl' || q.t === 'hach' ? { ...q, pts: q.pts.map(T) } : q.t === 'circ' ? { ...q, centro: T(q.centro) } : { ...q, p: T(q.p) }));
}

/** Caixa envolvente (mm), com os textos pela largura estimada. */
export function caixaPrims(ps: Prim[]): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (x: number, y: number) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  for (const q of ps) {
    if (q.t === 'pl' || q.t === 'hach') q.pts.forEach((p) => add(p[0], p[1]));
    else if (q.t === 'circ') { add(q.centro[0] - q.r, q.centro[1] - q.r); add(q.centro[0] + q.r, q.centro[1] + q.r); }
    else {
      const w = larguraTxt(q.s, q.h), h = q.h;
      const ax = q.ah === 'c' ? -w / 2 : q.ah === 'd' ? -w : 0, ay = q.av === 'meio' ? -h / 2 : q.av === 'topo' ? -h : 0;
      const a = ((q.ang ?? 0) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
      for (const [u, v] of [[ax, ay], [ax + w, ay], [ax, ay + h], [ax + w, ay + h]]) add(q.p[0] + u * c - v * s, q.p[1] + u * s + v * c);
    }
  }
  return Number.isFinite(x0) ? [x0, y0, x1, y1] : [0, 0, 0, 0];
}

/** Círculo cheio (barra na seção) como polígono. */
export const ponto = (c: Camada, x: number, y: number, r: number): Prim => ({ t: 'hach', c, pts: Array.from({ length: 12 }, (_, i) => [x + r * Math.cos((i * Math.PI) / 6), y + r * Math.sin((i * Math.PI) / 6)] as P) });

/** Cota em cadeia horizontal em y (mm): linha, traços oblíquos, linhas de chamada curtas e textos acima de cada trecho. */
export function cotaHorizontal(y: number, xs: number[], textos: string[], c: Camada = 'COTA', h = 1.8): Prim[] {
  const out: Prim[] = [];
  if (xs.length < 2) return out;
  out.push({ t: 'pl', c, pts: [[xs[0], y], [xs.at(-1)!, y]] });
  for (const x of xs) out.push({ t: 'pl', c, pts: [[x - 0.7, y - 0.7], [x + 0.7, y + 0.7]] }, { t: 'pl', c, pts: [[x, y - 1.2], [x, y + 1.2]] });
  for (let i = 0; i + 1 < xs.length; i++) if (textos[i]) out.push(txt(c, (xs[i] + xs[i + 1]) / 2, y + 0.7, h, textos[i], 'c', 'base'));
  return out;
}

/** Cota vertical em x (mm), texto girado 90° à esquerda da linha. */
export function cotaVertical(x: number, ys: number[], textos: string[], c: Camada = 'COTA', h = 1.8): Prim[] {
  const out: Prim[] = [];
  if (ys.length < 2) return out;
  out.push({ t: 'pl', c, pts: [[x, ys[0]], [x, ys.at(-1)!]] });
  for (const y of ys) out.push({ t: 'pl', c, pts: [[x - 0.7, y - 0.7], [x + 0.7, y + 0.7]] }, { t: 'pl', c, pts: [[x - 1.2, y], [x + 1.2, y]] });
  for (let i = 0; i + 1 < ys.length; i++) if (textos[i]) out.push({ t: 'txt', c, p: [x - 0.7, (ys[i] + ys[i + 1]) / 2], h, s: textos[i], ang: 90, ah: 'c', av: 'base' });
  return out;
}

/** Marca de nível: triângulo com o vértice na linha, cota (m) e nome acima. */
export function nivel(x: number, y: number, texto: string, c: Camada = 'COTA'): Prim[] {
  return [
    { t: 'pl', c, pts: [[x, y], [x - 1.4, y + 2.2], [x + 1.4, y + 2.2]], fechada: true },
    { t: 'pl', c, pts: [[x - 1.4, y + 2.2], [x + 14, y + 2.2]] },
    txt('TEXTO', x + 2, y + 2.9, 2, texto, 'e', 'base'),
  ];
}

// ---------------- tabelas na coluna da direita ----------------

export interface ColunaTabela { w: number; rot: string; ah?: 'e' | 'c' | 'd' }
export interface BlocoTabela {
  titulo: string;
  cols: ColunaTabela[];
  linhas: string[][];
  /** Linhas de largura total no fim (totais). */
  rodape?: string[];
  /** Sem linha de cabeçalho das colunas (notas). */
  semCabecalho?: boolean;
}
const HL = 4.5;

/** Quebra um texto em linhas que cabem na largura (mm) com altura h. */
export function quebrar(s: string, w: number, h: number): string[] {
  const max = Math.max(10, Math.floor(w / (h * 0.8))), out: string[] = [];
  let l = '';
  for (const p of s.split(' ')) { if ((l + ' ' + p).trim().length > max && l) { out.push(l); l = p; } else l = (l + ' ' + p).trim(); }
  if (l) out.push(l);
  return out;
}

/** Bloco de notas (uma coluna, sem cabeçalho), com quebra de linha. */
export const notas = (linhas: string[], titulo = 'NOTAS'): BlocoTabela => ({ titulo, cols: [{ w: LARGURA_LEGENDA, rot: '', ah: 'e' }], linhas: linhas.flatMap((l) => quebrar(l, LARGURA_LEGENDA - 4, 1.8)).map((l) => [l]), semCabecalho: true });

export const COLS_TABELA_ACO: ColunaTabela[] = [{ w: 20, rot: 'POS' }, { w: 28, rot: 'AÇO' }, { w: 24, rot: 'φ (mm)' }, { w: 30, rot: 'QUANT' }, { w: 36, rot: 'C.UNIT (cm)' }, { w: 40, rot: 'C.TOTAL (m)' }];
export const COLS_RESUMO: (perdas: number) => ColunaTabela[] = (perdas) => [{ w: 30, rot: 'AÇO' }, { w: 26, rot: 'φ (mm)' }, { w: 38, rot: 'C.TOTAL (m)' }, { w: 38, rot: 'PESO (kg)' }, { w: 46, rot: `PESO + ${nf(perdas, 0)} % (kg)` }];

export function tabelaAco(tab: LinhaTabelaAco[]): BlocoTabela {
  return { titulo: 'TABELA DE AÇO', cols: COLS_TABELA_ACO, linhas: tab.map((l) => [l.pos, l.aco, nf(l.phi, 1), String(l.quant), String(l.cUnit), nf(l.cTotal)]) };
}

export function resumoAco(a: AcoPrancha, fck: number): BlocoTabela {
  const porAco = new Map<string, [number, number]>();
  for (const r of a.resumo) { const e = porAco.get(r.aco) ?? [0, 0]; porAco.set(r.aco, [e[0] + r.peso, e[1] + r.pesoComPerdas]); }
  return {
    titulo: 'RESUMO DE AÇO', cols: COLS_RESUMO(a.perdas),
    linhas: a.resumo.map((r) => [r.aco, nf(r.phi, 1), nf(r.comprimento), nf(r.peso), nf(r.pesoComPerdas)]),
    rodape: [
      ...[...porAco.entries()].map(([aco, [p, pp]]) => `PESO ${aco} (kg): ${nf(p)} — com perdas: ${nf(pp)}`),
      `PESO TOTAL (kg): ${nf(a.peso)} — com ${nf(a.perdas, 0)} % de perdas: ${nf(a.pesoComPerdas)}`,
      `VOLUME DE CONCRETO (C${nf(fck, 0)}): ${nf(a.concreto)} m³ · ÁREA DE FORMA: ${nf(a.forma)} m²`,
    ],
  };
}

/** Altura (mm) de um bloco inteiro na coluna. */
export const alturaBloco = (t: BlocoTabela) => HL * (1 + (t.semCabecalho ? 0 : 1) + t.linhas.length + (t.rodape?.length ?? 0)) + 3;

/**
 * Empilha os blocos na coluna acima da legenda (de cima para baixo); o que não cabe continua em novas colunas à
 * esquerda, com o cabeçalho repetido. Devolve as primitivas e a menor abscissa usada (limite do desenho).
 */
export function colunaDeTabelas(moldura: { x0: number; y0: number; x1: number; y1: number }, hLeg: number, blocos: BlocoTabela[]) {
  const prims: Prim[] = [];
  let col = 0, y = moldura.y1 - 2;
  const fundo = () => (col === 0 ? moldura.y0 + hLeg + 6 : moldura.y0 + 3);
  const xCol = () => moldura.x1 - LARGURA_LEGENDA - col * (LARGURA_LEGENDA + 4);
  const novaColuna = () => { col++; y = moldura.y1 - 2; };
  for (const t of blocos) {
    const linhas: ({ cel: string[] } | { span: string })[] = [...t.linhas.map((cel) => ({ cel })), ...(t.rodape ?? []).map((span) => ({ span }))];
    let i = 0, cont = false;
    while (i < linhas.length || (!linhas.length && !cont)) {
      const cab = HL * (1 + (t.semCabecalho ? 0 : 1));
      let cabem = Math.floor((y - fundo() - cab) / HL + 1e-9);
      if (cabem < 1 || (cabem < Math.min(3, linhas.length - i) && y < moldura.y1 - 3)) { novaColuna(); cabem = Math.floor((y - fundo() - cab) / HL + 1e-9); }
      const fatia = linhas.slice(i, i + Math.max(1, cabem));
      const x1 = xCol() + LARGURA_LEGENDA, x0 = x1 - t.cols.reduce((sw, c) => sw + c.w, 0), yt = y, yb = y - cab - fatia.length * HL;
      prims.push(ret('QUADRO', x0, yb, x1, yt));
      prims.push(txt('QUADRO', (x0 + x1) / 2, yt - HL / 2, 2.4, cont ? `${t.titulo} (continuação)` : t.titulo, 'c', 'meio'));
      let yy = yt - HL;
      prims.push({ t: 'pl', c: 'QUADRO', pts: [[x0, yy], [x1, yy]] });
      const xs: number[] = []; let xa = x0; for (const c of t.cols) { xs.push(xa); xa += c.w; }
      if (!t.semCabecalho) {
        t.cols.forEach((c, k) => prims.push(txt('QUADRO', xs[k] + c.w / 2, yy - HL / 2, 1.7, c.rot, 'c', 'meio')));
        yy -= HL; prims.push({ t: 'pl', c: 'QUADRO', pts: [[x0, yy], [x1, yy]] });
      }
      const nCel = fatia.filter((l) => 'cel' in l).length;
      if (t.cols.length > 1 && nCel) for (let k = 1; k < t.cols.length; k++) prims.push({ t: 'pl', c: 'QUADRO', pts: [[xs[k], yy + (t.semCabecalho ? 0 : HL)], [xs[k], yy - nCel * HL]] });
      for (const l of fatia) {
        if ('cel' in l) l.cel.forEach((v, k) => { const c = t.cols[k], ah = c.ah ?? 'c'; prims.push(txt('QUADRO', ah === 'e' ? xs[k] + 1.5 : ah === 'd' ? xs[k] + c.w - 1.5 : xs[k] + c.w / 2, yy - HL / 2, 1.8, v, ah, 'meio')); });
        else { if (yy < yt - HL - 0.01) prims.push({ t: 'pl', c: 'QUADRO', pts: [[x0, yy], [x1, yy]] }); prims.push(txt('QUADRO', x0 + 1.5, yy - HL / 2, 1.8, l.span, 'e', 'meio')); }
        yy -= HL;
      }
      y = yb - 3; i += fatia.length; cont = true;
      if (!linhas.length) break;
    }
  }
  return { prims, xMin: xCol(), colunas: col + 1 };
}

// ---------------- folhas e paginação ----------------

export interface Bloco { prims: Prim[]; w: number; h: number; chaves: Set<string>; nome: string }

/** Normaliza o bloco: canto superior esquerdo da caixa em (0, 0). */
export function bloco(prims: Prim[], chaves: Set<string>, nome: string): Bloco {
  const [x0, y0, x1, y1] = caixaPrims(prims);
  return { prims: mover(prims, -x0, -y1), w: x1 - x0, h: y1 - y0, chaves, nome };
}

/** Área de desenho de uma folha de armação (mm): à esquerda da coluna de tabelas e acima da faixa do título. */
export function areaArmacao(f: Formato) {
  const [W, H] = FORMATOS[f], m = margens(f);
  return { x0: m.esq + 6, y0: m.outras + 16, x1: W - m.outras - LARGURA_LEGENDA - 8, y1: H - m.outras - 5 };
}

/** Formato das folhas de armação: o informado; 'auto' = A1, ou A0 quando algum bloco não cabe. */
export function formatoArmacao(f: Formato | 'auto', blocos: Bloco[]): { formato: Formato; avisos: string[] } {
  const cabe = (x: Formato) => { const a = areaArmacao(x); return blocos.every((bl) => bl.w <= a.x1 - a.x0 + 1e-6 && bl.h <= a.y1 - a.y0 + 1e-6); };
  const forms: Formato[] = f === 'auto' ? ['A1', 'A0'] : [f];
  const ok = forms.find(cabe);
  const formato = ok ?? forms.at(-1)!;
  return { formato, avisos: ok ? [] : [`Elemento maior que a área útil da folha ${formato}: ${blocos.filter((bl) => { const a = areaArmacao(formato); return bl.w > a.x1 - a.x0 || bl.h > a.y1 - a.y0; }).map((bl) => bl.nome).join(', ')}.`] };
}

export interface Colocacao { folha: number; x: number; y: number }

/**
 * Paginação em prateleiras: blocos da esquerda para a direita e de cima para baixo; nova folha quando o bloco não
 * cabe na altura ou quando a tabela de aço passaria de `cap` posições.
 */
export function empacotar(blocos: Bloco[], larg: number, alt: number, cap: number, gap = 10): Colocacao[] {
  const out: Colocacao[] = [];
  let folha = 0, x = 0, yRow = 0, hRow = 0, chaves = new Set<string>(), vazia = true;
  for (const bl of blocos) {
    const uniao = new Set([...chaves, ...bl.chaves]);
    if (!vazia && uniao.size > cap) { folha++; x = 0; yRow = 0; hRow = 0; chaves = new Set(); vazia = true; }
    if (!vazia && x + bl.w > larg) { yRow += hRow + gap; x = 0; hRow = 0; }
    if (!vazia && yRow + bl.h > alt) { folha++; x = 0; yRow = 0; hRow = 0; chaves = new Set(); }
    out.push({ folha, x, y: yRow });
    x += bl.w + gap; hRow = Math.max(hRow, bl.h); vazia = false;
    for (const k of bl.chaves) chaves.add(k);
  }
  return out;
}

/** Linhas da tabela de aço que cabem na coluna junto com as notas e o resumo (estimativa para a paginação). */
export function capacidadeTabela(f: Formato, hLeg: number, blocosFixos: BlocoTabela[], linhasResumo: number) {
  const [, H] = FORMATOS[f], m = margens(f);
  const alt = H - 2 * m.outras - 2 - hLeg - 6 - blocosFixos.reduce((s, t) => s + alturaBloco(t), 0) - (HL * (2 + linhasResumo + 3) + 3) - 2 * HL - 3;
  return Math.max(5, Math.floor(alt / HL));
}

export interface MontagemFolha {
  b: BuildingModel; formato: Formato; tipo: TipoPrancha; titulo: string; conteudo: string; escala: string; escalaNum: number;
  carimbo?: OpcoesCarimbo; desenho: Prim[]; tabelas: BlocoTabela[]; legenda: string; avisos: string[];
  modelo?: Prim[]; janela?: Prancha['janela']; aco?: AcoPrancha; elementos?: string[];
}
export type OpcoesCarimbo = Parameters<typeof folhaECarimbo>[2]['carimbo'];

/** Junta folha, carimbo, coluna de tabelas, título e desenho numa prancha. */
export function montarFolha(m: MontagemFolha): Prancha {
  const fc = folhaECarimbo(m.b, m.formato, { tipo: m.tipo, conteudo: m.conteudo, escala: m.escala, carimbo: m.carimbo });
  const col = colunaDeTabelas(fc.moldura, fc.hLeg, m.tabelas);
  const avisos = [...m.avisos];
  const [W, H] = FORMATOS[m.formato];
  const area = areaArmacao(m.formato);
  if (col.colunas > 1) {
    const [dx0, , dx1] = caixaPrims(m.desenho);
    if ((m.desenho.length && dx1 > col.xMin - 2 && dx0 < col.xMin) || (m.janela && m.janela.x1 > col.xMin - 2)) avisos.push(`As tabelas ocupam ${col.colunas} colunas e invadem a área do desenho: use um formato maior.`);
  }
  const papel: Prim[] = [...fc.papel, ...col.prims, ...m.desenho,
    txt('FOLHA-TEXTO', area.x0, fc.moldura.y0 + 9, 4.5, m.conteudo), txt('FOLHA-TEXTO', area.x0, fc.moldura.y0 + 4, 2.5, m.legenda)];
  return { tipo: m.tipo, titulo: m.titulo, formato: m.formato, W, H, escala: m.escalaNum, modelo: m.modelo ?? [], papel, janela: m.janela, avisos, aco: m.aco, elementos: m.elementos };
}

/** Numera a prancha ("folha n de N" no carimbo). */
export function numerarPrancha(pr: Prancha, n: number, total: number) {
  const i = pr.papel.findIndex((q) => q.t === 'txt' && q.c === 'FOLHA-TEXTO' && q.s === 'FOLHA');
  const v = i >= 0 ? pr.papel.slice(i + 1).find((q) => q.t === 'txt' && q.c === 'FOLHA-TEXTO') : undefined;
  if (v && v.t === 'txt') v.s = `${String(n).padStart(2, '0')}/${String(total).padStart(2, '0')}`;
}

// escala automática das plantas a partir de 1:75 (folhas de referência); 1:50 só quando escolhida
const ESCALAS_PLANTA = [75, 100, 125, 200, 250];

/**
 * Formato e escala de uma planta (caixa em m) na área das pranchas de armação: os fixos; senão o menor formato
 * (A3 a A0) em que cabe em 1:75, depois 1:100, 1:125… Devolve também a janela centrada na geometria.
 */
export function plantaNaFolha(cx: [number, number, number, number], formato: Formato | 'auto', escala: number, folga = 28) {
  const [gx0, gy0, gx1, gy1] = cx;
  const cabe = (f: Formato, e: number) => { const a = areaArmacao(f), k = 1000 / e; return (gx1 - gx0) * k + 2 * folga <= a.x1 - a.x0 && (gy1 - gy0) * k + 2 * folga <= a.y1 - a.y0; };
  const forms: Formato[] = formato !== 'auto' ? [formato] : ['A3', 'A2', 'A1', 'A0'];
  const escs = escala ? [escala] : ESCALAS_PLANTA;
  let f: Formato = forms.at(-1)!, e = escs.at(-1)!, ok = false;
  busca: for (const ee of escs) for (const ff of forms) if (cabe(ff, ee)) { f = ff; e = ee; ok = true; break busca; }
  const a = areaArmacao(f);
  const janela = { x0: a.x0, y0: a.y0, x1: a.x1, y1: a.y1, centro: [(gx0 + gx1) / 2, (gy0 + gy1) / 2] as P };
  return { formato: f, escala: e, janela, avisos: ok ? [] : [`A planta não cabe na folha ${f} em 1:${e}: escolha um formato maior ou outra escala.`] };
}
