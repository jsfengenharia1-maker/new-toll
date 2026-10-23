# N3 — cartão 1: grupo "Biblioteca de normas" na barra lateral do edifício

Classe: Haiku (interface sobre núcleo pronto; segue o padrão de `TabelasArmadura.tsx`: editor tabular, restaurar, importar e exportar).

## Arquivos (2)
1. **Novo** `src/app/edificio/BibliotecaNormas.tsx` com o conteúdo exato abaixo (validado: `npx tsc -b`, `design.test.ts` e e2e `N3` verdes).
2. `src/app/edificio/Edificio.tsx`: `import { BibliotecaNormasGrupo } from './BibliotecaNormas';` junto ao import de `TabelasGrupo` e `<BibliotecaNormasGrupo b={b} />` logo abaixo de `<TabelasGrupo b={b} />`.

## Núcleo usado (já existe, `src/core/normas/`)
`NORMAS` (registro), `normaEmUso(b, id)` (`{ info, linhas, alterada, edicao, nota }`), `linhaVazia(id)`, `celulaTexto`, `exportarNormas(b, ids?)`, `importarNormas(texto)`; comandos `norma.tabela.definir { id, linhas, edicao?, nota? }` / `{ tabelas }` (importação em um passo) e `norma.tabela.restaurar { ids? }`.

## Regras
Componentes de `src/app/ui` (nunca `<button>`, `<input>` ou `<select>` crus; o `<input type="file" hidden>` já é aceito pelo `design.test.ts`, como em `TabelasArmadura.tsx`). Rótulos únicos: "Norma", "Tabela normativa", "<coluna> da linha N", "Edição ou fonte usada", "Nota da obra", botões "Adicionar linha", "Restaurar tabela de fábrica", "Restaurar toda a biblioteca", "Exportar esta tabela", "Exportar a biblioteca", "Importar JSON de normas", arquivo "Arquivo de normas". Sem CSS novo, sem botão na barra da planta.

## Conteúdo de `src/app/edificio/BibliotecaNormas.tsx`
```tsx
// Grupo "Biblioteca de normas" da barra lateral (frente N3): as tabelas normativas que o cálculo lê, com a versão de
// fábrica e a da obra (editor tabular, restaurar, importar e exportar em JSON). Segue o padrão de `TabelasArmadura.tsx`.
import { useRef, useState } from 'react';
import { IDS_NORMAS, NORMAS, celulaTexto, exportarNormas, importarNormas, linhaVazia, normaEmUso, type CelulaNorma, type ColunaNorma, type LinhaNorma } from '../../core/normas';
import type { BuildingModel } from '../../core/building/types';
import { Button, Group, Hint, Pill, Select, TextCell, TextField, download } from '../ui';
import { useStore } from '../store';
import { useBuilding } from './store';

const clone = <T,>(t: T): T => JSON.parse(JSON.stringify(t)) as T;
const NORMAS_LISTA = [...new Set(NORMAS.map((t) => t.norma))];

/** Converte o texto digitado para o tipo da coluna (undefined = inválido). */
function lerCelula(c: ColunaNorma, txt: string): CelulaNorma | undefined {
  const t = txt.trim();
  if (c.tipo === 'texto') return t || undefined;
  if (c.tipo === 'numero') {
    if (c.nulo && (t === '-' || t === '—')) return null;
    const v = parseFloat(t.replace(',', '.'));
    return Number.isFinite(v) ? v : undefined;
  }
  const xs = t.split(/[;\s]+/).filter(Boolean).map((x) => parseFloat(x.replace(',', '.')));
  return xs.length && xs.every(Number.isFinite) ? xs : undefined;
}

export function BibliotecaNormasGrupo({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const [norma, setNorma] = useState(NORMAS_LISTA[0]);
  const [ids, setIds] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string[]>([]);
  const arq = useRef<HTMLInputElement>(null);
  const daNorma = NORMAS.filter((t) => t.norma === norma);
  const id = daNorma.some((t) => t.id === ids[norma]) ? ids[norma] : daNorma[0].id;
  const u = normaEmUso(b, id), info = u.info;
  const alteradas = IDS_NORMAS.filter((i) => b.normas?.[i]);
  const grava = (linhas: LinhaNorma[], extra: { edicao?: string; nota?: string } = {}) => {
    const r = exec('norma.tabela.definir', { id, linhas, edicao: extra.edicao ?? b.normas?.[id]?.edicao, nota: extra.nota ?? b.normas?.[id]?.nota });
    setMsg(r.ok ? [] : r.erros.map((e) => e.mensagem));
  };
  const edita = (i: number, c: ColunaNorma, txt: string) => {
    const v = lerCelula(c, txt);
    if (v === undefined) { setMsg([`Valor inválido em "${c.rotulo}" (linha ${i + 1}).`]); return; }
    const l = clone(u.linhas); l[i][c.chave] = v; grava(l);
  };
  const importar = async (f: File) => {
    const r = importarNormas(await f.text());
    if (!r.ok) { setMsg(r.erros); return; }
    const r2 = exec('norma.tabela.definir', { tabelas: r.tabelas });
    setMsg(r2.ok ? [] : r2.erros.map((e) => e.mensagem));
    if (r2.ok) useStore.getState().set({ message: `${Object.keys(r.tabelas).length} tabela(s) normativa(s) importada(s).` });
  };
  return (
    <div data-grupo-normas>
      <Group title={`Biblioteca de normas${alteradas.length ? ` (${alteradas.length} alterada${alteradas.length > 1 ? 's' : ''})` : ''}`} open={false}>
        <div className="row wrap">
          <Select label="Norma" value={norma} options={NORMAS_LISTA.map((n) => ({ v: n, label: n }))} onChange={setNorma} />
          <Select label="Tabela normativa" value={id} options={daNorma.map((t) => ({ v: t.id, label: `${t.titulo}${b.normas?.[t.id] ? ' (alterada)' : ''}` }))} onChange={(v) => setIds((x) => ({ ...x, [norma]: v }))} />
        </div>
        <p className="small" data-selos-norma>
          <Pill tone={u.alterada ? 'warn' : 'ok'}>{u.alterada ? 'alterada pela obra' : 'de fábrica'}</Pill>
          {info.aConfirmar && <Pill tone="warn">a confirmar</Pill>}
          <span className="muted"> {u.edicao}</span>
        </p>
        <p className="small muted">{info.fonte}</p>
        <div className="tablewrap">
          <table className="data quadro" data-tabela-norma={id}>
            <thead><tr>{info.colunas.map((c) => <th key={c.chave}>{c.rotulo}{c.unidade ? ` (${c.unidade})` : ''}</th>)}<th /></tr></thead>
            <tbody>
              {u.linhas.map((l, i) => (
                <tr key={i}>
                  {info.colunas.map((c) => (
                    <td key={c.chave}><TextCell num={c.tipo === 'numero'} label={`${c.rotulo} da linha ${i + 1}`} value={l[c.chave] === null ? '-' : celulaTexto(l[c.chave]).replace('.', c.tipo === 'numero' ? ',' : '.')} onCommit={(v) => edita(i, c, v)} /></td>
                  ))}
                  <td><Button variant="danger" aria-label={`Remover linha ${i + 1}`} disabled={!!info.chavesFixas || u.linhas.length < 2} onClick={() => grava(u.linhas.filter((_, k) => k !== i))}>×</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row wrap">
          <TextField label="Edição ou fonte usada" value={b.normas?.[id]?.edicao ?? ''} placeholder={info.edicao} onChange={(v) => grava(u.linhas, { edicao: v })} />
          <TextField label="Nota da obra" value={b.normas?.[id]?.nota ?? ''} onChange={(v) => grava(u.linhas, { nota: v })} />
        </div>
        <div className="row wrap">
          <Button disabled={!!info.chavesFixas} onClick={() => grava([...clone(u.linhas), linhaVazia(id)])}>Adicionar linha</Button>
          <Button disabled={!u.alterada} onClick={() => { exec('norma.tabela.restaurar', { ids: [id] }); setMsg([]); }}>Restaurar tabela de fábrica</Button>
          <Button disabled={!alteradas.length} onClick={() => { exec('norma.tabela.restaurar', {}); setMsg([]); }}>Restaurar toda a biblioteca</Button>
        </div>
        <div className="row wrap">
          <Button onClick={() => { void download(`norma-${id}.json`, exportarNormas(b, [id]), 'application/json'); }}>Exportar esta tabela</Button>
          <Button onClick={() => { void download('biblioteca-normas.json', exportarNormas(b), 'application/json'); }}>Exportar a biblioteca</Button>
          <Button onClick={() => arq.current?.click()}>Importar JSON de normas</Button>
          <input ref={arq} type="file" accept=".json,application/json" hidden aria-label="Arquivo de normas" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importar(f); e.target.value = ''; }} />
        </div>
        {msg.length > 0 && <p className="small bad" role="alert" data-erros-normas>{msg.join(' ')}</p>}
        <Hint>Valores de fábrica sem texto da norma ficam “a confirmar”. Uma tabela alterada vale só nesta obra e aparece no memorial com a edição e a nota informadas. Em tabelas de forma fixa não se acrescentam nem se removem linhas.</Hint>
      </Group>
    </div>
  );
}
```

## Verificação
`npx tsc -b && npx vitest run src/app/design/design.test.ts`
