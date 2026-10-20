// Orquestra a fundação de cada apoio conforme o tipo escolhido: estacas + bloco, sapata ou tubulão.
import { designCap, type CapCol, type CapResult } from './caps';
import { designFooting } from './footings';
import { designFootingGroup } from './footingsGroup';
import { designCaisson } from './caissons';
import { boringChoice, boringFor, columnOf, pilesByCapacity, solveSupport, type Boring, type FLoad, type FoundationData, type FoundationKind, type PileByCapacity, type PileSolution, type SupportResult } from './piles';

export interface SupportDesign {
  load: FLoad; kind: FoundationKind; boring: Boring; boringChoice: string; ap: number; bp: number;
  piles?: SupportResult; pile?: PileSolution | null; pileAdopted?: boolean; cap?: CapResult | null;
  /** Estacas com capacidade informada (sem sondagem). */
  pileFixed?: PileByCapacity;
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

/** Pilares do grupo para o bloco: carga da combinação de maior N total (posições relativas ao centro do estaqueamento). */
export function capCols(ld: FLoad): CapCol[] | undefined {
  const g = ld.group;
  if (!g || g.cols.length < 2) return undefined;
  const totais = g.combos.map((cb) => cb.cols.reduce((a, c) => a + c.N, 0));
  const cb = g.combos[totais.indexOf(Math.max(...totais))];
  return g.cols.map((q, i) => ({ label: q.label, x: q.x, y: q.y, ap: q.ap, bp: q.bp, Nk: cb.cols[i].N }));
}

const capExtra = (ld: FLoad) => ({ cols: capCols(ld), ...(ld.fixed ? { fixed: { lx: ld.fixed.A, ly: ld.fixed.B, h: ld.fixed.h ?? 0, ...(ld.fixed.bars?.x ? { bars: { phi: ld.fixed.bars.x.phi, n: ld.fixed.bars.x.n ?? 2 } } : {}) } } : {}) });

export function capFor(s: PileSolution, ld: FLoad, f: FoundationData): CapResult {
  const { ap, bp } = columnOf(ld, f.params);
  return designCap({ n: s.n, coords: s.loads.coords, D: s.D, s: s.loads.s, Nk: ld.Nk, Mx: ld.Mx, My: ld.My, ap, bp, WbAssumed: s.loads.Wb, ...capExtra(ld) }, f.params);
}

export function designSupport(ld: FLoad, f: FoundationData): SupportDesign {
  const kind = ld.kind ?? 'estacas';
  const boring = boringFor(ld, f);
  const { ap, bp } = columnOf(ld, f.params);
  const out: SupportDesign = { load: ld, kind, boring, boringChoice: boringChoice(ld, f), ap, bp };
  if (kind === 'estacas' && ld.pile?.capacity) {
    const pf = pilesByCapacity(ld, f.params);
    out.pileFixed = pf;
    out.cap = designCap({ n: pf.n, coords: pf.loads.coords, D: pf.D / 100, s: pf.loads.s, Nk: ld.Nk, Mx: ld.Mx, My: ld.My, ap, bp, WbAssumed: pf.loads.Wb, ...capExtra(ld) }, f.params);
  } else if (kind === 'estacas') {
    out.piles = solveSupport(ld, f);
    const { sol, adopted } = adoptedPile(out.piles, ld);
    out.pile = sol; out.pileAdopted = adopted;
    out.cap = sol ? capFor(sol, ld, f) : null;
  } else if (kind === 'sapata') {
    const inp = { Nk: ld.Nk, NkMin: ld.NkMin, Mx: ld.Mx, My: ld.My, ap, bp, boring, offset: ld.offset, edge: ld.edge, fixed: ld.fixed, simples: ld.simples, constH: ld.constH };
    out.footing = ld.group ? designFootingGroup({ ...inp, group: ld.group }, f.params) : designFooting(inp, f.params);
  } else {
    out.caisson = designCaisson({ Nk: ld.Nk, NkMin: ld.NkMin, Mx: ld.Mx, My: ld.My, Hx: ld.Hx, Hy: ld.Hy, boring, ...(ld.fixed ? { fixed: { Db: ld.fixed.A, ...(ld.fixed.Df ? { Df: ld.fixed.Df } : {}) } } : {}) }, f.params);
  }
  return out;
}
