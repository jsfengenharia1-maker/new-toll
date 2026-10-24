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
  it('raiz com o nome da obra e as quinze seções, pavimentos do mais alto ao mais baixo', () => {
    const t = montarArvore(obra());
    expect(t.rotulo).toBe('Residencial Teste');
    expect(t.filhos!.map((f) => f.id)).toEqual(['pavs', 'pilares', 'vigas', 'lajes', 'pilaresParede', 'paredes', 'muros', 'alvenaria', 'grupos', 'cargas', 'cortes', 'eixos', 'fundacao', 'sondagens', 'vistas']);
    expect(t.filhos!.filter((f) => ['pilaresParede', 'paredes', 'muros', 'alvenaria', 'cortes', 'sondagens'].includes(f.id)).map((f) => f.contagem)).toEqual([0, 0, 0, 0, 0, 0]);
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
    const v = montarArvore(obra()).filhos!.find((f) => f.id === 'vistas')!;
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
