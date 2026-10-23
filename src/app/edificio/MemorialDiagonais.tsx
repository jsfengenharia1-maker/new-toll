// Memorial das diagonais de contraventamento (E2d): lista (grupos, comprimento real, seção, ligações, flambagem e nós de cruzamento),
// envoltória dos esforços, armaduras e verificações, com o aviso dos nós de extremidade. As tabelas e as notas vêm do núcleo
// (core/building/memorialDiagonais.ts).
import type { ReactNode } from 'react';
import { memorialDiagonais } from '../../core/building/memorialDiagonais';
import type { Dimensionamento } from '../../core/building/dimensionamento';
import type { BuildingModel } from '../../core/building/types';
import { useBuilding } from './store';

export function MemorialDiagonais({ b, dim, h2 }: { b: BuildingModel; dim: Dimensionamento | null; h2: (t: string) => ReactNode }) {
  const op = useBuilding((s) => s.analise?.opcoes);
  const m = memorialDiagonais(b, dim, op?.diagonalFlambagemVertical ?? 1, op?.diagonalFlambagemTransversal ?? 1);
  if (!m.tabelas.length) return null;
  return (
    <>
      {h2('Diagonais de contraventamento')}
      <div data-memorial-diagonais>
        {m.tabelas.map((t) => (
          <div className="avoid" key={t.id} data-memorial-diagonais-tabela={t.id}>
            <h3>{t.titulo}</h3>
            <table>
              <thead><tr>{t.colunas.map((c, i) => <th key={i} className="l">{c}</th>)}</tr></thead>
              <tbody>{t.linhas.map((l, i) => <tr key={i}>{l.map((c, k) => <td key={k} className="l">{c}</td>)}</tr>)}</tbody>
            </table>
          </div>
        ))}
        <ul>{m.notas.map((n, i) => <li key={i}>{n}</li>)}</ul>
      </div>
    </>
  );
}
