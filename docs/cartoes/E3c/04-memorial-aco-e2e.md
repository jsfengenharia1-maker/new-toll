# E3c — cartão 4: memorial das nervuradas, aço no resumo geral, e2e `E3c` e checklists

Classe: Haiku (seção de memorial no padrão `MemorialInclinadas`, uma linha a mais nas tabelas de aço, fluxo e2e e checklists).

## Arquivos (5)
1. **Novo** `src/app/edificio/MemorialNervuradas.tsx` com o conteúdo exato abaixo.
2. `src/app/edificio/MemorialEdificio.tsx`: importar e montar a seção e somar o aço das nervuradas no "Resumo geral de aço" (substituições abaixo; os trechos são únicos no arquivo, localizar por texto).
3. `src/app/edificio/Detalhamento.tsx`: o aço das nervuradas entra no resumo da aba Dimensionamento e no CSV (substituições abaixo).
4. `e2e/flows.mjs`: fluxo `E3c` (inserir no fim do vetor `flows`, imediatamente antes do `];` final, depois do último fluxo existente).
5. Checklists (ver o último item).

## Núcleo usado (já existe)
`nervuradasNoMemorial(b, dim.nervuradas, opcoes)` (`nervuradasDim.ts`), `dim.nervuradas`, `dim.resumoAcoNervuradas` (aço por bitola, com repetições dos pavimentos e perdas; `quantitativosDetalhados` já o soma) e `LinhaAco`/`somarResumosAco` de `Detalhamento.tsx`.

## Regras
Componentes de `src/app/ui` (nunca `<button>`, `<input>` ou `<select>` crus). Rótulos únicos na tela. Sem CSS novo, sem cor literal, sem botão na barra da planta. Nos testes de interface (`e2e/flows.mjs`), `getByRole`/`getByLabel` com `{ exact: true }`, exceto `NumField` e `Select`, cujo rótulo vem com texto extra: nesses, regex ancorada (`/^Forma da nervurada/`). O núcleo e os comandos (`forma.tipo`, `laje.nervurada`, `laje.copiarPanos`, `laje.armaduraBase`, `tipoLaje.importar`) já existem e estão testados; não altere nada de `src/core/`.

Rótulos e atributos: seção "Lajes nervuradas bidirecionais" (`data-memorial-nervuradas`, `data-memorial-nervurada="<id da laje>"`); tabela do resumo de aço "Lajes nervuradas bidirecionais (nervuras, base e malha da mesa)" no memorial e "Lajes nervuradas bidirecionais (nervuras, base e malha da mesa)" na aba Dimensionamento (`marca="nervuradas"`); o total passa a se chamar "Total geral (vigas, pilares, paredes, lajes, vigotas e nervuradas)".

## Conteúdo de `src/app/edificio/MemorialNervuradas.tsx`
```tsx
// Memorial das lajes nervuradas bidirecionais (frente E3c): forma, peso e volume, modelo da grelha (malha e inércias),
// verificações da NBR (mesa, nervura, espaçamento), mesa, armadura base e reforço por grupo de nervuras, vigas do pano e
// avisos. As linhas vêm do núcleo (`nervuradasNoMemorial`).
import type { ReactNode } from 'react';
import { fmt } from './Detalhamento';
import type { Dimensionamento } from '../../core/building/dimensionamento';
import { nervuradasNoMemorial } from '../../core/building/nervuradasDim';
import { opcoesEmUso, perfilDe } from '../../core/building/opcoes';
import type { BuildingModel } from '../../core/building/types';

export function MemorialNervuradas({ b, dim, h2 }: { b: BuildingModel; dim: Dimensionamento | null; h2: (t: string) => ReactNode }) {
  const linhas = dim?.nervuradas?.length ? nervuradasNoMemorial(b, dim.nervuradas, opcoesEmUso(b.opcoes, perfilDe(b))) : [];
  if (!linhas.length) return null;
  return (
    <>
      {h2('Lajes nervuradas bidirecionais')}
      <div data-memorial-nervuradas>
        <p>Grelha de barras com malha de uma fração do menor intereixo; cada barra representa uma faixa de nervuras. Esforços de cada nervura = soma das faixas da grelha que a banda do intereixo cobre (envoltória ELU de todos os pavimentos do grupo). Flexão positiva em T (mesa = intereixo) e negativa em retângulo; cortante verificado a cada fator × d (NBR 6118, 19.4.1; estribos pelo modelo I). Os números de item da NBR 6118 (13.2.4.2, 14.7.7) e as formas do catálogo (geometrias genéricas) estão a confirmar.</p>
        {linhas.map((l) => (
          <div key={l.laje} className="avoid" data-memorial-nervurada={l.laje}>
            <h3>Laje {l.nome} · {l.forma.nome} ({l.forma.tipo}){l.pavimentos.length > 1 ? ` · ${l.pavimentos.length} pavimentos` : ''}</h3>
            <p>
              Altura total {fmt(l.geometria.h * 100, 0)} cm, mesa {fmt(l.geometria.capa * 100, 0)} cm, cubeta {fmt(l.geometria.hEnch * 100, 0)} cm; intereixo {fmt(l.geometria.intereixo[0] * 100, 0)} × {fmt(l.geometria.intereixo[1] * 100, 0)} cm; nervuras {fmt(l.geometria.bw[0] * 100, 1)} (X) e {fmt(l.geometria.bw[1] * 100, 1)} (Y) cm. Forma {l.forma.origem}.
              Peso da zona aliviada {fmt(l.peso.aliviada)} kN/m² ({fmt(l.peso.volumeAliviada, 3)} m³/m²); peso médio com a parte maciça {fmt(l.peso.medio)} kN/m²; concreto {fmt(l.peso.volumeConcreto)} m³; {l.peso.cubetas} cubetas inteiras; parte maciça {fmt(l.peso.areaMacica)} m².
            </p>
            <p>
              Modelo ({l.modelo.perfil === 'nbr' ? 'perfil NBR 6118' : 'padrão do sistema'}): malha de {fmt(l.modelo.passoMalha * 100, 1)} cm; inércia à flexão = {l.modelo.inercia}; inércia à torção = {l.modelo.torcao}; faixa maciça junto às vigas {fmt(l.modelo.faixaMacicaViga * 100, 0)} cm; {l.modelo.zonasMacicas} zona(s) maciça(s) manual(is).
              Cisalhamento: {l.verificacoes.regime[0]} (X) e {l.verificacoes.regime[1]} (Y); mesa mínima {fmt(l.verificacoes.capaMin * 100, 1)} cm; distância livre entre nervuras {fmt(l.geometria.livre[0] * 100, 0)} × {fmt(l.geometria.livre[1] * 100, 0)} cm.
              {l.mesa.exigida ? ` Flexão da mesa: qd ${fmt(l.mesa.qd)} kN/m², Md ${fmt(l.mesa.Md)} kN·m/m, As ${fmt(l.mesa.AsNec)} cm²/m.` : ' Flexão da mesa dispensada (espaçamento ≤ 65 cm).'} Malha da mesa φ{fmt(l.mesa.phi, l.mesa.phi % 1 ? 1 : 0)} c/{fmt(l.mesa.s * 100, 0)} nas duas direções.
            </p>
            <table>
              <thead><tr><th>Grupo</th><th>Nervuras</th><th>L (m)</th><th>M+ (kN·m)</th><th>M− início / fim (kN·m)</th><th>V máx (kN)</th><th>Mu (kN·m)</th><th>Inferior</th><th>Superior (início / fim)</th><th>Estribos</th></tr></thead>
              <tbody>{l.grupos.map((g) => <tr key={g.nome}><td className="l">{g.nome}</td><td className="l">{g.nervuras}</td><td>{fmt(g.L)}</td><td>{fmt(g.mPos)}</td><td>{fmt(g.mNeg[0])} / {fmt(g.mNeg[1])}</td><td>{fmt(g.Vmax)}</td><td>{fmt(g.Mu)}</td><td className="l">{g.inf}</td><td className="l">{g.sup}</td><td className="l">{g.estribo}</td></tr>)}</tbody>
            </table>
            <p>Base das nervuras: {l.base.nervuras.join('; ')}. Base da mesa e das zonas maciças: {l.base.mesa}.</p>
            {l.vigas.length > 0 && <p>Vigas do pano: {l.vigas.map((v) => `${v.nome} (h ${fmt(v.h * 100, 0)} cm${v.saliente > 0 ? `, parte saliente ${fmt(v.saliente * 100, 0)} cm` : ', chata'})`).join('; ')}.</p>}
            {l.verificacoes.avisos.length > 0 && <ul>{l.verificacoes.avisos.map((m, i) => <li key={i}><i>{m}</i></li>)}</ul>}
          </div>
        ))}
      </div>
    </>
  );
}
```

## Substituições em `src/app/edificio/MemorialEdificio.tsx`
1. Depois da linha `import { fichasNoMemorial } from '../../core/building/tiposLaje';` acrescentar:
```tsx
import { MemorialNervuradas } from './MemorialNervuradas';
```
2. Logo depois da linha `<MemorialInclinadas b={b} dim={dim} h2={h2} />` acrescentar (mesma indentação):
```tsx
<MemorialNervuradas b={b} dim={dim} h2={h2} />
```
3. Na condição do "Resumo geral de aço", trocar `(dim.resumoAcoVigotas?.length ?? 0) > 0 || (dim.resumoAcoParedes?.length ?? 0) > 0` por:
```tsx
(dim.resumoAcoVigotas?.length ?? 0) > 0 || (dim.resumoAcoNervuradas?.length ?? 0) > 0 || (dim.resumoAcoParedes?.length ?? 0) > 0
```
4. Na lista de tabelas do mesmo resumo, trocar
`['Lajes treliçadas (adicionais, negativos e distribuição)', dim.resumoAcoVigotas ?? []], ['Total geral (vigas, pilares, paredes, lajes e vigotas)', somarResumosAco(dim.resumoAcoVigas ?? [], dim.resumoAcoPilares ?? [], dim.resumoAcoParedes ?? [], dim.resumoAcoLajes ?? [], dim.resumoAcoVigotas ?? [])]]` por:
```tsx
['Lajes treliçadas (adicionais, negativos e distribuição)', dim.resumoAcoVigotas ?? []], ['Lajes nervuradas bidirecionais (nervuras, base e malha da mesa)', dim.resumoAcoNervuradas ?? []], ['Total geral (vigas, pilares, paredes, lajes, vigotas e nervuradas)', somarResumosAco(dim.resumoAcoVigas ?? [], dim.resumoAcoPilares ?? [], dim.resumoAcoParedes ?? [], dim.resumoAcoLajes ?? [], dim.resumoAcoVigotas ?? [], dim.resumoAcoNervuradas ?? [])]]
```
5. No parágrafo "Perdas de …", trocar `somarResumosAco(dim.resumoAcoVigas ?? [], dim.resumoAcoPilares ?? [], dim.resumoAcoParedes ?? [], dim.resumoAcoLajes ?? [], dim.resumoAcoVigotas ?? [])` (dentro de `perdasDoResumo(...)`) por:
```tsx
somarResumosAco(dim.resumoAcoVigas ?? [], dim.resumoAcoPilares ?? [], dim.resumoAcoParedes ?? [], dim.resumoAcoLajes ?? [], dim.resumoAcoVigotas ?? [], dim.resumoAcoNervuradas ?? [])
```

## Substituições em `src/app/edificio/Detalhamento.tsx`
1. Em `csvAco` e em `ResumoAco`, depois de `resV = dim.resumoAcoVigotas ?? [], ` acrescentar `resN = dim.resumoAcoNervuradas ?? [], ` (as duas declarações; em `csvAco` vem antes de `dets = dim.detalhes ?? []` e em `ResumoAco` antes de `tre = dim.trelicas ?? []`).
2. Em `csvAco`, trocar `...tabela('Resumo geral de aço (vigas, pilares, paredes, lajes e vigotas)', somarResumosAco(res, resP, resPar, resL, resV))]` por:
```tsx
...tabela('Resumo de aço das lajes nervuradas bidirecionais', resN), ...tabela('Resumo geral de aço (vigas, pilares, paredes, lajes, vigotas e nervuradas)', somarResumosAco(res, resP, resPar, resL, resV, resN))]
```
3. Em `ResumoAco`, trocar `if (!res.length && !resP.length && !resPar.length && !resL.length && !resV.length && !telas.length) return null;` por:
```tsx
if (!res.length && !resP.length && !resPar.length && !resL.length && !resV.length && !resN.length && !telas.length) return null;
```
4. Em `ResumoAco`, trocar `const perdas = perdasDoResumo(somarResumosAco(res, resP, resPar, resL, resV));` por:
```tsx
const perdas = perdasDoResumo(somarResumosAco(res, resP, resPar, resL, resV, resN));
```
5. Em `ResumoAco`, depois da linha `{resV.length > 0 && <TabelaAco titulo="Lajes treliçadas (adicionais, negativos e distribuição)" res={resV} marca="vigotas" />}` acrescentar:
```tsx
{resN.length > 0 && <TabelaAco titulo="Lajes nervuradas bidirecionais (nervuras, base e malha da mesa)" res={resN} marca="nervuradas" />}
```
6. Em `ResumoAco`, trocar `<TabelaAco titulo="Total geral (vigas, pilares, paredes, lajes e vigotas)" res={somarResumosAco(res, resP, resPar, resL, resV)} marca="geral" />` por:
```tsx
<TabelaAco titulo="Total geral (vigas, pilares, paredes, lajes, vigotas e nervuradas)" res={somarResumosAco(res, resP, resPar, resL, resV, resN)} marca="geral" />
```

## Fluxo e2e `E3c` (`e2e/flows.mjs`)
Inserir antes do `];` final do vetor `flows`:
```js
  {
    name: 'E3c: nervuradas bidirecionais (forma do catálogo e da obra, atribuir ao pano, ponto de passagem, base das nervuras, cópia entre panos, janela das nervuras, memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
      const esperarModelo = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 20000 });
      // dois panos 6 × 6 lado a lado, vigas de 20 × 50
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [12, 0], [0, 6], [6, 6], [12, 6]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [12, 0]], [[0, 6], [12, 6]], [[0, 0], [0, 6]], [[6, 0], [6, 6]], [[12, 0], [12, 6]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      const tl = page.locator('.edif-in details', { has: page.locator('summary', { hasText: /^Tipos de laje/ }) }).first();
      await tl.locator('summary').first().click();
      // 1) a forma do catálogo é genérica e somente leitura; copiar dá uma forma editável
      await tl.getByLabel(/^Forma da biblioteca/).selectOption({ label: 'Recuperável 60 × 60, h = 30 (genérica) · catálogo' });
      assert.match(await tl.locator('[data-selos-forma]').innerText(), /somente leitura/);
      assert.match(await tl.locator('[data-selos-forma]').innerText(), /genérica, a confirmar/);
      await tl.getByRole('button', { name: 'Copiar forma', exact: true }).click();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.tiposLaje?.formas?.length === 1, null);
      assert.match(await tl.locator('[data-selos-forma]').innerText(), /editável/);
      const copia = (await modelo()).tiposLaje.formas[0];
      // 2) resumo da forma: cubeta 50 × 50, volume e peso à mão (mesa de 5 cm: 0,05 + 0,30 × (1 − 0,25/0,36) = 0,142 m³/m²; 25 × 0,14167 = 3,54 kN/m²)
      assert.match(await tl.locator('[data-volume-forma]').innerText(), /^0,142$/);
      assert.match(await tl.locator('[data-pp-forma]').innerText(), /^3,54$/);
      // 3) editar a altura da cubeta; largura da nervura maior que o intereixo é recusada
      const alt = tl.getByLabel(/^Altura da cubeta/);
      await alt.fill('25'); await alt.press('Enter');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.tiposLaje?.formas?.[0]?.altura === 0.25, null);
      const bwx = tl.getByLabel(/^Largura da nervura da forma em X/);
      await bwx.fill('70'); await bwx.press('Enter');
      await tl.locator('[data-erros-tipos-laje]').waitFor();
      assert.match(await tl.locator('[data-erros-tipos-laje]').innerText(), /incoerente/);
      assert.equal((await modelo()).tiposLaje.formas[0].bw[0], 0.1);
      // 4) atribuir a nervurada bidirecional nos panos do grupo Lajes
      const lj = page.locator('.edif-in details', { has: page.locator('summary', { hasText: /^Lajes/ }) }).first();
      await lj.locator('summary').first().click();
      await lj.locator('label.field', { has: page.locator('.flabel', { hasText: /^Tipo$/ }) }).locator('select').selectOption('nervurada');
      await lj.getByLabel(/^Forma da nervurada/).selectOption(copia.id);
      const ht = lj.getByLabel(/^Altura total da nervurada/);
      await ht.fill('30'); await ht.press('Enter');
      await lj.getByRole('button', { name: 'Preencher todos os panos', exact: true }).click();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.length === 2, null);
      assert.deepEqual((await modelo()).lajes[0].tipo, { tipo: 'nervurada', forma: copia.id, hTotal: 0.3, capa: 0.05 });
      assert.match(await lj.locator('table.loads-ed').innerText(), /nervurada/);
      // 5) grupo Nervuradas bidirecionais: seleciona o pano L1 na tabela e ajusta o ponto de passagem
      const nv = page.locator('.edif-in details', { has: page.locator('summary', { hasText: /^Nervuradas bidirecionais/ }) }).first();
      await nv.locator('summary').first().click();
      await nv.getByLabel('Mostrar nervuras e cubetas na planta', { exact: true }).check();
      await lj.locator('table.loads-ed tbody tr').nth(0).click();
      const px = nv.getByLabel(/^Ponto de passagem das nervuras X/);
      await px.fill('0,3'); await px.press('Enter');
      const py = nv.getByLabel(/^Ponto de passagem das nervuras Y/);
      await py.fill('0,3'); await py.press('Enter');
      await nv.getByRole('button', { name: 'Aplicar o ponto de passagem', exact: true }).click();
      await esperarModelo(() => { const l = JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.[0]; return Array.isArray(l?.pontoNervuras) && Math.abs(l.pontoNervuras[0] - 0.3) < 1e-9; }, null);
      // 6) base das nervuras: 2φ8 em X, considerada e detalhada
      await nv.getByLabel(/^Base inferior das nervuras X/).fill('2');
      await nv.getByLabel(/^φ da base das nervuras X/).selectOption('8');
      await nv.getByLabel('Considerar a base das nervuras X no dimensionamento', { exact: true }).check();
      await nv.getByLabel('Base das nervuras detalhada (desenhada e medida)', { exact: true }).check();
      await nv.getByRole('button', { name: 'Aplicar a base das nervuras', exact: true }).click();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.[0]?.baseNervurada?.detalhada === true, null);
      const bn = (await modelo()).lajes[0].baseNervurada;
      assert.deepEqual(bn.nervuras[0], { inf: { n: 2, phi: 8 }, considerar: true });
      // 7) copiar as características para o outro pano nervurado do grupo (com a base)
      await nv.getByLabel('Copiar também a armadura base', { exact: true }).check();
      await nv.getByRole('button', { name: 'Copiar para os demais panos nervurados do grupo', exact: true }).click();
      await esperarModelo(() => { const l = JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.[1]; return !!l?.baseNervurada && Array.isArray(l?.pontoNervuras); }, null);
      assert.deepEqual((await modelo()).lajes[1].pontoNervuras, [0.3, 0.3]);
      // 8) a forma em uso não pode ser removida
      await tl.getByRole('button', { name: 'Remover forma', exact: true }).click();
      await tl.locator('[data-erros-tipos-laje]').waitFor();
      assert.match(await tl.locator('[data-erros-tipos-laje]').innerText(), /usada por lajes/);
      // 9) exportar o JSON leva as formas da obra
      const { name, text } = await downloadText(page, () => tl.getByRole('button', { name: 'Exportar tipos de laje', exact: true }).click());
      assert.match(name, /tipos-laje\.json$/);
      assert.equal(JSON.parse(text).formas.length, 1);
      // 10) cálculo, janela das nervuras e memorial
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await lj.locator('table.loads-ed tbody tr').nth(0).click();
      await nv.getByRole('button', { name: 'Nervuras da laje', exact: true }).click();
      const jan = page.getByRole('dialog', { name: 'Nervuras da laje L1' });
      await jan.locator('[data-tabela-nervuras]').waitFor();
      assert.ok((await jan.locator('[data-grupo-nervuras]').count()) >= 2);
      assert.match(await jan.locator('[data-grupo-nervuras]').first().innerText(), /base 2φ8/);
      assert.match(await jan.innerText(), /Cisalhamento: cisalhamento como laje/);
      await jan.getByRole('button', { name: 'Fechar' }).click();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const tab = memo.locator(`[data-memorial-nervurada="${(await modelo()).lajes[0].id}"]`);
      await tab.waitFor();
      assert.match(await tab.innerText(), /genérica/);
      assert.match(await tab.innerText(), /\(cópia\)/);
      assert.match(await memo.innerText(), /Lajes nervuradas bidirecionais \(nervuras, base e malha da mesa\)/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  },
```
Os passos conferem: forma do catálogo somente leitura e genérica; copiar dá forma editável; resumo da forma (volume 0,142 m³/m² e peso 3,54 kN/m² à mão para a cubeta 50 × 50, h = 30 e mesa de 5 cm); editar a altura; largura da nervura maior que o intereixo recusada; atribuir a nervurada nos panos; ponto de passagem; base das nervuras (considerada e detalhada); copiar para o outro pano; forma em uso não se remove; exportar o JSON com as formas; janela das nervuras; memorial e resumo de aço. Rodar `npm run build` antes (o e2e usa `dist/`) e `npm run e2e -- E3`.

## Checklists
Depois do e2e verde, nos dois checklists mudar de Parcial para Feito (frente `—`) as linhas cuja nota diz "falta ... (cartão)": C7.9, C7.42, C7.43, C7.44, C7.45, C7.46 (`docs/checklist-manual-cypecad.md`) e K1.9.90, K1.9.91, K1.9.93, K1.9.101, K1.13.3.1-4 e K1.13.4-2 (`docs/checklist-manual-calculo-cypecad.md`); em cada nota trocar "falta ... (cartão)" por onde a interface está (`FormasLaje.tsx`, `NervuradasUI.tsx`, `Planta.tsx`, `Edificio.tsx`). C7.45: a direção por viga ou por dois pontos usa a ferramenta "Direção do pano" já existente na planta (L5) e `laje.nervurada { direcaoPor }`. Deixar Parcial K1.9.94, K1.13.3-1, K1.13.3.1-1 e K1.13.4.1-1 (limitações no texto da nota). Rodar `npm run checklists` e acrescentar a linha ao "Histórico de conferência" dos dois checklists e ao Andamento de `docs/plano-execucao.md`.

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`; `npm run e2e -- E3` (os fluxos `E3a` e `E3c`, mais o `E3b` se os cartões dele já foram aplicados).
