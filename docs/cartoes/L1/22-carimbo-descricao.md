# Cartão L1-22 — Descrição da obra no carimbo das pranchas

Leia só este cartão e os arquivos citados. Não crie arquivos além dos listados. Sem emojis. Depende do cartão 01.

## Objetivo
A descrição da obra aparece sob o nome da obra no carimbo. Nada além disso vai às pranchas. Item: K1.9.2.

## Arquivos
1. `src/core/sheets/prancha.ts` (editar, função `folhaECarimbo`)
2. `src/core/sheets/prancha.test.ts` (editar)
Leia antes: `folhaECarimbo` (~linhas 383 a 425) e o teste `'carimbo: todo campo lançado pelo comando sai na legenda'` em `prancha.test.ts`, com o auxiliar `textosPr`.

## `prancha.ts`
Na lista `linhas`, a segunda linha é `{ h: 10, cel: [{ w: 1, rot: 'OBRA', val: cb.obra ?? b.obra.nome ?? '' }] }`. Não mude as células. No laço `for (const l of linhas)`, depois da linha
`if (c.val) papel.push(txt('FOLHA-TEXTO', x + 2, yb + 2, c.hv ?? 2.8, c.val));`
insira:
```ts
      // descrição da obra (K1.9.2): segunda linha da célula OBRA, em corpo menor, cortada em 90 caracteres
      if (c.rot === 'OBRA' && b.obra.descricao?.length) papel.push(txt('FOLHA-TEXTO', x + 2, yb + 5.2, 1.6, b.obra.descricao.join(' · ').slice(0, 90)));
```
(O nome da obra fica na base da célula, altura 2,8 mm; o rótulo `OBRA` fica no topo, 1,6 mm; a descrição ocupa o espaço entre eles.)

## `prancha.test.ts`
Dentro do `describe` existente, depois do teste do carimbo, acrescente:
```ts
  it('carimbo: a descrição da obra sai sob o nome, cortada em 90 caracteres', () => {
    const s = edificioExemplo();
    expect(s.executar('obra.definir', { descricao: ['Residencial fictício de 5 pavimentos', 'Fase de anteprojeto'] }).ok).toBe(true);
    expect(textosPr(montarPranchas(s.modelo)[0], true)).toContain('Residencial fictício de 5 pavimentos · Fase de anteprojeto');
    expect(s.executar('obra.definir', { descricao: ['x'.repeat(120)] }).ok).toBe(true);
    const pap = textosPr(montarPranchas(s.modelo)[0], true);
    expect(pap).toContain('x'.repeat(90));
    expect(pap).not.toContain('x'.repeat(91));
    expect(s.executar('obra.definir', { descricao: [] }).ok).toBe(true);
    expect(textosPr(montarPranchas(s.modelo)[0], true)).not.toContain('xxxxxxxxxx');
  });
```
(`textosPr(pr, true)` junta os textos do papel, como no teste vizinho; confira a assinatura lá.)

## Verificação
```bash
npx tsc -b && npx vitest run src/core/sheets/prancha.test.ts
```
Os demais testes de pranchas (formas, armação, fundação) devem continuar verdes: o carimbo só ganha um texto quando há descrição.
