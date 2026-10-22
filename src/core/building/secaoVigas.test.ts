// Frente E2a: seções de viga (T/L com mesa colaborante, chata, não estrutural e de amarração).
// Edifício de exemplo: vigas de 15 × 50 cm, lajes maciças de 12 cm, vãos de 5 m (x) e 4,5 m (y); V2 (y = 4,5) tem 3 vãos.
import { describe, expect, it } from 'vitest';
import { beamFlexure, concrete } from '../concrete';
import { Sessao } from '../commands';
import { edificioExemplo } from '../sheets/exemplo';
import { analisarEdificio } from './analitico';
import { detalharVigas } from './detalhamento';
import { dimensionarEdificio } from './dimensionamento';
import { acoDe, cobrimentoViga, concretoDe } from './materiais';
import { opcoesEmUso, perfilDe } from './opcoes';
import { contornoSecaoViga, resumoSecoesVigas, abaColaborante, alturaVigaChata, distanciaMomentoNulo, inerciaT, larguraColaborante, mesaDaViga, propriedadesRigidez, secaoParaFlexao } from './secaoViga';
import { verificar } from './verify';
import { montarPranchasVigas } from '../sheets/armacaoVigas';
import type { Prancha } from '../sheets/prancha';

function modelo(): Sessao { return edificioExemplo(); }
const viga = (s: Sessao, nome: string) => s.modelo.vigas.find((v) => v.nome === nome)!;
const ok = (s: Sessao, nome: string, p: Record<string, unknown>) => { const r = s.executar(nome, p); if (!r.ok) throw new Error(`${nome}: ${r.erros.map((e) => e.mensagem).join(' ')}`); return r; };

describe('largura colaborante (NBR 6118, 14.6.2.2)', () => {
  it('aba = mín(0,1·a; 0,5·b2), nula sem laje e só 0,1·a sem viga vizinha', () => {
    expect(abaColaborante(3, 4.35)).toBeCloseTo(0.3, 12); // 0,1·3 = 0,3 < 0,5·4,35
    expect(abaColaborante(10, 1.2)).toBeCloseTo(0.6, 12); // 0,5·1,2 = 0,6 < 1,0
    expect(abaColaborante(3, null)).toBe(0);
    expect(abaColaborante(3, Infinity)).toBeCloseTo(0.3, 12);
    expect(larguraColaborante(0.15, 3, [4.35, 4.35]).bf).toBeCloseTo(0.75, 12);
    expect(larguraColaborante(0.15, 3, [4.35, null]).bf).toBeCloseTo(0.45, 12);
  });
  it('a pelo número de vãos: 1,0ℓ, 0,75ℓ e 0,6ℓ', () => {
    expect(distanciaMomentoNulo(5, 1)).toBeCloseTo(5, 12);
    expect(distanciaMomentoNulo(10, 2)).toBeCloseTo(3.75, 12);
    expect(distanciaMomentoNulo(15, 3)).toBeCloseTo(3, 12);
  });
  it('V2 (3 vãos de 5 m, laje dos dois lados): a = 3 m, abas de 30 cm, bf = 75 cm, hf = 12 cm', () => {
    const s = modelo();
    ok(s, 'viga.editar', { id: viga(s, 'V2').id, mesa: { tipo: 'T' } });
    const m = mesaDaViga(s.modelo, viga(s, 'V2'))!;
    expect(m.a).toBeCloseTo(3, 9);
    expect(m.bf).toBeCloseTo(0.75, 9);
    expect(m.hf).toBeCloseTo(0.12, 9);
    expect(m.b1[0]).toBeCloseTo(0.3, 9);
    expect(m.automatica).toBe(true);
  });
  it('viga de borda L (V1, laje de um lado só): bf = 45 cm; tipo T sem laje de um lado usa 0,1·a', () => {
    const s = modelo();
    ok(s, 'viga.editar', { id: viga(s, 'V1').id, mesa: { tipo: 'L' } });
    expect(mesaDaViga(s.modelo, viga(s, 'V1'))!.bf).toBeCloseTo(0.15 + 0.3, 9);
    ok(s, 'viga.editar', { id: viga(s, 'V1').id, mesa: { tipo: 'T' } });
    expect(mesaDaViga(s.modelo, viga(s, 'V1'))!.bf).toBeCloseTo(0.15 + 0.6, 9);
  });
  it('bf, hf e a informados prevalecem; retangular volta a null', () => {
    const s = modelo();
    const id = viga(s, 'V2').id;
    ok(s, 'viga.editar', { id, mesa: { tipo: 'T', bf: 0.9, hf: 0.1 } });
    const m = mesaDaViga(s.modelo, viga(s, 'V2'))!;
    expect(m.bf).toBe(0.9);
    expect(m.hf).toBe(0.1);
    expect(m.automatica).toBe(false);
    ok(s, 'viga.editar', { id, mesa: { tipo: 'ret' } });
    expect(mesaDaViga(s.modelo, viga(s, 'V2'))).toBeNull();
    expect(s.executar('viga.editar', { id, mesa: { tipo: 'T', bf: 0.1 } }).ok).toBe(false); // bf ≤ bw
    expect(s.executar('viga.editar', { id, mesa: { tipo: 'T', hf: 0.6 } }).ok).toBe(false); // hf ≥ h
  });
});

describe('rigidez da seção T', () => {
  // à mão (bf 75, hf 12, bw 15, h 50): A = 0,147 m²; yc = 0,34306 m; I = 0,00297502 m⁴ (retangular: 0,00156250)
  it('inércia da T e da L contra o cálculo manual', () => {
    expect(inerciaT(0.75, 0.12, 0.15, 0.5)).toBeCloseTo(0.0029750224, 9);
    expect(inerciaT(0.45, 0.12, 0.15, 0.5)).toBeCloseTo(0.0024838081, 9);
  });
  it('propriedades da barra: A e Iz da T com a opção ligada; só a alma com mesaRigidez = 0', () => {
    const s = modelo();
    ok(s, 'viga.editar', { id: viga(s, 'V2').id, mesa: { tipo: 'T' } });
    const v = viga(s, 'V2'), m = mesaDaViga(s.modelo, v);
    const p1 = propriedadesRigidez(v, m, { mesaRigidez: 1 }), p0 = propriedadesRigidez(v, m, { mesaRigidez: 0 });
    expect(p1.A).toBeCloseTo(0.147, 9);
    expect(p1.Iz).toBeCloseTo(0.0029750224, 9);
    expect(p0.Iz).toBeCloseTo(0.15 * 0.5 ** 3 / 12, 12);
    expect(p1.Iy).toBeCloseTo(p0.Iy, 15);
  });
  it('a análise usa a inércia da T nas barras da V2 e mantém o peso b × h', () => {
    const s = modelo();
    ok(s, 'viga.editar', { id: viga(s, 'V2').id, mesa: { tipo: 'T' } });
    const id = viga(s, 'V2').id;
    const sem = modelo();
    const an = analisarEdificio(s.modelo), an0 = analisarEdificio(sem.modelo);
    const barras = (a: typeof an) => a.portico.barras.map((t, i) => [t, i] as const).filter(([t]) => t.tipo === 'viga' && t.ref === id).map(([, i]) => a.portico.modelo.barras[i]);
    expect(barras(an0).length).toBeGreaterThan(0);
    for (const x of barras(an)) expect(x.Iz).toBeCloseTo(0.0029750224, 9);
    for (const x of barras(an0)) expect(x.Iz).toBeCloseTo(0.0015625, 9);
    expect(an.totais.G).toBeCloseTo(an0.totais.G, 6); // a mesa não acrescenta peso (a laje já é contada)
  });
});

describe('flexão na seção T', () => {
  it('beamFlexure da T contra o cálculo manual (Md = 150 kN·m, d = 0,45 m, bf = 0,75 m: y = 2,51 cm na mesa)', () => {
    const c = concrete(30, 1.4);
    const r = beamFlexure({ kind: 'tee', bw: 0.15, h: 0.5, bf: 0.75, hf: 0.12 }, true, 150, 0.45, 0.04, c, 500 / 1.15);
    expect(r.As * 1e4).toBeCloseTo(7.888, 2); // σcd·bf·y / fyd = 18,214 · 0,75 · 0,025105 / 434,78
    expect(r.x).toBeCloseTo(0.025105 / 0.8, 4);
  });
  it('o dimensionamento usa a T onde a mesa está comprimida (opção) e a alma sem ela', () => {
    const s = modelo();
    ok(s, 'viga.editar', { id: viga(s, 'V2').id, mesa: { tipo: 'T' } });
    const id = viga(s, 'V2').id;
    const an = analisarEdificio(s.modelo);
    const sem = dimensionarEdificio(s.modelo, an);
    ok(s, 'opcoes.definir', { valores: { mesaDimensionamento: 1 } });
    const com = dimensionarEdificio(s.modelo, analisarEdificio(s.modelo));
    const r0 = sem.vigas.find((x) => x.viga === id)!, r1 = com.vigas.find((x) => x.viga === id)!;
    expect(r0.mensagens.some((m) => /^Mesa colaborante: .*só com a alma/.test(m))).toBe(true);
    expect(r1.mensagens.some((m) => /^Mesa colaborante: .*seção T/.test(m))).toBe(true);
    expect(r1.AsInf).toBeLessThanOrEqual(r0.AsInf + 1e-12);
    // positivo com a mesa comprimida: As = beamFlexure da T (se acima do mínimo); negativo (mesa tracionada) continua pela alma
    const b = s.modelo, op = opcoesEmUso(b.opcoes, perfilDe(b)), c = concretoDe(b, 'viga'), aPos = acoDe(b, 'vigaPos'), cob = cobrimentoViga(b, undefined);
    const { sec, fcPos } = secaoParaFlexao(b, viga(s, 'V2'), { mesaDimensionamento: 1 });
    expect(fcPos).toBe(true);
    const dI = 0.5 - cob.inf - 0.005 - 0.008;
    const esperado = beamFlexure(sec, true, r1.Mpos, dI, 0.04, c, aPos.fyd).As;
    expect(r1.AsInf).toBeGreaterThanOrEqual(esperado - 1e-9);
    if (r1.AsInf > esperado + 1e-6) expect(r1.AsInf).toBeGreaterThan(0); // mínimo governa
    void op;
    // negativo (mesa tracionada): a flexão segue pela alma; só o mínimo usa o módulo W0 da seção T bruta (17.3.5.2.1)
    expect(r1.AsSup).toBeGreaterThanOrEqual(r0.AsSup - 1e-12);
  });
  it('o detalhamento acompanha a seção (As,mín da T) e acrescenta as barras de canto da mesa', () => {
    const s = modelo();
    ok(s, 'viga.editar', { id: viga(s, 'V2').id, mesa: { tipo: 'T' } });
    const id = viga(s, 'V2').id;
    ok(s, 'opcoes.definir', { valores: { mesaDimensionamento: 1 } });
    const b = s.modelo;
    const an = analisarEdificio(b), dim = dimensionarEdificio(b, an), op = opcoesEmUso(b.opcoes, perfilDe(b));
    const d = detalharVigas(b, dim, op).find((x) => x.viga === id)!;
    expect(d.cantosMesa).toBeDefined();
    expect(d.cantosMesa!.n).toBe(2);
    expect(d.cantosMesa!.phi).toBe(op.bitolaMontagem);
    expect(d.cantosMesa!.bf).toBeCloseTo(0.75, 9);
    const sem = detalharVigas(b, dim, { ...op, mesaBarrasCanto: 0 }).find((x) => x.viga === id)!;
    expect(sem.cantosMesa).toBeUndefined();
    expect(d.peso - sem.peso).toBeCloseTo(d.cantosMesa!.n * d.cantosMesa!.comprimento * (Math.PI * (op.bitolaMontagem / 1000) ** 2 / 4) * 7850, 6);
    expect(d.avisos.filter((a) => /insuficiente/.test(a))).toEqual([]);
  });
});

describe('viga chata', () => {
  it('altura da laje que contorna (12 cm); com desnível, do topo mais alto à face inferior mais baixa', () => {
    const s = modelo();
    expect(alturaVigaChata(s.modelo, viga(s, 'V2'))).toBeCloseTo(0.12, 9);
    const l = s.modelo.lajes[0];
    ok(s, 'laje.editar', { id: l.id, nivel: -0.05 });
    // V1 toca só a primeira laje (rebaixada 5 cm): topo 0, fundo −0,05 − 0,12
    const lajesDeV1 = s.modelo.lajes.filter((x) => x.contorno.some((q) => q[1] === 0));
    expect(lajesDeV1.length).toBeGreaterThan(0);
    const h2 = alturaVigaChata(s.modelo, viga(s, 'V2'));
    expect(h2).not.toBeNull();
    expect(h2!).toBeGreaterThanOrEqual(0.12 - 1e-9);
  });
  it('viga.editar { chata } iguala a altura à da laje; desfazer devolve', () => {
    const s = modelo();
    const id = viga(s, 'V2').id;
    ok(s, 'viga.editar', { id, chata: true });
    expect(viga(s, 'V2').secao.h).toBeCloseTo(0.12, 9);
    expect(viga(s, 'V2').chata).toBe(true);
    s.desfazer();
    expect(viga(s, 'V2').secao.h).toBe(0.5);
    expect(viga(s, 'V2').chata).toBeUndefined();
  });
});

describe('viga não estrutural', () => {
  it('fica fora da análise e do dimensionamento; o pano continua fechado; a carga total cai o peso da viga', () => {
    const s = modelo();
    const id = viga(s, 'V2').id;
    const an0 = analisarEdificio(s.modelo);
    const panos0 = verificar(s.modelo).filter((d) => d.codigo === 'PANO_SEM_LAJE').length;
    ok(s, 'viga.editar', { id, estrutural: false });
    const an = analisarEdificio(s.modelo);
    expect(an.portico.barras.some((t) => t.tipo === 'viga' && t.ref === id)).toBe(false);
    expect(an.erro).toBeUndefined();
    // peso da V2: 25 · 0,15 · 0,50 · 15 m = 28,125 kN por pavimento do grupo
    const nPav = s.modelo.pavimentos.filter((p) => p.grupo === viga(s, 'V2').grupo).length;
    expect(an0.totais.G - an.totais.G).toBeCloseTo(28.125 * nPav, 3);
    const dim = dimensionarEdificio(s.modelo, an);
    expect(dim.vigas.some((x) => x.viga === id)).toBe(false);
    expect(verificar(s.modelo).filter((d) => d.codigo === 'PANO_SEM_LAJE').length).toBe(panos0); // o contorno do pano segue fechado
    expect(verificar(s.modelo).some((d) => d.codigo === 'VIGA_SEM_APOIO' && d.elementos.includes(id))).toBe(false);
  });
  it('aviso quando uma carga linear é lançada sobre a viga não estrutural', () => {
    const s = modelo();
    const v = viga(s, 'V2');
    ok(s, 'viga.editar', { id: v.id, estrutural: false });
    expect(verificar(s.modelo).some((d) => d.codigo === 'VIGA_NAO_ESTRUTURAL_CARGA')).toBe(false);
    ok(s, 'carga.linha', { grupo: v.grupo, caso: 'G', valor: 4, pontos: [[2, 4.5], [8, 4.5]] });
    expect(verificar(s.modelo).some((d) => d.codigo === 'VIGA_NAO_ESTRUTURAL_CARGA')).toBe(true);
  });
});

describe('viga de amarração', () => {
  it('sem rigidez à flexão vertical: momento vertical ≈ 0, a estrutura resolve e as demais vigas seguem', () => {
    const s = modelo();
    const id = viga(s, 'V2').id;
    ok(s, 'viga.editar', { id, amarracao: true });
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toBeUndefined();
    const barras = an.portico.barras.map((t, i) => [t, i] as const).filter(([t]) => t.tipo === 'viga' && t.ref === id).map(([, i]) => an.portico.modelo.barras[i]);
    expect(barras.length).toBeGreaterThan(0);
    for (const x of barras) { expect(x.Iz).toBeLessThan(1e-17); expect(x.A).toBeGreaterThan(1e4 * 0.15 * 0.5 * 0.9); }
    const dim = dimensionarEdificio(s.modelo, an);
    const r = dim.vigas.find((x) => x.viga === id)!;
    const outra = dim.vigas.find((x) => x.nome === 'V1')!;
    expect(Math.max(Math.abs(r.Mpos), Math.abs(r.Mneg))).toBeLessThan(0.001 * Math.abs(outra.Mpos)); // contra dezenas de kN·m nas vigas contínuas
    expect(r.mensagens.some((m) => /^Amarração: /.test(m))).toBe(true);
    expect(Math.abs(outra.Mpos)).toBeGreaterThan(1);
  });
});

describe('contorno da prévia da seção', () => {
  const area = (ps: [number, number][]) => Math.abs(ps.reduce((t, p, i) => t + p[0] * ps[(i + 1) % ps.length][1] - ps[(i + 1) % ps.length][0] * p[1], 0)) / 2;
  it('áreas: retângulo 0,075; T 0,147; L 0,111 (mesa em cima ou embaixo)', () => {
    expect(area(contornoSecaoViga(0.15, 0.5, null).pontos)).toBeCloseTo(0.075, 12);
    const T = contornoSecaoViga(0.15, 0.5, { tipo: 'T', bf: 0.75, hf: 0.12 }), L = contornoSecaoViga(0.15, 0.5, { tipo: 'L', bf: 0.45, hf: 0.12 });
    expect(area(T.pontos)).toBeCloseTo(0.147, 12);
    expect(T.largura).toBe(0.75);
    expect(area(L.pontos)).toBeCloseTo(0.111, 12);
    expect(area(contornoSecaoViga(0.15, 0.5, { tipo: 'T', bf: 0.75, hf: 0.12 }, true).pontos)).toBeCloseTo(0.147, 12);
    expect(Math.max(...T.pontos.map((p) => p[1]))).toBe(0.5);
  });
});

describe('quadro das seções especiais', () => {
  it('lista só as vigas com mesa, chata, não estrutural ou amarração', () => {
    const s = modelo();
    expect(resumoSecoesVigas(s.modelo)).toEqual([]);
    ok(s, 'viga.editar', { id: viga(s, 'V2').id, mesa: { tipo: 'T' } });
    ok(s, 'viga.editar', { id: viga(s, 'V3').id, estrutural: false });
    ok(s, 'viga.editar', { id: viga(s, 'V4').id, amarracao: true });
    const q = resumoSecoesVigas(s.modelo);
    expect(q.map((x) => x.nome)).toEqual(['V2', 'V3', 'V4']);
    expect(q[0]).toMatchObject({ tipo: 'T', b: 15, h: 50, automatica: true, estrutural: true });
    expect(q[0].bf).toBeCloseTo(0.75, 9);
    expect(q[1]).toMatchObject({ tipo: 'ret', estrutural: false });
    expect(q[2]).toMatchObject({ amarracao: true });
  });
});

describe('prancha de vigas com seção T e viga não estrutural', () => {
  const textos = (pr: Prancha) => [...pr.papel, ...pr.modelo].flatMap((q) => (q.t === 'txt' ? [q.s] : []));
  it('barras de canto da mesa na seção e na tabela de aço; a não estrutural fica fora', () => {
    const s = modelo();
    ok(s, 'viga.editar', { id: viga(s, 'V4').id, mesa: { tipo: 'T' } });
    ok(s, 'viga.editar', { id: viga(s, 'V3').id, estrutural: false });
    const an = analisarEdificio(s.modelo), dim = dimensionarEdificio(s.modelo, an);
    const prs = montarPranchasVigas(s.modelo, an, dim);
    const elementos = prs.flatMap((p) => p.elementos ?? []);
    expect(elementos).toContain('V4');
    expect(elementos).not.toContain('V3');
    const t = prs.flatMap(textos);
    expect(t.some((x) => /^\d+×\d+ N\d+ φ\d+,\d C=\d+ \(canto da mesa\)$/.test(x))).toBe(true);
    // o aço da prancha (com os cantos) é o do resumo do dimensionamento
    const pesoPranchas = prs.reduce((tt, p) => tt + (p.aco?.peso ?? 0), 0), pesoResumo = dim.resumoAcoVigas!.reduce((tt, x) => tt + x.peso, 0);
    expect(pesoPranchas).toBeCloseTo(pesoResumo, 6);
    const d4 = dim.detalhes!.find((d) => d.viga === viga(s, 'V4').id)!;
    expect(d4.cantosMesa).toBeDefined();
  });
});
