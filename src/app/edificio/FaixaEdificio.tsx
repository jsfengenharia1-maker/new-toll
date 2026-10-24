// Corpo das abas da faixa do módulo Edifício. Cada botão chama o mesmo handler que o grupo ou a barra de onde saiu (ver o mapa).
import { useRef, type ReactNode } from 'react';
import { Dropdown, Input, RibbonButton, RibbonGroup } from '../ui';
import { CoresPlanta } from './CoresPlanta';
import { CamadaVigotas } from './CamadaVigotas';
import { aoEscolher, usePlanta, type Ferramenta, type Tema } from './plantaStore';
import { ROTULO_FERRAMENTA, TECLA_FERRAMENTA } from './Planta';
import { PlanosFaixa } from './PlanosUI';
import { useBuilding } from './store';
import { useEdifUI } from './uiStore';
import { useInclinadasUI } from './InclinadasUI';
import { useEscadaCalculoUI } from './EscadaCalculoUI';
import { useEscadaArmaduraUI } from './EscadaArmaduraUI';
import { useEscadaUI } from './EscadaUI';
import { escolherEscada } from './EscadaMenu';
import { importarMascara } from './mascaraImportar';
import { useStore } from '../store';
import { importarCargasDoEdificio } from '../Fundacoes';
import { abrirJanela } from './Revisao';
import { useAlvoSelecionado } from './alvo';
import { mascaraNoGrupo, pavimentosOrdenados } from '../../core/building/types';

const ui = (p: Parameters<ReturnType<typeof useEdifUI.getState>['set']>[0]) => useEdifUI.getState().set(p);

/** Escolhe a ferramenta na planta (a faixa sempre leva à vista Planta). */
export const irFerramenta = (f: Ferramenta) => { ui({ aba: 'planta' }); usePlanta.getState().set({ ferramenta: f, ...aoEscolher(f) }); };

/** Botão de ferramenta: `role=radio` com o rótulo e a tecla de antes (a barra da planta usava o mesmo `title`). */
export function Ferr({ f, icon, disabled }: { f: Ferramenta; icon: string; disabled?: boolean }) {
  const atual = usePlanta((s) => s.ferramenta);
  const t = TECLA_FERRAMENTA[f];
  return <RibbonButton role="radio" aria-checked={atual === f} icon={icon} label={ROTULO_FERRAMENTA[f]} title={t ? `${ROTULO_FERRAMENTA[f]} (${t})` : ROTULO_FERRAMENTA[f]} disabled={disabled} onClick={() => irFerramenta(f)} />;
}

function Gabarito() {
  const { sessao, exec } = useBuilding();
  const pl = usePlanta();
  const b = sessao.modelo;
  const ps = pavimentosOrdenados(b);
  const pav = ps.find((p) => p.id === pl.pavimento) ?? ps[Math.min(1, ps.length - 1)];
  const grupo = b.grupos.find((g) => g.id === pav?.grupo);
  const temMascara = !!grupo && b.mascaras.some((m) => mascaraNoGrupo(m, grupo.id));
  const ref = useRef<HTMLInputElement>(null);
  return (
    <RibbonGroup label="Gabarito" radios="Ferramenta">
      <RibbonButton icon="importarDxf" label="Importar DXF…" disabled={!grupo} onClick={() => ref.current?.click()} />
      <input ref={ref} type="file" accept=".dxf" hidden aria-label="Arquivo DXF da máscara" onChange={(e) => { const f = e.target.files?.[0]; if (f && grupo) void importarMascara(f, grupo.id, exec); e.target.value = ''; }} />
      {temMascara && <Ferr f="alinhar" icon="alinhar" />}
      <RibbonButton icon="importarDxf" label="Lançar por DXF/DWG…" onClick={() => ui({ l2: { tipo: 'lancar' } })} />
      <RibbonButton icon="gabarito" label="Gabaritos e vistas…" onClick={() => ui({ l2: { tipo: 'gabaritos' } })} />
      <RibbonButton icon="gabarito" label="Vistas por pavimento…" onClick={() => ui({ l2: { tipo: 'vistas' } })} />
      <RibbonButton icon="gabarito" label="Capturas…" onClick={() => pl.set({ janelaCapturas: true })} />
      <Ferr f="vigaGabarito" icon="viga" />
    </RibbonGroup>
  );
}

/** Ábacos das lajes nervuradas (E3d): gera nos pilares selecionados (ou em todos os pilares sem viga, sem seleção de pilares). */
function Abacos() {
  const { sessao, exec } = useBuilding();
  const pl = usePlanta();
  const b = sessao.modelo;
  const pilares = b.pilares.filter((p) => pl.selecao.has(p.id)).map((p) => p.id);
  return (
    <RibbonGroup label="Ábacos" radios="Ferramenta">
      <Ferr f="abaco" icon="zona" />
      <RibbonButton icon="zona" label="Gerar ábacos nos pilares" title="Gera os ábacos automáticos nos pilares selecionados; sem pilares selecionados, em todos os pilares sem viga das lajes nervuradas" disabled={!b.lajes.some((l) => l.tipo.tipo === 'nervurada' && !l.definir)}
        onClick={() => { const r = exec('abaco.gerar', pilares.length ? { pilares } : {}); if (r.ok) pl.set({ camadaAbacos: true }); else useStore.getState().set({ message: r.erros[0]?.mensagem ?? 'Não foi possível gerar os ábacos.' }); }} />
    </RibbonGroup>
  );
}

function Lancamento() {
  return (
    <>
      <RibbonGroup label="Seleção" radios="Ferramenta"><Ferr f="selecionar" icon="selecionar" /></RibbonGroup>
      <RibbonGroup label="Elementos" radios="Ferramenta">
        <Ferr f="pilar" icon="pilar" /><Ferr f="pilarParede" icon="pilarParede" /><Ferr f="viga" icon="viga" /><Ferr f="laje" icon="laje" /><Ferr f="parede" icon="parede" />
        <Ferr f="diagonal" icon="vigaInclinada" /><Ferr f="consolo" icon="viga" />
        <RibbonButton icon="vigaInclinada" label="Vigas inclinadas" onClick={() => useInclinadasUI.getState().abrir()} />
        <RibbonButton icon="escada" label="Escada" title="Escada (Shift+E): lança a escada na planta" onClick={() => escolherEscada()} />
        <RibbonButton icon="escada" label="Escadas…" onClick={() => useEscadaUI.getState().abrir()} />
      </RibbonGroup>
      <RibbonGroup label="Eixos" radios="Ferramenta">
        <Ferr f="eixo" icon="eixo" />
        <RibbonButton icon="malha" label="Malha de eixos…" onClick={() => ui({ jan: 'malha' })} />
      </RibbonGroup>
      <RibbonGroup label="Cargas" radios="Ferramenta"><Ferr f="carga" icon="carga" /><Ferr f="cargaLaje" icon="cargaLaje" /><Ferr f="cargaViga" icon="cargaViga" /></RibbonGroup>
      <Gabarito />
      <RibbonGroup label="Lançamento rápido" radios="Ferramenta"><Ferr f="contornoRet" icon="contorno" /><Ferr f="aberturaRet" icon="abertura" /></RibbonGroup>
      <Abacos />
      <RibbonGroup label="Cortes" radios="Ferramenta"><Ferr f="corte" icon="corte" /><Ferr f="secao" icon="secao" /></RibbonGroup>
      <RibbonGroup label="Pavimentos"><RibbonButton icon="pavimento" label="Novo pavimento…" onClick={() => ui({ jan: 'novoPavimento' })} /></RibbonGroup>
    </>
  );
}

function Edicao() {
  const dim = useBuilding((s) => s.dim);
  const pl = usePlanta();
  return (
    <>
      <RibbonGroup label="Modificar" radios="Ferramenta">
        <Ferr f="mover" icon="mover" /><Ferr f="copiar" icon="copiar" /><Ferr f="girar" icon="girar" /><Ferr f="espelhar" icon="espelhar" />
        <Ferr f="dividir" icon="dividir" /><Ferr f="unir" icon="unir" /><Ferr f="prolongar" icon="prolongar" />
      </RibbonGroup>
      <RibbonGroup label="Grupos">
        <RibbonButton icon="copiarGrupo" label="Copiar de outro grupo…" onClick={() => ui({ l4: 'copiarGrupo' })} />
        <RibbonButton icon="unirPavimentos" label="Unir pavimentos…" onClick={() => ui({ l4: 'unirPavimentos' })} />
      </RibbonGroup>
      <RibbonGroup label="Referências" radios="Ferramenta"><Ferr f="moverRef" icon="referencia" /><Ferr f="contaGotas" icon="contaGotas" /></RibbonGroup>
      <PlanosFaixa><Ferr f="plano" icon="laje" /></PlanosFaixa>
      <RibbonGroup label="Lajes" radios="Ferramenta">
        <RibbonButton icon="laje" label="Tipos de laje…" title="Abre a Configuração da obra em Tipos de laje" onClick={() => ui({ cfg: 'tiposLaje' })} />
        <Ferr f="puncao" icon="puncao" disabled={!dim?.puncao?.length} />
        <Ferr f="zonaLaje" icon="zona" /><Ferr f="linhaDobra" icon="dobra" /><Ferr f="direcaoPano" icon="laje" /><Ferr f="insercaoPano" icon="laje" />
        <RibbonButton icon="zona" label="Editar armaduras das lajes" title="Abre o painel de edição das armaduras sob a planta" onClick={() => { ui({ aba: 'planta' }); pl.set({ camadaPuncao: false, painelLajes: true, armaduraLajes: pl.armaduraLajes === 'nenhuma' ? 'ambas' : pl.armaduraLajes }); }} />
      </RibbonGroup>
    </>
  );
}

const cfg = (id: string) => () => ui({ cfg: id });

function CargasEAcoes() {
  return (
    <>
      <RibbonGroup label="Casos e combinações">
        <RibbonButton icon="casos" label="Casos de carga" onClick={cfg('casos')} />
        <RibbonButton icon="estados" label="Estados-limite e combinações" onClick={cfg('estados')} />
      </RibbonGroup>
      <RibbonGroup label="Vento">
        <RibbonButton icon="vento" label="Vento e combinações" onClick={cfg('vento')} />
        <RibbonButton icon="vento" label="Ábacos de vento (NBR 6123)" onClick={cfg('abacos')} />
      </RibbonGroup>
      <RibbonGroup label="Outras ações">
        <RibbonButton icon="empuxo" label="Empuxo de terra" onClick={cfg('empuxo')} />
        <RibbonButton icon="casos" label="Etapas de carga (flechas)" onClick={cfg('etapasFlecha')} />
        <RibbonButton icon="fogo" label="Incêndio" onClick={cfg('incendio')} />
      </RibbonGroup>
    </>
  );
}

function Analise() {
  const { calcular, calculando } = useBuilding();
  return (
    <>
      <RibbonGroup label="Cálculo">
        <RibbonButton icon="calcular" label="Calcular obra" title="Mesma ação de Calcular e dimensionar (aba Dimensionamento)" disabled={calculando} onClick={() => { void calcular(); }} />
        <RibbonButton icon="modos" label="2ª ordem global…" title="Abre a vista Análise (P-Δ no lugar do γz)" onClick={() => ui({ aba: 'analise' })} />
        <RibbonButton icon="calcular" label="Calcular escadas…" title="Cálculo individual de cada lance de escada (reações, esforços e deslocamentos), antes do cálculo da obra" onClick={() => useEscadaCalculoUI.getState().abrir()} />
        <RibbonButton icon="calcular" label="Armadura das escadas…" title="Armadura e detalhamento de cada lance de escada: posições, ancoragens, esperas e passadores, com edição e bloqueio" onClick={() => useEscadaArmaduraUI.getState().abrir()} />
      </RibbonGroup>
      <RibbonGroup label="Resultados">
        <RibbonButton icon="resultados" label="Ver Análise" onClick={() => ui({ aba: 'analise' })} />
        <RibbonButton icon="modos" label="Ver Deslocamentos" onClick={() => ui({ aba: 'deslocamentos' })} />
        <RibbonButton icon="camadas" label="Ver Isovalores" onClick={() => ui({ aba: 'isovalores' })} />
        <RibbonButton icon="resultados" label="Ver Esforços" onClick={() => ui({ aba: 'esforcos' })} />
        <RibbonButton icon="verificacao" label="Ver Verificação" onClick={() => ui({ aba: 'verificacao' })} />
      </RibbonGroup>
      <RibbonGroup label="Consultas" radios="Ferramenta"><Ferr f="flecha" icon="medir" /></RibbonGroup>
      <RibbonGroup label="Opções"><RibbonButton icon="config" label="Opções de cálculo…" onClick={cfg('opcoes')} /></RibbonGroup>
    </>
  );
}

function Dimensionamento() {
  const { calcular, calculando, dim } = useBuilding();
  const alvo = useAlvoSelecionado();
  return (
    <>
      <RibbonGroup label="Calcular">
        <RibbonButton icon="calcular" label="Calcular obra" disabled={calculando} onClick={() => { void calcular(); }} />
        <RibbonButton icon="calcular" label="Calcular obra sem fundações" disabled={calculando} onClick={() => { void calcular(true); }} />
        <RibbonButton icon="dimensionamento" label="Ver Dimensionamento" onClick={() => ui({ aba: 'dimensionamento' })} />
      </RibbonGroup>
      <RibbonGroup label="Relatórios">
        <RibbonButton icon="memorial" label="Memorial da obra" onClick={() => ui({ memo: true })} />
        <RibbonButton icon="relatorio" label="Resultados do elemento" title={dim ? 'Resultados do elemento selecionado' : 'Calcule o dimensionamento primeiro'} disabled={!alvo || !dim} onClick={() => alvo && abrirJanela(alvo)} />
      </RibbonGroup>
      <RibbonGroup label="Proteção ao fogo"><RibbonButton icon="fogo" label="Resistência ao fogo…" onClick={cfg('incendio')} /></RibbonGroup>
      <RibbonGroup label="Fundações">
        <RibbonButton icon="enviar" label="Cargas para o módulo Fundações" disabled={!dim?.fundacao.length} onClick={() => { importarCargasDoEdificio(dim!.fundacao); useStore.getState().set({ module: 'fundacoes' }); }} />
      </RibbonGroup>
    </>
  );
}

function Fundacoes() {
  const { calcularFundacao, calculandoFund, dim } = useBuilding();
  const pl = usePlanta();
  return (
    <>
      <RibbonGroup label="Elementos" radios="Ferramenta">
        <Ferr f="fundacao" icon="fundacao" /><Ferr f="vigaFund" icon="vigaFund" /><Ferr f="radier" icon="radier" /><Ferr f="vigaElastica" icon="vigaElastica" /><Ferr f="corrida" icon="corrida" />
      </RibbonGroup>
      <RibbonGroup label="Modificar" radios="Ferramenta">
        <Ferr f="girarFund" icon="girarFund" /><Ferr f="insFund" icon="pontoIns" />
      </RibbonGroup>
      <RibbonGroup label="Limites" radios="Ferramenta"><Ferr f="limite" icon="limite" /><Ferr f="limiteMascara" icon="limite" /></RibbonGroup>
      <RibbonGroup label="Cálculo">
        <RibbonButton icon="fundacao" label="Nível de fundação" title="Planta de fundação (U)" onClick={() => { ui({ aba: 'planta' }); pl.set({ pavimento: 'fundacao', ferramenta: 'fundacao', selecao: new Set() }); }} />
        <RibbonButton icon="calcular" label="Calcular as fundações" title="Calcula só as fundações, com a análise em vigor" disabled={!dim || calculandoFund} onClick={() => { void calcularFundacao(); }} />
        <RibbonButton icon="config" label="Configuração das fundações…" onClick={() => ui({ cfg: 'fundacao' })} />
      </RibbonGroup>
    </>
  );
}

function Pranchas() {
  return (
    <>
      <RibbonGroup label="Folhas">
        <RibbonButton icon="pranchas" label="Abrir Pranchas" title="Abre a vista Pranchas (tipo, grupo, formato, escala, PDF, DXF e DWG)" onClick={() => ui({ aba: 'pranchas' })} />
        <RibbonButton icon="config" label="Opções de armação e locação…" onClick={() => ui({ aba: 'pranchas' })} />
      </RibbonGroup>
      <RibbonGroup label="Estilo">
        <RibbonButton icon="config" label="Estilo de desenho e símbolos…" title="Abre a vista Pranchas no bloco de estilo de desenho, símbolos dos pilares e DXF importados" onClick={() => { ui({ aba: 'pranchas' }); requestAnimationFrame(() => document.querySelector('[data-estilo-pranchas]')?.scrollIntoView({ block: 'nearest' })); }} />
      </RibbonGroup>
    </>
  );
}

function Vista() {
  const pl = usePlanta();
  const dim = useBuilding((s) => s.dim);
  const an = useBuilding((s) => s.analise);
  const b = useBuilding((s) => s.sessao.modelo);
  const nivelFund = pl.pavimento === 'fundacao';
  return (
    <>
      <RibbonGroup label="Navegação" radios="Ferramenta">
        <RibbonButton icon="enquadrar" label="Enquadrar" title="Enquadrar (F)" onClick={() => { ui({ aba: 'planta' }); pl.set({ vista: null }); }} />
        <Ferr f="medir" icon="medir" />
        <RibbonButton icon="paleta" label="Paleta de comandos" title="Paleta de comandos (Ctrl+K)" onClick={() => ui({ paleta: true })} />
        <RibbonButton icon="guia" label="Guia rápido" onClick={() => ui({ l4: 'guia' })} />
      </RibbonGroup>
      <RibbonGroup label="Camadas">
        <div className="rstack">
          <Dropdown aria-label="Tema da planta" value={pl.tema} onChange={(e) => pl.set({ tema: e.target.value as Tema })}>
          <option value="escuro">Escuro</option><option value="claro">Claro</option><option value="pb">P&amp;B</option>
          </Dropdown>
          <CoresPlanta />
          <Dropdown aria-label="Armadura das lajes na planta" title="Camada da planta: barras representativas das lajes maciças e vigotas das treliçadas, ou contornos críticos e armadura de punção dos pilares do pavimento (vermelho onde a tensão excede a resistência); calcule o dimensionamento primeiro. A opção editar abre o painel de edição da armadura das lajes sob a planta (posições, zonas de uniformização, linhas de dobra e geração sem cálculo)" value={pl.camadaPuncao ? 'puncao' : pl.painelLajes ? 'editar' : pl.armaduraLajes}
          onChange={(e) => {
          const v = e.target.value as 'nenhuma' | 'inf' | 'sup' | 'ambas' | 'editar' | 'puncao';
          if (v === 'puncao') pl.set({ camadaPuncao: true, armaduraLajes: 'nenhuma', painelLajes: false });
          else if (v === 'editar') pl.set({ camadaPuncao: false, painelLajes: true, armaduraLajes: pl.armaduraLajes === 'nenhuma' ? 'ambas' : pl.armaduraLajes });
          else pl.set({ camadaPuncao: false, painelLajes: false, armaduraLajes: v });
          }}>
          <option value="nenhuma">Armadura das lajes: não</option><option value="inf">Armadura das lajes: inferior</option><option value="sup">Armadura das lajes: superior</option><option value="ambas">Armadura das lajes: ambas</option><option value="editar">Armadura das lajes: editar</option>
          {!!dim?.puncao?.length && <option value="puncao">Punção e cortante</option>}
          </Dropdown>
          <label className="check small" title="Pinta de vermelho (erro) e amarelo (aviso) os elementos reprovados no dimensionamento"><Input type="checkbox" checked={pl.mostrarErros} onChange={(e) => pl.set({ mostrarErros: e.target.checked })} /> <span>Mostrar erros</span></label>
          <label className="check small" title="Pinta as cargas pela cor do caso (permanente, variável, vento, excepcional, adicionais) e mostra a legenda no canto da planta"><Input type="checkbox" checked={pl.cargasPorCaso} onChange={(e) => pl.set({ cargasPorCaso: e.target.checked })} /> <span>Cargas por caso</span></label>
          {!!an?.vento && !nivelFund && <Dropdown aria-label="Vento na planta" title="Setas das forças de vento por zona do pavimento aberto, para o caso escolhido (depois de calcular)" value={pl.ventoPlanta} onChange={(e) => pl.set({ ventoPlanta: e.target.value })}>
            <option value="">Vento na planta: não</option>{an.vento.casos.map((c) => <option key={c.nome} value={c.nome}>Vento na planta: {c.nome}</option>)}
          </Dropdown>}
          <label className="check small"><Input type="checkbox" checked={pl.inferior} onChange={(e) => pl.set({ inferior: e.target.checked })} /> <span>Inferior</span></label>
          {!!dim?.vigotas?.length && <CamadaVigotas />}
          {!!dim?.vigotas?.length && <label className="check small" title="Lajes treliçadas: desenha todas as faixas de vigotas em vez de uma por grupo de igualação"><Input type="checkbox" checked={pl.vigotasTodas} onChange={(e) => pl.set({ vigotasTodas: e.target.checked })} /> <span>Mostrar todas as faixas</span></label>}
          {nivelFund && (b.fundacao?.radiers?.length || b.fundacao?.vigasElasticas?.length) ? <Dropdown aria-label="Mapa da base elástica" title="Valor por nó da base elástica (envoltória das raras), depois de calcular" value={pl.mapaBase} disabled={!dim?.radiers?.length && !dim?.vigasElasticas?.length} onChange={(e) => pl.set({ mapaBase: e.target.value as 'nenhum' | 'tensao' | 'recalque' })}>
          <option value="nenhum">Mapa da base elástica: não</option><option value="tensao">Mapa: tensão no solo</option><option value="recalque">Mapa: recalque</option>
          </Dropdown> : null}
        </div>
      </RibbonGroup>
    </>
  );
}

export const ROTULO_CTX: Record<string, string> = { pilar: 'Pilar', viga: 'Viga', laje: 'Laje', fundacao: 'Fundação' };

function Contexto() {
  const alvo = useAlvoSelecionado();
  const { exec, dim, sessao } = useBuilding();
  const pl = usePlanta();
  const b = sessao.modelo;
  if (!alvo) return null;
  const fundSel = (b.fundacao?.elementos ?? []).filter((e) => pl.selecao.has(e.id));
  const vigasFundSel = (b.fundacao?.vigas ?? []).filter((v) => pl.selecao.has(v.id));
  return (
    <>
      <RibbonGroup label="Elemento">
        <RibbonButton icon="relatorio" label="Resultados do elemento" disabled={!dim} onClick={() => abrirJanela(alvo)} />
        <RibbonButton icon="enquadrar" label="Centralizar na planta" onClick={() => pl.set({ foco: { id: alvo.id, n: (pl.foco?.n ?? 0) + 1 } })} />
      </RibbonGroup>
      {alvo.tipo === 'fundacao' && (
        <RibbonGroup label="Fundação">
          <RibbonButton icon="girar" label="Girar 90°" title="Gira os elementos selecionados em 90° (R)" disabled={!fundSel.length} onClick={() => exec('lote', { comandos: fundSel.map((e) => ({ nome: 'fundacao.girar', params: { ids: [e.id], angulo: e.angulo + 90 } })) })} />
          <RibbonButton icon="pilar" label="Ao pilar" title="Gira os elementos selecionados para o ângulo do pilar" disabled={!fundSel.length} onClick={() => exec('fundacao.girar', { ids: fundSel.map((e) => e.id), doPilar: true })} />
          <RibbonButton icon="remover" label="Remover" title="Remove os elementos e as vigas de fundação selecionados (Del)" disabled={!fundSel.length && !vigasFundSel.length} onClick={() => {
            const cmds = [...(vigasFundSel.length ? [{ nome: 'vigaFundacao.remover', params: { ids: vigasFundSel.map((v) => v.id) } }] : []), ...(fundSel.length ? [{ nome: 'fundacao.remover', params: { ids: fundSel.map((e) => e.id) } }] : [])];
            exec('lote', { comandos: cmds }); pl.set({ selecao: new Set() });
          }} />
        </RibbonGroup>
      )}
    </>
  );
}

/** Corpo da aba `aba` da faixa do Edifício. Os cartões 03 a 05 acrescentam as demais abas. */
export function FaixaEdificio({ aba }: { aba: string }): ReactNode {
  if (aba === 'lancamento') return <Lancamento />;
  if (aba === 'edicao') return <Edicao />;
  if (aba === 'fundacoes') return <Fundacoes />;
  if (aba === 'pranchas') return <Pranchas />;
  if (aba === 'vista') return <Vista />;
  if (aba === 'ctx') return <Contexto />;
  if (aba === 'cargas') return <CargasEAcoes />;
  if (aba === 'analise') return <Analise />;
  if (aba === 'dimensionamento') return <Dimensionamento />;
  return null;
}
