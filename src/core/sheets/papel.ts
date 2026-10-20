// Primitivas da prancha no espaço do papel (mm): o desenho do modelo passa pela janela (escala e recorte
// pelo retângulo). Usado pelos escritores que não têm espaço do modelo (PDF e SVG).
import { CAMADAS, modeloParaPapel, type Camada, type P, type Prancha, type Prim } from './prancha';

/** Recorte de um segmento pelo retângulo (Liang–Barsky); null se fica todo fora. */
function recortarSeg(a: P, z: P, x0: number, y0: number, x1: number, y1: number): [P, P] | null {
  let t0 = 0, t1 = 1;
  const dx = z[0] - a[0], dy = z[1] - a[1];
  for (const [p, q] of [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dy, a[1] - y0], [dy, y1 - a[1]]] as const) {
    if (Math.abs(p) < 1e-12) { if (q < 0) return null; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; }
  }
  return [[a[0] + t0 * dx, a[1] + t0 * dy], [a[0] + t1 * dx, a[1] + t1 * dy]];
}

/** Polilinhas recortadas pela janela (as partes de dentro, em sequência). */
function recortarPl(pts: P[], fechada: boolean, j: NonNullable<Prancha['janela']>): P[][] {
  const seq = fechada ? [...pts, pts[0]] : pts, out: P[][] = [];
  let atual: P[] = [];
  for (let i = 0; i + 1 < seq.length; i++) {
    const s = recortarSeg(seq[i], seq[i + 1], j.x0, j.y0, j.x1, j.y1);
    if (!s) { if (atual.length) out.push(atual); atual = []; continue; }
    const ult = atual.at(-1);
    if (!ult || Math.hypot(ult[0] - s[0][0], ult[1] - s[0][1]) > 1e-9) { if (atual.length) out.push(atual); atual = [s[0]]; }
    atual.push(s[1]);
  }
  if (atual.length > 1) out.push(atual);
  return out;
}

const dentro = (p: P, j: NonNullable<Prancha['janela']>) => p[0] >= j.x0 && p[0] <= j.x1 && p[1] >= j.y0 && p[1] <= j.y1;

/** Todas as primitivas no papel, na ordem de desenho: modelo (recortado) e depois folha. */
export function primitivasNoPapel(pr: Prancha): Prim[] {
  const T = modeloParaPapel(pr), s = 1000 / pr.escala, j = pr.janela, out: Prim[] = [];
  if (j) for (const q of pr.modelo) {
    if (q.t === 'pl') {
      const pts = q.pts.map(T);
      if (pts.every((p) => dentro(p, j))) out.push({ ...q, pts });
      else for (const parte of recortarPl(pts, !!q.fechada, j)) out.push({ t: 'pl', c: q.c, pts: parte });
    } else if (q.t === 'hach') {
      const pts = q.pts.map(T);
      if (pts.every((p) => dentro(p, j))) out.push({ ...q, pts });
    } else if (q.t === 'circ') {
      const c = T(q.centro);
      if (dentro(c, j)) out.push({ ...q, centro: c, r: q.r * s });
    } else {
      const p = T(q.p);
      if (dentro(p, j)) out.push({ ...q, p, h: q.h * s });
    }
  }
  out.push(...pr.papel);
  return out;
}

/** Camadas usadas, na ordem do catálogo. */
export const camadasUsadas = (prims: Prim[]) => (Object.keys(CAMADAS) as Camada[]).filter((c) => prims.some((p) => p.c === c));

/** Deslocamento da linha de base para o alinhamento vertical (altura h das maiúsculas). */
export const dyBase = (av: 'base' | 'meio' | 'topo' | undefined, h: number) => (av === 'meio' ? -h / 2 : av === 'topo' ? -h : 0);
