// Propriedades da escada selecionada (E4a, interface): grupos "Geometria" (largura, piso, espelho, giro, último degrau) e
// "Cargas" (execução, corrimãos, revestimento, sobrecarga, acesso). Cada campo chama `escada.dados`; o núcleo valida.
import { Button, Check, Group, Hint, NumField, OptNumField, Select } from '../ui';
import type { Escada } from '../../core/building/escadas';
import { useBuilding } from './store';

export function EscadaPropriedades({ e }: { e: Escada }) {
  const { exec } = useBuilding();
  const muda = (p: Record<string, unknown>) => exec('escada.dados', { id: e.id, ...p });
  return (
    <div data-escada-propriedades>
      <Group title="Posição">
        <div className="row wrap u-items-end">
          <NumField label="Origem x" unit="m" width={110} value={e.origem[0]} onChange={(v) => exec('escada.editar', { id: e.id, origem: [v, e.origem[1]] })} />
          <NumField label="Origem y" unit="m" width={110} value={e.origem[1]} onChange={(v) => exec('escada.editar', { id: e.id, origem: [e.origem[0], v] })} />
          <NumField label="Sentido de subida" unit="°" width={110} value={e.angulo} onChange={(v) => exec('escada.editar', { id: e.id, angulo: v })} />
          <Button variant="mini" onClick={() => exec('escada.girar', { ids: [e.id], angulo: 90 })}>Girar 90°</Button>
        </div>
      </Group>
      <Group title="Geometria">
        <div className="row wrap u-items-end">
          <NumField label="Largura da escada" unit="m" width={120} value={e.largura} onChange={(v) => muda({ largura: v })} />
          <NumField label="Piso (passo em planta)" unit="m" width={130} value={e.piso} onChange={(v) => muda({ piso: v })} />
          <NumField label="Espelho (altura do degrau)" unit="m" width={150} value={e.espelho} onChange={(v) => muda({ espelho: v })} />
          <Select label="Giro ao subir" value={e.giro ?? 'esq'} options={[{ v: 'esq', label: 'esquerda' }, { v: 'dir', label: 'direita' }]} onChange={(v) => muda({ giro: v })} />
          <Select label="Último degrau" value={e.ultimoDegrau ?? 'patamar'} options={[{ v: 'patamar', label: 'formado pelo patamar' }, { v: 'laje', label: 'sobre a laje inclinada' }]} onChange={(v) => muda({ ultimoDegrau: v })} />
        </div>
      </Group>
      <Group title="Cargas" open={false}>
        <div className="row wrap u-items-end">
          <Select label="Execução dos degraus" value={e.execucao ?? 'concretados'} options={[{ v: 'concretados', label: 'concretados com a laje' }, { v: 'alvenaria', label: 'em alvenaria' }]} onChange={(v) => muda({ execucao: v })} />
          {e.execucao === 'alvenaria' && <Select label="Bloco dos degraus" value={e.bloco ?? 'ceramico'} options={[{ v: 'ceramico', label: 'cerâmico' }, { v: 'concreto', label: 'de concreto' }]} onChange={(v) => muda({ bloco: v })} />}
          <NumField label="Corrimãos (total)" unit="kN/m" width={120} value={e.corrimao ?? 0} onChange={(v) => muda({ corrimao: v })} />
          <OptNumField label="Revestimento" unit="kN/m²" width={120} value={e.revestimento} onChange={(v) => (v === undefined ? muda({ limpar: ['revestimento'] }) : muda({ revestimento: v }))} />
          <OptNumField label="Sobrecarga" unit="kN/m²" width={120} value={e.sobrecarga} onChange={(v) => (v === undefined ? muda({ limpar: ['sobrecarga'] }) : muda({ sobrecarga: v }))} />
          <Check label="Acesso ao público" checked={e.acesso === 'publico'} onChange={(v) => muda({ acesso: v ? 'publico' : 'privado' })} />
        </div>
        <Hint>Campos vazios de revestimento e sobrecarga seguem as opções “Escadas” (valores a confirmar).</Hint>
      </Group>
    </div>
  );
}
