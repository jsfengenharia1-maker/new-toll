// Janela "Nova escada" (E4b, C8.6, C8.7, C8.38 a C8.40): dados comuns e lances da escada que a ferramenta Escada lança na planta.
// Os dados ficam em `escadaPadrao` do estado da planta (a última escada lançada vira o padrão da próxima); "Copiar dados de" usa os
// de outra escada do grupo. O lançamento (cliques, capturas, erros) está em Planta.tsx; aqui só se editam os dados.
import { create } from 'zustand';
import { Button, Dropdown, Hint, Modal, Note } from '../ui';
import { dadosComunsDe, geometriaEscada, tiposLanceDisponiveis, tiposLanceEmUso, type DadosComunsEscada, type LanceEscada } from '../../core/building/escadas';
import { previaInsercao } from '../../core/building/escadasEdicao';
import type { BuildingModel } from '../../core/building/types';
import { grupoDaPlanta, usePlanta } from './plantaStore';
import { useBuilding } from './store';
import { DadosComuns } from './EscadaUI';

interface EstadoJanela { aberta: boolean; abrir: () => void; fechar: () => void }
/** Estado da janela "Nova escada" (o menu da ferramenta e o 1º clique sem dados a abrem). */
export const useNovaEscadaUI = create<EstadoJanela>((set) => ({ aberta: false, abrir: () => set({ aberta: true }), fechar: () => set({ aberta: false }) }));

type LanceNovo = Omit<LanceEscada, 'id'>;
const semId = (l: LanceEscada): LanceNovo => { const c = JSON.parse(JSON.stringify(l)); delete c.id; return c; };
const DADOS_INICIAIS: DadosComunsEscada = { largura: 1.2, piso: 0.28, espelho: 0.175 };

/** Dados e lances da próxima escada: os da escada escolhida em "Copiar dados de" (C8.39) ou os da última lançada (C8.38); null sem nenhum dos dois. */
export function baseNovaEscada(b: Pick<BuildingModel, 'escadas'>, pl: { escadaCopiar: string | null; escadaPadrao: { dados: DadosComunsEscada; lances: LanceNovo[] } | null }): { dados: DadosComunsEscada; lances: LanceNovo[] } | null {
  const fonte = pl.escadaCopiar ? (b.escadas ?? []).find((e) => e.id === pl.escadaCopiar) : undefined;
  if (fonte) return { dados: dadosComunsDe(fonte), lances: fonte.lances.map(semId) };
  return pl.escadaPadrao ? { dados: pl.escadaPadrao.dados, lances: pl.escadaPadrao.lances } : null;
}

export function NovaEscadaHost() {
  const { aberta, fechar } = useNovaEscadaUI();
  return aberta ? <JanelaNova onClose={fechar} /> : null;
}

/** Tipo de lance com as seções "Da obra" e "Predefinidos"; o tipo da obra em uso leva "(em uso)" (C8.40). */
function TipoLanceSelect({ b, label, value, onChange }: { b: BuildingModel; label: string; value: string; onChange: (v: string) => void }) {
  const emUso = tiposLanceEmUso(b), obra = b.tiposLance ?? [], pre = tiposLanceDisponiveis({ tiposLance: [] });
  return (
    <label className="field grow">
      <span className="flabel">{label}</span>
      <span className="finput">
        <Dropdown aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
          {obra.length > 0 && <optgroup label="Da obra">{obra.map((t) => <option key={t.id} value={t.id}>{t.nome}{emUso.has(t.id) ? ' (em uso)' : ''}</option>)}</optgroup>}
          <optgroup label="Predefinidos">{pre.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}</optgroup>
        </Dropdown>
      </span>
    </label>
  );
}

function JanelaNova({ onClose }: { onClose: () => void }) {
  const pl = usePlanta();
  const { sessao } = useBuilding();
  const b = sessao.modelo;
  const grupo = grupoDaPlanta(b, pl.pavimento);
  const doGrupo = (b.escadas ?? []).filter((e) => e.grupo === grupo?.id);
  const base = baseNovaEscada(b, pl) ?? { dados: DADOS_INICIAIS, lances: [{ tipo: 'pre:meia-volta-9-9' }] as LanceNovo[] };
  const grava = (dados: DadosComunsEscada, lances: LanceNovo[]) => pl.set({ escadaPadrao: { dados, lances, nome: pl.escadaPadrao?.nome, angulo: pl.escadaPadrao?.angulo }, escadaCopiar: null });
  const pr = previaInsercao(b, { grupo: grupo?.id ?? '', origem: [0, 0], angulo: 0, dados: base.dados, lances: base.lances });
  const erros = geometriaEscada(pr.escada, tiposLanceDisponiveis(b), b).diagnosticos.filter((d) => d.severidade === 'erro');
  const muda = (p: Record<string, unknown>) => {
    const d = { ...base.dados } as Record<string, unknown>;
    for (const [k, v] of Object.entries(p)) { if (k === 'limpar') for (const c of v as string[]) delete d[c]; else d[k] = v; }
    grava(d as unknown as DadosComunsEscada, base.lances);
  };
  const trocaTipo = (i: number, tipo: string) => grava(base.dados, base.lances.map((l, k) => (k === i ? { ...l, tipo } : l)));
  return (
    <Modal titulo="Nova escada" onClose={onClose} larga>
      <div data-nova-escada>
        <Hint>Grupo: {grupo?.nome ?? '—'}</Hint>
        <div className="row wrap u-items-end">
          <label className="field grow">
            <span className="flabel">Copiar dados de</span>
            <span className="finput">
              <Dropdown aria-label="Copiar dados de" value={pl.escadaCopiar ?? ''} onChange={(e) => pl.set({ escadaCopiar: e.target.value || null })}>
                <option value="">(nenhuma)</option>
                {doGrupo.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </Dropdown>
            </span>
          </label>
        </div>
        <DadosComuns e={pr.escada} muda={muda} />
        <div data-nova-escada-lances>
          {base.lances.map((l, i) => (
            <div className="row wrap u-items-end" key={i}>
              <TipoLanceSelect b={b} label={`Tipo do lance ${i + 1} da nova escada`} value={l.tipo} onChange={(v) => trocaTipo(i, v)} />
              <Button variant="danger" disabled={base.lances.length < 2} onClick={() => grava(base.dados, base.lances.filter((_, k) => k !== i))}>Remover lance {i + 1} da nova escada</Button>
            </div>
          ))}
          <Button onClick={() => grava(base.dados, [...base.lances, { tipo: base.lances.at(-1)?.tipo ?? 'pre:reto-18' }])}>Acrescentar lance à nova escada</Button>
        </div>
        {erros.map((d, i) => <Note key={i} tone="bad" data-escada-erro={d.codigo}>{d.mensagem}</Note>)}
        {!erros.length && <Hint>Geometria coerente: sem erros.</Hint>}
        <div className="row wrap">
          <Button variant="primary" onClick={() => { grava(base.dados, base.lances); onClose(); }}>Lançar na planta</Button>
        </div>
      </div>
    </Modal>
  );
}
