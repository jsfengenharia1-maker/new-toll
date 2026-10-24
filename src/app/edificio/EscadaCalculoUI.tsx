// Cálculo das escadas (E4c, interface): janela com o cálculo individual de cada lance (antes do cálculo da obra, C8.53), a tabela
// de reações por apoio e caso, os esforços e deslocamentos e o aviso de que a escada mudou depois do último cálculo da obra.
// O cálculo está em core/building/escadasCalculo.ts; aqui só se desenha.
import { useEffect, useMemo, useState } from 'react';
import { create } from 'zustand';
import { Button, Modal, Note, Pill } from '../ui';
import { assinaturaEscadas, calcularEscadas, diagnosticoRecalcular, type ResultadoEscadas } from '../../core/building/escadasCalculo';
import { resumoCalculoEscadas } from '../../core/building/escadasResumo';
import { useBuilding } from './store';

interface EstadoJanela { aberta: boolean; abrir: () => void; fechar: () => void }
/** Estado da janela do cálculo das escadas (a faixa, o menu da ferramenta e a paleta a abrem). */
export const useEscadaCalculoUI = create<EstadoJanela>((set) => ({ aberta: false, abrir: () => set({ aberta: true }), fechar: () => set({ aberta: false }) }));

/** Monta a janela quando aberta (colocada uma vez no Edifício). */
export function EscadaCalculoHost() {
  const { aberta, fechar } = useEscadaCalculoUI();
  return aberta ? <JanelaCalculo onClose={fechar} /> : null;
}

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');

/** Aviso ESCADA_RECALCULAR: texto quando a obra tem escadas e a análise em vigor foi feita com outras. */
export function useAvisoRecalcular(): string | null {
  const { sessao, analise } = useBuilding();
  const b = sessao.modelo;
  return useMemo(() => (analise ? diagnosticoRecalcular(b, analise.escadas?.assinatura)?.mensagem ?? null : null), [b, analise]);
}

function JanelaCalculo({ onClose }: { onClose: () => void }) {
  const { sessao, calcular, calculando } = useBuilding();
  const b = sessao.modelo;
  const [res, setRes] = useState<ResultadoEscadas | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const aviso = useAvisoRecalcular();
  const temEscadas = (b.escadas?.length ?? 0) > 0;
  // calcula ao abrir e sempre que a escada muda (o cálculo individual não precisa da análise da obra)
  const assinatura = useMemo(() => assinaturaEscadas(b), [b]);
  useEffect(() => {
    if (!temEscadas) { setRes(null); return; }
    setOcupado(true);
    const t = setTimeout(() => { setRes(calcularEscadas(b)); setOcupado(false); }, 30);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinatura, temEscadas]);
  const lances = res ? resumoCalculoEscadas(res) : [];
  const nomePav = (id?: string) => b.pavimentos.find((p) => p.id === id)?.nome ?? '—';
  const nomeGrupo = (id?: string) => (id === 'fundacao' ? 'fundação' : b.grupos.find((g) => g.id === id)?.nome ?? id ?? '—');
  return (
    <Modal titulo="Cálculo das escadas" onClose={onClose} larga ajuda="Cada lance é calculado à parte por elementos finitos de casca espessa, só com G e Q. As reações viram cargas lineares nas vigas e lajes de apoio quando a obra é calculada.">
      <div data-escada-calculo>
        {!temEscadas && <Note>A obra não tem escadas. Lance uma escada para calculá-la.</Note>}
        {aviso && <Note tone="bad"><span data-escada-recalcular>{aviso}</span>{' '}<Button disabled={calculando} onClick={() => { void calcular(); }}>Calcular obra</Button></Note>}
        {ocupado && <p className="small" data-escada-calculando>Calculando as escadas…</p>}
        {res && !ocupado && res.avisos.filter((a) => !lances.some((l) => l.avisos.includes(a))).map((a, i) => <Note key={i} tone="bad">{a}</Note>)}
        {lances.map((l) => (
          <div className="avoid" key={`${l.escada}-${l.lance}`} data-escada-lance={`${l.escada}-${l.lance}`}>
            <h3>Escada {l.escada}, lance {l.lance} <Pill>{nomePav(l.pavimento)} → {nomePav(l.pavimentoTopo)}</Pill></h3>
            {l.erro && <Note tone="bad">{l.erro}</Note>}
            <p className="small">Laje de {fmt(l.espessuraCm, 1)} cm; {l.elementos} elementos de casca (malha ≈ {fmt(l.malha)} m). Valores característicos; momentos de cálculo = γg·G + γq·Q.</p>
            <table className="data quadro" data-escada-reacoes>
              <thead><tr><th>Apoio</th><th>G (kN)</th><th>Q (kN)</th><th>G (kN/m)</th><th>Q (kN/m)</th><th>Recebe</th></tr></thead>
              <tbody>{l.reacoes.map((r) => <tr key={r.apoio}><td className="l">{r.rotulo}</td><td>{fmt(r.G)}</td><td>{fmt(r.Q)}</td><td>{fmt(r.GporMetro)}</td><td>{fmt(r.QporMetro)}</td><td>{nomeGrupo(r.grupo)}</td></tr>)}</tbody>
            </table>
            <table className="data quadro" data-escada-esforcos>
              <thead><tr><th>Mx+ (kN·m/m)</th><th>Mx− (kN·m/m)</th><th>My+ (kN·m/m)</th><th>My− (kN·m/m)</th><th>|Mxy| (kN·m/m)</th><th>V máx (kN/m)</th><th>Desloc. G (mm)</th><th>Desloc. Q (mm)</th></tr></thead>
              <tbody><tr><td>{fmt(l.momentos.MxPos)}</td><td>{fmt(l.momentos.MxNeg)}</td><td>{fmt(l.momentos.MyPos)}</td><td>{fmt(l.momentos.MyNeg)}</td><td>{fmt(l.momentos.Mxy)}</td><td>{fmt(l.momentos.Qmax)}</td><td>{fmt(l.deslocamentoMm.G)}</td><td>{fmt(l.deslocamentoMm.Q)}</td></tr></tbody>
            </table>
            {l.avisos.map((a, i) => <p className="small" key={i}>{a}</p>)}
          </div>
        ))}
        {res && <p className="small">Premissas a confirmar (ver Premissas e pendências): apoios das bordas como viga rígida, E da alvenaria do apoio do patamar, malha e esforços nos centroides.</p>}
      </div>
    </Modal>
  );
}
