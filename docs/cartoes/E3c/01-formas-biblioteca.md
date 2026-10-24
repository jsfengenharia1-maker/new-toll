# E3c — cartão 1: editor de formas (cubetas) na seção "Tipos de laje"

Executor: Haiku (editor no padrão de `EnchimentosUI`, sem núcleo novo). Regras em `0-leia-primeiro.md`. **Aplicar depois da D7.**

## Onde aparece
Configuração da obra > seção **Tipos de laje** (`TiposLajeGrupo` em `TiposLaje.tsx`, que a Configuração monta): o editor de formas fica logo abaixo dos enchimentos; o título do grupo passa a contar as formas.

## Núcleo usado (já existe)
`formasDisponiveis(b)` (formas da obra e do catálogo da biblioteca de normas, tabela `lajes.formas`), `validarForma`, `geometriaBidirecional` e `TIPOS_FORMA` (`src/core/building/nervuradas.ts`), comando `forma.tipo { acao: criar | editar | copiar | remover, id?, forma?, de?, nome? }`, `exportarTiposLaje`/`importarTiposLaje` (o JSON leva `formas`) e `tipoLaje.importar`. As formas do catálogo são geometrias genéricas, sem dado de fabricante, somente leitura (copiar para editar).

## Rótulos
"Forma da biblioteca", "Nova forma", "Copiar forma", "Remover forma", "Nome da forma", "Tipo da forma", "Enchimento da forma perdida", "Altura da cubeta", "Peças por bloco", "Intereixo da forma na direção X", "Intereixo da forma na direção Y", "Largura da nervura da forma em X", "Largura da nervura da forma em Y", "Peso indicativo da forma", "Volume de concreto indicativo da forma". Atributos de teste: `data-formas-laje`, `data-selos-forma`, `data-volume-forma`, `data-pp-forma`, `data-resumo-forma`, `data-erros-forma`. Os erros dos comandos aparecem no `data-erros-tipos-laje` já existente.

**Arquivo novo** `src/app/edificio/FormasLaje.tsx`
```tsx
// Formas (cubetas) das lajes nervuradas bidirecionais (frente E3c), dentro do grupo "Tipos de laje": biblioteca da obra
// (criar, copiar, editar, remover) e do catálogo da biblioteca de normas (geometrias genéricas, só leitura, a confirmar).
// O dado de forma é do fabricante: o programa só confere a coerência lógica. Comando: `forma.tipo`.
import { useState } from 'react';
import { enchimentosDisponiveis, ENCHIMENTOS_EXEMPLO } from '../../core/building/tiposLaje';
import { formasDisponiveis, geometriaBidirecional, TIPOS_FORMA, validarForma, type FormaLaje, type TipoForma } from '../../core/building/nervuradas';
import type { BuildingModel } from '../../core/building/types';
import { Button, Hint, NumField, OptNumField, Pill, Select, TextField } from '../ui';
import { useBuilding } from './store';

const cm = (m: number) => +(m * 100).toFixed(2);
const f2 = (x: number, n = 2) => String(+x.toFixed(n)).replace('.', ',');
const clone = <T,>(t: T): T => JSON.parse(JSON.stringify(t)) as T;

export function FormasLajeUI({ b, roda }: { b: BuildingModel; roda: (n: string, p: Record<string, unknown>) => boolean }) {
  const [fid, setFid] = useState('');
  const lista = formasDisponiveis(b);
  const f = lista.find((x) => x.id === fid) ?? lista[0];
  const daObra = !!b.tiposLaje?.formas?.some((x) => x.id === f.id);
  const ench = enchimentosDisponiveis(b);
  const enchOpcoes = [...ench, ...ENCHIMENTOS_EXEMPLO.filter((e) => !ench.some((x) => x.id === e.id))];
  const erros = validarForma(f, b);
  const muda = (patch: Partial<FormaLaje>) => roda('forma.tipo', { acao: 'editar', id: f.id, forma: { ...clone(f), ...patch } });
  const nova = () => {
    const id = `forma_${(b.tiposLaje?.formas ?? []).length + 1}`;
    if (roda('forma.tipo', { acao: 'criar', id, forma: { nome: 'Nova forma', tipo: 'recuperavel', altura: 0.25, pecas: 1, intereixo: [0.6, 0.6], bw: [0.1, 0.1] } })) setFid(id);
  };
  const copiar = () => {
    const antes = new Set((b.tiposLaje?.formas ?? []).map((x) => x.id));
    if (roda('forma.tipo', { acao: 'copiar', de: f.id })) {
      const novaF = useBuilding.getState().sessao.modelo.tiposLaje?.formas?.find((x) => !antes.has(x.id));
      if (novaF) setFid(novaF.id);
    }
  };
  const g = geometriaBidirecional(b, { tipo: 'nervurada', forma: f.id, hTotal: f.altura + 0.05, capa: 0.05 });
  return (
    <div data-formas-laje>
      <p className="small"><b>Formas das nervuradas bidirecionais</b></p>
      <div className="row wrap">
        <Select label="Forma da biblioteca" value={f.id} options={lista.map((x) => ({ v: x.id, label: `${x.nome}${b.tiposLaje?.formas?.some((y) => y.id === x.id) ? '' : ' · catálogo'}` }))} onChange={setFid} />
        <Button onClick={nova}>Nova forma</Button>
        <Button onClick={copiar}>Copiar forma</Button>
        <Button variant="danger" disabled={!daObra} onClick={() => { if (roda('forma.tipo', { acao: 'remover', id: f.id })) setFid(''); }}>Remover forma</Button>
      </div>
      <p className="small" data-selos-forma>
        <Pill tone={daObra ? 'ok' : 'na'}>{daObra ? 'editável' : 'somente leitura (catálogo)'}</Pill>
        {!daObra && <Pill tone="warn">genérica, a confirmar</Pill>}
        <Pill tone="na">{f.tipo === 'perdida' ? 'forma perdida' : 'forma recuperável'}</Pill>
      </p>
      <div className="row wrap">
        <TextField label="Nome da forma" value={f.nome} disabled={!daObra} onChange={(x) => x.trim() && muda({ nome: x.trim() })} />
        <Select label="Tipo da forma" value={f.tipo} disabled={!daObra} options={TIPOS_FORMA.map((t) => ({ v: t.v, label: t.rotulo }))}
          onChange={(x: TipoForma) => muda({ tipo: x, enchimento: x === 'perdida' ? f.enchimento ?? 'eps' : undefined })} />
        {f.tipo === 'perdida' && <Select label="Enchimento da forma perdida" value={f.enchimento ?? ''} disabled={!daObra} options={enchOpcoes.map((e) => ({ v: e.id, label: e.nome }))} onChange={(x) => muda({ enchimento: x })} />}
      </div>
      <div className="row wrap">
        <NumField label="Altura da cubeta" unit="cm" width={90} disabled={!daObra} value={cm(f.altura)} onChange={(x) => x > 0 && muda({ altura: x / 100 })} />
        <NumField label="Peças por bloco" width={90} disabled={!daObra} value={f.pecas} onChange={(x) => x >= 1 && muda({ pecas: Math.round(x) })} />
        <NumField label="Intereixo da forma na direção X" unit="cm" width={110} disabled={!daObra} value={cm(f.intereixo[0])} onChange={(x) => x > 0 && muda({ intereixo: [x / 100, f.intereixo[1]] })} />
        <NumField label="Intereixo da forma na direção Y" unit="cm" width={110} disabled={!daObra} value={cm(f.intereixo[1])} onChange={(x) => x > 0 && muda({ intereixo: [f.intereixo[0], x / 100] })} />
        <NumField label="Largura da nervura da forma em X" unit="cm" width={110} disabled={!daObra} value={cm(f.bw[0])} onChange={(x) => x > 0 && muda({ bw: [x / 100, f.bw[1]] })} />
        <NumField label="Largura da nervura da forma em Y" unit="cm" width={110} disabled={!daObra} value={cm(f.bw[1])} onChange={(x) => x > 0 && muda({ bw: [f.bw[0], x / 100] })} />
      </div>
      {daObra && (
        <div className="row wrap">
          <OptNumField label="Peso indicativo da forma" unit="kN/m²" width={120} value={f.pesoM2} onChange={(x) => muda({ pesoM2: x })} />
          <OptNumField label="Volume de concreto indicativo da forma" unit="m³/m²" width={150} value={f.volume} onChange={(x) => muda({ volume: x })} />
        </div>
      )}
      <table className="data quadro" data-resumo-forma>
        <tbody>
          <tr><td className="l">Cubeta em planta (cm)</td><td>{f2((f.intereixo[1] - f.bw[1]) * 100, 1)} × {f2((f.intereixo[0] - f.bw[0]) * 100, 1)}</td></tr>
          <tr><td className="l">Fração da laje ocupada pela cubeta</td><td>{f2(g.fracVazio * 100, 1)} %</td></tr>
          <tr><td className="l">Volume de concreto com mesa de 5 cm (m³/m²)</td><td data-volume-forma>{f2(g.volume, 3)}</td></tr>
          <tr><td className="l">Peso próprio com mesa de 5 cm (kN/m²)</td><td data-pp-forma>{f2(g.pp)}</td></tr>
        </tbody>
      </table>
      {erros.length > 0 && <p className="small bad" role="alert" data-erros-forma>{erros.join(' ')}</p>}
      <Hint>As formas do catálogo são geometrias genéricas (prismáticas), sem dado de fabricante: copie uma para editar ou cadastre a do fabricante escolhido. Peso e volume saem da geometria; os indicativos informados os substituem.</Hint>
    </div>
  );
}
```

## Edições em `src/app/edificio/TiposLaje.tsx`

**Trocar em** `src/app/edificio/TiposLaje.tsx`
```text
import { useBuilding } from './store';
```
por
```text
import { useBuilding } from './store';
import { FormasLajeUI } from './FormasLaje';
```

**Trocar em** `src/app/edificio/TiposLaje.tsx`
```text
(b.tiposLaje?.fichas?.length ?? 0) + (b.tiposLaje?.enchimentos?.length ?? 0) ? ` (${b.tiposLaje?.fichas?.length ?? 0} ficha(s), ${b.tiposLaje?.enchimentos?.length ?? 0} enchimento(s))` : ''
```
por
```text
(b.tiposLaje?.fichas?.length ?? 0) + (b.tiposLaje?.enchimentos?.length ?? 0) + (b.tiposLaje?.formas?.length ?? 0) ? ` (${b.tiposLaje?.fichas?.length ?? 0} ficha(s), ${b.tiposLaje?.enchimentos?.length ?? 0} enchimento(s), ${b.tiposLaje?.formas?.length ?? 0} forma(s))` : ''
```

**Trocar em** `src/app/edificio/TiposLaje.tsx`
```text
        <EnchimentosUI b={b} eid={eid} setEid={setEid} roda={roda} />
```
por
```text
        <EnchimentosUI b={b} eid={eid} setEid={setEid} roda={roda} />
        <FormasLajeUI b={b} roda={roda} />
```

**Trocar em** `src/app/edificio/TiposLaje.tsx`
```text
`${r.fichas.length} ficha(s) e ${r.enchimentos.length} enchimento(s) importados.`
```
por
```text
`${r.fichas.length} ficha(s), ${r.enchimentos.length} enchimento(s) e ${r.formas.length} forma(s) importados.`
```

**Trocar em** `src/app/edificio/TiposLaje.tsx`
```text
const temAlgo = (b.tiposLaje?.fichas?.length ?? 0) + (b.tiposLaje?.enchimentos?.length ?? 0) > 0;
```
por
```text
const temAlgo = (b.tiposLaje?.fichas?.length ?? 0) + (b.tiposLaje?.enchimentos?.length ?? 0) + (b.tiposLaje?.formas?.length ?? 0) > 0;
```

**Trocar em** `src/app/edificio/TiposLaje.tsx`
```text
`${arq.fichas.length} ficha(s), ${arq.enchimentos.length} enchimento(s)`
```
por
```text
`${arq.fichas.length} ficha(s), ${arq.enchimentos.length} enchimento(s), ${(arq.formas ?? []).length} forma(s)`
```

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`. O e2e do fluxo `E3c` (cartão 4) cobre este editor.
