// Memorial da armadura das paredes, dos pilares-parede e dos muros de arrimo (E1d): tabelas de panos, pontos,
// esforços, esbeltez, aberturas, emendas, quantitativo, resumo de aço, mensagens e muros. As tabelas vêm do núcleo.
import type { ReactNode } from 'react';
import { memorialParedes } from '../../core/building/memorialParedes';
import type { Dimensionamento } from '../../core/building/dimensionamento';
import type { BuildingModel } from '../../core/building/types';

export function MemorialParedes({ b, dim, h2 }: { b: BuildingModel; dim: Dimensionamento | null; h2: (t: string) => ReactNode }) {
  const ts = dim ? memorialParedes(b, dim) : [];
  if (!ts.length) return null;
  return (
    <>
      {h2('Armadura das paredes, pilares-parede e muros de arrimo')}
      {ts.map((t) => (
        <div className="avoid" key={t.id} data-memorial-paredes={t.id}>
          <h3>{t.titulo}</h3>
          <table>
            <thead><tr>{t.colunas.map((c, i) => <th key={i} className="l">{c}</th>)}</tr></thead>
            <tbody>{t.linhas.map((l, i) => <tr key={i}>{l.map((c, k) => <td key={k} className="l">{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ))}
      <p>Premissas e1d-* (modelo sanduíche, fator de cumprimento, mínimos, cortante, aberturas, emendas, muro de arrimo) a confirmar; ver a seção de premissas.</p>
    </>
  );
}
