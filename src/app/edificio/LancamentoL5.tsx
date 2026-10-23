// Ferramentas de lançamento de vigas, panos, aberturas e cargas (L5: C6.3, C6.6, C6.7, C6.9, C6.11, C6.51, C6.53, C7.2, C7.5,
// C7.6, C7.17, C7.78 a C7.82, C10.24, C10.25, K1.9.54, K1.9.103). Grupo "Ferramentas de lançamento" da barra lateral;
// a lógica está nos comandos `viga.tracar`, `viga.prolongar`, `viga.contornoRetangular`, `laje.aberturaRetangular`,
// `laje.detectarPanos`, `laje.editar`, `carga.areaNaLaje` e `carga.aoLongoDaViga`. Os cliques ficam em Planta.tsx.
import { Check, Group, Hint, NumField } from '../ui';
import type { BuildingModel } from '../../core/building/types';
import { usePlanta, type L5Estado } from './plantaStore';

export function LancamentoL5Grupo({ b, onPlanta }: { b: BuildingModel; onPlanta?: () => void }) {
  const pl = usePlanta();
  const l5 = pl.l5;
  const set = (p: Partial<L5Estado>) => pl.set({ l5: { ...usePlanta.getState().l5, ...p } });
  void b; void onPlanta;
  return (
    <Group title="Ferramentas de lançamento" open={false}>
      <h4>Vigas</h4>
      <div className="row wrap">
        <Check label="Modo simples: cada par de pontos é uma viga" checked={l5.simples} onChange={(v) => set({ simples: v })} />
        <NumField label="Deslocamento da linha clicada" unit="cm" width={110} value={l5.deslocamento} onChange={(v) => set({ deslocamento: v })} />
      </div>
      <Hint>O deslocamento leva a linha clicada (por exemplo a fachada com revestimento) à linha de ajuste (o limite estrutural): positivo para a esquerda do traçado, negativo para a direita. Na ferramenta Viga, Enter encerra, Backspace apaga o último ponto e Esc cancela.</Hint>
      <div className="row wrap">
        <NumField label="Prolongar por comprimento" unit="m" width={120} value={l5.comprimento} onChange={(v) => set({ comprimento: v })} />
      </div>
      <Hint>Com um comprimento diferente de zero, um clique perto da extremidade na ferramenta Prolongar viga (O) prolonga a viga nesse comprimento (negativo apara); com zero, a viga vai até o alvo clicado.</Hint>
    </Group>
  );
}
