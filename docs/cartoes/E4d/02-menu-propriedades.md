# E4d — cartão 2: menu da ferramenta e Propriedades da escada (C8.5)

Classe: Haiku. Depende do cartão 1.

## Arquivos (2)
- Alterar `src/app/edificio/EscadaMenu.tsx`
- Alterar `src/app/edificio/EscadaPropriedades.tsx`

## Comportamento
- "Ver detalhe de armadura" do menu da ferramenta Escada deixa de ser desabilitado: abre a janela do cartão 1 (desabilitado só sem escadas).
- Propriedades da escada: grupo "Armadura" (aço em kg sem perdas, famílias bloqueadas) com o botão "Armadura da escada…" que abre a janela já na escada selecionada.

## Regras de todos os cartões
Componentes de `src/app/ui` (nunca `<button>`, `<input>` ou `<select>` crus). Sem cor literal, sem CSS fora de `src/app/design`, toda classe usada já existe no CSS (as novas `escada-arm`, `a-*` entram no cartão 1). Núcleo e opções já existem (`src/core/building/escadasArmadura.ts`, `escadasArmaduraResumo.ts`, `escadasArmaduraDesenho.ts`); estes cartões só desenham. Pontos de inserção descritos por trecho/âncora (texto a procurar), não por número de linha. Cada cartão compila sozinho, na ordem. Não altere valores esperados de teste. Falhou duas vezes: pare e relate.

## Alterações

### Alterar `src/app/edificio/EscadaMenu.tsx`

**Acrescentar em `src/app/edificio/EscadaMenu.tsx` (1/2)** logo depois da linha que contém a âncora `import { useEscadaCalculoUI } from './EscadaCalculoUI';`:
```tsx
import { useEscadaArmaduraUI } from './EscadaArmaduraUI';
```

**Trocar em `src/app/edificio/EscadaMenu.tsx` (2/2)** — a(s) linha(s) que começam com a âncora `<Button variant="mini" disabled title="Disponível na frente E4d">Ver d`:
```tsx
      <Button variant="mini" disabled title="Disponível na frente E4d">Ver detalhe de armadura</Button>
```
por:
```tsx
      <Button variant="mini" disabled={!(b.escadas ?? []).length} title="Armadura e detalhamento de cada lance, com seleção do lance" onClick={() => useEscadaArmaduraUI.getState().abrir()}>Ver detalhe de armadura</Button>
```

### Alterar `src/app/edificio/EscadaPropriedades.tsx`

**Acrescentar em `src/app/edificio/EscadaPropriedades.tsx` (1/3)** logo depois da linha que contém a âncora `import { useEscadaCalculoUI } from './EscadaCalculoUI';`:
```tsx
import { useEscadaArmaduraUI } from './EscadaArmaduraUI';
import { useMemo } from 'react';
import { armarEscadas } from '../../core/building/escadasArmadura';
import { opcoesEmUso, perfilDe } from '../../core/building/opcoes';
```

**Acrescentar em `src/app/edificio/EscadaPropriedades.tsx` (2/3)** logo depois da linha que contém a âncora `const fmt = (v: number) => v.toFixed(2).replace('.', ',');`:
```tsx
  const b = useBuilding((s) => s.sessao.modelo);
  const arm = useMemo(() => (res ? armarEscadas(b, res, opcoesEmUso(b.opcoes, perfilDe(b))).lances.filter((l) => l.nome === e.nome) : []), [b, res, e.nome]);
  const kg = arm.reduce((t, l) => t + l.peso, 0);
```

**Acrescentar em `src/app/edificio/EscadaPropriedades.tsx` (3/3)** logo depois da linha que contém a âncora `</Group>`:
```tsx
      <Group title="Armadura" open={false}>
        <KV rows={[['Aço (sem perdas)', arm.length ? `${fmt(kg)} kg` : '—'], ['Bloqueada', e.armadura?.bloqueadas?.length ? `${e.armadura.bloqueadas.length} família(s)` : 'não']]} />
        <Button variant="mini" onClick={() => useEscadaArmaduraUI.getState().abrir(e.id)}>Armadura da escada…</Button>
      </Group>
```

## Teste
`npx tsc -b`; `npx vitest run src/app/design/design.test.ts --reporter=dot`; o e2e é o do cartão 4.
