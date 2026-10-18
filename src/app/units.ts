// Unidades de exibição. O núcleo calcula sempre em kN, m e rad; aqui só se converte o que o usuário vê e digita.
import { useStore } from './store';
import type { ForceUnit } from '../core/types';

/** kN por unidade (g = 9,80665 m/s²). */
const KN_PER: Record<ForceUnit, number> = { kN: 1, tf: 9.80665, kgf: 0.00980665, N: 0.001 };

export const FORCE_UNITS: { v: ForceUnit; label: string }[] = [
  { v: 'kN', label: 'kN · m' },
  { v: 'tf', label: 'tf · m' },
  { v: 'kgf', label: 'kgf · m' },
  { v: 'N', label: 'N · m' },
];

export interface Conv { label: string; to: (v: number) => number; from: (v: number) => number }
export interface Units { force: ForceUnit; F: Conv; M: Conv; q: Conv; k: Conv; eff: (e: 'N' | 'V' | 'M') => Conv }

export function makeUnits(force: ForceUnit = 'kN'): Units {
  const f = KN_PER[force] ?? 1;
  const c = (label: string): Conv => ({ label, to: (v) => v / f, from: (v) => v * f });
  const F = c(force), M = c(`${force}·m`), q = c(`${force}/m`), k = c(`${force}·m/rad`);
  return { force, F, M, q, k, eff: (e) => (e === 'M' ? M : F) };
}

export function useUnits(): Units {
  const force = useStore((s) => s.model.units?.force ?? 'kN');
  return makeUnits(force);
}
