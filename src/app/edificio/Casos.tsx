// Grupo "Casos de carga" da barra lateral (frentes N1c e N2a): G, Q e as categorias de uso (QB, QC) como casos
// fixos; casos adicionais com natureza (G, Q, W, E, H = empuxo), descrição, grupo de incompatibilidade, caso simultâneo,
// ψ e arranjos (casos filhos); compatibilidade par a par e gerador de arranjos em CasosArranjos.tsx.
import { useState } from 'react';
import { casosDaObra, type BuildingModel, type Natureza } from '../../core/building/types';
import { Button, Group, Hint, NumCell, Select, TextCell, TextField } from '../ui';
import { ArranjosCasos, CombinarAdicionais, CompatibilidadeCasos } from './CasosArranjos';
import { useBuilding } from './store';

export const NATUREZAS: { v: Natureza; label: string }[] = [
  { v: 'G', label: 'Permanente (G)' }, { v: 'Q', label: 'Variável (Q)' }, { v: 'W', label: 'Vento / horizontal (W)' }, { v: 'E', label: 'Excepcional (E)' }, { v: 'H', label: 'Empuxo de terra (H)' },
];
export const naturezaTexto = (n: Natureza) => NATUREZAS.find((x) => x.v === n)?.label ?? n;

/** ψ0, ψ1, ψ2 em uso: o do caso ou o padrão (uso da obra para Q, 0,6/0,3/0 para W). */
export const psiDoCaso = (b: BuildingModel, c: { natureza: Natureza; psi?: [number, number, number] }): [number, number, number] | null =>
  c.natureza === 'G' || c.natureza === 'E' || c.natureza === 'H' ? null : c.psi ?? (c.natureza === 'W' ? [0.6, 0.3, 0] : b.norma.psiQ ?? [0.5, 0.4, 0.3]);

/** ψ editável dos casos fixos: Q (norma.psiQ) e as categorias de uso B e C (norma.psiUso). */
const PSI_FIXO: Record<string, (psi: [number, number, number]) => Record<string, unknown>> = {
  Q: (psi) => ({ psiQ: psi }), QB: (psi) => ({ psiUso: { B: psi } }), QC: (psi) => ({ psiUso: { C: psi } }),
};

export function CasosGrupo({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const [nome, setNome] = useState('');
  const [nat, setNat] = useState<Natureza>('Q');
  const todos = casosDaObra(b);
  const adicionais = b.casos ?? [];
  const fixos = todos.filter((c) => !adicionais.some((a) => a.id === c.id));
  const paiNome = (id?: string) => adicionais.find((a) => a.id === id)?.nome;
  const criar = () => { if (nome.trim()) { exec('caso.criar', { nome: nome.trim(), natureza: nat }); setNome(''); } };
  const empuxos = b.empuxos ?? [];
  return (
    <Group title={`Casos de carga (${todos.length})`} open={false}>
      <table className="data loads-ed quadro">
        <thead><tr><th>Caso</th><th>Natureza</th><th>Grupo</th><th>Simultâneo com</th><th>ψ0</th><th>ψ1</th><th>ψ2</th><th /></tr></thead>
        <tbody>
          {fixos.map((c) => (
            <tr key={c.id}><td className="tl">{c.nome}</td><td className="tl small">{naturezaTexto(c.natureza)}</td><td>—</td><td>—</td>
              {[0, 1, 2].map((i) => <td key={i}>{c.psi && PSI_FIXO[c.id] ? <NumCell value={c.psi[i]} onChange={(v) => exec('norma.definir', PSI_FIXO[c.id](c.psi!.map((x, k) => (k === i ? v : x)) as [number, number, number]))} /> : <span className="muted">{c.psi ? String(c.psi[i]).replace('.', ',') : '—'}</span>}</td>)}<td /></tr>
          ))}
          {adicionais.map((c) => {
            const pai = paiNome(c.pai), filhos = adicionais.filter((x) => x.pai === c.id);
            const ef = todos.find((x) => x.id === c.id);
            const psi = psiDoCaso(b, { natureza: ef?.natureza ?? c.natureza, psi: ef?.psi ?? c.psi });
            const outros = todos.filter((x) => x.id !== c.id);
            return (
              <tr key={c.id}>
                <td><TextCell value={c.nome} label={`Nome do caso ${c.nome}`} onCommit={(v) => exec('caso.editar', { id: c.id, nome: v })} />{pai && <span className="hint">arranjo de {pai}</span>}{filhos.length > 0 && <span className="hint">{filhos.length} arranjo(s)</span>}</td>
                <td><select aria-label={`Natureza de ${c.nome}`} value={c.natureza} disabled={!!pai || filhos.length > 0} onChange={(e) => exec('caso.editar', { id: c.id, natureza: e.target.value })}>
                  {NATUREZAS.map((n) => <option key={n.v} value={n.v}>{n.label}</option>)}</select></td>
                <td>{pai || filhos.length ? <span className="muted">{pai ? 'arranjos' : '—'}</span> : <TextCell value={c.grupo ?? ''} label={`Grupo de ${c.nome}`} onCommit={(v) => exec('caso.editar', { id: c.id, grupo: v === '-' ? '' : v })} />}</td>
                <td>{filhos.length ? <span className="muted">—</span> : <select aria-label={`Simultâneo com ${c.nome}`} value={c.simultaneo ?? ''} onChange={(e) => exec('caso.editar', { id: c.id, simultaneo: e.target.value })}>
                  <option value="">—</option>{outros.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</select>}</td>
                {[0, 1, 2].map((i) => <td key={i}>{psi && !filhos.length ? <NumCell value={psi[i]} onChange={(v) => exec('caso.editar', { id: c.id, psi: psi.map((x, k) => (k === i ? v : x)) })} /> : <span className="muted">—</span>}</td>)}
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
      {adicionais.length > 0 && (
        <details className="small">
          <summary>Descrição dos casos</summary>
          <table className="data quadro">
            <thead><tr><th>Caso</th><th>Descrição</th></tr></thead>
            <tbody>{adicionais.map((c) => <tr key={c.id}><td className="tl">{c.nome}</td><td><input aria-label={`Descrição de ${c.nome}`} defaultValue={c.descricao ?? ''} key={c.descricao ?? ''} onBlur={(e) => e.target.value !== (c.descricao ?? '') && exec('caso.editar', { id: c.id, descricao: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} /></td></tr>)}</tbody>
          </table>
        </details>
      )}
      {adicionais.some((c) => c.natureza === 'H') && (
        <div className="row wrap">
          {adicionais.filter((c) => c.natureza === 'H').map((c) => (
            <Select key={c.id} label={`Empuxo de ${c.nome}`} value={c.empuxo ?? ''} options={[{ v: '', label: empuxos.length ? '— escolha o tipo —' : '(crie um tipo em Empuxo de terra)' }, ...empuxos.map((e) => ({ v: e.id, label: e.nome }))]} onChange={(v) => exec('caso.editar', { id: c.id, empuxo: v })} />
          ))}
        </div>
      )}
      <CompatibilidadeCasos b={b} />
      <CombinarAdicionais b={b} />
      <ArranjosCasos b={b} />
      <Hint>Q, QB e QC: carga de uso por categoria (QB escritórios, QC garagens; opção “categorias de uso como casos próprios”), combinadas como ações variáveis distintas. Grupo: casos com o mesmo grupo são incompatíveis e nunca atuam juntos (digite “-” para limpar). Simultâneo: o caso entra nas combinações com o mesmo fator do caso escolhido. Natureza H: empuxo de terra, permanente com γh próprio (em Materiais e segurança). Cargas dos casos: na planta e nos pilares selecionados. Grupo de uso “Misto” fica sem carga variável geral: cada carga de área escolhe a categoria (Q, QB ou QC).</Hint>
    </Group>
  );
}
