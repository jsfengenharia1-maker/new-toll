// Frente N2g: resistência ao fogo (NBR 15200): tabelas contra casos manuais, método analítico dos pilares, TRRF por
// ocupação e altura, revestimentos, comando fogo.definir, integração com o dimensionamento e a revisão.
import { describe, expect, it } from 'vitest';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { c1Viga, espessuraEquivalente, fogoLaje, fogoPilar, fogoViga, larguraEfetiva, sugestaoTrrf, trfAnalitico, trrfDoGrupo, type EntradaPilar } from './fogo';
import { CLASSES_TRRF, classeDeAltura, trrfSugerido } from './fogoTabelas';
import { opcoesEmUso } from './opcoes';
import { classificar, revisarEdificio } from './revisao';
import { sugestaoDe } from './sugestoes';
import { edificioExemplo } from '../sheets/exemplo';
import { Sessao, comandosEdificioPadrao } from '../commands';
import { notasGerais } from '../sheets/locacao';

const viga = (b: number, c1: number, trrf: number, continua = false, revestimento = 0) => fogoViga({ b, c1, trrf, continua, revestimento });
const laje = (o: Partial<Parameters<typeof fogoLaje>[0]> & { h: number; c1: number; trrf: number }) => fogoLaje({ tipo: 'macica', revestimento: 0, compartimentadora: true, ...o });

describe('tabelas de vigas (NBR 15200:2004, tabelas 8 e 9)', () => {
  it('biapoiada: combinações bmín/c1 por TRRF e bw', () => {
    expect(viga(140, 55, 90).ok).toBe(true);
    expect(viga(140, 54.9, 90).ok).toBe(false);
    expect(viga(190, 45, 90).ok).toBe(true);
    expect(viga(400, 35, 90).ok).toBe(true);
    expect(viga(190, 64, 120).ok).toBe(false);
    expect(viga(190, 65, 120).ok).toBe(true);
    expect(viga(500, 50, 120).ok).toBe(true);
    // TRF = maior TRRF tabelado atendido: 190/45 atende 30, 60 e 90, não 120 (190/65)
    const a = viga(190, 45, 90);
    expect(a.trf).toBe(90);
    expect(a.limiteTabela).toBe(false);
    expect(viga(500, 50, 90).trf).toBe(120);
    expect(viga(60, 50, 30).ok).toBe(false);
  });
  it('contínua ou de pórtico: valores da Tabela 9', () => {
    expect(viga(120, 25, 60, true).ok).toBe(true);
    expect(viga(120, 24.9, 60, true).ok).toBe(false);
    expect(viga(300, 12, 60, true).ok).toBe(true);
    expect(viga(200, 45, 120, true).ok).toBe(true);
    expect(viga(200, 44, 120, true).ok).toBe(false);
    // a mesma viga 120/25 não passa como biapoiada (120/40)
    expect(viga(120, 25, 60, false).ok).toBe(false);
  });
  it('TRRF intermediário usa o menor TRRF tabelado acima (sem interpolar); acima de 120 fica fora das tabelas', () => {
    expect(viga(140, 55, 75).ok).toBe(true);
    expect(viga(140, 40, 75).ok).toBe(false);
    const f = viga(500, 80, 180);
    expect(f.foraTabela).toBe(true);
    expect(f.ok).toBe(false);
    expect(f.erros).toEqual([]);
    expect(f.avisos[0]).toMatch(/^Fogo: TRRF de 180 min fora das tabelas/);
  });
  it('revestimento aumenta c1 e a largura (duas laterais) pela eficiência', () => {
    expect(espessuraEquivalente({ material: 'cal', espessura: 15 })).toBeCloseTo(10.05, 12);
    expect(espessuraEquivalente({ material: 'cimento', espessura: 20 })).toBe(20);
    expect(espessuraEquivalente({ material: 'protetor', espessura: 10 })).toBe(25);
    expect(espessuraEquivalente({ material: 'protetor', espessura: 10, eficiencia: 1.5 })).toBe(15);
    expect(espessuraEquivalente(undefined)).toBe(0);
    // 120 × 30 mm em 60 min (biapoiada exige 120/40): reprova sem revestimento e passa com 15 mm de cal (c1 = 40,05; b = 140,1)
    expect(viga(120, 30, 60).ok).toBe(false);
    const r = viga(120, 30, 60, false, 10.05);
    expect(r.ok).toBe(true);
    expect(r.adotado).toContain('revestimento +10,1 mm');
  });
});

describe('tabelas de lajes (NBR 15200:2004, tabelas 4 a 7)', () => {
  it('maciça apoiada em vigas: c1 por armação e espessura de compartimentação', () => {
    expect(laje({ h: 100, c1: 15, trrf: 90, razao: 1.2 }).ok).toBe(true);
    expect(laje({ h: 100, c1: 14.9, trrf: 90, razao: 1.2 }).ok).toBe(false);
    expect(laje({ h: 100, c1: 20, trrf: 90, razao: 1.8 }).ok).toBe(true);
    expect(laje({ h: 100, c1: 19, trrf: 90, razao: 1.8 }).ok).toBe(false);
    expect(laje({ h: 100, c1: 30, trrf: 90, razao: 2.5 }).ok).toBe(true);
    expect(laje({ h: 100, c1: 29, trrf: 90, razao: 2.5 }).ok).toBe(false);
    // h mínima só conta na laje compartimentadora
    expect(laje({ h: 90, c1: 15, trrf: 90, razao: 1 }).ok).toBe(false);
    expect(laje({ h: 90, c1: 15, trrf: 90, razao: 1, compartimentadora: false }).ok).toBe(true);
    // TRF: h 100 e c1 25 numa direção → 30 (10), 60 (20), 90 (30) não
    expect(laje({ h: 100, c1: 25, trrf: 60, razao: 3 }).trf).toBe(60);
    expect(laje({ h: 120, c1: 40, trrf: 120, razao: 3 }).ok).toBe(true);
  });
  it('lisa: Tabela 5', () => {
    const l = (h: number, c1: number, trrf: number) => laje({ tipo: 'lisa', h, c1, trrf }).ok;
    expect(l(150, 10, 30)).toBe(true);
    expect(l(179, 15, 60)).toBe(false);
    expect(l(180, 15, 60)).toBe(true);
    expect(l(200, 35, 120)).toBe(true);
    expect(l(200, 34, 120)).toBe(false);
  });
  it('nervuradas: nervura (bmín/c1) e capa; Tabela 6 biapoiada e 7 contínua', () => {
    const n = (bw: number, c1: number, trrf: number, biapoiada: boolean, h = 80, comp = true) => fogoLaje({ tipo: 'nervurada', h, c1, bw, trrf, biapoiada, revestimento: 0, compartimentadora: comp }).ok;
    expect(n(100, 35, 60, true)).toBe(true);
    expect(n(100, 34, 60, true)).toBe(false);
    expect(n(120, 25, 60, true)).toBe(true);
    expect(n(190, 15, 60, true)).toBe(true);
    expect(n(90, 40, 60, true)).toBe(false);
    // contínua: 100/25
    expect(n(100, 25, 60, false)).toBe(true);
    expect(n(100, 25, 60, true)).toBe(false);
    // capa: 90 min exige 100 mm; 120, 120 mm
    expect(n(120, 45, 90, true, 99)).toBe(false);
    expect(n(120, 45, 90, true, 99, false)).toBe(true);
    expect(n(160, 60, 120, true, 120)).toBe(true);
    expect(n(160, 60, 120, true, 119)).toBe(false);
  });
});

describe('pilares: método analítico (NBR 15200:2012) e tabelas', () => {
  const base: EntradaPilar = { b: 300, h: 300, c1: 35, revestimento: 0, n: 8, As: 8 * 314, lef: 1.4, e: 10, faces: 4, muFi: 0.7, trrf: 60, metodo: 0 };
  it('TRF pela fórmula: 120·[(Rμ + Ra + Rl + Rb + Rn)/120]^1,8, cálculo manual', () => {
    const r = trfAnalitico({ muFi: 0.7, c1: 35, lef: 1.4, bLinha: 300, n: 8 });
    expect(r.Rmu).toBeCloseTo(24.9, 10);
    expect(r.Ra).toBeCloseTo(8, 10);
    expect(r.Rl).toBeCloseTo(34.56, 10);
    expect(r.Rb).toBeCloseTo(27, 10);
    expect(r.Rn).toBe(12);
    expect(r.trf).toBeCloseTo(96.7366, 3);
    expect(trfAnalitico({ muFi: 0.7, c1: 35, lef: 1.4, bLinha: 300, n: 4 }).Rn).toBe(0);
    expect(trfAnalitico({ muFi: 0.7, c1: 35, lef: 1.4, bLinha: 600, n: 8 }).Rb).toBe(40.5);
  });
  it('largura efetiva b′ e verificação do TRRF', () => {
    expect(larguraEfetiva(300, 300)).toBe(300);
    expect(larguraEfetiva(200, 500)).toBe(240);
    expect(larguraEfetiva(200, 300)).toBeCloseTo((2 * 60000) / 500, 10);
    const a = fogoPilar(base);
    expect(a.trf).toBe(96);
    expect(a.ok).toBe(true);
    expect(a.avisos).toEqual([]);
    const b = fogoPilar({ ...base, trrf: 120 });
    expect(b.ok).toBe(false);
    expect(b.erros[0]).toMatch(/^Fogo: TRRF de 120 min não atendido \(TRF 96 min; NBR 15200:2012, método analítico\)/);
    // revestimento só entra em c1: c1 35 → 45 (Ra 8 → 24) aumenta o TRF
    expect(fogoPilar({ ...base, revestimento: 10, trrf: 120 }).trf).toBeGreaterThan(96);
  });
  it('fora dos limites do método: aviso, TRF mantido', () => {
    const r = fogoPilar({ ...base, e: 60 });
    expect(r.avisos[0]).toMatch(/^Fogo: método analítico fora dos limites da norma \(e 60 mm > 0,15·b = 45 mm\)/);
    expect(r.ok).toBe(true);
    const s = fogoPilar({ ...base, c1: 90, lef: 7, As: 0.05 * 90000 });
    expect(s.avisos[0]).toMatch(/As\/Ac 5 % > 4 %.*c1 90 mm fora de 25 a 80 mm.*ℓef,fi 7 m > 6 m/);
  });
  it('excentricidade não avaliada (determinantes com vento): aviso explícito (N2g, auditoria) e registrada no texto', () => {
    const r = fogoPilar({ ...base, e: null });
    expect(r.avisos).toHaveLength(1);
    expect(r.avisos[0]).toMatch(/^Fogo: método analítico fora dos limites.*e ≤ 0,15·b não verificada.*levam vento/);
    expect(r.adotado).toContain('e não avaliada');
    expect(r.trf).toBe(96);
  });
  it('uma face exposta (tabela da 2012)', () => {
    const u = (b: number, c1: number, trrf: number) => fogoPilar({ ...base, b, h: b, c1, faces: 1, trrf });
    expect(u(155, 25, 90).ok).toBe(true);
    expect(u(155, 25, 120).ok).toBe(false);
    expect(u(175, 35, 120).ok).toBe(true);
    expect(u(230, 55, 180).ok).toBe(true);
    expect(u(154, 25, 30).ok).toBe(false);
    expect(u(155, 25, 90).trf).toBe(90);
  });
  it('tabular da edição de 2004 por μfi (Tabela 10)', () => {
    const t = (b: number, c1: number, trrf: number, muFi: number) => fogoPilar({ ...base, b, h: b, c1, trrf, muFi, metodo: 1 });
    expect(t(190, 35, 60, 0.5).ok).toBe(true);
    expect(t(190, 34, 60, 0.5).ok).toBe(false);
    expect(t(250, 45, 60, 0.7).ok).toBe(true);
    expect(t(250, 45, 60, 0.65).ok).toBe(true);
    expect(t(450, 50, 120, 0.7).ok).toBe(true);
    expect(t(250, 40, 120, 0.2).ok).toBe(true);
    expect(t(190, 25, 30, 0.2).ok).toBe(true);
    // μfi acima de 0,7: a tabela não vale
    expect(t(600, 60, 60, 0.8).erros[0]).toMatch(/vale só para μfi ≤ 0,7/);
  });
});

describe('c1 pela armadura adotada', () => {
  it('uma camada: cobrimento + φt + φ/2; a média lateral não reduz', () => {
    expect(c1Viga({ cobInf: 25, cobLat: 25, phiT: 5, phi: 16, n: 3, camadas: 1, b: 200 })).toBeCloseTo(38, 10);
  });
  it('camadas: média ponderada das distâncias ao fundo (afastamento máx(20 mm; φ))', () => {
    // 3 + 3 barras φ16: camadas a 38 e 74 mm → média 56; lateral (38, 200, 38 por camada) = 92 → vale 56
    expect(c1Viga({ cobInf: 25, cobLat: 25, phiT: 5, phi: 16, n: 6, camadas: 2, b: 400 })).toBeCloseTo(56, 10);
  });
});

describe('TRRF por ocupação e altura (IT 06 CBMMG 2005 / NBR 14432)', () => {
  it('classes de altura e colunas', () => {
    expect(['P1', 'P1', 'P2', 'P3', 'P4', 'P5'].join()).toBe([6, 3, 12, 23, 30, 31].map((h) => classeDeAltura(h)).join());
    expect(CLASSES_TRRF).toEqual(['S2', 'S1', 'P1', 'P2', 'P3', 'P4', 'P5']);
  });
  it('residencial A-2: 30 min até 12 m, 60 até 23, 90 até 30, 120 acima', () => {
    expect([4, 10, 20, 28, 40].map((h) => trrfSugerido('A-2', h)!.trrf)).toEqual([30, 30, 60, 90, 120]);
  });
  it('outras ocupações e subsolos', () => {
    expect(trrfSugerido('D-1', 8)!.trrf).toBe(60);
    expect(trrfSugerido('C-1', 4)!.trrf).toBe(60);
    expect(trrfSugerido('I-3', 25)!.trrf).toBe(120);
    expect(trrfSugerido('G-1 aberta', 28)!.trrf).toBe(30);
    expect(trrfSugerido('a-2', -5)!.trrf).toBe(60);
    expect(trrfSugerido('A-2', -12)!.trrf).toBe(90);
  });
  it('consulta ao corpo técnico, acima de 54 m e divisão desconhecida', () => {
    expect(trrfSugerido('F-3', 40)!.trrf).toBeNull();
    expect(trrfSugerido('F-3', 40)!.aviso).toMatch(/corpo técnico/);
    expect(trrfSugerido('A-2', 60)!.aviso).toMatch(/54 m/);
    expect(trrfSugerido('Z-9', 10)).toBeNull();
  });
});

function sessao() {
  const s = edificioExemplo();
  return s;
}

describe('fogo.definir e integração com o dimensionamento', () => {
  it('padrão desligado: nada muda; ligado, verifica todos os elementos', () => {
    const s = sessao(), b0 = s.modelo, an = analisarEdificio(b0), d0 = dimensionarEdificio(b0, an);
    expect(d0.fogo).toBeUndefined();
    expect(JSON.stringify(d0)).not.toContain('Fogo:');
    const r = s.executar('fogo.definir', { ativo: true });
    expect(r.ok).toBe(true);
    expect(s.modelo.estados).toEqual({ incendio: { ativo: true } });
    expect(s.modelo.fogo).toBeUndefined();
    const b1 = s.modelo, d1 = dimensionarEdificio(b1, analisarEdificio(b1));
    expect(d1.fogo).toBeDefined();
    const n = d1.vigas.length + d1.pilares.length + d1.lajes.length;
    expect(d1.fogo!.elementos.length).toBe(n);
    expect(d1.fogo!.resumo.total).toBe(n);
    expect(d1.fogo!.grupos.length).toBeGreaterThan(1);
    expect(d1.fogo!.grupos.every((g) => g.trrf === 60 && g.origem === 'padrao')).toBe(true);
    // os demais resultados não mudam além das mensagens de fogo
    expect(d1.vigas.map((v) => [v.barrasInf, v.barrasSup, v.estribo])).toEqual(d0.vigas.map((v) => [v.barrasInf, v.barrasSup, v.estribo]));
    // mensagens e status de cada elemento acompanham o resultado do fogo
    for (const e of d1.fogo!.elementos) {
      const alvo = e.tipo === 'viga' ? d1.vigas.find((x) => x.viga === e.id) : e.tipo === 'laje' ? d1.lajes.find((x) => x.laje === e.id && x.pavimento === e.pavimento) : d1.pilares.find((x) => x.pilar === e.id && x.pavimento === e.pavimento);
      for (const m of e.mensagens) expect(alvo!.mensagens).toContain(m);
      if (e.status === 'fail') expect(alvo!.status).toBe('fail');
      expect(e.folga).toBe(e.trf - e.trrf);
    }
  });

  it('TRRF alto reprova elementos, vira erro FOGO_TRRF na revisão e some com o estado desligado; revestimento resolve', () => {
    const s = sessao();
    expect(s.executar('fogo.definir', { ativo: true, trrf: { g_3: 120 } }).ok).toBe(true);
    let b = s.modelo, d = dimensionarEdificio(b, analisarEdificio(b));
    expect(d.fogo!.grupos.find((g) => g.grupo === 'g_3')).toMatchObject({ trrf: 120, origem: 'grupo' });
    const falhas = d.fogo!.elementos.filter((e) => e.status === 'fail');
    expect(falhas.length).toBeGreaterThan(0);
    const e0 = falhas[0];
    expect(classificar(e0.mensagens[0])).toEqual({ codigo: 'FOGO_TRRF', nivel: 'erro' });
    expect(sugestaoDe('FOGO_TRRF')).toBeTruthy();
    const rev = revisarEdificio(b, null, d);
    expect(rev.itens.some((i) => i.codigo === 'FOGO_TRRF' && i.nivel === 'erro' && i.id === e0.id)).toBe(true);
    // revestimento de 60 mm de cimento e areia por grupo (c1 + 60, largura + 120, h + 60) atende
    expect(s.executar('fogo.definir', { revestimentos: { g_3: { material: 'cimento', espessura: 60 } } }).ok).toBe(true);
    b = s.modelo; d = dimensionarEdificio(b, analisarEdificio(b));
    expect(d.fogo!.elementos.filter((e) => e.tipo !== 'pilar').every((e) => e.status === 'ok' && e.revestimento === 60)).toBe(true);
    // estado desligado: sem resultado e sem erro de fogo na revisão
    expect(s.executar('fogo.definir', { ativo: false }).ok).toBe(true);
    b = s.modelo; d = dimensionarEdificio(b, analisarEdificio(b));
    expect(d.fogo).toBeUndefined();
    expect(revisarEdificio(b, null, d).itens.some((i) => i.codigo.startsWith('FOGO_'))).toBe(false);
  });

  it('TRRF por elemento, ocupação (sugestão) e acima de 120 min (aviso)', () => {
    const s = sessao();
    expect(s.executar('fogo.definir', { ativo: true, ocupacao: 'D-1', altura: 20 }).ok).toBe(true);
    let b = s.modelo;
    expect(sugestaoTrrf(b)).toMatchObject({ divisao: 'D-1', altura: 20, trrf: 60, classe: 'P3' });
    expect(trrfDoGrupo(b, opcoesEmUso(b.opcoes), 'g_3')).toEqual({ trrf: 60, origem: 'ocupacao' });
    expect(s.executar('fogo.definir', { altura: 40 }).ok).toBe(true);
    b = s.modelo;
    expect(trrfDoGrupo(b, opcoesEmUso(b.opcoes), 'g_3')).toEqual({ trrf: 120, origem: 'ocupacao' });
    expect(s.executar('fogo.definir', { trrf: { g_3: 180 } }).ok).toBe(true);
    b = s.modelo;
    const d = dimensionarEdificio(b, analisarEdificio(b));
    const vs = d.fogo!.elementos.filter((e) => e.tipo === 'viga');
    expect(vs.every((e) => e.trrf === 180 && e.status === 'review' && /fora das tabelas/.test(e.mensagens[0]))).toBe(true);
    expect(classificar(vs[0].mensagens[0])).toEqual({ codigo: 'FOGO_FORA_TABELA', nivel: 'aviso' });
    const id = b.vigas[0].id;
    expect(s.executar('fogo.definir', { elementos: { [id]: { trrf: 30 } } }).ok).toBe(true);
    b = s.modelo;
    const d2 = dimensionarEdificio(b, analisarEdificio(b)), v = d2.fogo!.elementos.find((e) => e.id === id)!;
    expect(v).toMatchObject({ trrf: 30, origemTrrf: 'elemento' });
  });

  it('comando: validações, remover e padrão', () => {
    const s = sessao();
    const bad = (p: Record<string, unknown>) => s.executar('fogo.definir', p).erros[0]?.codigo;
    expect(bad({ trrf: { g_999: 60 } })).toBe('GRUPO_INEXISTENTE');
    expect(bad({ trrf: { g_3: 5 } })).toBe('TRRF_INVALIDO');
    expect(bad({ elementos: { x_1: { trrf: 60 } } })).toBe('ELEMENTO_INEXISTENTE');
    expect(bad({ ocupacao: 'Z-9' })).toBe('OCUPACAO_DESCONHECIDA');
    expect(bad({ revestimentos: { g_3: { material: 'tinta', espessura: 5 } } })).toBe('REVESTIMENTO_INVALIDO');
    expect(bad({ elementos: { [s.modelo.pilares[0].id]: { faces: 5 } } })).toBe('FOGO_ELEMENTO_INVALIDO');
    const pid = s.modelo.pilares[0].id;
    expect(s.executar('fogo.definir', { ativo: true, ocupacao: 'a-2', trrf: { g_3: 90 }, revestimentos: { g_3: { material: 'cal', espessura: 15 } }, elementos: { [pid]: { faces: 3, muFi: 0.5 } } }).ok).toBe(true);
    expect(s.modelo.fogo).toEqual({ ocupacao: 'A-2', trrf: { g_3: 90 }, revestimentos: { g_3: { material: 'cal', espessura: 15 } }, elementos: { [pid]: { faces: 3, muFi: 0.5 } } });
    expect(s.executar('fogo.definir', { remover: { trrf: ['g_3'], revestimentos: ['g_3'], ocupacao: true, elementos: { [pid]: ['muFi'] } } }).ok).toBe(true);
    expect(s.modelo.fogo).toEqual({ elementos: { [pid]: { faces: 3 } } });
    expect(s.executar('fogo.definir', { remover: { elementos: { [pid]: [] } } }).ok).toBe(true);
    expect(s.modelo.fogo).toBeUndefined();
    expect(s.executar('fogo.definir', { padrao: true }).ok).toBe(true);
    expect(s.modelo.estados).toBeUndefined();
    expect(s.executar('fogo.definir', { ativo: false }).ok).toBe(true);
    expect(s.modelo.estados).toBeUndefined();
  });

  it('nota geral das pranchas só com a verificação ligada', () => {
    const s = sessao();
    expect(notasGerais(s.modelo).some((n) => n.includes('Resistência ao fogo'))).toBe(false);
    expect(s.executar('fogo.definir', { ativo: true, trrf: { g_3: 90 }, revestimentos: { g_3: { material: 'cal', espessura: 15 } } }).ok).toBe(true);
    const n = notasGerais(s.modelo).find((x) => x.includes('Resistência ao fogo'))!;
    expect(n).toMatch(/TRRF .*90 min.*60 min/);
    expect(n).toContain('analítico em pilares');
    expect(n).toContain('15 mm de argamassa de cal e areia');
  });

  it('desfazer volta ao modelo anterior', () => {
    const s = new Sessao();
    for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
    const antes = JSON.stringify(s.modelo);
    expect(s.executar('fogo.definir', { ativo: true, trrf: { g_3: 90 } }).ok).toBe(true);
    s.desfazer();
    expect(JSON.stringify(s.modelo)).toBe(antes);
  });
});
