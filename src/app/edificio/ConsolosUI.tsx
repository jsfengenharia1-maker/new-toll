// Consolos curtos (E2e, interface): janela com a lista (situação do último cálculo, em vermelho quando reprovado), o lançamento (viga,
// ponta, pilar e geometria) e a edição (geometria, aparelho de apoio, força horizontal, remover). Os resultados, o relatório e a
// armadura vêm do cartão 2. O cálculo está em core/building/consolos.ts e nos comandos consolo.*; aqui só se lançam comandos.
import { useState } from 'react';
import { create } from 'zustand';
import { Button, Hint, Modal, NumField, OptNumField, Select } from '../ui';
import { consoloPadrao, faceDoPilar, pontaDaViga, pontaToca } from '../../core/building/consolos';
import type { BuildingModel, Consolo } from '../../core/building/types';
import { calculoAtual, dimAtual, useBuilding } from './store';
import { ConsoloResultados } from './ConsolosResultadosUI';

interface EstadoJanela { aberta: boolean; id?: string; abrir: (id?: string) => void; fechar: () => void }
/** Estado da janela dos consolos (a paleta Ctrl+K a abre). */
export const useConsolosUI = create<EstadoJanela>((set) => ({ aberta: false, abrir: (id) => set({ aberta: true, id }), fechar: () => set({ aberta: false, id: undefined }) }));

/** Monta a janela quando aberta (colocada uma vez no Edifício). */
export function ConsolosHost() {
  const { aberta, id, fechar } = useConsolosUI();
  return aberta ? <JanelaConsolos id={id} onClose={fechar} /> : null;
}

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');
const cm = (m: number) => +(m * 100).toFixed(2);
const PONTAS: { v: 'ini' | 'fim'; label: string }[] = [{ v: 'ini', label: 'ponta inicial' }, { v: 'fim', label: 'ponta final' }];

function LancarConsolo({ b, aoLancar }: { b: BuildingModel; aoLancar: (id: string) => void }) {
  const { exec } = useBuilding();
  const [viga, setViga] = useState(b.vigas[0]?.id ?? ''), [ponta, setPonta] = useState<'ini' | 'fim'>('ini'), [pilar, setPilar] = useState('');
  const v = b.vigas.find((x) => x.id === viga);
  // pilar que a ponta da viga toca, sugerido enquanto o usuário não escolhe outro
  const sugerido = v ? b.pilares.find((p) => pontaToca(pontaDaViga(v, ponta), p))?.id ?? '' : '';
  const pil = pilar || sugerido;
  const [g, setG] = useState<{ b?: number; h?: number; hp?: number; a?: number; c?: number; l?: number; ba?: number; hd?: number }>({});
  const p = b.pilares.find((x) => x.id === pil);
  const pad = v && p ? consoloPadrao(v.secao.b, v.secao.h, p, faceDoPilar(p, pontaDaViga(v, ponta))) : null;
  const m = (x?: number) => (x === undefined ? undefined : x / 100);
  return (
    <div data-consolo-lancar>
      <p className="small"><b>Lançar consolo curto</b></p>
      <div className="row wrap u-items-end">
        <Select label="Consolo: viga apoiada" value={viga} options={b.vigas.map((x) => ({ v: x.id, label: x.nome }))} onChange={setViga} />
        <Select label="Consolo: ponta da viga" value={ponta} options={PONTAS} onChange={(x) => { setPonta(x); setPilar(''); }} />
        <Select label="Consolo: pilar" value={pil} options={[{ v: '', label: 'escolha' }, ...b.pilares.map((x) => ({ v: x.id, label: x.nome }))]} onChange={setPilar} />
      </div>
      <div className="row wrap u-items-end">
        <OptNumField label="Consolo: largura b (vazio = padrão)" unit="cm" width={210} value={g.b} onChange={(x) => setG({ ...g, b: x })} />
        <OptNumField label="Consolo: altura h na face (vazio = padrão)" unit="cm" width={240} value={g.h} onChange={(x) => setG({ ...g, h: x })} />
        <OptNumField label="Consolo: altura na ponta (vazio = h/2)" unit="cm" width={230} value={g.hp} onChange={(x) => setG({ ...g, hp: x })} />
        <OptNumField label="Consolo: distância a do aparelho à face (vazio = padrão)" unit="cm" width={300} value={g.a} onChange={(x) => setG({ ...g, a: x })} />
        <OptNumField label="Consolo: balanço c (vazio = padrão)" unit="cm" width={230} value={g.c} onChange={(x) => setG({ ...g, c: x })} />
      </div>
      <div className="row wrap u-items-end">
        <OptNumField label="Consolo: aparelho, comprimento l (vazio = padrão)" unit="cm" width={290} value={g.l} onChange={(x) => setG({ ...g, l: x })} />
        <OptNumField label="Consolo: aparelho, largura (vazio = padrão)" unit="cm" width={260} value={g.ba} onChange={(x) => setG({ ...g, ba: x })} />
        <OptNumField label="Consolo: força horizontal Hd (vazio = mínima)" unit="kN" width={280} value={g.hd} onChange={(x) => setG({ ...g, hd: x })} />
        <Button variant="primary" disabled={!viga || !pil} onClick={() => {
          const ap = g.l !== undefined || g.ba !== undefined ? { aparelho: { l: m(g.l) ?? pad?.aparelho.l ?? 0.15, b: m(g.ba) ?? pad?.aparelho.b ?? 0.2 } } : {};
          const r = exec('consolo.criar', {
            viga, ponta, pilar: pil, ...(g.b !== undefined ? { b: g.b / 100 } : {}), ...(g.h !== undefined ? { h: g.h / 100 } : {}), ...(g.hp !== undefined ? { hp: g.hp / 100 } : {}),
            ...(g.a !== undefined ? { a: g.a / 100 } : {}), ...(g.c !== undefined ? { c: g.c / 100 } : {}), ...ap, ...(g.hd !== undefined ? { hd: g.hd } : {}),
          });
          if (r.ok) { const c = useBuilding.getState().sessao.modelo.consolos?.at(-1); if (c) aoLancar(c.id); }
        }}>Lançar consolo</Button>
      </div>
      <Hint>A ponta da viga precisa tocar o pilar (leve a viga até a face). Modelo: apoio fixo no centro do aparelho, a da face do pilar, só a carga vertical chega ao pilar e a viga fica sem momento na face. O consolo não serve para apoiar pilares.{pad ? ` Padrão para esta ligação: ${fmt(cm(pad.b), 0)} × ${fmt(cm(pad.h), 0)} cm, a = ${fmt(cm(pad.a), 0)} cm, balanço ${fmt(cm(pad.c), 0)} cm.` : ''}</Hint>
    </div>
  );
}

function EditarConsolo({ b, c }: { b: BuildingModel; c: Consolo }) {
  const { exec } = useBuilding();
  const editar = (params: Record<string, unknown>) => exec('consolo.editar', { id: c.id, ...params });
  const pil = b.pilares.find((p) => p.id === c.pilar), vig = b.vigas.find((v) => v.id === c.viga);
  return (
    <div data-consolo-editar={c.id}>
      <p className="small"><b>Editar {c.nome}</b> — pilar {pil?.nome ?? c.pilar}, viga {vig?.nome ?? c.viga} ({c.ponta === 'ini' ? 'ponta inicial' : 'ponta final'})</p>
      <div className="row wrap u-items-end">
        <NumField label="Geometria do consolo: largura b" unit="cm" width={200} value={cm(c.b)} onChange={(x) => editar({ b: x / 100 })} />
        <NumField label="Geometria do consolo: altura h na face" unit="cm" width={230} value={cm(c.h)} onChange={(x) => editar({ h: x / 100 })} />
        <NumField label="Geometria do consolo: altura na ponta" unit="cm" width={230} value={cm(c.hp)} onChange={(x) => editar({ hp: x / 100 })} />
        <NumField label="Geometria do consolo: distância a" unit="cm" width={210} value={cm(c.a)} onChange={(x) => editar({ a: x / 100 })} />
        <NumField label="Geometria do consolo: balanço c" unit="cm" width={210} value={cm(c.c)} onChange={(x) => editar({ c: x / 100 })} />
      </div>
      <div className="row wrap u-items-end">
        <NumField label="Aparelho do consolo: comprimento l" unit="cm" width={230} value={cm(c.aparelho.l)} onChange={(x) => editar({ aparelho: { l: x / 100, b: c.aparelho.b } })} />
        <NumField label="Aparelho do consolo: largura" unit="cm" width={210} value={cm(c.aparelho.b)} onChange={(x) => editar({ aparelho: { l: c.aparelho.l, b: x / 100 } })} />
        <OptNumField label="Força horizontal Hd do consolo (vazio = mínima)" unit="kN" width={290} value={c.hd} onChange={(x) => editar({ hd: x ?? 0 })} />
        <Button variant="danger" onClick={() => exec('consolo.remover', { ids: [c.id] })}>Remover o consolo</Button>
      </div>
      <Hint>Alterar a geometria solta a armadura bloqueada. Calcule o edifício na aba Dimensionamento para ver o tirante, a biela e os erros.</Hint>
    </div>
  );
}

/** Janela dos consolos: lista com a situação do último cálculo, lançamento e edição do escolhido. */
export function JanelaConsolos({ id, onClose }: { id?: string; onClose: () => void }) {
  const b = useBuilding((s) => s.sessao.modelo);
  const dim = useBuilding((s) => (calculoAtual(s) && dimAtual(s) ? s.dim : null));
  const exec = useBuilding((s) => s.exec);
  const [sel, setSel] = useState<string | undefined>(id);
  const c = b.consolos?.find((x) => x.id === (sel ?? id)) ?? b.consolos?.[0];
  const nome = (tipo: 'pilares' | 'vigas', i: string) => b[tipo].find((x) => x.id === i)?.nome ?? i;
  return (
    <Modal titulo="Consolos curtos" onClose={onClose} larga>
      <div data-consolos>
        {!b.consolos?.length
          ? <p className="muted small">Nenhum consolo lançado.</p>
          : (
            <div className="tablewrap">
              <table className="data quadro" data-consolos-lista>
                <thead><tr><th>Consolo</th><th>Pilar</th><th>Viga (ponta)</th><th>b × h / ponta (cm)</th><th>a (cm)</th><th>Aparelho (cm)</th><th>Tipo</th><th>Situação</th><th /></tr></thead>
                <tbody>
                  {b.consolos.map((x) => {
                    const r = dim?.consolos?.find((y) => y.consolo === x.id);
                    return (
                      <tr key={x.id} className={`${x.id === c?.id ? 'sel' : ''} ${r?.status === 'fail' ? 'bad' : ''}`} data-consolo-linha={x.id}>
                        <td className="tl">{x.nome}</td><td className="tl">{nome('pilares', x.pilar)}</td><td className="tl">{nome('vigas', x.viga)} ({x.ponta === 'ini' ? 'inicial' : 'final'})</td>
                        <td>{fmt(cm(x.b), 0)} × {fmt(cm(x.h), 0)} / {fmt(cm(x.hp), 0)}</td><td>{fmt(cm(x.a), 0)}</td><td>{fmt(cm(x.aparelho.l), 0)} × {fmt(cm(x.aparelho.b), 0)}</td>
                        <td className="tl">{r?.tipo ?? '—'}</td><td className="tl">{r ? (r.status === 'ok' ? 'atende' : 'não atende') : 'não calculado'}</td>
                        <td><Button variant="mini" aria-label={`Editar ${x.nome}`} onClick={() => setSel(x.id)}>editar</Button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        {!!b.consolos?.length && (
          <div className="row wrap">
            <Button disabled={!b.consolos.some((x) => x.armadura)} onClick={() => exec('consolo.redimensionar', {})}>Redimensionar todos os consolos</Button>
            <Hint>Solta a armadura bloqueada de todos os consolos: o dimensionamento refaz com os esforços do último cálculo (a vertical vem da envoltória ELU da viga).</Hint>
          </div>
        )}
        {c && <EditarConsolo key={c.id} b={b} c={c} />}
        {c && <ConsoloResultados b={b} id={c.id} />}
        <LancarConsolo b={b} aoLancar={setSel} />
      </div>
    </Modal>
  );
}
