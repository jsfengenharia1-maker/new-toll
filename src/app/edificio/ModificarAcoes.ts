// Ações da aba Modificar que a Planta e a faixa chamam (sem React): criar semelhante.
import { useStore } from '../store';
import { semelhante } from './modificarStore';
import { aoEscolher, usePlanta } from './plantaStore';
import { useBuilding } from './store';
import { useEdifUI } from './uiStore';

/** Criar semelhante: com um elemento selecionado, abre a ferramenta de lançamento dele já com as mesmas propriedades. Devolve false se não há o que reproduzir. */
export function criarSemelhanteSelecionado(): boolean {
  const P = usePlanta.getState(), b = useBuilding.getState().sessao.modelo;
  const msg = (m: string) => useStore.getState().set({ message: m });
  const ids = [...P.selecao];
  if (ids.length !== 1) { msg('Criar semelhante: selecione um só elemento (pilar, viga, laje, carga ou fundação).'); return false; }
  const r = semelhante(b, ids[0]);
  if (!r) { msg('Criar semelhante vale para pilar, viga, laje, carga e fundação.'); return false; }
  useEdifUI.getState().set({ aba: 'planta' });
  P.set({ ...r.estado, ferramenta: r.ferramenta, ...aoEscolher(r.ferramenta) });
  msg(`Criar semelhante a ${r.rotulo}: clique para lançar com as mesmas propriedades (Esc volta a Selecionar).`);
  return true;
}
