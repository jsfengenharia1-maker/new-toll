// Memória detalhada (MD fase 7): paredes de concreto e pilares-parede. As contas são refeitas a partir das `entradas`
// registradas e comparadas com o dimensionamento (erro relativo ≤ 1e-9); a memória ligada não muda o resultado (`toEqual`).
import { beforeAll, describe, expect, it } from 'vitest';
import { analisarEdificio, type AnaliseEdificio } from '../building/analitico';
import { dimensionarEdificio, type Dimensionamento } from '../building/dimensionamento';
import { caixa, nomePav, ok, padrao } from '../building/paredesFixtures';
import { camadas, membrana, reforcosLocais, type Forcas } from '../building/paredesArmadura';
import { m2dPadrao } from '../building/paredesLado';
import { combinacoesDoEstado } from '../building/combinacoes';
import type { BuildingModel } from '../building/types';
import { beamShear, concrete } from '../concrete';
import { memoriaDetalhada, csvMemoria } from './edificio';
import { htmlMemoriaCorpo } from './html';
import { Registrador, comMemoria, type PassoMemoria } from './registrador';
import { csvTabela, tabelasAnalise } from './dadosAnalise';
import { ANTES_DESAPRUMO } from '../building/antesDesaprumo';

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

const c30 = concrete(30, 1.4);

/** Muros de subsolo sob empuxo (caixa) com uma porta no lance do Térreo da primeira parede. */
function obraConcreto() {
  const { s } = caixa();
  const terreo = nomePav(s, 'Térreo');
  ok(s, 'parede.abertura', { parede: s.modelo.paredes![0].id, s: 5, largura: 1, altura: 2.1, pavimento: terreo });
  return s.modelo;
}

function obraPP() {
  const s = padrao(1), t1 = nomePav(s, 'Tipo 1'), g = s.modelo.pavimentos.find((p) => p.id === t1)!.grupo;
  ok(s, 'pilarParede.tipo', { nome: 'L', vertices: [[0, 0], [4, 0], [4, 0.8]], esq: 0.1, dir: 0.1 });
  ok(s, 'pilarParede.inserir', { tipo: s.modelo.tiposPilarParede![0].id, x: 0, y: 0, morre: t1 });
  ok(s, 'laje.criar', { grupo: g, contorno: [[-1, -1], [5, -1], [5, 2], [-1, 2]] });
  return s.modelo;
}

interface Obra { b: BuildingModel; an: AnaliseEdificio; dim: Dimensionamento; ps: PassoMemoria[]; mem: ReturnType<typeof memoriaDetalhada>['memoria'] }
function rodar(b0: BuildingModel): Obra {
  const b: BuildingModel = { ...b0, opcoes: { ...(b0.opcoes ?? {}), ...ANTES_DESAPRUMO } }; // baseline anterior ao desaprumo global
  const an = analisarEdificio(b);
  expect(an.erro).toBeUndefined();
  const dim = dimensionarEdificio(b, an, { fundacao: false });
  const r = memoriaDetalhada(b, { an });
  return { b, an, dim, ps: r.memoria.passos, mem: r.memoria };
}

// ---------------------------------------------------------------------------------------------- paredes de concreto

describe('MD7 · paredes de concreto (muros de subsolo com porta)', () => {
  let o: Obra;
  beforeAll(() => { o = rodar(obraConcreto()); }, 240000);

  it('a memória ligada não muda o dimensionamento das paredes', () => {
    const lig = comMemoria(new Registrador(), () => dimensionarEdificio(o.b, o.an, { fundacao: false }));
    expect(lig.armaduraParedes).toEqual(o.dim.armaduraParedes);
    expect(lig.detalhesParedes).toEqual(o.dim.detalhesParedes);
    expect(lig.resumoAcoParedes).toEqual(o.dim.resumoAcoParedes);
    expect(lig.paredes).toEqual(o.dim.paredes);
    expect(lig.vigas).toEqual(o.dim.vigas);
    expect(o.ps.filter((p) => /^Parede /.test(p.elemento)).length).toBeGreaterThan(100);
  });

  it('esforços resultantes do lado: somas das cascas refeitas por caso e extremos ELU = Σ γ·valor', () => {
    const w = o.dim.paredes![0];
    expect(w.lados.filter((x) => x.modelo === 'casca').length).toBe(2);
    for (const l of w.lados.filter((x) => x.modelo === 'casca')) {
      const el = `Parede ${w.nome} · ${l.nomePav}`, T = `Esforços resultantes do lado ${l.nome}`;
      const g = um(o.ps, el, T, 'Altura do painel');
      const H = num(g, 'H'), sc = num(g, 'sc');
      igual(sc, (num(g, 'e0') + num(g, 'e1')) / 2, 'centro do trecho');
      const casos = por(o.ps, el, T).filter((p) => p.entradas.caso !== undefined);
      expect(casos.length).toBe(Object.keys(l.casos).length);
      for (const p of casos) {
        const ref = l.casos[p.entradas.caso as string];
        const els = json<number[][]>(p, 'elementos');
        let N = 0, Vp = 0, Mp = 0, Vo = 0, Mo = 0;
        for (const [A, s, ny, nxy, qy, my] of els) { const wd = A / H, ds = s - sc; N += ny * wd; Vp += nxy * wd; Mp += ny * ds * wd; Vo += qy * wd; Mo += my * wd; }
        igual(N, ref.N, 'N'); igual(Vp, ref.Vp, 'Vp'); igual(Mp, ref.Mp, 'Mp'); igual(Vo, ref.Vo, 'Vo'); igual(Mo, ref.Mo, 'Mo');
        igual(num(p, 'N'), ref.N, 'N registrado');
      }
      const ext = por(o.ps, el, T).filter((p) => p.entradas.combinacao !== undefined && /nas combinações ELU/.test(p.descricao));
      expect(ext.length).toBe(10);
      for (const p of ext) {
        const q = /\b(Vp|Mp|Vo|Mo|N)\b/.exec(p.formula)![1] as 'N' | 'Vp' | 'Mp' | 'Vo' | 'Mo';
        const maximo = /máximo/.test(p.descricao);
        let v = 0;
        for (const k of Object.keys(p.entradas)) if (k.startsWith('γ_')) v += num(p, k) * num(p, `${q}_${k.slice(2)}`);
        igual(v, maximo ? l.elu[q].max : l.elu[q].min, `${q} ${maximo ? 'máx' : 'mín'}`);
        igual(p.resultado as number, v, 'resultado');
      }
    }
  });

  it('cargas na base: reações por caso e N máx/mín ELU refeitos', () => {
    const w = o.dim.paredes![0], el = `Parede ${w.nome} · Base`;
    const ps = por(o.ps, el, 'Cargas na base (reações da fundação)');
    expect(ps.length).toBeGreaterThan(3);
    for (const p of ps.filter((q) => q.entradas.caso !== undefined)) igual(num(p, 'N'), w.base[p.entradas.caso as string].N, 'N base');
    const mx = ps.find((p) => /Normal máxima/.test(p.descricao))!;
    let N = 0;
    for (const k of Object.keys(mx.entradas)) if (k.startsWith('γ_')) N += num(mx, k) * num(mx, `N_${k.slice(2)}`);
    igual(N, w.baseElu.Nmax, 'Nmax');
  });

  it('pano: cadeia do elemento governante (M1d,mín, M2d, camadas, membrana) refeita e armadura = req.vert', () => {
    const w = o.dim.armaduraParedes![0];
    const pano = w.panos.find((p) => p.nomePav === 'Térreo')!, el = `Parede ${w.nome} · ${pano.nomePav}`;
    const T = new RegExp(`^Lado ${pano.nomeLado} · pano ${pano.pano + 1} de ${pano.panos}`);
    const ps = por(o.ps, el, T);
    expect(ps.length).toBeGreaterThan(15);
    // fatias: a envoltória por elemento fecha com a necessidade do pano
    const fat = json<number[][]>(um(o.ps, el, T, 'Necessidades de cada elemento'), 'elementos');
    igual(Math.max(...fat.map((q) => q[3])), pano.req.vert, 'req.vert'); igual(Math.max(...fat.map((q) => q[4])), pano.req.hor, 'req.hor');
    igual(Math.max(...fat.map((q) => q[5])), pano.tensoes.utilConcreto, 'util'); igual(Math.max(...fat.map((q) => q[6])), pano.cortante.V, 'V');
    // elemento governante da armadura vertical
    const gov = um(o.ps, el, T, 'Elemento governante (armadura vertical');
    const f = gov.entradas as unknown as Forcas & { combinacao: string };
    const g = pano.governa.pior!;
    expect(f.combinacao).toBe(g.combo);
    for (const k of ['nx', 'ny', 'nxy', 'mx', 'my', 'mxy', 'qx', 'qy'] as const) igual(f[k], g.forcas[k], k);
    const t = pano.t, d1 = num(um(o.ps, el, T, 'Materiais do pano'), 'fyd') && num(um(o.ps, el, T, 'Geometria do pano'), 'd1');
    const le = num(um(o.ps, el, T, 'Comprimento de flambagem'), 'le'), lambda = (le * Math.sqrt(12)) / t;
    igual(num(um(o.ps, el, T, 'Comprimento de flambagem'), 'lambda'), lambda, 'λ');
    const ncomp = Math.max(0, -f.ny), m1 = ncomp * (0.015 + 0.03 * t);
    let m2 = 0;
    if (ncomp > 0 && lambda > 35) { const nu = ncomp / (t * c30.fcd * 1000); m2 = ((ncomp * le * le) / 10) * Math.min(0.005 / (t * (nu + 0.5)), 0.005 / t); }
    if (ncomp > 0) igual(num(um(o.ps, el, T, 'Momento mínimo de 1ª ordem'), 'm1min'), m1, 'M1d,mín');
    const variantes = ncomp > 0 ? [Math.max(f.my, m1) + m2, Math.min(f.my, -m1) - m2] : [f.my];
    const z = 0.9 * (t - d1);
    igual(num(um(o.ps, el, T, 'Braço de alavanca'), 'z'), z, 'z');
    let fty = 0, ftx = 0;
    variantes.forEach((my, iv) => {
      const cs = camadas({ ...(f as Forcas), my }, z);
      cs.forEach((c, ic) => {
        const p = ps.filter((q) => q.entradas.variante === iv + 1 && q.entradas.camada === ic && q.descricao.startsWith(`Variante ${iv + 1}, camada`))[0];
        const m = membrana(c.nx, c.ny, c.nxy);
        igual(num(p, 'nx'), c.nx, 'nx camada'); igual(num(p, 'ny'), c.ny, 'ny camada'); igual(num(p, 'nxy'), c.nxy, 'nxy camada');
        igual(num(p, 'fty'), m.fty, 'fty'); igual(num(p, 'ftx'), m.ftx, 'ftx');
        fty = Math.max(fty, m.fty); ftx = Math.max(ftx, m.ftx);
      });
    });
    const arm = um(o.ps, el, T, 'Armadura necessária por face do elemento (armadura vertical');
    igual(num(arm, 'rv'), pano.req.vert, 'rv registrado'); igual((fty * 10) / num(arm, 'fyd'), pano.req.vert, 'rv refeito');
    igual((ftx * 10) / num(arm, 'fydH'), num(arm, 'rh'), 'rh refeito');
  });

  it('pano: mínimos, malha adotada, cumprimento, cortante transversal (VRd1, VRd2) e reforços locais refeitos', () => {
    const w = o.dim.armaduraParedes![0];
    for (const pano of w.panos) {
      const el = `Parede ${w.nome} · ${pano.nomePav}`, T = new RegExp(`^Lado ${pano.nomeLado} · pano ${pano.pano + 1} de ${pano.panos}`);
      const geo = um(o.ps, el, T, 'Geometria do pano'), mat = um(o.ps, el, T, 'Materiais do pano');
      const t = num(geo, 't'), d1 = num(geo, 'd1');
      const mec = um(o.ps, el, T, 'Armadura mínima mecânica');
      igual(num(mec, 'asMinMec'), (0.15 * num(mec, 'ncompMax') * 10) / num(mat, 'fyd'), 'As,mín,mec');
      const mv = um(o.ps, el, T, 'Armadura vertical mínima por face');
      igual(num(mv, 'minVert'), Math.max((num(mv, 'taxaVertMin') / 100) * t * 1e4, num(mec, 'asMinMec')) / 2, 'min vert');
      const malha = um(o.ps, el, T, 'Malha adotada');
      igual(num(malha, 'asVert'), pano.asVert, 'asVert'); igual(num(malha, 'asHor'), pano.asHor, 'asHor');
      igual(num(malha, 'areaAtende') / num(malha, 'area'), pano.cumprimento, 'cumprimento');
      igual((Math.PI * (num(malha, 'phiV') / 1000) ** 2 / 4 * 1e4) / num(malha, 'sV'), pano.asVert, 'As = π φ²/4/s');
      expect(num(malha, 'asVert')).toBeGreaterThanOrEqual(num(mv, 'minVert') - 1e-9);
      // cortante transversal
      const ct = um(o.ps, el, T, 'Cortante fora do plano por metro');
      const d = t - d1, rho = Math.min(0.02, num(ct, 'asCm2') / (100 * d * 100)), k = Math.max(1, Math.abs(1.6 - d)), tau = 0.25 * num(ct, 'fctd') * 1000, scp = num(ct, 'ncompMax') / t;
      const VRd1 = (tau * k * (1.2 + 40 * rho) + 0.15 * scp) * d, VRd2 = 0.27 * (1 - num(ct, 'fck') / 250) * num(ct, 'fcd') * 1000 * d;
      igual(num(ct, 'VRd1'), VRd1, 'VRd1'); igual(num(ct, 'VRd2'), VRd2, 'VRd2');
      igual(VRd1, pano.cortante.VRd1, 'VRd1 do pano'); igual(VRd2, pano.cortante.VRd2, 'VRd2 do pano');
      // reforços
      const fx = um(o.ps, el, T, 'Faixas da malha');
      const rv = reforcosLocais('vertical', json(fx, 'colunas'), num(fx, 'adotadoVert'), num(fx, 'phiMinVert')), rh = reforcosLocais('horizontal', json(fx, 'linhas'), num(fx, 'adotadoHor'), num(fx, 'phiMinHor'));
      const esperado = [...(num(fx, 'soHorizontal') ? [] : rv), ...rh];
      expect(esperado).toEqual(pano.reforcos);
      expect(por(o.ps, el, T).filter((p) => /^Reforço local/.test(p.descricao)).length).toBe(pano.reforcos.length);
    }
  });

  it('abertura: tração da verga, cortante da verga (modelo I) e montantes refeitos', () => {
    const w = o.dim.armaduraParedes![0], a = w.aberturas[0];
    expect(a).toBeDefined();
    const el = `Parede ${w.nome} · ${a.nomePav}`, T = new RegExp(`^Abertura porta ${a.id}`);
    const ver = um(o.ps, el, T, 'Armadura de verga');
    const combos = json<number[][]>(ver, 'combos'), d = num(ver, 'd'), z = 0.9 * d;
    igual(d, Math.max(0.05, num(ver, 'h') - num(ver, 'cobrimento') - 0.01), 'd');
    const T1 = Math.max(0, ...combos.map(([N, M]) => Math.max(N / 2 + Math.abs(M) / z, N / 2 - Math.abs(M) / z) / (num(ver, 'fyd') * 1000) * 1e4));
    igual(T1, a.necessaria.verga, 'As verga'); igual(ver.resultado as number, a.necessaria.verga, 'resultado');
    const cs = um(o.ps, el, T, 'Cortante da verga');
    const cc = beamShear(num(cs, 't'), num(cs, 'd'), num(cs, 'Vsd'), c30, num(cs, 'fywk'), num(cs, 'gammaS'));
    igual(num(cs, 'VRd2'), cc.VRd2, 'VRd2 verga'); igual(num(cs, 'VRd2'), a.cortanteVerga.VRd2, 'VRd2 do resultado'); igual(num(cs, 'Vsd'), a.cortanteVerga.Vsd, 'Vsd');
    const mont = um(o.ps, el, T, 'Montantes');
    igual(num(mont, 'asVertVizinho') * num(mont, 'largura'), a.necessaria.montante, 'montante');
    const adot = um(o.ps, el, T, 'Armadura adotada');
    expect(adot.entradas.origem).toBe(a.origem);
  });

  it('verificação global do lado: utilização por combinação refeita e máximo = util do lado', () => {
    const w = o.dim.armaduraParedes![0];
    expect(w.lados.filter((x) => x.modelo === 'casca').length).toBe(2);
    for (const l of w.lados.filter((x) => x.modelo === 'casca')) {
      const el = `Parede ${w.nome} · ${l.nomePav}`, ps = por(o.ps, el, `Verificação global do lado ${l.nome}`);
      const us = ps.filter((p) => /^Combinação/.test(p.descricao));
      expect(us.length).toBeGreaterThan(0);
      igual(Math.max(...us.map((p) => p.resultado as number)), l.util, 'util do lado');
      const fim = ps.find((p) => /^Utilização do lado/.test(p.descricao))!;
      igual(fim.resultado as number, l.util, 'util registrada'); expect(fim.entradas.combinacao).toBe(l.combo);
      for (const p of us) {
        const mom = Math.hypot(num(p, 'mx'), num(p, 'my')) / 1000;
        igual(num(p, 'mom'), mom, 'momento');
        const Rs = [num(p, 'MRd_1'), num(p, 'MRd_2')].filter((x) => typeof x === 'number');
        if (mom > 1e-12 && Rs.length) igual(Math.max(...Rs.map((R) => mom / R)), p.resultado as number, 'util da combinação');
      }
    }
  });

  it('exportação das cascas: tabelas de cascas, origem na parede e esforços por caso e por combinação somam os fatores', () => {
    const combs = combinacoesDoEstado(o.b, o.an, 'concreto').filter((c) => c.tipo === 'ELU');
    const ts = tabelasAnalise(o.b, o.an, combs), nome = (n: string) => ts.find((t) => t.nome === n)!;
    const nc = o.an.portico.modelo.cascas!.length;
    expect(nome('cascas').linhas.length).toBe(nc);
    expect(nome('cascas').cabecalho).toEqual(['casca', 'nos', 'E', 'nu', 'h']);
    expect(nome('cascas').linhas[0][2]).toBe(o.an.portico.modelo.cascas![0].E);
    expect(nome('cascas_parede').linhas.length).toBe(o.an.paredes!.info.length);
    const ecs = nome('esforcos_cascas');
    expect(ecs.cabecalho.slice(2)).toEqual(['nx', 'ny', 'nxy', 'mx', 'my', 'mxy', 'qx', 'qy']);
    expect(ecs.linhas.length).toBe(nc * (o.an.casos.length + (o.an.vento?.casos.length ?? 0)));
    const iG = o.an.casos.indexOf('G'), k = o.an.paredes!.info[0].k;
    const lg = ecs.linhas.find((l) => l[0] === 'G' && l[1] === k)!;
    for (let q = 0; q < 8; q++) expect(lg[2 + q]).toBe(o.an.portico.res!.cascas![iG][k][q]);
    // combinação: Σ fator·caso (casos da obra e vento)
    const cb = combs[0], ecc = nome('esforcos_cascas_combinacoes').linhas.find((l) => l[0] === cb.nome && l[1] === k)!;
    const esp = new Array(8).fill(0);
    for (const [n, f] of Object.entries(cb.fatores)) {
      const ic = o.an.casos.indexOf(n), iv = (o.an.vento?.casos ?? []).findIndex((c) => c.nome === n);
      const v = ic >= 0 ? o.an.portico.res!.cascas?.[ic]?.[k] : iv >= 0 ? o.an.portico.resVento!.cascas?.[iv]?.[k] : undefined;
      if (v) for (let q = 0; q < 8; q++) esp[q] += f * v[q];
    }
    for (let q = 0; q < 8; q++) igual(ecc[2 + q] as number, esp[q], `combinação q${q}`);
    expect(csvTabela(nome('esforcos_cascas')).split('\n')[0]).toBe('caso;casca;nx;ny;nxy;mx;my;mxy;qx;qy');
  });

  it('filtro por elemento e HTML/CSV com os passos das paredes', () => {
    const w = o.dim.armaduraParedes![0], el = `Parede ${w.nome} · Térreo`;
    const r = memoriaDetalhada(o.b, { an: o.an, elementos: [el] });
    expect(r.memoria.elementos.filter((e) => e !== 'Edifício')).toEqual([el]);
    const h = htmlMemoriaCorpo(r.memoria);
    expect((h.match(/data-passo=/g) ?? []).length).toBe(r.memoria.passos.length);
    expect(csvMemoria(r.memoria).trim().split('\n').length).toBe(r.memoria.passos.length + 1);
  });
});

// ---------------------------------------------------------------------------------------------- pilar-parede

describe('MD7 · pilar-parede em L (lado curto como pilar por fibras)', () => {
  let o: Obra;
  beforeAll(() => { o = rodar(obraPP()); }, 240000);

  it('a memória ligada não muda o dimensionamento do pilar-parede', () => {
    const lig = comMemoria(new Registrador(), () => dimensionarEdificio(o.b, o.an, { fundacao: false }));
    expect(lig.armaduraParedes).toEqual(o.dim.armaduraParedes);
    expect(lig.pilaresParede).toEqual(o.dim.pilaresParede);
    expect(lig.detalhesParedes).toEqual(o.dim.detalhesParedes);
  });

  it('lado curto: Nd, momentos de projeto (M1d,mín, M2d) e utilização por combinação refeitos', () => {
    const w = o.dim.armaduraParedes!.find((x) => x.tipo === 'pilarParede')!;
    expect(w.lados.filter((x) => x.modelo === 'barra').length).toBe(2);
    for (const l of w.lados.filter((x) => x.modelo === 'barra')) {
      const el = `Pilar-parede ${w.nome} · ${l.nomePav}`, T = `Lado curto ${l.nome} (pilar)`;
      const ps = por(o.ps, el, T);
      const geo = um(o.ps, el, T, 'Seção do lado curto');
      const L = num(geo, 'L'), t = num(geo, 't'), le = num(geo, 'le');
      igual(num(geo, 'Ac'), L * t, 'Ac'); igual(num(geo, 'AsMin'), l.barra!.AsMin, 'AsMin'); igual(num(geo, 'AsMax'), l.barra!.AsMax, 'AsMax');
      igual(num(geo, 'lambdaP'), (le * Math.sqrt(12)) / L, 'λp'); igual(num(geo, 'lambdaO'), (le * Math.sqrt(12)) / t, 'λo');
      const projs = ps.filter((p) => /momentos de projeto/.test(p.descricao));
      expect(projs.length).toBeGreaterThan(0);
      for (const p of projs) {
        const Nd = num(p, 'Nd'), m1p = Nd * (0.015 + 0.03 * L), m1o = Nd * (0.015 + 0.03 * t);
        igual(num(p, 'm1p'), m1p, 'M1d,mín plano'); igual(num(p, 'm1o'), m1o, 'M1d,mín fora');
        const m2p = m2dPadrao(Nd, L, le, c30, L * t), m2o = m2dPadrao(Nd, t, le, c30, L * t);
        igual(num(p, 'm2p'), m2p, 'M2d plano'); igual(num(p, 'm2o'), m2o, 'M2d fora');
        igual(num(p, 'p'), Math.max(Math.abs(num(p, 'Mp')), m1p) + m2p, 'p'); igual(num(p, 'o'), Math.max(Math.abs(num(p, 'Mo')), m1o) + m2o, 'o');
        // λ > 35 ⇔ M2d > 0 (pilar-padrão de curvatura aproximada)
        expect(m2p > 0).toBe((le * Math.sqrt(12)) / L > 35);
      }
      const fim = ps.find((p) => /^Utilização do lado/.test(p.descricao))!;
      igual(fim.resultado as number, l.util, 'util'); expect(fim.entradas.combinacao).toBe(l.combo);
      const us = ps.filter((p) => /flexo-compressão oblíqua/.test(p.descricao));
      igual(Math.max(...us.map((p) => p.resultado as number)), l.util, 'máx das combinações');
      const ad = ps.find((p) => /^Malha vertical adotada/.test(p.descricao))!;
      igual(num(ad, 'As'), l.barra!.As, 'As'); expect(ad.entradas.phi).toBe(l.barra!.vert!.phi);
      const est = ps.find((p) => /^Estribos do lado curto/.test(p.descricao))!;
      expect(est.entradas.phi).toBe(l.barra!.estribo.phi); igual(num(est, 's'), l.barra!.estribo.s, 's');
    }
  });

  it('resultantes do lado curto (barra) e lado longo em casca registrados, com o recorte do trecho', () => {
    const w = o.dim.pilaresParede![0];
    for (const l of w.lados) {
      const el = `Pilar-parede ${w.nome} · ${l.nomePav}`;
      if (l.modelo === 'barra') {
        const ps = por(o.ps, el, `Esforços resultantes do lado ${l.nome} (barra)`);
        expect(ps.length).toBeGreaterThan(5);
        const caso = ps.find((p) => p.entradas.caso === 'G')!;
        igual(num(caso, 'N'), l.casos.G.N, 'N');
      } else expect(por(o.ps, el, `Esforços resultantes do lado ${l.nome}`).length).toBeGreaterThan(5);
    }
  });
});
