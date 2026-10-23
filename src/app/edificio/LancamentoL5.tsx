// Ferramentas de lançamento de vigas, panos, aberturas e cargas (L5: C6.3, C6.6, C6.7, C6.9, C6.11, C6.51, C6.53, C7.2, C7.5,
// C7.6, C7.17, C7.78 a C7.82, C10.24, C10.25, K1.9.54, K1.9.103). Grupo "Ferramentas de lançamento" da barra lateral;
// a lógica está nos comandos `viga.tracar`, `viga.prolongar`, `viga.contornoRetangular`, `laje.aberturaRetangular`,
// `laje.detectarPanos`, `laje.editar`, `carga.areaNaLaje` e `carga.aoLongoDaViga`. Os cliques ficam em Planta.tsx.
import { Button, Check, Group, Hint, NumField, Select } from '../ui';
import type { BuildingModel } from '../../core/building/types';
import { usePlanta, type Ferramenta, type L5Estado } from './plantaStore';

export function LancamentoL5Grupo({ b, onPlanta }: { b: BuildingModel; onPlanta?: () => void }) {
  const pl = usePlanta();
  const l5 = pl.l5;
  const set = (p: Partial<L5Estado>) => pl.set({ l5: { ...usePlanta.getState().l5, ...p } });
  const ir = (f: Ferramenta) => { pl.set({ ferramenta: f }); onPlanta?.(); };
  const vref = b.vigas.find((v) => v.id === l5.vigaRef);
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
      <div className="row wrap">
        <Button onClick={() => ir('contornoRet')}>Lançar contorno retangular</Button>
        <Check label="Alinhar pela face externa dos pilares" checked={l5.alinharContorno} onChange={(v) => set({ alinharContorno: v })} />
      </div>
      <Hint>Dois cliques e Enter: cantos opostos, ângulo zero. Três cliques: um lado em qualquer ângulo e um ponto do lado oposto. As quatro vigas ficam do lado de fora da linha clicada, com a seção da ferramenta Viga.</Hint>

      <h4>Aberturas retangulares</h4>
      <div className="row wrap">
        <Select label="Modo da abertura" value={l5.modoAbertura} options={[{ v: 'zero', label: 'ângulo zero (dois cantos)' }, { v: 'viga', label: 'paralela a uma viga' }, { v: 'nervuras', label: 'ângulo das nervuras do pano' }, { v: 'qualquer', label: 'qualquer ângulo (lado e ponto oposto)' }]} onChange={(v) => set({ modoAbertura: v })} />
        <Select label="Viga de borda da abertura" value={l5.borda} options={[{ v: 'nenhuma', label: 'nenhuma' }, { v: 'chata', label: 'chata (altura da laje)' }, { v: 'alta', label: 'alta' }]} onChange={(v) => set({ borda: v })} />
      </div>
      <div className="row wrap">
        <NumField label="Largura da viga de borda" unit="m" width={120} value={l5.bordaB} onChange={(v) => set({ bordaB: v })} />
        <NumField label="Altura da viga de borda alta" unit="m" width={140} value={l5.bordaH} onChange={(v) => set({ bordaH: v })} />
      </div>
      <div className="row wrap">
        <Button onClick={() => ir('aberturaRet')}>Lançar abertura retangular</Button>
        {l5.modoAbertura === 'viga' && <Button disabled={!vref} onClick={() => set({ vigaRef: null })}>{vref ? `Trocar a viga de referência (${vref.nome})` : 'Viga de referência: clique na planta'}</Button>}
      </div>
      <Hint>Clique na laje e depois nos cantos (no modo de qualquer ângulo, os dois pontos de um lado e um do lado oposto). Largura e altura padrão da viga de borda: 15 × 40 cm [a confirmar]; a chata tem a altura da laje.</Hint>
    </Group>
  );
}
