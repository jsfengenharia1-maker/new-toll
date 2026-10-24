// E5g: dimensionamento das nervuradas — seção T com a linha neutra na alma, regimes de cortante pelo intereixo (13.2.4.2), flexão da
// mesa entre nervuras e malha da base considerada, fissuração do negativo, concentração da armadura nas nervuras indicadas, tabela de
// armadura e Wood-Armer das zonas maciças (contra a placa de Navier). Valores esperados à mão.
import { describe, expect, it } from 'vitest';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { acoDe, concretoDe, cobrimentoLaje, gamas } from './materiais';
import { geometriaBidirecional, verificarGeometria } from './nervuradas';
import { armaduraNecessariaNervurada } from './nervuradasDim';
import { barArea, crackWidth } from '../concrete';
import type { BuildingModel } from './types';

function padrao(): Sessao { const s = new Sessao(); for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema'); return s; }
const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
function predio(opcoes?: Record<string, number>, q?: number, secao = { b: 0.2, h: 0.6 }) {
  const s = padrao(), a = 6;
  ok(s, 'lote', { comandos: [[0, 0], [a, 0], [0, a], [a, a]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 } } })) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao } });
  ok(s, 'lote', { comandos: [v([[0, 0], [a, 0]]), v([[0, a], [a, a]]), v([[0, 0], [0, a]]), v([[a, 0], [a, a]])] });
  ok(s, 'laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'nervurada', forma: 'cat:rec-60-30', hTotal: 0.35, capa: 0.05 } });
  if (q !== undefined) ok(s, 'grupo.editar', { id: 'g_3', q });
  if (opcoes) ok(s, 'opcoes.definir', { valores: opcoes });
  return s;
}
function calcular(b: BuildingModel) {
  const an = analisarEdificio(b);
  expect(an.erro).toBeUndefined();
  return { an, d: dimensionarEdificio(b, an) };
}
/** Bloco retangular: y = d − √(d² − 2M/(σcd·b)) (profundidade do bloco; M em kN·m, b e d em m, σcd em MPa). */
const yRect = (M: number, bw: number, d: number, sigma: number) => d - Math.sqrt(d * d - (2 * M / 1000) / (sigma * bw));

describe('E5g: seção T com a linha neutra na alma', () => {
  const b = predio().modelo, l = b.lajes[0], g = geometriaBidirecional(b, l.tipo as never);
  const c = concretoDe(b, 'laje'), cob = cobrimentoLaje(b, l.cobrimento);

  it('Md > momento resistido pela mesa inteira: As = (Rcf + σcd·bw·y)/fyd com y do retângulo da alma', () => {
    const bf = g.i[0], bw = g.bw[0], hf = g.capa, d = g.h - cob.inf - 0.01, fyd = acoDe(b, 'lajeInf').fyd, sg = c.sigmaCd;
    const Rcf = sg * (bf - bw) * hf, Mf = Rcf * (d - hf / 2) * 1000; // abas da mesa: MN e kN·m
    const M = 290, Md = M * bf; // kN·m por nervura
    expect(sg * bf * hf * (d - hf / 2) * 1000).toBeLessThan(Md); // mesa inteira não resiste: bloco passa da mesa
    const y = yRect(Md - Mf, bw, d, sg);
    expect(y).toBeGreaterThan(0);
    expect(y).toBeLessThan(c.lambda * c.xLimRatio * d); // sem armadura de compressão
    const AsEsperada = ((Rcf + sg * bw * y) / fyd) * 1e4 / bf; // MN / MPa = m²; cm²/m
    expect(armaduraNecessariaNervurada(b, l, M, 'inf', 0)).toBeCloseTo(AsEsperada, 6);
  });
});

describe('E5g: regimes de cortante pelo intereixo (13.2.4.2)', () => {
  const geo = (i: number, bw: number) => {
    const b = predio().modelo;
    const fm = { id: 'f', nome: 'F', tipo: 'recuperavel' as const, altura: 0.3, pecas: 1, intereixo: [i, i] as [number, number], bw: [bw, bw] as [number, number] };
    return geometriaBidirecional({ ...b, tiposLaje: { formas: [fm] } }, { tipo: 'nervurada', forma: 'f', hTotal: 0.4, capa: 0.1 });
  };
  it('≤ 65 cm: laje; 65–90 com bw ≥ 12 cm: laje; até 110 cm: viga; acima: mesa como laje maciça', () => {
    expect(verificarGeometria(geo(0.65, 0.1)).regime[0]).toBe('laje');
    expect(verificarGeometria(geo(0.8, 0.12)).regime[0]).toBe('laje');
    expect(verificarGeometria(geo(0.9, 0.12)).regime[0]).toBe('laje');
    expect(verificarGeometria(geo(0.8, 0.1)).regime[0]).toBe('viga');
    expect(verificarGeometria(geo(0.91, 0.12)).regime[0]).toBe('viga');
    expect(verificarGeometria(geo(1.1, 0.12)).regime[0]).toBe('viga');
    expect(verificarGeometria(geo(1.15, 0.12)).regime[0]).toBe('macica');
  });
  it('intereixo de 60 cm: estribo só onde Vsd > VRd1; de 100 cm (regime de viga): estribo em todas as nervuras', () => {
    const n60 = calcular(predio().modelo).d.nervuradas![0];
    expect(n60.regime).toEqual(['laje', 'laje']);
    expect(n60.nervuras.some((r) => !r.cortante.estribo)).toBe(true);
    for (const r of n60.nervuras) for (const sc of r.cortante.secoes) expect(sc.estribo).toBe(sc.V > r.cortante.VRd1 + 1e-9);
    const s = predio();
    ok(s, 'forma.tipo', { acao: 'criar', id: 'f100', forma: { nome: 'Cubeta 100', tipo: 'recuperavel', altura: 0.3, intereixo: [1, 1], bw: [0.12, 0.12] } });
    ok(s, 'laje.nervurada', { ids: [s.modelo.lajes[0].id], forma: 'f100', hTotal: 0.37, capa: 0.07 });
    const n100 = calcular(s.modelo).d.nervuradas![0];
    expect(n100.regime).toEqual(['viga', 'viga']);
    expect(n100.nervuras.every((r) => r.cortante.estribo !== null && r.cortante.secoes.every((sc) => sc.estribo))).toBe(true);
  });
});

describe('E5g: mesa entre nervuras e malha da base', () => {
  /** Intereixo de 80 cm, nervura de 10 cm, mesa de 6 cm e carga alta: a flexão da mesa governa a armadura (supera o mínimo). */
  function mesa80(extra: (s: Sessao, id: string) => void = () => {}) {
    const s = predio(undefined, 60);
    ok(s, 'forma.tipo', { acao: 'criar', id: 'f80', forma: { nome: 'Cubeta 80', tipo: 'recuperavel', altura: 0.3, intereixo: [0.8, 0.8], bw: [0.1, 0.1] } });
    const id = s.modelo.lajes[0].id;
    ok(s, 'laje.nervurada', { ids: [id], forma: 'f80', hTotal: 0.36, capa: 0.06 });
    extra(s, id);
    return calcular(s.modelo).d.nervuradas![0];
  }
  const b = predio(undefined, 60).modelo;
  const c = concretoDe(b, 'laje'), cob = cobrimentoLaje(b, undefined);

  it('verificação da mesa: Md = qd·ℓ²/12 (negativo, face superior) e qd·ℓ²/24 (positivo, face inferior), As pelo bloco retangular', () => {
    const n = mesa80();
    const gm = gamas(b), grupo = b.grupos.find((x) => x.id === 'g_3')!;
    const g = geometriaBidirecional({ ...b, tiposLaje: { formas: [{ id: 'f80', nome: 'x', tipo: 'recuperavel', altura: 0.3, pecas: 1, intereixo: [0.8, 0.8], bw: [0.1, 0.1] }] } }, { tipo: 'nervurada', forma: 'f80', hTotal: 0.36, capa: 0.06 });
    const qd = gm.g * (g.pp + grupo.gRev) + gm.q * grupo.q;
    expect(n.mesa.exigida).toBe(true);
    expect(n.mesa.livre).toBeCloseTo(0.7, 9);
    expect(n.mesa.qd).toBeCloseTo(qd, 9);
    const Md = (qd * 0.49) / 12, dS = 0.06 - cob.sup - 0.005, sg = c.sigmaCd, fydS = acoDe(b, 'lajeSup').fyd;
    expect(n.mesa.Md).toBeCloseTo(Md, 9);
    const AsEsperada = ((sg * yRect(Md, 1, dS, sg)) / fydS) * 1e4;
    expect(AsEsperada).toBeGreaterThan(0.9); // acima do mínimo de distribuição
    expect(n.mesa.AsNec).toBeCloseTo(AsEsperada, 6);
  });

  it('malha da base considerada: sem a marca nada muda; com ela a malha cobre e só o complemento é calculado', () => {
    const sem = mesa80((s, id) => ok(s, 'laje.armaduraBase', { ids: [id], sup: { barras: [{ dir: 0, phi: 6.3, s: 20 }, { dir: 1, phi: 6.3, s: 20 }] } }));
    const ref = mesa80();
    expect(sem.mesa.malha).toBeUndefined();
    expect(sem.peso).toBeCloseTo(ref.peso, 9);
    const com = mesa80((s, id) => ok(s, 'laje.armaduraBase', { ids: [id], considerarMesa: true, sup: { barras: [{ dir: 0, phi: 6.3, s: 20 }, { dir: 1, phi: 6.3, s: 20 }] }, inf: { barras: [{ dir: 0, phi: 6.3, s: 20 }, { dir: 1, phi: 6.3, s: 20 }] } }));
    const Asm = (barArea(6.3) * 1e4) / 0.2; // 1,5586 cm²/m
    expect(com.mesa.malha!.AsSup).toBeCloseTo(Asm, 9);
    expect(com.mesa.malha!.AsInf).toBeCloseTo(Asm, 9);
    expect(com.mesa.malha!.complementoSup).toBeCloseTo(Math.max(0, com.mesa.AsNec - Asm), 9);
    // momento positivo no meio do vão da mesa = qd·ℓ²/24; armadura positiva pelo bloco retangular
    const gm = gamas(b), dI = 0.06 - cob.inf - 0.005, MdPos = com.mesa.malha!.MdPos;
    expect(MdPos).toBeCloseTo(com.mesa.Md / 2, 9);
    expect(com.mesa.malha!.AsNecPos).toBeCloseTo(Math.max(0.0015 * (0.8 * 0.06 + 0.1 * 0.3) * 1e4, ((c.sigmaCd * yRect(MdPos, 1, dI, c.sigmaCd)) / acoDe(b, 'lajeInf').fyd) * 1e4), 6);
    expect(com.mesa.malha!.complementoInf).toBeCloseTo(Math.max(0, com.mesa.malha!.AsNecPos - Asm), 9);
    void gm;
    // o aço da mesa é só o complemento: sem malha considerada a distribuição inteira é calculada
    const mesaPos = (r: typeof com) => r.posicoes.filter((p) => p.tipo === 'mesa');
    expect(mesaPos(ref)).toHaveLength(1);
    expect(mesaPos(com).length).toBe((com.mesa.malha!.complementoSup > 0 ? 1 : 0) + (com.mesa.malha!.complementoInf > 0 ? 1 : 0));
  });

  it('malha mais fraca que a necessária: complemento = necessária − malha', () => {
    const fraca = mesa80((s, id) => ok(s, 'laje.armaduraBase', { ids: [id], considerarMesa: true, sup: { barras: [{ dir: 0, phi: 5, s: 20 }, { dir: 1, phi: 6.3, s: 20 }] } }));
    const A5 = (barArea(5) * 1e4) / 0.2;
    expect(fraca.mesa.malha!.AsSup).toBeCloseTo(A5, 9); // vale a menor das duas direções
    expect(fraca.mesa.malha!.complementoSup).toBeCloseTo(fraca.mesa.AsNec - A5, 9);
    expect(fraca.mensagens.some((m) => /malha da base da mesa .* não cobre/.test(m))).toBe(true);
  });
});

describe('E5g: fissuração do momento negativo', () => {
  it('desligada, nada muda; ligada com limite de 0,005 mm (as nervuras negativas estão em zona maciça de 60 cm, com abertura baixa): armadura negativa aumenta e a abertura respeita o limite', () => {
    const off = calcular(predio({ limiteFissura: 0.005, nervuradaFissuraNegativo: 0 }, 60).modelo).d.nervuradas![0];
    const on = calcular(predio({ limiteFissura: 0.005, nervuradaFissuraNegativo: 1 }, 60).modelo);
    const n = on.d.nervuradas![0], b = predio().modelo, c = concretoDe(b, 'laje');
    const sup = (r: typeof n) => r.nervuras.flatMap((x) => x.sup.filter((y) => !!y?.barras));
    const soma = (r: typeof n) => sup(r).reduce((t, x) => t + x!.barras!.As, 0);
    expect(soma(n)).toBeGreaterThan(soma(off));
    expect(n.mensagens.some((m) => /^Nervuradas: fissuração do negativo/.test(m))).toBe(true);
    const g = geometriaBidirecional(b, b.lajes[0].tipo as never), dS = g.h - cobrimentoLaje(b, undefined).sup - 0.01;
    for (const x of sup(n)) {
      if (!x!.MFreq) continue;
      const w = crackWidth({ kind: 'rect', bw: x!.bwEfetiva, h: g.h }, false, x!.barras!.As / 1e4, x!.barras!.phi, dS, x!.MFreq, c, 2).wk;
      expect(w).toBeCloseTo(x!.wk, 9);
      expect(w).toBeLessThanOrEqual(0.005 + 1e-9);
    }
  });
});

describe('E5g: concentração da armadura nas nervuras indicadas', () => {
  it('a indicada leva (n·A − (n−m)·Amín)/m; as demais, o mínimo; a soma do grupo se conserva', () => {
    const base = calcular(predio().modelo).d.nervuradas![0];
    const s = predio();
    ok(s, 'laje.nervurada', { ids: [s.modelo.lajes[0].id], concentrar: [{ dir: 0, indices: [4] }] });
    expect(s.modelo.lajes[0].nervurasConcentrar).toEqual([[4], []]);
    const n = calcular(s.modelo).d.nervuradas![0];
    const gp = n.grupos.find((x) => x.dir === 0 && x.nervuras.some((i) => n.nervuras[i].indice === 4))!;
    expect(gp.nervuras.length).toBeGreaterThan(1);
    const b = s.modelo, g = geometriaBidirecional(b, b.lajes[0].tipo as never);
    const AsMin = 0.0015 * (g.i[0] * g.capa + g.bw[0] * g.hEnch) * 1e4;
    const A0 = base.nervuras[gp.nervuras[0]].inf.AsNec; // armadura do grupo sem concentrar (igual em todas)
    const nn = gp.nervuras.length;
    for (const i of gp.nervuras) {
      const r = n.nervuras[i];
      if (r.indice === 4) { expect(r.concentracao).toBe('recebe'); expect(r.inf.AsNec).toBeCloseTo((nn * A0 - (nn - 1) * AsMin) / 1, 6); }
      else { expect(r.concentracao).toBe('cede'); expect(r.inf.AsNec).toBeCloseTo(AsMin, 9); }
    }
    expect(gp.nervuras.reduce((t, i) => t + n.nervuras[i].inf.AsNec, 0)).toBeCloseTo(nn * A0, 6);
    // direção Y e grupos sem indicação ficam como estavam
    for (const r of n.nervuras.filter((x) => x.dir === 1)) expect(r.concentracao).toBeUndefined();
    expect(n.mensagens.some((m) => /armadura concentrada nas nervuras indicadas/.test(m))).toBe(true);
    // limpar volta ao resultado anterior
    ok(s, 'laje.nervurada', { ids: [s.modelo.lajes[0].id], limparConcentrar: true });
    expect(s.modelo.lajes[0].nervurasConcentrar).toBeUndefined();
    const volta = calcular(s.modelo).d.nervuradas![0];
    expect(volta.peso).toBeCloseTo(base.peso, 9);
  });
});

describe('E5g: tabela de armadura (R7a)', () => {
  it('tabela de lajes editada sem φ6,3 e φ12,5 restringe as bitolas da mesa; a padrão não restringe', () => {
    const s = predio();
    ok(s, 'tabela.definir', { tipo: 'lajes', tabela: { id: 'tL', nome: 'Sem 6,3', linhas: [{ hAte: 999, bitolas: [5, 8, 10, 16], sMin: 0, sMax: 0 }] } });
    ok(s, 'laje.editar', { id: s.modelo.lajes[0].id, tabela: 'tL' });
    const n = calcular(s.modelo).d.nervuradas![0];
    expect(n.mesa.phi).toBe(8);
    expect(n.nervuras.flatMap((r) => [r.inf.reforco, ...r.sup.map((x) => x?.barras)]).every((x) => !x || [5, 8, 10, 16].includes(x.phi))).toBe(true);
  });
});

describe('E5g: Wood-Armer nas zonas maciças', () => {
  it('opção desligada reproduz o comportamento anterior (sem zona, sem aço extra); ligada acrescenta a armadura da zona', () => {
    const off = calcular(predio({ nervuradaWoodArmer: 0 }).modelo).d.nervuradas![0];
    const on = calcular(predio({ nervuradaWoodArmer: 1 }).modelo).d.nervuradas![0];
    expect(off.zonaMacica).toBeUndefined();
    expect(off.posicoes.some((p) => p.tipo === 'zonaMacica')).toBe(false);
    expect(on.zonaMacica).toBeDefined();
    expect(on.zonaMacica!.area).toBeCloseTo(36 - 64 * 0.36, 6); // faixa maciça de 0,6 m em volta das 64 cubetas
    expect(on.peso).toBeGreaterThan(off.peso);
    // nervuras e mesa não mudam
    expect(on.nervuras.map((r) => r.inf.total)).toEqual(off.nervuras.map((r) => r.inf.total));
  });

  it('armadura da zona = máx(mínimo da Tabela 19.1: negativo 0,15 % h e positivo 0,67 × 0,15 % h, flexão do momento de Wood-Armer); a malha considerada é descontada', () => {
    const s = predio({ nervuradaWoodArmer: 1 });
    const n0 = calcular(s.modelo).d.nervuradas![0], z0 = n0.zonaMacica!;
    const b = s.modelo, c = concretoDe(b, 'laje'), g = geometriaBidirecional(b, b.lajes[0].tipo as never), cob = cobrimentoLaje(b, undefined);
    const aminSup = 0.0015 * g.h * 1e4, aminInf = 0.67 * aminSup, dI = g.h - cob.inf - 0.005, dS = g.h - cob.sup - 0.005;
    expect(aminSup).toBeCloseTo(5.25, 9); // 0,15 % × 35 cm
    expect(aminInf).toBeCloseTo(3.5175, 9);
    for (const k of [0, 1] as const) {
      const flex = ((c.sigmaCd * yRect(z0.Minf[k], 1, dI, c.sigmaCd)) / acoDe(b, 'lajeInf').fyd) * 1e4;
      const flexS = ((c.sigmaCd * yRect(-z0.Msup[k], 1, dS, c.sigmaCd)) / acoDe(b, 'lajeSup').fyd) * 1e4;
      expect(z0.AsNecInf[k]).toBeCloseTo(Math.max(aminInf, flex), 6);
      expect(z0.AsNecSup[k]).toBeCloseTo(Math.max(aminSup, flexS), 6);
      expect(z0.complementoInf[k]).toBeCloseTo(z0.AsNecInf[k], 9); // sem malha considerada: tudo calculado
    }
    ok(s, 'laje.armaduraBase', { ids: [b.lajes[0].id], considerarMesa: true, inf: { barras: [{ dir: 0, phi: 12.5, s: 15 }, { dir: 1, phi: 12.5, s: 15 }] }, sup: { barras: [{ dir: 0, phi: 8, s: 15 }, { dir: 1, phi: 8, s: 15 }] } });
    const z1 = calcular(s.modelo).d.nervuradas![0].zonaMacica!;
    const Ai = (barArea(12.5) * 1e4) / 0.15, As = (barArea(8) * 1e4) / 0.15;
    for (const k of [0, 1] as const) {
      expect(z1.AsMalhaInf[k]).toBeCloseTo(Ai, 9);
      expect(z1.complementoInf[k]).toBeCloseTo(Math.max(0, z1.AsNecInf[k] - Ai), 9);
      expect(z1.complementoSup[k]).toBeCloseTo(Math.max(0, z1.AsNecSup[k] - As), 9);
    }
    expect(z1.complementoInf[0]).toBe(0); // φ12,5 c/15 (8,18 cm²/m) cobre o mínimo positivo de 3,52 cm²/m
  });

  it('pano inteiro maciço (zona manual, inércia da laje maciça): mesmos momentos de Wood-Armer que a laje maciça de 35 cm equivalente (modelo já validado), erro < 1 %', () => {
    const rigidas = { b: 1, h: 3 };
    const s = predio({ nervuradaInercia: 1, nervuradaTorcao: 0, torcaoLaje: 1, nervuradaWoodArmer: 1, malha: 0.2 }, undefined, rigidas);
    ok(s, 'laje.nervurada', { ids: [s.modelo.lajes[0].id], zonasMacicas: [[[0, 0], [6, 0], [6, 6], [0, 6]]] });
    const zn = dimensionarEdificio(s.modelo, analisarEdificio(s.modelo)).nervuradas![0].zonaMacica!;
    // laje maciça de 35 cm sobre as mesmas vigas
    const m = padrao(), a = 6;
    ok(m, 'lote', { comandos: [[0, 0], [a, 0], [0, a], [a, a]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 } } })) });
    const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: rigidas } });
    ok(m, 'lote', { comandos: [v([[0, 0], [a, 0]]), v([[0, a], [a, a]]), v([[0, 0], [0, a]]), v([[a, 0], [a, a]])] });
    ok(m, 'laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.35 } });
    ok(m, 'opcoes.definir', { valores: { malha: 0.2, torcaoLaje: 1, redistribuicao: 0 } });
    const mac = dimensionarEdificio(m.modelo, analisarEdificio(m.modelo)).lajes[0];
    for (const k of [0, 1] as const) {
      expect(Math.abs(zn.Minf[k] - mac.mPos[k]) / mac.mPos[k]).toBeLessThan(0.01);
      expect(Math.abs(zn.Msup[k] - mac.mNeg[k]) / Math.abs(mac.mNeg[k])).toBeLessThan(0.01);
    }
    // ordem de grandeza da placa de Navier (ν = 0: 0,0368·qd·a² no centro, apoio simples); o engaste das bordas reduz o positivo
    const gm = gamas(s.modelo), grupo = s.modelo.grupos.find((x) => x.id === 'g_3')!;
    const qd = gm.g * (25 * 0.35 + grupo.gRev) + gm.q * grupo.q;
    expect(zn.Minf[0]).toBeLessThan(0.0368 * qd * 36 * 1.2);
    expect(zn.Minf[0]).toBeGreaterThan(0.0231 * qd * 36 * 0.8); // placa engastada: 0,0231
  });
});

describe('E5g: baselines — opções novas desligadas reproduzem o resultado anterior', () => {
  // valores do dimensionamento antes da E5g (pano 6 × 6, nervuras 60 × 10 cm, h 35 cm, mesa 5 cm; vigas 20 × 60)
  const off = { nervuradaFissuraNegativo: 0, nervuradaWoodArmer: 0 };
  it('carga padrão: aço 208,5085 kg por pavimento, momento da nervura central 13,2955 kN·m, negativo 2φ6,3 de 0,5 cm²', () => {
    const n = calcular(predio(off).modelo).d.nervuradas![0];
    expect(n.peso).toBeCloseTo(208.50851997784963, 6);
    expect(n.nervuras[4].mPos).toBeCloseTo(13.295538805272537, 6);
    expect(n.nervuras[4].sup[0]).toMatchObject({ AsNec: 0.525, barras: { n: 2, phi: 6.3 } });
    expect(n.zonaMacica).toBeUndefined();
    expect(n.mesa.malha).toBeUndefined();
  });
  it('carga variável de 25 kN/m²: aço 585,2554 kg', () => {
    const n = calcular(predio(off, 25).modelo).d.nervuradas![0];
    expect(n.peso).toBeCloseTo(585.2553550361156, 6);
  });
});

describe('E5g: peso do pano de exemplo com as opções no padrão', () => {
  it('pano 6 × 6: aço por pavimento com o mínimo da Tabela 19.1 nas zonas maciças', () => {
    const n = calcular(predio().modelo).d.nervuradas![0];
    expect(n.peso).toBeCloseTo(395.7095944226257, 3); // antes 208,5085 (sem Wood-Armer) e 436,8 (mínimo de 0,15 % nas duas faces)
  });
});
