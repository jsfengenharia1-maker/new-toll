// Navegação por etapa do Edifício (faixa + vista), fora do componente para o store do edifício poder usá-la sem ciclo de imports.
import { useLayout } from '../layout';
import { useEdifUI, type AbaEdificio } from './uiStore';
import type { EtapaId } from '../../core/building/etapas';

/** Vista aberta ao entrar na etapa (ausente = mantém a vista atual). */
const VISTA: Partial<Record<EtapaId, AbaEdificio>> = { obra: 'planta', pilares: 'planta', vigasLajes: 'planta', cargas: 'planta', fundacao: 'planta', resultados: 'dimensionamento', pranchas: 'pranchas' };

/** Abre a aba da etapa na faixa do Edifício e, quando a etapa tem vista própria, a vista. */
export function irParaEtapa(id: EtapaId) {
  const lay = useLayout.getState();
  lay.setAba('edificio', id);
  lay.setFaixaAberta(true);
  const v = VISTA[id];
  if (v) useEdifUI.getState().set({ aba: v });
}
