// Mapas de isovalores das lajes no memorial (V6f, C12.4 e C12.6): uma figura SVG estática por pavimento e grandeza —
// deslocamento vertical na combinação quase permanente, momento de cálculo inferior em X e armadura inferior necessária —
// a partir dos mesmos campos da aba Isovalores (core/resultados), com o estilo do papel (memorial.css, escopo .memo).
import { useMemo, type ReactNode } from 'react';
import type { AnaliseEdificio } from '../../core/building/analitico';
import { combinacoesEdificio } from '../../core/building/combinacoes';
import type { Dimensionamento } from '../../core/building/dimensionamento';
import type { BuildingModel } from '../../core/building/types';
import { extremos, faixaExibida, fmtIso, niveisAutomaticos, svgIsovalores } from '../../core/resultados/bandas';
import { hipoteseDeCombinacao } from '../../core/resultados/deformada';
import { campoDoPavimento, infoGrandeza, pavimentosComMapa, type GrandezaIso } from '../../core/resultados/isovalores';

/** Mapas do memorial: grandeza e, nas por hipótese, a combinação quase permanente. */
const MAPAS: GrandezaIso[] = ['uz', 'MxInf', 'AsInf'];

export function MemorialMapas({ b, analise, dim, h2 }: { b: BuildingModel; analise: AnaliseEdificio | null; dim: Dimensionamento | null; h2: (t: string) => ReactNode }) {
  const figs = useMemo(() => {
    if (!analise) return [];
    const qp = combinacoesEdificio(b, analise).find((c) => c.tipo === 'QP');
    return pavimentosComMapa(b, analise).flatMap((pv) => MAPAS.flatMap((grandeza) => {
      const info = infoGrandeza(grandeza);
      const r = campoDoPavimento(b, analise, dim, { pavimento: pv.id, grandeza, hipotese: info.porHipotese && qp ? hipoteseDeCombinacao(qp) : undefined });
      if (!r.campo) return [];
      const f = faixaExibida(r.campo), niveis = niveisAutomaticos(f.lo, f.hi, 10), ex = extremos(r.campo);
      const svg = svgIsovalores(r.campo, { niveis, largura: 640, cor: (t) => `var(--m-isov-${t})` });
      return [{ chave: `${pv.id}-${grandeza}`, grandeza, svg, rotulo: r.campo.rotulo ?? grandeza, unidade: r.campo.unidade, ex, avisos: r.avisos }];
    }));
  }, [b, analise, dim]);
  if (!figs.length) return null;
  return (
    <div data-memorial-mapas={figs.length}>
      {h2('Mapas de resultados das lajes')}
      <p>Mapas de isovalores sobre a malha da grelha de cada pavimento (interpolação linear entre os nós, bandas de cor e isolinhas). Deslocamentos na combinação quase permanente; momentos e armaduras na envoltória das combinações ELU. Armaduras: lajes maciças e nervuradas bidirecionais (nas nervuradas, armadura da nervura ÷ intereixo na zona aliviada e de laje maciça equivalente nas zonas maciças, sem a fissuração) [a confirmar].</p>
      {figs.map((f) => (
        <figure key={f.chave} data-memorial-mapa={f.grandeza}>
          <div dangerouslySetInnerHTML={{ __html: f.svg }} />
          <figcaption>
            {f.rotulo}: mínimo {f.ex.min ? `${fmtIso(f.ex.min.valor, 3)} ${f.unidade}` : '—'}, máximo {f.ex.max ? `${fmtIso(f.ex.max.valor, 3)} ${f.unidade}` : '—'}.
            {f.avisos.length ? ` ${f.avisos.join(' ')}` : ''}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
