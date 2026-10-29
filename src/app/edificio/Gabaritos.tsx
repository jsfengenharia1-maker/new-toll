// Gerenciador de gabaritos (vistas), janela rápida de vistas por pavimento e janela de seleção das capturas (L2).
import { useState } from 'react';
import { configuracaoDaMascara, lerConfiguracao } from '../../core/building/lancamentoDxf';
import { gruposDaMascara, pavimentosOrdenados, type Mascara } from '../../core/building/types';
import { PRIORIDADE, type TipoCaptura } from '../../core/geom/snap';
import { Button, Check, ColorField, Dropdown, FilePick, Hint, Input, Modal, Note, NumCell, NumField, Pill, Select, TextCell, download } from '../ui';
import { useStore } from '../store';
import { UNIDADES } from './lancamentoLeitura';
import { PreviaCamadas } from './PreviaCamadas';
import { usePlanta } from './plantaStore';
import { useBuilding } from './store';

const msg = (m: string) => useStore.getState().set({ message: m });

function Vista({ m }: { m: Mascara }) {
  const { sessao, exec } = useBuilding();
  const b = sessao.modelo;
  const [destino, setDestino] = useState('');
  const grupoDestino = destino || b.grupos.find((g) => !gruposDaMascara(m).includes(g.id))?.id || '';
  const salvar = () => void download(`${m.nome}-camadas.json`, JSON.stringify(configuracaoDaMascara(m), null, 2), 'application/json');
  const abrir = async (f: File) => {
    const c = lerConfiguracao(await f.text());
    if (typeof c === 'string') { msg(c); return; }
    exec('mascara.configurar', { id: m.id, configuracao: c });
  };
  return (
    <div className="lanc-corpo">
      <div>
        <div className="row wrap">
          <TextCell value={m.nome} label={`Nome do gabarito ${m.nome}`} onCommit={(v) => { if (v.trim() && v.trim() !== m.nome) exec('mascara.editar', { id: m.id, nome: v }); }} />
          {m.arquivo && <Pill>{m.arquivo.tipo.toUpperCase()}</Pill>}
          <Dropdown aria-label={`Unidade de ${m.nome}`} value={UNIDADES.find((u) => Math.abs(u.v - m.escala) < 1e-12)?.v ?? ''} onChange={(e) => exec('mascara.editar', { id: m.id, escala: +e.target.value })}>
            {!UNIDADES.some((u) => Math.abs(u.v - m.escala) < 1e-12) && <option value="">{`${m.escala} m/un`}</option>}
            {UNIDADES.map((u) => <option key={u.v} value={u.v}>{u.label}</option>)}
          </Dropdown>
        </div>
        <div className="row wrap">
          {b.grupos.map((g) => (
            <Check key={g.id} label={`${m.nome} no grupo ${g.nome}`} checked={gruposDaMascara(m).includes(g.id)} disabled={gruposDaMascara(m).length === 1 && gruposDaMascara(m)[0] === g.id}
              onChange={(v) => exec('mascara.editar', { id: m.id, grupos: v ? [...gruposDaMascara(m), g.id] : gruposDaMascara(m).filter((x) => x !== g.id) })} />
          ))}
        </div>
        <table className="data camadas" aria-label={`Camadas de ${m.nome}`}>
          <thead><tr><th>Camada</th><th title="Visível">vis.</th><th title="Capturável">capt.</th><th title="Textos">txt.</th><th>Apelido</th><th>Cor</th><th>Linha (px)</th></tr></thead>
          <tbody>
            {m.camadas.map((c) => (
              <tr key={c.nome}>
                <td className="tl">{c.nome}</td>
                <td><Input type="checkbox" aria-label={`Camada ${c.nome} visível em ${m.nome}`} checked={c.visivel} onChange={(e) => exec('mascara.camadas', { id: m.id, camadas: [c.nome], visivel: e.target.checked })} /></td>
                <td><Input type="checkbox" aria-label={`Camada ${c.nome} capturável em ${m.nome}`} checked={c.capturavel} onChange={(e) => exec('mascara.camadas', { id: m.id, camadas: [c.nome], capturavel: e.target.checked })} /></td>
                <td><Input type="checkbox" aria-label={`Textos da camada ${c.nome} em ${m.nome}`} checked={c.textos !== false} disabled={!m.geo[c.nome]?.textos.length} onChange={(e) => exec('mascara.camadas', { id: m.id, camadas: [c.nome], textos: e.target.checked })} /></td>
                <td><TextCell value={c.apelido ?? ''} label={`Apelido da camada ${c.nome} em ${m.nome}`} onCommit={(v) => { if (v.trim() !== (c.apelido ?? '')) exec('mascara.camadas', { id: m.id, camadas: [c.nome], apelido: v }); }} /></td>
                <td>
                  <span className="row">
                    <ColorField aria-label={`Cor da camada ${c.nome} em ${m.nome}`} value={c.cor ?? ''} onChange={(v) => exec('mascara.camadas', { id: m.id, camadas: [c.nome], cor: v })} />
                    {c.cor && <Button variant="mini" aria-label={`Cor automática da camada ${c.nome} em ${m.nome}`} onClick={() => exec('mascara.camadas', { id: m.id, camadas: [c.nome], cor: '' })}>auto</Button>}
                  </span>
                </td>
                <td><NumCell value={c.espessura ?? 0} label={`Espessura da camada ${c.nome} em ${m.nome}`} onChange={(v) => exec('mascara.camadas', { id: m.id, camadas: [c.nome], espessura: Math.max(0, v) })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="row wrap">
          <Select label={`Copiar ${m.nome} para o grupo`} value={grupoDestino} options={b.grupos.map((g) => ({ v: g.id, label: g.nome }))} onChange={setDestino} />
          <Button disabled={!grupoDestino} onClick={() => exec('mascara.copiar', { id: m.id, grupos: [grupoDestino] })}>Copiar vista de {m.nome}</Button>
        </div>
        <div className="row wrap">
          <Button disabled={!m.original || (m.escala === m.original.escala && m.rotacao === m.original.rotacao && m.dx === m.original.dx && m.dy === m.original.dy)} onClick={() => exec('mascara.origemOriginal', { id: m.id })}>Origem original de {m.nome}</Button>
          <Button onClick={salvar}>Salvar configuração de {m.nome}</Button>
          <FilePick label={`Abrir configuração de ${m.nome}…`} accept=".json,application/json" onFile={(f) => void abrir(f)} />
          <Button variant="danger" onClick={() => exec('mascara.remover', { id: m.id })}>Remover {m.nome}</Button>
        </div>
      </div>
      <PreviaCamadas geo={m.geo} rotulo={`Prévia da configuração de ${m.nome}`} camadas={m.camadas.map((c) => ({ nome: c.nome, visivel: c.visivel, papel: m.regras?.papeis[c.nome], cor: c.cor }))} />
    </div>
  );
}

export function GerenciadorGabaritos({ onClose, onLancar }: { onClose(): void; onLancar(id: string): void }) {
  const { sessao } = useBuilding();
  const ms = sessao.modelo.mascaras;
  const [sel, setSel] = useState('');
  const m = ms.find((x) => x.id === sel) ?? ms[0];
  return (
    <Modal titulo="Gabaritos e vistas" onClose={onClose} larga>
      <div className="lanc">
        {!m && <Hint>Nenhum gabarito importado. Use “Lançar por DXF/DWG…” no grupo Máscara.</Hint>}
        {m && (
          <>
            <div className="row wrap">
              <Select label="Gabarito" value={m.id} options={ms.map((x) => ({ v: x.id, label: `${x.nome} — ${gruposDaMascara(x).map((g) => sessao.modelo.grupos.find((y) => y.id === g)?.nome ?? g).join(', ')}` }))} onChange={setSel} />
              <Button variant="primary" onClick={() => onLancar(m.id)}>Lançar por camadas a partir de {m.nome}</Button>
            </div>
            <Vista key={m.id} m={m} />
            {m.regras && <Hint>Regras do lançamento: {Object.entries(m.regras.papeis).filter(([, p]) => p !== 'ignorar').map(([c, p]) => `${c} = ${p}`).join('; ') || 'nenhuma camada com papel'}.</Hint>}
          </>
        )}
      </div>
    </Modal>
  );
}

/** Janela rápida: liga e desliga as vistas de cada pavimento (a vista vale para todos os pavimentos do grupo). */
export function VistasRapidas({ onClose }: { onClose(): void }) {
  const { sessao, exec } = useBuilding();
  const b = sessao.modelo;
  return (
    <Modal titulo="Vistas por pavimento" onClose={onClose}>
      <div className="lanc">
        {!b.mascaras.length && <Hint>Nenhum gabarito importado.</Hint>}
        {[...pavimentosOrdenados(b)].reverse().map((p) => {
          const vs = b.mascaras.filter((m) => gruposDaMascara(m).includes(p.grupo));
          return (
            <div key={p.id} className="row wrap">
              <b className="vistas-pav">{p.nome}</b>
              {!vs.length && <span className="muted small">sem vistas</span>}
              {vs.map((m) => <Check key={m.id} label={`${m.nome} em ${p.nome}`} checked={m.visivel !== false} onChange={(v) => exec('mascara.editar', { id: m.id, visivel: v })} />)}
            </div>
          );
        })}
        <Hint>Desligar uma vista a esconde na planta e nas capturas de todos os pavimentos do mesmo grupo.</Hint>
      </div>
    </Modal>
  );
}

const ROTULO_CAPTURA: Record<TipoCaptura, string> = { extremidade: 'Extremidade', intersecao: 'Interseção', meio: 'Ponto médio', centro: 'Centro', quadrante: 'Quadrante', alinhamento: 'Alinhamento', perpendicular: 'Perpendicular', proximo: 'Mais próximo' };

/** Janela de seleção dos modos de captura (F3 abre quando nenhum modo está escolhido). */
export function JanelaCapturas({ onClose }: { onClose(): void }) {
  const pl = usePlanta();
  const troca = (t: TipoCaptura, v: boolean) => { const s = new Set(pl.capturas); if (v) s.add(t); else s.delete(t); pl.set({ capturas: s }); };
  return (
    <Modal titulo="Modos de captura" onClose={onClose}>
      <div className="lanc">
        <div className="row wrap">
          {PRIORIDADE.map((t) => <Check key={t} label={ROTULO_CAPTURA[t]} checked={pl.capturas.has(t)} onChange={(v) => troca(t, v)} />)}
        </div>
        <NumField label="Tolerância do alinhamento" unit="px" value={pl.alinhaPx} min={2} onChange={(v) => pl.set({ alinhaPx: Math.max(2, Math.min(40, Math.round(v))) })} />
        <Hint>Alinhamento: ao lançar, o cursor prende o X ou o Y de pilares, extremidades de vigas, nós e eixos já lançados (a confirmar: tolerância de 8 px). Fica abaixo das capturas exatas.</Hint>
        {!pl.capturas.size && <Note>Nenhum modo escolhido: as capturas ficam desligadas.</Note>}
        <Hint>F3 liga e desliga as capturas na planta; sem nenhum modo escolhido, abre esta janela.</Hint>
        <div className="row wrap">
          <Button onClick={() => pl.set({ capturas: new Set(PRIORIDADE) })}>Todos</Button>
          <Button onClick={() => pl.set({ capturas: new Set() })}>Nenhum</Button>
          <Button variant="primary" onClick={onClose}>Concluir</Button>
        </div>
      </div>
    </Modal>
  );
}
