// Módulo Edifícios: obra, pavimentos, grupos, máscara, pilares e eixos, tudo por comandos do registro; planta em Canvas.
import { ehNervurada } from '../../core/building/tiposLaje';
import { SegundaOrdemAnalise } from './SegundaOrdem';
import { AbaDeslocamentos } from './AbaDeslocamentos';
import { AbaIsovalores } from './AbaIsovalores';
import { AbaEsforcos } from './AbaEsforcos';
import { useEffect, useState } from 'react';
import { calculoAtual, dimAtual, podeRearmar as podeRearm, useBuilding } from './store';
import { FERRAMENTAS_FUNDACAO, aoEscolher, usePlanta, type Ferramenta } from './plantaStore';
import { Planta, ROTULO_FERRAMENTA, TECLA_FERRAMENTA } from './Planta';
import { listarComandos } from '../../core/commands';
import { UNIDADES } from './lancamentoLeitura';
import { BLOCOS, paredesDaMascara, propriedadesLaje, TRELICADAS, vaos, areaLaje } from '../../core/building/lajes';
import { alturaAlvenaria } from '../../core/commands/lajes';
import { resumoAnalise } from '../../core/building/resumo';
import { casosDaObra, casosParaCarga, comprimentoPolilinha, cotaFundacao, ehArranque, lancesDoPilar, mascaraNoGrupo, pavimentosOrdenados, peDireito, USOS, VENTO_PADRAO, type Ajuste, type Alinhamento, type BuildingModel, type CategoriaUso, type CategoriaVento, type TipoLaje } from '../../core/building/types';
import { useStore } from '../store';
import { PREMISSAS, TAXAS } from '../../core/building/premissas';
import type { Diagnostico } from '../../core/building/verify';
import { Navegador } from './Navegador';
import { Propriedades } from './Propriedades';
import { Button, Check, Dock, Dropdown, Group, Hint, Input, Modal, Note, NumField, Palette, Seg, Select, TextCell, TextField, Textarea, ViewTabs, dataAjuda, download, useAjuda } from '../ui';
import { combinacoesEdificio } from '../../core/building/combinacoes';
import { MemorialEdificio } from './MemorialEdificio';
import { PaletaComandos } from './PaletaComandos';
import { DiagonaisHost } from './DiagonaisUI';
import { ConsolosHost } from './ConsolosUI';
import { InclinadasHost } from './InclinadasUI';
import { EscadaHost } from './EscadaUI';
import { lerQuadroVigas } from '../../core/building/quadros';
import { Pranchas } from './Pranchas';
import { AlveolarCampos, tipoAlveolarInicial } from './AlveolarTipo';
import { Vista3D } from '../vista3d/Vista3D';
import { importarCargasDoEdificio } from '../Fundacoes';
import { FogoCard } from './FogoCard';
import { enchimentosDisponiveis, fichasDisponiveis } from '../../core/building/tiposLaje';
import { formasDisponiveis, geometriaBidirecional } from '../../core/building/nervuradas';
import { NervuradasGrupo } from './NervuradasUI';
import { AbacosGrupo } from './AbacosUI';
import { VinculosGrupo } from './Vinculos';
import { CartaoPilaresParede, PilaresParedeGrupo } from './PilarParedeUI';
import { CartaoParedes } from './ParedesUI';
import { CartaoAlvenaria } from './AlvenariaResumo';
import { ParedesGrupo } from './ParedesUI';
import { CortesGrupo, JanelaCorte } from './CortesUI';
import { MurosGrupo } from './MurosUI';
import { AlvenariaGrupo } from './AlvenariaUI';
import { BloqueioLote, executarERecalcular } from './Armadura';
import { AgrupamentosCard, CopiaLajesCard, RearmarCard, SelecaoBloqueio } from './Rearmar';
import { PainelEdicaoLajes } from './EdicaoLajes';
import { POSICAO_LABEL, TIPO_FUNDACAO_LABEL } from '../../core/building/fundacao';
import { ResumoAco } from './Detalhamento';
import { CartaoRelatorios } from './RelatoriosUI';
import { NovaObra } from './NovaObra';
import { LancamentoDxf } from './LancamentoDxf';
import { GerenciadorGabaritos, JanelaCapturas, VistasRapidas } from './Gabaritos';
import { ObrasRecentes } from './ObrasRecentes';
import { ImportarTexto } from './ImportarTexto';
import { DadosL4Grupo } from './DadosL4';
import { LancamentoL5Grupo } from './LancamentoL5';
import { BarraAtalhos } from './BarraAtalhos';
import { GuiaRapidoDialogo } from './GuiaRapido';
import type { Atalho } from '../../core/ajuda';
import { CopiarGrupoDialogo, GruposCopiaGrupo, UnirPavimentosDialogo } from './GruposL4';
import { DadosGeraisJanela } from './DadosGerais';
import { useEdifUI, type AbaEdificio, type DialogoL1, type DialogoL2, type DialogoL4 } from './uiStore';
import { JanelaConfiguracao } from './Configuracao';
import { EtapasGrupo } from './EtapasObra';
import type { EtapaId } from '../../core/building/etapas';
import { abrirJanela, BotaoExportar, Deslocamentos, irParaElemento, JanelaElemento, LinhaElemento, ListaErros } from './Revisao';


const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
/** Classe da cor do grupo (oito cores em design/global.css, --grupo-0…7). */
const corGrupo = (b: BuildingModel, id: string) => `grupo-c${Math.max(0, b.grupos.findIndex((g) => g.id === id)) % 8}`;
const num = (t: string) => parseFloat(t.replace(',', '.'));

/** Atalhos de uso frequente (ferramentas, vistas, desfazer, ajuda, guia): ficam no cabeçalho, como barra de acesso rápido. */
export function AtalhosEdificio() {
  const aj = useAjuda();
  const { desfazer, refazer } = useBuilding();
  const executar = (a: Atalho) => {
    const ui = useEdifUI.getState();
    if (a.tipo === 'ferramenta') { ui.set({ aba: 'planta' }); usePlanta.getState().set({ ferramenta: a.alvo as Ferramenta, ...aoEscolher(a.alvo as Ferramenta) }); return; }
    if (a.tipo === 'aba') { ui.set({ aba: a.alvo as AbaEdificio }); return; }
    if (a.alvo === 'desfazer') desfazer(); else if (a.alvo === 'refazer') refazer(); else if (a.alvo === 'ajuda') aj.alternar();
    else if (a.alvo === 'guia' || a.alvo === 'copiarGrupo' || a.alvo === 'unirPavimentos') ui.set({ l4: a.alvo });
  };
  return <BarraAtalhos executar={executar} />;
}

export function Edificio() {
  const { sessao, exec, diags } = useBuilding();
  const b = sessao.modelo;
  const ps = pavimentosOrdenados(b);
  const ui = useEdifUI();
  const aba = ui.aba, memo = ui.memo, dialogoL1 = ui.l1, dialogoL2 = ui.l2, dialogoL4 = ui.l4;
  const setAba = (a: AbaEdificio) => ui.set({ aba: a });
  const setMemo = (v: boolean) => ui.set({ memo: v });
  const setDialogoL1 = (v: DialogoL1) => ui.set({ l1: v });
  const setDialogoL2 = (v: DialogoL2) => ui.set({ l2: v });
  const setDialogoL4 = (v: DialogoL4) => ui.set({ l4: v });
  const janelaCapturas = usePlanta((s) => s.janelaCapturas);
  const nErr = diags.filter((d) => d.severidade === 'erro').length;
  const irEtapa = (id: EtapaId) => {
    if (id === 'obra') { setDialogoL1('gerais'); return; }
    if (id === 'calculo') { setAba('dimensionamento'); return; }
    if (id === 'pavimentos') { setAba('planta'); useStore.getState().set({ message: 'Pavimentos: edite a lista “Pavimentos” do painel (nome, cota, grupo, +1 para repetir).' }); return; }
    const f = ({ gabarito: 'eixo', pilares: 'pilar', pilaresParede: 'pilarParede', vigas: 'viga', lajes: 'laje', cargas: 'carga' } as Partial<Record<EtapaId, Ferramenta>>)[id];
    setAba('planta');
    if (f) usePlanta.getState().set({ ferramenta: f, ...aoEscolher(f) });
  };

  return (
    <div className="edif">
      <Dock id="edificio-esq" lado="esq" rotulo="painel lateral esquerdo" padrao={320}>
      <div className="dock-stack">
      <Navegador />
      <Palette titulo="Dados da obra" grow>
      <aside className="fund-in edif-in">
        <EtapasGrupo b={b} aoIr={irEtapa} />

        <Group title={`Pavimentos (${ps.length})`}>
          <table className="data loads-ed edpav" {...dataAjuda('barra:pavimentos')}>
            <thead><tr><th>Nome</th><th>Grupo</th><th>Cota (m)</th><th>Pé-dir.</th><th /></tr></thead>
            <tbody>
              {[...ps].reverse().map((p) => (
                <tr key={p.id} data-id={p.id}>
                  <td><TextCell value={p.nome} label={`Nome de ${p.nome}`} onCommit={(v) => exec('pavimento.editar', { id: p.id, nome: v })} /></td>
                  <td>
                    <Dropdown aria-label={`Grupo de ${p.nome}`} value={p.grupo} className={`grupo-marca ${corGrupo(b, p.grupo)}`} onChange={(e) => exec('pavimento.editar', { id: p.id, grupo: e.target.value })}>
                      {b.grupos.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
                    </Dropdown>
                  </td>
                  <td><TextCell value={fmt(p.cota, 2)} label={`Cota de ${p.nome}`} num onCommit={(v) => { const c = num(v); if (Number.isFinite(c)) exec('pavimento.editar', { id: p.id, cota: c }); }} /></td>
                  <td className="num">{fmt(peDireito(b, p.id))}</td>
                  <td className="acts">
                    <Button variant="mini" title={`Repetir ${p.nome} acima (mesmo grupo)`} onClick={() => exec('pavimento.repetir', { id: p.id, vezes: 1, ...(ps[0].id === p.id ? { peDireito: 3 } : {}) })}>+1</Button>
                    <Button variant="mini" title={`Remover ${p.nome}`} aria-label={`Remover ${p.nome}`} onClick={() => exec('pavimento.remover', { id: p.id })}>×</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <NovoPavimento b={b} />
          <Hint>Cota = topo da laje estrutural. Pavimentos do mesmo grupo compartilham a planta; “+1” repete o pavimento logo acima e sobe os de cima.</Hint>
        </Group>

        <GruposCopiaGrupo b={b} abrir={setDialogoL4} />
        <MascaraGrupo b={b} />

        <Group title={`Grupos (${b.grupos.length})`} open={false}>
          <table className="data loads-ed">
            <thead><tr><th>Grupo</th><th>Uso (NBR 6120)</th><th>Rev. kN/m²</th><th>q kN/m²</th></tr></thead>
            <tbody>
              {b.grupos.map((g) => (
                <tr key={g.id}>
                  <td className={`grupo-marca ${corGrupo(b, g.id)}`}><TextCell value={g.nome} label={`Nome do grupo ${g.nome}`} onCommit={(v) => exec('grupo.editar', { id: g.id, nome: v })} /></td>
                  <td>
                    <Dropdown aria-label={`Uso de ${g.nome}`} value={g.uso} onChange={(e) => exec('grupo.editar', { id: g.id, uso: e.target.value as CategoriaUso })}>
                      {USOS.map((u) => <option key={u.v} value={u.v}>{u.label}</option>)}
                    </Dropdown>
                  </td>
                  <td><TextCell value={fmt(g.gRev, 2)} label={`Revestimento de ${g.nome}`} num onCommit={(v) => { const x = num(v); if (Number.isFinite(x)) exec('grupo.editar', { id: g.id, gRev: x }); }} /></td>
                  <td><TextCell value={fmt(g.q, 2)} label={`Carga variável de ${g.nome}`} num onCommit={(v) => { const x = num(v); if (Number.isFinite(x)) exec('grupo.editar', { id: g.id, q: x }); }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Hint>Cargas variáveis padrão pela categoria de uso (NBR 6120:2019, Tabela 10), a confirmar.</Hint>
        </Group>

        <Group title={`Eixos (${b.eixos.length})`} open={false}>
          <Malha />
          {b.eixos.length > 0 && (
            <div className="row wrap u-mt-6">
              <span className="muted small">{b.eixos.map((e) => e.nome).join(' · ')}</span>
              <Button variant="mini" onClick={() => exec('eixo.remover', { ids: b.eixos.map((e) => e.id) })}>remover todos</Button>
            </div>
          )}
        </Group>

      </aside>
      </Palette>
      </div>
      </Dock>

      <section className="edif-main">
        <ViewTabs className="edif-tabs" label="Vistas" active={aba} onChange={(k) => setAba(k as typeof aba)}
          tabs={([['planta', 'Planta'], ['vista3d', '3D'], ['elevacao', 'Elevação'], ['verificacao', `Verificação${diags.length ? ` (${diags.length})` : ''}`], ['analise', 'Análise'], ['deslocamentos', 'Deslocamentos'], ['isovalores', 'Isovalores'], ['esforcos', 'Esforços'], ['dimensionamento', 'Dimensionamento'], ['pranchas', 'Pranchas'], ['premissas', 'Premissas']] as const).map(([k, l]) => ({ id: k, label: l, ajuda: `aba:${k}`, bad: k === 'verificacao' && nErr > 0 }))} />
        {aba === 'planta' && <><PlantaBarra b={b} /><Planta /><PainelEdicaoLajes /></>}
        {aba === 'vista3d' && <Vista3D onPlanta={() => setAba('planta')} />}
        {aba !== 'planta' && aba !== 'vista3d' && (
          <div className="edif-out">
            {aba === 'elevacao' && <div className="card"><h3>Elevação esquemática</h3><Elevacao b={b} /></div>}
            {aba === 'verificacao' && <div className="card"><h3>Verificação de lançamento</h3><Diagnosticos diags={diags} onIr={(ids) => { usePlanta.getState().set({ selecao: new Set(ids) }); setAba('planta'); }} /></div>}
            {aba === 'analise' && <Analise b={b} nErr={nErr} />}
            {aba === 'deslocamentos' && <AbaDeslocamentos b={b} />}
            {aba === 'isovalores' && <AbaIsovalores b={b} />}
            {aba === 'esforcos' && <AbaEsforcos b={b} />}
            {aba === 'dimensionamento' && <DimensionamentoAba onIr={(tipo, id, pav) => { irParaElemento(b, tipo, id, pav); setAba('planta'); }} onMemorial={() => setMemo(true)} />}
            {aba === 'pranchas' && <Pranchas />}
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

      <Dock id="edificio-dir" lado="dir" rotulo="painel lateral direito" padrao={360}>
        <Propriedades>
          <PilaresGrupo b={b} />
          <PilaresParedeGrupo b={b} onPlanta={() => setAba('planta')} />
          <ParedesGrupo b={b} onPlanta={() => setAba('planta')} />
          <MurosGrupo b={b} />
          <AlvenariaGrupo b={b} />
          <VigasGrupo b={b} />
          <LancamentoL5Grupo b={b} onPlanta={() => setAba('planta')} />
          <LajesGrupo b={b} />
          <NervuradasGrupo b={b} />
          <AbacosGrupo b={b} />
          <DadosL4Grupo b={b} onPlanta={() => setAba('planta')} />
          <CargasGrupo b={b} />
          <CortesGrupo b={b} onPlanta={() => setAba('planta')} />
          <VinculosGrupo b={b} />
        </Propriedades>
      </Dock>
      {memo && <MemorialEdificio onClose={() => setMemo(false)} />}
      {dialogoL1 === 'nova' && <NovaObra onClose={() => setDialogoL1(null)} onCriada={() => setDialogoL1('gerais')} onTexto={() => setDialogoL1('texto')} onDxf={() => { setDialogoL1(null); setDialogoL2({ tipo: 'lancar' }); }} />}
      {dialogoL4 === 'copiarGrupo' && <CopiarGrupoDialogo b={b} onClose={() => setDialogoL4(null)} />}
      {dialogoL4 === 'unirPavimentos' && <UnirPavimentosDialogo b={b} onClose={() => setDialogoL4(null)} />}
      {dialogoL4 === 'guia' && <GuiaRapidoDialogo obra={b.obra.nome} onClose={() => setDialogoL4(null)} />}
      {dialogoL2?.tipo === 'lancar' && <LancamentoDxf inicial={dialogoL2.inicial} onClose={() => setDialogoL2(null)} />}
      {dialogoL2?.tipo === 'gabaritos' && <GerenciadorGabaritos onClose={() => setDialogoL2(null)} onLancar={(id) => setDialogoL2({ tipo: 'lancar', inicial: id })} />}
      {dialogoL2?.tipo === 'vistas' && <VistasRapidas onClose={() => setDialogoL2(null)} />}
      {janelaCapturas && <JanelaCapturas onClose={() => usePlanta.getState().set({ janelaCapturas: false })} />}
      {dialogoL1 === 'recentes' && <ObrasRecentes onClose={() => setDialogoL1(null)} onAberta={() => setDialogoL1(null)} />}
      {dialogoL1 === 'texto' && <ImportarTexto onClose={() => setDialogoL1(null)} onCriada={() => { setDialogoL1(null); useStore.getState().set({ module: 'fundacoes' }); }} />}
      {dialogoL1 === 'gerais' && <DadosGeraisJanela b={b} onClose={() => setDialogoL1(null)} />}
      {ui.jan === 'malha' && <Modal titulo="Malha de eixos" onClose={() => ui.set({ jan: null })}><Malha /></Modal>}
      {ui.jan === 'novoPavimento' && <Modal titulo="Novo pavimento" onClose={() => ui.set({ jan: null })}><NovoPavimento b={b} /></Modal>}
      <JanelaConfiguracao b={b} />
      <JanelaElemento />
      <JanelaCorte />
      <InclinadasHost />
      <EscadaHost />
      <DiagonaisHost />
      <ConsolosHost />
      <PaletaComandos setAba={(a) => setAba(a as typeof aba)} />
    </div>
  );
}

/** Campo de tabela que confirma no Enter ou ao sair. */

export function NovoPavimento({ b }: { b: BuildingModel }) {
  const exec = useBuilding((s) => s.exec);
  const ps = pavimentosOrdenados(b);
  const topo = ps.at(-1);
  const [h, setH] = useState(3);
  const criar = () => {
    const nome = `Pavimento ${ps.length + 1}`;
    exec('pavimento.criar', { nome, cota: +((topo?.cota ?? -h) + h).toFixed(3) });
  };
  return (
    <div className="row wrap u-mt-6 u-items-end">
      <NumField label="Pé-direito" unit="m" width={110} value={h} onChange={(v) => setH(v > 0 ? v : 3)} />
      <Button onClick={criar}>+ Pavimento acima</Button>
    </div>
  );
}

export function Malha() {
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
      <div className="row"><Button onClick={() => exec('eixo.malha', { dx: lista(dx), dy: lista(dy), substituir: true })}>Criar malha de eixos</Button></div>
      <Hint>Separe os espaçamentos com “;”. A malha substitui os eixos existentes; a planta para editá-los chega na próxima fatia.</Hint>
    </>
  );
}

export function LinhaComando() {
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
        <Input id="edcmd" className="cmdline" list="edcmds" aria-label="Linha de comando do edifício" title="Os mesmos comandos da interface, da linha de comando (statikos exec) e do servidor MCP. Ctrl+Z desfaz." placeholder='pavimento.criar {"nome": "Ático", "cota": 15}' value={t} onChange={(e) => setT(e.target.value)} />
        <datalist id="edcmds">{nomes.map((n) => <option key={n} value={n} />)}</datalist>
      </form>
      {erro && <span className="hint bad">{erro}</span>}
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
          {onIr && d.elementos.length > 0 && <Button variant="mini" onClick={() => onIr(d.elementos)}>ver na planta</Button>}
          {d.sugestao && <Button variant="mini" onClick={() => exec(d.sugestao!.comando, d.sugestao!.params)}>{d.sugestao.texto}</Button>}
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
            <rect x={x0} y={yt} width={x1 - x0} height={Math.max(yb - yt, 1)} className={`grupo-faixa ${corGrupo(b, p.grupo)}`} />
            <line x1={x0 - 10} x2={x1 + 10} y1={yt} y2={yt} className={`grupo-linha ${corGrupo(b, p.grupo)}`} />
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
  return <Input aria-label="Nome da obra no cabeçalho" value={t} onChange={(e) => setT(e.target.value)} onBlur={() => { if (t.trim() && t !== nome) exec('obra.definir', { nome: t }); else setT(nome); }} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />;
}

const ferramentas = (fs: Ferramenta[]) => fs.map((f) => ({ f, tecla: TECLA_FERRAMENTA[f] ?? '', rot: ROTULO_FERRAMENTA[f] }));
const FERRAMENTAS = ferramentas(['fundacao', 'vigaFund', 'girarFund', 'insFund', 'limite', 'limiteMascara', 'medir']);
/** Radier (W) e viga sobre base elástica (X): pelas teclas e pelos botões do grupo Fundação (a barra não cabe numa linha). */

function PlantaBarra({ b }: { b: BuildingModel }) {
  const pl = usePlanta();
  const ps = pavimentosOrdenados(b);
  const nivelFund = pl.pavimento === 'fundacao';
  const atual = ps.find((p) => p.id === pl.pavimento) ?? ps[Math.min(1, ps.length - 1)];
  const dim = useBuilding((s) => s.dim);
  const { calcularFundacao, calculandoFund } = useBuilding();
  // armadura de punção informada nos pilares selecionados (apagar por janela de seleção)
  const pilaresSelPuncao = b.lajes.flatMap((l) => [...new Set((l.puncao ?? []).filter((g) => g.pilar && pl.selecao.has(g.pilar)).map((g) => g.pilar!))].map((pilar) => ({ laje: l.id, pilar })));
  const apagarPuncaoSelecao = () => {
    const porLaje = new Map<string, string[]>();
    for (const x of pilaresSelPuncao) porLaje.set(x.laje, [...(porLaje.get(x.laje) ?? []), x.pilar]);
    void executarERecalcular('lote', { comandos: [...porLaje].map(([id, pilares]) => ({ nome: 'laje.puncao', params: { id, pilares } })) });
  };
  return (
    <div className="planta-barra optbar">
      <label className="pavsel">Pavimento
        <Dropdown aria-label="Pavimento da planta" value={nivelFund ? 'fundacao' : atual?.id ?? ''} onChange={(e) => pl.set({ pavimento: e.target.value, selecao: new Set(), ...(e.target.value === 'fundacao' ? {} : FERRAMENTAS_FUNDACAO.includes(pl.ferramenta) ? { ferramenta: 'selecionar' as Ferramenta } : {}) })}>
          {[...ps].reverse().map((p) => <option key={p.id} value={p.id}>{p.nome} ({fmt(p.cota)})</option>)}
          <option value="fundacao">Fundação ({fmt(cotaFundacao(b))})</option>
        </Dropdown>
      </label>
      <div className="seg small" role="radiogroup" aria-label="Ferramenta">
        {FERRAMENTAS.filter((t) => nivelFund || t.f === 'fundacao' || !FERRAMENTAS_FUNDACAO.includes(t.f)).map((t) => <Button variant="nenhuma" key={t.f} type="button" role="radio" aria-checked={pl.ferramenta === t.f} className={pl.ferramenta === t.f ? 'on' : ''} title={`${t.rot} (${t.tecla})`} onClick={() => pl.set({ ferramenta: t.f, ...aoEscolher(t.f) })}>{t.rot}</Button>)}
      </div>
      {pl.ferramenta === 'vigaGabarito' && <Seg small value={pl.modoVigaGab} onChange={(v) => pl.set({ modoVigaGab: v })} options={[{ v: 'face', label: 'Linha = face' }, { v: 'eixo', label: 'Linha = eixo' }]} />}
      {pl.ferramenta === 'copiar' && <NumField label="Cópias" width={70} value={pl.copias} onChange={(v) => v >= 1 && v <= 100 && pl.set({ copias: Math.round(v) })} />}
      {pl.ferramenta === 'girar' && <NumField label="Ângulo" unit="°" width={80} value={pl.anguloGiro} onChange={(v) => pl.set({ anguloGiro: v })} />}
      {pl.ferramenta === 'espelhar' && <label className="check small"><Input type="checkbox" checked={pl.espelharCopia} onChange={(e) => pl.set({ espelharCopia: e.target.checked })} /> <span>Manter os originais (cópia)</span></label>}
      {pl.ferramenta === 'fundacao' && <label className="check small" title="Cada clique marca ou desmarca um pilar; Enter cria a sapata associada ou o bloco com vários pilares"><Input type="checkbox" checked={pl.multiFund} onChange={(e) => pl.set({ multiFund: e.target.checked, pilaresFund: [] })} /> <span>Vários pilares (Enter cria)</span></label>}
      {pl.ferramenta === 'radier' && <NumField label="h do radier" unit="m" width={90} value={pl.hRadier} onChange={(v) => v >= 0.1 && v <= 3 && pl.set({ hRadier: v })} />}
      {pl.ferramenta === 'corrida' && <>
        <NumField label="bw" unit="m" width={70} value={pl.corridaLanc.bw} onChange={(v) => v >= 0.1 && pl.set({ corridaLanc: { ...pl.corridaLanc, bw: v } })} />
        <Dropdown aria-label="Aba da sapata corrida" value={pl.corridaLanc.aba} onChange={(e) => pl.set({ corridaLanc: { ...pl.corridaLanc, aba: e.target.value as 'ambas' | 'esq' | 'dir' } })}>
          <option value="ambas">Abas: dois lados</option><option value="esq">Aba à esquerda</option><option value="dir">Aba à direita</option>
        </Dropdown>
        <label className="check small" title="Aba de um lado só: vigas de equilíbrio (cintas) até sapatas internas"><Input type="checkbox" checked={pl.corridaLanc.equilibrio} onChange={(e) => pl.set({ corridaLanc: { ...pl.corridaLanc, equilibrio: e.target.checked } })} /> <span>Cintas</span></label>
      </>}
      {pl.ferramenta === 'vigaElastica' && <><NumField label="b" unit="m" width={70} value={pl.secaoVigaElastica.b} onChange={(v) => v >= 0.15 && pl.set({ secaoVigaElastica: { ...pl.secaoVigaElastica, b: v } })} /><NumField label="h" unit="m" width={70} value={pl.secaoVigaElastica.h} onChange={(v) => v >= 0.2 && pl.set({ secaoVigaElastica: { ...pl.secaoVigaElastica, h: v } })} /></>}
      {(pl.ferramenta === 'limite' || pl.ferramenta === 'limiteMascara') && <label className="check small" title="Limite fechado (poço, reservatório) ou aberto (divisa)"><Input type="checkbox" checked={pl.limiteFechado} onChange={(e) => pl.set({ limiteFechado: e.target.checked })} /> <span>Limite fechado</span></label>}
      {pl.ferramenta === 'puncao' && (<>
        <div className="seg small" role="radiogroup" aria-label="Modo da armadura de punção">
          {(['adicionar', 'apagar'] as const).map((m) => <Button variant="nenhuma" key={m} type="button" role="radio" aria-checked={pl.puncaoModo === m} className={pl.puncaoModo === m ? 'on' : ''} onClick={() => pl.set({ puncaoModo: m })}>{m === 'adicionar' ? 'Adicionar' : 'Apagar'}</Button>)}
        </div>
        <NumField label="Linhas" width={64} value={pl.puncaoGrupo.linhas} onChange={(v) => v >= 2 && v <= 64 && pl.set({ puncaoGrupo: { ...pl.puncaoGrupo, linhas: Math.round(v) } })} />
        <NumField label="Barras/linha" width={80} value={pl.puncaoGrupo.barras} onChange={(v) => v >= 1 && v <= 14 && pl.set({ puncaoGrupo: { ...pl.puncaoGrupo, barras: Math.round(v) } })} />
        <Select label="φ" value={pl.puncaoGrupo.phi} options={[5, 6.3, 8, 10, 12.5, 16].map((v) => ({ v, label: String(v).replace('.', ',') }))} onChange={(v) => pl.set({ puncaoGrupo: { ...pl.puncaoGrupo, phi: v } })} />
        <NumField label="Espaç." unit="cm" width={70} value={Math.round(pl.puncaoGrupo.s * 100)} onChange={(v) => v >= 3 && v <= 30 && pl.set({ puncaoGrupo: { ...pl.puncaoGrupo, s: v / 100 } })} />
      </>)}
      {!!pilaresSelPuncao.length && <Button title="Apaga a armadura de punção informada nos pilares selecionados (use a seleção por janela da ferramenta Selecionar)" onClick={() => apagarPuncaoSelecao()}>Apagar punção da seleção</Button>}
      {nivelFund && (<>
        <Button disabled={!dim || calculandoFund} title="Calcula só as fundações, com a análise em vigor (a estrutura não é refeita)" onClick={() => calcularFundacao()}>{calculandoFund ? 'Calculando…' : 'Calcular fundações'}</Button>
      </>)}
    </div>
  );
}

function MascaraGrupo({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const pl = usePlanta();
  const ps = pavimentosOrdenados(b);
  const pav = ps.find((p) => p.id === pl.pavimento) ?? ps[Math.min(1, ps.length - 1)];
  const grupo = b.grupos.find((g) => g.id === pav?.grupo);
  const ms = b.mascaras.filter((m) => !!grupo && mascaraNoGrupo(m, grupo.id));
  return (
    <Group title={`Máscara — ${grupo?.nome ?? '—'} (${ms.length})`} open={false}>
      <div className="row wrap">
        {ms.length > 0 && <label className="check small"><Input type="checkbox" checked={pl.alinharEscala} onChange={(e) => pl.set({ alinharEscala: e.target.checked })} /> <span>ajustar escala</span></label>}
      </div>
      {ms.map((m) => (
        <div key={m.id} className="masc">
          <div className="row wrap">
            <b className="grow">{m.nome}</b>
            <Dropdown aria-label={`Unidade de ${m.nome}`} value={UNIDADES.find((u) => Math.abs(u.v - m.escala) < 1e-12)?.v ?? ''} onChange={(e) => exec('mascara.editar', { id: m.id, escala: +e.target.value })}>
              {!UNIDADES.some((u) => Math.abs(u.v - m.escala) < 1e-12) && <option value="">{`${fmt(m.escala, 5)} m/un`}</option>}
              {UNIDADES.map((u) => <option key={u.v} value={u.v}>{u.label}</option>)}
            </Dropdown>
            <Button variant="mini" onClick={() => exec('mascara.remover', { id: m.id })}>remover</Button>
          </div>
          <table className="data camadas">
            <thead><tr><th>Camada</th><th title="Visível">vis.</th><th title="Capturável">capt.</th></tr></thead>
            <tbody>
              {m.camadas.map((c) => (
                <tr key={c.nome}>
                  <td className="tl">{c.nome}</td>
                  <td><Input type="checkbox" aria-label={`Camada ${c.nome} visível`} checked={c.visivel} onChange={(e) => exec('mascara.camadas', { id: m.id, camadas: [c.nome], visivel: e.target.checked })} /></td>
                  <td><Input type="checkbox" aria-label={`Camada ${c.nome} capturável`} checked={c.capturavel} onChange={(e) => exec('mascara.camadas', { id: m.id, camadas: [c.nome], capturavel: e.target.checked })} /></td>
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
      <Check label="Arranque (pilar de altura zero, só leva cargas à fundação)" checked={pl.arranque} onChange={(v) => pl.set({ arranque: v, ...(v ? { pavimento: 'fundacao', ferramenta: 'pilar' as Ferramenta } : {}) })} />
      <div className="row"><Button variant={pl.ferramenta === 'pilar' ? 'primary' : 'default'} onClick={() => pl.set({ ferramenta: 'pilar' })}>Lançar pilares (P)</Button>
        <Button disabled={!b.pilares.length} onClick={() => exec('pilar.renumerar', {})}>Renumerar</Button></div>
      {b.pilares.length > 0 && (
        <table className="data loads-ed quadro">
          <thead><tr><th>Pilar</th><th>x (m)</th><th>y (m)</th><th>Seção (cm)</th><th>Âng.</th><th>Lances</th></tr></thead>
          <tbody>
            {b.pilares.map((p) => {
              const l = lancesDoPilar(b, p);
              return (
                <tr key={p.id} className={`${pl.selecao.has(p.id) ? 'on' : ''}${p.origemLancamento ? ' lancado' : ''}`} title={p.origemLancamento ? `Lançado do gabarito (${p.origemLancamento})` : undefined} onClick={() => pl.set({ selecao: new Set([p.id]) })}>
                  <td><TextCell value={p.nome} label={`Nome de ${p.nome}`} onCommit={(v) => exec('pilar.editar', { id: p.id, nome: v })} /></td>
                  <td><TextCell value={fmt(p.x, 3)} num label={`x de ${p.nome}`} onCommit={(v) => { const x = num(v); if (Number.isFinite(x)) exec('pilar.editar', { id: p.id, x }); }} /></td>
                  <td><TextCell value={fmt(p.y, 3)} num label={`y de ${p.nome}`} onCommit={(v) => { const y = num(v); if (Number.isFinite(y)) exec('pilar.editar', { id: p.id, y }); }} /></td>
                  <td><TextCell value={p.secao.tipo === 'ret' ? `${cm(p.secao.b)}x${cm(p.secao.h)}` : `ø${cm(p.secao.d)}`} label={`Seção de ${p.nome}`} onCommit={(v) => {
                    const m = /^\s*(?:ø|o|d)\s*([\d.,]+)\s*$/i.exec(v), r = /^\s*([\d.,]+)\s*[x×*]\s*([\d.,]+)\s*$/i.exec(v);
                    if (m) exec('pilar.editar', { id: p.id, secao: { tipo: 'circ', d: num(m[1]) / 100 } });
                    else if (r) exec('pilar.editar', { id: p.id, secao: { tipo: 'ret', b: num(r[1]) / 100, h: num(r[2]) / 100 } });
                  }} /></td>
                  <td><TextCell value={fmt(p.angulo, 0)} num label={`Ângulo de ${p.nome}`} onCommit={(v) => { const a = num(v); if (Number.isFinite(a)) exec('pilar.editar', { id: p.id, angulo: a }); }} /></td>
                  <td className="tl small">
                    <Dropdown aria-label={`Nasce ${p.nome}`} value={p.nasce} onChange={(e) => exec('pilar.editar', { id: p.id, nasce: e.target.value })}>
                      <option value="fundacao">fundação</option>{ps.slice(0, -1).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                    </Dropdown>
                    <Dropdown aria-label={`Morre ${p.nome}`} value={p.morre} onChange={(e) => exec('pilar.editar', { id: p.id, morre: e.target.value })}>
                      <option value="fundacao" disabled={p.nasce !== 'fundacao'}>fundação (arranque)</option>{ps.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                    </Dropdown>
                    <span className="muted"> {ehArranque(p) ? 'arranque' : l.length}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <Textarea rows={3} aria-label="Colar pilares do Excel" placeholder="Colar do Excel: nome, x (m), y (m), b (cm), h (cm) [, ângulo] — uma linha por pilar; só b = circular" value={cola} onChange={(e) => setCola(e.target.value)} />
      <div className="row"><Button disabled={!cola.trim()} onClick={colar}>Aplicar quadro colado</Button></div>
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
  const [colaV, setColaV] = useState('');
  const cm = (v: number) => +(v * 100).toFixed(2);
  const sv = pl.secaoViga;
  const colarVigas = () => {
    if (!grupo) return;
    const { comandos, ignoradas } = lerQuadroVigas(colaV, b, grupo.id);
    if (!comandos.length) { useStore.getState().set({ message: 'Cole linhas com: nome, b (cm), h (cm), x1, y1, x2, y2 [, x3, y3 …] (m).' }); return; }
    if (exec('lote', { comandos }).ok) { setColaV(''); if (ignoradas) useStore.getState().set({ message: `${comandos.length} viga(s) aplicada(s); ${ignoradas} linha(s) ignorada(s) (cabeçalho ou incompleta).` }); }
  };
  return (
    <Group title={`Vigas — ${grupo?.nome ?? '—'} (${vs.length})`} open={false}>
      <div className="row wrap">
        <NumField label="b" unit="cm" width={80} value={cm(sv.b)} onChange={(v) => v > 0 && pl.set({ secaoViga: { ...sv, b: v / 100 } })} />
        <NumField label="h" unit="cm" width={80} value={cm(sv.h)} onChange={(v) => v > 0 && pl.set({ secaoViga: { ...sv, h: v / 100 } })} />
        <Select label="Linha traçada (A)" value={pl.alinhamento} options={ALINHAMENTOS} onChange={(v) => pl.set({ alinhamento: v })} />
      </div>
      <div className="row wrap">
        <label className="check small"><Input type="checkbox" checked={pl.invertida} onChange={(e) => pl.set({ invertida: e.target.checked })} /> <span>invertida</span></label>
        <Button variant={pl.ferramenta === 'viga' ? 'primary' : 'default'} onClick={() => pl.set({ ferramenta: 'viga' })}>Traçar vigas (V)</Button>
        <Button disabled={!vs.length || !grupo} onClick={() => grupo && exec('viga.alinharFace', { grupo: grupo.id, lado: 'externa' })} title="Vigas de contorno: a face externa da viga vai para a face externa dos pilares (viga mais estreita que o pilar fica para dentro)">Contorno na face externa</Button>
        <Button disabled={!vs.length || !grupo} onClick={() => grupo && exec('viga.ajustarFaces', { grupo: grupo.id })} title="Corrige folgas de até 5 cm entre a face da viga e a do pilar">Encostar nas faces</Button>
        <Button disabled={!vs.length || !grupo} onClick={() => grupo && exec('viga.renumerar', { grupo: grupo.id })}>Renumerar</Button>
      </div>
      {sel.length > 0 && grupo && (
        <div className="row wrap">
          <span className="muted small">Locar {sel.length} selecionada(s) pela face do pilar:</span>
          <Button onClick={() => exec('viga.alinharFace', { grupo: grupo.id, ids: sel, lado: 'externa' })}>externa</Button>
          <Button onClick={() => exec('viga.alinharFace', { grupo: grupo.id, ids: sel, lado: 'esq' })}>esquerda</Button>
          <Button onClick={() => exec('viga.alinharFace', { grupo: grupo.id, ids: sel, lado: 'dir' })}>direita</Button>
        </div>
      )}
      {sel.length > 0 && (
        <div className="row wrap">
          <Button onClick={() => exec('viga.atribuir', { ids: sel, campo: 'secao', valor: sv })}>Aplicar {cm(sv.b)}x{cm(sv.h)} às {sel.length} selecionada(s)</Button>
          <span className="muted small">Copiar para:</span>
          {b.grupos.filter((g) => g.id !== grupo?.id).map((g) => (
            <label key={g.id} className="check small"><Input type="checkbox" checked={destinos.includes(g.id)} onChange={(e) => setDestinos(e.target.checked ? [...destinos, g.id] : destinos.filter((x) => x !== g.id))} /> <span>{g.nome}</span></label>
          ))}
          <Button disabled={!destinos.length} onClick={() => exec('viga.copiarParaGrupos', { ids: sel, grupos: destinos })}>Copiar</Button>
        </div>
      )}
      {vs.length > 0 && (
        <table className="data loads-ed quadro">
          <thead><tr><th>Viga</th><th>b x h (cm)</th><th>Linha</th><th>L (m)</th><th>Desnível (m)</th></tr></thead>
          <tbody>
            {vs.map((v) => (
              <tr key={v.id} className={`${pl.selecao.has(v.id) ? 'on' : ''}${v.origemLancamento ? ' lancado' : ''}`} title={v.origemLancamento ? `Lançada do gabarito (${v.origemLancamento})` : undefined} onClick={() => pl.set({ selecao: new Set([v.id]) })}>
                <td><TextCell value={v.nome} label={`Nome de ${v.nome}`} onCommit={(t) => exec('viga.editar', { id: v.id, nome: t })} /></td>
                <td><TextCell value={`${cm(v.secao.b)}x${cm(v.secao.h)}`} label={`Seção de ${v.nome}`} onCommit={(t) => { const r = /^\s*([\d.,]+)\s*[x×*]\s*([\d.,]+)\s*$/i.exec(t); if (r) exec('viga.editar', { id: v.id, secao: { b: num(r[1]) / 100, h: num(r[2]) / 100 } }); }} /></td>
                <td><Dropdown aria-label={`Alinhamento de ${v.nome}`} value={v.alinhamento} onChange={(e) => exec('viga.editar', { id: v.id, alinhamento: e.target.value })}>{ALINHAMENTOS.map((a) => <option key={a.v} value={a.v}>{a.label}</option>)}</Dropdown></td>
                <td className="num">{fmt(comprimentoPolilinha(v.pontos))}</td>
                <td><TextCell value={fmt(v.nivel ?? 0, 2)} num label={`Desnível de ${v.nome}`} onCommit={(t) => { const x = num(t); if (Number.isFinite(x)) exec('viga.editar', { id: v.id, nivel: x }); }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Textarea rows={3} aria-label="Colar vigas do Excel" placeholder="Colar do Excel: nome, b (cm), h (cm), x1, y1, x2, y2 [, x3, y3 …] (m) — uma linha por viga" value={colaV} onChange={(e) => setColaV(e.target.value)} />
      <div className="row"><Button disabled={!colaV.trim() || !grupo} onClick={colarVigas}>Aplicar quadro de vigas</Button></div>
      <Hint>As vigas pertencem à planta do grupo (todos os pavimentos do grupo). Clique os pontos na planta; Enter, duplo clique ou botão direito termina. No quadro colado, viga com o mesmo nome no grupo é atualizada (seção e pontos); as demais são traçadas, num passo só (Ctrl+Z desfaz).</Hint>
    </Group>
  );
}

/** Grupo da planta atual (pavimento escolhido na barra da planta). */
function grupoAtual(b: BuildingModel, pavimento: string | null) {
  const ps = pavimentosOrdenados(b);
  const pav = ps.find((p) => p.id === pavimento) ?? ps[Math.min(1, ps.length - 1)];
  return b.grupos.find((g) => g.id === pav?.grupo);
}

function TipoLajeCampos({ b, tipo, onChange }: { b: BuildingModel; tipo: TipoLaje; onChange: (t: TipoLaje) => void }) {
  const [fab, setFab] = useState('');
  const todas = fichasDisponiveis(b);
  const fabricantes = [...new Set(todas.map((x) => x.ficha.fabricante).filter((x): x is string => !!x))];
  const fichas = todas.filter((x) => !fab || x.ficha.fabricante === fab);
  const escolher = (id: string) => { const f = todas.find((x) => x.ficha.id === id)?.ficha; if (f) onChange({ tipo: 'vigotas', ficha: id, serie: f.series[0].id }); };
  const trocaTipo = (v: TipoLaje['tipo']) => onChange(v === 'macica' ? { tipo: 'macica', h: 0.1 } : v === 'trelicada' ? { tipo: 'trelicada', modelo: 'H12', capa: TRELICADAS.H12.capa } : v === 'vigotas' ? { tipo: 'vigotas', ficha: 'cat:trelicadas', serie: 'H12' } : v === 'nervurada' ? { tipo: 'nervurada', forma: formasDisponiveis(b)[0]?.id ?? 'cat:rec-60-30', hTotal: 0.35, capa: 0.05 } : { tipo: 'moldada', capa: 0.05, intereixo: 0.6, bw: 0.12, h: 0.25, enchimento: 'eps' });
  return (
    <div className="row wrap">
      <Select label="Tipo" value={tipo.tipo} options={[{ v: 'macica', label: 'Maciça' }, { v: 'trelicada', label: 'Treliçada (EPS)' }, { v: 'vigotas', label: 'Vigotas por ficha' }, { v: 'moldada', label: 'Nervurada moldada no local' }, { v: 'nervurada', label: 'Nervurada bidirecional' }, { v: 'alveolar', label: 'Alveolar' }]} onChange={(v) => (v === 'alveolar' ? onChange(tipoAlveolarInicial(b)) : trocaTipo(v))} />
      {tipo.tipo === 'macica'
        ? <NumField label="h" unit="cm" width={80} value={+(tipo.h * 100).toFixed(1)} onChange={(v) => v >= 7 && onChange({ tipo: 'macica', h: v / 100 })} />
        : tipo.tipo === 'vigotas' ? <>
          <Select label="Fabricante (filtro)" value={fab} options={[{ v: '', label: 'todos' }, ...fabricantes.map((f) => ({ v: f, label: f }))]} onChange={setFab} />
          <Select label="Ficha da laje" value={tipo.ficha} options={fichas.map((x) => ({ v: x.ficha.id, label: x.ficha.nome }))} onChange={escolher} />
          <Select label="Série da laje" value={tipo.serie} options={(todas.find((x) => x.ficha.id === tipo.ficha)?.ficha.series ?? []).map((s) => ({ v: s.id, label: `${s.id} · h ${Math.round(s.altura * 100)} · i ${Math.round(s.intereixo * 100)}${s.tipo ? ` · ${s.tipo}` : ''}` }))} onChange={(v) => onChange({ ...tipo, serie: v })} />
        </>
        : tipo.tipo === 'moldada' ? <>
          <NumField label="Capa da moldada" unit="cm" width={80} value={+(tipo.capa * 100).toFixed(1)} onChange={(v) => v >= 3 && onChange({ ...tipo, capa: v / 100 })} />
          <NumField label="Intereixo da moldada" unit="cm" width={80} value={+(tipo.intereixo * 100).toFixed(1)} onChange={(v) => v > 0 && onChange({ ...tipo, intereixo: v / 100 })} />
          <NumField label="Largura da nervura da moldada" unit="cm" width={80} value={+(tipo.bw * 100).toFixed(1)} onChange={(v) => v > 0 && onChange({ ...tipo, bw: v / 100 })} />
          <NumField label="Altura total da moldada" unit="cm" width={80} value={+(tipo.h * 100).toFixed(1)} onChange={(v) => v > 0 && onChange({ ...tipo, h: v / 100 })} />
          <Select label="Enchimento da moldada" value={tipo.enchimento} options={enchimentosDisponiveis(b).map((e) => ({ v: e.id, label: e.nome }))} onChange={(v) => onChange({ ...tipo, enchimento: v })} />
        </>
        : tipo.tipo === 'nervurada' ? <>
          <Select label="Forma da nervurada" value={tipo.forma} options={formasDisponiveis(b).map((f) => ({ v: f.id, label: f.nome }))} onChange={(v) => onChange({ ...tipo, forma: v })} />
          <NumField label="Altura total da nervurada" unit="cm" width={80} value={+(tipo.hTotal * 100).toFixed(1)} onChange={(v) => v > 0 && onChange({ ...tipo, hTotal: v / 100 })} />
          <NumField label="Mesa da nervurada" unit="cm" width={80} value={+(tipo.capa * 100).toFixed(1)} onChange={(v) => v >= 3 && onChange({ ...tipo, capa: v / 100 })} />
          <Hint>{(() => { const g = geometriaBidirecional(b, tipo); return `Zona aliviada: peso ${fmt(g.pp)} kN/m², concreto ${fmt(g.volume, 3)} m³/m², cubeta de ${Math.round(g.forma.altura * 100)} cm (${g.recuperavel ? 'forma recuperável' : 'forma perdida'}).`; })()}</Hint>
        </>
        : tipo.tipo === 'alveolar' ? <AlveolarCampos b={b} tipo={tipo} onChange={onChange} />
        : tipo.tipo !== 'trelicada' ? <Hint>Laje de vigotas por ficha ou nervurada moldada: edite o tipo no grupo “Tipos de laje”.</Hint>
        : <>
          <Select label="Enchimento" value={tipo.modelo} options={Object.keys(TRELICADAS).map((k) => ({ v: k, label: k }))} onChange={(v) => onChange({ tipo: 'trelicada', modelo: v, capa: TRELICADAS[v].capa })} />
          <NumField label="Capa" unit="cm" width={80} value={+(tipo.capa * 100).toFixed(1)} onChange={(v) => v >= 3 && onChange({ ...tipo, capa: v / 100 })} />
        </>}
    </div>
  );
}

function LajesGrupo({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const pl = usePlanta();
  const grupo = grupoAtual(b, pl.pavimento);
  const ls = b.lajes.filter((l) => l.grupo === grupo?.id);
  const sel = ls.filter((l) => pl.selecao.has(l.id)).map((l) => l.id);
  const pp = propriedadesLaje(pl.tipoLaje, b);
  return (
    <Group title={`Lajes — ${grupo?.nome ?? '—'} (${ls.length})`} open={false}>
      <TipoLajeCampos b={b} tipo={pl.tipoLaje} onChange={(t) => pl.set({ tipoLaje: t })} />
      <Hint>{pp.descricao}: altura {fmt(pp.h)} m, peso próprio {fmt(pp.pp)} kN/m²{pl.tipoLaje.tipo === 'trelicada' ? ' (catálogo a confirmar com o fabricante)' : ''}.</Hint>
      <div className="row wrap">
        <Button variant={pl.ferramenta === 'laje' ? 'primary' : 'default'} onClick={() => pl.set({ ferramenta: 'laje' })}>Lançar lajes (L)</Button>
        <Button disabled={!grupo} onClick={() => grupo && exec('laje.detectarPanos', { grupo: grupo.id, tipo: pl.tipoLaje })}>Preencher todos os panos</Button>
        <Button disabled={!ls.length || !grupo} onClick={() => grupo && exec('laje.renumerar', { grupo: grupo.id })}>Renumerar</Button>
        {sel.length > 0 && <Button onClick={() => exec('laje.atribuir', { ids: sel, tipo: pl.tipoLaje })}>Aplicar às {sel.length} selecionada(s)</Button>}
      </div>
      {ls.length > 0 && (
        <table className="data loads-ed quadro">
          <thead><tr><th>Laje</th><th>Tipo</th><th>Área (m²)</th><th>Vãos (m)</th><th>Dir. (°)</th></tr></thead>
          <tbody>
            {ls.map((l) => {
              const [v1, v2] = vaos(l);
              return (
                <tr key={l.id} className={pl.selecao.has(l.id) ? 'on' : ''} onClick={() => pl.set({ selecao: new Set([l.id]) })}>
                  <td><TextCell value={l.nome} label={`Nome de ${l.nome}`} onCommit={(t) => exec('laje.editar', { id: l.id, nome: t })} /></td>
                  <td className="tl small">{propriedadesLaje(l.tipo, b).descricao}</td>
                  <td className="num">{fmt(areaLaje(l))}</td>
                  <td className="num">{fmt(v1)} × {fmt(v2)}</td>
                  <td>{ehNervurada(l.tipo) || l.tipo.tipo === 'nervurada' ? <TextCell value={fmt(l.direcao ?? 0, 0)} num label={`Direção de ${l.nome}`} onCommit={(t) => { const a = num(t); if (Number.isFinite(a)) exec('laje.editar', { id: l.id, direcao: a }); }} /> : <span className="muted">—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <Hint>Contorno pelo eixo das vigas. Treliçada: vigotas no menor vão (seta na planta); fora de região fechada por vigas é erro.</Hint>
    </Group>
  );
}

function CargasGrupo({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const pl = usePlanta();
  const grupo = grupoAtual(b, pl.pavimento);
  const cs = b.cargas.filter((c) => c.grupo === grupo?.id);
  const camadas = [...new Set(b.mascaras.filter((m) => !!grupo && mascaraNoGrupo(m, grupo.id)).flatMap((m) => m.camadas.map((c) => c.nome)))];
  const [camada, setCamada] = useState('');
  const [bloco, setBloco] = useState('ceramico');
  const cam = camadas.includes(camada) ? camada : (camadas.find((c) => /alv|par|wall/i.test(c)) ?? camadas[0] ?? '');
  const H = grupo ? alturaAlvenaria(b, grupo.id) : 0;
  const nPar = grupo && cam ? paredesDaMascara(b, grupo.id, cam).length : 0;
  const unid = pl.tipoCarga === 'ponto' ? 'kN' : pl.tipoCarga === 'linha' ? 'kN/m' : 'kN/m²';
  return (
    <Group title={`Cargas — ${grupo?.nome ?? '—'} (${cs.length})`} open={false}>
      {grupo && <Hint>Em toda a planta: revestimento {fmt(grupo.gRev)} kN/m² (G) e uso {fmt(grupo.q)} kN/m² (Q), além do peso próprio — edite em Grupos.</Hint>}
      <div className="row wrap">
        <Select label="Tipo" value={pl.tipoCarga} options={[{ v: 'ponto', label: 'Ponto' }, { v: 'linha', label: 'Linha' }, { v: 'area', label: 'Área' }]} onChange={(v) => pl.set({ tipoCarga: v })} />
        <Select label="Caso" value={pl.caso} options={casosParaCarga(b).map((c) => ({ v: c.id, label: c.id === 'G' ? 'G (permanente)' : c.id === 'Q' ? 'Q (variável)' : `${c.nome} (${c.natureza})` }))} onChange={(v) => pl.set({ caso: v })} />
        <NumField label="Valor" unit={unid} width={110} value={pl.valorCarga} onChange={(v) => pl.set({ valorCarga: v })} />
      </div>
      <div className="row"><Button variant={pl.ferramenta === 'carga' ? 'primary' : 'default'} onClick={() => pl.set({ ferramenta: 'carga' })}>Lançar cargas (C)</Button></div>
      {pl.pavimento === 'fundacao' && <Hint>Planta de fundação aberta: as cargas lançadas vão para o grupo “fundação” (sobre as vigas e os elementos de fundação; ver o grupo Fundação).</Hint>}
      <div className="masc">
        <b>Alvenaria a partir da máscara</b>
        {camadas.length ? (
          <>
            <div className="row wrap">
              <Select label="Camada das paredes" value={cam} options={camadas.map((c) => ({ v: c, label: c }))} onChange={setCamada} />
              <Select label="Bloco" value={bloco} options={Object.entries(BLOCOS).map(([k, v]) => ({ v: k, label: `${v.rotulo} (${v.gama} kN/m³)` }))} onChange={setBloco} />
            </div>
            <div className="row wrap">
              <Button disabled={!nPar} onClick={() => grupo && exec('carga.alvenariaDaMascara', { grupo: grupo.id, camada: cam, bloco })}>Gerar {nPar} trecho(s) de parede</Button>
            </div>
            <Hint>Paredes = pares de linhas paralelas a 5–35 cm. Peso = γ × espessura × altura ({fmt(H)} m: até o pavimento de cima menos a viga). Gerar de novo substitui as anteriores da camada.</Hint>
          </>
        ) : <Hint>Importe a máscara do grupo para gerar as cargas de alvenaria.</Hint>}
      </div>
    </Group>
  );
}

const TIPO_COMB = { ELU: 'ELU', QP: 'ELS quase perm.', FREQ: 'ELS freq.', RARA: 'Rara' } as const;

/** Quadro recolhível com as combinações da última análise (casos como colunas) e exportação em CSV. */
function CombinacoesCard({ b }: { b: BuildingModel }) {
  const { analise } = useBuilding();
  const combs = analise ? combinacoesEdificio(b, analise) : [];
  const nomes = new Map(casosDaObra(b).map((c) => [c.id, c.nome]));
  const usados = [...new Set(combs.flatMap((c) => Object.keys(c.fatores)))];
  const rot = (k: string) => nomes.get(k) ?? k;
  const f = (v: number | undefined) => (v === undefined ? '' : String(+v.toFixed(4)).replace('.', ','));
  const csv = () => {
    const lin = [['Combinação', 'Tipo', ...usados.map(rot)], ...combs.map((c) => [c.nome, TIPO_COMB[c.tipo], ...usados.map((k) => f(c.fatores[k]))])];
    return '\ufeff' + lin.map((l) => l.map((x) => (/[;"\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x)).join(';')).join('\r\n') + '\r\n';
  };
  return (
    <div className="card">
      <details className="small">
        <summary>Combinações ({combs.length})</summary>
        <div className="row wrap"><Button onClick={() => download('combinacoes-edificio.csv', csv(), 'text/csv')}>Exportar CSV</Button></div>
        <div className="tablewrap">
          <table className="data quadro">
            <thead><tr><th>Combinação</th><th>Tipo</th>{usados.map((k) => <th key={k}>{rot(k)}</th>)}</tr></thead>
            <tbody>{combs.map((c, i) => <tr key={i}><td className="tl">{c.nome}</td><td className="tl">{TIPO_COMB[c.tipo]}</td>{usados.map((k) => <td key={k} className="num">{f(c.fatores[k])}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <Hint>Fatores por caso, incluindo as combinações excepcionais e as raras da fundação. Vento das ELU já ampliado por 0,95·γz quando aplicável.</Hint>
      </details>
    </div>
  );
}

function Analise({ b, nErr }: { b: BuildingModel; nErr: number }) {
  const { analise, revAnalise, calculando, calcular, sessao, exec } = useBuilding();
  const r = analise ? resumoAnalise(b, analise) : null;
  const velha = analise && revAnalise !== sessao.revCalculo;
  const integradoEmUso = (analise?.opcoes.modeloGlobal ?? 1) === 1;
  return (
    <>
      <div className="card">
        <h3>Análise do edifício</h3>
        <div className="row wrap">
          <Button variant="primary" disabled={calculando} onClick={() => calcular()}>{calculando ? 'Calculando…' : 'Calcular'}</Button>
          {nErr > 0 && <span className="hint bad">Há {nErr} erro(s) de lançamento: o resultado pode não ter sentido.</span>}
          {velha && <span className="hint bad">O modelo mudou depois do cálculo: calcule de novo.</span>}
        </div>
        <Hint>Casos G, Q e 12 de vento (4 direções × centrado/±e); γz com rigidez reduzida (vigas 0,4·Eci·Ic, pilares 0,8·Eci·Ic{integradoEmUso ? ', lajes 0,3·Eci·Ic' : ''}). {integradoEmUso
          ? <>Modelo integrado: a grelha de lajes e vigas de cada pavimento (malha {fmt(analise?.opcoes.malha ?? 0.25)} m, torção das lajes {Math.round((analise?.opcoes.torcaoLaje ?? 0.15) * 100)} % de 2I, das vigas {Math.round((analise?.opcoes.torcaoViga ?? 0.15) * 100)} %{analise?.opcoes.cortanteBarrasLaje ? ', barras de laje de Timoshenko' : ''}) entra no pórtico espacial como superelemento (condensação estática exata nos nós dos pilares) e tudo é resolvido junto, com diafragma rígido, trechos rígidos até a face − 0,3h e área dos pilares × {analise?.opcoes.axialPilares ?? 2} nas ações verticais.</>
          : <>Modelo separado: grelha de lajes e vigas por pavimento (malha {fmt(analise?.opcoes.malha ?? 0.25)} m, torção das lajes {Math.round((analise?.opcoes.torcaoLaje ?? 0.15) * 100)} % de 2I, das vigas {Math.round((analise?.opcoes.torcaoViga ?? 0.15) * 100)} %) e pórtico espacial com diafragma rígido, trechos rígidos até a face − 0,3h e área dos pilares × {analise?.opcoes.axialPilares ?? 2} nas ações verticais.</>}</Hint>
        {r && !r.erro && (
          <p className="small" data-modelo={integradoEmUso ? 'integrado' : 'separado'}>Modelo {integradoEmUso ? `integrado (${analise!.grelhas.filter((g) => g.integrado).length} pavimento(s) condensados no pórtico)` : 'separado (grelhas + pórtico)'} · {r.gdl} gdl em {r.ms} ms · cargas G {fmt(r.totais.G, 1)} kN, Q {fmt(r.totais.Q, 1)} kN · equilíbrio (reações − cargas): G {fmt(r.equilibrio.G, 3)}, Q {fmt(r.equilibrio.Q, 3)} kN</p>
        )}
        {r?.erro && <p className="hint bad">{r.erro}</p>}
        {r && r.avisos.length > 0 && <ul className="prem">{r.avisos.map((a, i) => <li key={i}>{a}</li>)}</ul>}
      </div>
      <div className="card" data-card-2ordem>
        <h3>2ª ordem global</h3>
        <div className="row wrap">
          <Check label="P-Δ no pórtico 3D (no lugar do γz)" checked={(b.opcoes?.segundaOrdem ?? 0) === 1} onChange={(c) => exec('opcoes.definir', { valores: { segundaOrdem: c ? 1 : 0 } })} />
        </div>
        {analise && !analise.erro && !velha ? <SegundaOrdemAnalise an={analise} /> : <Hint>Rigidez reduzida da NBR 6118, 15.7.3; com o P-Δ, cada combinação ELU é resolvida com a matriz geométrica dos pilares e os efeitos de 2ª ordem entram no dimensionamento sem a ampliação 0,95·γz. Calcule para ver os resultados.</Hint>}
      </div>
      {r && !r.erro && (
        <>
          {r.vento && (
            <div className="card">
              <h3>Vento e estabilidade global</h3>
              <p className="small">Classe {r.vento.classe} (altura {fmt(r.vento.altura, 1)} m) · {r.combinacoes} combinações</p>
              <table className="data quadro">
                <thead><tr><th>Direção</th><th>γz</th><th>vento principal</th><th>uso principal</th><th>vento nas ELU ×</th></tr></thead>
                <tbody>{r.vento.gamaZ.map((g) => <tr key={g.direcao} className={g.gamaZ > 1.3 ? 'bad' : ''}><td className="tl">{g.direcao}°</td><td className="num">{fmt(g.gamaZ, 3)}</td><td className="num">{fmt(g.ventoPrincipal, 3)}</td><td className="num">{fmt(g.usoPrincipal, 3)}</td><td className="num">{fmt(g.ampliacaoVento, 3)}</td></tr>)}</tbody>
              </table>
              {r.zonas.some((z) => z.zonas > 1) && (
                <>
                  <table className="data quadro">
                    <thead><tr><th>Pavimento</th><th>Zonas independentes</th><th>Com diafragma</th><th>Pilares soltos</th></tr></thead>
                    <tbody>{r.zonas.filter((z) => z.zonas > 1).map((z) => <tr key={z.pavimento}><td className="tl">{z.pavimento}</td><td className="num">{z.zonas}</td><td className="num">{z.diafragmas}</td><td className="num">{z.pilaresSoltos}</td></tr>)}</tbody>
                  </table>
                  <Hint>Cada zona ligada por vigas é um diafragma próprio; o vento do pavimento é repartido entre as zonas pela largura (Bi = bi/Σb·B). Pilar isolado fica sem diafragma.</Hint>
                </>
              )}
              {r.vento.forcas.map((c) => (
                <details key={c.caso} className="small"><summary>Forças {c.caso} por pavimento{r.vento!.forcas.some((x) => x.pavimentos.some((f) => f.zona > 0)) ? ' e zona' : ''}</summary>
                  <table className="data quadro">
                    <thead><tr><th>Pavimento</th><th>Zona</th><th>z (m)</th><th>Largura (m)</th><th>Vk (m/s)</th><th>F (kN)</th></tr></thead>
                    <tbody>{c.pavimentos.map((f, i) => <tr key={`${f.pavimento}-${f.zona}-${i}`}><td className="tl">{f.pavimento}</td><td className="num">{f.zona + 1}</td><td className="num">{fmt(f.z)}</td><td className="num">{fmt(f.largura)}</td><td className="num">{fmt(f.vk)}</td><td className="num">{fmt(f.F)}</td></tr>)}</tbody>
                  </table>
                </details>
              ))}
              {analise && <Deslocamentos b={b} analise={analise} />}
            </div>
          )}
          <div className="card">
            <h3>Cargas na fundação (kN e kN·m)</h3>
            <table className="data quadro">
              <thead><tr><th>Pilar</th><th>N G</th><th>N Q</th><th>N vento (máx.)</th><th>N rara máx.</th><th>Nd máx.</th><th>Nd mín.</th><th>Mx G</th><th>My G</th></tr></thead>
              <tbody>
                {r.fundacao.map((f) => (
                  <tr key={f.pilar}><td className="tl">{f.pilar}</td><td className="num">{fmt(f.NG, 1)}</td><td className="num">{fmt(f.NQ, 1)}</td><td className="num">{fmt(f.NW, 1)}</td><td className="num">{fmt(f.NraraMax, 1)}</td><td className="num">{fmt(f.NdMax, 1)}</td><td className="num">{fmt(f.NdMin, 1)}</td><td className="num">{fmt(f.MxG, 2)}</td><td className="num">{fmt(f.MyG, 2)}</td></tr>
                ))}
              </tbody>
            </table>
            <Hint>Rara: verificação geotécnica (G + principal + ψ1 das demais). Nd: envoltória das ELU, para o elemento de fundação.</Hint>
          </div>
          <div className="card">
            <h3>Lajes por pavimento (flecha elástica imediata, sem fissuração nem fluência)</h3>
            <table className="data quadro">
              <thead><tr><th>Pavimento</th><th>Carga G (kN)</th><th>Carga Q (kN)</th><th>Flecha G (mm)</th><th>Flecha Q (mm)</th></tr></thead>
              <tbody>{r.flechasElasticas.map((f) => <tr key={f.pavimento}><td className="tl">{f.pavimento}</td><td className="num">{fmt(f.cargaG, 1)}</td><td className="num">{fmt(f.cargaQ, 1)}</td><td className="num">{fmt(f.flechaG_mm, 2)}</td><td className="num">{fmt(f.flechaQ_mm, 2)}</td></tr>)}</tbody>
            </table>
          </div>
        </>
      )}
      {analise && !analise.erro && <CombinacoesCard b={b} />}
    </>
  );
}

const ST_TXT = { ok: 'ok', fail: 'não atende', review: 'revisar' } as const;

function DimensionamentoAba({ onIr, onMemorial }: { onIr: (tipo: 'viga' | 'pilar' | 'laje' | 'fundacao' | 'pilarParede' | 'parede', id: string, pavimento?: string) => void; onMemorial: () => void }) {
  const st = useBuilding();
  const { dim, analise, sessao, calculando, calcular } = st;
  const [so, setSo] = useState(false);
  const [selBloq, setSelBloq] = useState(false);
  const velha = analise && !calculoAtual(st);
  const desatualizado = !!dim && !dimAtual(st);
  const filtro = <T extends { status: string }>(xs: T[]) => (so ? xs.filter((x) => x.status !== 'ok') : xs);
  const conta = (xs: { status: string }[]) => `${xs.filter((x) => x.status === 'ok').length}/${xs.length} ok`;
  const cls = (st: string) => (st === 'fail' ? 'bad' : st === 'review' ? 'warn' : '');
  const totQ = dim?.quantitativos.reduce((t, q) => ({ c: t.c + q.concreto.lajes + q.concreto.vigas + q.concreto.pilares, f: t.f + q.forma.lajes + q.forma.vigas + q.forma.pilares, a: t.a + q.aco }), { c: 0, f: 0, a: 0 });
  return (
    <>
      <div className="card">
        <h3>Dimensionamento (NBR 6118)</h3>
        <div className="row wrap">
          <Button variant="primary" disabled={calculando} onClick={() => calcular()}>{calculando ? 'Calculando…' : dim ? 'Recalcular' : 'Calcular e dimensionar'}</Button>
          {!!sessao.modelo.fundacao?.elementos.length && <Button disabled={calculando} title="Analisa e dimensiona a estrutura sem calcular as fundações lançadas" onClick={() => calcular(true)}>Calcular sem fundação</Button>}
          <Button disabled={!dim?.fundacao.length} onClick={() => { importarCargasDoEdificio(dim!.fundacao); useStore.getState().set({ module: 'fundacoes' }); }}>Enviar cargas ao módulo Fundações</Button>
          <Button onClick={onMemorial}>Memorial do edifício</Button>
          {dim && <BotaoExportar dim={dim} />}
          <label className="check small"><Input type="checkbox" checked={so} onChange={(e) => setSo(e.target.checked)} /> <span>só o que não atende</span></label>
        </div>
        {velha && <p className="hint bad">O modelo mudou depois do cálculo: recalcule{dim && podeRearm(st) ? ' ou rearme os elementos alterados (esforços guardados)' : ''}.</p>}
        {!velha && desatualizado && <p className="hint bad" data-dim-velho>O detalhamento mudou depois do dimensionamento: rearme.</p>}
        {!dim && <Hint>{analise?.erro ? `A análise falhou: ${analise.erro}` : 'Calcule para dimensionar vigas, pilares e lajes com a envoltória das combinações ELU.'}</Hint>}
        {dim && <p className="small">Vigas {conta(dim.vigas)} · pilares {conta(dim.pilares)} · lajes {conta(dim.lajes)} · {dim.combinacoes} combinações · {Math.round(dim.ms)} ms. Clique numa linha para ver o elemento na planta; duplo clique abre os resultados do elemento.</p>}
      </div>
      {dim && <div className="card"><RearmarCard /></div>}
      {dim && <CartaoRelatorios />}
      {dim?.pilaresParede?.length ? <CartaoPilaresParede onIr={(id) => onIr('pilarParede', id)} /> : null}
      {dim?.paredes?.length ? <CartaoParedes onIr={(id) => onIr('parede', id)} /> : null}
      {dim?.alvenaria ? <CartaoAlvenaria /> : null}
      <ListaErros onIr={onIr} />
      {dim && <div className="card"><BloqueioLote dim={dim} velha={!!velha} /><div className="row wrap"><Button data-abrir-selecao-bloqueio onClick={() => setSelBloq(true)}>Seleção para bloqueio…</Button></div></div>}
      {selBloq && <SelecaoBloqueio onClose={() => setSelBloq(false)} />}
      {dim && <AgrupamentosCard />}
      {dim && <CopiaLajesCard />}
      {dim && (
        <>
          <div className="card">
            <h3>Vigas</h3>
            <table className="data quadro">
              <thead><tr><th>Viga</th><th>b×h</th><th>M+ (kN·m)</th><th>M− (kN·m)</th><th>V (kN)</th><th>As inf (cm²)</th><th>Inferior</th><th>Superior</th><th>Estribo</th><th>Td (kN·m)</th><th>δ</th><th>wk inf / sup / lim. (mm)</th><th>Flecha / lim. (mm)</th><th>Laterais (torção)</th><th>aℓ (cm)</th><th>Bloq.</th><th>Situação</th></tr></thead>
              <tbody>{filtro(dim.vigas).map((x) => (
                <LinhaElemento key={x.viga} className={`click ${cls(x.status)}`} title={x.mensagens.join(' ')} ir={() => onIr('viga', x.viga)} abrir={() => abrirJanela({ tipo: 'viga', id: x.viga })}>
                  <td className="tl">{x.nome}</td><td>{Math.round(x.b * 100)}×{Math.round(x.h * 100)}</td><td className="num">{fmt(x.Mpos, 1)}</td><td className="num">{fmt(x.Mneg, 1)}</td><td className="num">{fmt(x.V, 1)}</td><td className="num">{fmt(x.AsInf * 1e4)}</td><td>{x.barrasInf}</td><td>{x.barrasSup}</td><td>{x.estribo}</td><td className="num">{fmt(x.T, 1)}</td><td className="num">{x.delta < 1 ? fmt(x.delta, 2) : '—'}</td><td className={`num ${Math.max(x.wk[0], x.wk[1]) > x.wkLim + 1e-9 ? 'bad' : ''}`}>{fmt(x.wk[0], 2)} / {fmt(x.wk[1], 2)} / {fmt(x.wkLim, 2)}</td><td className={`num ${x.flecha > x.limite + 1e-9 ? 'bad' : ''}`}>{fmt(x.flecha * 1000, 1)} / {fmt(x.limite * 1000, 1)}</td><td>{x.barrasLaterais}</td><td className="num">{fmt(x.al * 100, 1)}</td><td data-bloq>{sessao.modelo.vigas.find((v) => v.id === x.viga)?.armadura ? 'bloq.' : x.agrupada ? `agrup. ${x.agrupada}` : x.bloqueada ? 'bloq.' : ''}</td><td>{ST_TXT[x.status]}</td>
                </LinhaElemento>))}</tbody>
            </table>
            <Hint>Td = torção de cálculo máxima (A90/s somada ao cortante nos estribos; Asl repartida: faces horizontais somadas à flexão, laterais em barras próprias); aℓ = decalagem do diagrama (17.4.2.2), para o corte das barras; δ = redistribuição aplicada aos negativos (— sem redistribuição); wk = abertura de fissuras na combinação frequente (face inferior / superior), limite pela CAA ou o das opções. Flecha total por vão entre pilares (quase permanente, Branson por seção, × (1 + αf)); em balanço, o limite é 2ℓ/…. A flecha da carga variável (ℓ/350) é verificada e aparece nas mensagens da linha.</Hint>
          </div>
          <div className="card">
            <h3>Pilares (por lance)</h3>
            <table className="data quadro">
              <thead><tr><th>Pilar</th><th>Lance</th><th>Seção</th><th>Nd (kN)</th><th>ℓe b / h (m)</th><th>λ b / h</th><th>Armadura</th><th>As (cm²)</th><th>Estribo</th><th>Vd (kN)</th><th>Uso</th><th>Bloq.</th><th>Situação</th></tr></thead>
              <tbody>{filtro(dim.pilares).map((x) => (
                <LinhaElemento key={`${x.pilar}-${x.pavimento}`} className={`click ${cls(x.status)}`} title={x.mensagens.join(' ')} ir={() => onIr('pilar', x.pilar, x.pavimento)} abrir={() => abrirJanela({ tipo: 'pilar', id: x.pilar, pavimento: x.pavimento })}>
                  <td className="tl">{x.nome}</td><td className="tl">{x.pavimento}</td><td>{x.secao}</td><td className="num">{fmt(x.Nd, 0)}</td><td className="num">{fmt(x.le[0])} / {fmt(x.le[1])}</td><td className="num">{fmt(x.lambda[0], 0)} / {fmt(x.lambda[1], 0)}</td><td>{x.armadura}</td><td className="num">{fmt(x.As * 1e4)}</td><td>{x.estribo}</td><td className="num">{x.Vd === undefined ? '—' : fmt(x.Vd, 1)}</td><td className="num">{x.util >= 99 ? '> 1' : fmt(x.util)}</td><td data-bloq>{x.bloqueada ? 'bloq.' : ''}</td><td>{ST_TXT[x.status]}</td>
                </LinhaElemento>))}</tbody>
            </table>
            <Hint>Uso = maior relação solicitação/resistência por fibras (flexão oblíqua) nas combinações determinantes.</Hint>
          </div>
          <div className="card">
            <h3>Lajes</h3>
            <table className="data quadro">
              <thead><tr><th>Laje</th><th>Pavimento</th><th>Tipo</th><th>md+ (kN·m/m)</th><th>md− (kN·m/m)</th><th>As+ (cm²/m)</th><th>As− (cm²/m)</th><th>wk / lim. (mm)</th><th>Flecha / lim. (mm)</th><th>Flecha Q / lim. (mm)</th><th>Situação</th></tr></thead>
              <tbody>{filtro(dim.lajes).map((x) => (
                <LinhaElemento key={`${x.laje}-${x.pavimento}`} className={`click ${cls(x.status)}`} title={x.mensagens.join(' ')} ir={() => onIr('laje', x.laje, x.pavimento)} abrir={() => abrirJanela({ tipo: 'laje', id: x.laje, pavimento: x.pavimento })}>
                  <td className="tl">{x.nome}</td><td className="tl">{x.pavimento}</td><td className="tl">{x.tipo}</td><td className="num">{fmt(x.mPos[0], 1)} / {fmt(x.mPos[1], 1)}</td><td className="num">{fmt(x.mNeg[0], 1)} / {fmt(x.mNeg[1], 1)}</td><td className="num">{fmt(x.As.pos[0])} / {fmt(x.As.pos[1])}</td><td className="num">{fmt(x.As.neg[0])} / {fmt(x.As.neg[1])}</td><td className={`num ${x.wk > x.wkLim + 1e-9 ? 'bad' : ''}`}>{fmt(x.wk, 2)} / {fmt(x.wkLim, 2)}</td><td className={`num ${x.flecha > x.limite + 1e-9 ? 'bad' : ''}`}>{fmt(x.flecha * 1000, 1)} / {fmt(x.limite * 1000, 1)}</td><td className={`num ${x.flechaQ > x.limiteQ + 1e-9 ? 'bad' : ''}`}>{fmt(x.flechaQ * 1000, 1)} / {fmt(x.limiteQ * 1000, 1)}</td><td>{ST_TXT[x.status]}</td>
                </LinhaElemento>))}</tbody>
            </table>
            <Hint>Duas direções da malha (x / y). Flecha total relativa aos apoios: elástica (G + ψ2·Q) × (1 + αf), sem fissuração; Q = flecha imediata só das cargas variáveis (limite sensorial ℓ/350). Limites editáveis nas opções de cálculo.</Hint>
          </div>
          {!!dim.fogo && <FogoCard onIr={onIr} />}
          {!!dim.puncao?.length && (
            <div className="card" data-card-puncao>
              <h3>Punção das lajes</h3>
              <table className="data quadro">
                <thead><tr><th>Pilar</th><th>Pavimento</th><th>Apoio</th><th>FSd (kN)</th><th>MSd u / v (kN·m)</th><th>τSd C / τRd2 (MPa)</th><th>τSd C′ / τRd1 (MPa)</th><th>Armadura de punção</th><th>Situação</th></tr></thead>
                <tbody>{filtro(dim.puncao).map((x) => (
                  <LinhaElemento key={x.id} className={`click ${x.status === 'fail' ? 'bad' : x.status === 'armadura' ? 'warn' : ''}`} title={x.mensagens.join(' ')} ir={() => onIr('laje', x.laje, x.pavimento)} abrir={() => abrirJanela({ tipo: 'laje', id: x.laje, pavimento: x.pavimento })}>
                    <td className="tl">{x.nome}</td><td className="tl">{x.pavimento}</td><td className="tl">{x.tipo}{x.origem === 'viga' ? ' (viga chata)' : ''}</td><td className="num">{fmt(x.F, 0)}</td><td className="num">{fmt(x.M[0], 1)} / {fmt(x.M[1], 1)}</td>
                    <td className="num">{fmt(x.contornos[0].tau, 2)} / {fmt(x.tauRd2, 2)}</td><td className="num">{fmt(x.contornos[1].tau, 2)} / {fmt(x.tauRd1, 2)}</td>
                    <td className="tl small">{x.armadura ? `${x.armadura.linhas} × ${x.armadura.barras} φ${String(x.armadura.phi).replace('.', ',')}${x.manual.length ? ' + informada' : ''}` : x.manual.length ? 'informada' : '—'}</td><td>{x.status === 'ok' ? 'ok' : x.status === 'armadura' ? 'com armadura' : 'não atende'}</td>
                  </LinhaElemento>))}</tbody>
              </table>
              <Hint>Pilares que apoiam a laje maciça sem viga e vigas chatas largas (NBR 6118, 19.5): contornos C, C′ e C″, armadura de punção em linhas radiais e cortante em torno do pilar. Duplo clique abre a aba “Punção e cortante” da laje.</Hint>
            </div>
          )}
          {!!dim.fundacoes?.length && (
            <div className="card" data-card-fundacoes>
              <h3>Fundações</h3>
              <table className="data quadro">
                <thead><tr><th>Elemento</th><th>Tipo</th><th>Pilar</th><th>Posição</th><th>Resultado</th><th>Volume (m³)</th><th>Situação</th></tr></thead>
                <tbody>{filtro(dim.fundacoes).map((x) => (
                  <LinhaElemento key={x.id} className={`click ${cls(x.status)}`} title={x.mensagens.join(' ')} ir={() => onIr('fundacao', x.id)} abrir={() => abrirJanela({ tipo: 'fundacao', id: x.id })}>
                    <td className="tl">{x.nome}</td><td className="tl">{TIPO_FUNDACAO_LABEL[x.tipo]}</td><td className="tl">{x.pilares.join(', ')}</td><td className="tl">{POSICAO_LABEL[x.posicao]}</td>
                    <td className="tl small">{x.resumo}</td><td className="num">{fmt(x.volume)}</td><td>{x.status === 'ok' ? 'ok' : 'não atende'}</td>
                  </LinhaElemento>))}</tbody>
              </table>
              <Hint>Fundações calculadas pelo módulo Fundações com as reações da análise (raras para o solo, ELU para o elemento). Duplo clique abre os desenhos e as verificações.</Hint>
            </div>
          )}
          {!!dim.vigasFundacao?.length && (
            <div className="card" data-card-vigas-fundacao>
              <h3>Vigas de fundação</h3>
              <table className="data quadro">
                <thead><tr><th>Viga</th><th>Tipo</th><th>Pontas</th><th>Seção (cm)</th><th>Alívio (kN)</th><th>Md sup. / inf. (kN·m)</th><th>Vd (kN)</th><th>Situação</th></tr></thead>
                <tbody>{filtro(dim.vigasFundacao).map((x) => (
                  <LinhaElemento key={x.id} className={`click ${cls(x.status)}`} title={x.mensagens.join(' ')} ir={() => onIr('fundacao', x.id)} abrir={() => abrirJanela({ tipo: 'fundacao', id: x.id })}>
                    <td className="tl">{x.nome}</td><td className="tl">{x.tipo === 'equilibrio' ? 'equilíbrio' : 'travamento'}</td><td className="tl">{x.ini} — {x.fim}</td>
                    <td className="num">{Math.round(x.bAdot * 100)}×{Math.round(x.hAdot * 100)}</td><td className="num">{fmt(x.alivio.ini + x.alivio.fim, 1)}</td>
                    <td className="num">{fmt(x.Md.sup, 1)} / {fmt(x.Md.inf, 1)}</td><td className="num">{fmt(x.Vd, 1)}</td><td>{x.status === 'ok' ? 'ok' : 'não atende'}</td>
                  </LinhaElemento>))}</tbody>
              </table>
              {dim.avisosFundacao?.map((m, i) => <Note key={i}>{m}</Note>)}
              <Hint>Vigas de equilíbrio (alavanca) e de travamento entre elementos do nível de fundação. Duplo clique abre o detalhe longitudinal e transversal.</Hint>
            </div>
          )}
          {!!(dim.radiers?.length || dim.vigasElasticas?.length) && (
            <div className="card" data-card-base-elastica>
              <h3>Base elástica: radiers e vigas sobre base elástica</h3>
              <table className="data quadro">
                <thead><tr><th>Elemento</th><th>Tipo</th><th>k (kN/m³)</th><th>σmáx / σadm (kN/m²)</th><th>σmín (kN/m²)</th><th>Recalque (mm)</th><th>Armadura</th><th>Situação</th></tr></thead>
                <tbody>{[...filtro(dim.radiers ?? []), ...filtro(dim.vigasElasticas ?? [])].map((x) => (
                  <LinhaElemento key={x.id} className={`click ${cls(x.status)}`} title={x.mensagens.join(' ')} ir={() => onIr('fundacao', x.id)} abrir={() => abrirJanela({ tipo: 'fundacao', id: x.id })}>
                    <td className="tl">{x.nome}</td><td className="tl">{'As' in x ? `radier h = ${Math.round(x.h * 100)}` : `viga ${Math.round(x.b * 100)}×${Math.round(x.h * 100)}`}</td><td className="num">{fmt(x.k, 0)}</td>
                    <td className="num">{fmt(x.sigmaMax, 1)} / {x.sigmaAdm ? fmt(x.sigmaAdm, 0) : '—'}</td><td className="num">{fmt(x.sigmaMin, 1)}</td><td className="num">{fmt(x.recalque * 1000, 2)}</td>
                    <td className="tl small">{'As' in x ? `inf. ${fmt(x.As.pos[0])}/${fmt(x.As.pos[1])} · sup. ${fmt(x.As.neg[0])}/${fmt(x.As.neg[1])} cm²/m` : `inf. ${x.armadura.inf.barras ? `${x.armadura.inf.barras.n} φ${fmt(x.armadura.inf.barras.phi, 1)}` : '—'} · sup. ${x.armadura.sup.barras ? `${x.armadura.sup.barras.n} φ${fmt(x.armadura.sup.barras.phi, 1)}` : '—'}`}</td>
                    <td>{x.status === 'ok' ? 'ok' : 'não atende'}</td>
                  </LinhaElemento>))}</tbody>
              </table>
              <Hint>Radier e vigas sobre base elástica (Winkler) dentro da análise global: tensão no solo σ = k·w nas combinações raras e recalques por nó; armadura do radier por Wood-Armer. Duplo clique abre o mapa por nó e as armaduras.</Hint>
            </div>
          )}
          {!!dim.corridas?.length && (
            <div className="card" data-card-corridas>
              <h3>Sapatas corridas</h3>
              <table className="data quadro">
                <thead><tr><th>Sapata</th><th>Modo</th><th>L (m)</th><th>B × h / h0 (cm)</th><th>Transversal</th><th>Distribuição</th><th>σmáx / σadm (kN/m²)</th><th>Concreto (m³)</th><th>Situação</th></tr></thead>
                <tbody>{filtro(dim.corridas).map((x) => (
                  <LinhaElemento key={x.id} className={`click ${cls(x.status)}`} title={x.mensagens.join(' ')} ir={() => onIr('fundacao', x.id)} abrir={() => abrirJanela({ tipo: 'fundacao', id: x.id })}>
                    <td className="tl">{x.nome}</td><td className="tl">{x.modo === 'pilares' ? 'sob pilares' : x.parede ? `parede ${x.parede.nome}` : 'sob parede'}</td><td className="num">{fmt(x.L)}</td>
                    <td className="num">{Math.round(x.B * 100)} × {Math.round(x.h * 100)} / {Math.round(x.h0 * 100)}</td>
                    <td className="tl small">{x.transversal?.barras ? `φ${fmt(x.transversal.barras.phi, 1)} c/${Math.round(x.transversal.barras.s * 100)}` : '—'}</td>
                    <td className="tl small">{x.transversal?.distribuicao.barras ? `φ${fmt(x.transversal.distribuicao.barras.phi, 1)} c/${Math.round(x.transversal.distribuicao.barras.s * 100)}` : '—'}</td>
                    <td className="num">{x.pressao ? `${fmt(x.pressao.sigmaMax, 1)} / ${x.sigmaAdm ? fmt(x.sigmaAdm, 0) : '—'}` : '—'}</td><td className="num">{fmt(x.volume, 2)}</td>
                    <td>{x.status === 'ok' ? 'ok' : 'não atende'}</td>
                  </LinhaElemento>))}</tbody>
              </table>
              <Hint>Sapatas corridas sob parede (largura pela σadm, flexão transversal CEB-70 por metro, armadura de distribuição) e sob pilares (viga sobre base elástica na análise global). Duplo clique abre o corte transversal e as verificações.</Hint>
            </div>
          )}
          {!!dim.basesMuros?.length && (
            <div className="card" data-card-bases-muros>
              <h3>Bases dos muros de arrimo</h3>
              <table className="data quadro">
                <thead><tr><th>Muro</th><th>B (m)</th><th>Cota / df (m)</th><th>σmáx / σadm (kN/m²)</th><th>Fonte da σadm</th><th>Concreto da base (m³)</th><th>Aço da base (kg)</th><th>Situação</th></tr></thead>
                <tbody>{filtro(dim.basesMuros).map((x) => (
                  <LinhaElemento key={x.id} className={`click ${cls(x.status)}`} title={x.mensagens.join(' ')} ir={() => abrirJanela({ tipo: 'fundacao', id: x.id })} abrir={() => abrirJanela({ tipo: 'fundacao', id: x.id })}>
                    <td className="tl">{x.nome}</td><td className="num">{fmt(x.B)}</td><td className="num">{fmt(x.cota)} / {fmt(x.profundidade)}</td>
                    <td className="num">{fmt(x.sigmaMax, 1)} / {x.sigmaAdm !== null ? fmt(x.sigmaAdm, 0) : '—'}</td><td className="tl">{x.sigmaFonte === 'propria' ? 'própria do muro' : x.sigmaFonte === 'terreno' ? 'terreno (informada)' : x.sigmaFonte === 'spt' ? 'SPT (menor furo)' : '—'}</td>
                    <td className="num">{x.total ? fmt(x.total.concreto, 1) : `${fmt(x.porMetro.concreto)}/m`}</td><td className="num">{x.total ? fmt(x.total.aco, 0) : `${fmt(x.porMetro.aco, 1)}/m`}</td>
                    <td>{x.status === 'ok' ? 'ok' : 'não atende'}</td>
                  </LinhaElemento>))}</tbody>
              </table>
              <Hint>Base do muro de arrimo isolado na fundação: σadm própria, do terreno ou pelo SPT (menor furo); cota de assentamento e quantitativos da base (totais só com o comprimento do muro). Duplo clique abre a janela.</Hint>
            </div>
          )}
          <div className="card">
            <h3>Quantitativos</h3>
            <table className="data quadro">
              <thead><tr><th>Pavimento</th><th>Concreto lajes</th><th>vigas</th><th>pilares (m³)</th><th>Fôrma (m²)</th><th>Aço estimado (kg)</th></tr></thead>
              <tbody>
                {dim.quantitativos.map((q) => <tr key={q.pavimento}><td className="tl">{q.pavimento}</td><td className="num">{fmt(q.concreto.lajes)}</td><td className="num">{fmt(q.concreto.vigas)}</td><td className="num">{fmt(q.concreto.pilares)}</td><td className="num">{fmt(q.forma.lajes + q.forma.vigas + q.forma.pilares, 1)}</td><td className="num">{fmt(q.aco, 0)}</td></tr>)}
                {totQ && <tr><td className="tl"><b>Total</b></td><td colSpan={3} className="num"><b>{fmt(totQ.c)} m³</b></td><td className="num"><b>{fmt(totQ.f, 1)}</b></td><td className="num"><b>{fmt(totQ.a, 0)}</b></td></tr>}
              </tbody>
            </table>
            <Hint>Aço por taxas (lajes {TAXAS.lajes}, vigas {TAXAS.vigas}, pilares {TAXAS.pilares} kg/m³; a confirmar). Para as vigas, o resumo de aço detalhado vem abaixo; a tabela de aço dos demais elementos vem nas pranchas.</Hint>
          </div>
          <ResumoAco dim={dim} />
        </>
      )}
    </>
  );
}

export function VentoGrupo({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const v = b.vento ?? VENTO_PADRAO;
  const psi = b.norma.psiQ ?? [0.5, 0.4, 0.3];
  return (
    <Group title="Vento e combinações" open={false}>
      <div className="row wrap">
        <label className="check small"><Input type="checkbox" checked={v.ativo} onChange={(e) => exec('vento.definir', { ativo: e.target.checked })} /> <span>considerar vento (NBR 6123)</span></label>
      </div>
      <div className="row wrap">
        <NumField label="V0" unit="m/s" width={90} value={v.v0} onChange={(x) => exec('vento.definir', { v0: x })} />
        <NumField label="S1" width={70} value={v.s1} onChange={(x) => exec('vento.definir', { s1: x })} />
        <NumField label="S3" width={70} value={v.s3} onChange={(x) => exec('vento.definir', { s3: x })} />
        <Select label="Categoria" value={v.categoria} options={(['I', 'II', 'III', 'IV', 'V'] as CategoriaVento[]).map((c) => ({ v: c, label: c }))} onChange={(c) => exec('vento.definir', { categoria: c })} />
      </div>
      <div className="row wrap">
        <NumField label="Ca (vento em X)" width={110} value={v.caX} onChange={(x) => exec('vento.definir', { caX: x })} />
        <NumField label="Ca (vento em Y)" width={110} value={v.caY} onChange={(x) => exec('vento.definir', { caY: x })} />
        <NumField label="Excentricidade" width={110} value={v.excentricidade} onChange={(x) => exec('vento.definir', { excentricidade: x })} />
      </div>
      <div className="row wrap">
        {([['xp', '+X'], ['xn', '−X'], ['yp', '+Y'], ['yn', '−Y']] as const).map(([k, rot]) => (
          <NumField key={k} label={`Coef. sentido ${rot}`} width={110} value={v.sentido?.[k] ?? 1} onChange={(x) => exec('vento.definir', { sentido: { [k]: x } })} />
        ))}
      </div>
      <div className="row wrap">
        <NumField label="Fator de vizinhança" width={130} value={v.vizinhanca ?? 1} onChange={(x) => exec('vento.definir', { vizinhanca: x })} />
        <NumField label="Platibanda" unit="m" width={110} value={v.platibanda ?? 0} onChange={(x) => exec('vento.definir', { platibanda: x })} />
      </div>
      <Hint>Edifício abrigado por vizinho: reduza o coeficiente do sentido abrigado (1 = sem redução). Fator de vizinhança de 1 a 1,3 (NBR 6123, 6.4). A platibanda soma-se à faixa de exposição do último pavimento.</Hint>
      <Hint>Classe (A/B/C) pela maior dimensão; S2 pela Tabela 1 (a confirmar); Ca do ábaco da norma informado à mão (padrão 1,3, a confirmar); forças no centro do diafragma de cada pavimento, com ± e·largura.</Hint>
      <div className="row wrap">
        <NumField label="ψ0 uso" width={80} value={psi[0]} onChange={(x) => exec('norma.definir', { psiQ: [x, psi[1], psi[2]] })} />
        <NumField label="ψ1" width={70} value={psi[1]} onChange={(x) => exec('norma.definir', { psiQ: [psi[0], x, psi[2]] })} />
        <NumField label="ψ2" width={70} value={psi[2]} onChange={(x) => exec('norma.definir', { psiQ: [psi[0], psi[1], x] })} />
      </div>
      <Hint>ψ da carga de uso (NBR 6118, Tabela 11.2): residencial 0,5/0,4/0,3; escritórios e comércio 0,7/0,6/0,4. Vento: 0,6/0,3/0.</Hint>
    </Group>
  );
}
