# Cartão E2a-1 — editor da seção da viga (tipo, mesa, chata, não estrutural e amarração)

Executor: Haiku. Depende só do núcleo da E2a (comando `viga.editar` ampliado e `secaoViga.ts`). Cartões seguintes: `2-planta-detalhe.md` e `3-memorial-e2e.md`.

## Regras (valem para todo o cartão)
- Só interface. **Não altere nada em `src/core/`** (o núcleo da E2a está pronto e testado em `src/core/building/secaoVigas.test.ts`). Componentes só de `src/app/ui` (nunca controles crus); sem cor literal, sem CSS novo, sem estilo inline (as classes usadas já existem em `global.css`); nenhum botão novo na barra da planta.
- Os rótulos abaixo são **exatos e únicos** no escopo em que o e2e os procura: não os renomeie, não acrescente `unit` aos campos que já o trazem no rótulo e mantenha o `aria-label` igual ao rótulo. No e2e, `getByLabel(..., { exact: true })` para `Check` e botões; para `NumField`, `OptNumField` e `Select` (o nome acessível inclui valor ou unidade) use regex ancorada no início, como `getByLabel(/^Tipo da seção/)`.
- Aplique as edições na ordem. Se um texto a localizar não existir (outro agente mexeu no arquivo), pare e descreva o que encontrou: não improvise.

## O que o núcleo já entrega (não reimplemente)
- `Viga.mesa?: { tipo: 'T' | 'L'; bf?; hf?; a? }` (m), `Viga.chata`, `Viga.estrutural?: false` e `Viga.amarracao`. Comandos `viga.editar { id, mesa: { tipo: 'ret' | 'T' | 'L', bf?, hf?, a? }, chata, estrutural, amarracao }` (`mesa.tipo = 'ret'` remove a mesa; `chata: true` iguala a altura à da laje que a viga contorna, erro `VIGA_CHATA_SEM_LAJE` se nenhuma laje a toca) e o `lote` para vários.
- `src/core/building/secaoViga.ts`: `mesaDaViga(b, v)` (mesa colaborante automática da NBR 6118 14.6.2.2 ou informada; `null` se retangular ou sem laje; traz `bf`, `hf`, `b1`, `a`, `automatica`, `texto`), `alturaVigaChata(b, v)` (m ou `null`), `contornoSecaoViga(bw, h, mesa, invertida)` (polígono da prévia), `resumoSecoesVigas(b)` (quadro do memorial).
- `DetalheViga.cantosMesa?: { n, phi, s0, s1, comprimento, bf, hf }` (barras de canto da mesa, opção `mesaBarrasCanto`) e as opções `mesaRigidez`, `mesaDimensionamento` (aparecem sozinhas no grupo Opções de cálculo).

## 1. Criar `src/app/edificio/SecaoVigaUI.tsx` (arquivo novo, cole inteiro)
```tsx
// Seção da viga (E2a, interface): tipo (retangular, T ou L), mesa colaborante automática ou informada, viga chata, não
// estrutural e de amarração, com a prévia da seção em SVG. O cálculo (largura colaborante, altura da chata) está em
// core/building/secaoViga.ts; aqui só se lançam os comandos `viga.editar` (um passo só para a seleção).
import { Check, Hint, OptNumField, Select } from '../ui';
import { alturaVigaChata, contornoSecaoViga, mesaDaViga } from '../../core/building/secaoViga';
import type { BuildingModel, Viga } from '../../core/building/types';
import { useBuilding } from './store';

const cm = (v: number) => Math.round(v * 1000) / 10;
const fmt = (v: number, d = 1) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');
const TIPOS: { v: 'ret' | 'T' | 'L'; label: string }[] = [
  { v: 'ret', label: 'retangular' }, { v: 'T', label: 'T (mesa dos dois lados)' }, { v: 'L', label: 'L (mesa de um lado)' },
];

/** Prévia da seção (alma e mesa, em escala) com a cota da largura colaborante. */
export function PreviaSecaoViga({ b, v }: { b: BuildingModel; v: Viga }) {
  const mesa = mesaDaViga(b, v);
  const c = contornoSecaoViga(v.secao.b, v.secao.h, mesa ? { tipo: mesa.tipo, bf: mesa.bf, hf: mesa.hf } : null, !!v.invertida);
  const m = 14, esc = 150 / Math.max(c.largura, c.altura), W = c.largura * esc + 2 * m, H = c.altura * esc + 2 * m + 12;
  const pts = c.pontos.map(([x, y]) => `${(m + x * esc).toFixed(1)},${(m + (c.altura - y) * esc).toFixed(1)}`).join(' ');
  return (
    <svg className="det det-secao" viewBox={`0 0 ${W.toFixed(0)} ${H.toFixed(0)}`} role="img" aria-label="Prévia da seção da viga" data-secao-previa={mesa ? mesa.tipo : 'ret'}>
      <polygon points={pts} className="det-contorno" />
      <text x={W / 2} y={H - 3} textAnchor="middle" className="det-txt cota">
        {mesa ? `${mesa.tipo}: bf ${fmt(mesa.bf * 100)} · hf ${fmt(mesa.hf * 100)} · bw ${fmt(v.secao.b * 100)} · h ${fmt(v.secao.h * 100)} cm` : `${fmt(v.secao.b * 100)} × ${fmt(v.secao.h * 100)} cm`}
      </text>
    </svg>
  );
}

/** Editor da seção da seleção de vigas (o primeiro elemento mostra o valor; a edição vale para todos). */
export function SecaoDaViga({ b, vigas }: { b: BuildingModel; vigas: Viga[] }) {
  const { exec } = useBuilding();
  const v0 = vigas[0];
  if (!v0) return null;
  const lote = (params: Record<string, unknown>) => exec('lote', { comandos: vigas.map((x) => ({ nome: 'viga.editar', params: { id: x.id, ...params } })) });
  const mesa = mesaDaViga(b, v0), tipo = v0.mesa?.tipo ?? 'ret';
  /** Mesa nova a partir da atual: `bf`/`hf` ausentes (vazios) voltam ao automático. */
  const novaMesa = (patch: { tipo?: 'ret' | 'T' | 'L'; bf?: number | null; hf?: number | null }) => {
    const t = patch.tipo ?? tipo;
    if (t === 'ret') return { tipo: 'ret' as const };
    const bf = patch.bf === undefined ? v0.mesa?.bf : patch.bf ?? undefined, hf = patch.hf === undefined ? v0.mesa?.hf : patch.hf ?? undefined;
    return { tipo: t, ...(bf !== undefined ? { bf } : {}), ...(hf !== undefined ? { hf } : {}) };
  };
  const hChata = alturaVigaChata(b, v0);
  return (
    <div data-secao-viga>
      <p className="small"><b>Seção {vigas.length > 1 ? `de ${vigas.length} vigas` : `de ${v0.nome}`}</b></p>
      <div className="row wrap u-items-end">
        <Select label="Tipo da seção" value={tipo} options={TIPOS} onChange={(t) => lote({ mesa: novaMesa({ tipo: t }) })} />
        {tipo !== 'ret' && (<>
          <OptNumField label="Largura da mesa bf (vazio = colaborante da norma)" unit="cm" width={230} value={v0.mesa?.bf === undefined ? undefined : cm(v0.mesa.bf)} onChange={(x) => lote({ mesa: novaMesa({ bf: x === undefined ? null : x / 100 }) })} />
          <OptNumField label="Espessura da mesa hf (vazio = laje)" unit="cm" width={200} value={v0.mesa?.hf === undefined ? undefined : cm(v0.mesa.hf)} onChange={(x) => lote({ mesa: novaMesa({ hf: x === undefined ? null : x / 100 }) })} />
        </>)}
      </div>
      {mesa && <Hint>{mesa.texto}</Hint>}
      {tipo !== 'ret' && !mesa && <Hint>Sem laje ao lado, a mesa colaborante é nula: informe bf e hf ou lance a laje.</Hint>}
      <PreviaSecaoViga b={b} v={v0} />
      <div className="row wrap">
        <Check label="Viga chata (altura da laje que contorna)" checked={!!v0.chata} disabled={!v0.chata && hChata === null} onChange={(c) => lote({ chata: c })} />
        <Check label="Viga não estrutural (só fecha o contorno do pano)" checked={v0.estrutural === false} onChange={(c) => lote({ estrutural: !c })} />
        <Check label="Viga de amarração (sem flexão vertical)" checked={!!v0.amarracao} onChange={(c) => lote({ amarracao: c })} />
      </div>
      {v0.chata && hChata !== null && Math.abs(hChata - v0.secao.h) > 0.005 && <Hint>A altura da viga ({fmt(v0.secao.h * 100, 0)} cm) difere da laje que ela contorna ({fmt(hChata * 100, 0)} cm).</Hint>}
      <Hint>A mesa entra na rigidez; a flexão usa só a alma, salvo a opção “Vigas T/L: flexão na seção T”. A viga não estrutural fica fora do cálculo e da prancha de vigas.</Hint>
    </div>
  );
}
```

## 2. Editar `src/app/edificio/Vinculos.tsx`
2.1. Depois da última linha `import` do arquivo (a que importa `LanceDoPilar` de `./Transicao`, por volta da linha 10), acrescente:
```tsx
import { SecaoDaViga } from './SecaoVigaUI';
```
2.2. Em `VinculosGrupo`, no bloco `{v0 && (<>`, localize exatamente a linha (e só a primeira ocorrência, logo depois do segundo `<div className="row wrap">` com os `Check` "Torção de equilíbrio" e "Fora do diafragma rígido"):
```tsx
        {vigas.length === 1 && pav && (() => {
```
e insira **antes dela** uma linha:
```tsx
        <SecaoDaViga b={b} vigas={vigas} />
```

## Verificação
`npx tsc -b` sem erros e `npx vitest run src/app/design` verde (nenhuma cor literal, classe sem CSS ou estilo inline). Relate só o resultado.
