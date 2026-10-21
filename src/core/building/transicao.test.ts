// E1a: pilares apoiados (sobre pilar, viga ou laje), lances com geometria própria, ancoragem das esperas.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio, esforcosAoLongo } from './dimensionamento';
import { detalharPilar } from './detalhamentoPilares';
import { apoioDoPilar, areaComum, letraSequencial, nomeSobre } from './transicao';
import { lancesDoPilar, pavimentosOrdenados, type BuildingModel } from './types';
import { verificar } from './verify';
import { classificar, revisarEdificio } from './revisao';

function padrao(): Sessao {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  return s;
}
const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
const nomePav = (b: BuildingModel, nome: string) => b.pavimentos.find((p) => p.nome === nome)!.id;
const ret = (b: number, h: number) => ({ tipo: 'ret' as const, b, h });
/** Esforço da ponta i (x = 0) ou j (x = L) de uma barra do pórtico, no caso e na posição dados. */
function estacao(an: ReturnType<typeof analisarEdificio>, pilar: string, pav: string, caso = 0, x = 0) {
  const bi = an.portico.barras.findIndex((t) => t.tipo === 'pilar' && t.ref === pilar && t.pavimento === pav);
  return esforcosAoLongo(an.portico.modelo, bi, an.portico.res!.esforcos[caso][bi], an.portico.casos![caso], [x])[0];
}

describe('apoio dos pilares que nascem acima da fundação', () => {
  it('detecta pilar, viga e laje; sem apoio é erro; início na fundação dispensa o apoio', () => {
    const s = padrao();
    const b0 = s.modelo, t1 = nomePav(b0, 'Tipo 1'), cob = nomePav(b0, 'Cobertura');
    ok(s, 'pilar.inserir', { x: 0, y: 0, secao: ret(0.3, 0.3), morre: t1 });
    ok(s, 'pilar.inserir', { x: 6, y: 0, secao: ret(0.3, 0.3), morre: t1 });
    ok(s, 'viga.tracar', { grupo: b0.pavimentos.find((p) => p.id === t1)!.grupo, pontos: [[0, 0], [6, 0]], secao: { b: 0.2, h: 0.5 } });
    // sobre o pilar P1 (x = 0,1: excêntrico)
    const r = ok(s, 'pilar.inserir', { sobre: { pilar: s.modelo.pilares[0].id, dx: 0.1, dy: 0 }, secao: ret(0.25, 0.25) });
    expect(r.mensagem).toMatch(/^P1a /);
    const pa = s.modelo.pilares.at(-1)!;
    expect(pa).toMatchObject({ nome: 'P1a', nasce: t1, x: 0.1, y: 0 });
    expect(apoioDoPilar(s.modelo, pa)).toMatchObject({ tipo: 'pilar', principal: s.modelo.pilares[0].id });
    // sobre a viga
    ok(s, 'pilar.inserir', { x: 3, y: 0, secao: ret(0.25, 0.25), nasce: t1 });
    expect(apoioDoPilar(s.modelo, s.modelo.pilares.at(-1)!)).toMatchObject({ tipo: 'viga' });
    // segundo pilar sobre o mesmo pilar: letra seguinte
    ok(s, 'pilar.inserir', { sobre: { pilar: s.modelo.pilares[0].id, dx: -0.12, dy: 0.02 }, secao: ret(0.1, 0.1), morre: cob });
    expect(s.modelo.pilares.at(-1)!.nome).toBe('P1b');
    // sem nada embaixo
    ok(s, 'pilar.inserir', { x: 3, y: 8, secao: ret(0.25, 0.25), nasce: t1 });
    const d = verificar(s.modelo);
    expect(d.filter((x) => x.codigo === 'PILAR_NASCE_SEM_APOIO')).toHaveLength(1);
    expect(d.find((x) => x.codigo === 'PILAR_EXCENTRICO')?.mensagem).toMatch(/10 cm/);
    // início na fundação: vínculo externo, sem exigir apoio
    const sem = s.modelo.pilares.at(-1)!;
    ok(s, 'pilar.editar', { id: sem.id, inicio: 'fundacao' });
    expect(verificar(s.modelo).filter((x) => x.codigo === 'PILAR_NASCE_SEM_APOIO')).toHaveLength(0);
    // pilar da fundação não pode ser apoiado
    expect(s.executar('pilar.editar', { id: s.modelo.pilares[0].id, inicio: 'apoiado' }).ok).toBe(false);
  });

  it('nome automático com letras sequenciais e áreas em comum', () => {
    expect([0, 1, 25, 26, 27].map(letraSequencial)).toEqual(['a', 'b', 'z', 'aa', 'ab']);
    const q: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]], r: [number, number][] = [[0.5, 0.5], [1.5, 0.5], [1.5, 1.5], [0.5, 1.5]];
    expect(areaComum(q, r)).toBeCloseTo(0.25, 9);
    expect(areaComum(q, [[2, 2], [3, 2], [3, 3], [2, 3]])).toBe(0);
    const s = padrao();
    ok(s, 'pilar.inserir', { x: 0, y: 0, secao: ret(0.3, 0.3), morre: nomePav(s.modelo, 'Tipo 1') });
    expect(nomeSobre(s.modelo, s.modelo.pilares[0])).toBe('P1a');
  });
});

describe('pilar sobre pilar', () => {
  /** P1 da fundação ao Tipo 1; P1a sobre ele (dx) até a cobertura; sem vigas nem lajes. */
  function dois(dx: number, secaoA = ret(0.3, 0.3)) {
    const s = padrao();
    const t1 = nomePav(s.modelo, 'Tipo 1');
    ok(s, 'pilar.inserir', { x: 0, y: 0, secao: ret(0.4, 0.4), morre: t1 });
    ok(s, 'pilar.inserir', { sobre: { pilar: s.modelo.pilares[0].id, dx }, secao: secaoA });
    const pa = s.modelo.pilares[1];
    ok(s, 'carga.pilar', { pilar: pa.id, caso: 'G', N: 100 });
    return { s, p: s.modelo.pilares[0], pa };
  }

  it('excentricidade: momento N·e na base do pilar de baixo (cantilever de dois lances)', () => {
    const { s, p, pa } = dois(0.1);
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toBeUndefined();
    expect(an.apoiados?.[pa.id]).toEqual({ apoio: 'pilar', ligado: true });
    // peso do pilar de cima (γ 25 kN/m³) + carga de 100 kN, aplicados no centro do pilar de cima (x = 0,1)
    const lances = lancesDoPilar(s.modelo, pa), ps = pavimentosOrdenados(s.modelo);
    const Hs = lances.map((l) => l.cota - ps[ps.findIndex((x) => x.id === l.id) - 1].cota);
    const Wp = Hs.reduce((t, h) => t + 25 * 0.09 * h, 0), Ntot = 100 + Wp;
    const base = an.fundacao.filter((f) => f.pilar === p.id && f.caso === 'G');
    expect(base).toHaveLength(1);
    // reação da fundação do P1: toda a carga (a do P1 mais a do P1a) e o momento em torno de y = N_P1a · 0,1
    expect(Math.abs(base[0].My)).toBeCloseTo(Ntot * 0.1, 3);
    expect(Math.abs(base[0].Mx)).toBeCloseTo(0, 6);
    // o pé do P1a não é apoio nem entra nas reações da fundação
    expect(an.fundacao.some((f) => f.pilar === pa.id)).toBe(false);
    // esforço axial na base do P1a = carga + peso do trecho
    const e = estacao(an, pa.id, lances[0].id);
    expect(-e.N).toBeCloseTo(Ntot, 3);
    // alinhado: sem momento na base do P1
    const an0 = analisarEdificio(dois(0).s.modelo);
    expect(Math.abs(an0.fundacao.find((f) => f.caso === 'G' && f.pilar === dois(0).p.id)!.My)).toBeLessThan(1e-6);
  });

  it('lance de cima fora da projeção: continua apoiado por trecho rígido e dimensiona', () => {
    const { s, pa } = dois(0.2, ret(0.5, 0.3));
    expect(verificar(s.modelo).some((d) => d.codigo === 'PILAR_APOIO_PARCIAL' || d.severidade === 'erro')).toBe(false);
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toBeUndefined();
    const dim = dimensionarEdificio(s.modelo, an);
    expect(dim.pilares.filter((r) => r.pilar === pa.id).length).toBeGreaterThan(0);
  });

  it('dois pilares sobre o mesmo pilar de baixo', () => {
    const s = padrao();
    const t1 = nomePav(s.modelo, 'Tipo 1');
    ok(s, 'pilar.inserir', { x: 0, y: 0, secao: ret(0.5, 0.3), morre: t1 });
    const q = s.modelo.pilares[0];
    ok(s, 'pilar.inserir', { sobre: { pilar: q.id, dx: -0.1 }, secao: ret(0.2, 0.2) });
    ok(s, 'pilar.inserir', { sobre: { pilar: q.id, dx: 0.1 }, secao: ret(0.2, 0.2) });
    expect(s.modelo.pilares.map((p) => p.nome)).toEqual(['P1', 'P1a', 'P1b']);
    for (const p of s.modelo.pilares.slice(1)) ok(s, 'carga.pilar', { pilar: p.id, caso: 'G', N: 50 });
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toBeUndefined();
    const base = an.fundacao.find((f) => f.pilar === q.id && f.caso === 'G')!;
    // cargas simétricas em x = ±0,1: momento nulo
    expect(Math.abs(base.My)).toBeLessThan(1e-6);
    expect(base.N).toBeGreaterThan(100);
  });
});

describe('pilar sobre viga (transição)', () => {
  /** Quatro pilares robustos da fundação à cobertura com vigas no contorno (6 × 5 m); P5 nasce no Tipo 3 sobre a viga de y = 0, no meio do vão, e só tem o lance da cobertura. */
  function transicao(modelo: 0 | 1 = 1, N = 200) {
    const s = padrao();
    const t1 = nomePav(s.modelo, 'Tipo 3'), g = s.modelo.pavimentos.find((p) => p.id === t1)!.grupo;
    ok(s, 'opcoes.definir', { valores: { modeloGlobal: modelo, engasteTopoUltimo: 1 } });
    ok(s, 'lote', { comandos: [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: ret(0.8, 0.8) } })) });
    ok(s, 'lote', { comandos: [[[0, 0], [6, 0]], [[6, 0], [6, 5]], [[6, 5], [0, 5]], [[0, 5], [0, 0]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: g, pontos: p, secao: { b: 0.2, h: 0.6 } } })) });
    ok(s, 'pilar.inserir', { x: 3, y: 0, secao: ret(0.25, 0.25), nasce: t1 });
    const p3 = s.modelo.pilares[4];
    ok(s, 'carga.pilar', { pilar: p3.id, caso: 'G', N });
    return { s, p3, t1 };
  }

  it('o pé é nó da viga: sem apoio vertical próprio; equilíbrio e momento no meio do vão', () => {
    for (const modelo of [0, 1] as const) {
      const { s, p3 } = transicao(modelo);
      const an = analisarEdificio(s.modelo);
      expect(an.erro, `modelo ${modelo}`).toBeUndefined();
      expect(an.apoiados?.[p3.id]).toEqual({ apoio: 'viga', ligado: true });
      expect(an.avisos.some((a) => /apoio fixo provisório/.test(a))).toBe(false);
      // as duas reações da fundação somam toda a carga (peso próprio do P3 incluso); o P3 não tem reação
      const N = an.fundacao.filter((f) => f.caso === 'G').reduce((t, f) => t + f.N, 0);
      expect(N).toBeCloseTo(an.totais.G, 3);
      expect(an.fundacao.some((f) => f.pilar === p3.id)).toBe(false);
      // simetria em x: os pilares do lado y = 0 recebem mais que os do lado y = 5, e iguais entre si
      const R = (nome: string) => an.fundacao.find((f) => f.caso === 'G' && f.pilar === s.modelo.pilares.find((p) => p.nome === nome)!.id)!.N;
      expect(R('P1')).toBeCloseTo(R('P2'), 2);
      expect(R('P3')).toBeCloseTo(R('P4'), 2);
      expect(R('P1')).toBeGreaterThan(R('P4') + 80);
      expect(estacao(an, p3.id, an.portico.barras.find((t) => t.ref === p3.id)!.pavimento).N).toBeLessThan(-190);
    }
  });

  it('momento no meio do vão ≈ P·ℓ/8 (extremos quase engastados) e o dimensionamento da viga relata a transição', () => {
    const { s, p3 } = transicao(1, 200);
    const an = analisarEdificio(s.modelo);
    const dim = dimensionarEdificio(s.modelo, an);
    const v = dim.vigas.find((x) => x.transicoes)!;
    expect(v.transicoes).toHaveLength(1);
    const tr = v.transicoes![0];
    expect(tr.pilar).toBe(p3.id);
    expect(tr.s).toBeCloseTo(3, 6);
    // Nd = 1,4·(200 + peso do lance de 25 × 25 cm × 3 m)
    expect(tr.Nd).toBeCloseTo(1.4 * (200 + 25 * 0.0625 * 3), 1);
    // pilares robustos nos extremos: viga quase biengastada, M ≈ Nd·ℓ/8 no meio e nos apoios (cálculo manual)
    const M = (tr.Nd * 6) / 8;
    expect(v.Mpos).toBeGreaterThan(0.95 * M);
    expect(v.Mpos).toBeLessThan(1.05 * M);
    expect(-v.Mneg).toBeGreaterThan(0.95 * M);
    expect(-v.Mneg).toBeLessThan(1.1 * M);
    // cortante junto às faces ≈ Nd/2 (mais o peso da viga)
    for (const x of tr.Vfaces) { expect(x).toBeGreaterThan(0.95 * tr.Nd / 2); expect(x).toBeLessThan(1.1 * tr.Nd / 2); }
    expect(tr.status).toBe('ok');
    // o pé do P5 não é apoio da viga: a cadeia segue contínua (sem Mneg mínimo nem redistribuição no meio do vão)
    expect(v.mensagens.some((m) => /^Transição: P5/.test(m))).toBe(true);
  });

  it('estribo bloqueado insuficiente: a transição reprova (VRd3 nas faces) e a revisão classifica as mensagens', () => {
    const { s, p3 } = transicao(1);
    const v = s.modelo.vigas.find((x) => x.pontos.every((q) => q[1] === 0))!;
    ok(s, 'viga.armadura', { id: v.id, inf: { n: 6, phi: 25 }, sup: { n: 6, phi: 25 }, estribo: { phi: 5, s: 0.3 } });
    const an = analisarEdificio(s.modelo), dim = dimensionarEdificio(s.modelo, an);
    const r = dim.vigas.find((x) => x.viga === v.id)!;
    expect(r.transicoes![0].status).toBe('fail');
    expect(r.status).toBe('fail');
    const rev = revisarEdificio(s.modelo, an, dim);
    expect(rev.itens.some((i) => i.codigo === 'TRANSICAO_CORTANTE' && i.id === v.id && i.nivel === 'erro')).toBe(true);
    expect(p3.id).toBeTruthy();
  });

  it('classificação das mensagens da transição', () => {
    expect(classificar('P5: ancoragem das esperas em V1 insuficiente: lb = 50 cm')).toMatchObject({ codigo: 'ARRANQUE_ANCORAGEM', nivel: 'erro' });
    expect(classificar('Transição P6 (Nd = 280,0 kN): cortante junto às faces 150,0 kN acima de VRd3 = 90,0 kN dos estribos adotados.')).toMatchObject({ codigo: 'TRANSICAO_CORTANTE', nivel: 'erro' });
    expect(classificar('Transição: P6 nasce sobre a viga (Nd = 280,0 kN)')).toMatchObject({ codigo: 'TRANSICAO', nivel: 'info' });
  });

  it('engaste da base do primeiro lance: opção da transição (0,3 no sistema, 1 no perfil NBR)', () => {
    const engI = (nbr: boolean, v?: number) => {
      const { s, p3 } = transicao(1);
      if (nbr) ok(s, 'opcoes.definir', { perfil: 'nbr' });
      if (v !== undefined) ok(s, 'opcoes.definir', { valores: { engasteTransicao: v } });
      const an = analisarEdificio(s.modelo);
      expect(an.erro).toBeUndefined();
      const bi = an.portico.barras.findIndex((t) => t.tipo === 'pilar' && t.ref === p3.id);
      expect(an.portico.barras[bi].transicao).toBe('viga');
      return an.portico.modelo.barras[bi].engI;
    };
    expect(engI(false)).toEqual([[4, 0.3], [5, 0.3]]);
    expect(engI(true)).toBeUndefined();
    expect(engI(false, 0.1)).toEqual([[4, 0.1], [5, 0.1]]);
    expect(engI(false, 1)).toBeUndefined();
  });

  it('esperas ancoradas na viga: reta, com gancho ou erro quando h − c não comporta', () => {
    const { s, p3 } = transicao(1);
    const an = analisarEdificio(s.modelo), dim = dimensionarEdificio(s.modelo, an);
    const d = detalharPilar(s.modelo, s.modelo.pilares.find((p) => p.id === p3.id)!, dim.pilares, an.opcoes)!;
    expect(d).toBeTruthy();
    const b0 = d.barras[0];
    // a espera desce abaixo da cota do pavimento em que o pilar nasce
    const zNasce = s.modelo.pavimentos.find((p) => p.id === p3.nasce)!.cota;
    expect(b0.z0).toBeLessThan(zNasce - 0.1);
    // viga baixa: não cabe nem com gancho
    const bBaixa: BuildingModel = { ...s.modelo, vigas: s.modelo.vigas.map((v) => ({ ...v, secao: { ...v.secao, h: 0.25 } })) };
    const dBaixa = detalharPilar(bBaixa, bBaixa.pilares.find((p) => p.id === p3.id)!, dim.pilares, an.opcoes)!;
    expect(dBaixa.avisos.some((a) => /ancoragem das esperas/.test(a))).toBe(true);
  });

  it('sobre laje: ligado no modelo integrado; no separado, apoio fixo provisório com aviso', () => {
    const s = padrao();
    const t1 = nomePav(s.modelo, 'Tipo 3'), g = s.modelo.pavimentos.find((p) => p.id === t1)!.grupo;
    ok(s, 'lote', { comandos: [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: ret(0.3, 0.3) } })) });
    ok(s, 'lote', { comandos: [[[0, 0], [6, 0]], [[6, 0], [6, 5]], [[6, 5], [0, 5]], [[0, 5], [0, 0]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: g, pontos: p, secao: { b: 0.2, h: 0.5 } } })) });
    ok(s, 'laje.detectarPanos', { grupo: g, tipo: { tipo: 'macica', h: 0.15 } });
    ok(s, 'pilar.inserir', { x: 3, y: 2.5, secao: ret(0.3, 0.3), nasce: t1 });
    const p5 = s.modelo.pilares.at(-1)!;
    ok(s, 'carga.pilar', { pilar: p5.id, caso: 'G', N: 100 });
    expect(apoioDoPilar(s.modelo, p5)).toMatchObject({ tipo: 'laje' });
    const anI = analisarEdificio(s.modelo);
    expect(anI.erro).toBeUndefined();
    expect(anI.apoiados?.[p5.id]?.ligado).toBe(true);
    const sep = analisarEdificio({ ...s.modelo, perfilOpcoes: 'nbr', opcoes: { modeloGlobal: 0 } } as BuildingModel);
    expect(sep.erro).toBeUndefined();
    expect(sep.apoiados?.[p5.id]?.ligado).toBe(false);
    expect(sep.avisos.some((a) => /apoio fixo provisório/.test(a))).toBe(true);
    // integrado: toda a carga vai aos quatro pilares de canto
    const soma = anI.fundacao.filter((f) => f.caso === 'G').reduce((t, f) => t + f.N, 0);
    expect(soma).toBeCloseTo(anI.totais.G, 3);
    expect(anI.fundacao.some((f) => f.pilar === p5.id)).toBe(false);
  });
});

describe('lances com geometria própria e fck por lance', () => {
  it('deslocamento do lance: trecho rígido horizontal; o primeiro lance só pelo pilar', () => {
    const s = padrao();
    ok(s, 'pilar.inserir', { x: 0, y: 0, secao: ret(0.4, 0.4) });
    const p = s.modelo.pilares[0], lances = lancesDoPilar(s.modelo, p);
    expect(s.executar('pilar.secaoLance', { id: p.id, pavimento: lances[0].id, dx: 0.1 }).ok).toBe(false);
    const topo = lances.at(-1)!.id;
    ok(s, 'pilar.secaoLance', { id: p.id, pavimento: topo, dx: 0.15, secao: ret(0.3, 0.3), angulo: 0, fck: 40 });
    const q = s.modelo.pilares[0];
    expect(q.secoes?.[0]).toMatchObject({ pavimento: topo, dx: 0.15 });
    expect(q.fck).toEqual([{ pavimento: topo, fck: 40 }]);
    ok(s, 'carga.pilar', { pilar: p.id, caso: 'G', N: 100 });
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toBeUndefined();
    // N excêntrica de 100 kN a 15 cm do eixo de baixo: momento na base ≥ 15 kN·m (mais o peso dos lances de cima)
    expect(Math.abs(an.fundacao.find((f) => f.caso === 'G')!.My)).toBeGreaterThan(14.9);
    // girar 90° em torno da origem: o deslocamento e o ponto fixo próprios do lance giram junto
    ok(s, 'pilar.secaoLance', { id: p.id, pavimento: topo, ajuste: 'ne', angulo: 10 });
    ok(s, 'editar.girar', { pilares: [p.id], centro: [0, 0], angulo: 90 });
    const g = s.modelo.pilares[0].secoes![0];
    expect(g.dx!).toBeCloseTo(0, 6); expect(g.dy!).toBeCloseTo(0.15, 6); expect(g.angulo).toBe(100);
    ok(s, 'editar.espelhar', { pilares: [p.id], eixo: [[0, 0], [1, 0]] });
    expect(s.modelo.pilares[0].secoes![0].ajuste).toBe('se');
    // remover o pavimento do lance leva o fck e a geometria do lance
    const pavAcima = s.modelo.pavimentos.find((x) => x.id === topo)!;
    ok(s, 'pavimento.remover', { id: pavAcima.id });
    expect(s.modelo.pilares[0].fck).toBeUndefined();
    expect(s.modelo.pilares[0].secoes).toBeUndefined();
    s.desfazer(); s.desfazer(); s.desfazer();
    // voltar tudo
    ok(s, 'pilar.secaoLance', { id: p.id, pavimento: topo });
    expect(s.modelo.pilares[0].secoes).toBeUndefined();
    expect(s.modelo.pilares[0].fck).toBeUndefined();
  });
});
