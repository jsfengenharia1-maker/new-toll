import { beforeAll, describe, expect, it } from 'vitest';
import { edificioExemplo } from '../sheets/exemplo';
import { analisarEdificio } from '../building/analitico';
import { dimensionarEdificio, type Dimensionamento } from '../building/dimensionamento';
import { resumoAcoVigas } from '../building/detalhamento';
import { resumoAcoLajes } from '../building/detalhamentoLajes';
import { lancesDoPilar, pavimentosOrdenados, peDireito, type BuildingModel } from '../building/types';
import { construirCena } from './cena';
import { cortarCena, desenharCorte, eixosNoCorte, intervalosDaReta, niveisDoEdificio, secaoDoPavimento, segmentosDoCorte } from './corte';
import { armaduras3D, camadasDeArmadura, cenaDoElemento, comprimentoCaminho, malhaDeTubos } from './armaduras3d';

const modelo = () => edificioExemplo().modelo;
const soma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('cortes do edifício (V2)', () => {
  const b = modelo(), cena = construirCena(b);
  const ps = pavimentosOrdenados(b);

  it('traçado: sentido dir inverte o percurso; abscissas acumuladas', () => {
    const s = segmentosDoCorte({ pontos: [[0, 0], [3, 0], [3, 4]], sentido: 'esq' });
    expect(s.map((x) => [x.u0, x.u1])).toEqual([[0, 3], [3, 7]]);
    const r = segmentosDoCorte({ pontos: [[0, 0], [3, 0], [3, 4]], sentido: 'dir' });
    expect(r[0].a).toEqual([3, 4]);
    expect(r[1].b).toEqual([0, 0]);
  });

  it('plano pelo eixo de dois pilares e de uma viga: polígonos, áreas e níveis', () => {
    const c = cortarCena(cena, { pontos: [[-1, 4.5], [6, 4.5]], sentido: 'esq' });
    const pilares = c.secoes.filter((s) => s.tipo === 'pilar'), vigas = c.secoes.filter((s) => s.tipo === 'viga');
    // pilares de x = 0 e x = 5 (linha y = 4.5): um polígono por lance; área = 0,20 × pé-direito do lance (corte de elevação)
    const esperados = b.pilares.filter((p) => Math.abs(p.y - 4.5) < 1e-9 && p.x < 6).reduce((n, p) => n + lancesDoPilar(b, p).length, 0);
    expect(pilares.length).toBe(esperados);
    for (const s of pilares) expect(s.area).toBeCloseTo(0.2 * peDireito(b, s.pavimento), 6);
    expect(new Set(pilares.map((s) => s.elemento)).size).toBe(2);
    // a viga y = 4.5 corre de x = 0 a 15: no trecho visível (x de 0 a 6) tem 6 m × 0,50 m por pavimento do grupo
    const pavs = ps.filter((p) => b.vigas.some((v) => v.grupo === p.grupo));
    const v2 = b.vigas.find((v) => v.nome === 'V2')!;
    expect(vigas.length).toBe(3 * pavs.length); // V2 (no plano) e as transversais V4 e V5, que o cruzam
    for (const s of vigas.filter((q) => q.elemento === v2.id)) expect(s.area).toBeCloseTo(6 * 0.5, 6);
    for (const s of vigas.filter((q) => q.elemento !== v2.id)) expect(s.area).toBeCloseTo(0.15 * 0.5, 6);
    // níveis: topo do polígono da viga = cota do pavimento
    for (const s of vigas) expect(Math.max(...s.pontos.map((q) => q[1]))).toBeCloseTo(ps.find((p) => p.id === s.pavimento)!.cota, 9);
  });

  it('plano atravessando duas vigas transversais e as lajes entre elas', () => {
    const c = cortarCena(cena, { pontos: [[-1, 2.25], [6, 2.25]], sentido: 'esq' });
    const por = (t: string) => c.secoes.filter((s) => s.tipo === t);
    const nPav = ps.filter((p) => b.vigas.some((v) => v.grupo === p.grupo)).length;
    expect(por('viga').length).toBe(2 * nPav);
    for (const s of por('viga')) expect(s.area).toBeCloseTo(0.15 * 0.5, 6);
    expect(por('pilar').length).toBe(0);
    // lajes: o vão de x = 0 a 5 inteiro (5 m) e o começo do seguinte até x = 6 (1 m), h = 12 cm
    const areas = por('laje').map((s) => +s.area.toFixed(6)).sort();
    expect(areas.filter((a) => Math.abs(a - 0.6) < 1e-6).length).toBe(nPav);
    expect(areas.filter((a) => Math.abs(a - 0.12) < 1e-6).length).toBe(nPav);
    // polígonos fechados e dentro do intervalo do desenho
    for (const s of c.secoes) for (const [u] of s.pontos) { expect(u).toBeGreaterThanOrEqual(-1e-9); expect(u).toBeLessThanOrEqual(c.comprimento + 1e-9); }
  });

  it('elementos além do plano aparecem como linhas até a profundidade', () => {
    const livre = cortarCena(cena, { pontos: [[-1, 2.25], [6, 2.25]], sentido: 'esq' });
    const raso = cortarCena(cena, { pontos: [[-1, 2.25], [6, 2.25]], sentido: 'esq', profundidade: 1 });
    const objetos = (c: typeof livre) => new Set(c.vistos.map((v) => v.elemento));
    expect(objetos(raso).size).toBeLessThan(objetos(livre).size);
    // olhando para o outro lado, outros elementos
    const dir = cortarCena(cena, { pontos: [[-1, 2.25], [6, 2.25]], sentido: 'dir' });
    expect(dir.vistos.length).toBeGreaterThan(0);
    for (const v of livre.vistos) for (let i = 0; i < v.linhas.length; i += 2) expect(v.linhas[i]).toBeGreaterThanOrEqual(-1e-9);
  });

  it('sentido dir espelha a abscissa: o pilar de x = 0 passa a ficar à direita', () => {
    const esq = cortarCena(cena, { pontos: [[-1, 4.5], [6, 4.5]], sentido: 'esq' });
    const dir = cortarCena(cena, { pontos: [[6, 4.5], [-1, 4.5]], sentido: 'dir' });
    // o mesmo plano visto do lado oposto: mesmas seções, mesmas áreas
    expect(dir.secoes.length).toBe(esq.secoes.length);
    expect(soma(dir.secoes.map((s) => s.area))).toBeCloseTo(soma(esq.secoes.map((s) => s.area)), 6);
  });

  it('desenho: níveis, cotas verticais, eixos e fundação', () => {
    const corte = { id: 'co_1', nome: 'Corte AA', pontos: [[-1, 4.5], [16, 4.5]] as [number, number][], sentido: 'esq' as const };
    const d = desenharCorte(b, corte, { cena });
    expect(d.niveis.length).toBe(ps.length + 1);
    expect(d.niveis[0].fundacao).toBe(true);
    expect(d.cotas.length).toBe(ps.length);
    expect(soma(d.cotas.map((c) => c.valor))).toBeCloseTo(ps.at(-1)!.cota - d.niveis[0].cota, 6);
    expect(d.eixos.map((e) => e.nome).sort()).toEqual(eixosNoCorte(b, corte).map((e) => e.nome).sort());
    expect(d.eixos.length).toBeGreaterThan(0);
    expect(d.svg).toContain('class="corte-sec');
    expect(d.svg).toContain(`data-secoes="${d.cena.secoes.length}"`);
    expect(d.svg).not.toMatch(/#[0-9a-fA-F]{3,6}\b|rgb\(/);
    expect(niveisDoEdificio(b).length).toBe(ps.length + 1);
  });

  it('intervalos da reta: contorno com furo e reta fora do polígono', () => {
    const quad = (x0: number, y0: number, x1: number, y1: number): [number, number][] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    expect(intervalosDaReta([0, 1], [10, 1], [quad(2, 0, 8, 3), quad(4, 0.5, 5, 2)]).map(([a, z]) => [+a.toFixed(6), +z.toFixed(6)])).toEqual([[2, 4], [5, 8]]);
    expect(intervalosDaReta([0, 5], [10, 5], [quad(2, 0, 8, 3)])).toEqual([]);
  });
});

describe('linha de seção do pavimento (V2)', () => {
  const b = modelo(), pav = pavimentosOrdenados(b).find((p) => p.grupo === b.vigas[0].grupo)!;

  it('reta horizontal: apoios, vãos livres e de eixo a eixo', () => {
    const s = secaoDoPavimento(b, { id: 'se_1', nome: 'S1', a: [-1, 2.25], b: [11, 2.25] }, pav.id);
    expect(s.comprimento).toBeCloseTo(12, 9);
    expect(s.apoios.map((a) => a.tipo)).toEqual(['viga', 'viga', 'viga']);
    expect(s.apoios.map((a) => +((a.u0 + a.u1) / 2).toFixed(6))).toEqual([1, 6, 11]);
    expect(s.vaos.length).toBe(2);
    for (const v of s.vaos) { expect(v.livre).toBeCloseTo(5 - 0.15, 6); expect(v.eixo).toBeCloseTo(5, 6); expect(v.laje).toBe(true); }
    const lajes = s.elementos.filter((e) => e.tipo === 'laje');
    expect(lajes.length).toBe(3); // x de 0 a 5, de 5 a 10 e o começo da seguinte
    for (const l of lajes) { expect(l.z1).toBeCloseTo(pav.cota, 9); expect(l.z1 - l.z0).toBeCloseTo(0.12, 9); }
    for (const v of s.elementos.filter((e) => e.tipo === 'viga')) expect(v.z1 - v.z0).toBeCloseTo(0.5, 9);
    expect(s.svg).toContain('data-secao="se_1"');
  });

  it('reta a 30°: a corda da viga é a largura dividida pelo cosseno do ângulo', () => {
    const t = Math.PI / 6, a: [number, number] = [5 - 3 * Math.cos(t), 2.25 - 3 * Math.sin(t)], z: [number, number] = [5 + 3 * Math.cos(t), 2.25 + 3 * Math.sin(t)];
    const s = secaoDoPavimento(b, { id: 'se_2', nome: 'S2', a, b: z }, pav.id);
    const vigas = s.elementos.filter((e) => e.tipo === 'viga');
    expect(vigas.length).toBe(1);
    expect(vigas[0].u1 - vigas[0].u0).toBeCloseTo(0.15 / Math.cos(t), 6);
    expect((vigas[0].u0 + vigas[0].u1) / 2).toBeCloseTo(3, 6);
  });

  it('pilares entram como apoios pela altura do lance', () => {
    const s = secaoDoPavimento(b, { id: 'se_3', nome: 'S3', a: [-1, 0], b: [6, 0] }, pav.id);
    const pilares = s.elementos.filter((e) => e.tipo === 'pilar');
    expect(pilares.length).toBe(2);
    for (const p of pilares) { expect(u(p)).toBeCloseTo(0.2, 6); expect(p.z1 - p.z0).toBeCloseTo(peDireito(b, pav.id), 9); }
    // pilar e viga sobrepostos viram um só apoio
    expect(s.apoios.length).toBe(1);
    function u(e: { u0: number; u1: number }) { return e.u1 - e.u0; }
  });
});

describe('armaduras em 3D (V2)', () => {
  let m: BuildingModel, dim: Dimensionamento;
  beforeAll(() => {
    m = modelo();
    dim = dimensionarEdificio(m, analisarEdificio(m));
  });
  const TODAS = { limiteSegmentos: 1e9 };

  it('cada barra tem o comprimento do detalhamento; soma por elemento = resumo (1 %)', () => {
    const a = armaduras3D(m, dim, TODAS);
    expect(a.truncado).toBe(false);
    for (const x of a.barras) expect(Math.abs(comprimentoCaminho(x.caminho) - x.comprimento)).toBeLessThan(Math.max(1e-6, 0.002 * x.comprimento));
    const tot = (o: string) => soma(a.barras.filter((x) => x.origem === o).map((x) => comprimentoCaminho(x.caminho)));
    const resumo = (xs: { comprimento: number }[]) => soma(xs.map((x) => x.comprimento));
    const rv = resumo(resumoAcoVigas(m, dim.detalhes!, 0)), rl = resumo(resumoAcoLajes(m, dim.detalhesLajes!, 0));
    expect(tot('viga')).toBeGreaterThan(0);
    expect(Math.abs(tot('viga') - rv) / rv).toBeLessThan(0.01);
    expect(Math.abs(tot('laje') - rl) / rl).toBeLessThan(0.01);
    const rp = resumo(dim.resumoAcoPilares!);
    expect(Math.abs(tot('pilar') - rp) / rp).toBeLessThan(0.01);
  });

  it('comprimentos por elemento batem com n × comprimento do detalhe', () => {
    const v = m.vigas[0], d = dim.detalhes!.find((q) => q.viga === v.id)!, pav = pavimentosOrdenados(m).filter((p) => p.grupo === v.grupo)[0];
    const a = armaduras3D(m, dim, { ...TODAS, elementos: [v.id], pavimentos: [pav.id] });
    const esperado = soma(d.barras.map((x) => x.n * x.comprimento)) + soma(d.estribos.map((z) => z.n * z.comprimento));
    expect(a.comprimentos[`${v.id}|${pav.id}`]).toBeCloseTo(esperado, 2);
    expect(a.barras.every((x) => x.origem === 'viga' && x.pavimento === pav.id)).toBe(true);
  });

  it('estribos: laço retangular fechado com duas pernas de gancho', () => {
    const a = armaduras3D(m, dim, { ...TODAS, tipos: ['viga'] });
    const e = a.barras.find((x) => x.tipo === 'estribo')!;
    expect(e.caminho.length).toBe(7);
    const [ini, ...resto] = e.caminho, fim = resto.pop()!;
    // o laço (pontos 1 a 5) fecha; as pontas ficam dentro do núcleo
    expect(e.caminho[1]).toEqual(e.caminho[5]);
    expect(ini).not.toEqual(e.caminho[1]);
    expect(fim).not.toEqual(e.caminho[5]);
    // plano vertical (seção reta): as quatro quinas estão num mesmo plano
    const z = e.caminho.slice(1, 5).map((p) => p[2]);
    expect(Math.max(...z) - Math.min(...z)).toBeGreaterThan(0.2);
  });

  it('barras dentro da seção: inferiores abaixo das superiores, ganchos nas pontas', () => {
    const v = m.vigas[0], pav = pavimentosOrdenados(m).find((p) => p.grupo === v.grupo)!;
    const a = armaduras3D(m, dim, { ...TODAS, elementos: [v.id], pavimentos: [pav.id] });
    const zInf = a.barras.filter((x) => x.face === 'inf').map((x) => x.caminho[Math.floor(x.caminho.length / 2)][2]);
    const zSup = a.barras.filter((x) => x.face === 'sup').map((x) => x.caminho[Math.floor(x.caminho.length / 2)][2]);
    expect(zInf.length).toBeGreaterThan(0);
    if (zSup.length) expect(Math.max(...zInf)).toBeLessThan(Math.min(...zSup));
    for (const z of [...zInf, ...zSup]) { expect(z).toBeGreaterThan(pav.cota - v.secao.h); expect(z).toBeLessThan(pav.cota); }
  });

  it('limite de segmentos, seleção e fusão por camada', () => {
    const pouco = armaduras3D(m, dim, { limiteSegmentos: 500 });
    expect(pouco.truncado).toBe(true);
    expect(pouco.segmentos).toBeLessThanOrEqual(500);
    expect(pouco.avisos.join(' ')).toMatch(/Limite/);
    const todas = armaduras3D(m, dim, TODAS);
    for (const por of ['bitola', 'tipo', 'elemento', 'posicao'] as const) {
      const cs = camadasDeArmadura(todas, por);
      expect(soma(cs.map((c) => c.segmentos))).toBe(todas.segmentos);
      expect(soma(cs.map((c) => c.linhas.length / 6))).toBe(todas.segmentos);
      expect(soma(cs.map((c) => c.barras))).toBe(todas.barras.length);
    }
    expect(camadasDeArmadura(todas, 'bitola').length).toBeLessThan(todas.barras.length);
    const so = armaduras3D(m, dim, { ...TODAS, tipos: ['pilar'] });
    expect(so.barras.every((x) => x.origem === 'pilar')).toBe(true);
  });

  it('malha dos tubos: faces por segmento, raio e eixo', () => {
    const { pos, idx } = malhaDeTubos([0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 3, 1], 0.01, 6);
    expect(pos.length).toBe(2 * 6 * 2 * 3);
    expect(idx.length).toBe(2 * 6 * 6);
    // cada anel está a 0,01 do eixo, nas cotas das pontas
    for (let v = 0; v < 12; v++) { expect(Math.hypot(pos[v * 3], pos[v * 3 + 1])).toBeCloseTo(0.01, 6); expect(pos[v * 3 + 2]).toBeCloseTo(v % 2 === 0 ? 0 : 2, 6); }
    // todos os índices apontam para vértices existentes
    expect(Math.max(...idx)).toBeLessThan(pos.length / 3);
  });

  it('barra da laje: posições em planta dentro do contorno da laje e na altura da laje', () => {
    const l = m.lajes[0], pav = pavimentosOrdenados(m).find((p) => p.grupo === l.grupo)!;
    const a = armaduras3D(m, dim, { ...TODAS, elementos: [l.id], pavimentos: [pav.id] });
    expect(a.barras.length).toBeGreaterThan(0);
    for (const x of a.barras) for (const p of x.caminho) { expect(p[2]).toBeLessThanOrEqual(pav.cota + 0.3); expect(p[2]).toBeGreaterThan(pav.cota - 0.5); }
  });

  it('cena do elemento: só o concreto dele e as barras dentro do envelope do concreto', () => {
    const v = m.vigas[0], r = cenaDoElemento(m, dim, 'viga', v.id);
    expect(r.cena.objetos.length).toBe(1);
    expect(r.cena.objetos[0].elemento).toBe(v.id);
    expect(r.armaduras.barras.length).toBeGreaterThan(0);
    const { min, max } = r.cena.limites, e = 0.5; // ganchos e arredondamentos podem passar um pouco do trecho
    for (const x of r.armaduras.barras) for (const p of x.caminho) { expect(p[0]).toBeGreaterThan(min[0] - e); expect(p[0]).toBeLessThan(max[0] + e); expect(p[2]).toBeGreaterThan(min[2] - e); expect(p[2]).toBeLessThan(max[2] + e); }
    const p0 = m.pilares[0], rp = cenaDoElemento(m, dim, 'pilar', p0.id);
    expect(rp.cena.objetos.length).toBe(lancesDoPilar(m, p0).length);
    expect(rp.armaduras.barras.every((x) => x.origem === 'pilar')).toBe(true);
  });
});
