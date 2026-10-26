// Cortes do edifício nas pranchas (V6a, C3.31 e C3.33): quais cortes saem como marca nas plantas (formas e locação) e como
// folha de cortes, em quais plantas, na escala da folha e com o tamanho da marca. Dados em `b.prancha.cortes`
// (comando `prancha.cortes`).
import { Check, Group, Hint, NumField, Select } from '../ui';
import { CORTES_PRANCHA_PADRAO } from '../../core/building/types';
import { cortesAtivos, ESCALAS_CORTES, MARCA_CORTE } from '../../core/sheets/cortes';
import { useBuilding } from './store';

export function CortesPranchas() {
  const { sessao, exec } = useBuilding();
  const b = sessao.modelo, cfg = b.prancha?.cortes ?? {};
  const cortes = b.cortes ?? [], ativos = new Set(cortesAtivos(b).map((c) => c.id));
  const plantas = new Set(cfg.plantas?.length ? cfg.plantas : b.grupos.map((g) => g.id));
  const escala = cfg.escala ?? CORTES_PRANCHA_PADRAO.escala, marca = cfg.marca ?? CORTES_PRANCHA_PADRAO.marca;
  const mudarPlantas = (id: string, on: boolean) => {
    const n = new Set(plantas);
    if (on) n.add(id); else n.delete(id);
    exec('prancha.cortes', { plantas: n.size === b.grupos.length ? [] : [...n] });
  };
  return (
    <Group title={`Cortes nas pranchas (${ativos.size} de ${cortes.length})`} open={ativos.size > 0}>
      <div data-cortes-pranchas={[...ativos].join(',')}>
        {!cortes.length && <Hint>Não há cortes. Trace um corte na planta (grupo Cortes e seções) para ativá-lo nas pranchas.</Hint>}
        {cortes.length > 0 && (
          <div className="row wrap">
            <Check label="Todos os cortes" checked={ativos.size === cortes.length} onChange={(v) => exec('prancha.cortes', { todos: v })} />
            {cortes.map((c) => <Check key={c.id} label={`Corte na prancha: ${c.nome}`} checked={ativos.has(c.id)} onChange={(v) => exec('prancha.cortes', { ids: cortes.filter((x) => (x.id === c.id ? v : ativos.has(x.id))).map((x) => x.id) })} />)}
          </div>
        )}
        <div className="row wrap">
          <Select label="Escala da folha de cortes" value={escala} options={[...new Set([...ESCALAS_CORTES, escala])].sort((x, y) => x - y).map((e) => ({ v: e, label: e ? `1:${e}` : 'automática' }))} onChange={(e) => exec('prancha.cortes', { escala: e })} />
          <NumField label="Tamanho da marca de corte" unit="mm" width={130} value={marca} onChange={(v) => exec('prancha.cortes', { marca: Math.min(MARCA_CORTE.max, Math.max(MARCA_CORTE.min, v)) })} />
        </div>
        {ativos.size > 0 && b.grupos.length > 1 && (
          <div className="row wrap">{b.grupos.map((g) => <Check key={g.id} label={`Marcas na planta: ${g.nome}`} checked={plantas.has(g.id)} onChange={(v) => mudarPlantas(g.id, v)} />)}</div>
        )}
        <Hint>Os cortes ativados saem como marca (linha traço-ponto, seta de visada e nome) nas plantas de formas e de locação e como a folha de cortes (sigla SCT, a confirmar). Escala automática: a maior em que todos cabem numa folha.</Hint>
      </div>
    </Group>
  );
}
