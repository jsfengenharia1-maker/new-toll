// Memorial das vigas inclinadas (E2c): lista, envoltória dos esforços, armaduras e verificações, com o aviso dos nós de
// extremidade. As tabelas e as notas vêm do núcleo (core/building/memorialInclinadas.ts).
import type { ReactNode } from 'react';
import { memorialInclinadas } from '../../core/building/memorialInclinadas';
import type { Dimensionamento } from '../../core/building/dimensionamento';
import type { BuildingModel } from '../../core/building/types';

export function MemorialInclinadas({ b, dim, h2 }: { b: BuildingModel; dim: Dimensionamento | null; h2: (t: string) => ReactNode }) {
  const m = memorialInclinadas(b, dim);
  if (!m.tabelas.length) return null;
  return (
    <>
      {h2('Vigas inclinadas')}
      <div data-memorial-inclinadas>
        {m.tabelas.map((t) => (
          <div className="avoid" key={t.id} data-memorial-inclinadas-tabela={t.id}>
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
