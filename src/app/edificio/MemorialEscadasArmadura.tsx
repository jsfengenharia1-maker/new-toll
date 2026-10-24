// Memorial das escadas, armadura (E4d): critérios, posições de cada trecho, ligações (quinas, esperas e passadores), verificações
// (cortante, fissuração e flecha) e o aço de cada lance, com a marca "a confirmar" onde a premissa espera o programa de referência.
// As linhas vêm de `escadasArmaduraNoMemorial` (núcleo); a seção só aparece com a obra dimensionada e entra no capítulo "Escadas".
import type { ReactNode } from 'react';
import type { Dimensionamento } from '../../core/building/dimensionamento';
import { escadasArmaduraNoMemorial } from '../../core/building/escadasArmaduraResumo';
import type { BuildingModel } from '../../core/building/types';

export function MemorialEscadasArmadura({ b, dim, h2 }: { b: BuildingModel; dim: Dimensionamento | null; h2: (t: string) => ReactNode }) {
  if (!dim?.escadasArmadura?.length) return null;
  const linhas = escadasArmaduraNoMemorial(b, { lances: dim.escadasArmadura, resumoAco: dim.resumoAcoEscadas ?? [] });
  const escadas = [...new Set(linhas.map((l) => l.escada))];
  return (
    <>
      {h2('Escadas: armadura e detalhamento')}
      <div data-memorial-escadas-armadura>
        {escadas.map((nome) => (
          <div className="avoid" key={nome} data-memorial-escada-armadura={nome}>
            <h3>{nome === 'Todas' ? 'Aço das escadas' : `Escada ${nome}`}</h3>
            <table>
              <thead><tr><th className="l">Seção</th><th className="l">Item</th><th className="l">Valor</th></tr></thead>
              <tbody>{linhas.filter((l) => l.escada === nome).map((l, i) => <tr key={i}><td className="l">{l.secao}</td><td className="l">{l.rotulo}</td><td className="l">{l.valor}{l.aConfirmar ? ' [a confirmar]' : ''}</td></tr>)}</tbody>
            </table>
          </div>
        ))}
        <p className="small">Esforços da casca de cada lance (capítulo anterior); armadura como laje maciça. Esperas, passadores, quinas, comprimento disponível em viga chata e profundidade da fundação são premissas a confirmar (Premissas e pendências).</p>
      </div>
    </>
  );
}
