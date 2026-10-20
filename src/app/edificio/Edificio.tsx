// Módulo Edifícios: obra, pavimentos, grupos, máscara, pilares e eixos, tudo por comandos do registro; planta em Canvas.
import { useEffect, useRef, useState } from 'react';
import { useBuilding } from './store';
import { usePlanta, type Ferramenta, type Tema } from './plantaStore';
import { Planta } from './Planta';
import { listarComandos } from '../../core/commands';
import { lerDxf, metrosPorUnidade } from '../../core/dxf/read';
import { comprimentoPolilinha, cotaFundacao, lancesDoPilar, pavimentosOrdenados, peDireito, USOS, type Ajuste, type Alinhamento, type BuildingModel, type CategoriaUso, type Norma } from '../../core/building/types';
import { useStore } from '../store';
import { PREMISSAS } from '../../core/building/premissas';
import type { Diagnostico } from '../../core/building/verify';
import { Group, Hint, NumField, Select, TextField } from '../ui';

const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
const CORES = ['#5b8def', '#e6a23c', '#3fb27f', '#c86bdc', '#e05d5d', '#4fb3c8', '#a3a83a', '#8c7ae6'];
const corGrupo = (b: BuildingModel, id: string) => CORES[Math.max(0, b.grupos.findIndex((g) => g.id === id)) % CORES.length];
const num = (t: string) => parseFloat(t.replace(',', '.'));

export function Edificio() {
  const { sessao, exec, novo, diags } = useBuilding();
  const b = sessao.modelo;
  const ps = pavimentosOrdenados(b);
  const [aba, setAba] = useState<'planta' | 'elevacao' | 'verificacao' | 'premissas'>('planta');
  const nErr = diags.filter((d) => d.severidade === 'erro').length;

  return (
    <div className="edif">
      <aside className="fund-in edif-in">
        <Group title="Obra" aside={<span className="row"><button type="button" className="mini" onClick={() => novo(false)}>Novo padrão</button><button type="button" className="mini" onClick={() => novo(true)}>Novo vazio</button></span>}>
          <div className="row"><TextField label="Nome da obra" value={b.obra.nome} onChange={(v) => exec('obra.definir', { nome: v })} /></div>
          <div className="row wrap">
            <TextField label="Cidade" value={b.obra.cidade ?? ''} onChange={(v) => exec('obra.definir', { cidade: v })} />
            <NumField label="Fundação abaixo do mais baixo" unit="m" width={150} value={b.obra.profundidadeFundacao} onChange={(v) => exec('obra.definir', { profundidadeFundacao: v })} />
          </div>
          <div className="row wrap">
            <NumField label="fck" unit="MPa" width={92} value={b.norma.fck} onChange={(v) => exec('norma.definir', { fck: v })} />
            <Select label="Aço" value={b.norma.aco} options={[{ v: 'CA-50', label: 'CA-50' }, { v: 'CA-60', label: 'CA-60' }]} onChange={(v) => exec('norma.definir', { aco: v })} />
            <Select label="CAA" value={b.norma.caa} options={(['I', 'II', 'III', 'IV'] as Norma['caa'][]).map((v) => ({ v, label: v }))} onChange={(v) => exec('norma.definir', { caa: v })} />
          </div>
          <Hint>Cobrimentos (cm): laje {fmt(b.norma.cobrimento.laje, 1)} · viga {fmt(b.norma.cobrimento.viga, 1)} · pilar {fmt(b.norma.cobrimento.pilar, 1)} (NBR 6118, Tabela 7.2).</Hint>
        </Group>

        <Group title={`Pavimentos (${ps.length})`}>
          <table className="data loads-ed edpav">
            <thead><tr><th>Nome</th><th>Grupo</th><th>Cota (m)</th><th>Pé-dir.</th><th /></tr></thead>
            <tbody>
              {[...ps].reverse().map((p) => (
                <tr key={p.id} data-id={p.id}>
                  <td><Cell value={p.nome} label={`Nome de ${p.nome}`} onCommit={(v) => exec('pavimento.editar', { id: p.id, nome: v })} /></td>
                  <td>
                    <select aria-label={`Grupo de ${p.nome}`} value={p.grupo} style={{ borderLeft: `4px solid ${corGrupo(b, p.grupo)}` }} onChange={(e) => exec('pavimento.editar', { id: p.id, grupo: e.target.value })}>
                      {b.grupos.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
                    </select>
                  </td>
                  <td><Cell value={fmt(p.cota, 2)} label={`Cota de ${p.nome}`} num onCommit={(v) => { const c = num(v); if (Number.isFinite(c)) exec('pavimento.editar', { id: p.id, cota: c }); }} /></td>
                  <td className="num">{fmt(peDireito(b, p.id))}</td>
                  <td className="acts">
                    <button type="button" className="mini" title={`Repetir ${p.nome} acima (mesmo grupo)`} onClick={() => exec('pavimento.repetir', { id: p.id, vezes: 1, ...(ps[0].id === p.id ? { peDireito: 3 } : {}) })}>+1</button>
                    <button type="button" className="mini" title={`Remover ${p.nome}`} aria-label={`Remover ${p.nome}`} onClick={() => exec('pavimento.remover', { id: p.id })}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <NovoPavimento b={b} />
          <Hint>Cota = topo da laje estrutural. Pavimentos do mesmo grupo compartilham a planta; “+1” repete o pavimento logo acima e sobe os de cima.</Hint>
        </Group>

        <MascaraGrupo b={b} />
        <PilaresGrupo b={b} />
        <VigasGrupo b={b} />

        <Group title={`Grupos (${b.grupos.length})`} open={false}>
          <table className="data loads-ed">
            <thead><tr><th>Grupo</th><th>Uso (NBR 6120)</th><th>Rev. kN/m²</th><th>q kN/m²</th></tr></thead>
            <tbody>
              {b.grupos.map((g) => (
                <tr key={g.id}>
                  <td style={{ borderLeft: `4px solid ${corGrupo(b, g.id)}` }}><Cell value={g.nome} label={`Nome do grupo ${g.nome}`} onCommit={(v) => exec('grupo.editar', { id: g.id, nome: v })} /></td>
                  <td>
                    <select aria-label={`Uso de ${g.nome}`} value={g.uso} onChange={(e) => exec('grupo.editar', { id: g.id, uso: e.target.value as CategoriaUso })}>
                      {USOS.map((u) => <option key={u.v} value={u.v}>{u.label}</option>)}
                    </select>
                  </td>
                  <td><Cell value={fmt(g.gRev, 2)} label={`Revestimento de ${g.nome}`} num onCommit={(v) => { const x = num(v); if (Number.isFinite(x)) exec('grupo.editar', { id: g.id, gRev: x }); }} /></td>
                  <td><Cell value={fmt(g.q, 2)} label={`Carga variável de ${g.nome}`} num onCommit={(v) => { const x = num(v); if (Number.isFinite(x)) exec('grupo.editar', { id: g.id, q: x }); }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Hint>Cargas variáveis padrão pela categoria de uso (NBR 6120:2019, Tabela 10), a confirmar.</Hint>
        </Group>

        <Group title={`Eixos (${b.eixos.length})`} open={false}>
          <Malha />
          {b.eixos.length > 0 && (
            <div className="row wrap" style={{ marginTop: 6 }}>
              <span className="muted small">{b.eixos.map((e) => e.nome).join(' · ')}</span>
              <button type="button" className="mini" onClick={() => exec('eixo.remover', { ids: b.eixos.map((e) => e.id) })}>remover todos</button>
            </div>
          )}
        </Group>

        <Group title="Linha de comando">
          <LinhaComando />
        </Group>
      </aside>

      <section className="edif-main">
        <div className="edif-tabs" role="tablist">
          {([['planta', 'Planta'], ['elevacao', 'Elevação'], ['verificacao', `Verificação${diags.length ? ` (${diags.length})` : ''}`], ['premissas', 'Premissas']] as const).map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={aba === k} className={`${aba === k ? 'on' : ''}${k === 'verificacao' && nErr ? ' bad' : ''}`} onClick={() => setAba(k)}>{l}</button>
          ))}
        </div>
        {aba === 'planta' && <><PlantaBarra b={b} /><Planta /></>}
        {aba !== 'planta' && (
          <div className="edif-out">
            {aba === 'elevacao' && <div className="card"><h3>Elevação esquemática</h3><Elevacao b={b} /></div>}
            {aba === 'verificacao' && <div className="card"><h3>Verificação de lançamento</h3><Diagnosticos diags={diags} onIr={(ids) => { usePlanta.getState().set({ selecao: new Set(ids) }); setAba('planta'); }} /></div>}
            {aba === 'premissas' && (
              <div className="card">
                <h3>Premissas em uso</h3>
                <ul className="prem">
                  {PREMISSAS.map((p) => <li key={p.id}><b>{p.tema}.</b> {p.texto} <span className="muted">({p.fonte}{p.aConfirmar ? '; a confirmar' : ''})</span></li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/** Campo de tabela que confirma no Enter ou ao sair. */
function Cell({ value, label, onCommit, num: isNum }: { value: string; label: string; onCommit: (v: string) => void; num?: boolean }) {
  const [t, setT] = useState(value);
  useEffect(() => setT(value), [value]);
  return <input aria-label={label} className={isNum ? 'num' : undefined} inputMode={isNum ? 'decimal' : undefined} value={t} onChange={(e) => setT(e.target.value)}
    onBlur={() => { if (t.trim() && t !== value) onCommit(t.trim()); else setT(value); }} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setT(value); (e.target as HTMLInputElement).blur(); } }} />;
}

function NovoPavimento({ b }: { b: BuildingModel }) {
  const exec = useBuilding((s) => s.exec);
  const ps = pavimentosOrdenados(b);
  const topo = ps.at(-1);
  const [h, setH] = useState(3);
  const criar = () => {
    const nome = `Pavimento ${ps.length + 1}`;
    exec('pavimento.criar', { nome, cota: +((topo?.cota ?? -h) + h).toFixed(3) });
  };
  return (
    <div className="row wrap" style={{ marginTop: 6, alignItems: 'flex-end' }}>
      <NumField label="Pé-direito" unit="m" width={110} value={h} onChange={(v) => setH(v > 0 ? v : 3)} />
      <button type="button" className="btn" onClick={criar}>+ Pavimento acima</button>
    </div>
  );
}

function Malha() {
  const exec = useBuilding((s) => s.exec);
  const [dx, setDx] = useState('5; 5; 5');
  const [dy, setDy] = useState('4; 4');
  const lista = (t: string) => t.split(/[;\s]+/).map(num).filter((v) => v > 0);
  return (
    <>
      <div className="row wrap">
        <TextField label="Espaçamentos verticais 1, 2, 3… (m)" value={dx} onChange={setDx} />
        <TextField label="Espaçamentos horizontais A, B, C… (m)" value={dy} onChange={setDy} />
      </div>
      <div className="row"><button type="button" className="btn" onClick={() => exec('eixo.malha', { dx: lista(dx), dy: lista(dy), substituir: true })}>Criar malha de eixos</button></div>
      <Hint>Separe os espaçamentos com “;”. A malha substitui os eixos existentes; a planta para editá-los chega na próxima fatia.</Hint>
    </>
  );
}

function LinhaComando() {
  const exec = useBuilding((s) => s.exec);
  const [t, setT] = useState('');
  const [erro, setErro] = useState('');
  const nomes = listarComandos().map((c) => c.nome);
  const enviar = () => {
    const m = /^\s*([\w.]+)\s*(\{[\s\S]*\})?\s*$/.exec(t);
    if (!m) { setErro('Formato: comando {"parametro": valor}'); return; }
    let p: Record<string, unknown> = {};
    try { if (m[2]) p = JSON.parse(m[2]); } catch { setErro('Parâmetros em JSON inválido.'); return; }
    const r = exec(m[1], p);
    setErro(r.ok ? '' : r.erros.map((e) => e.mensagem).join(' '));
    if (r.ok) setT('');
  };
  return (
    <>
      <form className="row" onSubmit={(e) => { e.preventDefault(); enviar(); }}>
        <input id="edcmd" className="cmdline" list="edcmds" aria-label="Linha de comando do edifício" placeholder='pavimento.criar {"nome": "Ático", "cota": 15}' value={t} onChange={(e) => setT(e.target.value)} />
        <datalist id="edcmds">{nomes.map((n) => <option key={n} value={n} />)}</datalist>
      </form>
      {erro && <p className="hint bad">{erro}</p>}
      <Hint>Os mesmos comandos da interface, da linha de comando (<code>statikos exec</code>) e do servidor MCP. Ctrl+Z desfaz.</Hint>
    </>
  );
}

function Diagnosticos({ diags, onIr }: { diags: Diagnostico[]; onIr?: (ids: string[]) => void }) {
  const exec = useBuilding((s) => s.exec);
  if (!diags.length) return <p className="muted">Nenhum problema encontrado.</p>;
  return (
    <ul className="diags">
      {diags.map((d, i) => (
        <li key={i} className={d.severidade}>
          <span className="sev">{d.severidade === 'erro' ? '⚠ erro' : d.severidade === 'aviso' ? '! aviso' : 'i'}</span> {d.mensagem}
          {onIr && d.elementos.length > 0 && <button type="button" className="mini" onClick={() => onIr(d.elementos)}>ver na planta</button>}
          {d.sugestao && <button type="button" className="mini" onClick={() => exec(d.sugestao!.comando, d.sugestao!.params)}>{d.sugestao.texto}</button>}
        </li>
      ))}
    </ul>
  );
}

function Elevacao({ b }: { b: BuildingModel }) {
  const ps = pavimentosOrdenados(b);
  if (!ps.length) return <p className="muted">Sem pavimentos.</p>;
  const zf = cotaFundacao(b), zt = ps.at(-1)!.cota;
  const W = 520, H = Math.max(220, Math.min(560, 40 * (ps.length + 1))), top = 18, bot = H - 22, x0 = 150, x1 = 400;
  const y = (z: number) => bot - ((z - zf) / Math.max(zt - zf, 1e-9)) * (bot - top);
  return (
    <svg className="elev" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Elevação esquemática dos pavimentos">
      <line x1={x0 - 20} x2={x1 + 20} y1={y(zf)} y2={y(zf)} className="fnd" />
      <text x={x1 + 26} y={y(zf) + 4} className="lbl">fundação {fmt(zf)}</text>
      {ps.map((p, i) => {
        const yb = i === 0 ? y(zf) : y(ps[i - 1].cota), yt = y(p.cota);
        return (
          <g key={p.id}>
            <rect x={x0} y={yt} width={x1 - x0} height={Math.max(yb - yt, 1)} fill={corGrupo(b, p.grupo)} fillOpacity={0.18} />
            <line x1={x0 - 10} x2={x1 + 10} y1={yt} y2={yt} stroke={corGrupo(b, p.grupo)} strokeWidth={3} />
            <text x={x0 - 14} y={yt + 4} textAnchor="end" className="lbl">{p.nome}</text>
            <text x={x1 + 26} y={yt + 4} className="lbl num">{fmt(p.cota)}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Nome da obra no cabeçalho (confirma ao sair do campo: um comando por alteração, não por tecla). */
export function NomeObra() {
  const { sessao, exec } = useBuilding();
  const nome = sessao.modelo.obra.nome;
  const [t, setT] = useState(nome);
  useEffect(() => setT(nome), [nome]);
  return <input aria-label="Nome da obra no cabeçalho" value={t} onChange={(e) => setT(e.target.value)} onBlur={() => { if (t.trim() && t !== nome) exec('obra.definir', { nome: t }); else setT(nome); }} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />;
}

const FERRAMENTAS: { f: Ferramenta; tecla: string; rot: string }[] = [
  { f: 'selecionar', tecla: 'S', rot: 'Selecionar' }, { f: 'pilar', tecla: 'P', rot: 'Pilar' }, { f: 'viga', tecla: 'V', rot: 'Viga' }, { f: 'eixo', tecla: 'E', rot: 'Eixo' },
  { f: 'mover', tecla: 'M', rot: 'Mover' }, { f: 'medir', tecla: 'D', rot: 'Medir' },
];

function PlantaBarra({ b }: { b: BuildingModel }) {
  const pl = usePlanta();
  const ps = pavimentosOrdenados(b);
  const atual = ps.find((p) => p.id === pl.pavimento) ?? ps[Math.min(1, ps.length - 1)];
  return (
    <div className="planta-barra">
      <label className="pavsel">Pavimento
        <select aria-label="Pavimento da planta" value={atual?.id ?? ''} onChange={(e) => pl.set({ pavimento: e.target.value, selecao: new Set() })}>
          {[...ps].reverse().map((p) => <option key={p.id} value={p.id}>{p.nome} ({fmt(p.cota)})</option>)}
        </select>
      </label>
      <div className="seg small" role="radiogroup" aria-label="Ferramenta">
        {FERRAMENTAS.map((t) => <button key={t.f} type="button" role="radio" aria-checked={pl.ferramenta === t.f} className={pl.ferramenta === t.f ? 'on' : ''} title={`${t.rot} (${t.tecla})`} onClick={() => pl.set({ ferramenta: t.f })}>{t.rot}</button>)}
      </div>
      <label className="check small"><input type="checkbox" checked={pl.orto} onChange={(e) => pl.set({ orto: e.target.checked })} /> <span>Orto (F8)</span></label>
      <label className="check small"><input type="checkbox" checked={pl.polar} onChange={(e) => pl.set({ polar: e.target.checked })} /> <span>Polar 15° (F10)</span></label>
      <label className="check small"><input type="checkbox" checked={pl.inferior} onChange={(e) => pl.set({ inferior: e.target.checked })} /> <span>Inferior</span></label>
      <select aria-label="Tema da planta" value={pl.tema} onChange={(e) => pl.set({ tema: e.target.value as Tema })}>
        <option value="escuro">Escuro</option><option value="claro">Claro</option><option value="pb">P&amp;B</option>
      </select>
    </div>
  );
}

const UNIDADES = [{ v: 1, label: 'm' }, { v: 0.01, label: 'cm' }, { v: 0.001, label: 'mm' }];

/** Unidade provável do desenho quando o DXF não informa (maior dimensão do desenho) [a confirmar]. */
export function unidadeProvavel(bbox: [number, number, number, number] | null): number {
  if (!bbox) return 1;
  const D = Math.max(bbox[2] - bbox[0], bbox[3] - bbox[1]);
  return D > 5000 ? 0.001 : D > 300 ? 0.01 : 1;
}

function MascaraGrupo({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const pl = usePlanta();
  const ref = useRef<HTMLInputElement>(null);
  const ps = pavimentosOrdenados(b);
  const pav = ps.find((p) => p.id === pl.pavimento) ?? ps[Math.min(1, ps.length - 1)];
  const grupo = b.grupos.find((g) => g.id === pav?.grupo);
  const ms = b.mascaras.filter((m) => m.grupo === grupo?.id);
  const importar = async (f: File) => {
    if (!grupo) return;
    const txt = await f.text();
    const r = lerDxf(txt);
    const escala = metrosPorUnidade(r.insunits) ?? unidadeProvavel(r.bbox);
    const res = exec('mascara.importar', { grupo: grupo.id, nome: f.name.replace(/\.dxf$/i, ''), geo: r.camadas, escala });
    if (res.ok) {
      const ign = Object.entries(r.ignoradas).map(([k, n]) => `${n} ${k}`).join(', ');
      useStore.getState().set({ message: `${f.name}: ${r.segmentos} segmento(s) em ${Object.keys(r.camadas).length} camada(s), unidade ${UNIDADES.find((u) => u.v === escala)?.label ?? escala} ${metrosPorUnidade(r.insunits) ? '($INSUNITS)' : '(estimada pelo tamanho; confira)'}${ign ? ` · ignoradas: ${ign}` : ''}.` });
      usePlanta.getState().set({ vista: null });
    }
  };
  return (
    <Group title={`Máscara — ${grupo?.nome ?? '—'} (${ms.length})`} open={false}>
      <div className="row wrap">
        <button type="button" className="btn" disabled={!grupo} onClick={() => ref.current?.click()}>Importar DXF…</button>
        <input ref={ref} type="file" accept=".dxf" hidden aria-label="Arquivo DXF da máscara" onChange={(e) => { const f = e.target.files?.[0]; if (f) importar(f); e.target.value = ''; }} />
        {ms.length > 0 && <button type="button" className="btn" onClick={() => pl.set({ ferramenta: 'alinhar' })}>Alinhar por 2 pontos</button>}
        {ms.length > 0 && <label className="check small"><input type="checkbox" checked={pl.alinharEscala} onChange={(e) => pl.set({ alinharEscala: e.target.checked })} /> <span>ajustar escala</span></label>}
      </div>
      {ms.map((m) => (
        <div key={m.id} className="masc">
          <div className="row wrap">
            <b className="grow">{m.nome}</b>
            <select aria-label={`Unidade de ${m.nome}`} value={UNIDADES.find((u) => Math.abs(u.v - m.escala) < 1e-12)?.v ?? ''} onChange={(e) => exec('mascara.editar', { id: m.id, escala: +e.target.value })}>
              {!UNIDADES.some((u) => Math.abs(u.v - m.escala) < 1e-12) && <option value="">{`${fmt(m.escala, 5)} m/un`}</option>}
              {UNIDADES.map((u) => <option key={u.v} value={u.v}>{u.label}</option>)}
            </select>
            <button type="button" className="mini" onClick={() => exec('mascara.remover', { id: m.id })}>remover</button>
          </div>
          <table className="data camadas">
            <thead><tr><th>Camada</th><th title="Visível">vis.</th><th title="Capturável">capt.</th></tr></thead>
            <tbody>
              {m.camadas.map((c) => (
                <tr key={c.nome}>
                  <td className="tl">{c.nome}</td>
                  <td><input type="checkbox" aria-label={`Camada ${c.nome} visível`} checked={c.visivel} onChange={(e) => exec('mascara.camadas', { id: m.id, camadas: [c.nome], visivel: e.target.checked })} /></td>
                  <td><input type="checkbox" aria-label={`Camada ${c.nome} capturável`} checked={c.capturavel} onChange={(e) => exec('mascara.camadas', { id: m.id, camadas: [c.nome], capturavel: e.target.checked })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <Hint>A máscara pertence ao grupo do pavimento da planta. Escala pela unidade do DXF ($INSUNITS); sem ela, estimada pelo tamanho do desenho.</Hint>
    </Group>
  );
}

const AJUSTES: { v: Ajuste; label: string }[] = [
  { v: 'c', label: 'centro' }, { v: 'so', label: 'canto inf. esq.' }, { v: 's', label: 'face inferior' }, { v: 'se', label: 'canto inf. dir.' }, { v: 'l', label: 'face direita' },
  { v: 'ne', label: 'canto sup. dir.' }, { v: 'n', label: 'face superior' }, { v: 'no', label: 'canto sup. esq.' }, { v: 'o', label: 'face esquerda' },
];

function PilaresGrupo({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const pl = usePlanta();
  const ps = pavimentosOrdenados(b);
  const [cola, setCola] = useState('');
  const sec = pl.secao;
  const cm = (v: number) => +(v * 100).toFixed(2);
  const colar = () => {
    const linhas = cola.split(/\r?\n/).map((l) => l.split(/\t|;/).map((c) => c.trim())).filter((c) => c.length >= 4 && c.slice(1, 4).every((x) => Number.isFinite(parseFloat(x.replace(',', '.')))));
    if (!linhas.length) { useStore.getState().set({ message: 'Cole linhas com: nome, x (m), y (m), b (cm), h (cm) [, ângulo].' }); return; }
    const n = (x: string) => parseFloat(x.replace(',', '.'));
    const cmds = linhas.map((c) => {
      const exist = b.pilares.find((p) => p.nome === c[0]);
      const secao = c[4] ? { tipo: 'ret', b: n(c[3]) / 100, h: n(c[4]) / 100 } : { tipo: 'circ', d: n(c[3]) / 100 };
      const base = { x: n(c[1]), y: n(c[2]), secao, ...(c[5] ? { angulo: n(c[5]) } : {}) };
      return exist ? { nome: 'pilar.editar', params: { id: exist.id, ...base } } : { nome: 'pilar.inserir', params: { ...base, nome: c[0] } };
    });
    if (exec('lote', { comandos: cmds }).ok) setCola('');
  };
  return (
    <Group title={`Pilares (${b.pilares.length})`} open={false}>
      <div className="row wrap">
        <Select label="Seção" value={sec.tipo} options={[{ v: 'ret', label: 'Retangular' }, { v: 'circ', label: 'Circular' }]} onChange={(v) => pl.set({ secao: v === 'ret' ? { tipo: 'ret', b: 0.2, h: 0.4 } : { tipo: 'circ', d: 0.3 } })} />
        {sec.tipo === 'ret'
          ? <><NumField label="b (x local)" unit="cm" width={86} value={cm(sec.b)} onChange={(v) => v > 0 && pl.set({ secao: { ...sec, b: v / 100 } })} /><NumField label="h (y local)" unit="cm" width={86} value={cm(sec.h)} onChange={(v) => v > 0 && pl.set({ secao: { ...sec, h: v / 100 } })} /></>
          : <NumField label="Diâmetro" unit="cm" width={100} value={cm(sec.d)} onChange={(v) => v > 0 && pl.set({ secao: { tipo: 'circ', d: v / 100 } })} />}
      </div>
      <div className="row wrap">
        <Select label="Ponto fixo (A)" value={pl.ajuste} options={AJUSTES} onChange={(v) => pl.set({ ajuste: v })} />
        <NumField label="Ângulo (R: +90°)" unit="°" width={110} value={pl.angulo} onChange={(v) => pl.set({ angulo: v })} />
      </div>
      <div className="row"><button type="button" className={`btn${pl.ferramenta === 'pilar' ? ' primary' : ''}`} onClick={() => pl.set({ ferramenta: 'pilar' })}>Lançar pilares (P)</button>
        <button type="button" className="btn" disabled={!b.pilares.length} onClick={() => exec('pilar.renumerar', {})}>Renumerar</button></div>
      {b.pilares.length > 0 && (
        <table className="data loads-ed quadro">
          <thead><tr><th>Pilar</th><th>x (m)</th><th>y (m)</th><th>Seção (cm)</th><th>Âng.</th><th>Lances</th></tr></thead>
          <tbody>
            {b.pilares.map((p) => {
              const l = lancesDoPilar(b, p);
              return (
                <tr key={p.id} className={pl.selecao.has(p.id) ? 'on' : ''} onClick={() => pl.set({ selecao: new Set([p.id]) })}>
                  <td><Cell value={p.nome} label={`Nome de ${p.nome}`} onCommit={(v) => exec('pilar.editar', { id: p.id, nome: v })} /></td>
                  <td><Cell value={fmt(p.x, 3)} num label={`x de ${p.nome}`} onCommit={(v) => { const x = num(v); if (Number.isFinite(x)) exec('pilar.editar', { id: p.id, x }); }} /></td>
                  <td><Cell value={fmt(p.y, 3)} num label={`y de ${p.nome}`} onCommit={(v) => { const y = num(v); if (Number.isFinite(y)) exec('pilar.editar', { id: p.id, y }); }} /></td>
                  <td><Cell value={p.secao.tipo === 'ret' ? `${cm(p.secao.b)}x${cm(p.secao.h)}` : `ø${cm(p.secao.d)}`} label={`Seção de ${p.nome}`} onCommit={(v) => {
                    const m = /^\s*(?:ø|o|d)\s*([\d.,]+)\s*$/i.exec(v), r = /^\s*([\d.,]+)\s*[x×*]\s*([\d.,]+)\s*$/i.exec(v);
                    if (m) exec('pilar.editar', { id: p.id, secao: { tipo: 'circ', d: num(m[1]) / 100 } });
                    else if (r) exec('pilar.editar', { id: p.id, secao: { tipo: 'ret', b: num(r[1]) / 100, h: num(r[2]) / 100 } });
                  }} /></td>
                  <td><Cell value={fmt(p.angulo, 0)} num label={`Ângulo de ${p.nome}`} onCommit={(v) => { const a = num(v); if (Number.isFinite(a)) exec('pilar.editar', { id: p.id, angulo: a }); }} /></td>
                  <td className="tl small">
                    <select aria-label={`Nasce ${p.nome}`} value={p.nasce} onChange={(e) => exec('pilar.editar', { id: p.id, nasce: e.target.value })}>
                      <option value="fundacao">fundação</option>{ps.slice(0, -1).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                    </select>
                    <select aria-label={`Morre ${p.nome}`} value={p.morre} onChange={(e) => exec('pilar.editar', { id: p.id, morre: e.target.value })}>
                      {ps.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                    </select>
                    <span className="muted"> {l.length}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <textarea rows={3} aria-label="Colar pilares do Excel" placeholder="Colar do Excel: nome, x (m), y (m), b (cm), h (cm) [, ângulo] — uma linha por pilar; só b = circular" value={cola} onChange={(e) => setCola(e.target.value)} />
      <div className="row"><button type="button" className="btn" disabled={!cola.trim()} onClick={colar}>Aplicar quadro colado</button></div>
      <Hint>Pilar com o mesmo nome é atualizado; os demais são inseridos. Tudo vira um passo só (Ctrl+Z desfaz).</Hint>
    </Group>
  );
}

const ALINHAMENTOS: { v: Alinhamento; label: string }[] = [{ v: 'centro', label: 'eixo' }, { v: 'esq', label: 'face esquerda' }, { v: 'dir', label: 'face direita' }];

function VigasGrupo({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const pl = usePlanta();
  const ps = pavimentosOrdenados(b);
  const pav = ps.find((p) => p.id === pl.pavimento) ?? ps[Math.min(1, ps.length - 1)];
  const grupo = b.grupos.find((g) => g.id === pav?.grupo);
  const vs = b.vigas.filter((v) => v.grupo === grupo?.id);
  const sel = vs.filter((v) => pl.selecao.has(v.id)).map((v) => v.id);
  const [destinos, setDestinos] = useState<string[]>([]);
  const cm = (v: number) => +(v * 100).toFixed(2);
  const sv = pl.secaoViga;
  return (
    <Group title={`Vigas — ${grupo?.nome ?? '—'} (${vs.length})`} open={false}>
      <div className="row wrap">
        <NumField label="b" unit="cm" width={80} value={cm(sv.b)} onChange={(v) => v > 0 && pl.set({ secaoViga: { ...sv, b: v / 100 } })} />
        <NumField label="h" unit="cm" width={80} value={cm(sv.h)} onChange={(v) => v > 0 && pl.set({ secaoViga: { ...sv, h: v / 100 } })} />
        <Select label="Linha traçada (A)" value={pl.alinhamento} options={ALINHAMENTOS} onChange={(v) => pl.set({ alinhamento: v })} />
      </div>
      <div className="row wrap">
        <label className="check small"><input type="checkbox" checked={pl.invertida} onChange={(e) => pl.set({ invertida: e.target.checked })} /> <span>invertida</span></label>
        <button type="button" className={`btn${pl.ferramenta === 'viga' ? ' primary' : ''}`} onClick={() => pl.set({ ferramenta: 'viga' })}>Traçar vigas (V)</button>
        <button type="button" className="btn" disabled={!vs.length || !grupo} onClick={() => grupo && exec('viga.ajustarFaces', { grupo: grupo.id })}>Encostar nas faces</button>
        <button type="button" className="btn" disabled={!vs.length || !grupo} onClick={() => grupo && exec('viga.renumerar', { grupo: grupo.id })}>Renumerar</button>
      </div>
      {sel.length > 0 && (
        <div className="row wrap">
          <button type="button" className="btn" onClick={() => exec('viga.atribuir', { ids: sel, campo: 'secao', valor: sv })}>Aplicar {cm(sv.b)}x{cm(sv.h)} às {sel.length} selecionada(s)</button>
          <span className="muted small">Copiar para:</span>
          {b.grupos.filter((g) => g.id !== grupo?.id).map((g) => (
            <label key={g.id} className="check small"><input type="checkbox" checked={destinos.includes(g.id)} onChange={(e) => setDestinos(e.target.checked ? [...destinos, g.id] : destinos.filter((x) => x !== g.id))} /> <span>{g.nome}</span></label>
          ))}
          <button type="button" className="btn" disabled={!destinos.length} onClick={() => exec('viga.copiarParaGrupos', { ids: sel, grupos: destinos })}>Copiar</button>
        </div>
      )}
      {vs.length > 0 && (
        <table className="data loads-ed quadro">
          <thead><tr><th>Viga</th><th>b x h (cm)</th><th>Linha</th><th>L (m)</th><th>Desnível (m)</th></tr></thead>
          <tbody>
            {vs.map((v) => (
              <tr key={v.id} className={pl.selecao.has(v.id) ? 'on' : ''} onClick={() => pl.set({ selecao: new Set([v.id]) })}>
                <td><Cell value={v.nome} label={`Nome de ${v.nome}`} onCommit={(t) => exec('viga.editar', { id: v.id, nome: t })} /></td>
                <td><Cell value={`${cm(v.secao.b)}x${cm(v.secao.h)}`} label={`Seção de ${v.nome}`} onCommit={(t) => { const r = /^\s*([\d.,]+)\s*[x×*]\s*([\d.,]+)\s*$/i.exec(t); if (r) exec('viga.editar', { id: v.id, secao: { b: num(r[1]) / 100, h: num(r[2]) / 100 } }); }} /></td>
                <td><select aria-label={`Alinhamento de ${v.nome}`} value={v.alinhamento} onChange={(e) => exec('viga.editar', { id: v.id, alinhamento: e.target.value })}>{ALINHAMENTOS.map((a) => <option key={a.v} value={a.v}>{a.label}</option>)}</select></td>
                <td className="num">{fmt(comprimentoPolilinha(v.pontos))}</td>
                <td><Cell value={fmt(v.nivel ?? 0, 2)} num label={`Desnível de ${v.nome}`} onCommit={(t) => { const x = num(t); if (Number.isFinite(x)) exec('viga.editar', { id: v.id, nivel: x }); }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Hint>As vigas pertencem à planta do grupo (todos os pavimentos do grupo). Clique os pontos na planta; Enter, duplo clique ou botão direito termina.</Hint>
    </Group>
  );
}
