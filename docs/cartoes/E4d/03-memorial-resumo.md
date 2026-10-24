# E4d — cartão 3: memorial da armadura e aço das escadas no resumo geral (C8.1)

Classe: Haiku. Depende do cartão 1 (a ordem não importa para compilar).

## Arquivos (3)
- **Novo** `src/app/edificio/MemorialEscadasArmadura.tsx`
- Alterar `src/app/edificio/MemorialEdificio.tsx`
- Alterar `src/app/edificio/Detalhamento.tsx`

## Comportamento
- Capítulo "Escadas: armadura e detalhamento" no memorial (`[data-memorial-escadas-armadura]`), logo depois de "Escadas: cálculo".
- Aço das escadas somado ao "Resumo geral de aço" do memorial, ao card "Resumo de aço" e ao CSV do detalhamento; as tabelas e o título do total só mudam quando há escadas (obra sem escada fica idêntica).

## Regras de todos os cartões
Componentes de `src/app/ui` (nunca `<button>`, `<input>` ou `<select>` crus). Sem cor literal, sem CSS fora de `src/app/design`, toda classe usada já existe no CSS (as novas `escada-arm`, `a-*` entram no cartão 1). Núcleo e opções já existem (`src/core/building/escadasArmadura.ts`, `escadasArmaduraResumo.ts`, `escadasArmaduraDesenho.ts`); estes cartões só desenham. Pontos de inserção descritos por trecho/âncora (texto a procurar), não por número de linha. Cada cartão compila sozinho, na ordem. Não altere valores esperados de teste. Falhou duas vezes: pare e relate.

## Alterações

### Arquivo novo `src/app/edificio/MemorialEscadasArmadura.tsx`
Conteúdo exato:
```tsx
// Memorial das escadas, armadura (E4d): critérios, posições de cada trecho, ligações (quinas, esperas e passadores), verificações
// (cortante, fissuração e flecha) e o aço de cada lance, com a marca "a confirmar" onde a premissa espera o programa de referência.
// As linhas vêm de `escadasArmaduraNoMemorial` (núcleo); a seção só aparece com a obra dimensionada e entra no capítulo "Escadas".
import type { ReactNode } from 'react';
import type { Dimensionamento } from '../../core/building/dimensionamento';
import { escadasArmaduraNoMemorial } from '../../core/building/escadasArmaduraResumo';
import type { BuildingModel } from '../../core/building/types';

export function MemorialEscadasArmadura({ b, dim, h2 }: { b: BuildingModel; dim: Dimensionamento | null; h2: (t: string) => ReactNode }) {
  if (!dim?.escadasArmadura?.length) return null;
  const linhas = escadasArmaduraNoMemorial(b, { lances: dim.escadasArmadura, resumoAco: dim.resumoAcoEscadas ?? [] });
  const escadas = [...new Set(linhas.map((l) => l.escada))];
  return (
    <>
      {h2('Escadas: armadura e detalhamento')}
      <div data-memorial-escadas-armadura>
        {escadas.map((nome) => (
          <div className="avoid" key={nome} data-memorial-escada-armadura={nome}>
            <h3>{nome === 'Todas' ? 'Aço das escadas' : `Escada ${nome}`}</h3>
            <table>
              <thead><tr><th className="l">Seção</th><th className="l">Item</th><th className="l">Valor</th></tr></thead>
              <tbody>{linhas.filter((l) => l.escada === nome).map((l, i) => <tr key={i}><td className="l">{l.secao}</td><td className="l">{l.rotulo}</td><td className="l">{l.valor}{l.aConfirmar ? ' [a confirmar]' : ''}</td></tr>)}</tbody>
            </table>
          </div>
        ))}
        <p className="small">Esforços da casca de cada lance (capítulo anterior); armadura como laje maciça. Esperas, passadores, quinas, comprimento disponível em viga chata e profundidade da fundação são premissas a confirmar (Premissas e pendências).</p>
      </div>
    </>
  );
}
```

### Alterar `src/app/edificio/MemorialEdificio.tsx`

**Acrescentar em `src/app/edificio/MemorialEdificio.tsx` (1/4)** logo depois da linha que contém a âncora `import { MemorialEscadasCalculo } from './MemorialEscadasCalculo';`:
```tsx
import { MemorialEscadasArmadura } from './MemorialEscadasArmadura';
```

**Acrescentar em `src/app/edificio/MemorialEdificio.tsx` (2/4)** logo depois da linha que contém a âncora `<MemorialEscadasCalculo b={b} h2={h2} />`:
```tsx
          <MemorialEscadasArmadura b={b} dim={dim} h2={h2} />
```

**Trocar em `src/app/edificio/MemorialEdificio.tsx` (3/4)** — a(s) linha(s) que começam com a âncora `{((dim.resumoAcoVigas?.length ?? 0) > 0 || (dim.resumoAcoPilares?.leng` (até a linha que contém `{([['Vigas', dim.resumoAcoVigas ?? []], ['Pilares', dim.resumoAcoPilar`):
```tsx
            {((dim.resumoAcoVigas?.length ?? 0) > 0 || (dim.resumoAcoPilares?.length ?? 0) > 0 || (dim.resumoAcoLajes?.length ?? 0) > 0 || (dim.resumoAcoVigotas?.length ?? 0) > 0 || (dim.resumoAcoNervuradas?.length ?? 0) > 0 || (dim.resumoAcoParedes?.length ?? 0) > 0 || (dim.resumoTelas?.length ?? 0) > 0) && (<>
              {([['Vigas', dim.resumoAcoVigas ?? []], ['Pilares', dim.resumoAcoPilares ?? []], ['Paredes e pilares-parede', dim.resumoAcoParedes ?? []], ['Lajes maciças', dim.resumoAcoLajes ?? []], ['Lajes treliçadas (adicionais, negativos e distribuição)', dim.resumoAcoVigotas ?? []], ['Lajes nervuradas bidirecionais (nervuras, base e malha da mesa)', dim.resumoAcoNervuradas ?? []], ['Lajes alveolares (negativos na capa)', dim.resumoAcoAlveolares ?? []], ['Total geral (vigas, pilares, paredes, lajes, vigotas, nervuradas e alveolares)', somarResumosAco(dim.resumoAcoVigas ?? [], dim.resumoAcoPilares ?? [], dim.resumoAcoParedes ?? [], dim.resumoAcoLajes ?? [], dim.resumoAcoVigotas ?? [], dim.resumoAcoNervuradas ?? [], dim.resumoAcoAlveolares ?? [])]] as const).map(([tit, rs]) => (
```
por:
```tsx
            {((dim.resumoAcoVigas?.length ?? 0) > 0 || (dim.resumoAcoPilares?.length ?? 0) > 0 || (dim.resumoAcoLajes?.length ?? 0) > 0 || (dim.resumoAcoVigotas?.length ?? 0) > 0 || (dim.resumoAcoNervuradas?.length ?? 0) > 0 || (dim.resumoAcoParedes?.length ?? 0) > 0 || (dim.resumoTelas?.length ?? 0) > 0 || (dim.resumoAcoEscadas?.length ?? 0) > 0) && (<>
              {([['Vigas', dim.resumoAcoVigas ?? []], ['Pilares', dim.resumoAcoPilares ?? []], ['Paredes e pilares-parede', dim.resumoAcoParedes ?? []], ['Lajes maciças', dim.resumoAcoLajes ?? []], ['Lajes treliçadas (adicionais, negativos e distribuição)', dim.resumoAcoVigotas ?? []], ['Lajes nervuradas bidirecionais (nervuras, base e malha da mesa)', dim.resumoAcoNervuradas ?? []], ['Lajes alveolares (negativos na capa)', dim.resumoAcoAlveolares ?? []], ...((dim.resumoAcoEscadas?.length ?? 0) > 0 ? [['Escadas (lances e patamares)', dim.resumoAcoEscadas ?? []] as const] : []), [(dim.resumoAcoEscadas?.length ?? 0) > 0 ? 'Total geral (vigas, pilares, paredes, lajes, vigotas, nervuradas, alveolares e escadas)' : 'Total geral (vigas, pilares, paredes, lajes, vigotas, nervuradas e alveolares)', somarResumosAco(dim.resumoAcoVigas ?? [], dim.resumoAcoPilares ?? [], dim.resumoAcoParedes ?? [], dim.resumoAcoLajes ?? [], dim.resumoAcoVigotas ?? [], dim.resumoAcoNervuradas ?? [], dim.resumoAcoAlveolares ?? [], dim.resumoAcoEscadas ?? [])]] as const).map(([tit, rs]) => (
```

**Trocar em `src/app/edificio/MemorialEdificio.tsx` (4/4)** — a(s) linha(s) que começam com a âncora `<p>Perdas de {fmt(perdasDoResumo(somarResumosAco(dim.resumoAcoVigas ??`:
```tsx
              <p>Perdas de {fmt(perdasDoResumo(somarResumosAco(dim.resumoAcoVigas ?? [], dim.resumoAcoPilares ?? [], dim.resumoAcoParedes ?? [], dim.resumoAcoLajes ?? [], dim.resumoAcoVigotas ?? [], dim.resumoAcoNervuradas ?? [], dim.resumoAcoAlveolares ?? [])), 1)} % sobre o peso (opção "perdas de aço"). Lajes maciças pelo detalhamento; lajes treliçadas pelas barras adicionais, negativos e distribuição (as treliças eletrossoldadas vêm em tabela própria, abaixo, e não entram nos totais de barras); lajes nervuradas seguem estimadas por taxa na tabela de quantitativos e não entram neste resumo.</p>
```
por:
```tsx
              <p>Perdas de {fmt(perdasDoResumo(somarResumosAco(dim.resumoAcoVigas ?? [], dim.resumoAcoPilares ?? [], dim.resumoAcoParedes ?? [], dim.resumoAcoLajes ?? [], dim.resumoAcoVigotas ?? [], dim.resumoAcoNervuradas ?? [], dim.resumoAcoAlveolares ?? [], dim.resumoAcoEscadas ?? [])), 1)} % sobre o peso (opção "perdas de aço"). Lajes maciças pelo detalhamento; lajes treliçadas pelas barras adicionais, negativos e distribuição (as treliças eletrossoldadas vêm em tabela própria, abaixo, e não entram nos totais de barras); lajes nervuradas seguem estimadas por taxa na tabela de quantitativos e não entram neste resumo.</p>
```

### Alterar `src/app/edificio/Detalhamento.tsx`

**Trocar em `src/app/edificio/Detalhamento.tsx` (1/4)** — a(s) linha(s) que começam com a âncora `const lin: string[][] = [...tabela('Resumo de aço das vigas', res), ..`:
```tsx
  const lin: string[][] = [...tabela('Resumo de aço das vigas', res), ...tabela('Resumo de aço dos pilares', resP), ...tabela('Resumo de aço das paredes e pilares-parede', resPar), ...tabela('Resumo de aço das lajes', resL), ...tabela('Resumo de aço das lajes treliçadas (adicionais, negativos e distribuição)', resV), ...tabela('Resumo de aço das lajes nervuradas bidirecionais', resN), ...tabela('Resumo de aço das lajes alveolares (negativos na capa)', dim.resumoAcoAlveolares ?? []), ...tabela('Resumo geral de aço (vigas, pilares, paredes, lajes, vigotas, nervuradas e alveolares)', somarResumosAco(res, resP, resPar, resL, resV, resN, dim.resumoAcoAlveolares ?? []))];
```
por:
```tsx
  const lin: string[][] = [...tabela('Resumo de aço das vigas', res), ...tabela('Resumo de aço dos pilares', resP), ...tabela('Resumo de aço das paredes e pilares-parede', resPar), ...tabela('Resumo de aço das lajes', resL), ...tabela('Resumo de aço das lajes treliçadas (adicionais, negativos e distribuição)', resV), ...tabela('Resumo de aço das lajes nervuradas bidirecionais', resN), ...tabela('Resumo de aço das lajes alveolares (negativos na capa)', dim.resumoAcoAlveolares ?? []), ...((dim.resumoAcoEscadas?.length ?? 0) > 0 ? tabela('Resumo de aço das escadas', dim.resumoAcoEscadas ?? []) : []), ...tabela('Resumo geral de aço (vigas, pilares, paredes, lajes, vigotas, nervuradas e alveolares)', somarResumosAco(res, resP, resPar, resL, resV, resN, dim.resumoAcoAlveolares ?? [], dim.resumoAcoEscadas ?? []))];
```

**Trocar em `src/app/edificio/Detalhamento.tsx` (2/4)** — a(s) linha(s) que começam com a âncora `const perdas = perdasDoResumo(somarResumosAco(res, resP, resPar, resL,`:
```tsx
  const perdas = perdasDoResumo(somarResumosAco(res, resP, resPar, resL, resV, resN, dim.resumoAcoAlveolares ?? []));
```
por:
```tsx
  const perdas = perdasDoResumo(somarResumosAco(res, resP, resPar, resL, resV, resN, dim.resumoAcoAlveolares ?? [], dim.resumoAcoEscadas ?? []));
```

**Acrescentar em `src/app/edificio/Detalhamento.tsx` (3/4)** logo depois da linha que contém a âncora `{resN.length > 0 && <TabelaAco titulo="Lajes nervuradas bidirecionais `:
```tsx
      {(dim.resumoAcoEscadas?.length ?? 0) > 0 && <TabelaAco titulo="Escadas (lances e patamares)" res={dim.resumoAcoEscadas ?? []} marca="escadas" />}
```

**Trocar em `src/app/edificio/Detalhamento.tsx` (4/4)** — a(s) linha(s) que começam com a âncora `<TabelaAco titulo="Total geral (vigas, pilares, paredes, lajes, vigota`:
```tsx
      <TabelaAco titulo="Total geral (vigas, pilares, paredes, lajes, vigotas, nervuradas e alveolares)" res={somarResumosAco(res, resP, resPar, resL, resV, resN, dim.resumoAcoAlveolares ?? [])} marca="geral" />
```
por:
```tsx
      <TabelaAco titulo={(dim.resumoAcoEscadas?.length ?? 0) > 0 ? 'Total geral (vigas, pilares, paredes, lajes, vigotas, nervuradas, alveolares e escadas)' : 'Total geral (vigas, pilares, paredes, lajes, vigotas, nervuradas e alveolares)'} res={somarResumosAco(res, resP, resPar, resL, resV, resN, dim.resumoAcoAlveolares ?? [], dim.resumoAcoEscadas ?? [])} marca="geral" />
```

## Teste
`npx tsc -b`; `npx vitest run src/app/design/design.test.ts --reporter=dot`; o e2e é o do cartão 4.
