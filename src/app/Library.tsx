import { useEffect, useState } from 'react';
import { useStore } from './store';
import { deleteFromLibrary, listLibrary, loadFromLibrary, saveToLibrary, type LibraryItem, type SavedCharacteristics } from './storage';
import { getDesign, useAnalysis } from './results';
import type { Model } from '../core/types';
import type { DesignReport } from '../core/design';
import { sampleFoundation } from '../core/piles';
import { getHistory, logActivity } from './history';

export function buildCharacteristics(model: Model, rep: DesignReport): SavedCharacteristics {
  return {
    projectName: model.name,
    savedFrom: 'Dimensionamento do pórtico',
    supports: rep.foundation.map((f, i) => ({
      id: i + 1,
      label: `Apoio ${f.nodeId}`,
      Nk: Math.max(0, f.charMax[1]),
      NkMin: f.charMin[1],
      Hx: Math.max(Math.abs(f.charMax[0]), Math.abs(f.charMin[0])),
      Hy: 0,
      Mx: 0,
      My: Math.max(Math.abs(f.charMax[2]), Math.abs(f.charMin[2])),
      source: model.name,
    })),
    members: rep.members.map((m) => ({ id: m.id, role: m.role, section: m.sectionName, material: m.materialName, status: m.status, summary: m.summary, NdMax: m.NdMax })),
    settings: { ...rep.settings },
  };
}

export async function saveCharacteristics(model: Model, rep: DesignReport) {
  const ch = buildCharacteristics(model, rep);
  const name = `${model.name} · características`;
  const summary = `${ch.supports.length} apoios · ${ch.members.length} barras · ${rep.ok ? 'atende' : 'com pendências'}`;
  return saveToLibrary('characteristics', name, summary, ch);
}

export function Library() {
  const st = useStore();
  const a = useAnalysis();
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [mode, setMode] = useState<'cloud' | 'local'>('local');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [name, setName] = useState(st.model.name);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [histAll, setHistAll] = useState(false);
  const history = getHistory().slice().reverse();

  const refresh = async () => {
    try { const r = await listLibrary(); setItems(r.items); setMode(r.mode); setErr(''); } catch (e) { setErr(`Não foi possível ler a biblioteca (${(e as { code?: string }).code ?? 'erro'}).`); setItems([]); }
  };
  useEffect(() => { refresh(); }, []);

  const close = () => st.set({ libraryOpen: false });
  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e) { setErr((e as Error).message || 'Falha ao salvar.'); } setBusy(false); };

  const saveProject = (overwrite: boolean) => run(async () => {
    const m = { ...st.model, name: name || st.model.name };
    const summary = `${m.nodes.length} nós · ${m.members.length} barras · ${m.cases.length} casos${m.foundation ? ' · fundação' : ''}`;
    const r = await saveToLibrary('project', m.name, summary, m, overwrite ? st.libraryId ?? undefined : undefined);
    if (m.name !== st.model.name) st.commit((x) => { x.name = m.name; });
    logActivity(overwrite ? 'Projeto atualizado na biblioteca' : 'Projeto salvo na biblioteca', m.name);
    st.set({ libraryId: r.id, message: r.mode === 'cloud' ? `Projeto “${m.name}” salvo na sua conta.` : `Projeto “${m.name}” salvo neste navegador.` });
    await refresh();
  });

  const saveChars = () => run(async () => {
    if (a.prep.error) throw new Error('Modelo instável: corrija antes de salvar características.');
    const r = await saveCharacteristics(st.model, getDesign(a));
    logActivity('Características do dimensionamento salvas', st.model.name);
    st.set({ message: r.mode === 'cloud' ? 'Características salvas na sua conta.' : 'Características salvas neste navegador.' });
    await refresh();
  });

  const open = (it: LibraryItem) => run(async () => {
    const e = await loadFromLibrary(it.id);
    if (!e) throw new Error('Registro não encontrado.');
    if (e.kind === 'project') {
      st.setModel(e.payload as Model, false);
      st.set({ libraryId: e.id, libraryOpen: false, module: 'portico', message: `Projeto “${e.name}” aberto.` });
      logActivity('Projeto aberto da biblioteca', e.name);
    } else {
      const ch = e.payload as SavedCharacteristics;
      st.commit((m) => {
        const f = m.foundation ?? sampleFoundation();
        f.loads = ch.supports.map((s, i) => ({ ...s, id: i + 1, source: e.name }));
        if (!m.foundation) { f.boring = sampleFoundation().boring; }
        m.foundation = f;
      }, `Cargas de “${e.name}” carregadas no módulo de fundações.`);
      st.set({ libraryOpen: false, module: 'fundacoes' });
    }
  });

  const del = (id: string) => run(async () => { await deleteFromLibrary(id); setConfirmDel(null); await refresh(); });

  const projects = items?.filter((i) => i.kind === 'project') ?? [];
  const chars = items?.filter((i) => i.kind === 'characteristics') ?? [];
  const date = (s: string) => new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  const renderList = (list: LibraryItem[], empty: string, action: string) => (
    list.length === 0 ? <p className="hint">{empty}</p> : (
      <ul className="liblist">
        {list.map((it) => (
          <li key={it.id}>
            <div className="libmain"><b>{it.name}</b><span className="muted">{date(it.savedAt)} · {it.summary}</span></div>
            {confirmDel === it.id ? (
              <span className="libact"><button type="button" className="btn danger" disabled={busy} onClick={() => del(it.id)}>Excluir</button><button type="button" className="btn ghost" onClick={() => setConfirmDel(null)}>Cancelar</button></span>
            ) : (
              <span className="libact"><button type="button" className="btn" disabled={busy} onClick={() => open(it)}>{action}</button><button type="button" className="x" aria-label="Excluir" onClick={() => setConfirmDel(it.id)}>×</button></span>
            )}
          </li>
        ))}
      </ul>
    )
  );

  return (
    <div className="modal-back" role="dialog" aria-label="Biblioteca" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="modal">
        <div className="modal-head">
          <b>Biblioteca</b>
          <span className={`pill ${mode === 'cloud' ? 'ok' : 'na'}`} title={mode === 'cloud' ? undefined : 'Limpar os dados do navegador apaga a biblioteca. Use Salvar no computador para guardar tudo num arquivo.'}>{mode === 'cloud' ? 'Salvo na sua conta' : 'Salvo neste navegador'}</span>
          <span style={{ flex: 1 }} />
          <button type="button" className="btn ghost" onClick={close}>Fechar</button>
        </div>
        {err && <div className="alert" style={{ margin: '0 0 10px' }}>{err}</div>}
        <div className="libsave">
          <label className="field grow" htmlFor="libname"><span className="flabel">Nome do projeto</span><span className="finput"><input id="libname" value={name} onChange={(e) => setName(e.target.value)} /></span></label>
          {st.libraryId && <button type="button" className="btn" disabled={busy} onClick={() => saveProject(true)}>Atualizar salvo</button>}
          <button type="button" className="btn primary" disabled={busy} onClick={() => saveProject(false)}>Salvar como novo</button>
        </div>
        <div className="libsave">
          <span className="muted grow">Características do dimensionamento atual: cargas por apoio, seções e resultados, para reutilizar nas fundações.</span>
          <button type="button" className="btn" disabled={busy} onClick={saveChars}>Salvar características</button>
        </div>
        <h4>Projetos</h4>
        {items === null ? <p className="hint">Carregando…</p> : renderList(projects, 'Nenhum projeto salvo.', 'Abrir')}
        <h4>Características salvas</h4>
        {items === null ? null : renderList(chars, 'Nenhuma característica salva. Use o botão acima ou o da aba Dimensionar.', 'Usar nas fundações')}
        {mode === 'local' && <p className="hint">Biblioteca e histórico ficam neste navegador e vão junto no arquivo de Arquivo › Salvar no computador. Ao abrir o arquivo em outro computador ou navegador, eles são recuperados.</p>}
        <h4>Histórico</h4>
        {history.length === 0 ? <p className="hint">Nenhuma atividade registrada.</p> : (
          <ul className="liblist hist">
            {(histAll ? history : history.slice(0, 15)).map((h, i) => (
              <li key={`${h.at}-${i}`}><div className="libmain"><b>{h.text}</b><span className="muted">{date(h.at)} · {h.project}</span></div></li>
            ))}
          </ul>
        )}
        {history.length > 15 && <button type="button" className="btn ghost" onClick={() => setHistAll(!histAll)}>{histAll ? 'Mostrar menos' : `Mostrar tudo (${history.length})`}</button>}
      </div>
    </div>
  );
}
