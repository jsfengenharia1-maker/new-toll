// Camada das vigotas na planta (V7b, C7.87 a C7.92): vista dos textos (momentos/tipo, cortantes/treliça ou armadura inferior das
// moldadas) e chave geral de exibição de esforços. O estado é o mesmo da ficha da laje (plantaStore). A lógica vem de vigotasVista.ts.
import { Dropdown, Input } from '../ui';
import { usePlanta } from './plantaStore';
import { legendaVigotas, opcoesDeVistaVigotas } from '../../core/resultados/vigotasVista';

export function CamadaVigotas() {
  const vista = usePlanta((s) => s.vigotasVista), esf = usePlanta((s) => s.vigotasEsforcos), set = usePlanta((s) => s.set);
  const opcoes = opcoesDeVistaVigotas(esf), legenda = legendaVigotas(vista, esf);
  return (
    <>
      <Dropdown aria-label="Vista das vigotas na planta" title={legenda || 'Texto ao lado de cada vigota: momentos ou tipo, cortantes ou treliça, armadura inferior das moldadas (a legenda aparece na planta)'} value={vista} data-camada-vigotas={vista}
        onChange={(e) => set({ vigotasVista: e.target.value as typeof vista })}>
        {opcoes.map((o) => <option key={o.v} value={o.v} disabled={!o.disponivel}>{o.v === 'nenhuma' ? 'Vigotas na planta: sem texto' : `Vigotas: ${o.label.toLowerCase()}`}</option>)}
      </Dropdown>
      <label className="check small" title="Chave geral dos esforços das vigotas: ligada, mostra M⁺ e V de cálculo por metro; desligada, mostra tipo, treliça, estribos ou armadura inferior">
        <Input type="checkbox" checked={esf} onChange={(e) => set({ vigotasEsforcos: e.target.checked, ...(e.target.checked && vista === 'armaduraInferior' ? { vigotasVista: 'momentos' as const } : {}) })} /> <span>Esforços das vigotas</span>
      </label>
    </>
  );
}
