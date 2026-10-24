# E4c — cartão 1: janela "Cálculo das escadas", botão na faixa e na paleta (C8.2, C8.53)

Classe: Haiku. Não depende dos cartões da E4a e da E4b. Leia antes `00-leia-primeiro.md`.

## Arquivos (4)
1. **Novo** `src/app/edificio/EscadaCalculoUI.tsx` com o conteúdo exato abaixo (store `useEscadaCalculoUI`, `EscadaCalculoHost`, hook `useAvisoRecalcular`, janela com a tabela de reações por apoio e caso, os esforços e o aviso de recálculo com o botão "Calcular obra").
2. `src/app/edificio/Edificio.tsx`: `import { EscadaCalculoHost } from './EscadaCalculoUI';` ao lado de `import { InclinadasHost } from './InclinadasUI';` e `<EscadaCalculoHost />` logo depois de `<InclinadasHost />`.
3. `src/app/edificio/FaixaEdificio.tsx`: `import { useEscadaCalculoUI } from './EscadaCalculoUI';` ao lado de `import { useInclinadasUI } from './InclinadasUI';`; na função `Analise`, dentro de `<RibbonGroup label="Cálculo">`, depois do botão "2ª ordem global…", acrescentar
```tsx
        <RibbonButton icon="calcular" label="Calcular escadas…" title="Cálculo individual de cada lance de escada (reações, esforços e deslocamentos), antes do cálculo da obra" onClick={() => useEscadaCalculoUI.getState().abrir()} />
```
4. `src/app/edificio/PaletaComandos.tsx`: `import { useEscadaCalculoUI } from './EscadaCalculoUI';` ao lado do de `useInclinadasUI` e, na lista de ações, logo acima da ação `a:diagonais`:
```tsx
    { id: 'a:escadas-calculo', tipo: 'Ação', rotulo: 'Calcular escadas', detalhe: 'reações, esforços e deslocamentos de cada lance', repetivel: false, executar: () => useEscadaCalculoUI.getState().abrir() },
```

## Comportamento
- A janela calcula ao abrir e sempre que a assinatura da escada muda (o cálculo individual não precisa da análise da obra): `calcularEscadas(b)` num `setTimeout` curto, com "Calculando as escadas…" visível (≈ 0,5 a 2 s por lance).
- Tabela `[data-escada-reacoes]`: apoio, G e Q em kN, G e Q em kN/m, grupo que recebe (nível de fundação aparece como "fundação"). Tabela `[data-escada-esforcos]`: Mx±, My±, |Mxy|, V máx e deslocamentos G e Q. Cada lance em `[data-escada-lance="<nome>-<n>"]`.
- Aviso `[data-escada-recalcular]` (`Note tone="bad"`) só quando existe análise da obra e ela foi feita com outra escada (`diagnosticoRecalcular`); o botão "Calcular obra" da própria janela refaz a obra e o aviso some.
- O botão do fecha-janela é o do `Modal` (não duplicar "Fechar").

## Regras de todos os cartões
Componentes de `src/app/ui` (nunca `<button>`, `<input>` ou `<select>` crus). Sem cor literal, sem CSS fora de `src/app/design`, toda classe usada já existe no CSS (`data`, `quadro`, `avoid`, `small`, `l`). Núcleo e opções já existem (`src/core/building/escadasCalculo.ts`, `escadasResumo.ts`); estes cartões só desenham. Pontos de inserção descritos por trecho/âncora (texto a procurar), não por número de linha: a D7 mexe agora no Navegador, nas Propriedades e na faixa. Cada cartão compila sozinho (`npx tsc -b`), na ordem 01, 02, 03; validado em 24/10/2026 aplicando e revertendo (`npx tsc -b`, `src/app/design/design.test.ts` e o fluxo e2e `E4c`). Falhou duas vezes: parar e relatar.

## Conteúdo de `src/app/edificio/EscadaCalculoUI.tsx`
```tsx
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
```

## Teste
`npx tsc -b`; `npx vitest run src/app/design/design.test.ts --reporter=dot`; o e2e é o do cartão 3.
