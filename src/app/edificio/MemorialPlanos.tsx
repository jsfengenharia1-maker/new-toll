// Memorial dos planos inclinados (frente E3f): tabela dos planos (definição, inclinação, panos e vigas), esforços normais dos panos e
// vigas inclinados e empuxo horizontal no topo dos pilares por caso, e a premissa. As linhas vêm do núcleo (`planosNoMemorial`,
// `esforcosDosPlanos`); sem planos na obra a seção não aparece.
import type { ReactNode } from 'react';
import { fmt } from './Detalhamento';
import type { AnaliseEdificio } from '../../core/building/analitico';
import { esforcosDosPlanos, planosNoMemorial } from '../../core/building/planos';
import { PREMISSAS } from '../../core/building/premissas';
import type { BuildingModel } from '../../core/building/types';

export function MemorialPlanos({ b, an, h2 }: { b: BuildingModel; an: AnaliseEdificio | null; h2: (t: string) => ReactNode }) {
  const linhas = planosNoMemorial(b);
  if (!linhas.length) return null;
  const ef = an ? esforcosDosPlanos(an) : { normais: [], empuxos: [] };
  const premissa = PREMISSAS.find((p) => p.id === 'planos');
  return (
    <>
      {h2('Planos inclinados')}
      <div data-memorial-planos>
        <p>Panos e vigas com plano seguem a cota z(x, y) do plano (desnível em relação ao topo do pavimento); a inclinação do plano é a tangente da máxima declividade. Esforços normais (mínimo e máximo por caso vertical) dos panos e vigas inclinados e empuxo horizontal no topo dos pilares dos pavimentos com planos: do modelo integrado.</p>
        <table data-tabela-planos>
          <thead><tr><th>Plano</th><th>Grupo</th><th>Definição</th><th>Inclinação (%)</th><th>Inclinação (°)</th><th>Lajes</th><th>Vigas</th></tr></thead>
          <tbody>{linhas.map((l) => <tr key={l.plano}><td className="l">{l.nome}</td><td className="l">{l.grupo}</td><td className="l">{l.definicao}</td><td>{fmt(l.percentual)}</td><td>{fmt(l.graus)}</td><td className="l">{l.lajes.join(', ') || '—'}</td><td className="l">{l.vigas.join(', ') || '—'}</td></tr>)}</tbody>
        </table>
        {ef.normais.length > 0 && (
          <table data-normais-planos>
            <thead><tr><th>Elemento</th><th>Tipo</th><th>Caso</th><th>N mín (kN)</th><th>N máx (kN)</th></tr></thead>
            <tbody>{ef.normais.map((n, i) => <tr key={i}><td className="l">{n.ref}</td><td className="l">{n.tipo === 'laje' ? 'pano' : 'viga'}</td><td className="l">{n.caso}</td><td>{fmt(n.Nmin, 1)}</td><td>{fmt(n.Nmax, 1)}</td></tr>)}</tbody>
          </table>
        )}
        {ef.empuxos.length > 0 && (
          <table data-empuxos-planos>
            <thead><tr><th>Pilar</th><th>Pavimento</th><th>Caso</th><th>Hx (kN)</th><th>Hy (kN)</th></tr></thead>
            <tbody>{ef.empuxos.map((n, i) => <tr key={i}><td className="l">{n.pilar}</td><td className="l">{n.pavimento}</td><td className="l">{n.caso}</td><td>{fmt(n.Hx, 1)}</td><td>{fmt(n.Hy, 1)}</td></tr>)}</tbody>
          </table>
        )}
        {premissa && <p data-premissa-planos><i>{premissa.texto}</i></p>}
      </div>
    </>
  );
}
