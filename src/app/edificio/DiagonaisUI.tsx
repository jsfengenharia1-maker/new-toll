// Diagonais de contraventamento entre pavimentos (E2d, interface): janela com a lista, o lançamento (pavimentos e extremos, ou o
// centro de um pilar), a edição (seção, múltipla, ligações, desnível, flambagem, mover extremos, atribuir dados de outra diagonal e
// remover) e, quando o cartão 2 está aplicado, os resultados. Em diagonal múltipla, a edição pode valer só para o grupo atual. O
// cálculo está em core/building/diagonais.ts e nos comandos diagonal.*; aqui só se lançam comandos.
import { useState } from 'react';
import { create } from 'zustand';
import { Button, Check, Hint, Modal, NumField, OptNumField, Select } from '../ui';
import { resumoDiagonais } from '../../core/building/diagonais';
import { barrasDaInclinada } from '../../core/building/inclinadas';
import { centroNoLance, lancesDoPilar, pavimentosOrdenados, type BuildingModel, type Diagonal, type LigacaoBarra } from '../../core/building/types';
import { useBuilding } from './store';

interface EstadoJanela { aberta: boolean; id?: string; abrir: (id?: string) => void; fechar: () => void }
/** Estado da janela das diagonais (a paleta Ctrl+K a abre). */
export const useDiagonaisUI = create<EstadoJanela>((set) => ({ aberta: false, abrir: (id) => set({ aberta: true, id }), fechar: () => set({ aberta: false, id: undefined }) }));

/** Monta a janela quando aberta (colocada uma vez no Edifício). */
export function DiagonaisHost() {
  const { aberta, id, fechar } = useDiagonaisUI();
  return aberta ? <JanelaDiagonais id={id} onClose={fechar} /> : null;
}

const LIGACOES: { v: LigacaoBarra; label: string }[] = [{ v: 'engastada', label: 'engastada' }, { v: 'articulada', label: 'articulada' }];
const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');

/** Pilares que chegam ao pavimento, como opções de extremo. */
function pilaresDo(b: BuildingModel, pav: string) {
  return b.pilares.filter((p) => lancesDoPilar(b, p).some((l) => l.id === pav));
}

function LancarDiagonal({ b, aoLancar }: { b: BuildingModel; aoLancar: (id: string) => void }) {
  const { exec } = useBuilding();
  const ps = pavimentosOrdenados(b), opcoesPav = ps.map((p) => ({ v: p.id, label: `${p.nome} (${fmt(p.cota)})` }));
  const [pi, setPi] = useState(ps[1]?.id ?? ps[0]?.id ?? ''), [pf, setPf] = useState(ps[2]?.id ?? ps.at(-1)?.id ?? '');
  const [ini, setIni] = useState<[number, number]>([0, 0]), [fim, setFim] = useState<[number, number]>([0, 0]);
  const [bw, setBw] = useState(20), [h, setH] = useState(30), [multipla, setMultipla] = useState(false);
  const [ligI, setLigI] = useState<LigacaoBarra>('engastada'), [ligF, setLigF] = useState<LigacaoBarra>('engastada');
  const extremo = (pav: string, onSet: (p: [number, number]) => void, rotulo: string) => (
    <Select label={rotulo} value="" options={[{ v: '', label: 'coordenadas abaixo' }, ...pilaresDo(b, pav).map((p) => ({ v: p.id, label: p.nome }))]}
      onChange={(id) => { const p = b.pilares.find((x) => x.id === id); if (p) onSet(centroNoLance(p, pav)); }} />
  );
  return (
    <div data-diagonal-lancar>
      <p className="small"><b>Lançar diagonal de contraventamento</b></p>
      <div className="row wrap u-items-end">
        <Select label="Diagonal: pavimento inicial" value={pi} options={opcoesPav} onChange={setPi} />
        {extremo(pi, setIni, 'Diagonal: centro do pilar do extremo inicial')}
        <NumField label="Diagonal: extremo inicial x" unit="m" width={150} value={ini[0]} onChange={(x) => setIni([x, ini[1]])} />
        <NumField label="Diagonal: extremo inicial y" unit="m" width={150} value={ini[1]} onChange={(y) => setIni([ini[0], y])} />
        <Select label="Diagonal: ligação do extremo inicial" value={ligI} options={LIGACOES} onChange={setLigI} />
      </div>
      <div className="row wrap u-items-end">
        <Select label="Diagonal: pavimento final" value={pf} options={opcoesPav} onChange={setPf} />
        {extremo(pf, setFim, 'Diagonal: centro do pilar do extremo final')}
        <NumField label="Diagonal: extremo final x" unit="m" width={150} value={fim[0]} onChange={(x) => setFim([x, fim[1]])} />
        <NumField label="Diagonal: extremo final y" unit="m" width={150} value={fim[1]} onChange={(y) => setFim([fim[0], y])} />
        <Select label="Diagonal: ligação do extremo final" value={ligF} options={LIGACOES} onChange={setLigF} />
      </div>
      <div className="row wrap u-items-end">
        <NumField label="Diagonal: largura b" unit="cm" width={150} value={bw} onChange={setBw} />
        <NumField label="Diagonal: altura h" unit="cm" width={150} value={h} onChange={setH} />
        <Check label="Diagonal: múltipla (uma por pavimento)" checked={multipla} onChange={setMultipla} />
        <Button variant="primary" onClick={() => {
          const r = exec('diagonal.criar', { pavIni: pi, pavFim: pf, pIni: ini, pFim: fim, secao: { b: bw / 100, h: h / 100 }, ...(multipla ? { multipla: true } : {}), ...(ligI === 'articulada' ? { ligIni: ligI } : {}), ...(ligF === 'articulada' ? { ligFim: ligF } : {}) });
          if (r.ok) { const d = useBuilding.getState().sessao.modelo.diagonais?.at(-1); if (d) aoLancar(d.id); }
        }}>Lançar diagonal</Button>
      </div>
      <Hint>O extremo precisa tocar um pilar do pavimento ou o eixo de uma viga do grupo (escolha o pilar para usar o centro dele). Os pavimentos podem estar em grupos diferentes; a diagonal atravessa os intermediários sem se ligar a eles. Onde duas diagonais se cruzam o pórtico ganha um nó e a flambagem continua pelo comprimento total. Perfis de aço não estão disponíveis: só concreto.</Hint>
    </div>
  );
}

function EditarDiagonal({ b, v, outras }: { b: BuildingModel; v: Diagonal; outras: Diagonal[] }) {
  const { exec } = useBuilding();
  const nomePav = (id: string) => b.pavimentos.find((p) => p.id === id)?.nome ?? id;
  const barras = barrasDaInclinada(b, v);
  const [grupo, setGrupo] = useState(''), [de, setDe] = useState('');
  // "grupo atual": só numa múltipla; vale para a barra que começa nesse pavimento (ela vira uma diagonal própria)
  const atual = v.multipla && barras.some((x) => x.pavIni === grupo) ? grupo : '';
  const com = (params: Record<string, unknown>) => ({ id: v.id, ...(atual ? { pavimento: atual } : {}), ...params });
  const editar = (params: Record<string, unknown>) => exec('diagonal.editar', com(params));
  const [mover, setMover] = useState<'ambas' | 'ini' | 'fim'>('ambas'), [dx, setDx] = useState(0), [dy, setDy] = useState(0);
  return (
    <div data-diagonal-editar={v.id}>
      <p className="small"><b>Editar {v.nome}</b></p>
      {v.multipla && barras.length > 1 && (
        <div className="row wrap u-items-end">
          <Select label="Grupo atual da diagonal" value={atual} options={[{ v: '', label: 'todas as barras' }, ...barras.map((x) => ({ v: x.pavIni, label: `${nomePav(x.pavIni)} → ${nomePav(x.pavFim)}` }))]} onChange={setGrupo} />
          <Hint>Com um grupo escolhido, editar, mover e atribuir valem só para a barra desse grupo, que vira uma diagonal própria (selecione-a na lista); apagar remove todas.</Hint>
        </div>
      )}
      <div className="row wrap u-items-end">
        <NumField label="Seção da diagonal: largura b" unit="cm" width={170} value={+(v.secao.b * 100).toFixed(2)} onChange={(x) => editar({ secao: { b: x / 100, h: v.secao.h } })} />
        <NumField label="Seção da diagonal: altura h" unit="cm" width={170} value={+(v.secao.h * 100).toFixed(2)} onChange={(x) => editar({ secao: { b: v.secao.b, h: x / 100 } })} />
        <Check label="Diagonal múltipla" checked={!!v.multipla} onChange={(c) => exec('diagonal.editar', { id: v.id, multipla: c })} />
        <Select label="Ligação inicial da diagonal" value={v.ligIni ?? 'engastada'} options={LIGACOES} onChange={(l) => editar({ ligIni: l })} />
        <Select label="Ligação final da diagonal" value={v.ligFim ?? 'engastada'} options={LIGACOES} onChange={(l) => editar({ ligFim: l })} />
      </div>
      <div className="row wrap u-items-end">
        <OptNumField label="Desnível inicial da diagonal" unit="cm" width={180} value={v.nivelIni === undefined ? undefined : +(v.nivelIni * 100).toFixed(2)} onChange={(x) => editar({ nivelIni: (x ?? 0) / 100 })} />
        <OptNumField label="Desnível final da diagonal" unit="cm" width={180} value={v.nivelFim === undefined ? undefined : +(v.nivelFim * 100).toFixed(2)} onChange={(x) => editar({ nivelFim: (x ?? 0) / 100 })} />
        <OptNumField label="Flambagem da diagonal: k vertical (vazio = opção)" width={280} value={v.flambagem?.vertical} onChange={(x) => editar({ flambagem: { ...v.flambagem, vertical: x } })} />
        <OptNumField label="Flambagem da diagonal: k transversal (vazio = opção)" width={290} value={v.flambagem?.transversal} onChange={(x) => editar({ flambagem: { ...v.flambagem, transversal: x } })} />
      </div>
      <div className="row wrap u-items-end">
        <Select label="Extremo a mover da diagonal" value={mover} options={[{ v: 'ambas', label: 'os dois extremos' }, { v: 'ini', label: 'extremo inicial' }, { v: 'fim', label: 'extremo final' }]} onChange={setMover} />
        <NumField label="Deslocamento dx da diagonal" unit="m" width={170} value={dx} onChange={setDx} />
        <NumField label="Deslocamento dy da diagonal" unit="m" width={170} value={dy} onChange={setDy} />
        <Button onClick={() => exec('diagonal.mover', com({ ponta: mover, dx, dy }))}>Mover a diagonal</Button>
      </div>
      <div className="row wrap u-items-end">
        <Select label="Dados de outra diagonal" value={de} options={[{ v: '', label: 'escolha' }, ...outras.map((o) => ({ v: o.id, label: o.nome }))]} onChange={setDe} />
        <Button disabled={!de} onClick={() => exec('diagonal.atribuir', com({ de }))}>Atribuir os dados da diagonal</Button>
        <Button variant="danger" onClick={() => exec('diagonal.remover', { ids: [v.id] })}>Remover a diagonal</Button>
      </div>
      <Hint>Atribuir copia seção, ligações, flambagem e cobrimento da outra diagonal (a geometria não muda). Calcule o edifício na aba Dimensionamento para ver a armadura, a esbeltez e os erros.</Hint>
    </div>
  );
}

/** Janela das diagonais: lista, lançamento e edição da escolhida. */
export function JanelaDiagonais({ id, onClose }: { id?: string; onClose: () => void }) {
  const b = useBuilding((s) => s.sessao.modelo);
  const op = useBuilding((s) => s.analise?.opcoes);
  const lista = resumoDiagonais(b, op?.diagonalFlambagemVertical ?? 1, op?.diagonalFlambagemTransversal ?? 1);
  const [sel, setSel] = useState<string | undefined>(id);
  const v = b.diagonais?.find((x) => x.id === (sel ?? id)) ?? b.diagonais?.[0];
  return (
    <Modal titulo="Diagonais de contraventamento" onClose={onClose} larga>
      <div data-diagonais>
        {lista.length === 0
          ? <p className="muted small">Nenhuma diagonal lançada.</p>
          : (
            <div className="tablewrap">
              <table className="data quadro" data-diagonais-lista>
                <thead><tr><th>Diagonal</th><th>Pavimentos</th><th>Seção</th><th>Comprimento real (m)</th><th>Ângulo (°)</th><th>Ligações</th><th>Flambagem k (v / t)</th><th>Barras</th><th>Nós de cruzamento</th><th /></tr></thead>
                <tbody>
                  {lista.map((x) => (
                    <tr key={x.id} className={x.id === v?.id ? 'sel' : ''}>
                      <td className="tl">{x.nome}</td><td className="tl">{x.pavimentoIni} → {x.pavimentoFim}</td><td>{x.secao}</td><td>{fmt(x.comprimento)}</td><td>{fmt(x.angulo, 1)}</td><td className="tl">{x.ligacao}</td><td>{x.flambagem}</td><td>{x.multipla ? `${x.barras} (múltipla)` : '1'}</td><td>{x.cruzamentos}</td>
                      <td><Button variant="mini" aria-label={`Editar ${x.nome}`} onClick={() => setSel(x.id)}>editar</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        {v && <EditarDiagonal key={v.id} b={b} v={v} outras={(b.diagonais ?? []).filter((x) => x.id !== v.id)} />}
        <LancarDiagonal b={b} aoLancar={setSel} />
      </div>
    </Modal>
  );
}
