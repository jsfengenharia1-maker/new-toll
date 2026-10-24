// Menu da ferramenta Escada (E4b, C8.5): função (criar, editar, apagar, mover, girar), opções de criação (inserção repetida,
// copiar dados de outra escada do grupo, C8.35 e C8.39), grupo atual da planta (C8.7) e os botões de resultados (E4c e E4d).
import { Button, Check, Hint, Select, Seg } from '../ui';
import { aoEscolher, usePlanta } from './plantaStore';
import { useBuilding } from './store';
import { useEscadaUI } from './EscadaUI';
import { useStore } from '../store';

/** Escolhe a ferramenta Escada. No nível de fundação não há escadas: mostra a mensagem e não troca a ferramenta. */
export function escolherEscada(): boolean {
  const pl = usePlanta.getState();
  if (pl.pavimento === 'fundacao') { useStore.getState().set({ message: 'Escadas só se lançam nos pavimentos.' }); return false; }
  pl.set({ ferramenta: 'escada', ...aoEscolher('escada') });
  return true;
}

// Obra nova ou aberta (sessão nova no store): o último lançamento de escada (C8.38) não vale para outra obra.
let sessaoVista = useBuilding.getState().sessao;
useBuilding.subscribe((s) => { if (s.sessao !== sessaoVista) { sessaoVista = s.sessao; usePlanta.getState().set({ escadaPadrao: null }); } });

export function EscadaMenu() {
  const pl = usePlanta();
  const { sessao } = useBuilding();
  const b = sessao.modelo;
  const pav = b.pavimentos.find((p) => p.id === pl.pavimento);
  const grupo = b.grupos.find((g) => g.id === pav?.grupo);
  const escadasDoGrupo = (b.escadas ?? []).filter((e) => e.grupo === grupo?.id);
  return (
    <div className="escada-menu" data-escada-menu>
      <Seg small value={pl.escadaFn} onChange={(v) => pl.set({ escadaFn: v })}
        options={[{ v: 'criar', label: 'Criar' }, { v: 'editar', label: 'Editar' }, { v: 'apagar', label: 'Apagar' }, { v: 'mover', label: 'Mover' }, { v: 'girar', label: 'Girar' }]} />
      {pl.escadaFn === 'criar' && (
        <>
          <Check label="Inserção repetida" checked={pl.escadaRepetir} onChange={(v) => pl.set({ escadaRepetir: v })} />
          <Select label="Copiar dados de" value={pl.escadaCopiar ?? ''} options={[{ v: '', label: '(nenhuma)' }, ...escadasDoGrupo.map((e) => ({ v: e.id, label: e.nome }))]}
            onChange={(v) => pl.set({ escadaCopiar: v || null })} />
          <Button variant="mini" onClick={() => useEscadaUI.getState().abrir()}>Dados da nova escada…</Button>
        </>
      )}
      <Button variant="mini" disabled title="Disponível na frente E4d">Ver detalhe de armadura</Button>
      <Button variant="mini" disabled title="Disponível na frente E4c">Ver esforços e deslocamentos</Button>
      <Hint>{grupo ? `Grupo atual: ${grupo.nome}` : 'Grupo atual: —'}</Hint>
    </div>
  );
}
