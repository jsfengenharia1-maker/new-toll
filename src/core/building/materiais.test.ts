import { describe, expect, it } from 'vitest';
import { concrete } from '../concrete';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { combinacoesEdificio } from './combinacoes';
import { dimensionarEdificio } from './dimensionamento';
import { acoDe, cobrimentoViga, fckDe, flambagemLance } from './materiais';

function predio() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('lote', { comandos: [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.2, h: 0.4 } } })) });
  ok('lote', { comandos: [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.5 } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  return { s, ok };
}

describe('materiais, segurança e flambagem (N1b)', () => {
  it('comprimento de flambagem: ℓe = mín(ℓ0 + h; ℓ) × α do pavimento × α do lance', () => {
    const { s, ok } = predio();
    const p = s.modelo.pilares[0], tipo1 = s.modelo.pavimentos.find((x) => x.grupo === 'g_3')!;
    const f = flambagemLance(s.modelo, p, tipo1.id);
    expect(f.l).toBeCloseTo(3, 9);
    expect(f.hTopo).toBeCloseTo(0.5, 9); // viga de 50 cm no topo
    expect(f.leU).toBeCloseTo(2.5 + 0.2, 9); // ℓ0 + b
    expect(f.leV).toBeCloseTo(2.5 + 0.4, 9); // ℓ0 + h
    ok('pilar.flambagem', { ids: [p.id], pavimentos: [tipo1.id], au: 2 });
    ok('pavimento.editar', { id: tipo1.id, alfaFlambagem: 1.5 });
    const g = flambagemLance(s.modelo, s.modelo.pilares[0], tipo1.id);
    expect(g.leU).toBeCloseTo(2.7 * 3, 9);
    expect(g.leV).toBeCloseTo(2.9 * 1.5, 9);
    ok('pilar.flambagem', { ids: [p.id], au: 1 });
    expect(s.modelo.pilares[0].flambagem).toBeUndefined();
  });

  it('o dimensionamento dos pilares usa ℓe (λ = ℓe / i)', { timeout: 20000 }, () => {
    const { s } = predio();
    const an = analisarEdificio(s.modelo), d = dimensionarEdificio(s.modelo, an);
    const tipo1 = s.modelo.pavimentos.find((x) => x.grupo === 'g_3')!;
    const r = d.pilares.find((x) => x.pilar === s.modelo.pilares[0].id && x.pavimento === tipo1.nome)!;
    expect(r.le[0]).toBeCloseTo(2.7, 9);
    expect(r.lambda[0]).toBeCloseTo(2.7 / (0.2 / Math.sqrt(12)), 6);
    expect(r.lambda[1]).toBeCloseTo(2.9 / (0.4 / Math.sqrt(12)), 6);
  });

  it('fck por tipo e por lance: E das barras na análise; padrão = obra', () => {
    const { s, ok } = predio();
    const b0 = s.modelo, pav0 = b0.pavimentos[0].id;
    expect(fckDe(b0, 'viga')).toBe(30);
    ok('materiais.definir', { fck: { viga: 40, pilar: 30 }, fckPilarPav: [{ pavimento: pav0, fck: 45 }] });
    expect(s.modelo.norma.fckElem).toEqual({ viga: 40 }); // igual ao da obra não é guardado
    const an = analisarEdificio(s.modelo);
    const E = (fck: number) => concrete(fck).Ecs * 1000;
    const iv = an.portico.barras.findIndex((t) => t.tipo === 'viga'), ip0 = an.portico.barras.findIndex((t) => t.tipo === 'pilar' && t.pavimento === pav0);
    const ip1 = an.portico.barras.findIndex((t) => t.tipo === 'pilar' && t.pavimento !== pav0);
    expect(an.portico.modelo.barras[iv].E).toBeCloseTo(E(40), 3);
    expect(an.portico.modelo.barras[ip0].E).toBeCloseTo(E(45), 3);
    expect(an.portico.modelo.barras[ip1].E).toBeCloseTo(E(30), 3);
    ok('materiais.definir', { fckPilarPav: [{ pavimento: pav0, fck: 0 }] });
    expect(s.modelo.norma.fckPilarPav).toBeUndefined();
    ok('materiais.definir', { padrao: true });
    expect(s.modelo.norma.fckElem).toBeUndefined();
  });

  it('aço por posição, cobrimento por face e γ: efeito no dimensionamento das vigas e nas combinações', { timeout: 30000 }, () => {
    const { s, ok } = predio();
    const an = analisarEdificio(s.modelo);
    const v0 = dimensionarEdificio(s.modelo, an).vigas[0];
    ok('materiais.definir', { aco: { vigaPos: 'CA-60' } });
    expect(acoDe(s.modelo, 'vigaPos').fyd).toBeCloseTo(600 / 1.15, 9);
    expect(acoDe(s.modelo, 'vigaNeg').fyd).toBeCloseTo(500 / 1.15, 9);
    const v60 = dimensionarEdificio(s.modelo, an).vigas[0];
    expect(v60.AsInf).toBeLessThan(v0.AsInf);
    expect(v60.AsSup).toBeCloseTo(v0.AsSup, 12); // a negativa continua CA-50
    ok('materiais.definir', { padrao: true });
    ok('materiais.definir', { cobFaces: { vigaInf: 5 } });
    expect(cobrimentoViga(s.modelo)).toEqual({ inf: 0.05, sup: 0.03, lat: 0.03 });
    expect(dimensionarEdificio(s.modelo, an).vigas[0].AsInf).toBeGreaterThan(v0.AsInf);
    ok('materiais.definir', { padrao: true, gamas: { g: 1.35, q: 1.5 } });
    const elu = combinacoesEdificio(s.modelo, an).filter((c) => c.tipo === 'ELU');
    expect(elu.some((c) => c.fatores.G === 1.35 && c.fatores.Q === 1.5)).toBe(true);
    expect(elu.some((c) => c.fatores.G === 1.4)).toBe(false);
  });
});
