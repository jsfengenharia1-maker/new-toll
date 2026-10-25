// Ligação rígida barra–casca no plano da casca (25/10/2026; norma não trata, 'a confirmar'; padrão esperado do CYPECAD:
// ligação rígida). Sem ela, o momento de uma barra em torno da normal da casca passa só pelo giro no plano do nó, que a casca
// prende fracamente à rotação da membrana (estabilização γ·∫(θn − ω)², casca.ts): a ligação fica quase rotulada. Aqui o giro
// do nó segue o giro médio ω̄ (mínimos quadrados) dos nós vizinhos da casca dentro de um raio R (`LigacaoCasca3`, fe3d.ts),
// distribuindo o momento como binário de forças tangenciais nesses nós. Núcleo puro.
import type { LigacaoCasca3, Modelo3, V3 } from './fe3d';

export interface OpcoesLigacaoCasca {
  /** Raio da vizinhança (m) por nó; o mínimo efetivo é a distância ao nó mais próximo das cascas que tocam o nó. */
  raio?: (no: number) => number;
  /** Penalidade relativa: k = fator·E·h·R² (padrão 1e3: flexibilidade da ligação ≈ 1e-3 da da vizinhança, sem pesar no condicionamento do sistema). */
  fator?: number;
  /** Só as cascas abaixo do nó (centroide com z menor), quando houver: a viga no nível do pavimento pertence ao lance de baixo. */
  abaixo?: boolean;
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: V3): V3 => { const L = Math.hypot(a[0], a[1], a[2]); return [a[0] / L, a[1] / L, a[2] / L]; };

/**
 * Ligações para os nós `alvos` (nós de casca a que chegam barras ou superelementos): uma por plano de casca que contém o nó
 * (no canto de duas paredes, uma para cada). Vizinhos: nós das cascas coplanares ligadas ao nó por adjacência, a até R do nó.
 */
export function ligacoesBarraCasca(m: Modelo3, alvos: Iterable<number>, o: OpcoesLigacaoCasca = {}): LigacaoCasca3[] {
  const cascas = m.cascas ?? [];
  if (!cascas.length) return [];
  const nos = m.nos, fator = o.fator ?? 1e3;
  const normal = cascas.map((c) => unit(cross(sub(nos[c.nos[1]], nos[c.nos[0]]), sub(nos[c.nos[2]], nos[c.nos[0]]))));
  const zc = cascas.map((c) => (nos[c.nos[0]][2] + nos[c.nos[1]][2] + nos[c.nos[2]][2]) / 3);
  const doNo = new Map<number, number[]>();
  cascas.forEach((c, k) => { for (const n of c.nos) { const l = doNo.get(n); if (l) { if (!l.includes(k)) l.push(k); } else doNo.set(n, [k]); } });
  const out: LigacaoCasca3[] = [];
  for (const no of new Set(alvos)) {
    const inc = doNo.get(no);
    if (!inc) continue;
    const x0 = nos[no];
    // planos distintos entre as cascas que tocam o nó
    const planos: V3[] = [];
    for (const k of inc) if (!planos.some((p) => Math.abs(Math.abs(dot(p, normal[k])) - 1) < 1e-6)) planos.push(normal[k]);
    for (const n of planos) {
      const copl = (k: number) => Math.abs(Math.abs(dot(n, normal[k])) - 1) < 1e-6 && Math.abs(dot(sub(nos[cascas[k].nos[0]], x0), n)) < 1e-6;
      let lado = inc.filter(copl);
      const ab = o.abaixo ? lado.filter((k) => zc[k] < x0[2] - 1e-9) : [];
      if (ab.length) lado = ab;
      const aceita = (k: number) => copl(k) && (!ab.length || zc[k] < x0[2] - 1e-9);
      // distâncias dos nós das cascas do lado escolhido: o raio mínimo é a do mais próximo; o giro de corpo rígido precisa de
      // ao menos dois vizinhos distintos (o ajuste é em torno do centroide deles), senão o raio cresce até o próximo nó
      const ds = [...new Set(lado.flatMap((k) => cascas[k].nos).filter((q) => q !== no).map((q) => Math.hypot(...sub(nos[q], x0))))].sort((p, q) => p - q);
      if (!ds.length) continue;
      const busca = (R: number) => {
        const vis = new Set<number>([no]), usadas = new Set<number>(), fila = [no];
        while (fila.length) {
          const q = fila.pop()!;
          for (const k of doNo.get(q) ?? []) {
            if (!aceita(k)) continue;
            usadas.add(k);
            for (const p of cascas[k].nos) if (!vis.has(p) && Math.hypot(...sub(nos[p], x0)) <= R) { vis.add(p); fila.push(p); }
          }
        }
        vis.delete(no);
        return { vis, usadas };
      };
      let R = Math.max(o.raio?.(no) ?? 0, ds[0]) * (1 + 1e-9), achou = busca(R);
      for (const d of ds) { if (achou.vis.size >= 2) break; if (d * (1 + 1e-9) > R) { R = d * (1 + 1e-9); achou = busca(R); } }
      const { vis, usadas } = achou;
      if (vis.size < 2) continue;
      let Eh = 0;
      for (const k of lado) Eh = Math.max(Eh, cascas[k].E * cascas[k].h);
      out.push({ no, n, viz: [...vis].sort((a, b) => a - b), k: fator * Eh * R * R, cascas: [...usadas].sort((a, b) => a - b) });
    }
  }
  return out;
}
