// Base da parede na fundação (FU7b, interface): bloco do editor da parede com a escolha entre apoio direto e sapata corrida,
// os parâmetros da sapata (comando `parede.sapata`) e o resultado (carga por metro das reações da base, momento fora do plano,
// cortante, deslizamento e sapata isolada equivalente dos pilares sobre a parede). O cálculo está em core/building/sapataCorrida.
import { Button, Check, Hint, KV, OptNumField, Pill, Select } from '../ui';
import type { AbaCorrida, BuildingModel, Parede } from '../../core/building/types';
import { Mensagens } from './CorridaUI';
import { usePlanta } from './plantaStore';
import { useBuilding } from './store';

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');
const cm = (v: number) => Math.round(v * 100);
const ABAS: { v: AbaCorrida; label: string }[] = [
  { v: 'ambas', label: 'Abas dos dois lados' }, { v: 'esq', label: 'Aba à esquerda (apoio na divisa à direita)' }, { v: 'dir', label: 'Aba à direita (apoio na divisa à esquerda)' },
];
const BASES: { v: 'apoio' | 'sapata'; label: string }[] = [{ v: 'apoio', label: 'apoio direto (engaste ou rótula)' }, { v: 'sapata', label: 'sapata corrida' }];

/** Base da parede: apoio direto ou sapata corrida (aba, B, h, σadm, atrito, cota) e os resultados dela. */
export function BaseDaParede({ b, w }: { b: BuildingModel; w: Parede }) {
  const { exec } = useBuilding();
  const dim = useBuilding((s) => s.dim);
  const c = b.fundacao?.corridas?.find((x) => x.parede === w.id);
  const r = c ? dim?.corridas?.find((x) => x.id === c.id) : undefined;
  const p = r?.parede;
  const ed = (q: Record<string, unknown>) => exec('parede.sapata', { parede: w.id, ...q });
  const opt = (campo: 'B' | 'h' | 'sigmaAdm' | 'atrito' | 'cota') => (v: number | undefined) => ed(v === undefined ? { limpar: [campo] } : { [campo]: v });
  const rows: [string, string][] = r ? [
    ['Sapata', `${r.nome}: B ${cm(r.B)} × h ${cm(r.h)}${r.h0 < r.h ? ` / h0 ${cm(r.h0)}` : ''} cm${r.fixa ? ' (B imposta)' : ''}`],
    ...(r.carga ? [['Carga por metro (rara)', `Nk ${fmt(r.carga.Nk, 1)} kN/m · ${r.carga.comb}`]] as [string, string][] : []),
    ...(r.pressao ? [['σ máx. / σadm', `${fmt(r.pressao.sigmaMax, 1)} / ${r.sigmaAdm ? fmt(r.sigmaAdm, 0) : '—'} kN/m²`]] as [string, string][] : []),
    ...(p ? [
      ['Momento fora do plano', `${fmt(p.M, 1)} kN·m/m · excentricidade ${fmt(p.eM * 100, 0)} cm`],
      ['Cortante normal à parede', `${fmt(p.H, 1)} kN/m`],
    ] as [string, string][] : []),
    ...(p?.deslizamento ? [['Deslizamento', `FS ${fmt(p.deslizamento.FS)} (mín. ${fmt(p.deslizamento.FSmin, 1)}; μ ${fmt(p.deslizamento.mu)}; H ${fmt(p.deslizamento.H, 1)} kN/m; N ${fmt(p.deslizamento.N, 1)} kN/m)`]] as [string, string][] : []),
    ...(p?.pilaresEq ?? []).map((q): [string, string] => [`Pilar ${q.pilar} sobre a parede`, `Nk ${fmt(q.Nk, 0)} kN → sapata isolada equivalente ${fmt(q.a)} × ${fmt(q.a)} m (${q.rege ? 'coberta pela largura B' : 'B menor: aumente B'})`]),
  ] : [];
  return (
    <div data-pw-base-parede={w.id}>
      <h4>Base da parede</h4>
      {w.nasce !== 'fundacao' ? (
        <Hint>Esta parede nasce num pavimento, não na fundação: só paredes que nascem na fundação têm sapata corrida.</Hint>
      ) : (
        <>
          <div className="row wrap u-items-end">
            <Select label="Base da parede" aria-label="Base da parede" value={c ? 'sapata' : 'apoio'} options={BASES}
              onChange={(v) => { if (v === 'sapata' && !c) ed({}); else if (v === 'apoio' && c) ed({ remover: true }); }} />
          </div>
          {c && (
            <>
              <div className="row wrap u-items-end">
                <Select label="Aba da sapata da parede" aria-label="Aba da sapata da parede" value={c.aba} options={ABAS} onChange={(v) => ed({ aba: v })} />
                <OptNumField label="Largura B da sapata da parede (m; vazio = pela σadm)" width={190} value={c.B} onChange={opt('B')} />
                <OptNumField label="Altura h da sapata da parede (m; vazio = calculada)" width={190} value={c.h} onChange={opt('h')} />
              </div>
              <div className="row wrap u-items-end">
                <OptNumField label="σadm da sapata da parede (kN/m²; vazio = terreno)" width={190} value={c.sigmaAdm} onChange={opt('sigmaAdm')} />
                <OptNumField label="Atrito base-solo da sapata da parede (vazio = opção)" width={190} value={c.atrito} onChange={opt('atrito')} />
                <OptNumField label="Cota de assentamento da sapata da parede (m)" width={190} value={c.cota} onChange={opt('cota')} />
              </div>
              <div className="row wrap">
                <Check label="Aba de um lado: equilibrada por cintas (sapata da parede)" checked={!!c.equilibrio} onChange={(v) => ed({ equilibrio: v })} />
              </div>
              <div className="row wrap">
                <Button disabled={!r} onClick={() => usePlanta.getState().set({ janela: { tipo: 'fundacao', id: c.id } })}>Resultados da sapata da parede</Button>
                <Button onClick={() => usePlanta.getState().set({ pavimento: 'fundacao', selecao: new Set([c.id]), foco: { id: c.id, n: Date.now() } })}>Ver a sapata na planta de fundação</Button>
              </div>
              {r ? (
                <>
                  <div className="row wrap u-items-center"><Pill tone={r.status === 'ok' ? 'ok' : 'bad'}>{r.status === 'ok' ? 'atende' : 'não atende'}</Pill></div>
                  <KV rows={rows} />
                  <Mensagens msgs={r.mensagens} />
                </>
              ) : <p className="muted small" data-pw-base-sem-resultado>Calcule o edifício (aba Dimensionamento) para ver a sapata da parede.</p>}
            </>
          )}
          <Hint>
            Sapata corrida sob a parede: o eixo e a largura do apoio seguem a parede. A carga por metro vem das reações da base da parede na análise (normal, momento fora do plano e cortante do empuxo) e das cargas lançadas no nível de fundação sobre o eixo;
            pilares que nascem na fundação sobre a parede viram sapata isolada equivalente. Aba de um lado exige cintas (grupo Fundação). Premissa sapata-parede a confirmar.
          </Hint>
        </>
      )}
    </div>
  );
}
