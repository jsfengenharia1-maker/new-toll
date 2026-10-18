// Unidades de exibição. O núcleo calcula sempre em kN, m e rad; aqui só se converte o que o usuário vê e digita.
import { useStore } from './store';
import type { ForceUnit, LengthUnit } from '../core/types';

/** kN por unidade (g = 9,80665 m/s²). */
const KN_PER: Record<ForceUnit, number> = { kN: 1, tf: 9.80665, kgf: 0.00980665, N: 0.001 };

export const FORCE_UNITS: { v: ForceUnit; label: string }[] = [
  { v: 'kN', label: 'kN' },
  { v: 'tf', label: 'tf' },
  { v: 'kgf', label: 'kgf' },
  { v: 'N', label: 'N' },
];

/** Metros por unidade de comprimento. */
const M_PER: Record<LengthUnit, number> = { m: 1, cm: 0.01, mm: 0.001 };
export const LENGTH_UNITS: { v: LengthUnit; label: string }[] = [{ v: 'm', label: 'm' }, { v: 'cm', label: 'cm' }, { v: 'mm', label: 'mm' }];

export interface Conv { label: string; to: (v: number) => number; from: (v: number) => number }
export interface Units { force: ForceUnit; length: LengthUnit; F: Conv; M: Conv; q: Conv; k: Conv; L: Conv; eff: (e: 'N' | 'V' | 'M') => Conv }

export function makeUnits(force: ForceUnit = 'kN', length: LengthUnit = 'm'): Units {
  const f = KN_PER[force] ?? 1, l = M_PER[length] ?? 1;
  const c = (label: string, k: number): Conv => ({ label, to: (v) => v / k, from: (v) => v * k });
  const F = c(force, f), M = c(`${force}·${length}`, f * l), q = c(`${force}/${length}`, f / l), k = c(`${force}·${length}/rad`, f * l), L = c(length, l);
  return { force, length, F, M, q, k, L, eff: (e) => (e === 'M' ? M : F) };
}

export function useUnits(): Units {
  const force = useStore((s) => s.model.units?.force ?? 'kN');
  const length = useStore((s) => s.model.units?.length ?? 'm');
  return makeUnits(force, length);
}
