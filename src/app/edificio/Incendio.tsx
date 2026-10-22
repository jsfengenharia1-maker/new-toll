// N2g: grupo "Incêndio" na barra lateral do edifício: verificação (estado-limite), ocupação, altura, TRRF e
// revestimento por grupo de pavimentos.
import { useState } from 'react';
import { estadoEmUso } from '../../core/building/acoes';
import { alturaDaEdificacao, MATERIAIS_REVESTIMENTO, sugestaoTrrf, trrfDoGrupo, type MaterialRevestimento } from '../../core/building/fogo';
import { DIVISOES_OCUPACAO } from '../../core/building/fogoTabelas';
import { opcoesEmUso, perfilDe } from '../../core/building/opcoes';
import type { BuildingModel } from '../../core/building/types';
import { Button, Check, Group, Hint, NumCell, NumField, OptNumCell, Select } from '../ui';
import { useBuilding } from './store';

const ORIGEM = { elemento: 'do elemento', grupo: 'do grupo', ocupacao: 'da ocupação', padrao: 'padrão (opções)' } as const;
type Mat = MaterialRevestimento | '';
const MATERIAIS: { v: Mat; label: string }[] = [{ v: '', label: 'sem revestimento' }, ...MATERIAIS_REVESTIMENTO.map((m) => ({ v: m.v as Mat, label: m.rotulo }))];
type TipoEl = 'viga' | 'pilar' | 'laje';
const TIPOS_EL: { v: TipoEl; label: string }[] = [{ v: 'viga', label: 'Viga' }, { v: 'pilar', label: 'Pilar' }, { v: 'laje', label: 'Laje' }];
const OCUPACOES:{ v: string; label: string }[] = [{ v: '', label: '— não informada —' }, ...DIVISOES_OCUPACAO.map((d) => ({ v: d.divisao, label: `${d.divisao} — ${d.ocupacao}` }))];

export function IncendioGrupo({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const [erro, setErro] = useState('');
  const op = opcoesEmUso(b.opcoes, perfilDe(b));
  const ativo = estadoEmUso(b, 'incendio').ativo;
  const sug = sugestaoTrrf(b);
  const f = (p: Record<string, unknown>) => {
    const r = exec('fogo.definir', p);
    setErro(r.ok ? '' : r.erros[0]?.mensagem ?? 'Não foi possível alterar os dados de incêndio.');
  };
  const grupos = [...new Set(b.pavimentos.map((p) => p.grupo))];
  const nomeGrupo = (g: string) => b.grupos.find((x) => x.id === g)?.nome ?? g;

  return (
    <Group title={ativo ? 'Incêndio (ligado)' : 'Incêndio'} open={false}>
      <Check label="Verificar resistência ao fogo (NBR 15200)" checked={ativo} onChange={(c) => f({ ativo: c })} />
      <Select label="Ocupação (NBR 14432 / IT)" value={b.fogo?.ocupacao ?? ''} options={OCUPACOES} onChange={(v) => (v === '' ? f({ remover: { ocupacao: true } }) : f({ ocupacao: v }))} />
      <div className="row wrap">
        <NumField label="Altura da edificação" unit="m" value={b.fogo?.altura ?? alturaDaEdificacao(b)} onChange={(v) => f({ altura: v })} />
        <Button disabled={b.fogo?.altura === undefined} onClick={() => f({ remover: { altura: true } })}>Altura pelos pavimentos</Button>
      </div>
      <Hint>
        {sug
          ? `Sugestão: TRRF de ${sug.trrf === null ? 'consultar o corpo técnico' : `${sug.trrf} min`} (classe ${sug.classe}; ${sug.ocupacao}). ${sug.aviso ?? ''} ${sug.fonte}.`
          : 'Informe a ocupação para sugerir o TRRF pela altura da edificação.'}
      </Hint>
      <table className="data" data-fogo-grupos>
        <thead>
          <tr><th>Grupo</th><th>TRRF (min)</th><th>Origem</th><th>Revestimento</th><th>Espessura (mm)</th></tr>
        </thead>
        <tbody>
          {grupos.map((g) => {
            const rev = b.fogo?.revestimentos?.[g];
            const t = trrfDoGrupo(b, op, g);
            return (
              <tr key={g}>
                <td className="tl">{nomeGrupo(g)}</td>
                <td className="num">
                  <OptNumCell value={b.fogo?.trrf?.[g]} placeholder={String(t.trrf)} onChange={(v) => (v === undefined ? f({ remover: { trrf: [g] } }) : f({ trrf: { [g]: v } }))} />
                </td>
                <td className="tl small">{ORIGEM[t.origem]}</td>
                <td className="tl">
                  <Select value={(rev?.material ?? '') as Mat} options={MATERIAIS} onChange={(m) => (m === '' ? f({ remover: { revestimentos: [g] } }) : f({ revestimentos: { [g]: { material: m, espessura: rev?.espessura ?? 15 } } }))} />
                </td>
                <td className="num">
                  {rev ? <NumCell label="Espessura do revestimento (mm)" value={rev.espessura} onChange={(v) => f({ revestimentos: { [g]: { material: rev.material, espessura: v } } })} /> : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <h4>Por elemento</h4>
      <IncendioElementos b={b} f={f} />
      {erro && <span className="hint bad">{erro}</span>}
      <Hint>
        TRRF em branco usa a sugestão da ocupação ou o padrão das opções de cálculo (60 min). Método tabular da NBR 15200 (edição de 2004, até 120 min) em vigas e lajes; pilares pelo método analítico. O revestimento soma a c1 (e às dimensões de vigas e lajes) pela eficiência do material. TRRF, método dos pilares e μfi padrão ficam em Opções de cálculo.
      </Hint>
    </Group>
  );
}

/** Dados de incêndio de um elemento (TRRF próprio, revestimento, faces e μfi dos pilares, funções das lajes). */
function IncendioElementos({ b, f }: { b: BuildingModel; f: (p: Record<string, unknown>) => void }) {
  const op = opcoesEmUso(b.opcoes, perfilDe(b));
  const [tipo, setTipo] = useState<TipoEl>('viga');
  const [id, setId] = useState('');
  const lista = tipo === 'viga' ? b.vigas : tipo === 'pilar' ? b.pilares : b.lajes;
  const el = lista.find((x) => x.id === id) ?? lista[0];
  const c = el ? b.fogo?.elementos?.[el.id] : undefined;
  const rev = c?.revestimento;
  const grava = (p: Record<string, unknown>) => { if (el) f({ elementos: { [el.id]: p } }); };
  const tira = (...chaves: string[]) => { if (el) f({ remover: { elementos: { [el.id]: chaves } } }); };
  return (
    <>
      <div className="row wrap">
        <Select label="Tipo" value={tipo} options={TIPOS_EL} onChange={(t) => { setTipo(t); setId(''); }} />
        <Select label="Elemento" value={el?.id ?? ''} options={lista.map((x) => ({ v: x.id, label: x.nome }))} onChange={setId} />
      </div>
      {!el ? <Hint>Sem elementos deste tipo.</Hint> : (
        <table className="data" data-fogo-elemento>
          <thead><tr><th>Dado</th><th>Valor</th></tr></thead>
          <tbody>
            <tr>
              <td className="tl">TRRF do elemento (min)</td>
              <td className="num"><OptNumCell value={c?.trrf} placeholder="do grupo" onChange={(v) => (v === undefined ? tira('trrf') : grava({ trrf: v }))} /></td>
            </tr>
            <tr>
              <td className="tl">Revestimento de proteção</td>
              <td className="tl"><Select value={(rev?.material ?? '') as Mat} options={MATERIAIS} onChange={(m) => (m === '' ? tira('revestimento') : grava({ revestimento: { material: m, espessura: rev?.espessura ?? 15 } }))} /></td>
            </tr>
            {rev && (
              <tr>
                <td className="tl">Espessura do revestimento (mm)</td>
                <td className="num"><NumCell label="Espessura do revestimento do elemento (mm)" value={rev.espessura} onChange={(v) => grava({ revestimento: { material: rev.material, espessura: v } })} /></td>
              </tr>
            )}
            {tipo === 'pilar' && (
              <>
                <tr>
                  <td className="tl">Faces expostas ao fogo</td>
                  <td className="num"><OptNumCell value={c?.faces} placeholder={String(op.fogoFacesPilar)} onChange={(v) => (v === undefined ? tira('faces') : grava({ faces: v }))} /></td>
                </tr>
                <tr>
                  <td className="tl">μfi do pilar</td>
                  <td className="num"><OptNumCell value={c?.muFi} placeholder={String(op.fogoMuFi)} onChange={(v) => (v === undefined ? tira('muFi') : grava({ muFi: v }))} /></td>
                </tr>
              </>
            )}
            {tipo === 'laje' && (
              <>
                <tr>
                  <td className="tl">Laje compartimentadora</td>
                  <td className="tl"><Check label="Verificar também a espessura mínima" checked={c?.compartimentadora ?? !!op.fogoLajeCompartimentadora} onChange={(v) => grava({ compartimentadora: v })} /></td>
                </tr>
                <tr>
                  <td className="tl">Laje lisa (sem vigas)</td>
                  <td className="tl"><Check label="Tabela das lajes lisas" checked={c?.lisa ?? false} onChange={(v) => (v ? grava({ lisa: true }) : tira('lisa'))} /></td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      )}
      <div className="row wrap">
        <Button disabled={!c} onClick={() => tira()}>Limpar dados do elemento</Button>
      </div>
    </>
  );
}
