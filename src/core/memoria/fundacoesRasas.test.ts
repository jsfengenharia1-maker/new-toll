// Memória detalhada (MD fase 5, fundações rasas): cargas na fundação, sapata isolada, sapata corrida (sob parede e sob pilares) e
// pilar-parede. As contas são refeitas a partir das `entradas` registradas (reações por caso → combinações → envoltória; σadm pelo
// SPT; tensões na base; altura; momentos pelo CEB-70; flexão; punção; pressão e flexão da aba por metro) e comparadas com o
// dimensionamento (erro relativo ≤ 1e-9); a memória ligada não muda o resultado das fundações.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from '../building/analitico';
import { comFundacao } from '../building/dimensionamento';
import { edificioVazio, type BuildingModel } from '../building/types';
import { momentoAba, pressaoCorrida, type ResultadoCorrida } from '../building/sapataCorrida';
import type { ResultadoFundacao } from '../building/fundacao';
import { beamFlexure, concrete } from '../concrete';
import { basePressure, isFooting, kTable, overhangMoment, type FootingResult } from '../footings';
import { anchorageLength, bestBars, ceil05, spacedBars } from '../rebar';
import { csvMemoria, memoriaDetalhada, type MemoriaDetalhada } from './edificio';
import { htmlMemoriaCorpo } from './html';
import { Registrador, comMemoria, type PassoMemoria } from './registrador';

const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1e-12, Math.abs(b));
const num = (p: PassoMemoria, k: string) => p.entradas[k] as number;
const LEITURAS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 30, 32, 35].map((N) => ({ N, solo: 'silteArenoso' }));

/** Edifício padrão com 4 pilares 30 × 30 em 4 × 4 m, vigas e lajes maciças, sondagem e σadm de 250 kPa. */
function predio(terreno: Record<string, unknown> = { sigmaAdm: 250 }) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  ok(s, 'lote', { comandos: [[0, 0], [4, 0], [4, 4], [0, 4]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 } } })) });
  ok(s, 'lote', { comandos: [[[0, 0], [4, 0]], [[0, 4], [4, 4]], [[0, 0], [0, 4]], [[4, 0], [4, 4]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } })) });
  ok(s, 'laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  ok(s, 'sondagem.criar', { nome: 'SP-01', x: 2, y: 2, nivelAgua: 12, leituras: LEITURAS });
  ok(s, 'fundacao.terreno', terreno);
  return s;
}
/** Edifício vazio com um pavimento, para as sapatas corridas. */
function vazio() {
  const s = new Sessao(edificioVazio());
  ok(s, 'pavimento.criar', { nome: 'Térreo', cota: 0 });
  ok(s, 'pilar.inserir', { x: 100, y: 100, secao: { tipo: 'ret', b: 0.3, h: 0.3 } }); // a análise exige ao menos um pilar (longe das sapatas)
  return s;
}

interface Caso { b: BuildingModel; mem: MemoriaDetalhada; fund: ResultadoFundacao[]; corr: ResultadoCorrida[]; ligada: ReturnType<typeof comFundacao>; desligada: ReturnType<typeof comFundacao> }
function rodar(s: Sessao): Caso {
  const b = s.modelo, an = analisarEdificio(b);
  expect(an.erro).toBeUndefined();
  const desligada = comFundacao(b, an);
  const r = memoriaDetalhada(b, { an });
  const ligada = comMemoria(new Registrador(), () => comFundacao(b, an));
  return { b, mem: r.memoria, fund: desligada.fundacoes ?? [], corr: desligada.corridas ?? [], ligada, desligada };
}
const passos = (c: Caso, el: string, topico?: RegExp | string) => c.mem.passos.filter((p) => p.elemento === el && (!topico || (typeof topico === 'string' ? p.topico === topico : topico.test(p.topico))));
const um = (c: Caso, el: string, topico: RegExp | string, desc: RegExp | string) => {
  const l = passos(c, el, topico).filter((p) => (typeof desc === 'string' ? p.descricao.startsWith(desc) : desc.test(p.descricao)));
  expect(l.length, `${el} · ${String(topico)} · ${String(desc)}`).toBeGreaterThan(0);
  return l[0];
};
const footing = (r: ResultadoFundacao) => { const f = r.projeto!.footing!; expect(isFooting(f)).toBe(true); return f as FootingResult; };

/** Reconstitui a carga adotada a partir dos passos: Σ f·caso → combinação → envoltória (arredondada a 0,01 como no cálculo). */
function conferirCargas(c: Caso, el: string, pilar: string, sufixo = '') {
  const casos = new Map(passos(c, el, `Cargas características por caso${sufixo}`).map((p) => [p.descricao.split(':')[0].replace('Caso ', ''), p]));
  expect(casos.size).toBeGreaterThan(1);
  const combos = passos(c, el, `Combinações raras (verificação geotécnica)${sufixo}`);
  expect(combos.length).toBeGreaterThan(1);
  const ns: number[] = [];
  for (const cb of combos) {
    for (const k of ['N', 'Vx', 'Vy', 'Mx', 'My']) {
      let soma = 0;
      for (const [chave, f] of Object.entries(cb.entradas)) if (chave.startsWith('f_')) soma += (f as number) * num(casos.get(chave.slice(2))!, k);
      expect(rel(soma, num(cb, k)) < 1e-9 || Math.abs(soma - num(cb, k)) < 1e-9, `${cb.descricao} ${k}`).toBe(true);
    }
    ns.push(num(cb, 'N'));
  }
  const env = passos(c, el, `Envoltória das combinações raras${sufixo}`);
  const Nk = env.find((p) => p.descricao.startsWith('Carga vertical característica máxima'))!, Nmin = env.find((p) => p.descricao.startsWith('Carga vertical característica mínima'))!;
  expect(Nk.resultado).toBe(+Math.max(...ns).toFixed(2));
  expect(Nmin.resultado).toBe(+Math.min(...ns).toFixed(2));
  expect(num(Nk, 'exato')).toBe(Math.max(...ns));
  void pilar;
  return { Nk: Nk.resultado as number, NkMin: Nmin.resultado as number };
}

/** Refaz a cadeia da sapata isolada a partir das entradas e compara com o FootingResult (1e-9). */
function conferirSapata(c: Caso, r: ResultadoFundacao, o: { spt?: boolean; bielas?: boolean; simples?: boolean } = {}) {
  const el = `Sapata ${r.nome}`, f = footing(r), d = r.projeto!, ld = d.load;
  const tol = (a: number, b: number, msg: string) => expect(rel(a, b) < 1e-9 || Math.abs(a - b) < 1e-12, `${msg}: ${a} × ${b}`).toBe(true);
  const par = (nome: string) => num(um(c, el, 'Materiais e parâmetros', nome), 'fck');
  const fck = par('Resistência de cálculo do concreto'), gammaC = num(um(c, el, 'Materiais e parâmetros', 'Resistência de cálculo do concreto'), 'gammaC');
  const fyk = num(um(c, el, 'Materiais e parâmetros', 'Resistência de cálculo do aço'), 'fyk'), gammaS = num(um(c, el, 'Materiais e parâmetros', 'Resistência de cálculo do aço'), 'gammaS');
  const cm = um(c, el, 'Materiais e parâmetros', 'Cobrimento');
  const cover = num(cm, 'cover'), gf = num(cm, 'gammaF'), cc = concrete(fck, gammaC), fyd = fyk / gammaS;
  tol(um(c, el, 'Materiais e parâmetros', 'Resistência de cálculo do concreto').resultado as number, cc.fcd, 'fcd');
  // σadm
  const ps = um(c, el, 'Tensão admissível do solo', o.spt ? 'N̄ usado' : 'σadm informada');
  if (o.spt) {
    const lei = JSON.parse(um(c, el, 'Tensão admissível do solo', 'Camadas do SPT').entradas.leituras as string) as [number, number][];
    const Nbar = lei.reduce((t, [, n]) => t + n, 0) / lei.length;
    tol(num(ps, 'Nbar'), Nbar, 'N̄');
    tol(Math.min(Nbar, num(ps, 'Nmax')) / num(ps, 'div') * 1000, f.sigmaAdm, 'σadm SPT');
  }
  tol(ps.resultado as number, f.sigmaAdm, 'σadm');
  // peso próprio e planta
  const wp = um(c, el, 'Peso próprio e dimensões em planta', 'Peso próprio adotado');
  tol(wp.resultado as number, f.W, 'W');
  const pl = um(c, el, 'Peso próprio e dimensões em planta', 'Planta A');
  tol(num(pl, 'A') * num(pl, 'B'), f.A * f.B, 'A·B');
  // tensões na base (cada caso)
  f.cases.forEach((cs, i) => {
    const t = `Tensões no solo · ${cs.label}`;
    const pr = um(c, el, t, 'Tensões na base sem tração');
    const rf = basePressure(num(pr, 'A'), num(pr, 'B'), num(pr, 'N'), num(pr, 'ex'), num(pr, 'ey'))!;
    tol(rf.sigmaMax, cs.sigmaMax, `σmáx ${i}`); tol(rf.sigmaMin, cs.sigmaMin, `σmín ${i}`); tol(rf.compressed, cs.compressed, `compr ${i}`);
    tol(pr.resultado as number, cs.sigmaMax, 'resultado σmáx');
    const mm = um(c, el, t, 'Momentos na base');
    const Nc = num(mm, 'Npilar');
    tol(Math.abs(num(mm, 'My_pilar')) + Math.abs(Nc * num(mm, 'ex')), mm.resultado as number, 'My base');
    tol(num(um(c, el, t, 'Excentricidades'), 'My') / num(pr, 'N'), cs.ex, 'ex');
    tol(num(um(c, el, t, 'Força vertical'), 'Nk') + f.W, num(pr, 'N'), 'N');
  });
  // altura
  const al = 'Altura e ancoragem do pilar';
  const bal = um(c, el, al, 'Balanços da base');
  const cmax = Math.max(num(bal, 'cA'), num(bal, 'cB'));
  const hRig = um(c, el, al, 'Altura mínima da sapata rígida');
  tol(hRig.resultado as number, f.hRigid, 'hRigid');
  tol(((2 * cmax) / 3) * (1.5 / num(hRig, 'ftBalancoAltura')), f.hRigid, 'hRigid refeita');
  const lb = um(c, el, al, 'Comprimento de ancoragem');
  tol(anchorageLength(num(lb, 'phi'), cc, fyd), f.lbCol, 'lb');
  const ha = um(c, el, al, 'Altura adotada');
  tol(ha.resultado as number, f.h, 'h');
  if (!ld.fixed?.h && !o.simples && f.kind === 'rigida') tol(ceil05(Math.max(num(ha, 'hRigid'), num(ha, 'lbCol') + num(ha, 'cover'))), f.h, 'h rígida');
  const du = um(c, el, al, 'Altura útil');
  tol(du.resultado as number, f.d, 'd');
  // esforços de cálculo
  const ec = um(c, el, 'Esforços de cálculo na base', 'Força e momentos de cálculo');
  const Nd = gf * num(ec, 'Nk');
  tol(ec.resultado as number, Nd, 'Nd'); tol(num(ec, 'Mdx'), gf * num(ec, 'Mx'), 'Mdx'); tol(num(ec, 'Mdy'), gf * num(ec, 'My'), 'Mdy');
  const td = um(c, el, 'Esforços de cálculo na base', 'Tensões de cálculo');
  tol(num(td, 'N'), Nd, 'Nd tensões');
  const prD = basePressure(f.A, f.B, Nd, num(ec, 'Mdy') / Nd, num(ec, 'Mdx') / Nd)!;
  tol(td.resultado as number, prD.sigmaMax, 'σd,máx'); tol(prD.sigmaMax, f.sigmaD.max, 'σd,máx f'); tol(prD.sigmaMin, f.sigmaD.min, 'σd,mín f');
  // flexão
  for (const ax of ['x', 'y'] as const) {
    const tf = `Flexão · direção ${ax} (momento em torno de ${ax === 'x' ? 'y' : 'x'})`, fx = f.flex[ax];
    if (!o.simples) {
      const am = um(c, el, tf, 'Armadura mínima');
      tol(am.resultado as number, fx.AsMin, `AsMin ${ax}`);
      const ac = um(c, el, tf, 'Armadura de cálculo');
      tol(ac.resultado as number, fx.AsAdopt, `AsAdopt ${ax}`);
    }
    if (o.simples) {
      const m = um(c, el, tf, 'Momento de cálculo na seção');
      tol(overhangMoment(prD, f.A, f.B, num(m, 'x1'), ax, num(m, 'xc')), fx.Md, `Md simples ${ax}`);
      const st = um(c, el, tf, 'Concreto simples');
      tol(st.resultado as number, fx.sigmaT!, 'σt');
      tol(6 * (num(st, 'Md') / 1000) / (num(st, 'b') * num(st, 'h') ** 2), fx.sigmaT!, 'σt refeita');
      continue;
    }
    if (o.bielas) {
      const tb = um(c, el, tf, 'Método das bielas');
      tol(num(tb, 'sigmaDmax') * num(tb, 'A') * num(tb, 'B') * (num(tb, 'L') - num(tb, 'a0')) / (8 * num(tb, 'd')), tb.resultado as number, 'T');
      const as = um(c, el, tf, 'Armadura de tração das bielas');
      tol(num(as, 'T') / 1000 / fyd, fx.As, 'As bielas');
    } else {
      const m = um(c, el, tf, 'Momento de cálculo na seção');
      const Md = overhangMoment({ s0: num(m, 's0'), sx: num(m, 'sx'), sy: num(m, 'sy'), sigmaMax: num(m, 'sigmaMax'), sigmaMin: num(m, 'sigmaMin'), compressed: num(m, 'compressed') }, num(m, 'A'), num(m, 'B'), num(m, 'x1'), m.entradas.eixo as 'x' | 'y', num(m, 'xc'));
      tol(Md, fx.Md, `Md ${ax}`);
      const de = um(c, el, tf, 'Altura útil efetiva');
      tol(Math.min(num(de, 'd'), 1.5 * num(de, 'balanco')), fx.dEff, 'dEff');
      const As = um(c, el, tf, 'Armadura de tração');
      const bw = ax === 'x' ? f.B : f.A;
      const rf = beamFlexure({ kind: 'rect', bw, h: fx.dEff + cover + 0.01 }, false, Md, fx.dEff, 0.05, cc, fyd);
      tol(rf.As, fx.As, `As ${ax}`);
      if (!rf.double) tol(As.resultado as number, fx.As, `As passo ${ax}`);
    }
    if (!fx.imposed) {
      const br = um(c, el, tf, 'Barras');
      const b = bestBars(spacedBars(fx.AsAdopt, fx.width));
      expect(b).not.toBeNull();
      tol(num(br, 'As'), b!.As, 'As barras'); expect(num(br, 'n')).toBe(b!.n); tol(num(br, 's'), b!.spacing, 's barras');
      tol(b!.As, fx.bars!.As, 'barras do resultado');
    }
  }
  // punção
  const pn = 'Compressão diagonal e punção';
  const u0 = um(c, el, pn, 'Contorno C no perímetro');
  const cd = um(c, el, pn, 'Compressão diagonal');
  tol(cd.resultado as number, f.punch.tauSd0, 'τSd0'); tol(num(cd, 'tauRd2'), f.punch.tauRd2, 'τRd2');
  tol(num(cd, 'Nd') / 1000 / (num(u0, 'ap') * 0 + (u0.resultado as number) * num(cd, 'd')), f.punch.tauSd0, 'τSd0 refeita');
  if (f.punch.applies) {
    const ar = um(c, el, pn, 'Contorno C′');
    tol(ar.resultado as number, f.punch.u1!, 'u1'); tol(num(ar, 'Fred'), f.punch.Fred!, 'Fred');
    const k = um(c, el, pn, 'Coeficientes K');
    tol(num(k, 'Kx'), kTable(num(k, 'ap') / num(k, 'bp')), 'Kx');
    const ts = um(c, el, pn, 'Tensão solicitante em C′');
    tol(ts.resultado as number, f.punch.tauSd1!, 'τSd1');
    const t1 = um(c, el, pn, 'Taxa de armadura');
    tol(t1.resultado as number, f.punch.tauRd1!, 'τRd1');
  } else expect(passos(c, el, pn).some((p) => p.descricao.startsWith('Punção no contorno C′ não se aplica'))).toBe(true);
  // volume
  const v = um(c, el, 'Volume de concreto', 'Volume');
  tol(v.resultado as number, f.volume, 'volume');
  if (f.kind === 'rigida') { const A1 = num(v, 'A1'), A2 = num(v, 'A2'); tol(num(v, 'A') * num(v, 'B') * num(v, 'h0') + ((num(v, 'h') - num(v, 'h0')) / 3) * (A1 + A2 + Math.sqrt(A1 * A2)), f.volume, 'V refeito'); }
  void u0;
}

describe('MD5 fundações rasas · sapata isolada', () => {
  it('sapata centrada com σadm informada (CEB-70, rígida): cargas, tensões, altura, flexão e volume refeitos das entradas', () => {
    const s = predio();
    ok(s, 'fundacao.criar', { pilar: s.modelo.pilares[0].id, tipo: 'sapata' });
    const c = rodar(s), [r] = c.fund;
    expect(r.status, r.mensagens.join(' ')).toBe('ok');
    const k = conferirCargas(c, 'Sapata S1', s.modelo.pilares[0].id);
    expect(k.Nk).toBe(r.carga!.Nk); expect(k.NkMin).toBe(r.carga!.NkMin);
    conferirSapata(c, r);
    // tópicos esperados na memória e no HTML/CSV
    const tops = new Set(passos(c, 'Sapata S1').map((p) => p.topico));
    for (const t of ['Materiais e parâmetros', 'Tensão admissível do solo', 'Peso próprio e dimensões em planta', 'Altura e ancoragem do pilar', 'Esforços de cálculo na base', 'Compressão diagonal e punção', 'Volume de concreto', 'Resumo do elemento']) expect(tops.has(t), t).toBe(true);
    const html = htmlMemoriaCorpo(c.mem);
    expect(html).toContain('Sapata S1'); expect(html).toContain('Tensões no solo');
    expect(csvMemoria(c.mem).split('\n').filter((l) => l.includes('Sapata S1')).length).toBe(passos(c, 'Sapata S1').length);
    // a memória ligada não muda as fundações
    expect(c.ligada).toEqual(c.desligada);
  });

  it('σadm estimada pelo SPT: N̄ do bulbo e N̄/div refeitos das leituras registradas', () => {
    const s = predio({ sigmaModo: 'sondagem' });
    ok(s, 'fundacao.criar', { pilar: s.modelo.pilares[0].id, tipo: 'sapata' });
    const c = rodar(s), [r] = c.fund;
    expect(r.status, r.mensagens.join(' ')).toBe('ok');
    const lei = JSON.parse(um(c, 'Sapata S1', 'Tensão admissível do solo', 'Camadas do SPT').entradas.leituras as string) as [number, number][];
    expect(lei.length).toBeGreaterThan(0);
    conferirSapata(c, r, { spt: true });
    expect(c.ligada).toEqual(c.desligada);
  });

  it('método das bielas (pilar centrado, rígida) e sapata de concreto simples', () => {
    const s = predio();
    ok(s, 'fundacao.opcoes', { valores: { ftMethod: 'bielas' } });
    ok(s, 'fundacao.criar', { pilar: s.modelo.pilares[0].id, tipo: 'sapata' });
    ok(s, 'fundacao.criar', { pilar: s.modelo.pilares[1].id, tipo: 'sapata', simples: true });
    const c = rodar(s);
    expect(c.fund.length).toBe(2);
    expect(footing(c.fund[0]).method).toBe('bielas');
    conferirSapata(c, c.fund[0], { bielas: true });
    expect(footing(c.fund[1]).simples).toBe(true);
    conferirSapata(c, c.fund[1], { simples: true });
    expect(c.ligada).toEqual(c.desligada);
  });

  it('sapata flexível com carga alta: punção em C′ (u1, Fred, K, Wp, ρ, τRd1)', () => {
    const s = predio();
    ok(s, 'fundacao.opcoes', { valores: { ftKind: 'flexivel' } });
    ok(s, 'carga.pilar', { pilar: s.modelo.pilares[0].id, caso: 'G', N: 3000 });
    ok(s, 'fundacao.criar', { pilar: s.modelo.pilares[0].id, tipo: 'sapata' });
    const c = rodar(s), [r] = c.fund, f = footing(r);
    expect(f.kind, r.mensagens.join(' ')).toBe('flexivel');
    expect(f.punch.applies).toBe(true);
    conferirSapata(c, r);
    expect(c.ligada).toEqual(c.desligada);
  });

  it('sapata de divisa (face na borda, e = (A − ap)/2) e dimensões impostas com armadura imposta', () => {
    const s = predio({ sigmaAdm: 600 });
    ok(s, 'vento.definir', { ativo: false });
    ok(s, 'fundacao.criar', { pilar: s.modelo.pilares[0].id, tipo: 'sapata', posicao: 'divisa', lado: [-1, 0] });
    ok(s, 'fundacao.criar', { pilar: s.modelo.pilares[1].id, tipo: 'sapata', impostas: { A: 1.2, B: 1.2, h: 0.6, armadura: { x: { phi: 16, s: 0.1 }, y: { phi: 16, s: 0.1 } } } });
    const c = rodar(s);
    expect(c.fund.length).toBe(2);
    const [d, im] = c.fund, fd = footing(d), fi = footing(im);
    expect(Math.abs(fd.colOffset[0])).toBeGreaterThan(0);
    expect(passos(c, 'Sapata S1', 'Planta A' as unknown as RegExp).length + passos(c, 'Sapata S1').filter((p) => p.descricao.startsWith('Posição do centro do pilar')).length).toBeGreaterThan(0);
    conferirSapata(c, d);
    expect(fi.fixed).toBe(true);
    conferirSapata(c, im);
    expect(passos(c, 'Sapata S2').some((p) => p.descricao.startsWith('Armadura imposta pelo usuário'))).toBe(true);
    expect(c.ligada).toEqual(c.desligada);
  });

  it('σadm majorada nas combinações com vento: a sapata adotada é a da verificação com o fator, refeita da carga adotada', () => {
    const s = predio({ sigmaAdm: 250, fatorVento: 1.3 });
    ok(s, 'fundacao.criar', { pilar: s.modelo.pilares[0].id, tipo: 'sapata' });
    const c = rodar(s), [r] = c.fund;
    expect(r.notas.join(' ')).toMatch(/σadm × 1,30/);
    conferirSapata(c, r);
    expect(passos(c, 'Sapata S1', 'Carga adotada no elemento').length).toBe(1);
    expect(c.ligada).toEqual(c.desligada);
  });

  it('sapata associada, bloco sobre estacas e tubulão: cargas e resumo por elemento (a cadeia deles é da fatia das profundas)', () => {
    const s = predio({ sigmaAdm: 250, estacas: [{ id: 'e_hc', tipo: 'helice', D: 40, modo: 'informada', capacidade: 500 }] });
    const [p1, p2, p3, p4] = s.modelo.pilares;
    ok(s, 'fundacao.criar', { pilares: [p1.id, p2.id], tipo: 'sapata' });
    ok(s, 'fundacao.criar', { pilar: p3.id, tipo: 'bloco', estaca: { id: 'e_hc' } });
    ok(s, 'fundacao.criar', { pilar: p4.id, tipo: 'tubulao' });
    const c = rodar(s);
    expect(c.fund.length).toBe(3);
    for (const r of c.fund) {
      const el = `${r.tipo === 'sapata' ? 'Sapata' : r.tipo === 'bloco' ? 'Bloco sobre estacas' : 'Tubulão'} ${r.nome}`;
      expect(passos(c, el, 'Carga adotada no elemento').length, el).toBe(1);
      expect(passos(c, el, 'Resumo do elemento').length, el).toBe(1);
      for (const id of r.pilarIds) expect(passos(c, el).some((p) => p.topico.startsWith('Cargas características por caso') && p.descricao.includes(s.modelo.pilares.find((q) => q.id === id)!.nome)), el).toBe(true);
    }
    // sapata associada: um tópico de cargas por pilar
    expect(passos(c, `Sapata ${c.fund[0].nome}`).filter((p) => p.topico.startsWith('Cargas características por caso')).map((p) => p.topico)).toEqual(expect.arrayContaining([`Cargas características por caso · ${p1.nome}`, `Cargas características por caso · ${p2.nome}`]));
    conferirCargas(c, `Sapata ${c.fund[0].nome}`, p1.id, ` · ${p1.nome}`);
    expect(c.ligada).toEqual(c.desligada);
  });

  it('pilar-parede que nasce na fundação: pilar equivalente registrado e sapata calculada sobre ele', () => {
    const s = new Sessao();
    for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
    s.executar('obra.definir', { profundidadeFundacao: 1 });
    for (const n of ['Cobertura', 'Tipo 3', 'Tipo 2']) s.executar('pavimento.remover', { id: s.modelo.pavimentos.find((p) => p.nome === n)!.id });
    ok(s, 'fundacao.terreno', { sigmaAdm: 300 });
    ok(s, 'pilarParede.tipo', { nome: 'PP', vertices: [[0, 0], [2, 0], [2, 1]], esq: 0.1, dir: 0.1 });
    ok(s, 'pilarParede.inserir', { tipo: s.modelo.tiposPilarParede![0].id, x: 0, y: 0, angulo: 0, morre: s.modelo.pavimentos.find((p) => p.nome === 'Tipo 1')!.id });
    const pp = s.modelo.pilaresParede![0];
    ok(s, 'fundacao.criar', { pilar: pp.id, tipo: 'sapata' });
    const c = rodar(s), [r] = c.fund;
    expect(r.pilarIds).toEqual([pp.id]);
    const eq = passos(c, `Sapata ${r.nome}`, `Pilar-parede ${pp.nome}`);
    expect(eq.length).toBe(1);
    // o retângulo registrado é o do cálculo do pilar equivalente (ap × bp da sapata)
    expect(rel(num(eq[0], 'ap'), r.ap)).toBeLessThan(1e-9); expect(rel(num(eq[0], 'bp'), r.bp)).toBeLessThan(1e-9);
    expect(passos(c, `Sapata ${r.nome}`, 'Cargas características por caso').length).toBeGreaterThan(0);
    if (r.projeto?.footing && isFooting(r.projeto.footing)) conferirSapata(c, r);
    expect(c.ligada).toEqual(c.desligada);
  });
});

/** Conferência da flexão transversal da aba (por metro) de uma sapata corrida. */
function conferirTransversal(c: Caso, r: ResultadoCorrida) {
  const el = `Sapata corrida ${r.nome}`, tr = r.transversal!, t = 'Flexão transversal da aba (por metro)';
  const tol = (a: number, b: number, msg: string) => expect(rel(a, b) < 1e-9 || Math.abs(a - b) < 1e-12, `${msg}: ${a} × ${b}`).toBe(true);
  const lref = um(c, el, t, 'Balanço da aba');
  tol(lref.resultado as number, tr.l, 'l'); tol(num(lref, 'balanco'), tr.balanco, 'balanço');
  const de = um(c, el, t, 'Altura útil e altura útil efetiva');
  tol(de.resultado as number, tr.dEff, 'dEff');
  const pr = um(c, el, t, 'Carga de cálculo por metro');
  if (tr.metodo === 'ceb70') {
    const md = um(c, el, t, 'Momento fletor por metro');
    tol(momentoAba({ s0: num(md, 's0'), sx: num(md, 'sx') }, num(md, 'B'), num(md, 'l')), tr.Md, 'Md');
    tol(md.resultado as number, tr.Md, 'Md passo');
    const pc = pressaoCorrida(num(pr, 'B'), num(pr, 'Nd'), num(pr, 'e'), false);
    if (pc && r.aba !== 'ambas') { tol(pc.s0, num(pr, 's0'), 's0'); tol(pc.sx, num(pr, 'sx'), 'sx'); }
    if (tr.Md > 0) {
      const as = um(c, el, t, 'Armadura de tração');
      const cc = concrete(30, 1.4), fyd = 500 / 1.15;
      const rf = beamFlexure({ kind: 'rect', bw: 1, h: tr.dEff + 0.05 + 0.01 }, false, tr.Md, tr.dEff, 0.05, cc, fyd);
      tol(rf.As * 1e4, tr.As, 'As');
      if (!rf.double) tol((as.resultado as number) * 1e4, tr.As, 'As passo');
    }
  } else {
    const tb = um(c, el, t, 'Método das bielas');
    tol(num(tb, 'Nd') * (num(tb, 'B') - num(tb, 'bw')) / (8 * num(tb, 'd')), tb.resultado as number, 'T');
  }
  tol((um(c, el, t, 'Armadura mínima por metro').resultado as number) * 1e4, tr.AsMin, 'AsMin');
  tol((um(c, el, t, 'Armadura transversal adotada').resultado as number) * 1e4, tr.AsAdot, 'AsAdot');
  const bar = um(c, el, t, 'Barras transversais');
  if (tr.barras) { tol(num(bar, 'phi'), tr.barras.phi, 'φ'); tol(num(bar, 's'), tr.barras.s, 's'); tol(num(bar, 'As'), tr.barras.As, 'Aef'); }
  const di = um(c, el, t, 'Armadura de distribuição');
  tol((di.resultado as number) * 1e4, tr.distribuicao.As, 'AsDist');
  if (tr.cortante) {
    const cz = um(c, el, t, 'Sapata flexível');
    tol(cz.resultado as number, tr.cortante.Vd, 'Vd'); tol(num(cz, 'VRd1'), tr.cortante.VRd1, 'VRd1');
  }
}

describe('MD5 fundações rasas · sapata corrida', () => {
  it('sob parede (carga linear G 250 + Q 100 kN/m): janelas, combinações, B, h, peso, pressão, flexão da aba e distribuição', () => {
    const s = vazio();
    ok(s, 'fundacao.terreno', { sigmaAdm: 200 });
    ok(s, 'corrida.criar', { pontos: [[0, 0], [10, 0]], bw: 0.2 });
    ok(s, 'carga.linha', { grupo: 'fundacao', pontos: [[0, 0], [10, 0]], valor: 250, caso: 'G' });
    ok(s, 'carga.linha', { grupo: 'fundacao', pontos: [[0, 0], [10, 0]], valor: 100, caso: 'Q' });
    const c = rodar(s), [r] = c.corr, el = 'Sapata corrida SC1';
    expect(r.status, r.mensagens.join(' ')).toBe('ok');
    // janelas e combinações: q = Σ f·q_caso na janela
    const jan = passos(c, el, 'Cargas lineares sobre o eixo');
    expect(jan.length).toBeGreaterThan(2);
    const porCaso = new Map(jan.filter((p) => p.descricao.startsWith('Caso ')).map((p) => [p.descricao.split(':')[0].replace('Caso ', ''), JSON.parse(p.entradas.valores as string) as number[]]));
    const comb = passos(c, el, 'Combinações raras (carga por metro)');
    expect(comb.length).toBeGreaterThan(0);
    const qs: number[] = [];
    for (const cb of comb) {
      let q = 0;
      for (const [k, f] of Object.entries(cb.entradas)) if (k.startsWith('f_')) q += (f as number) * (porCaso.get(k.slice(2))?.[num(cb, 'janela')] ?? 0);
      expect(rel(q, num(cb, 'q'))).toBeLessThan(1e-9);
      qs.push(num(cb, 'q'));
    }
    const nk = um(c, el, 'Envoltória por metro', 'Carga linear máxima');
    expect(rel(nk.resultado as number, r.carga!.Nk)).toBeLessThan(1e-9);
    expect(r.carga!.Nk).toBeCloseTo(Math.max(...qs), 9);
    // largura, altura, peso e pressão
    const lb = um(c, el, 'Largura, altura e peso próprio', 'Largura B');
    expect(lb.resultado).toBe(r.B);
    const hh = um(c, el, 'Largura, altura e peso próprio', 'Balanço e altura');
    expect(rel(num(hh, 'hRig'), r.hRigido)).toBeLessThan(1e-9); expect(hh.resultado).toBe(r.h);
    expect(rel(((2 * num(hh, 'balanco')) / 3) * (1.5 / num(hh, 'ftBalancoAltura')), r.hRigido)).toBeLessThan(1e-9);
    const pp = um(c, el, 'Largura, altura e peso próprio', 'Peso do concreto');
    const area = num(pp, 'bw') * num(pp, 'h') + (num(pp, 'B') - num(pp, 'bw')) * ((num(pp, 'h') + num(pp, 'h0')) / 2);
    expect(rel(Math.max(num(pp, 'W0'), 25 * area), r.carga!.W)).toBeLessThan(1e-9);
    expect(rel(pp.resultado as number, r.carga!.W)).toBeLessThan(1e-9);
    const pn = um(c, el, 'Tensões no solo (pior combinação)', 'Pressão sob a base');
    const pc = pressaoCorrida(num(pn, 'B'), num(pn, 'N'), num(pn, 'e'), false)!;
    expect(rel(pc.sigmaMax, r.pressao!.sigmaMax)).toBeLessThan(1e-9);
    expect(rel(num(pn, 'sigmaMin'), r.pressao!.sigmaMin) < 1e-9 || Math.abs(num(pn, 'sigmaMin') - r.pressao!.sigmaMin) < 1e-12).toBe(true);
    const nd = um(c, el, 'Carga de cálculo por metro', 'Carga de cálculo por metro');
    expect(rel(nd.resultado as number, r.carga!.Nd)).toBeLessThan(1e-9);
    conferirTransversal(c, r);
    expect(um(c, el, 'Quantitativos', 'Volume').resultado).toBe(r.volume);
    expect(c.ligada).toEqual(c.desligada);
  });

  it('aba de um lado equilibrada, alvenaria (referência 25 % de bw) e dimensões impostas (sapata flexível com cortante a d)', () => {
    const s = vazio();
    ok(s, 'fundacao.terreno', { sigmaAdm: 250 });
    ok(s, 'corrida.criar', { pontos: [[0, 0], [8, 0]], bw: 0.2, aba: 'esq', equilibrio: true, alvenaria: true });
    ok(s, 'corrida.criar', { pontos: [[0, 5], [8, 5]], bw: 0.2, B: 1.6, h: 0.3 });
    for (const y of [0, 5]) { ok(s, 'carga.linha', { grupo: 'fundacao', pontos: [[0, y], [8, y]], valor: 200, caso: 'G' }); ok(s, 'carga.linha', { grupo: 'fundacao', pontos: [[0, y], [8, y]], valor: 80, caso: 'Q' }); }
    const c = rodar(s);
    expect(c.corr.length).toBe(2);
    const [a, bb] = c.corr;
    expect(a.equilibrio).toBe(true);
    conferirTransversal(c, a);
    expect(bb.transversal!.cortante).toBeDefined();
    conferirTransversal(c, bb);
    expect(c.ligada).toEqual(c.desligada);
  });

  it('SPT do furo mais próximo e método das bielas na aba dos dois lados', () => {
    const s = vazio();
    ok(s, 'sondagem.criar', { nome: 'SP-01', x: 5, y: 1, nivelAgua: 12, leituras: LEITURAS });
    ok(s, 'fundacao.terreno', { sigmaModo: 'sondagem' });
    ok(s, 'fundacao.opcoes', { valores: { ftMethod: 'bielas' } });
    ok(s, 'corrida.criar', { pontos: [[0, 0], [10, 0]], bw: 0.2 });
    ok(s, 'carga.linha', { grupo: 'fundacao', pontos: [[0, 0], [10, 0]], valor: 150, caso: 'G' });
    const c = rodar(s), [r] = c.corr, el = 'Sapata corrida SC1';
    expect(r.status, r.mensagens.join(' ')).toBe('ok');
    const lei = JSON.parse(um(c, el, 'Tensão admissível do solo', 'NSPT do furo').entradas.leituras as string) as [number, number][];
    const Nbar = lei.reduce((t, [, n]) => t + n, 0) / lei.length;
    const sg = um(c, el, 'Tensão admissível do solo', 'σadm estimada');
    expect(rel(Math.min(Nbar, num(sg, 'Nmax')) / num(sg, 'div') * 1000, r.sigmaAdm!)).toBeLessThan(1e-9);
    expect(r.transversal!.metodo).toBe('bielas');
    conferirTransversal(c, r);
    expect(c.ligada).toEqual(c.desligada);
  });

  it('sob pilares (viga sobre base elástica): pressão da análise, carga de cálculo e flexão transversal da aba', () => {
    const s = vazio();
    ok(s, 'fundacao.terreno', { sigmaAdm: 250 });
    ok(s, 'corrida.criar', { pontos: [[0, 0], [12, 0]], bw: 0.4, B: 1.4, h: 0.7 });
    for (const x of [1, 6, 11]) ok(s, 'pilar.inserir', { x, y: 0, secao: { tipo: 'ret', b: 0.4, h: 0.4 } });
    for (const p of s.modelo.pilares) { ok(s, 'carga.pilar', { pilar: p.id, caso: 'G', N: 400 }); ok(s, 'carga.pilar', { pilar: p.id, caso: 'Q', N: 150 }); }
    const c = rodar(s), [r] = c.corr, el = 'Sapata corrida SC1';
    expect(r.modo).toBe('pilares');
    const pm = um(c, el, 'Sapata corrida sob pilares (viga sobre base elástica)', 'Pressão máxima');
    expect(rel(pm.resultado as number, r.longitudinal!.sigmaMax)).toBeLessThan(1e-9);
    const nt = um(c, el, 'Sapata corrida sob pilares (viga sobre base elástica)', 'Peso próprio da sapata');
    expect(rel(Math.max(0, num(nt, 'sigmaMax') - num(nt, 'pesoPressao')), nt.resultado as number)).toBeLessThan(1e-9);
    const nd = um(c, el, 'Sapata corrida sob pilares (viga sobre base elástica)', 'Carga de cálculo');
    expect(rel(nd.resultado as number, r.carga!.Nd)).toBeLessThan(1e-9);
    conferirTransversal(c, r);
    expect(c.ligada).toEqual(c.desligada);
  });
});

describe('MD5 fundações rasas · integração', () => {
  it('filtro por elemento, escopo e custo com a memória desligada', () => {
    const s = predio();
    ok(s, 'fundacao.criar', { pilar: s.modelo.pilares[0].id, tipo: 'sapata' });
    ok(s, 'fundacao.criar', { pilar: s.modelo.pilares[1].id, tipo: 'sapata' });
    const b = s.modelo, an = analisarEdificio(b);
    const so = memoriaDetalhada(b, { an, elementos: ['Sapata S2'] }).memoria;
    expect(so.elementos.filter((e) => e !== 'Edifício')).toEqual(['Sapata S2']);
    expect(so.passos.some((p) => p.elemento === 'Sapata S1')).toBe(false);
    expect(so.escopo).toMatch(/fundações rasas/);
    // custo: sem a memória, 5 repetições do cálculo das fundações (a medida de referência vai no relatório)
    const t = () => { const t0 = performance.now(); for (let i = 0; i < 5; i++) comFundacao(b, an); return performance.now() - t0; };
    t();
    const desl = Math.min(t(), t(), t());
    expect(desl).toBeGreaterThan(0);
  });
});
