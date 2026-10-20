import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from './index';
import { deslocarPolilinha, geometriaViga } from '../building/types';
import { verificar } from '../building/verify';

function padrao(): Sessao {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  return s;
}
const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
const sec = { b: 0.15, h: 0.4 };
const codigos = (s: Sessao) => verificar(s.modelo).map((d) => d.codigo).sort();

/** Pórtico de 4 pilares 20 × 40 nos cantos de 5 × 4 m e 4 vigas nos eixos, no grupo Tipo. */
function quadro() {
  const s = padrao();
  ok(s, 'lote', { comandos: [[0, 0], [5, 0], [5, 4], [0, 4]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.2, h: 0.4 } } })) });
  ok(s, 'lote', { comandos: [[[0, 4], [5, 4]], [[0, 0], [5, 0]], [[0, 0], [0, 4]], [[5, 0], [5, 4]]].map((pontos) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos, secao: sec } })) });
  return s;
}

describe('geometria das vigas', () => {
  it('alinhamento: a linha traçada é o eixo ou uma face', () => {
    const v = { pontos: [[0, 0], [4, 0]] as [number, number][], secao: { b: 0.2, h: 0.5 } };
    expect(geometriaViga({ ...v, alinhamento: 'esq' }).dir[0]).toEqual([0, -0.2]);
    expect(geometriaViga({ ...v, alinhamento: 'dir' }).esq[1]).toEqual([4, 0.2]);
    const c = geometriaViga({ ...v, alinhamento: 'centro' });
    expect(c.esq[0][1]).toBeCloseTo(0.1); expect(c.dir[0][1]).toBeCloseTo(-0.1);
  });
  it('polilinha em L deslocada com canto em esquadria', () => {
    const q = deslocarPolilinha([[0, 0], [4, 0], [4, 3]], 0.1);
    expect(q[1][0]).toBeCloseTo(3.9); expect(q[1][1]).toBeCloseTo(0.1);
  });
});

describe('verificação de lançamento das vigas', () => {
  it('pórtico fechado sem problemas; viga solta, balanço, sobreposição e pilar sem viga', () => {
    const s = quadro();
    expect(codigos(s)).toEqual([]);
    ok(s, 'viga.tracar', { grupo: 'g_3', pontos: [[1.5, 1.5], [3, 1.5]], secao: sec }); // solta
    ok(s, 'viga.tracar', { grupo: 'g_3', pontos: [[5, 4], [7, 4]], secao: sec }); // balanço sobre P3
    ok(s, 'viga.tracar', { grupo: 'g_3', pontos: [[1, 0], [3, 0]], secao: sec }); // sobre a V2
    ok(s, 'pilar.inserir', { x: 9, y: 0, secao: { tipo: 'ret', b: 0.2, h: 0.2 } });
    expect(codigos(s)).toEqual(['PILAR_SEM_VIGA', 'VIGAS_SOBREPOSTAS', 'VIGA_BALANCO', 'VIGA_SEM_APOIO']);
  });

  it('viga apoiada em viga (T) e no meio de outra conta como apoio', () => {
    const s = quadro();
    ok(s, 'viga.tracar', { grupo: 'g_3', pontos: [[2.5, 0], [2.5, 4]], secao: sec });
    expect(codigos(s)).toEqual([]);
  });

  it('pilar nascendo sobre viga é transição (V2); sem viga embaixo é erro próprio', () => {
    const s = quadro();
    ok(s, 'pilar.inserir', { x: 2.5, y: 0, secao: { tipo: 'ret', b: 0.2, h: 0.2 }, nasce: 'pav_5' });
    ok(s, 'pilar.inserir', { x: 2.5, y: 2, secao: { tipo: 'ret', b: 0.2, h: 0.2 }, nasce: 'pav_5' });
    const d = verificar(s.modelo).filter((x) => x.severidade === 'erro').map((x) => x.codigo).sort();
    expect(d).toEqual(['PILAR_NASCE_SEM_APOIO', 'PILAR_TRANSICAO']);
  });

  it('face da viga a 3 cm da face do pilar: aviso com correção que resolve', () => {
    const s = padrao();
    ok(s, 'pilar.inserir', { x: 0, y: 0, secao: { tipo: 'ret', b: 0.2, h: 0.4 } });
    ok(s, 'pilar.inserir', { x: 5, y: 0, secao: { tipo: 'ret', b: 0.2, h: 0.4 } });
    // face esquerda (de cima) traçada em y = 0,17; face de cima dos pilares em y = 0,20
    ok(s, 'viga.tracar', { grupo: 'g_3', pontos: [[0, 0.17], [5, 0.17]], secao: sec, alinhamento: 'esq' });
    const d = verificar(s.modelo).find((x) => x.codigo === 'VIGA_FORA_FACE')!;
    expect(d.mensagem).toMatch(/a 3 cm/);
    ok(s, d.sugestao!.comando, d.sugestao!.params);
    expect(s.modelo.vigas[0].pontos).toEqual([[0, 0.2], [5, 0.2]]);
    expect(codigos(s)).toEqual([]);
  });
});

describe('edição de vigas', () => {
  it('dividir e unir voltam ao original; prolongar até outra viga', () => {
    const s = quadro();
    const v = s.modelo.vigas[1]; // (0,0)–(5,0)
    ok(s, 'viga.dividir', { id: v.id, ponto: [2, 0.05] });
    const nova = s.modelo.vigas.at(-1)!;
    expect(s.modelo.vigas[1].pontos).toEqual([[0, 0], [2, 0]]);
    expect(nova.pontos).toEqual([[2, 0], [5, 0]]);
    ok(s, 'viga.unir', { ids: [v.id, nova.id] });
    expect(s.modelo.vigas[1].pontos).toEqual([[0, 0], [5, 0]]);
    ok(s, 'viga.tracar', { grupo: 'g_3', pontos: [[2.5, 1], [2.5, 3]], secao: sec });
    const w = s.modelo.vigas.at(-1)!;
    ok(s, 'viga.prolongar', { id: w.id, extremidade: 'fim', ate: { viga: s.modelo.vigas[0].id } });
    ok(s, 'viga.prolongar', { id: w.id, extremidade: 'ini', ate: { viga: v.id } });
    expect(s.modelo.vigas.at(-1)!.pontos).toEqual([[2.5, 0], [2.5, 4]]);
  });

  it('copiar para outros grupos sem duplicar; renumerar horizontais e depois verticais', () => {
    const s = quadro();
    ok(s, 'viga.copiarParaGrupos', { ids: s.modelo.vigas.map((v) => v.id), grupos: ['g_7'] });
    const r = ok(s, 'viga.copiarParaGrupos', { ids: s.modelo.vigas.filter((v) => v.grupo === 'g_3').map((v) => v.id), grupos: ['g_7'] });
    expect(r.mensagem).toMatch(/0 viga\(s\) copiada\(s\); 4 já existia/);
    expect(s.modelo.vigas.filter((v) => v.grupo === 'g_7').map((v) => v.nome)).toEqual(['V1', 'V2', 'V3', 'V4']);
    ok(s, 'viga.renumerar', { grupo: 'g_3' });
    const nome = (a: number[], z: number[]) => s.modelo.vigas.find((v) => v.grupo === 'g_3' && JSON.stringify(v.pontos) === JSON.stringify([a, z]))!.nome;
    expect([nome([0, 4], [5, 4]), nome([0, 0], [5, 0]), nome([0, 0], [0, 4]), nome([5, 0], [5, 4])]).toEqual(['V1', 'V2', 'V3', 'V4']);
  });
});
