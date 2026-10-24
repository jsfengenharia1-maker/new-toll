// E5f: aço próprio das nervuradas, vigotas in loco e ábacos (herança entre posições) e punção das nervuradas com ábaco: grupos de
// estribos informados nas nervuras, cortante por varredura nas nervuras (sem as cubetas), biela (τRd2) e alvo do clique da planta.
// Valores esperados à mão (NBR 6118, 19.4 e 19.5).
import { describe, expect, it } from 'vitest';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { barArea } from '../concrete';
import { alvoPuncaoNoPonto } from './abacosPuncao';
import { acoDe, ascendentesAco, concretoDe, gamas } from './materiais';
import { geometriaBidirecional } from './nervuradas';
import { armaduraNecessariaNervurada } from './nervuradasDim';
import { OPCOES_INFO, OPCOES_PADRAO_CALCULO, OPCOES_PADRAO_NBR } from './opcoes';
import { tauRd3c } from './puncao';
import type { BuildingModel } from './types';

const XS = [0.25, 6.25, 12.25];
type Ok = (n: string, p: Record<string, unknown>) => void;

/** Pano nervurado de 12,5 × 12,5 m com 9 pilares de 50 × 50 cm e ábacos automáticos; `q` = acidental (kN/m²). */
function lisa(q: number, extra?: (ok: Ok, s: Sessao) => void) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok: Ok = (n, p) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('vento.definir', { ativo: false });
  ok('lote', { comandos: XS.flatMap((x) => XS.map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.5, h: 0.5 } } }))) });
  ok('laje.criar', { grupo: 'g_3', contorno: [[0, 0], [12.5, 0], [12.5, 12.5], [0, 12.5]], tipo: { tipo: 'nervurada', forma: 'cat:rec-60-30', hTotal: 0.35, capa: 0.05 } });
  ok('abaco.gerar', { lajes: [s.modelo.lajes[0].id] });
  ok('grupo.editar', { id: 'g_3', q });
  extra?.(ok, s);
  return s;
}
function calcular(b: BuildingModel) {
  const an = analisarEdificio(b);
  expect(an.erro).toBeUndefined();
  return dimensionarEdificio(b, an);
}
const interno = (d: ReturnType<typeof calcular>) => d.puncao!.filter((r) => r.pavimento === 'Tipo 1').find((r) => r.tipo === 'interno')!;
const idInterno = (s: Sessao) => s.modelo.pilares.find((p) => Math.abs(p.x - 6.25) < 1e-6 && Math.abs(p.y - 6.25) < 1e-6)!.id;

describe('E5f: aço próprio por posição das nervuradas, vigotas in loco e ábacos', () => {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const b = () => s.modelo;

  it('herança: as posições novas seguem as lajes; o ábaco segue as nervuradas; cadeia de ascendentes', () => {
    expect(ascendentesAco('abacoSup')).toEqual(['nervSup', 'lajeSup']);
    expect(ascendentesAco('nervInf')).toEqual(['lajeInf']);
    expect(ascendentesAco('vigotaSup')).toEqual(['lajeSup']);
    expect(ascendentesAco('lajeInf')).toEqual([]);
    expect(ascendentesAco('vigaMontagem')).toEqual(['vigaPos']);
    expect(acoDe(b(), 'abacoSup').aco).toBe('CA-50');
    const r = s.executar('materiais.definir', { aco: { lajeSup: 'CA-60' } });
    expect(r.ok).toBe(true);
    for (const k of ['nervSup', 'vigotaSup', 'abacoSup', 'escadaSup'] as const) expect(acoDe(b(), k).aco).toBe('CA-60');
    for (const k of ['nervInf', 'vigotaInf', 'abacoInf', 'lajeInf'] as const) expect(acoDe(b(), k).aco).toBe('CA-50');
    expect(acoDe(b(), 'abacoSup').fyd).toBeCloseTo(600 / 1.15, 9);
  });

  it('posição própria igual ao aço da obra fica registrada quando um ascendente difere (senão voltaria a seguir o pai)', () => {
    const r = s.executar('materiais.definir', { aco: { nervSup: 'CA-50' } });
    expect(r.ok).toBe(true);
    expect(b().norma.acoPos?.nervSup).toBe('CA-50');
    expect(acoDe(b(), 'nervSup').aco).toBe('CA-50');
    expect(acoDe(b(), 'abacoSup').aco).toBe('CA-50'); // segue a nervSup própria, não a lajeSup
    expect(acoDe(b(), 'lajeSup').aco).toBe('CA-60');
  });

  it('armadura necessária da nervura com CA-60 na superior: As·fyd constante (Md/z) e menor que com CA-50', () => {
    const s2 = lisa(5);
    const l = s2.modelo.lajes[0], M = 25; // kN·m/m, momento negativo
    const a50 = armaduraNecessariaNervurada(s2.modelo, l, M, 'sup', 0);
    s2.executar('materiais.definir', { aco: { nervSup: 'CA-60' } });
    const a60 = armaduraNecessariaNervurada(s2.modelo, l, M, 'sup', 0);
    expect(a60).toBeLessThan(a50);
    // As = Md/(z·fyd): com z quase igual, As60/As50 ≈ fyd50/fyd60 = 500/600 (tolerância de 3 % pela variação de z)
    expect(Math.abs(a60 / a50 - 500 / 600)).toBeLessThan(0.03);
    // a posição inferior não muda
    const i50 = armaduraNecessariaNervurada(lisa(5).modelo, l, M, 'inf', 0);
    expect(armaduraNecessariaNervurada(s2.modelo, l, M, 'inf', 0)).toBeCloseTo(i50, 9);
  });

  it('dimensionamento: superior das nervuras herda CA-60 das lajes, o ábaco tem CA-50 próprio e a inferior fica CA-50', () => {
    const s3 = lisa(16, (ok) => ok('materiais.definir', { aco: { lajeSup: 'CA-60', abacoSup: 'CA-50' } }));
    const d = calcular(s3.modelo);
    const pos = d.nervuradas!.flatMap((n) => n.posicoes);
    const por = (t: string) => pos.filter((p) => p.tipo === t);
    expect(por('abaco').length).toBeGreaterThan(0);
    expect(por('abaco').every((p) => p.aco === 'CA-50')).toBe(true);
    expect([...por('superior'), ...por('baseSup'), ...por('mesa')].length).toBeGreaterThan(0);
    expect([...por('superior'), ...por('baseSup')].every((p) => p.aco === 'CA-60')).toBe(true);
    expect(por('inferior').every((p) => p.aco === 'CA-50')).toBe(true);
    // a armadura da mesa (malha superior) segue a superior das nervuradas
    expect(por('mesa').some((p) => p.aco === 'CA-60')).toBe(true);
  }, 300000);
});

describe('E5f: opção de cortante nas nervuras do ábaco', () => {
  it('padrão do sistema ligado; perfil NBR desligado; registrada com fonte e a confirmar', () => {
    expect(OPCOES_PADRAO_CALCULO.puncaoNervCortante).toBe(1);
    expect(OPCOES_PADRAO_NBR.puncaoNervCortante).toBe(0);
    const info = OPCOES_INFO.find((o) => o.chave === 'puncaoNervCortante')!;
    expect(info.padraoNBR).toBe(0);
    expect(info.fonteNBR).toBeTruthy();
    expect(info.aConfirmar).toBe(true);
  });
});

describe('E5f: punção da nervurada com ábaco — cortante nas nervuras, grupos informados e biela', () => {
  const sA = lisa(16), bA = sA.modelo, dA = calcular(bA), rA = interno(dA);
  const sB = lisa(16, (ok) => ok('opcoes.definir', { valores: { puncaoNervCortante: 0 } })), rB = interno(calcular(sB.modelo));
  const l = bA.lajes[0], g = geometriaBidirecional(bA, l.tipo as never), gm = gamas(bA), grupo = bA.grupos.find((x) => x.id === 'g_3')!;
  const c = concretoDe(bA, 'laje');

  it('com a varredura: a 1ª superfície (a = 2d) tem u = u(C′) e V = FSd − q·A, com A à mão (quadrado 0,5 + 4·0,5·a + π a²)', () => {
    const sup = rA.cortante.superficies;
    expect(sup.length).toBeGreaterThan(3);
    const a = 2 * rA.d, A = 0.25 + 4 * 0.5 * a + Math.PI * a * a;
    const qd = gm.g * g.pp + gm.g * grupo.gRev + gm.q * grupo.q;
    expect(sup[0].a).toBeCloseTo(a, 9);
    expect(sup[0].u).toBeCloseTo(rA.contornos[1].u, 9);
    expect(Math.abs(sup[0].A - A) / A).toBeLessThan(5e-3);
    expect(sup[0].V).toBeCloseTo(rA.F - qd * sup[0].A, 6);
    expect(Math.abs(sup[0].V - (rA.F - qd * A)) / sup[0].V).toBeLessThan(5e-3);
    expect(sup[0].v).toBeCloseTo(sup[0].V / sup[0].u, 9);
    for (const x of sup) expect(x.ok).toBe(x.v <= x.vRd1 + 1e-9);
    // passo 0,75d entre superfícies
    expect(sup[1].a - sup[0].a).toBeCloseTo(0.75 * rA.d, 9);
  });

  it('sem a varredura (opção antiga): nenhuma superfície e os contornos C e C′ não mudam (baseline)', () => {
    expect(rB.cortante.superficies).toHaveLength(0);
    expect(rB.contornos[0].tau).toBeCloseTo(rA.contornos[0].tau, 12);
    expect(rB.contornos[1].tau).toBeCloseTo(rA.contornos[1].tau, 12);
    expect(rB.F).toBeCloseTo(rA.F, 9);
  });

  it('armadura calculada: AswAnel = linhas · 2 pernas · área da bitola (cm²)', () => {
    expect(rA.status).toBe('armadura');
    const a = rA.armadura!;
    expect(a.AswAnel).toBeCloseTo(a.linhas * 2 * barArea(a.phi) * 1e4, 6);
    expect(a.barras).toBeGreaterThanOrEqual(2);
  });

  it('grupos informados nas nervuras (16 linhas × 8 barras φ8): cobrem a exigência; τRd3 = τRd3c + 1,5·Asw·fywd/(sr·u)', () => {
    const sC = lisa(16, (ok, s) => ok('laje.puncao', { id: s.modelo.lajes[0].id, adicionar: [{ pilar: idInterno(s), linhas: 16, barras: 8, phi: 8, s: 0.24 }] }));
    const rC = interno(calcular(sC.modelo));
    expect(rC.manual).toHaveLength(1);
    expect(rC.manual[0]).toMatchObject({ linhas: 16, barras: 8, phi: 8 });
    expect(rC.armadura).toBeUndefined();
    expect(rC.status).toBe('armadura');
    expect(rC.mensagens.join(' ')).toMatch(/Armadura de punção informada atende/);
    const Asw = 16 * 2 * barArea(8) * 1e4, sr = Math.max(0.03, Math.floor((0.75 * rC.d) / 0.005 + 1e-9) * 0.005), u = rC.contornos[1].u;
    const esperado = tauRd3c(c, rC.d, rC.rho) + (1.5 * Asw * 250) / (sr * u * 1e4);
    expect(rC.tauRd3).toBeCloseTo(esperado, 9);
    expect(rC.contornos[1].limite).toBeCloseTo(esperado, 9);
    expect(rC.contornos[1].ok).toBe(true);
    expect(esperado).toBeGreaterThan(rC.contornos[1].tau);
    // a tensão nos contornos não depende do grupo informado
    expect(rC.contornos[0].tau).toBeCloseTo(rA.contornos[0].tau, 12);
  }, 300000);

  it('grupo com poucas barras (3 < anéis exigidos) é somado: a calculada só abate a capacidade informada nos anéis cobertos', () => {
    const sD = lisa(16, (ok, s) => ok('laje.puncao', { id: s.modelo.lajes[0].id, adicionar: [{ pilar: idInterno(s), linhas: 4, barras: 3, phi: 6.3, s: 0.24 }] }));
    const rD = interno(calcular(sD.modelo));
    expect(rD.manual).toHaveLength(1);
    expect(rD.armadura).toBeDefined();
    // anéis não cobertos: a exigência calculada fica igual à sem grupo
    expect(rD.armadura!.barras).toBe(rA.armadura!.barras);
    expect(rD.armadura!.linhas).toBe(rA.armadura!.linhas);
  }, 300000);

  it('biela: carga muito alta leva τSd no contorno C acima de τRd2 = 0,27·αv2·fcd → status fail, sem armadura', () => {
    const sE = lisa(250);
    const rE = interno(calcular(sE.modelo));
    const t2 = 0.27 * (1 - c.fck / 250) * c.fcd;
    expect(rE.tauRd2).toBeCloseTo(t2, 9);
    expect(rE.contornos[0].tau).toBeGreaterThan(t2);
    expect(rE.contornos[0].ok).toBe(false);
    expect(rE.status).toBe('fail');
    expect(rE.mensagens.join(' ')).toMatch(/τRd2/);
    expect(rE.armadura).toBeUndefined();
  }, 300000);

  it('borda e canto com ábaco: τSd(C) = F/(u·d) + ΣK·M1/(Wp·d), M1 = máx(0, M − F·e)', () => {
    for (const tipo of ['borda', 'canto'] as const) {
      const r = dA.puncao!.filter((x) => x.pavimento === 'Tipo 1').find((x) => x.tipo === tipo)!;
      const C = r.contornos[0];
      let tau = r.F / (C.u * r.d);
      for (let i = 0; i < 2; i++) {
        expect(C.M1[i]).toBeCloseTo(Math.max(0, r.M[i] - r.F * C.e[i]), 6);
        if (C.Wp[i] > 1e-9) tau += (r.K[i] * C.M1[i]) / (C.Wp[i] * r.d);
      }
      expect(C.tau).toBeCloseTo(tau / 1000, 9);
      expect(C.tau).toBeGreaterThanOrEqual(r.F / (C.u * r.d) / 1000 - 1e-12);
    }
  });

  it('alvo do clique: pilar sob o cursor ou o ábaco que contém o ponto (ábaco escurece); fora, nenhum', () => {
    const rs = dA.puncao!, pid = idInterno(sA);
    const pav = rA.pavimentoId;
    expect(alvoPuncaoNoPonto(rs, pav, [6.25, 6.25], pid)).toMatchObject({ via: 'pilar', r: { pilar: pid } });
    const viaAbaco = alvoPuncaoNoPonto(rs, pav, [7.2, 6.25]); // dentro de [4,8; 7,8]², fora do pilar
    expect(viaAbaco).toMatchObject({ via: 'abaco', r: { pilar: pid } });
    expect(alvoPuncaoNoPonto(rs, pav, [3.2, 3.2])).toBeNull();
  });

  it('laje.puncao em laje nervurada adiciona e apaga por pilar (apagar um a um)', () => {
    const s = lisa(5);
    const id = s.modelo.lajes[0].id, pid = idInterno(s);
    expect(s.executar('laje.puncao', { id, adicionar: [{ pilar: pid, linhas: 8, barras: 3, phi: 6.3, s: 0.15 }] }).ok).toBe(true);
    expect(s.modelo.lajes[0].puncao).toHaveLength(1);
    expect(s.executar('laje.puncao', { id, pilares: [pid] }).ok).toBe(true);
    expect(s.modelo.lajes[0].puncao).toBeUndefined();
  });
});
