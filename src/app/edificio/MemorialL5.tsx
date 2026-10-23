// Memorial (L5): aberturas das lajes com a viga de borda e panos a definir.
import { aberturasDoModelo, panosADefinir } from '../../core/building/lancamentoL5';
import type { BuildingModel } from '../../core/building/types';

const fmt = (v: number) => v.toFixed(2).replace('.', ',');
const BORDA = { nenhuma: 'sem viga de borda', chata: 'viga chata (altura da laje)', alta: 'viga alta' } as const;

export function MemorialAberturas({ b }: { b: BuildingModel }) {
  const ab = aberturasDoModelo(b), dd = panosADefinir(b);
  if (!ab.length && !dd.length) return null;
  return (
    <>
      <h3>Aberturas das lajes e panos a definir</h3>
      {ab.length > 0 && (
        <table data-memorial-aberturas>
          <thead><tr><th className="l">Laje</th><th className="l">Grupo</th><th>Abertura</th><th>Área (m²)</th><th className="l">Borda</th></tr></thead>
          <tbody>{ab.map((a) => <tr key={`${a.laje}-${a.abertura}`}><td className="l">{a.laje}</td><td className="l">{a.grupo}</td><td>{a.abertura}</td><td>{fmt(a.area)}</td><td className="l">{BORDA[a.borda]}</td></tr>)}</tbody>
        </table>
      )}
      {dd.length > 0 && <p className="small">Panos ainda a definir (a obra não calcula até o tipo ser atribuído): {dd.join(', ')}.</p>}
      <p className="small">Largura e altura padrão das vigas de borda de abertura: 15 × 40 cm [a confirmar]; a viga chata tem a altura da laje.</p>
    </>
  );
}
