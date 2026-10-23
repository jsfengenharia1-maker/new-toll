// Configuração da obra: janela com índice lateral que reúne os grupos de premissas (dados gerais, opções de cálculo, materiais, casos, vento…).
// Cada seção é o componente de grupo que já existia; só o lugar mudou (docs/analises/layout-bimcraft-mapa.md, destino CFG).
import { useEffect, useRef, type ReactNode } from 'react';
import { Button, Spacer } from '../ui';
import { useLayout } from '../layout';
import type { BuildingModel } from '../../core/building/types';
import { DadosGeraisCorpo } from './DadosGerais';
import { OpcoesGrupo } from './OpcoesCalculo';
import { MateriaisGrupo } from './Materiais';
import { TabelasGrupo } from './TabelasArmadura';
import { BibliotecaNormasGrupo } from './BibliotecaNormas';
import { TiposLajeGrupo } from './TiposLaje';
import { CasosGrupo } from './Casos';
import { EstadosGrupo } from './EstadosLimite';
import { VentoGrupo } from './Edificio';
import { AbacosVentoGrupo } from './AbacosVento';
import { EmpuxoGrupo } from './Empuxo';
import { EtapasFlechaGrupo } from './EtapasFlecha';
import { IncendioGrupo } from './Incendio';
import { ArquivoGrupo } from './EtapasObra';
import { FundacaoGrupo } from './Fundacao';
import { useEdifUI } from './uiStore';

export interface SecaoCfg { id: string; titulo: string; corpo: (b: BuildingModel) => ReactNode }
/** Seções na ordem do índice. O cartão 07 acrescenta as demais. */
export const SECOES: SecaoCfg[] = [
  { id: 'dados', titulo: 'Dados gerais', corpo: (b) => <DadosGeraisCorpo b={b} /> },
  { id: 'opcoes', titulo: 'Opções de cálculo', corpo: (b) => <OpcoesGrupo b={b} /> },
  { id: 'materiais', titulo: 'Materiais e segurança', corpo: (b) => <MateriaisGrupo b={b} /> },
  { id: 'tabelas', titulo: 'Tabelas de armadura', corpo: (b) => <TabelasGrupo b={b} /> },
  { id: 'normas', titulo: 'Biblioteca de normas', corpo: (b) => <BibliotecaNormasGrupo b={b} /> },
  { id: 'tiposLaje', titulo: 'Tipos de laje', corpo: (b) => <TiposLajeGrupo b={b} /> },
  { id: 'casos', titulo: 'Casos de carga', corpo: (b) => <CasosGrupo b={b} /> },
  { id: 'estados', titulo: 'Estados-limite e combinações', corpo: (b) => <EstadosGrupo b={b} /> },
  { id: 'vento', titulo: 'Vento e combinações', corpo: (b) => <VentoGrupo b={b} /> },
  { id: 'abacos', titulo: 'Ábacos de vento', corpo: (b) => <AbacosVentoGrupo b={b} /> },
  { id: 'empuxo', titulo: 'Empuxo de terra', corpo: (b) => <EmpuxoGrupo b={b} /> },
  { id: 'etapasFlecha', titulo: 'Etapas de carga', corpo: (b) => <EtapasFlechaGrupo b={b} /> },
  { id: 'incendio', titulo: 'Incêndio', corpo: (b) => <IncendioGrupo b={b} /> },
  { id: 'arquivo', titulo: 'Arquivo e versões', corpo: () => <ArquivoGrupo /> },
  { id: 'fundacao', titulo: 'Fundação (terreno, estacas, sondagens, parâmetros)', corpo: (b) => <FundacaoGrupo b={b} onPlanta={() => useEdifUI.getState().set({ aba: 'planta' })} /> },
];

export function JanelaConfiguracao({ b }: { b: BuildingModel }) {
  const ultima = useRef('dados');
  const cfg = useEdifUI((s) => s.cfg);
  // sempre montada (escondida quando fechada): o estado dos grupos sobrevive a fechar e reabrir
  const secao = SECOES.find((s) => s.id === cfg) ?? SECOES.find((s) => s.id === ultima.current) ?? SECOES[0];
  if (cfg) ultima.current = cfg;
  const corpo = useRef<HTMLDivElement>(null);
  // a janela cobre a doca esquerda (mesma largura) e não bloqueia o desenho: dá para editar uma opção e conferir na planta
  const docaW = useLayout((s) => s.docas['edificio-esq']?.w ?? 320);
  const fechar = () => useEdifUI.getState().set({ cfg: null });
  // os grupos nascem recolhidos (<details>): dentro da janela abrem todos
  useEffect(() => { corpo.current?.querySelectorAll('details.group').forEach((d) => { (d as HTMLDetailsElement).open = true; }); }, [secao.id, b]);
  const width = `${Math.max(docaW, 320)}px`;
  return (
    <div className="cfg-janela" role={cfg ? "dialog" : undefined} aria-label={cfg ? "Configuração da obra" : undefined} style={{ width }} hidden={!cfg}>
      <div className="modal-head"><b>Configuração da obra</b><Spacer /><Button variant="ghost" onClick={fechar}>Fechar</Button></div>
      <div className="cfg">
        <nav className="cfg-ind" aria-label="Seções da configuração">
          {SECOES.map((s) => (
            <Button key={s.id} variant="nenhuma" className={`cfg-item${s.id === secao.id ? ' on' : ''}`} aria-current={s.id === secao.id ? 'true' : undefined} onClick={() => useEdifUI.getState().set({ cfg: s.id })}>{s.titulo}</Button>
          ))}
        </nav>
        {/* todas as seções ficam montadas (só a ativa aparece): o estado de cada grupo (tabela escolhida, campos em edição) sobrevive à troca de seção */}
        <div className="cfg-corpo edif-in" ref={corpo}>{SECOES.map((s) => <div key={s.id} hidden={s.id !== secao.id}>{s.corpo(b)}</div>)}</div>
      </div>
    </div>
  );
}
