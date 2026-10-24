# E4c — cartão 2: capítulo "Escadas: cálculo" do memorial (K1.9.116)

Classe: Haiku (seção de memorial no padrão `MemorialDiagonais.tsx`). Depende do cartão 1 só pelo estilo; não usa o `MemorialEscadas.tsx` da E4a (se ele existir, o capítulo do cálculo vem logo depois dele, no mesmo bloco).

## Arquivos (2)
1. **Novo** `src/app/edificio/MemorialEscadasCalculo.tsx` com o conteúdo exato abaixo (lê o resultado da última análise da obra, `useBuilding().analise.escadas`; a seção só aparece com escadas calculadas).
2. `src/app/edificio/MemorialEdificio.tsx`: `import { MemorialEscadasCalculo } from './MemorialEscadasCalculo';` ao lado de `import { MemorialInclinadas } from './MemorialInclinadas';` e `<MemorialEscadasCalculo b={b} h2={h2} />` logo acima de `<MemorialCortes b={b} dim={dim} h2={h2} />` (se o `<MemorialEscadas b={b} h2={h2} />` da E4a já estiver ali, colocar o do cálculo imediatamente depois dele).

## Núcleo usado (já existe)
`escadasCalculoNoMemorial(b, res): LinhaMemorialCalculoEscada[]` ({ escada, lance?, secao ('Modelo' | 'Apoios' | 'Reações' | 'Esforços e deslocamentos' | 'Avisos'), rotulo, valor, aConfirmar? }); linhas gerais por escada (método, concreto, cargas, continuidade da laje, apoios, transmissão) e, por lance, malha, cargas aplicadas, apoios, reações (G e Q em kN e kN/m, grupo), momentos de cálculo e deslocamentos.

## Regras de todos os cartões
Componentes de `src/app/ui` (nunca `<button>`, `<input>` ou `<select>` crus). Sem cor literal, sem CSS fora de `src/app/design`, toda classe usada já existe no CSS (`data`, `quadro`, `avoid`, `small`, `l`). Núcleo e opções já existem (`src/core/building/escadasCalculo.ts`, `escadasResumo.ts`); estes cartões só desenham. Pontos de inserção descritos por trecho/âncora (texto a procurar), não por número de linha: a D7 mexe agora no Navegador, nas Propriedades e na faixa. Cada cartão compila sozinho (`npx tsc -b`), na ordem 01, 02, 03; validado em 24/10/2026 aplicando e revertendo (`npx tsc -b`, `src/app/design/design.test.ts` e o fluxo e2e `E4c`). Falhou duas vezes: parar e relatar.

## Conteúdo de `src/app/edificio/MemorialEscadasCalculo.tsx`
```tsx
// Memorial das escadas, cálculo (E4c): modelo, malha, apoios, reações, esforços e deslocamentos de cada lance, com a marca
// "a confirmar" onde a premissa espera o programa de referência. As linhas vêm de `escadasCalculoNoMemorial` (núcleo); a seção
// só aparece com escadas calculadas (a análise da obra guarda o resultado) e entra no capítulo "Escadas" do memorial.
import type { ReactNode } from 'react';
import { escadasCalculoNoMemorial } from '../../core/building/escadasResumo';
import type { BuildingModel } from '../../core/building/types';
import { useBuilding } from './store';

export function MemorialEscadasCalculo({ b, h2 }: { b: BuildingModel; h2: (t: string) => ReactNode }) {
  const res = useBuilding((s) => s.analise?.escadas);
  if (!res?.lances.length) return null;
  const linhas = escadasCalculoNoMemorial(b, res);
  const escadas = [...new Set(linhas.map((l) => l.escada))];
  return (
    <>
      {h2('Escadas: cálculo')}
      <div data-memorial-escadas-calculo>
        {escadas.map((nome) => (
          <div className="avoid" key={nome} data-memorial-escada-calculo={nome}>
            <h3>Escada {nome}</h3>
            <table>
              <thead><tr><th className="l">Seção</th><th className="l">Item</th><th className="l">Valor</th></tr></thead>
              <tbody>{linhas.filter((l) => l.escada === nome).map((l, i) => <tr key={i}><td className="l">{l.secao}</td><td className="l">{l.rotulo}</td><td className="l">{l.valor}{l.aConfirmar ? ' [a confirmar]' : ''}</td></tr>)}</tbody>
            </table>
          </div>
        ))}
        <p className="small">As escadas não entram na análise global: a influência das ações horizontais sobre elas é grande e fora da prática usual. As reações aplicadas à estrutura são as das tabelas acima (cargas lineares uniformes nos casos permanente e variável).</p>
      </div>
    </>
  );
}
```

## Teste
`npx tsc -b`; `npx vitest run src/app/design/design.test.ts --reporter=dot`; o e2e é o do cartão 3.
