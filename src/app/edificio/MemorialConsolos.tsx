// Memorial dos consolos curtos, das vigas de vínculo externo e das vigas pré-moldadas (E2e): geometria, método, tirante, biela,
// estribos e ancoragem; vínculo e rigidez; içamento e ficha. As tabelas, as notas e os relatórios vêm do núcleo
// (core/building/memorialConsolos.ts).
import type { ReactNode } from 'react';
import { memorialConsolos } from '../../core/building/memorialConsolos';
import { opcoesEmUso, perfilDe } from '../../core/building/opcoes';
import type { Dimensionamento } from '../../core/building/dimensionamento';
import type { BuildingModel } from '../../core/building/types';

export function MemorialConsolos({ b, dim, h2 }: { b: BuildingModel; dim: Dimensionamento | null; h2: (t: string) => ReactNode }) {
  const m = memorialConsolos(b, dim, opcoesEmUso(b.opcoes, perfilDe(b)));
  if (!m.tabelas.length) return null;
  return (
    <>
      {h2('Consolos, vínculo externo e vigas pré-moldadas')}
      <div data-memorial-consolos>
        {m.tabelas.map((t) => (
          <div className="avoid" key={t.id} data-memorial-consolos-tabela={t.id}>
            <h3>{t.titulo}</h3>
            <table>
              <thead><tr>{t.colunas.map((c, i) => <th key={i} className="l">{c}</th>)}</tr></thead>
              <tbody>{t.linhas.map((l, i) => <tr key={i}>{l.map((c, k) => <td key={k} className="l">{c}</td>)}</tr>)}</tbody>
            </table>
          </div>
        ))}
        {m.relatorios.map((r, i) => <ul key={i} data-memorial-consolo-relatorio>{r.map((t, k) => <li key={k}>{t}</li>)}</ul>)}
        <ul>{m.notas.map((n, i) => <li key={i}>{n}</li>)}</ul>
      </div>
    </>
  );
}
