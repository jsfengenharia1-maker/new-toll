// Escadas (E4d): armadura e detalhamento dos lances e patamares. Valores esperados calculados à mão (lance reto biapoiado:
// M = q·ℓ²/8 por metro, As por flexão de bloco retangular, As,mín, distribuição, VRd1) e ancoragem pelas fórmulas da NBR 6118 (9.4.2.4 e 9.4.2.5).
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { ancorarBarra, armarEscadas, asFlexaoEscada, deltaXi, momentosDoElemento, type ResultadoArmaduraLance } from './escadasArmadura';
import { escadasArmaduraNoMemorial, resumoArmaduraEscadas } from './escadasArmaduraResumo';
import { assinaturaEscadas, calcularEscadas } from './escadasCalculo';
import { desenhoArmaduraLance } from './escadasArmaduraDesenho';
import { acoDe, cobrimentoLaje, concretoDe } from './materiais';
import { OPCOES_PADRAO_CALCULO, type OpcoesCalculo } from './opcoes';
import { quantitativosDetalhados } from './relatorios';
import { filtrarDim } from '../../cli/mcp';
import { barArea } from '../concrete';

const E = 0.5 / 3, PISO = 0.2967;
const novo = () => { const s = new Sessao(); for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema'); return s; };
const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((x) => x.mensagem).join(' ')}`).toBe(true); };

interface Ent { tipo: Record<string, unknown>; escada?: Record<string, unknown>; lance?: Record<string, unknown> }
function escada({ tipo, escada: esc = {}, lance = {} }: Ent) {
  const s = novo();
  ok(s, 'tipoLance.criar', { id: 'T', tipo: { nome: 'T', ...tipo } });
  ok(s, 'escada.criar', { id: 'e1', grupo: 'g_3', origem: [0, 0], angulo: 0, piso: PISO, espelho: E, lances: [{ tipo: 'T', ...lance }], ...esc });
  return s;
}
const arma = (s: Sessao, o: Partial<OpcoesCalculo> = {}): ResultadoArmaduraLance => armarEscadas(s.modelo, calcularEscadas(s.modelo), { ...OPCOES_PADRAO_CALCULO, ...o }).lances[0];
const barras = (l: ResultadoArmaduraLance, trecho: string, familia: string) => l.trechos.find((t) => t.chave === trecho)!.barras.filter((x) => x.familia === familia);

// ---- lance reto biapoiado de 18 degraus, h = 15 cm (mesma geometria do teste analítico da E4c)
describe('E4d: lance reto biapoiado contra o cálculo à mão', () => {
  const s = escada({ tipo: { tipologia: 'reto', trechos: [18], espessura: 0.15 } });
  const b = s.modelo, l = arma(s);
  const ell = 17 * PISO, cosA = PISO / Math.hypot(PISO, E), h = 0.15;
  const pg = (25 * h) / cosA + (25 * E) / 2 + 1, pq = 2.5; // kN/m² da projeção
  const Md = (1.4 * pg * ell * ell) / 8 + (1.4 * pq * ell * ell) / 8;
  const c = concretoDe(b, 'laje'), fyd = acoDe(b, 'escadaInf').fyd * 1000, sig = c.sigmaCd * 1000;
  const d = h - cobrimentoLaje(b).inf - 0.005;
  // bloco retangular: λx = d·(1 − √(1 − 2Md/(σcd·b·d²))); As = Md/(fyd·(d − λx/2))
  const lx = d * (1 - Math.sqrt(1 - (2 * Md) / (sig * d * d))), AsMao = (Md / (fyd * (d - lx / 2))) * 1e4;
  it('momento de cálculo e área necessária batem com q·ℓ²/8 e a flexão do bloco retangular (≤ 1,5 %)', () => {
    expect(l.erro).toBeUndefined();
    expect(Md).toBeCloseTo(44.007, 2);
    expect(AsMao).toBeGreaterThan(9.2); // ≈ 9,29 cm²/m
    expect(AsMao).toBeLessThan(9.4);
    const N = barras(l, 'L1', 'infL')[0];
    expect(Math.abs(N.AsNec / AsMao - 1)).toBeLessThan(0.015);
  });
  it('bitola e espaçamento: φ12,5 c/13 (φ10 daria s < 10 cm); área efetiva = π·φ²/4/s', () => {
    const N = barras(l, 'L1', 'infL')[0];
    expect(N.phi).toBe(12.5);
    expect(N.s).toBeCloseTo(0.13, 9);
    expect(N.AsEf).toBeCloseTo((barArea(12.5) / 0.13) * 1e4, 6);
    expect(N.AsEf).toBeGreaterThanOrEqual(N.AsNec);
    expect(N.n).toBe(Math.floor((1.2 - 2 * 0.025) / 0.13 + 1e-6) + 1); // largura 1,20 m, cobrimento lateral 2,5 cm
  });
  it('armadura mínima: ρmín 0,15 % · h = 2,25 cm²/m em qualquer faixa da face inferior', () => {
    const t = l.trechos[0];
    expect(t.AsMin).toBeCloseTo(0.0015 * 0.15 * 1e4, 9);
    expect(Math.min(...t.faixas.map((f) => f.AsInf[0]))).toBeGreaterThanOrEqual(2.25 - 1e-9);
    expect(asFlexaoEscada(1, h, d, c, fyd / 1000).As).toBeLessThan(2.25); // momento pequeno: a mínima é que vale
  });
  it('distribuição inferior: máx(20 % da principal efetiva; 0,9 cm²/m; 0,5·As,mín) = 20 % de 9,44 = 1,89 cm²/m → φ6,3 c/16', () => {
    const N = barras(l, 'L1', 'infL')[0], T = barras(l, 'L1', 'infT')[0];
    expect(T.AsNec).toBeCloseTo(0.2 * N.AsEf, 6);
    expect(T.phi).toBe(6.3);
    expect(T.s).toBeCloseTo(0.16, 9);
    expect(T.comprimento).toBeCloseTo(Math.ceil((1.2 - 0.05) / 0.05 - 1e-9) * 0.05, 9); // largura − 2·cobrimento, arredondado a 5 cm
  });
  it('cortante: VSd ≈ 1,4·(g+q)·ℓ/2 (a casca traz o pico junto ao apoio, ≤ 15 % acima) e VRd1 pela 19.4.1 → sem armadura transversal', () => {
    const t = l.trechos[0], V = (1.4 * (pg + pq) * ell) / 2;
    expect(t.cortante.VSd / V).toBeGreaterThan(0.95);
    expect(t.cortante.VSd / V).toBeLessThan(1.15);
    const rho = Math.min(0.02, (barras(l, 'L1', 'infL')[0].AsEf / 1e4) / d), k = Math.max(1, 1.6 - d);
    const VRd1 = 0.25 * c.fctd * 1000 * k * (1.2 + 40 * rho) * d; // fctd em MPa → kN/m²
    expect(t.cortante.VRd1).toBeCloseTo(VRd1, 4);
    expect(t.cortante.VSd).toBeLessThan(t.cortante.VRd1);
    expect(t.cortante.Asw).toBe(0);
  });
  it('fissuração e flecha verificadas; o aço do lance soma n·C·kg/m', () => {
    expect(l.trechos[0].wk).toBeGreaterThan(0);
    expect(l.flecha.fator).toBe(2.5);
    expect(l.flecha.limite).toBeCloseTo((5.0439 / 250) * 1000, 2);
    expect(l.peso).toBeCloseTo(l.trechos.flatMap((t) => t.barras).reduce((x, y) => x + y.n * y.comprimento * barArea(y.phi) * 7850, 0), 9);
  });
});

describe('E4d: cortante acima de VRd1 (sobrecarga alta, h = 15 cm)', () => {
  const s = escada({ tipo: { tipologia: 'reto', trechos: [18], espessura: 0.15 }, escada: { sobrecarga: 30 } });
  const l = arma(s), ct = l.trechos[0].cortante;
  it('exige armadura transversal pela 19.4.2 (h ≥ 15 cm) e avisa', () => {
    expect(ct.VSd).toBeGreaterThan(ct.VRd1);
    expect(ct.VSd).toBeLessThan(ct.VRd2);
    expect(ct.Asw).toBeGreaterThan(0);
    expect(l.mensagens.some((m) => /armadura transversal/.test(m))).toBe(true);
  });
  it('laje de 12 cm nesse caso reprova (h < 15 cm não leva armadura transversal)', () => {
    const l2 = arma(escada({ tipo: { tipologia: 'reto', trechos: [18], espessura: 0.12 }, escada: { sobrecarga: 20 } }));
    expect(l2.trechos[0].cortante.ok).toBe(false);
    expect(l2.status).toBe('fail');
  });
});

describe('E4d: Wood-Armer e flexão', () => {
  it('momento de elemento sem torção: M+ = γg·G + γq·Q (inferior x); a sobrecarga que alivia não reduz (envoltória com γg·G)', () => {
    const m = momentosDoElemento({ G: [0, 0, 0, 10, 2, 0, 0, 0], Q: [0, 0, 0, -4, 1, 0, 0, 0] }, 1.4, 1.4);
    expect(m.inf[0]).toBeCloseTo(14, 9); // γg·G sozinho (Q alivia)
    expect(m.inf[1]).toBeCloseTo(1.4 * 2 + 1.4 * 1, 9);
    expect(m.sup[0]).toBe(0);
  });
  it('torção: mx* = mx + |mxy|, my* = my + |mxy|', () => {
    const m = momentosDoElemento({ G: [0, 0, 0, 5, 3, 2, 0, 0], Q: [0, 0, 0, 0, 0, 0, 0, 0] }, 1, 1);
    expect(m.inf[0]).toBeCloseTo(7, 9);
    expect(m.inf[1]).toBeCloseTo(5, 9);
  });
  it('Δξ para t0 = 1 mês é 1,32 (NBR 6118, 17.3.2.1.2)', () => { expect(deltaXi(1)).toBeCloseTo(1.32, 2); });
});

describe('E4d: ancoragem pelas fórmulas da NBR 6118', () => {
  // lb = (φ/4)·fyd/fbd; fbd = 2,25·fctd; fctd = 0,7·0,3·fck^(2/3)/1,4 (fck 30): fctd = 1,448 MPa, fbd = 3,258 MPa; φ12,5: lb = 0,3125/100·... = 0,417 m
  const fctd = (0.7 * 0.3 * 30 ** (2 / 3)) / 1.4, fbd = 2.25 * fctd, lb = (0.0125 / 4) * (500 / 1.15 / fbd);
  it('lb do φ12,5 em CA-50, boa aderência = 41,7 cm', () => { expect(lb).toBeCloseTo(0.417, 3); });
  it('ancorarBarra: reta, gancho e dobra conforme o comprimento disponível', () => {
    const cob = 0.025, g = 0.0125 * 8 + (Math.PI * (0.0625 + 0.0125)) / 4 - (0.03125 + 0.0125); // gancho 90°: 8φ + curva (NBR 9.4.2.3)
    const reta = ancorarBarra(lb, 0.5, 12.5, cob);
    expect(reta.tipo).toBe('reta'); expect(reta.adicional).toBeCloseTo(lb, 9);
    const gancho = ancorarBarra(lb, 0.4, 12.5, cob); // reto 37,5 cm < lb, ≥ 0,7·lb = 29,2 cm
    expect(gancho.tipo).toBe('gancho'); expect(gancho.perna).toBeCloseTo(g, 6); expect(gancho.adicional).toBeCloseTo(0.375 + g, 6);
    const dobra = ancorarBarra(lb, 0.2, 12.5, cob); // reto 17,5 cm < 0,7·lb: perna prolongada até 0,7·lb
    expect(dobra.tipo).toBe('dobra'); expect(dobra.perna).toBeCloseTo(g + (0.7 * lb - 0.175), 6); expect(dobra.adicional).toBeCloseTo(0.175 + g + (0.7 * lb - 0.175), 6);
    expect(ancorarBarra(0.1, 0.05, 6.3, cob).tipo).toBe('dobra'); // lbG mínimo 8φ e 6 cm
  });
  it('esperas em viga chata: comprimento disponível de 20 cm < lb,nec gera dobra; com 60 cm a espera é reta; lb,nec = lb·As,calc/As,ef', () => {
    const s = escada({ tipo: { tipologia: 'reto', trechos: [18], espessura: 0.15 } });
    const a = arma(s), N = barras(a, 'L1', 'infL')[0], esp = a.ligacoes.find((x) => x.rotulo.startsWith('Início: esperas'))!;
    expect(esp.ancoragem!.tipo).toBe('dobra');
    expect(esp.ancoragem!.disponivel).toBeCloseTo(0.2, 9);
    expect(esp.ancoragem!.lbNec).toBeCloseTo(Math.max(lb * (N.AsNec / N.AsEf), 0.3 * lb, 0.125, 0.1), 3);
    expect(esp.traspasse).toBeCloseTo(Math.max(2 * esp.ancoragem!.lbNec, 0.3 * 2 * lb, 15 * 0.0125, 0.2), 6); // l0 = α0t·lb,nec, α0t = 2,0
    const b = arma(s, { escadaAncoragemViga: 60 });
    expect(b.ligacoes.find((x) => x.rotulo.startsWith('Início: esperas'))!.ancoragem!.tipo).toBe('reta');
    // dado da escada (comando) no lugar da opção
    ok(s, 'escada.opcoesArmadura', { id: 'e1', ancoragemViga: 60 });
    expect(arma(s).ligacoes.find((x) => x.rotulo.startsWith('Início: esperas'))!.ancoragem!.tipo).toBe('reta');
  });
  it('sem esperas: a armadura inferior se ancora no apoio e não há posição de espera', () => {
    const a = arma(escada({ tipo: { tipologia: 'reto', trechos: [18], espessura: 0.15 } }), { escadaEsperas: 0 });
    expect(a.trechos[0].barras.some((x) => x.tipo === 'espera')).toBe(false);
    expect(a.ligacoes.some((x) => x.rotulo.startsWith('Início: armadura inferior ancorada'))).toBe(true);
  });
  it('passadores no fim: ligam a escada à laje de chegada; desligados, a negativa de borda continua sem o rótulo de passador', () => {
    const s = escada({ tipo: { tipologia: 'reto', trechos: [18], espessura: 0.15 } });
    expect(arma(s).trechos[0].barras.some((x) => x.tipo === 'passador')).toBe(true);
    expect(arma(s, { escadaPassadores: 0 }).trechos[0].barras.some((x) => x.tipo === 'passador')).toBe(false);
  });
});

describe('E4d: fundação sem elemento sob o início do lance', () => {
  // lance que nasce abaixo do piso mais baixo (desnível inicial 30 cm): o apoio é o nível de fundação
  const s = novo();
  const baixo = [...s.modelo.pavimentos].sort((a, z) => a.cota - z.cota)[0], grupo = baixo.grupo;
  ok(s, 'tipoLance.criar', { id: 'T', tipo: { nome: 'T', tipologia: 'reto', trechos: [18], espessura: 0.15, desnivelInicial: 0.3, degrausIniciais: 0 } });
  ok(s, 'escada.criar', { id: 'e1', grupo, origem: [0, 0], angulo: 0, piso: PISO, espelho: E, lances: [{ tipo: 'T', pavimento: baixo.id }] });
  it('as esperas descem a profundidade da fundação menos o cobrimento; profundidade menor que lb,nec dobra a barra', () => {
    const a = arma(s), esp = a.ligacoes.find((x) => x.rotulo.startsWith('Início: esperas'))!;
    expect(esp.descricao).toMatch(/fundação/);
    expect(esp.ancoragem!.disponivel).toBeCloseTo(0.4, 9);
    expect(esp.ancoragem!.tipo).toBe('gancho'); // 40 − 2,5 = 37,5 cm ≥ 0,7·lb,nec
    ok(s, 'escada.opcoesArmadura', { id: 'e1', profundidadeFundacao: 20 });
    expect(arma(s).ligacoes.find((x) => x.rotulo.startsWith('Início: esperas'))!.ancoragem!.tipo).toBe('dobra');
    ok(s, 'escada.opcoesArmadura', { id: 'e1', profundidadeFundacao: 80 });
    expect(arma(s).ligacoes.find((x) => x.rotulo.startsWith('Início: esperas'))!.ancoragem!.tipo).toBe('reta');
  });
});

describe('E4d: igualações (C8.58 a C8.60) e quinas', () => {
  const s = escada({ tipo: { tipologia: 'quartoVolta3', trechos: [6, 6, 6], espessura: 0.15 } });
  it('padrão: cada trecho tem barras inferiores e as negativas de borda nos apoios; quinas cruzam a linha (lb,nec do outro lado)', () => {
    const a = arma(s);
    expect(a.trechos.map((t) => t.chave)).toEqual(['L1', 'P1', 'L2', 'P2', 'L3']);
    expect(a.ligacoes.filter((x) => x.tipo === 'quina')).toHaveLength(4);
    const quina = a.ligacoes.find((x) => x.tipo === 'quina' && x.rotulo === 'Quina L1/P1')!;
    expect(quina.descricao).toMatch(/inferior côncava/);
    const L1 = barras(a, 'L1', 'infL')[0], pL1 = L1.comprimento, curto = a.trechos[0].comprimentoInclinado;
    expect(pL1).toBeGreaterThan(curto + quina.ancoragem!.lbNec - 0.05); // cruza a quina de L1/P1 em lb,nec
    expect(a.ligacoes.find((x) => x.rotulo === 'Quina P1/L2')!.descricao).toMatch(/superior côncava/);
  });
  it('igualar superior e inferior: a área necessária superior longitudinal passa a ser a do maior valor', () => {
    const a0 = arma(s), a1 = arma(s, { escadaIgualarSupInf: 1 });
    const sup0 = barras(a0, 'L1', 'supIni')[0], inf0 = barras(a0, 'L1', 'infL')[0];
    expect(sup0.AsNec).toBeLessThan(inf0.AsNec);
    const sup1 = barras(a1, 'L1', 'supIni')[0], inf1 = barras(a1, 'L1', 'infL')[0];
    expect(sup1.AsNec).toBeCloseTo(inf1.AsNec, 6);
    expect(sup1.AsNec).toBeCloseTo(inf0.AsNec, 2);
  });
  it('espaçamentos múltiplos: o maior espaçamento vira múltiplo do menor, sem reduzir a área', () => {
    const a0 = arma(s), a1 = arma(s, { escadaEspacamentoMultiplo: 1 });
    const inf = barras(a1, 'L2', 'infL')[0], sup = barras(a1, 'L2', 'supIni')[0];
    const [p, g] = inf.s <= sup.s ? [inf.s, sup.s] : [sup.s, inf.s], k = g / p;
    expect(Math.abs(k - Math.round(k))).toBeLessThan(1e-6);
    const sup0 = barras(a0, 'L2', 'supIni')[0];
    expect(sup.AsEf).toBeGreaterThanOrEqual(sup0.AsEf - 1e-9);
  });
  it('igualar todas as seções: a distribuição inferior fica numa só posição por trecho', () => {
    const a0 = arma(s), a1 = arma(s, { escadaIgualarSecoes: 1 });
    expect(a0.trechos.some((t) => t.barras.filter((x) => x.familia === 'infT').length > 1)).toBe(true);
    for (const t of a1.trechos) expect(t.barras.filter((x) => x.familia === 'infT')).toHaveLength(1);
  });
});

describe('E4d: bloqueio, recálculo e tabela de armadura', () => {
  const s = escada({ tipo: { tipologia: 'reto', trechos: [18], espessura: 0.15 } });
  it('armadura editada e bloqueada vale no recálculo e só é verificada; insuficiente reprova', () => {
    ok(s, 'escada.armadura', { id: 'e1', lance: 1, trecho: 'L1', familia: 'infL', phi: 16, s: 0.15 });
    let a = arma(s);
    const N = barras(a, 'L1', 'infL')[0];
    expect(N.phi).toBe(16); expect(N.s).toBeCloseTo(0.15, 9); expect(N.bloqueada).toBe(true); expect(a.bloqueado).toBe(true);
    expect(N.AsEf).toBeCloseTo((barArea(16) / 0.15) * 1e4, 6);
    ok(s, 'escada.armadura', { id: 'e1', lance: 1, trecho: 'L1', familia: 'infL', phi: 6.3, s: 0.2 });
    a = arma(s);
    expect(a.status).toBe('fail');
    expect(a.mensagens.some((m) => /bloqueada insuficiente/.test(m))).toBe(true);
    ok(s, 'armadura.desbloquear', { ids: ['e1'] });
    a = arma(s);
    expect(a.bloqueado).toBe(false);
    expect(barras(a, 'L1', 'infL')[0].phi).toBe(12.5);
  });
  it('comando escada.armadura recusa escada inexistente e trecho fora do formato', () => {
    expect(s.executar('escada.armadura', { id: 'xx', lance: 1, trecho: 'L1', familia: 'infL', phi: 10, s: 0.1 }).ok).toBe(false);
    expect(s.executar('escada.armadura', { id: 'e1', lance: 1, trecho: 'Z9', familia: 'infL', phi: 10, s: 0.1 }).ok).toBe(false);
    expect(s.executar('escada.opcoesArmadura', { id: 'e1', tabela: 'nao-existe' }).ok).toBe(false);
  });
  it('o desfazer volta o modelo ao estado anterior (sem armadura gravada)', () => {
    const t = escada({ tipo: { tipologia: 'reto', trechos: [18], espessura: 0.15 } });
    ok(t, 'escada.armadura', { id: 'e1', lance: 1, trecho: 'L1', familia: 'infL', phi: 10, s: 0.1 });
    expect(t.modelo.escadas![0].armadura?.bloqueadas).toHaveLength(1);
    t.desfazer();
    expect(t.modelo.escadas![0].armadura).toBeUndefined();
  });
  it('as opções de armadura não invalidam a análise (só o dimensionamento)', async () => {
    const { afetaCalculo } = await import('../commands/registry');
    expect(afetaCalculo('escada.armadura')).toBe(false);
    expect(afetaCalculo('escada.opcoesArmadura')).toBe(false);
  });
});

describe('E4d: integração com o dimensionamento, o resumo geral, o MCP e o memorial', () => {
  const s = escada({ tipo: { tipologia: 'reto', trechos: [18], espessura: 0.15 } });
  const b = s.modelo, an = analisarEdificio(b), d = dimensionarEdificio(b, an, { fundacao: false });
  it('dimensionar traz a armadura por lance e o resumo do aço por bitola', () => {
    expect(d.escadasArmadura).toHaveLength(1);
    expect(d.resumoAcoEscadas!.length).toBeGreaterThan(0);
    const total = d.resumoAcoEscadas!.reduce((t, x) => t + x.peso, 0);
    expect(total).toBeCloseTo(d.escadasArmadura![0].peso, 6);
    for (const r of d.resumoAcoEscadas!) expect(r.pesoComPerdas).toBeCloseTo(r.peso * (1 + an.opcoes.perdasAco / 100), 9);
  });
  it('o aço das escadas soma ao resumo geral (quantitativos detalhados)', () => {
    const sem = quantitativosDetalhados(b, { ...d, resumoAcoEscadas: undefined }).indices.aco;
    const com = quantitativosDetalhados(b, d).indices.aco;
    expect(com - sem).toBeCloseTo(d.resumoAcoEscadas!.reduce((t, x) => t + x.pesoComPerdas, 0), 0);
  });
  it('aço próprio das escadas: CA-60 inferior muda o resumo e o fyd; o aço das lajes não muda', () => {
    ok(s, 'materiais.definir', { aco: { escadaInf: 'CA-60' } });
    expect(acoDe(s.modelo, 'escadaInf').aco).toBe('CA-60');
    expect(acoDe(s.modelo, 'lajeInf').aco).toBe('CA-50');
    const l = arma(s);
    expect(resumoAcoLinha(s)).toContain('CA-60');
    expect(l.trechos[0].barras.find((x) => x.familia === 'infL')!.phi).toBeGreaterThanOrEqual(5);
  });
  it('MCP: filtrarDim inclui a armadura das escadas do pavimento', () => {
    const f = filtrarDim(b, { ...d, fundacao: [] } as never, 'Tipo 1') as { escadasArmadura?: { trechos: unknown[] }[]; resumoAcoEscadas?: unknown[] };
    expect(f.escadasArmadura).toHaveLength(1);
    expect(f.escadasArmadura![0].trechos).toHaveLength(1);
    expect(f.resumoAcoEscadas!.length).toBeGreaterThan(0);
    expect(resumoArmaduraEscadas(d.escadasArmadura!)[0].ligacoes.length).toBeGreaterThan(0);
  });
  it('memorial: critérios, posições, ligações, verificações e resumo do aço, com as premissas a confirmar', () => {
    const rows = escadasArmaduraNoMemorial(b, { lances: d.escadasArmadura!, resumoAco: d.resumoAcoEscadas! });
    expect([...new Set(rows.map((r) => r.secao))]).toEqual(expect.arrayContaining(['Critérios', 'Posições', 'Ligações', 'Verificações', 'Resumo do aço']));
    expect(rows.find((r) => r.rotulo === 'Quinas entre trechos e patamares')!.valor).toMatch(/cruza a linha/);
    expect(rows.some((r) => r.aConfirmar)).toBe(true);
    expect(rows.filter((r) => r.secao === 'Posições').length).toBe(d.escadasArmadura![0].trechos.flatMap((t) => t.barras).length);
  });
  it('obra sem escada: nenhum campo novo no dimensionamento (baselines intactos)', () => {
    const sem = novo().modelo, ds = dimensionarEdificio(sem, analisarEdificio(sem), { fundacao: false });
    expect('escadasArmadura' in ds).toBe(false);
    expect('resumoAcoEscadas' in ds).toBe(false);
  });
});

describe('E4d: assinatura do cálculo e desenho', () => {
  it('editar a armadura ou as opções da armadura não muda a assinatura do cálculo (sem falso aviso de recálculo)', () => {
    const s = escada({ tipo: { tipologia: 'reto', trechos: [18], espessura: 0.15 } });
    const a0 = assinaturaEscadas(s.modelo);
    ok(s, 'escada.armadura', { id: 'e1', lance: 1, trecho: 'L1', familia: 'infL', phi: 16, s: 0.15 });
    ok(s, 'escada.opcoesArmadura', { id: 'e1', ancoragemViga: 40 });
    ok(s, 'opcoes.definir', { valores: { escadaIgualarSupInf: 1, escadaEsperas: 0, escadaCobrimento: 3 } });
    expect(assinaturaEscadas(s.modelo)).toBe(a0);
    ok(s, 'opcoes.definir', { valores: { escadaMalha: 0.2 } });
    expect(assinaturaEscadas(s.modelo)).not.toBe(a0); // a malha muda as reações
  });
  it('desenho do lance reto: um segmento por posição longitudinal, transversais ao longo do trecho e perfil com a cota', () => {
    const l = arma(escada({ tipo: { tipologia: 'reto', trechos: [18], espessura: 0.15 } }));
    const d = desenhoArmaduraLance(l);
    expect(d.trechos).toHaveLength(1);
    expect(d.largura).toBeCloseTo(l.trechos[0].comprimento, 9);
    expect(d.trechos[0].z1 - d.trechos[0].z0).toBeCloseTo(l.trechos[0].declive * l.trechos[0].comprimento, 9);
    expect(d.trechos[0].z1 - d.trechos[0].z0).toBeCloseTo(17 * E, 3); // 17 espelhos no lance
    const N1 = d.barras.find((x) => x.direcao === 'L' && x.face === 'inf')!;
    expect(N1.elevacao).toHaveLength(1);
    expect(N1.planta).toHaveLength(barras(l, 'L1', 'infL')[0].n);
    expect(N1.elevacao[0][0][1]).toBeLessThan(d.trechos[0].z0 + 0.0001); // armadura inferior abaixo do eixo
    const T = d.barras.find((x) => x.direcao === 'T' && x.face === 'inf')!;
    expect(T.planta).toHaveLength(barras(l, 'L1', 'infT')[0].n);
  });
});

function resumoAcoLinha(s: Sessao): string { return armarEscadas(s.modelo, calcularEscadas(s.modelo), OPCOES_PADRAO_CALCULO).resumoAco.map((x) => `${x.aco}`).join(','); }
