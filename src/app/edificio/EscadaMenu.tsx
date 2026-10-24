// Menu da ferramenta Escada (E4b, C8.5): função (criar, editar, apagar, mover, girar), opções de criação (inserção repetida,
// copiar dados de outra escada do grupo, C8.35 e C8.39), grupo atual da planta (C8.7) e os botões de resultados (E4c e E4d).
import { Button, Check, Hint, Note, NumField, Select, Seg } from '../ui';
import { aoEscolher, grupoDaPlanta, usePlanta } from './plantaStore';
import { useBuilding } from './store';
import { useNovaEscadaUI } from './NovaEscadaUI';
import { useStore } from '../store';
import { useEscadaCalculoUI } from './EscadaCalculoUI';
import { useEscadaArmaduraUI } from './EscadaArmaduraUI';
import { useEdifUI } from './uiStore';
import { useVista3d } from '../vista3d/vista3dStore';

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
  const grupo = grupoDaPlanta(b, pl.pavimento);
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
          <Button variant="mini" onClick={() => useNovaEscadaUI.getState().abrir()}>Dados da nova escada…</Button>
        </>
      )}
      {pl.escadaFn === 'girar' && (
        <>
          <NumField label="Ângulo do giro" unit="°" width={110} value={pl.escadaAngulo} onChange={(v) => pl.set({ escadaAngulo: v })} />
          <Button variant="mini" onClick={() => {
            const ids = [...pl.selecao].filter((id) => escadasDoGrupo.some((e) => e.id === id));
            if (!ids.length) { useStore.getState().set({ message: 'Clique numa escada para escolher qual girar.' }); return; }
            const r = useBuilding.getState().exec('escada.girar', { ids, angulo: pl.escadaAngulo });
            if (r.ok) pl.set({ escadaZera: pl.escadaZera + 1 });
          }}>Girar</Button>
        </>
      )}
      {pl.escadaErros.map((e, i) => <Note key={i} tone="bad" data-escada-erro={e.codigo}>{e.mensagem}</Note>)}
      <Button variant="mini" disabled={!(b.escadas ?? []).length} title="Armadura e detalhamento de cada lance, com seleção do lance" onClick={() => useEscadaArmaduraUI.getState().abrir()}>Ver detalhe de armadura</Button>
      <Button variant="mini" onClick={() => useEscadaCalculoUI.getState().abrir()}>Ver esforços e deslocamentos</Button>
      <Button variant="mini" disabled={!escadasDoGrupo.length} title="Cálculo individual de cada lance, antes do cálculo da obra" onClick={() => useEscadaCalculoUI.getState().abrir()}>Calcular escada</Button>
      <Button variant="mini" disabled={!(b.escadas ?? []).length} title="Abre a vista 3D com as escadas (forma e interferências com vigas, lajes e pilares)" data-escada-ver-3d onClick={() => { useVista3d.getState().set({ tipos: { ...useVista3d.getState().tipos, escada: true } }); useEdifUI.getState().set({ aba: 'vista3d' }); }}>Conferir na vista 3D</Button>
      <Hint>{grupo ? `Grupo atual: ${grupo.nome}` : 'Grupo atual: —'}</Hint>
    </div>
  );
}
