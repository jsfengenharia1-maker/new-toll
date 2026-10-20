// Editor de sondagens SPT compartilhado: o módulo Fundações (modelo em `foundation`) e a aba Edifício (comandos
// `sondagem.*`) usam este mesmo componente; cada um traz só a forma de gravar a alteração.
import { useEffect, useState } from 'react';
import { Button, Check, Group, Hint, NumField, OptNumField, Select, TextField } from './ui';
import { fmt } from './results';
import { SOIL_LABEL, type Boring, type FoundationParams, type PileSolution, type SoilClass } from '../core/piles';

const SOILS = Object.keys(SOIL_LABEL) as SoilClass[];

function parseSoil(t: string): SoilClass {
  const s = t.toLowerCase();
  if (s.includes('silte') && s.includes('are')) return 'silteArenoso';
  if (s.includes('silte')) return 'silteArgiloso';
  if (s.startsWith('are') || s.includes('areia')) return 'areia';
  return 'argila';
}

/** Campo de N do SPT: confirma ao sair (um passo de histórico por leitura, não por tecla). */
function NCell({ value, label, onCommit }: { value: number; label: string; onCommit: (v: number) => void }) {
  const [t, setT] = useState(String(value));
  useEffect(() => setT(String(value)), [value]);
  const fim = () => { const v = parseInt(t || '0', 10); if (Number.isFinite(v) && v !== value) onCommit(v); else setT(String(value)); };
  return <input aria-label={label} value={t} inputMode="numeric" onChange={(e) => setT(e.target.value)} onBlur={fim} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />;
}

export interface SondagemEditorProps {
  furos: Boring[];
  /** Cota de arrasamento (m), só para marcar a ponta da estaca no gráfico. */
  cutoff: number;
  /** Estaca a marcar no gráfico do furo (módulo Fundações). */
  sol?: (b: Boring) => PileSolution | null;
  /** Aplica `fn` ao furo `i` (a gravação fica por conta de quem usa). */
  onEdit(i: number, fn: (b: Boring) => void, msg?: string): void;
  /** Novo furo; `base` = o furo atual (cópia) ou indefinido quando não há furos. */
  onAdd(base?: Boring): void;
  onRemove(i: number): void;
  /** Média de furos: profundidade e nível d'água (omitido = sem os campos). */
  media?: { depth: FoundationParams['sptAvgDepth']; water: FoundationParams['sptAvgWater']; onChange(p: Partial<Pick<FoundationParams, 'sptAvgDepth' | 'sptAvgWater'>>): void };
  /** Texto de ajuda; padrão: o do módulo. */
  hint?: string;
  /** Mensagem de erro/aviso ao colar texto sem leituras. */
  onMessage?(m: string): void;
  /** O módulo Fundações exige ao menos um furo; no edifício pode-se remover todos. */
  podeRemoverUltimo?: boolean;
}

export function SondagemEditor({ furos, cutoff, sol, onEdit, onAdd, onRemove, media, hint, onMessage, podeRemoverUltimo }: SondagemEditorProps) {
  const [bi, setBi] = useState(0);
  const [paste, setPaste] = useState('');
  const idx = Math.max(0, Math.min(bi, furos.length - 1));
  const b: Boring | undefined = furos[idx];
  const upd = (fn: (x: Boring) => void, msg?: string) => onEdit(idx, fn, msg);
  const colar = () => {
    const rows = paste.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => l.split(/[;\t,]+|\s{2,}/).map((x) => x.trim()));
    const meters = rows.map((r) => {
      const nums = r.map((x) => parseFloat(x.replace(',', '.'))).filter((x) => Number.isFinite(x));
      const N = nums.length >= 2 ? nums[1] : nums[0];
      const soilTxt = r.find((x) => /[a-zA-Z]/.test(x)) ?? '';
      return { N: Math.max(0, Math.round(N ?? 0)), soil: soilTxt ? parseSoil(soilTxt) : 'argila' as SoilClass };
    }).filter((m) => Number.isFinite(m.N));
    if (!meters.length) { onMessage?.('Nada reconhecido. Cole uma linha por metro: “N” ou “prof; N; solo”.'); return; }
    upd((x) => { x.meters = meters; }, `${meters.length} metros de SPT colados em ${b!.name}.`);
    setPaste('');
  };
  return (
    <Group title={`Sondagens SPT (${furos.length})`}>
      <div className="row wrap">
        {b && <Select label="Furo" value={idx} options={furos.map((x, i) => ({ v: i, label: `${x.name}${x.x !== undefined && x.y !== undefined ? ` (${fmt(x.x, 1)}; ${fmt(x.y, 1)})` : ''}` }))} onChange={(v) => setBi(v)} />}
        <button type="button" className="mini" onClick={() => { onAdd(b); setBi(furos.length); }}>+ furo</button>
        {b && (furos.length > 1 || podeRemoverUltimo) && <button type="button" className="mini" onClick={() => { onRemove(idx); setBi(0); }}>remover furo</button>}
      </div>
      {!b && <Hint>Nenhum furo de sondagem. Crie um furo e informe o SPT metro a metro (ou cole do boletim) para a σadm e as estacas pelo SPT.</Hint>}
      {b && (<>
        <div className="row">
          <TextField label="Identificação" value={b.name} onChange={(v) => upd((x) => { x.name = v; })} />
          <NumField label="Nível d'água" unit="m" value={b.water ?? 0} onChange={(v) => upd((x) => { x.water = v > 0 ? v : null; })} />
        </div>
        <div className="row">
          <OptNumField label="x do furo" unit="m" value={b.x} onChange={(v) => upd((x) => { if (v === undefined) delete x.x; else x.x = v; })} />
          <OptNumField label="y do furo" unit="m" value={b.y} onChange={(v) => upd((x) => { if (v === undefined) delete x.y; else x.y = v; })} />
        </div>
        <Check label="Sondagem terminou em impenetrável" checked={b.endImpenetrable} onChange={(v) => upd((x) => { x.endImpenetrable = v; })} />
        <div className="spt">
          <div className="spt-table">
            <div className="spt-h"><span>m</span><span>N</span><span>Solo</span><span /><span /></div>
            {b.meters.map((m, i) => (
              <div className={`spt-r${b.water !== null && i + 1 > b.water ? ' wet' : ''}${m.excluded ? ' excl' : ''}`} key={i} title={m.excluded ? 'Leitura descartada: fica fora da média e é interpolada no furo isolado' : undefined}>
                <span className="muted">{i + 1}</span>
                <NCell label={`N no metro ${i + 1}`} value={m.N} onCommit={(v) => upd((x) => { x.meters[i].N = v; })} />
                <select aria-label={`Solo no metro ${i + 1}`} value={m.soil} onChange={(e) => upd((x) => { x.meters[i].soil = e.target.value as SoilClass; })}>
                  {SOILS.map((s) => <option key={s} value={s}>{SOIL_LABEL[s]}</option>)}
                </select>
                <button type="button" className={`x${m.excluded ? ' on' : ''}`} aria-label={m.excluded ? `Voltar a usar a leitura do metro ${i + 1}` : `Descartar a leitura do metro ${i + 1}`} title={m.excluded ? 'Voltar a usar esta leitura' : 'Descartar esta leitura (fora do padrão)'} onClick={() => upd((x) => { if (x.meters[i].excluded) delete x.meters[i].excluded; else x.meters[i].excluded = true; }, m.excluded ? `Leitura do metro ${i + 1} volta ao cálculo.` : `Leitura do metro ${i + 1} descartada.`)}>⊘</button>
                <button type="button" className="x" aria-label="Remover metro" onClick={() => upd((x) => { x.meters.splice(i, 1); })}>×</button>
              </div>
            ))}
            <button type="button" className="mini" onClick={() => upd((x) => { const last = x.meters.at(-1) ?? { N: 10, soil: 'argila' as SoilClass }; x.meters.push({ ...last }); })}>+ metro</button>
          </div>
          <SptChart b={b} cutoff={cutoff} sol={sol ? sol(b) : null} />
        </div>
        <label className="field" htmlFor="sptpaste"><span className="flabel">Colar do boletim (uma linha por metro: “N” ou “prof; N; solo”)</span>
          <textarea id="sptpaste" rows={3} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'1; 4; argila\n2; 6; silte argiloso'} />
        </label>
        <Button variant="ghost" disabled={!paste.trim()} onClick={colar}>Substituir SPT deste furo pelo texto colado</Button>
      </>)}
      <Hint>{hint ?? 'Cada apoio usa o furo escolhido no seu cartão; em “automático”, o mais próximo quando apoio e furos têm coordenadas, senão o primeiro. Também é possível usar a média de todos os furos ou de alguns. ⊘ descarta uma leitura fora do padrão: na média, o metro usa só os demais furos; no furo isolado, a leitura é interpolada entre as vizinhas.'}</Hint>
      {media && furos.length > 1 && (
        <div className="row">
          <Select label="Média: profundidade" value={media.depth} options={[{ v: 'common', label: 'comum a todos os furos' }, { v: 'max', label: 'até o furo mais profundo' }]} onChange={(v) => media.onChange({ sptAvgDepth: v })} />
          <Select label="Média: nível d'água" value={media.water} options={[{ v: 'shallowest', label: 'o mais raso' }, { v: 'mean', label: 'média dos furos' }]} onChange={(v) => media.onChange({ sptAvgWater: v })} />
        </div>
      )}
    </Group>
  );
}

export function SptChart({ b, cutoff, sol }: { b: Boring; cutoff: number; sol: PileSolution | null }) {
  const n = b.meters.length;
  const W = 150, rowH = 14, top = 18, H = top + n * rowH + 10;
  const Nmax = 50;
  return (
    <svg className="sptchart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Perfil SPT">
      <text x={34} y={11} className="axl">N_SPT</text>
      {[0, 10, 20, 30, 40, 50].map((v) => <line key={v} x1={34 + (v / Nmax) * (W - 44)} x2={34 + (v / Nmax) * (W - 44)} y1={top} y2={H - 10} className="gl" />)}
      {b.meters.map((m, i) => (
        <g key={i}>
          <rect x={0} y={top + i * rowH} width={26} height={rowH} className={`solo-${m.soil}`} />
          <rect x={34} y={top + i * rowH + 2} width={(Math.min(m.N, Nmax) / Nmax) * (W - 44)} height={rowH - 4} className="nbar" />
          <text x={36 + (Math.min(m.N, Nmax) / Nmax) * (W - 44)} y={top + i * rowH + rowH - 4} className="nval">{m.N}</text>
        </g>
      ))}
      {b.water !== null && b.water <= n && <g><line x1={0} x2={W} y1={top + b.water * rowH} y2={top + b.water * rowH} className="wl" /><text x={W - 2} y={top + b.water * rowH - 2} className="axl" textAnchor="end">NA</text></g>}
      {sol && <g><rect x={28} y={top + cutoff * rowH} width={4} height={(sol.L - cutoff) * rowH} className="pilebar" /><text x={2} y={Math.min(H - 1, top + sol.L * rowH + 10)} className="axl" textAnchor="start">ponta {sol.L} m</text></g>}
    </svg>
  );
}
