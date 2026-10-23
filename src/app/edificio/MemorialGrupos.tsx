// Memorial (L4): áreas por grupo de pavimentos e anexo opcional com o guia rápido.
import type { ReactNode } from 'react';
import { areasDoGrupo } from '../../core/building/gruposCopia';
import type { BuildingModel } from '../../core/building/types';
import { GuiaConteudo } from './GuiaRapido';

const fmt = (v: number) => v.toFixed(2).replace('.', ',');

export function MemorialAreasGrupos({ b }: { b: BuildingModel }) {
  if (!b.grupos.length) return null;
  return (
    <>
      <h3>Áreas por grupo de pavimentos</h3>
      <table data-memorial-areas>
        <thead><tr><th className="l">Grupo</th><th>Pavimentos</th><th>Lajes (m²)</th><th>Vigas (m²)</th><th>Pilares (m²)</th><th>Muros (m²)</th><th>Total da planta (m²)</th><th>Total do grupo (m²)</th></tr></thead>
        <tbody>{b.grupos.map((g) => { const a = areasDoGrupo(b, g.id); return <tr key={g.id}><td className="l">{g.nome}</td><td>{a.pavimentos}</td><td>{fmt(a.lajes)}</td><td>{fmt(a.vigas)}</td><td>{fmt(a.pilares)}</td><td>{fmt(a.muros)}</td><td>{fmt(a.total)}</td><td>{fmt(a.totalGrupo)}</td></tr>; })}</tbody>
      </table>
      <p className="small">Áreas da planta de um pavimento: lajes sem furos, vigas (comprimento × largura), pilares e muros que chegam ao pavimento; somadas sem descontar a sobreposição do contorno da laje com as vigas [a confirmar].</p>
    </>
  );
}

export function MemorialGuia({ h2 }: { h2: (c: ReactNode, brk?: boolean) => ReactNode }) {
  return (
    <>
      {h2('Anexo: guia rápido', true)}
      <GuiaConteudo />
    </>
  );
}
