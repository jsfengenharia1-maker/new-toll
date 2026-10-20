// Grupo "Opções de cálculo" da barra lateral do edifício (frente N1a): cada opção com padrão, fonte e "a confirmar".
// Dois perfis de padrões: o do sistema (critério de mercado) e o da NBR 6118; no perfil NBR, o padrão do sistema
// aparece ao lado, só como referência da diferença.
import { OPCOES_DIFERENTES_NBR, OPCOES_INFO, PERFIS, opcoesAlteradas, opcoesEmUso, padraoDe, perfilDe, type PerfilOpcoes } from '../../core/building/opcoes';
import type { BuildingModel } from '../../core/building/types';
import { Button, Check, Group, Hint, NumField, Select } from '../ui';
import { useBuilding } from './store';

const num = (v: number) => String(v).replace('.', ',');

/** Opções de divisor ("p·ℓ² / …"): 0 = desligado. */
export const desligadaEmZero = (o: { rotulo: string }) => o.rotulo.includes('/ …');
/** Valor de uma opção para exibição: sim/não, "desligado" (divisor 0) ou número com vírgula. */
export const valorOpcaoTxt = (o: { rotulo: string; booleana?: boolean }, v: number, fmtNum: (v: number) => string = num) => (o.booleana ? (v ? 'sim' : 'não') : desligadaEmZero(o) && v === 0 ? 'desligado' : fmtNum(v));

export function OpcoesGrupo({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const perfil = perfilDe(b);
  const op = opcoesEmUso(b.opcoes, perfil);
  const alteradas = opcoesAlteradas(b.opcoes, perfil);
  const outro: PerfilOpcoes = perfil === 'nbr' ? 'sistema' : 'nbr';
  const val = (o: (typeof OPCOES_INFO)[number], v: number) => valorOpcaoTxt(o, v);
  return (
    <Group title={`Opções de cálculo${alteradas.length ? ` (${alteradas.length} alterada${alteradas.length > 1 ? 's' : ''})` : ''}`} open={false}>
      <div className="row wrap u-items-end">
        <Select label="Perfil dos padrões" value={perfil} options={PERFIS.map((x) => ({ v: x.v, label: x.rotulo }))} onChange={(v) => exec('opcoes.definir', { perfil: v })} />
      </div>
      <Hint>
        {perfil === 'nbr'
          ? `Padrão NBR 6118 em uso. Diferem do padrão do sistema: ${OPCOES_DIFERENTES_NBR.map((o) => `${o.rotulo.toLowerCase()} (NBR ${val(o, padraoDe(o, 'nbr'))}; sistema ${val(o, o.padrao)})`).join('; ')}.`
          : `Padrão do sistema em uso (critério de mercado). Diferem da NBR 6118: ${OPCOES_DIFERENTES_NBR.map((o) => `${o.rotulo.toLowerCase()} (sistema ${val(o, o.padrao)}; NBR ${val(o, padraoDe(o, 'nbr'))})`).join('; ')}.`}
      </Hint>
      {OPCOES_INFO.map((o) => {
        const pad = padraoDe(o, perfil), dif = o.padraoNBR !== undefined && o.padraoNBR !== o.padrao;
        return (
          <div key={o.chave} className="row wrap u-items-end">
            {o.booleana
              ? <Check label={o.rotulo} checked={!!op[o.chave]} onChange={(c) => exec('opcoes.definir', { valores: { [o.chave]: c ? 1 : 0 } })} />
              : <NumField label={o.rotulo} unit={o.unidade} width={190} value={op[o.chave]} onChange={(v) => exec('opcoes.definir', { valores: { [o.chave]: v } })} />}
            {desligadaEmZero(o) && op[o.chave] === 0 && <span className="muted small" data-opcao-desligada={o.chave}>desligado</span>}
            <span className="muted small" title={o.descricao}>
              padrão {perfil === 'nbr' ? 'NBR' : 'do sistema'} {val(o, pad)} · {perfil === 'nbr' && o.fonteNBR ? o.fonteNBR : o.fonte}{o.aConfirmar && !(perfil === 'nbr' && o.fonteNBR) ? ' · a confirmar' : ''}
              {dif && <> · <b>{perfil === 'nbr' ? 'sistema' : 'NBR'}: {val(o, padraoDe(o, outro))}</b></>}
              {op[o.chave] !== pad && <> · <b>alterada</b></>}
            </span>
          </div>
        );
      })}
      <div className="row wrap u-mt-6">
        <Button disabled={!alteradas.length} onClick={() => exec('opcoes.definir', { padrao: true })}>Voltar ao padrão do perfil</Button>
      </div>
      <Hint>Padrão do sistema: critério de mercado (programa de referência) onde ele fixa valor; onde não fixa, a NBR 6118. Padrão NBR 6118: só o que a norma prescreve. Valores sem fonte normativa ficam marcados “a confirmar”. Os valores em uso, o perfil e as diferenças saem no memorial.</Hint>
    </Group>
  );
}
