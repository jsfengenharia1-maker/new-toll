// Memória de cálculo detalhada do pórtico plano 2D (MD fase 8). As contas são refeitas a partir das `entradas` registradas e
// comparadas com o dimensionamento (erro relativo ≤ 1e-9); o dimensionamento com a memória ligada é idêntico (`toEqual`) ao desligado;
// a viga biapoiada e a coluna de Euler conferem com a solução analítica; o script OpenSees reproduz deslocamentos e reações do solver.
import { describe, expect, it } from 'vitest';
import { analyze } from '../solver';
import { addMember } from '../edit';
import { runDesign, type MemberDesign } from '../design';
import { ES, barArea, beamFlexure, beamShear, bransonRatio, columnBars, concrete, crackWidth, momentCapacity } from '../concrete';
import { emptyModel, type Model, type Support } from '../types';
import { sampleFoundation, normalizeFoundation } from '../piles';
import { samplePortico, sampleViga } from '../../app/samples';
import { memoriaPortico } from './portico';
import { htmlMemoriaCorpo } from './html';
import { csvMemoria, indiceMemoria } from './saida';
import { jsonTabelas, csvTabela, zipDados } from './dadosAnalise';
import { tabelasPortico, combinacoesPortico } from './dadosPortico';
import { scriptOpenSeesPortico } from './openseesPortico';
import { Registrador, comMemoria, type PassoMemoria } from './registrador';

const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1e-12, Math.abs(b));
const igual = (a: number, b: number, msg = '', tol = 1e-9) => expect(rel(a, b) < tol || Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`).toBe(true);
const num = (p: PassoMemoria, k: string) => p.entradas[k] as number;
const por = (ps: PassoMemoria[], topico: RegExp | string) => ps.filter((p) => (typeof topico === 'string' ? p.topico === topico : topico.test(p.topico)));
const um = (ps: PassoMemoria[], topico: RegExp | string, desc: RegExp | string) => {
  const l = por(ps, topico).filter((p) => (typeof desc === 'string' ? p.descricao.startsWith(desc) : desc.test(p.descricao)));
  expect(l.length, `${String(topico)} · ${String(desc)}`).toBeGreaterThan(0);
  return l[0];
};

const FIX: Support = { ux: 'fixed', uy: 'fixed', rz: 'fixed' };
const PIN: Support = { ux: 'fixed', uy: 'fixed', rz: 'free' };
const ROL: Support = { ux: 'free', uy: 'fixed', rz: 'free' };
function sup(m: Model, x: number, y: number, s: Support) { const n = m.nodes.find((k) => Math.abs(k.x - x) < 1e-9 && Math.abs(k.y - y) < 1e-9); if (n) n.support = { ...s }; }
const mem = (m: Model, i: number) => m.members[i].id;

/** Viga biapoiada de 5 m com carga permanente de 20 kN/m (sem peso próprio). */
function vigaBiapoiada(): Model {
  const m = emptyModel();
  m.name = 'Viga biapoiada';
  m.sections = [{ id: 1, name: 'Viga 20x50', shape: { kind: 'rect', b: 0.2, h: 0.5 } }];
  addMember(m, 0, 0, 5, 0, 1, 1);
  sup(m, 0, 0, PIN); sup(m, 5, 0, ROL);
  m.cases = [{ id: 1, name: 'Permanente', nature: 'G' }];
  m.loads = [{ kind: 'dist', id: 1, caseId: 1, member: m.members[0].id, system: 'global', qxi: 0, qyi: -20, qxj: 0, qyj: -20 }];
  return m;
}

/** Viga comprimida (ν > 0,10): verificada também à flexo-compressão. */
function vigaComprimida(): Model {
  const m = vigaBiapoiada();
  m.name = 'Viga comprimida';
  m.loads.push({ kind: 'nodal', id: 2, caseId: 1, node: m.nodes.find((n) => n.x === 5)!.id, fx: -700, fy: 0, mz: 0 });
  return m;
}

/** Pórtico simples de aço (perfil I laminado), pilares engastados, vento e sobrecarga. */
function portalAco(): Model {
  const m = emptyModel();
  m.name = 'Pórtico de aço';
  m.materials = [{ id: 1, name: 'Aço 345', E: 2.05e8, nu: 0.3, alpha: 1.2e-5, gamma: 78.5, kind: 'steel', fy: 345, fu: 450 }];
  m.sections = [{ id: 1, name: 'I 300', shape: { kind: 'ishape', bf: 0.2, tf: 0.0125, tw: 0.008, h: 0.3 } }, { id: 2, name: 'Tubo 168', shape: { kind: 'tube', d: 0.1683, t: 0.0071 } }];
  addMember(m, 0, 0, 0, 4, 1, 1);
  addMember(m, 0, 4, 6, 4, 1, 1);
  addMember(m, 6, 4, 6, 0, 1, 2);
  sup(m, 0, 0, FIX); sup(m, 6, 0, FIX);
  m.cases = [{ id: 1, name: 'Permanente', nature: 'G' }, { id: 2, name: 'Sobrecarga', nature: 'Q' }, { id: 3, name: 'Vento', nature: 'W' }];
  m.loads = [
    { kind: 'selfWeight', id: 1, caseId: 1, factor: 1 },
    { kind: 'dist', id: 2, caseId: 1, member: mem(m, 1), system: 'global', qxi: 0, qyi: -10, qxj: 0, qyj: -10 },
    { kind: 'dist', id: 3, caseId: 2, member: mem(m, 1), system: 'global', qxi: 0, qyi: -8, qxj: 0, qyj: -8 },
    { kind: 'nodal', id: 4, caseId: 3, node: m.nodes.find((n) => n.x === 0 && n.y === 4)!.id, fx: 15, fy: 0, mz: 0 },
  ];
  return m;
}

/** Pórtico do exemplo com pilares circulares. */
function portalCircular(): Model {
  const m = samplePortico();
  m.sections[0] = { id: 1, name: 'Pilar Ø40', shape: { kind: 'circle', d: 0.4 } };
  return m;
}

const modelos: [string, () => Model][] = [
  ['galpão (concreto, γz, desaprumo)', samplePortico], ['viga contínua T', sampleViga], ['viga biapoiada', vigaBiapoiada], ['viga comprimida', vigaComprimida], ['pórtico de aço', portalAco], ['pilares circulares', portalCircular],
  ['galpão com P-Δ', () => { const m = samplePortico(); m.design = { ...(m.design ?? {}), caa: 2, gammaC: 1.4, gammaS: 1.15, fyk: 500, fywk: 500, dmax: 0.019, gammaA1: 1.1, secondOrder: 'pdelta' }; return m; }],
  ['galpão com alvenaria e t0', () => { const m = samplePortico(); m.design = { ...(m.design ?? {}), caa: 3, gammaC: 1.4, gammaS: 1.15, fyk: 500, fywk: 500, dmax: 0.019, gammaA1: 1.1, masonry: true, t0Months: 3 }; return m; }],
];

function rodar(m: Model) {
  const a = analyze(m);
  expect(a.prep.error).toBeUndefined();
  const base = runDesign(m, a);
  const r = memoriaPortico(m, a);
  return { m, a, base, rep: r.rep, mem: r.memoria, ps: r.memoria.passos };
}
const doElemento = (c: ReturnType<typeof rodar>, el: string) => c.ps.filter((p) => p.elemento === el);
const nomeEl = (md: MemberDesign) => `${md.role === 'beam' ? (md.materialKind === 'steel' ? 'Viga de aço' : 'Viga') : md.materialKind === 'steel' ? 'Pilar de aço' : 'Pilar'} B${md.id}`;

describe('MD8 · memória ligada não muda o dimensionamento', () => {
  for (const [nome, mk] of modelos) {
    it(nome, () => {
      const m = mk(), a = analyze(m);
      const off = runDesign(m, a);
      const on = memoriaPortico(m, a);
      expect(on.rep).toEqual(off);
      // o relatório sem memória depois da memória continua o mesmo (nada vaza entre as execuções)
      expect(runDesign(m, a)).toEqual(off);
      expect(on.memoria.passos.length).toBeGreaterThan(50);
      // registrador ligado diretamente também não muda
      expect(comMemoria(new Registrador(), () => runDesign(m, a))).toEqual(off);
    });
  }
  it('o filtro de elementos mantém os passos globais e só o elemento pedido', () => {
    const m = samplePortico(), a = analyze(m);
    const r = memoriaPortico(m, a, { elementos: ['Viga B2'] });
    expect(new Set(r.memoria.passos.map((p) => p.elemento))).toEqual(new Set(['Pórtico', 'Viga B2']));
  });
});

describe('MD8 · solução analítica', () => {
  const c = rodar(vigaBiapoiada());
  const ps = doElemento(c, 'Viga B1');
  it('viga biapoiada: Md = 1,4·q·L²/8 a meio do vão e Vd = 1,4·q·L/2 no apoio, com a soma γ·Sk da composição', () => {
    const M = um(ps, 'Envoltória ELU', 'Momento positivo máximo');
    igual(M.resultado as number, (1.4 * 20 * 25) / 8, 'Md');
    igual(num(M, 'x'), 2.5, 'x do momento máximo');
    igual(num(M, 'f_c1') * num(M, 'S_c1'), 1.4 * 20 * 25 / 8, 'γ·Mk');
    const V = um(ps, 'Envoltória ELU', 'Cortante máximo');
    igual(V.resultado as number, (1.4 * 20 * 5) / 2, 'Vd');
    // sem momento negativo e sem armadura superior calculada
    expect(ps.some((p) => p.topico === 'Flexão – armadura superior' && p.descricao.startsWith('Linha neutra'))).toBe(false);
  });
  it('flexão da mesma viga refeita pela solução do bloco retangular', () => {
    const f = um(ps, 'Flexão – armadura inferior', /^Linha neutra/);
    const Md = (1.4 * 20 * 25) / 8, sig = num(f, 'sigmaCd'), b = num(f, 'b'), lam = num(f, 'lambda'), d = num(f, 'd');
    // Md/1000 = σcd·b·λx·(d − λx/2)  →  x
    const A = sig * b * lam * lam / 2, B = -sig * b * lam * d, C = Md / 1000;
    const x = (-B - Math.sqrt(B * B - 4 * A * C)) / (2 * A);
    igual(f.resultado as number, x, 'x da linha neutra', 1e-9);
    const As = um(ps, 'Flexão – armadura inferior', 'Armadura de tração');
    igual(As.resultado as number, (sig * b * lam * x) / num(As, 'fyd'), 'As');
  });
  it('coluna de aço de Euler: Ne = π²·E·I/ℓe² e χ da curva da NBR 8800', () => {
    const m = portalAco(), cc = rodar(m);
    const col = cc.base.members.find((x) => x.materialKind === 'steel' && x.role === 'column')!;
    const ps2 = doElemento(cc, nomeEl(col));
    const e = um(ps2, 'Compressão (item 5.3)', /^Carga crítica de Euler/);
    igual(num(e, 'E') * 0 + Math.PI ** 2 * num(e, 'E') * num(e, 'Ix') / num(e, 'leIn') ** 2, col.steel!.NcRd * 0 + Math.PI ** 2 * 200000 * num(e, 'Ix') / num(e, 'leIn') ** 2, 'Nex');
    const ch = um(ps2, 'Compressão (item 5.3)', /^Índice de esbeltez reduzido/);
    const l0 = num(ch, 'lambda0');
    igual(ch.resultado as number, l0 <= 1.5 ? 0.658 ** (l0 * l0) : 0.877 / (l0 * l0), 'χ');
    igual(l0, Math.sqrt((num(ch, 'Q') * num(ch, 'A') * (m.materials[0].fy ?? 345)) / num(ch, 'Ne')), 'λ0');
    igual(col.steel!.chi, ch.resultado as number, 'χ do cálculo');
  });
});

describe('MD8 · viga com flexo-compressão', () => {
  it('a viga comprimida ganha a cadeia do pilar e a memória não muda o resultado', () => {
    const c = rodar(vigaComprimida());
    const v = c.base.members[0];
    expect(v.beam?.asColumn).toBeTruthy();
    const ps = doElemento(c, 'Viga B1 · flexo-compressão');
    expect(ps.length).toBeGreaterThan(15);
    const s = um(ps, /Fora do plano/, /^S1 \(flexão no plano/);
    igual(s.resultado as number, v.beam!.asColumn!.check!.util, 'util');
    const nu = um(doElemento(c, 'Viga B1'), 'Envoltória ELU', /^Compressão máxima na barra/);
    igual(nu.resultado as number, v.beam!.axialNu, 'ν');
    expect(v.beam!.axialNu).toBeGreaterThan(0.1);
  });
});

describe('MD8 · globais: combinações, γz, equilíbrio, fundação', () => {
  const c = rodar(samplePortico());
  const g = doElemento(c, 'Pórtico');
  it('combinações: coeficientes registrados reproduzem as combinações do dimensionamento', () => {
    for (const cb of c.rep.elu) {
      const p = g.find((q) => q.topico === 'ELU (usadas no dimensionamento)' && q.resultado === cb.name)!;
      expect(p, cb.name).toBeTruthy();
      for (const [id, f] of Object.entries(cb.factors)) igual(num(p, `f_c${id}`), f, `${cb.name} caso ${id}`);
    }
    for (const [lista, topico] of [[c.rep.qp, 'ELS quase permanente (flecha)'], [c.rep.rare, 'Rara (fundação e flecha de aço)']] as const)
      for (const cb of lista) expect(g.some((q) => q.topico === topico && q.resultado === cb.name), cb.name).toBe(true);
    expect(g.some((q) => q.topico === 'Coeficientes' && num(q, 'gamaG') === 1.4)).toBe(true);
  });
  it('γz: M1 = Σ H·(y − ybase), ΔM = Σ −V·u e γz = 1/(1 − ΔM/M1) refeitos da lista por nó', () => {
    const ps = g.filter((q) => q.topico === 'Estabilidade global (γz)' && q.entradas.nos);
    expect(ps.length).toBe(c.rep.gammaZ.rows.length);
    for (const p of ps) {
      const nos = JSON.parse(p.entradas.nos as string) as [number, number, number, number, number][];
      const yb = num(p, 'ybase');
      const M1 = nos.reduce((t, [, y, H]) => t + H * (y - yb), 0), dM = nos.reduce((t, [, , , V, u]) => t - V * u, 0);
      igual(M1, num(p, 'M1'), 'M1'); igual(dM, num(p, 'dM'), 'ΔM');
      igual(1 / (1 - dM / M1), p.resultado as number, 'γz');
      const row = c.rep.gammaZ.rows.find((r) => p.descricao.startsWith(`Combinação ${r.combo}:`))!;
      igual(row.gz, p.resultado as number, 'γz do relatório');
    }
  });
  it('desaprumo: θ1 e θa pela NBR 6118 11.3.3.4.1', () => {
    const imp = c.rep.imperfection!;
    const p = um(g, 'Desaprumo global (θa)', 'Desaprumo de uma prumada e da estrutura');
    const t1 = Math.min(1 / 200, Math.max(1 / 300, 1 / (100 * Math.sqrt(num(p, 'H')))));
    igual(num(p, 'theta1'), t1, 'θ1'); igual(p.resultado as number, t1 * Math.sqrt((1 + 1 / num(p, 'n')) / 2), 'θa');
    igual(p.resultado as number, imp.thetaA, 'θa do relatório');
  });
  it('equilíbrio por caso: ΣR + ΣF = 0 e deslocamento máximo igual ao do solver', () => {
    for (const p of g.filter((q) => q.topico === 'Equilíbrio por caso')) { expect(Math.abs(num(p, 'Rx') + num(p, 'Fx'))).toBeLessThan(1e-8); expect(Math.abs(num(p, 'Ry') + num(p, 'Fy'))).toBeLessThan(1e-8); }
    for (const cs of c.m.cases) {
      const r = c.a.cases.get(cs.id)!;
      const p = g.find((q) => q.topico === 'Deslocamentos' && q.descricao.startsWith(`Caso ${cs.name}:`))!;
      let mx = 0;
      for (let i = 0; i < r.u.length; i++) if (i % 3 < 2 && Math.abs(r.u[i]) > Math.abs(mx)) mx = r.u[i];
      igual(p.resultado as number, mx, `u máx ${cs.name}`);
    }
  });
  it('cargas na fundação: reações por caso, raras e ELU iguais às do relatório', () => {
    for (const f of c.rep.foundation) {
      const t = `Cargas na fundação – apoio (nó ${f.nodeId})`;
      const ps = g.filter((q) => q.topico === t);
      for (const pc of f.perCase) { const p = ps.find((q) => q.etapa === 'cargas' && q.entradas.caso === pc.caseId)!; igual(num(p, 'Ry'), pc.R[1], 'Ry'); igual(num(p, 'Rx'), pc.R[0], 'Rx'); }
      igual(num(ps.find((q) => q.descricao.startsWith('Valores característicos máximos'))!, 'Ry'), f.charMax[1], 'Ry,k máx');
      igual(num(ps.find((q) => q.descricao.startsWith('Parcela permanente'))!, 'Ry'), f.perm[1], 'Ry perm');
      igual(num(ps.find((q) => q.descricao.startsWith('Valores de cálculo máximos'))!, 'Ry'), f.designMax[1], 'Ry,d máx');
      expect(ps.find((q) => q.descricao.startsWith('Valores característicos máximos'))!.entradas.combinacao).toBe(f.charComboMaxN);
    }
  });
  it('composição por caso: Σ γ·Sk (com desaprumo) reproduz o esforço determinante dos pilares e vigas', () => {
    let n = 0;
    for (const p of c.ps.filter((q) => q.topico === 'Envoltória ELU' || q.topico === 'Esforços da combinação determinante')) {
      const chaves = Object.keys(p.entradas).filter((k) => k.startsWith('f_'));
      if (!chaves.length) continue;
      const soma = chaves.reduce((t, k) => t + num(p, k) * num(p, `S_${k.slice(2)}`), 0);
      igual(soma, p.resultado as number, `${p.elemento} · ${p.descricao.slice(0, 40)}`);
      n++;
    }
    expect(n).toBeGreaterThan(15);
  });
});

describe('MD8 · vigas de concreto (NBR 6118)', () => {
  for (const [nome, mk] of [['galpão', samplePortico], ['viga contínua T', sampleViga], ['alvenaria e t0', modelos[6][1]]] as const) {
    describe(nome, () => {
      const c = rodar(mk());
      const vigas = c.base.members.filter((x) => x.beam);
      it('há uma cadeia por viga', () => expect(vigas.length).toBeGreaterThan(0));
      for (const v of vigas) {
        const bd = v.beam!, ps = doElemento(c, nomeEl(v)), fck = c.m.materials[0].fck ?? 30;
        const cc = concrete(fck, c.m.design?.gammaC ?? 1.4);
        const fyd = (c.m.design?.fyk ?? 500) / (c.m.design?.gammaS ?? 1.15);
        it(`Viga B${v.id}: flexão (x, As, As,mín, As,calc) refeita das entradas`, () => {
          for (const [topico, M, face] of [['Flexão – armadura inferior', bd.pos, 'inf'], ['Flexão – armadura superior', bd.neg, 'sup']] as const) {
            const md = por(ps, topico).find((p) => p.descricao.startsWith('Momento de cálculo'));
            if (!md) { expect(M.AsAdopt, face).toBe(0); continue; }
            const Md = md.resultado as number;
            if (Math.abs(Md) <= 1e-9) { expect(M.AsAdopt, face).toBe(0); continue; }
            const r = beamFlexure(bd.section, face === 'inf', Md, M.d, bd.cover + 0.0063 + 0.008, cc, fyd);
            igual(um(ps, topico, /^Linha neutra/).resultado as number, r.x, `x ${face}`);
            igual(um(ps, topico, 'Armadura de cálculo').resultado as number, M.AsAdopt, `As,calc ${face}`);
            const C = um(ps, topico, 'Resultante de compressão no concreto');
            const sig = num(C, 'sigmaCd'), lam = num(C, 'lambda'), x = num(C, 'x'), bw = num(C, 'b');
            if (bd.section.kind === 'rect' && !r.double) igual(C.resultado as number, sig * bw * lam * x, `C ${face}`);
            igual(Math.max(r.As, um(ps, topico, /^Armadura mínima/).resultado as number), M.AsAdopt, `max(As; As,mín) ${face}`);
            const mm = um(ps, topico, /^Armadura mínima/);
            igual(mm.resultado as number, M.AsMin, `As,mín ${face}`);
            igual(mm.resultado as number, Math.max(beamFlexure(bd.section, face === 'inf', num(um(ps, topico, /^Momento mínimo/), 'Ic') * 0 + 0.8 * (num(um(ps, topico, /^Momento mínimo/), 'Ic') / num(um(ps, topico, /^Momento mínimo/), 'yt')) * num(um(ps, topico, /^Momento mínimo/), 'fctkSup') * 1000, num(mm, 'd1'), 0.04, cc, fyd).As, 0.0015 * num(mm, 'Ac')), `As,mín refeita ${face}`);
            if (M.bars) igual(num(por(ps, topico).find((p) => p.etapa === 'detalhamento')!, 'As'), M.AsAdopt, 'As nas barras');
            if (M.bars) igual(por(ps, topico).find((p) => p.etapa === 'detalhamento')!.resultado as number, M.bars.n * barArea(M.bars.phi), 'As,ef');
          }
        });
        it(`Viga B${v.id}: cortante (VRd2, Vc, Asw/s, estribo) refeito das entradas`, () => {
          const sh = bd.shear, d = num(um(ps, /^Cortante/, 'Altura útil do cortante'), 'dInf');
          igual(Math.min(num(um(ps, /^Cortante/, 'Altura útil do cortante'), 'dInf'), num(um(ps, /^Cortante/, 'Altura útil do cortante'), 'dSup')), bd.d, 'd');
          void d;
          const tr = sh.combo.endsWith('(seção tracionada, Vc = 0)');
          const ref = beamShear(bd.section.bw, bd.d, sh.Vsd, cc, c.m.design?.fywk ?? 500, c.m.design?.gammaS ?? 1.15, tr);
          const R = um(ps, /^Cortante/, 'Resistência da biela comprimida');
          igual(R.resultado as number, 0.27 * num(R, 'av2') * num(R, 'fcd') * num(R, 'bw') * num(R, 'd') * 1000, 'VRd2 das entradas');
          igual(R.resultado as number, ref.VRd2, 'VRd2');
          igual(um(ps, /^Cortante/, /^Parcela do concreto/).resultado as number, ref.Vc, 'Vc');
          igual(um(ps, /^Cortante/, 'Armadura transversal de cálculo').resultado as number, ref.aswS, 'Asw/s');
          igual(um(ps, /^Cortante/, 'Armadura transversal mínima').resultado as number, ref.aswMin, 'Asw,mín');
          igual(um(ps, /^Cortante/, 'Espaçamento máximo dos estribos').resultado as number, ref.smax, 'smáx');
          const V = um(ps, 'Envoltória ELU', /^Cortante máximo/);
          igual(Math.abs(V.resultado as number), Math.abs(sh.Vsd), '|VSd|');
          if (sh.stirrup) {
            const E = um(ps, /^Cortante/, /^Estribo adotado/);
            igual(E.resultado as number, (sh.stirrup.legs * barArea(sh.stirrup.phi)) / sh.stirrup.s, 'Asw,ef/s');
            expect(E.resultado as number).toBeGreaterThanOrEqual(sh.aswS - 1e-12);
          }
        });
        if (bd.crack) it(`Viga B${v.id}: fissuração (σs, ρr, w1, w2, wk) refeita das entradas`, () => {
          for (const [rot, f, q, fc] of [['face inferior', bd.pos, bd.crack!.pos, true], ['face superior', bd.neg, bd.crack!.neg, false]] as const) {
            if (rot === 'face superior' && bd.neg.AsAdopt <= 0) continue;
            const tp = `Fissuração – ${rot}`;
            if (!por(ps, tp).length) continue;
            const wk = um(ps, tp, 'Abertura característica');
            const r = crackWidth(bd.section, fc, f.bars?.As ?? f.AsAdopt, f.bars?.phi ?? 10, f.d, q.Mk, cc, c.m.design?.caa ?? 2);
            igual(wk.resultado as number, q.wk, 'wk do relatório'); igual(wk.resultado as number, r.wk, 'wk');
            const w1 = um(ps, tp, 'Abertura w1'), w2 = um(ps, tp, 'Abertura w2');
            const k = (num(w1, 'phi') / (12.5 * num(w1, 'eta1'))) * (num(w1, 'sigmaS') / ES);
            igual(w1.resultado as number, k * ((3 * num(w1, 'sigmaS')) / num(w1, 'fctm')), 'w1');
            igual(w2.resultado as number, k * (4 / num(w2, 'rhoR') + 45), 'w2');
            igual(Math.min(num(wk, 'w1'), num(wk, 'w2')), wk.resultado as number, 'mín(w1; w2)');
          }
        });
        if (v.deflection) it(`Viga B${v.id}: flecha (Ie de Branson, αf, correção de rigidez, total) refeita das entradas`, () => {
          const df = v.deflection!;
          const Ie = um(ps, 'Flecha (ELS-DEF)', 'Inércia equivalente de Branson');
          const br = bransonRatio(bd.section, true, bd.pos.bars?.As ?? Math.max(bd.pos.AsAdopt, 1e-6), bd.pos.d, num(Ie, 'Ma'), cc);
          igual(Ie.resultado as number, br.Ie, 'Ie'); igual(num(Ie, 'Mr'), br.Mr, 'Mr');
          const r3 = Math.min(1, (num(Ie, 'Mr') / num(Ie, 'Ma')) ** 3);
          igual(Ie.resultado as number, Math.min(num(Ie, 'Ic'), r3 * num(Ie, 'Ic') + (1 - r3) * num(Ie, 'III')), 'Ie das entradas');
          const rig = um(ps, 'Flecha (ELS-DEF)', 'Correção da rigidez');
          igual(rig.resultado as number, num(rig, 'f0') * ((num(rig, 'E') * num(rig, 'Ic')) / (num(rig, 'Ecs') * num(rig, 'Ie'))), 'f imediata');
          const tot = um(ps, 'Flecha (ELS-DEF)', 'Flecha total');
          igual(tot.resultado as number, df.f, 'f∞ do relatório');
          igual(tot.resultado as number, (rig.resultado as number) * (1 + num(tot, 'alphaF')), 'f∞ = f_imediata·(1 + αf)');
          const af = um(ps, 'Flecha (ELS-DEF)', /^Coeficiente de fluência/);
          const xi = (t: number) => (t > 70 ? 2 : 0.68 * 0.996 ** t * t ** 0.32);
          igual(af.resultado as number, (2 - xi(num(af, 't0'))) / (1 + 50 * Math.min(num(af, 'rho2'), 0.01)), 'αf');
          const fe = um(ps, 'Flecha (ELS-DEF)', /^Flecha elástica da análise/);
          if (!num(fe, 'balanco')) igual(fe.resultado as number, Math.abs(num(fe, 'vx') - (num(fe, 'v0') + ((num(fe, 'vL') - num(fe, 'v0')) * num(fe, 'xm')) / num(fe, 'L'))), 'f0 pela corda');
          igual(fe.resultado as number, df.fEl, 'f0 do relatório');
          if (df.after) igual(um(ps, 'Flecha (ELS-DEF)', /^Parcela após a alvenaria/).resultado as number, df.after.f, 'f após a alvenaria');
        });
      }
    });
  }
});

describe('MD8 · pilares de concreto (NBR 6118)', () => {
  const c = rodar(samplePortico());
  const pilares = c.base.members.filter((x) => x.role === 'column' && x.column);
  for (const v of pilares) {
    const ck = v.column!.check!, ps = doElemento(c, nomeEl(v)), cd = v.column!;
    it(`Pilar B${v.id}: 2ª ordem, S1/S2 e armadura refeitos das entradas`, () => {
      const m1 = um(ps, /2ª ordem/, 'Momento mínimo de 1ª ordem');
      igual(m1.resultado as number, num(m1, 'Nd') * (0.015 + 0.03 * num(m1, 'h')), 'M1d,mín');
      const ab = um(ps, /2ª ordem/, /^Coeficiente αb/);
      igual(ab.resultado as number, num(ab, 'MA') < num(ab, 'M1dMin') ? 1 : num(ab, 'transverse') ? 1 : Math.max(0.4, Math.min(1, 0.6 + 0.4 * (num(ab, 'm0') * num(ab, 'mL') > 0 ? num(ab, 'MB') / num(ab, 'MA') : -num(ab, 'MB') / num(ab, 'MA')))), 'αb');
      const l1 = um(ps, /2ª ordem/, 'Esbeltez limite');
      igual(l1.resultado as number, Math.max(35, Math.min(90, (25 + (12.5 * (num(l1, 'MA') / num(l1, 'Nd'))) / num(l1, 'h')) / num(l1, 'alphaB'))), 'λ1');
      const cv = um(ps, /2ª ordem/, /^Força normal adimensional/);
      igual(cv.resultado as number, Math.min(0.005 / (num(cv, 'h') * (num(cv, 'Nd') / 1000 / (num(cv, 'Ac') * num(cv, 'fcd')) / num(cv, 'gn') + 0.5)), 0.005 / num(cv, 'h')), '1/r');
      const m2 = um(ps, /2ª ordem/, /^(Momento de 2ª ordem local|λ ≤ λ1)/);
      igual(m2.resultado as number, num(m2, 'lambda') > num(m2, 'lambda1') ? ((num(m2, 'Nd') * num(m2, 'le') ** 2) / 10) * num(m2, 'curv') : 0, 'M2d');
      const mt = um(ps, /2ª ordem/, /^Momento total no plano/);
      igual(mt.resultado as number, Math.max(num(mt, 'alphaB') * num(mt, 'Mbase') + num(mt, 'M2d'), num(mt, 'Mbase'), num(mt, 'ms')) * num(mt, 'gn1'), 'Md,tot');
      igual(mt.resultado as number, ck.MdTotX, 'Md,tot do relatório');
      const s = um(ps, /Fora do plano/, /^S1 \(flexão no plano/);
      const s1 = num(s, 'MdTotX') / num(s, 'MRxx'), s2 = (num(s, 'MxS2') / num(s, 'MRxx')) ** 1.2 + (num(s, 'MdTotY') / num(s, 'MRyy')) ** 1.2;
      igual(s.resultado as number, Math.max(s1, s2), 'util'); igual(s.resultado as number, ck.util, 'util do relatório');
      igual(num(s, 'interaction'), ck.interaction, 'interação');
    });
    it(`Pilar B${v.id}: MRd por fibras e armadura adotada conferem com a rotina de seção`, () => {
      const mr = um(ps, /Fora do plano/, /^Momentos resistentes por integração/);
      const sec = c.m.sections.find((q) => q.id === c.m.members.find((mm) => mm.id === v.id)!.section)!.shape;
      if (sec.kind !== 'rect') return;
      const L = cd.layout!, cc = concrete(c.m.materials[0].fck ?? 30, 1.4), fyd = 500 / 1.15;
      const N = num(mr, 'N');
      igual((momentCapacity(sec.b, sec.h, columnBars(sec.b, sec.h, L, true), N / 1000, cc, fyd) ?? NaN) * 1000, num(mr, 'MRxx'), 'MRd no plano');
      igual((momentCapacity(sec.h, sec.b, columnBars(sec.b, sec.h, L, false), N / 1000, cc, fyd) ?? NaN) * 1000, num(mr, 'MRyy'), 'MRd fora do plano');
      const arm = um(ps, 'Armadura longitudinal', /^Armadura adotada/);
      igual(arm.resultado as number, L.n * barArea(L.phi), 'As'); igual(arm.resultado as number, L.As, 'As do relatório');
      const mn = um(ps, 'Armadura longitudinal', 'Armadura mínima');
      igual(mn.resultado as number, Math.max((0.15 * num(mn, 'NdMax')) / 1000 / num(mn, 'fyd'), 0.004 * num(mn, 'Ac')), 'As,mín');
      expect(arm.resultado as number).toBeGreaterThanOrEqual((mn.resultado as number) - 1e-12);
    });
    it(`Pilar B${v.id}: estribo e cortante`, () => {
      const e = um(ps, 'Cortante e estribos', /^Estribo adotado/);
      expect(num(e, 'provided')).toBeGreaterThanOrEqual(num(e, 'aswS') - 1e-9);
      igual(num(e, 'provided'), (2 * barArea(num(e, 'phiT'))) / num(e, 's'), 'Asw,ef/s');
      igual(num(e, 's'), cd.stirrup!.s, 's do relatório');
    });
  }
  it('todas as combinações ELU aparecem com a utilização do relatório', () => {
    const v = pilares[0], ps = doElemento(c, nomeEl(v));
    const res = por(ps, 'Combinações ELU – utilização');
    expect(res.length).toBe(v.column!.checks.length);
    res.forEach((p, i) => igual(p.resultado as number, v.column!.checks[i].util, `util ${i}`));
  });
  it('pilar circular: cadeia pelo pilar-padrão e fibras, com cortante de bw = D', () => {
    const cc = rodar(portalCircular());
    const col = cc.base.members.find((x) => x.role === 'column' && x.column)!;
    const ps = doElemento(cc, nomeEl(col));
    const s = um(ps, /Fora do plano/, /^S1 \(/);
    igual(s.resultado as number, col.column!.check!.util, 'util');
    const e = um(ps, 'Cortante e estribos', /^Estribo adotado/);
    expect(col.columnShear).toBeTruthy();
    igual(num(e, 'provided'), col.columnShear!.provided, 'Asw,ef/s');
  });
});

describe('MD8 · barras de aço (NBR 8800)', () => {
  const c = rodar(portalAco());
  const aco = c.base.members.filter((x) => x.steel && x.steel.check);
  it('há barras de aço verificadas', () => expect(aco.length).toBe(3));
  for (const v of aco) {
    const sd = v.steel!, ck = sd.check!, ps = doElemento(c, nomeEl(v)), fy = c.m.materials[0].fy!;
    it(`Barra B${v.id}: compressão (Ne, λ0, χ, NcRd, NtRd) refeita das entradas`, () => {
      const ne = um(ps, 'Compressão (item 5.3)', /^Carga crítica de Euler/);
      const Nex = (Math.PI ** 2 * num(ne, 'E') * num(ne, 'Ix')) / num(ne, 'leIn') ** 2, Ney = (Math.PI ** 2 * num(ne, 'E') * num(ne, 'Iy')) / num(ne, 'leOut') ** 2;
      igual(ne.resultado as number, Math.min(Nex, Ney), 'mín(Nex; Ney)');
      const lam = um(ps, 'Compressão (item 5.3)', /^Índice de esbeltez reduzido/);
      igual(num(lam, 'Ne'), Math.min(Nex, Ney, ...(ps.some((p) => p.descricao.startsWith('Carga crítica de flambagem por torção')) ? [um(ps, 'Compressão (item 5.3)', /^Carga crítica de flambagem por torção/).resultado as number] : [])), 'Ne');
      igual(lam.resultado as number, sd.chi, 'χ do relatório');
      const R = um(ps, 'Compressão (item 5.3)', /^Resistências de cálculo à compressão/);
      igual(num(R, 'NcRd'), (num(R, 'chi') * num(R, 'Q') * num(R, 'A') * num(R, 'fy')) / num(R, 'gammaA1'), 'NcRd');
      igual(num(R, 'NtRd'), (num(R, 'A') * num(R, 'fy')) / num(R, 'gammaA1'), 'NtRd');
      igual(num(R, 'NcRd') * 1000, sd.NcRd, 'NcRd do relatório'); igual(num(R, 'NtRd') * 1000, sd.NtRd, 'NtRd do relatório');
      igual(fy, num(R, 'fy'), 'fy');
    });
    it(`Barra B${v.id}: flexão (FLT, FLM, FLA, MRd), cortante e interação refeitos das entradas`, () => {
      const itens = por(ps, /^Flexão \(Anexo G\)/).filter((p) => /^(FLT|FLM|FLA)/.test(p.descricao));
      const mrd = um(ps, /^Flexão \(Anexo G\)/, /^Momento resistente de cálculo/);
      const mpl = um(ps, /^Flexão \(Anexo G\)/, /^Momento de plastificação/);
      igual(num(mpl, 'Mpl'), num(mpl, 'Zx') * num(mpl, 'fy'), 'Mpl');
      for (const p of itens) {
        const lam = num(p, 'lam'), lp = num(p, 'lp'), lr = num(p, 'lr'), Mpl = num(p, 'Mpl');
        if (p.descricao.startsWith('FLT')) {
          const Mr = num(p, 'Mr'), Cb = num(p, 'Cb');
          const Mcr = ((Cb * Math.PI ** 2 * num(p, 'E') * num(p, 'Iy')) / num(p, 'Lb') ** 2) * Math.sqrt((num(p, 'Cw') / num(p, 'Iy')) * (1 + (0.039 * num(p, 'J') * num(p, 'Lb') ** 2) / num(p, 'Cw')));
          igual(num(p, 'Mcr'), Mcr, 'Mcr');
          igual(p.resultado as number, lam <= lp ? Mpl : lam <= lr ? Math.min(Mpl, Cb * (Mpl - ((Mpl - Mr) * (lam - lp)) / (lr - lp))) : Math.min(Mpl, Mcr), 'MRk,FLT');
          igual(lam, num(p, 'Lb') / num(p, 'ry'), 'λ = Lb/ry');
        } else if (p.descricao.startsWith('FLM')) {
          const Mr = num(p, 'Mr');
          igual(p.resultado as number, lam <= lp ? Mpl : lam <= lr ? Mpl - ((Mpl - Mr) * (lam - lp)) / (lr - lp) : (0.69 * num(p, 'E') * num(p, 'Wx')) / lam ** 2, 'MRk,FLM');
        } else igual(p.resultado as number, lam <= lp ? Mpl : Mpl - ((Mpl - num(p, 'fy') * num(p, 'Wx')) * (Math.min(lam, lr) - lp)) / (lr - lp), 'MRk,FLA');
      }
      const caps = [num(mrd, 'Mpl'), num(mrd, 'limite15'), ...Object.entries(mrd.entradas).filter(([k]) => k.startsWith('MRk_')).map(([, v]) => v as number)];
      igual(Math.min(...caps) / num(mrd, 'gammaA1'), num(mrd, 'MRd'), 'MRd = mín/γa1'); igual(num(mrd, 'MRd') * 1000, ck.MRd, 'MRd do relatório');
      const cis = um(ps, /^Cisalhamento/, 'Força cortante resistente de cálculo');
      igual(num(cis, 'VRd') * 1000, ck.VRd, 'VRd do relatório');
      const inter = um(ps, /^Combinações ELU – interação/, 'Equação de interação normal-momento');
      const nr = Math.abs(num(inter, 'NSd')) / num(inter, 'NRd'), eq = nr >= 0.2 ? nr + (8 / 9) * (num(inter, 'MSd') / num(inter, 'MRd')) : nr / 2 + num(inter, 'MSd') / num(inter, 'MRd');
      igual(eq, num(inter, 'interaction'), 'interação'); igual(Math.max(eq, Math.abs(num(inter, 'VSd')) / num(inter, 'VRd')), ck.util, 'util');
      const todos = por(ps, /^Combinações ELU – interação/).filter((p) => p.descricao.includes(': N = '));
      expect(todos.length).toBe(sd.checks.length);
      todos.forEach((p, i) => igual(p.resultado as number, sd.checks[i].util, `util ${i}`));
    });
    it(`Barra B${v.id}: esforços de cálculo por caso`, () => {
      const M = ps.find((p) => p.topico === 'Esforços da combinação determinante' && p.descricao.startsWith('Momento máximo'))!;
      const soma = Object.keys(M.entradas).filter((k) => k.startsWith('f_')).reduce((t, k) => t + num(M, k) * num(M, `S_${k.slice(2)}`), 0);
      igual(soma, M.resultado as number, 'Σ γ·Mk');
      igual(Math.abs(M.resultado as number), Math.abs(sd.check!.MSd) / (sd.check!.B1 || 1), 'Mmáx = MSd/B1', 1e-9);
    });
  }
  it('flambagem local: Qs e Qa do perfil I e do tubo', () => {
    const v = aco.find((x) => x.sectionName === 'I 300')!;
    const ps = doElemento(c, nomeEl(v));
    const mesa = um(ps, 'Flambagem local (Anexo F)', /^Esbeltez da mesa/);
    igual(mesa.resultado as number, 0.2 / 2 / 0.0125, 'b/t');
    const q = um(ps, 'Flambagem local (Anexo F)', 'Fator de redução total');
    igual(q.resultado as number, num(q, 'Qs') * num(q, 'Qa'), 'Q'); igual(q.resultado as number, v.steel!.Q, 'Q do relatório');
    const t = aco.find((x) => x.sectionName === 'Tubo 168')!;
    expect(doElemento(c, nomeEl(t)).some((p) => p.topico === 'Flambagem local (Anexo F)' && p.descricao.startsWith('Esbeltez do tubo'))).toBe(true);
  });
  it('flecha elástica da viga de aço (combinação rara) igual à do relatório', () => {
    const v = aco.find((x) => x.role === 'beam')!;
    const p = um(doElemento(c, nomeEl(v)), 'Flecha (ELS-DEF)', /^Flecha elástica na combinação rara/);
    igual(p.resultado as number, v.deflection!.f, 'f');
  });
});

describe('MD8 · fundações do pórtico (cadeias da MD5)', () => {
  const m = samplePortico();
  m.foundation = sampleFoundation();
  m.foundation.loads[0].kind = 'sapata';
  m.foundation.loads[1].kind = 'estacas';
  const a = analyze(m);
  const r = memoriaPortico(m, a);
  it('sapata isolada: σadm, planta e tensões na base registradas; bloco e estacas registrados', () => {
    const els = new Set(r.memoria.passos.map((p) => p.elemento));
    expect(els.has('Sapata P1')).toBe(true);
    expect(els.has('Bloco sobre estacas P2')).toBe(true);
    const ps = r.memoria.passos.filter((p) => p.elemento === 'Sapata P1');
    expect(ps.length).toBeGreaterThan(40);
    expect(ps.some((p) => p.topico === 'Carga adotada no elemento' && num(p, 'Nk') === 650)).toBe(true);
    expect(r.memoria.passos.filter((p) => p.elemento === 'Bloco sobre estacas P2').some((p) => /Décourt|Rp|Padm/.test(p.descricao + p.formula))).toBe(true);
  });
  it('a memória ligada não muda o relatório do dimensionamento com fundação no modelo', () => expect(r.rep).toEqual(runDesign(m, a)));
  it('tubulão', () => {
    const t = samplePortico();
    t.foundation = normalizeFoundation(sampleFoundation());
    t.foundation.loads[0].kind = 'tubulao';
    const rr = memoriaPortico(t, analyze(t));
    expect(rr.memoria.passos.some((p) => p.elemento === 'Tubulão P1')).toBe(true);
  });
});

describe('MD8 · saídas: HTML, JSON, CSV, dados e ZIP', () => {
  const c = rodar(samplePortico());
  it('HTML com índice por etapa e por elemento, tabelas e marcas de "a confirmar"', () => {
    const h = htmlMemoriaCorpo(c.mem, { data: '25/10/2026' });
    expect(h).toContain('data-memoria-detalhada');
    expect(h).toContain('Pilar B1'); expect(h).toContain('Viga B2'); expect(h).toContain('Estabilidade global (γz)');
    expect(h).toContain(`${c.mem.passos.length} passos registrados`);
    expect(indiceMemoria(c.mem).map((e) => e.id)).toEqual(expect.arrayContaining(['cargas', 'combinacoes', 'analise', 'esforcos', 'dimensionamento', 'detalhamento']));
  });
  it('JSON e CSV da memória: um passo por linha e as entradas exatas', () => {
    const j = JSON.parse(JSON.stringify(c.mem));
    expect(j.passos.length).toBe(c.mem.passos.length);
    const csv = csvMemoria(c.mem).trim().split('\n');
    expect(csv.length).toBeGreaterThan(c.mem.passos.length);
    expect(csv[0].startsWith('id;etapa;elemento')).toBe(true);
  });
  it('tabelas da análise: nós, barras, combinações, deslocamentos, reações e esforços coerentes com o solver', () => {
    const ts = tabelasPortico(c.m, c.a, c.rep), T = (n: string) => ts.find((t) => t.nome === n)!;
    for (const n of ['nos', 'materiais', 'secoes', 'barras', 'casos', 'cargas', 'combinacoes', 'deslocamentos', 'reacoes', 'esforcos_casos', 'deslocamentos_combinacoes', 'reacoes_combinacoes', 'esforcos_combinacoes', 'gamaz', 'desaprumo']) expect(T(n), n).toBeTruthy();
    expect(T('nos').linhas.length).toBe(c.m.nodes.length);
    expect(T('barras').linhas.length).toBe(c.m.members.length);
    // deslocamentos do primeiro caso = solver
    const cs = c.m.cases[0], r = c.a.cases.get(cs.id)!;
    c.m.nodes.forEach((n, k) => { const l = T('deslocamentos').linhas.find((q) => q[0] === cs.name && q[1] === n.id)!; igual(l[3] as number, r.u[k * 3 + 1], 'uy'); });
    // esforços na estação x = 0 = esforço de extremidade (N = −f[0], V = f[1])
    const pm = c.a.prep.members[0], l0 = T('esforcos_casos').linhas.find((q) => q[0] === cs.name && q[1] === pm.id && q[2] === 0)!;
    igual(l0[3] as number, -r.members[0].f[0], 'N(0)');
    // combinações: fatores iguais aos do relatório
    const combs = combinacoesPortico(c.m, c.a, c.rep);
    for (const cb of combs.filter((x) => x.tipo === 'ELU')) for (const [id, f] of Object.entries(cb.fatores)) igual(T('combinacoes').linhas.find((q) => q[0] === cb.nome && q[2] === +id)![4] as number, f, 'fator');
    // esforços por combinação ELU: soma ponderada dos casos (sem desaprumo/P-Δ) na estação do meio
    const ref = c.rep.elu.findIndex((x) => !x.desap && !x.windAmp);
    if (ref >= 0) {
      const cb = c.rep.elu[ref], k = 1, pmk = c.a.prep.members[k], xm = (pmk.L * 10) / 20;
      const linha = T('esforcos_combinacoes').linhas.find((q) => q[0] === cb.name && q[1] === pmk.id && Math.abs((q[2] as number) - xm) < 1e-12)!;
      const soma = Object.entries(cb.factors).reduce((t, [id, f]) => t + f * (T('esforcos_casos').linhas.find((q) => q[0] === c.m.cases.find((x) => x.id === +id)!.name && q[1] === pmk.id && Math.abs((q[2] as number) - xm) < 1e-12)![5] as number), 0);
      igual(linha[5] as number, soma, 'M da combinação = Σ f·M dos casos');
    }
    const csv = csvTabela(T('barras')); expect(csv.split('\n')[0]).toContain('barra;ni;nj;L');
    const js = JSON.parse(jsonTabelas(ts, { obra: 'x' }));
    expect(Object.keys(js.tabelas)).toContain('esforcos_combinacoes');
    const z = zipDados(ts, [{ nome: 'memoria/memoria.csv', texto: csvMemoria(c.mem) }]);
    expect(z.length).toBeGreaterThan(1000);
    expect(new TextDecoder().decode(z)).toContain('analise/deslocamentos.csv');
  });
});

describe('MD8 · OpenSees do pórtico 2D', () => {
  it('o script traz modelo, casos e avisos', () => {
    const m = samplePortico(), a = analyze(m);
    const sc = scriptOpenSeesPortico(m, a);
    expect(sc.script).toContain('import openseespy.opensees as ops');
    expect(sc.script).toContain('"-ndm", 2, "-ndf", 3');
    expect(sc.casos).toEqual(['Permanente', 'Sobrecarga', 'Vento']);
    expect(sc.script).toContain('CASOS = {');
    expect(sc.completo).toBe(true);
  });
  it('apoio inclinado vira aviso', () => {
    const m = vigaBiapoiada(); m.nodes[1].support = { ux: 'free', uy: 'fixed', rz: 'free', angle: 30 };
    const sc = scriptOpenSeesPortico(m, analyze(m));
    expect(sc.completo).toBe(false);
    expect(sc.avisos[0]).toContain('apoio inclinado');
  });
  it('com o openseespy, deslocamentos e reações iguais aos do solver (rótula, mola de ligação, mola de apoio, carga trapezoidal, temperatura, recalque, cortante e rigidez axial)', async () => {
    const CP = 'node:child_process', FS = 'node:fs', OS = 'node:os', PATH = 'node:path';
    const cp = (await import(/* @vite-ignore */ CP)) as { execFileSync: (c: string, a: string[], o?: object) => unknown };
    try { cp.execFileSync('python3', ['-c', 'import openseespy.opensees'], { stdio: 'ignore' }); } catch { return; }
    const fs = (await import(/* @vite-ignore */ FS)) as { mkdtempSync: (p: string) => string; writeFileSync: (p: string, d: string) => void; readFileSync: (p: string, e: string) => string };
    const os = (await import(/* @vite-ignore */ OS)) as { tmpdir: () => string };
    const path = (await import(/* @vite-ignore */ PATH)) as { join: (...p: string[]) => string };
    // pórtico de dois pavimentos com rótula, mola de ligação, apoio elástico, carga trapezoidal, momento de extremidade, temperatura e recalque
    const m = emptyModel();
    m.name = 'Verificação OpenSees';
    m.options = { shearDeformation: true, axialDeformation: true };
    m.sections = [{ id: 1, name: 'Pilar 30x40', shape: { kind: 'rect', b: 0.3, h: 0.4 } }, { id: 2, name: 'Viga 20x50', shape: { kind: 'rect', b: 0.2, h: 0.5 } }];
    addMember(m, 0, 0, 0, 3.2, 1, 1); addMember(m, 5, 0, 5, 3.2, 1, 1); addMember(m, 0, 3.2, 0, 6.4, 1, 1); addMember(m, 5, 3.2, 5, 6.4, 1, 1);
    addMember(m, 0, 3.2, 5, 3.2, 1, 2); addMember(m, 0, 6.4, 5, 6.4, 1, 2);
    sup(m, 0, 0, FIX); sup(m, 5, 0, { ux: 'spring', uy: 'fixed', rz: 'spring', kx: 40000, kr: 15000 });
    m.members[4].hingeJ = true;
    m.members[5].springI = 25000;
    m.members[2].rigid = 'axial';
    m.cases = [{ id: 1, name: 'Permanente', nature: 'G' }, { id: 2, name: 'Sobrecarga', nature: 'Q' }, { id: 3, name: 'Efeitos', nature: 'Q' }];
    const n6 = m.nodes.find((n) => n.x === 5 && n.y === 6.4)!.id;
    m.loads = [
      { kind: 'selfWeight', id: 1, caseId: 1, factor: 1 },
      { kind: 'dist', id: 2, caseId: 1, member: m.members[4].id, system: 'global', qxi: 0, qyi: -12, qxj: 0, qyj: -12 },
      { kind: 'dist', id: 3, caseId: 2, member: m.members[5].id, system: 'global', qxi: 0, qyi: -4, qxj: 0, qyj: -18 },
      { kind: 'dist', id: 4, caseId: 2, member: m.members[0].id, system: 'local', qxi: 0, qyi: 5, qxj: 0, qyj: 5 },
      { kind: 'nodal', id: 5, caseId: 2, node: n6, fx: 20, fy: -10, mz: 5 },
      { kind: 'endMoment', id: 6, caseId: 3, member: m.members[4].id, mi: 8, mj: -3 },
      { kind: 'thermal', id: 7, caseId: 3, member: m.members[5].id, tTop: 20, tBot: 5 },
      { kind: 'presc', id: 8, caseId: 3, node: m.nodes.find((n) => n.x === 0 && n.y === 0)!.id, dx: 0.002, dy: -0.004, rz: 0.001 },
    ];
    const a = analyze(m);
    expect(a.prep.error).toBeUndefined();
    const sc = scriptOpenSeesPortico(m, a);
    expect(sc.avisos).toEqual([]);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'statikos-os2d-'));
    fs.writeFileSync(path.join(dir, 'portico2d.py'), sc.script);
    cp.execFileSync('python3', [path.join(dir, 'portico2d.py')], { stdio: 'ignore', timeout: 120000 });
    const out = JSON.parse(fs.readFileSync(path.join(dir, 'resultados_opensees.json'), 'utf8')) as { casos: Record<string, { desloc: Record<string, number[]>; reacoes: Record<string, number[]> }> };
    for (const cs of m.cases) {
      const r = a.cases.get(cs.id)!, o = out.casos[cs.name];
      let umax = 0;
      for (const v of r.u) umax = Math.max(umax, Math.abs(v));
      m.nodes.forEach((n, k) => { for (let g = 0; g < 3; g++) expect(Math.abs(o.desloc[String(n.id)][g] - r.u[k * 3 + g]), `${cs.name} nó ${n.id} gdl ${g}`).toBeLessThan(1e-6 * Math.max(umax, 1e-3) + 1e-12); });
      let rmax = 0;
      r.reactions.forEach((v) => { for (const q of v) rmax = Math.max(rmax, Math.abs(q)); });
      m.nodes.forEach((n, k) => {
        const s = n.support, rr = r.reactions.get(k);
        if (!s || !rr) return;
        const fix = [s.ux === 'fixed', s.uy === 'fixed', s.rz === 'fixed'];
        for (let g = 0; g < 3; g++) if (fix[g]) expect(Math.abs(o.reacoes[String(n.id)][g] - rr[g]), `${cs.name} reação nó ${n.id} gdl ${g}`).toBeLessThan(1e-6 * Math.max(rmax, 1) + 1e-9);
      });
    }
  });
});
