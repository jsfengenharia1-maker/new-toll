// Ábacos das nervuradas bidirecionais (E3d): geração automática contra o cálculo manual (malha de 6 × 6 m, ábaco de 1/6), cone, limites
// e borda; zona maciça ajustada às cubetas; rebaixo; armadura base e reforço negativo; punção com contornos recortados pelas cubetas
// (C′ e C″ à mão) e ábaco manual com aviso.
import { describe, expect, it } from 'vitest';
import { analisarEdificio } from './analitico';
import { ANTES_DESAPRUMO } from './antesDesaprumo';
import { dimensionarEdificio } from './dimensionamento';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { barArea, beamFlexure } from '../concrete';
import { dentroPoligono, type P } from '../geom/faces';
import { barrasBaseAbaco, baseDoAbaco, dimensionarAbacoPilar, diagnosticosAbacos, parametrosAbaco, trechosDentro, type PilarGrupo } from './abacos';
import { abacosNoMemorial, puncaoSemAbaco } from './abacosMemorial';
import { abacosEfetivos, arranjoDaLaje, arranjoNervuras, geometriaBidirecional, lajeComAbacos, poligonoEfetivoAbaco } from './nervuradas';
import { acoDe, cobrimentoLaje, concretoDe } from './materiais';
import { classificar } from './revisao';
import { OPCOES_PADRAO_CALCULO, OPCOES_PADRAO_NBR } from './opcoes';
import { sugestaoDe } from './sugestoes';
import { montarPrancha } from '../sheets/prancha';
import { montarPranchasLajes } from '../sheets/armacaoLajes';
import { tirarDentro, verificarPuncao, type Regiao } from './puncao';
import type { BuildingModel } from './types';

const XS = [0.25, 6.25, 12.25]; // pilares 50 × 50 cm a 6 m entre eixos, faces coladas nas bordas do pano de 12,5 × 12,5 m

function lisa(opts: { gerar?: boolean | Record<string, unknown>; hAbaco?: number; extra?: (ok: (n: string, p: Record<string, unknown>) => void, s: Sessao) => void } = {}) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('vento.definir', { ativo: false });
  ok('opcoes.definir', { valores: ANTES_DESAPRUMO }); // baselines de punção de antes do desaprumo global
  ok('lote', { comandos: XS.flatMap((x) => XS.map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.5, h: 0.5 } } }))) });
  ok('laje.criar', { grupo: 'g_3', contorno: [[0, 0], [12.5, 0], [12.5, 12.5], [0, 12.5]], tipo: { tipo: 'nervurada', forma: 'cat:rec-60-30', hTotal: 0.35, capa: 0.05 } });
  const gerar = opts.gerar ?? true;
  if (gerar) ok('abaco.gerar', { lajes: [s.modelo.lajes[0].id], ...(opts.hAbaco ? { hAbaco: opts.hAbaco } : {}), ...(typeof gerar === 'object' ? gerar : {}) });
  opts.extra?.(ok, s);
  return s;
}
function calcular(b: BuildingModel) {
  const an = analisarEdificio(b);
  expect(an.erro).toBeUndefined();
  return { an, d: dimensionarEdificio(b, an) };
}
const rel = (a: number, z: number) => Math.abs(a - z) / Math.abs(z);
const pilar = (id: string, centro: P, c = 0.5): PilarGrupo => ({ id, nome: id, centro, c1: c, c2: c, circular: false, angulo: 0, pavimento: 'x' });
const par = parametrosAbaco(OPCOES_PADRAO_CALCULO);

describe('opções e geração automática (cálculo manual)', () => {
  it('padrões: 1/6, cone de 40°, extensão maciça 0 e limites de 2,5 a 5 vezes a altura; o perfil NBR repete (a norma não fixa)', () => {
    expect(par).toEqual({ fracao: 1 / 6, cone: 40, extensao: 0, limMin: 2.5, limMax: 5 });
    expect(OPCOES_PADRAO_NBR.abacoFracao).toBe(1 / 6);
    expect(OPCOES_PADRAO_NBR.abacoLimMax).toBe(5);
  });

  it('pilar interno da malha de 6 × 6 m: extensão = 6/6 = 1,0 m a partir de cada face (ábaco de 2,5 m)', () => {
    const outros = [pilar('E', [-6, 0]), pilar('D', [6, 0]), pilar('N', [0, 6]), pilar('S', [0, -6])];
    const r = dimensionarAbacoPilar(pilar('C', [0, 0]), outros, 0.35, par);
    expect(r.faces.map((f) => [f.lado, +f.extensao.toFixed(9), f.origem, f.distancia])).toEqual([['u+', 1, 'cone', 6], ['u-', 1, 'cone', 6], ['v+', 1, 'cone', 6], ['v-', 1, 'cone', 6]]);
    const xs = r.poligono.map((q) => q[0]), ys = r.poligono.map((q) => q[1]);
    expect([Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)].map((v) => +v.toFixed(9))).toEqual([-1.25, 1.25, -1.25, 1.25]);
    // 0,5 + 2 × 1,0 = 2,5 m: lados do ábaco
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(2.5, 12);
  });

  it('cone de 40°: pilar a 38° da normal da face conta; a 46° é ignorado; a distância é a dos eixos', () => {
    // face u+ em (0,25; 0). Q1 = (6; 4,5): atan(4,5/5,75) = 38,0°  → dentro; distância dos eixos = √(6² + 4,5²) = 7,5 → 1,25 m
    const dentro = dimensionarAbacoPilar(pilar('C', [0, 0]), [pilar('Q1', [6, 4.5])], 0.35, par).faces.find((f) => f.lado === 'u+')!;
    expect(dentro.origem).toBe('cone');
    expect(dentro.vizinho).toBe('Q1');
    expect(dentro.distancia).toBeCloseTo(7.5, 12);
    expect(dentro.extensao).toBeCloseTo(7.5 / 6, 12);
    // Q2 = (6; 6): atan(6/5,75) = 46,2° > 40°
    const fora = dimensionarAbacoPilar(pilar('C', [0, 0]), [pilar('Q2', [6, 6])], 0.35, par).faces.find((f) => f.lado === 'u+')!;
    expect(fora.origem).toBe('minimo');
    expect(fora.vizinho).toBeUndefined();
    // com cone de 50° o mesmo pilar passa a contar
    const largo = dimensionarAbacoPilar(pilar('C', [0, 0]), [pilar('Q2', [6, 6])], 0.35, { ...par, cone: 50 }).faces.find((f) => f.lado === 'u+')!;
    expect(largo.origem).toBe('cone');
    expect(largo.extensao).toBeCloseTo(Math.hypot(6, 6) / 6, 12);
  });

  it('borda: sem pilar no cone vale o sentido oposto; sem nenhum, o mínimo de 2,5 h', () => {
    const r = dimensionarAbacoPilar(pilar('C', [0, 0]), [pilar('D', [6, 0])], 0.35, par);
    const f = (l: string) => r.faces.find((x) => x.lado === l)!;
    expect(f('u+').origem).toBe('cone');
    expect(f('u-').origem).toBe('oposto');
    expect(f('u-').extensao).toBeCloseTo(1, 12);
    expect(f('u-').vizinho).toBe('D');
    // v+ e v-: nenhum pilar → mínimo = 2,5 × 0,35 = 0,875
    expect(f('v+').origem).toBe('minimo');
    expect(f('v+').extensao).toBeCloseTo(0.875, 12);
    expect(f('v-').extensao).toBeCloseTo(0.875, 12);
  });

  it('limites: 3 m → 0,5 m sobe a 2,5 h = 0,875; 15 m → 2,5 m cai a 5 h = 1,75; a faixa maciça soma depois dos limites', () => {
    const perto = dimensionarAbacoPilar(pilar('C', [0, 0]), [pilar('Q', [3, 0])], 0.35, par).faces.find((f) => f.lado === 'u+')!;
    expect(perto.extensao).toBeCloseTo(0.875, 12);
    expect(perto.limitado).toBe('min');
    const longe = dimensionarAbacoPilar(pilar('C', [0, 0]), [pilar('Q', [15, 0])], 0.35, par).faces.find((f) => f.lado === 'u+')!;
    expect(longe.extensao).toBeCloseTo(1.75, 12);
    expect(longe.limitado).toBe('max');
    const mais = dimensionarAbacoPilar(pilar('C', [0, 0]), [pilar('Q', [6, 0])], 0.35, { ...par, extensao: 10 }).faces.find((f) => f.lado === 'u+')!;
    expect(mais.extensao).toBeCloseTo(1 + 0.1 * 6, 12);
    // pilar girado: as faces seguem os eixos do pilar
    const g = dimensionarAbacoPilar({ ...pilar('C', [0, 0]), angulo: 90 }, [pilar('N', [0, 6])], 0.35, par);
    expect(g.faces.find((f) => f.lado === 'u+')!.origem).toBe('cone'); // u girado a 90° aponta para +y
    expect(g.faces.find((f) => f.lado === 'v-')!.origem).toBe('minimo');
  });

  it('abaco.gerar no pano 12,5 × 12,5: 9 ábacos recortados pelo contorno; interno de 2,5 m; de canto de 1,5 m; bordas de 1,5 × 2,5 m', () => {
    const s = lisa();
    const b = s.modelo, area = (a: { poligono: [number, number][] }) => { const xs = a.poligono.map((q) => q[0]), ys = a.poligono.map((q) => q[1]); return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys)); };
    expect(b.abacos).toHaveLength(9);
    const dims = b.abacos!.map((a) => +area(a).toFixed(6)).sort((x, z) => x - z);
    // 4 cantos 1,5 × 1,5; 4 bordas 1,5 × 2,5; 1 interno 2,5 × 2,5
    expect(dims).toEqual([2.25, 2.25, 2.25, 2.25, 3.75, 3.75, 3.75, 3.75, 6.25]);
    const interno = b.abacos!.find((a) => a.pilar === b.pilares[4].id)!;
    expect(interno.poligono.map((q) => q.map((v) => +v.toFixed(6)))).toEqual([[5, 5], [7.5, 5], [7.5, 7.5], [5, 7.5]]);
    expect(interno.hAbaco).toBe(0.35);
    expect(interno.automatico).toBe(true);
    expect(interno.gerado!.faces.every((f) => f.origem === 'cone' && Math.abs(f.extensao - 1) < 1e-9)).toBe(true);
    // gerar de novo substitui os automáticos (sem duplicar) e mantém os manuais
    const l = b.lajes[0].id;
    expect(s.executar('abaco.criar', { laje: l, poligono: [[9, 9], [10, 9], [10, 10], [9, 10]] }).ok).toBe(true);
    expect(s.executar('abaco.gerar', { lajes: [l], fracao: 0.2 }).ok).toBe(true);
    expect(s.modelo.abacos!.filter((a) => a.automatico)).toHaveLength(9);
    expect(s.modelo.abacos!.filter((a) => !a.automatico)).toHaveLength(1);
  });

  it('pilares com viga encostada ficam de fora (padrão); `pilares` e somenteSemViga:false os incluem', () => {
    const s = lisa({ gerar: false, extra: (ok) => ok('viga.tracar', { grupo: 'g_3', pontos: [[0.25, 6.25], [6.25, 6.25]], secao: { b: 0.2, h: 0.5 } }) });
    expect(s.executar('abaco.gerar', { lajes: [s.modelo.lajes[0].id] }).ok).toBe(true);
    expect(s.modelo.abacos).toHaveLength(7); // P(0,25; 6,25) e P(6,25; 6,25) têm a viga
    expect(s.executar('abaco.gerar', { lajes: [s.modelo.lajes[0].id], somenteSemViga: false }).ok).toBe(true);
    expect(s.modelo.abacos).toHaveLength(9);
    const nao = s.executar('abaco.gerar', { lajes: [s.modelo.lajes[0].id], pilares: ['nao'] });
    expect(nao.ok).toBe(false);
  });
});

describe('zona maciça ajustada às cubetas e rebaixo', () => {
  const s = lisa({ gerar: false, extra: (ok, ss) => ok('abaco.criar', { laje: ss.modelo.lajes[0].id, poligono: [[5, 5], [7.5, 5], [7.5, 7.5], [5, 7.5]], hAbaco: 0.45 }) });
  const b = s.modelo, l = b.lajes[0], g = geometriaBidirecional(b, l.tipo as never);

  it('o retângulo alinhado às nervuras cresce até os eixos mais próximos: [5; 7,5] → [4,8; 7,8] (múltiplos de 0,6 m)', () => {
    const ef = abacosEfetivos(b, l, g);
    expect(ef).toHaveLength(1);
    const xs = ef[0].poligono.map((q) => +q[0].toFixed(9)), ys = ef[0].poligono.map((q) => +q[1].toFixed(9));
    expect([Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]).toEqual([4.8, 7.8, 4.8, 7.8]);
    expect(ef[0].area).toBeCloseTo(9, 9);
    // polígono não retangular fica como está
    const tri = poligonoEfetivoAbaco(l, g, [[5, 5], [7, 5], [5, 7]]);
    expect(tri.length).toBe(3);
  });

  it('retira exatamente as cubetas inteiras da zona: 5 × 5 = 25 a menos', () => {
    const sem = arranjoNervuras(l, g, 0).cubetas.length, com = arranjoNervuras(lajeComAbacos(b, l, g), g, 0).cubetas.length;
    expect(sem - com).toBe(25);
    const a = arranjoDaLaje(b, l)!;
    expect(a.arr.cubetas).toHaveLength(com);
    // volume: concreto inteiro menos cubetas + rebaixo (0,45 − 0,35) × 9 m²
    expect(a.volumeRebaixo).toBeCloseTo(0.1 * 9, 9);
    expect(a.arr.cubetas.every((c) => !a.abacos[0].poligono.some(() => false) && !dentroPoligono([(c.poligono[0][0] + c.poligono[2][0]) / 2, (c.poligono[0][1] + c.poligono[2][1]) / 2], a.abacos[0].poligono))).toBe(true);
  });

  it('o peso do rebaixo entra na grelha: ΔG = 25 kN/m³ × 0,10 m × 9 m² × 3 pavimentos; reações fecham com as cargas', () => {
    const b0 = lisa({ gerar: false, extra: (ok, ss) => ok('abaco.criar', { laje: ss.modelo.lajes[0].id, poligono: [[5, 5], [7.5, 5], [7.5, 7.5], [5, 7.5]] }) }).modelo;
    const a0 = analisarEdificio(b0), a1 = analisarEdificio(b);
    // a grelha não leva carga nos trechos dentro do pilar (0,25 m²): ΔG entre 95 % e 100 % de 25 × 0,10 × 9 × 3
    const dG = a1.totais.G - a0.totais.G;
    expect(dG).toBeLessThanOrEqual(25 * 0.1 * 9 * 3 + 1e-9);
    expect(dG).toBeGreaterThan(0.95 * 25 * 0.1 * 9 * 3);
    expect(dG).toBeCloseTo(25 * 0.1 * (9 - 0.25) * 3, 0);
    for (const gr of a1.grelhas.filter((x) => x.res)) expect(Object.values(gr.reacoes).reduce((t, r) => t + r.G, 0)).toBeCloseTo(gr.carga.G, 3);
  });
});

describe('dimensionamento: armadura base, reforço negativo e cortante da banda maciça', () => {
  const s = lisa();
  const b = s.modelo, { an, d } = calcular(b);
  const n = d.nervuradas![0], l = b.lajes[0], g = geometriaBidirecional(b, l.tipo as never);
  const ef = abacosEfetivos(b, l, g), interno = ef.find((e) => e.abaco.pilar === b.pilares[4].id)!;
  const c = concretoDe(b, 'laje'), aS = acoDe(b, 'lajeSup'), cob = cobrimentoLaje(b, undefined);

  it('sem erro, com 9 ábacos e o resumo do ábaco na mensagem da laje', () => {
    expect(n.status).toBe('ok');
    expect(n.abacos).toHaveLength(9);
    expect(d.lajes[0].mensagens.some((m) => /9 ábaco\(s\)/.test(m) && classificar(m).codigo === 'NERV_RESUMO')).toBe(true);
    for (const x of an.grelhas.filter((q) => q.res)) expect(Object.values(x.reacoes).reduce((t, r) => t + r.G, 0)).toBeCloseTo(x.carga.G, 3);
  });

  it('armadura base padrão: 2 barras da tabela por vão, de borda a borda: ábaco interno [4,8; 7,8]² → 5 vãos, 10 barras, C = 3,00 − 2 × 2,5 cm', () => {
    const bs = baseDoAbaco(b, l, interno.abaco, an.opcoes);
    expect(bs.padrao).toBe(true);
    expect(bs.inf).toEqual({ n: 2, phi: 5 });
    expect(bs.sup).toEqual({ n: 2, phi: 5 });
    const barras = barrasBaseAbaco(b, l, interno, g, bs);
    expect(barras).toHaveLength(4);
    for (const x of barras) { expect(x.vaos).toBe(5); expect(x.total).toBe(10); expect(x.comprimento).toBeCloseTo(3 - 2 * cob.sup, 9); }
    const r = n.abacos.find((a) => a.id === interno.abaco.id)!;
    expect(r.padrao).toBe(true);
    expect(r.base).toEqual(barras);
    // as posições do aço levam as bases
    expect(n.posicoes.filter((p) => p.tipo === 'abacoBase').length).toBeGreaterThanOrEqual(36);
  });

  it('reforço negativo sobre o pilar interno: As por banda à mão (retângulo i × hAbaco), menos a base; cobre e cabe', () => {
    const rib = n.nervuras.filter((r) => r.abacos.some((a) => a.abaco === interno.abaco.id));
    expect(rib.length).toBe(10); // 5 nervuras em cada direção atravessam o ábaco de 3,0 m
    const dAb = interno.abaco.hAbaco - cob.sup - 0.01;
    for (const r of rib) {
      const a = r.abacos.find((x) => x.abaco === interno.abaco.id)!;
      expect(a.x1 - a.x0).toBeCloseTo(3, 6);
      const M = -a.Mneg;
      const fn = beamFlexure({ kind: 'rect', bw: g.i[r.dir], h: interno.abaco.hAbaco }, false, M, dAb, 0.03, c, aS.fyd);
      expect(a.AsNec).toBeCloseTo(M > 0.05 ? Math.max(fn.As * 1e4, 0.0015 * g.bw[r.dir] * g.h * 1e4) : 0, 9);
      expect(a.AsBase).toBeCloseTo(2 * barArea(5) * 1e4, 9);
      const total = a.AsBase + (a.barras?.As ?? 0);
      expect(total).toBeGreaterThanOrEqual(a.AsNec - 1e-9);
      expect(a.cabe).toBe(true);
      expect(a.comprimento).toBeGreaterThan(a.x1 - a.x0 - 1e-9); // passa da borda do ábaco: ponto de momento nulo + decalagem
    }
    // a nervura mais solicitada passa de 40 kN·m por banda e leva barra grossa
    expect(Math.min(...rib.map((r) => r.abacos.find((x) => x.abaco === interno.abaco.id)!.Mneg))).toBeLessThan(-40);
  });

  it('cortante: seções dentro do ábaco são da banda maciça (largura = intereixo) e usam o VRd1 dela', () => {
    const r = n.nervuras.find((x) => x.abacos.length)!;
    const a = r.abacos[0];
    const solidas = r.cortante.secoes.filter((x) => x.solido);
    expect(solidas.length).toBeGreaterThan(0);
    for (const x of solidas) { expect(x.VRd).toBeCloseTo(a.VRd1, 9); expect(x.estribo).toBe(false); expect(x.x).toBeGreaterThanOrEqual(a.x0 - 1e-6); }
    // VRd1 da banda (60 cm × d do ábaco) é bem maior que o da nervura (10 cm)
    expect(a.VRd1).toBeGreaterThan(5 * r.cortante.VRd1);
    expect(a.VRd2).toBeGreaterThan(a.Vmax);
    expect(r.cortante.ok).toBe(true);
  });

  it('concreto: o volume sai do arranjo com as cubetas retiradas; aço dos ábacos entra no resumo', () => {
    const q = n.quantitativo, sem = calcular(lisa({ gerar: false }).modelo).d.nervuradas![0];
    expect(q.cubetas).toBeLessThan(sem.quantitativo.cubetas);
    expect(q.volumeConcreto).toBeGreaterThan(sem.quantitativo.volumeConcreto);
    expect(n.posicoes.some((p) => p.tipo === 'abaco')).toBe(true);
    expect(n.peso).toBeGreaterThan(sem.peso);
    const total = d.resumoAcoNervuradas!.reduce((t, x) => t + x.peso, 0);
    expect(total).toBeCloseTo(n.peso * 3, 6);
  });
});

describe('punção com ábaco (C′ e C″ à mão)', () => {
  const s = lisa();
  const b = s.modelo, { d } = calcular(b);
  const l = b.lajes[0], g = geometriaBidirecional(b, l.tipo as never), cob = cobrimentoLaje(b, undefined), dd = g.h - cob.sup - 0.01;
  const c = concretoDe(b, 'laje');
  const tipo1 = d.puncao!.filter((r) => r.pavimento === 'Tipo 1');
  const int = tipo1.find((r) => r.tipo === 'interno')!;

  it('9 pilares verificados, todos com ábaco; interno sem momento', () => {
    expect(tipo1).toHaveLength(9);
    expect(tipo1.every((r) => r.abaco && r.abaco.id)).toBe(true);
    expect(tipo1.filter((r) => r.tipo === 'interno')).toHaveLength(1);
    expect(tipo1.filter((r) => r.tipo === 'borda')).toHaveLength(4);
    expect(tipo1.filter((r) => r.tipo === 'canto')).toHaveLength(4);
    expect(int.M[0] + int.M[1]).toBeLessThan(1);
    expect(int.status).toBe('ok');
    expect(puncaoSemAbaco(d)).toEqual([]);
  });

  it('C: u = perímetro do pilar; C′ a 2 dAbaco da face: u = 4 × 0,5 + 2π × 2d e τ = FSd/(u d)', () => {
    expect(int.abaco!.dAbaco).toBeCloseTo(dd, 12);
    expect(int.abaco!.c2NoAbaco).toBe(true);
    const [C, C2] = int.contornos;
    expect(C.u).toBeCloseTo(2.0, 9);
    expect(C2.u).toBeCloseTo(2.0 + 2 * Math.PI * 2 * dd, 3); // arcos poligonais de 40 lados por quarto
    expect(rel(C2.tau, int.F / (C2.u * dd) / 1000)).toBeLessThan(2e-3);
    expect(rel(C.tau, int.F / (C.u * dd) / 1000)).toBeLessThan(2e-3);
    // τRd2 = 0,27 αv2 fcd e τRd1 = 0,13 (1 + √(20/d)) (100 ρ fck)^(1/3) com ρ do ábaco
    expect(int.tauRd2).toBeCloseTo(0.27 * (1 - c.fck / 250) * c.fcd, 9);
    expect(int.tauRd1).toBeCloseTo(0.13 * (1 + Math.sqrt(20 / (dd * 100))) * Math.cbrt(100 * int.abaco!.rhoAbaco * c.fck), 9);
    expect(C2.limite).toBeCloseTo(int.tauRd1, 9);
  });

  it('C″: a 2 dLaje da borda do ábaco efetivo [4,8; 7,8]², sem os trechos sobre as cubetas (amostragem independente a cada 1 mm)', () => {
    const [, , C3] = int.contornos;
    const a = 2 * dd, ef = abacosEfetivos(b, l, g).find((e) => e.abaco.pilar === int.pilar)!;
    const cubetas = arranjoDaLaje(b, l)!.arr.cubetas.map((x) => x.poligono as P[]);
    const [x0, x1] = [4.8, 7.8];
    // curva afastada de `a` do quadrado [x0, x1]²: 4 retas + 4 quartos de círculo
    const pts: P[] = [];
    const N = 4000;
    for (let i = 0; i < N; i++) {
      const t = (x1 - x0) * (i + 0.5) / N;
      pts.push([x0 + t, x0 - a], [x1 + a, x0 + t], [x1 - t, x1 + a], [x0 - a, x1 - t]);
    }
    const M = 4000;
    for (let i = 0; i < M; i++) {
      const th = (Math.PI / 2) * (i + 0.5) / M;
      pts.push([x1 + a * Math.cos(th), x0 + a * Math.sin(th) * -1 + 0], [x1 + a * Math.cos(th), x1 + a * Math.sin(th)], [x0 - a * Math.cos(th), x1 + a * Math.sin(th)], [x0 - a * Math.cos(th), x0 - a * Math.sin(th)]);
    }
    const peso = (x1 - x0) / N;
    let L = 0;
    for (let i = 0; i < N * 4; i++) if (!cubetas.some((cb) => dentroPoligono(pts[i], cb))) L += peso;
    for (let i = N * 4; i < pts.length; i++) if (!cubetas.some((cb) => dentroPoligono(pts[i], cb))) L += ((Math.PI / 2) * a) / M;
    expect(ef.area).toBeCloseTo(9, 9);
    expect(rel(C3.u, L)).toBeLessThan(2e-3);
    expect(C3.u).toBeLessThan(4 * 3.0 + 2 * Math.PI * a); // cubetas tiram parte do contorno cheio
    expect(C3.u).toBeGreaterThan(0.5 * (4 * 3.0 + 2 * Math.PI * a));
    // τSd = FSd/(u d) com d da laje; limite τRd1 com a taxa fora do ábaco
    expect(rel(C3.tau, int.F / (C3.u * int.abaco!.dLaje) / 1000)).toBeLessThan(2e-3);
    expect(C3.limite).toBeCloseTo(0.13 * (1 + Math.sqrt(20 / (dd * 100))) * Math.cbrt(100 * int.abaco!.rhoLaje * c.fck), 9);
    expect(C3.ok).toBe(true);
    expect(C3.nome).toBe('C″');
  });

  it('contorno recortado pelas cubetas (verificarPuncao): 3,0 m do lado de cima saem → u = 4 × 3,0 + 2π × 0,6 − 2,0', () => {
    const reg: Regiao = { poligonos: [[[-20, -20], [20, -20], [20, 20], [-20, 20]]], furos: [] };
    const ap = { centro: [0, 0] as P, c1: 3, c2: 3, circular: false, angulo: 0 };
    const par2 = { c, rho: 0.005, fywd: 250, tipoArm: 'estribo' as const, s0f: 0.5, srf: 0.75, passoCortante: 0, furoDist: 8, bitolas: [5, 6.3, 8] };
    const base = verificarPuncao({ ap, reg, d: 0.3, h: 0.35, F: 800, M: [0, 0], qd: 0 }, par2);
    const cubeta: P[] = [[-1, 2.1], [1, 2.1], [1, 2.5], [-1, 2.5]]; // cobre 2,0 m da reta y = 1,5 + 0,6 = 2,1
    const cort = verificarPuncao({ ap, reg, d: 0.3, h: 0.35, F: 800, M: [0, 0], qd: 0, excluir: [cubeta] }, par2);
    const uCheio = 4 * 3 + 2 * Math.PI * 0.6;
    expect(base.C2.u).toBeCloseTo(uCheio, 3);
    expect(cort.C2.u).toBeCloseTo(uCheio - 2.0, 3);
    // τ = F/(u d): 800 / ((uCheio − 2) × 0,3) kPa
    expect(cort.C2.tau * 1000).toBeCloseTo(800 / ((uCheio - 2) * 0.3), 1);
    // o auxiliar direto: segmento inteiro dentro sai, o de fora fica
    expect(tirarDentro([[[0, 0], [1, 0]], [[5, 5], [6, 5]]], [[[-1, -1], [2, -1], [2, 1], [-1, 1]]])).toEqual([[[5, 5], [6, 5]]]);
  });

  it('pilar de borda usa as faces livres: contorno C′ reduzido; τSd com momento; o de canto tem 2 lados', () => {
    const borda = tipo1.find((r) => r.tipo === 'borda')!, canto = tipo1.find((r) => r.tipo === 'canto')!;
    expect(borda.livres).toHaveLength(1);
    expect(canto.livres).toHaveLength(2);
    expect(borda.contornos[0].u).toBeCloseTo(1.5, 9); // 0,5 + 2 × 0,5
    expect(canto.contornos[0].u).toBeCloseTo(1.0, 9);
    expect(borda.abaco!.extensaoMin).toBeGreaterThan(1);
  });

  it('armadura de punção quando o C′ passa de τRd1: pilar interno com carga alta pede linhas radiais dentro do ábaco', () => {
    const forte = lisa({ extra: (ok) => ok('grupo.editar', { id: 'g_3', q: 40 }) });
    const r = calcular(forte.modelo).d.puncao!.filter((x) => x.pavimento === 'Tipo 1');
    const i = r.find((x) => x.tipo === 'interno')!;
    expect(i.status === 'armadura' || i.status === 'fail').toBe(true);
    if (i.armadura) {
      expect(i.armadura.linhas).toBeGreaterThanOrEqual(2);
      expect(i.armadura.posicoes.length).toBe(i.armadura.linhas);
      expect(i.mensagens.some((m) => classificar(m).codigo === 'PUNCAO_ARMADURA')).toBe(true);
    } else expect(i.mensagens.some((m) => /sem solução|τSd/.test(m))).toBe(true);
  });
});

describe('pilar sem ábaco e ábaco manual', () => {
  it('sem ábaco: punção nas nervuras com a altura da laje, aviso ABACO_FALTA, contornos recortados pelas cubetas', () => {
    const s = lisa({ gerar: false });
    const { d } = calcular(s.modelo);
    const t1 = d.puncao!.filter((r) => r.pavimento === 'Tipo 1');
    expect(t1).toHaveLength(9);
    expect(t1.every((r) => r.abaco && r.abaco.id === undefined)).toBe(true);
    const int = t1.find((r) => r.tipo === 'interno')!;
    expect(int.mensagens.some((m) => classificar(m).codigo === 'ABACO_FALTA')).toBe(true);
    expect(sugestaoDe('ABACO_FALTA')).toBeTruthy();
    expect(puncaoSemAbaco(d)).toHaveLength(27); // 9 pilares × 3 pavimentos
    const dd = 0.35 - cobrimentoLaje(s.modelo, undefined).sup - 0.01;
    expect(int.d).toBeCloseTo(dd, 12);
    expect(int.contornos[1].u).toBeLessThanOrEqual(2 + 2 * Math.PI * 2 * dd + 1e-9);
  });

  it('ábaco manual: dimensiona; comprido e estreito gera ABACO_VIGA, confirmado por comoViga; altura menor e fora do pano são recusadas ou avisadas', () => {
    const s = lisa({ gerar: false });
    const l = s.modelo.lajes[0].id;
    expect(s.executar('abaco.criar', { laje: l, poligono: [[2, 2], [10, 2], [10, 2.6], [2, 2.6]] }).ok).toBe(true);
    const diag = diagnosticosAbacos(s.modelo);
    expect(diag.map((x) => x.codigo)).toEqual(['ABACO_VIGA']);
    expect(diag[0].severidade).toBe('aviso');
    expect(sugestaoDe('ABACO_VIGA')).toBeTruthy();
    expect(s.executar('abaco.editar', { id: s.modelo.abacos![0].id, comoViga: true }).ok).toBe(true);
    expect(diagnosticosAbacos(s.modelo)).toEqual([]);
    // erros do comando
    expect(s.executar('abaco.criar', { laje: l, poligono: [[2, 2], [3, 2], [3, 3]], hAbaco: 0.2 }).ok).toBe(false); // menor que a laje
    expect(s.executar('abaco.criar', { laje: l, poligono: [[20, 20], [21, 20], [21, 21]] }).ok).toBe(false); // fora do pano
    expect(s.executar('abaco.criar', { laje: l, poligono: [[2, 2], [3, 2]] }).ok).toBe(false); // 2 vértices
    expect(s.executar('abaco.criar', { laje: 'x', poligono: [[2, 2], [3, 2], [3, 3]] }).ok).toBe(false);
    // se a altura da laje sobe depois, o ábaco fica baixo demais
    expect(s.executar('laje.nervurada', { ids: [l], forma: 'cat:rec-60-30', hTotal: 0.4, capa: 0.1 }).ok).toBe(true);
    expect(diagnosticosAbacos(s.modelo).map((x) => x.codigo)).toContain('ABACO_ALTURA');
  });

  it('editar o polígono de um ábaco automático o torna manual; remover e laje.remover limpam; armadura base editável', () => {
    const s = lisa();
    const a0 = s.modelo.abacos![4];
    expect(s.executar('abaco.editar', { id: a0.id, poligono: [[5, 5], [8, 5], [8, 8], [5, 8]] }).ok).toBe(true);
    const a1 = s.modelo.abacos!.find((a) => a.id === a0.id)!;
    expect(a1.automatico).toBe(false);
    expect(a1.gerado).toBeUndefined();
    expect(s.executar('abaco.armaduraBase', { ids: [a0.id], inf: { n: 3, phi: 8 }, sem: ['sup'] }).ok).toBe(true);
    expect(s.modelo.abacos!.find((a) => a.id === a0.id)!.base).toEqual({ inf: { n: 3, phi: 8 }, sup: null });
    expect(baseDoAbaco(s.modelo, s.modelo.lajes[0], s.modelo.abacos!.find((a) => a.id === a0.id)!, OPCOES_PADRAO_CALCULO)).toEqual({ inf: { n: 3, phi: 8 }, sup: null, padrao: false });
    expect(s.executar('abaco.armaduraBase', { ids: [a0.id], padrao: true }).ok).toBe(true);
    expect(s.modelo.abacos!.find((a) => a.id === a0.id)!.base).toBeUndefined();
    // regenerar mantém a base do ábaco automático do mesmo pilar
    expect(s.executar('abaco.armaduraBase', { ids: [s.modelo.abacos![0].id], inf: { n: 4, phi: 10 } }).ok).toBe(true);
    const pil = s.modelo.abacos![0].pilar;
    expect(s.executar('abaco.gerar', { lajes: [s.modelo.lajes[0].id] }).ok).toBe(true);
    expect(s.modelo.abacos!.find((a) => a.pilar === pil && a.automatico)!.base).toEqual({ inf: { n: 4, phi: 10 } });
    expect(s.executar('abaco.remover', { lajes: [s.modelo.lajes[0].id], automaticos: true }).ok).toBe(true);
    expect(s.modelo.abacos).toHaveLength(1); // o editado à mão é manual e fica
    expect(s.executar('abaco.remover', { ids: [s.modelo.abacos![0].id] }).ok).toBe(true);
    expect(s.modelo.abacos).toBeUndefined();
    expect(s.executar('abaco.remover', {}).ok).toBe(false);
    // laje.remover leva os ábacos
    const t = lisa();
    expect(t.executar('laje.remover', { ids: [t.modelo.lajes[0].id] }).ok).toBe(true);
    expect(t.modelo.abacos).toBeUndefined();
  });
});

describe('pranchas, memorial e trechos das nervuras', () => {
  const s = lisa();
  const b = s.modelo, { an, d } = calcular(b);

  it('trechosDentro: reta que atravessa o polígono, em duas partes quando entra e sai', () => {
    const quadrado: P[] = [[1, 1], [3, 1], [3, 3], [1, 3]];
    expect(trechosDentro([0, 2], [4, 2], quadrado)).toEqual([[1, 3]]);
    expect(trechosDentro([0, 5], [4, 5], quadrado)).toEqual([]);
    const U: P[] = [[0, 0], [3, 0], [3, 3], [2, 3], [2, 1], [1, 1], [1, 3], [0, 3]];
    const t = trechosDentro([-1, 2], [4, 2], U);
    expect(t).toHaveLength(2);
    expect(t[0][0]).toBeCloseTo(1, 9); expect(t[0][1]).toBeCloseTo(2, 9); expect(t[1][0]).toBeCloseTo(3, 9); expect(t[1][1]).toBeCloseTo(4, 9);
  });

  it('formas: ábacos hachurados com nome, altura e cotas em cm (interno 300 × 300)', () => {
    const f = montarPrancha(b, 'g_3');
    const txt = f.modelo!.flatMap((p) => (p.t === 'txt' ? [p.s] : []));
    expect(txt.filter((t) => /^AB\d h=35$/.test(t))).toHaveLength(9);
    expect(txt.filter((t) => t === '300').length).toBeGreaterThanOrEqual(2);
    expect(f.modelo!.filter((p) => p.t === 'pl' && p.c === 'FORMA-FINA' && !p.fechada && p.pts.length === 2).length).toBeGreaterThan(50); // hachura
  });

  it('armação: reforço sobre o pilar na folha das negativas, base nos dois lados e quadro de armadura base; aço da folha fecha com o resumo', () => {
    const folhas = montarPranchasLajes(b, an, d);
    expect(folhas).toHaveLength(2);
    const [pos, neg] = folhas;
    const txt = (f: typeof pos) => f.modelo!.flatMap((p) => (p.t === 'txt' ? [p.s] : []));
    expect(txt(neg).some((t) => /^AB\d [XY]\d+: .* N\d+ φ.* C=\d+$/.test(t))).toBe(true);
    expect(txt(neg).some((t) => /^AB\d: .* N\d+ φ5,0 C=\d+ \(2 por vão × \d\)$/.test(t))).toBe(true);
    expect(txt(pos).some((t) => /^AB\d: .* N\d+ φ5,0 C=\d+ \(2 por vão × \d\)$/.test(t))).toBe(true);
    // quadro de armadura base dos ábacos nas duas folhas (positivas: face inferior; negativas: face superior)
    for (const f of [pos, neg]) expect(f.papel.some((q) => q.t === 'txt' && /ARMADURA BASE DOS ÁBACOS/.test(q.s))).toBe(true);
    const kg = [pos, neg].reduce((t, f) => t + (f.aco?.tabela ?? []).reduce((u, r) => u + r.cTotal * barArea(r.phi) * 7850, 0), 0);
    expect(rel(kg, d.nervuradas![0].peso * 3)).toBeLessThan(0.1);
  });

  it('memorial: parâmetros de geração, faces, base, trechos das nervuras e punção por ábaco', () => {
    const m = abacosNoMemorial(b, d, an.opcoes);
    expect(m).toHaveLength(9);
    const int = m.find((x) => x.pilarNome === b.pilares[4].nome)!;
    expect(int.parametros).toEqual({ fracao: 1 / 6, cone: 40, extensao: 0, limMin: 2.5, limMax: 5 });
    expect(int.faces).toHaveLength(4);
    expect(int.base).toEqual({ inf: { n: 2, phi: 5 }, sup: { n: 2, phi: 5 }, padrao: true });
    expect(int.nervuras).toHaveLength(10);
    expect(int.puncao).toHaveLength(3); // 3 pavimentos
    expect(int.puncao[0].contornos.map((c) => c.nome)).toEqual(['C', 'C′', 'C″']);
    expect(int.largura).toBeCloseTo(3, 9);
    expect(int.altura).toBeCloseTo(3, 9);
  });

  it('sem ábacos o dimensionamento das nervuradas não muda (regressão): nada de ábaco no resultado nem no aço', () => {
    const sem = calcular(lisa({ gerar: false }).modelo).d.nervuradas![0];
    expect(sem.abacos).toEqual([]);
    expect(sem.nervuras.every((r) => r.abacos.length === 0 && r.cortante.secoes.every((x) => !x.solido))).toBe(true);
    expect(sem.posicoes.some((p) => p.tipo === 'abaco' || p.tipo === 'abacoBase')).toBe(false);
    expect(sem.quantitativo.volumeRebaixo).toBe(0);
  });
});
