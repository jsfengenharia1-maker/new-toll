// Vigas inclinadas entre pavimentos (E2c, interface): janela com a lista, o lançamento (pavimentos e pontas, ou o centro de um
// pilar), a edição (seção, múltipla, ligações, desnível, flambagem, cargas, mover pontas, armadura bloqueada, redimensionar e
// remover) e, quando o cartão 2 está aplicado, os resultados. O cálculo está em core/building/inclinadas.ts, inclinadasDim.ts e
// nos comandos inclinada.*; aqui só se lançam comandos.
import { useState } from 'react';
import { create } from 'zustand';
import { Button, Check, Hint, Modal, NumField, OptNumField, Pill, Select } from '../ui';
import { resumoInclinadas } from '../../core/building/inclinadas';
import { casosDaObra, centroNoLance, lancesDoPilar, pavimentosOrdenados, type BuildingModel, type CargaInclinada, type LigacaoBarra, type VigaInclinada } from '../../core/building/types';
import { useBuilding } from './store';

interface EstadoJanela { aberta: boolean; id?: string; abrir: (id?: string) => void; fechar: () => void }
/** Estado da janela das vigas inclinadas (a paleta Ctrl+K e a lista de erros a abrem). */
export const useInclinadasUI = create<EstadoJanela>((set) => ({ aberta: false, abrir: (id) => set({ aberta: true, id }), fechar: () => set({ aberta: false, id: undefined }) }));

/** Monta a janela quando aberta (colocada uma vez no Edifício). */
export function InclinadasHost() {
  const { aberta, id, fechar } = useInclinadasUI();
  return aberta ? <JanelaInclinadas id={id} onClose={fechar} /> : null;
}

const BITOLAS = [8, 10, 12.5, 16, 20, 25, 32].map((v) => ({ v, label: `φ${String(v).replace('.', ',')}` }));
const BITOLAS_EST = [5, 6.3, 8, 10, 12.5].map((v) => ({ v, label: `φ${String(v).replace('.', ',')}` }));
const LIGACOES: { v: LigacaoBarra; label: string }[] = [{ v: 'engastada', label: 'engastada' }, { v: 'articulada', label: 'articulada' }];
const TIPOS_CARGA: { v: CargaInclinada['tipo']; label: string }[] = [
  { v: 'linear', label: 'linear (kN/m)' }, { v: 'concentrada', label: 'concentrada (kN)' }, { v: 'faixa', label: 'em faixa (kN/m)' }, { v: 'triangular', label: 'triangular (kN/m)' },
];
const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');
type CargaLivre = Omit<CargaInclinada, 'id'>;
const semId = (c: CargaInclinada): CargaLivre => { const { id: _i, ...r } = c; return r; };

/** Pilares que chegam ao pavimento, como opções de ponta. */
function pilaresDo(b: BuildingModel, pav: string) {
  return b.pilares.filter((p) => lancesDoPilar(b, p).some((l) => l.id === pav));
}

function LancarInclinada({ b, aoLancar }: { b: BuildingModel; aoLancar: (id: string) => void }) {
  const { exec } = useBuilding();
  const ps = pavimentosOrdenados(b), opcoesPav = ps.map((p) => ({ v: p.id, label: `${p.nome} (${fmt(p.cota)})` }));
  const [pi, setPi] = useState(ps[1]?.id ?? ps[0]?.id ?? ''), [pf, setPf] = useState(ps[2]?.id ?? ps.at(-1)?.id ?? '');
  const [ini, setIni] = useState<[number, number]>([0, 0]), [fim, setFim] = useState<[number, number]>([0, 0]);
  const [bw, setBw] = useState(20), [h, setH] = useState(50), [multipla, setMultipla] = useState(false);
  const [ligI, setLigI] = useState<LigacaoBarra>('engastada'), [ligF, setLigF] = useState<LigacaoBarra>('engastada');
  const ponta = (pav: string, onSet: (p: [number, number]) => void, rotulo: string) => (
    <Select label={rotulo} value="" options={[{ v: '', label: 'coordenadas abaixo' }, ...pilaresDo(b, pav).map((p) => ({ v: p.id, label: p.nome }))]}
      onChange={(id) => { const p = b.pilares.find((x) => x.id === id); if (p) onSet(centroNoLance(p, pav)); }} />
  );
  return (
    <div data-inclinada-lancar>
      <p className="small"><b>Lançar viga inclinada</b></p>
      <div className="row wrap u-items-end">
        <Select label="Pavimento inicial" value={pi} options={opcoesPav} onChange={setPi} />
        {ponta(pi, setIni, 'Centro do pilar da ponta inicial')}
        <NumField label="Ponta inicial x" unit="m" width={130} value={ini[0]} onChange={(x) => setIni([x, ini[1]])} />
        <NumField label="Ponta inicial y" unit="m" width={130} value={ini[1]} onChange={(y) => setIni([ini[0], y])} />
        <Select label="Lançar: ligação da ponta inicial" value={ligI} options={LIGACOES} onChange={setLigI} />
      </div>
      <div className="row wrap u-items-end">
        <Select label="Pavimento final" value={pf} options={opcoesPav} onChange={setPf} />
        {ponta(pf, setFim, 'Centro do pilar da ponta final')}
        <NumField label="Ponta final x" unit="m" width={130} value={fim[0]} onChange={(x) => setFim([x, fim[1]])} />
        <NumField label="Ponta final y" unit="m" width={130} value={fim[1]} onChange={(y) => setFim([fim[0], y])} />
        <Select label="Lançar: ligação da ponta final" value={ligF} options={LIGACOES} onChange={setLigF} />
      </div>
      <div className="row wrap u-items-end">
        <NumField label="Lançar: largura b" unit="cm" width={130} value={bw} onChange={setBw} />
        <NumField label="Lançar: altura h" unit="cm" width={130} value={h} onChange={setH} />
        <Check label="Lançar: múltipla (uma por pavimento)" checked={multipla} onChange={setMultipla} />
        <Button variant="primary" onClick={() => {
          const r = exec('inclinada.criar', { pavIni: pi, pavFim: pf, pIni: ini, pFim: fim, secao: { b: bw / 100, h: h / 100 }, ...(multipla ? { multipla: true } : {}), ...(ligI === 'articulada' ? { ligIni: ligI } : {}), ...(ligF === 'articulada' ? { ligFim: ligF } : {}) });
          if (r.ok) { const v = useBuilding.getState().sessao.modelo.vigasInclinadas?.at(-1); if (v) aoLancar(v.id); }
        }}>Lançar viga inclinada</Button>
      </div>
      <Hint>A ponta precisa tocar um pilar do pavimento ou o eixo de uma viga do grupo (escolha o pilar para usar o centro dele). A barra liga os pontos nas cotas dos pavimentos e não impõe diafragma. Múltipla: repete a barra em cada par de pavimentos de mesma posição dos grupos inicial e final.</Hint>
    </div>
  );
}

function EditarInclinada({ b, v }: { b: BuildingModel; v: VigaInclinada }) {
  const { exec } = useBuilding();
  const dim = useBuilding((s) => s.dim);
  const casos = casosDaObra(b).map((c) => ({ v: c.id, label: c.nome }));
  const editar = (params: Record<string, unknown>) => exec('inclinada.editar', { id: v.id, ...params });
  const arranjo = dim?.inclinadas?.find((r) => r.inclinada === v.id)?.arranjo;
  const a0 = v.armadura ?? arranjo;
  const [mover, setMover] = useState<'ambas' | 'ini' | 'fim'>('ambas'), [dx, setDx] = useState(0), [dy, setDy] = useState(0);
  const [nova, setNova] = useState<{ caso: string; tipo: CargaInclinada['tipo']; valor: number; valorFim?: number; de?: number; ate?: number }>({ caso: 'G', tipo: 'linear', valor: 10 });
  const [arm, setArm] = useState({ nSup: a0?.sup.n ?? 2, phiSup: a0?.sup.phi ?? 12.5, nInf: a0?.inf.n ?? 3, phiInf: a0?.inf.phi ?? 16, nLat: a0?.laterais?.n ?? 0, phiLat: a0?.laterais?.phi ?? 10, phiEst: a0?.estribo.phi ?? 6.3, sEst: (a0?.estribo.s ?? 0.15) * 100 });
  const cargas = v.cargas ?? [];
  return (
    <div data-inclinada-editar={v.id}>
      <p className="small"><b>Editar {v.nome}</b></p>
      <div className="row wrap u-items-end">
        <NumField label="Seção: largura b" unit="cm" width={140} value={+(v.secao.b * 100).toFixed(2)} onChange={(x) => editar({ secao: { b: x / 100, h: v.secao.h } })} />
        <NumField label="Seção: altura h" unit="cm" width={140} value={+(v.secao.h * 100).toFixed(2)} onChange={(x) => editar({ secao: { b: v.secao.b, h: x / 100 } })} />
        <Check label="Múltipla (uma por pavimento)" checked={!!v.multipla} onChange={(c) => editar({ multipla: c })} />
        <Select label="Ligação da ponta inicial" value={v.ligIni ?? 'engastada'} options={LIGACOES} onChange={(l) => editar({ ligIni: l })} />
        <Select label="Ligação da ponta final" value={v.ligFim ?? 'engastada'} options={LIGACOES} onChange={(l) => editar({ ligFim: l })} />
      </div>
      <div className="row wrap u-items-end">
        <OptNumField label="Desnível da ponta inicial" unit="cm" width={170} value={v.nivelIni === undefined ? undefined : +(v.nivelIni * 100).toFixed(2)} onChange={(x) => editar({ nivelIni: (x ?? 0) / 100 })} />
        <OptNumField label="Desnível da ponta final" unit="cm" width={170} value={v.nivelFim === undefined ? undefined : +(v.nivelFim * 100).toFixed(2)} onChange={(x) => editar({ nivelFim: (x ?? 0) / 100 })} />
        <OptNumField label="Flambagem k, plano vertical (vazio = opção)" width={250} value={v.flambagem?.vertical} onChange={(x) => editar({ flambagem: { ...v.flambagem, vertical: x } })} />
        <OptNumField label="Flambagem k, plano transversal (vazio = opção)" width={260} value={v.flambagem?.transversal} onChange={(x) => editar({ flambagem: { ...v.flambagem, transversal: x } })} />
      </div>
      <p className="small"><b>Cargas próprias</b> (verticais, sobre a parte flexível; posições a partir da ponta inicial)</p>
      {cargas.length > 0 && (
        <div className="tablewrap">
          <table className="data quadro">
            <thead><tr><th>Caso</th><th>Tipo</th><th>Valor</th><th>Valor final</th><th>De (m)</th><th>Até (m)</th><th /></tr></thead>
            <tbody>
              {cargas.map((c, k) => (
                <tr key={c.id}>
                  <td className="tl">{casos.find((x) => x.v === c.caso)?.label ?? c.caso}</td><td className="tl">{TIPOS_CARGA.find((x) => x.v === c.tipo)?.label}</td>
                  <td>{fmt(c.valor)}</td><td>{c.valorFim === undefined ? '—' : fmt(c.valorFim)}</td><td>{c.de === undefined ? '—' : fmt(c.de)}</td><td>{c.ate === undefined ? '—' : fmt(c.ate)}</td>
                  <td><Button variant="mini" aria-label={`Remover a carga ${k + 1}`} onClick={() => editar({ cargas: cargas.filter((_, j) => j !== k).map(semId) })}>remover</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="row wrap u-items-end">
        <Select label="Caso da carga" value={nova.caso} options={casos} onChange={(c) => setNova({ ...nova, caso: c })} />
        <Select label="Tipo da carga" value={nova.tipo} options={TIPOS_CARGA} onChange={(t) => setNova({ ...nova, tipo: t })} />
        <NumField label="Valor da carga" width={130} value={nova.valor} onChange={(x) => setNova({ ...nova, valor: x })} />
        {nova.tipo === 'triangular' && <OptNumField label="Valor final da carga triangular" width={190} value={nova.valorFim} onChange={(x) => setNova({ ...nova, valorFim: x })} />}
        {nova.tipo !== 'linear' && <OptNumField label="Posição inicial da carga" unit="m" width={170} value={nova.de} onChange={(x) => setNova({ ...nova, de: x })} />}
        {(nova.tipo === 'faixa' || nova.tipo === 'triangular') && <OptNumField label="Posição final da carga" unit="m" width={160} value={nova.ate} onChange={(x) => setNova({ ...nova, ate: x })} />}
        <Button onClick={() => editar({ cargas: [...cargas.map(semId), nova] })}>Acrescentar a carga</Button>
      </div>
      <div className="row wrap u-items-end">
        <Select label="Ponta a mover" value={mover} options={[{ v: 'ambas', label: 'as duas pontas' }, { v: 'ini', label: 'ponta inicial' }, { v: 'fim', label: 'ponta final' }]} onChange={setMover} />
        <NumField label="Deslocamento dx" unit="m" width={140} value={dx} onChange={setDx} />
        <NumField label="Deslocamento dy" unit="m" width={140} value={dy} onChange={setDy} />
        <Button onClick={() => exec('inclinada.mover', { id: v.id, ponta: mover, dx, dy })}>Mover a viga inclinada</Button>
      </div>
      <p className="small"><b>Armadura</b> {v.armadura ? <Pill tone="warn">bloqueada</Pill> : <Pill tone="na">automática</Pill>}</p>
      <div className="row wrap u-items-end">
        <NumField label="Barras superiores (n)" width={140} value={arm.nSup} onChange={(n) => setArm({ ...arm, nSup: Math.max(2, Math.round(n)) })} />
        <Select label="Bitola das superiores" value={arm.phiSup} options={BITOLAS} onChange={(p) => setArm({ ...arm, phiSup: p })} />
        <NumField label="Barras inferiores (n)" width={140} value={arm.nInf} onChange={(n) => setArm({ ...arm, nInf: Math.max(2, Math.round(n)) })} />
        <Select label="Bitola das inferiores" value={arm.phiInf} options={BITOLAS} onChange={(p) => setArm({ ...arm, phiInf: p })} />
        <NumField label="Barras de pele por face (n)" width={170} value={arm.nLat} onChange={(n) => setArm({ ...arm, nLat: Math.max(0, Math.round(n)) })} />
        <Select label="Bitola da pele" value={arm.phiLat} options={BITOLAS} onChange={(p) => setArm({ ...arm, phiLat: p })} />
        <Select label="Bitola do estribo" value={arm.phiEst} options={BITOLAS_EST} onChange={(p) => setArm({ ...arm, phiEst: p })} />
        <NumField label="Espaçamento do estribo" unit="cm" width={170} value={arm.sEst} onChange={(s) => setArm({ ...arm, sEst: s })} />
      </div>
      <div className="row wrap">
        <Button onClick={() => exec('inclinada.armadura', { id: v.id, sup: { n: arm.nSup, phi: arm.phiSup }, inf: { n: arm.nInf, phi: arm.phiInf }, ...(arm.nLat > 0 ? { laterais: { n: arm.nLat, phi: arm.phiLat } } : {}), estribo: { phi: arm.phiEst, s: arm.sEst / 100 } })}>Bloquear a armadura</Button>
        <Button disabled={!v.armadura} onClick={() => exec('inclinada.redimensionar', { ids: [v.id] })}>Redimensionar esta viga inclinada</Button>
        <Button onClick={() => exec('inclinada.redimensionar', {})}>Redimensionar todas as vigas inclinadas</Button>
        <Button variant="danger" onClick={() => exec('inclinada.remover', { ids: [v.id] })}>Remover a viga inclinada</Button>
      </div>
      <Hint>A armadura bloqueada só é verificada (flexo-compressão oblíqua e cortante); redimensionar solta o bloqueio e o dimensionamento usa os esforços do último cálculo. Calcule o edifício na aba Dimensionamento para ver a armadura, a esbeltez e os erros.</Hint>
    </div>
  );
}

/** Janela das vigas inclinadas: lista, lançamento e edição da escolhida. */
export function JanelaInclinadas({ id, onClose }: { id?: string; onClose: () => void }) {
  const b = useBuilding((s) => s.sessao.modelo);
  const lista = resumoInclinadas(b);
  const [sel, setSel] = useState<string | undefined>(id);
  const v = b.vigasInclinadas?.find((x) => x.id === (sel ?? id)) ?? b.vigasInclinadas?.[0];
  return (
    <Modal titulo="Vigas inclinadas" onClose={onClose} larga>
      <div data-inclinadas>
        {lista.length === 0
          ? <p className="muted small">Nenhuma viga inclinada lançada.</p>
          : (
            <div className="tablewrap">
              <table className="data quadro" data-inclinadas-lista>
                <thead><tr><th>Viga</th><th>Pavimentos</th><th>Seção</th><th>Comprimento (m)</th><th>Ângulo (°)</th><th>Ligações</th><th>Barras</th><th /></tr></thead>
                <tbody>
                  {lista.map((x) => (
                    <tr key={x.id} className={x.id === v?.id ? 'sel' : ''}>
                      <td className="tl">{x.nome}</td><td className="tl">{x.pavimentoIni} → {x.pavimentoFim}</td><td>{x.secao}</td><td>{fmt(x.comprimento)}</td><td>{fmt(x.angulo, 1)}</td><td className="tl">{x.ligacao}</td><td>{x.multipla ? `${x.barras} (múltipla)` : '1'}</td>
                      <td><Button variant="mini" aria-label={`Editar ${x.nome}`} onClick={() => setSel(x.id)}>editar</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        {v && <EditarInclinada key={v.id} b={b} v={v} />}
        <LancarInclinada b={b} aoLancar={setSel} />
      </div>
    </Modal>
  );
}
