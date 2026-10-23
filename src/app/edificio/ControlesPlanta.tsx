// Controles de desenho da planta na barra de status do Edifício: Orto e Polar (as mesmas chaves de antes) e o indicador de capturas.
import { Input } from '../ui';
import { usePlanta } from './plantaStore';

export function ControlesPlanta() {
  const pl = usePlanta();
  return (
    <>
      <label className="check small"><Input type="checkbox" checked={pl.orto} onChange={(e) => pl.set({ orto: e.target.checked })} /> <span>Orto (F8)</span></label>
      <label className="check small"><Input type="checkbox" checked={pl.polar} onChange={(e) => pl.set({ polar: e.target.checked })} /> <span>Polar 15° (F10)</span></label>
      <span className="muted">Capturas: {pl.capturas.size}</span>
    </>
  );
}
