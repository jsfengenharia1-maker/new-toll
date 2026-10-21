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
const codigos = (s: Sessao) => verificar(s.modelo).map((d) => d.codigo).filter((c) => c !== 'PANO_SEM_LAJE').sort(); // lajes: lajes.test.ts

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

  it('pilar nascendo sobre viga é transição (informação); sem apoio embaixo é erro próprio', () => {
    const s = quadro();
    ok(s, 'pilar.inserir', { x: 2.5, y: 0, secao: { tipo: 'ret', b: 0.2, h: 0.2 }, nasce: 'pav_5' });
    ok(s, 'pilar.inserir', { x: 2.5, y: 2, secao: { tipo: 'ret', b: 0.2, h: 0.2 }, nasce: 'pav_5' });
    const d = verificar(s.modelo);
    expect(d.filter((x) => x.severidade === 'erro').map((x) => x.codigo)).toEqual(['PILAR_NASCE_SEM_APOIO']);
    expect(d.find((x) => x.codigo === 'PILAR_TRANSICAO')).toMatchObject({ severidade: 'info' });
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

describe('locação da viga pela face do pilar', () => {
  /** Pilares 20 × 50 e vigas de 15 cm traçadas pelo centro dos pilares, num vão de 3 × 1 (vigas internas incluídas). */
  function predio() {
    const s = padrao();
    const xs = [0, 5, 10, 15], ys = [0, 4];
    ok(s, 'lote', { comandos: xs.flatMap((x) => ys.map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.2, h: 0.5 } } }))) });
    ok(s, 'lote', { comandos: [...ys.map((y) => [[0, y], [15, y]]), ...xs.map((x) => [[x, 0], [x, 4]])].map((pontos) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos, secao: sec } })) });
    return s;
  }
  const porNome = (s: Sessao, n: string) => s.modelo.vigas.find((v) => v.nome === n)!;
  const linhaY = (s: Sessao, x0: number) => s.modelo.vigas.find((v) => Math.abs(v.pontos[0][0] - v.pontos[1][0]) < 1e-6 && Math.abs(v.pontos[0][0] - x0) < 0.2)!;

  it('face externa: só as vigas de contorno, face na face do pilar, viga mais estreita que o pilar para dentro', () => {
    const s = predio();
    const internas = [5, 10].map((x) => JSON.stringify(linhaY(s, x)));
    ok(s, 'viga.alinharFace', { grupo: 'g_3' });
    // vigas horizontais: pilar com 50 cm em y; face externa em y = −0,25 (embaixo) e 4,25 (em cima)
    const baixo = s.modelo.vigas.find((v) => v.pontos[0][1] < 1 && Math.abs(v.pontos[1][1] - v.pontos[0][1]) < 1e-6)!;
    const cima = s.modelo.vigas.find((v) => v.pontos[0][1] > 3 && Math.abs(v.pontos[1][1] - v.pontos[0][1]) < 1e-6)!;
    const gb = geometriaViga(baixo), gc = geometriaViga(cima);
    expect(Math.min(gb.esq[0][1], gb.dir[0][1])).toBeCloseTo(-0.25, 6);
    expect(Math.max(gb.esq[0][1], gb.dir[0][1])).toBeCloseTo(-0.1, 6);
    expect(Math.max(gc.esq[0][1], gc.dir[0][1])).toBeCloseTo(4.25, 6);
    // verticais das pontas: pilar com 20 cm em x; face externa em x = −0,10 e 15,10
    const esq = geometriaViga(linhaY(s, 0)), dir = geometriaViga(linhaY(s, 15));
    expect(Math.min(esq.esq[0][0], esq.dir[0][0])).toBeCloseTo(-0.1, 6);
    expect(Math.max(dir.esq[0][0], dir.dir[0][0])).toBeCloseTo(15.1, 6);
    // internas intactas; apoios continuam válidos
    expect([5, 10].map((x) => JSON.stringify(linhaY(s, x)))).toEqual(internas);
    expect(codigos(s).filter((c) => c.startsWith('VIGA'))).toEqual([]);
    // a linha traçada é a face externa: mudar a largura mantém a face
    ok(s, 'viga.editar', { id: baixo.id, secao: { b: 0.25, h: 0.5 } });
    const g2 = geometriaViga(porNome(s, baixo.nome));
    expect(Math.min(g2.esq[0][1], g2.dir[0][1])).toBeCloseTo(-0.25, 6);
    expect(Math.max(g2.esq[0][1], g2.dir[0][1])).toBeCloseTo(0, 6);
  });

  it('lado esquerdo/direito do traçado em vigas escolhidas, inclusive internas; desfazer volta ao eixo', () => {
    const s = predio();
    const v = linhaY(s, 5), antes = JSON.stringify(v);
    ok(s, 'viga.alinharFace', { grupo: 'g_3', ids: [v.id], lado: 'dir' }); // traçado de baixo para cima: direita = +x
    const g = geometriaViga(linhaY(s, 5));
    expect(Math.max(g.esq[0][0], g.dir[0][0])).toBeCloseTo(5.1, 6);
    expect(Math.min(g.esq[0][0], g.dir[0][0])).toBeCloseTo(4.95, 6);
    s.desfazer();
    expect(JSON.stringify(linhaY(s, 5))).toBe(antes);
  });
});

