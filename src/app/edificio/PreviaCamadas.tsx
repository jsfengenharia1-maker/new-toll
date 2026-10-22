// Prévia de um gabarito por camada (L2, C1.19 e C2.11): as camadas visíveis em SVG, com a cor própria da camada ou a do papel
// que ela recebe nas regras de lançamento. Mostra no máximo 6000 segmentos por camada (o resto é só desenho de fundo).
import { useMemo } from 'react';
import { arcoPontos } from '../../core/building/lancamentoDxf';
import type { CamadaGeo, PapelCamada } from '../../core/building/types';

export interface CamadaPrevia { nome: string; visivel: boolean; papel?: PapelCamada; cor?: string }

const MAX_SEG = 6000;

/** Traçado SVG (M/L) dos segmentos e arcos da camada, no referencial do desenho. */
function tracado(g: CamadaGeo): string {
  const p: string[] = [];
  const passo = Math.max(1, Math.ceil(g.linhas.length / 4 / MAX_SEG));
  for (let k = 0; k + 3 < g.linhas.length; k += 4 * passo) p.push(`M${g.linhas[k]} ${g.linhas[k + 1]}L${g.linhas[k + 2]} ${g.linhas[k + 3]}`);
  for (let k = 0; k + 4 < g.arcos.length; k += 5) {
    const pts = arcoPontos(g.arcos[k], g.arcos[k + 1], g.arcos[k + 2], g.arcos[k + 3], g.arcos[k + 4], 15);
    p.push(pts.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(3)} ${q[1].toFixed(3)}`).join(''));
  }
  return p.join('');
}

export function PreviaCamadas({ geo, camadas, rotulo = 'Prévia das camadas' }: { geo: Record<string, CamadaGeo>; camadas: CamadaPrevia[]; rotulo?: string }) {
  const caminhos = useMemo(() => Object.fromEntries(Object.entries(geo).map(([n, g]) => [n, tracado(g)])), [geo]);
  const caixa = useMemo(() => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const g of Object.values(geo)) {
      for (let k = 0; k + 1 < g.linhas.length; k += 2) { x0 = Math.min(x0, g.linhas[k]); x1 = Math.max(x1, g.linhas[k]); y0 = Math.min(y0, g.linhas[k + 1]); y1 = Math.max(y1, g.linhas[k + 1]); }
      for (let k = 0; k + 4 < g.arcos.length; k += 5) { x0 = Math.min(x0, g.arcos[k] - g.arcos[k + 2]); x1 = Math.max(x1, g.arcos[k] + g.arcos[k + 2]); y0 = Math.min(y0, g.arcos[k + 1] - g.arcos[k + 2]); y1 = Math.max(y1, g.arcos[k + 1] + g.arcos[k + 2]); }
    }
    if (!Number.isFinite(x0)) return [0, 0, 1, 1];
    const m = Math.max(x1 - x0, y1 - y0, 1e-6) * 0.03;
    return [x0 - m, -(y1 + m), x1 - x0 + 2 * m, y1 - y0 + 2 * m];
  }, [geo]);
  return (
    <svg className="prev-cv" role="img" aria-label={rotulo} viewBox={caixa.join(' ')} preserveAspectRatio="xMidYMid meet">
      <g transform="scale(1 -1)">
        {camadas.filter((c) => c.visivel && caminhos[c.nome]).map((c) => (
          <path key={c.nome} d={caminhos[c.nome]} className={c.cor || !c.papel ? 'prev-ln' : `prev-ln papel-${c.papel}`} data-camada={c.nome} stroke={c.cor} />
        ))}
      </g>
    </svg>
  );
}
