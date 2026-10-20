// Módulo Edifícios (fatia 0): obra, norma, pavimentos, grupos e eixos, tudo por comandos do registro.
import { useEffect, useState } from 'react';
import { useBuilding } from './store';
import { listarComandos } from '../../core/commands';
import { cotaFundacao, pavimentosOrdenados, peDireito, USOS, type BuildingModel, type CategoriaUso, type Norma } from '../../core/building/types';
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

  return (
    <div className="fund edif">
      <aside className="fund-in">
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

      <section className="fund-out">
        <div className="card">
          <h3>Elevação esquemática</h3>
          <Elevacao b={b} />
        </div>
        <div className="card">
          <h3>Verificação de lançamento {diags.length ? `(${diags.length})` : ''}</h3>
          <Diagnosticos diags={diags} />
        </div>
        <div className="card">
          <h3>Premissas em uso</h3>
          <ul className="prem">
            {PREMISSAS.map((p) => <li key={p.id}><b>{p.tema}.</b> {p.texto} <span className="muted">({p.fonte}{p.aConfirmar ? '; a confirmar' : ''})</span></li>)}
          </ul>
        </div>
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

function Diagnosticos({ diags }: { diags: Diagnostico[] }) {
  const exec = useBuilding((s) => s.exec);
  if (!diags.length) return <p className="muted">Nenhum problema encontrado.</p>;
  return (
    <ul className="diags">
      {diags.map((d, i) => (
        <li key={i} className={d.severidade}>
          <span className="sev">{d.severidade === 'erro' ? '⚠ erro' : d.severidade === 'aviso' ? '! aviso' : 'i'}</span> {d.mensagem}
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
