// Memorial das escadas (E4a): por escada, os dados comuns, os tipos de lance usados, a geometria resultante, as cargas e os
// avisos, com a marca "a confirmar" onde a convenção ainda espera o manual. As linhas vêm de `escadasNoMemorial` (núcleo).
import type { ReactNode } from 'react';
import { escadasNoMemorial } from '../../core/building/escadas';
import { escadasPorGrupo } from '../../core/building/escadasEdicao';
import type { BuildingModel } from '../../core/building/types';

export function MemorialEscadas({ b, h2 }: { b: BuildingModel; h2: (t: string) => ReactNode }) {
  const linhas = escadasNoMemorial(b);
  if (!linhas.length) return null;
  const escadas = [...new Set(linhas.map((l) => l.escada))];
  const grupos = escadasPorGrupo(b), fmt = (v: number) => v.toFixed(2).replace('.', ',');
  return (
    <>
      {h2('Escadas')}
      <div data-memorial-escadas>
        <div className="avoid" data-memorial-escadas-grupo>
          <h3>Escadas por grupo</h3>
          <table>
            <thead><tr><th className="l">Grupo</th><th className="l">Escada</th><th>Origem (x ; y) (m)</th><th>Sentido (°)</th><th>Lances</th><th>Degraus</th></tr></thead>
            <tbody>{grupos.flatMap((g) => g.escadas.map((e) => <tr key={`${g.grupo}-${e.nome}`}><td className="l">{g.nomeGrupo}</td><td className="l">{e.nome}</td><td>{fmt(e.origem[0])} ; {fmt(e.origem[1])}</td><td>{fmt(e.angulo)}</td><td>{e.lances}</td><td>{e.degraus}</td></tr>))}</tbody>
          </table>
        </div>
        {escadas.map((nome) => (
          <div className="avoid" key={nome} data-memorial-escada={nome}>
            <h3>Escada {nome}</h3>
            <table>
              <thead><tr><th className="l">Seção</th><th className="l">Item</th><th className="l">Valor</th></tr></thead>
              <tbody>{linhas.filter((l) => l.escada === nome).map((l, i) => <tr key={i}><td className="l">{l.secao}</td><td className="l">{l.rotulo}</td><td className="l">{l.valor}{l.aConfirmar ? ' [a confirmar]' : ''}</td></tr>)}</tbody>
            </table>
          </div>
        ))}
        <p className="small">Escada calculada como elemento isolado, só com os casos gravitacionais (permanente e sobrecarga); geometria e convenções marcadas “a confirmar” aguardam o manual do programa de referência (ver pendências).</p>
      </div>
    </>
  );
}
