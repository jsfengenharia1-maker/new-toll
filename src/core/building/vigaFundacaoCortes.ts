// Cortes da armadura principal das vigas de fundação (R8b, K1.12.12): na viga de fundação a convenção dos sinais é a invertida
// (o solo reage para cima), de modo que a face que faz o papel dos negativos de uma viga comum (armadura principal escalonada
// em até `vigaGruposSup` grupos de comprimentos) é a de maior momento de cálculo, em geral a inferior sob os pilares, e a
// outra face (positivos, em até `vigaCortesInf` grupos) fica em cima nos vãos. Cada grupo vai até onde a armadura necessária
// decalada de aℓ = d (NBR 6118, 17.4.2.2, modelo I) exige as suas barras, mais o comprimento de ancoragem lb de cada lado.
import { agruparCortes, intervalos } from './detalhamento';

export interface GrupoCorteVF { n: number; s0: number; s1: number; comprimento: number }
export interface FaceCortesVF {
  face: 'inf' | 'sup';
  /** Papel da face na convenção invertida: 'negativos' (a de maior momento) ou 'positivos'. */
  papel: 'negativos' | 'positivos';
  phi: number; n: number;
  /** Barras corridas de ponta a ponta e as cortadas, em grupos de comprimentos. */
  passantes: number; comprimentoPassante: number;
  grupos: GrupoCorteVF[];
  /** Comprimento total de barra (m) com os cortes e sem eles (todas corridas). */
  comprimentoTotal: number; comprimentoSemCortes: number;
}
export interface CortesVF { inf: FaceCortesVF; sup: FaceCortesVF }

export interface EntradaCortesVF {
  /** Abscissas (m) e momentos de cálculo (kN·m, ≥ 0) que tracionam a face inferior e a superior, nos pontos do diagrama. */
  s: number[]; Minf: number[]; Msup: number[];
  L: number;
  /** Barras adotadas por face, armadura de flexão necessária (m²) e mínima (m²). */
  inf: { n: number; phi: number; AsFlex: number; AsMin: number; lb: number };
  sup: { n: number; phi: number; AsFlex: number; AsMin: number; lb: number };
  /** Altura útil (m), decalagem aℓ = d, cobrimento da ponta (m) e fração das barras que corre de ponta a ponta (tabela de vigas). */
  d: number; cobPonta: number; passante: number;
  /** Número de grupos da face de maior momento (negativos) e da outra (positivos), e % mínimo de barras por grupo. */
  gruposNegativos: number; gruposPositivos: number; minPct: number;
}

const DX = 0.05;

/** Momento da face em cada ponto da grade de 5 cm, por interpolação linear do diagrama (valores do mesmo s: o maior). */
function gradeDoDiagrama(s: number[], M: number[], L: number): Float64Array {
  const par = s.map((x, i) => [x, Math.max(0, M[i])] as [number, number]).sort((a, z) => a[0] - z[0]);
  const u: [number, number][] = [];
  for (const p of par) { const a = u.at(-1); if (a && Math.abs(a[0] - p[0]) < 1e-6) a[1] = Math.max(a[1], p[1]); else u.push([p[0], p[1]]); }
  const n = Math.max(2, Math.round(L / DX) + 1), out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const x = Math.min(L, i * DX);
    if (!u.length) continue;
    if (x <= u[0][0]) { out[i] = u[0][1]; continue; }
    if (x >= u.at(-1)![0]) { out[i] = u.at(-1)![1]; continue; }
    let k = 1;
    while (u[k][0] < x) k++;
    const [x0, m0] = u[k - 1], [x1, m1] = u[k];
    out[i] = x1 - x0 < 1e-9 ? Math.max(m0, m1) : m0 + ((m1 - m0) * (x - x0)) / (x1 - x0);
  }
  return out;
}

function faceCortes(e: EntradaCortesVF, face: 'inf' | 'sup', papel: 'negativos' | 'positivos'): FaceCortesVF {
  const f = face === 'inf' ? e.inf : e.sup, M = gradeDoDiagrama(e.s, face === 'inf' ? e.Minf : e.Msup, e.L);
  const nG = M.length, Mmax = Math.max(0, ...M), Ab = f.n > 0 ? (Math.PI * (f.phi / 1000) ** 2) / 4 : 0;
  const c0 = e.cobPonta, c1 = e.L - e.cobPonta, cheia = Math.max(0, c1 - c0);
  const base: FaceCortesVF = { face, papel, phi: f.phi, n: f.n, passantes: f.n, comprimentoPassante: cheia, grupos: [], comprimentoTotal: f.n * cheia, comprimentoSemCortes: f.n * cheia };
  if (f.n < 1 || Ab <= 0 || Mmax <= 1e-9) return base;
  // armadura necessária em cada ponto (proporcional ao momento: As(M) é convexa, logo conservador), com o mínimo onde há tração, decalada de d
  const k = Math.max(0, Math.round(e.d / DX));
  const nec0 = Float64Array.from(M, (m) => (m > 1e-9 ? Math.max(f.AsMin, (f.AsFlex * m) / Mmax) : 0));
  const nec = Float64Array.from(nec0, (_, i) => { let m = 0; for (let j = Math.max(0, i - k); j <= Math.min(nG - 1, i + k); j++) m = Math.max(m, nec0[j]); return m; });
  const nP = Math.min(f.n, Math.max(2, Math.ceil(f.n * e.passante - 1e-9), Math.ceil(f.AsMin / Ab - 1e-9)));
  const nCut = f.n - nP, cap = nP * Ab;
  if (nCut <= 0) return base;
  // reforço de cada trecho onde a necessária decalada passa da capacidade das passantes (como os reforços inferiores das vigas)
  const grupos: GrupoCorteVF[] = [];
  for (const [i0, i1] of intervalos(nG, (i) => nec[i] > cap + 1e-9)) {
    let mx = 0;
    for (let i = i0; i <= i1; i++) mx = Math.max(mx, nec[i]);
    const n = Math.min(nCut, Math.ceil((mx - cap) / Ab - 1e-9));
    if (n <= 0) continue;
    let ultimo: [number, number] = [i0, i1];
    const ext = (j: number): [number, number] => {
      const lim = cap + j * Ab;
      let a = -1, z = -1;
      for (let i = i0; i <= i1; i++) if (nec[i] > lim + 1e-9) { if (a < 0) a = i; z = i; }
      if (a >= 0) ultimo = [a, z];
      return [Math.max(c0, ultimo[0] * DX - f.lb), Math.min(c1, ultimo[1] * DX + f.lb)];
    };
    for (const g of agruparCortes(n, papel === 'negativos' ? e.gruposNegativos : e.gruposPositivos, e.minPct, ext)) grupos.push({ n: g.n, s0: g.s0, s1: g.s1, comprimento: Math.max(0, g.s1 - g.s0) });
  }
  const total = nP * cheia + grupos.reduce((t, g) => t + g.n * g.comprimento, 0);
  if (!grupos.length || total >= f.n * cheia - 1e-9) return base; // o escalonamento só vale se economiza barra
  return { ...base, passantes: nP, grupos, comprimentoTotal: total };
}

/** Cortes das duas faces: a de maior momento de cálculo faz o papel dos negativos (convenção invertida). */
export function cortesVigaFundacao(e: EntradaCortesVF): CortesVF {
  const mi = Math.max(0, ...e.Minf), ms = Math.max(0, ...e.Msup), infPrincipal = mi >= ms;
  return {
    inf: faceCortes(e, 'inf', infPrincipal ? 'negativos' : 'positivos'),
    sup: faceCortes(e, 'sup', infPrincipal ? 'positivos' : 'negativos'),
  };
}

/** Texto de uma face para as notas e o memorial: "2 φ16 corridas + 1 φ16 de 3,20 m + …". */
export function textoCortesFace(f: FaceCortesVF): string {
  const fm = (x: number) => x.toFixed(2).replace('.', ',');
  const phi = String(f.phi).replace('.', ',');
  const partes = [`${f.passantes} φ${phi} corridas (${fm(f.comprimentoPassante)} m)`, ...f.grupos.map((g) => `${g.n} φ${phi} de ${fm(g.comprimento)} m (de ${fm(g.s0)} a ${fm(g.s1)} m)`)];
  return `${f.face === 'inf' ? 'inferior' : 'superior'} (${f.papel}): ${partes.join(' + ')}`;
}
