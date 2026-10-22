// Opções de desenho das pranchas (R7g): máscara DXF/DWG do pavimento (gabarito) e ponto fixo dos pilares.
// Funções puras: devolvem primitivas no espaço do modelo (m).
import { mascaraParaMundo, type BuildingModel, type Pilar } from '../building/types';
import type { P, Prim } from './prancha';

/** Segmentos da máscara visível do grupo (camada MASCARA, pena fina [a confirmar, NBR 16861]); arcos em polilinhas de até 10°. */
export function primitivasMascara(b: BuildingModel, grupo: string): Prim[] {
  const out: Prim[] = [];
  for (const m of b.mascaras ?? []) {
    if (m.grupo !== grupo) continue;
    for (const cam of m.camadas) {
      if (!cam.visivel) continue;
      const g = m.geo[cam.nome];
      if (!g) continue;
      for (let i = 0; i + 3 < g.linhas.length; i += 4) out.push({ t: 'pl', c: 'MASCARA', pts: [mascaraParaMundo(m, g.linhas[i], g.linhas[i + 1]), mascaraParaMundo(m, g.linhas[i + 2], g.linhas[i + 3])] });
      for (let i = 0; i + 4 < g.arcos.length; i += 5) {
        const [cx, cy, r, a0, a1] = g.arcos.slice(i, i + 5);
        let span = a1 - a0;
        if (span <= 0) span += 360;
        const n = Math.max(2, Math.ceil(span / 10) + 1), pts: P[] = [];
        for (let j = 0; j < n; j++) { const a = ((a0 + (span * j) / (n - 1)) * Math.PI) / 180; pts.push(mascaraParaMundo(m, cx + r * Math.cos(a), cy + r * Math.sin(a))); }
        out.push({ t: 'pl', c: 'MASCARA', pts });
      }
    }
  }
  return out;
}

/** Ponto fixo do pilar (o ponto lançado, x e y): cruz com círculo de 1,2 mm no papel (`k` = m por mm). */
export function marcasPontoFixo(pilares: Pilar[], k: number): Prim[] {
  const out: Prim[] = [], r = 1.2 * k;
  for (const p of pilares) out.push({ t: 'circ', c: 'PONTO-FIXO', centro: [p.x, p.y], r }, { t: 'pl', c: 'PONTO-FIXO', pts: [[p.x - 1.8 * k, p.y], [p.x + 1.8 * k, p.y]] }, { t: 'pl', c: 'PONTO-FIXO', pts: [[p.x, p.y - 1.8 * k], [p.x, p.y + 1.8 * k]] });
  return out;
}
