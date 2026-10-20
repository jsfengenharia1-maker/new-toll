// Grupo "Casos de carga" da barra lateral (frente N1c): G e Q fixos e casos adicionais com natureza, grupo de
// incompatibilidade, caso simultâneo e ψ.
import { useState } from 'react';
import { casosDaObra, type BuildingModel, type Natureza } from '../../core/building/types';
import { Button, Group, Hint, NumCell, Select, TextCell, TextField } from '../ui';
import { useBuilding } from './store';

export const NATUREZAS: { v: Natureza; label: string }[] = [
  { v: 'G', label: 'Permanente (G)' }, { v: 'Q', label: 'Variável (Q)' }, { v: 'W', label: 'Vento / horizontal (W)' }, { v: 'E', label: 'Excepcional (E)' },
];
export const naturezaTexto = (n: Natureza) => NATUREZAS.find((x) => x.v === n)?.label ?? n;

/** ψ0, ψ1, ψ2 em uso: o do caso ou o padrão (uso da obra para Q, 0,6/0,3/0 para W). */
export const psiDoCaso = (b: BuildingModel, c: { natureza: Natureza; psi?: [number, number, number] }): [number, number, number] | null =>
  c.natureza === 'G' || c.natureza === 'E' ? null : c.psi ?? (c.natureza === 'W' ? [0.6, 0.3, 0] : b.norma.psiQ ?? [0.5, 0.4, 0.3]);

export function CasosGrupo({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const [nome, setNome] = useState('');
  const [nat, setNat] = useState<Natureza>('Q');
  const todos = casosDaObra(b);
  const adicionais = b.casos ?? [];
  const criar = () => { if (nome.trim()) { exec('caso.criar', { nome: nome.trim(), natureza: nat }); setNome(''); } };
  return (
    <Group title={`Casos de carga (${todos.length})`} open={false}>
      <table className="data loads-ed quadro">
        <thead><tr><th>Caso</th><th>Natureza</th><th>Grupo</th><th>Simultâneo com</th><th>ψ0</th><th>ψ1</th><th>ψ2</th><th /></tr></thead>
        <tbody>
          {todos.slice(0, 2).map((c) => (
            <tr key={c.id}><td className="tl">{c.nome}</td><td className="tl small">{naturezaTexto(c.natureza)}</td><td>—</td><td>—</td>
              {[0, 1, 2].map((i) => <td key={i} className="num">{c.psi ? String(c.psi[i]).replace('.', ',') : '—'}</td>)}<td /></tr>
          ))}
          {adicionais.map((c) => {
            const psi = psiDoCaso(b, c);
            const outros = todos.filter((x) => x.id !== c.id);
            return (
              <tr key={c.id}>
                <td><TextCell value={c.nome} label={`Nome do caso ${c.nome}`} onCommit={(v) => exec('caso.editar', { id: c.id, nome: v })} /></td>
                <td><select aria-label={`Natureza de ${c.nome}`} value={c.natureza} onChange={(e) => exec('caso.editar', { id: c.id, natureza: e.target.value })}>
                  {NATUREZAS.map((n) => <option key={n.v} value={n.v}>{n.label}</option>)}</select></td>
                <td><TextCell value={c.grupo ?? ''} label={`Grupo de ${c.nome}`} onCommit={(v) => exec('caso.editar', { id: c.id, grupo: v === '-' ? '' : v })} /></td>
                <td><select aria-label={`Simultâneo com ${c.nome}`} value={c.simultaneo ?? ''} onChange={(e) => exec('caso.editar', { id: c.id, simultaneo: e.target.value })}>
                  <option value="">—</option>{outros.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</select></td>
                {[0, 1, 2].map((i) => <td key={i}>{psi ? <NumCell value={psi[i]} onChange={(v) => exec('caso.editar', { id: c.id, psi: psi.map((x, k) => (k === i ? v : x)) })} /> : <span className="muted">—</span>}</td>)}
                <td><Button variant="danger" aria-label={`Remover ${c.nome}`} onClick={() => exec('caso.remover', { id: c.id })}>×</Button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="row wrap">
        <TextField label="Novo caso" value={nome} onChange={setNome} />
        <Select label="Natureza" value={nat} options={NATUREZAS} onChange={setNat} />
        <Button disabled={!nome.trim()} onClick={criar}>Criar caso</Button>
      </div>
      <Hint>Grupo: casos com o mesmo grupo são incompatíveis e nunca atuam juntos (digite “-” para limpar). Simultâneo: o caso entra nas combinações com o mesmo fator do caso escolhido. ψ só para variáveis (Q), vento e ações horizontais (W); o ψ de Q fixo está em “Vento e combinações”. Excepcionais (E) geram combinações próprias. Cargas dos casos: na planta e nos pilares selecionados.</Hint>
    </Group>
  );
}
