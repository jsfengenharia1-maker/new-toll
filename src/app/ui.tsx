import { useEffect, useState, type ReactNode } from 'react';

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
          onKeyDown={(e) => { if (e.key === 'Enter') { commit(); (e.target as HTMLInputElement).blur(); } }} />
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

export function Hint({ children }: { children: ReactNode }) {
  return <p className="hint">{children}</p>;
}

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

type DL = { save: (r: { filename: string; data: string }) => Promise<unknown> } | null;
let dlPromise: Promise<DL> | null = null;
function viewerDownloads(): Promise<DL> {
  const c = (window as unknown as { claude?: { use?: (n: string) => Promise<DL> } }).claude;
  if (!c?.use) return Promise.resolve(null);
  dlPromise ??= c.use('downloads').catch(() => null);
  return dlPromise;
}

/** Oferece um arquivo: pelo visualizador de artifacts quando disponível, senão download direto. */
export async function download(name: string, content: string, type: string): Promise<'saved' | 'declined' | 'fallback'> {
  const dl = await viewerDownloads();
  if (dl) {
    try { await dl.save({ filename: name, data: content }); return 'saved'; } catch { return 'declined'; }
  }
  try {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch { /* sem suporte */ }
  return 'fallback';
}
