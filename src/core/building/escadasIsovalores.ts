// Escadas (E4e, C8.51): campos de isovalores de um lance a partir do cálculo da E4c com detalhe (`calcularEscadas(b, { detalhe: true })`):
// deslocamento vertical (nós) e esforços da casca (Mx, My, Mxy, Qx, Qy e |Q|, por elemento, suavizados nos nós). Cada elemento de 6 nós
// vira 4 triângulos; o valor do triângulo é a média dos três nós. Núcleo puro: a interface desenha o mapa na planta do lance (coordenadas do
// modelo local do lance, x no sentido da subida do primeiro trecho) e na vista 3D (projeção isométrica em ordem de profundidade).
import type { ResultadoLance } from './escadasCalculo';

export type GrandezaEscada = 'uz' | 'Mx' | 'My' | 'Mxy' | 'Qx' | 'Qy' | 'Qmax';
/** G, Q ou a combinação: G + Q (deslocamento, serviço) e γg·G + γq·Q (esforços, ELU). */
export type CasoEscadaIso = 'G' | 'Q' | 'comb';
export const GRANDEZAS_ESCADA: { v: GrandezaEscada; label: string; unidade: string }[] = [
  { v: 'uz', label: 'Deslocamento vertical', unidade: 'mm' },
  { v: 'Mx', label: 'Mx (sentido da subida)', unidade: 'kN·m/m' }, { v: 'My', label: 'My (transversal)', unidade: 'kN·m/m' }, { v: 'Mxy', label: 'Mxy (torção)', unidade: 'kN·m/m' },
  { v: 'Qx', label: 'Qx', unidade: 'kN/m' }, { v: 'Qy', label: 'Qy', unidade: 'kN/m' }, { v: 'Qmax', label: '|Q| (cortante total)', unidade: 'kN/m' },
];
export type V3 = [number, number, number];
export interface TriIsoEscada { v: [V3, V3, V3]; valor: number }
export interface CampoEscada {
  tris: TriIsoEscada[];
  min: number; max: number;
  unidade: string;
  titulo: string;
  /** Caixa da planta [x0, y0, x1, y1] e da cota [z0, z1] (m). */
  caixa: [number, number, number, number]; z: [number, number];
}

const NOME_CASO: Record<CasoEscadaIso, (g: GrandezaEscada) => string> = { G: () => 'G (permanente)', Q: () => 'Q (variável)', comb: (g) => (g === 'uz' ? 'G + Q (serviço)' : 'γg·G + γq·Q (ELU)') };

/** Campo do lance; `undefined` se o resultado não traz o detalhe (malha) ou o lance tem erro. */
export function campoLance(l: ResultadoLance, grandeza: GrandezaEscada, caso: CasoEscadaIso, gm: { g: number; q: number }): CampoEscada | undefined {
  const nos = l.nosDetalhe, tri = l.triangulosDetalhe;
  if (!nos?.length || !tri?.length || l.erro) return undefined;
  const info = GRANDEZAS_ESCADA.find((x) => x.v === grandeza)!;
  const fg = caso === 'Q' ? 0 : caso === 'G' ? 1 : gm.g, fq = caso === 'G' ? 0 : caso === 'Q' ? 1 : gm.q;
  let nodal: number[];
  if (grandeza === 'uz') {
    // deslocamento para baixo positivo, em mm; combinação de serviço G + Q
    const a = caso === 'G' ? 1 : caso === 'Q' ? 0 : 1, b = caso === 'G' ? 0 : 1;
    nodal = nos.map((n) => -(a * n.uz[0] + b * n.uz[1]) * 1000);
  } else {
    const val = (k: number): number => {
      const e = l.elems[k], i = grandeza === 'Mx' ? 3 : grandeza === 'My' ? 4 : grandeza === 'Mxy' ? 5 : grandeza === 'Qx' ? 6 : grandeza === 'Qy' ? 7 : -1;
      if (i >= 0) return fg * e.G[i] + fq * e.Q[i];
      return Math.hypot(fg * e.G[6] + fq * e.Q[6], fg * e.G[7] + fq * e.Q[7]);
    };
    // suavização: média dos elementos que concorrem em cada nó de vértice; nós de meio de lado = média dos vértices do lado
    const soma = new Array(nos.length).fill(0), cont = new Array(nos.length).fill(0);
    tri.forEach((t, k) => { const v = val(k); for (const n of t.slice(0, 3)) { soma[n] += v; cont[n]++; } });
    nodal = nos.map((_, n) => (cont[n] ? soma[n] / cont[n] : 0));
    tri.forEach((t) => { [[3, 0, 1], [4, 1, 2], [5, 2, 0]].forEach(([m, a, b]) => { nodal[t[m]] = (nodal[t[a]] + nodal[t[b]]) / 2; }); });
  }
  const P = (n: number): V3 => [nos[n].x, nos[n].y, nos[n].z];
  const tris: TriIsoEscada[] = [];
  for (const t of tri) {
    const [a, b, c, ab, bc, ca] = t;
    for (const q of [[a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]]) tris.push({ v: [P(q[0]), P(q[1]), P(q[2])], valor: (nodal[q[0]] + nodal[q[1]] + nodal[q[2]]) / 3 });
  }
  const xs = nos.map((n) => n.x), ys = nos.map((n) => n.y), zs = nos.map((n) => n.z), vs = tris.map((x) => x.valor);
  return {
    tris, min: Math.min(...vs), max: Math.max(...vs), unidade: info.unidade, titulo: `${l.nome}, lance ${l.lance}: ${info.label}, ${NOME_CASO[caso](grandeza)}`,
    caixa: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], z: [Math.min(...zs), Math.max(...zs)],
  };
}

/** Projeção isométrica dos triângulos (azimute e elevação em graus), do fundo para a frente, com y do papel para baixo (SVG). */
export function projetarCampo(c: CampoEscada, azimute = -50, elevacao = 28): { pts: [number, number][]; valor: number }[] & { caixa?: [number, number, number, number] } {
  const az = (azimute * Math.PI) / 180, el = (elevacao * Math.PI) / 180;
  const cx = (c.caixa[0] + c.caixa[2]) / 2, cy = (c.caixa[1] + c.caixa[3]) / 2, cz = (c.z[0] + c.z[1]) / 2;
  const proj = (p: V3): { x: number; y: number; prof: number } => {
    const x = p[0] - cx, y = p[1] - cy, z = p[2] - cz;
    const u = x * Math.cos(az) - y * Math.sin(az), v = x * Math.sin(az) + y * Math.cos(az); // v: profundidade horizontal (positivo = longe)
    return { x: u, y: -(z * Math.cos(el) + v * Math.sin(el)), prof: v * Math.cos(el) - z * Math.sin(el) };
  };
  const lista = c.tris.map((t) => { const q = t.v.map(proj); return { pts: q.map((r) => [r.x, r.y] as [number, number]), valor: t.valor, prof: (q[0].prof + q[1].prof + q[2].prof) / 3 }; });
  lista.sort((a, b) => b.prof - a.prof);
  const out = lista.map(({ pts, valor }) => ({ pts, valor })) as { pts: [number, number][]; valor: number }[] & { caixa?: [number, number, number, number] };
  const xs = lista.flatMap((t) => t.pts.map((p) => p[0])), ys = lista.flatMap((t) => t.pts.map((p) => p[1]));
  out.caixa = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  return out;
}
