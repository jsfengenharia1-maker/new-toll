// Cartão do tipo no topo do painel direito do Pórtico: barra, nó ou nada selecionado, com a contagem.
import { TypeCard } from '../ui';
import { useStore } from '../store';

export function PropriedadesPortico() {
  const st = useStore();
  const nm = st.selMembers.size, nn = st.selNodes.size;
  if (nm) {
    const id = [...st.selMembers][0];
    const m = st.model.members.find((x) => x.id === id);
    const sec = st.model.sections.find((s) => s.id === m?.section);
    return <TypeCard icone="barra" nome={`Barra ${id}`} tipo={sec?.name ?? 'sem seção'} contagem={`Barras (${nm})`} onEditarTipo={() => st.set({ tab: 'estrutura' })} />;
  }
  if (nn) return <TypeCard icone="no" nome={`Nó ${[...st.selNodes][0]}`} tipo="Nó" contagem={`Nós (${nn})`} />;
  return <TypeCard icone="obra" nome={st.model.name} tipo="Modelo" contagem="Nada selecionado" />;
}
