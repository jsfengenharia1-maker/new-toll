// Memorial das escadas, cálculo (E4c): modelo, malha, apoios, reações, esforços e deslocamentos de cada lance, com a marca
// "a confirmar" onde a premissa espera o programa de referência. As linhas vêm de `escadasCalculoNoMemorial` (núcleo); a seção
// só aparece com escadas calculadas (a análise da obra guarda o resultado) e entra no capítulo "Escadas" do memorial.
import type { ReactNode } from 'react';
import { escadasCalculoNoMemorial } from '../../core/building/escadasResumo';
import type { BuildingModel } from '../../core/building/types';
import { useBuilding } from './store';

export function MemorialEscadasCalculo({ b, h2 }: { b: BuildingModel; h2: (t: string) => ReactNode }) {
  const res = useBuilding((s) => s.analise?.escadas);
  if (!res?.lances.length) return null;
  const linhas = escadasCalculoNoMemorial(b, res);
  const escadas = [...new Set(linhas.map((l) => l.escada))];
  return (
    <>
      {h2('Escadas: cálculo')}
      <div data-memorial-escadas-calculo>
        {escadas.map((nome) => (
          <div className="avoid" key={nome} data-memorial-escada-calculo={nome}>
            <h3>Escada {nome}</h3>
            <table>
              <thead><tr><th className="l">Seção</th><th className="l">Item</th><th className="l">Valor</th></tr></thead>
              <tbody>{linhas.filter((l) => l.escada === nome).map((l, i) => <tr key={i}><td className="l">{l.secao}</td><td className="l">{l.rotulo}</td><td className="l">{l.valor}{l.aConfirmar ? ' [a confirmar]' : ''}</td></tr>)}</tbody>
            </table>
          </div>
        ))}
        <p className="small">As escadas não entram na análise global: a influência das ações horizontais sobre elas é grande e fora da prática usual. As reações aplicadas à estrutura são as das tabelas acima (cargas lineares uniformes nos casos permanente e variável).</p>
      </div>
    </>
  );
}
