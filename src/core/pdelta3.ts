// 2ª ordem global por P-Δ no pórtico espacial (N2c): K·u = P − K_G(N)·u resolvido por iteração de ponto fixo com a
// rigidez linear fatorada uma vez (fe3d.fatorar3), atualizando as normais a cada passo. Converge para a mesma solução de
// (K + K_G)·u = P com N atualizado (o `pDelta` do Pórtico 2D) enquanto a carga estiver abaixo da crítica; acima dela a
// iteração diverge e o resultado sai com erro de instabilidade.
import { elementoBarra, esforcosBarra, fatorar3, geometricaLocal3, resolver3, type Caso3, type ElementoBarra, type Fatorado3, type Modelo3, type Resultado3 } from './fe3d';

/** Barra que entra na matriz geométrica: elemento pronto (rigidez local, transformação) e a matriz geométrica unitária. */
export interface BarraGeo { bi: number; e: ElementoBarra; /** K_G local para N = 1 (escala linear em N). */ kg1: number[][] }

export function barrasGeo(m: Modelo3, indices: number[], consistente = false): BarraGeo[] {
  return indices.map((bi) => { const e = elementoBarra(m, m.barras[bi], [], []); return { bi, e, kg1: geometricaLocal3(e.L, 1, consistente) }; });
}

/** Normal média (N > 0 tração) dos esforços de extremidade locais. */
export const normalMedia = (f: ArrayLike<number>) => (f[6] - f[0]) / 2;

/** Forças nodais globais −K_G(N)·u das barras (somadas por nó). */
export function forcasGeometricas(geo: BarraGeo[], N: ArrayLike<number>, u: ArrayLike<number>): { no: number; f: number[] }[] {
  const porNo = new Map<number, number[]>();
  const ug = new Float64Array(12), ul = new Float64Array(12), fl = new Float64Array(12);
  geo.forEach((g, k) => {
    const n = N[k];
    if (!n) return;
    const { T, dofs } = g.e;
    for (let a = 0; a < 12; a++) ug[a] = u[dofs[a]];
    for (let r = 0; r < 12; r++) { let s = 0; const row = T[r]; for (let a = 0; a < 12; a++) s += row[a] * ug[a]; ul[r] = s; }
    for (let r = 0; r < 12; r++) { let s = 0; const row = g.kg1[r]; for (let a = 0; a < 12; a++) s += row[a] * ul[a]; fl[r] = -n * s; }
    for (let a = 0; a < 12; a++) {
      let s = 0;
      for (let r = 0; r < 12; r++) s += T[r][a] * fl[r];
      if (!s) continue;
      const no = (dofs[a] - (dofs[a] % 6)) / 6;
      let f = porNo.get(no);
      if (!f) { f = [0, 0, 0, 0, 0, 0]; porNo.set(no, f); }
      f[dofs[a] % 6] += s;
    }
  });
  return [...porNo].map(([no, f]) => ({ no, f }));
}

export interface ResultadoIteracao {
  /** Deslocamentos de 2ª ordem (6 por nó). */
  u: Float64Array;
  /** Normais finais nas barras geométricas. */
  N: Float64Array;
  /** Forças fictícias −K_G(N)·u (cargas nodais equivalentes aos efeitos de 2ª ordem). */
  forcas: { no: number; f: number[] }[];
  iteracoes: number; convergiu: boolean;
  /** Por iteração (memória MD9): maior correção |Δu|, maior |u| (todos os gdl) e maior deslocamento horizontal; e o de 1ª ordem. */
  historico: { iteracao: number; du: number; um: number; uh: number }[]; uh1: number;
  /** Maior deslocamento horizontal de 2ª ordem ÷ o de 1ª ordem (nós do modelo). */
  amplificacao: number;
  erro?: string;
}

const maxHoriz = (u: ArrayLike<number>) => { let m = 0; for (let k = 0; k < u.length; k += 6) m = Math.max(m, Math.abs(u[k]), Math.abs(u[k + 1])); return m; };

/**
 * Iteração de ponto fixo para vários carregamentos ao mesmo tempo (uma solução do sistema fatorado por iteração e
 * carregamento ainda ativo): u ← u₁ + K⁻¹·(−K_G(N)·u), N ← N₁ + N(u − u₁).
 */
export function iterarPDelta(fat: Fatorado3, geo: BarraGeo[], u1: Float64Array[], N1: Float64Array[], o: { maxIter?: number; tol?: number } = {}): ResultadoIteracao[] {
  const maxIter = o.maxIter ?? 50, tol = o.tol ?? 1e-5;
  const estado = u1.map((u, c) => ({ u: Float64Array.from(u), N: Float64Array.from(N1[c]), it: 0, ok: false, erro: undefined as string | undefined, dAnt: Infinity, cresce: 0, hist: [] as ResultadoIteracao['historico'] }));
  const ug = new Float64Array(12), ul = new Float64Array(12);
  for (let it = 1; it <= maxIter; it++) {
    const ativos = estado.map((s, c) => (s.ok || s.erro ? -1 : c)).filter((c) => c >= 0);
    if (!ativos.length) break;
    const sol = fat.deslocamentos(ativos.map((c) => forcasGeometricas(geo, estado[c].N, estado[c].u)));
    ativos.forEach((c, k) => {
      const s = estado[c], d = sol[k], u0 = u1[c];
      let du = 0, um = 0;
      for (let i = 0; i < d.length; i++) { const v = u0[i] + d[i]; du = Math.max(du, Math.abs(v - s.u[i])); um = Math.max(um, Math.abs(v)); s.u[i] = v; }
      geo.forEach((g, j) => { s.N[j] = N1[c][j] + normalMedia(esforcosBarra(g.e, d, -1, ug, ul)); });
      s.it = it;
      s.hist.push({ iteracao: it, du, um, uh: maxHoriz(s.u) });
      if (!Number.isFinite(um) || um > 1e6) { s.erro = 'instabilidade'; return; }
      // diverge quando a correção cresce em iterações seguidas (carga acima da crítica)
      if (du > s.dAnt * 1.0001) s.cresce++; else s.cresce = 0;
      s.dAnt = du;
      if (s.cresce >= 4) { s.erro = 'instabilidade'; return; }
      if (du <= tol * Math.max(um, 1e-12)) s.ok = true;
    });
  }
  return estado.map((s, c) => {
    const a1 = maxHoriz(u1[c]);
    const erro = s.erro ? 'Instabilidade global: a carga da combinação atinge ou supera a carga crítica (a iteração P-Δ diverge).' : !s.ok ? `P-Δ não convergiu em ${maxIter} iterações.` : undefined;
    return { u: s.u, N: s.N, forcas: forcasGeometricas(geo, s.N, s.u), iteracoes: s.it, convergiu: s.ok, historico: s.hist, uh1: a1, amplificacao: a1 > 1e-12 ? maxHoriz(s.u) / a1 : 1, ...(erro ? { erro } : {}) };
  });
}

export interface PDelta3 { res: Resultado3; linear: Resultado3; iteracoes: number; convergiu: boolean; amplificacao: number; erro?: string }

/**
 * P-Δ de um carregamento num modelo (testes e validação): todas as barras (ou as dadas) na matriz geométrica,
 * consistente ou só P-Δ. O resultado final é a solução linear com as forças fictícias somadas às cargas.
 */
export function pDelta3(m: Modelo3, caso: Caso3, o: { maxIter?: number; tol?: number; consistente?: boolean; barras?: number[] } = {}): PDelta3 {
  const linear = resolver3(m, [caso]);
  if (linear.erro) return { res: linear, linear, iteracoes: 0, convergiu: false, amplificacao: 1, erro: linear.erro };
  const idx = o.barras ?? m.barras.map((_, i) => i), geo = barrasGeo(m, idx, o.consistente);
  const fat = fatorar3(m);
  const N1 = Float64Array.from(idx.map((bi) => normalMedia(linear.esforcos[0][bi])));
  const [r] = iterarPDelta(fat, geo, [linear.desloc[0]], [N1], o);
  const res = resolver3(m, [{ ...caso, nodais: [...caso.nodais, ...r.forcas] }]);
  return { res, linear, iteracoes: r.iteracoes, convergiu: r.convergiu, amplificacao: r.amplificacao, ...(r.erro ? { erro: r.erro } : {}) };
}
