# E4a — cartão 3: memorial das escadas e e2e `E4a`

Classe: Haiku (seção de memorial no padrão `MemorialInclinadas.tsx`, fluxo e2e). Depende dos cartões 1 e 2.

## Arquivos (3)
1. **Novo** `src/app/edificio/MemorialEscadas.tsx` com o conteúdo exato abaixo.
2. `src/app/edificio/MemorialEdificio.tsx`: `import { MemorialEscadas } from './MemorialEscadas';` ao lado do de `MemorialCortes` e `<MemorialEscadas b={b} h2={h2} />` logo acima de `<MemorialCortes b={b} dim={dim} h2={h2} />`.
3. `e2e/flows.mjs`: acrescentar o fluxo abaixo ao fim do vetor `flows` (depois do último fluxo existente).

## Núcleo usado (já existe)
`escadasNoMemorial(b): LinhaMemorialEscada[]` ({ escada, secao ('Dados comuns' | 'Tipos de lance' | 'Geometria' | 'Cargas' | 'Avisos'), rotulo, valor, aConfirmar? }); a seção só aparece com escadas lançadas.

## Regras
Componentes de `src/app/ui` (nunca `<button>`, `<input>` ou `<select>` crus). Sem cor literal, sem CSS fora de `src/app/design`. Rótulos únicos na tela. Nos testes de interface (`e2e/flows.mjs`), `getByRole`/`getByLabel` com `{ exact: true }`, exceto `NumField` e `Select` (regex ancorada, pois o rótulo leva a unidade). Núcleo e comandos já existem (`src/core/building/escadas.ts`, `src/core/commands/escadas.ts`); estes cartões só desenham e lançam comandos. Validado em 23/10/2026 (`npx tsc -b`, `design.test.ts` e e2e `E4a` verdes) e revertido; aplicar na ordem 01, 02, 03.

## Conteúdo de `src/app/edificio/MemorialEscadas.tsx`
```tsx
// Memorial das escadas (E4a): por escada, os dados comuns, os tipos de lance usados, a geometria resultante, as cargas e os
// avisos, com a marca "a confirmar" onde a convenção ainda espera o manual. As linhas vêm de `escadasNoMemorial` (núcleo).
import type { ReactNode } from 'react';
import { escadasNoMemorial } from '../../core/building/escadas';
import type { BuildingModel } from '../../core/building/types';

export function MemorialEscadas({ b, h2 }: { b: BuildingModel; h2: (t: string) => ReactNode }) {
  const linhas = escadasNoMemorial(b);
  if (!linhas.length) return null;
  const escadas = [...new Set(linhas.map((l) => l.escada))];
  return (
    <>
      {h2('Escadas')}
      <div data-memorial-escadas>
        {escadas.map((nome) => (
          <div className="avoid" key={nome} data-memorial-escada={nome}>
            <h3>Escada {nome}</h3>
            <table>
              <thead><tr><th className="l">Seção</th><th className="l">Item</th><th className="l">Valor</th></tr></thead>
              <tbody>{linhas.filter((l) => l.escada === nome).map((l, i) => <tr key={i}><td className="l">{l.secao}</td><td className="l">{l.rotulo}</td><td className="l">{l.valor}{l.aConfirmar ? ' [a confirmar]' : ''}</td></tr>)}</tbody>
            </table>
          </div>
        ))}
        <p className="small">Escada calculada como elemento isolado, só com os casos gravitacionais (permanente e sobrecarga); geometria e convenções marcadas “a confirmar” aguardam o manual do programa de referência (ver pendências).</p>
      </div>
    </>
  );
}
```

## Fluxo e2e `E4a`
```js
  {
    name: 'E4a: escadas (janela com dados comuns, lances e tipos de lance, prévia em planta e corte, erro de altura em vermelho)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [8, 0], [0, 5], [8, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [8, 0]], [[0, 5], [8, 5]], [[0, 0], [0, 5]], [[8, 0], [8, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.45}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await faixaAba(page, 'Lançamento');
      await page.getByRole('button', { name: 'Escadas…', exact: true }).click();
      const jan = page.getByRole('dialog', { name: 'Escadas', exact: true });
      await jan.waitFor();
      // 1) escada nova com o tipo meia-volta 9 + 9: o espelho padrão (17,5 cm) não fecha os 3 m
      await jan.getByRole('button', { name: 'Criar escada', exact: true }).click();
      await jan.locator('[data-escada-lances]').waitFor();
      await jan.locator('[data-escada-erro="ESCADA_ALTURA"]').waitFor();
      assert.match(await jan.locator('[data-escada-erro="ESCADA_ALTURA"]').innerText(), /18 degraus × 0,175 m = 3,150 m não fecha o desnível de 3,000 m/);
      // 2) dados comuns: espelho de 1/6 m fecha a altura; a prévia em planta e o corte aparecem
      await jan.getByRole('radio', { name: 'Dados comuns', exact: true }).click();
      await jan.getByLabel(/^Espelho \(altura do degrau\)/).fill('0.16667');
      await jan.getByLabel(/^Espelho \(altura do degrau\)/).press('Tab');
      await jan.locator('[data-escada-erro]').waitFor({ state: 'detached' });
      await jan.locator('[data-escada-planta] polygon').first().waitFor();
      assert.equal(await jan.locator('[data-escada-planta] polygon').count(), 3, 'dois lances e um patamar');
      await jan.locator('[data-escada-corte]').waitFor();
      // 3) lances: espessura pré-dimensionada e resumo
      await jan.getByRole('radio', { name: 'Lances', exact: true }).click();
      assert.match(await jan.locator('[data-escada-resumo]').innerText(), /18\s+3,000\s+\d+ \(vão\/30\)/);
      // 4) tipos de lance: o tipo em uso não pode ser removido; criar um tipo novo
      await jan.getByRole('radio', { name: 'Tipos de lance', exact: true }).click();
      const tipo = jan.locator('[data-tipo-lance]').first();
      await tipo.waitFor();
      assert.equal(await tipo.getByRole('button', { name: /^Remover / }).isDisabled(), true);
      await jan.getByLabel('Referência do tipo').last().fill('Reto de 12');
      await jan.getByLabel('Degraus de cada trecho').last().fill('12');
      await jan.getByRole('button', { name: 'Criar tipo de lance', exact: true }).click();
      await jan.locator('[data-tipo-lance="Reto de 12"]').waitFor();
      // desnível inicial menor que 10 cm é recusado
      await jan.getByLabel('Desnível no início do lance').last().fill('0.05');
      await jan.getByLabel('Desnível no início do lance').last().press('Tab');
      await jan.getByRole('button', { name: 'Criar tipo de lance', exact: true }).click();
      await jan.getByText(/o desnível inicial deve ser zero ou pelo menos 10 cm/).waitFor();
      await jan.getByRole('button', { name: 'Fechar', exact: true }).click();
      // 5) memorial: seção Escadas com os dados, a geometria e as cargas
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const me = memo.locator('[data-memorial-escadas]');
      await me.waitFor();
      assert.match(await me.innerText(), /Largura, piso e espelho/);
      assert.match(await me.innerText(), /18 degraus · 3,000 m para um desnível de 3,000 m/);
      assert.match(await me.innerText(), /\[a confirmar\]/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  },
```

## Depois dos testes
Os itens C8.3, C8.4, C8.8 a C8.16, C8.18 a C8.32 seguem Parcial até a E4b (lançamento na planta, edição, biblioteca e C8.17); não mudar a situação nem as contagens dos checklists neste cartão. Rodar `npm run mapa`.
