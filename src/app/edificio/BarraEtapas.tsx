// Barra de etapas do Edifício (logo abaixo da faixa): as 8 etapas na ordem da obra, o estado de cada uma e a próxima destacada.
// Clicar numa etapa abre a aba de mesmo nome na faixa (e a vista que ela usa). O estado sai de `etapasDaObra` (núcleo).
import { useMemo } from 'react';
import { StepBar } from '../ui';
import { useLayout } from '../layout';
import { calculoAtual, useBuilding } from './store';
import { useEdifUI, type AbaEdificio } from './uiStore';
import { contarReprovados, etapasDaObra, proximaEtapa, type EtapaId } from '../../core/building/etapas';

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

export function BarraEtapas() {
  const b = useBuilding((s) => s.sessao.modelo);
  const calculado = useBuilding((s) => calculoAtual(s));
  const diags = useBuilding((s) => s.diags);
  const dim = useBuilding((s) => s.dim);
  const erroAnalise = useBuilding((s) => (calculoAtual(s) ? s.analise?.erro : undefined));
  const ativo = useLayout((s) => s.aba.edificio);
  const etapas = useMemo(
    () => etapasDaObra(b, { calculado, carimbo: Object.values(b.prancha?.carimbo ?? {}).some((v) => typeof v === 'string' && v.trim() !== ''), erros: diags.filter((d) => d.severidade === 'erro').length, erroAnalise, reprovados: calculado ? contarReprovados(dim) : 0 }),
    [b, calculado, diags, dim, erroAnalise],
  );
  const prox = proximaEtapa(etapas);
  return <StepBar label="Etapas da obra" etapas={etapas} ativo={ativo} proximo={prox?.id} onSelect={(id) => irParaEtapa(id as EtapaId)} />;
}
