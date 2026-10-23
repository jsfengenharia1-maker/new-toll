// Frente E2e, parte 2: consolos na análise (viga sem momento na face, apoio no centro do aparelho, momento V·e no pilar), comandos,
// vínculo externo contínuo e vigas pré-moldadas (ficha, içamento), contra equilíbrio e cálculo manual.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio, porCaso } from './dimensionamento';
import { revisarEdificio } from './revisao';
import { verificar } from './verify';
import { momentoResistente } from './premoldadas';

function sessao() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
  ok('vento.definir', { ativo: false });
  ok('opcoes.definir', { valores: { modeloGlobal: 0 } });
  return { s, ok };
}
const calc = (s: Sessao) => { const an = analisarEdificio(s.modelo); expect(an.erro).toBeUndefined(); return { an, d: dimensionarEdificio(s.modelo, an) }; };

/** Painel 6 × 4 m: 4 pilares 30 × 30, 4 vigas 20 × 50 e laje maciça de 12 cm no grupo g_3. A viga V da frente (y = 0) é a primeira. */
function painel() {
  const { s, ok } = sessao();
  ok('lote', { comandos: [[0, 0], [6, 0], [6, 4], [0, 4]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 } } })) });
  ok('lote', { comandos: [[[0, 0], [6, 0]], [[6, 0], [6, 4]], [[6, 4], [0, 4]], [[0, 4], [0, 0]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.2, h: 0.5 } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  return { s, ok, v: s.modelo.vigas[0], P1: s.modelo.pilares[0], P2: s.modelo.pilares[1] };
}
/** Dois pilares 30 × 30 (0,0) e (L,0) e uma viga 20 × 50 entre eles, só com o peso próprio. */
function umaViga(L = 6) {
  const { s, ok } = sessao();
  ok('lote', { comandos: [[0, 0], [L, 0]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 } } })) });
  ok('viga.tracar', { grupo: 'g_3', pontos: [[0, 0], [L, 0]], secao: { b: 0.2, h: 0.5 } });
  return { s, ok, v: s.modelo.vigas[0], P1: s.modelo.pilares[0], P2: s.modelo.pilares[1] };
}

describe('E2e: comandos do consolo', () => {
  it('criar valida a ponta na face, duplicidade e largura; editar, redimensionar e remover', () => {
    const { s, ok, v, P1 } = umaViga();
    expect(s.executar('consolo.criar', { viga: v.id, ponta: 'ini', pilar: 'xx' }).ok).toBe(false);
    expect(s.executar('consolo.criar', { viga: v.id, ponta: 'ini', pilar: s.modelo.pilares[1].id }).ok).toBe(false); // ponta inicial longe do P2
    expect(s.executar('consolo.criar', { viga: v.id, ponta: 'ini', pilar: P1.id, b: 0.5 }).ok).toBe(false); // mais largo que a face
    ok('consolo.criar', { viga: v.id, ponta: 'ini', pilar: P1.id, a: 0.2 });
    expect(s.executar('consolo.criar', { viga: v.id, ponta: 'ini', pilar: P1.id }).ok).toBe(false); // já tem consolo
    const c = s.modelo.consolos![0];
    expect(c.nome).toBe('C1');
    expect(c.face).toBeGreaterThanOrEqual(0);
    expect(c.hp).toBeCloseTo(c.h / 2, 9);
    expect(verificar(s.modelo).filter((x) => x.codigo.startsWith('CONSOLO'))).toEqual([]);
    const arm = { tirante: { n: 4, phi: 16 }, horizontais: { n: 3, phi: 8 }, verticais: { phi: 6.3, s: 0.15 } };
    ok('consolo.editar', { id: c.id, armadura: arm });
    expect(s.modelo.consolos![0].armadura).toBeDefined();
    ok('consolo.editar', { id: c.id, h: 0.55, hp: 0.3 }); // geometria nova solta a armadura
    expect(s.modelo.consolos![0].armadura).toBeUndefined();
    ok('consolo.editar', { id: c.id, armadura: arm });
    ok('consolo.redimensionar', {});
    expect(s.modelo.consolos![0].armadura).toBeUndefined();
    expect(s.executar('consolo.editar', { id: c.id, hp: 0.9 }).ok).toBe(false); // ponta maior que a face
    ok('consolo.remover', { ids: [c.id] });
    expect(s.modelo.consolos).toBeUndefined();
    // remover a viga leva o consolo
    ok('consolo.criar', { viga: v.id, ponta: 'fim', pilar: s.modelo.pilares[1].id });
    ok('viga.remover', { ids: [v.id] });
    expect(s.modelo.consolos).toBeUndefined();
  });
});

describe('E2e: consolo na análise', () => {
  it('a viga fica sem momento na face e a vertical chega ao pilar com o momento V·e', () => {
    const { s, ok, v, P1, P2 } = painel();
    const sem = calc(s);
    const Msem = sem.d.vigas[0].envoltoria.pontos[0].Mmin;
    expect(Msem).toBeLessThan(-5); // engastada no pilar
    ok('consolo.criar', { viga: v.id, ponta: 'ini', pilar: P1.id, a: 0.2 });
    ok('consolo.criar', { viga: v.id, ponta: 'fim', pilar: P2.id, a: 0.2 });
    const com = calc(s);
    const pts = com.d.vigas[0].envoltoria.pontos;
    expect(Math.abs(pts[0].Mmin)).toBeLessThan(0.5);
    expect(Math.abs(pts[pts.length - 1].Mmin)).toBeLessThan(0.5);
    expect(Math.max(...pts.map((p) => p.Mmax))).toBeGreaterThan(Math.max(...sem.d.vigas[0].envoltoria.pontos.map((p) => p.Mmax))); // vão maior momento positivo
    // Vd do consolo = cortante de cálculo na ponta da viga
    const [c1, c2] = com.d.consolos!;
    expect(c1.Vd).toBeCloseTo(Math.max(Math.abs(pts[0].Vmax), Math.abs(pts[0].Vmin)), 9);
    expect(c1.Vd).toBeGreaterThan(20);
    expect(c2.pilar).toBe(P2.id);
    // trecho rígido do eixo do pilar até o centro do aparelho: 0,15 (meia seção) + 0,20 (a) = 0,35 m nas duas pontas
    const bi = com.an.portico.barras.findIndex((t) => t.tipo === 'viga' && t.ref === v.id), br = com.an.portico.modelo.barras[bi];
    expect(Math.hypot(...(br.offI ?? [0, 0, 0]))).toBeCloseTo(0.35, 6);
    expect(Math.hypot(...(br.offJ ?? [0, 0, 0]))).toBeCloseTo(0.35, 6);
    // a excentricidade leva o momento V·e ao pilar: o momento no topo do pilar cresce em relação ao apoio no eixo
    const bp = (an: ReturnType<typeof calc>['an']) => an.portico.barras.findIndex((t) => t.tipo === 'pilar' && t.ref === P1.id && t.pavimento === s.modelo.pavimentos[1].id);
    const Mtopo = (an: ReturnType<typeof calc>["an"]) => { const e = porCaso(an, bp(an), [3 - 0.3]).G.at(-1)!; return Math.hypot(e.My, e.Mz); };
    const Mcom = Mtopo(com.an);
    ok('opcoes.definir', { valores: { consoloExcentricidade: 0 } });
    const sem2 = calc(s);
    expect(Math.hypot(...(sem2.an.portico.modelo.barras[bi].offI ?? [0, 0, 0]))).toBeLessThan(0.3); // volta ao trecho rígido até a face
    expect(Mcom).toBeGreaterThan(Mtopo(sem2.an) + 0.5);
  });
  it('equilíbrio vertical: as reações somam a mesma carga com e sem consolo', () => {
    const { s, ok, v, P1, P2 } = painel();
    const soma = (an: ReturnType<typeof calc>['an']) => an.fundacao.filter((f) => f.caso === 'G').reduce((t, f) => t + f.N, 0);
    const N0 = soma(calc(s).an);
    ok('consolo.criar', { viga: v.id, ponta: 'ini', pilar: P1.id, a: 0.2 });
    ok('consolo.criar', { viga: v.id, ponta: 'fim', pilar: P2.id, a: 0.2 });
    expect(soma(calc(s).an)).toBeCloseTo(N0, 1);
  });
  it('consolo reprovado entra na revisão; área de aparelho maior resolve', () => {
    const { s, ok, v, P1 } = painel();
    ok('consolo.criar', { viga: v.id, ponta: 'ini', pilar: P1.id, a: 0.2, h: 0.4, hp: 0.2, aparelho: { l: 0.2, b: 0.2 } });
    ok('consolo.editar', { id: s.modelo.consolos![0].id, h: 0.4, hp: 0.1 }); // ponta menor que h/2
    const { an, d } = calc(s);
    expect(d.consolos![0].status).toBe('fail');
    const rev = revisarEdificio(s.modelo, an, d);
    expect(rev.itens.some((i) => i.tipo === 'consolo' && i.codigo === 'CONSOLO_GEOMETRIA')).toBe(true);
    expect(rev.porElemento.get(`consolo|${d.consolos![0].consolo}`)).toBe('erro');
    ok('consolo.editar', { id: s.modelo.consolos![0].id, h: 0.5, hp: 0.25, c: 0.5 });
    const r = calc(s).d.consolos![0];
    expect(r.mensagens.filter((m) => /geometria/.test(m))).toEqual([]);
  });
});

describe('E2e: vínculo externo contínuo', () => {
  function muro(tipo: 'engaste' | 'articulacao' | 'deslizante') {
    const { s, ok } = sessao();
    ok('lote', { comandos: [[0, 0], [8, 0]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 } } })) });
    ok('viga.tracar', { grupo: 'g_3', pontos: [[1, 2], [7, 2]], secao: { b: 0.2, h: 0.4 } });
    ok('carga.linha', { grupo: 'g_3', pontos: [[1, 2], [7, 2]], valor: 30, caso: 'G' });
    ok('viga.editar', { id: s.modelo.vigas[0].id, vinculoExterno: tipo });
    return { s, ok };
  }
  const nosDaViga = (an: ReturnType<typeof calc>['an']) => [...an.portico.modelo.apoios].filter(([n]) => Math.abs(an.portico.modelo.nos[n][1] - 2) < 1e-6 && Math.abs(an.portico.modelo.nos[n][2] - 3) < 1e-6 && an.portico.modelo.nos[n][0] > 0.9 && an.portico.modelo.nos[n][0] < 7.1);
  it('articulação: apoios a cada nó, momentos desprezíveis, reações somam a carga', () => {
    const { s } = muro('articulacao');
    const { an, d } = calc(s);
    const nos = nosDaViga(an);
    expect(nos.length).toBeGreaterThanOrEqual(24); // nós a cada ≤ 0,25 m ao longo dos 6 m
    expect(Math.max(...d.vigas[0].envoltoria.pontos.map((p) => Math.max(Math.abs(p.Mmax), Math.abs(p.Mmin))))).toBeLessThan(3);
    expect(d.vigas[0].status).toBe('ok');
    expect(d.vigas[0].mensagens.some((m) => /^Vínculo externo: a viga simula/.test(m))).toBe(true);
    let soma = 0;
    for (const [n] of nos) soma += an.portico.res!.reacoes[0].get(n)?.[2] ?? 0;
    expect(soma).toBeCloseTo(30 * 6 + 25 * 0.2 * 0.4 * 6, 0); // carga linear + peso próprio
    expect(verificar(s.modelo).filter((x) => x.codigo === 'VINCULO_PILAR')).toEqual([]);
  });
  it('equivale à viga com apoios fixos a cada nó', () => {
    // viga de referência: seção comum, mesma carga, apoios w presos em cada nó do pórtico ao longo dela (modelo de referência montado à mão)
    const { s } = muro('articulacao');
    const { an } = calc(s);
    const nos = nosDaViga(an);
    const rs = nos.map(([n]) => an.portico.res!.reacoes[0].get(n)![2]);
    // carga uniforme com apoio a cada nó: reação ≈ q·passo em cada nó interno (a menos dos extremos, com meio passo)
    const interno = rs.filter((_, k) => k > 0 && k < rs.length - 1);
    const med = interno.reduce((t, r) => t + r, 0) / interno.length;
    for (const r of interno) expect(Math.abs(r - med)).toBeLessThan(0.05 * med);
    expect(med).toBeCloseTo((30 + 25 * 0.2 * 0.4) * (6 / (nos.length - 1)), 1);
  });
  it('deslizante: sem reação horizontal nos nós; engaste prende os giros', () => {
    const { s } = muro('deslizante');
    const { an } = calc(s);
    let H = 0;
    for (const [n] of nosDaViga(an)) { const r = an.portico.res!.reacoes[0].get(n) ?? [0, 0, 0]; H += Math.abs(r[0]) + Math.abs(r[1]); }
    expect(H).toBeLessThan(0.01);
    const e = muro('engaste');
    expect(nosDaViga(calc(e.s).an).every(([, dofs]) => dofs.length === 6)).toBe(true);
  });
  it('pilar coincidente gera o aviso VINCULO_PILAR', () => {
    const { s, ok } = sessao();
    ok('pilar.inserir', { x: 3, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
    ok('pilar.inserir', { x: 0, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
    ok('viga.tracar', { grupo: 'g_3', pontos: [[0, 0], [6, 0]], secao: { b: 0.2, h: 0.4 } });
    ok('viga.editar', { id: s.modelo.vigas[0].id, vinculoExterno: 'articulacao' });
    expect(verificar(s.modelo).some((x) => x.codigo === 'VINCULO_PILAR')).toBe(true);
    ok('viga.editar', { id: s.modelo.vigas[0].id, vinculoExterno: 'nenhum' });
    expect(s.modelo.vigas[0].vinculoExterno).toBeUndefined();
  });
});

describe('E2e: vigas pré-moldadas', () => {
  it('armada: articulada por padrão e içamento contra o cálculo manual', () => {
    const { s, ok, v } = umaViga(6);
    const mono = calc(s);
    expect(Math.abs(mono.d.vigas[0].envoltoria.pontos[0].Mmin)).toBeGreaterThan(1);
    ok('viga.editar', { id: v.id, premoldada: { tipo: 'armada' } });
    const { an, d } = calc(s);
    expect(Math.abs(d.vigas[0].envoltoria.pontos[0].Mmin)).toBeLessThan(0.5);
    const pm = d.premoldadas![0];
    expect(pm.tipo).toBe('armada');
    expect(pm.ligacoes).toBe('articuladas');
    // içamento: a = 0,2·6 = 1,2 m; peso 25·0,2·0,5 = 2,5 kN/m; qd = 1,4·1,3·2,5 = 4,55 kN/m
    const ic = pm.icamento!;
    expect(ic.a).toBeCloseTo(1.2, 9);
    expect(ic.peso).toBeCloseTo(2.5, 9);
    expect(ic.qd).toBeCloseTo(4.55, 9);
    expect(ic.MsdNeg).toBeCloseTo((4.55 * 1.2 * 1.2) / 2, 9); // 3,276 kN·m
    expect(ic.MsdPos).toBeCloseTo((4.55 * 3.6 * 3.6) / 8 - 3.276, 9); // 4,095 kN·m
    // bloco retangular: As = 5 cm², b = 0,2, d = 0,45, fcd = 25/1,3 MPa, fyd = 434,78 MPa
    const fcd = 25 / 1.3, fyd = 500 / 1.15, x = (5e-4 * fyd) / (0.68 * 0.2 * fcd);
    expect(momentoResistente(0.2, 0.45, 5e-4, fcd, fyd)).toBeCloseTo(5e-4 * fyd * (0.45 - 0.4 * x) * 1000, 6);
    expect(an.opcoes.premoldadaArticulada).toBe(1);
    // a opção desligada volta ao vínculo das demais vigas; o engaste informado prevalece
    ok('opcoes.definir', { valores: { premoldadaArticulada: 0 } });
    expect(calc(s).d.premoldadas![0].ligacoes).toBe('como as demais vigas');
    ok('opcoes.definir', { valores: { premoldadaArticulada: 1 } });
    ok('viga.editar', { id: v.id, vinculoIni: 'engaste', vinculoFim: 'engaste' });
    expect(calc(s).d.premoldadas![0].ligacoes).toBe('engaste informado');
  });
  it('içamento: a posição da viga prevalece e pontos mal posicionados aumentam o momento positivo', () => {
    const { s, ok, v } = umaViga(10);
    ok('viga.editar', { id: v.id, premoldada: { tipo: 'armada', icamento: 0.5 } });
    const { d } = calc(s);
    const ic = d.premoldadas![0].icamento!;
    expect(ic.a).toBe(0.5);
    expect(ic.MsdPos).toBeGreaterThan(ic.MsdNeg * 10);
    expect(s.executar('viga.editar', { id: v.id, premoldada: { tipo: 'armada', icamento: 6 } }).ok).toBe(false);
  });
  it('ficha: rigidez e peso do fabricante e verificação contra MRd e VRd', () => {
    const { s, ok, v } = umaViga(6);
    expect(s.executar('viga.editar', { id: v.id, premoldada: { tipo: 'ficha' } }).ok).toBe(false); // sem ficha
    const ficha = { nome: 'VP-30', classe: 'protendida' as const, EI: 25000, peso: 3, MRdPos: 300, VRd: 250 };
    ok('viga.editar', { id: v.id, premoldada: { tipo: 'ficha', ficha } });
    const { d } = calc(s);
    const pm = d.premoldadas![0], fv = pm.ficha!;
    // biapoiada só com o peso da ficha (3 kN/m): M = 1,4·3·6²/8 = 18,9 kN·m e V = 1,4·3·3 = 12,6 kN
    expect(fv.MsdPos).toBeCloseTo(18.9, 1);
    expect(fv.Vsd).toBeCloseTo(12.6, 1);
    expect(fv.utilPos).toBeCloseTo(fv.MsdPos / 300, 9);
    expect(fv.utilV).toBeCloseTo(fv.Vsd / 250, 9);
    expect(pm.status).toBe('ok');
    expect(d.vigas[0].status).toBe('ok');
    // ficha fraca reprova, sai na revisão e o status da viga segue a ficha
    ok('viga.editar', { id: v.id, premoldada: { tipo: 'ficha', ficha: { ...ficha, MRdPos: 10, VRd: 10 } } });
    const r = calc(s);
    expect(r.d.premoldadas![0].status).toBe('fail');
    expect(r.d.vigas[0].status).toBe('fail');
    expect(revisarEdificio(s.modelo, r.an, r.d).itens.some((i) => i.codigo === 'PREMOLDADA_FICHA')).toBe(true);
  });
  it('a rigidez e o peso da ficha entram na análise', () => {
    const a = umaViga(6), b = umaViga(6);
    a.ok('viga.editar', { id: a.v.id, premoldada: { tipo: 'ficha', ficha: { nome: 'F', EI: 1e5, peso: 6, MRdPos: 500, VRd: 500 } } });
    b.ok('viga.editar', { id: b.v.id, premoldada: { tipo: 'ficha', ficha: { nome: 'F', EI: 1e5, peso: 3, MRdPos: 500, VRd: 500 } } });
    const ra = calc(a.s).d.premoldadas![0].ficha!, rb = calc(b.s).d.premoldadas![0].ficha!;
    expect(ra.MsdPos / rb.MsdPos).toBeCloseTo(2, 2); // peso dobrado → momento dobrado
    const c = umaViga(6);
    c.ok('viga.editar', { id: c.v.id, vinculoIni: 'engaste', vinculoFim: 'engaste', premoldada: { tipo: 'ficha', ficha: { nome: 'F', EI: 2.5e3, peso: 3, MRdPos: 500, VRd: 500 } } });
    const e = umaViga(6);
    e.ok('viga.editar', { id: e.v.id, vinculoIni: 'engaste', vinculoFim: 'engaste', premoldada: { tipo: 'ficha', ficha: { nome: 'F', EI: 2.5e6, peso: 3, MRdPos: 500, VRd: 500 } } });
    // viga engastada nos pilares: a viga mais rígida que os pilares atrai menos momento de engastamento (EI pequeno → ≈ q·ℓ²/12)
    expect(calc(e.s).d.premoldadas![0].ficha!.MsdNeg).toBeLessThan(calc(c.s).d.premoldadas![0].ficha!.MsdNeg);
  });
});

describe('E2e: consolo, vínculo externo e pré-moldada juntos no painel', () => {
  it('analisa, dimensiona, gera memorial e prancha sem erro', async () => {
    const { s, ok, v, P1 } = painel();
    ok('consolo.criar', { viga: v.id, ponta: 'ini', pilar: P1.id, a: 0.2 });
    const [, , v3, v4] = s.modelo.vigas;
    ok('viga.editar', { id: v4.id, vinculoExterno: 'articulacao' });
    ok('viga.editar', { id: v3.id, premoldada: { tipo: 'armada' } });
    const { an, d } = calc(s);
    expect(d.consolos).toHaveLength(1);
    expect(d.premoldadas).toHaveLength(1);
    expect(d.vigas.find((x) => x.viga === v4.id)!.status).toBe('ok');
    expect(an.avisos.some((a) => /^Vínculo externo: o pilar/.test(a))).toBe(true);
    const { memorialConsolos } = await import('./memorialConsolos');
    const m = memorialConsolos(s.modelo, d, an.opcoes);
    expect(m.tabelas.map((t) => t.id)).toEqual(['consolos', 'consolos-armadura', 'vinculo-externo', 'premoldadas']);
    expect(m.relatorios).toHaveLength(1);
    const { montarPranchasPilares } = await import('../sheets/armacaoPilares');
    const pr = montarPranchasPilares(s.modelo, an, d);
    expect(pr.some((p) => p.elementos?.some((e: string) => /^Consolo /.test(e)))).toBe(true);
  });
});
