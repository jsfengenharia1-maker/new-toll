// Biblioteca de componentes do Statikos. Toda peça de interface reutilizável mora aqui e se veste
// só com classes de design/global.css (tokens + componentes). Ver docs/design-system.md.
import { zip } from '../../core/zip';
import { useEffect, useState, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';

export type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger';
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/** Botão de ação. `variant`: primary (ação principal), ghost (secundária discreta), danger (destrutiva). */
export function Button({ variant = 'default', className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button type={type} className={cx('btn', variant !== 'default' && variant, className)} {...rest} />;
}

/** Botão-etiqueta alternável (filtros, seleção múltipla). */
export function Chip({ on, className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { on?: boolean }) {
  return <button type={type} className={cx('chip', on && 'on', className)} {...rest} />;
}

export type Tone = 'ok' | 'warn' | 'bad' | 'na';
/** Etiqueta de situação (atende / revisar / não atende / sem verificação). */
export function Pill({ tone, big, className, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone; big?: boolean }) {
  return <span className={cx('pill', big && 'big', tone, className)} {...rest} />;
}

/** Observação curta abaixo de um bloco; `tone="bad"` para problema. */
export function Note({ tone, className, ...rest }: HTMLAttributes<HTMLDivElement> & { tone?: 'bad' }) {
  return <div className={cx('note', tone, className)} {...rest} />;
}

/** Mensagem de erro em destaque; `compact` sem as margens do painel. */
export function Alert({ compact, className, ...rest }: HTMLAttributes<HTMLDivElement> & { compact?: boolean }) {
  return <div className={cx('alert', compact && 'compact', className)} {...rest} />;
}

/** Ocupa o espaço livre numa linha flex (empurra o que vem depois para a direita). */
export function Spacer() {
  return <span className="spacer" />;
}


let uid = 0;
export function useId(prefix: string) {
  const [id] = useState(() => `${prefix}-${++uid}`);
  return id;
}

export function NumField({ label, value, onChange, unit, step = 'any', width, disabled }: {
  label: string; value: number; onChange: (v: number) => void; unit?: string; step?: string; width?: number; disabled?: boolean;
}) {
  const id = useId('num');
  const [txt, setTxt] = useState(fmtIn(value));
  useEffect(() => setTxt(fmtIn(value)), [value]);
  const commit = () => {
    const v = parseFloat(txt.replace(',', '.'));
    if (Number.isFinite(v) && v !== value) onChange(v); else setTxt(fmtIn(value));
  };
  return (
    <label className="field" htmlFor={id} style={width ? { width } : undefined}>
      <span className="flabel">{label}</span>
      <span className="finput">
        <input id={id} inputMode="decimal" value={txt} step={step} disabled={disabled}
          onChange={(e) => setTxt(e.target.value)} onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
        {unit && <span className="unit">{unit}</span>}
      </span>
    </label>
  );
}

function fmtIn(v: number) {
  if (!Number.isFinite(v)) return '';
  const r = Math.round(v * 1e9) / 1e9;
  return String(r).replace('.', ',');
}

export function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId('txt');
  const [txt, setTxt] = useState(value);
  useEffect(() => setTxt(value), [value]);
  return (
    <label className="field grow" htmlFor={id}>
      <span className="flabel">{label}</span>
      <span className="finput"><input id={id} value={txt} onChange={(e) => setTxt(e.target.value)} onBlur={() => txt !== value && onChange(txt)} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} /></span>
    </label>
  );
}

export function Seg<T extends string>({ value, options, onChange, small }: { value: T; options: { v: T; label: ReactNode; title?: string }[]; onChange: (v: T) => void; small?: boolean }) {
  return (
    <div className={`seg${small ? ' small' : ''}`} role="radiogroup">
      {options.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v} className={value === o.v ? 'on' : ''} title={o.title} onClick={() => onChange(o.v)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Group({ title, children, aside, open = true }: { title: string; children: ReactNode; aside?: ReactNode; open?: boolean }) {
  return (
    <details className="group" open={open}>
      <summary><span>{title}</span>{aside && <span className="aside" onClick={(e) => e.preventDefault()}>{aside}</span>}</summary>
      <div className="gbody">{children}</div>
    </details>
  );
}

export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId('chk');
  return (
    <label className="check" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function Select<T extends string | number>({ label, value, options, onChange }: { label?: string; value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  const id = useId('sel');
  return (
    <label className="field grow" htmlFor={id}>
      {label && <span className="flabel">{label}</span>}
      <span className="finput">
        <select id={id} value={String(value)} onChange={(e) => { const o = options.find((x) => String(x.v) === e.target.value); if (o) onChange(o.v); }}>
          {options.map((o) => <option key={String(o.v)} value={String(o.v)}>{o.label}</option>)}
        </select>
      </span>
    </label>
  );
}

/** Barra deslizante com o valor ao lado (transparência, velocidade, ângulos). */
export function Slider({ label, value, min, max, step = 1, unit, onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }) {
  const id = useId('sld');
  return (
    <label className="slider" htmlFor={id}>
      <span>{label}</span>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
      <output htmlFor={id}>{Math.round(value * 10) / 10}{unit}</output>
    </label>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="hint">{children}</p>;
}

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

type DL = { save: (r: { filename: string; data: string | Uint8Array }) => Promise<unknown> } | null;
/** Extensões que o salvamento do visualizador de artifacts aceita; as outras vão dentro de um .zip. */
const PERMITIDAS = /\.(gif|png|jpe?g|webp|mp4|webm|txt|json|md|docx|pptx|epub|csv|ttf|html|svg|pdf|xlsx|zip)$/i;
let dlPromise: Promise<DL> | null = null;
function viewerDownloads(): Promise<DL> {
  const c = (window as unknown as { claude?: { use?: (n: string) => Promise<DL> } }).claude;
  if (!c?.use) return Promise.resolve(null);
  dlPromise ??= c.use('downloads').catch(() => null);
  return dlPromise;
}

/** Oferece um arquivo: pelo visualizador de artifacts quando disponível, senão download direto. */
export async function download(name: string, content: string | Uint8Array, type: string): Promise<'saved' | 'declined' | 'fallback'> {
  const dl = await viewerDownloads();
  if (dl) {
    const [nome, dados] = PERMITIDAS.test(name) ? [name, content] : [`${name}.zip`, zip([{ nome: name, dados: typeof content === 'string' ? new TextEncoder().encode(content) : content }])];
    try { await dl.save({ filename: nome, data: dados }); return 'saved'; } catch { return 'declined'; }
  }
  try {
    const url = URL.createObjectURL(new Blob([content as BlobPart], { type }));
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch { /* sem suporte */ }
  return 'fallback';
}

/** Campo numérico opcional: vazio = sem valor (undefined). */
export function OptNumField({ label, unit, value, onChange, width }: { label: string; unit?: string; value: number | undefined; onChange: (v: number | undefined) => void; width?: number }) {
  const show = (v: number | undefined) => (v === undefined ? '' : String(v).replace('.', ','));
  const [t, setT] = useState(show(value));
  useEffect(() => setT(show(value)), [value]);
  const commit = () => { if (!t.trim()) { if (value !== undefined) onChange(undefined); return; } const v = parseFloat(t.replace(',', '.')); if (Number.isFinite(v) && v !== value) onChange(v); else setT(show(value)); };
  return (
    <label className="field" style={width ? { width } : undefined}>
      <span className="flabel">{label}</span>
      <span className="finput"><input inputMode="decimal" placeholder="—" aria-label={label} value={t} onChange={(e) => setT(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />{unit && <span className="unit">{unit}</span>}</span>
    </label>
  );
}

/** Célula de tabela numérica opcional (vazio = undefined). */
export function OptNumCell({ value, placeholder, onChange }: { value: number | undefined; placeholder: string; onChange: (v: number | undefined) => void }) {
  const show = (v: number | undefined) => (v === undefined ? '' : String(v).replace('.', ','));
  const [t, setT] = useState(show(value));
  useEffect(() => setT(show(value)), [value]);
  return <input className="num" inputMode="decimal" aria-label="parcela permanente" placeholder={placeholder} value={t} onChange={(e) => setT(e.target.value)} onBlur={() => { if (!t.trim()) { if (value !== undefined) onChange(undefined); return; } const v = parseFloat(t.replace(',', '.')); if (Number.isFinite(v) && v !== value) onChange(v); else setT(show(value)); }} />;
}

/** Célula de tabela numérica. */
export function NumCell({ value, onChange, label = 'valor' }: { value: number; onChange: (v: number) => void; label?: string }) {
  const [t, setT] = useState(String(value).replace('.', ','));
  useEffect(() => setT(String(value).replace('.', ',')), [value]);
  return <input className="num" inputMode="decimal" aria-label={label} value={t} onChange={(e) => setT(e.target.value)} onBlur={() => { const v = parseFloat(t.replace(',', '.')); if (Number.isFinite(v) && v !== value) onChange(v); else setT(String(value).replace('.', ',')); }} />;
}

/** Célula de tabela com texto (ou número, com `num`) confirmada no Enter/blur; Esc desfaz. */
export function TextCell({ value, label, onCommit, num: isNum }: { value: string; label: string; onCommit: (v: string) => void; num?: boolean }) {
  const [t, setT] = useState(value);
  useEffect(() => setT(value), [value]);
  return <input aria-label={label} className={isNum ? 'num' : undefined} inputMode={isNum ? 'decimal' : undefined} value={t} onChange={(e) => setT(e.target.value)}
    onBlur={() => { if (t.trim() && t !== value) onCommit(t.trim()); else setT(value); }} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setT(value); (e.target as HTMLInputElement).blur(); } }} />;
}

/** Barra da taxa de utilização (ok ≤ 0,9 < revisar ≤ 1 < falha). */
export function UseBar({ v, na }: { v: number; na: boolean }) {
  if (na) return <span className="muted">—</span>;
  const pct = Math.min(v, 1.5) / 1.5;
  const cls = v > 1 ? 'bad' : v > 0.9 ? 'warn' : 'ok';
  return <span className="usebar" title={`Taxa de utilização ${(v * 100).toFixed(0)}%`}><span className={cls} style={{ width: `${pct * 100}%` }} /><em>{v > 9.99 ? '>999%' : `${(v * 100).toFixed(0)}%`}</em></span>;
}

/** Lista de pares rótulo/valor. */
export function KV({ rows }: { rows: [string, string][] }) {
  return <dl className="kv">{rows.map(([k, v]) => [<dt key={k + 't'}>{k}</dt>, <dd key={k + 'd'}>{v}</dd>])}</dl>;
}

/** Janela sobre a tela (fecha com Esc, clique fora ou o botão). `larga` para tabelas e diagramas. */
export function Modal({ titulo, onClose, larga, children }: { titulo: string; onClose: () => void; larga?: boolean; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-back" role="dialog" aria-label={titulo} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cx('modal', larga && 'larga')}>
        <div className="modal-head"><b>{titulo}</b><Spacer /><Button variant="ghost" onClick={onClose}>Fechar</Button></div>
        {children}
      </div>
    </div>
  );
}
