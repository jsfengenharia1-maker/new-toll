// Estados-limite e combinações (frente N2a): grupos de combinações ativáveis (modo norma ou usuário), controle de
// execução, γ por origem, equilíbrio global e a janela das situações de projeto do usuário (criar, copiar, editar,
// colar, importar da norma, biblioteca) com o alerta de responsabilidade.
import { useEffect, useMemo, useState } from 'react';
import { alertasSituacoes, comandosDaLista, CONTROLE_INFO, ESTADOS_INFO, estadoEmUso, fatoresDaSituacao, GAMA_ORIGEM, listaDeSituacoes, textosAlertas, type ListaSituacoes } from '../../core/building/acoes';
import { combinacoesDoEstado, combinacoesEdificio } from '../../core/building/combinacoes';
import { gamas } from '../../core/building/materiais';
import { casosDaObra, type BuildingModel, type ControleExecucao, type EstadoId, type SituacaoUsuario } from '../../core/building/types';
import { Alert, Button, Dropdown, Group, Hint, Input, Modal, NumField, Select, TextCell, TextField, Textarea } from '../ui';
import { deleteFromLibrary, listLibrary, loadFromLibrary, saveToLibrary, type LibraryItem } from '../storage';
import { useBuilding } from './store';

const fmt = (v: number, d = 3) => String(+v.toFixed(d)).replace('.', ',');
const num = (t: string) => parseFloat(t.replace(',', '.'));
const TIPOS = [{ v: 'normal', label: 'normal' }, { v: 'especial', label: 'construção / especial' }, { v: 'excepcional', label: 'excepcional' }] as const;
const ESTADOS_LISTA = ESTADOS_INFO.filter((e) => e.lista);

/** Colunas (casos) das situações: casos da obra e, com vento, os 12 casos gerados. */
function colunasDeCasos(b: BuildingModel, sits: SituacaoUsuario[], norma: { fatores: Record<string, number> }[]): { id: string; nome: string }[] {
  const nomes = new Map(casosDaObra(b).map((c) => [c.id, c.nome]));
  const ids = [...nomes.keys()];
  const ventos = [...new Set([...norma.flatMap((c) => Object.keys(c.fatores)), ...sits.flatMap((s) => Object.keys(fatoresDaSituacao(s)))])].filter((k) => !nomes.has(k));
  return [...ids, ...ventos.sort()].map((id) => ({ id, nome: nomes.get(id) ?? id }));
}

/** Tabela TSV colada: 1ª linha = casos (nome ou id), demais = nome da situação e fatores. */
export function lerColagem(texto: string, cols: { id: string; nome: string }[]): { nome: string; fatores: Record<string, number> }[] | string {
  const linhas = texto.split(/\r?\n/).map((l) => l.split('\t')).filter((l) => l.some((c) => c.trim()));
  if (linhas.length < 2) return 'Cole ao menos o cabeçalho (casos) e uma linha (situação).';
  const ids = linhas[0].slice(1).map((h) => cols.find((c) => c.id === h.trim() || c.nome === h.trim())?.id);
  const ruim = linhas[0].slice(1).filter((_, i) => !ids[i]);
  if (ruim.length) return `Caso(s) desconhecido(s) no cabeçalho: ${ruim.join(', ')}.`;
  const out: { nome: string; fatores: Record<string, number> }[] = [];
  for (const l of linhas.slice(1)) {
    const fatores: Record<string, number> = {};
    for (let i = 0; i < ids.length; i++) { const t = (l[i + 1] ?? '').trim(); if (!t) continue; const v = num(t); if (!Number.isFinite(v) || v < 0) return `Valor inválido “${t}” na situação ${l[0]}.`; if (v) fatores[ids[i]!] = v; }
    out.push({ nome: l[0].trim(), fatores });
  }
  return out;
}

function CelulaFator({ rot, valor, onChange }: { rot: string; valor: number; onChange: (v: number) => void }) {
  return <TextCell num label={rot} value={valor ? fmt(valor, 4) : '0'} onCommit={(t) => { const v = num(t); if (Number.isFinite(v) && v >= 0) onChange(v); }} />;
}

function SituacoesJanela({ b, onClose }: { b: BuildingModel; onClose: () => void }) {
  const { exec, analise } = useBuilding();
  const [estado, setEstado] = useState<EstadoId>('concreto');
  const [nome, setNome] = useState('');
  const [colar, setColar] = useState('');
  const [erroColar, setErroColar] = useState('');
  const [lib, setLib] = useState<LibraryItem[]>([]);
  const [libSel, setLibSel] = useState('');
  const [msg, setMsg] = useState('');
  const [nomeLib, setNomeLib] = useState('');
  const normativas = useMemo(() => (analise ? combinacoesEdificio(b, analise) : []), [b, analise]);
  const sits = (b.situacoes ?? []).filter((s) => s.estado === estado);
  const cols = colunasDeCasos(b, sits, normativas);
  const info = ESTADOS_INFO.find((e) => e.id === estado)!;
  const alertas = alertasSituacoes(b, normativas).filter((a) => a.estado === estado);
  const recarregar = () => listLibrary().then((r) => setLib(r.items.filter((i) => i.kind === 'combinacoes'))).catch(() => {});
  useEffect(() => { recarregar(); }, []);
  const importar = () => exec('situacao.importar', { estado, ...(analise ? { combinacoes: combinacoesDoEstado({ ...b, estados: undefined, situacoes: undefined }, analise, estado, normativas).map((c) => ({ nome: c.nome, fatores: c.fatores })) } : {}) });
  const nova = () => { if (nome.trim() && exec('situacao.criar', { nome: nome.trim(), estado, fatores: { G: info.tipo === 'ELU' ? 1.4 : 1 } }).ok) setNome(''); };
  const aplicarColagem = () => {
    const r = lerColagem(colar, cols);
    if (typeof r === 'string') { setErroColar(r); return; }
    setErroColar('');
    const ok = exec('lote', { comandos: r.map((s) => ({ nome: 'situacao.criar', params: { nome: s.nome, estado, fatores: s.fatores } })) }).ok;
    if (ok) setColar('');
  };
  const salvar = async () => {
    const n = nomeLib.trim() || `${info.rotulo} · ${b.obra.nome || 'obra'}`;
    try { await saveToLibrary('combinacoes', n, `${sits.length} situação(ões) · ${info.rotulo}`, listaDeSituacoes(b, estado)); setMsg('Lista gravada na biblioteca.'); recarregar(); } catch (e) { setMsg(String((e as Error).message)); }
  };
  const carregar = async () => {
    const e = libSel ? await loadFromLibrary(libSel) : null;
    if (!e) return;
    const l = e.payload as ListaSituacoes;
    if (l.estado !== estado) setEstado(l.estado);
    exec('lote', { comandos: comandosDaLista(l, b) });
    setMsg(`Lista “${e.name}” aplicada (${l.situacoes.length} situação(ões)).`);
  };
  const apagarLib = async () => { if (libSel) { await deleteFromLibrary(libSel); setLibSel(''); recarregar(); } };
  const editar = (s: SituacaoUsuario, p: Record<string, unknown>) => exec('situacao.editar', { id: s.id, ...p });
  const grava = (s: SituacaoUsuario, mapa: 'fatores' | 'gama' | 'psi', caso: string, v: number) => {
    const m = { ...(s[mapa] ?? {}), [caso]: v };
    editar(s, { [mapa]: m });
  };
  return (
    <Modal titulo="Situações do usuário" onClose={onClose} larga>
      <div className="row wrap">
        <Select label="Grupo de estados" value={estado} options={ESTADOS_LISTA.map((e) => ({ v: e.id, label: e.rotulo }))} onChange={setEstado} />
        <Button onClick={importar}>Importar da norma</Button>
        <TextField label="Nome da nova situação" value={nome} onChange={setNome} />
        <Button disabled={!nome.trim()} onClick={nova}>Nova situação</Button>
      </div>
      <Hint>{info.descricao} Cada situação define o fator de cada caso, direto ou por γ e ψ separados (fator = γ·ψ). {estadoEmUso(b, estado).modo === 'usuario' ? 'Grupo em modo “usuário”: estas situações substituem as da norma.' : 'Grupo em modo “norma”: as situações só valem depois de mudar o modo do grupo para “usuário”.'} {!analise ? 'Importar sem análise usa o vento nominal (sem a ampliação por 0,95·γz): calcule antes para importar igual à norma.' : ''}</Hint>
      {alertas.length > 0 && <Alert compact><b>Alerta de responsabilidade.</b> {textosAlertas(b, alertas).map((t, i) => <div key={i}>{t}</div>)}</Alert>}
      <div className="tablewrap">
        <table className="data quadro">
          <thead><tr><th>Situação</th><th>Tipo</th><th>Modo</th>{cols.map((c) => <th key={c.id}>{c.nome}</th>)}<th /></tr></thead>
          <tbody>
            {sits.map((s) => {
              const f = fatoresDaSituacao(s), gp = s.modo === 'gamapsi';
              return (
                <tr key={s.id}>
                  <td><TextCell value={s.nome} label={`Nome da situação ${s.nome}`} onCommit={(v) => editar(s, { nome: v })} /></td>
                  <td><Dropdown aria-label={`Tipo de ${s.nome}`} value={s.situacao} onChange={(e) => editar(s, { situacao: e.target.value })}>{TIPOS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}</Dropdown></td>
                  <td><Dropdown aria-label={`Modo de ${s.nome}`} value={s.modo} onChange={(e) => editar(s, { modo: e.target.value })}><option value="fatores">fator final</option><option value="gamapsi">γ e ψ</option></Dropdown></td>
                  {cols.map((c) => (
                    <td key={c.id}>
                      {gp ? (
                        <span className="gp-par">
                          <CelulaFator rot={`γ de ${c.nome} em ${s.nome}`} valor={s.gama?.[c.id] ?? 0} onChange={(v) => grava(s, 'gama', c.id, v)} />
                          <CelulaFator rot={`ψ de ${c.nome} em ${s.nome}`} valor={s.psi?.[c.id] ?? (s.gama?.[c.id] ? 1 : 0)} onChange={(v) => grava(s, 'psi', c.id, v)} />
                        </span>
                      ) : <CelulaFator rot={`Fator de ${c.nome} em ${s.nome}`} valor={f[c.id] ?? 0} onChange={(v) => grava(s, 'fatores', c.id, v)} />}
                    </td>
                  ))}
                  <td className="nowrap">
                    <Button aria-label={`Copiar ${s.nome}`} onClick={() => exec('situacao.criar', { nome: `${s.nome} (cópia)`, copiarDe: s.id })}>Copiar</Button>
                    <Button variant="danger" aria-label={`Apagar ${s.nome}`} onClick={() => exec('situacao.remover', { ids: [s.id] })}>×</Button>
                  </td>
                </tr>
              );
            })}
            {!sits.length && <tr><td colSpan={cols.length + 4} className="muted">Nenhuma situação neste grupo: importe as da norma ou crie uma.</td></tr>}
          </tbody>
        </table>
      </div>
      <details className="small">
        <summary>Colar tabela</summary>
        <Textarea aria-label="Tabela colada" rows={5} value={colar} placeholder={'\tG\tQ\tW0°\nELU própria\t1,4\t1,4\t0'} onChange={(e) => setColar(e.target.value)} />
        <div className="row wrap"><Button disabled={!colar.trim()} onClick={aplicarColagem}>Criar situações da colagem</Button>{erroColar && <span className="hint bad">{erroColar}</span>}</div>
        <Hint>Cole do Excel: primeira linha com os casos (nome ou id; ventos como W0°, W90°+e…), demais linhas com o nome da situação e os fatores finais. Células vazias valem 0.</Hint>
      </details>
      <div className="row wrap">
        <TextField label="Nome na biblioteca" value={nomeLib} onChange={setNomeLib} />
        <Button disabled={!sits.length} onClick={salvar}>Gravar lista na biblioteca</Button>
        <Select label="Biblioteca de combinações" value={libSel} options={[{ v: '', label: lib.length ? '— escolha —' : '(vazia)' }, ...lib.map((i) => ({ v: i.id, label: i.name }))]} onChange={setLibSel} />
        <Button disabled={!libSel} onClick={carregar}>Aplicar lista</Button>
        <Button variant="danger" disabled={!libSel} onClick={apagarLib}>Excluir da biblioteca</Button>
        {msg && <span className="hint">{msg}</span>}
      </div>
    </Modal>
  );
}

export function EstadosGrupo({ b }: { b: BuildingModel }) {
  const { exec, analise, dim } = useBuilding();
  const [aberta, setAberta] = useState(false);
  const g = gamas(b);
  const normativas = useMemo(() => (analise ? combinacoesEdificio(b, analise) : []), [b, analise]);
  const alterado = !!b.estados || !!b.situacoes?.length || !!b.norma.controle || !!b.norma.combinarAdicionais;
  const alertas = alertasSituacoes(b, normativas);
  const eq = dim?.equilibrio ?? [];
  return (
    <Group title={`Estados-limite e combinações${alterado ? ' (alterados)' : ''}`} open={false}>
      <table className="data quadro">
        <thead><tr><th>Grupo</th><th>Ativo</th><th>Modo</th><th>Combinações</th></tr></thead>
        <tbody>
          {ESTADOS_INFO.map((e) => {
            const c = estadoEmUso(b, e.id), n = (b.situacoes ?? []).filter((s) => s.estado === e.id).length;
            return (
              <tr key={e.id} title={e.descricao}>
                <td className="tl">{e.rotulo}</td>
                <td><Input type="checkbox" aria-label={`Ativar ${e.rotulo}`} checked={c.ativo} disabled={e.fixo} onChange={(ev) => exec('estados.definir', { estados: { [e.id]: { ativo: ev.target.checked } } })} /></td>
                <td>{e.lista ? <Dropdown aria-label={`Modo de ${e.rotulo}`} value={c.modo} onChange={(ev) => exec('estados.definir', { estados: { [e.id]: { modo: ev.target.value } } })}><option value="norma">norma</option><option value="usuario">usuário</option></Dropdown> : <span className="muted">norma</span>}</td>
                <td className="num">{!e.lista ? '—' : c.modo === 'usuario' && n ? `${n} do usuário` : analise ? combinacoesDoEstado(b, analise, e.id, normativas).length : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="row wrap">
        <Select label="Controle de execução" value={b.norma.controle ?? 'normal'} options={(Object.keys(CONTROLE_INFO) as ControleExecucao[]).map((k) => ({ v: k, label: `${CONTROLE_INFO[k].rotulo} · γc ${fmt(CONTROLE_INFO[k].gamaC, 2)}` }))} onChange={(v) => exec('norma.definir', { controle: v })} />
        <NumField label="γh (empuxo de terra)" width={130} value={g.h} onChange={(v) => exec('materiais.definir', { gamas: { h: v } })} />
        <Button onClick={() => setAberta(true)}>Situações do usuário…</Button>
      </div>
      {alertas.length > 0 && <Alert compact><b>Alerta de responsabilidade.</b> {textosAlertas(b, alertas).map((t, i) => <div key={i}>{t}</div>)}</Alert>}
      <details className="small">
        <summary>γ por origem da ação</summary>
        <table className="data quadro">
          <thead><tr><th>Origem</th><th>Normal (desf./fav.)</th><th>Construção / especial</th><th>Excepcional</th></tr></thead>
          <tbody>{GAMA_ORIGEM.map((l) => <tr key={l.id} title={l.fonte}><td className="tl">{l.origem}{l.aConfirmar ? ' *' : ''}</td>{[l.normal, l.especial, l.excepcional].map((p, i) => <td key={i} className="num">{fmt(p[0], 2)} / {fmt(p[1], 2)}</td>)}</tr>)}</tbody>
        </table>
        <Hint>NBR 6118, Tabela 11.1 e linhas de empuxo e de ações indiretas da NBR 8681. * valores a confirmar. As combinações geradas usam γg, γq e γh dos materiais; os de construção/especial servem de referência para as situações do usuário.</Hint>
      </details>
      {eq.length > 0 && (
        <details className="small" open>
          <summary>Equilíbrio global (tombamento)</summary>
          <table className="data quadro">
            <thead><tr><th>Vento</th><th>Mest (kN·m)</th><th>Minst (kN·m)</th><th>Mest / Minst</th></tr></thead>
            <tbody>{eq.map((e) => <tr key={e.direcao} className={e.ok ? '' : 'bad'}><td className="tl">{e.direcao}°</td><td className="num">{fmt(e.Mest, 0)}</td><td className="num">{fmt(e.Minst, 0)}</td><td className="num">{Number.isFinite(e.FS) ? fmt(e.FS, 2) : '∞'}</td></tr>)}</tbody>
          </table>
        </details>
      )}
      <Hint>Desativar um grupo tira os avisos dele da revisão; o concreto é sempre verificado. No modo “usuário”, o grupo usa as situações cadastradas (sem situações, as da norma). Fundações usam as cargas características × γf do módulo de fundações; deslocamentos, flechas e equilíbrio usam fatores próprios (sem lista).</Hint>
      {aberta && <SituacoesJanela b={b} onClose={() => setAberta(false)} />}
    </Group>
  );
}
