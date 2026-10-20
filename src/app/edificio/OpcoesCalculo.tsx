// Grupo "Opções de cálculo" da barra lateral do edifício (frente N1a): cada opção com padrão, fonte e "a confirmar".
import { OPCOES_INFO, opcoesAlteradas, opcoesEmUso } from '../../core/building/opcoes';
import type { BuildingModel } from '../../core/building/types';
import { Button, Check, Group, Hint, NumField } from '../ui';
import { useBuilding } from './store';

const num = (v: number) => String(v).replace('.', ',');

export function OpcoesGrupo({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const op = opcoesEmUso(b.opcoes);
  const alteradas = opcoesAlteradas(b.opcoes);
  return (
    <Group title={`Opções de cálculo${alteradas.length ? ` (${alteradas.length} alterada${alteradas.length > 1 ? 's' : ''})` : ''}`} open={false}>
      {OPCOES_INFO.map((o) => (
        <div key={o.chave} className="row wrap u-items-end">
          {o.booleana
            ? <Check label={o.rotulo} checked={!!op[o.chave]} onChange={(c) => exec('opcoes.definir', { valores: { [o.chave]: c ? 1 : 0 } })} />
            : <NumField label={o.rotulo} unit={o.unidade} width={190} value={op[o.chave]} onChange={(v) => exec('opcoes.definir', { valores: { [o.chave]: v } })} />}
          <span className="muted small" title={o.descricao}>
            padrão {o.booleana ? (o.padrao ? 'sim' : 'não') : num(o.padrao)} · {o.fonte}{o.aConfirmar ? ' · a confirmar' : ''}
            {op[o.chave] !== o.padrao && <> · <b>alterada</b></>}
          </span>
        </div>
      ))}
      <div className="row wrap u-mt-6">
        <Button disabled={!alteradas.length} onClick={() => exec('opcoes.definir', { padrao: true })}>Voltar ao padrão</Button>
      </div>
      <Hint>Padrão pela NBR 6118; onde a norma não fixa valor, o critério de referência de mercado, marcado “a confirmar”. Os valores em uso e os alterados saem no memorial.</Hint>
    </Group>
  );
}
