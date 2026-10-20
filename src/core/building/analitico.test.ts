import { describe, expect, it } from 'vitest';
import { analisarEdificio, malhaLaje } from './analitico';
import { vinculosAlterados } from './opcoes';
import { resolver3, type Modelo3, type Caso3 } from '../fe3d';
import { comandosEdificioPadrao, Sessao } from '../commands';
import type { P } from '../geom/faces';

function padrao(): Sessao {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  return s;
}
const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };

/** Edifício de um vão: pilares nos cantos de a × b, vigas centradas nos eixos e laje maciça no grupo Tipo. */
function predio(a = 6, bb = 5, nx = 1, ny = 1) {
  const s = padrao();
  const xs = Array.from({ length: nx + 1 }, (_, i) => (i * a) / nx), ys = Array.from({ length: ny + 1 }, (_, j) => (j * bb) / ny);
  ok(s, 'lote', { comandos: xs.flatMap((x) => ys.map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } }))) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } });
  ok(s, 'lote', { comandos: [...ys.map((y) => v([[0, y], [a, y]])), ...xs.map((x) => v([[x, 0], [x, bb]]))] });
  ok(s, 'laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  return s.modelo;
}

/** Placa quadrada a × a pela grelha (J = 2I, ν = 0), com faixas de borda; apoiada ou engastada no contorno. */
function placa(sp: number, engastada: boolean) {
  const a = 6, h = 0.15, q = 10, E = 30e6, G = E / 2;
  const mm = malhaLaje([[0, 0], [a, 0], [a, a], [0, a]], 0, sp);
  const nos: [number, number, number][] = [], idx = new Map<string, number>();
  const no = (p: P) => { const k = `${p[0].toFixed(6)}:${p[1].toFixed(6)}`; if (!idx.has(k)) { idx.set(k, nos.length); nos.push([p[0], p[1], 0]); } return idx.get(k)!; };
  const m: Modelo3 = { nos, barras: [], apoios: new Map() };
  const caso: Caso3 = { nodais: [], distribuidas: [] };
  const barra = (i: number, j: number, w: number) => { const I = (w * h ** 3) / 12; m.barras.push({ i, j, E, G, A: w * h, Iz: I, Iy: I, J: 2 * I }); };
  for (const ln of mm.linhas) for (let j = 0; j + 1 < ln.pontos.length; j++) {
    barra(no(ln.pontos[j]), no(ln.pontos[j + 1]), ln.largura);
    caso.distribuidas.push({ barra: m.barras.length - 1, q: [0, 0, -q * ln.largura * 0.5] });
  }
  for (const e of mm.bordas) barra(no(e.a), no(e.z), sp / 2);
  const borda = (p: [number, number, number]) => [p[0], p[1]].some((v) => Math.abs(v) < 1e-9 || Math.abs(v - a) < 1e-9);
  nos.forEach((p, i) => m.apoios.set(i, borda(p) ? (engastada ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 5]) : [0, 1, 5]));
  const r = resolver3(m, [caso]);
  expect(r.erro).toBeUndefined();
  return -r.desloc[0][no([a / 2, a / 2]) * 6 + 2] / ((q * a ** 4) / ((E * h ** 3) / 12));
}

describe('grelha de laje (validação com Timoshenko)', () => {
  it('placa quadrada apoiada: α = 0,00406, erro < 5 % com malha de 50 e de 25 cm', () => {
    for (const sp of [0.5, 0.25]) expect(Math.abs(placa(sp, false) - 0.00406) / 0.00406).toBeLessThan(0.05);
  });
  it('placa quadrada engastada: α = 0,00126, erro < 5 % com malha de 25 cm', () => {
    expect(Math.abs(placa(0.25, true) - 0.00126) / 0.00126).toBeLessThan(0.05);
  });
});

describe('modelo analítico do edifício', () => {
  it('equilíbrio: soma das reações na fundação = cargas (G e Q); simetria', () => {
    const b = predio();
    const an = analisarEdificio(b);
    expect(an.erro).toBeUndefined();
    const soma = (c: 'G' | 'Q') => an.fundacao.filter((f) => f.caso === c).reduce((s, f) => s + f.N, 0);
    expect(soma('G')).toBeCloseTo(an.totais.G, 4);
    expect(soma('Q')).toBeCloseTo(an.totais.Q, 4);
    // Q: 1,5 kN/m² × laje (pelo eixo das vigas, 6 × 5) × 3 pavimentos do grupo Tipo
    expect(an.totais.Q).toBeCloseTo(1.5 * 30 * 3, 6);
    // G: laje 0,12 × 25 + revestimento 1,0; vigas 0,15 × 0,4 × 25 × 22 m; pilares 4 × 0,25² × 25 × 13,5 m
    expect(an.totais.G).toBeCloseTo(3 * ((0.12 * 25 + 1) * 30 + 0.15 * 0.4 * 25 * 22) + 4 * 0.0625 * 25 * 13.5, 6);
    const Ns = an.fundacao.filter((f) => f.caso === 'G').map((f) => f.N);
    for (const n of Ns) expect(n).toBeCloseTo(Ns[0], 3);
    // grelha de cada pavimento do grupo Tipo: reações = cargas
    for (const g of an.grelhas.filter((x) => x.res)) {
      const sr = Object.values(g.reacoes).reduce((s, r) => s + r.G, 0);
      expect(sr).toBeCloseTo(g.carga.G, 4);
    }
    // diafragma em todos os níveis com mais de um nó
    expect(Object.keys(an.portico.mestres)).toHaveLength(5);
  });

  it('vigas pela face e pilares retangulares: modelo monta e equilibra', () => {
    const s = padrao();
    ok(s, 'lote', { comandos: [[0.1, 0.2], [6, 0.2], [6, 5], [0.1, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.2, h: 0.4 } } })) });
    ok(s, 'lote', { comandos: [
      { nome: 'viga.tracar', params: { grupo: 'g_3', pontos: [[0, 0], [6.1, 0]], secao: { b: 0.15, h: 0.5 }, alinhamento: 'dir' } },
      { nome: 'viga.tracar', params: { grupo: 'g_3', pontos: [[6, 0], [6, 5]], secao: { b: 0.15, h: 0.5 } } },
      { nome: 'viga.tracar', params: { grupo: 'g_3', pontos: [[6, 5], [0.1, 5]], secao: { b: 0.15, h: 0.5 } } },
      { nome: 'viga.tracar', params: { grupo: 'g_3', pontos: [[0.1, 5], [0.1, 0]], secao: { b: 0.15, h: 0.5 } } },
    ] });
    ok(s, 'laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'trelicada', modelo: 'H12', capa: 0.04 } });
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toBeUndefined();
    const soma = an.fundacao.filter((f) => f.caso === 'G').reduce((t, f) => t + f.N, 0);
    expect(soma).toBeCloseTo(an.totais.G, 3);
  });

  it('porte: 10 pavimentos, 3 × 2 vãos, malha de 50 cm', () => {
    const s = padrao();
    ok(s, 'pavimento.repetir', { id: 'pav_6', vezes: 6 });
    const b0 = s.modelo;
    const xs = [0, 5, 10, 15], ys = [0, 4.5, 9];
    ok(s, 'lote', { comandos: xs.flatMap((x) => ys.map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.2, h: 0.5 } } }))) });
    const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.5 } } });
    ok(s, 'lote', { comandos: [...ys.map((y) => v([[0, y], [15, y]])), ...xs.map((x) => v([[x, 0], [x, 9]]))] });
    ok(s, 'laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
    expect(b0.pavimentos.length).toBe(11);
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toBeUndefined();
    console.log(`porte: ${an.gdl} gdl, ${an.ms.toFixed(0)} ms`);
    expect(an.ms).toBeLessThan(10000);
  });
});

describe('opções de cálculo (N1a)', () => {
  it('opcoes.definir guarda só o que difere do padrão e volta ao padrão', () => {
    const s = padrao();
    ok(s, 'opcoes.definir', { valores: { malha: 0.5, trechoRigido: 0.3 } });
    expect(s.modelo.opcoes).toEqual({ malha: 0.5 });
    ok(s, 'opcoes.definir', { valores: { engasteTopoUltimo: 1 } });
    ok(s, 'opcoes.definir', { padrao: ['malha'] });
    expect(s.modelo.opcoes).toEqual({ engasteTopoUltimo: 1 });
    ok(s, 'opcoes.definir', { padrao: true });
    expect(s.modelo.opcoes).toBeUndefined();
    expect(s.executar('opcoes.definir', { valores: { malha: 0.01 } }).ok).toBe(false);
  });

  it('a análise lê as opções do modelo: malha e engaste no topo do último lance', () => {
    const s = padrao();
    const cob = s.modelo.pavimentos.at(-1)!.grupo;
    ok(s, 'lote', { comandos: [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
    for (const g of ['g_3', cob]) ok(s, 'lote', { comandos: [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: g, pontos: p, secao: { b: 0.15, h: 0.4 } } })) });
    for (const g of ['g_3', cob]) ok(s, 'laje.detectarPanos', { grupo: g, tipo: { tipo: 'macica', h: 0.12 } });
    const b = s.modelo;
    const topo = (o: Record<string, number>) => {
      const an = analisarEdificio({ ...b, opcoes: o });
      expect(an.erro).toBeUndefined();
      const ult = b.pavimentos.at(-1)!.id;
      const bi = an.portico.barras.findIndex((t) => t.tipo === 'pilar' && t.pavimento === ult);
      const f = an.portico.res!.esforcos[0][bi];
      return { M: Math.hypot(f[10], f[11]), nos: an.grelhas.find((g) => g.pavimento === ult)!.modelo.nos.length, an };
    };
    const rot = topo({ engasteTopoUltimo: 0 }), eng = topo({ engasteTopoUltimo: 1 }), pad = topo({});
    expect(rot.M).toBeLessThan(1e-6); // rótula no topo do último lance
    expect(eng.M).toBeGreaterThan(1);
    expect(pad.M).toBeGreaterThan(rot.M);
    expect(pad.M).toBeLessThan(eng.M);
    expect(pad.an.opcoes.malha).toBe(0.25);
    expect(topo({ malha: 0.5 }).nos).toBeLessThan(pad.nos);
  });

  it('engaste por lance: base articulada na fundação zera os momentos na base do pilar', () => {
    const s = padrao();
    ok(s, 'lote', { comandos: [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
    ok(s, 'lote', { comandos: [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } })) });
    ok(s, 'laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
    const p0 = s.modelo.pilares[0], prim = s.modelo.pavimentos[0].id;
    const momBase = () => { const an = analisarEdificio(s.modelo); expect(an.erro).toBeUndefined(); const f = an.fundacao.find((x) => x.pilar === p0.id && x.caso === 'G')!; return Math.hypot(f.Mx, f.My); };
    const antes = momBase();
    ok(s, 'pilar.engaste', { ids: [p0.id], pavimentos: [prim], base: 0 });
    expect(s.modelo.pilares[0].engastes).toEqual([{ pavimento: prim, base: 0 }]);
    expect(antes).toBeGreaterThan(0.1);
    expect(momBase()).toBeLessThan(1e-6);
    ok(s, 'pilar.engaste', { ids: [p0.id], base: 1 });
    expect(s.modelo.pilares[0].engastes).toBeUndefined();
  });

  it('viga: ponta articulada por coeficiente, apoio intermediário articulado e torção de equilíbrio', () => {
    const s = padrao();
    ok(s, 'lote', { comandos: [[0, 0], [4, 0], [8, 0], [0, 5], [4, 5], [8, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
    ok(s, 'lote', { comandos: [[[0, 0], [8, 0]], [[0, 5], [8, 5]], [[0, 0], [0, 5]], [[4, 0], [4, 5]], [[8, 0], [8, 5]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } })) });
    ok(s, 'laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
    const v = s.modelo.vigas.find((x) => x.pontos[0][1] === 0 && x.pontos[1][1] === 0)!;
    const meio = s.modelo.pilares.find((p) => p.x === 4 && p.y === 0)!;
    const pav = s.modelo.pavimentos.find((p) => p.grupo === 'g_3')!.id;
    /** Momento vertical da viga v nas pontas dos trechos do pórtico junto ao ponto x. */
    const Mjunto = (x: number) => {
      const an = analisarEdificio(s.modelo);
      expect(an.erro).toBeUndefined();
      const m = an.portico.modelo;
      let M = 0;
      an.portico.barras.forEach((t, bi) => {
        if (t.tipo !== 'viga' || t.ref !== v.id || t.pavimento !== pav) return;
        const br = m.barras[bi], f = an.portico.res!.esforcos[0][bi];
        if (Math.abs(m.nos[br.i][0] - x) < 0.01) M = Math.max(M, Math.abs(f[5]));
        if (Math.abs(m.nos[br.j][0] - x) < 0.01) M = Math.max(M, Math.abs(f[11]));
      });
      return { M, an };
    };
    expect(Mjunto(4).M).toBeGreaterThan(1);
    expect(Mjunto(0).M).toBeGreaterThan(0.5);
    ok(s, 'viga.editar', { id: v.id, engasteIni: 0, articulacoes: [meio.id], torcaoEquilibrio: true });
    expect(vinculosAlterados(s.modelo)).toEqual([`Viga ${v.nome}: início 0; rótula sobre ${meio.nome}; torção de equilíbrio (seção bruta).`]);
    const r = Mjunto(4);
    expect(r.M).toBeLessThan(1e-6);
    expect(Mjunto(0).M).toBeLessThan(1e-6);
    // torção de equilíbrio: J da seção bruta na grelha
    const g = r.an.grelhas.find((x) => x.pavimento === pav)!;
    const bi = g.barras.findIndex((t) => t.tipo === 'viga' && t.ref === v.id);
    const outra = g.barras.findIndex((t) => t.tipo === 'viga' && t.ref !== v.id);
    expect(g.modelo.barras[bi].J / g.modelo.barras[outra].J).toBeCloseTo(1 / 0.15, 6);
  });

  it('laje: borda articulada sobre a viga intermediária zera o momento da laje nessa borda', () => {
    const s = padrao();
    ok(s, 'lote', { comandos: [[0, 0], [4, 0], [8, 0], [0, 5], [4, 5], [8, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
    ok(s, 'lote', { comandos: [[[0, 0], [8, 0]], [[0, 5], [8, 5]], [[0, 0], [0, 5]], [[4, 0], [4, 5]], [[8, 0], [8, 5]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } })) });
    ok(s, 'laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
    const pav = s.modelo.pavimentos.find((p) => p.grupo === 'g_3')!.id;
    const Mborda = () => {
      const an = analisarEdificio(s.modelo);
      expect(an.erro).toBeUndefined();
      const g = an.grelhas.find((x) => x.pavimento === pav)!, m = g.modelo;
      let M = 0;
      g.barras.forEach((t, bi) => {
        if (t.tipo !== 'laje') return;
        const br = m.barras[bi], f = g.res!.esforcos[0][bi];
        if (Math.abs(m.nos[br.i][0] - 4) < 0.01 && Math.abs(m.nos[br.i][1] - 2.5) < 1) M = Math.max(M, Math.abs(f[5]));
        if (Math.abs(m.nos[br.j][0] - 4) < 0.01 && Math.abs(m.nos[br.j][1] - 2.5) < 1) M = Math.max(M, Math.abs(f[11]));
      });
      return M;
    };
    expect(Mborda()).toBeGreaterThan(0.5);
    for (const l of s.modelo.lajes) ok(s, 'laje.editar', { id: l.id, engasteBordas: l.contorno.map(() => 0) });
    expect(Mborda()).toBeLessThan(1e-6);
    // o mesmo pelo coeficiente da viga de apoio
    for (const l of s.modelo.lajes) ok(s, 'laje.editar', { id: l.id, engasteBordas: [] });
    const vm = s.modelo.vigas.find((x) => x.pontos[0][0] === 4 && x.pontos[1][0] === 4)!;
    ok(s, 'viga.editar', { id: vm.id, engasteLajes: 0 });
    expect(Mborda()).toBeLessThan(1e-6);
  });

  it('viga fora do diafragma: os nós só dela deixam o corpo rígido e a viga passa a ter esforço normal no vento', () => {
    const s = padrao();
    ok(s, 'lote', { comandos: [[0, 0], [6, 0], [6, 5], [0, 5], [12, 0]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
    ok(s, 'lote', { comandos: [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]], [[6, 0], [12, 0]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } })) });
    ok(s, 'laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
    const passarela = s.modelo.vigas.find((v) => v.pontos[1][0] === 12)!;
    const pav = s.modelo.pavimentos.find((p) => p.grupo === 'g_3')!.id;
    const N = () => {
      const an = analisarEdificio(s.modelo);
      expect(an.erro).toBeUndefined();
      const bi = an.portico.barras.findIndex((t) => t.tipo === 'viga' && t.ref === passarela.id && t.pavimento === pav);
      const escravos = new Set(an.portico.modelo.escravos!.map((e) => e.no));
      const br = an.portico.modelo.barras[bi];
      return { N: Math.max(...an.portico.resVento!.esforcos.map((e) => Math.abs(e[bi][0]))), presoJ: escravos.has(br.j) };
    };
    const a = N();
    expect(a.presoJ).toBe(true);
    expect(a.N).toBeLessThan(1e-3);
    ok(s, 'viga.editar', { id: passarela.id, foraDiafragma: true });
    const b = N();
    expect(b.presoJ).toBe(false);
    expect(b.N).toBeGreaterThan(0.1);
  });
});
