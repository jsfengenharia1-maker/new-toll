import { describe, expect, it } from 'vitest';
import { averageBoring, boringChoice, boringFor, boringsOf, capacity, cleanBoring, defaultFoundationParams, effectiveN, maxDepth, normalizeFoundation, pileLoads, pileStructure, sampleFoundation, solveSupport, type Boring, type FLoad, type FoundationData, type SoilClass, type SptMeter } from './piles';

const uniform = (N: number, n = 15, soil: 'areia' | 'argila' = 'areia', water: number | null = null): Boring => ({ name: 't', water, endImpenetrable: false, meters: Array.from({ length: n }, () => ({ N, soil })) });

describe('Décourt-Quaresma', () => {
  it('hélice Ø40 em areia N = 20, L = 10 m', () => {
    const c = capacity('helice', 0.4, 10, uniform(20), 0)!;
    const Ap = Math.PI * 0.04;
    expect(c.Rp).toBeCloseTo(0.3 * 400 * 20 * Ap, 6);
    expect(c.Rl).toBeCloseTo(1 * 10 * (20 / 3 + 1) * Math.PI * 0.4 * 10, 6);
    expect(c.Padm).toBeCloseTo((c.Rp + c.Rl) / 2, 6);
  });
  it('escavada: ponta limitada e Padm ≤ 1,25·Rl', () => {
    const c = capacity('escavada', 0.5, 4, uniform(40, 15, 'areia'), 0)!;
    expect(c.RpUsed).toBeLessThanOrEqual(c.Rl + 1e-9);
    expect(c.Padm).toBeLessThanOrEqual(1.25 * c.Rl + 1e-9);
  });
  it('N do fuste limitado entre 3 e 50', () => {
    const lo = capacity('premoldada', 0.33, 8, uniform(1), 0)!;
    expect(lo.Nl).toBe(3);
    const hi = capacity('premoldada', 0.33, 8, uniform(70), 0)!;
    expect(hi.Np).toBe(50);
  });
});

describe('limites e bloco', () => {
  it('escavada para no nível d’água; pré-moldada na nega estimada', () => {
    const p = defaultFoundationParams();
    expect(maxDepth('escavada', uniform(10, 15, 'areia', 6.5), p).L).toBe(6);
    const b = uniform(10); b.meters[9].N = 32;
    expect(maxDepth('premoldada', b, p).L).toBe(10);
  });
  it('4 estacas com momento My: N/4 + My/(2s)', () => {
    const pl = pileLoads({ id: 1, label: 'x', Nk: 1000, NkMin: 1000, Hx: 0, Hy: 0, Mx: 0, My: 120 }, 4, 0.4, 3, 0);
    expect(pl.Nmax).toBeCloseTo(250 + 120 / (2 * 1.2), 6);
    expect(pl.Nmin).toBeCloseTo(250 - 120 / (2 * 1.2), 6);
  });
});

describe('Nd,mín com γf favorável e desfavorável (NBR 6118 Tab. 11.1)', () => {
  it('permanente com 1,0 e alívio variável + binário com 1,4', () => {
    const pl = pileLoads({ id: 1, label: 'x', Nk: 1000, NkMin: 600, NkPerm: 800, Hx: 0, Hy: 0, Mx: 0, My: 120 }, 4, 0.4, 3, 0);
    expect(pl.dN).toBeCloseTo(50, 9);
    expect(pl.NdMin).toBeCloseTo(800 / 4 - 1.4 * (200 / 4 + 50), 9); // 60 kN
    expect(pl.GkSource).toBe('informada');
  });
  it('sem parcela permanente informada adota Gk = Nk (a favor da segurança)', () => {
    const pl = pileLoads({ id: 1, label: 'x', Nk: 1000, NkMin: 600, Hx: 0, Hy: 0, Mx: 0, My: 120 }, 4, 0.4, 3, 0);
    expect(pl.Gk).toBe(1000);
    expect(pl.NdMin).toBeCloseTo(250 - 1.4 * (100 + 50), 9); // 40 kN
  });
  it('peso do bloco entra como permanente favorável', () => {
    const pl = pileLoads({ id: 1, label: 'x', Nk: 1000, NkMin: 800, NkPerm: 800, Hx: 0, Hy: 0, Mx: 0, My: 0 }, 2, 0.4, 3, 10);
    expect(pl.Wb).toBeCloseTo(100, 9);
    expect(pl.NdMin).toBeCloseTo((800 + 100) / 2, 9);
  });
  it('tração de cálculo Td = máx(0, −Nd,mín) e armadura de tração', () => {
    const p = defaultFoundationParams();
    const pl = pileLoads({ id: 1, label: 'x', Nk: 300, NkMin: -100, NkPerm: 200, Hx: 0, Hy: 0, Mx: 0, My: 0 }, 1, 0.4, 3, 0);
    expect(pl.NdMin).toBeCloseTo(200 - 1.4 * 300, 9); // −220 kN
    const s = pileStructure('helice', 0.4, 12, pl, uniform(20), p);
    expect(s.Td).toBeCloseTo(220, 9);
    expect(s.AsTension).toBeCloseTo(0.22 / (500 / 1.15), 9);
  });
});

describe('estrutural e solução', () => {
  it('estaca comprimida abaixo do limite: armadura mínima no comprimento mínimo', () => {
    const p = defaultFoundationParams();
    const pl = pileLoads({ id: 1, label: 'x', Nk: 400, NkMin: 400, Hx: 0, Hy: 0, Mx: 0, My: 0 }, 1, 0.4, 3, 0);
    const s = pileStructure('helice', 0.4, 12, pl, uniform(20), p);
    expect(s.needComp).toBe(false);
    expect(s.armedLength).toBe(4);
    expect(s.options[0].n).toBeGreaterThanOrEqual(3);
    expect(s.options.at(-1)!.n).toBe(3);
  });
  it('exemplo completo encontra solução para todos os tipos', () => {
    const f = sampleFoundation();
    for (const ld of f.loads) {
      const r = solveSupport(ld, f);
      for (const t of r.byType) {
        expect(t.recommended, `${ld.label} ${t.type}`).not.toBeNull();
        console.log(ld.label, t.type, `Ø${Math.round(t.recommended!.D * 100)} n=${t.recommended!.n} L=${t.recommended!.L} Padm=${t.recommended!.cap.Padm.toFixed(0)} Nmax=${t.recommended!.loads.Nmax.toFixed(0)}`, t.recommended!.struct.options.map((o) => `${o.n}φ${o.phi}`).join(' '));
      }
    }
  });
});

describe('várias sondagens por obra (C4)', () => {
  const ld = (o: Partial<FLoad> = {}): FLoad => ({ id: 1, label: 'P', Nk: 500, NkMin: 400, Hx: 0, Hy: 0, Mx: 0, My: 0, ...o });
  it('arquivo antigo (só boring) abre com um furo e id', () => {
    const old = sampleFoundation() as FoundationData;
    delete old.borings;
    const f = normalizeFoundation(JSON.parse(JSON.stringify(old)));
    expect(f.borings!.length).toBe(1);
    expect(f.borings![0].id).toBe(1);
    expect(f.boring.name).toBe(old.boring.name);
    expect(f.params.colA).toBe(0.3);
  });
  it('escolhido > mais próximo (com coordenadas) > primeiro', () => {
    const a = { ...uniform(10), id: 1, name: 'SP-01', x: 0, y: 0 }, b = { ...uniform(30), id: 2, name: 'SP-02', x: 20, y: 0 };
    const f = { boring: a, borings: [a, b] };
    expect(boringFor(ld(), f).name).toBe('SP-01');
    expect(boringFor(ld({ x: 15, y: 1 }), f).name).toBe('SP-02');
    expect(boringFor(ld({ x: 15, y: 1, boringId: 1 }), f).name).toBe('SP-01');
    expect(boringFor(ld({ boringId: 99 }), f).name).toBe('SP-01');
  });
  it('ids repetidos ou ausentes viram únicos', () => {
    const list = boringsOf({ boring: uniform(5), borings: [uniform(5), { ...uniform(5), id: 1 }] });
    expect(new Set(list.map((x) => x.id)).size).toBe(2);
  });
  it('cada apoio dimensiona com o seu furo', () => {
    const base = sampleFoundation();
    const weak = { ...uniform(4, 22), id: 2, name: 'fraco' };
    const f: FoundationData = { ...base, borings: [{ ...base.boring, id: 1 }, weak] };
    const strong = solveSupport({ ...base.loads[0], boringId: 1 }, f);
    const soft = solveSupport({ ...base.loads[0], boringId: 2 }, f);
    expect(soft.boring.name).toBe('fraco');
    const L = (r: typeof strong) => r.byType.find((t) => t.type === 'helice')?.recommended;
    expect(L(strong)).toBeTruthy();
    if (L(soft)) expect(L(soft)!.L * L(soft)!.n).toBeGreaterThanOrEqual(L(strong)!.L * L(strong)!.n);
  });
});

describe('SPT: furo único, média e leituras descartadas', () => {
  const m = (N: number[], soil: SoilClass[] = []): SptMeter[] => N.map((n, i) => ({ N: n, soil: soil[i] ?? 'argila' }));
  const A: Boring = { id: 1, name: 'A', water: 5, meters: m([4, 6, 8, 10]), endImpenetrable: false };
  const B: Boring = { id: 2, name: 'B', water: 3, meters: m([6, 50, 12, 14, 20], ['areia', 'areia', 'areia', 'areia', 'areia']), endImpenetrable: true };
  const f = { boring: A, borings: [A, B] };
  it('leitura descartada num furo é interpolada entre as vizinhas', () => {
    const b2 = { ...B, meters: B.meters.map((x, i) => (i === 1 ? { ...x, excluded: true } : x)) };
    expect(effectiveN(b2.meters)).toEqual([6, 9, 12, 14, 20]);
    expect(cleanBoring(b2).meters[1].N).toBe(9);
  });
  it('média: profundidade comum, NA mais raso, solo mais frequente com empate no menos favorável', () => {
    const av = averageBoring([A, B], { sptAvgDepth: 'common', sptAvgWater: 'shallowest' });
    expect(av.meters.map((x) => x.N)).toEqual([5, 28, 10, 12]);
    expect(av.water).toBe(3);
    expect(av.meters[0].soil).toBe('argila'); // empate argila × areia → argila
    expect(av.endImpenetrable).toBe(false);
  });
  it('média sem a leitura fora do padrão usa só os demais furos no metro', () => {
    const B2 = { ...B, meters: B.meters.map((x, i) => (i === 1 ? { ...x, excluded: true } : x)) };
    const av = averageBoring([A, B2], { sptAvgDepth: 'max', sptAvgWater: 'mean' });
    expect(av.meters.map((x) => x.N)).toEqual([5, 6, 10, 12, 20]);
    expect(av.water).toBe(4);
    expect(av.endImpenetrable).toBe(true);
  });
  it('apoio com média de furos escolhidos', () => {
    const ld = { id: 1, label: 'P1', Nk: 100, NkMin: 80, Hx: 0, Hy: 0, Mx: 0, My: 0, boringMode: 'average' as const, boringIds: [1, 2] };
    expect(boringFor(ld, f).name).toBe('Média de A, B');
    expect(boringFor({ ...ld, boringIds: [2] }, f).name).toBe('B');
    expect(boringChoice(ld, f)).toContain('média de 2');
  });
});
