import { describe, expect, it } from 'vitest';
import { edificioExemplo } from '../sheets/exemplo';
import { contornoPilar, lancesDoPilar, pavimentosOrdenados, peDireito } from '../building/types';
import { propriedadesLaje } from '../building/lajes';
import type { ResultadoFundacao } from '../building/fundacao';
import { areaComSinal, areaTriangulada, triangular, type P } from './triangular';
import { circulo, Malha, volumeMalha } from './malha';
import { alternarProjecao, caminhar, deslocar, dolly, enquadrar, iniciarCaminhar, metadeAltura, orbitar, posicaoCamera, ALTURA_OLHO } from './camera';
import { construirCena, GERADORES_3D, PAV_FUNDACAO, pavimentosDaCena, registrarGerador3D } from './cena';
import { isometricoSvg } from './isometrico';
import { linhasDeVigotas } from './lajes3d';
import { VENDOR_THREE, VERSAO_THREE } from './vendor';

const pacote = import.meta.glob('/package.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const vendor = import.meta.glob('/public/vendor/*');
const retang = (x0: number, y0: number, x1: number, y1: number): P[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const modelo = () => edificioExemplo().modelo;

describe('triangulação', () => {
  it('retângulo e L: soma das áreas = área do polígono', () => {
    expect(areaTriangulada(triangular(retang(0, 0, 4, 3)))).toBeCloseTo(12, 9);
    const L: P[] = [[0, 0], [4, 0], [4, 1], [1, 1], [1, 3], [0, 3]];
    const t = triangular(L);
    expect(t.idx.length / 3).toBe(L.length - 2);
    expect(areaTriangulada(t)).toBeCloseTo(Math.abs(areaComSinal(L)), 9);
  });
  it('laje com furos: área líquida (contorno − furos), em qualquer orientação', () => {
    const furoA = retang(1, 1, 2, 2), furoB = retang(5, 3, 6.5, 4).reverse();
    const t = triangular(retang(0, 0, 8, 5).reverse(), [furoA, furoB]);
    expect(areaTriangulada(t)).toBeCloseTo(40 - 1 - 1.5, 9);
  });
  it('furo circular e polígono côncavo com furo', () => {
    const C: P[] = [[0, 0], [10, 0], [10, 10], [5, 6], [0, 10]];
    const furo = circulo([5, 2.5], 1, 24);
    const t = triangular(C, [furo]);
    expect(areaTriangulada(t)).toBeCloseTo(Math.abs(areaComSinal(C)) - Math.abs(areaComSinal(furo)), 6);
  });
});

describe('malhas e volumes', () => {
  it('prisma = área × altura; tronco entre dois retângulos', () => {
    const m = new Malha();
    m.extrudar(retang(0, 0, 0.2, 0.5), [], 1, 4);
    expect(m.volume()).toBeCloseTo(0.2 * 0.5 * 3, 9);
    const t = new Malha();
    t.tronco(retang(0, 0, 2, 2), 0, retang(0.5, 0.5, 1.5, 1.5), 1);
    expect(t.volume()).toBeCloseTo((1 / 3) * (4 + 1 + 2), 9); // tronco de pirâmide: h/3·(A1 + A2 + √(A1·A2))
  });
  it('laje com furo tem volume (área líquida × espessura)', () => {
    const m = new Malha();
    m.extrudar(retang(0, 0, 6, 4), [retang(2, 1, 3, 2)], 0, 0.12);
    expect(m.volume()).toBeCloseTo((24 - 1) * 0.12, 9);
    expect(volumeMalha(m.pos, m.idx)).toBeCloseTo(m.volume(), 12);
  });
});

describe('cena do edifício fictício', () => {
  const b = modelo();
  const cena = construirCena(b);
  const ps = pavimentosOrdenados(b);

  it('contagens por tipo = elementos × pavimentos', () => {
    const lances = b.pilares.reduce((s, p) => s + lancesDoPilar(b, p).length, 0);
    const vigasPorPav = ps.reduce((s, p) => s + b.vigas.filter((v) => v.grupo === p.grupo).length, 0);
    const lajesPorPav = ps.reduce((s, p) => s + b.lajes.filter((l) => l.grupo === p.grupo).length, 0);
    expect(cena.contagens.porTipo.pilar).toBe(lances);
    expect(cena.contagens.porTipo.viga).toBe(vigasPorPav);
    expect(cena.contagens.porTipo.laje).toBe(lajesPorPav);
    expect(cena.contagens.total).toBe(lances + vigasPorPav + lajesPorPav);
    expect(cena.avisos).toEqual([]);
    expect(new Set(cena.objetos.map((o) => o.id)).size).toBe(cena.objetos.length);
  });

  it('volumes: pilar = b·h·altura do lance, laje = (área − furos)·h', () => {
    const p = b.pilares[0], pav = lancesDoPilar(b, p)[0];
    const o = cena.objetos.find((x) => x.id === `pilar:${p.id}:${pav.id}`)!;
    expect(o.volume).toBeCloseTo(0.2 * 0.5 * peDireito(b, pav.id), 9);
    const l = b.lajes[0], h = propriedadesLaje(l.tipo).h;
    const ol = cena.objetos.find((x) => x.elemento === l.id)!;
    const area = Math.abs(areaComSinal(l.contorno)) - (l.furos ?? []).reduce((s, f) => s + Math.abs(areaComSinal(f)), 0);
    expect(ol.volume).toBeCloseTo(area * h, 6);
    // topo da laje na cota do pavimento
    const pav2 = ps.find((q) => q.grupo === ol.grupo && q.id === ol.pavimento)!;
    const zs = [];
    for (let i = 2; i < ol.pos.length; i += 3) zs.push(ol.pos[i]);
    expect(Math.max(...zs)).toBeCloseTo(pav2.cota, 9);
    expect(Math.min(...zs)).toBeCloseTo(pav2.cota - h, 9);
  });

  it('lance do pilar vai da laje de baixo ao topo da laje do pavimento', () => {
    const p = b.pilares[0];
    for (const pav of lancesDoPilar(b, p)) {
      const o = cena.objetos.find((x) => x.id === `pilar:${p.id}:${pav.id}`)!;
      const zs = o.pos.filter((_, i) => i % 3 === 2);
      expect(Math.max(...zs)).toBeCloseTo(pav.cota, 9);
      expect(Math.min(...zs)).toBeCloseTo(pav.cota - peDireito(b, pav.id), 9);
      const xs = o.pos.filter((_, i) => i % 3 === 0), ys = o.pos.filter((_, i) => i % 3 === 1);
      const c = contornoPilar(p, p.secao);
      expect(Math.min(...xs)).toBeCloseTo(Math.min(...c.map((q) => q[0])), 9);
      expect(Math.max(...ys)).toBeCloseTo(Math.max(...c.map((q) => q[1])), 9);
    }
  });

  it('seleção por pavimento, grupo e intervalo', () => {
    const um = construirCena(b, { pavimentos: [ps[1].id] });
    expect(um.objetos.every((o) => o.pavimento === ps[1].id)).toBe(true);
    expect(um.contagens.total).toBeGreaterThan(0);
    expect(um.contagens.total).toBeLessThan(cena.contagens.total);
    const intervalo = construirCena(b, { de: ps[1].id, ate: ps[2].id });
    expect(new Set(intervalo.objetos.map((o) => o.pavimento))).toEqual(new Set([ps[1].id, ps[2].id]));
    expect(pavimentosDaCena(b, { de: ps[2].id, ate: ps[1].id })).toEqual(pavimentosDaCena(b, { de: ps[1].id, ate: ps[2].id }));
    const grupo = ps[0].grupo;
    const g = construirCena(b, { grupos: [grupo] });
    expect(g.objetos.every((o) => o.grupo === grupo || o.grupo === '')).toBe(true);
    expect(pavimentosDaCena(b).has(PAV_FUNDACAO)).toBe(true);
    expect(pavimentosDaCena(b, { grupos: [grupo] }).has(PAV_FUNDACAO)).toBe(false);
  });

  it('filtro por tipo', () => {
    const so = construirCena(b, { tipos: ['pilar'] });
    expect(Object.keys(so.contagens.porTipo)).toEqual(['pilar']);
    expect(so.contagens.total).toBe(cena.contagens.porTipo.pilar);
  });

  it('limites contêm todos os vértices', () => {
    for (const o of cena.objetos) for (let i = 0; i < o.pos.length; i += 3) {
      expect(o.pos[i]).toBeGreaterThanOrEqual(cena.limites.min[0] - 1e-9);
      expect(o.pos[i + 2]).toBeLessThanOrEqual(cena.limites.max[2] + 1e-9);
    }
  });

  it('pano sem laje vira laje pendente (C7.18) com marca "?"', () => {
    const sem = { ...b, lajes: b.lajes.filter((_, i) => i > 0) };
    const c = construirCena(sem, { tipos: ['laje'] });
    const pend = c.objetos.filter((o) => o.pendente);
    expect(pend.length).toBeGreaterThanOrEqual(1);
    expect(pend.every((o) => o.tipo === 'laje' && o.subtipo === 'definir')).toBe(true);
    expect(c.rotulos.length).toBe(pend.length);
    expect(c.rotulos[0].texto).toBe('?');
    expect(cena.objetos.some((o) => o.pendente)).toBe(false);
  });

  it('gerador que falha ou que ainda não existe não quebra a cena', () => {
    registrarGerador3D('teste-quebra', () => { throw new Error('boom'); });
    registrarGerador3D('teste-parede', ({ b: m }) => ({ objetos: m.pilares.length ? [{ id: 'parede:x:y', elemento: 'x', tipo: 'parede', pavimento: 'y', pavimentoNome: 'y', grupo: '', nome: 'x', descricao: '', pos: [0, 0, 0, 1, 0, 0, 0, 1, 0], idx: [0, 1, 2], linhas: [] }] : [] }));
    try {
      const c = construirCena(b);
      expect(c.avisos).toHaveLength(1);
      expect(c.avisos[0]).toContain('teste-quebra');
      expect(c.contagens.porTipo.parede).toBe(1);
      expect(c.contagens.porTipo.pilar).toBe(cena.contagens.porTipo.pilar);
    } finally {
      delete GERADORES_3D['teste-quebra'];
      delete GERADORES_3D['teste-parede'];
    }
  });

  it('detalhe alto: vigotas das treliçadas em linhas recortadas', () => {
    const tre = { ...b, lajes: b.lajes.map((l) => ({ ...l, tipo: { tipo: 'trelicada' as const, modelo: 'H12', capa: 0.04 } })) };
    const baixo = construirCena(tre, { tipos: ['laje'] }), alto = construirCena(tre, { tipos: ['laje'], detalhe: 'alto' });
    expect(baixo.auxiliares).toHaveLength(0);
    expect(alto.auxiliares.length).toBe(alto.objetos.length);
    expect(alto.auxiliares[0].linhas.length).toBeGreaterThan(0);
    // com a capa só, o volume da laje cai
    expect(alto.objetos[0].volume!).toBeLessThan(baixo.objetos[0].volume!);
  });

  it('linhas de vigotas respeitam o furo', () => {
    const ls = linhasDeVigotas(retang(0, 0, 5, 2), [retang(2, 0.5, 3, 1.5)], 0, 0.5, 0);
    // 4 linhas (y = 0.25, 0.75, 1.25, 1.75): as duas do meio são cortadas pelo furo
    const comprimento = (l: number[]) => { let s = 0; for (let i = 0; i < l.length; i += 6) s += Math.hypot(l[i + 3] - l[i], l[i + 4] - l[i + 1]); return s; };
    expect(comprimento(ls)).toBeCloseTo(4 * 5 - 2 * 1, 9);
  });
});

describe('fundações na cena', () => {
  const b = modelo();
  const base = { posicao: 'centrada', pilarIds: [], pilares: [], profundidade: 1.5, angulo: 0, ap: 0.2, bp: 0.5, excentricidade: [0, 0], carga: null, volume: 0, status: 'ok', mensagens: [], notas: [], resumo: '', projeto: null } as const;
  const sapata = { ...base, id: 'f1', nome: 'S1', tipo: 'sapata', cota: -1.5, centro: [0, 0], contorno: retang(-0.75, -0.75, 0.75, 0.75), dims: { A: 1.5, B: 1.5, h: 0.5, h0: 0.2 } } as unknown as ResultadoFundacao;
  const bloco = { ...base, id: 'f2', nome: 'B1', tipo: 'bloco', cota: -1.5, centro: [5, 0], contorno: retang(4.4, -0.3, 5.6, 0.3), dims: { A: 1.2, B: 0.6, h: 0.6, n: 2, D: 30, L: 8 } } as unknown as ResultadoFundacao;
  const tub = { ...base, id: 'f3', nome: 'T1', tipo: 'tubulao', cota: -4, centro: [10, 0], contorno: circulo([10, 0], 0.6), dims: { Df: 0.7, Db: 1.2, H: 0.9, L: 4 } } as unknown as ResultadoFundacao;
  it('sapata, bloco com estacas e tubulão entram como fundação; só com os resultados', () => {
    expect(construirCena(b).contagens.porTipo.fundacao).toBeUndefined();
    const c = construirCena(b, { fundacoes: [sapata, bloco, tub] });
    const f = c.objetos.filter((o) => o.tipo === 'fundacao');
    expect(f.map((o) => o.subtipo).sort()).toEqual(['bloco', 'estaca', 'sapata', 'tubulao']);
    const s = f.find((o) => o.subtipo === 'sapata')!;
    // base 1,5 × 1,5 × 0,2 + tronco (prismatoide: h/6·(A1 + 4·Am + A2)) até 0,2 × 0,5, altura 0,3
    expect(s.volume).toBeCloseTo(1.5 * 1.5 * 0.2 + (0.3 / 6) * (2.25 + 4 * 0.85 + 0.1), 6);
    const e = f.find((o) => o.subtipo === 'estaca')!;
    expect(e.volume!).toBeGreaterThan(0.9 * 2 * 8 * Math.PI * 0.15 ** 2);
    expect(c.contagens.porPavimento[PAV_FUNDACAO]).toBe(4);
    // isolar um pavimento deixa as fundações de fora
    expect(construirCena(b, { fundacoes: [sapata], pavimentos: [pavimentosOrdenados(b)[0].id] }).contagens.porTipo.fundacao).toBeUndefined();
  });
});

describe('câmera', () => {
  const l = { min: [0, 0, -1] as [number, number, number], max: [15, 9, 10] as [number, number, number] };
  it('troca perspectiva/isométrica preserva o enquadramento', () => {
    const c = enquadrar(l, 1.6);
    const i = alternarProjecao(c);
    expect(i.projecao).toBe('isometrica');
    expect(metadeAltura(i)).toBeCloseTo(metadeAltura(c), 12);
    expect(posicaoCamera(i)).toEqual(posicaoCamera(c));
    expect(alternarProjecao(i)).toEqual(c);
  });
  it('órbita, elevação limitada, zoom e deslocamento', () => {
    const c = enquadrar(l, 1);
    expect(orbitar(c, 0, 10).elevacao).toBeLessThan(Math.PI / 2);
    expect(orbitar(c, 0, -10).elevacao).toBeGreaterThan(-Math.PI / 2);
    expect(dolly(c, 0.5).dist).toBeCloseTo(c.dist / 2, 12);
    const d = deslocar(c, 0.1, 0);
    expect(Math.hypot(d.alvo[0] - c.alvo[0], d.alvo[1] - c.alvo[1], d.alvo[2] - c.alvo[2])).toBeCloseTo(0.1 * 2 * metadeAltura(c), 9);
    // a esfera envolvente cabe no enquadramento
    expect(metadeAltura(c)).toBeGreaterThan(0.9 * Math.hypot(15, 9, 11) / 2);
  });
  it('caminhar: altura do olho, velocidade e limites do edifício', () => {
    let e = iniciarCaminhar(l, 3);
    expect(e.pos[2]).toBeCloseTo(3 + ALTURA_OLHO, 12);
    e = caminhar(e, { frente: 1, lado: 0, giro: 0, inclinar: 0 }, 1, 2, l);
    expect(e.pos[0]).toBeCloseTo(7.5 + 2, 9);
    for (let i = 0; i < 100; i++) e = caminhar(e, { frente: 1, lado: 0, giro: 0, inclinar: 0 }, 1, 2, l);
    expect(e.pos[0]).toBeCloseTo(16, 9); // limite + 1 m
    expect(e.pos[2]).toBeCloseTo(3 + ALTURA_OLHO, 12);
    expect(caminhar(e, { frente: 0, lado: 0, giro: 0, inclinar: 5 }, 0, 1, l).pitch).toBeLessThan(Math.PI / 2);
  });
});

describe('isométrico em SVG', () => {
  const b = modelo();
  it('desenha os mesmos objetos da cena', () => {
    const cena = construirCena(b);
    const r = isometricoSvg(cena);
    expect(new Set(r.objetos)).toEqual(new Set(cena.objetos.map((o) => o.id)));
    expect(r.svg).toContain('<svg');
    expect(r.svg).toContain('v3d-pilar');
    expect(r.svg).not.toMatch(/#[0-9a-fA-F]{3,6}\b|rgb\(/);
  });
  it('destaque, filtro por tipo e cena vazia', () => {
    const cena = construirCena(b, { tipos: ['pilar'] });
    expect(isometricoSvg(cena, { destaque: new Set([b.pilares[0].id]) }).svg).toContain('v3d-sel');
    const vazia = isometricoSvg(construirCena({ ...b, pilares: [], vigas: [], lajes: [] }));
    expect(vazia.objetos).toEqual([]);
    expect(isometricoSvg(cena, { maxFaces: 10 }).faces).toBeLessThanOrEqual(10);
  });
});

describe('desempenho e vendor', () => {
  it('edifício de 13 pavimentos: cena construída em até 300 ms [a confirmar na execução]', () => {
    const s = edificioExemplo();
    const tipo = s.modelo.pavimentos.find((p) => p.grupo === 'g_3')!;
    const r = s.executar('pavimento.repetir', { id: tipo.id, vezes: 10 });
    expect(r.ok).toBe(true);
    const b = s.modelo;
    expect(b.pavimentos.length).toBeGreaterThanOrEqual(13);
    construirCena(b); // aquece
    const t0 = performance.now();
    const c = construirCena(b);
    const ms = performance.now() - t0;
    console.log(`cena de ${b.pavimentos.length} pavimentos: ${c.contagens.total} objetos, ${c.objetos.reduce((n, o) => n + o.idx.length / 3, 0)} triângulos em ${ms.toFixed(1)} ms`);
    expect(ms).toBeLessThan(300);
  });
  it('o three.js vendorizado existe com a versão do package.json (scripts/vendor-three.mjs)', () => {
    const pkg = JSON.parse(pacote['/package.json']) as { devDependencies: Record<string, string> };
    expect(pkg.devDependencies.three).toBe(VERSAO_THREE);
    const arquivos = Object.keys(vendor);
    expect(arquivos).toContain(`/public/${VENDOR_THREE}`);
    expect(arquivos).toContain('/public/vendor/three-LICENSE.txt');
  });
});
