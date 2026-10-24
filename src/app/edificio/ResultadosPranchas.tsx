// Escolha do mapa da folha de resultados (V7d, K1.11.62): grandeza e hipótese (caso ou combinação) do mapa de isovalores das
// lajes que a folha SCR desenha. Vale para a obra (`b.prancha.resultados`, comando `prancha.definir`); sem escolha, a folha
// traz o deslocamento vertical na combinação quase permanente.
import { calculoAtual, useBuilding } from './store';
import { Group, Hint, Select } from '../ui';
import { GRANDEZAS_ISO, hipotesesDeLaje, infoGrandeza, type GrandezaIso } from '../../core/resultados/isovalores';

const GRANDEZAS = GRANDEZAS_ISO.filter((g) => g.grupo !== 'radier');

export function ResultadosPranchas() {
  const { sessao, exec } = useBuilding();
  const an = useBuilding((s) => (calculoAtual(s) && !s.analise?.erro ? s.analise : null));
  const b = sessao.modelo, esc = b.prancha?.resultados ?? {};
  const grandeza = (GRANDEZAS.find((g) => g.id === esc.grandeza)?.id ?? 'uz') as GrandezaIso, info = infoGrandeza(grandeza);
  const hips = an ? hipotesesDeLaje(b, an) : [];
  return (
    <Group title="Mapa da folha de resultados">
      <div className="row wrap" data-resultados-folha={`${grandeza}|${esc.hipotese ?? ''}`}>
        <Select label="Grandeza do mapa" value={grandeza} options={GRANDEZAS.map((g) => ({ v: g.id, label: `${g.rotulo} [${g.unidade}]` }))} onChange={(v) => exec('prancha.definir', { resultados: { grandeza: v === 'uz' ? '' : v } })} />
        {info.porHipotese && (
          <Select label="Hipótese do mapa" value={esc.hipotese ?? ''} options={[{ v: '', label: 'Quase permanente' }, ...hips.map((h) => ({ v: h.id, label: h.tipo === 'caso' ? `Caso ${h.nome}` : h.nome }))]} onChange={(v) => exec('prancha.definir', { resultados: { hipotese: v } })} />
        )}
      </div>
      <Hint>{info.porHipotese ? 'Deslocamentos e esforços por hipótese: escolha o caso ou a combinação.' : 'Esforços de cálculo e armaduras usam as combinações ELU.'} {an ? '' : 'Calcule o edifício para escolher a hipótese.'} A folha traz uma planta por pavimento com laje calculada.</Hint>
    </Group>
  );
}
