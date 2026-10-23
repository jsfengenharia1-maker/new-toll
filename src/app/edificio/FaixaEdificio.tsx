// Corpo das abas da faixa do módulo Edifício. Cada botão chama o mesmo handler que o grupo ou a barra de onde saiu (ver o mapa).
import { useRef, type ReactNode } from 'react';
import { RibbonButton, RibbonGroup } from '../ui';
import { aoEscolher, usePlanta, type Ferramenta } from './plantaStore';
import { ROTULO_FERRAMENTA, TECLA_FERRAMENTA } from './Planta';
import { useBuilding } from './store';
import { useEdifUI } from './uiStore';
import { useInclinadasUI } from './InclinadasUI';
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

function Lancamento() {
  return (
    <>
      <RibbonGroup label="Seleção" radios="Ferramenta"><Ferr f="selecionar" icon="selecionar" /></RibbonGroup>
      <RibbonGroup label="Elementos" radios="Ferramenta">
        <Ferr f="pilar" icon="pilar" /><Ferr f="pilarParede" icon="pilarParede" /><Ferr f="viga" icon="viga" /><Ferr f="laje" icon="laje" /><Ferr f="parede" icon="parede" />
        <RibbonButton icon="vigaInclinada" label="Vigas inclinadas" onClick={() => useInclinadasUI.getState().abrir()} />
      </RibbonGroup>
      <RibbonGroup label="Eixos" radios="Ferramenta">
        <Ferr f="eixo" icon="eixo" />
        <RibbonButton icon="malha" label="Malha de eixos…" onClick={() => ui({ jan: 'malha' })} />
      </RibbonGroup>
      <RibbonGroup label="Cargas" radios="Ferramenta"><Ferr f="carga" icon="carga" /><Ferr f="cargaLaje" icon="cargaLaje" /><Ferr f="cargaViga" icon="cargaViga" /></RibbonGroup>
      <Gabarito />
      <RibbonGroup label="Lançamento rápido" radios="Ferramenta"><Ferr f="contornoRet" icon="contorno" /><Ferr f="aberturaRet" icon="abertura" /></RibbonGroup>
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
      <RibbonGroup label="Lajes" radios="Ferramenta">
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
      </RibbonGroup>
      <RibbonGroup label="Resultados">
        <RibbonButton icon="resultados" label="Ver Análise" onClick={() => ui({ aba: 'analise' })} />
        <RibbonButton icon="modos" label="Ver Deslocamentos" onClick={() => ui({ aba: 'deslocamentos' })} />
        <RibbonButton icon="camadas" label="Ver Isovalores" onClick={() => ui({ aba: 'isovalores' })} />
        <RibbonButton icon="verificacao" label="Ver Verificação" onClick={() => ui({ aba: 'verificacao' })} />
      </RibbonGroup>
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

/** Corpo da aba `aba` da faixa do Edifício. Os cartões 03 a 05 acrescentam as demais abas. */
export function FaixaEdificio({ aba }: { aba: string }): ReactNode {
  if (aba === 'lancamento') return <Lancamento />;
  if (aba === 'edicao') return <Edicao />;
  if (aba === 'cargas') return <CargasEAcoes />;
  if (aba === 'analise') return <Analise />;
  if (aba === 'dimensionamento') return <Dimensionamento />;
  return null;
}
