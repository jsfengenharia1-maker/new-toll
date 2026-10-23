# E4a — cartão 1: aba "Tipos de lance" (componente da janela das escadas)

Classe: Haiku (formulários com `NumField`/`Select` do design system sobre comandos prontos; padrão de `BibliotecaNormas.tsx`).

## Arquivos (1)
1. **Novo** `src/app/edificio/TiposLanceUI.tsx` com o conteúdo exato abaixo. Compila sozinho (nada o importa ainda; o cartão 2 o usa).

## Núcleo usado (já existe)
`TIPOLOGIAS`, `tipologiaInfo`, `TIPOS_LANCE_PREDEFINIDOS`, `tiposLanceEmUso` (`src/core/building/escadas.ts`); comandos `tipoLance.criar { id?, tipo }`, `tipoLance.editar { id, tipo }`, `tipoLance.copiar { de, nome? }`, `tipoLance.remover { id }` (recusa tipo em uso: `TIPO_LANCE_EM_USO`). Predefinidos (`pre:...`) só podem ser copiados; ao usar num lance viram cópia na obra.

## Regras
Componentes de `src/app/ui` (nunca `<button>`, `<input>` ou `<select>` crus). Sem cor literal, sem CSS fora de `src/app/design`. Rótulos únicos na tela. Nos testes de interface (`e2e/flows.mjs`), `getByRole`/`getByLabel` com `{ exact: true }`, exceto `NumField` e `Select` (regex ancorada, pois o rótulo leva a unidade). Núcleo e comandos já existem (`src/core/building/escadas.ts`, `src/core/commands/escadas.ts`); estes cartões só desenham e lançam comandos. Validado em 23/10/2026 (`npx tsc -b`, `design.test.ts` e e2e `E4a` verdes) e revertido; aplicar na ordem 01, 02, 03.

Rótulos: "Referência do tipo", "Tipologia", "Degraus de cada trecho" (ex. `9 + 9`), "Espessura (vazio = vão/30)", "Desnível no início do lance", "Degraus iniciais sobre o piso", "Degraus sobre o patamar", "Largura do vão central (poço)", botões "Criar tipo de lance", "Editar/Copiar/Remover <nome>", "Salvar alterações do tipo".

## Conteúdo de `src/app/edificio/TiposLanceUI.tsx`
```tsx
// Tipos de lance (E4a, interface): lista dos tipos da obra e predefinidos, criação, edição, cópia e remoção (tipo em uso é
// recusado pelo comando). Os campos seguem `TipoLance` em core/building/escadas.ts; a validação é a do comando.
import { useState } from 'react';
import { Button, Group, Hint, Note, NumField, OptNumField, Select, TextField } from '../ui';
import { TIPOLOGIAS, TIPOS_LANCE_PREDEFINIDOS, tiposLanceEmUso, tipologiaInfo, type Tipologia, type TipoLance } from '../../core/building/escadas';
import type { BuildingModel } from '../../core/building/types';
import { useBuilding } from './store';

type Campos = Omit<TipoLance, 'id'>;
const lerTrechos = (t: string) => t.split(/[+;,\s]+/).filter(Boolean).map((x) => parseInt(x, 10));

function Editor({ t, aoSalvar, rotulo }: { t: Campos; aoSalvar: (t: Campos) => string[]; rotulo: string }) {
  const [nome, setNome] = useState(t.nome), [tip, setTip] = useState<Tipologia>(t.tipologia), [trechos, setTrechos] = useState(t.trechos.join(' + '));
  const [esp, setEsp] = useState<number | undefined>(t.espessura), [des, setDes] = useState(t.desnivelInicial ?? 0), [ini, setIni] = useState(t.degrausIniciais ?? 0);
  const [poco, setPoco] = useState(t.poco ?? 0), [pat, setPat] = useState(t.degrausPatamar ?? 0), [msg, setMsg] = useState<string[]>([]);
  const salvar = () => setMsg(aoSalvar({
    nome, tipologia: tip, trechos: lerTrechos(trechos), ...(esp ? { espessura: esp } : {}), ...(des ? { desnivelInicial: des } : {}),
    ...(ini ? { degrausIniciais: ini } : {}), ...(poco ? { poco } : {}), ...(pat ? { degrausPatamar: pat } : {}),
  }));
  return (
    <div>
      <div className="row wrap u-items-end">
        <TextField label="Referência do tipo" value={nome} onChange={setNome} />
        <Select label="Tipologia" value={tip} options={TIPOLOGIAS.map((x) => ({ v: x.v, label: x.rotulo }))} onChange={setTip} />
        <TextField label="Degraus de cada trecho" value={trechos} onChange={setTrechos} />
        <OptNumField label="Espessura (vazio = vão/30)" unit="m" width={150} value={esp} onChange={setEsp} />
      </div>
      <div className="row wrap u-items-end">
        <NumField label="Desnível no início do lance" unit="m" width={160} value={des} onChange={setDes} />
        <NumField label="Degraus iniciais sobre o piso" width={170} value={ini} onChange={(v) => setIni(Math.max(0, Math.round(v)))} />
        <NumField label="Degraus sobre o patamar" width={150} value={pat} onChange={(v) => setPat(Math.max(0, Math.round(v)))} />
        <NumField label="Largura do vão central (poço)" unit="m" width={170} value={poco} onChange={setPoco} disabled={!tipologiaInfo(tip).poco} />
        <Button variant="primary" onClick={salvar}>{rotulo}</Button>
      </div>
      {msg.map((m, i) => <Note key={i} tone="bad">{m}</Note>)}
    </div>
  );
}

export function TiposLanceAba({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const [edit, setEdit] = useState<string | null>(null), [msg, setMsg] = useState<string[]>([]);
  const uso = tiposLanceEmUso(b), obra = b.tiposLance ?? [];
  const roda = (nome: string, p: Record<string, unknown>) => { const r = exec(nome, p); setMsg(r.ok ? [] : r.erros.map((e) => e.mensagem)); return r; };
  return (
    <div data-escada-tipos>
      <Group title="Tipos da obra">
        {!obra.length && <Hint>Nenhum tipo na obra: os predefinidos viram tipos da obra ao serem usados num lance.</Hint>}
        {obra.map((t) => (
          <div key={t.id} data-tipo-lance={t.nome}>
            <div className="row wrap u-items-end">
              <span><b>{t.nome}</b> — {tipologiaInfo(t.tipologia).rotulo}, {t.trechos.join(' + ')} degraus{uso.has(t.id) ? ' (em uso)' : ''}</span>
              <Button variant="mini" onClick={() => setEdit(edit === t.id ? null : t.id)}>Editar {t.nome}</Button>
              <Button variant="mini" onClick={() => roda('tipoLance.copiar', { de: t.id })}>Copiar {t.nome}</Button>
              <Button variant="mini" disabled={uso.has(t.id)} onClick={() => roda('tipoLance.remover', { id: t.id })}>Remover {t.nome}</Button>
            </div>
            {edit === t.id && <Editor t={t} rotulo="Salvar alterações do tipo" aoSalvar={(n) => { const r = exec('tipoLance.editar', { id: t.id, tipo: n }); if (r.ok) setEdit(null); return r.ok ? [] : r.erros.map((e) => e.mensagem); }} />}
          </div>
        ))}
      </Group>
      <Group title="Tipos predefinidos" open={false}>
        {TIPOS_LANCE_PREDEFINIDOS.map((t) => (
          <div key={t.id} className="row wrap u-items-end"><span>{t.nome}</span><Button variant="mini" onClick={() => roda('tipoLance.copiar', { de: t.id })}>Copiar para a obra: {t.nome}</Button></div>
        ))}
      </Group>
      <Group title="Novo tipo de lance">
        <Editor t={{ nome: 'Novo tipo', tipologia: 'reto', trechos: [18] }} rotulo="Criar tipo de lance" aoSalvar={(n) => { const r = exec('tipoLance.criar', { tipo: n }); return r.ok ? [] : r.erros.map((e) => e.mensagem); }} />
      </Group>
      {msg.map((m, i) => <Note key={i} tone="bad">{m}</Note>)}
    </div>
  );
}
```

## Verificação
`npx tsc -b` e `npx vitest run src/app/design/design.test.ts --reporter=dot | tail -8`.
