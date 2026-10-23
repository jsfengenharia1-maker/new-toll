// Vigas de vínculo externo (E2e; C6.18, K1.3.9, K1.3.10, K1.4.29): a viga simula o topo de um muro (apoios em todos os nós de
// discretização, EI × fator, plano e EA rígidos; a modelagem está em analitico.ts). Aqui: pilares coincidentes (que travariam o
// deslocamento vertical), diagnósticos e texto do memorial.
import { contornoNoLance, lancesDoPilar, pavimentosDoGrupo, type BuildingModel, type Pilar, type Viga } from './types';
import type { Diagnostico } from './verify';

type P = [number, number];

export const VINCULO_TXT = { engaste: 'engaste (deslocamentos e rotações impedidos)', articulacao: 'articulação (deslocamentos impedidos, rotação livre)', deslizante: 'articulação com deslizamento horizontal (só o vertical impedido)' } as const;

const dentro = (p: P, c: P[]) => {
  let r = false;
  for (let i = 0, j = c.length - 1; i < c.length; j = i++) if (c[i][1] > p[1] !== c[j][1] > p[1] && p[0] < ((c[j][0] - c[i][0]) * (p[1] - c[i][1])) / (c[j][1] - c[i][1]) + c[i][0]) r = !r;
  return r;
};
const distSeg = (p: P, a: P, z: P) => {
  const dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2));
  return Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1]);
};
const segCruza = (a: P, z: P, q: P, r: P) => {
  const cr = (p: P, s: P, t: P) => (s[0] - p[0]) * (t[1] - p[1]) - (s[1] - p[1]) * (t[0] - p[0]);
  return cr(a, z, q) * cr(a, z, r) < 0 && cr(q, r, a) * cr(q, r, z) < 0;
};

/** Pilares que o eixo da viga toca nos pavimentos do seu grupo (travariam o deslocamento vertical da viga de vínculo externo). */
export function pilaresCoincidentes(b: BuildingModel, v: Viga): Pilar[] {
  const pavs = pavimentosDoGrupo(b, v.grupo);
  return b.pilares.filter((p) => pavs.some((pv) => {
    if (!lancesDoPilar(b, p).some((x) => x.id === pv.id)) return false;
    const c = contornoNoLance(p, pv.id);
    if (v.pontos.some((q) => dentro(q, c))) return true;
    return c.some((a, i) => {
      const z = c[(i + 1) % c.length];
      return v.pontos.some((q, k) => k + 1 < v.pontos.length && (segCruza(a, z, q, v.pontos[k + 1]) || distSeg(q, a, z) < 1e-6));
    });
  }));
}

export const textoPilarCoincidente = (v: Viga, p: Pilar) => `Vínculo externo: o pilar ${p.nome} coincide com a viga ${v.nome} e travaria o deslocamento vertical dela; desligue-o neste grupo (pilar apoiado) para que o muro receba a carga.`;

export function diagnosticosVinculoExterno(b: BuildingModel): Diagnostico[] {
  const out: Diagnostico[] = [];
  for (const v of b.vigas) if (v.vinculoExterno) for (const p of pilaresCoincidentes(b, v)) out.push({ codigo: 'VINCULO_PILAR', severidade: 'aviso', elementos: [v.id, p.id], mensagem: textoPilarCoincidente(v, p) });
  return out;
}
