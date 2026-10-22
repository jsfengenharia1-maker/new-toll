// Muros de arrimo (E1d-2, bloco C): grupo da barra lateral com lançamento, lista de estabilidade e armadura, e mensagens
// do muro selecionado. O cálculo está em core/building/muroArrimoDim; os comandos são muro.arrimo e muro.remover.
import { useState } from 'react';
import { Button, Group, Hint, KV, NumField, OptNumField, Pill, Select, TextField } from '../ui';
import { linhasMuros } from '../../core/building/paredesLista';
import type { BuildingModel } from '../../core/building/types';
import { useBuilding } from './store';
import { usePlanta } from './plantaStore';
import { executarERecalcular } from './Armadura';
import { Mensagens } from './CorridaUI';

const cm2m = (v: number) => +(v / 100).toFixed(4);
const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');
const FONTE_SIGMA = { propria: 'própria do muro', terreno: 'terreno (informada)', spt: 'SPT (menor furo)', nenhuma: '—' } as const;
const METODOS: { v: 'repouso' | 'rankine' | 'coulomb'; label: string }[] = [
  { v: 'repouso', label: 'repouso (K0)' }, { v: 'rankine', label: 'Rankine' }, { v: 'coulomb', label: 'Coulomb' },
];

/** Janela da base do muro de arrimo na fundação (FU7b): σadm do terreno, cota, tensão e quantitativos da base. */
export function JanelaBaseMuro({ id }: { id: string }) {
  const dim = useBuilding((s) => s.dim), b = useBuilding((s) => s.sessao.modelo);
  const m = b.murosArrimo?.find((x) => x.id === id), r = dim?.basesMuros?.find((x) => x.id === id);
  if (!m) return <p className="muted">O muro não existe mais.</p>;
  if (!r) return <p className="muted">Calcule o edifício (aba Dimensionamento) para ver a base do muro.</p>;
  return (
    <div data-janela-base-muro={id}>
      <div className="row wrap u-items-center"><Pill tone={r.status === 'ok' ? 'ok' : 'bad'}>{r.status === 'ok' ? 'atende' : 'não atende'}</Pill></div>
      <KV rows={[
        ['Base', `B ${fmt(r.B)} m · espessura ${fmt(r.hBase * 100, 0)} cm`],
        ['Assentamento', `cota ${fmt(r.cota)} m · ${fmt(r.profundidade)} m abaixo do terreno`],
        ['σ máx. / σadm', `${fmt(r.sigmaMax, 1)} / ${r.sigmaAdm !== null ? fmt(r.sigmaAdm, 0) : '—'} kN/m² (${FONTE_SIGMA[r.sigmaFonte]})`],
        ['Quantitativos por metro', `concreto ${fmt(r.porMetro.concreto)} m³ · forma ${fmt(r.porMetro.forma)} m² · aço ${fmt(r.porMetro.aco, 1)} kg`],
        ...(r.total ? [['Quantitativos totais', `${fmt(r.comprimento ?? 0)} m: concreto ${fmt(r.total.concreto, 1)} m³ · forma ${fmt(r.total.forma, 1)} m² · aço ${fmt(r.total.aco, 0)} kg`]] as [string, string][] : []),
      ]} />
      <Mensagens msgs={r.mensagens} />
      {r.notas.map((n, i) => <p key={i} className="muted small">{n}</p>)}
    </div>
  );
}

/** Grupo "Muros de arrimo": lançamento do muro (balanço isolado, por metro), lista e mensagens do selecionado. */
export function MurosGrupo({ b }: { b: BuildingModel }) {
  const dim = useBuilding((s) => s.dim);
  const muros = b.murosArrimo ?? [];
  const n = muros.length;
  const linhas = linhasMuros(b, dim?.muros);
  const [nome, setNome] = useState('');
  const [H, setH] = useState(3);
  const [tTopo, setTTopo] = useState(20);
  const [tBase, setTBase] = useState(30);
  const [B, setB] = useState(2.6);
  const [ponta, setPonta] = useState(0.5);
  const [hBase, setHBase] = useState(40);
  const [gama, setGama] = useState(18);
  const [phi, setPhi] = useState(30);
  const [metodo, setMetodo] = useState<'repouso' | 'rankine' | 'coulomb'>('rankine');
  const [sobrecarga, setSobrecarga] = useState(10);
  const [atrito, setAtrito] = useState<number | undefined>(undefined);
  const [sigmaAdm, setSigmaAdm] = useState<number | undefined>(undefined);
  const [cota, setCota] = useState<number | undefined>(undefined);
  const [comprimento, setComprimento] = useState<number | undefined>(undefined);
  const [sel, setSel] = useState<string | null>(null);
  const selEf = sel ?? linhas[0]?.id ?? null;
  const mensagens = [...(dim?.muros?.find((m) => m.id === selEf)?.mensagens ?? []), ...(dim?.basesMuros?.find((m) => m.id === selEf)?.mensagens ?? [])];

  return (
    <Group title={`Muros de arrimo (${n})`} open={n > 0}>
      <div className="row wrap" data-mu-form>
        <TextField label="Nome" value={nome || `MA${n + 1}`} onChange={setNome} />
        <NumField label="Altura do fuste" unit="m" width={90} value={H} onChange={setH} />
        <NumField label="Espessura no topo" unit="cm" width={90} value={tTopo} onChange={setTTopo} />
        <NumField label="Espessura na base do fuste" unit="cm" width={90} value={tBase} onChange={setTBase} />
        <NumField label="Largura da base" unit="m" width={90} value={B} onChange={setB} />
        <NumField label="Ponta" unit="m" width={90} value={ponta} onChange={setPonta} />
        <NumField label="Espessura da base" unit="cm" width={90} value={hBase} onChange={setHBase} />
        <NumField label="γ do solo" unit="kN/m³" width={90} value={gama} onChange={setGama} />
        <NumField label="φ do solo" unit="°" width={90} value={phi} onChange={setPhi} />
        <Select label="Método do empuxo" value={metodo} options={METODOS} onChange={setMetodo} />
        <NumField label="Sobrecarga" unit="kN/m²" width={90} value={sobrecarga} onChange={setSobrecarga} />
        <OptNumField label="Atrito base-solo" width={90} value={atrito} onChange={setAtrito} />
        <OptNumField label="σadm do solo" unit="kN/m²" width={96} value={sigmaAdm} onChange={setSigmaAdm} />
        <OptNumField label="Cota de assentamento da base (m; vazio = a da obra)" width={190} value={cota} onChange={setCota} />
        <OptNumField label="Comprimento do muro (m; para os quantitativos da base)" width={190} value={comprimento} onChange={setComprimento} />
        <Button onClick={() => executarERecalcular('muro.arrimo', {
          nome: nome || `MA${n + 1}`, H, tTopo: cm2m(tTopo), tBase: cm2m(tBase), B, ponta, hBase: cm2m(hBase),
          solo: { gama, phi, metodo },
          ...(sobrecarga ? { sobrecarga } : {}),
          ...(atrito !== undefined ? { atrito } : {}),
          ...(sigmaAdm !== undefined ? { sigmaAdm } : {}),
          ...(cota !== undefined ? { cota } : {}),
          ...(comprimento !== undefined ? { comprimento } : {}),
        })}>Lançar muro</Button>
      </div>
      {linhas.length > 0 && (
        <table className="data quadro" data-mu-lista>
          <thead><tr><th>Muro</th><th>Geometria</th><th>FS tombamento</th><th>FS deslizamento</th><th>Tensão máx. / mín.</th><th>Fuste</th><th>Base</th><th>Aço</th><th>Situação</th><th /></tr></thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.id} data-id={l.id} aria-selected={selEf === l.id} className={l.status === 'fail' ? 'bad' : undefined} onClick={() => setSel(l.id)}>
                <td className="tl"><b>{l.nome}</b></td><td className="tl">{l.geometria}</td>
                <td className="num">{l.fsTombamento}</td><td className="num">{l.fsDeslizamento}</td><td className="num">{l.tensao}</td>
                <td className="tl">{l.fuste}</td><td className="tl">{l.base}</td><td className="tl">{l.aco}</td>
                <td><Pill tone={l.situacao === 'calcule' ? 'na' : l.status === 'ok' ? 'ok' : 'bad'}>{l.situacao}</Pill></td>
                <td><Button variant="ghost" aria-label={`Remover ${l.nome}`} onClick={(e) => { e.stopPropagation(); executarERecalcular('muro.remover', { ids: [l.id] }); }}>×</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {(dim?.basesMuros?.length ?? 0) > 0 && (
        <table className="data quadro" data-mu-base>
          <thead><tr><th>Muro</th><th>Base B (m)</th><th>Cota (m) / df (m)</th><th>σmáx / σadm (kN/m²)</th><th>Fonte da σadm</th><th>Folga (kN/m²)</th><th>Concreto da base (m³/m)</th><th>Aço da base (kg/m)</th><th>Total (m³ · kg)</th><th>Situação</th><th /></tr></thead>
          <tbody>
            {dim!.basesMuros!.map((m) => (
              <tr key={m.id} data-id={m.id} className={m.status === 'fail' ? 'bad' : undefined}>
                <td className="tl"><b>{m.nome}</b></td><td className="num">{fmt(m.B)}</td><td className="num">{fmt(m.cota)} / {fmt(m.profundidade)}</td>
                <td className="num">{fmt(m.sigmaMax, 1)} / {m.sigmaAdm !== null ? fmt(m.sigmaAdm, 0) : '—'}</td><td className="tl">{FONTE_SIGMA[m.sigmaFonte]}</td><td className="num">{m.folga !== null ? fmt(m.folga, 1) : '—'}</td>
                <td className="num">{fmt(m.porMetro.concreto)}</td><td className="num">{fmt(m.porMetro.aco, 1)}</td><td className="num">{m.total ? `${fmt(m.total.concreto, 1)} · ${fmt(m.total.aco, 0)}` : '—'}</td>
                <td><Pill tone={m.status === 'ok' ? 'ok' : 'bad'}>{m.status === 'ok' ? 'atende' : 'não atende'}</Pill></td>
                <td><Button variant="ghost" aria-label={`Resultados da base de ${m.nome}`} onClick={() => usePlanta.getState().set({ janela: { tipo: 'fundacao', id: m.id } })}>base</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Hint>Muro de arrimo em balanço isolado, por metro: estabilidade (tombamento, deslizamento, tensões) e armadura do fuste e da base. Premissas e1c-muro-arrimo e e1d-muro-arrimo a confirmar. Calcule o edifício para ver o resultado.</Hint>
      {selEf && (
        <ul data-mu-mensagens>
          {mensagens.length > 0 ? mensagens.map((m, i) => <li key={i}>{m}</li>) : <li>Sem mensagens.</li>}
        </ul>
      )}
    </Group>
  );
}
