import { PropriedadesPortico } from './app/panels/PropriedadesPortico';
import { useEffect, useRef, useState } from 'react';
import { useStore, type Tab } from './app/store';
import { Canvas, fitView, svgSize } from './app/Canvas';
import { EstruturaPanel } from './app/panels/Estrutura';
import { CargasPanel } from './app/panels/Cargas';
import { ResultadosPanel } from './app/panels/Resultados';
import { InfluenciaPanel } from './app/panels/Influencia';
import { DimensionarPanel } from './app/panels/Dimensionar';
import { Memorial } from './app/Memorial';
import { Library } from './app/Library';
import { Fundacoes } from './app/Fundacoes';
import { SAMPLES } from './app/samples';
import { addMember, deleteSelection, ensureNode, importTables, nbrCombinations } from './core/edit';
import { emptyModel, type ForceUnit, type LengthUnit, type Model } from './core/types';
import { FORCE_UNITS, LENGTH_UNITS, makeUnits } from './app/units';
import { AjudaProvider, BotaoAjuda, copyText, download, Dock, StatusBar, ThemeSelect } from './app/ui';
import { FaixaModulo } from './app/FaixaModulo';
import { FaixaPortico } from './app/FaixaPortico';
import { FaixaFundacoes } from './app/FaixaFundacoes';
import { FaixaArquivo, type AcoesArquivo } from './app/FaixaArquivo';
import { FaixaEdificio, ROTULO_CTX } from './app/edificio/FaixaEdificio';
import { ControlesPlanta } from './app/edificio/ControlesPlanta';
import { LinhaComando } from './app/edificio/Edificio';
import { useAlvoSelecionado } from './app/edificio/alvo';
import { useAnalysis, resultFor, sourceLabel } from './app/results';
import { buildDxf } from './app/dxf';
import { svgExportCss } from './app/exportCss';
import { adoptLaunchedFile, buildWorkspace, canPickFiles, launchQueue, currentFileName, forgetFile, mergeWorkspace, parseWorkspace, pickFromDisk, writeToDisk, WORKSPACE_EXT } from './app/workspace';
import { logActivity } from './app/history';
import { AtalhosEdificio, Edificio, NomeObra } from './app/edificio/Edificio';
import { edificioParaArquivo, useBuilding } from './app/edificio/store';
import { memo } from './app/design/tokens';

const TABS: { t: Tab; label: string }[] = [
  { t: 'estrutura', label: 'Estrutura' },
  { t: 'cargas', label: 'Cargas' },
  { t: 'resultados', label: 'Resultados' },
  { t: 'influencia', label: 'Influência' },
  { t: 'dimensionar', label: 'Dimensionar' },
];

/** Versões atuais das rotinas de arquivo, para os atalhos de teclado e os arquivos recebidos do sistema. */
const latest = { save: (_saveAs?: boolean) => {}, open: () => {}, openText: async (_t: string, _n: string) => {} };

/** Enquadra o modelo na área de desenho. */
function fit() { useStore.getState().set({ view: fitView(useStore.getState().model, svgSize.w, svgSize.h) }); }

function setTab(t: Tab) {
  const s = useStore.getState();
  const tool = t === 'influencia' ? 'section' : s.tool === 'section' ? 'select' : ((t === 'resultados' || t === 'dimensionar') && (s.tool === 'node' || s.tool === 'member')) ? 'select' : s.tool;
  s.set({ tab: t, tool });
}

export default function App() {
  const st = useStore();
  const a = useAnalysis();
  const bd = useBuilding();
  const svgRef = useRef<SVGSVGElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [coord, setCoord] = useState('');


  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useStore.getState();
      if ((e.ctrlKey || e.metaKey) && !e.altKey && ['s', 'o'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        if (e.key.toLowerCase() === 's') latest.save(e.shiftKey); else latest.open();
        return;
      }
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const ed = s.module === 'edificio' ? useBuilding.getState() : null;
      const undo = ed ? ed.desfazer : s.undo, redo = ed ? ed.refazer : s.redo;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey || ed) return;
      const k = e.key.toLowerCase();
      if (k === 'escape') { s.set({ tool: s.tab === 'influencia' ? 'section' : 'select' }); s.clearSel(); }
      else if (k === 'delete' || k === 'backspace') {
        if (!s.selNodes.size && !s.selMembers.size) return;
        const n = new Set(s.selNodes), m = new Set(s.selMembers);
        s.commit((md) => deleteSelection(md, n, m), `${n.size} nó(s) e ${m.size} barra(s) removidos.`);
        s.clearSel();
      }
      else if (k === 's') s.set({ tool: 'select' });
      else if (k === 'n') s.set({ tool: 'node', tab: s.tab === 'resultados' || s.tab === 'influencia' ? 'estrutura' : s.tab });
      else if (k === 'm') s.set({ tool: 'member', tab: s.tab === 'resultados' || s.tab === 'influencia' ? 'estrutura' : s.tab });
      else if (k === 'h') s.set({ tool: 'pan' });
      else if (k === 'd') s.set({ tool: 'dim', tab: s.tab === 'influencia' ? 'estrutura' : s.tab });
      else if (k === 'z') s.set({ tool: 'zoom' });
      else if (k === 'f') fit();
      else if (k === '1') setTab('estrutura');
      else if (k === '2') setTab('cargas');
      else if (k === '3') setTab('resultados');
      else if (k === '4') setTab('influencia');
      else if (k === '5') setTab('dimensionar');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);


  const load = (m: Model, fromFile = false) => { st.setModel(m, false, fromFile); setTimeout(fit, 0); };

  const openText = async (txt: string, fileName: string) => {
    try {
      const { model, workspace, edificio } = parseWorkspace(txt);
      load(model, true);
      useBuilding.getState().carregar(edificio);
      st.set({ libraryId: null, module: 'portico' });
      const n = workspace ? await mergeWorkspace(workspace) : 0;
      logActivity(`Trabalho aberto do arquivo ${fileName}`, model.name);
      st.set({ message: workspace
        ? `Trabalho “${model.name}” aberto de ${fileName}${edificio ? ` · edifício com ${edificio.building.pavimentos.length} pavimento(s)` : ''}${n ? ` · ${n} item(ns) adicionados à biblioteca` : ''}.`
        : `Modelo “${model.name}” aberto de ${fileName}.` });
    } catch { st.set({ message: `Arquivo inválido. Use um ${WORKSPACE_EXT} ou .json salvo por este programa.` }); }
  };

  const openWork = async () => {
    const r = await pickFromDisk();
    if (r === 'unsupported') fileRef.current?.click();
    else if (r !== null) await openText(r, currentFileName() ?? 'arquivo');
  };

  const saveWork = async (saveAs = false) => {
    const s = useStore.getState();
    const ws = await buildWorkspace(s.model, edificioParaArquivo());
    const txt = JSON.stringify(ws);
    const name = `${slug(s.model.name)}${WORKSPACE_EXT}`;
    let r: string = await writeToDisk(name, txt, saveAs);
    if (r === 'unsupported') r = await download(name, txt, 'application/json');
    if (r === 'declined') { st.set({ message: 'Gravação cancelada.' }); return; }
    s.setUnsaved(false);
    logActivity(`Trabalho salvo no computador (${currentFileName() ?? name})`, s.model.name);
    st.set({ message: r === 'saved'
      ? `Trabalho salvo em ${currentFileName() ?? name}. Ctrl+S grava de novo no mesmo arquivo.`
      : `Trabalho baixado como ${name} (pasta de downloads). Para retomar, use Arquivo › Abrir.` });
  };

  const openFile = (f: File) => { f.text().then((txt) => openText(txt, f.name)); };
  // atalhos e arquivos recebidos do sistema chamam sempre a versão atual das rotinas
  useEffect(() => { latest.save = saveWork; latest.open = openWork; latest.openText = openText; });

  // App instalado (PWA): .statikos aberto com duplo clique chega pela fila de abertura (File Handling API).
  useEffect(() => {
    launchQueue()?.setConsumer(async ({ files }) => {
      const h = files?.[0];
      if (!h) return;
      try { await latest.openText(await adoptLaunchedFile(h), h.name); }
      catch { useStore.getState().set({ message: `Não foi possível ler ${h.name}.` }); }
    });
  }, []);

  const saveJSON = async () => {
    const txt = JSON.stringify(st.model, null, 1);
    const name = `${slug(st.model.name)}.json`;
    const r = await download(name, txt, 'application/json');
    if (r === 'saved') st.set({ message: `Modelo salvo como ${name}.` });
    else if (r === 'declined') st.set({ message: 'Download cancelado.' });
    else { const ok = await copyText(txt); st.set({ message: ok ? `Modelo exportado como ${name}. Se o download não iniciar, o JSON já está na área de transferência.` : `Modelo exportado como ${name}.` }); }
  };

  const exportSVG = async () => {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = svgExportCss();
    clone.insertBefore(style, clone.firstChild);
    const txt = new XMLSerializer().serializeToString(clone);
    const r = await download(`${slug(st.model.name)}-${st.tab}.svg`, txt, 'image/svg+xml');
    st.set({ message: r === 'declined' ? 'Download cancelado.' : 'Desenho exportado em SVG (abre no navegador, Inkscape ou CAD).' });
  };

  /** Desenho atual como PNG (2×), com o mesmo estilo do SVG exportado. */
  const pngBlob = async (): Promise<Blob | null> => {
    const svg = svgRef.current;
    if (!svg) return null;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = svgExportCss();
    clone.insertBefore(style, clone.firstChild);
    const w = svg.width.baseVal.value, h = svg.height.baseVal.value;
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
    try {
      const img = new Image();
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('svg')); img.src = url; });
      const cv = document.createElement('canvas');
      cv.width = w * 2; cv.height = h * 2;
      const ctx = cv.getContext('2d')!;
      ctx.fillStyle = memo('paper'); ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.scale(2, 2); ctx.drawImage(img, 0, 0);
      return await new Promise<Blob | null>((res) => cv.toBlob(res, 'image/png'));
    } finally { URL.revokeObjectURL(url); }
  };
  const exportPNG = async () => {
    const b = await pngBlob();
    if (!b) return;
    const url = URL.createObjectURL(b), el = document.createElement('a');
    el.href = url; el.download = `${slug(st.model.name)}-${st.tab}.png`; document.body.appendChild(el); el.click(); el.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    st.set({ message: 'Desenho exportado em PNG.' });
  };
  const copyPNG = async () => {
    try {
      const b = await pngBlob();
      if (!b) return;
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]);
      st.set({ message: 'Desenho copiado para a área de transferência (cole no Word, e-mail etc.).' });
    } catch { st.set({ message: 'O navegador não permitiu copiar a imagem. Use Exportar PNG.' }); }
  };

  const tablesRef = useRef<HTMLInputElement>(null);
  const importTablesFrom = (f: File) => f.text().then((txt) => {
    try {
      const { model: src } = parseWorkspace(txt);
      let r = { materials: 0, sections: 0 };
      st.commit((m) => { r = importTables(m, src); }, '');
      st.set({ message: `Importados de ${f.name}: ${r.materials} material(is), ${r.sections} seção(ões) e as unidades.` });
    } catch { st.set({ message: 'Arquivo inválido para importar materiais e seções.' }); }
  });

  const exportDXF = async () => {
    const s = useStore.getState();
    const ok = !a.prep.error;
    const txt = buildDxf({
      model: s.model, analysis: ok ? a : null, results: ok ? resultFor(a, s.source) : [], resultLabel: sourceLabel(s.model, s.source),
      caseId: s.activeCase, diagScale: s.diagScale, mTension: s.mTension, dims: true,
    });
    const r = await download(`${slug(s.model.name)}.dxf`, txt, 'application/dxf');
    st.set({ message: r === 'declined' ? 'Download cancelado.' : `Desenho exportado em DXF R12 (metros), com camadas de geometria, apoios, cargas, cotas e diagramas${ok ? ` de “${sourceLabel(s.model, s.source)}”` : ''}.` });
  };

  const submitCoord = () => {
    const s = useStore.getState();
    const lu = makeUnits('kN', s.model.units?.length ?? 'm').L;
    const parts = coord.replace(/;/g, ' ').trim().split(/\s+/).map((p) => lu.from(parseFloat(p.replace(',', '.'))));
    if (parts.length < 2 || parts.some((p) => !Number.isFinite(p))) { s.set({ message: 'Digite coordenadas como “x y” (ex.: 6 4,5) ou “x1 y1 x2 y2” para uma barra.' }); return; }
    {
      const mat = s.model.materials[0]?.id ?? 1, sec = s.model.sections[0]?.id ?? 1;
      if (parts.length >= 4) s.commit((m) => { addMember(m, parts[0], parts[1], parts[2], parts[3], mat, sec); }, `Barra de (${parts[0]}; ${parts[1]}) a (${parts[2]}; ${parts[3]}).`);
      else s.commit((m) => { ensureNode(m, parts[0], parts[1]); }, `Nó em (${parts[0]}; ${parts[1]}).`);
      setCoord('');
    }
  };

  const nErr = bd.diags.filter((d) => d.severidade === 'erro').length;
  const alvo = useAlvoSelecionado();
  const acoes: AcoesArquivo = {
    novo: () => { const m = emptyModel(); forgetFile(); load(m); logActivity('Novo modelo', m.name); },
    abrir: openWork, salvar: saveWork, biblioteca: () => st.set({ libraryOpen: true }),
    json: saveJSON, svg: exportSVG, png: exportPNG, copiar: copyPNG, dxf: exportDXF,
    importarTabelas: () => tablesRef.current?.click(),
    exemplo: (key) => { const s = SAMPLES.find((x) => x.key === key); if (!s) return; const m = s.make(); if (s.key === 'portico') m.combinations = nbrCombinations(m.cases, 1); forgetFile(); load(m); },
    podeSalvarComo: canPickFiles(),
  };
  const corpoFaixa = (aba: string) => aba === 'arquivo' ? <FaixaArquivo a={acoes} edificio={st.module === 'edificio'} />
    : st.module === 'edificio' ? <FaixaEdificio aba={aba} />
    : st.module === 'portico' ? <FaixaPortico aba={aba} setTab={setTab} enquadrar={fit} />
    : <FaixaFundacoes aba={aba} />;

  const status = st.module === 'edificio' ? { cls: nErr ? 'bad' : 'ok', text: `${bd.sessao.modelo.pavimentos.length} pavimentos${nErr ? ` · ${nErr} erro(s)` : ''}` } : a.prep.error ? { cls: 'bad', text: 'Instável' } : { cls: 'ok', text: `${st.model.nodes.length} nós · ${st.model.members.length} barras · ${a.prep.free.length} gdl` };

  return (
    <AjudaProvider>
    <div className="app">
      <header className="topbar qbar">
        <div className="brand">
          <svg viewBox="0 0 28 20" aria-hidden="true"><path d="M2 18 L2 6 L14 2 L26 6 L26 18" /><path d="M2 6 L26 6" className="thin" /><path d="M14 2 L14 6" className="thin" /></svg>
          <span className="bname">Statikos</span>
          <span className="bsub">pórticos planos</span>
        </div>
          <input ref={tablesRef} type="file" accept={`${WORKSPACE_EXT},.json,application/json`} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importTablesFrom(f); e.target.value = ''; }} />
          <input ref={fileRef} type="file" accept={`${WORKSPACE_EXT},.json,application/json`} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) openFile(f); e.target.value = ''; }} />
        {st.module === 'edificio' && <AtalhosEdificio />}
        <div className="mname" title={st.module === 'edificio' ? 'Nome da obra' : 'Nome do modelo'}>
          {st.module === 'edificio' ? <NomeObra /> : <input aria-label="Nome do modelo" value={st.model.name} onChange={(e) => st.commit((m) => { m.name = e.target.value; })} />}
        </div>
        <div className="tgroup">
          <button type="button" className="tbtn icon" title="Desfazer (Ctrl+Z)" disabled={st.module === 'edificio' ? !bd.sessao.podeDesfazer : !st.past.length} onClick={st.module === 'edificio' ? bd.desfazer : st.undo}><svg viewBox="0 0 22 22"><path d="M8 5 L3 10 L8 15M3 10 H13 a5 5 0 0 1 0 10 H10" /></svg></button>
          <button type="button" className="tbtn icon" title="Refazer (Ctrl+Y)" disabled={st.module === 'edificio' ? !bd.sessao.podeRefazer : !st.future.length} onClick={st.module === 'edificio' ? bd.refazer : st.redo}><svg viewBox="0 0 22 22"><path d="M14 5 L19 10 L14 15M19 10 H9 a5 5 0 0 0 0 10 H12" /></svg></button>
        </div>
        <button type="button" className={`tbtn memo-btn${st.unsaved ? ' unsaved' : ''}`} onClick={() => saveWork(false)} title={st.unsaved ? 'Há alterações não salvas no computador (Ctrl+S)' : 'Salvar no computador (Ctrl+S)'}>{st.unsaved ? '● ' : ''}Salvar</button>
        <button type="button" className="tbtn memo-btn" onClick={() => st.set({ libraryOpen: true })}>Biblioteca</button>
        <button type="button" className="tbtn memo-btn" onClick={() => st.set({ memorialOpen: true })}>Memorial</button>
        <BotaoAjuda />
        <ThemeSelect />
        <button type="button" className="tbtn panel-toggle" onClick={() => setPanelOpen(!panelOpen)}>{panelOpen ? 'Ocultar painel' : 'Painel'}</button>
      </header>
      <nav className="modtabs" role="tablist" aria-label="Módulo">
        <button type="button" role="tab" aria-selected={st.module === 'portico'} onClick={() => st.set({ module: 'portico' })}>Pórtico</button>
        <button type="button" role="tab" aria-selected={st.module === 'edificio'} onClick={() => st.set({ module: 'edificio' })}>Edifício</button>
        <button type="button" role="tab" aria-selected={st.module === 'fundacoes'} onClick={() => st.set({ module: 'fundacoes' })}>Fundações</button>
      </nav>

      <div className="work">
      <FaixaModulo modulo={st.module} corpo={corpoFaixa} contextual={st.module === 'edificio' && alvo ? { id: 'ctx', label: ROTULO_CTX[alvo.tipo] ?? 'Elemento' } : undefined} />
      {st.module === 'fundacoes' ? <Fundacoes /> : st.module === 'edificio' ? <Edificio /> : (
      <div className={`main${panelOpen ? '' : ' nopanel'}`}>
        <section className="stage">
          <Canvas svgRef={svgRef} />
          {st.tool === 'member' && <div className="toast">Clique no ponto inicial e nos seguintes. Esc ou botão direito encerra a sequência.</div>}
          {st.tool === 'section' && st.tab === 'influencia' && <div className="toast">Clique numa barra para posicionar a seção da linha de influência.</div>}
        </section>

        {panelOpen && (
          <Dock id="portico-dir" lado="dir" rotulo="painel lateral direito" padrao={380}>
          <aside className="panel">
            <div className="tabs" role="tablist">
              {TABS.map((t, i) => (
                <button type="button" role="tab" aria-selected={st.tab === t.t} key={t.t} className={st.tab === t.t ? 'on' : ''} onClick={() => setTab(t.t)} title={`${t.label} (${i + 1})`}>{t.label}</button>
              ))}
            </div>
            {st.tab === 'estrutura' && <PropriedadesPortico />}
            {st.tab === 'estrutura' && <EstruturaPanel />}
            {st.tab === 'cargas' && <CargasPanel />}
            {st.tab === 'resultados' && <ResultadosPanel />}
            {st.tab === 'influencia' && <InfluenciaPanel />}
            {st.tab === 'dimensionar' && <DimensionarPanel />}
          </aside>
          </Dock>
        )}
      </div>

      )}
      </div>
      {st.memorialOpen && <Memorial onClose={() => st.set({ memorialOpen: false })} />}
      {st.libraryOpen && <Library />}
      <StatusBar mensagem={st.message}>
        {st.module === 'edificio' && <LinhaComando />}
        <span className={`status ${status.cls}`}>{status.text}</span>
        {st.module === 'portico' && (<>
        <form className="coordin" onSubmit={(e) => { e.preventDefault(); submitCoord(); }}>
          <input id="coordinput" aria-label="Entrada por coordenadas" placeholder="x y  ou  x1 y1 x2 y2  ↵" value={coord} onChange={(e) => setCoord(e.target.value)} />
        </form>
        <label className="check small" htmlFor="axchk" title="Eixos locais das barras (x do nó inicial ao final)"><input id="axchk" type="checkbox" checked={st.showAxes} onChange={(e) => st.set({ showAxes: e.target.checked })} /> <span>Eixos</span></label>
        <label className="check small" htmlFor="monochk" title="Desenho em preto e branco (também no SVG/PNG exportado)"><input id="monochk" type="checkbox" checked={st.mono} onChange={(e) => st.set({ mono: e.target.checked })} /> <span>P&amp;B</span></label>
        <label className="gridsel" htmlFor="gssel" title="Tamanho de apoios, setas e textos">Símbolos
          <select id="gssel" value={st.glyphScale} onChange={(e) => st.set({ glyphScale: +e.target.value })}>
            <option value={0.75}>P</option><option value={1}>M</option><option value={1.4}>G</option>
          </select>
        </label>
        <label className="check small" htmlFor="snapchk"><input id="snapchk" type="checkbox" checked={st.snap} onChange={(e) => st.set({ snap: e.target.checked })} /> <span>Snap</span></label>
        <label className="check small" htmlFor="dimchk" title="Cotas automáticas de vãos e níveis (saem também no SVG exportado; o DXF traz sempre a camada COTAS)"><input id="dimchk" type="checkbox" checked={st.showDims} onChange={(e) => st.set({ showDims: e.target.checked })} /> <span>Cotas</span></label>
        <label className="gridsel" htmlFor="gridsel">Grade
          <select id="gridsel" value={st.grid} onChange={(e) => st.set({ grid: +e.target.value })}>
            {[0.05, 0.1, 0.25, 0.5, 1, 2].map((g) => <option key={g} value={g}>{String(g).replace('.', ',')} m</option>)}
          </select>
        </label>
        <label className="gridsel" htmlFor="unitsel" title="Unidades de exibição e entrada. O cálculo, o dimensionamento e o memorial usam kN, m e MPa.">Unidades
          <select id="unitsel" value={st.model.units?.force ?? 'kN'} onChange={(e) => st.commit((m) => { m.units = { force: e.target.value as ForceUnit, length: m.units?.length }; }, `Força em ${FORCE_UNITS.find((u) => u.v === e.target.value)?.label}.`)}>
            {FORCE_UNITS.map((u) => <option key={u.v} value={u.v}>{u.label}</option>)}
          </select>
          <select aria-label="Unidade de comprimento" value={st.model.units?.length ?? 'm'} onChange={(e) => st.commit((m) => { m.units = { force: m.units?.force ?? 'kN', length: e.target.value as LengthUnit }; }, `Comprimento em ${e.target.value}.`)}>
            {LENGTH_UNITS.map((u) => <option key={u.v} value={u.v}>{u.label}</option>)}
          </select>
        </label>
        </>)}
        {st.module === 'edificio' && <ControlesPlanta />}
      </StatusBar>
    </div>
    </AjudaProvider>
  );
}

function slug(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'modelo';
}
