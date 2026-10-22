// Importação de texto de cargas nos arranques (L1, C1.41 a C1.43): lê uma tabela de texto (colunas fixas, vírgula,
// ponto e vírgula ou tabulação), converte as unidades e gera os comandos de uma obra só de arranques.
// Função pura: não toca no modelo. Os ids previstos seguem a mesma contagem de `seq` dos comandos aplicados.
import type { Cmd } from './assistente';

export type Separador = 'auto' | 'virgula' | 'pontoVirgula' | 'tab' | 'colunas';
export type SepUsado = Exclude<Separador, 'auto'>;
export type CampoArranque = 'pilar' | 'caso' | 'N' | 'Hx' | 'Hy' | 'Mx' | 'My' | 'bx' | 'by' | 'x' | 'y';
/** Índice (0-based) da coluna de cada campo; ausente = coluna não usada. */
export type Mapeamento = Partial<Record<CampoArranque, number>>;
export interface UnidadesTexto {
  forca: 'kN' | 'tf' | 'kgf' | 'N';
  momento: 'kN·m' | 'tf·m' | 'kgf·m' | 'kN·cm' | 'tf·cm' | 'kgf·cm';
  comprimento: 'm' | 'cm' | 'mm';
  /** true: N positivo é compressão (convenção do `carga.pilar`); false: N positivo é tração (o sinal é invertido). */
  compressaoPositiva: boolean;
}
export const UNIDADES_PADRAO: UnidadesTexto = { forca: 'kN', momento: 'kN·m', comprimento: 'cm', compressaoPositiva: true };
export interface Tabela { linhas: string[][]; separador: SepUsado }
export interface HipoteseImp { nome: string; natureza: 'G' | 'Q' | 'W' | 'E' }
export interface CargaImp { caso: string; N: number; Hx: number; Hy: number; Mx: number; My: number }
export interface ArranqueImp { nome: string; x?: number; y?: number; bx: number; by: number; cargas: CargaImp[] }
export interface ResultadoArranques { hipoteses: HipoteseImp[]; arranques: ArranqueImp[]; avisos: string[]; erros: string[] }

const FATOR_FORCA: Record<UnidadesTexto['forca'], number> = { kN: 1, tf: 9.80665, kgf: 0.00980665, N: 0.001 };
const FATOR_MOMENTO: Record<UnidadesTexto['momento'], number> = {
  'kN·m': 1, 'tf·m': 9.80665, 'kgf·m': 0.00980665, 'kN·cm': 0.01, 'tf·cm': 0.0980665, 'kgf·cm': 0.0000980665,
};
const FATOR_COMPRIMENTO: Record<UnidadesTexto['comprimento'], number> = { m: 1, cm: 0.01, mm: 0.001 };

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Número em texto: aceita milhar com ponto ou vírgula e decimal com vírgula ou ponto. Inválido = NaN. */
export function parseNumero(s: string): number {
  let t = String(s ?? '').trim().replace(/\s+/g, '');
  if (!t) return NaN;
  const iv = t.lastIndexOf(',');
  const ip = t.lastIndexOf('.');
  if (iv >= 0 && ip >= 0) {
    t = iv > ip ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  } else if (iv >= 0) {
    t = t.replace(',', '.');
  }
  return Number(t);
}

const limpaCelula = (c: string) => {
  let t = c.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) t = t.slice(1, -1).trim();
  return t;
};

/** Lê a tabela: ignora linhas vazias; separador `auto` pela primeira linha e pelas cinco primeiras. */
export function lerTabela(texto: string, opc: { separador?: Separador; larguras?: number[] } = {}): Tabela {
  const brutas = texto.split(/\r?\n/).filter((l) => l.trim() !== '');
  const s = opc.separador ?? 'auto';
  let sep: SepUsado;
  if (s !== 'auto') sep = s;
  else if (!brutas.length) sep = 'colunas';
  else if (brutas[0].includes(';')) sep = 'pontoVirgula';
  else if (brutas[0].includes('\t')) sep = 'tab';
  else {
    const cont = brutas.slice(0, 5).map((l) => l.split(',').length);
    sep = cont[0] >= 2 && cont.every((c) => c === cont[0]) ? 'virgula' : 'colunas';
  }
  const linhas = brutas.map((l) => {
    if (sep === 'colunas' && opc.larguras) {
      const out: string[] = [];
      let pos = 0;
      for (const w of opc.larguras) { out.push(l.slice(pos, pos + w)); pos += w; }
      if (l.slice(pos).trim()) out.push(l.slice(pos));
      return out.map(limpaCelula);
    }
    const partes = sep === 'pontoVirgula' ? l.split(';') : sep === 'virgula' ? l.split(',') : sep === 'tab' ? l.split('\t') : l.trim().split(/\s+/);
    return partes.map(limpaCelula);
  });
  return { linhas, separador: sep };
}

const REGRAS: [CampoArranque, string[]][] = [
  ['pilar', ['pilar', 'apoio', 'no', 'arranque']],
  ['caso', ['caso', 'hipotese', 'carga', 'acao']],
  ['N', ['n', 'fz', 'normal', 'axial']],
  ['Hx', ['hx', 'fx', 'h x']],
  ['Hy', ['hy', 'fy']],
  ['Mx', ['mx']],
  ['My', ['my']],
  ['bx', ['bx', 'b', 'largura', 'lado x']],
  ['by', ['by', 'h', 'altura', 'lado y']],
  ['x', ['x']],
  ['y', ['y']],
];

/** Sugere o mapeamento pelos títulos (minúsculas, sem acento). O primeiro título que casa com um campo vence. */
export function sugerirMapeamento(cabecalho: string[]): Mapeamento {
  const map: Mapeamento = {};
  cabecalho.forEach((titulo, i) => {
    const t = semAcento(titulo);
    for (const [campo, aceitos] of REGRAS) {
      if (map[campo] === undefined && aceitos.includes(t)) { map[campo] = i; break; }
    }
  });
  return map;
}

type Bruto = { pilar: string; caso: string; N: number; Hx: number; Hy: number; Mx: number; My: number; bx?: number; by?: number; x?: number; y?: number };
const CAMPOS_NUM = ['N', 'Hx', 'Hy', 'Mx', 'My', 'bx', 'by', 'x', 'y'] as const;

/** Natureza pela hipótese (nome em minúsculas, sem acento): permanente G, vento W, sismo E, senão variável Q. */
function naturezaDe(nome: string): HipoteseImp['natureza'] {
  const s = semAcento(nome);
  if (/^g$|perm|peso|^pp|^cp/.test(s)) return 'G';
  if (/vent|^w/.test(s)) return 'W';
  if (/sism|^e$/.test(s)) return 'E';
  return 'Q';
}

export function importarArranques(texto: string, map: Mapeamento, un: UnidadesTexto = UNIDADES_PADRAO, opc: { separador?: Separador; larguras?: number[]; cabecalho?: boolean } = {}): ResultadoArranques {
  const avisos: string[] = [];
  const erros: string[] = [];
  if (map.pilar === undefined || map.caso === undefined || map.N === undefined) {
    erros.push('Mapeie as colunas Pilar, Caso e N.');
    return { hipoteses: [], arranques: [], avisos, erros };
  }
  const tab = lerTabela(texto, { separador: opc.separador, larguras: opc.larguras });
  // Número da linha no arquivo (1-based), na mesma ordem das linhas da tabela (linhas vazias já fora).
  const numeros = texto.split(/\r?\n/).map((t, i) => ({ t, n: i + 1 })).filter((x) => x.t.trim() !== '').map((x) => x.n);
  const comCabecalho = opc.cabecalho ?? true;
  const dados = tab.linhas.map((l, k) => ({ l, n: numeros[k] })).slice(comCabecalho ? 1 : 0);

  const fF = FATOR_FORCA[un.forca];
  const fM = FATOR_MOMENTO[un.momento];
  const fL = FATOR_COMPRIMENTO[un.comprimento];
  const cel = (l: string[], campo: CampoArranque) => {
    const i = map[campo];
    return i === undefined ? '' : (l[i] ?? '').trim();
  };
  const regs: Bruto[] = [];
  for (const { l, n } of dados) {
    const pilar = cel(l, 'pilar');
    const caso = cel(l, 'caso');
    if (!pilar || !caso) { avisos.push(`Linha ${n}: pilar ou caso vazio, ignorada.`); continue; }
    const v: Partial<Record<(typeof CAMPOS_NUM)[number], number>> = {};
    let invalido = false;
    for (const c of CAMPOS_NUM) {
      const t = cel(l, c);
      if (t === '') continue;
      const num = parseNumero(t);
      if (!Number.isFinite(num)) { invalido = true; break; }
      v[c] = num;
    }
    if (invalido) { avisos.push(`Linha ${n}: número inválido, ignorada.`); continue; }
    const N = (v.N ?? 0) * fF * (un.compressaoPositiva ? 1 : -1) || 0;
    const Hx = (v.Hx ?? 0) * fF || 0;
    const Hy = (v.Hy ?? 0) * fF || 0;
    const Mx = (v.Mx ?? 0) * fM || 0;
    const My = (v.My ?? 0) * fM || 0;
    if (N === 0 && Hx === 0 && Hy === 0 && Mx === 0 && My === 0) { avisos.push(`Linha ${n}: todos os esforços nulos, ignorada.`); continue; }
    regs.push({
      pilar, caso, N, Hx, Hy, Mx, My,
      bx: v.bx !== undefined ? v.bx * fL : undefined,
      by: v.by !== undefined ? v.by * fL : undefined,
      x: v.x !== undefined ? v.x * fL : undefined,
      y: v.y !== undefined ? v.y * fL : undefined,
    });
  }

  // Agrupa por pilar (ordem de aparição) e monta as hipóteses (nomes únicos de caso).
  const ordem: string[] = [];
  const porPilar = new Map<string, Bruto[]>();
  for (const r of regs) {
    if (!porPilar.has(r.pilar)) { porPilar.set(r.pilar, []); ordem.push(r.pilar); }
    porPilar.get(r.pilar)!.push(r);
  }
  const hipoteses: HipoteseImp[] = [];
  const nomesHip = new Set<string>();
  for (const r of regs) {
    if (nomesHip.has(r.caso)) continue;
    nomesHip.add(r.caso);
    hipoteses.push({ nome: r.caso, natureza: naturezaDe(r.caso) });
  }

  const arranques: ArranqueImp[] = ordem.map((nome) => {
    const rs = porPilar.get(nome)!;
    const comDim = rs.find((r) => r.bx !== undefined && r.by !== undefined);
    if (!comDim) avisos.push(`Pilar ${nome}: dimensões da base não informadas, usado 30 × 30 cm [a confirmar].`);
    return {
      nome,
      x: rs.find((r) => r.x !== undefined)?.x,
      y: rs.find((r) => r.y !== undefined)?.y,
      bx: comDim ? comDim.bx! : 0.3,
      by: comDim ? comDim.by! : 0.3,
      cargas: rs.map((r) => ({ caso: r.caso, N: r.N, Hx: r.Hx, Hy: r.Hy, Mx: r.Mx, My: r.My })),
    };
  });
  if (arranques.some((a) => a.x === undefined || a.y === undefined)) {
    arranques.forEach((a, k) => {
      if (a.x === undefined || a.y === undefined) { a.x = 5 * k; a.y = 0; }
    });
    avisos.push('Posição dos arranques não informada: lançados em linha, 5 m entre eixos; ajuste na planta.');
  }
  return { hipoteses, arranques, avisos, erros };
}

/** Comandos da obra só de arranques (ids previstos por `seq`, como em `gerarObra`). */
export function comandosArranques(r: ResultadoArranques, nomeObra: string, seqInicial = 0): Cmd[] {
  if (r.erros.length) return [];
  let seq = seqInicial;
  const novoId = (pre: string) => `${pre}_${(++seq).toString(36)}`;
  const v6 = (x: number) => +x.toFixed(6);
  const cmds: Cmd[] = [{ nome: 'obra.definir', params: { nome: nomeObra.trim(), origem: 'texto' } }];
  const casoId = new Map<string, string>();
  for (const h of r.hipoteses) {
    const U = h.nome.toUpperCase();
    if (U === 'G' || U === 'Q') continue;
    casoId.set(h.nome, novoId('cs'));
    cmds.push({ nome: 'caso.criar', params: { nome: h.nome, natureza: h.natureza } });
  }
  for (const a of r.arranques) {
    const pid = novoId('p');
    cmds.push({ nome: 'pilar.inserir', params: { x: a.x, y: a.y, secao: { tipo: 'ret', b: v6(a.bx), h: v6(a.by) }, nasce: 'fundacao', morre: 'fundacao', nome: a.nome } });
    for (const c of a.cargas) {
      if ([c.N, c.Hx, c.Hy, c.Mx, c.My].every((x) => x === 0)) continue;
      const U = c.caso.toUpperCase();
      const caso = U === 'G' || U === 'Q' ? U : casoId.get(c.caso)!;
      seq++; // carga.pilar consome 1 no aplicar
      cmds.push({ nome: 'carga.pilar', params: { pilar: pid, caso, N: v6(c.N), Hx: v6(c.Hx), Hy: v6(c.Hy), Mx: v6(c.Mx), My: v6(c.My) } });
    }
  }
  return cmds;
}
