// Revisão de resultados na interface: erros e avisos calculados uma vez por resultado (análise + dimensionamento).
import { useMemo } from 'react';
import { revisarEdificio } from '../../core/building/revisao';
import { useBuilding } from './store';

export function useRevisao() {
  const analise = useBuilding((s) => s.analise), dim = useBuilding((s) => s.dim), b = useBuilding((s) => s.sessao.modelo);
  const nome = b.obra.nome;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- o modelo só entra pelo nome da obra; o resto vem da análise e do dimensionamento
  return useMemo(() => revisarEdificio(b, analise, dim), [analise, dim, nome]);
}
