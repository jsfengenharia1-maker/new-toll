// Opções das ferramentas Alinhar e Deslocar paralelo (L9), na linha de opções da planta.
import { Check, NumField, Seg } from '../ui';
import { usePlanta } from './plantaStore';

export function OpcoesAlinhar() {
  const pl = usePlanta();
  if (pl.ferramenta === 'alinharElem') {
    return (
      <>
        <Check label="Múltiplo" title="Mantém a referência: cada clique seguinte alinha outro pilar ou viga (Esc sai)" checked={pl.alinharMultiplo} onChange={(v) => pl.set({ alinharMultiplo: v })} />
        <Check label="Travar ao alinhar" title="Guarda o alinhamento (cadeado): o elemento acompanha a referência quando ela se mover. Também dá para travar depois, pelo cadeado aberto na linha" checked={pl.alinharTravar} onChange={(v) => pl.set({ alinharTravar: v })} />
      </>
    );
  }
  return (
    <>
      <Seg small value={pl.deslocarModo} onChange={(v) => pl.set({ deslocarModo: v })} options={[{ v: 'digitar', label: 'Distância digitada' }, { v: 'grafico', label: 'Distância gráfica' }]} />
      {pl.deslocarModo === 'digitar' && <NumField label="Distância" unit="m" width={90} value={pl.deslocarDist} onChange={(v) => v > 0 && v <= 100 && pl.set({ deslocarDist: v })} />}
      <Check label="Copiar" title="Cria cópia deslocada (viga com o próximo número, parede com o próximo M, eixo com apóstrofo); sem marcar, o elemento se move" checked={pl.deslocarCopiar} onChange={(v) => pl.set({ deslocarCopiar: v })} />
    </>
  );
}
