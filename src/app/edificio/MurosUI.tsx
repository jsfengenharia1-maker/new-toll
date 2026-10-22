// Muros de arrimo (E1d-2, bloco C): grupo da barra lateral com lançamento, lista de estabilidade e armadura, e mensagens
// do muro selecionado. O cálculo está em core/building/muroArrimoDim; os comandos são muro.arrimo e muro.remover.
import { useState } from 'react';
import { Button, Group, Hint, NumField, OptNumField, Pill, Select, TextField } from '../ui';
import { linhasMuros } from '../../core/building/paredesLista';
import type { BuildingModel } from '../../core/building/types';
import { useBuilding } from './store';
import { executarERecalcular } from './Armadura';

const cm2m = (v: number) => +(v / 100).toFixed(4);
const METODOS: { v: 'repouso' | 'rankine' | 'coulomb'; label: string }[] = [
  { v: 'repouso', label: 'repouso (K0)' }, { v: 'rankine', label: 'Rankine' }, { v: 'coulomb', label: 'Coulomb' },
];

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
  const [sel, setSel] = useState<string | null>(null);
  const selEf = sel ?? linhas[0]?.id ?? null;
  const mensagens = dim?.muros?.find((m) => m.id === selEf)?.mensagens ?? [];

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
        <Button onClick={() => executarERecalcular('muro.arrimo', {
          nome: nome || `MA${n + 1}`, H, tTopo: cm2m(tTopo), tBase: cm2m(tBase), B, ponta, hBase: cm2m(hBase),
          solo: { gama, phi, metodo },
          ...(sobrecarga ? { sobrecarga } : {}),
          ...(atrito !== undefined ? { atrito } : {}),
          ...(sigmaAdm !== undefined ? { sigmaAdm } : {}),
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
      <Hint>Muro de arrimo em balanço isolado, por metro: estabilidade (tombamento, deslizamento, tensões) e armadura do fuste e da base. Premissas e1c-muro-arrimo e e1d-muro-arrimo a confirmar. Calcule o edifício para ver o resultado.</Hint>
      {selEf && (
        <ul data-mu-mensagens>
          {mensagens.length > 0 ? mensagens.map((m, i) => <li key={i}>{m}</li>) : <li>Sem mensagens.</li>}
        </ul>
      )}
    </Group>
  );
}
