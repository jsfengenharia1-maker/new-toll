# D4 — cartão 01: função da árvore do Navegador (núcleo da interface, com teste)

Classe: Haiku (função pura com testes de valores esperados; código validado com `tsc` e `vitest`).

## Arquivos
- `src/app/edificio/arvore.ts` (novo)
- `src/app/edificio/arvore.test.ts` (novo)

## `src/app/edificio/arvore.ts`
```ts
// Árvore do Navegador da obra (D4): Obra > Pavimentos, Pilares, Vigas e Lajes por grupo, Eixos, Fundação e Vistas.
// Função pura sobre o modelo: a interface (Navegador.tsx) só desenha e liga a seleção à planta.
import { pavimentosOrdenados, type BuildingModel } from '../../core/building/types';

export type TipoNo = 'pavimento' | 'pilar' | 'viga' | 'laje' | 'eixo' | 'fundacao' | 'vista';
export interface NoArvore {
  id: string;
  rotulo: string;
  nivel: number;
  contagem?: number;
  filhos?: NoArvore[];
  /** Elemento que o nó representa (folhas e pavimentos); ausente nos nós de agrupamento. */
  alvo?: { tipo: TipoNo; id: string };
}

/** Vistas do centro (ids de `AbaEdificio`), na ordem das abas. */
export const VISTAS: [string, string][] = [['planta', 'Planta'], ['vista3d', '3D'], ['elevacao', 'Elevação'], ['verificacao', 'Verificação'], ['analise', 'Análise'], ['deslocamentos', 'Deslocamentos'], ['isovalores', 'Isovalores'], ['dimensionamento', 'Dimensionamento'], ['pranchas', 'Pranchas'], ['premissas', 'Premissas']];

const folha = (prefixo: string, nivel: number, x: { id: string; nome: string }, tipo: TipoNo): NoArvore => ({ id: `${prefixo}:${x.id}`, rotulo: x.nome, nivel, alvo: { tipo, id: x.id } });

/** Nós de grupo (Tipo, Cobertura…) com as vigas ou lajes de cada um; só grupos que têm elementos. */
function porGrupo(b: BuildingModel, raiz: 'vigas' | 'lajes', tipo: 'viga' | 'laje'): NoArvore[] {
  const lista: { id: string; nome: string; grupo: string }[] = b[raiz];
  return b.grupos
    .filter((g) => lista.some((x) => x.grupo === g.id))
    .map((g) => {
      const doGrupo = lista.filter((x) => x.grupo === g.id);
      return { id: `${raiz}:${g.id}`, rotulo: g.nome, nivel: 3, contagem: doGrupo.length, filhos: doGrupo.map((x) => folha(tipo, 4, x, tipo)) };
    });
}

export function montarArvore(b: BuildingModel): NoArvore {
  const ps = [...pavimentosOrdenados(b)].reverse();
  const fund = b.fundacao?.elementos ?? [];
  return {
    id: 'obra', rotulo: b.obra.nome, nivel: 1,
    filhos: [
      { id: 'pavs', rotulo: 'Pavimentos', nivel: 2, contagem: ps.length, filhos: ps.map((p) => folha('pav', 3, p, 'pavimento')) },
      { id: 'pilares', rotulo: 'Pilares', nivel: 2, contagem: b.pilares.length, filhos: b.pilares.map((p) => folha('pilar', 3, p, 'pilar')) },
      { id: 'vigas', rotulo: 'Vigas', nivel: 2, contagem: b.vigas.length, filhos: porGrupo(b, 'vigas', 'viga') },
      { id: 'lajes', rotulo: 'Lajes', nivel: 2, contagem: b.lajes.length, filhos: porGrupo(b, 'lajes', 'laje') },
      { id: 'eixos', rotulo: 'Eixos', nivel: 2, contagem: b.eixos.length, filhos: b.eixos.map((e) => folha('eixo', 3, e, 'eixo')) },
      { id: 'fundacao', rotulo: 'Fundação', nivel: 2, contagem: fund.length, filhos: fund.map((e) => folha('fund', 3, e, 'fundacao')) },
      { id: 'vistas', rotulo: 'Vistas', nivel: 2, contagem: VISTAS.length, filhos: VISTAS.map(([id, rotulo]) => ({ id: `vista:${id}`, rotulo, nivel: 3, alvo: { tipo: 'vista' as const, id } })) },
    ],
  };
}

/** Ids dos nós do caminho da raiz até o nó `id` (inclusive o próprio nó); vazio se não existir. */
export function caminhoAte(no: NoArvore, id: string): string[] {
  if (no.id === id) return [no.id];
  for (const f of no.filhos ?? []) {
    const c = caminhoAte(f, id);
    if (c.length) return [no.id, ...c];
  }
  return [];
}

/** Id do nó que representa um elemento da planta (`pilar`, `viga`, `laje`, `eixo`, `fundacao`), a partir do id do elemento. */
export function idDoNo(tipo: TipoNo, id: string): string {
  return tipo === 'pavimento' ? `pav:${id}` : tipo === 'fundacao' ? `fund:${id}` : `${tipo}:${id}`;
}
```

## `src/app/edificio/arvore.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { edificioVazio } from '../../core/building/types';
import { caminhoAte, idDoNo, montarArvore, VISTAS } from './arvore';

function obra() {
  const b = edificioVazio();
  b.obra.nome = 'Residencial Teste';
  b.pavimentos.push({ id: 'p1', nome: 'Térreo', cota: 3, grupo: 'g0' }, { id: 'p2', nome: 'Tipo 1', cota: 6, grupo: 'g1' }, { id: 'p3', nome: 'Tipo 2', cota: 9, grupo: 'g1' });
  b.grupos.push({ id: 'g0', nome: 'Térreo' } as never, { id: 'g1', nome: 'Tipo' } as never, { id: 'g2', nome: 'Vazio' } as never);
  b.pilares.push({ id: 'pi1', nome: 'P1' } as never, { id: 'pi2', nome: 'P2' } as never);
  b.vigas.push({ id: 'v1', nome: 'V1', grupo: 'g1' } as never, { id: 'v2', nome: 'V2', grupo: 'g1' } as never, { id: 'v3', nome: 'V3', grupo: 'g0' } as never);
  b.lajes.push({ id: 'l1', nome: 'L1', grupo: 'g1' } as never);
  return b;
}

describe('árvore do navegador', () => {
  it('raiz com o nome da obra e as sete seções, pavimentos do mais alto ao mais baixo', () => {
    const t = montarArvore(obra());
    expect(t.rotulo).toBe('Residencial Teste');
    expect(t.filhos!.map((f) => f.id)).toEqual(['pavs', 'pilares', 'vigas', 'lajes', 'eixos', 'fundacao', 'vistas']);
    expect(t.filhos![0].contagem).toBe(3);
    expect(t.filhos![0].filhos!.map((f) => f.rotulo)).toEqual(['Tipo 2', 'Tipo 1', 'Térreo']);
    expect(t.filhos![0].filhos![0].alvo).toEqual({ tipo: 'pavimento', id: 'p3' });
  });

  it('vigas e lajes por grupo, só grupos com elementos, com a contagem', () => {
    const t = montarArvore(obra());
    const vigas = t.filhos![2];
    expect(vigas.contagem).toBe(3);
    expect(vigas.filhos!.map((g) => [g.rotulo, g.contagem])).toEqual([['Térreo', 1], ['Tipo', 2]]);
    expect(vigas.filhos![1].filhos!.map((v) => v.id)).toEqual(['viga:v1', 'viga:v2']);
    expect(t.filhos![3].filhos!.map((g) => g.rotulo)).toEqual(['Tipo']);
  });

  it('vistas na ordem das abas', () => {
    const v = montarArvore(obra()).filhos![6];
    expect(v.filhos!.map((f) => f.rotulo)).toEqual(VISTAS.map((x) => x[1]));
    expect(v.filhos![0].alvo).toEqual({ tipo: 'vista', id: 'planta' });
    expect(VISTAS.length).toBe(10);
  });

  it('caminhoAte e idDoNo', () => {
    const t = montarArvore(obra());
    expect(caminhoAte(t, 'viga:v2')).toEqual(['obra', 'vigas', 'vigas:g1', 'viga:v2']);
    expect(caminhoAte(t, 'nao-existe')).toEqual([]);
    expect(idDoNo('pilar', 'pi1')).toBe('pilar:pi1');
    expect(idDoNo('pavimento', 'p2')).toBe('pav:p2');
    expect(idDoNo('fundacao', 'f1')).toBe('fund:f1');
  });
});
```

## Verificação
`npx tsc -b`; `npx vitest run src/app/edificio/arvore.test.ts` (4 testes); `npm run mapa`.
