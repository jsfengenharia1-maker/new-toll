// Reações das escadas na prancha de cargas e cargas nas formas só quando configuradas (E4e, C10.26).
import { describe, expect, it } from 'vitest';
import { analisarEdificio } from '../building/analitico';
import { comEscadas } from '../building/escadasCalculo';
import { montarConjunto } from './conjunto';
import { edificioExemplo } from './exemplo';

function comEscada() {
  const s = edificioExemplo();
  const r = s.executar('escada.criar', { id: 'e1', grupo: 'g_3', origem: [2, 1], angulo: 90, piso: 0.2967, espelho: 0.5 / 3, lances: [{ tipo: 'pre:meia-volta-9-9' }] });
  expect(r.ok, r.erros.map((e) => e.mensagem).join(' ')).toBe(true);
  return s;
}
const textos = (ps: ReturnType<typeof montarConjunto>['pranchas']) => ps.flatMap((p) => [...p.papel, ...p.modelo].filter((q) => q.t === 'txt').map((q) => (q.t === 'txt' ? q.s : '')));

describe('E4e: cargas das escadas nas pranchas', () => {
  const s = comEscada(), b = s.modelo, an = analisarEdificio(b);
  const esc = comEscadas(b, an.escadas).cargas.filter((c) => c.escada);

  it('prancha de cargas: as reações das escadas entram nos casos G e Q do grupo, com o nome da escada e a tabela', () => {
    expect(esc.length).toBeGreaterThan(1);
    const { pranchas } = montarConjunto(b, an, null, { tipos: 'cargas' });
    const t = textos(pranchas);
    expect(t.some((x) => x.startsWith('REAÇÕES DAS ESCADAS NO GRUPO'))).toBe(true);
    expect(t.filter((x) => x.includes('(E1)')).length).toBe(esc.length);
    // todas as cargas das escadas estão nas camadas de G ou de Q
    const camadas = new Set(pranchas.flatMap((p) => p.modelo.filter((q) => q.t === 'txt' && q.s.includes('(E1)')).map((q) => q.c)));
    expect([...camadas].every((c) => c === 'CARGA-G' || c === 'CARGA-Q')).toBe(true);
    // uma carga linear por apoio e caso: o valor impresso é o da carga
    const valor = (x: string) => Number(x.split(' ')[0].replace(',', '.'));
    const impressos = t.filter((x) => x.includes('(E1)')).map(valor).sort((a, z) => a - z);
    expect(impressos).toEqual(esc.map((c) => +c.valor.toFixed(2)).sort((a, z) => a - z));
  });

  it('sem o cálculo das escadas (sem análise), a prancha não traz as reações', () => {
    const { pranchas } = montarConjunto(b, null, null, { tipos: 'cargas' });
    expect(textos(pranchas).some((x) => x.includes('(E1)'))).toBe(false);
  });

  it('nas formas, as cargas só aparecem se o usuário configurar (cargasNasFormas)', () => {
    const base = montarConjunto(b, an, null, { tipos: 'formas' }).pranchas;
    expect(base.every((p) => !p.modelo.some((q) => q.c === 'CARGA-G' || q.c === 'CARGA-Q'))).toBe(true);
    const s2 = comEscada();
    expect(s2.executar('prancha.definir', { armacao: { cargasNasFormas: 1 } }).ok).toBe(true);
    const b2 = s2.modelo, an2 = analisarEdificio(b2);
    const com = montarConjunto(b2, an2, null, { tipos: 'formas' }).pranchas;
    const nCargas = com.reduce((n, p) => n + p.modelo.filter((q) => q.t === 'txt' && (q.c === 'CARGA-G' || q.c === 'CARGA-Q')).length, 0);
    expect(nCargas).toBeGreaterThanOrEqual(esc.length);
    expect(textos(com).filter((x) => x.includes('(E1)')).length).toBe(esc.length);
    expect(s2.executar('prancha.definir', { armacao: { cargasNasFormas: 0 } }).ok).toBe(true);
    expect(s2.modelo.prancha?.armacao?.cargasNasFormas).toBeUndefined();
  });
});
