// Memória de cálculo detalhada (MD fase 1): registrador opt-in, valores registrados iguais aos do dimensionamento
// (conta refeita a partir dos números registrados, erro relativo ≤ 1e-9), resultados inalterados com a memória ligada,
// HTML/CSV, exportação dos dados da análise e script OpenSees (rodado e comparado quando o openseespy existe).
import { beforeAll, describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio, type AnaliseEdificio } from '../building/analitico';
import { dimensionarEdificio, type Dimensionamento } from '../building/dimensionamento';
import { combinacoesDoEstado, combinacoesEdificio } from '../building/combinacoes';
import type { BuildingModel } from '../building/types';
import { resolver3 } from '../fe3d';
import { Registrador, comMemoria, fm, memoriaAtiva, type PassoMemoria } from './registrador';
import { csvMemoria, memoriaDetalhada, type MemoriaDetalhada } from './edificio';
import { htmlMemoriaCorpo } from './html';
import { csvTabela, jsonTabelas, tabelasAnalise, zipDados } from './dadosAnalise';
import { modeloDoCaso, modeloExportavel, scriptOpenSees } from './opensees';
import { ServidorMcp } from '../../cli/mcp';

function predio(): BuildingModel {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  s.executar('lote', { comandos: [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } });
  s.executar('lote', { comandos: [v([[0, 0], [6, 0]]), v([[0, 5], [6, 5]]), v([[0, 0], [0, 5]]), v([[6, 0], [6, 5]])] });
  s.executar('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  return s.modelo;
}

const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1e-12, Math.abs(b));

let b: BuildingModel, an: AnaliseEdificio, dim: Dimensionamento, mem: MemoriaDetalhada, dimMem: Dimensionamento;
beforeAll(() => {
  b = predio();
  an = analisarEdificio(b);
  dim = dimensionarEdificio(b, an, { fundacao: false });
  const r = memoriaDetalhada(b, { an });
  mem = r.memoria; dimMem = r.dim;
}, 120000);

const passos = (el: string, topico?: string) => mem.passos.filter((p) => p.elemento === el && (!topico || p.topico === topico));
const achar = (el: string, desc: string, topico?: string): PassoMemoria => { const p = passos(el, topico).find((x) => x.descricao.startsWith(desc)); if (!p) throw new Error(`passo ${el} / ${desc}`); return p; };
const num = (p: PassoMemoria, k: string) => p.entradas[k] as number;

describe('registrador', () => {
  it('desligado por padrão; comMemoria liga só durante a função e restaura mesmo com erro', () => {
    expect(memoriaAtiva()).toBeNull();
    const r = new Registrador();
    comMemoria(r, () => { expect(memoriaAtiva()).toBe(r); r.passo({ etapa: 'cargas', elemento: 'X', topico: 't', descricao: 'd', formula: 'f', expressao: 'e', resultado: 2, unidade: '', entradas: {} }); });
    expect(memoriaAtiva()).toBeNull();
    expect(() => comMemoria(r, () => { throw new Error('x'); })).toThrow();
    expect(memoriaAtiva()).toBeNull();
    expect(r.passos).toHaveLength(1);
    expect(r.passos[0].id).toBe('P0001');
    const f = new Registrador({ filtro: (e) => e === 'A' });
    f.passo({ etapa: 'cargas', elemento: 'B', topico: 't', descricao: 'd', formula: 'f', expressao: 'e', resultado: 1, unidade: '', entradas: {} });
    expect(f.passos).toHaveLength(0);
  });
  it('formatação com vírgula e algarismos significativos', () => {
    expect(fm(21.428571)).toBe('21,43');
    expect(fm(-0.000123456)).toBe('−0,0001235');
    expect(fm(0)).toBe('0');
    expect(fm(26838.405)).toBe('26838');
  });
});

describe('memória do edifício', () => {
  it('dimensionamento idêntico com a memória ligada (vigas, pilares, lajes, detalhes)', () => {
    expect(dimMem.vigas).toEqual(dim.vigas);
    expect(dimMem.pilares).toEqual(dim.pilares);
    expect(dimMem.lajes).toEqual(dim.lajes);
    expect(dimMem.detalhes).toEqual(dim.detalhes);
    expect(memoriaAtiva()).toBeNull();
  });

  it('etapas e elementos: cargas, combinações, análise, esforços, dimensionamento e detalhamento', () => {
    const etapas = new Set(mem.passos.map((p) => p.etapa));
    for (const e of ['cargas', 'combinacoes', 'analise', 'esforcos', 'dimensionamento', 'detalhamento']) expect(etapas.has(e as never)).toBe(true);
    expect(mem.elementos).toContain('Viga V1');
    expect(mem.elementos.filter((e) => e.startsWith('Pilar ')).length).toBe(dim.pilares.length);
    for (const p of mem.passos) { expect(p.formula.length).toBeGreaterThan(0); expect(p.expressao.length).toBeGreaterThan(0); }
    // combinações ELU registradas com os mesmos coeficientes
    const elu = combinacoesDoEstado(b, an, 'concreto', combinacoesEdificio(b, an));
    for (const c of elu) { const p = mem.passos.find((x) => x.etapa === 'combinacoes' && x.descricao === c.nome)!; expect(p.entradas).toEqual(c.fatores); }
  });

  it('viga: refeita a partir dos números registrados, bate com o dimensionamento a 1e-9', () => {
    for (const r of dim.vigas) {
      const el = `Viga ${r.nome}`;
      // esforço determinante: Σ γ·Mk (+ redistribuição) = Mpos
      const ms = passos(el, 'Envoltória ELU').filter((p) => p.descricao.startsWith('Momento positivo'));
      const ult = ms.at(-1)!;
      if (ms.length === 1) {
        const parc = Object.keys(ult.entradas).filter((k) => k.startsWith('γ_')).map((k) => k.slice(2));
        const s = parc.reduce((t, n) => t + num(ult, `γ_${n}`) * num(ult, `Mk_${n}`), 0);
        expect(rel(s, r.Mpos)).toBeLessThan(1e-9);
      } else expect(rel(num(ult, 'Md') + num(ult, 'dA') * (1 - num(ult, 't')) + num(ult, 'dZ') * num(ult, 't'), r.Mpos)).toBeLessThan(1e-9);
      expect(rel(ult.resultado as number, r.Mpos)).toBeLessThan(1e-12);
      // flexão: As = σcd·b·λ·x/fyd; As,calc = máx(As; As,mín) = AsNec[0] (sem torção) ou ≤ AsNec[0]
      const t = 'Flexão – armadura inferior', ln = achar(el, 'Linha neutra', t), C = achar(el, 'Resultante de compressão', t), As = achar(el, 'Armadura de tração', t);
      const Crec = num(ln, 'sigmaCd') * num(ln, 'b') * num(ln, 'lambda') * (ln.resultado as number);
      expect(rel(Crec, C.resultado as number)).toBeLessThan(1e-9);
      expect(rel(num(As, 'C') / num(As, 'fyd'), As.resultado as number)).toBeLessThan(1e-9);
      // equilíbrio: Md = C·(d − λx/2)
      expect(rel(Crec * (num(ln, 'd') - (num(ln, 'lambda') * (ln.resultado as number)) / 2) * 1000, num(ln, 'Md'))).toBeLessThan(1e-9);
      const mn = achar(el, 'Armadura mínima', t), calc = achar(el, 'Armadura de cálculo', t);
      expect(rel(Math.max(As.resultado as number, mn.resultado as number), calc.resultado as number)).toBeLessThan(1e-9);
      if (!r.T) expect(rel(calc.resultado as number, r.AsNec[0])).toBeLessThan(1e-9);
      // cortante
      const tc = 'Cortante (modelo de cálculo I, θ = 45°)', vr = achar(el, 'Resistência da biela', tc), vc = achar(el, 'Parcela do concreto', tc);
      expect(rel(0.27 * num(vr, 'av2') * num(vr, 'fcd') * num(vr, 'bw') * num(vr, 'd') * 1000, vr.resultado as number)).toBeLessThan(1e-9);
      expect(rel(0.6 * num(vc, 'fctd') * num(vc, 'bw') * num(vc, 'd') * 1000, vc.resultado as number)).toBeLessThan(1e-9);
      expect(rel(achar(el, 'Verificação da biela', tc).entradas.VSd as number, r.V)).toBeLessThan(1e-12);
      const mnw = achar(el, 'Armadura transversal mínima', tc);
      expect(rel(0.2 * (num(mnw, 'fctm') / num(mnw, 'fywk')) * num(mnw, 'bw'), mnw.resultado as number)).toBeLessThan(1e-9);
      expect(rel(achar(el, 'Decalagem', tc).resultado as number, r.al)).toBeLessThan(1e-12);
      // fissuração: wk = mín(w1; w2) com as fórmulas da 17.3.3.2 = wk do dimensionamento
      const tf = 'Fissuração – face inferior', w1 = achar(el, 'Abertura w1', tf), w2 = achar(el, 'Abertura w2', tf);
      const k1 = (num(w1, 'phi') / (12.5 * num(w1, 'eta1'))) * (num(w1, 'sigmaS') / num(w1, 'Es'));
      expect(rel(k1 * ((3 * num(w1, 'sigmaS')) / num(w1, 'fctm')), w1.resultado as number)).toBeLessThan(1e-9);
      expect(rel(k1 * (4 / num(w2, 'rhoR') + 45), w2.resultado as number)).toBeLessThan(1e-9);
      expect(rel(Math.min(w1.resultado as number, w2.resultado as number), r.wk[0])).toBeLessThan(1e-9);
      // flecha: αf = Δξ/(1 + 50ρ′); f∞ = (fG + fψ2Q)·(1 + αf) = flecha
      const tl = 'Flecha (ELS-DEF)', af = achar(el, 'Coeficiente de fluência', tl), ft = achar(el, 'Flecha total', tl);
      expect(rel(num(af, 'dxi') / (1 + 50 * num(af, 'rho')), af.resultado as number)).toBeLessThan(1e-9);
      if (ft.descricao.includes('etapas')) {
        const fd = achar(el, 'Flecha diferida', tl), et = passos(el, tl).filter((p) => p.descricao.startsWith('Etapa '));
        const soma = et.reduce((t, p) => t + num(p, 'carga') * num(p, 'dXi'), 0);
        expect(rel(soma, num(fd, 'soma'))).toBeLessThan(1e-9);
        expect(rel(num(ft, 'fi') + soma / (1 + 50 * num(fd, 'rho')), r.flecha)).toBeLessThan(1e-9);
      } else expect(rel((num(ft, 'dG') + num(ft, 'dQqp')) * (1 + num(ft, 'afR')), r.flecha)).toBeLessThan(1e-9);
      // ancoragem: lb = máx(φ/4·fyd/fbd; 25φ) = lb do detalhamento
      const lb = achar(el, 'Comprimento de ancoragem básico', 'Ancoragem – armadura inferior');
      const det = dim.detalhes!.find((x) => x.viga === r.viga)!;
      expect(rel(Math.max((num(lb, 'phi') / 1000 / 4) * (num(lb, 'fyd') / num(lb, 'fbd')), 25 * (num(lb, 'phi') / 1000)), det.lb.inf)).toBeLessThan(1e-9);
    }
  });

  it('pilar: refeito a partir dos números registrados, bate com o dimensionamento a 1e-9', () => {
    for (const r of dim.pilares.filter((x) => x.status !== 'fail' || x.util < 99)) {
      const el = `Pilar ${r.nome} · ${r.pavimento}`;
      const nd = achar(el, 'Normal de cálculo');
      const parc = Object.keys(nd.entradas).filter((k) => k.startsWith('γ_')).map((k) => k.slice(2));
      const N = num(nd, 'gn') * parc.reduce((t, n) => t + num(nd, `γ_${n}`) * num(nd, `Nk_${n}`), 0);
      expect(rel(N, nd.resultado as number)).toBeLessThan(1e-9);
      const det = r.determinantes!.find((x) => x.combinacao === nd.entradas.combinacao)!;
      expect(Math.abs((nd.resultado as number) - det.Nd)).toBeLessThanOrEqual(0.005 + 1e-9);
      for (const dir of ['u', 'v'] as const) {
        const t = `2ª ordem local – direção ${dir}`;
        const mm = achar(el, 'Momento mínimo de 1ª ordem', t);
        expect(rel(num(mm, 'Nd') * (0.015 + 0.03 * num(mm, 'h')), mm.resultado as number)).toBeLessThan(1e-9);
        const nu = achar(el, 'Força normal adimensional', t);
        expect(rel(num(nu, 'Nd') / 1000 / (num(nu, 'Ac') * num(nu, 'fcd')), nu.resultado as number)).toBeLessThan(1e-9);
        const m2 = passos(el, t).find((p) => p.descricao.startsWith('Momento de 2ª ordem'));
        if (m2) expect(rel((num(m2, 'Nd') * num(m2, 'le') ** 2 / 10) * num(m2, 'curv'), m2.resultado as number)).toBeLessThan(1e-9);
        const tot = achar(el, 'Momento total', t);
        if (!tot.descricao.includes('método geral')) expect(rel(Math.max(num(tot, 'ab') * num(tot, 'M1') + num(tot, 'M2'), num(tot, 'M1')), tot.resultado as number)).toBeLessThan(1e-9);
        expect(Math.abs((tot.resultado as number) - (dir === 'u' ? det.MuTot : det.MvTot))).toBeLessThanOrEqual(0.005 + 1e-9);
      }
      // flexão oblíqua: util = √(mu² + mv²)/1000/MRd; o maior das verificações é a utilização do dimensionamento
      const ch = passos(el, 'Flexão composta oblíqua').filter((p) => p.entradas.MRd !== undefined);
      for (const p of ch) expect(rel(Math.hypot(num(p, 'mu'), num(p, 'mv')) / 1000 / num(p, 'MRd'), p.resultado as number)).toBeLessThan(1e-9);
      expect(rel(Math.max(...ch.map((p) => p.resultado as number)), r.util)).toBeLessThan(1e-9);
      // armadura: As = n·π·φ²/4 = As do dimensionamento; As,mín pela fórmula
      const as = achar(el, 'Armadura adotada', 'Armadura longitudinal');
      expect(rel((num(as, 'n') * Math.PI * (num(as, 'phi') / 1000) ** 2) / 4, r.As)).toBeLessThan(1e-9);
      const mn = achar(el, 'Armadura mínima', 'Armadura longitudinal');
      expect(rel(Math.max((0.15 * num(mn, 'Nd')) / 1000 / num(mn, 'fyd'), (num(mn, 'taxa') / 100) * num(mn, 'Ac')), mn.resultado as number)).toBeLessThan(1e-9);
      // esbeltez
      const lu = achar(el, 'Índice de esbeltez na direção u');
      expect(rel(num(lu, 'le') / num(lu, 'i'), r.lambda[0])).toBeLessThan(1e-9);
    }
  });

  it('filtro por elemento: só os passos globais e os do elemento pedido', () => {
    const r = memoriaDetalhada(b, { an, elementos: ['Viga V2'] });
    expect(new Set(r.memoria.passos.map((p) => p.elemento))).toEqual(new Set(['Edifício', 'Viga V2']));
  });

  it('HTML com índice por etapa e por elemento; CSV com um passo por linha', () => {
    const h = htmlMemoriaCorpo(mem, { data: '24/10/2026' });
    expect(h).toContain('class="memo"');
    expect(h).toContain('Índice');
    expect(h).toContain('Por elemento');
    expect(h).toContain('href="#md-dimensionamento-viga-v1"');
    expect(h).toContain('id="md-dimensionamento-viga-v1"');
    expect((h.match(/data-passo=/g) ?? []).length).toBe(mem.passos.length);
    expect(h).not.toMatch(/<script/i);
    const csv = csvMemoria(mem);
    expect(csv.trim().split('\n').length).toBe(mem.passos.length + 1);
  });
});

describe('exportação dos dados da análise', () => {
  it('tabelas de nós, barras, seções, materiais, apoios, cargas, combinações, deslocamentos, reações e esforços', () => {
    const combs = combinacoesEdificio(b, an);
    const ts = tabelasAnalise(b, an, combs), nome = (n: string) => ts.find((t) => t.nome === n)!;
    for (const n of ['nos', 'barras', 'secoes', 'materiais', 'apoios', 'molas', 'diafragma', 'cargas', 'combinacoes', 'deslocamentos', 'reacoes', 'esforcos_casos', 'esforcos_combinacoes', 'deslocamentos_combinacoes', 'reacoes_combinacoes']) expect(nome(n), n).toBeDefined();
    expect(nome('nos').linhas.length).toBe(an.portico.modelo.nos.length);
    expect(nome('barras').linhas.length).toBe(an.portico.modelo.barras.length);
    expect(nome('esforcos_combinacoes').linhas.length).toBe(2 * an.portico.modelo.barras.length * combs.length);
    // reação vertical de uma combinação = Σ fator·reação do caso
    const c = combs.find((x) => x.tipo === 'ELU')!, no = [...an.portico.modelo.apoios.keys()][0];
    const lin = nome('reacoes_combinacoes').linhas.find((l) => l[0] === c.nome && l[1] === no)!;
    const ic = (k: string) => an.casos.indexOf(k);
    let esp = 0;
    for (const [k, f] of Object.entries(c.fatores)) { if (ic(k) >= 0) esp += f * an.portico.res!.reacoes[ic(k)].get(no)![2]; else { const iw = (an.vento?.casos ?? []).findIndex((w) => w.nome === k); if (iw >= 0) esp += f * an.portico.resVento!.reacoes[iw].get(no)![2]; } }
    expect(rel(lin[4] as number, esp)).toBeLessThan(1e-12);
    // CSV com números completos e JSON legível; ZIP com um arquivo por tabela
    const csv = csvTabela(nome('nos'));
    expect(csv.split('\n')[0]).toBe('no;x;y;z');
    const js = JSON.parse(jsonTabelas(ts));
    expect(js.tabelas.nos.linhas[0]).toHaveProperty('x');
    const z = zipDados(ts, [{ nome: 'memoria.csv', texto: 'a' }]);
    expect(z[0]).toBe(0x50); expect(z[1]).toBe(0x4b);
  });
});

describe('exportação para o OpenSees', () => {
  it('script do pórtico (modelo cheio quando integrado) e, com o openseespy, deslocamentos e reações iguais aos do Statikos', async () => {
    const me = modeloExportavel(b, an);
    const sc = scriptOpenSees(me, { casos: ['G', 'Q'] });
    expect(sc.script).toContain('import openseespy.opensees as ops');
    expect(sc.script).toContain('rigidDiaphragm');
    expect(sc.script).toContain('-jntOffset');
    expect(sc.casos).toEqual(['G', 'Q']);
    expect(sc.completo).toBe(true);
    const r = resolver3(me.modelo, me.casos.slice(0, 2).map((c) => c.caso!));
    expect(r.erro).toBeUndefined();
    // nos nós dos pilares, o modelo exportado dá o mesmo do pórtico condensado do Statikos
    const pm = an.portico, nosPil = new Set<number>();
    pm.barras.forEach((t, i) => { if (t.tipo === 'pilar') { nosPil.add(pm.modelo.barras[i].i); nosPil.add(pm.modelo.barras[i].j); } });
    let e = 0, mx = 0;
    for (const n of nosPil) for (let g = 0; g < 6; g++) { e = Math.max(e, Math.abs(r.desloc[0][n * 6 + g] - pm.res!.desloc[0][n * 6 + g])); mx = Math.max(mx, Math.abs(pm.res!.desloc[0][n * 6 + g])); }
    expect(e / mx).toBeLessThan(1e-8);
    // OpenSees (opcional: só roda se o python3 tiver o openseespy)
    const CP = 'node:child_process', FS = 'node:fs', OS = 'node:os', PATH = 'node:path';
    const cp = (await import(/* @vite-ignore */ CP)) as { execFileSync: (c: string, a: string[], o?: object) => unknown };
    try { cp.execFileSync('python3', ['-c', 'import openseespy.opensees'], { stdio: 'ignore' }); } catch { return; }
    const fs = (await import(/* @vite-ignore */ FS)) as { mkdtempSync: (p: string) => string; writeFileSync: (p: string, d: string) => void; readFileSync: (p: string, e: string) => string };
    const os = (await import(/* @vite-ignore */ OS)) as { tmpdir: () => string };
    const path = (await import(/* @vite-ignore */ PATH)) as { join: (...p: string[]) => string };
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'statikos-os-'));
    fs.writeFileSync(path.join(dir, 'portico.py'), sc.script);
    cp.execFileSync('python3', [path.join(dir, 'portico.py')], { stdio: 'ignore', timeout: 120000 });
    const R = JSON.parse(fs.readFileSync(path.join(dir, 'resultados_opensees.json'), 'utf8')) as { casos: Record<string, { desloc: number[][]; reacoes: Record<string, number[]> }> };
    console.log(`OpenSees: script com ${sc.script.length} caracteres resolvido (${Object.keys(R.casos).join(', ')})`);
    for (const [ic, nome] of [[0, 'G'], [1, 'Q']] as const) {
      const u = r.desloc[ic], d = R.casos[nome].desloc;
      let err = 0, umx = 0;
      d.forEach((x, n) => { for (let g = 0; g < 6; g++) { err = Math.max(err, Math.abs(u[n * 6 + g] - x[g])); umx = Math.max(umx, Math.abs(x[g])); } });
      expect(err / umx, `desloc ${nome}`).toBeLessThan(1e-6);
      let er = 0, rmx = 0;
      for (const [no, f] of r.reacoes[ic]) { const o = R.casos[nome].reacoes[String(no)]; for (let g = 0; g < 6; g++) { er = Math.max(er, Math.abs(f[g] - o[g])); rmx = Math.max(rmx, Math.abs(o[g])); } }
      expect(er / rmx, `reações ${nome}`).toBeLessThan(1e-6);
    }
  }, 180000);
});

describe('vento no OpenSees (MD9)', () => {
  const NW = ['W0°', 'W90°+e', 'W180°−e'];
  it('os casos de vento entram no script do modelo integrado; o modelo exportado dá os deslocamentos do pórtico condensado e, com o openseespy, deslocamentos e reações iguais', async () => {
    const me = modeloExportavel(b, an);
    for (const w of NW) expect(me.casos.map((c) => c.nome)).toContain(w);
    const sc = scriptOpenSees(me, { casos: NW });
    expect(sc.casos).toEqual(NW);
    expect(sc.script).toContain('"W0°"');
    expect(sc.completo).toBe(true);
    const idx = NW.map((w) => me.casos.findIndex((c) => c.nome === w));
    // o vento usa a área real dos pilares (as cargas verticais, A × EA dos pilares das opções): `modeloDoCaso` aplica o fator do caso
    expect(an.opcoes.axialPilares).toBeGreaterThan(1);
    expect(me.casos.find((c) => c.nome === 'W0°')!.escA).toBe(1 / an.opcoes.axialPilares);
    const rs = NW.map((w, k) => resolver3(modeloDoCaso(me, w), [me.casos[idx[k]].caso!]));
    for (const x of rs) expect(x.erro).toBeUndefined();
    const r = { desloc: rs.map((x) => x.desloc[0]), reacoes: rs.map((x) => x.reacoes[0]) };
    // nos nós dos pilares, o modelo exportado dá o mesmo do pórtico condensado (vento)
    const pm = an.portico, nosPil = new Set<number>();
    pm.barras.forEach((t, i) => { if (t.tipo === 'pilar') { nosPil.add(pm.modelo.barras[i].i); nosPil.add(pm.modelo.barras[i].j); } });
    NW.forEach((w, k) => {
      const iw = (an.vento?.casos ?? []).findIndex((c) => c.nome === w), ref = pm.resVento!.desloc[iw];
      let e = 0, mx = 0;
      for (const n of nosPil) for (let g = 0; g < 6; g++) { e = Math.max(e, Math.abs(r.desloc[k][n * 6 + g] - ref[n * 6 + g])); mx = Math.max(mx, Math.abs(ref[n * 6 + g])); }
      expect(mx).toBeGreaterThan(0);
      expect(e / mx, `vento ${w}`).toBeLessThan(1e-8);
    });
    const CP = 'node:child_process', FS = 'node:fs', OS = 'node:os', PATH = 'node:path';
    const cp = (await import(/* @vite-ignore */ CP)) as { execFileSync: (c: string, a: string[], o?: object) => unknown };
    try { cp.execFileSync('python3', ['-c', 'import openseespy.opensees'], { stdio: 'ignore' }); } catch { return; }
    const fs = (await import(/* @vite-ignore */ FS)) as { mkdtempSync: (p: string) => string; writeFileSync: (p: string, d: string) => void; readFileSync: (p: string, e: string) => string };
    const os = (await import(/* @vite-ignore */ OS)) as { tmpdir: () => string };
    const path = (await import(/* @vite-ignore */ PATH)) as { join: (...p: string[]) => string };
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'statikos-os-w-'));
    fs.writeFileSync(path.join(dir, 'portico.py'), sc.script);
    cp.execFileSync('python3', [path.join(dir, 'portico.py')], { stdio: 'ignore', timeout: 120000 });
    const R = JSON.parse(fs.readFileSync(path.join(dir, 'resultados_opensees.json'), 'utf8')) as { casos: Record<string, { desloc: number[][]; reacoes: Record<string, number[]> }> };
    NW.forEach((nome, k) => {
      const u = r.desloc[k], d = R.casos[nome].desloc;
      let err = 0, umx = 0;
      d.forEach((x, n) => { for (let g = 0; g < 6; g++) { err = Math.max(err, Math.abs(u[n * 6 + g] - x[g])); umx = Math.max(umx, Math.abs(x[g])); } });
      expect(err / umx, `desloc ${nome}`).toBeLessThan(1e-6);
      let er = 0, rmx = 0;
      for (const [no, f] of r.reacoes[k]) { const o = R.casos[nome].reacoes[String(no)]; for (let g = 0; g < 6; g++) { er = Math.max(er, Math.abs(f[g] - o[g])); rmx = Math.max(rmx, Math.abs(o[g])); } }
      expect(er / rmx, `reações ${nome}`).toBeLessThan(1e-6);
      // reações do OpenSees no vento = reações do pórtico condensado do Statikos nos apoios dos pilares
      const iw = (an.vento?.casos ?? []).findIndex((c) => c.nome === nome);
      let ec = 0, rc = 0;
      for (const [no, f] of pm.resVento!.reacoes[iw]) { const o = R.casos[nome].reacoes[String(no)]; if (!o) continue; for (let g = 0; g < 6; g++) { ec = Math.max(ec, Math.abs(f[g] - o[g])); rc = Math.max(rc, Math.abs(o[g])); } }
      expect(ec / rc, `reações do condensado ${nome}`).toBeLessThan(1e-6);
    });
    console.log(`OpenSees (vento): ${NW.join(', ')} conferidos contra o Statikos`);
  }, 240000);
});

describe('desaprumo no OpenSees (modelo integrado)', () => {
  it('os casos de desaprumo entram no script do modelo integrado e, com o openseespy, deslocamentos e reações iguais aos do Statikos', async () => {
    const ND = (an.desaprumo?.casos ?? []).map((c) => c.nome).filter((_, i) => i % 3 === 0).slice(0, 4);
    expect(ND.length).toBeGreaterThan(1);
    const me = modeloExportavel(b, an);
    for (const d of ND) expect(me.casos.map((c) => c.nome)).toContain(d);
    const sc = scriptOpenSees(me, { casos: ND });
    expect(sc.casos).toEqual(ND);
    expect(sc.completo).toBe(true);
    const rs = ND.map((d) => resolver3(modeloDoCaso(me, d), [me.casos.find((c) => c.nome === d)!.caso!]));
    for (const x of rs) expect(x.erro).toBeUndefined();
    const pm = an.portico, nomesH = (an.vento?.casos ?? []).map((c) => c.nome).concat((an.desaprumo?.casos ?? []).map((c) => c.nome));
    const nosPil = new Set<number>();
    pm.barras.forEach((t, i) => { if (t.tipo === 'pilar') { nosPil.add(pm.modelo.barras[i].i); nosPil.add(pm.modelo.barras[i].j); } });
    ND.forEach((d, k) => {
      const ref = pm.resVento!.desloc[nomesH.indexOf(d)];
      let e = 0, mx = 0;
      for (const n of nosPil) for (let g = 0; g < 6; g++) { e = Math.max(e, Math.abs(rs[k].desloc[0][n * 6 + g] - ref[n * 6 + g])); mx = Math.max(mx, Math.abs(ref[n * 6 + g])); }
      expect(mx).toBeGreaterThan(0);
      expect(e / mx, `desaprumo ${d}`).toBeLessThan(1e-8);
    });
    const CP = 'node:child_process', FS = 'node:fs', OS = 'node:os', PATH = 'node:path';
    const cp = (await import(/* @vite-ignore */ CP)) as { execFileSync: (c: string, a: string[], o?: object) => unknown };
    try { cp.execFileSync('python3', ['-c', 'import openseespy.opensees'], { stdio: 'ignore' }); } catch { return; }
    const fs = (await import(/* @vite-ignore */ FS)) as { mkdtempSync: (p: string) => string; writeFileSync: (p: string, d: string) => void; readFileSync: (p: string, e: string) => string };
    const os = (await import(/* @vite-ignore */ OS)) as { tmpdir: () => string };
    const path = (await import(/* @vite-ignore */ PATH)) as { join: (...p: string[]) => string };
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'statikos-os-d-'));
    fs.writeFileSync(path.join(dir, 'portico.py'), sc.script);
    cp.execFileSync('python3', [path.join(dir, 'portico.py')], { stdio: 'ignore', timeout: 120000 });
    const R = JSON.parse(fs.readFileSync(path.join(dir, 'resultados_opensees.json'), 'utf8')) as { casos: Record<string, { desloc: number[][]; reacoes: Record<string, number[]> }> };
    ND.forEach((nome, k) => {
      const u = rs[k].desloc[0], d = R.casos[nome].desloc;
      let err = 0, umx = 0;
      d.forEach((x, n) => { for (let g = 0; g < 6; g++) { err = Math.max(err, Math.abs(u[n * 6 + g] - x[g])); umx = Math.max(umx, Math.abs(x[g])); } });
      expect(err / umx, `desloc ${nome}`).toBeLessThan(1e-6);
      let er = 0, rmx = 0;
      for (const [no, f] of rs[k].reacoes[0]) { const o = R.casos[nome].reacoes[String(no)]; for (let g = 0; g < 6; g++) { er = Math.max(er, Math.abs(f[g] - o[g])); rmx = Math.max(rmx, Math.abs(o[g])); } }
      expect(er / rmx, `reações ${nome}`).toBeLessThan(1e-6);
      let ec = 0, rc = 0;
      for (const [no, f] of pm.resVento!.reacoes[nomesH.indexOf(nome)]) { const o = R.casos[nome].reacoes[String(no)]; if (!o) continue; for (let g = 0; g < 6; g++) { ec = Math.max(ec, Math.abs(f[g] - o[g])); rc = Math.max(rc, Math.abs(o[g])); } }
      expect(ec / rc, `reações do condensado ${nome}`).toBeLessThan(1e-6);
    });
    console.log(`OpenSees (desaprumo): ${ND.join(', ')} conferidos contra o Statikos`);
  }, 240000);
});

describe('vento no OpenSees, modelo separado (grelha à parte)', () => {
  it('o pórtico exportado dá o vento do Statikos (área real dos pilares) e, com o openseespy, deslocamentos iguais', async () => {
    const s = new Sessao();
    for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
    s.executar('opcoes.definir', { valores: { modeloGlobal: 0 } });
    s.executar('lote', { comandos: [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
    const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } });
    s.executar('lote', { comandos: [v([[0, 0], [6, 0]]), v([[0, 5], [6, 5]]), v([[0, 0], [0, 5]]), v([[6, 0], [6, 5]])] });
    s.executar('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
    const b2 = s.modelo, an2 = analisarEdificio(b2), me = modeloExportavel(b2, an2);
    expect(me.cheio).toBe(false);
    const k = me.casos.findIndex((c) => c.nome === 'W0°'), iw = an2.vento!.casos.findIndex((c) => c.nome === 'W0°');
    expect(me.casos[k].escA).toBe(1 / an2.opcoes.axialPilares);
    const r = resolver3(modeloDoCaso(me, 'W0°'), [me.casos[k].caso!]);
    const ref = an2.portico.resVento!.desloc[iw];
    let e = 0, mx = 0;
    ref.forEach((x, i) => { e = Math.max(e, Math.abs(x - r.desloc[0][i])); mx = Math.max(mx, Math.abs(x)); });
    expect(e / mx).toBeLessThan(1e-9);
    // com a área das cargas verticais (sem o fator do vento) o deslocamento difere: o fator é necessário
    const r2 = resolver3(me.modelo, [me.casos[k].caso!]);
    let e2 = 0;
    ref.forEach((x, i) => { e2 = Math.max(e2, Math.abs(x - r2.desloc[0][i])); });
    expect(e2 / mx).toBeGreaterThan(1e-4);
    const sc = scriptOpenSees(me, { casos: ['W0°'] });
    expect(sc.script).toContain('"escA": 0.5');
    const CP = 'node:child_process', FS = 'node:fs', OS = 'node:os', PATH = 'node:path';
    const cp = (await import(/* @vite-ignore */ CP)) as { execFileSync: (c: string, a: string[], o?: object) => unknown };
    try { cp.execFileSync('python3', ['-c', 'import openseespy.opensees'], { stdio: 'ignore' }); } catch { return; }
    const fs = (await import(/* @vite-ignore */ FS)) as { mkdtempSync: (p: string) => string; writeFileSync: (p: string, d: string) => void; readFileSync: (p: string, e: string) => string };
    const os = (await import(/* @vite-ignore */ OS)) as { tmpdir: () => string };
    const path = (await import(/* @vite-ignore */ PATH)) as { join: (...p: string[]) => string };
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'statikos-os-s-'));
    fs.writeFileSync(path.join(dir, 'portico.py'), sc.script);
    cp.execFileSync('python3', [path.join(dir, 'portico.py')], { stdio: 'ignore', timeout: 120000 });
    const R = JSON.parse(fs.readFileSync(path.join(dir, 'resultados_opensees.json'), 'utf8')) as { casos: Record<string, { desloc: number[][] }> };
    let eo = 0, mo = 0;
    R.casos['W0°'].desloc.forEach((x, n) => { for (let g = 0; g < 6; g++) { eo = Math.max(eo, Math.abs(ref[n * 6 + g] - x[g])); mo = Math.max(mo, Math.abs(x[g])); } });
    expect(eo / mo).toBeLessThan(1e-6);
  }, 240000);
});

describe('MCP', () => {
  it('recursos statikos://memoria, memoria/{elemento}, dados-analise e opensees', () => {
    const io = { ler: () => '', gravar: () => {}, out: () => {}, err: () => {} };
    const sv = new ServidorMcp(io);
    const s = new Sessao(b); sv.sessao = s;
    const ler = (uri: string) => (sv.handle({ jsonrpc: '2.0', id: 1, method: 'resources/read', params: { uri } }) as { result: { contents: { mimeType: string; text: string }[] } }).result.contents[0];
    const m = JSON.parse(ler('statikos://memoria').text) as MemoriaDetalhada;
    expect(m.passos.length).toBe(mem.passos.length);
    const v = JSON.parse(ler(`statikos://memoria/${encodeURIComponent('Viga V1')}`).text) as MemoriaDetalhada;
    expect(new Set(v.passos.map((p) => p.elemento))).toEqual(new Set(['Edifício', 'Viga V1']));
    expect(JSON.parse(ler('statikos://dados-analise').text).tabelas.nos.linhas.length).toBe(an.portico.modelo.nos.length);
    const os = ler('statikos://opensees');
    expect(os.mimeType).toBe('text/x-python');
    expect(os.text).toContain('openseespy');
  }, 120000);
});

describe('custo da memória', () => {
  it('desligada: o mesmo tempo do dimensionamento (medido); ligada: registra e informa o tempo', () => {
    const t = (f: () => void) => { let m = Infinity; for (let i = 0; i < 3; i++) { const t0 = performance.now(); f(); m = Math.min(m, performance.now() - t0); } return m; };
    const off = t(() => dimensionarEdificio(b, an, { fundacao: false }));
    const on = t(() => memoriaDetalhada(b, { an }));
    console.log(`memória detalhada: dimensionamento ${off.toFixed(0)} ms desligada; ${on.toFixed(0)} ms ligada (${mem.passos.length} passos)`);
    expect(on).toBeGreaterThan(0);
  }, 120000);
});

describe('pilar com viga em desnível (E5m, lance em 2 trechos)', () => {
  let bd: BuildingModel, dimD: Dimensionamento, dimDM: Dimensionamento, memD: MemoriaDetalhada;
  beforeAll(() => {
    const s = new Sessao();
    const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
    ok('obra.definir', { nome: 'Desnível' });
    ok('pavimento.criar', { nome: 'Térreo', cota: 0, uso: 'comum' });
    ok('grupo.criar', { nome: 'P1', uso: 'residencial' });
    const g = s.modelo.grupos.at(-1)!.id;
    ok('pavimento.criar', { nome: 'P1', cota: 4, grupo: g });
    ok('vento.definir', { ativo: false });
    ok('opcoes.definir', { valores: { engasteTopoUltimo: 1 } });
    const terreo = s.modelo.pavimentos.find((p) => p.nome === 'Térreo')!.id;
    ok('lote', { comandos: [[0, 0], [6, 0]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 }, nasce: terreo, inicio: 'fundacao' } })) });
    ok('viga.tracar', { grupo: g, pontos: [[0, 0], [6, 0]], secao: { b: 0.2, h: 0.5 } });
    ok('viga.editar', { id: s.modelo.vigas[0].id, nivel: -2 });
    ok('carga.linha', { grupo: g, pontos: [[0, 0], [6, 0]], valor: 20, caso: 'G' });
    bd = s.modelo;
    const and = analisarEdificio(bd);
    dimD = dimensionarEdificio(bd, and, { fundacao: false });
    const r = memoriaDetalhada(bd, { an: and });
    memD = r.memoria; dimDM = r.dim;
  }, 120000);
  const ps = (el: string, topico?: string) => memD.passos.filter((p) => p.elemento === el && (!topico || p.topico === topico));
  const pega = (el: string, desc: string, topico?: string) => { const p = ps(el, topico).find((x) => x.descricao.startsWith(desc)); if (!p) throw new Error(`passo ${el} / ${desc}`); return p; };

  it('dimensionamento com a memória ligada idêntico ao desligado (inclui trechos)', () => {
    expect(dimDM.pilares).toEqual(dimD.pilares);
    expect(dimDM.vigas).toEqual(dimD.vigas);
    expect(dimDM.pilares.some((r) => r.trechos?.length === 2)).toBe(true);
  });

  it('trechos registrados: ℓe, λ, Nd e utilização batem com o dimensionamento a 1e-9; cadeia do trecho determinante', () => {
    const r = dimD.pilares.find((x) => x.trechos?.length === 2 && x.pilar === bd.pilares[0].id)!;
    const el = `Pilar ${r.nome} · ${r.pavimento}`, tt = 'Trechos do lance (vigas em desnível)';
    expect(r.status).not.toBe('fail');
    for (let k = 0; k < 2; k++) {
      const t = r.trechos![k];
      const e = pega(el, `Trecho ${k + 1} (`, tt);
      expect(rel(num(e, 'leU') / num(e, 'iu'), t.lambda[0])).toBeLessThan(1e-9);
      expect(rel(num(e, 'leV') / num(e, 'iv'), t.lambda[1])).toBeLessThan(1e-9);
      expect(Math.abs(num(e, 'leU') - t.le[0])).toBeLessThanOrEqual(0.0005 + 1e-9);
      expect(Math.abs(num(e, 'leV') - t.le[1])).toBeLessThanOrEqual(0.0005 + 1e-9);
      expect(Math.abs(num(e, 'de') - t.de)).toBeLessThanOrEqual(0.0005 + 1e-9);
      const u = ps(el, tt).find((p) => p.descricao.startsWith(`Trecho ${k + 1}: combinação`))!;
      expect(rel(u.resultado as number, t.util)).toBeLessThan(1e-9);
      expect(u.entradas.combinacao).toBe(t.combinacao);
      expect(Math.abs(num(u, 'NdMax') - t.Nd)).toBeLessThanOrEqual(0.005 + 1e-9);
      expect(num(u, 'Nd')).toBeLessThanOrEqual(num(u, 'NdMax') + 1e-9);
    }
    // a utilização do lance é a maior dos trechos e o determinante é o de maior utilização
    const kDet = r.trechos![1].util > r.trechos![0].util ? 1 : 0;
    const det = pega(el, 'Trecho determinante', tt);
    expect(num(det, 'trechoDet')).toBe(kDet + 1);
    expect(rel(det.resultado as number, r.util)).toBeLessThan(1e-9);
    // cadeia principal do trecho determinante: ℓe, λ, Nd, flexão oblíqua
    const le = pega(el, 'Comprimento de flambagem na direção u');
    expect(le.descricao).toContain(`trecho ${kDet + 1} de 2`);
    expect(Math.abs((le.resultado as number) - r.trechos![kDet].le[0])).toBeLessThanOrEqual(0.0005 + 1e-9);
    const lu = pega(el, 'Índice de esbeltez na direção u');
    expect(rel(num(lu, 'le') / num(lu, 'i'), r.trechos![kDet].lambda[0])).toBeLessThan(1e-9);
    const nd = pega(el, 'Normal de cálculo');
    const parc = Object.keys(nd.entradas).filter((k) => k.startsWith('γ_')).map((k) => k.slice(2));
    expect(rel(num(nd, 'gn') * parc.reduce((t, n) => t + num(nd, `γ_${n}`) * num(nd, `Nk_${n}`), 0), nd.resultado as number)).toBeLessThan(1e-9);
    expect(nd.entradas.combinacao).toBe(r.trechos![kDet].combinacao);
    const ch = ps(el, 'Flexão composta oblíqua').filter((p) => p.entradas.MRd !== undefined);
    expect(ch.length).toBeGreaterThan(0);
    for (const p of ch) expect(rel(Math.hypot(num(p, 'mu'), num(p, 'mv')) / 1000 / num(p, 'MRd'), p.resultado as number)).toBeLessThan(1e-9);
    expect(rel(Math.max(...ch.map((p) => p.resultado as number)), r.util)).toBeLessThan(1e-9);
  });
});
