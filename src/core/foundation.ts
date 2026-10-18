// Orquestra a fundação de cada apoio conforme o tipo escolhido: estacas + bloco, sapata ou tubulão.
import { designCap, type CapResult } from './caps';
import { designFooting } from './footings';
import { designCaisson } from './caissons';
import { boringChoice, boringFor, columnOf, solveSupport, type Boring, type FLoad, type FoundationData, type FoundationKind, type PileSolution, type SupportResult } from './piles';

export interface SupportDesign {
  load: FLoad; kind: FoundationKind; boring: Boring; boringChoice: string; ap: number; bp: number;
  piles?: SupportResult; pile?: PileSolution | null; pileAdopted?: boolean; cap?: CapResult | null;
  footing?: ReturnType<typeof designFooting>;
  caisson?: ReturnType<typeof designCaisson>;
}

/** Estaca adotada: a marcada no apoio (se ainda tiver solução); senão a recomendada do primeiro tipo com solução. */
export function adoptedPile(r: SupportResult, ld: FLoad): { sol: PileSolution | null; adopted: boolean } {
  if (ld.pile) {
    const s = r.byType.find((t) => t.type === ld.pile!.type)?.diameters.find((d) => d.D === ld.pile!.D)?.best;
    if (s) return { sol: s, adopted: true };
  }
  return { sol: r.byType.find((t) => t.recommended)?.recommended ?? null, adopted: false };
}

export function capFor(s: PileSolution, ld: FLoad, f: FoundationData): CapResult {
  const { ap, bp } = columnOf(ld, f.params);
  return designCap({ n: s.n, coords: s.loads.coords, D: s.D, s: s.loads.s, Nk: ld.Nk, Mx: ld.Mx, My: ld.My, ap, bp, WbAssumed: s.loads.Wb }, f.params);
}

export function designSupport(ld: FLoad, f: FoundationData): SupportDesign {
  const kind = ld.kind ?? 'estacas';
  const boring = boringFor(ld, f);
  const { ap, bp } = columnOf(ld, f.params);
  const out: SupportDesign = { load: ld, kind, boring, boringChoice: boringChoice(ld, f), ap, bp };
  if (kind === 'estacas') {
    out.piles = solveSupport(ld, f);
    const { sol, adopted } = adoptedPile(out.piles, ld);
    out.pile = sol; out.pileAdopted = adopted;
    out.cap = sol ? capFor(sol, ld, f) : null;
  } else if (kind === 'sapata') {
    out.footing = designFooting({ Nk: ld.Nk, NkMin: ld.NkMin, Mx: ld.Mx, My: ld.My, ap, bp, boring }, f.params);
  } else {
    out.caisson = designCaisson({ Nk: ld.Nk, NkMin: ld.NkMin, Mx: ld.Mx, My: ld.My, Hx: ld.Hx, Hy: ld.Hy, boring }, f.params);
  }
  return out;
}
