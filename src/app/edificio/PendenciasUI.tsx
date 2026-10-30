// Ciclo calcular → corrigir → recalcular na interface do Edifício: janela "Antes de calcular" (pendências que impedem o cálculo,
// avisos que não impedem), painel "Erros do cálculo" (vista Verificação, depois de calcular) e aviso de cálculo concluído.
// A classificação, os textos e as ações vêm do núcleo (`core/building/pendencias.ts`).
import { useMemo } from 'react';
import { Alert, Button, Group, Modal, Note, Pill } from '../ui';
import { useStore } from '../store';
import { usePlanta } from './plantaStore';
import { calculoAtual, useBuilding } from './store';
import { useEdifUI } from './uiStore';
import { useRevisao } from './revisao';
import { abrirJanela, irParaElemento } from './Revisao';
import { irParaEtapa } from './etapaNav';
import { useEscadaUI } from './EscadaUI';
import { useInclinadasUI } from './InclinadasUI';
import { JanelaTipoPano } from './TipoPano';
import { errosDoCalculo, GRUPO_ROTULO, pendenciasAntesDeCalcular, type AcaoPendencia, type ErroDoCalculo, type Pendencia, type TipoAlvo } from '../../core/building/pendencias';
import { lancesDoPilar, pavimentosOrdenados, type BuildingModel } from '../../core/building/types';

/** Seleciona os elementos na planta e centraliza no primeiro (troca pavimento e grupo). */
function irAosElementos(b: BuildingModel, tipo: TipoAlvo, ids: string[]) {
  if (!ids.length) return;
  const ps = pavimentosOrdenados(b);
  const l = tipo === 'laje' ? b.lajes.find((x) => x.id === ids[0]) : undefined;
  const p = tipo === 'pilar' ? b.pilares.find((x) => x.id === ids[0]) : undefined;
  const pav = l ? ps.find((x) => x.grupo === l.grupo)?.nome : p ? lancesDoPilar(b, p).at(-1)?.nome : undefined;
  irParaElemento(b, tipo, ids[0], pav);
  if (ids.length > 1) usePlanta.getState().set({ selecao: new Set(ids) });
  useEdifUI.getState().set({ aba: 'planta' });
}

function ListaPendencias({ itens, onAcao }: { itens: Pendencia[]; onAcao: (a: AcaoPendencia) => void }) {
  const grupos = [...new Set(itens.map((x) => x.grupo))];
  return (
    <>
      {grupos.map((g) => (
        <div key={g} data-pend-grupo={g}>
          <h4>{GRUPO_ROTULO[g]}</h4>
          <ul className="diags">
            {itens.filter((x) => x.grupo === g).map((p) => (
              <li key={p.chave} className={p.gravidade} data-pendencia={p.codigo}>
                <span><b>{p.titulo}</b>{p.detalhe && <span className="small muted"> {p.detalhe}</span>} <span className="small muted" title="Código técnico">({p.codigo})</span></span>
                <span className="row wrap">
                  {p.acoes.map((a, i) => <Button key={i} variant="mini" onClick={() => onAcao(a)}>{a.rotulo}</Button>)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

/** Janela "Antes de calcular": abre quando o Calcular encontra pendências que a análise recusa. Atualiza ao corrigir. */
export function JanelaAntesDeCalcular() {
  const ui = useEdifUI();
  const b = useBuilding((s) => s.sessao.modelo), diags = useBuilding((s) => s.diags);
  const { exec, calcular } = useBuilding();
  const r = useMemo(() => pendenciasAntesDeCalcular(b, diags), [b, diags]);
  if (!ui.antes) return null;
  const fechar = () => ui.set({ antes: false });
  const acao = (a: AcaoPendencia) => {
    if (a.tipo === 'ir') { fechar(); irAosElementos(b, a.elemento, a.ids); }
    else if (a.tipo === 'tipoLajes') { usePlanta.getState().set({ selecao: new Set(a.ids) }); ui.set({ tipoLajes: a.ids }); }
    else if (a.tipo === 'etapa') { fechar(); irParaEtapa(a.etapa); }
    else { const x = exec(a.comando, a.params); if (!x.ok) useStore.getState().set({ message: x.erros[0]?.mensagem ?? 'Correção recusada.' }); }
  };
  return (
    <Modal titulo="Antes de calcular" larga onClose={fechar}>
      <div data-antes-de-calcular>
        {r.impeditivas.length > 0
          ? <Alert compact>{r.impeditivas.length === 1 ? 'Há 1 pendência que impede o cálculo.' : `Há ${r.impeditivas.length} pendências que impedem o cálculo.`} Resolva-as e calcule de novo.</Alert>
          : <Note data-sem-impeditivas>Nenhuma pendência impede o cálculo.</Note>}
        {r.impeditivas.length > 0 && <div data-pendencias-impeditivas><ListaPendencias itens={r.impeditivas} onAcao={acao} /></div>}
        {r.avisos.length > 0 && (
          <div data-pendencias-avisos>
            <Group title={`Não impedem o cálculo (${r.avisos.length})`} open={r.impeditivas.length === 0}>
              <ListaPendencias itens={r.avisos} onAcao={acao} />
            </Group>
          </div>
        )}
        <div className="row">
          <Button variant="ghost" onClick={fechar}>Voltar ao lançamento</Button>
          <Button variant="primary" disabled={!r.podeCalcular} title={r.podeCalcular ? undefined : 'Resolva as pendências impeditivas'} onClick={() => { fechar(); void calcular(); }}>{r.avisos.length > 0 ? 'Calcular mesmo assim' : 'Calcular'}</Button>
        </div>
      </div>
    </Modal>
  );
}

/** Seletor de tipo de pano aberto a partir da janela "Antes de calcular", com as lajes pendentes já selecionadas. */
export function JanelaTipoLajes() {
  const ids = useEdifUI((s) => s.tipoLajes), b = useBuilding((s) => s.sessao.modelo);
  if (!ids) return null;
  return <JanelaTipoPano b={b} ids={ids} onClose={() => useEdifUI.getState().set({ tipoLajes: null })} />;
}

/** Painel "Erros do cálculo": erros de dimensionamento por tipo de elemento e pavimento, com a sugestão de correção. */
export function ErrosDoCalculo({ onIr }: { onIr: (tipo: TipoAlvo, id: string, pavimento?: string) => void }) {
  const rev = useRevisao();
  const analise = useBuilding((s) => s.analise), dim = useBuilding((s) => s.dim);
  const atual = useBuilding((s) => calculoAtual(s));
  const r = useMemo(() => errosDoCalculo(rev.itens), [rev.itens]);
  if (!analise && !dim) return <div className="card" data-erros-calculo><h3>Erros do cálculo</h3><p className="muted">A obra ainda não foi calculada. Use Calcular na etapa Calcular.</p></div>;
  const alvo = (e: ErroDoCalculo): TipoAlvo | null => (e.id && ['viga', 'pilar', 'laje', 'fundacao', 'pilarParede', 'parede'].includes(e.tipo) ? (e.tipo as TipoAlvo) : null);
  const temIr = (e: ErroDoCalculo) => !!alvo(e) || (!!e.id && (e.tipo === 'escada' || e.tipo === 'inclinada'));
  const ir = (e: ErroDoCalculo) => {
    const t = alvo(e);
    if (e.tipo === 'escada' && e.id) useEscadaUI.getState().abrir(e.id);
    else if (e.tipo === 'inclinada' && e.id) useInclinadasUI.getState().abrir(e.id);
    else if (t && e.id) onIr(t, e.id, e.pavimento);
  };
  return (
    <div className="card" data-erros-calculo>
      <h3>Erros do cálculo</h3>
      {!atual && <Note>Estes resultados são do último cálculo; a obra mudou desde então. Calcule de novo para atualizar.</Note>}
      {r.total === 0
        ? <p className="muted" data-sem-erros>Nenhum erro de dimensionamento neste cálculo.</p>
        : (
          <>
            <p className="small" data-contagem-erros><b className="bad">{r.total === 1 ? '1 erro' : `${r.total} erros`}</b>: corrija o que está indicado e calcule de novo.</p>
            {r.grupos.map((g) => (
              <div key={g.grupo} data-erros-grupo={g.grupo}>
                <Group title={`${g.rotulo} (${g.total})`}>
                  {g.pavimentos.map((pv) => (
                    <div key={pv.pavimento ?? '-'}>
                      {pv.pavimento && <h4>{pv.pavimento}</h4>}
                      <ul className="diags">
                        {pv.itens.map((e, i) => (
                          <li key={i} className="erro" data-erro-item={e.id ?? ''}>
                            <span><b>{e.nome}</b>: {e.mensagem} <span className="small muted" title="Código técnico">({e.codigo})</span>
                              {e.sugestao && <span className="small muted" data-sugestao={e.codigo}> Sugestão: {e.sugestao}</span>}</span>
                            <span className="row wrap">
                              {temIr(e) && <Button variant="mini" onClick={() => ir(e)}>Ir ao elemento</Button>}
                              {e.temJanela && e.id && <Button variant="mini" onClick={() => abrirJanela({ tipo: e.tipo as TipoAlvo, id: e.id!, ...(e.pavimento ? { pavimento: e.pavimento } : {}) })}>Abrir dimensionamento</Button>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </Group>
              </div>
            ))}
          </>
        )}
    </div>
  );
}

/** Aviso de cálculo concluído sem erros, com atalhos para os resultados (só nas vistas de resultado, nunca sobre a planta). */
export function AvisoCalculo() {
  const aviso = useEdifUI((s) => s.avisoCalculo), aba = useEdifUI((s) => s.aba);
  const atual = useBuilding((s) => calculoAtual(s));
  if (aviso !== 'ok' || !atual || aba === 'planta' || aba === 'vista3d') return null;
  const set = useEdifUI.getState().set;
  return (
    <div className="aviso-calculo" role="status" data-calculo-ok>
      <Pill tone="ok">Cálculo concluído sem erros</Pill>
      <span className="small muted">Ver:</span>
      <Button variant="mini" onClick={() => set({ aba: 'esforcos' })}>Esforços</Button>
      <Button variant="mini" onClick={() => set({ aba: 'deslocamentos' })}>Deformada</Button>
      <Button variant="mini" onClick={() => set({ aba: 'dimensionamento' })}>Armaduras</Button>
      <Button variant="mini" onClick={() => irParaEtapa('pranchas')}>Pranchas</Button>
      <Button variant="ghost" aria-label="Dispensar o aviso de cálculo concluído" onClick={() => set({ avisoCalculo: null })}>Fechar</Button>
    </div>
  );
}
