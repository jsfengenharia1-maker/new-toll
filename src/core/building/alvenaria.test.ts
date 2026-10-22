// E1e: alvenaria estrutural e blocos de concreto: resistências, tensões-limite, armadura, modulação, quantitativo de blocos,
// desligamento muro-pilar, comandos e integração com a análise em casca. Valores esperados por cálculo manual.
import { describe, expect, it } from 'vitest';
import { analisarEdificio } from './analitico';
import {
  ajustarAberturaModular, aberturaModular, contarSequencia, diagnosticosAlvenaria, desligamentosMuroPilar, esbeltezAlvenaria, flexaoArmadaFaixa, fvdDe,
  quantitativoAlvenaria, resistenciaAlvenaria, utilizacaoElemento, escolherMalhaBlocos,
} from './alvenaria';
import { dimensionarAlvenaria, dimensionarVerga, verificarLadoAlvenaria, verificarPanoAlvenaria, vigasSobreMuros } from './alvenariaDim';
import { afetaCalculo } from '../commands';
import { dimensionarEdificio } from './dimensionamento';
import { memorialAlvenaria } from './memorialAlvenaria';
import { revisarEdificio } from './revisao';
import { opcoesEmUso } from './opcoes';
import { FORCAS_NULAS, type Forcas } from './paredesArmadura';
import type { ElementoPano } from './paredesDim';
import { caixa, nomePav, ok, padrao } from './paredesFixtures';
import type { TipoAlvenaria, TipoBloco } from './types';

const op = opcoesEmUso(undefined);
const B20: TipoBloco = { id: 'bl_2', nome: 'B20', comprimento: 0.4, largura: 0.2, altura: 0.2, fbk: 8 };
const TIPO_BLOCOS: TipoAlvenaria = { id: 'al_1', nome: 'Blocos B20', modelo: 'blocos', gama: 14, bloco: 'bl_2' };
const f = (o: Partial<Forcas>): Forcas => ({ ...FORCAS_NULAS, ...o });

describe('resistências (NBR 16868-1, a confirmar)', () => {
  it('blocos: prisma estimado 0,8·fbk, fk = 0,7·fpk, fd = fk/2 e tração 10 %', () => {
    const r = resistenciaAlvenaria(TIPO_BLOCOS, B20, op);
    expect(r.fpk).toBeCloseTo(6.4, 9);
    expect(r.fk).toBeCloseTo(4.48, 9);
    expect(r.fd).toBeCloseTo(2.24, 9);
    expect(r.ftd).toBeCloseTo(0.224, 9);
    expect(r.E).toBeCloseTo(5120, 9); // 800·fpk
    expect(r.nu).toBeCloseTo(0.2, 9);
    expect(r.G).toBeCloseTo(5120 / 2.4, 9);
  });
  it('prisma informado, rigidez ao cisalhamento informada (G = 0,4E → ν = 0,25) e E limitado a 16 GPa', () => {
    const r = resistenciaAlvenaria({ ...TIPO_BLOCOS, fpk: 10, considerarG: true }, B20, op);
    expect(r.fk).toBeCloseTo(7, 9);
    expect(r.E).toBeCloseTo(8000, 9);
    expect(r.nu).toBeCloseTo(0.25, 9);
    expect(r.G).toBeCloseTo(3200, 9);
    expect(resistenciaAlvenaria({ ...TIPO_BLOCOS, fpk: 30 }, B20, op).E).toBe(16000);
  });
  it('genérica: fd, ftd e fvd informados ou derivados', () => {
    const g: TipoAlvenaria = { id: 'g', nome: 'G', modelo: 'generica', gama: 13, E: 1500, fd: 1.2 };
    const r = resistenciaAlvenaria(g, undefined, op);
    expect(r.fd).toBe(1.2);
    expect(r.ftd).toBeCloseTo(0.12, 9);
    expect(fvdDe(r, 3)).toBeCloseTo(0.12, 9);
    expect(fvdDe(resistenciaAlvenaria({ ...g, ftd: 0.2, fvd: 0.3 }, undefined, op), 0)).toBe(0.3);
  });
  it('cisalhamento dos blocos: fvk = 0,15 + 0,5σ ≤ 1,4 dividido por γm', () => {
    const r = resistenciaAlvenaria(TIPO_BLOCOS, B20, op);
    expect(fvdDe(r, 0)).toBeCloseTo(0.075, 9);
    expect(fvdDe(r, 0.5)).toBeCloseTo(0.2, 9);
    expect(fvdDe(r, 4)).toBeCloseTo(0.7, 9);
  });
});

describe('esbeltez e tensões-limite por elemento', () => {
  const r = resistenciaAlvenaria(TIPO_BLOCOS, B20, op);
  it('λ = hef/t e R = 1 − (λ/40)³', () => {
    const e = esbeltezAlvenaria(2.8, 0.14, op, false);
    expect(e.lambda).toBeCloseTo(20, 9);
    expect(e.R).toBeCloseTo(0.875, 9);
    expect(e.ok).toBe(true);
    expect(esbeltezAlvenaria(2.8, 0.115, op, false).ok).toBe(false);
    expect(esbeltezAlvenaria(2.8, 0.115, op, true).ok).toBe(true);
    expect(esbeltezAlvenaria(2.8, 0.14, { ...op, alvenariaFlambagem: 2 }, false).lambda).toBeCloseTo(40, 9);
  });
  it('compressão: σN/(fd·R) + σM/fd com a excentricidade mínima hef/500', () => {
    const e = esbeltezAlvenaria(2.8, 0.14, op, false);
    const u = utilizacaoElemento(f({ ny: -140 }), 0.14, e, r, op);
    // σN = 140/(0,14·1000) = 1,0 MPa; M = 140·2,8/500 = 0,784; σM = 6·0,784/(0,0196·1000) = 0,24 MPa
    expect(u.comp).toBeCloseTo(1 / (2.24 * 0.875) + 0.24 / 2.24, 6);
    expect(u.trac).toBe(0);
    expect(u.cis).toBe(0);
    expect(utilizacaoElemento(f({ ny: -140 }), 0.14, e, r, { ...op, alvenariaExcMin: 0 }).comp).toBeCloseTo(1 / (2.24 * 0.875), 6);
  });
  it('tração (10 % da compressão): σM − σN contra ftd', () => {
    const e = esbeltezAlvenaria(2.8, 0.14, op, false);
    const u = utilizacaoElemento(f({ ny: -20, my: 1 }), 0.14, e, r, op);
    // σN = 20/140 = 0,142857; σM,tração = 6/(0,0196·1000) = 0,306122; ftd = 0,224
    expect(u.trac).toBeCloseTo((0.306122449 - 0.142857143) / 0.224, 6);
    expect(u.modo === 'tracao' || u.max >= u.trac).toBe(true);
    expect(utilizacaoElemento(f({ ny: -20, my: 1 }), 0.14, e, { ...r, armada: true }, op).trac).toBe(0);
  });
  it('cisalhamento: τ contra fvd(σN)', () => {
    const e = esbeltezAlvenaria(2.8, 0.14, op, false);
    const u = utilizacaoElemento(f({ ny: -140, nxy: 50 }), 0.14, e, r, op);
    // τ = 50/140 = 0,357 MPa; σN = 1,0 → fvk = 0,65 → fvd = 0,325
    expect(u.cis).toBeCloseTo(0.357142857 / 0.325, 6);
    expect(u.modo).toBe('cisalhamento');
  });
});

describe('armadura de blocos (flexão fora do plano)', () => {
  it('bloco retangular com as barras no centro: M = fc·a·(t − a)/2 e T = fc·a − N', () => {
    const r = flexaoArmadaFaixa(0, 10, 0.19, 3, 500 / 1.15);
    const rad = 0.19 ** 2 - 80 / 3000, a = (0.19 - Math.sqrt(rad)) / 2;
    expect(r.ok).toBe(true);
    expect(r.a).toBeCloseTo(a, 9);
    expect((3000 * a * (0.19 - a)) / 2).toBeCloseTo(10, 9);
    expect(r.As).toBeCloseTo(((3000 * a) / (500 / 1.15 * 1000)) * 1e4, 6);
    expect(r.As).toBeCloseTo(3.2042, 3);
  });
  it('a compressão reduz a armadura; compressão alta dispensa e depois reprova', () => {
    const fyd = 500 / 1.15;
    expect(flexaoArmadaFaixa(100, 10, 0.19, 3, fyd).As).toBeCloseTo(((3000 * 0.0464385 - 100) / (fyd * 1000)) * 1e4, 3);
    expect(flexaoArmadaFaixa(300, 10, 0.19, 3, fyd)).toMatchObject({ ok: true, As: 0 });
    expect(flexaoArmadaFaixa(500, 10, 0.19, 3, fyd).ok).toBe(false);
    expect(flexaoArmadaFaixa(0, 40, 0.19, 3, fyd).ok).toBe(false);
  });
  it('malha de menor área que atende, com espaçamento múltiplo do módulo', () => {
    const m = escolherMalhaBlocos(1.5, [8, 10, 12.5], 0.2, 1.2)!;
    expect(m.As).toBeGreaterThanOrEqual(1.5);
    expect(Math.round(m.s / 0.2) * 0.2).toBeCloseTo(m.s, 9);
    // candidatas ≥ 1,5 cm²/m: φ8 c/20 = 2,51; φ10 c/40 = 1,96; φ12,5 c/80 = 1,53 (menor área)
    expect(m).toMatchObject({ phi: 12.5, s: 0.8 });
    expect(m.As).toBeCloseTo((Math.PI * 1.25 ** 2 / 4) / 0.8 * 1, 3);
    expect(escolherMalhaBlocos(100, [8], 0.2, 1.2)).toBeNull();
  });
});

describe('pano (núcleo puro)', () => {
  // 4 colunas de 1 m × 3 linhas de 1 m, compressão uniforme de 100 kN/m e flexão linear my = 12(1 − z/3)
  const grade = (ny: number, flex = true): ElementoPano[] => {
    const els: ElementoPano[] = [];
    for (let i = 0; i < 4; i++) for (const z of [0.5, 1.5, 2.5]) els.push({ s: i + 0.5, z, area: 1, forcas: [f({ ny, my: flex ? 12 * (1 - z / 3) : 0 })] });
    return els;
  };
  const rb = resistenciaAlvenaria(TIPO_BLOCOS, B20, op), ra = { ...rb, armada: true };
  const base = { nome: 'p', t: 0.2, H: 3, combos: ['C1'], op, fydV: 500 / 1.15, fydH: 500 / 1.15, passoV: 0.2, passoH: 0.2 };

  it('parede sob compressão uniforme: atende e a fração é 100 %', () => {
    const r = verificarPanoAlvenaria({ ...base, elementos: grade(-100, false), res: rb });
    // σN = 0,5 MPa; λ = 15 → R = 0,947; M mín = 100·3/500 = 0,6 → σM = 0,9/... (6·0,6/(0,04·1000) = 0,09)
    expect(r.util.comp).toBeCloseTo(0.5 / (2.24 * (1 - 0.375 ** 3)) + 0.09 / 2.24, 6);
    expect(r.cumprimento).toBe(1);
    expect(r.status).toBe('ok');
    expect(r.mensagens).toEqual([]);
  });
  it('fator de cumprimento: 1 de 12 elementos fora (91,7 %) atende com 80 % e reprova com 100 %', () => {
    const els = grade(-100, false);
    els[0].forcas = [f({ ny: -100, nxy: 400 })]; // cisalhamento muito acima do limite só neste elemento
    const r80 = verificarPanoAlvenaria({ ...base, elementos: els, res: rb });
    expect(r80.cumprimento).toBeCloseTo(11 / 12, 9);
    expect(r80.pontos.length).toBe(1);
    expect(r80.pontos[0].motivo).toBe('cisalhamento');
    expect(r80.status).toBe('ok');
    expect(r80.mensagens.join(' ')).toMatch(/^Pontos fora das tensões-limite em 8,3 %/);
    const r100 = verificarPanoAlvenaria({ ...base, elementos: els, res: rb, op: { ...op, alvenariaCumprimento: 100 } });
    expect(r100.status).toBe('fail');
    expect(r100.mensagens.join(' ')).toMatch(/Fator de cumprimento 91,7 % abaixo do exigido 100,0 %/);
    // 70 % da área fora reprova mesmo com 80 %
    const muitos = grade(-100, false).map((e, i) => (i < 4 ? { ...e, forcas: [f({ ny: -100, nxy: 400 })] } : e));
    expect(verificarPanoAlvenaria({ ...base, elementos: muitos, res: rb }).status).toBe('fail');
  });
  it('esbeltez acima do limite reprova', () => {
    const r = verificarPanoAlvenaria({ ...base, t: 0.115, elementos: grade(-10, false), res: rb });
    expect(r.status).toBe('fail');
    expect(r.mensagens[0]).toMatch(/^Esbeltez λ = 26,1/);
  });
  it('armada: armadura vertical pela flexão do ponto mais exigente (cálculo manual) e mínimos', () => {
    const r = verificarPanoAlvenaria({ ...base, elementos: grade(-100), res: ra });
    expect(r.status).toBe('ok');
    // ponto z = 0,5: M = 10 kN·m/m; fc = fd·R com λ = 15 (R = 0,947266)
    const fc = 2.24 * (1 - 0.375 ** 3) * 1000, a = (0.2 - Math.sqrt(0.04 - 80 / fc)) / 2, As = ((fc * a - 100) / (500 / 1.15 / 1)) / 1000 * 1e4;
    expect(r.armadura!.nec.vert).toBeCloseTo(As, 6);
    expect(r.armadura!.vert!.As).toBeGreaterThanOrEqual(As);
    expect(r.armadura!.hor!.As).toBeGreaterThanOrEqual(((op.alvenariaTaxaHorMin / 100) * 0.2) * 1e4 - 1e-9);
    expect(r.armadura!.origem).toBe('calculada');
    expect(r.util.trac).toBe(0);
  });
  it('armada com armadura bloqueada insuficiente reprova e a suficiente atende', () => {
    const el = grade(-100);
    const ruim = verificarPanoAlvenaria({ ...base, elementos: el, res: ra, bloqueio: { vertical: { phi: 8, s: 1.2 } } });
    expect(ruim.status).toBe('fail');
    expect(ruim.mensagens.join(' ')).toMatch(/Armadura vertical bloqueada com 0,42 cm²\/m abaixo/);
    const boa = verificarPanoAlvenaria({ ...base, elementos: el, res: ra, bloqueio: { vertical: { phi: 12.5, s: 0.2 } } });
    expect(boa.status).toBe('ok');
    expect(boa.armadura!.origem).toBe('bloqueada');
  });
  it('armada: cisalhamento acima de fvd vira armadura horizontal (As,h = excedente/fyd)', () => {
    const els = grade(-100, false).map((e) => ({ ...e, forcas: [f({ ny: -100, nxy: 80 })] }));
    const r = verificarPanoAlvenaria({ ...base, elementos: els, res: ra });
    // σN = 0,5 → fvd = (0,15 + 0,25)/2 = 0,2 MPa → 40 kN/m; excedente 40 kN/m → 40/(434,78) ·10 = 0,92 cm²/m
    expect(r.armadura!.nec.hor).toBeCloseTo(Math.max(0.92, (op.alvenariaTaxaHorMin / 100) * 0.2 * 1e4), 1);
    expect(r.status).toBe('ok');
  });
  it('lado curto (pilar de alvenaria): compressão com momentos e tração', () => {
    const rb2 = resistenciaAlvenaria(TIPO_BLOCOS, B20, op);
    const v = verificarLadoAlvenaria(0.6, 0.2, 3, [{ nome: 'C1', N: -120, Mp: 0, Mo: 0 }], rb2, op);
    // σN = 120/(0,12·1000) = 1,0 MPa; λ = 15 (R = 0,947); M mín = 120·3/500 = 0,72 → σM = 6·0,72/(0,6·0,04·1000) = 0,18 MPa
    expect(v.util).toBeCloseTo(1 / (2.24 * (1 - 0.375 ** 3)) + 0.18 / 2.24, 6);
    expect(v.ok).toBe(true);
    expect(verificarLadoAlvenaria(0.6, 0.2, 3, [{ nome: 'C2', N: 30, Mp: 0, Mo: 0 }], rb2, op).ok).toBe(false); // tração de 0,25 MPa > ftd 0,224
  });
});

describe('modulação das aberturas', () => {
  it('porta: início no meio bloco, largura e topo para cima, peitoril 0', () => {
    const m = ajustarAberturaModular({ s: 1.07, largura: 0.9, peitoril: 0, altura: 2.1 }, 0, B20);
    expect(m).toEqual({ s: 1, largura: 1, peitoril: 0, altura: 2.2 });
    expect(aberturaModular(m, 0, B20)).toBe(true);
    expect(aberturaModular({ s: 1.07, largura: 0.9, peitoril: 0, altura: 2.1 }, 0, B20)).toBe(false);
  });
  it('janela e trecho que não começa em zero', () => {
    const m = ajustarAberturaModular({ s: 4.93, largura: 1.15, peitoril: 0.93, altura: 1.2 }, 3.9, B20);
    // s − 3,9 = 1,03 → 1,0 (5 módulos); largura 1,15 → 1,2; peitoril 0,93 → 1,0; topo 2,13 → 2,2
    expect(m).toEqual({ s: 4.9, largura: 1.2, peitoril: 1, altura: 1.2 });
  });
});

describe('contagem de peças da fiada', () => {
  it('fiadas alternadas: paridade 0 começa com inteiro, paridade 1 com meio nas duas pontas', () => {
    expect(contarSequencia(8, 0)).toEqual({ inteiros: 4, meios: 0 });
    expect(contarSequencia(8, 1)).toEqual({ inteiros: 3, meios: 2 });
    expect(contarSequencia(7, 0)).toEqual({ inteiros: 3, meios: 1 });
    expect(contarSequencia(7, 1)).toEqual({ inteiros: 3, meios: 1 });
    expect(contarSequencia(1, 1)).toEqual({ inteiros: 0, meios: 1 });
    expect(contarSequencia(0, 0)).toEqual({ inteiros: 0, meios: 0 });
  });
});

/** Obra de dois pavimentos com um bloco de 20 cm (meio bloco = 20 cm = largura: sem peça de canto) e a alvenaria de blocos. */
function obraBlocos(bloco: Partial<TipoBloco> = {}) {
  const s = padrao(1), t1 = nomePav(s, 'Tipo 1'), terreo = nomePav(s, 'Térreo');
  ok(s, 'bloco.tipo', { nome: 'B20', comprimento: 0.4, largura: 0.2, altura: 0.2, fbk: 8, ...bloco });
  ok(s, 'alvenaria.tipo', { nome: 'Blocos B20', modelo: 'blocos', bloco: s.modelo.blocos![0].id, gama: 14 });
  return { s, t1, terreo, mat: s.modelo.tiposAlvenaria![0].id };
}

describe('quantitativo de blocos', () => {
  it('parede reta de 3,2 m com porta: inteiros, meios e canaletas conferidos fiada a fiada', () => {
    const { s, t1, terreo, mat } = obraBlocos();
    ok(s, 'parede.criar', { pontos: [[0, 0], [3.2, 0]], espessura: 0.2, tipo: 'blocos', material: mat, nasce: terreo, morre: t1 });
    const w = s.modelo.paredes![0];
    ok(s, 'parede.abertura', { parede: w.id, s: 1, largura: 1, altura: 2, pavimento: terreo });
    const q = quantitativoAlvenaria(s.modelo)[0].lances[0];
    // 3,0 m / 0,2 = 15 fiadas; 16 módulos; porta nos módulos 5 a 9 (fiadas 0 a 9); verga na fiada 10 (apoio de 2 módulos) → 5 canaletas
    // fiadas 0 a 9: pares 5 int + 1 meio, ímpares 4 int + 3 meios; fiada 10: 3 int + 1 meio; fiadas 11 a 14: 30 int + 4 meios
    expect(q.fiadas).toBe(15);
    expect(q.inteiros).toBe(5 * 5 + 5 * 4 + 3 + 30);
    expect(q.meios).toBe(5 * 1 + 5 * 3 + 1 + 4);
    expect(q.canaletas).toBe(5);
    expect(q.cantos).toBe(0);
    expect(q.total).toBe(78 + 25 + 5);
    expect(q.area).toBeCloseTo(3.2 * 3 - 1 * 2, 9);
  });
  it('sem aberturas: 113 inteiros e 14 meios em 15 fiadas de 16 módulos', () => {
    const { s, t1, terreo, mat } = obraBlocos();
    ok(s, 'parede.criar', { pontos: [[0, 0], [3.2, 0]], espessura: 0.2, tipo: 'blocos', material: mat, nasce: terreo, morre: t1 });
    const t = quantitativoAlvenaria(s.modelo)[0].totais;
    expect(t).toMatchObject({ inteiros: 8 * 8 + 7 * 7, meios: 7 * 2, cantos: 0, canaletas: 0 });
  });
  it('largura que não é metade do comprimento: uma peça de canto por fiada e um módulo a menos em cada ponta do canto', () => {
    const { s, t1, terreo, mat } = obraBlocos({ largura: 0.15, nome: 'B15' });
    ok(s, 'parede.criar', { pontos: [[0, 0], [2, 0], [2, 2]], espessura: 0.15, tipo: 'blocos', material: mat, nasce: terreo, morre: t1 });
    const q = quantitativoAlvenaria(s.modelo)[0].lances[0];
    expect(q.cantos).toBe(15);
    // trechos de 2 m = 10 módulos − 1 (ponta no canto) = 9 cada: par (p0) 4 int + 1 meio, ímpar (p1) 4 int + 1 meio → por fiada 8 int + 2 meios
    expect(q.inteiros).toBe(15 * 8);
    expect(q.meios).toBe(15 * 2);
  });
  it('parede genérica não tem blocos; resumo por bloco soma as paredes', () => {
    const { s, t1, terreo, mat } = obraBlocos();
    ok(s, 'alvenaria.tipo', { nome: 'Genérica', modelo: 'generica', gama: 13, E: 1500, fd: 1.2 });
    ok(s, 'parede.criar', { pontos: [[0, 0], [3.2, 0]], espessura: 0.2, tipo: 'blocos', material: mat, nasce: terreo, morre: t1 });
    ok(s, 'parede.criar', { pontos: [[0, 5], [3.2, 5]], espessura: 0.2, tipo: 'alvenaria', material: s.modelo.tiposAlvenaria![1].id, nasce: terreo, morre: t1 });
    expect(quantitativoAlvenaria(s.modelo).length).toBe(1);
  });
});

describe('lançamento: diagnósticos e comandos', () => {
  it('parede de blocos sem material, com material inexistente ou de outro modelo é recusada', () => {
    const { s, t1, terreo } = obraBlocos();
    const r = s.executar('parede.criar', { pontos: [[0, 0], [3, 0]], espessura: 0.2, tipo: 'blocos', nasce: terreo, morre: t1 });
    expect(r.ok).toBe(false);
    expect(r.erros[0].codigo).toBe('ALV_MATERIAL');
    expect(s.executar('parede.criar', { pontos: [[0, 0], [3, 0]], espessura: 0.2, tipo: 'blocos', material: 'nao', nasce: terreo, morre: t1 }).ok).toBe(false);
    ok(s, 'alvenaria.tipo', { nome: 'Genérica', modelo: 'generica', gama: 13, E: 1500, fd: 1.2 });
    expect(s.executar('parede.criar', { pontos: [[0, 0], [3, 0]], espessura: 0.2, tipo: 'blocos', material: s.modelo.tiposAlvenaria![1].id, nasce: terreo, morre: t1 }).erros[0].codigo).toBe('ALV_MATERIAL');
  });
  it('avisos: espessura ≠ largura do bloco, abertura fora da modulação, lance sem fiadas inteiras', () => {
    const { s, t1, terreo, mat } = obraBlocos();
    ok(s, 'parede.criar', { pontos: [[0, 0], [3.2, 0]], espessura: 0.25, tipo: 'blocos', material: mat, nasce: terreo, morre: t1 });
    ok(s, 'parede.abertura', { parede: s.modelo.paredes![0].id, s: 1.07, largura: 0.9, altura: 2.1, pavimento: terreo });
    const d = diagnosticosAlvenaria(s.modelo).map((x) => x.codigo);
    expect(d).toContain('ALV_ESPESSURA');
    expect(d).toContain('ALV_ABERTURA_MODULACAO');
    expect(d).not.toContain('ALV_MODULACAO');
    ok(s, 'pavimento.editar', { id: t1, cota: 2.9 });
    expect(diagnosticosAlvenaria(s.modelo).map((x) => x.codigo)).toContain('ALV_MODULACAO');
  });
  it('parede.modularAbertura ajusta uma ou todas e desfaz', () => {
    const { s, t1, terreo, mat } = obraBlocos();
    ok(s, 'parede.criar', { pontos: [[0, 0], [3.2, 0]], espessura: 0.2, tipo: 'blocos', material: mat, nasce: terreo, morre: t1 });
    const w = s.modelo.paredes![0];
    ok(s, 'parede.abertura', { parede: w.id, s: 1.07, largura: 0.9, altura: 2.1, pavimento: terreo });
    ok(s, 'parede.modularAbertura', { parede: w.id });
    expect(s.modelo.paredes![0].aberturas![0]).toMatchObject({ s: 1, largura: 1, peitoril: 0, altura: 2.2 });
    expect(diagnosticosAlvenaria(s.modelo).map((x) => x.codigo)).not.toContain('ALV_ABERTURA_MODULACAO');
    s.desfazer();
    expect(s.modelo.paredes![0].aberturas![0].s).toBe(1.07);
    expect(s.executar('parede.modularAbertura', { parede: 'nao' }).ok).toBe(false);
  });
  it('bloco e tipo em uso não saem; G fora de 0,34E a 0,5E é recusado; armada só em blocos', () => {
    const { s, t1, terreo, mat } = obraBlocos();
    ok(s, 'parede.criar', { pontos: [[0, 0], [3.2, 0]], espessura: 0.2, tipo: 'blocos', material: mat, nasce: terreo, morre: t1 });
    expect(s.executar('bloco.tipo', { id: s.modelo.blocos![0].id, remover: true }).erros[0].codigo).toBe('BLOCO_EM_USO');
    expect(s.executar('alvenaria.tipo', { id: mat, remover: true }).erros[0].codigo).toBe('ALVENARIA_EM_USO');
    expect(s.executar('alvenaria.tipo', { id: mat, considerarG: true, G: 100 }).ok).toBe(false);
    expect(s.executar('alvenaria.tipo', { nome: 'G', modelo: 'generica', gama: 13, E: 1500, fd: 1.2, armada: true }).erros[0].codigo).toBe('ALVENARIA_ARMADA');
    expect(s.executar('alvenaria.tipo', { nome: 'G', modelo: 'generica', gama: 13 }).erros[0].codigo).toBe('ALVENARIA_DADOS');
    ok(s, 'alvenaria.tipo', { id: mat, armada: true, armadura: { vertical: { phi: 10, s: 0.4 } } });
    expect(s.modelo.tiposAlvenaria![0].armada).toBe(true);
    ok(s, 'alvenaria.tipo', { id: mat, armada: false });
    expect(s.modelo.tiposAlvenaria![0].armadura).toBeUndefined();
  });
  it('o que muda a análise: E, γ, fpk e fbk refazem; armadura, argamassa e armar só o dimensionamento', () => {
    expect(afetaCalculo('alvenaria.tipo', { id: 'al_1', fpk: 10 })).toBe(true);
    expect(afetaCalculo('alvenaria.tipo', { id: 'al_1', gama: 15 })).toBe(true);
    expect(afetaCalculo('alvenaria.tipo', { id: 'al_1', limpar: ['E'] })).toBe(true);
    expect(afetaCalculo('alvenaria.tipo', { id: 'al_1', armada: true, armadura: { vertical: { phi: 10, s: 0.4 } } })).toBe(false);
    expect(afetaCalculo('alvenaria.tipo', { id: 'al_1', argamassa: 6, graute: 25, limpar: ['armadura'] })).toBe(false);
    expect(afetaCalculo('alvenaria.tipo', { nome: 'novo', modelo: 'blocos', gama: 14 })).toBe(true);
    expect(afetaCalculo('bloco.tipo', { id: 'bl_1', fbk: 10 })).toBe(true);
    expect(afetaCalculo('verga.armadura', { acao: 'limpar', tipo: 'porta' })).toBe(false);
    expect(afetaCalculo('parede.modularAbertura', { parede: 'x' })).toBe(true);
  });
  it('a armadura de concreto da parede e da abertura não vale para alvenaria', () => {
    const { s, t1, terreo, mat } = obraBlocos();
    ok(s, 'parede.criar', { pontos: [[0, 0], [3.2, 0]], espessura: 0.2, tipo: 'blocos', material: mat, nasce: terreo, morre: t1 });
    ok(s, 'parede.abertura', { parede: s.modelo.paredes![0].id, s: 1, largura: 1, altura: 2, pavimento: terreo });
    const w = s.modelo.paredes![0];
    expect(s.executar('parede.armadura', { id: w.id, lado: 0, pavimento: t1, pano: 0, vert: { phi: 10, s: 0.15 }, hor: { phi: 8, s: 0.2 } }).erros[0].codigo).toBe('PAREDE_TIPO');
    expect(s.executar('abertura.armadura', { acao: 'editar', abertura: w.aberturas![0].id, armadura: { verga: { n: 2, phi: 10 }, estribo: { phi: 5, s: 0.2 }, montante: { n: 2, phi: 10 } } }).ok).toBe(false);
  });
  it('verga: editar, copiar, padrão e limpar', () => {
    const { s, t1, terreo, mat } = obraBlocos();
    ok(s, 'parede.criar', { pontos: [[0, 0], [6, 0]], espessura: 0.2, tipo: 'blocos', material: mat, nasce: terreo, morre: t1 });
    const w = s.modelo.paredes![0];
    ok(s, 'parede.abertura', { parede: w.id, s: 1, largura: 1, altura: 2, pavimento: terreo });
    ok(s, 'parede.abertura', { parede: w.id, s: 3, largura: 1, altura: 2, pavimento: terreo });
    const [a1, a2] = s.modelo.paredes![0].aberturas!;
    ok(s, 'verga.armadura', { acao: 'editar', abertura: a1.id, armadura: { n: 2, phi: 10 } });
    ok(s, 'verga.armadura', { acao: 'copiar', de: a1.id, para: [a2.id] });
    expect(s.modelo.paredes![0].aberturas![1].verga).toEqual({ n: 2, phi: 10 });
    ok(s, 'verga.armadura', { acao: 'padrao', tipo: 'janela', armadura: { n: 2, phi: 8, contraverga: { n: 2, phi: 8 } } });
    expect(s.modelo.vergasPadrao!.janela!.contraverga).toBeDefined();
    ok(s, 'verga.armadura', { acao: 'limpar', abertura: a1.id });
    ok(s, 'verga.armadura', { acao: 'limpar', tipo: 'janela' });
    expect(s.modelo.vergasPadrao).toBeUndefined();
    expect(s.executar('verga.armadura', { acao: 'copiar', de: a1.id, para: [a2.id] }).erros[0].codigo).toBe('SEM_ARMADURA');
  });
});

describe('desligamento muro-pilar', () => {
  function com(laje: 'trelicada' | 'macica') {
    const { s, t1, terreo, mat } = obraBlocos();
    ok(s, 'parede.criar', { pontos: [[0, 0], [4, 0]], espessura: 0.2, tipo: 'blocos', material: mat, nasce: terreo, morre: t1 });
    ok(s, 'pilar.inserir', { x: 0, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
    ok(s, 'pilar.inserir', { x: 10, y: 10, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
    const g = s.modelo.pavimentos.find((p) => p.id === t1)!.grupo;
    ok(s, 'laje.criar', { grupo: g, contorno: [[-1, -1], [5, -1], [5, 3], [-1, 3]], ...(laje === 'trelicada' ? { tipo: { tipo: 'trelicada', modelo: 'H12', capa: 0.04 } } : {}) });
    return s;
  }
  it('lajes de vigotas: o pilar em contato é desligado; o pilar distante não aparece', () => {
    const d = desligamentosMuroPilar(com('trelicada').modelo);
    expect(d.length).toBe(1);
    expect(d[0]).toMatchObject({ laje: 'vigotas', desligado: true, nomePilar: 'P1' });
    const diag = diagnosticosAlvenaria(com('trelicada').modelo).filter((x) => x.codigo.startsWith('MURO_PILAR'));
    expect(diag.map((x) => x.codigo)).toEqual(['MURO_PILAR_DESLIGADO']);
  });
  it('laje maciça: aviso MURO_PILAR_MACICA sugerindo lançar o muro como elemento', () => {
    const d = desligamentosMuroPilar(com('macica').modelo);
    expect(d[0]).toMatchObject({ laje: 'macica', desligado: false });
    const diag = diagnosticosAlvenaria(com('macica').modelo).find((x) => x.codigo === 'MURO_PILAR_MACICA')!;
    expect(diag.severidade).toBe('aviso');
    expect(diag.mensagem).toMatch(/Lance o muro como elemento/);
  });
});

describe('vigas sobre muros', () => {
  it('papel, dispensa pela opção e espessuras mínimas', () => {
    const { s, t1, terreo, mat } = obraBlocos();
    ok(s, 'parede.criar', { pontos: [[0, 0], [4, 0]], espessura: 0.2, tipo: 'blocos', material: mat, nasce: terreo, morre: t1 });
    const g = s.modelo.pavimentos.find((p) => p.id === t1)!.grupo;
    ok(s, 'viga.tracar', { grupo: g, pontos: [[0, 0], [4, 0]], secao: { b: 0.1, h: 0.15 } });
    ok(s, 'viga.embutir', { viga: s.modelo.vigas.at(-1)!.id, parede: s.modelo.paredes![0].id });
    const v = vigasSobreMuros(s.modelo, op)[0];
    expect(v).toMatchObject({ papel: 'coroamento', opcional: true, dispensada: false, status: 'fail' });
    expect(v.mensagens[0]).toMatch(/abaixo das dimensões mínimas 14 × 19 cm/);
    expect(vigasSobreMuros(s.modelo, { ...op, alvenariaVigaArmar: 0 })[0].dispensada).toBe(true);
    // muro de subsolo (com empuxo): viga de topo sempre armada
    ok(s, 'empuxo.tipo', { nome: 'Aterro', metodo: 'repouso', estratos: [{ espessura: 20, gama: 18, phi: 30 }], cotaAterro: 3 });
    ok(s, 'caso.criar', { nome: 'Empuxo', natureza: 'H', empuxo: s.modelo.empuxos![0].id });
    ok(s, 'parede.empuxo', { parede: s.modelo.paredes![0].id, empuxos: [{ caso: s.modelo.casos!.find((c) => c.nome === 'Empuxo')!.id, lado: 'dir' }] });
    expect(vigasSobreMuros(s.modelo, { ...op, alvenariaVigaArmar: 0 })[0]).toMatchObject({ papel: 'topoSubsolo', opcional: false, dispensada: false });
  });
});

describe('verga (núcleo puro)', () => {
  const rb = resistenciaAlvenaria(TIPO_BLOCOS, B20, op);
  const faixa = (N: number, M: number, V: number) => ({ combos: [{ N, M, V }] });
  const porta = { id: 'a1', tipo: 'porta' as const, s: 1, largura: 1, peitoril: 0, altura: 2, pavimento: 'p' };
  const e = { a: porta, nomePav: 'Tipo 1', lado: 0, lance: 'p', t: 0.2, bl: B20, res: rb, fyd: 500 / 1.15, op, hVerga: 1, hPeitoril: 0.05, peitoril: faixa(0, 0, 0), modular: true, semAviso: false };
  it('tração T = N/2 + M/z e barras n×φ com a área necessária', () => {
    const r = dimensionarVerga({ ...e, verga: faixa(60, 30, 5) });
    const z = 0.9 * (1 - 0.04), T = 30 + 30 / z; // kN
    expect(r.necessaria.verga).toBeCloseTo((T / (500 / 1.15 * 1000)) * 1e4, 6);
    expect(r.armadura.n * Math.PI * (r.armadura.phi / 10) ** 2 / 4).toBeGreaterThanOrEqual(r.necessaria.verga);
    expect(r.status).toBe('ok');
    expect(r.armadura.estribo).toBeUndefined();
  });
  it('cortante acima de fvd leva estribos; acima da biela 0,25·fd reprova, mas não em muro de subsolo', () => {
    // fvd(σ=0) = 0,075 MPa → VRd = 0,075·1000·0,2·0,96 = 14,4 kN
    const com = dimensionarVerga({ ...e, verga: faixa(10, 5, 40) });
    expect(com.cortante.VRd).toBeCloseTo(14.4, 6);
    expect(com.armadura.estribo).toBeDefined();
    expect(com.necessaria.estribo).toBeCloseTo(((40 - 14.4) / (0.9 * 0.96 * (500 / 1.15) * 1000)) * 1e4, 6);
    const biela = dimensionarVerga({ ...e, verga: faixa(10, 5, 150) });
    expect(biela.cortante.VRd2).toBeCloseTo(0.25 * 2.24 * 1000 * 0.2 * 0.96, 6);
    expect(biela.status).toBe('fail');
    expect(biela.mensagens[0]).toMatch(/^Verga: cortante/);
    expect(dimensionarVerga({ ...e, verga: faixa(10, 5, 150), semAviso: true }).status).toBe('ok');
  });
  it('verga bloqueada menor que a necessária reprova; janela leva contraverga', () => {
    const ruim = dimensionarVerga({ ...e, verga: faixa(200, 80, 5), bloqueada: { n: 2, phi: 8 } });
    expect(ruim.status).toBe('fail');
    expect(ruim.origem).toBe('bloqueada');
    const jan = dimensionarVerga({ ...e, a: { ...porta, tipo: 'janela', peitoril: 1 }, verga: faixa(20, 10, 5), hPeitoril: 1, peitoril: faixa(30, 6, 0) });
    expect(jan.armadura.contraverga).toBeDefined();
    expect(jan.necessaria.contraverga).toBeGreaterThan(0);
    expect(dimensionarVerga({ ...e, verga: faixa(20, 10, 5), modular: false }).mensagens.join(' ')).toMatch(/fora das medidas modulares/);
  });
});

describe('alvenaria no edifício (casca)', () => {
  it('a casca da parede de blocos usa E, ν e peso do tipo de alvenaria', () => {
    const { s, t1, terreo, mat } = obraBlocos();
    ok(s, 'parede.criar', { pontos: [[0, 0], [4, 0]], espessura: 0.2, tipo: 'blocos', material: mat, nasce: terreo, morre: t1 });
    ok(s, 'laje.criar', { grupo: s.modelo.pavimentos.find((p) => p.id === t1)!.grupo, contorno: [[-1, -1], [5, -1], [5, 3], [-1, 3]] });
    const an = analisarEdificio(s.modelo), cascas = an.portico.modelo.cascas!;
    expect(cascas.length).toBeGreaterThan(0);
    expect(cascas[0].E).toBeCloseTo(5120 * 1000, 3); // sem o fator de EA dos pilares nem o 0,8·Eci do concreto
    expect(cascas[0].nu).toBeCloseTo(0.2, 9);
    const d = dimensionarEdificio(s.modelo, an);
    expect(d.armaduraParedes).toBeUndefined(); // a parede de alvenaria não é armada como concreto
    expect(d.paredes!.length).toBe(1); // mas tem resultantes
    const a = d.alvenaria!, w = a.paredes[0];
    expect(w.tipo).toBe('blocos');
    expect(w.panos.length).toBeGreaterThan(0);
    expect(w.quantitativo!.totais.total).toBeGreaterThan(0);
    for (const p of w.panos) { expect(p.cumprimento).toBeGreaterThanOrEqual(0); expect(p.cumprimento).toBeLessThanOrEqual(1); expect(p.lambda).toBeCloseTo(15, 6); }
    expect(a.resumoBlocos[0].total).toBe(w.quantitativo!.totais.total);
  }, 120000);

  it('muro de subsolo de blocos armado sob empuxo: armadura vertical pela flexão e simetria entre os muros', () => {
    const cx = caixa();
    const s = cx.s;
    ok(s, 'bloco.tipo', { nome: 'B20', comprimento: 0.4, largura: 0.2, altura: 0.2, fbk: 12 });
    ok(s, 'alvenaria.tipo', { nome: 'Blocos armados', modelo: 'blocos', bloco: s.modelo.blocos![0].id, gama: 14, armada: true, fpk: 40 });
    const mat = s.modelo.tiposAlvenaria![0].id;
    for (const w of s.modelo.paredes!) ok(s, 'parede.editar', { id: w.id, tipo: 'blocos', material: mat });
    const an = analisarEdificio(s.modelo), d = dimensionarEdificio(s.modelo, an), al = d.alvenaria!;
    expect(al.paredes.length).toBe(2);
    const [m1, m2] = al.paredes;
    expect(m1.armada).toBe(true);
    const terreo = m1.panos.find((p) => p.nomePav === 'Térreo')!, tipo = m1.panos.find((p) => p.nomePav === 'Tipo 1')!;
    // a base do muro é mais solicitada que o lance de cima
    expect(terreo.armadura!.nec.vert).toBeGreaterThan(tipo.armadura!.nec.vert);
    expect(terreo.armadura!.nec.vert).toBeGreaterThan((op.alvenariaTaxaVertMin / 100) * 0.2 * 1e4);
    expect(terreo.armadura!.vert!.As).toBeGreaterThanOrEqual(terreo.armadura!.nec.vert);
    expect(m2.panos[0].armadura!.nec.vert).toBeCloseTo(m1.panos[0].armadura!.nec.vert, 3);
    // sem aberturas: sem vergas
    expect(m1.vergas.length).toBe(0);
    // com a alvenaria armada a tração não governa
    for (const p of m1.panos) expect(p.util.trac).toBe(0);
    // memorial: tabelas de dados e coerência com o resultado
    const tabs = memorialAlvenaria(s.modelo, d), ids = tabs.map((t) => t.id);
    expect(ids).toEqual(expect.arrayContaining(['alv-opcoes', 'alv-materiais', 'alv-panos', 'alv-armadura', 'alv-blocos', 'alv-resumo-blocos']));
    expect(tabs.find((t) => t.id === 'alv-panos')!.linhas.length).toBe(m1.panos.length + m2.panos.length);
    expect(tabs.find((t) => t.id === 'alv-resumo-blocos')!.linhas[0][5]).toBe(String(al.resumoBlocos[0].total));
    expect(tabs.find((t) => t.id === 'alv-opcoes')!.linhas.some((l) => l[0].includes('fator de cumprimento') && l[1] === '80,00 %')).toBe(true);
    // revisão: a parede reprovada/avisada aparece na lista de erros com os códigos ALV_*
    const rev = revisarEdificio(s.modelo, an, d);
    expect(rev.itens.filter((i) => i.codigo.startsWith('ALV_') && i.tipo === 'parede').every((i) => i.sugestao)).toBe(true);
  }, 180000);

  it('muro de alvenaria não armada sob empuxo: a tração (10 % da compressão) governa', () => {
    const cx = caixa();
    const s = cx.s;
    ok(s, 'alvenaria.tipo', { nome: 'Genérica', modelo: 'generica', gama: 13, E: 3000, fd: 3 });
    const mat = s.modelo.tiposAlvenaria![0].id;
    for (const w of s.modelo.paredes!) ok(s, 'parede.editar', { id: w.id, tipo: 'alvenaria', material: mat });
    const an = analisarEdificio(s.modelo), d = dimensionarEdificio(s.modelo, an), w = d.alvenaria!.paredes[0];
    const terreo = w.panos.find((p) => p.nomePav === 'Térreo')!;
    expect(terreo.util.trac).toBeGreaterThan(1);
    expect(terreo.status).toBe('fail');
    expect(terreo.cumprimento).toBeLessThan(0.8);
    expect(terreo.mensagens.join(' ')).toMatch(/Fator de cumprimento .* tração/);
    const rev = revisarEdificio(s.modelo, an, d).itens.filter((i) => i.tipo === 'parede' && i.id === w.id);
    expect(rev.some((i) => i.codigo === 'ALV_CUMPRIMENTO' && i.nivel === 'erro' && i.sugestao)).toBe(true);
    expect(w.vergas.length).toBe(0);
    // fd e ftd maiores: passa; a alteração do tipo vale sem refazer a geometria
    ok(s, 'alvenaria.tipo', { id: mat, fd: 30, ftd: 30, fvd: 30 });
    const w2 = dimensionarEdificio(s.modelo, analisarEdificio(s.modelo)).alvenaria!.paredes[0];
    expect(w2.panos.find((p) => p.nomePav === 'Térreo')!.cumprimento).toBe(1);
  }, 240000);

  it('concreto e alvenaria juntos: cada um no seu resultado', () => {
    const cx = caixa();
    const s = cx.s;
    ok(s, 'alvenaria.tipo', { nome: 'Genérica', modelo: 'generica', gama: 13, E: 3000, fd: 30, ftd: 30, fvd: 30 });
    ok(s, 'parede.editar', { id: s.modelo.paredes![1].id, tipo: 'alvenaria', material: s.modelo.tiposAlvenaria![0].id });
    const d = dimensionarEdificio(s.modelo, analisarEdificio(s.modelo));
    expect(d.armaduraParedes!.map((x) => x.id)).toEqual([s.modelo.paredes![0].id]);
    expect(d.alvenaria!.paredes.map((x) => x.id)).toEqual([s.modelo.paredes![1].id]);
  }, 240000);
});

describe('sem alvenaria nada muda', () => {
  it('obra sem paredes de alvenaria: dimensionarAlvenaria devolve undefined', () => {
    const { s } = obraBlocos();
    const an = analisarEdificio(padrao(1).modelo);
    expect(dimensionarAlvenaria(s.modelo, an, [], undefined, op)).toBeUndefined();
    expect(quantitativoAlvenaria(s.modelo)).toEqual([]);
    expect(diagnosticosAlvenaria(s.modelo)).toEqual([]);
  });
});

describe('roteiro do e2e E1e (duas paredes de blocos de 12 m com laje maciça e uma porta)', () => {
  it('três panos em M1, uma verga fora da modulação e depois modular; sem desligamentos', () => {
    const { s, t1, terreo, mat } = obraBlocos();
    ok(s, 'alvenaria.tipo', { id: mat, fpk: 10 });
    expect(resistenciaAlvenaria(s.modelo.tiposAlvenaria![0], s.modelo.blocos![0], op).fd).toBeCloseTo(3.5, 9);
    ok(s, 'laje.criar', { grupo: s.modelo.pavimentos.find((p) => p.id === t1)!.grupo, contorno: [[0, 0], [12, 0], [12, 6], [0, 6]], tipo: { tipo: 'macica', h: 0.12 } });
    ok(s, 'parede.criar', { pontos: [[0, 0], [12, 0]], espessura: 0.2, tipo: 'blocos', material: mat, morre: t1 });
    ok(s, 'parede.criar', { pontos: [[0, 6], [12, 6]], espessura: 0.2, tipo: 'blocos', material: mat, morre: t1 });
    const m1 = s.modelo.paredes!.find((w) => w.nome === 'M1')!;
    ok(s, 'parede.abertura', { parede: m1.id, s: 5.07, largura: 0.9, altura: 2.1, pavimento: terreo });
    const dimensiona = () => { const m = s.modelo; return dimensionarEdificio(m, analisarEdificio(m)); };
    const d = dimensiona(), r = d.alvenaria!.paredes.find((w) => w.id === m1.id)!;
    expect(r.panos.length).toBe(3);
    expect(r.vergas.length).toBe(1);
    expect(r.vergas[0].modular).toBe(false);
    expect(d.alvenaria!.desligamentos).toEqual([]);
    expect(d.alvenaria!.resumoBlocos.length).toBe(1);
    ok(s, 'parede.modularAbertura', { parede: m1.id });
    expect(s.modelo.paredes![0].aberturas![0]).toMatchObject({ s: 5, largura: 1, altura: 2.2 });
    const r2 = dimensiona().alvenaria!.paredes.find((w) => w.id === m1.id)!;
    expect(r2.vergas[0].modular).toBe(true);
    expect(r2.panos.length).toBe(3);
    ok(s, 'verga.armadura', { acao: 'editar', abertura: s.modelo.paredes![0].aberturas![0].id, armadura: { n: 2, phi: 12.5, estribo: { phi: 5, s: 0.2 } } });
    const r3 = dimensiona().alvenaria!.paredes.find((w) => w.id === m1.id)!;
    expect(r3.vergas[0].origem).toBe('bloqueada');
  }, 240000);
});
