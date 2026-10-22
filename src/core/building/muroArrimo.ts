// Muro de arrimo isolado em balanço (X6, E1c): estabilidade ao tombamento e ao deslizamento, tensões na base e esforços
// característicos na base do fuste, por metro de muro. Método de livro-texto (Rankine/Coulomb no plano vertical que passa
// pela ponta do talão, solo sobre o talão como peso estabilizante). Dimensionamento da armadura do fuste e da base na E1d.
import { kDoTipo } from './empuxo';
import type { TipoEmpuxo } from './types';

/** Muro em L/T invertido: fuste com face de trás vertical, base com ponta (à frente) e talão (sob o aterro). */
export interface MuroArrimo {
  /** Altura do fuste acima da base (m) e espessuras do fuste no topo e na base (m). */
  H: number; tTopo: number; tBase: number;
  /** Largura total da base, comprimento da ponta (frente do fuste) e espessura da base (m). */
  B: number; ponta: number; hBase: number;
  /** Solo do aterro (um estrato): γ (kN/m³), φ (graus) e o método do empuxo; sobrecarga no terreno (kN/m²). */
  solo: { gama: number; phi: number; metodo: TipoEmpuxo['metodo']; delta?: number; k?: number };
  sobrecarga?: number;
  /** Peso específico do concreto (kN/m³, padrão 25). */
  gamaConcreto?: number;
  /** Coeficiente de atrito base-solo μ (padrão tg(2φ/3)). */
  atrito?: number;
  /** Tensão admissível do solo de apoio (kN/m²); ausente = não verificada. */
  sigmaAdm?: number;
  /** Fatores de segurança mínimos (padrão 2,0 ao tombamento e 1,5 ao deslizamento, NBR 11682 [a confirmar]). */
  fsTombamento?: number; fsDeslizamento?: number;
}

export interface EstabilidadeMuro {
  K: number;
  /** Empuxo do solo e da sobrecarga (kN/m) e braços em relação à base (m). */
  Ea: number; Eq: number; zEa: number; zEq: number;
  /** Forças verticais estabilizantes sem a sobrecarga (kN/m) e momentos em torno da aresta da ponta (kN·m/m). */
  V: number; Mres: number; Mtomb: number;
  FSt: number; FSd: number;
  /** Excentricidade da resultante na base (m, com a sobrecarga) e tensões extremas (kN/m²). */
  e: number; sigmaMax: number; sigmaMin: number;
  /** Esforços característicos na base do fuste (por metro). */
  fuste: { M: number; V: number };
  atende: { tombamento: boolean; deslizamento: boolean; tensao: boolean; nucleo: boolean };
  mensagens: string[];
}

export const FS_TOMBAMENTO = 2.0, FS_DESLIZAMENTO = 1.5;

/**
 * Estabilidade do muro de arrimo por metro: empuxo ativo (ou de repouso) com K do método na altura total H + hBase,
 * mais K·q da sobrecarga; pesos do fuste, da base e do solo sobre o talão (a sobrecarga sobre o talão fica fora do FS de
 * tombamento e deslizamento, a favor da segurança, e entra nas tensões). Sem empuxo passivo na frente nem dente.
 */
export function estabilidadeMuro(m: MuroArrimo): EstabilidadeMuro {
  const gc = m.gamaConcreto ?? 25, q = m.sobrecarga ?? 0, g = m.solo.gama, msgs: string[] = [];
  const K = kDoTipo({ metodo: m.solo.metodo, k: m.solo.k, delta: m.solo.delta }, m.solo.phi) ?? 0;
  const Ht = m.H + m.hBase;
  const Ea = 0.5 * K * g * Ht * Ht, Eq = K * q * Ht, zEa = Ht / 3, zEq = Ht / 2;
  const Mtomb = Ea * zEa + Eq * zEq;
  // pesos e braços em torno da aresta da ponta (x = 0)
  const xTras = m.ponta + m.tBase, talao = m.B - xTras;
  if (talao < -1e-9) msgs.push('A ponta mais a espessura do fuste passam da largura da base.');
  const partes: [number, number][] = [
    [gc * m.tTopo * m.H, xTras - m.tTopo / 2],
    [gc * 0.5 * (m.tBase - m.tTopo) * m.H, m.ponta + ((m.tBase - m.tTopo) * 2) / 3],
    [gc * m.B * m.hBase, m.B / 2],
    [g * Math.max(0, talao) * m.H, xTras + Math.max(0, talao) / 2],
  ];
  const V = partes.reduce((a, [w]) => a + w, 0), Mres = partes.reduce((a, [w, x]) => a + w * x, 0);
  const Wq = q * Math.max(0, talao), xq = xTras + Math.max(0, talao) / 2;
  const mu = m.atrito ?? Math.tan(((2 / 3) * m.solo.phi * Math.PI) / 180);
  const FSt = Mtomb > 0 ? Mres / Mtomb : Infinity, FSd = Ea + Eq > 0 ? (mu * V) / (Ea + Eq) : Infinity;
  const N = V + Wq, xr = (Mres + Wq * xq - Mtomb) / N, e = m.B / 2 - xr;
  let sigmaMax: number, sigmaMin: number;
  if (Math.abs(e) <= m.B / 6) { sigmaMax = (N / m.B) * (1 + (6 * Math.abs(e)) / m.B); sigmaMin = (N / m.B) * (1 - (6 * Math.abs(e)) / m.B); }
  else { const c = m.B / 2 - Math.abs(e); sigmaMax = c > 0 ? (2 * N) / (3 * c) : Infinity; sigmaMin = 0; }
  const fsT = m.fsTombamento ?? FS_TOMBAMENTO, fsD = m.fsDeslizamento ?? FS_DESLIZAMENTO;
  const atende = { tombamento: FSt >= fsT - 1e-9, deslizamento: FSd >= fsD - 1e-9, tensao: m.sigmaAdm === undefined || sigmaMax <= m.sigmaAdm + 1e-9, nucleo: Math.abs(e) <= m.B / 6 + 1e-9 };
  if (!atende.tombamento) msgs.push(`Tombamento: FS = ${FSt.toFixed(2)} < ${fsT.toFixed(2)}.`);
  if (!atende.deslizamento) msgs.push(`Deslizamento: FS = ${FSd.toFixed(2)} < ${fsD.toFixed(2)} (aumente a base, acrescente dente ou considere o empuxo passivo).`);
  if (!atende.tensao) msgs.push(`Tensão máxima na base ${sigmaMax.toFixed(1)} kN/m² acima da admissível ${m.sigmaAdm!.toFixed(1)} kN/m².`);
  if (!atende.nucleo) msgs.push('Resultante fora do núcleo central: base parcialmente comprimida.');
  const fuste = { M: (K * g * m.H ** 3) / 6 + (K * q * m.H ** 2) / 2, V: (K * g * m.H ** 2) / 2 + K * q * m.H };
  return { K, Ea, Eq, zEa, zEq, V, Mres, Mtomb, FSt, FSd, e, sigmaMax, sigmaMin, fuste, atende, mensagens: msgs };
}
