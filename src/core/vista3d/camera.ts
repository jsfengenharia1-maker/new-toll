// Câmera da vista 3D (cálculo puro): órbita em torno de um alvo (azimute em torno de z, elevação em torno do eixo
// horizontal), enquadramento, troca entre perspectiva e isométrica preservando o enquadramento, deslocamento lateral
// e o modo caminhar (câmera na altura do olho, dentro dos limites do edifício).
export type V3 = [number, number, number];
export interface Limites { min: V3; max: V3 }
export type Projecao = 'perspectiva' | 'isometrica';

export interface Camera3D {
  alvo: V3;
  /** Distância do alvo à câmera (m). Na ortográfica, define a altura da janela: ±dist·tan(fov/2). */
  dist: number;
  /** Rotação em torno de z (rad); 0 = câmera no lado +x do alvo. */
  azimute: number;
  /** Ângulo acima do plano horizontal (rad), limitado a ±(90° − ε). */
  elevacao: number;
  /** Campo de visão vertical (graus). */
  fov: number;
  projecao: Projecao;
}

export const FOV_PADRAO = 45;
const ELEV_MAX = (89 * Math.PI) / 180;
const grau = (g: number) => (g * Math.PI) / 180;
export const clamp = (v: number, a: number, z: number) => Math.min(z, Math.max(a, v));

export const posicaoCamera = (c: Camera3D): V3 => [
  c.alvo[0] + c.dist * Math.cos(c.elevacao) * Math.cos(c.azimute),
  c.alvo[1] + c.dist * Math.cos(c.elevacao) * Math.sin(c.azimute),
  c.alvo[2] + c.dist * Math.sin(c.elevacao),
];

/** Metade da altura visível no plano do alvo (m): vale para as duas projeções. */
export const metadeAltura = (c: Pick<Camera3D, 'dist' | 'fov'>) => c.dist * Math.tan(grau(c.fov) / 2);

export const centroDe = (l: Limites): V3 => [(l.min[0] + l.max[0]) / 2, (l.min[1] + l.max[1]) / 2, (l.min[2] + l.max[2]) / 2];
export const raioDe = (l: Limites) => Math.max(0.5, Math.hypot(l.max[0] - l.min[0], l.max[1] - l.min[1], l.max[2] - l.min[2]) / 2);

/** Câmera que enquadra a esfera envolvente dos limites (aspecto = largura/altura da janela). */
export function enquadrar(l: Limites, aspecto: number, p: Partial<Pick<Camera3D, 'azimute' | 'elevacao' | 'fov' | 'projecao'>> = {}): Camera3D {
  const fov = p.fov ?? FOV_PADRAO, r = raioDe(l);
  const meio = Math.tan(grau(fov) / 2);
  const dist = (r * 1.15) / Math.min(meio, meio * Math.max(0.2, aspecto));
  return { alvo: centroDe(l), dist, azimute: p.azimute ?? grau(-55), elevacao: p.elevacao ?? grau(28), fov, projecao: p.projecao ?? 'perspectiva' };
}

/** Troca a projeção sem mexer em alvo, distância e ângulos: a janela ortográfica tem a mesma altura visível no alvo. */
export const alternarProjecao = (c: Camera3D, para: Projecao = c.projecao === 'perspectiva' ? 'isometrica' : 'perspectiva'): Camera3D => ({ ...c, projecao: para });

export function orbitar(c: Camera3D, dAzimute: number, dElevacao: number): Camera3D {
  return { ...c, azimute: c.azimute + dAzimute, elevacao: clamp(c.elevacao + dElevacao, -ELEV_MAX, ELEV_MAX) };
}

/** Define os ângulos em graus (barras de rotação). */
export const definirAngulos = (c: Camera3D, azimuteGraus: number, elevacaoGraus: number): Camera3D => ({ ...c, azimute: grau(azimuteGraus), elevacao: clamp(grau(elevacaoGraus), -ELEV_MAX, ELEV_MAX) });

/** Aproxima (fator < 1) ou afasta (> 1) da câmera, dentro de [min, max]. */
export const dolly = (c: Camera3D, fator: number, min = 0.2, max = 5000): Camera3D => ({ ...c, dist: clamp(c.dist * fator, min, max) });

/** Vetores unitários da câmera: direita e para cima, no mundo. */
export function eixosDaCamera(c: Camera3D): { direita: V3; cima: V3; frente: V3 } {
  const ca = Math.cos(c.azimute), sa = Math.sin(c.azimute), ce = Math.cos(c.elevacao), se = Math.sin(c.elevacao);
  const frente: V3 = [-ce * ca, -ce * sa, -se]; // da câmera para o alvo
  const direita: V3 = [-sa, ca, 0];
  const cima: V3 = [-se * ca, -se * sa, ce];
  return { direita, cima, frente };
}

/** Desloca o alvo no plano da tela. dx, dy em fração da altura da janela (positivo = arrasta o conteúdo para a direita/cima). */
export function deslocar(c: Camera3D, dx: number, dy: number): Camera3D {
  const { direita, cima } = eixosDaCamera(c), h = 2 * metadeAltura(c);
  return { ...c, alvo: [0, 1, 2].map((k) => c.alvo[k] - (direita[k] * dx + cima[k] * dy) * h) as V3 };
}

// ---------------------------------------------------------------- caminhar

/** Altura do olho (m) e velocidade inicial (m/s) do modo caminhar [a confirmar]. */
export const ALTURA_OLHO = 1.6;
export const VELOCIDADE_INICIAL = 2;

export interface EstadoCaminhar {
  /** Posição do olho (m). */
  pos: V3;
  /** Direção do olhar: yaw em torno de z (0 = +x) e pitch acima do horizonte (rad). */
  yaw: number;
  pitch: number;
}

export const direcaoOlhar = (e: EstadoCaminhar): V3 => [Math.cos(e.pitch) * Math.cos(e.yaw), Math.cos(e.pitch) * Math.sin(e.yaw), Math.sin(e.pitch)];

/** Começa a caminhar no centro da planta, na cota `cota` + altura do olho, olhando para +x. */
export function iniciarCaminhar(l: Limites, cota: number, olho = ALTURA_OLHO): EstadoCaminhar {
  const c = centroDe(l);
  return { pos: [c[0], c[1], cota + olho], yaw: 0, pitch: 0 };
}

export interface EntradaCaminhar { frente: number; lado: number; giro: number; inclinar: number }

/**
 * Avança o estado por `dt` segundos. `frente` e `lado` ∈ [−1, 1] (W/S e A/D); `giro` e `inclinar` em rad
 * (arrastar para olhar). A posição fica dentro dos limites do edifício (folga de 1 m em x e y) e a altura não muda.
 */
export function caminhar(e: EstadoCaminhar, ent: EntradaCaminhar, dt: number, velocidade: number, l: Limites): EstadoCaminhar {
  const yaw = e.yaw + ent.giro, pitch = clamp(e.pitch + ent.inclinar, grau(-85), grau(85));
  const d = velocidade * dt, cy = Math.cos(yaw), sy = Math.sin(yaw);
  const x = clamp(e.pos[0] + (cy * ent.frente - sy * ent.lado) * d, l.min[0] - 1, l.max[0] + 1);
  const y = clamp(e.pos[1] + (sy * ent.frente + cy * ent.lado) * d, l.min[1] - 1, l.max[1] + 1);
  return { pos: [x, y, e.pos[2]], yaw, pitch };
}
