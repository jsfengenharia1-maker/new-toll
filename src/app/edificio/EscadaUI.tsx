// Escadas (E4a, interface): janela com as abas Dados comuns, Lances e Tipos de lance, prévia em planta e em corte e
// mensagens de erro geométrico. O cálculo está em core/building/escadas.ts e nos comandos escada.*, lance.* e
// tipoLance.*; aqui só se lançam comandos. O lançamento na planta (cursor, capturas) vem na E4b.
import { useState } from 'react';
import { create } from 'zustand';
import { Button, Check, Group, Hint, Modal, Note, NumField, OptNumField, Select, Seg } from '../ui';
import { geometriaEscada, tiposLanceDisponiveis, type Escada, type GeometriaEscada, type LanceGeo } from '../../core/building/escadas';
import { pavimentosOrdenados, type BuildingModel } from '../../core/building/types';
import { useBuilding } from './store';
import { TiposLanceAba } from './TiposLanceUI';

interface EstadoJanela { aberta: boolean; id?: string; aba?: 'dados' | 'lances' | 'tipos'; abrir: (id?: string, aba?: 'dados' | 'lances' | 'tipos') => void; fechar: () => void }
/** Estado da janela das escadas (a faixa do Lançamento a abre). */
export const useEscadaUI = create<EstadoJanela>((set) => ({ aberta: false, abrir: (id, aba) => set({ aberta: true, id, aba }), fechar: () => set({ aberta: false, id: undefined, aba: undefined }) }));

/** Monta a janela quando aberta (colocada uma vez no Edifício). */
export function EscadaHost() {
  const { aberta, id, aba, fechar } = useEscadaUI();
  return aberta ? <JanelaEscada idInicial={id} abaInicial={aba} onClose={fechar} /> : null;
}

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');

/** Prévia em planta: polígonos dos trechos e patamares, linhas dos degraus e setas de subida do primeiro lance. */
function PreviaPlanta({ g }: { g: GeometriaEscada }) {
  const l = g.lances[0];
  if (!l || !g.caixa) return <Hint>Sem lance válido para desenhar.</Hint>;
  const [x0, y0, x1, y1] = g.caixa, m = 0.3, w = x1 - x0 + 2 * m, h = y1 - y0 + 2 * m;
  const pt = (p: [number, number]) => `${(p[0] - x0 + m).toFixed(3)},${(y1 - p[1] + m).toFixed(3)}`;
  return (
    <svg className="escada-prev" viewBox={`0 0 ${w.toFixed(3)} ${h.toFixed(3)}`} role="img" aria-label="Planta da escada" data-escada-planta>
      {l.trechos.map((t, i) => <polygon key={i} className={t.tipo === 'lance' ? 'e-trecho' : 'e-patamar'} points={t.planta.map(pt).join(' ')} />)}
      {l.degrausLinhas.map((d, i) => <polyline key={i} className="e-degrau" points={`${pt(d.a)} ${pt(d.b)}`} />)}
      {l.setas.map((s, i) => <polyline key={i} className="e-seta" points={`${pt(s[0])} ${pt(s[1])}`} />)}
    </svg>
  );
}

/** Corte longitudinal desenvolvido: comprimento horizontal acumulado (trechos e patamares) contra a cota. */
function PreviaCorte({ l }: { l: LanceGeo }) {
  const pts: [number, number][] = [];
  let s = 0;
  for (const t of l.trechos) {
    if (t.tipo === 'lance') { pts.push([s, t.cotaIni], [s + t.comprimento, t.cotaFim]); s += t.comprimento; }
    else { pts.push([s, t.cotaIni], [s + 1, t.cotaIni]); s += 1; }
  }
  if (!pts.length) return null;
  const zs = pts.map((p) => p[1]), z0 = Math.min(...zs, l.cotaBase), z1 = Math.max(...zs, l.cotaTopo), m = 0.3;
  const w = s + 2 * m, h = z1 - z0 + 2 * m;
  const pt = (p: [number, number]) => `${(p[0] + m).toFixed(3)},${(z1 - p[1] + m).toFixed(3)}`;
  return (
    <svg className="escada-prev" viewBox={`0 0 ${w.toFixed(3)} ${h.toFixed(3)}`} role="img" aria-label="Corte longitudinal da escada" data-escada-corte>
      <polyline className="e-nivel" points={`${pt([0, l.cotaPiso])} ${pt([w, l.cotaPiso])}`} />
      <polyline className="e-nivel" points={`${pt([0, l.cotaTopo])} ${pt([w, l.cotaTopo])}`} />
      <polyline className="e-perfil" points={pts.map(pt).join(' ')} />
    </svg>
  );
}

function Mensagens({ g }: { g: GeometriaEscada }) {
  if (!g.diagnosticos.length) return <Hint>Geometria coerente: sem erros nem avisos.</Hint>;
  return (
    <div data-escada-mensagens>
      {g.diagnosticos.map((d, i) => (d.severidade === 'erro' ? <Note key={i} tone="bad" data-escada-erro={d.codigo}>{d.mensagem}</Note> : <Hint key={i}>{d.mensagem}</Hint>))}
    </div>
  );
}

function NovaEscada({ b, aoCriar }: { b: BuildingModel; aoCriar: (id: string) => void }) {
  const { exec } = useBuilding();
  const [grupo, setGrupo] = useState(b.grupos.find((g) => b.pavimentos.some((p) => p.grupo === g.id))?.id ?? b.grupos[0]?.id ?? '');
  const [x, setX] = useState(0), [y, setY] = useState(0), [ang, setAng] = useState(0);
  const [tipo, setTipo] = useState('pre:meia-volta-9-9');
  const [msg, setMsg] = useState<string[]>([]);
  const criar = () => {
    const r = exec('escada.criar', { grupo, origem: [x, y], angulo: ang, lances: [{ tipo }] });
    if (!r.ok) { setMsg(r.erros.map((e) => e.mensagem)); return; }
    setMsg([]);
    const nova = useBuilding.getState().sessao.modelo.escadas?.at(-1);
    if (nova) aoCriar(nova.id);
  };
  return (
    <Group title="Nova escada">
      <div className="row wrap u-items-end">
        <Select label="Grupo da escada" value={grupo} options={b.grupos.map((g) => ({ v: g.id, label: g.nome }))} onChange={setGrupo} />
        <NumField label="Origem x" unit="m" width={110} value={x} onChange={setX} />
        <NumField label="Origem y" unit="m" width={110} value={y} onChange={setY} />
        <NumField label="Sentido de subida" unit="°" width={110} value={ang} onChange={setAng} />
        <Select label="Tipo do primeiro lance" value={tipo} options={tiposLanceDisponiveis(b).map((t) => ({ v: t.id, label: t.nome }))} onChange={setTipo} />
        <Button variant="primary" disabled={!grupo} onClick={criar}>Criar escada</Button>
      </div>
      {msg.map((m, i) => <Note key={i} tone="bad">{m}</Note>)}
    </Group>
  );
}

/** Dados comuns da escada; `muda` substitui o comando `escada.dados` (a janela "Nova escada" edita os dados ainda não lançados). */
export function DadosComuns({ e, muda: mudaFora }: { e: Escada; muda?: (p: Record<string, unknown>) => unknown }) {
  const { exec } = useBuilding();
  const muda = mudaFora ?? ((p: Record<string, unknown>) => exec('escada.dados', { id: e.id, ...p }));
  return (
    <div data-escada-dados>
      <div className="row wrap u-items-end">
        <NumField label="Largura da escada" unit="m" width={120} value={e.largura} onChange={(v) => muda({ largura: v })} />
        <NumField label="Piso (passo em planta)" unit="m" width={130} value={e.piso} onChange={(v) => muda({ piso: v })} />
        <NumField label="Espelho (altura do degrau)" unit="m" width={150} value={e.espelho} onChange={(v) => muda({ espelho: v })} />
        <Select label="Giro ao subir" value={e.giro ?? 'esq'} options={[{ v: 'esq', label: 'esquerda' }, { v: 'dir', label: 'direita' }]} onChange={(v) => muda({ giro: v })} />
        <Select label="Último degrau" value={e.ultimoDegrau ?? 'patamar'} options={[{ v: 'patamar', label: 'formado pelo patamar' }, { v: 'laje', label: 'sobre a laje inclinada' }]} onChange={(v) => muda({ ultimoDegrau: v })} />
      </div>
      <div className="row wrap u-items-end">
        <Select label="Execução dos degraus" value={e.execucao ?? 'concretados'} options={[{ v: 'concretados', label: 'concretados com a laje' }, { v: 'alvenaria', label: 'em alvenaria' }]} onChange={(v) => muda({ execucao: v })} />
        {e.execucao === 'alvenaria' && <Select label="Bloco dos degraus" value={e.bloco ?? 'ceramico'} options={[{ v: 'ceramico', label: 'cerâmico' }, { v: 'concreto', label: 'de concreto' }]} onChange={(v) => muda({ bloco: v })} />}
        <NumField label="Corrimãos (total)" unit="kN/m" width={120} value={e.corrimao ?? 0} onChange={(v) => muda({ corrimao: v })} />
        <OptNumField label="Revestimento" unit="kN/m²" width={120} value={e.revestimento} onChange={(v) => (v === undefined ? muda({ limpar: ['revestimento'] }) : muda({ revestimento: v }))} />
        <OptNumField label="Sobrecarga" unit="kN/m²" width={120} value={e.sobrecarga} onChange={(v) => (v === undefined ? muda({ limpar: ['sobrecarga'] }) : muda({ sobrecarga: v }))} />
        <Check label="Acesso ao público" checked={e.acesso === 'publico'} onChange={(v) => muda({ acesso: v ? 'publico' : 'privado' })} />
      </div>
      <Hint>Campos vazios de revestimento e sobrecarga seguem as opções “Escadas” (padrão 1,0 kN/m²; 2,5 kN/m², ou 3,0 com acesso ao público; valores a confirmar).</Hint>
    </div>
  );
}

function Lances({ b, e, g }: { b: BuildingModel; e: Escada; g: GeometriaEscada }) {
  const { exec } = useBuilding();
  const tipos = tiposLanceDisponiveis(b), ps = pavimentosOrdenados(b);
  const [novo, setNovo] = useState(tipos[0]?.id ?? '');
  const nomeTipo = (id: string) => tipos.find((t) => t.id === id)?.nome ?? id;
  return (
    <div data-escada-lances>
      {e.lances.map((l, i) => {
        const nPat = Math.max(0, (tipos.find((t) => t.id === l.tipo)?.trechos.length ?? 1) - 1);
        return (
          <Group key={l.id} title={`Lance ${i + 1}: ${nomeTipo(l.tipo)}`}>
            <div className="row wrap u-items-end">
              <Select label={`Tipo do lance ${i + 1}`} value={l.tipo} options={tipos.map((t) => ({ v: t.id, label: t.nome }))} onChange={(v) => exec('lance.editar', { escada: e.id, lance: l.id, tipo: v })} />
              <Select label={`Pavimento de partida do lance ${i + 1}`} value={l.pavimento ?? ''} options={[{ v: '', label: 'automático' }, ...ps.map((p) => ({ v: p.id, label: p.nome }))]}
                onChange={(v) => (v ? exec('lance.editar', { escada: e.id, lance: l.id, pavimento: v }) : exec('lance.editar', { escada: e.id, lance: l.id, padrao: ['pavimento'] }))} />
              <NumField label={`Lances iguais consecutivos ${i + 1}`} width={140} value={l.repetir ?? 1} onChange={(v) => exec('lance.editar', { escada: e.id, lance: l.id, repetir: Math.max(1, Math.round(v)) })} />
              <Button variant="danger" onClick={() => exec('lance.remover', { escada: e.id, lance: l.id })}>Remover lance {i + 1}</Button>
            </div>
            {Array.from({ length: nPat }, (_, k) => {
              const ap = l.patamares?.[k], fr = ap?.apoios?.find((a) => a.borda === 'frontal');
              const grava = (apoiado: boolean, tipo: string, largura: number) => {
                const lista = [...(l.patamares ?? [])];
                while (lista.length <= k) lista.push({ apoiado: false });
                lista[k] = apoiado ? { apoiado: true, apoios: tipo === 'nenhum' ? [] : [{ borda: 'frontal', tipo: tipo as 'tirante', largura }] } : { apoiado: false };
                exec('lance.editar', { escada: e.id, lance: l.id, patamares: lista });
              };
              return (
                <div key={k} className="row wrap u-items-end" data-patamar={k + 1}>
                  <Check label={`Patamar ${k + 1} apoiado (lance ${i + 1})`} checked={!!ap?.apoiado} onChange={(v) => grava(v, fr?.tipo ?? 'alvenaria', fr?.largura ?? 0.15)} />
                  {ap?.apoiado && <Select label={`Apoio frontal do patamar ${k + 1} (lance ${i + 1})`} value={fr?.tipo ?? 'nenhum'} options={[{ v: 'nenhum', label: 'nenhum' }, { v: 'alvenaria', label: 'parede de alvenaria' }, { v: 'concreto', label: 'parede de concreto' }, { v: 'tirante', label: 'tirante no piso de cima' }, { v: 'conector', label: 'conectores de cisalhamento' }]} onChange={(v) => grava(true, v, fr?.largura ?? 0.15)} />}
                  {ap?.apoiado && fr && <NumField label={`Largura do apoio ${k + 1} (lance ${i + 1})`} unit="m" width={130} value={fr.largura} onChange={(v) => grava(true, fr.tipo, v)} />}
                </div>
              );
            })}
          </Group>
        );
      })}
      <div className="row wrap u-items-end">
        <Select label="Tipo do novo lance" value={novo} options={tipos.map((t) => ({ v: t.id, label: t.nome }))} onChange={setNovo} />
        <Button onClick={() => exec('lance.criar', { escada: e.id, tipo: novo })}>Acrescentar lance</Button>
      </div>
      <Resumo g={g} />
    </div>
  );
}

function Resumo({ g }: { g: GeometriaEscada }) {
  if (!g.lances.length) return null;
  return (
    <div className="tablewrap" data-escada-resumo>
      <table className="data quadro">
        <thead><tr><th>Lance</th><th>Pisos (cota)</th><th>Degraus</th><th>Altura vencida (m)</th><th>Espessura (cm)</th><th>Peso próprio (kN/m²)</th></tr></thead>
        <tbody>
          {g.lances.map((l) => (
            <tr key={l.indice}>
              <td className="tl">{l.indice + 1}: {l.tipo?.nome}</td><td>{fmt(l.cotaPiso)} → {fmt(l.cotaTopo)}</td><td>{l.degraus.total}</td><td>{fmt(l.alturaVencida, 3)}</td>
              <td>{fmt(l.espessura.valor * 100, 0)}{l.espessura.automatica ? ' (vão/30)' : ''}</td><td>{fmt(l.cargas.pesoProjecao)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JanelaEscada({ idInicial, abaInicial, onClose }: { idInicial?: string; abaInicial?: 'dados' | 'lances' | 'tipos'; onClose: () => void }) {
  const { sessao } = useBuilding();
  const b = sessao.modelo, escadas = b.escadas ?? [];
  const [sel, setSel] = useState(idInicial ?? escadas[0]?.id ?? '');
  const [aba, setAba] = useState<'dados' | 'lances' | 'tipos'>(abaInicial ?? 'dados');
  const e = escadas.find((x) => x.id === sel) ?? escadas[0];
  const g = e ? geometriaEscada(e, tiposLanceDisponiveis(b), b) : null;
  return (
    <Modal titulo="Escadas" onClose={onClose} larga>
      <div data-escada-janela>
        <div className="row wrap u-items-end">
          {escadas.length > 0 && <Select label="Escada" value={e?.id ?? ''} options={escadas.map((x) => ({ v: x.id, label: x.nome }))} onChange={setSel} />}
        </div>
        <Seg value={aba} options={[{ v: 'dados', label: 'Dados comuns' }, { v: 'lances', label: 'Lances' }, { v: 'tipos', label: 'Tipos de lance' }]} onChange={setAba} />
        {aba === 'tipos' ? <TiposLanceAba b={b} /> : (
          <>
            <NovaEscada b={b} aoCriar={(id) => { setSel(id); setAba('lances'); }} />
            {e && g && (
              <>
                {aba === 'dados' ? <DadosComuns e={e} /> : <Lances b={b} e={e} g={g} />}
                <Mensagens g={g} />
                <div className="row wrap">
                  <PreviaPlanta g={g} />
                  {g.lances[0] && <PreviaCorte l={g.lances[0]} />}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
