// Memória detalhada (MD fase 7): alvenaria estrutural e paredes de blocos, vigas embutidas, base sobre molas e parcela axial (E6d).
// As contas são refeitas a partir das `entradas` e comparadas com o dimensionamento (erro relativo ≤ 1e-9); a memória ligada não
// muda o resultado (`toEqual`).
import { beforeAll, describe, expect, it } from 'vitest';
import { analisarEdificio, type AnaliseEdificio } from '../building/analitico';
import { flexaoArmadaFaixa } from '../building/alvenaria';
import { dimensionarEdificio, type Dimensionamento } from '../building/dimensionamento';
import { nomePav, ok, padrao } from '../building/paredesFixtures';
import { beamShear, concrete } from '../concrete';
import { memoriaDetalhada } from './edificio';
import { Registrador, comMemoria, type PassoMemoria } from './registrador';

const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1e-12, Math.abs(b));
const igual = (a: number, b: number, msg = '') => expect(rel(a, b) < 1e-9 || Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`).toBe(true);
const num = (p: PassoMemoria, k: string) => p.entradas[k] as number;
const json = <T>(p: PassoMemoria, k: string) => JSON.parse(p.entradas[k] as string) as T;
const por = (ps: PassoMemoria[], el: string, topico: RegExp | string) => ps.filter((p) => p.elemento === el && (typeof topico === 'string' ? p.topico === topico : topico.test(p.topico)));
const um = (ps: PassoMemoria[], el: string, topico: RegExp | string, desc: RegExp | string) => {
  const l = por(ps, el, topico).filter((p) => (typeof desc === 'string' ? p.descricao.startsWith(desc) : desc.test(p.descricao)));
  expect(l.length, `${el} · ${String(topico)} · ${String(desc)}`).toBeGreaterThan(0);
  return l[0];
};

// ---------------------------------------------------------------------------------------------- alvenaria de blocos

describe('MD7 · alvenaria estrutural (blocos B20: não armada com porta, armada com porta, pilar de alvenaria e viga sobre o muro)', () => {
  let an: AnaliseEdificio, dim: Dimensionamento, ps: PassoMemoria[], b: ReturnType<typeof padrao>['modelo'];
  beforeAll(() => {
    const s = padrao(1), t1 = nomePav(s, 'Tipo 1'), terreo = nomePav(s, 'Térreo');
    ok(s, 'bloco.tipo', { nome: 'B20', comprimento: 0.4, largura: 0.2, altura: 0.2, fbk: 8 });
    ok(s, 'alvenaria.tipo', { nome: 'Blocos B20', modelo: 'blocos', bloco: s.modelo.blocos![0].id, gama: 14 });
    const mat = s.modelo.tiposAlvenaria![0].id;
    ok(s, 'parede.criar', { pontos: [[0, 0], [3.2, 0]], espessura: 0.2, tipo: 'blocos', material: mat, nasce: terreo, morre: t1 });
    ok(s, 'parede.abertura', { parede: s.modelo.paredes![0].id, s: 1, largura: 1, altura: 2, pavimento: terreo });
    ok(s, 'alvenaria.tipo', { nome: 'Blocos B20 armados', modelo: 'blocos', bloco: s.modelo.blocos![0].id, gama: 14, armada: true });
    ok(s, 'parede.criar', { pontos: [[0, 8], [3.2, 8]], espessura: 0.2, tipo: 'blocos', material: s.modelo.tiposAlvenaria![1].id, nasce: terreo, morre: t1 });
    ok(s, 'parede.abertura', { parede: s.modelo.paredes![1].id, s: 1, largura: 1, altura: 2, pavimento: terreo });
    ok(s, 'parede.criar', { pontos: [[0, 12], [0.8, 12]], espessura: 0.2, tipo: 'blocos', material: mat, nasce: terreo, morre: t1 });
    // viga sobre o muro de blocos
    const g = s.modelo.pavimentos.find((p) => p.id === t1)!.grupo;
    ok(s, 'viga.tracar', { grupo: g, pontos: [[0, 0], [3.2, 0]], secao: { b: 0.15, h: 0.3 } });
    ok(s, 'viga.embutir', { viga: s.modelo.vigas.at(-1)!.id, parede: s.modelo.paredes![0].id });
    b = s.modelo;
    an = analisarEdificio(b);
    expect(an.erro).toBeUndefined();
    dim = dimensionarEdificio(b, an, { fundacao: false });
    ps = memoriaDetalhada(b, { an }).memoria.passos;
  }, 240000);

  it('a memória ligada não muda o dimensionamento da alvenaria', () => {
    const lig = comMemoria(new Registrador(), () => dimensionarEdificio(b, an, { fundacao: false }));
    expect(lig.alvenaria).toEqual(dim.alvenaria);
    expect(lig.paredes).toEqual(dim.paredes);
    expect(lig.vigas).toEqual(dim.vigas);
    expect(ps.filter((p) => /^Alvenaria/.test(p.elemento)).length).toBeGreaterThan(100);
  });

  it('resistências: fbk → fpk → fk → fd = fk/γm, ftd, cisalhamento e E refeitos', () => {
    const w = dim.alvenaria!.paredes[0], r = w.resistencia, el = `Alvenaria de blocos ${w.nome} · ${w.panos[0].nomePav}`, T = /^Resistências da alvenaria/;
    const fbk = num(um(ps, el, T, 'Bloco'), 'fbk'), pr = um(ps, el, T, 'Resistência característica do prisma'), fk = um(ps, el, T, 'Resistência característica da parede'), fd = um(ps, el, T, 'Resistência de cálculo à compressão');
    igual(fbk, r.fbk!, 'fbk'); igual(num(pr, 'fpk'), num(pr, 'eta') * fbk, 'fpk'); igual(num(fk, 'fk'), num(fk, 'xi') * num(pr, 'fpk'), 'fk');
    igual(num(fd, 'fd'), num(fd, 'fk') / num(fd, 'gamaM'), 'fd'); igual(num(fd, 'fd'), r.fd, 'fd do resultado');
    const tr = um(ps, el, T, 'Resistência de cálculo à tração');
    igual(num(tr, 'ftd'), (num(tr, 'pTracao') / 100) * r.fd, 'ftd'); igual(num(tr, 'ftd'), r.ftd, 'ftd do resultado');
    const cis = um(ps, el, T, 'Cisalhamento (blocos)');
    igual(num(cis, 'fvd0'), Math.min(num(cis, 'fv0'), num(cis, 'fvMax')) / num(cis, 'gamaM'), 'fvd(0)');
    igual(num(um(ps, el, T, 'Rigidez da alvenaria'), 'E'), r.E, 'E');
  });

  it('pano não armado: utilização por elemento, cumprimento e cadeia do elemento governante refeitos', () => {
    const w = dim.alvenaria!.paredes[0];
    for (const pano of w.panos) {
      const el = `Alvenaria de blocos ${w.nome} · ${pano.nomePav}`, T = new RegExp(`^Lado ${pano.nomeLado} · pano ${pano.pano + 1} de ${pano.panos}`);
      const esb = um(ps, el, T, 'Esbeltez do pano');
      igual(num(esb, 'lambda'), pano.lambda, 'λ'); igual(num(esb, 'hef'), pano.hef, 'hef'); igual(num(esb, 'lambda'), num(esb, 'hef') / num(esb, 't'), 'λ = hef/t');
      igual(num(esb, 'R'), Math.max(0, 1 - (num(esb, 'lambda') / 40) ** 3), 'R');
      const fat = json<number[][]>(um(ps, el, T, 'Utilização de cada elemento'), 'elementos');
      igual(Math.max(...fat.map((q) => q[3])), pano.util.comp, 'comp'); igual(Math.max(...fat.map((q) => q[4])), pano.util.trac, 'trac'); igual(Math.max(...fat.map((q) => q[5])), pano.util.cis, 'cis');
      const cum = um(ps, el, T, 'Fator de cumprimento');
      igual(num(cum, 'areaAtende') / num(cum, 'areaTotal'), pano.cumprimento, 'cumprimento');
      const ate = fat.filter((q) => q[6] <= 1 + 1e-9).reduce((s, q) => s + q[2], 0);
      igual(ate, num(cum, 'areaAtende'), 'área que atende');
      // elemento governante: tensões e utilizações à mão
      const gov = um(ps, el, T, 'Elemento governante'), ten = um(ps, el, T, 'Tensões do elemento'), ut = um(ps, el, T, 'Utilização do elemento');
      const k = 1 / (num(ten, 't') * 1000), sN = -num(ten, 'ny') * k;
      igual(num(ten, 'sN'), sN, 'σN');
      igual(num(ten, 'sM'), (6 * num(ten, 'Md')) / (num(ten, 't') ** 2 * 1000), 'σM');
      igual(num(ten, 'Md'), Math.max(Math.abs(num(ten, 'my')), num(ten, 'Mmin')), 'Md');
      igual(num(ten, 'Mmin'), (num(ten, 'Nc') * num(ten, 'hef')) / num(ten, 'exc'), 'Mmín');
      const comp = Math.max(Math.max(0, sN) / (num(ut, 'fd') * num(ut, 'R')) + num(ten, 'sM') / num(ut, 'fd'), Math.max(0, num(ten, 'sH')) / num(ut, 'fd') + num(ten, 'sMh') / num(ut, 'fd'));
      igual(num(ut, 'comp'), comp, 'comp refeita');
      igual(num(ut, 'trac'), Math.max(num(ten, 'sMt') - sN, -num(ten, 'sH') + num(ten, 'sMh'), 0) / num(ut, 'ftd'), 'trac refeita');
      igual(num(ut, 'cis'), num(ten, 'tau') / num(ut, 'fvd'), 'cis refeita');
      igual(num(ut, 'max'), pano.governa ? Math.max(num(ut, 'comp'), num(ut, 'trac'), num(ut, 'cis')) : 0, 'máx');
      expect(gov.entradas.combinacao).toBe(pano.governa?.combo);
    }
  });

  it('verga e contraverga: tração, cortante (VRd, VRd2), estribos e modulação refeitos', () => {
    const w = dim.alvenaria!.paredes[0], v = w.vergas[0];
    expect(v).toBeDefined();
    const el = `Alvenaria de blocos ${w.nome} · ${v.nomePav}`, T = new RegExp(`^Verga da ${v.tipo} ${v.id}`);
    const ver = um(ps, el, T, 'Armadura da verga');
    const combos = json<number[][]>(ver, 'combos'), z = num(ver, 'z');
    igual(z, 0.9 * Math.max(0.05, num(ver, 'h') - 0.04), 'z');
    igual(Math.max(0, ...combos.map(([N, M]) => (N / 2 + Math.abs(M) / z) / (num(ver, 'fyd') * 1000) * 1e4)), v.necessaria.verga, 'As verga');
    const cs = um(ps, el, T, 'Cortante da verga');
    const d = num(cs, 'd');
    igual(num(cs, 'VRd'), num(cs, 'fvd0') * 1000 * num(cs, 't') * d, 'VRd'); igual(num(cs, 'VRd'), v.cortante.VRd, 'VRd do resultado');
    igual(num(cs, 'VRd2'), 0.25 * num(cs, 'fd') * 1000 * num(cs, 't') * d, 'VRd2'); igual(num(cs, 'VRd2'), v.cortante.VRd2, 'VRd2 do resultado'); igual(num(cs, 'V'), v.cortante.V, 'V');
    igual(num(cs, 'nEst'), v.necessaria.estribo, 'estribo necessário');
    const ad = um(ps, el, T, 'Armadura adotada');
    expect(ad.entradas.n).toBe(v.armadura.n); expect(ad.entradas.phi).toBe(v.armadura.phi); expect(ad.entradas.modular).toBe(v.modular ? 1 : 0);
    // a parede armada também tem verga registrada
    const wa = dim.alvenaria!.paredes[1];
    expect(wa.vergas.length).toBe(1);
    expect(por(ps, `Alvenaria de blocos ${wa.nome} · ${wa.vergas[0].nomePav}`, /^Verga da/).length).toBeGreaterThanOrEqual(3);
  });

  it('parede armada: armadura vertical (flexão do bloco retangular) e horizontal necessárias, mínimos e malha adotada refeitos', () => {
    const w = dim.alvenaria!.paredes[1];
    expect(w.armada).toBe(true);
    for (const pano of w.panos) {
      const a = pano.armadura!, el = `Alvenaria de blocos ${w.nome} · ${pano.nomePav}`, T = new RegExp(`^Lado ${pano.nomeLado} · pano ${pano.pano + 1} de ${pano.panos}`);
      const v = um(ps, el, T, 'Armadura vertical necessária'), h = um(ps, el, T, 'Armadura horizontal necessária'), ad = um(ps, el, T, 'Armadura adotada');
      const mV = (num(v, 'taxaVertMin') / 100) * num(v, 't') * 1e4, mH = (num(h, 'taxaHorMin') / 100) * num(h, 't') * 1e4;
      igual(num(v, 'minVert'), mV, 'mínimo vertical'); igual(num(h, 'minHor'), mH, 'mínimo horizontal');
      igual(num(v, 'nec'), Math.max(num(v, 'AsFlexao'), mV), 'nec vertical'); igual(num(v, 'nec'), a.nec.vert, 'nec vertical do resultado');
      igual(num(h, 'nec'), Math.max(num(h, 'AsHor'), mH), 'nec horizontal'); igual(num(h, 'nec'), a.nec.hor, 'nec horizontal do resultado');
      // flexão do elemento que governa a armadura vertical
      const ny = num(v, 'ny'), my = num(v, 'my');
      const M = Math.max(Math.abs(my), num(v, 'exc') > 0 ? (Math.max(0, -ny) * num(v, 'hef')) / num(v, 'exc') : 0);
      const fl = flexaoArmadaFaixa(-ny, M, pano.t, num(v, 'fcRed'), num(v, 'fyd'));
      expect(fl.ok).toBe(true);
      igual(fl.As, num(v, 'AsFlexao'), 'As da flexão do elemento governante');
      igual(num(ad, 'asV'), a.vert!.As, 'As vertical adotada'); igual(num(ad, 'asH'), a.hor!.As, 'As horizontal adotada');
      expect(num(ad, 'asV')).toBeGreaterThanOrEqual(a.nec.vert - 1e-9);
    }
  });

  it('aço: peso de cada barra = quantidade · comprimento · área · 7850 e soma igual ao resumo do dimensionamento', () => {
    const w = dim.alvenaria!.paredes[1];
    expect(w.aco).toBeDefined();
    const lances = [...new Set(w.aco!.barras.map((q) => q.nomePav))];
    let soma = 0, n = 0;
    for (const nl of lances) {
      const el = `Alvenaria de blocos ${w.nome} · ${nl}`, linhas = por(ps, el, 'Aço da alvenaria armada');
      for (const p of linhas.filter((q) => q.entradas.tipo !== undefined)) {
        igual(num(p, 'peso'), num(p, 'quant') * num(p, 'comprimento') * num(p, 'area') * num(p, 'rho'), 'peso = n·ℓ·A·ρ');
        igual(num(p, 'peso'), num(p, 'quant') * num(p, 'comprimento') * num(p, 'pesoLinear'), 'peso linear');
        if (p.entradas.tipo === 'vertical') igual(num(p, 'quant'), Math.floor((num(p, 's1') - num(p, 's0') - num(p, 'modulo')) / num(p, 'sV') + 1e-6) + 1, 'posições verticais');
        if (p.entradas.tipo === 'horizontal') igual(num(p, 'quant'), Math.floor(num(p, 'alturaLance') / num(p, 'sH') + 1e-6), 'fiadas armadas');
        soma += num(p, 'peso'); n++;
      }
    }
    expect(n).toBe(w.aco!.barras.length);
    igual(soma, w.aco!.peso, 'peso total');
    igual(dim.alvenaria!.resumoAco.reduce((s, q) => s + q.peso, 0), dim.alvenaria!.paredes.reduce((s, q) => s + (q.aco?.peso ?? 0), 0), 'resumo');
  });

  it('pilar de alvenaria (lado curto): tensões e utilização por combinação refeitas', () => {
    const w = dim.alvenaria!.paredes.find((x) => x.lados.some((l) => l.modelo === 'barra'))!;
    expect(w).toBeDefined();
    for (const l of w.lados.filter((x) => x.modelo === 'barra')) {
      const el = `Alvenaria de blocos ${w.nome} · ${l.nomePav}`, T = `Lado curto ${l.nome} (pilar de alvenaria)`;
      const cs = por(ps, el, T).filter((p) => p.entradas.combinacao !== undefined && /^Combinação/.test(p.descricao));
      expect(cs.length).toBeGreaterThan(0);
      let us = 0;
      for (const p of cs) {
        const A = num(p, 'A'), sN = -num(p, 'N') / (A * 1000), L = num(p, 'L'), t = num(p, 't');
        const Mo = Math.max(Math.abs(num(p, 'Mo')), (Math.max(0, -num(p, 'N')) * num(p, 'hef')) / num(p, 'exc'));
        const sM = (6 * Mo) / (L * t * t * 1000) + (6 * Math.abs(num(p, 'Mp'))) / (t * L * L * 1000), sMt = (6 * Math.abs(num(p, 'Mo'))) / (L * t * t * 1000) + (6 * Math.abs(num(p, 'Mp'))) / (t * L * L * 1000);
        igual(num(p, 'sN'), sN, 'σN'); igual(num(p, 'sM'), sM, 'σM'); igual(num(p, 'sMt'), sMt, 'σMt');
        const comp = Math.max(0, sN) / (num(p, 'fd') * num(p, 'R')) + sM / num(p, 'fd'), trac = Math.max(0, sMt - sN) / num(p, 'ftd');
        igual(num(p, 'comp'), comp, 'comp'); igual(num(p, 'trac'), trac, 'trac'); igual(p.resultado as number, Math.max(comp, trac), 'u');
        us = Math.max(us, p.resultado as number);
      }
      igual(us, l.util, 'util do lado curto');
    }
  });

  it('viga sobre muro de alvenaria: papel, dimensões e dispensa registrados', () => {
    const v = dim.alvenaria!.vigasMuro[0];
    expect(v).toBeDefined();
    const p = um(ps, `Viga ${v.nome}`, 'Viga sobre muro de alvenaria', 'Viga sobre');
    expect(p.entradas.papel).toBe(v.papel); igual(num(p, 'b'), v.b, 'b'); igual(num(p, 'h'), v.h, 'h'); expect(p.resultado).toBe(v.status);
  });
});

// ---------------------------------------------------------------------------------------------- viga embutida, base e parcela axial

describe('MD7 · parede de concreto com base em sapata corrida (molas), viga embutida e parcela axial (E6d)', () => {
  let an: AnaliseEdificio, dim: Dimensionamento, ps: PassoMemoria[], b: ReturnType<typeof padrao>['modelo'];
  beforeAll(() => {
    const s = padrao(1);
    ok(s, 'fundacao.terreno', { sigmaAdm: 200 });
    const t1 = nomePav(s, 'Tipo 1');
    ok(s, 'parede.criar', { pontos: [[0, 0], [6, 0]], espessura: 0.2, morre: t1, base: { tipo: 'sapataCorrida' } });
    const g = s.modelo.pavimentos.find((p) => p.id === t1)!.grupo;
    ok(s, 'viga.tracar', { grupo: g, pontos: [[0, 0], [6, 0]], secao: { b: 0.2, h: 0.4 } });
    ok(s, 'viga.embutir', { viga: s.modelo.vigas.at(-1)!.id, parede: s.modelo.paredes![0].id });
    b = s.modelo;
    an = analisarEdificio(b);
    expect(an.erro).toBeUndefined();
    dim = dimensionarEdificio(b, an, { fundacao: false });
    ps = memoriaDetalhada(b, { an }).memoria.passos;
  }, 240000);

  it('viga embutida: As,mín, barras e estribo mínimo refeitos', () => {
    const e = dim.vigasEmbutidas![0], r = dim.vigas.find((x) => x.viga === e.viga)!, el = `Viga ${e.nome}`, T = new RegExp(`^Viga embutida em`);
    const am = um(ps, el, T, 'A viga corre sobre o eixo');
    igual(num(am, 'AsMin'), e.AsMin, 'AsMin'); igual(num(am, 'b'), e.b, 'b'); igual(num(am, 'h'), e.h, 'h');
    igual(num(am, 'd'), e.h - num(am, 'cobInf') - 0.005 - 0.008, 'd');
    const bar = um(ps, el, T, 'Armadura longitudinal adotada');
    igual(num(bar, 'As'), r.AsInf, 'As adotada'); expect(num(bar, 'As')).toBeGreaterThanOrEqual(e.AsMin - 1e-12);
    const est = um(ps, el, T, 'Estribo mínimo');
    const c = concrete(30, 1.4), sh = beamShear(num(est, 'bw'), num(est, 'd'), 0, c, num(est, 'fywk'), num(est, 'gammaS'));
    igual(num(est, 'aswS'), sh.aswS, 'Asw/s'); igual(num(est, 'smax'), sh.smax, 'smáx');
    igual(num(est, 'aswS'), (0.2 * num(est, 'fctm') / num(est, 'fywk')) * num(est, 'bw'), 'ρsw,mín·bw');
    expect(r.arranjo.estribo?.phi).toBe(num(est, 'phi')); igual(r.arranjo.estribo!.s, num(est, 's'), 's');
  });

  it('base: molas de Winkler do pórtico (Σkz = k·B·L) e parcela axial k = (f − 1)·EA/Δz', () => {
    const w = b.paredes![0], el = `Parede ${w.nome} · Base`, base = um(ps, el, 'Base e vinculação externa', 'Base:');
    const nos = new Set(an.paredes!.base[w.id]);
    const ms = an.portico.modelo.molas!.filter((m) => nos.has(m.no));
    igual(num(base, 'kz'), ms.filter((m) => m.gdl === 2).reduce((s, m) => s + m.k, 0), 'Σkz');
    // largura das molas B = espessura + 2 × aba (30 cm); Σ Lt = comprimento da parede
    igual(num(base, 'kz'), num(base, 'k') * (0.2 + 2 * (num(base, 'fundParedeAba') / 100)) * 6, 'k·B·L');
    expect(json<number[][]>(base, 'molas').length).toBe(ms.length);
    const ax = por(ps, el, /Rigidez axial da parede/);
    expect(ax.length).toBe(1);
    const f = an.opcoes.axialPilares, ks = json<number[][]>(ax[0], 'faixas');
    expect(ks.length).toBe(an.paredes!.axial!.filter((x) => x.pp === w.id).length);
    ks.forEach(([ea, nc, k], i) => { const x = an.paredes!.axial!.filter((q) => q.pp === w.id)[i]; igual(ea, x.EAporDz, 'EA/Δz'); expect(nc).toBe(x.cascas); igual(k, (f - 1) * ea, 'k = (f − 1)·EA/Δz'); });
    expect(num(ax[0], 'axialParedeSeparado')).toBe(an.opcoes.axialParedeSeparado);
  });
});
