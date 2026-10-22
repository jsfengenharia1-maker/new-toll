// Rearmar, agrupar pórticos, seleção para bloqueio e cópia da armadura das lajes (frente R7f).
// Detalhe (tabelas, armadura, opções de detalhamento) só rearma, sem refazer a análise; seção alterada rearma os
// elementos alterados com os esforços guardados (aviso ESFORCO_ANTIGO).
import { useMemo, useState } from 'react';
import { elementosAlterados } from '../../core/building/rearmarAlterados';
import { useStore } from '../store';
import { Button, Hint, Input, Modal, Note, Pill, Select, TextField } from '../ui';
import { comandosBloquear, executarERecalcular } from './Armadura';
import { usePlanta } from './plantaStore';
import { calculoAtual, dimAtual, podeRearmar, useBuilding } from './store';

// ---------------------------------------------------------------- rearmar

/** Situação do dimensionamento e botões "Rearmar alterados" e "Rearmar todos" (aba Dimensionamento). */
export function RearmarCard() {
  const st = useBuilding();
  const { dim, analise, sessao, calculando, rearmar, calcular, modeloDim } = st;
  const b = sessao.modelo;
  const alt = useMemo(() => (modeloDim ? elementosAlterados(modeloDim, b) : null), [modeloDim, b]);
  if (!dim) return null;
  const velhaAnalise = !!analise && !calculoAtual(st);
  const pode = podeRearmar(st);
  const emDia = dimAtual(st);
  const n = alt ? (alt.globais.length ? b.vigas.length + b.pilares.length : alt.elementos.filter((x) => x.tipo !== 'laje').length) : 0;
  const re = dim.rearme;
  return (
    <div data-rearmar data-rev-calculo={sessao.revCalculo} data-rev-detalhe={sessao.revDetalhe} data-rev-esforcos={sessao.revEsforcos}
      data-rev-analise={st.revAnalise} data-rev-dim={st.revDet} data-analises={st.nAnalises} data-rearmes={st.nRearmes} data-dim-atual={emDia ? '1' : '0'} data-analise-atual={velhaAnalise ? '0' : '1'}>
      <h4>Rearmar</h4>
      <div className="row wrap">
        <Button disabled={calculando || !pode || (!velhaAnalise && emDia)} data-rearmar-alterados title="Refaz só os elementos alterados desde o último dimensionamento (seção modificada, armadura desbloqueada, tabela ou cobrimento próprios), com os esforços da análise guardada" onClick={() => rearmar('alterados')}>Rearmar alterados ({alt?.globais.length ? 'todos' : alt ? alt.elementos.filter((x) => x.tipo !== 'laje').length : 0})</Button>
        <Button disabled={calculando || !pode} data-rearmar-todos title="Refaz o dimensionamento e o detalhamento de todos os elementos com a análise guardada (a análise não é refeita)" onClick={() => rearmar('todos')}>Rearmar todos</Button>
        {velhaAnalise && <Button variant="primary" disabled={calculando} onClick={() => calcular()}>Refazer a análise</Button>}
      </div>
      {velhaAnalise && pode && <Note tone="bad" data-esforcos-antigos>Seções alteradas depois da análise ({n} elemento(s) alterado(s)): rearmar usa os esforços guardados (revisão {st.revAnalise}); elementos com a rigidez muito diferente recebem o aviso ESFORCO_ANTIGO. Refaça a análise para esforços corretos.</Note>}
      {velhaAnalise && !pode && <Note tone="bad">Algo além de seções e detalhes mudou depois da análise: refaça a análise antes de rearmar.</Note>}
      {!velhaAnalise && !emDia && <Hint>O detalhe mudou depois do último dimensionamento: rearmar (a análise vale).</Hint>}
      {re && (
        <p className="small" data-rearme-info>
          Rearmado em modo {re.modo === 'alterados' ? '“alterados”' : '“todos”'} com os esforços da revisão {re.esforcosRev}{re.antigos ? ' (seções diferentes das atuais)' : ''}.
          {re.modo === 'alterados' && <> {re.refeitos.length} elemento(s) refeito(s): {re.refeitos.slice(0, 8).map((x) => `${x.nome} (${x.motivo})`).join(', ')}{re.refeitos.length > 8 ? '…' : ''}; {re.mantidos} mantido(s).{re.global ? ` Todos entraram porque ${re.global}.` : ''}</>}
        </p>
      )}
      <Hint>Tabelas, armadura bloqueada, edições de barras e opções de detalhamento só refazem o dimensionamento e o detalhamento; a análise estrutural não roda de novo (contadores: {st.nAnalises} análise(s), {st.nRearmes} rearme(s)).</Hint>
    </div>
  );
}

// ---------------------------------------------------------------- agrupar pórticos

/** Agrupamentos de pórticos: criar pela seleção da planta, acrescentar e desagrupar. */
export function AgrupamentosCard() {
  const { sessao, dim, calculando } = useBuilding();
  const selecao = usePlanta((s) => s.selecao);
  const b = sessao.modelo;
  const [alvo, setAlvo] = useState('');
  const sel = b.vigas.filter((v) => selecao.has(v.id));
  const livres = sel.filter((v) => !b.agrupamentos?.some((g) => g.vigas.includes(v.id)));
  const nome = (id: string) => b.vigas.find((v) => v.id === id)?.nome ?? id;
  const info = (id: string) => dim?.agrupamentos?.find((x) => x.id === id);
  const g = b.agrupamentos ?? [];
  return (
    <div className="card" data-card-agrupamentos>
      <h3>Pórticos agrupados</h3>
      <p className="small">Vigas de um agrupamento levam a mesma armadura (a do pórtico que governa) e saem num só desenho nas pranchas; uma mudança de armadura numa vale para todas.</p>
      <div className="row wrap">
        <Button disabled={calculando || livres.length < 2} data-agrupar-criar title="Agrupa as vigas selecionadas na planta (sem verificar condições; o cálculo avisa o motivo se não valer)" onClick={() => executarERecalcular('vigas.agrupar', { acao: 'criar', ids: livres.map((v) => v.id) })}>Agrupar selecionadas ({livres.length})</Button>
        {g.length > 0 && <Select label="Acrescentar a" value={alvo || g[0].id} options={g.map((x) => ({ v: x.id, label: x.nome }))} onChange={setAlvo} />}
        {g.length > 0 && <Button disabled={calculando || !livres.length} data-agrupar-acrescentar onClick={() => executarERecalcular('vigas.agrupar', { acao: 'acrescentar', agrupamento: alvo || g[0].id, ids: livres.map((v) => v.id) })}>Acrescentar selecionadas</Button>}
      </div>
      {!g.length && <Hint>Selecione duas ou mais vigas na planta (Shift) e use “Agrupar selecionadas”. Condições para valer: mesmo número de vãos e mesma seção.</Hint>}
      {g.length > 0 && (
        <div className="tablewrap">
          <table className="data quadro">
            <thead><tr><th>Agrupamento</th><th>Vigas</th><th>Situação</th><th>Referência</th><th>Desenhos</th><th /></tr></thead>
            <tbody>{g.map((x) => {
              const i = info(x.id);
              return (
                <tr key={x.id} data-agrupamento={x.nome}>
                  <td className="tl">{x.nome}</td>
                  <td className="tl">{x.vigas.map(nome).join(', ')}</td>
                  <td className="tl">{!i ? '—' : i.efetivo ? <Pill tone="ok">vale</Pill> : <span title={i.motivo}><Pill tone="warn">desconsiderado</Pill> <span className="small">{i.motivo}</span></span>}</td>
                  <td className="tl">{i?.referencia ? nome(i.referencia) : '—'}</td>
                  <td className="num">{i?.efetivo ? i.desenhos.length : '—'}</td>
                  <td><Button variant="danger" disabled={calculando} onClick={() => executarERecalcular('vigas.agrupar', { acao: 'desagrupar', agrupamento: x.id })}>Desagrupar</Button></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- seleção para bloqueio

/** Janela de seleção para bloqueio: por grupo de pavimentos, todos ou nenhum, seleção gráfica da planta e contagem. */
export function SelecaoBloqueio({ onClose }: { onClose: () => void }) {
  const { sessao, dim, calculando } = useBuilding();
  const planta = usePlanta((s) => s.selecao);
  const b = sessao.modelo;
  const [escolha, setEscolha] = useState<Set<string>>(new Set([...planta].filter((id) => b.vigas.some((v) => v.id === id) || b.pilares.some((p) => p.id === id))));
  const bloqueado = (id: string) => !!b.vigas.find((v) => v.id === id)?.armadura || !!b.pilares.find((p) => p.id === id)?.armaduras?.length;
  const grupos = b.grupos.map((g) => ({ g, vigas: b.vigas.filter((v) => v.grupo === g.id) })).filter((x) => x.vigas.length);
  const todosIds = [...b.vigas.map((v) => v.id), ...b.pilares.map((p) => p.id)];
  const alt = (ids: string[], on: boolean) => setEscolha((s) => { const n = new Set(s); for (const id of ids) { if (on) n.add(id); else n.delete(id); } return n; });
  const espelhar = () => usePlanta.getState().set({ selecao: new Set(escolha) });
  const bloquear = async () => { if (!dim) return; const { cmds } = comandosBloquear(dim, escolha); if (cmds.length) { await executarERecalcular('lote', { comandos: cmds }); } else useStore.getState().set({ message: 'Nada a bloquear: já estão bloqueados ou não têm arranjo editável.' }); };
  const desbloquear = async () => { if (escolha.size) await executarERecalcular('armadura.desbloquear', { ids: [...escolha] }); };
  const nVig = [...escolha].filter((id) => b.vigas.some((v) => v.id === id)).length, nPil = escolha.size - nVig;
  return (
    <Modal titulo="Seleção para bloqueio de armaduras" onClose={onClose} larga>
      <div data-selecao-bloqueio>
        <div className="row wrap">
          <Button onClick={() => alt(todosIds, true)} data-sel-todos>Todos</Button>
          <Button onClick={() => alt(todosIds, false)} data-sel-nenhum>Nenhum</Button>
          <Button title="Marca as vigas e pilares selecionados na planta" onClick={() => setEscolha(new Set([...usePlanta.getState().selecao].filter((id) => todosIds.includes(id))))}>Usar a seleção da planta</Button>
          <Button onClick={espelhar} title="Seleciona na planta os elementos marcados aqui">Mostrar na planta</Button>
          <Pill tone={escolha.size ? 'ok' : 'na'} data-sel-contagem>{escolha.size} selecionado(s): {nVig} viga(s), {nPil} pilar(es)</Pill>
        </div>
        <div className="tablewrap">
          <table className="data quadro">
            <thead><tr><th>Grupo</th><th>Vigas</th><th>Bloqueadas</th><th /></tr></thead>
            <tbody>
              {grupos.map(({ g, vigas }) => (
                <tr key={g.id}>
                  <td className="tl">{g.nome}</td>
                  <td className="tl small">{vigas.map((v) => <label key={v.id} className="check"><Input type="checkbox" checked={escolha.has(v.id)} onChange={(e) => alt([v.id], e.target.checked)} /> <span className={bloqueado(v.id) ? 'ok' : undefined}>{v.nome}{bloqueado(v.id) ? ' ▣' : ''}</span> </label>)}</td>
                  <td className="num">{vigas.filter((v) => bloqueado(v.id)).length}/{vigas.length}</td>
                  <td><Button onClick={() => alt(vigas.map((v) => v.id), !vigas.every((v) => escolha.has(v.id)))}>{vigas.every((v) => escolha.has(v.id)) ? 'Nenhuma' : 'Todas'}</Button></td>
                </tr>
              ))}
              {b.pilares.length > 0 && (
                <tr>
                  <td className="tl">Pilares</td>
                  <td className="tl small">{b.pilares.map((p) => <label key={p.id} className="check"><Input type="checkbox" checked={escolha.has(p.id)} onChange={(e) => alt([p.id], e.target.checked)} /> <span className={bloqueado(p.id) ? 'ok' : undefined}>{p.nome}{bloqueado(p.id) ? ' ▣' : ''}</span> </label>)}</td>
                  <td className="num">{b.pilares.filter((p) => bloqueado(p.id)).length}/{b.pilares.length}</td>
                  <td><Button onClick={() => alt(b.pilares.map((p) => p.id), !b.pilares.every((p) => escolha.has(p.id)))}>{b.pilares.every((p) => escolha.has(p.id)) ? 'Nenhum' : 'Todos'}</Button></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="row wrap">
          <Button variant="primary" disabled={calculando || !dim || !escolha.size} data-sel-bloquear onClick={bloquear}>Bloquear selecionados</Button>
          <Button disabled={calculando || !escolha.size} data-sel-desbloquear onClick={desbloquear}>Desbloquear selecionados</Button>
        </div>
        <Hint>▣ = armadura bloqueada. Bloquear fixa o arranjo do último dimensionamento (o recálculo só o verifica); desbloquear volta ao dimensionamento automático. Pórticos agrupados: desbloquear um desbloqueia o agrupamento.</Hint>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- cópia da armadura das lajes

/** Salvar a armadura de todos os grupos, recuperá-la onde a geometria não mudou e copiar de outro grupo. */
export function CopiaLajesCard() {
  const { sessao, calculando } = useBuilding();
  const b = sessao.modelo;
  const [nome, setNome] = useState('');
  const gr = b.grupos.filter((g) => b.lajes.some((l) => l.grupo === g.id));
  const [de, setDe] = useState(''), [para, setPara] = useState('');
  if (!b.lajes.length) return null;
  const hoje = new Date().toISOString().slice(0, 10);
  const opts = b.grupos.map((g) => ({ v: g.id, label: g.nome }));
  const d = de || gr[0]?.id || '', p = para || b.grupos.find((g) => g.id !== d)?.id || '';
  return (
    <div className="card" data-card-copia-lajes>
      <h3>Cópia da armadura das lajes</h3>
      <div className="row wrap">
        <TextField label="Nome da cópia" value={nome} onChange={setNome} />
        <Button disabled={calculando} data-copia-salvar title="Guarda a armadura lançada (base, predefinidas, edição das posições, zonas e linhas de dobra) de todos os grupos" onClick={() => { void executarERecalcular('lajes.copiaArmadura', { acao: 'salvar', ...(nome.trim() ? { nome: nome.trim() } : {}), data: hoje }); setNome(''); }}>Salvar a armadura de todos os grupos</Button>
      </div>
      {(b.copiasLaje ?? []).length > 0 && (
        <div className="tablewrap">
          <table className="data quadro">
            <thead><tr><th>Cópia</th><th>Data</th><th>Lajes</th><th /></tr></thead>
            <tbody>{(b.copiasLaje ?? []).map((c) => (
              <tr key={c.id} data-copia={c.nome}>
                <td className="tl">{c.nome}</td><td className="tl">{c.data || '—'}</td><td className="num">{c.lajes.length}</td>
                <td className="row">
                  <Button disabled={calculando} data-copia-recuperar title="Restaura a armadura só nas lajes cujo contorno não mudou; barras que passam por furo novo são cortadas na borda, sem ganchos" onClick={() => executarERecalcular('lajes.copiaArmadura', { acao: 'recuperar', copia: c.id })}>Recuperar</Button>
                  <Button variant="danger" disabled={calculando} onClick={() => executarERecalcular('lajes.copiaArmadura', { acao: 'remover', copia: c.id })}>Remover</Button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {opts.length > 1 && gr.length > 0 && (
        <div className="row wrap">
          <Select label="Copiar a armadura do grupo" value={d} options={opts} onChange={setDe} />
          <Select label="para o grupo" value={p} options={opts} onChange={setPara} />
          <Button disabled={calculando || !d || !p || d === p} data-copia-grupo title="Copia só onde há laje de mesmo contorno (mesma malha), com as zonas de uniformização e linhas de dobra" onClick={() => executarERecalcular('lajes.copiaArmadura', { acao: 'copiar', de: d, para: p })}>Copiar de outro grupo</Button>
        </div>
      )}
      <Hint>Útil antes de abrir um furo imprevisto: salve, altere a laje e recupere — a armadura volta onde a geometria não mudou. Para criar um grupo copiando o de baixo, copie e revise as barras cortadas.</Hint>
    </div>
  );
}
