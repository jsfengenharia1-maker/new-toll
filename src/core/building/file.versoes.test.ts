import { describe, expect, it } from 'vitest';
import { Sessao, comandosEdificioPadrao } from '../commands';
import { edificioVazio } from './types';
import { arquivoComExtras, lerEdificio, MAX_VERSOES, recuperarVersao, resultadosParaArquivo, versoesDoLog } from './file';

function sessao(): Sessao {
  const s = new Sessao(edificioVazio());
  for (const c of comandosEdificioPadrao()) expect(s.executar(c.nome, c.params, 'sistema').ok).toBe(true);
  expect(s.executar('eixo.malha', { dx: [5, 5], dy: [4] }).ok).toBe(true);
  expect(s.executar('norma.definir', { fck: 35 }).ok).toBe(true);
  return s;
}

describe('versões do log', () => {
  const s = sessao();

  it('devolve o estado antes de cada um dos últimos comandos', () => {
    const { versoes } = versoesDoLog(edificioVazio(), s.log, 3);
    expect(versoes).toHaveLength(3);
    expect(versoes.map((v) => v.indice)).toEqual([5, 6, 7]);
    expect(versoes.map((v) => v.rotulo)).toEqual(['pavimento.criar', 'eixo.malha', 'norma.definir']);
    expect(versoes[2].building.norma.fck).toBe(30);
    expect(versoes[2].building.eixos.length).toBe(5);
    expect(versoes[1].building.eixos.length).toBe(0);
  });

  it('n = 0 não gera versões; n grande respeita o máximo e o log', () => {
    expect(versoesDoLog(edificioVazio(), s.log, 0).versoes).toEqual([]);
    const v = versoesDoLog(edificioVazio(), s.log, 50).versoes;
    expect(v.length).toBeLessThanOrEqual(MAX_VERSOES);
    expect(v.length).toBeLessThanOrEqual(s.log.length);
  });

  it('o limite de tamanho descarta as versões mais antigas e avisa', () => {
    const r = versoesDoLog(edificioVazio(), s.log, 3, 1);
    expect(r.versoes).toEqual([]);
    expect(r.aviso).toBe('Versões limitadas a 0 de 3 pelo tamanho do arquivo.');
  });

  it('recupera uma versão pelo índice', () => {
    const versoes = versoesDoLog(edificioVazio(), s.log, 3).versoes;
    const arq = { building: s.modelo, buildingLog: s.log, versoes };
    const rec = recuperarVersao(arq, 7);
    expect(rec!.building.norma.fck).toBe(30);
    expect(rec!.buildingLog).toHaveLength(7);
    expect(recuperarVersao(arq, 99)).toBeNull();
  });

  it('ida e volta pelo JSON mantém versões e resultados; sem eles, as chaves não existem', () => {
    const versoes = versoesDoLog(edificioVazio(), s.log, 3).versoes;
    const resultados = { revisao: 4, salvoEm: 'x', dim: { a: 1 } };
    const ida = lerEdificio(JSON.parse(JSON.stringify({ building: s.modelo, buildingLog: s.log, versoes, resultados })));
    expect(ida!.versoes).toHaveLength(3);
    expect(ida!.resultados!.revisao).toBe(4);
    const sem = lerEdificio(JSON.parse(JSON.stringify({ building: s.modelo, buildingLog: s.log })));
    expect(Object.keys(sem!)).not.toContain('versoes');
    expect(Object.keys(sem!)).not.toContain('resultados');
  });

  it('arquivoComExtras respeita as opções e os avisos', () => {
    const { arquivo, avisos } = arquivoComExtras(s.modelo, s.log, { versoes: 2, resultados: true }, { a: 1 }, 9);
    expect(arquivo.versoes).toHaveLength(2);
    expect(arquivo.resultados!.revisao).toBe(9);
    expect(avisos).toEqual([]);
    const magro = arquivoComExtras(s.modelo, s.log, { versoes: 0, resultados: false }, { a: 1 }, 9).arquivo;
    expect(Object.keys(magro)).not.toContain('versoes');
    expect(Object.keys(magro)).not.toContain('resultados');
    const semCalculo = arquivoComExtras(s.modelo, s.log, { versoes: 0, resultados: true }, null, 9);
    expect(Object.keys(semCalculo.arquivo)).not.toContain('resultados');
    expect(semCalculo.avisos).toEqual([]);
  });

  it('resultados: serializa com revisão e respeita o limite', () => {
    const r = resultadosParaArquivo({ a: 1 }, 4);
    expect(r.resultados!.revisao).toBe(4);
    expect(r.resultados!.dim).toEqual({ a: 1 });
    const grande = resultadosParaArquivo({ a: 1 }, 4, 3);
    expect(grande.resultados).toBeUndefined();
    expect(grande.aviso).toBe('Os resultados do último cálculo passam do limite de tamanho e não foram incluídos.');
  });
});
