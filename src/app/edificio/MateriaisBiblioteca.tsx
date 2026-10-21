// Biblioteca de materiais (frente N2a): concretos e aços nomeados (fck, aço, controle de execução, γ) gravados na
// biblioteca do usuário e aplicados à obra pelos comandos norma.definir e materiais.definir.
import { useEffect, useState } from 'react';
import { comandosDoPerfil, perfilMateriaisDe, type PerfilMateriais } from '../../core/building/acoes';
import type { BuildingModel } from '../../core/building/types';
import { deleteFromLibrary, listLibrary, loadFromLibrary, saveToLibrary, type LibraryItem } from '../storage';
import { Button, Hint, Select, TextField } from '../ui';
import { useBuilding } from './store';

export function MateriaisBiblioteca({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const [itens, setItens] = useState<LibraryItem[]>([]);
  const [sel, setSel] = useState('');
  const [nome, setNome] = useState('');
  const [msg, setMsg] = useState('');
  const recarregar = () => listLibrary().then((r) => setItens(r.items.filter((i) => i.kind === 'materiais'))).catch(() => {});
  useEffect(() => { recarregar(); }, []);
  const gravar = async () => {
    const p = perfilMateriaisDe(b);
    try { await saveToLibrary('materiais', nome.trim(), `fck ${p.fck} MPa · ${p.aco}${p.controle ? ` · controle ${p.controle}` : ''}`, p); setMsg(`Materiais “${nome.trim()}” gravados.`); setNome(''); recarregar(); } catch (e) { setMsg((e as Error).message); }
  };
  const aplicar = async () => {
    const e = sel ? await loadFromLibrary(sel) : null;
    if (!e) return;
    const r = exec('lote', { comandos: comandosDoPerfil(e.payload as PerfilMateriais) });
    setMsg(r.ok ? `Materiais “${e.name}” aplicados à obra.` : r.erros[0]?.mensagem ?? 'Não foi possível aplicar.');
  };
  const excluir = async () => { if (sel) { await deleteFromLibrary(sel); setSel(''); recarregar(); } };
  return (
    <details className="small">
      <summary>Biblioteca de materiais</summary>
      <div className="row wrap">
        <TextField label="Nome dos materiais" value={nome} onChange={setNome} />
        <Button disabled={!nome.trim()} onClick={gravar}>Gravar materiais da obra</Button>
      </div>
      <div className="row wrap">
        <Select label="Materiais gravados" value={sel} options={[{ v: '', label: itens.length ? '— escolha —' : '(vazia)' }, ...itens.map((i) => ({ v: i.id, label: `${i.name} · ${i.summary}` }))]} onChange={setSel} />
        <Button disabled={!sel} onClick={aplicar}>Aplicar à obra</Button>
        <Button variant="danger" disabled={!sel} onClick={excluir}>Excluir</Button>
        {msg && <span className="hint">{msg}</span>}
      </div>
      <Hint>Grava fck da obra e por tipo de elemento, aço da obra e por posição, controle de execução e γ; aplicar substitui esses valores na obra (cobrimentos e CAA não entram).</Hint>
    </details>
  );
}
