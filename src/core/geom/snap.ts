// Capturas (snaps) sobre segmentos e arcos com índice espacial (Flatbush), entrada digitada e restrição ortogonal/polar.
// Puro: a planta monta os índices (máscara e modelo) e consulta a cada movimento do cursor.
import Flatbush from 'flatbush';

export type TipoCaptura = 'extremidade' | 'intersecao' | 'meio' | 'centro' | 'quadrante' | 'alinhamento' | 'perpendicular' | 'proximo';
/**
 * Prioridade entre capturas (premissa 32 da spec): menor vence; empate pela distância ao cursor.
 * O alinhamento (rastreamento de referências) fica abaixo das capturas exatas (extremidade, interseção, meio, centro, quadrante)
 * e acima de perpendicular e mais próximo, que valem em qualquer ponto de uma linha e o esconderiam.
 */
export const PRIORIDADE: TipoCaptura[] = ['extremidade', 'intersecao', 'meio', 'centro', 'quadrante', 'alinhamento', 'perpendicular', 'proximo'];
export const TODAS = new Set<TipoCaptura>(PRIORIDADE);

/** Guia de alinhamento: do ponto de referência `de` até o ponto capturado `para`. */
export interface Guia { de: [number, number]; para: [number, number]; eixo: 'x' | 'y' }
export interface Captura { tipo: TipoCaptura; x: number; y: number; d: number; guias?: Guia[] }

const norm = (a: number) => ((a % 360) + 360) % 360;
/** Ângulo (graus) está no arco anti-horário de a0 a a1? */
function noArco(a: number, a0: number, a1: number) {
  const sw = a1 - a0;
  if (sw >= 360 - 1e-9) return true;
  return norm(a - a0) <= norm(sw) + 1e-9;
}

export class IndiceCaptura {
  readonly segs: Float64Array;
  readonly arcos: Float64Array;
  private ns: number;
  private idx: Flatbush | null;

  /** segs: [x1, y1, x2, y2, ...]; arcos: [cx, cy, r, a0, a1, ...] (graus). Coordenadas do mundo (m). */
  constructor(segs: ArrayLike<number>, arcos: ArrayLike<number> = []) {
    this.segs = Float64Array.from(segs);
    this.arcos = Float64Array.from(arcos);
    this.ns = this.segs.length / 4;
    const n = this.ns + this.arcos.length / 5;
    this.idx = n ? new Flatbush(n) : null;
    if (!this.idx) return;
    const s = this.segs, a = this.arcos;
    for (let i = 0; i < this.ns; i++) this.idx.add(Math.min(s[4 * i], s[4 * i + 2]), Math.min(s[4 * i + 1], s[4 * i + 3]), Math.max(s[4 * i], s[4 * i + 2]), Math.max(s[4 * i + 1], s[4 * i + 3]));
    for (let i = 0; i < a.length; i += 5) this.idx.add(a[i] - a[i + 2], a[i + 1] - a[i + 2], a[i] + a[i + 2], a[i + 1] + a[i + 2]);
    this.idx.finish();
  }

  get tamanho() { return this.ns + this.arcos.length / 5; }

  /** Capturas a até `raio` do cursor, ordenadas por prioridade e distância. `ref` = ponto anterior (perpendicular). */
  consultar(x: number, y: number, raio: number, modos: Set<TipoCaptura> = TODAS, ref?: [number, number]): Captura[] {
    if (!this.idx) return [];
    const out: Captura[] = [];
    const add = (tipo: TipoCaptura, px: number, py: number) => {
      if (!modos.has(tipo)) return;
      const d = Math.hypot(px - x, py - y);
      if (d <= raio || tipo === 'centro') out.push({ tipo, x: px, y: py, d });
    };
    const ids = this.idx.search(x - raio, y - raio, x + raio, y + raio);
    const s = this.segs, a = this.arcos;
    const perto: number[] = [];
    for (const id of ids) {
      if (id < this.ns) {
        const x1 = s[4 * id], y1 = s[4 * id + 1], x2 = s[4 * id + 2], y2 = s[4 * id + 3];
        const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy;
        const t = L2 ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / L2)) : 0;
        if (Math.hypot(x1 + t * dx - x, y1 + t * dy - y) > raio) continue;
        perto.push(id);
        add('extremidade', x1, y1); add('extremidade', x2, y2); add('meio', (x1 + x2) / 2, (y1 + y2) / 2);
        add('proximo', x1 + t * dx, y1 + t * dy);
        if (ref && L2) { const u = ((ref[0] - x1) * dx + (ref[1] - y1) * dy) / L2; if (u >= 0 && u <= 1) add('perpendicular', x1 + u * dx, y1 + u * dy); }
      } else {
        const k = (id - this.ns) * 5, cx = a[k], cy = a[k + 1], r = a[k + 2], a0 = a[k + 3], a1 = a[k + 4];
        const ang = (Math.atan2(y - cy, x - cx) * 180) / Math.PI;
        if (!noArco(ang, a0, a1) || Math.abs(Math.hypot(x - cx, y - cy) - r) > raio) {
          // fora do traço: ainda vale extremidade do arco perto do cursor
          if (a1 - a0 < 360 - 1e-9) for (const e of [a0, a1]) { const q = (e * Math.PI) / 180; if (Math.hypot(cx + r * Math.cos(q) - x, cy + r * Math.sin(q) - y) <= raio) add('extremidade', cx + r * Math.cos(q), cy + r * Math.sin(q)); }
          continue;
        }
        const q = (ang * Math.PI) / 180;
        add('proximo', cx + r * Math.cos(q), cy + r * Math.sin(q));
        add('centro', cx, cy);
        for (const qd of [0, 90, 180, 270]) if (noArco(qd, a0, a1)) add('quadrante', cx + r * Math.cos((qd * Math.PI) / 180), cy + r * Math.sin((qd * Math.PI) / 180));
        if (a1 - a0 < 360 - 1e-9) {
          for (const e of [a0, a1]) add('extremidade', cx + r * Math.cos((e * Math.PI) / 180), cy + r * Math.sin((e * Math.PI) / 180));
          const m = ((a0 + (a1 - a0) / 2) * Math.PI) / 180;
          add('meio', cx + r * Math.cos(m), cy + r * Math.sin(m));
        }
        if (ref) { const qr = Math.atan2(ref[1] - cy, ref[0] - cx); add('perpendicular', cx + r * Math.cos(qr), cy + r * Math.sin(qr)); }
      }
    }
    if (modos.has('intersecao'))
      for (let i = 0; i < perto.length; i++) for (let j = i + 1; j < perto.length; j++) {
        const p = intersecaoSegmentos(s, perto[i], perto[j]);
        if (p) add('intersecao', p[0], p[1]);
      }
    return ordenar(out, raio);
  }
}

function intersecaoSegmentos(s: Float64Array, i: number, j: number): [number, number] | null {
  const x1 = s[4 * i], y1 = s[4 * i + 1], x2 = s[4 * i + 2], y2 = s[4 * i + 3];
  const x3 = s[4 * j], y3 = s[4 * j + 1], x4 = s[4 * j + 2], y4 = s[4 * j + 3];
  const d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  const L = Math.hypot(x2 - x1, y2 - y1) * Math.hypot(x4 - x3, y4 - y3);
  if (!L || Math.abs(d) < 1e-12 * L) return null;
  const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d, u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d;
  const e = 1e-9;
  return t >= -e && t <= 1 + e && u >= -e && u <= 1 + e ? [x1 + t * (x2 - x1), y1 + t * (y2 - y1)] : null;
}

/**
 * Ordena por prioridade e distância e remove repetidos (mesmo ponto, mesmo tipo).
 * Capturas fora do raio (o centro, quando o cursor está sobre o traço do arco) vêm depois das de dentro.
 */
export function ordenar(c: Captura[], raio = Infinity): Captura[] {
  const vistos = new Set<string>();
  return c
    .sort((p, q) => Number(p.d > raio) - Number(q.d > raio) || PRIORIDADE.indexOf(p.tipo) - PRIORIDADE.indexOf(q.tipo) || p.d - q.d)
    .filter((p) => { const k = `${p.tipo}:${p.x.toFixed(6)}:${p.y.toFixed(6)}`; if (vistos.has(k)) return false; vistos.add(k); return true; });
}

/**
 * Restringe a direção ref→p a múltiplos de `passo` graus (90 = ortogonal; 15 = polar).
 * Devolve o ponto projetado na direção mais próxima.
 */
export function restringir(ref: [number, number], p: [number, number], passo: number): [number, number] {
  const dx = p[0] - ref[0], dy = p[1] - ref[1];
  const L = Math.hypot(dx, dy);
  if (!L) return p;
  const a = Math.round(Math.atan2(dy, dx) / ((passo * Math.PI) / 180)) * ((passo * Math.PI) / 180);
  const t = dx * Math.cos(a) + dy * Math.sin(a);
  return [ref[0] + t * Math.cos(a), ref[1] + t * Math.sin(a)];
}

const n = (t: string) => parseFloat(t.trim().replace(',', '.'));

/**
 * Ponto digitado (vírgula decimal, separador ";"):
 * "x;y" absoluto · "@dx;dy" relativo ao ponto anterior · "@d<ang" polar (graus, anti-horário a partir de +x) ·
 * "d" distância na direção do cursor. Devolve null se o texto não for válido.
 */
export function pontoDigitado(texto: string, ref: [number, number] | null, cursor: [number, number]): [number, number] | null {
  const t = texto.trim();
  if (!t) return null;
  let m: RegExpExecArray | null;
  if ((m = /^@\s*([-+\d.,]+)\s*<\s*([-+\d.,]+)$/.exec(t))) {
    if (!ref) return null;
    const d = n(m[1]), a = (n(m[2]) * Math.PI) / 180;
    return Number.isFinite(d) && Number.isFinite(a) ? [ref[0] + d * Math.cos(a), ref[1] + d * Math.sin(a)] : null;
  }
  if ((m = /^(@?)\s*([-+\d.,]+)\s*;\s*([-+\d.,]+)$/.exec(t))) {
    const x = n(m[2]), y = n(m[3]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    if (m[1]) return ref ? [ref[0] + x, ref[1] + y] : null;
    return [x, y];
  }
  if (/^[-+\d.,]+$/.test(t) && ref) {
    const d = n(t), dx = cursor[0] - ref[0], dy = cursor[1] - ref[1], L = Math.hypot(dx, dy);
    return Number.isFinite(d) && L ? [ref[0] + (d * dx) / L, ref[1] + (d * dy) / L] : null;
  }
  return null;
}

/**
 * Rastreamento de alinhamento: pontos de referência (centros e cantos de pilares, extremidades de vigas, nós e eixos)
 * indexados em duas listas ordenadas (por X e por Y); a consulta é uma busca binária, sem varrer todos os elementos.
 * Cursor com X (ou Y) dentro de `raio` do X (Y) de uma referência prende essa coordenada; com X de uma e Y de outra,
 * prende na interseção das duas guias.
 */
export class IndiceAlinhamento {
  private readonly px: Float64Array;
  private readonly py: Float64Array;
  private readonly porX: Uint32Array;
  private readonly porY: Uint32Array;

  /** pontos: [x, y, x, y, ...] em m (repetidos são descartados). */
  constructor(pontos: ArrayLike<number>) {
    const vistos = new Set<string>(), px: number[] = [], py: number[] = [];
    for (let i = 0; i + 1 < pontos.length; i += 2) {
      const k = `${pontos[i].toFixed(6)}:${pontos[i + 1].toFixed(6)}`;
      if (vistos.has(k)) continue;
      vistos.add(k); px.push(pontos[i]); py.push(pontos[i + 1]);
    }
    this.px = Float64Array.from(px); this.py = Float64Array.from(py);
    const ids = px.map((_, i) => i);
    this.porX = Uint32Array.from(ids.sort((a, b) => px[a] - px[b]));
    this.porY = Uint32Array.from(ids.slice().sort((a, b) => py[a] - py[b]));
  }

  get tamanho() { return this.px.length; }

  /** Referência de menor |Δ| na coordenada `c` (eixo `x` ou `y`) até `raio`; empate pela distância na outra coordenada. */
  private melhor(eixo: 'x' | 'y', c: number, o: number, raio: number): [number, number] | null {
    const a = eixo === 'x' ? this.px : this.py, b = eixo === 'x' ? this.py : this.px, ord = eixo === 'x' ? this.porX : this.porY;
    let lo = 0, hi = ord.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (a[ord[m]] < c - raio) lo = m + 1; else hi = m; }
    let melhor = -1, dc = Infinity, dop = Infinity;
    for (let i = lo; i < ord.length && a[ord[i]] <= c + raio; i++) {
      const id = ord[i], d1 = Math.abs(a[id] - c), d2 = Math.abs(b[id] - o);
      if (d1 < dc - 1e-12 || (Math.abs(d1 - dc) <= 1e-12 && d2 < dop)) { melhor = id; dc = d1; dop = d2; }
    }
    return melhor < 0 ? null : [this.px[melhor], this.py[melhor]];
  }

  /**
   * Captura de alinhamento para o cursor (x, y) com tolerância `raio` (m). `extras` = referências avulsas (ex.: o ponto anterior).
   * Devolve null se nenhuma coordenada alinha.
   */
  consultar(x: number, y: number, raio: number, extras: ArrayLike<number> = []): Captura | null {
    let rx = this.melhor('x', x, y, raio), ry = this.melhor('y', y, x, raio);
    for (let i = 0; i + 1 < extras.length; i += 2) {
      const ex = extras[i], ey = extras[i + 1];
      if (Math.abs(ex - x) <= raio && (!rx || Math.abs(ex - x) < Math.abs(rx[0] - x) - 1e-12)) rx = [ex, ey];
      if (Math.abs(ey - y) <= raio && (!ry || Math.abs(ey - y) < Math.abs(ry[1] - y) - 1e-12)) ry = [ex, ey];
    }
    if (!rx && !ry) return null;
    const cx = rx ? rx[0] : x, cy = ry ? ry[1] : y;
    const guias: Guia[] = [];
    if (rx) guias.push({ de: rx, para: [cx, cy], eixo: 'x' });
    if (ry) guias.push({ de: ry, para: [cx, cy], eixo: 'y' });
    return { tipo: 'alinhamento', x: cx, y: cy, d: Math.hypot(cx - x, cy - y), guias };
  }
}

/**
 * Digitação sobre a guia: com uma única guia ativa, um número é a distância medida do ponto de referência
 * ao longo da guia, no sentido do cursor. Com duas guias (interseção) ou texto que não seja só um número, devolve null.
 */
export function distanciaNaGuia(texto: string, c: Captura): [number, number] | null {
  if (c.tipo !== 'alinhamento' || c.guias?.length !== 1 || !/^[-+\d.,\s]+$/.test(texto.trim())) return null;
  const g = c.guias[0];
  return pontoDigitado(texto, g.de, g.para);
}
