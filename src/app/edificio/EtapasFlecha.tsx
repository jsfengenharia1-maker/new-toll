// N2f: grupo "Etapas de carga (flechas)" na barra lateral do edifício. Etapas por elemento (vigas,
// lajes maciças, lajes treliçadas), colagem de planilha e limites de flecha por tipo.
import { useState } from 'react';
import { type EtapaCarga, type TipoFlecha, etapasDe, lerEtapasColadas, limitesEmUso, TIPOS_ELEMENTO_FLECHA, TIPOS_FLECHA, textoLimite, type TipoElementoFlecha } from '../../core/building/flechas';
import { opcoesEmUso, perfilDe } from '../../core/building/opcoes';
import type { BuildingModel } from '../../core/building/types';
import { Button, Group, Hint, NumCell, OptNumCell, Select, TextCell, Textarea } from '../ui';
import { useBuilding } from './store';

const CAMPOS = ['dias', 'pp', 'alvenaria', 'revestimento', 'variavel'] as const;

export function EtapasFlechaGrupo({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const [el, setEl] = useState<TipoElementoFlecha>('viga');
  const [colar, setColar] = useState('');
  const [erro, setErro] = useState('');
  const etapas = etapasDe(b, el);
  const op = opcoesEmUso(b.opcoes, perfilDe(b));
  const lims = limitesEmUso(b, op, el);
  const alterado = !!b.flechas;
  const temProprias = !!b.flechas?.etapas?.[el];

  const gravar = (nova: EtapaCarga[]) => {
    const r = exec('etapas.definir', { elemento: el, etapas: nova });
    setErro(r.ok ? '' : r.erros[0]?.mensagem ?? 'Não foi possível gravar as etapas.');
  };
  const editar = (i: number, campo: (typeof CAMPOS)[number] | 'nome', valor: string | number) => {
    gravar(etapas.map((e, j) => (j === i ? { ...e, [campo]: valor } : e)));
  };
  const adicionar = () => gravar([...etapas, { nome: `Etapa ${etapas.length + 1}`, dias: 365, pp: 0, alvenaria: 0, revestimento: 0, variavel: 0 }]);
  const remover = () => gravar(etapas.slice(0, -1));
  const aplicarColagem = () => {
    const r = lerEtapasColadas(colar);
    if (typeof r === 'string') { setErro(r); return; }
    setErro('');
    gravar(r);
  };
  const limitar = (tipo: string, limite: { rel: number; mais?: number; abs?: number } | undefined) => {
    exec('flechas.limites', { elemento: el, tipo, limite: limite ?? {} });
  };
  const voltarLimite = (tipo: string) => exec('flechas.limites', { elemento: el, tipo, padrao: true });
  const temLimite = (tipo: TipoFlecha) => !!b.flechas?.limites?.[el]?.[tipo];

  return (
    <Group title={alterado ? 'Etapas de carga (flechas) (alteradas)' : 'Etapas de carga (flechas)'} open={false}>
      <Select label="Elemento" value={el} options={TIPOS_ELEMENTO_FLECHA.map((t) => ({ v: t.v, label: t.rotulo }))} onChange={setEl} />
      <table className="data" data-etapas>
        <thead>
          <tr><th>Etapa</th><th>Idade (dias)</th><th>Peso próprio</th><th>Alvenaria</th><th>Revestimento</th><th>Variável (ψ2·Q)</th></tr>
        </thead>
        <tbody>
          {etapas.map((e, i) => (
            <tr key={i}>
              <td className="tl"><TextCell label="Etapa" value={e.nome} onCommit={(v) => editar(i, 'nome', v)} /></td>
              {CAMPOS.map((c) => (
                <td key={c} className="num"><NumCell label={c} value={e[c]} onChange={(v) => editar(i, c, v)} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row wrap">
        <Button onClick={adicionar}>Adicionar etapa</Button>
        <Button disabled={etapas.length <= 1} onClick={remover}>Remover última</Button>
        <Button disabled={!temProprias} onClick={() => exec('etapas.definir', { elemento: el, padrao: true })}>Voltar ao padrão</Button>
      </div>
      <Hint>Frações de cada carga aplicadas na idade (soma ≤ 1 por coluna). ξ(t) da NBR 6118, Tabela 17.1; a flecha ativa conta a partir da primeira etapa com alvenaria.</Hint>
      <Textarea aria-label="Etapas coladas" rows={4} value={colar} onChange={(e) => setColar(e.target.value)} placeholder={'Desforma\t28\t1\t0\t0\t0\nAlvenaria\t60\t0\t1\t0\t0'} />
      <div className="row wrap">
        <Button disabled={!colar.trim()} onClick={aplicarColagem}>Aplicar colagem</Button>
        {erro && <span className="hint bad">{erro}</span>}
      </div>
      <table className="data" data-limites-flecha>
        <thead>
          <tr><th>Flecha</th><th>ℓ / …</th><th>+ cm</th><th>máx. (cm)</th><th>Em uso</th><th /></tr>
        </thead>
        <tbody>
          {TIPOS_FLECHA.map((t) => {
            const lim = lims[t.v];
            return (
              <tr key={t.v}>
                <td className="tl">{t.rotulo}</td>
                <td><OptNumCell value={b.flechas?.limites?.[el]?.[t.v]?.rel} placeholder={String(lim.rel)} onChange={(v) => limitar(t.v, { rel: v ?? 0, mais: b.flechas?.limites?.[el]?.[t.v]?.mais, abs: b.flechas?.limites?.[el]?.[t.v]?.abs })} /></td>
                <td><OptNumCell value={b.flechas?.limites?.[el]?.[t.v]?.mais} placeholder={String(lim.mais ?? 0)} onChange={(v) => limitar(t.v, { rel: b.flechas?.limites?.[el]?.[t.v]?.rel ?? lim.rel, mais: v, abs: b.flechas?.limites?.[el]?.[t.v]?.abs })} /></td>
                <td><OptNumCell value={b.flechas?.limites?.[el]?.[t.v]?.abs} placeholder={String(lim.abs ?? 0)} onChange={(v) => limitar(t.v, { rel: b.flechas?.limites?.[el]?.[t.v]?.rel ?? lim.rel, mais: b.flechas?.limites?.[el]?.[t.v]?.mais, abs: v })} /></td>
                <td>{textoLimite(lim)}</td>
                <td><Button disabled={!temLimite(t.v)} onClick={() => voltarLimite(t.v)}>Geral</Button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Group>
  );
}
