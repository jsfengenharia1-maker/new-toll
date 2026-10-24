// E6d (K1.3.31): lados da parede com comprimento variável por pavimento (recorte do lance nas pontas da polilinha).
// Malha por lance, fatias, contorno, equilíbrio (peso próprio e posição da resultante, solução analítica), panos,
// verificação global do lado, quantitativos e validação do comando.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { contornoDoLado, geometriaParedes, ladosDoPP, pilaresVirtuaisDosLados } from './pilarParede';
import { furosDaParede, ppDaParede } from './paredesBase';
import { opcoesEmUso } from './opcoes';
import { pavimentosOrdenados } from './types';

function padrao(): Sessao {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  return s;
}
const L = 6, t = 0.2, corte = 2;

/** Parede reta de 6 m da fundação ao 2.º pavimento; com `corteFim`, o lance de cima perde os 2 m finais. */
function modelo(comCorte: boolean) {
  const s = padrao(), ps = pavimentosOrdenados(s.modelo), [p1, p2] = [ps[0].id, ps[1].id];
  const r = s.executar('parede.criar', { pontos: [[0, 0], [L, 0]], espessura: t, morre: p2, ...(comCorte ? { porPavimento: [{ pavimento: p2, esq: t / 2, dir: t / 2, corteFim: corte }] } : {}) });
  expect(r.ok, r.erros.map((e) => e.mensagem).join(' ')).toBe(true);
  return { s, p1, p2, w: s.modelo.paredes![0] };
}

describe('parede com lado de comprimento variável por pavimento (K1.3.31, E6d)', () => {
  it('geometria: contorno, recorte na malha e fatias só no trecho existente de cada lance', () => {
    const { s, p1, p2, w } = modelo(true), b = s.modelo;
    const g = ladosDoPP(b, ppDaParede(w))[0];
    expect(g.ext(p1)).toEqual([0, L]);
    expect(g.ext(p2)).toEqual([0, L - corte]);
    const xs = (pav: string) => contornoDoLado(g, pav).map((p) => p[0]);
    expect(Math.max(...xs(p1))).toBeCloseTo(L, 9);
    expect(Math.max(...xs(p2))).toBeCloseTo(L - corte, 9);
    const f = furosDaParede(b, w).porTrecho[0];
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ corte: true, s0: L - corte, s1: L });
    const geo = geometriaParedes(b, opcoesEmUso(b.opcoes))!;
    const fat = (pav: string) => geo.fatias.filter((x) => x.morre === pav);
    expect(fat(p1).length).toBe(geo.grades[0].S.length);
    expect(fat(p2).length).toBe(geo.grades[0].S.filter((x) => x <= L - corte + 1e-6).length);
    expect(geo.grades[0].S).toContain(L - corte);
    // pilar virtual do lado (regras de apoio das vigas): seção do lance de cima com 4 m, centro deslocado 1 m
    const sec = pilaresVirtuaisDosLados(b)[0].secoes!.find((x) => x.pavimento === p2)!;
    expect(sec.secao).toMatchObject({ tipo: 'ret', b: L - corte });
    expect(sec.dx).toBeCloseTo(-corte / 2, 9);
  });

  it('análise: sem elementos no recorte; equilíbrio do peso próprio e posição da resultante (analítico)', () => {
    const a = modelo(true), c = modelo(false);
    const an = analisarEdificio(a.s.modelo), an0 = analisarEdificio(c.s.modelo);
    expect(an.erro).toBeUndefined();
    const info = an.paredes!.info;
    expect(info.filter((x) => x.lance === a.p2).every((x) => x.s < L - corte)).toBe(true);
    expect(info.filter((x) => x.lance === a.p1).some((x) => x.s > L - corte)).toBe(true);
    const area = (lance: string, inf = info) => inf.filter((x) => x.lance === lance).reduce((t2, x) => t2 + x.area, 0);
    const H2 = area(a.p2, an0.paredes!.info) / L, H1 = area(a.p1, an0.paredes!.info) / L;
    expect(area(a.p2)).toBeCloseTo((L - corte) * H2, 6);
    expect(area(a.p1)).toBeCloseTo(L * H1, 6);
    // reações do caso G: Σ Rz = peso (γ·t·área), e a resultante passa pelo centroide do peso: x̄ = (W1·L/2 + W2·(L − c)/2)/(W1 + W2)
    const iG = an.casos.indexOf('G'), base = an.paredes!.base[a.w.id];
    const soma = (anx: typeof an) => { let Rz = 0, Mx = 0; for (const n of anx.paredes!.base[a.w.id]) { const r = anx.portico.res!.reacoes[iG].get(n)!, x = anx.portico.modelo.nos[n][0]; Rz += r[2]; Mx += x * r[2] - r[4]; } return { Rz, Mx }; };
    const r = soma(an), r0 = soma(an0), gama = r0.Rz / (t * L * (H1 + H2));
    expect(base.length).toBeGreaterThan(0);
    const W1 = gama * t * L * H1, W2 = gama * t * (L - corte) * H2;
    expect(r.Rz / (W1 + W2)).toBeCloseTo(1, 6);
    const xb = (W1 * (L / 2) + W2 * ((L - corte) / 2)) / (W1 + W2);
    expect(Math.abs(r.Mx / r.Rz - xb) / xb).toBeLessThan(0.005);
    // a parcela axial (E6d) segue o trecho existente: as reações de G batem com e sem o multiplicador axial
    a.s.executar('opcoes.definir', { valores: { axialPilares: 1 } });
    const an1 = analisarEdificio(a.s.modelo);
    expect(soma(an1).Rz).toBeCloseTo(r.Rz, 6);
  }, 120000);

  it('dimensionamento: panos e verificação global do lance recortado no trecho existente; quantitativo de concreto', () => {
    const a = modelo(true), b = a.s.modelo, an = analisarEdificio(b), d = dimensionarEdificio(b, an, { fundacao: false });
    const ap = d.armaduraParedes!.find((x) => x.id === a.w.id)!;
    const panos2 = ap.panos.filter((p) => p.pavimento === a.p2), panos1 = ap.panos.filter((p) => p.pavimento === a.p1);
    expect(panos2.length).toBeGreaterThan(0);
    expect(Math.max(...panos2.map((p) => p.s1))).toBeCloseTo(L - corte, 6);
    expect(Math.max(...panos1.map((p) => p.s1))).toBeCloseTo(L, 6);
    expect(ap.lados.find((l) => l.pavimento === a.p2)!.L).toBeCloseTo(L - corte, 9);
    expect(ap.lados.find((l) => l.pavimento === a.p1)!.L).toBeCloseTo(L, 9);
    const c = modelo(false), d0 = dimensionarEdificio(c.s.modelo, analisarEdificio(c.s.modelo), { fundacao: false });
    const vol = (dd: typeof d) => dd.detalhesParedes!.find((x) => x.id === a.w.id)!.concreto;
    const zs = pavimentosOrdenados(b);
    expect(vol(d0) - vol(d)).toBeCloseTo(corte * t * (zs[1].cota - zs[0].cota), 6);
  }, 180000);

  it('comando: recorte que elimina o lado da ponta e abertura no trecho recortado são recusados; sem recorte nada muda', () => {
    const { s, p1, p2, w } = modelo(true);
    const r1 = s.executar('parede.editar', { id: w.id, porPavimento: [{ pavimento: p2, esq: t / 2, dir: t / 2, corteIni: 3, corteFim: 3 }] });
    expect(r1.ok).toBe(false);
    expect(r1.erros.map((e) => e.codigo)).toContain('PAREDE_CORTE');
    const r2 = s.executar('parede.abertura', { parede: w.id, pavimento: p1, tipo: 'janela', s: 4.5, largura: 1, peitoril: 1, altura: 1 });
    expect(r2.ok).toBe(false);
    expect(r2.erros.map((e) => e.mensagem).join(' ')).toMatch(/recortado/);
    // desfazer o recorte devolve o lado inteiro
    expect(s.executar('parede.editar', { id: w.id, porPavimento: [] }).ok).toBe(true);
    expect(ladosDoPP(s.modelo, ppDaParede(s.modelo.paredes![0]))[0].ext(p2)).toEqual([0, L]);
  });
});
