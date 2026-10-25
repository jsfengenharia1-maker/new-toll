// Memória detalhada (MD fase 9): carga que cada laje maciça transmite às vigas e aos apoios diretos, por caso, a partir dos
// esforços de extremidade das barras da grelha (no modelo integrado, recuperados por retrossubstituição). A laje é discretizada
// em barras; a força vertical que as barras da laje deixam em cada nó é a reação do pano naquele apoio. Os nós que pertencem a
// vigas somam a reação "na viga"; os demais (pilares e paredes sem viga) ficam como "apoio direto". A soma dos nós é conferida
// com a carga distribuída aplicada às barras da laje (equilíbrio do pano).
import { baseBarra } from '../fe3d';
import type { GrelhaPavimento } from '../building/analitico';
import { fm, type Registrador } from './registrador';

export interface ReacaoApoio {
  /** "Viga V1", "Viga V1 + Viga V2" (nós de cruzamento) ou "apoio direto (pilar ou parede)". */
  apoio: string;
  nos: { no: number; x: number; y: number; Fz: number[] }[];
  /** Por caso, a soma das forças verticais dos nós (kN, para baixo no apoio). */
  R: number[];
  /** Extensão do contato: maior distância entre os nós do grupo (m). */
  Lc: number;
}

export interface ReacoesLaje { apoios: ReacaoApoio[]; total: number[]; carga: number[]; residuo: number[] }

/** Reações do pano nos apoios, por caso (índice = ordem de `casos`). `nomeViga`: id da viga → nome. */
export function reacoesDaLaje(g: GrelhaPavimento, lajeId: string, nomeViga: (id: string) => string, ncasos: number): ReacoesLaje | null {
  const res = g.res;
  if (!res) return null;
  const m = g.modelo;
  const vigasDoNo = new Map<number, Set<string>>();
  g.barras.forEach((t, bi) => {
    if (t.tipo !== 'viga' || !m.barras[bi]) return;
    for (const n of [m.barras[bi].i, m.barras[bi].j]) { let s = vigasDoNo.get(n); if (!s) vigasDoNo.set(n, (s = new Set())); s.add(t.ref); }
  });
  const Fz: Map<number, number[]> = new Map();
  g.barras.forEach((t, bi) => {
    if (t.tipo !== 'laje' || t.ref !== lajeId || !m.barras[bi]) return;
    const br = m.barras[bi], { R } = baseBarra(m, br);
    for (let ic = 0; ic < ncasos; ic++) {
      const f = res.esforcos[ic][bi];
      for (const [no, off] of [[br.i, 0], [br.j, 6]] as const) {
        let v = Fz.get(no);
        if (!v) Fz.set(no, (v = new Array<number>(ncasos).fill(0)));
        v[ic] += f[off + 1] * R[1][2] + f[off + 2] * R[2][2];
      }
    }
  });
  const grupos = new Map<string, ReacaoApoio>();
  const maxAbs = Math.max(1e-12, ...[...Fz.values()].flatMap((v) => v.map(Math.abs)));
  for (const [no, v] of [...Fz].sort((a, c) => a[0] - c[0])) {
    if (v.every((x) => Math.abs(x) < 1e-9 * maxAbs)) continue;
    const vs = vigasDoNo.get(no);
    const chave = vs ? [...vs].map(nomeViga).sort().map((n) => `Viga ${n}`).join(' + ') : 'apoio direto (pilar ou parede)';
    let a = grupos.get(chave);
    if (!a) grupos.set(chave, (a = { apoio: chave, nos: [], R: new Array<number>(ncasos).fill(0), Lc: 0 }));
    a.nos.push({ no, x: m.nos[no][0], y: m.nos[no][1], Fz: v });
    for (let ic = 0; ic < ncasos; ic++) a.R[ic] += v[ic];
  }
  const apoios = [...grupos.values()];
  for (const a of apoios) { let L = 0; for (const p of a.nos) for (const q of a.nos) L = Math.max(L, Math.hypot(p.x - q.x, p.y - q.y)); a.Lc = L; }
  // carga distribuída aplicada às barras da laje (Σ −qz·L): equilíbrio do pano
  const carga = new Array<number>(ncasos).fill(0), total = new Array<number>(ncasos).fill(0);
  for (let ic = 0; ic < ncasos; ic++) {
    for (const d of g.casos?.[ic]?.distribuidas ?? []) {
      const t = g.barras[d.barra];
      if (t?.tipo === 'laje' && t.ref === lajeId) carga[ic] += -d.q[2] * baseBarra(m, m.barras[d.barra]).L;
    }
    for (const a of apoios) total[ic] += a.R[ic];
  }
  return { apoios, total, carga, residuo: total.map((t, ic) => t - carga[ic]) };
}

/** Passos da carga da laje nas vigas: reação por apoio e caso (com os nós), carga linear média e equilíbrio do pano. */
export function registrarReacoesLaje(mem: Registrador, el: string, g: GrelhaPavimento, lajeId: string, casos: string[], nomeViga: (id: string) => string) {
  if (!mem.aceita(el)) return;
  const r = reacoesDaLaje(g, lajeId, nomeViga, casos.length);
  if (!r) return;
  const T = 'Carga da laje nas vigas';
  const norma = 'Grelha da laje (barras): forças de extremidade das barras da laje em cada nó';
  r.apoios.forEach((a) => {
    casos.forEach((c, ic) => {
      const ent: Record<string, number> = { nNos: a.nos.length, Lc: a.Lc };
      a.nos.forEach((p, k) => { ent[`no${k}`] = p.no; ent[`Fz${k}`] = p.Fz[ic]; });
      const R = a.R[ic];
      mem.passo({ etapa: 'esforcos', elemento: el, topico: T, descricao: `Reação do pano no apoio "${a.apoio}", caso ${c} (${a.nos.length} nós; contato de ${fm(a.Lc)} m)`, formula: 'R = Σ Fz,nó (força vertical das barras da laje em cada nó do apoio)', expressao: `R = ${a.nos.slice(0, 6).map((p) => fm(p.Fz[ic])).join(' + ')}${a.nos.length > 6 ? ` + … (${a.nos.length - 6} nós)` : ''} = ${fm(R)} kN`, resultado: R, unidade: 'kN', norma, entradas: ent });
    });
    if (a.Lc > 1e-9 && a.apoio.startsWith('Viga') && !a.apoio.includes('+')) {
      const q = a.R.map((R) => R / a.Lc);
      mem.passo({ etapa: 'esforcos', elemento: el, topico: T, descricao: `Carga linear média transmitida à ${a.apoio.toLowerCase()} (todos os casos): R/Lc`, formula: 'q = R / Lc', expressao: casos.map((c, ic) => `${c}: ${fm(a.R[ic])}/${fm(a.Lc)} = ${fm(q[ic])} kN/m`).join('; '), resultado: q[0] ?? 0, unidade: 'kN/m', norma, entradas: { Lc: a.Lc, ...Object.fromEntries(casos.map((c, ic) => [`R_${c}`, a.R[ic]])) }, observacao: 'Média sobre a extensão do contato; a distribuição real varia ao longo da viga (reação por nó acima).' });
    }
  });
  casos.forEach((c, ic) => {
    mem.passo({ etapa: 'esforcos', elemento: el, topico: T, descricao: `Equilíbrio do pano, caso ${c}: soma das reações × carga distribuída nas barras da laje`, formula: 'Σ R = Σ q·ℓ (barras da laje)', expressao: `Σ R = ${fm(r.total[ic])} kN; Σ q·ℓ = ${fm(r.carga[ic])} kN; diferença = ${fm(r.residuo[ic])} kN`, resultado: r.total[ic], unidade: 'kN', norma, entradas: { carga: r.carga[ic], soma: r.apoios.reduce((t, a) => t + a.R[ic], 0), residuo: r.residuo[ic] }, observacao: Math.abs(r.residuo[ic]) > 1e-6 * Math.max(1, Math.abs(r.carga[ic])) ? 'Diferença = cargas nodais e lineares lançadas sobre a laje (paredes, cargas de linha e de ponto), que não são distribuídas nas barras.' : undefined });
  });
}
