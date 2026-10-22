# Cartão L1-11 — Componentes `TextArea` e `FilePick` e classes de CSS da L1

Leia só este cartão e os arquivos citados. Não crie arquivos além dos listados. Sem emojis.

## Objetivo
Peças de biblioteca e estilos que as telas dos cartões 13 a 19 usam. Nenhuma tela usa `<input>`, `<textarea>` ou `<button>` crus: tudo passa por `src/app/ui`.

## Arquivos
1. `src/app/ui/index.tsx` (editar)
2. `src/app/design/global.css` (editar: acrescentar ao fim)
Leia antes: `TextField` e `Button` em `ui/index.tsx`; o final de `global.css`; `docs/design-system.md` (regras: sem cor literal, toda classe definida no CSS).

## `ui/index.tsx`
1. Troque a importação do React por `import { useEffect, useRef, useState, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';`.
2. Logo depois de `TextField`, acrescente:
```tsx
/** Campo de texto de várias linhas; confirma ao sair do campo (blur) como o `TextField`. */
export function TextArea({ label, value, onChange, rows = 4, placeholder }: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  const id = useId('txa');
  const [txt, setTxt] = useState(value);
  useEffect(() => setTxt(value), [value]);
  return (
    <label className="field grow" htmlFor={id}>
      <span className="flabel">{label}</span>
      <textarea id={id} rows={rows} value={txt} placeholder={placeholder} onChange={(e) => setTxt(e.target.value)} onBlur={() => txt !== value && onChange(txt)} />
    </label>
  );
}

/** Botão que abre o seletor de arquivos; entrega o arquivo escolhido. O `<input>` fica oculto e leva o rótulo como `aria-label`. */
export function FilePick({ label, accept, onFile, disabled }: { label: string; accept?: string; onFile: (f: File) => void; disabled?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <span className="filepick">
      <Button disabled={disabled} onClick={() => ref.current?.click()}>{label}</Button>
      <input ref={ref} type="file" accept={accept} hidden aria-label={label} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
    </span>
  );
}
```

## `global.css` — acrescente ao fim, exatamente
```css
/* L1: assistente de nova obra, guia de etapas e obras recentes */
.nova-obra { display: grid; gap: 10px; min-height: 340px; align-content: start; }
.nova-obra-rodape { display: flex; gap: 8px; align-items: center; justify-content: flex-end; padding-top: 6px; border-top: 1px solid var(--line); }
.nova-obra table.data input { min-width: 0; }
.etapas { display: grid; gap: 4px; }
.etapa { display: flex; gap: 8px; align-items: center; font-size: 12.5px; }
.etapa.indisponivel { opacity: 0.6; }
.etapa-rotulo { min-width: 96px; font-weight: 600; }
.etapa-detalhe { color: var(--muted); font-size: 11.5px; min-width: 0; }
.recentes { display: grid; gap: 6px; }
.recente { display: flex; gap: 8px; align-items: center; justify-content: space-between; padding: 6px 8px; border: 1px solid var(--line); border-radius: 6px; background: var(--surface); }
.recente-info { min-width: 0; display: grid; gap: 1px; }
.recente-nome { font-weight: 600; font-size: 12.5px; }
.recente-meta { color: var(--muted); font-size: 11.5px; }
.filepick { display: inline-flex; }
```

## Verificação
```bash
npx tsc -b && npx vitest run src/app/design/design.test.ts
```
O teste do design system deve continuar verde (ele confere que cada classe usada nos TSX existe no CSS; as classes novas só passam a ser usadas nos cartões seguintes, então não devem acusar sobra).
