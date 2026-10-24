// Frente N4c: redistribuição dos momentos negativos dos apoios internos das vigas (NBR 6118, 14.6.4.3).
// Dois critérios (opção `redistribuicaoFaces`):
//  - eixo (0): ΔM = (1 − δ)·|M| do primeiro/último ponto da parte flexível, somado linearmente ao longo do vão (todo o vão);
//  - faces (1, K1.4.7): ΔM = (1 − δ)·|M| nas faces dos pilares, somado linearmente ao longo do vão livre entre as faces
//    (o cortante muda de −(ΔMB − ΔMA)/ℓ) e, dentro do apoio, o diagrama é recalculado a partir das faces redistribuídas
//    pela parábola cúbica do arredondamento (N2e); sem a cúbica, o acréscimo dentro do apoio vale o da face.
import { cubicaNoApoio } from './apoios';

/** Parte de um vão usada pela redistribuição (tipo estrutural do vão de `dimensionarVigas`). */
export interface VaoRedist {
  L: number; xs: number[]; Mv: Float64Array[]; Vv: Float64Array[]; ini: number; fim: number; oIni: number; oFim: number;
  faces: { x: number; Mv: Float64Array; Vv: Float64Array }[];
}

/** Acréscimo da redistribuição de um vão numa combinação. */
export interface PerfilRedist {
  /** ΔM nas pontas do trecho linear (kN·m, ≥ 0). */
  dA: number; dZ: number;
  /** Abscissas do trecho linear (eixo: 0 e L; faces: as faces dos pilares) e comprimento de referência xb − xa. */
  xa: number; xb: number; Lref: number; faces: boolean;
  /** Acréscimo por estação dentro do apoio recalculado (NaN fora dele); null sem recálculo. */
  ex: Float64Array | null;
  xs: number[];
}

/** Posição relativa t do ponto x no trecho linear (nas faces, limitada a 0–1: dentro do apoio vale o da face). */
export const tRedist = (p: PerfilRedist, x: number) => (p.faces ? Math.min(1, Math.max(0, (x - p.xa) / p.Lref)) : x / p.Lref);

/** `base` + acréscimo linear em x (mesma associação de somas do critério do eixo, para não mudar os resultados). */
export function acrescimoEm(p: PerfilRedist, base: number, x: number): number {
  const t = tRedist(p, x);
  return base + p.dA * (1 - t) + p.dZ * t;
}

/** Momento da estação i com a redistribuição (estações dentro do apoio recalculado usam o acréscimo próprio). */
export function acrescimoEst(p: PerfilRedist, base: number, i: number): number {
  const e = p.ex?.[i];
  return e !== undefined && !Number.isNaN(e) ? base + e : acrescimoEm(p, base, p.xs[i]);
}

/** Cortante com a redistribuição: dM/dx = −V, então V muda de −(ΔMB − ΔMA)/ℓ. */
export const cortanteRedist = (p: PerfilRedist, V: number) => V - (p.dZ - p.dA) / p.Lref;

/**
 * Perfis da redistribuição por vão e combinação para o δ dado. `interno(nó)`: apoio interno da viga (só ele redistribui);
 * `faces`: critério das faces; `arredondamento`: opção `arredondamentoApoio` (1 = cúbica recalculada dentro do apoio).
 * Vão sem face no apoio (pilar sem recuo) volta ao critério do eixo naquele vão.
 */
export function perfisRedistribuicao(vaos: VaoRedist[], nk: number, delta: number, interno: (n: number) => boolean, faces: boolean, arredondamento: number): PerfilRedist[][] {
  const out = vaos.map((vo) => {
    const n = vo.xs.length, fI = faces ? vo.faces.find((f) => f.x < vo.L / 2) : undefined, fF = faces ? vo.faces.find((f) => f.x > vo.L / 2) : undefined;
    const xa = fI?.x ?? 0, xb = fF?.x ?? vo.L, naFace = faces && xb - xa > 1e-9;
    return Array.from({ length: nk }, (_, k): PerfilRedist => {
      const Mv = vo.Mv[k], mI = naFace && fI ? fI.Mv[k] : Mv[0], mF = naFace && fF ? fF.Mv[k] : Mv[n - 1];
      const dA = delta < 1 && interno(vo.ini) && mI < 0 ? (1 - delta) * -mI : 0, dZ = delta < 1 && interno(vo.fim) && mF < 0 ? (1 - delta) * -mF : 0;
      return naFace ? { dA, dZ, xa, xb, Lref: xb - xa, faces: true, ex: null, xs: vo.xs } : { dA, dZ, xa: 0, xb: vo.L, Lref: vo.L, faces: false, ex: null, xs: vo.xs };
    });
  });
  if (!faces || arredondamento !== 1 || delta >= 1) return out;
  // dentro do apoio: cúbica das faces redistribuídas menos a cúbica das faces originais (o diagrama do apoio já é a cúbica)
  vaos.forEach((A, ia) => {
    const ib = vaos.findIndex((x) => x !== A && x.ini === A.fim);
    if (ib < 0 || !interno(A.fim)) return;
    const B = vaos[ib], fA = A.faces.find((f) => f.x > A.L / 2), fB = B.faces.find((f) => f.x < B.L / 2);
    if (!fA || !fB) return;
    const tAp = A.L - fA.x + A.oFim + B.oIni + fB.x;
    if (tAp < 1e-6) return;
    for (let k = 0; k < nk; k++) {
      const pa = out[ia][k], pb = out[ib][k];
      if (!pa.faces || !pb.faces) continue;
      const MA = fA.Mv[k] + pa.dZ, VA = fA.Vv[k] - (pa.dZ - pa.dA) / pa.Lref, MB = fB.Mv[k] + pb.dA, VB = fB.Vv[k] - (pb.dZ - pb.dA) / pb.Lref;
      const dentro = (vo: VaoRedist, p: PerfilRedist, u: (x: number) => number | null) => {
        for (let i = 0; i < vo.xs.length; i++) {
          const uu = u(vo.xs[i]);
          if (uu === null) continue;
          p.ex ??= new Float64Array(vo.xs.length).fill(NaN);
          p.ex[i] = cubicaNoApoio(MA, VA, MB, VB, tAp, uu).M - cubicaNoApoio(fA.Mv[k], fA.Vv[k], fB.Mv[k], fB.Vv[k], tAp, uu).M;
        }
      };
      dentro(A, pa, (x) => (x > fA.x + 1e-9 ? x - fA.x : null));
      dentro(B, pb, (x) => (x < fB.x - 1e-9 ? tAp - (fB.x - x) : null));
    }
  });
  return out;
}
