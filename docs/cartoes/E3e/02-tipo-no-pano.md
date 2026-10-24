# E3e — cartão 2: "Alveolar" no seletor de tipo de pano (doca Propriedades, grupo "Lajes")

Executor: Haiku (um ramo novo num componente existente, no padrão do cartão 2 da E3c). Regras em `00-leia-primeiro.md`. **Aplicar depois da D7, da E3c e da E3d** (as âncoras usam trechos que a E3c deixou intactos).

## Onde aparece
Doca **Propriedades**, grupo "Lajes": o seletor único "Tipo" ganha "Alveolar"; com ele, "Ficha alveolar do tipo" e "Placa alveolar do tipo" (placas por altura) e o resumo da placa (altura, capa, largura, peso próprio, Mu e VRd por metro) com a marca da ficha. Vale para o tipo de lançamento ("Lançar lajes", "Preencher todos os panos") e para "Aplicar às selecionadas". Fichas de exemplo são copiadas para a obra ao atribuir (o comando faz isso).

## Núcleo usado (já existe)
`fichasAlveolaresDisponiveis(b)`, `geometriaAlveolar(b, tipo)` e `MARCA_FABRICANTE_ALVEOLAR` (`src/core/building/alveolares.ts`); o tipo `{ tipo: 'alveolar', ficha, placa }` (`TipoLaje`); `laje.detectarPanos` e `laje.atribuir` já aceitam o tipo novo. A direção das placas e os demais ajustes do pano ficam no grupo "Lajes alveolares" (cartão 4).

## Rótulos
O "Tipo" continua com esse rótulo e ganha a opção "Alveolar"; novos: "Ficha alveolar do tipo", "Placa alveolar do tipo". Atributo de teste: `data-resumo-tipo-alveolar`.

**Arquivo novo** `src/app/edificio/AlveolarTipo.tsx`
```tsx
// Tipo "Alveolar" no seletor de tipo de pano (frente E3e): ficha (obra, catálogo da biblioteca de normas ou exemplo) e placa por
// altura, com o resumo da placa e a marca da ficha. Os campos valem para o tipo de lançamento (grupo "Lajes") e para a troca do
// tipo dos panos selecionados; a análise e a escolha da placa estão no grupo "Lajes alveolares".
import { fichasAlveolaresDisponiveis, geometriaAlveolar, MARCA_FABRICANTE_ALVEOLAR } from '../../core/building/alveolares';
import type { BuildingModel, TipoLaje } from '../../core/building/types';
import { Hint, Select } from '../ui';

type TipoAlveolar = Extract<TipoLaje, { tipo: 'alveolar' }>;
const f2 = (x: number | undefined, n = 2) => (x === undefined ? '—' : String(+x.toFixed(n)).replace('.', ','));
const FONTE = { obra: 'da obra', catalogo: 'catálogo', exemplo: 'exemplo' } as const;

/** Tipo alveolar inicial: a primeira ficha disponível (a da obra primeiro) e a sua primeira placa. */
export function tipoAlveolarInicial(b: BuildingModel): TipoLaje {
  const f = fichasAlveolaresDisponiveis(b)[0]?.ficha;
  return { tipo: 'alveolar', ficha: f?.id ?? 'ex:alveolar', placa: f?.placas[0]?.id ?? '' };
}

export function AlveolarCampos({ b, tipo, onChange }: { b: BuildingModel; tipo: TipoAlveolar; onChange: (t: TipoLaje) => void }) {
  const todas = fichasAlveolaresDisponiveis(b);
  const atual = todas.find((x) => x.ficha.id === tipo.ficha);
  const g = geometriaAlveolar(b, tipo);
  const marca = g.ficha.ficticio ? 'ficha fictícia (demonstração)' : g.ficha.origem === 'fabricante' ? MARCA_FABRICANTE_ALVEOLAR : 'ficha do usuário, não verificada pelo programa';
  return (
    <>
      <Select label="Ficha alveolar do tipo" value={tipo.ficha} options={todas.map((x) => ({ v: x.ficha.id, label: `${x.ficha.nome} · ${FONTE[x.fonte]}` }))} onChange={(v) => onChange({ tipo: 'alveolar', ficha: v, placa: todas.find((x) => x.ficha.id === v)?.ficha.placas[0]?.id ?? '' })} />
      <Select label="Placa alveolar do tipo" value={tipo.placa} options={(atual?.ficha.placas ?? []).map((p) => ({ v: p.id, label: `${p.id} · h ${f2(p.altura * 100, 0)} cm` }))} onChange={(v) => onChange({ ...tipo, placa: v })} />
      <Hint>
        <span data-resumo-tipo-alveolar>
          Placa {g.placa.id}: altura {f2(g.h * 100, 0)} cm (capa {f2(g.capa * 100, 0)}), largura {f2(g.largura * 100, 0)} cm, peso próprio {f2(g.pp)} kN/m², Mu {f2(g.resist.Mu)} kN·m/m, VRd {f2(g.resist.VRd)} kN/m.
          {g.ausente ? ` ${g.ausente}.` : ''} Sem dado na ficha, a verificação correspondente não é feita. Marca: {marca}.
        </span>
      </Hint>
    </>
  );
}
```

## Edições em `src/app/edificio/Edificio.tsx`

**Trocar em** `src/app/edificio/Edificio.tsx`
```text
import { Pranchas } from './Pranchas';
```
por
```text
import { Pranchas } from './Pranchas';
import { AlveolarCampos, tipoAlveolarInicial } from './AlveolarTipo';
```

**Trocar em** `src/app/edificio/Edificio.tsx`
```text
]} onChange={trocaTipo}
```
por
```text
, { v: 'alveolar', label: 'Alveolar' }]} onChange={(v) => (v === 'alveolar' ? onChange(tipoAlveolarInicial(b)) : trocaTipo(v))}
```

**Trocar em** `src/app/edificio/Edificio.tsx`
```text
: tipo.tipo !== 'trelicada' ? <Hint>Laje de vigotas por ficha ou nervurada moldada
```
por
```text
: tipo.tipo === 'alveolar' ? <AlveolarCampos b={b} tipo={tipo} onChange={onChange} />
        : tipo.tipo !== 'trelicada' ? <Hint>Laje de vigotas por ficha ou nervurada moldada
```

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`. O e2e do fluxo `E3e` (cartão 5) cobre o seletor.
